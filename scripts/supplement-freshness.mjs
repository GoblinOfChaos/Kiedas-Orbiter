#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const DEFAULT_CACHE = process.env.KIEDAS_DE_EXPORT_CACHE || '/home/jedwards/.cache/kiedas-de-export'
const DEFAULT_DATA = path.join(ROOT, 'src-tauri/data/assets/data')

const DE_CATEGORIES = ['ExportWarframes', 'ExportWeapons', 'ExportCustoms', 'ExportUpgrades', 'ExportRecipes', 'ExportRelicArcane', 'ExportResources', 'ExportFlavour', 'ExportGear', 'ExportSentinels']
const ACQUISITION_CATEGORIES = ['ExportWarframes', 'ExportWeapons', 'ExportUpgrades', 'ExportRelicArcane', 'ExportGear', 'ExportSentinels']
const DECORATION_PARENTS = new Set([
  '/Lotus/Types/Items/ShipDecos/ShipDecoItem',
  '/Lotus/Types/Items/ShipDecos/BaseFishTrophy',
  '/Lotus/Types/Items/ShipDecos/ChildDrawingBase',
  '/Lotus/Types/Items/ShipDecos/LotusShawzinPlayableBase',
  '/Lotus/Types/Items/ShipDecos/Plushies/PlushyThumper',
  '/Lotus/Types/Items/ShipDecos/Vignettes/Enemies/ShipDecoItem',
  '/Lotus/Types/Items/ShipDecos/InstrumentDecoItem',
  '/Lotus/Types/Items/ShipDecorationLayerItem',
])
const FULL_CATALOG_RESOURCE_PARENTS = new Set([
  '/Lotus/Types/Items/Fish/FishItem', '/Lotus/Types/Items/Fish/FishPartItem',
  '/Lotus/Types/Items/MiscItems/ResourceItem', '/Lotus/Types/Items/Gems/GemItem',
  '/Lotus/Types/Items/MiscItems/IncarnonAdapters/BaseIncarnonUnlocker',
  '/Lotus/Types/Gameplay/Duviri/Resource/DuviriBaseResourceItem',
  '/Lotus/Types/Items/RailjackMiscItems/BaseRailjackItem',
  '/Lotus/Types/Items/Plants/MiscItems/PlantItem', '/Lotus/Types/Items/MiscItems/FocusLens',
])
const PRIME_PART_PATH_RE = /Prime.*?(Barrel|Receiver|Stock|Blade|Handle|Link|Gauntlet|Head|Helmet|Disc|Grip|Boot|Chain|String|UpperLimb|LowerLimb|Carapace|Cerebrum|Systems|Chassis|Neuroptics|Guard|Hilt|Ornament|Stars|Holster|Pouch|Band|Blueprint)(Component)?$/i
const FOLDER_OVERRIDES = new Set(['Alchemist', 'AntiMatter', 'Bard', 'Berserker', 'Brawler', 'BrokenFrame', 'Choir', 'ConcreteFrame', 'Cowgirl', 'DemonFrame', 'Devourer', 'Dragon', 'Fairy', 'Frumentarius', 'Geode', 'Glass', 'Harlequin', 'Hoplite', 'Infestation', 'Inkblot', 'IronFrame', 'Jade', 'Magician', 'MonkeyKing', 'Necro', 'Ninja', 'Odalisk', 'Oraxia', 'Pacifist', 'Pagemaster', 'Paladin', 'PaxDuviricus', 'Pirate', 'Priest', 'Ranger', 'Runner', 'Sandman', 'Sentient', 'SiriusOrion', 'Temple', 'Tengu', 'Trapper', 'Werewolf', 'Wraith', 'YinYang'])
const LANDING_CRAFT = ['DefaultShip', 'ScimitarShip', 'MantisShip', 'XiphosShip', 'ZarimanShip', 'GrineerShip', 'NoraShip']
const AYATAN = ['OroFusexA', 'OroFusexB', 'OroFusexC', 'OroFusexD', 'OroFusexE', 'OroFusexF', 'OroFusexG', 'OroFusexH', 'OroFusexI', 'OroFusexJ', 'OroFusexEntrati']
const MASTERY_CATEGORIES = ['warframes', 'primary', 'secondary', 'melee', 'kitgunChambers', 'zawStrikes', 'amps', 'sentinels', 'companion_weapons', 'moaHeads', 'houndHeads', 'beasts', 'archwings', 'archweapons', 'necramechs', 'plexus', 'kdrives']
const WEAPON_BUCKETS = { LongGuns: 'primary', Pistols: 'secondary', Melee: 'melee' }

const readJson = (file) => fs.readFile(file, 'utf8').then(JSON.parse)
const asRecords = (value, category) => {
  if (Array.isArray(value)) return value.map((record) => [record.uniqueName || record.ItemType, record]).filter(([key]) => key)
  if (value?.[category]) return asRecords(value[category], category)
  return Object.entries(value || {}).map(([key, record]) => [record?.uniqueName || record?.ItemType || key, record]).filter(([key]) => key)
}
const canonical = (value) => String(value || '').replace('/StoreItems/', '/')
const display = (record, key) => record?.name || record?.Name || key
const names = (entries) => entries.map(([key, record]) => `${key} (${display(record, key)})`).sort()
const absent = (source, target) => target.filter(([key]) => !source.has(canonical(key)))
const setOf = (entries) => new Set(entries.map(([key]) => canonical(key)))
const flatten = (de, categories = DE_CATEGORIES) => categories.flatMap((category) => asRecords(de[category], category))

function supplementSet(data, keyMap) {
  return setOf(Object.entries(data).filter(([key]) => key !== '_comment').map(([key, value]) => [keyMap?.(key, value) || key, value]))
}

export function analyze({ de, curated }) {
  const all = flatten(de)
  const allByKey = new Map(all.map(([key, record]) => [canonical(key), [key, record]]))
  const result = {}
  result['warframe-items-acquisition.json'] = names(absent(supplementSet(curated.acquisition), flatten(de, ACQUISITION_CATEGORIES)))

  const relicRecords = asRecords(de.ExportRelicArcane, 'ExportRelicArcane')
  const dePrimeRewards = new Map()
  for (const [, record] of relicRecords) {
    for (const reward of record?.relicRewards || record?.rewards || record?.Rewards || record?.items || []) {
      const key = reward?.type || reward?.rewardItem || reward?.uniqueName || reward?.rewardName
      if (key && /Prime/i.test(key)) dePrimeRewards.set(canonical(key), [key, reward])
    }
  }
  const wikiRelicKeys = new Set(Object.keys(curated.relics))
  result['wiki-prime-relic-drops.json'] = names([...dePrimeRewards].filter(([key]) => ![...wikiRelicKeys].some((name) => name.toLowerCase().includes(String(key).split('/').pop().toLowerCase()))))

  const customs = asRecords(de.ExportCustoms, 'ExportCustoms')
  const resources = asRecords(de.ExportResources, 'ExportResources')
  const flavours = asRecords(de.ExportFlavour, 'ExportFlavour')
  const cosmeticDe = [...customs, ...resources.filter(([, r]) => DECORATION_PARENTS.has(r?.parentName)), ...flavours.filter(([key]) => key.startsWith('/Lotus/Types/Items/Emotes/'))]
  result['cosmetic-catalog-additions.json'] = names(absent(supplementSet(curated.cosmetics), cosmeticDe))
  result['decorationParents/emote prefix'] = names([
    ...resources.filter(([key, record]) => /\/ShipDecos?\//i.test(key) && !DECORATION_PARENTS.has(record?.parentName)),
    ...flavours.filter(([key]) => /\/Emotes?\//i.test(key) && !key.startsWith('/Lotus/Types/Items/Emotes/')),
  ])

  const mods = asRecords(de.ExportUpgrades, 'ExportUpgrades').filter(([, record]) => record?.upgradeEntries || record?.fusionLimit !== undefined || /Mod/i.test(record?.parentName || ''))
  result['mod-icon-map.json'] = names(absent(supplementSet(curated.modIcons), mods))

  const authoritative = Object.keys(curated.authoritativeIcons)
  result.AUTHORITATIVE_ITEM_ICONS = authoritative.filter((key) => !allByKey.has(canonical(key)))
  const warframeFolders = new Set(asRecords(de.ExportWarframes, 'ExportWarframes').map(([key]) => key.match(/^\/Lotus\/Powersuits\/([^/]+)\//)?.[1]).filter(Boolean))
  result.FOLDER_OVERRIDES = [...warframeFolders].filter((folder) => !FOLDER_OVERRIDES.has(folder)).sort()

  const recipes = asRecords(de.ExportRecipes, 'ExportRecipes')
  const recipeComponents = recipes.flatMap(([, recipe]) => recipe?.ingredients || recipe?.components || []).map((component) => component?.ItemType || component?.type || component?.uniqueName).filter(Boolean)
  result.PRIME_PART_PATH_RE = [...new Set(recipeComponents.filter((key) => /Prime/i.test(key) && !PRIME_PART_PATH_RE.test(String(key).split('/').pop())))].sort()

  const landingDe = all.filter(([key]) => /\/Ships\//i.test(key) || /Ship$/i.test(key))
  result['landing craft hard-coded list'] = LANDING_CRAFT.filter((leaf) => !landingDe.some(([key]) => key.includes(leaf)))
  const ayatanDe = all.filter(([key]) => /OroFusex/i.test(key))
  result['Ayatan hard-coded list'] = AYATAN.filter((leaf) => !ayatanDe.some(([key]) => key.includes(leaf)))

  result.FULL_CATALOG_RESOURCE_PARENTS = resources.filter(([, record]) => record?.parentName && !FULL_CATALOG_RESOURCE_PARENTS.has(record.parentName)).map(([key, record]) => `${key} (${record.parentName})`).sort()
  const productCategories = new Set(asRecords(de.ExportWeapons, 'ExportWeapons').map(([, record]) => record?.productCategory).filter(Boolean))
  result['Mastery.jsx/MonitoringContext masteryProgress'] = [...productCategories].filter((category) => !Object.keys(WEAPON_BUCKETS).includes(category)).sort()
  const songItems = flavours.filter(([key]) => key.startsWith('/Lotus/Types/Items/SongItems/'))
  result['Collectibles SONG_ITEM_VENDORS'] = names(songItems.filter(([key]) => !curated.songVendors.has(key.split('/').pop())))
  const relicEras = [...new Set(relicRecords.map(([, record]) => record?.era).filter((era) => era && !['Lith', 'Meso', 'Neo', 'Axi'].includes(era)))]
  result['relic era filter'] = relicEras.sort()
  result['weapons primary/secondary/melee bucket rule'] = names(asRecords(de.ExportWeapons, 'ExportWeapons').filter(([, record]) => WEAPON_BUCKETS[record?.productCategory] && !record?.noise && !/vandal|wraith|prisma|prime/i.test(record?.name || '') && !(record?.damagePerShot && record?.productCategory === 'Melee')))
  result['excludeFromCodex/codexSecret'] = names(all.filter(([, record]) => record?.excludeFromCodex === true || record?.codexSecret === true))
  return result
}

async function loadCurated(dataDir) {
  const file = async (name) => readJson(path.join(dataDir, name))
  const [acquisition, relics, cosmetics, modIcons] = await Promise.all([file('warframe-items-acquisition.json'), file('wiki-prime-relic-drops.json'), file('cosmetic-catalog-additions.json'), file('mod-icon-map.json')])
  const sourceText = await fs.readFile(path.join(ROOT, 'src/screens/Collectibles.jsx'), 'utf8').catch(() => '')
  const songVendors = new Set([...sourceText.matchAll(/^\s{2}(\w+SongItem):/gm)].map((match) => match[1]))
  return { acquisition, relics, cosmetics, modIcons, authoritativeIcons: { '/Lotus/Powersuits/Frumentarius/Frumentarius': true, '/Lotus/Powersuits/Choir/Choir': true }, songVendors }
}

async function loadDe(cacheDir) {
  const provenance = await readJson(path.join(cacheDir, 'provenance.json'))
  const de = {}
  for (const category of DE_CATEGORIES) {
    const suffix = provenance.categories?.[category]?.suffix
    if (!suffix) continue
    de[category] = await readJson(path.join(cacheDir, 'assets', `${suffix}.json`))
  }
  return de
}

function markdown(result) {
  const lines = ['# Supplement freshness report', '', 'Generated from the cached Digital Extremes Public Export and the checked-in hand-curated sources. Each group lists DE records absent from the corresponding app rule/list; names include the DE unique name and current export label.', '']
  for (const [group, entries] of Object.entries(result)) {
    const values = Array.isArray(entries) ? entries : []
    lines.push(`## ${group} — ${values.length}`)
    lines.push(values.length ? values.join(', ') : 'None')
    lines.push('')
  }
  return `${lines.join('\n')}\n`
}

export async function main({ cacheDir = DEFAULT_CACHE, dataDir = DEFAULT_DATA, report = path.join(ROOT, 'docs/agent-reports/supplement-freshness.md') } = {}) {
  const result = analyze({ de: await loadDe(cacheDir), curated: await loadCurated(dataDir) })
  const output = markdown(result)
  await fs.mkdir(path.dirname(report), { recursive: true })
  await fs.writeFile(report, output)
  for (const [group, entries] of Object.entries(result)) console.log(`${group}: ${entries.length}\n${entries.length ? entries.join('\n') : 'None'}`)
  return result
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main({ cacheDir: process.env.KIEDAS_DE_EXPORT_CACHE || DEFAULT_CACHE, dataDir: process.env.KIEDAS_SUPPLEMENT_DATA_DIR || DEFAULT_DATA }).catch((error) => {
    console.error(`supplement-freshness: ${error.message}`)
    process.exitCode = 1
  })
}
