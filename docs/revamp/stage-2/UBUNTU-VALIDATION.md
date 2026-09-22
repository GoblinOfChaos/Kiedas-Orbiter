> Current update (2026-09-05): the user approved the metadata-selector fix; it was applied and the coexistence rerun passed all five checks. No selector approval remains pending. Historical blocker descriptions below are superseded by this update. Stage 2 remains held for the other coverage limits.

> Current checkpoint: [CURRENT-ACCEPTANCE.md](CURRENT-ACCEPTANCE.md). It supersedes historical pending/status wording below. Stage 2 remains held.

# Ubuntu 24.04 rebuild and installed-package validation

## Result

The isolated Ubuntu native debug build and Debian bundle generation passed. The new package installed/configured, launched through native WebKitWebDriver, read a bundled resource and was removed successfully in a disposable equipped Ubuntu 24.04 container. This resolves the earlier Fedora executable's GLIBC 2.43 launch blocker for this tested environment. No app source or lockfile changes were needed.

## Reproducible evidence

- `evidence/ubuntu-build/`: Containerfiles, build/package/installed-smoke scripts, runner and image/toolchain provenance. Scripts retain environment-specific workspace paths.
- `ubuntu-build-image.log`, `ubuntu-test-image.log`: prepared dependency images. Host and existing container packages were not changed.
- `ubuntu-native-offline-mnn-blocked.log`: initial offline failure. ocr-rs invokes curl outside Cargo's cache handling. The existing Fedora MNN archive was copied to the separate Ubuntu cache, with hash and provenance in `ubuntu-mnn-cache.json`. It was not independently authenticated against upstream; this remains a reproducibility consideration for release builds.
- `ubuntu-native-build.log`, `ubuntu-debug-bundle.log`: successful retry and packaging. Separate cache/target directories preserve the Fedora outputs.
- `ubuntu-artifacts.json`: hashes of the Ubuntu native binary, bundle-marked copy and package.
- `ubuntu-equipped-install.log`: successful dpkg configuration, with dependencies present in the equipped test image.
- `ubuntu-packaged-smoke.json`: actual native launch/title/reload, native resource read, explicit bundle-fallback check and removal outcome. Startup copied resources into Preview; the first check read matching cached bytes. The second temporarily moved the synthetic cached resource, verified it was absent and compared the native result to the installed package bytes. The cached copy was restored afterward.
- `ubuntu-equipped-remove.log`: package removal. The executable was absent afterward and synthetic profile remained. Full installed-file/desktop/icon cleanup was not enumerated.

## Scope

The test used an offline disposable container, Xvfb and private D-Bus, four-CPU limits and synthetic XDG directories. Native compilation used nice 19 and CARGO_BUILD_JOBS=4. The test container mounts the workspace but no real user profile. The prepared build/test images remain local for reuse; run containers are automatically removed.

The installed executable is under /usr/bin, so this run does not retest executable-adjacent legacy migration. The JSON explicitly marks legacy_adjacency_test false; inherited marker assertions only describe the unrelated synthetic fixture. Earlier Fedora guard/import/rollback results apply to that earlier binary; the complete suite was not rerun against the Ubuntu artifact.

This is an unsigned debug package tested with preinstalled dependencies, not a release build or proof of dependency resolution on a clean desktop. Upgrade, stable/Preview package coexistence, exhaustive cleanup, crash recovery, all-screen workflows/layout/locales, AppImage, Windows and macOS remain pending. Stage 2 remains held.

## Ubuntu artifact regression and package lifecycle follow-up

The installed Ubuntu executable (hash 4eb5f936f04533fc739f6a2e0bce460046a83613da927c7ea3e82a6cac52e00d) passed five integration guards, four marketplace mutation guards, eleven notes/maps import assertions and seven controlled apply-phase rollback checks. See `evidence/ubuntu-regression-packaged-smoke.json`, associated logs and `evidence/ubuntu-build/regression.py` / `regression-run.sh`. The rename fault injector was compiled on Ubuntu and loaded for this instrumented run. This supersedes the earlier statement that those specific tests had only run on the Fedora artifact; it does not imply every guard/import category or crash scenario was tested.

`evidence/ubuntu-package-lifecycle.json` records five passing package-manager checks. The test creates a temporary upgrade candidate with metadata version `1.3.3+stage2test1` and unchanged executable payload, installs it over the package, verifies version/payload/profile marker, then purges it. It enumerated 505 existing package-owned files/symlinks before upgrade; none remained after purge. Empty/shared directories and effects outside that owned-file list are not covered. The synthetic profile marker lived in a temporary test directory and was retained. No application was launched during this package-manager-only test.

The metadata-only candidate is not a new app release and does not exercise data-schema migration. Real stable/Preview package coexistence remains untested. Scripts and exact container commands are saved under `evidence/ubuntu-build/`; temporary containers and the synthetic upgraded package were removed. App source, reviewed original checkout and production installation were not changed. Stage 2 remains held for remaining acceptance work.

## Approved actions completed; coexistence harness finding

The user approved the lockfile copy and migration filename fix. Both were applied. All three release migration cases passed eight assertions each; see release-migration-matrix.json. The stable-baseline frontend/native build and Debian packaging passed using the approved lockfile; provenance is in stable-lockfile-provenance.json.

The coexistence test is NOT a pass: the copied debug target contained a stale Preview archive alongside the newly built stable archive. The harness selected the first glob result, so its stable and Preview inputs were the same Preview package. `ubuntu-coexistence.json` honestly records failed distinct-name/file-collision assertions; these do not establish a product collision. `coexistence-package-selection.json` inspects both actual archives and confirms distinct package metadata. The first stable-baseline-artifacts.json package entry also inherited this selection error; use coexistence-package-selection.json for the authoritative package identities/hashes.

A proposed test-only correction is in COEXISTENCE-SELECTOR-FIX.patch: select exactly one archive by its actual dpkg Package metadata, rejecting ambiguity before installation. It has not been applied and the test has not been rerun. No stale package was deleted. No app source changed. Stage 2 remains held.
