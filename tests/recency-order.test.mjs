/**
 * W-2 row-layer tests (plain Node, no browser, no React): the recency
 * feature must pair rows with the host's DERIVED row order — not the
 * model's sessionIds member order — so the painted result is always
 * "most recent first", even when the two orders differ.
 *
 * The fixtures build the grouped tree the way the host renders it
 * (derived row order: recency or the saved manual order over the account's
 * members, the current blank pinned first, then the host visibility
 * filter — ui-workspace tree.ts:144-212 + rows/WorkspaceBrowser.tsx:804-838)
 * while the workspace's sessionIds carry a different member order — the
 * shape of the confirmed bug where the old member-order positional pairing
 * wrote a reversed visual order.
 *
 * Every assertion reads the final `order` values on the row wrappers, i.e.
 * the visual order the flex layout will paint (lowest first).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

const root = new URL('..', import.meta.url)

// ---------------------------------------------------------------------------
// Fakes (same shape as tests/switches.test.mjs; trimmed to what the recency
// feature touches: document / window / localStorage / MutationObserver /
// timers).
// ---------------------------------------------------------------------------

function makeElement(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    style: {},
    dataset: {},
    className: '',
    textContent: '',
    innerHTML: '',
    value: '',
    children: [],
    parentNode: null,
    attributes: {},
  }
  el.appendChild = (child) => { child.parentNode = el; el.children.push(child); return child }
  el.insertBefore = (child, reference) => {
    child.parentNode = el
    const i = reference ? el.children.indexOf(reference) : -1
    if (i === -1) el.children.push(child)
    else el.children.splice(i, 0, child)
    return child
  }
  el.removeChild = (child) => {
    const i = el.children.indexOf(child)
    if (i !== -1) el.children.splice(i, 1)
    child.parentNode = null
    return child
  }
  el.remove = () => { if (el.parentNode !== null) el.parentNode.removeChild(el) }
  Object.defineProperty(el, 'isConnected', { get: () => el.parentNode !== null })
  el.setAttribute = (k, v) => { el.attributes[k] = String(v) }
  el.getAttribute = (k) => (k in el.attributes ? el.attributes[k] : null)
  el.removeAttribute = (k) => { delete el.attributes[k] }
  el.hasAttribute = (k) => k in el.attributes
  el.querySelector = () => null
  el.querySelectorAll = () => []
  el.getBoundingClientRect = () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 })
  // Event surface (the liveness layer's fold button listens for clicks, and
  // the free element-level stubs above keep every other selector a no-op).
  el.listeners = {}
  el.addEventListener = (type, fn) => { (el.listeners[type] ??= []).push(fn) }
  el.removeEventListener = (type, fn) => {
    const list = el.listeners[type] || []
    const i = list.indexOf(fn)
    if (i !== -1) list.splice(i, 1)
  }
  el.click = () => {
    for (const fn of [...(el.listeners.click || [])]) fn({ stopPropagation() {}, target: el })
  }
  return el
}

function makeEnv() {
  const env = {
    listeners: {},
    windowListeners: {},
    moInstances: [],
    timers: [],
  }
  env.document = {
    body: makeElement('body'),
    head: makeElement('head'),
    createElement: (tag) => makeElement(tag),
    querySelectorAll: () => [],
    addEventListener: (type, fn) => { (env.listeners[type] ??= []).push(fn) },
    removeEventListener: (type, fn) => {
      const list = env.listeners[type] || []
      const i = list.indexOf(fn)
      if (i !== -1) list.splice(i, 1)
    },
  }
  env.window = {
    localStorage: {
      store: new Map(),
      getItem(k) { return this.store.has(k) ? this.store.get(k) : null },
      setItem(k, v) { this.store.set(k, String(v)) },
      removeItem(k) { this.store.delete(k) },
    },
    setTimeout: (fn) => { env.timers.push(fn); return env.timers.length - 1 },
    clearTimeout: (id) => { if (env.timers[id]) env.timers[id] = null },
  }
  env.MutationObserver = class {
    constructor() { this.observed = [] }
    observe() {}
    disconnect() {}
  }
  env.flushTimers = () => {
    const due = env.timers.filter(Boolean)
    env.timers.length = 0
    for (const fn of due) fn()
    return due.length
  }
  return env
}

const GLOBAL_KEYS = ['document', 'window', 'MutationObserver']
function installGlobals(env) {
  env.prev = {}
  for (const key of GLOBAL_KEYS) {
    env.prev[key] = globalThis[key]
    globalThis[key] = env[key]
  }
}
function uninstallGlobals(env) {
  for (const key of GLOBAL_KEYS) {
    if (env.prev[key] === undefined) delete globalThis[key]
    else globalThis[key] = env.prev[key]
  }
}

/** A fake list store behind the sessions/workspaces service seam. */
function makeListStore(snapshot) {
  const subs = new Set()
  return {
    getSnapshot: () => snapshot,
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn) },
    subscribeCount: () => subs.size,
  }
}

/** A list store whose snapshot can be flipped (for the non-ready test). */
function makeMutableListStore(initial) {
  let snapshot = initial
  const subs = new Set()
  return {
    getSnapshot: () => snapshot,
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn) },
    subscribeCount: () => subs.size,
    setSnapshot: (next) => {
      snapshot = next
      for (const fn of [...subs]) fn()
    },
  }
}

function session(id, displayTitle, updatedAt, extra = {}) {
  return { id, displayTitle, updatedAt, retainedBy: { mainView: 0 }, ...extra }
}

// ---------------------------------------------------------------------------
// Tree builder: one role="tree" div, one group section per spec.
//
//   { title, rows: [{ id, text, dom?: [{ className, text }] }],
//     button?: 'collapsed' | 'expanded',
//     collapsed?: true (the header row renders aria-expanded="false"),
//     actions?: true (the header row carries a rowActions span),
//     nested?: [{ title, rows: [{ id, text }] }] }
//
// Each session row is a role="treeitem" div wrapped in one span (the flex
// item the feature styles). A flat row's wrapper carries the row's visible
// text, which — like the host — starts with the session's displayTitle
// (then a time label). A `dom` row renders host-realistic nesting instead
// (Rows.tsx): the parts as leaf spans inside the treeitem — a status leaf
// first (visually-hidden, still in textContent), then the title leaf, then
// the time leaf — so the row's full text does NOT start with the
// displayTitle. A `nested` spec adds the host's workspace-tree mode: a
// role="group" container between the section header and its own rows,
// holding nested group sections (each with its own header and rows).
// ---------------------------------------------------------------------------

function buildTree(env, sectionSpecs) {
  const tree = makeElement('div')
  tree.setAttribute('role', 'tree')
  const sections = []
  for (const spec of sectionSpecs) {
    const section = makeElement('div')
    const headerWrap = makeElement('span')
    const header = makeElement('div')
    header.setAttribute('role', 'treeitem')
    header.setAttribute('aria-expanded', spec.collapsed ? 'false' : 'true')
    header.textContent = spec.title
    if (spec.actions) {
      // Host realism: the header row ends in its rowActions span, which is
      // where the age label and the attention badge are inserted.
      const actions = makeElement('span')
      actions.className = 'hash_rowActions'
      header.appendChild(actions)
    }
    headerWrap.appendChild(header)
    section.appendChild(headerWrap)
    let nested = null
    if (spec.nested) {
      // Host workspace-tree mode: the nested sections live in a role="group"
      // container between the section header and its own rows.
      const container = makeElement('div')
      container.setAttribute('role', 'group')
      section.appendChild(container)
      nested = []
      for (const nestedSpec of spec.nested) {
        const nestedSection = makeElement('div')
        const nestedHeaderWrap = makeElement('span')
        const nestedHeader = makeElement('div')
        nestedHeader.setAttribute('role', 'treeitem')
        nestedHeader.setAttribute('aria-expanded', 'true')
        nestedHeader.textContent = nestedSpec.title
        nestedHeaderWrap.appendChild(nestedHeader)
        nestedSection.appendChild(nestedHeaderWrap)
        const nestedRows = {}
        for (const rowSpec of nestedSpec.rows) {
          const wrap = makeElement('span')
          const row = makeElement('div')
          row.setAttribute('role', 'treeitem')
          row.setAttribute('data-row-key', `session:${rowSpec.id}`)
          row.textContent = rowSpec.text
          wrap.textContent = rowSpec.text
          wrap.appendChild(row)
          // Host realism: the flex item the feature styles is a span wrapper,
          // the row itself is the marked div inside it (the liveness density
          // writes target the inner row).
          wrap.querySelector = (sel) => (sel === '[data-row-key^="session:"]' ? row : null)
          nestedSection.appendChild(wrap)
          nestedRows[rowSpec.id] = wrap
        }
        nested.push({ section: nestedSection, rows: nestedRows, button: null })
        container.appendChild(nestedSection)
      }
    }
    const rows = {}
    for (const rowSpec of spec.rows) {
      const wrap = makeElement('span')
      const row = makeElement('div')
      row.setAttribute('role', 'treeitem')
      row.setAttribute('data-row-key', `session:${rowSpec.id}`)
      if (rowSpec.dom) {
        const joined = rowSpec.dom.map((part) => part.text).join('')
        row.textContent = joined
        wrap.textContent = joined
        for (const part of rowSpec.dom) {
          const leaf = makeElement('span')
          leaf.className = part.className || ''
          leaf.textContent = part.text
          row.appendChild(leaf)
        }
      } else {
        row.textContent = rowSpec.text
        wrap.textContent = rowSpec.text
      }
      wrap.appendChild(row)
      wrap.querySelector = (sel) => (sel === '[data-row-key^="session:"]' ? row : null)
      section.appendChild(wrap)
      rows[rowSpec.id] = wrap
    }
    let button = null
    if (spec.button) {
      button = makeElement('button')
      button.setAttribute('aria-expanded', spec.button === 'expanded' ? 'true' : 'false')
      button.textContent = '展开更多'
      section.appendChild(button)
    }
    sections.push(nested ? { section, rows, button, nested } : { section, rows, button })
    tree.appendChild(section)
  }
  env.document.querySelectorAll = (sel) => (sel === '[role="tree"]' ? [tree] : [])
  // Host realism: the feature measures the marked row divs when it snapshots
  // the FLIP "First" positions (the flex item around them carries `order`).
  const collect = (node, out) => {
    const key = node.getAttribute('data-row-key')
    if (typeof key === 'string' && key.startsWith('session:')) out.push(node)
    for (const child of node.children) collect(child, out)
    return out
  }
  tree.querySelectorAll = (sel) => (
    sel === '[data-row-key^="session:"]' ? collect(tree, []) : []
  )
  return { tree, sections }
}

// ---------------------------------------------------------------------------
// Mount helper: fake DOM + list stores + the real feature client.
// ---------------------------------------------------------------------------

async function mount({
  sections, sessions, workspaces, storage, archived = [], pinned = [], projections = {},
  uiSession, locale, workspaceRows, prepare,
}) {
  const env = makeEnv()
  installGlobals(env)
  // Optional pre-mount hook over the fake environment (e.g. giving the window
  // a requestAnimationFrame so the FLIP path is exercised).
  if (typeof prepare === 'function') prepare(env)
  const built = buildTree(env, sections)
  // Optional host workspace header rows (idlePass walks the document for
  // them; the sections above are what the ordering layers walk).
  const headerRows = (workspaceRows || []).map((spec) => {
    const row = env.document.createElement('div')
    row.setAttribute('data-row-key', `workspace:${spec.id}`)
    row.setAttribute('role', 'treeitem')
    row.setAttribute('aria-expanded', 'true')
    row.textContent = spec.title ?? spec.id
    const actions = env.document.createElement('span')
    actions.className = 'hash_rowActions'
    row.appendChild(actions)
    row.clicks = 0
    row.click = () => {
      row.clicks += 1
      row.setAttribute('aria-expanded', 'false')
    }
    return row
  })
  if (headerRows.length > 0) {
    const inner = env.document.querySelectorAll
    env.document.querySelectorAll = (sel) => (
      sel === '[data-row-key^="workspace:"]' ? headerRows : inner(sel)
    )
  }
  const [first] = built.sections // every fixture mounts exactly one section
  if (storage) {
    for (const [key, value] of Object.entries(storage)) {
      env.window.localStorage.store.set(key, value)
    }
  }
  const sessionsStore = makeListStore({
    phase: 'ready',
    byId: Object.fromEntries(sessions.map((s) => [s.id, s])),
    ids: sessions.map((s) => s.id),
    // Subagent catalogs travel with the same list snapshot (the host's
    // running-subagent exemption reads them, tree.ts:390-395).
    projectionsBySession: projections,
  })
  const workspacesStore = makeListStore({
    phase: 'ready',
    items: workspaces,
    archivedSessionIds: archived,
    pinnedSessionIds: pinned,
  })
  const { feature } = await import(new URL('features/workspace-recency-order/src/index.js', root).href)
  const ctx = locale === undefined
    ? {}
    : { locale: { getSnapshot: () => ({ active: locale }), subscribe: () => () => {} } }
  const dispose = feature.client(ctx, {
    sessions: { list: sessionsStore },
    workspaces: { list: workspacesStore },
    ...(uiSession === undefined ? {} : { uiSession }),
  })
  env.flushTimers()
  return {
    env,
    ...built,
    ...first,
    dispose,
    headerRows,
    sessionsStore,
    workspacesStore,
    tearDown: () => {
      dispose()
      uninstallGlobals(env)
    },
  }
}

// ---------------------------------------------------------------------------
// Fixtures (the derived row order always DIFFERS from the member order).
// ---------------------------------------------------------------------------

// One workspace, three ordinary sessions. Member order (sessionIds) is
// oldest-first; the host renders newest-first (recency) — derived ≠ member.
const BETA_SESSIONS = [
  session('b1', 'Beta one', 100),
  session('b2', 'Beta two', 300),
  session('b3', 'Beta three', 200),
]
const BETA_WORKSPACES = [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: ['b1', 'b2', 'b3'] }]

/** The row the host would render for id: displayTitle + a time label. */
function rowText(id) {
  const titles = {
    b1: 'Beta one', b2: 'Beta two', b3: 'Beta three',
    zz: 'Zulu', aa: 'Alfa', n1: '新会话',
    u1: 'U one', u2: 'U two', u3: 'U three', u4: 'U four', u5: 'U five', u6: 'U six',
  }
  return `${titles[id] ?? id}6分钟`
}

// ---------------------------------------------------------------------------
// Tests.
// ---------------------------------------------------------------------------

test('derived row order != member order: the visual result is recency', async () => {
  const { rows, sections, tearDown } = await mount({
    sections: [{ title: 'w1', rows: ['b2', 'b3', 'b1'].map((id) => ({ id, text: rowText(id) })) }],
    sessions: BETA_SESSIONS,
    workspaces: BETA_WORKSPACES,
  })
  try {
    // Group layer still applies: the lone section is rank 0.
    assert.equal(sections[0].section.style.order, '0')
    // Row layer: the painted (visual) order must be recency — newest first.
    assert.equal(rows.b2.style.order, '10', 'newest row ranks first')
    assert.equal(rows.b3.style.order, '11')
    assert.equal(rows.b1.style.order, '12', 'oldest row ranks last')
    assert.equal(rows.b2.style.flexShrink, '0')
  } finally {
    tearDown()
  }
})

test('ties on updatedAt keep the host tie-break (id ascending)', async () => {
  const sessions = [
    session('zz', 'Zulu', 400),
    session('aa', 'Alfa', 400),
  ]
  const workspaces = [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: ['zz', 'aa'] }]
  const { rows, tearDown } = await mount({
    sections: [{ title: 'w1', rows: [{ id: 'aa', text: rowText('aa') }, { id: 'zz', text: rowText('zz') }] }],
    sessions,
    workspaces,
  })
  try {
    assert.equal(rows.aa.style.order, '10', 'id-ascending tie-break: aa before zz')
    assert.equal(rows.zz.style.order, '11')
  } finally {
    tearDown()
  }
})

test('the ungrouped bucket gets the row layer too, overflow button stays last', async () => {
  // No workspaces: every session belongs to the ungrouped bucket. Six
  // ordinary sessions, section collapsed (five shown + overflow button).
  const sessions = [
    session('u1', 'U one', 10),
    session('u2', 'U two', 20),
    session('u3', 'U three', 30),
    session('u4', 'U four', 40),
    session('u5', 'U five', 50),
    session('u6', 'U six', 60),
  ]
  const { rows, button, sections, tearDown } = await mount({
    sections: [{
      title: '未分组',
      rows: ['u6', 'u5', 'u4', 'u3', 'u2'].map((id) => ({ id, text: rowText(id) })),
      button: 'collapsed',
    }],
    sessions,
    workspaces: [],
  })
  try {
    assert.equal(sections[0].section.style.order, '0')
    // The five shown rows paint in recency order (the hidden sixth is absent).
    assert.equal(rows.u6.style.order, '10')
    assert.equal(rows.u5.style.order, '11')
    assert.equal(rows.u4.style.order, '12')
    assert.equal(rows.u3.style.order, '13')
    assert.equal(rows.u2.style.order, '14')
    assert.equal(button.style.order, '999', 'the overflow button stays last')
  } finally {
    tearDown()
  }
})

test('a non-ready list clears every applied style', async () => {
  const env = makeEnv()
  installGlobals(env)
  const { tree, sections } = buildTree(env, [{
    title: 'w1',
    rows: ['b2', 'b3', 'b1'].map((id) => ({ id, text: rowText(id) })),
  }])
  const { rows } = sections[0]
  const sessionsStore = makeMutableListStore({
    phase: 'ready',
    byId: Object.fromEntries(BETA_SESSIONS.map((s) => [s.id, s])),
    ids: BETA_SESSIONS.map((s) => s.id),
  })
  const workspacesStore = makeListStore({ phase: 'ready', items: BETA_WORKSPACES, archivedSessionIds: [] })
  const { feature } = await import(new URL('features/workspace-recency-order/src/index.js', root).href)
  const dispose = feature.client({}, {
    sessions: { list: sessionsStore },
    workspaces: { list: workspacesStore },
  })
  try {
    env.flushTimers()
    assert.equal(sections[0].section.style.order, '0', 'ready state applied the visual order')
    assert.equal(rows.b2.style.order, '10')
    // The list goes non-ready: every style the feature wrote is restored.
    sessionsStore.setSnapshot({ phase: 'pending', byId: {}, ids: [] })
    env.flushTimers()
    assert.equal(tree.style.display, undefined, 'the tree styles are cleared')
    assert.equal(sections[0].section.style.order, undefined, 'the section styles are cleared')
    assert.equal(rows.b2.style.order, undefined, 'the row styles are cleared')
  } finally {
    dispose()
    uninstallGlobals(env)
  }
})

test('manual order is not sticky: the visual result is still recency', async () => {
  // The host view store (read-only) says orderBy=manual with a saved
  // permutation that covers the account; the DOM renders that permutation.
  const saved = {
    groupBy: 'workspace',
    orderBy: 'manual',
    groupExpansion: {},
    sessionOrderByAccount: { w1: ['b3', 'b1', 'b2'] },
  }
  const { rows, env, tearDown } = await mount({
    sections: [{ title: 'w1', rows: ['b3', 'b1', 'b2'].map((id) => ({ id, text: rowText(id) })) }],
    sessions: BETA_SESSIONS,
    workspaces: BETA_WORKSPACES,
    storage: { 'dsh.workspace.view.v5': JSON.stringify(saved) },
  })
  try {
    assert.equal(rows.b2.style.order, '10', 'recency wins over the saved manual order')
    assert.equal(rows.b3.style.order, '11')
    assert.equal(rows.b1.style.order, '12')
    assert.equal(
      env.window.localStorage.getItem('dsh.workspace.view.v5'),
      JSON.stringify(saved),
      'the host view store is read but never written',
    )
  } finally {
    tearDown()
  }
})

test('a row count mismatch makes the section row layer a no-op', async () => {
  // Three visible rows are derived, but the DOM only holds two (any state
  // the feature cannot map): no row order may be written — the group layer
  // is unaffected.
  const { rows, sections, tearDown } = await mount({
    sections: [{ title: 'w1', rows: ['b2', 'b3'].map((id) => ({ id, text: rowText(id) })) }],
    sessions: BETA_SESSIONS,
    workspaces: BETA_WORKSPACES,
  })
  try {
    assert.equal(sections[0].section.style.order, '0', 'the group layer still applies')
    assert.equal(rows.b2.style.order, undefined, 'row layer no-ops on a count mismatch')
    assert.equal(rows.b3.style.order, undefined)
  } finally {
    tearDown()
  }
})

test('the current blank row keeps index 0 even when it is least recent', async () => {
  // Host invariant (tree.ts:194-200 + WBS:823-826): the section's current
  // blank row is pinned to the first row position. The feature re-ranks the
  // remaining rows on the recency ruler and must NOT drag the blank row out
  // of position 0 — here the blank is the LEAST recent row (updatedAt 10 <
  // 100 < 300), the worst case: a plain recency sort would sink it last.
  const sessions = [
    session('n1', '', 10, { blank: true, retainedBy: { mainView: 1 } }),
    session('b1', 'Beta one', 100),
    session('b2', 'Beta two', 300),
  ]
  const workspaces = [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: ['n1', 'b1', 'b2'] }]
  const { rows, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: [
        { id: 'n1', text: '新会话' },
        { id: 'b2', text: rowText('b2') },
        { id: 'b1', text: rowText('b1') },
      ],
    }],
    sessions,
    workspaces,
  })
  try {
    assert.equal(rows.n1.style.order, '10', 'the pinned blank row keeps the first position')
    assert.equal(rows.b2.style.order, '11', 'the remaining rows rank by recency')
    assert.equal(rows.b1.style.order, '12')
  } finally {
    tearDown()
  }
})

test('a current blank that is not a member of the section is not pinned there', async () => {
  // Host member-eligibility guard (WBS:808-812, 823-826): currentBlank is
  // pinned only where memberIds includes it. The current blank m1 belongs
  // to the ungrouped bucket, not to w1 — w1's projection must not pin it
  // (which would add a phantom id, break the count, and no-op the section).
  const sessions = [
    session('m1', '', 400, { blank: true, retainedBy: { mainView: 1 } }),
    session('b1', 'Beta one', 100),
    session('b2', 'Beta two', 300),
  ]
  const workspaces = [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: ['b1', 'b2'] }]
  const { rows, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: [
        { id: 'b2', text: rowText('b2') },
        { id: 'b1', text: rowText('b1') },
      ],
    }],
    sessions,
    workspaces,
  })
  try {
    // No phantom pin: the section's two rows stay aligned and rank by recency.
    assert.equal(rows.b2.style.order, '10')
    assert.equal(rows.b1.style.order, '11')
  } finally {
    tearDown()
  }
})

test('a collapsed workspace section shows the five newest rows', async () => {
  const sessions = [
    session('c1', 'C one', 10),
    session('c2', 'C two', 20),
    session('c3', 'C three', 30),
    session('c4', 'C four', 40),
    session('c5', 'C five', 50),
    session('c6', 'C six', 60),
    session('c7', 'C seven', 70),
  ]
  const workspaces = [{
    workspaceId: 'w1',
    path: '/w1',
    title: 'w1',
    sessionIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
  }]
  const shown = ['c7', 'c6', 'c5', 'c4', 'c3']
  const { rows, button, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: shown.map((id) => ({ id, text: `${sessions.find((s) => s.id === id).displayTitle}1分钟` })),
      button: 'collapsed',
    }],
    sessions,
    workspaces,
  })
  try {
    assert.equal(rows.c7.style.order, '10')
    assert.equal(rows.c6.style.order, '11')
    assert.equal(rows.c5.style.order, '12')
    assert.equal(rows.c4.style.order, '13')
    assert.equal(rows.c3.style.order, '14')
    assert.equal(button.style.order, '999')
  } finally {
    tearDown()
  }
})

test('a row whose visible text betrays the pairing makes the section no-op', async () => {
  // The assumed pairing cannot be confirmed from the row text (the text
  // does not start with the paired displayTitle): the row layer must not
  // guess — no row order is written.
  const { rows, sections, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: [
        { id: 'b2', text: 'UNRELATED TEXT' },
        { id: 'b3', text: rowText('b3') },
        { id: 'b1', text: rowText('b1') },
      ],
    }],
    sessions: BETA_SESSIONS,
    workspaces: BETA_WORKSPACES,
  })
  try {
    assert.equal(sections[0].section.style.order, '0', 'the group layer still applies')
    assert.equal(rows.b2.style.order, undefined, 'untrustworthy pairing: the section row layer no-ops')
    assert.equal(rows.b3.style.order, undefined)
    assert.equal(rows.b1.style.order, undefined)
  } finally {
    tearDown()
  }
})

/** A host-shaped row (Rows.tsx order): status leaf, title leaf, time leaf. */
function hostDomRow(id, title, time, status) {
  return {
    id,
    text: `${status}${title}${time}`,
    dom: [
      { className: 'visuallyHidden', text: status },
      { className: 'title', text: title },
      { className: 'time', text: time },
    ],
  }
}

test('host-shaped rows with a status badge before the title still rank by recency', async () => {
  // Core regression: the host renders the status badge (visually-hidden
  // labels that still land in textContent) BEFORE the title span, so the
  // row's full text no longer starts with the paired displayTitle. The
  // pairing must be confirmed from the row's title leaf — the section's row
  // layer still ranks by recency instead of no-oping. The DOM order is the
  // host's recency projection (newest first) and deliberately differs from
  // the member order (sessionIds, oldest first).
  const { rows, sections, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: [
        hostDomRow('b2', 'Beta two', '6分钟', 'Running'),
        hostDomRow('b3', 'Beta three', '12分钟', 'Waiting for answer'),
        hostDomRow('b1', 'Beta one', '20分钟', 'Completed'),
      ],
    }],
    sessions: BETA_SESSIONS,
    workspaces: BETA_WORKSPACES,
  })
  try {
    assert.equal(sections[0].section.style.order, '0', 'the group layer still applies')
    assert.equal(rows.b2.style.order, '10', 'a status leaf before the title does not no-op the section')
    assert.equal(rows.b3.style.order, '11')
    assert.equal(rows.b1.style.order, '12', 'the row layer ranks by recency')
  } finally {
    tearDown()
  }
})

test('a row with no leaf confirming the title still no-ops the section row layer', async () => {
  // Fail-closed still holds under the leaf criterion: the row's whole text
  // and every leaf in its subtree fail to start with the paired
  // displayTitle, so the row layer must not guess — no row order is written
  // (the group layer is unaffected).
  const { rows, sections, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: [
        hostDomRow('b2', 'UNRELATED TITLE', '6分钟', 'Some status'),
        hostDomRow('b3', 'Beta three', '12分钟', 'Waiting for answer'),
        hostDomRow('b1', 'Beta one', '20分钟', 'Completed'),
      ],
    }],
    sessions: BETA_SESSIONS,
    workspaces: BETA_WORKSPACES,
  })
  try {
    assert.equal(sections[0].section.style.order, '0', 'the group layer still applies')
    assert.equal(rows.b2.style.order, undefined, 'no confirming leaf: the section row layer no-ops')
    assert.equal(rows.b3.style.order, undefined)
    assert.equal(rows.b1.style.order, undefined)
  } finally {
    tearDown()
  }
})

test('a same-count workspace reorder the DOM has not caught up yet makes the whole level fail closed', async () => {
  // Q8 window: the store's workspace order is already [B, A] (the new
  // order) while the DOM still renders the sections in the old order
  // [A, B]. Positional pairing would then pair A's section with B's
  // workspace and vice versa — the section header texts betray the
  // pairing, so neither layer may write a single order; the next pass
  // repaints once the DOM has reordered.
  const sessions = [
    session('a1', 'A one', 100),
    session('b1', 'B one', 200),
  ]
  const workspaces = [
    { workspaceId: 'wb', path: '/proj/B', title: 'B', sessionIds: ['b1'] },
    { workspaceId: 'wa', path: '/proj/A', title: 'A', sessionIds: ['a1'] },
  ]
  const m = await mount({
    sections: [
      { title: 'A', rows: [{ id: 'a1', text: 'A one6分钟' }] },
      { title: 'B', rows: [{ id: 'b1', text: 'B one6分钟' }] },
    ],
    sessions,
    workspaces,
  })
  const [sectionA, sectionB] = m.sections
  try {
    assert.equal(sectionA.section.style.order, undefined, 'group layer no-ops: A is paired with B')
    assert.equal(sectionB.section.style.order, undefined)
    assert.equal(sectionA.rows.a1.style.order, undefined, 'the row layer no-ops with it')
    assert.equal(sectionB.rows.b1.style.order, undefined)
  } finally {
    m.tearDown()
  }
})

test('a section header carrying a suffix after the title still passes the trust gate', async () => {
  // The host may render extra text after the workspace title (a
  // session-count badge such as "w1 3"); the startsWith rule must still
  // confirm the pairing and rank normally.
  const { rows, sections, tearDown } = await mount({
    sections: [{ title: 'w1 3', rows: ['b2', 'b3', 'b1'].map((id) => ({ id, text: rowText(id) })) }],
    sessions: BETA_SESSIONS,
    workspaces: BETA_WORKSPACES,
  })
  try {
    assert.equal(sections[0].section.style.order, '0', 'a suffix after the title does not no-op the group layer')
    assert.equal(rows.b2.style.order, '10', 'and the row layer still ranks by recency')
    assert.equal(rows.b3.style.order, '11')
    assert.equal(rows.b1.style.order, '12')
  } finally {
    tearDown()
  }
})

test('an empty section header text is no signal and never no-ops the layer', async () => {
  // The header text may be empty (not rendered yet, or the workspace has
  // no title); an empty header must not fail the pairing, else
  // title-less workspaces would never receive their visual order.
  const { rows, sections, tearDown } = await mount({
    sections: [{ title: '', rows: ['b2', 'b3', 'b1'].map((id) => ({ id, text: rowText(id) })) }],
    sessions: BETA_SESSIONS,
    workspaces: BETA_WORKSPACES,
  })
  try {
    assert.equal(sections[0].section.style.order, '0', 'an empty header text: the group layer still applies')
    assert.equal(rows.b2.style.order, '10', 'and the row layer still applies')
    assert.equal(rows.b3.style.order, '11')
    assert.equal(rows.b1.style.order, '12')
  } finally {
    tearDown()
  }
})

test('a collapsed section keeps the blank plus exactly five ordinary rows', async () => {
  // collapsedRows' blank branch (index.js:242-245): a blank row never
  // consumes one of the five ordinary-row slots. With a current blank and
  // seven ordinary sessions the collapsed DOM holds six rows — the blank
  // (pinned first) plus the five newest — and the overflow button stays last.
  const sessions = [
    session('n1', '', 5, { blank: true, retainedBy: { mainView: 1 } }),
    session('c1', 'C one', 10),
    session('c2', 'C two', 20),
    session('c3', 'C three', 30),
    session('c4', 'C four', 40),
    session('c5', 'C five', 50),
    session('c6', 'C six', 60),
    session('c7', 'C seven', 70),
  ]
  const workspaces = [{
    workspaceId: 'w1',
    path: '/w1',
    title: 'w1',
    sessionIds: ['n1', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
  }]
  const shown = ['n1', 'c7', 'c6', 'c5', 'c4', 'c3']
  const byId = Object.fromEntries(sessions.map((s) => [s.id, s]))
  const { rows, button, sections, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: shown.map((id) => ({ id, text: id === 'n1' ? '新会话' : `${byId[id].displayTitle}1分钟` })),
      button: 'collapsed',
    }],
    sessions,
    workspaces,
  })
  try {
    assert.equal(rows.n1.style.order, '10', 'the current blank is kept (pinned first)')
    assert.equal(rows.c7.style.order, '11')
    assert.equal(rows.c6.style.order, '12')
    assert.equal(rows.c5.style.order, '13')
    assert.equal(rows.c4.style.order, '14')
    assert.equal(rows.c3.style.order, '15', 'only the first five ordinary rows are kept')
    assert.equal(button.style.order, '999', 'the overflow button stays last')
  } finally {
    tearDown()
  }
})

test('a nested group level recurses: both layers rank by their own activity', async () => {
  // workspace-tree mode (index.js:594-601): a section's role="group"
  // container holds nested sections, and orderLevel recurses into it with
  // the parent workspace's children. Both layers must rank independently:
  // the outer level by each top-level workspace's latest member activity
  // (B at 300 outranks A at 100, so the visual order inverts the DOM order),
  // the nested level by each child workspace's own activity (both children
  // rank 0 — the layers cannot share one ruler), and every row layer by its
  // section's own sessions (DOM row order deliberately differs from the
  // member order in B's child: bc2 at 90 is newer than bc1 at 40).
  const sessions = [
    session('a1', 'A one', 100),
    session('b1', 'B one', 300),
    session('ac1', 'A child one', 200),
    session('bc1', 'B child one', 40),
    session('bc2', 'B child two', 90),
  ]
  const workspaces = [
    { workspaceId: 'wa', path: '/proj/A', title: 'A', sessionIds: ['a1'] },
    { workspaceId: 'wb', path: '/proj/B', title: 'B', sessionIds: ['b1'] },
    { workspaceId: 'wac', path: '/proj/A/c1', title: 'A c1', sessionIds: ['ac1'] },
    { workspaceId: 'wbc', path: '/proj/B/c2', title: 'B c2', sessionIds: ['bc1', 'bc2'] },
  ]
  const { sections, tearDown } = await mount({
    sections: [
      {
        title: 'A',
        rows: [{ id: 'a1', text: 'A one6分钟' }],
        nested: [{ title: 'A c1', rows: [{ id: 'ac1', text: 'A child one6分钟' }] }],
      },
      {
        title: 'B',
        rows: [{ id: 'b1', text: 'B one6分钟' }],
        nested: [{
          title: 'B c2',
          rows: [
            { id: 'bc2', text: 'B child two6分钟' },
            { id: 'bc1', text: 'B child one6分钟' },
          ],
        }],
      },
    ],
    sessions,
    workspaces,
  })
  const [a, b] = sections
  try {
    // Outer group layer: B (activity 300) ranks 0, A (activity 100) ranks 1 —
    // the visual order inverts the DOM order [A, B].
    assert.equal(b.section.style.order, '0', 'the fresher top-level workspace ranks first')
    assert.equal(a.section.style.order, '1')
    // Nested levels: each recursion ranks from 0 within its own container —
    // both children are 0, so the two layers cannot share one ruler.
    assert.equal(a.nested[0].section.style.order, '0', 'the nested level ranks from 0')
    assert.equal(b.nested[0].section.style.order, '0')
    // Row layers rank per section, with no cross-section bleed.
    assert.equal(a.rows.a1.style.order, '10')
    assert.equal(b.rows.b1.style.order, '10')
    assert.equal(a.nested[0].rows.ac1.style.order, '10')
    assert.equal(b.nested[0].rows.bc2.style.order, '10', 'the newer row ranks first')
    assert.equal(b.nested[0].rows.bc1.style.order, '11', 'DOM order is not the member order')
  } finally {
    tearDown()
  }
})

test('a flat list tree or a search tree receives no style.order at all (findTree fails closed)', async () => {
  // findTree (index.js:655-665) only accepts a role="tree" whose direct
  // children include a group section (a treeitem carrying aria-expanded).
  // Two ungrouped host shapes must make the whole pass a no-op — not a
  // single style.order written, and no exception:
  //   (a) the flat list tree: session rows (role="treeitem" without
  //       aria-expanded) laid out directly under the tree root;
  //   (b) the search-state results tree: rows grouped under role="group"
  //       containers, still without aria-expanded section headers.
  const sessions = [
    session('b1', 'Beta one', 100),
    session('b2', 'Beta two', 300),
  ]
  const workspaces = [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: ['b1', 'b2'] }]

  /** A session-row wrapper: span > treeitem div carrying the host row text. */
  function rowWrapper(id) {
    const wrap = makeElement('span')
    const row = makeElement('div')
    row.setAttribute('role', 'treeitem')
    row.textContent = rowText(id)
    wrap.textContent = rowText(id)
    wrap.appendChild(row)
    return wrap
  }

  /** Mount the real client against a DOM the buildDom callback constructs. */
  async function mountRaw(buildDom) {
    const env = makeEnv()
    installGlobals(env)
    const dom = buildDom(env)
    const sessionsStore = makeListStore({
      phase: 'ready',
      byId: Object.fromEntries(sessions.map((s) => [s.id, s])),
      ids: sessions.map((s) => s.id),
    })
    const workspacesStore = makeListStore({ phase: 'ready', items: workspaces, archivedSessionIds: [] })
    const { feature } = await import(new URL('features/workspace-recency-order/src/index.js', root).href)
    const dispose = feature.client({}, {
      sessions: { list: sessionsStore },
      workspaces: { list: workspacesStore },
    })
    env.flushTimers()
    return { ...dom, env, dispose }
  }

  // (a) the flat list tree: rows directly under the tree root.
  {
    const m = await mountRaw((env) => {
      const tree = makeElement('div')
      tree.setAttribute('role', 'tree')
      const rows = ['b2', 'b1'].map((id) => { const w = rowWrapper(id); tree.appendChild(w); return w })
      env.document.querySelectorAll = (sel) => (sel === '[role="tree"]' ? [tree] : [])
      return { tree, rows }
    })
    try {
      assert.equal(m.tree.style.order, undefined, 'the flat tree root gets no order')
      assert.equal(m.tree.style.display, undefined, 'no style is written at all')
      for (const wrap of m.rows) assert.equal(wrap.style.order, undefined, 'flat rows stay untouched')
    } finally {
      m.dispose()
      uninstallGlobals(m.env)
    }
  }

  // (b) the search-state results tree: rows under role="group" containers.
  {
    const m = await mountRaw((env) => {
      const tree = makeElement('div')
      tree.setAttribute('role', 'tree')
      const group = makeElement('div')
      group.setAttribute('role', 'group')
      tree.appendChild(group)
      const rows = ['b2', 'b1'].map((id) => { const w = rowWrapper(id); group.appendChild(w); return w })
      env.document.querySelectorAll = (sel) => (sel === '[role="tree"]' ? [tree] : [])
      return { tree, rows }
    })
    try {
      assert.equal(m.tree.style.order, undefined, 'the search tree root gets no order')
      assert.equal(m.tree.style.display, undefined, 'no style is written at all')
      for (const wrap of m.rows) assert.equal(wrap.style.order, undefined, 'search rows stay untouched')
    } finally {
      m.dispose()
      uninstallGlobals(m.env)
    }
  }
})

// ---------------------------------------------------------------------------
// Group-layer archive invariance: archiving a conversation must never move the
// workspace section. The host keeps an archived session in its workspace
// sessionIds slot (workspace/workspace/src/index.ts:336-339 — "Archiving never
// touches workspace accounting"), so the group activity signal
// (latestSessionUpdate / bucketActivity) reads every member regardless of
// archive state; only the row layer hides archived rows (host visibility).
// ---------------------------------------------------------------------------

/** Mount, snapshot the painted visual order of every section and row, tear down. */
async function paint(spec) {
  const m = await mount(spec)
  try {
    return m.sections.map((entry) => ({
      group: entry.section.style.order,
      rows: Object.fromEntries(Object.entries(entry.rows).map(([id, wrap]) => [id, wrap.style.order])),
    }))
  } finally {
    m.tearDown()
  }
}

const INVARIANT_SESSIONS = [
  session('a1', 'A one', 500),
  session('a2', 'A two', 100),
  session('b1', 'B one', 300),
]
const INVARIANT_WORKSPACES = [
  { workspaceId: 'wa', path: '/proj/A', title: 'A', sessionIds: ['a1', 'a2'] },
  { workspaceId: 'wb', path: '/proj/B', title: 'B', sessionIds: ['b1'] },
]
const SECTION_A_OPEN = { title: 'A', rows: [{ id: 'a1', text: 'A one6分钟' }, { id: 'a2', text: 'A two6分钟' }] }
const SECTION_A_ARCHIVED = { title: 'A', rows: [{ id: 'a2', text: 'A two6分钟' }] }
const SECTION_B = { title: 'B', rows: [{ id: 'b1', text: 'B one6分钟' }] }

test('archiving the freshest conversation does not move its workspace down', async () => {
  // The reported jump: A's newest session (500) is archived, so the old
  // activity ruler dropped A to its next-newest member (100) and B (300)
  // overtook it — the whole folder slid down because one row was hidden.
  const open = await paint({
    sessions: INVARIANT_SESSIONS,
    workspaces: INVARIANT_WORKSPACES,
    sections: [SECTION_A_OPEN, SECTION_B],
  })
  const archived = await paint({
    sessions: INVARIANT_SESSIONS,
    workspaces: INVARIANT_WORKSPACES,
    archived: ['a1'],
    sections: [SECTION_A_ARCHIVED, SECTION_B],
  })
  assert.equal(open[0].group, '0', 'A (activity 500) outranks B (300) before the archive')
  assert.equal(open[1].group, '1')
  assert.deepEqual(archived.map((entry) => entry.group), ['0', '1'],
    'archiving A\'s freshest row leaves both sections exactly where they were')
  assert.equal(archived[0].rows.a2, '10', 'the row layer still hides the archived row and ranks what is left')
  assert.equal(archived[1].rows.b1, '10')
})

test('archiving every conversation of a workspace leaves the section pinned', async () => {
  // The same rule taken to its end: an empty-looking section must not fall to
  // the no-activity tail either — that would be the identical jump, just
  // triggered by the last visible row.
  const archived = await paint({
    sessions: INVARIANT_SESSIONS,
    workspaces: INVARIANT_WORKSPACES,
    archived: ['a1', 'a2'],
    sections: [{ title: 'A', rows: [] }, SECTION_B],
  })
  assert.deepEqual(archived.map((entry) => entry.group), ['0', '1'],
    'A keeps rank 0 with every member archived; B does not slide up')
})

test('archiving a stray conversation does not move the ungrouped bucket', async () => {
  // bucketActivity follows the same ruler: the stray session at 500 keeps the
  // bucket first whether or not it is archived.
  const sessions = [session('a1', 'A one', 100), session('x1', 'X one', 500)]
  const workspaces = [{ workspaceId: 'wa', path: '/proj/A', title: 'A', sessionIds: ['a1'] }]
  const open = await paint({
    sessions,
    workspaces,
    sections: [
      { title: 'A', rows: [{ id: 'a1', text: 'A one6分钟' }] },
      { title: '未分组', rows: [{ id: 'x1', text: 'X one6分钟' }] },
    ],
  })
  const archived = await paint({
    sessions,
    workspaces,
    archived: ['x1'],
    sections: [
      { title: 'A', rows: [{ id: 'a1', text: 'A one6分钟' }] },
      { title: '未分组', rows: [] },
    ],
  })
  assert.deepEqual(open.map((entry) => entry.group), ['1', '0'], 'the bucket (500) outranks A (100)')
  assert.deepEqual(archived.map((entry) => entry.group), ['1', '0'],
    'archiving the stray session leaves the bucket where it was')
})

test('a pinned session keeps the host front position while the rest is ranked', async () => {
  // Host section partition (tree.ts:273-287): blanks, then non-archived
  // pinned rows, then the projected rest — so the DOM really renders the
  // OLDEST session first. Replaying without that partition pairs the rows
  // against the wrong sessions and the row layer silently writes nothing.
  const { rows, tearDown } = await mount({
    sections: [{ title: 'w1', rows: ['b1', 'b2', 'b3'].map((id) => ({ id, text: rowText(id) })) }],
    sessions: BETA_SESSIONS,
    workspaces: BETA_WORKSPACES,
    pinned: ['b1'],
  })
  try {
    assert.equal(rows.b1.style.order, '10', 'the pinned row keeps the host front position')
    assert.equal(rows.b2.style.order, '11', 'the rest is still ranked by recency')
    assert.equal(rows.b3.style.order, '12')
  } finally {
    tearDown()
  }
})

test('archivedFilter show: archived rows are rendered, so the row layer still applies', async () => {
  // The host mixes archived sessions back into the list (grayed) when the
  // user picks 全部对话 (tree.ts:229-253). Hard-coding the 'default' filter
  // dropped them from the replay: DOM 3 rows vs replay 2 → count mismatch →
  // no order written at all.
  const { rows, tearDown } = await mount({
    sections: [{ title: 'w1', rows: ['b2', 'b3', 'b1'].map((id) => ({ id, text: rowText(id) })) }],
    sessions: BETA_SESSIONS,
    workspaces: BETA_WORKSPACES,
    archived: ['b2'],
    storage: {
      'dsh.workspace.view.v5': JSON.stringify({
        groupBy: 'workspace',
        orderBy: 'updated',
        groupExpansion: {},
        sessionOrderByAccount: {},
        archivedFilter: 'show',
      }),
    },
  })
  try {
    assert.equal(rows.b2.style.order, '10', 'the visible archived row is paired and ranked')
    assert.equal(rows.b3.style.order, '11')
    assert.equal(rows.b1.style.order, '12')
  } finally {
    tearDown()
  }
})

test('archivedFilter only: the archived-only list is still ranked', async () => {
  // 仅显示已归档 renders nothing but archived rows; the replay must shrink to
  // the same set or the section bails out on a count mismatch.
  const { rows, tearDown } = await mount({
    sections: [{ title: 'w1', rows: [{ id: 'b2', text: rowText('b2') }] }],
    sessions: BETA_SESSIONS,
    workspaces: BETA_WORKSPACES,
    archived: ['b2'],
    storage: {
      'dsh.workspace.view.v5': JSON.stringify({
        groupBy: 'workspace',
        orderBy: 'updated',
        groupExpansion: {},
        sessionOrderByAccount: {},
        archivedFilter: 'only',
      }),
    },
  })
  try {
    assert.equal(rows.b2.style.order, '10')
  } finally {
    tearDown()
  }
})

test('manual mode: a stale saved order and a pinned row are both replayed, then ranked', async () => {
  // The host's manual projection (tree.ts:166-200) is saved slots → pins →
  // ordinary by recency → archives last, and the section partition then
  // front-loads the pin — so the DOM really renders [b2, b3, b1] even though
  // the saved permutation never mentions b2. The row layer must pair against
  // THAT order and still rank by activity (the pinned row excepted).
  const { rows, tearDown } = await mount({
    sections: [{ title: 'w1', rows: ['b2', 'b3', 'b1'].map((id) => ({ id, text: rowText(id) })) }],
    sessions: BETA_SESSIONS,
    workspaces: BETA_WORKSPACES,
    pinned: ['b2'],
    storage: {
      'dsh.workspace.view.v5': JSON.stringify({
        groupBy: 'workspace',
        orderBy: 'manual',
        groupExpansion: {},
        sessionOrderByAccount: { w1: ['b3', 'b1'] },
      }),
    },
  })
  try {
    assert.equal(rows.b2.style.order, '10', 'the pin keeps the host front position')
    assert.equal(rows.b3.style.order, '11', 'recency beats the stale saved permutation')
    assert.equal(rows.b1.style.order, '12')
  } finally {
    tearDown()
  }
})

// ---------------------------------------------------------------------------
// The collapsed-slice contract (host rows/WorkspaceBrowser.tsx:55-70): blank,
// RUNNING and running-subagent rows are exempt from the idle quota, and the
// quota itself is per-group React state — 5, +5 per 展开更多 click, Infinity
// once nothing is hidden (WorkspaceBrowser.tsx:300/369/419-433/581-601).
//
// A port that exempted blanks only and hardcoded 5 replayed one row short on
// every narrowed section holding a running conversation, tripped the count
// gate, and left that section's row layer off — so the running session stayed
// below a stale one, which is exactly what this feature exists to prevent.
// ---------------------------------------------------------------------------

/** A running session (host SessionNode.running, tree.ts:397-417). */
function runningSession(id, displayTitle, updatedAt) {
  return session(id, displayTitle, updatedAt, { running: true })
}

const RUN_SESSIONS = [
  runningSession('run', 'Run one', 900),
  session('a1', 'A one', 100),
  session('a2', 'A two', 200),
  session('a3', 'A three', 300),
  session('a4', 'A four', 400),
  session('a5', 'A five', 500),
  session('a6', 'A six', 600),
]
const RUN_WORKSPACES = [{
  workspaceId: 'w1',
  path: '/w1',
  title: 'w1',
  sessionIds: ['run', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
}]
const RUN_TEXT = {
  run: 'Run one1分钟',
  a1: 'A one1分钟',
  a2: 'A two1分钟',
  a3: 'A three1分钟',
  a4: 'A four1分钟',
  a5: 'A five1分钟',
  a6: 'A six1分钟',
}
function runRows(ids) {
  return ids.map((id) => ({ id, text: RUN_TEXT[id] }))
}

test('a collapsed section exempts the running row, then ranks it to the top', async () => {
  // The reported shape: the host renders six rows (1 running + 5 idle) taken
  // from a stale 手动排序 saved order, so the running conversation sits BELOW
  // an old one. The replay must slice to the very same six rows and then rank
  // them by activity — the running row takes the first position.
  const { rows, sections, button, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: runRows(['a6', 'run', 'a5', 'a4', 'a3', 'a2']),
      button: 'collapsed',
    }],
    sessions: RUN_SESSIONS,
    workspaces: RUN_WORKSPACES,
    storage: {
      'dsh.workspace.view.v5': JSON.stringify({
        groupBy: 'workspace',
        orderBy: 'manual',
        groupExpansion: {},
        sessionOrderByAccount: { w1: ['a6', 'run', 'a5', 'a4', 'a3', 'a2', 'a1'] },
      }),
    },
  })
  try {
    assert.equal(rows.run.style.order, '10', 'the running session is lifted over the stale lead')
    assert.equal(rows.a6.style.order, '11', 'the stale row drops below it')
    assert.equal(rows.a5.style.order, '12')
    assert.equal(rows.a2.style.order, '15')
    assert.equal(button.style.order, '999', 'the overflow button stays last')
    assert.equal(sections[0].section.style.order, '0', 'the group layer is unaffected')
  } finally {
    tearDown()
  }
})

test('a parent with a running subagent is exempt from the idle quota too', async () => {
  // Host runningChildCount (tree.ts:390-395) reads the subagentCatalog
  // projection values, so a parent whose child is still running is rendered
  // outside the quota even though the parent row itself is idle.
  const sessions = [
    session('p1', 'Parent one', 700),
    session('sub1', 'Sub one', 0, {
      origin: 'subagent', parentId: 'p1', running: true, blank: false,
    }),
    session('a1', 'A one', 100),
    session('a2', 'A two', 200),
    session('a3', 'A three', 300),
    session('a4', 'A four', 400),
    session('a5', 'A five', 500),
    session('a6', 'A six', 600),
  ]
  const text = {
    p1: 'Parent one1分钟',
    a1: 'A one1分钟',
    a2: 'A two1分钟',
    a3: 'A three1分钟',
    a4: 'A four1分钟',
    a5: 'A five1分钟',
    a6: 'A six1分钟',
  }
  const { rows, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: ['p1', 'a6', 'a5', 'a4', 'a3', 'a2'].map((id) => ({ id, text: text[id] })),
      button: 'collapsed',
    }],
    sessions,
    workspaces: [{
      workspaceId: 'w1',
      path: '/w1',
      title: 'w1',
      sessionIds: ['p1', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
    }],
    projections: { p1: { values: { subagentCatalog: [{ id: 'sub1' }] } } },
  })
  try {
    assert.equal(rows.p1.style.order, '10', 'the running-subagent parent is rendered and ranked')
    assert.equal(rows.a6.style.order, '11')
    assert.equal(rows.a2.style.order, '15')
  } finally {
    tearDown()
  }
})

test('a section the user expanded (quota 10) keeps working', async () => {
  // One 展开更多 click raises the group's quota to 10, so the host renders 11
  // rows (1 running + 10 idle). The replay derives that quota from the DOM
  // instead of assuming the collapsed default.
  const sessions = [runningSession('run', 'Run one', 5000)]
  const text = { run: 'Run one1分钟' }
  const memberIds = ['run']
  for (let i = 1; i <= 12; i += 1) {
    sessions.push(session(`a${i}`, `A ${i}`, i * 100))
    text[`a${i}`] = `A ${i}1分钟`
    memberIds.push(`a${i}`)
  }
  const shown = ['run']
  for (let i = 12; i >= 3; i -= 1) shown.push(`a${i}`)
  const { rows, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: shown.map((id) => ({ id, text: text[id] })),
      button: 'collapsed',
    }],
    sessions,
    workspaces: [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: memberIds }],
  })
  try {
    assert.equal(rows.run.style.order, '10')
    assert.equal(rows.a12.style.order, '11')
    assert.equal(rows.a3.style.order, '20')
  } finally {
    tearDown()
  }
})

test('a rendered count no host quota explains still fails closed', async () => {
  // 1 running + 4 idle is not the host's 1 running + 5·n idle shape: the
  // count is drift, not a quota, so the section's row layer must write no
  // order at all instead of guessing a slice (presentation never guesses).
  const { rows, sections, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: runRows(['run', 'a6', 'a5', 'a4', 'a3']),
      button: 'collapsed',
    }],
    sessions: RUN_SESSIONS,
    workspaces: RUN_WORKSPACES,
  })
  try {
    assert.equal(sections[0].section.style.order, '0', 'the group layer still applies')
    assert.equal(rows.run.style.order, undefined)
    assert.equal(rows.a6.style.order, undefined)
    assert.equal(rows.a3.style.order, undefined)
  } finally {
    tearDown()
  }
})

// ---------------------------------------------------------------------------
// Liveness layer (spec §1-§8): tiers, density, fold, badge, group boost, the
// auto-collapse exception, dispose, degraded parity and the FLIP path.
//
// These tests drive the second status source the host owns — the Cordis
// uiSession service (packages/client/ui-session/src/client/index.ts:292-298),
// whose sessionStatus snapshot is a ReadonlyMap<SessionId, {running,
// pendingInteraction, completionUnread}> exposing getSnapshot() + subscribe().
// Every test above mounts without it: that is the degraded mode, and it must
// stay byte-for-byte the behavior this feature had before the layer existed.
// ---------------------------------------------------------------------------

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/** The three attention-carrying status shapes the host publishes. */
const PENDING_STATUS = {
  running: false,
  pendingInteraction: { key: 'approval:1', kind: 'approval', sessionId: 'x' },
  completionUnread: false,
}
const RUNNING_STATUS = { running: true, pendingInteraction: undefined, completionUnread: false }
const UNREAD_STATUS = { running: false, pendingInteraction: undefined, completionUnread: true }

/** A uiSession service stub with the host's observable surface. */
function makeUiSession(initial = {}) {
  let snapshot = new Map(Object.entries(initial))
  const subs = new Set()
  return {
    sessionStatus: {
      getSnapshot: () => snapshot,
      subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn) },
    },
    setStatuses(next) {
      snapshot = new Map(Object.entries(next))
      for (const fn of [...subs]) fn()
    },
    subscribeCount: () => subs.size,
  }
}

/** The row element inside one fixture flex item (density lands on it). */
function rowEl(wrap) { return wrap.children[0] }

/** The one child carrying this feature's marker, or null. */
function markerChild(parent, value) {
  for (const child of parent.children) {
    if (child.dataset !== undefined && child.dataset.dshUxPlus === value) return child
  }
  return null
}

/** A host-shaped row spec: the row text starts with the displayTitle. */
function rowSpec(id, title) { return { id, text: `${title}6分钟` } }

test('classifyTier: precedence, the sticky band, the current session, archived', async () => {
  const { classifyTier } = await import(
    new URL('features/workspace-recency-order/src/index.js', root).href
  )
  const now = 1_700_000_000_000
  const stale = now - 10 * HOUR_MS
  // Precedence: pending > running > unread > time.
  assert.equal(classifyTier({
    now,
    updatedAt: stale,
    status: { pendingInteraction: { key: 'k' }, running: true, completionUnread: true },
  }), 'pending', 'a blocking interaction outranks everything')
  assert.equal(classifyTier({
    now,
    updatedAt: stale,
    status: { running: true, completionUnread: true },
  }), 'running')
  assert.equal(classifyTier({ now, updatedAt: stale, status: { completionUnread: true } }), 'unread')
  assert.equal(classifyTier({ now, updatedAt: stale, status: {} }), 'dormant')
  // The time bands, including both band edges.
  assert.equal(classifyTier({ now, updatedAt: now - HOUR_MS }), 'recent')
  assert.equal(classifyTier({ now, updatedAt: now - 2 * HOUR_MS, prevTier: 'dormant' }), 'dormant',
    'the band is sticky at its recent edge')
  assert.equal(classifyTier({ now, updatedAt: now - 2.5 * HOUR_MS }), 'recent',
    'the band defaults to recent without a memory')
  assert.equal(classifyTier({ now, updatedAt: now - 2.5 * HOUR_MS, prevTier: 'dormant' }), 'dormant')
  assert.equal(classifyTier({ now, updatedAt: now - 2.5 * HOUR_MS, prevTier: 'recent' }), 'recent')
  assert.equal(classifyTier({ now, updatedAt: now - 3 * HOUR_MS, prevTier: 'recent' }), 'recent',
    'the dormant edge is still the band')
  assert.equal(classifyTier({ now, updatedAt: now - 4 * HOUR_MS, prevTier: 'recent' }), 'dormant',
    'past the dormant edge the age wins over the memory')
  // The session you are looking at is a full row, however old it is.
  assert.equal(classifyTier({ now, updatedAt: stale, isCurrent: true }), 'recent')
  // Archived rows are dormant for good: the caller then leaves them alone.
  assert.equal(classifyTier({
    now,
    updatedAt: now,
    archived: true,
    status: { pendingInteraction: { key: 'k' }, running: true, completionUnread: true },
  }), 'dormant')
})

test('attentionBadgeText: zh/en, zero parts omitted, empty when nothing is hidden', async () => {
  const { attentionBadgeText } = await import(
    new URL('features/workspace-recency-order/src/index.js', root).href
  )
  assert.equal(attentionBadgeText('zh', { pending: 2, unread: 1 }), '2 待回复 · 1 未读')
  assert.equal(attentionBadgeText('zh-Hans', { pending: 2, unread: 1 }), '2 待回复 · 1 未读',
    'any zh locale id')
  assert.equal(attentionBadgeText('zh', { pending: 0, unread: 3 }), '3 未读', 'the zero part is omitted')
  assert.equal(attentionBadgeText('zh', { pending: 1, unread: 0 }), '1 待回复')
  assert.equal(attentionBadgeText('en', { pending: 2, unread: 1 }), '2 waiting · 1 unread')
  assert.equal(attentionBadgeText('en-US', { pending: 0, unread: 1 }), '1 unread')
  assert.equal(attentionBadgeText('zh', { pending: 0, unread: 0 }), '')
  assert.equal(attentionBadgeText('en', {}), '', 'missing counts are zero')
  assert.equal(attentionBadgeText('zh', undefined), '')
})

test('liveness ranks pending, running, unread, recency, dormant and styles each row', async () => {
  const now = Date.now()
  const uiSession = makeUiSession({
    p1: PENDING_STATUS, r1: RUNNING_STATUS, u1: UNREAD_STATUS, u2: UNREAD_STATUS,
  })
  const titles = {
    c1: 'C one', d1: 'D one', u1: 'U one', r1: 'R one', p1: 'P one', u2: 'U two',
  }
  // The host renders the section's members newest first (its recency
  // projection) — that is the DOM order the row layer must pair against.
  const domOrder = ['c1', 'd1', 'u1', 'r1', 'p1', 'u2']
  const { rows, section, tearDown } = await mount({
    sections: [{ title: 'w1', rows: domOrder.map((id) => rowSpec(id, titles[id])) }],
    sessions: [
      session('c1', titles.c1, now - 30 * 60 * 1000),
      session('d1', titles.d1, now - 10 * HOUR_MS),
      session('u1', titles.u1, now - 20 * HOUR_MS),
      session('r1', titles.r1, now - 25 * HOUR_MS),
      session('p1', titles.p1, now - 30 * HOUR_MS),
      session('u2', titles.u2, now - 8 * DAY_MS),
    ],
    // The member order differs from the rendered order, as in the host.
    workspaces: [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: ['p1', 'u1', 'c1', 'r1', 'u2', 'd1'] }],
    uiSession,
  })
  try {
    assert.equal(rows.p1.style.order, '10', 'a pending interaction pins first')
    assert.equal(rows.r1.style.order, '11', 'a running session pins next')
    assert.equal(rows.u1.style.order, '12', 'then unread completions')
    assert.equal(rows.u2.style.order, '13', 'inside a tier, recency decides')
    assert.equal(rows.c1.style.order, '14', 'then the recent rows')
    assert.equal(rows.d1.style.order, '15', 'dormant rows last')
    // Density is written on the row element inside the flex item.
    assert.equal(rowEl(rows.p1).style.fontSize, undefined, 'pending keeps the full row')
    assert.equal(rowEl(rows.r1).style.opacity, undefined, 'running keeps the full row')
    assert.equal(rowEl(rows.c1).style.fontSize, undefined, 'recent keeps the full row')
    assert.equal(rowEl(rows.u1).style.paddingBlock, '1px', 'unread becomes a micro row')
    assert.equal(rowEl(rows.u1).style.fontSize, '11px')
    assert.equal(rowEl(rows.u1).style.opacity, '0.8')
    assert.equal(rowEl(rows.u2).style.opacity, '0.55', 'a stale unread row fades, it never hides')
    assert.equal(rowEl(rows.u2).style.fontSize, '11px', 'stale unread is still a micro row')
    assert.equal(rowEl(rows.d1).style.paddingBlock, '2px', 'dormant is a compact row')
    assert.equal(rowEl(rows.d1).style.fontSize, '11px')
    assert.equal(rowEl(rows.d1).style.opacity, '0.65')
    assert.equal(markerChild(section, 'fold-row'), null, 'one dormant row folds nothing')
  } finally {
    tearDown()
  }
})

/** The section's header row (role=treeitem carrying aria-expanded). */
function headerOf(built) {
  for (const child of built.section.children) {
    for (const inner of child.children) {
      if (inner.getAttribute('role') === 'treeitem' && inner.getAttribute('aria-expanded') !== null) {
        return inner
      }
    }
  }
  return null
}

/** The header's actions span, where the badge must sit immediately before it. */
function actionsOf(header) {
  for (const child of header.children) {
    if (typeof child.className === 'string' && child.className.includes('rowActions')) return child
  }
  return null
}

test('attention badge: only the attention that is hidden gets counted', async () => {
  const now = Date.now()
  const titles = { p1: 'P one', p2: 'P two', u1: 'U one' }
  const ordinary = ['o1', 'o2', 'o3', 'o4', 'o5']
  const sessions = [
    session('p1', titles.p1, now - 30 * HOUR_MS),
    session('p2', titles.p2, now - 31 * HOUR_MS),
    session('u1', titles.u1, now - 32 * HOUR_MS),
    ...ordinary.map((id, i) => session(id, `O ${i + 1}`, now - (30 + 10 * i) * 60 * 1000)),
  ]
  const statuses = { p1: PENDING_STATUS, p2: PENDING_STATUS, u1: UNREAD_STATUS }
  const members = ['o1', 'o2', 'o3', 'o4', 'o5', 'p1', 'p2', 'u1']
  const workspaces = [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: members }]
  const specs = (ids) => ids.map((id) => ({ id, text: `${id === 'u1' ? titles.u1 : id.startsWith('p') ? titles[id] : `O ${Number(id[1])}`}6分钟` }))

  // (a) A collapsed workspace renders NO rows beyond the host quota. The
  // count therefore cannot come from the DOM: it is workspace.sessionIds
  // crossed with the status snapshot.
  const collapsed = await mount({
    sections: [{ title: 'w1', rows: [], collapsed: true, actions: true }],
    sessions,
    workspaces,
    uiSession: makeUiSession(statuses),
  })
  try {
    const header = headerOf(collapsed)
    const badge = markerChild(header, 'attention-badge')
    assert.ok(badge !== null, 'the collapsed header carries the attention it hides')
    assert.equal(badge.textContent, '2 待回复 · 1 未读')
    assert.equal(header.children.indexOf(badge), header.children.indexOf(actionsOf(header)) - 1,
      'the badge sits immediately before the actions span')
    assert.deepEqual(collapsed.rows, {}, 'no row is in the collapsed DOM')
    assert.equal(badge.style.flex, 'none', 'the badge is the header element, not a row')
  } finally {
    collapsed.tearDown()
  }

  // (b) Expanded with nothing out of view: attention is on screen, so the
  // header stays bare.
  const expanded = await mount({
    sections: [{ title: 'w1', rows: specs([...ordinary, 'p1', 'p2', 'u1']) }],
    sessions,
    workspaces,
    uiSession: makeUiSession(statuses),
  })
  try {
    const header = headerOf(expanded)
    assert.equal(markerChild(header, 'attention-badge'), null)
    assert.equal(expanded.rows.p1.style.order, '10', 'the pinned row is on screen, so no badge')
  } finally {
    expanded.tearDown()
  }

  // (c) Expanded but the host is truncating: only the attention that the
  // quota leaves out is counted, and clearing it takes the badge away.
  const clearing = makeUiSession(statuses)
  const truncated = await mount({
    sections: [{ title: 'w1', rows: specs(['o1', 'o2', 'o3', 'o4', 'o5']), button: 'expanded' }],
    sessions,
    workspaces,
    uiSession: clearing,
  })
  try {
    const header = headerOf(truncated)
    const badge = markerChild(header, 'attention-badge')
    assert.ok(badge !== null, 'the rows the quota hides are the rows the badge counts')
    assert.equal(badge.textContent, '2 待回复 · 1 未读')
    assert.equal(truncated.rows.p1, undefined, 'the pinned rows are genuinely absent')
    clearing.setStatuses({})
    truncated.env.flushTimers()
    assert.equal(markerChild(header, 'attention-badge'), null, 'no attention left, no badge left')
  } finally {
    truncated.tearDown()
  }
})

test('a workspace holding a blocking-attention member is never auto-collapsed', async () => {
  const now = Date.now()
  const sessions = [
    session('b1', 'Busy one', now - 30 * HOUR_MS),
    session('b2', 'Busy two', now - 31 * HOUR_MS),
    session('u1', 'Unread one', now - 32 * HOUR_MS),
  ]
  const workspaces = [{
    workspaceId: 'busy', path: '/busy', title: 'busy', sessionIds: ['b1', 'b2', 'u1'],
  }]
  const busy = await mount({
    sections: [{ title: 'busy', rows: [] }],
    sessions,
    workspaces,
    uiSession: makeUiSession({ b1: RUNNING_STATUS, u1: UNREAD_STATUS }),
    workspaceRows: [{ id: 'busy', title: 'busy' }],
  })
  try {
    const [row] = busy.headerRows
    assert.equal(markerChild(row, 'workspace-age').textContent, '1天',
      'the age label still records the idle time')
    assert.equal(row.clicks, 0, 'a running member keeps the workspace open')
    assert.equal(row.getAttribute('aria-expanded'), 'true')
  } finally {
    busy.tearDown()
  }

  // The same workspace, idle for the same 30 hours, with only an unread
  // completion: unread attention does not hold the section open — the badge
  // keeps it visible instead.
  const unreadOnly = await mount({
    sections: [{ title: 'busy', rows: [] }],
    sessions,
    workspaces,
    uiSession: makeUiSession({
      b1: UNREAD_STATUS, b2: UNREAD_STATUS, u1: UNREAD_STATUS,
    }),
    workspaceRows: [{ id: 'busy', title: 'busy' }],
  })
  try {
    const [row] = unreadOnly.headerRows
    assert.equal(row.clicks, 1, 'an unread completion still auto-collapses')
    assert.equal(row.getAttribute('aria-expanded'), 'false')
  } finally {
    unreadOnly.tearDown()
  }
})

test('a workspace with a pending member outranks a fresher-activity workspace', async () => {
  const now = Date.now()
  const { sections, rows, tearDown } = await mount({
    sections: [
      { title: 'fresh', rows: [{ id: 'f1', text: 'Fresh one6分钟' }] },
      { title: 'blocked', rows: [{ id: 'p1', text: 'Pending one6分钟' }] },
    ],
    sessions: [
      session('f1', 'Fresh one', now - 60 * 1000),
      session('p1', 'Pending one', now - 30 * HOUR_MS),
    ],
    workspaces: [
      { workspaceId: 'fresh', path: '/fresh', title: 'fresh', sessionIds: ['f1'] },
      { workspaceId: 'blocked', path: '/blocked', title: 'blocked', sessionIds: ['p1'] },
    ],
    uiSession: makeUiSession({ p1: PENDING_STATUS }),
  })
  try {
    assert.equal(sections[1].section.style.order, '0', 'a blocking session lifts its whole workspace')
    assert.equal(sections[0].section.style.order, '1')
    assert.equal(sections[1].section.style.marginTop, '0px')
    assert.equal(sections[0].section.style.marginTop, '4px')
    assert.equal(sections[1].rows.p1.style.order, '10', 'the row layer is untouched by the group boost')
    assert.equal(rows.f1.style.order, '10', 'each section still ranks its own rows')
  } finally {
    tearDown()
  }
})

test('dispose removes every fold row, badge and marker and restores the styles', async () => {
  const now = Date.now()
  const domOrder = ['c1', 'd1', 'd2', 'd3', 'd4']
  const titles = { c1: 'C one', d1: 'D one', d2: 'D two', d3: 'D three', d4: 'D four', p1: 'P one' }
  const status = makeUiSession({ p1: PENDING_STATUS })
  const { sections, rows, env, dispose, tearDown } = await mount({
    sections: [
      {
        title: 'wf',
        rows: domOrder.map((id) => ({ id, text: `${titles[id]}6分钟` })),
        button: 'expanded',
      },
      { title: 'wc', rows: [], collapsed: true, actions: true },
    ],
    sessions: [
      session('c1', 'C one', now - 30 * 60 * 1000),
      session('d1', 'D one', now - 4 * HOUR_MS),
      session('d2', 'D two', now - 5 * HOUR_MS),
      session('d3', 'D three', now - 6 * HOUR_MS),
      session('d4', 'D four', now - 7 * HOUR_MS),
      session('p1', 'P one', now - 30 * HOUR_MS),
    ],
    workspaces: [
      { workspaceId: 'wf', path: '/wf', title: 'wf', sessionIds: domOrder },
      { workspaceId: 'wc', path: '/wc', title: 'wc', sessionIds: ['p1'] },
    ],
    uiSession: status,
  })
  const [folded, collapsed] = sections
  const badgeHeader = headerOf(collapsed)
  try {
    assert.ok(markerChild(folded.section, 'fold-row') !== null, 'the fold row exists before dispose')
    assert.equal(rows.d4.style.display, 'none', 'and hides a row')
    assert.ok(markerChild(badgeHeader, 'attention-badge') !== null, 'and a badge exists')
    assert.equal(status.subscribeCount(), 1, 'the status observable is subscribed')
    assert.equal(env.listeners.pointerover.length, 1, 'the freeze listeners are installed')
    assert.equal(env.listeners.pointerout.length, 1)

    dispose()

    assert.equal(markerChild(folded.section, 'fold-row'), null, 'the fold row is removed')
    assert.equal(markerChild(badgeHeader, 'attention-badge'), null, 'the badge is removed')
    assert.equal(rows.d4.style.display, undefined, 'the folded row is restored')
    assert.equal(rows.d4.style.order, undefined, 'every written style is restored')
    assert.equal(folded.section.style.order, undefined, 'the section styles are restored')
    assert.equal(status.subscribeCount(), 0, 'the status subscription is dropped')
    assert.equal(env.listeners.pointerover.length, 0, 'the freeze listeners are removed')
    assert.equal(env.listeners.pointerout.length, 0)
    for (const child of folded.section.children) {
      assert.equal(child.dataset.dshUxPlus, undefined, 'no marker survives dispose')
    }
  } finally {
    tearDown()
  }
})

test('degraded mode (no uiSession): no fold row, no badge, no micro row', async () => {
  const now = Date.now()
  const { sections, section, rows, tearDown } = await mount({
    sections: [
      {
        title: 'w1',
        // The host renders this workspace's rows newest-first: c1, then the
        // dormant run, then the 25h-running session.
        rows: [
          { id: 'c1', text: 'C one6分钟' },
          { id: 'd1', text: 'D one6分钟' },
          { id: 'd2', text: 'D two6分钟' },
          { id: 'd3', text: 'D three6分钟' },
          { id: 'd4', text: 'D four6分钟' },
          { id: 'r1', text: 'R one6分钟' },
        ],
        actions: true,
      },
      { title: 'w2', rows: [{ id: 'q1', text: 'Q one6分钟' }] },
    ],
    sessions: [
      session('c1', 'C one', now - 30 * 60 * 1000),
      // A running session the status service is missing entirely.
      session('r1', 'R one', now - 25 * HOUR_MS, { running: true }),
      session('d1', 'D one', now - 4 * HOUR_MS),
      session('d2', 'D two', now - 5 * HOUR_MS),
      session('d3', 'D three', now - 6 * HOUR_MS),
      session('d4', 'D four', now - 7 * HOUR_MS),
      session('q1', 'Q one', now - 8 * HOUR_MS),
    ],
    workspaces: [
      { workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: ['c1', 'r1', 'd1', 'd2', 'd3', 'd4'] },
      { workspaceId: 'w2', path: '/w2', title: 'w2', sessionIds: ['q1'] },
    ],
  })
  try {
    assert.equal(rows.c1.style.order, '10', 'the row layer still ranks by recency')
    assert.equal(rows.r1.style.order, '15', 'a running row is ranked by recency, not pinned')
    assert.equal(rows.d4.style.order, '14')
    for (const id of ['c1', 'r1', 'd1', 'd2', 'd3', 'd4']) {
      const row = rows[id]
      assert.equal(rowEl(row).style.paddingBlock, undefined, `${id} keeps its host padding`)
      assert.equal(rowEl(row).style.fontSize, undefined)
      assert.equal(rowEl(row).style.opacity, undefined)
      assert.equal(row.style.display, undefined, `${id} is never folded away`)
    }
    assert.equal(markerChild(section, 'fold-row'), null, 'no fold row without a status snapshot')
    assert.equal(markerChild(headerOf({ section }), 'attention-badge'), null,
      'no badge without a status snapshot')
    assert.equal(sections[1].section.style.order, '1', 'the group layer still works')
  } finally {
    tearDown()
  }
})

test('with a viewport, moved rows FLIP from their old position', async () => {
  const rafs = []
  const now = Date.now()
  const uiSession = makeUiSession({})
  const { rows, env, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: [
        { id: 'b2', text: 'Beta two6分钟' },
        { id: 'b3', text: 'Beta three6分钟' },
        { id: 'b1', text: 'Beta one6分钟' },
      ],
    }],
    sessions: [
      session('b1', 'Beta one', now - 3 * HOUR_MS),
      session('b2', 'Beta two', now - 60 * 60 * 1000),
      session('b3', 'Beta three', now - 2 * HOUR_MS),
    ],
    workspaces: [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: ['b1', 'b2', 'b3'] }],
    uiSession,
    prepare: (fake) => {
      fake.window.requestAnimationFrame = (fn) => { rafs.push(fn); return rafs.length }
      fake.window.matchMedia = () => ({ matches: false })
    },
  })
  // One 40px lane per rank: the measured row div sits inside the flex item
  // that carries `order`, so its viewport top follows that item.
  for (const id of ['b1', 'b2', 'b3']) {
    const wrap = rows[id]
    rowEl(wrap).getBoundingClientRect = () => ({
      left: 0, top: (Number(wrap.style.order) - 10) * 40, right: 0, bottom: 0, width: 0, height: 0,
    })
  }
  try {
    assert.equal(rows.b2.style.order, '10', 'the freshest row leads before anything changes')
    uiSession.setStatuses({ b3: PENDING_STATUS })
    env.flushTimers()
    assert.equal(rows.b3.style.order, '10', 'the pending row takes the lead')
    assert.equal(rowEl(rows.b3).style.transform, 'translateY(40px)', 'it starts where it was, then animates')
    assert.equal(rowEl(rows.b3).style.transition, 'none')
    assert.equal(rowEl(rows.b2).style.transform, 'translateY(-40px)', 'the row it passes does the same')
    assert.equal(rafs.length, 2, 'one release frame per moved row (the idle row is skipped)')
    while (rafs.length > 0) rafs.shift()()
    assert.equal(rowEl(rows.b3).style.transform, '', 'and is released to its real position')
    assert.equal(rowEl(rows.b3).style.transition, 'transform 180ms ease')
    assert.equal(rowEl(rows.b2).style.transform, '')
    assert.equal(rowEl(rows.b1).style.transform, undefined, 'a row that did not move is untouched')
    // The next pass must not stack animations: lingering transforms are
    // cleared before the new snapshot is measured.
    uiSession.setStatuses({})
    env.flushTimers()
    assert.equal(rows.b2.style.order, '10', 'the lead moves back with the statuses gone')
    assert.equal(rows.b1.style.order, '12')
    assert.equal(rafs.length, 2, 'the reverse move is animated too')
    while (rafs.length > 0) rafs.shift()()
    assert.equal(rowEl(rows.b2).style.transform, '')
  } finally {
    tearDown()
  }
})

test('a pass is deferred while the pointer is inside the tree', async () => {
  const now = Date.now()
  const uiSession = makeUiSession({})
  const { rows, env, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: [
        { id: 'b2', text: 'Beta two6分钟' },
        { id: 'b3', text: 'Beta three6分钟' },
        { id: 'b1', text: 'Beta one6分钟' },
      ],
    }],
    sessions: [
      session('b2', 'Beta two', now - 60 * 60 * 1000),
      session('b3', 'Beta three', now - 2 * HOUR_MS),
      session('b1', 'Beta one', now - 3 * HOUR_MS),
    ],
    workspaces: [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: ['b1', 'b2', 'b3'] }],
    uiSession,
  })
  try {
    assert.equal(rows.b2.style.order, '10', 'the freshest row leads')
    assert.equal(rows.b3.style.order, '11')
    // The pointer enters the tree: moving rows under the cursor is exactly
    // what the anti-churn freeze exists for. The pass is deferred, not lost.
    env.listeners.pointerover[0]({
      target: { closest: (sel) => (sel === '[role="tree"]' ? 'tree' : null) },
    })
    uiSession.setStatuses({ b3: PENDING_STATUS })
    env.flushTimers()
    assert.equal(rows.b3.style.order, '11', 'a frozen pass writes nothing')
    assert.equal(rows.b2.style.order, '10')
    // Leaving the tree releases the deferred pass on the next schedule.
    env.listeners.pointerout[0]({
      target: { closest: () => null },
      relatedTarget: { closest: () => null },
    })
    env.flushTimers()
    assert.equal(rows.b3.style.order, '10', 'the deferred pass then runs')
    assert.equal(rows.b2.style.order, '11')
  } finally {
    tearDown()
  }
})

test('surplus dormant rows fold into one summary row that reveals them again', async () => {
  const now = Date.now()
  const uiSession = makeUiSession({})
  const titles = {
    c1: 'C one', d1: 'D one', d2: 'D two', d3: 'D three', d4: 'D four', d5: 'D five',
  }
  const domOrder = ['c1', 'd1', 'd2', 'd3', 'd4', 'd5']
  const { rows, section, button, env, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: domOrder.map((id) => rowSpec(id, titles[id])),
      button: 'expanded',
    }],
    sessions: [
      session('c1', titles.c1, now - 30 * 60 * 1000),
      session('d1', titles.d1, now - 4 * HOUR_MS),
      session('d2', titles.d2, now - 5 * HOUR_MS),
      session('d3', titles.d3, now - 6 * HOUR_MS),
      session('d4', titles.d4, now - 7 * HOUR_MS),
      session('d5', titles.d5, now - 8 * HOUR_MS),
    ],
    workspaces: [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: domOrder }],
    uiSession,
  })
  try {
    assert.equal(rows.c1.style.order, '10')
    assert.equal(rows.d1.style.order, '11', 'the first three dormant rows stay')
    assert.equal(rows.d3.style.order, '13')
    assert.equal(rows.d4.style.order, '14', 'a folded row is still ranked')
    assert.equal(rows.d4.style.display, 'none', 'the fourth dormant row folds')
    assert.equal(rows.d5.style.display, 'none')
    assert.equal(rows.d1.style.display, undefined, 'a kept dormant row is not hidden')
    const foldRow = markerChild(section, 'fold-row')
    assert.ok(foldRow !== null, 'the section gains one synthetic fold row')
    assert.equal(section.children[section.children.length - 1], foldRow,
      'it is the section last flex item')
    assert.equal(foldRow.style.order, '998', 'just before the host overflow button slot')
    assert.equal(button.style.order, '999', 'the host overflow button is still last')
    assert.equal(foldRow.children[0].textContent, '2 条更早会话 · 最近一次 7小时')
    // A section whose DOM gained the fold row still pairs and reorders: the
    // injected child is skipped by rowChildren, so the count gate keeps
    // matching (a fold row counted as a row would trace a bail-out here).
    env.window.localStorage.setItem('dsh.ux-plus.recency.debug', '1')
    const debug = []
    const previousDebug = console.debug
    console.debug = (...args) => { debug.push(args.join(' ')) }
    try {
      uiSession.setStatuses({ d3: PENDING_STATUS })
      env.flushTimers()
    } finally {
      console.debug = previousDebug
    }
    assert.deepEqual(debug, [], 'no count or pairing bail-out is traced')
    assert.equal(rows.d3.style.order, '10', 'the section re-ranked with the fold row in the DOM')
    assert.equal(rows.d4.style.display, undefined, 'a row that is no longer surplus is restored')
    assert.equal(rows.d5.style.display, 'none', 'only the surplus stays folded')
    assert.equal(markerChild(section, 'fold-row').children[0].textContent,
      '1 条更早会话 · 最近一次 8小时')
    // Clicking reveals the hidden rows for the rest of the page load.
    const sameRow = markerChild(section, 'fold-row')
    assert.equal(sameRow, foldRow, 'the fold row element is reused across passes')
    sameRow.children[0].click()
    env.flushTimers()
    assert.equal(rows.d4.style.display, undefined, 'revealing restores the hidden row')
    assert.equal(rows.d5.style.display, undefined)
    assert.equal(markerChild(section, 'fold-row'), null, 'nothing is hidden, so no fold row remains')
    assert.equal(rows.d4.style.order, '14', 'the revealed rows keep their rank')
    assert.equal(button.style.order, '999')
  } finally {
    tearDown()
  }
})
