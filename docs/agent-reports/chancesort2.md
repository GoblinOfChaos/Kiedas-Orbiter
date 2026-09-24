# Chance sorting review follow-up

All four independent-review findings were addressed:

- Added canonical rotation-aware sorting in `src/lib/chanceSort.js` and used
  it for drop getters, both acquisition drawers, static acquisition drops,
  Inventory mission/part lists, and the existing mission grouping helper.
- Guarded missing Relics catalog tiers with stable original-index ordering.
- Made `scripts/check-chance-order.mjs` use `os.homedir()` with an optional
  DropsAll path and added real-data rotation-group assertions.
- Documented that numeric `chance` values are fractions; percent-scale plain
  numbers remain unsupported by design.

Validation passed with no compilation: targeted `node --check` commands,
`nice -n 19 node scripts/check-chance-order.mjs` (57 item lookups and 504
mission rotation pairs, no violations), and `git diff --check`.

No commits, pushes, live app changes, or warframe.market writes were made.
