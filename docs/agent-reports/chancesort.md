# Chance ordering report

Implemented the shared stable chance ordering helper and routed live/static
drop sources through it across both acquisition drawers, Inventory tooltips,
and Relics reward rows. Mission rotation groups retain their existing group
order and sort internally; the in-mission relic reward overlay remains in game
slot order.

Static verification passed:

- `nice -n 19 node --check src/lib/chanceSort.js`
- `nice -n 19 node --check src/lib/dropsParser.js`
- `nice -n 19 node --check src/lib/relicParser.js`
- `nice -n 19 node --check scripts/check-chance-order.mjs`
- `nice -n 19 node scripts/check-chance-order.mjs` — 57 real lookups, no violations.
- `git diff --check`

No builds, tests, Cargo commands, commits, pushes, i18n changes, live app
changes, or warframe.market writes were performed. RelicPlanner has no rendered
chance list; remaining percent matches are unrelated UI/stat/prose data.
