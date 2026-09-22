#!/usr/bin/python3
"""Finalize Stage 3J Settings evidence using native Git-generated patches."""

from __future__ import annotations

import datetime
import hashlib
import json
import shutil
import subprocess
from pathlib import Path


ROOT = Path("/var/home/jedwards/kiedas-orbiter")
WORK = ROOT / ".preview-work/stage3-settings"
CHECKOUT = ROOT / ".preview-work/stage2"
STAGE = ROOT / "docs/revamp/stage-3"
EVIDENCE = STAGE / "evidence"
TARGET = ROOT / ".preview-work/ubuntu-build/target/release"
PATCH_REPO = WORK / "patch-repo"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rows_pass(rows: list[dict]) -> bool:
    return bool(rows) and all(row.get("pass") is True for row in rows)


required = [
    ROOT / "AGENTS.md",
    WORK / "before/Settings.jsx",
    WORK / "before/cumulative-implementation.patch",
    CHECKOUT / "src/screens/Settings.jsx",
    CHECKOUT / "src/components/PreviewSettingsLayout.jsx",
    CHECKOUT / "src-tauri/Cargo.lock",
    EVIDENCE / "settings-component.json",
    EVIDENCE / "settings-deb-packaged-smoke.json",
    EVIDENCE / "settings-appimage-packaged-smoke.json",
    EVIDENCE / "settings-native-build-container.json",
    EVIDENCE / "settings-native-bundle-container.json",
    WORK / "preserved-stage3i-native/manifest.json",
    TARGET / "kiedas-orbiter",
    TARGET / "kiedas-orbiter-preview",
    TARGET / "bundle/deb/Kieda's Orbiter Preview_1.3.3_amd64.deb",
    TARGET / "bundle/appimage/Kieda's Orbiter Preview_1.3.3_amd64.AppImage",
]
for path in required:
    if not path.exists():
        raise FileNotFoundError(path)

outputs = [
    STAGE / "settings-implementation.patch",
    STAGE / "settings-implementation.json",
    EVIDENCE / "settings-source-preservation.json",
    EVIDENCE / "settings-validation-summary.json",
    EVIDENCE / "settings-release-artifacts.json",
    EVIDENCE / "settings-baseline-check.json",
]
for path in outputs:
    if path.exists():
        raise FileExistsError(path)

component = json.loads((EVIDENCE / "settings-component.json").read_text())
assert component.get("error") is None
assert len(component["checks"]) == 62 and rows_pass(component["checks"])
assert component["summary"]["stable_exact_markup"] == 20
assert component["summary"]["stable_interaction_parity"] == 19
assert component["preview_unavailable_invocations"] == []
assert component["preview_relay_event_invocations"] == []
assert component["preview_stop_log_scanner_invocations"] == []

groups = [
    "checks", "dialog_checks", "guard_checks", "market_guards",
    "updater_ui_checks", "dashboard_checks", "inventory_checks",
    "mastery_checks", "mods_checks", "cosmetics_checks", "rivens_checks",
    "relics_checks", "relic_planner_checks", "market_checks", "settings_checks",
]
packages = []
required_settings_guards = {
    "start_log_scanner", "set_hotkeys", "play_notification_sound",
    "show_notification", "set_monitoring_active",
}
for kind in ("deb", "appimage"):
    data = json.loads((EVIDENCE / f"settings-{kind}-packaged-smoke.json").read_text())
    assert data.get("error") is None
    rows = [row for group in groups for row in data[group]]
    assert len(rows) == 82 and rows_pass(rows)
    assert len(data["settings_checks"]) == 12 and rows_pass(data["settings_checks"])
    assert data["settings_frontend_unavailable_invocations"] == []
    assert data["settings_relay_event_invocations"] == []
    assert data["settings_stop_log_scanner_invocations"] == []
    direct = {row["command"]: row for row in data["settings_direct_guards"]}
    assert set(direct) == required_settings_guards
    assert all(
        row["pass"] is True
        and row["result"]["resolved"] is False
        and "disabled" in row["result"]["error"]
        for row in direct.values()
    )
    packages.append({
        "kind": kind,
        "checks": 82,
        "passed": 82,
        "groups": {group: len(data[group]) for group in groups},
        "binary_sha256": data["binary_sha256"],
        "settings_checks": data["settings_checks"],
        "preview_unavailable_invocations": data["settings_frontend_unavailable_invocations"],
        "preview_relay_event_invocations": data["settings_relay_event_invocations"],
        "preview_stop_log_scanner_invocations": data["settings_stop_log_scanner_invocations"],
        "direct_settings_ipc_rejections": {name: direct[name] for name in sorted(direct)},
    })

for name in (
    "settings-native-build-container.json", "settings-native-bundle-container.json",
    "settings-deb-smoke-container.json", "settings-appimage-smoke-container.json",
):
    run = json.loads((EVIDENCE / name).read_text())
    assert run["exit_code"] == 0
    assert run["terminal_state"] == "exited"
    assert run["waited_for_terminal_state"] is True
    assert run["cpus"] == 4 and run["network"] == "none"

# Generate the incremental patch entirely through native Git.
if PATCH_REPO.exists():
    shutil.rmtree(PATCH_REPO)
(PATCH_REPO / "src/screens").mkdir(parents=True)
shutil.copy2(WORK / "before/Settings.jsx", PATCH_REPO / "src/screens/Settings.jsx")
subprocess.run(["git", "init", "-q"], cwd=PATCH_REPO, check=True)
subprocess.run(["git", "config", "user.name", "Stage 3 Evidence"], cwd=PATCH_REPO, check=True)
subprocess.run(["git", "config", "user.email", "stage3-evidence@invalid.local"], cwd=PATCH_REPO, check=True)
subprocess.run(["git", "add", "src/screens/Settings.jsx"], cwd=PATCH_REPO, check=True)
subprocess.run(["git", "commit", "-q", "-m", "Frozen Stage 3I Settings source"], cwd=PATCH_REPO, check=True)
shutil.copy2(CHECKOUT / "src/screens/Settings.jsx", PATCH_REPO / "src/screens/Settings.jsx")
(PATCH_REPO / "src/components").mkdir(parents=True)
shutil.copy2(
    CHECKOUT / "src/components/PreviewSettingsLayout.jsx",
    PATCH_REPO / "src/components/PreviewSettingsLayout.jsx",
)
subprocess.run(
    ["git", "add", "-N", "src/components/PreviewSettingsLayout.jsx"],
    cwd=PATCH_REPO,
    check=True,
)
incremental = subprocess.run(
    ["git", "diff", "--binary", "HEAD", "--", "src/screens/Settings.jsx", "src/components/PreviewSettingsLayout.jsx"],
    cwd=PATCH_REPO,
    capture_output=True,
    text=True,
    check=True,
).stdout
assert incremental.startswith("diff --git ")
(STAGE / "settings-implementation.patch").write_text(incremental)

# Reverse-applying the generated patch must restore the exact frozen source.
reverse = subprocess.run(
    ["git", "apply", "-R", str(STAGE / "settings-implementation.patch")],
    cwd=PATCH_REPO,
    capture_output=True,
    text=True,
)
assert reverse.returncode == 0, reverse.stderr
restored_exactly = (
    (PATCH_REPO / "src/screens/Settings.jsx").read_bytes()
    == (WORK / "before/Settings.jsx").read_bytes()
    and not (PATCH_REPO / "src/components/PreviewSettingsLayout.jsx").exists()
)
assert restored_exactly
shutil.rmtree(PATCH_REPO)

prior = WORK / "before/cumulative-implementation.patch"
prior_bytes = prior.read_bytes()
separator = b"" if prior_bytes.endswith(b"\n") else b"\n"
(STAGE / "cumulative-implementation.patch").write_bytes(
    prior_bytes + separator + incremental.encode()
)
apply_check = subprocess.run(
    ["git", "apply", "--check", str(STAGE / "cumulative-implementation.patch")],
    cwd=ROOT,
    capture_output=True,
    text=True,
)
assert apply_check.returncode == 0, apply_check.stderr

register_path = STAGE / "settings-source-register.json"
register = json.loads(register_path.read_text())
assert digest(WORK / "before/Settings.jsx") == register["sources"]["src/screens/Settings.jsx"]["sha256"]
assert digest(prior) == register["accepted_stage3i_cumulative_patch_sha256"]
for relative, record in register["sources"].items():
    if not record["planned_change"]:
        assert digest(CHECKOUT / relative) == record["sha256"], relative
lock_hash = digest(CHECKOUT / "src-tauri/Cargo.lock")
assert lock_hash == register["cargo_lock_sha256"]

layout_text = (CHECKOUT / "src/components/PreviewSettingsLayout.jsx").read_text()
for forbidden in ("@tauri-apps", "useState", "useEffect", "invoke(", "relay_event", "stop_log_scanner"):
    assert forbidden not in layout_text
source_proof = {
    "before_sha256": digest(WORK / "before/Settings.jsx"),
    "after_sha256": digest(CHECKOUT / "src/screens/Settings.jsx"),
    "preview_layout_sha256": digest(CHECKOUT / "src/components/PreviewSettingsLayout.jsx"),
    "native_git_incremental_patch": True,
    "stable_source_restores_exactly_after_reversing_approved_patch": restored_exactly,
    "stable_exact_markup_comparisons": "20/20",
    "stable_interaction_parity": "19/19",
    "all_unplanned_registered_sources_unchanged": True,
    "layout_has_no_tauri_import": "@tauri-apps" not in layout_text,
    "layout_has_no_state_or_effect_hooks": "useState" not in layout_text and "useEffect" not in layout_text,
    "layout_has_no_live_commands": all(name not in layout_text for name in ("invoke(", "relay_event", "stop_log_scanner")),
    "source_files_changed": ["src/screens/Settings.jsx", "src/components/PreviewSettingsLayout.jsx"],
}
(EVIDENCE / "settings-source-preservation.json").write_text(json.dumps(source_proof, indent=2) + "\n")

# Verify that the four accepted Stage 3I artifacts were preserved before cleanup.
accepted = json.loads((EVIDENCE / "market-release-artifacts.json").read_text())
preserved_manifest = json.loads((WORK / "preserved-stage3i-native/manifest.json").read_text())
preserved_by_source = {row["source"]: row for row in preserved_manifest["files"]}
preserved_ok = True
for row in accepted:
    source_path = row.get("path", row.get("path_at_validation"))
    record = preserved_by_source.get(source_path)
    if not record:
        preserved_ok = False
        continue
    copy = Path(record["copy"])
    preserved_ok = (
        preserved_ok and copy.is_file() and digest(copy) == row["sha256"]
        and copy.stat().st_size == row["bytes"]
    )
assert preserved_ok

artifact_paths = [
    TARGET / "kiedas-orbiter",
    TARGET / "kiedas-orbiter-preview",
    TARGET / "bundle/deb/Kieda's Orbiter Preview_1.3.3_amd64.deb",
    TARGET / "bundle/appimage/Kieda's Orbiter Preview_1.3.3_amd64.AppImage",
]
artifacts = [
    {"path": str(path), "bytes": path.stat().st_size, "sha256": digest(path)}
    for path in artifact_paths
]
(EVIDENCE / "settings-release-artifacts.json").write_text(json.dumps(artifacts, indent=2) + "\n")

manifest = json.loads((ROOT / "docs/revamp/stage-1/baseline-files.json").read_text())
mismatches = [row["path"] for row in manifest if digest(ROOT / row["path"]) != row["sha256"]]
assert len(manifest) == 850 and not mismatches
timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
safety = {
    "preview_unavailable_frontend_invocations": {"component": [], "deb": [], "appimage": []},
    "zero_preview_unavailable_frontend_invocations_confirmed": True,
    "preview_relay_event_invocations": {"component": [], "deb": [], "appimage": []},
    "zero_preview_relay_event_invocations_confirmed": True,
    "relay_event_rust_require_live_guard": False,
    "preview_stop_log_scanner_invocations": {"component": [], "deb": [], "appimage": []},
    "zero_preview_stop_log_scanner_invocations_confirmed": True,
    "stop_log_scanner_rust_require_live_guard": False,
    "direct_preview_ipc_commands_rejected": sorted(required_settings_guards),
    "all_five_direct_settings_ipc_commands_rejected": True,
}
summary = {
    "timestamp": timestamp,
    "risk": "higher",
    "component_checks": 62,
    "component_passed": 62,
    "stable_exact_markup_comparison_count": 20,
    "stable_interaction_parity_count": 19,
    "packages": packages,
    "safety": safety,
    "harness_corrections": [
        {
            "issue": "two source-backed labels used incorrect translation keys and anchor focus was sampled after hash navigation",
            "scope": "test harness only",
            "preserved_prefix": "before-settings-native-harness-fix-",
        },
        {
            "issue": "a bookkeeping self-check added a thirteenth Settings row to a twelve-check target",
            "scope": "test harness only",
            "preserved_prefix": "before-settings-check-count-fix-",
        },
    ],
    "failures": [],
    "gate": "Stage 3J implemented and validated on Linux; awaiting user acceptance",
}
(EVIDENCE / "settings-validation-summary.json").write_text(json.dumps(summary, indent=2) + "\n")

metadata = {
    "timestamp": timestamp,
    "stage3i_cumulative_patch_sha256": digest(prior),
    "settings_incremental_patch_sha256": digest(STAGE / "settings-implementation.patch"),
    "cumulative_patch_sha256": digest(STAGE / "cumulative-implementation.patch"),
    "cumulative_apply_check_exit": 0,
    "tracked_files_checked": len(manifest),
    "mismatches": mismatches,
    "app_lockfile_sha256": lock_hash,
    "app_lockfile_unchanged": True,
    "source_preservation": source_proof,
    "stage3i_artifacts_preserved_and_matched": preserved_ok,
    "artifact_count": 4,
    "component_checks": 62,
    "stable_exact_markup_comparisons": 20,
    "stable_interaction_parity": 19,
    "packaged_checks_per_artifact": 82,
    "safety": safety,
    "stage3k_app_source_started": False,
    "gate": "Stage 3J implemented and validated on Linux; awaiting user acceptance",
}
(STAGE / "settings-implementation.json").write_text(json.dumps(metadata, indent=2) + "\n")
(EVIDENCE / "settings-baseline-check.json").write_text(json.dumps(metadata, indent=2) + "\n")

register["status"] = "implemented_awaiting_acceptance"
register["stage3j_app_source_started"] = True
register["stage3k_app_source_started"] = False
register["after_sources"] = {
    "src/screens/Settings.jsx": {"sha256": digest(CHECKOUT / "src/screens/Settings.jsx")},
    "src/components/PreviewSettingsLayout.jsx": {"sha256": digest(CHECKOUT / "src/components/PreviewSettingsLayout.jsx")},
}
register["validation"] = {
    "component_checks": "62/62",
    "stable_exact_markup_comparisons": "20/20",
    "stable_interaction_parity": "19/19",
    "debian_native_checks": "82/82",
    "appimage_native_checks": "82/82",
    "preview_unavailable_frontend_invocations": 0,
    "preview_relay_event_invocations": 0,
    "preview_stop_log_scanner_invocations": 0,
    "direct_settings_ipc_rejections": "5/5 per package",
    "tracked_baseline": "850/850",
    "lockfile_unchanged": True,
}
register_path.write_text(json.dumps(register, indent=2) + "\n")

# Keep prior accepted artifact hashes verifiable after the shared target was replaced.
for row in accepted:
    source_path = row.get("path", row.get("path_at_validation"))
    record = preserved_by_source[source_path]
    if "path" in row:
        row["path_at_validation"] = row.pop("path")
    row["preserved_copy"] = record["copy"]
    row["current_file_available_at_original_path"] = False
(EVIDENCE / "market-release-artifacts.json").write_text(json.dumps(accepted, indent=2) + "\n")

runner_dir = EVIDENCE / "runners"
runner_dir.mkdir(parents=True, exist_ok=True)
for name in (
    "setup-fixture.py", "component-build.py", "component.py", "frontend.py",
    "native-build.py", "bundle.py", "adapt-native-smoke.py", "deb-smoke.py", "appimage-smoke.py",
):
    shutil.copy2(WORK / name, runner_dir / f"settings-{name}")

print(json.dumps({
    "component": "62/62",
    "stable_markup": "20/20",
    "stable_interactions": "19/19",
    "packages": "82/82 each",
    "relay_event_invocations": 0,
    "stop_log_scanner_invocations": 0,
    "direct_ipc_rejections": "5/5 each",
    "baseline": "850/850",
    "lockfile_unchanged": True,
    "cumulative_apply_check": 0,
}, indent=2))
