# Stage 2 exit-status correction and native UI validation

The user-approved RECOVERY-EXIT-STATUS-FIX.patch is applied in the isolated Preview checkout. The error-only dialog callback now uses std::process::exit(1), with the same exit as a backstop if error-dialog construction/run returns. No other app change or dependency change occurred in this batch.

## Results

| Area | Verified result |
|---|---|
| Native error dialog | exit-recovery-dialog-packaged-smoke.json: real error-titled X11 window found, no normal main window, Enter dismissal yields process exit 1. Four failure-preservation assertions also pass (no settings created, invalid journal retained, backup path and recovery failure in the log). This supersedes the previous observed exit 0. |
| Real GTK folder chooser/import UI | exit-native-picker-packaged-smoke.json: 11 checks pass, covering native Escape cancellation, selected path reaching the component, UI-triggered native import, success message, unchanged source, replacement refusal without opt-in, original content retained on refusal, successful explicit replacement, replacement content applied and original backup retained. No Tauri module/IPC/picker mock was used. |
| Rebuilt Linux packages | Optimized native build and Debian/AppImage bundling pass. Each package passes 23 startup/dialog/guard smoke checks plus bundled-resource fallback. Debian install/remove occurs only inside disposable containers; AppImage uses extraction mode. |
| Preservation | exit-status-baseline-check.json: 850 original tracked files, zero mismatches; app lockfile unchanged. Prior implementation patch/JSON and previous packages/manifests remain preserved. |

The installed Debian executable hash is 5e255dc07b33f0b8656cab75f121b184bacd8290ebd636686a2302159fb853d1. Current binary/package hashes and sizes are in exit-release-artifacts.json; release-artifacts.json mirrors it. Build logs are exit-native-build.log and exit-native-bundle.log. exit-complete-summary.json consolidates the final results; exit-batch-summary.json preserves the earlier batch in which picker selection was still failing.

## Test-tooling corrections and evidence

The existing rfd/GTK3 backend and installed libX11/libXtst were used, with native input restricted to the disposable container's private Xvfb. No additional tools/packages were installed. The helper filters native windows by XGetWindowAttributes map_state, excluding GTK's hidden cancelled dialogs.

The initial location-entry/Return/mnemonic sequences did not produce a selection. The harness previously continued and failed on a missing imported file; it now requires the selected path to reach React before import. These failed runs, scripts and screenshots are preserved under descriptive before-* prefixes.

Private display captures showed the correct folder path and a completion popup. The final test first navigates to Home, enters the source path, and accepts with real pointer events on the observed Open button. It resizes only the native chooser to 1000x700 within the 1200x800 private display and clicks its lower-right button. Two bounded clicks allow completion-popup dismissal and button activation. The precise event-consumption cause of every failed key sequence was not instrumented; the successful pointer sequence is the verified result.

GTK source was consulted for location-entry/default activation behavior: https://github.com/GNOME/gtk/blob/gtk-3-24/gtk/gtkfilechooserwidget.c . The installed rfd source confirms GtkFileChooserNative with default GTK labels. The diagnostic screenshot viewer initially failed due this environment's namespace restriction; the saved PNG was read through the already-authorized command path, without changing host permissions/settings. Screenshots are real test captures, not generated artwork or app assets.

Both source folders are synthetic. Default categories import a note and an empty inventory JSON object; empty map directories contribute no files. This tests transport/UI integration, not real player inventory semantics. The app's Reload Preview button is used before the replacement flow, and the replacement checkbox/button use real WebDriver clicks. Native picker actions use XTest keyboard/pointer events; backend results and copied/backup files are real.

Reusable harnesses and the native_x11 helper are saved under evidence/ubuntu-build. The current helper includes visual-diagnostic support; prior helper versions are preserved where behavior differed.

## Remaining scope

This closes the tested Linux GTK native chooser/import/replacement workflow and recovery-error dismissal/exit checks. It does not prove keyboard-only folder acceptance, all locales/window sizes for the OS chooser, Wayland/portal chooser behavior, Windows/macOS UI, FUSE integration, or power-loss recovery. Real release/schema upgrade coverage and other explicitly pending Stage 2 acceptance items remain open. No new app defect was found in this batch. Stage 2 remains HELD pending the remaining acceptance work.
