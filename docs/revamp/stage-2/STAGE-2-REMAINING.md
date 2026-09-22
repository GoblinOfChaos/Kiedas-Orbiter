> Stage 2 accepted for Linux. Items below remain deferred coverage, not blockers to authorized Linux Stage 3. Platform items are permanently tracked in ../ACCEPTANCE-LEDGER.md and reopened only when hardware or CI access exists.

# Stage 2 remaining acceptance work

See CURRENT-ACCEPTANCE.md for the original gate mapped to evidence. The former eight-batch checklist is preserved as BEFORE-UPGRADE-CONSOLIDATION-STAGE-2-REMAINING.md; its stale pending labels are superseded.

- **BLOCKED:** Windows native build/install/storage/runtime matrix; suitable environment not supplied.
- **UNAVAILABLE:** macOS native matrix, explicitly confirmed unavailable by the user.
- **PENDING broader release coverage:** published-release version upgrade. The actual pre-journal/current-payload compatibility transition passes, but both archives report 1.3.3. Future unrelated inventory/settings schema migrations have no current migration candidate to test.
- **Untested supplemental variants:** exhaustive startup OS/event/request tracing; native stale-provider-state injection (supplied stale-manifest JSX rendering is covered); stable migration-copy I/O failures; FUSE/clean-desktop/Wayland/other Linux baseline coverage; full in-screen live-data workflows and settings race matrices. Evidence tiers and exact limits remain in the gate/ledger rather than being treated as passes.
- **ACCEPTED:** user reviewed and accepted Linux-scoped Stage 2 with named deferrals; authorized Linux Stage 3.

No new app fix is pending. The later stable migration mechanism probe required a test build with application debug assertions disabled; no source or dependency change was made.

Updater UI follow-up: UPDATER-UI-IMPLEMENTATION.md records the approved fix, rebuilt packages and supplied stale-manifest JSX rendering coverage. This does not establish exhaustive request tracing or a persisted-cache/native provider injection test.

Directory/migration follow-up: PATH-ISOLATION-VALIDATION.md records current native missing-OS-directory coverage and stable release-branch mechanism coverage. Stable release-package qualification is not claimed. The historical stable build-log overwrite is disclosed there.

Review decision: the user accepted GATE-REVIEW.md as a Linux-only milestone. See LINUX-ACCEPTANCE.md.
