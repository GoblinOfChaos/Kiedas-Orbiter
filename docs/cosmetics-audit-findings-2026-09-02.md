# Cosmetics Audit Findings — 2026-09-02

## Executive summary

This audit covers all 50 checks in `docs/cosmetics-audit-checklist.md`.

| Result | Checks | Count |
|---|---:|---:|
| Pass | 5–9, 24, 29–33, 38–42, 45 | 17 |
| Fail | 1–4, 19, 22–23, 26–28, 34–36, 44, 46–50 | 19 |
| Partial / risk / not fully testable | 10–18, 20–21, 25, 37, 43 | 14 |
| **Total** | 1–50 | **50** |

The most serious findings are:

1. The animation-set catalog is almost entirely absent: 4 entries are visible versus 144 rows currently enumerated by the official Wiki (72 Agile and 72 Noble).
2. Weapon-skin classification is systemically wrong. Of 507 visible items whose official icon paths identify them as Primary, Secondary, or Melee weapon skins, 468 are assigned to the wrong kind.
3. The running AppImage exposes untranslated cosmetic-kind keys, has broken images for all seven hand-added cosmetics, and displays raw or duplicated acquisition text.
4. Prime-exclusive and animation-set items can be labeled “Available directly in the in-game customization menu” even when official export requirements contradict that claim.
5. The current source contains improvements made after the running binary was built, but it still has classification, acquisition, and primary-source compliance problems. A rebuild alone would not resolve the audit.

## Scope, constraints, and evidence

- Audit target: `docs/cosmetics-audit-checklist.md`.
- Running application: `/home/jedwards/AppImages/kiedas_orbiter.appimage`.
- AppImage SHA-256: `7d0870ab4e877d22e1622e06f53ffa1b98c0c9a81b3aa295c05042adbdbd3e33`.
- Release binary SHA-256: `bab4fa8d7177a12fcbd09bf5a9e3c51f92e7d520c4a1b6c6f40308f4063975fc`.
- Repository HEAD: `07cfa9d22353df601b98ee53ac27879a22b98789`.
- Live catalog total: 6,282 cosmetics, 1,202 marked owned.
- Ownership ground truth: `~/.local/share/kiedas-orbiter/data/user/inventory.json`.
- Game-data snapshot: local Digital Extremes PublicExport data under the application data directory, sourced from `https://content.warframe.com/PublicExport/`.
- Official reference pages:
  - `https://wiki.warframe.com/w/Animation_Set`
  - `https://wiki.warframe.com/w/Inaros_Animation_Set`
  - `https://wiki.warframe.com/w/Warframes`

No compilation or bundling was run. No program source was changed.

### Important version mismatch

The running AppImage was built at approximately 19:12 local time. Several relevant working-tree files were edited later, including `Cosmetics.jsx`, `acquisitionInfo.js`, the hand-added cosmetic data, and English translations. Consequently, this report distinguishes:

- **Live**: directly reproduced in the running AppImage.
- **Current source**: established by read-only source/data analysis, but not certified in a rebuilt application.

This matters particularly for checks 3, 19, 22, 23, and 46: the current source contains later attempted improvements, while other defects remain.

## Detailed findings

### 1. Animation sets are 97.2% incomplete — Fail

Searches in the live application found:

- “agile”: Inaros Agile Animation Set and Wisp Agile Animation Set only.
- “noble”: Inaros Noble Animation Set, Wisp Noble Animation Set, and the unrelated Noble Narta emote.

The official Wiki's current Animation Set page enumerates 72 Agile and 72 Noble Warframe-specific rows, for 144 total. The application exposes only four of those entries, leaving a gap of 140.

The Wiki explains that each Warframe has Agile and Noble sets, unlocked for its own frame and normally purchasable to use on other Warframes. This is materially different from treating the four visible sets as ordinary always-available cosmetics.

Affected checklist checks: 1, 2, 27, 44, and 48.

### 2. Cosmetic-kind classification is systemically inaccurate — Fail

Live catalog counts are:

| Kind | Total | Owned |
|---|---:|---:|
| Animation | 4 | 0 |
| Archwing | 15 | 8 |
| Armor | 327 | 97 |
| Decoration | 1,388 | 302 |
| Emote | 142 | 48 |
| Glyph | 1,261 | 107 |
| Melee | 33 | 4 |
| Other | 1,453 | 318 |
| Primary | 7 | 2 |
| Secondary | 10 | 4 |
| Sentinel | 80 | 6 |
| Sigil | 281 | 100 |
| Syandana | 285 | 40 |
| Warframe | 996 | 166 |
| **Total** | **6,282** | **1,202** |

An official icon-path cross-check identified 507 visible weapon skins. Only 39 are assigned to the correct weapon kind; 468 are not:

| Official icon family | Total | Correctly classified | Misclassified |
|---|---:|---:|---:|
| Primary | 159 | 7 | 152 |
| Secondary | 134 | 10 | 124 |
| Melee | 214 | 22 | 192 |
| **Total** | **507** | **39** | **468** |

Examples reproduced in the live Warframe filter:

- Acceltra Caduceus Skin — official icon path is under `StoreIcons/Weapons/PrimaryWeapons`.
- Acceltra Nitros Skin — official icon path is under `StoreIcons/Weapons/PrimaryWeapons`.
- Akomeogi Warfan Skin — official icon path is under `StoreIcons/Weapons/MeleeWeapons`.

All three appear as Warframe cosmetics. Source inspection indicates the classifier expects a narrower `/Upgrades/Skins/Weapons/` path and then interprets family folders such as `Runner` and `Koumei` as Warframe families. The exact official export paths do not consistently follow that assumption.

Other classification problems:

- Operator items: 745 total; 737 Other and 8 Animation.
- Necramech items: 20 total; 17 Other and 3 Archwing.
- Companion paths: 38 Armor and 19 Other.
- Railjack paths include non-cosmetic engines and reactors in the broad catalog.
- Excalibur Jade promotional Skin and Helmet classify as Other.

Affected checklist checks: 4, 34, 35, and 36. Check 37 could not be tested with the requested modular-weapon example because no qualifying Zaw/Kitgun skin was found in the current export snapshot.

### 3. The running build displays untranslated kind labels — Fail

Live filter buttons display raw localization keys including:

- `COSMETICS.KIND_SYANDANA`
- `COSMETICS.KIND_ARMOR`
- `COSMETICS.KIND_ANIMATION`
- `COSMETICS.KIND_GLYPH`
- `COSMETICS.KIND_SIGIL`
- `COSMETICS.KIND_DECORATION`
- `COSMETICS.KIND_EMOTE`

The current English locale source contains later additions for these keys, but those edits postdate the binary. This is a live failure; the source-level attempt remains unverified until a controlled rebuild and smoke test.

Affected checklist check: 3.

### 4. Acquisition text contains false claims and raw data — Fail

#### False “directly available” claims

The current source builds an always-available index without excluding entries that have an official export requirement. The current export contains 151 cosmetics with both `alwaysAvailable: true` and a non-null `requirement`.

Four requirement-bearing items are visible in the current catalog and receive a direct-availability result:

- Inaros Agile Animation Set
- Inaros Noble Animation Set
- Wisp Agile Animation Set
- Wisp Noble Animation Set

Live Inaros Agile displays “Available directly in the in-game customization menu.” The official Wiki instead documents the frame-specific unlock and Market purchase behavior.

Live Lavos Prime Shoulder Guard, an owned Prime-specific cosmetic, also displays the same direct-availability claim. That wording is not credible for a Prime-exclusive item.

Affected checklist checks: 26, 27, 47, and 48.

#### Raw, duplicated, or malformed acquisition strings

Live failures:

- Banshee Sonority Skin concatenates multiple infobox-style fields.
- Caerulea Oculus includes designer, round/batch, and price fields in raw form.
- Cryptanaut Necramech Helmet duplicates its event wording: “Operational Supply - Operational Supply, Champion.”
- Arbiter of Hexis Sigil omits the exact Rank 1 and 1,000 Standing requirements even though the official ExportSyndicates data contains `requiredLevel: 1` and `standingCost: 1000`.

The current source has later, cleaner outputs for those four cases, but exhaustive current-source rendering still found six raw TennoGen overrides:

- F19 Condroc Headphones
- Butterfly Wings Oculus
- Choroid Oculus
- Frame Friend Earpiece
- Millennium Visor Diadem
- Maulleus Hammer Skin

The current hand-added data also includes acquisition prose that should be reviewed before release:

- Mesa Heirloom: “Acquisition Market Price Platinum 225”
- Atomicycle Skin: “Purchased from the Fables & Frontiers Store for Standing 20,000 with The Hex .”
- Bubonico Day of the Dead Skin: “250 Nakak Pearl”

Affected checklist checks: 22, 23, 28, 46, and 49.

### 5. Seven hand-added cosmetics have broken live images — Fail

All seven specified additions are present and their Owned badges agree with the inventory ground truth. In the running AppImage, however, all seven resolve to image-unavailable behavior. Mesa Heirloom's five entries visibly showed `IMAGE UNAVAILABLE`; the running data predates the direct icon additions for all seven.

The later current-source entries use `cdn.warframestat.us` URLs. That is not one of the project's permitted primary sources under the standing rules, so those changes cannot be certified as a compliant correction.

Affected checklist checks: 19 and 50. Check 20 remains partial because source URL presence is not proof of successful or compliant runtime image loading.

### 6. Catalog boundaries and total require product review — Risk

The 6,282 canonical unique names contain no duplicate unique-name keys, which is positive. There are nevertheless 133 duplicate display-name groups, many representing legitimate Operator/Drifter variants, and the catalog admits non-cosmetic-looking Railjack components through broad export selection.

The total is therefore internally deduplicated but not yet validated as a defensible cosmetic-only total. The inclusion rules need an explicit product definition and primary-source-backed allow/exclude criteria.

Affected checklist check: 43.

## Image audit limitations

A read-only run of the repository's image-audit logic reported zero missing resolver URLs for these unowned baseline groups:

| Group | Entries checked |
|---|---:|
| Cosmetic skins and sigils | 3,365 |
| Glyphs | 1,248 |
| Decorations | 1,388 |
| Emotes | 142 |

This establishes that the resolver produced a URL, not that each URL returned a valid image in the running WebView. The script also does not fully cover inventory-only hidden entries. Representative live cards loaded across multiple categories, but every image in all nine requested groups was not individually network-validated. Checks 10–18 are therefore Partial rather than Pass.

## Per-check results

| # | Result | Evidence / finding |
|---:|---|---|
| 1 | **Fail** | “agile” returns only Inaros and Wisp Agile; official Wiki enumerates 72 Agile rows. |
| 2 | **Fail** | Only two Noble animation sets are present; Noble Narta is an unrelated emote. |
| 3 | **Fail** | Running build displays raw `COSMETICS.KIND_*` keys. Later source translations are unbuilt. |
| 4 | **Fail** | 468 of 507 officially identifiable visible weapon skins are assigned to the wrong weapon kind. |
| 5 | Pass | Exactly one kind and one ownership filter are active at a time in live testing. |
| 6 | Pass | Clearing search restores the complete current-filter result set. |
| 7 | Pass | Search text persists while changing kind; matching results return when the compatible kind is restored. |
| 8 | Pass | A nonsense query displays the no-results state. |
| 9 | Pass | Owned/Unowned filtering matches inventory for the tested exact item. |
| 10 | Partial | Skin resolver produced URLs and representatives loaded, but every skin URL was not runtime-validated. |
| 11 | Partial | Syandana resolver produced URLs and representatives loaded, but exhaustive runtime validation was not performed. |
| 12 | Partial | Armor resolver produced URLs and representatives loaded, but exhaustive runtime validation was not performed. |
| 13 | Partial | Sigil resolver produced URLs and representatives loaded, but exhaustive runtime validation was not performed. |
| 14 | Partial | Glyph resolver produced URLs and representatives loaded, but exhaustive runtime validation was not performed. |
| 15 | Partial | Decoration resolver produced URLs and representatives loaded, but exhaustive runtime validation was not performed. |
| 16 | Partial | Emote resolver produced URLs and representatives loaded, but exhaustive runtime validation was not performed. |
| 17 | Partial | Companion/vehicle resolver produced URLs, but classification scatter and lack of exhaustive runtime checks prevent a pass. |
| 18 | Partial | Other-category resolver produced URLs, but the bucket is broad and every runtime image was not validated. |
| 19 | **Fail** | All seven hand-added entries are image-unavailable in the running AppImage. |
| 20 | Partial | Later source contains URLs, but they are unbuilt and use a non-approved third-party host. |
| 21 | Partial | Shared drawer behavior was exercised for Skin, Sigil, Other, and Decoration, not every kind/card. |
| 22 | **Fail** | Live and current-source examples contain raw, concatenated, or malformed acquisition prose. |
| 23 | **Fail** | Live Cryptanaut acquisition text is duplicated. Later source output is unbuilt. |
| 24 | Pass | Current-source acquisition rendering emitted no raw `/Lotus/` path or literal `UNKNOWN` marker. |
| 25 | Partial | Current source emits 501 direct Wiki links and 5,781 exact-name Wiki searches; representative links returned successfully, but every card was not clicked. |
| 26 | **Fail** | Requirement-bearing animation sets are indexed as directly available. |
| 27 | **Fail** | Only four animation sets exist, and all four have requirements while receiving the wrong direct claim. |
| 28 | **Fail** | Six current TennoGen overrides remain raw; the running build has additional stale raw outputs. |
| 29 | Pass | Tested Owned badges agree with inventory ground truth. |
| 30 | Pass | Tested Unowned states agree with inventory ground truth. |
| 31 | Pass | Zenith Granum Crown Decoration is visible and correctly marked Owned. |
| 32 | Pass | Owned `excludeFromCodex` item 1999 Drippy Glyph remains visible and correctly marked Owned. |
| 33 | Pass | Catalog logic hides unowned secret/excluded/iconless entries while retaining owned exceptions. |
| 34 | **Fail** | New frame families classify correctly in samples, but frame skin classification is not universally correct and Warframe is polluted by weapon skins. |
| 35 | **Fail** | Operator and Necramech items are not consistently represented by a single defensible kind. |
| 36 | **Fail** | Companion items split between Armor and Other without a consistent rule visible to the user. |
| 37 | Partial | No qualifying Zaw/Kitgun skin was found in the current export snapshot; exact requested case was not testable. |
| 38 | Pass | Railjack/Clan entries are present rather than dropped, though catalog-boundary pollution remains a risk. |
| 39 | Pass | Warframe count and Load More arithmetic are consistent: 996 total, 120 initial, then 240. |
| 40 | Pass | Loading more preserves scroll position and appends results. |
| 41 | Pass | Changing search/filter resets pagination to the first page. |
| 42 | Pass | Current source sorts deterministically by kind then name; sampled live ordering was stable. |
| 43 | Partial / risk | No duplicate canonical keys, but 133 duplicate display-name groups and broad non-cosmetic inclusion prevent certifying 6,282 as the right total. |
| 44 | **Fail** | App has 4 of 144 official Wiki animation-set rows, a 140-entry or 97.2% gap. |
| 45 | Pass | All eight ShipDeco parent types present in the current official ExportResources snapshot are included by the source allowlist. |
| 46 | **Fail** | Live Arbiter of Hexis Sigil omits Rank 1 and 1,000 Standing. Later source correction is unbuilt. |
| 47 | **Fail** | Lavos Prime Shoulder Guard receives a generic direct-availability claim. |
| 48 | **Fail** | Inaros Agile receives a generic direct-availability claim despite its frame/purchase rules. |
| 49 | **Fail** | Banshee Sonority and Caerulea are raw live; later fixes are unbuilt and six other raw TennoGen overrides remain. |
| 50 | **Fail** | All seven additions have correct Owned status, but all seven fail the live-image requirement. |

## Recommended next actions

These are audit recommendations only; no fixes were applied.

1. Define the catalog contract first: which export record families count as cosmetics, and which kind each family must use.
2. Replace folder-name inference for weapon skins with rules validated against the actual official export path and icon-path shapes; add regression fixtures for the three named misclassifications and a broader Primary/Secondary/Melee matrix.
3. Import all official animation-set rows and model “unlocked for owning frame” separately from “purchased for use on other frames.”
4. Prevent `alwaysAvailable` from overriding an explicit requirement, exclusivity, syndicate cost, or event source.
5. Normalize acquisition overrides into structured, user-facing sentences and add assertions against raw infobox field labels, duplicated source names, internal paths, and `UNKNOWN`.
6. Replace third-party hand-added icon URLs with verified permitted primary-source assets, then rebuild and live-test all seven cards.
7. After the source issues are addressed, perform a controlled rebuilt-AppImage smoke test for translations, all seven additions, representative kind classifications, syndicate costs, Prime exclusivity, and animation acquisition.

## Audit integrity note

The repository was already dirty before this audit. Existing modified and untracked files were treated as user work and were not altered. The only intended workspace addition from this audit is this report.
