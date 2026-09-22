# Stage 2 isolation evidence ledger

All source paths below refer to the isolated Preview branch, not modified stable files. PASS-SOURCE and PASS-UNIT are narrower than runtime PASS.

| Surface | Inspected source / implemented boundary | Evidence / remaining validation |
|---|---|---|
| Product/installer/executable | tauri.preview.conf.json productName, identifier, mainBinaryName; platform resource lists retained | PASS-SOURCE + real Tauri schema test; installation/uninstall BLOCKED on all platforms |
| Debug/release roots | main.rs get_data_root routes Preview first to build_profile::preview_root | PASS-UNIT root and no-fallback tests, PASS-SOURCE branch order; Linux debug synthetic first launch PASS; release/package cases pending |
| Legacy migration | Preview returns before get_legacy_data_root/copy_dir_recursive; stable branch retained | PASS-SOURCE; synthetic executable-adjacent debug launch PASS; release test pending |
| Initial identity mismatch | main() checks compiled feature against context identifier before log/profile activity; frontend checks native profile before rendering | PASS-SOURCE, Rust syntax/frontend compile; full Linux native debug compile PASS |
| Settings/local JSON | load/save/settings helpers route through resolve_path; import holds settings mutex | PASS-SOURCE; concurrent multi-window persistence test BLOCKED |
| Logs/models/images | logger, ocr_engine, pricer use get_data_root; main asset/extraction helpers use resolve_path | PASS-SOURCE; runtime filesystem trace BLOCKED |
| Bundled resource fallback | read_file_bytes/resolve_asset_path retain immutable bundle fallback | PASS-SOURCE; package content resolution BLOCKED |
| Webview storage | inspected installed Tauri 2.11.5 manager/webview.rs: Linux/Windows default data_directory is LocalData/config.identifier; no app custom data_directory override found | Linux headless actual storage observed under com.jacob.kiedasorbiter.preview; Windows/macOS runtime isolation pending |
| Overlay windows | full original windows array retained with Preview titles; shared creation/show and live commands guarded | PASS-SOURCE/schema; full native suppression/live geometry tests BLOCKED |
| Hotkeys/scanning/API | start_log_scanner, set_hotkeys, register_one_via_plugin, call_api_helper and monitoring-active guards; Preview auto-start false | PASS-SOURCE + policy tests; attach/grab tracing BLOCKED |
| OCR and startup extraction | OCR command guards; screenshot startup probe and automatic card extraction skipped | PASS-SOURCE; screenshot/permission absence runtime test BLOCKED |
| Notifications | show_notification, show_relic_overlay, sound and shared overlay guards | PASS-SOURCE; all-category live regression BLOCKED |
| Marketplace writes | post/delete/update/close native order wrappers guarded | PASS-SOURCE; no real order calls made |
| Updater | plugin config removed by merge patch; registration omitted; Preview capabilities omit updater permission; provider returns disabled; AppImage backend rejects | PASS-UNIT real config schemas; zero-request/direct-command runtime tests BLOCKED |
| Desktop/autostart | no native autostart registration found; Preview launcher uses separate identity; existing scripts/rebuild-appimage.sh hardcodes stable paths and MUST NOT be used for Preview | source inspected; generated desktop entries and installer registration BLOCKED |
| Generic file writes | write_file Preview checks absolute/no-parent/no-symlink and stable-root ancestry | PASS-SOURCE; filesystem adversarial runtime checks still required |
| Explicit imports | preview_import.rs allowlists categories/preferences, validates paths and budgets, backs up and stages replacements; Preview-only native entrypoint | PASS-UNIT source preservation, secret exclusion, malformed/symlink rejection, overlap, overwrite choice, backups; app/crash/concurrency tests BLOCKED |
| Checklist | explicit file of allowlisted localStorage keys; Preview bootstrap backup and revision application | PASS-SOURCE; browser-storage failure/rollback runtime test PENDING; stable export remains manual |
| Shared navigation | App.jsx retains screen map and stable nav; PreviewNavigation groups exact 20 IDs | PASS-SOURCE/frontend; favorites/restart/keyboard/min-size/locales runtime tests PENDING |
| Artwork | existing repository icon plus plain vector/text badge, rasterized by rsvg-convert and Tauri icon tooling | provenance file; no image-generation tool used, no mockup images bundled |

Do not interpret source enumeration as complete cross-platform isolation proof. Native build and runtime evidence are required to close this gate. No Stage 3 work is authorized by this ledger.

Native follow-up: see `NATIVE-VALIDATION.md`. Inherited HTML document title is still Cephalon Kronos; product/window configuration does not correct this document title.

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
