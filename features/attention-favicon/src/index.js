/**
 * dsh-ux-plus feature module: Attention favicon.
 *
 * Frozen feature id `attention-favicon`.
 *
 * The tab favicon keeps the host's whale — this feature only ever tints it,
 * breathes it, or adds one dot to it, never replaces it. Three INDEPENDENT
 * layers compose on the whale (they can show at the same time):
 *
 *   whale breath   any counted session is COMPUTING — a true fade-out /
 *                  fade-in (72-frame cosine at 20 fps, 3.6 s cycle, 35%
 *                  floor). A session blocked on your click does not count:
 *                  the host keeps it 'running' while it waits, but waiting
 *                  is the orange dot's story, not the whale's. The dot
 *                  blinks on its own 450 ms duty cycle; the whale never
 *                  inherits the blink — only the breath moves it.
 *   green whale    any counted session finished unread — the SAME flag the
 *                  workspace list paints its green dot from (host
 *                  completionUnread), so favicon green ⟺ workspace green;
 *                  the whale itself is re-tinted green instead of a dot
 *   orange dot     any counted session awaits a click (pendingInteraction),
 *                  fast blink, bottom-right
 *
 * With none of the three up, the untouched host favicon shows (this feature's
 * links detach). Subagent and blank sessions are excluded from every count
 * (same filter as workspace-recency-order, index.ts:249) — a fan-out of
 * subagents must not keep the tab permanently orange (the "boy who cried
 * wolf" failure).
 *
 * Animation mechanism (deliberate): a JS timer swaps the overlay link's href
 * between precomputed SVG data URLs. SMIL animation inside an SVG favicon
 * renders as a static first frame in Chromium, and a JS timer is throttled
 * to ~1/min once a tab has been hidden for minutes — so the frame tables are
 * duty-cycle designed to survive a frozen timer: the orange blink is on for
 * 2 of its 3 frames and the breath never dips below 35% opacity, whichever
 * frame throttling parks on, the alert stays visible. The breath table is a
 * cosine (equal 50 ms steps at 20 fps, smooth deltas ≤ 0.03) so the visible
 * motion reads as breathing, not flicker; frames are built lazily and cached
 * per (tint, opacity, dot) triple, so the 72×3 cycle costs nothing upfront.
 *
 * Theme preservation: the host declares two media-scoped icon links
 * (apps/web/index.html:7-8, dark whale #fff / light whale #000). This
 * feature fetches both bases at mount and appends its own two links with the
 * SAME media attributes, so the OS theme still picks the right whale; a
 * failed fetch — or a base whose whale cannot be re-tinted — degrades the
 * whole feature to a no-op (the host icons stay).
 *
 * D5 contract surface (consumed by the package host and client halves):
 *   feature.host(ctx)          -> disposer (no host resources).
 *   feature.client(ctx, deps)  -> disposer. deps: { sessions, uiSession }.
 *   attach / dispose           - host-side installation aliases (P1 surface).
 */

export const id = 'attention-favicon'
export const title = 'Attention favicon'
export const description = 'The whale favicon fades slowly in and out while any session is computing, turns into a green whale exactly when the workspace list has an unread dot, and blinks an orange dot while something awaits your click.'
export const hasGear = false
/** Settings-row copy, assembled into the `ux-plus-settings` namespace. */
export const settingsMessages = {
  zh: { title: '标签页注意力指示灯', description: '白鲸 favicon：有会话在算就缓慢渐隐渐显地呼吸（等你点的会话不算在算）；工作区列表有绿点（跑完没看）时整条鲸鱼变绿；有东西等你点时橙点闪烁。' },
  en: { title: 'Attention favicon', description: 'The whale favicon fades slowly in and out while any session is computing, turns into a green whale exactly when the workspace list has an unread dot, and blinks an orange dot while something awaits your click.' },
}

/** Host favicon bases (apps/web/index.html:7-8). */
export const LIGHT_FAVICON_PATH = '/favicon.svg'
export const DARK_FAVICON_PATH = '/favicon-dark.svg'
export const DARK_MEDIA = '(prefers-color-scheme: dark)'
export const LIGHT_MEDIA = '(prefers-color-scheme: light)'

/** The unread tint: same green the workspace list dots use, readable on both tab strips. */
export const WHALE_GREEN = '#22c55e'
export const DOT_ORANGE = '#f59e0b'

/** Orange dot geometry on the host's 50x50 viewBox, bottom-right. */
export const ORANGE_DOT = { cx: 40.5, cy: 40.5, r: 9 }

/**
 * One 20 fps timer (50 ms) drives both cycles. The breath is a cosine
 * sampled every 50 ms across a 3.6 s cycle — 72 frames, consecutive frames
 * differ by at most 0.03 opacity, so the whale fades like breathing at
 * screen frame rate rather than stepping. The orange blink keeps its 450 ms
 * rhythm by changing state every 3 ticks (on, on, off — 2 of 3 visible).
 * The 35% opacity floor keeps a throttled-frozen tab showing the whale.
 */
export const TICK_MS = 50
export const BLINK_FRAMES = [1, 1, 0]
export const BLINK_FRAME_TICKS = 3
export const BREATH_FLOOR = 0.35
export const BREATH_CYCLE_TICKS = 72

/** The breath cosine: n samples of 0.35 + 0.65·(1+cos)/2, 3-decimal steps. */
export function buildBreathFrames(n) {
  const frames = []
  for (let i = 0; i < n; i += 1) {
    const eased = (1 + Math.cos((2 * Math.PI * i) / n)) / 2
    frames.push(Math.round((BREATH_FLOOR + (1 - BREATH_FLOOR) * eased) * 1000) / 1000)
  }
  return frames
}

export const BREATH_FRAMES = buildBreathFrames(BREATH_CYCLE_TICKS)

// ---------------------------------------------------------------------------
// Pure layer model.
// ---------------------------------------------------------------------------

/**
 * Is a session counted by the tab indicator? Subagent fan-out and blank
 * drafts stay out (recency-order's filter, index.ts:249).
 * @param {{ blank?: boolean, origin?: string }} session
 * @returns {boolean}
 */
export function isCountedSession(session) {
  return session !== undefined && session !== null
    && session.blank !== true && session.origin !== 'subagent'
}

/**
 * The favicon layers for one status snapshot — three independent booleans,
 * no priority: breath, green whale and orange dot compose freely (e.g. a
 * fading green whale with a blinking orange dot at once).
 *
 * Breathing counts only sessions that are COMPUTING: the host's agent
 * status stays 'running' while a turn blocks on ask_user / approval
 * (packages/core/agent-loop/src/agent.ts:141 derives it from the phase),
 * but a session waiting on your click is not working — it shows the orange
 * dot instead, and does not breathe the whale.
 * @param {Array<{ running: boolean|undefined, pending: boolean, unread: boolean }>} counted
 *   one entry per counted session that the status map knows about.
 * @returns {{ breathing: boolean, greenWhale: boolean, orange: boolean }}
 */
export function computeFaviconLayers(counted) {
  let breathing = false
  let greenWhale = false
  let orange = false
  for (const status of counted) {
    if (status.running === true && status.pending !== true) breathing = true
    if (status.unread === true) greenWhale = true
    if (status.pending === true) orange = true
  }
  return { breathing, greenWhale, orange }
}

/** Cache key for one layer combination. */
export function layersKey(layers) {
  return `${layers.breathing ? 1 : 0}${layers.greenWhale ? 1 : 0}${layers.orange ? 1 : 0}`
}

/**
 * The frame spec for one tick of the layer combination: where the breath
 * cosine and the blink duty cycle stand.
 * @param {{ breathing: boolean, orange: boolean }} layers
 * @param {number} tick
 * @param {boolean} [blinkEveryTick] - hidden-tab mode: Chrome clamps hidden
 * timers to ~1 tick/second, so holding each blink frame for
 * BLINK_FRAME_TICKS ticks would stretch the blink to seconds per state.
 * Advancing one blink frame per tick keeps roughly one transition per
 * second (on 2s / off 1s — the duty still freezes visible).
 * @returns {{ breathOpacity: number, orangeOn: boolean }}
 */
export function frameAt(layers, tick, blinkEveryTick = false) {
  return {
    breathOpacity: layers.breathing ? BREATH_FRAMES[tick % BREATH_FRAMES.length] : 1,
    orangeOn: layers.orange
      ? BLINK_FRAMES[(blinkEveryTick ? tick : Math.floor(tick / BLINK_FRAME_TICKS)) % BLINK_FRAMES.length] > 0
      : false,
  }
}

// ---------------------------------------------------------------------------
// Pure frame builders.
// ---------------------------------------------------------------------------

/**
 * Re-tint the whale: the first `fill="#…"` inside the body (the whale path;
 * the root tag's fill="none" lives in the head, already sliced off).
 * @param {string} body
 * @param {string} hex
 * @returns {string | null} the tinted body, or null when the whale has no
 *   hex fill to take over (the base is then rejected at load time).
 */
function tintWhaleBody(body, hex) {
  const match = body.match(/fill="#[0-9a-fA-F]{3,8}"/)
  if (match === null) return null
  return body.replace(match[0], `fill="${hex}"`)
}

/**
 * Compose one favicon SVG from the host base: the whale (optionally re-tinted
 * green for unread, optionally wrapped in a breath group) plus the blinking
 * orange dot bottom-right.
 * @param {string} baseSvg the fetched host SVG text.
 * @param {{ breathOpacity?: number, greenWhale?: boolean, orangeOn?: boolean, orangeOpacity?: number }} frame
 * @returns {string | null} the composed SVG, or null when the base cannot be
 *   spliced (not an SVG, a root tag containing '>' inside attributes, or —
 *   when a green whale is asked for — a whale without a hex fill).
 */
export function buildFrameSvg(baseSvg, frame) {
  if (typeof baseSvg !== 'string') return null
  const close = baseSvg.lastIndexOf('</svg>')
  const rootEnd = baseSvg.indexOf('>')
  if (rootEnd <= 0 || close < rootEnd) return null
  const breathOpacity = frame && typeof frame.breathOpacity === 'number' ? frame.breathOpacity : 1
  const greenWhale = Boolean(frame && frame.greenWhale)
  const orangeOpacity = frame && typeof frame.orangeOpacity === 'number' ? frame.orangeOpacity : 1
  const orange = Boolean(frame && frame.orangeOn) && orangeOpacity > 0
  if (!greenWhale && !orange && breathOpacity >= 1) return baseSvg
  const head = baseSvg.slice(0, rootEnd + 1)
  let body = baseSvg.slice(rootEnd + 1, close)
  const tail = baseSvg.slice(close)
  if (greenWhale) {
    const tinted = tintWhaleBody(body, WHALE_GREEN)
    if (tinted === null) return null
    body = tinted
  }
  const breath = breathOpacity < 1 ? `<g opacity="${breathOpacity}">` : ''
  const breathEnd = breathOpacity < 1 ? '</g>' : ''
  let dot = ''
  if (orange) {
    const alpha = orangeOpacity < 1 ? ` fill-opacity="${orangeOpacity}"` : ''
    dot = `<circle cx="${ORANGE_DOT.cx}" cy="${ORANGE_DOT.cy}" r="${ORANGE_DOT.r}" fill="${DOT_ORANGE}"${alpha}/>`
  }
  return `${head}${breath}${body}${breathEnd}${dot}${tail}`
}

/** Encode an SVG string as a favicon data URL. */
export function svgDataUrl(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

/**
 * The two theme hrefs for one frame of one layer combination.
 * @param {{ greenWhale?: boolean }} layers
 * @param {{ breathOpacity: number, orangeOn: boolean }} frame
 * @param {{ light: string, dark?: string|null }} bases
 * @returns {{ light: string|null, dark: string|null } | null} null when a
 *   base cannot be composed (feature degrades to no-op upstream).
 */
export function buildFaviconHrefs(layers, frame, bases) {
  const spec = { ...frame, greenWhale: layers.greenWhale === true }
  return {
    light: bases.light ? svgDataUrl(buildFrameSvg(bases.light, spec)) : null,
    dark: bases.dark ? svgDataUrl(buildFrameSvg(bases.dark, spec)) : null,
  }
}

// ---------------------------------------------------------------------------
// D5 contract implementation.
// ---------------------------------------------------------------------------

/** Currently installed host-side disposer, or undefined while detached. */
let release = undefined

/**
 * Install the feature's host-side behavior (none for this feature).
 * @param {object} ctx - the plugin context.
 * @returns {() => void} the disposer for this installation.
 */
export function attach(ctx) {
  dispose()
  release = () => {
    release = undefined
  }
  return release
}

/** Tear down the current host-side installation; idempotent. */
export function dispose() {
  const current = release
  release = undefined
  if (current !== undefined) current()
}

/**
 * Install the feature's client-side behavior.
 * @param {object} ctx - the client plugin context (unused; the feature reads
 *   its services from deps).
 * @param {object} deps - { sessions, uiSession } (see src/client.js). `sessions`
 *   is the sessions SERVICE face (`ctx.get('sessions')` = ISessions, see
 *   packages/api/session-controller/src/client/contract/sessions.ts): the store
 *   to subscribe to is its `list` face, never the service object itself — the
 *   service has no `subscribe`/`getSnapshot` (the same rule as
 *   features/workspace-recency-order/src/index.js:2191).
 * @returns {() => void} disposer: stops the timer, detaches the overlay
 *   links, unsubscribes everything — off == never installed.
 */
export function client(ctx, deps) {
  const sessionsService = deps && deps.sessions
  const sessions = sessionsService && sessionsService.list
  const statusObservable = deps && deps.uiSession && deps.uiSession.sessionStatus
  if (!sessions || typeof sessions.getSnapshot !== 'function' || typeof sessions.subscribe !== 'function') return () => {}
  if (!statusObservable || typeof statusObservable.getSnapshot !== 'function') return () => {}
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return () => {}

  let disposed = false
  /** Fetched whale bases; null until both loads settle. */
  let bases = null
  /** (tint, opacity, dot) triple -> href pair, built lazily. */
  let hrefCache = new Map()
  let layers = computeFaviconLayers([])
  let key = layersKey(layers)
  let tick = 0
  let timer = null
  /** Overlay links, kept detached while idle so the host icons show through. */
  const links = []

  /** The counted sessions' status entries, or null while either store waits. */
  function countedStatuses() {
    let list = null
    let map = null
    try {
      list = sessions.getSnapshot()
      map = statusObservable.getSnapshot()
    } catch {
      return null
    }
    if (!list || list.phase !== 'ready') return null
    if (!map || typeof map.get !== 'function') return null
    const counted = []
    for (const id of Object.keys(list.byId)) {
      if (!isCountedSession(list.byId[id])) continue
      const status = map.get(id)
      if (status === undefined || status === null) continue
      counted.push({
        running: status.running,
        pending: status.pendingInteraction !== undefined && status.pendingInteraction !== null,
        unread: status.completionUnread === true,
      })
    }
    return counted
  }

  function ensureLink(media, type) {
    const link = document.createElement('link')
    link.setAttribute('rel', 'icon')
    link.setAttribute('media', media)
    link.setAttribute('type', type)
    link.dataset.dshUxPlus = 'attention-favicon'
    links.push(link)
    return link
  }

  function attachLinks() {
    for (const link of links) {
      if (link.parentNode === null || link.parentNode === undefined) {
        document.head.appendChild(link)
      }
    }
  }

  function detachLinks() {
    for (const link of links) {
      if (link.parentNode !== null && link.parentNode !== undefined) link.parentNode.removeChild(link)
    }
  }

  function hrefsFor(frame) {
    const cacheKey = `${layers.greenWhale ? 1 : 0}|${frame.breathOpacity}|${frame.orangeOn ? 1 : 0}`
    if (hrefCache.has(cacheKey)) return hrefCache.get(cacheKey)
    const hrefs = buildFaviconHrefs(layers, frame, bases)
    hrefCache.set(cacheKey, hrefs)
    return hrefs
  }

  function paint() {
    if (bases === null) return
    if (key === '000') {
      detachLinks()
      return
    }
    const frame = frameAt(layers, tick, typeof document !== 'undefined' && document.hidden === true)
    const href = hrefsFor(frame)
    let painted = false
    for (const link of links) {
      const media = link.getAttribute('media')
      const url = media === DARK_MEDIA ? href.dark : href.light
      if (url === null || url === undefined) continue
      if (link.getAttribute('href') !== url) link.setAttribute('href', url)
      painted = true
    }
    if (painted) attachLinks()
    else detachLinks()
  }

  function stopTimer() {
    if (timer !== null && typeof window !== 'undefined' && typeof window.clearInterval === 'function') {
      window.clearInterval(timer)
    }
    timer = null
  }

  function restartTimer() {
    stopTimer()
    if (!layers.breathing && !layers.orange) return
    if (typeof window === 'undefined' || typeof window.setInterval !== 'function') return
    timer = window.setInterval(function () {
      tick += 1
      paint()
    }, TICK_MS)
  }

  function recompute() {
    if (disposed || bases === null) return
    const counted = countedStatuses()
    if (counted === null) return
    const next = computeFaviconLayers(counted)
    const nextKey = layersKey(next)
    if (nextKey !== key) {
      layers = next
      key = nextKey
      tick = 0
      restartTimer()
    } else if (timer === null && (next.breathing || next.orange)) {
      // bases (re)loaded while an animated combination was already showing.
      restartTimer()
    }
    paint()
  }

  function onStatus() {
    if (disposed) return
    recompute()
  }

  /**
   * A hidden/occluded tab freezes the timer on whatever frame throttling
   * caught (by design the frozen frame shows the alert — the blink is on
   * for 2 of its 3 frames). On the real hidden → visible EDGE, restart the
   * cycle from the on-frame: the blink or breath resumes immediately
   * instead of waiting for the throttled tick. Repeated 'visible' events
   * (some environments fire spurious ones) must NOT reset the cycle —
   * resetting on every event pins the blink to its on-frame and the dot
   * reads as static while the tab is in the foreground.
   */
  let lastVisible = typeof document === 'undefined' || document.visibilityState !== 'hidden'
  function onVisibility() {
    if (disposed) return
    const visible = typeof document !== 'undefined' && document.visibilityState === 'visible'
    if (!visible) {
      lastVisible = false
      return
    }
    if (lastVisible) return
    lastVisible = true
    tick = 0
    restartTimer()
    recompute()
  }
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', onVisibility)
  }

  /** Fetch one whale base; null on any failure (feature degrades to no-op). */
  async function loadBase(path) {
    if (typeof fetch !== 'function') return null
    try {
      const response = await fetch(path)
      if (!response || response.ok !== true) return null
      const text = await response.text()
      // The base must splice AND carry a tintable whale — the green-whale
      // signal must never silently degrade into a no-op.
      return buildFrameSvg(text, { greenWhale: true }) === null ? null : text
    } catch {
      return null
    }
  }

  async function loadBases() {
    const light = await loadBase(LIGHT_FAVICON_PATH)
    if (disposed || light === null) return
    const dark = await loadBase(DARK_FAVICON_PATH).catch(() => null)
    if (disposed) return
    bases = { light, dark: dark === null ? light : dark }
    hrefCache = new Map()
    if (links.length === 0) {
      ensureLink(DARK_MEDIA, 'image/svg+xml')
      ensureLink(LIGHT_MEDIA, 'image/svg+xml')
    }
    recompute()
  }

  const offSessions = sessions.subscribe(onStatus)
  const offStatus = typeof statusObservable.subscribe === 'function'
    ? statusObservable.subscribe(onStatus)
    : function () {}
  loadBases().catch(() => {})

  return function cleanup() {
    disposed = true
    stopTimer()
    detachLinks()
    if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
      document.removeEventListener('visibilitychange', onVisibility)
    }
    for (const link of links) {
      const at = links.indexOf(link)
      if (at !== -1) links.splice(at, 1)
    }
    offSessions()
    offStatus()
    bases = null
    hrefCache = new Map()
  }
}

/** D5 contract view consumed by the package host and client halves. */
export const feature = {
  id,
  title,
  description,
  hasGear,
  settingsMessages,
  host: (ctx) => attach(ctx),
  client: (ctx, deps) => client(ctx, deps),
}
