#!/usr/bin/env python3
"""Track Warframe lifetime and reconcile its gated helper processes.

Orbiter now captures through Spectacle/grim and does not cache an X11 Warframe
window handle. Restarting it after every watcher startup is obsolete and adds a
measured ten-second detection outage while Warframe is already running.
"""
import time
import traceback
from paths import DATA_DIR
WATCHER_LOG = DATA_DIR / "watcher.log"

POLL_INTERVAL = 5         # seconds between Warframe-PID checks

def log(msg):
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    try:
        with open(WATCHER_LOG, "a") as f:
            f.write(f"[{ts}] {msg}\n")
    except OSError:
        # This is called from inside main()'s own except block on the
        # error path - if the write itself ever failed (disk full,
        # transient permission issue) with no guard here, that second
        # exception would propagate up uncaught (nothing wraps the except
        # block's own body) and silently kill the whole watcher loop -
        # the exact "STOP ... reason: unspecified, then total silence"
        # symptom confirmed live 2026-08-02. Logging must never be able
        # to take down the thing it's trying to log about.
        pass

from platform_utils import get_pid
import autostart_manager


def get_warframe_pid():
    # On Windows Warframe runs natively; on Linux via Proton
    for pattern in ["Warframe.x64.exe", "Warframe.exe"]:
        pid = get_pid(pattern)
        if pid:
            return pid
    return None

def main():
    log("=== watcher started ===")
    last_pid = None
    while True:
        try:
            current = get_warframe_pid()
            if current != last_pid:
                if current is not None:
                    if last_pid is None:
                        log(f"Warframe started (PID {current})")
                    else:
                        log(f"Warframe restarted ({last_pid} -> {current})")
                else:
                    log(f"Warframe closed (was PID {last_pid})")
                last_pid = current

            # Runs from this always-alive standalone process rather than a
            # QTimer inside the GUI app - confirmed 2026-07-17 that gated
            # overlays stopped once and never restarted for 5+ hours despite
            # the GUI's QTimer supposedly re-checking every 5s, with zero
            # heartbeat/exception evidence of why. This watcher's own loop
            # has run reliably all session with no such gap, so reusing it
            # removes the dependency on the GUI event loop staying healthy.
            autostart_manager.reconcile_warframe_gated()
            # Restarts detector/watcher themselves if either dies
            # mid-session - previously nothing ever re-checked these two
            # after apply_autostart()'s one-time launch at app start.
            autostart_manager.reconcile_always_on()
        except Exception as e:
            # Without this, any unexpected error here (a psutil hiccup, a
            # transient permission error, etc.) kills the whole watcher loop
            # silently - it just stops logging forever with no trace of why.
            log(f"watcher loop error: {e}\n{traceback.format_exc()}")

        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
