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
 * Liveness layer (same switch, second behavior — the design rationale: recency
 * is a weak proxy for "active", so attention state overrides time decay, and a
 * session with a status dot is never made invisible — it only changes address:
 * full row → micro row → parent badge):
 *   - tiers (`classifyTier`): pendingInteraction > running > completionUnread
 *     > recent (age < RECENT_MS, or the current session) > dormant
 *     (age > DORMANT_MS); the RECENT_MS..DORMANT_MS band is sticky through a
 *     per-client `tierMemory`, so a clock tick cannot flip a row back and
 *     forth. The status source is `deps.uiSession.sessionStatus` — the ONE
 *     authoritative source of the sidebar's three indicators (spinner /
 *     orange dot / green dot). Without it (degraded mode) the whole liveness
 *     layer stays off and this feature behaves exactly as it did before the
 *     layer existed.
 *   - row ranking: leading rows (the current blank + non-archived pins) keep
 *     the host's positions; the rest rank by tier, then updatedAt desc, then
 *     id ascending.
 *   - density: unread rows shrink to a micro row (paddingBlock 1px, fontSize
 *     11px, opacity .8 — .55 once older than STALE_UNREAD_MS), non-archived
 *     dormant rows compact (2px / 11px / .65); every other row is restored to
 *     full size. Archived rows keep today's treatment exactly (full row,
 *     recency-ranked, no badge, no pin).
 *   - fold: a section's dormant rows beyond the first FOLD_AFTER_DORMANT are
 *     display:none'd — they stay in the DOM, so the row pairing count still
 *     matches — behind ONE synthetic summary row (`order` 998, before the
 *     overflow button's 999) whose click reveals them for the rest of the
 *     page load.
 *   - attention badge: a workspace header row shows `2 待回复 · 1 未读`
 *     whenever attention is not fully visible — the section is collapsed
 *     (every non-blank, non-subagent, non-archived member with pending or
 *     unread status), or the host narrowed the section (only the attention
 *     members missing from the replayed slice). Counts always come from the
 *     data layer (workspace.sessionIds × statusMap), never from counting DOM
 *     rows: the host does not render collapsed rows beyond its quota.
 *   - group layer: a workspace with a running or pending member is lifted to
 *     "now" (it is active right now even if nothing was written for hours) and
 *     the 24h auto-collapse skips it; an unread completion never lifts a group.
 *   - anti-churn: while the pointer is inside the tree, or a row menu
 *     (`.menuOpen`) is open, all writes are deferred behind one dirty flag and
 *     re-run on pointerout / the next subscription event.
 *   - FLIP: rows that moved more than 4px are translated back to their old
 *     position for one frame, then animated over FLIP_MS (best-effort and
 *     scoped: skipped under prefers-reduced-motion, or where rAF /
 *     getBoundingClientRect is unavailable — e.g. the test fixtures).
 */

export const id = 'workspace-recency-order'
export const title = 'Workspace recency order'
export const description = 'Sessions waiting on you and still-running sessions pin to the top of their workspace; finished-but-unread sessions shrink to micro rows; older dormant sessions fold into one summary row; attention hidden by a collapsed workspace shows as a header badge. Workspaces idle for 24 hours still auto-collapse (once per workspace per page load) and every row still carries its last-active age label.'
export const hasGear = false
/** Settings-row copy, assembled into the `ux-plus-settings` namespace. */
export const settingsMessages = {
  zh: { title: '最近活动排序', description: '待回复与运行中的会话钉在工作区顶部；跑完未看的会话矮化为小行；更早的休眠会话折叠成一行；工作区收起时未见的待回复/未读数量显示为标题徽章。超过 24 小时没有更新的工作区仍会自动收起（每次打开页面每个工作区最多一次），并在行右侧显示距今未更新的时间标。' },
  en: { title: 'Workspace recency order', description: 'Sessions waiting on you and still-running sessions pin to the top of their workspace; finished-but-unread sessions shrink to micro rows; older dormant sessions fold into one summary row; attention hidden by a collapsed workspace shows as a header badge. Workspaces idle for 24 hours still auto-collapse (once per workspace per page load) and every row still carries its last-active age label.' },
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
// Liveness-layer constants (spec §1-§8). Same switch as the recency layer; all
// of them are inert in degraded mode (no status source → nothing below runs).
// ---------------------------------------------------------------------------

/** Inside this window an idle session is still "recent" (full row). */
const RECENT_MS = 2 * HOUR_MS

/** Beyond this window an idle session is "dormant" (compacted, foldable). */
const DORMANT_MS = 3 * HOUR_MS

/** Dormant rows beyond this count per section fold into one summary row. */
const FOLD_AFTER_DORMANT = 3

/** An unread completion older than a week reads as stale (extra fade). */
const STALE_UNREAD_MS = 7 * DAY_MS

/** FLIP transition duration (ms) for rows that moved. */
const FLIP_MS = 180

/** Row rank of this feature's synthetic fold row (the overflow button is 999). */
const FOLD_ROW_ORDER = '998'

/** Marker values this feature injects into the tree. */
const FOLD_VALUE = 'fold-row'
const BADGE_VALUE = 'attention-badge'

/** Tier precedence of the row ranking (lower rank = nearer the section top). */
const TIER_RANK = { pending: 0, running: 1, unread: 2, recent: 3, dormant: 4 }

/**
 * Classify one session row into its liveness tier.
 *
 * Precedence (spec §1): archived → 'dormant' (the caller then excludes it from
 * every attention/compact/fold treatment — archived rows keep today's
 * treatment); a blocking pendingInteraction → 'pending'; a still-running
 * session → 'running'; a completion the user has not seen → 'unread'; the
 * current session (you are looking at it) → 'recent'; otherwise the time band:
 * age < RECENT_MS → 'recent', age > DORMANT_MS → 'dormant', and the sticky
 * band in between keeps `prevTier` (the last band result this client stored)
 * so a clock tick cannot make a row flip between compact and full.
 *
 * Pure on purpose (test surface): `prevTier` is passed in, never read from a
 * module global, so callers own the memory.
 *
 * @param {{now: number, updatedAt: number, status?: object, isCurrent?: boolean,
 *   archived?: boolean, prevTier?: string}} input
 * @returns {'pending'|'running'|'unread'|'recent'|'dormant'}
 */
export function classifyTier(input) {
  const status = input.status
  if (input.archived === true) return 'dormant'
  if (status !== undefined && status !== null) {
    if (status.pendingInteraction !== undefined && status.pendingInteraction !== null) return 'pending'
    if (status.running === true) return 'running'
    if (status.completionUnread === true) return 'unread'
  }
  if (input.isCurrent === true) return 'recent'
  const age = input.now - input.updatedAt
  if (age < RECENT_MS) return 'recent'
  if (age > DORMANT_MS) return 'dormant'
  return input.prevTier === 'dormant' ? 'dormant' : 'recent'
}

/** A count clamped to a non-negative integer (defensive locale-helper input). */
function countOf(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

/**
 * The workspace header badge text for a set of hidden attention counts
 * (spec §5): `2 待回复 · 1 未读` / `2 waiting · 1 unread`, zero parts omitted,
 * and an empty string when there is no hidden attention at all (the caller
 * then removes the badge).
 * @param {string} locale - active locale id ('zh' prefix wins, else en).
 * @param {{pending?: number, unread?: number}} counts
 * @returns {string}
 */
export function attentionBadgeText(locale, counts) {
  const pending = countOf(counts && counts.pending)
  const unread = countOf(counts && counts.unread)
  const zh = typeof locale === 'string' && locale.toLowerCase().startsWith('zh')
  const parts = []
  if (pending > 0) parts.push(zh ? `${pending} 待回复` : `${pending} waiting`)
  if (unread > 0) parts.push(zh ? `${unread} 未读` : `${unread} unread`)
  return parts.join(' · ')
}

/** The fold summary row's text (spec §4), host-shaped age via ageLabel. */
function foldRowText(locale, hidden, ageMs) {
  const zh = typeof locale === 'string' && locale.toLowerCase().startsWith('zh')
  const age = ageLabel(locale, ageMs)
  return zh ? `${hidden} 条更早会话 · 最近一次 ${age}` : `${hidden} earlier · last ${age}`
}

/**
 * The sessions that carry hidden attention (spec §5/§6): a member of the
 * workspace with a pending interaction or an unread completion. Reads the data
 * layer only — the host does not render collapsed rows beyond its quota, so
 * counting DOM rows would undercount exactly when the badge matters. Blank
 * placeholders, subagent sessions and archived sessions are not attention
 * (archived rows keep today's treatment).
 */
function attentionMembers(memberIds, data) {
  const pending = []
  const unread = []
  if (data.statusMap === null) return { pending, unread }
  for (const sessionId of memberIds) {
    const session = data.byId[sessionId]
    if (session === undefined || session.blank === true || session.origin === 'subagent') continue
    if (data.archived.has(sessionId)) continue
    const status = data.statusMap.get(sessionId)
    if (status === undefined || status === null) continue
    if (status.pendingInteraction !== undefined && status.pendingInteraction !== null) pending.push(sessionId)
    else if (status.completionUnread === true) unread.push(sessionId)
  }
  return { pending, unread }
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

/** Full-row density: every property the density layer owns is restored. */
const FULL_DENSITY = { paddingBlock: null, fontSize: null, opacity: null }
/** Unread completion: a micro row (still visible, still carrying its dot). */
const MICRO_DENSITY = { paddingBlock: '1px', fontSize: '11px', opacity: '0.8' }
/** Unread completion older than STALE_UNREAD_MS: faded further, never hidden. */
const STALE_DENSITY = { paddingBlock: '1px', fontSize: '11px', opacity: '0.55' }
/** Dormant (non-archived): compact, before folding ever hides it. */
const COMPACT_DENSITY = { paddingBlock: '2px', fontSize: '11px', opacity: '0.65' }

/** The inline properties the density layer owns (restored when not in use). */
const DENSITY_PROPERTIES = ['paddingBlock', 'fontSize', 'opacity']

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

/** This row's tier, with the sticky-band memory this client owns (spec §1). */
function tierOf(session, data) {
  if (data.statusMap === null) return 'recent'
  const archived = data.archived.has(session.id)
  const isCurrent = session.id === data.currentId
  const tier = classifyTier({
    now: data.now,
    updatedAt: session.updatedAt,
    status: data.statusMap.get(session.id),
    isCurrent,
    archived,
    prevTier: data.tierMemory.get(session.id),
  })
  // Only the two idle bands are remembered (attention states must win again
  // the moment they come back, and a fresh update must clear a stale dormant).
  if (tier === 'recent' || tier === 'dormant') data.tierMemory.set(session.id, tier)
  return tier
}

/** The density spec for one ranked row (spec §3). */
function densitySpec(entry, data) {
  // Leading rows (the current blank and the user's pins) keep the host's full
  // row: re-styling a pin would fight an explicit user action.
  if (entry.leading === true) return FULL_DENSITY
  if (entry.tier === 'unread') {
    return data.now - entry.session.updatedAt > STALE_UNREAD_MS ? STALE_DENSITY : MICRO_DENSITY
  }
  if (entry.tier === 'dormant' && !data.archived.has(entry.session.id)) return COMPACT_DENSITY
  return FULL_DENSITY
}

/** Apply one density spec, restoring every property the spec does not use. */
function applyDensity(styles, element, spec) {
  if (element === undefined || element === null) return
  for (const property of DENSITY_PROPERTIES) {
    const value = spec[property]
    if (value === undefined || value === null) styles.restore(element, property)
    else styles.write(element, property, value)
  }
}

/** This feature's injected fold row among a section's children, or null. */
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

/**
 * Insert (or refresh) the section's synthetic fold row — the section's last
 * flex item, ordered just before the overflow button's 999. The click reveals
 * the hidden rows for the rest of the page load only (a page-load Set in
 * client()): folding is a presentation decision, never persisted state.
 */
function ensureFoldRow(section, data, key, text) {
  let row = findFoldRow(section)
  if (row === null) {
    row = document.createElement('div')
    row.dataset.dshUxPlus = FOLD_VALUE
    const button = document.createElement('button')
    if (typeof button.setAttribute === 'function') button.setAttribute('type', 'button')
    button.style.background = 'none'
    button.style.border = 'none'
    button.style.color = 'var(--dsw-alias-label-tertiary, #8a8f98)'
    button.style.fontSize = '11px'
    button.style.fontFamily = 'inherit'
    button.style.cursor = 'pointer'
    button.style.textAlign = 'start'
    button.style.padding = '2px 8px'
    button.style.width = '100%'
    if (typeof button.addEventListener === 'function') {
      button.addEventListener('click', (event) => {
        if (event !== undefined && event !== null && typeof event.stopPropagation === 'function') event.stopPropagation()
        data.onReveal(key)
      })
    }
    row.appendChild(button)
    data.foldRows.add(row)
  }
  row.dataset.dshUxPlusKey = key
  if (row.parentNode !== section) section.appendChild(row)
  data.styles.write(row, 'order', FOLD_ROW_ORDER)
  const button = row.children[0]
  if (button !== undefined && button !== null) button.textContent = text
  return row
}

/** Take the fold row back out of the section (nothing left to fold). */
function removeFoldRow(section, data) {
  const row = findFoldRow(section)
  if (row === null) return
  data.styles.restore(row, 'order')
  detach(row, data.foldRows)
}

/**
 * Fold the section's surplus dormant rows (spec §4). Rows stay in the DOM —
 * only `display` is written — so the replay count and the row↔session pairing
 * keep matching. Archived rows keep today's treatment, the current session is
 * never hidden, and a leading (pinned) row is never hidden either: the density
 * layer keeps leading rows full, and hiding one of them would contradict it.
 */
function applyFold(section, account, ordered, data) {
  const eligible = []
  for (const entry of ordered) {
    if (entry.tier !== 'dormant') continue
    if (data.archived.has(entry.session.id)) continue
    if (entry.session.id === data.currentId) continue
    if (entry.leading === true) continue
    eligible.push(entry)
  }
  const hidden = data.revealed.has(account.key) ? [] : eligible.slice(FOLD_AFTER_DORMANT)
  const hiddenElements = new Set()
  for (const entry of hidden) hiddenElements.add(entry.element)
  for (const entry of ordered) {
    if (hiddenElements.has(entry.element)) data.styles.write(entry.element, 'display', 'none')
    else data.styles.restore(entry.element, 'display')
  }
  if (hidden.length === 0) {
    removeFoldRow(section, data)
    return
  }
  let newest = Number.NEGATIVE_INFINITY
  for (const entry of hidden) {
    if (entry.session.updatedAt > newest) newest = entry.session.updatedAt
  }
  ensureFoldRow(section, data, account.key, foldRowText(data.locale, hidden.length, data.now - newest))
}

/** This feature's attention badge among a row's children, or null. */
function findBadge(row) {
  for (const child of row.children) {
    if (child.dataset !== undefined && child.dataset !== null && child.dataset.dshUxPlus === BADGE_VALUE) return child
  }
  return null
}

/**
 * The attention that is NOT visible (spec §5), or null when no badge belongs
 * on this section's header.
 *
 * Three cases, in the host's own terms: a collapsed workspace renders no rows
 * at all (every non-blank, non-subagent, non-archived attention member is
 * hidden); an expanded workspace whose host overflow button is present renders
 * only its quota (the members outside the replayed slice are hidden); an
 * expanded workspace with no overflow button shows everything, so attention
 * needs no badge. Counts come from the data layer × the status map, never from
 * counting DOM rows — the host does not render collapsed rows beyond its
 * quota, so a DOM count would undercount exactly when the badge matters.
 */
function hiddenAttention(section, account, data, view) {
  const attention = attentionMembers(account.memberIds, data)
  if (attention.pending.length === 0 && attention.unread.length === 0) return null
  if (sectionExpanded(section) === false) {
    // A collapsed workspace renders no rows at all: every attention member
    // is hidden, and the badge carries the counts the DOM cannot show.
    return { pending: attention.pending.length, unread: attention.unread.length }
  }
  if (overflowButton(section) === null) return null
  const rows = rowChildren(section)
  const expected = renderedOrder(account.memberIds, account.key, data, view)
  const shown = collapsedShown(expected, data, rows.length)
  // An untrustworthy replay is no basis for a count: draw nothing.
  if (shown === null || rows.length !== shown.length) return null
  const visible = new Set(shown)
  return {
    pending: attention.pending.filter((id) => !visible.has(id)).length,
    unread: attention.unread.filter((id) => !visible.has(id)).length,
  }
}

/**
 * Draw or clear the workspace header's attention badge (spec §5). It is
 * inserted before the row's actions span, exactly like the age label, but it
 * is NOT hidden on hover: this is attention, the one thing the row exists to
 * carry. The element is reused across passes and removed when the count drops
 * back to zero.
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
    badge.style.fontSize = '10px'
    badge.style.lineHeight = '16px'
    badge.style.color = 'var(--dsw-alias-label-secondary, #b8bcc4)'
    badge.style.whiteSpace = 'nowrap'
    const actions = findRowActions(header)
    if (actions !== null && typeof header.insertBefore === 'function') header.insertBefore(badge, actions)
    else header.appendChild(badge)
    data.badges.add(badge)
  }
  badge.textContent = attentionBadgeText(data.locale, hidden)
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
    return
  }
  const unpaired = firstUnpairedRow(rows, shown, data.byId)
  if (unpaired !== -1) {
    traceSkip(account.key, 'pairing', `row ${unpaired} of ${shown.length}`)
    return
  }
  const entries = shown.map((id, index) => {
    const session = data.byId[id]
    return { session, element: rows[index], tier: tierOf(session, data) }
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
  // Without a status map there is no liveness layer at all: the ranking stays
  // exactly the recency ranking this feature always applied. With one, the
  // tiers lead (pending > running > unread > recent > dormant) and recency
  // breaks the ties inside a tier.
  ranked.sort(data.statusMap === null
    ? compareRecency
    : (a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || compareRecency(a, b))
  const ordered = leading.concat(ranked)
  ordered.forEach((entry, rank) => {
    data.styles.write(entry.element, 'order', String(10 + rank))
    data.styles.write(entry.element, 'flexShrink', '0')
    // Row density (spec §3): the compacting/micro properties live on the row
    // element; the flex item above it keeps the host's own box.
    if (data.statusMap !== null) applyDensity(data.styles, rowElementOf(entry), densitySpec(entry, data))
  })
  // The overflow button stays last no matter what.
  const button = overflowButton(section)
  if (button !== null) data.styles.write(button, 'order', '999')
  if (data.statusMap !== null) applyFold(section, account, ordered, data)
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
    // consumed (replied, read, opened) is removed on the very next pass. In
    // degraded mode attentionMembers() is empty and this only clears.
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
  let ageTimer = null
  let disposed = false
  /** Workspace ids already auto-collapsed during this page load. */
  const collapsedOnce = new Set()
  // ---- liveness layer state (all of it inert without a status map) --------
  /** Per-session band memory for the sticky recent/dormant boundary (spec §1). */
  const tierMemory = new Map()
  /** Account keys whose folded tail the user revealed (page load only, §4). */
  const revealed = new Set()
  /** Our injected fold rows / attention badges, for an exact dispose. */
  const foldRows = new Set()
  const badges = new Set()
  /** Rows with an in-flight FLIP transform (cleared on dispose, §8). */
  const flips = new Set()
  /** True while the pointer is inside the grouped tree (spec §7). */
  let pointerInTree = false
  /** A pass was requested while frozen; it runs the moment the freeze lifts. */
  let dirty = false

  // Hover/menu dismissal mirroring the host's `.sessionRow:hover .time`
  // rule (Rows.module.css:279-282): the action buttons take the space.
  const styleTag = document.createElement('style')
  styleTag.dataset.dshUxPlus = 'idle-collapse-css'
  styleTag.textContent =
    `[data-row-key^="${ROW_PREFIX}"]:hover > [${LABEL_ATTR}="${LABEL_VALUE}"],`
    + `[data-row-key^="${ROW_PREFIX}"].menuOpen > [${LABEL_ATTR}="${LABEL_VALUE}"] { display: none; }`
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

  /** Reveal a section's folded tail for the rest of this page load (spec §4). */
  function onReveal(accountKey) {
    revealed.add(accountKey)
    schedule()
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
      tierMemory,
      revealed,
      foldRows,
      badges,
      onReveal,
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
   * notification, a mutation) re-runs it once the freeze has lifted.
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

  /** One full pass: structural find, then the two-layer reorder. */
  function reorder() {
    if (frozen()) {
      dirty = true
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
    // motion), in which case the pass is exactly what it always was.
    const tops = snapshotTops(found.tree)
    styles.write(found.tree, 'display', 'flex')
    styles.write(found.tree, 'flexDirection', 'column')
    orderLevel(found.tree, roots, true, data, view)
    if (tops !== null) animateFlip(tops, flips)
  }

  /**
   * Idle sub-behavior pass: label every workspace row with activity and
   * collapse idle ones once. Independent of the reorder (a bail-out there
   * never suppresses labels here); shares the same debounced schedule.
   */
  function idlePass() {
    if (frozen()) {
      dirty = true
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
      if (frozen()) {
        // Deferred, not dropped: pointerout / a store notification / a mutation
        // re-schedules once the freeze has lifted.
        dirty = true
        return
      }
      dirty = false
      reorder()
      idlePass()
    }, 0)
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
  // Age labels must age on an otherwise idle page (no store traffic).
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
