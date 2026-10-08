/** Session ID action mounted through the host's session-menu slot. */
export const id = 'workspace-session-menu'
export const title = 'Session ID menu'
export const description = 'Add a "Session ID" copy item to session row menus.'
export const hasGear = false
const NS = 'ux-plus-session-menu'

function legacyCopy(text) {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  area.remove()
  return ok
}

async function copySessionId(text) {
  try {
    await navigator.clipboard?.writeText(text)
  } catch (error) {
    // Local browser sessions may expose a writeText promise without committing.
  }
  return legacyCopy(text)
}

/** Mount a native menu row whose owner supplies the exact session ID. */
export function client(ctx, deps) {
  const React = deps.react
  const { MenuItemButton, IconCopyOutlineRegular } = deps.primitives
  const offLocale = ctx.effect(() => ctx.locale.register(NS, {
    zh: { copy: '会话ID', failed: '复制失败，请重试' },
    en: { copy: 'Session ID', failed: 'Copy failed; retry' },
  }))
  function SessionIdItem({ sessionId, useMenuOpenState, t }) {
    const [, setMenuOpen] = useMenuOpenState()
    const [failed, setFailed] = React.useState(false)
    return React.createElement(MenuItemButton, {
      icon: React.createElement(IconCopyOutlineRegular),
      onSelect: async () => {
        try {
          if (!(await copySessionId(sessionId))) throw new Error('clipboard write failed')
          setMenuOpen(false)
        } catch (error) {
          // Keep the row available when the browser denies clipboard access.
          setFailed(true)
        }
      },
    }, t(failed ? 'failed' : 'copy'))
  }
  const offSlot = ctx.slots.inject('sidebar.workspaces.session.menu.item', () => ctx.slots.register({
    name: 'sidebar.workspaces.session.menu.item',
    id: 'dsh-ux-plus.copy-session-id',
    order: 50,
    locale: NS,
  }, SessionIdItem))
  return () => { offSlot(); offLocale() }
}

/** Host companion; the menu action has no host resources. */
export function attach() { return () => {} }
/** Host companion; no retained resources. */
export function dispose() {}
export const feature = { id, title, description, hasGear, host: attach, client }
