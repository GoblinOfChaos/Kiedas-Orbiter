import json

import pytest

import update_manager


def test_safe_write_validates_and_atomically_replaces(tmp_path):
    destination = tmp_path / "data.json"
    destination.write_text('[{"old": true}]')
    payload = json.dumps([{"id": number} for number in range(3)]).encode()

    assert update_manager._safe_write(
        destination, payload, min_size=1, min_entries=3
    )
    assert json.loads(destination.read_bytes()) == json.loads(payload)
    assert json.loads((tmp_path / "data.json.previous").read_text()) == [{"old": True}]
    assert not list(tmp_path.glob(".data.json.*.tmp"))


def test_safe_write_rejects_invalid_or_incomplete_data(tmp_path):
    destination = tmp_path / "data.json"
    destination.write_text('[{"keep": true}]')

    assert not update_manager._safe_write(destination, b"not json", min_size=1)
    assert not update_manager._safe_write(destination, b"[]", min_size=1, min_entries=1)
    assert json.loads(destination.read_text()) == [{"keep": True}]


def test_fetch_rejects_plain_http():
    with pytest.raises(ValueError, match="non-HTTPS"):
        update_manager._fetch("http://example.invalid/data.json")


def test_riven_name_fragments_join_cleaned_keys_to_official_values():
    path = "/Lotus/Upgrades/Mods/Randomized/LotusRifleRandomModRare"
    cleaned = {
        path: {
            "upgradeEntries": [{
                "tag": "WeaponCritDamageMod",
                "prefixTag": "/Lotus/Language/Omega/CritDamagePrefix",
                "suffixTag": "/Lotus/Language/Omega/CritDamageSuffix",
            }]
        }
    }
    official = {
        "ExportUpgrades": [{
            "uniqueName": path,
            "upgradeEntries": [{
                "tag": "WeaponCritDamageMod",
                "prefixTag": "acri",
                "suffixTag": "tis",
            }],
        }]
    }

    fragments = update_manager._build_riven_name_fragments(cleaned, official)

    assert fragments == {
        "/Lotus/Language/Omega/CritDamagePrefix": "acri",
        "/Lotus/Language/Omega/CritDamageSuffix": "tis",
    }
