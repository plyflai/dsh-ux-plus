/**
 * Quick search box tests (plain Node, no browser, no React).
 *
 * What is pinned here, in the order the feature works:
 *
 *   - pure helpers: the workspace path agreed by both halves, the CSS that
 *     removes the private workspace from the sidebar, the history cap/dedupe,
 *     the model-catalog flattening, the age buckets, and the region locator
 *     that keeps DOM placement independent of hashed class names;
 *   - mount: the box becomes the region's first child and the two injected
 *     sheets land in `<head>`; dispose removes all of it and unsubscribes;
 *   - Enter: workspace registration (only when missing) -> `sessions.create`
 *     in that workspace -> `selectModel` only for a non-default pick ->
 *     `prompt` -> `openSession`, with the new session hidden from the list
 *     BEFORE it can be rendered;
 *   - failure: the error is shown in place, the query is kept, nothing opens;
 *   - the history popup: newest first, click reopens the session, clear empties.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const root = new URL('..', import.meta.url)
const moduleUrl = new URL('features/workspace-quick-search/src/index.js', root)

const HOME = '/Users/tester'
const WORKSPACE_PATH = `${HOME}/.dsh-ux-plus/search`

// ---------------------------------------------------------------------------
// Fakes.
// ---------------------------------------------------------------------------

/** One fake element: attributes + children + the sibling links the locator needs. */
function node(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    style: {},
    dataset: {},
    textContent: '',
    value: '',
    children: [],
    parentNode: null,
    attributes: {},
    listeners: {},
  }
  el.appendChild = (child) => {
    if (child.parentNode !== null) child.parentNode.removeChild(child)
    child.parentNode = el
    el.children.push(child)
    return child
  }
  el.insertBefore = (child, ref) => {
    if (child.parentNode !== null) child.parentNode.removeChild(child)
    const index = ref === undefined || ref === null ? el.children.length : el.children.indexOf(ref)
    if (index === -1) el.children.push(child)
    else el.children.splice(index, 0, child)
    child.parentNode = el
    return child
  }
  el.removeChild = (child) => {
    const index = el.children.indexOf(child)
    if (index !== -1) el.children.splice(index, 1)
    child.parentNode = null
    return child
  }
  Object.defineProperty(el, 'firstElementChild', { get: () => (el.children.length > 0 ? el.children[0] : null) })
  Object.defineProperty(el, 'previousElementSibling', {
    get: () => {
      if (el.parentNode === null) return null
      const index = el.parentNode.children.indexOf(el)
      return index > 0 ? el.parentNode.children[index - 1] : null
    },
  })
  el.setAttribute = (key, value) => { el.attributes[key] = String(value) }
  el.getAttribute = (key) => (key in el.attributes ? el.attributes[key] : null)
  el.removeAttribute = (key) => { delete el.attributes[key] }
  el.addEventListener = (type, fn) => { (el.listeners[type] ??= []).push(fn) }
  el.removeEventListener = (type, fn) => {
    const list = el.listeners[type] || []
    const index = list.indexOf(fn)
    if (index !== -1) list.splice(index, 1)
  }
  el.dispatch = (type, event) => { for (const fn of el.listeners[type] || []) fn(event) }
  el.getBoundingClientRect = () => ({ left: 0, top: 0, right: 240, bottom: 40, width: 240, height: 40 })
  el.focus = () => { el.focused = true }
  return el
}

/** Depth-first walk over a fake element tree. */
function walk(root, visit) {
  visit(root)
  for (const child of root.children || []) walk(child, visit)
}

/** First descendant (or self) carrying `attr=value`. */
function pick(root, attr, value) {
  let hit = null
  walk(root, (el) => {
    if (hit === null && typeof el.getAttribute === 'function' && el.getAttribute(attr) === value) hit = el
  })
  return hit
}

/** Every descendant (or self) matching a predicate. */
function collect(root, predicate) {
  const rows = []
  walk(root, (el) => { if (predicate(el)) rows.push(el) })
  return rows
}

/** The sidebar skeleton the locator walks: nav + region, region > browser > tree. */
function makeSidebar() {
  const sidebar = node('div')
  const nav = node('nav')
  const region = node('div')
  const browser = node('div')
  const tree = node('div')
  tree.setAttribute('role', 'tree')
  browser.appendChild(tree)
  region.appendChild(browser)
  sidebar.appendChild(nav)
  sidebar.appendChild(region)
  return { sidebar, nav, region, browser, tree }
}

/** One fake browser environment; `sidebar` is optional (no tree = rail mode). */
function makeEnv(options = {}) {
  const env = { timers: [], observers: [], docListeners: {}, windowListeners: {} }
  env.sidebar = options.sidebar === undefined ? makeSidebar() : options.sidebar
  env.document = {
    body: node('body'),
    head: node('head'),
    createElement: (tag) => node(tag),
    querySelector: (selector) => {
      if (env.sidebar === null) return null
      return selector === '[role="tree"]' ? env.sidebar.tree : null
    },
    querySelectorAll: () => [],
    addEventListener: (type, fn, capture) => { (env.docListeners[type] ??= []).push({ fn, capture: capture === true }) },
    removeEventListener: (type, fn, capture) => {
      const list = env.docListeners[type] || []
      const index = list.findIndex((row) => row.fn === fn && row.capture === (capture === true))
      if (index !== -1) list.splice(index, 1)
    },
  }
  env.window = {
    innerWidth: 1440,
    innerHeight: 900,
    localStorage: {
      store: new Map(),
      getItem(key) { return this.store.has(key) ? this.store.get(key) : null },
      setItem(key, value) { this.store.set(key, String(value)) },
      removeItem(key) { this.store.delete(key) },
    },
    addEventListener: (type) => { env.windowListeners[type] = (env.windowListeners[type] || 0) + 1 },
    removeEventListener: (type) => { if (env.windowListeners[type] > 0) env.windowListeners[type] -= 1 },
    setTimeout: (fn) => { env.timers.push(fn); return env.timers.length - 1 },
    clearTimeout: (id) => { if (env.timers[id]) env.timers[id] = null },
  }
  env.MutationObserver = class {
    constructor(callback) { this.callback = callback; this.disconnected = false; env.observers.push(this) }
    observe(target, opts) { this.target = target; this.opts = opts }
    disconnect() { this.disconnected = true }
  }
  /** Run every queued (uncancelled) timer once: the 0-ms placement pass. */
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

/** A fake SettingsScope-style list store over a mutable snapshot. */
function makeList(snapshot) {
  const subs = new Set()
  return {
    getSnapshot: () => snapshot,
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn) },
    set: (next) => { snapshot = next; for (const fn of [...subs]) fn() },
    subscribeCount: () => subs.size,
  }
}

const CATALOG = {
  default: { provider: 'deepseek', model: 'deepseek-chat' },
  groups: [
    {
      id: 'deepseek',
      name: 'DeepSeek',
      models: [
        { id: 'deepseek-chat', name: 'DeepSeek Chat' },
        { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
      ],
    },
  ],
}

/** A client context + recorders (`calls`) for the host services. */
function makeCtx(options = {}) {
  const calls = { opened: [], prompted: [], created: [], selected: [], locale: [], catalog: 0 }
  const state = {
    catalog: options.catalog === undefined ? CATALOG : options.catalog,
    promptFails: options.promptFails === true,
    workspaceFails: options.workspaceFails === true,
  }
  const ctx = {
    remote: {
      $host: { home: options.home === undefined ? HOME : options.home },
      session: {
        modelCatalog: async () => { calls.catalog += 1; return { ok: true, value: state.catalog } },
        selectModel: async (request) => { calls.selected.push(request); return { ok: true } },
        prompt: async (request) => {
          calls.prompted.push(request)
          if (state.promptFails) return { ok: false, error: { message: 'boom' } }
          return { ok: true, value: { accepted: true } }
        },
      },
    },
    effect: (callback) => callback(),
    locale: {
      register: (namespace, messages) => { calls.locale.push({ namespace, messages }); return () => {} },
      getSnapshot: () => ({ active: options.locale === undefined ? 'zh' : options.locale }),
      subscribe: () => () => {},
    },
    get: (name) => (name === 'uiWorkspace' ? { openSession: (id) => calls.opened.push(id) } : undefined),
  }
  return { ctx, calls, state }
}

/** Shared feature deps: session + workspace services over fake stores. */
function makeDeps(options = {}) {
  const calls = { create: [], workspacesCreate: [] }
  // The host keeps the session list in step with `create`; the fakes do too, so
  // the history's liveness check sees the sessions it lists.
  const ids = []
  const sessions = makeList({ phase: 'ready', ids, byId: {} })
  const workspaces = makeList({ phase: 'ready', items: options.items || [] })
  const deps = {
    sessions: {
      list: sessions,
      create: async (input) => {
        calls.create.push(input)
        const sessionId = options.sessionId === undefined ? 'session-1' : options.sessionId
        ids.push(sessionId)
        sessions.set({ phase: 'ready', ids, byId: {} })
        return sessionId
      },
    },
    workspaces: {
      list: workspaces,
      create: async (input) => {
        calls.workspacesCreate.push(input)
        if (options.workspaceFails === true) throw new Error('workspace/invalid-path: nope')
        const view = { workspaceId: 'ws-search', path: input.path, title: 'search', sessionIds: [] }
        workspaces.set({ phase: 'ready', items: [...(options.items || []), view] })
        return view
      },
    },
  }
  return { deps, calls, sessions, workspaces }
}

/** Mount the feature and hand back the box's pieces. */
async function mount(env, ctx, deps) {
  const module = await import(moduleUrl.href)
  const dispose = module.feature.client(ctx, deps)
  const region = env.sidebar === null ? null : env.sidebar.region
  const rootNode = region === null ? null : region.children[0]
  return { module, dispose, region, rootNode }
}

/** Type into the box and press Enter. */
function pressEnter(input, overrides = {}) {
  input.dispatch('keydown', { key: 'Enter', isComposing: false, preventDefault() {}, ...overrides })
}

/** Wait for the async submit chain to settle. */
async function settle() {
  for (let i = 0; i < 12; i += 1) await new Promise((resolve) => setTimeout(resolve, 0))
}

// ---------------------------------------------------------------------------
// Pure helpers.
// ---------------------------------------------------------------------------

test('searchWorkspacePath agrees with the host half on both separators', async () => {
  const { searchWorkspacePath, WORKSPACE_SEGMENTS } = await import(moduleUrl.href)
  assert.deepEqual(WORKSPACE_SEGMENTS, ['.dsh-ux-plus', 'search'])
  assert.equal(searchWorkspacePath('/Users/tester'), '/Users/tester/.dsh-ux-plus/search')
  assert.equal(searchWorkspacePath('/Users/tester/'), '/Users/tester/.dsh-ux-plus/search')
  assert.equal(searchWorkspacePath('C:\\Users\\tester'), 'C:\\Users\\tester\\.dsh-ux-plus\\search')
  assert.equal(searchWorkspacePath(undefined), null)
  assert.equal(searchWorkspacePath(''), null)
})

test('hiddenCss hides the group wrapper, the row, and every owned session', async () => {
  const { hiddenCss } = await import(moduleUrl.href)
  const css = hiddenCss('ws-search', ['s1', 's2', 's1'])
  assert.ok(css.includes('*:has(> [data-row-key="workspace:ws-search"]) { display: none !important; }'), css)
  assert.ok(css.includes('[data-row-key="workspace:ws-search"] { display: none !important; }'), css)
  assert.ok(css.includes('[data-row-key="session:s1"] { display: none !important; }'), css)
  assert.equal(css.split('session:s1').length - 1, 1, 'duplicate session ids collapse')
  assert.equal(hiddenCss(null, []), '', 'nothing known yet means no rule')
  assert.ok(hiddenCss('a"b', []).includes('[data-row-key="workspace:a\\"b"]'), 'quotes are escaped')
})

test('history keeps the newest 50, one row per session', async () => {
  const { readHistory, pushHistory, HISTORY_LIMIT } = await import(moduleUrl.href)
  assert.equal(HISTORY_LIMIT, 50)
  assert.deepEqual(readHistory('not json'), [])
  assert.deepEqual(readHistory(JSON.stringify([{ query: 'no id' }])), [])
  let list = []
  for (let i = 0; i < 60; i += 1) list = pushHistory(list, { sessionId: `s${i}`, query: `q${i}`, at: i })
  assert.equal(list.length, 50)
  assert.equal(list[0].sessionId, 's59', 'newest first')
  assert.equal(list[49].sessionId, 's10', 'oldest entries fall off')
  const again = pushHistory(list, { sessionId: 's59', query: 'edited', at: 99 })
  assert.equal(again.filter((row) => row.sessionId === 's59').length, 1, 'a retried search does not duplicate its row')
  assert.equal(again[0].query, 'edited')
  assert.deepEqual(readHistory(JSON.stringify([{ sessionId: 's', query: 'q', provider: 'p', model: 'm', at: 5 }])), [
    { sessionId: 's', query: 'q', provider: 'p', model: 'm', at: 5 },
  ])
})

test('flattenModels turns the catalog into option rows', async () => {
  const { flattenModels } = await import(moduleUrl.href)
  assert.deepEqual(flattenModels(undefined), [])
  const rows = flattenModels(CATALOG)
  assert.equal(rows.length, 2)
  assert.deepEqual(rows[1], { index: 1, provider: 'deepseek', model: 'deepseek-reasoner', label: 'DeepSeek Reasoner', group: 'DeepSeek' })
})

test('ageBucket buckets a timestamp for the localized history line', async () => {
  const { ageBucket } = await import(moduleUrl.href)
  const now = 1_700_000_000_000
  assert.deepEqual(ageBucket(now - 1_000, now), { key: 'now' })
  assert.deepEqual(ageBucket(now - 5 * 60_000, now), { key: 'minutes', n: 5 })
  assert.deepEqual(ageBucket(now - 3 * 3_600_000, now), { key: 'hours', n: 3 })
  assert.deepEqual(ageBucket(now - 30 * 3_600_000, now), { key: 'yesterday' })
  assert.deepEqual(ageBucket(now - 4 * 86_400_000, now), { key: 'days', n: 4 })
})

test('locateBrowserRegion finds the region above the tree, and nothing in rail mode', async () => {
  const { locateBrowserRegion } = await import(moduleUrl.href)
  const env = makeEnv()
  assert.equal(locateBrowserRegion(env.document), env.sidebar.region)
  assert.equal(locateBrowserRegion(makeEnv({ sidebar: null }).document), null)
  assert.equal(locateBrowserRegion(null), null)
  // A tree without the nav sibling (some future layout) must not be mistaken for the region.
  const orphan = makeSidebar()
  orphan.sidebar.removeChild(orphan.nav)
  const env2 = makeEnv({ sidebar: orphan })
  assert.equal(locateBrowserRegion(env2.document), null)
})

// ---------------------------------------------------------------------------
// Mount / dispose.
// ---------------------------------------------------------------------------

test('mount inserts the box as the region first child and dispose removes every trace', async () => {
  const env = makeEnv()
  installGlobals(env)
  try {
    const { ctx } = makeCtx()
    const { deps, sessions, workspaces } = makeDeps()
    const { dispose, region, rootNode } = await mount(env, ctx, deps)

    assert.equal(region.children[0], rootNode, 'the box is the region first child')
    assert.equal(rootNode.getAttribute('data-dsh-ux-plus'), 'quick-search')
    assert.ok(rootNode.getAttribute('data-ux-plus-instance'), 'our box carries the instance token')
    const input = pick(rootNode, 'data-qs', 'input')
    assert.ok(input, 'the field holds an input')
    assert.ok(input.getAttribute('placeholder').includes('搜索'), 'placeholder follows the active locale')
    assert.equal(env.document.head.children.length, 2, 'one sheet for the box, one for the hidden workspace')
    assert.ok(env.document.head.children[0].textContent.includes('[data-qs="field"]'))
    const sheet = env.document.head.children[0].textContent
    assert.ok(
      sheet.includes('[data-ux-plus-instance]'),
      'a marker-only box left by a superseded bundle is hidden, not stacked',
    )
    // Gutter symmetry: both ends of the row are an equal slot inside equal padding.
    const rule = (sel) => {
      const hit = sheet.split('}').find((part) => part.includes(sel))
      return hit || ''
    }
    const fieldCss = rule('[data-qs="field"] {')
    assert.ok(/padding: 0 8px/.test(fieldCss), 'the row insets both ends by the same amount')
    const slotWidth = (sel) => (/width: (\d+)px/.exec(rule(sel)) || [])[1]
    assert.equal(slotWidth('[data-qs="glass"]'), slotWidth('[data-qs="history"]'), 'left icon and right icon share one slot width')
    assert.equal(slotWidth('[data-qs="glass"]'), slotWidth('[data-qs="model"]'), 'left slot matches the model slot too')
    assert.ok(fieldCss.includes('[data-ux-plus-instance]'), 'our geometry rules are instance-scoped, so a stale sheet cannot restyle them')
    // The sidebar region is inset asymmetrically; the box must flush with the list band,
    // so its left edge lines up with the rows and its right edge with the header controls.
    const scopeCss = rule('[data-dsh-ux-plus="quick-search"][data-ux-plus-instance] {')
    assert.ok(
      /padding: 6px var\(--dsh-session-list-edge-inset, 12px\) 6px 0/.test(scopeCss),
      'the box takes the host right inset and no left inset',
    )
    assert.equal(sessions.subscribeCount(), 1)
    assert.equal(workspaces.subscribeCount(), 1)
    assert.equal(env.observers.length, 1)
    assert.equal(env.observers[0].disconnected, false)

    // Re-render churn: the box is re-placed instead of duplicated.
    env.sidebar.region.insertBefore(node('div'), env.sidebar.browser)
    env.observers[0].callback()
    env.flushTimers()
    assert.equal(region.children[0], rootNode)
    assert.equal(collect(region, (el) => el.getAttribute('data-dsh-ux-plus') === 'quick-search').length, 1)

    dispose()
    assert.equal(region.children.includes(rootNode), false, 'dispose removes the box')
    assert.equal(env.document.head.children.length, 0, 'dispose removes both sheets')
    assert.equal(env.observers[0].disconnected, true)
    assert.equal(sessions.subscribeCount(), 0)
    assert.equal(workspaces.subscribeCount(), 0)
    dispose()
    assert.equal(env.document.head.children.length, 0, 'double dispose is a no-op')
  } finally {
    uninstallGlobals(env)
  }
})

test('rail mode (no tree) leaves nothing behind and the box returns with the tree', async () => {
  const env = makeEnv({ sidebar: null })
  installGlobals(env)
  try {
    const { ctx } = makeCtx()
    const { deps } = makeDeps()
    const { module, dispose } = await mount(env, ctx, deps)
    assert.equal(collect(env.document.body, (el) => el.getAttribute('data-dsh-ux-plus') === 'quick-search').length, 0)
    assert.ok(module.feature.client, 'client is a function')
    dispose()
  } finally {
    uninstallGlobals(env)
  }
})

// ---------------------------------------------------------------------------
// Enter: the whole path.
// ---------------------------------------------------------------------------

test('Enter opens a normal session in the existing private workspace and hides its row', async () => {
  const env = makeEnv()
  installGlobals(env)
  try {
    const { ctx, calls } = makeCtx()
    const items = [{ workspaceId: 'ws-search', path: WORKSPACE_PATH, title: 'search', sessionIds: ['old-1'] }]
    const { deps, calls: depsCalls } = makeDeps({ items, sessionId: 'session-new' })
    const { dispose, rootNode } = await mount(env, ctx, deps)
    const input = pick(rootNode, 'data-qs', 'input')
    input.value = '  what is DSH  '
    pressEnter(input)
    await settle()

    assert.deepEqual(depsCalls.workspacesCreate, [], 'an registered workspace is never created again')
    assert.deepEqual(depsCalls.create, [{ workspaceId: 'ws-search' }])
    assert.deepEqual(calls.selected, [], 'the default model is not re-selected')
    assert.equal(calls.prompted.length, 1)
    assert.equal(calls.prompted[0].sessionId, 'session-new')
    assert.equal(calls.prompted[0].mode, 'queue')
    assert.deepEqual(calls.prompted[0].content, [{ type: 'text', text: 'what is DSH' }], 'the query is trimmed')
    assert.match(calls.prompted[0].requestId, /\w/)
    assert.deepEqual(calls.opened, ['session-new'], 'the normal session page opens')
    assert.equal(input.value, '', 'the box clears')
    assert.equal(pick(rootNode, 'data-qs', 'status').textContent, '')
    const hideTag = env.document.head.children[1]
    assert.ok(hideTag.textContent.includes('[data-row-key="workspace:ws-search"]'), 'the workspace group is hidden')
    assert.ok(hideTag.textContent.includes('[data-row-key="session:session-new"]'), 'the new row is hidden before it renders')
    assert.ok(hideTag.textContent.includes('[data-row-key="session:old-1"]'), 'the workspace sessions are hidden too')
    const stored = JSON.parse(env.window.localStorage.getItem('dsh.ux-plus.quick-search.history'))
    assert.equal(stored.length, 1)
    assert.equal(stored[0].query, 'what is DSH')
    assert.equal(stored[0].sessionId, 'session-new')
    dispose()
  } finally {
    uninstallGlobals(env)
  }
})

test('the missing private workspace is registered at the shared path first', async () => {
  const env = makeEnv()
  installGlobals(env)
  try {
    const { ctx, calls } = makeCtx()
    const depsBundle = makeDeps({ items: [] })
    const { dispose, rootNode } = await mount(env, ctx, depsBundle.deps)
    const input = pick(rootNode, 'data-qs', 'input')
    input.value = 'hello'
    pressEnter(input)
    await settle()
    assert.deepEqual(depsBundle.calls.workspacesCreate, [{ path: WORKSPACE_PATH }])
    assert.deepEqual(depsBundle.calls.create, [{ workspaceId: 'ws-search' }])
    assert.deepEqual(calls.opened, ['session-1'])
    dispose()
  } finally {
    uninstallGlobals(env)
  }
})

test('the model icon opens a menu, and a non-default pick is selected once and remembered', async () => {
  const env = makeEnv()
  installGlobals(env)
  try {
    const { ctx, calls } = makeCtx()
    const items = [{ workspaceId: 'ws-search', path: WORKSPACE_PATH, title: 'search', sessionIds: [] }]
    const { deps } = makeDeps({ items })
    const { dispose, rootNode } = await mount(env, ctx, deps)
    const model = pick(rootNode, 'data-qs', 'model')
    assert.equal(String(model.tagName), 'BUTTON', 'the picker is a button, not a native dropdown')
    assert.equal(model.children.length, 1, 'the picker holds the chip icon and no text')
    assert.equal(model.getAttribute('data-qs-picked'), 'false', 'the host default leaves the chip bare')
    assert.ok(model.getAttribute('title').includes('DeepSeek Chat'), 'the tooltip names the current model')

    model.dispatch('click', {})
    const panels = () => collect(env.document.body, (el) => el.getAttribute('data-dsh-ux-plus') === 'quick-search-history')
    const rows = collect(panels()[0], (el) => el.getAttribute('data-qs') === 'menu-row')
    assert.equal(rows.length, 2, 'one row per catalog model')
    assert.equal(rows[0].getAttribute('data-qs-active'), 'true', 'the current pick is ticked')
    assert.equal(rows[1].getAttribute('data-qs-active'), null)

    rows[1].dispatch('click', {})
    assert.equal(panels().length, 0, 'picking closes the menu')
    assert.equal(model.getAttribute('data-qs-picked'), 'true', 'a non-default pick marks the chip')
    assert.deepEqual(
      JSON.parse(env.window.localStorage.getItem('dsh.ux-plus.quick-search.model')),
      { provider: 'deepseek', model: 'deepseek-reasoner' },
    )

    // The same icon toggles the menu shut.
    model.dispatch('click', {})
    assert.equal(panels().length, 1)
    model.dispatch('click', {})
    assert.equal(panels().length, 0)

    const input = pick(rootNode, 'data-qs', 'input')
    input.value = 'q'
    pressEnter(input)
    await settle()
    assert.deepEqual(calls.selected, [{ sessionId: 'session-1', provider: 'deepseek', model: 'deepseek-reasoner' }])
    dispose()
    // Remount keeps the pick — and still shows no text on the chip.
    const next = makeCtx()
    const remount = await mount(env, next.ctx, makeDeps({ items }).deps)
    const again = pick(remount.rootNode, 'data-qs', 'model')
    assert.equal(again.children.length, 1)
    assert.equal(again.getAttribute('data-qs-picked'), 'true')
    assert.ok(again.getAttribute('title').includes('DeepSeek Reasoner'))
    remount.dispose()
  } finally {
    uninstallGlobals(env)
  }
})

test('Enter works when the host home only arrives after mount', async () => {
  const env = makeEnv()
  installGlobals(env)
  try {
    // `remote.$host.home` is undefined until the first ready frame: the box must
    // resolve its directory lazily instead of giving up at mount time.
    const { ctx, calls } = makeCtx({ home: null })
    const items = [{ workspaceId: 'ws-search', path: WORKSPACE_PATH, title: 'search', sessionIds: [] }]
    const { deps, calls: depsCalls } = makeDeps({ items })
    const { dispose, rootNode } = await mount(env, ctx, deps)
    const input = pick(rootNode, 'data-qs', 'input')
    input.value = 'late home'
    pressEnter(input)
    await settle()
    assert.deepEqual(calls.opened, [], 'without a home the box reports instead of guessing')
    assert.equal(pick(rootNode, 'data-qs', 'status').getAttribute('data-qs-state'), 'error')

    ctx.remote.$host = { home: HOME }
    pressEnter(input)
    await settle()
    assert.deepEqual(depsCalls.workspacesCreate, [], 'the private workspace is found by its path')
    assert.deepEqual(depsCalls.create, [{ workspaceId: 'ws-search' }])
    assert.deepEqual(calls.opened, ['session-1'], 'the box recovered as soon as the home landed')
    dispose()
  } finally {
    uninstallGlobals(env)
  }
})

test('a failed prompt reports in place, keeps the query and opens nothing', async () => {
  const env = makeEnv()
  installGlobals(env)
  try {
    const { ctx, calls } = makeCtx({ promptFails: true })
    const items = [{ workspaceId: 'ws-search', path: WORKSPACE_PATH, title: 'search', sessionIds: [] }]
    const { deps } = makeDeps({ items })
    const { dispose, rootNode } = await mount(env, ctx, deps)
    const input = pick(rootNode, 'data-qs', 'input')
    input.value = 'keep me'
    pressEnter(input)
    await settle()
    const status = pick(rootNode, 'data-qs', 'status')
    assert.equal(input.value, 'keep me', 'the query survives a failure')
    assert.deepEqual(calls.opened, [], 'nothing opens')
    assert.equal(status.getAttribute('data-qs-state'), 'error')
    assert.ok(status.textContent.length > 0)
    assert.equal(JSON.parse(env.window.localStorage.getItem('dsh.ux-plus.quick-search.history') || '[]').length, 0)
    dispose()
  } finally {
    uninstallGlobals(env)
  }
})

test('a workspace that cannot be registered is reported and opens nothing', async () => {
  const env = makeEnv()
  installGlobals(env)
  try {
    const { ctx, calls } = makeCtx()
    const { deps } = makeDeps({ items: [], workspaceFails: true })
    const { dispose, rootNode } = await mount(env, ctx, deps)
    const input = pick(rootNode, 'data-qs', 'input')
    input.value = 'q'
    pressEnter(input)
    await settle()
    assert.deepEqual(calls.opened, [])
    assert.equal(pick(rootNode, 'data-qs', 'status').getAttribute('data-qs-state'), 'error')
    dispose()
  } finally {
    uninstallGlobals(env)
  }
})

// ---------------------------------------------------------------------------
// History popup.
// ---------------------------------------------------------------------------

test('the history icon lists the last searches and reopens one', async () => {
  const env = makeEnv()
  installGlobals(env)
  try {
    const { ctx, calls } = makeCtx()
    const items = [{ workspaceId: 'ws-search', path: WORKSPACE_PATH, title: 'search', sessionIds: [] }]
    const { deps } = makeDeps({ items, sessionId: 'session-1' })
    const { dispose, rootNode } = await mount(env, ctx, deps)
    const input = pick(rootNode, 'data-qs', 'input')
    input.value = 'first'
    pressEnter(input)
    await settle()
    input.value = 'second'
    pressEnter(input)
    await settle()
    assert.deepEqual(calls.opened, ['session-1', 'session-1'])

    const history = pick(rootNode, 'data-qs', 'history')
    history.dispatch('click', {})
    const popup = env.document.body.children.find((el) => el.getAttribute('data-dsh-ux-plus') === 'quick-search-history')
    assert.ok(popup, 'the popup is a body child (the sidebar clips it)')
    const rows = collect(popup, (el) => el.getAttribute('data-qs') === 'menu-row')
    assert.equal(rows.length, 1, 'the same session keeps one row')
    assert.equal(pick(rows[0], 'data-qs', 'menu-query').textContent, 'second')
    assert.equal(env.docListeners.pointerdown?.length, 1, 'outside clicks close the popup')

    rows[0].dispatch('click', {})
    assert.equal(env.document.body.children.includes(popup), false, 'picking a row closes the popup')
    assert.equal(calls.opened.at(-1), 'session-1')
    assert.equal(env.docListeners.pointerdown.length, 0, 'closing removes the document listeners')

    // Reopen and clear.
    history.dispatch('click', {})
    const again = env.document.body.children.find((el) => el.getAttribute('data-dsh-ux-plus') === 'quick-search-history')
    const clear = pick(again, 'data-qs', 'menu-clear')
    clear.dispatch('click', {})
    assert.equal(JSON.parse(env.window.localStorage.getItem('dsh.ux-plus.quick-search.history')).length, 0)
    history.dispatch('click', {})
    const empty = env.document.body.children.find((el) => el.getAttribute('data-dsh-ux-plus') === 'quick-search-history')
    assert.equal(collect(empty, (el) => el.getAttribute('data-qs') === 'menu-row').length, 0)
    assert.ok(pick(empty, 'data-qs', 'menu-empty'), 'the empty state renders')
    dispose()
    assert.equal(env.document.body.children.includes(empty), false, 'dispose closes an open popup')
  } finally {
    uninstallGlobals(env)
  }
})

test('an IME composition Enter does not submit', async () => {
  const env = makeEnv()
  installGlobals(env)
  try {
    const { ctx, calls } = makeCtx()
    const items = [{ workspaceId: 'ws-search', path: WORKSPACE_PATH, title: 'search', sessionIds: [] }]
    const { deps, calls: depsCalls } = makeDeps({ items })
    const { dispose, rootNode } = await mount(env, ctx, deps)
    const input = pick(rootNode, 'data-qs', 'input')
    input.value = '搜索'
    pressEnter(input, { isComposing: true })
    await settle()
    assert.deepEqual(depsCalls.create, [], 'the composition Enter is ignored')
    assert.equal(input.value, '搜索')
    dispose()
  } finally {
    uninstallGlobals(env)
  }
})

test('the package host half prepares the very directory the box registers', async () => {
  const host = await import(new URL('src/index.js', root).href)
  const text = await readFile(new URL('src/index.js', root), 'utf8')
  assert.ok(text.includes("import { feature as workspaceQuickSearch, searchWorkspacePath }"), 'the host reuses the shared path helper')
  assert.ok(text.includes('mkdirSync(directory, { recursive: true })'), 'the host creates the directory')
  assert.ok(host.FEATURES.some((feature) => feature.id === 'workspace-quick-search'), 'the feature is registered in the host list')
  assert.equal(host.Config({}).get()['workspace-quick-search'], true)
})
