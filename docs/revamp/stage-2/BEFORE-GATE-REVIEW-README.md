> Current checkpoint: [CURRENT-ACCEPTANCE.md](CURRENT-ACCEPTANCE.md). It supersedes historical pending/status wording below. Stage 2 remains held.

# Kieda's Orbiter Preview — Stage 2 implementation handoff

## Status: source prepared; acceptance gate HELD

Stage 1 was accepted and the user authorized Stage 2. Work is confined to the isolated checkout `/var/home/jedwards/kiedas-orbiter/.preview-work/stage2`, branch `revamp/preview-shell`, based on `f30ea7e9f7fe1f12406257018a2a8cff8c21158d`. The original app checkout receives only these documents/evidence and the durable implementation patch. No installed app or user profile was modified. A native GUI was launched only inside a private headless test environment with synthetic data. No real market order was changed or update published.

**Not an installable or release-validated Preview yet.** Full Linux native debug builds now PASS in the existing `dev-fedora` container. A headless native launch also PASSes the three synthetic profile checks described in `NATIVE-VALIDATION.md`. Host/extension dependency failures remain historical evidence, superseded for container builds. No system packages were installed. Windows/macOS installation and live tests are also unavailable here. Do not proceed to Stage 3 or promote this as a passing Stage 2 build.

## Implemented on the isolated branch

- Cargo `preview` feature plus Tauri Preview config and `preview:dev` / `preview:build` launchers. Product, identifier, executable name, port and platform icons differ; existing image receives only a conventional PREVIEW text badge, no AI-generated artwork. Provenance is recorded with the icons.
- Preview root selection precedes both the debug source-directory shortcut and release legacy-copy branch. Missing OS directory fails instead of falling back. Native/frontend build identities are checked; native identity is checked before profile/log/migration effects.
- Stable updater configuration is removed from effective Preview config; updater plugin registration and permissions are omitted. Provider checks/installs and custom AppImage command are blocked. Signing-key reuse/rotation requires an explicit recorded decision before any future Preview channel is enabled.
- Backend guards reject scanning, inventory API acquisition, hotkey registration, OCR commands, overlay creation/showing, notifications/sound and market mutations in initial Preview. Guards also cover resize-triggered overlay creation. Automatic extraction and Linux screenshot probe are bypassed. Existing stable behavior remains selected when Preview is off.
- Preview navigation groups all 20 original routes; favorites, collapsed groups, independent scrolling, active-page semantics and keyboard focus styles are added. Screen implementation files remain unchanged. All eight overlay definitions remain. Preview-only chrome is initially English; existing screen localization is retained. Localization review of new chrome is still required.
- Explicit profile-copy import supports inventory, selected notes/maps, safe preferences, optional history and explicit checklist export. Credentials are excluded, malformed/oversized/symlink files rejected, overlap rejected, replacements require a checkbox, and backups/staged writes are retained. Per-file failure rollback exists; crash recovery of a multi-file import is not runtime-verified. Reload applies imported state.
- Checklist uses a deliberately provided `checklist-export.json` because stable progress is in localStorage, not the data/user folder. Preview never scrapes stable webview storage. This requires a user-created export; automatic extraction from the stable app is not implemented.
- Generic Preview file export rejects writes into the stable OS profile, parent traversal and symlink destinations. Source folder selection for import remains explicit and read-only.

## Evidence

- Preview frontend Vite build: PASS; baseline-style large-chunk warnings retained. No bundling performance refactor in this stage.
- Focused Rust suite: 10 Preview-mode tests and 5 stable-mode tests PASS. It imports the actual policy/import modules and tests real Tauri configuration types. These do not compile the full GTK application.
- Static config checks: Windows/Linux/macOS merged configurations, updater removal, 20-route grouping, overlay definitions and native guard presence PASS. Static assertions are not runtime proof.
- Rust parsing via rustfmt stdout: PASS; no formatting rewrite performed.
- Full Linux native debug builds: PASS, including embedded frontend (`preview,tauri/custom-protocol`). See evidence/native-container-build.log and evidence/native-embedded-build.log. The earlier native-check-blocked.log describes the unequipped host environment.
- Native Linux headless first launch: PASS for synthetic legacy-source preservation, no legacy sentinel import, and no stable OS profile creation. Linux Preview webview storage was observed under its distinct identifier. See evidence/native-smoke.json. Release/package, restart/import, live suppression, layout and cross-platform acceptance remain unverified.
- Finding: the embedded document title remains `Cephalon Kronos` (`index.html:8`). Implementation changes stopped for review; no title fix has been applied.

## Next actions and review gate

1. Review `implementation.patch` and `ISOLATION-LEDGER.md`, including the limitations above.
2. Resume in the isolated checkout; do not apply changes to the user's original tree merely to build them.
3. Review the inherited document-title discrepancy in `NATIVE-VALIDATION.md`, then resume remaining native validation in the existing equipped container.
4. Validate synthetic Preview and legacy profiles first. Then check fresh install/restart/import/rollback, navigation at normal/minimum size, keyboard behavior, all locales, absence of Preview update requests and initial live integration suppression.
5. Validate Windows/Linux/macOS packages independently. Only perform deliberate live testing with stable monitoring/hotkeys stopped by the user. Full capability matrix remains required.
6. Obtain user review at the Stage 2 gate before any screen redesign or Stage 3 work.

Copy-paste commands for an already-equipped environment (frontend/policy checks first; final command attempts a native build without installation):

```bash
cd /var/home/jedwards/kiedas-orbiter/.preview-work/stage2
nice -n 19 node scripts/preview-checks/verify-config.mjs
CARGO_BUILD_JOBS=4 nice -n 19 cargo test --manifest-path scripts/preview-checks/Cargo.toml --offline
CARGO_BUILD_JOBS=4 nice -n 19 cargo test --manifest-path scripts/preview-checks/Cargo.toml --offline --no-default-features
UV_THREADPOOL_SIZE=2 nice -n 19 node node_modules/vite/bin/vite.js build --mode preview
node scripts/run-preview.mjs build --no-bundle
```

Expected evidence: passing route/config checks, 10 and 5 policy/schema tests, frontend build success, then a native build result. Native builds require the equipped container; the host still lacks system dependencies. On Windows, use the launcher (which sets Cargo jobs) and platform-appropriate commands rather than `nice`.

## Durability

`implementation.patch` includes new source files and binary icon changes. `implementation.json` records its hash, baseline and isolated commit. The isolated checkout is now on disk under `.preview-work/stage2` rather than RAM-backed `/tmp`. To reconstruct a new checkout of the recorded baseline and apply the patch with `git apply --index`. Do not assume ignored dependencies or runtime files are in the patch. The original app's tracked-file manifest is rechecked at delivery.

## Approved title follow-up

The user approved the Preview-only title correction. `src/main.jsx` now sets the document title to "Kieda's Orbiter Preview" after checking build identity. Stable runtime behavior remains unchanged; the shared source file changed only in the isolated checkout, and the original checkout remains untouched. This supersedes the unresolved-title finding above. Frontend and embedded native rebuilds pass. All eight assertions in `evidence/native-smoke.json` pass, including direct checks that Preview settings contain neither the synthetic credential marker nor enabled legacy autoStartMonitoring, and title/navigation persistence after webview reload. Reload is not process restart. Earlier reviewed evidence is preserved with the `before-title-` prefix. The updated implementation patch includes the staged, uncommitted title change; committing was blocked by missing Git author identity. Remaining acceptance work is unchanged.

## Native interaction follow-up

`evidence/native-interaction.json` and its Python harness record the unchanged binary executing in the private synthetic Linux environment. All eight existing smoke assertions passed again. Onboarding was dismissed through DOM-triggered UI clicks. All 20 navigation buttons were clicked and each acquired the expected active-page state. This proves selection behavior, not complete screen functionality, rendered content correctness, keyboard accessibility or pointer hit testing. Missing bundled resources and unavailable external requests still limit screen checks.

Five direct native IPC calls returned the expected disabled error: start_log_scanner, set_hotkeys (empty list), show_overlay_window, show_notification, and download_appimage_update. This is runtime guard evidence for those calls; it does not prove all integration commands, all parameter cases, zero startup network attempts, or absence of OS side effects through independent tracing. Startup OCR/pricer model download attempts remain visible in the offline log.

After pinning Inventory and collapsing Planning, the harness deleted the WebDriver session and created another with the same synthetic profile. The new session retained the title, dismissed onboarding, navigation storage, rendered Favorites section and collapsed Planning group. This is session-relaunch evidence; the harness does not record application PIDs or verify reboot persistence.

No app code, build or installed package changed during this follow-up. Remaining package/install/uninstall/upgrade, import/rollback, screen-content/layout/localization, broader guard and Windows/macOS acceptance work remains pending. Stage 2 is still held.

## Native import and marketplace follow-up

The unchanged compiled binary was tested through actual native IPC in the private synthetic Linux environment. `evidence/native-import.json` and `evidence/native-import.py` contain the results and reproducible harness. All eight earlier smoke assertions passed, along with four marketplace mutation guards and eleven import assertions.

Post/delete/update/close marketplace calls used synthetic credentials and IDs, and all returned the expected disabled error. No external network was available.

Notes/maps import succeeded; copied contents were checked on disk; a nested synthetic token was scrubbed from map JSON; source bytes remained unchanged after initial import. Replacement without opt-in was rejected. Explicit replacement applied new note contents and retained the old bytes in a backup. A malformed batch was rejected without changing the existing target note. Overlapping source/target and a symlinked source note were rejected.

These are IPC/filesystem tests, not import-dialog interaction tests. Malformed-batch rejection happens before applying files and does not exercise apply-phase rollback. Induced mid-apply failure, crash recovery, concurrent imports, other import categories and browser checklist hydration remain pending. No code or binary changed. Packaging and cross-platform acceptance remain open; Stage 2 is still held.

## Controlled apply-phase rollback and debug packaging

`evidence/native-rollback.json` records seven passing rollback checks through native IPC. A test-only LD_PRELOAD library intercepts rename for staged `notes/b.md` and returns EIO; its source is `evidence/rollback-fault.c`, and the fault marker appears in `rollback-webdriver.log`. The application's compiled file was unchanged, but runtime execution was deliberately instrumented. Earlier `a.md` replacement and `aa.md` creation occur before the injected failure by the importer's ordered file map. The error reported no rollback errors; both original files were restored, the new file was removed, source contents were preserved, and backups remained. This covers a controlled synchronous rename failure, not crash recovery, disk exhaustion, rollback failure or cross-platform semantics.

An unsigned Linux debug Debian package was produced by the installed Tauri CLI from a copy of the verified binary. See `evidence/debug-deb-bundle.log`, `debug-deb-inspection.json` and `package-debug.py`. Bundle generation marks the copied executable with Debian bundle information; it does not overwrite the original smoke-tested executable. The package contains `usr/bin/kiedas-orbiter-preview`, a Preview desktop entry and Preview resource directory with bundled data. Package metadata uses `kieda-s-orbiter-preview`. No package was installed or published.

This Fedora-built debug package is not release-qualified or Debian ABI/dependency-validated. Installation, packaged launch/resource resolution, uninstall/upgrade, AppImage and Windows/macOS acceptance remain pending. The package creation result supersedes the earlier blanket packaging-not-run status only for debug Debian generation and archive inspection. Stage 2 remains held.

## Ubuntu 24.04 package compatibility blocker

A disposable local Ubuntu 24.04 container tested the debug Debian package with no network and only the package directory mounted read-only. CPU was limited to four cores and memory to 2 GiB. The initial mount was unreadable under SELinux; that attempt is preserved in `evidence/ubuntu-package-mount-blocked.log`. The retry disabled labeling only for the disposable container, without relabeling workspace files.

`evidence/ubuntu-package-install.log` records unpack success but configuration failure because the minimal image lacks declared GUI dependencies. More substantially, ldd reports `/lib/x86_64-linux-gnu/libm.so.6: version GLIBC_2.43 not found`, required by the Fedora-built Preview executable. This package cannot run on this Ubuntu 24.04 image even if the missing GUI packages are installed. No app source fix has been attempted. The next build should use a deliberately selected supported Linux baseline/toolchain rather than package the existing Fedora executable for Ubuntu.

Removal of the unpacked, unconfigured package succeeded, and `/usr/bin/kiedas-orbiter-preview` was absent afterward (INSTALL_EXIT=1, REMOVE_EXIT=0, EXECUTABLE_ABSENT_EXIT=0). This is not successful full installation or upgrade/profile-isolation validation. The harness process exiting zero does not mean installation passed; explicit phase statuses and diagnostics above govern the result. The container was automatically removed. No user profile or installed stable app was mounted.

Implementation work stopped at the ABI finding per repository instructions. Packaged launch/resource resolution remains unverified. Stage 2 remains held.

## Ubuntu rebuild result

The new Ubuntu-built debug package installs, launches, reads its bundled resource through native fallback, and removes successfully in the equipped disposable Ubuntu 24.04 environment. This supersedes the prior GLIBC blocker only for the new artifact and tested environment. See `UBUNTU-VALIDATION.md` for evidence and remaining limits. Stage 2 remains held.

## Ubuntu artifact regression and package lifecycle follow-up

The installed Ubuntu executable (hash 4eb5f936f04533fc739f6a2e0bce460046a83613da927c7ea3e82a6cac52e00d) passed five integration guards, four marketplace mutation guards, eleven notes/maps import assertions and seven controlled apply-phase rollback checks. See `evidence/ubuntu-regression-packaged-smoke.json`, associated logs and `evidence/ubuntu-build/regression.py` / `regression-run.sh`. The rename fault injector was compiled on Ubuntu and loaded for this instrumented run. This supersedes the earlier statement that those specific tests had only run on the Fedora artifact; it does not imply every guard/import category or crash scenario was tested.

`evidence/ubuntu-package-lifecycle.json` records five passing package-manager checks. The test creates a temporary upgrade candidate with metadata version `1.3.3+stage2test1` and unchanged executable payload, installs it over the package, verifies version/payload/profile marker, then purges it. It enumerated 505 existing package-owned files/symlinks before upgrade; none remained after purge. Empty/shared directories and effects outside that owned-file list are not covered. The synthetic profile marker lived in a temporary test directory and was retained. No application was launched during this package-manager-only test.

The metadata-only candidate is not a new app release and does not exercise data-schema migration. Real stable/Preview package coexistence remains untested. Scripts and exact container commands are saved under `evidence/ubuntu-build/`; temporary containers and the synthetic upgraded package were removed. App source, reviewed original checkout and production installation were not changed. Stage 2 remains held for remaining acceptance work.
