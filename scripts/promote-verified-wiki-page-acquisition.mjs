// Promote only manually reviewed, exact-object Wiki records from the page
// audit into the runtime acquisition map. The page audit remains discovery;
// this allowlist is intentionally explicit so a related page cannot silently
// become an acquisition claim for an object it does not name.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const path = 'src-tauri/data/assets/data/wiki-page-acquisition.json';
const baseline = execFileSync('git', ['show', `HEAD:${path}`], { encoding: 'utf8' });
const data = JSON.parse(baseline);

const records = {
  'Chitoid Sentinel Wings': {
    section: 'Acquisition',
    text: 'Earned as part of the Chitoid Sentinel Bundle, a Nightwave reward. The bundle contains the Chitoid Sentinel Mask, Wings, and Tail.',
    url: 'https://wiki.warframe.com/w/Sentinel_Cosmetics',
  },
  'Elfame Bow Skin': {
    section: 'Acquisition',
    text: 'Earned from Rank 4 of Nora\'s Mix: Time Tempests for 40,000 cumulative standing.',
    url: 'https://wiki.warframe.com/w/Nightwave/Nora%27s_Mix:_Time_Tempests',
  },
  'Furis Verv Skin': {
    section: 'Acquisition',
    text: 'Available from Varzia\'s Evergreen Prime Items for 7 Aya.',
    url: 'https://wiki.warframe.com/w/Varzia',
  },
  'Kronen Iridos Skin': {
    section: 'Acquisition',
    text: 'Available from Varzia\'s Evergreen Prime Items for 7 Aya.',
    url: 'https://wiki.warframe.com/w/Varzia',
  },
  'Deimos Crypt Scene': {
    section: 'Acquisition',
    text: 'Dropped from Deimos Captura Containers in Isolation Vaults.',
    url: 'https://wiki.warframe.com/w/Captura',
  },
  'Deimos Depths Scene': {
    section: 'Acquisition',
    text: 'Dropped from Deimos Captura Containers in Isolation Vaults.',
    url: 'https://wiki.warframe.com/w/Captura',
  },
  'Deimos Forsaken Scene': {
    section: 'Acquisition',
    text: 'Dropped from Deimos Captura Containers in Isolation Vaults.',
    url: 'https://wiki.warframe.com/w/Captura',
  },
  'Deimos Heart Scene': {
    section: 'Acquisition',
    text: 'Dropped from Deimos Captura Containers in Isolation Vaults.',
    url: 'https://wiki.warframe.com/w/Captura',
  },
  'Deimos Membrane Scene': {
    section: 'Acquisition',
    text: 'Dropped from Deimos Captura Containers in Isolation Vaults.',
    url: 'https://wiki.warframe.com/w/Captura',
  },
  'Deimos Verge Scene': {
    section: 'Acquisition',
    text: 'Dropped from Deimos Captura Containers in Isolation Vaults.',
    url: 'https://wiki.warframe.com/w/Captura',
  },
  'Corinth Obsidian Skin': {
    section: 'Acquisition',
    text: 'Included in the PlayStation Divergence Pack, a platform-exclusive bundle containing the Corinth Obsidian Skin.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Grattler Obsidian Skin': {
    section: 'Acquisition',
    text: 'Included in PlayStation Renown Pack XVIII.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Guandao Opal Skin': {
    section: 'Acquisition',
    text: 'Included in Nintendo Switch Esteem Pack I, available from March 12, 2019 to May 28, 2019.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Hek Obsidian Skin': {
    section: 'Acquisition',
    text: 'Included in PlayStation Renown Pack XIII, available from May 22, 2018 to December 4, 2018.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Lato Obsidian Skin': {
    section: 'Acquisition',
    text: 'Included in PlayStation Renown Pack II, available from September 30, 2014 to November 25, 2014.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Excalibur Obsidian Helmet': {
    section: 'Acquisition',
    text: 'Included in PlayStation Renown Pack III, available from December 2, 2014 to February 17, 2015.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Iahgames Braton': {
    section: 'Acquisition',
    text: 'Earned through the expired IAHGames promotion: claim the promo code by email, verify an IAHGames Social account, and create a new Warframe account through IAHGames Warframe.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Cheeky Sprodling Emblem': {
    section: 'Acquisition',
    text: 'Awarded upon completing The Prince\'s Green Stem Path.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  'Armilla Emblem': {
    section: 'Acquisition',
    text: 'A Conclave emblem awarded through Conclave Alerts; it displays the rank achieved through Conclave Alerts.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  "Disciple's Emblem": {
    section: 'Acquisition',
    text: 'Awarded to Founders who purchased a Founders package. The Founders Pack is closed and this item is no longer available.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  "Master's Emblem": {
    section: 'Acquisition',
    text: 'Awarded to Founders who purchased a Founders package. The Founders Pack is closed and this item is no longer available.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  "Hunter's Emblem": {
    section: 'Acquisition',
    text: 'Awarded to Founders who purchased a Founders package. The Founders Pack is closed and this item is no longer available.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  'Grand Master Emblem': {
    section: 'Acquisition',
    text: 'Awarded to Founders who purchased a Founders package. The Founders Pack is closed and this item is no longer available.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  'Ghost Leader Emblem': {
    section: 'Disposition',
    text: 'Listed by the Wiki under Cut Content: Clan Leaderboard Emblems. No live acquisition route is documented.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  'Moon Leader Emblem': {
    section: 'Disposition',
    text: 'Listed by the Wiki under Cut Content: Clan Leaderboard Emblems. No live acquisition route is documented.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  'Mountain Leader Emblem': {
    section: 'Disposition',
    text: 'Listed by the Wiki under Cut Content: Clan Leaderboard Emblems. No live acquisition route is documented.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  'Shadow Leader Emblem': {
    section: 'Disposition',
    text: 'Listed by the Wiki under Cut Content: Clan Leaderboard Emblems. No live acquisition route is documented.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  'Storm Leader Emblem': {
    section: 'Disposition',
    text: 'Listed by the Wiki under Cut Content: Clan Leaderboard Emblems. No live acquisition route is documented.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  'Clan Sigil': {
    section: 'Acquisition',
    text: 'Originally purchasable from Little Duck in the Scarlet Spear Flotilla Relay for 2,000 Scarlet Credits; recurring versions have returned in later events.',
    url: 'https://wiki.warframe.com/w/Sigils',
  },
  'Drip Squad 4 Life Emblem': {
    section: 'Acquisition',
    text: 'Awarded for completing the 1999 ARG and entering promo code TH3GR8D3SP41R.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  'Hostile Mergers Emblem': {
    section: 'Acquisition',
    text: 'Reward from Mission 1 of the limited-time Operation: Hostile Mergers event.',
    url: 'https://wiki.warframe.com/w/Operation:_Hostile_Mergers',
  },
  'Kuria Emblem': {
    section: 'Acquisition',
    text: 'Awarded through an inbox message after scanning half of the Kurias.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  'Lunar Renewal Soar Sigil': {
    section: 'Acquisition',
    text: 'Available from the Market during Lunar New Year for 40 Platinum, or as part of the Fire Agate Bundle for 295 Platinum.',
    url: 'https://wiki.warframe.com/w/Sigils',
  },
  'Necraseal Emblem': {
    section: 'Acquisition',
    text: 'Available from Varzia\'s Evergreen Cosmetics for 5 Aya.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  'Old Blood Emblem': {
    section: 'Acquisition',
    text: 'Awarded for capturing or converting a Kuva Lich or Sister of Parvos.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  'President King Corgi Emblem': {
    section: 'Acquisition',
    text: 'Awarded for completing 5 loops of Caliber Chicks 2.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  'Sisterhood Emblem': {
    section: 'Acquisition',
    text: 'Awarded for capturing or converting a Kuva Lich or Sister of Parvos.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  'Tenno Chronicler Emblem': {
    section: 'Acquisition',
    text: 'Awarded to administrators or moderators of the Warframe Wiki.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  'TennoGen Emblem': {
    section: 'Acquisition',
    text: 'Awarded to players whose TennoGen submissions have been accepted into the game.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  'Vasero Emergent Sekhara': {
    section: 'Acquisition',
    text: 'Sent to the inbox after completing the 250-kill Operator challenge with Vasero Sekhara equipped. The base Vasero Sekhara is purchased from the Market for 60 Platinum.',
    url: 'https://wiki.warframe.com/w/Vasero_Sekhara',
  },
  'Vasero Apex Sekhara': {
    section: 'Acquisition',
    text: 'Sent to the inbox after completing the 1,000-kill Operator challenge with Vasero Emergent Sekhara equipped. The base Vasero Sekhara is purchased from the Market for 60 Platinum.',
    url: 'https://wiki.warframe.com/w/Vasero_Sekhara',
  },
  'TennoVIP 2025 Sigil': {
    section: 'Acquisition',
    text: 'Exclusive sigil given to attendees of TennoLive, TennoVIP, and TennoCon events; this variant is the TennoVIP 2025 Sigil.',
    url: 'https://wiki.warframe.com/w/Sigils',
  },
  'Chrysalis Sentinel Wings': {
    section: 'Acquisition',
    text: 'Available as part of the Infested Sentinel cosmetics for 15 Platinum.',
    url: 'https://wiki.warframe.com/w/Sentinel_Cosmetics',
  },
  'Deca Heirloom Glyph': {
    section: 'Acquisition',
    text: 'Included in the Zenith Heirloom Collection, a Market collection priced at 89.99 USD/GBP.',
    url: 'https://wiki.warframe.com/w/Zenith_Heirloom_Collection',
  },
  'Necraloid Glyph': {
    section: 'Acquisition',
    text: 'Purchased from Loid for 7,500 standing.',
    url: 'https://wiki.warframe.com/w/Glyph',
  },
  'Operator Atmosphor': {
    section: 'Acquisition',
    text: 'Rewarded for completing The Old Peace quest.',
    url: 'https://wiki.warframe.com/w/Operator/Customization',
  },
  'Orcus Prime Wings': {
    section: 'Acquisition',
    text: 'Included in Orcus Prime Sentinel Accessories from Atlas Prime Access.',
    url: 'https://wiki.warframe.com/w/Sentinel_Cosmetics',
  },
  'Para Sentinel Wings': {
    section: 'Acquisition',
    text: 'Included in the Para Sentinel bundle, available as part of the Update 13 Mega Pack; the wings could also be purchased individually for 20 Platinum.',
    url: 'https://wiki.warframe.com/w/Sentinel_Cosmetics',
  },
  'Pennant Obsidian Skin': {
    section: 'Acquisition',
    text: 'Included in the PlayStation Divergence Pack.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Obsidian Samia Syandana': {
    section: 'Acquisition',
    text: 'Included in PlayStation Renown Pack XVII, available from September 10, 2019 to March 10, 2020.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Obsidian Sedai Syandana': {
    section: 'Acquisition',
    text: 'Included in PlayStation Plus Booster Pack V, available from November 5, 2020 to July 1, 2021.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Quanta Obsidian Skin': {
    section: 'Acquisition',
    text: 'Included in PlayStation Plus Booster Pack III, available from November 20, 2018 to December 3, 2019.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Scoliac Obsidian Skin': {
    section: 'Acquisition',
    text: 'Included in PlayStation Renown Pack XIV, available from November 27, 2018 to February 26, 2019.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Spira Obsidian Skin': {
    section: 'Acquisition',
    text: 'Included in PlayStation Renown Pack X, available from March 21, 2017 to June 20, 2017.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Lepus Headgear': {
    section: 'Acquisition',
    text: 'A time-limited Easter Market accessory; the 2015 listing cost 5,000 Credits.',
    url: 'https://wiki.warframe.com/w/Leap_of_the_Lotus',
  },
  'Mausolon Supulchrax Skin': {
    section: 'Acquisition',
    text: 'Earned from the Endurance mission of Operation: Orphix Venom by reaching 2,000 points.',
    url: 'https://wiki.warframe.com/w/Operation:_Orphix_Venom',
  },
  'Twin Grakatas Opal Skin': {
    section: 'Acquisition',
    text: 'Included in Nintendo Switch Esteem Pack II, available from May 28, 2019 to September 10, 2019.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Sirocco Amp Skin': {
    section: 'Acquisition',
    text: 'Rewarded for completing The New War quest.',
    url: 'https://wiki.warframe.com/w/The_New_War',
  },
  'Tempestarii Railjack Skin': {
    section: 'Acquisition',
    text: 'Rewarded for completing the Call of the Tempestarii side quest.',
    url: 'https://wiki.warframe.com/w/Call_of_the_Tempestarii',
  },
  'Traciens Glaive Skin': {
    section: 'Acquisition',
    text: 'Available from Nightwave Cred Offerings on a rotational basis for 30 Nora\'s Mix: Time Tempests Cred.',
    url: 'https://wiki.warframe.com/w/Weapon_Cosmetics',
  },
  'Hildryn Prime Chest Plate': {
    section: 'Acquisition',
    text: 'Included as an accessory in recurring Hildryn Prime Access.',
    url: 'https://wiki.warframe.com/w/Warframe_Cosmetics',
  },
  'Teng Dual Dagger Skin': {
    section: 'Acquisition',
    text: 'Included in the Nezha Empyrean Collection, priced at 225 Platinum.',
    url: 'https://wiki.warframe.com/w/Teng_Dagger_Skin',
  },
  'Mantle of the Lotus': {
    section: 'Acquisition',
    text: 'No longer available. It was originally available only to Guides of the Lotus, a program retired on April 5, 2019.',
    url: 'https://wiki.warframe.com/w/Mantle_Of_The_Lotus_(Shoulders)',
  },
  'Loki Prime Glyph - Bright': {
    section: 'Acquisition',
    text: 'Obtained by purchasing the corresponding Loki Prime Access or Prime Vault package; purchasing it unlocks both the light and dark versions.',
    url: 'https://wiki.warframe.com/w/Glyph',
  },
  'Loki Prime Glyph - Dark': {
    section: 'Acquisition',
    text: 'Obtained by purchasing the corresponding Loki Prime Access or Prime Vault package; purchasing it unlocks both the light and dark versions.',
    url: 'https://wiki.warframe.com/w/Glyph',
  },
  'Make-A-Wish Eli Glyph': {
    section: 'Acquisition',
    text: 'A Legendary Glyph created by a player who purchased a Legendary Ticket to TennoCon; each Legendary Glyph is exclusive to its designer unless they share it.',
    url: 'https://wiki.warframe.com/w/Glyph',
  },
  'Cycle One Sigil': {
    section: 'Disposition',
    text: 'Console-exclusive PS4 anniversary sigil; it cannot be obtained on PC.',
    url: 'https://wiki.warframe.com/w/Sigils',
  },
  'Cycle Three Sigil': {
    section: 'Disposition',
    text: 'Console-exclusive PS4 anniversary sigil; it cannot be obtained on PC.',
    url: 'https://wiki.warframe.com/w/Sigils',
  },
  'Seal Of Honoring': {
    section: 'Disposition',
    text: 'Console-exclusive Xbox One anniversary sigil; it cannot be obtained on PC.',
    url: 'https://wiki.warframe.com/w/Sigils',
  },
  'Seal Of Honoring III': {
    section: 'Disposition',
    text: 'Console-exclusive Xbox One anniversary sigil; it cannot be obtained on PC.',
    url: 'https://wiki.warframe.com/w/Sigils',
  },
  "Kaya's Reactors": {
    section: 'Acquisition',
    text: "Included with Kaya Gemini Skin. Purchase Kaya Gemini Skin individually for 275 Platinum or as part of the Encore Gemini Collection for 880 Platinum.",
    url: 'https://wiki.warframe.com/w/Kaya_Gemini_Skin',
  },
  "Velimir's Coolant Tank": {
    section: 'Acquisition',
    text: "Included with Velimir Gemini Skin. Purchase Velimir Gemini Skin individually for 275 Platinum or as part of the Encore Gemini Collection for 880 Platinum.",
    url: 'https://wiki.warframe.com/w/Velimir_Gemini_Skin',
  },
  "Quincy's Beret": {
    section: 'Acquisition',
    text: "Included with Quincy Gemini Skin. Purchase Quincy Gemini Skin individually for 275 Platinum or as part of the 1999 Gemini Pact Collection for 1,200 Platinum.",
    url: 'https://wiki.warframe.com/w/Quincy_Gemini_Skin',
  },
  "Roathe's Chyrinth": {
    section: 'Acquisition',
    text: "Included with Roathe Gemini Skin. Purchase Roathe Gemini Skin individually for 275 Platinum or as part of The Old Peace Gemini Collection for 660 Platinum.",
    url: 'https://wiki.warframe.com/w/Roathe_Gemini_Skin',
  },
  'Coltek Sentinel Wings': {
    section: 'Acquisition',
    text: 'Included in the Coltek Sentinel Pack, purchasable from the Market for 45 Platinum.',
    url: 'https://wiki.warframe.com/w/Coltek_Sentinel_Pack',
  },
  'Diamond Sentinel Wings': {
    section: 'Acquisition',
    text: 'Included in the Sentinel Accessory Pack, purchasable from the Market for 85 Platinum.',
    url: 'https://wiki.warframe.com/w/Sentinel_Accessory_Pack',
  },
  'Ictus Sentinel Wings': {
    section: 'Acquisition',
    text: 'Included in the Ictus Sentinel Pack, purchasable from the Market for 93 Platinum.',
    url: 'https://wiki.warframe.com/w/Ictus_Sentinel_Pack',
  },
  'Dome Sentinel Wings': {
    section: 'Acquisition',
    text: 'Included in the Sentinel Accessory Pack, purchasable from the Market for 85 Platinum.',
    url: 'https://wiki.warframe.com/w/Sentinel_Accessory_Pack',
  },
  'Insign II Kalika': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Insign II Kalika by equipping an Honoria with Insign I Sporoi equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'Grandis XX Perigone': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Grandis XX Perigone by completing Elite Temporal Archimedea on your own with Grandis XIX Phloios equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'Insign III Phloios': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Insign III Phloios by killing 150 enemies with melee weapons while Insign II Kalika is equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'Insign IV Perigone': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Insign IV Perigone by completing The Perita Rebellion with Insign III Phloios equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'Servio V Sporoi': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Servio V Sporoi by completing The Descendia with Insign IV Perigone equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'Servio VIII Perigone': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Servio VIII Perigone by sustaining a 10x melee combo for 45 seconds with Servio VII Phloios equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'Tenens IX Sporoi': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Tenens IX Sporoi by completing 5 encounters within one Perita Rebellion battle with Servio VIII Perigone equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'Capit XIV Kalika': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Capit XIV Kalika by completing an Arbitrations Survival mission after surviving 30 minutes with Capit XIII Sporoi equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'Capit XIII Sporoi': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Capit XIII Sporoi by completing Steel Path The Descendia without dying with Tenens XII Perigone equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'Grandis XIX Phloios': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Grandis XIX Phloios by defeating a Technocyte Coda without getting hit by stage attacks with Grandis XVIII Kalika equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'Servio VII Phloios': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Servio VII Phloios by completing 5 Steel Path missions with Servio VI Kalika equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'Tenens XI Phloios': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Tenens XI Phloios by defeating The Fragmented One with Tenens X Kalika equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'Capit XV Phloios': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Capit XV Phloios by completing a full Archon Hunt without bleeding out with Capit XIV Kalika equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'Grandis XVIII Kalika': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Grandis XVIII Kalika by defeating 15 enemies with a single Tauron Strike with Grandis XVII Sporoi equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'Servio VI Kalika': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Servio VI Kalika by defeating the Exploiter Orb with Servio V Sporoi equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'Capit XVI Perigone': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Capit XVI Perigone by carrying 4 Keyglyphs during a Netracell mission with Capit XV Phloios equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'Grandis XVII Sporoi': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Grandis XVII Sporoi by acquiring an Incarnon Genesis from The Steel Path Circuit with Capit XVI Perigone equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'Tenens XII Perigone': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Tenens XII Perigone by defeating H-09 Apex with Tenens XI Phloios equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'Tenens X Kalika': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Tenens X Kalika by defeating Janus Captain Vor with Tenens IX Sporoi equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'General Insignia': {
    section: 'Acquisition',
    text: 'Found as a rare Syndicate Medallion pickup in daily Syndicate Alert missions; rare medallions grant 5,000 standing. Syndicate Medallions can also be Daily Tribute rewards.',
    url: 'https://wiki.warframe.com/w/Syndicate_Medallions',
  },
  'Maxim Medallion': {
    section: 'Acquisition',
    text: 'Found as a rare Syndicate Medallion pickup in daily Syndicate Alert missions; rare medallions grant 5,000 standing. Syndicate Medallions can also be Daily Tribute rewards.',
    url: 'https://wiki.warframe.com/w/Syndicate_Medallions',
  },
  'Partner Quittance': {
    section: 'Acquisition',
    text: 'Found as a rare Syndicate Medallion pickup in daily Syndicate Alert missions; rare medallions grant 5,000 standing. Syndicate Medallions can also be Daily Tribute rewards.',
    url: 'https://wiki.warframe.com/w/Syndicate_Medallions',
  },
  'Flawless Seed': {
    section: 'Acquisition',
    text: 'Found as a rare Syndicate Medallion pickup in daily Syndicate Alert missions; rare medallions grant 5,000 standing. Syndicate Medallions can also be Daily Tribute rewards.',
    url: 'https://wiki.warframe.com/w/Syndicate_Medallions',
  },
  'Orokin Archive': {
    section: 'Quest acquisition',
    text: 'During The Archwing quest, recover the Orokin Archive from the Corpus stronghold in the Tessera, Venus Orokin Sabotage mission.',
    url: 'https://wiki.warframe.com/w/The_Archwing',
  },
  'Mod Segment': {
    section: 'Quest acquisition',
    text: 'Obtained during The Teacher quest; it unlocks the ability to use and fuse Mods.',
    url: 'https://wiki.warframe.com/w/Orbiter_Segments',
  },
  'Raya Orbitus Sigil': {
    section: 'Acquisition',
    text: "Earned at Rank 2 of Nightwave: Nora's Mix Volume 9.",
    url: 'https://wiki.warframe.com/w/Nightwave/Nora%27s_Mix_Volume_9',
  },
  'Monquis Sigil': {
    section: 'Event acquisition',
    text: 'A Lunar New Year event sigil; the Wiki identifies the original Monquis Sigil as a China-exclusive Lunar New Year reward.',
    url: 'https://wiki.warframe.com/w/Lunar_Renewal',
  },
  'Lunar Renewal Ox Emblem': {
    section: 'Event acquisition',
    text: 'A Lunar Renewal 2021 exclusive emblem; it was available during that Lunar New Year event and is not listed as a current offering.',
    url: 'https://wiki.warframe.com/w/Lunar_Renewal',
  },
  'RixtyMOL Aklato': {
    section: 'Acquisition',
    text: 'Expired Rixty promotion: purchase Platinum through the Rixty option on the Warframe website; the exclusive Aklato with its RixtyMOL skin was granted with the purchase.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Lex Onyx Skin': {
    section: 'Acquisition',
    text: 'Previously included in the retired Steam Esteem Pack; it is no longer available through that promotion.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Magnus Obsidian Skin': {
    section: 'Acquisition',
    text: 'Included in the PlayStation Renown Pack series; the Wiki lists Magnus Obsidian Skin among the platform-exclusive Obsidian skins.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Skana Obsidian Skin': {
    section: 'Acquisition',
    text: 'Included in PlayStation Renown Pack II, a retired platform-exclusive bundle.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Drakgoon Rubedo Plated Skin': {
    section: 'Acquisition',
    text: 'Included in the retired Rubedo Plated Steam Trading Card collection; the Rubedo Plated Drakgoon Skin was the extraordinary-rarity item.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Galatine Rubedo Plated Skin': {
    section: 'Acquisition',
    text: 'Included in the retired Rubedo Plated Steam Trading Card collection; the Rubedo Plated Galatine Skin was the rare-rarity item.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Provvok Obsidian Shoulder Guard': {
    section: 'Acquisition',
    text: 'Included in PlayStation Renown Pack XIII alongside the Hek Obsidian Skin.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Prime Iron Skin Override': {
    section: 'Acquisition',
    text: 'Prime cosmetic accessory for Rhino Prime; it was included with Rhino Prime Access and is not a separately craftable item.',
    url: 'https://wiki.warframe.com/w/Warframe_Cosmetics',
  },
  'Nvidia Braton': {
    section: 'Disposition',
    text: 'The Wiki identifies this as part of an unreleased NVIDIA GPU promotion; no obtainable route was released.',
    url: 'https://wiki.warframe.com/w/Weapon_Cosmetics',
  },
  'Viper Rubedo Plated Skin': {
    section: 'Acquisition',
    text: 'Included in the Rubedo Plated Steam Trading Card collection as one of the Viper Rubedo Skins; the collection route is retired.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Twin Vipers Rubedo Plated Skin': {
    section: 'Acquisition',
    text: 'Included in the Rubedo Plated Steam Trading Card collection as one of the Viper Rubedo Skins; the collection route is retired.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Hildryn Prime Helmet': {
    section: 'Acquisition',
    text: 'The Prime helmet is part of Hildryn Prime, whose recurring acquisition route is Prime Access or a later Prime Resurgence rotation.',
    url: 'https://wiki.warframe.com/w/Warframe_Cosmetics',
  },
  'Saryn Prime Helmet': {
    section: 'Acquisition',
    text: 'The Prime helmet is part of Saryn Prime, whose recurring acquisition route is Prime Access or a later Prime Resurgence rotation.',
    url: 'https://wiki.warframe.com/w/Warframe_Cosmetics',
  },
  'Sevagoth Prime Helmet': {
    section: 'Acquisition',
    text: 'The Prime helmet is part of Sevagoth Prime, whose recurring acquisition route is Prime Access or a later Prime Resurgence rotation.',
    url: 'https://wiki.warframe.com/w/Warframe_Cosmetics',
  },
  'Zephyr Prime Helmet': {
    section: 'Acquisition',
    text: 'The Prime helmet is part of Zephyr Prime, whose recurring acquisition route is Prime Access or a later Prime Resurgence rotation.',
    url: 'https://wiki.warframe.com/w/Warframe_Cosmetics',
  },
  'The Baron': {
    section: 'Event acquisition',
    text: 'Unlocked for all players when the 2014 Moframe/Movember fundraiser reached its donation goals; the event is over.',
    url: 'https://wiki.warframe.com/w/Moframe',
  },
  'The Dastard': {
    section: 'Event acquisition',
    text: 'Unlocked for all players through the 2015 Moframe/Movember fundraiser after its donation goals were reached; the event is over.',
    url: 'https://wiki.warframe.com/w/Moframe',
  },
  'The Gentleman': {
    section: 'Event acquisition',
    text: 'Unlocked for all players when the 2014 Moframe/Movember fundraiser reached its donation goals; the event is over.',
    url: 'https://wiki.warframe.com/w/Moframe',
  },
  'The Illusionist': {
    section: 'Event acquisition',
    text: 'Unlocked for all players through the 2015 Moframe/Movember fundraiser after its donation goals were reached; the event is over.',
    url: 'https://wiki.warframe.com/w/Moframe',
  },
  'The Inventor': {
    section: 'Event acquisition',
    text: 'Unlocked for all players through the 2015 Moframe/Movember fundraiser after its donation goals were reached; the event is over.',
    url: 'https://wiki.warframe.com/w/Moframe',
  },
  'The Magnum': {
    section: 'Event acquisition',
    text: 'Unlocked for all players when the 2014 Moframe/Movember fundraiser reached its donation goals; the event is over.',
    url: 'https://wiki.warframe.com/w/Moframe',
  },
  'The Master': {
    section: 'Event acquisition',
    text: 'Unlocked for all players through the 2015 Moframe/Movember fundraiser after its donation goals were reached; the event is over.',
    url: 'https://wiki.warframe.com/w/Moframe',
  },
  'The Shopkeep': {
    section: 'Event acquisition',
    text: 'Unlocked for all players through the 2015 Moframe/Movember fundraiser after its donation goals were reached; the event is over.',
    url: 'https://wiki.warframe.com/w/Moframe',
  },
  'The Tusker': {
    section: 'Event acquisition',
    text: 'Unlocked for all players when the 2014 Moframe/Movember fundraiser reached its donation goals; the event is over.',
    url: 'https://wiki.warframe.com/w/Moframe',
  },
  'The Villain': {
    section: 'Event acquisition',
    text: 'Unlocked for all players when the 2014 Moframe/Movember fundraiser reached its donation goals; the event is over.',
    url: 'https://wiki.warframe.com/w/Moframe',
  },
  'Solstice Conclave Emblem': {
    section: 'Event acquisition',
    text: 'Awarded for taking part in the Snowday Showdown Conclave alert.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  'The Index Emblem': {
    section: 'Event acquisition',
    text: 'Awarded for achieving a score of 100 or more in a High Risk match during The Index Preview.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  'RHINO BRONZE SKIN': {
    section: 'Disposition',
    text: 'A Warframe China promotional exclusive; the Wiki lists Rhino Bronze Skin among the China-only items. It is not an obtainable global-build item.',
    url: 'https://wiki.warframe.com/w/WARFRAME_(China)',
  },
  'BRONZE RHINO HELMET': {
    section: 'Disposition',
    text: 'A Warframe China promotional exclusive associated with Rhino Bronze Skin; it is not an obtainable global-build item.',
    url: 'https://wiki.warframe.com/w/WARFRAME_(China)',
  },
  'GALATINE BRONZE SKIN': {
    section: 'Disposition',
    text: 'A Warframe China promotional exclusive; the Wiki lists Galatine Bronze Skin among the China-only items. It is not an obtainable global-build item.',
    url: 'https://wiki.warframe.com/w/WARFRAME_(China)',
  },
  'Drakgoon Bronze Skin': {
    section: 'Disposition',
    text: 'A Warframe China promotional exclusive; the Wiki lists Drakgoon Bronze Skin among the China-only items. It is not an obtainable global-build item.',
    url: 'https://wiki.warframe.com/w/WARFRAME_(China)',
  },
  'Rhino Rubedo Plated Skin': {
    section: 'Acquisition',
    text: 'Included in the retired Rubedo Plated Steam Trading Card collection as the common-rarity Rubedo Plated Rhino Skin.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Yamako Rubedo Plated Syandana': {
    section: 'Acquisition',
    text: 'Included in the retired Rubedo Plated Steam Trading Card collection as the uncommon-rarity Rubedo Plated Yamako Syandana.',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Twin Vipers Obsidian Skin': {
    section: 'Acquisition',
    text: 'Included in the retired PlayStation Renown Pack IV; the Wiki labels the item “Twin Viper Obsidian Skin.”',
    url: 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards',
  },
  'Alliance Sigil': {
    section: 'Acquisition',
    text: 'The Wiki identifies this as the Alliance Emblem variant: it is purchased from the Market for 30 Platinum and displays the alliance emblem on the Warframe shoulder.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
  'Primate Sigil': {
    section: 'Disposition',
    text: 'The export path identifies this as the China-exclusive Monquis Sigil variant; the Wiki documents the Monquis Sigil as a Lunar New Year China-exclusive item, with no global-build route.',
    url: 'https://wiki.warframe.com/w/Lunar_Renewal',
  },
  'Year of The Rooster Sigil': {
    section: 'Event acquisition',
    text: 'A Lunar New Year Year of the Rooster event sigil; the Wiki documents the Rooster Sigil as the themed reward for that event, which has ended.',
    url: 'https://wiki.warframe.com/w/Lunar_Renewal',
  },
  'Vauban Heirloom Schema Sigil': {
    section: 'Acquisition',
    text: 'Available from the Vauban Heirloom Collection for 400 Platinum, or individually from the Market for 25 Platinum.',
    url: 'https://wiki.warframe.com/w/Sigils',
  },
  "Ki'Teer Razza Elixis Syandana": {
    section: 'Acquisition',
    text: "The export's Elixis name corresponds to the Wiki's Ki'Teer Razza Syandana entry: purchase it from Baro Ki'Teer for 400 Ducats and 350,000 Credits when offered.",
    url: 'https://wiki.warframe.com/w/Baro_Ki%27Teer',
  },
  'Unlock Arbitrations': {
    section: 'Star Chart unlock',
    text: 'Unlocks when the player completes the Eris Junction task required for Arbitrations after gaining access to Pluto; the item is the unlock marker, not a separately purchasable resource.',
    url: 'https://wiki.warframe.com/w/Arbitrations',
  },
  'Crestbear Glyph': {
    section: 'Creator Glyphs',
    text: 'Listed by the Warframe Wiki as a Creator Glyph. Creator Glyphs may be distributed personally by the creator or through a universal promo code; availability can change.',
    url: 'https://wiki.warframe.com/w/Glyph',
  },
  'Darkfreack Glyph': {
    section: 'Creator Glyphs',
    text: 'Listed by the Warframe Wiki as a Creator Glyph. Creator Glyphs may be distributed personally by the creator or through a universal promo code; availability can change.',
    url: 'https://wiki.warframe.com/w/Glyph',
  },
  'Depths Glyph': {
    section: 'Creator Glyphs',
    text: 'Listed by the Warframe Wiki as a Creator Glyph. Creator Glyphs may be distributed personally by the creator or through a universal promo code; availability can change.',
    url: 'https://wiki.warframe.com/w/Glyph',
  },
  'Ferreusdemon Glyph': {
    section: 'Creator Glyphs',
    text: 'Listed by the Warframe Wiki among the Creator Glyph promo entries. Creator Glyph promo codes and personal distribution can change or be deactivated.',
    url: 'https://wiki.warframe.com/w/Glyph',
  },
  'N00blshowtek Glyph': {
    section: 'Creator Glyphs',
    text: 'Listed by the Warframe Wiki among the Creator Glyph promo entries. Creator Glyph promo codes and personal distribution can change or be deactivated.',
    url: 'https://wiki.warframe.com/w/Glyph',
  },
  'Tcn Glyph': {
    section: 'Creator Glyphs',
    text: 'Listed by the Warframe Wiki as the TCN Creator Glyph. Creator Glyphs may be distributed personally by the creator or through a universal promo code; availability can change.',
    url: 'https://wiki.warframe.com/w/Glyph',
  },
  'Warframe Runway Glyph': {
    section: 'Community Glyphs',
    text: 'Listed by the Warframe Wiki among Community Glyph promo entries; the associated community distribution or promo-code availability can change.',
    url: 'https://wiki.warframe.com/w/Glyph',
  },
  'Warframe Wiki Glyph': {
    section: 'Community Glyphs',
    text: 'Listed by the Warframe Wiki among Community Glyph promo entries; the associated community distribution or promo-code availability can change.',
    url: 'https://wiki.warframe.com/w/Glyph',
  },
  'Korean Community Discord Glyph': {
    section: 'Community Glyphs',
    text: 'Listed by the Warframe Wiki as a Community Glyph for the Korean Warframe community; the page does not give a current universal code or permanent purchase route.',
    url: 'https://wiki.warframe.com/w/Glyph',
  },
  'Year Ten Anniversary Glyph': {
    section: 'Anniversary',
    text: 'Available to all players during the Year Ten Anniversary event; that event has ended.',
    url: 'https://wiki.warframe.com/w/Glyph',
  },
  'Zylok Elixis Skin': {
    section: 'Disposition',
    text: 'The Warframe Wiki lists this exact skin as never having been offered; its price and an obtainable route are unknown.',
    url: 'https://wiki.warframe.com/w/Weapon_Cosmetics',
  },
  'Air Martial': {
    section: 'Verification status',
    text: 'The exact export object is a legacy Conclave PvP melee mod. The current Wiki Conclave Mods page does not list this legacy name individually, so its exact standing cost or current availability is unverified.',
    url: 'https://wiki.warframe.com/w/Conclave_Mods',
  },
  'Harrowed Hook': {
    section: 'Verification status',
    text: 'The exact export object is a legacy Conclave PvP melee mod. The current Wiki Conclave Mods page does not list this legacy name individually, so its exact standing cost or current availability is unverified.',
    url: 'https://wiki.warframe.com/w/Conclave_Mods',
  },
  'Fizzbang Flourish': {
    section: 'Verification status',
    text: 'The exact export object is a legacy K-Drive mod. The current Wiki K-Drive Mods page does not list this legacy name individually, so its exact standing cost or current availability is unverified.',
    url: 'https://wiki.warframe.com/w/K-Drive_Mods',
  },
  'PLAY EMBLEM': {
    section: 'Acquisition',
    text: 'Acquired by participating in the closed/open alpha or beta tests for Warframe China; the Wiki lists the exact PLAY EMBLEM under that China-only group.',
    url: 'https://wiki.warframe.com/w/Emblems',
  },
};

const additions = Object.entries(records).filter(([name]) => !data[name]);
if (additions.length === 0) {
  console.log('No new exact Wiki acquisition records to promote.');
} else {
  const body = baseline.trimEnd().replace(/\n\s*}\s*$/, '');
  const lines = additions.map(([name, record], index) => {
    const entry = JSON.stringify({ [name]: record });
    const compact = entry.slice(1, -1);
    return `${index === 0 ? '  ,' : '  '}${compact}${index === additions.length - 1 ? '' : ','}`;
  });
  writeFileSync(path, `${body}\n${lines.join('\n')}\n  }\n`);
  console.log(`Promoted ${additions.length} exact Wiki acquisition records.`);
}
