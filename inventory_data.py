"""inventory_data.py — single shared source of truth for inventory-derived
data (item ownership, equipment mastery, relic/part indices) used by the
Missing Parts, Set Progress, and Inventory equipment tabs.

Before this module existed, each of those tabs independently loaded its
own copy of the same underlying files (inventory.json, filtered_items.json,
owned_items.json, equipment_status.json, ...) inside its own __init__,
with no way to refresh it short of restarting the whole app - clicking
"Refresh Data" updated the files on disk but never reached the
already-built tab widgets. Worse, missing-parts.py's Set Progress tab
independently *recomputed* weapon mastery from raw inventory.json + WFCD
XP data instead of reading equipment_status.json's already-correct
`mastered` flags (built once, canonically, by populate_equipment.py) -
the two could silently disagree. Jacob 2026-08-05, comparing to how
Cephalon Kronos avoids this whole bug class: Kronos routes all inventory
data through one shared React context that every view reads live, so
there's no such thing as a screen with a stale private copy. Qt widgets
aren't reactive the way React components are, so callers here still need
to explicitly rebuild their own visible rows after reload() runs - but
the underlying DATA is now loaded and derived in exactly one place, so
two tabs can no longer disagree about whether something is owned.
"""

import json
from pathlib import Path

from paths import DATA_DIR, WFINFO_DIR, get_inventory_path

ITEMS_FILE = WFINFO_DIR / "filtered_items.json"
OWNED_FILE = WFINFO_DIR / "owned_items.json"
CRAFTED_FILE = DATA_DIR / "crafted-before.json"
PRICES_FILE = WFINFO_DIR / "prices.json"
OWNED_RELICS_FILE = WFINFO_DIR / "owned_relics.json"
EQUIPMENT_FILE = DATA_DIR / "equipment_status.json"
INVENTORY_FILE = get_inventory_path()

ERAS = ["Lith", "Meso", "Neo", "Axi", "Vanguard"]
RARITY_FIELDS = {
    "rare1": "Rare",
    "uncommon1": "Uncommon", "uncommon2": "Uncommon",
    "common1": "Common", "common2": "Common", "common3": "Common",
}


def _load_json(path: Path, default):
    try:
        return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return default


class _InventoryData:
    def __init__(self):
        self.items_data = {}
        self.owned = {}
        self.crafted = set()
        self.prices = {}
        self.owned_relics = {}
        self.equipment_status = {}
        self.auto_crafted = {}
        self.part_to_relics = {}
        self.part_to_eq = {}
        self.part_ducats = {}
        self.eq_info = {}
        self.loaded = False

    def reload(self):
        """Re-read every source file fresh from disk and recompute every
        derived index. Cheap enough to call on every "Refresh Data" click
        and every tab's _load_data() - the files involved are small JSON,
        not the ~50MB WFCD cache (which populate_equipment.py/
        populate_owned.py already parsed once to produce the files read
        here)."""
        self.items_data = _load_json(ITEMS_FILE, {})
        self.owned = _load_json(OWNED_FILE, {})
        self.crafted = set(_load_json(CRAFTED_FILE, []))
        self.owned_relics = _load_json(OWNED_RELICS_FILE, {})
        self.equipment_status = _load_json(EQUIPMENT_FILE, {})

        self.prices = {}
        for it in _load_json(PRICES_FILE, []):
            if isinstance(it, dict) and "name" in it:
                try:
                    self.prices[it["name"]] = float(it.get("custom_avg") or 0)
                except (TypeError, ValueError):
                    self.prices[it["name"]] = 0.0

        self._build_indices()
        self.auto_crafted = self._compute_auto_crafted()
        self.loaded = True

    def _build_indices(self):
        part_to_relics = {}
        for era in ERAS:
            era_data = self.items_data.get("relics", {}).get(era, {})
            for rname, relic in era_data.items():
                vaulted = bool(relic.get("vaulted", False))
                for field, rarity in RARITY_FIELDS.items():
                    p = relic.get(field)
                    if p:
                        part_to_relics.setdefault(p, []).append((era, rname, rarity, vaulted))
        part_to_eq = {}
        part_ducats = {}
        eq_info = {}
        for eq_name, eq in self.items_data.get("eqmt", {}).items():
            eq_info[eq_name] = {"type": eq.get("type", "?"), "vaulted": bool(eq.get("vaulted", False))}
            for pname, pdata in eq.get("parts", {}).items():
                part_to_eq[pname] = eq_name
                part_ducats[pname] = pdata.get("ducats", 0) if isinstance(pdata, dict) else 0
        self.part_to_relics = part_to_relics
        self.part_to_eq = part_to_eq
        self.part_ducats = part_ducats
        self.eq_info = eq_info

    def _compute_auto_crafted(self):
        """Any part belonging to an equipment set whose parent item is
        already fully mastered - per equipment_status.json, the single
        canonical mastery source populate_equipment.py already computed -
        counts as satisfied even though Warframe consumes the raw parts on
        crafting and they no longer appear anywhere in inventory.json.
        Reads the already-computed `mastered` flag instead of
        re-deriving mastery from raw inventory.json + WFCD XP data a
        second time, which is what this used to do (independently, inside
        missing-parts.py) and could silently disagree with
        equipment_status.json's own answer for the same weapon."""
        mastered_names = set()
        for tab_items in self.equipment_status.values():
            if not isinstance(tab_items, list):
                continue
            for it in tab_items:
                if isinstance(it, dict) and it.get("mastered") and "Prime" in it.get("name", ""):
                    mastered_names.add(it["name"])

        eqmt = self.items_data.get("eqmt", {})
        auto = {}
        for eq_name in mastered_names:
            eq = eqmt.get(eq_name)
            if not eq:
                continue
            for pname in eq.get("parts", {}).keys():
                auto[pname] = eq_name
                if not pname.endswith(" Blueprint"):
                    auto[pname + " Blueprint"] = eq_name
        return auto


DATA = _InventoryData()


def reload():
    DATA.reload()
    return DATA
