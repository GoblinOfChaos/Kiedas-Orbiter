#!/usr/bin/env python3
"""
record_stats_snapshot.py - append a stats snapshot to stats_history.json.

Called automatically by orbiter-refresh.sh after each data refresh.
Tracks: credits, plat, MR, owned prime parts count, owned prime sets count.
"""

import json
import time
from pathlib import Path
from paths import DATA_DIR, get_inventory_path

WFINFO_DIR = Path(__file__).parent
INVENTORY_FILE = get_inventory_path()
OWNED_ITEMS_FILE = WFINFO_DIR / "owned_items.json"
HISTORY_FILE = DATA_DIR / "stats_history.json"

MAX_SNAPSHOTS = 2000  # keep ~6 months at 5-minute intervals


def load_json(path, default):
    try:
        return json.loads(Path(path).read_text())
    except Exception:
        return default


def count_prime_sets(owned: dict, wfcd_items=None) -> int:
    """Count craftable Prime sets using WFCD recipe component quantities."""
    if wfcd_items is None:
        wfcd_items = load_json(WFINFO_DIR / "wfcd_all_cache.json", [])

    complete = 0
    for item in wfcd_items:
        if not isinstance(item, dict):
            continue
        name = item.get("name", "")
        components = item.get("components") or []
        if "Prime" not in name or not components:
            continue

        required_parts = []
        for component in components:
            component_name = component.get("name", "")
            if not component_name or component_name in ("Orokin Cell", "Forma"):
                continue
            required = max(1, int(component.get("itemCount", 1) or 1))
            required_parts.append((f"{name} {component_name}", required))

        if (len(required_parts) >= 2
                and all(int(owned.get(part, 0) or 0) >= required
                        for part, required in required_parts)):
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
