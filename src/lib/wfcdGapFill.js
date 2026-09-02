import { invoke } from '@tauri-apps/api/core'

// Fills gaps in our main data sources (ExportWeapons, ExportCustoms - both
// from warframe-public-export-plus) using WFCD's warframe-items data,
// fetched live from GitHub by check_exports (see WFCD_GAPFILL_FILES in
// main.rs for why this exists: export-plus is typically about a month
// behind the live game, and WFCD's live GitHub data is often more current
// for very recently released items).
//
// SAFETY RULES - read before touching this file:
//  1. An entry is ONLY added when its exact uniqueName is completely absent
//     from the main table. Never on a name match, a "looks similar" match,
//     or any fuzzy comparison - that's how a real item quietly turns into
//     two entries and starts double-counting mastery or ownership.
//  2. An exact-uniqueName match with a DIFFERENT category between the two
//     sources (e.g. Sirocco: WFCD tags it Primary, export-plus correctly
//     tags it OperatorAmps - a known, since-fixed WFCD data bug) is never
//     merged - it's only logged, for a human to look at if it ever matters.
//  3. This function never mutates its inputs. It returns a new object; the
//     caller decides what to do with it.
//  4. Every path in here is wrapped so a missing/malformed WFCD file (fetch
//     failed, GitHub restructured their repo, whatever) degrades to exactly
//     today's behavior - this must never be able to make things worse than
//     not running at all.
//  5. Synthesized entries never guess an image URL - WFCD's imageName has
//     no relationship to DE's hash-addressed CDN paths, so a fabricated one
//     would just be a different flavor of wrong. Leaving `icon` unset lets
//     ItemImage's existing "Image Unavailable" placeholder do its honest job.

const SOURCES = [
  // [export-data key of the WFCD array, main table to check/enrich, the
  //  field on a main-table entry that identifies its category,
  //  pathPrefix: only WFCD entries whose OWN uniqueName starts with this are
  //  even considered, mode: 'merge' actually adds the item, 'audit' only
  //  logs it as a candidate for a human to check, description for logging]
  //
  // pathPrefix exists because WFCD's file boundaries don't match DE's: e.g.
  // WFCD's "Skins.json" (6700+ entries) is a broad grab-bag covering Titles,
  // Emotes, Ship Decorations, Note Packs, Kubrow colors and more - none of
  // which belong in ExportCustoms. Without this filter, every one of those
  // legitimately-filed-elsewhere items looks like a "gap" and gets wrongly
  // added here. Confirmed against real data: ExportCustoms is ~4700 entries,
  // of which ~4650 (98%) live under /Lotus/Upgrades/Skins/ - that's the real
  // boundary, not "whatever WFCD happened to bucket as Skins".
  //
  // WFCD_Skins is 'audit'-only, not 'merge': even after the path-prefix
  // filter, real testing turned up multiple further categories of false
  // positive within /Upgrades/Skins/ itself - Animation Set "Unlock*"
  // tokens (confirmed: zero of these exist anywhere in real ExportCustoms
  // data, a deliberate DE exclusion, not staleness) and a large number of
  // Liset (landing craft) ship-skin variants, several literally named
  // "...Default" (a no-skin-selected placeholder, not a purchasable item).
  // Weapons showed zero false positives in the same testing. Rather than
  // keep guessing at exclusion rules for a category that keeps turning up
  // new kinds of noise, cosmetics only ever get logged as a candidate for
  // a human to check - never auto-added to the live catalog.
  { wfcdKey: 'WFCD_Primary', mainTable: 'ExportWeapons', categoryField: 'productCategory', pathPrefix: '/Lotus/Weapons/', mode: 'merge', label: 'Primary weapon' },
  { wfcdKey: 'WFCD_Secondary', mainTable: 'ExportWeapons', categoryField: 'productCategory', pathPrefix: '/Lotus/Weapons/', mode: 'merge', label: 'Secondary weapon' },
  { wfcdKey: 'WFCD_Melee', mainTable: 'ExportWeapons', categoryField: 'productCategory', pathPrefix: '/Lotus/Weapons/', mode: 'merge', label: 'Melee weapon' },
  { wfcdKey: 'WFCD_Skins', mainTable: 'ExportCustoms', categoryField: null, pathPrefix: '/Lotus/Upgrades/Skins/', mode: 'audit', label: 'Cosmetic skin' },
]

function synthesizeEntry(wfcdItem) {
  // Deliberately minimal - only the fields any of our code actually reads
  // from an ExportWeapons/ExportCustoms entry. `name` is plain text here
  // (WFCD's own format), which resolveName() already falls back to
  // correctly for any non-"/Lotus/"-prefixed string - no special-casing
  // needed on the consuming side.
  return {
    name: wfcdItem.name,
    productCategory: wfcdItem.productCategory ?? null,
    codexSecret: !!wfcdItem.codexSecret,
    excludeFromCodex: false,
    noise: wfcdItem.noise ?? 'Alarming',
    icon: null,
    _wfcdGapFill: true,
  }
}

export function fillDataGaps(exportData) {
  const audit = { added: [], auditOnly: [], categoryMismatches: [], sourcesChecked: [], sourcesUnavailable: [] }
  if (!exportData || typeof exportData !== 'object') return { exportData, audit }

  const result = { ...exportData }

  for (const { wfcdKey, mainTable, categoryField, pathPrefix, mode, label } of SOURCES) {
    const wfcdList = exportData[wfcdKey]
    if (!Array.isArray(wfcdList)) {
      audit.sourcesUnavailable.push(wfcdKey)
      continue
    }
    audit.sourcesChecked.push({ key: wfcdKey, count: wfcdList.length })

    const mainData = result[mainTable]
    if (!mainData || typeof mainData !== 'object') continue

    let enrichedTable = null // lazily cloned only if we actually add something

    for (const item of wfcdList) {
      const un = item?.uniqueName
      if (!un || typeof un !== 'string') continue
      // Out-of-scope for this table's boundary (see pathPrefix comment on
      // SOURCES) - not a gap, just filed under a different real DE table
      // this pass isn't checking.
      if (pathPrefix && !un.startsWith(pathPrefix)) continue

      const existing = mainData[un]
      if (existing) {
        if (categoryField && existing[categoryField] && item.productCategory && existing[categoryField] !== item.productCategory) {
          audit.categoryMismatches.push({
            uniqueName: un,
            name: item.name,
            mainCategory: existing[categoryField],
            wfcdCategory: item.productCategory,
          })
        }
        continue
      }

      if (mode !== 'merge') {
        audit.auditOnly.push({ uniqueName: un, name: item.name, table: mainTable, source: wfcdKey, label })
        continue
      }

      if (!enrichedTable) enrichedTable = { ...mainData }
      enrichedTable[un] = synthesizeEntry(item)
      audit.added.push({ uniqueName: un, name: item.name, table: mainTable, source: wfcdKey, label })
    }

    if (enrichedTable) result[mainTable] = enrichedTable
  }

  return { exportData: result, audit }
}

export function logGapFillAudit(audit) {
  try {
    const lines = ['[WFCD-GAPFILL] Audit:']
    lines.push(`  Sources checked: ${audit.sourcesChecked.map(s => `${s.key} (${s.count})`).join(', ') || 'none'}`)
    if (audit.sourcesUnavailable.length) {
      lines.push(`  Sources unavailable (fetch failed or not yet downloaded): ${audit.sourcesUnavailable.join(', ')}`)
    }
    lines.push(`  Added ${audit.added.length} item(s) to the live catalog (merge mode - weapons only):`)
    for (const a of audit.added) {
      lines.push(`    + [${a.label}] "${a.name}" (${a.uniqueName}) -> ${a.table}`)
    }
    if (audit.auditOnly.length) {
      lines.push(`  ${audit.auditOnly.length} candidate(s) found but NOT added (audit mode - needs a human look, see wfcdGapFill.js for why cosmetics are audit-only):`)
      for (const a of audit.auditOnly) {
        lines.push(`    ~ [${a.label}] "${a.name}" (${a.uniqueName}) -> ${a.table}`)
      }
    }
    if (audit.categoryMismatches.length) {
      lines.push(`  ${audit.categoryMismatches.length} category disagreement(s), NOT merged (needs human review if it ever matters):`)
      for (const m of audit.categoryMismatches) {
        lines.push(`    ? "${m.name}" (${m.uniqueName}): main=${m.mainCategory} vs wfcd=${m.wfcdCategory}`)
      }
    }
    invoke('log_terminal', { message: lines.join('\n') }).catch(() => {})
  } catch {
    // Logging must never be able to break the actual data load.
  }
}
