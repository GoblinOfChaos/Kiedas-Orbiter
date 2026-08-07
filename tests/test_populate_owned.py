import populate_owned as po

PARENT_UNIQUE = "/Lotus/Weapons/Tenno/Melee/Swords/PrimeMasseter/PrimeMasseter"
MAX_MELEE_XP = 30 * 30 * 500  # rank 30 cap * 500 affinity base, non-heavy type

WFCD_ITEMS = [
    {
        "name": "Masseter Prime",
        "uniqueName": PARENT_UNIQUE,
        "type": "Melee",
        "components": [
            {"name": "Blade", "uniqueName": "/Lotus/.../MasseterPrimeBlade"},
            {"name": "Handle", "uniqueName": "/Lotus/.../MasseterPrimeHandle"},
            {"name": "Blueprint", "uniqueName": "/Lotus/.../MasseterPrimeBlueprint"},
        ],
    }
]

DROP_NAMES = {"Masseter Prime Blade", "Masseter Prime Handle", "Masseter Prime Blueprint"}


def test_mastered_weapon_parts_are_not_reported_as_need():
    """Confirmed live 2026-08-06: Masseter Prime Blade showed as NEED in the
    reward overlay despite the weapon being fully mastered, because its
    component parts had already been consumed by crafting (loose count 0)
    and extract_owned() only ever looked at current loose part counts."""
    inventory = {
        "XPInfo": [{"ItemType": PARENT_UNIQUE, "XP": MAX_MELEE_XP}],
        "MiscItems": [], "Recipes": [], "Consumables": [],
    }

    dropname_to_parent = po.build_dropname_to_parent(WFCD_ITEMS, DROP_NAMES)
    mastered = po.find_mastered_parents(inventory, dropname_to_parent)
    assert mastered == DROP_NAMES

    owned = po.extract_owned(inventory, {}, DROP_NAMES, mastered)
    assert all(owned[name] >= 1 for name in DROP_NAMES)


def test_unmastered_weapon_parts_still_report_real_zero_counts():
    inventory = {
        "XPInfo": [{"ItemType": PARENT_UNIQUE, "XP": 0}],
        "MiscItems": [], "Recipes": [], "Consumables": [],
    }

    dropname_to_parent = po.build_dropname_to_parent(WFCD_ITEMS, DROP_NAMES)
    mastered = po.find_mastered_parents(inventory, dropname_to_parent)
    assert mastered == set()

    owned = po.extract_owned(inventory, {}, DROP_NAMES, mastered)
    assert all(owned[name] == 0 for name in DROP_NAMES)


def test_partially_mastered_still_counts_real_loose_parts():
    """A part actually held in inventory should keep its real count even
    when the mastered-parent override applies (max, not overwrite)."""
    inventory = {
        "XPInfo": [{"ItemType": PARENT_UNIQUE, "XP": MAX_MELEE_XP}],
        "MiscItems": [
            {"ItemType": "/Lotus/.../MasseterPrimeBlade", "ItemCount": 3},
        ],
        "Recipes": [], "Consumables": [],
    }
    path_to_dropname = {"/Lotus/.../MasseterPrimeBlade": ["Masseter Prime Blade"]}

    dropname_to_parent = po.build_dropname_to_parent(WFCD_ITEMS, DROP_NAMES)
    mastered = po.find_mastered_parents(inventory, dropname_to_parent)

    owned = po.extract_owned(inventory, path_to_dropname, DROP_NAMES, mastered)
    assert owned["Masseter Prime Blade"] == 3
