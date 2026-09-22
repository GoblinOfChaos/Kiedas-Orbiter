> Historical proposal: approved and implemented. See [UPDATER-UI-IMPLEMENTATION.md](UPDATER-UI-IMPLEMENTATION.md) for current results. The original review below is retained.

# Preview updater controls — approval required

Status: SOURCE-VERIFIED UI defect; proposed patch NOT applied. Stage 2 remains HELD.

## Finding

`src/contexts/UpdateContext.jsx` initializes Preview to `status: disabled`, with a null manifest. Both check and installation callbacks return immediately for Preview. `src/screens/Settings.jsx` does not render a disabled-state message, disables the Check button only while checking/installing, and always renders the editable startup-check toggle. Thus the visible Check action silently does nothing in Preview and the toggle suggests an available startup capability. This is a presentation inconsistency, not evidence of an update isolation bypass. The banner in App.jsx requires status available and cannot be activated through the reviewed Preview provider callbacks.

The provider stores its manifest/update object only in React state/refs; no persisted manifest read was found in the reviewed updater provider/consumers. A fabricated localStorage cache key would not test a real loading path. This source finding does not replace request tracing or the pending stale-state component test.

## Proposed change

`proposed-updater-disabled-ui.patch` changes only Settings.jsx: show an explicit disabled message, disable and restyle Check while disabled, and omit the startup toggle while disabled. Stable's existing status values retain their current rendering. The message follows the existing English Preview chrome; full Preview localization remains outside this patch.

`git apply --check` passed against the isolated checkout. The patch is not applied, built, or runtime-tested. On approval, apply in the isolated checkout, test disabled-state controls and stable rendering, then rebuild and smoke-test both packages with preserved before/after evidence.

## Evidence and limits

- `evidence/updater-disabled-ui-review.json`: source and proposed-patch hashes, dry-run result, not-applied flag.
- `evidence/updater-ui-baseline-check.json`: fresh original 850-file baseline comparison.
- No app source, dependencies, lockfile, or binaries changed this round. No new runtime pass is claimed.
- Initial searches assumed nonexistent updater paths; corrected by searching actual source and locating contexts/UpdateContext.jsx. No app defect inferred from those search failures.
- Prepared test image has dbus-monitor but no strace or /dev/fuse. FUSE launch remains blocked; no host device or package configuration changed.

Stopped at the new app defect under the user's blast-radius rule. Windows/macOS, published-release upgrade, and other explicitly open coverage remain unchanged.
