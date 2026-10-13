/** Inherit-conversation action mounted through the host's session-menu slot. */
export const id = 'workspace-session-inherit'
export const title = 'Inherit conversation'
export const description = 'Add an "Inherit conversation" item that opens a fresh session with a chosen model to summarize the clicked conversation.'
export const hasGear = false
/** Settings-row copy, assembled into the `ux-plus-settings` namespace. */
export const settingsMessages = {
  zh: { title: '继承对话', description: '在会话菜单里选一个模型，当前工作区开一个新会话，让新模型读原会话的进度接着往下走。' },
  en: { title: 'Inherit conversation', description: 'Add an "Inherit conversation" item that opens a fresh session with a chosen model to summarize the clicked conversation.' },
}
const NS = 'ux-plus-session-inherit'

const MESSAGES = {
  zh: {
    inherit: '继承对话',
    choose: '选择继承模型',
    loading: '加载模型…',
    empty: '没有可用模型',
    loadFailed: '模型列表加载失败',
    starting: '正在创建会话…',
    startFailed: '创建失败，点击重试',
    prompt: '{sessionId}\n总结并继承这个对话的进度，越近轮次的对话所投放的注意力要越多',
  },
  en: {
    inherit: 'Inherit conversation',
    choose: 'Choose a model to inherit into',
    loading: 'Loading models…',
    empty: 'No models available',
    loadFailed: 'Failed to load models',
    starting: 'Creating session…',
    startFailed: 'Create failed; click to retry',
    prompt: "{sessionId}\nSummarize and inherit this conversation's progress, giving the most attention to the latest turns.",
  },
}

function mintRequestId() {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return String(c.randomUUID())
  return `ux-plus-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Workspace that owns the source session, or undefined to let the host choose. */
function findWorkspaceOf(deps, sessionId) {
  const list = deps.workspaces && deps.workspaces.list
  if (!list || typeof list.getSnapshot !== 'function') return undefined
  const snapshot = list.getSnapshot()
  if (!snapshot || snapshot.phase !== 'ready' || !Array.isArray(snapshot.items)) return undefined
  const hit = snapshot.items.find((item) => Array.isArray(item.sessionIds) && item.sessionIds.includes(sessionId))
  return hit ? hit.workspaceId : undefined
}

function buildPrompt(template, sessionId) {
  return String(template).replace('{sessionId}', String(sessionId))
}

/**
 * Create (or reuse on retry) a session in the source workspace, switch it to
 * the picked model, queue the inherit prompt and open it. `carry` survives a
 * failed attempt so a retry does not leave a second blank session behind.
 */
export async function startInheritance({ ctx, deps, sessionId, provider, model, promptText, carry = {} }) {
  if (carry.createdId === undefined) {
    const workspaceId = findWorkspaceOf(deps, sessionId)
    carry.createdId = await deps.sessions.create(workspaceId === undefined ? {} : { workspaceId })
  }
  const createdId = carry.createdId
  const session = ctx.remote.session
  const selected = await session.selectModel({ sessionId: createdId, provider, model })
  if (!selected || selected.ok === false) throw new Error('inherit: selectModel failed')
  const prompted = await session.prompt({
    requestId: mintRequestId(),
    sessionId: createdId,
    mode: 'queue',
    content: [{ type: 'text', text: promptText }],
  })
  if (!prompted || prompted.ok === false) throw new Error('inherit: prompt failed')
  const uiWorkspace = typeof ctx.get === 'function' ? ctx.get('uiWorkspace') : undefined
  if (uiWorkspace) uiWorkspace.openSession(createdId)
  return createdId
}

function el(tag, styles, attrs) {
  const node = document.createElement(tag)
  if (styles) for (const key of Object.keys(styles)) node.style[key] = styles[key]
  if (attrs) for (const key of Object.keys(attrs)) node.setAttribute(key, attrs[key])
  return node
}

function text(node, value) {
  node.textContent = value
  return node
}

/** Ancestor walk instead of Node.contains: works on the plain fake DOM too. */
function isInside(root, node) {
  for (let current = node; current; current = current.parentNode) {
    if (current === root) return true
  }
  return false
}

const PANEL_STYLE = {
  width: '260px',
  maxHeight: '320px',
  overflowY: 'auto',
  background: 'var(--dsw-alias-bg-layer-2, #24272e)',
  border: '1px solid var(--dsw-alias-border-l2, #3a3f4b)',
  borderRadius: '10px',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
  color: 'var(--dsw-alias-label-primary, #e8e8e8)',
  fontSize: '13px',
}
const HEADER_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  padding: '8px 10px',
  fontSize: '12px',
  color: 'var(--dsw-alias-label-secondary, #9aa0ab)',
  borderBottom: '1px solid var(--dsw-alias-border-l2, #3a3f4b)',
}
const ICON_BUTTON_STYLE = {
  background: 'transparent',
  border: 'none',
  color: 'inherit',
  fontSize: '14px',
  lineHeight: '1',
  padding: '2px 4px',
  cursor: 'pointer',
}
const BODY_STYLE = { padding: '10px', color: 'var(--dsw-alias-label-secondary, #9aa0ab)' }
const GROUP_STYLE = { padding: '6px 10px 2px', fontSize: '11px', color: 'var(--dsw-alias-label-secondary, #9aa0ab)' }
const ROW_STYLE = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  background: 'transparent',
  border: 'none',
  color: 'inherit',
  font: 'inherit',
  padding: '6px 10px',
  cursor: 'pointer',
}
const MODEL_DESC_STYLE = { fontSize: '11px', color: 'var(--dsw-alias-label-secondary, #9aa0ab)', marginTop: '1px' }
const ERROR_STYLE = { padding: '8px 10px', fontSize: '12px', color: '#e5534b', borderTop: '1px solid var(--dsw-alias-border-l2, #3a3f4b)' }

/**
 * Floating model picker anchored at the click point. Plain DOM (no React) so
 * it survives the host menu unmounting and stays testable without a renderer.
 */
export function openPicker(ctx, deps, { sessionId, t, anchor }) {
  const container = el('div', { position: 'fixed', zIndex: '999999' }, {
    'data-dsh-ux-plus': 'session-inherit',
    role: 'dialog',
    'aria-label': t('choose'),
  })
  const vw = (typeof window !== 'undefined' && window.innerWidth) || 1200
  const vh = (typeof window !== 'undefined' && window.innerHeight) || 800
  const x = anchor ? anchor.x : vw / 2
  const y = anchor ? anchor.y : vh / 2
  container.style.left = `${Math.max(8, Math.min(x, vw - 276))}px`
  container.style.top = `${Math.max(8, Math.min(y, vh - 60))}px`
  document.body.appendChild(container)

  const state = { phase: 'loading', groups: [], error: null, busy: false, carry: {} }
  let closed = false
  const offDoc = []
  function onDoc(type, fn) {
    document.addEventListener(type, fn, true)
    offDoc.push(() => document.removeEventListener(type, fn, true))
  }
  function close() {
    if (closed) return
    closed = true
    for (const off of offDoc) off()
    container.remove()
  }
  function choose(group, model) {
    if (state.busy) return
    state.busy = true
    state.error = null
    render()
    startInheritance({
      ctx,
      deps,
      sessionId,
      provider: group.id,
      model: model.id,
      promptText: buildPrompt(t('prompt'), sessionId),
      carry: state.carry,
    }).then(close, (error) => {
      // Keep the picker open so the row can retry the same created session.
      state.busy = false
      state.error = `${t('startFailed')}${error && error.message ? ` (${error.message})` : ''}`
      if (!closed) render()
    })
  }
  function render() {
    while (container.children.length > 0) container.removeChild(container.children[0])
    const panel = el('div', PANEL_STYLE)
    const header = el('div', HEADER_STYLE)
    header.appendChild(text(el('span'), t('choose')))
    const closeButton = el('button', ICON_BUTTON_STYLE, { type: 'button', 'aria-label': t('choose') })
    closeButton.textContent = '×'
    closeButton.onclick = close
    header.appendChild(closeButton)
    panel.appendChild(header)
    if (state.phase === 'loading') {
      panel.appendChild(text(el('div', BODY_STYLE), t('loading')))
    } else if (state.phase === 'error') {
      panel.appendChild(text(el('div', BODY_STYLE), t('loadFailed')))
    } else if (state.groups.length === 0) {
      panel.appendChild(text(el('div', BODY_STYLE), t('empty')))
    } else {
      for (const group of state.groups) {
        panel.appendChild(text(el('div', GROUP_STYLE), group.name || group.id))
        for (const model of group.models || []) {
          const row = el('button', ROW_STYLE, { type: 'button', 'data-model': `${group.id}/${model.id}` })
          row.appendChild(text(el('div'), model.name || model.id))
          if (model.description) row.appendChild(text(el('div', MODEL_DESC_STYLE), model.description))
          row.onclick = () => choose(group, model)
          row.onmouseenter = () => { row.style.background = 'var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12))' }
          row.onmouseleave = () => { row.style.background = 'transparent' }
          panel.appendChild(row)
        }
      }
    }
    if (state.error) panel.appendChild(text(el('div', ERROR_STYLE), state.error))
    else if (state.busy) panel.appendChild(text(el('div', BODY_STYLE), t('starting')))
    container.appendChild(panel)
  }
  async function load() {
    try {
      const result = await ctx.remote.session.modelCatalog()
      if (closed) return
      if (!result || result.ok === false) {
        state.phase = 'error'
      } else {
        state.groups = (result.value && result.value.groups) || []
        state.phase = 'ready'
      }
    } catch (error) {
      if (closed) return
      state.phase = 'error'
    }
    if (!closed) render()
  }
  onDoc('keydown', (event) => {
    if (event.key === 'Escape') close()
  })
  onDoc('pointerdown', (event) => {
    if (!isInside(container, event.target)) close()
  })
  render()
  load()
  return { close, container, state }
}

/** Mount a native menu row whose owner supplies the exact session ID. */
export function client(ctx, deps) {
  if (!deps?.react || !deps?.primitives) return () => {}
  const React = deps.react
  const { MenuItemButton, IconRightUpOutlineRegular } = deps.primitives
  const offLocale = ctx.effect(() => ctx.locale.register(NS, MESSAGES))
  let lastPointer
  const track = (event) => {
    lastPointer = { x: event.clientX, y: event.clientY }
  }
  document.addEventListener('pointerdown', track, true)
  let picker = null
  function InheritItem({ sessionId, useMenuOpenState, t }) {
    const [, setMenuOpen] = useMenuOpenState()
    return React.createElement(MenuItemButton, {
      icon: React.createElement(IconRightUpOutlineRegular),
      onSelect: () => {
        setMenuOpen(false)
        // One picker at a time; switching rows never stacks panels.
        picker?.close()
        picker = openPicker(ctx, deps, { sessionId, t, anchor: lastPointer })
      },
    }, t('inherit'))
  }
  const offSlot = ctx.slots.inject('sidebar.workspaces.session.menu.item', () => ctx.slots.register({
    name: 'sidebar.workspaces.session.menu.item',
    id: 'dsh-ux-plus.inherit-session',
    order: 60,
    locale: NS,
  }, InheritItem))
  return () => {
    document.removeEventListener('pointerdown', track, true)
    // Off == never installed: an open picker goes away with the feature.
    picker?.close()
    picker = null
    offSlot()
    offLocale()
  }
}

/** Host companion; the menu action has no host resources. */
export function attach() { return () => {} }
/** Host companion; no retained resources. */
export function dispose() {}
export const feature = { id, title, description, hasGear, settingsMessages, host: attach, client }
