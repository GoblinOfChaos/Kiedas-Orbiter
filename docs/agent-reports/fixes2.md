# fixes2 report

## Findings and fixes

- Backoff bypass: confirmed and fixed in `src/lib/logging/logger.js`. Retry state now uses `retryUntil` and a separate `retryTimer`; `flush()` exits during backoff, schedules one retry, retains 1s-to-30s exponential delay, resets on success, and requeues with `MAX_QUEUE` truncation.
- `trackInvoke` unhandled rejection suppression: confirmed and fixed. It now tracks and returns the derived promise from `.finally()`, deleting that derived promise from `inFlightInvokes` in the callback.
- `invoke` async regression: confirmed and fixed. `invoke` is restored to `export async function invoke(command, args)`.
- HTTPS IPC guard: confirmed and fixed. Internal IPC detection now accepts `ipc:` or any URL whose hostname is `ipc.localhost`, including HTTPS.
- `safeReload` log loss: confirmed and fixed. It makes a best-effort `flush()` before waiting for in-flight invokes, using the existing overall deadline.

## Verification

- `node --check src/lib/logging/logger.js` — passed.
- `git diff --check` — passed.
- No cargo, Tauri, Vite, npm/pnpm, build, or test commands were run.

## Open questions and risks

- Runtime reload timing and browser `unhandledrejection` behavior were not exercised because builds/tests and the running app are out of scope.
- The existing `flush()` failure handling intentionally swallows transport errors and retains only the newest `MAX_QUEUE` records; this behavior was preserved.

## Follow-ups

- Coordinator should perform the permitted live transition/reload validation when the preview app is available.
