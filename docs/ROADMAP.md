# Roadmap: everything still to do

Last updated 2026-09-24. Single source of truth; mirrored as GitHub issues labelled `roadmap`. Update this file at the end of every working session.

## Context

## Current state (baseline)

Restart Preview on the new build, then check off (issue tracker: one checklist issue "Live verification 2026-09-24"):
1. Riven flow: big hotkey prompt appears on the riven screen, hotkey arms grading, cycle -> new-roll overlay, accept -> left refreshes, leaving hides everything; "Additional Combo Count Chance" riven now priced.
2. Relic rewards: 2x Forma recognised as Forma; overlay session fix.
3. Chance lists sorted high-to-low everywhere (rotation order kept); wiki links open the Wiki tab; Fandom refused.
4. Narrow window: read `[INV-SCROLL]` lines from the app log to identify the second scrollbar; resize smoothness; language change/Reload UI without "Couldn't find callback id".
Outcome: close #112 and #114 (already fixed), mark #109 items resolved, capture any regressions as new issues.

**1A. Adopt the DE PublicExport pipeline in the app (fixes missing Narin/Citrine Prime, stale exports; closes DATA-001).**
- Inputs already built: `scripts/de-export/de-export.mjs`, `docs/pipeline/COMPAT-LEDGER.md` (127 DE Warframes vs 125 in app, 113 more customs, ~280 more relics/arcanes), `docs/pipeline/PHASE2-CACHE-DESIGN.md`.
- Steps: (a) resolve semantic mismatches in the ledger (Regions, Keys, FusionBundles/Bundles) with a normalisation adapter per category producing the export-plus-shaped files the app consumes; (b) shadow mode: run the adapter output beside the mirror and report differences in the log for a week; (c) category-by-category cut-over starting with Warframes, then weapons, customs, relics/arcanes, resources, upgrades, recipes, with the mirror as fallback; (d) Rust: replace `EXPORT_FILES` mirror download in `check_exports` (main.rs ~L271-470) with the cache client (versioned generations, atomic swap, last-known-good, count-collapse guard, once per 24 h + manual button); (e) localisation: keep `download_locale_upgrades` pattern for `_<lang>` exports.
- Gates: node tests per adapter with golden fixtures, the compat ledger regenerated with zero unexplained diffs per cut-over, live check that Narin appears in the Warframes list and Foundry.

**1B. Drop tables and wiki data at runtime.** Replace the community drop index (`drops.warframestat.us`) with DE's own drop tables (parser + refresh script already built and validated: 52,914 rows, 0 errors); wire `wikiStore` (already bundled) into `MonitoringContext` loading; keep warframestat as cross-check only. Gate: `scripts/check-chance-order.mjs` and a new parity report (old vs new source rows per item, differences reviewed).

**1C. Data-watch stages 2-4** (plan in earlier session, PR #117 is stage 1):
- Stage 2: refresh + validation + commit of validated snapshots to the `data-updates` branch, `manifest.json` with per-source hashes and `schemaVersion`; WorldState schema and glyph probes; auto-close resolved issues; revert procedure.
- Stage 3 (Preview app): `dataChannel` client (launch check <=1/24 h + Settings button), downloads changed files from `raw.githubusercontent.com/.../data-updates`, hash + JSON + count-collapse validation, atomic swap, rollback, "Data as of <date>" and "App update needed" states. Depends on 1A/1B consumers.
- Stage 4: PR + version-bump automation for changes needing code (dependency `warframe-items` bump, new category), CHANGELOG line, in-app notifications via `notificationManager`.
- Housekeeping found: `trigger_release.sh` pushes `master` but branch is `main`; `discord_release.yml` still says "Cephalon Kronos"; missing automation labels (created by data-watch on first run).

**1D. Remaining data gaps** (small, ordered): #111 acquisition text in 9 uncovered locales (fr, it, ja, ko, pl, tc, th, tr, uk): needs a decision on machine translation vs English fallback (rule: no guessed game text; official DE localisation for node/planet/item names only); DATA-ACQ-003 (22 cosmetics with no route, 15 event-only decorations); relics cross-check script rewrite; full WFCD cross-check for Gear/Rivens/Syndicates/Nightwave/K-Drive/Necramech/Focus/Amps; browse.wf glyph supplement decision (keep/disable).

## Phase 2: Farm next screen and Farming Targets completion

From `docs/superpowers/specs/2026-09-24-farming-targets-farm-next-design.md` (approved). Engine + proof done; remaining, each as its own short plan:
- **2A Screen (Stage 2):** Farming Targets route redesign: ledger table (Item, Required, Owned, Reserved, Still needed, Used by, Source), Farm-next panel with tabs (All, Missions, Enemies, Planets, Relics, Vendors, Conclave), honesty badges, chance on every row, min-chance filter (off by default), mission-type/faction filters, group-by-planet, target inspector; store migration from the MVP `aggregation.js`; i18n for all locales.
- **2B Relic places (Stage 3):** relic coverage ranking with owned/vaulted state from inventory and existing relic data; integrate DE `relicRewards`.
- **2C 9.8 remainder (Stage 4):** reservations UI + overcommit state, reminders/due dates in-app only, priorities, archive/complete, compact 3-view layout, links from Inventory ("add as target"), Foundry, Relic Planner, Relics, Prime Resurgence, Dashboard counts; the full acceptance list from plan 9.8; enemy-area join improvements only via verified deterministic aliases (audit today: planets 713/1007, missions 55/624 matched).

## Phase 3: Product features and bugs still open

| Item | Source | Plan |
|---|---|---|
| Riven listing on warframe.market | #109; docs verified 2026-09-23: no auction API documented | Blocked; file a request at 42bytes-team/docs issues; revisit when documented |
| EE.log path picker (Browse, auto-detect, status, move next to cache row) | memory to-do | Small UI task (Settings.jsx) |
| Inventory double horizontal scrollbar | live finding | Fix after `[INV-SCROLL]` data (phase 0) |
| Window-resize stutter; #116 WebKit slowdown | #109/#116 | Throttling + 60 s heartbeat already in; analyse heartbeat logs after a long session; act on data |
| Stable-only: "Maroo's Ayatan Hunt" checklist wrong | #109 | Reproduce on Stable; small fix if still present |
| 4 "needs live verification" items (session token, sidebar resize handle right side, toast, ...) | #109 | Fold into phase 0 checklist |
| IPC-RUNTIME-001 | #109 | Fixed (safeReload); verify live then close |
| PERF-001 chunk sizes | #109 | Low priority; manualChunks split after features settle |
| SEC-CSP-002 (script unsafe-inline) | #109 | Investigate removing with hashes/nonces; low |
| DEP-001 (h2 in Stable; tract-nnef RUSTSEC) | #109 | Dependency bumps in Stable; needs explicit go-ahead per Cargo change |

## Phase 4: Preview to Stable promotion and release

## Phase 5: Housekeeping and process

- Antigravity reliability: keep jobs small and read-only, explicit prompt; note quota/timeouts.
- Documentation: update ARCHITECTURE/README for wiki store, data-watch, farming engine; regenerate `docs/pipeline` ledger after cut-overs; keep the roadmap as `docs/ROADMAP.md` (single source, updated each session) and mirror open items as GitHub issues with labels (`data`, `preview`, `farm-next`, `verification`, `blocked`).

## Suggested execution order (each step ends with user-visible proof)

2. 1A DE pipeline: Warframes cut-over first (fixes Narin), then remaining categories.
3. 1B DE drop tables + wiki store wired in; parity report.
5. 2A Farm-next screen, 2B relics, 2C remainder.
6. Phase 3 items in parallel where cheap (EE.log picker, badge icon once icon supplied).

## Status log

- 2026-09-24: roadmap created; Phase 1A first slice (Warframes adapter, shadow mode) dispatched; GitHub issues created.

## Verification of the roadmap itself

- Every item traces to a source (issue number, memory note, spec/plan doc, or verified finding).
