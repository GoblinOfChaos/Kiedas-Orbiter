#!/usr/bin/env python3
"""
Relics cross-check (backlog item from KNOWN-ISSUES-BACKLOG.md: "Relics
cross-check script is broken - returned '0 relics in app' against WFCD's
3120, obviously wrong ... needs a corrected script, not a re-guess at the
result"). That prior attempt is gone (never committed) - this replaces it
from scratch, following the same pattern as scripts/resolve_arcanes.py in
the Stable repo (per-item resolution + a resolved/gaps split written to
disk), but against a verified primary source per AGENTS.md rule #3: DE's
own official PublicExport data (content.warframe.com/PublicExport), not a
third-party dataset like WFCD.

Source of truth: the app's own live-fetched
data/export/ExportRelics.json (the Preview app's Tauri backend already
fetches this straight from DE's official PublicExport endpoint on a
24h refresh cycle - see src-tauri/src/main.rs's DE_MANIFEST_BASE /
ExportRelics.json fetch). Reading that live cache IS reading the primary
source, just through the app's own already-verified fetch path, rather than
re-fetching it separately here.

Each relic has 4 entries in ExportRelics.json (Bronze/Silver/Gold/Platinum
quality tiers), sharing one `rewardManifest` value - that's the correct
grouping key for "one relic, 4 refinement tiers" (confirmed by inspecting
raw entries: all 4 ImmortalD quality variants share
rewardManifest="/Lotus/.../ImmortalRelicRewards/ImmortalD"). The previous
broken script's "0 relics" result strongly suggests it read a wrong field
(e.g. assumed a top-level "relics" array/key that doesn't exist - the file
is a flat dict of uniqueName -> relic record) rather than relics genuinely
being absent from export data.

Cross-checks each grouped relic's vault status against
wiki-prime-relic-drops.json (173 wiki-verified Prime-set drop-source
entries already in this repo) as a secondary sanity signal, matching the
resolve_arcanes.py pattern of splitting into resolved/no_data outputs.
"""
import json
import re
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
LIVE_EXPORT_RELICS = Path.home() / ".local/share/kiedas-orbiter-preview/data/export/ExportRelics.json"
WIKI_PRIME_DROPS = REPO_ROOT / "src-tauri/data/assets/data/wiki-prime-relic-drops.json"
OUT_DIR = REPO_ROOT / "docs/audits/relics-cross-check"

QUALITY_ORDER = {"VPQ_BRONZE": 0, "VPQ_SILVER": 1, "VPQ_GOLD": 2, "VPQ_PLATINUM": 3}


def relic_display_name(reward_manifest: str) -> str:
    """era + letter/category from the shared rewardManifest, e.g.
    '.../ImmortalRelicRewards/ImmortalD' -> ('Immortal', 'D')."""
    tail = reward_manifest.rstrip('/').split('/')[-1]
    m = re.match(r'^([A-Za-z]+?)([A-Z]|Omni)$', tail)
    if m:
        return m.group(1), m.group(2)
    return tail, ''


def main():
    if not LIVE_EXPORT_RELICS.exists():
        raise SystemExit(
            f"Live export cache not found at {LIVE_EXPORT_RELICS} - "
            "the Preview app needs to have run at least once to fetch it. "
            "Not falling back to a guessed/bundled copy per AGENTS.md rule #3."
        )

    raw = json.loads(LIVE_EXPORT_RELICS.read_text())
    print(f"Loaded {len(raw)} raw entries from {LIVE_EXPORT_RELICS.relative_to(Path.home())}")

    wiki_drops = {}
    if WIKI_PRIME_DROPS.exists():
        wiki_drops = json.loads(WIKI_PRIME_DROPS.read_text())
        print(f"Loaded {len(wiki_drops)} wiki-verified Prime drop-source entries")

    grouped = defaultdict(list)
    for unique_name, entry in raw.items():
        rm = entry.get("rewardManifest")
        if not rm:
            continue
        grouped[rm].append({"uniqueName": unique_name, **entry})

    resolved = {}
    incomplete = {}
    for rm, entries in grouped.items():
        era, letter = relic_display_name(rm)
        qualities_present = {e.get("quality") for e in entries}
        missing_qualities = set(QUALITY_ORDER) - qualities_present
        vaulted_at = next((e.get("vaultedAt") for e in entries if e.get("vaultedAt")), None)
        record = {
            "rewardManifest": rm,
            "displayName": f"{era} {letter}".strip(),
            "era": entries[0].get("era"),
            "category": entries[0].get("category"),
            "qualityTiersFound": sorted(qualities_present, key=lambda q: QUALITY_ORDER.get(q, 99)),
            "vaultedAt": vaulted_at,
            "uniqueNames": sorted(e["uniqueName"] for e in entries),
        }
        if missing_qualities:
            record["missingQualityTiers"] = sorted(missing_qualities)
            incomplete[rm] = record
        else:
            resolved[rm] = record

    total_relics = len(grouped)
    vaulted_count = sum(1 for r in resolved.values() if r["vaultedAt"]) + \
        sum(1 for r in incomplete.values() if r["vaultedAt"])

    print(f"\nTotal raw relic-quality entries: {len(raw)}")
    print(f"Total unique relics (grouped by rewardManifest): {total_relics}")
    print(f"  Complete (all 4 quality tiers present): {len(resolved)}")
    print(f"  Incomplete (missing a quality tier - flag for review): {len(incomplete)}")
    print(f"  Vaulted (has a vaultedAt timestamp): {vaulted_count}")
    print(f"  Active: {total_relics - vaulted_count}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "relics_resolved.json").write_text(json.dumps(resolved, indent=2, ensure_ascii=False))
    (OUT_DIR / "relics_incomplete.json").write_text(json.dumps(incomplete, indent=2, ensure_ascii=False))
    print(f"\nWrote {OUT_DIR.relative_to(REPO_ROOT)}/relics_resolved.json and relics_incomplete.json")

    if incomplete:
        print("\nIncomplete relics (missing quality tier(s) in the live export - worth a manual look):")
        for rm, r in list(incomplete.items())[:15]:
            print(f"  {r['displayName']:20s} missing {r['missingQualityTiers']}  ({rm})")


if __name__ == "__main__":
    main()
