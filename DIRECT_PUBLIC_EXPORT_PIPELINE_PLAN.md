# Kiedas-Owned Direct Public Export Pipeline

## Status

Research and design plan only. No application code, build artifacts, generated data, or runtime behavior should be changed until this document has been reviewed and implementation is explicitly approved.

## 1. Findings

Kiedas was expected to receive new Warframe items when Warframe and WFCD updated their data. The current implementation does not provide that guarantee:

- Kiedas bundles `warframe-items` into `src-tauri/data/assets/wfcd/wfcd-combined.json` during the build `prebuild` step.
- The lockfile pins `warframe-items` to `1.1269.87`; launching the app does not update that package.
- Runtime exports are primarily refreshed from the `calamity-inc/warframe-public-export-plus` mirror.
- Kiedas' live WFCD gap-fill covers Primary, Secondary, Melee, and Skins, but not Warframes.
- The bundled snapshot had 110 Warframes and no Narin.
- Digital Extremes' current official `ExportWarframes_en.json` manifest was queried directly and contained Narin with unique name `/Lotus/Powersuits/Duelist/Duelist` and product category `Suits`.
- WFCD drop data contained Narin blueprints before the WFCD item catalog did, proving that these community pipelines can be temporarily inconsistent.

Relevant local evidence:

- Kiedas' export mirror base URL: [`src-tauri/src/main.rs`](src-tauri/src/main.rs:300)
- Kiedas' static WFCD build sync: [`scripts/sync-wfcd.js`](scripts/sync-wfcd.js)
- Kiedas' current WFCD gap-fill categories: [`src/lib/wfcdGapFill.js`](src/lib/wfcdGapFill.js:30)
- Kiedas' runtime data load: [`src/contexts/MonitoringContext.jsx`](src/contexts/MonitoringContext.jsx:595)

## 2. Inferred goal

The goal appears to be:

> Make Kiedas obtain authoritative item and export data from Digital Extremes as soon as DE publishes it, while retaining useful enrichment and drop data, without depending on another project's publication schedule or making the app fragile when an upstream source is unavailable.

This does not require removing every community source. It requires removing the avoidable freshness bottleneck for core item definitions.

Desired ownership boundary:

```text
DE Public Export -------------------- authoritative core definitions
DE official drop tables / drop data - acquisition and probability data
Kiedas-owned transforms ------------- app-compatible normalized data
Kiedas-owned cache ------------------- stable runtime input
Optional supplements ----------------- corrections and convenience data
```

## 3. Current upstream pieces

### Digital Extremes Public Export

DE publishes a language-specific compressed index, for example:

```text
https://origin.warframe.com/PublicExport/index_en.txt.lzma
```

The LZMA-compressed index resolves logical exports to hashed content-server assets such as:

```text
https://content.warframe.com/PublicExport/Manifest/ExportWarframes_en.json!<hash>
```

The index must be refreshed regularly. Successfully downloaded hashed assets can be cached by hash because a changed asset receives a new hash.

### `calamity-inc/warframe-public-export`

This is a community-maintained clean mirror of DE's raw exports. It replaces the changing hashed URLs with predictable repository files, but adds a mirror-update delay.

Repository: <https://github.com/calamity-inc/warframe-public-export>

### `calamity-inc/warframe-public-export-plus-gen`

This is a generator, not the authoritative source. It expects a local raw-export checkout plus language data, extracted package data, wiki-derived files, and hand-maintained supplements. It transforms and enriches raw exports into the `warframe-public-export-plus` layout.

Repository: <https://github.com/calamity-inc/warframe-public-export-plus-gen>

### `calamity-inc/warframe-public-export-plus`

This is the generated enriched dataset Kiedas currently uses for most runtime exports. It contains normalized exports, split localization, derived fields, and documented quirks for recipes, rewards, relics, Warframes, weapons, and other categories.

Repository: <https://github.com/calamity-inc/warframe-public-export-plus>

### `WFCD/warframe-items`

This contains reusable Public Export acquisition/parsing logic, item categorization, image handling, and additional derived data. Its scraper resolves the DE LZMA index, fetches hashed manifests, and passes them to a parser.

Repository: <https://github.com/WFCD/warframe-items>

Its source is useful; its published snapshots should not be treated as Kiedas' freshness authority.

### `WFCD/warframe-drop-data`

This separately parses DE's official drop-table data into mission, bounty, enemy, relic, and syndicate reward structures.

Repository: <https://github.com/WFCD/warframe-drop-data>

It should remain a separate source boundary because drop tables and item exports do not update atomically.

## 4. Candidate approaches

### A. Continue consuming export-plus

Lowest effort and maximum current compatibility, but Kiedas remains dependent on another project's mirror and generator update cadence. This does not meet the desired freshness ownership.

### B. Direct DE importer with a small Kiedas-specific schema

Kiedas resolves and downloads DE manifests, then normalizes only the exports it needs. This provides the strongest ownership and the smallest long-term dependency surface, but requires recreating important export-plus transformations and corrections.

### C. Direct DE ingestion plus selected export-plus transformations

Kiedas obtains raw DE files directly, then reuses or adapts the useful normalization logic from `warframe-public-export-plus-gen`. This preserves much of the existing data contract while eliminating the mirror publication delay.

### Recommendation

Use approach C, staged carefully. Start with a read-only compatibility audit and comparison output. Keep export-plus as a fallback/reference until the direct output is proven category by category.

## 5. Recommended architecture

### Source acquisition

Implement one DE manifest client, preferably on the Rust side where Kiedas already performs network downloads and atomic writes.

Responsibilities:

1. Fetch `index_<locale>.txt.lzma` from DE's origin server over HTTPS.
2. Decompress and parse the index.
3. Resolve logical export names to current hash-suffixed paths.
4. Download assets from DE's content server.
5. Validate HTTP status, JSON syntax, expected top-level keys, and reasonable sizes.
6. Cache immutable assets by content hash.
7. Build a candidate version before replacing the active version.

### Normalization

Initially target the exports Kiedas actually consumes:

- `ExportWarframes`
- `ExportWeapons`
- `ExportCustoms`
- `ExportUpgrades`
- `ExportRecipes`
- `ExportRelics`
- `ExportResources`
- `ExportRewards`
- `ExportRegions`
- `ExportVendors`
- relevant dictionaries/localization files

Where feasible, retain raw records alongside normalized fields so future schema changes can be diagnosed without another download.

### Supplements

Keep non-DE-derived data explicit and separately versioned:

- Drop-table locations and chances.
- Patch history.
- Wiki-derived acquisition explanations.
- Hand-reviewed corrections.
- External market identifiers.
- Image CDN fallbacks.

Supplements must not silently overwrite authoritative DE fields. Each should record its source, revision, refresh time, and authority level.

### App-facing cache

Kiedas should consume a versioned local cache rather than live responses during normal UI parsing. The cache should include:

- source manifest names and hashes;
- generation time and locale;
- normalized exports;
- supplements and provenance;
- validation results;
- a pointer to the prior known-good version.

## 6. Update behavior

The app should start from the last-known-good cache, then refresh in the background:

1. Check the DE index.
2. Download only changed assets.
3. Generate a candidate cache in a temporary versioned directory.
4. Run structural, semantic, and differential validation.
5. Atomically activate it only if validation succeeds.
6. Notify the app that newer data is available.
7. Reload at a safe boundary rather than mutating data during an active parse.

A manual refresh action can use the same pipeline, but network access should not be required for startup.

## 7. Validation

### Source checks

- Origin index downloads and decompresses.
- Required logical exports resolve to one current asset each.
- Content assets return successful responses.
- JSON parses successfully.
- Expected top-level keys exist.

### Semantic checks

- Known baseline entries remain present.
- Narin appears when DE publishes it.
- Unique names are non-empty and unique within expected categories.
- Required Kiedas fields remain available or are explicitly adapted.
- Recipe and reward references resolve where expected.
- Localization keys remain consistent.
- Item counts do not collapse unexpectedly.

### Differential checks

Compare the candidate direct-DE output against:

- the previous Kiedas cache;
- the current export-plus data;
- optionally WFCD item data for diagnostics.

Differences should be reported by category and severity. The system must not blindly prefer whichever source contains more records.

### Provenance checks

Record DE index retrieval time, resolved content hashes, cache generation time, drop-data revision, and supplement revisions. This allows us to answer which source knows about an item and how current that source is.

## 8. Benefits

- New DE-published Warframes and items can appear without waiting for WFCD publication.
- Kiedas controls refresh frequency, validation, and rollback.
- The current export-plus schema can be retained during migration.
- Source disagreements become visible instead of silently hidden.
- A last-known-good cache protects offline use and upstream outages.
- Direct DE data can be adopted category by category.

## 9. Downsides and risks

- DE's Public Export is authoritative but not a stable application API; Kiedas would own schema maintenance.
- Direct ingestion cannot show data before DE publishes the necessary record.
- Raw exports do not replace patch logs, human-readable acquisition notes, all market metadata, or every convenience field.
- Localization and image-hash handling add complexity.
- Reusing the complete generator may require Pluto tooling and many supplemental repositories/files.
- Porting only selected transformations requires careful behavior comparison.
- Direct fetching must be rate-limited and must not poll per screen or per item.
- Trying to recreate all of export-plus immediately would create an unnecessarily large project.

## 10. Proposed phases after approval

### Phase 0: Read-only compatibility audit

No app behavior changes. Inventory Kiedas' exports and supplements, resolve current DE manifests, compare raw DE output with export-plus, classify fields as direct/renamed/derived/manual, and produce a per-export compatibility ledger.

### Phase 1: Standalone prototype

Create a disposable command-line fetch/normalize tool. Produce versioned output and validation reports without changing Kiedas runtime data.

### Phase 2: Kiedas-owned cache

Add provenance metadata, atomic replacement, rollback, offline behavior, and manual refresh. Continue using export-plus as the runtime source.

### Phase 3: Shadow mode

Refresh direct-DE data in parallel, log differences, and test new items, changed items, recipes, icons, localization, and drops.

### Phase 4: Narrow adoption

Use direct-DE data first for Warframes as the proof of value, with export-plus fallback for unmigrated categories.

### Phase 5: Broader migration

Migrate weapons, customs, recipes, upgrades, relics, and resources as each category passes validation. Remove stale static snapshots only after the replacement is proven.

## 11. Success criteria

- Kiedas can resolve the current DE manifest without a community mirror.
- A DE-published Warframe such as Narin appears in candidate data without waiting for WFCD.
- Existing Kiedas screens continue to parse the normalized output.
- Drop data remains available and correctly associated.
- Failed refreshes preserve the previous working cache.
- Every generated record has source and freshness provenance.
- Schema changes cause visible validation failures rather than silent corruption.
- Startup remains usable offline and does not block on network access.

## 12. Decisions for review

1. Should the end state be a Kiedas-owned generated repository, a local runtime cache, or both?
2. Should we adapt the generator wholesale or port only the transformations Kiedas needs?
3. Which export-plus supplements are essential, optional, or removable?
4. Should drops remain sourced from WFCD, or should Kiedas also own a direct drop-table parser?
5. What freshness target is required: minutes, hours, or daily?
6. Which locales are required initially?
7. Should the proof of value target only Warframes first, or all current export dependencies?

## Recommendation

Build a Kiedas-owned, validated direct-DE acquisition/cache layer; reuse selected normalization and supplement logic from the existing projects; keep drops and non-DE-derived metadata as explicit separate sources; and migrate categories gradually after shadow-mode comparison.

## Addendum (2026-09-23 session): cosmetics/glyph scope, verified against live sources

Follow-up investigation into exactly what a direct-DE pipeline would and would
not cover for cosmetics, prompted by "would this cover cosmetics too?" and a
user-supplied correction. Everything below was checked against the live DE
manifest and live browse.wf endpoints directly, not assumed.

### DE's real manifest — the complete, current category list

Fetched `https://origin.warframe.com/PublicExport/index_en.txt.lzma` directly
and decompressed it. DE currently publishes exactly 16 top-level export
categories: `ExportCustoms`, `ExportDrones`, `ExportFlavour`,
`ExportFusionBundles`, `ExportGear`, `ExportKeys`, `ExportRecipes`,
`ExportRegions`, `ExportRelicArcane`, `ExportResources`, `ExportSentinels`,
`ExportSortieRewards`, `ExportUpgrades`, `ExportWarframes`, `ExportWeapons`,
plus `ExportManifest.json`. (Also saved locally: the Warframe Wiki's own
`Public Export` page, `wiki_pdf_archive/Public Export.pdf`, for future
cross-reference without re-fetching.)

### Correction: `ExportFlavour` contains the full glyph catalog

An initial pass wrongly concluded DE doesn't publish glyphs at all (checked
`ExportGear` — wrong file — and found nothing). Checking `ExportFlavour_en.json`
directly instead: **1,723 real `/Lotus/Types/StoreItems/AvatarImages/...`
entries**, each with a real `name` and `description` (e.g. "Common Condroc
Glyph", "A Glyph for your profile."). So a direct-DE pipeline *does* cover the
full glyph catalog (existence, names, descriptions) - same as skins/sigils
(`ExportCustoms`), emotes (`ExportFlavour`, same file - Kiedas already reads
this file for emotes), and decorations (`ExportResources`). Section 5's
"Normalization" target-export list above should explicitly include
`ExportFlavour` (it names the categories Kiedas already consumes, and this
confirms `ExportFlavour` is one of them, covering both emotes and glyphs).

### What DE's export does NOT cover: Creator Glyph promo/redemption info

Creator/Partner Glyph redemption details (Twitch handles, promo codes, "sub
for X" instructions) are not DE-published data under any category - they're
information about individual content creators' own channels. Traced Kiedas'
current source (`src-tauri/data/assets/data/browse-wf-glyphs.json`) to its
origin:

- `browse.wf` (the site Kiedas already uses as an image CDN fallback) is
  itself a lookup/browse UI built on top of `warframe-public-export-plus`
  (the same frozen mirror this whole plan is about replacing) - confirmed via
  its own `/about` page, which lists `warframe-public-export-plus`'s export
  categories as its data source.
- Its Glyphs tool (`https://browse.wf/glyphs`) combines three fetches (found
  by reading the page's own JS):
  `https://browse.wf/warframe-public-export-plus/ExportFlavour.json` (base
  catalog - same DE data as above),
  `https://browse.wf/warframe-public-export-plus/ExportImages.json` (icons),
  and **`https://browse.wf/supplemental-data/glyphs.json`** - browse.wf's own
  small, hand-maintained file, 482 entries as of this check, keyed by
  uniqueName with fields like `promo_code`, `twitch`, `discord`, `markdown`.
- Confirmed this live URL matches Kiedas' local `browse-wf-glyphs.json`
  almost exactly (same shape, same first entry
  `AvatarImageCreatorAGGP` -> `"AGayGuyPlays"`; live has 482 entries vs
  Kiedas' local 484 - barely drifted, not badly stale).

**Conclusion:** even a full direct-DE migration would still need this one
small external, hand-maintained supplement for Creator Glyph redemption
details specifically - that piece isn't DE data and never will be. Everything
else about cosmetics (existence, names, descriptions, images) becomes fully
DE-direct.

### Tool evaluated and rejected: `n5za/warframe-code-checker`

User-suggested; checked directly. It's a Playwright browser-automation tool
that logs into a real Warframe account and *redeems* codes one at a time on
the official `warframe.com/promocode` page to test validity - not a data
source. Rejected for this pipeline: redemption consumes one-time-use codes on
whatever account runs it, it automates past reCAPTCHA on DE's real login/promo
flow (real ToS/account-risk territory), and its output (a redeemability
verdict) isn't the glyph metadata (creator, description, which glyph) this
pipeline actually needs. Not integrated anywhere.

### Quick win identified, independent of the full pipeline

`browse-wf-glyphs.json` is currently a static local file, never refreshed.
Since `https://browse.wf/supplemental-data/glyphs.json` is small (~109KB),
directly fetchable, and already-trusted (same domain Kiedas already pulls
images from), this can be wired into the existing periodic-refresh mechanism
on its own, well before any decision on the larger direct-DE pipeline - low
risk, immediate freshness improvement for the 2 unresolved Creator Glyph
identity questions and any new creators browse.wf has added since Kiedas'
local copy was taken. Not yet implemented - queued as its own small task.
