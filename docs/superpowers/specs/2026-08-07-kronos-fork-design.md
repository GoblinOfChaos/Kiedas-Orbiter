# Design: Fork Cephalon Kronos as new app base

## Decision

Abandon wfinfo-ng's PyQt codebase as the primary app going forward. Fork
`cephalon-kronos` (Rust/Tauri/React, MIT + Commons Clause license) at
`/var/home/jedwards/cephalon-kronos`, rebrand it, and add the two features
Kronos is missing that wfinfo-ng already has or needs:

1. Relic Planner ("which relics give me part X, that I own") — wfinfo-ng
   has this (`RELIC_PLANNER_TAB.py`, dormant/unwired); Kronos has nothing
   equivalent.
2. Collectibles with individual items + locations — neither app has this
   today. Kronos only shows aggregate found/total counts per category
   (`src/screens/Collectibles.jsx`). Needs a wiki-sourced per-item dataset
   (name, category, location/coordinates) and new list UI.
3. Relic recommend/picker overlay (`RelicPickerOverlay.jsx`) — currently
   sorts only by raw ducat/plat EV (`ducat_top`/`plat_top` columns, no
   ownership or need awareness). Add the need-based ranking wfinfo-ng
   already does (`relic_recommend_watcher.py`'s `ev_need` — value still
   missing from parts you don't own/haven't crafted) as an additional
   sort/column alongside the existing ducat/plat views, not a replacement.
4. Riven grading (`RivenCard.jsx` grade badge, `src-tauri/src/pricer.rs`
   `grade_from_cdf`) — currently grades S/A/B/C/D purely from where the
   ONNX-predicted price falls in the market price distribution. Change
   the *grade* to be computed from wfinfo-ng's stat-based grading logic
   (`riven_grader_watcher.py`'s `_grade_riven`, matched against the
   Megrim & Valkyrial good-combo data) instead. Keep Kronos's ONNX price
   estimate displayed as-is (e.g. "~340p est.") — it's just no longer
   what drives the tier label.

## Licensing / attribution requirements

- Keep Kronos's `LICENSE` file (MIT + Commons Clause) intact in the new repo.
- Commons Clause applies only to the bundled `warframe-api-helper` binary
  (blocks selling); rest of the app is plain MIT (use/modify/redistribute
  freely as long as not sold).
- Add visible attribution: About/Credits screen crediting glowseeker /
  Cephalon Kronos as the base, plus README credit, satisfying MIT's
  "include copyright notice" condition and the spirit of "clearly labeled
  as different, full credit given."
- Rebrand app name, icon, window title, splash — swap glowseeker-branded
  assets for new ones. Keep Kronos's UI/layout/CSS (the part being kept
  intentionally).

## Cross-platform requirement

Kronos currently ships Windows, Linux, and macOS builds (per its README;
macOS untested upstream, Linux noted as potentially unstable across
distros). The fork must keep working on every platform Kronos currently
supports — no feature added in this plan (Relic Planner, collectibles
dataset, need-sort overlay, stat-based riven grading) may be Linux-only
or introduce a platform-specific dependency without an equivalent path on
Windows/macOS. Each feature step's testing includes a build/run check on
Windows (Jacob's existing VM test setup) in addition to Linux, before
being considered done.

## Scope boundaries (out of scope for this plan)

- No porting of wfinfo-ng's Python feature code (different stack; behavior
  knowledge carries over, code does not).
- Collectibles dataset sourcing (which wiki/guide, data format) is a
  research sub-step inside this plan, not pre-solved here.

## High-level steps (detail lives in the implementation plan)

1. Fork/clone cephalon-kronos into a new repo under Jacob's control.
2. Rebrand: name, icon, splash, About/Credits screen, README attribution.
3. Verify local build works end-to-end (Linux) before any feature work.
4. Build Relic Planner screen (React) + backend command (Rust), porting
   the need-matching algorithm from `RELIC_PLANNER_TAB.py`.
5. Source a per-item collectible + location dataset (wiki-derived) and
   build a Collectibles detail view (per-item list, not just aggregate
   counts) alongside Kronos's existing category progress cards.
6. Add need-based sort to the relic recommend/picker overlay, porting
   the `ev_need` ranking logic from `relic_recommend_watcher.py`, as an
   additional option alongside Kronos's existing ducat/plat top lists.
7. Swap the riven grade-badge source from ONNX-price-CDF to wfinfo-ng's
   stat-based `_grade_riven` logic, ported into Rust/React, while keeping
   the existing ONNX price estimate displayed alongside the new grade.
8. Decide retirement plan for wfinfo-ng (archive vs keep running in
   parallel during transition).

## Testing

- Existing Kronos test/build tooling (`pnpm tauri build`) as the baseline
  smoke test after each step.
- New Relic Planner logic gets unit tests mirroring wfinfo-ng's existing
  relic-planner test coverage, adapted to the new stack's test runner.
- Collectibles dataset: spot-check a sample against community wiki
  sources for accuracy before shipping.
