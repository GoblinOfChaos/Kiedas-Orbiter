import riven_grader_watcher as grader
import json


def test_perfectness_matches_browse_wf_riven_integer_scale():
    assert grader._roll_perfectness(0) == 0.0
    assert grader._roll_perfectness(0x1FFFFFFF) == 50.0
    assert grader._roll_perfectness(0x3FFFFFFF) == 100.0
    assert grader._roll_perfectness(0x40000000) == 0.0


def test_curse_perfectness_uses_browse_wf_inverse_scale():
    assert grader._curse_perfectness(0) == 100.0
    assert grader._curse_perfectness(0x1FFFFFFF) == 50.0
    assert grader._curse_perfectness(0x3FFFFFFF) == 0.0
    assert grader._curse_perfectness(0x40000000) == 0.0


def test_semantically_unrelated_tags_are_not_reduced_to_good_roll_codes():
    for tag in (
        "ComboDurationMod",
        "WeaponMeleeComboBonusOnHitMod",
        "WeaponLifestealMod",
        "WeaponFactionDamageCorrupted",
    ):
        assert tag not in grader.TAG_MAP


def test_god_roll_uses_browse_wf_s_grade_boundary():
    data = {
        "profile_metadata": {
            "status": "historical_seed",
            "source": "test historical profile",
            "reviewed_at": None,
        },
        "categories": {
            "test": {
                "example": {
                    "good_combos": [
                        {"mandatory": ["CC"], "pick_from": ["CD"], "pick_n": 1}
                    ],
                    "safe_negatives": [],
                }
            }
        }
    }
    below = grader._grade_riven("example", ["CC", "CD"], [], data, 97.4)
    at = grader._grade_riven("example", ["CC", "CD"], [], data, 97.5)
    assert "GOD ROLL" not in below["label"]
    assert at["label"] == "ADVISORY · ★ GOD ROLL (S)"
    assert at["guidance_status"] == "historical_seed"
    assert at["profile_source"] == "test historical profile"
    assert "Matched 1/1 required stats" in at["explanation"]


def test_missing_weapon_returns_review_without_desirability_verdict():
    data = {
        "profile_metadata": {
            "status": "historical_seed",
            "source": "test historical profile",
            "reviewed_at": None,
        },
        "categories": {},
    }

    result = grader._grade_riven("new weapon", ["CC", "CD"], [], data, 100.0)

    assert result["grade"] == "review"
    assert result["label"] == "REVIEW — no weapon profile"
    assert "no desirability verdict" in result["explanation"]
    assert result["profile_source"] == "test historical profile"


def test_bundled_profiles_declare_historical_provenance():
    data = grader._load_json(grader.RIVEN_DATA_FILE, {})
    metadata = data["profile_metadata"]

    assert metadata["schema_version"] == 1
    assert metadata["status"] == "historical_seed"
    assert metadata["reviewed_at"] is None
    assert "spreadsheet" in metadata["source"].lower()


def test_player_profile_overrides_one_weapon_and_is_authoritative(tmp_path):
    override = tmp_path / "riven_profiles.json"
    override.write_text(json.dumps({
        "profile_metadata": {
            "schema_version": 1,
            "source": "My test build",
            "reviewed_at": "2026-07-25",
        },
        "categories": {
            "primary": {
                "acceltra": {
                    "good_combos": [
                        {"mandatory": ["TOX"], "pick_from": [], "pick_n": 0}
                    ],
                    "safe_negatives": ["ZOOM"],
                }
            }
        },
    }))

    data = grader.load_riven_data(override)
    result = grader._grade_riven("acceltra", ["TOX"], [], data, 50.0)

    assert result["grade"] == "great"
    assert not result["label"].startswith("ADVISORY")
    assert result["guidance_status"] == "player_authoritative"
    assert result["profile_source"] == "My test build"


def test_malformed_player_profile_falls_back_to_bundled_data(tmp_path):
    override = tmp_path / "riven_profiles.json"
    override.write_text('{"categories": []}')

    data = grader.load_riven_data(override)

    assert data["profile_metadata"]["status"] == "historical_seed"
    assert "acceltra" in data["categories"]["primary"]


def test_weapon_variant_facts_report_candidates_without_selecting_one():
    wfcd = [
        {
            "name": "Arca Plasmor", "omegaAttenuation": 0.95,
            "disposition": 3, "category": "Primary", "type": "Shotgun",
        },
        {
            "name": "Tenet Arca Plasmor", "omegaAttenuation": 0.55,
            "disposition": 1, "category": "Primary", "type": "Shotgun",
        },
        {"name": "Unrelated", "omegaAttenuation": 1.5, "disposition": 5},
    ]

    facts = grader._weapon_variant_facts("arca plasmor", wfcd)

    assert [fact["name"] for fact in facts] == ["Arca Plasmor", "Tenet Arca Plasmor"]
    assert [fact["omega_attenuation"] for fact in facts] == [0.95, 0.55]


def test_riven_stat_shape_rejects_incomplete_and_impossible_ocr():
    assert grader._valid_riven_stat_shape(["CC", "CD"], [])
    assert grader._valid_riven_stat_shape(["CC", "CD", "MS"], ["ZOOM"])
    assert not grader._valid_riven_stat_shape(["CC"], [])
    assert not grader._valid_riven_stat_shape(["CC", "CD", "MS", "TOX"], [])
    assert not grader._valid_riven_stat_shape(["CC", "CD"], ["ZOOM", "IMP"])
    assert not grader._valid_riven_stat_shape(["CC", "CD"], ["CC"])


def test_fits_in_ocr_prefers_the_longest_matching_variant():
    variants = [
        {"name": "Arca Plasmor", "omega_attenuation": 0.95},
        {"name": "Tenet Arca Plasmor", "omega_attenuation": 0.55},
    ]

    match = grader._match_weapon_variant(
        "FITS IN\nTenet Arca Plasmor", variants
    )

    assert match["name"] == "Tenet Arca Plasmor"
    assert match["omega_attenuation"] == 0.55


def test_generated_names_decode_from_official_export_fields():
    upgrades = grader._load_json(grader.EXPORT_UPGRADES_FILE, {})
    fragments = grader._load_json(grader.RIVEN_NAME_FRAGMENTS_FILE, {})
    shotgun = "/Lotus/Upgrades/Mods/Randomized/LotusShotgunRandomModRare"
    rifle = "/Lotus/Upgrades/Mods/Randomized/LotusRifleRandomModRare"

    assert set(grader._decode_riven_generated_name(
        "Vexidex", upgrades, shotgun, fragments
    )) == {
        "ELEC", "SC",
    }
    assert set(grader._decode_riven_generated_name(
        "Zetido", upgrades, shotgun, fragments
    )) == {
        "COLD", "REC",
    }
    assert set(
        grader._decode_riven_generated_name(
            "Sati-critaata", upgrades, rifle, fragments
        )
    ) == {"CC", "DMG", "MS"}


def test_riven_mod_path_uses_selected_variant_class():
    assert grader._riven_mod_path_for_variant({"type": "Shotgun"}).endswith(
        "LotusShotgunRandomModRare"
    )
    assert grader._riven_mod_path_for_variant(
        {"type": "Rifle", "category": "Primary"}
    ).endswith("LotusRifleRandomModRare")
    assert grader._riven_mod_path_for_variant(
        {"type": "Melee", "category": "Melee"}
    ).endswith("PlayerMeleeWeaponRandomModRare")
