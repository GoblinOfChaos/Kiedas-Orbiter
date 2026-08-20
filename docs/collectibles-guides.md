# Kiedas Orbiter Collectibles Guide

This is a standalone reference for the collectibles shown by the Collectibles
screen. It is not app data and is not loaded by the program.

## How to read this guide

The Collectibles screen currently has 19 cards:

- Series: Kuria, Lost Islands of Duviri, and Isleweaver Fragments.
- Open-world markers: Plains of Eidolon Caves, Orb Vallis Caves, Fortuna, and
  Necralisk.
- Lore fragments: Somachord Tunes, Frame Fighter Fragments, Cephalon
  Fragments, Leverian Prex Cards, Thousand-Year Fish, Encrypted Journal
  Fragments, Glass Shard Fragments, Fortuna Fragments, Albrecht's Notes, Nakak
  Memory Fragments, The Tenets, and Partnership Fragments.

Fragment names and totals are read by the app from DE's `ExportCodex` at
runtime. The export uses internal item identifiers for several families, so a
lettered identifier below is an item identity, not a claimed lore title. Where
the game or wiki does not establish a fixed item-to-location mapping, this
guide says so instead of guessing.

## Series collectibles

### Kuria — 56 total

Scan the Kuria statue in the listed tileset/mission. These are the individual
series slots used by the app; the number is the in-game guide identifier.

| Items | Where to search |
|---|---|
| Kuria 1-1, 1-2 | Corpus Gas City (Jupiter): Ananke Capture |
| Kuria 1-3, 1-4 | Grineer Forest (Earth): Cambria Spy; 1-4 is mission-exclusive |
| Kuria 2-1 | Corpus Gas City (Jupiter): Thebe Sabotage or Ananke Capture |
| Kuria 2-2 | Corpus Gas City (Jupiter): Carme Mobile Defense |
| Kuria 2-3 | Corpus Gas City (Jupiter): Ananke Capture |
| Kuria 2-4 | Grineer Forest (Earth): Cambria Spy |
| Kuria 3-1, 3-2, 3-3 | Grineer Galleon (Saturn): Cassini Capture |
| Kuria 3-4 | Grineer Forest (Earth): Cambria Spy |
| Kuria 4-1, 4-2 | Grineer Sealab (Uranus): Ariel Capture |
| Kuria 4-3, 4-4 | Grineer Sealab (Uranus): Ariel or Cressida |
| Kuria 5-1 | Grineer Sealab (Uranus): Ariel, Cressida, or Ophelia |
| Kuria 5-2 | Grineer Sealab (Uranus): Titania Assassination |
| Kuria 5-3 | Grineer Sealab (Uranus): Ariel Capture |
| Kuria 5-4 | Grineer Sealab (Uranus): Ariel or Ophelia |
| Kuria 6-1 | Grineer Sealab (Uranus): Rosalind Spy |
| Kuria 6-2 | Grineer Sealab (Uranus): Desdemona Sabotage |
| Kuria 6-3, 6-4 | Grineer Sealab (Uranus): Ariel Capture |
| Kuria 7-1, 7-3, 7-4 | Grineer Settlement (Mars): Ara Capture |
| Kuria 7-2 | Grineer Settlement (Mars): Spear Defense |
| Kuria 8-1, 8-2, 8-3 | Grineer Settlement (Mars): Ara or Vallis |
| Kuria 8-4 | Grineer Settlement (Mars): Ara or Augustus |
| Kuria 9-1 | Grineer Settlement (Mars): Augustus Excavation |
| Kuria 9-2 | Grineer Sealab (Uranus): Ariel Capture |
| Kuria 9-3 | Grineer Settlement (Mars): Ara Capture |
| Kuria 9-4 through 13-2 | Grineer Shipyard (Ceres): primarily Lex Capture; 12-3 is Bode Spy, and 13-2 is Bode or Ker |
| Kuria 13-3 | Grineer Shipyard (Ceres): Bode or Ker |
| Kuria 13-4 | Grineer Sealab (Uranus): Cressida or Ariel |
| Kuria 14-1 | Corpus Outpost (Venus): Kiliken Excavation |
| Kuria 14-2, 14-3, 14-4 | Corpus Outpost (Venus or Neptune): Venera or Galatea |

For room-by-room screenshots and the complete map-style route, use the [Kuria
guide on the Warframe Wiki](https://wiki.warframe.com/w/Kuria) or the [Steam
Kuria guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2442543473).

### Lost Islands of Duviri — 90 total

There are nine numbered fragments per island. The app identifiers below list
all 90 items; the location is shared by the nine entries in each row.

| Items | Island and search area |
|---|---|
| Duviri Fragment 1-1 through 1-9 | The Caves of Academe / Archarbor: dome, trees, caves, and consoles |
| Duviri Fragment 2-1 through 2-9 | Lake Verula: waterfall and lake region |
| Duviri Fragment 3-1 through 3-9 | Scholar's Landing: southern-middle island near The Agora and Watershed Hamlet |
| Duviri Fragment 4-1 through 4-9 | We Are Not What We Were: caves and areas beneath cliffs |
| Duviri Fragment 5-1 through 5-9 | Watcher's Island: caves and altars |
| Duviri Fragment 6-1 through 6-9 | The Galleria: barracks, cabins, and bushes |
| Duviri Fragment 7-1 through 7-9 | The Doll Mausoleum: secret caves and hidden areas |
| Duviri Fragment 8-1 through 8-9 | Manipura Island: vineyard island |
| Duviri Fragment 9-1 through 9-9 | The Island of Lorn: caves and statues |
| Duviri Fragment 10-1 through 10-9 | The Bleeding Earth: scattered throughout the island |

The source guide is [Fragments/Duviri](https://wiki.warframe.com/w/Fragments/Duviri).
The exact numbered spawn-to-slot mapping is not established by the public
source; use the island and the listed search landmarks.

### Isleweaver Fragments

The app includes every slot exposed by the current `ExportCodex`, but no
reliable public guide currently maps individual Isleweaver fragment IDs to
fixed positions. Search the Isleweaver landscape methodically with a Codex or
Synthesis Scanner and treat the app's item identity as the authoritative
completion key. Do not assume a slot number is a map coordinate.

## Open-world marker collectibles

These four cards are not named item catalogs. They are discovery-state bitsets
reported by the game, so the app can show every currently exposed area/bit but
the export does not provide a stable human name for each bit.

| Card | Where to search | Practical method |
|---|---|---|
| Plains of Eidolon Caves | Plains of Eidolon, Earth | Explore every cave and side passage; use the landscape map and revisit caves after the marker state loads. |
| Orb Vallis Caves | Orb Vallis, Venus | Search every cave entrance and interior; Loot Radar can help with nearby discoverable objects. |
| Fortuna | Fortuna, Venus | Explore the hub thoroughly, including side rooms and vertical paths. |
| Necralisk | Necralisk, Deimos | Explore the hub's side rooms and passages; the marker state is a discovery bitset, not a named checklist. |

For these cards, “Area N, Bit M” is an internal discovery identifier. It is
not a claim that the game names the object that way.

## Lore-fragment collectibles

### Somachord Tunes

Somachord tones are purple, arc-shaped fragments that spawn randomly in the
relevant mission tileset. Most standard soundtrack entries require four tone
scans; Duviri, Isleweaver, Albrecht's Lab, and some quest-linked tracks use
different requirements. Equip Loot Radar mods such as Loot Detector, Thief's
Wit, or Animal Instinct. Complete the mission after scanning so the progress
is saved. Use the [Somachord/Tones guide](https://wiki.warframe.com/w/Somachord/Tones)
for the current song-to-tileset table.

The app's catalog is the complete current DE export section, including newer
tracks. A public guide does not provide a fixed coordinate for every tone, and
the same tone can use multiple possible spawn points.

### Frame Fighter Fragments

These spawn randomly in missions on the planet associated with the Warframe
they unlock, normally one possible fragment per map. The [Frame Fighter
guide](https://wiki.warframe.com/w/Frame_Fighter) gives the item-to-planet
mapping. The complete mapping is:

| Planet | Frames |
|---|---|
| Earth | Hydroid, Gara, Revenant |
| Mercury | Baruuk, Rhino, Ivara |
| Venus | Banshee, Garuda, Khora |
| Mars | Inaros, Mirage |
| Phobos | Nidus, Protea, Wukong |
| Deimos | Nekros, Octavia, Xaku |
| Ceres | Frost, Oberon, Yareli |
| Jupiter | Limbo, Valkyr, Wisp |
| Europa | Grendel, Nova, Vauban |
| Saturn | Ember, Nezha, Zephyr |
| Uranus | Ash, Equinox, Lavos |
| Neptune | Hildryn, Loki, Nyx |
| Eris | Atlas, Mesa |
| Pluto | Chroma, Sevagoth, Trinity |
| Sedna | Gauss, Saryn, Titania |
| Lua | Harrow |

### Cephalon Fragments

Cephalon fragments spawn randomly among possible positions in the tileset;
they are not fixed to one room. The [Cephalon fragment guide](https://wiki.warframe.com/w/Fragments/Cephalon)
lists the planet/tileset entries and scan requirements. Run missions on the
listed planet, equip Loot Radar, and search side rooms, dead ends, and
optional tiles. The app's DE-export catalog is the item list; public sources
do not establish a stable per-ID coordinate for every entry.

### Leverian Prex Cards

Enter a Warframe's Leverian after mastering that Warframe (rank 30 in a base
or Prime version). Search the exhibit for its hidden Prex card. Known item-level
locations in the current repo guide data are:

| Card | Location |
|---|---|
| Ash | Ash Leverian: on the floor against the wall, far-right corner behind Ash's display |
| Atlas / Brawler | Atlas Leverian: rear of the left shoulder of a Rumbler, not Telamon |
| Dante | Dante Leverian: atop the empty statue pedestal |
| Gauss / Runner | Gauss Leverian: right slanted wall with the Altra Syandana |
| Grendel / Devourer | Grendel Leverian: behind the Manse Gates wall; walk the wall edges |
| Ivara | Ivara Leverian: platform edge at the room entrance; turn around |
| Lavos | Lavos Leverian: inside the donation box |
| Nezha | Nezha Leverian: beneath the left slanted wall with the Teng Dagger |
| Nova | Nova Leverian: behind the left slanted wall with the Hikou |
| Styanax | Styanax Leverian: platform near the exhibit entrance |

The [Leverian guide](https://wiki.warframe.com/w/Leverian) is the authoritative
source for the expanding exhibit list. The wiki and export can disagree about
the current total, so the app should use the current export catalog rather
than a hard-coded total.

### Thousand-Year Fish

There are 20 fragments on the Plains of Eidolon. They are embedded in rocks,
walls, and other landscape features and are scanned with a Codex/Synthesis
Scanner. The [Thousand-Year Fish guide](https://wiki.warframe.com/w/Fragments/Fish)
uses an interactive map; the older [timestamped video guide](https://www.youtube.com/watch?v=qfwpSAvEfo8)
is useful when the map is inconvenient. The public text does not provide a
stable named location table for all 20, so use the map/video for the exact
spot and the app for completion state.

### Encrypted Journal Fragments

These are obtained on the Plains of Eidolon through Ghoul Purge content:
Ghoul Purge bounty rewards and Ghoul enemy drops. The lettered DE-export
items are not individually tied to fixed map positions. See the [Fragments
overview](https://wiki.warframe.com/w/Fragments) and the [Ghoul Purge guide](https://wiki.warframe.com/w/Ghoul_Purge).

### Glass Shard Fragments

Collect the five quest-tied Glass Shard fragments during **Saya's Vigil** on
the Plains of Eidolon. The five export items are `GlassFragmentA` through
`GlassFragmentE`; they are quest progression rather than random open-world
pickups. See [Fragments/Glass](https://wiki.warframe.com/w/Fragments/Glass).

### Fortuna Fragments

All Fortuna fragments are in Orb Vallis and are organized around Solaris
United voices and subjects, including Eudico, Legs/Thursby, Little Duck, Rude
Zuud, Smokefinger, The Business, and Ticker. They are found as exploration
fragments in the Vallis, not as one fixed mission reward. Use the [Solaris
United fragment guide](https://wiki.warframe.com/w/Fragments/Solaris_United)
for the narrator/order list; use Loot Radar and search caves, buildings, and
side paths. The DE export is the authoritative complete item list.

### Albrecht's Notes

In the Sanctum Anatomica beneath the Necralisk, banish Mocking and Scathing
Whispers and collect their dropped fragments. The current repo's known export
identifiers are `AlbrectLoreFragmentA` through `E`; the spelling “Albrect” is
the game's internal identifier. See [Fragments/Albrecht](https://wiki.warframe.com/w/Fragments/Albrecht).

### Nakak Memory Fragments

These are tied to **Mask of the Revenant** on the Plains of Eidolon. Wear the
Wanderer's Mask to interact with the quest object, then scan Revenant's
spiritual body at night at the end of the quest. The known identifiers are
`RevenantFragmentA`, `B`, and `C`. See [Fragments/Revenant](https://wiki.warframe.com/w/Fragments/Revenant).

### The Tenets

In Corpus Ship missions, spend a Granum Crown at the Corpus Temple Relief (the
Parvos Granum fountain altar) to reveal the fragment. There is one relief per
mission and its position varies with the generated tiles. See [Fragments/The
Tenets](https://wiki.warframe.com/w/Fragments/The_Tenets).

### Partnership Fragments

Search the Corpus Gas City tileset on Jupiter. Partnership fragments are
hidden throughout the tileset and require one scan each; they are not tied to
a named fixed room. See [Fragments/Partnership](https://wiki.warframe.com/w/Fragments/Partnership).

## Source and accuracy notes

The app's current static location source is
[`collectible-locations.json`](../src-tauri/data/assets/data/collectible-locations.json).
Its Kuria and Duviri rows are reproduced here as a human-readable guide. The
online sources were checked on 2026-08-19. Warframe adds content, and several
pages are maintained interactively, so the export-backed list in the running
app should be treated as the authority for whether a newly added item exists.
