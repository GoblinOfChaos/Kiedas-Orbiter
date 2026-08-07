# Future features (convert to GitHub issues once this repo is pushed)

## Auto-start toggles for background services

wfinfo-ng had per-service "start automatically on launch" settings
(autostart_manager.py / service_registry). Kieda's Orbiter should have
the same for its background services:

- **Inventory sync**: currently auto-starts correctly if Warframe is
  already running when the app launches (confirmed working as-is,
  2026-08-07).
- **Log scanner** (EE.log tailer, powers the real-time overlays):
  its Settings toggle correctly *shows* on/off state saved from the
  last session, but does not actually restart the scanner backend on
  launch - confirmed it went from on to idle across a rebuild/restart,
  2026-08-07. Kronos's own wiki doesn't document either service as
  guaranteed to auto-resume (Getting-Started.md only says inventory
  Live Monitoring "persists across sessions" - no such claim for the
  log scanner), so this may be intentional current behavior rather
  than a bug, but the UI showing "on" while the backend is actually
  idle is misleading either way.

Feature request: add an explicit "start automatically when app
launches" option for each background service (inventory sync, log
scanner), independent of just remembering the toggle's last visual
state - matching the autostart control wfinfo-ng offered.

## Baro Ki'Teer ownership indicator

Baro Ki'Teer's inventory screen lists his current offerings but doesn't
show whether you already own each item, unlike Equipment/Mods/Arcanes
tabs which do. Feature request: cross-reference Baro's offer list
against owned inventory the same way those other tabs do, so it's
clear at a glance what you still need from him.

## Missing-item + acquisition info gaps (needs a systematic pass)

Noticed while comparing against wfinfo-ng's ("original Orbiter")
equivalent tabs, 2026-08-07:

- **Mods tab**: only lists mods you own. No "missing" view, and
  clicking a mod gives no info on how/where to acquire it.
- **Inventory tab**: same gap - no acquisition/"how to get this"
  info surfaced for missing items.
- **Rivens tab** (`RivenCard.jsx`/`Rivens.jsx`, not just the overlay):
  displays Kronos's market-price-based grade. Per the design spec
  (docs/superpowers/specs/2026-08-07-kronos-fork-design.md in
  wfinfo-ng), this should switch to wfinfo-ng's stat-based grading
  (`_grade_riven`), same change already planned for the riven overlay
  - the tab was missed as a second place the same swap applies.

Jacob's ask: go tab-by-tab comparing Kieda's Orbiter against
wfinfo-ng's equivalent tabs (Equipment, Mods, Arcanes, Missing Parts,
Rivens, etc.) to find every place wfinfo-ng surfaced "what am I
missing + how do I get it" that this fork doesn't yet. Needs a proper
brainstorming session (not a quick fix) to decide the best UI pattern
for surfacing acquisition info consistently across tabs, rather than
solving it differently per tab.
