import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const preRoot = process.env.P39_PRE_ROOT || '/tmp/pre-p36'
const headRoot = process.env.P39_HEAD_ROOT || '/tmp/p39-head'
const importFrom = (repo, relative) => import(pathToFileURL(path.join(repo, relative)).href)

function rowsOf(sources) {
  return (sources || []).flatMap((source) => source?.sources ? rowsOf(source.sources) : source ? [source] : [])
}

function renderRows(rows, sourceLabel) {
  const rendered = rowsOf(rows).filter((row) => row.type !== 'unresearched').map((row) => {
    const place = row.placeLabel || sourceLabel(row) || ''
    const chance = typeof row.chance === 'number' ? ` chance=${row.chance}` : ''
    const text = String(row.text || '').replace(/\s+/g, ' ').trim() || place
    return `${row.type || 'row'}${chance} place=${place} text=${text}`
  })
  return rendered.length > 8 ? [...rendered.slice(0, 8), `... ${rendered.length - 8} more rows`] : rendered
}

async function loadSide(repo, harnessModule) {
  const harness = await harnessModule.loadRealHarness({ locale: 'en' })
  const info = await importFrom(repo, 'src/lib/acquisitionInfo.js')
  const drops = await importFrom(repo, 'src/lib/dropsParser.js')
  let labels
  try {
    labels = await importFrom(repo, 'src/lib/sourceLabel.js')
  } catch {
    labels = { sourceLabel: (row) => row?.placeLabel || row?.location || row?.text || '' }
  }
  const indexes = info.buildAllAcquisitionIndexes(harness.exportsBundle)
  const dropIndex = drops.buildDropIndex(harness.exportsBundle)
  const overrides = JSON.parse(fs.readFileSync(path.join(repo, 'src-tauri/data/assets/data/acquisition_overrides.json'), 'utf8'))
  return { harness, info, labels, indexes, dropIndex, overrides }
}

function acquire(side, uniqueName, name) {
  const i = side.indexes
  return side.info.getAcquisitionInfo(
    uniqueName, name, side.dropIndex, side.overrides,
    i.recipeResultIndex, i.marketIndex, i.bundleIndex, i.syndicateIndex,
    i.wikiSigilIndex, i.wikiVendorIndex, i.wikiTennoGenIndex, i.wikiBaroIndex,
    i.exportVendorIndex, i.alwaysAvailableIndex, i.glyphSupplementIndex,
    i.wikiBlueprintIndex, i.wikiResearchIndex, i.relicStateIndex,
    i.wikiResourceIndex, i.wikiPageAcquisitionIndex, i.wikiAcquisitionStatusIndex,
    i.exaltedWeaponIndex, i.exportComponentIndex,
  )
}

const currentHarnessModule = await import('./lib/real-data-harness.mjs')
const headHarnessModule = await importFrom(headRoot, 'scripts/lib/real-data-harness.mjs')
const preHarnessModule = await importFrom(preRoot, 'scripts/lib/real-data-harness.mjs')
const [current, head, pre] = await Promise.all([
  loadSide(root, currentHarnessModule),
  loadSide(headRoot, headHarnessModule),
  loadSide(preRoot, preHarnessModule),
])

const samples = [
  ['Accelerated Blast', '/Lotus/Upgrades/Mods/Shotgun/DualStat/AcceleratedBlastMod'],
  ['Aero Agility', '/Lotus/Upgrades/Mods/Sets/Hawk/HawkModB'],
  ['Adrenaline Boost', '/Lotus/Upgrades/Mods/PvPMods/Warframe/MoreEnergyLessHealthMod'],
  ['Afterburner', '/Lotus/Powersuits/Archwing/DemolitionJetPack/ExhaustTrailAugmentCard'],
  ['Amalgam Barrel Diffusion', '/Lotus/Upgrades/Mods/DualSource/Pistol/MultishotDodgeMod'],
  ['Battering Maneuver', '/Lotus/Upgrades/Mods/Warframe/ImpactParkourTwoMod'],
  ['Brief Respite', '/Lotus/Upgrades/Mods/Aura/FairyQuest/FairyQuestAbilityToShieldsAuraMod'],
  ['Cunning Drift', '/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModCunning'],
  ['Power Drift', '/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModPower'],
  ['Wisp Graxx Skin', '/Lotus/Upgrades/Skins/Wisp/SWWispGraxxSkin'],
  ['Udyat Syandana', '/Lotus/Characters/Tenno/Accessory/Scarves/U17IntermScarf/U17IntermScarfItem'],
  ['Zauba Pauldrons', '/Lotus/Upgrades/Skins/Operator/Armour/Mage/MageArmourArms'],
  ['Blazing Step Ephemera', '/Lotus/Upgrades/Skins/Effects/FootstepsHeat'],
  ['Striped Fur Pattern', '/Lotus/Types/Game/KubrowPet/Patterns/KubrowPetPatternA'],
  ['Bile', '/Lotus/Types/Items/InfestedFoundry/HelminthBile'],
  ['Biotics', '/Lotus/Types/Items/InfestedFoundry/HelminthBiotics'],
  ['Calx', '/Lotus/Types/Items/InfestedFoundry/HelminthCalx'],
  ["Amir's Shockwave Cred", '/Lotus/Types/Items/MiscItems/NoraIntermissionSixteenCreds'],
  ['Running Late', '/Lotus/Types/Items/SongItems/NightwaveRunningLateSongItem'],
  ['Skana Prime', '/Lotus/Weapons/Tenno/Melee/LongSword/SkanaPrime'],
  ['Excalibur Prime', '/Lotus/Powersuits/Excalibur/ExcaliburPrime'],
  ['Latron Wraith', '/Lotus/Weapons/Tenno/LongGuns/WraithLatron/WraithLatron'],
  ['Forma', '/Lotus/Types/Items/MiscItems/Forma'],
  ['Forma Blueprint', null],
  ['Arbucep Receiver', '/Lotus/Types/Recipes/Weapons/WeaponParts/NokkoArchGunReceiverItem'],
]

for (const sample of samples) {
  if (!sample[1]) {
    sample[1] = current.indexes.recipeResultIndex.blueprintResultIndex.values().find((entry) => /\/Forma$/.test(entry.resultType || ''))?.blueprintUniqueName
  }
  console.log(`SAMPLE ${sample[0]}`)
  for (const [label, side] of [['before', head], ['after', current], ['pre-P36', pre]]) {
    const result = acquire(side, sample[1], sample[0])
    console.log(`${label}: ${JSON.stringify(renderRows(result.sources, side.labels.sourceLabel))}`)
  }
}

const verified = current.harness.exportsBundle.VerifiedRoutes || {}
const verifiedNames = Object.keys(verified).sort().slice(0, 10)
for (const uniqueName of verifiedNames) {
  const raw = (verified[uniqueName].routes || []).map((route) => route.text)
  const result = acquire(current, uniqueName, uniqueName.split('/').pop())
  console.log(`VERIFIED ${uniqueName}`)
  console.log(`before: ${JSON.stringify(raw)}`)
  console.log(`after: ${JSON.stringify(renderRows(result.sources, current.labels.sourceLabel))}`)
}
