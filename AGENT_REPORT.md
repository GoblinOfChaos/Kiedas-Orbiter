# Agent report: riven-prompt

## Plan

1. Trace the existing Riven overlay lifecycle, hotkey registration, settings persistence, and lazy overlay-window creation.
2. Add a Preview-only prompt overlay and a Preview-only configurable `grade_rivens` hotkey, with shared Tauri events for screen/armed state.
3. Gate existing grading-overlay scans on the armed state while preserving reroll/accept timing and linked-chat behavior.
4. Add the prompt window to Preview configuration, preserve click-through/focus behavior, add i18n keys to all locale files, and perform static verification only.

## Summary

- Added the Preview-only `overlay-riven-prompt` window and large click-through prompt.
- Added Preview-only configurable `grade_rivens` hotkey, defaulting to `Ctrl+Alt+R`; Settings displays and persists it.
- Riven screen-open shows the prompt; the hotkey is ignored unless the native screen-active flag is true.
- Prompt activation emits `riven-grade-armed` to all overlay windows. Current/new grading overlays scan only after arming, preserve the existing cycle/accept timing, and repeated presses rescan.
- Screen close hides prompt and grading overlays and resets armed/new-roll state. Linked-chat Riven behavior remains automatic.

## Files changed

- `src-tauri/src/log_scanner.rs`, `src-tauri/src/main.rs`, `src-tauri/src/overlay_utils.rs`
- `src-tauri/tauri.preview.conf.json`
- `src/App.jsx`, `src/screens/Settings.jsx`
- `src/components/overlays/OverlayRouter.jsx`, `RivenOverlay.jsx`, `RivenPromptOverlay.jsx`
- All 15 `src/lib/i18n/*.json` files; English prompt/action text was copied into the 14 non-English locales and needs translation.

## Design decisions

- A dedicated prompt window/component is preferable to reusing grading windows: it can be centered and large without changing card overlay dimensions, and it is independently hidden on activation.
- No existing Settings action represented a manual Riven scan. `grade_rivens` is therefore a new Preview-only action with a configurable default; it emits an activation event instead of running OCR directly.
- Native screen lifecycle sets `RIVEN_SCREEN_ACTIVE`; Rust ignores the hotkey when false. The backend activation event reaches the prompt, which emits `riven-grade-armed` so all frontend windows share the armed transition through Tauri events.
- Linked-chat events were left on their existing automatic path.

## Verification

- `nice -n 19 node --input-type=module -e "...JSON.parse..."`: PASS; all 15 locale files and Preview config parse, and all six new keys exist in every locale.
- `nice -n 19 git diff --check`: PASS.
- `nice -n 19 node --check src/lib/settings.js && nice -n 19 node --check src/lib/buildProfile.js`: PASS.
- `nice -n 19 rustfmt --check --edition 2021 src-tauri/src/log_scanner.rs src-tauri/src/main.rs src-tauri/src/overlay_utils.rs`: reports existing repository-wide formatting differences (including unrelated pre-existing lines); no formatting rewrite was applied.
- No Cargo, build, bundler, Tauri, or test commands were run.

## Open questions and risks

- Live overlay timing, global-hotkey registration, and 1080p/1440p rendering cannot be runtime-verified in this worktree.
- The default hotkey may conflict with a user binding; Settings can change or remove it before registration.
- The 14 copied locale strings require translation review.

## Suggested follow-ups

Validate the complete flow in the Preview app with a live Riven screen: open, prompt, arm, cycle, accept, repeated rescan, linked Riven, focus loss, and close/reset.
