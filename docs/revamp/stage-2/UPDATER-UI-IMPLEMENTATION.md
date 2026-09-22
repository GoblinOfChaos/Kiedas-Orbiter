# Approved Preview updater UI correction

The approved patch is applied only in the isolated checkout's `src/screens/Settings.jsx`. Settings now displays “Application updates are disabled in Preview.”, disables/restyles Check, and omits the startup-check toggle when the provider reports disabled. The provider, native guards, dependencies and lockfile were not changed.

## Validation

- Stable and Preview Vite builds passed; Ubuntu offline release rebuild and Debian/AppImage bundling passed. CPU affinity/container limits are four; all Cargo work sets CARGO_BUILD_JOBS=4 and runs with nice 19.
- **16 rendering checks passed**: the actual updater JSX subtree is extracted from prepatch/current Settings and rendered with React's server renderer. Six existing stable states × two startup-toggle values give 12 identical-markup comparisons. Four disabled-state assertions cover message, disabled Check, absent startup toggle and no install action/release notes even when a synthetic manifest is supplied. Icon/Toggle dependencies are mocked; this is subtree rendering, not full-screen stable runtime or native cache injection. The prepatch fixture hash matches the proposal's recorded Settings hash.
- **26 native checks passed for each rebuilt package**: 10 baseline/title/navigation/dialog-focus checks + five integration/updater guards + four market guards + four dialog layouts + three updater UI checks. The latter cover visible message/disabled Check/absent startup toggle and install action at 1200×800 and 900×500, then disabled state after reload. Bundled-resource fallback passes separately. These reuse the private networkless Xvfb/D-Bus and synthetic-profile harness; AppImage uses extraction mode.
- `evidence/updater-validation-summary.json` records counts and hash subjects: the installed Debian executable, and the AppImage archive used for extraction-mode launch (not a separately hashed internal ELF). `evidence/updater-release-artifacts.json` records the unbundled binary and both package hashes; the installed binary can legitimately differ after bundling.
- `evidence/updater-baseline-check.json` verifies 850 original tracked files unchanged, unchanged application Cargo.lock, Settings before/after hashes and clean isolated diff whitespace check.

## Reproducibility and preserved evidence

The old packages remain in `.preview-work/ubuntu-build/before-updater-ui-packages/`; their original manifest is `evidence/before-updater-ui-release-artifacts.json`. Previous implementation/acceptance documents are preserved with `before-updater-completion-` prefixes. Updated cumulative implementation.patch and implementation.json include this approved Settings change.

Reusable runners are copied to `evidence/ubuntu-build/updater-*`. Frontend logs are updater-frontend-production.log and updater-frontend-preview.log; native logs are updater-native-build.log and updater-native-bundle.log; package runners/logs use updater-deb/updater-appimage prefixes. Both earlier exit-status package results remain untouched.

Two test-only setup errors were fixed without dependency changes: direct esbuild resolution failed because it belongs to Vite's dependency tree, so resolution now starts from Vite's real location; the container lacks git, so the prepatch Settings fixture is exported from the isolated checkout before execution. Failures are preserved in before-transformer-fix-updater-render.log and before-git-fixture-fix-updater-render.log. The first is a recorded reproduction of the initial failure. These were fixture errors, not app failures.

## Remaining scope

Stage 2 remains HELD; Stage 3 has not started. This change does not rerun prior crash-recovery/import/upgrade matrices, whose implementation is untouched. Windows/macOS, published-release version upgrades, native OS-directory failure/stable migration regressions, exhaustive startup/request tracing, FUSE/other desktop environments and the other named coverage limits remain as recorded in CURRENT-ACCEPTANCE.md. No live account/game data, host app installation, publishing or signing was involved. No artwork was added.
