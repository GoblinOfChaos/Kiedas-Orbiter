# Relic Reward Workflow

Documentation of the log triggers used to automate the relic reward overlay.

We start here when letting the EE.log scanner do everything automatically:

## 1. Mission Start (Fissure Loading)
Triggered when a user loads into a fissure mission.
- **Trigger:** `_ActiveMission"} with MissionInfo`

## 2. Relic Pool Detection
Identifies which relics were picked by everyone to determine the pool of relics to scan rewards from
- **Triggers:** `Resloader` + `/Lotus/Types/Game/Projections/` + `starting`
- **Example:** `Sys [Info]: Resloader 0x000000002E20A710 (/Lotus/Types/Game/Projections/T3VoidProjectionZephyrPrimeABronze) starting`
We disregard the hex code and only care about the relic type to build a pool of relics to scan rewards from (so duplicates dont matter)
 
## 3. 10 Reactant Detection
Latest detectable point in relic mission when player receives buff from collecting 10 reactant and the game queues a Lotus transmission.
- **Trigger:** `new transmission: DVRCAftermathLotus`

This is where the "Test relic recognition" button and the OCR shortcut start from:

## 4. Requiem Mod Detection
If one of the added relics is a Requiem Relic, we are in a requiem fissure and due to requiem relics not having any labels, we have to scan their image to determine which one it is. We still need to run the OCR for the text regions regardless, since requiem relics can drop items that have labels, such as Ayatan Amber Stars, Riven Slivers, 1200 Kuva and an Exilus Weapon Adapter Blueprint.

- **Trigger:** Relic tier = "T5"

Requiem mods are identified by NCC template matching against pre-cropped 55×55 icon templates. Positions below are at 1.0 UI scale (1920×1080); they are dynamically scaled by `active_scale` (from `USER_UI_SCALE`) and resolution (`sx`/`sy`) at scan time.

Requiem Mod Rects (4 slots) (1.0 Scale)
1. (569, 315, 55, 55)
2. (811, 315, 55, 55)
3. (1053, 315, 55, 55)
4. (1295, 315, 55, 55)

Requiem Mod Rects (3 slots) (1.0 Scale)
1. (678, 302, 85, 85)
2. (918, 302, 85, 85)
3. (1163, 302, 85, 85)

## 5. Start Reward Screen Detection
After the previous step (Step 3), the icon scan starts polling for the reward screen. We scan the reward bar strip for rarity icons (common, uncommon, rare). We look for valid cluster positions from the 7 known spots (4 slots + 3 slots, with slot 2 overlapping). If detected icons cluster at the 4-slot positions, it's a 4-player squad. If they cluster at the 3-slot positions, it's a 3-player squad. Otherwise, we fall back to 2 slots. Only confirm slot size if all slots are detected simultaneously.

Center of each rarity icon spot: (1.0 Scale) (Height 478)
- 4-slot positions: 595, 838, 1080, 1323
- 3-slot positions: 717, 960, 1202

OCR Regions (both lines combined): (1.0 Scale)
- 4-slot positions: (478,412 - 714,460), (721,412 - 956,460), (965,412 - 1200,460), (1209,412 - 1444,460)
- 3-slot positions: (600,412 - 835,460), (842,412 - 1077,460), (1084,412 - 1319,460)

Center of each rarity icon spot: (0.5 Scale) (Height 510)
- 4-slot positions: 777, 899, 1021, 1143
- 3-slot positions: 839, 961, 1083

OCR Regions (both lines combined): (0.5 Scale)
- 4-slot positions: (721,477 - 836,499), (842,477 - 957,499), (963,477 - 1080,499), (1084,477 - 1202,499)
- 3-slot positions: (782,477 - 897,500), (901,477 - 1018,500), (1023,477 - 1139,500)

## 6. Reward Screen Closure
Cleanup and state reset.
- **Trigger:** `ProjectionRewardChoice.lua: Relic reward screen shut down`

## 7. Endless Mission Handling
If the user is in an endless mission, after the reward screen closes, they'll be prompted to pick another relic, which is triggered by `Created /Lotus/Interface/ThemedProjectionManager.swf`.
- **Trigger:** `Created /Lotus/Interface/ThemedProjectionManager.swf`
- **Logic:** After Step 6 triggers, the icon scan flag is reset to allow the next cycle's Step 3 to trigger a new scan. The existing squad_relics are preserved until Step 2 repopulates them when the player picks new relics.

## 8. Mission Exit
Return to idle state.
- **Trigger:** `ExitState: Disconnected`