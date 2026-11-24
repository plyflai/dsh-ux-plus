/**
 * dsh-ux-plus feature module: Conversation typography.
 *
 * Frozen feature id `conversation-typography`.
 *
 * D5 contract surface (consumed by the package host and client halves):
 *   feature.host(ctx)      -> disposer. Host-side installation: registers the
 *                             durable `ui-tweak` settings section, moved
 *                             verbatim (values unchanged) from the legacy
 *                             dsh-ui-tweak host half (plan D7).
 *   feature.client(ctx, deps) -> disposer. Client-side installation: the
 *                             plugin-owned <style> tag that overrides the
 *                             conversation font tokens and content width
 *                             (CSS injected from JS only — this package's
 *                             build chain has no CSS resource pipeline), the
 *                             ui-tweak settings subscription, and the
 *                             Settings→General typography row. The disposer
 *                             removes all of it immediately (off == never
 *                             installed).
 *   attach / dispose        - host-side installation/uninstallation aliases
 *                             (P1 test surface, retained).
 *
 * deps (client, supplied by the package client half):
 *   tweakScope - SettingsScope bound to `ui-tweak` (bind is owned by the
 *                plugin-level fiber, not this feature's mount).
 *   react      - the shell-seeded React module (seed `react` in the built
 *                artifact; the host half never supplies it).
 */

export const id = 'conversation-typography'
export const title = 'Conversation typography'
export const description = 'Conversation font size and width for the chat area.'
export const hasGear = false
/** Settings-row copy, assembled into the `ux-plus-settings` namespace. */
export const settingsMessages = {
  zh: { title: '对话字号与宽度', description: '选择舒服的字号和阅读宽度，长篇回答看得更轻松，不用放大整个界面。' },
  en: { title: 'Conversation typography', description: 'Conversation font size and width for the chat area.' },
}

/** Settings namespace owned by this feature (legacy dsh-ui-tweak, unchanged). */
export const UI_TWEAK_NAMESPACE = 'ui-tweak'

/** Accepted font-size presets; `l` is the current default look. */
export const FONT_SIZE_OPTIONS = ['xs', 's', 'm', 'l', 'xl']

/** Accepted conversation-width presets. */
export const CHAT_WIDTH_OPTIONS = ['s', 'm', 'l', 'xl']

/** Default font-size preset. */
export const DEFAULT_FONT_SIZE = 'l'

/** Default conversation-width preset. */
export const DEFAULT_CHAT_WIDTH = 'l'

function enumValue(value, options, fallback) {
  if (value === undefined || value === null) return fallback
  if (!options.includes(value)) {
    throw new TypeError(`ui-tweak: expected one of ${options.join('/')}, got ${String(value)}`)
  }
  return value
}

/**
 * Local callable settings schema: validates/normalizes the section and
 * exposes the serialized envelope the settings service describes to clients
 * (moved verbatim from the legacy dsh-ui-tweak host half).
 * @param {object | undefined} value - raw section value.
 * @returns {object} the resolved section.
 */
export function UI_TWEAK_SCHEMA(value) {
  return {
    fontSize: enumValue(value?.fontSize, FONT_SIZE_OPTIONS, DEFAULT_FONT_SIZE),
    chatWidth: enumValue(value?.chatWidth, CHAT_WIDTH_OPTIONS, DEFAULT_CHAT_WIDTH),
  }
}

/** JSON-schema projection of UI_TWEAK_SCHEMA for settings consumers. */
UI_TWEAK_SCHEMA.toJSON = () => ({
  type: 'object',
  properties: {
    fontSize: { type: 'string', enum: FONT_SIZE_OPTIONS },
    chatWidth: { type: 'string', enum: CHAT_WIDTH_OPTIONS },
  },
})

// ---------------------------------------------------------------------------
// Client-side behavior (ported from the legacy dsh-ui-tweak client.js).
// ---------------------------------------------------------------------------

/** Font presets: assistant (markdown) + user bubble font metrics. */
const FONT_SIZES = {
  xs: { assistantSize: 12, assistantLine: 20, bubbleSize: 12, bubbleLine: 18 },
  s: { assistantSize: 13, assistantLine: 22, bubbleSize: 13, bubbleLine: 20 },
  m: { assistantSize: 14, assistantLine: 24, bubbleSize: 14, bubbleLine: 22 },
  l: { assistantSize: 16, assistantLine: 28, bubbleSize: 16, bubbleLine: 24 },
  xl: { assistantSize: 18, assistantLine: 30, bubbleSize: 18, bubbleLine: 26 },
}

/** Content-width presets in px. */
const WIDTHS = { s: 680, m: 800, l: 920, xl: 1040 }

/**
 * ui-conversation's drag preference key: the shell publishes the stored value
 * as an INLINE `--dsh-chat-user-width` on the conversation root, which beats
 * any stylesheet rule. A width preset therefore only reaches the composer when
 * it owns this key too: otherwise a width the user dragged once keeps pinning
 * the transcript and the composer while the preset only styles the rest.
 */
export const CORE_WIDTH_KEY = 'dsh.conversation.contentWidth'

/** Last preset width this bundle published into {@link CORE_WIDTH_KEY}. */
export const APPLIED_WIDTH_KEY = 'dsh.ux-plus.typography.widthPreset'

/**
 * Hand one preset width to ui-conversation, once per preset change.
 *
 * Why not publish on every mount: a later drag writes the same key, and the
 * saved drag must survive reloads. Writing only when the preset itself moved
 * keeps both intents ordered (last deliberate choice wins) and repairs the
 * stale-drag case: a profile that still stores an old width has no marker yet,
 * so the first mount after this build writes the current preset once.
 * @param {number} width - preset width in px.
 * @returns {boolean} whether a write happened (false when already applied).
 */
export function publishCoreWidth(width, view) {
  const win = view === undefined ? (typeof window === 'undefined' ? null : window) : view
  if (win === null || win === undefined) return false
  let storage
  try {
    storage = win.localStorage
  } catch {
    return false
  }
  if (storage === null || storage === undefined) return false
  const marker = String(width)
  let current
  try {
    current = storage.getItem(APPLIED_WIDTH_KEY)
  } catch {
    return false
  }
  if (current === marker) return false
  try {
    storage.setItem(CORE_WIDTH_KEY, marker)
    storage.setItem(APPLIED_WIDTH_KEY, marker)
  } catch {
    return false
  }
  // Move the composer in this frame as well: the shell republishes from the
  // preference on its next layout pass, but the write above does not schedule
  // one, so mirror what ConversationWidthControls() would set inline.
  const body = win.document === undefined ? null : win.document.querySelector('[data-conversation-content]')
  const target = body === null || body === undefined ? null : body.parentElement
  if (target !== null && target !== undefined && typeof target.style.setProperty === 'function') {
    target.style.setProperty('--dsh-chat-user-width', width + 'px')
  }
  return true
}

/**
 * Build the override CSS text for one section value. Token ownership (plan
 * R8): `--dsh-chat-content-width` / `--dsh-chat-user-width` belong to
 * ui-conversation and the `--dsw-font-markdown-base*` family to ui-theme —
 * all of them are overridden ONLY in this package's own injected <style>,
 * never in host files.
 * @param {object | undefined} value - the ui-tweak section value.
 * @returns {string} the CSS text.
 */
function buildCss(value) {
  const fontSize = FONT_SIZES[value && value.fontSize ? value.fontSize : 'l'] || FONT_SIZES.l
  const width = WIDTHS[value && value.chatWidth ? value.chatWidth : 'l'] || WIDTHS.l
  // Content caps that core CSS pins to fixed px scale with the width
  // preset: the user bubble cap follows the 748px baseline ratio 0.70,
  // markdown table cells keep their 0.43 ratio, and trajectory turns
  // adopt the full content width.
  const bubbleMax = Math.round(width * 0.7)
  const tableCellMax = Math.round(width * 0.43)
  return [
    // The composer card derives from the conversation's own width axis: the
    // ui-conversation `.body` rule computes
    // `--dsh-composer-card-max-width: calc(var(--dsh-chat-content-width) + 32px)`
    // ON `.body`, so substituting only `--dsh-chat-content-width` on a
    // descendant (the scrollport) never widens the composer — its value was
    // already resolved one level up. Publishing the width through the
    // user-preference hook instead (`--dsh-chat-user-width`, consumed by the
    // `.body` declaration as `var(--dsh-chat-user-width, clamp(...))`) moves
    // the transcript AND the composer together, because both read the same
    // axis. Phase roots are ancestors of `.body`, so inheritance applies.
    '[data-phase="active"], [data-phase="hero"], [data-phase="settling"] {',
    '  --dsh-chat-user-width: ' + width + 'px;',
    '}',
    'div:has(> [data-conversation-scroll]) {',
    '  --dsh-chat-content-width: ' + width + 'px;',
    '  --dsw-font-markdown-base: ' + fontSize.assistantSize + 'px/' + fontSize.assistantLine + 'px var(--dsw-font-family);',
    '  --dsw-font-markdown-base-font-size: ' + fontSize.assistantSize + 'px;',
    '  --dsw-font-markdown-base-line-height: ' + fontSize.assistantLine + 'px;',
    '  --dsw-font-markdown-base-strong: 600 ' + fontSize.assistantSize + 'px/' + fontSize.assistantLine + 'px var(--dsw-font-family);',
    '  --dsw-font-markdown-base-strong-font-size: ' + fontSize.assistantSize + 'px;',
    '  --dsw-font-markdown-base-strong-line-height: ' + fontSize.assistantLine + 'px;',
    '  --dsw-font-markdown-base-italic: italic ' + fontSize.assistantSize + 'px/' + fontSize.assistantLine + 'px var(--dsw-font-family);',
    '  --dsw-font-markdown-base-italic-font-size: ' + fontSize.assistantSize + 'px;',
    '  --dsw-font-markdown-base-italic-line-height: ' + fontSize.assistantLine + 'px;',
    '  --dsw-font-markdown-base-strong-italic: italic 600 ' + fontSize.assistantSize + 'px/' + fontSize.assistantLine + 'px var(--dsw-font-family);',
    '  --dsw-font-markdown-base-strong-italic-font-size: ' + fontSize.assistantSize + 'px;',
    '  --dsw-font-markdown-base-strong-italic-line-height: ' + fontSize.assistantLine + 'px;',
    '}',
    '[data-conversation-scroll] {',
    '  --dsh-chat-content-width: ' + width + 'px;',
    '}',
    '[data-conversation-scroll] [data-time-hover-root] [class*="_bubble"] {',
    '  font-size: ' + fontSize.bubbleSize + 'px !important;',
    '  line-height: ' + fontSize.bubbleLine + 'px !important;',
    '}',
    '[data-conversation-scroll] [data-time-hover-root] > div:first-child {',
    '  max-width: min(' + bubbleMax + 'px, 82%);',
    '}',
    '[data-conversation-scroll] [class*="_tableScroll"] th,',
    '[data-conversation-scroll] [class*="_tableScroll"] td {',
    '  max-width: ' + tableCellMax + 'px;',
    '}',
    '[data-conversation-scroll] section[data-turn] {',
    '  max-width: ' + width + 'px;',
    '}',
    '[data-conversation-scroll] section[data-turn] > div {',
    '  max-width: ' + width + 'px;',
    '}',
  ].join('\n')
}

/** One segmented control (ported from the legacy row markup). */
function segmented(react, label, options, value, onSelect) {
  const { createElement } = react
  return createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
    createElement('span', { style: { fontSize: 14, color: 'var(--dsw-alias-label-primary)' } }, label),
    createElement('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
      options.map(function (optionId) {
        return createElement('button', {
          key: optionId,
          type: 'button',
          onClick: function () { onSelect(optionId) },
          style: {
            padding: '4px 12px',
            borderRadius: 8,
            border: '1px solid var(--dsw-alias-border-l2)',
            background: value === optionId ? 'var(--dsw-alias-bg-module-platform)' : 'transparent',
            color: 'var(--dsw-alias-label-primary)',
            cursor: 'pointer',
            fontSize: 13,
          },
        }, optionId === 'l' ? 'L（当前）' : optionId.toUpperCase())
      }),
    ),
  )
}

// ---------------------------------------------------------------------------
// D5 contract implementation.
// ---------------------------------------------------------------------------

/** Currently installed host-side disposer, or undefined while detached. */
let release = undefined

/**
 * Install the feature's host-side behavior (the ui-tweak section).
 * @param {object} ctx - the plugin context.
 * @returns {() => void} the disposer for this installation.
 */
export function attach(ctx) {
  dispose()
  // The ux-plus/ui-tweak sections are owned by the settings service's own
  // effect; the feature installation itself has no owned resources.
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
 * @param {object} ctx - the client plugin context (slots service).
 * @param {object} deps - { tweakScope, react } (see module header).
 * @returns {() => void} disposer: unsubscribes, unregisters the row, removes
 *   the <style> tag — immediate, no refresh, no residue.
 */
export function client(ctx, deps) {
  const scope = deps && deps.tweakScope
  const react = deps && deps.react
  if (!scope || !react) return () => {}

  let styleTag = null

  function applyCss(value) {
    if (styleTag === null) {
      styleTag = document.createElement('style')
      styleTag.dataset.plugin = 'dsh-ux-plus'
      document.head.appendChild(styleTag)
    }
    styleTag.textContent = buildCss(value)
  }

  function sync() {
    const snapshot = typeof scope.getSnapshot === 'function' ? scope.getSnapshot() : { value: undefined }
    const value = snapshot === null || snapshot === undefined ? undefined : snapshot.value
    applyCss(value)
    // The settings mirror arrives asynchronously: while it is still loading the
    // snapshot only carries the schema defaults, and publishing those would
    // overwrite a stored width with the default on every reload (observed as
    // 920 -> 1040 on one load). Publish only once the value is settled.
    if (snapshot === null || snapshot === undefined || snapshot.status === undefined || snapshot.status === 'ready') {
      publishCoreWidth(WIDTHS[value && value.chatWidth ? value.chatWidth : DEFAULT_CHAT_WIDTH] || WIDTHS[DEFAULT_CHAT_WIDTH])
    }
  }
  sync()
  const offScope = scope.subscribe(sync)

  /** Settings→General row component (ported from the legacy UiTweakRow). */
  function TypographySettingsRow(props) {
    const { useState, useEffect, createElement } = react
    const rowScope = props.scope
    const [value, setValue] = useState(() => {
      const snapshot = rowScope.getSnapshot()
      return (snapshot && snapshot.value) || { fontSize: DEFAULT_FONT_SIZE, chatWidth: DEFAULT_CHAT_WIDTH }
    })
    // Plain effect subscription: no useSyncExternalStore, so the row does not
    // depend on snapshot-object identity; re-render reads the fresh snapshot.
    useEffect(() => rowScope.subscribe(() => {
      const snapshot = rowScope.getSnapshot()
      setValue((snapshot && snapshot.value) || { fontSize: DEFAULT_FONT_SIZE, chatWidth: DEFAULT_CHAT_WIDTH })
    }), [rowScope])

    function pick(field, preset) {
      // Fire-and-forget with a swallowed rejection: a failed write must not
      // surface as an unhandled promise rejection (console PAGEERROR); the
      // subscription re-renders the row from the authoritative snapshot.
      Promise.resolve(rowScope.set(field, preset)).catch(() => {})
      applyCss({ ...value, [field]: preset })
    }

    return createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 0', borderBottom: '1px solid var(--dsw-alias-border-l2)' } },
      createElement('div', { style: { fontSize: 14, fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, '对话区'),
      segmented(react, '字号', FONT_SIZE_OPTIONS, value.fontSize, function (preset) { pick('fontSize', preset) }),
      segmented(react, '宽度', CHAT_WIDTH_OPTIONS, value.chatWidth, function (preset) { pick('chatWidth', preset) }),
    )
  }

  // Two-phase row contribution (plan §3.9 / host consumer shape): waits for
  // the settings.general.item declaration, re-installs on section remounts,
  // and retires with the returned disposer when this feature mounts off.
  const offInject = ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'ui-tweak',
    order: 20,
    inject: () => ({ scope }),
  }, TypographySettingsRow))

  return function releaseClient() {
    offInject()
    offScope()
    if (styleTag !== null) {
      if (styleTag.parentNode !== null) styleTag.parentNode.removeChild(styleTag)
      styleTag = null
    }
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
