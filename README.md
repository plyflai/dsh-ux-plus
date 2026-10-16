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
| Workspace recency order | **[Jump back + auto-tidy]** One green-backed block holds what is live right now — running, or touched within 24 hours — each row led by its status dot; everything older folds behind a slim "N earlier sessions" bar; workspaces idle for over a day collapse on their own and show their age on hover. | <img src="docs/images/idle-collapse.png" width="200" alt="Workspace age labels"> |
| Ask question expanded | **[Fewer clicks on review]** When a question finishes, the question and its answer stay expanded — checking a decision costs one less click. | — |
| Inherit conversation | **[Switch models, keep going]** Pick a model in the session menu: a brand-new session in the current workspace reads the old conversation's progress and carries on. | <img src="docs/images/inherit-picker.png" width="200" alt="Model picker popover"> |

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

**Everything older folds away**: the dormant block collapses behind a slim centred bar — "N earlier sessions" between two hairlines — which is the only text this feature adds to the sidebar. One click reveals the block in place: the same compact box, faded, each row keeping its own status dot. A revealed row never rejoins the Active block until it sees new activity.

The workspace row carries the Active block's attention as up to three pure colour dots (awaiting, unread, running) whenever that attention is hidden — a collapsed workspace, the host's 5-row cap, or the folded block; the counts stay in the tooltip (`2 awaiting · 1 unread`) for hovering and screen readers. A dormant session's status never floats up to the header, and workspaces with running or awaiting sessions are never auto-collapsed.

Reordering never fights you: it pauses while the pointer is inside the tree or a menu is open (deferred, never dropped), glides rows with a short FLIP transition (off under `prefers-reduced-motion`) — including the move between the two zones — re-checks the zones on a timer so a row ages across the 24-hour line even when nothing changes in the data layer; a workspace holding a running or awaiting session also floats up in the group list.

The same feature also handles **idle tidying**: a workspace with no real activity for over **24 hours** (blank and subagent sessions don't count — same signal as the ordering) collapses automatically once when the page opens, and every workspace row shows its age on the right when you hover it — now / Nm / Nh / Nd / Nmo / Ny — styled exactly like the host's session-row timestamps, transparent until you hover the row and hidden while its menu is open.

Auto-collapse fires at most once per workspace per page load: re-expand it manually and it stays expanded. Workspaces without sessions (or with only blank / subagent sessions) have no activity signal — never labeled, never collapsed. Labels follow the DSH language and light/dark theme. Without the host's session-status service the feature degrades to plain recency: no zones, no dots, no bar.

### Settings

Open **Settings → UX Plus**: all five features have independent switches, on by default, applied instantly.

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

- **v0.3.0 · 2026-10-15** — Recency order becomes a zone model: last activity alone decides — running, or touched within 24 hours, forms one green-backed Active block, and everything older folds behind a slim "N earlier sessions" bar; per-row status dots (orange awaiting with a breathing halo, spinning blue running, solid green unread) replace the text badges and the compact row; the workspace header carries the Active block's dots only; age labels now fade in on hover. Session rows are now a compact 26px box with 13px titles (was 32px / 14px), so a long list stays scannable, and a row can no longer be left holding a stray inline transition when a repaint overtakes an animation's release frame.
- **v0.2.0 · 2026-10-15** — Recency order becomes liveness order: awaiting-reply / running / unread sessions pin to the top and bubble up as workspace count badges when hidden; dormant sessions render compact and fold behind a "fold earlier" row; reordering freezes under the pointer or an open menu; unread dots never auto-clear.
- **v0.1.7 · 2026-10-14** — README restructured: English-first with a [Chinese counterpart](./README.zh-CN.md), screenshots moved into the feature table, update log trimmed to the three latest entries.

## License

[MIT](LICENSE) © 2026 plyflai
