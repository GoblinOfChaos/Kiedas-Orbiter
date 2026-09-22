# Stage 2 current acceptance gate

**Gate: ACCEPTED — Linux-only development milestone.** User accepted the evidence and named deferrals and authorized Stage 3 scoped to Linux. See [LINUX-ACCEPTANCE.md](LINUX-ACCEPTANCE.md) and the persistent [acceptance ledger](../ACCEPTANCE-LEDGER.md). Historical full-platform gate text is superseded by this explicit scope decision, not by new test results.

## Original gate, evidence and limits

| Requirement from Stage 1 PREVIEW-SPEC | Status and evidence | Limit |
|---|---|---|
| Stable/Preview installations coexist; independent removal | PASS, Linux package mechanism: ubuntu-coexistence.json, five assertions; package identities selected by embedded metadata | Stable baseline uses explicitly approved Preview dependency lock, not a historical release reconstruction. Simultaneous live app/game operation not tested. |
| Different profiles and webview storage per supported OS | PASS, Ubuntu runtime source/path records; native-smoke and Ubuntu packaged evidence | Windows BLOCKED; macOS UNAVAILABLE. |
| Startup/restart does not activate game/hotkey/notification/update integrations | PASS-SOURCE and direct native command guards: 18 distinct historical probes, nine rechecked on current release packages | Exhaustive OS attach/hotkey/event/network tracing with live game conditions remains untested. |
| Import only changes Preview and preserves source | PASS, synthetic native import/rollback tests; 11 real GTK import/replace UI checks; baseline preservation | Real account/game data intentionally unused; no real market orders. |
| No executable-adjacent legacy auto-migration/fallback | PASS, source/unit and release-migration-matrix.json, three cases | Earlier legacy-adjacency artifact tested unchanged root logic; current native missing-OS-directory failure passes. Stable migration passes using a baseline dev-profile binary with application debug assertions disabled, not a release-qualified package. |
| No active stable updater configuration or executable installation path | PASS-SOURCE/config and native rejection | Exhaustive request tracing remains open; supplied stale-manifest rendering is tested separately, not a persisted-cache or native provider injection test. |
| Every isolation surface has evidence or explicit blocked coverage | See ISOLATION-LEDGER.md | Platform coverage remains explicitly open in the persistent ledger; Linux development may proceed. |
| All existing routes preserved/open; keyboard at both sizes | PASS: previous 40 pointer/route-size cases, 40 keyboard activation cases on the pre-updater-UI package; navigation source unchanged | Every control/live-data workflow is not claimed. |
| Eight overlay definitions retained; live activation supervised | PASS-SOURCE preservation and tested rejection of disabled live commands | No live overlay redesign or supervised activation performed in this milestone. |
| No AI visual assets introduced | Existing commissioned/art assets plus conventional Preview badge; prior source/provenance review retained | Native screenshots are evidence, not app artwork. |
| Windows/Linux/macOS results recorded separately | Linux builds/packaging/native validation pass within recorded scope | Windows BLOCKED; macOS UNAVAILABLE. No cross-platform claim. |
| User review before Stage 3 | ACCEPTED by user, Linux scope | Stage 3 Linux work authorized; concrete implementation scope still required. |

## Completed follow-up work

- [PATH-ISOLATION-VALIDATION.md](PATH-ISOLATION-VALIDATION.md): nine native missing-directory assertions; 18 stable release-branch migration assertions; historical stable build-log loss disclosed.

- [UPDATER-UI-IMPLEMENTATION.md](UPDATER-UI-IMPLEMENTATION.md): approved disabled-state Settings correction; 16 rendering checks; rebuilt Debian/AppImage each pass 26 native checks plus resource fallback.

- [RECOVERY-IMPLEMENTATION.md](RECOVERY-IMPLEMENTATION.md): journal, startup recovery, locks; 19 module tests; five native crash-boundary cases; native concurrent submissions; import/EIO rollback regression.
- [EXIT-STATUS-AND-NATIVE-UI.md](EXIT-STATUS-AND-NATIVE-UI.md): native error-dialog exit 1; 11 real GTK chooser/import/replacement assertions; the prior exit-status Debian/AppImage each passed 23 smoke checks plus resource fallback.
- [UPGRADE-COMPATIBILITY.md](UPGRADE-COMPATIBILITY.md): 14 healthy pre-journal/current-payload transition checks, eight expected safe-blocking checks for old interrupted imports, 40 all-route keyboard cases.

Current hashes: evidence/release-artifacts.json (same artifacts as updater-release-artifacts.json). Current reviewable implementation: implementation.patch plus implementation.json. Original source preservation: evidence/path-isolation-baseline-check.json, 850 files / zero mismatches.

## Remaining distinctions

The actual known legacy-backup → journaled-import compatibility is now tested with different binaries. Both packages still report 1.3.3, so a published-release version transition and any future unrelated schema migration remain unverified. Earlier metadata-only upgrade evidence is retained and not inflated into that claim.

Ubuntu 24.04 equipped-container and extraction-mode AppImage results do not establish FUSE/desktop integration, other Linux baselines, Wayland/portal native dialogs, or Windows/macOS behavior. Native error dialog and GTK pointer-based folder acceptance were exercised; keyboard-only chooser acceptance and every native-dialog locale/size are not claimed. SIGKILL recovery is tested; power-loss certification and adversarial concurrent filesystem mutation are not.

The user accepted the Linux-scoped milestone with explicit deferred coverage. Persistent platform items remain open without blocking Linux Stage 3.
