# Stage 3K — Linux Preview Maps plan

**Status: ACCEPTED — LINUX MILESTONE.** Stage 3A through Stage 3K are accepted Linux milestones. The approved Stage 3K source changes, builds and Linux validation are complete.

## Why this stage is higher risk

`Maps.jsx` is a 1,005-line spatial editor rather than a normal card screen. It owns 21 state hooks, four effects, 24 callbacks, pointer capture, wheel zoom, trackpad pan, inertial movement, image fitting, marker dragging, path rendering, debounced disk writes, a context menu and two modals. Its canvas, toolbars, configuration panel and marker editor are all positioned within one full-screen absolute composition.

The current wide layout reserves a fixed 320px configuration column. At the 900x500 acceptance size, Preview navigation leaves much less content width, while the map tabs and two independent utility groups still occupy absolute top corners. The marker editor is a fixed 288px panel beginning 64px from the top with no viewport height bound. This creates predictable collision and clipping pressure even though the underlying map logic is sound.

Stage 3K is also the final recommended redesign slice. It should finish the planned Preview screen work without turning Maps into a new editor or changing its data model.

## Verified current behavior

- The exact Preview navigation label derived from current `App.jsx`, `en.json` and `PreviewNavigation.jsx` is `Maps`. The record is `evidence/maps-nav-source-fact.json`.
- Four tabs are defined in source: Plains of Eidolon, Orb Vallis, Cambion Drift and Duviri.
- Seven distinct bundled image files back the raw/labeled choices. Duviri intentionally uses the same file for both choices.
- The canvas fits the image with `min(container width / image width, container height / image height, 1)`, caps zoom at 8x, clamps pan to the visible image bounds, keeps markers visually constant through inverse scaling and keeps path strokes visually constant through inverse stroke width.
- Pointer drag pans the map with decaying inertia. Wheel input zooms around the cursor; trackpad-like delta input pans. Reset restores the current fit scale.
- Configurations are stored as one JSON file per map under `data/user/map-configs`, with the schema `{ tabId, configs }`. Frontend-provided filenames pass through Rust `safe_relative_join`.
- Configuration editing retains name, description, visibility, marker count, path count, add-marker mode and delete confirmation. Writes from text editing are debounced for 400ms.
- Markers retain fractional 0–1 coordinates, eight colors, five icons, labels, notes and pairwise paths. Dragging clamps positions to 0–100 percent. Auto-path links each new marker to the prior marker.
- The context menu adds a marker at the selected spatial coordinate. The marker editor supports label, color, icon, connections, notes, zoom, delete and Done.
- Player custom-marker import is read from `MonitoringContext` and parsed by the unchanged `customMarkers.js`. It currently maps only Plains, Orb Vallis and Cambion Drift and deduplicates by label plus coordinates rounded to whole percentage points.
- The current ground-truth player inventory contains zero custom-marker groups. The non-sensitive structural record is `evidence/maps-custom-marker-source-fact.json`; runtime import behavior must therefore remain BLOCKED for lack of real input rather than using invented game data.
- The five Tauri commands used by this screen are `get_maps_path`, `list_map_configs`, `read_map_config`, `write_map_config` and `open_map_configs_folder`. They operate on bundled map assets or the build-profile data root. Preview therefore uses its isolated profile and does not need a live-integration disable boundary.

## Two source-verified reliability defects

These corrections affect stable and Preview behavior and require explicit approval as part of this plan. They are not layout changes.

1. `open_map_configs_folder` resolves `data/user/map-configs` and immediately launches the platform file manager without creating the directory. The button is reachable when the configuration list is empty, so a fresh profile can attempt to open a path that does not exist. Proposed correction: call `create_dir_all` before launching the platform opener.
2. `write_map_config` uses `fs::write`, which truncates the destination before writing. A process kill during the write can leave invalid JSON. The same Rust module already provides `write_bytes_atomic` for serialized content and documents this exact failure mode. Proposed correction: use that existing helper for map-config bytes while retaining the existing directory, filename validation and content.

The source evidence is recorded in `evidence/maps-source-defects.json`. Both approved corrections were applied and validated before Stage 3K acceptance.

## Preserved behavior boundaries

- Preserve the four map identities, tab IDs, raw/labeled filenames and Duviri cycle display.
- Preserve all fit, scale, pan, inertia, clamp, marker inverse-scale and path-stroke formulas exactly.
- Preserve pointer and mouse event handling, drag thresholds, pointer capture, context-menu coordinate calculation and 0–1 marker coordinate storage.
- Preserve the configuration schema, filenames, 400ms edit debounce, immediate local-state updates and current read/list error handling.
- Preserve configuration CRUD, marker CRUD, path toggling, auto-path behavior, visibility toggles and deletion cleanup.
- Preserve eight colors and five marker icons exactly.
- Preserve `parseCustomMarkers`, its supported-map boundary, coordinate logic and deduplication. No map calibration, guessed coordinate, invented game marker or parser correction is allowed.
- Preserve all translations and literal-English boundaries. No translation file change is proposed.
- Preserve stable rendered Maps markup byte-for-byte. The two approved backend corrections are tested and recorded separately as intentional stable behavior changes.
- Keep map-config writes under the existing build-profile root. No stable-profile lookup or cross-profile copy is allowed.
- Do not add artwork. AI artwork remains prohibited.

## Proposed app-source boundary

If explicitly approved, exactly three app files may change:

1. `src/screens/Maps.jsx`: import `IS_PREVIEW` and a Preview layout wrapper; add Preview-only structural hooks; make existing markers keyboard-selectable in Preview with Enter/Space; retain every formula, handler, payload and stable DOM node.
2. `src/components/PreviewMapsLayout.jsx` (new): enabled pass-through wrapper with scoped container-responsive styles for the canvas, tab rail, utilities, configuration drawer, add-marker notice and marker editor. It contains no map data, state/effect hooks, Tauri calls, transforms, coordinates, persistence or game logic.
3. `src-tauri/src/main.rs`: only the two source-verified corrections above—create the map-config directory before opening it, and route map-config content through existing `write_bytes_atomic`.

Explicitly excluded: `customMarkers.js`, `MonitoringContext.jsx`, shared UI components, translations, global CSS, capabilities, dependencies, Cargo.lock, map assets, map calibration, every other screen and all other Rust commands.

## Proposed Preview composition

- Preserve the map as the dominant surface at both acceptance sizes.
- At wider content widths, retain a side-by-side map and configuration panel, but size the panel from the available content container rather than a fixed viewport assumption.
- At narrow content widths, keep the map full-width and present Configurations as a bounded, toggleable overlay drawer within the map workspace. Closing the existing Layers control returns the full canvas.
- Put utility actions and the horizontally scrollable four-map rail on separate contained rows when space is tight, preventing the current left/right absolute groups from colliding.
- Bound the add-marker notice to the map viewport and allow its actions to wrap without covering the utility row.
- Keep the reset action reachable at the lower edge without overlapping an open drawer or editor.
- Keep the marker editor as the existing floating panel at wide sizes. At narrow sizes, constrain it between the tool rows and lower edge, allow internal scrolling and use the available width instead of an unconditional 288px box.
- Make existing markers keyboard-focusable in Preview. Enter or Space opens the same marker editor used by pointer selection; no keyboard coordinate-placement system is introduced.
- Retain the existing pointer-only spatial actions—pan, drag, right-click placement and position selection—because replacing them would change the editor rather than its layout.
- Keep both existing modals and the context menu within the viewport. Use existing UI components and icons only.

## Validation plan

### Source and component evidence

- Freeze the accepted Stage 3J cumulative patch, current Maps source, relevant Rust source, original 850-file baseline and Cargo.lock before editing.
- Generate incremental and cumulative patches with native Git and verify the cumulative patch with `git apply --check`.
- Prove that reversing only the approved Maps/Preview-layout patch restores the accepted pre-Stage-3K `Maps.jsx` byte-for-byte and removes the new wrapper.
- Prove that the Rust diff contains only directory creation for `open_map_configs_folder` and replacement of `fs::write` with existing `write_bytes_atomic` for `write_map_config`.
- Compare stable rendered markup byte-for-byte before and after across: initial/no-config state, each of four active tabs, raw/labeled modes, Duviri-cycle state, empty/open configuration panel, populated configurations, add-marker mode, selected-marker editor, new-configuration modal, deletion modal, context menu and image fallback.
- Exercise stable interaction parity for tab switching, raw/labeled toggle, reset, config CRUD, visibility, marker add/edit/drag/delete, color/icon changes, path toggling, auto-path, modal dismissal and context-menu placement.
- Verify exact `list_map_configs`, `read_map_config`, `write_map_config`, `get_maps_path` and `open_map_configs_folder` calls and payloads. The two approved backend outcomes are recorded separately rather than treated as byte-identical behavior.
- At 1200x800 and 900x500, verify canvas containment, nonzero usable map area, tab-rail scrolling, utility separation, panel/editor containment, modal/context-menu containment and absence of page-level horizontal overflow.
- Verify keyboard traversal of tabs, utility actions, configuration controls, modals and Preview markers. Enter/Space on a marker must open the same editor without moving or rewriting it.
- Verify all four source-defined map labels and the real English/German translations. Do not shorten labels in assertions.
- Treat custom-marker runtime import as BLOCKED unless ground-truth player inventory gains real custom-marker data or another verified primary source becomes available. Preserve its parser and source wiring through source checks; do not synthesize game records.

### Rust reliability evidence

- In isolated stable and Preview roots, invoke `open_map_configs_folder` through a test-only platform-opener shim and prove the previously absent map-config directory is created under the correct profile before the opener receives it.
- Verify `write_map_config` retains `safe_relative_join`, rejects traversal and produces the same exact JSON bytes on success.
- Use a test-only rename failure/kill injector to prove an existing valid config remains complete when atomic replacement is interrupted. Preserve the failed transaction artifacts and verify a later clean write succeeds.
- Confirm stable and Preview map-config roots remain distinct and neither command touches the other profile.

### Linux build and packaged evidence

- Use `.preview-work/ubuntu-build/toolkit/` for every native operation, with absolute paths, preflight output isolation, four CPUs, `CARGO_BUILD_JOBS=4` and `nice -n 19`.
- Preserve Stage 3J artifacts, then run stable and Preview frontend builds, fresh Ubuntu release compilation and fresh Debian/AppImage packaging.
- Rerun all **82 accepted packaged checks per artifact**.
- Add **14 Maps checks per artifact**, targeting **96/96** for Debian and **96/96** for AppImage: identity/four tabs; seven bundled image files; large and narrow closed-panel geometry; large and narrow open-panel geometry; raw/labeled and tab switching; pan/zoom/reset/clamp; configuration persistence; marker edit/drag/delete; path and auto-path behavior; context menu and both modals; keyboard marker selection; reload persistence and no page overflow.
- Use synthetic app-owned map configurations only. Do not use invented game markers, a real game process, external network access or the host file manager.
- Recheck artifact hashes, preserved Stage 3J artifacts, Cargo.lock, cumulative patch and the original 850 tracked files.

## Stop conditions

Stop and request a separate decision before any change to map identities/assets, transform or coordinate formulas, config schema/filename/debounce, parser/calibration/deduplication, marker/path behavior, translations, shared UI, dependencies, another Rust command or another screen. Batch test-harness-only corrections under the existing blast-radius rule and preserve their failed evidence.

## Acceptance boundary and stopping point

The accepted scope covered only the three-file Stage 3K implementation, the two named backend reliability corrections and Linux validation. It did not authorize publication, installation over stable, invented game-marker fixtures or work on retained screens.

Stage 3K is the accepted stopping point for Preview screen redesign. No additional screen wrapper is planned or authorized. Windows remains OPEN/BLOCKED and macOS remains OPEN/UNAVAILABLE. A real published-version upgrade and exhaustive tracing remain independent tracks and do not block this Linux screen milestone.


## Implementation result

The approved three-file change is implemented. Component validation passed 18/18, the extended stable state and interaction matrices passed 16/16 each, the Rust reliability matrix passed 7/7, and both fresh Linux packages passed 96/96 cumulative checks. Runtime import of game custom markers remains BLOCKED because the ground-truth inventory contains no such records; no fixture was invented. Stage 3K was explicitly accepted as a Linux milestone on 2026-09-06.
