/**
 * dsh-ux-plus feature module: Workspace recency order.
 *
 * Frozen feature id `workspace-recency-order`.
 *
 * D5 contract surface (consumed by the package host and client halves):
 *   feature.host(ctx)      -> disposer. No-op for this feature (no host-side
 *                             settings section; the package host registers
 *                             the ux-plus switch instead).
 *   feature.client(ctx, deps) -> disposer. Client-side installation: the
 *                             grouped Workspace tree's visual recency
 *                             ordering — group layer (workspace sections by
 *                             their latest member session activity, freshest
 *                             first; archive-invariant, so archiving a
 *                             conversation never moves its workspace section)
 *                             plus row layer (each section's own
 *                             session rows by session updatedAt). Only the
 *                             visual order changes: React child order,
 *                             host store state (orderBy /
 *                             sessionOrderByAccount) and host data stay
 *                             intact. Same switch, same activity signal:
 *                             the idle sub-behavior additionally collapses
 *                             workspaces idle for over 24 hours (once per
 *                             workspace per page load, through the host's
 *                             own row click handler — the persisted view
 *                             store is never touched) and labels every
 *                             workspace row with its host-styled age
 *                             ("多久没更新"). The disposer restores every
 *                             cached original style, removes all labels and
 *                             the style tag, and removes all
 *                             listeners/observers/subscriptions/timers —
 *                             immediate, no refresh, no residue (off ==
 *                             never installed).
 *   attach / dispose        - host-side installation/uninstallation aliases
 *                             (P1 test surface, retained).
 *
 * deps (client, supplied by the package client half):
 *   sessions   - the soft-fetched sessions service (needs `.list`).
 *   workspaces - the soft-fetched workspaces service (needs `.list`).
 *
 * Both are soft lookups: the package's settings section must never fail to
 * mount because one of them is absent, so a missing (or list-less)
 * dependency degrades this feature to a no-op disposer (no console error,
 * no PAGEERROR).
 *
 * DOM contract (host ui-workspace, read-only facts — plan §2):
 *   - the grouped tree is a role="tree" element whose direct children are
 *     group sections (the host's .groupSection divs); each section's direct
 *     children are, in order: the group header row (role="treeitem"
 *     carrying aria-expanded — possibly nested one span wrapper deep), an
 *     optional role="group" container with nested sections (workspace-tree
 *     mode), the session rows (role="treeitem" without aria-expanded, each
 *     wrapped in one span), and an optional overflow button (the section's
 *     only <button>, "展开更多").
 *   - the tree is found structurally: any role="tree" whose direct children
 *     include a group-section header qualifies. The flat list and the
 *     search tree carry no such headers, so they never match — no section
 *     counting anywhere (the legacy count-and-compare finder is gone).
 *   - rows are matched to sessions by replaying the host's own row projection
 *     and only then pairing positionally (the host exposes no id on row
 *     elements). The replay mirrors the host pipeline exactly, in order:
 *     recency or the reconciled manual order over the account's members
 *     (tree.ts:144-200 — pins, the archive partition and fork placement
 *     included), the current blank pinned first (tree.ts:214-220), the host
 *     visibility filter following the user's archivedFilter
 *     (tree.ts:229-253), then the host section partition that fronts blanks
 *     and non-archived pinned rows (tree.ts:273-287). A count mismatch or a
 *     failed pairing-trust check makes the row layer a no-op for that section
 *     (the group layer is unaffected) and logs one trace line when
 *     `dsh.ux-plus.recency.debug` is on.
 *   - the replay is only how rows get identified. The order this feature
 *     WRITES is recency in both sort modes, except the current blank row and
 *     non-archived pinned rows, which keep the host's rendered positions — so
 *     a sidebar left in 手动排序 (the host flips to it silently on the first
 *     row drag, stores.ts:104) still surfaces the conversation you are in.
 *
 * Route 1 (pure CSS): the tree and every section become flex columns and
 * each child receives a computed `order` (group rank 0..n-1; row rank 10+;
 * overflow button last), with flex-shrink pinned to 0 so single-line rows
 * are never compressed (plan G4). Every written style property is cached on
 * first write and fully restored on dispose (plan W-6).
 *
 * Zone layer (same switch, second behavior — v0.3.0 replaced the tier model
 * with ONE partition rule: last activity):
 *   - zones (`zoneOf`): Active = running === true ∪ (now - updatedAt <= 24h);
 *     dormant = everything else, a pending or unread session older than 24
 *     hours included (no status pins a row to the top any more). Zones are
 *     recomputed on every store/status signal and on a tick no longer than
 *     five minutes, so rows cross the 24h boundary while the page sits idle.
 *   - row ranking: zone first (the Active block above the dormant block), then
 *     lastActive desc, then id ascending. The current blank row and
 *     non-archived pins keep the host's positions and count as Active — a pin
 *     is never folded away behind the bar.
 *   - status dots (`statusOf`), one injected 7px dot per row instead of every
 *     status word: waiting (#f59e0b solid, 2s breathing halo), running
 *     (#3b82f6 ring spinner), unread (#22c55e solid, static); no status, no
 *     dot. Each dot carries a localized title + aria-label (待回复 / 运行中 /
 *     未读, waiting / running / unread). The host's own status dot is hidden
 *     while ours is present and restored exactly on dispose, so nothing is
 *     drawn twice.
 *   - the status source is `deps.uiSession.sessionStatus` — the ONE
 *     authoritative source of the sidebar's three indicators. Without it
 *     (degraded mode) there is no zone, no dot and no bar: this feature then
 *     behaves exactly as it did before the layer existed (pure recency).
 *   - Active-block visuals: a continuous green support (rgba(34,197,94,0.07)
 *     per row, 6px radius on the block's first and last row — attributes plus
 *     one style-tag rule, never an inline background, so the host's own hover
 *     and selected backgrounds still win). Dormant rows read at opacity .5.
 *   - compact rows (user rule): EVERY session row is dressed down to the
 *     density the sidebar was asked for — an inline 26px height and 1px/6px
 *     padding on the host row (its `.sessionRow` fixes 32px and `padding: 0
 *     8px` in CSS, so only inline wins), a 13px/18px title and a 10px/14px
 *     age, and a 4px cell gap. One box for the whole list: the Active block is
 *     told apart by its band and dots, never by a taller row. Every written
 *     property is cached and restored by dispose, so switching the feature off
 *     gives the host's own metrics back exactly.
 *   - dormant bar (`foldBarText`): the dormant block is collapsed by default
 *     behind ONE thin bar (`count 条历史会话`, a 1px line on either side). The
 *     bar doubles as the host's truncation control: while the host overflow
 *     button is collapsed its hidden count joins the bar and the button itself
 *     is hidden. Dormant rows stay in the DOM (display:none only), so the row
 *     pairing count still matches. A click reveals the dormant block for the
 *     rest of the page load (its rows keep their own dots) and proxies the
 *     host's expand click.
 *   - workspace badge: the group header shows up to three 7px dots (waiting,
 *     unread, running) for the attention the Active block is hiding — never
 *     for the dormant block, whose status never floats up. The header carries
 *     the count tooltip (`badgeTooltip`: `2 待回复 · 1 未读`) for hover and
 *     screen readers.
 *   - age label: every workspace row still carries its host-styled age, now
 *     revealed on hover (opacity 0 → 1 through the injected style tag, hidden
 *     again while the row's menu is open, where the actions take the space).
 *   - row ranking: leading rows (the current blank + non-archived pins) keep
 *     the host's positions — and they are Active for that reason alone, so a
 *     pin is never folded away; everything else ranks by zone (the Active block
 *     first), then lastActivity desc, then id ascending. Archived rows keep
 *     today's treatment exactly (host row, no band, no dot, no fold).
 *   - group layer: a workspace with a running or pending member is lifted to
 *     "now" (it is active right now even if nothing was written for hours) and
 *     the 24h auto-collapse skips it; an unread completion never lifts a group.
 *   - anti-churn: while the pointer is inside the tree, or a row menu
 *     (`.menuOpen`) is open, ambient passes are deferred behind one dirty flag
 *     and re-run on pointerout / the next subscription event, plus two bounded
 *     retries (DEFER_RETRY_MS) so a deferral never waits on a signal that may
 *     never arrive. ONE thing pierces the freeze: a change in the host's view
 *     mode (分组方式 / 排序方式 / 筛选会话) restyles immediately with no FLIP — the
 *     freeze protects the cursor from ambient churn, not the user from their own
 *     click. The idle sub-pass never pierces (it clicks rows to collapse).
 *   - FLIP: rows that moved more than 4px are translated back to their old
 *     position for one frame, then animated over FLIP_MS (best-effort and
 *     scoped: skipped under prefers-reduced-motion, or where rAF /
 *     getBoundingClientRect is unavailable — e.g. the test fixtures).
 */

export const id = 'workspace-recency-order'
export const title = 'Workspace recency order'
export const description = 'ONE partition rule: last activity. A workspace\'s sessions split into an Active block (running, or updated within 24 hours) and a dormant block that collapses behind one thin bar. Each row carries a 7px status dot instead of status text, the Active block reads as a green band of slightly taller rows, and the workspace header shows up to three dots for the attention the Active block hides. Workspaces idle for 24 hours still auto-collapse (once per workspace per page load) and every row still carries its last-active age on hover.'
export const hasGear = false
/** Settings-row copy, assembled into the `ux-plus-settings` namespace. */
export const settingsMessages = {
  zh: { title: '最近活动排序', description: '只用一条判据：最后活动时间。工作区的会话分成两块——Active 区（仍在运行，或 24 小时内更新过）与默认折叠成一条细线的休眠区。每行行首是 7px 状态点，不再有状态文字；Active 区是一整块绿底、行高略高；工作区标题只上浮 Active 区被遮住的注意点（最多三个）。超过 24 小时没有更新的工作区仍会自动收起（每次打开页面每个工作区最多一次），每行仍带悬停显现的距今未更新时间。' },
  en: { title: 'Workspace recency order', description: 'ONE partition rule: last activity. A workspace\'s sessions split into an Active block (running, or updated within 24 hours) and a dormant block that collapses behind one thin bar. Each row carries a 7px status dot instead of status text, the Active block reads as a green band of slightly taller rows, and the workspace header shows up to three dots for the attention the Active block hides. Workspaces idle for 24 hours still auto-collapse (once per workspace per page load) and every row still carries its last-active age on hover.' },
}

// ---------------------------------------------------------------------------
// Client-side behavior.
// ---------------------------------------------------------------------------

/** Host collapsed-row limit (rows/WorkspaceBrowser.tsx:44). */
const COLLAPSED_SESSION_LIMIT = 5

/** Descendant-walk depth cap (host nesting: tree > section > group > section). */
const WALK_DEPTH = 8

/** The host's persisted workspace-view store key (ui-workspace stores.ts:64-100). Read-only. */
const VIEW_STORE_KEY = 'dsh.workspace.view.v5'

/** The host's ungrouped-bucket account key (ui-workspace tree.ts:21). */
const UNGROUPED_KEY = ''

/**
 * Row-layer bail-out trace. Off by default (zero console noise); flip with
 * `localStorage.setItem('dsh.ux-plus.recency.debug', '1')` then reload. Each
 * distinct (account, reason, detail) prints once, so a persisting bail-out
 * stays diagnosable without streaming. This exists because the row layer's
 * fail-closed path used to be invisible: a drifted host replay simply meant
 * "the plugin does nothing", indistinguishable from the plugin being disabled.
 */
const TRACE_KEY = 'dsh.ux-plus.recency.debug'
const traceSeen = new Set()

function traceSkip(account, reason, detail) {
  let on = false
  try {
    on = window.localStorage.getItem(TRACE_KEY) === '1'
  } catch {
    return
  }
  if (!on) return
  const signature = `${account}|${reason}|${detail}`
  if (traceSeen.has(signature)) return
  // Bounded: a long-lived session with churning accounts forgets old lines.
  if (traceSeen.size > 200) traceSeen.clear()
  traceSeen.add(signature)
  console.debug(`[ux-plus:recency] row layer off for "${account || 'ungrouped'}": ${reason} (${detail})`)
}

/** Host Windows-path normalization (tree.ts:513-517). */
function folderPath(path) {
  const windows = /^[A-Za-z]:[/\\]/.test(path) || path.startsWith('\\\\')
  return (windows ? path.replaceAll('\\', '/') : path).replace(/\/+$/, '')
}

/**
 * Nearest registered ancestor by host path prefix (host convention,
 * tree.ts:519-538): case-sensitive, longest matching path wins.
 * @returns the owning parent path, or undefined for a root workspace.
 */
function owningParentFolder(path, parents) {
  const child = folderPath(path)
  let owner = undefined
  let length = -1
  for (const parent of parents) {
    const root = folderPath(parent)
    if (root.length > length && child !== root && child.startsWith(`${root}/`)) {
      owner = parent
      length = root.length
    }
  }
  return owner
}

/**
 * Most recent non-blank, non-subagent update in a workspace (the group-layer
 * activity signal; no-update groups carry -Infinity).
 *
 * Archive state is deliberately NOT an input. The host keeps an archived
 * session in its workspace `sessionIds` slot (workspace/src/index.ts:336-339:
 * "Archiving never touches workspace accounting"), so archiving or restoring a
 * conversation leaves this maximum untouched — the workspace section keeps its
 * rank. Excluding archived members instead made the freshest session's
 * archive drop the whole workspace to its next-newest member's timestamp: a
 * jump caused purely by hiding a row, not by any change in activity.
 */
function latestSessionUpdate(workspace, byId) {
  let latest = Number.NEGATIVE_INFINITY
  for (const sessionId of workspace.sessionIds) {
    const session = byId[sessionId]
    if (session === undefined || session.blank || session.origin === 'subagent') continue
    if (session.updatedAt > latest) latest = session.updatedAt
  }
  return latest
}

// ---------------------------------------------------------------------------
// Idle sub-behavior (same switch, same activity signal as the group layer):
//   - a workspace whose latest real activity is older than 24 hours collapses
//     automatically — at most once per workspace per page load, so a manual
//     re-expand is never fought;
//   - every workspace row with real activity carries an age label on its
//     right ("how long since this workspace was last updated"), rendered
//     exactly like the host's session-row time cell (10px/16px,
//     `--dsw-alias-label-tertiary`, hidden while the row is hovered or its
//     menu is open, where the action buttons take the space).
// Workspace rows are the divs carrying `data-row-key="workspace:<id>"`
// (Rows.tsx:245; the group key IS the workspaceId, tree.ts:26-32; the
// ungrouped bucket's key is '' and is skipped). Each row is role="treeitem"
// with aria-expanded and onClick={onToggle} (Rows.tsx:247-248), so a
// programmatic click() toggles the group through the host's own handler —
// this feature never touches the persisted view store.
// ---------------------------------------------------------------------------

/** Idle threshold: no real activity for 24 hours. */
const IDLE_MS = 24 * 60 * 60 * 1000

/** Label refresh cadence on an otherwise idle page (ms). */
const AGE_TICK_MS = 60 * 1000

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

// ---------------------------------------------------------------------------
// Zone-layer constants (v0.3.0). Same switch as the recency layer; all of them
// are inert in degraded mode (no status source → nothing below runs).
// ---------------------------------------------------------------------------

/** Active zone: a session running now, or updated within this window. */
const ACTIVE_MS = 24 * HOUR_MS

/** Zone recompute cadence (ms): the Active/dormant boundary must not go stale. */
const ZONE_TICK_MS = 5 * MINUTE_MS

/**
 * Deferred-pass retry cadences (ms, spec §7). A pass deferred by the churn
 * freeze used to wait for the next external signal (pointerout, a store
 * notification, a mutation) and nothing else — and with the pointer resting
 * inside the tree every one of those signals re-defers, so a restyle could wait
 * indefinitely. Two bounded retries close that hole; the cap keeps a pointer
 * that simply stays put from costing a timer loop.
 */
const DEFER_RETRY_MS = [300, 1200]

/**
 * How long a user action on one of this feature's own controls keeps the churn
 * freeze open (ms, spec §7). Long enough for the pass that answers the click
 * PLUS the follow-up pass the proxied host control needs (opening the host's
 * truncation is a React state change: our layer only converges on the very next
 * pass, and that pass may well arrive as a bare DOM mutation), short enough that
 * the freeze is back to protecting a resting cursor right after.
 */
const USER_ACTION_MS = 1000

/**
 * How many consecutive unexplained-count passes a section keeps its last
 * consistent presentation (spec §1: a bail is 'unknown', not 'wrong'). Our
 * passes ride the host's own mutations, so the first bail after a host commit is
 * usually the store lagging by a beat and the very next pass agrees again;
 * tearing the section down for that beat is what made the green band vanish.
 * Three passes is long enough to ride out a commit and short enough that a
 * shape this feature truly cannot model hands the section back quickly.
 */
const DRIFT_GRACE_PASSES = 3

/** FLIP transition duration (ms) for rows that moved. */
const FLIP_MS = 180

/** Row rank of this feature's synthetic dormant bar (the overflow button is 999). */
const FOLD_ROW_ORDER = '998'

/** Marker values this feature injects into the tree. */
const FOLD_VALUE = 'fold-bar'
const BADGE_VALUE = 'attention-badge'
const DOT_VALUE = 'session-status-dot'
const BAND_VALUE = 'zone-band'

/**
 * Zone marks written on the HOST's row element — deliberately not on
 * `data-dsh-ux-plus`, which keeps meaning "this child is ours" (the row
 * pairing skips those children). The green Active band is ONE absolutely
 * positioned element behind the whole block (never a background per row), so
 * the rows stay transparent and the host's hover still paints; the selected
 * override is keyed on these attributes.
 */
const ZONE_ATTR = 'data-dsh-ux-zone'

/** Status-dot geometry and the one color per status kind (spec §3). */
const DOT_SIZE = '7px'
const DOT_COLORS = { waiting: '#f59e0b', running: '#3b82f6', unread: '#22c55e' }

const COMPACT_ROW_HEIGHT = '26px'
const DORMANT_OPACITY = '0.5'

/**
 * Text metrics (px) for one session row — the user's density rule. The title is
 * the row's ONLY text (the age trails it, the status is a 7px dot), so the
 * hierarchy lives in these two steps: 13/18 reads a step below the host's 14/20
 * while the row shrinks from 32px to 26px, i.e. one step of extra conversation
 * per screen without the list losing its rhythm.
 */
const COMPACT_TITLE_FONT = '13px'
const COMPACT_TITLE_LEADING = '18px'
const COMPACT_AGE_FONT = '10px'
const COMPACT_AGE_LEADING = '14px'
/** The compact title's lateral margin: the row's own flex gap owns the spacing. */
const COMPACT_TITLE_MARGIN = '0px'

/** The Active block's band (spec §2): a green wash, not a translucent overlay. */
const ZONE_BACKGROUND = 'rgba(34, 197, 94, 0.07)'

/** A selected row INSIDE the band (user rule): the band's own green, stronger. */
const ZONE_SELECTED = 'rgba(34, 197, 94, 0.18)'

/**
 * Classify one session row into its zone (v0.3.0 spec §1) — the ONE partition
 * rule is last activity: a session running right now, or whose last activity is
 * at most 24 hours old, is Active; everything else is dormant, whatever its
 * status. A pending interaction or an unread completion on a session idle for
 * more than a day therefore belongs to the dormant block: it keeps its status
 * dot, but it no longer pins itself to the top.
 *
 * Pure on purpose (test surface): `now` is an input, never read from the clock
 * here, so the 24h boundary is exactly testable.
 *
 * @param {{now: number, updatedAt: number, status?: object}} input
 * @returns {'active'|'dormant'}
 */
export function zoneOf(input) {
  const status = input.status
  if (status !== undefined && status !== null && status.running === true) return 'active'
  return input.now - input.updatedAt <= ACTIVE_MS ? 'active' : 'dormant'
}

/**
 * Classify one session's status into the single dot it carries (spec §3).
 * Precedence: a blocking pendingInteraction outranks a running session, which
 * outranks an unread completion. Pure (test surface).
 *
 * @param {object|undefined|null} status - one `sessionStatus` entry.
 * @returns {'waiting'|'running'|'unread'|'none'}
 */
export function statusOf(status) {
  if (status === undefined || status === null) return 'none'
  if (status.pendingInteraction !== undefined && status.pendingInteraction !== null) return 'waiting'
  if (status.running === true) return 'running'
  if (status.completionUnread === true) return 'unread'
  return 'none'
}

/** A count clamped to a non-negative integer (defensive locale-helper input). */
function countOf(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

/** True when the active locale id is Chinese ('zh' prefix wins, else English). */
function isChinese(locale) {
  return typeof locale === 'string' && locale.toLowerCase().startsWith('zh')
}

/**
 * The workspace header badge's tooltip for a set of hidden Active-zone counts
 * (spec §5): `2 待回复 · 1 未读` / `2 waiting · 1 unread`, zero parts omitted,
 * and an empty string when there is no hidden attention at all (the caller
 * then removes the badge). Hover and screen readers read the same string.
 * @param {string} locale - active locale id ('zh' prefix wins, else en).
 * @param {{pending?: number, unread?: number, running?: number}} counts
 * @returns {string}
 */
export function badgeTooltip(locale, counts) {
  const pending = countOf(counts && counts.pending)
  const unread = countOf(counts && counts.unread)
  const running = countOf(counts && counts.running)
  const zh = isChinese(locale)
  const parts = []
  if (pending > 0) parts.push(zh ? `${pending} 待回复` : `${pending} waiting`)
  if (unread > 0) parts.push(zh ? `${unread} 未读` : `${unread} unread`)
  if (running > 0) parts.push(zh ? `${running} 运行中` : `${running} running`)
  return parts.join(' · ')
}

/**
 * The badge's dots (spec §5): at most three kinds, in the fixed reading order
 * waiting (orange) → unread (green) → running (blue); a kind with a zero count
 * contributes no dot. Pure (test surface).
 * @param {{pending?: number, unread?: number, running?: number}} counts
 * @returns {('waiting'|'unread'|'running')[]}
 */
export function badgeKinds(counts) {
  const kinds = []
  if (countOf(counts && counts.pending) > 0) kinds.push('waiting')
  if (countOf(counts && counts.unread) > 0) kinds.push('unread')
  if (countOf(counts && counts.running) > 0) kinds.push('running')
  return kinds
}

/** One status dot's localized label, for its title and aria-label (spec §3). */
export function statusLabel(locale, kind) {
  const zh = isChinese(locale)
  if (kind === 'waiting') return zh ? '待回复' : 'waiting'
  if (kind === 'running') return zh ? '运行中' : 'running'
  if (kind === 'unread') return zh ? '未读' : 'unread'
  return ''
}

/**
 * The dormant bar's text (spec §4): how many sessions the bar is hiding — the
 * whole dormant block, plus whatever the host's own truncation contributed
 * (the bar absorbs the host's count and hides its button).
 *
 * The 1px lines either side are flex decoration in the style tag, not
 * characters in this string.
 */
export function foldBarText(locale, count) {
  return isChinese(locale) ? `${countOf(count)} 条历史会话` : `${countOf(count)} earlier sessions`
}

/**
 * The bar's label while the block it owns is revealed (issue 4): the bar
 * stays as the collapse control, so it must say what the click does.
 */
export function foldBarCollapseText(locale) {
  return isChinese(locale) ? '收起历史会话' : 'Collapse history'
}

/**
 * The Active-zone members that carry attention (spec §5), split by kind: a
 * member of the workspace with a pending interaction, a live run, or an unread
 * completion — but only while it is Active. Reads the data layer only: the host
 * does not render collapsed rows beyond its quota, so counting DOM rows would
 * undercount exactly when the badge matters. The dormant block is deliberately
 * invisible here — a status older than 24 hours never floats up to the header.
 * Blank placeholders, subagent sessions and archived sessions are not
 * attention (archived rows keep today's treatment).
 */
function activeZoneAttention(memberIds, data) {
  const waiting = []
  const unread = []
  const running = []
  if (data.statusMap === null) return { waiting, unread, running }
  for (const sessionId of memberIds) {
    const session = data.byId[sessionId]
    if (session === undefined || session.blank === true || session.origin === 'subagent') continue
    if (data.archived.has(sessionId)) continue
    const status = data.statusMap.get(sessionId)
    const kind = statusOf(status)
    if (kind === 'none') continue
    if (zoneOf({ now: data.now, updatedAt: session.updatedAt, status }) === 'dormant') continue
    if (kind === 'waiting') waiting.push(sessionId)
    else if (kind === 'unread') unread.push(sessionId)
    else running.push(sessionId)
  }
  return { waiting, unread, running }
}

/**
 * True while a workspace holds work that is happening right now (spec §6): a
 * member that is running or waiting on the user. The group layer lifts such a
 * workspace to "now" and the idle auto-collapse skips it — collapsing it would
 * hide work in progress. Unread completions are deliberately NOT blocking:
 * they wait for the user, so they must not pin a group forever.
 */
function hasBlockingAttention(memberIds, data) {
  if (data.statusMap === null) return false
  for (const sessionId of memberIds) {
    const status = data.statusMap.get(sessionId)
    if (status === undefined || status === null) continue
    if (status.running === true
      || (status.pendingInteraction !== undefined && status.pendingInteraction !== null)) return true
  }
  return false
}

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

/** The injected age label among a row's direct children, or null. */
function findAgeLabel(row) {
  for (const child of row.children) {
    if (child.dataset && child.dataset.dshUxPlus === LABEL_VALUE) return child
  }
  return null
}

/** The host row's actions span (the label sits before it), or null. */
function findRowActions(row) {
  for (const child of row.children) {
    if (typeof child.className === 'string' && child.className.includes('rowActions')) return child
  }
  return null
}

/** Remove this feature's age label from a row (idempotent). */
function removeAgeLabel(row) {
  const label = findAgeLabel(row)
  if (label !== null) label.remove()
}

/**
 * Host row visibility (tree.ts:229-253 `sessionVisible`): subagent sessions
 * never render; a blank row renders only while it is the current session;
 * archived rows follow the user's archived filter — 'default' hides them,
 * 'show' mixes them into their kept slots, 'only' restricts the list to them.
 * The filter is an input, not a constant: hard-coding 'default' made this
 * replay disagree with the host the moment the sidebar was set to show
 * archives, and the row layer then failed its count check and no-op'd.
 */
function rowVisible(session, id, currentId, archived, archivedFilter) {
  if (session === undefined || session.origin === 'subagent') return false
  if (session.blank === true && id !== currentId) return false
  if (archivedFilter === 'show') return true
  if (archivedFilter === 'only') return archived.has(id)
  return !archived.has(id)
}

/**
 * Host recency projection (tree.ts:144-157): known members newest first,
 * session id as the deterministic tie-break; members without a summary are
 * omitted until theirs arrives.
 */
function orderByRecency(memberIds, byId) {
  const known = []
  for (const id of memberIds) {
    const session = byId[id]
    if (session === undefined) continue
    known.push({ id, updatedAt: session.updatedAt })
  }
  known.sort((a, b) => (a.updatedAt !== b.updatedAt
    ? b.updatedAt - a.updatedAt
    : a.id < b.id ? -1 : 1))
  return known.map((member) => member.id)
}

/**
 * Host manual-order reconciliation (tree.ts:166-200), ported exactly: retained
 * saved slots first, then non-archived pinned members, then the remaining
 * known members by recency, then archived members last; a new fork is spliced
 * in front of its parent. `rowState` carries the registry-global pin and
 * archive sets — omitting them (the historical 3-argument shape) made this
 * replay drop the pin block and the archive partition, so its result no longer
 * matched what the host renders and the row layer silently stopped pairing.
 */
function reconcileManualOrder(memberIds, savedOrder, byId, rowState) {
  const members = new Map(memberIds.map((id) => [id, id]))
  const included = new Set()
  const ordered = []
  for (const key of savedOrder ?? []) {
    const id = members.get(key)
    if (id === undefined || included.has(key)) continue
    ordered.push(id)
    included.add(key)
  }
  const archived = new Set(rowState && rowState.archived ? rowState.archived : [])
  const pins = []
  for (const sessionId of (rowState && rowState.pinned ? rowState.pinned : [])) {
    const id = members.get(sessionId)
    if (id === undefined || included.has(id) || archived.has(id) || byId[id] === undefined) continue
    pins.push(id)
    included.add(id)
  }
  const ordinary = []
  const archives = []
  for (const id of orderByRecency(memberIds.filter((id) => !included.has(id)), byId)) {
    if (archived.has(id)) archives.push(id)
    else ordinary.push(id)
  }
  const result = [...pins, ...ordered, ...ordinary, ...archives]
  const pending = new Set(ordinary)
  const placeFork = (id) => {
    if (!pending.delete(id)) return
    const parentId = byId[id] && byId[id].parentId
    if (parentId === undefined || parentId === id || !result.includes(parentId)) return
    placeFork(parentId)
    result.splice(result.indexOf(id), 1)
    result.splice(result.indexOf(parentId), 0, id)
  }
  for (const id of [...ordinary].reverse()) placeFork(id)
  return result
}

/**
 * Host section partition (tree.ts:273-287 `sectionMembers`), applied AFTER the
 * order projection and the visibility filter: blank placeholders first, then
 * non-archived pinned rows, then the rest in the projected order. The host
 * runs it on every group and flat list, so a section holding a pinned session
 * renders that session ahead of the projected order — replaying without it
 * pairs DOM rows against the wrong sessions.
 */
function sectionPartition(ids, data) {
  const placeholders = []
  const leading = []
  const rest = []
  for (const id of ids) {
    const session = data.byId[id]
    if (session === undefined) continue
    if (session.blank === true) placeholders.push(id)
    else if (!data.archived.has(id) && data.pinned.has(id)) leading.push(id)
    else rest.push(id)
  }
  return [...placeholders, ...leading, ...rest]
}

/**
 * Host blank pinning (tree.ts:194-200): the selected blank row first, no
 * duplicate slot.
 */
function pinCurrentBlank(order, currentBlank) {
  if (currentBlank === undefined) return [...order]
  return [currentBlank, ...order.filter((id) => id !== currentBlank)]
}

/**
 * The live host ordering inputs, read from the host store's own persisted
 * snapshot (read-only, W-2). The host writes the whole workspace-view state
 * to the key on every change (store/src/index.ts:146-166), so it is the live
 * orderBy / sessionOrderByAccount — no subscription needed, and this feature
 * never writes to it. Absent/unreadable state falls back to the host default
 * view (orderBy 'updated').
 */
function readViewStore() {
  try {
    const raw = window.localStorage.getItem(VIEW_STORE_KEY)
    if (raw === null) return null
    const state = JSON.parse(raw)
    if (state === null || typeof state !== 'object') return null
    return state
  } catch (err) {
    return null
  }
}

function viewOrdering() {
  const state = readViewStore()
  // The host's own default when the key is absent or unreadable.
  const archivedFilter = state !== null
    && (state.archivedFilter === 'show' || state.archivedFilter === 'only')
    ? state.archivedFilter
    : 'default'
  if (state === null || state.orderBy !== 'manual') return { orderBy: 'updated', saved: undefined, archivedFilter }
  const saved = state.sessionOrderByAccount
  return {
    orderBy: 'manual',
    saved: saved !== null && typeof saved === 'object' ? saved : undefined,
    archivedFilter,
  }
}

/**
 * The host's view-mode signature: 分组方式 / 排序方式 / 筛选会话 as one string.
 * A change here is the user explicitly asking for a different list, which is
 * the one thing the churn freeze must never hold back (spec §7). Absent or
 * unreadable state has its own stable signature, so a first read and a
 * disappeared key are both detected exactly once, never repeatedly.
 * @returns the joined signature of the three view options
 */
function viewSignature() {
  const state = readViewStore()
  if (state === null) return 'absent'
  return `${state.groupBy}|${state.orderBy}|${state.archivedFilter}`
}

/**
 * The host's actual rendered row order for one section account
 * (WorkspaceBrowser.tsx:804-838 + tree.ts:144-212): the recency or manual
 * projection over the account's members, the current blank pinned first,
 * then the host visibility filter. For the ungrouped bucket this is exactly
 * what the host's double projection (orderedUngrouped over the already
 * projected bucket order) collapses to, because the projected order covers
 * every stray member.
 */
function renderedOrder(memberIds, key, data, view) {
  const byId = data.byId
  const base = view.orderBy === 'manual'
    ? reconcileManualOrder(memberIds, view.saved ? view.saved[key] : undefined, byId,
      { pinned: data.pinned, archived: data.archived })
    : orderByRecency(memberIds, byId)
  const currentBlank = data.currentId !== undefined && memberIds.includes(data.currentId)
    && byId[data.currentId] !== undefined && byId[data.currentId].blank === true
    ? data.currentId
    : undefined
  return sectionPartition(
    pinCurrentBlank(base, currentBlank)
      .filter((id) => rowVisible(byId[id], id, data.currentId, data.archived, view.archivedFilter)),
    data,
  )
}

/**
 * Host row-exemption rule (rows/WorkspaceBrowser.tsx:55-70): a row is exempt
 * from the collapsed idle quota when it is blank, running, or a parent with a
 * running subagent. Only idle rows count against the quota, so a collapsed
 * section renders more than COLLAPSED_SESSION_LIMIT rows whenever it holds a
 * running conversation (1 running + 5 idle is the common shape) — the exact
 * case where a blank-only port replays a shorter slice, trips the count gate
 * and leaves the section's row layer silently off (stale row on top, running
 * session below it).
 */
function rowExempt(session, id, data) {
  return Boolean(session.blank) || Boolean(session.running) || runningChildCount(data, id) > 0
}

/**
 * The host's running-subagent count for one parent row (tree.ts:390-395):
 * the session's `subagentCatalog` projection values, counting children whose
 * live row reports running. The host reads the ui-session status store first
 * and falls back to the list row; this feature owns no statuses service, so
 * it reads the same fallback (`byId[childId].running`). A divergence only
 * lowers the exemption count, which the count gate then fails closed on — it
 * can never paint a wrong order.
 */
function runningChildCount(data, parentId) {
  const projections = data.projectionsBySession
  const catalog = projections !== undefined && projections !== null
    ? projections[parentId]?.values?.subagentCatalog
    : undefined
  if (!Array.isArray(catalog)) return 0
  let count = 0
  for (const child of catalog) {
    const row = data.byId[child.id]
    if (row !== undefined && row.running === true) count += 1
  }
  return count
}

/**
 * The host's collapsed slice (rows/WorkspaceBrowser.tsx:55-70) over the
 * replayed row order: every exempt row keeps its rendered position, and only
 * the first `limit` idle rows survive. `limit` is the host's PER-GROUP React
 * state — 5, then +5 per "展开更多" click, Infinity once nothing is hidden
 * (WorkspaceBrowser.tsx:300/581-601) — so callers must not assume the 5
 * default; collapsedShown derives the live quota from the DOM.
 */
function collapsedRows(ids, data, limit = COLLAPSED_SESSION_LIMIT) {
  let idle = 0
  return ids.filter((id) => {
    if (rowExempt(data.byId[id], id, data)) return true
    if (idle >= limit) return false
    idle += 1
    return true
  })
}

/**
 * The slice the host actually rendered, given the row count the DOM shows.
 *
 * A truncated section renders `totalExempt + limit` rows, so the live quota
 * is derivable: `limit = domCount - exempt`. The host only ever uses 5, 10,
 * 15… (the +5 step) or the whole list, so a count that does not land on a
 * multiple of COLLAPSED_SESSION_LIMIT is drift, not a quota — the default is
 * handed to the count gate, which fails closed instead of guessing.
 *
 * @returns {string[] | null} the slice, or null when the whole group is
 * folded (no rows rendered while the replay expects rows).
 */
function collapsedShown(expected, data, domCount) {
  if (domCount >= expected.length) return expected
  if (domCount === 0) return null
  const exempt = expected.filter((id) => rowExempt(data.byId[id], id, data)).length
  const limit = domCount - exempt
  return collapsedRows(expected, data, limit > 0 && limit % COLLAPSED_SESSION_LIMIT === 0
    ? limit
    : COLLAPSED_SESSION_LIMIT)
}

/**
 * Pairing-trust check before any row order is written (W-2 fallback —
 * "presentation never guesses"): each paired row must confirm the pairing
 * from its own visible text. An ordinary row confirms when one of its LEAF
 * elements (an element with no element children, the row itself included)
 * carries normalized text starting with the session's normalized
 * displayTitle. The host renders the title in its own leaf span (Rows.tsx
 * title span, then the time leaf), so the status badge the host renders in
 * the row's preceding status slot (visually-hidden labels that still land in
 * textContent) no longer breaks the check: a status leaf carries status
 * copy, which does not start with the session's title, and the trailing time
 * leaf cannot confirm either. The row's own whole text (the historical
 * signal, now whitespace-normalized) is an additional confirming source: it
 * keeps rows confirmable when the title text is split across sibling leaves
 * and matches what the host DOM reports for the row wrapper. A blank row
 * renders a localized label this feature cannot know, so it is pinned to its
 * position instead: the host's pinCurrentBlank invariant puts a visible blank
 * row at index 0. Failure boundaries: a row with neither its whole text nor
 * any leaf confirming the title, an empty or non-string displayTitle, or a
 * blank row anywhere but index 0, fails closed (the whole section's row
 * layer no-ops); the check is positional and prefix-anchored (no substring
 * match), so one title prefixing another row's text cannot cross-align.
 */
function pairingTrustworthy(rows, shown, byId) {
  return firstUnpairedRow(rows, shown, byId) === -1
}

/**
 * Index of the first paired row that does not confirm its session, or -1 when
 * every pairing is confirmed. Same rule `pairingTrustworthy` documents; the
 * index exists so a bail-out can say where it broke instead of saying nothing.
 */
function firstUnpairedRow(rows, shown, byId) {
  for (let i = 0; i < shown.length; i += 1) {
    const session = byId[shown[i]]
    if (session === undefined) return i
    if (session.blank === true) {
      if (i !== 0) return i
      continue
    }
    const title = session.displayTitle
    if (typeof title !== 'string' || title === '') return i
    const target = normalizeText(title)
    if (target === '') return i
    if (!rowCarriesTitle(rows[i], target)) return i
  }
  return -1
}

/**
 * True when the row's whole text, or a leaf element (no element children) in
 * its subtree, has normalized text starting with the normalized title. The
 * row's whole text is the historical pairing signal (in the host DOM, the
 * wrapper's textContent is the row's leading text); the leaf walk is what
 * makes host-shaped rows confirmable despite the status badge the host
 * renders before the title — the title span is a leaf, the status leaf is
 * not the title, and the time leaf cannot confirm. Walking element children
 * (not querySelectorAll) keeps this identical for the host DOM and for the
 * plain-object row fixtures in tests.
 */
function rowCarriesTitle(row, target) {
  if (normalizeText(row.textContent).startsWith(target)) return true
  for (const child of row.children) {
    if (leafConfirms(child, target)) return true
  }
  return false
}

/** True when a leaf element (no element children) in the subtree does. */
function leafConfirms(el, target) {
  if (el.children.length === 0) return normalizeText(el.textContent).startsWith(target)
  for (const child of el.children) {
    if (leafConfirms(child, target)) return true
  }
  return false
}

/**
 * The ungrouped bucket's members: every session no workspace claims (host
 * accounting, WorkspaceBrowser.tsx:809-812 — hidden members included).
 */
function ungroupedMembers(data) {
  const owned = new Set()
  for (const workspace of data.items) {
    for (const sessionId of workspace.sessionIds) owned.add(sessionId)
  }
  return Object.keys(data.byId).filter((id) => !owned.has(id))
}

/** A group header row: role="treeitem" carrying aria-expanded. */
function isHeaderRow(element) {
  return element.getAttribute('role') === 'treeitem' && element.hasAttribute('aria-expanded')
}

/** A session row: role="treeitem" without aria-expanded. */
function isSessionRow(element) {
  return element.getAttribute('role') === 'treeitem' && !element.hasAttribute('aria-expanded')
}

/** True when element (or a descendant within WALK_DEPTH) is a group header row. */
function hasHeaderRow(element, depth) {
  if (depth > WALK_DEPTH) return false
  if (isHeaderRow(element)) return true
  for (const child of element.children) {
    if (hasHeaderRow(child, depth + 1)) return true
  }
  return false
}

/** True when element (or a descendant within WALK_DEPTH) is a session row. */
function hasSessionRow(element, depth) {
  if (depth > WALK_DEPTH) return false
  if (isSessionRow(element)) return true
  for (const child of element.children) {
    if (hasSessionRow(child, depth + 1)) return true
  }
  return false
}

/** A group section: a tree child carrying a section header row. */
function isSection(element) {
  return hasHeaderRow(element, 0)
}

/**
 * The section's session-row children (direct children whose subtree is a
 * session row). The host wraps each row in one span, so the styled element
 * is the direct child — that is the flex item receiving `order`.
 */
function rowChildren(section) {
  const rows = []
  for (const child of section.children) {
    // This feature's own injected children (the fold row) are never session
    // rows: the pairing count gate and the row↔session alignment must stay
    // untouched by anything this feature adds to the tree (the host renders
    // no such child, so a marker is the only honest way to tell them apart).
    if (child.dataset !== undefined && child.dataset !== null
      && child.dataset.dshUxPlus !== undefined && child.dataset.dshUxPlus !== null
      && child.dataset.dshUxPlus !== '') continue
    if (child.getAttribute('role') === 'group') continue
    if (child.tagName === 'BUTTON') continue
    if (isSection(child)) continue
    if (hasSessionRow(child, 0)) rows.push(child)
  }
  return rows
}

/** The section's nested-group container (<div role="group">), or null. */
function groupContainer(section) {
  for (const child of section.children) {
    if (child.getAttribute('role') === 'group') return child
  }
  return null
}

/** The section's overflow ("展开更多") button, or null while absent. */
function overflowButton(section) {
  for (const child of section.children) {
    if (child.tagName === 'BUTTON') return child
  }
  return null
}

/** The group is collapsed when the overflow button is present and unexpanded. */
function sectionCollapsed(section) {
  const button = overflowButton(section)
  return button !== null && button.getAttribute('aria-expanded') === 'false'
}

// ---------------------------------------------------------------------------
// Liveness layer (spec §1-§8). Everything here is inert without a status map:
// callers guard on `data.statusMap !== null` (degraded mode == the feature as
// it behaved before this layer existed).
// ---------------------------------------------------------------------------

/**
 * Row geometry (user rule: the compact, Claude-like sidebar). ONE box for
 * Active, dormant and archived rows alike — the host pins `.sessionRow { height:
 * 32px; padding: 0 8px; gap: 0 }` in CSS (Rows.module.css:110-117), so inline
 * values are the only way to re-dress it, and a uniform box is what keeps the
 * list even (the Active block is told apart by its green band and its status
 * dots, never by a taller row). Dormant is the one difference that survives: it
 * fades. Archives keep the host's own dimming class on top of this box.
 *
 * The leading pad is deliberately NOT in this spec. The host sets
 * `padding-inline-start: calc(8px + var(--dsh-workspace-indent, 0px))`
 * (Rows.module.css:8) and that variable is the tree depth the browser publishes
 * on the ancestor group section (WorkspaceBrowser.tsx:462, depth * 12px), so an
 * inline `padding-inline` shorthand would flatten every nested row's indent to a
 * constant. Only the trailing pad is this layer's business.
 *
 * `boxSizing` is part of the box on purpose. The host has no global border-box
 * reset (ui-theme ships only `* { margin: 0 }`-style base rules) and
 * `.sessionRow` is the one row kind that does not opt in, so with the default
 * content-box a `height: 26px` plus 1px of block padding renders 28px — a
 * measured 28px box, not a 26px one. The sibling kinds do opt in
 * (Rows.module.css: `.projectRow { height: 34px; box-sizing: border-box }`,
 * same for `.searchResultRow`), so the compact box declares border-box and the
 * height it names is the height the browser paints.
 */
const ROW_DENSITY = {
  boxSizing: 'border-box',
  height: COMPACT_ROW_HEIGHT,
  paddingBlock: '1px',
  paddingInlineEnd: '6px',
  gap: '4px',
  opacity: null,
}
const DORMANT_DENSITY = {
  boxSizing: 'border-box',
  height: COMPACT_ROW_HEIGHT,
  paddingBlock: '1px',
  paddingInlineEnd: '6px',
  gap: '4px',
  opacity: DORMANT_OPACITY,
}

/** The inline properties the density layer owns (restored when not in use). */
const DENSITY_PROPERTIES = ['boxSizing', 'height', 'paddingBlock', 'paddingInlineEnd', 'gap', 'opacity']

/**
 * The row's own text cells, re-dressed to the compact metrics. The title is the
 * row's only text (the age trails it, status is a dot), so these two are the
 * whole typography of a session row — the host's `.title` (14px/20px, and its
 * own 6px/4px lateral margins at Rows.module.css:115-117) and `.time`
 * (10px/16px) all live in CSS, hence inline again. The title's margins give way
 * to the row's 4px flex gap, as in the Claude sidebar this matches.
 */
const COMPACT_TARGETS = [
  {
    selector: '.title',
    styles: {
      fontSize: COMPACT_TITLE_FONT,
      lineHeight: COMPACT_TITLE_LEADING,
      marginLeft: COMPACT_TITLE_MARGIN,
      marginRight: COMPACT_TITLE_MARGIN,
    },
  },
  { selector: '.time', styles: { fontSize: COMPACT_AGE_FONT, lineHeight: COMPACT_AGE_LEADING } },
]

/**
 * Re-dress one row's text cells. `selector` is tried first and each target
 * listed there is compacted; an element exposing no selector engine (the plain
 * object fixtures) is left alone rather than guessed at — the metrics are a
 * presentation nicety, never a reason to touch a row the pairing already
 * accepted. Every element written is remembered so `relaxRow` can put it back
 * the moment the row stops being a session row we style.
 */
function compactRow(styles, row) {
  if (typeof row.querySelectorAll !== 'function') return
  for (const target of COMPACT_TARGETS) {
    let found = null
    try {
      found = row.querySelectorAll(target.selector)
    } catch { continue }
    for (const element of found) {
      for (const property of Object.keys(target.styles)) styles.write(element, property, target.styles[property])
    }
  }
}

/** Undo compactRow for one row (archived rows and dispose get the host back). */
function relaxRow(styles, row) {
  if (typeof row.querySelectorAll !== 'function') return
  for (const target of COMPACT_TARGETS) {
    let found = null
    try {
      found = row.querySelectorAll(target.selector)
    } catch { continue }
    for (const element of found) {
      for (const property of Object.keys(target.styles)) styles.restore(element, property)
    }
  }
}

/** The workspace header row's aria-expanded state (undefined while unreadable). */
function sectionExpanded(section) {
  const row = sectionHeaderRow(section, 0)
  if (row === null || typeof row.getAttribute !== 'function') return undefined
  const value = row.getAttribute('aria-expanded')
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

/**
 * The element a row's density is written on: the host's own `data-row-key`
 * row when the flex item IS the row, else the first such row inside the flex
 * item (the host wraps each row in one span), else the flex item itself. The
 * guards exist because the test fixtures are plain objects without matches()
 * or firstElementChild — a missing method must never cost a row its styling.
 */
function rowElementOf(entry) {
  const element = entry.element
  if (element === undefined || element === null) return element
  if (typeof element.matches === 'function') {
    try {
      if (element.matches('[data-row-key^="session:"]')) return element
    } catch { /* an exotic matches() is no reason to skip the row */ }
  }
  if (typeof element.querySelector === 'function') {
    const inner = element.querySelector('[data-row-key^="session:"]')
    if (inner !== null && inner !== undefined) return inner
  }
  return element.firstElementChild || element
}

/**
 * This row's zone (spec §1). Leading rows — the current blank and the user's
 * own pins — count as Active whatever their timestamp: they keep the host's
 * front positions, and folding a pin away behind the dormant bar would fight an
 * explicit user action. Only called with a status map (degraded mode has no
 * zones, no dots and no bar at all).
 */
function zoneEntryOf(entry, data) {
  if (entry.leading === true) return 'active'
  return zoneOf({
    now: data.now,
    updatedAt: entry.session.updatedAt,
    status: data.statusMap.get(entry.session.id),
  })
}

/** The density spec for one ranked row (spec §2/§4). */
function densitySpec(entry, data) {
  // Archived rows keep the host's treatment exactly: no compact box, no green
  // band, no fade — the host already dims them, and the archived filter above
  // decides whether they render at all.
  if (data.archived.has(entry.session.id)) return null
  return entry.zone === 'active' ? ROW_DENSITY : DORMANT_DENSITY
}

/**
 * Apply one density spec, restoring every property the spec does not use. A
 * null spec (an archived row) means "host metrics exactly": every property this
 * layer owns goes back, so a row that just left the archive is not stuck in the
 * box the previous pass wrote.
 */
function applyDensity(styles, element, spec) {
  if (element === undefined || element === null) return
  for (const property of DENSITY_PROPERTIES) {
    const value = spec === null ? null : spec[property]
    if (value === undefined || value === null) styles.restore(element, property)
    else styles.write(element, property, value)
  }
}

// ---------------------------------------------------------------------------
// Status dots (spec §3): each row's leading slot carries ONE 7px dot instead of
// every status word. The dot is this feature's own element (marker
// `data-dsh-ux-plus="session-status-dot"`), so the row-children helpers skip it;
// the host's own status dot — the element carrying `data-state`
// (ui-primitives/StateDot.tsx, `.dot[data-state]`) — is HIDDEN while ours is
// up and restored to exactly what it was on dispose. A double dot is never
// drawn, and the host element stays in place because React would put it back on
// the next render anyway; hiding it is the only stable route.
// ---------------------------------------------------------------------------

/** True when the element carries the host's own status attribute. */
function hasDataState(element) {
  return element !== undefined && element !== null && typeof element.getAttribute === 'function'
    && element.getAttribute('data-state') !== null
}

/** The host's own status dot in this row (the slot or its first marked child). */
function hostStatusDot(row) {
  for (const child of row.children) {
    if (hasDataState(child)) return child
    for (const inner of child.children) {
      if (hasDataState(inner)) return inner
    }
  }
  return null
}

/**
 * This feature's status dot in a row, or null. The host row nests it one level
 * down — inside the leading slot, ahead of the host's own dot — so the walk
 * mirrors hostStatusDot's; a pass that could not see its own dot would stack a
 * new one on every recompute.
 */
function findStatusDot(row) {
  for (const child of row.children) {
    if (child.dataset !== undefined && child.dataset !== null && child.dataset.dshUxPlus === DOT_VALUE) return child
    for (const inner of child.children) {
      if (inner.dataset !== undefined && inner.dataset !== null && inner.dataset.dshUxPlus === DOT_VALUE) return inner
    }
  }
  return null
}

/** The row's leading slot: its first child that is not one of our markers. */
function dotSlotOf(row) {
  for (const child of row.children) {
    if (child.dataset !== undefined && child.dataset !== null && child.dataset.dshUxPlus) continue
    return child
  }
  return row
}

/** Paint one dot (spec §3): solid orange/green, or a blue ring for running. */
function styleDot(dot, kind) {
  if (dot === undefined || dot === null) return
  if (kind === 'running') {
    dot.style.backgroundColor = ''
    dot.style.border = `2px solid ${DOT_COLORS.running}`
    dot.style.borderTopColor = 'transparent'
  } else {
    dot.style.backgroundColor = DOT_COLORS[kind]
    dot.style.border = ''
    dot.style.borderTopColor = ''
  }
  if (dot.dataset !== undefined && dot.dataset !== null) dot.dataset.dshUxKind = kind
}

/** Put the host's own dot back (idempotent; also what dispose ends with). */
function restoreHostDot(row, data) {
  const host = hostStatusDot(row)
  if (host !== null) data.styles.restore(host, 'display')
}

/**
 * Draw this row's status dot (spec §3), or take ours back out when the session
 * has no status at all — then the host's own dot shows again. The dot is
 * inserted at the front of the row's leading slot, its localized label carried
 * as `title` and `aria-label` (role="img", like the host's own PinnedIndicator:
 * a bare span labelled only by aria-label is not reliably announced).
 */
function ensureStatusDot(row, kind, locale, data) {
  const existing = findStatusDot(row)
  if (kind === 'none') {
    if (existing !== null) detach(existing, data.dots)
    restoreHostDot(row, data)
    return
  }
  let dot = existing
  if (dot === null) {
    dot = document.createElement('span')
    dot.dataset.dshUxPlus = DOT_VALUE
    dot.style.flex = 'none'
    dot.style.display = 'inline-block'
    dot.style.width = DOT_SIZE
    dot.style.height = DOT_SIZE
    dot.style.borderRadius = '50%'
    dot.style.boxSizing = 'border-box'
    const slot = dotSlotOf(row)
    if (slot === row || typeof slot.insertBefore !== 'function') row.appendChild(dot)
    else slot.insertBefore(dot, slot.children.length > 0 ? slot.children[0] : null)
    data.dots.add(dot)
  }
  const label = statusLabel(locale, kind)
  if (typeof dot.setAttribute === 'function') {
    dot.setAttribute('title', label)
    dot.setAttribute('aria-label', label)
    dot.setAttribute('role', 'img')
  }
  styleDot(dot, kind)
  const host = hostStatusDot(row)
  if (host !== null && host !== dot) data.styles.write(host, 'display', 'none')
}

/**
 * Mark the host row element with its zone (spec §2). An attribute — never an
 * inline background — so the host's own hover still paints over the band;
 * the selected override in the style tag keys on it too. Every marked row is
 * remembered for an exact dispose.
 */
function markZone(row, zone, data) {
  if (row === undefined || row === null || typeof row.setAttribute !== 'function') return
  if (zone !== 'active') {
    if (typeof row.removeAttribute === 'function') row.removeAttribute(ZONE_ATTR)
    return
  }
  row.setAttribute(ZONE_ATTR, 'active')
  data.zoneMarked.add(row)
}

/** This feature's Active band among a section's children, or null. */
function findZoneBand(section) {
  for (const child of section.children) {
    if (child.dataset !== undefined && child.dataset !== null && child.dataset.dshUxPlus === BAND_VALUE) return child
  }
  return null
}

/**
 * The band sits at z-index:-1, which only paints above the panel background
 * when the section is a stacking context — otherwise it sinks behind the
 * whole sidebar and vanishes. `isolation:isolate` creates that context
 * without the position:relative trap (a positioned section turns FLIP-
 * transformed rows into their own offset parent, which poisons offsetTop
 * measurement); position:relative is claimed only as a fallback for rows
 * without measurable rects.
 */
function claimBandContext(section, data) {
  data.styles.write(section, 'isolation', 'isolate')
  if (!hasRects(section)) data.styles.write(section, 'position', 'relative')
  else data.styles.restore(section, 'position')
}

/** Undo claimBandContext on one section. */
function releaseBandContext(section, data) {
  data.styles.restore(section, 'isolation')
  data.styles.restore(section, 'position')
}

/** Whether this section's rows expose usable client rects. */
function hasRects(section) {
  for (const row of rowChildren(section)) {
    if (typeof row.getBoundingClientRect === 'function') {
      const rect = row.getBoundingClientRect()
      if (rect !== undefined && rect !== null && typeof rect.top === 'number') return true
    }
  }
  return false
}

/**
 * One continuous band behind the WHOLE Active block (user rule: the block
 * shares one background, not one background per row) — a single absolutely
 * positioned element spanning the block's flex items, its corners from the
 * style tag. The rows keep transparent backgrounds, so the host's hover and
 * the selected green paint ON TOP of the band. Geometry is re-measured on
 * every pass from client rects (viewport coordinates, immune to transforms
 * and offsetParent games): top = first row's top, bottom = last row's bottom.
 */
function ensureZoneBand(section, ordered, data) {
  const active = []
  for (const entry of ordered) {
    if (entry.zone === 'active' && !data.archived.has(entry.session.id)) active.push(entry.element)
  }
  let band = findZoneBand(section)
  if (active.length === 0) {
    if (band !== null) {
      releaseBandContext(section, data)
      detach(band, data.bands)
    }
    return
  }
  if (band === null) {
    band = document.createElement('div')
    band.dataset.dshUxPlus = BAND_VALUE
    data.bands.add(band)
  }
  if (band.parentNode !== section) section.appendChild(band)
  claimBandContext(section, data)
  const first = active[0]
  const last = active[active.length - 1]
  const firstRect = typeof first.getBoundingClientRect === 'function' ? first.getBoundingClientRect() : null
  const lastRect = typeof last.getBoundingClientRect === 'function' ? last.getBoundingClientRect() : null
  if (firstRect !== null && lastRect !== null
    && typeof firstRect.top === 'number' && typeof lastRect.bottom === 'number') {
    const sectionRect = typeof section.getBoundingClientRect === 'function'
      ? section.getBoundingClientRect() : null
    const origin = sectionRect !== null && typeof sectionRect.top === 'number' ? sectionRect.top : 0
    data.styles.write(band, 'top', `${Math.round(firstRect.top - origin)}px`)
    data.styles.write(band, 'height', `${Math.max(0, Math.round(lastRect.bottom - firstRect.top))}px`)
  } else {
    const top = typeof first.offsetTop === 'number' ? first.offsetTop : 0
    const lastTop = typeof last.offsetTop === 'number' ? last.offsetTop : 0
    const lastHeight = typeof last.offsetHeight === 'number' ? last.offsetHeight : 0
    data.styles.write(band, 'top', `${top}px`)
    data.styles.write(band, 'height', `${Math.max(0, lastTop + lastHeight - top)}px`)
  }
}

/** This feature's injected dormant bar among a section's children, or null. */
function findFoldRow(section) {
  for (const child of section.children) {
    if (child.dataset !== undefined && child.dataset !== null && child.dataset.dshUxPlus === FOLD_VALUE) return child
  }
  return null
}

/** Detach one element this feature injected, whichever DOM it lives in. */
function detach(element, set) {
  if (element === undefined || element === null) return
  if (set !== undefined && set !== null) set.delete(element)
  if (typeof element.remove === 'function') {
    element.remove()
    return
  }
  if (element.parentNode !== null && element.parentNode !== undefined) element.parentNode.removeChild(element)
}

/** One 1px hairline of the dormant bar (spec §4), flex-sized on either side. */
function barLine() {
  const line = document.createElement('span')
  line.dataset.dshUxPlus = `${FOLD_VALUE}-line`
  line.style.flex = '1 1 auto'
  line.style.height = '1px'
  line.style.background = 'currentColor'
  line.style.opacity = '0.35'
  return line
}

/**
 * Insert (or refresh) the section's dormant bar (spec §4) — the section's last
 * flex item, ranked in the slot between the Active block and the dormant block
 * it hides (the host's overflow button keeps its 999). The bar is this
 * feature's ONLY text: a centered count between two hairlines. Its click
 * reveals the dormant block for the rest of the page load only (a page-load Set
 * in client(): folding is a presentation decision, never persisted state) and,
 * while the host's own control is collapsed, proxies the host's expand click —
 * one bar drives both truncation systems instead of two stacked rows.
 */
function ensureFoldBar(section, data, key, text, expanded, order) {
  let bar = findFoldRow(section)
  if (bar === null) {
    bar = document.createElement('div')
    bar.dataset.dshUxPlus = FOLD_VALUE
    const button = document.createElement('button')
    if (typeof button.setAttribute === 'function') button.setAttribute('type', 'button')
    button.style.display = 'flex'
    button.style.alignItems = 'center'
    button.style.gap = '6px'
    button.style.background = 'none'
    button.style.border = 'none'
    button.style.color = 'var(--dsw-alias-label-tertiary, #8a8f98)'
    button.style.fontSize = '11px'
    button.style.fontFamily = 'inherit'
    button.style.cursor = 'pointer'
    button.style.padding = '2px 8px'
    button.style.width = '100%'
    const label = document.createElement('span')
    label.dataset.dshUxPlus = `${FOLD_VALUE}-label`
    label.style.whiteSpace = 'nowrap'
    button.appendChild(barLine())
    button.appendChild(label)
    button.appendChild(barLine())
    if (typeof button.addEventListener === 'function') {
      button.addEventListener('click', (event) => {
        if (event !== undefined && event !== null && typeof event.stopPropagation === 'function') event.stopPropagation()
        // The click itself is the user's action: mark it before either branch so
        // the pass that answers it runs even though the pointer is inside the
        // tree (onUserAction, spec §7).
        if (typeof data.onUserAction === 'function') data.onUserAction()
        // One bar drives both truncation systems (issue 4): while the host
        // truncates, the bar only proxies the host's own expand/collapse —
        // the host's aria-expanded state is then the single reveal truth.
        // Without a host control the bar toggles this section's block itself.
        const host = bar.parentNode === null || bar.parentNode === undefined
          ? null
          : overflowButton(bar.parentNode)
        if (host !== null) {
          if (typeof host.click === 'function') host.click()
        } else {
          data.onToggleReveal(key)
        }
      })
    }
    bar.appendChild(button)
    data.foldRows.add(bar)
  }
  bar.dataset.dshUxPlusKey = key
  if (bar.parentNode !== section) section.appendChild(bar)
  data.styles.write(bar, 'order', order)
  const button = bar.children[0]
  if (button !== undefined && button !== null) {
    const label = button.children[1]
    if (label !== undefined && label !== null) label.textContent = text
    if (typeof button.setAttribute === 'function') {
      button.setAttribute('aria-expanded', expanded === true ? 'true' : 'false')
      button.setAttribute('title', text)
    }
  }
  return bar
}

/** Take the fold row back out of the section (nothing left to fold). */
function removeFoldRow(section, data) {
  const row = findFoldRow(section)
  if (row === null) return
  data.styles.restore(row, 'order')
  detach(row, data.foldRows)
}

/**
 * The count the host's own overflow button reports as hidden, parsed from its
 * label ("展开其余 1 个会话" / "Expand 1 more session"). 0 while the button
 * is absent or already expanded (its label then reads "收起" with no number).
 */
function hostHiddenCount(button) {
  if (button === null) return 0
  if (button.getAttribute('aria-expanded') === 'true') return 0
  const match = String(button.textContent === undefined ? '' : button.textContent).match(/\d+/)
  return match === null ? 0 : Number(match[0])
}

/**
 * Collapse the section's dormant block behind the thin bar (spec §4).
 *
 * Every dormant row is hidden by default — the whole zone, not a surplus above
 * a visible quota — while staying in the DOM: only `display` is written, so the
 * replay count and the row↔session pairing keep matching. Archived rows keep
 * today's treatment (they never fold), and neither does a leading row: the
 * current blank and the user's pins are Active for that reason alone.
 *
 * Reveal truth (issue 4): while the host truncates, the reveal FOLLOWS the
 * host's own aria-expanded — one control, one state, so the host's 收起 folds
 * everything back together and no revealed row is ever stranded. Without a
 * host control the bar toggles this section's revealed Set (page load only:
 * folding is a presentation decision, never persisted state) and stays on
 * screen as the collapse control.
 *
 * While the bar shows, the host's collapsed overflow button is hidden and
 * absorbed into it: its hidden count joins the bar's label and the bar's click
 * proxies the host's expand, so the section carries exactly one truncation row.
 * An expanded host button ("收起") stays visible — it is a collapse control,
 * not a competing truncation row.
 */
function applyFold(section, account, ordered, data) {
  const dormant = []
  for (const entry of ordered) {
    if (entry.zone !== 'dormant') continue
    if (data.archived.has(entry.session.id)) continue
    dormant.push(entry)
  }
  const host = overflowButton(section)
  const revealed = host !== null
    ? host.getAttribute('aria-expanded') === 'true'
    : data.revealed.has(account.key)
  const hidden = revealed ? [] : dormant
  const hiddenElements = new Set()
  for (const entry of hidden) hiddenElements.add(entry.element)
  for (const entry of ordered) {
    if (hiddenElements.has(entry.element)) data.styles.write(entry.element, 'display', 'none')
    else data.styles.restore(entry.element, 'display')
  }
  const hostHidden = hostHiddenCount(host)
  // The bar takes the rank slot between the two blocks (orderRows numbers the
  // dormant rows one rank higher for exactly that gap).
  const activeCount = ordered.reduce((total, entry) => (entry.zone === 'active' ? total + 1 : total), 0)
  const barRank = String(10 + activeCount)
  if (hidden.length === 0 && hostHidden === 0) {
    if (revealed && host === null) {
      // Nothing left to hide, but the user can still fold the block back.
      ensureFoldBar(section, data, account.key, foldBarCollapseText(data.locale), true, barRank)
      return
    }
    removeFoldRow(section, data)
    if (host !== null) data.styles.restore(host, 'display')
    return
  }
  if (host !== null && host.getAttribute('aria-expanded') === 'false') data.styles.write(host, 'display', 'none')
  else if (host !== null) data.styles.restore(host, 'display')
  ensureFoldBar(section, data, account.key, foldBarText(data.locale, hidden.length + hostHidden), revealed, barRank)
}

/**
 * Did a consistent pass leave this section a presentation worth keeping?
 * Either the zone band or a written rank is enough: a section the layer never
 * reached has nothing to preserve, and must go straight to the step-aside path.
 * @returns {boolean}
 */
function hasPresentation(section) {
  if (findZoneBand(section) !== null) return true
  for (const row of rowChildren(section)) {
    const order = row.style === undefined ? undefined : row.style.order
    if (order !== undefined && order !== '') return true
  }
  return false
}

/**
 * Fallback absorption (issue 3): when the row layer bails on count or pairing
 * drift, the section must STILL carry exactly one truncation row. The host
 * button's own label is host truth and needs no row pairing, so the bar still
 * absorbs it; anything this feature hid on an earlier successful pass is put
 * back, and the band (which would strand at stale geometry) is taken out.
 *
 * A bail is 'unknown', not 'wrong' (the reported '怎么突然不生效了 / 绿色的效果
 * 没了'): these passes are scheduled by the HOST's own mutations, so one can
 * legitimately run in the instant between the host committing new rows and the
 * store publishing them — our exempt model and its slice then disagree by a row
 * or two. Stepping aside at that instant is what the user reads as the green
 * disappearing, so the section keeps its last consistent presentation (band,
 * fold and ranks together, so nothing lies) for a few passes; only a divergence
 * that persists — a shape this feature genuinely cannot model — falls through to
 * the step-aside below.
 */
function absorbHostTruncation(section, account, data) {
  if (data.statusMap === null) return
  const drift = data.driftPasses.get(account.key) || 0
  if (drift < DRIFT_GRACE_PASSES && hasPresentation(section)) {
    data.driftPasses.set(account.key, drift + 1)
    return
  }
  for (const row of rowChildren(section)) data.styles.restore(row, 'display')
  const band = findZoneBand(section)
  if (band !== null) {
    releaseBandContext(section, data)
    detach(band, data.bands)
  }
  const host = overflowButton(section)
  const hostHidden = hostHiddenCount(host)
  if (hostHidden === 0) {
    if (host !== null) data.styles.restore(host, 'display')
    removeFoldRow(section, data)
    return
  }
  data.styles.write(host, 'display', 'none')
  ensureFoldBar(section, data, account.key, foldBarText(data.locale, hostHidden), false, FOLD_ROW_ORDER)
}

/** This feature's attention badge among a row's children, or null. */
function findBadge(row) {
  for (const child of row.children) {
    if (child.dataset !== undefined && child.dataset !== null && child.dataset.dshUxPlus === BADGE_VALUE) return child
  }
  return null
}

/**
 * The attention the section's header must speak for (spec §5), or null when no
 * badge belongs on this section's header.
 *
 * Two rules, both load-bearing. Only the ACTIVE block is ever counted — a
 * status sitting in the dormant block never floats up to the header, so a
 * workspace whose only pending session is a week old no longer claims
 * attention it has already outlived. And only what is NOT visible is counted:
 * a collapsed workspace renders no rows at all (every Active-zone attention
 * member is hidden); an expanded workspace whose host overflow button is
 * present renders only its quota (the Active-zone attention members outside
 * the replayed slice are hidden); an expanded workspace with no overflow
 * button shows everything, so attention needs no badge.
 *
 * Counts come from the data layer × the status map, never from counting DOM
 * rows — the host does not render collapsed rows beyond its quota, so a DOM
 * count would undercount exactly when the badge matters.
 */
function hiddenAttention(section, account, data, view) {
  const attention = activeZoneAttention(account.memberIds, data)
  const total = attention.waiting.length + attention.unread.length + attention.running.length
  if (total === 0) return null
  if (sectionExpanded(section) === false) {
    // A collapsed workspace renders no rows at all: every Active-zone
    // attention member is hidden, and the badge carries what the DOM cannot.
    return {
      pending: attention.waiting.length,
      unread: attention.unread.length,
      running: attention.running.length,
    }
  }
  if (overflowButton(section) === null) return null
  const rows = rowChildren(section)
  const expected = renderedOrder(account.memberIds, account.key, data, view)
  const shown = collapsedShown(expected, data, rows.length)
  // An untrustworthy replay is no basis for a count: draw nothing.
  if (shown === null || rows.length !== shown.length) return null
  const visible = new Set(shown)
  return {
    pending: attention.waiting.filter((id) => !visible.has(id)).length,
    unread: attention.unread.filter((id) => !visible.has(id)).length,
    running: attention.running.filter((id) => !visible.has(id)).length,
  }
}

/**
 * Draw or clear the workspace header's attention badge (spec §5): up to three
 * 7px dots side by side, in reading order (waiting, unread, running), with the
 * count text as the container's tooltip and accessible name. It is inserted
 * before the row's actions span, exactly like the age label, but it is NOT
 * faded on hover: this is attention, the one thing the row exists to carry. The
 * element is reused across passes — dots are repainted, never rebuilt — and
 * removed when the counts drop back to zero.
 */
function applyAttentionBadge(section, account, data, view) {
  const header = sectionHeaderRow(section, 0)
  if (header === null || typeof header.getAttribute !== 'function') return
  const hidden = hiddenAttention(section, account, data, view)
  if (hidden === null) {
    const stale = findBadge(header)
    if (stale !== null) detach(stale, data.badges)
    return
  }
  let badge = findBadge(header)
  if (badge === null) {
    badge = document.createElement('span')
    badge.dataset.dshUxPlus = BADGE_VALUE
    badge.style.flex = 'none'
    badge.style.display = 'inline-flex'
    badge.style.alignItems = 'center'
    badge.style.gap = '3px'
    badge.style.lineHeight = '16px'
    const actions = findRowActions(header)
    if (actions !== null && typeof header.insertBefore === 'function') header.insertBefore(badge, actions)
    else header.appendChild(badge)
    data.badges.add(badge)
  }
  const kinds = badgeKinds(hidden)
  const tooltip = badgeTooltip(data.locale, hidden)
  if (typeof badge.setAttribute === 'function') {
    badge.setAttribute('title', tooltip)
    badge.setAttribute('aria-label', tooltip)
    badge.setAttribute('role', 'img')
  }
  while (badge.children.length > kinds.length) {
    detach(badge.children[badge.children.length - 1])
  }
  for (let i = 0; i < kinds.length; i += 1) {
    let dot = badge.children[i]
    if (dot === undefined || dot === null) {
      dot = document.createElement('span')
      dot.dataset.dshUxPlus = `${BADGE_VALUE}-dot`
      dot.style.width = DOT_SIZE
      dot.style.height = DOT_SIZE
      dot.style.borderRadius = '50%'
      dot.style.boxSizing = 'border-box'
      dot.style.flex = 'none'
      if (typeof dot.setAttribute === 'function') dot.setAttribute('aria-hidden', 'true')
      badge.appendChild(dot)
    }
    styleDot(dot, kinds[i])
  }
}

/**
 * FLIP (spec §8): the "First" snapshot, taken before any order is written.
 * Null when the environment cannot animate (no rAF / no layout API — the test
 * fixtures), in which case the whole animation path is skipped.
 */
function snapshotTops(tree) {
  if (typeof window === 'undefined' || window === null) return null
  if (typeof window.requestAnimationFrame !== 'function') return null
  if (typeof window.matchMedia === 'function') {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null
    } catch { /* an exotic matchMedia cannot stop the feature, only animate it */ }
  }
  if (tree === undefined || tree === null || typeof tree.querySelectorAll !== 'function') return null
  let rows = null
  try {
    rows = tree.querySelectorAll('[data-row-key^="session:"]')
  } catch {
    return null
  }
  if (rows === null || rows === undefined) return null
  const tops = new Map()
  for (const row of rows) {
    if (typeof row.getBoundingClientRect !== 'function') continue
    try {
      tops.set(row, row.getBoundingClientRect().top)
    } catch { /* a detached or exotic row simply gets no animation */ }
  }
  return tops
}

/** One in-flight animation cleared back to its resting state. */
function clearFlip(element) {
  if (element === undefined || element === null) return
  element.style.transform = ''
  element.style.transition = ''
}

/**
 * FLIP (spec §8): after the orders are written, every row that moved more than
 * 4px is translated back to where it was, then released over FLIP_MS. Elements
 * are handed to `flips` so the caller can clear a lingering transform on
 * dispose (a disposed feature must not leave a translate behind).
 *
 * The release frame owns nothing (the browser, measured): `setTimeout(0)` is
 * immediate while the next frame is up to ~16ms away, so a timer-driven pass
 * routinely runs BETWEEN the start of an animation and its release frame — that
 * pass measures, finds nothing left to move, and takes the element out of
 * `flips` after snapping it to its resting place. A release frame that then
 * wrote its `transition` anyway would leave an inline property no pass and no
 * dispose could ever clear (the element is no longer in the set either walks).
 * Membership IS the ownership token: dropped, and the frame leaves it alone.
 */
function animateFlip(tops, flips) {
  for (const [element, top] of tops) {
    if (typeof element.getBoundingClientRect !== 'function') continue
    let moved = 0
    try {
      moved = top - element.getBoundingClientRect().top
    } catch {
      continue
    }
    if (Math.abs(moved) <= 4) continue
    element.style.transition = 'none'
    element.style.transform = `translateY(${moved}px)`
    flips.add(element)
    window.requestAnimationFrame(() => {
      if (!flips.has(element)) return
      element.style.transition = `transform ${FLIP_MS}ms ease`
      element.style.transform = ''
    })
  }
}

/**
 * Style writes with original caching (plan W-6): the first write of a
 * property caches the element's current value; clear() puts every cached
 * original back and forgets all records.
 */
function makeStyleCache() {
  const records = new Map()
  function write(element, property, value) {
    let cached = records.get(element)
    if (cached === undefined) {
      cached = {}
      records.set(element, cached)
    }
    if (!Object.prototype.hasOwnProperty.call(cached, property)) cached[property] = element.style[property]
    element.style[property] = value
  }
  /**
   * Put one cached property back and forget that record, so the next write
   * caches the restored original again. The liveness layer flips the same
   * element between full, compact and micro on every pass: a bare write of the
   * full-size value would cache the compact one as "the original" and leak it
   * past dispose. A property this feature never wrote is a no-op.
   *
   * A missing original (undefined) means the element carried no inline value
   * at all before the write — true for any DOM that reports unset properties
   * as absent rather than as '' (the plain-object test fixtures). Assigning
   * `undefined` back would leave the value we wrote in place, so the property
   * is removed instead: that is the only honest restore.
   */
  function restore(element, property) {
    const cached = records.get(element)
    if (cached === undefined) return
    if (!Object.prototype.hasOwnProperty.call(cached, property)) return
    const original = cached[property]
    delete cached[property]
    if (original === undefined) {
      delete element.style[property]
      return
    }
    element.style[property] = original
  }
  function clear() {
    for (const [element, cached] of records) {
      for (const property of Object.keys(cached)) {
        const original = cached[property]
        if (original === undefined) delete element.style[property]
        else element.style[property] = original
      }
    }
    records.clear()
  }
  return { write, restore, clear }
}

/**
 * The ungrouped bucket's activity: latest session owned by no workspace. Same
 * archive-invariance rule as latestSessionUpdate — a stray conversation being
 * archived must not move the bucket either.
 */
function bucketActivity(data) {
  const owned = new Set()
  for (const workspace of data.items) {
    for (const sessionId of workspace.sessionIds) owned.add(sessionId)
  }
  let latest = Number.NEGATIVE_INFINITY
  for (const session of Object.values(data.byId)) {
    if (session.origin === 'subagent' || session.blank) continue
    if (owned.has(session.id)) continue
    if (session.updatedAt > latest) latest = session.updatedAt
  }
  return latest
}

/** A workspace's nested children in host order (workspace-tree mode). */
function childrenOf(workspace, data) {
  const parents = data.items.map((item) => item.path)
  const out = []
  for (const item of data.items) {
    if (owningParentFolder(item.path, parents) === workspace.path) out.push(item)
  }
  return out
}

/**
 * W-2 row layer: the section's own session rows in recency order (same ruler
 * as the host's orderByRecency: updatedAt desc, id asc on ties).
 *
 * Rows are paired after replaying the host's actual row projection (the
 * derived order, not the model's member order — `renderedOrder`) and the host
 * collapse rule; a count mismatch or a failed pairing-trust check makes this
 * section's row layer a no-op (the group layer is unaffected). A bail-out is
 * logged once per distinct reason (`traceSkip`) — silently doing nothing is
 * what let a drifted host replay pass unnoticed in production.
 *
 * The collapse replay is part of that contract: the rendered slice exempts
 * blank, running and running-subagent rows from the idle quota (rowExempt)
 * and uses the group's live quota derived from the DOM (collapsedShown). A
 * blank-only fixed-5 port matched only idle sections; on a section with a
 * running session it replayed one row short, tripped the count gate and left
 * the whole row layer off — the running conversation stayed below a stale
 * one, which is precisely what this feature exists to prevent.
 *
 * Two row classes keep the host's rendered positions instead of being
 * re-ranked: the current blank row (host pinCurrentBlank invariant,
 * tree.ts:214-220) and non-archived pinned rows (host sectionMembers fronts
 * them, tree.ts:273-287). Re-ranking a pin would fight an explicit user
 * action; everything else is ranked by recency, in both sort modes — that is
 * what this feature promises, and it is why a sidebar left in 手动排序 no
 * longer freezes stale positions.
 */
/**
 * The recency tie-break every layer already used: freshest first, id ascending
 * when two sessions share a timestamp (a total order, so the result does not
 * depend on the engine's sort implementation).
 */
function compareRecency(a, b) {
  if (a.session.updatedAt !== b.session.updatedAt) return b.session.updatedAt - a.session.updatedAt
  const left = a.session.id
  const right = b.session.id
  if (left === right) return 0
  return left < right ? -1 : 1
}

function orderRows(section, account, data, view) {
  const expected = renderedOrder(account.memberIds, account.key, data, view)
  const rows = rowChildren(section)
  const shown = sectionCollapsed(section) ? collapsedShown(expected, data, rows.length) : expected
  // A folded group renders no rows at all: there is nothing to order, and a
  // count trace here would be noise (the group layer still runs).
  if (shown === null) return
  if (rows.length !== shown.length) {
    traceSkip(account.key, 'count', `dom ${rows.length} vs replay ${shown.length}`)
    absorbHostTruncation(section, account, data)
    return
  }
  const unpaired = firstUnpairedRow(rows, shown, data.byId)
  if (unpaired !== -1) {
    traceSkip(account.key, 'pairing', `row ${unpaired} of ${shown.length}`)
    absorbHostTruncation(section, account, data)
    return
  }
  const entries = shown.map((id, index) => {
    const session = data.byId[id]
    return { session, element: rows[index], zone: 'active' }
  })
  const leading = []
  const ranked = []
  entries.forEach((entry, index) => {
    const blankFront = index === 0 && entry.session.blank === true
    const pinnedFront = !blankFront && !data.archived.has(entry.session.id)
      && data.pinned.has(entry.session.id)
    if (blankFront || pinnedFront) {
      entry.leading = true
      leading.push(entry)
    } else {
      ranked.push(entry)
    }
  })
  // Zones (spec §1/§2): without a status map there is no zone layer at all and
  // the ranking stays exactly the recency ranking this feature always applied.
  // With one, the Active block leads — a session that is running, or whose last
  // activity is inside 24 hours — and lastActivity desc orders INSIDE each
  // block, so the green band is one contiguous run and the dormant block stays
  // a block (a stale-but-running row never lands between two dormant ones).
  if (data.statusMap !== null) {
    for (const entry of ranked) entry.zone = zoneEntryOf(entry, data)
  }
  ranked.sort(data.statusMap === null
    ? compareRecency
    : (a, b) => (a.zone === b.zone ? 0 : a.zone === 'active' ? -1 : 1) || compareRecency(a, b))
  const ordered = leading.concat(ranked)
  // Ranks leave one slot for the dormant bar between the two blocks (spec §4):
  // the bar sits at exactly that rank, so the dormant block renders below it.
  const activeCount = ordered.reduce((total, entry) => (entry.zone === 'active' ? total + 1 : total), 0)
  const barRank = data.statusMap === null ? -1 : activeCount
  ordered.forEach((entry, index) => {
    const rank = barRank >= 0 && index >= barRank ? index + 1 : index
    data.styles.write(entry.element, 'order', String(10 + rank))
    data.styles.write(entry.element, 'flexShrink', '0')
    const row = rowElementOf(entry)
    const archived = data.archived.has(entry.session.id)
    // Archived rows keep today's treatment exactly (host row, no band, no dot).
    markZone(row, archived || data.statusMap === null ? 'none' : entry.zone, data)
    if (data.statusMap === null) return
    // Zone density (spec §2/§4): the compact box, and the fade that marks the
    // dormant block, live on the row element; the flex item above it keeps the
    // host's box. Archived rows are handed back to the host instead.
    const density = densitySpec(entry, data)
    applyDensity(data.styles, row, density)
    if (density === null) relaxRow(data.styles, row)
    else compactRow(data.styles, row)
    ensureStatusDot(row,
      archived ? 'none' : statusOf(data.statusMap.get(entry.session.id)), data.locale, data)
  })
  // The overflow button stays last no matter what.
  const button = overflowButton(section)
  if (button !== null) data.styles.write(button, 'order', '999')
  if (data.statusMap !== null) {
    applyFold(section, account, ordered, data)
    ensureZoneBand(section, ordered, data)
    // This pass explained the section, so any drift grace it was spending is
    // over: the next unexplained pass starts the count from scratch.
    data.driftPasses.delete(account.key)
  }
}

/** Collapse whitespace runs and trim (header-text comparison). */
function normalizeText(value) {
  return (typeof value === 'string' ? value : '').replace(/\s+/g, ' ').trim()
}

/** The final segment of a host path (backslashes normalized by folderPath). */
function pathBasename(path) {
  return typeof path === 'string' ? folderPath(path).split('/').pop() : ''
}

/**
 * The section's group header row: the first role="treeitem" carrying
 * aria-expanded in the section's subtree (host DOM contract — possibly one
 * span wrapper deep), or null. Mirrors hasHeaderRow's walk.
 */
function sectionHeaderRow(section, depth) {
  if (depth > WALK_DEPTH) return null
  if (isHeaderRow(section)) return section
  for (const child of section.children) {
    const found = sectionHeaderRow(child, depth + 1)
    if (found !== null) return found
  }
  return null
}

/**
 * Group-layer pairing trust (Q8): a same-count workspace reorder leaves the
 * store snapshot in the new order while the DOM still renders the old
 * section order for one frame, and positional pairing would then pair each
 * section with the wrong workspace. A section's header text is the
 * workspace's title (or its path basename), so the pairing is confirmed only
 * when the header starts with one of those; an empty header text is no
 * signal, not a failure, and a workspace with neither carries no candidate.
 */
function sectionPairingTrusted(section, workspace) {
  const row = sectionHeaderRow(section, 0)
  const text = row === null ? '' : normalizeText(row.textContent)
  if (text === '') return true
  const candidates = [normalizeText(workspace.title), normalizeText(pathBasename(workspace.path))]
    .filter((candidate) => candidate !== '')
  if (candidates.length === 0) return true
  return candidates.some((candidate) => text.startsWith(candidate))
}

/**
 * Order one level: the container's section children (DOM order) are matched
 * to the workspaces at that level (host order; the trailing ungrouped bucket
 * section is the only tolerated extra, top level only), receive their
 * visual rank, their row ordering, and then their nested level. A count
 * mismatch, or a header that cannot confirm its paired workspace, makes the
 * whole level a no-op — presentation never guesses.
 */
function orderLevel(container, workspaces, topLevel, data, view) {
  const sections = []
  for (const child of container.children) {
    if (isSection(child)) sections.push(child)
  }
  const pairs = []
  if (sections.length === workspaces.length) {
    for (let i = 0; i < sections.length; i += 1) {
      pairs.push({ section: sections[i], workspace: workspaces[i] })
    }
  } else if (topLevel && sections.length === workspaces.length + 1) {
    for (let i = 0; i < workspaces.length; i += 1) {
      pairs.push({ section: sections[i], workspace: workspaces[i] })
    }
    pairs.push({ section: sections[sections.length - 1], workspace: null }) // ungrouped bucket
  } else {
    return
  }
  // Q8 gate: a same-count workspace reorder can leave the store snapshot in
  // the new order while the DOM still renders the old one for one frame, so
  // positional pairing may pair a section with the wrong workspace — every
  // non-bucket pair's header text must confirm its paired workspace
  // (starts with the title or the path basename) or the whole level no-ops
  // without writing a single order (the next pass repaints once the DOM
  // has caught up; an empty header is no signal, never a failure).
  for (const pair of pairs) {
    if (pair.workspace !== null && !sectionPairingTrusted(pair.section, pair.workspace)) return
  }
  // W-1 group layer: freshest activity first, no-activity last, ties keep
  // the host's existing order (stable sort on the original index).
  const ranked = pairs.map((pair, index) => {
    const base = pair.workspace === null
      ? bucketActivity(data)
      : latestSessionUpdate(pair.workspace, data.byId)
    // Liveness boost (spec §6): a group holding a session that needs the user
    // right now (running, or blocked on a reply) is "active now" no matter
    // when it last changed. Only with a status map — and unread completions do
    // NOT lift a group: those are attention, not activity, and the fold above
    // tells them apart. The boost is a floor of `now`, never a new maximum, so
    // a group cannot claim to be fresher than a session updated in the future.
    let activity = base
    if (data.statusMap !== null) {
      const members = pair.workspace === null ? ungroupedMembers(data) : pair.workspace.sessionIds
      if (hasBlockingAttention(members, data) && data.now > base) activity = data.now
    }
    return { section: pair.section, workspace: pair.workspace, index, activity }
  })
  ranked.sort((a, b) => {
    if (a.activity === b.activity) return a.index - b.index
    if (a.activity === Number.NEGATIVE_INFINITY) return 1
    if (b.activity === Number.NEGATIVE_INFINITY) return -1
    return b.activity - a.activity
  })
  ranked.forEach((entry, rank) => {
    const { section, workspace } = entry
    data.styles.write(section, 'display', 'flex')
    data.styles.write(section, 'flexDirection', 'column')
    data.styles.write(section, 'flexShrink', '0')
    data.styles.write(section, 'order', String(rank))
    data.styles.write(section, 'marginTop', rank === 0 ? '0px' : '4px')
    // W-2 row layer for every section: workspaces by their own account, the
    // ungrouped bucket by the host's ungrouped account.
    const account = workspace === null
      ? { memberIds: ungroupedMembers(data), key: UNGROUPED_KEY }
      : { memberIds: workspace.sessionIds, key: workspace.workspaceId }
    orderRows(section, account, data, view)
    // Attention badge (spec §5): always run it, so a badge whose attention was
    // consumed (replied, read, opened) or fell into the dormant block is
    // removed on the very next pass. Without a status map
    // activeZoneAttention() is empty and this only clears.
    applyAttentionBadge(section, account, data, view)
    // Nested level: the group container's sections, same rules, no bucket.
    const containerDiv = groupContainer(section)
    if (containerDiv !== null) {
      data.styles.write(containerDiv, 'display', 'flex')
      data.styles.write(containerDiv, 'flexDirection', 'column')
      data.styles.write(containerDiv, 'flexShrink', '0')
      orderLevel(containerDiv, childrenOf(workspace, data), false, data, view)
    }
  })
}

/**
 * Install the feature's client-side behavior.
 * @param {object} ctx - the client plugin context (unused; contract shape).
 * @param {object} deps - { sessions, workspaces } (see module header).
 * @returns {() => void} disposer: clears the pending timer, disconnects the
 *   observer, unsubscribes both lists, and restores all cached original
 *   styles (off == never installed).
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

  const styles = makeStyleCache()
  let timer = null
  let tickTimer = null
  let disposed = false
  /** Workspace ids already auto-collapsed during this page load. */
  const collapsedOnce = new Set()
  // ---- zone layer state (all of it inert without a status map) ------------
  /** Account keys whose dormant block the user revealed (page load only, §4). */
  const revealed = new Set()
  /** Our injected dormant bars / attention badges / status dots, for dispose. */
  const foldRows = new Set()
  const badges = new Set()
  const dots = new Set()
  /** The per-section Active band elements (one per section, §2). */
  const bands = new Set()
  /** Host rows carrying a zone attribute (removed again on dispose, §2). */
  const zoneMarked = new Set()
  /**
   * Consecutive unexplained-count passes per section key: the grace counter for
   * a section that is keeping its last consistent presentation (spec §1).
   */
  const driftPasses = new Map()
  /** Rows with an in-flight FLIP transform (cleared on dispose, §8). */
  const flips = new Set()
  /** True while the pointer is inside the grouped tree (spec §7). */
  let pointerInTree = false
  /** A pass was requested while frozen; it runs the moment the freeze lifts. */
  let dirty = false
  /**
   * The view-mode signature the previous scheduled pass saw, or null before the
   * first one. A difference is a 分组方式 / 排序方式 / 筛选会话 click, which pierces
   * the freeze (spec §7).
   */
  let lastViewSignature = null
  /** Pending bounded retry of a deferred pass, or null (spec §7). */
  let retryTimer = null
  /** How many retries of the current deferral have already been armed. */
  let retrySteps = 0
  /**
   * Timestamp until which a pass answers a user action and therefore pierces the
   * freeze (spec §7). 0 = nothing pressed.
   */
  let userActedUntil = 0

  /**
   * True once the pass that ANSWERS the user action has run. Only that first pass
   * skips the FLIP: a reveal lands on rows that were `display:none` (their rect is
   * all zeros, so animating them means flying in from the page corner), while an
   * ambient move that merely happens inside the same window still animates.
   */
  let userActedHandled = true

  const styleTag = document.createElement('style')
  styleTag.dataset.dshUxPlus = 'idle-collapse-css'
  styleTag.textContent = [
    // Age label (spec §6): always in the accessibility tree (opacity, never
    // display), revealed while the pointer is on the row, hidden again while
    // the row's menu is open — the action buttons take that space (the host's
    // own `.sessionRow:hover .time` rule, Rows.module.css:279-282).
    `[data-row-key^="${ROW_PREFIX}"] > [${LABEL_ATTR}="${LABEL_VALUE}"] { opacity: 0; transition: opacity 120ms ease; }`,
    `[data-row-key^="${ROW_PREFIX}"]:hover > [${LABEL_ATTR}="${LABEL_VALUE}"] { opacity: 1; }`,
    `[data-row-key^="${ROW_PREFIX}"].menuOpen > [${LABEL_ATTR}="${LABEL_VALUE}"] { opacity: 0; }`,
    // Active block (spec §2, user rule): ONE continuous green band behind the
    // whole block — a single positioned element (data-dsh-ux-plus="zone-band")
    // measured per pass, never a background per row. A selected row inside
    // the band takes the band's own green, stronger (the host's gray selected
    // class is (0,1,0); this attribute pair is (0,2,0) and wins).
    `[data-dsh-ux-plus="${BAND_VALUE}"] { position: absolute; left: 0; right: 0;`
      + ` background-color: ${ZONE_BACKGROUND}; border-radius: 6px; z-index: -1; pointer-events: none; }`,
    `[${ZONE_ATTR}="active"][aria-selected="true"] { background-color: ${ZONE_SELECTED}; }`,
    // Status dots (spec §3): a keyframe cannot be written inline, so the two
    // animations live here and every other property stays on the element.
    '[data-dsh-ux-kind="waiting"] { animation: dsh-ux-plus-breath 2s ease-in-out infinite; }',
    '[data-dsh-ux-kind="running"] { animation: dsh-ux-plus-spin 900ms linear infinite; }',
    '@keyframes dsh-ux-plus-breath { 0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.45); }'
      + ' 50% { box-shadow: 0 0 0 3px rgba(245, 158, 11, 0); } }',
    '@keyframes dsh-ux-plus-spin { to { transform: rotate(360deg); } }',
  ].join('\n')
  document.head.appendChild(styleTag)

  /** Active locale id for the age labels, defensively ('zh' when absent). */
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

  /**
   * The host's liveness map (the `uiSession` service), or null. Null IS the
   * degraded mode: every liveness behavior below is skipped and the feature
   * behaves exactly as it did before this layer existed. A missing service, a
   * snapshot that is not a Map-like, and a throwing getSnapshot() all degrade
   * the same way — never a broken pass.
   */
  function readStatusMap() {
    const observable = deps && deps.uiSession && deps.uiSession.sessionStatus
    if (observable === undefined || observable === null) return null
    if (typeof observable.getSnapshot !== 'function') return null
    try {
      const snapshot = observable.getSnapshot()
      if (snapshot === undefined || snapshot === null || typeof snapshot.get !== 'function') return null
      return snapshot
    } catch {
      return null
    }
  }

  /** Toggle a section's folded tail for this page load (spec §4, issue 4). */
  function onToggleReveal(accountKey) {
    if (revealed.has(accountKey)) revealed.delete(accountKey)
    else revealed.add(accountKey)
    schedule()
  }

  /**
   * Note that the user just pressed the fold bar (spec §7). A real click ALWAYS
   * arrives with the pointer already inside the tree — pointerover fires first —
   * so without this the churn freeze deferred the very pass that answers the
   * click, and the bar read as dead until the pointer happened to leave the
   * sidebar (reported live as 【N 条历史会话】打不开). The freeze protects the
   * cursor from AMBIENT churn, never from a click the user just made: passes are
   * let through for USER_ACTION_MS (no FLIP — the state the user asked for should
   * simply be there), and one bounded retry is armed so our layer converges on a
   * proxied host control even when its state change sends no store signal at all.
   * @returns {void}
   */
  function onUserAction() {
    userActedUntil = Date.now() + USER_ACTION_MS
    userActedHandled = false
    schedule()
    armRetry()
  }

  /** Snapshot the live lists; null while either list is not ready. */
  function readData() {
    const sessionSnapshot = sessions.getSnapshot()
    const workspaceSnapshot = workspaces.getSnapshot()
    if (sessionSnapshot.phase !== 'ready' || workspaceSnapshot.phase !== 'ready') return null
    const byId = sessionSnapshot.byId
    const items = workspaceSnapshot.items
    const archived = new Set(workspaceSnapshot.archivedSessionIds)
    // Registry-global pin set, same snapshot as the archive set
    // (workspace/src/index.ts:731-738; the host reads the very same triple in
    // client/navigation.ts:254). Pinned rows lead their section, so the row
    // replay needs them to pair against what the host renders.
    const pinned = new Set(workspaceSnapshot.pinnedSessionIds ?? [])
    // Mirror the host's current-session lookup (WorkspaceBrowser.tsx:804-808,
    // mainSessionId; the panelActive `current` at :220-224 only drives
    // auto-expand and highlight, never row existence).
    let currentId = undefined
    for (const session of Object.values(byId)) {
      if (session.retainedBy && session.retainedBy.mainView > 0) {
        currentId = session.id
        break
      }
    }
    return {
      byId,
      items,
      archived,
      pinned,
      currentId,
      // Subagent catalogs: the host's running-subagent exemption reads them
      // through the same list snapshot (tree.ts:390-395), so the row replay
      // can mirror it without a statuses service.
      projectionsBySession: sessionSnapshot.projectionsBySession,
      // Liveness layer (spec §1-§8). `statusMap === null` turns the whole layer
      // off, which is how the pre-liveness behavior stays testable.
      statusMap: readStatusMap(),
      now: Date.now(),
      locale: activeLocale(),
      revealed,
      foldRows,
      badges,
      dots,
      bands,
      zoneMarked,
      driftPasses,
      onToggleReveal,
      onUserAction,
      styles,
    }
  }

  /**
   * Locate the grouped tree structurally: a role="tree" whose direct
   * children include group sections. Flat and search trees have no section
   * headers, so they never qualify (no section counting anywhere).
   * @returns {{tree: Element, sections: Element[]}} | null
   */
  function findTree() {
    const trees = document.querySelectorAll('[role="tree"]')
    for (const tree of trees) {
      const sections = []
      for (const child of tree.children) {
        if (isSection(child)) sections.push(child)
      }
      if (sections.length > 0) return { tree, sections }
    }
    return null
  }

  /**
   * Is a menu open inside the tree? The host marks its open row `.menuOpen`
   * (the literal class name is not hashed — this module's own CSS rule already
   * relies on it), and a pass that moved rows out from under an open popup
   * would leave the popup anchored to a row that is no longer there.
   *
   * Checked by selector first (the host's tree is a real element: one cheap
   * query), then by a structurally WALKED search, because a test fixture's
   * selector engine is a stub. The walk is bounded in both depth and visited
   * nodes — a huge tree must never turn the freeze check into a stall.
   */
  function menuOpenWithin(node, depth, budget) {
    if (depth <= 0 || node === undefined || node === null) return false
    if (budget.spent >= 600) return false
    budget.spent += 1
    const className = typeof node.className === 'string' ? node.className : ''
    // A cheap substring test first: split() for every visited node would
    // allocate on each pass just to prove nothing matched.
    if (className.indexOf('menuOpen') !== -1 && className.split(/\s+/).indexOf('menuOpen') !== -1) {
      return true
    }
    for (const child of node.children || []) {
      if (menuOpenWithin(child, depth - 1, budget)) return true
    }
    return false
  }

  /**
   * Churn freeze (spec §7): while the pointer is inside the tree, or a menu is
   * open inside it, a pass would move rows under the user's cursor or detach an
   * open popup's anchor. Passes are DEFERRED, never dropped — the flag makes
   * the running pass a no-op and the next event (pointerout, a store
   * notification, a mutation) re-runs it once the freeze has lifted, with two
   * bounded retries covering the case where none of those events ever comes.
   */
  function frozen() {
    if (pointerInTree) return true
    const found = findTree()
    if (found === null) return false
    // A native class lookup is authoritative and cheap; when it answers, the
    // 600-node walk below would only repeat its verdict at a fraction of the
    // speed — and this runs on every coalesced pass, including every mutation
    // batch of a streaming conversation. The walk is the fixture fallback:
    // stub selector engines answer null even with a menu open.
    if (typeof found.tree.getElementsByClassName === 'function') {
      try {
        const open = found.tree.getElementsByClassName('menuOpen')
        if (open !== null && open !== undefined) return open.length > 0
      } catch { /* odd node: the next engine, then the walk, still answer */ }
    }
    if (typeof found.tree.querySelector === 'function') {
      try {
        if (found.tree.querySelector('.menuOpen') !== null) return true
      } catch { /* no selector engine on this node: the walk below still answers */ }
    }
    return menuOpenWithin(found.tree, 6, { spent: 0 })
  }

  /**
   * Pointer-in-tree tracking (spec §7): one document-level listener pair,
   * installed only when the document supports it and removed on dispose.
   * `closest` may be missing (synthetic events, odd targets) — an unreadable
   * target is simply not in the tree, which fails open and never freezes the
   * sidebar for good.
   */
  function inTree(node) {
    return typeof node === 'object' && node !== null
      && typeof node.closest === 'function' && node.closest('[role="tree"]') !== null
  }

  function onPointerOver(event) {
    if (inTree(event && event.target)) pointerInTree = true
  }

  function onPointerOut(event) {
    // Moving from a child to its parent fires pointerout on the child first:
    // the relatedTarget (where the pointer went) is the honest answer. A
    // missing relatedTarget means the pointer left the window (or an odd
    // synthetic event) — that is NOT "still inside": falling back to the
    // event target here would freeze the sidebar for good the moment the
    // mouse exits the window from a row. Fail open; the paired pointerover
    // re-arms the freeze when the pointer actually comes back.
    if (event !== null && event !== undefined
      && event.relatedTarget !== undefined && event.relatedTarget !== null
      && inTree(event.relatedTarget)) return
    if (!pointerInTree) return
    pointerInTree = false
    schedule()
  }

  /**
   * One full pass: structural find, then the two-layer reorder.
   * @param force - the host's view mode changed since the previous pass: run
   * even while the freeze holds, and skip the FLIP (every row is moving because
   * the user asked for a different view, so animating from the old positions
   * would animate the very change they clicked for).
   * @returns {void}
   */
  function reorder(force) {
    if (frozen() && force !== true) {
      dirty = true
      armRetry()
      return
    }
    dirty = false
    const data = readData()
    if (data === null) {
      styles.clear()
      return
    }
    const found = findTree()
    if (found === null) {
      styles.clear()
      return
    }
    const parents = data.items.map((item) => item.path)
    const roots = data.items.filter((item) => owningParentFolder(item.path, parents) === undefined)
    if (found.sections.length !== roots.length && found.sections.length !== roots.length + 1) {
      styles.clear()
      return
    }
    const view = viewOrdering()
    // A FLIP still in flight would poison the "First" measurement below (its
    // residual translate is part of the rect), so in-flight animations are
    // released before the snapshot — the rows snap to their resting place, and
    // the pass that follows animates from the honest one.
    for (const element of flips) clearFlip(element)
    flips.clear()
    // FLIP "First" (spec §8): the rows' tops before any order is written. Null
    // when the environment cannot animate (no rAF / no layout API / reduced
    // motion), in which case the pass is exactly what it always was; a forced
    // (view-mode) pass settles instantly instead.
    const tops = force === true ? null : snapshotTops(found.tree)
    styles.write(found.tree, 'display', 'flex')
    styles.write(found.tree, 'flexDirection', 'column')
    orderLevel(found.tree, roots, true, data, view)
    if (tops !== null) animateFlip(tops, flips)
  }

  /**
   * Idle sub-behavior pass: label every workspace row with activity and
   * collapse idle ones once. Independent of the reorder (a bail-out there
   * never suppresses labels here); shares the same debounced schedule. Unlike
   * the reorder this NEVER pierces the freeze: collapsing a workspace is a
   * `row.click()` on a header, and doing that under a resting pointer is
   * exactly the surprise the freeze exists to prevent.
   */
  function idlePass() {
    if (frozen()) {
      dirty = true
      armRetry()
      return
    }
    const data = readData()
    if (data === null) return
    const rows = document.querySelectorAll(`[data-row-key^="${ROW_PREFIX}"]`)
    const now = data.now
    const locale = data.locale
    for (const row of rows) {
      const rowKey = row.getAttribute('data-row-key')
      const workspaceId = typeof rowKey === 'string' ? rowKey.slice(ROW_PREFIX.length) : ''
      const workspace = workspaceId === UNGROUPED_KEY
        ? undefined
        : data.items.find((item) => item.workspaceId === workspaceId)
      if (workspace === undefined) { removeAgeLabel(row); continue }
      const latest = latestSessionUpdate(workspace, data.byId)
      if (latest === Number.NEGATIVE_INFINITY) { removeAgeLabel(row); continue }
      const idle = now - latest > IDLE_MS
      let label = findAgeLabel(row)
      if (label === null) {
        label = document.createElement('span')
        label.dataset.dshUxPlus = LABEL_VALUE
        label.style.flex = 'none'
        label.style.fontSize = '10px'
        label.style.lineHeight = '16px'
        label.style.color = 'var(--dsw-alias-label-tertiary, #8a8f98)'
        label.style.pointerEvents = 'none'
        label.style.whiteSpace = 'nowrap'
        const actions = findRowActions(row)
        if (actions !== null && typeof row.insertBefore === 'function') row.insertBefore(label, actions)
        else row.appendChild(label)
      }
      label.textContent = ageLabel(locale, now - latest)
      // Liveness layer (spec §6): a workspace that still holds a running or
      // blocked session is not idle, however long ago it last changed — it must
      // not be auto-collapsed out from under the user. An unread completion
      // does not hold the section open: its badge keeps it visible either way.
      if (idle && hasBlockingAttention(workspace.sessionIds, data)) continue
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
      // A 分组方式 / 排序方式 / 筛选会话 click is the user asking for a different
      // list, and a click on the fold bar is the user asking for one block to
      // open or close. The freeze protects the cursor from AMBIENT churn, never
      // from the user's own action, so those passes pierce it (and skip the
      // FLIP: the state they asked for should simply be there).
      const signature = viewSignature()
      const switched = lastViewSignature !== null && signature !== lastViewSignature
      lastViewSignature = signature
      // USER_ACTION_MS lets every pass through the freeze, so a proxied host
      // control converges on the pass its own re-render schedules; only the first
      // one is the pass that answers the click.
      const acting = Date.now() < userActedUntil
      const answering = acting && !userActedHandled
      // The freeze is a courtesy with a lifetime: once both retries are spent the
      // pass runs anyway. A resting pointer used to defer forever, so a section
      // the layer had stepped away from (or a host state it had not caught up
      // with) stayed stale until the pointerout — the reported 'green is gone'
      // while the user kept working in the sidebar.
      const frozenNow = frozen()
      const spent = retrySteps >= DEFER_RETRY_MS.length
      if (frozenNow && !switched && !acting && !spent) {
        // Deferred, not dropped: pointerout / a store notification / a mutation
        // re-schedules once the freeze has lifted — and a bounded retry covers
        // the case where the pointer simply stays put and none of them comes.
        dirty = true
        armRetry()
        return
      }
      dirty = false
      if (acting) userActedHandled = true
      // The budget is refreshed by the freeze LIFTING, never by a pass that pierced
      // it: refreshing it on every pass would re-arm the two retries after each
      // one and turn the bounded retry into a pass every ~1.5s forever while the
      // pointer rests inside the list.
      if (!frozenNow) retrySteps = 0
      // A forced pass never FLIPs: it lands on rows the host has already moved,
      // and animating them under a resting cursor is the churn the freeze exists
      // to prevent.
      reorder(switched || answering || spent)
      idlePass()
    }, 0)
  }

  /**
   * Arm the next bounded retry of a deferred pass (spec §7). The deferral used
   * to depend on an external signal that a resting pointer re-defers forever;
   * these two timers guarantee the pass eventually runs on its own.
   * @returns {void}
   */
  function armRetry() {
    if (retryTimer !== null || disposed || retrySteps >= DEFER_RETRY_MS.length) return
    retryTimer = window.setTimeout(function () {
      retryTimer = null
      schedule()
    }, DEFER_RETRY_MS[retrySteps])
    retrySteps += 1
  }

  const observer = new MutationObserver(schedule)
  if (document.body !== null) observer.observe(document.body, { childList: true, subtree: true })
  const disposeSessions = sessions.subscribe(schedule)
  const disposeWorkspaces = workspaces.subscribe(schedule)
  const locale = ctx && ctx.locale
  const disposeLocale = locale && typeof locale.subscribe === 'function' ? locale.subscribe(schedule) : null
  // Liveness is the one signal the list snapshots cannot carry (running /
  // pending / unread live in the uiSession service), so a status change
  // schedules a pass exactly like a store change does. Absent service ⇒ no
  // subscription and no liveness layer.
  const statusObservable = deps && deps.uiSession && deps.uiSession.sessionStatus
  const disposeStatus = statusObservable !== undefined && statusObservable !== null
    && typeof statusObservable.subscribe === 'function'
    ? statusObservable.subscribe(schedule)
    : null
  if (typeof document.addEventListener === 'function' && typeof document.removeEventListener === 'function') {
    document.addEventListener('pointerover', onPointerOver)
    document.addEventListener('pointerout', onPointerOut)
  }
  // Age labels must age, and zones must be re-partitioned, on an otherwise idle
  // page (no store traffic). ONE timer at the shorter of the two cadences: the
  // zone boundary moves on the scale of hours, so the 5-minute zone tick is
  // fully covered by the 60-second label tick and a second timer would only
  // duplicate the same pass.
  if (typeof window.setInterval === 'function') {
    tickTimer = window.setInterval(schedule, Math.min(AGE_TICK_MS, ZONE_TICK_MS))
  }
  schedule()

  // No ctx.effect: this feature owns its resources and hands back the exact
  // cleanup (legacy cleanup contract, retained). The package client half
  // holds the disposer; the plugin-level unmount (and each switch-off)
  // calls it.
  return function cleanup() {
    disposed = true
    if (timer !== null) window.clearTimeout(timer)
    if (retryTimer !== null && typeof window.clearTimeout === 'function') window.clearTimeout(retryTimer)
    retryTimer = null
    retrySteps = 0
    lastViewSignature = null
    if (tickTimer !== null && typeof window.clearInterval === 'function') window.clearInterval(tickTimer)
    observer.disconnect()
    disposeSessions()
    disposeWorkspaces()
    if (typeof disposeLocale === 'function') disposeLocale()
    if (typeof disposeStatus === 'function') disposeStatus()
    if (typeof document.removeEventListener === 'function') {
      document.removeEventListener('pointerover', onPointerOver)
      document.removeEventListener('pointerout', onPointerOut)
    }
    pointerInTree = false
    for (const row of document.querySelectorAll(`[data-row-key^="${ROW_PREFIX}"]`)) removeAgeLabel(row)
    // Liveness artifacts, in the reverse order they were created: any in-flight
    // FLIP transform first (a disposed feature leaves no translate behind),
    // then every row it hid, then the fold rows and badges themselves.
    for (const element of flips) clearFlip(element)
    flips.clear()
    for (const section of document.querySelectorAll(`[data-row-key^="${ROW_PREFIX}"]`)) removeFoldRow(section, { styles, foldRows })
    for (const row of foldRows) detach(row)
    foldRows.clear()
    for (const badge of badges) detach(badge)
    badges.clear()
    for (const dot of dots) detach(dot)
    dots.clear()
    // Bands last of the visual layer: each band's section gave up its
    // stacking context and (fallback) offset parenthood for the measurement
    // and gets them back.
    for (const band of bands) {
      const bandSection = band.parentNode
      if (bandSection !== null && bandSection !== undefined) {
        styles.restore(bandSection, 'isolation')
        styles.restore(bandSection, 'position')
      }
      detach(band, bands)
    }
    bands.clear()
    for (const row of zoneMarked) {
      if (typeof row.removeAttribute === 'function') row.removeAttribute(ZONE_ATTR)
    }
    zoneMarked.clear()
    driftPasses.clear()
    styleTag.remove()
    styles.clear()
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
