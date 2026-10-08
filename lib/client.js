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
		const id$3 = "conversation-typography";
		const title$3 = "Conversation typography";
		const description$3 = "Conversation font size and width for the chat area.";
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
		function attach$3(ctx) {
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
		function client$3(ctx, deps) {
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
		const feature$3 = {
			id: id$3,
			title: title$3,
			description: description$3,
			hasGear: false,
			host: (ctx) => attach$3(ctx),
			client: (ctx, deps) => client$3(ctx, deps)
		};
		//#endregion
		//#region features/workspace-session-menu/src/index.js
		/** Session ID action mounted through the host's session-menu slot. */
		const id$2 = "workspace-session-menu";
		const title$2 = "Session ID menu";
		const description$2 = "Add a \"Session ID\" copy item to session row menus.";
		const NS = "ux-plus-session-menu";
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
		function client$2(ctx, deps) {
			if (!deps?.react || !deps?.primitives) return () => {};
			const React = deps.react;
			const { MenuItemButton, IconCopyOutlineRegular } = deps.primitives;
			const offLocale = ctx.effect(() => ctx.locale.register(NS, {
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
				locale: NS
			}, SessionIdItem));
			return () => {
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
			host: attach$2,
			client: client$2
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
		*                             first) plus row layer (each section's own
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
		*   - rows are matched to sessions by replaying the host's own row
		*     projection — recency or the saved manual order over the account's
		*     members, the current blank pinned first, then the host visibility
		*     filter (tree.ts:144-212 + WorkspaceBrowser.tsx:804-838) — and only
		*     then pairing positionally (the host exposes no id on row elements);
		*     a count mismatch or a failed pairing-trust check makes the row layer
		*     a no-op for that section (the group layer is unaffected).
		*
		* Route 1 (pure CSS): the tree and every section become flex columns and
		* each child receives a computed `order` (group rank 0..n-1; row rank 10+;
		* overflow button last), with flex-shrink pinned to 0 so single-line rows
		* are never compressed (plan G4). Every written style property is cached on
		* first write and fully restored on dispose (plan W-6).
		*/
		const id$1 = "workspace-recency-order";
		const title$1 = "Workspace recency order";
		const description$1 = "Visually reorder workspace groups and their session rows by most recent activity.";
		/** Host collapsed-row limit (rows/WorkspaceBrowser.tsx:44). */
		const COLLAPSED_SESSION_LIMIT = 5;
		/** Descendant-walk depth cap (host nesting: tree > section > group > section). */
		const WALK_DEPTH = 8;
		/** The host's persisted workspace-view store key (ui-workspace stores.ts:64-100). Read-only. */
		const VIEW_STORE_KEY = "dsh.workspace.view.v5";
		/** The host's ungrouped-bucket account key (ui-workspace tree.ts:21). */
		const UNGROUPED_KEY = "";
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
		* Most recent non-blank, non-subagent, non-archived update in a workspace
		* (the group-layer activity signal; no-update groups carry -Infinity).
		*/
		function latestSessionUpdate(workspace, byId, archived) {
			let latest = Number.NEGATIVE_INFINITY;
			for (const sessionId of workspace.sessionIds) {
				const session = byId[sessionId];
				if (session === void 0 || session.blank || session.origin === "subagent") continue;
				if (archived.has(sessionId)) continue;
				if (session.updatedAt > latest) latest = session.updatedAt;
			}
			return latest;
		}
		/**
		* Host row visibility (tree.ts:208-212): subagent and archived sessions never
		* render; a blank row renders only while it is the current session.
		*/
		function rowVisible(session, id, currentId, archived) {
			return session !== void 0 && session.origin !== "subagent" && !archived.has(id) && (session.blank !== true || id === currentId);
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
		* Host manual-order reconciliation (tree.ts:166-186): retained saved slots
		* first, remaining known members appended by recency; departed and unknown
		* members omitted.
		*/
		function reconcileManualOrder(memberIds, savedOrder, byId) {
			const members = new Map(memberIds.map((id) => [id, id]));
			const included = /* @__PURE__ */ new Set();
			const ordered = [];
			for (const key of savedOrder ?? []) {
				const id = members.get(key);
				if (id === void 0 || included.has(key)) continue;
				ordered.push(id);
				included.add(key);
			}
			for (const id of orderByRecency(memberIds, byId)) {
				if (included.has(id)) continue;
				ordered.push(id);
				included.add(id);
			}
			return ordered;
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
			if (state === null || state.orderBy !== "manual") return {
				orderBy: "updated",
				saved: void 0
			};
			const saved = state.sessionOrderByAccount;
			return {
				orderBy: "manual",
				saved: saved !== null && typeof saved === "object" ? saved : void 0
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
			return pinCurrentBlank(view.orderBy === "manual" ? reconcileManualOrder(memberIds, view.saved ? view.saved[key] : void 0, byId) : orderByRecency(memberIds, byId), data.currentId !== void 0 && memberIds.includes(data.currentId) && byId[data.currentId] !== void 0 && byId[data.currentId].blank === true ? data.currentId : void 0).filter((id) => rowVisible(byId[id], id, data.currentId, data.archived));
		}
		/**
		* Host collapsed-row rule (rows/WorkspaceBrowser.tsx:47-59): every blank row
		* plus the first five ordinary rows, by rendered position.
		*/
		function collapsedRows(ids, byId) {
			let ordinary = 0;
			return ids.filter((id) => byId[id].blank || ordinary++ < COLLAPSED_SESSION_LIMIT);
		}
		/**
		* Pairing-trust check before any row order is written (W-2 fallback —
		* "presentation never guesses"): each paired row must confirm the pairing
		* from its own visible text. An ordinary row confirms when one of its LEAF
		* elements (an element with no element children, the row itself included)
		* carries normalized text starting with the session's normalized
		* displayTitle. The host renders the title in its own leaf span (Rows.tsx
		* title span, then the time leaf), so the status badge the host renders in
		* the row's preceding status slot (visually-hidden labels that still land in
		* textContent) no longer breaks the check: a status leaf carries status
		* copy, which does not start with the session's title, and the trailing time
		* leaf cannot confirm either. The row's own whole text (the historical
		* signal, now whitespace-normalized) is an additional confirming source: it
		* keeps rows confirmable when the title text is split across sibling leaves
		* and matches what the host DOM reports for the row wrapper. A blank row
		* renders a localized label this feature cannot know, so it is pinned to its
		* position instead: the host's pinCurrentBlank invariant puts a visible blank
		* row at index 0. Failure boundaries: a row with neither its whole text nor
		* any leaf confirming the title, an empty or non-string displayTitle, or a
		* blank row anywhere but index 0, fails closed (the whole section's row
		* layer no-ops); the check is positional and prefix-anchored (no substring
		* match), so one title prefixing another row's text cannot cross-align.
		*/
		function pairingTrustworthy(rows, shown, byId) {
			for (let i = 0; i < shown.length; i += 1) {
				const session = byId[shown[i]];
				if (session === void 0) return false;
				if (session.blank === true) {
					if (i !== 0) return false;
					continue;
				}
				const title = session.displayTitle;
				if (typeof title !== "string" || title === "") return false;
				const target = normalizeText(title);
				if (target === "") return false;
				if (!rowCarriesTitle(rows[i], target)) return false;
			}
			return true;
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
		/** The ungrouped bucket's activity: latest visible session owned by no workspace. */
		function bucketActivity(data) {
			const owned = /* @__PURE__ */ new Set();
			for (const workspace of data.items) for (const sessionId of workspace.sessionIds) owned.add(sessionId);
			let latest = Number.NEGATIVE_INFINITY;
			for (const session of Object.values(data.byId)) {
				if (session.origin === "subagent" || session.blank) continue;
				if (data.archived.has(session.id)) continue;
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
		* section's row layer a no-op (the group layer is unaffected).
		*
		* The section's current blank row keeps the host's first row position
		* (pinCurrentBlank invariant — tree.ts:194-200, member guard
		* WBS:823-826); only the remaining rows are re-ranked by recency, so the
		* feature never drags the pinned blank out of position 0.
		*/
		function orderRows(section, account, data, view) {
			const expected = renderedOrder(account.memberIds, account.key, data, view);
			const shown = sectionCollapsed(section) ? collapsedRows(expected, data.byId) : expected;
			const rows = rowChildren(section);
			if (rows.length !== shown.length) return;
			if (!pairingTrustworthy(rows, shown, data.byId)) return;
			const entries = shown.map((id, index) => ({
				session: data.byId[id],
				element: rows[index]
			}));
			const pinned = entries.length > 0 && entries[0].session.blank === true ? [entries[0]] : [];
			const ranked = entries.slice(pinned.length);
			ranked.sort((a, b) => b.session.updatedAt - a.session.updatedAt || (a.session.id < b.session.id ? -1 : a.session.id > b.session.id ? 1 : 0));
			pinned.concat(ranked).forEach((entry, rank) => {
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
				activity: pair.workspace === null ? bucketActivity(data) : latestSessionUpdate(pair.workspace, data.byId, data.archived)
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
		function client$1(ctx, deps) {
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
				let currentId = void 0;
				for (const session of Object.values(byId)) if (session.retainedBy && session.retainedBy.mainView > 0) {
					currentId = session.id;
					break;
				}
				return {
					byId,
					items,
					archived,
					currentId,
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
		function attach$1(ctx) {
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
		const feature$1 = {
			id: id$1,
			title: title$1,
			description: description$1,
			hasGear: false,
			host: (ctx) => attach$1(ctx),
			client: (ctx, deps) => client$1(ctx, deps)
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
		*   - W-5 zero injection: no `<style>`, no attribute add/change, no node
		*     insert, no localStorage/settings/store writes — dispatching the host's
		*     own click is the entire surface.
		*   - W-6 off == never installed: the disposer reverse-collapses exactly
		*     the rows we expanded (still connected and currently open), then
		*     disconnects the observer and clears the pending scan.
		*   - W-7: one `MutationObserver` on `document.body`
		*     (`childList` + `subtree` + `attributeFilter: ['data-state']`)
		*     coalesced into a single 0-delay scan; the click itself only changes
		*     `aria-expanded` (not watched) so it re-triggers nothing.
		*   - W-13 focus preservation: a row click steals focus (the row is
		*     `role="button"`); if the previous active element is a text field
		*     (input/textarea/contenteditable) still in the tree, focus goes back.
		*   - Group layer: NOT done (W-11) — the host's compact-mode "N tool calls"
		*     group stays host-native (its collapse markup is untouched by design).
		*/
		const id = "tool-ask-question-expanded";
		const title = "Ask question expanded";
		const description = "Reveal the question and its answer in the chat flow by default.";
		/** Chat-flow ask-question rows (W-1): the host's own tool card rows. */
		const ROW_SELECTOR = "[data-conversation-scroll] [data-tool=\"ask_user_question\"]";
		/** The host disclosure row inside an ask row (W-3): the element we click. */
		const DISCLOSURE_SELECTOR = "[data-disclosure-row]";
		/**
		* Mount the client half.
		* @param {object} ctx - the client plugin context (unused: pure DOM feature).
		* @param {object} deps - shared feature deps (unused: no service needed).
		* @returns {() => void} disposer (W-6 reverse-collapse + teardown).
		*/
		function client(ctx, deps) {
			let disposed = false;
			let timer = null;
			/** W-4: disclosure rows we expanded — each element is clicked at most once. */
			const expandedByUs = /* @__PURE__ */ new WeakSet();
			const observer = new MutationObserver(schedule);
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
		function attach(ctx) {
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
		//#endregion
		//#region src/switches.js
		/**
		* D5 switch engine of dsh-ux-plus: mounts/disposes the four feature clients
		* to match the `ux-plus` section value, immediately and reversibly.
		*
		* This module is deliberately React-free (only the four feature modules
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
			feature$3,
			feature$2,
			feature$1,
			{
				id,
				title,
				description,
				hasGear: false,
				host: (ctx) => attach(ctx),
				client: (ctx, deps) => client(ctx, deps)
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
		* `tool-ask-question-expanded`), each backed by a boolean key in the
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
		*/
		const inject = [
			"slots",
			"locale",
			"configForms",
			"sessions",
			"workspaces"
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
					IconCopyOutlineRegular: _deepseek_ai_dsh_client_ui_primitives.IconCopyOutlineRegular
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
