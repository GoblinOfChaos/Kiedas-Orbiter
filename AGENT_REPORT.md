P56 acquisition model report

Root cause

The existing drawers build their own rows from different entry points. In the shared path, `src/lib/acquisitionInfo.js:2011-2027` is the real ingredient/relic lookup: it adds the item, result, blueprint, and display identities to `sourceKeys`, then reads each key from `dropIndex`. DE tier identity bridging is in `src/lib/relicSources.js:86-89` and `128-153`; it links a recipe blueprint to its result and resolves rarity through that alias set. The narrower drawer helper at `src/lib/relicSources.js:304-320` only starts from an ingredient path plus its display fallback, which explains why it can miss a relation that the shared acquisition path can resolve.

What changed

- Added `src/lib/acquisitionModel/buildItemAcquisition.js`. It is a pure, side-by-side model which takes the existing indexes in `ctx`, delegates to `getAcquisitionInfo`, `buildBlueprintSourceRows`, `buildIngredientSourceRows`, `normalizeRelicSources`, `buildRelicRarityIndex`, `buildDropIndex`, and `getRelicCatalog`, and does no I/O.
- Recipe credits, time, rush cost, and ingredient facts are now exclusively in `build`; Foundry, `Build cost`, `Rush`, and `Components` rows are filtered from `routes`.
- Relics are collected for the item, its blueprint, and every ingredient. One source is normalized at a time so duplicate DE tiers are retained and emitted as `tiers` plus `tierConflict` instead of being silently collapsed. Each route and relic has provenance.
- Added synthetic plus real-data coverage in `tests/acquisition-model/buildItemAcquisition.test.mjs`.
- Added `scripts/acquisition-model-compare.mjs`, which reuses the existing drawer-equivalent builders for every `discoverSubjects()` item and writes only `docs/agent-context/reports/acquisition-model-diff.json` and `.md`.

Before/after proof

- `git stash`/worktree metadata writes are blocked by the read-only linked-worktree git directory. I used the required disk-backed temp-copy proof instead, under `/var/home/jedwards/.cache/codex-tmp` (never `/tmp`), with source and test files copied and `node_modules` only symlinked (not copied). The baseline copy omitted only `buildItemAcquisition.js`; its throttled test exited 1 with `ERR_MODULE_NOT_FOUND` for that module. The temporary copy was deleted.
- After implementation: `timeout 240 nice -n 19 node --test --test-concurrency=2 tests/acquisition-model/buildItemAcquisition.test.mjs 2>&1 | tail -n 60` passed (5 tests).
- Comparison: `timeout 540 nice -n 19 node --max-old-space-size=3500 scripts/acquisition-model-compare.mjs 2>&1 | tail -n 40` passed: 20,416 subjects, 5,306 differing records. The summary reports 58 old Foundry-leading rows, 138 relic-missing-in-old records, 17 tier differences, 76 old-only routes, and 5,083 no-acquisition-in-both records.

Real-data outputs

- Ash Prime Blueprint: Axi I3, Lith S3, Lith V7, Meso C1, Meso S3, Vanguard E1 (all Uncommon in the current DE bundle).
- Ash Prime Chassis: Axi B1, Axi K12, Lith V8, Meso V2, Neo N4, Vanguard M1 (all Common).
- Ash Prime Neuroptics: Axi N2, Meso N2, Meso P12, Meso V4, Neo A4, Neo N3, Neo V4 (Uncommon), Vanguard P1 (Common).
- Ash Prime Systems: Axi A7, Axi N1, Neo A10 (Rare), Neo N5 and Vanguard C1 (Uncommon).
- Nunchasa routes no longer lead with Foundry/build facts; its build is 20,000 Credits, 86,400 seconds, 25 Platinum rush, with Upper Limb, String, Grip, and Lower Limb ingredients.
- Narin routes are Everview Arc, Tuvul Commons, Oro Works, Halako Perimeter, and The Greenway; its build is 25,000 Credits, 259,200 seconds, 50 Platinum rush, with Neuroptics, Chassis, Systems, and Orokin Cell ingredients.
- DE ExportRelics `Meso D1` (`/Lotus/Types/Game/Projections/T2VoidProjectionABronze`) has two `/Lotus/StoreItems/Types/Recipes/Components/FormaBlueprint` rows: one Uncommon and one Common, both count 2. The model preserves that conflict rather than selecting a tier by guess.

Unverified or skipped

- Wiki-audit relic-set comparison was skipped. The absolute `wiki_store/`/`scratchwiki/` location exists, but there was no stable machine-readable relic-set schema selected by the comparison; the report records that reason. No network was used.
- The required broad suite was run throttled. It produced 64 passes and one unrelated failure: `tests/farming/acquisitionText.test.mjs` cannot read the git-ignored `scratchwiki/wiki-resource-pages.json` in this worktree (`ENOENT`). Per the brief, I did not create or alter that missing wiki artifact.
- No app build, deployment, network request, existing `src` file, data file, i18n file, or Rust file was changed.

Exact deliverables created

- `src/lib/acquisitionModel/buildItemAcquisition.js`
- `tests/acquisition-model/buildItemAcquisition.test.mjs`
- `scripts/acquisition-model-compare.mjs`
- `docs/agent-context/reports/acquisition-model-diff.json`
- `docs/agent-context/reports/acquisition-model-diff.md`
- `AGENT_REPORT.md`

Workspace hygiene note

The broad pre-existing UI tests regenerate three tracked files under `tests/.cache/`. They are not model/source changes. Restoring them with git is blocked by the same read-only linked-worktree `.git/worktrees/acq-model/index.lock` path; their generated modifications remain visible in `git status` and should be discarded by the coordinator from a normal writable git environment.
