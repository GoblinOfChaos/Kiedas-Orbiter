# Plan: automated checks so a new game item can never be silently wrong or missing in the app

## Context

Narin and Citrine Prime were wrong in several ways, each found only by the user: missing from Foundry, no image, drawer showing Chassis drops as the frame's sources, "parts missing". Two code-reading research passes (screens x data, and export files x app) show this is a whole class of failure:

- Only Warframes, Weapons, Recipes/Resources/Images come from DE's own export. Everything else (relics, arcanes, mods, cosmetics/customs, emotes/flavour, companions, gear, regions, keys, bundles, rewards, drops, dict) is the community mirror, weeks behind the game.
- Each screen lists items by its OWN rule (Foundry needs a recipe; Prime Parts shows only sets you already own a part of; arcanes need an entry in an allowlist file; unowned cosmetics need an icon and a dict name; relics need ExportRelics + ExportRewards and an era of Lith/Meso/Neo/Axi; etc.). A new item can pass one rule and fail another.
- Hand-curated files dated 2026-09-06 or earlier (acquisition JSON, wiki-prime-relic-drops, cosmetic-catalog-additions, mod-icon-map, hard-coded lists in inventoryParser.js, Mastery, Collectibles, Cosmetics) cannot contain a new item.
- The runtime loader exists in three drifting copies (MonitoringContext, MirroredMonitoringProvider, scripts/lib/real-data-harness.mjs), and the only completeness tool covers Warframes only.

Correction to my earlier claim: Inventory > Prime Parts intentionally lists only Prime sets the player owns at least one part of (Inventory.jsx ~394-400). Citrine Prime's absence there is very likely CORRECT, not a bug. The `agent/citrine` run must be re-scoped or dropped; the checks below encode this rule so it is tested, not assumed.

## Track 1 (first): finish moving EVERY category to DE's official export

Answer to "why aren't we using DE official?": the adoption was built in slices and only three categories are switched over (Warframes, Weapons, Recipes/Resources/Images), and even those are a hybrid: the community mirror is still the base and DE overlays fields, because the mirror carries the localisation keys the app resolves names through. Everything else is still 100% mirror. I reported the slices as progress without making clear how much remained; that made it sound finished.

Plan: make DE the base for all remaining categories, in this order, each slice gated by the check matrix below: (1) Relics + Arcanes (DE ExportRelicArcane; needs an adapter to the app's relic/reward shape; removes the arcane allowlist gate), (2) Customs + Flavour (cosmetics/emotes; icon + name), (3) Upgrades/mods (DE levelStats + DE-only mods), (4) Sentinels + Gear, (5) Regions/Keys/Bundles (marked critical in COMPAT-LEDGER; need semantic adapters, not a swap), (6) DE drop tables in place of drops.warframestat.us (parser already built, roadmap 1B), (7) DE localisation files per locale in place of the mirror dict. Categories DE does not publish (Syndicates, Nightwave, Challenges, Vendors, Codex) stay on the mirror and are flagged as such. The mirror remains only as the fallback when a DE download fails.

## What must be checked (the catalog of checks)

Every check runs the app's REAL functions (parseInventory, getRelicCatalog, getAllRelicRewards, buildRecipeResultIndex, getAcquisitionInfo, buildPrimeResurgenceModel, resolveAnyImage) on REAL data, with a synthetic inventory for the owned-state cases. Subject = every item DE added/changed since the last run, plus fixed canaries and controls.

### Universal checks (every item, every category)
U1 Present in the right catalog bucket. U2 Name resolved (not a /Lotus/Language key, not a path-split guess, no MT_* code). U3 Image resolves to a DE contentHash URL (not "Image Unavailable", not a hashless remote URL). U4 No display-name collision with an override/prex card/Somachord/other item (lookup is by uniqueName). U5 Acquisition through the real getAcquisitionInfo is either non-empty and correctly labelled or honestly empty (no generic fallback text, no unlabelled component drops on the parent, chance lists high to low). U6 Description present or literal fallback. U7 Owned-state flip: with a synthetic inventory owning it, owned/mastered/parts counts change correctly.

### Per category (the screens each must appear on, and the rule that could drop it)
- Warframe: Inventory Warframes (needs productCategory Suits, not Space/MechSuits); Foundry Warframe tab (needs recipe in ExportRecipes AND survives craftable filters); Mastery total; Cosmetics warframe families (skin folders); drawer. Prime: also primeSets/Prime Parts (rule: only shown when owned; test the rule both ways), Prime Resurgence link (needs recipe), Relic Planner (part path contains "Prime"), relic-drop info in wiki-prime-relic-drops.json.
- Weapon: bucket split needs `noise`/`damagePerShot` or it drops out of Primary/Secondary/Melee, hence out of Foundry and Mastery; excludeFromCodex rule; riven disposition (omegaAttenuation); riven price/grade vocab (pricer model, riven_good_rolls); image via icon (DE-only weapons have none today).
- Mod: mods_catalog rules (excludeFromCodex, unobtainable list, unresolved name, dedupe by name); category tab; wiki-tag search; DE-only mods are dropped unless WI_Upgrades/WFCD_Mods has them.
- Arcane: allowlist gate (warframe-items-acquisition.json) and non-empty levelStats.
- Relic: era in Lith/Meso/Neo/Axi, rewards non-empty from ExportRewards, vaulted state, RelicPlanner and Prime Resurgence links, overlay reward pool (name filter).
- Cosmetic/skin/sigil/glyph/emote/decoration: icon or texture present, dict name present, folder classification, hard-coded decoration parents, additions file; emotes need Flavour.
- Companion/gear/resource/landing craft/Ayatan: codexSecret rules, hard-coded lists, FULL_CATALOG_RESOURCE_PARENTS (unowned resources invisible otherwise).
- Recipe/Foundry item of any type: appears in the right tab, blueprint + every component has name, image, count; prime part path regex covers the part word.
- Market/prices: absent price shown honestly; only prime_parts/arcanes/resources are tradeable stock.

### Supplement-freshness checks (the hand-made files)
For each curated file, list DE-only uniqueNames missing from it: warframe-items-acquisition.json, wiki-prime-relic-drops.json, cosmetic-catalog-additions.json, mod-icon-map.json, the arcane allowlist, AUTHORITATIVE_ITEM_ICONS, decorationParents, landing-craft/Ayatan lists, PRIME_PART_PATH_RE part words, FOLDER_OVERRIDES, Mastery/masteryProgress category lists, Collectibles SONG_ITEM_VENDORS. Output a report list, never a silent pass.

### Pipeline/regression checks
P1 Startup ordering (check_exports finished before load_all_exports reads; combined cache newer than newest export file). P2 Loader parity: the three loader copies build identical EI/nameToImage/gap-fill/additions on the same data (fails when one drifts). P3 Controls: Volt Prime (owned parts) and other existing items must keep passing. P4 Harness self-test: deliberately removing an item from a supplement or recipe MUST turn its check red. P5 DE adoption slice gate: a category slice is not merged until its matrix is green on real data. P6 Merge sanity: float noise, count-collapse, mirror-only kept.

## Approach

1. Extract ONE shared loader used by MonitoringContext, MirroredMonitoringProvider and the harness (or a parity test that fails on drift) so harness data equals runtime data. Include cosmetic-additions, fillDataGaps, fillModGaps, WFCD_*, Wiki* and override files.
2. Generalise `scripts/item-completeness.mjs` into a rule table: category -> [bucket, screens, rules]. Reuse existing pieces: real-data-harness.mjs, apply-merges.mjs, checkItem, drop-attribution-real.mjs, audit_missing_images.js, check-chance-order.mjs, COMPAT-LEDGER.
3. Auto-discover subjects from the DE cache diff (new/changed items in ALL categories, not two canaries) and print the full item x screen pass/fail matrix plus a "cannot be checked" list (e.g. drawer wording, live overlay OCR).
4. Add the supplement-freshness report as its own script.
5. Add UI-truth support: one log summary per screen (Inventory search and Foundry already added) plus DOM markers for "Image Unavailable" and "no verified route"; a headless browser smoke run is optional and needs the user's OK to install a browser (none exists on this machine).
6. Wire into: `npm run check:completeness`, tests/ (golden fixtures per category), data-watch stage 2 (failure opens a GitHub issue), and the coordinator "done" rule: no data/UI task is reported done without the matrix for its category shown to the user.
7. Then adopt the remaining DE categories in dependency order, each gated by its matrix: Relics/Arcanes (unblocks arcane allowlist and relic catalog), Customs/Flavour (cosmetics), Upgrades/mods, Sentinels/Gear, drop tables (roadmap 1B).

## Order of work (Codex implements in worktrees, Antigravity reviews read-only, coordinator re-runs the matrix on real data)

1. Re-scope/stop `agent/citrine`; fix loader parity (step 1) and generalise the harness with Warframe + Weapon + Recipe rows first (rules verified against the code, including the Prime Parts owned-only rule).
2. Supplement-freshness report; run it now to give the user the true list of everything currently missing.
3. Add rows for mods, arcanes, relics, cosmetics, companions, gear, resources.
4. Wire into data-watch and CI; per-screen log lines; DOM markers.
5. Continue DE adoption slices behind the matrix.

## Verification

- `npm run check:completeness` on real Preview data prints the item x screen matrix; Narin, Citrine Prime, Volt Prime match expected results (Narin: Inventory, Foundry with parts, image, labelled drawer sources; Citrine Prime: Inventory + Foundry, and Prime Parts absent by design until a part is owned).
- Self-tests (P4) prove the checks can fail; `node --test "tests/**/*.test.mjs"` stays green; loader parity test fails if any copy drifts.
- The supplement-freshness report is delivered to the user as the concrete list of what is missing today.
- Final gate: the user opens the rebuilt Preview AppImage and confirms the screens match the matrix (Narin in Inventory and Foundry with parts and image; drawer shows labelled Chassis sources).
