# <img src="docs/images/icon.svg" width="44" height="44" alt="" align="top"> dsh-ux-plus

Small interface improvements for the DSH Web chat. Each feature has its own switch under **Settings → UX Plus** and applies instantly.

[![CI](https://github.com/plyflai/dsh-ux-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/plyflai/dsh-ux-plus/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

**English** · [简体中文](./README.zh-CN.md)

**Targets the Web UI of [DeepSeek Harness 0.2.1-rc.1](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.1-rc.1).**

## New in 0.5.0 — search like a search engine

A search box now lives under **Automated tasks** in the sidebar: type, press Enter, and you get exactly the session UI you already know — except this session files itself into a hidden workspace instead of your sidebar.

- magnifier on the left, a tiny model picker on the right (host default model unless you pick one)
- the clock icon on the right is history: your last 50 searches, one click back to that session
- the hidden workspace is `.dsh-ux-plus/search` under your home directory, created on first use and never shown in the sidebar

[Details →](#workspace-quick-search)

## New in 0.4.0 — the tab tells you what's happening

The whale favicon keeps its shape and carries three signals while you sit on another tab:

- whale **breathes** — something is computing
- **green whale** — a run finished and you haven't opened it
- **blinking orange dot** — something waits for your click

The signals are independent and compose freely; plain whale when nothing is up. [Details →](#attention-favicon)

## Features

| Feature | What it does | Preview |
| --- | --- | --- |
| Workspace quick search | A persistent sidebar search box: Enter opens an ordinary session, filed into a hidden workspace, with the last 50 searches kept in history. | — |
| Attention favicon | The tab icon breathes while anything computes, turns green for finished-and-unread, blinks an orange dot while something awaits your click. | — |
| Workspace recency order | What is live right now sits in one green-backed Active block with status dots; the history stays hidden below it behind the host's own "Expand N more sessions" button; idle workspaces collapse themselves and show their age on hover. | <img src="docs/images/recency-folded.png" width="200" alt="Active block with the expand button pinned below it"> |
| Conversation typography | Pick a comfortable font size and reading width for the chat area — without zooming the whole interface. | <img src="docs/images/typography.png" width="300" alt="Chat area rendering"> |
| Session ID menu | Copy a session's ID from its row menu — for `--session` resumes and log digging, no text selection. | <img src="docs/images/session-menu.png" width="200" alt="Session row menu"> |
| Inherit conversation | Pick a model in the session menu: a new session in the same workspace reads the old conversation and carries on. | <img src="docs/images/inherit-picker.png" width="200" alt="Model picker popover"> |
| Ask question expanded | Finished question cards stay expanded — checking a decision costs one less click. | — |

## Feature details

### Workspace quick search

A search box sits permanently under **Automated tasks** in the sidebar and works like a search engine: type, press Enter, and a new session opens — the same UI as any other session.

| Element | Behaviour |
| --- | --- |
| Search box (magnifier on the left) | Enter searches straight away (the field is single-line); an Enter that ends an IME composition never submits by accident |
| Model picker | A small chip icon on the right: click it for the model list (the current pick is ticked). Leave it alone to use the host default; a non-default pick puts a dot on the chip and is remembered locally |
| Clock icon (right) | Opens history: the last 50 searches, one click reopens that session, one button clears the list |
| Sidebar | Search sessions **never show up** — they all live in the hidden workspace |

- The hidden workspace is `.dsh-ux-plus/search` in your home directory, created on first use. It is not in the workspace list and has no group in the session tree, yet the history popup still takes you back to any old search session.
- The box only appears while the sidebar is expanded; in the collapsed rail it steps aside.
- Turning the switch off removes the hidden-workspace rule too — those sessions simply reappear in the sidebar, nothing is lost.

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

The three most recent entries; full history in [CHANGELOG.md](CHANGELOG.md).

- **v0.5.3 · 2026-10-19** — Quick-search style isolation: every rule for the box and its popups is scoped to this evaluation's own token, so a superseded bundle's stylesheet cannot restyle the box even when it is inserted later with equal specificity — verified by appending the 0.5.1 sheet last, gutters stayed 13px / 13px.
- **v0.5.2 · 2026-10-19** — Two quick-search fixes: the box now has strictly symmetric gutters (both ends are a 22px slot inside 8px padding, so the magnifier no longer sits closer to the edge than the right-hand icons), and a box left behind by a hot-replaced bundle instance no longer stacks under the new one — our nodes carry a per-evaluation token, so a stale marker is hidden instead of fought over.
- **v0.5.1 · 2026-10-19** — Quick search polish: the model picker is now a small chip icon that opens a menu (a dot marks a non-default pick), the box contents are properly centred, and the box no longer needs `remote.$host.home` at mount — Enter searches as soon as the connection is ready.
- **v0.5.0 · 2026-10-19** — New "Workspace quick search": a persistent sidebar box opens an ordinary session on Enter (with a minimal model picker). Those sessions are filed into the hidden workspace `.dsh-ux-plus/search`, and the clock icon reopens the last 50 searches.
- **v0.4.5 · 2026-10-18** — Icon is now a die-cut sticker: no background tile, just the whale and the UX+ mark with a white edge tracing the combined silhouette (the mark keeps its own halo). No behaviour change.
- **v0.4.4 · 2026-10-18** — Icon polish: the white edge now frames the whole tile instead of outlining the UX+ letters; the inline README icon grows to 44px. No behaviour change.

## License

[MIT](LICENSE) © 2026 plyflai
