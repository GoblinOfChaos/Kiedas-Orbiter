"""service_registry.py — records which PID(s) this app itself launched for
each background feature, so liveness checks can compare against a known
launch instead of re-scanning the whole system process list and guessing
from a substring pattern every time.

Phase 1 of docs/superpowers/plans/2026-08-03-service-lifecycle-refactor.md
(FIX-PROCESS-01). Deliberately does NOT replace autostart_manager.py's
existing substring-based `_PROCESS_PATTERNS` scan - a feature the app
didn't launch itself (an older version's leftover process, or a manual
launch outside this app) has no registry entry, and callers must fall back
to the substring scan in that case rather than reporting it as not-running.
"""

import json
import time
from pathlib import Path
from typing import List, Optional

import psutil

from paths import DATA_DIR

REGISTRY_DIR = DATA_DIR / "service-registry"


def _registry_path(feature: str) -> Path:
    return REGISTRY_DIR / f"{feature}.json"


def record_launch(feature: str, pid: int, component: Optional[str] = None) -> None:
    """Record that `feature` (or one component of it, for multi-process
    features like "riven"/"fissure" which launch a watcher + an overlay
    under one feature name) is now running as `pid`. Appends to any
    existing entries for other components of the same feature rather than
    overwriting them - call clear_registration(feature) first if starting
    the whole feature fresh."""
    try:
        proc = psutil.Process(pid)
        # create_time(), not cmdline(), is what actually guards against PID
        # reuse here - _start_detector() launches launch-orbiter.sh, which
        # exec()s the real orbiter binary shortly after this Popen returns.
        # exec() replaces a process's cmdline but keeps the same PID *and*
        # the same create_time(), so recording cmdline here would capture
        # the wrapper script's argv and then mismatch against the real
        # binary's argv moments later - a false "not alive" on every single
        # launch. create_time() is stable across exec and differs for any
        # later unrelated process that happens to reuse the same PID.
        create_time = proc.create_time()
        cmdline = proc.cmdline()
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        create_time = None
        cmdline = []

    entries = _load_entries(feature)
    key = component or feature
    entries = [e for e in entries if e.get("component") != key]
    entries.append({
        "component": key,
        "pid": pid,
        "launched_at": time.time(),
        "create_time": create_time,
        "cmdline": cmdline,  # kept for diagnostics only, not the liveness check
    })
    _save_entries(feature, entries)


def clear_registration(feature: str) -> None:
    path = _registry_path(feature)
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass


def is_registered_process_alive(feature: str) -> Optional[bool]:
    """Returns True if every recorded component for `feature` is still
    alive with a matching cmdline, False if the registry has entries but
    at least one is dead/mismatched, or None if there's no registry entry
    at all (caller should fall back to the substring-based scan in that
    case - "no info" is not the same as "definitely dead")."""
    entries = _load_entries(feature)
    if not entries:
        return None
    return all(_entry_alive(e) for e in entries)


def _entry_alive(entry: dict) -> bool:
    pid = entry.get("pid")
    if not isinstance(pid, int) or not psutil.pid_exists(pid):
        return False
    recorded_create_time = entry.get("create_time")
    if recorded_create_time is None:
        # create_time() couldn't be read at launch time (process vanished
        # immediately, or a permissions issue) - nothing to compare
        # against, so treat pid existence alone as the best available
        # signal rather than always reporting dead.
        return True
    try:
        proc = psutil.Process(pid)
        current_create_time = proc.create_time()
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        return False
    # Guards against PID reuse: a dead process's PID can be recycled by an
    # unrelated later process, which would have started at a different
    # time. Unlike cmdline, create_time() is stable across the launched
    # process's own exec() calls (see record_launch()'s docstring), so
    # this doesn't false-positive on the launch-orbiter.sh -> orbiter
    # exec transition.
    return abs(current_create_time - recorded_create_time) < 0.01


def _load_entries(feature: str) -> List[dict]:
    try:
        data = json.loads(_registry_path(feature).read_text())
        return data if isinstance(data, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def _save_entries(feature: str, entries: List[dict]) -> None:
    try:
        REGISTRY_DIR.mkdir(parents=True, exist_ok=True)
        _registry_path(feature).write_text(json.dumps(entries))
    except OSError:
        pass
