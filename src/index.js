/**
 * Host half of dsh-ux-plus: the `ux-plus` per-feature switch section plus the
 * four private feature modules under features/.
 *
 * Two switch layers: the outer on/off is the host's native Plugins card
 * (this package's single self-referential patch row); the inner per-feature
 * switches live in the ux-plus section registered here and projected by the
 * browser half (P3).
 *
 * Registered settings sections:
 *   - `ux-plus`  (here): one boolean per frozen feature id, all default true.
 *   - `ui-tweak` (via the conversation-typography feature's host, plan D7):
 *     the persistent font-size/width section, moved verbatim from the legacy
 *     dsh-ui-tweak host half.
 */
import { feature as conversationTypography } from '../features/conversation-typography/src/index.js'
import { feature as workspaceSessionMenu } from '../features/workspace-session-menu/src/index.js'
import { feature as workspaceRecencyOrder } from '../features/workspace-recency-order/src/index.js'
import { feature as toolAskQuestionExpanded } from '../features/tool-ask-question-expanded/src/index.js'

/** Stable Cordis plugin name. */
export const name = 'dsh-ux-plus'

/** Per-feature switch section (D3): one boolean per frozen feature id, all on by default. */
export const UX_PLUS_NAMESPACE = 'ux-plus'

/** The four feature modules in frozen order. */
export const FEATURES = [conversationTypography, workspaceSessionMenu, workspaceRecencyOrder, toolAskQuestionExpanded]

/**
 * Local callable schema for the ux-plus section: validate + normalize.
 * @param {Record<string, unknown> | undefined} value - raw section value.
 * @returns the normalized section (every key present, booleans, default true).
 */
export function UX_PLUS_SCHEMA(value) {
  const raw = value ?? {}
  const section = {}
  for (const feature of FEATURES) {
    const enabled = raw[feature.id]
    section[feature.id] = typeof enabled === 'boolean' ? enabled : true
  }
  return section
}

/** JSON-schema projection of UX_PLUS_SCHEMA for settings consumers. */
UX_PLUS_SCHEMA.toJSON = () => ({
  type: 'object',
  properties: Object.fromEntries(FEATURES.map((feature) => [feature.id, { type: 'boolean' }])),
})

/**
 * Install the package host half.
 * @param {object} ctx - the plugin context.
 * @returns {() => void} dispose every feature host (the ux-plus section is
 *  owned by the settings service's own effect, so no disposer is returned).
 */
export function apply(ctx) {
  const disposers = []
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(UX_PLUS_NAMESPACE, UX_PLUS_SCHEMA)
  })
  for (const feature of FEATURES) {
    if (feature.host !== undefined) disposers.push(feature.host(ctx))
  }
  return () => {
    for (const dispose of disposers) dispose()
  }
}
