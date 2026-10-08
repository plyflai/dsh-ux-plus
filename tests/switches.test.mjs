/**
 * P3 switch-engine tests (plain Node, no browser, no React):
 *
 *   - the `ux-plus` switch keys are exactly the four frozen feature ids;
 *   - every source file of the package imports only the nine shell seeds or
 *     relative paths (client-half seed discipline, source level — the built
 *     artifact is asserted mechanically by scripts/build.js, R10);
 *   - each feature client mounts and disposes cleanly against a fake DOM
 *     (typography: injected <style> + settings row; session-menu: native menu
 *     slot + locale; recency-order: group + row visual reorder + full
 *     teardown);
 *   - the D5 switch engine (src/switches.js, React-free by design) mounts and
 *     disposes every feature per switch value, end to end.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const root = new URL('..', import.meta.url)

/** Frozen feature ids (plan v2.5 naming freeze). */
const FROZEN = ['conversation-typography', 'workspace-session-menu', 'workspace-recency-order', 'tool-ask-question-expanded']

/** The nine shell-seeded module-table specifiers (host platform.ts:8-14). */
const SEEDS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

// ---------------------------------------------------------------------------
// Fakes.
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
  el.select = () => {}
  el.querySelector = (sel) => (el._query ? el._query(sel) : null)
  el.querySelectorAll = (sel) => (el._queryAll ? el._queryAll(sel) : [])
  el.getBoundingClientRect = () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 })
  return el
}

/** One fake browser environment (document/window/observers/timers). */
function makeEnv() {
  const listeners = {}
  const env = {
    listeners,
    moInstances: [],
    timers: [],
    rafs: [],
    docEvents: [],
    clipboardWrites: [],
    prev: {},
  }
  env.document = {
    documentElement: { lang: '' },
    body: makeElement('body'),
    head: makeElement('head'),
    createElement: (tag) => makeElement(tag),
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: (type, fn, capture) => { (listeners[type] ??= []).push({ fn, capture: capture === true }) },
    removeEventListener: (type, fn, capture) => {
      const list = listeners[type] || []
      const i = list.findIndex((row) => row.fn === fn && row.capture === (capture === true))
      if (i !== -1) list.splice(i, 1)
    },
    dispatchEvent: (event) => { env.docEvents.push(event); return true },
    execCommand: () => true,
  }
  env.window = {
    innerWidth: 1440,
    localStorage: {
      store: new Map(),
      getItem(k) { return this.store.has(k) ? this.store.get(k) : null },
      setItem(k, v) { this.store.set(k, String(v)) },
      removeItem(k) { this.store.delete(k) },
    },
    addEventListener: (type, fn) => { (env.windowListeners ??= {})[type] = (env.windowListeners[type] || 0) + 1 },
    removeEventListener: (type) => { if (env.windowListeners?.[type] > 0) env.windowListeners[type] -= 1 },
    setTimeout: (fn) => { env.timers.push({ fn }); return env.timers.length - 1 },
    clearTimeout: (id) => { if (env.timers[id]) env.timers[id] = null },
    requestAnimationFrame: (fn) => { env.rafs.push(fn); return env.rafs.length - 1 },
    cancelAnimationFrame: (id) => { if (env.rafs[id]) env.rafs[id] = null },
  }
  env.windowListeners = {}
  env.MutationObserver = class {
    constructor(cb) { this.cb = cb; this.observed = []; this.disconnected = false; env.moInstances.push(this) }
    observe(target, opts) { this.observed.push({ target, opts }) }
    disconnect() { this.disconnected = true }
  }
  env.KeyboardEvent = class KeyboardEvent {
    constructor(type, init = {}) { this.type = type; Object.assign(this, init) }
  }
  env.navigator = {
    clipboard: { writeText: (text) => { env.clipboardWrites.push(text); return Promise.resolve() } },
  }
  /** Run every queued (uncancelled) fake timer once. */
  env.flushTimers = () => {
    const due = env.timers.filter(Boolean)
    env.timers.length = 0
    for (const row of due) row.fn()
    return due.length
  }
  env.listenerCount = (target, type) => {
    const source = target === 'window' ? env.windowListeners : env.listeners
    return (source[type] || []).length ?? source[type] ?? 0
  }
  return env
}

const GLOBAL_KEYS = ['document', 'window', 'MutationObserver', 'KeyboardEvent', 'navigator']
function installGlobals(env) {
  for (const key of GLOBAL_KEYS) env.prev[key] = globalThis[key]
  // `navigator` is a getter-only global in Node: swap the descriptor.
  env.prevNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  for (const key of GLOBAL_KEYS) {
    if (key === 'navigator') Object.defineProperty(globalThis, key, { value: env[key], configurable: true, writable: true })
    else globalThis[key] = env[key]
  }
}
function uninstallGlobals(env) {
  if (env.prevNavigator) Object.defineProperty(globalThis, 'navigator', env.prevNavigator)
  for (const key of GLOBAL_KEYS) {
    if (key === 'navigator') continue
    if (env.prev[key] === undefined) delete globalThis[key]
    else globalThis[key] = env.prev[key]
  }
}

/** A fake SettingsScope: getSnapshot/subscribe/set over a mutable value. */
function makeScope(initialValue) {
  let value = { ...(initialValue || {}) }
  const subs = new Set()
  return {
    getSnapshot: () => ({ status: 'ready', value, base: {}, user: {}, revision: 0, writable: true, mode: 'host' }),
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn) },
    set: (field, next) => { value = { ...value, [field]: next }; for (const fn of [...subs]) fn(); return Promise.resolve() },
    subscribeCount: () => subs.size,
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

/** A fake client plugin context (slots inject/register + soft gets). */
function makeCtx() {
  const declared = new Set(['settings.section', 'settings.general.item', 'sidebar.workspaces.session.menu.item'])
  const env = {
    injects: [],
    registrations: [],
    locales: [],
    effect: (callback) => callback(),
    locale: {
      register: (namespace, messages) => {
        const row = { namespace, messages, retired: false }
        env.locales.push(row)
        return () => { row.retired = true }
      },
    },
    slots: {
      inject: (key, cb) => {
        const row = { key, retired: false }
        env.injects.push(row)
        let inner = null
        if (declared.has(key)) inner = cb()
        return () => { row.retired = true; if (inner) inner() }
      },
      register: (opts, comp) => {
        const row = { key: opts.name, opts, comp, retired: false }
        env.registrations.push(row)
        return () => { row.retired = true }
      },
    },
  }
  env.slots.inject.env = env
  const ctx = { ...env, get: () => undefined }
  return ctx
}

/** Minimal React and host primitives for the native session menu component. */
function makeMenuDeps() {
  let failed = false
  return {
    react: {
      createElement: (type, props, ...children) => ({ type, props, children }),
      useState: () => [failed, (next) => { failed = next }],
    },
    primitives: { MenuItemButton: 'menu-item', IconCopyOutlineRegular: 'copy-icon' },
  }
}

const sessionsSnap = {
  phase: 'ready',
  byId: {
    s1: { id: 's1', displayTitle: 'S1', updatedAt: 100, retainedBy: { mainView: 0 } },
    s2: { id: 's2', displayTitle: 'S2', updatedAt: 300, retainedBy: { mainView: 1 } },
    s3: { id: 's3', displayTitle: 'S3', updatedAt: 50, retainedBy: { mainView: 0 } },
  },
  ids: ['s1', 's2', 's3'],
}
const workspacesSnap = {
  phase: 'ready',
  items: [
    { workspaceId: 'w-b', path: '/w/b', title: 'b', sessionIds: ['s2', 's3'] },
    { workspaceId: 'w-a', path: '/w/a', title: 'a', sessionIds: ['s1'] },
  ],
  archivedSessionIds: [],
}

/**
 * A grouped workspace tree shaped like the host renders it: one role="tree"
 * div whose direct children are two group sections (DOM order follows the
 * workspaces fixture); each section holds a span-wrapped header row
 * (treeitem + aria-expanded) and one span-wrapped session row per visible
 * session.
 */
function makeWorkspaceTree(env) {
  const tree = makeElement('div')
  tree.setAttribute('role', 'tree')
  const makeSection = (titleText, sessionIds) => {
    const section = makeElement('div')
    const headerWrap = makeElement('span')
    const header = makeElement('div')
    header.setAttribute('role', 'treeitem')
    header.setAttribute('aria-expanded', 'true')
    header.textContent = titleText
    headerWrap.appendChild(header)
    section.appendChild(headerWrap)
    const rows = {}
    for (const sessionId of sessionIds) {
      const wrap = makeElement('span')
      const row = makeElement('div')
      row.setAttribute('role', 'treeitem')
      row.setAttribute('aria-selected', sessionId === 's2' ? 'true' : 'false')
      row.textContent = sessionId
      // The host row renders its displayTitle as the row's first text (title
      // span, then the time label — probe evidence dom.json); the row layer
      // anchors its pairing on that text, so the styled wrapper carries it.
      wrap.textContent = sessionsSnap.byId[sessionId]
        ? sessionsSnap.byId[sessionId].displayTitle
        : sessionId
      wrap.appendChild(row)
      section.appendChild(wrap)
      rows[sessionId] = wrap
    }
    return { section, rows }
  }
  const b = makeSection('b', ['s2', 's3'])
  const a = makeSection('a', ['s1'])
  tree.children.push(b.section)
  tree.children.push(a.section)
  env.document.querySelectorAll = (sel) => (sel === '[role="tree"]' ? [tree] : [])
  return {
    tree,
    sections: { b: b.section, a: a.section },
    rows: { ...b.rows, ...a.rows },
  }
}

function featureUrl(name) {
  return new URL(`features/${name}/src/index.js`, root)
}

// ---------------------------------------------------------------------------
// Tests.
// ---------------------------------------------------------------------------

test('the ux-plus switch keys are exactly the four frozen feature ids', async () => {
  for (const name of FROZEN) {
    const { feature } = await import(featureUrl(name).href)
    assert.equal(feature.id, name)
    assert.equal(typeof feature.title, 'string')
    assert.equal(typeof feature.host, 'function')
    assert.equal(typeof feature.client, 'function')
  }
  const host = await import(new URL('src/index.js', root).href)
  const ctx = {}
  const dispose = host.apply(ctx)
  assert.deepEqual(Object.keys(host.Config({}).get()).sort(), [...FROZEN].sort())
  dispose()
})

test('source imports use declared dependencies, shell seeds, or relative paths', async () => {
  const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
  const allowed = [...SEEDS, ...Object.keys(manifest.dependencies || {})]
  const files = [
    'src/index.js',
    'src/ui-tweak.js',
    'src/client.js',
    'src/switches.js',
    ...FROZEN.map((name) => `features/${name}/src/index.js`),
  ]
  for (const file of files) {
    const text = await readFile(new URL(file, root), 'utf8')
    const specs = new Set()
    for (const match of text.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) specs.add(match[1])
    for (const match of text.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.add(match[1])
    for (const match of text.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.add(match[1])
    const foreign = [...specs].filter((spec) => !spec.startsWith('./') && !spec.startsWith('../') && !allowed.includes(spec))
    assert.deepEqual(foreign, [], `${file} imports non-seed specifiers: ${foreign.join(', ')}`)
  }
})

test('conversation-typography: mount injects the style and row, dispose removes them', async () => {
  const env = makeEnv()
  installGlobals(env)
  try {
    const { feature } = await import(featureUrl('conversation-typography').href)
    const scope = makeScope({})
    const ctx = makeCtx()
    const dispose = feature.client(ctx, { tweakScope: scope, react: {} })
    assert.equal(env.document.head.children.length, 1)
    const tag = env.document.head.children[0]
    assert.equal(tag.dataset.plugin, 'dsh-ux-plus')
    assert.ok(tag.textContent.includes('--dsh-chat-content-width: 920px'), 'default width preset l = 920px')
    const row = ctx.registrations.find((r) => r.key === 'settings.general.item' && r.opts.id === 'ui-tweak')
    assert.ok(row, 'the ui-tweak row registers into settings.general.item')
    assert.equal(row.opts.order, 20)
    assert.equal(scope.subscribeCount(), 1)
    scope.set('chatWidth', 's')
    assert.ok(tag.textContent.includes('--dsh-chat-content-width: 680px'), 'preset change rewrites the injected css in place')
    dispose()
    assert.equal(env.document.head.children.length, 0, 'dispose removes the style tag')
    assert.equal(scope.subscribeCount(), 0, 'dispose unsubscribes')
    assert.ok(row.retired, 'dispose retires the settings row')
    dispose()
    assert.equal(env.document.head.children.length, 0, 'double dispose is a no-op')
  } finally {
    uninstallGlobals(env)
  }
})

test('workspace-session-menu: native row copies its exact session ID and cleanup retires the slot and locale', async () => {
  const env = makeEnv()
  installGlobals(env)
  try {
    const { feature } = await import(featureUrl('workspace-session-menu').href)
    const ctx = makeCtx()
    const dispose = feature.client(ctx, makeMenuDeps())
    const row = ctx.registrations.find((entry) => entry.key === 'sidebar.workspaces.session.menu.item')
    assert.ok(row, 'the action registers into the host session-menu slot')
    assert.equal(row.opts.id, 'dsh-ux-plus.copy-session-id')
    assert.equal(ctx.locales[0].namespace, row.opts.locale)
    assert.equal(ctx.locales[0].messages.zh.copy, '会话ID')
    assert.equal(env.listenerCount('document', 'pointerdown'), 0)
    assert.equal(env.moInstances.length, 0)
    const openStates = []
    const item = row.comp({ sessionId: 's2', useMenuOpenState: () => [true, (open) => openStates.push(open)], t: (key) => key })
    env.document.execCommand = (command) => {
      assert.equal(command, 'copy')
      assert.equal(env.document.body.children[0].value, 's2')
      return true
    }
    await item.props.onSelect()
    assert.deepEqual(env.clipboardWrites, ['s2'])
    assert.deepEqual(openStates, [false], 'successful copy closes the owning menu')
    assert.equal(env.document.body.children.length, 0, 'the temporary textarea is removed')
    dispose()
    assert.ok(row.retired, 'cleanup removes the native menu registration')
    assert.ok(ctx.injects[0].retired, 'cleanup retires the slot injection')
    assert.ok(ctx.locales[0].retired, 'cleanup removes the locale registration')
  } finally {
    uninstallGlobals(env)
  }
})

test('workspace-session-menu: denied clipboard access keeps the menu open and shows retry text', async () => {
  const env = makeEnv()
  installGlobals(env)
  let dispose
  try {
    env.navigator.clipboard.writeText = async () => { throw new Error('clipboard denied') }
    env.document.execCommand = () => false
    const { feature } = await import(featureUrl('workspace-session-menu').href)
    const ctx = makeCtx()
    dispose = feature.client(ctx, makeMenuDeps())
    const row = ctx.registrations[0]
    const openStates = []
    const props = { sessionId: 's3', useMenuOpenState: () => [true, (open) => openStates.push(open)], t: (key) => key }
    await row.comp(props).props.onSelect()
    assert.deepEqual(openStates, [], 'failure preserves the open menu for a retry')
    assert.deepEqual(row.comp(props).children, ['failed'])
    assert.equal(env.document.body.children.length, 0)
  } finally {
    dispose?.()
    uninstallGlobals(env)
  }
})

test('workspace-recency-order: group + row visual reorder, teardown restores', async () => {
  const env = makeEnv()
  installGlobals(env)
  try {
    const { tree, sections, rows } = makeWorkspaceTree(env)
    const { feature } = await import(featureUrl('workspace-recency-order').href)
    const sessionsStore = makeListStore(sessionsSnap)
    const workspacesStore = makeListStore(workspacesSnap)
    const ctx = makeCtx()
    const dispose = feature.client(ctx, {
      sessions: { list: sessionsStore },
      workspaces: { list: workspacesStore },
    })
    assert.equal(sessionsStore.subscribeCount(), 1)
    assert.equal(workspacesStore.subscribeCount(), 1)
    // The recency feature installs no document/window listeners at all
    // (the legacy view gate is gone): only the body observer + list subs.
    assert.equal(env.listenerCount('document', 'click'), 0)
    assert.equal(env.windowListeners.storage, undefined)
    assert.equal(env.moInstances.length, 1)
    env.flushTimers()
    // Group layer: the fresher workspace (b: s2 @ 300) before a (s1 @ 100).
    assert.equal(tree.style.display, 'flex')
    assert.equal(tree.style.flexDirection, 'column')
    assert.equal(sections.b.style.order, '0', 'the fresher workspace sorts first')
    assert.equal(sections.b.style.marginTop, '0px')
    assert.equal(sections.a.style.order, '1')
    assert.equal(sections.a.style.marginTop, '4px')
    // Row layer: b's own rows by session recency (s2 @ 300 before s3 @ 50).
    assert.equal(rows.s2.style.order, '10')
    assert.equal(rows.s3.style.order, '11')
    assert.equal(rows.s1.style.order, '10', 'a single row keeps rank 0 in its section')
    assert.equal(rows.s2.style.flexShrink, '0')

    dispose()
    assert.equal(tree.style.display, undefined, 'teardown restores the cached original display')
    assert.equal(sections.b.style.order, undefined)
    assert.equal(rows.s2.style.order, undefined)
    assert.equal(env.listenerCount('document', 'click'), 0)
    assert.equal(sessionsStore.subscribeCount(), 0)
    assert.equal(workspacesStore.subscribeCount(), 0)
    assert.equal(env.moInstances[0].disconnected, true)
  } finally {
    uninstallGlobals(env)
  }
})

test('the D5 switch engine mounts and disposes each feature per switch value', async () => {
  const env = makeEnv()
  installGlobals(env)
  try {
    // Give recency-order a grouped tree so its mount is fully exercisable.
    const { tree, sections } = makeWorkspaceTree(env)

    const { mountFeatures } = await import(new URL('src/switches.js', root).href)
    const uxScope = makeScope({})
    const ctx = makeCtx()
    const deps = {
      ...makeMenuDeps(),
      tweakScope: makeScope({}),
      sessions: { list: makeListStore(sessionsSnap) },
      workspaces: { list: makeListStore(workspacesSnap) },
    }
    const disposeAll = mountFeatures(ctx, deps, uxScope)
    assert.equal(uxScope.subscribeCount(), 1)
    assert.equal(env.document.head.children.length, 1) // typography style
    const menu = () => ctx.registrations.filter((row) => row.key === 'sidebar.workspaces.session.menu.item' && !row.retired)
    assert.equal(menu().length, 1)
    assert.equal(env.listenerCount('document', 'pointerdown'), 0)
    assert.equal(env.listenerCount('document', 'click'), 0) // recency-order installs none
    assert.equal(env.windowListeners.storage, undefined)
    assert.equal(env.moInstances.length, 2)
    env.flushTimers()
    assert.equal(tree.style.display, 'flex', 'recency-order applied the visual order')

    await uxScope.set('workspace-session-menu', false)
    assert.equal(menu().length, 0, 'off removes the native menu row immediately')
    assert.ok(ctx.locales.every((row) => row.retired), 'off removes the menu locale')
    assert.equal(env.document.head.children.length, 1, 'the other features stay on')
    await uxScope.set('workspace-session-menu', true)
    assert.equal(menu().length, 1, 'on re-registers the native menu row immediately')

    await uxScope.set('conversation-typography', false)
    assert.equal(env.document.head.children.length, 0, 'typography off removes the style tag')
    await uxScope.set('conversation-typography', true)
    assert.equal(env.document.head.children.length, 1)

    await uxScope.set('workspace-recency-order', false)
    assert.equal(sections.b.style.order, undefined, 'teardown restored the section styles')
    assert.equal(tree.style.display, undefined, 'teardown restored the tree')
    await uxScope.set('workspace-recency-order', true)
    env.flushTimers()
    assert.equal(tree.style.display, 'flex', 'on re-applies the visual order')

    disposeAll()
    assert.equal(menu().length, 0)
    assert.ok(ctx.locales.every((row) => row.retired))
    assert.equal(env.document.head.children.length, 0)
    assert.equal(env.listenerCount('document', 'pointerdown'), 0)
    assert.equal(env.listenerCount('document', 'click'), 0)
    assert.equal(env.windowListeners.storage, undefined)
    assert.equal(uxScope.subscribeCount(), 0, 'the plugin disposer stops the switch sync')
  } finally {
    uninstallGlobals(env)
  }
})
