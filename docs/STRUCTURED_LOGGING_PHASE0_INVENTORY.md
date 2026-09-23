# Structured logging Phase 0 inventory

This inventory records the Phase 0 contract and the implementation boundary for
the Phase 1–3 structured logging rollout.

## Contract

The canonical record is a schema-1 JSON object written one record per line.
The frontend contract is `src/lib/logging/eventEnvelope.js` plus its declaration
file; the matching serde contract is `src-tauri/src/logger.rs`.

Required identity and ordering fields are `schema`, `event_id`, `session_id`,
`sequence`, `timestamp_utc`, `monotonic_ms`, `process`, `window`, `source`,
`level`, and `event`. Context, correlation, phase, outcome, payload, error, and
build fields are optional or structured as defined by the shared contract.

## Privacy baseline

- Payloads are bounded and default-deny.
- Tokens, authorization data, account identifiers, credentials, arbitrary typed
  text, absolute filesystem paths, URL query strings, and unbounded arrays are
  redacted or truncated.
- Diagnostic payloads prefer counts, statuses, types, sizes, hashes, enum
  values, and selected item identities.
- Sensitive controls may opt out with `data-log-sensitive="true"`.

## Current logging surfaces

- Frontend console/error forwarding remains in `src/main.jsx` and continues to
  call `log_terminal`.
- Human-readable Rust output remains in `src-tauri/src/logger.rs` and all
  existing subsystem callers remain unchanged for this rollout.
- Structured frontend batches use `structured_log_batch` and are written to
  `data/user/logs/session-<id>.jsonl`.
- Frontend IPC and fetch calls use the shared logging wrappers; convert-only
  asset URL helpers remain direct because they are not IPC operations.
- The app shell owns delegated UI capture and screen context. `PageLayout`
  supplies the shared scroll identity; Inventory is the reference scroll
  implementation.

## Screen inventory

The current primary screen set is: Dashboard, Inventory, Mastery, Foundry,
Prime Resurgence, Relics, Relic Planner, Mods, Rivens, Market, Adversaries,
Checklist, Maps, Collectibles, Cosmetics, Notes, Wiki, Settings, About, and
History. Automatic baseline capture is app-wide; semantic per-screen action
instrumentation and the manual Pass/Fail/Blocked/Not Applicable ledger remain
follow-up work.

## Event families in this rollout

`app.*`, `screen.*`, `ui.*`, `scroll.*`, `state.*`, `ipc.*`, and `network.*`
are active through the frontend logger. Scanner, OCR, focus-watcher, overlay,
and detector migration is intentionally excluded from this phase.

## Deferred boundary

The DOM inspect-elements snapshot and mutation-observer layer, Phase 4 scanner/
OCR/overlay/detector migration, Phase 5 viewer, and Phase 6 CI/static audit are
not implemented here.
