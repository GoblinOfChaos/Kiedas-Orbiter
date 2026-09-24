# Agent report: direct DE export pipeline

## Summary

- Implemented Phase 0 audit artifacts and a shadow-only Phase 1 Node ESM CLI.
- Resolved DE's live English index and all 16 entries; Narin is present in
  `ExportWarframes`.
- Added the isolated browse.wf Creator Glyph supplement refresh with JSON
  validation, count-collapse protection, atomic replacement, and provenance.
- The app does not read the prototype cache and no DE runtime export behavior
  was changed.

## Files changed

- `scripts/de-export/de-export.mjs`
- `scripts/de-export/shadow-compare.mjs`
- `docs/pipeline/COMPAT-LEDGER.md`
- `docs/pipeline/COMPAT-LEDGER.json`
- `src-tauri/src/main.rs`

## Real DE acquisition output

Index SHA-256: `123ada756ed963508e8dcb11f138a95305abbf96b32f960582d76bb3c60c69e4`
Final run: `downloaded: 1`, `reused: 15`, `narin: true`.

| Export | Count | SHA-256 |
| --- | ---: | --- |
| Warframes | 127 | 8609a920a3eaf10e63b2170b38e67054e74bb7a9455fdb06bfaec9c4c2b719fd |
| Weapons | 841 | 316d13e5c8a1f6940ec0c796d94ed8d23ccf2de198bdb9d216a91cc0ee2cbb40 |
| Customs | 4,832 | a8c2a68f67a37af10a8cf5239c4ee19dc10eeedf48a30d4bbd796a557c310e33 |
| Upgrades | 1,603 | 4b949b53457bebc942aae720073240959d1752f8437e82795a01c27e3cf24bb4 |
| Recipes | 1,885 | c6259273a2e138d0b10e6133ac425d03cf87f6f0beac197fbe56ee8f29fc8ef3 |
| RelicArcane | 3,369 | 7be6c27eacac835ee05bde17ebae8040c39092be4efc57fe50611b115b66e3b1 |
| Resources | 3,545 | a5e6b990c49f5773c99f6e0c67cdf86c6e7da22349f7586c5d17b1dac8217b99 |
| Flavour | 2,681 | 1403513fe73419fc9ee2d190c71c5d203a2fbf05f872554d0c9cc08bc3ffaeba |
| Regions | 269 | 2c88839a179c2037a48913471639a28c0514bad1d5a4b26c015096d074642941 |
| Sentinels | 34 | f4c6fcc19c4b6e1bb4b8faf8ed0faf849bc31a2e4549b3fbef69b59f4a7926a5 |
| Gear | 180 | b394bc7e33088fd32dfbdbba258852677eebadbaf59d7eaa96bed0d8c8f1ce94 |
| Keys | 49 | 2e19eea8674b464e7ca0bd1344d3808215d9f04dcfbd69706957905875a1b1c8 |
| Drones | 6 | 3c949c8366adb89fce5a7301e1ef43678e0b2b41cf1252852b2be23f08da9b8f3 |
| FusionBundles | 51 | 425d4e02032bf793ecd100a9fe25921ddc17a7215e31aa86880b0b6d8fef4011 |
| SortieRewards | 17 | e2466b27179797ccb17eb403fc896618e2bf4b5a9f6eb6c448422169bfeb988b |
| Manifest | 20,136 | b355d3c61e0acb255d6cb1327aa010fa28d5b43421e1a0a9cab7c095d0ed03e8 |

## Verification

- `nice -n 19 node --check scripts/de-export/de-export.mjs`: passed.
- `nice -n 19 node --check scripts/de-export/shadow-compare.mjs`: passed.
- `nice -n 19 node scripts/de-export/de-export.mjs fetch`: passed; real output above.
- Same CLI rerun: passed; reused all 15 unchanged category hashes.
- `nice -n 19 node scripts/de-export/shadow-compare.mjs /home/jedwards/.cache/kiedas-de-export src-tauri/data/export`: passed; all baseline categories correctly reported unavailable.
- JSON parse check for ledger and cache provenance: passed.
- `git diff --check`: passed.
- No cargo, tauri, vite, npm/pnpm build, or test command was run.

## Open questions and risks

- App runtime export counts remain unavailable because no runtime mirror copies
  are tracked in this worktree and the external app data directory was not
  inspected under the task boundary; see the ledger.
- Raw DE wrappers still need a Kiedas normalization adapter before adoption.
- The glyph supplement is browse.wf community data, outside the strict DE
  source list. It is isolated and flagged for the user to keep or disable.
- Rust compilation and live app refresh were not run, so the quick-win wiring
  needs coordinator-side build/runtime validation.

## Suggested follow-ups

- Run the Preview-only Rust compile/build under the repository CPU rules.
- Supply an export-plus baseline folder to `shadow-compare.mjs` and review
  category-level additions/removals before Phase 2 cache work.
- Decide whether the non-DE glyph supplement should remain enabled.
