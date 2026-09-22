#!/usr/bin/python3
"""Run final Stage 3J consistency, integrity, and acceptance-gate checks."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path("/var/home/jedwards/kiedas-orbiter")
CHECKOUT = ROOT / ".preview-work/stage2"
STAGE = ROOT / "docs/revamp/stage-3"
EVIDENCE = STAGE / "evidence"
OUTPUT = EVIDENCE / "settings-postflight.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def all_pass(rows: list[dict]) -> bool:
    return bool(rows) and all(row.get("pass") is True for row in rows)


if OUTPUT.exists():
    raise FileExistsError(OUTPUT)

component = json.loads((EVIDENCE / "settings-component.json").read_text())
summary = json.loads((EVIDENCE / "settings-validation-summary.json").read_text())
baseline = json.loads((EVIDENCE / "settings-baseline-check.json").read_text())
artifacts = json.loads((EVIDENCE / "settings-release-artifacts.json").read_text())
register = json.loads((STAGE / "settings-source-register.json").read_text())
groups = [
    "checks", "dialog_checks", "guard_checks", "market_guards",
    "updater_ui_checks", "dashboard_checks", "inventory_checks",
    "mastery_checks", "mods_checks", "cosmetics_checks", "rivens_checks",
    "relics_checks", "relic_planner_checks", "market_checks", "settings_checks",
]
required_guards = {
    "start_log_scanner", "set_hotkeys", "play_notification_sound",
    "show_notification", "set_monitoring_active",
}
package_results = {}
for kind in ("deb", "appimage"):
    data = json.loads((EVIDENCE / f"settings-{kind}-packaged-smoke.json").read_text())
    rows = [row for group in groups for row in data[group]]
    direct = {row["command"]: row for row in data["settings_direct_guards"]}
    package_results[kind] = {
        "checks": len(rows),
        "settings_checks": len(data["settings_checks"]),
        "all_pass": data.get("error") is None and all_pass(rows),
        "unavailable_invocations": data["settings_frontend_unavailable_invocations"],
        "relay_event_invocations": data["settings_relay_event_invocations"],
        "stop_log_scanner_invocations": data["settings_stop_log_scanner_invocations"],
        "direct_guard_commands": sorted(direct),
        "direct_guards_pass": set(direct) == required_guards and all(
            row["pass"] is True and row["result"]["resolved"] is False
            for row in direct.values()
        ),
    }

checks = {
    "component_62_of_62": len(component["checks"]) == 62 and all_pass(component["checks"]),
    "stable_markup_20_of_20": component["summary"]["stable_exact_markup"] == 20,
    "stable_interactions_19_of_19": component["summary"]["stable_interaction_parity"] == 19,
    "component_zero_unavailable_invocations": component["preview_unavailable_invocations"] == [],
    "component_zero_relay_event_invocations": component["preview_relay_event_invocations"] == [],
    "component_zero_stop_log_scanner_invocations": component["preview_stop_log_scanner_invocations"] == [],
    "debian_82_of_82": package_results["deb"]["checks"] == 82 and package_results["deb"]["all_pass"],
    "appimage_82_of_82": package_results["appimage"]["checks"] == 82 and package_results["appimage"]["all_pass"],
    "both_packages_12_settings_checks": all(row["settings_checks"] == 12 for row in package_results.values()),
    "both_packages_zero_unavailable_invocations": all(row["unavailable_invocations"] == [] for row in package_results.values()),
    "both_packages_zero_relay_event_invocations": all(row["relay_event_invocations"] == [] for row in package_results.values()),
    "both_packages_zero_stop_log_scanner_invocations": all(row["stop_log_scanner_invocations"] == [] for row in package_results.values()),
    "both_packages_reject_all_five_guarded_commands": all(row["direct_guards_pass"] for row in package_results.values()),
    "summary_explicitly_names_unguarded_surfaces": summary["safety"]["relay_event_rust_require_live_guard"] is False and summary["safety"]["stop_log_scanner_rust_require_live_guard"] is False,
    "artifact_hashes_current": all(Path(row["path"]).is_file() and Path(row["path"]).stat().st_size == row["bytes"] and digest(Path(row["path"])) == row["sha256"] for row in artifacts),
    "stage3i_artifacts_preserved": baseline["stage3i_artifacts_preserved_and_matched"] is True,
    "tracked_baseline_850_of_850": baseline["tracked_files_checked"] == 850 and baseline["mismatches"] == [],
    "lockfile_unchanged": baseline["app_lockfile_unchanged"] is True,
    "incremental_patch_native_git": baseline["source_preservation"]["native_git_incremental_patch"] is True,
    "stable_source_reverse_restoration": baseline["source_preservation"]["stable_source_restores_exactly_after_reversing_approved_patch"] is True,
    "cumulative_patch_applies": subprocess.run(["git", "apply", "--check", str(STAGE / "cumulative-implementation.patch")], cwd=ROOT, capture_output=True).returncode == 0,
    "main_diff_check": subprocess.run(["git", "diff", "--check"], cwd=ROOT, capture_output=True).returncode == 0,
    "checkout_diff_check": subprocess.run(["git", "diff", "--check"], cwd=CHECKOUT, capture_output=True).returncode == 0,
    "stage3k_maps_untouched": "src/screens/Maps.jsx" not in subprocess.run(["git", "status", "--short"], cwd=CHECKOUT, capture_output=True, text=True, check=True).stdout and not (CHECKOUT / "src/components/PreviewMapsLayout.jsx").exists(),
    "docs_await_acceptance": "IMPLEMENTED AND VALIDATED" in (STAGE / "SETTINGS-IMPLEMENTATION-PLAN.md").read_text() and "AWAITING USER ACCEPTANCE" in (ROOT / "docs/revamp/ACCEPTANCE-LEDGER.md").read_text(),
    "register_status": register["status"] == "implemented_awaiting_acceptance",
}
if not all(checks.values()):
    raise RuntimeError(checks)

integrity_paths = [
    STAGE / "settings-implementation.patch",
    STAGE / "cumulative-implementation.patch",
    STAGE / "settings-implementation.json",
    STAGE / "settings-source-register.json",
    EVIDENCE / "settings-component.json",
    EVIDENCE / "settings-source-preservation.json",
    EVIDENCE / "settings-validation-summary.json",
    EVIDENCE / "settings-release-artifacts.json",
    EVIDENCE / "settings-baseline-check.json",
    EVIDENCE / "settings-deb-packaged-smoke.json",
    EVIDENCE / "settings-appimage-packaged-smoke.json",
    EVIDENCE / "settings-native-build-container.json",
    EVIDENCE / "settings-native-bundle-container.json",
]
result = {
    "status": "pass",
    "checks": checks,
    "packages": package_results,
    "artifacts": artifacts,
    "integrity": [
        {"path": str(path.relative_to(ROOT)), "bytes": path.stat().st_size, "sha256": digest(path)}
        for path in integrity_paths
    ],
    "gate": "Stage 3J implemented and validated on Linux; awaiting user acceptance",
}
OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({
    "status": "pass",
    "check_count": len(checks),
    "debian": package_results["deb"]["checks"],
    "appimage": package_results["appimage"]["checks"],
    "relay_event_invocations": 0,
    "stop_log_scanner_invocations": 0,
    "direct_rejections": "5/5 each",
}, indent=2))
