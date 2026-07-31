import pytest

from mastery import affinity_to_rank, is_mastered, max_affinity


@pytest.mark.parametrize(
    "xp, unique_name, item_type, expected_rank, expected_mastered",
    [
        (405_000, "/Lotus/Weapons/Test", "Primary", 28, False),
        (450_000, "/Lotus/Weapons/Test", "Primary", 30, True),
        (810_000, "/Lotus/Powersuits/Test", "Warframe", 28, False),
        (900_000, "/Lotus/Powersuits/Test", "Warframe", 30, True),
        (450_000, "/Lotus/Weapons/KuvaTest", "Primary", 30, False),
        (800_000, "/Lotus/Weapons/KuvaTest", "Primary", 40, True),
        (900_000, "/Lotus/Powersuits/EntratiMech/Test", "Necramech", 30, False),
        (1_600_000, "/Lotus/Powersuits/EntratiMech/Test", "Necramech", 40, True),
    ],
)
def test_mastery_boundaries(
    xp, unique_name, item_type, expected_rank, expected_mastered
):
    assert affinity_to_rank(xp, unique_name, item_type) == expected_rank
    assert is_mastered(xp, unique_name, item_type) is expected_mastered


def test_wfcd_max_level_metadata_overrides_name_fallback():
    assert max_affinity("/Lotus/Weapons/Ordinary", "Primary", 40) == 800_000
    assert max_affinity("/Lotus/Weapons/KuvaTest", "Primary", 30) == 450_000
    assert is_mastered(450_000, "/Lotus/Weapons/KuvaTest", "Primary", 30)


def test_max_affinity_uses_item_class_and_rank_limit():
    assert max_affinity("/Lotus/Weapons/Test", "Primary") == 450_000
    assert max_affinity("/Lotus/Powersuits/Test", "Warframe") == 900_000
    assert max_affinity("/Lotus/Weapons/KuvaTest", "Primary") == 800_000
    assert max_affinity("/Lotus/Powersuits/Mech", "Necramech") == 1_600_000
