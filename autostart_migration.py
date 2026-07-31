"""Migration helpers for obsolete OS-level Kieda's Orbiter autostart files."""

from pathlib import Path


LEGACY_AUTOSTART_FILES = (
    "orbiter-overlay.desktop",
    "orbiter-watcher.desktop",
)


def disable_legacy_autostart_entries(autostart_dir=None):
    """Rename legacy entries so desktop sessions stop launching duplicates.

    Backups remain beside the originals with a non-``.desktop`` suffix, making
    the migration recoverable without leaving files that XDG autostart scans.
    Returns ``[(old_path, backup_path), ...]`` for entries that were migrated.
    """
    directory = Path(autostart_dir or (Path.home() / ".config/autostart"))
    migrated = []
    for name in LEGACY_AUTOSTART_FILES:
        source = directory / name
        if not source.exists():
            continue
        backup = directory / f"{name}.disabled-by-kiedas-orbiter"
        suffix = 1
        while backup.exists():
            backup = directory / f"{name}.disabled-by-kiedas-orbiter.{suffix}"
            suffix += 1
        source.rename(backup)
        migrated.append((source, backup))
    return migrated
