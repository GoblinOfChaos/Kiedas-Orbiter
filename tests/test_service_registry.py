import os
import subprocess
import sys

import service_registry


def test_registry_round_trips_and_reports_alive(tmp_path, monkeypatch):
    monkeypatch.setattr(service_registry, "REGISTRY_DIR", tmp_path)
    pid = os.getpid()
    service_registry.record_launch("detector", pid)
    assert service_registry.is_registered_process_alive("detector") is True


def test_no_registry_entry_returns_none_not_false(tmp_path, monkeypatch):
    monkeypatch.setattr(service_registry, "REGISTRY_DIR", tmp_path)
    assert service_registry.is_registered_process_alive("detector") is None


def test_dead_pid_reports_not_alive(tmp_path, monkeypatch):
    monkeypatch.setattr(service_registry, "REGISTRY_DIR", tmp_path)
    proc = subprocess.Popen([sys.executable, "-c", "pass"])
    proc.wait()
    dead_pid = proc.pid
    service_registry.record_launch("detector", dead_pid)
    assert service_registry.is_registered_process_alive("detector") is False


def test_pid_reuse_with_mismatched_create_time_reports_not_alive(tmp_path, monkeypatch):
    # Simulates PID reuse: the recorded create_time no longer matches the
    # live process at that PID (an unrelated process reusing the same PID
    # would have started at a different time) - this must not be treated
    # as the same process still running.
    monkeypatch.setattr(service_registry, "REGISTRY_DIR", tmp_path)
    pid = os.getpid()
    service_registry.record_launch("detector", pid)
    entries = service_registry._load_entries("detector")
    entries[0]["create_time"] = entries[0]["create_time"] - 999999
    service_registry._save_entries("detector", entries)
    assert service_registry.is_registered_process_alive("detector") is False


def test_create_time_stable_across_cmdline_change_from_exec(tmp_path, monkeypatch):
    # launch-orbiter.sh exec()s the real orbiter binary shortly after
    # launch, which changes this process's own cmdline but keeps the same
    # PID and create_time. Simulate that: record with one cmdline, then
    # simulate the post-exec state having a totally different cmdline -
    # liveness must still report True since create_time is unaffected.
    monkeypatch.setattr(service_registry, "REGISTRY_DIR", tmp_path)
    pid = os.getpid()
    service_registry.record_launch("detector", pid)
    entries = service_registry._load_entries("detector")
    entries[0]["cmdline"] = ["bash", "./launch-orbiter.sh"]  # pre-exec snapshot
    service_registry._save_entries("detector", entries)
    # The live process's real (post-exec-equivalent, in this test just its
    # actual current) cmdline differs from what was recorded - must not
    # affect the result at all, since liveness no longer depends on cmdline.
    assert service_registry.is_registered_process_alive("detector") is True


def test_clear_registration_removes_entry(tmp_path, monkeypatch):
    monkeypatch.setattr(service_registry, "REGISTRY_DIR", tmp_path)
    service_registry.record_launch("detector", os.getpid())
    service_registry.clear_registration("detector")
    assert service_registry.is_registered_process_alive("detector") is None


def test_multi_component_feature_requires_all_components_alive(tmp_path, monkeypatch):
    monkeypatch.setattr(service_registry, "REGISTRY_DIR", tmp_path)
    pid = os.getpid()
    service_registry.record_launch("riven", pid, component="watcher")
    proc = subprocess.Popen([sys.executable, "-c", "pass"])
    proc.wait()
    service_registry.record_launch("riven", proc.pid, component="overlay")
    # One component (overlay) is dead, so the whole feature reports not alive.
    assert service_registry.is_registered_process_alive("riven") is False


def test_recording_a_new_component_does_not_drop_existing_ones(tmp_path, monkeypatch):
    monkeypatch.setattr(service_registry, "REGISTRY_DIR", tmp_path)
    pid = os.getpid()
    service_registry.record_launch("riven", pid, component="watcher")
    service_registry.record_launch("riven", pid, component="overlay")
    entries = service_registry._load_entries("riven")
    assert {e["component"] for e in entries} == {"watcher", "overlay"}
