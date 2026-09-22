# Kieda's Orbiter revamp — Stage 1 review gate

## Result

Created a source-only isolated baseline and preservation documentation. App code, installed binaries, live profile, Git index and branch were not changed. No build, tests that launch the app, account requests, or desktop automation were performed.

Baseline commit: `f30ea7e9f7fe1f12406257018a2a8cff8c21158d` — Snapshot: Market/inventory fixes, acquisition audit tooling, full-app audit docs.

The earlier conversation described a dirty checkout. At execution it was clean on this newer snapshot commit. Stage 1 captures the current state rather than reconstructing older uncommitted files. Existing historical audits are not reused as runtime passes.

## Review documents

1. [Feature inventory](FEATURE-INVENTORY.md): all screens, overlay windows, notifications and preservation rules, including the prohibition on AI-generated art.
2. [Preview isolation specification](PREVIEW-SPEC.md): separate identity/storage/import/startup behavior and Stage 2 acceptance criteria.
3. [Source surface register](SURFACE-REGISTER.md): 2,138 static candidate occurrences, with machine-readable evidence in `surface-register.json`. This is not exhaustive semantic or runtime validation; dynamic controls require expansion before their screen is redesigned.
4. [Baseline metadata](baseline.json): snapshot location, commit and archive digest. `baseline-files.json` contains SHA-256 hashes for all 850 tracked files; each copy was compared with current source. `baseline.patch` is empty because the starting checkout was clean.

Snapshot source: `/tmp/kiedas-revamp-baseline-3038exxv/source`.
Archive: `/tmp/kiedas-revamp-baseline-3038exxv/baseline.tar`.
Temporary files can be cleared by the OS. The commit and committed-file manifest allow reconstruction; do not treat /tmp as the only durable backup. No private user profile or ignored runtime files were copied. Dependencies and build outputs are excluded. The archive is not a ready-to-run app.

## Resume after an extension/session restart

Read this document, FEATURE-INVENTORY.md and PREVIEW-SPEC.md. Recheck HEAD and tracked-file hashes before implementation; report drift, do not overwrite it. Use baseline metadata to locate the snapshot or reconstruct it from the recorded commit. Do not repeat completed snapshot work unnecessarily.

Current gate: Stage 1 delivered for review. Stage 2 is NOT authorized by completion of Stage 1 alone. Obtain the user's review decision before editing app code or building. Next task is ONLY isolated Preview identity/profile plus navigation shell, retaining screen bodies and all existing behaviors.

Subsequent gates: small screen-redesign groups; service/data-update improvements; connected planning features; platform/release validation. Each needs its own change record, evidence and user review. The plan is not one unattended rewrite job.

## Operational constraints

Keep original checkout changes and installed app intact. Rust builds, if authorized later, run with CARGO_BUILD_JOBS=4 and nice -n 19 on platforms supporting nice; bound other build/test concurrency too. No AI artwork in the app. Official primary sources govern game data. Existing notifications, overlays, OCR and hotkeys are retained. No claims of universal platform parity without live evidence.

## Stage 1 review incorporated

Claude's review was checked against current source. PREVIEW-SPEC.md now explicitly requires bypassing the known `get_data_root()` auto-copy branch, tests legacy data beside the executable, names the updater endpoint/key/provider/custom-command surfaces, and distinguishes inspected paths from pending category coverage. The Preview display name is consistently "Kieda's Orbiter Preview"; machine identifiers and filesystem slugs are unchanged. No AI-generated art remains a hard requirement. These are documentation corrections only; Stage 2 remains at the review gate.
