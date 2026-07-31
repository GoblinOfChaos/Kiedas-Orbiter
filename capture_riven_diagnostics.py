#!/usr/bin/env python3
"""Capture a timestamped bundle while performing a live Riven reroll."""

import argparse
import json
import platform
import shutil
import time
from datetime import datetime
from pathlib import Path

from paths import DATA_DIR


SCREEN_FILE = DATA_DIR / "riven-screen.json"
STATE_FILES = (
    DATA_DIR / "riven-graded.json",
    DATA_DIR / "riven-graded-prev.json",
)
LOG_FILES = (
    DATA_DIR / "orbiter.log",
    DATA_DIR / "riven-overlay.log",
    DATA_DIR / "riven-grader-watcher.log",
)


def _read_json(path):
    try:
        return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return None


def _copy_if_present(path, destination):
    if path.exists():
        shutil.copy2(path, destination / path.name)


def _copy_log_delta(path, start_offset, destination):
    try:
        current_size = path.stat().st_size
        offset = start_offset if current_size >= start_offset else 0
        with path.open("rb") as source:
            source.seek(offset)
            data = source.read()
        (destination / f"{path.stem}-during-capture.log").write_bytes(data)
    except OSError:
        pass


def capture(duration, output_root):
    stamp = datetime.now().astimezone().strftime("%Y%m%d-%H%M%S-%z")
    destination = output_root / stamp
    destination.mkdir(parents=True, exist_ok=False)
    events_path = destination / "riven-screen-events.jsonl"
    started = time.time()
    last_written_at = object()
    event_count = 0
    log_offsets = {
        path: path.stat().st_size if path.exists() else 0 for path in LOG_FILES
    }

    metadata = {
        "started_at": datetime.now().astimezone().isoformat(),
        "duration_requested_seconds": duration,
        "data_dir": str(DATA_DIR),
        "platform": platform.platform(),
        "python": platform.python_version(),
    }
    (destination / "capture-metadata.json").write_text(
        json.dumps(metadata, indent=2) + "\n"
    )

    print(f"Capturing Riven diagnostics for up to {duration:.0f}s")
    print("Perform the CYCLE FOR and CONFIRM steps now; press Ctrl+C when finished.")
    try:
        with events_path.open("w", encoding="utf-8") as events:
            while time.time() - started < duration:
                state = _read_json(SCREEN_FILE)
                if state is not None:
                    signature = state.get("written_at_ms")
                    if signature != last_written_at:
                        record = {
                            "observed_at": datetime.now().astimezone().isoformat(),
                            "observed_monotonic_ms": round(
                                (time.time() - started) * 1000
                            ),
                            "state": state,
                        }
                        events.write(json.dumps(record, sort_keys=True) + "\n")
                        events.flush()
                        last_written_at = signature
                        event_count += 1
                        print(
                            f"[{record['observed_monotonic_ms']:>6} ms] "
                            f"visible={state.get('visible')} mode={state.get('mode')} "
                            f"stable={state.get('stable')} variant={state.get('variant', '')!r}"
                        )
                time.sleep(0.1)
    except KeyboardInterrupt:
        print("Capture stopped by user; finalizing bundle.")

    for path in STATE_FILES + (SCREEN_FILE,):
        _copy_if_present(path, destination)
    for path, offset in log_offsets.items():
        _copy_log_delta(path, offset, destination)

    metadata.update({
        "finished_at": datetime.now().astimezone().isoformat(),
        "elapsed_seconds": round(time.time() - started, 3),
        "screen_event_count": event_count,
    })
    (destination / "capture-metadata.json").write_text(
        json.dumps(metadata, indent=2) + "\n"
    )
    print(f"Saved {event_count} state transition(s) to: {destination}")
    return destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--duration", type=float, default=300,
        help="maximum capture duration in seconds (default: 300)",
    )
    parser.add_argument(
        "--output", type=Path, default=DATA_DIR / "riven-diagnostics",
        help="directory under which to create the timestamped bundle",
    )
    args = parser.parse_args()
    if args.duration <= 0:
        parser.error("--duration must be greater than zero")
    capture(args.duration, args.output)


if __name__ == "__main__":
    main()
