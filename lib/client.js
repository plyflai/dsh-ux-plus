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
		const id$6 = "conversation-typography";
		const title$6 = "Conversation typography";
		const description$6 = "Conversation font size and width for the chat area.";
		/** Settings-row copy, assembled into the `ux-plus-settings` namespace. */
		const settingsMessages$6 = {
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
		let release$3 = void 0;
		/**
		* Install the feature's host-side behavior (the ui-tweak section).
		* @param {object} ctx - the plugin context.
		* @returns {() => void} the disposer for this installation.
		*/
		function attach$6(ctx) {
			dispose$3();
			release$3 = () => {
				release$3 = void 0;
			};
			return release$3;
		}
		/** Tear down the current host-side installation; idempotent. */
		function dispose$3() {
			const current = release$3;
			release$3 = void 0;
			if (current !== void 0) current();
		}
		/**
		* Install the feature's client-side behavior.
		* @param {object} ctx - the client plugin context (slots service).
		* @param {object} deps - { tweakScope, react } (see module header).
		* @returns {() => void} disposer: unsubscribes, unregisters the row, removes
		*   the <style> tag — immediate, no refresh, no residue.
		*/
		function client$6(ctx, deps) {
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
		const feature$6 = {
			id: id$6,
			title: title$6,
			description: description$6,
			hasGear: false,
			settingsMessages: settingsMessages$6,
			host: (ctx) => attach$6(ctx),
			client: (ctx, deps) => client$6(ctx, deps)
		};
		//#endregion
		//#region features/workspace-session-menu/src/index.js
		/** Session ID action mounted through the host's session-menu slot. */
		const id$5 = "workspace-session-menu";
		const title$5 = "Session ID menu";
		const description$5 = "Add a \"Session ID\" copy item to session row menus.";
		/** Settings-row copy, assembled into the `ux-plus-settings` namespace. */
		const settingsMessages$5 = {
			zh: {
				title: "复制会话 ID",
				description: "在会话菜单里一键拿到会话 ID，方便续接会话、定位记录或排查问题。"
			},
			en: {
				title: "Session ID menu",
				description: "Add a \"Session ID\" copy item to session row menus."
			}
		};
		const NS$2 = "ux-plus-session-menu";
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
		function client$5(ctx, deps) {
			if (!deps?.react || !deps?.primitives) return () => {};
			const React = deps.react;
			const { MenuItemButton, IconCopyOutlineRegular } = deps.primitives;
			const offLocale = ctx.effect(() => ctx.locale.register(NS$2, {
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
				locale: NS$2
			}, SessionIdItem));
			return () => {
				offSlot();
				offLocale();
			};
		}
		/** Host companion; the menu action has no host resources. */
		function attach$5() {
			return () => {};
		}
		const feature$5 = {
			id: id$5,
			title: title$5,
			description: description$5,
			hasGear: false,
			settingsMessages: settingsMessages$5,
			host: attach$5,
			client: client$5
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
		*     is never ranked out of the Active block.
		*   - status dots (`statusOf`), one injected 7px dot per row instead of every
		*     status word: waiting (#f59e0b solid, 2s breathing halo), running
		*     (#3b82f6 ring spinner), unread (#22c55e solid, static); no status, no
		*     dot. Each dot carries a localized title + aria-label (待回复 / 运行中 /
		*     未读, waiting / running / unread). The host's own status dot is hidden
		*     while ours is present and restored exactly on dispose, so nothing is
		*     drawn twice.
		*   - the status source is `deps.uiSession.sessionStatus` — the ONE
		*     authoritative source of the sidebar's three indicators. Without it
		*     (degraded mode) there is no zone and no dot: this feature then
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
		*   - truncation (user rule): this feature adds NO fold row of its own — the
		*     host's own overflow button (展开其余 N 个会话 / Expand N more sessions) is
		*     the one expand control, reused for both systems. While a section is
		*     FOLDED (it has an Active block AND that button AND the user has not
		*     opened it), the dormant rows are hidden ENTIRELY (display:none, still
		*     in the DOM) and the button is pinned DIRECTLY BELOW the Active block
		*     (its rank slot is reserved between the blocks, so the pin holds however
		*     many rows the block holds) — before the first click only the Active
		*     block shows. The button's click toggles the section (a page-load Set,
		*     never persisted state): an expand click reveals it — the answering pass
		*     keeps every row the host renders visible (following the host's
		*     aria-expanded alone was the reported bounce — it flips only at FULL
		*     expansion) and the button goes back to the host's native place, the
		*     very bottom below every session, so an open section reads exactly like
		*     the host's own expanded list; a 收起 click (aria-expanded true at click
		*     time) re-folds the block and re-pins the button. Either click marks a
		*     user action (markUserActionOn), so the answering pass pierces the
		*     anti-churn freeze and waits the host's row glide out. Where every
		*     session is dormant, or the host renders no button (nothing to reuse,
		*     nothing to bring back), the section behaves exactly like the host.
		*   - workspace badge: the group header shows up to three 7px dots (waiting,
		*     unread, running) for the attention the Active block is hiding — never
		*     for the dormant block, whose status never floats up. The header carries
		*     the count tooltip (`badgeTooltip`: `2 待回复 · 1 未读`) for hover and
		*     screen readers.
		*   - age label: every workspace row still carries its host-styled age, now
		*     revealed on hover (opacity 0 → 1 through the injected style tag, hidden
		*     again while the row's menu is open, where the actions take the space).
		*   - row ranking: leading rows (the current blank + non-archived pins) keep
		*     the host's positions — and they are Active for that reason alone;
		*     everything else ranks by zone (the Active block first), then
		*     lastActivity desc, then id ascending. Archived rows keep today's
		*     treatment exactly (host row, no band, no dot).
		*   - group layer: a workspace with a running or pending member is lifted to
		*     "now" (it is active right now even if nothing was written for hours) and
		*     the 24h auto-collapse skips it; an unread completion never lifts a group.
		*   - anti-churn: while the pointer is inside the tree, or a row menu
		*     (`.menuOpen`) is open, ambient passes are deferred behind one dirty flag
		*     and re-run on pointerout / the next subscription event, plus two bounded
		*     retries (DEFER_RETRY_MS) so a deferral never waits on a signal that may
		*     never arrive. ONE thing pierces the freeze: a change in the host's view
		*     mode (分组方式 / 排序方式 / 筛选会话) restyles immediately with no FLIP — the
		*     freeze protects the cursor from ambient churn, not the user from their own
		*     click. The pass that answers a user click (a host overflow-button click
		*     is one — markUserActionOn) waits out the host's row glide
		*     (HOST_GLIDE_MS — AnimatedRows fades entering rows 100ms and glides moved
		*     rows 200ms with WAAPI transforms) and never FLIPs: restyling or
		*     inline-transforming mid-glide is what made the list flicker once right
		*     after 【展开其余 N 个会话】 was clicked, and every later pass lands on
		*     settled rows. The idle sub-pass never pierces (it clicks rows to collapse).
		*   - FLIP: rows that moved more than 4px are translated back to their old
		*     position for one frame, then animated over FLIP_MS (best-effort and
		*     scoped: skipped under prefers-reduced-motion, or where rAF /
		*     getBoundingClientRect is unavailable — e.g. the test fixtures).
		*/
		const id$4 = "workspace-recency-order";
		const title$4 = "Workspace recency order";
		const description$4 = "ONE partition rule: last activity. A workspace's sessions split into an Active block (running, or updated within 24 hours) and a dormant block. Each row carries a 7px status dot instead of status text, the Active block reads as a green band, and the history stays fully hidden below it — the host's own expand button, pinned directly below the Active block, is the one control that opens and closes it. The workspace header shows up to three dots for the attention the Active block hides. Workspaces idle for 24 hours still auto-collapse (once per workspace per page load) and every row still carries its last-active age on hover.";
		/** Settings-row copy, assembled into the `ux-plus-settings` namespace. */
		const settingsMessages$4 = {
			zh: {
				title: "最近活动排序",
				description: "只用一条判据：最后活动时间。工作区的会话分成两块——Active 区（仍在运行，或 24 小时内更新过）与休眠区。每行行首是 7px 状态点，不再有状态文字；Active 区是一整块绿底，历史在它下面整体隐藏，钉在 Active 区正下方的宿主【展开其余 N 个会话】就是唯一的展开/收起入口；工作区标题只上浮 Active 区被遮住的注意点（最多三个）。超过 24 小时没有更新的工作区仍会自动收起（每次打开页面每个工作区最多一次），每行仍带悬停显现的距今未更新时间。"
			},
			en: {
				title: "Workspace recency order",
				description: "ONE partition rule: last activity. A workspace's sessions split into an Active block (running, or updated within 24 hours) and a dormant block. Each row carries a 7px status dot instead of status text, the Active block reads as a green band, and the history stays fully hidden below it — the host's own expand button, pinned directly below the Active block, is the one control that opens and closes it. The workspace header shows up to three dots for the attention the Active block hides. Workspaces idle for 24 hours still auto-collapse (once per workspace per page load) and every row still carries its last-active age on hover."
			}
		};
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
		/**
		* Deferred-pass retry cadences (ms, spec §7). A pass deferred by the churn
		* freeze used to wait for the next external signal (pointerout, a store
		* notification, a mutation) and nothing else — and with the pointer resting
		* inside the tree every one of those signals re-defers, so a restyle could wait
		* indefinitely. Two bounded retries close that hole; the cap keeps a pointer
		* that simply stays put from costing a timer loop.
		*/
		const DEFER_RETRY_MS = [300, 1200];
		/**
		* How long a user action on one of this feature's own controls keeps the churn
		* freeze open (ms, spec §7). Long enough for the pass that answers the click
		* PLUS the follow-up pass the proxied host control needs (opening the host's
		* truncation is a React state change: our layer only converges on the very next
		* pass, and that pass may well arrive as a bare DOM mutation), short enough that
		* the freeze is back to protecting a resting cursor right after.
		*/
		const USER_ACTION_MS = 1e3;
		/**
		* The host's own row animation (AnimatedRows.tsx:5-6 — 100ms fade for entering
		* rows, 200ms WAAPI glide for rows the commit moved) plus one frame of margin.
		* A restyle landing MID-glide changes row heights the host measured before it,
		* and an inline FLIP transform fights the host's WAAPI transform (WAAPI wins
		* until it finishes, then the inline value lands in one snap) — the reported
		* one-time flicker right after 【展开其余 N 个会话】 was clicked. The pass that
		* answers a user click waits this out; no pass FLIPs inside the user-action
		* window.
		*/
		const HOST_GLIDE_MS = 220;
		/**
		* How many consecutive unexplained-count passes a section keeps its last
		* consistent presentation (spec §1: a bail is 'unknown', not 'wrong'). Our
		* passes ride the host's own mutations, so the first bail after a host commit is
		* usually the store lagging by a beat and the very next pass agrees again;
		* tearing the section down for that beat is what made the green band vanish.
		* Three passes is long enough to ride out a commit and short enough that a
		* shape this feature truly cannot model hands the section back quickly.
		*/
		const DRIFT_GRACE_PASSES = 3;
		/** FLIP transition duration (ms) for rows that moved. */
		const FLIP_MS = 180;
		/** Marker values this feature injects into the tree. */
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
		* The Active-zone members that carry attention (spec §5), split by kind: a
		* member of the workspace with a pending interaction, a live run, or an unread
		* completion — but only while it is Active. Reads the data layer only: the host
		* does not render collapsed rows beyond its watermark, so counting DOM rows would
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
		* The host's view-mode signature: 分组方式 / 排序方式 / 筛选会话 as one string.
		* A change here is the user explicitly asking for a different list, which is
		* the one thing the churn freeze must never hold back (spec §7). Absent or
		* unreadable state has its own stable signature, so a first read and a
		* disappeared key are both detected exactly once, never repeatedly.
		* @returns the joined signature of the three view options
		*/
		function viewSignature() {
			const state = readViewStore();
			if (state === null) return "absent";
			return `${state.groupBy}|${state.orderBy}|${state.archivedFilter}`;
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
		* The host's watermark slice (rows/WorkspaceBrowser.tsx:60-71 over the
		* replayed row order): blank rows always render, and only the first
		* `watermark` non-blank rows survive. Running rows are NOT exempt — they
		* consume the watermark like any row; the host instead RAISES the watermark
		* to cover them (requiredWatermark, WorkspaceBrowser.tsx:74-92), so a running
		* row beyond the base still renders, just as part of a longer slice.
		*/
		function watermarkRows(ids, data, watermark) {
			let count = 0;
			return ids.filter((id) => {
				const session = data.byId[id];
				if (session !== void 0 && session.blank === true) return true;
				count += 1;
				return count <= watermark;
			});
		}
		/**
		* The slice the host actually rendered, given the row count the DOM shows.
		*
		* A truncated section renders `blank + watermark` rows, so the live watermark
		* is derivable straight from the DOM: `watermark = domCount - blank`. This is
		* exact under the host's watermark model (0.2.1-rc.1): the base 5, the
		* attention raise, and the user's +5 clicks all end up as one number the DOM
		* already reports. The old model (running rows exempt, quota a multiple of 5)
		* mis-modelled every section holding a running row — the count gate tripped,
		* the section stepped aside, and its Active band and fold vanished together
		* (reported live: green gone, history leaked below the expand button).
		*
		* @returns {string[] | null} the slice, or null when the whole group is
		* folded (no rows rendered while the replay expects rows).
		*/
		function collapsedShown(expected, data, domCount) {
			if (domCount >= expected.length) return expected;
			if (domCount === 0) return null;
			const watermark = domCount - expected.filter((id) => {
				const session = data.byId[id];
				return session !== void 0 && session.blank === true;
			}).length;
			if (watermark < 0) return null;
			return watermarkRows(expected, data, watermark);
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
		* front positions, and ranking a pin out of the Active block would fight an
		* explicit user action. Only called with a status map (degraded mode has no
		* zones and no dots at all).
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
		/**
		* Did a consistent pass leave this section a presentation worth keeping?
		* Either the zone band or a written rank is enough: a section the layer never
		* reached has nothing to preserve, and must go straight to the step-aside path.
		* @returns {boolean}
		*/
		function hasPresentation(section) {
			if (findZoneBand(section) !== null) return true;
			for (const row of rowChildren(section)) {
				const order = row.style === void 0 ? void 0 : row.style.order;
				if (order !== void 0 && order !== "") return true;
			}
			return false;
		}
		/**
		* Fallback absorption (issue 3): when the row layer bails on count or pairing
		* drift, nothing may stay hidden or lie about zones. Anything this feature hid
		* on an earlier successful pass is put back and the band (which would strand
		* at stale geometry) is taken out; the host's own button needs no rescue — it
		* is host truth and stays where the host put it.
		*
		* A bail is 'unknown', not 'wrong' (the reported '怎么突然不生效了 / 绿色的效果
		* 没了'): these passes are scheduled by the HOST's own mutations, so one can
		* legitimately run in the instant between the host committing new rows and the
		* store publishing them — our exempt model and its slice then disagree by a row
		* or two. Stepping aside at that instant is what the user reads as the green
		* disappearing, so the section keeps its last consistent presentation (band and
		* ranks together, so nothing lies) for a few passes; only a divergence that
		* persists — a shape this feature genuinely cannot model — falls through to the
		* step-aside below.
		*/
		function absorbHostTruncation(section, account, data) {
			if (data.statusMap === null) return;
			const drift = data.driftPasses.get(account.key) || 0;
			if (drift < DRIFT_GRACE_PASSES && hasPresentation(section)) {
				data.driftPasses.set(account.key, drift + 1);
				return;
			}
			for (const row of rowChildren(section)) data.styles.restore(row, "display");
			const band = findZoneBand(section);
			if (band !== null) {
				releaseBandContext(section, data);
				detach(band, data.bands);
			}
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
		* present renders only its watermark (the Active-zone attention members outside
		* the replayed slice are hidden); an expanded workspace with no overflow
		* button shows everything, so attention needs no badge.
		*
		* Counts come from the data layer × the status map, never from counting DOM
		* rows — the host does not render collapsed rows beyond its watermark, so a DOM
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
		* The collapse replay is part of that contract: the rendered slice is the
		* host's watermark (blank rows always render, the first `watermark` non-blank
		* rows survive) with the live watermark derived from the DOM (collapsedShown).
		* The pre-0.2.1 model (running rows exempt, quota a multiple of 5) matched
		* only idle sections; on a section with a running session it replayed one row
		* short, tripped the count gate and left the whole row layer off — the
		* running conversation stayed below a stale one, which is precisely what this
		* feature exists to prevent.
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
			const buttonRank = data.statusMap === null || activeCount === 0 ? -1 : activeCount;
			ordered.forEach((entry, index) => {
				const rank = buttonRank >= 0 && index >= buttonRank ? index + 1 : index;
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
			const fold = data.statusMap !== null && buttonRank >= 0 && button !== null && !data.revealed.has(account.key);
			if (button !== null) {
				data.styles.write(button, "order", fold ? String(10 + buttonRank) : "999");
				if (typeof data.markUserActionOn === "function") data.markUserActionOn(button, account.key);
			}
			if (data.statusMap !== null) for (const entry of ordered) if (fold && entry.zone === "dormant" && !data.archived.has(entry.session.id)) data.styles.write(entry.element, "display", "none");
			else data.styles.restore(entry.element, "display");
			if (data.statusMap !== null) {
				ensureZoneBand(section, ordered, data);
				data.driftPasses.delete(account.key);
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
		function client$4(ctx, deps) {
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
			/** Account keys whose dormant block the user expanded this page load (§4). */
			const revealed = /* @__PURE__ */ new Set();
			/** Our injected attention badges / status dots, for dispose. */
			const badges = /* @__PURE__ */ new Set();
			const dots = /* @__PURE__ */ new Set();
			/** The per-section Active band elements (one per section, §2). */
			const bands = /* @__PURE__ */ new Set();
			/** Host rows carrying a zone attribute (removed again on dispose, §2). */
			const zoneMarked = /* @__PURE__ */ new Set();
			/**
			* Consecutive unexplained-count passes per section key: the grace counter for
			* a section that is keeping its last consistent presentation (spec §1).
			*/
			const driftPasses = /* @__PURE__ */ new Map();
			/** Rows with an in-flight FLIP transform (cleared on dispose, §8). */
			const flips = /* @__PURE__ */ new Set();
			/** True while the pointer is inside the grouped tree (spec §7). */
			let pointerInTree = false;
			/**
			* The view-mode signature the previous scheduled pass saw, or null before the
			* first one. A difference is a 分组方式 / 排序方式 / 筛选会话 click, which pierces
			* the freeze (spec §7).
			*/
			let lastViewSignature = null;
			/** Pending bounded retry of a deferred pass, or null (spec §7). */
			let retryTimer = null;
			/** How many retries of the current deferral have already been armed. */
			let retrySteps = 0;
			/**
			* Timestamp until which a pass answers a user action and therefore pierces the
			* freeze (spec §7). 0 = nothing pressed.
			*/
			let userActedUntil = 0;
			/**
			* True once the pass that ANSWERS the user action has run. Only that first pass
			* skips the FLIP: the host has just entered or moved rows under its own
			* WAAPI glide (an inline transform would fight it — see HOST_GLIDE_MS),
			* while an ambient move that merely happens inside the same window still
			* animates.
			*/
			let userActedHandled = true;
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
			/**
			* Mark the host's own overflow button once (WeakSet: the host remounts it on
			* every watermark change, each fresh element gets its one listener). Its
			* click is the section's ONE expand control and it toggles: the host labels
			* the button 收起 exactly while `aria-expanded` is true (nothing hidden),
			* so a click read at that attribute's face value either opens the section
			* (revealed.add — the answering pass must never fold freshly expanded rows
			* straight back, the reported bounce) or closes it again (revealed.delete —
			* the next pass re-folds the dormant block, the user's 收起). Either way it
			* marks a user action, so the answering pass pierces the anti-churn freeze
			* and waits the host's row glide out.
			*/
			const actionMarked = /* @__PURE__ */ new WeakSet();
			function markUserActionOn(element, accountKey) {
				if (typeof element.addEventListener !== "function") return;
				if (actionMarked.has(element)) return;
				actionMarked.add(element);
				element.addEventListener("click", () => {
					if (disposed) return;
					if (typeof element.getAttribute === "function" && element.getAttribute("aria-expanded") === "true") revealed.delete(accountKey);
					else revealed.add(accountKey);
					onUserAction();
				});
			}
			/**
			* Note that the user just pressed the host's overflow button (spec §7). A
			* real click ALWAYS arrives with the pointer already inside the tree —
			* pointerover fires first — so without this the churn freeze deferred the
			* very pass that answers the click, and the list read as dead until the
			* pointer happened to leave the sidebar (reported live as 【N 条历史会话】
			* 打不开). The freeze protects the cursor from AMBIENT churn, never from a
			* click the user just made: passes are let through for USER_ACTION_MS (no
			* FLIP — the state the user asked for should simply be there), and one
			* bounded retry is armed so our layer converges on the host control even
			* when its state change sends no store signal at all.
			* @returns {void}
			*/
			function onUserAction() {
				userActedUntil = Date.now() + USER_ACTION_MS;
				userActedHandled = false;
				schedule();
				armRetry();
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
					statusMap: readStatusMap(),
					now: Date.now(),
					locale: activeLocale(),
					revealed,
					badges,
					dots,
					bands,
					zoneMarked,
					driftPasses,
					markUserActionOn,
					onUserAction,
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
			* notification, a mutation) re-runs it once the freeze has lifted, with two
			* bounded retries covering the case where none of those events ever comes.
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
			/**
			* One full pass: structural find, then the two-layer reorder.
			* @param force - the host's view mode changed since the previous pass: run
			* even while the freeze holds, and skip the FLIP (every row is moving because
			* the user asked for a different view, so animating from the old positions
			* would animate the very change they clicked for).
			* @returns {void}
			*/
			function reorder(force) {
				if (frozen() && force !== true) {
					armRetry();
					return;
				}
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
				const tops = force === true ? null : snapshotTops(found.tree);
				styles.write(found.tree, "display", "flex");
				styles.write(found.tree, "flexDirection", "column");
				orderLevel(found.tree, roots, true, data, view);
				if (tops !== null) animateFlip(tops, flips);
			}
			/**
			* Idle sub-behavior pass: label every workspace row with activity and
			* collapse idle ones once. Independent of the reorder (a bail-out there
			* never suppresses labels here); shares the same debounced schedule. Unlike
			* the reorder this NEVER pierces the freeze: collapsing a workspace is a
			* `row.click()` on a header, and doing that under a resting pointer is
			* exactly the surprise the freeze exists to prevent.
			*/
			function idlePass() {
				if (frozen()) {
					armRetry();
					return;
				}
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
				const answeringNow = Date.now() < userActedUntil && !userActedHandled;
				timer = window.setTimeout(function() {
					timer = null;
					if (disposed) return;
					const signature = viewSignature();
					const switched = lastViewSignature !== null && signature !== lastViewSignature;
					lastViewSignature = signature;
					const acting = Date.now() < userActedUntil;
					const answering = acting && !userActedHandled;
					const frozenNow = frozen();
					const spent = retrySteps >= DEFER_RETRY_MS.length;
					if (frozenNow && !switched && !acting && !spent) {
						armRetry();
						return;
					}
					if (acting) userActedHandled = true;
					if (!frozenNow) retrySteps = 0;
					reorder(switched || answering || spent);
					idlePass();
				}, answeringNow ? HOST_GLIDE_MS : 0);
			}
			/**
			* Arm the next bounded retry of a deferred pass (spec §7). The deferral used
			* to depend on an external signal that a resting pointer re-defers forever;
			* these two timers guarantee the pass eventually runs on its own.
			* @returns {void}
			*/
			function armRetry() {
				if (retryTimer !== null || disposed || retrySteps >= DEFER_RETRY_MS.length) return;
				retryTimer = window.setTimeout(function() {
					retryTimer = null;
					schedule();
				}, DEFER_RETRY_MS[retrySteps]);
				retrySteps += 1;
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
				if (retryTimer !== null && typeof window.clearTimeout === "function") window.clearTimeout(retryTimer);
				retryTimer = null;
				retrySteps = 0;
				lastViewSignature = null;
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
				driftPasses.clear();
				styleTag.remove();
				styles.clear();
			};
		}
		/** Currently installed host-side disposer, or undefined while detached. */
		let release$2 = void 0;
		/**
		* Install the feature's host-side behavior (none for this feature).
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
		const id$3 = "tool-ask-question-expanded";
		const title$3 = "Ask question expanded";
		const description$3 = "Reveal the question and its answer in the chat flow by default.";
		/** Settings-row copy, assembled into the `ux-plus-settings` namespace. */
		const settingsMessages$3 = {
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
			tag.setAttribute("data-feature", id$3);
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
		function client$3(ctx, deps) {
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
		let release$1 = void 0;
		/**
		* Install the feature's host-side behavior (none for this feature).
		* @param {object} ctx - the plugin context.
		* @returns {() => void} the disposer for this installation.
		*/
		function attach$3(ctx) {
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
		const feature$3 = {
			id: id$3,
			title: title$3,
			description: description$3,
			hasGear: false,
			settingsMessages: settingsMessages$3,
			host: (ctx) => attach$3(ctx),
			client: (ctx, deps) => client$3(ctx, deps)
		};
		//#endregion
		//#region features/workspace-session-inherit/src/index.js
		/** Inherit-conversation action mounted through the host's session-menu slot. */
		const id$2 = "workspace-session-inherit";
		const title$2 = "Inherit conversation";
		const description$2 = "Add an \"Inherit conversation\" item that opens a fresh session with a chosen model to summarize the clicked conversation.";
		/** Settings-row copy, assembled into the `ux-plus-settings` namespace. */
		const settingsMessages$2 = {
			zh: {
				title: "继承对话",
				description: "在会话菜单里选一个模型，当前工作区开一个新会话，让新模型读原会话的进度接着往下走。"
			},
			en: {
				title: "Inherit conversation",
				description: "Add an \"Inherit conversation\" item that opens a fresh session with a chosen model to summarize the clicked conversation."
			}
		};
		const NS$1 = "ux-plus-session-inherit";
		const MESSAGES$1 = {
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
		function mintRequestId$1() {
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
				requestId: mintRequestId$1(),
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
		function client$2(ctx, deps) {
			if (!deps?.react || !deps?.primitives) return () => {};
			const React = deps.react;
			const { MenuItemButton, IconRightUpOutlineRegular } = deps.primitives;
			const offLocale = ctx.effect(() => ctx.locale.register(NS$1, MESSAGES$1));
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
				locale: NS$1
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
		function attach$2() {
			return () => {};
		}
		const feature$2 = {
			id: id$2,
			title: title$2,
			description: description$2,
			hasGear: false,
			settingsMessages: settingsMessages$2,
			host: attach$2,
			client: client$2
		};
		//#endregion
		//#region features/attention-favicon/src/index.js
		/**
		* dsh-ux-plus feature module: Attention favicon.
		*
		* Frozen feature id `attention-favicon`.
		*
		* The tab favicon keeps the host's whale — this feature only ever tints it,
		* breathes it, or adds one dot to it, never replaces it. Three INDEPENDENT
		* layers compose on the whale (they can show at the same time):
		*
		*   whale breath   any counted session is COMPUTING — a true fade-out /
		*                  fade-in (72-frame cosine at 20 fps, 3.6 s cycle, 35%
		*                  floor). A session blocked on your click does not count:
		*                  the host keeps it 'running' while it waits, but waiting
		*                  is the orange dot's story, not the whale's. The dot
		*                  blinks on its own 450 ms duty cycle; the whale never
		*                  inherits the blink — only the breath moves it.
		*   green whale    any counted session finished unread — the SAME flag the
		*                  workspace list paints its green dot from (host
		*                  completionUnread), so favicon green ⟺ workspace green;
		*                  the whale itself is re-tinted green instead of a dot
		*   orange dot     any counted session awaits a click (pendingInteraction),
		*                  fast blink, bottom-right
		*
		* With none of the three up, the untouched host favicon shows (this feature's
		* links detach). Subagent and blank sessions are excluded from every count
		* (same filter as workspace-recency-order, index.ts:249) — a fan-out of
		* subagents must not keep the tab permanently orange (the "boy who cried
		* wolf" failure).
		*
		* Animation mechanism (deliberate): a JS timer swaps the overlay link's href
		* between precomputed SVG data URLs. SMIL animation inside an SVG favicon
		* renders as a static first frame in Chromium, and a JS timer is throttled
		* to ~1/min once a tab has been hidden for minutes — so the frame tables are
		* duty-cycle designed to survive a frozen timer: the orange blink is on for
		* 2 of its 3 frames and the breath never dips below 35% opacity, whichever
		* frame throttling parks on, the alert stays visible. The breath table is a
		* cosine (equal 50 ms steps at 20 fps, smooth deltas ≤ 0.03) so the visible
		* motion reads as breathing, not flicker; frames are built lazily and cached
		* per (tint, opacity, dot) triple, so the 72×3 cycle costs nothing upfront.
		*
		* Theme preservation: the host declares two media-scoped icon links
		* (apps/web/index.html:7-8, dark whale #fff / light whale #000). This
		* feature fetches both bases at mount and appends its own two links with the
		* SAME media attributes, so the OS theme still picks the right whale; a
		* failed fetch — or a base whose whale cannot be re-tinted — degrades the
		* whole feature to a no-op (the host icons stay).
		*
		* D5 contract surface (consumed by the package host and client halves):
		*   feature.host(ctx)          -> disposer (no host resources).
		*   feature.client(ctx, deps)  -> disposer. deps: { sessions, uiSession }.
		*   attach / dispose           - host-side installation aliases (P1 surface).
		*/
		const id$1 = "attention-favicon";
		const title$1 = "Attention favicon";
		const description$1 = "The whale favicon fades slowly in and out while any session is computing, turns into a green whale exactly when the workspace list has an unread dot, and blinks an orange dot while something awaits your click.";
		/** Settings-row copy, assembled into the `ux-plus-settings` namespace. */
		const settingsMessages$1 = {
			zh: {
				title: "标签页注意力指示灯",
				description: "白鲸 favicon：有会话在算就缓慢渐隐渐显地呼吸（等你点的会话不算在算）；工作区列表有绿点（跑完没看）时整条鲸鱼变绿；有东西等你点时橙点闪烁。"
			},
			en: {
				title: "Attention favicon",
				description: "The whale favicon fades slowly in and out while any session is computing, turns into a green whale exactly when the workspace list has an unread dot, and blinks an orange dot while something awaits your click."
			}
		};
		/** Host favicon bases (apps/web/index.html:7-8). */
		const LIGHT_FAVICON_PATH = "/favicon.svg";
		const DARK_FAVICON_PATH = "/favicon-dark.svg";
		const DARK_MEDIA = "(prefers-color-scheme: dark)";
		const LIGHT_MEDIA = "(prefers-color-scheme: light)";
		/** The unread tint: same green the workspace list dots use, readable on both tab strips. */
		const WHALE_GREEN = "#22c55e";
		const DOT_ORANGE = "#f59e0b";
		/** Orange dot geometry on the host's 50x50 viewBox, bottom-right. */
		const ORANGE_DOT = {
			cx: 40.5,
			cy: 40.5,
			r: 9
		};
		const BLINK_FRAMES = [
			1,
			1,
			0
		];
		const BREATH_FLOOR = .35;
		/** The breath cosine: n samples of 0.35 + 0.65·(1+cos)/2, 3-decimal steps. */
		function buildBreathFrames(n) {
			const frames = [];
			for (let i = 0; i < n; i += 1) {
				const eased = (1 + Math.cos(2 * Math.PI * i / n)) / 2;
				frames.push(Math.round((BREATH_FLOOR + .65 * eased) * 1e3) / 1e3);
			}
			return frames;
		}
		const BREATH_FRAMES = buildBreathFrames(72);
		/**
		* Is a session counted by the tab indicator? Subagent fan-out and blank
		* drafts stay out (recency-order's filter, index.ts:249).
		* @param {{ blank?: boolean, origin?: string }} session
		* @returns {boolean}
		*/
		function isCountedSession(session) {
			return session !== void 0 && session !== null && session.blank !== true && session.origin !== "subagent";
		}
		/**
		* The favicon layers for one status snapshot — three independent booleans,
		* no priority: breath, green whale and orange dot compose freely (e.g. a
		* fading green whale with a blinking orange dot at once).
		*
		* Breathing counts only sessions that are COMPUTING: the host's agent
		* status stays 'running' while a turn blocks on ask_user / approval
		* (packages/core/agent-loop/src/agent.ts:141 derives it from the phase),
		* but a session waiting on your click is not working — it shows the orange
		* dot instead, and does not breathe the whale.
		* @param {Array<{ running: boolean|undefined, pending: boolean, unread: boolean }>} counted
		*   one entry per counted session that the status map knows about.
		* @returns {{ breathing: boolean, greenWhale: boolean, orange: boolean }}
		*/
		function computeFaviconLayers(counted) {
			let breathing = false;
			let greenWhale = false;
			let orange = false;
			for (const status of counted) {
				if (status.running === true && status.pending !== true) breathing = true;
				if (status.unread === true) greenWhale = true;
				if (status.pending === true) orange = true;
			}
			return {
				breathing,
				greenWhale,
				orange
			};
		}
		/** Cache key for one layer combination. */
		function layersKey(layers) {
			return `${layers.breathing ? 1 : 0}${layers.greenWhale ? 1 : 0}${layers.orange ? 1 : 0}`;
		}
		/**
		* The frame spec for one tick of the layer combination: where the breath
		* cosine and the blink duty cycle stand.
		* @param {{ breathing: boolean, orange: boolean }} layers
		* @param {number} tick
		* @param {boolean} [blinkEveryTick] - hidden-tab mode: Chrome clamps hidden
		* timers to ~1 tick/second, so holding each blink frame for
		* BLINK_FRAME_TICKS ticks would stretch the blink to seconds per state.
		* Advancing one blink frame per tick keeps roughly one transition per
		* second (on 2s / off 1s — the duty still freezes visible).
		* @returns {{ breathOpacity: number, orangeOn: boolean }}
		*/
		function frameAt(layers, tick, blinkEveryTick = false) {
			return {
				breathOpacity: layers.breathing ? BREATH_FRAMES[tick % BREATH_FRAMES.length] : 1,
				orangeOn: layers.orange ? BLINK_FRAMES[(blinkEveryTick ? tick : Math.floor(tick / 3)) % BLINK_FRAMES.length] > 0 : false
			};
		}
		/**
		* Re-tint the whale: the first `fill="#…"` inside the body (the whale path;
		* the root tag's fill="none" lives in the head, already sliced off).
		* @param {string} body
		* @param {string} hex
		* @returns {string | null} the tinted body, or null when the whale has no
		*   hex fill to take over (the base is then rejected at load time).
		*/
		function tintWhaleBody(body, hex) {
			const match = body.match(/fill="#[0-9a-fA-F]{3,8}"/);
			if (match === null) return null;
			return body.replace(match[0], `fill="${hex}"`);
		}
		/**
		* Compose one favicon SVG from the host base: the whale (optionally re-tinted
		* green for unread, optionally wrapped in a breath group) plus the blinking
		* orange dot bottom-right.
		* @param {string} baseSvg the fetched host SVG text.
		* @param {{ breathOpacity?: number, greenWhale?: boolean, orangeOn?: boolean, orangeOpacity?: number }} frame
		* @returns {string | null} the composed SVG, or null when the base cannot be
		*   spliced (not an SVG, a root tag containing '>' inside attributes, or —
		*   when a green whale is asked for — a whale without a hex fill).
		*/
		function buildFrameSvg(baseSvg, frame) {
			if (typeof baseSvg !== "string") return null;
			const close = baseSvg.lastIndexOf("</svg>");
			const rootEnd = baseSvg.indexOf(">");
			if (rootEnd <= 0 || close < rootEnd) return null;
			const breathOpacity = frame && typeof frame.breathOpacity === "number" ? frame.breathOpacity : 1;
			const greenWhale = Boolean(frame && frame.greenWhale);
			const orangeOpacity = frame && typeof frame.orangeOpacity === "number" ? frame.orangeOpacity : 1;
			const orange = Boolean(frame && frame.orangeOn) && orangeOpacity > 0;
			if (!greenWhale && !orange && breathOpacity >= 1) return baseSvg;
			const head = baseSvg.slice(0, rootEnd + 1);
			let body = baseSvg.slice(rootEnd + 1, close);
			const tail = baseSvg.slice(close);
			if (greenWhale) {
				const tinted = tintWhaleBody(body, WHALE_GREEN);
				if (tinted === null) return null;
				body = tinted;
			}
			const breath = breathOpacity < 1 ? `<g opacity="${breathOpacity}">` : "";
			const breathEnd = breathOpacity < 1 ? "</g>" : "";
			let dot = "";
			if (orange) {
				const alpha = orangeOpacity < 1 ? ` fill-opacity="${orangeOpacity}"` : "";
				dot = `<circle cx="${ORANGE_DOT.cx}" cy="${ORANGE_DOT.cy}" r="${ORANGE_DOT.r}" fill="${DOT_ORANGE}"${alpha}/>`;
			}
			return `${head}${breath}${body}${breathEnd}${dot}${tail}`;
		}
		/** Encode an SVG string as a favicon data URL. */
		function svgDataUrl(svg) {
			return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
		}
		/**
		* The two theme hrefs for one frame of one layer combination.
		* @param {{ greenWhale?: boolean }} layers
		* @param {{ breathOpacity: number, orangeOn: boolean }} frame
		* @param {{ light: string, dark?: string|null }} bases
		* @returns {{ light: string|null, dark: string|null } | null} null when a
		*   base cannot be composed (feature degrades to no-op upstream).
		*/
		function buildFaviconHrefs(layers, frame, bases) {
			const spec = {
				...frame,
				greenWhale: layers.greenWhale === true
			};
			return {
				light: bases.light ? svgDataUrl(buildFrameSvg(bases.light, spec)) : null,
				dark: bases.dark ? svgDataUrl(buildFrameSvg(bases.dark, spec)) : null
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
		/**
		* Install the feature's client-side behavior.
		* @param {object} ctx - the client plugin context (unused; the feature reads
		*   its services from deps).
		* @param {object} deps - { sessions, uiSession } (see src/client.js). `sessions`
		*   is the sessions SERVICE face (`ctx.get('sessions')` = ISessions, see
		*   packages/api/session-controller/src/client/contract/sessions.ts): the store
		*   to subscribe to is its `list` face, never the service object itself — the
		*   service has no `subscribe`/`getSnapshot` (the same rule as
		*   features/workspace-recency-order/src/index.js:2191).
		* @returns {() => void} disposer: stops the timer, detaches the overlay
		*   links, unsubscribes everything — off == never installed.
		*/
		function client$1(ctx, deps) {
			const sessionsService = deps && deps.sessions;
			const sessions = sessionsService && sessionsService.list;
			const statusObservable = deps && deps.uiSession && deps.uiSession.sessionStatus;
			if (!sessions || typeof sessions.getSnapshot !== "function" || typeof sessions.subscribe !== "function") return () => {};
			if (!statusObservable || typeof statusObservable.getSnapshot !== "function") return () => {};
			if (typeof document === "undefined" || typeof document.createElement !== "function") return () => {};
			let disposed = false;
			/** Fetched whale bases; null until both loads settle. */
			let bases = null;
			/** (tint, opacity, dot) triple -> href pair, built lazily. */
			let hrefCache = /* @__PURE__ */ new Map();
			let layers = computeFaviconLayers([]);
			let key = layersKey(layers);
			let tick = 0;
			let timer = null;
			/** Overlay links, kept detached while idle so the host icons show through. */
			const links = [];
			/** The counted sessions' status entries, or null while either store waits. */
			function countedStatuses() {
				let list = null;
				let map = null;
				try {
					list = sessions.getSnapshot();
					map = statusObservable.getSnapshot();
				} catch {
					return null;
				}
				if (!list || list.phase !== "ready") return null;
				if (!map || typeof map.get !== "function") return null;
				const counted = [];
				for (const id of Object.keys(list.byId)) {
					if (!isCountedSession(list.byId[id])) continue;
					const status = map.get(id);
					if (status === void 0 || status === null) continue;
					counted.push({
						running: status.running,
						pending: status.pendingInteraction !== void 0 && status.pendingInteraction !== null,
						unread: status.completionUnread === true
					});
				}
				return counted;
			}
			function ensureLink(media, type) {
				const link = document.createElement("link");
				link.setAttribute("rel", "icon");
				link.setAttribute("media", media);
				link.setAttribute("type", type);
				link.dataset.dshUxPlus = "attention-favicon";
				links.push(link);
				return link;
			}
			function attachLinks() {
				for (const link of links) if (link.parentNode === null || link.parentNode === void 0) document.head.appendChild(link);
			}
			function detachLinks() {
				for (const link of links) if (link.parentNode !== null && link.parentNode !== void 0) link.parentNode.removeChild(link);
			}
			function hrefsFor(frame) {
				const cacheKey = `${layers.greenWhale ? 1 : 0}|${frame.breathOpacity}|${frame.orangeOn ? 1 : 0}`;
				if (hrefCache.has(cacheKey)) return hrefCache.get(cacheKey);
				const hrefs = buildFaviconHrefs(layers, frame, bases);
				hrefCache.set(cacheKey, hrefs);
				return hrefs;
			}
			function paint() {
				if (bases === null) return;
				if (key === "000") {
					detachLinks();
					return;
				}
				const href = hrefsFor(frameAt(layers, tick, typeof document !== "undefined" && document.hidden === true));
				let painted = false;
				for (const link of links) {
					const url = link.getAttribute("media") === "(prefers-color-scheme: dark)" ? href.dark : href.light;
					if (url === null || url === void 0) continue;
					if (link.getAttribute("href") !== url) link.setAttribute("href", url);
					painted = true;
				}
				if (painted) attachLinks();
				else detachLinks();
			}
			function stopTimer() {
				if (timer !== null && typeof window !== "undefined" && typeof window.clearInterval === "function") window.clearInterval(timer);
				timer = null;
			}
			function restartTimer() {
				stopTimer();
				if (!layers.breathing && !layers.orange) return;
				if (typeof window === "undefined" || typeof window.setInterval !== "function") return;
				timer = window.setInterval(function() {
					tick += 1;
					paint();
				}, 50);
			}
			function recompute() {
				if (disposed || bases === null) return;
				const counted = countedStatuses();
				if (counted === null) return;
				const next = computeFaviconLayers(counted);
				const nextKey = layersKey(next);
				if (nextKey !== key) {
					layers = next;
					key = nextKey;
					tick = 0;
					restartTimer();
				} else if (timer === null && (next.breathing || next.orange)) restartTimer();
				paint();
			}
			function onStatus() {
				if (disposed) return;
				recompute();
			}
			/**
			* A hidden/occluded tab freezes the timer on whatever frame throttling
			* caught (by design the frozen frame shows the alert — the blink is on
			* for 2 of its 3 frames). On the real hidden → visible EDGE, restart the
			* cycle from the on-frame: the blink or breath resumes immediately
			* instead of waiting for the throttled tick. Repeated 'visible' events
			* (some environments fire spurious ones) must NOT reset the cycle —
			* resetting on every event pins the blink to its on-frame and the dot
			* reads as static while the tab is in the foreground.
			*/
			let lastVisible = typeof document === "undefined" || document.visibilityState !== "hidden";
			function onVisibility() {
				if (disposed) return;
				if (!(typeof document !== "undefined" && document.visibilityState === "visible")) {
					lastVisible = false;
					return;
				}
				if (lastVisible) return;
				lastVisible = true;
				tick = 0;
				restartTimer();
				recompute();
			}
			if (typeof document !== "undefined" && typeof document.addEventListener === "function") document.addEventListener("visibilitychange", onVisibility);
			/** Fetch one whale base; null on any failure (feature degrades to no-op). */
			async function loadBase(path) {
				if (typeof fetch !== "function") return null;
				try {
					const response = await fetch(path);
					if (!response || response.ok !== true) return null;
					const text = await response.text();
					return buildFrameSvg(text, { greenWhale: true }) === null ? null : text;
				} catch {
					return null;
				}
			}
			async function loadBases() {
				const light = await loadBase(LIGHT_FAVICON_PATH);
				if (disposed || light === null) return;
				const dark = await loadBase(DARK_FAVICON_PATH).catch(() => null);
				if (disposed) return;
				bases = {
					light,
					dark: dark === null ? light : dark
				};
				hrefCache = /* @__PURE__ */ new Map();
				if (links.length === 0) {
					ensureLink(DARK_MEDIA, "image/svg+xml");
					ensureLink(LIGHT_MEDIA, "image/svg+xml");
				}
				recompute();
			}
			const offSessions = sessions.subscribe(onStatus);
			const offStatus = typeof statusObservable.subscribe === "function" ? statusObservable.subscribe(onStatus) : function() {};
			loadBases().catch(() => {});
			return function cleanup() {
				disposed = true;
				stopTimer();
				detachLinks();
				if (typeof document !== "undefined" && typeof document.removeEventListener === "function") document.removeEventListener("visibilitychange", onVisibility);
				for (const link of links) {
					const at = links.indexOf(link);
					if (at !== -1) links.splice(at, 1);
				}
				offSessions();
				offStatus();
				bases = null;
				hrefCache = /* @__PURE__ */ new Map();
			};
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
		//#region features/workspace-quick-search/src/index.js
		/**
		* Quick search box (feature id `workspace-quick-search`).
		*
		* The usage it enables: "use DeepSeek like a search engine". Type a question in
		* the sidebar, press Enter, and land in a NORMAL session — same chat page, same
		* streaming, same tools — except that the session belongs to a private
		* background workspace the sidebar never lists. Quick lookups therefore stop
		* costing "remember to create a session first" and stop polluting the workspace
		* tree afterwards.
		*
		* Why each piece of the implementation looks the way it does:
		*
		*   - Placement. The host exposes no slot between the sidebar's panel list and
		*     the workspace region (ui-sidebar `SidebarRoot.tsx:280` renders `<nav
		*     class=panelList>` and `:297` renders `<div class=regionArea>` around the
		*     `sidebar.workspaces` slot), so the box is inserted as the region's FIRST
		*     child and kept alive by one MutationObserver. When the region is not
		*     rendered — the sidebar sits in its 56px rail — the box is simply absent
		*     (no error, no half-mounted state).
		*   - Plain DOM, not a React tree: the box must survive every remount of the
		*     workspace browser, which is exactly why the sibling DOM features are
		*     plain DOM too (and why the settings-tab switch can mount/unmount us with
		*     no renderer involved).
		*   - Session creation reuses the path the inherit-conversation feature already
		*     proved end to end: `sessions.create` -> `remote.session.selectModel` ->
		*     `remote.session.prompt` -> `uiWorkspace.openSession`.
		*   - "Not shown in DSH" cannot be done by archiving (an archived Session is
		*     barred from `agent/pre-step`, `archived-session-gate.ts:24-30`, so it
		*     could never run again) and the host has no filter that hides one
		*     workspace, so the rows are hidden by ONE injected rule keyed on the
		*     host's own stable attributes: the workspace group wrapper that holds
		*     `data-row-key="workspace:<id>"` and every `data-row-key="session:<id>"`
		*     row the workspace owns (`Rows.tsx:245,590`). Turning the feature off
		*     removes the rule, and the workspace reappears.
		*   - The background workspace has to exist on disk before it can be
		*     registered (`packages/workspace/workspace/src/index.ts:241` rejects a
		*     non-directory path) and the browser cannot create directories, so the
		*     package host half (`src/index.js`) creates it once at load. That is also
		*     why a failed workspace registration is reported instead of silently
		*     falling back to the current workspace — a session outside the private
		*     workspace could not be hidden, which is the one promise this feature
		*     makes.
		*/
		/** Stable feature id — also the per-feature switch key in the `ux-plus` section. */
		const id = "workspace-quick-search";
		/** Settings-row title (English constant; the settings tab localizes it). */
		const title = "Quick search box";
		/** Settings-row description fallback. */
		const description = "Put a search box above the workspace list: type a question, press Enter and a normal session opens in a background workspace the sidebar never lists. The clock icon lists the last 50 searches.";
		/** Settings-row copy, assembled into the `ux-plus-settings` namespace. */
		const settingsMessages = {
			zh: {
				title: "快速搜索框",
				description: "在「自动化任务」下方常驻一个搜索框：输入后回车即开一个普通会话，会话落在后台独立工作区里、不显示在侧边栏；右侧时钟图标列出最近 50 条搜索。"
			},
			en: {
				title: "Quick search box",
				description: "Put a search box above the workspace list: type a question, press Enter and a normal session opens in a background workspace the sidebar never lists. The clock icon lists the last 50 searches."
			}
		};
		/** Locale namespace for the box's own copy. */
		const NS = "ux-plus-quick-search";
		/** Every user-visible string, keyed so the active DSH locale picks the row. */
		const MESSAGES = {
			zh: {
				placeholder: "直接搜，不用工作区",
				model: "模型",
				modelsEmpty: "还没有可用的模型",
				history: "搜索历史",
				historyTitle: "最近 50 条搜索",
				historyEmpty: "还没有搜索记录",
				clear: "清空",
				starting: "正在打开…",
				noHome: "找不到主目录，无法定位搜索存储区",
				noWorkspace: "无法准备搜索工作区：后台目录未就绪，重启 DSH 后重试",
				createFailed: "创建会话失败",
				promptFailed: "发送失败",
				runningNone: "没有会话在运行",
				runningCount: "{n} 个会话正在运行",
				runningTitle: "正在运行 · {n}",
				untitled: "未命名会话",
				openFailed: "打不开这个会话：{reason}",
				openService: "没有找到宿主的会话导航服务",
				now: "刚刚",
				minutes: "{n} 分钟前",
				hours: "{n} 小时前",
				yesterday: "昨天",
				days: "{n} 天前"
			},
			en: {
				placeholder: "Just search, no workspace",
				model: "Model",
				modelsEmpty: "No models available yet",
				history: "Search history",
				historyTitle: "Last 50 searches",
				historyEmpty: "No searches yet",
				clear: "Clear",
				starting: "Opening…",
				noHome: "Cannot locate the home directory for the search workspace",
				noWorkspace: "Cannot prepare the search workspace: its directory is missing, restart DSH and retry",
				createFailed: "Could not create the session",
				promptFailed: "Could not send the prompt",
				runningNone: "Nothing running",
				runningCount: "{n} running",
				runningTitle: "Running · {n}",
				untitled: "Untitled session",
				openFailed: "Could not open this session: {reason}",
				openService: "The host session navigation service is unavailable",
				now: "just now",
				minutes: "{n} min ago",
				hours: "{n} h ago",
				yesterday: "yesterday",
				days: "{n} d ago"
			}
		};
		/** Path segments of the private workspace, relative to the host home. */
		const WORKSPACE_SEGMENTS = [".dsh-ux-plus", "search"];
		/** localStorage key holding the newest-first history array. */
		const HISTORY_KEY = "dsh.ux-plus.quick-search.history";
		/** localStorage key holding the picked `{provider, model}` of the model menu. */
		const MODEL_KEY = "dsh.ux-plus.quick-search.model";
		/** Root marker of the injected box. */
		const ROOT_VALUE = "quick-search";
		/** Root marker of the popup panels (a body child: the sidebar clips overflow). */
		const MENU_VALUE = "quick-search-history";
		/**
		* Per-evaluation token stamped on our own nodes.
		*
		* A client bundle can be replaced under a live page (the module service serves a
		* new revision on reconnect), and the superseded instance may leave its box in
		* the DOM. The sheet hides every node that carries a marker but no token, so a
		* stale copy disappears instead of stacking a second box. Hiding — not removing —
		* keeps us from fighting a still-running old instance that would re-insert it.
		*/
		const INSTANCE_TOKEN = `${ROOT_VALUE}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
		/** Host row-key prefixes (ui-workspace `Rows.tsx:245,590`). */
		const WORKSPACE_ROW_PREFIX = "workspace:";
		const SESSION_ROW_PREFIX = "session:";
		/**
		* `<home>/.dsh-ux-plus/search` using the home's own separator, or null when the
		* host did not report a home (the box then reports `noHome` instead of guessing
		* a path that the host would reject).
		* @param {string | null | undefined} home - `remote.$host.home`.
		* @returns {string | null} the workspace path.
		*/
		function searchWorkspacePath(home) {
			if (typeof home !== "string" || home === "") return null;
			const separator = home.includes("\\") && !home.includes("/") ? "\\" : "/";
			const base = home.replace(/[\\/]+$/, "");
			if (base === "") return null;
			return `${base}${separator}${WORKSPACE_SEGMENTS.join(separator)}`;
		}
		/**
		* Quote one CSS attribute value, so an id containing quotes cannot break the
		* injected stylesheet.
		* @param {string} value - attribute value.
		* @returns {string} a double-quoted CSS string token.
		*/
		function cssString(value) {
			return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
		}
		/**
		* The stylesheet that removes the private workspace from the sidebar.
		*
		* Two rules per workspace: the group wrapper (the element whose DIRECT child is
		* the workspace row — `*:has(> …)` also collapses the wrapper's own spacing, so
		* an empty group leaves no gap) and the row itself (for group-by modes that
		* render the row without that wrapper). Session rows are listed by id because
		* some list modes (`groupBy: 'flat'`) render sessions without the wrapper.
		* @param {string | null | undefined} workspaceId - the private workspace id.
		* @param {Iterable<string>} sessionIds - sessions the workspace owns.
		* @returns {string} CSS text ('' when nothing is known yet).
		*/
		function hiddenCss(workspaceId, sessionIds) {
			const lines = [];
			if (typeof workspaceId === "string" && workspaceId !== "") {
				const key = cssString(`${WORKSPACE_ROW_PREFIX}${workspaceId}`);
				lines.push(`*:has(> [data-row-key=${key}]) { display: none !important; }`);
				lines.push(`[data-row-key=${key}] { display: none !important; }`);
			}
			const seen = /* @__PURE__ */ new Set();
			for (const sessionId of sessionIds || []) {
				if (typeof sessionId !== "string" || sessionId === "" || seen.has(sessionId)) continue;
				seen.add(sessionId);
				lines.push(`[data-row-key=${cssString(`${SESSION_ROW_PREFIX}${sessionId}`)}] { display: none !important; }`);
			}
			return lines.join("\n");
		}
		/**
		* The sidebar element that hosts the workspace browser: the ancestor of the
		* session tree whose previous sibling is the panel-list `<nav>`.
		*
		* Walking up from the tree (instead of addressing the region by class) keeps
		* this working under hashed CSS-module class names; an absent tree (rail mode,
		* no workspaces yet) yields null so the caller hides the box.
		* @param {Document} doc - the page document.
		* @returns {object | null} the region element, or null.
		*/
		function locateBrowserRegion(doc) {
			if (doc === null || doc === void 0 || typeof doc.querySelector !== "function") return null;
			let tree = null;
			try {
				tree = doc.querySelector("[role=\"tree\"]");
			} catch {
				return null;
			}
			if (tree === null || tree === void 0) return null;
			let node = tree;
			while (node !== null && node !== void 0 && node.parentNode !== null && node.parentNode !== void 0) {
				const previous = node.previousElementSibling;
				if (previous !== null && previous !== void 0 && String(previous.tagName || "").toUpperCase() === "NAV") return node;
				node = node.parentNode;
			}
			return null;
		}
		/**
		* Parse the persisted history.
		* @param {string | null | undefined} raw - the localStorage value.
		* @returns {Array<{sessionId: string, query: string, provider?: string, model?: string, at: number}>} newest first.
		*/
		function readHistory(raw) {
			if (typeof raw !== "string" || raw === "") return [];
			let parsed;
			try {
				parsed = JSON.parse(raw);
			} catch {
				return [];
			}
			if (!Array.isArray(parsed)) return [];
			const rows = [];
			for (const entry of parsed) {
				if (entry === null || typeof entry !== "object") continue;
				if (typeof entry.sessionId !== "string" || entry.sessionId === "") continue;
				if (typeof entry.query !== "string") continue;
				rows.push({
					sessionId: entry.sessionId,
					query: entry.query,
					provider: typeof entry.provider === "string" ? entry.provider : void 0,
					model: typeof entry.model === "string" ? entry.model : void 0,
					at: typeof entry.at === "number" && Number.isFinite(entry.at) ? entry.at : 0
				});
				if (rows.length === 50) break;
			}
			return rows;
		}
		/**
		* Newest-first history after one successful search: one row per session (a
		* retried search reuses the session it already created, and must not leave two
		* entries behind).
		* @param {Array<object>} list - current history.
		* @param {object} entry - the new entry.
		* @param {number} [limit] - cap (defaults to {@link HISTORY_LIMIT}).
		* @returns {Array<object>} the new history.
		*/
		function pushHistory(list, entry, limit = 50) {
			const rows = Array.isArray(list) ? list : [];
			const next = [entry];
			for (const row of rows) {
				if (row === null || typeof row !== "object") continue;
				if (row.sessionId === entry.sessionId) continue;
				next.push(row);
			}
			return next.length > limit ? next.slice(0, limit) : next;
		}
		/**
		* Flatten the model catalog into `<option>` rows.
		* @param {object | null | undefined} catalog - `remote.session.modelCatalog()` value.
		* @returns {Array<{index: number, provider: string, model: string, label: string, group: string}>} rows.
		*/
		function flattenModels(catalog) {
			const groups = catalog !== null && catalog !== void 0 && Array.isArray(catalog.groups) ? catalog.groups : [];
			const rows = [];
			for (const group of groups) {
				if (group === null || group === void 0) continue;
				const provider = typeof group.id === "string" ? group.id : null;
				if (provider === null || provider === "") continue;
				const models = Array.isArray(group.models) ? group.models : [];
				for (const model of models) {
					if (model === null || model === void 0 || typeof model.id !== "string") continue;
					rows.push({
						index: rows.length,
						provider,
						model: model.id,
						label: typeof model.name === "string" && model.name !== "" ? model.name : model.id,
						group: typeof group.name === "string" && group.name !== "" ? group.name : provider
					});
				}
			}
			return rows;
		}
		/**
		* Age bucket for a history row (rendering happens through the locale copy).
		* @param {number} at - entry timestamp (ms).
		* @param {number} now - current timestamp (ms).
		* @returns {{key: string, n?: number}} the bucket, e.g. `{key: 'hours', n: 3}`.
		*/
		function ageBucket(at, now) {
			const elapsed = Math.max(0, (typeof now === "number" ? now : 0) - (typeof at === "number" ? at : 0));
			const minute = 6e4;
			const hour = 60 * minute;
			const day = 24 * hour;
			if (elapsed < minute) return { key: "now" };
			if (elapsed < hour) return {
				key: "minutes",
				n: Math.floor(elapsed / minute)
			};
			if (elapsed < day) return {
				key: "hours",
				n: Math.floor(elapsed / hour)
			};
			if (elapsed < 2 * day) return { key: "yesterday" };
			return {
				key: "days",
				n: Math.floor(elapsed / day)
			};
		}
		/** Trailing-separator-insensitive path comparison (host paths come back canonicalized). */
		function trimSeparators(path) {
			return typeof path === "string" ? path.replace(/[\\/]+$/, "") : "";
		}
		/** One `<svg>` icon built from path data, themed through `currentColor`. */
		function svgIcon(doc, paths, size) {
			const namespace = "http://www.w3.org/2000/svg";
			const make = typeof doc.createElementNS === "function" ? (tag) => doc.createElementNS(namespace, tag) : (tag) => doc.createElement(tag);
			const root = make("svg");
			root.setAttribute("viewBox", "0 0 16 16");
			root.setAttribute("width", String(size));
			root.setAttribute("height", String(size));
			root.setAttribute("fill", "none");
			root.setAttribute("stroke", "currentColor");
			root.setAttribute("stroke-width", "1.5");
			root.setAttribute("stroke-linecap", "round");
			root.setAttribute("stroke-linejoin", "round");
			root.setAttribute("aria-hidden", "true");
			root.setAttribute("focusable", "false");
			for (const path of paths) {
				const node = make("path");
				node.setAttribute("d", path);
				root.appendChild(node);
			}
			return root;
		}
		/** Magnifier (left, inside the field — the host's own filter box puts it outside). */
		const MAGNIFIER_PATHS = ["M7 2.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8", "M10.3 10.3 14 14"];
		/** Clock with a backward arrow: the history entry point. */
		const CLOCK_PATHS = ["M8 2.4a5.6 5.6 0 1 0 0 11.2A5.6 5.6 0 0 0 8 2.4", "M8 5.1v3.1l2.1 1.3"];
		/**
		* Chip outline with pins: the model picker. Icon only — the picker is as small
		* as the other two controls, and the current model is in its tooltip and menu.
		*/
		const MODEL_PATHS = [
			"M5.2 5.2h5.6v5.6H5.2z",
			"M6.6 2.6v2.6M9.4 2.6v2.6M6.6 10.8v2.6M9.4 10.8v2.6",
			"M2.6 6.6h2.6M2.6 9.4h2.6M10.8 6.6h2.6M10.8 9.4h2.6"
		];
		/** Stylesheet for the box and its popup (authored text: no hashed class names). */
		function boxCss() {
			const scope = `[data-dsh-ux-plus="${ROOT_VALUE}"][data-ux-plus-instance]`;
			const menu = `[data-dsh-ux-plus="${MENU_VALUE}"][data-ux-plus-instance]`;
			return [
				`${scope} { display: flex; flex-direction: column; gap: 3px; box-sizing: border-box; width: 100%; padding: 6px var(--dsh-session-list-edge-inset, 12px) 6px 0; }`,
				`[data-dsh-ux-plus="${ROOT_VALUE}"]:not([data-ux-plus-instance]), [data-dsh-ux-plus="${MENU_VALUE}"]:not([data-ux-plus-instance]) { display: none !important; }`,
				`${scope} [data-qs="row"] { display: flex; align-items: center; gap: 4px; width: 100%; }`,
				`${scope} [data-qs="field"] { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; justify-content: flex-start; gap: 4px; box-sizing: border-box; height: 30px; padding: 0 6px; line-height: 1; border-radius: 8px; border: 1px solid transparent; background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.10)); transition: border-color 120ms ease; }`,
				`${scope} [data-qs="field"]:focus-within { border-color: var(--dsw-alias-border-strong, #3a3f4b); }`,
				`${scope} [data-qs="glass"] { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; width: 22px; height: 22px; line-height: 0; color: var(--dsw-alias-label-secondary, #9aa0ab); }`,
				`${scope} [data-qs] svg { display: block; }`,
				`${scope} [data-qs="input"] { flex: 1 1 auto; align-self: stretch; min-width: 0; height: auto; margin: 0; padding: 0; box-sizing: border-box; border: none; outline: none; background: transparent; line-height: 1.25; color: var(--dsw-alias-label-primary, #e8e8e8); font: inherit; font-size: 13px; }`,
				`${scope} [data-qs="input"]::placeholder { color: var(--dsw-alias-label-secondary, #9aa0ab); font-style: italic; opacity: 0.7; }`,
				`${scope} [data-qs="model"] { flex: 0 0 auto; position: relative; display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; padding: 0; line-height: 0; border: none; border-radius: 6px; outline: none; background: transparent; color: var(--dsw-alias-label-secondary, #9aa0ab); cursor: pointer; }`,
				`${scope} [data-qs="model"]:hover { color: var(--dsw-alias-label-primary, #e8e8e8); background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12)); }`,
				`${scope} [data-qs="model"][data-qs-picked="true"]::after { content: ""; position: absolute; right: 2px; bottom: 2px; width: 4px; height: 4px; border-radius: 50%; background: var(--dsw-alias-label-primary, #e8e8e8); }`,
				`${scope} [data-qs="history"] { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; padding: 0; line-height: 0; border: none; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-secondary, #9aa0ab); cursor: pointer; }`,
				`${scope} [data-qs="history"]:hover { color: var(--dsw-alias-label-primary, #e8e8e8); background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12)); }`,
				`${scope} [data-qs="runs"] { flex: 0 0 auto; position: relative; display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; padding: 0; border: none; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-primary, #e8e8e8); font: inherit; font-size: 9.5px; font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1; cursor: pointer; }`,
				`${scope} [data-qs="runs"]::before { content: ""; position: absolute; left: 50%; top: 50%; width: 15px; height: 15px; margin: -7.5px 0 0 -7.5px; box-sizing: border-box; border: 1.4px solid currentColor; border-radius: 50%; }`,
				`${scope} [data-qs="runs"]:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12)); }`,
				`${scope} [data-qs="runs"][data-state="idle"] { color: var(--dsw-alias-label-tertiary, #6b7180); cursor: default; }`,
				`${scope} [data-qs="runs"][data-state="idle"]::before { opacity: 0.55; }`,
				`${scope} [data-qs="runs"][data-state="idle"]:hover { background: transparent; }`,
				`${scope} [data-qs="status"] { font-size: 11px; line-height: 14px; color: #e5534b; }`,
				`${scope} [data-qs="status"][data-qs-state="busy"] { color: var(--dsw-alias-label-secondary, #9aa0ab); }`,
				`${scope} [data-qs="status"]:empty { display: none; }`,
				`${menu} { position: fixed; z-index: 99999; width: 300px; max-height: 320px; overflow: auto; padding: 6px; border-radius: 10px; border: 1px solid var(--dsw-alias-border-l2, #3a3f4b); background: var(--dsw-alias-bg-layer-2, #24272e); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35); color: var(--dsw-alias-label-primary, #e8e8e8); font-size: 13px; }`,
				`${menu} [data-qs="menu-head"] { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 6px 6px; font-size: 11px; color: var(--dsw-alias-label-secondary, #9aa0ab); }`,
				`${menu} [data-qs="menu-clear"] { padding: 0; border: none; background: transparent; color: inherit; font: inherit; font-size: 11px; cursor: pointer; }`,
				`${menu} [data-qs="menu-clear"]:hover { color: var(--dsw-alias-label-primary, #e8e8e8); }`,
				`${menu} [data-qs="menu-row"] { display: flex; flex-direction: column; gap: 2px; width: 100%; padding: 6px 8px; border: none; border-radius: 6px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }`,
				`${menu} [data-qs="menu-row"]:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12)); }`,
				`${menu} [data-qs="menu-row"][data-qs-active="true"] { background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12)); }`,
				`${menu} [data-qs="menu-row"][data-qs-active="true"] [data-qs="menu-label"]::before { content: "✓ "; }`,
				`${menu} [data-qs="menu-label"] { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }`,
				`${menu} [data-qs="menu-query"] { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }`,
				`${menu} [data-qs="menu-meta"] { font-size: 11px; color: var(--dsw-alias-label-secondary, #9aa0ab); }`,
				`${menu} [data-qs="menu-empty"] { padding: 10px 8px; color: var(--dsw-alias-label-secondary, #9aa0ab); }`,
				`${menu} [data-qs="run-row"] { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border: none; border-radius: 6px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }`,
				`${menu} [data-qs="run-row"]:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12)); }`,
				`${menu} [data-qs="run-dot"] { flex: none; width: 6px; height: 6px; border-radius: 50%; background: currentColor; color: var(--dsw-alias-label-secondary, #9aa0ab); animation: ux-plus-qs-pulse 1.6s ease-in-out infinite; }`,
				`@keyframes ux-plus-qs-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }`,
				`@media (prefers-reduced-motion: reduce) { ${menu} [data-qs="run-dot"] { animation: none; } }`,
				`${menu} [data-qs="run-title"] { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }`,
				`${menu} [data-qs="run-age"] { flex: none; font-size: 11px; color: var(--dsw-alias-label-secondary, #9aa0ab); font-variant-numeric: tabular-nums; }`
			].join("\n");
		}
		/** Request id for `remote.session.prompt` (same shape as the inherit feature). */
		function mintRequestId() {
			const crypto = globalThis.crypto;
			if (crypto && typeof crypto.randomUUID === "function") return String(crypto.randomUUID());
			return `ux-plus-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
		}
		/**
		* Mount the box.
		* @param {object} ctx - the client plugin context (`remote`, `locale`, `get`).
		* @param {object} deps - shared feature deps (`sessions`, `workspaces` services).
		* @returns {() => void} disposer: removes the box, both stylesheets, the popup,
		*   every listener and every subscription (off == never installed).
		*/
		function client(ctx, deps) {
			if (typeof document === "undefined" || document === null) return () => {};
			if (typeof window === "undefined" || window === null) return () => {};
			const disposers = [];
			let disposed = false;
			/** Locale dictionary registration (survives tab remounts with the plugin fiber). */
			const locale = ctx && ctx.locale;
			if (ctx && typeof ctx.effect === "function" && locale && typeof locale.register === "function") disposers.push(ctx.effect(() => locale.register(NS, MESSAGES)));
			/** Active DSH locale id, defensively ('zh' when the service is absent). */
			function activeLocale() {
				try {
					const snapshot = locale && typeof locale.getSnapshot === "function" ? locale.getSnapshot() : null;
					if (snapshot && typeof snapshot.active === "string") return snapshot.active;
				} catch {}
				return "zh";
			}
			/** One localized string, with `{n}`-style interpolation. */
			function t(key, params) {
				const dict = MESSAGES[activeLocale()] || MESSAGES.en;
				const template = dict[key] !== void 0 ? dict[key] : MESSAGES.en[key] !== void 0 ? MESSAGES.en[key] : key;
				if (!params) return template;
				return String(template).replace(/\{(\w+)\}/g, (match, name) => params[name] === void 0 ? match : String(params[name]));
			}
			/** `window.localStorage`, or null when the surface blocks it. */
			function storage() {
				try {
					return window.localStorage || null;
				} catch {
					return null;
				}
			}
			/**
			* Read one observable snapshot without letting a throwing or absent store
			* take the whole feature down (same defensive shape as the sibling DOM
			* features).
			*/
			function snapshotOf(observable) {
				if (observable === null || observable === void 0 || typeof observable.getSnapshot !== "function") return null;
				try {
					return observable.getSnapshot();
				} catch {
					return null;
				}
			}
			const store = storage();
			/**
			* Everything the box owns.
			*
			* `dir` starts null and is resolved on demand by {@link searchDir}: the host
			* home only arrives with the connection's first ready frame, which is later
			* than this mount, so reading it once here would leave the box permanently
			* unusable.
			*/
			const state = {
				dir: null,
				workspaceId: null,
				extraHidden: /* @__PURE__ */ new Set(),
				models: [],
				modelKey: readModelKey(),
				defaultKey: null,
				busy: false,
				history: readHistory(store ? store.getItem(HISTORY_KEY) : null),
				/** Top-level sessions the host currently runs, most recent activity first. */
				running: []
			};
			/** `remote.$host.home` — the host's own home (host and browser agree on it). */
			function readHostHome() {
				const remote = ctx && ctx.remote;
				const host = remote && remote.$host;
				return host && typeof host.home === "string" ? host.home : null;
			}
			/** The private workspace directory, resolved once the ready frame landed. */
			function searchDir() {
				if (state.dir === null) state.dir = searchWorkspacePath(readHostHome());
				return state.dir;
			}
			/** The picked model, persisted as `{provider, model}`. */
			function readModelKey() {
				if (store === null) return null;
				let parsed;
				try {
					parsed = JSON.parse(store.getItem("dsh.ux-plus.quick-search.model") || "null");
				} catch {
					return null;
				}
				if (parsed === null || typeof parsed !== "object") return null;
				if (typeof parsed.provider !== "string" || typeof parsed.model !== "string") return null;
				return `${parsed.provider}\u0000${parsed.model}`;
			}
			function saveModelKey() {
				if (store === null) return;
				const row = state.models.find((candidate) => selectionKey(candidate) === state.modelKey);
				if (row === void 0) return;
				try {
					store.setItem(MODEL_KEY, JSON.stringify({
						provider: row.provider,
						model: row.model
					}));
				} catch {}
			}
			function persistHistory() {
				if (store === null) return;
				try {
					store.setItem(HISTORY_KEY, JSON.stringify(state.history));
				} catch {}
			}
			const refs = {
				root: null,
				input: null,
				model: null,
				history: null,
				runs: null,
				status: null
			};
			/** The text field placeholder / labels follow the active locale. */
			function applyCopy() {
				if (refs.input !== null) {
					refs.input.setAttribute("placeholder", t("placeholder"));
					refs.input.setAttribute("aria-label", t("placeholder"));
				}
				if (refs.model !== null) refs.model.setAttribute("aria-label", modelTitle());
				if (refs.history !== null) {
					refs.history.setAttribute("aria-label", t("history"));
					refs.history.setAttribute("title", t("history"));
				}
				refreshRunning();
			}
			function el(tag, attrs) {
				const node = document.createElement(tag);
				if (attrs) for (const key of Object.keys(attrs)) node.setAttribute(key, attrs[key]);
				return node;
			}
			function setStatus(kind, message) {
				if (refs.status === null) return;
				refs.status.textContent = message || "";
				refs.status.setAttribute("data-qs-state", kind || "");
			}
			/** Build the box once; every later render only touches its children. */
			function buildNode() {
				const root = el("div", {
					"data-dsh-ux-plus": ROOT_VALUE,
					"data-ux-plus-instance": INSTANCE_TOKEN
				});
				const row = el("div", { "data-qs": "row" });
				const field = el("div", { "data-qs": "field" });
				const glass = el("span", { "data-qs": "glass" });
				glass.appendChild(svgIcon(document, MAGNIFIER_PATHS, 14));
				const input = el("input", {
					"data-qs": "input",
					type: "text",
					spellcheck: "false",
					autocomplete: "off"
				});
				input.value = "";
				const model = el("button", {
					"data-qs": "model",
					type: "button",
					"data-qs-picked": "false"
				});
				model.appendChild(svgIcon(document, MODEL_PATHS, 14));
				const history = el("button", {
					"data-qs": "history",
					type: "button"
				});
				history.appendChild(svgIcon(document, CLOCK_PATHS, 14));
				const runs = el("button", {
					"data-qs": "runs",
					type: "button",
					"data-state": "idle",
					"aria-disabled": "true"
				});
				const status = el("div", {
					"data-qs": "status",
					role: "status"
				});
				field.appendChild(glass);
				field.appendChild(input);
				field.appendChild(model);
				field.appendChild(history);
				row.appendChild(field);
				row.appendChild(runs);
				root.appendChild(row);
				root.appendChild(status);
				input.addEventListener("keydown", onKeyDown);
				model.addEventListener("click", openModelMenu);
				history.addEventListener("click", openHistory);
				runs.addEventListener("click", onRunsClick);
				refs.root = root;
				refs.input = input;
				refs.model = model;
				refs.history = history;
				refs.runs = runs;
				refs.status = status;
				applyCopy();
				renderModelButton();
				return root;
			}
			/** Insert (or re-insert) the box as the region's first child. */
			function place() {
				const region = locateBrowserRegion(document);
				if (region === null) {
					if (refs.root !== null && refs.root.parentNode !== null) refs.root.parentNode.removeChild(refs.root);
					closePanel();
					return;
				}
				if (refs.root === null) refs.root = buildNode();
				if (!(refs.root.parentNode === region && region.firstElementChild === refs.root)) region.insertBefore(refs.root, region.firstElementChild || null);
				refreshRunning();
			}
			let pending = null;
			/** Coalesce mutation pressure into one 0-ms pass. */
			function schedule() {
				if (disposed || pending !== null) return;
				pending = window.setTimeout(() => {
					pending = null;
					if (disposed) return;
					place();
					applyHiddenCss();
				}, 0);
			}
			const styleTag = document.createElement("style");
			styleTag.setAttribute("data-plugin", "dsh-ux-plus");
			styleTag.setAttribute("data-feature", id);
			styleTag.textContent = boxCss();
			if (document.head !== null && document.head !== void 0) document.head.appendChild(styleTag);
			const hideTag = document.createElement("style");
			hideTag.setAttribute("data-plugin", "dsh-ux-plus");
			hideTag.setAttribute("data-feature", `${id}-hidden-workspace`);
			hideTag.textContent = "";
			if (document.head !== null && document.head !== void 0) document.head.appendChild(hideTag);
			/** Last hide-rule text written: an unchanged pass must not touch the sheet. */
			let lastHideCss = null;
			/** Ready workspace rows, or [] while the store is still loading. */
			function workspaceRows() {
				const snapshot = snapshotOf(deps && deps.workspaces && deps.workspaces.list);
				if (snapshot === null || snapshot.phase !== "ready" || !Array.isArray(snapshot.items)) return [];
				return snapshot.items;
			}
			/** The private workspace row, when it already exists (never creates one). */
			function findSearchWorkspace() {
				const dir = searchDir();
				if (dir === null) return null;
				const target = trimSeparators(dir);
				for (const row of workspaceRows()) if (row !== null && typeof row === "object" && trimSeparators(row.path) === target) return row;
				return null;
			}
			/** Re-point the hide rule at the workspace (and the sessions it owns). */
			function applyHiddenCss() {
				const row = findSearchWorkspace();
				if (row !== null && typeof row.workspaceId === "string") state.workspaceId = row.workspaceId;
				const ids = new Set(state.extraHidden);
				if (row !== null && Array.isArray(row.sessionIds)) for (const sessionId of row.sessionIds) ids.add(sessionId);
				const css = hiddenCss(state.workspaceId, ids);
				if (css === lastHideCss) return;
				lastHideCss = css;
				hideTag.textContent = css;
			}
			/**
			* The private workspace id, registering the directory on first use.
			* @param {boolean} create - register the workspace when it is missing.
			* @returns {Promise<string | null>} the id, or null when not creating.
			*/
			async function resolveWorkspace(create) {
				const row = findSearchWorkspace();
				if (row !== null && typeof row.workspaceId === "string") {
					state.workspaceId = row.workspaceId;
					return row.workspaceId;
				}
				if (!create) return null;
				const dir = searchDir();
				if (dir === null) throw new Error(t("noHome"));
				const workspaces = deps && deps.workspaces;
				if (!workspaces || typeof workspaces.create !== "function") throw new Error(t("noWorkspace"));
				const created = await workspaces.create({ path: dir });
				const workspaceId = created && typeof created.workspaceId === "string" ? created.workspaceId : null;
				if (workspaceId === null) throw new Error(t("noWorkspace"));
				state.workspaceId = workspaceId;
				applyHiddenCss();
				return workspaceId;
			}
			/** Identity of a model row, matching the persisted key. */
			function selectionKey(selection) {
				return selection && typeof selection.provider === "string" && typeof selection.model === "string" ? `${selection.provider}\u0000${selection.model}` : null;
			}
			/** The row the box will use: the remembered pick, else the host default. */
			function selectedRow() {
				for (const candidate of [state.modelKey, state.defaultKey]) {
					if (candidate === null) continue;
					const hit = state.models.find((row) => selectionKey(row) === candidate);
					if (hit !== void 0) return hit;
				}
				return null;
			}
			/** Tooltip / aria label: the picked model's own name (the icon carries no text). */
			function modelTitle() {
				const picked = selectedRow();
				return picked === null ? t("model") : `${t("model")}：${picked.label}`;
			}
			/** Reflect the pick on the icon; a dot marks a non-default choice. */
			function renderModelButton() {
				const button = refs.model;
				if (button === null) return;
				const key = selectionKey(selectedRow());
				button.setAttribute("data-qs-picked", key !== null && key !== state.defaultKey ? "true" : "false");
				button.setAttribute("title", modelTitle());
				button.setAttribute("aria-label", modelTitle());
			}
			/** Remember one menu row as the pick (the menu closes itself). */
			function pickModel(row) {
				state.modelKey = row === null || row === void 0 ? null : selectionKey(row);
				saveModelKey();
				renderModelButton();
			}
			async function loadModels() {
				const remote = ctx && ctx.remote;
				const session = remote && remote.session;
				if (!session || typeof session.modelCatalog !== "function") return;
				let result;
				try {
					result = await session.modelCatalog();
				} catch {
					return;
				}
				if (disposed) return;
				const catalog = result && result.value !== void 0 ? result.value : result;
				if (catalog === null || catalog === void 0 || result && result.ok === false) return;
				state.models = flattenModels(catalog);
				const fallback = catalog.default;
				state.defaultKey = selectionKey(fallback);
				renderModelButton();
			}
			function currentQuery() {
				return refs.input === null ? "" : String(refs.input.value || "").trim();
			}
			function onKeyDown(event) {
				if (event === null || event === void 0) return;
				if (event.isComposing === true || event.keyCode === 229) return;
				if (event.key !== "Enter") return;
				if (typeof event.preventDefault === "function") event.preventDefault();
				submit();
			}
			async function submit() {
				if (state.busy) return;
				const text = currentQuery();
				if (text === "") return;
				state.busy = true;
				setStatus("busy", t("starting"));
				try {
					const workspaceId = await resolveWorkspace(true);
					if (workspaceId === null) throw new Error(t("noWorkspace"));
					const sessions = deps && deps.sessions;
					if (!sessions || typeof sessions.create !== "function") throw new Error(t("createFailed"));
					const sessionId = await sessions.create({ workspaceId });
					state.extraHidden.add(sessionId);
					applyHiddenCss();
					const picked = selectedRow();
					const remote = ctx && ctx.remote;
					const session = remote && remote.session;
					if (!session || typeof session.prompt !== "function") throw new Error(t("promptFailed"));
					if (picked !== null && selectionKey(picked) !== state.defaultKey && typeof session.selectModel === "function") {
						const selected = await session.selectModel({
							sessionId,
							provider: picked.provider,
							model: picked.model
						});
						if (selected !== null && selected !== void 0 && selected.ok === false) throw new Error(t("createFailed"));
					}
					const prompted = await session.prompt({
						requestId: mintRequestId(),
						sessionId,
						mode: "queue",
						content: [{
							type: "text",
							text
						}]
					});
					if (prompted !== null && prompted !== void 0 && prompted.ok === false) throw new Error(t("promptFailed"));
					state.history = pushHistory(state.history, {
						sessionId,
						query: text,
						provider: picked === null ? void 0 : picked.provider,
						model: picked === null ? void 0 : picked.model,
						at: Date.now()
					});
					persistHistory();
					if (refs.input !== null) refs.input.value = "";
					setStatus("", "");
					openSessionById(sessionId);
				} catch (error) {
					setStatus("error", error && error.message ? String(error.message) : t("createFailed"));
				} finally {
					state.busy = false;
					if (refs.input !== null && typeof refs.input.focus === "function") refs.input.focus();
				}
			}
			/** Session ids the host still knows, or null when the list is not ready. */
			function liveSessionIds() {
				const snapshot = snapshotOf(deps && deps.sessions && deps.sessions.list);
				if (snapshot === null || !Array.isArray(snapshot.ids)) return null;
				return new Set(snapshot.ids);
			}
			/** Drop entries whose session no longer exists (deleted/cleaned workspace). */
			function pruneHistory() {
				const live = liveSessionIds();
				if (live === null) return;
				const next = state.history.filter((entry) => live.has(entry.sessionId));
				if (next.length === state.history.length) return;
				state.history = next;
				persistHistory();
			}
			let popup = null;
			let popupCleanup = null;
			let popupAnchor = null;
			let popupKind = null;
			/** Close whichever panel is open (search history or the model menu). */
			function closePanel() {
				if (popupCleanup !== null) {
					popupCleanup();
					popupCleanup = null;
				}
				if (popup !== null && popup.parentNode !== null) popup.parentNode.removeChild(popup);
				popup = null;
				popupAnchor = null;
				popupKind = null;
			}
			/** Anchor the fixed popup under the clock icon, clamped to the viewport. */
			function positionPopup(node, anchor) {
				const viewportWidth = window.innerWidth || 1200;
				const width = 300;
				let left = 12;
				let top = 60;
				if (anchor && typeof anchor.getBoundingClientRect === "function") {
					const rect = anchor.getBoundingClientRect();
					left = rect && typeof rect.right === "number" ? rect.right - width : left;
					top = rect && typeof rect.bottom === "number" ? rect.bottom + 6 : top;
				}
				node.style.left = `${Math.max(8, Math.min(left, viewportWidth - width - 8))}px`;
				node.style.top = `${Math.max(8, top)}px`;
			}
			/** Open (or refresh) the history popup. */
			function openHistory() {
				if (popup !== null && popupKind === "history") {
					closePanel();
					return;
				}
				pruneHistory();
				const node = el("div", {
					"data-dsh-ux-plus": MENU_VALUE,
					"data-ux-plus-instance": INSTANCE_TOKEN,
					role: "dialog",
					"aria-label": t("historyTitle")
				});
				const head = el("div", { "data-qs": "menu-head" });
				const label = document.createElement("span");
				label.textContent = t("historyTitle");
				const clear = el("button", {
					"data-qs": "menu-clear",
					type: "button"
				});
				clear.textContent = t("clear");
				clear.addEventListener("click", () => {
					state.history = [];
					persistHistory();
					closePanel();
				});
				head.appendChild(label);
				if (state.history.length > 0) head.appendChild(clear);
				node.appendChild(head);
				if (state.history.length === 0) {
					const empty = el("div", { "data-qs": "menu-empty" });
					empty.textContent = t("historyEmpty");
					node.appendChild(empty);
				} else for (const entry of state.history) {
					const row = el("button", {
						"data-qs": "menu-row",
						type: "button"
					});
					const query = el("span", { "data-qs": "menu-query" });
					query.textContent = entry.query;
					const meta = el("span", { "data-qs": "menu-meta" });
					const bucket = ageBucket(entry.at, Date.now());
					meta.textContent = `${t(bucket.key, bucket.n === void 0 ? void 0 : { n: bucket.n })}${entry.model === void 0 ? "" : ` · ${entry.model}`}`;
					meta.setAttribute("title", new Date(entry.at).toISOString());
					row.appendChild(query);
					row.appendChild(meta);
					row.addEventListener("click", () => openSessionById(entry.sessionId));
					node.appendChild(row);
				}
				openPanel(node, refs.history, "history");
			}
			/** The model menu: one row per catalog model, the current pick ticked. */
			function openModelMenu() {
				if (popup !== null && popupKind === "model") {
					closePanel();
					return;
				}
				const node = el("div", {
					"data-dsh-ux-plus": MENU_VALUE,
					"data-ux-plus-instance": INSTANCE_TOKEN,
					role: "dialog",
					"aria-label": t("model")
				});
				const head = el("div", { "data-qs": "menu-head" });
				const label = document.createElement("span");
				label.textContent = t("model");
				head.appendChild(label);
				node.appendChild(head);
				if (state.models.length === 0) {
					const empty = el("div", { "data-qs": "menu-empty" });
					empty.textContent = t("modelsEmpty");
					node.appendChild(empty);
				} else {
					const currentKey = selectionKey(selectedRow());
					for (const row of state.models) {
						const active = currentKey !== null && selectionKey(row) === currentKey;
						const button = el("button", {
							"data-qs": "menu-row",
							type: "button"
						});
						if (active) button.setAttribute("data-qs-active", "true");
						const name = el("span", { "data-qs": "menu-label" });
						name.textContent = row.label;
						const meta = el("span", { "data-qs": "menu-meta" });
						meta.textContent = `${row.group} · ${row.model}`;
						button.appendChild(name);
						button.appendChild(meta);
						button.addEventListener("click", () => {
							pickModel(row);
							closePanel();
						});
						node.appendChild(button);
					}
				}
				openPanel(node, refs.model, "model");
			}
			/** The title a user recognizes, with the untitled fallback. */
			function sessionTitle(summary) {
				for (const candidate of [summary.displayTitle, summary.title]) if (typeof candidate === "string" && candidate.trim() !== "") return candidate.trim();
				return t("untitled");
			}
			/**
			* Whether this session lives in the private search workspace. Those sessions
			* are hidden from the sidebar on purpose, so the ring must not surface them
			* either: it answers "what of mine is running", and a search the box itself
			* started is not a row the user can see anywhere.
			*/
			function ownedBySearch(summary, sessionId) {
				if (state.extraHidden.has(sessionId)) return true;
				const row = findSearchWorkspace();
				if (row !== null && Array.isArray(row.sessionIds) && row.sessionIds.includes(sessionId)) return true;
				const dir = searchDir();
				if (dir !== null && typeof summary.cwd === "string" && trimSeparators(summary.cwd) === trimSeparators(dir)) return true;
				return false;
			}
			/**
			* One row per top-level session the host runs. Subagent sessions are the
			* parent's own work (the host hides them from the tree the same way,
			* `tree.ts` skips `origin === 'subagent'`), so they are not counted here.
			*/
			function runningSessions() {
				const snapshot = snapshotOf(deps && deps.sessions && deps.sessions.list);
				if (snapshot === null || snapshot.byId === null || typeof snapshot.byId !== "object") return [];
				const ids = Array.isArray(snapshot.ids) ? snapshot.ids : Object.keys(snapshot.byId);
				const rows = [];
				for (const sessionId of ids) {
					const summary = snapshot.byId[sessionId];
					if (summary === null || typeof summary !== "object") continue;
					if (summary.running !== true) continue;
					if (summary.origin === "subagent") continue;
					if (ownedBySearch(summary, sessionId)) continue;
					rows.push({
						sessionId,
						title: sessionTitle(summary),
						at: typeof summary.updatedAt === "number" && Number.isFinite(summary.updatedAt) ? summary.updatedAt : 0
					});
				}
				rows.sort((left, right) => right.at - left.at);
				return rows;
			}
			/**
			* Re-read the list and repaint the ring. Idempotent on purpose: the scheduled
			* pass runs on every DOM mutation, and an unchanged count must not write to
			* the node (which would schedule another pass).
			*/
			function refreshRunning() {
				state.running = runningSessions();
				const button = refs.runs;
				if (button === null) return;
				const n = state.running.length;
				const count = n === 0 ? "" : n > 9 ? "9+" : String(n);
				if (button.textContent !== count) button.textContent = count;
				const mode = n === 0 ? "idle" : "active";
				if (button.getAttribute("data-state") !== mode) button.setAttribute("data-state", mode);
				const disabled = n === 0 ? "true" : "false";
				if (button.getAttribute("aria-disabled") !== disabled) button.setAttribute("aria-disabled", disabled);
				const label = n === 0 ? t("runningNone") : t("runningCount", { n });
				if (button.getAttribute("title") !== label) {
					button.setAttribute("title", label);
					button.setAttribute("aria-label", label);
				}
				if (n < 2 && popup !== null && popupKind === "running") closePanel();
			}
			/**
			* Open one session in the main view. Two routes: the navigation service the
			* Workspace plugin provides, then a click on the host's own row for that
			* session (the host owns that navigation either way). A click that does
			* nothing is the one outcome the box must not produce silently, so the
			* remaining failure is reported in place.
			*/
			function openSessionById(sessionId) {
				closePanel();
				const failure = navigateTo(sessionId);
				if (failure === null) return;
				if (clickHostRow(sessionId)) return;
				setStatus("error", t("openFailed", { reason: failure }));
			}
			/**
			* The service route.
			*
			* @returns null when the host opened the session, else the reason it did not.
			*/
			function navigateTo(sessionId) {
				const uiWorkspace = ctx && typeof ctx.get === "function" ? ctx.get("uiWorkspace") : void 0;
				if (!uiWorkspace || typeof uiWorkspace.openSession !== "function") return t("openService");
				try {
					uiWorkspace.openSession(sessionId);
					return null;
				} catch (error) {
					return error && error.message ? String(error.message) : t("openService");
				}
			}
			/**
			* The row route: the host row for a session navigates when clicked.
			*
			* @returns whether a row was found and clicked.
			*/
			function clickHostRow(sessionId) {
				if (typeof document.querySelector !== "function") return false;
				const row = document.querySelector(`[data-row-key="session:${sessionId}"]`);
				if (row === null || row === void 0 || typeof row.click !== "function") return false;
				row.click();
				return true;
			}
			/** One click: nothing to open, the only running session, or the list. */
			function onRunsClick() {
				const rows = state.running;
				if (rows.length === 0) return;
				if (rows.length === 1) {
					openSessionById(rows[0].sessionId);
					return;
				}
				openRunningPanel();
			}
			/** The running list: title plus the age of the last activity, newest first. */
			function openRunningPanel() {
				if (popup !== null && popupKind === "running") {
					closePanel();
					return;
				}
				refreshRunning();
				const rows = state.running;
				const node = el("div", {
					"data-dsh-ux-plus": MENU_VALUE,
					"data-ux-plus-instance": INSTANCE_TOKEN,
					role: "dialog",
					"aria-label": t("runningTitle", { n: rows.length })
				});
				const head = el("div", { "data-qs": "menu-head" });
				const label = document.createElement("span");
				label.textContent = t("runningTitle", { n: rows.length });
				head.appendChild(label);
				node.appendChild(head);
				if (rows.length === 0) {
					const empty = el("div", { "data-qs": "menu-empty" });
					empty.textContent = t("runningNone");
					node.appendChild(empty);
				} else for (const entry of rows) {
					const row = el("button", {
						"data-qs": "run-row",
						type: "button"
					});
					row.appendChild(el("span", { "data-qs": "run-dot" }));
					const name = el("span", { "data-qs": "run-title" });
					name.textContent = entry.title;
					const age = el("span", { "data-qs": "run-age" });
					const bucket = ageBucket(entry.at, Date.now());
					age.textContent = t(bucket.key, bucket.n === void 0 ? void 0 : { n: bucket.n });
					row.appendChild(name);
					row.appendChild(age);
					row.addEventListener("click", () => openSessionById(entry.sessionId));
					node.appendChild(row);
				}
				openPanel(node, refs.runs, "running");
			}
			/**
			* Mount one panel as a body child (the sidebar region clips overflowing
			* content), anchored under `anchor`, closed by outside pointerdown / Escape.
			*
			* @param {object} node - the populated panel element.
			* @param {object | null} anchor - the control the panel points at.
			* @param {string} kind - 'history' | 'model' | 'running': clicking that icon again closes it.
			*/
			function openPanel(node, anchor, kind) {
				closePanel();
				document.body.appendChild(node);
				popup = node;
				popupAnchor = anchor;
				popupKind = kind;
				positionPopup(node, anchor);
				const onDocumentPointer = (event) => {
					if (popup === null) return;
					let node2 = event && event.target;
					while (node2 !== null && node2 !== void 0) {
						if (node2 === popup || node2 === popupAnchor) return;
						node2 = node2.parentNode;
					}
					closePanel();
				};
				const onKey = (event) => {
					if (event && event.key === "Escape") closePanel();
				};
				const onResize = () => {
					if (popup !== null) positionPopup(popup, popupAnchor);
				};
				const offs = [];
				if (typeof document.addEventListener === "function") {
					document.addEventListener("pointerdown", onDocumentPointer, true);
					document.addEventListener("keydown", onKey, true);
					offs.push(() => document.removeEventListener("pointerdown", onDocumentPointer, true));
					offs.push(() => document.removeEventListener("keydown", onKey, true));
				}
				if (typeof window.addEventListener === "function") {
					window.addEventListener("resize", onResize);
					offs.push(() => window.removeEventListener("resize", onResize));
				}
				popupCleanup = () => {
					for (const off of offs) off();
				};
			}
			const observer = new MutationObserver(schedule);
			if (document.body !== null && document.body !== void 0) observer.observe(document.body, {
				childList: true,
				subtree: true
			});
			const subscriptions = [];
			function subscribe(observable) {
				if (observable === null || observable === void 0 || typeof observable.subscribe !== "function") return;
				subscriptions.push(observable.subscribe(schedule));
			}
			subscribe(deps && deps.workspaces && deps.workspaces.list);
			subscribe(deps && deps.sessions && deps.sessions.list);
			if (locale && typeof locale.subscribe === "function") subscriptions.push(locale.subscribe(() => {
				applyCopy();
				schedule();
			}));
			place();
			applyHiddenCss();
			loadModels();
			return function dispose() {
				if (disposed) return;
				disposed = true;
				closePanel();
				observer.disconnect();
				if (pending !== null) {
					window.clearTimeout(pending);
					pending = null;
				}
				for (const off of subscriptions) off();
				for (const off of disposers) off();
				if (refs.root !== null && refs.root.parentNode !== null) refs.root.parentNode.removeChild(refs.root);
				if (styleTag.parentNode !== null && styleTag.parentNode !== void 0) styleTag.parentNode.removeChild(styleTag);
				if (hideTag.parentNode !== null && hideTag.parentNode !== void 0) hideTag.parentNode.removeChild(hideTag);
				refs.root = null;
				refs.input = null;
				refs.model = null;
				refs.history = null;
				refs.runs = null;
				refs.status = null;
			};
		}
		/** Host companion: the workspace directory is prepared by the package host half. */
		function attach() {
			return () => {};
		}
		//#endregion
		//#region src/switches.js
		/**
		* D5 switch engine of dsh-ux-plus: mounts/disposes the seven feature clients
		* to match the `ux-plus` section value, immediately and reversibly.
		*
		* This module is deliberately React-free (only the feature modules
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
			feature$6,
			feature$5,
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
