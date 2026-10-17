# dsh-ux-plus

UX enhancements and quality-of-life plugins that make DeepSeek Harness easier to handle.

[![CI](https://github.com/plyflai/dsh-ux-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/plyflai/dsh-ux-plus/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**English** · [简体中文](./README.zh-CN.md)

**Currently targeting the Web UI of [DeepSeek Harness 0.2.0-rc.1](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.0-rc.1).**

## Features

| Feature | Why you'll like it | Preview |
| --- | --- | --- |
| Conversation typography | **[One-click comfort]** Pick a comfortable font size and reading width for the chat area. Long answers read easier, wide screens get used properly — without zooming the whole interface. | <img src="docs/images/typography.png" width="300" alt="Chat area rendering"> |
| Session ID menu | **[Grab it in one click]** Copy a session's ID straight from its row menu — for `--session` resumes, locating records, or debugging, with no manual text selection. | <img src="docs/images/session-menu.png" width="200" alt="Session row menu"> |
| Workspace recency order | **[Jump back + auto-tidy]** One green-backed block holds what is live right now — running, or touched within 24 hours — each row led by its status dot; the history stays hidden below the block behind the host's own "Expand N more sessions" button, pinned directly there; workspaces idle for over a day collapse on their own and show their age on hover. | <img src="docs/images/idle-collapse.png" width="200" alt="Workspace age labels"> |
| Ask question expanded | **[Fewer clicks on review]** When a question finishes, the question and its answer stay expanded — checking a decision costs one less click. | — |
| Inherit conversation | **[Switch models, keep going]** Pick a model in the session menu: a brand-new session in the current workspace reads the old conversation's progress and carries on. | <img src="docs/images/inherit-picker.png" width="200" alt="Model picker popover"> |
| Attention favicon | **[See it from the other tab]** The host's whale favicon keeps its shape and gains three independent signals: the whale fades slowly in and out while any session computes, turns green exactly when the workspace list has an unread dot (a finished run you have not opened), and blinks an orange dot while something awaits your click — all three can show at once. Plain whale when nothing is up. | — |

## Feature details

### Conversation typography

The chat area defaults to 14px. When answers get dense, bump the font size and narrow the reading width under **Settings → General → Chat area** — it only affects conversation content, never the whole interface.

### Session menu: Session ID & Inherit conversation

Each session row's overflow menu gains two items (placed before the native Pin / Rename entries):

- **Session ID**: copies the session's ID to the clipboard — for `--session` resumes, log digging and similar workflows.
- **Inherit conversation**: see below.

### Inherit conversation

Clicking "Inherit conversation" opens a lightweight model picker at the click position, listing every routable model (grouped by provider):

After you pick a model, the plugin:

1. creates a brand-new session **in the original session's workspace**;
2. switches the new session to the model you just picked;
3. posts an inheritance prompt — the inherited session's ID plus "Summarize and inherit this conversation's progress, giving the most attention to the latest turns";
4. jumps to the new session, where the model starts reading the old conversation, summarizing progress and carrying on.

Great for: a session that ran too long and deserves a pricier model to finish; a rate-limited provider where you want to continue elsewhere; or simply transplanting progress into another model's context. The original session is untouched, and the Session ID copy stays as-is.

### Workspace recency order (zones, status dots, idle collapse)

Workspace groups and their session rows sort by most recent activity, so multiple parallel projects never bury the one you were just in; only the visual order changes — the host's sort settings and data stay intact.

On top of recency, rows are split into exactly two **zones**, and one thing decides: last activity. Anything running, or active within **24 hours**, belongs to the **Active** block — sorted by last activity, drawn as one continuous green-backed band with rounded outer corners. Rows are deliberately compact — a 26px box with 13px titles, tighter than the host's 32px / 14px, so a long session list reads like a sidebar rather than a stack of cards; the Active block is set apart by its band and dots, never by a taller row. Every row leads with its status dot, the same signals the host shows: orange and breathing while awaiting your reply, a spinning blue ring while running, a solid green dot while a finished session is unread. Nothing else gets a vote — a session awaiting a reply for more than a day is simply dormant.

**No extra fold row** (user rule): this feature adds no bar of its own — the host's own "Expand N more sessions" button is the one expand control, reused for both systems. Where a workspace has an Active block and that button, the history stays fully hidden below the block (rows keep their place in the DOM, folded away) and the button is pinned directly below the block, however many rows it holds — before the first press only the Active block shows. One press reveals the section and hands the list back to the host — every row the host renders stays visible (no bounce) and the button returns to its native place at the very bottom, below every session, so an open section reads exactly like the host's own expanded list. The host's 收起 closes the section again: the fold and the pin come back. Where every session is dormant, or the host renders no button, the workspace behaves exactly like the host. A revealed row never rejoins the Active block until it sees new activity.

The workspace row carries the Active block's attention as up to three pure colour dots (awaiting, unread, running) whenever that attention is hidden — a collapsed workspace or the host's 5-row cap; the counts stay in the tooltip (`2 awaiting · 1 unread`) for hovering and screen readers. A dormant session's status never floats up to the header, and workspaces with running or awaiting sessions are never auto-collapsed.

Reordering never fights you: it pauses while the pointer is inside the tree or a menu is open (deferred, never dropped, retried on two bounded timers so a deferred pass never waits on an event that may never come, and the pause itself has a lifetime — once both retries are spent a pass runs anyway, so nothing it deferred can stay stale while you keep working in the list), glides rows with a short FLIP transition (off under `prefers-reduced-motion`) — including the move between the two zones — re-checks the zones on a timer so a row ages across the 24-hour line even when nothing changes in the data layer; a workspace holding a running or awaiting session also floats up in the group list. **Your own actions pierce that pause** — changing the host's view options (分组方式 / 排序方式 / 筛选会话) or clicking the host's expand button restyles on the same frame as the click, without the FLIP, instead of waiting for the pointer to leave the list. And a section that briefly sees a row count it cannot explain — the host re-rendering an instant before its data lands — keeps the look it last agreed on, band and fold together, rather than dropping the Active block's green at that instant; only a shape this feature genuinely cannot model hands the section back to the host.

The same feature also handles **idle tidying**: a workspace with no real activity for over **24 hours** (blank and subagent sessions don't count — same signal as the ordering) collapses automatically once when the page opens, and every workspace row shows its age on the right when you hover it — now / Nm / Nh / Nd / Nmo / Ny — styled exactly like the host's session-row timestamps, transparent until you hover the row and hidden while its menu is open.

Auto-collapse fires at most once per workspace per page load: re-expand it manually and it stays expanded. Workspaces without sessions (or with only blank / subagent sessions) have no activity signal — never labeled, never collapsed. Labels follow the DSH language and light/dark theme. Without the host's session-status service the feature degrades to plain recency: no zones, no dots, no bar.

### Attention favicon

The tab icon stays the host's whale — this feature only ever tints it, breathes it, or adds one dot to it, and only while there is something to say. The three signals are **independent** and compose freely: a green whale fading slowly with an orange dot blinking at the same time is a normal sight.

| Tab signal | Meaning |
| --- | --- |
| whale **breathes** — a slow fade out and back in | any counted session is computing (one waiting on your click does not count — that is the orange dot's story) |
| **green whale** | a finished session has not been opened — exactly when the workspace list shows its green dot |
| **blinking orange dot** | something is waiting for your click (an approval, a question, a plan review) |
| plain whale | nothing is up; the host's own icon is restored untouched |

The breath is a true fade — a 72-frame cosine at 20 fps over 3.6 seconds, never a flicker — with a 35% opacity floor; the blink is deliberately asymmetric (on for 2 of its 3 frames). Browsers throttle timers in hidden tabs to about one tick per second: the dot then switches frames on every tick — a slow but steady blink — and whichever frame the throttle freezes on, the alert stays visible; the moment you look at the tab again, the cycle restarts from the visible frame. Subagent and blank sessions never light the tab — a fan-out of subagents should not keep the whale permanently orange. Both theme variants of the host favicon (light / dark) are kept — the green tint is applied to whichever whale the OS theme picks — and if the host's favicon files cannot be read, or its whale cannot be re-tinted, the feature quietly does nothing. Turning the switch off removes the overlay links and the timer with no residue.

### Settings

Open **Settings → UX Plus**: all six features have independent switches, on by default, applied instantly.

![UX Plus settings](docs/images/settings.png)

## Install

Requires Node.js ≥ 22, pnpm on PATH, and a DSH Web profile.

```bash
dsh plugin --profile <name> add github:plyflai/dsh-ux-plus
```

Restart the profile afterwards. Open **Settings → UX Plus** to toggle each feature; features are on by default and each switch applies instantly.

Conversation font size and width live under **Settings → General → Chat area**.

## Compatibility

- Web UI (browser) only — not the terminal TUI.
- Every feature mounts on public host extension points (sidebar slots, settings forms, DOM tweaks); no host source is modified, and each feature can be switched off individually.
- Host upgrades may shift internal DOM and slot contracts; file an issue if something breaks and it usually gets fixed in the next version.

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

The three most recent entries; full history in [CHANGELOG.md](CHANGELOG.md).

- **v0.4.0 · 2026-10-17** — New feature **Attention favicon**: the tab's whale favicon keeps its shape and gains three independent, composable signals — the whale fades slowly in and out (a 3.6 s cosine breath, never a flicker) while any session computes, turns into a green whale exactly when the workspace list has an unread dot, and blinks an orange dot while something awaits your click. The blink is asymmetric and the breath has a 35% floor, so a throttled hidden tab still shows the alert on whatever frame the throttle lands on; a hidden tab advances the blink every throttled tick (about one switch per second — Chrome's floor) and the cycle restarts on the real visible edge; subagent and blank sessions never light the tab; both host theme variants are preserved and the overlay leaves no residue when the switch is off. Also fixed: clicking 【N earlier sessions】 made the list flicker once — the pass that answers the click now waits the host's 200 ms row glide out before restyling — and the sidebar's own fold bar was retired entirely: the host's 【Expand N more sessions】 button is now the single expand control — the history stays fully hidden below the Active block until you press it, the button is pinned directly below the block where one exists, one press opens the section (the button returning to the list's native bottom), and 收起 folds it back.
- **v0.3.2 · 2026-10-16** — Fixed: the Active block's green could vanish mid-session. Two causes — a pass that met a row count it could not explain tore the green band down (while the compact rows, dots and ranks stayed, which is why only the green went missing), and the anti-churn pause then kept the repair pass deferred for as long as the pointer rested in the list. A section now holds its last consistent look, band and fold together, through a brief host render race and only steps aside for a shape it truly cannot model, and the pause has a lifetime: once its two retries are spent a pass runs anyway, the budget being refreshed by the pause lifting rather than by the pass that pierced it.
- **v0.3.1 · 2026-10-16** — Fixed: with the pointer resting inside the session list, clicking the "N earlier sessions" bar did nothing — the anti-churn pause swallowed the click's own repaint, so the folded rows stayed folded until the pointer left the list. A user action now pierces that pause (the fold bar and the host's view options restyle on the click's own pass), and a pass that the pause does defer is retried on two bounded timers instead of waiting for an event that may never come.

## License

[MIT](LICENSE) © 2026 plyflai
