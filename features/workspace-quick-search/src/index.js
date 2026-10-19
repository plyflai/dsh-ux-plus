/**
 * Quick search box (feature id `workspace-quick-search`).
 *
 * The usage it enables: "use DeepSeek like a search engine". Type a question in
 * the sidebar, press Enter, and land in a NORMAL session — same chat page, same
 * streaming, same tools — except that the session belongs to a private
 * background workspace the sidebar never lists. Quick lookups therefore stop
 * costing "remember to create a session first" and stop polluting the workspace
 * tree afterwards.
 *
 * Why each piece of the implementation looks the way it does:
 *
 *   - Placement. The host exposes no slot between the sidebar's panel list and
 *     the workspace region (ui-sidebar `SidebarRoot.tsx:280` renders `<nav
 *     class=panelList>` and `:297` renders `<div class=regionArea>` around the
 *     `sidebar.workspaces` slot), so the box is inserted as the region's FIRST
 *     child and kept alive by one MutationObserver. When the region is not
 *     rendered — the sidebar sits in its 56px rail — the box is simply absent
 *     (no error, no half-mounted state).
 *   - Plain DOM, not a React tree: the box must survive every remount of the
 *     workspace browser, which is exactly why the sibling DOM features are
 *     plain DOM too (and why the settings-tab switch can mount/unmount us with
 *     no renderer involved).
 *   - Session creation reuses the path the inherit-conversation feature already
 *     proved end to end: `sessions.create` -> `remote.session.selectModel` ->
 *     `remote.session.prompt` -> `uiWorkspace.openSession`.
 *   - "Not shown in DSH" cannot be done by archiving (an archived Session is
 *     barred from `agent/pre-step`, `archived-session-gate.ts:24-30`, so it
 *     could never run again) and the host has no filter that hides one
 *     workspace, so the rows are hidden by ONE injected rule keyed on the
 *     host's own stable attributes: the workspace group wrapper that holds
 *     `data-row-key="workspace:<id>"` and every `data-row-key="session:<id>"`
 *     row the workspace owns (`Rows.tsx:245,590`). Turning the feature off
 *     removes the rule, and the workspace reappears.
 *   - The background workspace has to exist on disk before it can be
 *     registered (`packages/workspace/workspace/src/index.ts:241` rejects a
 *     non-directory path) and the browser cannot create directories, so the
 *     package host half (`src/index.js`) creates it once at load. That is also
 *     why a failed workspace registration is reported instead of silently
 *     falling back to the current workspace — a session outside the private
 *     workspace could not be hidden, which is the one promise this feature
 *     makes.
 */

/** Stable feature id — also the per-feature switch key in the `ux-plus` section. */
export const id = 'workspace-quick-search'
/** Settings-row title (English constant; the settings tab localizes it). */
export const title = 'Quick search box'
/** Settings-row description fallback. */
export const description = 'Put a search box above the workspace list: type a question, press Enter and a normal session opens in a background workspace the sidebar never lists. The clock icon lists the last 50 searches.'
/** No gear: the box has no per-feature options beyond the switch itself. */
export const hasGear = false
/** Settings-row copy, assembled into the `ux-plus-settings` namespace. */
export const settingsMessages = {
  zh: {
    title: '快速搜索框',
    description: '在「自动化任务」下方常驻一个搜索框：输入后回车即开一个普通会话，会话落在后台独立工作区里、不显示在侧边栏；右侧时钟图标列出最近 50 条搜索。',
  },
  en: {
    title: 'Quick search box',
    description: 'Put a search box above the workspace list: type a question, press Enter and a normal session opens in a background workspace the sidebar never lists. The clock icon lists the last 50 searches.',
  },
}

/** Locale namespace for the box's own copy. */
const NS = 'ux-plus-quick-search'

/** Every user-visible string, keyed so the active DSH locale picks the row. */
const MESSAGES = {
  zh: {
    placeholder: '搜索…（回车直接开新会话）',
    model: '模型',
    history: '搜索历史',
    historyTitle: '最近 50 条搜索',
    historyEmpty: '还没有搜索记录',
    clear: '清空',
    starting: '正在打开…',
    noHome: '找不到主目录，无法定位搜索存储区',
    noWorkspace: '无法准备搜索工作区：后台目录未就绪，重启 DSH 后重试',
    createFailed: '创建会话失败',
    promptFailed: '发送失败',
    now: '刚刚',
    minutes: '{n} 分钟前',
    hours: '{n} 小时前',
    yesterday: '昨天',
    days: '{n} 天前',
  },
  en: {
    placeholder: 'Search… (Enter opens a new session)',
    model: 'Model',
    history: 'Search history',
    historyTitle: 'Last 50 searches',
    historyEmpty: 'No searches yet',
    clear: 'Clear',
    starting: 'Opening…',
    noHome: 'Cannot locate the home directory for the search workspace',
    noWorkspace: 'Cannot prepare the search workspace: its directory is missing, restart DSH and retry',
    createFailed: 'Could not create the session',
    promptFailed: 'Could not send the prompt',
    now: 'just now',
    minutes: '{n} min ago',
    hours: '{n} h ago',
    yesterday: 'yesterday',
    days: '{n} d ago',
  },
}

/** Path segments of the private workspace, relative to the host home. */
export const WORKSPACE_SEGMENTS = ['.dsh-ux-plus', 'search']
/** localStorage key holding the newest-first history array. */
export const HISTORY_KEY = 'dsh.ux-plus.quick-search.history'
/** localStorage key holding the picked `{provider, model}` of the model menu. */
export const MODEL_KEY = 'dsh.ux-plus.quick-search.model'
/** How many searches the history keeps (and shows). */
export const HISTORY_LIMIT = 50

/** Root marker of the injected box. */
const ROOT_VALUE = 'quick-search'
/** Root marker of the history popup (a body child: the sidebar clips fixed-free content). */
const MENU_VALUE = 'quick-search-history'
/** Host row-key prefixes (ui-workspace `Rows.tsx:245,590`). */
const WORKSPACE_ROW_PREFIX = 'workspace:'
const SESSION_ROW_PREFIX = 'session:'

/**
 * `<home>/.dsh-ux-plus/search` using the home's own separator, or null when the
 * host did not report a home (the box then reports `noHome` instead of guessing
 * a path that the host would reject).
 * @param {string | null | undefined} home - `remote.$host.home`.
 * @returns {string | null} the workspace path.
 */
export function searchWorkspacePath(home) {
  if (typeof home !== 'string' || home === '') return null
  const separator = home.includes('\\') && !home.includes('/') ? '\\' : '/'
  const base = home.replace(/[\\/]+$/, '')
  if (base === '') return null
  return `${base}${separator}${WORKSPACE_SEGMENTS.join(separator)}`
}

/**
 * Quote one CSS attribute value, so an id containing quotes cannot break the
 * injected stylesheet.
 * @param {string} value - attribute value.
 * @returns {string} a double-quoted CSS string token.
 */
function cssString(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * The stylesheet that removes the private workspace from the sidebar.
 *
 * Two rules per workspace: the group wrapper (the element whose DIRECT child is
 * the workspace row — `*:has(> …)` also collapses the wrapper's own spacing, so
 * an empty group leaves no gap) and the row itself (for group-by modes that
 * render the row without that wrapper). Session rows are listed by id because
 * some list modes (`groupBy: 'flat'`) render sessions without the wrapper.
 * @param {string | null | undefined} workspaceId - the private workspace id.
 * @param {Iterable<string>} sessionIds - sessions the workspace owns.
 * @returns {string} CSS text ('' when nothing is known yet).
 */
export function hiddenCss(workspaceId, sessionIds) {
  const lines = []
  if (typeof workspaceId === 'string' && workspaceId !== '') {
    const key = cssString(`${WORKSPACE_ROW_PREFIX}${workspaceId}`)
    lines.push(`*:has(> [data-row-key=${key}]) { display: none !important; }`)
    lines.push(`[data-row-key=${key}] { display: none !important; }`)
  }
  const seen = new Set()
  for (const sessionId of sessionIds || []) {
    if (typeof sessionId !== 'string' || sessionId === '' || seen.has(sessionId)) continue
    seen.add(sessionId)
    lines.push(`[data-row-key=${cssString(`${SESSION_ROW_PREFIX}${sessionId}`)}] { display: none !important; }`)
  }
  return lines.join('\n')
}

/**
 * The sidebar element that hosts the workspace browser: the ancestor of the
 * session tree whose previous sibling is the panel-list `<nav>`.
 *
 * Walking up from the tree (instead of addressing the region by class) keeps
 * this working under hashed CSS-module class names; an absent tree (rail mode,
 * no workspaces yet) yields null so the caller hides the box.
 * @param {Document} doc - the page document.
 * @returns {object | null} the region element, or null.
 */
export function locateBrowserRegion(doc) {
  if (doc === null || doc === undefined || typeof doc.querySelector !== 'function') return null
  let tree = null
  try {
    tree = doc.querySelector('[role="tree"]')
  } catch {
    return null
  }
  if (tree === null || tree === undefined) return null
  let node = tree
  while (node !== null && node !== undefined && node.parentNode !== null && node.parentNode !== undefined) {
    const previous = node.previousElementSibling
    if (previous !== null && previous !== undefined && String(previous.tagName || '').toUpperCase() === 'NAV') return node
    node = node.parentNode
  }
  return null
}

/**
 * Parse the persisted history.
 * @param {string | null | undefined} raw - the localStorage value.
 * @returns {Array<{sessionId: string, query: string, provider?: string, model?: string, at: number}>} newest first.
 */
export function readHistory(raw) {
  if (typeof raw !== 'string' || raw === '') return []
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const rows = []
  for (const entry of parsed) {
    if (entry === null || typeof entry !== 'object') continue
    if (typeof entry.sessionId !== 'string' || entry.sessionId === '') continue
    if (typeof entry.query !== 'string') continue
    rows.push({
      sessionId: entry.sessionId,
      query: entry.query,
      provider: typeof entry.provider === 'string' ? entry.provider : undefined,
      model: typeof entry.model === 'string' ? entry.model : undefined,
      at: typeof entry.at === 'number' && Number.isFinite(entry.at) ? entry.at : 0,
    })
    if (rows.length === HISTORY_LIMIT) break
  }
  return rows
}

/**
 * Newest-first history after one successful search: one row per session (a
 * retried search reuses the session it already created, and must not leave two
 * entries behind).
 * @param {Array<object>} list - current history.
 * @param {object} entry - the new entry.
 * @param {number} [limit] - cap (defaults to {@link HISTORY_LIMIT}).
 * @returns {Array<object>} the new history.
 */
export function pushHistory(list, entry, limit = HISTORY_LIMIT) {
  const rows = Array.isArray(list) ? list : []
  const next = [entry]
  for (const row of rows) {
    if (row === null || typeof row !== 'object') continue
    if (row.sessionId === entry.sessionId) continue
    next.push(row)
  }
  return next.length > limit ? next.slice(0, limit) : next
}

/**
 * Flatten the model catalog into `<option>` rows.
 * @param {object | null | undefined} catalog - `remote.session.modelCatalog()` value.
 * @returns {Array<{index: number, provider: string, model: string, label: string, group: string}>} rows.
 */
export function flattenModels(catalog) {
  const groups = catalog !== null && catalog !== undefined && Array.isArray(catalog.groups) ? catalog.groups : []
  const rows = []
  for (const group of groups) {
    if (group === null || group === undefined) continue
    const provider = typeof group.id === 'string' ? group.id : null
    if (provider === null || provider === '') continue
    const models = Array.isArray(group.models) ? group.models : []
    for (const model of models) {
      if (model === null || model === undefined || typeof model.id !== 'string') continue
      rows.push({
        index: rows.length,
        provider,
        model: model.id,
        label: typeof model.name === 'string' && model.name !== '' ? model.name : model.id,
        group: typeof group.name === 'string' && group.name !== '' ? group.name : provider,
      })
    }
  }
  return rows
}

/**
 * Age bucket for a history row (rendering happens through the locale copy).
 * @param {number} at - entry timestamp (ms).
 * @param {number} now - current timestamp (ms).
 * @returns {{key: string, n?: number}} the bucket, e.g. `{key: 'hours', n: 3}`.
 */
export function ageBucket(at, now) {
  const elapsed = Math.max(0, (typeof now === 'number' ? now : 0) - (typeof at === 'number' ? at : 0))
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (elapsed < minute) return { key: 'now' }
  if (elapsed < hour) return { key: 'minutes', n: Math.floor(elapsed / minute) }
  if (elapsed < day) return { key: 'hours', n: Math.floor(elapsed / hour) }
  if (elapsed < 2 * day) return { key: 'yesterday' }
  return { key: 'days', n: Math.floor(elapsed / day) }
}

/** Trailing-separator-insensitive path comparison (host paths come back canonicalized). */
function trimSeparators(path) {
  return typeof path === 'string' ? path.replace(/[\\/]+$/, '') : ''
}

/** One `<svg>` icon built from path data, themed through `currentColor`. */
function svgIcon(doc, paths, size) {
  const namespace = 'http://www.w3.org/2000/svg'
  const make = typeof doc.createElementNS === 'function'
    ? (tag) => doc.createElementNS(namespace, tag)
    : (tag) => doc.createElement(tag)
  const root = make('svg')
  root.setAttribute('viewBox', '0 0 16 16')
  root.setAttribute('width', String(size))
  root.setAttribute('height', String(size))
  root.setAttribute('fill', 'none')
  root.setAttribute('stroke', 'currentColor')
  root.setAttribute('stroke-width', '1.5')
  root.setAttribute('stroke-linecap', 'round')
  root.setAttribute('stroke-linejoin', 'round')
  root.setAttribute('aria-hidden', 'true')
  root.setAttribute('focusable', 'false')
  for (const path of paths) {
    const node = make('path')
    node.setAttribute('d', path)
    root.appendChild(node)
  }
  return root
}

/** Magnifier (left, inside the field — the host's own filter box puts it outside). */
const MAGNIFIER_PATHS = ['M7 2.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8', 'M10.3 10.3 14 14']
/** Clock with a backward arrow: the history entry point. */
const CLOCK_PATHS = ['M8 2.4a5.6 5.6 0 1 0 0 11.2A5.6 5.6 0 0 0 8 2.4', 'M8 5.1v3.1l2.1 1.3']

/** Stylesheet for the box and its popup (authored text: no hashed class names). */
function boxCss() {
  const scope = `[data-dsh-ux-plus="${ROOT_VALUE}"]`
  const menu = `[data-dsh-ux-plus="${MENU_VALUE}"]`
  return [
    `${scope} { display: flex; flex-direction: column; gap: 3px; padding: 6px 8px 4px; }`,
    `${scope} [data-qs="field"] { display: flex; align-items: center; gap: 6px; height: 30px; padding: 0 5px 0 8px;`
      + ' border-radius: 8px; border: 1px solid transparent;'
      + ' background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.10));'
      + ' transition: border-color 120ms ease; }',
    `${scope} [data-qs="field"]:focus-within { border-color: var(--dsw-alias-border-strong, #3a3f4b); }`,
    `${scope} [data-qs="glass"] { display: inline-flex; flex: 0 0 auto; color: var(--dsw-alias-label-secondary, #9aa0ab); }`,
    `${scope} [data-qs="input"] { flex: 1 1 auto; min-width: 0; height: 100%; padding: 0; border: none; outline: none;`
      + ' background: transparent; color: var(--dsw-alias-label-primary, #e8e8e8); font: inherit; font-size: 13px; }',
    `${scope} [data-qs="input"]::placeholder { color: var(--dsw-alias-label-secondary, #9aa0ab); }`,
    `${scope} [data-qs="model"] { flex: 0 0 auto; max-width: 92px; height: 22px; padding: 0 2px; border: none; border-radius: 6px;`
      + ' outline: none; background: transparent; color: var(--dsw-alias-label-secondary, #9aa0ab); font: inherit; font-size: 11px;'
      + ' cursor: pointer; }',
    `${scope} [data-qs="model"]:hover { color: var(--dsw-alias-label-primary, #e8e8e8); }`,
    `${scope} [data-qs="history"] { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;`
      + ' width: 22px; height: 22px; padding: 0; border: none; border-radius: 6px; background: transparent;'
      + ' color: var(--dsw-alias-label-secondary, #9aa0ab); cursor: pointer; }',
    `${scope} [data-qs="history"]:hover { color: var(--dsw-alias-label-primary, #e8e8e8);`
      + ' background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12)); }',
    `${scope} [data-qs="status"] { font-size: 11px; line-height: 14px; color: #e5534b; }`,
    `${scope} [data-qs="status"][data-qs-state="busy"] { color: var(--dsw-alias-label-secondary, #9aa0ab); }`,
    `${scope} [data-qs="status"]:empty { display: none; }`,
    `${menu} { position: fixed; z-index: 99999; width: 300px; max-height: 320px; overflow: auto; padding: 6px;`
      + ' border-radius: 10px; border: 1px solid var(--dsw-alias-border-l2, #3a3f4b);'
      + ' background: var(--dsw-alias-bg-layer-2, #24272e); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);'
      + ' color: var(--dsw-alias-label-primary, #e8e8e8); font-size: 13px; }',
    `${menu} [data-qs="menu-head"] { display: flex; align-items: center; justify-content: space-between; gap: 8px;`
      + ' padding: 4px 6px 6px; font-size: 11px; color: var(--dsw-alias-label-secondary, #9aa0ab); }',
    `${menu} [data-qs="menu-clear"] { padding: 0; border: none; background: transparent; color: inherit; font: inherit;`
      + ' font-size: 11px; cursor: pointer; }',
    `${menu} [data-qs="menu-clear"]:hover { color: var(--dsw-alias-label-primary, #e8e8e8); }`,
    `${menu} [data-qs="menu-row"] { display: flex; flex-direction: column; gap: 2px; width: 100%; padding: 6px 8px;`
      + ' border: none; border-radius: 6px; background: transparent; color: inherit; font: inherit; text-align: left;'
      + ' cursor: pointer; }',
    `${menu} [data-qs="menu-row"]:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12)); }`,
    `${menu} [data-qs="menu-query"] { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }`,
    `${menu} [data-qs="menu-meta"] { font-size: 11px; color: var(--dsw-alias-label-secondary, #9aa0ab); }`,
    `${menu} [data-qs="menu-empty"] { padding: 10px 8px; color: var(--dsw-alias-label-secondary, #9aa0ab); }`,
  ].join('\n')
}

/** Request id for `remote.session.prompt` (same shape as the inherit feature). */
function mintRequestId() {
  const crypto = globalThis.crypto
  if (crypto && typeof crypto.randomUUID === 'function') return String(crypto.randomUUID())
  return `ux-plus-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Mount the box.
 * @param {object} ctx - the client plugin context (`remote`, `locale`, `get`).
 * @param {object} deps - shared feature deps (`sessions`, `workspaces` services).
 * @returns {() => void} disposer: removes the box, both stylesheets, the popup,
 *   every listener and every subscription (off == never installed).
 */
export function client(ctx, deps) {
  if (typeof document === 'undefined' || document === null) return () => {}
  if (typeof window === 'undefined' || window === null) return () => {}

  const disposers = []
  let disposed = false

  /** Locale dictionary registration (survives tab remounts with the plugin fiber). */
  const locale = ctx && ctx.locale
  if (ctx && typeof ctx.effect === 'function' && locale && typeof locale.register === 'function') {
    disposers.push(ctx.effect(() => locale.register(NS, MESSAGES)))
  }

  /** Active DSH locale id, defensively ('zh' when the service is absent). */
  function activeLocale() {
    try {
      const snapshot = locale && typeof locale.getSnapshot === 'function' ? locale.getSnapshot() : null
      if (snapshot && typeof snapshot.active === 'string') return snapshot.active
    } catch {
      /* fall through to the default */
    }
    return 'zh'
  }

  /** One localized string, with `{n}`-style interpolation. */
  function t(key, params) {
    const dict = MESSAGES[activeLocale()] || MESSAGES.en
    const template = dict[key] !== undefined ? dict[key] : MESSAGES.en[key] !== undefined ? MESSAGES.en[key] : key
    if (!params) return template
    return String(template).replace(/\{(\w+)\}/g, (match, name) => (params[name] === undefined ? match : String(params[name])))
  }

  /** `window.localStorage`, or null when the surface blocks it. */
  function storage() {
    try {
      return window.localStorage || null
    } catch {
      return null
    }
  }

  /**
   * Read one observable snapshot without letting a throwing or absent store
   * take the whole feature down (same defensive shape as the sibling DOM
   * features).
   */
  function snapshotOf(observable) {
    if (observable === null || observable === undefined || typeof observable.getSnapshot !== 'function') return null
    try {
      return observable.getSnapshot()
    } catch {
      return null
    }
  }

  const store = storage()

  /** Everything the box owns; `dir` is null when the host reported no home. */
  const state = {
    dir: searchWorkspacePath(readHostHome()),
    workspaceId: null,
    extraHidden: new Set(),
    models: [],
    modelKey: readModelKey(),
    defaultKey: null,
    busy: false,
    history: readHistory(store ? store.getItem(HISTORY_KEY) : null),
  }

  /** `remote.$host.home` — the host's own home (host and browser agree on it). */
  function readHostHome() {
    const remote = ctx && ctx.remote
    const host = remote && remote.$host
    return host && typeof host.home === 'string' ? host.home : null
  }

  /** The picked model, persisted as `{provider, model}`. */
  function readModelKey() {
    if (store === null) return null
    let parsed
    try {
      parsed = JSON.parse(store.getItem(MODEL_KEY) || 'null')
    } catch {
      return null
    }
    if (parsed === null || typeof parsed !== 'object') return null
    if (typeof parsed.provider !== 'string' || typeof parsed.model !== 'string') return null
    return `${parsed.provider}\u0000${parsed.model}`
  }

  function saveModelKey() {
    if (store === null) return
    const row = state.models.find((candidate) => selectionKey(candidate) === state.modelKey)
    if (row === undefined) return
    try {
      store.setItem(MODEL_KEY, JSON.stringify({ provider: row.provider, model: row.model }))
    } catch {
      /* quota / private mode: the pick simply does not persist */
    }
  }

  function persistHistory() {
    if (store === null) return
    try {
      store.setItem(HISTORY_KEY, JSON.stringify(state.history))
    } catch {
      /* quota / private mode: the history stays in memory only */
    }
  }

  // -------------------------------------------------------------------------
  // Placement: one stable node, re-inserted whenever React or the user moves it.
  // -------------------------------------------------------------------------

  const refs = { root: null, input: null, select: null, history: null, status: null }

  /** The text field placeholder / labels follow the active locale. */
  function applyCopy() {
    if (refs.input !== null) {
      refs.input.setAttribute('placeholder', t('placeholder'))
      refs.input.setAttribute('aria-label', t('placeholder'))
    }
    if (refs.select !== null) refs.select.setAttribute('aria-label', t('model'))
    if (refs.history !== null) {
      refs.history.setAttribute('aria-label', t('history'))
      refs.history.setAttribute('title', t('history'))
    }
  }

  function el(tag, attrs) {
    const node = document.createElement(tag)
    if (attrs) for (const key of Object.keys(attrs)) node.setAttribute(key, attrs[key])
    return node
  }

  function setStatus(kind, message) {
    if (refs.status === null) return
    refs.status.textContent = message || ''
    refs.status.setAttribute('data-qs-state', kind || '')
  }

  /** Build the box once; every later render only touches its children. */
  function buildNode() {
    const root = el('div', { 'data-dsh-ux-plus': ROOT_VALUE })
    const field = el('div', { 'data-qs': 'field' })
    const glass = el('span', { 'data-qs': 'glass' })
    glass.appendChild(svgIcon(document, MAGNIFIER_PATHS, 14))
    const input = el('input', { 'data-qs': 'input', type: 'text', spellcheck: 'false', autocomplete: 'off' })
    input.value = ''
    const select = el('select', { 'data-qs': 'model' })
    const history = el('button', { 'data-qs': 'history', type: 'button' })
    history.appendChild(svgIcon(document, CLOCK_PATHS, 14))
    const status = el('div', { 'data-qs': 'status', role: 'status' })
    field.appendChild(glass)
    field.appendChild(input)
    field.appendChild(select)
    field.appendChild(history)
    root.appendChild(field)
    root.appendChild(status)

    input.addEventListener('keydown', onKeyDown)
    select.addEventListener('change', onModelChange)
    history.addEventListener('click', openHistory)

    refs.root = root
    refs.input = input
    refs.select = select
    refs.history = history
    refs.status = status
    applyCopy()
    renderModels()
    return root
  }

  /** Insert (or re-insert) the box as the region's first child. */
  function place() {
    const region = locateBrowserRegion(document)
    if (region === null) {
      // Rail mode / no list yet: the box has no seat, and must not linger.
      if (refs.root !== null && refs.root.parentNode !== null) refs.root.parentNode.removeChild(refs.root)
      return
    }
    if (refs.root === null) refs.root = buildNode()
    if (refs.root.parentNode === region && region.firstElementChild === refs.root) return
    region.insertBefore(refs.root, region.firstElementChild || null)
  }

  let pending = null
  /** Coalesce mutation pressure into one 0-ms pass. */
  function schedule() {
    if (disposed || pending !== null) return
    pending = window.setTimeout(() => {
      pending = null
      if (disposed) return
      place()
      applyHiddenCss()
    }, 0)
  }

  // -------------------------------------------------------------------------
  // Hiding the private workspace (one rule, keyed on the host's own row keys).
  // -------------------------------------------------------------------------

  const styleTag = document.createElement('style')
  styleTag.setAttribute('data-plugin', 'dsh-ux-plus')
  styleTag.setAttribute('data-feature', id)
  styleTag.textContent = boxCss()
  if (document.head !== null && document.head !== undefined) document.head.appendChild(styleTag)
  const hideTag = document.createElement('style')
  hideTag.setAttribute('data-plugin', 'dsh-ux-plus')
  hideTag.setAttribute('data-feature', `${id}-hidden-workspace`)
  hideTag.textContent = ''
  if (document.head !== null && document.head !== undefined) document.head.appendChild(hideTag)

  /** Ready workspace rows, or [] while the store is still loading. */
  function workspaceRows() {
    const snapshot = snapshotOf(deps && deps.workspaces && deps.workspaces.list)
    if (snapshot === null || snapshot.phase !== 'ready' || !Array.isArray(snapshot.items)) return []
    return snapshot.items
  }

  /** The private workspace row, when it already exists (never creates one). */
  function findSearchWorkspace() {
    if (state.dir === null) return null
    const target = trimSeparators(state.dir)
    for (const row of workspaceRows()) {
      if (row !== null && typeof row === 'object' && trimSeparators(row.path) === target) return row
    }
    return null
  }

  /** Re-point the hide rule at the workspace (and the sessions it owns). */
  function applyHiddenCss() {
    const row = findSearchWorkspace()
    if (row !== null && typeof row.workspaceId === 'string') state.workspaceId = row.workspaceId
    const ids = new Set(state.extraHidden)
    if (row !== null && Array.isArray(row.sessionIds)) for (const sessionId of row.sessionIds) ids.add(sessionId)
    hideTag.textContent = hiddenCss(state.workspaceId, ids)
  }

  /**
   * The private workspace id, registering the directory on first use.
   * @param {boolean} create - register the workspace when it is missing.
   * @returns {Promise<string | null>} the id, or null when not creating.
   */
  async function resolveWorkspace(create) {
    const row = findSearchWorkspace()
    if (row !== null && typeof row.workspaceId === 'string') {
      state.workspaceId = row.workspaceId
      return row.workspaceId
    }
    if (!create) return null
    if (state.dir === null) throw new Error(t('noHome'))
    const workspaces = deps && deps.workspaces
    if (!workspaces || typeof workspaces.create !== 'function') throw new Error(t('noWorkspace'))
    const created = await workspaces.create({ path: state.dir })
    const workspaceId = created && typeof created.workspaceId === 'string' ? created.workspaceId : null
    if (workspaceId === null) throw new Error(t('noWorkspace'))
    state.workspaceId = workspaceId
    applyHiddenCss()
    return workspaceId
  }

  // -------------------------------------------------------------------------
  // Model menu.
  // -------------------------------------------------------------------------

  /** Identity of a model row, matching the persisted key. */
  function selectionKey(selection) {
    return selection && typeof selection.provider === 'string' && typeof selection.model === 'string'
      ? `${selection.provider}\u0000${selection.model}`
      : null
  }

  /** Which row the `<select>` should show: remembered pick, else the host default. */
  function selectedRow() {
    for (const candidate of [state.modelKey, state.defaultKey]) {
      if (candidate === null) continue
      const hit = state.models.find((row) => selectionKey(row) === candidate)
      if (hit !== undefined) return hit
    }
    return state.models.length > 0 ? state.models[0] : null
  }

  /** Re-render the `<option>` list from the loaded catalog. */
  function renderModels() {
    const select = refs.select
    if (select === null) return
    while (select.children.length > 0) select.removeChild(select.children[0])
    if (state.models.length === 0) {
      const placeholder = document.createElement('option')
      placeholder.value = '-1'
      placeholder.textContent = '—'
      placeholder.disabled = true
      placeholder.selected = true
      select.appendChild(placeholder)
      select.value = '-1'
      return
    }
    for (const row of state.models) {
      const option = document.createElement('option')
      option.value = String(row.index)
      option.textContent = row.label
      option.title = `${row.group} · ${row.model}`
      select.appendChild(option)
    }
    const picked = selectedRow()
    select.value = String(picked === null ? state.models[0].index : picked.index)
  }

  async function loadModels() {
    const remote = ctx && ctx.remote
    const session = remote && remote.session
    if (!session || typeof session.modelCatalog !== 'function') return
    let result
    try {
      result = await session.modelCatalog()
    } catch {
      return
    }
    if (disposed) return
    const catalog = result && result.value !== undefined ? result.value : result
    if (catalog === null || catalog === undefined || (result && result.ok === false)) return
    state.models = flattenModels(catalog)
    const fallback = catalog.default
    state.defaultKey = selectionKey(fallback)
    renderModels()
  }

  function onModelChange() {
    const index = Number(refs.select.value)
    const row = state.models.find((candidate) => candidate.index === index)
    state.modelKey = row === undefined ? null : selectionKey(row)
    saveModelKey()
  }

  // -------------------------------------------------------------------------
  // Submitting: create -> selectModel -> prompt -> openSession.
  // -------------------------------------------------------------------------

  function currentQuery() {
    return refs.input === null ? '' : String(refs.input.value || '').trim()
  }

  function onKeyDown(event) {
    if (event === null || event === undefined) return
    // IME: the Enter that commits a composition is not a submit.
    if (event.isComposing === true || event.keyCode === 229) return
    if (event.key !== 'Enter') return
    if (typeof event.preventDefault === 'function') event.preventDefault()
    submit()
  }

  async function submit() {
    if (state.busy) return
    const text = currentQuery()
    if (text === '') return
    state.busy = true
    setStatus('busy', t('starting'))
    try {
      const workspaceId = await resolveWorkspace(true)
      if (workspaceId === null) throw new Error(t('noWorkspace'))
      const sessions = deps && deps.sessions
      if (!sessions || typeof sessions.create !== 'function') throw new Error(t('createFailed'))
      const sessionId = await sessions.create({ workspaceId })
      // Hide the new row before the host list even refreshes: the promise this
      // feature makes is that the search never shows up in the sidebar.
      state.extraHidden.add(sessionId)
      applyHiddenCss()
      const picked = selectedRow()
      const remote = ctx && ctx.remote
      const session = remote && remote.session
      if (!session || typeof session.prompt !== 'function') throw new Error(t('promptFailed'))
      // Only pay for a selectModel write when the pick differs from the host default.
      if (picked !== null && selectionKey(picked) !== state.defaultKey && typeof session.selectModel === 'function') {
        const selected = await session.selectModel({ sessionId, provider: picked.provider, model: picked.model })
        if (selected !== null && selected !== undefined && selected.ok === false) throw new Error(t('createFailed'))
      }
      const prompted = await session.prompt({
        requestId: mintRequestId(),
        sessionId,
        mode: 'queue',
        content: [{ type: 'text', text }],
      })
      if (prompted !== null && prompted !== undefined && prompted.ok === false) throw new Error(t('promptFailed'))
      state.history = pushHistory(state.history, {
        sessionId,
        query: text,
        provider: picked === null ? undefined : picked.provider,
        model: picked === null ? undefined : picked.model,
        at: Date.now(),
      })
      persistHistory()
      if (refs.input !== null) refs.input.value = ''
      setStatus('', '')
      const uiWorkspace = typeof ctx.get === 'function' ? ctx.get('uiWorkspace') : undefined
      if (uiWorkspace && typeof uiWorkspace.openSession === 'function') uiWorkspace.openSession(sessionId)
    } catch (error) {
      setStatus('error', error && error.message ? String(error.message) : t('createFailed'))
    } finally {
      state.busy = false
      if (refs.input !== null && typeof refs.input.focus === 'function') refs.input.focus()
    }
  }

  // -------------------------------------------------------------------------
  // History popup (body child: the sidebar region clips overflowing content).
  // -------------------------------------------------------------------------

  /** Session ids the host still knows, or null when the list is not ready. */
  function liveSessionIds() {
    const snapshot = snapshotOf(deps && deps.sessions && deps.sessions.list)
    if (snapshot === null || !Array.isArray(snapshot.ids)) return null
    return new Set(snapshot.ids)
  }

  /** Drop entries whose session no longer exists (deleted/cleaned workspace). */
  function pruneHistory() {
    const live = liveSessionIds()
    if (live === null) return
    const next = state.history.filter((entry) => live.has(entry.sessionId))
    if (next.length === state.history.length) return
    state.history = next
    persistHistory()
  }

  let popup = null
  let popupCleanup = null

  function closeHistory() {
    if (popupCleanup !== null) {
      popupCleanup()
      popupCleanup = null
    }
    if (popup !== null && popup.parentNode !== null) popup.parentNode.removeChild(popup)
    popup = null
  }

  /** Anchor the fixed popup under the clock icon, clamped to the viewport. */
  function positionPopup(node, anchor) {
    const viewportWidth = window.innerWidth || 1200
    const width = 300
    let left = 12
    let top = 60
    if (anchor && typeof anchor.getBoundingClientRect === 'function') {
      const rect = anchor.getBoundingClientRect()
      left = rect && typeof rect.right === 'number' ? rect.right - width : left
      top = rect && typeof rect.bottom === 'number' ? rect.bottom + 6 : top
    }
    node.style.left = `${Math.max(8, Math.min(left, viewportWidth - width - 8))}px`
    node.style.top = `${Math.max(8, top)}px`
  }

  /** Open (or refresh) the history popup. */
  function openHistory() {
    if (popup !== null) {
      closeHistory()
      return
    }
    pruneHistory()
    const node = el('div', { 'data-dsh-ux-plus': MENU_VALUE, role: 'dialog', 'aria-label': t('historyTitle') })
    const head = el('div', { 'data-qs': 'menu-head' })
    const label = document.createElement('span')
    label.textContent = t('historyTitle')
    const clear = el('button', { 'data-qs': 'menu-clear', type: 'button' })
    clear.textContent = t('clear')
    clear.addEventListener('click', () => {
      state.history = []
      persistHistory()
      closeHistory()
    })
    head.appendChild(label)
    if (state.history.length > 0) head.appendChild(clear)
    node.appendChild(head)
    if (state.history.length === 0) {
      const empty = el('div', { 'data-qs': 'menu-empty' })
      empty.textContent = t('historyEmpty')
      node.appendChild(empty)
    } else {
      for (const entry of state.history) {
        const row = el('button', { 'data-qs': 'menu-row', type: 'button' })
        const query = el('span', { 'data-qs': 'menu-query' })
        query.textContent = entry.query
        const meta = el('span', { 'data-qs': 'menu-meta' })
        const bucket = ageBucket(entry.at, Date.now())
        const age = t(bucket.key, bucket.n === undefined ? undefined : { n: bucket.n })
        const modelName = entry.model === undefined ? '' : ` · ${entry.model}`
        meta.textContent = `${age}${modelName}`
        meta.setAttribute('title', new Date(entry.at).toISOString())
        row.appendChild(query)
        row.appendChild(meta)
        row.addEventListener('click', () => {
          closeHistory()
          const uiWorkspace = typeof ctx.get === 'function' ? ctx.get('uiWorkspace') : undefined
          if (uiWorkspace && typeof uiWorkspace.openSession === 'function') uiWorkspace.openSession(entry.sessionId)
        })
        node.appendChild(row)
      }
    }
    document.body.appendChild(node)
    popup = node
    positionPopup(node, refs.history)

    const onDocumentPointer = (event) => {
      if (popup === null) return
      let node2 = event && event.target
      while (node2 !== null && node2 !== undefined) {
        if (node2 === popup || node2 === refs.history) return
        node2 = node2.parentNode
      }
      closeHistory()
    }
    const onKey = (event) => {
      if (event && event.key === 'Escape') closeHistory()
    }
    const onResize = () => {
      if (popup !== null) positionPopup(popup, refs.history)
    }
    const offs = []
    if (typeof document.addEventListener === 'function') {
      document.addEventListener('pointerdown', onDocumentPointer, true)
      document.addEventListener('keydown', onKey, true)
      offs.push(() => document.removeEventListener('pointerdown', onDocumentPointer, true))
      offs.push(() => document.removeEventListener('keydown', onKey, true))
    }
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('resize', onResize)
      offs.push(() => window.removeEventListener('resize', onResize))
    }
    popupCleanup = () => {
      for (const off of offs) off()
    }
  }

  // -------------------------------------------------------------------------
  // Lifecycle.
  // -------------------------------------------------------------------------

  const observer = new MutationObserver(schedule)
  if (document.body !== null && document.body !== undefined) observer.observe(document.body, { childList: true, subtree: true })

  const subscriptions = []
  function subscribe(observable) {
    if (observable === null || observable === undefined || typeof observable.subscribe !== 'function') return
    subscriptions.push(observable.subscribe(schedule))
  }
  subscribe(deps && deps.workspaces && deps.workspaces.list)
  subscribe(deps && deps.sessions && deps.sessions.list)
  if (locale && typeof locale.subscribe === 'function') {
    subscriptions.push(locale.subscribe(() => {
      applyCopy()
      schedule()
    }))
  }

  // First paint: place immediately, then let the observers keep it alive.
  place()
  applyHiddenCss()
  loadModels()

  return function dispose() {
    if (disposed) return
    disposed = true
    closeHistory()
    observer.disconnect()
    if (pending !== null) {
      window.clearTimeout(pending)
      pending = null
    }
    for (const off of subscriptions) off()
    for (const off of disposers) off()
    if (refs.root !== null && refs.root.parentNode !== null) refs.root.parentNode.removeChild(refs.root)
    if (styleTag.parentNode !== null && styleTag.parentNode !== undefined) styleTag.parentNode.removeChild(styleTag)
    if (hideTag.parentNode !== null && hideTag.parentNode !== undefined) hideTag.parentNode.removeChild(hideTag)
    refs.root = null
    refs.input = null
    refs.select = null
    refs.history = null
    refs.status = null
  }
}

/** Host companion: the workspace directory is prepared by the package host half. */
export function attach() { return () => {} }
/** Host companion; no retained resources. */
export function dispose() {}
/** The feature record the switch engine and the settings tab consume. */
export const feature = { id, title, description, hasGear, settingsMessages, host: attach, client }
