#!/usr/bin/env python3
"""
relic_recommend_watcher.py - watches EE.log for the relic-selection screen
(Navigation console, before a Void Fissure mission) and writes a ranked list
of your OWNED relics (by expected plat value for your NEED list), grouped
into one column per era (Lith/Meso/Neo/Axi), to a state file that
overlay.py's RelicRecommendOverlay reads. Hides again once you confirm a
relic pick.

Trigger lines (found empirically in EE.log):
- Open:  "ThemedProjectionManager.lua: PopulateInventoryGrid"
- Close: "Dialog::CreateOkCancel(description=Are you sure you want to equip"

Why grouped by era instead of filtered to one: tried multiple mission-tier
detection approaches (a "Cached mission name=...Fissure" line, then a
"Resloader ... Projections ... T1/T2/T3/T4 ..." line borrowed from
glowseeker/cephalon-kronos) and confirmed live 2026-07-21, via real
testing, that Warframe's client simply doesn't reveal which tier a
mission/relic-pick needs anywhere in EE.log (or the equivalent in-memory
ring buffer) until *after* you've already picked a relic and are loading
into the mission - too late to filter a "which relic should I bring"
list. Rather than keep chasing an earlier signal that doesn't exist,
Jacob's own suggestion was to show all four eras side by side instead of
trying to pre-filter to one - sidesteps the detection problem entirely.
"""
import glob
import json
import time
import traceback
from pathlib import Path

from paths import DATA_DIR, WFINFO_DIR
from platform_utils import get_pid
import warframe_mem_log
STATE_FILE = DATA_DIR / "relic-recommend.json"
LOG_FILE = DATA_DIR / "relic-recommend-watcher.log"
CRAFTED_PARTS_FILE = DATA_DIR / "crafted_parts.json"

# EE.log path resolved via paths.py (reads config.json override or auto-detects)
def _get_ee_log_path():
    try:
        from paths import get_ee_log_path
        return str(get_ee_log_path() or "")
    except Exception:
        return str(
            Path.home() / ".local/share/Steam/steamapps/compatdata/230410/pfx"
            "/drive_c/users/steamuser/AppData/Local/Warframe/EE.log"
        )

OPEN_MARKER = "ThemedProjectionManager.lua: PopulateInventoryGrid"
CLOSE_MARKER = "Dialog::CreateOkCancel(description=Are you sure you want to equip"
# Fires when backing out of the ship's relic-refinement menu WITHOUT
# confirming a relic - CLOSE_MARKER alone only catches the "confirmed a
# pick" case, so cancelling out left the overlay stuck open indefinitely.
# Found in cephalon-kronos's log_scanner.rs (their fix: "relic picker
# overlay not closing from orbiter relic menu" - CLOSE_MARKER's dialog only
# fires in-mission; backing out of the ship menu returns to
# TennoShipInputFilter instead). Guarded by picker_open since this string
# also appears during normal ship navigation unrelated to the picker.
CANCEL_MARKER = "TennoShipInputFilter"
# Unconditional safety net: fires on ANY level-load transition (mission
# launch, mission-to-ship, hub-to-hub, etc). Found 2026-07-27 after the
# overlay stayed up for a whole mission - re-selecting the relic you
# already had equipped (no actual swap) skips CLOSE_MARKER's "Are you sure
# you want to equip" dialog entirely, since Warframe has nothing to
# confirm. That left picker_open stuck True with no CLOSE/CANCEL line ever
# coming, so relic_recommend_watcher.py's own 20s "still open" refresh kept
# the overlay alive for the rest of the mission. A level load is a hard
# guarantee the picker screen is gone no matter what state we thought we
# were in, so treat it as an unconditional force-close.
LOAD_MARKER = "EnterState: Loading"
# Fires for Warframe's Defense wave-continue/extract countdown screen -
# confirmed live 2026-08-06 directly against EE.log: that screen is built
# on the same generic ThemedProjectionManager UI framework as the real
# relic-selection screen and triggers the exact same OPEN_MARKER line
# (PopulateInventoryGrid), with no equip-confirm dialog ever following it
# since it isn't a relic screen at all. That left the overlay stuck
# visible through several subsequent Defense rounds with no CLOSE_MARKER/
# CANCEL_MARKER/LOAD_MARKER ever firing to correct it (the player never
# left the mission, so no level load happened either). This line is
# unique to the countdown screen and never appears near a genuine relic
# pick, so treat it as an unconditional force-close like LOAD_MARKER.
PROJECTION_COUNTDOWN_MARKER = "ProjectionsCountdown.lua: Initialize timer"

POLL_INTERVAL = 1.0

INTACT_CHANCES = {"Rare": 0.0203, "Uncommon": 0.1100, "Common": 0.2533}
RARITY_FIELDS = {
    "rare1": "Rare",
    "uncommon1": "Uncommon", "uncommon2": "Uncommon",
    "common1": "Common", "common2": "Common", "common3": "Common",
}


def log(msg):
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(f"[{ts}] {msg}\n")


def _load_json(path, default):
    try:
        return json.loads(Path(path).read_text())
    except Exception:
        return default


def _is_crafted(part, crafted):
    if part in crafted:
        return True
    if part.endswith(" Blueprint"):
        return part[: -len(" Blueprint")] in crafted
    return (part + " Blueprint") in crafted


STANDARD_ERAS = ["Lith", "Meso", "Neo", "Axi"]


def _compute_all_relic_evs():
    """Shared by compute_recommendations() and compute_recommendations_by_era()
    - the full, unfiltered, unsorted per-relic EV computation."""
    filt = _load_json(WFINFO_DIR / "filtered_items.json", {})
    owned_parts = _load_json(WFINFO_DIR / "owned_items.json", {})
    owned_relics = _load_json(WFINFO_DIR / "owned_relics.json", {})
    prices_list = _load_json(WFINFO_DIR / "prices.json", [])
    prices = {
        p["name"]: float(p.get("custom_avg") or 0)
        for p in prices_list if isinstance(p, dict) and "name" in p
    }
    crafted = set(_load_json(CRAFTED_PARTS_FILE, []))

    results = []
    for era, relics in filt.get("relics", {}).items():
        for rname, relic in relics.items():
            owned_count = owned_relics.get(f"{era} {rname}", {}).get("owned", 0)
            if owned_count <= 0:
                continue
            ev_total = ev_need = 0.0
            need_parts = []
            for field, rarity in RARITY_FIELDS.items():
                part = relic.get(field)
                if not part:
                    continue
                cnt = owned_parts.get(part, owned_parts.get(part + " Blueprint", 0))
                cnt = cnt if isinstance(cnt, int) else 0
                plat = prices.get(part, prices.get(part + " Blueprint", 0))
                ev = INTACT_CHANCES[rarity] * plat
                ev_total += ev
                if cnt <= 0 and not _is_crafted(part, crafted):
                    ev_need += ev
                    need_parts.append(part)
            results.append({
                "era": era, "name": rname, "owned": owned_count,
                "ev_total": round(ev_total, 1), "ev_need": round(ev_need, 1),
                "need_parts": need_parts,
            })
    return results


def compute_recommendations(limit=8, tier=None):
    """Rank your OWNED relics by expected plat value for your NEED list.

    tier: restrict to a single era ("Lith"/"Meso"/"Neo"/"Axi"/...). Kept for
    the cases that do have a confirmed tier (currently unused by the
    watcher itself - see compute_recommendations_by_era, used instead
    since the mission's tier isn't knowable before you've already picked a
    relic, confirmed live 2026-07-21)."""
    results = _compute_all_relic_evs()
    if tier:
        results = [r for r in results if r["era"] == tier]
    results.sort(key=lambda r: -r["ev_need"])
    return results[:limit]


def compute_recommendations_by_era(limit_per_era=5):
    """Same ranking as compute_recommendations, but grouped into one column
    per era (Lith/Meso/Neo/Axi) instead of a single combined list - so you
    can look at whichever column matches your mission instead of needing
    the tier auto-detected (which isn't possible before you've already
    picked a relic - see module docstring)."""
    all_results = _compute_all_relic_evs()
    by_era = {era: [] for era in STANDARD_ERAS}
    for r in all_results:
        by_era.setdefault(r["era"], []).append(r)
    for era in by_era:
        by_era[era].sort(key=lambda r: -r["ev_need"])
        by_era[era] = by_era[era][:limit_per_era]
    return by_era


def find_ee_log():
    p = _get_ee_log_path()
    if p and Path(p).exists():
        return p
    return None


def _write_state(data):
    # A monotonic sequence number, not just the wall-clock "timestamp"
    # already in `data` - confirmed live 2026-07-20/21: a fast
    # open-then-cancel or open-then-confirm sequence can produce two
    # writes within the same whole second (int(time.time()) has only
    # 1-second resolution), and the overlay's poll loop used "timestamp
    # changed" as its sole signal that something new happened. When both
    # writes landed in the same second, the second one was silently
    # skipped - the overlay never even saw the "show" before it was
    # already overwritten by "hide", so it never appeared at all.
    #
    # Using nanosecond wall-clock time rather than a simple per-process
    # counter (like `_write_seq = 0; _write_seq += 1`, which this used to
    # be) - confirmed live 2026-07-21 that a plain counter collides across
    # watcher restarts: it resets to 0 every time this process restarts,
    # so if the overlay's own last-seen seq (read from whatever was
    # already in the file at ITS startup) happened to equal wherever the
    # new watcher run's counter ended up landing this time, the overlay
    # treated a completely different, fresh write as "no change" purely by
    # coincidence of both hitting the same small integer. time.time_ns()
    # never repeats across restarts, so no such collision is possible.
    data["seq"] = time.time_ns()
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(data))


def _hide_stale_state_on_startup():
    """Clear a visible picker state left behind by a previous process.

    The watcher tails EE.log from its end, so after Warframe or the watcher is
    relaunched it cannot replay the old picker-close line. Without an explicit
    reset, the GTK overlay keeps rendering the previous recommendation list
    and its periodic refresh makes it appear to pop up repeatedly.
    """
    _write_state({"visible": False, "timestamp": int(time.time())})


class _State:
    """Holds the watcher's mutable state so both the memory-reading path
    and the file-tailing fallback can share identical line-processing
    logic - added 2026-07-21 when memory-reading was introduced, factored
    out of what used to be inline code in main()'s while loop."""

    # TennoShipInputFilter (CANCEL_MARKER) fires as routine input-filter
    # housekeeping during the picker's own opening transition, not just
    # when genuinely backing out - confirmed live 2026-07-21: it fired in
    # the same second as the picker opening, hiding the overlay well under
    # a second after it appeared, even though nothing was actually
    # cancelled. Ignoring it for a short grace period right after opening
    # filters out that false positive while still catching a genuine
    # back-out once the screen has actually settled.
    CANCEL_GRACE_SECONDS = 2.0

    def __init__(self):
        self.picker_open = False
        self.picker_opened_at = 0.0
        self.last_recs = None
        self.last_refresh = 0.0

    def process_line(self, line):
        if OPEN_MARKER in line:
            log("relic selection screen opened")
            self.picker_open = True
            self.picker_opened_at = time.time()
            self.last_recs = compute_recommendations_by_era()
            self.last_refresh = time.time()
            _write_state({
                "visible": True,
                "timestamp": int(self.last_refresh),
                "relics_by_era": self.last_recs,
            })
        elif CLOSE_MARKER in line:
            log("relic confirmed, hiding overlay")
            self.picker_open = False
            self.last_recs = None
            _write_state({"visible": False, "timestamp": int(time.time())})
        elif (
            self.picker_open
            and CANCEL_MARKER in line
            and time.time() - self.picker_opened_at >= self.CANCEL_GRACE_SECONDS
        ):
            log("relic picker cancelled/backed out, hiding overlay")
            self.picker_open = False
            self.last_recs = None
            _write_state({"visible": False, "timestamp": int(time.time())})
        elif self.picker_open and LOAD_MARKER in line:
            log("level load started, force-hiding relic overlay (safety net)")
            self.picker_open = False
            self.last_recs = None
            _write_state({"visible": False, "timestamp": int(time.time())})
        elif self.picker_open and PROJECTION_COUNTDOWN_MARKER in line:
            log(
                "Defense continue/extract countdown detected; "
                "force-hiding relic overlay (false-trigger safety net)"
            )
            self.picker_open = False
            self.last_recs = None
            _write_state({"visible": False, "timestamp": int(time.time())})

    def maybe_refresh(self):
        # The overlay's own auto-hide timer (its "safety net" in case this
        # watcher crashes) is purely local to overlay_gtk.py - it doesn't
        # know whether the picker screen is still genuinely open in-game.
        # Confirmed live 2026-07-20: if the overlay times out but you
        # never actually left and reopened the picker (no fresh trigger
        # line to react to), the state file's timestamp goes stale and the
        # overlay just never comes back, even though you're still sitting
        # on that screen. Rewriting the same state with a fresh timestamp
        # periodically while the picker is still open keeps it alive
        # without needing a new trigger.
        REFRESH_INTERVAL = 20.0
        if self.picker_open and self.last_recs is not None and time.time() - self.last_refresh >= REFRESH_INTERVAL:
            self.last_refresh = time.time()
            _write_state({
                "visible": True,
                "timestamp": int(self.last_refresh),
                "relics_by_era": self.last_recs,
            })


def main():
    log("=== relic recommend watcher started ===")
    ee_log_path = find_ee_log()
    if not ee_log_path:
        log("ERROR: EE.log not found")
        return

    state = _State()
    _hide_stale_state_on_startup()

    # Memory-reading (reads Warframe's in-RAM log ring buffer directly,
    # sidestepping the disk-write lag that file-tailing is exposed to -
    # see warframe_mem_log.py's module docstring) is tried every cycle
    # while a PID is found. Falls back to file-tailing whenever it's
    # unavailable (no PID, discovery hasn't succeeded yet, non-Linux) so
    # this never gets stuck if memory reading can't hook in for some
    # reason - added 2026-07-21 after Jacob measured a real 16-second gap
    # between visually reaching the picker screen and file-tailing ever
    # seeing the trigger line.
    mem_reader = warframe_mem_log.MemLogReader()
    mem_hooked_logged = False
    mem_last_error_logged = None

    f = open(ee_log_path, "r", errors="ignore")
    f.seek(0, 2)  # start at end - only react to new lines from here on

    # Warns if a single step takes unexpectedly long - cheap safety net
    # kept from tracking down a real freeze earlier (2026-07-21); the
    # per-tick heartbeat and per-call timing used to diagnose that is
    # gone now that it's fixed, but a lightweight slow-step warning is
    # worth keeping in case something regresses.
    SLOW_STEP_THRESHOLD = 2.0

    while True:
        try:
            t0 = time.monotonic()
            pid = get_pid("Warframe.x64.exe") or get_pid("Warframe.exe")
            mem_lines = mem_reader.poll(pid) if pid else None
            dt = time.monotonic() - t0
            if dt > SLOW_STEP_THRESHOLD:
                log(f"warning: pid/memory-read cycle took {dt:.1f}s (last_error={mem_reader.last_error})")

            if mem_lines is not None:
                if not mem_hooked_logged:
                    log("memory-reading hooked - no longer relying on file-tailing")
                    mem_hooked_logged = True
                for line in mem_lines:
                    state.process_line(line)
                state.maybe_refresh()
                time.sleep(POLL_INTERVAL)
                continue
            else:
                if mem_hooked_logged:
                    log("memory-reading lost hook, falling back to file-tailing")
                    mem_hooked_logged = False
                # Only log a given error message once (not every poll) -
                # still gives real diagnostic info if memory-reading never
                # manages to hook in, without spamming the log every second.
                if pid and mem_reader.last_error and mem_reader.last_error != mem_last_error_logged:
                    log(f"memory-reading not available yet: {mem_reader.last_error}")
                    mem_last_error_logged = mem_reader.last_error

            # Fallback: file-tailing.
            line = f.readline()
            if not line:
                try:
                    cur_size = Path(ee_log_path).stat().st_size
                except OSError:
                    cur_size = 0
                if cur_size < f.tell():
                    log("EE.log truncated/rotated, reopening")
                    f.close()
                    f = open(ee_log_path, "r", errors="ignore")
                state.maybe_refresh()
                time.sleep(POLL_INTERVAL)
                continue

            state.process_line(line)
        except Exception as e:
            # An unhandled error here (bad EE.log encoding, a corrupted
            # owned/prices file compute_recommendations() didn't expect,
            # etc.) would otherwise kill this loop silently forever.
            log(f"watcher loop error: {e}\n{traceback.format_exc()}")
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
