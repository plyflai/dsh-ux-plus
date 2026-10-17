/**
 * attention-favicon feature tests (plain Node, fake DOM, driven timers):
 *
 *   - the pure layer model: three INDEPENDENT layers (whale breath on any
 *     running session, green whale on any unread, orange dot on any
 *     pending), freely composable, plus the subagent/blank exclusion;
 *   - the pure frame builders: the breath cosine is smooth at 20 fps
 *     (deltas ≤ 0.03, 35% floor, 72-frame cycle) and the blink keeps its
 *     450 ms / 2-of-3 duty cycle; the whale re-tint takes over the path fill
 *     and survives the splice; a whale without a hex fill rejects the base;
 *   - the client against a fake DOM: theme-mirrored overlay links, href
 *     cycling on the driven 50 ms tick, the static green whale (no timer),
 *     workspace parity (a finished CURRENT session without completionUnread
 *     lights nothing), the failed-fetch and untintable-base no-op
 *     degradations and a residue-free dispose.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

const mod = await import(new URL('../features/attention-favicon/src/index.js', import.meta.url))
const {
  computeFaviconLayers, layersKey, frameAt, isCountedSession, buildFrameSvg, svgDataUrl, buildFaviconHrefs,
  LIGHT_FAVICON_PATH, DARK_FAVICON_PATH, DARK_MEDIA, LIGHT_MEDIA, WHALE_GREEN, DOT_ORANGE,
  ORANGE_DOT, TICK_MS, BLINK_FRAMES, BREATH_FRAMES, feature, client,
} = mod

const LIGHT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" fill="none"><path d="M48 10L1 1" fill="#000" fill-opacity="1.000000"/></svg>'
const DARK_SVG = LIGHT_SVG.replace('fill="#000"', 'fill="#fff"')
const UNTINTABLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50"><path d="M48 10L1 1"/></svg>'

// ---------------------------------------------------------------------------
// Fakes.
// ---------------------------------------------------------------------------

function makeElement(tag) {
  const el = {
    tagName: String(tag).toUpperCase(),
    attributes: {},
    parentNode: null,
    dataset: {},
  }
  el.setAttribute = (k, v) => { el.attributes[k] = String(v) }
  el.getAttribute = (k) => (k in el.attributes ? el.attributes[k] : null)
  return el
}

function makeEnv(options = {}) {
  const env = {
    headChildren: [],
    intervals: [],
    fetchCalls: [],
    docEvents: [],
  }
  const detach = (child) => {
    const at = env.headChildren.indexOf(child)
    if (at !== -1) env.headChildren.splice(at, 1)
    child.parentNode = null
  }
  env.document = {
    visibilityState: 'visible',
    hidden: false,
    createElement: (tag) => makeElement(tag),
    addEventListener: (type, fn) => { env.docEvents.push({ type, fn }) },
    removeEventListener: (type, fn) => {
      const at = env.docEvents.findIndex((entry) => entry.type === type && entry.fn === fn)
      if (at !== -1) env.docEvents.splice(at, 1)
    },
    head: {
      appendChild: (child) => { child.parentNode = env.document.head; env.headChildren.push(child); return child },
      removeChild: detach,
    },
  }
  env.fireVisibility = () => {
    for (const entry of [...env.docEvents]) {
      if (entry.type === 'visibilitychange') entry.fn()
    }
  }
  env.window = {
    setInterval: (fn, ms) => { env.intervals.push({ fn, ms }); return env.intervals.length - 1 },
    clearInterval: (id) => { if (env.intervals[id]) env.intervals[id] = null },
  }
  env.activeIntervals = () => env.intervals.filter((interval) => interval !== null)
  env.tick = (n = 1) => {
    for (const interval of env.activeIntervals()) {
      for (let i = 0; i < n; i += 1) interval.fn()
    }
  }
  const light = options.lightFail ? null : (options.untintable ? UNTINTABLE_SVG : LIGHT_SVG)
  const dark = options.darkFail ? null : (options.untintable ? UNTINTABLE_SVG : DARK_SVG)
  env.fetch = async (path) => {
    env.fetchCalls.push(path)
    if (path === LIGHT_FAVICON_PATH && light === null) throw new Error('fetch failed')
    if (path === DARK_FAVICON_PATH && dark === null) throw new Error('fetch failed')
    const body = path === DARK_FAVICON_PATH ? dark : light
    return { ok: true, text: async () => body }
  }
  return env
}

function installGlobals(env) {
  const prev = { document: globalThis.document, window: globalThis.window, fetch: globalThis.fetch }
  globalThis.document = env.document
  globalThis.window = env.window
  globalThis.fetch = env.fetch
  return () => {
    globalThis.document = prev.document
    globalThis.window = prev.window
    globalThis.fetch = prev.fetch
  }
}

/**
 * The sessions SERVICE face as `ctx.get('sessions')` hands it over (src/client.js
 * `sessions: ctx.get('sessions')`): the store to subscribe to is its `list` —
 * the service itself has no `subscribe`/`getSnapshot`
 * (packages/api/session-controller/src/client/contract/sessions.ts:56).
 */
function makeSessions(byId) {
  const subs = []
  const list = {
    subs,
    getSnapshot: () => ({ phase: 'ready', byId }),
    subscribe: (fn) => { subs.push(fn); return () => { const at = subs.indexOf(fn); if (at !== -1) subs.splice(at, 1) } },
    emit: () => { for (const fn of [...subs]) fn() },
  }
  return { list, retainInfo: () => ({ subscribe: () => () => {}, getSnapshot: () => ({ retainedBy: {} }) }) }
}

function makeStatus(initial = new Map()) {
  const subs = []
  let map = initial
  return {
    getSnapshot: () => map,
    set: (next) => { map = next },
    subscribe: (fn) => { subs.push(fn); return () => { const at = subs.indexOf(fn); if (at !== -1) subs.splice(at, 1) } },
    emit: () => { for (const fn of [...subs]) fn() },
    subs,
  }
}

const session = (id, extra = {}) => ({ id, blank: false, origin: undefined, retainedBy: { mainView: 0 }, ...extra })
const status = (extra = {}) => ({ running: undefined, pendingInteraction: undefined, completionUnread: false, ...extra })
const layers = (over = {}) => ({ breathing: false, greenWhale: false, orange: false, ...over })

/** Flush the client's async base loads (two chained fetches). */
async function settled() {
  for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setTimeout(resolve, 0))
}

function mount(env, sessions, uiSession) {
  const restore = installGlobals(env)
  const dispose = client({}, { sessions, uiSession })
  return { dispose, restore }
}

const hrefOf = (env, which = 'light') => {
  const link = env.headChildren.find((el) => (el.getAttribute('media') === DARK_MEDIA) === (which === 'dark'))
  return link ? decodeURIComponent(link.getAttribute('href') || '') : null
}

// ---------------------------------------------------------------------------
// Pure layer model.
// ---------------------------------------------------------------------------

test('layers: nothing up when nothing runs, waits or finished unread', () => {
  assert.deepEqual(computeFaviconLayers([]), layers())
  assert.deepEqual(computeFaviconLayers([status({ running: false })]), layers())
})

test('layers: ANY running session breathes the whale (mixed included)', () => {
  assert.deepEqual(computeFaviconLayers([status({ running: true })]), layers({ breathing: true }))
  assert.deepEqual(
    computeFaviconLayers([status({ running: true }), status({ running: false })]),
    layers({ breathing: true }),
    'a mixed workspace still breathes',
  )
})

test('layers: a session waiting on your click does not breathe the whale', () => {
  assert.deepEqual(
    computeFaviconLayers([status({ running: true, pending: true })]),
    layers({ orange: true }),
    'the host keeps blocked-on-ask_user sessions running=true — waiting is the dot, not the breath',
  )
  assert.deepEqual(
    computeFaviconLayers([status({ running: true, pending: true }), status({ running: true })]),
    layers({ breathing: true, orange: true }),
    'one waiting, one computing — the computing one breathes',
  )
})

test('layers: green whale from unread, orange from pending, all three compose', () => {
  assert.deepEqual(computeFaviconLayers([status({ unread: true })]), layers({ greenWhale: true }))
  assert.deepEqual(computeFaviconLayers([status({ pending: true })]), layers({ orange: true }))
  assert.deepEqual(
    computeFaviconLayers([status({ running: true }), status({ unread: true }), status({ pending: true })]),
    layers({ breathing: true, greenWhale: true, orange: true }),
    'a fading green whale with a blinking orange dot',
  )
  assert.equal(layersKey(layers({ breathing: true, greenWhale: true, orange: true })), '111')
  assert.equal(layersKey(layers()), '000')
})

test('counted filter: subagents and blanks stay out of every count', () => {
  assert.equal(isCountedSession(session('a')), true)
  assert.equal(isCountedSession(session('b', { origin: 'subagent' })), false)
  assert.equal(isCountedSession(session('c', { blank: true })), false)
  assert.equal(isCountedSession(undefined), false)
})

// ---------------------------------------------------------------------------
// Frame cycles: a true fade, not a flicker.
// ---------------------------------------------------------------------------

test('breath cycle: 72 frames at 20 fps, smooth cosine, 35% floor', () => {
  assert.equal(BREATH_FRAMES.length, 72)
  assert.equal(BREATH_FRAMES[0], 1)
  assert.equal(Math.min(...BREATH_FRAMES), 0.35, 'the floor keeps a throttled-frozen whale visible')
  let maxDelta = 0
  for (let i = 0; i < BREATH_FRAMES.length; i += 1) {
    const next = BREATH_FRAMES[(i + 1) % BREATH_FRAMES.length]
    maxDelta = Math.max(maxDelta, Math.abs(next - BREATH_FRAMES[i]))
  }
  assert.ok(maxDelta < 0.031, `consecutive frames differ by at most 0.03 (got ${maxDelta}) — smooth at 20 fps`)
  const down = BREATH_FRAMES.slice(0, 37)
  assert.deepEqual([...down].sort((a, b) => a - b), [...down].reverse(), 'the first half fades out monotonically')
})

test('frameAt: cycles advance per tick and idle layers stand still', () => {
  assert.deepEqual(frameAt(layers({ breathing: true }), 0), { breathOpacity: 1, orangeOn: false })
  assert.equal(frameAt(layers({ breathing: true }), 36).breathOpacity, 0.35, 'the trough sits mid-cycle')
  assert.equal(frameAt(layers({ breathing: true }), 72).breathOpacity, 1, 'the cycle wraps')
  assert.deepEqual(
    [0, 3, 6, 9].map((t) => frameAt(layers({ orange: true }), t).orangeOn),
    [true, true, false, true],
    'the blink keeps its 450 ms rhythm: 3 ticks per frame, visible 2 of 3',
  )
  assert.equal(frameAt(layers({ orange: true }), 7).orangeOn, false, 'the off frame spans its 3 ticks')
  assert.deepEqual(frameAt(layers(), 7), { breathOpacity: 1, orangeOn: false })
})

test('frameAt: hidden mode advances the blink one frame per tick', () => {
  // Chrome clamps hidden timers to ~1 tick/second; holding each blink frame
  // for 3 ticks would stretch the blink to seconds per state. Per-tick
  // advancement keeps ~one transition per second, duty still 2-of-3 (a
  // frozen frame shows the alert).
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5].map((t) => frameAt(layers({ orange: true }), t, true).orangeOn),
    [true, true, false, true, true, false],
    'one blink frame per tick, same 2-on-1-off duty',
  )
  assert.equal(frameAt(layers({ orange: true }), 2, false).orangeOn, true, 'visible mode still holds frames')
})

// ---------------------------------------------------------------------------
// Pure frame builders.
// ---------------------------------------------------------------------------

test('green whale: the path fill is taken over, the whale survives', () => {
  const green = buildFrameSvg(LIGHT_SVG, { greenWhale: true })
  assert.ok(green.startsWith('<svg') && green.endsWith('</svg>'))
  assert.ok(green.includes(`fill="${WHALE_GREEN}"`), 'the whale is green')
  assert.ok(!green.includes('fill="#000"'), 'the black fill is gone')
  assert.ok(green.includes('fill="none"'), 'the root fill is untouched')
  assert.ok(green.includes('d="M48 10L1 1"'), 'the whale path survives')
  assert.ok(!green.includes('<circle'), 'no dots of any kind in the green whale')
  const dark = buildFrameSvg(DARK_SVG, { greenWhale: true })
  assert.ok(dark.includes(`fill="${WHALE_GREEN}"`) && !dark.includes('fill="#fff"'), 'the dark whale tints too')
})

test('breath group wraps the whale; the dot does not breathe', () => {
  const breath = buildFrameSvg(LIGHT_SVG, { breathOpacity: 0.55, orangeOn: true })
  assert.ok(breath.includes('<g opacity="0.55">'))
  assert.ok(breath.indexOf('<g opacity') < breath.indexOf('d="M48'), 'the group wraps the whale')
  assert.ok(breath.indexOf('</g>') < breath.indexOf('<circle'), 'the orange dot sits OUTSIDE the group')
  assert.ok(breath.includes(DOT_ORANGE))
  assert.ok(breath.includes(`cx="${ORANGE_DOT.cx}"`))
})

test('splice edges: empty frame returns base, blink-off drops the dot, bad bases reject', () => {
  assert.equal(buildFrameSvg(LIGHT_SVG, {}), LIGHT_SVG)
  const off = buildFrameSvg(LIGHT_SVG, { greenWhale: true, orangeOn: true, orangeOpacity: 0 })
  assert.ok(off.includes(WHALE_GREEN) && !off.includes('<circle'), 'orange off, whale stays green')
  assert.equal(buildFrameSvg('not an svg', { greenWhale: true }), null)
  assert.equal(buildFrameSvg(null, { greenWhale: true }), null)
  assert.equal(buildFrameSvg(UNTINTABLE_SVG, { greenWhale: true }), null, 'a whale without a hex fill rejects the base')
  assert.ok(buildFrameSvg(UNTINTABLE_SVG, { orangeOn: true }).includes(DOT_ORANGE), 'the dot alone still splices')
})

test('hrefs: both themes compose to data URLs', () => {
  const bases = { light: LIGHT_SVG, dark: DARK_SVG }
  const href = buildFaviconHrefs(layers({ greenWhale: true }), { breathOpacity: 0.8, orangeOn: true }, bases)
  assert.ok(href.light.startsWith('data:image/svg+xml;charset=utf-8,'))
  const light = decodeURIComponent(href.light.slice('data:image/svg+xml;charset=utf-8,'.length))
  assert.ok(light.includes(WHALE_GREEN) && light.includes(DOT_ORANGE) && light.includes('<g opacity="0.8">'))
  const dark = decodeURIComponent(href.dark)
  assert.ok(dark.includes(WHALE_GREEN), 'the dark whale tints too')
})

test('svgDataUrl encodes the markup', () => {
  const url = svgDataUrl(LIGHT_SVG)
  assert.ok(url.startsWith('data:image/svg+xml;charset=utf-8,'))
  assert.equal(decodeURIComponent(url.slice('data:image/svg+xml;charset=utf-8,'.length)), LIGHT_SVG)
})

// ---------------------------------------------------------------------------
// Client against a fake DOM.
// ---------------------------------------------------------------------------

test('client: theme-mirrored links, breathing timer, smooth href cycling', async () => {
  const env = makeEnv()
  const sessions = makeSessions({ a: session('a') })
  const uiSession = { sessionStatus: makeStatus(new Map([['a', status({ running: true })]])) }
  const { dispose, restore } = mount(env, sessions, uiSession)
  try {
    await settled()
    assert.deepEqual(env.fetchCalls, [LIGHT_FAVICON_PATH, DARK_FAVICON_PATH])
    assert.equal(env.headChildren.length, 2, 'one overlay link per theme')
    const medias = env.headChildren.map((link) => link.getAttribute('media'))
    assert.ok(medias.includes(DARK_MEDIA) && medias.includes(LIGHT_MEDIA))
    const active = env.activeIntervals()
    assert.equal(active.length, 1)
    assert.equal(active[0].ms, TICK_MS)
    assert.ok(!hrefOf(env).includes('<g opacity'), 'tick 0 is the full-opacity frame')
    env.tick(1)
    assert.ok(hrefOf(env).includes('<g opacity="0.999">'), 'the first breath step barely moves')
    env.tick(6)
    assert.ok(hrefOf(env).includes('<g opacity="0.941">'), 'the fade deepens smoothly at tick 7')
  } finally {
    dispose()
    restore()
  }
})

test('client: unread shows a STATIC green whale with no timer', async () => {
  const env = makeEnv()
  const sessions = makeSessions({ a: session('a') })
  const uiSession = { sessionStatus: makeStatus(new Map([['a', status({ running: false, completionUnread: true })]])) }
  const { dispose, restore } = mount(env, sessions, uiSession)
  try {
    await settled()
    assert.equal(env.activeIntervals().length, 0, 'static whale: no timer')
    const href = hrefOf(env)
    assert.ok(href.includes(WHALE_GREEN), 'the whale itself is green')
    assert.ok(!href.includes('<circle'), 'no green dot anymore')
    assert.ok(!href.includes('<g opacity'), 'and it does not breathe without a running session')
  } finally {
    dispose()
    restore()
  }
})

test('client: a waiting session blinks orange forever and the whale stands still', async () => {
  const env = makeEnv()
  const sessions = makeSessions({ a: session('a') })
  const uiSession = { sessionStatus: makeStatus(new Map([['a', status({ running: true, pendingInteraction: { key: 'k', kind: 'approval', sessionId: 'a' } })]])) }
  const { dispose, restore } = mount(env, sessions, uiSession)
  try {
    await settled()
    assert.ok(hrefOf(env).includes(DOT_ORANGE))
    let whaleFrames = new Set()
    let dotStates = new Set()
    for (let i = 0; i < 60; i += 1) {
      const href = hrefOf(env)
      whaleFrames.add(/<g opacity="([\d.]+)"/.exec(href)?.[1] ?? '1')
      dotStates.add(href.includes(DOT_ORANGE))
      env.tick(1)
    }
    assert.deepEqual([...whaleFrames], ['1'], 'the whale never moves across a full blink cycle — only the dot blinks')
    assert.equal(dotStates.size, 2, 'the dot keeps blinking on its duty cycle')
  } finally {
    dispose()
    restore()
  }
})

test('client: fading green whale + blinking orange compose at once', async () => {
  const env = makeEnv()
  const sessions = makeSessions({ a: session('a'), b: session('b'), c: session('c') })
  const uiSession = {
    sessionStatus: makeStatus(new Map([
      ['a', status({ running: true })],
      ['b', status({ running: false, completionUnread: true })],
      ['c', status({ running: true, pendingInteraction: { key: 'k', kind: 'question', sessionId: 'c' } })],
    ])),
  }
  const { dispose, restore } = mount(env, sessions, uiSession)
  try {
    await settled()
    const href = hrefOf(env)
    assert.ok(href.includes(WHALE_GREEN), 'the whale is green')
    assert.ok(href.includes(DOT_ORANGE), 'the orange dot shows')
    env.tick(4)
    const faded = hrefOf(env)
    assert.ok(faded.includes('<g opacity="0.98">'), 'the green whale fades')
    assert.ok(faded.includes(WHALE_GREEN), 'still green while fading')
    assert.equal(env.activeIntervals()[0].ms, TICK_MS)
  } finally {
    dispose()
    restore()
  }
})

test('client: workspace parity — a finished CURRENT session without the unread flag lights nothing', async () => {
  const env = makeEnv()
  const sessions = makeSessions({ a: session('a', { retainedBy: { mainView: 1 } }) })
  const uiSession = { sessionStatus: makeStatus(new Map([['a', status({ running: false, completionUnread: false })]])) }
  const { dispose, restore } = mount(env, sessions, uiSession)
  try {
    await settled()
    assert.equal(env.headChildren.length, 0, 'no green whale where the workspace list has no green dot')
    assert.equal(env.activeIntervals().length, 0)
  } finally {
    dispose()
    restore()
  }
})

test('client: subagent-only activity never touches the tab', async () => {
  const env = makeEnv()
  const sessions = makeSessions({ s: session('s', { origin: 'subagent' }) })
  const uiSession = { sessionStatus: makeStatus(new Map([['s', status({ running: true, pendingInteraction: { key: 'k', kind: 'approval', sessionId: 's' } })]])) }
  const { dispose, restore } = mount(env, sessions, uiSession)
  try {
    await settled()
    assert.equal(env.headChildren.length, 0)
    assert.equal(env.activeIntervals().length, 0)
  } finally {
    dispose()
    restore()
  }
})

test('client: failed favicon fetch degrades to a silent no-op', async () => {
  const env = makeEnv({ lightFail: true })
  const sessions = makeSessions({ a: session('a') })
  const uiSession = { sessionStatus: makeStatus(new Map([['a', status({ running: true })]])) }
  const { dispose, restore } = mount(env, sessions, uiSession)
  try {
    await settled()
    assert.equal(env.headChildren.length, 0)
    assert.equal(env.activeIntervals().length, 0)
  } finally {
    dispose()
    restore()
  }
})

test('client: an untintable whale rejects the base — the green signal never silently breaks', async () => {
  const env = makeEnv({ untintable: true })
  const sessions = makeSessions({ a: session('a') })
  const uiSession = { sessionStatus: makeStatus(new Map([['a', status({ running: true, completionUnread: true })]])) }
  const { dispose, restore } = mount(env, sessions, uiSession)
  try {
    await settled()
    assert.equal(env.headChildren.length, 0, 'the host icons stay untouched instead of a half-working feature')
  } finally {
    dispose()
    restore()
  }
})

test('client: status transitions retarget the layers and the timer', async () => {
  const env = makeEnv()
  const sessions = makeSessions({ a: session('a') })
  const uiSession = { sessionStatus: makeStatus(new Map([['a', status({ running: false, completionUnread: true })]])) }
  const { dispose, restore } = mount(env, sessions, uiSession)
  try {
    await settled()
    assert.equal(env.activeIntervals().length, 0, 'static green whale first')
    uiSession.sessionStatus.set(new Map([['a', status({ running: true, completionUnread: true, pendingInteraction: { key: 'k', kind: 'plan-review', sessionId: 'a' } })]]))
    uiSession.sessionStatus.emit()
    assert.equal(env.activeIntervals().length, 1, 'orange (waiting, not computing) starts the blink timer')
    const href = hrefOf(env)
    assert.ok(href.includes(WHALE_GREEN) && href.includes(DOT_ORANGE))
    assert.ok(!href.includes('<g opacity'), 'still no breath while it only waits')
    uiSession.sessionStatus.set(new Map([['a', status({ running: true, completionUnread: true })]]))
    uiSession.sessionStatus.emit()
    env.tick(1)
    assert.ok(hrefOf(env).includes('<g opacity'), 'answered and computing — now the whale breathes')
    uiSession.sessionStatus.set(new Map([['a', status({ running: false })]]))
    uiSession.sessionStatus.emit()
    assert.equal(env.activeIntervals().length, 0, 'back to nothing up')
    assert.equal(env.headChildren.length, 0, 'links detach again')
  } finally {
    dispose()
    restore()
  }
})

test('client: returning to a throttled tab restarts the blink from the on-frame', async () => {
  const env = makeEnv()
  const sessions = makeSessions({ a: session('a') })
  const uiSession = { sessionStatus: makeStatus(new Map([['a', status({ running: true, pendingInteraction: { key: 'k', kind: 'approval', sessionId: 'a' } })]])) }
  const { dispose, restore } = mount(env, sessions, uiSession)
  try {
    await settled()
    env.tick(6)
    assert.ok(!hrefOf(env).includes(DOT_ORANGE), 'parked on the off frame (a throttled freeze could catch it here)')
    env.document.visibilityState = 'hidden'
    env.fireVisibility()
    assert.ok(!hrefOf(env).includes(DOT_ORANGE), 'hiding changes nothing')
    env.document.visibilityState = 'visible'
    env.fireVisibility()
    assert.ok(hrefOf(env).includes(DOT_ORANGE), 'looking at the tab restarts the cycle on the on-frame')
    assert.equal(env.activeIntervals().length, 1, 'exactly one live timer after the resync')
  } finally {
    dispose()
    restore()
  }
})

test('client: a spurious visible event does not reset the blink cycle', async () => {
  const env = makeEnv()
  const sessions = makeSessions({ a: session('a') })
  const uiSession = { sessionStatus: makeStatus(new Map([['a', status({ running: true, pendingInteraction: { key: 'k', kind: 'approval', sessionId: 'a' } })]])) }
  const { dispose, restore } = mount(env, sessions, uiSession)
  try {
    await settled()
    env.tick(1)
    env.fireVisibility() // already visible: a spurious event, must be a no-op
    env.tick(5) // tick 6 → the off frame — only reachable if the cycle kept advancing
    assert.ok(!hrefOf(env).includes(DOT_ORANGE), 'a reset would have pinned the blink to its on-frame (static dot)')
  } finally {
    dispose()
    restore()
  }
})

test('client: a hidden page advances the blink every tick (throttled-timer mode)', async () => {
  const env = makeEnv()
  const sessions = makeSessions({ a: session('a') })
  const uiSession = { sessionStatus: makeStatus(new Map([['a', status({ running: true, pendingInteraction: { key: 'k', kind: 'approval', sessionId: 'a' } })]])) }
  const { dispose, restore } = mount(env, sessions, uiSession)
  try {
    await settled()
    env.tick(1) // tick 1: visible mode holds the frame (floor(1/3) = on)
    assert.ok(hrefOf(env).includes(DOT_ORANGE), 'visible mode: the frame holds for 3 ticks')
    env.document.hidden = true
    env.tick(1) // tick 2: hidden mode advances per tick → BLINK_FRAMES[2] = off
    assert.ok(!hrefOf(env).includes(DOT_ORANGE), 'hidden mode: one tick already flips the blink frame')
  } finally {
    dispose()
    restore()
  }
})

test('client: dispose leaves no timer, no link and no subscription', async () => {
  const env = makeEnv()
  const sessions = makeSessions({ a: session('a') })
  const uiSession = { sessionStatus: makeStatus(new Map([['a', status({ running: true })]])) }
  const { dispose, restore } = mount(env, sessions, uiSession)
  await settled()
  assert.equal(env.headChildren.length, 2)
  dispose()
  restore()
  assert.equal(env.headChildren.length, 0)
  assert.equal(env.activeIntervals().length, 0)
  assert.equal(env.docEvents.length, 0, 'no visibility listener survives')
  assert.equal(sessions.list.subs.length, 0)
  assert.equal(uiSession.sessionStatus.subs.length, 0)
})

// ---------------------------------------------------------------------------
// Contract surface.
// ---------------------------------------------------------------------------

test('contract: feature view mirrors the module constants', () => {
  assert.equal(feature.id, 'attention-favicon')
  assert.equal(feature.title, 'Attention favicon')
  assert.equal(feature.hasGear, false)
  assert.equal(feature.description, mod.settingsMessages.en.description)
})
