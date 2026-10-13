/**
 * P3 switch-engine tests (plain Node, no browser, no React):
 *
 *   - the `ux-plus` switch keys are exactly the five frozen feature ids;
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
const FROZEN = ['conversation-typography', 'workspace-session-menu', 'workspace-recency-order', 'tool-ask-question-expanded', 'workspace-session-inherit']

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
    primitives: { MenuItemButton: 'menu-item', IconCopyOutlineRegular: 'copy-icon', IconRightUpOutlineRegular: 'inherit-icon' },
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

/** Flush pending microtasks (the inherit picker flow is a pure promise chain). */
async function flush(times = 16) {
  for (let i = 0; i < times; i += 1) await Promise.resolve()
}

/** Concatenated textContent of a fake element subtree (no cycles like JSON.stringify). */
function allText(node) {
  let out = node.textContent || ''
  for (const child of node.children || []) out += ` ${allText(child)}`
  return out
}

/** Fake remote/services for the inherit feature; overrides replace remote.session members. */
function makeInheritEnv(overrides = {}) {
  const calls = { create: [], selectModel: [], prompt: [], opened: [] }
  const ctx = makeCtx()
  ctx.get = (serviceName) => (serviceName === 'uiWorkspace'
    ? { openSession: (id) => calls.opened.push(id) }
    : undefined)
  ctx.remote = {
    session: {
      modelCatalog: async () => ({
        ok: true,
        value: {
          groups: [{
            id: 'p1',
            name: 'Provider 1',
            models: [{ id: 'm1', name: 'Model One', description: 'first' }, { id: 'm2', name: 'Model Two' }],
          }],
        },
      }),
      selectModel: async (req) => { calls.selectModel.push(req); return { ok: true, value: undefined } },
      prompt: async (req) => { calls.prompt.push(req); return { ok: true, value: undefined } },
      ...overrides,
    },
  }
  const deps = {
    ...makeMenuDeps(),
    sessions: { create: async (opts) => { calls.create.push(opts); return `new-${calls.create.length}` } },
    workspaces: { list: makeListStore(workspacesSnap) },
  }
  return { ctx, deps, calls }
}

// ---------------------------------------------------------------------------
// Tests.
// ---------------------------------------------------------------------------

test('the ux-plus switch keys are exactly the five frozen feature ids', async () => {
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
    // Styles are counted per owner: the ask-question accent (W-14) is its own
    // lifecycle, and the typography assertions below must not absorb it.
    const accentStyles = () =>
      env.document.head.children.filter((c) => c.attributes['data-feature'] === 'tool-ask-question-expanded')
    const otherStyles = () =>
      env.document.head.children.filter(
        (c) => c.tagName === 'STYLE' && c.attributes['data-feature'] !== 'tool-ask-question-expanded',
      )
    assert.equal(uxScope.subscribeCount(), 1)
    assert.equal(otherStyles().length, 1) // typography style
    assert.equal(accentStyles().length, 1, 'the ask-question accent style is mounted')
    const menuRows = (id) => ctx.registrations.filter((row) => row.opts.id === id && !row.retired)
    assert.equal(menuRows('dsh-ux-plus.copy-session-id').length, 1)
    assert.equal(menuRows('dsh-ux-plus.inherit-session').length, 1, 'the inherit row registers alongside the copy row')
    assert.equal(env.listenerCount('document', 'pointerdown'), 1, 'the inherit feature tracks the click anchor')
    assert.equal(env.listenerCount('document', 'click'), 0) // recency-order installs none
    assert.equal(env.windowListeners.storage, undefined)
    assert.equal(env.moInstances.length, 2)
    env.flushTimers()
    assert.equal(tree.style.display, 'flex', 'recency-order applied the visual order')

    await uxScope.set('workspace-session-menu', false)
    assert.equal(menuRows('dsh-ux-plus.copy-session-id').length, 0, 'off removes the native menu row immediately')
    assert.ok(ctx.locales.filter((row) => row.namespace === 'ux-plus-session-menu').every((row) => row.retired), 'off removes the menu locale')
    assert.equal(otherStyles().length, 1, 'the other features stay on')
    await uxScope.set('workspace-session-menu', true)
    assert.equal(menuRows('dsh-ux-plus.copy-session-id').length, 1, 'on re-registers the native menu row immediately')

    await uxScope.set('conversation-typography', false)
    assert.equal(otherStyles().length, 0, 'typography off removes the style tag')
    await uxScope.set('conversation-typography', true)
    assert.equal(otherStyles().length, 1)

    await uxScope.set('tool-ask-question-expanded', false)
    assert.equal(accentStyles().length, 0, 'ask-question off removes the accent style')
    await uxScope.set('tool-ask-question-expanded', true)
    assert.equal(accentStyles().length, 1, 'ask-question on re-installs the accent style')

    await uxScope.set('workspace-recency-order', false)
    assert.equal(sections.b.style.order, undefined, 'teardown restored the section styles')
    assert.equal(tree.style.display, undefined, 'teardown restored the tree')
    await uxScope.set('workspace-recency-order', true)
    env.flushTimers()
    assert.equal(tree.style.display, 'flex', 'on re-applies the visual order')

    await uxScope.set('workspace-session-inherit', false)
    assert.equal(menuRows('dsh-ux-plus.inherit-session').length, 0, 'off removes the inherit menu row')
    assert.equal(env.listenerCount('document', 'pointerdown'), 0, 'off removes the click anchor tracker')
    await uxScope.set('workspace-session-inherit', true)
    assert.equal(menuRows('dsh-ux-plus.inherit-session').length, 1, 'on re-registers the inherit menu row')
    assert.equal(env.listenerCount('document', 'pointerdown'), 1, 'on re-installs the click anchor tracker')

    disposeAll()
    assert.equal(menuRows('dsh-ux-plus.copy-session-id').length, 0)
    assert.equal(menuRows('dsh-ux-plus.inherit-session').length, 0)
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

test('workspace-session-inherit: menu row opens the picker, inherits via create/selectModel/prompt/open', async () => {
  const env = makeEnv()
  installGlobals(env)
  let dispose
  try {
    const { feature } = await import(featureUrl('workspace-session-inherit').href)
    const { ctx, deps, calls } = makeInheritEnv()
    dispose = feature.client(ctx, deps)
    const row = ctx.registrations.find((entry) => entry.opts.id === 'dsh-ux-plus.inherit-session')
    assert.ok(row, 'the action registers into the host session-menu slot')
    assert.equal(row.opts.order, 60, 'the row sits after the copy row (50) and before the host pin (100)')
    assert.equal(ctx.locales[0].namespace, row.opts.locale)
    assert.equal(ctx.locales[0].messages.zh.inherit, '继承对话')
    assert.ok(ctx.locales[0].messages.zh.prompt.includes('{sessionId}'))
    assert.ok(ctx.locales[0].messages.zh.prompt.includes('越近轮次'))
    assert.ok(ctx.locales[0].messages.en.prompt.includes('{sessionId}'))

    const openStates = []
    const t = (key) => (key === 'prompt' ? '{sessionId}::X' : key)
    const item = row.comp({ sessionId: 's2', useMenuOpenState: () => [true, (open) => openStates.push(open)], t })
    assert.equal(item.children[0], 'inherit')
    item.props.onSelect()
    assert.deepEqual(openStates, [false], 'opening the picker dismisses the owning menu')
    const container = env.document.body.children[0]
    assert.ok(container, 'the picker mounts into document.body')
    assert.equal(container.attributes['data-dsh-ux-plus'], 'session-inherit')
    assert.equal(container.attributes.role, 'dialog')
    assert.ok(allText(container).includes('loading'), 'the catalog loads before rows appear')
    await flush()
    const panel = container.children[0]
    const modelRows = panel.children.filter((child) => child.attributes['data-model'])
    assert.deepEqual(modelRows.map((child) => child.attributes['data-model']), ['p1/m1', 'p1/m2'])
    assert.ok(allText(panel).includes('Provider 1'), 'provider groups are labelled')
    assert.ok(allText(modelRows[0]).includes('first'), 'a model description is shown')

    modelRows[0].onclick()
    await flush()
    assert.deepEqual(calls.create, [{ workspaceId: 'w-b' }], 'the new session joins the source workspace (s2 lives in w-b)')
    assert.deepEqual(calls.selectModel, [{ sessionId: 'new-1', provider: 'p1', model: 'm1' }])
    assert.equal(calls.prompt.length, 1)
    const request = calls.prompt[0]
    assert.equal(request.sessionId, 'new-1')
    assert.equal(request.mode, 'queue')
    assert.deepEqual(request.content, [{ type: 'text', text: 's2::X' }], 'the prompt carries the source session ID')
    assert.equal(typeof request.requestId, 'string')
    assert.ok(request.requestId.length > 0)
    assert.deepEqual(calls.opened, ['new-1'], 'the fresh session opens in the current view')
    assert.equal(env.document.body.children.length, 0, 'success closes the picker')

    // Second opening: dismissal paths.
    item.props.onSelect()
    const second = env.document.body.children[0]
    await flush()
    env.listeners.pointerdown[1].fn({ target: second })
    assert.ok(second.isConnected, 'a click inside the picker keeps it open')
    env.listeners.keydown[0].fn({ key: 'Escape' })
    assert.equal(env.document.body.children.length, 0, 'Escape closes the picker')

    item.props.onSelect()
    const third = env.document.body.children[0]
    await flush()
    const closeButton = third.children[0].children[0].children[1]
    assert.equal(closeButton.textContent, '×')
    closeButton.onclick()
    assert.equal(env.document.body.children.length, 0, 'the header cross closes the picker')

    item.props.onSelect()
    const fourth = env.document.body.children[0]
    await flush()
    env.listeners.pointerdown[1].fn({ target: makeElement('div') })
    assert.equal(env.document.body.children.length, 0, 'an outside click closes the picker')

    dispose()
    dispose = undefined
    assert.ok(row.retired, 'cleanup removes the native menu registration')
    assert.ok(ctx.locales[0].retired, 'cleanup removes the locale registration')
    assert.equal(env.listenerCount('document', 'pointerdown'), 0, 'cleanup removes the click anchor tracker')
  } finally {
    dispose?.()
    uninstallGlobals(env)
  }
})

test('workspace-session-inherit: a failed inherit keeps the picker open and a retry reuses the session', async () => {
  const env = makeEnv()
  installGlobals(env)
  let dispose
  try {
    const { feature } = await import(featureUrl('workspace-session-inherit').href)
    let selectFails = true
    const { ctx, deps, calls } = makeInheritEnv({
      selectModel: async (req) => {
        calls.selectModel.push(req)
        return selectFails
          ? { ok: false, error: { code: 'session/model-unavailable' } }
          : { ok: true, value: undefined }
      },
    })
    dispose = feature.client(ctx, deps)
    const row = ctx.registrations.find((entry) => entry.opts.id === 'dsh-ux-plus.inherit-session')
    const item = row.comp({ sessionId: 's1', useMenuOpenState: () => [true, () => {}], t: (key) => key })
    item.props.onSelect()
    await flush()
    const container = env.document.body.children[0]
    const modelRow = container.children[0].children.find((child) => child.attributes['data-model'] === 'p1/m1')
    modelRow.onclick()
    modelRow.onclick()
    await flush()
    assert.equal(calls.create.length, 1, 'a double click cannot start two inheritances')
    assert.equal(env.document.body.children.length, 1, 'a failed inherit keeps the picker open for a retry')
    assert.ok(allText(container).includes('startFailed'), 'the failure is surfaced in the picker')
    assert.deepEqual(calls.opened, [], 'a failed inherit does not open the session')

    selectFails = false
    modelRow.onclick()
    await flush()
    assert.equal(calls.create.length, 1, 'the retry reuses the session created by the first attempt')
    assert.deepEqual(calls.selectModel.map((req) => req.sessionId), ['new-1', 'new-1'])
    assert.deepEqual(calls.opened, ['new-1'])
    assert.equal(env.document.body.children.length, 0, 'the successful retry closes the picker')
  } finally {
    dispose?.()
    uninstallGlobals(env)
  }
})

test('workspace-session-inherit: catalog load failure and empty catalog render their states', async () => {
  const env = makeEnv()
  installGlobals(env)
  for (const [label, value] of [['load failure', { ok: false, error: { message: 'boom' } }], ['empty catalog', { ok: true, value: { groups: [] } }]]) {
    try {
      const { feature } = await import(featureUrl('workspace-session-inherit').href)
      const { ctx, deps } = makeInheritEnv({ modelCatalog: async () => value })
      const dispose = feature.client(ctx, deps)
      const row = ctx.registrations.find((entry) => entry.opts.id === 'dsh-ux-plus.inherit-session')
      row.comp({ sessionId: 's1', useMenuOpenState: () => [true, () => {}], t: (key) => key }).props.onSelect()
      const container = env.document.body.children[0]
      await flush()
      assert.equal(env.document.body.children.length, 1, `${label}: the picker stays open`)
      assert.ok(allText(container).includes(label === 'load failure' ? 'loadFailed' : 'empty'), label)
      assert.equal(container.children[0].children.filter((child) => child.attributes['data-model']).length, 0, `${label}: no model rows`)
      dispose()
    } finally {
      uninstallGlobals(env)
    }
    installGlobals(env)
  }
})

test('workspace-session-inherit: startInheritance falls back to a host-chosen workspace and surfaces remote failures', async () => {
  const env = makeEnv()
  installGlobals(env)
  try {
    const { startInheritance } = await import(featureUrl('workspace-session-inherit').href)
    const { ctx, deps, calls } = makeInheritEnv()
    await startInheritance({ ctx, deps, sessionId: 'unknown-session', provider: 'p9', model: 'm9', promptText: 'go', carry: {} })
    assert.deepEqual(calls.create, [{}], 'an unknown source session creates without a workspace (host default)')
    assert.deepEqual(calls.opened, ['new-1'])

    const promptFails = { ...ctx, remote: { session: { ...ctx.remote.session, prompt: async () => ({ ok: false, error: { code: 'session/conflict' } }) } } }
    await assert.rejects(
      startInheritance({ ctx: promptFails, deps, sessionId: 'unknown-session', provider: 'p9', model: 'm9', promptText: 'go', carry: {} }),
      /prompt failed/,
    )
    const throwing = { ...ctx, remote: { session: { ...ctx.remote.session, selectModel: async () => { throw new Error('remote down') } } } }
    await assert.rejects(
      startInheritance({ ctx: throwing, deps, sessionId: 'unknown-session', provider: 'p9', model: 'm9', promptText: 'go', carry: {} }),
      /remote down/,
    )
  } finally {
    uninstallGlobals(env)
  }
})
