#!/usr/bin/python3
"""Record only non-sensitive structural facts about ground-truth custom markers."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


INVENTORY = Path("/var/home/jedwards/.local/share/kiedas-orbiter/data/user/inventory.json")
OUTPUT = Path("/var/home/jedwards/kiedas-orbiter/docs/revamp/stage-3/evidence/maps-custom-marker-source-fact.json")
if not INVENTORY.is_file():
    result = {
        "source": str(INVENTORY),
        "available": False,
        "custom_markers_available": False,
        "note": "Ground-truth player inventory was unavailable; no game-marker fixture may be invented.",
    }
else:
    raw = INVENTORY.read_bytes()
    data = json.loads(raw)
    groups = data.get("customMarkers")
    if not isinstance(groups, list):
        groups = []
    group_keys = sorted({key for group in groups if isinstance(group, dict) for key in group})
    marker_info_keys = sorted({
        key
        for group in groups if isinstance(group, dict)
        for info in group.get("markerInfos", []) if isinstance(info, dict)
        for key in info
    })
    marker_keys = sorted({
        key
        for group in groups if isinstance(group, dict)
        for info in group.get("markerInfos", []) if isinstance(info, dict)
        for marker in info.get("markers", []) if isinstance(marker, dict)
        for key in marker
    })
    marker_count = sum(
        len(info.get("markers", []))
        for group in groups if isinstance(group, dict)
        for info in group.get("markerInfos", []) if isinstance(info, dict) and isinstance(info.get("markers"), list)
    )
    result = {
        "source": str(INVENTORY),
        "source_sha256": hashlib.sha256(raw).hexdigest(),
        "available": True,
        "custom_markers_available": bool(groups and marker_count),
        "group_count": len(groups),
        "marker_count": marker_count,
        "group_keys": group_keys,
        "marker_info_keys": marker_info_keys,
        "marker_keys": marker_keys,
        "sensitive_values_recorded": False,
        "note": "Only schema keys and counts are recorded; labels, coordinates, tags, paths and inventory contents are omitted.",
    }
if OUTPUT.exists():
    raise FileExistsError(OUTPUT)
OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
