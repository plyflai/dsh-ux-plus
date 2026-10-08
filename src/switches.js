/**
 * D5 switch engine of dsh-ux-plus: mounts/disposes the four feature clients
 * to match the `ux-plus` section value, immediately and reversibly.
 *
 * This module is deliberately React-free (only the four feature modules
 * are imported, which are themselves host-safe): it can be exercised in
 * plain Node tests without a browser. The browser half (src/client.js)
 * supplies React and the scopes; the row rendering stays there.
 *
 * Contract:
 *   mountFeatures(ctx, deps, uxScope) -> disposer
 *     - for every feature, the switch is ON when
 *       `ux-plus[<feature id>] !== false` (defaults to ON, all-true host
 *       schema) — mounting runs `feature.client(ctx, deps)`, unmounting
 *       calls the disposer it returned (DOM/listeners/styles removed
 *       immediately — off == never installed);
 *     - the subscription lives here (caller-owned, plugin-level fiber),
 *       not in any tab component, so it survives tab unmounts;
 *     - the returned disposer unmounts every mounted feature and stops the
 *       subscription.
 */
import { feature as conversationTypography } from '../features/conversation-typography/src/index.js'
import { feature as workspaceSessionMenu } from '../features/workspace-session-menu/src/index.js'
import { feature as workspaceRecencyOrder } from '../features/workspace-recency-order/src/index.js'
import { feature as toolAskQuestionExpanded } from '../features/tool-ask-question-expanded/src/index.js'

/** Feature modules in tab row order (frozen ids). */
export const FEATURES = [
  conversationTypography,
  workspaceSessionMenu,
  workspaceRecencyOrder,
  toolAskQuestionExpanded,
]

/**
 * @param {object} ctx - the client plugin context (features use `ctx.slots`).
 * @param {object} deps - { react, tweakScope, sessions, workspaces } (see
 *   src/client.js) — built once, shared by every feature client.
 * @param {object} uxScope - SettingsScope bound to the `ux-plus` namespace.
 * @returns {() => void} disposer.
 */
export function mountFeatures(ctx, deps, uxScope) {
  /** feature id -> active client disposer, for features currently on. */
  const mounted = new Map()

  /** Mount/unmount feature clients to match the ux-plus section value. */
  function sync() {
    const snapshot = uxScope.getSnapshot()
    const value = (snapshot && snapshot.value) || {}
    for (const feature of FEATURES) {
      const want = value[feature.id] !== false
      const current = mounted.get(feature.id)
      if (want && current === undefined) {
        mounted.set(feature.id, feature.client(ctx, deps))
      } else if (!want && current !== undefined) {
        current()
        mounted.delete(feature.id)
      }
    }
  }
  sync()
  const offSwitches = uxScope.subscribe(sync)

  return function dispose() {
    for (const disposeFeature of mounted.values()) disposeFeature()
    mounted.clear()
    offSwitches()
  }
}
