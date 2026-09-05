# Complete Kieda’s Orbiter Audit Plan

## Summary

Audit a frozen snapshot of the current working tree without modifying program code. Build it under the required CPU limits, exercise every discoverable application surface, validate bulk data against authoritative sources, and produce evidence-backed results rather than inferred passes.

Coverage includes:

- All 20 navigation screens and first-run onboarding
- Six overlay components and their window/event lifecycle
- Every interactive control, filter, drawer, dialog, setting, and persistence path
- Frontend-to-Rust commands and emitted/listened events
- Inventory parsing and displayed ownership
- WorldState, PublicExport, Wiki, Warframe.Market, updater, and asset integrations
- EE.log detection, OCR, Riven, relic, notification, and sidebar workflows
- Accessibility, localization, security, reliability, performance, and packaging
- Exhaustive Linux runtime testing plus Windows/macOS source and CI-path review

No fixes, production-account mutations, releases, deployments, or program-source edits are part of the audit.

## Audit Method

### 1. Freeze and identify the target

- Capture HEAD, dirty status, full diff metadata, relevant file timestamps, dependency-lock checksum, inventory checksum, and data-export timestamps.
- The working tree is currently dirty (uncommitted changes across ~20 tracked files plus untracked files). Confirm explicitly with the user whether the audit targets the tree as-is (dirty, in-progress work included) or a clean baseline before proceeding — do not assume. Whichever is chosen, save the actual `git diff` patch (not just metadata) alongside the snapshot so results are reproducible against the exact code audited.
- Copy the current working tree into an isolated temporary audit workspace so concurrent edits cannot change the target midway through testing.
- Record changes made inside the temporary snapshot by build-time data synchronization.
- Build the snapshot with `nice -n 19` and `CARGO_BUILD_JOBS=4`.
- Hash the resulting binary/AppImage and use only that artifact for runtime conclusions.
- Create an isolated XDG application-data profile populated with copies of representative inventory and settings data. Preserve the real profile read-only. If representative data is derived from the user's real Warframe/Steam account, scrub account-identifying values (usernames, IDs, tokens) before any of it lands in evidence files, screenshots, or logs under `docs/audits/`.
- The audit's build, process, and profile are fully isolated from and must never touch, kill, or focus-steal from the user's live running instance of the app. Live/overlay/OCR testing that requires GUI automation (e.g. `xdotool`/`wmctrl` via `flatpak-spawn --host`) operates only against the audit's own instance and window, never the user's real session — confirm before any step that could ambiguously target either.

### 2. Create the coverage inventory

Before assigning results, enumerate:

- Every navigation destination, sub-tab, filter, sort, pagination control, drawer, modal, link, and destructive action.
- Every Tauri command and its frontend callers.
- Every event producer and listener, including open, update, close, timeout, and reconnect sequences.
- Every persisted settings key, local-storage key, user-data file, cache, and migration path.
- Every external endpoint, bundled binary/model, dynamically downloaded asset, and updater artifact.
- Every data family exposed by Inventory, Mastery, Relics, Foundry, Mods, Collectibles, Cosmetics, Dashboard, Market, History, and related screens.

Every inventory row must finish as Pass, Fail, Blocked, or Not Applicable. “Present in source” is not sufficient for a runtime Pass.

**Checkpoint:** once the coverage inventory is enumerated, pause and review the surface list and the severity rubric (below) with the user before starting full execution. Correcting scope here is cheap; redoing evidence collection after a scope miss is not.

**Severity rubric** (applies to every result's Severity field and to what counts as a release blocker in `MASTER-REPORT.md`):
- **Critical** — crashes, data loss, corruption of user data/settings, or a core live-Warframe workflow (detection, relic, Riven) that fails outright.
- **High** — a screen, control, or integration that is wrong or broken but has a workaround, or bulk data that is wrong at scale.
- **Medium** — a single-item data error, a cosmetic/UX defect with no functional loss, or a non-blocking performance issue.
- **Low** — polish, minor localization/accessibility gaps, or anything that doesn't affect correctness or usability.

### 3. Execute the audit in layers

- **Build and startup:** dependency integrity, frontend build, Rust build, AppImage contents, resource paths, first launch, existing-user launch, restart, offline launch, missing/corrupt cache behavior, and clean shutdown.
- **Screen workflows:** visit every screen and exercise every control using populated, empty, loading, offline, malformed, and boundary-state data where applicable.
- **Bulk data validation:** programmatically validate every displayed catalog record for identity, deduplication, classification, localization, ownership, image availability, acquisition/source text, numeric calculations, and link targets. Automated acquisition/mechanic-text checks are pattern-inference and have been wrong repeatedly on this data; treat automated mismatches as flagged discrepancies for individual human/wiki-archive verification, not as auto-classified Pass/Fail, and never apply bulk corrections during the audit — findings go into `FAILURES.md` for later one-by-one fixes.
- **Persistence:** use the isolated profile to create, edit, restart, reload, and delete notes, map configurations, checklist state, settings, history, themes, hotkeys, notification preferences, and caches.
- **Backend/IPC:** verify command success, expected failures, invalid inputs, path confinement, concurrency behavior, cancellation, error propagation, and frontend recovery.
- **External services:** validate WorldState/PublicExport behavior against official Digital Extremes sources and official Wiki terminology. Exercise Warframe.Market reads safely, but do not create, modify, or delete real orders. Inspect updater metadata/signatures without replacing the installed app. Rate-limit and space out wiki/API calls made during bulk validation, consistent with the existing wiki-driven data pipeline's established scraping cadence, so audit automation doesn't trip rate limits or read as abuse.
- **Live Warframe integration:** verify attachment and detachment, normal and endless fissure phases, relic picker, reward OCR, reward closure, Riven open/reroll/close, sidebar behavior, notifications, monitor placement, and recovery after the game exits. Repeat event branches with simulations for deterministic failure cases. This layer requires synthetic input/window automation (`xdotool`/`ydotool`/`wmctrl` via `flatpak-spawn --host`). A prior Codex audit attempt using this triggered a screen lock requiring a hard reboot, plausibly via this system's KWin EIS synthetic-input portal. Each such action is proposed individually and run only with the user present at the keyboard, never batched or unattended.
- **Non-functional review:** assess idle and active CPU/memory use, startup and screen-load latency, large-list behavior, network timeout handling, keyboard navigation, focus order, visible focus, accessible names, contrast, text scaling, minimum window size, and common display scaling.
- **Localization:** run translation-key parity across all 15 locales and smoke every screen in every locale for raw keys, fallback language, overflow, clipping, broken interpolation, and unreadable formatting.
- **Security and privacy:** review Tauri capabilities/CSP, asset-protocol scope, file/path commands, URL opening, downloaded binaries/models, updater verification, command execution, token storage, logs/bug reports, sensitive-data exposure, atomic writes, and unsafe deletion boundaries. Run a dependency vulnerability scan (`npm audit`/`cargo audit` or equivalent) and review license terms for bundled binaries and models (e.g. OCR/Tesseract, any downloaded ML assets).
- **Cross-platform review:** test Linux live. Review Windows and macOS conditional code, packaging, permissions, paths, process discovery, capture/OCR dependencies, updater outputs, and CI configuration without claiming live validation on those platforms.

## Result Interfaces and Deliverables

No application API or type changes are planned. The audit will define a machine-readable result record with:

- Stable check ID and subsystem
- Feature, control, command, event, or data family
- Test environment and artifact hash
- Preconditions and exact procedure
- Expected and actual result
- Pass, Fail, Blocked, or Not Applicable status
- Severity and user impact
- Evidence paths and authoritative-source references
- Reproduction instructions
- Suggested remediation boundary
- Runtime, source-review, or automated-data provenance

Write the report suite under a new dated `docs/audits/full-app-*` directory:

- `MASTER-REPORT.md` — overall verdict, release blockers, systemic findings, and coverage totals
- `CHECKLIST.md` — complete human-readable result matrix
- `results.json` and `results.csv` — machine-readable ledger
- `FAILURES.md` — deduplicated defect backlog grouped by root cause and severity
- `EVIDENCE.md` — screenshot, log, command-output, data-query, and source-reference index
- Subsystem reports for UI/data, backend/integrations, overlays/OCR, accessibility/localization, security/reliability, and packaging/platform review

Existing dirty files remain untouched. Audit automation stays temporary unless separately authorized; only the report suite is added to the repository.

## Acceptance Criteria

The audit is complete when:

- Every inventoried surface has a recorded status and evidence.
- Every screen and interactive control has been exercised at least once.
- Risk-bearing state combinations and failure paths have been exercised, without attempting every mathematically possible combination.
- Every applicable catalog/data record has passed through automated validation.
- All core live Warframe transitions have direct runtime evidence.
- All 15 locales have parity results and a live smoke result.
- Linux runtime claims identify the exact audited AppImage hash.
- Windows/macOS findings are explicitly labeled static or CI-based.
- No result is marked Pass solely because code or a file exists.
- Blocked checks identify the missing prerequisite and exact next action.
- Findings distinguish defects in the frozen build from external-service failures or unavailable test conditions.
- Critical and high findings contain reproducible evidence and release impact.
- No program code, real market order, installed application, or primary user data was changed.

Estimated effort is approximately three to five focused audit days, including one coordinated gameplay session for the live detector and overlay matrix.
