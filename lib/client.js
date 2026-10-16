window.__ModuleLoader__.load({
	id: "dsh-ux-plus",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region features/conversation-typography/src/index.js
		/**
		* dsh-ux-plus feature module: Conversation typography.
		*
		* Frozen feature id `conversation-typography`.
		*
		* D5 contract surface (consumed by the package host and client halves):
		*   feature.host(ctx)      -> disposer. Host-side installation: registers the
		*                             durable `ui-tweak` settings section, moved
		*                             verbatim (values unchanged) from the legacy
		*                             dsh-ui-tweak host half (plan D7).
		*   feature.client(ctx, deps) -> disposer. Client-side installation: the
		*                             plugin-owned <style> tag that overrides the
		*                             conversation font tokens and content width
		*                             (CSS injected from JS only — this package's
		*                             build chain has no CSS resource pipeline), the
		*                             ui-tweak settings subscription, and the
		*                             Settings→General typography row. The disposer
		*                             removes all of it immediately (off == never
		*                             installed).
		*   attach / dispose        - host-side installation/uninstallation aliases
		*                             (P1 test surface, retained).
		*
		* deps (client, supplied by the package client half):
		*   tweakScope - SettingsScope bound to `ui-tweak` (bind is owned by the
		*                plugin-level fiber, not this feature's mount).
		*   react      - the shell-seeded React module (seed `react` in the built
		*                artifact; the host half never supplies it).
		*/
		const id$4 = "conversation-typography";
		const title$4 = "Conversation typography";
		const description$4 = "Conversation font size and width for the chat area.";
		/** Settings-row copy, assembled into the `ux-plus-settings` namespace. */
		const settingsMessages$4 = {
			zh: {
				title: "对话字号与宽度",
				description: "选择舒服的字号和阅读宽度，长篇回答看得更轻松，不用放大整个界面。"
			},
			en: {
				title: "Conversation typography",
				description: "Conversation font size and width for the chat area."
			}
		};
		/** Accepted font-size presets; `l` is the current default look. */
		const FONT_SIZE_OPTIONS = [
			"xs",
			"s",
			"m",
			"l",
			"xl"
		];
		/** Accepted conversation-width presets. */
		const CHAT_WIDTH_OPTIONS = [
			"s",
			"m",
			"l",
			"xl"
		];
		function enumValue(value, options, fallback) {
			if (value === void 0 || value === null) return fallback;
			if (!options.includes(value)) throw new TypeError(`ui-tweak: expected one of ${options.join("/")}, got ${String(value)}`);
			return value;
		}
		/**
		* Local callable settings schema: validates/normalizes the section and
		* exposes the serialized envelope the settings service describes to clients
		* (moved verbatim from the legacy dsh-ui-tweak host half).
		* @param {object | undefined} value - raw section value.
		* @returns {object} the resolved section.
		*/
		function UI_TWEAK_SCHEMA(value) {
			return {
				fontSize: enumValue(value?.fontSize, FONT_SIZE_OPTIONS, "l"),
				chatWidth: enumValue(value?.chatWidth, CHAT_WIDTH_OPTIONS, "l")
			};
		}
		/** JSON-schema projection of UI_TWEAK_SCHEMA for settings consumers. */
		UI_TWEAK_SCHEMA.toJSON = () => ({
			type: "object",
			properties: {
				fontSize: {
					type: "string",
					enum: FONT_SIZE_OPTIONS
				},
				chatWidth: {
					type: "string",
					enum: CHAT_WIDTH_OPTIONS
				}
			}
		});
		/** Font presets: assistant (markdown) + user bubble font metrics. */
		const FONT_SIZES = {
			xs: {
				assistantSize: 12,
				assistantLine: 20,
				bubbleSize: 12,
				bubbleLine: 18
			},
			s: {
				assistantSize: 13,
				assistantLine: 22,
				bubbleSize: 13,
				bubbleLine: 20
			},
			m: {
				assistantSize: 14,
				assistantLine: 24,
				bubbleSize: 14,
				bubbleLine: 22
			},
			l: {
				assistantSize: 16,
				assistantLine: 28,
				bubbleSize: 16,
				bubbleLine: 24
			},
			xl: {
				assistantSize: 18,
				assistantLine: 30,
				bubbleSize: 18,
				bubbleLine: 26
			}
		};
		/** Content-width presets in px. */
		const WIDTHS = {
			s: 680,
			m: 800,
			l: 920,
			xl: 1040
		};
		/**
		* Build the override CSS text for one section value. Token ownership (plan
		* R8): `--dsh-chat-content-width` belongs to ui-conversation and the
		* `--dsw-font-markdown-base*` family to ui-theme — both are overridden ONLY
		* in this package's own injected <style>, never in host files.
		* @param {object | undefined} value - the ui-tweak section value.
		* @returns {string} the CSS text.
		*/
		function buildCss(value) {
			const fontSize = FONT_SIZES[value && value.fontSize ? value.fontSize : "l"] || FONT_SIZES.l;
			const width = WIDTHS[value && value.chatWidth ? value.chatWidth : "l"] || WIDTHS.l;
			const bubbleMax = Math.round(width * .7);
			const tableCellMax = Math.round(width * .43);
			return [
				"div:has(> [data-conversation-scroll]) {",
				"  --dsh-chat-content-width: " + width + "px;",
				"  --dsw-font-markdown-base: " + fontSize.assistantSize + "px/" + fontSize.assistantLine + "px var(--dsw-font-family);",
				"  --dsw-font-markdown-base-font-size: " + fontSize.assistantSize + "px;",
				"  --dsw-font-markdown-base-line-height: " + fontSize.assistantLine + "px;",
				"  --dsw-font-markdown-base-strong: 600 " + fontSize.assistantSize + "px/" + fontSize.assistantLine + "px var(--dsw-font-family);",
				"  --dsw-font-markdown-base-strong-font-size: " + fontSize.assistantSize + "px;",
				"  --dsw-font-markdown-base-strong-line-height: " + fontSize.assistantLine + "px;",
				"  --dsw-font-markdown-base-italic: italic " + fontSize.assistantSize + "px/" + fontSize.assistantLine + "px var(--dsw-font-family);",
				"  --dsw-font-markdown-base-italic-font-size: " + fontSize.assistantSize + "px;",
				"  --dsw-font-markdown-base-italic-line-height: " + fontSize.assistantLine + "px;",
				"  --dsw-font-markdown-base-strong-italic: italic 600 " + fontSize.assistantSize + "px/" + fontSize.assistantLine + "px var(--dsw-font-family);",
				"  --dsw-font-markdown-base-strong-italic-font-size: " + fontSize.assistantSize + "px;",
				"  --dsw-font-markdown-base-strong-italic-line-height: " + fontSize.assistantLine + "px;",
				"}",
				"[data-conversation-scroll] {",
				"  --dsh-chat-content-width: " + width + "px;",
				"}",
				"[data-conversation-scroll] [data-time-hover-root] [class*=\"_bubble\"] {",
				"  font-size: " + fontSize.bubbleSize + "px !important;",
				"  line-height: " + fontSize.bubbleLine + "px !important;",
				"}",
				"[data-conversation-scroll] [data-time-hover-root] > div:first-child {",
				"  max-width: min(" + bubbleMax + "px, 82%);",
				"}",
				"[data-conversation-scroll] [class*=\"_tableScroll\"] th,",
				"[data-conversation-scroll] [class*=\"_tableScroll\"] td {",
				"  max-width: " + tableCellMax + "px;",
				"}",
				"[data-conversation-scroll] section[data-turn] {",
				"  max-width: " + width + "px;",
				"}",
				"[data-conversation-scroll] section[data-turn] > div {",
				"  max-width: " + width + "px;",
				"}"
			].join("\n");
		}
		/** One segmented control (ported from the legacy row markup). */
		function segmented(react, label, options, value, onSelect) {
			const { createElement } = react;
			return createElement("div", { style: {
				display: "flex",
				flexDirection: "column",
				gap: 4
			} }, createElement("span", { style: {
				fontSize: 14,
				color: "var(--dsw-alias-label-primary)"
			} }, label), createElement("div", { style: {
				display: "flex",
				gap: 6,
				flexWrap: "wrap"
			} }, options.map(function(optionId) {
				return createElement("button", {
					key: optionId,
					type: "button",
					onClick: function() {
						onSelect(optionId);
					},
					style: {
						padding: "4px 12px",
						borderRadius: 8,
						border: "1px solid var(--dsw-alias-border-l2)",
						background: value === optionId ? "var(--dsw-alias-bg-module-platform)" : "transparent",
						color: "var(--dsw-alias-label-primary)",
						cursor: "pointer",
						fontSize: 13
					}
				}, optionId === "l" ? "L（当前）" : optionId.toUpperCase());
			})));
		}
		/** Currently installed host-side disposer, or undefined while detached. */
		let release$2 = void 0;
		/**
		* Install the feature's host-side behavior (the ui-tweak section).
		* @param {object} ctx - the plugin context.
		* @returns {() => void} the disposer for this installation.
		*/
		function attach$4(ctx) {
			dispose$2();
			release$2 = () => {
				release$2 = void 0;
			};
			return release$2;
		}
		/** Tear down the current host-side installation; idempotent. */
		function dispose$2() {
			const current = release$2;
			release$2 = void 0;
			if (current !== void 0) current();
		}
		/**
		* Install the feature's client-side behavior.
		* @param {object} ctx - the client plugin context (slots service).
		* @param {object} deps - { tweakScope, react } (see module header).
		* @returns {() => void} disposer: unsubscribes, unregisters the row, removes
		*   the <style> tag — immediate, no refresh, no residue.
		*/
		function client$4(ctx, deps) {
			const scope = deps && deps.tweakScope;
			const react = deps && deps.react;
			if (!scope || !react) return () => {};
			let styleTag = null;
			function applyCss(value) {
				if (styleTag === null) {
					styleTag = document.createElement("style");
					styleTag.dataset.plugin = "dsh-ux-plus";
					document.head.appendChild(styleTag);
				}
				styleTag.textContent = buildCss(value);
			}
			function sync() {
				applyCss(scope.getSnapshot().value);
			}
			sync();
			const offScope = scope.subscribe(sync);
			/** Settings→General row component (ported from the legacy UiTweakRow). */
			function TypographySettingsRow(props) {
				const { useState, useEffect, createElement } = react;
				const rowScope = props.scope;
				const [value, setValue] = useState(() => {
					const snapshot = rowScope.getSnapshot();
					return snapshot && snapshot.value || {
						fontSize: "l",
						chatWidth: "l"
					};
				});
				useEffect(() => rowScope.subscribe(() => {
					const snapshot = rowScope.getSnapshot();
					setValue(snapshot && snapshot.value || {
						fontSize: "l",
						chatWidth: "l"
					});
				}), [rowScope]);
				function pick(field, preset) {
					Promise.resolve(rowScope.set(field, preset)).catch(() => {});
					applyCss({
						...value,
						[field]: preset
					});
				}
				return createElement("div", { style: {
					display: "flex",
					flexDirection: "column",
					gap: 8,
					padding: "16px 0",
					borderBottom: "1px solid var(--dsw-alias-border-l2)"
				} }, createElement("div", { style: {
					fontSize: 14,
					fontWeight: 500,
					color: "var(--dsw-alias-label-primary)"
				} }, "对话区"), segmented(react, "字号", FONT_SIZE_OPTIONS, value.fontSize, function(preset) {
					pick("fontSize", preset);
				}), segmented(react, "宽度", CHAT_WIDTH_OPTIONS, value.chatWidth, function(preset) {
					pick("chatWidth", preset);
				}));
			}
			const offInject = ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "ui-tweak",
				order: 20,
				inject: () => ({ scope })
			}, TypographySettingsRow));
			return function releaseClient() {
				offInject();
				offScope();
				if (styleTag !== null) {
					if (styleTag.parentNode !== null) styleTag.parentNode.removeChild(styleTag);
					styleTag = null;
				}
			};
		}
		/** D5 contract view consumed by the package host and client halves. */
		const feature$4 = {
			id: id$4,
			title: title$4,
			description: description$4,
			hasGear: false,
			settingsMessages: settingsMessages$4,
			host: (ctx) => attach$4(ctx),
			client: (ctx, deps) => client$4(ctx, deps)
		};
		//#endregion
		//#region features/workspace-session-menu/src/index.js
		/** Session ID action mounted through the host's session-menu slot. */
		const id$3 = "workspace-session-menu";
		const title$3 = "Session ID menu";
		const description$3 = "Add a \"Session ID\" copy item to session row menus.";
		/** Settings-row copy, assembled into the `ux-plus-settings` namespace. */
		const settingsMessages$3 = {
			zh: {
				title: "复制会话 ID",
				description: "在会话菜单里一键拿到会话 ID，方便续接会话、定位记录或排查问题。"
			},
			en: {
				title: "Session ID menu",
				description: "Add a \"Session ID\" copy item to session row menus."
			}
		};
		const NS$1 = "ux-plus-session-menu";
		function legacyCopy(text) {
			const area = document.createElement("textarea");
			area.value = text;
			area.setAttribute("readonly", "");
			area.style.position = "fixed";
			area.style.opacity = "0";
			document.body.appendChild(area);
			area.select();
			const ok = document.execCommand("copy");
			area.remove();
			return ok;
		}
		async function copySessionId(text) {
			try {
				await navigator.clipboard?.writeText(text);
			} catch (error) {}
			return legacyCopy(text);
		}
		/** Mount a native menu row whose owner supplies the exact session ID. */
		function client$3(ctx, deps) {
			if (!deps?.react || !deps?.primitives) return () => {};
			const React = deps.react;
			const { MenuItemButton, IconCopyOutlineRegular } = deps.primitives;
			const offLocale = ctx.effect(() => ctx.locale.register(NS$1, {
				zh: {
					copy: "会话ID",
					failed: "复制失败，请重试"
				},
				en: {
					copy: "Session ID",
					failed: "Copy failed; retry"
				}
			}));
			function SessionIdItem({ sessionId, useMenuOpenState, t }) {
				const [, setMenuOpen] = useMenuOpenState();
				const [failed, setFailed] = React.useState(false);
				return React.createElement(MenuItemButton, {
					icon: React.createElement(IconCopyOutlineRegular),
					onSelect: async () => {
						try {
							if (!await copySessionId(sessionId)) throw new Error("clipboard write failed");
							setMenuOpen(false);
						} catch (error) {
							setFailed(true);
						}
					}
				}, t(failed ? "failed" : "copy"));
			}
			const offSlot = ctx.slots.inject("sidebar.workspaces.session.menu.item", () => ctx.slots.register({
				name: "sidebar.workspaces.session.menu.item",
				id: "dsh-ux-plus.copy-session-id",
				order: 50,
				locale: NS$1
			}, SessionIdItem));
			return () => {
				offSlot();
				offLocale();
			};
		}
		/** Host companion; the menu action has no host resources. */
		function attach$3() {
			return () => {};
		}
		const feature$3 = {
			id: id$3,
			title: title$3,
			description: description$3,
			hasGear: false,
			settingsMessages: settingsMessages$3,
			host: attach$3,
			client: client$3
		};
		//#endregion
		//#region features/workspace-recency-order/src/index.js
		/**
		* dsh-ux-plus feature module: Workspace recency order.
		*
		* Frozen feature id `workspace-recency-order`.
		*
		* D5 contract surface (consumed by the package host and client halves):
		*   feature.host(ctx)      -> disposer. No-op for this feature (no host-side
		*                             settings section; the package host registers
		*                             the ux-plus switch instead).
		*   feature.client(ctx, deps) -> disposer. Client-side installation: the
		*                             grouped Workspace tree's visual recency
		*                             ordering — group layer (workspace sections by
		*                             their latest member session activity, freshest
		*                             first; archive-invariant, so archiving a
		*                             conversation never moves its workspace section)
		*                             plus row layer (each section's own
		*                             session rows by session updatedAt). Only the
		*                             visual order changes: React child order,
		*                             host store state (orderBy /
		*                             sessionOrderByAccount) and host data stay
		*                             intact. Same switch, same activity signal:
		*                             the idle sub-behavior additionally collapses
		*                             workspaces idle for over 24 hours (once per
		*                             workspace per page load, through the host's
		*                             own row click handler — the persisted view
		*                             store is never touched) and labels every
		*                             workspace row with its host-styled age
		*                             ("多久没更新"). The disposer restores every
		*                             cached original style, removes all labels and
		*                             the style tag, and removes all
		*                             listeners/observers/subscriptions/timers —
		*                             immediate, no refresh, no residue (off ==
		*                             never installed).
		*   attach / dispose        - host-side installation/uninstallation aliases
		*                             (P1 test surface, retained).
		*
		* deps (client, supplied by the package client half):
		*   sessions   - the soft-fetched sessions service (needs `.list`).
		*   workspaces - the soft-fetched workspaces service (needs `.list`).
		*
		* Both are soft lookups: the package's settings section must never fail to
		* mount because one of them is absent, so a missing (or list-less)
		* dependency degrades this feature to a no-op disposer (no console error,
		* no PAGEERROR).
		*
		* DOM contract (host ui-workspace, read-only facts — plan §2):
		*   - the grouped tree is a role="tree" element whose direct children are
		*     group sections (the host's .groupSection divs); each section's direct
		*     children are, in order: the group header row (role="treeitem"
		*     carrying aria-expanded — possibly nested one span wrapper deep), an
		*     optional role="group" container with nested sections (workspace-tree
		*     mode), the session rows (role="treeitem" without aria-expanded, each
		*     wrapped in one span), and an optional overflow button (the section's
		*     only <button>, "展开更多").
		*   - the tree is found structurally: any role="tree" whose direct children
		*     include a group-section header qualifies. The flat list and the
		*     search tree carry no such headers, so they never match — no section
		*     counting anywhere (the legacy count-and-compare finder is gone).
		*   - rows are matched to sessions by replaying the host's own row projection
		*     and only then pairing positionally (the host exposes no id on row
		*     elements). The replay mirrors the host pipeline exactly, in order:
		*     recency or the reconciled manual order over the account's members
		*     (tree.ts:144-200 — pins, the archive partition and fork placement
		*     included), the current blank pinned first (tree.ts:214-220), the host
		*     visibility filter following the user's archivedFilter
		*     (tree.ts:229-253), then the host section partition that fronts blanks
		*     and non-archived pinned rows (tree.ts:273-287). A count mismatch or a
		*     failed pairing-trust check makes the row layer a no-op for that section
		*     (the group layer is unaffected) and logs one trace line when
		*     `dsh.ux-plus.recency.debug` is on.
		*   - the replay is only how rows get identified. The order this feature
		*     WRITES is recency in both sort modes, except the current blank row and
		*     non-archived pinned rows, which keep the host's rendered positions — so
		*     a sidebar left in 手动排序 (the host flips to it silently on the first
		*     row drag, stores.ts:104) still surfaces the conversation you are in.
		*
		* Route 1 (pure CSS): the tree and every section become flex columns and
		* each child receives a computed `order` (group rank 0..n-1; row rank 10+;
		* overflow button last), with flex-shrink pinned to 0 so single-line rows
		* are never compressed (plan G4). Every written style property is cached on
		* first write and fully restored on dispose (plan W-6).
		*
		* Zone layer (same switch, second behavior — v0.3.0 replaced the tier model
		* with ONE partition rule: last activity):
		*   - zones (`zoneOf`): Active = running === true ∪ (now - updatedAt <= 24h);
		*     dormant = everything else, a pending or unread session older than 24
		*     hours included (no status pins a row to the top any more). Zones are
		*     recomputed on every store/status signal and on a tick no longer than
		*     five minutes, so rows cross the 24h boundary while the page sits idle.
		*   - row ranking: zone first (the Active block above the dormant block), then
		*     lastActive desc, then id ascending. The current blank row and
		*     non-archived pins keep the host's positions and count as Active — a pin
		*     is never folded away behind the bar.
		*   - status dots (`statusOf`), one injected 7px dot per row instead of every
		*     status word: waiting (#f59e0b solid, 2s breathing halo), running
		*     (#3b82f6 ring spinner), unread (#22c55e solid, static); no status, no
		*     dot. Each dot carries a localized title + aria-label (待回复 / 运行中 /
		*     未读, waiting / running / unread). The host's own status dot is hidden
		*     while ours is present and restored exactly on dispose, so nothing is
		*     drawn twice.
		*   - the status source is `deps.uiSession.sessionStatus` — the ONE
		*     authoritative source of the sidebar's three indicators. Without it
		*     (degraded mode) there is no zone, no dot and no bar: this feature then
		*     behaves exactly as it did before the layer existed (pure recency).
		*   - Active-block visuals: a continuous green support (rgba(34,197,94,0.07)
		*     per row, 6px radius on the block's first and last row — attributes plus
		*     one style-tag rule, never an inline background, so the host's own hover
		*     and selected backgrounds still win). Dormant rows read at opacity .5.
		*   - compact rows (user rule): EVERY session row is dressed down to the
		*     density the sidebar was asked for — an inline 26px height and 1px/6px
		*     padding on the host row (its `.sessionRow` fixes 32px and `padding: 0
		*     8px` in CSS, so only inline wins), a 13px/18px title and a 10px/14px
		*     age, and a 4px cell gap. One box for the whole list: the Active block is
		*     told apart by its band and dots, never by a taller row. Every written
		*     property is cached and restored by dispose, so switching the feature off
		*     gives the host's own metrics back exactly.
		*   - dormant bar (`foldBarText`): the dormant block is collapsed by default
		*     behind ONE thin bar (`count 条历史会话`, a 1px line on either side). The
		*     bar doubles as the host's truncation control: while the host overflow
		*     button is collapsed its hidden count joins the bar and the button itself
		*     is hidden. Dormant rows stay in the DOM (display:none only), so the row
		*     pairing count still matches. A click reveals the dormant block for the
		*     rest of the page load (its rows keep their own dots) and proxies the
		*     host's expand click.
		*   - workspace badge: the group header shows up to three 7px dots (waiting,
		*     unread, running) for the attention the Active block is hiding — never
		*     for the dormant block, whose status never floats up. The header carries
		*     the count tooltip (`badgeTooltip`: `2 待回复 · 1 未读`) for hover and
		*     screen readers.
		*   - age label: every workspace row still carries its host-styled age, now
		*     revealed on hover (opacity 0 → 1 through the injected style tag, hidden
		*     again while the row's menu is open, where the actions take the space).
		*   - row ranking: leading rows (the current blank + non-archived pins) keep
		*     the host's positions — and they are Active for that reason alone, so a
		*     pin is never folded away; everything else ranks by zone (the Active block
		*     first), then lastActivity desc, then id ascending. Archived rows keep
		*     today's treatment exactly (host row, no band, no dot, no fold).
		*   - group layer: a workspace with a running or pending member is lifted to
		*     "now" (it is active right now even if nothing was written for hours) and
		*     the 24h auto-collapse skips it; an unread completion never lifts a group.
		*   - anti-churn: while the pointer is inside the tree, or a row menu
		*     (`.menuOpen`) is open, all writes are deferred behind one dirty flag and
		*     re-run on pointerout / the next subscription event.
		*   - FLIP: rows that moved more than 4px are translated back to their old
		*     position for one frame, then animated over FLIP_MS (best-effort and
		*     scoped: skipped under prefers-reduced-motion, or where rAF /
		*     getBoundingClientRect is unavailable — e.g. the test fixtures).
		*/
		const id$2 = "workspace-recency-order";
		const title$2 = "Workspace recency order";
		const description$2 = "ONE partition rule: last activity. A workspace's sessions split into an Active block (running, or updated within 24 hours) and a dormant block that collapses behind one thin bar. Each row carries a 7px status dot instead of status text, the Active block reads as a green band of slightly taller rows, and the workspace header shows up to three dots for the attention the Active block hides. Workspaces idle for 24 hours still auto-collapse (once per workspace per page load) and every row still carries its last-active age on hover.";
		/** Settings-row copy, assembled into the `ux-plus-settings` namespace. */
		const settingsMessages$2 = {
			zh: {
				title: "最近活动排序",
				description: "只用一条判据：最后活动时间。工作区的会话分成两块——Active 区（仍在运行，或 24 小时内更新过）与默认折叠成一条细线的休眠区。每行行首是 7px 状态点，不再有状态文字；Active 区是一整块绿底、行高略高；工作区标题只上浮 Active 区被遮住的注意点（最多三个）。超过 24 小时没有更新的工作区仍会自动收起（每次打开页面每个工作区最多一次），每行仍带悬停显现的距今未更新时间。"
			},
			en: {
				title: "Workspace recency order",
				description: "ONE partition rule: last activity. A workspace's sessions split into an Active block (running, or updated within 24 hours) and a dormant block that collapses behind one thin bar. Each row carries a 7px status dot instead of status text, the Active block reads as a green band of slightly taller rows, and the workspace header shows up to three dots for the attention the Active block hides. Workspaces idle for 24 hours still auto-collapse (once per workspace per page load) and every row still carries its last-active age on hover."
			}
		};
		/** Host collapsed-row limit (rows/WorkspaceBrowser.tsx:44). */
		const COLLAPSED_SESSION_LIMIT = 5;
		/** Descendant-walk depth cap (host nesting: tree > section > group > section). */
		const WALK_DEPTH = 8;
		/** The host's persisted workspace-view store key (ui-workspace stores.ts:64-100). Read-only. */
		const VIEW_STORE_KEY = "dsh.workspace.view.v5";
		/** The host's ungrouped-bucket account key (ui-workspace tree.ts:21). */
		const UNGROUPED_KEY = "";
		/**
		* Row-layer bail-out trace. Off by default (zero console noise); flip with
		* `localStorage.setItem('dsh.ux-plus.recency.debug', '1')` then reload. Each
		* distinct (account, reason, detail) prints once, so a persisting bail-out
		* stays diagnosable without streaming. This exists because the row layer's
		* fail-closed path used to be invisible: a drifted host replay simply meant
		* "the plugin does nothing", indistinguishable from the plugin being disabled.
		*/
		const TRACE_KEY = "dsh.ux-plus.recency.debug";
		const traceSeen = /* @__PURE__ */ new Set();
		function traceSkip(account, reason, detail) {
			let on = false;
			try {
				on = window.localStorage.getItem(TRACE_KEY) === "1";
			} catch {
				return;
			}
			if (!on) return;
			const signature = `${account}|${reason}|${detail}`;
			if (traceSeen.has(signature)) return;
			if (traceSeen.size > 200) traceSeen.clear();
			traceSeen.add(signature);
			console.debug(`[ux-plus:recency] row layer off for "${account || "ungrouped"}": ${reason} (${detail})`);
		}
		/** Host Windows-path normalization (tree.ts:513-517). */
		function folderPath(path) {
			return (/^[A-Za-z]:[/\\]/.test(path) || path.startsWith("\\\\") ? path.replaceAll("\\", "/") : path).replace(/\/+$/, "");
		}
		/**
		* Nearest registered ancestor by host path prefix (host convention,
		* tree.ts:519-538): case-sensitive, longest matching path wins.
		* @returns the owning parent path, or undefined for a root workspace.
		*/
		function owningParentFolder(path, parents) {
			const child = folderPath(path);
			let owner = void 0;
			let length = -1;
			for (const parent of parents) {
				const root = folderPath(parent);
				if (root.length > length && child !== root && child.startsWith(`${root}/`)) {
					owner = parent;
					length = root.length;
				}
			}
			return owner;
		}
		/**
		* Most recent non-blank, non-subagent update in a workspace (the group-layer
		* activity signal; no-update groups carry -Infinity).
		*
		* Archive state is deliberately NOT an input. The host keeps an archived
		* session in its workspace `sessionIds` slot (workspace/src/index.ts:336-339:
		* "Archiving never touches workspace accounting"), so archiving or restoring a
		* conversation leaves this maximum untouched — the workspace section keeps its
		* rank. Excluding archived members instead made the freshest session's
		* archive drop the whole workspace to its next-newest member's timestamp: a
		* jump caused purely by hiding a row, not by any change in activity.
		*/
		function latestSessionUpdate(workspace, byId) {
			let latest = Number.NEGATIVE_INFINITY;
			for (const sessionId of workspace.sessionIds) {
				const session = byId[sessionId];
				if (session === void 0 || session.blank || session.origin === "subagent") continue;
				if (session.updatedAt > latest) latest = session.updatedAt;
			}
			return latest;
		}
		/** Idle threshold: no real activity for 24 hours. */
		const IDLE_MS = 864e5;
		/** Label refresh cadence on an otherwise idle page (ms). */
		const AGE_TICK_MS = 6e4;
		/** `data-row-key` prefix of workspace rows (Rows.tsx:245). */
		const ROW_PREFIX = "workspace:";
		/** Marker attribute carried by the injected label element. */
		const LABEL_ATTR = "data-dsh-ux-plus";
		const LABEL_VALUE = "workspace-age";
		/** Host session-time buckets (locales.ts): 60s / 60m / 24h / 30d / 12mo. */
		const MINUTE_MS = 6e4;
		const HOUR_MS = 60 * MINUTE_MS;
		const DAY_MS = 24 * HOUR_MS;
		const MONTH_MS = 30 * DAY_MS;
		const YEAR_MS = 12 * MONTH_MS;
		/** Active zone: a session running now, or updated within this window. */
		const ACTIVE_MS = 24 * HOUR_MS;
		/** Zone recompute cadence (ms): the Active/dormant boundary must not go stale. */
		const ZONE_TICK_MS = 5 * MINUTE_MS;
		/** FLIP transition duration (ms) for rows that moved. */
		const FLIP_MS = 180;
		/** Row rank of this feature's synthetic dormant bar (the overflow button is 999). */
		const FOLD_ROW_ORDER = "998";
		/** Marker values this feature injects into the tree. */
		const FOLD_VALUE = "fold-bar";
		const BADGE_VALUE = "attention-badge";
		const DOT_VALUE = "session-status-dot";
		const BAND_VALUE = "zone-band";
		/**
		* Zone marks written on the HOST's row element — deliberately not on
		* `data-dsh-ux-plus`, which keeps meaning "this child is ours" (the row
		* pairing skips those children). The green Active band is ONE absolutely
		* positioned element behind the whole block (never a background per row), so
		* the rows stay transparent and the host's hover still paints; the selected
		* override is keyed on these attributes.
		*/
		const ZONE_ATTR = "data-dsh-ux-zone";
		/** Status-dot geometry and the one color per status kind (spec §3). */
		const DOT_SIZE = "7px";
		const DOT_COLORS = {
			waiting: "#f59e0b",
			running: "#3b82f6",
			unread: "#22c55e"
		};
		const COMPACT_ROW_HEIGHT = "26px";
		const DORMANT_OPACITY = "0.5";
		/**
		* Text metrics (px) for one session row — the user's density rule. The title is
		* the row's ONLY text (the age trails it, the status is a 7px dot), so the
		* hierarchy lives in these two steps: 13/18 reads a step below the host's 14/20
		* while the row shrinks from 32px to 26px, i.e. one step of extra conversation
		* per screen without the list losing its rhythm.
		*/
		const COMPACT_TITLE_FONT = "13px";
		const COMPACT_TITLE_LEADING = "18px";
		const COMPACT_AGE_FONT = "10px";
		const COMPACT_AGE_LEADING = "14px";
		/** The compact title's lateral margin: the row's own flex gap owns the spacing. */
		const COMPACT_TITLE_MARGIN = "0px";
		/** The Active block's band (spec §2): a green wash, not a translucent overlay. */
		const ZONE_BACKGROUND = "rgba(34, 197, 94, 0.07)";
		/** A selected row INSIDE the band (user rule): the band's own green, stronger. */
		const ZONE_SELECTED = "rgba(34, 197, 94, 0.18)";
		/**
		* Classify one session row into its zone (v0.3.0 spec §1) — the ONE partition
		* rule is last activity: a session running right now, or whose last activity is
		* at most 24 hours old, is Active; everything else is dormant, whatever its
		* status. A pending interaction or an unread completion on a session idle for
		* more than a day therefore belongs to the dormant block: it keeps its status
		* dot, but it no longer pins itself to the top.
		*
		* Pure on purpose (test surface): `now` is an input, never read from the clock
		* here, so the 24h boundary is exactly testable.
		*
		* @param {{now: number, updatedAt: number, status?: object}} input
		* @returns {'active'|'dormant'}
		*/
		function zoneOf(input) {
			const status = input.status;
			if (status !== void 0 && status !== null && status.running === true) return "active";
			return input.now - input.updatedAt <= ACTIVE_MS ? "active" : "dormant";
		}
		/**
		* Classify one session's status into the single dot it carries (spec §3).
		* Precedence: a blocking pendingInteraction outranks a running session, which
		* outranks an unread completion. Pure (test surface).
		*
		* @param {object|undefined|null} status - one `sessionStatus` entry.
		* @returns {'waiting'|'running'|'unread'|'none'}
		*/
		function statusOf(status) {
			if (status === void 0 || status === null) return "none";
			if (status.pendingInteraction !== void 0 && status.pendingInteraction !== null) return "waiting";
			if (status.running === true) return "running";
			if (status.completionUnread === true) return "unread";
			return "none";
		}
		/** A count clamped to a non-negative integer (defensive locale-helper input). */
		function countOf(value) {
			return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
		}
		/** True when the active locale id is Chinese ('zh' prefix wins, else English). */
		function isChinese(locale) {
			return typeof locale === "string" && locale.toLowerCase().startsWith("zh");
		}
		/**
		* The workspace header badge's tooltip for a set of hidden Active-zone counts
		* (spec §5): `2 待回复 · 1 未读` / `2 waiting · 1 unread`, zero parts omitted,
		* and an empty string when there is no hidden attention at all (the caller
		* then removes the badge). Hover and screen readers read the same string.
		* @param {string} locale - active locale id ('zh' prefix wins, else en).
		* @param {{pending?: number, unread?: number, running?: number}} counts
		* @returns {string}
		*/
		function badgeTooltip(locale, counts) {
			const pending = countOf(counts && counts.pending);
			const unread = countOf(counts && counts.unread);
			const running = countOf(counts && counts.running);
			const zh = isChinese(locale);
			const parts = [];
			if (pending > 0) parts.push(zh ? `${pending} 待回复` : `${pending} waiting`);
			if (unread > 0) parts.push(zh ? `${unread} 未读` : `${unread} unread`);
			if (running > 0) parts.push(zh ? `${running} 运行中` : `${running} running`);
			return parts.join(" · ");
		}
		/**
		* The badge's dots (spec §5): at most three kinds, in the fixed reading order
		* waiting (orange) → unread (green) → running (blue); a kind with a zero count
		* contributes no dot. Pure (test surface).
		* @param {{pending?: number, unread?: number, running?: number}} counts
		* @returns {('waiting'|'unread'|'running')[]}
		*/
		function badgeKinds(counts) {
			const kinds = [];
			if (countOf(counts && counts.pending) > 0) kinds.push("waiting");
			if (countOf(counts && counts.unread) > 0) kinds.push("unread");
			if (countOf(counts && counts.running) > 0) kinds.push("running");
			return kinds;
		}
		/** One status dot's localized label, for its title and aria-label (spec §3). */
		function statusLabel(locale, kind) {
			const zh = isChinese(locale);
			if (kind === "waiting") return zh ? "待回复" : "waiting";
			if (kind === "running") return zh ? "运行中" : "running";
			if (kind === "unread") return zh ? "未读" : "unread";
			return "";
		}
		/**
		* The dormant bar's text (spec §4): how many sessions the bar is hiding — the
		* whole dormant block, plus whatever the host's own truncation contributed
		* (the bar absorbs the host's count and hides its button).
		*
		* The 1px lines either side are flex decoration in the style tag, not
		* characters in this string.
		*/
		function foldBarText(locale, count) {
			return isChinese(locale) ? `${countOf(count)} 条历史会话` : `${countOf(count)} earlier sessions`;
		}
		/**
		* The bar's label while the block it owns is revealed (issue 4): the bar
		* stays as the collapse control, so it must say what the click does.
		*/
		function foldBarCollapseText(locale) {
			return isChinese(locale) ? "收起历史会话" : "Collapse history";
		}
		/**
		* The Active-zone members that carry attention (spec §5), split by kind: a
		* member of the workspace with a pending interaction, a live run, or an unread
		* completion — but only while it is Active. Reads the data layer only: the host
		* does not render collapsed rows beyond its quota, so counting DOM rows would
		* undercount exactly when the badge matters. The dormant block is deliberately
		* invisible here — a status older than 24 hours never floats up to the header.
		* Blank placeholders, subagent sessions and archived sessions are not
		* attention (archived rows keep today's treatment).
		*/
		function activeZoneAttention(memberIds, data) {
			const waiting = [];
			const unread = [];
			const running = [];
			if (data.statusMap === null) return {
				waiting,
				unread,
				running
			};
			for (const sessionId of memberIds) {
				const session = data.byId[sessionId];
				if (session === void 0 || session.blank === true || session.origin === "subagent") continue;
				if (data.archived.has(sessionId)) continue;
				const status = data.statusMap.get(sessionId);
				const kind = statusOf(status);
				if (kind === "none") continue;
				if (zoneOf({
					now: data.now,
					updatedAt: session.updatedAt,
					status
				}) === "dormant") continue;
				if (kind === "waiting") waiting.push(sessionId);
				else if (kind === "unread") unread.push(sessionId);
				else running.push(sessionId);
			}
			return {
				waiting,
				unread,
				running
			};
		}
		/**
		* True while a workspace holds work that is happening right now (spec §6): a
		* member that is running or waiting on the user. The group layer lifts such a
		* workspace to "now" and the idle auto-collapse skips it — collapsing it would
		* hide work in progress. Unread completions are deliberately NOT blocking:
		* they wait for the user, so they must not pin a group forever.
		*/
		function hasBlockingAttention(memberIds, data) {
			if (data.statusMap === null) return false;
			for (const sessionId of memberIds) {
				const status = data.statusMap.get(sessionId);
				if (status === void 0 || status === null) continue;
				if (status.running === true || status.pendingInteraction !== void 0 && status.pendingInteraction !== null) return true;
			}
			return false;
		}
		/**
		* Host-shaped relative age ("多久没更新" label text).
		* @param {string} locale - active locale id ('zh' prefix wins, else en).
		* @param {number} ageMs - now - latest activity (ms, clamped at 0).
		* @returns {string} label text, e.g. '3小时' / '2d'.
		*/
		function ageLabel(locale, ageMs) {
			const age = Math.max(0, ageMs);
			const zh = typeof locale === "string" && locale.toLowerCase().startsWith("zh");
			if (age < MINUTE_MS) return zh ? "刚刚" : "now";
			if (age < HOUR_MS) return zh ? `${Math.floor(age / MINUTE_MS)}分钟` : `${Math.floor(age / MINUTE_MS)}m`;
			if (age < DAY_MS) return zh ? `${Math.floor(age / HOUR_MS)}小时` : `${Math.floor(age / HOUR_MS)}h`;
			if (age < MONTH_MS) return zh ? `${Math.floor(age / DAY_MS)}天` : `${Math.floor(age / DAY_MS)}d`;
			if (age < YEAR_MS) return zh ? `${Math.floor(age / MONTH_MS)}个月` : `${Math.floor(age / MONTH_MS)}mo`;
			return zh ? `${Math.floor(age / YEAR_MS)}年` : `${Math.floor(age / YEAR_MS)}y`;
		}
		/** The injected age label among a row's direct children, or null. */
		function findAgeLabel(row) {
			for (const child of row.children) if (child.dataset && child.dataset.dshUxPlus === LABEL_VALUE) return child;
			return null;
		}
		/** The host row's actions span (the label sits before it), or null. */
		function findRowActions(row) {
			for (const child of row.children) if (typeof child.className === "string" && child.className.includes("rowActions")) return child;
			return null;
		}
		/** Remove this feature's age label from a row (idempotent). */
		function removeAgeLabel(row) {
			const label = findAgeLabel(row);
			if (label !== null) label.remove();
		}
		/**
		* Host row visibility (tree.ts:229-253 `sessionVisible`): subagent sessions
		* never render; a blank row renders only while it is the current session;
		* archived rows follow the user's archived filter — 'default' hides them,
		* 'show' mixes them into their kept slots, 'only' restricts the list to them.
		* The filter is an input, not a constant: hard-coding 'default' made this
		* replay disagree with the host the moment the sidebar was set to show
		* archives, and the row layer then failed its count check and no-op'd.
		*/
		function rowVisible(session, id, currentId, archived, archivedFilter) {
			if (session === void 0 || session.origin === "subagent") return false;
			if (session.blank === true && id !== currentId) return false;
			if (archivedFilter === "show") return true;
			if (archivedFilter === "only") return archived.has(id);
			return !archived.has(id);
		}
		/**
		* Host recency projection (tree.ts:144-157): known members newest first,
		* session id as the deterministic tie-break; members without a summary are
		* omitted until theirs arrives.
		*/
		function orderByRecency(memberIds, byId) {
			const known = [];
			for (const id of memberIds) {
				const session = byId[id];
				if (session === void 0) continue;
				known.push({
					id,
					updatedAt: session.updatedAt
				});
			}
			known.sort((a, b) => a.updatedAt !== b.updatedAt ? b.updatedAt - a.updatedAt : a.id < b.id ? -1 : 1);
			return known.map((member) => member.id);
		}
		/**
		* Host manual-order reconciliation (tree.ts:166-200), ported exactly: retained
		* saved slots first, then non-archived pinned members, then the remaining
		* known members by recency, then archived members last; a new fork is spliced
		* in front of its parent. `rowState` carries the registry-global pin and
		* archive sets — omitting them (the historical 3-argument shape) made this
		* replay drop the pin block and the archive partition, so its result no longer
		* matched what the host renders and the row layer silently stopped pairing.
		*/
		function reconcileManualOrder(memberIds, savedOrder, byId, rowState) {
			const members = new Map(memberIds.map((id) => [id, id]));
			const included = /* @__PURE__ */ new Set();
			const ordered = [];
			for (const key of savedOrder ?? []) {
				const id = members.get(key);
				if (id === void 0 || included.has(key)) continue;
				ordered.push(id);
				included.add(key);
			}
			const archived = new Set(rowState && rowState.archived ? rowState.archived : []);
			const pins = [];
			for (const sessionId of rowState && rowState.pinned ? rowState.pinned : []) {
				const id = members.get(sessionId);
				if (id === void 0 || included.has(id) || archived.has(id) || byId[id] === void 0) continue;
				pins.push(id);
				included.add(id);
			}
			const ordinary = [];
			const archives = [];
			for (const id of orderByRecency(memberIds.filter((id) => !included.has(id)), byId)) if (archived.has(id)) archives.push(id);
			else ordinary.push(id);
			const result = [
				...pins,
				...ordered,
				...ordinary,
				...archives
			];
			const pending = new Set(ordinary);
			const placeFork = (id) => {
				if (!pending.delete(id)) return;
				const parentId = byId[id] && byId[id].parentId;
				if (parentId === void 0 || parentId === id || !result.includes(parentId)) return;
				placeFork(parentId);
				result.splice(result.indexOf(id), 1);
				result.splice(result.indexOf(parentId), 0, id);
			};
			for (const id of [...ordinary].reverse()) placeFork(id);
			return result;
		}
		/**
		* Host section partition (tree.ts:273-287 `sectionMembers`), applied AFTER the
		* order projection and the visibility filter: blank placeholders first, then
		* non-archived pinned rows, then the rest in the projected order. The host
		* runs it on every group and flat list, so a section holding a pinned session
		* renders that session ahead of the projected order — replaying without it
		* pairs DOM rows against the wrong sessions.
		*/
		function sectionPartition(ids, data) {
			const placeholders = [];
			const leading = [];
			const rest = [];
			for (const id of ids) {
				const session = data.byId[id];
				if (session === void 0) continue;
				if (session.blank === true) placeholders.push(id);
				else if (!data.archived.has(id) && data.pinned.has(id)) leading.push(id);
				else rest.push(id);
			}
			return [
				...placeholders,
				...leading,
				...rest
			];
		}
		/**
		* Host blank pinning (tree.ts:194-200): the selected blank row first, no
		* duplicate slot.
		*/
		function pinCurrentBlank(order, currentBlank) {
			if (currentBlank === void 0) return [...order];
			return [currentBlank, ...order.filter((id) => id !== currentBlank)];
		}
		/**
		* The live host ordering inputs, read from the host store's own persisted
		* snapshot (read-only, W-2). The host writes the whole workspace-view state
		* to the key on every change (store/src/index.ts:146-166), so it is the live
		* orderBy / sessionOrderByAccount — no subscription needed, and this feature
		* never writes to it. Absent/unreadable state falls back to the host default
		* view (orderBy 'updated').
		*/
		function readViewStore() {
			try {
				const raw = window.localStorage.getItem(VIEW_STORE_KEY);
				if (raw === null) return null;
				const state = JSON.parse(raw);
				if (state === null || typeof state !== "object") return null;
				return state;
			} catch (err) {
				return null;
			}
		}
		function viewOrdering() {
			const state = readViewStore();
			const archivedFilter = state !== null && (state.archivedFilter === "show" || state.archivedFilter === "only") ? state.archivedFilter : "default";
			if (state === null || state.orderBy !== "manual") return {
				orderBy: "updated",
				saved: void 0,
				archivedFilter
			};
			const saved = state.sessionOrderByAccount;
			return {
				orderBy: "manual",
				saved: saved !== null && typeof saved === "object" ? saved : void 0,
				archivedFilter
			};
		}
		/**
		* The host's actual rendered row order for one section account
		* (WorkspaceBrowser.tsx:804-838 + tree.ts:144-212): the recency or manual
		* projection over the account's members, the current blank pinned first,
		* then the host visibility filter. For the ungrouped bucket this is exactly
		* what the host's double projection (orderedUngrouped over the already
		* projected bucket order) collapses to, because the projected order covers
		* every stray member.
		*/
		function renderedOrder(memberIds, key, data, view) {
			const byId = data.byId;
			return sectionPartition(pinCurrentBlank(view.orderBy === "manual" ? reconcileManualOrder(memberIds, view.saved ? view.saved[key] : void 0, byId, {
				pinned: data.pinned,
				archived: data.archived
			}) : orderByRecency(memberIds, byId), data.currentId !== void 0 && memberIds.includes(data.currentId) && byId[data.currentId] !== void 0 && byId[data.currentId].blank === true ? data.currentId : void 0).filter((id) => rowVisible(byId[id], id, data.currentId, data.archived, view.archivedFilter)), data);
		}
		/**
		* Host row-exemption rule (rows/WorkspaceBrowser.tsx:55-70): a row is exempt
		* from the collapsed idle quota when it is blank, running, or a parent with a
		* running subagent. Only idle rows count against the quota, so a collapsed
		* section renders more than COLLAPSED_SESSION_LIMIT rows whenever it holds a
		* running conversation (1 running + 5 idle is the common shape) — the exact
		* case where a blank-only port replays a shorter slice, trips the count gate
		* and leaves the section's row layer silently off (stale row on top, running
		* session below it).
		*/
		function rowExempt(session, id, data) {
			return Boolean(session.blank) || Boolean(session.running) || runningChildCount(data, id) > 0;
		}
		/**
		* The host's running-subagent count for one parent row (tree.ts:390-395):
		* the session's `subagentCatalog` projection values, counting children whose
		* live row reports running. The host reads the ui-session status store first
		* and falls back to the list row; this feature owns no statuses service, so
		* it reads the same fallback (`byId[childId].running`). A divergence only
		* lowers the exemption count, which the count gate then fails closed on — it
		* can never paint a wrong order.
		*/
		function runningChildCount(data, parentId) {
			const projections = data.projectionsBySession;
			const catalog = projections !== void 0 && projections !== null ? projections[parentId]?.values?.subagentCatalog : void 0;
			if (!Array.isArray(catalog)) return 0;
			let count = 0;
			for (const child of catalog) {
				const row = data.byId[child.id];
				if (row !== void 0 && row.running === true) count += 1;
			}
			return count;
		}
		/**
		* The host's collapsed slice (rows/WorkspaceBrowser.tsx:55-70) over the
		* replayed row order: every exempt row keeps its rendered position, and only
		* the first `limit` idle rows survive. `limit` is the host's PER-GROUP React
		* state — 5, then +5 per "展开更多" click, Infinity once nothing is hidden
		* (WorkspaceBrowser.tsx:300/581-601) — so callers must not assume the 5
		* default; collapsedShown derives the live quota from the DOM.
		*/
		function collapsedRows(ids, data, limit = COLLAPSED_SESSION_LIMIT) {
			let idle = 0;
			return ids.filter((id) => {
				if (rowExempt(data.byId[id], id, data)) return true;
				if (idle >= limit) return false;
				idle += 1;
				return true;
			});
		}
		/**
		* The slice the host actually rendered, given the row count the DOM shows.
		*
		* A truncated section renders `totalExempt + limit` rows, so the live quota
		* is derivable: `limit = domCount - exempt`. The host only ever uses 5, 10,
		* 15… (the +5 step) or the whole list, so a count that does not land on a
		* multiple of COLLAPSED_SESSION_LIMIT is drift, not a quota — the default is
		* handed to the count gate, which fails closed instead of guessing.
		*
		* @returns {string[] | null} the slice, or null when the whole group is
		* folded (no rows rendered while the replay expects rows).
		*/
		function collapsedShown(expected, data, domCount) {
			if (domCount >= expected.length) return expected;
			if (domCount === 0) return null;
			const limit = domCount - expected.filter((id) => rowExempt(data.byId[id], id, data)).length;
			return collapsedRows(expected, data, limit > 0 && limit % COLLAPSED_SESSION_LIMIT === 0 ? limit : COLLAPSED_SESSION_LIMIT);
		}
		/**
		* Index of the first paired row that does not confirm its session, or -1 when
		* every pairing is confirmed. Same rule `pairingTrustworthy` documents; the
		* index exists so a bail-out can say where it broke instead of saying nothing.
		*/
		function firstUnpairedRow(rows, shown, byId) {
			for (let i = 0; i < shown.length; i += 1) {
				const session = byId[shown[i]];
				if (session === void 0) return i;
				if (session.blank === true) {
					if (i !== 0) return i;
					continue;
				}
				const title = session.displayTitle;
				if (typeof title !== "string" || title === "") return i;
				const target = normalizeText(title);
				if (target === "") return i;
				if (!rowCarriesTitle(rows[i], target)) return i;
			}
			return -1;
		}
		/**
		* True when the row's whole text, or a leaf element (no element children) in
		* its subtree, has normalized text starting with the normalized title. The
		* row's whole text is the historical pairing signal (in the host DOM, the
		* wrapper's textContent is the row's leading text); the leaf walk is what
		* makes host-shaped rows confirmable despite the status badge the host
		* renders before the title — the title span is a leaf, the status leaf is
		* not the title, and the time leaf cannot confirm. Walking element children
		* (not querySelectorAll) keeps this identical for the host DOM and for the
		* plain-object row fixtures in tests.
		*/
		function rowCarriesTitle(row, target) {
			if (normalizeText(row.textContent).startsWith(target)) return true;
			for (const child of row.children) if (leafConfirms(child, target)) return true;
			return false;
		}
		/** True when a leaf element (no element children) in the subtree does. */
		function leafConfirms(el, target) {
			if (el.children.length === 0) return normalizeText(el.textContent).startsWith(target);
			for (const child of el.children) if (leafConfirms(child, target)) return true;
			return false;
		}
		/**
		* The ungrouped bucket's members: every session no workspace claims (host
		* accounting, WorkspaceBrowser.tsx:809-812 — hidden members included).
		*/
		function ungroupedMembers(data) {
			const owned = /* @__PURE__ */ new Set();
			for (const workspace of data.items) for (const sessionId of workspace.sessionIds) owned.add(sessionId);
			return Object.keys(data.byId).filter((id) => !owned.has(id));
		}
		/** A group header row: role="treeitem" carrying aria-expanded. */
		function isHeaderRow(element) {
			return element.getAttribute("role") === "treeitem" && element.hasAttribute("aria-expanded");
		}
		/** A session row: role="treeitem" without aria-expanded. */
		function isSessionRow(element) {
			return element.getAttribute("role") === "treeitem" && !element.hasAttribute("aria-expanded");
		}
		/** True when element (or a descendant within WALK_DEPTH) is a group header row. */
		function hasHeaderRow(element, depth) {
			if (depth > WALK_DEPTH) return false;
			if (isHeaderRow(element)) return true;
			for (const child of element.children) if (hasHeaderRow(child, depth + 1)) return true;
			return false;
		}
		/** True when element (or a descendant within WALK_DEPTH) is a session row. */
		function hasSessionRow(element, depth) {
			if (depth > WALK_DEPTH) return false;
			if (isSessionRow(element)) return true;
			for (const child of element.children) if (hasSessionRow(child, depth + 1)) return true;
			return false;
		}
		/** A group section: a tree child carrying a section header row. */
		function isSection(element) {
			return hasHeaderRow(element, 0);
		}
		/**
		* The section's session-row children (direct children whose subtree is a
		* session row). The host wraps each row in one span, so the styled element
		* is the direct child — that is the flex item receiving `order`.
		*/
		function rowChildren(section) {
			const rows = [];
			for (const child of section.children) {
				if (child.dataset !== void 0 && child.dataset !== null && child.dataset.dshUxPlus !== void 0 && child.dataset.dshUxPlus !== null && child.dataset.dshUxPlus !== "") continue;
				if (child.getAttribute("role") === "group") continue;
				if (child.tagName === "BUTTON") continue;
				if (isSection(child)) continue;
				if (hasSessionRow(child, 0)) rows.push(child);
			}
			return rows;
		}
		/** The section's nested-group container (<div role="group">), or null. */
		function groupContainer(section) {
			for (const child of section.children) if (child.getAttribute("role") === "group") return child;
			return null;
		}
		/** The section's overflow ("展开更多") button, or null while absent. */
		function overflowButton(section) {
			for (const child of section.children) if (child.tagName === "BUTTON") return child;
			return null;
		}
		/** The group is collapsed when the overflow button is present and unexpanded. */
		function sectionCollapsed(section) {
			const button = overflowButton(section);
			return button !== null && button.getAttribute("aria-expanded") === "false";
		}
		/**
		* Row geometry (user rule: the compact, Claude-like sidebar). ONE box for
		* Active, dormant and archived rows alike — the host pins `.sessionRow { height:
		* 32px; padding: 0 8px; gap: 0 }` in CSS (Rows.module.css:110-117), so inline
		* values are the only way to re-dress it, and a uniform box is what keeps the
		* list even (the Active block is told apart by its green band and its status
		* dots, never by a taller row). Dormant is the one difference that survives: it
		* fades. Archives keep the host's own dimming class on top of this box.
		*
		* The leading pad is deliberately NOT in this spec. The host sets
		* `padding-inline-start: calc(8px + var(--dsh-workspace-indent, 0px))`
		* (Rows.module.css:8) and that variable is the tree depth the browser publishes
		* on the ancestor group section (WorkspaceBrowser.tsx:462, depth * 12px), so an
		* inline `padding-inline` shorthand would flatten every nested row's indent to a
		* constant. Only the trailing pad is this layer's business.
		*
		* `boxSizing` is part of the box on purpose. The host has no global border-box
		* reset (ui-theme ships only `* { margin: 0 }`-style base rules) and
		* `.sessionRow` is the one row kind that does not opt in, so with the default
		* content-box a `height: 26px` plus 1px of block padding renders 28px — a
		* measured 28px box, not a 26px one. The sibling kinds do opt in
		* (Rows.module.css: `.projectRow { height: 34px; box-sizing: border-box }`,
		* same for `.searchResultRow`), so the compact box declares border-box and the
		* height it names is the height the browser paints.
		*/
		const ROW_DENSITY = {
			boxSizing: "border-box",
			height: COMPACT_ROW_HEIGHT,
			paddingBlock: "1px",
			paddingInlineEnd: "6px",
			gap: "4px",
			opacity: null
		};
		const DORMANT_DENSITY = {
			boxSizing: "border-box",
			height: COMPACT_ROW_HEIGHT,
			paddingBlock: "1px",
			paddingInlineEnd: "6px",
			gap: "4px",
			opacity: DORMANT_OPACITY
		};
		/** The inline properties the density layer owns (restored when not in use). */
		const DENSITY_PROPERTIES = [
			"boxSizing",
			"height",
			"paddingBlock",
			"paddingInlineEnd",
			"gap",
			"opacity"
		];
		/**
		* The row's own text cells, re-dressed to the compact metrics. The title is the
		* row's only text (the age trails it, status is a dot), so these two are the
		* whole typography of a session row — the host's `.title` (14px/20px, and its
		* own 6px/4px lateral margins at Rows.module.css:115-117) and `.time`
		* (10px/16px) all live in CSS, hence inline again. The title's margins give way
		* to the row's 4px flex gap, as in the Claude sidebar this matches.
		*/
		const COMPACT_TARGETS = [{
			selector: ".title",
			styles: {
				fontSize: COMPACT_TITLE_FONT,
				lineHeight: COMPACT_TITLE_LEADING,
				marginLeft: COMPACT_TITLE_MARGIN,
				marginRight: COMPACT_TITLE_MARGIN
			}
		}, {
			selector: ".time",
			styles: {
				fontSize: COMPACT_AGE_FONT,
				lineHeight: COMPACT_AGE_LEADING
			}
		}];
		/**
		* Re-dress one row's text cells. `selector` is tried first and each target
		* listed there is compacted; an element exposing no selector engine (the plain
		* object fixtures) is left alone rather than guessed at — the metrics are a
		* presentation nicety, never a reason to touch a row the pairing already
		* accepted. Every element written is remembered so `relaxRow` can put it back
		* the moment the row stops being a session row we style.
		*/
		function compactRow(styles, row) {
			if (typeof row.querySelectorAll !== "function") return;
			for (const target of COMPACT_TARGETS) {
				let found = null;
				try {
					found = row.querySelectorAll(target.selector);
				} catch {
					continue;
				}
				for (const element of found) for (const property of Object.keys(target.styles)) styles.write(element, property, target.styles[property]);
			}
		}
		/** Undo compactRow for one row (archived rows and dispose get the host back). */
		function relaxRow(styles, row) {
			if (typeof row.querySelectorAll !== "function") return;
			for (const target of COMPACT_TARGETS) {
				let found = null;
				try {
					found = row.querySelectorAll(target.selector);
				} catch {
					continue;
				}
				for (const element of found) for (const property of Object.keys(target.styles)) styles.restore(element, property);
			}
		}
		/** The workspace header row's aria-expanded state (undefined while unreadable). */
		function sectionExpanded(section) {
			const row = sectionHeaderRow(section, 0);
			if (row === null || typeof row.getAttribute !== "function") return void 0;
			const value = row.getAttribute("aria-expanded");
			if (value === "true") return true;
			if (value === "false") return false;
		}
		/**
		* The element a row's density is written on: the host's own `data-row-key`
		* row when the flex item IS the row, else the first such row inside the flex
		* item (the host wraps each row in one span), else the flex item itself. The
		* guards exist because the test fixtures are plain objects without matches()
		* or firstElementChild — a missing method must never cost a row its styling.
		*/
		function rowElementOf(entry) {
			const element = entry.element;
			if (element === void 0 || element === null) return element;
			if (typeof element.matches === "function") try {
				if (element.matches("[data-row-key^=\"session:\"]")) return element;
			} catch {}
			if (typeof element.querySelector === "function") {
				const inner = element.querySelector("[data-row-key^=\"session:\"]");
				if (inner !== null && inner !== void 0) return inner;
			}
			return element.firstElementChild || element;
		}
		/**
		* This row's zone (spec §1). Leading rows — the current blank and the user's
		* own pins — count as Active whatever their timestamp: they keep the host's
		* front positions, and folding a pin away behind the dormant bar would fight an
		* explicit user action. Only called with a status map (degraded mode has no
		* zones, no dots and no bar at all).
		*/
		function zoneEntryOf(entry, data) {
			if (entry.leading === true) return "active";
			return zoneOf({
				now: data.now,
				updatedAt: entry.session.updatedAt,
				status: data.statusMap.get(entry.session.id)
			});
		}
		/** The density spec for one ranked row (spec §2/§4). */
		function densitySpec(entry, data) {
			if (data.archived.has(entry.session.id)) return null;
			return entry.zone === "active" ? ROW_DENSITY : DORMANT_DENSITY;
		}
		/**
		* Apply one density spec, restoring every property the spec does not use. A
		* null spec (an archived row) means "host metrics exactly": every property this
		* layer owns goes back, so a row that just left the archive is not stuck in the
		* box the previous pass wrote.
		*/
		function applyDensity(styles, element, spec) {
			if (element === void 0 || element === null) return;
			for (const property of DENSITY_PROPERTIES) {
				const value = spec === null ? null : spec[property];
				if (value === void 0 || value === null) styles.restore(element, property);
				else styles.write(element, property, value);
			}
		}
		/** True when the element carries the host's own status attribute. */
		function hasDataState(element) {
			return element !== void 0 && element !== null && typeof element.getAttribute === "function" && element.getAttribute("data-state") !== null;
		}
		/** The host's own status dot in this row (the slot or its first marked child). */
		function hostStatusDot(row) {
			for (const child of row.children) {
				if (hasDataState(child)) return child;
				for (const inner of child.children) if (hasDataState(inner)) return inner;
			}
			return null;
		}
		/**
		* This feature's status dot in a row, or null. The host row nests it one level
		* down — inside the leading slot, ahead of the host's own dot — so the walk
		* mirrors hostStatusDot's; a pass that could not see its own dot would stack a
		* new one on every recompute.
		*/
		function findStatusDot(row) {
			for (const child of row.children) {
				if (child.dataset !== void 0 && child.dataset !== null && child.dataset.dshUxPlus === DOT_VALUE) return child;
				for (const inner of child.children) if (inner.dataset !== void 0 && inner.dataset !== null && inner.dataset.dshUxPlus === DOT_VALUE) return inner;
			}
			return null;
		}
		/** The row's leading slot: its first child that is not one of our markers. */
		function dotSlotOf(row) {
			for (const child of row.children) {
				if (child.dataset !== void 0 && child.dataset !== null && child.dataset.dshUxPlus) continue;
				return child;
			}
			return row;
		}
		/** Paint one dot (spec §3): solid orange/green, or a blue ring for running. */
		function styleDot(dot, kind) {
			if (dot === void 0 || dot === null) return;
			if (kind === "running") {
				dot.style.backgroundColor = "";
				dot.style.border = `2px solid ${DOT_COLORS.running}`;
				dot.style.borderTopColor = "transparent";
			} else {
				dot.style.backgroundColor = DOT_COLORS[kind];
				dot.style.border = "";
				dot.style.borderTopColor = "";
			}
			if (dot.dataset !== void 0 && dot.dataset !== null) dot.dataset.dshUxKind = kind;
		}
		/** Put the host's own dot back (idempotent; also what dispose ends with). */
		function restoreHostDot(row, data) {
			const host = hostStatusDot(row);
			if (host !== null) data.styles.restore(host, "display");
		}
		/**
		* Draw this row's status dot (spec §3), or take ours back out when the session
		* has no status at all — then the host's own dot shows again. The dot is
		* inserted at the front of the row's leading slot, its localized label carried
		* as `title` and `aria-label` (role="img", like the host's own PinnedIndicator:
		* a bare span labelled only by aria-label is not reliably announced).
		*/
		function ensureStatusDot(row, kind, locale, data) {
			const existing = findStatusDot(row);
			if (kind === "none") {
				if (existing !== null) detach(existing, data.dots);
				restoreHostDot(row, data);
				return;
			}
			let dot = existing;
			if (dot === null) {
				dot = document.createElement("span");
				dot.dataset.dshUxPlus = DOT_VALUE;
				dot.style.flex = "none";
				dot.style.display = "inline-block";
				dot.style.width = DOT_SIZE;
				dot.style.height = DOT_SIZE;
				dot.style.borderRadius = "50%";
				dot.style.boxSizing = "border-box";
				const slot = dotSlotOf(row);
				if (slot === row || typeof slot.insertBefore !== "function") row.appendChild(dot);
				else slot.insertBefore(dot, slot.children.length > 0 ? slot.children[0] : null);
				data.dots.add(dot);
			}
			const label = statusLabel(locale, kind);
			if (typeof dot.setAttribute === "function") {
				dot.setAttribute("title", label);
				dot.setAttribute("aria-label", label);
				dot.setAttribute("role", "img");
			}
			styleDot(dot, kind);
			const host = hostStatusDot(row);
			if (host !== null && host !== dot) data.styles.write(host, "display", "none");
		}
		/**
		* Mark the host row element with its zone (spec §2). An attribute — never an
		* inline background — so the host's own hover still paints over the band;
		* the selected override in the style tag keys on it too. Every marked row is
		* remembered for an exact dispose.
		*/
		function markZone(row, zone, data) {
			if (row === void 0 || row === null || typeof row.setAttribute !== "function") return;
			if (zone !== "active") {
				if (typeof row.removeAttribute === "function") row.removeAttribute(ZONE_ATTR);
				return;
			}
			row.setAttribute(ZONE_ATTR, "active");
			data.zoneMarked.add(row);
		}
		/** This feature's Active band among a section's children, or null. */
		function findZoneBand(section) {
			for (const child of section.children) if (child.dataset !== void 0 && child.dataset !== null && child.dataset.dshUxPlus === BAND_VALUE) return child;
			return null;
		}
		/**
		* The band sits at z-index:-1, which only paints above the panel background
		* when the section is a stacking context — otherwise it sinks behind the
		* whole sidebar and vanishes. `isolation:isolate` creates that context
		* without the position:relative trap (a positioned section turns FLIP-
		* transformed rows into their own offset parent, which poisons offsetTop
		* measurement); position:relative is claimed only as a fallback for rows
		* without measurable rects.
		*/
		function claimBandContext(section, data) {
			data.styles.write(section, "isolation", "isolate");
			if (!hasRects(section)) data.styles.write(section, "position", "relative");
			else data.styles.restore(section, "position");
		}
		/** Undo claimBandContext on one section. */
		function releaseBandContext(section, data) {
			data.styles.restore(section, "isolation");
			data.styles.restore(section, "position");
		}
		/** Whether this section's rows expose usable client rects. */
		function hasRects(section) {
			for (const row of rowChildren(section)) if (typeof row.getBoundingClientRect === "function") {
				const rect = row.getBoundingClientRect();
				if (rect !== void 0 && rect !== null && typeof rect.top === "number") return true;
			}
			return false;
		}
		/**
		* One continuous band behind the WHOLE Active block (user rule: the block
		* shares one background, not one background per row) — a single absolutely
		* positioned element spanning the block's flex items, its corners from the
		* style tag. The rows keep transparent backgrounds, so the host's hover and
		* the selected green paint ON TOP of the band. Geometry is re-measured on
		* every pass from client rects (viewport coordinates, immune to transforms
		* and offsetParent games): top = first row's top, bottom = last row's bottom.
		*/
		function ensureZoneBand(section, ordered, data) {
			const active = [];
			for (const entry of ordered) if (entry.zone === "active" && !data.archived.has(entry.session.id)) active.push(entry.element);
			let band = findZoneBand(section);
			if (active.length === 0) {
				if (band !== null) {
					releaseBandContext(section, data);
					detach(band, data.bands);
				}
				return;
			}
			if (band === null) {
				band = document.createElement("div");
				band.dataset.dshUxPlus = BAND_VALUE;
				data.bands.add(band);
			}
			if (band.parentNode !== section) section.appendChild(band);
			claimBandContext(section, data);
			const first = active[0];
			const last = active[active.length - 1];
			const firstRect = typeof first.getBoundingClientRect === "function" ? first.getBoundingClientRect() : null;
			const lastRect = typeof last.getBoundingClientRect === "function" ? last.getBoundingClientRect() : null;
			if (firstRect !== null && lastRect !== null && typeof firstRect.top === "number" && typeof lastRect.bottom === "number") {
				const sectionRect = typeof section.getBoundingClientRect === "function" ? section.getBoundingClientRect() : null;
				const origin = sectionRect !== null && typeof sectionRect.top === "number" ? sectionRect.top : 0;
				data.styles.write(band, "top", `${Math.round(firstRect.top - origin)}px`);
				data.styles.write(band, "height", `${Math.max(0, Math.round(lastRect.bottom - firstRect.top))}px`);
			} else {
				const top = typeof first.offsetTop === "number" ? first.offsetTop : 0;
				const lastTop = typeof last.offsetTop === "number" ? last.offsetTop : 0;
				const lastHeight = typeof last.offsetHeight === "number" ? last.offsetHeight : 0;
				data.styles.write(band, "top", `${top}px`);
				data.styles.write(band, "height", `${Math.max(0, lastTop + lastHeight - top)}px`);
			}
		}
		/** This feature's injected dormant bar among a section's children, or null. */
		function findFoldRow(section) {
			for (const child of section.children) if (child.dataset !== void 0 && child.dataset !== null && child.dataset.dshUxPlus === FOLD_VALUE) return child;
			return null;
		}
		/** Detach one element this feature injected, whichever DOM it lives in. */
		function detach(element, set) {
			if (element === void 0 || element === null) return;
			if (set !== void 0 && set !== null) set.delete(element);
			if (typeof element.remove === "function") {
				element.remove();
				return;
			}
			if (element.parentNode !== null && element.parentNode !== void 0) element.parentNode.removeChild(element);
		}
		/** One 1px hairline of the dormant bar (spec §4), flex-sized on either side. */
		function barLine() {
			const line = document.createElement("span");
			line.dataset.dshUxPlus = `${FOLD_VALUE}-line`;
			line.style.flex = "1 1 auto";
			line.style.height = "1px";
			line.style.background = "currentColor";
			line.style.opacity = "0.35";
			return line;
		}
		/**
		* Insert (or refresh) the section's dormant bar (spec §4) — the section's last
		* flex item, ranked in the slot between the Active block and the dormant block
		* it hides (the host's overflow button keeps its 999). The bar is this
		* feature's ONLY text: a centered count between two hairlines. Its click
		* reveals the dormant block for the rest of the page load only (a page-load Set
		* in client(): folding is a presentation decision, never persisted state) and,
		* while the host's own control is collapsed, proxies the host's expand click —
		* one bar drives both truncation systems instead of two stacked rows.
		*/
		function ensureFoldBar(section, data, key, text, expanded, order) {
			let bar = findFoldRow(section);
			if (bar === null) {
				bar = document.createElement("div");
				bar.dataset.dshUxPlus = FOLD_VALUE;
				const button = document.createElement("button");
				if (typeof button.setAttribute === "function") button.setAttribute("type", "button");
				button.style.display = "flex";
				button.style.alignItems = "center";
				button.style.gap = "6px";
				button.style.background = "none";
				button.style.border = "none";
				button.style.color = "var(--dsw-alias-label-tertiary, #8a8f98)";
				button.style.fontSize = "11px";
				button.style.fontFamily = "inherit";
				button.style.cursor = "pointer";
				button.style.padding = "2px 8px";
				button.style.width = "100%";
				const label = document.createElement("span");
				label.dataset.dshUxPlus = `${FOLD_VALUE}-label`;
				label.style.whiteSpace = "nowrap";
				button.appendChild(barLine());
				button.appendChild(label);
				button.appendChild(barLine());
				if (typeof button.addEventListener === "function") button.addEventListener("click", (event) => {
					if (event !== void 0 && event !== null && typeof event.stopPropagation === "function") event.stopPropagation();
					const host = bar.parentNode === null || bar.parentNode === void 0 ? null : overflowButton(bar.parentNode);
					if (host !== null) {
						if (typeof host.click === "function") host.click();
					} else data.onToggleReveal(key);
				});
				bar.appendChild(button);
				data.foldRows.add(bar);
			}
			bar.dataset.dshUxPlusKey = key;
			if (bar.parentNode !== section) section.appendChild(bar);
			data.styles.write(bar, "order", order);
			const button = bar.children[0];
			if (button !== void 0 && button !== null) {
				const label = button.children[1];
				if (label !== void 0 && label !== null) label.textContent = text;
				if (typeof button.setAttribute === "function") {
					button.setAttribute("aria-expanded", expanded === true ? "true" : "false");
					button.setAttribute("title", text);
				}
			}
			return bar;
		}
		/** Take the fold row back out of the section (nothing left to fold). */
		function removeFoldRow(section, data) {
			const row = findFoldRow(section);
			if (row === null) return;
			data.styles.restore(row, "order");
			detach(row, data.foldRows);
		}
		/**
		* The count the host's own overflow button reports as hidden, parsed from its
		* label ("展开其余 1 个会话" / "Expand 1 more session"). 0 while the button
		* is absent or already expanded (its label then reads "收起" with no number).
		*/
		function hostHiddenCount(button) {
			if (button === null) return 0;
			if (button.getAttribute("aria-expanded") === "true") return 0;
			const match = String(button.textContent === void 0 ? "" : button.textContent).match(/\d+/);
			return match === null ? 0 : Number(match[0]);
		}
		/**
		* Collapse the section's dormant block behind the thin bar (spec §4).
		*
		* Every dormant row is hidden by default — the whole zone, not a surplus above
		* a visible quota — while staying in the DOM: only `display` is written, so the
		* replay count and the row↔session pairing keep matching. Archived rows keep
		* today's treatment (they never fold), and neither does a leading row: the
		* current blank and the user's pins are Active for that reason alone.
		*
		* Reveal truth (issue 4): while the host truncates, the reveal FOLLOWS the
		* host's own aria-expanded — one control, one state, so the host's 收起 folds
		* everything back together and no revealed row is ever stranded. Without a
		* host control the bar toggles this section's revealed Set (page load only:
		* folding is a presentation decision, never persisted state) and stays on
		* screen as the collapse control.
		*
		* While the bar shows, the host's collapsed overflow button is hidden and
		* absorbed into it: its hidden count joins the bar's label and the bar's click
		* proxies the host's expand, so the section carries exactly one truncation row.
		* An expanded host button ("收起") stays visible — it is a collapse control,
		* not a competing truncation row.
		*/
		function applyFold(section, account, ordered, data) {
			const dormant = [];
			for (const entry of ordered) {
				if (entry.zone !== "dormant") continue;
				if (data.archived.has(entry.session.id)) continue;
				dormant.push(entry);
			}
			const host = overflowButton(section);
			const revealed = host !== null ? host.getAttribute("aria-expanded") === "true" : data.revealed.has(account.key);
			const hidden = revealed ? [] : dormant;
			const hiddenElements = /* @__PURE__ */ new Set();
			for (const entry of hidden) hiddenElements.add(entry.element);
			for (const entry of ordered) if (hiddenElements.has(entry.element)) data.styles.write(entry.element, "display", "none");
			else data.styles.restore(entry.element, "display");
			const hostHidden = hostHiddenCount(host);
			const activeCount = ordered.reduce((total, entry) => entry.zone === "active" ? total + 1 : total, 0);
			const barRank = String(10 + activeCount);
			if (hidden.length === 0 && hostHidden === 0) {
				if (revealed && host === null) {
					ensureFoldBar(section, data, account.key, foldBarCollapseText(data.locale), true, barRank);
					return;
				}
				removeFoldRow(section, data);
				if (host !== null) data.styles.restore(host, "display");
				return;
			}
			if (host !== null && host.getAttribute("aria-expanded") === "false") data.styles.write(host, "display", "none");
			else if (host !== null) data.styles.restore(host, "display");
			ensureFoldBar(section, data, account.key, foldBarText(data.locale, hidden.length + hostHidden), revealed, barRank);
		}
		/**
		* Fallback absorption (issue 3): when the row layer bails on count or pairing
		* drift, the section must STILL carry exactly one truncation row. The host
		* button's own label is host truth and needs no row pairing, so the bar still
		* absorbs it; anything this feature hid on an earlier successful pass is put
		* back, and the band (which would strand at stale geometry) is taken out.
		*/
		function absorbHostTruncation(section, account, data) {
			if (data.statusMap === null) return;
			for (const row of rowChildren(section)) data.styles.restore(row, "display");
			const band = findZoneBand(section);
			if (band !== null) {
				releaseBandContext(section, data);
				detach(band, data.bands);
			}
			const host = overflowButton(section);
			const hostHidden = hostHiddenCount(host);
			if (hostHidden === 0) {
				if (host !== null) data.styles.restore(host, "display");
				removeFoldRow(section, data);
				return;
			}
			data.styles.write(host, "display", "none");
			ensureFoldBar(section, data, account.key, foldBarText(data.locale, hostHidden), false, FOLD_ROW_ORDER);
		}
		/** This feature's attention badge among a row's children, or null. */
		function findBadge(row) {
			for (const child of row.children) if (child.dataset !== void 0 && child.dataset !== null && child.dataset.dshUxPlus === BADGE_VALUE) return child;
			return null;
		}
		/**
		* The attention the section's header must speak for (spec §5), or null when no
		* badge belongs on this section's header.
		*
		* Two rules, both load-bearing. Only the ACTIVE block is ever counted — a
		* status sitting in the dormant block never floats up to the header, so a
		* workspace whose only pending session is a week old no longer claims
		* attention it has already outlived. And only what is NOT visible is counted:
		* a collapsed workspace renders no rows at all (every Active-zone attention
		* member is hidden); an expanded workspace whose host overflow button is
		* present renders only its quota (the Active-zone attention members outside
		* the replayed slice are hidden); an expanded workspace with no overflow
		* button shows everything, so attention needs no badge.
		*
		* Counts come from the data layer × the status map, never from counting DOM
		* rows — the host does not render collapsed rows beyond its quota, so a DOM
		* count would undercount exactly when the badge matters.
		*/
		function hiddenAttention(section, account, data, view) {
			const attention = activeZoneAttention(account.memberIds, data);
			if (attention.waiting.length + attention.unread.length + attention.running.length === 0) return null;
			if (sectionExpanded(section) === false) return {
				pending: attention.waiting.length,
				unread: attention.unread.length,
				running: attention.running.length
			};
			if (overflowButton(section) === null) return null;
			const rows = rowChildren(section);
			const shown = collapsedShown(renderedOrder(account.memberIds, account.key, data, view), data, rows.length);
			if (shown === null || rows.length !== shown.length) return null;
			const visible = new Set(shown);
			return {
				pending: attention.waiting.filter((id) => !visible.has(id)).length,
				unread: attention.unread.filter((id) => !visible.has(id)).length,
				running: attention.running.filter((id) => !visible.has(id)).length
			};
		}
		/**
		* Draw or clear the workspace header's attention badge (spec §5): up to three
		* 7px dots side by side, in reading order (waiting, unread, running), with the
		* count text as the container's tooltip and accessible name. It is inserted
		* before the row's actions span, exactly like the age label, but it is NOT
		* faded on hover: this is attention, the one thing the row exists to carry. The
		* element is reused across passes — dots are repainted, never rebuilt — and
		* removed when the counts drop back to zero.
		*/
		function applyAttentionBadge(section, account, data, view) {
			const header = sectionHeaderRow(section, 0);
			if (header === null || typeof header.getAttribute !== "function") return;
			const hidden = hiddenAttention(section, account, data, view);
			if (hidden === null) {
				const stale = findBadge(header);
				if (stale !== null) detach(stale, data.badges);
				return;
			}
			let badge = findBadge(header);
			if (badge === null) {
				badge = document.createElement("span");
				badge.dataset.dshUxPlus = BADGE_VALUE;
				badge.style.flex = "none";
				badge.style.display = "inline-flex";
				badge.style.alignItems = "center";
				badge.style.gap = "3px";
				badge.style.lineHeight = "16px";
				const actions = findRowActions(header);
				if (actions !== null && typeof header.insertBefore === "function") header.insertBefore(badge, actions);
				else header.appendChild(badge);
				data.badges.add(badge);
			}
			const kinds = badgeKinds(hidden);
			const tooltip = badgeTooltip(data.locale, hidden);
			if (typeof badge.setAttribute === "function") {
				badge.setAttribute("title", tooltip);
				badge.setAttribute("aria-label", tooltip);
				badge.setAttribute("role", "img");
			}
			while (badge.children.length > kinds.length) detach(badge.children[badge.children.length - 1]);
			for (let i = 0; i < kinds.length; i += 1) {
				let dot = badge.children[i];
				if (dot === void 0 || dot === null) {
					dot = document.createElement("span");
					dot.dataset.dshUxPlus = `${BADGE_VALUE}-dot`;
					dot.style.width = DOT_SIZE;
					dot.style.height = DOT_SIZE;
					dot.style.borderRadius = "50%";
					dot.style.boxSizing = "border-box";
					dot.style.flex = "none";
					if (typeof dot.setAttribute === "function") dot.setAttribute("aria-hidden", "true");
					badge.appendChild(dot);
				}
				styleDot(dot, kinds[i]);
			}
		}
		/**
		* FLIP (spec §8): the "First" snapshot, taken before any order is written.
		* Null when the environment cannot animate (no rAF / no layout API — the test
		* fixtures), in which case the whole animation path is skipped.
		*/
		function snapshotTops(tree) {
			if (typeof window === "undefined" || window === null) return null;
			if (typeof window.requestAnimationFrame !== "function") return null;
			if (typeof window.matchMedia === "function") try {
				if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
			} catch {}
			if (tree === void 0 || tree === null || typeof tree.querySelectorAll !== "function") return null;
			let rows = null;
			try {
				rows = tree.querySelectorAll("[data-row-key^=\"session:\"]");
			} catch {
				return null;
			}
			if (rows === null || rows === void 0) return null;
			const tops = /* @__PURE__ */ new Map();
			for (const row of rows) {
				if (typeof row.getBoundingClientRect !== "function") continue;
				try {
					tops.set(row, row.getBoundingClientRect().top);
				} catch {}
			}
			return tops;
		}
		/** One in-flight animation cleared back to its resting state. */
		function clearFlip(element) {
			if (element === void 0 || element === null) return;
			element.style.transform = "";
			element.style.transition = "";
		}
		/**
		* FLIP (spec §8): after the orders are written, every row that moved more than
		* 4px is translated back to where it was, then released over FLIP_MS. Elements
		* are handed to `flips` so the caller can clear a lingering transform on
		* dispose (a disposed feature must not leave a translate behind).
		*
		* The release frame owns nothing (the browser, measured): `setTimeout(0)` is
		* immediate while the next frame is up to ~16ms away, so a timer-driven pass
		* routinely runs BETWEEN the start of an animation and its release frame — that
		* pass measures, finds nothing left to move, and takes the element out of
		* `flips` after snapping it to its resting place. A release frame that then
		* wrote its `transition` anyway would leave an inline property no pass and no
		* dispose could ever clear (the element is no longer in the set either walks).
		* Membership IS the ownership token: dropped, and the frame leaves it alone.
		*/
		function animateFlip(tops, flips) {
			for (const [element, top] of tops) {
				if (typeof element.getBoundingClientRect !== "function") continue;
				let moved = 0;
				try {
					moved = top - element.getBoundingClientRect().top;
				} catch {
					continue;
				}
				if (Math.abs(moved) <= 4) continue;
				element.style.transition = "none";
				element.style.transform = `translateY(${moved}px)`;
				flips.add(element);
				window.requestAnimationFrame(() => {
					if (!flips.has(element)) return;
					element.style.transition = `transform ${FLIP_MS}ms ease`;
					element.style.transform = "";
				});
			}
		}
		/**
		* Style writes with original caching (plan W-6): the first write of a
		* property caches the element's current value; clear() puts every cached
		* original back and forgets all records.
		*/
		function makeStyleCache() {
			const records = /* @__PURE__ */ new Map();
			function write(element, property, value) {
				let cached = records.get(element);
				if (cached === void 0) {
					cached = {};
					records.set(element, cached);
				}
				if (!Object.prototype.hasOwnProperty.call(cached, property)) cached[property] = element.style[property];
				element.style[property] = value;
			}
			/**
			* Put one cached property back and forget that record, so the next write
			* caches the restored original again. The liveness layer flips the same
			* element between full, compact and micro on every pass: a bare write of the
			* full-size value would cache the compact one as "the original" and leak it
			* past dispose. A property this feature never wrote is a no-op.
			*
			* A missing original (undefined) means the element carried no inline value
			* at all before the write — true for any DOM that reports unset properties
			* as absent rather than as '' (the plain-object test fixtures). Assigning
			* `undefined` back would leave the value we wrote in place, so the property
			* is removed instead: that is the only honest restore.
			*/
			function restore(element, property) {
				const cached = records.get(element);
				if (cached === void 0) return;
				if (!Object.prototype.hasOwnProperty.call(cached, property)) return;
				const original = cached[property];
				delete cached[property];
				if (original === void 0) {
					delete element.style[property];
					return;
				}
				element.style[property] = original;
			}
			function clear() {
				for (const [element, cached] of records) for (const property of Object.keys(cached)) {
					const original = cached[property];
					if (original === void 0) delete element.style[property];
					else element.style[property] = original;
				}
				records.clear();
			}
			return {
				write,
				restore,
				clear
			};
		}
		/**
		* The ungrouped bucket's activity: latest session owned by no workspace. Same
		* archive-invariance rule as latestSessionUpdate — a stray conversation being
		* archived must not move the bucket either.
		*/
		function bucketActivity(data) {
			const owned = /* @__PURE__ */ new Set();
			for (const workspace of data.items) for (const sessionId of workspace.sessionIds) owned.add(sessionId);
			let latest = Number.NEGATIVE_INFINITY;
			for (const session of Object.values(data.byId)) {
				if (session.origin === "subagent" || session.blank) continue;
				if (owned.has(session.id)) continue;
				if (session.updatedAt > latest) latest = session.updatedAt;
			}
			return latest;
		}
		/** A workspace's nested children in host order (workspace-tree mode). */
		function childrenOf(workspace, data) {
			const parents = data.items.map((item) => item.path);
			const out = [];
			for (const item of data.items) if (owningParentFolder(item.path, parents) === workspace.path) out.push(item);
			return out;
		}
		/**
		* W-2 row layer: the section's own session rows in recency order (same ruler
		* as the host's orderByRecency: updatedAt desc, id asc on ties).
		*
		* Rows are paired after replaying the host's actual row projection (the
		* derived order, not the model's member order — `renderedOrder`) and the host
		* collapse rule; a count mismatch or a failed pairing-trust check makes this
		* section's row layer a no-op (the group layer is unaffected). A bail-out is
		* logged once per distinct reason (`traceSkip`) — silently doing nothing is
		* what let a drifted host replay pass unnoticed in production.
		*
		* The collapse replay is part of that contract: the rendered slice exempts
		* blank, running and running-subagent rows from the idle quota (rowExempt)
		* and uses the group's live quota derived from the DOM (collapsedShown). A
		* blank-only fixed-5 port matched only idle sections; on a section with a
		* running session it replayed one row short, tripped the count gate and left
		* the whole row layer off — the running conversation stayed below a stale
		* one, which is precisely what this feature exists to prevent.
		*
		* Two row classes keep the host's rendered positions instead of being
		* re-ranked: the current blank row (host pinCurrentBlank invariant,
		* tree.ts:214-220) and non-archived pinned rows (host sectionMembers fronts
		* them, tree.ts:273-287). Re-ranking a pin would fight an explicit user
		* action; everything else is ranked by recency, in both sort modes — that is
		* what this feature promises, and it is why a sidebar left in 手动排序 no
		* longer freezes stale positions.
		*/
		/**
		* The recency tie-break every layer already used: freshest first, id ascending
		* when two sessions share a timestamp (a total order, so the result does not
		* depend on the engine's sort implementation).
		*/
		function compareRecency(a, b) {
			if (a.session.updatedAt !== b.session.updatedAt) return b.session.updatedAt - a.session.updatedAt;
			const left = a.session.id;
			const right = b.session.id;
			if (left === right) return 0;
			return left < right ? -1 : 1;
		}
		function orderRows(section, account, data, view) {
			const expected = renderedOrder(account.memberIds, account.key, data, view);
			const rows = rowChildren(section);
			const shown = sectionCollapsed(section) ? collapsedShown(expected, data, rows.length) : expected;
			if (shown === null) return;
			if (rows.length !== shown.length) {
				traceSkip(account.key, "count", `dom ${rows.length} vs replay ${shown.length}`);
				absorbHostTruncation(section, account, data);
				return;
			}
			const unpaired = firstUnpairedRow(rows, shown, data.byId);
			if (unpaired !== -1) {
				traceSkip(account.key, "pairing", `row ${unpaired} of ${shown.length}`);
				absorbHostTruncation(section, account, data);
				return;
			}
			const entries = shown.map((id, index) => {
				return {
					session: data.byId[id],
					element: rows[index],
					zone: "active"
				};
			});
			const leading = [];
			const ranked = [];
			entries.forEach((entry, index) => {
				const blankFront = index === 0 && entry.session.blank === true;
				const pinnedFront = !blankFront && !data.archived.has(entry.session.id) && data.pinned.has(entry.session.id);
				if (blankFront || pinnedFront) {
					entry.leading = true;
					leading.push(entry);
				} else ranked.push(entry);
			});
			if (data.statusMap !== null) for (const entry of ranked) entry.zone = zoneEntryOf(entry, data);
			ranked.sort(data.statusMap === null ? compareRecency : (a, b) => (a.zone === b.zone ? 0 : a.zone === "active" ? -1 : 1) || compareRecency(a, b));
			const ordered = leading.concat(ranked);
			const activeCount = ordered.reduce((total, entry) => entry.zone === "active" ? total + 1 : total, 0);
			const barRank = data.statusMap === null ? -1 : activeCount;
			ordered.forEach((entry, index) => {
				const rank = barRank >= 0 && index >= barRank ? index + 1 : index;
				data.styles.write(entry.element, "order", String(10 + rank));
				data.styles.write(entry.element, "flexShrink", "0");
				const row = rowElementOf(entry);
				const archived = data.archived.has(entry.session.id);
				markZone(row, archived || data.statusMap === null ? "none" : entry.zone, data);
				if (data.statusMap === null) return;
				const density = densitySpec(entry, data);
				applyDensity(data.styles, row, density);
				if (density === null) relaxRow(data.styles, row);
				else compactRow(data.styles, row);
				ensureStatusDot(row, archived ? "none" : statusOf(data.statusMap.get(entry.session.id)), data.locale, data);
			});
			const button = overflowButton(section);
			if (button !== null) data.styles.write(button, "order", "999");
			if (data.statusMap !== null) {
				applyFold(section, account, ordered, data);
				ensureZoneBand(section, ordered, data);
			}
		}
		/** Collapse whitespace runs and trim (header-text comparison). */
		function normalizeText(value) {
			return (typeof value === "string" ? value : "").replace(/\s+/g, " ").trim();
		}
		/** The final segment of a host path (backslashes normalized by folderPath). */
		function pathBasename(path) {
			return typeof path === "string" ? folderPath(path).split("/").pop() : "";
		}
		/**
		* The section's group header row: the first role="treeitem" carrying
		* aria-expanded in the section's subtree (host DOM contract — possibly one
		* span wrapper deep), or null. Mirrors hasHeaderRow's walk.
		*/
		function sectionHeaderRow(section, depth) {
			if (depth > WALK_DEPTH) return null;
			if (isHeaderRow(section)) return section;
			for (const child of section.children) {
				const found = sectionHeaderRow(child, depth + 1);
				if (found !== null) return found;
			}
			return null;
		}
		/**
		* Group-layer pairing trust (Q8): a same-count workspace reorder leaves the
		* store snapshot in the new order while the DOM still renders the old
		* section order for one frame, and positional pairing would then pair each
		* section with the wrong workspace. A section's header text is the
		* workspace's title (or its path basename), so the pairing is confirmed only
		* when the header starts with one of those; an empty header text is no
		* signal, not a failure, and a workspace with neither carries no candidate.
		*/
		function sectionPairingTrusted(section, workspace) {
			const row = sectionHeaderRow(section, 0);
			const text = row === null ? "" : normalizeText(row.textContent);
			if (text === "") return true;
			const candidates = [normalizeText(workspace.title), normalizeText(pathBasename(workspace.path))].filter((candidate) => candidate !== "");
			if (candidates.length === 0) return true;
			return candidates.some((candidate) => text.startsWith(candidate));
		}
		/**
		* Order one level: the container's section children (DOM order) are matched
		* to the workspaces at that level (host order; the trailing ungrouped bucket
		* section is the only tolerated extra, top level only), receive their
		* visual rank, their row ordering, and then their nested level. A count
		* mismatch, or a header that cannot confirm its paired workspace, makes the
		* whole level a no-op — presentation never guesses.
		*/
		function orderLevel(container, workspaces, topLevel, data, view) {
			const sections = [];
			for (const child of container.children) if (isSection(child)) sections.push(child);
			const pairs = [];
			if (sections.length === workspaces.length) for (let i = 0; i < sections.length; i += 1) pairs.push({
				section: sections[i],
				workspace: workspaces[i]
			});
			else if (topLevel && sections.length === workspaces.length + 1) {
				for (let i = 0; i < workspaces.length; i += 1) pairs.push({
					section: sections[i],
					workspace: workspaces[i]
				});
				pairs.push({
					section: sections[sections.length - 1],
					workspace: null
				});
			} else return;
			for (const pair of pairs) if (pair.workspace !== null && !sectionPairingTrusted(pair.section, pair.workspace)) return;
			const ranked = pairs.map((pair, index) => {
				const base = pair.workspace === null ? bucketActivity(data) : latestSessionUpdate(pair.workspace, data.byId);
				let activity = base;
				if (data.statusMap !== null) {
					if (hasBlockingAttention(pair.workspace === null ? ungroupedMembers(data) : pair.workspace.sessionIds, data) && data.now > base) activity = data.now;
				}
				return {
					section: pair.section,
					workspace: pair.workspace,
					index,
					activity
				};
			});
			ranked.sort((a, b) => {
				if (a.activity === b.activity) return a.index - b.index;
				if (a.activity === Number.NEGATIVE_INFINITY) return 1;
				if (b.activity === Number.NEGATIVE_INFINITY) return -1;
				return b.activity - a.activity;
			});
			ranked.forEach((entry, rank) => {
				const { section, workspace } = entry;
				data.styles.write(section, "display", "flex");
				data.styles.write(section, "flexDirection", "column");
				data.styles.write(section, "flexShrink", "0");
				data.styles.write(section, "order", String(rank));
				data.styles.write(section, "marginTop", rank === 0 ? "0px" : "4px");
				const account = workspace === null ? {
					memberIds: ungroupedMembers(data),
					key: UNGROUPED_KEY
				} : {
					memberIds: workspace.sessionIds,
					key: workspace.workspaceId
				};
				orderRows(section, account, data, view);
				applyAttentionBadge(section, account, data, view);
				const containerDiv = groupContainer(section);
				if (containerDiv !== null) {
					data.styles.write(containerDiv, "display", "flex");
					data.styles.write(containerDiv, "flexDirection", "column");
					data.styles.write(containerDiv, "flexShrink", "0");
					orderLevel(containerDiv, childrenOf(workspace, data), false, data, view);
				}
			});
		}
		/**
		* Install the feature's client-side behavior.
		* @param {object} ctx - the client plugin context (unused; contract shape).
		* @param {object} deps - { sessions, workspaces } (see module header).
		* @returns {() => void} disposer: clears the pending timer, disconnects the
		*   observer, unsubscribes both lists, and restores all cached original
		*   styles (off == never installed).
		*/
		function client$2(ctx, deps) {
			const sessionsService = deps && deps.sessions;
			const workspacesService = deps && deps.workspaces;
			const sessions = sessionsService && sessionsService.list;
			const workspaces = workspacesService && workspacesService.list;
			if (!sessions || !workspaces || typeof sessions.getSnapshot !== "function" || typeof sessions.subscribe !== "function" || typeof workspaces.getSnapshot !== "function" || typeof workspaces.subscribe !== "function") return () => {};
			const styles = makeStyleCache();
			let timer = null;
			let tickTimer = null;
			let disposed = false;
			/** Workspace ids already auto-collapsed during this page load. */
			const collapsedOnce = /* @__PURE__ */ new Set();
			/** Account keys whose dormant block the user revealed (page load only, §4). */
			const revealed = /* @__PURE__ */ new Set();
			/** Our injected dormant bars / attention badges / status dots, for dispose. */
			const foldRows = /* @__PURE__ */ new Set();
			const badges = /* @__PURE__ */ new Set();
			const dots = /* @__PURE__ */ new Set();
			/** The per-section Active band elements (one per section, §2). */
			const bands = /* @__PURE__ */ new Set();
			/** Host rows carrying a zone attribute (removed again on dispose, §2). */
			const zoneMarked = /* @__PURE__ */ new Set();
			/** Rows with an in-flight FLIP transform (cleared on dispose, §8). */
			const flips = /* @__PURE__ */ new Set();
			/** True while the pointer is inside the grouped tree (spec §7). */
			let pointerInTree = false;
			const styleTag = document.createElement("style");
			styleTag.dataset.dshUxPlus = "idle-collapse-css";
			styleTag.textContent = [
				`[data-row-key^="${ROW_PREFIX}"] > [${LABEL_ATTR}="${LABEL_VALUE}"] { opacity: 0; transition: opacity 120ms ease; }`,
				`[data-row-key^="${ROW_PREFIX}"]:hover > [${LABEL_ATTR}="${LABEL_VALUE}"] { opacity: 1; }`,
				`[data-row-key^="${ROW_PREFIX}"].menuOpen > [${LABEL_ATTR}="${LABEL_VALUE}"] { opacity: 0; }`,
				`[data-dsh-ux-plus="${BAND_VALUE}"] { position: absolute; left: 0; right: 0; background-color: ${ZONE_BACKGROUND}; border-radius: 6px; z-index: -1; pointer-events: none; }`,
				`[${ZONE_ATTR}="active"][aria-selected="true"] { background-color: ${ZONE_SELECTED}; }`,
				"[data-dsh-ux-kind=\"waiting\"] { animation: dsh-ux-plus-breath 2s ease-in-out infinite; }",
				"[data-dsh-ux-kind=\"running\"] { animation: dsh-ux-plus-spin 900ms linear infinite; }",
				"@keyframes dsh-ux-plus-breath { 0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.45); } 50% { box-shadow: 0 0 0 3px rgba(245, 158, 11, 0); } }",
				"@keyframes dsh-ux-plus-spin { to { transform: rotate(360deg); } }"
			].join("\n");
			document.head.appendChild(styleTag);
			/** Active locale id for the age labels, defensively ('zh' when absent). */
			function activeLocale() {
				const locale = ctx && ctx.locale;
				if (locale && typeof locale.getSnapshot === "function") try {
					const snapshot = locale.getSnapshot();
					if (snapshot && typeof snapshot.active === "string") return snapshot.active;
				} catch {}
				return "zh";
			}
			/**
			* The host's liveness map (the `uiSession` service), or null. Null IS the
			* degraded mode: every liveness behavior below is skipped and the feature
			* behaves exactly as it did before this layer existed. A missing service, a
			* snapshot that is not a Map-like, and a throwing getSnapshot() all degrade
			* the same way — never a broken pass.
			*/
			function readStatusMap() {
				const observable = deps && deps.uiSession && deps.uiSession.sessionStatus;
				if (observable === void 0 || observable === null) return null;
				if (typeof observable.getSnapshot !== "function") return null;
				try {
					const snapshot = observable.getSnapshot();
					if (snapshot === void 0 || snapshot === null || typeof snapshot.get !== "function") return null;
					return snapshot;
				} catch {
					return null;
				}
			}
			/** Toggle a section's folded tail for this page load (spec §4, issue 4). */
			function onToggleReveal(accountKey) {
				if (revealed.has(accountKey)) revealed.delete(accountKey);
				else revealed.add(accountKey);
				schedule();
			}
			/** Snapshot the live lists; null while either list is not ready. */
			function readData() {
				const sessionSnapshot = sessions.getSnapshot();
				const workspaceSnapshot = workspaces.getSnapshot();
				if (sessionSnapshot.phase !== "ready" || workspaceSnapshot.phase !== "ready") return null;
				const byId = sessionSnapshot.byId;
				const items = workspaceSnapshot.items;
				const archived = new Set(workspaceSnapshot.archivedSessionIds);
				const pinned = new Set(workspaceSnapshot.pinnedSessionIds ?? []);
				let currentId = void 0;
				for (const session of Object.values(byId)) if (session.retainedBy && session.retainedBy.mainView > 0) {
					currentId = session.id;
					break;
				}
				return {
					byId,
					items,
					archived,
					pinned,
					currentId,
					projectionsBySession: sessionSnapshot.projectionsBySession,
					statusMap: readStatusMap(),
					now: Date.now(),
					locale: activeLocale(),
					revealed,
					foldRows,
					badges,
					dots,
					bands,
					zoneMarked,
					onToggleReveal,
					styles
				};
			}
			/**
			* Locate the grouped tree structurally: a role="tree" whose direct
			* children include group sections. Flat and search trees have no section
			* headers, so they never qualify (no section counting anywhere).
			* @returns {{tree: Element, sections: Element[]}} | null
			*/
			function findTree() {
				const trees = document.querySelectorAll("[role=\"tree\"]");
				for (const tree of trees) {
					const sections = [];
					for (const child of tree.children) if (isSection(child)) sections.push(child);
					if (sections.length > 0) return {
						tree,
						sections
					};
				}
				return null;
			}
			/**
			* Is a menu open inside the tree? The host marks its open row `.menuOpen`
			* (the literal class name is not hashed — this module's own CSS rule already
			* relies on it), and a pass that moved rows out from under an open popup
			* would leave the popup anchored to a row that is no longer there.
			*
			* Checked by selector first (the host's tree is a real element: one cheap
			* query), then by a structurally WALKED search, because a test fixture's
			* selector engine is a stub. The walk is bounded in both depth and visited
			* nodes — a huge tree must never turn the freeze check into a stall.
			*/
			function menuOpenWithin(node, depth, budget) {
				if (depth <= 0 || node === void 0 || node === null) return false;
				if (budget.spent >= 600) return false;
				budget.spent += 1;
				const className = typeof node.className === "string" ? node.className : "";
				if (className.indexOf("menuOpen") !== -1 && className.split(/\s+/).indexOf("menuOpen") !== -1) return true;
				for (const child of node.children || []) if (menuOpenWithin(child, depth - 1, budget)) return true;
				return false;
			}
			/**
			* Churn freeze (spec §7): while the pointer is inside the tree, or a menu is
			* open inside it, a pass would move rows under the user's cursor or detach an
			* open popup's anchor. Passes are DEFERRED, never dropped — the flag makes
			* the running pass a no-op and the next event (pointerout, a store
			* notification, a mutation) re-runs it once the freeze has lifted.
			*/
			function frozen() {
				if (pointerInTree) return true;
				const found = findTree();
				if (found === null) return false;
				if (typeof found.tree.getElementsByClassName === "function") try {
					const open = found.tree.getElementsByClassName("menuOpen");
					if (open !== null && open !== void 0) return open.length > 0;
				} catch {}
				if (typeof found.tree.querySelector === "function") try {
					if (found.tree.querySelector(".menuOpen") !== null) return true;
				} catch {}
				return menuOpenWithin(found.tree, 6, { spent: 0 });
			}
			/**
			* Pointer-in-tree tracking (spec §7): one document-level listener pair,
			* installed only when the document supports it and removed on dispose.
			* `closest` may be missing (synthetic events, odd targets) — an unreadable
			* target is simply not in the tree, which fails open and never freezes the
			* sidebar for good.
			*/
			function inTree(node) {
				return typeof node === "object" && node !== null && typeof node.closest === "function" && node.closest("[role=\"tree\"]") !== null;
			}
			function onPointerOver(event) {
				if (inTree(event && event.target)) pointerInTree = true;
			}
			function onPointerOut(event) {
				if (event !== null && event !== void 0 && event.relatedTarget !== void 0 && event.relatedTarget !== null && inTree(event.relatedTarget)) return;
				if (!pointerInTree) return;
				pointerInTree = false;
				schedule();
			}
			/** One full pass: structural find, then the two-layer reorder. */
			function reorder() {
				if (frozen()) return;
				const data = readData();
				if (data === null) {
					styles.clear();
					return;
				}
				const found = findTree();
				if (found === null) {
					styles.clear();
					return;
				}
				const parents = data.items.map((item) => item.path);
				const roots = data.items.filter((item) => owningParentFolder(item.path, parents) === void 0);
				if (found.sections.length !== roots.length && found.sections.length !== roots.length + 1) {
					styles.clear();
					return;
				}
				const view = viewOrdering();
				for (const element of flips) clearFlip(element);
				flips.clear();
				const tops = snapshotTops(found.tree);
				styles.write(found.tree, "display", "flex");
				styles.write(found.tree, "flexDirection", "column");
				orderLevel(found.tree, roots, true, data, view);
				if (tops !== null) animateFlip(tops, flips);
			}
			/**
			* Idle sub-behavior pass: label every workspace row with activity and
			* collapse idle ones once. Independent of the reorder (a bail-out there
			* never suppresses labels here); shares the same debounced schedule.
			*/
			function idlePass() {
				if (frozen()) return;
				const data = readData();
				if (data === null) return;
				const rows = document.querySelectorAll(`[data-row-key^="${ROW_PREFIX}"]`);
				const now = data.now;
				const locale = data.locale;
				for (const row of rows) {
					const rowKey = row.getAttribute("data-row-key");
					const workspaceId = typeof rowKey === "string" ? rowKey.slice(10) : "";
					const workspace = workspaceId === UNGROUPED_KEY ? void 0 : data.items.find((item) => item.workspaceId === workspaceId);
					if (workspace === void 0) {
						removeAgeLabel(row);
						continue;
					}
					const latest = latestSessionUpdate(workspace, data.byId);
					if (latest === Number.NEGATIVE_INFINITY) {
						removeAgeLabel(row);
						continue;
					}
					const idle = now - latest > IDLE_MS;
					let label = findAgeLabel(row);
					if (label === null) {
						label = document.createElement("span");
						label.dataset.dshUxPlus = LABEL_VALUE;
						label.style.flex = "none";
						label.style.fontSize = "10px";
						label.style.lineHeight = "16px";
						label.style.color = "var(--dsw-alias-label-tertiary, #8a8f98)";
						label.style.pointerEvents = "none";
						label.style.whiteSpace = "nowrap";
						const actions = findRowActions(row);
						if (actions !== null && typeof row.insertBefore === "function") row.insertBefore(label, actions);
						else row.appendChild(label);
					}
					label.textContent = ageLabel(locale, now - latest);
					if (idle && hasBlockingAttention(workspace.sessionIds, data)) continue;
					if (idle && !collapsedOnce.has(workspaceId)) {
						collapsedOnce.add(workspaceId);
						if (row.getAttribute("aria-expanded") === "true" && typeof row.click === "function") row.click();
					}
				}
			}
			function schedule() {
				if (disposed || timer !== null) return;
				timer = window.setTimeout(function() {
					timer = null;
					if (disposed) return;
					if (frozen()) return;
					reorder();
					idlePass();
				}, 0);
			}
			const observer = new MutationObserver(schedule);
			if (document.body !== null) observer.observe(document.body, {
				childList: true,
				subtree: true
			});
			const disposeSessions = sessions.subscribe(schedule);
			const disposeWorkspaces = workspaces.subscribe(schedule);
			const locale = ctx && ctx.locale;
			const disposeLocale = locale && typeof locale.subscribe === "function" ? locale.subscribe(schedule) : null;
			const statusObservable = deps && deps.uiSession && deps.uiSession.sessionStatus;
			const disposeStatus = statusObservable !== void 0 && statusObservable !== null && typeof statusObservable.subscribe === "function" ? statusObservable.subscribe(schedule) : null;
			if (typeof document.addEventListener === "function" && typeof document.removeEventListener === "function") {
				document.addEventListener("pointerover", onPointerOver);
				document.addEventListener("pointerout", onPointerOut);
			}
			if (typeof window.setInterval === "function") tickTimer = window.setInterval(schedule, Math.min(AGE_TICK_MS, ZONE_TICK_MS));
			schedule();
			return function cleanup() {
				disposed = true;
				if (timer !== null) window.clearTimeout(timer);
				if (tickTimer !== null && typeof window.clearInterval === "function") window.clearInterval(tickTimer);
				observer.disconnect();
				disposeSessions();
				disposeWorkspaces();
				if (typeof disposeLocale === "function") disposeLocale();
				if (typeof disposeStatus === "function") disposeStatus();
				if (typeof document.removeEventListener === "function") {
					document.removeEventListener("pointerover", onPointerOver);
					document.removeEventListener("pointerout", onPointerOut);
				}
				pointerInTree = false;
				for (const row of document.querySelectorAll(`[data-row-key^="${ROW_PREFIX}"]`)) removeAgeLabel(row);
				for (const element of flips) clearFlip(element);
				flips.clear();
				for (const section of document.querySelectorAll(`[data-row-key^="${ROW_PREFIX}"]`)) removeFoldRow(section, {
					styles,
					foldRows
				});
				for (const row of foldRows) detach(row);
				foldRows.clear();
				for (const badge of badges) detach(badge);
				badges.clear();
				for (const dot of dots) detach(dot);
				dots.clear();
				for (const band of bands) {
					const bandSection = band.parentNode;
					if (bandSection !== null && bandSection !== void 0) {
						styles.restore(bandSection, "isolation");
						styles.restore(bandSection, "position");
					}
					detach(band, bands);
				}
				bands.clear();
				for (const row of zoneMarked) if (typeof row.removeAttribute === "function") row.removeAttribute(ZONE_ATTR);
				zoneMarked.clear();
				styleTag.remove();
				styles.clear();
			};
		}
		/** Currently installed host-side disposer, or undefined while detached. */
		let release$1 = void 0;
		/**
		* Install the feature's host-side behavior (none for this feature).
		* @param {object} ctx - the plugin context.
		* @returns {() => void} the disposer for this installation.
		*/
		function attach$2(ctx) {
			dispose$1();
			release$1 = () => {
				release$1 = void 0;
			};
			return release$1;
		}
		/** Tear down the current host-side installation; idempotent. */
		function dispose$1() {
			const current = release$1;
			release$1 = void 0;
			if (current !== void 0) current();
		}
		/** D5 contract view consumed by the package host and client halves. */
		const feature$2 = {
			id: id$2,
			title: title$2,
			description: description$2,
			hasGear: false,
			settingsMessages: settingsMessages$2,
			host: (ctx) => attach$2(ctx),
			client: (ctx, deps) => client$2(ctx, deps)
		};
		//#endregion
		//#region features/tool-ask-question-expanded/src/index.js
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
		*   - W-14 notice-blue block: the settled ask row's transcript CARD gets a
		*     notice-blue wash (the single blue layer — the row itself stays
		*     host-native, no outer wash), with the answer in white and the original
		*     question in a smaller, grayer tier (see `accentCss`). Tokens only —
		*     `--dsw-alias-button-info-fill` is the design system's info/notice blue
		*     and the label tiers flip with the theme, so the block reads white on a
		*     blue wash in dark and near-black on a light-blue wash in light. Only the
		*     text recolor is skipped on running/preparing rows so the host shimmer
		*     keeps animating.
		*/
		const id$1 = "tool-ask-question-expanded";
		const title$1 = "Ask question expanded";
		const description$1 = "Reveal the question and its answer in the chat flow by default.";
		/** Settings-row copy, assembled into the `ux-plus-settings` namespace. */
		const settingsMessages$1 = {
			zh: {
				title: "提问结果默认展开",
				description: "提问结束后，问题和答案直接展开，回看决定少一次点击。"
			},
			en: {
				title: "Ask question expanded",
				description: "Reveal the question and its answer in the chat flow by default."
			}
		};
		/** Chat-flow ask-question rows (W-1): the host's own tool card rows. */
		const ROW_SELECTOR = "[data-conversation-scroll] [data-tool=\"ask_user_question\"]";
		/** The host disclosure row inside an ask row (W-3): the element we click. */
		const DISCLOSURE_SELECTOR = "[data-disclosure-row]";
		/**
		* Text scope (W-14): settled ask rows only. A running row keeps the host's
		* shimmer (its text color is animated through a pseudo-element, and forcing a
		* color there breaks the sweep). The wash itself is NOT gated this way — the
		* question waiting for an answer should be highlighted too, it just keeps its
		* own animated text colors while it is live.
		*/
		const ROW_CSS_SCOPE = ROW_SELECTOR + ":not([data-state=\"running\"]):not([data-state=\"preparing\"])";
		/**
		* The notice-blue treatment (W-14). The host renders an ask row in the
		* monochrome tool-row chrome — title, summary and the question text all sit on
		* the dimmed label tiers, so a settled question reads as one gray smear.
		*
		* Tokens, not colors: `--dsw-alias-button-info-fill` is the design system's
		* info/notice blue (design-platform.css:201/316, per theme), and the label
		* tiers flip with the theme (white / near-black for primary, grayer steps for
		* secondary), so the block stays legible in both instead of hard-coding
		* white-on-blue. The answer sits on the primary tier; the original question
		* recedes to the secondary tier at a slightly smaller font size.
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
				ROW_SELECTOR + " {",
				"  --ux-plus-notice: var(--dsw-alias-button-info-fill);",
				"}",
				ROW_SELECTOR + " [class*=\"_card\"] {",
				"  background: color-mix(in srgb, var(--ux-plus-notice) 14%, transparent);",
				"  border-color: color-mix(in srgb, var(--ux-plus-notice) 45%, transparent);",
				"}",
				ROW_CSS_SCOPE + " :is([class*=\"_title\"], [class*=\"_summary\"],",
				"  [class*=\"_answer\"], [class*=\"_verdict\"]) {",
				"  color: var(--dsw-alias-label-primary);",
				"}",
				ROW_CSS_SCOPE + " :is([class*=\"_question\"], [class*=\"_unansweredQuestion\"]) {",
				"  color: var(--dsw-alias-label-secondary);",
				"  font-size: calc(var(--dsh-content-font-size, 14px) - 1px);",
				"}",
				ROW_CSS_SCOPE + " :is([class*=\"_skipped\"], [class*=\"_chevron\"]) {",
				"  color: var(--dsw-alias-label-primary-dimmed);",
				"}",
				ROW_CSS_SCOPE + " [class*=\"_sep\"] {",
				"  background: var(--dsw-alias-label-primary-dimmed);",
				"}"
			].join("\n");
		}
		/**
		* Install the notice-blue treatment (W-14) as one plugin-owned <style>.
		* @returns {{ remove: () => void } | null} the release handle, or null when
		*   there is no <head> to attach to.
		*/
		function installAccent() {
			if (document.head === null || document.head === void 0) return null;
			const tag = document.createElement("style");
			tag.setAttribute("data-plugin", "dsh-ux-plus");
			tag.setAttribute("data-feature", id$1);
			tag.textContent = accentCss();
			document.head.appendChild(tag);
			return { remove() {
				if (tag.parentNode !== null && tag.parentNode !== void 0) tag.parentNode.removeChild(tag);
			} };
		}
		/**
		* Mount the client half.
		* @param {object} ctx - the client plugin context (unused: pure DOM feature).
		* @param {object} deps - shared feature deps (unused: no service needed).
		* @returns {() => void} disposer (W-6 reverse-collapse + teardown).
		*/
		function client$1(ctx, deps) {
			let disposed = false;
			let timer = null;
			/** W-4: disclosure rows we expanded — each element is clicked at most once. */
			const expandedByUs = /* @__PURE__ */ new WeakSet();
			const observer = new MutationObserver(schedule);
			const accent = installAccent();
			/** Coalesce mutation pressure into one 0-delay scan (W-7). */
			function schedule() {
				if (disposed || timer !== null) return;
				timer = window.setTimeout(() => {
					timer = null;
					if (disposed) return;
					scan();
				}, 0);
			}
			/**
			* One native click on the disclosure row (W-3), preserving focus (W-13):
			* the row click steals focus, so a previous text field gets it back.
			* @param {object} disclosure - the disclosure row element.
			*/
			function expandOne(disclosure) {
				const previous = document.activeElement;
				disclosure.click();
				const next = document.activeElement;
				if (previous !== null && next !== previous && previous.isConnected && (previous.tagName === "INPUT" || previous.tagName === "TEXTAREA" || previous.isContentEditable === true)) previous.focus();
			}
			/** One pass over the chat flow: expand every settled collapsed row once. */
			function scan() {
				for (const row of document.querySelectorAll(ROW_SELECTOR)) {
					if (row.getAttribute("data-state") === "running") continue;
					const disclosure = row.querySelector(DISCLOSURE_SELECTOR);
					if (disclosure === null) continue;
					if (expandedByUs.has(disclosure)) continue;
					if (disclosure.getAttribute("aria-expanded") !== "false") continue;
					if (!disclosure.hasAttribute("data-expandable")) continue;
					expandedByUs.add(disclosure);
					expandOne(disclosure);
				}
			}
			if (document.body !== null) observer.observe(document.body, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["data-state"]
			});
			scan();
			return function cleanup() {
				disposed = true;
				if (accent !== null) accent.remove();
				if (timer !== null) window.clearTimeout(timer);
				observer.disconnect();
				for (const row of document.querySelectorAll(ROW_SELECTOR)) {
					const disclosure = row.querySelector(DISCLOSURE_SELECTOR);
					if (disclosure === null || !expandedByUs.has(disclosure)) continue;
					if (!disclosure.isConnected) continue;
					if (disclosure.getAttribute("aria-expanded") !== "true") continue;
					expandOne(disclosure);
				}
			};
		}
		/** Currently installed host-side disposer, or undefined while detached. */
		let release = void 0;
		/**
		* Install the feature's host-side behavior (none for this feature).
		* @param {object} ctx - the plugin context.
		* @returns {() => void} the disposer for this installation.
		*/
		function attach$1(ctx) {
			dispose();
			release = () => {
				release = void 0;
			};
			return release;
		}
		/** Tear down the current host-side installation; idempotent. */
		function dispose() {
			const current = release;
			release = void 0;
			if (current !== void 0) current();
		}
		/** D5 contract view consumed by the package host and client halves. */
		const feature$1 = {
			id: id$1,
			title: title$1,
			description: description$1,
			hasGear: false,
			settingsMessages: settingsMessages$1,
			host: (ctx) => attach$1(ctx),
			client: (ctx, deps) => client$1(ctx, deps)
		};
		//#endregion
		//#region features/workspace-session-inherit/src/index.js
		/** Inherit-conversation action mounted through the host's session-menu slot. */
		const id = "workspace-session-inherit";
		const title = "Inherit conversation";
		const description = "Add an \"Inherit conversation\" item that opens a fresh session with a chosen model to summarize the clicked conversation.";
		/** Settings-row copy, assembled into the `ux-plus-settings` namespace. */
		const settingsMessages = {
			zh: {
				title: "继承对话",
				description: "在会话菜单里选一个模型，当前工作区开一个新会话，让新模型读原会话的进度接着往下走。"
			},
			en: {
				title: "Inherit conversation",
				description: "Add an \"Inherit conversation\" item that opens a fresh session with a chosen model to summarize the clicked conversation."
			}
		};
		const NS = "ux-plus-session-inherit";
		const MESSAGES = {
			zh: {
				inherit: "继承对话",
				choose: "选择继承模型",
				loading: "加载模型…",
				empty: "没有可用模型",
				loadFailed: "模型列表加载失败",
				starting: "正在创建会话…",
				startFailed: "创建失败，点击重试",
				prompt: "{sessionId}\n总结并继承这个对话的进度，越近轮次的对话所投放的注意力要越多"
			},
			en: {
				inherit: "Inherit conversation",
				choose: "Choose a model to inherit into",
				loading: "Loading models…",
				empty: "No models available",
				loadFailed: "Failed to load models",
				starting: "Creating session…",
				startFailed: "Create failed; click to retry",
				prompt: "{sessionId}\nSummarize and inherit this conversation's progress, giving the most attention to the latest turns."
			}
		};
		function mintRequestId() {
			const c = globalThis.crypto;
			if (c && typeof c.randomUUID === "function") return String(c.randomUUID());
			return `ux-plus-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
		}
		/** Workspace that owns the source session, or undefined to let the host choose. */
		function findWorkspaceOf(deps, sessionId) {
			const list = deps.workspaces && deps.workspaces.list;
			if (!list || typeof list.getSnapshot !== "function") return void 0;
			const snapshot = list.getSnapshot();
			if (!snapshot || snapshot.phase !== "ready" || !Array.isArray(snapshot.items)) return void 0;
			const hit = snapshot.items.find((item) => Array.isArray(item.sessionIds) && item.sessionIds.includes(sessionId));
			return hit ? hit.workspaceId : void 0;
		}
		function buildPrompt(template, sessionId) {
			return String(template).replace("{sessionId}", String(sessionId));
		}
		/**
		* Create (or reuse on retry) a session in the source workspace, switch it to
		* the picked model, queue the inherit prompt and open it. `carry` survives a
		* failed attempt so a retry does not leave a second blank session behind.
		*/
		async function startInheritance({ ctx, deps, sessionId, provider, model, promptText, carry = {} }) {
			if (carry.createdId === void 0) {
				const workspaceId = findWorkspaceOf(deps, sessionId);
				carry.createdId = await deps.sessions.create(workspaceId === void 0 ? {} : { workspaceId });
			}
			const createdId = carry.createdId;
			const session = ctx.remote.session;
			const selected = await session.selectModel({
				sessionId: createdId,
				provider,
				model
			});
			if (!selected || selected.ok === false) throw new Error("inherit: selectModel failed");
			const prompted = await session.prompt({
				requestId: mintRequestId(),
				sessionId: createdId,
				mode: "queue",
				content: [{
					type: "text",
					text: promptText
				}]
			});
			if (!prompted || prompted.ok === false) throw new Error("inherit: prompt failed");
			const uiWorkspace = typeof ctx.get === "function" ? ctx.get("uiWorkspace") : void 0;
			if (uiWorkspace) uiWorkspace.openSession(createdId);
			return createdId;
		}
		function el(tag, styles, attrs) {
			const node = document.createElement(tag);
			if (styles) for (const key of Object.keys(styles)) node.style[key] = styles[key];
			if (attrs) for (const key of Object.keys(attrs)) node.setAttribute(key, attrs[key]);
			return node;
		}
		function text$1(node, value) {
			node.textContent = value;
			return node;
		}
		/** Ancestor walk instead of Node.contains: works on the plain fake DOM too. */
		function isInside(root, node) {
			for (let current = node; current; current = current.parentNode) if (current === root) return true;
			return false;
		}
		const PANEL_STYLE = {
			width: "260px",
			maxHeight: "320px",
			overflowY: "auto",
			background: "var(--dsw-alias-bg-layer-2, #24272e)",
			border: "1px solid var(--dsw-alias-border-l2, #3a3f4b)",
			borderRadius: "10px",
			boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
			color: "var(--dsw-alias-label-primary, #e8e8e8)",
			fontSize: "13px"
		};
		const HEADER_STYLE = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: "8px",
			padding: "8px 10px",
			fontSize: "12px",
			color: "var(--dsw-alias-label-secondary, #9aa0ab)",
			borderBottom: "1px solid var(--dsw-alias-border-l2, #3a3f4b)"
		};
		const ICON_BUTTON_STYLE = {
			background: "transparent",
			border: "none",
			color: "inherit",
			fontSize: "14px",
			lineHeight: "1",
			padding: "2px 4px",
			cursor: "pointer"
		};
		const BODY_STYLE = {
			padding: "10px",
			color: "var(--dsw-alias-label-secondary, #9aa0ab)"
		};
		const GROUP_STYLE = {
			padding: "6px 10px 2px",
			fontSize: "11px",
			color: "var(--dsw-alias-label-secondary, #9aa0ab)"
		};
		const ROW_STYLE = {
			display: "block",
			width: "100%",
			textAlign: "left",
			background: "transparent",
			border: "none",
			color: "inherit",
			font: "inherit",
			padding: "6px 10px",
			cursor: "pointer"
		};
		const MODEL_DESC_STYLE = {
			fontSize: "11px",
			color: "var(--dsw-alias-label-secondary, #9aa0ab)",
			marginTop: "1px"
		};
		const ERROR_STYLE = {
			padding: "8px 10px",
			fontSize: "12px",
			color: "#e5534b",
			borderTop: "1px solid var(--dsw-alias-border-l2, #3a3f4b)"
		};
		/**
		* Floating model picker anchored at the click point. Plain DOM (no React) so
		* it survives the host menu unmounting and stays testable without a renderer.
		*/
		function openPicker(ctx, deps, { sessionId, t, anchor }) {
			const container = el("div", {
				position: "fixed",
				zIndex: "999999"
			}, {
				"data-dsh-ux-plus": "session-inherit",
				role: "dialog",
				"aria-label": t("choose")
			});
			const vw = typeof window !== "undefined" && window.innerWidth || 1200;
			const vh = typeof window !== "undefined" && window.innerHeight || 800;
			const x = anchor ? anchor.x : vw / 2;
			const y = anchor ? anchor.y : vh / 2;
			container.style.left = `${Math.max(8, Math.min(x, vw - 276))}px`;
			container.style.top = `${Math.max(8, Math.min(y, vh - 60))}px`;
			document.body.appendChild(container);
			const state = {
				phase: "loading",
				groups: [],
				error: null,
				busy: false,
				carry: {}
			};
			let closed = false;
			const offDoc = [];
			function onDoc(type, fn) {
				document.addEventListener(type, fn, true);
				offDoc.push(() => document.removeEventListener(type, fn, true));
			}
			function close() {
				if (closed) return;
				closed = true;
				for (const off of offDoc) off();
				container.remove();
			}
			function choose(group, model) {
				if (state.busy) return;
				state.busy = true;
				state.error = null;
				render();
				startInheritance({
					ctx,
					deps,
					sessionId,
					provider: group.id,
					model: model.id,
					promptText: buildPrompt(t("prompt"), sessionId),
					carry: state.carry
				}).then(close, (error) => {
					state.busy = false;
					state.error = `${t("startFailed")}${error && error.message ? ` (${error.message})` : ""}`;
					if (!closed) render();
				});
			}
			function render() {
				while (container.children.length > 0) container.removeChild(container.children[0]);
				const panel = el("div", PANEL_STYLE);
				const header = el("div", HEADER_STYLE);
				header.appendChild(text$1(el("span"), t("choose")));
				const closeButton = el("button", ICON_BUTTON_STYLE, {
					type: "button",
					"aria-label": t("choose")
				});
				closeButton.textContent = "×";
				closeButton.onclick = close;
				header.appendChild(closeButton);
				panel.appendChild(header);
				if (state.phase === "loading") panel.appendChild(text$1(el("div", BODY_STYLE), t("loading")));
				else if (state.phase === "error") panel.appendChild(text$1(el("div", BODY_STYLE), t("loadFailed")));
				else if (state.groups.length === 0) panel.appendChild(text$1(el("div", BODY_STYLE), t("empty")));
				else for (const group of state.groups) {
					panel.appendChild(text$1(el("div", GROUP_STYLE), group.name || group.id));
					for (const model of group.models || []) {
						const row = el("button", ROW_STYLE, {
							type: "button",
							"data-model": `${group.id}/${model.id}`
						});
						row.appendChild(text$1(el("div"), model.name || model.id));
						if (model.description) row.appendChild(text$1(el("div", MODEL_DESC_STYLE), model.description));
						row.onclick = () => choose(group, model);
						row.onmouseenter = () => {
							row.style.background = "var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12))";
						};
						row.onmouseleave = () => {
							row.style.background = "transparent";
						};
						panel.appendChild(row);
					}
				}
				if (state.error) panel.appendChild(text$1(el("div", ERROR_STYLE), state.error));
				else if (state.busy) panel.appendChild(text$1(el("div", BODY_STYLE), t("starting")));
				container.appendChild(panel);
			}
			async function load() {
				try {
					const result = await ctx.remote.session.modelCatalog();
					if (closed) return;
					if (!result || result.ok === false) state.phase = "error";
					else {
						state.groups = result.value && result.value.groups || [];
						state.phase = "ready";
					}
				} catch (error) {
					if (closed) return;
					state.phase = "error";
				}
				if (!closed) render();
			}
			onDoc("keydown", (event) => {
				if (event.key === "Escape") close();
			});
			onDoc("pointerdown", (event) => {
				if (!isInside(container, event.target)) close();
			});
			render();
			load();
			return {
				close,
				container,
				state
			};
		}
		/** Mount a native menu row whose owner supplies the exact session ID. */
		function client(ctx, deps) {
			if (!deps?.react || !deps?.primitives) return () => {};
			const React = deps.react;
			const { MenuItemButton, IconRightUpOutlineRegular } = deps.primitives;
			const offLocale = ctx.effect(() => ctx.locale.register(NS, MESSAGES));
			let lastPointer;
			const track = (event) => {
				lastPointer = {
					x: event.clientX,
					y: event.clientY
				};
			};
			document.addEventListener("pointerdown", track, true);
			let picker = null;
			function InheritItem({ sessionId, useMenuOpenState, t }) {
				const [, setMenuOpen] = useMenuOpenState();
				return React.createElement(MenuItemButton, {
					icon: React.createElement(IconRightUpOutlineRegular),
					onSelect: () => {
						setMenuOpen(false);
						picker?.close();
						picker = openPicker(ctx, deps, {
							sessionId,
							t,
							anchor: lastPointer
						});
					}
				}, t("inherit"));
			}
			const offSlot = ctx.slots.inject("sidebar.workspaces.session.menu.item", () => ctx.slots.register({
				name: "sidebar.workspaces.session.menu.item",
				id: "dsh-ux-plus.inherit-session",
				order: 60,
				locale: NS
			}, InheritItem));
			return () => {
				document.removeEventListener("pointerdown", track, true);
				picker?.close();
				picker = null;
				offSlot();
				offLocale();
			};
		}
		/** Host companion; the menu action has no host resources. */
		function attach() {
			return () => {};
		}
		//#endregion
		//#region src/switches.js
		/**
		* D5 switch engine of dsh-ux-plus: mounts/disposes the five feature clients
		* to match the `ux-plus` section value, immediately and reversibly.
		*
		* This module is deliberately React-free (only the five feature modules
		* are imported, which are themselves host-safe): it can be exercised in
		* plain Node tests without a browser. The browser half (src/client.js)
		* supplies React and the scopes; the row rendering stays there.
		*
		* Contract:
		*   mountFeatures(ctx, deps, uxScope) -> disposer
		*     - for every feature, the switch is ON when
		*       `ux-plus[<feature id>] !== false` (defaults to ON, all-true host
		*       schema) — mounting runs `feature.client(ctx, deps)`, unmounting
		*       calls the disposer it returned (DOM/listeners/styles removed
		*       immediately — off == never installed);
		*     - the subscription lives here (caller-owned, plugin-level fiber),
		*       not in any tab component, so it survives tab unmounts;
		*     - the returned disposer unmounts every mounted feature and stops the
		*       subscription.
		*/
		/** Feature modules in tab row order (frozen ids). */
		const FEATURES = [
			feature$4,
			feature$3,
			feature$2,
			feature$1,
			{
				id,
				title,
				description,
				hasGear: false,
				settingsMessages,
				host: attach,
				client
			}
		];
		/** Locale namespace carrying the settings-tab copy (registered by client.js). */
		const SETTINGS_NAMESPACE = "ux-plus-settings";
		/**
		* Assemble the `ux-plus-settings` locale dictionary from the features' own
		* `settingsMessages` ({ zh: {title, description}, en: {...} }): flat keys
		* `<feature id>.title` / `<feature id>.description` per language, so the
		* settings tab renders every row through the host `t` seat and follows the
		* active DSH locale.
		* @param {Array<{id: string, settingsMessages?: object}>} features
		* @returns {{zh: object, en: object}}
		*/
		function buildSettingsMessages(features) {
			const dict = {
				zh: {},
				en: {}
			};
			for (const feature of features) {
				const messages = feature.settingsMessages || {};
				for (const lang of ["zh", "en"]) {
					const entry = messages[lang] || {};
					dict[lang][`${feature.id}.title`] = entry.title ?? feature.title;
					dict[lang][`${feature.id}.description`] = entry.description ?? feature.description;
				}
			}
			return dict;
		}
		/**
		* @param {object} ctx - the client plugin context (features use `ctx.slots`).
		* @param {object} deps - { react, tweakScope, sessions, workspaces } (see
		*   src/client.js) — built once, shared by every feature client.
		* @param {object} uxScope - SettingsScope bound to the `ux-plus` namespace.
		* @returns {() => void} disposer.
		*/
		function mountFeatures(ctx, deps, uxScope) {
			/** feature id -> active client disposer, for features currently on. */
			const mounted = /* @__PURE__ */ new Map();
			/** Mount/unmount feature clients to match the ux-plus section value. */
			function sync() {
				const snapshot = uxScope.getSnapshot();
				const value = snapshot && snapshot.value || {};
				for (const feature of FEATURES) {
					const want = value[feature.id] !== false;
					const current = mounted.get(feature.id);
					if (want && current === void 0) mounted.set(feature.id, feature.client(ctx, deps));
					else if (!want && current !== void 0) {
						current();
						mounted.delete(feature.id);
					}
				}
			}
			sync();
			const offSwitches = uxScope.subscribe(sync);
			return function dispose() {
				for (const disposeFeature of mounted.values()) disposeFeature();
				mounted.clear();
				offSwitches();
			};
		}
		//#endregion
		//#region src/client.js
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
		/** Settings-tab locale dictionary (`<id>.title` / `<id>.description` per lang). */
		const SETTINGS_MESSAGES = buildSettingsMessages(FEATURES);
		/**
		* Resolve a settings-row string through the slot-injected `t` seat, falling
		* back to the feature's English constant when `t` is absent (tests, older
		* shells) or the key is missing.
		*/
		function text(t, key, fallback) {
			if (typeof t !== "function") return fallback;
			const value = t(key);
			return typeof value === "string" && value !== key ? value : fallback;
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
		const inject = [
			"slots",
			"locale",
			"configForms",
			"sessions",
			"workspaces",
			"uiSession",
			"remote",
			"remote.session"
		];
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
			const { checked, label, onChange } = props;
			return react.createElement("button", {
				type: "button",
				role: "switch",
				"aria-checked": checked,
				"aria-label": label,
				onClick: () => onChange(!checked),
				style: {
					position: "relative",
					width: 36,
					height: 20,
					borderRadius: 10,
					border: "none",
					padding: 0,
					cursor: "pointer",
					flexShrink: 0,
					transition: "background-color 120ms ease",
					backgroundColor: checked ? "var(--dsw-accent-primary, #2f7cf6)" : "var(--dsw-border-strong, #3a3f4b)"
				}
			}, react.createElement("span", { style: {
				position: "absolute",
				top: 2,
				left: checked ? 18 : 2,
				width: 16,
				height: 16,
				borderRadius: "50%",
				backgroundColor: "#ffffff",
				transition: "left 120ms ease",
				display: "block"
			} }));
		}
		/**
		* Tab body: one row per feature — title + description on the left, switch on
		* the right. Rows are data-driven from the bound `ux-plus` section snapshot.
		*/
		function UxPlusTab(props) {
			const scope = props.scope;
			const [snapshot, setSnapshot] = react.useState(() => scope.getSnapshot());
			react.useEffect(() => scope.subscribe(() => {
				setSnapshot(scope.getSnapshot());
			}), [scope]);
			const value = snapshot && snapshot.value || {};
			const t = props.t;
			return react.createElement("div", {
				"data-dsh-ux-plus": "tab",
				"data-dsh-ux-plus-mode": snapshot && snapshot.mode || "unknown",
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 4,
					padding: "8px 0"
				}
			}, FEATURES.map((feature) => {
				const on = value[feature.id] !== false;
				const title = text(t, `${feature.id}.title`, feature.title);
				return react.createElement("div", {
					key: feature.id,
					"data-dsh-ux-plus-item": feature.id,
					style: {
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 16,
						padding: "8px 4px"
					}
				}, react.createElement("div", { style: {
					display: "flex",
					flexDirection: "column",
					gap: 2,
					minWidth: 0
				} }, react.createElement("span", { style: {
					fontSize: 14,
					color: "var(--dsw-alias-label-primary)"
				} }, title), react.createElement("span", { style: {
					fontSize: 12,
					color: "var(--dsw-alias-label-secondary)"
				} }, text(t, `${feature.id}.description`, feature.description))), react.createElement(Switch, {
					checked: on,
					label: title,
					onChange: (next) => {
						Promise.resolve(scope.set(feature.id, next)).catch(() => {});
					}
				}));
			}));
		}
		/**
		* @param {object} ctx - the client plugin context.
		* @returns {() => void} disposer: retires the section registration, disposes
		*   every mounted feature client, and unsubscribes the switch sync.
		*/
		function apply(ctx) {
			const uxScope = ctx.configForms.get("ux-plus");
			const tweakScope = ctx.configForms.get("ui-tweak");
			const offFeatures = mountFeatures(ctx, {
				react,
				primitives: {
					MenuItemButton: _deepseek_ai_dsh_client_ui_primitives.MenuItemButton,
					IconCopyOutlineRegular: _deepseek_ai_dsh_client_ui_primitives.IconCopyOutlineRegular,
					IconRightUpOutlineRegular: _deepseek_ai_dsh_client_ui_primitives.IconRightUpOutlineRegular
				},
				tweakScope,
				sessions: ctx.get("sessions"),
				workspaces: ctx.get("workspaces"),
				uiSession: ctx.get("uiSession")
			}, uxScope);
			const offLocale = ctx.effect(() => ctx.locale.register(SETTINGS_NAMESPACE, SETTINGS_MESSAGES));
			const offSection = ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "ux-plus",
				order: 100,
				label: () => "UX Plus",
				locale: SETTINGS_NAMESPACE,
				inject: () => ({ scope: uxScope })
			}, UxPlusTab));
			return () => {
				offSection();
				offLocale();
				offFeatures();
			};
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
