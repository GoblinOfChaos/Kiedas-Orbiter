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

Kronos's existing riven market-price grading (ONNX model, local/portable,
`src-tauri/src/pricer.rs`) and relic-picker need-ranking gap are already
covered/superseded by adopting Kronos wholesale — no separate feature work
needed there beyond what's inherited.

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

## Scope boundaries (out of scope for this plan)

- No porting of wfinfo-ng's Python feature code (different stack; behavior
  knowledge carries over, code does not).
- No new riven-grading work — Kronos's ONNX-based grading is adopted as-is.
- No changes to Kronos's relic-picker overlay logic — out of scope unless
  a future gap is found after living with it.
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
6. Decide retirement plan for wfinfo-ng (archive vs keep running in
   parallel during transition).

## Testing

- Existing Kronos test/build tooling (`pnpm tauri build`) as the baseline
  smoke test after each step.
- New Relic Planner logic gets unit tests mirroring wfinfo-ng's existing
  relic-planner test coverage, adapted to the new stack's test runner.
- Collectibles dataset: spot-check a sample against community wiki
  sources for accuracy before shipping.
