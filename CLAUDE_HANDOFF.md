# Handoff — Kieda's Orbiter

Written 2026-08-13 by Claude, handing off to Codex because the user is near their weekly session limit. Repo is clean — everything below is already committed on `master`. Nothing is in progress or half-finished.

**The user will be asleep and cannot verify anything live tonight.** This raises the bar on self-verification specifically: don't mark something done on the strength of "the build passed" alone. Every acquisition-classification change this session was verified by running the real function against real bundled data and checking real example output before committing (see "Verification methodology" below) — that discipline is the only safety net available overnight, so do not skip it to move faster. If something can't be verified without live human testing (e.g. does a screen actually render correctly, does a Rust change actually work end-to-end after a distrobox rebuild), say so explicitly in the commit message / a note for the user rather than asserting it works.

## Codex investigation — Voruna still appears as Never Obtained (2026-08-16)

**Status: unresolved. Do not tell the user this is fixed.** The user explicitly reported that Voruna still appears in Relic Planner's `Never Obtained` list after the fixes below and asked for this report instead of another speculative fix.

### User-visible symptom

The user has a Voruna-related item actively building in Foundry, but Relic Planner still lists Voruna parts as never obtained. The exact live item label (normal `Voruna` versus `Voruna Prime`) was not captured in the latest report, so that distinction must be established from runtime data or a screenshot before changing semantics. The previous response incorrectly concluded this was probably a normal-versus-Prime misunderstanding; the user said that explanation did not solve it.

### Changes attempted, in order

1. Commit `4979780` (`Fix Foundry ownership and duplicate recipe counts`): Foundry cards recognize blueprint counts and pending recipes as owned; duplicate recipe ingredients are allocated correctly.
2. Commit `9f9da0c` (`Count consumed recipe parts as relic history`): `src/lib/relicParser.js` added `foundryUnique`/`foundryNames` evidence and tried to infer consumed components from each pending recipe's `ExportRecipes` entry. Component identities ending in `Component` were also mapped to the corresponding `Blueprint` identity.
3. Commit `1e2cd17` (`Preserve Foundry inputs for relic ownership history`): `src/lib/inventoryParser.js` now preserves `recipeIngredients` on every `inventoryData.foundry` record; `relicParser.js` prefers those preserved ingredients and falls back to an `ExportRecipes` lookup. The frontend build passed and the distrobox AppImage was rebuilt.

Latest packaged AppImage hash after `1e2cd17`:

```text
68226fbbd4f6135cf935153ed7ceef169c08755555c334749049d532eb0719cf  /home/jedwards/AppImages/kiedas_orbiter.appimage
```

The user still reports the symptom after using the rebuilt app. Treat this as evidence that the assumed identity path is wrong or that the live app data does not contain the expected pending recipe—not as evidence that another equivalent patch should be layered on top.

### Relevant implementation paths

- `src/screens/RelicPlanner.jsx`: builds `partStatuses` with `getPartObtainedStatus(p.uniqueName, p.name, inventoryData, exportData, 'en')`.
- `src/lib/relicParser.js`: computes `directOwned`, `everObtained`, and pending-Foundry evidence; `getPartInventoryIndex()` indexes inventory and Foundry records.
- `src/lib/inventoryParser.js`: converts `raw.PendingRecipes` into `inventoryData.foundry`; `recipeIngredients` was added here.
- `src/contexts/MonitoringContext.jsx`: parses raw inventory and replaces `inventoryData`; this is the place to verify the actual live parsed object.

### Confirmed bundled export identities

The bundled release export contains these Prime recipes:

```text
/Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeBlueprint
  resultType: /Lotus/Powersuits/Werewolf/VorunaPrime
  ingredients:
    /Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeHelmetComponent
    /Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeChassisComponent
    /Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeSystemsComponent

/Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeHelmetBlueprint
/Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeChassisBlueprint
/Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeSystemsBlueprint
```

Relic rewards use the `...Blueprint` paths under `/Lotus/StoreItems/...`; `relicParser` normalizes `/StoreItems/` away and lowercases identities. A pending parent recipe should therefore require this evidence chain:

```text
raw.PendingRecipes[].ItemType
 -> inventoryData.foundry[].unique_name
 -> ExportRecipes[parent].ingredients[].ItemType (...Component)
 -> replace Component with Blueprint
 -> match relic reward uniqueName (...Blueprint)
```

### What must be captured next (before any more code changes)

Use a temporary development-only diagnostic or an existing runtime inspection path to capture one real refresh while the user's Voruna item is in Foundry. Record, without guessing:

1. `inventoryData.foundry` entries: `ItemType`, `unique_name`, `result_type`, `name`, `parentName`, and `recipeIngredients`.
2. The exact `allParts` entries whose display name contains `Voruna`: `uniqueName` and `name`.
3. The exact `getPartObtainedStatus()` inputs and output for each Voruna part.
4. Whether the item in Foundry is normal Voruna or Voruna Prime.
5. Whether the Relic Planner entry is a blueprint reward or a component reward.
6. Whether the user is running the AppImage whose embedded frontend contains commit `1e2cd17`; do not infer this from the source checkout alone.

The diagnostic must be removed before committing unless it is intentionally made into a safe debug facility. Do not use synthetic data as proof. The earlier attempted Node import failed because this project uses extensionless Vite imports (`warframeUtils`), so a real Vite/browser-side diagnostic or a properly configured Vite test harness is required.

### Likely failure classes to distinguish

- The Foundry record is for normal Voruna while the Relic Planner entry is Voruna Prime. In that case, keeping Voruna Prime parts as never obtained is correct; do not broaden matching by display-name prefix.
- The Foundry record is for Voruna Prime, but `raw.PendingRecipes` uses a different identity (for example a StoreItems path, a result path, or a recipe key not present in the parsed `ExportRecipes` map). Capture it and add a verified identity normalization, not a name-only exception.
- The parent Foundry recipe is not present in `raw.PendingRecipes` at all, and the UI is deriving the Foundry card from another raw inventory field. If so, the current `inventoryData.foundry`-based historical approach cannot work; identify the authoritative raw field first.
- The user is viewing a stale running process or a different AppImage path. Verify the running executable path and embedded asset/hash before changing source.
- `partInventoryIndexes` is caching an index for an inventory object before Foundry data is available. Verify object identity and update timing; do not remove the WeakMap cache blindly without evidence.

### Required verification standard

Do not mark this resolved from `vite build`, an AppImage build, or a synthetic Voruna object. The next handoff owner must reproduce the real parsed Voruna records, show the exact identity comparison that returns false, fix that comparison, run the frontend build, rebuild through distrobox, and state explicitly whether live UI verification remains outstanding.

## What happened this session

### 1. Settings data loss — fixed for real (`06b09c6`)

Long-running bug: settings.json would periodically lose keys (disclaimer-accepted, cache path, notif sound, fissure monitor) and the app would re-show first-run setup. Root cause turned out to be **two separate problems**, both now fixed:

- Six different Rust commands (`save_settings`, `set_setting`, `set_notification_sound`, `auto_detect_warframe_monitor`, `set_target_monitor`, `set_sidebar_width`, plus a screenshot-permission probe in `app.setup()`) each did their own unguarded read-modify-write to `settings.json`. Only two of them held the `settings_lock` mutex. All six now do.
- Every write used `fs::write()`, which truncates the file before writing new content. If the process was killed between truncate and write-complete (e.g. closing the window during a rebuild-test cycle), the file was left corrupt on disk — a corruption no amount of locking can fix retroactively, because it already happened before the next launch. Added `write_json_atomic()` (temp file + rename) and switched every writer to it.
- `load_settings` also had no lock, so a read from another window could land mid-write and see a truncated file. The frontend's "empty settings = fresh install" migration logic then did a **destructive full overwrite** from stale `localStorage`, which is what actually caused the data loss. `load_settings` now holds the lock too.

Verified across multiple real rebuild+relaunch cycles: settings held (checked file content directly, not just "it seemed fine").

### 2. Issue #97 (Prime Resurgence tab) — closed

Was already implemented in an earlier session (`0b25ebe`). This session found and fixed one real bug: Varzia's rotation API includes `/Lotus/StoreItems/Types/Game/Projections/...` entries — internal "spend Aya for a random relic-tier reward" tokens, not real items — which were slipping through the bundle-package filter and rendering as blank always-missing cards. Fixed in `c2e9ade`. Verified against real inventory data via a scratch harness (see Methodology below). Issue closed with a comment.

### 3. Issue #95 (acquisition drawer fallback) — major progress, still open

Background: the acquisition drawer (in Mods/Inventory/Relics screens, `src/lib/acquisitionInfo.js`) tells the user where to get an item. Started this session with 7,614 of ~11,000 catalog items showing a generic "no specific source known" message. Ended at **3,065 resolved**, via a chain of DE-sourced (never wiki-scraped, never guessed) classifications added to `getAcquisitionInfo()` in `src/lib/acquisitionInfo.js`:

1. **Focus tree / quest keychain** path-pattern matching (126 items) — `366230e`
2. **Foundry recipe matching** via `ExportRecipes.json` `resultType` + `warframe-items`' own `components[]` field (777+314 items, some overlap) — `da68655`, `d0f9c5f`
3. **Market price** via `ExportCustoms.json`'s `platinumCost`/`excludeFromMarket` fields (1,263 items) — `5b7b187`
4. **Market bundles** via `ExportBundles.json`'s `components[].typeName` (already-fetched file, never inspected before) — `28179b6`
5. **Syndicate rank offerings** via `ExportSyndicates.json`'s `favours[]` array (817 items, includes the Cavia/NecraLoid rank-title sigils) — `558d718`

**Two real bugs were found and fixed mid-session — both worth understanding before adding more:**

- **Vendor-name labeling was shipped, then reverted** (`8234999` → `c836679`). Added `ExportVendors.json` and derived a "vendor name" by text-transforming the manifest's internal PascalCase identifier (e.g. `InfestedLichWeaponVendorManifest` → "Infested Lich Weapon"). The user caught it live: Coda Bassocyst was labeled "Sold by Infested Lich Weapon" when the real in-game vendor is Eleanor. Checked all 79 derived names — some were real NPC names (Acrithis, Teshin, Hunhow), many were internal-only system labels. No reliable way to tell which without game-knowledge verification per entry, so the whole feature was reverted. **Lesson: a manifest's own internal identifier is not the same thing as a verified player-facing name. Don't trust field-name-implies-meaning without checking real sample values.**
- **Kuva/Tenet Lich weapons were wrongly labeled "Built in the Foundry"** (`00d4c6a`, fixed same session, not reverted). Both craftable-detection paths (`ExportRecipes` and `warframe-items` `components[]`) technically have entries for these weapons, but with zero real ingredients — just a blueprint placeholder. That's DE's internal plumbing for finalizing the weapon after Lich/Sister conversion, not a real Foundry build. Fixed by requiring real ingredients/materials (`ingredients.length > 0`, `components.length > 1`) before calling something craftable. Also caught a similar trap before shipping the syndicate fix: a `rankUpReward:true` flag looks like "awarded for free" but 1,393/1,412 such entries still cost standing — wording is based on the actual cost value, not the flag.

**The user's standing instruction, learned the hard way this session: don't trust that a field being present proves what it appears to prove. Check real sample values before shipping a claim, and prefer spot-checking live in the app over trusting your own verification script's confidence.** Two bugs above were caught by the user testing the live app, not by my own verification passes — my spot-checks used cherry-picked samples that happened to be correct.

### Verification methodology used throughout

For every acquisition-classification change: copy the relevant real bundled export files into the scratch dir, run the actual `getAcquisitionInfo()`/`buildXIndex()` functions against real data (not synthetic), cross-reference results against `scripts/data-sources/acquisition-audit-report.json` (regenerate fresh with `node scripts/audit-acquisition-fallbacks.mjs` — note this script is a known-stale hand-replica of the real logic, useful for enumerating candidate items but don't trust its own resolved/unresolved counts as ground truth), and check real example output makes sense before committing. Scratch dir used: `/tmp/claude-1000/-var-home-jedwards-kiedas-orbiter/143defc5-053b-49e0-9d55-fb1f096bb2de/scratchpad/verify/` (session-specific, may not exist in a new session — recreate the pattern: copy `acquisitionInfo.js` + a stub/real `acquisitionData.js`, patch the relative import to `.js` extension for Node ESM, run against real files under `~/.local/share/kiedas-orbiter/data/export/`).

**Always `git checkout -- scripts/data-sources/` after running the audit script for verification** — its output is regenerated JSON/markdown that becomes stale the moment the audit script itself doesn't match the shipped code, and committing it creates a misleading snapshot.

## Build / test process

- JS-only changes: `pnpm exec vite build` (from repo root, needs `$HOME/.local/share/pnpm` and `$HOME/.nvm/versions/node/v24.19.0/bin` on PATH) is sufficient to verify compilation. Fast, no distrobox needed.
- Rust changes (`src-tauri/src/main.rs`) need the full rebuild: `distrobox enter dev-fedora`, then `bash /var/home/jedwards/kiedas-orbiter/scripts/rebuild-appimage.sh`. The host machine (Bazzite) lacks `webkit2gtk-4.1`/`libclang` so `cargo check` cannot run outside the container. **Never launch the built app from inside the distrobox** — it breaks the live memory-scanning feature (container namespace boundaries block `/proc/<pid>/mem` reads to host processes). Always launch via the desktop shortcut after exiting the container.
- Full Linux build command (from memory, cross-session): `NO_STRIP=1 pnpm tauri build --bundles appimage`, not plain `pnpm tauri build`.

## Next up: wiki Lua data module pipeline for #95 — scoped, ready to build

Found a real path to close most of the remaining ~4,500 unresolved `#95` items: the warframe.com wiki hosts hand-maintained, structured Lua data tables, accessed via the wiki's standard public `api.php?action=query&prop=revisions` (a normal GET, no auth) — fundamentally different from (and more reliable than) the Scribunto-console scraper this app already retired earlier in its history, because these are curated key-value tables maintained as data by wiki editors, not free-text prose requiring interpretation. Fetch pattern, verified live tonight:

```bash
curl "https://wiki.warframe.com/api.php?action=query&prop=revisions&titles=Module:Sigils/data&rvslots=main&rvprop=content&format=json"
```

Response is JSON; the actual content is Lua source at `query.pages.<pageid>.revisions[0].slots.main['*']`, a real Lua table literal (e.g. `["Sigils"] = { Description = "...", Link = "Sigils#Nightwave Sigils" }` — see the raw dumps this session pulled for the exact shape of each module before writing a parser).

**Build order — do Sigils first, in isolation, fully verified and shipped, before touching anything else:**

1. **Fetch + parse `Module:Sigils/data` only.** Write a script (mirror `scripts/extract-warframe-items-acquisition.mjs`'s style: one-time/re-runnable, output to `src-tauri/data/assets/data/`) that fetches the module via the URL above and converts the Lua table to JSON. The table is a flat `["Item Name"] = { Description, Image, Name, Link, SellPrice }` map — simple enough for a small hand-written parser (Lua table literals here are just nested `{ key = value, ... }` with strings/numbers, no functions/metatables to worry about); don't reach for a full Lua VM/interpreter dependency for this.
2. **Extract only the `Link` field's category** (e.g. `"Sigils#Nightwave Sigils"` → category `"Nightwave Sigils"`) per item name, and only keep entries that map to a category — this is the acquisition-relevant part, not `Description`/`Image`/`SellPrice`.
3. Match extracted item names against the app's own Sigil catalog by **display name** (this wiki module is keyed by name, not DE uniqueName, so matching goes through `displayName` the same way `acquisitionInfo.js`'s existing `display:` key fallback already does for relics — follow that precedent, don't invent a new matching scheme).
4. Add `buildWikiSigilIndex()`-equivalent to `src/lib/acquisitionInfo.js`, same pattern as every other `buildXIndex()` this session: pure function taking the pre-fetched JSON, returns a `Map`, checked in `getAcquisitionInfo()` after the syndicate check.
5. **Verify against real data exactly like every fix this session**: cross-reference against a freshly regenerated `scripts/data-sources/acquisition-audit-report.json`, spot-check real example output, confirm no regression on already-resolved items. Then `pnpm exec vite build`, commit, comment on #95 with real numbers.
6. **After Sigils is shipped and confirmed working**, continue through the rest of the list in this order — this is a checklist to work through, not a single item with three optional extras:
   1. `Module:Vendors/data` — real vendor names, keyed by actual NPC name (e.g. "Acrithis") with a real `Offerings` list. This is the correct fix for the vendor-labeling feature that got reverted this session — do NOT re-derive names from `ExportVendors.json` manifest identifiers, use this module's real curated names instead.
   2. `Module:TennoGen/data` — a distinct acquisition category this app has zero coverage of: player-made skins sold via Steam Workshop/console store. Real fields per entry: `PcPrice` (Steam, dollar amount), `ConsolePrice`, `SteamLink`. Worth its own message text, e.g. "TennoGen skin — purchased via Steam Workshop for {PcPrice}."
   3. `Module:Baro/data` — extends the existing relic-only Baro handling (`src/lib/baroRelics.js`) to his cosmetic offerings too.

   Do each as its own verified, committed step (fetch → parse → build index → verify against real data → build → commit → comment on #95 with real numbers) rather than batching all three into one unverified pass — same discipline as every fix earlier this session.

**Important scope correction — do not assume this closes "most of #95":** only `Module:Sigils/data` has a structured acquisition-category field (`Link` pointing to a category section like `"Sigils#Nightwave Sigils"`). The equivalent Skin-specific modules (`Module:Cosmetics/data/weaponskin`, `/armor`, `/syandana`, etc. — checked live, confirmed) do NOT have this field; their `Link` just points to the item's own wiki page, with no acquisition category encoded anywhere in the structured data. Going further for ordinary Skins (the largest remaining bucket, 2,000+ items) would mean scraping individual wiki pages' prose for an "Acquisition" section — the same fragile, per-page approach this app already retired earlier in its history for being unreliable. Do not attempt that. Once Sigils/Vendors/TennoGen/Baro are done, the bulk of ordinary Market-bought Skins with no bundle/vendor/syndicate tie genuinely has no better structured source available than what's already shipped — that's a real, accepted ceiling, not a gap to keep chasing.

**Caching/refresh**: these aren't part of the existing `EXPORT_FILES`/`DROPDATA_FILES` Rust-side fetch pattern (which is for DE's own export mirror). Simplest correct approach: treat like `scripts/sync-wfcd.js` — a manually-rerun Node script producing a committed JSON file under `src-tauri/data/assets/data/`, not a live runtime fetch from the Tauri backend. Wiki content changes slowly; there's no need for the app itself to fetch this at runtime.

**Do not skip step 5's live-data verification for the sake of speed** — this session's two real bugs (vendor-name derivation, Kuva/Tenet false-craftable) both happened because a plausible-looking field was trusted without checking enough real sample values first.

## Standing project conventions (from user feedback this session and earlier)

- Never guess or infer acquisition data. A wrong claim is worse than the generic "no specific source" fallback. Every classification this session is traceable to a real, checkable field on real sample data.
- Commit in small logical chunks, verify before each commit (build + real-data check), write commit messages that explain *why*, not just *what*.
- Don't narrate the conversation/collaboration process in GitHub comments, PR descriptions, or commit messages — no "you pushed back and it turned out...". State findings as facts about the code/data.
- User has standing permission to commit without per-commit confirmation, but NOT to push without an explicit ask.

## New feature: Cosmetics screen (Skins + Sigils) — sketched, ready to build

User's direction: cosmetics deserve their own top-level screen with bigger, more visual cards ("showcase" them), not another dense Inventory tab. This is also the actual home for all the Skins/Sigils acquisition-drawer work done this session — that data has no UI surface at all right now (confirmed live: `inventoryData.all`'s real categories are `Arcanes, amps, archweapons, archwings, beasts, consumables, kdrives, melee, necramechs, primary, prime_parts, resources, rivens, secondary, sentinels, warframes, zaws` — no Skins/Sigils category exists anywhere in this app's own catalog builder, `src/lib/inventoryParser.js`). Building this screen is what makes tonight's #95 work actually reachable by a user.

### Why not an Inventory tab

Inventory already has 15 tabs (`INVENTORY_TABS` in `src/screens/Inventory.jsx`) built around dense, compact tracking cards — the established visual language across the whole app for equipment/progress tracking. Cosmetics need a different visual job (show what it looks like, not just owned/missing state), so cramming it in as tab #16 would either force it into the dense style (defeating the point) or look inconsistent next to its neighbors. The app already has precedent for pulling out thematically distinct content into its own top-level screen: `Collectibles` (lore fragments) and `Prime Resurgence` (Varzia's rotation) both did exactly this.

### Data source (all already fetched, DE-sourced, no new network calls needed for the catalog itself)

- **Catalog**: `exportData.ExportCustoms` — already fetched (`src-tauri/src/main.rs` `EXPORT_FILES`), dict-keyed by uniqueName, each entry has `name` (dict-lookup key), `icon`, `productCategory`, `tradable`, `platinumCost`, `excludeFromMarket`. This is the full list of Skins + Sigils + other cosmetics DE ships. Filter to `productCategory` values relevant to Skins/Sigils (check real values across the export — confirmed at least `"WeaponSkins"` exists as a productCategory on both a real Skin and a real Sigil entry, so productCategory alone probably isn't the right split field; may need path-based filtering similar to how `inventoryParser.js`'s `extractModCategory()` already does path-pattern category detection — `/Upgrades/Skins/Sigils/` for Sigils vs other `/Upgrades/Skins/...` paths for Skins. Verify against a real sample dump before committing to a filter rule, same discipline as every other fix this session).
- **Display names**: resolve `dict[entry.name]` — `dict.json` is already fetched and available as `exportData.dict`.
- **Images**: use `resolveAnyImage(uniqueName, EI, nameToImage)` — the same established helper `PrimeResurgence.jsx` already uses (`src/lib/warframeUtils.js`), NOT the `icon` field on the ExportCustoms entry directly (that's DE's internal texture path, not something already wired to a CDN resolver in this app). Wrap in the existing `ItemImage` component (`src/components/ItemImage.jsx`) for graceful fallback on missing icons, same as Foundry/PrimeResurgence.
- **Ownership**: THIS IS THE PART THAT WOULD HAVE BEEN EASY TO GET WRONG — confirmed live against real save data (`~/.local/share/kiedas-orbiter/data/user/inventory.json`). Cosmetic ownership is NOT a single array. Confirmed real entries:
  - `inventory.WeaponSkins` (array of `{ItemType, ItemId}`) contains BOTH weapon skins AND Sigils — e.g. `/Lotus/Upgrades/Skins/Sigils/BossSigilLynx` is a real entry in `WeaponSkins`, not a separate Sigils array.
  - `inventory.FlavourItems` (array of `{ItemType}`) holds a different bucket: avatar images, color pickers, ship scenes, some Skins (e.g. `/Lotus/Upgrades/Skins/Liset/LisetSkinTwitchPrime`).
  - `inventory.MiscItems` and `inventory.ShipDecorations` also exist and may hold relevant items — not yet inspected this session, check before assuming they're irrelevant.
  - Build ownership by checking `ItemType` (normalized the same way other screens already normalize — see `normalize()` in `PrimeResurgence.jsx`: `uniqueName?.replace('/StoreItems/', '/').toLowerCase()`) against the union of these arrays, not just one.
- **Acquisition drawer**: reuse everything already built this session — `getAcquisitionInfo()`, `marketIndex`, `bundleIndex`, `syndicateIndex`, and whatever `buildWikiSigilIndex()`/wiki pipeline lands from the "Next up" section above. No new acquisition logic needed, just wire the new screen's items through the same call already used by `Inventory.jsx`/`Relics.jsx`.

### Screen structure

Model on `PrimeResurgence.jsx`'s structure (`PageLayout` + search + filter chips + card grid) but with larger cards than its current 100px image area — the user explicitly wants these bigger/showcase-style. Suggested filter chips: All / Skins / Sigils / Owned / Missing (same segmented-button style as every other screen's filters — see `Foundry.jsx`/`PrimeResurgence.jsx`'s `Missing only` button for the exact pattern, do not introduce the large switch-style `Toggle` component per the existing project convention already documented in this file's git history). Register in `src/App.jsx`: add to `ICON_NAMES`/nav array (pick an appropriate icon, e.g. something sigil/mask-themed already bundled — check `src-tauri/data/assets` for what's available rather than assuming a new icon asset needs to be added), lazy-import, add to the `screens` map, add an i18n key.

### Before calling this done

- Verify the Skins-vs-Sigils path-based filter split against a real dump of `ExportCustoms` (some meaningful sample size, not 2-3 items) — cross-check against known real Sigils (e.g. `/Upgrades/Skins/Sigils/...` path) vs known real Skins (e.g. `/Upgrades/Skins/Frost/FrostHelmetAlt` from earlier this session) to confirm the split rule doesn't misclassify either direction.
- Verify ownership detection against real save data for at least a dozen items you can independently confirm are owned vs. not, the same way every fix this session was checked against real bundled/save data before shipping.
- `pnpm exec vite build` must pass clean.
- This is JS-only (no Rust/main.rs changes needed since `ExportCustoms`/`dict` are already fetched) — no distrobox rebuild required to verify compilation, though the user will still want to see it live once they're back to confirm the actual visual result, since card layout/spacing can't be verified from source alone.
