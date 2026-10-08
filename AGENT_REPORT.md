# P68 - relic vault state

## Root cause

`src/lib/relicParser.js:92-98` mapped a missing DE vault-status field to `false`. In the current local DE export that made 61 no-date relics indistinguishable from a relic with an explicit future vault date. `src/lib/farmingTargets/relicPlaces.js:127-136` then classified every non-`true` value as obtainable, and `src/screens/FarmingTargets.jsx:83` exposed its acquisition action for the same condition.

## Change

- `getRelicVaultedStatus()` now returns `null` when no DE vault metadata is present. It retains the explicit Baro exception—`Axi A2`, `Axi A5`, `Axi A8`, `Axi M5`, `Axi V8`, and `Neo O1` return `true`.
- Farming Targets now treats only `vaulted === false` as obtainable and only then exposes How to get. Unknown entries are therefore neither vaulted nor presented as available.
- Added `tests/relics/vault-state.test.mjs` coverage for synthetic states, real DE data, strict Relics filter partitions, and the Farming Targets conversion.

## Before and after proof

A disk-backed copy at `$TMPDIR/vault-state-proof-3` was created with `rsync -a --exclude=node_modules`; its dependency directory was symlinked rather than copied. The sandbox's `/home -> var/home` loop made rsync fail at the nominal path, so the same `$TMPDIR` inode was accessed through its canonical `/var/home` path. The proof copy's initial test run failed before source edits:

- synthetic missing-date assertion: `false !== null`;
- real-data no-date assertion: `Lith K12 has no vault date but is not unknown` (`false !== null`);
- Farming Targets assertion: `true !== false` for unknown `obtainable`.

The local real-data comparison changed `true/false/null` from `733/61/0` to `733/0/61`. The full changed list and consumer audit are in `docs/agent-context/reports/vault-state-before-after.md`; the 61 no-date display/unique names are in `docs/agent-context/reports/relics-unknown-vault.md`.

## Tests

- Passed: `timeout 180 nice -n 19 node --test --test-concurrency=2 tests/relics/vault-state.test.mjs 2>&1 | tail -n 60`.
- Wider throttled suite: pending at report write time.

## Exact changed files

- `src/lib/relicParser.js`
- `src/lib/farmingTargets/relicPlaces.js`
- `src/screens/FarmingTargets.jsx`
- `tests/relics/vault-state.test.mjs`
- `docs/agent-context/reports/relics-unknown-vault.md`
- `docs/agent-context/reports/vault-state-before-after.md`
- `AGENT_REPORT.md`

No data files, Prime Sets, Foundry, Incarnon, mastery logic, build artifacts, commits, or network resources were changed.
