> Latest checkpoint: fatal-recovery dismissal now exits 1; all 11 real Linux GTK chooser/import/replacement checks pass. Both rebuilt packages pass 23 smoke checks each plus resource fallback. See [EXIT-STATUS-AND-NATIVE-UI.md](EXIT-STATUS-AND-NATIVE-UI.md). Stage 2 remains held for remaining upgrade/platform coverage and explicitly untested variants.

> Latest native-dialog checkpoint: recovery error window and Enter dismissal verified, but fatal startup exits with status 0; an app-source correction is proposed and unapplied. Native picker cancellation passes, selection automation remains pending. See [NATIVE-DIALOG-REVIEW.md](NATIVE-DIALOG-REVIEW.md).

> Latest checkpoint: approved journal/startup recovery implemented. Module tests, native import/rollback, five crash-boundary cases, concurrent submissions, and both rebuilt-package smoke suites pass. Invalid journals block normal startup as intended. See [RECOVERY-IMPLEMENTATION.md](RECOVERY-IMPLEMENTATION.md). Stage 2 remains held for remaining UI/upgrade/platform coverage.

> Latest checkpoint: abrupt termination during import leaves a partial active profile after relaunch (three failed recovery assertions); original backups survive. App correction requires approval. See [CRASH-RECOVERY-REVIEW.md](CRASH-RECOVERY-REVIEW.md). Stage 2 remains held.

> Latest checkpoint: Debian and AppImage were rebuilt with the approved dialog correction. Both pass 23 native smoke checks, including geometry/scroll reachability and nine IPC guards, plus resource fallback. Original 850 tracked files are unchanged. Stage 2 remains held for the documented remaining coverage. See [IMPORT-DIALOG-REVIEW.md](IMPORT-DIALOG-REVIEW.md).

> Current update (2026-09-05): the user approved the metadata-selector fix; it was applied and the coexistence rerun passed all five checks. No selector approval remains pending. Historical blocker descriptions below are superseded by this update. Stage 2 remains held for the other coverage limits.

> Latest checkpoint: both previously approved actions completed. All three release migration cases passed; the stable-baseline package built. Coexistence is blocked by a newly discovered stale-archive selector error. Automatic approval review rejected applying COEXISTENCE-SELECTOR-FIX.patch and rerunning, requiring a new confirmation. The patch remains unapplied. Earlier blocker descriptions below are historical; see the final follow-up section.

# Stage 2 consolidated review checkpoint

**Gate: HELD.** Linux release candidates now build and launch. Two corrective test/build actions require approval after automatic approval review rejected them. Other unverified coverage is listed below; this is not a declaration that Stage 2 is complete.

The user requested one continuous remaining-work run and confirmed macOS testing is unavailable and Windows testing is unlikely. macOS runtime acceptance is UNAVAILABLE; Windows runtime acceptance remains BLOCKED. Neither is treated as passed. Stage 3 has not started.

## Completed in this consolidated run

| Area | Evidence and exact result |
|---|---|
| Additional native guards | `remaining-ui-summary.json` / `ubuntu-remaining-packaged-smoke.json`: nine additional disabled-command checks passed (OCR screenshot/manual/debug, relic overlay, sidebar, sound, inventory API, monitoring enablement, resize-triggered overlay). Together with the previous nine, 18 distinct tested native commands are covered. |
| Generic exports | Four IPC rejection cases passed: relative path, parent traversal, stable root, symlink alias to stable root. Synthetic stable marker unchanged. This is not every filesystem race/adversarial case. |
| Additional import categories | Inventory/history transport fixtures were copied and scrubbed; safe preferences excluded synthetic credentials/monitoring; checklist localStorage hydration passed. Synthetic inventory/history fixtures were removed before screen navigation because they are not game-schema fixtures. |
| Real route interaction | WebDriver element clicks selected all 20 routes at 1200x800 and 900x500: 40 cases, no page-level horizontal overflow. Body text captured. Does not prove every control, clipped element, or live-data workflow works. |
| Keyboard/dialog | Real Tab reached the Dashboard pin, Enter pinned it; import dialog opened and Escape closed it. Native source-folder chooser and complete dialog import/replace flow remain untested. |
| Locales | All 15 locale route-label sets matched repository translation tables (including English fallback) at 900x500 without page-level horizontal overflow. Preview group labels/import chrome remain English as previously scoped. |
| Concurrent settings | Ten simultaneous set_setting IPC requests from one webview retained all ten values. This is not a full multi-window/process race test. |
| Standard release build | `ubuntu-release-build.log`: optimized release build passed in 7m14s; no release optimization overrides. |
| Release Debian | Created, installed/configured, launched through native WebDriver, read the bundled resource after moving the synthetic cached copy, and removed; synthetic profile retained. See `release-deb-packaged-smoke.json` and associated logs. |
| Release AppImage | Created and launched with APPIMAGE_EXTRACT_AND_RUN=1 in equipped Ubuntu, native resource fallback matched source resource bytes. This does not test FUSE mounting, desktop integration, or a minimal distribution. See `release-appimage-packaged-smoke.json`. |
| Original app preservation | `consolidated-baseline-check.json`: 850 original tracked files, zero mismatches. No AI-generated artwork or application source change in this consolidated run. |

Release hashes and paths are in `evidence/release-artifacts.json`. The release Debian archive is 116,328,180 bytes; AppImage 190,106,104 bytes. These are unsigned local test candidates, not published releases. Debug-artifact guard/import/rollback evidence is not automatically transferred to a new release executable.

## Two actions blocked by automatic approval review

1. **Stable-baseline dependency lockfile.** The exact frozen stable commit has no tracked Cargo.lock; its isolated --locked build stopped. Proposed action: copy the reviewed Preview Cargo.lock into the isolated stable-baseline checkout and build/package it for coexistence testing. This would preserve pinned dependency versions, but would not recreate a historical release binary. Automatic approval review rejected this action, citing the standing requirement for confirmation before fixing an unexpected build issue. It was not executed. The original source and installed stable app remain untouched. See `ubuntu-stable-lockfile-blocked.log`.
2. **Release migration harness filename.** Python combined a Path and string incorrectly when forming mode-specific evidence filenames. No usable release migration result was produced. Proposed action: parenthesize the filename expression in the test harness and rerun empty/directory-without-settings/existing-settings cases. Automatic approval review rejected that test-only correction and rerun under the same confirmation rule. No alternate harness was used to bypass the rejection. See `release-matrix-path-error.log`; `release-migration.py` remains unfixed.

## Remaining coverage after those approvals

| Requirement | Current limit |
|---|---|
| Release migration matrix | BLOCKED on the harness correction. Existing debug legacy-fixture evidence remains valid. |
| Stable/Preview coexistence | BLOCKED on the baseline lockfile decision/build. Prepared coexistence harness has not run. |
| Stable migration / unavailable OS directory | Stable migration has source-preservation evidence; missing-directory policy has unit evidence. Full native failure/stable migration scenarios are not complete. |
| Startup OS effects and updater traffic | Guard/config/source evidence exists; exhaustive attach/hotkey/notification/network tracing is not complete. Ordinary read-only model/data attempts are visible in offline logs; do not claim zero network attempts. |
| Crash recovery and settings concurrency | Synchronous rollback tested; crash recovery, rollback-failure, multi-process import and multi-window settings scenarios remain unverified. |
| Import UI and checklist failure recovery | Native categories/hydration tested; folder chooser, complete replace dialog and induced browser-storage failure remain unverified. |
| Full screen workflows | All route selections and limited keyboard/layout checks passed; live game/account workflows and every screen control are not covered by offline tests. |
| Actual release upgrade | Metadata-only dpkg upgrade passed earlier; no real version/schema migration candidate has been tested. |
| Windows/macOS | Static config/schema evidence only. Windows runtime BLOCKED; macOS runtime UNAVAILABLE per user. An eventual review may accept an explicitly Linux-scoped milestone, but that is not automatic cross-platform acceptance. |

## Evidence integrity and packaging friction

The release harness accidentally reused and truncated the prior successful Ubuntu debug compilation log. The active log was renamed to ubuntu-release-build.log; the loss is documented in `ubuntu-native-build-log-overwritten.txt`. No replacement historical debug build log was fabricated. Debug binaries, hashes, package and runtime evidence remain available.

AppImage generation first lacked xdg-open, then failed because its packaging runtime download was blocked by the offline container. Failure logs are preserved. A separate packaging image adds xdg-utils. The official AppImage runtime was downloaded via HTTPS and its hash recorded in `appimage-runtime.json`, then supplied with the documented [LDAI_RUNTIME_FILE option](https://github.com/linuxdeploy/linuxdeploy-plugin-appimage/blob/master/README.md). The upstream continuous release is mutable; the recorded content hash pins this run. No independent runtime signature verification is claimed.

Build/test harnesses are in `evidence/ubuntu-build/`; environment-specific paths are retained. Prepared but unexecuted harnesses are not evidence of passing tests. Original Fedora and Ubuntu debug packages remain separate from release outputs.

## Approved actions completed; coexistence harness finding

The user approved the lockfile copy and migration filename fix. Both were applied. All three release migration cases passed eight assertions each; see release-migration-matrix.json. The stable-baseline frontend/native build and Debian packaging passed using the approved lockfile; provenance is in stable-lockfile-provenance.json.

The coexistence test is NOT a pass: the copied debug target contained a stale Preview archive alongside the newly built stable archive. The harness selected the first glob result, so its stable and Preview inputs were the same Preview package. `ubuntu-coexistence.json` honestly records failed distinct-name/file-collision assertions; these do not establish a product collision. `coexistence-package-selection.json` inspects both actual archives and confirms distinct package metadata. The first stable-baseline-artifacts.json package entry also inherited this selection error; use coexistence-package-selection.json for the authoritative package identities/hashes.

A proposed test-only correction is in COEXISTENCE-SELECTOR-FIX.patch: select exactly one archive by its actual dpkg Package metadata, rejecting ambiguity before installation. It has not been applied and the test has not been rerun. No stale package was deleted. No app source changed. Stage 2 remains held.

## Approved coexistence rerun: PASS

`ubuntu-coexistence.json` records distinct Package names (`kieda-s-orbiter` and `kieda-s-orbiter-preview`) and hashes matching the actual stable-baseline and Preview debug archives. All five assertions passed: distinct names, no overlapping owned regular-file paths, stable file hashes preserved after Preview purge, Preview file hashes preserved after stable purge, and both executable paths absent after final purge. The installed applications were not launched; this is a package-manager coexistence/removal test in the disposable offline Ubuntu container, not simultaneous runtime/profile interaction.

Failed pre-fix evidence is preserved under `before-selector-fix-ubuntu-coexistence.*`. The corrected inspectable harness is `evidence/ubuntu-build/coexistence.py`; its metadata lookup fails before installation unless exactly one matching package exists. No stale archives were deleted and no app source was changed. The previous two approved actions and this selector correction are now complete. Remaining gaps are the separately documented runtime/crash/import-UI coverage and unavailable platform validation.
