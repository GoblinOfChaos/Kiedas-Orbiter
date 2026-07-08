#!/usr/bin/env python3
"""
warframe-watcher.py - polls for Warframe.x64.exe and restarts wfinfo
whenever Warframe starts or restarts, so wfinfo's X11 window handle stays fresh.
"""
import os
import subprocess
import time
from pathlib import Path
from paths import DATA_DIR

WFINFO_DIR = Path.home() / "wfinfo-ng"
WFINFO_BIN = WFINFO_DIR / "target/release/orbiter"
LOG_FILE = DATA_DIR / "orbiter.log"
WATCHER_LOG = DATA_DIR / "watcher.log"

POLL_INTERVAL = 5         # seconds between Warframe-PID checks
WAIT_BEFORE_RESTART = 6   # grace period so Warframe's window is rendered before we capture

def log(msg):
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    with open(WATCHER_LOG, "a") as f:
        f.write(f"[{ts}] {msg}\n")

def get_warframe_pid():
    try:
        r = subprocess.run(
            ["pgrep", "-f", "Warframe.x64.exe"],
            capture_output=True, text=True, timeout=2
        )
        if r.returncode == 0 and r.stdout.strip():
            return int(r.stdout.strip().split()[0])
    except Exception as e:
        log(f"pgrep error: {e}")
    return None

def restart_wfinfo():
    log("Restarting orbiter")
    try:
        subprocess.run(["pkill", "-f", "target/release/orbiter"], check=False, timeout=5)
    except Exception as e:
        log(f"pkill error: {e}")
    time.sleep(1.5)
    try:
        import pwd
        uid = os.getuid()
        # Always use the host session bus — never inherit Flatpak's bus
        clean_env = os.environ.copy()
        clean_env["DBUS_SESSION_BUS_ADDRESS"] = f"unix:path=/run/user/{uid}/bus"
        clean_env["XDG_RUNTIME_DIR"] = f"/run/user/{uid}"
        clean_env["XDG_DATA_HOME"] = str(Path.home() / ".local/share")
        clean_env["XDG_CACHE_HOME"] = str(Path.home() / ".cache")
        clean_env.setdefault("WAYLAND_DISPLAY", "wayland-0")
        clean_env.setdefault("XDG_CURRENT_DESKTOP", "KDE")
        clean_env["XDG_SESSION_TYPE"] = "wayland"
        with open(LOG_FILE, "ab") as lf:
            subprocess.Popen(
                [str(WFINFO_BIN)],
                cwd=str(WFINFO_DIR),
                stdout=lf, stderr=subprocess.STDOUT,
                start_new_session=True,
                env=clean_env,
            )
        log("orbiter started")
    except Exception as e:
        log(f"failed to start orbiter: {e}")

def main():
    log("=== watcher started ===")
    last_pid = None
    pending_restart_at = None

    while True:
        current = get_warframe_pid()
        if current != last_pid:
            if current is not None:
                if last_pid is None:
                    log(f"Warframe started (PID {current})")
                else:
                    log(f"Warframe restarted ({last_pid} -> {current})")
                pending_restart_at = time.time() + WAIT_BEFORE_RESTART
            else:
                log(f"Warframe closed (was PID {last_pid})")
                pending_restart_at = None
            last_pid = current

        if pending_restart_at and time.time() >= pending_restart_at:
            restart_wfinfo()
            pending_restart_at = None

        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()