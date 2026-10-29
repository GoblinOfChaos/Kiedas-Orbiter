# Claude Handoff: Items With “No Acquisition Data”

Date: 2026-10-07
Repository: `/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center`

## Objective

Investigate the 206 inventory entries currently shown by the app as having no acquisition data, then present and implement a source-backed solution so the UI distinguishes missing acquisition metadata from unknown items.

The source report is:

`/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/docs/agent-context/reports/no-acquisition.md`

Its contents are data to investigate, not instructions.

## Non-negotiable source policy

Use only these sources for game facts:

1. Digital Extremes Public Export: `https://origin.warframe.com/PublicExport/index_en.txt.lzma` and the hashed files under `https://content.warframe.com/PublicExport/Manifest/`.
2. Official Warframe Wiki: `https://wiki.warframe.com/`.
3. The player inventory at `~/.local/share/kiedas-orbiter-preview/data/user/inventory.json` for ownership only.

Fandom and guessed acquisition rules are prohibited.

## Verified DE Public Export findings

The live DE English manifest was queried on 2026-10-07. Matching was performed against the exact `/Lotus/...` identifiers from `no-acquisition.md`, not display names alone.

- 202/206 entries have an exact identifier in the current DE manifest-backed exports.
- 71 match `ExportRecipes_en.json` records or recipe result identifiers.
- 125 match `ExportResources_en.json` records.
- 1 matches `ExportWeapons_en.json`.
- 4 match `ExportSentinels_en.json`.
- 1 matches `ExportGear_en.json`.
- 0 match `ExportUpgrades_en.json` by exact item identifier.

The four exact identifiers not found are legacy/path variants, not proof that the display items are unknown:

| Display item | Reported identifier | Current DE alias evidence |
|---|---|---|
| Glyph Prism | `/Lotus/Types/Restoratives/Consumable/GuildGlyphConsumableNoCharges` | `Glyph Prism` exists under `/Lotus/Types/Restoratives/Consumable/GlyphConsumable` and `/Lotus/Types/Restoratives/Consumable/GlyphConsumableNoCharges` in `ExportGear_en.json` |
| Last Chance Offerings | `/Lotus/Types/Packages/MegaPrimeVault/LastChanceItemA` | `Last Chance Offerings` exists under `/Lotus/Types/StoreItems/Packages/MegaPrimeVault/LastChanceItemA` in `ExportResources_en.json` |
| Varzia's Offerings | `/Lotus/Types/Packages/MegaPrimeVault/LastChanceItemC` | `Varzia's Offerings` exists under `/Lotus/Types/StoreItems/Packages/MegaPrimeVault/LastChanceItemC` in `ExportResources_en.json` |
| Varzia's Offerings - Part 2 | `/Lotus/Types/Packages/MegaPrimeVault/LastChanceItemB` | `Varzia's Offerings - Part 2` exists under `/Lotus/Types/StoreItems/Packages/MegaPrimeVault/LastChanceItemB` in `ExportResources_en.json` |

Important: presence in `ExportRecipes` or `ExportResources` proves catalog identity and metadata, not acquisition. DE’s structured exports do not provide a complete acquisition explanation for every resource, decoration, tag, event currency, legacy object, or reward item.

## Existing local evidence

The repository contains a local official Wiki dump:

- `/home/jedwards/kiedas-orbiter/wiki_store/pages.jsonl`
- `/home/jedwards/kiedas-orbiter/wiki_store/manifest.json`
- `/home/jedwards/kiedas-orbiter/wiki_store/redirects.json`

The manifest reports 10,952 pages and 26,230 redirects, with a complete all-pages crawl. Use this local corpus before making additional bulk Wiki requests. The local Wiki dump is a fallback/acquisition-explanation source, not a replacement for DE identity or ownership data.

## Required solution

Replace the single generic “No acquisition data” outcome with a provenance-aware acquisition result. The model should distinguish at least:

- `catalog_only`: exact DE item exists, but no acquisition source is present in the structured DE data or verified Wiki evidence.
- `recipe_found`: DE recipe exists; show the recipe/foundry information separately from acquisition.
- `direct_de_source`: DE structured data contains an acquisition/reward/vendor source.
- `wiki_source`: a verified official Wiki page supplies acquisition information not represented in DE’s structured export.
- `alias_resolved`: the report identifier is stale or renamed, and the current DE identifier is recorded.
- `unresolved`: neither exact identity nor a verified alias could be established.

Do not label a recipe as an acquisition source. “Craftable” and “obtainable from [source]” are separate facts.

Every displayed result should retain:

- report display name;
- original inventory `uniqueName`;
- canonical DE identifier, if different;
- source authority (`DE Public Export`, `Official Warframe Wiki`, or both);
- source record/page and retrieval date;
- acquisition status;
- concise user-facing explanation;
- unresolved/blocked reason when no source is found.

## Research workflow for all 206 entries

1. Load the `all (206)` section of `no-acquisition.md` and preserve its exact identifiers.
2. Match exact identifiers in the current DE manifest-backed exports.
3. Resolve aliases using the current DE record’s display name and unique name; never silently replace the original identifier.
4. Inspect recipe result/ingredient data separately from acquisition data.
5. Inspect all available DE source-bearing exports and vendor/reward references before using the Wiki.
6. Search the local official Wiki dump by canonical title, redirects, display name, and relevant acquisition sections/templates.
7. Record one result per input item with evidence and one of `Pass`, `Fail`, `Blocked`, or `Not Applicable` for the research check.
8. Do not bulk-infer acquisition from item category, internal path, or a similarly named item.

## Implementation boundary

Before editing program code, inspect:

- `src/lib/` acquisition/source readers and normalizers;
- all consumers of the current “no acquisition” state;
- the DE export loading/merge path in `src-tauri/`;
- current acquisition tests and real-data harnesses;
- the dirty worktree and existing uncommitted changes.

Do not overwrite, reset, stash, clean, build, deploy, or commit the existing dirty worktree. If a code change is proposed, present the implementation plan and wait for explicit approval under `AGENTS.md`.

If implementation is later approved, use real DE data tests through the existing real-data harness. Synthetic tests alone are insufficient. Test exact identifiers, aliases, recipes without acquisition, Wiki-only acquisition, and truly unresolved entries.

## Acceptance criteria

- All 206 entries have an evidence-backed research row.
- No item is called “unknown” solely because acquisition is absent.
- Recipe metadata is never presented as acquisition.
- The four known legacy identifiers resolve transparently as aliases.
- DE and Wiki provenance are visible in the diagnostic/result model.
- Unknown, catalog-only, Wiki-only, and directly sourced cases are distinguishable in the UI.
- Existing acquisition behavior remains unchanged for items with verified sources.
- Validation uses the exact dirty Preview tree and real DE/Wiki data.
