/**
 * Self-contained tsdown build for the dsh-ux-plus browser half — the host's
 * dynamic-client artifact form (deepseek-harness `packages/client/
 * tsdown.client.ts`, `clientConfig()`). Nothing from that repo is imported;
 * the load-bearing parts are replicated here verbatim in behavior:
 *
 * - `format: 'cjs'` + pinned `entryFileNames` produce one classic script
 *   (no top-level ESM — the host byte-concatenates all client halves into a
 *   single classic <script>, packages/client/modules/src/index.ts:366-370);
 * - banner/intro/footer wrap the CJS body into a `window.__ModuleLoader__.
 *   load({ id, factory: (require) => { ... } })` registration; the loader
 *   hard-checks `id` against the package name (packages/client/modules/
 *   src/client/system.ts:176-177) — hence id = "dsh-ux-plus";
 * - `external` is exactly the nine shell-seeded module-table specifiers
 *   (packages/client/web/src/platform.ts:8-14): they must remain
 *   `require(...)` in the artifact and are resolved by the shell's module
 *   table at factory-run time. They are not present in this package's
 *   node_modules and must not be resolved or inlined.
 *
 * Deliberate deviations from the host preset: no sourcemap (the combo builder
 * falls back to an identity section map), no host workspace plugins (purity
 * gate / CSS / async-chunk helpers are host-repo specific and irrelevant to a
 * single-entry bundle), no define baking (nothing inlined reads
 * import.meta.env).
 *
 * UPSTREAM ANCHOR (host major-upgrade re-derivation checklist):
 *   banner/intro/footer + output shape — packages/client/tsdown.client.ts:618-624
 *   external/inline rule — packages/client/tsdown.client.ts:492-498
 *   loader registration id hard-check — packages/client/modules/src/client/system.ts:176-177
 *   nine seed specifiers — packages/client/web/src/platform.ts:8-14
 *   combo byte-concatenation — packages/client/modules/src/index.ts:366-370
 * Any change in those five places requires re-deriving this file and the
 * R10 assertions in scripts/build.js.
 */
/** The nine shell-seeded module-table specifiers (platform.ts:8-14). */
const SEED_SPECIFIERS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

export default {
  name: 'dsh-ux-plus/client',
  entry: { client: './src/client.js' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  dts: false,
  sourcemap: false,
  // lib/ is owned by tsdown alone; clean it so stale chunks never ship.
  clean: true,
  /**
   * The host's `clientConfig` rule (tsdown.client.ts:492-498): requested
   * specifiers stay `require(...)` for the shell's module table, everything
   * else must inline. `alwaysBundle` is the load-bearing half — without it a
   * future non-seed import would silently stay external and throw at
   * factory-run time ("cannot resolve module"); with it, that import fails
   * loudly here, at build time.
   */
  deps: {
    neverBundle: SEED_SPECIFIERS,
    alwaysBundle: (specifier) => !SEED_SPECIFIERS.includes(specifier),
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: (chunk) => `window.__ModuleLoader__.load({ id: "dsh-ux-plus", ${chunk.isEntry ? '' : `chunk: ${JSON.stringify(chunk.fileName)}, `}factory: (require) => {`,
    intro: 'var module = { exports: {} }; var exports = module.exports;',
    footer: 'return module.exports; } });',
  },
}
