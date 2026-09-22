#!/usr/bin/env python3
"""
GitHub #111 Phase 1: mine the free-text override strings in
acquisition_overrides.json ("components" + "mods" - 12,295 entries) into a
small set of reusable templates via Drain3 (log-template-mining), so a later
phase can translate the templates themselves instead of every raw entry.

Reports only - never touches acquisition_overrides.json. Writes a new,
separate file: data/assets/data/acquisition_override_templates.json.

Critical constraint (see the plan / GH #111): src/lib/acquisitionInfo.js has
an extensive chain of regex guards that match directly against the raw
English overrideText (Baro / market purchase / clan research / dojo
research / etc.) to decide precedence against structured acquisition
routes. Any later runtime substitution must never feed a template's
localized render into those guards - the guards must keep running against
the ORIGINAL raw English string. This script's only job is to tag each
template with which guard keyword(s) it contains, so a future phase knows
which templates are guard-sensitive and must not have their guard-relevant
prefix substituted away.

Usage:
    pip install drain3   # already present in this environment
    python3 scripts/extract_acquisition_templates.py
"""
import json
import re
from collections import defaultdict
from pathlib import Path

from drain3 import TemplateMiner
from drain3.masking import RegexMaskingInstruction
from drain3.template_miner_config import TemplateMinerConfig

REPO_ROOT = Path(__file__).parent.parent
OVERRIDES_PATH = REPO_ROOT / "src-tauri/data/assets/data/acquisition_overrides.json"
OUTPUT_PATH = REPO_ROOT / "src-tauri/data/assets/data/acquisition_override_templates.json"

# Substrings the acquisitionInfo.js guard regexes key off of (see lines
# ~767-840 there). A template containing one of these, case-insensitively,
# gets tagged so Phase 3 knows not to touch that portion of the string.
GUARD_KEYWORDS = [
    "Baro",
    "Market purchase",
    "Market bundle",
    "Clan Research",
    "Dojo Research",
]


def build_template_miner() -> TemplateMiner:
    # Drain3's default tokenizer/similarity settings are fine for these short
    # sentences, but masking_instructions is empty by default - without it,
    # "for 35 Platinum" and "for 45 Platinum" never merge into one template
    # with a <*> slot, they just stay two separate, less-useful templates
    # (confirmed: an earlier run of this script with no masking config
    # produced fixed-price "templates" with zero <*> tokens at all). Mask
    # numbers (with $ / commas / decimals) BEFORE clustering, matching the
    # issue's own prior analysis ("after normalizing quoted names and
    # numbers") so genuinely-parameterized entries actually collapse.
    config = TemplateMinerConfig()
    config.drain_sim_th = 0.7
    config.drain_depth = 4
    config.masking_instructions = [
        RegexMaskingInstruction(r"\$?\d[\d,]*(?:\.\d+)?", "*"),
    ]
    return TemplateMiner(config=config)


def guard_hint_for(template: str) -> list[str]:
    hits = []
    for kw in GUARD_KEYWORDS:
        if re.search(re.escape(kw), template, re.IGNORECASE):
            hits.append(kw)
    return hits


def main():
    overrides = json.loads(OVERRIDES_PATH.read_text())

    # Per the issue's own scoping: components + mods (12,295 entries).
    # rivens_general (188 entries) is free text too but wasn't part of the
    # issue's counted scope - left out of this pass, can be folded in later
    # by widening `sections` below if a future session wants it.
    sections = {"components": overrides.get("components", {}), "mods": overrides.get("mods", {})}
    total_entries = sum(len(v) for v in sections.values())
    print(f"Loaded {total_entries} entries across {list(sections.keys())}")

    miner = build_template_miner()

    # Pass 1: feed every entry to Drain3 just to build the clustering tree.
    # Drain3 refines a cluster's template as more matching lines arrive, so
    # the template_mined seen on an entry's FIRST pass through add_log_message
    # is not necessarily its cluster's final, fully-generalized form (confirmed:
    # extracting params against each entry's own per-call template produced
    # inconsistent param counts for entries in the same final cluster - some
    # keys got 2 params, others 4, for byte-identical raw text). Only
    # (section, key, text, cluster_id) is kept from this pass.
    entry_count = 0
    pending: list[tuple[str, str, str, int]] = []
    for section_name, entries in sections.items():
        for key, text in entries.items():
            if not isinstance(text, str) or not text.strip():
                continue
            entry_count += 1
            result = miner.add_log_message(text)
            pending.append((section_name, key, text, result["cluster_id"]))

    # Pass 2: now that every cluster has seen all its members, look up each
    # cluster's FINAL template and re-extract params against that - guarantees
    # every key under a given templateId has a param count matching that
    # template's actual, final <*> slot count.
    final_template_by_cluster = {c.cluster_id: c.get_template() for c in miner.drain.clusters}

    clusters: dict[int, dict] = {}
    for section_name, key, text, cluster_id in pending:
        template = final_template_by_cluster[cluster_id]
        params = miner.extract_parameters(template, text, exact_matching=True)
        param_values = [p.value for p in params] if params else []

        if cluster_id not in clusters:
            clusters[cluster_id] = {
                "pattern": template,
                "guardHints": guard_hint_for(template),
                "keys": [],
            }
        clusters[cluster_id]["keys"].append(
            # `text` (the exact raw override string) is stored alongside
            # params rather than relying on reconstructing it from
            # pattern+params at runtime - Drain3 can leave a stray literal
            # fragment in `pattern` when a cluster's varying token didn't
            # get fully wildcarded (confirmed: one TennoGen designer-name
            # cluster kept "led" as fixed text even though other members
            # of the same cluster have completely different names), so
            # reconstruction doesn't reliably round-trip. Storing the
            # source text directly makes the runtime lookup exact.
            {"section": section_name, "key": key, "params": param_values, "text": text}
        )

    # Sort templates by coverage (entry count) descending - matches the
    # issue's own "top-N templates cover most entries" framing, so Phase 2
    # can just take clusters[:N] to translate the highest-value set first.
    sorted_clusters = sorted(clusters.values(), key=lambda c: len(c["keys"]), reverse=True)

    # Guard against the exact bug fixed above (mismatched param counts within
    # one template) ever shipping silently again: every key under a template
    # must have the same param count as that template has <*> slots.
    for c in sorted_clusters:
        expected = c["pattern"].count("<*>")
        for k in c["keys"]:
            if len(k["params"]) != expected:
                raise AssertionError(
                    f"param count mismatch in template {c['pattern']!r}: "
                    f"expected {expected}, got {len(k['params'])} for key {k['key']!r} (text: {k['text']!r})"
                )

    registry = {
        "_meta": {
            "sourceEntries": entry_count,
            "uniqueTemplates": len(sorted_clusters),
            "generatedBy": "scripts/extract_acquisition_templates.py",
            "note": (
                "Separate from acquisition_overrides.json by design - the raw "
                "English fallback path stays untouched. See GH #111."
            ),
        },
        "templates": [
            {
                "templateId": f"tpl_{i:04d}",
                "pattern": c["pattern"],
                "coverage": len(c["keys"]),
                "guardHints": c["guardHints"],
                "keys": c["keys"],
            }
            for i, c in enumerate(sorted_clusters)
        ],
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(registry, indent=2, ensure_ascii=False))

    top15_coverage = sum(t["coverage"] for t in registry["templates"][:15])
    guard_sensitive = sum(1 for t in registry["templates"] if t["guardHints"])
    print(f"\nWrote {OUTPUT_PATH.relative_to(REPO_ROOT)}")
    print(f"{entry_count} entries -> {len(sorted_clusters)} unique templates")
    print(f"Top 15 templates cover {top15_coverage} entries ({100 * top15_coverage / entry_count:.1f}%)")
    print(f"{guard_sensitive} templates contain a guard-regex keyword (Baro/Market/Research) - flagged in guardHints")
    print("\nTop 10 templates by coverage:")
    for t in registry["templates"][:10]:
        hint = f" [GUARD: {', '.join(t['guardHints'])}]" if t["guardHints"] else ""
        print(f"  {t['coverage']:>5}x  {t['pattern'][:90]}{hint}")


if __name__ == "__main__":
    main()
