# Stage 2 native validation follow-up — 2026-09-04

## Result and review finding

The existing dev-fedora container successfully compiled and linked the complete Linux Preview debug application, including a second build embedding the frontend. The actual native application launched through WebKitWebDriver in Xvfb and rendered Preview navigation and onboarding.

**Finding requiring review:** `index.html:8` retains `<title>Cephalon Kronos</title>`. WebDriver returned that exact document title. Preview product/window configuration and rendered navigation use the intended branding, but the inherited HTML title remains. No application source was changed during this follow-up. Implementation work stopped at this discrepancy under the repository rule.

## Evidence and scope

- `evidence/native-container-build.log`: complete native debug build passed.
- `evidence/native-embedded-build.log`: `preview,tauri/custom-protocol` debug build passed.
- `evidence/native-smoke.json`: actual native WebDriver session, rendered DOM, binary hash, filesystem observations and three passing assertions.
- Synthetic executable-adjacent settings and sentinel were preserved; the sentinel was not imported into Preview; the synthetic stable OS data root was not created.
- Linux webview storage appeared beneath `xdgdata/com.jacob.kiedasorbiter.preview`; application settings/logs beneath `xdgdata/kiedas-orbiter-preview`.
- Build and smoke harnesses are copied into evidence for inspection. They record environment-specific paths and require the prepared container/tool extraction; they are not general installer scripts.

## Environment protection

Builds ran at nice 19 with CARGO_BUILD_JOBS=4 and affinity restricted to four permitted CPUs. The checkout/targets were moved from RAM-backed /tmp to ignored `.preview-work/stage2`. Existing container GTK/WebKit dependencies were reused. Signed Fedora RPMs for headless testing were downloaded and extracted into the workspace; no installed package set was changed. A private mount overlay supplied Xvfb's hardcoded xkbcomp path without changing the container's installed filesystem.

The runtime test used private network/mount namespaces, its own X server and D-Bus session, synthetic XDG directories and a copied executable beside synthetic legacy data. It did not access the user's actual profile or desktop session. External network access was unavailable. No AI-generated artwork was created or added.

## Remaining acceptance work

This was a relocated debug executable with embedded frontend, not an installed package. Missing bundled assets and unavailable remote requests limit screen-content validation. Onboarding remained visible; DOM route labels are not evidence that all screens were exercised.

Release/package install, uninstall and upgrade isolation; restart/import/rollback through the app; all-route interaction, keyboard/locales/minimum-size layout; direct native guard and live integration suppression; and Windows/macOS runtime storage remain pending. The successful first-launch case does not cover every existing-profile state. Stage 2 remains held and Stage 3 has not started.

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

### Ubuntu harness preservation

`evidence/ubuntu-package-test.py` was reconstructed from the executed commands after review and syntax-checked, not rerun. It preserves the test logic for both mount configurations and writes replay logs separately from the reviewed originals. The Ubuntu image tag is mutable, so later replays may use a different image; this harness does not establish a historical image digest. No build setup changed.

## Ubuntu rebuild result

The new Ubuntu-built debug package installs, launches, reads its bundled resource through native fallback, and removes successfully in the equipped disposable Ubuntu 24.04 environment. This supersedes the prior GLIBC blocker only for the new artifact and tested environment. See `UBUNTU-VALIDATION.md` for evidence and remaining limits. Stage 2 remains held.
