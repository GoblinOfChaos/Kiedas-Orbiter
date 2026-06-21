# Feature

Here's a list of all features the application includes, sorted by screen order.

## Dashboard

Live world-state data:
- Bounties
- Fissures
- Sorties and Archon Hunt
- Arbitrations, current and upcoming with tiers
- Steel Path Incursions
- Nightwave challenges and progress
- Circuit rewards
- 1999 calendar
- Open-world cycles (day/night, warm/cold, Vome/Fass)
- Event and Alerts tracker
- Darvo's Daily Deals
- Archimedea modifiers
- Descendia
- Invasions
- News
- Ability to hide individual cards

## Inventory & Foundry
- Widget in header showing currencies and important components like Formas (with breakdown on hover), Reactors and Catalysts
- Searchable/filterable inventory
- Prime sets view with plat value and completion sorting
- Foundry panel to show available and crafting blueprints, filterable depending on readiness to craft tracking
- Ayatan statues with recommendation on which one to fill first for maximum endo gain

## Mods

- Full non-riven mod inventory browser
- Search and filter by name, polarity, rarity, and value
- Visual mod card rendering
- Parazon mods (Requiem, Antivirus and Potency) show charges
- Arcanes also included

## Rivens

- Display all owned rivens
- View veiled riven challenges
- **Price prediction**: ONNX neural network trained on warframe.market data. For each riven:
  - Weapon popularity in trading
  - Estimated platinum price
  - Grading (relative to weapon)
  - Expected value and reroll potential

## Relics

- Track owned relics and see void trace count
- Search for relic name or drop
- Shows ducat and plat value for each drop
- Sorting by refinement gain for either ducat or platinum
- Sorting by plat value in respects to selected parameters (squad size and squad refinement, e.g. radshare)

## Mastery Tracker

- MR progress bar with XP totals, showing percentage until next rank
- Mastery breakdown by category (Warframes, Weapons, Companions, etc.)
- Starchart completion tracking (nodes cleared)

## Notes

- Markdown notepad
- Create, edit, delete notes
- Notes saved as `.md` files on filesystem

## World Maps

- Pannable/zoomable maps for:
  - Plains of Eidolon (Earth)
  - Orb Vallis (Venus)
  - Cambion Drift (Deimos)
  - Duviri
- Add overlaid configurations with markers and paths for e.g. fishing routes and mining hotspots

## Collectibles (TODO)

Tracked from inventory data:
- **Kuria** (56 total)
- **Somachord Tunes** (55)
- **Frame Fighter Fragments** (42)
- **Cephalon Fragments** (43)
- **Leverian Prex Cards** (50)
- **Caves** (Plains, Orb Vallis, Fortuna, Necralisk)
- **Lore Fragments**: Glass Shard, Encrypted Journal, Nakak Memory, Fortuna, Albrecht's Notes, Partnership, The Tenets
- **Thousand-Year Fish** (20)

No manual tracking needed - sourced from inventory scan.

## Checklist & Syndicates

- Daily/weekly repeating task tracking with ability to hide certain tasks completely
- Focus school progress and current focus for each
- Standings for all 6 factions and all the other syndicates

## Settings

- **Theme picker**: Color themes via CSS variables and custom cursors
- **Monitoring**: Start/stop inventory scanning
- **Hotkeys**: Global hotkeys, currently only manual relic reward screen OCR
- **Overlays**: Test buttons, position picker with 2 notification sounds to pick from, game UI scale input
- **Paths**: Path pickers for EE.log and Cache.Windows
- **Notifications**: Pick from various triggers such as foundry completion, S tier arbitration coming up, a new Void Fissure with certain filters etc.
- **Updater**: Check for new versions
- **Price cache**: Force refresh price manifest


