# Relic Reward Workflow

Documentation of the log triggers used to automate the relic reward overlay.

## 1. Mission Start (Fissure Loading)
Triggered when a user loads into a fissure mission.
- **Trigger:** `_ActiveMission"} with MissionInfo`

## 2. Relic Pool Detection
Identifies which relics were picked by everyone to determine the pool of relics to scan rewards from
- **Triggers:** `Resloader` + `/Lotus/Types/Game/Projections/` + `starting`
- **Example:** `Sys [Info]: Resloader 0x000000002E20A710 (/Lotus/Types/Game/Projections/T3VoidProjectionZephyrPrimeABronze) starting`
We disregard the hex code and only care about the relic type to build a pool of relics to scan rewards from (so duplicates dont matter)
 
## 3. 10 Reactant Detection
Latest detectable point in relic mission when player receives buff from collecting 10 reactant and the game queues a Lotus transmission. This is where our reward screen detection OCR is gonna start polling.
- **Trigger:** `new transmission: DVRCAftermathLotus`

## 4. Start Reward Screen Detection
After the previous step, we keep scanning the reward bar strip for the reward icons (common, uncommon, rare). 
Because players might not equip a relic, we do **not** just count the number of detected icons to determine the squad size. Instead, we deduce the intended UI layout (2, 3, or 4 slots) by comparing the precise X-coordinates of whatever icons are found against known coordinate clusters. Once the layout size is deduced, the OCR pipeline captures the text bounding boxes centered exactly above those icon coordinates.

Center of each spot:
1/4. Spot = 595
2/4 (or 1/2). Spot = 838
3/4 (or 2/2). Spot = 1080
4/4. Spot = 1323

1/3. Spot = 717x476
2/3. Spot = 960x476
3/3. Spot = 1202x476

## 5. Reward Screen Closure
Cleanup and state reset.
- **Trigger:** `ProjectionRewardChoice.lua: Relic reward screen shut down`

## 6. Endless Mission Handling
If the user is in an endless mission, after the reward screen closes, they'll be prompted to pick another relic, which is triggered by `Created /Lotus/Interface/ThemedProjectionManager.swf`.
- **Trigger:** `Created /Lotus/Interface/ThemedProjectionManager.swf`
- **Logic:** after the reward screen closes, theres two possible triggers, 
    - if step 5 is triggered, reset relic pool and go back to step 2
    - otherwise wait for step 6

## 7. Mission Exit
Return to idle state.
- **Trigger:** `ExitState: Disconnected`