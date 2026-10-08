/**
 * W-1..W-8 + W-13 unit tests for the tool-ask-question-expanded feature
 * (plan 2026-09-19-dsh-ux-plus-tool-ask-question-expanded, v6 — plain Node,
 * no browser, no React). The fake DOM supplies exactly what the feature
 * touches: document.body, document.querySelectorAll (the ask-row selector
 * only), document.activeElement, window.setTimeout/clearTimeout,
 * window.localStorage, and a passive MutationObserver.
 *
 * The host's reaction to our click (the DisclosureRow toggling its own
 * aria-expanded) is simulated test-side via hostToggle; the feature itself
 * only ever dispatches click() — every assertion below is about click
 * counts, observer wiring, timers, and the W-5 zero-injection guarantees.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

const root = new URL('..', import.meta.url)
const FEATURE = new URL(root + 'features/tool-ask-question-expanded/src/index.js')

// ---------------------------------------------------------------------------
// Fakes (shape trimmed from tests/recency-order.test.mjs, extended with
// click()/focus()/activeElement for W-3/W-13 and with the ask-row selector).
// ---------------------------------------------------------------------------

function makeEnv() {
  const env = {
    askRows: [],
    timers: [],
    moInstances: [],
    elementCreations: 0,
    allElements: [],
    GLOBAL_KEYS: ['document', 'window', 'MutationObserver'],
    previousGlobals: {},
  }

  function makeElement(tag) {
    env.elementCreations += 1
    const el = {
      tagName: String(tag || 'div').toUpperCase(),
      style: {},
      textContent: '',
      children: [],
      parentNode: null,
      attributes: {},
      clicks: 0,
      focusCalls: 0,
      isContentEditable: false,
    }
    env.allElements.push(el)
    el.appendChild = (child) => {
      if (child.parentNode !== null) child.parentNode.removeChild(child)
      child.parentNode = el
      el.children.push(child)
      return child
    }
    el.removeChild = (child) => {
      const i = el.children.indexOf(child)
      if (i !== -1) el.children.splice(i, 1)
      child.parentNode = null
      return child
    }
    el.remove = () => {
      if (el.parentNode !== null) el.parentNode.removeChild(el)
    }
    // Real-DOM isConnected semantics: in the document iff the parent chain
    // reaches document.body (a node whose parent was detached is NOT).
    Object.defineProperty(el, 'isConnected', {
      get: () => {
        let node = el
        while (node.parentNode !== null) node = node.parentNode
        return node === env.document.body
      },
    })
    el.setAttribute = (k, v) => {
      el.attributes[k] = String(v)
    }
    el.removeAttribute = (k) => {
      delete el.attributes[k]
    }
    el.getAttribute = (k) => (k in el.attributes ? el.attributes[k] : null)
    el.hasAttribute = (k) => k in el.attributes
    el.querySelector = (sel) => {
      if (sel !== '[data-disclosure-row]') return null
      return el.children.find((c) => c.attributes['data-disclosure-row'] !== undefined) || null
    }
    // Host behavior the feature relies on (W-13 premise): a click on a
    // focusable row (role="button") steals focus to the clicked element.
    el.click = () => {
      el.clicks += 1
      env.document.activeElement = el
    }
    el.focus = () => {
      el.focusCalls += 1
      env.document.activeElement = el
    }
    return el
  }

  env.document = {
    body: makeElement('body'),
    activeElement: null,
    createElement: (tag) => makeElement(tag),
    querySelectorAll: (sel) => (sel.includes('ask_user_question') ? env.askRows : []),
  }
  env.window = {
    localStorage: {
      store: new Map(),
      getItem(k) {
        return this.store.has(k) ? this.store.get(k) : null
      },
      setItem(k, v) {
        this.store.set(k, String(v))
      },
      removeItem(k) {
        this.store.delete(k)
      },
    },
    setTimeout: (fn) => {
      env.timers.push({ fn })
      return env.timers.length - 1
    },
    clearTimeout: (id) => {
      if (env.timers[id] !== undefined) env.timers[id] = null
    },
  }
  env.MutationObserver = class {
    constructor(cb) {
      this.cb = cb
      this.observed = []
      this.disconnected = false
      env.moInstances.push(this)
    }
    observe(target, options) {
      this.observed.push({ target, options })
    }
    disconnect() {
      this.disconnected = true
    }
  }
  env.makeElement = makeElement

  env.flushTimers = () => {
    const due = env.timers.filter(Boolean)
    env.timers.length = 0
    for (const t of due) t.fn()
    return due.length
  }

  /** Deliver synthetic mutation records to every live observer. */
  env.fireObservers = () => {
    for (const mo of env.moInstances) {
      if (!mo.disconnected) mo.cb([], mo)
    }
  }

  env.installGlobals = () => {
    for (const key of env.GLOBAL_KEYS) {
      env.previousGlobals[key] = globalThis[key]
      globalThis[key] = env[key]
    }
  }
  env.uninstallGlobals = () => {
    for (const key of env.GLOBAL_KEYS) {
      if (env.previousGlobals[key] === undefined) delete globalThis[key]
      else globalThis[key] = env.previousGlobals[key]
    }
  }
  return env
}

/**
 * One host-shaped ask row: the data-tool row, its data-disclosure-row child
 * (role="button", aria-expanded, data-expandable), and the Inspect button.
 */
function makeAskRow(env, { state = 'done', expanded = 'false', expandable = true } = {}) {
  const row = env.makeElement('div')
  row.setAttribute('data-tool', 'ask_user_question')
  if (state !== null) row.setAttribute('data-state', state)
  const disclosure = env.makeElement('div')
  disclosure.setAttribute('data-disclosure-row', '')
  disclosure.setAttribute('role', 'button')
  if (expanded !== null) disclosure.setAttribute('aria-expanded', expanded)
  if (expandable) disclosure.setAttribute('data-expandable', '')
  row.appendChild(disclosure)
  const inspect = env.makeElement('button')
  inspect.setAttribute('data-inspect-button', '')
  row.appendChild(inspect)
  env.askRows.push(row)
  env.document.body.appendChild(row)
  return { row, disclosure, inspect }
}

/** Host reaction (test-side only): the row toggles its own aria-expanded. */
function hostToggle(disclosure, value) {
  disclosure.setAttribute('aria-expanded', value)
}

// ---------------------------------------------------------------------------
// Contract (W-9 strings) — the host half is a pure no-op.
// ---------------------------------------------------------------------------

test('contract: frozen strings, hasGear=false, idempotent no-op host half', async () => {
  const env = makeEnv()
  env.installGlobals()
  try {
    const f = await import(FEATURE)
    assert.equal(f.id, 'tool-ask-question-expanded')
    assert.equal(f.title, 'Ask question expanded')
    assert.equal(f.description, 'Reveal the question and its answer in the chat flow by default.')
    assert.equal(f.hasGear, false)
    assert.equal(f.feature.id, f.id)
    assert.equal(typeof f.feature.client, 'function')
    assert.equal(f.feature.hasGear, false)
    const release = f.feature.host({})
    assert.equal(typeof release, 'function')
    release()
    release()
    f.dispose()
    f.dispose()
    assert.equal(env.moInstances.length, 0, 'the host half installs no host resources')
  } finally {
    env.uninstallGlobals()
  }
})

// ---------------------------------------------------------------------------
// W-2 settled gate — the running→settled attribute flip is the trigger.
// ---------------------------------------------------------------------------

test('W-2: a running row is not opened; its data-state settle flip catches it', async () => {
  const env = makeEnv()
  env.installGlobals()
  try {
    const running = makeAskRow(env, { state: 'running', expanded: 'false', expandable: true })
    const settled = makeAskRow(env, { state: 'done', expanded: 'false', expandable: true })
    const bare = makeAskRow(env, { state: null, expanded: 'false', expandable: true })
    const f = await import(FEATURE)
    f.client(undefined, undefined)
    assert.equal(running.disclosure.clicks, 0, 'W-2: a running row must not be opened')
    assert.equal(settled.disclosure.clicks, 1, 'a settled row is expanded on the mount scan')
    assert.equal(bare.disclosure.clicks, 1, 'a row without data-state counts as settled')
    // The observer watches data-state attribute mutations (W-7 filter).
    assert.equal(env.moInstances.length, 1)
    const [observation] = env.moInstances[0].observed
    assert.equal(observation.target, env.document.body)
    assert.deepEqual(observation.options, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state'],
    })
    // Settling is an attribute-only change (no childList mutation).
    running.row.setAttribute('data-state', 'done')
    env.fireObservers()
    assert.equal(env.timers.length, 1, 'the mutation is coalesced into one scan (W-7)')
    env.flushTimers()
    assert.equal(running.disclosure.clicks, 1, 'the row is expanded exactly when it settles')
    env.fireObservers()
    env.flushTimers()
    assert.equal(running.disclosure.clicks, 1, 'the settle scan never double-clicks')
  } finally {
    env.uninstallGlobals()
  }
})

// ---------------------------------------------------------------------------
// W-3 action target — only the collapsed, expandable disclosure row.
// ---------------------------------------------------------------------------

test('W-3: only the collapsed, expandable data-disclosure-row child is clicked', async () => {
  const env = makeEnv()
  env.installGlobals()
  try {
    const hit = makeAskRow(env, { state: 'done', expanded: 'false', expandable: true })
    const open = makeAskRow(env, { state: 'done', expanded: 'true', expandable: true })
    const notExpandable = makeAskRow(env, { state: 'done', expanded: 'false', expandable: false })
    const noAria = makeAskRow(env, { state: 'done', expanded: null, expandable: true })
    const noDisclosure = env.makeElement('div')
    noDisclosure.setAttribute('data-tool', 'ask_user_question')
    noDisclosure.setAttribute('data-state', 'done')
    env.askRows.push(noDisclosure)
    env.document.body.appendChild(noDisclosure)
    const f = await import(FEATURE)
    f.client(undefined, undefined)
    assert.equal(hit.disclosure.clicks, 1)
    assert.equal(hit.row.clicks, 0, 'never the row root')
    assert.equal(hit.inspect.clicks, 0, 'never the Inspect button')
    assert.equal(open.disclosure.clicks, 0, 'an already-open row is untouched')
    assert.equal(notExpandable.disclosure.clicks, 0, 'a non-expandable row is untouched')
    assert.equal(noAria.disclosure.clicks, 0, 'a row without aria-expanded is untouched')
  } finally {
    env.uninstallGlobals()
  }
})

// ---------------------------------------------------------------------------
// W-4 one-shot semantics — WeakSet per element.
// ---------------------------------------------------------------------------

test('W-4: an expanded element is never re-clicked; a new row element is expanded', async () => {
  const env = makeEnv()
  env.installGlobals()
  try {
    const first = makeAskRow(env, { state: 'done', expanded: 'false', expandable: true })
    const f = await import(FEATURE)
    const dispose = f.client(undefined, undefined)
    assert.equal(first.disclosure.clicks, 1)
    // Host opens the row; a re-scan must not re-click.
    hostToggle(first.disclosure, 'true')
    env.fireObservers()
    env.flushTimers()
    assert.equal(first.disclosure.clicks, 1, 're-scanning an open row we expanded changes nothing')
    // The user manually collapses; we must not re-open it.
    hostToggle(first.disclosure, 'false')
    env.fireObservers()
    env.flushTimers()
    assert.equal(first.disclosure.clicks, 1, 'a manual collapse persists (WeakSet)')
    // The row disappears and reappears as a NEW element: expand again.
    first.row.remove()
    env.askRows = env.askRows.filter((r) => r !== first.row)
    const second = makeAskRow(env, { state: 'done', expanded: 'false', expandable: true })
    env.fireObservers()
    env.flushTimers()
    assert.equal(second.disclosure.clicks, 1, 'a new row element is expanded once')
    dispose()
  } finally {
    env.uninstallGlobals()
  }
})

// ---------------------------------------------------------------------------
// W-5 zero injection — the click is the entire surface.
// ---------------------------------------------------------------------------

test('W-5: zero injection — no styles, no attributes, no nodes, no storage', async () => {
  const env = makeEnv()
  env.installGlobals()
  try {
    const hit = makeAskRow(env, { state: 'done', expanded: 'false', expandable: true })
    const f = await import(FEATURE)
    // A Map (not Object.fromEntries): object keys survive by identity.
    const snapshot = {
      attrs: new Map(env.allElements.map((el) => [el, { ...el.attributes }])),
      children: env.document.body.children.length,
      created: env.elementCreations,
      stored: env.window.localStorage.store.size,
    }
    f.client(undefined, undefined)
    assert.equal(hit.disclosure.clicks, 1)
    env.fireObservers()
    env.flushTimers()
    for (const el of env.allElements) {
      assert.deepEqual(el.attributes, snapshot.attrs.get(el), `the feature wrote attributes on <${el.tagName.toLowerCase()}>`)
    }
    assert.equal(env.document.body.children.length, snapshot.children, 'no node inserted or removed')
    assert.equal(env.elementCreations, snapshot.created, 'no element created')
    assert.equal(env.window.localStorage.store.size, 0, 'no localStorage writes')
  } finally {
    env.uninstallGlobals()
  }
})

// ---------------------------------------------------------------------------
// W-6 off == never installed — the disposer reverse-collapses.
// ---------------------------------------------------------------------------

test('W-6: dispose reverse-collapses exactly the rows we expanded', async () => {
  const env = makeEnv()
  env.installGlobals()
  try {
    const ours = makeAskRow(env, { state: 'done', expanded: 'false', expandable: true })
    // theirs was already open at mount: the W-3 gate means we never clicked
    // it, so it is not in our WeakSet at dispose time.
    const theirs = makeAskRow(env, { state: 'done', expanded: 'true', expandable: true })
    const collapsedByUser = makeAskRow(env, { state: 'done', expanded: 'false', expandable: true })
    const detached = makeAskRow(env, { state: 'done', expanded: 'false', expandable: true })
    const f = await import(FEATURE)
    const dispose = f.client(undefined, undefined)
    assert.equal(ours.disclosure.clicks, 1)
    assert.equal(theirs.disclosure.clicks, 0, 'a row open at mount is never ours')
    assert.equal(collapsedByUser.disclosure.clicks, 1)
    assert.equal(detached.disclosure.clicks, 1)
    // Host/user state at dispose time.
    hostToggle(ours.disclosure, 'true') // we opened it, host keeps it open
    hostToggle(collapsedByUser.disclosure, 'false') // we opened it, user collapsed it
    detached.row.remove() // we opened it, the host removed the row
    // NOTE: the fake querySelectorAll still lists the detached row, so this
    // is what exercises the product's isConnected guard (in a real DOM the
    // row simply would not be in the list).
    dispose()
    assert.equal(ours.disclosure.clicks, 2, 'we reverse-collapse what we expanded')
    assert.equal(theirs.disclosure.clicks, 0, 'an open row we never expanded is untouched')
    assert.equal(collapsedByUser.disclosure.clicks, 1, 'rows already closed stay closed')
    assert.equal(detached.disclosure.clicks, 1, 'detached rows are skipped via isConnected')
    assert.equal(env.moInstances[0].disconnected, true, 'the observer is disconnected')
    assert.equal(env.timers.length, 0, 'no scan is left pending')
    env.fireObservers()
    env.flushTimers()
    assert.equal(ours.disclosure.clicks, 2, 'nothing happens after dispose')
  } finally {
    env.uninstallGlobals()
  }
})

// ---------------------------------------------------------------------------
// W-7 coalesced scan — one timer no matter how many mutations arrive.
// ---------------------------------------------------------------------------

test('W-7: back-to-back mutations coalesce into one scan', async () => {
  const env = makeEnv()
  env.installGlobals()
  try {
    const a = makeAskRow(env, { state: 'done', expanded: 'false', expandable: true })
    const b = makeAskRow(env, { state: 'done', expanded: 'false', expandable: true })
    const c = makeAskRow(env, { state: 'done', expanded: 'false', expandable: true })
    const f = await import(FEATURE)
    f.client(undefined, undefined)
    assert.equal(a.disclosure.clicks + b.disclosure.clicks + c.disclosure.clicks, 3, 'the mount scan expands every settled row')
    // The host flips data-state three times before the scan runs.
    a.row.setAttribute('data-state', 'running')
    env.fireObservers()
    b.row.setAttribute('data-state', 'running')
    env.fireObservers()
    c.row.setAttribute('data-state', 'running')
    env.fireObservers()
    assert.equal(env.timers.length, 1, 'three mutations -> one coalesced scan')
    env.flushTimers()
    assert.equal(a.disclosure.clicks, 1, 're-scanned rows are not re-clicked (WeakSet)')
    assert.equal(b.disclosure.clicks, 1)
    assert.equal(c.disclosure.clicks, 1)
    assert.equal(env.timers.length, 0, 'the scan drained the timer')
  } finally {
    env.uninstallGlobals()
  }
})

// ---------------------------------------------------------------------------
// W-13 focus preservation — a row click must not strand the composer.
// ---------------------------------------------------------------------------

test('W-13: focus goes back to a previous textarea', async () => {
  const env = makeEnv()
  env.installGlobals()
  try {
    const hit = makeAskRow(env, { state: 'done', expanded: 'false', expandable: true })
    const composer = env.makeElement('textarea')
    env.document.body.appendChild(composer)
    env.document.activeElement = composer
    const f = await import(FEATURE)
    f.client(undefined, undefined)
    assert.equal(hit.disclosure.clicks, 1)
    assert.equal(composer.focusCalls, 1, 'the previous textarea gets focus back')
    assert.equal(env.document.activeElement, composer, 'focus is restored to the composer')
  } finally {
    env.uninstallGlobals()
  }
})

test('W-13: a contenteditable field also gets focus back; no active element is safe', async () => {
  const env = makeEnv()
  env.installGlobals()
  try {
    const hit = makeAskRow(env, { state: 'done', expanded: 'false', expandable: true })
    const editor = env.makeElement('div')
    editor.isContentEditable = true
    env.document.body.appendChild(editor)
    env.document.activeElement = editor
    const f = await import(FEATURE)
    f.client(undefined, undefined)
    assert.equal(editor.focusCalls, 1, 'a contenteditable field gets focus back')
    assert.equal(env.document.activeElement, editor)
  } finally {
    env.uninstallGlobals()
  }

  const env2 = makeEnv()
  env2.installGlobals()
  try {
    const hit = makeAskRow(env2, { state: 'done', expanded: 'false', expandable: true })
    env2.document.activeElement = null
    const f = await import(FEATURE)
    f.client(undefined, undefined)
    assert.equal(hit.disclosure.clicks, 1, 'no active element: the expand still happens')
    assert.equal(env2.document.activeElement, hit.disclosure, 'the steal stands, no crash')
  } finally {
    env2.uninstallGlobals()
  }
})

test('W-13: a non-field active element is left where the click put it', async () => {
  const env = makeEnv()
  env.installGlobals()
  try {
    const hit = makeAskRow(env, { state: 'done', expanded: 'false', expandable: true })
    const other = env.makeElement('div')
    env.document.body.appendChild(other)
    env.document.activeElement = other
    const f = await import(FEATURE)
    f.client(undefined, undefined)
    assert.equal(hit.disclosure.clicks, 1)
    assert.equal(other.focusCalls, 0, 'a plain div is not a text field')
    assert.equal(env.document.activeElement, hit.disclosure, 'the steal stands (plan RR12 residual)')
  } finally {
    env.uninstallGlobals()
  }
})
