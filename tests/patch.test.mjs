import { readFile } from 'node:fs/promises'
import test from 'node:test'
import assert from 'node:assert/strict'

const root = new URL('../', import.meta.url)
const readJson = async (name) => JSON.parse(await readFile(new URL(name, root), 'utf8'))

/** Frozen feature sub-package names (plan §3.8, directory names). */
const FEATURES = ['conversation-typography', 'workspace-session-menu', 'workspace-recency-order', 'tool-ask-question-expanded']

/**
 * Collect `- id:` rows (with their following `name:`) from a patch document.
 * @param {string} yaml - patch file text.
 * @returns rows in file order.
 */
function insertRows(yaml) {
  const rows = []
  for (const line of yaml.split('\n')) {
    const id = /^\s*-\s+id:\s*(\S+)\s*$/.exec(line)
    if (id !== null) {
      rows.push({ id: id[1] })
      continue
    }
    const name = /^\s+name:\s*['"]?([^'"\s]+)['"]?\s*$/.exec(line)
    if (name !== null && rows.length > 0 && rows.at(-1).name === undefined) rows.at(-1).name = name[1]
  }
  return rows
}

test('patch loads the main plugin and its typography configuration entry', async () => {
  const rows = insertRows(await readFile(new URL('cordis.patch.yml', root), 'utf8'))
  assert.equal(rows.length, 2)
  assert.equal(rows[0].id, 'ux-plus')
  const manifest = await readJson('package.json')
  assert.equal(rows[0].name, manifest.name)
  assert.deepEqual(rows[1], { id: 'ui-tweak', name: `${manifest.name}/ui-tweak` })
})

test('manifest declares the host entry, the browser entry, and a well-formed dsh.client', async () => {
  const manifest = await readJson('package.json')
  assert.equal(manifest.dsh?.bundle?.patch, './cordis.patch.yml')
  assert.equal(manifest.main, 'src/index.js')
  assert.equal(manifest.exports?.['.'], './src/index.js')
  assert.equal(manifest.exports?.['./ui-tweak'], './src/ui-tweak.js')
  await readFile(new URL(manifest.exports['./ui-tweak'], root))
  assert.ok(manifest.files.includes('src'), 'the packed package includes the typography entry')
  const clientExport = manifest.exports?.['./client']
  const clientTarget = typeof clientExport === 'string' ? clientExport : clientExport?.default
  assert.equal(typeof clientTarget, 'string')
  await readFile(new URL(clientTarget, root))
  assert.equal(manifest.dsh?.client?.platform, 'web')
  assert.ok(Array.isArray(manifest.dsh?.client?.inject))
})

test('the four feature sub-packages exist under their frozen names', async () => {
  for (const name of FEATURES) {
    const feature = await readJson(`features/${name}/package.json`)
    assert.equal(feature.name, `@dsh-ux-plus/${name}`)
    assert.equal(feature.private, true)
    const mod = await import(new URL(`features/${name}/src/index.js`, root).href)
    assert.equal(mod.id, name)
    assert.equal(mod.feature.id, name)
    assert.equal(typeof mod.attach, 'function')
    assert.equal(typeof mod.dispose, 'function')
  }
})

test('the package no longer depends on the legacy feature packages', async () => {
  const manifest = await readJson('package.json')
  const deps = manifest.dependencies ?? {}
  for (const legacy of ['dsh-ui-tweak', 'dsh-session-id-menu', 'dsh-workspace-folder-order']) {
    assert.equal(deps[legacy], undefined)
  }
})

test('host entries expose writable UX Plus and typography configurations', async () => {
  const host = await import(new URL('src/index.js', root).href)
  const ctx = {}
  const dispose = host.apply(ctx)
  assert.deepEqual(host.Config({}).get(), Object.fromEntries(FEATURES.map((name) => [name, true])))
  assert.deepEqual(host.Config({ [FEATURES[0]]: false }).get(), Object.fromEntries(FEATURES.map((name) => [name, name !== FEATURES[0]])))
  const tweak = await import(new URL('src/ui-tweak.js', root).href)
  assert.deepEqual(tweak.Config({}).get(), { fontSize: 'l', chatWidth: 'l' })
  assert.deepEqual(tweak.Config({ fontSize: 'xl', chatWidth: 's' }).get(), { fontSize: 'xl', chatWidth: 's' })
  assert.throws(() => tweak.Config({ fontSize: 'nope' }).get())
  dispose()
  for (const name of FEATURES) {
    const mod = await import(new URL(`features/${name}/src/index.js`, root).href)
    assert.equal(mod.feature.id, name)
    const release = mod.feature.host(ctx)
    assert.equal(typeof release, 'function')
    release()
  }
})
