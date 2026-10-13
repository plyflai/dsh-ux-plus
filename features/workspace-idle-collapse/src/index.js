/**
 * dsh-ux-plus feature module: Idle workspace collapse.
 *
 * Frozen feature id `workspace-idle-collapse`.
 *
 * What it does (client side only):
 *   - a workspace whose latest real session activity is older than 24 hours
 *     collapses automatically (once per workspace per page load, so a manual
 *     re-expand is never fought), and
 *   - every workspace row with real activity carries an age label on its
 *     right — "how long since this workspace was last updated" — rendered
 *     exactly like the host's session-row time cell (10px/16px,
 *     `--dsw-alias-label-tertiary`, hidden while the row is hovered or its
 *     menu is open, where the action buttons take the space).
 *
 * Activity signal (shared with workspace-recency-order): the maximum
 * `updatedAt` over the workspace's non-blank, non-subagent sessions. Archive
 * state is deliberately NOT an input (the host keeps archived sessions in
 * `sessionIds` — archiving never changes workspace accounting). A workspace
 * with no such sessions has no signal: no label, never collapsed.
 *
 * DOM contract (host ui-workspace, read-only facts):
 *   - workspace rows are the divs carrying `data-row-key="workspace:<id>"`
 *     (rows/Rows.tsx:245; the group key IS the workspaceId, tree.ts:26-32;
 *     the ungrouped bucket's key is '' — tree.ts:18 — and is skipped);
 *   - each row is `role="treeitem"` with `aria-expanded` and
 *     `onClick={onToggle}` (Rows.tsx:247-248), so a programmatic `click()`
 *     toggles the group through the host's own handler;
 *   - the label is inserted as a flex child before the row's actions span
 *     (`.projectText` is flex:1, so it lands flush right);
 *   - the hover/menu-open dismissal mirrors the host rule
 *     `.sessionRow:hover .time, .sessionRow.menuOpen .time { display: none }`
 *     (rows/Rows.module.css:279-282) via one injected style tag.
 *
 * Age wording mirrors the host session-time buckets (ui-workspace
 * locales.ts:10-15 zh / :60-65 en): 刚刚/N分钟/N小时/N天/N个月/N年 with the
 * same 60s/60m/24h/30d/12mo thresholds; en now/Nm/Nh/Nd/Nmo/Ny. The active
 * locale is read from `ctx.locale.getSnapshot().active` (defensively — a
 * locale-less context falls back to zh) and every pass re-renders the text,
 * so labels age with store traffic; a 60s interval (when available) keeps
 * them honest on an idle page.
 *
 * D5 contract surface (consumed by the package host and client halves):
 *   feature.host(ctx)          -> disposer. No-op (no host-side section).
 *   feature.client(ctx, deps)  -> disposer: removes every label and the
 *                                 style tag, disconnects the observer,
 *                                 unsubscribes the lists and the locale,
 *                                 clears the timer (off == never installed).
 *   attach / dispose           - host-side installation aliases (P1 surface).
 *
 * deps (client, supplied by the package client half):
 *   sessions   - the soft-fetched sessions service (needs `.list`).
 *   workspaces - the soft-fetched workspaces service (needs `.list`).
 * Both soft: a missing (or list-less) dependency degrades to a no-op
 * disposer — the settings section must never fail because of this feature.
 */

export const id = 'workspace-idle-collapse'
export const title = 'Idle workspace collapse'
export const description = 'Collapse workspaces with no updates for 24 hours and show how long ago each was last active.'
export const hasGear = false
/** Settings-row copy, assembled into the `ux-plus-settings` namespace. */
export const settingsMessages = {
  zh: { title: '闲置工作区收起', description: '超过 24 小时没有更新的工作区自动收起，并在行右侧显示距今未更新的时间标（每次打开页面每个工作区最多自动收起一次）。' },
  en: { title: 'Idle workspace collapse', description: 'Collapse workspaces with no updates for 24 hours and show how long ago each was last active.' },
}

// ---------------------------------------------------------------------------
// Client-side behavior.
// ---------------------------------------------------------------------------

/** Idle threshold: no real activity for 24 hours. */
const IDLE_MS = 24 * 60 * 60 * 1000

/** Label refresh cadence on an otherwise idle page (ms). */
const AGE_TICK_MS = 60 * 1000

/** The host's ungrouped-bucket group key (ui-workspace tree.ts:18). */
const UNGROUPED_KEY = ''

/** `data-row-key` prefix of workspace rows (Rows.tsx:245). */
const ROW_PREFIX = 'workspace:'

/** Marker attribute carried by the injected label element. */
const LABEL_ATTR = 'data-dsh-ux-plus'
const LABEL_VALUE = 'workspace-age'

/** Host session-time buckets (locales.ts): 60s / 60m / 24h / 30d / 12mo. */
const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const MONTH_MS = 30 * DAY_MS
const YEAR_MS = 12 * MONTH_MS

/**
 * Host-shaped relative age ("多久没更新" label text).
 * @param {string} locale - active locale id ('zh' prefix wins, else en).
 * @param {number} ageMs - now - latest activity (ms, clamped at 0).
 * @returns {string} label text, e.g. '3小时' / '2d'.
 */
export function ageLabel(locale, ageMs) {
  const age = Math.max(0, ageMs)
  const zh = typeof locale === 'string' && locale.toLowerCase().startsWith('zh')
  if (age < MINUTE_MS) return zh ? '刚刚' : 'now'
  if (age < HOUR_MS) return zh ? `${Math.floor(age / MINUTE_MS)}分钟` : `${Math.floor(age / MINUTE_MS)}m`
  if (age < DAY_MS) return zh ? `${Math.floor(age / HOUR_MS)}小时` : `${Math.floor(age / HOUR_MS)}h`
  if (age < MONTH_MS) return zh ? `${Math.floor(age / DAY_MS)}天` : `${Math.floor(age / DAY_MS)}d`
  if (age < YEAR_MS) return zh ? `${Math.floor(age / MONTH_MS)}个月` : `${Math.floor(age / MONTH_MS)}mo`
  return zh ? `${Math.floor(age / YEAR_MS)}年` : `${Math.floor(age / YEAR_MS)}y`
}

/**
 * Most recent non-blank, non-subagent update in a workspace (the same
 * activity signal workspace-recency-order ranks groups by; archive state is
 * not an input — see module header).
 * @param {{sessionIds: readonly string[]}} workspace
 * @param {Record<string, {blank?: boolean, origin?: string, updatedAt: number}>} byId
 * @returns {number} latest updatedAt, or -Infinity when no session qualifies.
 */
export function latestSessionUpdate(workspace, byId) {
  let latest = Number.NEGATIVE_INFINITY
  for (const sessionId of workspace.sessionIds) {
    const session = byId[sessionId]
    if (session === undefined || session.blank || session.origin === 'subagent') continue
    if (session.updatedAt > latest) latest = session.updatedAt
  }
  return latest
}

/** The injected label among a row's direct children, or null. */
function findLabel(row) {
  for (const child of row.children) {
    if (child.dataset && child.dataset.dshUxPlus === LABEL_VALUE) return child
  }
  return null
}

/** The host row's actions span (label sits before it), or null. */
function findActions(row) {
  for (const child of row.children) {
    if (typeof child.className === 'string' && child.className.includes('rowActions')) return child
  }
  return null
}

/**
 * Install the feature's client-side behavior.
 * @param {object} ctx - the client plugin context (uses `ctx.locale`, softly).
 * @param {object} deps - { sessions, workspaces } (see module header).
 * @returns {() => void} disposer removing every label, the style tag, all
 *   observers/subscriptions/timers (off == never installed).
 */
export function client(ctx, deps) {
  const sessionsService = deps && deps.sessions
  const workspacesService = deps && deps.workspaces
  const sessions = sessionsService && sessionsService.list
  const workspaces = workspacesService && workspacesService.list
  if (!sessions || !workspaces
    || typeof sessions.getSnapshot !== 'function' || typeof sessions.subscribe !== 'function'
    || typeof workspaces.getSnapshot !== 'function' || typeof workspaces.subscribe !== 'function') {
    return () => {}
  }

  let timer = null
  let ageTimer = null
  let disposed = false
  /** Workspace ids already auto-collapsed during this page load. */
  const collapsedOnce = new Set()

  // Hover/menu dismissal mirroring the host's `.sessionRow:hover .time`
  // rule (Rows.module.css:279-282): the action buttons take the space.
  const styleTag = document.createElement('style')
  styleTag.dataset.dshUxPlus = 'idle-collapse-css'
  styleTag.textContent =
    `[data-row-key^="${ROW_PREFIX}"]:hover > [${LABEL_ATTR}="${LABEL_VALUE}"],`
    + `[data-row-key^="${ROW_PREFIX}"].menuOpen > [${LABEL_ATTR}="${LABEL_VALUE}"] { display: none; }`
  document.head.appendChild(styleTag)

  /** Active locale id, defensively ('zh' when no locale service). */
  function activeLocale() {
    const locale = ctx && ctx.locale
    if (locale && typeof locale.getSnapshot === 'function') {
      try {
        const snapshot = locale.getSnapshot()
        if (snapshot && typeof snapshot.active === 'string') return snapshot.active
      } catch { /* fall through to the default */ }
    }
    return 'zh'
  }

  /** Snapshot both lists; null while either is not ready. */
  function readData() {
    const sessionSnapshot = sessions.getSnapshot()
    const workspaceSnapshot = workspaces.getSnapshot()
    if (sessionSnapshot.phase !== 'ready' || workspaceSnapshot.phase !== 'ready') return null
    return { byId: sessionSnapshot.byId, items: workspaceSnapshot.items }
  }

  /** Remove this feature's label from a row (idempotent). */
  function removeLabel(row) {
    const label = findLabel(row)
    if (label !== null) label.remove()
  }

  /** One full pass: label every workspace row with activity; collapse idle ones once. */
  function pass() {
    const data = readData()
    if (data === null) return
    const rows = document.querySelectorAll(`[data-row-key^="${ROW_PREFIX}"]`)
    const now = Date.now()
    const locale = activeLocale()
    for (const row of rows) {
      const rowKey = row.getAttribute('data-row-key')
      const workspaceId = typeof rowKey === 'string' ? rowKey.slice(ROW_PREFIX.length) : ''
      const workspace = workspaceId === UNGROUPED_KEY
        ? undefined
        : data.items.find((item) => item.workspaceId === workspaceId)
      if (workspace === undefined) { removeLabel(row); continue }
      const latest = latestSessionUpdate(workspace, data.byId)
      if (latest === Number.NEGATIVE_INFINITY) { removeLabel(row); continue }
      const idle = now - latest > IDLE_MS
      let label = findLabel(row)
      if (label === null) {
        label = document.createElement('span')
        label.dataset.dshUxPlus = LABEL_VALUE
        label.style.flex = 'none'
        label.style.fontSize = '10px'
        label.style.lineHeight = '16px'
        label.style.color = 'var(--dsw-alias-label-tertiary, #8a8f98)'
        label.style.pointerEvents = 'none'
        label.style.whiteSpace = 'nowrap'
        const actions = findActions(row)
        if (actions !== null && typeof row.insertBefore === 'function') row.insertBefore(label, actions)
        else row.appendChild(label)
      }
      label.textContent = ageLabel(locale, now - latest)
      if (idle && !collapsedOnce.has(workspaceId)) {
        collapsedOnce.add(workspaceId)
        if (row.getAttribute('aria-expanded') === 'true' && typeof row.click === 'function') row.click()
      }
    }
  }

  function schedule() {
    if (disposed || timer !== null) return
    timer = window.setTimeout(function () {
      timer = null
      if (disposed) return
      pass()
    }, 0)
  }

  const observer = new MutationObserver(schedule)
  if (document.body !== null) observer.observe(document.body, { childList: true, subtree: true })
  const disposeSessions = sessions.subscribe(schedule)
  const disposeWorkspaces = workspaces.subscribe(schedule)
  const locale = ctx && ctx.locale
  const disposeLocale = locale && typeof locale.subscribe === 'function' ? locale.subscribe(schedule) : null
  if (typeof window.setInterval === 'function') ageTimer = window.setInterval(schedule, AGE_TICK_MS)
  schedule()

  // No ctx.effect: this feature owns its resources and hands back the exact
  // cleanup (legacy cleanup contract, retained). The package client half
  // holds the disposer; the plugin-level unmount (and each switch-off)
  // calls it.
  return function cleanup() {
    disposed = true
    if (timer !== null) window.clearTimeout(timer)
    if (ageTimer !== null && typeof window.clearInterval === 'function') window.clearInterval(ageTimer)
    observer.disconnect()
    disposeSessions()
    disposeWorkspaces()
    if (typeof disposeLocale === 'function') disposeLocale()
    for (const row of document.querySelectorAll(`[data-row-key^="${ROW_PREFIX}"]`)) removeLabel(row)
    styleTag.remove()
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
