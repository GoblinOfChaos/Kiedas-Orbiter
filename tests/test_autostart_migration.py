from autostart_migration import LEGACY_AUTOSTART_FILES, disable_legacy_autostart_entries


def test_disables_only_known_legacy_entries_and_preserves_backups(tmp_path):
    for name in LEGACY_AUTOSTART_FILES:
        (tmp_path / name).write_text(name)
    unrelated = tmp_path / "other-application.desktop"
    unrelated.write_text("keep me")

    migrated = disable_legacy_autostart_entries(tmp_path)

    assert len(migrated) == 2
    assert unrelated.read_text() == "keep me"
    for source, backup in migrated:
        assert not source.exists()
        assert backup.exists()
        assert ".desktop.disabled-by-kiedas-orbiter" in backup.name


def test_repeated_migration_is_a_noop(tmp_path):
    source = tmp_path / LEGACY_AUTOSTART_FILES[0]
    source.write_text("legacy")

    assert len(disable_legacy_autostart_entries(tmp_path)) == 1
    assert disable_legacy_autostart_entries(tmp_path) == []
