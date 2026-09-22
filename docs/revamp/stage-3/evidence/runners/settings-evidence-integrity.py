#!/usr/bin/python3
"""Create a supplemental integrity index for the completed Stage 3J run."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path("/var/home/jedwards/kiedas-orbiter")
EVIDENCE = ROOT / "docs/revamp/stage-3/evidence"
OUTPUT = EVIDENCE / "settings-evidence-integrity.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


if OUTPUT.exists():
    raise FileExistsError(OUTPUT)

postflight = json.loads((EVIDENCE / "settings-postflight.json").read_text())
component_run = json.loads((EVIDENCE / "settings-component-container.json").read_text())
stable_log = EVIDENCE / "settings-frontend-stable.log"
preview_log = EVIDENCE / "settings-frontend-preview.log"
source_fact = json.loads((EVIDENCE / "settings-nav-source-fact.json").read_text())
failure_prefixes = [
    "before-container-settings-component-host-path-failure",
    "before-host-escalation-settings-component-container",
    "before-disabled-group-count-fix-settings-component",
    "before-cargo-path-settings-native-build-container",
    "before-settings-native-harness-fix-settings-deb-packaged-smoke",
    "before-settings-check-count-fix-settings-deb-packaged-smoke",
]
checks = {
    "postflight_passed": postflight["status"] == "pass" and all(postflight["checks"].values()),
    "component_container_completed": component_run["exit_code"] == 0 and component_run["terminal_state"] == "exited" and component_run["waited_for_terminal_state"] is True,
    "component_container_bounded": component_run["cpus"] == 4 and component_run["network"] == "none",
    "stable_frontend_build_passed": "✓ built in" in stable_log.read_text(),
    "preview_frontend_build_passed": "✓ built in" in preview_log.read_text(),
    "navigation_label_source_verified": source_fact.get("value") == "Settings" and source_fact.get("route") == "settings",
    "all_harness_and_build_failures_preserved": all(any(path.name.startswith(prefix) for path in EVIDENCE.iterdir()) for prefix in failure_prefixes),
}
if not all(checks.values()):
    raise RuntimeError(checks)

paths = [
    ROOT / "docs/revamp/stage-3/settings-implementation.patch",
    ROOT / "docs/revamp/stage-3/cumulative-implementation.patch",
    ROOT / "docs/revamp/stage-3/settings-implementation.json",
    ROOT / "docs/revamp/stage-3/settings-source-register.json",
    EVIDENCE / "settings-postflight.json",
    EVIDENCE / "settings-component.json",
    EVIDENCE / "settings-component-container.json",
    EVIDENCE / "settings-deb-packaged-smoke.json",
    EVIDENCE / "settings-appimage-packaged-smoke.json",
    EVIDENCE / "settings-validation-summary.json",
    EVIDENCE / "settings-release-artifacts.json",
    EVIDENCE / "settings-baseline-check.json",
    stable_log,
    preview_log,
]
result = {
    "status": "pass",
    "checks": checks,
    "files": [
        {"path": str(path.relative_to(ROOT)), "bytes": path.stat().st_size, "sha256": digest(path)}
        for path in paths
    ],
    "preserved_failure_prefixes": failure_prefixes,
}
OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({"status": "pass", "checks": checks, "indexed_files": len(paths)}, indent=2))
