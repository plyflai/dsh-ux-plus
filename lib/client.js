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
			host: (ctx) => attach$4(ctx),
			client: (ctx, deps) => client$4(ctx, deps)
		};
		//#endregion
		//#region features/workspace-session-menu/src/index.js
		/** Session ID action mounted through the host's session-menu slot. */
		const id$3 = "workspace-session-menu";
		const title$3 = "Session ID menu";
		const description$3 = "Add a \"Session ID\" copy item to session row menus.";
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
		*                             intact. The disposer restores every cached
		*                             original style and removes all
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
		*/
		const id$2 = "workspace-recency-order";
		const title$2 = "Workspace recency order";
		const description$2 = "Visually reorder workspace groups and their session rows by most recent activity.";
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
				if (cached[property] === void 0) cached[property] = element.style[property];
				element.style[property] = value;
			}
			function clear() {
				for (const [element, cached] of records) for (const property of Object.keys(cached)) element.style[property] = cached[property];
				records.clear();
			}
			return {
				write,
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
		function orderRows(section, account, data, view) {
			const expected = renderedOrder(account.memberIds, account.key, data, view);
			const rows = rowChildren(section);
			const shown = sectionCollapsed(section) ? collapsedShown(expected, data, rows.length) : expected;
			if (shown === null) return;
			if (rows.length !== shown.length) {
				traceSkip(account.key, "count", `dom ${rows.length} vs replay ${shown.length}`);
				return;
			}
			const unpaired = firstUnpairedRow(rows, shown, data.byId);
			if (unpaired !== -1) {
				traceSkip(account.key, "pairing", `row ${unpaired} of ${shown.length}`);
				return;
			}
			const entries = shown.map((id, index) => ({
				session: data.byId[id],
				element: rows[index]
			}));
			const leading = [];
			const ranked = [];
			entries.forEach((entry, index) => {
				const blankFront = index === 0 && entry.session.blank === true;
				const pinnedFront = !blankFront && !data.archived.has(entry.session.id) && data.pinned.has(entry.session.id);
				if (blankFront || pinnedFront) leading.push(entry);
				else ranked.push(entry);
			});
			ranked.sort((a, b) => b.session.updatedAt - a.session.updatedAt || (a.session.id < b.session.id ? -1 : a.session.id > b.session.id ? 1 : 0));
			leading.concat(ranked).forEach((entry, rank) => {
				data.styles.write(entry.element, "order", String(10 + rank));
				data.styles.write(entry.element, "flexShrink", "0");
			});
			const button = overflowButton(section);
			if (button !== null) data.styles.write(button, "order", "999");
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
			const ranked = pairs.map((pair, index) => ({
				section: pair.section,
				workspace: pair.workspace,
				index,
				activity: pair.workspace === null ? bucketActivity(data) : latestSessionUpdate(pair.workspace, data.byId)
			}));
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
				orderRows(section, workspace === null ? {
					memberIds: ungroupedMembers(data),
					key: UNGROUPED_KEY
				} : {
					memberIds: workspace.sessionIds,
					key: workspace.workspaceId
				}, data, view);
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
			let disposed = false;
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
			/** One full pass: structural find, then the two-layer reorder. */
			function reorder() {
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
				styles.write(found.tree, "display", "flex");
				styles.write(found.tree, "flexDirection", "column");
				orderLevel(found.tree, roots, true, data, view);
			}
			function schedule() {
				if (disposed || timer !== null) return;
				timer = window.setTimeout(function() {
					timer = null;
					if (disposed) return;
					reorder();
				}, 0);
			}
			const observer = new MutationObserver(schedule);
			if (document.body !== null) observer.observe(document.body, {
				childList: true,
				subtree: true
			});
			const disposeSessions = sessions.subscribe(schedule);
			const disposeWorkspaces = workspaces.subscribe(schedule);
			schedule();
			return function cleanup() {
				disposed = true;
				if (timer !== null) window.clearTimeout(timer);
				observer.disconnect();
				disposeSessions();
				disposeWorkspaces();
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
			host: (ctx) => attach$1(ctx),
			client: (ctx, deps) => client$1(ctx, deps)
		};
		//#endregion
		//#region features/workspace-session-inherit/src/index.js
		/** Inherit-conversation action mounted through the host's session-menu slot. */
		const id = "workspace-session-inherit";
		const title = "Inherit conversation";
		const description = "Add an \"Inherit conversation\" item that opens a fresh session with a chosen model to summarize the clicked conversation.";
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
		function text(node, value) {
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
			background: "var(--dsw-alias-bg-elevated, #24272e)",
			border: "1px solid var(--dsw-border-strong, #3a3f4b)",
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
			borderBottom: "1px solid var(--dsw-border-strong, #3a3f4b)"
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
			borderTop: "1px solid var(--dsw-border-strong, #3a3f4b)"
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
				header.appendChild(text(el("span"), t("choose")));
				const closeButton = el("button", ICON_BUTTON_STYLE, {
					type: "button",
					"aria-label": t("choose")
				});
				closeButton.textContent = "×";
				closeButton.onclick = close;
				header.appendChild(closeButton);
				panel.appendChild(header);
				if (state.phase === "loading") panel.appendChild(text(el("div", BODY_STYLE), t("loading")));
				else if (state.phase === "error") panel.appendChild(text(el("div", BODY_STYLE), t("loadFailed")));
				else if (state.groups.length === 0) panel.appendChild(text(el("div", BODY_STYLE), t("empty")));
				else for (const group of state.groups) {
					panel.appendChild(text(el("div", GROUP_STYLE), group.name || group.id));
					for (const model of group.models || []) {
						const row = el("button", ROW_STYLE, {
							type: "button",
							"data-model": `${group.id}/${model.id}`
						});
						row.appendChild(text(el("div"), model.name || model.id));
						if (model.description) row.appendChild(text(el("div", MODEL_DESC_STYLE), model.description));
						row.onclick = () => choose(group, model);
						panel.appendChild(row);
					}
				}
				if (state.error) panel.appendChild(text(el("div", ERROR_STYLE), state.error));
				else if (state.busy) panel.appendChild(text(el("div", BODY_STYLE), t("starting")));
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
				host: attach,
				client
			}
		];
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
		*/
		const inject = [
			"slots",
			"locale",
			"configForms",
			"sessions",
			"workspaces",
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
				} }, feature.title), react.createElement("span", { style: {
					fontSize: 12,
					color: "var(--dsw-alias-label-secondary)"
				} }, feature.description)), react.createElement(Switch, {
					checked: on,
					label: feature.title,
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
				workspaces: ctx.get("workspaces")
			}, uxScope);
			const offSection = ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "ux-plus",
				order: 100,
				label: () => "UX Plus",
				inject: () => ({ scope: uxScope })
			}, UxPlusTab));
			return () => {
				offSection();
				offFeatures();
			};
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
