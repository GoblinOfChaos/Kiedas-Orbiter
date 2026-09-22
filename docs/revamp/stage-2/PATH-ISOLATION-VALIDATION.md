# Linux directory resolution and stable migration controls

This batch changes test tooling and documentation only. No app source or dependency changes were made. The current Preview release packages are unchanged. Stage 2 remains HELD.

## Preview: unavailable OS data directory

**Nine assertions pass** in evidence/missing-data-root-native.json. The current release binary, SHA-256 30e4791f112c36b27bb8635da960f506acc2be991bd5274f394c2795ca509ce1, is copied beside synthetic legacy settings and a sentinel. A separately seeded stable profile is present. A test-only LD_PRELOAD library makes getenv(XDG_DATA_HOME), getenv(HOME), and getpwuid_r return unavailable/no entry only to this subprocess. The injector logs each path. The parent HOME environment is not changed.

The real app exits **1**, printing `Preview cannot resolve the OS data directory; no legacy fallback is allowed`. Both synthetic source/profile hashes remain unchanged; no Preview root or working-directory data fallback appears. Source confirms main validates this before normal startup/profile operations. This is a native Linux failure-path test, not a normal GUI launch or proof about Windows/macOS directory discovery.

The first test expectation incorrectly required wording from get_data_root's later expect() path. The earlier main validation correctly exits first. That test-only assertion was corrected to the actual source message; the original JSON, native log and runner failure are preserved under before-error-text-fix-missing-data-root-*.

## Stable: release-only migration branch

**18 assertions pass** across three cases in evidence/stable-migration-native.json: absent stable root, existing stable directory without settings, and existing stable settings. The first two copy the synthetic legacy settings/note and emit the migration message. Existing settings prevent copying the legacy sentinel and retain their original bytes. Every case preserves legacy source and a separately seeded Preview profile.

The preserved stable binary was a debug build and therefore bypassed migration. A new mechanism-test binary was built from the untouched stable baseline using Cargo rustc with `-C debug-assertions=no` for the application crate. Dependencies remain in the existing dev profile. This exercises the actual release-only root-selection branch; it is **not** a release-profile package, an exact historical dependency reconstruction, or a shipped stable binary. The previously approved Preview-derived lockfile remains unchanged. The baseline's 850 tracked files still match the original manifest, and the stable portion of get_data_root is identical in Preview's shared source.

The stable tests deliberately have no usable display, session bus or network. Migration runs before GUI initialization; subsequent GTK initialization fails and the process exits 101. That is the intended test boundary, not a successful GUI startup or a newly discovered app defect. No host stable app is launched or stopped. All synthetic data and processes are inside disposable offline containers.

## Evidence integrity and limits

The probe runner initially retained the historical ubuntu-stable-baseline-build.log destination: a filename replacement failed to match its full path literal. The new build overwrote that historical log. This loss is explicitly recorded in evidence/stable-migration-build-log-disclosure.md; the old filename now points to the disclosure rather than masquerading as historical output. The new build output is preserved as stable-migration-probe-build.log, and the runner uses that unique destination. The lost log has **not** been reconstructed. The prior stable executable was preserved before rebuilding in .preview-work/ubuntu-build/before-stable-migration-probe/, and prior package artifacts remain intact.

Reusable runners and the C injector are copied to evidence/ubuntu-build/. evidence/path-isolation-baseline-check.json records original and stable-baseline 850-file comparisons, stable root-branch equality, both unchanged lockfiles, unchanged Preview artifact hashes, and old/new stable executable hashes. Cargo ran offline/locked with CARGO_BUILD_JOBS=4 and nice 19; containers were limited to four CPUs. No new dependency was installed.

These results close the missing-directory native case and establish stable migration behavior at its actual release-branch mechanism tier. They do not qualify a stable release package or test migration-copy I/O failures. Other held coverage—Windows/macOS, published-release version transitions, exhaustive startup/request tracing, FUSE/other desktop environments and full live-data workflows—remains explicit in the acceptance ledger. No promotion to Stage 3 is implied.
