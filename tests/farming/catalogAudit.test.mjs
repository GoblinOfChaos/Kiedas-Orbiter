import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'
import routeBaseline from '../fixtures/has-route-baseline.json' with { type: 'json' }

const auditRoot = path.resolve(process.env.P36_AUDIT_REPO || path.join(import.meta.dirname, '../..'))
const overrides = JSON.parse(fs.readFileSync(path.join(auditRoot, 'src-tauri/data/assets/data/acquisition_overrides.json'), 'utf8'))
const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'))
const HAS_ROUTE_BASELINE = new Set(routeBaseline.uniqueNames)

const ALLOWED_VIOLATIONS = new Map()

// Every entry here is a complete, reviewed route phrase whose lower-case
// opening is part of the source wording, not a sentence fragment produced by
// a splitter. Keep this explicit: a new lower-case row must fail the audit.
const REVIEWED_LOWERCASE_PHRASES = new Map()

const REVIEWED_CONJUNCTION_PHRASES = new Map([
  ['However, the Bondi K-Drive does not appear in the Arsenal, thus it cannot be altered.', 'Complete current route sentence from the saved wiki text; However introduces a contrast, not a splitter fragment.'],
  ['Which specific tone this is (default vs Refacia-locked) not determined from the page text alone.', 'Explicitly recorded limitation from the saved wiki source; it is a complete note and not a fragment created by splitting.'],
  ['However, only the squad host requires a Locator, allowing them to invite other players to participate in the mission, and the component reward will be granted to all players upon completion.', 'Complete current route sentence from the saved wiki text; the conjunction is grammatical prose.'],
  ['However, Voidrig component blueprints and the main blueprint cannot be traded.', 'Complete current tradeability sentence from the saved wiki text.'],
  ['However, Bonewidow component blueprints and the main blueprint cannot be traded.', 'Complete current tradeability sentence from the saved wiki text.'],
  ["Then the Machete's blueprint can be bought from Cephalon Simaris offerings for 100,000 Standing.", 'Complete current route sentence from the saved wiki text; Then introduces a second current route.'],
  ['While the actual Grip itself cannot usually be acquired outside of events, it can still appear as part of a complete Zaw in Hok\'s Daily Specials.', 'Complete current route sentence from the saved wiki text; While introduces a condition, not a splitter fragment.'],
  ['While the actual Strike itself cannot usually be acquired outside of events, it can still appear as part of a complete Zaw in Hok\'s Daily Specials.', 'Complete current route sentence from the saved wiki text; While introduces a condition, not a splitter fragment.'],
  ['While some are only given out by the creators personally, many are implemented with universal Promo Codes which can be freely redeemed by any player.', 'Complete current acquisition sentence from the saved wiki text; While introduces a condition, not a splitter fragment.'],
])

function catalogEntries(exportsBundle) {
  const all = []
  for (const key of Object.keys(exportsBundle)) {
    if (!/^Export(Warframes|Weapons|Recipes|Resources|Sentinels|Gear|Misc|Customs|Upgrades)$/.test(key)) continue
    const table = exportsBundle[key]
    const entries = Array.isArray(table) ? table.map((entry) => [entry.uniqueName, entry]) : Object.entries(table || {})
    for (const [uniqueName, entry] of entries) {
      if (uniqueName && entry && (entry.name || entry.displayName) && !isPlaceholder(uniqueName, entry.name || entry.displayName || '')) all.push({ uniqueName, name: entry.name || entry.displayName || '' })
    }
  }
  return all
}

function isPlaceholder(uniqueName, name) {
  return /Lotus\*Customization/i.test(`${uniqueName} ${name}`)
    || /^<[^>]+>$/.test(String(name).trim())
    || /<[^>]+>/.test(String(name))
}

function violationKind(text) {
  if (/^\d{1,3}$/.test(text) || /^000\s+(?:Credits|Standing|Platinum)\b/i.test(text)) return 'digitFragment'
  if (/^[^.]{0,30}:$/.test(text)) return 'danglingColon'
  if (/\bfor\s*[.,]|\bfor\s*$/.test(text)) return 'missingPrice'
  if (/\{\{|\}\}|\[\[|\]\]/.test(text)) return 'markup'
  if (/[A-Za-z]_[A-Za-z]/.test(text)) return 'underscoreName'
  if (/^Mission$/.test(text)) return 'bareMission'
  if (/\b(?:Update|Hotfix|Version)\s*\d+/i.test(text)) return 'history'
  if (/\b(?:19|20)\d{2}\b/.test(text)) return 'history'
  if (/\b(?:originally|formerly|first\s+available|previously|returned|was|beginning\s+(?:with|in))\b/i.test(text)) return 'history'
  if (/\b[A-Za-z][\w/-]*\s*=|\{\||\|\}|\|\s*[^.]*\||\{\{|\}\}|\[\[|\]\]|<[^>]*>/.test(text)) return 'templateResidue'
  const reviewedConjunction = REVIEWED_CONJUNCTION_PHRASES.has(text) || REVIEWED_CONJUNCTION_PHRASES.has(`${text}.`)
  if (/^(?:although|but|and|which|while|however|though|so|or|then|except)\b/i.test(text) && !reviewedConjunction) return 'conjunctionStart'
  if (/^[a-z]/.test(text) && !REVIEWED_LOWERCASE_PHRASES.has(text)) return 'lowercaseStart'
  if (/^[A-Z][A-Za-z']+s?$/.test(text) && text.length < 14) return 'oneWordRow'
  return null
}

function violationSummary(label, violations) {
  const counts = new Map()
  for (const violation of violations) counts.set(violation.kind, (counts.get(violation.kind) || 0) + 1)
  const countText = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([kind, count]) => `${kind}=${count}`).join(', ') || 'none'
  const samples = violations.slice(0, 25).map((violation) => `${violation.name} [${violation.kind}]: ${String(violation.text || '').slice(0, 120)}`).join('\n')
  return `${label}: ${violations.length} violation(s); ${countText}${samples ? `\nFirst ${Math.min(25, violations.length)}:\n${samples}` : ''}`.slice(0, 4900)
}

function assertNoViolations(label, violations, scratchName = 'p36-audit-violations.json') {
  if (violations.length) {
    const scratchDir = path.join(auditRoot, 'scratch')
    fs.mkdirSync(scratchDir, { recursive: true })
    fs.writeFileSync(path.join(scratchDir, scratchName), JSON.stringify(violations, null, 2))
  }
  assert.ok(violations.length === 0, violationSummary(label, violations))
}

const BANNED_ROUTE_PHRASES = [
  ['no', 'acquisition', 'known'].join(' '),
  ['no', 'verified', 'acquisition', 'route'].join(' '),
  ['no', 'known', 'source'].join(' '),
  ['no', 'current', 'acquisition', 'route'].join(' '),
]

function containsBannedRoutePhrase(text) {
  const value = String(text || '').toLocaleLowerCase()
  return BANNED_ROUTE_PHRASES.some((phrase) => value.includes(phrase))
}

test('real data: every catalog acquisition source row is current and renderable', { skip: !haveRealData }, async () => {
  const harness = await loadRealHarness({ locale: 'en' })
  const { buildDropIndex } = await import(path.join(auditRoot, 'src/lib/dropsParser.js'))
  const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import(path.join(auditRoot, 'src/lib/acquisitionInfo.js'))
  const indexes = buildAllAcquisitionIndexes(harness.exportsBundle)
  const dropIndex = buildDropIndex(harness.exportsBundle)
  const violations = []

  for (const entry of catalogEntries(harness.exportsBundle)) {
    const displayName = harness.dict[entry.name] || entry.name
    const result = getAcquisitionInfo(
      entry.uniqueName, displayName, dropIndex, overrides,
      indexes.recipeResultIndex, indexes.marketIndex, indexes.bundleIndex, indexes.syndicateIndex,
      indexes.wikiSigilIndex, indexes.wikiVendorIndex, indexes.wikiTennoGenIndex, indexes.wikiBaroIndex,
      indexes.exportVendorIndex, indexes.alwaysAvailableIndex, indexes.glyphSupplementIndex,
      indexes.wikiBlueprintIndex, indexes.wikiResearchIndex, indexes.relicStateIndex,
      indexes.wikiResourceIndex, indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex,
      indexes.exaltedWeaponIndex, indexes.exportComponentIndex,
    )
    for (const source of result.sources || []) {
      const text = typeof source.text === 'string' ? source.text.trim() : ''
      if (!text) continue
      const kind = violationKind(text)
      if (!kind) continue
      const allowlistKey = `${entry.uniqueName}|${text}`
      if (!ALLOWED_VIOLATIONS.has(allowlistKey)) violations.push({ kind, name: displayName, uniqueName: entry.uniqueName, text })
    }
  }

  assertNoViolations('catalog acquisition violations', violations, 'p36-shape-violations.json')
})

test('real data: Grimoire routes keep their labels and formatted Standing amount', { skip: !haveRealData }, async () => {
  const harness = await loadRealHarness({ locale: 'en' })
  const { buildDropIndex } = await import(path.join(auditRoot, 'src/lib/dropsParser.js'))
  const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import(path.join(auditRoot, 'src/lib/acquisitionInfo.js'))
  const indexes = buildAllAcquisitionIndexes(harness.exportsBundle)
  const dropIndex = buildDropIndex(harness.exportsBundle)
  const acquire = (uniqueName, name) => getAcquisitionInfo(
    uniqueName, name, dropIndex, overrides,
    indexes.recipeResultIndex, indexes.marketIndex, indexes.bundleIndex, indexes.syndicateIndex,
    indexes.wikiSigilIndex, indexes.wikiVendorIndex, indexes.wikiTennoGenIndex, indexes.wikiBaroIndex,
    indexes.exportVendorIndex, indexes.alwaysAvailableIndex, indexes.glyphSupplementIndex,
    indexes.wikiBlueprintIndex, indexes.wikiResearchIndex, indexes.relicStateIndex,
    indexes.wikiResourceIndex, indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex,
    indexes.exaltedWeaponIndex, indexes.exportComponentIndex,
  )
  const grimoire = acquire('/Lotus/Weapons/Tenno/Grimoire/TnGrimoire', 'Grimoire')
  const blueprint = acquire('/Lotus/Types/Recipes/Weapons/TnGrimoireBlueprint', 'Grimoire Blueprint')
  assert.ok(grimoire.sources.some((source) => /Purchased from Bird 3.*50,000 Standing/i.test(source.text)))
  assert.ok(grimoire.sources.every((source) => !/^Blueprint:$|^or$/i.test(source.text)))
  assert.ok(blueprint.sources.some((source) => /Sold by Bird 3/i.test(source.text)))
})

const KNOWN_UNRESEARCHED = 1056 // Honest post-P39 count with verified-routes.json loaded; Phase 2 data should drive this to 0.

function canonicalRouteText(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function sourceRows(sources) {
  return (sources || []).flatMap((source) => source?.sources ? sourceRows(source.sources) : [source])
}

function hasPlace(source, sourceLabel) {
  if (source?.type === 'status') return true
  if (source?.placeLabel || sourceLabel?.(source)) return true
  return /\b(?:from|at|via|during|through|in|on|market|shop|vendor|reward(?:ed)?|relic|mission|enemy|defeat|scan|quest|invasion|dojo|lab|archon|netracell|circuit|void|bounty|cache|syndicate|acts|claim|nightwave|nora|amir|intrinsics?|drifter|mastery|trade)\b/i.test(source?.text || '')
}

const P40_STOP_WORD_PLACES = new Set(['page', 'names', 'this page', 'table', 'list', 'bundle', 'kavat', 'kubrow'])

function p40PlaceViolations(source) {
  const place = String(source?.placeLabel || '').trim()
  if (!place) return ['missingPlaceLabel']
  const lower = place.toLocaleLowerCase()
  const violations = []
  if (P40_STOP_WORD_PLACES.has(lower)) violations.push('stopWordPlace')
  if ((place.match(/\(/g) || []).length !== (place.match(/\)/g) || []).length) violations.push('unbalancedPlace')
  if (/[,(]\s*$/.test(place)) violations.push('cutoffPlace')
  if (/ - (?:Kavat|Kubrow) color\/pattern/i.test(place)) violations.push('patternPlaceResidue')
  return violations
}

test('real data: P36 route contract holds for every catalog drawer', { skip: !haveRealData }, async () => {
  const harness = await loadRealHarness({ locale: 'en' })
  const { buildDropIndex } = await import(path.join(auditRoot, 'src/lib/dropsParser.js'))
  const acquisitionModule = await import(path.join(auditRoot, 'src/lib/acquisitionInfo.js'))
  const { buildAllAcquisitionIndexes, getAcquisitionInfo, getAcquisitionAuditStats } = acquisitionModule
  const isAcquisitionFact = acquisitionModule.isAcquisitionFact || p41AcquisitionFact
  let sourceLabel = null
  try { sourceLabel = (await import(path.join(auditRoot, 'src/lib/sourceLabel.js'))).sourceLabel } catch {}
  const indexes = buildAllAcquisitionIndexes(harness.exportsBundle)
  const dropIndex = buildDropIndex(harness.exportsBundle)
  const violations = []
  const baselineUnresearched = []
  let unresearched = 0
  for (const entry of catalogEntries(harness.exportsBundle)) {
    const displayName = harness.dict[entry.name] || entry.name
    const result = getAcquisitionInfo(
      entry.uniqueName, displayName, dropIndex, overrides,
      indexes.recipeResultIndex, indexes.marketIndex, indexes.bundleIndex, indexes.syndicateIndex,
      indexes.wikiSigilIndex, indexes.wikiVendorIndex, indexes.wikiTennoGenIndex, indexes.wikiBaroIndex,
      indexes.exportVendorIndex, indexes.alwaysAvailableIndex, indexes.glyphSupplementIndex,
      indexes.wikiBlueprintIndex, indexes.wikiResearchIndex, indexes.relicStateIndex,
      indexes.wikiResourceIndex, indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex,
      indexes.exaltedWeaponIndex, indexes.exportComponentIndex,
    )
    const rows = sourceRows(result.sources)
    const isUnresearched = rows.some((source) => source?.type === 'unresearched')
    if (isUnresearched) {
      unresearched += 1
      if (HAS_ROUTE_BASELINE.has(entry.uniqueName)) baselineUnresearched.push(displayName)
    }
    const seen = []
    for (const source of rows) {
      if (!source || source.type === 'unresearched') continue
      const text = String(source.text || '').trim()
      if (!text && source.type !== 'status') continue
      if (!hasPlace(source, sourceLabel)) violations.push({ kind: 'missingPlace', name: displayName, uniqueName: entry.uniqueName, text })
      for (const kind of p40PlaceViolations(source)) violations.push({ kind, name: displayName, uniqueName: entry.uniqueName, text: `${source.placeLabel || ''} | ${text}` })
      if (text.length > 300) violations.push({ kind: 'longRow', name: displayName, uniqueName: entry.uniqueName, text })
      if (/±|\d+\.\d+%\s+\d/.test(text)) violations.push({ kind: 'flattenedTable', name: displayName, uniqueName: entry.uniqueName, text })
      if (source.type !== 'legacy-fallback' && !/^Warframe Wiki\b/i.test(source.source || '') && text && !isAcquisitionFact(text)) violations.push({ kind: 'noAcquisitionSignal', name: displayName, uniqueName: entry.uniqueName, text })
      if (source.type !== 'legacy-fallback' && /^(?:Once\b|For details\b|Note\b|The names\b|Please\b|See\b)/i.test(text)) violations.push({ kind: 'loreRow', name: displayName, uniqueName: entry.uniqueName, text })
      const key = canonicalRouteText(text)
      if (key && seen.some((prior) => prior === key || prior.includes(key) || key.includes(prior))) violations.push({ kind: 'duplicateRoute', name: displayName, uniqueName: entry.uniqueName, text })
      if (key) seen.push(key)
      if (/\b(?:Platinum|Credits|Standing)\s+[A-Z][a-z]+/.test(text)) violations.push({ kind: 'runOn', name: displayName, uniqueName: entry.uniqueName, text })
      if (containsBannedRoutePhrase(text)) violations.push({ kind: 'bannedPhrase', name: displayName, uniqueName: entry.uniqueName, text })
    }
    for (const group of (result.sources || []).filter((source) => source?.type?.endsWith?.('-group') && source.sources?.length)) {
      const first = canonicalRouteText(group.sources[0]?.text)
      if (first && group.sources.slice(1).some((source) => canonicalRouteText(source.text) === first)) violations.push({ kind: 'repeatedGroupFirstRow', name: displayName, uniqueName: entry.uniqueName, text: group.sources[0].text })
    }
  }
  console.log(`P39 catalog audit: unresearched=${unresearched}; baseline-routed=${HAS_ROUTE_BASELINE.size}; violations=${violations.length}`)
  assert.ok(
    baselineUnresearched.length === 0,
    `pre-P36 routed entries became unresearched: ${baselineUnresearched.length}; first 25: ${baselineUnresearched.slice(0, 25).join(', ')}`,
  )
  assert.ok(unresearched <= KNOWN_UNRESEARCHED, `unresearched entries increased: ${unresearched} > ${KNOWN_UNRESEARCHED}`)
  assertNoViolations('P36 catalog violations', violations)
  const auditStats = getAcquisitionAuditStats()
  assert.ok(auditStats.rowsSplit >= 0)
  assert.ok(auditStats.rowsDroppedNonAcquisition >= 0)
  assert.ok(auditStats.labelsRepaired >= 0)
})

test('P36 audit summaries stay bounded for large violation lists', () => {
  const violations = Array.from({ length: 100000 }, (_, index) => ({
    kind: 'longRow',
    name: `Item ${index}`,
    text: 'x'.repeat(1000),
  }))
  assert.ok(violationSummary('bounded', violations).length < 5000)
})

test('P36 optional verified routes use the same normalized rows', async () => {
  const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import(path.join(auditRoot, 'src/lib/acquisitionInfo.js'))
  const indexes = buildAllAcquisitionIndexes({
    VerifiedRoutes: {
      '/Synthetic/VerifiedItem': {
        routes: [{
          kind: 'vendor',
          text: 'Purchase this item from the synthetic vendor.',
          place: 'Synthetic vendor',
          source: { url: 'https://wiki.warframe.com/w/Synthetic', revid: 1, quote: 'Purchase this item from the synthetic vendor.' },
        }],
      },
    },
  })
  const result = getAcquisitionInfo(
    '/Synthetic/VerifiedItem', 'Synthetic Verified Item', null, {},
    indexes.recipeResultIndex, indexes.marketIndex, indexes.bundleIndex, indexes.syndicateIndex,
    indexes.wikiSigilIndex, indexes.wikiVendorIndex, indexes.wikiTennoGenIndex, indexes.wikiBaroIndex,
    indexes.exportVendorIndex, indexes.alwaysAvailableIndex, indexes.glyphSupplementIndex,
    indexes.wikiBlueprintIndex, indexes.wikiResearchIndex, indexes.relicStateIndex,
    indexes.wikiResourceIndex, indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex,
    indexes.exaltedWeaponIndex, indexes.exportComponentIndex,
  )
  assert.equal(result.sources.length, 1)
  assert.equal(result.sources[0].placeLabel, 'Synthetic vendor')
  assert.match(result.sources[0].text, /synthetic vendor/i)
})

test('P39 real verified routes are all loaded and normalized', { skip: !haveRealData }, async () => {
  const harness = await loadRealHarness({ locale: 'en' })
  const { buildDropIndex } = await import(path.join(auditRoot, 'src/lib/dropsParser.js'))
  const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import(path.join(auditRoot, 'src/lib/acquisitionInfo.js'))
  const indexes = buildAllAcquisitionIndexes(harness.exportsBundle)
  const dropIndex = buildDropIndex(harness.exportsBundle)
  const verified = harness.exportsBundle.VerifiedRoutes || {}
  let rawRoutes = 0
  let normalizedRoutes = 0
  for (const [uniqueName, entry] of Object.entries(verified)) {
    rawRoutes += entry.routes.length
    const result = getAcquisitionInfo(
      uniqueName, entry.name || uniqueName.split('/').pop(), dropIndex, overrides,
      indexes.recipeResultIndex, indexes.marketIndex, indexes.bundleIndex, indexes.syndicateIndex,
      indexes.wikiSigilIndex, indexes.wikiVendorIndex, indexes.wikiTennoGenIndex, indexes.wikiBaroIndex,
      indexes.exportVendorIndex, indexes.alwaysAvailableIndex, indexes.glyphSupplementIndex,
      indexes.wikiBlueprintIndex, indexes.wikiResearchIndex, indexes.relicStateIndex,
      indexes.wikiResourceIndex, indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex,
      indexes.exaltedWeaponIndex, indexes.exportComponentIndex,
    )
    normalizedRoutes += sourceRows(result.sources).filter((source) => source.type !== 'unresearched').length
  }
  console.log(`P39 verified routes: entries=${Object.keys(verified).length}; raw=${rawRoutes}; normalized=${normalizedRoutes}`)
  // The expected counts come from the data file itself, never from constants: the research data grows.
  const fileData = JSON.parse(fs.readFileSync(path.join(auditRoot, 'src-tauri/data/assets/data/verified-routes.json'), 'utf8'))
  assert.equal(Object.keys(verified).length, Object.keys(fileData).length)
  assert.equal(rawRoutes, Object.values(fileData).reduce((sum, entry) => sum + entry.routes.length, 0))
  assert.equal(normalizedRoutes, rawRoutes)
})

test('P36 normalizer handles the reported route strings', async () => {
  const { normalizeAcquisitionRoutes } = await import(path.join(auditRoot, 'src/lib/acquisitionInfo.js'))
  const forma = normalizeAcquisitionRoutes([{
    type: 'non-drop',
    text: "Purchased blueprint from Acrithis's shop for 10 Pathos Clamps. Found very rarely in Rare or Reinforced Storage Containers in Zariman Ten Zero, Void, and Lua. Purchased complete from the Market for 20 Platinum Purchased complete from the Market as a three-Forma bundle for 35 Platinum.",
  }], { itemName: 'Forma Blueprint' })
  assert.equal(forma.length, 4)
  assert.ok(forma.some((row) => /20 Platinum\./.test(row.text)))
  assert.ok(forma.some((row) => /three-Forma bundle/.test(row.text)))

  const arbucep = normalizeAcquisitionRoutes([
    { type: 'mission', objectiveName: 'Nokko: Critter Liberation Rewards', rotation: 'B', rarity: 'Rare' },
    { type: 'mission', objectiveName: 'Nokko: Critter Liberation Rewards', rotation: 'C', rarity: 'Uncommon' },
  ], { itemName: 'Arbucep Receiver' })
  assert.deepEqual(arbucep.map((row) => row.placeLabel), [
    'Nokko: Critter Liberation Rewards — Rot B — Rare',
    'Nokko: Critter Liberation Rewards — Rot C — Uncommon',
  ])

  const archon = normalizeAcquisitionRoutes([{
    type: 'non-drop',
    text: '5 31 ± 10 52.5% 1 – 2 9 ± 3 12.5% 8 52 ± 17 Deep Archimedea Uncommon Reward Pool 52.',
  }], { itemName: 'Amber Archon Shard' })
  assert.equal(archon.filter((row) => /±|\d+\.\d+%\s+\d/.test(row.text)).length, 0)

  const latron = normalizeAcquisitionRoutes([
    { type: 'override', text: 'They can now be found as an Invasion reward.' },
    { type: 'override', text: 'All components can be traded, although players must have a Mastery Rank of at least 7 to acquire the blueprint.' },
  ], { itemName: 'Latron Wraith' })
  assert.equal(latron.length, 2)
  assert.ok(latron[1].placeLabel)
  assert.match(latron[1].text, /All components can be traded/)

  const realEvidence = [
    ['Drops from: Nightmare Mode Missions (18.97%).', 'Nightmare Mode Missions', 0.1897],
    ['Drops from: Jupiter Disruption (10%).', 'Jupiter Disruption', 0.1],
    ['Drops from: Annihilation (Conclave) (2.48%); Cephalon Capture (Conclave) (2.48%).', 'Annihilation (Conclave)', 0.0248],
    ['Cephalon Simaris (Sanctuary - Standing).', 'Cephalon Simaris (Sanctuary - Standing)', null],
    ['Railjack & Archwing Mission Rewards.', 'Railjack & Archwing Mission Rewards', null],
    ['Drops from: Nightmare Mode Rescue (18.97%).', 'Nightmare Mode Rescue', 0.1897],
  ]
  for (const [text, place, chance] of realEvidence) {
    const rows = normalizeAcquisitionRoutes([{ type: 'override', text }], { itemName: 'real evidence' })
    assert.ok(rows.length >= 1)
    assert.ok(rows.some((row) => row.placeLabel === place))
    if (chance != null) assert.ok(rows.some((row) => Math.abs(row.chance - chance) < 0.0000001))
  }
})

test('P40 normalizer repairs pattern-table wording and removes lore rows', async () => {
  const { normalizeAcquisitionRoutes } = await import(path.join(auditRoot, 'src/lib/acquisitionInfo.js'))
  const cases = [
    ['Included in the Atrox (Credits 150,000 + Ducats 285) - Kubrow color/pattern.', 'Atrox', 'Sold for 150,000 Credits and 285 Ducats.'],
    ['Included in the Kexat Medical Debt-Bond 12 (seasonal, part of Star Days ) - Kavat color/pattern.', 'Kexat Medical Debt-Bond 12', 'Available seasonally during Star Days.'],
    ['Included in the Nesyr (Platinum 55) - Kavat color/pattern.', 'Nesyr', 'Sold for 55 Platinum.'],
    ['Included in the Underbrush (purchase from Master Teasonai ) - Kubrow color/pattern.', 'Master Teasonai', 'Bought from Master Teasonai.'],
    ['Included in the Moonless (Bought from Master Teasonai, Cetus ) - Kavat color/pattern.', 'Master Teasonai', 'Bought from Master Teasonai.'],
  ]
  for (const [text, place, expected] of cases) {
    const rows = normalizeAcquisitionRoutes([{ type: 'override', text, placeLabel: text.slice(14, 25) }], { itemName: 'pattern' })
    assert.equal(rows.length, 1)
    assert.equal(rows[0].placeLabel, place)
    assert.equal(rows[0].text, expected)
  }
  const rows = normalizeAcquisitionRoutes([
    { type: 'override', text: 'Once hatched, Kavats randomly gain four coat colors.', placeLabel: 'Kavat' },
    { type: 'override', text: "Currently, all of a Kavat's natural coat colors can also be found in the Gene-Masking Kits, which can be acquired through the Market.", placeLabel: 'the Gene-Masking Kits' },
    { type: 'override', text: 'For details regarding how patterns are passed down, please refer to this page.', placeLabel: 'page' },
    { type: 'override', text: 'The names listed below are unofficial.', placeLabel: 'names' },
  ], { itemName: 'Hyacinth Fur Pattern' })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].placeLabel, 'Market')
  assert.match(rows[0].text, /acquired through the Market/)
})

test('P40 places never fall back to a random word', async () => {
  const { normalizeAcquisitionRoutes } = await import(path.join(auditRoot, 'src/lib/acquisitionInfo.js'))
  const rows = normalizeAcquisitionRoutes([
    { type: 'override', text: 'This item is useful in many ways.' },
    { type: 'override', text: 'Obtained from the named vendor for 5 Platinum.' },
  ], { itemName: 'Named Cosmetic' })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].placeLabel, 'named vendor')
})

function routeRows(sources) {
  return (sources || []).flatMap((source) => source?.sources ? routeRows(source.sources) : [source])
}

function routeCanonicalText(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function p41AcquisitionFact(value) {
  const text = String(value || '').trim()
  if (/^No player-facing acquisition route\b/i.test(text)) return true
  if (/\b(?:not|never|no longer)\s+(?:offered|available|sold|obtainable)\b/i.test(text)
    && !/^Vaulted\b/i.test(text)
    && !/^Not\s+(?:currently\s+)?obtainable\b/i.test(text)) return false
  return /\b(?:prime\s+resurgence|prime\s+access|sells?|offers?|gives?|awarded|rewarded|granted|given|unlocked|earned|claimed|dropped|found|crafted|built|researched|purchased|purchasing|purchase|bought|obtained|acquired|received|delivered|vanquished|defeated|traded|price|standing|amount|bundle|pack|collection|market|nightwave|syndicates?|bounty|mission|relic|dojo|invasions?)\b|\b\d[\d,]*(?:\.\d+)?\s*(?:platinum|credits|ducats|standing|aya|regal\s+aya|clamps?)\b/i.test(text)
}

function routeFactPieces(text, split, isFact) {
  const pieces = split(text)
  return (pieces.length ? pieces : [text]).filter((piece) => piece && isFact(piece))
}

function factPreserved(preText, currentRows, split, isFact) {
  if (/^No player-facing acquisition route\b/i.test(preText)) {
    return currentRows.some((row) => /^Not obtainable by players\.?$/i.test(String(row.text || '').trim()))
  }
  const pattern = preText.match(/^Included in the\s+(.+?)\s+\(/i)
  if (pattern && /-\s+(?:Kavat|Kubrow)\s+color\/pattern\.?$/i.test(preText)) {
    const details = preText.match(/\((.*)\)\s+-\s+(?:Kavat|Kubrow)\s+color\/pattern\.?$/i)?.[1] || ''
    const vendor = details.match(/\b(?:from|by)\s+([A-Z][A-Za-z'’ -]+)/i)?.[1]?.trim()
    const wantedPlace = routeCanonicalText(vendor || pattern[1])
    return currentRows.some((row) => routeCanonicalText(row.placeLabel).startsWith(wantedPlace))
  }
  return routeFactPieces(preText, split, isFact).every((piece) => {
    const wanted = routeCanonicalText(piece)
    return currentRows.some((row) => {
      const actual = routeCanonicalText(row.text)
      return actual === wanted || actual.includes(wanted) || wanted.includes(actual)
    })
  })
}

test('P41 ratchet: every pre-P40 acquisition fact remains present', { skip: !process.env.P41_PRE_P40_REPO }, async () => {
  const harness = await loadRealHarness({ locale: 'en' })
  const { buildDropIndex } = await import(path.join(auditRoot, 'src/lib/dropsParser.js'))
  const current = await import(path.join(auditRoot, 'src/lib/acquisitionInfo.js'))
  const preRoot = path.resolve(process.env.P41_PRE_P40_REPO)
  const pre = await import(pathToFileURL(path.join(preRoot, 'src/lib/acquisitionInfo.js')).href)
  const preDrops = await import(pathToFileURL(path.join(preRoot, 'src/lib/dropsParser.js')).href)
  const overrides = JSON.parse(fs.readFileSync(path.join(auditRoot, 'src-tauri/data/assets/data/acquisition_overrides.json'), 'utf8'))
  const currentIndexes = current.buildAllAcquisitionIndexes(harness.exportsBundle)
  const preIndexes = pre.buildAllAcquisitionIndexes(harness.exportsBundle)
  const currentDropIndex = buildDropIndex(harness.exportsBundle)
  const preDropIndex = preDrops.buildDropIndex(harness.exportsBundle)
  const failures = []
  const isFact = current.isAcquisitionFact || p41AcquisitionFact
  let preFactRows = 0
  let preservedFactRows = 0
  let currentRows = 0

  const acquire = (module, indexes, dropIndex, uniqueName, displayName) => module.getAcquisitionInfo(
    uniqueName, displayName, dropIndex, overrides,
    indexes.recipeResultIndex, indexes.marketIndex, indexes.bundleIndex, indexes.syndicateIndex,
    indexes.wikiSigilIndex, indexes.wikiVendorIndex, indexes.wikiTennoGenIndex, indexes.wikiBaroIndex,
    indexes.exportVendorIndex, indexes.alwaysAvailableIndex, indexes.glyphSupplementIndex,
    indexes.wikiBlueprintIndex, indexes.wikiResearchIndex, indexes.relicStateIndex,
    indexes.wikiResourceIndex, indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex,
    indexes.exaltedWeaponIndex, indexes.exportComponentIndex,
  )

  for (const entry of catalogEntries(harness.exportsBundle)) {
    const displayName = harness.dict[entry.name] || entry.name
    const preRows = routeRows(acquire(pre, preIndexes, preDropIndex, entry.uniqueName, displayName).sources)
    const currentRowsForEntry = routeRows(acquire(current, currentIndexes, currentDropIndex, entry.uniqueName, displayName).sources)
    currentRows += currentRowsForEntry.length
    for (const row of preRows) {
      const text = String(row?.text || '').trim()
      if (!text || !isFact(text)) continue
      preFactRows += 1
      if (factPreserved(text, currentRowsForEntry, current.splitAcquisitionRouteText, isFact)) preservedFactRows += 1
      else if (failures.length < 25) failures.push({ name: displayName, uniqueName: entry.uniqueName, text })
    }
  }

  const scratchDir = path.join(auditRoot, 'scratch')
  fs.mkdirSync(scratchDir, { recursive: true })
  fs.writeFileSync(path.join(scratchDir, 'p41-ratchet-failures.json'), JSON.stringify(failures, null, 2))
  console.log(`P41 ratchet: pre-P40 acquisition rows=${preFactRows}; preserved=${preservedFactRows}; current rows=${currentRows}; failures=${failures.length}`)
  assert.ok(failures.length === 0, `P41 fact loss: ${failures.length}; first ${failures.slice(0, 25).map((failure) => `${failure.name}: ${failure.text.slice(0, 120)}`).join(' | ')}`)
})
