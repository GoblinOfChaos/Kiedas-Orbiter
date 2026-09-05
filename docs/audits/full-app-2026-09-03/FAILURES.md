# Confirmed and Provisional Findings

This backlog is in progress. `Confirmed` means directly demonstrated by source, artifact, or automated data evidence. `Runtime pending` means the source/data condition is real but its visible effect still needs the frozen AppImage runtime pass.

## Critical

### SEC-UPD-001 — Custom Linux updater bypasses artifact verification

- Status: Confirmed
- Evidence: `src-tauri/src/main.rs`, `download_appimage_update`
- Actual: The command accepts a URL, downloads its response body without `error_for_status`, writes it over `$APPIMAGE`, applies executable permissions, and launches it. It never verifies the signature supplied by updater metadata.
- Impact: A compromised/misdirected endpoint or callable command can replace and execute the installed application. An HTTP error body can also replace the AppImage.
- Boundary: Use the signature-verifying Tauri updater path or explicitly verify the signed artifact before replacement; validate status, target, size, and atomic rollback. No fix was made.

## High

### PKG-RES-001 — Clean AppImage cannot resolve its own bundled resources

- Status: Confirmed in frozen AppImage runtime
- Artifact: SHA-256 `e4e2fa5f3e01a111b32cf3cbe116cf513e4e5799719f423de689bfc326be4ea4`
- Evidence: The mounted AppImage contains resources under `usr/lib/kiedas-orbiter/data/...`, while Tauri's runtime fallback resolved them under `usr/lib/Kieda's Orbiter/data/...`.
- Actual: Clean-profile startup logged missing `riven_good_rolls.json`, missing `wfcd-combined.json`, and `Warframe-Exporter-CLI not found`. Direct package inspection confirmed all three exist under the differently named packaged directory.
- Impact: A clean installation cannot use packaged Riven roll data, weapon vocabulary, or exporter fallback. Features may remain empty or broken until separately downloaded/copied data happens to mask the packaging error.
- Boundary: Make the bundled resource destination and Tauri resource resolver use one stable application directory name; test every bundled resource from a genuinely empty profile. No fix was made.

### PRIV-START-002 — Screen-capture probe occurs before disclaimer acceptance

- Status: Confirmed in frozen AppImage runtime
- Evidence: On the first isolated launch, before `disclaimer-accepted` existed, app output logged `[OCR] Capture via xcap Monitor` and `Screenshot probe: granted`; the isolated settings file then contained `screenshot_probe_granted: true` while still lacking disclaimer acceptance.
- Impact: The application captures the display to probe screenshot capability before the user accepts the warning explaining memory/screen-related behavior.
- Boundary: Gate all capture, OCR, detector, and permission probes behind explicit onboarding consent and test that no capture API is called beforehand. No fix was made.

### OCR-LIVE-001 — Reward OCR resolves a Prime component as the parent blueprint

- Status: Confirmed by operator-supplied live screenshot; frozen-artifact reproduction pending
- Provenance: The screenshot was supplied during live play on 2026-09-03. The running installed AppImage resolved to `/var/home/jedwards/AppImages/kiedas_orbiter.appimage`, SHA-256 `76c40481aee49a64964832b8e374a2ff4e018266294b01d01f98f32868354995`. This differs from the frozen audit AppImage and is not mislabeled as frozen-build evidence.
- Expected: Warframe displayed `Yareli Prime Chassis Blueprint`; the overlay should show that exact component and its component-specific ownership context.
- Actual: The overlay displayed `Yareli Prime Blueprint`, used the main Warframe image, and showed parent-blueprint/Warframe ownership details. The adjacent `Vadarya Prime Stock` and `Bronco Prime Barrel` cards were identified correctly in the screenshot.
- Award confirmation: The operator confirmed selecting the Yareli chassis. At 2026-09-03 14:15:48 PDT, `inventory_history.json` recorded `/Lotus/Types/Recipes/WarframeRecipes/YareliPrimeChassisBlueprint` increasing from 1 to 2; the refreshed `inventory.json` then reported `ItemCount: 2`. This confirms that the actual awarded item was the chassis while the overlay represented the parent blueprint.
- Impact: Reward value and ownership guidance can refer to a different item, potentially causing the player to choose the wrong reward.
- Boundary: Preserve the raw OCR text and candidate scores, prevent a parent blueprint from outranking an explicitly recognized component suffix, and add a Yareli Prime Chassis regression case. No fix was made and the mission does not need to be repeated solely for this report.

### NOTIF-001 — Configured notification rules never leave initialization

- Status: Confirmed
- Evidence: `src/contexts/MonitoringContext.jsx`; `notifInitRef` is initialized to `false`, read in the evaluator effect, and never assigned `true` anywhere in the source tree.
- Actual: Each evaluation computes matches, marks them as seen, and returns through the first-data branch forever.
- Impact: Fissure, Arbitration, Void Trace, syndicate, Foundry, Mastery, checklist, sale, and bounty notification-manager rules do not deliver. Chat notification logic is separate.
- Boundary: Correct and test the initialization transition and dedup lifecycle. No fix was made.

### SEC-PATH-001 — File commands do not confine caller-provided paths

- Status: Confirmed by source
- Evidence: `resolve_path` performs only `get_data_root().join(relative)`; note/map commands join unvalidated filenames; `read_file_bytes` and `resolve_asset_path` accept an unvalidated relative value.
- Actual: Absolute paths and parent traversal are not rejected or canonicalized against an allowed root. `delete_note` passes the resulting path to `remove_file`.
- Impact: A compromised webview or future frontend defect can read, overwrite, or delete files accessible to the app user outside the intended data folders.
- Boundary: Define explicit roots per command, reject absolute/parent components, canonicalize safely, and add traversal/absolute/symlink regression tests. No exploit was executed and no file was changed.

### PKG-UPD-002 — Published Windows/macOS updater entries are unusable

- Status: Confirmed by current release metadata and HTTP probes
- Evidence: v1.3.4 `updater.json` has empty Windows/macOS signatures; its Windows, macOS x64, and macOS arm64 URLs returned 404. Release assets use `Kieda.s.Orbiter...` names while updater fallbacks use `Kiedas-Orbiter...` names.
- Impact: Update download/install cannot succeed safely on those targets.
- Boundary: Generate platform updater artifacts and signatures through the supported Tauri workflow, and verify all metadata URLs before publishing. No release was changed.

### DATA-001 — Runtime export source violates the primary-source requirement and is stale

- Status: Confirmed
- Evidence: Current export refresh source is `calamity-inc/warframe-public-export-plus`; official DE PublicExport was fetched and compared on 2026-09-03.
- Actual: Cached data is missing 44 official Customs records, 51 Flavour records, 1 Gear record, 5 Recipes, 57 Resources, and 3 Upgrades. Seven hand-added Cosmetics cover seven of the 44 missing Customs records, leaving 37 current official cosmetics absent.
- Impact: Catalog, acquisition, Foundry, resource, and mod surfaces can omit current content.
- Boundary: Make official DE PublicExport authoritative; treat derived supplements as explicit, provenance-labeled additions. No data file was changed.

### DEP-001 — Production dependency audits report known vulnerabilities

- Status: Confirmed
- Evidence: `pnpm audit --prod` and `cargo audit`
- Actual: The JavaScript tree reports two High and one Moderate `js-yaml` advisories through the MDX editor. Rust reports `h2` RUSTSEC-2026-0258 and `tract-nnef` RUSTSEC-2026-0217, plus 21 warning/unmaintained notices.
- Impact: Release security exposure depends on reachability, which remains to be assessed per call path.
- Boundary: Upgrade or remove affected dependencies and retest. No dependency was changed.

### PRIV-001 — Warframe.Market JWT is stored in a world-readable settings file

- Status: Confirmed against the isolated copy; secret value was not printed
- Evidence: Copied settings file mode `0644`; parent directories mode `0755`; a JWT-shaped market token is present.
- Impact: Other local users can read a credential capable of authenticated market operations.
- Boundary: Store the token in an OS credential facility or restrict file/directory permissions and migrate existing installations. No account operation was performed.

## Medium

### IPC-RUNTIME-001 — App IPC protocol fails and reload loses an async callback

- Status: Confirmed in frozen AppImage runtime; visible impact requires correlation
- Evidence: The configured test app logged `IPC custom protocol failed ... TypeError: Load failed` three times and fell back to the postMessage interface. It then logged `Couldn't find callback id 1759171641`, explicitly attributing this to an app reload while Rust was running an asynchronous operation.
- Impact: In-flight startup/configuration operations can lose their completion callback across reload, leaving loading or initialization state incomplete. The operator independently described the configured app as “very broken.”
- Boundary: Avoid reload while initialization calls are in flight, cancel/settle operations deterministically, and add a reload-during-startup runtime test.

### AUDIT-001 — Existing E2E audit script reports unsupported passes

- Status: Confirmed
- Evidence: `scripts/audit_e2e.js`
- Actual: The script does not drive the app but prints all-pass and `100% COMPLETE`. It reported zero Rivens while the same copied inventory parsed 52, and reported 4,722 Cosmetics while the current model contains 7,382.
- Impact: The script can create false release confidence and cannot satisfy runtime acceptance criteria.
- Boundary: Replace claimed passes with real assertions/evidence and Blocked results when runtime prerequisites are absent.

### DATA-ASSET-002 — Background image prefetch reads the wrong export directory

- Status: Confirmed by source; runtime effect pending
- Evidence: `start_background_asset_sync` reads `get_data_root().join("export")`, while export commands store data under `get_data_root().join("data/export")`.
- Impact: Startup prefetch finds no export records, leaving images to load individually during browsing.
- Boundary: Share the canonical export-path helper and add a populated-profile assertion.

### L10N-001 — Locale files are incomplete and five referenced English keys do not exist

- Status: Confirmed statically; visual smoke pending
- Evidence: English contains 917 keys. Each of the other 14 locales contains 822 and is missing the same 95 keys. Referenced English keys absent from the UI catalog are `sync.syncing`, `sync.next_update`, `sync.waiting`, `sync.next_attempt`, and `sync.idle`.
- Impact: Non-English screens fall back extensively; the five absent English keys can render raw identifiers.
- Boundary: Complete key parity and add per-locale rendered smoke assertions.

### DATA-ACQ-003 — Acquisition coverage remains incomplete

- Status: Confirmed by exact resolver sweep
- Evidence: All 7,382 current cosmetic records evaluated.
- Actual: 22 have no verified route (five Focus-school animation sets and 17 decorations), 312 use generic fallback wording, and the Serganikari Glyph description contains raw Markdown/attribute syntax.
- Impact: Users receive missing, vague, or visibly malformed acquisition guidance.
- Boundary: Verify each gap against approved primary sources and sanitize structured source text before display.

### L10N-FILTER-002 — Localized bounty mission filters can fail

- Status: Confirmed function behavior; full UI runtime pending
- Evidence: `missionTypeMatches("Überleben", "Survival", ...)` is false, while an `MT_SURVIVAL` value matches.
- Impact: Bounty records resolved only to localized display text may not match the English-valued notification filter in non-English locales. Fissures with a retained mission code can avoid the issue.
- Boundary: Compare canonical mission codes, not localized text.

### PKG-LINUX-003 — Frozen AppImage requires a very new glibc

- Status: Confirmed for the locally built artifact
- Evidence: The AppImage runs on the glibc 2.43 host. Inspection in a glibc 2.42 environment reports 14 missing `GLIBC_2.43` symbol-version requirements.
- Impact: This locally built AppImage is not portable to older supported distributions.
- Boundary: Build release artifacts on the documented oldest supported runtime and test them there. The Ubuntu CI artifact may differ and has not been treated as live evidence.

### SEC-CSP-002 — Webview policy is broader than required

- Status: Confirmed by configuration
- Evidence: CSP permits `unsafe-inline`, `unsafe-eval`, all HTTP/HTTPS, and all WS/WSS sources; asset-protocol scope is effectively unrestricted.
- Impact: A web-content compromise has a larger content and local-asset exposure surface than necessary.
- Boundary: Inventory required origins and filesystem roots, then narrow CSP and asset scope. Tauri remote-URL capability isolation reduces but does not eliminate the risk.

### REL-EVENT-003 — Async listener registration has an unmount race

- Status: Confirmed by source; runtime stress pending
- Evidence: Several effects push unlisten callbacks only after `listen(...).then(...)`; cleanup iterates the current array immediately.
- Impact: If a component unmounts before listener registration resolves, the late callback is never removed, allowing duplicate/stale handlers after remount.
- Boundary: Track cancellation and immediately invoke late unlisten callbacks, or await registration in an effect-owned async setup.

### PERF-001 — Main frontend chunks exceed the configured warning threshold

- Status: Confirmed at build
- Evidence: Vite reports approximately 1.05 MB for the main index chunk and 1.33 MB for Notes.
- Impact: Startup and first screen-load latency may be elevated; runtime timing is still pending.
- Boundary: Measure first, then split heavy dependencies/routes where results justify it.

## Low

### RUST-STYLE-001 — Clippy warning

- Status: Confirmed
- Evidence: `src/overlay_utils.rs:1119` triggers the manual `is_multiple_of` lint.
- Impact: Maintainability only.

### PKG-META-004 — AppImage packaging metadata warning

- Status: Confirmed
- Evidence: Manual packaging reported missing AppStream metadata and a desktop category warning for simultaneous `Game` and `Utility` categories.
- Impact: Store/indexing quality; no runtime failure demonstrated.
