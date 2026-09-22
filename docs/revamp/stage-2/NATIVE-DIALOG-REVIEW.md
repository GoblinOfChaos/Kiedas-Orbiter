> Latest follow-up: the approved exit-status correction and real Linux GTK picker/import/replacement checks pass. See [EXIT-STATUS-AND-NATIVE-UI.md](EXIT-STATUS-AND-NATIVE-UI.md). Earlier failures and limits below are preserved as historical evidence.

# Native dialog follow-up

No app source, dependency, lockfile, or compiled package changed in this batch. The same recovery-enabled release Debian executable was used in disposable network-disabled containers. All input injection targets the container's private Xvfb, never the real desktop. The installed plugin uses GTK3 by default, and existing libX11/libXtst libraries permit native keyboard input without installing additional tools.

## Native recovery error dialog

`native-recovery-dialog-packaged-smoke.json` records the actual error-titled native X11 window, absence of the normal main window, Enter dismissal, and process exit. The invalid journal stays intact, no profile settings file is created, and the error log identifies recovery failure and the backup path.

A new app finding: `native_process_exit` is 0; the assertion expecting status 1 fails. Other dialog/blocking assertions pass. This does not weaken the tested prevention of normal startup, but it incorrectly signals successful process termination to a caller despite fatal recovery failure. The source callback calls handle.exit(1), so the observed exit does not meet its intended status. The precise runtime ordering responsible has not been instrumented; an asynchronous exit-request timing explanation is an inference, not proven evidence.

Proposed UNAPPLIED correction: RECOVERY-EXIT-STATUS-FIX.patch directly terminates this error-only process with status 1 from the dismissal callback and also after an error-dialog builder/run return. No normal services or imported-profile state have started on this branch, and initialization's failed locks have already unwound. This avoids relying on delivery of an asynchronous runtime exit request. Applying the patch and rebuilding/retesting requires approval because it edits real app source.

## Native folder chooser

The actual GTK chooser opened through the app's real Choose source folder button. Native Escape cancelled it and the component retained No folder selected. The first test helper selected windows by title only; GTK retained a hidden cancelled chooser, so a second open produced two matching titles. That test-tooling defect was corrected using XGetWindowAttributes/map_state == IsViewable, based on the installed Xlib header. Before-visible-window-fix evidence and helper are preserved.

After that helper correction, the path-entry/Enter sequence still left the visible chooser open. The component did not receive a selected path. The harness's later attempt to read an imported note therefore failed; no successful native selection/import is claimed. The next test-tooling step is correcting and verifying the native accept-button keyboard action and requiring selection before proceeding. It has not been completed because this batch stopped on the separate app exit-status finding. No picker mock or IPC replacement was used.

The first recovery-dialog run used the pre-filter helper; its relevant title was unique, so it successfully found and dismissed the real native error dialog. The exact helper version used is preserved as before-visible-window-fix-native_x11.py. The newer helper was used for the chooser retry.

`native-dialog-baseline-check.json`: 850 original tracked files, zero mismatches. Native alert text contents and physical mouse/touch behavior remain outside these measurements. Stage 2 stays HELD; native chooser completion, real schema upgrade, and outstanding platform coverage remain open.
