"""Shared helper for counting owned mods/arcanes from inventory.json.

Warframe's inventory stores owned upgrade-type items (mods and arcanes)
in two different places:
- RawUpgrades: stackable copies, as {ItemType, ItemCount}. This is where
  unranked/spare/unequipped copies live.
- Upgrades: individual ranked instances, as {ItemType, UpgradeFingerprint,
  ItemId} - one entry per physical copy, no count field. This is where a
  copy goes once it's been ranked up (fused) or equipped - e.g. a
  max-rank ("lvl":5 for arcanes, "lvl":10 for most mods) arcane slotted
  onto a Warframe lives ONLY here, not in RawUpgrades. Confirmed live
  2026-08-01: a fully-ranked owned "Arcane Avenger" showed as 0 owned
  because only RawUpgrades was being read.

Total owned count for an ItemType is the sum across both lists.
"""


def count_owned_upgrades(inventory: dict) -> dict:
    owned = {}
    for u in inventory.get('RawUpgrades', []):
        if isinstance(u, dict) and u.get('ItemType'):
            owned[u['ItemType']] = owned.get(u['ItemType'], 0) + u.get('ItemCount', 0)
    for u in inventory.get('Upgrades', []):
        if isinstance(u, dict) and u.get('ItemType'):
            owned[u['ItemType']] = owned.get(u['ItemType'], 0) + 1
    return owned
