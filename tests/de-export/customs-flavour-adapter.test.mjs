import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { adaptCustoms, adaptFlavour, manifestIcons, mergeCustoms, mergeFlavour } from '../../scripts/de-export/adapters/merge-customs-flavour.mjs'

const custom = '/Lotus/Upgrades/Skins/Test/TestSkin'
const emote = '/Lotus/Types/Items/Emotes/TestEmote'
const manifest = { Manifest: [{ uniqueName: custom, textureLocation: '/Lotus/Test.png!custom-hash' }, { uniqueName: emote, textureLocation: '/Lotus/Emote.png!emote-hash' }] }

test('adapts customs and flavour while keeping literal DE text', () => {
  const customs = adaptCustoms([{ uniqueName: custom, name: 'Test Skin', description: 'Literal skin', codexSecret: false, ignored: true }])
  const flavour = adaptFlavour([{ uniqueName: emote, name: 'Test Emote', description: 'Literal emote', codexSecret: false }])
  assert.deepEqual(customs[custom], { uniqueName: custom, name: 'Test Skin', description: 'Literal skin', codexSecret: false })
  assert.equal(flavour[emote].name, 'Test Emote')
})

test('merges mirror base and injects manifest icons for DE-only records', () => {
  const customResult = mergeCustoms({ '/mirror': { uniqueName: '/mirror', name: 'Mirror' } }, manifestIcons(adaptCustoms([{ uniqueName: custom, name: 'Test Skin' }]), manifest))
  const flavourResult = mergeFlavour({ [emote]: { uniqueName: emote, name: 'Mirror Emote', icon: '/old.png' } }, manifestIcons(adaptFlavour([{ uniqueName: emote, name: 'Test Emote' }]), manifest))
  assert.equal(customResult.merged[custom].icon, '/Lotus/Test.png')
  assert.equal(customResult.merged['/mirror'].name, 'Mirror')
  assert.equal(flavourResult.merged[emote].name, 'Mirror Emote')
  assert.equal(flavourResult.merged[emote].icon, '/Lotus/Emote.png')
})

test('appearance catalog has a literal DE-name fallback when dict resolution is absent', async () => {
  const source = await readFile(new URL('../../src/lib/inventoryParser.js', import.meta.url), 'utf8')
  assert.match(source, /resolveName\(un, dict, locale, ECustOrig, ECust, ER, ERecipe\) \|\| entry\?\.name \|\| nameFromPath\(un\)/)
})
