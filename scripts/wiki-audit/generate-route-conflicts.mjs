#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const outDir = path.join(repo, 'scripts/wiki-audit/out')
const dataDir = process.env.PREVIEW_DATA_DIR || path.join(process.env.HOME, '.local/share/kiedas-orbiter-preview/data')
const exportDir = path.join(dataDir, 'export')
const audit = JSON.parse(fs.readFileSync(path.join(outDir, 'audit-report.json'), 'utf8'))
const appRoutes = JSON.parse(fs.readFileSync(path.join(outDir, 'app-routes.json'), 'utf8'))
const pages = new Map(fs.readFileSync('/home/jedwards/kiedas-orbiter/wiki_store/pages.jsonl', 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
  const page = JSON.parse(line)
  return [page.title, page]
}))
const deDrops = JSON.parse(fs.readFileSync(path.join(exportDir, 'de/DropTables.json'), 'utf8'))

const canonical = (value) => String(value || '').replaceAll('/StoreItems/', '/')
const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim()
const lower = (value) => clean(value).toLocaleLowerCase()
const itemKey = (value) => lower(value).replace(/\s+blueprint$/, '')
const json = (value) => JSON.stringify(value)

function readExport(name) {
  return JSON.parse(fs.readFileSync(path.join(exportDir, name), 'utf8'))
}

const tables = [
  ['ExportCustoms.json', 'ExportCustoms'],
  ['ExportFlavour.json', 'ExportFlavour'],
  ['ExportGear.json', 'ExportGear'],
  ['ExportResources.json', 'ExportResources'],
  ['ExportSentinels.json', 'ExportSentinels'],
  ['ExportWarframes.json', 'ExportWarframes'],
  ['ExportWeapons.json', 'ExportWeapons'],
]
const marketTables = tables.map(([file, table]) => ({ file, table, value: readExport(file) }))
const recipes = readExport('ExportRecipes.json')
const vendors = readExport('ExportVendors.json')
const bundles = readExport('ExportBundles.json')

function recipeFor(uniqueName) {
  const key = canonical(uniqueName)
  if (recipes[key]) return { key, recipe: recipes[key] }
  for (const [recipeKey, recipe] of Object.entries(recipes)) {
    if (canonical(recipe?.resultType) === key) return { key: recipeKey, recipe }
  }
  return null
}

function marketEvidence(uniqueName) {
  const keys = new Set([canonical(uniqueName)])
  const recipe = recipeFor(uniqueName)
  if (recipe) keys.add(canonical(recipe.recipe.resultType))
  const evidence = []
  for (const { file, table, value } of marketTables) {
    for (const [entry, record] of Object.entries(value || {})) {
      if (!keys.has(canonical(entry)) || record?.excludeFromMarket === true) continue
      if (Number(record?.platinumCost) > 0) evidence.push({ file, entry, field: 'platinumCost', value: record.platinumCost, table })
      else if (Number(record?.creditsCost) > 0) evidence.push({ file, entry, field: 'creditsCost', value: record.creditsCost, table })
    }
  }
  if (recipe && recipe.recipe.excludeFromMarket !== true) {
    if (Number(recipe.recipe.platinumCost) > 0) evidence.push({ file: 'ExportRecipes.json', entry: recipe.key, field: 'platinumCost', value: recipe.recipe.platinumCost, table: 'ExportRecipes' })
    else if (Number(recipe.recipe.creditsCost) > 0) evidence.push({ file: 'ExportRecipes.json', entry: recipe.key, field: 'creditsCost', value: recipe.recipe.creditsCost, table: 'ExportRecipes' })
  }
  return evidence
}

function vendorEvidence(uniqueName) {
  const keys = new Set([canonical(uniqueName)])
  const recipe = recipeFor(uniqueName)
  if (recipe) keys.add(canonical(recipe.key))
  if (recipe) keys.add(canonical(recipe.recipe.resultType))
  const evidence = []
  for (const [manifest, vendor] of Object.entries(vendors || {})) {
    for (let index = 0; index < (vendor?.items || []).length; index += 1) {
      const item = vendor.items[index]
      if (!keys.has(canonical(item?.storeItem))) continue
      evidence.push({
        file: 'ExportVendors.json',
        entry: `${manifest}.items[${index}]`,
        storeItem: item.storeItem,
        itemPrices: item.itemPrices || [],
        syndicate: item.syndicate || null,
      })
    }
  }
  return evidence
}

function bundleEvidence(uniqueName) {
  const keys = new Set([canonical(uniqueName)])
  const recipe = recipeFor(uniqueName)
  if (recipe) keys.add(canonical(recipe.recipe.resultType))
  const evidence = []
  for (const [entry, bundle] of Object.entries(bundles || {})) {
    if (bundle?.excludeFromMarket === true || Number(bundle?.platinumCost) <= 0) continue
    for (let index = 0; index < (bundle?.components || []).length; index += 1) {
      const component = bundle.components[index]
      if (!keys.has(canonical(component?.typeName))) continue
      evidence.push({ file: 'ExportBundles.json', entry, componentIndex: index, typeName: component.typeName, purchaseQuantity: component.purchaseQuantity, field: 'platinumCost', value: bundle.platinumCost })
    }
  }
  return evidence
}

function dropRows(name) {
  const target = itemKey(name)
  const rows = []
  for (const [section, entries] of Object.entries(deDrops.sections || {})) {
    for (let index = 0; index < entries.length; index += 1) {
      const row = entries[index]
      if (itemKey(row?.item) !== target) continue
      rows.push({ file: 'de/DropTables.json', entry: `sections.${section}[${index}]`, ...row })
    }
  }
  return rows
}

function routeClass(text) {
  const value = lower(text)
  if (/\bmarket\b|platinum/.test(value)) return 'market'
  if (/invasion|bount(?:y|ies)|mission|drop|rotation|cache|isolation vault|fishing|min(?:e|ed)|deepmines|caves|cetus|orb vallis|zariman/.test(value)) return 'drop'
  if (/baro|vendor|chipper|garrison|ticker|syndicate|offering|nightwave|necraloid|father|cavalero|aspirant/.test(value)) return 'vendor'
  if (/event|operation|sortie|tactical alert|survival weekend/.test(value)) return 'event'
  if (/quest|completion/.test(value)) return 'quest'
  return 'other'
}

function routeRows(text, rows) {
  const value = lower(text)
  if (!rows.length) return []
  const locations = rows.map((row) => ({ row, text: lower(`${row.place || ''} ${row.source || ''}`) }))
  if (/invasion/.test(value)) return locations.filter((entry) => /invasion/.test(entry.text)).map((entry) => entry.row)
  if (/bount(?:y|ies)/.test(value)) return locations.filter((entry) => /bount(?:y|ies)/.test(entry.text)).map((entry) => entry.row)
  if (/sortie/.test(value)) return locations.filter((entry) => /sortie/.test(entry.text)).map((entry) => entry.row)
  if (/event|operation|tactical alert|survival weekend/.test(value)) return locations.filter((entry) => /event|operation|tactical|survival/.test(entry.text)).map((entry) => entry.row)
  if (/mission|drop|rotation|cache|isolation vault|fishing|min(?:e|ed)|deepmines|caves|cetus|orb vallis|zariman/.test(value)) return rows
  return []
}

function routeSupport(text, evidence) {
  const kind = routeClass(text)
  if (kind === 'market') return evidence.market.length > 0 || evidence.bundles.length > 0
  if (kind === 'vendor') return evidence.vendors.length > 0
  if (kind === 'drop' || kind === 'event') return routeRows(text, evidence.drops).length > 0
  return false
}

function supportEvidence(text, evidence) {
  const kind = routeClass(text)
  if (kind === 'market') return { kind, market: evidence.market, bundles: evidence.bundles }
  if (kind === 'vendor') return { kind, vendors: evidence.vendors.slice(0, 12), vendorMatchCount: evidence.vendors.length }
  if (kind === 'drop' || kind === 'event') {
    const rows = routeRows(text, evidence.drops)
    return { kind, drops: rows.slice(0, 12), dropMatchCount: rows.length }
  }
  return { kind, evidence: 'No DE route-table matcher for this route wording.' }
}

function pageFor(item) {
  const first = item.evidence?.find((line) => line.startsWith('Wiki page: '))
  const title = first ? first.slice('Wiki page: '.length) : item.name
  const page = pages.get(title)
  return { title, revid: page?.revid ?? null }
}

function conflictSentence(item, conflict) {
  return `The app says “${clean(conflict.app.text)}”, while the wiki says “${clean(conflict.wiki.evidence || conflict.wiki.text)}”.`
}

const itemRecords = []
const defectOccurrence = new Map()
for (const defect of audit.defects.app_conflict_route) {
  const candidates = audit.items.filter((item) => item.name === defect.name && item.category === defect.category)
  const candidateKey = `${defect.name}|${defect.category}`
  const occurrence = defectOccurrence.get(candidateKey) || 0
  defectOccurrence.set(candidateKey, occurrence + 1)
  const item = candidates[occurrence] || candidates[0]
  if (item) {
    const matched = defect.conflicts.filter((conflict) => item.appSources.sources.some((source) => source.text === conflict.app.text && source.type === conflict.app.type && source.source === conflict.app.source))
    const page = pageFor(item)
    const evidence = {
        market: marketEvidence(item.uniqueName),
        bundles: bundleEvidence(item.uniqueName),
      vendors: vendorEvidence(item.uniqueName),
      drops: dropRows(item.name),
      recipes: recipeFor(item.uniqueName) ? [{ file: 'ExportRecipes.json', entry: recipeFor(item.uniqueName).key, resultType: recipeFor(item.uniqueName).recipe.resultType, excludeFromMarket: recipeFor(item.uniqueName).recipe.excludeFromMarket ?? false }] : [],
    }
    const itemRecord = {
      id: `R${String(itemRecords.length + 1).padStart(3, '0')}`,
      uniqueName: item.uniqueName,
      name: item.name,
      category: item.category,
      page,
      deEvidence: {
        market: evidence.market,
        bundles: evidence.bundles,
        vendors: evidence.vendors.slice(0, 12),
        vendorMatchCount: evidence.vendors.length,
        drops: evidence.drops.slice(0, 12),
        dropMatchCount: evidence.drops.length,
        recipes: evidence.recipes,
      },
      routeConflicts: [],
    }
    for (const conflict of matched) {
      const appSupported = routeSupport(conflict.app.text, evidence)
      const wikiSupported = routeSupport(conflict.wiki.evidence || conflict.wiki.text, evidence)
      const proposedClass = appSupported && wikiSupported
        ? 'both_valid_app_incomplete'
        : !appSupported && wikiSupported
          ? 'app_wrong_wiki_right'
          : appSupported && !wikiSupported
            ? 'wiki_outdated_app_right'
            : 'needs_game_check'
      itemRecord.routeConflicts.push({
        id: `${itemRecord.id}.${itemRecord.routeConflicts.length + 1}`,
        wiki: {
          kind: conflict.wiki.kind,
          where: conflict.wiki.where,
          text: conflict.wiki.evidence || conflict.wiki.text,
          auditText: conflict.wiki.text,
          routes: conflict.wikiRoutes,
        },
        app: {
          text: conflict.app.text,
          type: conflict.app.type,
          source: conflict.app.source,
          routes: conflict.appRoutes,
        },
        deSupport: { app: appSupported, wiki: wikiSupported },
        deSupportEvidence: { app: supportEvidence(conflict.app.text, evidence), wiki: supportEvidence(conflict.wiki.evidence || conflict.wiki.text, evidence) },
        proposedClass,
        conflict: conflictSentence(item, conflict),
      })
    }
    if (itemRecord.routeConflicts.length) itemRecords.push(itemRecord)
  }
}

const pairRecords = itemRecords.flatMap((item) => item.routeConflicts.map((conflict) => ({
  ...conflict,
  itemId: item.id,
  uniqueName: item.uniqueName,
  name: item.name,
  category: item.category,
  page: item.page,
  deEvidence: item.deEvidence,
})))

function patternKey(record) {
  return [record.proposedClass, record.app.source, record.app.type, record.app.text, record.wiki.kind, routeClass(record.wiki.text), record.wiki.routes.join('+')].join('|')
}

const patternMap = new Map()
for (const record of pairRecords) {
  const key = patternKey(record)
  const pattern = patternMap.get(key) || {
    id: `P${patternMap.size + 1}`,
    key,
    count: 0,
    proposedClass: record.proposedClass,
    app: { type: record.app.type, source: record.app.source, text: record.app.text, route: routeClass(record.app.text) },
    wiki: { kind: record.wiki.kind, route: routeClass(record.wiki.text), routes: record.wiki.routes },
    items: [],
  }
  pattern.count += 1
  pattern.items.push(record.id)
  patternMap.set(key, pattern)
}

const slaytra = audit.items.find((item) => item.name === 'Slaytra' && item.category === 'weapons')
const lemnas = audit.items.find((item) => item.name === 'Lemnas Staff Skin')
const report = {
  generatedAt: new Date().toISOString(),
  inputs: {
    auditReport: 'scripts/wiki-audit/out/audit-report.json',
    appRoutes: 'scripts/wiki-audit/out/app-routes.json',
    wikiPages: '/home/jedwards/kiedas-orbiter/wiki_store/pages.jsonl',
    deExportDir: `${dataDir}/export`,
    network: false,
  },
  counts: {
    nonCosmeticAuditItems: audit.items.length,
    excludedCosmetics: audit.metadata.excludedByDecision.cosmetics,
    routeConflictRecords: itemRecords.length,
    routeConflictPairs: pairRecords.length,
    uniqueItemCategoryPairs: new Set(itemRecords.map((record) => `${record.name}|${record.category}`)).size,
    uniqueNames: new Set(itemRecords.map((record) => record.name)).size,
    patterns: patternMap.size,
    proposedClasses: Object.fromEntries(['app_wrong_wiki_right', 'wiki_outdated_app_right', 'both_valid_app_incomplete', 'needs_game_check'].map((key) => [key, pairRecords.filter((record) => record.proposedClass === key).length])),
  },
  requestedExamples: {
    Korumm: itemRecords.filter((record) => record.name === 'Korumm'),
    Slaytra: slaytra ? { presentInAudit: true, presentInConflictList: false, reason: 'The wiki fact is vendor text for Kahl’s Garrison, but the route extractor did not emit a route token for Garrison.' } : { presentInAudit: false },
    'Latron Wraith': itemRecords.filter((record) => record.name === 'Latron Wraith'),
    'Strun Wraith': itemRecords.filter((record) => record.name === 'Strun Wraith'),
    'Lemnas Staff Skin': { presentInAudit: Boolean(lemnas), excludedByDecision: true, reason: 'Cosmetics are excluded by the user decision.' },
  },
  patterns: [...patternMap.values()],
  conflicts: itemRecords,
  routeConflictPairs: pairRecords,
}

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'route-conflicts.json'), `${JSON.stringify(report, null, 2)}\n`)

const classLabels = {
  app_wrong_wiki_right: 'app_wrong_wiki_right',
  wiki_outdated_app_right: 'wiki_outdated_app_right',
  both_valid_app_incomplete: 'both_valid_app_incomplete',
  needs_game_check: 'needs_game_check',
}
const lines = [
  '# Route-conflict report',
  '',
  `Generated from the complete local wiki store, regenerated app routes, and cached DE export data. Network access was not used. The audit contains **${itemRecords.length} route-conflict records** across **${report.counts.uniqueItemCategoryPairs} item/category pairs**, representing **${pairRecords.length} app/wiki route comparisons**, and excludes **${report.counts.excludedCosmetics} cosmetics** by decision.`,
  '',
  '## Proposed classes',
  '',
  '| Class | Records | Meaning |',
  '| --- | ---: | --- |',
  '| app_wrong_wiki_right | ' + report.counts.proposedClasses.app_wrong_wiki_right + ' | DE data supports the wiki route and has no matching DE evidence for the app route. |',
  '| wiki_outdated_app_right | ' + report.counts.proposedClasses.wiki_outdated_app_right + ' | DE data supports the app route and has no matching DE evidence for the wiki route. |',
  '| both_valid_app_incomplete | ' + report.counts.proposedClasses.both_valid_app_incomplete + ' | DE data supports both routes; the app route is incomplete. |',
  '| needs_game_check | ' + report.counts.proposedClasses.needs_game_check + ' | DE exports and cached DE drop tables are silent for both route claims. |',
  '',
  'These are evidence proposals, not claims that the game client cannot contain additional historical or live behavior. “Silent” means no matching entry was found in the checked DE files.',
  '',
  '## Pattern summary',
  '',
  '| Pattern | Records | Proposed class | App source/text | Wiki kind/route | Examples |',
  '| --- | ---: | --- | --- | --- | --- |',
]
for (const pattern of patternMap.values()) {
  const examples = pattern.items.slice(0, 5).map((id) => pairRecords.find((record) => record.id === id).name).join(', ')
  lines.push(`| ${pattern.id} | ${pattern.count} | ${classLabels[pattern.proposedClass]} | ${pattern.app.source} / ${pattern.app.text} | ${pattern.wiki.kind} / ${pattern.wiki.route} | ${examples} |`)
}
lines.push('', '## Requested exemplars', '', '- **Korumm:** included in the conflict ledger; cached DE `de/DropTables.json` has current Cetus and Orb Vallis bounty rows for `Korumm Blueprint`, while `ExportWeapons.json` has `platinumCost: 180`.', '- **Slaytra:** not in `app_conflict_route`; the audit item exists and its wiki page says Chipper in Kahl’s Garrison, but the route extractor did not create a route token for “Garrison”. Cached DE evidence includes the Kahl Chipper vendor manifest and the weapon Market price.', '- **Latron Wraith / Strun Wraith:** included; the app override says Invasions, while the wiki facts include historical event/Sortie claims and the current DE drop table has no matching rows for either item.', '- **Lemnas Staff Skin:** excluded as cosmetic, as required.', '', '## Per-pattern evidence', '')

for (const pattern of patternMap.values()) {
  lines.push(`### ${pattern.id} — ${pattern.proposedClass} (${pattern.count} record${pattern.count === 1 ? '' : 's'})`, '', `App row pattern: **${pattern.app.text}** — type \`${pattern.app.type}\`, source \`${pattern.app.source}\`.`, `Wiki pattern: **${pattern.wiki.kind}** / ${pattern.wiki.route}; route entities: ${pattern.wiki.routes.join(', ') || '(none)'}.`, '')
  for (const id of pattern.items) {
    const record = pairRecords.find((entry) => entry.id === id)
    lines.push(`#### ${record.id}. ${record.name} (${record.category})`, '', `- Wiki page: **${record.page.title}**, revid **${record.page.revid ?? 'not found'}**.`, `- Wiki fact (verbatim from the audited page text): “${record.wiki.text}”`, `- App source row: “${record.app.text}”; type \`${record.app.type}\`; source \`${record.app.source}\`.`, `- DE evidence: ${record.deEvidence.market.length ? `market ${json(record.deEvidence.market)}` : 'no matching direct market entry'}; ${record.deEvidence.bundles.length ? `bundle ${json(record.deEvidence.bundles)}` : 'no matching market bundle entry'}; ${record.deEvidence.vendors.length ? `vendor ${json(record.deEvidence.vendors)} (${record.deEvidence.vendorMatchCount} matching entries; first ${record.deEvidence.vendors.length} shown)` : 'no matching vendor-manifest entry'}; ${record.deEvidence.drops.length ? `drop rows ${json(record.deEvidence.drops)} (${record.deEvidence.dropMatchCount} matching entries; first ${record.deEvidence.drops.length} shown)` : 'no matching drop-table row'}; ${record.deEvidence.recipes.length ? `recipe ${json(record.deEvidence.recipes)}` : 'no matching recipe entry'}.`, `- DE route evidence used for classification: app **${record.deSupport.app ? 'yes' : 'no'}** ${json(record.deSupportEvidence.app)}; wiki **${record.deSupport.wiki ? 'yes' : 'no'}** ${json(record.deSupportEvidence.wiki)}.`, `- Conflict: ${record.conflict}`, `- Proposed class: **${record.proposedClass}**.`, '')
  }
}

fs.writeFileSync(path.join(outDir, 'route-conflicts.md'), `${lines.join('\n')}\n`)
console.log(JSON.stringify(report.counts, null, 2))
