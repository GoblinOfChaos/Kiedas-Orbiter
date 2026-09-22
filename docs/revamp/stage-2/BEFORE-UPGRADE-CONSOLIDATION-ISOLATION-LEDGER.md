> Current update (2026-09-05): the user approved the metadata-selector fix; it was applied and the coexistence rerun passed all five checks. No selector approval remains pending. Historical blocker descriptions below are superseded by this update. Stage 2 remains held for the other coverage limits.

# Stage 2 current isolation ledger

See [CURRENT-ACCEPTANCE.md](CURRENT-ACCEPTANCE.md) for the authoritative checkpoint, blockers and evidence limits. The previous accumulated ledger is preserved in ISOLATION-LEDGER-HISTORY.md.

| Surface | Current evidence | Remaining gap |
|---|---|---|
| Identity/package names | Source/schema, debug/release Debian generation and Preview install/remove pass | Actual stable/Preview coexistence blocked |
| Profile roots/migration | Source/unit and debug synthetic legacy test pass | Release matrix blocked by harness correction; OS-directory native failure untested |
| Webview storage | Ubuntu native isolated identifier observed | Windows/macOS runtime unavailable |
| Resource fallback | Debug/release Debian and release AppImage native fallback pass | Other Linux environments/FUSE untested |
| Live integration commands | 18 distinct direct native guard cases pass across Ubuntu debug runs | Exhaustive startup OS tracing incomplete |
| Marketplace writes | Four native mutation wrappers reject | No real orders issued |
| Updater | Config/plugin omission and direct AppImage-update rejection | Full request tracing/cached-manifest UI case incomplete |
| Generic exports | Four adversarial path cases reject | Race and exhaustive filesystem cases incomplete |
| Import | Notes/maps and other categories, credential scrubbing, hydration, seven synchronous rollback checks pass | Crash recovery, UI chooser/replace, storage-failure and concurrent imports incomplete |
| Settings | Ten simultaneous IPC writes retained | Separate-window/process race matrix incomplete |
| Navigation | 40 real route/size clicks, Tab/Enter pin and Escape dialog close pass | Every control/live-data workflow not tested |
| Locales | 15 route-label sets match tables with no page-level horizontal overflow | New Preview-only chrome remains English |
| Package lifecycle | Debug metadata upgrade, 505 owned files removed; release Debian install/remove pass | Real-version migration/coexistence incomplete |
| Artwork | Existing artwork plus conventional Preview text badge; no generated art added | Original provenance evidence retained |
| Windows/macOS | Static schemas/config retained | Windows BLOCKED, macOS UNAVAILABLE per user |

Stage 2 remains held. Stage 3 requires a separate user review decision.

## Approved actions completed; coexistence harness finding

The user approved the lockfile copy and migration filename fix. Both were applied. All three release migration cases passed eight assertions each; see release-migration-matrix.json. The stable-baseline frontend/native build and Debian packaging passed using the approved lockfile; provenance is in stable-lockfile-provenance.json.

The coexistence test is NOT a pass: the copied debug target contained a stale Preview archive alongside the newly built stable archive. The harness selected the first glob result, so its stable and Preview inputs were the same Preview package. `ubuntu-coexistence.json` honestly records failed distinct-name/file-collision assertions; these do not establish a product collision. `coexistence-package-selection.json` inspects both actual archives and confirms distinct package metadata. The first stable-baseline-artifacts.json package entry also inherited this selection error; use coexistence-package-selection.json for the authoritative package identities/hashes.

A proposed test-only correction is in COEXISTENCE-SELECTOR-FIX.patch: select exactly one archive by its actual dpkg Package metadata, rejecting ambiguity before installation. It has not been applied and the test has not been rerun. No stale package was deleted. No app source changed. Stage 2 remains held.
