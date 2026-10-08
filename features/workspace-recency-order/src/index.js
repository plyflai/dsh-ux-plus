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
 *                             first) plus row layer (each section's own
 *                             session rows by session updatedAt). Only the
 *                             visual order changes: React child order,
 *                             host store state (orderBy /
 *                             sessionOrderByAccount) and host data stay
 *                             intact. The disposer restores every cached
 *                             original style and removes all
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
 *   - rows are matched to sessions by replaying the host's own row
 *     projection — recency or the saved manual order over the account's
 *     members, the current blank pinned first, then the host visibility
 *     filter (tree.ts:144-212 + WorkspaceBrowser.tsx:804-838) — and only
 *     then pairing positionally (the host exposes no id on row elements);
 *     a count mismatch or a failed pairing-trust check makes the row layer
 *     a no-op for that section (the group layer is unaffected).
 *
 * Route 1 (pure CSS): the tree and every section become flex columns and
 * each child receives a computed `order` (group rank 0..n-1; row rank 10+;
 * overflow button last), with flex-shrink pinned to 0 so single-line rows
 * are never compressed (plan G4). Every written style property is cached on
 * first write and fully restored on dispose (plan W-6).
 */

export const id = 'workspace-recency-order'
export const title = 'Workspace recency order'
export const description = 'Visually reorder workspace groups and their session rows by most recent activity.'
export const hasGear = false

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
 * Most recent non-blank, non-subagent, non-archived update in a workspace
 * (the group-layer activity signal; no-update groups carry -Infinity).
 */
function latestSessionUpdate(workspace, byId, archived) {
  let latest = Number.NEGATIVE_INFINITY
  for (const sessionId of workspace.sessionIds) {
    const session = byId[sessionId]
    if (session === undefined || session.blank || session.origin === 'subagent') continue
    if (archived.has(sessionId)) continue
    if (session.updatedAt > latest) latest = session.updatedAt
  }
  return latest
}

/**
 * Host row visibility (tree.ts:208-212): subagent and archived sessions never
 * render; a blank row renders only while it is the current session.
 */
function rowVisible(session, id, currentId, archived) {
  return session !== undefined
    && session.origin !== 'subagent'
    && !archived.has(id)
    && (session.blank !== true || id === currentId)
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
 * Host manual-order reconciliation (tree.ts:166-186): retained saved slots
 * first, remaining known members appended by recency; departed and unknown
 * members omitted.
 */
function reconcileManualOrder(memberIds, savedOrder, byId) {
  const members = new Map(memberIds.map((id) => [id, id]))
  const included = new Set()
  const ordered = []
  for (const key of savedOrder ?? []) {
    const id = members.get(key)
    if (id === undefined || included.has(key)) continue
    ordered.push(id)
    included.add(key)
  }
  for (const id of orderByRecency(memberIds, byId)) {
    if (included.has(id)) continue
    ordered.push(id)
    included.add(id)
  }
  return ordered
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
  if (state === null || state.orderBy !== 'manual') return { orderBy: 'updated', saved: undefined }
  const saved = state.sessionOrderByAccount
  return {
    orderBy: 'manual',
    saved: saved !== null && typeof saved === 'object' ? saved : undefined,
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
    ? reconcileManualOrder(memberIds, view.saved ? view.saved[key] : undefined, byId)
    : orderByRecency(memberIds, byId)
  const currentBlank = data.currentId !== undefined && memberIds.includes(data.currentId)
    && byId[data.currentId] !== undefined && byId[data.currentId].blank === true
    ? data.currentId
    : undefined
  return pinCurrentBlank(base, currentBlank)
    .filter((id) => rowVisible(byId[id], id, data.currentId, data.archived))
}

/**
 * Host collapsed-row rule (rows/WorkspaceBrowser.tsx:47-59): every blank row
 * plus the first five ordinary rows, by rendered position.
 */
function collapsedRows(ids, byId) {
  let ordinary = 0
  return ids.filter((id) => byId[id].blank || ordinary++ < COLLAPSED_SESSION_LIMIT)
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
  for (let i = 0; i < shown.length; i += 1) {
    const session = byId[shown[i]]
    if (session === undefined) return false
    if (session.blank === true) {
      if (i !== 0) return false
      continue
    }
    const title = session.displayTitle
    if (typeof title !== 'string' || title === '') return false
    const target = normalizeText(title)
    if (target === '') return false
    if (!rowCarriesTitle(rows[i], target)) return false
  }
  return true
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
    if (cached[property] === undefined) cached[property] = element.style[property]
    element.style[property] = value
  }
  function clear() {
    for (const [element, cached] of records) {
      for (const property of Object.keys(cached)) element.style[property] = cached[property]
    }
    records.clear()
  }
  return { write, clear }
}

/** The ungrouped bucket's activity: latest visible session owned by no workspace. */
function bucketActivity(data) {
  const owned = new Set()
  for (const workspace of data.items) {
    for (const sessionId of workspace.sessionIds) owned.add(sessionId)
  }
  let latest = Number.NEGATIVE_INFINITY
  for (const session of Object.values(data.byId)) {
    if (session.origin === 'subagent' || session.blank) continue
    if (data.archived.has(session.id)) continue
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
 * section's row layer a no-op (the group layer is unaffected).
 *
 * The section's current blank row keeps the host's first row position
 * (pinCurrentBlank invariant — tree.ts:194-200, member guard
 * WBS:823-826); only the remaining rows are re-ranked by recency, so the
 * feature never drags the pinned blank out of position 0.
 */
function orderRows(section, account, data, view) {
  const expected = renderedOrder(account.memberIds, account.key, data, view)
  const shown = sectionCollapsed(section) ? collapsedRows(expected, data.byId) : expected
  const rows = rowChildren(section)
  if (rows.length !== shown.length) return
  if (!pairingTrustworthy(rows, shown, data.byId)) return
  const entries = shown.map((id, index) => ({ session: data.byId[id], element: rows[index] }))
  const pinned = entries.length > 0 && entries[0].session.blank === true ? [entries[0]] : []
  const ranked = entries.slice(pinned.length)
  ranked.sort((a, b) => b.session.updatedAt - a.session.updatedAt
    || (a.session.id < b.session.id ? -1 : a.session.id > b.session.id ? 1 : 0))
  pinned.concat(ranked).forEach((entry, rank) => {
    data.styles.write(entry.element, 'order', String(10 + rank))
    data.styles.write(entry.element, 'flexShrink', '0')
  })
  // The overflow button stays last no matter what.
  const button = overflowButton(section)
  if (button !== null) data.styles.write(button, 'order', '999')
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
  const ranked = pairs.map((pair, index) => ({
    section: pair.section,
    workspace: pair.workspace,
    index,
    activity: pair.workspace === null
      ? bucketActivity(data)
      : latestSessionUpdate(pair.workspace, data.byId, data.archived),
  }))
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
  let disposed = false

  /** Snapshot the live lists; null while either list is not ready. */
  function readData() {
    const sessionSnapshot = sessions.getSnapshot()
    const workspaceSnapshot = workspaces.getSnapshot()
    if (sessionSnapshot.phase !== 'ready' || workspaceSnapshot.phase !== 'ready') return null
    const byId = sessionSnapshot.byId
    const items = workspaceSnapshot.items
    const archived = new Set(workspaceSnapshot.archivedSessionIds)
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
    return { byId, items, archived, currentId, styles }
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

  /** One full pass: structural find, then the two-layer reorder. */
  function reorder() {
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
    styles.write(found.tree, 'display', 'flex')
    styles.write(found.tree, 'flexDirection', 'column')
    orderLevel(found.tree, roots, true, data, view)
  }

  function schedule() {
    if (disposed || timer !== null) return
    timer = window.setTimeout(function () {
      timer = null
      if (disposed) return
      reorder()
    }, 0)
  }

  const observer = new MutationObserver(schedule)
  if (document.body !== null) observer.observe(document.body, { childList: true, subtree: true })
  const disposeSessions = sessions.subscribe(schedule)
  const disposeWorkspaces = workspaces.subscribe(schedule)
  schedule()

  // No ctx.effect: this feature owns its resources and hands back the exact
  // cleanup (legacy cleanup contract, retained). The package client half
  // holds the disposer; the plugin-level unmount (and each switch-off)
  // calls it.
  return function cleanup() {
    disposed = true
    if (timer !== null) window.clearTimeout(timer)
    observer.disconnect()
    disposeSessions()
    disposeWorkspaces()
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
  host: (ctx) => attach(ctx),
  client: (ctx, deps) => client(ctx, deps),
}
