# <img src="docs/images/icon.svg" width="44" height="44" alt="" align="top"> dsh-ux-plus

Small interface improvements for the DSH Web chat. Each feature has its own switch under **Settings → UX Plus** and applies instantly.

[![CI](https://github.com/plyflai/dsh-ux-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/plyflai/dsh-ux-plus/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

**English** · [简体中文](./README.zh-CN.md)

**Targets the Web UI of [DeepSeek Harness 0.2.1-rc.1](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.1-rc.1).**

## New in 0.5.0 — the "create a workspace first" step is gone

You just want to look something up, and the price used to be: create a workspace, then invent a name for it. That step is gone. A search box now lives under **Automated tasks** in the sidebar: type, press Enter, and you get exactly the session UI you already know — except this session files itself into a hidden workspace instead of your sidebar.

- **three clicks saved**: no new workspace, no name to invent, no directory to pick — just start asking or searching
- magnifier on the left, a tiny model picker on the right (host default model unless you pick one)
- the clock icon on the right is history: your last 50 searches, one click back to that session
- the hidden workspace is `.dsh-ux-plus/search` under your home directory, created on first use and never shown in the sidebar

![The search box sitting above the workspace list](docs/images/quick-search.png)

[Details →](#workspace-quick-search)

## New in 0.4.0 — the tab tells you what's happening

The whale favicon keeps its shape and carries three signals while you sit on another tab:

- whale **breathes** — something is computing
- **green whale** — a run finished and you haven't opened it
- **blinking orange dot** — something waits for your click

The signals are independent and compose freely; plain whale when nothing is up. [Details →](#attention-favicon)

## Features

Each row lists the full interaction detail: how it triggers, what you see, what happens when something fails, and what switching it off leaves behind.

| Feature | Interaction detail | Preview |
| --- | --- | --- |
| **Workspace quick search** | • Lives one row under 【自动化任务】/Automations, above the workspace list; it steps aside when the sidebar collapses to the rail<br>• One-line field with the magnifier on the left; the empty state is the faint italic hint “Just search, no workspace”<br>• Enter opens an ordinary Session right away (identical UI to any Session) whose first message is what you typed; an IME candidate Enter never submits<br>• Model: the chip icon on the right opens the model list (current pick ticked) with “provider · model” on every row; leave it alone to use the host default<br>• The pick is remembered: a non-default model puts a dot on the chip and is kept on this machine<br>• History: the clock icon opens the last 50 searches (title + age); a click returns to that Session, one row per Session, with a Clear action<br>• Bubble (far right): one click returns to the newest search Session, finished or still running; a dot blinks softly inside while a search is running, and it stays dim and inert when there is none yet<br>• Storage: every search Session lives in the hidden workspace `.dsh-ux-plus/search` (created on first use) and never appears in the workspace list or the Session tree<br>• Failures (directory not ready, Session not created, no navigation service) are reported in one red line under the box and the typed text is kept<br>• Switching the feature off removes the hiding rule too — those Sessions reappear in the sidebar, nothing is lost | <img src="docs/images/quick-search.png" width="200" alt="The search box above the workspace list"> |
| **Attention favicon** | • The icon stays the host whale: it only breathes, turns green or gains one orange dot, and the three can show at once<br>• Breathing (3.6 s cycle, 35% opacity floor) = a Session is computing; a Session waiting on your click is not computing<br>• A fully green whale = a Session finished unread; it uses the very same flag as the workspace list dot (list green ⟺ whale green)<br>• The orange dot bottom-right (450 ms blink, on for 2 of 3 frames) = something awaits your click: approval, question, plan confirmation<br>• None of the three: the host icon is handed back untouched and the plugin holds no icon slot<br>• A background tab throttled to about one tick per second still keeps the alert visible; returning to the tab restarts the cycle from a visible frame<br>• Subagent Sessions and blank Sessions never light the tab (no crying wolf)<br>• Both themes are preserved; if the icon cannot be fetched or the whale cannot be tinted, the whole feature quietly does nothing | — |
| **Workspace recency order** | • One rule: last activity. Sessions that are running, or were touched within 24 hours, form the Active block; everything else is dormant<br>• The Active block is one continuous pale-green band: 26px compact rows, 13px titles, 10px age; dormant rows sit at half opacity<br>• A 7px dot replaces the status word: orange breathing (waiting on you), blue ring spinner (running), solid green (finished unread); no status, no dot<br>• A workspace header carries at most three dots for the attention the Active block hides, with the count in the tooltip (e.g. “2 waiting · 1 unread”)<br>• History is hidden as a block: no bespoke fold row — the host's own Expand N more sessions button is pinned directly under the Active block; one click opens everything and sends the button back to the bottom, Collapse folds it again<br>• Workspaces move up too: a workspace with a running or waiting member counts as “now” and sorts above the rest<br>• Idle collapse: a workspace untouched for 24 hours folds itself once per page load; workspaces with running or waiting Sessions are skipped<br>• Age on hover for every row (just now / N min / N h / yesterday / N d), moved aside while that row's menu is open<br>• It never fights the pointer: reordering pauses while the pointer is in the list or a menu is open, while your own actions (view options, expand button) repaint on the click frame<br>• Motion: moved rows glide briefly (off under `prefers-reduced-motion`); a minute-level heartbeat lets rows fall asleep as they cross the 24-hour line<br>• Visual order only: the host's sort and grouping settings, pins, archive state and data are never touched | <img src="docs/images/recency-folded.png" width="200" alt="The Active block and the pinned expand button"> |
| **Conversation typography** | • Where: Settings → General → Conversation (not the UX Plus page)<br>• Five font sizes: XS / S / M / L (current) / XL = 12 / 13 / 14 / 16 / 18px with 20 / 22 / 24 / 28 / 30 line heights<br>• Four widths: S / M / L / XL = 680 / 800 / 920 / 1040px, capping the conversation content only<br>• A click applies immediately — no refresh, no new Session<br>• Conversation content only: bubble text and bubble max width, table cell width scale with it; the rest of the UI is untouched<br>• Stored in the local settings, so the next visit keeps the same choice | <img src="docs/images/typography.png" width="300" alt="Conversation rendering"> |
| **Session ID copy** | • Lives in every Session row's three-dot menu, ahead of the native Pin and Rename items<br>• One click puts the Session ID on the clipboard and closes the menu<br>• If the browser denies the clipboard, that item turns into “Copy failed; retry” in place — the menu stays open for another try<br>• Use it to resume with `--session`, or to find a Session in the logs | <img src="docs/images/session-menu.png" width="200" alt="The Session row menu"> |
| **Inherit conversation** | • Lives in the Session row menu, right after Session ID<br>• The model picker opens at the pointer (never off-screen), grouped by provider, showing each model's description when the host has one<br>• Picker states: loading / no models / failed to load each have their own copy — it is never blank<br>• On a pick: create a Session in the same workspace → switch it to that model → queue the inherit prompt (with the source Session ID, weighing the latest turns most) → open it<br>• The source Session is untouched; both can be read side by side<br>• On failure the picker stays open with the reason in red, and picking the same model again retries on the Session already created instead of leaving a second blank one<br>• Close with Esc, an outside click, or the × in the corner; only one picker is ever open | <img src="docs/images/inherit-picker.png" width="200" alt="The inherit model picker"> |
| **Ask question expanded** | • Scope: only `ask_user_question` cards in the conversation flow<br>• Timing: as soon as the question settles it opens by itself, showing the question and the answer together; a question still waiting on you is left closed<br>• Clicked once: a manual collapse afterwards stays collapsed; only a new question opens again<br>• Looks: a settled question card is the one pale blue layer — the answer in the primary text colour, the original question a size smaller and grey<br>• Never steals typing: focus is handed back if it was in a text field before the expand<br>• Switching the feature off re-collapses what it opened and removes the observer and its style<br>• Grouping untouched: the host's compact “N tool calls” group stays exactly as the host renders it | — |

## Feature details

### Workspace quick search

A search box sits permanently under **Automated tasks** in the sidebar and drops the "create a workspace first" step: ask or search right away — type, press Enter, and an ordinary session opens (same UI as any other session) while filing itself into a hidden workspace, out of your sidebar.

![The box sits above the workspace list: magnifier on the left, model, history and session-bubble icons on the right, one faint italic hint when empty](docs/images/quick-search.png)

| Element | Behaviour |
| --- | --- |
| Search box (magnifier on the left) | Enter searches straight away (the field is single-line); an Enter that ends an IME composition never submits by accident |
| Model picker | A small chip icon on the right: click it for the model list (the current pick is ticked). Leave it alone to use the host default; a non-default pick puts a dot on the chip and is remembered locally |
| Session bubble (far right) | One click returns to the newest search session, finished or not. While a search is running a dot lights inside the bubble and breathes — never a number. Dim and inert while there is no search session yet |
| Clock icon (right) | Opens history: the last 50 searches, one click reopens that session, one button clears the list |
| Sidebar | Search sessions **never show up** — they all live in the hidden workspace |

- The hidden workspace is `.dsh-ux-plus/search` in your home directory, created on first use. It is not in the workspace list and has no group in the session tree, yet the history popup still takes you back to any old search session.
- The box only appears while the sidebar is expanded; in the collapsed rail it steps aside.
- Turning the switch off removes the hidden-workspace rule too — those sessions simply reappear in the sidebar, nothing is lost.

Type a question in that box, the icons on the right stay put, Enter opens an ordinary session:

![A question typed into the box, the three icons unchanged](docs/images/quick-search-typed.png)

While a search is running, a dot lights up inside the right-hand bubble; a click returns to the newest search session — finished or not.

### Attention favicon

The tab icon stays the host's whale. This feature only tints it, breathes it, or adds one dot — and only while there is something to say.

| Tab signal | Meaning |
| --- | --- |
| whale **breathes** (slow fade) | any counted session is computing |
| **green whale** | a finished session has not been opened — exactly when the workspace list shows its green dot |
| **blinking orange dot** | something is waiting for your click (approval, question, plan review) |
| plain whale | nothing is up; the host's icon is restored untouched |

The breath has a 35% opacity floor and the blink is asymmetric, so a background tab throttled to ~1 tick/s still shows the alert on whatever frame it freezes on; returning to the tab restarts the cycle from the visible frame. Subagent and blank sessions never light the tab. Both host themes (light / dark) are kept; if the host's whale cannot be re-tinted, the feature quietly does nothing. Switching off leaves no residue.

### Workspace recency order

Most recent first — the project you were just in stays at the top. Visual order only; the host's sort settings and data are untouched.

**Active block.** Running, or touched within 24 hours: one continuous green-backed band of compact 26px rows, each led by its status dot — orange breathing (awaiting you), blue spinner (running), solid green (finished, unread). A workspace header carries up to three pure-colour dots while that attention is hidden from view; the counts stay in its tooltip.

**History stays hidden.** No fold bar of its own — the host's own "Expand N more sessions" button is the one control, pinned directly below the Active block. One press opens the section: every row appears, the button returns to the list's native bottom, and the section reads exactly like the host's own expanded list. 收起 folds it back.

<table><tr>
<td width="50%"><img src="docs/images/recency-folded.png" width="100%" alt="Folded: Active block, button pinned below it"></td>
<td width="50%"><img src="docs/images/recency-expanded.png" width="100%" alt="Expanded: all rows visible, button at the bottom"></td>
</tr></table>

**Idle tidying.** A workspace with no activity for over 24 hours collapses once when the page opens, and shows its age on hover (now / Nm / Nh / Nd). Workspaces holding a running or awaiting session are never auto-collapsed.

Reordering pauses while your pointer is in the list or a menu is open — and pierces on your own actions: view-option changes and the expand button restyle on the click's own frame. Rows glide (FLIP, off under `prefers-reduced-motion`), zones re-check on a timer so rows fall asleep across the 24-hour line, and a section that briefly sees rows it cannot explain keeps its last consistent look instead of flickering.

### Conversation typography

The chat area defaults to 14px. Bump the font size and narrow the reading width under **Settings → General → Chat area** — conversation content only, never the whole interface.

### Session menu: Session ID & Inherit conversation

Each session row's overflow menu gains two items, before the native Pin / Rename entries:

- **Session ID** — copies the ID to the clipboard, for `--session` resumes and log digging.
- **Inherit conversation** — a model picker opens at the click position. Pick a model and the plugin creates a new session in the same workspace, switches it to that model, posts an inheritance prompt ("summarize and carry on, weighting the latest turns"), and jumps there. The original session is untouched. Good for finishing a long session on a pricier model, or continuing elsewhere when a provider rate-limits.

### Ask question expanded

When an `ask_user_question` card finishes, the question and its answer stay expanded — reviewing a decision costs one less click.

### Settings

**Settings → UX Plus**: six independent switches, on by default, applied instantly.

![UX Plus settings](docs/images/settings.png)

## Install

Requires Node.js ≥ 22, pnpm on PATH, and a DSH Web profile.

```bash
dsh plugin --profile <name> add github:plyflai/dsh-ux-plus
```

Restart the profile afterwards. Toggle each feature under **Settings → UX Plus** (on by default, instant). Conversation font size and width live under **Settings → General → Chat area**.

## Compatibility

- Web UI (browser) only — not the terminal TUI.
- Every feature mounts on public host extension points; no host source is modified, and each feature can be switched off individually.
- Host upgrades may shift internal DOM and slot contracts; file an issue if something breaks.

## Development

```bash
npm install
npm test        # node --test, incl. static assertions on the built artifact and injected deps
npm run build   # tsdown emits lib/client.js (classic script, committed to the repo)
```

- Each feature is a private `features/<name>/` module (host + client halves) registered in the feature lists of `src/index.js` and `src/switches.js` — not a standalone plugin.
- The client bundles into a single classic script injected into `window.__ModuleLoader__`; external dependencies are strictly limited to the module seeds the host provides, enforced by the build script.
- Every push to main appends one entry to the update log below and syncs [CHANGELOG.md](CHANGELOG.md).

## Update log

The five most recent entries; full history in [CHANGELOG.md](CHANGELOG.md).

- **v0.5.14 · 2026-10-21** — The Features table now carries the full interaction detail of all seven features as bullets: triggers, visible states, how failures read, and what switching a feature off leaves behind. Behaviours that used to live only in the code — the newest row floating to the top, a workspace moving up by recency — are spelled out. Docs only.
- **v0.5.13 · 2026-10-20** — The update log lists only the five most recent entries, newest first, with earlier versions in `CHANGELOG.md`; the 0.5.8–0.5.12 bullets that had been appended below 0.5.1 are gone from here and the ordering is fixed. No code change.
- **v0.5.12 · 2026-10-20** — The running ring became a chat bubble: no number any more, one click still returns to your newest search session, and a dot lights up and breathes inside it while a search runs (still under reduced motion). Both doc screenshots were redrawn with the new glyph.
- **v0.5.11 · 2026-10-20** — The ring now means "my search sessions": it counts only sessions in the private search workspace, and a click always returns to the newest one — finished or still running — never to an ordinary sidebar session.
- **v0.5.10 · 2026-10-20** — The running ring only counts what the sidebar would show: sessions in the private search workspace (including an unregistered one still running in it) no longer light it up or get opened by it.

## License

[MIT](LICENSE) © 2026 plyflai
