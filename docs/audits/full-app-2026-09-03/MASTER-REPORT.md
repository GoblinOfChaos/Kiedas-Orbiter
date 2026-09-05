# Complete Kieda's Orbiter Audit — In Progress

## Status

This report covers the frozen working-tree snapshot captured on 2026-09-03. Background build, source, dependency, integration, localization, inventory, and bulk-data checks are substantially complete. Linux screen-by-screen runtime work and coordinated Warframe gameplay remain open; this document is therefore not the final release verdict.

No program source, installed application, primary user data, Warframe.Market order, or release was changed. The only repository additions are this audit report suite.

## Frozen target

- Git HEAD: `07cfa9d22353df601b98ee53ac27879a22b98789`
- Frozen source-manifest SHA-256: `628c390fff3cecce0853774997acadfc5a74db2977d4d6baa35ed5bd7005dc11`
- Dependency lock SHA-256: `bec1...05d` (full value retained in frozen evidence)
- Inventory SHA-256: `b368...ddd4` (full value retained in frozen evidence)
- Linux AppImage SHA-256: `e4e2fa5f3e01a111b32cf3cbe116cf513e4e5799719f423de689bfc326be4ea4`
- Release binary SHA-256: `94f190b4691b6f24a8962374d84a7aa743d817432672532ad3138b4cff65c5b4`
- Frozen workspace: `/var/home/jedwards/.cache/codex-audits/kiedas-orbiter-full-audit-20260903.VcuWdn`

## Current verdict

The frozen build is **not release-ready** based on source and integration evidence already collected. The most serious confirmed blockers are:

1. The Linux custom updater downloads a caller-provided URL, does not require a successful HTTP status, does not verify the updater signature, replaces the running AppImage path, marks the result executable, and launches it.
2. Configured notification-manager rules never advance past initialization because `notifInitRef` is never set to `true`. Chat uses a separate path.
3. Multiple Tauri file commands accept absolute paths or `..` traversal without constraining the resolved target. The note deletion command can consequently delete a caller-selected file reachable by the app user.
4. The current published Windows and macOS updater entries point to nonexistent asset names and have empty signatures. Their URLs returned HTTP 404 during the audit.
5. The application catalog is stale against the official 2026-09-03 Digital Extremes PublicExport and the primary refresh source is a third-party GitHub mirror rather than the required official export.
6. An operator-supplied live endless-fissure screenshot from the installed AppImage shows `Yareli Prime Chassis Blueprint` incorrectly resolved as `Yareli Prime Blueprint`, with the wrong parent item and ownership context. This must be reproduced against the frozen artifact before it is counted as frozen-build runtime evidence.

Runtime UI evidence may add findings or change the severity of non-security items, but it cannot clear the confirmed blockers above.

## Work completed

- The dirty working tree was fingerprinted and copied into an isolated frozen workspace.
- Frontend and Rust release builds succeeded under the required CPU limits (`nice -n 19`, `CARGO_BUILD_JOBS=4`).
- Manual AppImage packaging succeeded after Tauri's built-in `linuxdeploy` step failed.
- Packaged resources matched the frozen source resource tree across 499 files.
- 20 navigation screens, first-run setup, overlay windows, 259 static control sites, 80 invoked commands, 99 registered commands, 48 listener sites, 50 Rust event sites, 22 settings keys, 14 direct local-storage keys, and 258 URL literals were inventoried.
- All 100 source JSON files parsed successfully.
- The copied inventory parsed into the current data families, including 116 Warframes, 735 weapons, 1,153 mods, 52 Rivens, and 789 resources.
- The current Cosmetics model produced 7,382 unique records and 1,202 owned records. The current source classifies all 531 cosmetics whose official icon path identifies Primary, Secondary, or Melee without a mismatch.
- Every one of the 7,382 cosmetic records passed through the exact acquisition resolver. Twenty-two returned no verified source, 312 used generic fallback wording, and one creator-glyph description contains raw Markdown/HTML-style syntax.
- Of 5,947 distinct directly resolved cosmetic image URLs, 2,455 were already cached and all 2,455 had valid non-empty PNG signatures. All 11 non-PublicExport URLs returned HTTP 200 with PNG content. Network validation of the remaining 3,492 PublicExport images is deferred to avoid competing with live gameplay bandwidth.
- Current official WorldState parsed successfully with no raw `/Lotus/` or `MT_` token in the audited visible fields.
- Read-only Warframe.Market v2 item enumeration returned 3,840 structurally valid, uniquely identified records.
- JavaScript and Rust dependency vulnerability audits, Rust Clippy, localization-key parity, updater endpoint inspection, CSP/capability review, and workflow parsing were completed.

## Work still required

- Fresh-profile first-run and populated-profile Linux runtime passes.
- Every screen/control, dialog, drawer, filter, pagination, persistence path, malformed/empty/loading/offline state, keyboard path, focus order, visible focus, text scaling, and locale smoke pass.
- Runtime CPU, memory, startup latency, screen-load latency, shutdown, and large-list measurements.
- Overlay simulations and the coordinated gameplay matrix in [LIVE-SESSION-RUNBOOK.md](./LIVE-SESSION-RUNBOOK.md).
- Network retrieval/decode validation for the 3,492 uncached official cosmetic images.
- Final Pass/Fail/Blocked/Not Applicable ledger, deduplicated counts, and platform verdicts.

## Authoritative references

Game-data comparisons use Digital Extremes WorldState and PublicExport. Acquisition terminology uses the official Warframe Wiki; the Fandom wiki was not used. Updater and security conclusions use the official Tauri v2 documentation for the updater, asset protocol, CSP, capabilities, and IPC security model.
