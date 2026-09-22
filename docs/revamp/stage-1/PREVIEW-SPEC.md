# Preview isolation specification — for Stage 2, not implemented

## Decision

One codebase, separate temporary Preview build. Develop from the frozen baseline in an isolated checkout/branch after the Stage 1 gate. Do not create a permanent second repository or replace the installed application. Existing app code is unchanged in Stage 1.

## Identity and storage contract

| Property | Stable | Preview |
|---|---|---|
| Product | Kieda's Orbiter | Kieda's Orbiter Preview |
| Tauri identifier | com.jacob.kiedasorbiter | com.jacob.kiedasorbiter.preview |
| Writable root | OS data directory / kiedas-orbiter | OS data directory / kiedas-orbiter-preview |
| Profile suffix | data/user | data/user |
| Updates | Existing stable channel | Disabled initially; dedicated Preview channel before preview releases |
| Existing profile migration | Existing behavior | Disabled; explicit copy import only |
| Automatic live integration | Existing preferences | Off, regardless of imported preferences |

Build identity must determine profile isolation in debug AND release. Current `get_data_root()` uses the source directory in debug and a hardcoded stable folder in release; address both. Audit every direct path/settings helper, webview store, legacy fallback, installer identifier, desktop entry, autostart entry and update path. No fallback may silently resolve to the stable root. Reuse window labels inside the separate process, but give windows clearly marked Preview titles.

Use the current legitimate app icon with a conventional text/CSS or human-authored vector Preview badge. No AI-generated art. No generated mockup files enter resources.

## Mandatory bypass of the existing migration branch

Source verified during review: `src-tauri/src/main.rs:133-157`, `get_data_root()`. On release builds, absence of `stable_root/data/user/settings.json` triggers `copy_dir_recursive(get_legacy_data_root().join("data"), stable_root.join("data"))`. Merely swapping the root folder name leaves this copy active and can silently import real stable data on first Preview launch.

Stage 2 MUST bypass this entire migration branch for the Preview build before checking settings existence. Preview root resolution must never call `get_legacy_data_root()` or `copy_dir_recursive()` as a startup migration or fallback. Leave stable migration behavior unchanged. If the OS data directory cannot be resolved, return a clear initialization failure; do not fall back to an executable-adjacent or stable directory. The debug source-directory shortcut must also be bypassed for Preview. Explicit import is a separate user action, not a variant of startup migration.

Required release-profile regression scenario: use synthetic legacy `data/user/settings.json` plus a sentinel note beside the test executable/AppImage, with an empty Preview root. Launch Preview and confirm neither legacy file is copied or modified, imported preferences are absent, and live integrations remain disabled. Repeat with an existing Preview directory lacking settings, then with existing Preview settings. Exercise the unavailable-OS-data-directory branch and verify failure without fallback. Test the stable migration separately to confirm its behavior remains intact. These are Stage 2 tests, not tests already performed.

## Updater configuration and command isolation

Concrete surfaces inspected: `src-tauri/tauri.conf.json` → `plugins.updater` currently includes the stable `releases/latest/download/updater.json` endpoint and signing public key; `src/contexts/UpdateContext.jsx` invokes plugin `check()` / `downloadAndInstall()` and the Rust `download_appimage_update` command. Changing the application identifier alone does not isolate these paths.

For the initial Preview build, omit the updater plugin configuration and registration from its effective configuration/backend initialization. Do not inherit the stable endpoint or public key into an active updater. Preview's update provider must expose a disabled state, suppress startup/manual checks and installation, and avoid invoking the absent plugin. The custom `download_appimage_update` backend path must independently reject Preview calls before any download or file access. A hidden UI button is insufficient. Stable configuration stays unchanged.

Before enabling a later Preview update channel, explicitly configure a Preview-only manifest endpoint, compatible Preview package identities and a verified signing public key. A separate signing key is not inherently required for channel separation; endpoint/package validation and signature verification are required. That future enablement is outside Stage 2.

Validate effective merged configuration for each OS, zero Preview update requests, no stale cached manifest enabling install, and rejection of direct calls to the custom backend command. Preserve the update provider interface for existing consumers, with an explicit Preview-disabled result.

## Inspection evidence versus pending coverage

This review verified the specific root/migration branch, updater configuration, frontend updater calls and overlay identities. It did not establish that all path helpers, installer identity, webview storage, desktop/autostart entries and platform overrides are isolated. Stage 2 must create a per-surface evidence ledger with source/caller, stable destination, Preview destination, change and validation result. Category names are requirements, not evidence of completed inspection. Uninspected surfaces remain PENDING, and unavailable platform validation remains BLOCKED.

## Startup and imports

A fresh Preview starts without scanning game memory, polling inventory from the game, registering global hotkeys, sending notifications or creating visible overlays. Enforce this at startup command boundaries, not only default checkboxes. Local copied inventory remains browseable. Normal read-only data requests may run within configured limits.

Explicit import copies selected local inventory and user content into Preview using bounded, validated paths and atomic writes. Copy notes, checklist state, map configurations and safe display preferences; allow history as a selected category. Exclude market credentials/session identifiers, autostart, monitoring enablement and hotkeys. Do not rewrite or delete any source. If a destination exists, import into a staged copy and require an explicit replace decision; preserve a Preview-only backup. Never log inventory/account contents.

No live import occurs in Stage 1. No test account orders are posted in isolation tests. Market mutations must be blocked in initial Preview until separately enabled for a deliberate test.

Before deliberate live Preview testing, user stops stable monitoring/hotkeys. Do not terminate or manipulate the stable app automatically. Never infer it is safe simply because Preview has its own data directory.

## Stage 2 UI boundaries

Keep all 20 route IDs and current screen implementations. Add grouped/collapsible navigation and user favorites in Preview-specific settings. Default all groups expanded; favorites initially empty. Sidebar scroll is independent; existing minimum 900x500 layout remains usable. Preserve top-level onboarding, language/theme/update providers and overlay routing. No service refactor, new Farming Targets, source data rewrite or overlay redesign in this milestone.

## Acceptance gate

- Stable and Preview installations coexist; install/uninstall affects only the intended product.
- Read/write path evidence confirms different profiles and webview storage on each supported OS.
- Launch/restart Preview does not attach to game, grab hotkeys, show notifications or update stable binaries.
- Import changes only Preview; stable content hashes remain unchanged.
- Synthetic executable-adjacent legacy data is never migrated by Preview, including when Preview settings are missing; OS-directory resolution failure never activates a fallback.
- Effective Preview configurations contain no active stable updater; plugin and custom AppImage installation paths are disabled at their execution boundaries.
- Every isolation category has a completed evidence-ledger entry, or is explicitly BLOCKED with the gate held.
- Every existing screen opens through its unchanged route; navigation works by keyboard at 900x500 and normal size.
- All eight overlay window definitions remain; live activation requires a supervised test.
- No AI-generated visual files in Preview resources; provenance review covers additions.
- Windows/Linux/macOS build/install results and live capabilities recorded separately. Unavailable test environments are marked BLOCKED, never passed.
- Stop for user review before Stage 3.
