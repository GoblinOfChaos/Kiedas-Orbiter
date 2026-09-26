# Inventory parts report

## Real merged-export counts

Source: Preview export data after `applyMerges`, parsed with the current Preview inventory, and the current Preview inventory payload for owned counts.

- Parts total: **864**
- Owned parts or blueprints: **259**
- Existing bucket counts were unchanged while adding `parts`: Warframes 118, Primary 196, Secondary 148, Melee 224, Companions 86, Resources 807, Components 67, Prime Parts 277.

| Parent type | Total | Owned |
| --- | ---: | ---: |
| warframes | 264 | 121 |
| primary | 168 | 48 |
| secondary | 129 | 26 |
| melee | 194 | 39 |
| kitguns | 6 | 0 |
| zaws | 37 | 7 |
| sentinels | 10 | 1 |
| beasts | 3 | 0 |
| companion_weapons | 4 | 0 |
| archweapons | 24 | 12 |
| necramechs | 2 | 0 |
| archwings | 16 | 0 |
| amps | 7 | 5 |

Narin resolves to four separate cards with DE images: Narin Blueprint (owned, quantity 1), Narin Neuroptics, Narin Chassis, and Narin Systems (the latter three currently unowned). Volt Prime produced no non-Prime `parts` records.

## Verification

- `timeout 60s nice -n 19 node --loader /tmp/kiedas-extension-loader.mjs --test 'tests/completeness/parts.test.mjs'` — pass.
- `timeout 60s nice -n 19 node --loader /tmp/kiedas-extension-loader.mjs --test 'tests/completeness/parts.test.mjs' 'tests/completeness/matrix.test.mjs'` — 2 files, pass.
- `nice -n 19 node --check src/lib/inventoryParser.js` — pass.
- `nice -n 19 node --check scripts/item-completeness.mjs` — pass.
- `git diff --check` — pass.
- Real completeness helper inspected 902 warframe/weapon/companion recipe-part rows; 810 passed and 92 exposed existing missing-image/source-label gaps for follow-up. This is diagnostic output, not a claim that every historical catalog row is clean.

## Not visually verified

The Preview UI was not built or launched by instruction. JSX was source-reviewed only. Live drawer rendering, virtualization at thousands of cards, and locale visual layout remain unverified. Locale files contain the English fallback `Parts` label and need human translation.
