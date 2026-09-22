# Stage 3J — Linux Preview Settings plan

**Status: ACCEPTED — LINUX MILESTONE.** Stage 3A through Stage 3I are accepted Linux milestones. The approved two-file Stage 3J implementation and evidence are recorded in `settings-implementation.json` and `evidence/settings-validation-summary.json`. Stage 3K app-source work has not started.

## Why this stage is higher risk

`Settings.jsx` is 1,398 lines and combines presentation with persistent configuration and native side effects. The current source has 10 major cards, 29 `useState` call sites, eight `useEffect` call sites, 15 distinct persisted setting keys and 37 calls across 19 distinct Tauri commands. It controls themes, cursors, notification preferences, inventory monitoring, the log scanner, overlay placement, game locale, sidebar behavior, global hotkeys, safe-mode tracking, the isolated Warframe.Market token, application updates, the price cache, diagnostics and two modals.

The layout work is straightforward; preserving those effects is the risk. Stable must keep its exact markup, persistence, command payloads and timing. Preview must retain useful profile-local and read-only controls while making unavailable live integrations visibly non-interactive. The existing Stage 2 updater-disabled UI is already accepted and must remain intact.

## Verified current behavior

- The exact Preview navigation label derived from current `App.jsx`, `en.json` and `PreviewNavigation.jsx` is `Settings`. The source-fact record is `evidence/settings-nav-source-fact.json`.
- The ten top-level cards are Theme, Cursor, Notifications & Overlays, Game Locale, Feature Guide & Support, In-Game Sidebar, Global Hotkeys, Safe Mode Tracking, Warframe.Market, and Updates & Price Cache.
- All cards are currently in one long `space-y-6` flow with no section navigation. Several inner layouts use viewport `sm`, `md` and `lg` breakpoints, which do not reflect the content width remaining beside Preview navigation.
- Theme and cursor controls are provided by `ThemeContext`. Notification position, sound, overlay scale/monitor, sidebar preferences, scanner preferences, game locale, update preference, cache path, hotkeys and the WFM token use the existing settings store.
- Exactly 15 keys appear in both the current read and write surfaces: `ee_log_path`, `fissure_overlay_enabled`, `fissure_target_monitor`, `fissure_ui_scale`, `gameLocale`, `hotkeys`, `notif_position`, `notif_sound`, `sidebar_hide_on_focus_loss`, `sidebar_side`, `sidebar_width`, `update_on_startup`, `use_ee_log`, `warframe_cache_path`, and `wfm_token`.
- Inventory monitoring is forced off at Preview startup by `MonitoringContext`, but its Settings toggle is still active. Starting it performs the data call before the backend rejects `set_monitoring_active(active: true)`.
- The log-scanner toggle, safe-mode tracking controls and hotkey editor are still active in Preview. Their handlers persist isolated-profile values before `start_log_scanner` or `set_hotkeys` rejects the live action.
- Notification sound selection still attempts `play_notification_sound`; the test-notification controls call `play_notification_sound`/`show_notification`; and the relic-overlay test emits three `relay_event` calls. These controls do not explain that Preview cannot perform the live action.
- Acquisition coverage generation is a valid profile-local export. Its final `show_notification` is unavailable in Preview, while its existing inline success/error status remains usable.
- `start_log_scanner`, `set_hotkeys`, `play_notification_sound`, `show_notification`, and the active branch of `set_monitoring_active` are directly protected by `require_live()` in Rust. `relay_event` and `stop_log_scanner` are not guarded, so the Preview frontend must not treat backend rejection as protection for those paths.
- Read-only or profile-local operations remain permitted: manual inventory refresh, export/cache reads, price refresh, game-locale data refresh, theme/cursor changes, sidebar/overlay preference values, monitor discovery, diagnostics export, external help links, modals, and the isolated-profile WFM token.
- `UpdateContext` initializes Preview to `status: 'disabled'`, both updater callbacks return immediately, Settings hides the startup toggle, shows the accepted disabled message and disables Check for Updates.

## Preserved data and behavior boundaries

- Preserve all 15 setting keys, their value types, defaults, write timing and current isolated Preview storage. No key rename, migration, new store or stable-profile access is allowed.
- Preserve ThemeContext and cursor behavior, including accessibility badges, descriptions, tint rendering and existing cursor assets.
- Preserve notification position values, sound values, overlay scale range of 50–100, automatic/manual monitor selection and monitor refresh behavior. Preview may save these profile-local preferences, but must not play a sound or show an overlay/notification.
- Preserve monitoring status text, countdowns, manual refresh and cached-data behavior. Preview's periodic monitoring switch remains off and becomes visibly unavailable.
- Preserve scanner polling/status display. Preview's scanner activation, safe-mode toggle and EE.log path editing become visibly unavailable; stable retains the existing 800 ms restart debounce.
- Preserve locale persistence, `check_exports({ locale, force: true })`, error handling and unconditional reload behavior.
- Preserve guide and bug-report modals, acquisition coverage inputs/formula, output path and inline success/error feedback. Preview skips only the unavailable completion notification.
- Preserve sidebar side, width choices, hide-on-focus-loss preference and associated payloads. These are isolated configuration values and remain editable; no overlay window is created by this screen.
- Preserve both hotkey actions and modifier-only rejection behavior. Preview displays the configured values but disables record, add, edit and remove actions.
- Preserve WFM token password handling in the isolated Preview profile. No token logging, copying, stable lookup or market mutation is introduced.
- Preserve all updater states for stable and the already-accepted disabled state for Preview. No updater registration, endpoint, key or capability change is proposed.
- Preserve price-cache status, progress and refresh behavior.
- Keep existing translations and literal-English boundaries. No translation file changes are proposed.
- Do not add artwork. AI artwork remains prohibited.

## Proposed app-source boundary

If explicitly approved, exactly two app files may change:

1. `src/screens/Settings.jsx`: import `IS_PREVIEW` and the Preview layout wrapper; add Preview-only section anchors/layout hooks; mark unavailable live-integration groups inert and visibly disabled; guard their handlers before persistence or invocation; suppress the unavailable post-export notification while retaining inline result feedback. Stable markup and behavior remain unchanged.
2. `src/components/PreviewSettingsLayout.jsx` (new): enabled pass-through wrapper, source-derived section navigation, a compact disabled-integration notice and scoped container-responsive styles. It contains no settings access, state/effect hooks, Tauri commands, monitoring logic, tokens, update logic or data formulas.

Explicitly excluded: `MonitoringContext.jsx`, `UpdateContext.jsx`, `ThemeContext.jsx`, `UiContext.jsx`, `settings.js`, `NotificationManager.jsx`, `LanguagePicker.jsx`, shared UI, `src-tauri`, capabilities, global CSS, translations, dependencies, lockfiles, overlays and every other screen.

## Proposed Preview composition

- Add one compact sticky section rail using existing source labels: Theme, Notifications, Game Language, Help & Diagnostics, In-Game Sidebar, Global Hotkeys, Safe Mode Tracking, Warframe.Market and Updates. Cursor stays immediately after Theme; Price Cache stays paired with Updates.
- Keep the existing card order and content. Section links scroll to Preview-only anchors and remain keyboard reachable; stable receives neither the rail nor anchor attributes.
- Use a screen container rather than viewport breakpoints for the theme grid, notification controls, test controls, cache-path row, monitor row, sidebar width choices, hotkey rows and Updates/Price Cache split.
- Keep all content within the Settings content region at 1200x800 and 900x500. Long paths, token input, monitor names, status text and action rows wrap or scroll inside their own regions without page-level horizontal overflow.
- Add one compact notice explaining that live monitoring, scanner/hotkey registration, notification/overlay tests and app updates are unavailable in Preview while profile-local preferences and read-only data tools remain available.
- In Preview, disable periodic inventory monitoring, scanner activation, safe-mode scanner controls, hotkey mutation and notification/overlay test actions. Guard their handlers first so attempted pointer or keyboard activation records zero unavailable live invocations and does not change isolated settings.
- Keep notification sound/position, overlay scale/monitor and sidebar choices editable as profile-local preferences. Sound selection no longer attempts a live preview in Preview.
- Keep manual inventory refresh, cache selection, game-language refresh, help/bug modals, coverage export, WFM token entry and price refresh available. Coverage export retains inline feedback and omits only its unavailable notification in Preview.
- Retain the accepted Preview updater message, hidden startup toggle and disabled update button exactly.

## Validation plan

### Source and component evidence

- Freeze the accepted Stage 3I cumulative patch, current Settings source, original 850-file baseline and Cargo.lock before editing.
- Generate both implementation patches with native Git diff output and verify the cumulative patch with `git apply --check`.
- Prove that removing only the approved Preview import, wrapper, anchors/hooks, notices, inert/disabled expressions and handler guards restores the accepted pre-Stage-3J `Settings.jsx` byte-for-byte.
- Compare stable rendered markup byte-for-byte before and after across at least: default, alternate theme/cursor, notification position/sound, monitoring idle/active/cached/error, scanner idle/waiting/active/stale, cache path, scale/automatic monitor/manual monitor, locale loading, multiple hotkeys/recording error, safe mode on/off, WFM token empty/populated, every updater status, price loading/progress/complete, guide modal, bug modal and coverage success/error.
- Exercise every reachable stable control and compare the exact setting writes, context calls, Tauri commands/payloads, delayed/debounced behavior, reload, modal state and rendered result before versus after. Include all 15 persisted keys and all user-triggered command surfaces.
- In Preview component fixtures, verify the unavailable groups are visibly disabled, absent from sequential keyboard activation, and produce zero invocations of `set_monitoring_active(active: true)`, `start_log_scanner`, `stop_log_scanner`, `set_hotkeys`, `play_notification_sound`, `show_notification`, and `relay_event`.
- Verify allowed Preview interactions still use the isolated settings store and exact existing payloads. Cover theme/cursor, notification/overlay preferences, manual refresh, cache picker, monitor discovery, locale, diagnostics export, sidebar preferences, WFM token and price refresh.
- Directly verify the accepted updater-disabled message, hidden startup toggle and disabled Check for Updates state across both sizes and after reload.
- At 1200x800 and 900x500, verify the section rail, all ten cards, long path/token/monitor states, both modals and locale overlay remain within the Settings content region; no page-level horizontal overflow occurs.
- Exercise keyboard traversal of the section rail and every enabled control. Verify each link lands on its source-derived section and disabled groups communicate their reason.
- Verify English and German labels from the real translation files and record unchanged literal-English boundaries.

### Linux build and packaged evidence

- Use `.preview-work/ubuntu-build/toolkit/` for every native operation, with absolute paths, preflight output isolation, four CPUs, `CARGO_BUILD_JOBS=4` and `nice -n 19`.
- Reverify the exact Settings navigation label before native assertion authoring.
- Preserve Stage 3I artifacts, then run stable and Preview frontend builds, fresh Ubuntu release compilation and fresh Debian/AppImage packaging.
- Rerun all **70 accepted packaged checks per artifact**.
- Add **12 Settings checks per artifact**, targeting **82/82** total for Debian and **82/82** for AppImage: large/narrow geometry, section-rail navigation, keyboard containment, disabled-live notice and controls, zero frontend unavailable-live invocations, direct rejection of all five guarded Settings command surfaces, allowed preference persistence, accepted updater-disabled UI, read-only/manual tools, modal/overlay layout, reload persistence and absence of page-level horizontal overflow.
- Use only synthetic local fixture state in a network-disabled container. No real WFM token, account, game process, notification, overlay, hotkey registration, marketplace mutation or external write is permitted.
- Recheck artifact hashes, preserved Stage 3I artifacts, Cargo.lock, cumulative patch, original 850 tracked files and absence of Stage 3K source.

## Stop conditions

Stop and request a separate decision before any change to a setting key/default/type, stable command or payload, monitoring/cache/update logic, locale behavior, diagnostics formula/output, token handling, Rust guard, dependency, translation, shared component or another screen. Batch test-harness-only corrections under the existing blast-radius rule and retain their failed evidence.

## Acceptance boundary

Approval of this plan would authorize only the two-file Stage 3J implementation and its Linux validation. It would not authorize publication, installation over stable, live-integration testing or Stage 3K. Windows remains OPEN/BLOCKED and macOS remains OPEN/UNAVAILABLE. A real published-version upgrade and exhaustive tracing remain independent tracks.


## Implementation result

The component matrix passed 62/62 checks, including 20/20 byte-identical stable markup comparisons and 19/19 stable interaction-parity cases. Both fresh Linux packages passed 82/82 cumulative checks. The Settings component capture and both packaged records explicitly contain empty Preview invocation lists for `relay_event` and `stop_log_scanner`; these are named separately because neither command has a Rust `require_live()` guard. All five guarded Settings command surfaces were directly invoked at the packaged native IPC boundary and rejected in both artifacts. The original 850 tracked files and Cargo.lock remain unchanged, the cumulative native Git patch applies cleanly, and Stage 3K remains unstarted.
