# Agent report: perf-ipc

## Plan

1. Verify the supplied resize, reload, logging, HMR, and heartbeat leads against the Preview worktree.
2. Coalesce only ResizeObserver-driven measurements, preserving existing scroll behavior.
3. Add tracked IPC draining for reloads, harden internal IPC fetch detection and log retry behavior, and make Preview instrumentation idempotent.
4. Run static-only checks; do not build, bundle, test, commit, or push.

## Summary

- Coalesced ResizeObserver callbacks in Inventory, Cosmetics, Mods, and RelicPlanner with 50 ms trailing timers and cleanup.
- Preserved the existing immediate/throttled scroll paths; no virtual-root containment changes were made.
- Added tracked frontend IPC calls and `safeReload()` with a 1500 ms all-settled drain, used at the three approved reload sites.
- Recognized both `ipc:` and Tauri v2 Linux `http://ipc.localhost` transports as internal fetches.
- Added bounded exponential retry delay for failed structured log batches (1 s through 30 s).
- Guarded Preview console/error/performance listeners against duplicate HMR installation.
- Added a Preview-only 60 s structured heartbeat with available heap, DOM counts, and window dimensions.

## Files changed

- `src/lib/logging/logger.js`
- `src/lib/logging/tauri.js`
- `src/main.jsx`
- `src/App.jsx`
- `src/screens/Settings.jsx`
- `src/screens/Inventory.jsx`
- `src/screens/Cosmetics.jsx`
- `src/screens/Mods.jsx`
- `src/screens/RelicPlanner.jsx`
- `AGENT_REPORT.md`

No new UI strings were added, so no locale files required changes.

## Verification

- `git diff --check` — passed with no output.
- `node --check src/lib/logging/logger.js` — passed.
- `node --check src/lib/logging/tauri.js` — passed.
- `rg` inspection confirmed the three reload call sites now use `safeReload`; remaining direct reloads are unrelated import/error-boundary actions.
- `rg` inspection confirmed each changed ResizeObserver has a cleanup timer and each existing scroll listener still calls its original measurement function.
- No cargo, Tauri, Vite, npm/pnpm build, or test command was run.

## Open questions and risks

- Wiki retains its `window.resize` listener. The observer watches its container, but the source does not prove that all window resize events resize that container, so removing the listener would be an unsupported assumption.
- The heartbeat reports `performance.memory` only when WebKit exposes it; heap fields are absent otherwise.
- Rust process RSS was not added because no existing cheap periodic Rust timer/thread was verified, and the task permits skipping it.
- Runtime WebKit resize smoothness, callback-id errors, and heartbeat output were not exercised because builds/tests and running-app interaction are prohibited.

## Suggested follow-ups

- Validate the Preview AppImage manually during window resizing and a language/UI reload, then inspect structured logs for callback-id errors and `preview.heartbeat` events.
- If a future Rust timer is identified, add RSS logging there separately with the same low-frequency cadence.
