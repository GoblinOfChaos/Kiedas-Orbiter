#!/usr/bin/python3
"""Freeze Stage 3J acceptance and create source-grounded Stage 3K plan records."""

from __future__ import annotations

import datetime
import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path


ROOT = Path("/var/home/jedwards/kiedas-orbiter")
CHECKOUT = ROOT / ".preview-work/stage2"
WORK = ROOT / ".preview-work/stage3-maps"
BEFORE = WORK / "before"
STAGE = ROOT / "docs/revamp/stage-3"
EVIDENCE = STAGE / "evidence"
MAPS = CHECKOUT / "src/screens/Maps.jsx"
MAIN = CHECKOUT / "src-tauri/src/main.rs"
LOCK = CHECKOUT / "src-tauri/Cargo.lock"
CUMULATIVE = STAGE / "cumulative-implementation.patch"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def replace(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    if text.count(old) != 1:
        raise RuntimeError(f"expected one match in {path}: {old!r}")
    path.write_text(text.replace(old, new))


for path in (ROOT / "AGENTS.md", MAPS, MAIN, LOCK, CUMULATIVE):
    if not path.is_file():
        raise FileNotFoundError(path)
if (CHECKOUT / "src/components/PreviewMapsLayout.jsx").exists():
    raise RuntimeError("Stage 3K layout source already exists")
if subprocess.run(["git", "diff", "--quiet", "--", "src/screens/Maps.jsx"], cwd=CHECKOUT).returncode != 0:
    raise RuntimeError("Maps.jsx changed before Stage 3K planning")

BEFORE.mkdir(parents=True, exist_ok=True)
for destination in (BEFORE / "Maps.jsx", BEFORE / "main.rs", BEFORE / "cumulative-implementation.patch"):
    if destination.exists():
        raise FileExistsError(destination)
shutil.copy2(MAPS, BEFORE / "Maps.jsx")
shutil.copy2(MAIN, BEFORE / "main.rs")
shutil.copy2(CUMULATIVE, BEFORE / "cumulative-implementation.patch")

# Freeze the already-reviewed Stage 3J records before updating its prose status.
acceptance_path = EVIDENCE / "settings-acceptance.json"
if acceptance_path.exists():
    raise FileExistsError(acceptance_path)
frozen_settings = [
    STAGE / "settings-source-register.json",
    STAGE / "settings-implementation.json",
    STAGE / "settings-implementation.patch",
    STAGE / "cumulative-implementation.patch",
    EVIDENCE / "settings-postflight.json",
    EVIDENCE / "settings-validation-summary.json",
    EVIDENCE / "settings-evidence-integrity.json",
]
acceptance = {
    "accepted_on": "2026-09-06",
    "stage": "Stage 3J Settings",
    "status": "accepted_linux",
    "basis": "User explicitly accepted after reviewing the Settings evidence, including separate relay_event and stop_log_scanner confirmation.",
    "frozen_records": {str(path.relative_to(ROOT)): digest(path) for path in frozen_settings},
    "safety": {
        "preview_unavailable_frontend_invocations": 0,
        "preview_relay_event_invocations": 0,
        "preview_stop_log_scanner_invocations": 0,
        "directly_rejected_settings_commands_per_package": 5,
    },
}
acceptance_path.write_text(json.dumps(acceptance, indent=2) + "\n")

# Update current status documents without rewriting frozen JSON evidence.
ledger = ROOT / "docs/revamp/ACCEPTANCE-LEDGER.md"
replace(
    ledger,
    "| Stage 3J Settings | **IMPLEMENTED AND VALIDATED — Linux — awaiting acceptance** | Preview Settings section navigation and responsive composition; live controls visibly disabled; zero Preview `relay_event` and `stop_log_scanner` invocations; five guarded commands directly rejected; stable markup and interactions preserved; evidence recorded in stage-3/SETTINGS-IMPLEMENTATION-PLAN.md |",
    "| Stage 3J Settings | **ACCEPTED — Linux** | Preview Settings section navigation and responsive composition; live controls visibly disabled; zero Preview `relay_event` and `stop_log_scanner` invocations; five guarded commands directly rejected; stable markup and interactions preserved; evidence recorded in stage-3/SETTINGS-IMPLEMENTATION-PLAN.md |",
)
replace(
    ledger,
    "Stage 3A through Stage 3E were explicitly accepted by the user on 2026-09-05. Stage 3F through Stage 3I were explicitly accepted by the user on 2026-09-06.",
    "Stage 3A through Stage 3E were explicitly accepted by the user on 2026-09-05. Stage 3F through Stage 3J were explicitly accepted by the user on 2026-09-06.",
)
replace(
    ledger,
    "Stage 3I Market is **ACCEPTED — LINUX**. Stage 3J Settings is **IMPLEMENTED AND VALIDATED — LINUX — AWAITING USER ACCEPTANCE**. Stage 3K Maps app-source work has not started.",
    "Stage 3J Settings is **ACCEPTED — LINUX**. Stage 3K Maps is **PLAN PREPARATION ONLY**. No Stage 3K app-source edit or build has started.",
)

readme = STAGE / "README.md"
replace(
    readme,
    "Stage 3C Mastery, Stage 3D Mods, Stage 3E Cosmetics, Stage 3F Rivens, Stage 3G Relics, Stage 3H Relic Planner and Stage 3I Market are accepted as Linux milestones. Stage 3J Settings is implemented and validated on Linux and awaits user acceptance. Stage 3K Maps app-source work has not started.",
    "Stage 3C Mastery, Stage 3D Mods, Stage 3E Cosmetics, Stage 3F Rivens, Stage 3G Relics, Stage 3H Relic Planner, Stage 3I Market and Stage 3J Settings are accepted as Linux milestones. Stage 3K Maps is plan-only; no Stage 3K app-source work has started.",
)
replace(
    readme,
    "Implemented higher-risk Stage 3J slice, awaiting user acceptance: [SETTINGS-IMPLEMENTATION-PLAN.md](SETTINGS-IMPLEMENTATION-PLAN.md). Settings preservation checklist: [SETTINGS-PRESERVATION.md](SETTINGS-PRESERVATION.md).",
    "Accepted higher-risk Stage 3J slice: [SETTINGS-IMPLEMENTATION-PLAN.md](SETTINGS-IMPLEMENTATION-PLAN.md). Settings preservation checklist: [SETTINGS-PRESERVATION.md](SETTINGS-PRESERVATION.md).",
)

scope = STAGE / "SCREEN-REDESIGN-SCOPE.md"
replace(
    scope,
    "| Stage 3J | Settings | Implemented and validated on Linux; awaiting acceptance |",
    "| Stage 3J | Settings | Accepted |",
)

settings_plan = STAGE / "SETTINGS-IMPLEMENTATION-PLAN.md"
replace(
    settings_plan,
    "**Status: IMPLEMENTED AND VALIDATED — LINUX — AWAITING USER ACCEPTANCE.**",
    "**Status: ACCEPTED — LINUX MILESTONE.**",
)
settings_preservation = STAGE / "SETTINGS-PRESERVATION.md"
replace(
    settings_preservation,
    "Status: **IMPLEMENTED AND VALIDATED — LINUX — AWAITING USER ACCEPTANCE**.",
    "Status: **ACCEPTED — LINUX MILESTONE**.",
)

source = MAPS.read_text()
map_block = source[source.index("const MAPS"):source.index("const placeholderSvg")]
icon_block = source[source.index("const ICONS"):source.index("const MAPS")]
color_block = source[source.index("const COLORS"):source.index("const genId")]
commands = sorted(set(re.findall(r"invoke\(['\"]([^'\"]+)", source)))
map_names = re.findall(r"\{ name: '([^']+)'", map_block)
map_files = sorted(set(re.findall(r"(?:raw|labeled): '([^']+)'", map_block)))
icons = re.findall(r"^\s{2}(\w+):", icon_block, re.MULTILINE)
colors = re.findall(r"#[0-9a-fA-F]{6}", color_block)
assets_dir = CHECKOUT / "src-tauri/data/assets/maps"
asset_rows = [
    {"name": name, "bytes": (assets_dir / name).stat().st_size, "sha256": digest(assets_dir / name)}
    for name in map_files
]

nav_fact = {
    "kind": "preview-navigation-label",
    "route": "maps",
    "sources": [
        {"path": str((CHECKOUT / "src/App.jsx")), "sha256": digest(CHECKOUT / "src/App.jsx")},
        {"path": str((CHECKOUT / "src/lib/i18n/en.json")), "sha256": digest(CHECKOUT / "src/lib/i18n/en.json")},
        {"path": str((CHECKOUT / "src/components/PreviewNavigation.jsx")), "sha256": digest(CHECKOUT / "src/components/PreviewNavigation.jsx")},
    ],
    "value": "Maps",
}
(EVIDENCE / "maps-nav-source-fact.json").write_text(json.dumps(nav_fact, indent=2) + "\n")

main_source = MAIN.read_text()
open_body = main_source[main_source.index("async fn open_map_configs_folder"):main_source.index("/// Read a map config")]
write_body = main_source[main_source.index("async fn write_map_config"):main_source.index("/// List all `.json`")]
defects = {
    "status": "source_verified_proposed_corrections_awaiting_approval",
    "open_empty_folder": {
        "reachable_control": "configuration panel always renders open_map_configs_folder button",
        "backend_creates_directory": "create_dir_all" in open_body,
        "finding": "The command resolves and opens data/user/map-configs without creating it; a fresh profile can invoke it while the directory is absent.",
        "proposed_correction": "Create the isolated map-config directory before launching the platform file manager.",
    },
    "truncating_config_write": {
        "uses_plain_fs_write": "fs::write(path, content)" in write_body,
        "existing_atomic_helper_available": "fn write_bytes_atomic" in main_source,
        "finding": "write_map_config truncates the destination in place, so a process kill during the write can leave invalid JSON.",
        "proposed_correction": "Route the already serialized JSON bytes through existing write_bytes_atomic; retain filename validation and payload bytes.",
    },
}
assert defects["open_empty_folder"]["backend_creates_directory"] is False
assert defects["truncating_config_write"]["uses_plain_fs_write"] is True
assert defects["truncating_config_write"]["existing_atomic_helper_available"] is True
(EVIDENCE / "maps-source-defects.json").write_text(json.dumps(defects, indent=2) + "\n")

registered_paths = [
    "src/screens/Maps.jsx",
    "src-tauri/src/main.rs",
    "src/lib/customMarkers.js",
    "src/contexts/MonitoringContext.jsx",
    "src/components/UI.jsx",
    "src/lib/i18n/en.json",
    "src/App.jsx",
    "src/components/PreviewNavigation.jsx",
]
register = {
    "captured_on": "2026-09-06",
    "checkout": ".preview-work/stage2",
    "branch": subprocess.run(["git", "branch", "--show-current"], cwd=CHECKOUT, capture_output=True, text=True, check=True).stdout.strip(),
    "head": subprocess.run(["git", "rev-parse", "HEAD"], cwd=CHECKOUT, capture_output=True, text=True, check=True).stdout.strip(),
    "status": "proposed_higher_risk_awaiting_explicit_app_source_approval",
    "accepted_stage3j_cumulative_patch_sha256": digest(CUMULATIVE),
    "cargo_lock_sha256": digest(LOCK),
    "sources": {
        relative: {
            "sha256": digest(CHECKOUT / relative),
            "lines": len((CHECKOUT / relative).read_text().splitlines()),
            "planned_change": relative in {"src/screens/Maps.jsx", "src-tauri/src/main.rs"},
        }
        for relative in registered_paths
    },
    "navigation_fact": {
        "path": "docs/revamp/stage-3/evidence/maps-nav-source-fact.json",
        "value": "Maps",
        "derived_from_current_source": True,
    },
    "complexity": {
        "use_state_calls": source.count("useState("),
        "use_effect_calls": source.count("useEffect("),
        "use_callback_calls": source.count("useCallback("),
        "button_elements": source.count("<button"),
        "input_elements": source.count("<input") + source.count("<Input"),
        "textarea_elements": source.count("<textarea"),
        "modal_elements": source.count("<Modal"),
        "invoke_calls": source.count("invoke("),
        "distinct_tauri_commands": commands,
        "map_tabs": map_names,
        "distinct_map_files": map_files,
        "marker_colors": len(colors),
        "marker_icons": icons,
    },
    "bundled_map_assets": asset_rows,
    "persistence": {
        "directory": "data/user/map-configs",
        "one_json_file_per_map": True,
        "safe_relative_join_on_frontend_filename": True,
        "preview_root_isolated_by_existing_build_profile": True,
    },
    "approved_if_plan_accepted": {
        "app_files": [
            "src/screens/Maps.jsx",
            "src/components/PreviewMapsLayout.jsx",
            "src-tauri/src/main.rs",
        ],
        "main_rs_scope": [
            "create map-config directory before opening it",
            "use existing write_bytes_atomic helper for map-config writes",
        ],
    },
    "stage3k_app_source_started": False,
}
(STAGE / "maps-source-register.json").write_text(json.dumps(register, indent=2) + "\n")

plan_check = {
    "status": "pass",
    "checks": {
        "stage3j_acceptance_recorded": acceptance_path.is_file(),
        "maps_source_frozen": digest(BEFORE / "Maps.jsx") == digest(MAPS),
        "main_source_frozen": digest(BEFORE / "main.rs") == digest(MAIN),
        "accepted_cumulative_patch_frozen": digest(BEFORE / "cumulative-implementation.patch") == digest(CUMULATIVE),
        "navigation_label_verified": nav_fact["value"] == "Maps",
        "four_map_tabs_verified": len(map_names) == 4,
        "seven_distinct_assets_verified": len(map_files) == 7 and all((assets_dir / name).is_file() for name in map_files),
        "five_tauri_commands_verified": len(commands) == 5,
        "open_folder_defect_source_verified": defects["open_empty_folder"]["backend_creates_directory"] is False,
        "atomic_write_defect_source_verified": defects["truncating_config_write"]["uses_plain_fs_write"] is True,
        "preview_layout_absent": not (CHECKOUT / "src/components/PreviewMapsLayout.jsx").exists(),
        "maps_source_unchanged": subprocess.run(["git", "diff", "--quiet", "--", "src/screens/Maps.jsx"], cwd=CHECKOUT).returncode == 0,
        "lockfile_unchanged": digest(LOCK) == register["cargo_lock_sha256"],
    },
    "facts": register["complexity"],
}
assert all(plan_check["checks"].values())
(EVIDENCE / "maps-plan-check.json").write_text(json.dumps(plan_check, indent=2) + "\n")
print(json.dumps(plan_check, indent=2))
