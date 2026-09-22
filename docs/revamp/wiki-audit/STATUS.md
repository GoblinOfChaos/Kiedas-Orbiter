# Wiki-driven item audit — overnight status (2026-09-09)

## What this is

A redo of the app's item/acquisition/description data, triggered by the
Floof bug (50+ cosmetic variants got wrong acquisition data merged onto
similarly-named base items). Core rule agreed with the user: **no text is
better than wrong text** — nothing gets auto-written unless the match is
unambiguous and traceable to an exact source, matched by internal item
path (`InternalName`/`uniqueName`), never by display-name similarity.
Pilot category: **Cosmetics**.

Nothing in this pass has touched `acquisition_overrides.json`,
`acquisitionData.js`, or any file the running app reads. Everything below
is staged for review, not merged.

## What's done and verified tonight

1. **Found the wiki's own structured backing data.** Every rendered wiki
   page is built from Lua data tables in the `Module:` namespace
   (`Module:Cosmetics/data/*`, `Module:Resources/data`, etc.) — the same
   source the wiki itself renders from. These carry an exact `InternalName`
   field matching the game's own internal item paths (the same scheme the
   app already uses as `uniqueName`), plus verbatim `Description` text.
   This sidesteps the name-similarity ambiguity that caused the Floof bug.

2. **Downloaded the full Module: namespace inventory.** 643 pages
   enumerated via the wiki's own API (`wiki_module_archive/_titles` list at
   `/tmp/.../module_titles.json` — should be copied somewhere permanent if
   this is picked back up, it's in a session scratch dir). Filtered to 145
   real data tables (excluding docs/dev/sandbox/test pages) plus all 201
   `/doc` schema-reference pages. All fetched as raw wikitext/Lua source
   into `wiki_module_archive/` (zero failures on the 145 data tables, 1
   harmless failure on an irrelevant utility doc page).

3. **Built a real Lua parser, not a regex guess.** Installed Lua 5.4 in the
   `dev-fedora` distrobox (isolated container, doesn't touch the host) and
   wrote `scripts/lua_to_json.lua` — loads each table as actual Lua code
   (stubbing `mw.*` wiki-formatting calls and `require()` of sibling
   modules, which several aggregator files need) and serializes the real
   result to JSON. This is exact, not an approximation: verified the
   parsed `Eevani` resource entry byte-for-byte against the raw source and
   an earlier independent fetch.

4. **Converted 142 of 145 data tables to clean JSON** in
   `wiki_module_json/`. The 3 failures (`Baro/data/visits`,
   `Tooltips/data`, `Worldstate/data*`) are non-item utility/meta pages —
   irrelevant to the catalog, not a gap.

5. **Found and confirmed real cross-category acquisition sources for
   Cosmetics** that the base `Module:Cosmetics/data` table doesn't itself
   carry: `Module:Baro/data` (exact credit/ducat cost + every offering date
   for Baro-sold cosmetics) and `Module:Vendors/data` (Syndicate standing
   costs for cosmetics like armor sets). Confirmed by reading real entries,
   not assumed from category names — `Module:Cosmetics/data` alone is
   NOT a complete acquisition source for its own category.

6. **Pulled DE's own live `ExportCustoms` manifest directly** (the
   official ground truth per this repo's own rules, not the wiki) via the
   real PublicExport index/hash lookup — 4,763 cosmetic entries, saved to
   `wiki_module_json/DE_ExportCustoms_ground_truth.json`.

7. **Ran the three-way existence diff** (wiki `InternalName` vs DE
   `uniqueName`, canonicalized the same way `inventoryParser.js` already
   does — stripping `/StoreItems/`):
   - 3,676 items matched cleanly in both.
   - **1,087 items** exist in DE's current export but have **no entry at
     all** in the wiki's Cosmetics data →
     `cosmetics_in_DE_export_not_in_wiki.json`.
   - **246 items** the wiki documents but DE's current export doesn't have
     → `cosmetics_in_wiki_not_in_DE_export.json`.
   - 804 wiki entries had no `InternalName` field at all (couldn't be
     matched either way).

## Known caveats on the diff numbers — NOT yet a finished audit

Read `cosmetics_in_wiki_not_in_DE_export.json` with suspicion before
acting on it. Spot-checking the sample turned up likely **false
positives from the diff method itself**, not real gaps:

- Several entries are Kubrow/Kavat pet color swatches
  (`/Lotus/Types/Game/KubrowPet/Colors/...`) — these may live in a
  different DE export category entirely (not `ExportCustoms`), so their
  absence here doesn't mean they don't exist in-game.
- Some are Liset (ship) skins — same concern, may be a different export
  category.
- TennoGen items may use a different `InternalName` convention that
  doesn't line up cleanly with this comparison.

**Do not treat either diff list as a final "add these" or "remove these"
list.** They're real raw material — a next pass needs to check each
flagged item against the *right* DE export category (or the item's own
wiki article page) before concluding it's a genuine gap, exactly the
per-item verification discipline this whole redo exists to enforce. This
is the same class of mistake ("looked like a clean signal, wasn't")
this project is trying to eliminate — so it gets flagged here rather than
presented as a finished result.

## What's NOT done yet (the harder, riskier part — deliberately not rushed)

- **No acquisition-text resolution has been attempted yet.** The join
  chain (item → `Blueprints`/`DropTables`/`Baro`/`Vendors`/`Syndicates` →
  final acquisition sentence) is designed (see conversation) but not
  built. This is the part with the most room for the same kind of error
  that caused the Floof bug, so it's not something to build and run
  unsupervised for the first time overnight.
- **No wikitext-prose fallback fetching done yet** for items with no
  structured join (confirmed pattern: most Ephemeras have zero
  acquisition fields in Module data and need their own article page's
  `==Acquisition==` section read individually).
- **The three output buckets (clean / ambiguous / no-data-found) don't
  exist as real files yet** — only the raw existence diff does.
- **The `/doc` schema pages haven't been read category-by-category yet**
  to confirm which categories are "fully structured" (like TennoGen, which
  has `PcPrice`/`SteamLink` built in) vs "needs the wikitext fallback"
  (like plain Ephemeras/Skins).

## Suggested next session

1. Read the `/doc` page for each Cosmetics subcategory to map out which
   are fully structured vs need fallback (this was the last thing planned
   before the user said "just get it done tonight").
2. Re-verify the 246 "wiki not in DE" list against the correct DE export
   category per item before concluding anything's actually missing.
3. Build the join-resolution pass for the categories confirmed fully
   structured first (lowest risk, e.g. TennoGen) before tackling the
   wikitext-fallback categories.
4. Only once a batch of "clean" results exists should it go in front of
   the user for a spot-check, before any of it touches
   `acquisition_overrides.json`.
