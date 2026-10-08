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

test('patch declares exactly one self-referential row, stable id, name == package name', async () => {
  const rows = insertRows(await readFile(new URL('cordis.patch.yml', root), 'utf8'))
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, 'ux-plus')
  const manifest = await readJson('package.json')
  assert.equal(rows[0].name, manifest.name)
})

test('manifest declares the host entry, the browser entry, and a well-formed dsh.client', async () => {
  const manifest = await readJson('package.json')
  assert.equal(manifest.dsh?.bundle?.patch, './cordis.patch.yml')
  assert.equal(manifest.main, 'src/index.js')
  assert.equal(manifest.exports?.['.'], './src/index.js')
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

test('host half registers the ux-plus switch section (all-true) and the ui-tweak section', async () => {
  const host = await import(new URL('src/index.js', root).href)
  const registered = []
  const ctx = {
    inject: (names, callback) => {
      if (names.includes('settings')) callback({ settings: { register: (ns, schema) => registered.push({ ns, schema }) } })
    },
  }
  const dispose = host.apply(ctx)
  // P3: the conversation-typography feature host (plan D7) registers the
  // durable `ui-tweak` section in addition to the ux-plus switch section.
  assert.deepEqual(registered.map((row) => row.ns).sort(), ['ui-tweak', 'ux-plus'])
  const ux = registered.find((row) => row.ns === 'ux-plus')
  assert.deepEqual(ux.schema(undefined), Object.fromEntries(FEATURES.map((name) => [name, true])))
  assert.deepEqual(ux.schema({ [FEATURES[0]]: false }), Object.fromEntries(FEATURES.map((name) => [name, name !== FEATURES[0]])))
  assert.deepEqual(ux.schema.toJSON().properties, Object.fromEntries(FEATURES.map((name) => [name, { type: 'boolean' }])))
  const tweak = registered.find((row) => row.ns === 'ui-tweak')
  assert.deepEqual(tweak.schema(undefined), { fontSize: 'l', chatWidth: 'l' })
  assert.deepEqual(tweak.schema({ fontSize: 'xl', chatWidth: 's' }), { fontSize: 'xl', chatWidth: 's' })
  assert.deepEqual(tweak.schema.toJSON().properties, {
    fontSize: { type: 'string', enum: ['xs', 's', 'm', 'l', 'xl'] },
    chatWidth: { type: 'string', enum: ['s', 'm', 'l', 'xl'] },
  })
  assert.throws(() => tweak.schema({ fontSize: 'nope' }), TypeError)
  dispose()
  for (const name of FEATURES) {
    const mod = await import(new URL(`features/${name}/src/index.js`, root).href)
    assert.equal(mod.feature.id, name)
    const release = mod.feature.host(ctx)
    assert.equal(typeof release, 'function')
    release()
  }
})
