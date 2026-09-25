# DE adoption slice 6: upgrades/mods

## Real-data before/after

Source: cached Digital Extremes Public Export provenance retrieved 2026-09-24, compared with the Preview export-plus baseline.

| Measure | Before | After | Evidence |
| --- | ---: | ---: | --- |
| DE `ExportUpgrades` records | 1,603 | 1,603 | `shadow-upgrades.mjs` |
| Mirror upgrade records | 1,604 | 1,604 retained | `shadow-upgrades.mjs` |
| Merged upgrade records | 1,604 | 1,608 | 4 DE-only additions |
| Mirror-only upgrade records | not surfaced | 5 retained | `shadow-upgrades.mjs` |
| Target mods passing U1 catalog | 0/4 | 4/4 | `npm run check:completeness` merged section |
| Target mods passing U3 image | 0/4 | 4/4 | manifest `textureLocation` + content hash |
| Target mods passing U6 description | 0/4 | 4/4 | literal DE `levelStats[0].stats[0]` fallback |

Verified target manifest paths:

- Brood's Oversurge: `/Lotus/Interface/Cards/Images/AbilityAugments/OraxiaBroodAugment.jpg!00_yorjhg3lRdzjHkr38eSWHA`
- Cold Front: `/Lotus/Interface/Cards/Images/AbilityAugments/FrostIceShieldAugmentTwoCard.jpg!00_OCWDe6qghSFcZQXHUHoEgA`
- Gastroparesis: `/Lotus/Interface/Cards/Images/AbilityAugments/GrendelPassiveAugment.jpg!00_PGvgDn5v4NtdYcBhVdAPvA`
- Infernum: `/Lotus/Interface/Cards/Images/AbilityAugments/UrielFireballAugmentCard.jpg!00_7RLZW5Wre2izuAzxI3zDkQ`

## Verification

- `nice -n 19 node --check` passed for all new/changed JavaScript pipeline scripts.
- `nice -n 19 node --test tests/de-export/upgrades-adapter.test.mjs tests/de-export/apply-merges.test.mjs`: 2 passed.
- `nice -n 19 node scripts/de-export/shadow-upgrades.mjs ...`: 4 targets catalogued with descriptions and hashed images; 1,608 merged records.
- `nice -n 19 npm run check:completeness`: merged real-data section reports the four mods PASS; unrelated cosmetics remain failing, and U4/U7 remain not checkable by the harness.
- Rust was not compiled per task restrictions; `de_upgrades.rs` was re-read twice and its function signatures/call site were checked manually.

## Open questions and risks

- The runtime uses the existing per-file atomic writers sequentially; no Cargo compile was allowed, so Rust type/borrow correctness is static-review only.
- The completeness command's raw baseline continues to report the expected pre-merge mod failures and unrelated cosmetics failures; the merged section is the adoption result.
- DE does not provide a separate description for these four records; the U6 value is the first official levelStats text, not invented prose.

## Suggested follow-ups

- Re-run the full matrix after the coordinator applies the branch's runtime cache merge and performs live transition testing.
