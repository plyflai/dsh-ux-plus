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
  /** True when this element carries the class name (string class only). */
  el.hasClass = (name) => String(el.className || '').split(/\s+/).includes(name)
  /**
   * The density layer re-dresses a row's own text cells through
   * querySelectorAll (`.title`, `.time`), so the fixture answers exactly that
   * one selector — class names, descendants only, like the real DOM. Every
   * other selector stays the free `null` / `[]` above, so no other code path
   * can start finding elements a plain-object fixture cannot really model.
   */
  el.querySelectorAll = (selector) => {
    const name = String(selector).startsWith('.') ? String(selector).slice(1) : null
    if (name === null || name === '') return []
    const found = []
    const walk = (node) => {
      for (const child of node.children || []) {
        if (typeof child.hasClass === 'function' && child.hasClass(name)) found.push(child)
        walk(child)
      }
    }
    walk(el)
    return found
  }
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

/**
 * Append one more host row the way the host re-renders when its quota rises
 * (same wrapper/row shape buildTree uses). Fixture helper.
 * @returns {object} the wrapper element
 */
function appendHostRow(section, id, text) {
  const wrap = makeElement('span')
  const row = makeElement('div')
  row.setAttribute('role', 'treeitem')
  row.setAttribute('data-row-key', `session:${id}`)
  row.textContent = text
  wrap.textContent = text
  wrap.appendChild(row)
  wrap.querySelector = (sel) => (sel === '[data-row-key^="session:"]' ? row : null)
  section.appendChild(wrap)
  return wrap
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

// ---------------------------------------------------------------------------
// Zone layer (spec §1-§5): the Active/dormant partition, the row dots, the
// dormant bar and the Active-zone badge. The pure helpers are asserted
// directly; the DOM tests drive the real feature client through the fixture.
// ---------------------------------------------------------------------------

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

/**
 * The feature's status dot anywhere in a row. The host row nests it one level
 * down (inside the leading slot, ahead of the host's own dot), a bare fixture
 * row takes it as a direct child — both must be found, and found only ONCE.
 */
function dotIn(row) {
  for (const child of row.children) {
    if (child.dataset !== undefined && child.dataset.dshUxPlus === 'session-status-dot') return child
    for (const inner of child.children) {
      if (inner.dataset !== undefined && inner.dataset.dshUxPlus === 'session-status-dot') return inner
    }
  }
  return null
}

/** Every status dot in a row (a duplicate would mean an unstable pass). */
function dotsIn(row) {
  const found = []
  for (const child of row.children) {
    if (child.dataset !== undefined && child.dataset.dshUxPlus === 'session-status-dot') found.push(child)
    for (const inner of child.children) {
      if (inner.dataset !== undefined && inner.dataset.dshUxPlus === 'session-status-dot') found.push(inner)
    }
  }
  return found
}

test('zoneOf: the 24h boundary, a running session, and every status older than a day', async () => {
  const { zoneOf } = await import(
    new URL('features/workspace-recency-order/src/index.js', root).href
  )
  const now = 1_700_000_000_000
  assert.equal(zoneOf({ now, updatedAt: now - 23 * HOUR_MS - 59 * 60 * 1000 }), 'active',
    '23h59m of silence is still Active')
  assert.equal(zoneOf({ now, updatedAt: now - DAY_MS }), 'active', 'the boundary itself is Active')
  assert.equal(zoneOf({ now, updatedAt: now - DAY_MS - 60 * 1000 }), 'dormant', '24h01m is dormant')
  assert.equal(zoneOf({ now, updatedAt: now - 8 * DAY_MS }), 'dormant')
  // running is the one status that holds a row Active regardless of time.
  assert.equal(zoneOf({ now, updatedAt: now - 8 * DAY_MS, status: { running: true } }), 'active')
  assert.equal(zoneOf({
    now,
    updatedAt: now - 8 * DAY_MS,
    status: { running: false, completionUnread: true },
  }), 'dormant', 'an unread completion never holds a row Active past 24h')
  assert.equal(zoneOf({
    now,
    updatedAt: now - 8 * DAY_MS,
    status: { pendingInteraction: { key: 'approval:1' }, running: false },
  }), 'dormant', 'a stale blocking interaction no longer pins the row to the top')
  assert.equal(zoneOf({ now, updatedAt: undefined }), 'dormant')
})

test('statusOf: pendingInteraction outranks running outranks unread', async () => {
  const { statusOf } = await import(
    new URL('features/workspace-recency-order/src/index.js', root).href
  )
  assert.equal(statusOf({
    pendingInteraction: { key: 'k' }, running: true, completionUnread: true,
  }), 'waiting')
  assert.equal(statusOf({ running: true, completionUnread: true }), 'running')
  assert.equal(statusOf({ completionUnread: true }), 'unread')
  assert.equal(statusOf({ running: false, completionUnread: false }), 'none')
  assert.equal(statusOf({}), 'none')
  assert.equal(statusOf(undefined), 'none')
  assert.equal(statusOf(null), 'none')
})

test('the zone copy: bar text, dot labels and the badge tooltip (zh/en)', async () => {
  const { foldBarText, statusLabel, badgeKinds, badgeTooltip } = await import(
    new URL('features/workspace-recency-order/src/index.js', root).href
  )
  assert.equal(foldBarText('zh-CN', 7), '7 条历史会话')
  assert.equal(foldBarText('en-US', 7), '7 earlier sessions')
  assert.equal(foldBarText('en', 0), '0 earlier sessions', 'a zero count is still a count')
  assert.equal(statusLabel('zh-CN', 'waiting'), '待回复')
  assert.equal(statusLabel('zh-CN', 'running'), '运行中')
  assert.equal(statusLabel('zh-CN', 'unread'), '未读')
  assert.equal(statusLabel('en-US', 'waiting'), 'waiting')
  assert.equal(statusLabel('en-US', 'running'), 'running')
  assert.equal(statusLabel('en-US', 'unread'), 'unread')
  assert.equal(statusLabel('en-US', 'none'), '', 'a dot that does not exist has no label')
  // Badge dots: at most three, always in the same reading order.
  assert.deepEqual(badgeKinds({ pending: 2, unread: 1, running: 1 }), ['waiting', 'unread', 'running'])
  assert.deepEqual(badgeKinds({ running: 3 }), ['running'])
  assert.deepEqual(badgeKinds({ pending: 0, unread: 0, running: 0 }), [])
  assert.deepEqual(badgeKinds({}), [])
  // The tooltip keeps the count text: hover and screen readers read one string.
  assert.equal(badgeTooltip('zh-CN', { pending: 2, unread: 1 }), '2 待回复 · 1 未读')
  assert.equal(badgeTooltip('en-US', { pending: 2, unread: 1 }), '2 waiting · 1 unread')
  assert.equal(badgeTooltip('zh-CN', { pending: 1, running: 2 }), '1 待回复 · 2 运行中')
  assert.equal(badgeTooltip('zh-CN', { unread: 2 }), '2 未读', 'zero parts are omitted')
  assert.equal(badgeTooltip('zh-CN', {}), '')
  assert.equal(badgeTooltip('zh-CN', undefined), '')
})

test('the Active block leads and wears one green band, the dormant block folds behind the bar', async () => {
  const now = Date.now()
  const sessions = [
    session('a1', 'Active one', now - 30 * 60 * 1000),
    session('a2', 'Active two', now - 10 * HOUR_MS),
    session('a3', 'Active three', now - 20 * HOUR_MS),
    session('d1', 'Dormant one', now - 25 * HOUR_MS),
    session('d2', 'Dormant two', now - 30 * HOUR_MS),
    session('d3', 'Dormant three', now - 8 * DAY_MS),
  ]
  const workspaces = [{
    workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: sessions.map((s) => s.id),
  }]
  const status = makeUiSession({})
  const { rows, section, env, tearDown } = await mount({
    sections: [{ title: 'w1', rows: sessions.map((s) => rowSpec(s.id, s.displayTitle)) }],
    sessions,
    workspaces,
    uiSession: status,
  })
  try {
    // Inside the Active zone: lastActive desc, so rank 10 is the freshest.
    assert.equal(rows.a1.style.order, '10')
    assert.equal(rows.a2.style.order, '11')
    assert.equal(rows.a3.style.order, '12')
    // One rank slot is left between the blocks for the bar (spec §4).
    const bar = markerChild(section, 'fold-bar')
    assert.ok(bar !== null, 'the whole dormant block folds behind the bar')
    assert.equal(bar.style.order, '13', 'the bar owns the rank between the blocks')
    assert.equal(rows.d1.style.order, '14')
    assert.equal(rows.d2.style.order, '15')
    assert.equal(rows.d3.style.order, '16')
    assert.equal(bar.children[0].children[1].textContent, '3 条历史会话')
    assert.equal(bar.children[0].getAttribute('aria-expanded'), 'false')
    // Hidden, but still in the DOM: the replay count and the pairing stay valid.
    assert.equal(rows.d1.style.display, 'none')
    assert.equal(rows.d2.style.display, 'none')
    assert.equal(rows.d3.style.display, 'none')
    assert.equal(rows.a1.style.display, undefined)
    // Density: ONE compact box for the whole list — the Active block is told
    // apart by its band, never by a taller row (user rule) — and the dormant
    // block differs only by its fade.
    assert.equal(rowEl(rows.a1).style.paddingBlock, '1px')
    assert.equal(rowEl(rows.a1).style.paddingInlineEnd, '6px')
    assert.equal(rowEl(rows.a1).style.boxSizing, 'border-box')
    // The leading pad is the host's `calc(8px + var(--dsh-workspace-indent))`
    // (Rows.module.css:8): no inline shorthand may flatten the tree indent.
    assert.equal(rowEl(rows.a1).style.paddingInline, undefined)
    assert.equal(rowEl(rows.a1).style.paddingInlineStart, undefined)
    assert.equal(rowEl(rows.a1).style.gap, '4px')
    assert.equal(rowEl(rows.a1).style.height, '26px')
    assert.equal(rowEl(rows.a2).style.height, '26px')
    assert.equal(rowEl(rows.a1).style.opacity, undefined)
    assert.equal(rowEl(rows.d1).style.opacity, '0.5')
    assert.equal(rowEl(rows.d1).style.paddingBlock, '1px', 'a dormant row wears the same compact box')
    assert.equal(rowEl(rows.d1).style.height, '26px')
    // One band behind the WHOLE block (user rule): a single positioned element
    // measured over the block, never a background per row — the host's own
    // hover/selected backgrounds paint on top of it.
    assert.equal(rowEl(rows.a1).getAttribute('data-dsh-ux-zone'), 'active')
    assert.equal(rowEl(rows.a2).getAttribute('data-dsh-ux-zone'), 'active')
    assert.equal(rowEl(rows.d1).getAttribute('data-dsh-ux-zone'), null, 'dormant rows carry no zone mark')
    assert.equal(rowEl(rows.a1).style.background, undefined, 'no inline background on a row')
    const band = markerChild(section, 'zone-band')
    assert.ok(band !== null, 'the Active block wears one shared band')
    // Paint order: the band is z-index:-1, which needs the section to be a
    // stacking context (isolation) or it sinks behind the panel background.
    assert.equal(section.style.isolation, 'isolate', 'the section isolates so the band paints')
    // Geometry comes from client rects, so no offsetParent claim is needed.
    assert.equal(section.style.position, undefined, 'rects make position:relative unnecessary')
    // Geometry: the band spans first row top → last row bottom (rects are
    // layout truth; a re-pass re-measures them).
    rows.a1.getBoundingClientRect = () => ({ top: 100, bottom: 126, height: 26 })
    rows.a2.getBoundingClientRect = () => ({ top: 126, bottom: 152, height: 26 })
    rows.a3.getBoundingClientRect = () => ({ top: 152, bottom: 178, height: 26 })
    section.getBoundingClientRect = () => ({ top: 100, bottom: 400, height: 300 })
    status.setStatuses({})
    env.flushTimers()
    assert.equal(band.style.top, '0px')
    assert.equal(band.style.height, '78px', 'the band covers all three compact Active rows')
    // The band and the selected-green override live in the style tag, keyed on
    // attributes — the host's gray selected class (0,1,0) loses to (0,2,0).
    const styleText = env.document.head.children
      .map((el) => (el.textContent === undefined ? '' : el.textContent)).join('\n')
    assert.ok(styleText.includes('[data-dsh-ux-plus="zone-band"]'), 'the band paints through the style tag')
    assert.ok(styleText.includes('[data-dsh-ux-zone="active"][aria-selected="true"]'),
      'a selected row inside the band turns green, not gray')
  } finally {
    tearDown()
  }
})

test('row dots: waiting breathes orange, running is a blue ring, unread is a green dot', async () => {
  const now = Date.now()
  const sessions = [
    session('p1', 'Pending one', now - 30 * 60 * 1000),
    session('r1', 'Running one', now - 40 * 60 * 1000),
    session('u1', 'Unread one', now - 50 * 60 * 1000),
    session('c1', 'Calm one', now - 60 * 60 * 1000),
  ]
  const workspaces = [{
    workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: sessions.map((s) => s.id),
  }]
  const status = makeUiSession({ p1: PENDING_STATUS, r1: RUNNING_STATUS, u1: UNREAD_STATUS })
  const { rows, env, tearDown } = await mount({
    sections: [{ title: 'w1', rows: sessions.map((s) => rowSpec(s.id, s.displayTitle)) }],
    sessions,
    workspaces,
    uiSession: status,
  })
  try {
    const waiting = dotIn(rowEl(rows.p1))
    assert.ok(waiting !== null, 'the waiting row wears its dot')
    assert.equal(waiting.dataset.dshUxKind, 'waiting')
    assert.equal(waiting.style.width, '7px')
    assert.equal(waiting.style.height, '7px')
    assert.equal(waiting.style.borderRadius, '50%')
    assert.equal(waiting.style.backgroundColor, '#f59e0b')
    assert.equal(waiting.getAttribute('title'), '待回复')
    assert.equal(waiting.getAttribute('aria-label'), '待回复')
    assert.equal(waiting.getAttribute('role'), 'img')
    const running = dotIn(rowEl(rows.r1))
    assert.equal(running.dataset.dshUxKind, 'running')
    assert.equal(running.style.backgroundColor, '', 'a ring has no fill')
    assert.equal(running.style.border, '2px solid #3b82f6')
    assert.equal(running.style.borderTopColor, 'transparent', 'the gap is what makes it read as spinning')
    assert.equal(running.getAttribute('aria-label'), '运行中')
    const unread = dotIn(rowEl(rows.u1))
    assert.equal(unread.dataset.dshUxKind, 'unread')
    assert.equal(unread.style.backgroundColor, '#22c55e')
    assert.equal(unread.getAttribute('title'), '未读')
    assert.equal(dotIn(rowEl(rows.c1)), null, 'no status at all, no dot')
    // The host's own dot is hidden, never doubled, and handed back on dispose.
    const slot = rowEl(rows.p1)
    const host = env.document.createElement('span')
    host.setAttribute('data-state', 'warning')
    slot.appendChild(host)
    status.setStatuses({ p1: PENDING_STATUS, r1: RUNNING_STATUS, u1: UNREAD_STATUS })
    env.flushTimers()
    assert.equal(host.style.display, 'none', 'the host dot steps aside while ours is up')
    assert.equal(dotsIn(slot).length, 1, 'a second pass repaints the dot, it never stacks one')
    // A waiting row that starts running swaps the dot in place, and a row that
    // loses its status gets the host's own dot back.
    status.setStatuses({ p1: RUNNING_STATUS, r1: RUNNING_STATUS, u1: UNREAD_STATUS })
    env.flushTimers()
    assert.equal(dotsIn(slot).length, 1)
    assert.equal(dotIn(slot).dataset.dshUxKind, 'running')
    status.setStatuses({ r1: RUNNING_STATUS, u1: UNREAD_STATUS })
    env.flushTimers()
    assert.equal(dotIn(slot), null, 'the dot is taken back out')
    assert.equal(host.style.display, undefined, 'and the host dot shows again')
    assert.equal(host.getAttribute('data-state'), 'warning', 'the host element itself is untouched')
  } finally {
    tearDown()
  }
})

test('the header badge holds Active-zone dots only: waiting, unread, running', async () => {
  const now = Date.now()
  // A collapsed workspace whose only visible slice is five rows: the badge
  // speaks for the Active-zone attention the DOM cannot show, and says nothing
  // about a dormant member's status, however loud it is.
  const sessions = [
    session('a1', 'Active one', now - 30 * 60 * 1000),
    session('a2', 'Active two', now - 40 * 60 * 1000),
    session('o1', 'O one', now - 60 * 60 * 1000),
    session('o2', 'O two', now - 2 * HOUR_MS),
    session('o3', 'O three', now - 3 * HOUR_MS),
    session('o4', 'O four', now - 4 * HOUR_MS),
    session('o5', 'O five', now - 5 * HOUR_MS),
    session('d1', 'Dormant one', now - 30 * HOUR_MS),
  ]
  const workspaces = [{
    workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: sessions.map((s) => s.id),
  }]
  const collapsed = await mount({
    sections: [{
      title: 'w1',
      collapsed: true,
      actions: true,
      rows: ['a1', 'a2', 'o1', 'o2', 'o3'].map((id) => rowSpec(id, sessions.find((s) => s.id === id).displayTitle)),
    }],
    sessions,
    workspaces,
    uiSession: makeUiSession({ a1: PENDING_STATUS, a2: UNREAD_STATUS, d1: PENDING_STATUS }),
  })
  try {
    const badge = markerChild(headerOf(collapsed), 'attention-badge')
    assert.ok(badge !== null, 'the collapsed workspace carries the attention it hides')
    assert.equal(badge.getAttribute('title'), '1 待回复 · 1 未读',
      'the dormant member counts for nothing: only the Active zone floats up')
    assert.equal(badge.getAttribute('aria-label'), '1 待回复 · 1 未读')
    assert.equal(badge.getAttribute('role'), 'img')
    assert.equal(badge.children.length, 2, 'one dot per kind, at most three')
    assert.deepEqual(badge.children.map((dot) => dot.dataset.dshUxKind), ['waiting', 'unread'])
    assert.equal(badge.children[0].style.backgroundColor, '#f59e0b')
    assert.equal(badge.children[1].style.backgroundColor, '#22c55e')
    const header = headerOf(collapsed)
    const actions = actionsOf(header)
    assert.ok(actions !== null, 'the fixture header carries its actions span')
    assert.equal(header.children.indexOf(badge), header.children.indexOf(actions) - 1,
      'the badge sits immediately before the actions, like the age label')
  } finally {
    collapsed.tearDown()
  }

  // Expanded but truncated by the host quota: the badge counts the run that
  // sits beyond the rendered slice, and only while a host overflow button
  // exists (an expanded workspace with everything visible needs no badge).
  const running = session('r1', 'Running one', now - 6 * HOUR_MS)
  const truncated = await mount({
    sections: [{
      title: 'w1',
      actions: true,
      rows: ['o1', 'o2', 'o3', 'o4', 'o5'].map((id) => rowSpec(id, `O ${['one', 'two', 'three', 'four', 'five'][Number(id[1]) - 1]}`)),
      button: 'expanded',
    }],
    sessions: [...sessions, running],
    workspaces: [{
      workspaceId: 'w1', path: '/w1', title: 'w1',
      sessionIds: [...sessions.map((s) => s.id), 'r1'],
    }],
    uiSession: makeUiSession({ r1: RUNNING_STATUS }),
  })
  try {
    const badge = markerChild(headerOf(truncated), 'attention-badge')
    assert.ok(badge !== null, 'the truncated Active-zone run is what the header speaks for')
    assert.equal(badge.getAttribute('title'), '1 运行中')
    assert.equal(running.id, 'r1')
    assert.equal(truncated.rows.r1, undefined, 'the running row is genuinely absent from the DOM')
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
    // The row layer is untouched by the group boost: each section still ranks
    // its own rows. That pending member is 30 hours old, so it now waits in the
    // dormant zone behind its bar — the bar takes rank 10 and the row follows it
    // — while the group layer above still treats it as blocking attention.
    assert.equal(markerChild(sections[1].section, 'fold-bar').style.order, '10',
      'the dormant bar takes the rank between the blocks')
    assert.equal(sections[1].rows.p1.style.order, '11', 'the row layer is untouched by the group boost')
    assert.equal(sections[1].rows.p1.style.display, 'none', 'a dormant pending row is folded')
    assert.equal(rows.f1.style.order, '10', 'each section still ranks its own rows')
  } finally {
    tearDown()
  }
})

test('dispose takes back every dot, the bar and the zone marks and restores the host rows', async () => {
  const now = Date.now()
  const sessions = [
    session('a1', 'Active one', now - 30 * 60 * 1000),
    session('a2', 'Active two', now - 2 * HOUR_MS),
    session('d1', 'Dormant one', now - 25 * HOUR_MS),
    session('d2', 'Dormant two', now - 26 * HOUR_MS),
  ]
  const workspaces = [{
    workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: sessions.map((s) => s.id),
  }]
  const status = makeUiSession({ a1: PENDING_STATUS })
  const { rows, section, env, dispose, tearDown } = await mount({
    sections: [{ title: 'w1', rows: sessions.map((s) => rowSpec(s.id, s.displayTitle)) }],
    sessions,
    workspaces,
    uiSession: status,
  })
  try {
    assert.ok(markerChild(section, 'fold-bar') !== null, 'the zone layer is up')
    assert.ok(dotIn(rowEl(rows.a1)) !== null)
    assert.equal(rowEl(rows.a1).getAttribute('data-dsh-ux-zone'), 'active')
    assert.equal(rows.d1.style.display, 'none')
    const host = env.document.createElement('span')
    host.setAttribute('data-state', 'warning')
    rowEl(rows.a2).appendChild(host)
    status.setStatuses({ a1: PENDING_STATUS, a2: UNREAD_STATUS })
    env.flushTimers()
    assert.equal(host.style.display, 'none', 'the host dot was hidden by a pass')
    dispose()
    assert.equal(markerChild(section, 'fold-bar'), null, 'the bar is gone')
    assert.equal(dotIn(rowEl(rows.a1)), null, 'the dot is gone')
    assert.equal(rowEl(rows.a1).getAttribute('data-dsh-ux-zone'), null)
    assert.equal(rowEl(rows.a1).getAttribute('data-dsh-ux-zone-edge'), null)
    assert.equal(rowEl(rows.a1).style.height, undefined)
    assert.equal(rowEl(rows.a1).style.boxSizing, undefined)
    assert.equal(rowEl(rows.a1).style.paddingBlock, undefined)
    assert.equal(rowEl(rows.d1).style.opacity, undefined)
    assert.equal(rows.d1.style.display, undefined, 'the dormant rows come back into flow')
    assert.equal(rows.d1.style.order, undefined)
    assert.equal(section.style.order, undefined)
    assert.equal(host.style.display, undefined, 'the host dot shows again')
    assert.equal(host.getAttribute('data-state'), 'warning')
    assert.equal(status.subscribeCount(), 0, 'the status subscription is released')
    assert.equal((env.listeners.pointerover || []).length, 0)
    assert.equal((env.listeners.pointerout || []).length, 0)
  } finally {
    tearDown()
  }
})

test('degraded mode: no uiSession means pure recency and no zone layer at all', async () => {
  const now = Date.now()
  const sessions = [
    session('b1', 'Beta one', now - 30 * HOUR_MS),
    session('b2', 'Beta two', now - 2 * HOUR_MS),
    session('b3', 'Beta three', now - 20 * HOUR_MS),
  ]
  const workspaces = [{
    workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: ['b1', 'b2', 'b3'],
  }]
  const { rows, section, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: [rowSpec('b2', 'Beta two'), rowSpec('b3', 'Beta three'), rowSpec('b1', 'Beta one')],
    }],
    sessions,
    workspaces,
  })
  try {
    assert.equal(rows.b2.style.order, '10', 'the freshest leads')
    assert.equal(rows.b3.style.order, '11')
    assert.equal(rows.b1.style.order, '12', 'without a status source the old row is ranked, not zoned')
    assert.equal(rows.b1.style.display, undefined, 'nothing folds in degraded mode')
    assert.equal(markerChild(section, 'fold-bar'), null, 'no bar')
    assert.equal(rowEl(rows.b1).getAttribute('data-dsh-ux-zone'), null, 'no band')
    assert.equal(rowEl(rows.b1).style.opacity, undefined)
    assert.equal(rowEl(rows.b1).style.height, undefined)
    assert.equal(dotIn(rowEl(rows.b1)), null, 'no dots')
    assert.equal(markerChild(headerOf({ section }), 'attention-badge'), null, 'no badge without a status snapshot')
  } finally {
    tearDown()
  }
})

test('with a viewport, a row entering the Active zone FLIPs up into the block', async () => {
  const rafs = []
  const now = Date.now()
  const uiSession = makeUiSession({})
  // The DOM is already in the host's own recency order, and nothing below
  // changes that order: the row moves because a dormant session starts running
  // — a ZONE move, not a host reorder, which is the move the band exists for.
  const sessions = [
    session('b2', 'Beta two', now - 60 * 60 * 1000),
    session('b3', 'Beta three', now - 3 * HOUR_MS),
    session('b1', 'Beta one', now - 25 * HOUR_MS),
  ]
  const { rows, section, env, dispose, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: [rowSpec('b2', 'Beta two'), rowSpec('b3', 'Beta three'), rowSpec('b1', 'Beta one')],
    }],
    sessions,
    workspaces: [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: ['b2', 'b3', 'b1'] }],
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
    assert.equal(rows.b3.style.order, '11')
    assert.equal(markerChild(section, 'fold-bar').style.order, '12', 'the bar holds the rank between the blocks')
    assert.equal(rows.b1.style.order, '13', 'the dormant row waits behind it')
    // Reveal the dormant block first: a display:none row has no position to
    // animate from, and this test is about a move between two visible lanes.
    markerChild(section, 'fold-bar').children[0].click()
    env.flushTimers()
    assert.equal(rows.b1.style.display, undefined, 'the dormant row is on screen again')
    rafs.length = 0
    // Starting to run is Active whatever the last activity was (spec §1), so the
    // row climbs one lane into the block without the host re-rendering.
    uiSession.setStatuses({ b1: RUNNING_STATUS })
    env.flushTimers()
    assert.equal(rows.b1.style.order, '12', 'the running row joins the Active block')
    assert.equal(rowEl(rows.b1).style.transform, 'translateY(40px)', 'it starts where it was, then animates')
    assert.equal(rowEl(rows.b1).style.transition, 'none')
    assert.equal(rafs.length, 1, 'only the row that moved gets a release frame')
    while (rafs.length > 0) rafs.shift()()
    assert.equal(rowEl(rows.b1).style.transform, '', 'and is released to its real position')
    assert.equal(rowEl(rows.b1).style.transition, 'transform 180ms ease')
    assert.equal(rowEl(rows.b2).style.transform, undefined, 'a row that did not move is untouched')
    // The release frame's inline `transition` is the one FLIP write that lives
    // outside the style cache (animateFlip writes element.style directly), so
    // it is the one a pass cannot take back. A following pass that animates
    // nothing empties `flips`, and dispose must still hand the row back exactly
    // as the host left it — no orphaned transition, no orphaned transform.
    env.flushTimers()
    dispose()
    assert.equal(rowEl(rows.b1).style.transition, '', 'the release frame leaves no inline transition')
    assert.equal(rowEl(rows.b1).style.transform, '', 'and no inline transform')
    assert.equal(rowEl(rows.b1).getAttribute('style'), null, 'the host row is handed back untouched')
  } finally {
    tearDown()
  }
})

test('a pass that beats the release frame takes the FLIP over: no orphaned transition', async () => {
  // Measured in Chromium: `setTimeout(0)` is immediate but the next frame is up
  // to ~16ms away, so a timer-driven pass routinely runs between the start of a
  // FLIP and its release frame. That pass snaps the row to its resting place
  // and drops it from `flips`; the release frame must then NOT write its inline
  // `transition`, or the property is left with no owner — invisible to later
  // passes (which walk `flips`) and to dispose (which walks `flips` too).
  const rafs = []
  const now = Date.now()
  const uiSession = makeUiSession({})
  const sessions = [
    session('b2', 'Beta two', now - 60 * 60 * 1000),
    session('b3', 'Beta three', now - 3 * HOUR_MS),
    session('b1', 'Beta one', now - 25 * HOUR_MS),
  ]
  const { rows, section, env, dispose, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: [rowSpec('b2', 'Beta two'), rowSpec('b3', 'Beta three'), rowSpec('b1', 'Beta one')],
    }],
    sessions,
    workspaces: [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: ['b2', 'b3', 'b1'] }],
    uiSession,
    prepare: (fake) => {
      fake.window.requestAnimationFrame = (fn) => { rafs.push(fn); return rafs.length }
      fake.window.matchMedia = () => ({ matches: false })
    },
  })
  for (const id of ['b1', 'b2', 'b3']) {
    const wrap = rows[id]
    rowEl(wrap).getBoundingClientRect = () => ({
      left: 0, top: (Number(wrap.style.order) - 10) * 40, right: 0, bottom: 0, width: 0, height: 0,
    })
  }
  try {
    markerChild(section, 'fold-bar').children[0].click()
    env.flushTimers()
    assert.equal(rows.b1.style.display, undefined, 'the dormant row is on screen')
    rafs.length = 0
    uiSession.setStatuses({ b1: RUNNING_STATUS })
    env.flushTimers()
    assert.equal(rowEl(rows.b1).style.transition, 'none', 'the animation has started')
    assert.equal(rafs.length, 1, 'and its release frame is still pending')
    // The pass that beats the frame: another store notification re-runs the
    // pass, nothing is left to move, so the row is handed straight back to its
    // resting state and leaves `flips`.
    uiSession.setStatuses({ b1: RUNNING_STATUS, b2: UNREAD_STATUS })
    env.flushTimers()
    assert.equal(rowEl(rows.b1).style.transform, '', 'the row rests where the pass put it')
    assert.equal(rafs.length, 1, 'the release frame is still pending, now unowned')
    while (rafs.length > 0) rafs.shift()()
    assert.equal(rowEl(rows.b1).style.transition, '', 'the unowned release frame writes nothing')
    dispose()
    assert.equal(rowEl(rows.b1).getAttribute('style'), null, 'the host row is handed back untouched')
  } finally {
    tearDown()
  }
})

test('a pass is deferred while the pointer is inside the tree', async () => {
  const now = Date.now()
  const uiSession = makeUiSession({})
  const sessions = [
    session('b2', 'Beta two', now - 60 * 60 * 1000),
    session('b3', 'Beta three', now - 3 * HOUR_MS),
    session('b1', 'Beta one', now - 25 * HOUR_MS),
  ]
  const { rows, section, env, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: [rowSpec('b2', 'Beta two'), rowSpec('b3', 'Beta three'), rowSpec('b1', 'Beta one')],
    }],
    sessions,
    workspaces: [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: ['b2', 'b3', 'b1'] }],
    uiSession,
  })
  try {
    assert.equal(rows.b2.style.order, '10', 'the freshest row leads')
    assert.equal(rows.b3.style.order, '11')
    assert.equal(rows.b1.style.order, '13', 'the dormant row waits behind the bar')
    // The pointer enters the tree: moving rows under the cursor is exactly what
    // the anti-churn freeze exists for. The pass is deferred, not lost.
    env.listeners.pointerover[0]({
      target: { closest: (sel) => (sel === '[role="tree"]' ? 'tree' : null) },
    })
    uiSession.setStatuses({ b1: RUNNING_STATUS })
    env.flushTimers()
    assert.equal(rows.b1.style.order, '13', 'a frozen pass writes nothing')
    assert.equal(rows.b1.style.display, 'none', 'and the zone move waits with it')
    assert.equal(rows.b2.style.order, '10')
    // Leaving the tree releases the deferred pass on the next schedule.
    env.listeners.pointerout[0]({
      target: { closest: () => null },
      relatedTarget: { closest: () => null },
    })
    env.flushTimers()
    assert.equal(rows.b1.style.order, '12', 'the deferred pass then runs')
    assert.equal(rows.b1.style.display, undefined, 'the row joins the Active block')
    assert.equal(markerChild(section, 'fold-bar'), null, 'and the bar retires: nothing is left to fold')
  } finally {
    tearDown()
  }
})

test('a view-mode change pierces the freeze and restyles at once', async () => {
  const now = Date.now()
  const uiSession = makeUiSession({})
  const sessions = [
    session('b2', 'Beta two', now - 60 * 60 * 1000),
    session('b3', 'Beta three', now - 3 * HOUR_MS),
    session('b1', 'Beta one', now - 25 * HOUR_MS),
  ]
  const { rows, section, env, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: [rowSpec('b2', 'Beta two'), rowSpec('b3', 'Beta three'), rowSpec('b1', 'Beta one')],
    }],
    sessions,
    workspaces: [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: ['b2', 'b3', 'b1'] }],
    uiSession,
    storage: {
      'dsh.workspace.view.v5': JSON.stringify({ groupBy: 'workspace', orderBy: 'updated', archivedFilter: 'default' }),
    },
  })
  try {
    assert.equal(rows.b1.style.order, '13', 'the dormant row starts behind the bar')
    // The pointer is inside the tree when the user picks a different 分组方式:
    // the host's menu closes right over the list, so the pointer sits on a row
    // at the exact moment the view changes. This is the reported shape — native
    // layout first, our restyle only once the pointer happens to leave.
    env.listeners.pointerover[0]({
      target: { closest: (sel) => (sel === '[role="tree"]' ? 'tree' : null) },
    })
    env.window.localStorage.setItem('dsh.workspace.view.v5', JSON.stringify({
      groupBy: 'workspace-tree', orderBy: 'updated', archivedFilter: 'default',
    }))
    uiSession.setStatuses({ b1: RUNNING_STATUS })
    env.flushTimers()
    assert.equal(rows.b1.style.order, '12', 'the pass ran through the freeze')
    assert.equal(rows.b1.style.display, undefined, 'the row joins the Active block without waiting for the pointer')
    assert.equal(markerChild(section, 'fold-bar'), null, 'and the bar retires in the same pass')
  } finally {
    tearDown()
  }
})

test('a deferred pass retries on its own when no signal ever comes', async () => {
  const now = Date.now()
  const uiSession = makeUiSession({})
  const sessions = [
    session('b2', 'Beta two', now - 60 * 60 * 1000),
    session('b3', 'Beta three', now - 3 * HOUR_MS),
    session('b1', 'Beta one', now - 25 * HOUR_MS),
  ]
  const { rows, env, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: [rowSpec('b2', 'Beta two'), rowSpec('b3', 'Beta three'), rowSpec('b1', 'Beta one')],
    }],
    sessions,
    workspaces: [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: ['b2', 'b3', 'b1'] }],
    uiSession,
  })
  try {
    // A row menu open inside the tree freezes every pass.
    rows.b1.className = 'menuOpen'
    uiSession.setStatuses({ b1: RUNNING_STATUS })
    env.flushTimers()
    assert.equal(rows.b1.style.order, '13', 'a pass defers while a row menu is open')
    // The host closes the menu by dropping the class: no childList mutation (the
    // observer watches childList only), no store traffic, no pointer event. The
    // bounded retry is now the only thing that can recover the deferred pass.
    rows.b1.className = ''
    env.flushTimers()
    env.flushTimers()
    assert.equal(rows.b1.style.order, '12', 'the retry re-ran the deferred pass')
    assert.equal(rows.b1.style.display, undefined, 'and the zone move landed with it')
  } finally {
    tearDown()
  }
})

test('the bar folds the whole dormant block and reveals it again with its dots intact', async () => {
  const now = Date.now()
  const sessions = [
    session('a1', 'Active one', now - 30 * 60 * 1000),
    session('a2', 'Active two', now - 2 * HOUR_MS),
    session('d1', 'Dormant one', now - 25 * HOUR_MS),
    session('d2', 'Dormant two', now - 30 * HOUR_MS),
    session('d3', 'Dormant three', now - 40 * HOUR_MS),
  ]
  const workspaces = [{
    workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: sessions.map((s) => s.id),
  }]
  const { rows, section, env, tearDown } = await mount({
    sections: [{ title: 'w1', rows: sessions.map((s) => rowSpec(s.id, s.displayTitle)) }],
    sessions,
    workspaces,
    uiSession: makeUiSession({ d2: PENDING_STATUS, d3: UNREAD_STATUS }),
  })
  try {
    const bar = markerChild(section, 'fold-bar')
    assert.ok(bar !== null, 'the dormant block is folded away')
    assert.equal(bar.children[0].children[1].textContent, '3 条历史会话', 'the whole zone, no quota')
    assert.equal(rows.d1.style.display, 'none')
    assert.equal(rows.d2.style.display, 'none')
    assert.equal(rows.d3.style.display, 'none')
    assert.equal(rowEl(rows.d2).style.opacity, '0.5', 'hidden, but already faded for its return')
    bar.children[0].click()
    env.flushTimers()
    assert.equal(rows.d1.style.display, undefined, 'the revealed block is back in flow')
    assert.equal(rows.d2.style.display, undefined)
    assert.equal(rows.d3.style.display, undefined)
    assert.equal(rowEl(rows.d2).style.opacity, '0.5', 'and stays visually secondary')
    assert.equal(rowEl(rows.d2).getAttribute('data-dsh-ux-zone'), null, 'revealed is not Active')
    assert.equal(dotIn(rowEl(rows.d2)).dataset.dshUxKind, 'waiting', 'a revealed row keeps its own dot')
    assert.equal(dotIn(rowEl(rows.d3)).dataset.dshUxKind, 'unread')
    assert.equal(rows.d1.style.order, '13', 'the revealed rows stay below the Active block')
    assert.equal(rows.d2.style.order, '14')
    // Issue 4: the bar does NOT retire on reveal — it stays as the collapse
    // control, so one control owns one state and nothing is stranded open.
    const bar2 = markerChild(section, 'fold-bar')
    assert.ok(bar2 !== null, 'the bar stays to fold the block back')
    assert.equal(bar2.children[0].children[1].textContent, '收起历史会话')
    assert.equal(bar2.children[0].getAttribute('aria-expanded'), 'true')
    assert.equal(bar2.style.order, '12', 'the collapse control sits between the blocks')
    bar2.children[0].click()
    env.flushTimers()
    assert.equal(rows.d1.style.display, 'none', 'a second click folds the block back')
    assert.equal(rows.d3.style.display, 'none')
    assert.equal(markerChild(section, 'fold-bar').children[0].children[1].textContent, '3 条历史会话')
  } finally {
    tearDown()
  }
})

test('the bar opens on a click even while the pointer is inside the tree', async () => {
  // Reported live: with the pointer parked over the sidebar, 【N 条历史会话】吞掉了
  // 自己的点击 — the pointer is inevitably inside the tree when a real click lands
  // (pointerover fires first), so the reveal must never wait for pointerout.
  const now = Date.now()
  const sessions = [
    session('a1', 'Active one', now - 30 * 60 * 1000),
    session('d1', 'Dormant one', now - 25 * HOUR_MS),
    session('d2', 'Dormant two', now - 30 * HOUR_MS),
  ]
  const { rows, section, env, tearDown } = await mount({
    sections: [{ title: 'w1', rows: sessions.map((s) => rowSpec(s.id, s.displayTitle)) }],
    sessions,
    workspaces: [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: sessions.map((s) => s.id) }],
    uiSession: makeUiSession({}),
  })
  try {
    assert.equal(rows.d1.style.display, 'none', 'the dormant block starts folded')
    env.listeners.pointerover[0]({
      target: { closest: (sel) => (sel === '[role="tree"]' ? 'tree' : null) },
    })
    const bar = markerChild(section, 'fold-bar')
    assert.ok(bar !== null, 'the fold bar is there to click')
    bar.children[0].click()
    env.flushTimers()
    assert.equal(rows.d1.style.display, undefined, 'the click reveals the block at once')
    assert.equal(rows.d2.style.display, undefined)
    assert.equal(markerChild(section, 'fold-bar').children[0].children[1].textContent, '收起历史会话')
    // The same click a moment later closes it again: the pierce is not a one-way
    // door, and the pass that answers it must actually run the fold both ways.
    markerChild(section, 'fold-bar').children[0].click()
    env.flushTimers()
    assert.equal(rows.d1.style.display, 'none', 'a second frozen click folds the block back')
    assert.equal(rows.d2.style.display, 'none')
    assert.equal(markerChild(section, 'fold-bar').children[0].children[1].textContent, '2 条历史会话')
  } finally {
    tearDown()
  }
})

test('a frozen click on the bar still lets the proxied host expansion through', async () => {
  // The host's own truncation is React state: the click only proxies it, and our
  // layer converges on a LATER pass. With the pointer parked inside the tree that
  // pass used to be frozen too, so the block stayed shut even though the host had
  // been told to open it.
  const now = Date.now()
  const sessions = [
    session('a1', 'Active one', now - 30 * 60 * 1000),
    session('d1', 'Dormant one', now - 25 * HOUR_MS),
  ]
  const status = makeUiSession({})
  const { rows, section, button, env, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: sessions.map((s) => rowSpec(s.id, s.displayTitle)),
      button: 'collapsed',
    }],
    sessions,
    workspaces: [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: ['a1', 'd1'] }],
    uiSession: status,
  })
  try {
    button.textContent = '展开其余 2 个会话'
    // The stub host: pressing it is what React's onClick would do — flip its own
    // aria-expanded, and send NO store signal at all.
    button.addEventListener('click', () => button.setAttribute('aria-expanded', 'true'))
    env.listeners.pointerover[0]({
      target: { closest: (sel) => (sel === '[role="tree"]' ? 'tree' : null) },
    })
    const bar = markerChild(section, 'fold-bar')
    bar.children[0].click()
    // The click's own pass, then the bounded follow-up that picks the host's new
    // state up. THREE flushes: the timer body, the armed retry, and the pass that
    // retry schedules.
    env.flushTimers()
    env.flushTimers()
    env.flushTimers()
    assert.equal(rows.d1.style.display, undefined, 'the proxied host expansion lands while frozen')
    assert.equal(markerChild(section, 'fold-bar'), null, 'our bar retires: the host control is the reveal truth')
    assert.equal(button.style.display, undefined, 'and the host button comes back')
  } finally {
    tearDown()
  }
})

test('the bar absorbs the host overflow count and hides its button', async () => {
  const now = Date.now()
  const sessions = [
    session('a1', 'Active one', now - 30 * 60 * 1000),
    session('d1', 'Dormant one', now - 25 * HOUR_MS),
    session('d2', 'Dormant two', now - 26 * HOUR_MS),
  ]
  const workspaces = [{
    workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: sessions.map((s) => s.id),
  }]
  const status = makeUiSession({})
  const { rows, section, button, env, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: sessions.map((s) => rowSpec(s.id, s.displayTitle)),
      button: 'collapsed',
    }],
    sessions,
    workspaces,
    uiSession: status,
  })
  try {
    // The host's own truncation row ('展开其余 3 个会话'): collapsed, with a count.
    button.textContent = '展开其余 3 个会话'
    button.addEventListener('click', () => { button.clicks = (button.clicks || 0) + 1 })
    status.setStatuses({})
    env.flushTimers()
    const bar = markerChild(section, 'fold-bar')
    assert.ok(bar !== null, 'the bar owns the section one truncation row')
    assert.equal(bar.children[0].children[1].textContent, '5 条历史会话',
      'the two dormant rows plus the three the host hides')
    assert.equal(button.style.display, 'none', 'the host button steps aside while the bar shows')
    bar.children[0].click()
    env.flushTimers()
    assert.equal(button.clicks, 1, 'the bar proxies the host expand')
    // Issue 4: the reveal FOLLOWS the host's own aria-expanded — the stub host
    // has not expanded yet, so the click alone reveals nothing and no row can
    // be stranded open while the host thinks it is collapsed.
    assert.equal(rows.d1.style.display, 'none', 'the host state is the reveal truth')
    assert.equal(button.style.display, 'none', 'the host button stays absorbed while collapsed')
    button.setAttribute('aria-expanded', 'true')
    status.setStatuses({})
    env.flushTimers()
    assert.equal(rows.d1.style.display, undefined, 'the host expansion reveals this block too')
    assert.equal(rows.d2.style.display, undefined)
    assert.equal(markerChild(section, 'fold-bar'), null, 'everything is visible: the bar retires')
    assert.equal(button.style.display, undefined, 'and the host control comes back')
  } finally {
    tearDown()
  }
})

test('the periodic tick re-zones a row whose 24 hours ran out', async () => {
  const intervals = []
  const now = Date.now()
  const sessions = [
    session('a1', 'Active one', now - 23 * HOUR_MS - 50 * 60 * 1000),
    session('d1', 'Dormant one', now - 25 * HOUR_MS),
  ]
  const workspaces = [{
    workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: sessions.map((s) => s.id),
  }]
  const { rows, section, env, tearDown } = await mount({
    sections: [{ title: 'w1', rows: sessions.map((s) => rowSpec(s.id, s.displayTitle)) }],
    sessions,
    workspaces,
    uiSession: makeUiSession({}),
    prepare: (fake) => {
      fake.window.setInterval = (fn, ms) => { intervals.push({ fn, ms }); return intervals.length }
      fake.window.clearInterval = () => {}
    },
  })
  try {
    assert.equal(intervals.length, 1, 'one shared tick drives the labels and the zone recompute')
    assert.equal(intervals[0].ms, 60000, 'the faster of the two needs (60s labels, 5min zones)')
    assert.equal(rowEl(rows.a1).getAttribute('data-dsh-ux-zone'), 'active')
    assert.equal(markerChild(section, 'fold-bar').children[0].children[1].textContent, '1 条历史会话')
    // Ten minutes later: nothing in the data layer changed, only the clock. The
    // tick is the only thing that can move the row across the zone boundary.
    sessions[0].updatedAt = now - DAY_MS - 10 * 60 * 1000
    intervals[0].fn()
    env.flushTimers()
    assert.equal(rowEl(rows.a1).getAttribute('data-dsh-ux-zone'), null, 'the row left the Active zone')
    assert.equal(rows.a1.style.display, 'none', 'and folded into the dormant block')
    assert.equal(rowEl(rows.a1).style.opacity, '0.5')
    assert.equal(markerChild(section, 'fold-bar').children[0].children[1].textContent, '2 条历史会话')
  } finally {
    tearDown()
  }
})

test('an all-dormant section with host truncation folds everything behind one bar', async () => {
  // The host renders 5 of 19 rows (its own quota) and the replay mirrors that
  // slice, so the bar speaks for BOTH truncations — and one click round-trip
  // (issue 4) opens and closes everything together, following the host state.
  const now = Date.now()
  const sessions = []
  for (let i = 0; i < 19; i += 1) {
    sessions.push(session(`s${String(i).padStart(2, '0')}`, `Old ${i}`, now - (30 + i) * HOUR_MS))
  }
  const workspaces = [{
    workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: sessions.map((s) => s.id),
  }]
  const status = makeUiSession({})
  const shown = sessions.slice(0, 5)
  const { rows, section, button, env, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: shown.map((s) => rowSpec(s.id, s.displayTitle)),
      button: 'collapsed',
    }],
    sessions,
    workspaces,
    uiSession: status,
  })
  try {
    button.textContent = '展开其余 14 个会话'
    status.setStatuses({})
    env.flushTimers()
    const bar = markerChild(section, 'fold-bar')
    assert.ok(bar !== null, 'the bar owns the section even when every row is dormant')
    assert.equal(bar.children[0].children[1].textContent, '19 条历史会话',
      'the five rows this feature hides plus the fourteen the host hides')
    assert.equal(button.style.display, 'none', 'the host button steps aside')
    assert.equal(rows.s00.style.display, 'none', 'a dormant rendered row is folded too')
    button.setAttribute('aria-expanded', 'true')
    // Host realism: raising the quota RENDERS the rows it was hiding — the
    // section is self-consistent only once the DOM holds all 19 — and the host
    // keeps the same control, now reading 收起.
    for (const s of sessions.slice(5)) appendHostRow(section, s.id, `${s.displayTitle}6分钟`)
    button.textContent = '收起'
    status.setStatuses({})
    env.flushTimers()
    assert.equal(markerChild(section, 'fold-bar'), null, 'the host expansion reveals everything')
    assert.equal(rows.s00.style.display, undefined)
    assert.equal(button.style.display, undefined, 'and the host control comes back as 收起')
  } finally {
    tearDown()
  }
})

// ---------------------------------------------------------------------------
// Compact rows (user rule): the sidebar was asked for a Claude-like density —
// an inline 26px box and 13px/18px titles instead of the host's CSS-pinned
// 32px box and 14px/20px titles.
// ---------------------------------------------------------------------------

/** One row's host text leaves (same shape as the host renders them). */
function cellsOf(row) {
  const found = {}
  for (const child of row.children) found[child.className] = child
  return found
}

test('every session row wears the compact box and the compact title/age metrics', async () => {
  const now = Date.now()
  const sessions = [
    session('a1', 'Active one', now - 30 * 60 * 1000),
    session('d1', 'Dormant one', now - 25 * HOUR_MS),
  ]
  const workspaces = [{
    workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: sessions.map((s) => s.id),
  }]
  const status = makeUiSession({})
  const { rows, dispose, tearDown } = await mount({
    sections: [{
      title: 'w1',
      rows: [
        hostDomRow('a1', 'Active one', '6分钟', 'Running'),
        hostDomRow('d1', 'Dormant one', '25小时', 'Completed'),
      ],
    }],
    sessions,
    workspaces,
    uiSession: status,
  })
  try {
    for (const [id, row] of [['a1', rows.a1], ['d1', rows.d1]]) {
      // ONE box for the whole list: Active and dormant rows share it, so the
      // Active block is set apart by its band and dots, not by row height.
      assert.equal(rowEl(row).style.height, '26px', `${id}: the compact box replaces the host's 32px`)
      // The host has no global border-box reset and .sessionRow is the one row
      // kind that does not opt in (the project and search rows do), so the box
      // must declare border-box or 26px + 1px padding paints as a 28px row.
      assert.equal(rowEl(row).style.boxSizing, 'border-box')
      assert.equal(rowEl(row).style.paddingBlock, '1px')
      assert.equal(rowEl(row).style.paddingInlineEnd, '6px')
      // The host's depth indent (padding-inline-start) is never overwritten.
      assert.equal(rowEl(row).style.paddingInline, undefined)
      assert.equal(rowEl(row).style.gap, '4px')
      const cells = cellsOf(rowEl(row))
      assert.equal(cells.title.style.fontSize, '13px', `${id}: the title drops one step`)
      assert.equal(cells.title.style.lineHeight, '18px')
      // The compact row's own gap owns the title spacing: the host's 6px/4px
      // lateral margins (Rows.module.css:115-117) are zeroed, not inherited.
      assert.equal(cells.title.style.marginLeft, '0px')
      assert.equal(cells.title.style.marginRight, '0px')
      assert.equal(cells.time.style.fontSize, '10px', `${id}: the age keeps its step`)
      assert.equal(cells.time.style.lineHeight, '14px')
      // The status leaf is not a styled cell: only the row's text steps down.
      assert.equal(cells.visuallyHidden.style.fontSize, undefined)
    }
    // The dormant row differs by its fade alone, never by its box.
    assert.equal(rowEl(rows.d1).style.opacity, '0.5')
    assert.equal(rowEl(rows.a1).style.opacity, undefined)
    // Switching the feature off gives the host's own metrics back exactly —
    // no compact value survives a dispose. (dispose() directly, so the
    // finally block still owns the global teardown.)
    dispose()
    assert.equal(rowEl(rows.a1).style.height, undefined)
    assert.equal(rowEl(rows.a1).style.boxSizing, undefined)
    assert.equal(rowEl(rows.a1).style.paddingInlineEnd, undefined)
    assert.equal(cellsOf(rowEl(rows.a1)).title.style.fontSize, undefined)
    assert.equal(cellsOf(rowEl(rows.a1)).title.style.marginLeft, undefined)
    assert.equal(cellsOf(rowEl(rows.a1)).time.style.lineHeight, undefined)
  } finally {
    tearDown()
  }
})

test('an archived row keeps the host metrics: no compact box, no compact title', async () => {
  const now = Date.now()
  const sessions = [session('r1', 'Archived one', now - 30 * 60 * 1000)]
  const workspaces = [{
    workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: ['r1'],
  }]
  const status = makeUiSession({})
  const { rows, tearDown } = await mount({
    sections: [{ title: 'w1', rows: [hostDomRow('r1', 'Archived one', '6分钟', 'Completed')] }],
    sessions,
    workspaces,
    archived: ['r1'],
    uiSession: status,
  })
  try {
    assert.equal(rowEl(rows.r1).style.height, undefined, 'the host box is left alone')
    assert.equal(rowEl(rows.r1).style.boxSizing, undefined, 'the host box model is left alone')
    assert.equal(rowEl(rows.r1).style.paddingInlineEnd, undefined)
    assert.equal(cellsOf(rowEl(rows.r1)).title.style.fontSize, undefined)
    assert.equal(cellsOf(rowEl(rows.r1)).title.style.marginLeft, undefined)
    assert.equal(rowEl(rows.r1).getAttribute('data-dsh-ux-zone'), null)
  } finally {
    tearDown()
  }
})

// ---------------------------------------------------------------------------
// Drift grace + the freeze's lifetime (user report m01265/m01302): the green
// band vanished while every row kept its compact box, and it stayed away until
// the pointer left the sidebar. Two defects met: any unexplained count tore the
// section down (band included), and the churn freeze then deferred the pass that
// would have rebuilt it.
// ---------------------------------------------------------------------------

/**
 * Unexplained passes a section survives before it steps aside: the feature's
 * DRIFT_GRACE_PASSES kept ones, plus the pass that decides.
 */
const DRIFT_PASSES = 4

/** One section whose DOM is the host's own collapsed slice (quota + 1 running). */
async function mountTruncated() {
  const now = Date.now()
  const sessions = [runningSession('run', 'Run one', now)]
  const memberIds = ['run']
  for (let i = 1; i <= 8; i += 1) {
    sessions.push(session(`a${i}`, `A ${i}`, now - (9 - i) * 3 * HOUR_MS))
    memberIds.push(`a${i}`)
  }
  const slice = ['run', 'a8', 'a7', 'a6', 'a5', 'a4']
  const status = makeUiSession({ run: RUNNING_STATUS })
  const mounted = await mount({
    sections: [{
      title: 'w1',
      rows: slice.map((id) => rowSpec(id, id === 'run' ? 'Run one' : `A ${id.slice(1)}`)),
      button: 'collapsed',
    }],
    sessions,
    workspaces: [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: memberIds }],
    uiSession: status,
  })
  mounted.status = status
  mounted.memberIds = memberIds
  return mounted
}

test('a transient count drift keeps the green band: the section holds its last consistent presentation', async () => {
  const { rows, section, env, status, tearDown } = await mountTruncated()
  try {
    env.flushTimers()
    assert.ok(markerChild(section, 'zone-band') !== null, 'the consistent slice wears the band')
    assert.equal(rowEl(rows.a8).style.height, '26px')
    const rank = rows.a8.style.order
    assert.ok(rank !== undefined)

    // The host committed a row our replay does not explain yet (its own
    // mutation is what scheduled this pass). That is 'unknown', not 'wrong'.
    const drifted = appendHostRow(section, 'a3', 'A 36分钟')
    status.setStatuses({ run: RUNNING_STATUS })
    env.flushTimers()
    assert.ok(markerChild(section, 'zone-band') !== null, 'the band rides out the drift')
    assert.equal(section.style.isolation, 'isolate', 'and keeps its stacking context')
    assert.equal(rows.a8.style.order, rank, 'with the ranks it last verified')
    assert.equal(rowEl(rows.a8).style.height, '26px', 'and the compact rows untouched')

    // The DOM catches up: the next pass is healthy again and re-ranks.
    drifted.remove()
    status.setStatuses({ run: RUNNING_STATUS })
    env.flushTimers()
    assert.ok(markerChild(section, 'zone-band') !== null, 'a healthy pass re-ensures the band')
    assert.equal(rows.a8.style.order, rank)
  } finally {
    tearDown()
  }
})

test('an unexplained count that persists hands the section back: band out, host order restored', async () => {
  const { rows, section, button, env, status, tearDown } = await mountTruncated()
  try {
    env.flushTimers()
    assert.ok(markerChild(section, 'zone-band') !== null)
    button.textContent = '展开其余 3 个会话'
    appendHostRow(section, 'a3', 'A 36分钟')
    // The divergence never heals: after the grace the layer steps aside for good
    // (presentation never guesses), which is the behavior the grace replaces for
    // one beat.
    for (let i = 0; i < DRIFT_PASSES; i += 1) {
      status.setStatuses({ run: RUNNING_STATUS })
      env.flushTimers()
    }
    assert.equal(markerChild(section, 'zone-band'), null, 'the band is released')
    assert.equal(section.style.isolation, undefined, 'and the stacking context with it')
    assert.equal(rows.a8.style.display, undefined, 'the folded rows are handed back')
    // The step-aside gives up the band and the fold (which would strand at stale
    // geometry); the ranks a consistent pass verified are left on the rows.
    assert.equal(rows.a8.style.order, '11')
    assert.equal(button.style.display, 'none', 'the host button steps aside')
    const bar = markerChild(section, 'fold-bar')
    assert.ok(bar !== null, 'the bar still speaks for the count we cannot explain')
    assert.equal(bar.children[0].children[1].textContent, '3 条历史会话')
  } finally {
    tearDown()
  }
})

test('the freeze has a lifetime: a deferred pass runs once both retries are spent', async () => {
  const now = Date.now()
  const sessions = [
    session('a1', 'Active one', now - 30 * 60 * 1000),
    session('d1', 'Dormant one', now - 25 * HOUR_MS),
    session('d2', 'Dormant two', now - 30 * HOUR_MS),
  ]
  const status = makeUiSession({})
  const { rows, section, env, tearDown } = await mount({
    sections: [{ title: 'w1', rows: sessions.map((s) => rowSpec(s.id, s.displayTitle)) }],
    sessions,
    workspaces: [{ workspaceId: 'w1', path: '/w1', title: 'w1', sessionIds: ['a1', 'd1', 'd2'] }],
    uiSession: status,
  })
  try {
    env.flushTimers()
    assert.equal(rows.d2.style.order, '13', 'd2 is the last dormant row')
    env.listeners.pointerover[0]({
      target: { closest: (sel) => (sel === '[role="tree"]' ? 'tree' : null) },
    })
    // d2 starts running: a restyle is now owed, but the pointer is inside.
    status.setStatuses({ d2: RUNNING_STATUS })
    env.flushTimers()
    assert.equal(rows.d2.style.order, '13', 'the freeze still protects the resting cursor')
    assert.equal(rows.d2.style.display, 'none', 'and nothing moved')
    // Two retries, then the pass runs on its own instead of waiting forever for
    // a pointerout that a user working in the sidebar never sends.
    for (let i = 0; i < 8; i += 1) env.flushTimers()
    assert.equal(rows.d2.style.order, '11', 'd2 leads the dormant block now')
    assert.equal(rows.d2.style.display, undefined, 'a running row is never folded away')
    // The lifetime is spent, not renewed: a pass that pierced the freeze must not
    // re-arm the two retries, or a resting pointer would be repainted forever.
    assert.equal(env.timers.filter(Boolean).length, 0, 'the spent budget stays spent')
  } finally {
    tearDown()
  }
})
