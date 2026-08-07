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
