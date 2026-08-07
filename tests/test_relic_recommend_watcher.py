import relic_recommend_watcher as watcher


def _state(monkeypatch):
    monkeypatch.setattr(watcher, "compute_recommendations_by_era", lambda: {"era": []})
    writes = []
    monkeypatch.setattr(watcher, "_write_state", lambda data: writes.append(data))
    return watcher._State(), writes


def test_open_then_confirm_closes(monkeypatch):
    state, writes = _state(monkeypatch)
    state.process_line("Script [Info]: ThemedProjectionManager.lua: PopulateInventoryGrid")
    assert state.picker_open
    state.process_line(
        "Script [Info]: Dialog.lua: Dialog::CreateOkCancel(description="
        "Are you sure you want to equip Axi S20 Relic [RADIANT] for this "
        "mission?"
    )
    assert not state.picker_open
    assert writes[-1] == {"visible": False, "timestamp": writes[-1]["timestamp"]}


def test_defense_continue_countdown_does_not_stay_stuck_open(monkeypatch):
    """A mid-Defense wave-continue/extract countdown screen shares Warframe's
    generic ThemedProjectionManager UI framework with the real relic-select
    screen and triggers the exact same PopulateInventoryGrid line - confirmed
    live 2026-08-06 directly against EE.log. Since that screen never shows
    the equip-confirm dialog, the overlay used to stay stuck visible through
    every subsequent Defense round until a genuine relic pick eventually
    happened."""
    state, writes = _state(monkeypatch)
    state.process_line("Script [Info]: ThemedProjectionManager.lua: PopulateInventoryGrid")
    assert state.picker_open

    state.process_line("Script [Info]: ProjectionsCountdown.lua: Initialize timer nil\t20")

    assert not state.picker_open
    assert writes[-1]["visible"] is False


def test_projection_countdown_ignored_when_picker_not_open(monkeypatch):
    state, writes = _state(monkeypatch)
    state.process_line("Script [Info]: ProjectionsCountdown.lua: Initialize timer nil\t20")
    assert not state.picker_open
    assert writes == []
