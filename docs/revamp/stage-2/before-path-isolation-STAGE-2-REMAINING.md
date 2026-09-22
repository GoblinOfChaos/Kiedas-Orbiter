# Stage 2 remaining acceptance work

See CURRENT-ACCEPTANCE.md for the original gate mapped to evidence. The former eight-batch checklist is preserved as BEFORE-UPGRADE-CONSOLIDATION-STAGE-2-REMAINING.md; its stale pending labels are superseded.

- **BLOCKED:** Windows native build/install/storage/runtime matrix; suitable environment not supplied.
- **UNAVAILABLE:** macOS native matrix, explicitly confirmed unavailable by the user.
- **PENDING broader release coverage:** published-release version upgrade. The actual pre-journal/current-payload compatibility transition passes, but both archives report 1.3.3. Future unrelated inventory/settings schema migrations have no current migration candidate to test.
- **Untested supplemental variants:** exhaustive startup OS/event/request tracing; cached updater-manifest UI; native missing-OS-directory/stable-migration fault cases; FUSE/clean-desktop/Wayland/other Linux baseline coverage; full in-screen live-data workflows and settings race matrices. Evidence tiers and exact limits remain in the gate/ledger rather than being treated as passes.
- **PENDING:** user review of Stage 2 before Stage 3. An explicitly Linux-scoped milestone with named deferrals may be reviewed; it is not automatic cross-platform acceptance.

No new app fix is proposed by the upgrade/keyboard batch. No new dependency or build change was needed.

Updater UI follow-up: UPDATER-UI-IMPLEMENTATION.md records the approved fix, rebuilt packages and supplied stale-manifest JSX rendering coverage. This does not establish exhaustive request tracing or a persisted-cache/native provider injection test.
