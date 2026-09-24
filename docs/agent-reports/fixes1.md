# fixes1 report

## Summary

- Fixed Preview Riven arming and retained non-Preview automatic scanning.
- Rust now arms grading overlays directly before hiding the Preview prompt.
- Added prompt show/hide race protection and made its window resizable.
- Made Riven hotkey seeding one-time, collision-safe, and non-destructive to an empty saved list.
- Made Wiki navigation targets consumable and added the shared static acquisition fallback to the Preview drawer.
- A6 was skipped: `overlay_utils.rs` does not expose a simple public focus helper; its diagnostic helper is private. The public command is in `main.rs`.

## Files changed

- `AGENT_REPORT.md`
- `src/components/overlays/RivenOverlay.jsx`
- `src/components/overlays/RivenPromptOverlay.jsx`
- `src/App.jsx`
- `src/screens/Settings.jsx`
- `src-tauri/src/main.rs`
- `src-tauri/tauri.preview.conf.json`
- `src/contexts/WikiNavigationContext.jsx`
- `src/screens/Wiki.jsx`
- `src/preview/acquisition/PreviewAcquisitionDrawer.jsx`
- `docs/agent-reports/fixes1.md`

## Verification

- Read the merged implementations and confirmed all requested claims before editing.
- `git diff --check` — passed.
- `nice -n 19 node -e "JSON.parse(require('fs').readFileSync('src-tauri/tauri.preview.conf.json','utf8')); console.log('preview config JSON OK')"` — passed.
- Static searches confirmed the Rust event pair, one-time seed key, Wiki clear call, and static drop fallback are present.
- No Cargo, Tauri, Vite, npm/pnpm build, test, commit, push, live app, or Warframe.market write was run.

## Open questions and risks

- Runtime Riven transition behavior and prompt window repaint were not exercised because live app/build/test execution is prohibited.
- Existing unrelated dirty changes were preserved: `src/lib/logging/logger.js`, prior `AGENT_REPORT.md` content, and `docs/agent-reports/fixes2.md`.
- The Settings mount marks the seed flag when the default is supplied in component state; App startup remains the normal persistence/registration path.

## Suggested follow-ups

- Coordinator should perform Preview-only live checks for screen-open, hotkey arm, reroll, confirmation, prompt hide/show race, and Wiki target consumption.
