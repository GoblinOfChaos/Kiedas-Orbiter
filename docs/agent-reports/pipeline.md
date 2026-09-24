# Agent report: direct DE export pipeline

## Plan

1. Inspect the existing comparator, ledger, runtime export layout, bundled WFCD
   data, and Rust export functions.
2. Run a read-only shadow comparison using the allowed Preview runtime export
   directory and cached DE assets, adapting filename aliases as needed.
3. Record counts, named diffs, severity, three-record field observations, and
   WFCD counts in the ledgers.
4. Add a design-only Phase 2 cache document and perform static verification.

## Summary

Completed the Round 2 runtime-baseline comparison. The comparator now
recognizes the export-plus aliases ExportRelics, ExportBundles, and
ExportRewards. The ledger records real DE/app counts, Narin and representative
Warframe/weapon/Custom/relic differences, severity-ranked mismatches, field
mapping observations, and bundled WFCD counts. Added the requested Phase 2
versioned-cache design; no application code or external data was modified.

## Files changed

- scripts/de-export/shadow-compare.mjs
- docs/pipeline/COMPAT-LEDGER.md
- docs/pipeline/COMPAT-LEDGER.json
- docs/pipeline/PHASE2-CACHE-DESIGN.md
- AGENT_REPORT.md

## Round 2 evidence

- DE cache: /home/jedwards/.cache/kiedas-de-export
- Preview baseline: /home/jedwards/.local/share/kiedas-orbiter-preview/data/export
- DE Warframes 127 vs app 125; DE-only Citrine Prime and Narin.
- DE Weapons 841 (839 unique) vs app 843; 4 DE-only and 8 app-only.
- DE Customs 4,832 vs app 4,722; 113 DE-only and 3 app-only.
- DE RelicArcane 3,369 vs app Relics 3,089; 280 DE-only.
- Bundled WFCD: 121 Warframes and 640 weapons.
- Highest-risk findings are FusionBundles/ExportBundles, Keys, and Regions;
  their namespaces or field models are not equivalent by count alone.

## Verification

- nice -n 19 node --check scripts/de-export/shadow-compare.mjs: passed.
- nice -n 19 node scripts/de-export/shadow-compare.mjs
  /home/jedwards/.cache/kiedas-de-export
  /home/jedwards/.local/share/kiedas-orbiter-preview/data/export: passed;
  reported all category counts and severity.
- A finite nice-prefixed Node inspection compared uniqueName sets, three
  matching records per category, and wfcd-combined.json counts.
- JSON parse checks for COMPAT-LEDGER.json and the DE provenance passed.
- git diff --check: passed.
- No cargo, tauri, vite, npm, pnpm, build, or test command was run.
- No DE download was made in Round 2; cached assets were reused.

## Open questions and risks

- The ledger stores exact counts and representative named Custom/relic
  differences; the complete 113 Custom and 280 relic uniqueName arrays remain
  available from the finite comparison output but are not duplicated in the
  human-readable markdown. A follow-up may choose to materialize those lists
  as a separate checked-in diff artifact.
- ExportRegions, ExportKeys, and ExportFusionBundles show semantic mismatches;
  app-only records must not be treated as removals without an adapter review.
- Phase 2 is design only. Rust compilation and live app consumption were not
  verified per task restrictions.

## Suggested follow-ups

- Review the semantic mismatch categories before implementing a DE adapter.
- Decide whether a generated full-diff artifact is desired before Phase 2.
- Coordinator may perform the Preview-only build/runtime validation separately
  under the repository CPU rules.
