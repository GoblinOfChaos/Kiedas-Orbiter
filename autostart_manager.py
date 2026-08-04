#!/usr/bin/env python3
"""autostart_manager.py — single source of truth for starting/stopping the
six background features (detector, watcher, overlay, relic-recommend,
riven, fissure) and checking whether each is currently running.

Shared between missing-parts.py's app-startup auto-start logic and
STATUS_TAB.py's Auto-Start settings panel, so there's exactly one place
that knows how to launch or stop each one - avoids the two call sites
drifting out of sync with each other.
"""

import sys as _sys
import time
from pathlib import Path
from typing import Optional

from paths import CONFIG_FILE, DATA_DIR, WFINFO_DIR, build_detector_args
from platform_utils import launch_detached, clean_env_for_launch, kill_processes, is_running, IS_LINUX
from autostart_migration import disable_legacy_autostart_entries
import service_registry

VENV_PYTHON = WFINFO_DIR / (".venv/Scripts/python.exe" if _sys.platform == "win32" else ".venv/bin/python")
LOG_FILE = DATA_DIR / "autostart-manager.log"


def _log(msg: str):
    """Diagnostic trail for exactly why something got started/stopped -
    added 2026-07-16 after two prior fix attempts (startup-mtime bug,
    stop-debounce) both turned out insufficient to explain watcher.py and
    riven_grader_watcher.py restarting repeatedly with no clear cause.
    Needed real evidence of the *caller*, not more guessing."""
    try:
        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(LOG_FILE, "a") as f:
            f.write(f"[{ts}] {msg}\n")
    except OSError:
        pass

FEATURES = ["detector", "watcher", "overlay", "relic_recommend", "riven", "fissure"]

# Detector and watcher start immediately when the app opens, regardless of
# whether Warframe is running yet - watcher's entire job is *detecting*
# Warframe launching, so it can't wait for the thing it's supposed to
# detect. The other four are overlays/watchers that only make sense while
# Warframe is actually open, so they're gated on that instead - confirmed
# with Jacob 2026-07-16 after he noticed the riven overlay popping up with
# no rivens on screen and Warframe not even running.
ALWAYS_ON_OPEN = ["detector", "watcher"]
WARFRAME_GATED = ["overlay", "relic_recommend", "riven", "fissure"]

FEATURE_LABELS = {
    "detector": "Warframe Detector",
    "watcher": "Warframe Watcher",
    "overlay": "Relic Reward Overlay",
    "relic_recommend": "Relic Recommendation Overlay",
    "riven": "Riven Grader Overlay",
    "fissure": "Fissure Tracker Overlay",
}

# Process cmdline substrings used with platform_utils.is_running()/kill_processes().
# "./orbiter" (the flat fallback binary launch-wfinfo.sh execs when
# target/release/orbiter doesn't exist - see its location-mismatch fix)
# is included alongside the cargo build path. download_helper.py writes
# the downloaded detector binary flat at WFINFO_DIR/orbiter, and the
# launch script execs it as the literal relative path "./orbiter" (cwd is
# WFINFO_DIR), which is exactly how it shows up in the running process's
# cmdline - but this pattern list was never updated to match it, so a
# downloaded detector could be neither detected as running nor stopped by
# "Restart Detector". The "./" prefix (not bare "orbiter") avoids
# repeating the exact substring-collision bug fixed here before, where a
# bare "orbiter" pattern matched an unrelated "vim .../orbiter-notes/
# todo.txt" process - that path has no "./" immediately before "orbiter".
_PROCESS_PATTERNS = {
    "detector": ["target/release/orbiter", "orbiter.exe", "./orbiter"],
    # Include the path separator for Python scripts.  A bare "overlay.py"
    # also matches riven_grader_overlay.py and fissure_overlay.py, which made
    # a surviving unrelated overlay look like the reward overlay was alive.
    "watcher": ["/warframe-watcher.py"],
    "overlay": ["/overlay.py", "/overlay_gtk.py"],
    "relic_recommend": ["/relic_recommend_watcher.py"],
    "riven": ["/riven_grader_watcher.py", "/riven_grader_overlay.py"],
    "fissure": ["/fissure_watcher.py", "/fissure_overlay.py"],
}

# Most entries above are alternative executable names, so any match means the
# feature is running.  These features are pipelines with multiple required
# processes: if one component dies, the feature is broken and reconciliation
# must restart it.  The previous any-match check left today's dead Riven
# overlay unrecovered because its grader watcher was still alive.
_REQUIRED_COMPONENTS = {
    "overlay": [["/overlay.py"], ["/overlay_gtk.py"]],
    "riven": [["/riven_grader_watcher.py"], ["/riven_grader_overlay.py"]],
    "fissure": [["/fissure_watcher.py"], ["/fissure_overlay.py"]],
}


def _load_config() -> dict:
    import json
    try:
        return json.loads(CONFIG_FILE.read_text())
    except Exception:
        return {}


def _save_config(cfg: dict):
    import json
    try:
        CONFIG_FILE.write_text(json.dumps(cfg, indent=2))
    except Exception:
        pass


def get_autostart(feature: str) -> bool:
    """Default True for all six - confirmed default per Jacob 2026-07-16."""
    return bool(_load_config().get(f"autostart_{feature}", True))


def set_autostart(feature: str, enabled: bool):
    cfg = _load_config()
    cfg[f"autostart_{feature}"] = bool(enabled)
    _save_config(cfg)


def is_feature_running(feature: str) -> bool:
    # Registry first: precise, PID-based, immune to the substring
    # false-positive class fixed in platform_utils._matches_pattern()
    # (confirmed live 2026-08-03 - a diagnostic shell one-liner whose own
    # text happened to mention "target/release/orbiter" was counted as a
    # running detector). Only falls back to the substring scan when there
    # is no registry entry at all - e.g. right after upgrading to this
    # version, or a feature started outside this app's own launch
    # functions - since "no info" must not be treated as "definitely not
    # running".
    registered = service_registry.is_registered_process_alive(feature)
    if registered is not None:
        return registered

    components = _REQUIRED_COMPONENTS.get(feature)
    if components is not None:
        return all(any(is_running(pattern) for pattern in alternatives)
                   for alternatives in components)
    return any(is_running(p) for p in _PROCESS_PATTERNS.get(feature, []))


def stop_feature(feature: str, reason: str = "unspecified"):
    _log(f"STOP {feature} (reason: {reason})")
    for pattern in _PROCESS_PATTERNS.get(feature, []):
        kill_processes(pattern)
    service_registry.clear_registration(feature)


def _start_detector():
    # Extra args (EE.log override, --hotkey, --pre-capture-sleep-ms) come
    # from one shared builder now (paths.build_detector_args()) instead of
    # being rebuilt here - this used to be one of three independent
    # copies of the same logic, and warframe-watcher.py's own copy
    # (restart_wfinfo(), triggered on every Warframe restart) had drifted
    # to have none of it at all. Jacob 2026-07-24 ("Unify detector
    # launch/restart construction").
    args = build_detector_args()
    log_file = DATA_DIR / "orbiter.log"
    if IS_LINUX:
        # The main GUI process's own LD_LIBRARY_PATH has the venv's bundled
        # PySide6 Qt libs prepended (launcher.py's _build_env(), needed back
        # when overlays were Qt-based) - clean_env_for_launch() just copies
        # os.environ, so that leaks into every child including this one.
        # The Rust detector doesn't use Qt itself, but it shells out to the
        # HOST's spectacle/grim for screenshots - those need HOST Qt libs,
        # not the venv's. Confirmed live 2026-07-20: orbiter.log showed
        # every single screenshot attempt failing with
        # "version Qt_6.11_PRIVATE_API not found" pointing at the venv's
        # libQt6Qml.so.6, even though launch-orbiter.sh also prepends host
        # lib dirs - that prepend wasn't enough to override it. Stripping
        # LD_LIBRARY_PATH here entirely lets spectacle/grim resolve their
        # own libs via normal host ld.so resolution.
        env = clean_env_for_launch()
        env.pop("LD_LIBRARY_PATH", None)
        proc = launch_detached(["./launch-orbiter.sh"] + args, cwd=WFINFO_DIR,
                                env=env, log_file=log_file)
    else:
        proc = launch_detached([str(WFINFO_DIR / "orbiter.exe")] + args, cwd=WFINFO_DIR,
                                log_file=log_file)
    service_registry.record_launch("detector", proc.pid)


def _start_watcher():
    proc = launch_detached(
        [str(VENV_PYTHON), str(WFINFO_DIR / "launcher.py"), "watcher"],
        cwd=WFINFO_DIR, env=clean_env_for_launch(), log_file=DATA_DIR / "watcher.log",
    )
    service_registry.record_launch("watcher", proc.pid)


def _start_overlay():
    # overlay.py's own main() already does its own pid-file singleton kill
    # of any prior instance, so no need to kill_processes() first here.
    proc = launch_detached(
        [str(VENV_PYTHON), str(WFINFO_DIR / "launcher.py"), "overlay"],
        cwd=WFINFO_DIR, env=clean_env_for_launch(), log_file=DATA_DIR / "overlay.log",
    )
    service_registry.record_launch("overlay", proc.pid)


def _start_relic_recommend():
    # Stdlib-only script, no Qt - doesn't need clean_env_for_launch(),
    # matching the plain `python3 relic_recommend_watcher.py` autostart
    # entries this replaces.
    proc = launch_detached(
        [str(VENV_PYTHON), str(WFINFO_DIR / "relic_recommend_watcher.py")],
        cwd=WFINFO_DIR, log_file=DATA_DIR / "relic-recommend-watcher.log",
    )
    service_registry.record_launch("relic_recommend", proc.pid)


def _start_riven():
    watcher_proc = launch_detached(
        [str(VENV_PYTHON), str(WFINFO_DIR / "riven_grader_watcher.py")],
        cwd=WFINFO_DIR, log_file=DATA_DIR / "riven-grader-watcher.log",
    )
    service_registry.record_launch("riven", watcher_proc.pid, component="watcher")
    # Now GTK, not Qt - no more LD_LIBRARY_PATH override for PySide6's
    # bundled Qt libs. That override is not just unneeded now but actively
    # risky to keep: it could make this GTK/Cairo process pick up
    # mismatched library versions shadowed from the old Qt bundle dir.
    overlay_proc = launch_detached(
        [str(VENV_PYTHON), str(WFINFO_DIR / "riven_grader_overlay.py")],
        cwd=WFINFO_DIR, env=clean_env_for_launch(), log_file=DATA_DIR / "riven-overlay.log",
    )
    service_registry.record_launch("riven", overlay_proc.pid, component="overlay")


def _start_fissure():
    watcher_proc = launch_detached(
        [str(VENV_PYTHON), str(WFINFO_DIR / "fissure_watcher.py")],
        cwd=WFINFO_DIR, log_file=DATA_DIR / "fissure-watcher.log",
    )
    service_registry.record_launch("fissure", watcher_proc.pid, component="watcher")
    overlay_proc = launch_detached(
        [str(VENV_PYTHON), str(WFINFO_DIR / "fissure_overlay.py")],
        cwd=WFINFO_DIR, env=clean_env_for_launch(), log_file=DATA_DIR / "fissure-overlay.log",
    )
    service_registry.record_launch("fissure", overlay_proc.pid, component="overlay")


_STARTERS = {
    "detector": _start_detector,
    "watcher": _start_watcher,
    "overlay": _start_overlay,
    "relic_recommend": _start_relic_recommend,
    "riven": _start_riven,
    "fissure": _start_fissure,
}


def start_feature(feature: str, reason: str = "unspecified"):
    _log(f"START {feature} (reason: {reason})")
    starter = _STARTERS.get(feature)
    if starter is not None:
        starter()


def is_warframe_running() -> bool:
    return is_running("Warframe.x64.exe") or is_running("Warframe.exe")


def apply_autostart():
    """Called once at app launch - starts detector/watcher immediately if
    their autostart toggle is on. The four Warframe-gated features are
    handled separately by reconcile_warframe_gated() instead, which needs
    to run repeatedly (not just once at launch) to react to Warframe
    actually starting or closing later."""
    if IS_LINUX:
        try:
            for old_path, backup_path in disable_legacy_autostart_entries():
                _log(f"MIGRATE legacy autostart: {old_path} -> {backup_path}")
        except OSError as error:
            _log(f"WARNING could not migrate legacy autostart entries: {error}")

    for feature in ALWAYS_ON_OPEN:
        if get_autostart(feature) and not is_feature_running(feature):
            start_feature(feature, reason="apply_autostart (app launch)")


# How many consecutive "Warframe not running" readings are required before
# actually stopping anything. Confirmed live on 2026-07-16: a single flaky
# reading (Proton/Wine process detection isn't perfectly reliable on
# Linux) was enough to kill and restart overlay_gtk.py and
# riven_grader_watcher.py every few seconds while Warframe was genuinely
# still running the whole time - the reward overlay never got a stable
# moment to show anything, and the riven overlay kept resetting to a
# freshly-"new" state on every restart. Starting stays instant (starting
# an already-running feature is a safe no-op either way), only stopping
# needs the debounce.
_STOP_DEBOUNCE_TICKS = 3
_not_running_streak = 0
_tick_count = 0

HEARTBEAT_FILE = DATA_DIR / "watcher-heartbeat.json"

# Minimum seconds between restart attempts for the same always-on feature -
# without this, a feature that dies immediately after every restart attempt
# (a real crash-on-launch bug, not a transient blip) would get relaunched
# every single reconcile tick, hammering the system instead of surfacing
# the actual problem.
_ALWAYS_ON_RESTART_BACKOFF_SECONDS = 30
_last_always_on_restart_attempt: dict = {}


def _write_heartbeat():
    import json
    try:
        HEARTBEAT_FILE.write_text(json.dumps({"tick": _tick_count, "last_beat": time.time()}))
    except OSError:
        pass


def heartbeat_age_seconds() -> Optional[float]:
    """Seconds since the reconciliation loop last ticked, or None if the
    heartbeat file doesn't exist yet (loop never ran) or is unreadable."""
    import json
    try:
        data = json.loads(HEARTBEAT_FILE.read_text())
        return time.time() - float(data["last_beat"])
    except (OSError, json.JSONDecodeError, KeyError, ValueError, TypeError):
        return None


def _can_attempt_restart(feature: str, now: float) -> bool:
    last = _last_always_on_restart_attempt.get(feature)
    return last is None or (now - last) >= _ALWAYS_ON_RESTART_BACKOFF_SECONDS


# Deliberately excludes "watcher" even though it's ALWAYS_ON_OPEN.
# reconcile_always_on() is called FROM WITHIN warframe-watcher.py's own
# loop - having it try to determine "is watcher alive?" via a shared
# registry file it also writes to is inherently fragile (that file can
# briefly disagree with reality across the write/read race between two
# instances), and if it ever false-negatives, the process spawns a
# *second* copy of itself, which then runs the same check and can spawn
# a third, and so on. Live-reproduced 2026-08-04: a single manual test
# call produced 11 concurrent warframe-watcher.py processes within about
# a minute, each launching roughly every 5s (the reconcile tick
# interval) - a real, actively-worsening runaway loop, not theoretical.
# A process cannot reliably self-diagnose "am I alive" through a side
# channel anyway - if this code is executing at all, the answer is
# trivially yes. See health.py's HealthWidget for how a stalled (not
# dead) watcher is surfaced instead, from the separate GUI process.
_SELF_RESTARTABLE_ALWAYS_ON = ["detector"]


def reconcile_always_on():
    """Call this repeatedly, same as reconcile_warframe_gated() - restarts
    detector if it dies mid-session. Unlike the Warframe-gated features,
    it has no reconciliation at all otherwise: apply_autostart() only
    starts it once, at app launch. Confirmed live 2026-08-02: the
    detector silently stopped writing to orbiter.log mid-session (no
    crash trace, no error) and nothing restarted it for the rest of the
    night, breaking reward detection for every subsequent relic round
    until a human noticed via direct log/process inspection."""
    now = time.time()
    for feature in _SELF_RESTARTABLE_ALWAYS_ON:
        autostart_on = get_autostart(feature)
        running = is_feature_running(feature)
        can_attempt = _can_attempt_restart(feature, now)
        if not autostart_on or running:
            continue
        if not can_attempt:
            # Diagnostic for the live mystery 2026-08-04: detector stayed
            # "not running" for well over a minute in real usage with no
            # restart attempt logged at all, despite this exact function
            # working correctly when called manually. Logging the blocked
            # case (not just the successful one) turns that into directly
            # observable evidence instead of more inference from outside.
            last_attempt = _last_always_on_restart_attempt.get(feature)
            _log(
                f"reconcile_always_on: {feature} not running but restart "
                f"blocked by backoff (last_attempt={last_attempt}, "
                f"now={now}, elapsed={now - last_attempt if last_attempt else None})"
            )
            continue
        _last_always_on_restart_attempt[feature] = now
        try:
            start_feature(feature, reason="reconcile_always_on (not running)")
        except Exception as e:
            # This must be impossible to lose. Live mystery 2026-08-04:
            # detector stayed "not running" indefinitely with no restart
            # attempt visible anywhere in the logs, despite the in-memory
            # backoff dict proving an attempt DID happen. Leading theory:
            # launch_detached()'s own open(log_file, "ab") raised (file-
            # descriptor exhaustion left over from the runaway
            # watcher-duplication bug fixed earlier the same session),
            # and the resulting exception's error message got silently
            # swallowed by log()'s own OSError guard (warframe-watcher.py,
            # hardened specifically so a logging failure can't kill the
            # loop) - which in this one case meant a real launch failure
            # left zero trace anywhere. _log() goes through the same
            # write path and could suffer the same fate, so this also
            # prints directly to stderr (captured into watcher.log's own
            # redirected output by launch_detached(), a completely
            # separate path from _log()'s explicit file open) as a second,
            # independent channel for exactly this failure mode.
            print(f"reconcile_always_on: start_feature({feature!r}) raised {e!r}", file=_sys.stderr, flush=True)
            _log(f"reconcile_always_on: start_feature({feature!r}) raised {e!r}")


def reconcile_warframe_gated():
    """Call this repeatedly (e.g. every few seconds from a QTimer) rather
    than once - it enforces 'this feature should be running right now' as
    (autostart toggle is on) AND (Warframe is running), starting or
    stopping each of the four gated features to match. Self-correcting on
    every call, so it doesn't matter whether Warframe just started, just
    closed, or nothing changed since the last check."""
    global _not_running_streak, _tick_count
    # Confirmed live 2026-07-16: gated features stopped once and then
    # never restarted for 5+ hours despite this supposedly re-checking
    # every 5s. A heartbeat here (not just logging on actual start/stop)
    # is what actually proves whether this function keeps getting called
    # at all, as opposed to the exception path (see missing-parts.py's
    # caller) silently eating every subsequent tick - two different bugs
    # that look identical from the outside without this.
    _tick_count += 1
    if _tick_count % 12 == 0:  # roughly once a minute at the 5s interval
        _log(f"heartbeat: tick={_tick_count} warframe_up={is_warframe_running()} streak={_not_running_streak}")
    # Persisted every tick (not just the once-a-minute log line above) so
    # a caller in a different process (the GUI's Status tab) can detect
    # this loop stalling out entirely - the exact failure mode from
    # 2026-08-02, where this whole loop stopped with no trace and nothing
    # else noticed for over 12 hours.
    _write_heartbeat()

    warframe_up = is_warframe_running()
    if warframe_up:
        _not_running_streak = 0
    else:
        _not_running_streak += 1
    confirmed_down = _not_running_streak >= _STOP_DEBOUNCE_TICKS

    for feature in WARFRAME_GATED:
        running = is_feature_running(feature)
        if warframe_up and get_autostart(feature) and not running:
            start_feature(feature, reason=f"reconcile_warframe_gated (warframe_up={warframe_up})")
        elif confirmed_down and running:
            stop_feature(feature, reason=f"reconcile_warframe_gated (streak={_not_running_streak})")
