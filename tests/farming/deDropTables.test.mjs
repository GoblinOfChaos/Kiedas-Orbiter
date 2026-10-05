import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { parseDropTablesHtml } from '../../src/lib/deDropTables/parse.js'
import { convertDeDropTables, parseDePlace } from '../../src/lib/deDropTables/convert.js'
import { buildDropIndex } from '../../src/lib/dropsParser.js'

const SNAPSHOT = '/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/docs/agent-context/briefs-2026-10-03/data/DropTables.parsed.json'
const OLD_DROPS = path.join(process.env.PREVIEW_DATA_DIR || '/home/jedwards/.local/share/kiedas-orbiter-preview/data', 'export/DropsAll.json')
const haveRealData = fs.existsSync(SNAPSHOT) && fs.existsSync(OLD_DROPS)

const row = (item, chance, rarity = 'Common') => `<tr><td></td><td>${item}</td><td>${rarity} (${chance}%)</td></tr>`

const fixture = {
  sections: {
    missionRewards: [{ place: 'Event: Mars/Quirinus (Capture)', rotation: 'Rotation A', item: 'Vitality', rarity: 'Common', chance: 1 }],
    relicRewards: [{ place: 'Axi A1 Relic (Intact)', rotation: null, item: 'Forma', rarity: 'Rare', chance: 1 }],
    keyRewards: [{ place: 'The Xoris', rotation: 'Rotation B', item: 'Vitality', rarity: 'Common', chance: 1 }],
    transientRewards: [{ place: 'Arbitrations', rotation: 'Rotation C', item: 'Vitality', rarity: 'Common', chance: 1 }],
    sortieRewards: [{ place: 'Sortie', rotation: null, item: 'Forma', rarity: 'Rare', chance: 1 }],
    cetusRewards: [{ place: 'Level 5 - 15 Cetus Bounty', rotation: 'Rotation B', stage: 'Stage 1', item: 'Vitality', rarity: 'Common', chance: 1 }],
    solarisRewards: [{ place: 'Level 5 - 15 Orb Vallis Bounty', rotation: 'Rotation C', stage: 'Final Stage', item: 'Forma', rarity: 'Rare', chance: 1 }],
    deimosRewards: [{ place: 'Level 30 - 40 Isolation Vault', rotation: 'Rotation A', stage: 'Final Stage', item: 'Neurodes', rarity: 'Common', chance: 1 }],
    zarimanRewards: [{ place: 'Level 50 - 55 Zariman Bounty', rotation: 'Rotation C', stage: 'Final stage', item: 'Kuva', rarity: 'Common', chance: 1 }],
    entratiLabRewards: [{ place: 'Level 55 - 60 Entrati Lab Bounty', rotation: 'Rotation C', stage: 'Final stage', item: 'Kuva', rarity: 'Common', chance: 1 }],
    hexRewards: [{ place: 'Level 55 - 60 WF1999 Bounty', rotation: 'Rotation C', stage: 'Final stage', item: 'Kuva', rarity: 'Common', chance: 1 }],
    modByAvatar: [{ source: 'Enemy', sourceChance: 0.25, item: 'Serration', rarity: 'Common', chance: 1 }],
    blueprintByAvatar: [{ source: 'Enemy', sourceChance: 0.25, item: 'Forma Blueprint', rarity: 'Rare', chance: 1 }],
    resourceByAvatar: [{ source: 'Enemy', sourceChance: 0.25, item: 'Neurodes', rarity: 'Rare', chance: 1 }],
    sigilByAvatar: [{ source: 'Enemy', sourceChance: 0.25, item: 'Sigil', rarity: 'Common', chance: 1 }],
    additionalItemByAvatar: [{ source: 'Enemy', sourceChance: 0.25, item: 'Kuva', rarity: 'Common', chance: 1 }],
    modByDrop: [{ source: 'Enemy', item: 'Serration', rarity: 'Common', chance: 1 }],
    blueprintByDrop: [{ source: 'Enemy', item: 'Forma Blueprint', rarity: 'Rare', chance: 1 }],
  },
  stats: { rows: 18, places: 10 },
}

test('mission conversion restores legacy planet, node, mode, and event fields', () => {
  assert.deepEqual(parseDePlace('Event: Mars/Quirinus (Capture)'), {
    planet: 'Mars', node: 'Quirinus', gameMode: 'Capture', isEvent: true,
  })
  const converted = convertDeDropTables(fixture)
  assert.deepEqual(converted.missionRewards.Mars.Quirinus, {
    gameMode: 'Capture', isEvent: true,
    rewards: { A: [{ itemName: 'Vitality', rarity: 'Common', chance: 100 }] },
  })
})

test('relic, key, transient, and sortie sections use the legacy consumer shapes', () => {
  const converted = convertDeDropTables(fixture)
  assert.equal(converted.relics[0].relicName, 'A1')
  assert.equal(converted.keyRewards[0].keyName, 'The Xoris')
  assert.equal(converted.keyRewards[0].rewards.B[0].itemName, 'Vitality')
  assert.equal(converted.transientRewards[0].objectiveName, 'Arbitrations')
  assert.equal(converted.transientRewards[0].rewards[0].rotation, 'C')
  assert.equal(converted.sortieRewards[0].itemName, 'Forma')
})

test('all bounty sections emit old names, A/B/C keys, and per-entry stages', () => {
  const converted = convertDeDropTables(fixture)
  for (const [section, outputName, rotation] of [
    ['cetusRewards', 'cetusBountyRewards', 'B'],
    ['solarisRewards', 'solarisBountyRewards', 'C'],
    ['deimosRewards', 'deimosRewards', 'A'],
    ['zarimanRewards', 'zarimanRewards', 'C'],
    ['entratiLabRewards', 'entratiLabRewards', 'C'],
    ['hexRewards', 'hexRewards', 'C'],
  ]) {
    assert.ok(converted[outputName], `${section} should emit ${outputName}`)
    const entry = converted[outputName][0].rewards[rotation][0]
    assert.equal(entry.stage, fixture.sections[section][0].stage)
  }
})

test('avatar and item sections are consumable and DE does not invent syndicate drops', () => {
  const converted = convertDeDropTables(fixture)
  assert.equal(converted.modLocations[0].enemies[0].enemyName, 'Enemy')
  assert.equal(converted.enemyModTables[0].mods[0].modName, 'Serration')
  assert.equal(converted.blueprintLocations[0].blueprintName, 'Forma Blueprint')
  assert.equal(converted.enemyBlueprintTables[0].items[0].itemName, 'Forma Blueprint')
  assert.equal('syndicates' in converted, false)
  assert.doesNotThrow(() => buildDropIndex({ DropsAll: converted }))
})

test('HTML parsing retains bounty outer rotation and stage for the converter', () => {
  const html = [
    '<h3 id="cetusRewards">Cetus</h3><table>',
    '<tr><th colspan="3">Level 5 - 15 Cetus Bounty</th></tr>',
    '<tr><th colspan="3">Rotation B</th></tr>',
    '<tr><td class="pad-cell"></td><th colspan="2">Stage 1</th></tr>', row('Oxium', 100),
    '</table>',
  ].join('')
  const parsed = parseDropTablesHtml(html).sections.cetusRewards[0]
  assert.equal(parsed.rotation, 'Rotation B')
  assert.equal(parsed.stage, 'Stage 1')
  assert.equal(convertDeDropTables({ sections: { cetusRewards: [parsed] } }).cetusBountyRewards[0].rewards.B[0].stage, 'Stage 1')
})

function sourceLocation(row) {
  return {
    mission: `${row.region || ''}/${row.nodeName || row.node || ''} (${row.missionType || ''})`,
    relic: `${row.relicName || ''} ${row.state || ''}`,
    bounty: row.bountyLevel || '',
    key: row.keyName || '',
    transient: row.objectiveName || '',
    sortie: 'Sortie',
    enemy: row.enemyName || '',
    avatar: row.sourceName || '',
    syndicate: row.syndicateName || '',
  }[row.type] || row.sourceName || row.location || ''
}

function rowMap(index) {
  const map = new Map()
  for (const [item, rows] of Object.entries(index)) {
    for (const row of rows) {
      const key = [item, row.type || '', sourceLocation(row), row.rotation || ''].join('\u0000')
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(row)
    }
  }
  return map
}

test('real data: converted DE drop index is consumable and parity is reported', { skip: !haveRealData }, async () => {
  const { loadRealHarness } = await import('../../scripts/lib/real-data-harness.mjs')
  const harness = await loadRealHarness({ locale: 'en' })
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'))
  const oldIndex = buildDropIndex(harness.exportsBundle)
  const newIndex = buildDropIndex({ ...harness.exportsBundle, DropsAll: convertDeDropTables(snapshot) })
  const oldRows = rowMap(oldIndex)
  const newRows = rowMap(newIndex)
  const onlyOld = []
  const onlyNew = []
  const rarityDifferences = []
  const chanceDifferences = []
  for (const [key, rows] of oldRows) {
    if (!newRows.has(key)) {
      onlyOld.push(...rows.map((row) => ({ item: key.split('\u0000')[0], type: row.type, place: sourceLocation(row), rotation: row.rotation || null, stage: row.stage || null })))
      continue
    }
    for (const row of rows) {
      const matches = newRows.get(key)
      if (!matches.some((candidate) => Math.abs((candidate.chance ?? -1) - (row.chance ?? -1)) < 1e-9)) chanceDifferences.push({ item: key.split('\u0000')[0], type: row.type, place: sourceLocation(row), rotation: row.rotation || null })
      if (!matches.some((candidate) => candidate.rarity === row.rarity)) rarityDifferences.push({ item: key.split('\u0000')[0], type: row.type, place: sourceLocation(row), old: row.rarity, new: matches.map((candidate) => candidate.rarity) })
    }
  }
  for (const [key, rows] of newRows) {
    if (!oldRows.has(key)) onlyNew.push(...rows.map((row) => ({ item: key.split('\u0000')[0], type: row.type, place: sourceLocation(row), rotation: row.rotation || null, stage: row.stage || null })))
  }
  const sharedMissionRows = [...oldRows].flatMap(([key, rows]) => key.includes('\u0000mission\u0000') && newRows.has(key) ? rows : [])
  const missionChanceDifferences = chanceDifferences.filter((row) => row.type === 'mission')
  const summary = {
    oldIndexItems: Object.keys(oldIndex).length,
    newIndexItems: Object.keys(newIndex).length,
    oldRows: [...oldRows.values()].reduce((count, rows) => count + rows.length, 0),
    newRows: [...newRows.values()].reduce((count, rows) => count + rows.length, 0),
    sharedMissionRows: sharedMissionRows.length,
    onlyOld: onlyOld.length,
    onlyNew: onlyNew.length,
    chanceDifferences: chanceDifferences.length,
    missionChanceDifferences: missionChanceDifferences.length,
    rarityWordDifferences: rarityDifferences.length,
    onlyOldByType: Object.groupBy(onlyOld, (row) => row.type),
    onlyOldSample: onlyOld.slice(0, 25),
  }
  console.log('DE_DROP_INDEX_PARITY', JSON.stringify({ ...summary, onlyOldByType: Object.fromEntries(Object.entries(summary.onlyOldByType).map(([type, rows]) => [type, rows.length])) }))
  assert.ok(Object.keys(newIndex).length > 0)
  assert.equal(missionChanceDifferences.length, 0, JSON.stringify(summary))
})

test('real data: acquisition drawers are compared against old and converted DE indexes', { skip: !haveRealData }, async () => {
  const { loadRealHarness } = await import('../../scripts/lib/real-data-harness.mjs')
  const harness = await loadRealHarness({ locale: 'en' })
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'))
  const oldIndex = buildDropIndex(harness.exportsBundle)
  const newIndex = buildDropIndex({ ...harness.exportsBundle, DropsAll: convertDeDropTables(snapshot) })
  const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import('../../src/lib/acquisitionInfo.js')
  const indexes = buildAllAcquisitionIndexes(harness.exportsBundle)
  const overrides = JSON.parse(fs.readFileSync(path.join(harness.repo, 'src-tauri/data/assets/data/acquisition_overrides.json'), 'utf8'))
  const acquire = (dropIndex, uniqueName, name) => getAcquisitionInfo(
    uniqueName, name, dropIndex, overrides,
    indexes.recipeResultIndex, indexes.marketIndex, indexes.bundleIndex, indexes.syndicateIndex,
    indexes.wikiSigilIndex, indexes.wikiVendorIndex, indexes.wikiTennoGenIndex, indexes.wikiBaroIndex,
    indexes.exportVendorIndex, indexes.alwaysAvailableIndex, indexes.glyphSupplementIndex,
    indexes.wikiBlueprintIndex, indexes.wikiResearchIndex, indexes.relicStateIndex,
    indexes.wikiResourceIndex, indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex,
    indexes.exaltedWeaponIndex, indexes.exportComponentIndex,
  )
  const results = {}
  for (const name of ['Serration', 'Vitality', 'Neurodes', 'Orokin Cell', 'Kuva', 'Arcane Energize']) {
    const uniqueName = Object.entries(harness.uniqueNameToName).find(([, displayName]) => displayName === name)?.[0]
    assert.ok(uniqueName, `missing real export identity for ${name}`)
    const oldSources = acquire(oldIndex, uniqueName, name)?.sources || []
    const newSources = acquire(newIndex, uniqueName, name)?.sources || []
    const oldSet = new Set(oldSources.map((source) => JSON.stringify(source)))
    const newSet = new Set(newSources.map((source) => JSON.stringify(source)))
    results[name] = {
      old: oldSources.length,
      new: newSources.length,
      onlyOld: [...oldSet].filter((source) => !newSet.has(source)).length,
      onlyNew: [...newSet].filter((source) => !oldSet.has(source)).length,
    }
    assert.ok(oldSources.length > 0 || newSources.length > 0, `${name} has no acquisition rows in either index`)
  }
  console.log('DE_DRAWER_PARITY', JSON.stringify(results))
})

test('syndicate offerings from the previous DropsAll ride along because DE\'s page has none', () => {
  const legacy = { syndicates: { 'Operational Supply': [{ item: 'Fosfor Blau (x20) Blueprint', place: 'Operational Supply, Neutral' }] } }
  assert.deepEqual(convertDeDropTables({ sections: {} }, legacy).syndicates, legacy.syndicates)
  assert.equal(convertDeDropTables({ sections: {} }).syndicates, undefined)
})
