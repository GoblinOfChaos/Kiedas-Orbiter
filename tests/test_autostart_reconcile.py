import json
import time

import autostart_manager as am


def test_heartbeat_age_seconds_none_when_file_missing(tmp_path, monkeypatch):
    monkeypatch.setattr(am, "HEARTBEAT_FILE", tmp_path / "watcher-heartbeat.json")
    assert am.heartbeat_age_seconds() is None


def test_heartbeat_age_seconds_reports_real_age(tmp_path, monkeypatch):
    heartbeat_file = tmp_path / "watcher-heartbeat.json"
    monkeypatch.setattr(am, "HEARTBEAT_FILE", heartbeat_file)
    heartbeat_file.write_text(json.dumps({"tick": 5, "last_beat": time.time() - 10}))
    age = am.heartbeat_age_seconds()
    assert age is not None
    assert 9 <= age <= 11


def test_heartbeat_age_seconds_none_on_corrupt_file(tmp_path, monkeypatch):
    heartbeat_file = tmp_path / "watcher-heartbeat.json"
    monkeypatch.setattr(am, "HEARTBEAT_FILE", heartbeat_file)
    heartbeat_file.write_text("not json")
    assert am.heartbeat_age_seconds() is None


def test_write_heartbeat_round_trips(tmp_path, monkeypatch):
    monkeypatch.setattr(am, "HEARTBEAT_FILE", tmp_path / "watcher-heartbeat.json")
    am._tick_count = 42
    am._write_heartbeat()
    age = am.heartbeat_age_seconds()
    assert age is not None
    assert age < 1


def test_restart_backoff_allows_first_attempt(monkeypatch):
    monkeypatch.setattr(am, "_last_always_on_restart_attempt", {})
    assert am._can_attempt_restart("detector", now=1000.0) is True


def test_restart_backoff_blocks_immediate_retry(monkeypatch):
    monkeypatch.setattr(am, "_last_always_on_restart_attempt", {"detector": 1000.0})
    assert am._can_attempt_restart("detector", now=1005.0) is False


def test_restart_backoff_allows_retry_after_window(monkeypatch):
    monkeypatch.setattr(am, "_last_always_on_restart_attempt", {"detector": 1000.0})
    assert am._can_attempt_restart("detector", now=1031.0) is True


def test_reconcile_always_on_restarts_dead_feature(monkeypatch):
    monkeypatch.setattr(am, "_last_always_on_restart_attempt", {})
    monkeypatch.setattr(am, "get_autostart", lambda feature: True)
    monkeypatch.setattr(am, "is_feature_running", lambda feature: False)
    started = []
    monkeypatch.setattr(am, "start_feature", lambda feature, reason="": started.append(feature))
    am.reconcile_always_on()
    assert set(started) == set(am._SELF_RESTARTABLE_ALWAYS_ON)


def test_reconcile_always_on_never_targets_watcher(monkeypatch):
    # Live bug found 2026-08-04: reconcile_always_on() ran from inside
    # warframe-watcher.py's own loop and included "watcher" as a restart
    # target - a process trying to determine "am I alive" through a
    # shared registry file it also writes to. A single false negative
    # spawned a second watcher, which spawned a third, and so on: 11
    # concurrent processes within about a minute. "watcher" must never
    # appear in the self-restartable set, regardless of what
    # is_feature_running() reports.
    monkeypatch.setattr(am, "_last_always_on_restart_attempt", {})
    monkeypatch.setattr(am, "get_autostart", lambda feature: True)
    monkeypatch.setattr(am, "is_feature_running", lambda feature: False)
    started = []
    monkeypatch.setattr(am, "start_feature", lambda feature, reason="": started.append(feature))
    am.reconcile_always_on()
    assert "watcher" not in started
    assert "watcher" not in am._SELF_RESTARTABLE_ALWAYS_ON


def test_reconcile_always_on_leaves_running_features_alone(monkeypatch):
    monkeypatch.setattr(am, "_last_always_on_restart_attempt", {})
    monkeypatch.setattr(am, "get_autostart", lambda feature: True)
    monkeypatch.setattr(am, "is_feature_running", lambda feature: True)
    started = []
    monkeypatch.setattr(am, "start_feature", lambda feature, reason="": started.append(feature))
    am.reconcile_always_on()
    assert started == []


def test_reconcile_always_on_respects_backoff_on_repeated_death(monkeypatch):
    # A feature that's dead every single tick (a real crash-on-launch,
    # not a transient blip) must not be restarted on every tick - only
    # once per backoff window.
    monkeypatch.setattr(am, "_last_always_on_restart_attempt", {})
    monkeypatch.setattr(am, "get_autostart", lambda feature: True)
    monkeypatch.setattr(am, "is_feature_running", lambda feature: False)
    started = []
    monkeypatch.setattr(am, "start_feature", lambda feature, reason="": started.append(feature))
    am.reconcile_always_on()
    first_round = len(started)
    am.reconcile_always_on()  # immediately again, still "dead"
    assert len(started) == first_round  # no new attempts within the backoff window


def test_reconcile_always_on_logs_when_backoff_blocks_a_restart(monkeypatch):
    monkeypatch.setattr(am, "_last_always_on_restart_attempt", {})
    monkeypatch.setattr(am, "get_autostart", lambda feature: True)
    monkeypatch.setattr(am, "is_feature_running", lambda feature: False)
    monkeypatch.setattr(am, "start_feature", lambda feature, reason="": None)
    logged = []
    monkeypatch.setattr(am, "_log", lambda msg: logged.append(msg))
    am.reconcile_always_on()  # first call succeeds, no log expected yet
    assert logged == []
    am.reconcile_always_on()  # second call, still dead, blocked by backoff
    assert any("blocked by backoff" in msg for msg in logged)


def test_reconcile_always_on_skips_disabled_autostart(monkeypatch):
    monkeypatch.setattr(am, "_last_always_on_restart_attempt", {})
    monkeypatch.setattr(am, "get_autostart", lambda feature: False)
    monkeypatch.setattr(am, "is_feature_running", lambda feature: False)
    started = []
    monkeypatch.setattr(am, "start_feature", lambda feature, reason="": started.append(feature))
    am.reconcile_always_on()
    assert started == []
