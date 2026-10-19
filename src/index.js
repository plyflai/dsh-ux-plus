/**
 * Host half of dsh-ux-plus: the `ux-plus` per-feature switch section plus the
 * seven private feature modules under features/.
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
 *
 * Side effect of `apply`: it creates the quick search box's private workspace
 * directory (`<home>/.dsh-ux-plus/search`), because the host only registers a
 * workspace whose directory already exists and the browser cannot create one.
 */
import { feature as conversationTypography } from '../features/conversation-typography/src/index.js'
import { feature as workspaceSessionMenu } from '../features/workspace-session-menu/src/index.js'
import { feature as workspaceRecencyOrder } from '../features/workspace-recency-order/src/index.js'
import { feature as toolAskQuestionExpanded } from '../features/tool-ask-question-expanded/src/index.js'
import { feature as workspaceSessionInherit } from '../features/workspace-session-inherit/src/index.js'
import { feature as attentionFavicon } from '../features/attention-favicon/src/index.js'
import { feature as workspaceQuickSearch, searchWorkspacePath } from '../features/workspace-quick-search/src/index.js'
import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import z from '@deepseek-ai/schemastery'

/** Stable Cordis plugin name. */
export const name = 'dsh-ux-plus'

/** Per-feature switch section (D3): one boolean per frozen feature id, all on by default. */
export const UX_PLUS_NAMESPACE = 'ux-plus'

/** The seven feature modules in frozen order (new ids are appended, never reordered). */
export const FEATURES = [conversationTypography, workspaceSessionMenu, workspaceRecencyOrder, toolAskQuestionExpanded, workspaceSessionInherit, attentionFavicon, workspaceQuickSearch]


/** Host configuration for the per-feature UX Plus switches. */
export const Config = z.object({
  'conversation-typography': z.boolean().default(true),
  'workspace-session-menu': z.boolean().default(true),
  'workspace-recency-order': z.boolean().default(true),
  'tool-ask-question-expanded': z.boolean().default(true),
  'workspace-session-inherit': z.boolean().default(true),
  'attention-favicon': z.boolean().default(true),
  'workspace-quick-search': z.boolean().default(true),
}).volatile()

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
 * Severity-safe logger call: logging must never take the plugin down, and the
 * context logger shape differs between hosts.
 * @param {object} ctx - the plugin context.
 * @param {string} message - the line to log.
 */
function warn(ctx, message) {
  try {
    const logger = ctx && ctx.logger
    if (logger === undefined || logger === null) return
    const scoped = typeof logger === 'function' ? logger('dsh-ux-plus') : logger
    if (scoped && typeof scoped.warn === 'function') scoped.warn(message)
  } catch {
    /* a failed log line is not a failure of the plugin */
  }
}

/**
 * Create the private quick-search workspace directory before the browser half
 * can try to register it: `WorkspaceRegistry.create` rejects a path that is not
 * already a directory (`packages/workspace/workspace/src/index.ts:241`), and a
 * browser cannot create one.
 *
 * The SAME helper that computes the browser's path (`searchWorkspacePath`, from
 * the host home) computes this one, so the two halves can never disagree. It
 * is idempotent: an existing directory is left alone, and a failure is logged
 * rather than thrown so a read-only home only disables the quick search box.
 * @param {object} ctx - the plugin context.
 * @returns {() => void} disposer (nothing is retained).
 */
function prepareQuickSearchDirectory(ctx) {
  const directory = searchWorkspacePath(homedir())
  if (directory === null) {
    warn(ctx, 'quick search box: no home directory, its workspace cannot be prepared')
    return () => {}
  }
  try {
    mkdirSync(directory, { recursive: true })
  } catch (error) {
    warn(ctx, `quick search box: cannot prepare "${directory}": ${error instanceof Error ? error.message : String(error)}`)
  }
  return () => {}
}

/**
 * Install the package host half.
 * @param {object} ctx - the plugin context.
 * @returns {() => void} dispose every feature host (the ux-plus section is
 *  owned by the settings service's own effect, so no disposer is returned).
 */
export function apply(ctx) {
  const disposers = []
  for (const feature of FEATURES) {
    if (feature.host !== undefined) disposers.push(feature.host(ctx))
  }
  disposers.push(prepareQuickSearchDirectory(ctx))
  return () => {
    for (const dispose of disposers) dispose()
  }
}
