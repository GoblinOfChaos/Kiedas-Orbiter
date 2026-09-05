# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/). Releases before
1.3.4 didn't carry written notes — see the [Releases page](https://github.com/GoblinOfChaos/Kiedas-Orbiter/releases)
for binaries from that period; git history is the record for that era.

## [Unreleased]

### Added
- Inventory History screen: a chart of credits/platinum/endo/ducats/mods/items
  over time, a draggable time scrubber, item search and tracking, and a
  change log for the selected timespan.
- Market screen for warframe.market: view, create, edit, and close orders,
  cross-referenced against what you actually own.
- In-app Feature Guide and Global Hotkeys quick-reference modal.
- Exhaustive collectible guides (514 items), a complete Somachord 86-tune
  guide, and detailed Duviri/open-world landmark guides.
- Nightwave recovered-act tracking and syndicate/bounty character art across
  the Dashboard.
- A live-testing QA checklist alongside the existing code-review checklist.
- A fallback data source (WFCD) that fills gaps in the primary weapon/cosmetic
  export when it lags behind the live game, with an audit trail rather than
  blind merging.
- Full interface translation for Settings, Market, Relics, Cosmetics,
  Adversaries, Dashboard, Checklist, Maps, Inventory, Notes, the Acquisition
  Drawer, Riven Grade Drawer, and overlays — roughly 365 new keys across all
  15 supported locales.

### Fixed
- Mastery category totals for Primary/Secondary/Melee/Robotics/Vehicles no
  longer under- or over-count against a real profile.
- Cosmetics screen's Warframe tab miscategorization.
- Test Notification button played no sound; the price-refresh progress
  counter never visibly updated during a fetch.
- Notification threshold inputs accepted 0 or negative values, which silently
  made that trigger permanently unsatisfiable — now clamped to a minimum of 1.
- Broken wiki links for items with no confirmed wiki page.
- Relic OCR session race condition; an Adversaries date-parsing guard that
  could render "Invalid Date".
- Asset cache blocking the UI thread; Windows path handling in the asset
  cache.
- 16 companion parts with no image, and the relic picker occasionally
  rendering an empty overlay.
- Landing craft always showing "Unowned" regardless of real ownership; Ayatan
  sculpture cards not opening their acquisition drawer.
- Windows/macOS auto-updater signing (wrong environment variable names for
  Tauri v2).
- Eleanor and Ergo Glast vendor reset timers corrected to their real 4-day
  cycle.
- The riven-pricer data-refresh pipeline (`tools/riven-pricer`) now calls
  warframe.market's v2 API; the v1 endpoints it used before now return 404.
