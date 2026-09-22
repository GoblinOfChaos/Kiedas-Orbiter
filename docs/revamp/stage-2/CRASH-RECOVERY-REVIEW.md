> Superseded by the approved implementation and passing interruption tests in [RECOVERY-IMPLEMENTATION.md](RECOVERY-IMPLEMENTATION.md). The original failure and proposal below are preserved as historical evidence.

# Stage 2: interrupted import recovery failure

## Verified native result

The rebuilt release Debian executable (SHA-256 faf159d93a05c8172a4f05de157e6340a8d75dae1056f69749a062d33ca7dc17) was installed in a disposable network-disabled Ubuntu container, using only a synthetic profile. A test-only LD_PRELOAD rename shim sends SIGKILL immediately before the staged notes/b.md rename. It is compiled locally with gcc at nice 19; the container is capped at four CPUs. No app code or dependency was changed.

The sorted import first replaces a.md, creates aa.md, then moves the old b.md into its backup before the injected death. WebDriver records Session terminated without a reply. A new native session launches against the same synthetic profile and returns the Preview title.

| File | Before | After death and after relaunch |
|---|---|---|
| a.md | Original a.md | Replacement a.md |
| aa.md | Absent | Replacement aa.md |
| b.md | Original b.md | Absent |

All three recovery acceptance checks fail: originals restored, new file removed, all selected files present. Both originals are retained in preview-import-backup-*/notes; all source files are unchanged. This is a recoverable backup situation, but the active profile remains incomplete on relaunch. The app relaunched successfully; recovery did not occur. The harness error field is null because this is a successfully executed failure test, not passing recovery acceptance.

Source inspection finds staging and backup logic only in preview_import.rs, with error rollback inside the apply loop. There is no transaction journal/startup recovery hook for process termination. Earlier EIO tests remain valid for handled errors; SIGKILL cannot execute their in-process rollback. This test does not prove power-loss durability, concurrent-process safety, or recovery after every interruption point.

Evidence: crash-recovery-packaged-smoke.json, crash-recovery-run.log, crash-recovery-packaged-webdriver.log, and ubuntu-build/crash-recovery.py plus crash-fault.c. The package was removed inside the container; the host installation was untouched. crash-recovery-baseline-check.json freshly verifies 850 tracked original files unchanged.

## Proposed combined app correction — not applied

1. Persist a versioned import transaction journal before changing destinations, with validated relative paths, the list of pre-existing/new destinations, backup locations, and transaction phase. Keep backup contents until recovery is complete.
2. On Preview startup, recover unfinished transactions before loading profile-dependent state or accepting another import: restore originals, remove newly created files, and retain backups. Recovery must be restartable if interrupted. Mark a completed import so intentional successful copies are not rolled back.
3. If recovery cannot finish, show a clear recovery error and backup location and block further imports rather than silently continuing with a partial profile. Validate journal paths and serialize import/recovery operations.
4. Test interruptions before/during replacement, recovery interrupted midway, completed transactions on relaunch, and recovery failure. Re-run existing import/rollback checks. Include concurrent-import behavior in the same correction review. Use existing dependencies unless a separate dependency decision is needed.

This would edit real app source in preview_import.rs and startup/command/UI integration as needed. No implementation patch has been written or applied: approval is required for this newly discovered app defect.

## Other scope

Native chooser validation did not advance before the app-defect stop. The equipped test image has gdbus and gcc but neither xdotool nor an xdg-desktop-portal executable on PATH; no tooling/dependencies were installed. This is not proof a native dialog cannot be tested by another method. Native chooser remains PENDING. Real release/schema upgrades and other-platform runtime coverage remain unverified as previously documented. Stage 2 remains HELD.
