#!/usr/bin/python3
"""Verify the Stage 3K plan gate without changing app source or building."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path("/var/home/jedwards/kiedas-orbiter")
CHECKOUT = ROOT / ".preview-work/stage2"
WORK = ROOT / ".preview-work/stage3-maps"
STAGE = ROOT / "docs/revamp/stage-3"
EVIDENCE = STAGE / "evidence"
OUTPUT = EVIDENCE / "maps-plan-postflight.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


if OUTPUT.exists():
    raise FileExistsError(OUTPUT)
register = json.loads((STAGE / "maps-source-register.json").read_text())
plan_check = json.loads((EVIDENCE / "maps-plan-check.json").read_text())
defects = json.loads((EVIDENCE / "maps-source-defects.json").read_text())
custom = json.loads((EVIDENCE / "maps-custom-marker-source-fact.json").read_text())
acceptance = json.loads((EVIDENCE / "settings-acceptance.json").read_text())
artifacts = json.loads((EVIDENCE / "settings-release-artifacts.json").read_text())
manifest = json.loads((ROOT / "docs/revamp/stage-1/baseline-files.json").read_text())
mismatches = [row["path"] for row in manifest if digest(ROOT / row["path"]) != row["sha256"]]
status = subprocess.run(["git", "status", "--short"], cwd=CHECKOUT, capture_output=True, text=True, check=True).stdout
plan = (STAGE / "MAPS-IMPLEMENTATION-PLAN.md").read_text()
preservation = (STAGE / "MAPS-PRESERVATION.md").read_text()
checks = {
    "stage3j_accepted_linux": acceptance["status"] == "accepted_linux",
    "source_plan_check_passed": plan_check["status"] == "pass" and all(plan_check["checks"].values()),
    "maps_source_frozen_and_unchanged": digest(WORK / "before/Maps.jsx") == digest(CHECKOUT / "src/screens/Maps.jsx") and subprocess.run(["git", "diff", "--quiet", "--", "src/screens/Maps.jsx"], cwd=CHECKOUT).returncode == 0,
    "main_source_frozen_and_unchanged": digest(WORK / "before/main.rs") == digest(CHECKOUT / "src-tauri/src/main.rs"),
    "accepted_cumulative_patch_frozen": digest(WORK / "before/cumulative-implementation.patch") == digest(STAGE / "cumulative-implementation.patch") == register["accepted_stage3j_cumulative_patch_sha256"],
    "preview_maps_layout_absent": not (CHECKOUT / "src/components/PreviewMapsLayout.jsx").exists(),
    "open_folder_defect_recorded": defects["open_empty_folder"]["backend_creates_directory"] is False,
    "atomic_write_defect_recorded": defects["truncating_config_write"]["uses_plain_fs_write"] is True and defects["truncating_config_write"]["existing_atomic_helper_available"] is True,
    "custom_marker_runtime_honestly_blocked": custom["custom_markers_available"] is False and custom["sensitive_values_recorded"] is False and "BLOCKED" in plan,
    "exact_navigation_label_recorded": register["navigation_fact"]["value"] == "Maps",
    "four_tabs_and_seven_assets_recorded": len(register["complexity"]["map_tabs"]) == 4 and len(register["complexity"]["distinct_map_files"]) == 7 and len(register["bundled_map_assets"]) == 7,
    "three_file_boundary_explicit": register["approved_if_plan_accepted"]["app_files"] == ["src/screens/Maps.jsx", "src/components/PreviewMapsLayout.jsx", "src-tauri/src/main.rs"],
    "package_target_96_from_82": "82 accepted packaged checks" in plan and "96/96" in plan,
    "linux_only_boundary_named": "Windows remains OPEN/BLOCKED" in plan and "macOS remains OPEN/UNAVAILABLE" in plan,
    "screen_redesign_stopping_point_named": "recommended stopping point" in plan,
    "no_ai_art_boundary": "AI artwork remains prohibited" in plan and "no AI artwork" in preservation,
    "stage3j_artifacts_unchanged": all(Path(row["path"]).is_file() and Path(row["path"]).stat().st_size == row["bytes"] and digest(Path(row["path"])) == row["sha256"] for row in artifacts),
    "tracked_baseline_850_of_850": len(manifest) == 850 and mismatches == [],
    "cargo_lock_unchanged": digest(CHECKOUT / "src-tauri/Cargo.lock") == register["cargo_lock_sha256"],
    "maps_not_in_checkout_status": "src/screens/Maps.jsx" not in status and "PreviewMapsLayout.jsx" not in status,
    "main_diff_check": subprocess.run(["git", "diff", "--check"], cwd=ROOT, capture_output=True).returncode == 0,
    "checkout_diff_check": subprocess.run(["git", "diff", "--check"], cwd=CHECKOUT, capture_output=True).returncode == 0,
    "docs_await_explicit_approval": "EXPLICIT APP-SOURCE APPROVAL REQUIRED" in plan and "No Stage 3K app-source edit" in plan,
}
if not all(checks.values()):
    raise RuntimeError(checks)
records = [
    STAGE / "MAPS-IMPLEMENTATION-PLAN.md",
    STAGE / "MAPS-PRESERVATION.md",
    STAGE / "maps-source-register.json",
    EVIDENCE / "maps-nav-source-fact.json",
    EVIDENCE / "maps-source-defects.json",
    EVIDENCE / "maps-custom-marker-source-fact.json",
    EVIDENCE / "maps-plan-check.json",
    EVIDENCE / "settings-acceptance.json",
    EVIDENCE / "maps-plan-tooling-note.md",
]
result = {
    "status": "pass",
    "checks": checks,
    "tracked_files_checked": len(manifest),
    "mismatches": mismatches,
    "records": [
        {"path": str(path.relative_to(ROOT)), "bytes": path.stat().st_size, "sha256": digest(path)}
        for path in records
    ],
    "gate": "Stage 3K Maps plan ready; explicit app-source approval required",
}
OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({"status": "pass", "check_count": len(checks), "baseline": "850/850", "maps_source_changed": False, "build_started": False}, indent=2))
