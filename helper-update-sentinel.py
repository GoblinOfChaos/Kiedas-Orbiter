#!/usr/bin/env python3
"""
helper-update-sentinel.py - Watches glowseeker/cephalon-kronos for upstream
commits. Sends a desktop notification when a fix lands so you know to click
'Rebuild Helper' in the control panel.
"""
import subprocess
import time
from pathlib import Path
from paths import DATA_DIR

HELPER_SRC = Path.home() / "helper-src"
STATE_FILE = DATA_DIR / "helper-sentinel.state"
LOG_FILE   = DATA_DIR / "helper-sentinel.log"
ICON       = str(Path.home() / ".local/share/icons/hicolor/scalable/apps/orbiter.svg")

CHECK_INTERVAL = 6 * 3600    # every 6 hours
BRANCH = "senpai"

def log(msg):
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(f"[{ts}] {msg}\n")

def run_git(*args, timeout=30):
    try:
        r = subprocess.run(
            ["git", *args], cwd=HELPER_SRC,
            capture_output=True, text=True, timeout=timeout,
        )
        return r.returncode == 0, r.stdout.strip(), r.stderr.strip()
    except Exception as e:
        return False, "", str(e)

def notify(title, body):
    try:
        subprocess.run(
            ["notify-send", "-i", ICON, "-u", "normal", "-t", "60000", title, body],
            timeout=5,
        )
        log(f"Notified: {title}")
    except Exception as e:
        log(f"notify-send failed: {e}")

def main():
    log("=== sentinel started ===")
    if not HELPER_SRC.exists():
        log(f"helper-src not found at {HELPER_SRC} — exiting")
        return
    while True:
        try:
            ok, _, err = run_git("fetch", "origin", BRANCH)
            if not ok:
                log(f"fetch failed: {err}")
            else:
                _, upstream, _ = run_git("rev-parse", f"origin/{BRANCH}")
                _, local, _    = run_git("rev-parse", "HEAD")
                last_notified  = STATE_FILE.read_text().strip() if STATE_FILE.exists() else ""

                if upstream and local and upstream != local and upstream != last_notified:
                    _, commits, _ = run_git("log", f"{local}..{upstream}", "--oneline")
                    short_commits = commits[:300] if len(commits) > 300 else commits
                    body = ("Sainan pushed new commits to warframe-api-helper:\n\n"
                            + short_commits +
                            "\n\nOpen Wfinfo Control and click 'Rebuild Helper' to apply.")
                    notify("Helper update available", body)
                    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
                    STATE_FILE.write_text(upstream)
                    log(f"Notified: local={local[:8]} -> upstream={upstream[:8]}")
                else:
                    log(f"No new commits (local={local[:8] if local else '?'}, upstream={upstream[:8] if upstream else '?'})")
        except Exception as e:
            log(f"loop error: {e}")
        time.sleep(CHECK_INTERVAL)

if __name__ == "__main__":
    main()