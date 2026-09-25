# DE adoption slice 7: Customs + Flavour

## Real-data counts

Source: Digital Extremes PublicExport cache captured 2026-09-24; shadow run used the cache and Preview export directory without network requests.

| Table | DE | mirror before | DE-only | mirror-only | merged |
| --- | ---: | ---: | ---: | ---: | ---: |
| ExportCustoms | 4,832 | 4,766 | 69 | 3 | 4,835 |
| ExportFlavour | 2,681 | 2,630 | 58 | 7 | 2,688 |

The pre-merge completeness finding was 69 failing DE cosmetic subjects. After
the merge, all 69 pass the catalog, name, image, acquisition, description,
and screen checks. All 4,832 DE customs and 2,681 DE flavour records have a
manifest icon in the shadow report. The one former `cosmetic-catalog-additions`
subject, `/Lotus/Types/Items/Emotes/DuelistEmote`, is now supplied by
ExportFlavour and the DE manifest rather than requiring a curated catalog row.

## Remaining intentional screen rules

Cosmetics.jsx still hides unowned customs without both a recognized cosmetic
folder/family (`/Upgrades/Skins/`) and artwork (`icon` or `texture`). Emotes
must be under `/Lotus/Types/Items/Emotes/`. Ship decorations are not customs;
they must be ExportResources records whose `parentName` is one of the existing
`decorationParents` values. These rules are classification boundaries, not
missing-data failures.

## Verification

- `nice -n 19 node --test "tests/**/*.test.mjs"` — PASS, 22/22.
- `nice -n 19 node scripts/de-export/shadow-customs-flavour.mjs /home/jedwards/.cache/kiedas-de-export /home/jedwards/.local/share/kiedas-orbiter-preview/data/export` — PASS; report `/tmp/de-shadow/customs-flavour-report.json`.
- `nice -n 19 npm run check:completeness` — expected nonzero: cosmetics 69/69 PASS; four unrelated DE mod canaries remain FAIL (`Brood's Oversurge`, `Cold Front`, `Gastroparesis`, `Infernum`) on catalog/image/description rules.
- `git diff --check` and `node --check` on all changed JavaScript — PASS.
- Rust was not compiled per task restrictions. `de_customs.rs` and both its declaration and call site were read twice; `refresh_de_customs(&reqwest::Client, &Path) -> Result<MergeSummary, String>` matches the call site. Runtime Rust behavior remains unverified.
