# Inventory duplicate analysis

Source: `parseInventory({}, applyMerges(...).exportsBundle, ...)` using the merged Preview DE export and the current parser. The final parser counts are Resources **1,118** (from 1,466), Parts **821** (from 824), Components **49**, and `all` **2,799** (from 3,150). Equipment counts are unchanged: Warframes 118, Primary 196, Secondary 148, Melee 224. `all` contains 2,799 canonical unique names with no duplicate.

## Decisions for the observed same-display-name groups

The pre-fix merged export exposed 54 collision groups in this snapshot (the task brief rounded this to approximately 57). Each group was checked against DE `parentName`, description, and icon, then against the unique-name leaf where DE supplied no human-readable distinction.

| Group(s) | DE evidence | Decision |
| --- | --- | --- |
| Entrati Lanthorn; Steel Essence; Kavat Genetic Code | Same DE display text, description, and icon; alternate bundle/tutorial/resource paths | Deduplicate aliases and merge quantities. |
| Inaak; Xiran; Haav; Namaes; Seonn | Matching gameplay-resource and fish-item records with the same DE text/icon | Deduplicate path aliases and merge quantities. |
| Crewman’s Boot | Deimos and Solaris records have the same DE text/icon | Deduplicate the duplicate record. |
| Owned Peely Pak | Fixed/free sticker-pack records have the same DE text/icon | Deduplicate the presentation aliases. |
| Polymer Bundle; Salvage | Base resource and tutorial/junction reward records have the same DE text/icon | Deduplicate the reward/tutorial aliases. |
| Technocyte Coda Token | Six `CapturedInfested*Token` records share DE text but have distinct DE icons/unique-name identities | Keep all six; append the DE leaf-derived suffix (for example, DJ Rom, Drill Bit, Hard Drive, Packet, Zeke). |
| Archon Shard | `ArchonCrystal` and `ArchonCrystalMythic` share DE text/icon but are distinct DE identities and parent paths | Keep both; append the DE leaf-derived variant suffix. |
| `|ERA| |CATEGORY| Relic` | 24 T1–T4 `VoidProjection` template records; DE parent/path identifies VoidProjection | Exclude all 24 from Resources. |
| Aquapulmo; Ostimyr; Vitreospina; Cryptosuctus; Barbisteo; Kymaeros; Amniophysi; Lobotriscid; Flagellocanth; Glutinox | Base, Medium, and Large fish records share DE text/icon; the unique-name leaf carries size | Keep all; append `(Fish)`, `(Fish Medium)`, or `(Fish Large)`-style DE leaf suffixes. |
| Myxostomata; Duroid; Chondricord | Base, Medium, and Large Deimos fish records; size is only in the DE leaf | Keep all with leaf-derived size suffixes. |
| Charc Eel; Goopolla; Murkray; Sharrac; Karkina; Mawfish; Khut-Khut; Yogwun; Tralok; Mortus Lungfish; Glappid; Norg; Cuthol | Base, Medium, and Large Eidolon fish records; size is only in the DE leaf | Keep all with leaf-derived size suffixes. |
| Mirewinder; Sapcaddy; Eye-Eye; Echowinder; Brickie; Kriller; Synathid; Charamote; Tromyzon; Scrubber; Tink; Recaster; Longwinder | Base, Medium, and Large Solaris fish records; size is only in the DE leaf | Keep all with leaf-derived size suffixes. |

The final parser has zero remaining name groups because every retained distinct record is disambiguated. Names are not invented from game lore: aliases are removed only when DE fields match, while retained variants use the DE unique-name leaf as the fallback distinction.

## Cross-bucket and companion decisions

There were 276 canonical unique names in both Resources and Parts before reconciliation. The precedence is equipment, Parts, Prime Parts, Components, then Resources. The surviving object receives summed `quantity`, `blueprint_quantity`, and `crafted_quantity` values plus the union of ownership state. Equipment arrays are not filtered or resized. The final `all` construction has a canonical guard as a last invariant check.

Adarza Kavat and Sahasa Kubrow were emitted as both beasts and parts because their breed recipe was treated as a parent equipment recipe. Parent beast recipe blueprints are now excluded from Parts; the beasts bucket remains unchanged.

## Verification

- `timeout 120s nice -n 19 node --test tests/completeness/inventory-dedupe.test.mjs tests/completeness/parts.test.mjs` — pass, 2 files.
- `nice -n 19 node --check` for parser, completeness script, and both test files — pass.
- `git diff --check` — pass.
- Merged-export probe — pass: Narin has exactly four parts, none are in Resources; no template markers; no duplicate canonical unique names; equipment counts unchanged.
- UI build/launch and Rust checks were intentionally not run under task restrictions.
