# DE adoption slice 5 report

## Scope

The cache-only shadow used `ExportRelicArcane_en.json` from the allowed DE PublicExport cache and the Preview mirror exports. The adapter separates `/CosmeticEnhancers/` records as arcanes and all other records as relics. Shared records retain mirror localization/name fields; DE-only records retain DE literal English fields. The inventory arcane allowlist was not changed.

## Shadow counts

- DE combined: 3,369 records; relics 3,197; arcanes 172.
- Mirror: relics 3,089; arcanes 177.
- DE-only: 108 relics; 0 arcanes.
- Mirror-only: 0 relics; 5 arcanes: `AmmoEfficencyDuringUltimate`, `HeatStatusProcOnUltimateKill`, `StatusChanceOnUltimateHit`, `UltimateInvisibilty`, and `VoidSlingsOverguardStrip` under `/Lotus/Upgrades/CosmeticEnhancers/Antiques/`.
- All 3,197 DE relic records contain DE `relicRewards`; the DE category set has no `ExportRewards` counterpart.

The brief's compatibility-ledger figure of 280 DE-only relics/arcanes is not reproduced by this cache/mirror comparison; the exact current result is 108/0 and is recorded as an open reconciliation question.

## Reward resolution

`relicParser.js` resolves catalog and detail rewards through `rewardManifest` -> `ExportRewards`; this slice does not invent a manifest key or an `ExportRewards` map. A new DE-only relic therefore needs a real mirror `rewardManifest` and matching mirror reward pool for those consumers. `inventoryParser.js` can consume DE `relicRewards` in its owned-relic path, but that does not create a catalog reward pool.

## Verification

- `nice -n 19 node --check scripts/de-export/adapters/relics-arcanes.mjs` — pass.
- `nice -n 19 node --check scripts/de-export/shadow-relics-arcanes.mjs` — pass.
- `nice -n 19 node --check scripts/de-export/apply-merges.mjs` — pass.
- `nice -n 19 node scripts/de-export/shadow-relics-arcanes.mjs /home/jedwards/.cache/kiedas-de-export /home/jedwards/.local/share/kiedas-orbiter-preview/data/export` — pass; counts above and JSON ledger at `/tmp/de-shadow/relics-arcanes-report.json`.
- Rust source was read twice after editing; no Cargo, Tauri, Vite, npm/pnpm build, or test command was run.

## Risks and follow-ups

- The local Preview data directory has no `export/AcquisitionItems.json`, so the exact post-merge acquisition allowlist result for all DE arcane names could not be computed from the runtime input. This is an open verification item, not guessed.
- Rust compilation and runtime refresh behavior are unverified by instruction. Review `de_relics.rs` and the mirror-newer branches before coordinator integration.
