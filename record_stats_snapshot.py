#!/usr/bin/env python3
"""
record_stats_snapshot.py - append a stats snapshot to stats_history.json.

Called automatically by orbiter-refresh.sh after each data refresh.
Tracks: credits, plat, MR, owned prime parts count, owned prime sets count.
"""

import json
import time
from pathlib import Path
from paths import DATA_DIR

WFINFO_DIR = Path(__file__).parent
INVENTORY_FILE = WFINFO_DIR / "inventory.json"
OWNED_ITEMS_FILE = WFINFO_DIR / "owned_items.json"
HISTORY_FILE = DATA_DIR / "stats_history.json"

MAX_SNAPSHOTS = 2000  # keep ~6 months at 5-minute intervals


def load_json(path, default):
    try:
        return json.loads(Path(path).read_text())
    except Exception:
        return default


def count_prime_sets(owned: dict) -> int:
    """Count how many complete prime sets you have (every part owned >= 1)."""
    # Group parts by set name (strip trailing "Blueprint", " Neuroptics", etc.)
    import re
    set_parts: dict[str, list[int]] = {}
    suffix_re = re.compile(
        r"\s+(Blueprint|Neuroptics|Chassis|Systems|Harness|Wings|Carapace|Cerebrum|Blade|Guard|Hilt|Barrel|Receiver|Stock|Link|Handle|Gauntlet|Head|Motor|Ornament|Set)$",
        re.IGNORECASE,
    )
    for part, count in owned.items():
        # Only prime parts
        if "Prime" not in part:
            continue
        set_name = suffix_re.sub("", part).strip()
        set_parts.setdefault(set_name, []).append(count)

    complete = 0
    for parts in set_parts.values():
        if len(parts) >= 2 and all(c >= 1 for c in parts):
            complete += 1
    return complete


def main():
    inv = load_json(INVENTORY_FILE, {})
    owned = load_json(OWNED_ITEMS_FILE, {})

    credits = inv.get("RegularCredits", 0)
    plat = inv.get("PremiumCredits", 0)
    mr = inv.get("PlayerLevel", 0)
    owned_parts = sum(1 for v in owned.values() if v and int(v) >= 1)
    total_parts = len(owned)
    owned_sets = count_prime_sets(owned)

    snapshot = {
        "ts": int(time.time()),
        "credits": credits,
        "plat": plat,
        "mr": mr,
        "owned_parts": owned_parts,
        "total_parts": total_parts,
        "owned_sets": owned_sets,
    }

    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    history = load_json(HISTORY_FILE, [])
    if not isinstance(history, list):
        history = []

    # Deduplicate: skip if last snapshot has identical values (no activity)
    if history:
        last = history[-1]
        if all(last.get(k) == snapshot[k] for k in ("credits", "plat", "mr", "owned_parts")):
            print("No change since last snapshot, skipping.")
            return

    history.append(snapshot)
    if len(history) > MAX_SNAPSHOTS:
        history = history[-MAX_SNAPSHOTS:]

    HISTORY_FILE.write_text(json.dumps(history, indent=2))
    print(f"Snapshot saved: credits={credits:,} plat={plat} MR={mr} "
          f"parts={owned_parts}/{total_parts} sets={owned_sets}")


if __name__ == "__main__":
    main()