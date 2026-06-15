# Collectibles - Internal Data Sources

## Data Pipeline

```
inventory.json ──► inventoryParser.js ──► MonitoringContext (inventoryData) ──► Collectibles.jsx
```

`collectibleSeries`, `discoveredMarkers`, and `loreFragmentScans` are passed through with no transformation from the raw JSON fields (`CollectibleSeries`, `DiscoveredMarkers`, `LoreFragmentScans`).

---

## Category: Series (CollectibleSeries)

Source field: `inventoryData.collectibleSeries` ← `raw.CollectibleSeries`

Each entry has:
- `CollectibleType` - identifier string (used for matching)
- `Count` - total bits set in `Tracking` (i.e. items found)
- `ReqScans` - total scans required to complete the series
- `Tracking` - bitmask string, one character per item (1 = found, 0 = missing)

| UI Label | Match | Count | Total | Data Count | Wiki Total |
|---|---|---|---|---|---|
| Kuria | `CollectibleType === '/Lotus/Objects/Orokin/Props/CollectibleSeriesOne'` | `Count` | `ReqScans` | 18 | 56 |
| Lost Islands of Duviri | `CollectibleType === '/Lotus/Types/Lore/Fragments/DuviriFragments/DuviriCollectibleDeco'` | `Count` | `ReqScans` | 90 | 90 |
| Isleweaver Fragments | `CollectibleType === '/Lotus/Types/Lore/Fragments/DuviriMITWFragments/DuviriMITWCollectibleDeco'` | `Count` | `ReqScans` | 3 | 15 |

Note: `Count` is the number of bits set in the `Tracking` bitmask, **not** necessarily scans done. For Kuria, 18 bits set out of 56.

---

## Category: Markers (DiscoveredMarkers)

Source field: `inventoryData.discoveredMarkers` ← `raw.DiscoveredMarkers`

Each entry has:
- `tag` - identifier string (used for matching)
- `discoveryState` - array of 32-bit integers, each bit = one sub-area discovered

Count = sum of popcount (bits set) across all `discoveryState` integers.
Total = `discoveryState.length * 32`

| UI Label | Match | Count | Total | Data Count | Wiki Total |
|---|---|---|---|---|---|
| Plains of Eidolon Caves | `tag === 'EidolonPlainsDiscoverable'` | 1 bit × 32 total | 1 | 1 | 32 |
| Orb Vallis Caves | `tag === 'OrbVallisCaveDiscoverable'` | 10 bits | 1 | 10 | 32 |
| Fortuna | `tag === 'FortunaMarker'` | 1 bit | 1 | 1 | 32 |
| Necralisk | `tag === 'NecraliskMarker'` | 1 bit | 1 | 1 | 32 |

All open-world markers have exactly one `discoveryState` integer (32 possible areas). The wiki total for each is 32 areas.

---

## Category: Lore Fragments (LoreFragmentScans)

Source field: `inventoryData.loreFragmentScans` ← `raw.LoreFragmentScans`

Each entry has:
- `ItemType` - full item path, e.g. `/Lotus/Types/Lore/Fragments/MusicFragments/XSongFragment`
- `Progress` - number of scans done (0 = never scanned; 1 = fully scanned)
- `Region` - localization key for the planet/region

Filtering: entries are grouped by applying a `match(type)` function per category.
- `total` = `wikiTotal` from the CATEGORIES definition (hardcoded wiki value)
- `count`/`found` = count of matching entries where `Progress > 0`
- (Previously `total` was the count of unique `ItemType` values in data, but this undercounted categories with unscanned fragments. Switched to hardcoded wiki totals for accurate progress.)

| UI Label | Match Criterion | Data Count | Wiki Total |
|---|---|---|---|---|
| Somachord Tunes | `type.includes('/MusicFragments/')` | 55 | 55 (scanable) / 107 (all tracks) |
| Frame Fighter Fragments | `type.includes('/FrameFighterFragments/')` | 42 | 42 (scanable) / 44 (all characters) |
| Cephalon Fragments | `type.startsWith('/Lotus/Types/Lore/Fragments/') && !type.includes(...)` | 41 | 43 |
| Leverian Prex Cards | `type.includes('/LoreCardFragments/')` | 21 | 50 (only 21 tracked via LoreFragmentScans) |
| Thousand-Year Fish | `type.includes('/EidolonFragments/')` | 20 | 20 |
| Glass Shard Fragments | `type.includes('/GlassFragments/')` | 5 | 5 |
| Encrypted Journal Fragments | `type.includes('/GrineerGhoulFragments/')` | 11 | 13 |
| Nakak Memory Fragments | `type.includes('/RevenantFragments/')` | 3 | 3 |
| Fortuna Fragments | `type.includes('/SolarisFragments/')` | 2 | 35 (only 2 tracked via LoreFragmentScans) |
| Albrecht's Notes | `type.includes('/AlbrectFragments/')` | 2 | 23 (only 2 tracked via LoreFragmentScans) |
| Partnership Fragments | `type.includes('/GasCityFragments/')` | 1 | 8 (only 1 tracked via LoreFragmentScans) |
| The Tenets | `type.includes('/CorpusReliefFragments/')` | 1 | 11 (only 1 tracked via LoreFragmentScans) |

### Cephalon Fragment Exclusions

The Cephalon match starts with all entries under `/Lotus/Types/Lore/Fragments/` then excludes specific sub-paths:

```js
!type.includes('/Eidolon')       // Thousand-Year Fish
!type.includes('/Music')         // Somachord Tones
!type.includes('/FrameFighter')  // Frame Fighter Fragments
!type.includes('/LoreCard')      // Leverian Prex Cards
!type.includes('/Solaris')       // Fortuna (Solaris United)
!type.includes('/GrineerGhoul')  // Encrypted Journal
!type.includes('/Albrect')       // Albrecht's Notes
!type.includes('/Revenant')      // Nakak Memory Fragments
!type.includes('/CorpusRelief')  // The Tenets
!type.includes('/GasCity')       // Partnership Fragments
!type.includes('/GlassFragments') // Glass Shard Fragments
```

---

## Key Notes

1. **`Progress` field** - `LoreFragmentScans` entries only appear for fragment types the player has encountered at least once (Progress ≥ 1). Fragment types never scanned do **not** appear in the array at all. This is why categories like Solaris (35 wiki) show only 2 in data - only 2 of 35 have been scanned. Similarly, Prex Cards shows 21 in data but 50 exist - only 21 have `LoreCardFragments` entries; the rest are obtained from Baro Ki'Teer, quests, etc. and are not tracked in `LoreFragmentScans`.

2. **Series `Count` vs `ReqScans`** - `Count` is bits set in the tracking bitmask (items found), not scans completed. `ReqScans` is the total scans needed to complete. For Kuria, `Count: 18, ReqScans: 56` means 18 of 56 bits are set.

3. **All Progress > 0** - Every entry in this user's `LoreFragmentScans` has `Progress > 0`, so `found === total` for all fragment categories. Unscanned-but-encountered fragments would show `Progress: 0` and count toward total but not found.

4. **Wiki total sources**:
   - Cephalon: 43 Ordis transmissions, `warframe.fandom.com/wiki/Cephalon_Fragments`
   - Somachord: 55 scanable (107 total tracks), `warframe.fandom.com/wiki/Somachord_Tones`
   - Frame Fighter: 42 scanable (44 total characters, Excal/Mag/Volt default), `warframe.fandom.com/wiki/Frame_Fighter`
   - Prex Cards: 50 total, `wiki.warframe.com/w/Decorations/Orbiter_Decorations#Prex`
   - Thousand-Year Fish: 20, `warframe.fandom.com/wiki/Thousand-Year_Fish`
   - Glass Shard: 5, `warframe.fandom.com/wiki/Fragments/Glass`
   - Encrypted Journal: 13, `warframe.fandom.com/wiki/Fragments/Ghoul`
   - Nakak Memory: 3, `warframe.fandom.com/wiki/Fragments/Revenant`
   - Fortuna/Solaris: 35 (5 per 7 NPCs), `warframe.fandom.com/wiki/Fragments/Solaris_United`
   - Albrecht's Notes: 23, `warframe.fandom.com/wiki/Fragments/Albrecht`
   - Partnership: 8, `warframe.fandom.com/wiki/Fragments/Partnership`
   - The Tenets: 11, `warframe.fandom.com/wiki/Fragments/The_Tenets`
