/**
 * Build gate for dsh-ux-plus.
 *
 * Two faces:
 *  - host half: hand-written ESM (src/index.js + features/*) — parsed only
 *    (node --check);
 *  - client half: tsdown-built classic-script artifact (lib/client.js),
 *    checked by the R10 mechanical assertions (plan §R10):
 *      ① zero top-level ESM statements — the host byte-concatenates every
 *         client half into one classic <script>, so any export/import breaks
 *         the whole combo;
 *      ② exactly one window.__ModuleLoader__.load( registration, with
 *         id === the package name (loader hard-check, host packages/client/
 *         modules/src/client/system.ts:176-177);
 *      ③ every require("...") specifier is one of the nine shell-seeded
 *         module-table specifiers (host packages/client/web/src/platform.ts:8-14);
 *      ④ the artifact registers the settings.section entry (plan W-7) and
 *         carries no settings.plugins.tab registration (plan W-8);
 *      plus: artifact non-empty, exports.apply assigned.
 *
 * Run as `npm run build` (tsdown runs first). Any violation exits 1.
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'

const root = new URL('..', import.meta.url)
const errors = []

const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
const clientExport = manifest.exports?.['./client']
const clientTarget = typeof clientExport === 'string' ? clientExport : clientExport?.default
if (typeof clientTarget !== 'string') {
  errors.push('exports["./client"] must point at a file (string or {default})')
}

const client = manifest.dsh?.client
if (client?.platform !== 'web') errors.push('dsh.client.platform must be "web"')
if (client?.inject !== undefined && (!Array.isArray(client.inject) || client.inject.some((edge) => typeof edge !== 'string'))) {
  errors.push('dsh.client.inject must be an array of package-name strings')
}
if (client?.external !== undefined) errors.push('dsh.client.external is forbidden for this package')

// R10: mechanical assertions on the BUILT artifact (lib/client.js), not source.
const SEEDS = [
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
let artifact = null
if (typeof clientTarget === 'string') {
  artifact = await readFile(new URL(clientTarget, root), 'utf8').catch(() => {
    errors.push(`artifact missing: ${clientTarget} (run the build first — npm run build runs tsdown)`)
    return null
  })
}
if (artifact !== null) {
  if (artifact.length === 0) {
    errors.push('artifact is empty')
  } else {
    // ① zero top-level ESM statements.
    const esmLines = artifact.split('\n').filter((line) => /^\s*(export|import)\b/.test(line))
    if (esmLines.length > 0) {
      errors.push(`artifact has top-level ESM (first: ${JSON.stringify(esmLines[0].trim().slice(0, 120))})`)
    }
    // ② exactly one registration, id === package name.
    const loads = artifact.match(/window\.__ModuleLoader__\.load\(/g) ?? []
    if (loads.length !== 1) {
      errors.push(`artifact must register exactly once via window.__ModuleLoader__.load( — found ${loads.length}`)
    }
    const idMatch = artifact.match(/window\.__ModuleLoader__\.load\(\{\s*id:\s*("([^"]*)")/)
    if (!idMatch) {
      errors.push('artifact registration lacks an id field')
    } else if (JSON.parse(idMatch[1]) !== manifest.name) {
      errors.push(`artifact registration id ${idMatch[1]} !== package name "${manifest.name}"`)
    }
    // ③ all require() specifiers ⊆ the nine seeds (single- or double-quoted).
    const foreign = [...new Set(
      [...artifact.matchAll(/require\(\s*(['"])((?:(?!\1).)*)\1\s*\)/g)].map((m) => m[2]).filter((spec) => !SEEDS.includes(spec)),
    )]
    if (foreign.length > 0) {
      errors.push(`artifact requires non-seed specifiers: ${foreign.join(', ')}`)
    }
    if (!/exports\.apply\s*=/.test(artifact)) {
      errors.push('artifact never assigns exports.apply')
    }
    // ④ the settings entry point moved from the plugins tab to the
    //    settings shell's outer section (plan W-7/W-8).
    if (!/settings\.section/.test(artifact)) {
      errors.push('artifact does not register the settings.section entry (plan W-7)')
    }
    if (/settings\.plugins\.tab/.test(artifact)) {
      errors.push('artifact still carries the retired settings.plugins.tab registration')
    }
    // ⑤ the fourth capability is inlined (plan RR5): its row selector, the
    //    tool name, and the disclosure/aria action strings must survive.
    for (const needle of ['[data-tool', 'ask_user_question', 'data-disclosure-row', 'aria-expanded']) {
      if (!artifact.includes(needle)) {
        errors.push(`artifact is missing the ask-question-expanded marker ${JSON.stringify(needle)} (plan RR5)`)
      }
    }
  }
}

// Hand-written halves: parse only.
const jsFiles = [
  'src/index.js',
  'src/client.js',
  'src/switches.js',
  'features/conversation-typography/src/index.js',
  'features/workspace-session-menu/src/index.js',
  'features/workspace-recency-order/src/index.js',
  'features/tool-ask-question-expanded/src/index.js',
]
for (const file of jsFiles) {
  const path = fileURLToPath(new URL(file, root))
  try {
    await readFile(path)
  } catch {
    errors.push(`missing ${file}`)
    continue
  }
  try {
    execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' })
  } catch (error) {
    errors.push(`node --check failed for ${file}: ${error.stderr.toString().trim()}`)
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`build: ${error}`)
  process.exit(1)
}
console.log(`build: ok (${jsFiles.length} files checked, artifact ${clientTarget} asserted)`)
