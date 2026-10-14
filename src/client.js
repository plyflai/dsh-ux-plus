/**
 * Browser half of dsh-ux-plus.
 *
 * P3: the `UX Plus` settings section (plan D2) is a real switch list — one
 * row per feature (frozen ids `conversation-typography`,
 * `workspace-session-menu`, `workspace-recency-order`,
 * `tool-ask-question-expanded`, `workspace-session-inherit`), each backed by
 * a boolean key in the
 * `ux-plus` settings section registered by the host half (all default `true`).
 *
 * Switch behavior (plan D5) lives in `./switches.js` (the React-free
 * `mountFeatures` engine, unit-tested in plain Node); this entry adds the
 * browser surface:
 *   - the two `configForms.get` calls at plugin level, so the switch
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
 * Reading/writing switches goes through the `configForms` service bound to
 * the host entries `ux-plus` and `ui-tweak`.
 */
import * as React from 'react'
import { MenuItemButton, IconCopyOutlineRegular, IconRightUpOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { FEATURES, SETTINGS_NAMESPACE, buildSettingsMessages, mountFeatures } from './switches.js'

/** Settings-tab locale dictionary (`<id>.title` / `<id>.description` per lang). */
const SETTINGS_MESSAGES = buildSettingsMessages(FEATURES)

/**
 * Resolve a settings-row string through the slot-injected `t` seat, falling
 * back to the feature's English constant when `t` is absent (tests, older
 * shells) or the key is missing.
 */
function text(t, key, fallback) {
  if (typeof t !== 'function') return fallback
  const value = t(key)
  return typeof value === 'string' && value !== key ? value : fallback
}

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
 * `remote` + `remote.session` are additionally declared for the
 * inherit-conversation feature (model catalog / selectModel / prompt remotes;
 * same declaration as the host's own `ui-open-in-app` client,
 * packages/client/ui-open-in-app/src/client/index.ts:39).
 * `uiSession` is declared for the workspace-recency-order feature's liveness
 * layer: its `sessionStatus` observable is the only source of the sidebar's
 * three status indicators (running / pending interaction / unread completion,
 * packages/client/ui-session/src/client/index.ts:292-298). Declaring it means
 * activation also waits for the ui-session provider; the feature still
 * degrades gracefully if the service or its observable is missing.
 */
export const inject = ['slots', 'locale', 'configForms', 'sessions', 'workspaces', 'uiSession', 'remote', 'remote.session']

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
  // `t` is the standard locale seat the slot renderer injects because the
  // registration declares `locale: SETTINGS_NAMESPACE`; it re-derives on
  // active-locale change, so rows follow the DSH language live.
  const t = props.t
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
      const title = text(t, `${feature.id}.title`, feature.title)
      return React.createElement('div', {
        key: feature.id,
        'data-dsh-ux-plus-item': feature.id,
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '8px 4px' },
      },
        React.createElement('div', {
          style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
        },
          React.createElement('span', { style: { fontSize: 14, color: 'var(--dsw-alias-label-primary)' } }, title),
          React.createElement('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, text(t, `${feature.id}.description`, feature.description))),
        React.createElement(Switch, {
          checked: on,
          label: title,
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
  const uxScope = ctx.configForms.get('ux-plus')
  const tweakScope = ctx.configForms.get('ui-tweak')

  // deps built once, shared by every feature: React (seed) rides here, and
  // the session/workspace services are read via ctx.get — safe at apply time
  // because they are declared in `inject` above (activation waits for the
  // providers); if a surface ever lacks one, the dependent feature degrades
  // to a no-op instead of failing the tab.
  const deps = {
    react: React,
    primitives: { MenuItemButton, IconCopyOutlineRegular, IconRightUpOutlineRegular },
    tweakScope,
    sessions: ctx.get('sessions'),
    workspaces: ctx.get('workspaces'),
    // Liveness (sidebar status indicators) for the recency-order feature: the
    // ui-session service exposes `sessionStatus` (a read-only observable of
    // {running, pendingInteraction, completionUnread} per session). Missing on
    // an older surface ⇒ the feature's liveness layer stays off and the
    // ordering degrades to the recency-only behavior it had before.
    uiSession: ctx.get('uiSession'),
  }

  const offFeatures = mountFeatures(ctx, deps, uxScope)

  // Settings-tab copy: one namespace assembled from every feature's
  // `settingsMessages`, registered on the plugin fiber (survives tab
  // unmounts). The slot registration below declares it as `locale`, so the
  // renderer injects a live `t` into UxPlusTab.
  const offLocale = ctx.effect(() => ctx.locale.register(SETTINGS_NAMESPACE, SETTINGS_MESSAGES))

  // The section: registered into the settings shell's outer-left column as
  // its own top-level entry (slot settings.section, plan W-7).
  const offSection = ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'ux-plus',
    order: 100,
    label: () => 'UX Plus',
    locale: SETTINGS_NAMESPACE,
    inject: () => ({ scope: uxScope }),
  }, UxPlusTab))

  return () => {
    offSection()
    offLocale()
    offFeatures()
  }
}
