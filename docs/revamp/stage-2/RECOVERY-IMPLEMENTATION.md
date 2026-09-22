# Stage 2 import recovery implementation and validation

The approved correction is implemented in the isolated Preview checkout. The earlier SIGKILL failure remains preserved in CRASH-RECOVERY-REVIEW.md and its original evidence. No dependencies or app lockfile changed; no host installation or publication occurred.

## What changed

`preview_import.rs` writes a versioned immutable journal before staging, flushes staged payloads/backups, then publishes a ready marker before destination mutation. A committed marker identifies successful imports. Unfinished ready transactions restore originals and remove newly created files, retaining backups; recovered markers make later startups leave recovered content alone. Recovery is repeatable after a process dies halfway through restoration. Preparing transactions have not mutated destinations and do not restore incomplete backups.

Preview startup calls initialization before log cleanup, settings reads, normal commands, or background services. A process-lifetime OS file lock prevents two Preview instances from using the same profile. An additional OS import lock serializes/excludes import and recovery operations; the existing settings mutex continues to serialize native import command submissions in-process. Locks are released by the OS on process death. This uses std File locking on the existing Rust 1.96 toolchain, not a new dependency.

Journal versions, file count, duplicate paths, import destination allowlist, symlink/file/directory types, markers and required backups are validated. Recovery failure blocks normal startup and reports the error and backup path in an error-only native dialog. The error path creates no normal app windows or command handlers. Subsequent imports also attempt recovery before proceeding.

Older unjournaled backups with pending staged content require manual review: their original/new-file set cannot safely be inferred. They fail with the backup path rather than silently guessing. Older completed backups with empty staging are accepted. Backups are retained; there is no new automatic cleanup policy.

## Validation

| Area | Evidence and result |
|---|---|
| Real-module tests | recovery-policy-tests.log: 19 passed (includes three build-policy tests and a subprocess probe used by the cross-process lock test). Restoration, repeatability, commit/preparing phases, corrupt journals/markers, invalid paths, missing backup repair/retry, legacy partial backups, symlinks and lock contention covered. |
| Stable policy | recovery-stable-policy-tests.log: three existing policy tests passed without the Preview feature. This is not a full stable native rebuild. |
| Native import regression | recovery-regression-packaged-smoke.json: 11 import checks and seven EIO rollback assertions passed, plus startup checks, nine disabled-command guards and resource fallback. |
| SIGKILL during import | recovery-kill-first/new/last-packaged-smoke.json: all three recovery assertions pass in each run; originals restored, new file removed, originals present. Source unchanged; backups retained. |
| SIGKILL during recovery | recovery-kill-recovery-packaged-smoke.json: real second kill confirmed by one-shot marker/log. Intermediate state has b.md restored while a.md/aa.md remain replacements. Next launch restores a.md and removes aa.md; all three recovery assertions pass. |
| Crash after commit | recovery-kill-committed-packaged-smoke.json: real kill after successful committed-marker rename; all three replacement files remain after relaunch, as intended. |
| Recovery failure | recovery-blocked-packaged-smoke.json: invalid journal remains, settings file is not created, native error log explicitly reports recovery failure and backup path. WebDriver times out because normal app startup is blocked; this expected timeout is retained, not labeled as a successful browser session. Native alert text/layout/dismissal was not independently driven or measured. |
| Concurrent native submissions | recovery-concurrent-packaged-smoke.json: two simultaneous IPC submissions complete, two committed transactions exist, final shared file contains one complete submitted value, sources unchanged. Cross-process exclusion is separately tested in the module suite. |
| Rebuilt packages | recovery-native-build.log and recovery-native-bundle.log: optimized Ubuntu release and Debian/AppImage builds pass. Each package passes 23 smoke checks, including dialog bounds/scrolling/focus and nine guards, plus bundled-resource fallback. AppImage uses extraction mode, not FUSE. |
| Preservation | recovery-baseline-check.json: 850 tracked original files, zero mismatches; app Cargo.lock matches its previously recorded hash. |

The installed Debian executable SHA-256 is 163df59d700ef194611ef9ac322c6312b0256ba137911c4ef07d77db00dbed12. Actual pre-bundle binary and package hashes/sizes are in recovery-release-artifacts.json; release-artifacts.json now mirrors that current manifest. Earlier packages remain in .preview-work/ubuntu-build/before-recovery-packages, with their manifest preserved. Earlier native build log and first policy-test log remain under before-sync-refinement prefixes. The final implementation uses writable file handles when flushing staged/backup/restored files.

Reusable Python runners, C fault shims, and the separate test-only Cargo harness are copied into evidence/ubuntu-build. recovery-complete-summary.json consolidates the native batch plus final commit/concurrency cases. Harness process exit alone is not acceptance: inspect the recorded assertion fields, especially the intentionally blocked startup case.

## Limits and gate

SIGKILL is tested; a machine power loss, storage failure, adversarial concurrent filesystem modification, and every possible instruction-boundary interruption are not. Unix directory syncing and file syncing are implemented, but this is not cross-platform power-loss certification. Windows/macOS runtime behavior remains unverified. Real native folder-chooser interaction, error-dialog interaction, real release/schema upgrades, and other remaining Stage 2 acceptance items are still open. No new failure beyond the approved recovery scope was found.

Stage 2 remains HELD for those remaining items. The cumulative implementation patch includes recovery code and its new tests; prior patch/JSON are preserved with before-recovery prefixes. No commit, dependency change, publishing, or AI artwork was introduced.
