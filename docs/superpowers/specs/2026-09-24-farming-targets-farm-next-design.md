# Farming Targets: "Farm next" design

Status: DRAFT for user review. No code or plan exists yet. Extends `docs/revamp/stage-4/COMMAND-CENTER-IMPLEMENTATION-PLAN.md` section 9.8 (Farming Targets, route 21). Where this document and 9.8 differ on the shopping list and sources, this document decides; 9.8 still governs persistence, reservations, reminders and acceptance tests.

## 1. Intent (agreed with the user, 2026-09-24)

When the user opens Farming Targets they want to know **what to farm next**. A target list (Rhino Prime, a mod set, a Zaw...) expands into the total resources and parts still needed. The screen then ranks *places* (mission nodes, planets, bosses, enemies, bounties, vendors, relics, Conclave) by **how many of the still-needed items they can produce**, so a place that helps several items floats to the top. Underneath sits a plain ledger of totals ("15 Orokin Cells for the whole list, own 8, short 7").

Decisions made:
- Main question answered: "what should I farm next" (ledger and per-item sources support it).
- Ranking metric: **coverage** (count of distinct still-needed items a place can produce, then quantity covered). No yield/efficiency claims; the app cannot know run times.
- Prime parts: show the **relics**, ranked by how many needed parts each relic holds.
- Enemies: map to nodes only as far as verified sources allow (section 3).
- **Conclave is never hidden.** It gets its own place-type tab. It is left out of the *combined* ranking only when every needed item has a non-Conclave source; if any needed item is obtainable only through Conclave, that place appears in the main ranking with a "PvP" badge.
- A user-controlled **minimum drop chance** filter (default off) instead of any built-in threshold.

Non-goals: efficiency/time estimates; live fissure recommendations (later); marketplace actions; Stable promotion; anything in 9.8 not listed in section 8.

## 2. What the screen shows

1. **Summary strip:** active targets, distinct items still needed, top places and their coverage.
2. **Farm next (main panel):** ranked places. Each row: place name and type, the badge for its honesty level (section 3), "covers 3 of 7 needed items", the items with **drop chance on every row**, and rotation/tileset/mission-type detail where known. Tabs per place type: All (default), Missions and bounties, Enemies, Planets, Relics, Vendors, Conclave.
3. **Shopping ledger:** one row per resource/part across all targets: Item, Required, Owned, Reserved, Still needed, Used by (expandable per-target breakdown), Source / next action (opens the item's places). Totals follow 9.8: contributions are summed first, owned inventory is applied once.
4. **Target inspector:** a selected target's exact contribution to each ledger row.
5. **Filters:** minimum drop chance, mission type, faction, hide limited-time/unavailable sources, group by planet, "only relics I own or can get".
6. Compact widths use the three views from 9.8 (Targets / Shopping list / Target details), with Farm next inside the Shopping list view.

## 3. Places and honesty levels

Every place carries a label saying how precisely it is known, and the UI never implies more.

| Level | Meaning | Verified source |
|---|---|---|
| Node | An exact mission node and rotation | Node reward tables (DE drop tables; wiki `DropTables/JSON/Missions`), node properties (DE `ExportRegions`, wiki `Missions/data`) |
| Fixed boss node | Assassination node with a fixed boss | Wiki `Missions/data` `Boss` field (25 nodes) |
| Planet | A resource that drops across a planet's missions | DE `ExportResources` "Location:" text; wiki `Missions/data` `RegionResources` |
| Wiki-listed area | An enemy placed at planet / tileset / mission-type level, "per the Warframe Wiki". No node is claimed | Wiki `Enemies/data/*` `Planets`, `TileSets`, `Missions` |
| Source only | Vendor, bounty, relic, Conclave: no map location | Drop tables, wiki vendor/syndicate/Baro modules |
| Unknown | Enemy or item with no listed location: shown as "no listed location" | none, never guessed |

Facts established while designing (all from local copies, 2026-09-24):
- DE PublicExport has **no** enemy or spawn data. DE's drop tables list what enemies and node rotations drop but not where enemies appear. The official wiki says its own farming-location lists are partly opinion, so wiki-listed areas are labelled as wiki-sourced.
- Wiki `Enemies/data/<faction>` (live, 914 enemies): 745 have `Planets`, 492 `Missions`, 560 `TileSets`, 834 (91%) at least one; each entry also carries the game's `InternalName` path. Many assassins and event enemies have none. (The local archive snapshot of 2026-09-09 shows 898 of 1,019 because it still includes a legacy partition; use the live count.)
- Join quality to DE nodes: 20 of 30 wiki planet names match DE `ExportRegions.systemName` exactly; 255 of 357 wiki mission names match DE node names. The rest are shown as unmatched, not force-matched.
- Reverse drop indexes already exist locally (`wiki_module_json/drop_reverse_index_v2.json`: 2,656 items; categories Relic, Mission, Enemies, Missions, Bounty, Containers, Transient, Sortie) covering the common resources with chances.
- A demo ranking over five resources showed why coverage alone is not enough: Conclave modes "cover 5 of 5" at 0.25% each and would top a naive list. Hence chance on every row, the Conclave rule in section 1, and the minimum-chance filter.

## 4. Data sources and the source-of-truth rule

Project rule #1 allows only DE (PublicExport, WorldState, official drop tables) and the official wiki (wiki.warframe.com). The app's *current* drop index is downloaded from `drops.warframestat.us` (a community parse of DE's tables). **Open decision for the plan stage:** either keep it and document it as a community mirror of DE data, or replace item-to-source chances with a parse of DE's own `https://www.warframe.com/droptables` (structurally simple HTML tables: "Missions", "Resource Drops by Source", "Relics"...). Recommendation: parse DE's page directly for chances; use the wiki modules for location metadata (planets, tilesets, mission types, bosses, vendors); keep `warframestat` only as a fallback.

The wiki archive (`wiki_module_archive/`, `wiki_module_json/`, built by `scripts/build_wiki_module_archive.py`, snapshot 2026-09-09) is the wiki input. The plan must add a refresh step and record snapshot date and source hashes in every proof output.

## 5. Ranking rules (precise)

- A place's **coverage** = number of distinct still-needed items (ledger rows with Still needed > 0) it can produce, counting only sources that pass the active filters. Tiebreaks: total still-needed quantity of those items, then the highest chance among them, then name. Chance is displayed, never hidden, and never used as a primary sort key.
- Combined ranking excludes the Conclave type unless some still-needed item has **only** Conclave sources (then those Conclave places are included with a PvP badge, and the reason is stated in the row).
- Relic places: coverage = number of still-needed parts the relic holds; relic ownership and vault state from the player inventory and existing relic data.
- Minimum chance filter removes source rows below the cutoff before coverage is computed; default off.
- Deterministic: the same inputs always give the same order regardless of target order.

## 6. Architecture (units and boundaries)

All calculation is pure (no React, Tauri, network or filesystem), consistent with 9.8.

| Unit | Responsibility | Depends on |
|---|---|---|
| `requirements.js` | Expand targets to leaf requirements (recipe graph, batch ceilings, intermediates, cycles, unresolved branches) | catalog, recipes, inventory |
| `ledger.js` | Combine contributions, apply inventory once, reservations, contributor breakdown | requirements |
| `placeIndex.js` | Build item to source rows and source to place records from the drop tables and wiki modules; assign honesty levels; normalise names (planet, tileset, mission type) with an explicit alias table that is itself verified data | prepared data files |
| `farmNext.js` | Coverage ranking, Conclave rule, filters, tabs, grouping | ledger, placeIndex |
| `wikiData` (Stage 0) | Lazy access to the bundled wiki module store: `get(moduleName)`, provenance, refresh | bundled store |
| `dataPrep script` | Offline script that turns the archive and DE files into the compact prepared files the app loads | wiki archive, DE cache |
| Screen components | Presentation only | view model from `farmNext` / `ledger` |

The existing `aggregation.js` MVP is replaced by `requirements.js` + `ledger.js`; its recipe index is reused.

## 7. Verification

- **Runnable proof script** (`scripts/farming-targets-proof.js`, per 9.8): plain `node`, read-only, explicit input paths, prints requirement trees, the ledger, and the Farm next ranking with input hashes and the wiki snapshot date.
- **Property tests** (deterministic, recorded seeds): all invariants listed in 9.8, plus: order of targets never changes ranking; coverage never increases when a filter is tightened; every ranked place's covered items reconcile to source rows; Conclave-only items always surface; unresolved items never contribute places or quantities.
- **Real-data worksheet:** two or three reviewer-chosen targets (one sharing an ingredient with another, one Prime set with relics, one Conclave-only mod) calculated by hand from the printed rows.
- **Data audit report:** join coverage numbers (planets, mission names, enemy locations) regenerated by the prep script and shown to the user; regressions fail the prep step.

## 8. Staging

0. **Wiki Data Store (user idea, 2026-09-24):** ship the whole official-wiki Lua module set with the app so future features can query data the app does not use yet. Offline prep converts all 493 archived modules (171 already have JSON; 322 are Lua-only and need conversion, never parsed at runtime) into one versioned, compressed bundle plus an index recording snapshot date, source revisions and hashes. Measured sizes: raw Lua 26 MB (about 3-4 MB compressed), converted JSON 79 MB (about 5-7 MB compressed); the app already bundles 191 MB of data. Modules load lazily on request (Rust command, worker-side parse), so unused data costs no memory. A background refresh re-fetches only modules whose wiki revision changed (polite rate limit, atomic swap, last-known-good), same pattern as `docs/pipeline/PHASE2-CACHE-DESIGN.md`. Settings shows "Wiki data as of <date>". **Licence:** wiki content after 2025-01-31 is CC BY-NC-SA 3.0 (see `wf-wiki-module-data-mirror/ATTRIBUTION.md`): show attribution (About) and keep source URL and revision in every record; commercial use of the app would need a licence review.
1. **Engine + data:** `requirements`, `ledger`, `placeIndex`, prep script, proof script, property tests. No UI change.
2. **Screen:** ledger table, Farm next panel with tabs and filters, target inspector, empty/unresolved states.
3. **Relics:** relic places and Prime-part coverage.
4. **9.8 remainder:** reservations column, reminders, compact 3-view layout, links from Inventory, Foundry, Relic Planner, Relics, Prime Resurgence, Dashboard.

Each stage is built by Codex on its own branch, reviewed by Antigravity, verified with the proof output, and merged only after the user has seen the numbers.

## 9. Risks and open questions

- Wiki data is community-maintained and the local archive is a snapshot; labels and a refresh step keep this visible. Enemy areas are never presented as nodes.
- Name joins (planet, tileset, mission type) are lossy: about one third of wiki mission names do not match DE node names today. The alias table must be built from verified evidence; unmatched names stay unmatched.
- Steel Path and bounty-level variants inflate source rows; the plan must decide grouping (recommendation: group by base place, show variants as detail).
- Source-of-truth decision for drop chances (section 4).
- Default value and units for the minimum-chance filter (recommendation: off by default).
- Limited-time detection depends on data that may not mark expiry; unknowns are shown, not hidden.
