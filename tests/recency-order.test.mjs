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
    header.setAttribute('aria-expanded', 'true')
    header.textContent = spec.title
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
          row.textContent = rowSpec.text
          wrap.textContent = rowSpec.text
          wrap.appendChild(row)
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
  return { tree, sections }
}

// ---------------------------------------------------------------------------
// Mount helper: fake DOM + list stores + the real feature client.
// ---------------------------------------------------------------------------

async function mount({ sections, sessions, workspaces, storage, archived = [] }) {
  const env = makeEnv()
  installGlobals(env)
  const built = buildTree(env, sections)
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
  })
  const workspacesStore = makeListStore({
    phase: 'ready',
    items: workspaces,
    archivedSessionIds: archived,
  })
  const { feature } = await import(new URL('features/workspace-recency-order/src/index.js', root).href)
  const dispose = feature.client({}, {
    sessions: { list: sessionsStore },
    workspaces: { list: workspacesStore },
  })
  env.flushTimers()
  return {
    env,
    ...built,
    ...first,
    dispose,
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
