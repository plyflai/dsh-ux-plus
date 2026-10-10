/**
 * tool-ask-question-expanded: default-expand the host's EXISTING
 * `ask_user_question` tool rows in the chat flow once the question has
 * settled, so the question and its answer are visible without a second
 * click (plan 2026-09-19-dsh-ux-plus-tool-ask-question-expanded, v6).
 *
 * Mechanism (plan §5 W-1..W-8 + W-13):
 *   - W-1 target: `[data-conversation-scroll] [data-tool="ask_user_question"]`
 *     rows — the chat flow only.
 *   - W-2 settled gate: rows whose `data-state` is still `running` (the
 *     question is open, raw input visible) are left alone; settling flips
 *     `data-state`, which the observer's `attributeFilter` turns into the
 *     scan that catches the row.
 *   - W-3 action: within a settled row, the host's own
 *     `[data-disclosure-row]` child is clicked ONCE, and only while it is
 *     collapsed (`aria-expanded === 'false'`) and expandable
 *     (`data-expandable` present). The click bubbles to the host React root,
 *     which toggles the row itself — we never write the attribute.
 *   - W-4: a WeakSet records every disclosure row we expanded; the same
 *     element is never clicked again (a manual collapse persists until the
 *     element is gone), a new element (row reappears) is expanded again.
 *   - W-5 zero injection (revised by W-14): no attribute add/change, no node
 *     insert into the conversation, no localStorage/settings/store writes —
 *     dispatching the host's own click is still the entire behavioral
 *     surface. The one DOM addition is a single plugin-owned `<style>` in
 *     `<head>` (W-14); it adds no element to the document body and touches no
 *     host node.
 *   - W-6 off == never installed: the disposer reverse-collapses exactly
 *     the rows we expanded (still connected and currently open), removes the
 *     plugin-owned `<style>`, then disconnects the observer and clears the
 *     pending scan.
 *   - W-7: one `MutationObserver` on `document.body`
 *     (`childList` + `subtree` + `attributeFilter: ['data-state']`)
 *     coalesced into a single 0-delay scan; the click itself only changes
 *     `aria-expanded` (not watched) so it re-triggers nothing.
 *   - W-13 focus preservation: a row click steals focus (the row is
 *     `role="button"`); if the previous active element is a text field
 *     (input/textarea/contenteditable) still in the tree, focus goes back.
 *   - Group layer: NOT done (W-11) — the host's compact-mode "N tool calls"
 *     group stays host-native (its collapse markup is untouched by design).
 *   - W-14 notice-blue block: a settled ask row gets a notice-blue wash and
 *     white/white-tone text instead of the host's monochrome tool-row chrome
 *     (see `accentCss`). Tokens only — `--dsw-alias-button-info-fill` is the
 *     design system's info/notice blue and the two label tiers flip with the
 *     theme, so the block reads white-on-blue in dark and near-black on a
 *     light-blue wash in light. Every ask row gets the wash — the question
 *     waiting for an answer included; only the text recolor is skipped on
 *     running/preparing rows so the host shimmer keeps animating.
 */

export const id = 'tool-ask-question-expanded'
export const title = 'Ask question expanded'
export const description = 'Reveal the question and its answer in the chat flow by default.'
export const hasGear = false

/** Chat-flow ask-question rows (W-1): the host's own tool card rows. */
const ROW_SELECTOR = '[data-conversation-scroll] [data-tool="ask_user_question"]'

/** The host disclosure row inside an ask row (W-3): the element we click. */
const DISCLOSURE_SELECTOR = '[data-disclosure-row]'

/**
 * Text scope (W-14): settled ask rows only. A running row keeps the host's
 * shimmer (its text color is animated through a pseudo-element, and forcing a
 * color there breaks the sweep). The wash itself is NOT gated this way — the
 * question waiting for an answer should be highlighted too, it just keeps its
 * own animated text colors while it is live.
 */
const ROW_CSS_SCOPE = ROW_SELECTOR +
  ':not([data-state="running"]):not([data-state="preparing"])'

/**
 * The notice-blue treatment (W-14). The host renders an ask row in the
 * monochrome tool-row chrome — title, summary and the question text all sit on
 * the dimmed label tiers, so a settled question reads as one gray smear.
 *
 * Tokens, not colors: `--dsw-alias-button-info-fill` is the design system's
 * info/notice blue (design-platform.css:201/316, per theme), and the two label
 * tiers are white in the dark theme and near-black in the light one, so the
 * block stays legible in both instead of hard-coding white-on-blue.
 *
 * The card's own classes are CSS-module hashes, so the rules reach them
 * through `[class*="_name"]` — the same handle the typography feature uses for
 * the host bubble. Attribute selectors also out-specify the host's single-class
 * rules, including its `:hover` recolors, without `!important`.
 *
 * @returns {string} the CSS text for the plugin-owned <style>.
 */
function accentCss() {
  return [
    // The block: a notice-blue wash instead of the invisible tool row. Every
    // ask row gets it, the live question included.
    ROW_SELECTOR + ' {',
    '  --ux-plus-notice: var(--dsw-alias-button-info-fill);',
    '  background: color-mix(in srgb, var(--ux-plus-notice) 20%, transparent);',
    '  border-radius: var(--dsw-radius-lg);',
    '  padding: 4px 8px;',
    '}',
    // The transcript card rides the wash instead of dropping a gray plate on it.
    ROW_SELECTOR + ' [class*="_card"] {',
    '  background: color-mix(in srgb, var(--ux-plus-notice) 14%, transparent);',
    '  border-color: color-mix(in srgb, var(--ux-plus-notice) 45%, transparent);',
    '}',
    // White: the question, its answer, and the row's own title and summary.
    ROW_CSS_SCOPE + ' :is([class*="_title"], [class*="_summary"], [class*="_question"],',
    '  [class*="_answer"], [class*="_verdict"], [class*="_unansweredQuestion"]) {',
    '  color: var(--dsw-alias-label-primary);',
    '}',
    // White tone: the secondary tier — the skipped placeholder, chevron, dot.
    ROW_CSS_SCOPE + ' :is([class*="_skipped"], [class*="_chevron"]) {',
    '  color: var(--dsw-alias-label-primary-dimmed);',
    '}',
    ROW_CSS_SCOPE + ' [class*="_sep"] {',
    '  background: var(--dsw-alias-label-primary-dimmed);',
    '}',
  ].join('\n')
}

/**
 * Install the notice-blue treatment (W-14) as one plugin-owned <style>.
 * @returns {{ remove: () => void } | null} the release handle, or null when
 *   there is no <head> to attach to.
 */
function installAccent() {
  if (document.head === null || document.head === undefined) return null
  const tag = document.createElement('style')
  tag.setAttribute('data-plugin', 'dsh-ux-plus')
  tag.setAttribute('data-feature', id)
  tag.textContent = accentCss()
  document.head.appendChild(tag)
  return {
    remove() {
      if (tag.parentNode !== null && tag.parentNode !== undefined) tag.parentNode.removeChild(tag)
    },
  }
}

/**
 * Mount the client half.
 * @param {object} ctx - the client plugin context (unused: pure DOM feature).
 * @param {object} deps - shared feature deps (unused: no service needed).
 * @returns {() => void} disposer (W-6 reverse-collapse + teardown).
 */
export function client(ctx, deps) {
  let disposed = false
  let timer = null
  /** W-4: disclosure rows we expanded — each element is clicked at most once. */
  const expandedByUs = new WeakSet()
  const observer = new MutationObserver(schedule)
  // W-14: the one DOM addition of this feature — a plugin-owned <style>.
  const accent = installAccent()

  /** Coalesce mutation pressure into one 0-delay scan (W-7). */
  function schedule() {
    if (disposed || timer !== null) return
    timer = window.setTimeout(() => {
      timer = null
      if (disposed) return
      scan()
    }, 0)
  }

  /**
   * One native click on the disclosure row (W-3), preserving focus (W-13):
   * the row click steals focus, so a previous text field gets it back.
   * @param {object} disclosure - the disclosure row element.
   */
  function expandOne(disclosure) {
    const previous = document.activeElement
    disclosure.click()
    const next = document.activeElement
    if (
      previous !== null &&
      next !== previous &&
      previous.isConnected &&
      (previous.tagName === 'INPUT' || previous.tagName === 'TEXTAREA' || previous.isContentEditable === true)
    ) {
      previous.focus()
    }
  }

  /** One pass over the chat flow: expand every settled collapsed row once. */
  function scan() {
    for (const row of document.querySelectorAll(ROW_SELECTOR)) {
      // W-2 settled gate: a running row (open question, raw input visible)
      // is never clicked; its settle flips `data-state` and the observer
      // schedules the scan that catches it.
      if (row.getAttribute('data-state') === 'running') continue
      const disclosure = row.querySelector(DISCLOSURE_SELECTOR)
      if (disclosure === null) continue
      // W-4: rows we already expanded are skipped before any other check.
      if (expandedByUs.has(disclosure)) continue
      // W-3: only a collapsed, expandable disclosure row is clicked — not
      // the row root, not the Inspect button.
      if (disclosure.getAttribute('aria-expanded') !== 'false') continue
      if (!disclosure.hasAttribute('data-expandable')) continue
      expandedByUs.add(disclosure)
      expandOne(disclosure)
    }
  }

  if (document.body !== null) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state'],
    })
  }
  scan()

  return function cleanup() {
    disposed = true
    // W-6: off == never installed — the plugin-owned <style> goes with it.
    if (accent !== null) accent.remove()
    if (timer !== null) window.clearTimeout(timer)
    observer.disconnect()
    // W-6: off == never installed — reverse-collapse the rows we expanded
    // (detached rows skipped via isConnected; rows the user already
    // collapsed stay closed).
    for (const row of document.querySelectorAll(ROW_SELECTOR)) {
      const disclosure = row.querySelector(DISCLOSURE_SELECTOR)
      if (disclosure === null || !expandedByUs.has(disclosure)) continue
      if (!disclosure.isConnected) continue
      if (disclosure.getAttribute('aria-expanded') !== 'true') continue
      expandOne(disclosure)
    }
  }
}

// ---------------------------------------------------------------------------
// D5 contract implementation.
// ---------------------------------------------------------------------------

/** Currently installed host-side disposer, or undefined while detached. */
let release = undefined

/**
 * Install the feature's host-side behavior (none for this feature).
 * @param {object} ctx - the plugin context.
 * @returns {() => void} the disposer for this installation.
 */
export function attach(ctx) {
  dispose()
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

/** D5 contract view consumed by the package host and client halves. */
export const feature = {
  id,
  title,
  description,
  hasGear,
  host: (ctx) => attach(ctx),
  client: (ctx, deps) => client(ctx, deps),
}
