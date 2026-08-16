# Current acquisition gaps

Generated: 2026-08-16T00:15:34.032Z

This report runs the current `getAcquisitionInfo()` implementation against the real local export, bundled warframe-items acquisition data, curated wiki assets, and browse.wf Glyph data.

Catalog items audited: **12955**
Items with concrete acquisition records: **12829**
Generic wiki / no-info items: **0**
Generic Foundry sentence items: **0**
Unobtainable export placeholders: **37**
Records without a DE export identity (verified against a supplemental structured source instead): **1422**
Records without concrete acquisition evidence: **0**
Manual assertions still requiring source verification: **0**
Records with Foundry details but no verified acquisition route: **0**
Records with verified unavailable/disposition evidence: **89**

The app represents both “generic wiki” and “no info” as `sources: []`; those items are listed together below with their unique path and resolver reason.

## Generic Foundry sentence

| Name | Unique name | Category | Current text |
|---|---|---|---|
| None |  |  |  |

## Generic wiki / no info

| Name | Unique name | Category | Fallback reason |
|---|---|---|---|
| None |  |  |  |

## Foundry details without a verified acquisition route

| Name | Unique name | Category | Current Foundry text | Review reason | Wiki |
|---|---|---|---|---|---|
| None |  |  |  |  |  |

## Records without concrete acquisition evidence

| Name | Unique name | Category | Current status text | Wiki | Wiki-repo exact record |
|---|---|---|---|---|---|
| None |  |  |  |  |  |

## Manual acquisition assertions requiring source verification

| Name | Unique name | Category | Current assertion | Wiki |
|---|---|---|---|---|
| None |  |  |  |  |

## Verified unavailable / disposition records

| Name | Unique name | Category | Evidence | Wiki |
|---|---|---|---|---|
| Amalgam Glyph | `/Lotus/Types/AvatarImages/Factions/GlyphFactionAmalgam` | Glyphs | This is an internal faction glyph record for the Amalgam faction. It has no player-facing Market, drop, quest, or vendor route in the current export; existing copies are legacy-owned only. | https://wiki.warframe.com/w/Amalgam_Glyph |
| BaseOperatorAnims | `/Lotus/Upgrades/Skins/Operator/AnimationSets/BaseOperatorAnims` | ExportCustoms | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/BaseOperatorAnims |
| Beckonsnare | `/Lotus/Types/Restoratives/Consumable/Eidolon/LandscapeTrapLightGear` | ExportGear | The export identifies Beckonsnare as a legacy conservation trap with a 500-Credit base cost, but excludes it from the Market and records no current vendor, drop, or quest route. Treat it as an owned-only legacy item. | https://wiki.warframe.com/w/Beckonsnare |
| Bennyfits Glyph | `/Lotus/Types/AvatarImages/FanChannel/AvatarImageBennyfits` | Glyphs | Legacy creator glyph. The current browse.wf record contains only a glyphwave identifier and no active promo code, giveaway, or source link; existing copies are legacy-owned. | https://browse.wf/ |
| Bikeman Glyph | `/Lotus/Types/AvatarImages/FanChannel/AvatarImageBikeman` | Glyphs | Legacy creator glyph. The current browse.wf record contains only a glyphwave identifier and no active promo code, giveaway, or source link; existing copies are legacy-owned. | https://browse.wf/ |
| Boar Phosphor Skin | `/Lotus/Upgrades/Skins/VoidTrader/VTBoar` | ExportCustoms | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/Boar_Phosphor_Skin |
| BRONZE RHINO HELMET | `/Lotus/Upgrades/Skins/Rhino/ChangYou/CYRhinoRubedoSkinHelmet` | ExportCustoms | A Warframe China promotional exclusive associated with Rhino Bronze Skin; it is not an obtainable global-build item. | https://wiki.warframe.com/w/WARFRAME_(China) |
| Chat Moderator Glyph | `/Lotus/Types/AvatarImages/AvatarImageChatModerator` | Glyphs | Awarded to Warframe chat moderators as a role privilege; it is not a Market item or a general promo-code reward. | https://warframe.fandom.com/wiki/Glyph |
| Cookie Boot Glyph | `/Lotus/Types/AvatarImages/AvatarImageGlyphCookieBoot` | Glyphs | This is a legacy promotional/creator glyph, not a normal Market item. The exact non-tradable record has no current universal public code or active route. | https://wiki.warframe.com/w/Cookie_Boot_Glyph |
| Cycle One Sigil | `/Lotus/Upgrades/Skins/Sigils/PS4OneYearSigil` | ExportCustoms | Console-exclusive PS4 anniversary sigil; it cannot be obtained on PC. | https://wiki.warframe.com/w/Sigils |
| Cycle Three Sigil | `/Lotus/Upgrades/Skins/Sigils/PS4ThreeYearSigil` | ExportCustoms | Console-exclusive PS4 anniversary sigil; it cannot be obtained on PC. | https://wiki.warframe.com/w/Sigils |
| Dagath Immortal Armor | `/Lotus/Upgrades/Skins/Armor/WarframeDefaults/DagathImmortalArmArmor` | ExportCustoms | This armor is included with the Dagath Immortal Skin, but the exact export record is non-tradable and excluded from the Market. The Dagath Immortal set is currently unobtainable and can only be chat-linked. | https://wiki.warframe.com/w/Dagath_Immortal_Skin |
| Dagath Immortal Helmet | `/Lotus/Upgrades/Skins/Dagath/DagathImmortalHelmet` | ExportCustoms | This helmet is included with the Dagath Immortal Skin, but the exact export record is non-tradable and excluded from the Market. The Dagath Immortal set is currently unobtainable and can only be chat-linked. | https://wiki.warframe.com/w/Dagath_Immortal_Skin |
| Dagath Immortal Skin | `/Lotus/Upgrades/Skins/Dagath/DagathImmortalSkin` | ExportCustoms | The Dagath Immortal Skin includes the Dagath Immortal Armor and Helmet. The exact export record is non-tradable and excluded from the Market; the set is currently unobtainable and can only be chat-linked. | https://wiki.warframe.com/w/Dagath_Immortal_Skin |
| Digital Extremes Glyph | `/Lotus/Types/AvatarImages/AvatarImageGlyphDELogo` | Glyphs | This Digital Extremes logo glyph is a staff/promotional record, not a normal Market item. The exact legacy record is non-tradable and has no public player acquisition route recorded. | https://wiki.warframe.com/w/Digital_Extremes_Glyph |
| Drakgoon Bronze Skin | `/Lotus/Upgrades/Skins/Promo/ChangYou/CYRubedoDrakgoonCamo` | ExportCustoms | A Warframe China promotional exclusive; the Wiki lists Drakgoon Bronze Skin among the China-only items. It is not an obtainable global-build item. | https://wiki.warframe.com/w/WARFRAME_(China) |
| Dual Skana Infested Skin | `/Lotus/Upgrades/Skins/SteamWorkshop/Melee/Swords/DualSkanaInfestedSkin` | ExportCustoms | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/Dual_Skana_Infested_Skin |
| Dual Swords Frysta Skin | `/Lotus/Upgrades/Skins/Deluxe/FrostDeluxeDualSword` | ExportCustoms | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/Dual_Swords_Frysta_Skin |
| ENGINE COWLING | `/Lotus/Types/Items/ShipFeatureItems/Railjack/RailjackHoodFeatureItem` | ExportResources | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/ENGINE_COWLING |
| EUROPA NAV SEGMENT | `/Lotus/Types/Items/ShipFeatureItems/EuropaNavigationFeatureItem` | ExportResources | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/EUROPA_NAV_SEGMENT |
| Flaming Sigil | `/Lotus/Upgrades/Skins/Sigils/FireSigil` | ExportCustoms | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/Flaming_Sigil |
| Flickering Sigil | `/Lotus/Upgrades/Skins/Sigils/SparkSigil` | ExportCustoms | The Flickering Sigil is a legacy non-tradable sigil. The export records a 75-Platinum historical cost but excludes the exact item from the current Market; no current acquisition route is documented. | https://wiki.warframe.com/w/Flickering_Sigil |
| Forma Sigil | `/Lotus/Upgrades/Skins/Sigils/FormaSigil` | ExportCustoms | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/Forma_Sigil |
| FUSELAGE | `/Lotus/Types/Items/ShipFeatureItems/Railjack/RailjackHullFeatureItem` | ExportResources | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/FUSELAGE |
| GALATINE BRONZE SKIN | `/Lotus/Upgrades/Skins/Promo/ChangYou/CYRubedoGalatineCamo` | ExportCustoms | A Warframe China promotional exclusive; the Wiki lists Galatine Bronze Skin among the China-only items. It is not an obtainable global-build item. | https://wiki.warframe.com/w/WARFRAME_(China) |
| Gauvan Umbra Sekhara | `/Lotus/Upgrades/Skins/Clan/ExcaliburUmbraBadgeItem` | ExportCustoms | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/Gauvan_Umbra_Sekhara |
| Gcx 2024 Glyph | `/Lotus/Types/AvatarImages/AvatarImageGamingCommunityExpoTwentyFour` | Glyphs | This GCX 2024 glyph is an event/promotional record, not a normal Market item. The current export and exact Wiki identity record do not expose a reusable public code or active route; existing copies are legacy-owned only. | https://wiki.warframe.com/w/Gcx_2024_Glyph |
| Ghost Leader Emblem | `/Lotus/Upgrades/Skins/Clan/LeaderBadgeGhostItem` | ExportCustoms | Listed by the Wiki under Cut Content: Clan Leaderboard Emblems. No live acquisition route is documented. | https://wiki.warframe.com/w/Emblems |
| Glyphed Sigil | `/Lotus/Upgrades/Skins/Sigils/TwoToneSigil` | ExportCustoms | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/Glyphed_Sigil |
| Gneissic Ink (Light) | `/Lotus/Upgrades/Skins/Operator/Tattoos/TattooGeodeGrey` | ExportCustoms | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/Gneissic_Ink_(Light) |
| Gneissic Ink (Mid) | `/Lotus/Upgrades/Skins/Operator/Tattoos/TattooGeode` | ExportCustoms | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/Gneissic_Ink_(Mid) |
| Guides Of The Lotus Glyph | `/Lotus/Types/AvatarImages/AvatarImageLotusGuide` | Glyphs | Awarded to Guides of the Lotus while that volunteer program existed. The program was removed, so this glyph is no longer obtainable through a current player program. | https://warframe.fandom.com/wiki/Sigils?page=2&title=Sigils |
| Infestation Glyph | `/Lotus/Types/AvatarImages/Factions/GlyphFactionInfested` | Glyphs | This is an internal faction glyph record for the Infested faction. It has no player-facing Market, drop, quest, or vendor route in the current export; existing copies are legacy-owned only. | https://wiki.warframe.com/w/Infestation_Glyph |
| Infested Deimos Glyph | `/Lotus/Types/AvatarImages/Factions/GlyphFactionDeimos` | Glyphs | This is an internal faction glyph record for the Infested Deimos faction. It has no player-facing Market, drop, quest, or vendor route in the current export; existing copies are legacy-owned only. | https://wiki.warframe.com/w/Infested_Deimos_Glyph |
| Legendary Quasars Glyph | `/Lotus/Types/AvatarImages/AvatarImageGlyphLegendaryQuasars` | Glyphs | This is a legacy creator/partner glyph distributed through creator-controlled promotions rather than the Market. The exact non-tradable record has no current universal public route. | https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs |
| Lotus Symbol Glyph | `/Lotus/Types/AvatarImages/AvatarImageCreatorWgrates` | Glyphs | This Lotus Symbol Glyph is a creator/fan-channel distribution record, not a normal Market item. The exact legacy record is non-tradable and its creator-controlled distribution is the acquisition route when available. | https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs |
| Lotus Symbol Glyph | `/Lotus/Types/AvatarImages/FanChannel/AvatarImageDesRPG` | Glyphs | The DesRPG Lotus Symbol Glyph was a creator glyph; the glyphs.wf partner record marks it as no longer in the game. Existing copies are legacy-owned only. | https://glyphs.wf/ |
| Lotus Symbol Glyph | `/Lotus/Types/AvatarImages/FanChannel/AvatarImageDramakins` | Glyphs | This Lotus Symbol Glyph was distributed through Dramakins’ Warframe Partner/Creator channel, not the Market; creator-controlled giveaways or promo distribution were the acquisition route. | https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs |
| Lotus Symbol Glyph | `/Lotus/Types/AvatarImages/FanChannel/AvatarImageKacchi` | Glyphs | This Lotus Symbol Glyph was distributed through KingKacchi’s Warframe Partner/Creator channel, not the Market; creator-controlled giveaways or promo distribution were the acquisition route. | https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs |
| Lotus Symbol Glyph | `/Lotus/Types/AvatarImages/FanChannel/AvatarImageLovinDaTacos` | Glyphs | This Lotus Symbol Glyph was distributed through the named Warframe Partner/Creator channel, not the Market; creator-controlled giveaways or promo distribution were the acquisition route. | https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs |
| Lotus Symbol Glyph | `/Lotus/Types/AvatarImages/FanChannel/AvatarImageSenastra` | Glyphs | This Lotus Symbol Glyph was distributed through the named Warframe Partner/Creator channel, not the Market; creator-controlled giveaways or promo distribution were the acquisition route. | https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs |
| MARS NAV SEGMENT | `/Lotus/Types/Items/ShipFeatureItems/MarsNavigationFeatureItem` | ExportResources | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/MARS_NAV_SEGMENT |
| Mglblaze Glyph | `/Lotus/Types/AvatarImages/FanChannel/AvatarImageMGLblaze` | Glyphs | This is a creator glyph distributed through MGLblaze’s Warframe Partner/Creator channel, not a normal Market item. The exact legacy record is non-tradable; creator-controlled giveaways or promo distribution are the acquisition route when available. | https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs |
| Missile Battery | `/Lotus/Types/Restoratives/LisetLaserTurret` | ExportGear | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/Missile_Battery |
| Moon Leader Emblem | `/Lotus/Upgrades/Skins/Clan/LeaderBadgeMoonItem` | ExportCustoms | Listed by the Wiki under Cut Content: Clan Leaderboard Emblems. No live acquisition route is documented. | https://wiki.warframe.com/w/Emblems |
| Mountain Leader Emblem | `/Lotus/Upgrades/Skins/Clan/LeaderBadgeMountainItem` | ExportCustoms | Listed by the Wiki under Cut Content: Clan Leaderboard Emblems. No live acquisition route is documented. | https://wiki.warframe.com/w/Emblems |
| MuseumDogTag | `/Lotus/Types/Items/SyndicateDogTags/MuseumDogTag` | ExportResources | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/MuseumDogTag |
| Narmer Eye Sigil | `/Lotus/Upgrades/Skins/Sigils/NarmerEyeSigil` | ExportCustoms | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/Narmer_Eye_Sigil |
| Nvidia Braton | `/Lotus/Upgrades/Skins/Nvidia/NvidiaBratonSkin` | ExportCustoms | The Wiki identifies this as part of an unreleased NVIDIA GPU promotion; no obtainable route was released. | https://wiki.warframe.com/w/Weapon_Cosmetics |
| OperatorCustomization | `/Lotus/Upgrades/Skins/Operator/OperatorCustomization` | ExportCustoms | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/OperatorCustomization |
| Orokin Glyph | `/Lotus/Types/AvatarImages/Factions/GlyphFactionOrokin` | Glyphs | This is an internal faction glyph record for the Orokin faction. It has no player-facing Market, drop, quest, or vendor route in the current export; existing copies are legacy-owned only. | https://wiki.warframe.com/w/Orokin_Glyph |
| Owned Peely Pak | `/Lotus/Types/Items/MiscItems/1999FreeStickersPack` | ExportResources | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/Owned_Peely_Pak |
| PHOBOS NAV SEGMENT | `/Lotus/Types/Items/ShipFeatureItems/PhobosNavigationFeatureItem` | ExportResources | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/PHOBOS_NAV_SEGMENT |
| Phoenix Coronet Sigil | `/Lotus/Upgrades/Skins/Sigils/CNYRoosterPWSigil` | ExportCustoms | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/Phoenix_Coronet_Sigil |
| POP! | `/Lotus/Upgrades/Skins/Hoverboard/HoverboardStickerPromoA` | ExportCustoms | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/POP! |
| PORT NACELLE | `/Lotus/Types/Items/ShipFeatureItems/Railjack/RailjackNacelleLeftFeatureItem` | ExportResources | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/PORT_NACELLE |
| Primate Sigil | `/Lotus/Upgrades/Skins/Sigils/MonquisCYSigil` | ExportCustoms | The export path identifies this as the China-exclusive Monquis Sigil variant; the Wiki documents the Monquis Sigil as a Lunar New Year China-exclusive item, with no global-build route. | https://wiki.warframe.com/w/Lunar_Renewal |
| Prisma Latron Shoulder Plate | `/Lotus/Upgrades/Skins/Armor/TnLatronArmor/TnLatronArmArmorPrisma` | ExportCustoms | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/Prisma_Latron_Shoulder_Plate |
| PROPULSION SYSTEMS | `/Lotus/Types/Items/ShipFeatureItems/Railjack/RailjackHoodBraceFeatureItem` | ExportResources | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/PROPULSION_SYSTEMS |
| Protea Immortal Helmet | `/Lotus/Upgrades/Skins/Odalisk/ProteaImmortalHelmet` | ExportCustoms | This helmet is included with the Protea Immortal Skin, but the exact export record is non-tradable and excluded from the Market. The Protea Immortal set is currently unobtainable and can only be chat-linked. | https://wiki.warframe.com/w/Protea_Immortal_Skin |
| Protea Immortal Skin | `/Lotus/Upgrades/Skins/Odalisk/ProteaImmortalSkin` | ExportCustoms | The Protea Immortal Skin includes the Protea Immortal Helmet. The exact export record is non-tradable and excluded from the Market; the set is currently unobtainable and can only be chat-linked. | https://wiki.warframe.com/w/Protea_Immortal_Skin |
| RHINO BRONZE SKIN | `/Lotus/Upgrades/Skins/Rhino/ChangYou/CYRhinoRubedoSkin` | ExportCustoms | A Warframe China promotional exclusive; the Wiki lists Rhino Bronze Skin among the China-only items. It is not an obtainable global-build item. | https://wiki.warframe.com/w/WARFRAME_(China) |
| Rhino Rubedo Plated Helmet | `/Lotus/Upgrades/Skins/Rhino/RhinoRubedoSkinHelmet` | ExportCustoms | This helmet was part of the retired Rubedo Plated Rhino Skin collection, which was distributed through Steam Trading Cards. The exact export record is non-tradable and excluded from the current Market. | https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards |
| SATURN NAV SEGMENT | `/Lotus/Types/Items/ShipFeatureItems/SaturnNavigationFeatureItem` | ExportResources | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/SATURN_NAV_SEGMENT |
| Save Popcorn Glyph | `/Lotus/Types/AvatarImages/SavePopcornGlyph` | Glyphs | This is a legacy promotional glyph, not a normal Market item. The exact non-tradable record has no current universal public code or active route. | https://wiki.warframe.com/w/Save_Popcorn_Glyph |
| Scorpion Specter | `/Lotus/Types/Restoratives/Consumable/MacheteWomanBall` | ExportGear | The export identifies Scorpion Specter as a legacy, non-tradable specter item excluded from the Market. No current player-facing source is recorded; existing copies are owned-only. | https://wiki.warframe.com/w/Scorpion_Specter |
| Seal Of Honoring | `/Lotus/Upgrades/Skins/Sigils/XBoneOneYearSigil` | ExportCustoms | Console-exclusive Xbox One anniversary sigil; it cannot be obtained on PC. | https://wiki.warframe.com/w/Sigils |
| Seal Of Honoring III | `/Lotus/Upgrades/Skins/Sigils/XBoneThreeYearSigil` | ExportCustoms | Console-exclusive Xbox One anniversary sigil; it cannot be obtained on PC. | https://wiki.warframe.com/w/Sigils |
| Shadow Leader Emblem | `/Lotus/Upgrades/Skins/Clan/LeaderBadgeShadowItem` | ExportCustoms | Listed by the Wiki under Cut Content: Clan Leaderboard Emblems. No live acquisition route is documented. | https://wiki.warframe.com/w/Emblems |
| SINGLE STAFF SKIN | `/Lotus/Upgrades/Skins/Promo/ChangYou/CYSingleStaffSkin` | ExportCustoms | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/SINGLE_STAFF_SKIN |
| Snow Globe | `/Lotus/Types/Restoratives/LisetShield` | ExportGear | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/Snow_Globe |
| Snowlit Glyph | `/Lotus/Types/AvatarImages/AvatarImageCreatorSnowLit` | Glyphs | This is a creator glyph distributed through Snowlit’s Warframe Partner/Creator channel, not a normal Market item. The exact legacy record is non-tradable; creator-controlled giveaways or promo distribution are the acquisition route when available. | https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs |
| Solaris Emblem | `/Lotus/Upgrades/Skins/Clan/SolarisBadgeItem` | ExportCustoms | The Solaris Emblem is the legacy Fortuna/Solaris emblem. The export records the exact emblem as non-tradable and excluded from the current Market; no current purchase or drop route is documented. | https://wiki.warframe.com/w/Solaris_Emblem |
| Sp00nerism Glyph | `/Lotus/Types/AvatarImages/FanChannel/AvatarImageSp00nerism` | Glyphs | Legacy creator glyph. The current browse.wf record contains only a glyphwave identifier and no active promo code, giveaway, or source link; existing copies are legacy-owned. | https://browse.wf/ |
| STARBOARD NACELLE | `/Lotus/Types/Items/ShipFeatureItems/Railjack/RailjackNacelleRightFeatureItem` | ExportResources | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/STARBOARD_NACELLE |
| Storm Leader Emblem | `/Lotus/Upgrades/Skins/Clan/LeaderBadgeStormItem` | ExportCustoms | Listed by the Wiki under Cut Content: Clan Leaderboard Emblems. No live acquisition route is documented. | https://wiki.warframe.com/w/Emblems |
| Summit1g Glyph | `/Lotus/Types/AvatarImages/FanChannel/AvatarImageSummit1G` | Glyphs | Legacy creator glyph. The current browse.wf record contains only a glyphwave identifier and no active promo code, giveaway, or source link; existing copies are legacy-owned. | https://browse.wf/ |
| TAIL SECTION | `/Lotus/Types/Items/ShipFeatureItems/Railjack/RailjackTailFeatureItem` | ExportResources | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/TAIL_SECTION |
| Tenno Translator Glyph | `/Lotus/Types/AvatarImages/AvatarImageTennoTranslator` | Glyphs | Awarded to players who contributed translations for Warframe; it is a role/contribution reward, not a Market item or public promo-code reward. | https://warframe.fandom.com/wiki/Sigils?page=2&title=Sigils |
| TennoVIP 2026 Sigil | `/Lotus/Upgrades/Skins/Sigils/TennoVIP2026Sigil` | ExportCustoms | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/TennoVIP_2026_Sigil |
| TennoVIP East Sigil | `/Lotus/Upgrades/Skins/Sigils/TennoVIP2024Sigil` | ExportCustoms | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/TennoVIP_East_Sigil |
| Top Hat & Monocle Glyph | `/Lotus/Types/AvatarImages/FanChannel/AvatarImageSzczebrzeszyniarz` | Glyphs | This is a creator glyph distributed through the named Warframe Partner/Creator channel, not a normal Market item. The exact legacy record is non-tradable; creator-controlled giveaways or promo distribution are the acquisition route when available. | https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs |
| VENUS NAV SEGMENT | `/Lotus/Types/Items/ShipFeatureItems/VenusNavigationFeatureItem` | ExportResources | The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded. | https://wiki.warframe.com/w/VENUS_NAV_SEGMENT |
| Vox Solaris Mask | `/Lotus/Upgrades/Skins/Operator/Accessories/OperatorNefAnyoMask` | ExportCustoms | The Vox Solaris Mask is an unreleased legacy cosmetic in the export: it is non-tradable, excluded from the Market, and has no released player acquisition route. | https://wiki.warframe.com/w/Vox_Solaris_Mask |
| Warframe Creator Glyph | `/Lotus/Types/AvatarImages/FanChannel/AvatarImagePartnerUpdated` | Glyphs | Distributed through the Warframe Creator/Partner program to eligible creators; the exact legacy record has no universal public purchase route and is not tradable. | https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs |
| Warframe Partner Glyph | `/Lotus/Types/AvatarImages/FanChannel/AvatarImagePartner` | Glyphs | Distributed through the Warframe Partner program to eligible creators; the exact legacy record has no universal public purchase route and is not tradable. | https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs |
| Warframe Partner Mug Glyph | `/Lotus/Types/AvatarImages/FanChannel/AvatarImagePartnerMug` | Glyphs | Distributed through the Warframe Partner program as a creator-glyph variant; the exact legacy record has no universal public purchase route and is not tradable. | https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs |
| Warframefanchannel Glyph | `/Lotus/Types/AvatarImages/FanChannel/AvatarImageWarframeFanChannel` | Glyphs | Distributed through the Warframe fan-channel/creator program; the exact legacy record has no universal public purchase route and is not tradable. | https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs |
| Zylok Elixis Skin | `/Lotus/Upgrades/Skins/Weapons/Pistols/ZylokExilisSkin` | ExportCustoms | The Warframe Wiki lists this exact skin as never having been offered; its price and an obtainable route are unknown. | https://wiki.warframe.com/w/Weapon_Cosmetics |

## Unobtainable export placeholders

| Name | Unique name | Category | Treatment |
|---|---|---|---|
| Helminth Ferocity | `/Lotus/Upgrades/Mods/Sentinel/Kubrow/ChargerFinisherMod` | ExportUpgrades | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Primed Charged Chamber | `/Lotus/Upgrades/Mods/Rifle/Expert/SniperReloadDamageModExpert` | ExportUpgrades | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Primed Fast Deflection | `/Lotus/Upgrades/Mods/Warframe/Expert/AvatarShieldRechargeRateModExpert` | ExportUpgrades | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Soaring Truth | `/Lotus/Upgrades/Mods/Syndicate/BallisticaMod` | ExportUpgrades | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Engineering/BaseChemReductionAura` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Engineering/BaseFrostReductionAura` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Engineering/BaseHealthBoost` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Engineering/BaseIncendiaryReductionAura` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Engineering/BaseIonicReductionAura` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Engineering/BaseMaxArmor` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Engineering/BaseMaxShield` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Engineering/BaseShieldRecharge` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Engineering/BaseShieldRedirectionMod` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Gunnery/BaseCorpusFactionDamage` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Gunnery/BaseDesperateMeasures` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Gunnery/BaseGrineerFactionDamage` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Gunnery/BaseGunnerWeaponCritChance` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Gunnery/BaseGunnerWeaponCritDamage` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Gunnery/BaseGunnerWeaponDamage` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Gunnery/BaseGunnerWeaponHeat` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Gunnery/BaseMaxOrdnanceMunitions` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Gunnery/BaseOrdnanceDamage` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Gunnery/BaseProtectiveShots` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Gunnery/BaseReduceArmorWeaponDamage` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Gunnery/BaseReducedOrdnanceReload` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Gunnery/BaseSuperWeaponDamage` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Gunnery/BaseWeaponFluxBoost` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Piloting/BaseArchwingArmorAura` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Piloting/BaseArchwingDamageAura` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Piloting/BaseArchwingShieldAura` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Piloting/BaseArchwingSpeedAura` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Piloting/BaseBoostSpeed` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Piloting/BaseCrewshipSpeedDamageAura` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Piloting/BaseDodge` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Piloting/BaseEmpPowerCap` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Piloting/BaseShieldBoost` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |
| Unfused Artifact | `/Lotus/Upgrades/Mods/Railjack/Piloting/BaseSpeed` | ExportAvionics | DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible. |

## Resolved source-stage counts

- avatar: 12
- bounty: 26
- drop: 2376
- enemy: 58
- key: 7
- mission: 287
- non-drop: 9388
- relic: 340
- sortie: 1
- syndicate: 284
- transient: 50

