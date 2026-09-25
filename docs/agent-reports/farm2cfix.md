# farm2c defect fix report

The reviewed farm2c defects were verified and fixed. The store now preserves corrupt files, refuses unsafe writes, backs up old versions before migration, and passes through newer schemas. Shared farming-target actions reload and serialize mutations. Reservation UI, local due dates, active-ledger filtering, mutator normalization, target memoization, and Preview-only mounting were corrected.

Validation: `nice -n 19 node --test 'tests/farming/*.test.mjs'` passed all 16 tests; changed pure JS modules passed `node --check`; all locale JSON parsed successfully; `git diff --check` passed. No build, compiler, Rust, Tauri, or live application check was run. Visual verification remains open because the task forbade builds/running the app; non-English warning translations also remain follow-up work.
