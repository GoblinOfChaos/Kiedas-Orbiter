# DE official localisation phase 1

## Source and cache inventory

The cached DE provenance contains 16 English-index categories: Warframes 127,
Weapons 841, Customs 4,832, Upgrades 1,603, Recipes 1,885, RelicArcane 3,369,
Resources 3,545, Flavour 2,681, Regions 269, Sentinels 34, Gear 180, Keys 49,
Drones 6, FusionBundles 51, SortieRewards 17, and ExportManifest 20,136.
No `locales` section or cached `de`, `fr`, or `ja` locale files was present at
implementation time, so live DE-vs-mirror mismatch counts could not be measured
in this sandbox. No network fetch was attempted.

## Adapter matrix

| Check | Result | Evidence |
| --- | --- | --- |
| English unchanged | Pass | `i18n-parity.test.mjs` deep equality |
| Missing DE record keeps mirror locTag | Pass | synthetic Warframe assertion |
| Literal fields overlay by uniqueName | Pass | synthetic Warframe/Weapon assertions |
| `/Lotus/` localized values leak | Pass | literal guard assertion |
| Locale switch back to English | Pass | adapter bypass/deep equality assertions |
| Real DE Warframe/Weapon parity | Not Applicable | locale fixtures unavailable |
| U2 name canary in non-English locale | Pass (synthetic) | localized Warframe name assertion |

## Risks and follow-ups

Run the finite cache fetch on a network-enabled machine, then rerun the parity
test and record literal mismatch counts for Warframes and Weapons. Rust was not
compiled by design; the new module and both loader call sites require the
coordinator's normal compile-time check.

