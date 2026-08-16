# Repository-informed acquisition and Foundry implementation guide

## Goal

Replace justified instances of the generic acquisition fallback with concrete,
structured source information while preserving the current rule: never infer a
player-facing acquisition from an internal export field without checking real
data.

This plan combines the strongest patterns found in WFHelper, warframe-item-pull,
Codex, and the wiki module scraper. It deliberately does not copy their
runtime architectures or add live web requests to the app.

## Current boundaries

- Use DE public exports and committed, generated data as the primary sources.
- Use `drops.warframestat.us` and curated wiki modules only when their data is
  structured and the source is recorded.
- Keep individual cosmetic-page prose scraping out of scope.
- Keep unique paths as identity; display names are for presentation and
  secondary matching only.
- Do not add item-specific exceptions when a shared normalization rule can fix
  the class of item.
- Keep each source family as a separately verifiable commit.

## Phase 1 — strengthen the shared acquisition model

### Files

- `src/lib/dropsParser.js`
- `src/lib/acquisitionInfo.js`
- `src/lib/acquisitionData.js`
- `src/components/AcquisitionDrawer.jsx`
- `src/contexts/MirroredMonitoringProvider.jsx`

### Changes

1. Replace source-only strings with a backward-compatible structured source:

   ```js
   {
     type: 'mission' | 'relic' | 'bounty' | 'enemy' | 'syndicate' |
       'foundry' | 'market' | 'bundle' | 'wiki' | 'manual',
     source: 'DE export' | 'drops.wf' | 'Warframe Wiki' | 'browse.wf',
     itemUniqueName,
     displayName,
     place,
     node,
     enemyName,
     rotation,
     rarity,
     chance,
     notes,
     url,
   }
   ```

2. Preserve the existing drawer contract while allowing the drawer to render
   source provenance and exact drop details when present.

3. Deduplicate by stable source identity, not by rendered text. For example,
   two rows with the same item, place, rotation, and chance should collapse even
   if their display wording changes.

4. Keep the final wiki link as a fallback, but make it visibly distinct from a
   verified acquisition source.

### Verification

- Run the real `getAcquisitionInfo()` against the bundled export data.
- Check Akbolto, a relic, a bounty reward, a syndicate item, and one genuinely
  unresolved cosmetic.
- Confirm existing resolved stages remain unchanged.

## Phase 2 — complete Foundry and blueprint resolution

### Files

- `src/lib/dropsParser.js`
- `src/lib/acquisitionInfo.js`
- `src/components/AcquisitionDrawer.jsx`
- `src/lib/inventoryParser.js`

### Export recipe model

Index every recipe by `resultType`, retaining:

- blueprint unique name
- result unique name
- `buildPrice`
- `creditsCost`
- `buildTime`
- `skipBuildTimePrice`
- `num`
- `consumeOnUse`
- ingredient unique names and counts

The recipe index must reject zero-ingredient internal conversion/finalization
entries as Foundry acquisition. This specifically protects Kuva, Tenet, and
Coda weapons from being incorrectly described as normally craftable. Explicit
blueprint-only items such as Akbolto, Braton, and Lato must continue to work
when their ingredients are real.

### Blueprint linking

Follow WFHelper's useful separation:

- `blueprintUniqueName -> resultType`
- `resultType -> recipe`
- blueprint display/icon inheritance from the resolved result
- reusable blueprint status from `consumeOnUse === false`

Do not make blueprint names or icons depend on export table load order.

### Drawer presentation

Render Foundry data as a dedicated section:

- Blueprint acquisition, if known
- Build cost and duration
- Rush cost when present
- Component rows with quantity, icon, and resolved name
- A nested source action for each component when its acquisition is known

The first regression fixture should be the real Akbolto record supplied in the
handoff. The expected output must include two Bolto, one Orokin Cell, 20,000
Credits build cost, 12-hour build time, and 25 Platinum rush cost.

## Phase 3 — normalize all structured drop families

### Source families to index

Use the flattening approach from WFHelper's `dropData.ts`, adapted to the
already-fetched app data:

- mission rotations
- relic rewards
- transient and quest rewards
- sortie rewards
- key rewards
- all bounty reward groups
- blueprint locations
- enemy blueprint tables
- enemy mod tables
- resource-by-avatar sources
- sigil-by-avatar sources
- additional avatar item sources
- syndicate offerings

The app already handles several of these in `dropsParser.js`; this phase is an
audit and consolidation, not a blind rewrite. Existing behavior should be
compared before and after.

### Export vendor handling

Do not derive vendor names from `ExportVendors` manifest identifiers. The
previous handoff documents why that produces false player-facing claims. Use a
curated wiki Vendor module only when it supplies the actual vendor name and
offering list.

## Phase 4 — finish the curated wiki modules

Implement and ship these independently, in order:

1. `Module:Sigils/data`
2. `Module:Vendors/data`
3. `Module:TennoGen/data`
4. `Module:Baro/data`

### Shared extraction rules

- Add one rerunnable script per module under `scripts/` or a shared script with
  explicit module arguments.
- Fetch with the normal wiki revisions API.
- Parse only the structured fields needed by the app.
- Write generated JSON under `src-tauri/data/assets/data/`.
- Include the module name and fetched timestamp in generated metadata.
- Never fetch wiki data during normal app use.
- Record parser errors instead of silently writing partial data.

### Sigils

Extract the category from each entry's `Link`, match by normalized display name,
and add a `wikiSigilIndex` source. Verify several categories and known missing
entries before shipping.

### Vendors

Use actual curated vendor names and offerings. Do not transform internal DE
manifest names into labels. Include the offering's source URL or module key in
the normalized source.

### TennoGen

Retain platform-specific prices and Steam links. Render this as a purchase
source, not as a Foundry or generic market source.

### Baro

Extend the existing Baro handling to cosmetics and other structured offerings;
do not replace the existing relic-specific behavior until both are covered by
real-data tests.

## Phase 5 — canonical identity and special weapons

### Files

- `src/lib/warframeItemsTransform.js`
- `src/lib/inventoryParser.js`
- `src/lib/dropsParser.js`
- relevant tests under `src/` or `tests/`

Adopt the useful part of Codex's model:

- canonical path is the primary key
- aliases are explicit
- Prime/non-Prime remain distinct
- Kuva/Tenet/Coda/Vandal/Prisma/Wraith/Dex/Gotva remain distinct variants
- modular weapon paths are classified by path markers, not loose names
- StoreItems and blueprint paths normalize to the same intended result only
  where the export proves that relationship

Add table-driven tests for representative variants and blueprint/result pairs.
The test should fail if a variant silently inherits another variant's source or
if a zero-ingredient recipe is treated as a Foundry recipe.

## Phase 6 — Cosmetics and Glyphs

This is separate from acquisition classification because the current catalog
and ownership model need a UI surface.

### Catalog

- Continue using `ExportCustoms` and `dict`.
- Split Skins and Sigils by verified unique-name path patterns.
- Add Glyphs as a third category from the structured `browse.wf` supplemental
  data, not from the weapon-skin catalog.

### Ownership

Build ownership from the union of the relevant inventory buckets, including
`WeaponSkins`, `FlavourItems`, `MiscItems`, and `ShipDecorations`. Match
normalized unique paths rather than display names.

### UI

Add a dedicated showcase-style Cosmetics screen rather than another dense
Inventory tab. Reuse the existing acquisition indexes and drawer. Include:

- All / Skins / Sigils / Glyphs
- Owned / Missing
- larger image cards
- creator/promo/giveaway details for Glyphs when supplied by browse.wf

Verify the category split against a meaningful export sample and ownership
against real save data before calling it complete.

## Phase 7 — refresh, provenance, and audit tooling

Borrow the safe operational ideas from the other repositories without adding
runtime network dependencies:

- generated-data source metadata
- fetched-at timestamp
- parser error status
- atomic replacement of generated files
- audit report grouped by fallback reason and source family
- explicit unresolved reason: no structured source, ambiguous identity, or
  parser failure

The audit script should call the shipped acquisition functions or share their
index builders. It must not maintain a second hand-written copy of the logic.

## Required verification for every phase

1. Inspect `git diff` and preserve unrelated dirty files.
2. Run the real function against real bundled export/save data.
3. Check representative positive and negative examples.
4. Run `git diff --check`.
5. Run `pnpm exec vite build` for JavaScript changes.
6. Run the full distrobox AppImage rebuild only for Rust changes.
7. State explicitly what was not live-verified, especially visual layout.
8. Commit one logical phase at a time; do not push without an explicit request.

## Suggested first implementation slice

Start with Phase 2's structured recipe object and drawer rendering, using
Akbolto as the regression case. Then implement Sigils extraction as its own
commit. This gives the app an immediately testable improvement while keeping
the wiki pipeline and the broader source normalization independently reversible.
