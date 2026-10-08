/**
 * Browser half of dsh-ux-plus.
 *
 * P3: the `UX Plus` settings section (plan D2) is a real switch list — one
 * row per feature (frozen ids `conversation-typography`,
 * `workspace-session-menu`, `workspace-recency-order`,
 * `tool-ask-question-expanded`), each backed by a boolean key in the
 * `ux-plus` settings section registered by the host half (all default `true`).
 *
 * Switch behavior (plan D5) lives in `./switches.js` (the React-free
 * `mountFeatures` engine, unit-tested in plain Node); this entry adds the
 * browser surface:
 *   - the two `settingsScope.bind` calls at plugin level, so the switch
 *     subscription survives tab unmount (the tab only renders state);
 *   - the React seed (rider `deps.react`) and the `sessions`/`workspaces`
 *     services, declared in `inject` so the runtime parks this module until
 *     their providers are live (a missing provider keeps the module parked —
 *     the features degrade to a no-op rather than half-mounting);
 *   - the section: two-phase `slots.inject` → `slots.register` (host
 *     consumer shape, survives settings-shell remounts) with `label` as a
 *     thunk returning the constant brand name `UX Plus` (language-neutral,
 *     re-read on every projection).
 *
 * Reading/writing switches goes through the `settingsScope` service bound to
 * `ux-plus` — no localStorage of our own (plan §3.10 forbids a second
 * storage source).
 */
import * as React from 'react'
import { MenuItemButton, IconCopyOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { FEATURES, mountFeatures } from './switches.js'

/**
 * Cordis services this entry injects (hard dependencies). `sessions` and
 * `workspaces` are declared (not merely looked up): the client runtime gates
 * activation on the declared `inject` list — a module whose declared services
 * are not yet provided is parked until the providers supply them, which is
 * what guarantees `ctx.get('sessions')` / `ctx.get('workspaces')` below are
 * defined when `apply` runs. The legacy reference plugins make the same
 * declaration (`dsh-session-id-menu` lib/client.js:430,
 * `dsh-workspace-folder-order` client.js:178); without it this entry applied
 * too early (before the session/workspace providers mounted) and its two
 * DOM features silently no-op'd. Both names exist on the web-app surface.
 */
export const inject = ['slots', 'settingsScope', 'sessions', 'workspaces']

/**
 * Self-contained toggle switch built only on the `react` seed.
 *
 * The host's `Switch` primitive lives in `@deepseek-ai/dsh-client-ui-
 * primitives`, but a build-based bundle's client *source* must not import
 * bare `@deepseek-ai/*` specifiers: dsh-expert's `bundle.host.import` rule
 * scans every module except the resolved `./client` export (here
 * `lib/client.js`, the built artifact) — so the source `src/client.js` is
 * treated as a host module and may only import `node:` builtins and relative
 * files. (The sibling build-based bundle `dsh-auto-dev` follows the same
 * rule: its `src/client.js` imports `react` + relative files only.) This
 * component reproduces that primitive's exact contract — a `role="switch"`
 * button with `aria-checked` + `aria-label`, toggling via `onChange(!checked)`
 * on click — using only React, so the source stays audit-clean and the built
 * artifact still satisfies R10 (require ⊆ the nine seeds; only `react` here).
 */
function Switch(props) {
  const { checked, label, onChange } = props
  return React.createElement('button', {
    type: 'button',
    role: 'switch',
    'aria-checked': checked,
    'aria-label': label,
    onClick: () => onChange(!checked),
    style: {
      position: 'relative',
      width: 36,
      height: 20,
      borderRadius: 10,
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      flexShrink: 0,
      transition: 'background-color 120ms ease',
      backgroundColor: checked
        ? 'var(--dsw-accent-primary, #2f7cf6)'
        : 'var(--dsw-border-strong, #3a3f4b)',
    },
  },
    React.createElement('span', {
      style: {
        position: 'absolute',
        top: 2,
        left: checked ? 18 : 2,
        width: 16,
        height: 16,
        borderRadius: '50%',
        backgroundColor: '#ffffff',
        transition: 'left 120ms ease',
        display: 'block',
      },
    }),
  )
}

/**
 * Tab body: one row per feature — title + description on the left, switch on
 * the right. Rows are data-driven from the bound `ux-plus` section snapshot.
 */
function UxPlusTab(props) {
  const scope = props.scope
  const [snapshot, setSnapshot] = React.useState(() => scope.getSnapshot())
  // Plain effect subscription (deliberately not useSyncExternalStore: the row
  // does not depend on snapshot-object identity and re-renders read the fresh
  // snapshot — behaviorally the same as the host consumers' UES usage).
  React.useEffect(() => scope.subscribe(() => {
    setSnapshot(scope.getSnapshot())
  }), [scope])
  const value = (snapshot && snapshot.value) || {}
  return React.createElement('div', {
    'data-dsh-ux-plus': 'tab',
    // Invisible diagnostics: the bound snapshot's persistence mode (loopback
    // => 'host', otherwise 'memory' — see ui-settings persistence). Lets a
    // probe verify state memory across reloads is backed by host storage.
    'data-dsh-ux-plus-mode': (snapshot && snapshot.mode) || 'unknown',
    style: { display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 0' },
  },
    FEATURES.map((feature) => {
      const on = value[feature.id] !== false
      return React.createElement('div', {
        key: feature.id,
        'data-dsh-ux-plus-item': feature.id,
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '8px 4px' },
      },
        React.createElement('div', {
          style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
        },
          React.createElement('span', { style: { fontSize: 14, color: 'var(--dsw-alias-label-primary)' } }, feature.title),
          React.createElement('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, feature.description)),
        React.createElement(Switch, {
          checked: on,
          label: feature.title,
          onChange: (next) => {
            // A failed write must not surface as an unhandled promise
            // rejection (console PAGEERROR); the subscription re-renders the
            // row from the authoritative snapshot.
            Promise.resolve(scope.set(feature.id, next)).catch(() => {})
          },
        }),
      )
    }),
  )
}

/**
 * @param {object} ctx - the client plugin context.
 * @returns {() => void} disposer: retires the section registration, disposes
 *   every mounted feature client, and unsubscribes the switch sync.
 */
export function apply(ctx) {
  // Plugin-level binds: the bind lifecycle belongs to this plugin's fiber,
  // so the switch subscription survives tab unmounts.
  const uxScope = ctx.settingsScope.bind({ namespace: 'ux-plus' })
  const tweakScope = ctx.settingsScope.bind({ namespace: 'ui-tweak' })

  // deps built once, shared by every feature: React (seed) rides here, and
  // the session/workspace services are read via ctx.get — safe at apply time
  // because they are declared in `inject` above (activation waits for the
  // providers); if a surface ever lacks one, the dependent feature degrades
  // to a no-op instead of failing the tab.
  const deps = {
    react: React,
    primitives: { MenuItemButton, IconCopyOutlineRegular },
    tweakScope,
    sessions: ctx.get('sessions'),
    workspaces: ctx.get('workspaces'),
  }

  const offFeatures = mountFeatures(ctx, deps, uxScope)

  // The section: registered into the settings shell's outer-left column as
  // its own top-level entry (slot settings.section, plan W-7).
  const offSection = ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'ux-plus',
    order: 100,
    label: () => 'UX Plus',
    inject: () => ({ scope: uxScope }),
  }, UxPlusTab))

  return () => {
    offSection()
    offFeatures()
  }
}
