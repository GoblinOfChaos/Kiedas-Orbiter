# Kiedas Orbiter Full-Application Logging System Plan

## Status

Architecture and implementation plan only. This document does not authorize code changes, builds, packaging, or changes to the current logging behavior. Implementation should begin only after review and explicit approval.

## 1. Purpose

Kiedas needs a logging system that can answer, after the fact:

- What did the user do?
- On which page, window, overlay, and control?
- What data and state existed before the action?
- What code path ran?
- Which IPC command, network request, parser, detector, or external process was involved?
- What result, state transition, rendering change, or error followed?
- If the user scrolled, searched, filtered, expanded, dragged, typed, selected, dismissed, refreshed, or clicked something, what exactly happened?
- If the visible result was wrong, where did the chain diverge: input, state, data, transform, render, image request, interaction, or persistence?

The desired outcome is not merely “more `console.log` statements.” It is a consistent evidence trail across the entire application, with automatic baseline coverage for controls and explicit semantic instrumentation for important workflows.

The logging system must also provide an inspect-elements-equivalent diagnostic view of the rendered application. A report should be able to show what the UI actually contained and rendered at the time of an event, not only what the application believed it rendered in React state.

## 2. Current findings

Kiedas already has several unrelated logging mechanisms:

- [`src-tauri/src/logger.rs`](src-tauri/src/logger.rs) writes timestamped plain-text daily files under `data/user/logs`, currently retaining only a short window of files.
- [`src/main.jsx`](src/main.jsx) forwards frontend `console.error` and `console.warn`, uncaught errors, and unhandled promise rejections to Rust through `log_terminal`.
- [`src-tauri/src/main.rs`](src-tauri/src/main.rs:237) prefixes those messages with `[JS]` and writes them through the disk logger.
- The log scanner, memory watcher, OCR, overlays, market code, data refresh code, and bug-report flow each emit their own free-form messages.
- The current logger has no common event ID, session ID, route/screen field, correlation ID, action outcome, structured payload, state snapshot policy, or guaranteed relationship between a frontend action and its resulting Rust/network event.
- Scroll handling is implemented in multiple places, including shared UI components, screen containers, dashboard subcontainers, tooltip positioning, and `BackToTop` components. There is no shared scroll-event contract.
- The application contains at least these primary screens: Dashboard, Inventory, Mastery, Foundry, Prime Resurgence, Relics, Relic Planner, Mods, Rivens, Market, Adversaries, Checklist, Maps, Collectibles, Cosmetics, Notes, Wiki, Settings, About, and History.
- It also contains overlays, drawers, modals, cards, notifications, image components, the log scanner, OCR paths, and multiple Tauri windows.

This means the central problem is coverage and correlation, not the complete absence of logging.

## 3. Design principles

### One logging contract

Every log record must use the same event envelope regardless of whether it originated in React, Rust, an overlay, the log scanner, OCR, a network fetch, or a Tauri command.

### Automatic baseline plus explicit semantics

Automatic instrumentation should capture every ordinary interaction, including newly added buttons. Important operations should also emit explicit semantic events such as `inventory.refresh.started`, `relic.reward.accepted`, or `settings.log_scanner.restarted`.

Automatic events prove that an interaction occurred. Semantic events explain what the interaction meant.

### Start, result, and failure

Every meaningful operation must log:

1. Intent or start.
2. Inputs and relevant pre-state.
3. Completion, result, and post-state, or failure with error details.

A button click without its outcome is not sufficient evidence.

### Never let logging break the app

Logging must be best effort, non-throwing, bounded in memory, and isolated from the user operation. A logger failure must produce one emergency diagnostic if possible, not a recursive logging loop.

### Make sensitive data deliberate

The logs must contain enough evidence to diagnose problems without accidentally exposing account credentials, tokens, full chat contents, personal paths, or unrestricted inventory data. Redaction and allowlisted payload fields must be part of the event API, not an afterthought.

### Preserve raw evidence where it matters

For OCR, WorldState, inventory, network, detector, and parser failures, logs should identify the source artifact, hash, size, timestamp, and relevant extracted fields. Full raw content should be opt-in or separately captured because it can be large or sensitive.

## 4. Proposed event envelope

Every record should be structured JSON Lines internally, even if the user-facing viewer offers a readable text presentation.

```json
{
  "schema": 1,
  "event_id": "uuid",
  "session_id": "uuid",
  "sequence": 12345,
  "timestamp_utc": "2026-09-23T12:34:56.789Z",
  "monotonic_ms": 456789.12,
  "process": "kiedas-orbiter",
  "window": "main",
  "source": "frontend",
  "level": "info",
  "event": "ui.control.activate",
  "screen": "inventory",
  "route": "inventory",
  "component": "InventoryToolbar",
  "control_id": "inventory.refresh",
  "interaction": "click",
  "correlation_id": "uuid",
  "parent_event_id": "uuid",
  "phase": "complete",
  "duration_ms": 183.4,
  "outcome": "success",
  "payload": {},
  "error": null,
  "build": {
    "app_version": "1.3.3",
    "git_revision": "unknown",
    "platform": "linux",
    "locale": "en"
  }
}
```

Required fields:

- Schema version.
- Globally unique event ID.
- Application session ID.
- Monotonic sequence number for ordering when clocks change.
- UTC timestamp and monotonic time.
- Source layer and window.
- Event name.
- Screen/route/component/control identity where applicable.
- Correlation and parent IDs for nested work.
- Phase and outcome.
- Redacted structured payload.
- Error object when applicable.
- Build, platform, locale, and data-cache identity.

## 5. Event taxonomy

Event names should be stable, lowercase, and hierarchical.

### Application lifecycle

- `app.process.started`
- `app.window.created`
- `app.window.focused`
- `app.window.blurred`
- `app.window.resized`
- `app.window.moved`
- `app.window.closed`
- `app.lifecycle.suspended`
- `app.lifecycle.resumed`
- `app.shutdown.started`
- `app.shutdown.completed`
- `app.crash.boundary`

### Page and component lifecycle

- `screen.mount.started`
- `screen.mount.completed`
- `screen.mount.failed`
- `screen.unmount`
- `screen.visibility.changed`
- `component.mount`
- `component.unmount`
- `component.error`
- `render.commit`
- `render.error`
- `error_boundary.caught`

### Rendered DOM and inspect-elements evidence

The system must be able to capture the rendered DOM/UI tree for the main window and overlay windows. This is a diagnostic representation of what browser developer tools would expose through Inspect Element.

Required capabilities:

- Identify every rendered element with a stable diagnostic node ID.
- Record tag/role, element ID, classes, `data-*` attributes, ARIA attributes, control ID, screen, component, and window.
- Record parent/child relationships and the path from the application root to the element.
- Record whether an element is mounted, detached, hidden, clipped, disabled, inert, covered, or pointer-interactive.
- Record bounding rectangle, scroll container, viewport relationship, z-index/stacking context summary, and overflow state.
- Record selected computed-style fields relevant to visual diagnosis: display, visibility, opacity, position, width, height, transform, overflow, color, background, and pointer-events.
- Record text/content summaries with redaction and truncation rules; never dump arbitrary sensitive text by default.
- Record attributes and class changes that affect visibility, layout, selection, loading, image fallback, or interaction.
- Record image element `src`/resolved asset identity, natural dimensions, rendered dimensions, load state, and fallback state.
- Record focus, active element, selection, hover/pressed state where observable, and the event target/current target path.
- Record accessibility name, role, state, and disabled/expanded/selected values.
- Record the React/application ownership metadata attached to the node, such as screen, component, control ID, item unique name, and list/index identity.

The capture must support three levels:

1. **Node evidence:** the target element and its ancestors/descendants relevant to one event.
2. **Region snapshot:** a bounded screen, panel, drawer, overlay, or scroll container.
3. **Full inspect snapshot:** the complete rendered UI tree for a user-requested diagnostic capture or a high-severity failure.

The logger should capture DOM mutations and layout-relevant changes as structured events:

- `dom.node.added`
- `dom.node.removed`
- `dom.attribute.changed`
- `dom.class.changed`
- `dom.text.changed`
- `dom.style.changed`
- `dom.geometry.changed`
- `dom.visibility.changed`
- `dom.focus.changed`
- `dom.image.changed`
- `dom.snapshot.created`
- `dom.snapshot.failed`

Continuous full-tree snapshots and per-frame geometry logging are prohibited as a default. Use a mutation observer, bounded geometry sampling, event-triggered node/region snapshots, and explicit full-capture mode. Each snapshot must include a reason, trigger event, timestamp, window, screen, and snapshot ID so it can be correlated with the action that exposed the problem.

This layer must be available for failures such as “the button was present but unclickable,” “the list looked empty,” “the image was blank,” “the scroll container did not move,” “the modal was behind another layer,” and “the UI state changed but the screen did not update.”

### Controls and interactions

- `ui.control.rendered`
- `ui.control.focused`
- `ui.control.blurred`
- `ui.control.hovered`
- `ui.control.pressed`
- `ui.control.activate.started`
- `ui.control.activate.completed`
- `ui.control.activate.failed`
- `ui.input.changed`
- `ui.input.committed`
- `ui.input.validation.failed`
- `ui.selection.changed`
- `ui.toggle.changed`
- `ui.tab.changed`
- `ui.menu.opened`
- `ui.menu.closed`
- `ui.dialog.opened`
- `ui.dialog.closed`
- `ui.drawer.opened`
- `ui.drawer.closed`
- `ui.tooltip.opened`
- `ui.tooltip.failed`

### Pointer and keyboard interactions

- `pointer.down`
- `pointer.up`
- `pointer.cancelled`
- `pointer.drag.started`
- `pointer.drag.moved`
- `pointer.drag.completed`
- `keyboard.key.accepted`
- `keyboard.shortcut.started`
- `keyboard.shortcut.completed`
- `keyboard.shortcut.unhandled`

Raw key values should be allowlisted. Do not log arbitrary text typed into fields through keyboard events; capture field-level changes under redaction policy instead.

### Scrolling and virtualization

Scrolling needs a dedicated contract rather than another one-off logger:

- `scroll.container.mounted`
- `scroll.started`
- `scroll.sample`
- `scroll.direction.changed`
- `scroll.threshold.crossed`
- `scroll.reached_end`
- `scroll.stopped`
- `scroll.programmatic.started`
- `scroll.programmatic.completed`
- `scroll.restored`
- `scroll.restore.failed`
- `scroll.virtualized.page_requested`
- `scroll.virtualized.page_loaded`
- `scroll.virtualized.page_failed`

Each scroll record should identify the screen, container ID, axis, source (`user`, `wheel`, `touch`, `keyboard`, or `programmatic`), position, extent, viewport, direction, velocity bucket, threshold, and visible-item range. Pixel-by-pixel logging should not be used; log start/end, threshold crossings, and bounded samples at a fixed interval.

### Data and state

- `state.load.started`
- `state.load.completed`
- `state.load.failed`
- `state.parse.started`
- `state.parse.completed`
- `state.parse.failed`
- `state.update.started`
- `state.update.completed`
- `state.update.failed`
- `state.persist.started`
- `state.persist.completed`
- `state.persist.failed`
- `state.rehydrated`
- `state.reset`
- `state.invariant.failed`

State events should use summary hashes, counts, keys, and selected fields instead of indiscriminately serializing the entire state tree.

### Tauri and IPC

Every `invoke` and relevant event listener should have:

- command/event name;
- correlation ID;
- sanitized argument summary;
- start time;
- completion or failure;
- duration;
- returned result summary;
- Rust-side event with the same correlation ID.

Events include `ipc.invoke.started`, `ipc.invoke.completed`, `ipc.invoke.failed`, `ipc.event.emitted`, `ipc.event.received`, and `ipc.event.listener.failed`.

### Network and external data

- `network.request.started`
- `network.response.received`
- `network.request.completed`
- `network.request.failed`
- `network.parse.failed`
- `network.cache.hit`
- `network.cache.miss`
- `network.retry.scheduled`
- `network.rate_limited`

Log host, path template, method, status, response size, cache state, content hash, and duration. Query strings, authorization headers, account identifiers, and arbitrary response bodies must be redacted or excluded.

### Images and media

- `image.resolve.started`
- `image.resolve.completed`
- `image.resolve.failed`
- `image.request.started`
- `image.request.completed`
- `image.request.failed`
- `image.fallback.selected`
- `image.placeholder.rendered`
- `audio.play.started`
- `audio.play.completed`
- `audio.play.failed`

Image logs must include item identity, resolver branch, source class, URL template/hash, and failure status—not only a browser 404 with no item context.

### Monitoring, scanner, OCR, and overlays

Every scanner and detector state transition should have start/result/failure events, including:

- process discovery and loss;
- EE.log open, rotate, seek, read, parse, and error;
- memory watcher start, poll, match, mismatch, and stop;
- fissure/relic/reward phase transitions;
- OCR capture method, crop, preprocessing, recognition, confidence, confirmation, and rejection;
- overlay creation, show, hide, update, stale-event discard, focus transition, and close;
- detector configuration load, reload, and validation.

Existing `[LOG SCANNER]`, `[OCR]`, `[RIVEN OCR]`, `[FOCUS_WATCHER]`, and overlay strings should become structured events while retaining a human-readable rendered view.

## 6. Automatic UI coverage

Explicitly instrumenting every current button is necessary for semantic quality, but it is not sufficient for future coverage. The system should have an automatic baseline.

### Control identity contract

Every interactive element must have a stable identity:

```jsx
<Button data-log-id="inventory.refresh" data-log-role="action">
```

Required metadata:

- `data-log-id`: stable product-level control ID.
- `data-log-role`: action, navigation, tab, toggle, input, menu, modal, drawer, link, list-item, or other controlled vocabulary.
- `data-log-scope`: optional repeated-instance scope.
- `data-log-sensitive`: payload redaction override.

The control ID must not be a generated React key, translated label, screen coordinate, or CSS class.

### Event delegation

A shared root listener should capture activation, focus, keyboard, pointer, and input events for elements carrying the logging metadata. This catches newly added controls even if a developer forgets an explicit `logAction` call.

### Explicit action wrapper

Important operations should use a helper such as `runLoggedAction` that emits intent, starts a correlation span, captures the allowed pre-state, runs the operation, and emits completion/failure with duration.

```js
await runLoggedAction(
  { event: 'inventory.refresh', controlId: 'inventory.refresh' },
  async () => refreshInventory()
)
```

### Static coverage audit

Add a read-only/static audit that reports:

- buttons, links, inputs, selects, checkboxes, tabs, menus, dialogs, drawers, and clickable cards lacking `data-log-id`;
- duplicate control IDs;
- interactive elements with only translated labels as identity;
- `onClick`, `onChange`, keyboard handlers, and direct event listeners that bypass the logger;
- scrollable containers lacking a `data-log-scroll-id`;
- Tauri `invoke` calls bypassing the common wrapper;
- network calls bypassing the common request logger.

This audit should fail CI for new uninstrumented controls after an initial baseline is approved.

## 7. Page and feature coverage ledger

The implementation must maintain a per-page ledger. Each page requires a status for every interaction category, not a claim that one smoke test covered everything.

### Primary screens

Each of these screens must log page lifecycle, every navigation control, search/filter/sort changes, selection/expansion actions, scroll containers, async loading, data errors, image resolution, persistence, and external links where applicable:

- Dashboard
- Inventory
- Mastery
- Foundry
- Prime Resurgence
- Relics
- Relic Planner
- Mods
- Rivens
- Market
- Adversaries
- Checklist
- Maps
- Collectibles
- Cosmetics
- Notes
- Wiki
- Settings
- About
- History

### Shared components and flows

The ledger must separately cover:

- App shell and sidebar navigation.
- Main content scroll container.
- Back-to-top controls.
- Header/title/action components.
- Search fields and segmented filters.
- Sort menus and tabs.
- Item cards, mod cards, Riven cards, and clickable list rows.
- Item images and fallback chains.
- Acquisition drawers.
- Bug reporter modal.
- Feature guide modal.
- Language picker.
- Notification manager and toast overlay.
- Tooltips and portal positioning.
- Loading, empty, error, and retry states.

### Overlay and auxiliary windows

- Overlay router and overlay-window lifecycle.
- Sidebar overlay.
- Relic picker overlay.
- Relic reward overlay.
- Riven overlay.
- Toast overlay.
- Main/overlay focus transitions.
- Cross-window relay events.

### Native and external flows

- EE.log file watcher.
- Memory watcher.
- OCR capture and recognition.
- Tauri commands.
- WorldState polling.
- Export/data refresh.
- Market requests.
- Wiki/open-URL requests.
- Updater checks and installation.
- Settings persistence and migration.
- Bug-report archive creation.

For each ledger entry, record: event names, control IDs, input fields, async operations, expected success/failure events, scroll IDs, privacy classification, and test evidence.

## 8. Logging layers

### Frontend logging API

Provide one typed JavaScript logger with methods for:

- `trace`, `debug`, `info`, `warn`, `error`, and `fatal`;
- `event(name, payload)`;
- `startSpan(name, metadata)`;
- `action(control, operation)`;
- `screen(name)`;
- `scroll(container, details)`;
- `ipc(command, args, operation)`;
- `network(request, operation)`.

The API must normalize errors, redact payloads, attach context, and never throw back into the product operation.

### Rust logging API

Replace direct free-form `log_to_disk` calls with a shared structured logger that accepts the same envelope fields. Existing subsystem labels can remain as event namespaces during migration.

### Transport and queue

Frontend records should enter a bounded queue and be forwarded to Rust in batches or by a controlled asynchronous channel. Critical errors may flush immediately. High-frequency events such as scroll samples must be coalesced before disk writing.

### Storage

Use JSONL as the canonical storage format. Maintain a readable text export only as a presentation or bug-report derivative.

Recommended files:

```text
data/user/logs/
  session-<id>.jsonl
  session-<id>.summary.json
  app-current.jsonl -> active session
```

Rotation should be size- and age-based, with a configurable retention policy. Cleanup must report what it removed. Bug-report zips should include metadata, selected sessions, and a manifest of included files.

### Viewer and export

Settings should eventually provide:

- current session view;
- level/source/screen/event filtering;
- correlation-trace view;
- search by control ID, item unique name, command, request, or error;
- copy event JSON;
- export selected trace;
- “capture next interaction” mode;
- visible indication when logging is degraded or dropped records exist.

## 9. Context and correlation

The logger should maintain context stacks:

- application session;
- window;
- screen/route;
- component/control;
- user interaction;
- asynchronous operation;
- external request;
- detector/overlay session.

Example trace:

```text
ui.control.activate.started        inventory.refresh
  state.load.started               inventory
    ipc.invoke.started             check_exports
      network.request.started      export mirror
      network.request.completed
    ipc.invoke.completed
  state.load.completed
ui.control.activate.completed      inventory.refresh
```

The same `correlation_id` must make this trace searchable.

## 10. Error and degraded-mode policy

Every caught error must include:

- error class/name;
- message;
- sanitized stack;
- operation and phase;
- input summary;
- screen/control context;
- correlation ID;
- retry count;
- user-visible effect;
- fallback selected;
- whether data/state was mutated.

Silent catches should be prohibited except where they emit a structured `*.failed` or `*.ignored` event. A failed log write must not generate an infinite error loop.

The logger must track its own health:

- queue depth;
- records written;
- records dropped;
- bytes written;
- last write error;
- active log path;
- rotation result;
- schema version.

## 11. Privacy and redaction

Default-deny payload policy:

- Log identifiers, counts, types, statuses, hashes, sizes, and enum values by default.
- Redact account IDs, authentication data, URLs with tokens, full filesystem paths, chat text, arbitrary typed text, and unbounded inventory payloads.
- Permit selected item unique names and screen state fields because they are required for Kiedas diagnosis, but define the allowlist explicitly.
- Record that a sensitive field existed and was redacted, including its type and length where useful.
- Make debug artifact capture explicit and visible to the user.

## 12. Testing strategy

### Unit tests

- Event-envelope validation.
- Redaction rules.
- Error normalization.
- Correlation/span lifecycle.
- Queue overflow and recovery.
- Rotation and cleanup.
- JSONL parsing and viewer filters.
- Scroll coalescing and threshold detection.

### Integration tests

- Frontend event reaches disk with screen/control context.
- `invoke` start and Rust completion share a correlation ID.
- Network request failure produces a complete trace.
- Overlay relay event is traceable across windows.
- OCR/detector event chain includes source, phase, and result.
- Logger failure does not fail the product operation.
- Restart preserves prior session metadata and starts a new session.

### Static coverage tests

- No unlabelled interactive controls in the approved source tree.
- No unlabelled scroll containers.
- No raw `invoke` outside the logging wrapper except approved bootstrap/internal cases.
- No direct `fetch` outside the request wrapper except approved bootstrap/internal cases.
- No newly introduced `console.error`, `console.warn`, or free-form subsystem logger bypasses without an explicit exemption.

### Manual per-screen ledger

For every primary screen, overlay, modal, and native flow, test and record:

- open and close;
- every navigation action;
- every button and clickable item;
- every input, filter, sort, toggle, tab, menu, and selection;
- empty/loading/error/retry states;
- scroll start, movement, threshold, end, restore, and back-to-top;
- async success and failure;
- image success and fallback/failure;
- persistence and reload;
- relevant keyboard and shortcut behavior.

The ledger must use Pass, Fail, Blocked, or Not Applicable with evidence.

## 13. Rollout phases

### Phase 0: Contract and inventory

Document the event schema, privacy rules, event taxonomy, screen/control ledger, and current logging call sites. No behavior change.

### Phase 1: Structured core

Add the shared envelope, session context, correlation IDs, queue, JSONL writer, rotation metadata, and frontend/Rust adapters while preserving current human-readable output.

### Phase 2: Automatic UI baseline

Add control and scroll metadata, event delegation, common action wrappers, and static coverage checks. Establish and review the initial baseline for all existing screens.

### Phase 3: IPC, network, and data tracing

Wrap Tauri invocations, network requests, data loads, parses, persistence, images, and external links. Ensure start/result/failure traces.

### Phase 4: Detector and overlay tracing

Migrate log scanner, memory watcher, OCR, focus watcher, relay events, overlays, and cross-window flows to structured event names.

### Phase 5: Viewer and bug-report integration

Add structured filtering, trace export, logger-health status, and bug-report manifests while preserving the existing zip workflow.

### Phase 6: Enforcement

Make coverage audits part of validation. New controls, scroll containers, IPC calls, and network calls must either be instrumented automatically or carry a documented exemption.

## 14. Downsides and tradeoffs

- Truly detailed logging consumes disk space and can affect performance if written synchronously.
- Automatic DOM logging can produce noise and must be paired with semantic events.
- Logging every scroll pixel or every keystroke would be expensive and privacy-sensitive; bounded samples and field-level events are more useful.
- Structured logging requires a migration from existing free-form strings.
- A complete coverage ledger is ongoing maintenance, not a one-time implementation.
- Redaction rules can hide evidence if they are too broad; they require tests and review.
- Cross-window and native tracing is more difficult than ordinary React event logging.
- A viewer adds product surface area and must itself be logged and tested.

## 15. Acceptance criteria

The system is not complete until all of the following are true:

- Every primary screen has a completed interaction ledger.
- Every interactive control has a stable ID or is captured by an approved automatic fallback.
- Every scrollable container has a stable scroll ID and emits start/sample/threshold/end or programmatic events.
- Every meaningful action has start, success, and failure evidence.
- Every Tauri command and external request has a correlated trace.
- Overlay, scanner, OCR, and multi-window events can be reconstructed chronologically.
- Logs remain useful after a restart and can be exported with a manifest.
- Logger failures do not break app behavior.
- Redaction tests pass and sensitive payloads are not written by default.
- Static checks prevent newly added uninstrumented controls and bypassed IPC/network calls.
- A manual audit can follow a user report from visible symptom to source input, state transition, render, and outcome.

## 16. Decisions for review

1. Should detailed logging be permanently enabled at the proposed baseline, or should only payload depth be user-configurable?
2. What retention window and maximum disk budget are acceptable?
3. Should logs remain local-only, or should the app ever offer explicit user-initiated upload?
4. Which item/inventory fields are approved for diagnostic logging?
5. Should the first implementation include a log viewer, or only structured capture/export?
6. Should scroll events be sampled at a fixed interval, configurable per container, or only logged at thresholds plus start/end?
7. Should unlabelled controls fail validation immediately, or begin as warnings during migration?
8. Should this plan cover only the main app, or also every overlay/native detector path in the first implementation?

## Recommendation

Implement a structured, local-first event pipeline with automatic control and scroll coverage, explicit semantic action spans, correlated IPC/network/native traces, a per-screen evidence ledger, and enforcement checks that make future omissions visible. Keep payloads redacted and bounded, but make the event trail comprehensive by default.
