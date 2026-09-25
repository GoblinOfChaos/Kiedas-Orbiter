Plan
- Make main.rs the sole DE cache-refresh authority using per-run mirror download tracking.
- Share one DE manifest fetch per run, throttle/configure requests, and preserve non-fatal fallbacks.
- Fix parser safety, compact export writes, logging, independent Sentinels/Gear validation, and add pure tests.
- Verify statically without cargo, builds, bundlers, or tests that compile.

Summary
- Implemented explicit force/age/fresh-mirror refresh decisions; removed DE output mtime comparisons.
- Added 30s request timeout, 10s connect timeout, User-Agent, shared manifest fetch, and one image-merge owner per run.
- Added compact normal-permission export writer; settings.json remains pretty and mode 0600.
- Disabled DE drop-table refresh by default and made HTML search byte-offset safe.
- Routed DE refresh summaries/warnings through the app logger and counted only changed/added work.
- Split Sentinels/Gear validation and commits so one valid side survives the other side failing.

Files changed
- src-tauri/src/main.rs
- src-tauri/src/logger.rs
- src-tauri/src/de_warframes.rs, de_weapons.rs, de_recipes.rs, de_relics.rs
- src-tauri/src/de_upgrades.rs, de_customs.rs, de_sentgear.rs, de_droptables.rs
- This report and docs/agent-reports/overlayfix.md

Verification
- `git diff --check`: passed.
- `node --check scripts/de-export/apply-merges.mjs`: passed; Node counterpart was not semantically changed.
- Targeted rg scans: no `mirror_newer_than`, `cache_fresh`, or module `write_json_atomic` remains.
- `rustfmt --edition 2021 --check --config skip_children=true <changed .rs files>`: parses changed files but reports formatting differences, including pre-existing crate style and untouched modules when main.rs is processed. No cargo/rustc/build/test command was run by policy.
- Read every changed function and checked changed refresh signatures against all rg call sites.

Open questions and risks
- Runtime Rust compilation and unit tests remain unverified because the brief forbids compiling/testing.
- Existing non-DE request paths still use their prior client construction; check_exports DE path uses the configured client.
- The DE manifest/image sharing is scoped to check_exports; direct module callers still require their expected cache inputs.
- RELIC_FIELDS was retained: local DE cache inspection and scripts/de-export/adapters/relics-arcanes.mjs list all fields as active.

Suggested follow-ups
- Run preview cargo tests and the DE refresh transition matrix in an approved environment.
- Verify file modes and one-run request counts against a disposable export directory.
