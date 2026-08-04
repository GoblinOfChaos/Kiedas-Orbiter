# Service Lifecycle & Runtime Hardening Refactor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app's current ad hoc, substring-matching-based process lifecycle management with an explicit, self-reporting service layer, and harden the surrounding config/error-handling patterns that make failures hard to diagnose. This plan implements the remediation suggestions from `claude_fix_suggestions.json` (generated 2026-08-03 against this repo), grounded in a real, live-reproduced bug the same night: a diagnostic `python -c "..."` one-liner was counted as a running `orbiter`/`overlay` process by `is_running()`, because its own inline script text happened to contain those patterns as a substring — explaining why the app's Status tab showed "Running" in green while `orbiter.log` had been silent for over 24 hours and no such process actually existed. That specific bug is already fixed independently (PR #24, `platform_utils.py`'s `_matches_pattern()`) — this plan is the deeper, structural fix the audit recommended on top of it.

**Why now:** Three separate live sessions this week (2026-08-01 through 2026-08-03) were slowed down by exactly the failure modes this plan targets: a background supervisor (`warframe-watcher.py`) died silently with no trace and never restarted; the Status tab's "Running" indicators disagreed with reality; and a stale saved overlay position was silently misapplied because there was no structured way to key/validate saved state against the context it was captured in. None of these were caught by tests, logs, or the app's own health reporting — they were only found by directly inspecting process lists and log files by hand.

**Tech stack:** Pure Python (no new runtime dependency required — `psutil` is already a dependency via `platform_utils.py`). Existing files affected: `autostart_manager.py`, `platform_utils.py`, `launcher.py`, `paths.py`, `STATUS_TAB.py`, `warframe-watcher.py`, `control-panel.py`.

## Global Constraints

- Work on a dedicated branch per phase (e.g. `refactor/service-registry`, `refactor/error-diagnostics`), not `main`. Open a pull request via GitKraken (`pull_request_create`) targeting `main` for Jacob to review — never commit directly to `main`.
- **Land this in the phased order below, each phase its own PR.** Per the audit's own advice ("do the structural refactor in smaller steps so it does not destabilize the app") and this project's own history of large single-PR changes being harder to review/revert. Do not combine phases into one PR without being told to.
- **Every phase must keep the app fully functional at every commit.** No phase may leave the app in a state where overlays/detector/watcher fail to start. If a phase's tests can't be run live (no GTK/PySide6 stack in the dev sandbox — confirmed limitation, see existing `x11_overlay.py` module docstring for precedent), say so explicitly rather than claiming live verification that didn't happen.
- **Do not delete or rename existing top-level script files** (`launcher.py`, `control-panel.py`, `overlay.py`, `overlay_gtk.py`, etc.) in this plan. The audit's own `FIX-ARCH-01` suggestion explicitly says "keep existing script filenames as thin wrappers for backward compatibility" — respect that. A full script-to-package reorganization (audit's `FIX-ARCH-01`/`FIX-ARCH-02`) is out of scope for this plan entirely; see "Deliberately excluded" below.
- Do not make any change not explicitly specified by this plan's steps. If a step fails, doesn't match the current codebase (missing symbol, unexpected pre-existing changes, etc.), stop and report it back instead of improvising a fix or working around it.
- Every new/changed piece of process-liveness or config-write logic must have a unit test, following this repo's existing lightweight `pytest` convention (see `tests/test_platform_utils.py`, added 2026-08-03, for the exact style: no mocking framework, test pure logic functions directly).

## Deliberately excluded from this plan

The audit's `FIX-ARCH-01`/`FIX-ARCH-02` (full package reorganization: `app/` or `orbiter/` package, moving all top-level scripts into submodules) is **not** part of this plan. That is the single riskiest, lowest-immediate-value item on the list — it touches nearly every file in the repo for a purely organizational win, with no bug-fixing payoff of its own. If Jacob wants that done, it should be its own separate, later plan, scoped and reviewed on its own after the phases below have proven out the service-registry pattern in practice.

---

## Phase 1: Structured process registry (replaces `FIX-PROCESS-01`)

**Branch:** `refactor/service-registry`

Replace "is this feature running?" (currently: re-scan the entire system process list and substring-match cmdlines every time, per `autostart_manager.is_feature_running()`) with an explicit registry that records what *this app itself* launched.

### Task 1.1: `service_registry.py` — PID + metadata tracking

- [ ] Create `service_registry.py` with:
  - `record_launch(feature: str, pid: int, launched_at: float) -> None` — writes a small JSON file per feature to `DATA_DIR / "service-registry" / f"{feature}.json"` containing `{"pid": ..., "launched_at": ..., "cmdline": [...]}`. The `cmdline` snapshot (captured once, from the actual `Popen`/`psutil.Process` right after launch, not re-derived later) is what makes later liveness checks precise instead of heuristic.
  - `is_registered_process_alive(feature: str) -> bool` — reads the registry file, checks the recorded PID is still alive via `psutil.pid_exists(pid)` **and** that the live process's current cmdline still matches the recorded snapshot (guards against PID reuse — a real, if rare, risk on long-running systems). Returns `False` (not an exception) if the registry file is missing/corrupt.
  - `clear_registration(feature: str) -> None` — called on intentional stop.
- [ ] Unit tests in `tests/test_service_registry.py`: registry round-trips correctly; a PID that no longer exists reports not-alive; a PID that exists but whose live cmdline no longer matches the recorded snapshot (simulating PID reuse) reports not-alive, not a false positive.

### Task 1.2: Wire into `autostart_manager.py`

- [ ] `_start_detector()`, `_start_watcher()`, `_start_overlay()`, `_start_relic_recommend()`, `_start_riven()`, `_start_fissure()` (or wherever these currently call `launch_detached()`) each call `service_registry.record_launch(feature, proc.pid, time.time())` right after launching — `launch_detached()` already returns the `Popen` object, so this is a small addition at each call site, not a new launch mechanism.
- [ ] `is_feature_running()` becomes: try `service_registry.is_registered_process_alive(feature)` first; if the registry has no entry at all (e.g. app just started, or an older version launched it before this change), fall back to the existing substring-based `_PROCESS_PATTERNS` scan (now using PR #24's hardened `_matches_pattern()`) so a pre-existing running instance from before this change isn't reported as dead. **Do not remove the substring-based fallback** — it's the safety net for exactly this transition case.
- [ ] `stop_feature()` calls `service_registry.clear_registration(feature)` after killing.

### Task 1.3: Live verification

- [ ] Not runnable in this dev sandbox (no live Warframe process, no display). Flag for Jacob to verify: launch the app, confirm the Status tab agrees with actual running processes, then deliberately run a `python -c "...target/release/orbiter..."` one-liner (the exact bug from tonight) and confirm it does *not* flip any status to "Running" incorrectly.

---

## Phase 2: Health checks + restart-on-death policy (replaces `FIX-PROCESS-02`)

**Branch:** `refactor/service-restart-policy`

Directly fixes tonight's `warframe-watcher.py` silent-death bug: it stopped logging at 09:44:48 with `reason: unspecified` and never restarted, and nothing else noticed for over 12 hours.

### Task 2.1: Heartbeat-aware restart in the reconciliation loop

- [ ] Find the existing reconciliation loop (`warframe-watcher.py`'s own loop, or wherever `reconcile_warframe_gated()` is called on a timer — confirm exact location before editing, don't assume).
- [ ] For each `ALWAYS_ON_OPEN` / Warframe-gated feature that's supposed to be running (per `get_autostart(feature)`), check `service_registry.is_registered_process_alive(feature)` each reconciliation tick (already happening at whatever interval the existing loop runs).
- [ ] If a feature is supposed to be running, autostart is enabled, and the registry says it's dead: restart it once, with a simple backoff (e.g. don't attempt more than once per 30s per feature, to avoid a crash-loop hammering the system) and log the restart with a clear reason (`"restart: registered process no longer alive"`).
- [ ] Log every restart attempt's outcome (success/failure) — this is the exact trace that was missing tonight ("STOP ... reason: unspecified" and then nothing for 12 hours).

### Task 2.2: Detect the supervisor's own death

- [ ] The reconciliation loop itself (`warframe-watcher.py`) is the thing that died tonight with no trace. It can't restart itself if it's the one that's dead. Add a lightweight heartbeat file (`DATA_DIR / "watcher-heartbeat.json"`, `{"tick": N, "last_beat": timestamp}`) written every loop iteration (the existing `autostart-manager.log` heartbeat lines already prove this data is available — just also persist it to a file, not only a log line).
- [ ] The main GUI app (whichever process is expected to be alive whenever the user has the app open — confirm exact process before wiring this) checks this heartbeat file's age on its own status-refresh timer; if it's stale beyond some threshold (e.g. 3x the normal tick interval) while `autostart_watcher` is enabled, surface it clearly in the Status tab ("Watcher: STALLED — last heartbeat Xm ago") rather than silently showing nothing.
- [ ] Do not attempt to have the GUI process auto-*restart* the watcher process in this task — that risks a restart loop between two processes each trying to manage the other. Surfacing the stall clearly to the user is the scope here; an explicit "Restart Watcher" button (if one doesn't already exist) is enough for the user to act on it.

### Task 2.3: Tests

- [ ] Unit test the backoff logic (task 2.1) as a pure function: given a restart-attempt history and a current timestamp, does it correctly allow/deny a new attempt.
- [ ] Unit test heartbeat staleness detection (task 2.2) as a pure function of `(last_beat, now, threshold) -> bool`.

---

## Phase 3: Structured error diagnostics (replaces `FIX-ERROR-01`)

**Branch:** `refactor/error-diagnostics`

- [ ] Audit the specific `except Exception:` / bare `except:` blocks in `paths.py`, `autostart_manager.py`, `refresh_wfcd_cache.py` (the three files the audit named) individually — **do not do a blanket find-replace across the codebase**. Many existing broad excepts are deliberate ("logging must never take down the overlay" — `overlay_gtk.py`'s `log()`, for example) and must stay broad; only tighten ones that are actually hiding a real, actionable failure silently.
- [ ] For each one judged worth tightening: narrow the `except` to the specific exception type(s) actually expected, and log the exception (type + message, not just "something failed") at an appropriate level before falling back to the default behavior.
- [ ] This task is deliberately open-ended in scope (it's a judgment call per call site, not a mechanical change) — report back the specific list of call sites reviewed and what was/wasn't changed, rather than assuming every broad except found is a bug.

---

## Phase 4: Config/state write hardening (replaces `FIX-CONFIG-01`)

**Branch:** `refactor/atomic-config-writes`

### Task 4.1: Atomic writes for `config.json` and other mutable state files

- [ ] Add a small `atomic_write_json(path: Path, data: dict)` helper (likely in `paths.py`, alongside `_save_config()`) that writes to a temp file in the same directory (`path.with_suffix(".tmp")` or `tempfile.NamedTemporaryFile(dir=path.parent, delete=False)`) then `os.replace()`s it over the target — `os.replace()` is atomic on both POSIX and Windows, so a crash mid-write can never leave a half-written config file.
- [ ] Replace `_save_config()` in `paths.py` and `autostart_manager.py` (and any other direct `path.write_text(json.dumps(...))` call on config/state files — search for them explicitly, don't guess which ones exist) to use this helper.
- [ ] Unit test: simulate a write, confirm the target file either has the old complete content or the new complete content at any point — no partial-write state is directly testable via mocking `os.replace` to fail mid-way and confirming the original file is untouched.

### Task 4.2: Do not implement backup/rollback or schema validation in this phase

The audit also suggested backups-before-overwrite and JSON schema validation. Both are real value-adds but meaningfully larger scope (schema definitions, backup retention policy) than "harden the write itself." Flag as a follow-up phase, not part of this one, to keep this phase reviewable in one sitting.

---

## Phase 5: Update-pipeline robustness (replaces `FIX-UPDATE-01`) — lowest priority, do last

**Branch:** `refactor/update-pipeline-diagnostics`

- [ ] Add a per-artifact last-success timestamp + last-error record (small JSON file per data source, e.g. `DATA_DIR / "update-status" / "wfcd-cache.json"`) written by `update_manager.py`/`refresh_wfcd_cache.py` after every fetch attempt, success or failure.
- [ ] Surface this in the existing "REFRESH DATA" panel (`DASHBOARD_TAB.py`/`STATUS_TAB.py`, wherever "Last refresh" is currently shown) so a silently-failing update is visible instead of just showing a stale "Last refresh: Xd ago" with no indication *why* it stopped refreshing.
- [ ] ETag/Last-Modified-based conditional fetching (only rewrite files when content actually changed) is a genuine efficiency improvement but not a correctness fix — treat as optional within this phase, not required.

---

## Explicitly not phased (lower priority per audit, revisit later if wanted)

- `FIX-TEST-01` (integration tests for launcher/service-manager behavior) — write these incrementally as each phase above lands, testing the actual new code each phase introduces, rather than as a separate standalone task.
- `FIX-NATIVE-01` (repeatable Rust build/smoke-test path) — the Rust side already has `cargo test --release` wired into CI (`.github/workflows/pull-request.yml`); confirm what's actually missing (a smoke test against a sample image, specifically) before treating this as unaddressed.
- `FIX-ARCH-01`/`FIX-ARCH-02` (package reorganization) — see "Deliberately excluded" above.
