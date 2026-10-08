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
 * Build the override CSS text for one section value. Token ownership (plan
 * R8): `--dsh-chat-content-width` belongs to ui-conversation and the
 * `--dsw-font-markdown-base*` family to ui-theme — both are overridden ONLY
 * in this package's own injected <style>, never in host files.
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
    applyCss(scope.getSnapshot().value)
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
  host: (ctx) => attach(ctx),
  client: (ctx, deps) => client(ctx, deps),
}
