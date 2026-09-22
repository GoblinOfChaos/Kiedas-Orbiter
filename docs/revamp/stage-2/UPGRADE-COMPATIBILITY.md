# Stage 2 package/data compatibility and keyboard gate

No app source, build, dependency, lockfile, or release artifact changed in this batch. Tests used preserved pre-journal and current Debian archives inside disposable network-disabled Ubuntu containers capped at four CPUs; scripts ran at nice 19. The host package database and real profiles were not used.

## Real payload/data transition: 14 checks pass

The old package hash is 8d6ae782a4f8ace8ca38e66c54c667917df51721f6d9b64073817f34ce4e191b, with installed executable faf159d93a05c8172a4f05de157e6340a8d75dae1056f69749a062d33ca7dc17. The new package hash is 5c61fcfb4426e94d681f3b408b6d3c08ac29798cc4cf4a55b9c856c5ac00d646, with installed executable 5e255dc07b33f0b8656cab75f121b184bacd8290ebd636686a2302159fb853d1. Both package versions are 1.3.3.

`data-upgrade-packaged-smoke.json` records a real old-app IPC import, its unjournaled backup, termination of the old native process, dpkg replacement by the new payload, and a distinct new native process using the same synthetic profile. Existing imported content and all old backup file hashes are unchanged. The old backup is not rewritten as a journal. A subsequent native import creates a version-one journal and committed marker, retains the previous note in its backup, and survives another native process restart. Both source folders remain unchanged. All 14 upgrade assertions pass.

This is an actual app/data-compatibility transition, not the earlier metadata-only package bump. Because the package version is unchanged, it does not prove a published release-to-release version upgrade or a future inventory/settings schema migration. The current added journal format and legacy backup compatibility are exercised with real old/new binaries; broader schemas are not invented for a test.

## Interrupted old import: eight expected-policy checks pass

`interrupted-upgrade-packaged-smoke.json` starts the old package and kills it before the staged b.md rename using the existing SIGKILL shim. The active profile is partial, with originals retained in an unjournaled backup. After installing the current package, the real native recovery-error dialog appears and exits 1 on dismissal. No normal window appears. The old partial files and backup bytes remain intact, with no fabricated journal or guessed recovery. Source notes are unchanged.

All eight assertions pass. This verifies safe refusal/manual-recovery behavior; it does not mean the old interrupted profile becomes usable automatically. Journaled interruption recovery is covered separately by RECOVERY-IMPLEMENTATION.md.

## All-route keyboard navigation: 40 checks pass

`keyboard-routes-packaged-smoke.json` tests all 20 routes at 1200x800 and 900x500 on the current installed binary. Initial focus is placed once in navigation; subsequent traversal uses real WebDriver Tab and route activation uses Enter. Each size takes 44 traversal steps to visit all 20 routes. Every activation has the expected aria-current page and visible retained keyboard focus. No route is missing and no case fails. This complements existing pointer/route-body evidence; it does not test every control or real-game workflow inside every screen.

## Evidence and preservation

Reusable runners are under evidence/ubuntu-build. Native logs, old/new installation logs and process IDs are retained in the case records. `upgrade-keyboard-summary.json` consolidates results. `upgrade-keyboard-baseline-check.json` freshly verifies all 850 original tracked files unchanged. No new app defect was found. See the refreshed CURRENT-ACCEPTANCE.md for the full gate and remaining limits.
