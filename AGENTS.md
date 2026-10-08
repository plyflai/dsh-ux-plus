# Development

- This repository owns the standalone `dsh-ux-plus` DSH Web plugin.
- Use CodeGraph before code exploration when `.codegraph/` exists; otherwise use targeted source inspection.
- Keep the package name, loader registration ID, patch row ID `ux-plus`, and existing settings namespaces stable.
- Keep feature modules under `features/` and register them in the host and client feature lists. They are private implementation modules, not separate installable plugins.
- Preserve lifecycle disposal and the existing built-artifact checks in `scripts/build.js`.
- Run `npm test` and `npm run build` for source changes. Commit the rebuilt `lib/client.js` because GitHub installs use it.
- Before publishing a package, inspect `npm pack --dry-run` and verify the packed host entry can load independently of the checkout.
- Keep user documentation focused on installation, behavior, compatibility, and development. Personal runtime configuration and deployment records belong outside this repository.
