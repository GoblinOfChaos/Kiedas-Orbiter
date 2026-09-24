# fixes5

Implemented the verified Riven stat vocabulary correction.

- `Additional Combo Count Chance` now maps to `chance_to_gain_extra_combo_count` (`WeaponMeleeComboBonusOnHitMod`).
- `Chance to Gain Combo Count` now maps to `chance_to_gain_combo_count` (`WeaponMeleeComboPointsOnHitMod`).
- Removed ambiguous Riven aliases and unsupported `beam_length` / `explosion_radius` pricer mappings without changing general mod parser tags.
- Added locale fallback keys, seed entries, and `scripts/check-riven-stat-vocabulary.mjs`.
- The model already contains the extra-combo feature; unknown features would otherwise be replaced by `<NONE>` in `src-tauri/src/pricer.rs`.

Validation: `nice -n 19 node --check scripts/check-riven-stat-vocabulary.mjs`, the vocabulary check against `/tmp/wfm_attrs.json`, JSON parsing, and `git diff --check` all passed. No build or test was run. The official wiki page was robots-blocked; this is recorded in `AGENT_REPORT.md`.
