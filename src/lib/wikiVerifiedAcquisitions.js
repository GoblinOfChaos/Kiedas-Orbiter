// Exact acquisition statements verified against aggregate Warframe Wiki
// source pages when an item's individual page does not expose the statement.
// Keep these keyed by DE uniqueName so similarly named objects cannot inherit
// an acquisition route by accident.
export const WIKI_VERIFIED_ACQUISITIONS = new Map([
  ['/Lotus/Weapons/Tenno/Akimbo/AkimboShotGun', {
    text: "Purchase the Akbronco blueprint from the Market; build it using two Bronco pistols and one Orokin Cell.",
    url: 'https://wiki.warframe.com/w/Akbronco',
    source: 'Warframe Wiki exact Akbronco acquisition section + DE ExportRecipes exact ingredient record',
  }],
  ['/Lotus/Upgrades/Mods/Warframe/Expert/AvatarAbilityEfficiencyModExpert', {
    text: 'No current acquisition route: the Wiki record has no vendor or drop source, marks the mod untradeable/untransmutable, and identifies it as hidden from the Codex.',
    url: 'https://wiki.warframe.com/w/Primed_Streamline',
    source: 'Warframe Wiki exact Primed Streamline infobox: empty vendor/drop data, untradeable, untransmutable, and Codex-secret fields',
  }],
  ['/Lotus/Upgrades/Mods/Warframe/AvatarDamageResistanceStun', {
    text: 'Unavailable: it was briefly obtainable through a transmutation bug after Update 10.6, but that bug was fixed and there is currently no legitimate acquisition route.',
    url: 'https://wiki.warframe.com/w/Resilient_Focus',
    source: 'Warframe Wiki exact Resilient Focus acquisition section states the transmutation bug was fixed and no current route exists',
  }],
  ['/Lotus/Upgrades/Skins/Sony/ExcaliburPSPlusSkin', {
    text: 'Available through the PlayStation Store via the Obsidian Azura Collection; the exact export record is platform-exclusive and excluded from the current Market.',
    url: 'https://wiki.warframe.com/w/Excalibur_Obsidian_Skin',
    source: 'Warframe Wiki exact Excalibur Obsidian Skin acquisition section + DE export exact platform/exclusion fields',
  }],
  ['/Lotus/Types/Items/PhotoBooth/TauOldPeace/PhotoboothTileTauOldPeaceObjLiminalBossArena', {
    text: "Purchase from Roathe's Surplus for 150 Maphica; the exact export vendor manifest lists this Captura scene store item at that price.",
    url: 'https://wiki.warframe.com/w/Captura',
    source: "Warframe Wiki exact Captura SceneBox + DE ExportVendors exact Roathe manifest storeItem and 150 Maphica price",
  }],
  ['/Lotus/Types/Items/DangerRoom/DangerRoomTileDevilTowerUrielArena', {
    text: "Purchase from Roathe's rotating vendor manifest for 150 Maphica; the exact DE export vendor record lists this store item and price.",
    url: 'https://wiki.warframe.com/w/Roathe',
    source: "DE ExportVendors exact Roathe manifest storeItem and 150 Maphica price; no separate public Wiki page exists for this internal scene name",
  }],
  ['/Lotus/Upgrades/Skins/Hoverboard/HoverboardStickerNokkoC', {
    text: "Purchase Shooms from Nightcap's Wares for 25 Fergolyte at Rank 2 - Curious.",
    url: 'https://wiki.warframe.com/w/Nightcap',
    source: "Warframe Wiki exact Nightcap Wares record + DE ExportVendors exact storeItem, 25 Fergolyte price, and rank",
  }],
  ['/Lotus/Types/Sentinels/SentinelPowersuits/TnSentinelCrossPowerSuit', {
    text: 'Reward from the Venus Junction; the export challenge record awards the Taxon blueprint, and the current ExportSentinels record confirms Taxon is excluded from the Market.',
    url: 'https://wiki.warframe.com/w/Taxon',
    source: 'DE ExportChallenges exact Venus Junction Taxon blueprint reward + ExportSentinels exact exclusion/identity fields',
  }],
  ...[
    ['/Lotus/Weapons/Sentients/OperatorAmplifiers/SentTrainingAmplifier/SentAmpTrainingGrip', 'Mote Brace'],
    ['/Lotus/Weapons/Sentients/OperatorAmplifiers/SentTrainingAmplifier/SentAmpTrainingBarrel', 'Mote Prism'],
    ['/Lotus/Weapons/Sentients/OperatorAmplifiers/SentTrainingAmplifier/SentAmpTrainingChassis', 'Mote Scaffold'],
  ].map(([path, name]) => [path, {
    text: `This is the ${name} component displayed as part of the Mote Amp; the Mote Amp is automatically given by the Quills on first access to their Cetus chamber, or its blueprint can be bought from them for 500 standing.`,
    url: 'https://wiki.warframe.com/w/Mote_Amp',
    source: `Warframe Wiki exact Mote Amp acquisition/component record + DE export exact ${name} identity`,
  }]),
  ['/Lotus/Upgrades/Skins/Scarves/ZephyrQTCCSyandana', {
    text: 'Obtained during a Conquera event; the exact Conquera Syandana event record is the source for this promotional syandana.',
    url: 'https://wiki.warframe.com/w/Conquera_Syandana',
    source: 'Warframe Wiki exact Conquera Syandana event record + DE export exact cosmetic identity',
  }],
  ['/Lotus/Upgrades/Skins/Sentinels/Wings/JetWingsRight', {
    text: 'Included in the Coltek Sentinel Pack (Sentinel Accessory Pack 2), purchasable from the Market for 44 Platinum; Jet Sentinel Wings is listed as a 15 Platinum pack component.',
    url: 'https://wiki.warframe.com/w/Sentinel_Accessory_Pack_2',
    source: 'Warframe Wiki exact Sentinel Accessory Pack 2 bundle table + DE ExportBundles exact Jet Wings component identity',
  }],
  ['/Lotus/Powersuits/SiriusOrion/OrionSuit', {
    text: 'The player chooses Orion or Sirius while completing the Jade Shadows: Constellations quest; the resulting choice is not separately farmable.',
    url: 'https://wiki.warframe.com/w/Jade_Shadows',
    source: 'Warframe Wiki exact Jade Shadows quest record names the Orion/Sirius choice + DE export exact identity',
  }],
  ['/Lotus/Powersuits/Frumentarius/Frumentarius', {
    text: 'Quest reward from The Hex, or purchase the blueprint and component blueprints from Amir of The Hex for 50,000 standing at Rank 4.',
    url: 'https://wiki.warframe.com/w/Cyte-09',
    source: 'WFCD/wiki vendor record exact Cyte-09 blueprint components=Amir + DE export exact Warframe identity',
  }],
  ['/Lotus/Powersuits/Choir/Choir', {
    text: 'Quest reward from Jade Shadows; the blueprint and component blueprints are also available from the Release Vestigial Motes vendor.',
    url: 'https://wiki.warframe.com/w/Jade',
    source: 'Structured Wiki vendor record exact Jade blueprint components=Release Vestigial Motes + DE export exact Warframe identity',
  }],
  ['/Lotus/Powersuits/ConcreteFrame/ConcreteFrame', {
    text: 'Quest reward from Whispers in the Walls; blueprint and component blueprints are also available from Bird 3 of Cavia.',
    url: 'https://wiki.warframe.com/w/Qorvex',
    source: 'Structured Wiki vendor record exact Qorvex blueprint components=Bird 3 + DE export exact Warframe identity',
  }],
  ['/Lotus/Powersuits/EntratiMech/NechroTech', {
    text: 'Heart of Deimos grants the Necramech component blueprints; damaged components come from Isolation Vault Necramechs or Father, and the Voidrig blueprint/components are also available from Necraloid.',
    url: 'https://wiki.warframe.com/w/Necramech',
    source: 'Warframe Wiki exact Necramech acquisition section + structured vendor record exact Voidrig components=Necraloid + DE export exact identity',
  }],
  ['/Lotus/Powersuits/PaxDuviricus/PaxDuviricus', {
    text: "Purchase Kullervo's blueprint and components from Acrithis in Kullervo's Archive using Kullervo's Bane; the blueprint requires 15 Banes and each component 9 Banes.",
    url: 'https://wiki.warframe.com/w/Kullervo',
    source: "Structured Wiki vendor record exact Kullervo blueprint/components=Kullervo's Archive + DE export exact Warframe identity",
  }],
  ['/Lotus/Weapons/Lasria/LasGooPistol/LasGooPistolPlayerWeapon', {
    text: "Purchase the Efv-8 Mars blueprint and components from Minerva of The Hex for 15,000 standing at Rank 5.",
    url: 'https://wiki.warframe.com/w/Efv-8_Mars',
    source: 'Structured Wiki vendor record exact EFV-8 Mars blueprint/components=Minerva + DE export exact weapon identity',
  }],
  ['/Lotus/Powersuits/DemonFrame/DemonFrame', {
    text: "Quest reward from The Old Peace, or purchase Uriel's blueprint and components from Roathe in La Cathédrale for 75 Maphica.",
    url: 'https://wiki.warframe.com/w/Uriel',
    source: 'Structured Wiki vendor record exact Uriel blueprint/components=Roathe + DE export exact Warframe identity',
  }],
  ['/Lotus/Upgrades/Mods/Aura/PlayerEnergyHealthRegenAuraMod', {
    text: 'Awarded for completing the Earth to Venus Junction; also available from the rotating Nightwave Cred Offerings store for 20 Cred.',
    url: 'https://wiki.warframe.com/w/Dreamer%27s_Bond',
    source: "Warframe Wiki exact Dreamer's Bond acquisition section + DE export exact mod identity",
  }],
  ['/Lotus/Upgrades/Mods/Pistol/DualStat/MagneticCritDamagePistolMod', {
    text: 'Reward for completing The Hex quest.',
    url: 'https://wiki.warframe.com/w/Magnetic_Might',
    source: 'Warframe Wiki exact Magnetic Might drop-locations section + DE export exact mod identity',
  }],
  ['/Lotus/Upgrades/EmpoweredHeavyMelee/TennokaiBaseMod', {
    text: 'Reward for completing the Whispers in the Walls quest.',
    url: 'https://wiki.warframe.com/w/Mentor%27s_Legacy',
    source: "Warframe Wiki exact Mentor's Legacy drop-locations section + DE export exact mod identity",
  }],
  ['/Lotus/Upgrades/Mods/Immortal/ImmortalWildcardMod', {
    text: 'Drops from downed Kuva Liches or Sisters of Parvos; it can also be obtained by transmuting four used Requiem Mods.',
    url: 'https://wiki.warframe.com/w/Requiem_Mods',
    source: 'Warframe Wiki exact Requiem Mods drop/transmutation record + DE export exact Oull identity',
  }],
  ['/Lotus/Upgrades/Mods/Bows/Event/Nightwave/NightwaveStalkerBowAugmentMod', {
    text: "Originally awarded at Nightwave Nora's Mix Volume 7 Rank 25; it is now trade-only.",
    url: 'https://wiki.warframe.com/w/Unseen_Dread',
    source: 'Warframe Wiki exact Unseen Dread acquisition section + DE export exact mod identity',
  }],
  ['/Lotus/Upgrades/Mods/Rifle/Event/Nightwave/NightwaveEmbolistAugmentMod', {
    text: "Originally awarded at Nightwave Nora's Mix Volume 2 Rank 23; also purchasable from Daughter during Nights of Naberus for 50 Mother Tokens.",
    url: 'https://wiki.warframe.com/w/Vile_Discharge',
    source: 'Warframe Wiki exact Vile Discharge acquisition section + DE export exact mod identity',
  }],
  ['/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBEFerrox/CrpBEFerrox', {
    text: 'Purchase from Ergo Glast in a Relay for Corrupted Holokeys earned from Void Storm missions.',
    url: 'https://wiki.warframe.com/w/Tenet_Ferrox',
    source: 'Warframe Wiki exact Tenet Ferrox acquisition section + DE export exact weapon identity',
  }],
  ['/Lotus/Weapons/Tenno/Bows/DaxDuviriAsymetricalBow/DaxDuviriAsymmetricalLongBowPlayerWeapon', {
    text: 'Main and component blueprints are acquired by solving Duviri Enigma puzzles, with a 30% chance for one part per puzzle completion; all blueprints are tradable.',
    url: 'https://wiki.warframe.com/w/Cinta',
    source: 'Warframe Wiki exact Cinta acquisition template + DE export exact weapon identity',
  }],
  ['/Lotus/Powersuits/Excalibur/ExcaliburPrime', {
    text: 'Founders program exclusive: obtained only by upgrading a Warframe account to Hunter status or greater; the program closed on November 1, 2013 and is no longer available.',
    url: 'https://wiki.warframe.com/w/Excalibur/Prime',
    source: 'Warframe Wiki exact Excalibur Prime acquisition section + DE export exact Warframe identity',
  }],
  ['/Lotus/Powersuits/Excalibur/ExcaliburUmbra', {
    text: 'Blueprint given during the first mission of The Sacrifice quest; building is enabled after the second mission and the completed Warframe is granted during the penultimate mission.',
    url: 'https://wiki.warframe.com/w/Excalibur/Umbra',
    source: 'Warframe Wiki exact Excalibur Umbra acquisition section + DE export exact Warframe identity',
  }],
  ['/Lotus/Weapons/Thanotech/EntSphereHammer/EntSphereHammer', {
    text: "Purchase the Ekhein blueprint from Bird 3 of Cavia for 15,000 standing at Rank 3 - Colleague.",
    url: 'https://wiki.warframe.com/w/Ekhein',
    source: 'Warframe Wiki exact Ekhein acquisition section + DE export exact weapon identity',
  }],
  ['/Lotus/Weapons/Lasria/LasGrenadeLauncher/LasrianNoxPlayerWeapon', {
    text: "Purchase Purgator 1 blueprints from Minerva of The Hex at Rank 5 - Pizza Party: 15,000 standing for the main blueprint and 5,000 per component, or buy the Scaldra Dominance Pack.",
    url: 'https://wiki.warframe.com/w/Purgator_1',
    source: 'Warframe Wiki exact Purgator 1 acquisition section + DE export exact weapon identity',
  }],
  ['/Lotus/Weapons/Tenno/LongGuns/TnModQuestRifle/TnModQuestRifleWeapon', {
    text: "Reward during The Teacher quest with a free weapon slot and pre-installed Orokin Catalyst; additional copies are available from Cephalon Simaris for 100,000 standing.",
    url: 'https://wiki.warframe.com/w/Thornbak',
    source: 'Warframe Wiki exact Thornbak acquisition section + DE export exact weapon identity',
  }],
  ['/Lotus/Powersuits/Archwing/DemolitionJetPack/ExhaustTrailAugmentCard', {
    text: 'Elytron Archwing augment; obtained by defeating Eximus units in Archwing missions.',
    url: 'https://wiki.warframe.com/w/Afterburner',
    source: 'Warframe Wiki exact Afterburner drop-locations section + DE export exact mod identity',
  }],
  ['/Lotus/Powersuits/Archwing/StealthJetPack/GravInstabilityAugmentCard', {
    text: 'Itzal Archwing augment; obtained by defeating Eximus units in Archwing missions.',
    url: 'https://wiki.warframe.com/w/Cold_Snap',
    source: 'Warframe Wiki exact Cold Snap drop-locations section + DE export exact mod identity',
  }],
  ['/Lotus/Powersuits/Archwing/StandardJetPack/FireShieldAugmentCard', {
    text: 'Odonata Archwing augment; obtained by defeating Eximus units in Archwing missions.',
    url: 'https://wiki.warframe.com/w/Energy_Field',
    source: 'Warframe Wiki exact Energy Field drop-locations section + DE export exact mod identity',
  }],
  ['/Lotus/Types/Sentinels/SentinelPrecepts/ThrowGlaivePrecept', {
    text: 'Automatically acquired upon obtaining Helios or Helios Prime.',
    url: 'https://wiki.warframe.com/w/Targeting_Receptor',
    source: 'Warframe Wiki exact Targeting Receptor acquisition section + DE ExportUpgrades exact compatName=Helios',
  }],
  ['/Lotus/Types/Sentinels/SentinelPrecepts/UniversalVacuum', {
    text: 'One copy is granted whenever a Sentinel is claimed from the Foundry; it is not a mission drop.',
    url: 'https://wiki.warframe.com/w/Vacuum',
    source: 'Warframe Wiki exact Vacuum acquisition section + DE export exact mod identity',
  }],
  ['/Lotus/Upgrades/Mods/Warframe/Expert/AvatarKnockdownResistanceModExpert', {
    text: 'Daily Tribute login reward, awarded at the day 400, 600, or 900 milestone until selected.',
    url: 'https://wiki.warframe.com/w/Primed_Sure_Footed',
    source: 'Warframe Wiki exact Primed Sure Footed acquisition section + DE export exact mod identity',
  }],
  ['/Lotus/Weapons/Corpus/LongGuns/CrpBFG/Vandal/VandalCrpBFG', {
    text: 'Earn 100 cumulative points in the recurring Thermia Fractures event, or purchase from Baro Ki\'Teer for 550,000 Credits and 650 Ducats.',
    url: 'https://wiki.warframe.com/w/Opticor_Vandal',
    source: 'Warframe Wiki exact Opticor Vandal acquisition section + DE export exact weapon identity',
  }],
  ['/Lotus/Upgrades/Mods/Sentinel/SentinelRepairKitMod', {
    text: 'Drops from Domestik Drone enemies.',
    url: 'https://wiki.warframe.com/w/Repair_Kit',
    source: 'Warframe Wiki exact Repair Kit drop/farming record + DE export exact mod identity',
  }],
  ['/Lotus/Weapons/Grineer/KuvaLich/Secondaries/Stubba/KuvaStubba', {
    text: 'Generate a Kuva Twin Stubbas on a Kuva Lich, then vanquish that Kuva Lich; the weapon is placed in the Foundry ready to claim.',
    url: 'https://wiki.warframe.com/w/Adversary_Weapons',
    source: 'Warframe Wiki Adversary Weapons exact Kuva route + DE export exact Kuva Twin Stubbas identity',
  }],
  ...[
    ['/Lotus/Weapons/Tenno/Melee/Hammer/DaxDuviriHammer/DaxDuviriHammerPlayerWeapon', 'Sampotes'],
    ['/Lotus/Weapons/Tenno/Melee/Hammer/DaxDuviriHammer/DaxDuviriHammerWeapon', 'Sampotes'],
  ].map(([path, name]) => [path, {
    text: "Purchase the Sampotes blueprint from Teshin's Cave for 60 Pathos Clamps or 275 Platinum; the Clamp purchase unlocks the Drifter and Warframe versions, and additional Warframe copies are available from Cephalon Simaris for 100,000 standing.",
    url: 'https://wiki.warframe.com/w/Sampotes',
    source: 'Warframe Wiki exact Sampotes acquisition section + DE export exact weapon identity',
  }]),
  ...[
    ['/Lotus/Weapons/Tenno/Melee/Swords/DaxDuviriKatana/DaxDuviriKatanaPlayerWeapon', 'Syam'],
    ['/Lotus/Weapons/Tenno/Melee/Swords/DaxDuviriKatana/DaxDuviriKatanaWeapon', 'Syam'],
  ].map(([path, name]) => [path, {
    text: "Purchase the Syam blueprint from Teshin's Cave for 50 Pathos Clamps or 250 Platinum; the Clamp purchase unlocks the Drifter and Warframe versions, and additional Warframe copies are available from Cephalon Simaris for 100,000 standing.",
    url: 'https://wiki.warframe.com/w/Syam',
    source: 'Warframe Wiki exact Syam acquisition section + DE export exact weapon identity',
  }]),
  ...[
    ['/Lotus/Types/Friendly/PlayerControllable/Weapons/DuviriDualSwords', 'Sun & Moon'],
    ['/Lotus/Types/Friendly/PlayerControllable/Weapons/DuviriDualSwordsWeapon', 'Sun & Moon'],
  ].map(([path, name]) => [path, {
    text: "Blueprint rewarded on completion of The Duviri Paradox quest; additional copies are available from Cephalon Simaris for 100,000 standing.",
    url: 'https://wiki.warframe.com/w/Sun_%26_Moon',
    source: 'Warframe Wiki exact Sun & Moon acquisition section + DE export exact weapon identity',
  }]),
  ['/Lotus/Weapons/Tenno/Melee/MeleeTrees/DualKatanaCmbOneMeleeTree', {
    text: "Reward for completing The Duviri Paradox quest; this is the Mountain's Edge stance's exact Wiki acquisition route.",
    url: 'https://wiki.warframe.com/w/Mountain%27s_Edge',
    source: "Warframe Wiki exact Mountain's Edge acquisition section + DE export exact mod identity",
  }],
  ['/Lotus/Weapons/Tenno/LongGuns/PaxDuviricusShotgun/PaxDuviricusShotgun', {
    text: "Defeat Kullervo in Kullervo's Hold, then purchase the Rauta blueprint and components from Acrithis with Kullervo's Bane; the main blueprint costs 12 Banes and each component costs 6.",
    url: 'https://wiki.warframe.com/w/Rauta',
    source: 'Warframe Wiki exact Rauta acquisition section + DE export exact weapon identity',
  }],
  ['/Lotus/Weapons/Tenno/Zariman/Melee/HeavyScythe/ZarimanHeavyScythe/ZarimanHeavyScytheWeapon', {
    text: 'Purchase the Thalys blueprint from Acrithis or Dominus Thrax in the Dormizone for 96 Scuttler Husk from Isleweaver; access requires completion of The Hex quest.',
    url: 'https://wiki.warframe.com/w/Thalys',
    source: 'Warframe Wiki exact Thalys acquisition section + DE export exact weapon identity',
  }],
  ['/Lotus/Upgrades/EmpoweredHeavyMelee/CursedSyndicateEmpoweredHeavyMeleeMod', {
    text: "Purchase from Aspirant Zorba at any Relay for 360 Atramentum.",
    url: 'https://wiki.warframe.com/w/Truth%27s_Flame',
    source: "Warframe Wiki exact Truth's Flame acquisition section + DE export exact mod identity",
  }],
  ...[
    ['/Lotus/Weapons/Tenno/Melee/Staff/SingleStaff', 'Cadus', "Market blueprint for 50,000 Credits"],
    ['/Lotus/Weapons/Tenno/Melee/Swords/HeatSword/HeatLongSword', 'Heat Sword', "Once Awake quest reward; blueprint also via Nightwave Offerings"],
    ['/Lotus/Weapons/Tenno/Pistol/Pistol', 'Lato', "Awakening quest weapon choice; Market purchase for 10,000 Credits"],
    ['/Lotus/Weapons/Orokin/BallasSword/BallasSwordWeapon', 'Paracesis', "Chimera Prologue quest blueprint reward"],
    ['/Lotus/Weapons/Tenno/Melee/Swords/UmbraKatana/UmbraKatana', 'Skiajati', "The Sacrifice penultimate mission reward"],
  ].map(([path, name, route]) => [path, {
    text: `${route}; this is the ${name} weapon's exact Wiki acquisition route.`,
    url: `https://wiki.warframe.com/w/${name.replaceAll(' ', '_')}`,
    source: `Warframe Wiki exact ${name} acquisition section + DE export exact weapon identity`,
  }]),
  ...[
    ['/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModAgility', 'Agility Drift', 'Agility'],
    ['/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModCollaboration', 'Coaction Drift', 'Collaboration'],
    ['/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModCunning', 'Cunning Drift', 'Cunning'],
    ['/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModEndurance', 'Endurance Drift', 'Endurance'],
    ['/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModPower', 'Power Drift', 'Power'],
    ['/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModSpeed', 'Speed Drift', 'Speed'],
    ['/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModStealth', 'Stealth Drift', 'Stealth'],
  ].map(([path, name, test]) => [path, {
    text: `Reward for completing the ${test} Test in the Orokin Moon (Halls of Ascension); this is the ${name} mod's exact Wiki acquisition route.`,
    url: `https://wiki.warframe.com/w/${name.replaceAll(' ', '_')}`,
    source: `Warframe Wiki exact ${name} acquisition section + DE export exact mod identity`,
  }]),
  ...[
    ['/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedPredatorSpitAcidPrecept', 'Acidic Spittle', 'Vizier Predasite'],
    ['/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedPredatorHealingSporesPrecept', 'Iatric Mycelium', 'Vizier Predasite'],
    ['/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/KubrowDisarmPrecept', 'Neutralize', 'Chesa Kubrow'],
    ['/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/KubrowLootPrecept', 'Retrieve', 'Chesa Kubrow'],
    ['/Lotus/Types/Friendly/Pets/CatbrowPetPrecepts/CatbrowVampireBitePrecept', 'Draining Bite', 'Vasca Kavat'],
    ['/Lotus/Types/Friendly/Pets/CatbrowPetPrecepts/CatbrowTransfusionPrecept', 'Transfusion', 'Vasca Kavat'],
    ['/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/VulpineInfestedCatbrowRespawn', 'Sly Devolution', 'Sly Vulpaphyla'],
    ['/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedCatbrowEvasionBuffPrecept', 'Survival Instinct', 'Sly Vulpaphyla and undergoing revivification'],
  ].map(([path, name, companion]) => [path, {
    text: `Automatically acquired upon obtaining a ${companion}; this is the ${name} precept's exact Wiki acquisition route.`,
    url: `https://wiki.warframe.com/w/${name.replaceAll(' ', '_')}${name === 'Neutralize' ? '_(Mod)' : ''}`,
    source: `Warframe Wiki exact ${name} acquisition section + DE export exact precept identity`,
  }]),
  ...[
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetPhotonStrikePrecept', 'Aerial Prospectus', 'Wanz Stabilizer'],
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetClonePrecept', 'Diversified Denial', 'Urga Bracket'],
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetAntiMeleePrecept', 'Equilibrium Audit', 'Hec Model'],
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetEvasionPrecept', 'Evasive Denial', 'Zubb Bracket'],
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetMegaLaserPrecept', 'Focused Prospectus', 'Frak Stabilizer'],
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetStealEximusPrecept', 'Null Audit', 'Bhaira Model'],
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetMagneticRepulsePrecept', 'Reflex Denial', 'Cela Bracket'],
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetDisarmPulsePrecept', 'Repo Audit', 'Dorma Model'],
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetTeslaShotPrecept', 'Synergized Prospectus', 'Hinta Stabilizer'],
  ].map(([path, name, component]) => [path, {
    text: `Automatically acquired upon obtaining a Hound built with the ${component}; this is the ${name} precept's exact Wiki acquisition route.`,
    url: `https://wiki.warframe.com/w/${name.replaceAll(' ', '_')}`,
    source: `Warframe Wiki exact ${name} acquisition section states the ${component} route + DE export exact precept identity`,
  }]),
  ...[
    ['/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaLiftBombPrecept', 'Anti-Grav Grenade', 'Para'],
    ['/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaChargePrecept', 'Blast Shield', 'Nychus'],
    ['/Lotus/Upgrades/Mods/Sentinel/Moa/MoaMeleeMod', 'Hard Engage', 'Nychus'],
    ['/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaHackerPrecept', 'Security Override', 'Oloro'],
    ['/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaTractorBeamPrecept', 'Tractor Beam', 'Oloro'],
    ['/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaShockwavePrecept', 'Shockwave Actuators', 'Lambeo'],
    ['/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaStasisFieldPrecept', 'Stasis Field', 'Lambeo'],
    ['/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaTetherVaccumMinePrecept', 'Whiplash Mine', 'Para'],
  ].map(([path, name, model]) => [path, {
    text: `Automatically acquired upon obtaining a MOA built with the ${model} Model; this is the ${name} precept's exact Wiki acquisition route.`,
    url: `https://wiki.warframe.com/w/${name.replaceAll(' ', '_')}`,
    source: `Warframe Wiki exact ${name} acquisition section states the ${model} Model route + DE ExportUpgrades exact precept identity`,
  }]),
  ...[
    ['/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedPredatorInfectiousBitePrecept', 'Infectious Bite'],
    ['/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedPredatorFinisherSporesPrecept', 'Paralytic Spores'],
  ].map(([path, name]) => [path, {
    text: `Automatically acquired upon obtaining a Medjay Predasite; ${name} is one of the companion's two exclusive precepts.`,
    url: 'https://warframe.fandom.com/wiki/Medjay_Predasite',
    source: `Warframe Wiki exact Medjay Predasite exclusive-precept/acquisition record + DE ExportUpgrades exact ${name} compatName=Medjay Predasite`,
  }]),
  ...[
    ['/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedPredatorBuffSporesPrecept', 'Anabolic Pollination'],
    ['/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedPredatorSpitParasitePrecept', 'Endoparasitic Vector'],
  ].map(([path, name]) => [path, {
    text: `Automatically acquired upon obtaining a Pharaoh Predasite; ${name} is one of the companion's two exclusive precepts.`,
    url: 'https://warframe.fandom.com/wiki/Pharaoh_Predasite',
    source: `Warframe Wiki exact Pharaoh Predasite exclusive-precept record + DE ExportUpgrades exact ${name} compatName=Pharaoh Predasite`,
  }]),
  ...[
    ['/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedCatbrowGoreTossPrecept', 'Crescent Charge'],
    ['/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/HornedInfestedCatbrowRespawn', 'Crescent Devolution'],
  ].map(([path, name]) => [path, {
    text: `Automatically acquired upon obtaining a Crescent Vulpaphyla; ${name} is one of the companion's two exclusive precepts.`,
    url: 'https://warframe.fandom.com/wiki/Crescent_Vulpaphyla',
    source: `Warframe Wiki exact Crescent Vulpaphyla exclusive-precept record + DE ExportUpgrades exact ${name} compatName=Crescent Vulpaphyla`,
  }]),
  ...[
    ['/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/KubrowGrabPrecept', 'Proboscis'],
    ['/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/ChargerChargePrecept', 'Trample'],
  ].map(([path, name]) => [path, {
    text: `Automatically acquired upon obtaining a Helminth Charger; ${name} is an exclusive Helminth Charger precept.`,
    url: `https://warframe.fandom.com/wiki/${name}`,
    source: `Warframe Wiki exact ${name} acquisition section + DE ExportUpgrades exact ${name} compatName=Helminth Charger`,
  }]),
  ...[
    ['/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/ArmoredInfestedCatbrowRespawn', 'Panzer Devolution'],
    ['/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedKavatViralQuillsPrecept', 'Viral Quills'],
  ].map(([path, name]) => [path, {
    text: `Automatically acquired upon obtaining a Panzer Vulpaphyla; ${name} is one of the companion's exclusive precepts.`,
    url: 'https://warframe.fandom.com/wiki/Panzer_Vulpaphyla',
    source: `Warframe Wiki exact Panzer Vulpaphyla exclusive-precept record + DE ExportUpgrades exact ${name} compatName=Panzer Vulpaphyla`,
  }]),
  ...[
    ['/Lotus/Weapons/Tenno/Melee/Swords/DaxDuviriTwoHandedKatana/DaxDuviriTwoHandedKatanaPlayerWeapon', 'Azothane', 50, 250],
    ['/Lotus/Weapons/Tenno/Melee/Swords/DaxDuviriTwoHandedKatana/DaxDuviriTwoHandedKatanaWeapon', 'Azothane', 50, 250],
    ['/Lotus/Weapons/Tenno/Melee/Polearms/DaxDuviriPolearm/DaxDuviriPolearmSpearPlayerWeapon', 'Edun', 50, 250],
    ['/Lotus/Weapons/Tenno/Melee/Polearms/DaxDuviriPolearm/DaxDuviriPolearmWeapon', 'Edun', 50, 250],
    ['/Lotus/Weapons/Tenno/Melee/SwordsAndBoards/DaxDuviriMaceShieldPlayerWeapon', 'Argo & Vel', 60, 225],
    ['/Lotus/Weapons/Tenno/Melee/SwordsAndBoards/DaxDuviriMaceShieldWeapon', 'Argo & Vel', 60, 225],
  ].map(([path, name, clamps, platinum]) => [path, {
    text: `Purchase ${name} from Teshin's Cave in Duviri for ${clamps} Pathos Clamps or ${platinum} Platinum; the Pathos Clamp purchase unlocks the Drifter weapon and delivers the Warframe blueprint. Additional Warframe blueprint copies are available from Cephalon Simaris for 100,000 standing.`,
    url: 'https://warframe.fandom.com/wiki/Pathos_Clamp',
    source: `Warframe Wiki Pathos Clamp/Teshin's Cave acquisition table exact ${name} costs + DE ExportWeapons exact identity`,
  }]),
  ...[
    ['/Lotus/Weapons/Grineer/HeavyWeapons/GrnHeavyGrenadeLauncher', 'Kuva Ayanga'],
    ['/Lotus/Weapons/Grineer/KuvaLich/HeavyWeapons/Grattler/KuvaGrattler', 'Kuva Grattler'],
  ].map(([path, name]) => [path, {
    text: `Vanquish a Kuva Lich that generated with ${name} equipped; the weapon is placed in the Foundry ready to claim and has no blueprint.`,
    url: 'https://wiki.warframe.com/w/Adversary_Weapons',
    source: `Warframe Wiki Adversary Weapons exact Kuva route + DE ExportWeapons exact ${name} identity`,
  }]),
  ...[
    '/Lotus/Weapons/Tenno/Grimoire/TnDoppelgangerGrimoire',
    '/Lotus/Weapons/Tenno/Grimoire/TnGrimoire',
  ].map((path) => [path, {
    text: 'Receive a fully ranked Grimoire with a weapon slot and pre-installed Orokin Catalyst as a reward from the Whispers in the Walls quest; a Grimoire blueprint is also sold by Bird 3 of Cavia for 50,000 standing at the required rank.',
    url: 'https://wiki.warframe.com/w/Whispers_in_the_Walls',
    source: 'Warframe Wiki Whispers in the Walls exact quest rewards + structured Bird 3 vendor record + DE ExportWeapons exact identity',
  }]),
  ...[
    ['/Lotus/Upgrades/Skins/Sigils/DogDays2023BSigil', 'Chillwave Sigil', 175],
    ['/Lotus/Upgrades/Skins/Sigils/DogDaysKubrowSigil', 'Dropkick Drahk Sigil', 175],
    ['/Lotus/Upgrades/Skins/Sigils/DogDays2023CSigil', 'Scorcher Sigil', 175],
    ['/Lotus/Upgrades/Skins/Sigils/DogDays2025Sigil', 'Splashdown Sigil', 175],
    ['/Lotus/Upgrades/Skins/Promo/Seasonal/DogDays2025BadgeItem', 'Aqua Heart Emblem', 75],
    ['/Lotus/Upgrades/Skins/Clan/DogDaysKubrowBadgeItem', 'Dropkick Drahk Emblem', 75],
    ['/Lotus/Upgrades/Skins/Hammer/NoodleHammerSkin', 'Noodletron Hammer Skin', 280],
  ].map(([path, name, pearls]) => [path, {
    text: `Purchase from Nakak in Cetus during the Dog Days event for ${pearls} Nakak Pearls.`,
    url: 'https://warframe.fandom.com/wiki/Dog_Days',
    source: `Warframe Wiki Dog Days offerings exact ${name} price + DE ExportCustoms exact identity`,
  }]),
  ...[
    ['/Lotus/Upgrades/Mods/DualSource/Pistol/MultishotDodgeMod', 'Amalgam Barrel Diffusion', 50],
    ['/Lotus/Upgrades/Mods/DualSource/Melee/CritDamageChargeSpeedMod', 'Amalgam Organ Shatter', 50],
    ['/Lotus/Upgrades/Mods/DualSource/Rifle/SerratedRushMod', 'Amalgam Serration', 25],
    ['/Lotus/Upgrades/Mods/DualSource/Shotgun/ShotgunMedicMod', 'Amalgam Shotgun Barrage', 25],
  ].map(([path, name, points]) => [path, {
    text: `Earn ${points} cumulative points in the Thermia Fractures event to receive ${name}; the reward is one-time and non-transmutable.`,
    url: 'https://warframe.fandom.com/wiki/Thermia_Fractures',
    source: `Warframe Wiki Thermia Fractures reward table exact ${name} milestone + DE ExportUpgrades exact identity`,
  }]),
  ...[
    ['/Lotus/Upgrades/Mods/Melee/Expert/WeaponFireRateModExpert', 'Primed Fury'],
    ['/Lotus/Upgrades/Mods/Rifle/DualStat/PrimedShredMod', 'Primed Shred'],
    ['/Lotus/Upgrades/Mods/Warframe/Expert/VigorModExpert', 'Primed Vigor'],
  ].map(([path, name]) => [path, {
    text: `${name} is a Daily Tribute login reward, awarded at the Daily Tribute milestone rotation; it is not a Baro Ki'Teer offering.`,
    url: 'https://wiki.warframe.com/w/Category:Daily_Tribute_Rewards',
    source: `Warframe Wiki Daily Tribute Rewards category exact ${name} entry + DE ExportUpgrades exact identity`,
  }]),
  ...[
    ['/Lotus/Weapons/Grineer/KuvaLich/Secondaries/Brakk/KuvaBrakk', 'Kuva Brakk'],
    ['/Lotus/Weapons/Grineer/Bows/GrnBow/GrnBowWeapon', 'Kuva Bramma'],
    ['/Lotus/Weapons/Grineer/LongGuns/GrnKuvaLichRifle/GrnKuvaLichRifleWeapon', 'Kuva Chakkhurr'],
    ['/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Drakgoon/KuvaDrakgoon', 'Kuva Drakgoon'],
    ['/Lotus/Weapons/Grineer/KuvaLich/Melee/Ghoulsaw/KuvaGhoulSaw', 'Kuva Ghoulsaw'],
    ['/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Hek/KuvaHekWeapon', 'Kuva Hek'],
    ['/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Hind/KuvaHind', 'Kuva Hind'],
    ['/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Karak/KuvaKarak', 'Kuva Karak'],
    ['/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Kohm/KuvaKohm', 'Kuva Kohm'],
    ['/Lotus/Weapons/Grineer/KuvaLich/Secondaries/Kraken/KuvaKraken', 'Kuva Kraken'],
    ['/Lotus/Weapons/Grineer/KuvaLich/Secondaries/Nukor/KuvaNukor', 'Kuva Nukor'],
    ['/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Ogris/KuvaOgris', 'Kuva Ogris'],
    ['/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Quartakk/KuvaQuartakk', 'Kuva Quartakk'],
    ['/Lotus/Weapons/Grineer/KuvaLich/Secondaries/Seer/KuvaSeer', 'Kuva Seer'],
    ['/Lotus/Weapons/Grineer/Melee/GrnKuvaLichScythe/GrnKuvaLichScytheWeapon', 'Kuva Shildeg'],
    ['/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Sobek/KuvaSobek', 'Kuva Sobek'],
    ['/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Tonkor/KuvaTonkor', 'Kuva Tonkor'],
    ['/Lotus/Weapons/Grineer/KuvaLich/Secondaries/Stubba/KuvaTwinStubbas', 'Kuva Twin Stubbas'],
    ['/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Zarr/KuvaZarr', 'Kuva Zarr'],
  ].map(([path, name]) => [path, {
    text: `Generate a ${name} on a Kuva Lich, then vanquish that Kuva Lich; the weapon is placed in the Foundry ready to claim.`,
    url: 'https://wiki.warframe.com/w/Adversary_Weapons',
    source: `Warframe Wiki Adversary Weapons exact Kuva route + DE export exact ${name} identity`,
  }]),
  ...[
    ['/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBEArcaPlasmor/CrpBEArcaPlasmor', 'Tenet Arca Plasmor'],
    ['/Lotus/Weapons/Corpus/BoardExec/Secondary/CrpBECycron/CrpBECycron', 'Tenet Cycron'],
    ['/Lotus/Weapons/Corpus/BoardExec/Secondary/CrpBEDetron/CrpBEDetron', 'Tenet Detron'],
    ['/Lotus/Weapons/Corpus/Pistols/CrpBriefcaseAkimbo/CrpBriefcaseAkimboPistol', 'Tenet Diplos'],
    ['/Lotus/Weapons/Corpus/LongGuns/CrpBriefcaseLauncher/CrpBriefcaseLauncher', 'Tenet Envoy'],
    ['/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBEFluxRifle/CrpBEFluxRifle', 'Tenet Flux Rifle'],
    ['/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBEGlaxion/CrpBEGlaxion', 'Tenet Glaxion'],
    ['/Lotus/Weapons/Corpus/BoardExec/Secondary/CrpBEPlinx/CrpBEPlinxWeapon', 'Tenet Plinx'],
    ['/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBEQuanta/CrpBEQuanta', 'Tenet Quanta'],
    ['/Lotus/Weapons/Corpus/Pistols/CrpIgniterPistol/CrpIgniterPistol', 'Tenet Spirex'],
    ['/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBETetra/CrpBETetra', 'Tenet Tetra'],
  ].map(([path, name]) => [path, {
    text: `Generate a ${name} on a Sister of Parvos, then vanquish that Sister; the weapon is placed in the Foundry ready to claim.`,
    url: 'https://wiki.warframe.com/w/Adversary_Weapons',
    source: `Warframe Wiki Adversary Weapons exact Sister-of-Parvos route + DE export exact ${name} identity`,
  }]),
  ...[
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartBodyA', 'Adlet Core'],
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartHeadB', 'Bhaira Hound'],
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartLegsA', 'Cela Bracket'],
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartHeadA', 'Dorma Hound'],
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartTailC', 'Frak Stabilizer'],
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartBodyB', 'Garmr Core'],
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartHeadC', 'Hec Hound'],
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartTailB', 'Hinta Stabilizer'],
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartBodyC', 'Raiju Core'],
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartLegsB', 'Urga Bracket'],
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartTailA', 'Wanz Stabilizer'],
    ['/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartLegsC', 'Zubb Bracket'],
  ].map(([path, name]) => [path, {
    text: 'Random Hound component blueprint dropped by a defeated Sister of Parvos; the component is tradeable.',
    url: 'https://wiki.warframe.com/w/Adversary_Weapons',
    source: `Warframe Wiki Adversary System exact Sister-of-Parvos Hound-component route + DE export exact ${name} identity`,
  }]),
  [
    '/Lotus/Types/Sentinels/SentinelPrecepts/ArcTrap',
    {
      text: 'Included with the Diriga Sentinel; the WFCD sentinel record lists Arc Coil as one of Diriga\'s default precepts.',
      url: 'https://github.com/WFCD/warframe-items',
      source: 'WFCD combined sentinel description + DE ExportUpgrades exact Arc Coil compatName=Diriga',
    },
  ],
  [
    '/Lotus/Types/Sentinels/SentinelPrecepts/HeadShot',
    {
      text: 'Included with the Diriga Sentinel; the WFCD sentinel record lists Calculated Shot as one of Diriga\'s default precepts.',
      url: 'https://github.com/WFCD/warframe-items',
      source: 'WFCD combined sentinel description + DE ExportUpgrades exact Calculated Shot compatName=Diriga',
    },
  ],
  [
    '/Lotus/Types/Sentinels/SentinelPrecepts/TaserStun',
    {
      text: 'Included with the Diriga Sentinel; the WFCD sentinel record lists Electro Pulse as one of Diriga\'s default precepts.',
      url: 'https://github.com/WFCD/warframe-items',
      source: 'WFCD combined sentinel description + DE ExportUpgrades exact Electro Pulse compatName=Diriga',
    },
  ],
  [
    '/Lotus/Types/Sentinels/SentinelPrecepts/RepairShip',
    {
      text: 'Included with the Nautilus Sentinel; the WFCD sentinel record lists Auto Omni as a default precept.',
      url: 'https://github.com/WFCD/warframe-items',
      source: 'WFCD combined sentinel description + DE ExportUpgrades exact Auto Omni compatName=Nautilus',
    },
  ],
  [
    '/Lotus/Types/Sentinels/SentinelPrecepts/GatherEnemies',
    {
      text: 'Included with the Nautilus Sentinel; the WFCD sentinel record lists Cordon as a default precept.',
      url: 'https://github.com/WFCD/warframe-items',
      source: 'WFCD combined sentinel description + DE ExportUpgrades exact Cordon compatName=Nautilus',
    },
  ],
  [
    '/Lotus/Types/Sentinels/SentinelPrecepts/CodexScannerPrecept',
    {
      text: 'Included with the Helios Sentinel; the WFCD sentinel record lists Investigator as its unique precept.',
      url: 'https://github.com/WFCD/warframe-items',
      source: 'WFCD combined sentinel description + DE ExportUpgrades exact Investigator compatName=Helios',
    },
  ],
  [
    '/Lotus/Types/Sentinels/SentinelPrecepts/LocateResources',
    {
      text: 'Included with the Oxylus Sentinel; the WFCD sentinel record lists Scan Matter as a default precept.',
      url: 'https://github.com/WFCD/warframe-items',
      source: 'WFCD combined sentinel description + DE ExportUpgrades exact Scan Matter compatName=Oxylus',
    },
  ],
  [
    '/Lotus/Types/Sentinels/SentinelPrecepts/ShieldVampire',
    {
      text: 'Included with the Taxon Sentinel; the WFCD sentinel record lists Molecular Conversion as a default precept.',
      url: 'https://github.com/WFCD/warframe-items',
      source: 'WFCD combined sentinel description + DE ExportUpgrades exact Molecular Conversion compatName=Taxon',
    },
  ],
  [
    '/Lotus/Weapons/Grineer/LongGuns/GrineerM16Homage/KarakWraith',
    {
      text: 'Obtain the Karak Wraith blueprint and parts as Invasion rewards; its components can also be traded.',
      url: 'https://wiki.warframe.com/w/Karak_Wraith',
      source: 'Warframe Wiki Invasion Reward category and Karak Wraith acquisition record + DE ExportWeapons exact identity',
    },
  ],
  [
    '/Lotus/Weapons/Tenno/LongGuns/WraithLatron/WraithLatron',
    {
      text: 'Obtain the Latron Wraith blueprint and parts as Invasion rewards; its components can also be traded. Mastery Rank 7 is required to acquire the blueprint.',
      url: 'https://wiki.warframe.com/w/Latron_Wraith',
      source: 'Warframe Wiki exact Latron Wraith acquisition record + DE ExportWeapons exact identity',
    },
  ],
  [
    '/Lotus/Weapons/ClanTech/Energy/DeraVandal',
    {
      text: 'Obtain the Dera Vandal blueprint and parts as Invasion rewards; its components can also be traded.',
      url: 'https://wiki.warframe.com/w/Dera_Vandal',
      source: 'Warframe Wiki Invasion Reward category + DE ExportWeapons exact identity',
    },
  ],
  [
    '/Lotus/Weapons/Grineer/Melee/GrineerCombatKnife/GrineerCombatKnife',
    {
      text: 'Obtain the Sheev blueprint and parts as Invasion rewards; its components can also be traded.',
      url: 'https://wiki.warframe.com/w/Sheev',
      source: 'Warframe Wiki Invasion Reward category + DE ExportWeapons exact identity',
    },
  ],
  [
    '/Lotus/Weapons/Tenno/Shotgun/ShotgunVandal',
    {
      text: 'Obtain the Strun Wraith blueprint and parts as Invasion rewards; its components can also be traded.',
      url: 'https://wiki.warframe.com/w/Strun_Wraith',
      source: 'Warframe Wiki exact Strun Wraith component acquisition record + DE ExportWeapons exact identity',
    },
  ],
  [
    '/Lotus/Weapons/Grineer/Pistols/WraithTwinVipers/WraithTwinVipers',
    {
      text: 'Obtain the Twin Vipers Wraith blueprint and parts as Invasion rewards; its components can also be traded.',
      url: 'https://wiki.warframe.com/w/Twin_Vipers_Wraith',
      source: 'Warframe Wiki exact Twin Vipers Wraith component acquisition record + DE ExportWeapons exact identity',
    },
  ],
  [
    '/Lotus/Weapons/Tenno/Rifle/VandalSniperRifle',
    {
      text: 'Obtain the Snipetron Vandal blueprint and parts as Invasion rewards; its components can also be traded. Mastery Rank 5 is required to acquire the blueprint.',
      url: 'https://wiki.warframe.com/w/Snipetron_Vandal',
      source: 'Warframe Wiki exact Snipetron Vandal acquisition record + DE ExportWeapons exact identity',
    },
  ],
  [
    '/Lotus/Weapons/Lasria/AK47/TC2024AK47Weapon',
    {
      text: "Purchase the AX-52 blueprint from Amir of The Hex in the Höllvania Central Mall for 30,000 Standing at Rank 4 (Hot & Fresh) after completing The Hex; a built AX-52 was previously awarded as the TennoCon 2024 Twitch Drop.",
      url: 'https://wiki.warframe.com/w/AX-52',
      source: 'Warframe Wiki exact AX-52 acquisition/history + official Warframe Update 38.0 Amir offering + DE ExportWeapons exact identity',
    },
  ],
  [
    '/Lotus/Weapons/Lasria/LasGooAK/LasGooAKPlayerWeapon',
    {
      text: "Purchase the EFV-5 Jupiter main and component blueprints from Minerva's Covert Arms in The Hex's Höllvania Central Mall for Hex Standing at Rank 5 (Pizza Party), or purchase the complete weapon from the in-game Market.",
      url: 'https://www.warframe.com/en/patch-notes/psn/38-5-0',
      source: 'Official Warframe Update 38.5 exact EFV-5 Jupiter acquisition + DE ExportWeapons exact identity',
    },
  ],
  [
    '/Lotus/Powersuits/Dagath/Dagath',
    {
      text: "Purchase Dagath's main blueprint from the Shrine of Dagath in the Dagath's Hallow Dojo room; craft the component blueprints using Vainthorns from Abyssal Zone missions opened with Abyssal Beacons.",
      url: 'https://wiki.warframe.com/w/Warframes_Comparison/Acquisition',
      source: "Warframe Wiki Dagath acquisition table + Devstream 173 Dagath's Hallow route + DE ExportWarframes exact Dagath identity",
    },
  ],
  [
    '/Lotus/Weapons/Tenno/Melee/Swords/TnDagathBladeWhip/TnDagathBladeWhip',
    {
      text: "Acquire Dorrclave's main and component blueprints from the Shrine of Dagath in the Dagath's Hallow Dojo room; the component materials include Vainthorns from Abyssal Zone missions opened with Abyssal Beacons.",
      url: 'https://www.warframe.com/news/devstream-173-overview',
      source: "Warframe.com Devstream 173 Dagath's Hallow route + DE ExportWeapons exact Dorrclave identity",
    },
  ],
  [
    '/Lotus/Weapons/Tenno/Melee/Swords/DarkSword/DarkSwordDaggerHybridWeapon',
    {
      text: 'Research and replicate the Dark Split-Sword blueprint in a Clan Dojo Tenno Lab; the complete weapon is also sold in the Market for 225 Platinum.',
      url: 'https://warframe.fandom.com/wiki/Dark_Split-Sword',
      source: 'Warframe Wiki exact Dark Split-Sword acquisition record + DE ExportWeapons exact identity and 225-Platinum Market price',
    },
  ],
  [
    '/Lotus/Types/AvatarImages/FanChannel/AvatarImageBennyfits',
    {
      text: 'Legacy creator glyph. The current browse.wf record contains only a glyphwave identifier and no active promo code, giveaway, or source link; existing copies are legacy-owned.',
      url: 'https://browse.wf/',
      source: 'browse.wf exact Bennyfits glyph record disposition',
    },
  ],
  [
    '/Lotus/Types/AvatarImages/FanChannel/AvatarImageBikeman',
    {
      text: 'Legacy creator glyph. The current browse.wf record contains only a glyphwave identifier and no active promo code, giveaway, or source link; existing copies are legacy-owned.',
      url: 'https://browse.wf/',
      source: 'browse.wf exact Bikeman glyph record disposition',
    },
  ],
  [
    '/Lotus/Types/AvatarImages/FanChannel/AvatarImageSp00nerism',
    {
      text: 'Legacy creator glyph. The current browse.wf record contains only a glyphwave identifier and no active promo code, giveaway, or source link; existing copies are legacy-owned.',
      url: 'https://browse.wf/',
      source: 'browse.wf exact Sp00nerism glyph record disposition',
    },
  ],
  [
    '/Lotus/Types/AvatarImages/FanChannel/AvatarImageSummit1G',
    {
      text: 'Legacy creator glyph. The current browse.wf record contains only a glyphwave identifier and no active promo code, giveaway, or source link; existing copies are legacy-owned.',
      url: 'https://browse.wf/',
      source: 'browse.wf exact Summit1g glyph record disposition',
    },
  ],
  [
    '/Lotus/Weapons/Tenno/Akimbo/AkimboBolto',
    {
      text: 'Purchase the Akbolto blueprint from the Market for 15,000 Credits, then build it in the Foundry for 20,000 Credits using 2 Bolto and 1 Orokin Cell.',
      url: 'https://wiki.warframe.com/w/Akbolto',
      source: 'DE ExportRecipes exact AkboltoBlueprint result and ingredients + DE export Market credit cost',
    },
  ],
  [
    '/Lotus/Types/AvatarImages/AvatarImageDanteGlyph',
    {
      text: "Included in the one-time Dante Chronicles Pack, which contains Dante, Ruvox, Rencowl Syandana, Oranist Armor, Dante Cantist Helmet, this glyph, Dante's Noctua Sigil, Observant Vitreum, and 125 Platinum.",
      url: 'https://www.warframe.com/en/news/dante-chronicles-pack',
      source: 'Warframe.com Dante Chronicles Pack contents + WFCD exact glyph identity',
    },
  ],
  [
    '/Lotus/Types/AvatarImages/AvatarImageGlyphErisTennocon2020Gate',
    {
      text: 'Previously awarded through the 4GamerLive Warframe promotion by redeeming the event item code; the code expired on November 1, 2020, so this promotion is no longer active.',
      url: 'https://www.4gamer.net/games/172/G017216/20200925084/',
      source: '4GamerLive event announcement naming the exact Void Mirror Glyph and redemption window + WFCD exact glyph identity',
    },
  ],
  [
    '/Lotus/Types/AvatarImages/AvatarImageGlyphMashedNefAnyo',
    {
      text: 'Purchased individually for 20 Platinum or as part of the 110-Platinum MASHED Glyph Pack; the pack contains seven glyphs depicting moments from MASHED’s 100 Days of Warframe video.',
      url: 'https://warframe.fandom.com/wiki/Glyph',
      source: 'Warframe Wiki MASHED Glyphs section + Module:Glyphes exact uniqueName',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Ember/EmberDeluxeDualPistolSkin',
    {
      text: 'Exclusive to the Ember Vermillion Collection, which is purchased from the in-game Market for 225 Platinum; the local DE export identifies this exact record as the Nusku Dual Pistol Skin.',
      url: 'https://warframe.fandom.com/wiki/Ember_Vermillion_Collection',
      source: 'Warframe Wiki Ember Vermillion Collection acquisition + local DE ExportCustoms exact Nusku Dual Pistol Skin record',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Weapons/Pistols/TnSubmachinegunDualPistolSkin',
    {
      text: 'Included in the Empyrean Grand Bundle, sold from the in-game Market for 820 Platinum; the local DE export identifies this exact record as the Zundi Dual Pistol Skin.',
      url: 'https://wiki.warframe.com/w/Empyrean_Grand_Bundle',
      source: 'Warframe Wiki Empyrean Grand Bundle contents + local DE ExportCustoms exact Zundi Dual Pistol Skin record',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Sigils/MasterySigil',
    {
      text: 'Purchased from the in-game Market for 1 Credit; the sigil changes its design as your Mastery Rank increases.',
      url: 'https://warframe.fandom.com/wiki/Sigils?page=2&title=Sigils',
      source: 'Warframe Wiki Purchasable Sigils section + local DE ExportCustoms exact Mastery Sigil record',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Halloween/HalloweenLatoVandal',
    {
      text: 'Previously sold as a limited-time Day of the Dead Market skin for 20 Platinum; the local DE export still identifies the exact Lato Vandal variant but currently excludes it from the Market.',
      url: 'https://www.warframe.com/news/attention-all-tenno',
      source: 'Warframe.com Day of the Dead announcement + local DE ExportCustoms exact Lato Vandal skin record',
    },
  ],
  [
    '/Lotus/Types/Restoratives/Consumable/GlyphConsumable',
    {
      text: 'Purchased from the Glyph menu as the charged Glyph Prism gear item; the local DE export records a purchase quantity of 100 for 1,000 Credits.',
      url: 'https://warframe.fandom.com/wiki/Glyph',
      source: 'DE ExportGear exact Glyph Prism record + Warframe Wiki Glyph usage record',
    },
  ],
  [
    '/Lotus/Types/Restoratives/Consumable/GlyphConsumableNoCharges',
    {
      text: 'Purchased from the Glyph menu as the unlimited-use Glyph Prism gear item; the local DE export records a price of 50 Platinum.',
      url: 'https://warframe.fandom.com/wiki/Glyph',
      source: 'DE ExportGear exact unlimited Glyph Prism record + Warframe Wiki Glyph usage record',
    },
  ],
  [
    '/Lotus/Types/Restoratives/Consumable/RecallToRailjack',
    {
      text: 'Unlocked by Tactical Intrinsics Rank 4 (Recall Warp); equip the Omni gear item to teleport back to the Railjack from outside it.',
      url: 'https://wiki.warframe.com/w/Railjack/Intrinsics',
      source: 'Warframe Wiki Railjack Intrinsics structured rank table + local DE ExportGear exact RecallToRailjack record',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Scarves/TnLargeCapeXbox',
    {
      text: 'Previously awarded from Xbox One 6th Anniversary Alert #5, which granted the Jade Broca Syandana and 10,000 Credits; that limited-time alert has ended.',
      url: 'https://www.warframe.com/de/news/6th-anniversary-on-xbox',
      source: 'Warframe.com 6th Anniversary on Xbox + local export exact Jade Broca Syandana record',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Scarves/TnSparrowCape',
    {
      text: 'Previously included in The Origin Pack with 200 Platinum for PS4/Xbox One and later Nintendo Switch; this limited-time console pack is no longer an active acquisition route.',
      url: 'https://www.warframe.com/en/news/the-origin-pack',
      source: 'Warframe.com The Origin Pack + local export exact Parotia Syandana record',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Scarves/MixerKyropteraScarf',
    {
      text: 'Previously awarded for linking a Warframe account to Mixer during the 2019 promotional period; the Mixer promotion has ended.',
      url: 'https://www.warframe.com/en/news/watch-warframe-on-mixer-to-earn-free-rewards',
      source: 'Warframe.com Mixer promotion + local export exact Kyroptera Panoply Syandana record',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/SteamEsteem/EsteemOrthos',
    {
      text: 'Previously included with the Orthos weapon in any of the 2019 Wintermaker Pinnacle Packs; those packs are no longer an active acquisition route.',
      url: 'https://store.steampowered.com/news/posts/?appids=230410&enddate=1552002479',
      source: 'Warframe Steam Community announcement (Wintermaker Pinnacle Packs) + local export exact Orthos Onyx Skin record',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/SteamEsteem/EsteemTigris',
    {
      text: 'Previously included with the Tigris weapon in the 2019 Wintermaker Pinnacle Packs; those packs are no longer an active acquisition route.',
      url: 'https://store.steampowered.com/news/posts/?appids=230410&enddate=1552682647&feed=steam_community_announcements',
      source: 'Warframe Steam Community announcement (Wintermaker Pinnacle Packs) + local export exact Tigris Onyx Skin record',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Operator/Skirts/SkirtAdultPrimeB',
    {
      text: 'Component of the Commodore Prime Suit, included in the Zephyr Prime Accessories package during Zephyr Prime Access; the local export links this Drifter/Operator piece to its Prime armor counterpart.',
      url: 'https://www.warframe.com/news/zephyr-prime-access-begins-march-20',
      source: 'Warframe.com Zephyr Prime Access announcement + local export Commodore Prime component records',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Operator/BodySuits/BodySuitAdultPrimeB',
    {
      text: 'Component of the Commodore Prime Suit, included in the Zephyr Prime Accessories package during Zephyr Prime Access; the local export links this Drifter/Operator piece to its Prime armor counterpart.',
      url: 'https://www.warframe.com/news/zephyr-prime-access-begins-march-20',
      source: 'Warframe.com Zephyr Prime Access announcement + local export Commodore Prime component records',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Operator/Leggings/LeggingsAdultPrimeB',
    {
      text: 'Component of the Commodore Prime Suit, included in the Zephyr Prime Accessories package during Zephyr Prime Access; the local export links this Drifter/Operator piece to its Prime armor counterpart.',
      url: 'https://www.warframe.com/news/zephyr-prime-access-begins-march-20',
      source: 'Warframe.com Zephyr Prime Access announcement + local export Commodore Prime component records',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Operator/Hoods/HoodAdultPrimeB',
    {
      text: 'Component of the Commodore Prime Suit, included in the Zephyr Prime Accessories package during Zephyr Prime Access; the local export links this Drifter/Operator piece to its Prime armor counterpart.',
      url: 'https://www.warframe.com/news/zephyr-prime-access-begins-march-20',
      source: 'Warframe.com Zephyr Prime Access announcement + local export Commodore Prime component records',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Operator/Sleeves/SleevesAdultPrimeB',
    {
      text: 'Component of the Commodore Prime Suit, included in the Zephyr Prime Accessories package during Zephyr Prime Access; the local export links this Drifter/Operator piece to its Prime armor counterpart.',
      url: 'https://www.warframe.com/news/zephyr-prime-access-begins-march-20',
      source: 'Warframe.com Zephyr Prime Access announcement + local export Commodore Prime component records',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Dagath/DagathDeluxeLNYHelmet',
    {
      text: 'Included with the Dagath Yfari Skin; the skin is sold individually in the in-game Market for 165 Platinum, and the local export links this helmet as its component.',
      url: 'https://www.warframe.com/en/patch-notes/pc/41-1-0',
      source: 'Warframe.com Update 41.1: Vauban Heirloom + local export Dagath Yfari skin/component records',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Armor/WarframeDefaults/SWYhavanDagathAArmor',
    {
      text: 'Included with the Dagath Yhavan Skin; PC players acquire the TennoGen skin through Steam Workshop, while console and iOS players can purchase it for Platinum in the in-game Market.',
      url: 'https://forums.warframe.com/topic/1469559-new-tennogen-arriving-in-october-first-look/',
      source: 'Warframe Forums TennoGen announcement + local export Dagath Yhavan skin/component records',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/BrokenFrame/XakuCosmosSkin',
    {
      text: 'Nora’s Mix Volume 9 reward at Rank 30; the reward included the Xaku Raya Skin and Xaku Raya Helmet.',
      url: 'https://wiki.warframe.com/w/Nightwave/Nora%27s_Mix_Volume_9',
      source: 'Warframe Wiki (Nora’s Mix Volume 9) + local export skin/helmet relationship',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/BrokenFrame/XakuCosmosHelmet',
    {
      text: 'Nora’s Mix Volume 9 reward at Rank 30, included with the Xaku Raya Skin.',
      url: 'https://wiki.warframe.com/w/Nightwave/Nora%27s_Mix_Volume_9',
      source: 'Warframe Wiki (Nora’s Mix Volume 9) + local export skin/helmet relationship',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Trapper/VaubanHeirloomHelmet',
    {
      text: 'Included with the Vauban Heirloom Skin in the Vauban Heirloom Collection; the local export lists the skin at 225 Platinum and the collection at 400 Platinum.',
      url: 'https://www.warframe.com/en/patch-notes/pc/41-1-0',
      source: 'Warframe.com Update 41.1: Vauban Heirloom + local export skin/component records',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Trapper/VaubanHeirloomAux',
    {
      text: 'Included with the Vauban Heirloom Skin in the Vauban Heirloom Collection; the Overcoat can be switched to its sleeveless variant in the Auxiliary options.',
      url: 'https://www.warframe.com/en/patch-notes/pc/41-1-0',
      source: 'Warframe.com Update 41.1: Vauban Heirloom + local export skin/component records',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Trapper/VaubanHeirloomAuxSleeveless',
    {
      text: 'The sleeveless Overcoat option is included with the Vauban Heirloom Skin in the Vauban Heirloom Collection.',
      url: 'https://www.warframe.com/en/patch-notes/pc/41-1-0',
      source: 'Warframe.com Update 41.1: Vauban Heirloom + local export skin/component records',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Necramech/VoidrigDOTDSkin',
    {
      text: 'Purchased from Daughter during Nights of Naberus for 100 Mother Tokens; the linked Day of the Dead Necramech Helmet is granted with the skin.',
      url: 'https://warframe.fandom.com/wiki/Necramech',
      source: 'Warframe Wiki (Necramech) + local export skin/helmet relationship',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Necramech/VoidrigDOTDHelmet',
    {
      text: 'Granted with the Day of the Dead Necramech Skin, which is purchased from Daughter during Nights of Naberus for 100 Mother Tokens.',
      url: 'https://warframe.fandom.com/wiki/Necramech',
      source: 'Warframe Wiki (Necramech) + local export skin/helmet relationship',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Necramech/TefilahIridosSkin',
    {
      text: 'Prime Gaming Drop 12: claim the Iridos Collection through a linked Prime Gaming and Warframe account; the drop included the Iridos Voidrig Necramech Skin and its helmet.',
      url: 'https://www.warframe.com/en/news/prime-gaming-iridos-collection',
      source: 'Warframe.com Prime Gaming Iridos Collection + local export skin/helmet relationship',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Necramech/TefilahIridosHelmet',
    {
      text: 'Prime Gaming Drop 12: claim the Iridos Collection through a linked Prime Gaming and Warframe account; the drop included the Iridos Voidrig Necramech Skin and this helmet.',
      url: 'https://www.warframe.com/en/news/prime-gaming-iridos-collection',
      source: 'Warframe.com Prime Gaming Iridos Collection + local export skin/helmet relationship',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Bard/BardTwitchSkin',
    {
      text: 'Prime Gaming Drop 1: the Octavia Iridos Bundle, available through November 14, 2023, included Octavia Iridos Skin and the Octavia Iridos Mix Helmet.',
      url: 'https://www.warframe.com/en/news/prime-gaming-iridos-collection',
      source: 'Warframe.com Prime Gaming Iridos Collection',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Bard/BardTwitchAltHelmet',
    {
      text: 'Included in the Octavia Iridos Bundle from Prime Gaming, available through November 14, 2023, as the Octavia Iridos Mix Helmet.',
      url: 'https://www.warframe.com/en/news/prime-gaming-iridos-collection',
      source: 'Warframe.com Prime Gaming Iridos Collection',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Necramech/NecramechSnakeSkin',
    {
      text: 'Purchased from the Necraloid Syndicate’s Necramech Embellishments offerings for 60 Platinum.',
      url: 'https://warframe.fandom.com/wiki/Necramech',
      source: 'Warframe Wiki (Necramech) + local export skin/helmet relationship',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Necramech/NecramechSnakeHelmet',
    {
      text: 'Granted with the Snake Necramech Skin, purchased from the Necraloid Syndicate’s Necramech Embellishments offerings for 60 Platinum.',
      url: 'https://warframe.fandom.com/wiki/Necramech',
      source: 'Warframe Wiki (Necramech) + local export skin/helmet relationship',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Sigils/NecramechSigilSnake',
    {
      text: 'Purchased from the Necraloid Syndicate’s Necramech Embellishments offerings for 40 Platinum.',
      url: 'https://warframe.fandom.com/wiki/Necramech',
      source: 'Warframe Wiki (Necramech)',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Operator/Skirts/SkirtLasrianB',
    {
      text: 'Included in the Chymerist Collection (130 Platinum), or obtained with the corresponding Chymerist Apparel purchase for 25 Platinum; the Operator and Drifter versions are linked in the export.',
      url: 'https://www.warframe.com/ru/patch-notes/pc/38-5-0',
      source: 'Warframe.com Techrot Encore Update 38.5 + local export Chymerist bundle/component records',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Operator/Sleeves/SleevesOperatorLasrianB',
    {
      text: 'Included in the Chymerist Collection (130 Platinum), or obtained with the corresponding Chymerist Gloves purchase for 30 Platinum; the Operator and Drifter versions are linked in the export.',
      url: 'https://www.warframe.com/ru/patch-notes/pc/38-5-0',
      source: 'Warframe.com Techrot Encore Update 38.5 + local export Chymerist bundle/component records',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Operator/Hoods/HoodOperatorLasrianB',
    {
      text: 'Included in the Chymerist Collection (130 Platinum), or obtained with the corresponding Chymerist Mask purchase for 40 Platinum; the Operator and Drifter versions are linked in the export.',
      url: 'https://www.warframe.com/ru/patch-notes/pc/38-5-0',
      source: 'Warframe.com Techrot Encore Update 38.5 + local export Chymerist bundle/component records',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Operator/BodySuits/BodySuitOperatorLasrianB',
    {
      text: 'Included in the Chymerist Collection (130 Platinum), or obtained with the corresponding Chymerist Uniform purchase for 40 Platinum; the Operator and Drifter versions are linked in the export.',
      url: 'https://www.warframe.com/ru/patch-notes/pc/38-5-0',
      source: 'Warframe.com Techrot Encore Update 38.5 + local export Chymerist bundle/component records',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Armor/PrimeStyanaxArmor/PrimeStyanaxCArmor',
    {
      text: 'Component of Daurus Prime Armor, included in the Styanax Prime Accessories Pack and Styanax Prime Access Complete Pack; this was a limited-time Prime Access offering.',
      url: 'https://www.warframe.com/prime-access',
      source: 'Warframe Prime Access (Styanax Prime Accessories)',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Armor/PrimeStyanaxArmor/PrimeStyanaxLArmor',
    {
      text: 'Component of Daurus Prime Armor, included in the Styanax Prime Accessories Pack and Styanax Prime Access Complete Pack; this was a limited-time Prime Access offering.',
      url: 'https://www.warframe.com/prime-access',
      source: 'Warframe Prime Access (Styanax Prime Accessories)',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Armor/PrimeStyanaxArmor/PrimeStyanaxAArmor',
    {
      text: 'Component of Daurus Prime Armor, included in the Styanax Prime Accessories Pack and Styanax Prime Access Complete Pack; this was a limited-time Prime Access offering.',
      url: 'https://www.warframe.com/prime-access',
      source: 'Warframe Prime Access (Styanax Prime Accessories)',
    },
  ],
  [
    '/Lotus/Upgrades/Skins/Geode/CitrineDeluxeHelmet',
    {
      text: 'Included with the Citrine Aphrodita Skin; the skin is sold individually in the Market for 165 Platinum or in the Citrine Aphrodita Collection for 365 Platinum.',
      url: 'https://www.warframe.com/pt-br/patch-notes/ios/39-0-0',
      source: 'Warframe.com Isleweaver Update 39; Warframe Wiki (Citrine Aphrodita Skin)',
    },
  ],
  [
    '/Lotus/Types/AvatarImages/Community10YearOrdisGlyph',
    {
      text: 'Part of the 10 Year Anniversary Community Art Pack, purchased in the Market for 70 Platinum.',
      url: 'https://wiki.warframe.com/w/Glyph',
      source: 'Warframe Wiki (Glyph)',
    },
  ],
  ['/Lotus/Types/AvatarImages/AvatarImageBuriedDebts', { text: 'Redeem the promo code THEDEADHAVEDEBTS from Operation: Buried Debts.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/ImageCephalonCy', { text: 'Twitch, Mixer, or Steam Drop for watching an official Warframe stream for 30 minutes during the launch of Update 27.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/ImageCephalonSimaris', { text: "Exclusively awarded to winners of Simaris' Sanctuary Showdown during TennoCon 2018, distributed via a code card after the event.", url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/CherryTreeGlyph', { text: 'Twitch Drop for watching Partner streams for 1 hour during the launch of Update 23.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/Warframes/CitrineActionGlyph', { text: 'Awarded from the Gift from the Lotus alert on April 5, 2023.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/Seasonal/AvatarImageHalloween2021Dethcube', { text: 'Included in the Gruesome Glyph Bundle, sold in the Market for 65 Platinum during Halloween since 2021.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageValentine2017A', { text: 'Included in the Donwyn Glyph Pack, sold in the Market for 80 Platinum during Valentines 2017.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageValentine2017B', { text: 'Included in the Donwyn Glyph Pack, sold in the Market for 80 Platinum during Valentines 2017.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageValentine2017C', { text: 'Included in the Donwyn Glyph Pack, sold in the Market for 80 Platinum during Valentines 2017.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageValentine2017D', { text: 'Included in the Donwyn Glyph Pack, sold in the Market for 80 Platinum during Valentines 2017.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageValentine2017E', { text: 'Included in the Donwyn Glyph Pack, sold in the Market for 80 Platinum during Valentines 2017.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageValentine2020Alad', { text: 'Included in Donwyn Glyph Pack II, sold in the Market for 60 Platinum.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageValentine2020Clem', { text: 'Included in Donwyn Glyph Pack II, sold in the Market for 60 Platinum.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageValentine2020Key', { text: 'Included in Donwyn Glyph Pack II, sold in the Market for 60 Platinum.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageValentine2020Kuva', { text: 'Included in Donwyn Glyph Pack II, sold in the Market for 60 Platinum.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/TenYearAnniversaryWeek2Glyph', { text: 'Given to all players who completed the Recall Ten-Zero quests during the July 19–August 25 anniversary period.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/ImageDeadlockProtocolB', { text: 'Redeem the promo code aungelecette-dlp, issued June 11, 2020.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/ImageGengzi', { text: 'Available from the Market for 1 Credit from January 23–31, 2020; Lunar New Year exclusive.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/Seasonal/AvatarImageHalloween2021Grineer', { text: 'Included in the Gruesome Glyph Bundle, sold in the Market for 65 Platinum during Halloween since 2021.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageInktober', { text: "Given to all eligible participants of Halloween's Tennotober contest.", url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/TenYearAnniversaryWeek4Glyph', { text: 'Given to all players who completed the Recall Ten-Zero quests during the July 19–August 25 anniversary period.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageGlyphJingleKavat', { text: 'Included in Winter Glyph Pack IV, sold for 90 Platinum during Christmas 2019.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageGlyphJollyGrendel', { text: 'Included in Winter Glyph Pack IV, sold for 90 Platinum during Christmas 2019.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/Xmas2021GrinoalieGlyph', { text: 'Tennobaum 2022 milestone reward.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/ImageKhoraInAction', { text: "Nightwave reward from Nora's Mix Volume 6.", url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageOroKitty', { text: 'Rewarded upon scanning 75% of Kuria.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageAmirValentine', { text: 'Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageAoiValentine', { text: 'Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageArthurValentine', { text: 'Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageStarDaysCervulitePat', { text: 'Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageEleanorValentine', { text: 'Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageValentine2023Gyre', { text: 'Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageValentine2023Kavat', { text: 'Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageLettieValentine', { text: 'Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageStarDaysQorvexHeart', { text: 'Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageQuincyValentine', { text: 'Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageValentine2023Ticker', { text: 'Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageBadgeEmber', { text: 'Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageBadgeKulervo', { text: 'Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageBadgeMesa', { text: 'Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageBadgeOctavia', { text: 'Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageBadgeRhino', { text: 'Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageBadgeStynax', { text: 'Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageBadgeXaku', { text: 'Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/TenYearAnniversaryWeek3Glyph', { text: 'Given to all players who completed the Recall Ten-Zero quests during the July 19–August 25 anniversary period.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/TenYearAnniversaryWeek5Glyph', { text: 'Given to all players who completed the Recall Ten-Zero quests during the July 19–August 25 anniversary period.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/TenYearAnniversaryWeek1Glyph', { text: 'Given to all players who completed the Recall Ten-Zero quests during the July 19–August 25 anniversary period.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageStarterPackLotus', { text: 'Available through the WARFRAME Starter Pack from June 25, 2019 until August 25, 2020.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageGlyphStarterPackA', { text: 'Available through the WARFRAME Starter Pack until June 25, 2019.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/ImageRailjackInAction', { text: 'Available through the Empyrean Supporter Pack from December 12, 2019 until August 25, 2020.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageGrineerQueensVed', { text: 'Rewarded upon completing The War Within.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/Image2019Twitter', { text: 'Redeem the promo code TWEET4TENNO during TennoCon 2019.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/Gamification2019Glyph', { text: 'Reward for completing the TennoCon 2019 scavenger-hunt-style game.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/TennoCon2020SimarisGlyph', { text: 'Exclusive reward for the top 1,000 highest-scoring players of the TennoTrivia quiz during TennoCon 2020.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/FanChannel/AvatarImageTennoGen', { text: 'Included in the TennoGen Glyph Pack, sold in the Market for 75 Platinum; also purchasable individually for 15 Platinum.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/TennoCon2017Glyph', { text: 'Exclusive to players who purchased the physical or digital TennoCon 2017 ticket.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/TennoCon2018Glyph', { text: 'Exclusive to players who purchased the physical or digital TennoCon 2018 ticket.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/TennoCon2019Glyph', { text: 'Exclusive to players who purchased the physical or digital TennoCon 2019 ticket.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/TennoCon2020Glyph', { text: 'Exclusive to players who purchased the physical or digital TennoCon 2020 ticket.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/TennoCon2021Glyph', { text: 'Exclusive to players who purchased the physical or digital TennoCon 2021 ticket.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/TennoCon2022Glyph', { text: 'Exclusive to players who purchased the physical or digital TennoCon 2022 ticket.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/TennoCon2023Glyph', { text: 'Exclusive to players who purchased the physical or digital TennoCon 2023 ticket.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/TennoCon2024Glyph', { text: 'Exclusive to players who purchased the physical or digital TennoCon 2024 ticket.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/TennoCon2025Glyph', { text: 'Exclusive to players who purchased the physical or digital TennoCon 2025 ticket.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/TennoCon2021MerchGlyph', { text: 'Part of the purchasable TennoCon 2021 merch pack, obtained with its redeemable code.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/TennoCon2022MerchGlyph', { text: 'Part of the purchasable TennoCon 2022 merch pack, obtained with its redeemable code.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/ImageDeadlockProtocolA', { text: 'Redeem the promo code GOLDEN, issued before the launch of The Deadlock Protocol.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageZarimanLogo', { text: 'Redeem the promo code REMEMBERUS, issued April 28, 2022.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/Xmas2021MaggotGlyph', { text: 'Tennobaum 2022 milestone reward.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/Xmas2021MoaGlyph', { text: 'Tennobaum 2022 milestone reward.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/Xmas2021NutcorpusGlyph', { text: 'Tennobaum 2022 milestone reward.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/Xmas2023ThraxGlyph', { text: 'Tennobaum 2023 milestone reward.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/Xmas2023BombastineGlyph', { text: 'Part of the Duviri Community Art Pack, sold in the Market for 40 Platinum; the glyph is also available individually for 20 Platinum.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/ImageDexAnniversary', { text: 'Reward from the 7th Year Anniversary alert.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageConqueraGlyphUpdated', { text: 'Available from the Market for 1 Credit during the Conquera campaign.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/FanChannel/AvatarImageLegendaryElof', { text: 'Exclusive to the player who designed it after purchasing a Legendary Ticket to TennoCon.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageGlyphKiradien', { text: 'Exclusive to the player who designed it after purchasing a Legendary Ticket to TennoCon.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageGlyphLegendaryCelestics', { text: 'Exclusive to the player who designed it after purchasing a Legendary Ticket to TennoCon.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageGlyphMattaus', { text: 'Exclusive to the player who designed it after purchasing a Legendary Ticket to TennoCon.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/ImageLotusDeluxe', { text: 'Included in the Golden Mend Collection, sold in the Market for 430 Platinum.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/Seasonal/AvatarImageHalloween2021Loid', { text: 'Included in the Gruesome Glyph Bundle, sold in the Market for 65 Platinum during Halloween since 2021.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/Seasonal/AvatarImageHalloween2021Pumpkin', { text: 'Included in the Gruesome Glyph Bundle, sold in the Market for 65 Platinum during Halloween since 2021.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImagePrideCommunity', { text: 'Available from the Market for 1 Credit during Pride in June.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageHildrynPrideCommunity', { text: 'Available from the Market for 1 Credit during Pride in June.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageGlyphSkiGauss', { text: 'Included in Winter Glyph Pack IV, sold for 90 Platinum during Christmas 2019.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageGlyphSurpriseIvara', { text: 'Included in Winter Glyph Pack IV, sold for 90 Platinum during Christmas 2019.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/TennoCon2023MerchGlyph', { text: 'Awarded to the top 10 of the 10 Year Anniversary Art Showcase; winners were announced April 20, 2023.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageTennoVIP', { text: 'Available through the 11 Year Anniversary Twitch Drop campaign.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/AvatarImageTeshinVed', { text: 'Redeem the promo code WARWITHIN during the launch of Update 19.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/FanChannel/AvatarImageLegendaryBlackdeath', { text: 'Exclusive to the player who designed it after purchasing a Legendary Ticket to TennoCon.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/ImageXakuDeluxeKintsugi', { text: 'Included in the Golden Mend Collection, sold in the Market for 430 Platinum.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/Seasonal/AvatarImageHalloween2024SisterNoBloodGlyph', { text: 'Purchased from Daughter for 20 Mother Tokens during Nights of Naberus.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Types/AvatarImages/Seasonal/AvatarImageHalloween2021Lotus', { text: 'Included in the Gruesome Glyph Bundle, sold in the Market for 65 Platinum during Halloween since 2021.', url: 'https://wiki.warframe.com/w/Glyph', source: 'Warframe Wiki (Glyph)' }],
  ['/Lotus/Upgrades/Skins/Sigils/InfLichConvertedSigil', {
    text: 'Rewarded for converting your first Technocyte Coda.',
    url: 'https://www.warframe.com/en/patch-notes/psn/38-5-0',
    source: 'Warframe.com Update 38.5: Techrot Encore',
  }],
  ['/Lotus/Upgrades/Skins/Sigils/InfLichVanquishedSigil', {
    text: 'Rewarded for vanquishing your first Technocyte Coda.',
    url: 'https://www.warframe.com/en/patch-notes/psn/38-5-0',
    source: 'Warframe.com Update 38.5: Techrot Encore',
  }],
  ['/Lotus/Upgrades/Skins/Sigils/HoundingKubrowSigil', {
    text: 'Purchased from Daughter in the Necralisk during Nights of Naberus for Mother Tokens.',
    url: 'https://www.warframe.com/th/news/nights-of-naberus-returns-en',
    source: 'Warframe.com Nights of Naberus Returns',
  }],
  ['/Lotus/Upgrades/Skins/Sigils/SomberStalkerSigil', {
    text: 'Purchased from Daughter in the Necralisk during Nights of Naberus for Mother Tokens.',
    url: 'https://www.warframe.com/th/news/nights-of-naberus-returns-en',
    source: 'Warframe.com Nights of Naberus Returns',
  }],
  ['/Lotus/Upgrades/Skins/Sigils/Tennogen10YearSigil', {
    text: 'Free Inbox reward during the TennoGen 10 Year Anniversary campaign; claimable by logging in before December 31, 2025.',
    url: 'https://www.warframe.com/en/news/tennogen10',
    source: 'Warframe.com TennoGen 10 Year Anniversary Celebration',
  }],
  ['/Lotus/Upgrades/Skins/Sigils/PS4TwoYearSigil', {
    text: 'PS4 second-anniversary Inbox reward during the 2015 anniversary event.',
    url: 'https://www.warframe.com/uk/news/warframe-celebrates-two-years-playstation-4',
    source: 'Warframe.com PlayStation 4 second anniversary announcement',
  }],
  ['/Lotus/Upgrades/Skins/Sigils/PS4FourYearSigil', {
    text: 'PS4 fourth-anniversary Inbox reward during the 2017 anniversary event.',
    url: 'https://www.warframe.com/en/news/playstation-4',
    source: 'Warframe.com PlayStation 4 fourth anniversary announcement',
  }],
  ['/Lotus/Upgrades/Skins/Sigils/PS4FiveYearSigil', {
    text: 'PS4 fifth-anniversary Inbox reward during the 2018 anniversary event.',
    url: 'https://www.warframe.com/en/news/5-year-anniversary',
    source: 'Warframe.com PlayStation 4 fifth anniversary announcement',
  }],
  ['/Lotus/Upgrades/Skins/Sigils/XBoneTwoYearSigil', {
    text: 'Xbox second-anniversary Inbox reward during the 2016 anniversary event.',
    url: 'https://www.warframe.com/uk/news/dziekujemy-za-dwa-wysmienite-lata-tenno',
    source: 'Warframe.com Xbox One second anniversary announcement',
  }],
  ['/Lotus/Upgrades/Skins/Sigils/XBoneFourYearSigil', {
    text: 'Xbox fourth-anniversary Inbox reward during the 2018 anniversary event.',
    url: 'https://www.warframe.com/en/news/warframe-s-fourth-anniversary-on-xbox-one',
    source: 'Warframe.com Xbox One fourth anniversary announcement',
  }],
  ['/Lotus/Upgrades/Skins/Sigils/PS4CrowSigil', {
    text: 'Included in the PlayStation-exclusive Obsidian Corvus Collection.',
    url: 'https://www.warframe.com/uk/news/obsidian-corvus-collection-available-now',
    source: 'Warframe.com Obsidian Corvus Collection announcement',
  }],
  ['/Lotus/Upgrades/Skins/Sigils/ObsidianIndraSigil', {
    text: 'Included in the PlayStation-exclusive Ultimate Obsidian Collection.',
    url: 'https://www.warframe.com/en/news/ultimate-obsidian-collection',
    source: 'Warframe.com Ultimate Obsidian Collection announcement',
  }],
  ['/Lotus/Upgrades/Skins/Sigils/PS4RenownXSigil', {
    text: 'Included in the PlayStation-exclusive Renown Pack X.',
    url: 'https://www.warframe.com/en/news/x',
    source: 'Warframe.com Renown Pack X announcement',
  }],
  ['/Lotus/Upgrades/Skins/Sigils/QTCC2023ConqueraSigil', {
    text: 'Redeem promo code CONQUERA2023 in the in-game Market during the 2023 Quest to Conquer Cancer campaign.',
    url: 'https://www.warframe.com/news/quest-to-conquer-cancer-2023',
    source: 'Warframe.com Quest to Conquer Cancer 2023 announcement',
  }],
  ['/Lotus/Upgrades/Skins/Clan/QTCC2024EmblemItem', {
    text: 'Sent by Inbox during the 2024 Quest to Conquer Cancer campaign after logging in during the campaign window.',
    url: 'https://www.warframe.com/en/news/conquista-na-batalha-contra-o-cancer-2024',
    source: 'Warframe.com Quest to Conquer Cancer 2024 announcement',
  }],
  ['/Lotus/Upgrades/Skins/Operator/Tattoos/TattooTennoH', {
    text: 'Sent by Inbox during the 2024 Quest to Conquer Cancer campaign.',
    url: 'https://www.warframe.com/en/news/conquista-na-batalha-contra-o-cancer-2024',
    source: 'Warframe.com Quest to Conquer Cancer 2024 announcement',
  }],
  ['/Lotus/Upgrades/Skins/Operator/Tattoos/TattooTennoI', {
    text: 'Sent by Inbox during the 2024 Quest to Conquer Cancer campaign after logging in during the campaign window.',
    url: 'https://www.warframe.com/en/news/conquista-na-batalha-contra-o-cancer-2024',
    source: 'Warframe.com Quest to Conquer Cancer 2024 announcement',
  }],
  ['/Lotus/Upgrades/Skins/Festivities/PumpkinHead', {
    text: 'Returned as a limited-time Nights of Naberus Day of the Dead item; available from Daughter in the Necralisk for Mother Tokens.',
    url: 'https://forums.warframe.com/topic/1414770-update-37-koumei-the-five-fates/',
    source: 'Warframe.com Update 37: Koumei & the Five Fates',
  }],
  ['/Lotus/Upgrades/Skins/Sigils/Switch2Sigil', {
    text: 'Included in the Ambimanus Pack Inbox reward for logging into Warframe on Nintendo Switch 2 during its launch campaign; available from Varzia for Aya on other platforms.',
    url: 'https://www.warframe.com/en/news/warframe-on-switch-2-available-now',
    source: 'Warframe.com Warframe on Switch 2 Available Now announcement',
  }],
  ['/Lotus/Upgrades/Skins/Armor/Dex2020Armor/Dex2020ArmorCArmor', {
    text: 'Part of the free Dex Raksaka Armor Set awarded for logging in during the Warframe anniversary campaign; the local export identifies this object as the set\'s Chest Guard.',
    url: 'https://www.warframe.com/news/7-year-anniversary',
    source: 'Warframe.com 7 Year Anniversary announcement + local export Dex Raksaka component record',
  }],
  ['/Lotus/Upgrades/Skins/Armor/Dex2020Armor/Dex2020ArmorLArmor', {
    text: 'Part of the free Dex Raksaka Armor Set awarded for logging in during the Warframe anniversary campaign; the local export identifies this object as the set\'s Knee Guards.',
    url: 'https://www.warframe.com/news/7-year-anniversary',
    source: 'Warframe.com 7 Year Anniversary announcement + local export Dex Raksaka component record',
  }],
  ['/Lotus/Upgrades/Skins/Armor/Dex2020Armor/Dex2020ArmorAArmor', {
    text: 'Part of the free Dex Raksaka Armor Set awarded for logging in during the Warframe anniversary campaign; the local export identifies this object as the set\'s Shoulder Guards.',
    url: 'https://www.warframe.com/news/7-year-anniversary',
    source: 'Warframe.com 7 Year Anniversary announcement + local export Dex Raksaka component record',
  }],
  ['/Lotus/Upgrades/Skins/Kubrows/Armor/NightwaveSeason5HarkaKubrowArmor', {
    text: 'Nightwave: Nora\'s Mix Volume 5 reward; it has also returned in later Nightwave Cred rotations.',
    url: 'https://www.warframe.com/th/amp/nightwave-noras-mix-vol-5',
    source: 'Warframe.com Nightwave: Nora\'s Mix Volume 5 announcement',
  }],
  ['/Lotus/Upgrades/Skins/DexTheSecond/ObsidianDexDakra', {
    text: 'PlayStation anniversary reward: available from the in-game Market for 1 Credit during the scheduled anniversary week.',
    url: 'https://www.warframe.com/th/news/playstation-anniversary',
    source: 'Warframe.com PlayStation Anniversary announcement',
  }],
  ['/Lotus/Upgrades/Skins/Sony/ObsidianDexFuris', {
    text: 'PlayStation anniversary reward: available from the in-game Market for 1 Credit during the scheduled anniversary week.',
    url: 'https://www.warframe.com/th/news/playstation-anniversary',
    source: 'Warframe.com PlayStation Anniversary announcement',
  }],
  ['/Lotus/Upgrades/Skins/Weapons/GreatSword/PS4BallasSword', {
    text: 'PlayStation anniversary reward: available from the in-game Market for 1 Credit during the scheduled anniversary week.',
    url: 'https://www.warframe.com/th/news/playstation-anniversary',
    source: 'Warframe.com PlayStation Anniversary announcement',
  }],
  ['/Lotus/Upgrades/Skins/DexTheSecond/NintendoDexDakra', {
    text: 'Nintendo Switch anniversary Alert reward; the official schedule listed it as Alert #2 with 10,000 Credits.',
    url: 'https://www.warframe.com/en/news/2-ko',
    source: 'Warframe.com 2 Year Anniversary on Nintendo Switch announcement',
  }],
  ['/Lotus/Upgrades/Skins/Weapons/GreatSword/SWIBallasSword', {
    text: 'Included in the Nintendo Switch anniversary Inbox rewards; the announcement lists the Paracesis Opal Skin as a free login reward.',
    url: 'https://www.warframe.com/en/news/2-ko',
    source: 'Warframe.com 2 Year Anniversary on Nintendo Switch announcement',
  }],
  ['/Lotus/Upgrades/Skins/Scarves/NintendoTurtleNeckScarf', {
    text: 'Nintendo Switch anniversary Alert reward; the official schedule listed it as Alert #3 with 10,000 Credits.',
    url: 'https://www.warframe.com/en/news/2-ko',
    source: 'Warframe.com 2 Year Anniversary on Nintendo Switch announcement',
  }],
  ['/Lotus/Upgrades/Skins/Armor/Sony/OAArmorC', {
    text: 'Included in the PlayStation-exclusive Renown Pack XII, which granted the Obsidian Azura Armor set and 170 Platinum.',
    url: 'https://www.warframe.com/en/news/renown-pack-xii-available-now',
    source: 'Warframe.com Renown Pack XII announcement + local export Obsidian Azura armor component record',
  }],
  ['/Lotus/Upgrades/Skins/Armor/Sony/OAArmorL', {
    text: 'Included in the PlayStation-exclusive Renown Pack XII, which granted the Obsidian Azura Armor set and 170 Platinum.',
    url: 'https://www.warframe.com/en/news/renown-pack-xii-available-now',
    source: 'Warframe.com Renown Pack XII announcement + local export Obsidian Azura armor component record',
  }],
  ['/Lotus/Upgrades/Skins/Armor/Sony/OAArmorA', {
    text: 'Included in the PlayStation-exclusive Renown Pack XII, which granted the Obsidian Azura Armor set and 170 Platinum.',
    url: 'https://www.warframe.com/en/news/renown-pack-xii-available-now',
    source: 'Warframe.com Renown Pack XII announcement + local export Obsidian Azura armor component record',
  }],
  ['/Lotus/Upgrades/Skins/Armor/PrimeLavosArmor/PrimeLavosArmorC', {
    text: 'Nimandi Prime armor piece included through Lavos Prime Access; the local export identifies this object as the Chest Plate.',
    url: 'https://wiki.warframe.com/w/Armor_%28Cosmetic%29',
    source: 'Warframe Wiki Armor (Cosmetic) Prime Access table + local export Nimandi Prime component record',
  }],
  ['/Lotus/Upgrades/Skins/Armor/PrimeLavosArmor/PrimeLavosArmorL', {
    text: 'Nimandi Prime armor piece included through Lavos Prime Access; the local export identifies this object as the Leg Plates.',
    url: 'https://wiki.warframe.com/w/Armor_%28Cosmetic%29',
    source: 'Warframe Wiki Armor (Cosmetic) Prime Access table + local export Nimandi Prime component record',
  }],
  ['/Lotus/Upgrades/Skins/Armor/PrimeLavosArmor/PrimeLavosArmorA', {
    text: 'Nimandi Prime armor piece included through Lavos Prime Access; the local export identifies this object as the Shoulder Plates.',
    url: 'https://wiki.warframe.com/w/Armor_%28Cosmetic%29',
    source: 'Warframe Wiki Armor (Cosmetic) Prime Access table + local export Nimandi Prime component record',
  }],
  ['/Lotus/Upgrades/Skins/Runner/GaussPrimeHelmet', {
    text: 'Gauss Prime Access accessory: the Gauss Prime Blazargaze Helmet was included in the Prime Accessories package and is a Prime Access bonus item.',
    url: 'https://www.warframe.com/en/news/gauss-prime-access',
    source: 'Warframe.com Gauss Prime Access announcement',
  }],
  ['/Lotus/Upgrades/Skins/Alchemist/LavosPrimeSkin', {
    text: 'Default Prime appearance associated with Lavos Prime; acquire Lavos Prime through Prime Access or by earning and opening its Void Relics.',
    url: 'https://www.warframe.com/en/news/prime-access-de-lavos',
    source: 'Warframe.com Lavos Prime Access announcement + local export Lavos Prime skin record',
  }],
  ['/Lotus/Upgrades/Skins/Wisp/WispPrimeDefaultCape', {
    text: 'Default Prime Shroud associated with Wisp Prime; acquire Wisp Prime through Prime Access or by earning and opening its Void Relics.',
    url: 'https://www.warframe.com/en/news/accesso-wisp-prime',
    source: 'Warframe.com Wisp Prime Access announcement + local export Wisp Prime default cape record',
  }],
  ['/Lotus/Upgrades/Skins/Yareli/YareliPrimeSkin', {
    text: 'Default Prime appearance associated with Yareli Prime; acquire Yareli Prime through Prime Access or by earning and opening its Void Relics.',
    url: 'https://www.warframe.com/en/news/accesso-yareli-prime',
    source: 'Warframe.com Yareli Prime Access announcement + local export Yareli Prime skin record',
  }],
  ['/Lotus/Upgrades/Skins/Sentinels/Wings/IctusPrimeWingsRight', {
    text: 'Included in the Ictus Prime Sentinel Accessories package, available through the Banshee & Mirage Prime Vault accessories packs.',
    url: 'https://www.warframe.com/news/banshee-and-mirage-prime-vault-ru',
    source: 'Warframe.com Banshee and Mirage Prime Vault announcement',
  }],
  ['/Lotus/Upgrades/Skins/Wraith/SevagothPrimeShadowClawsSkin', {
    text: 'Prime Shadow Claws appearance associated with Sevagoth Prime; acquire Sevagoth Prime through Prime Access or by earning and opening its Void Relics.',
    url: 'https://www.warframe.com/fr/patch-notes/psn/36-1-0',
    source: 'Warframe.com Update 36.1: The Lotus Eaters + local export Shadow Claws Prime skin record',
  }],
  ['/Lotus/Upgrades/Skins/Clan/TenYearAnniversaryBadgeItem', {
    text: 'Recall Ten-Zero reward: complete every mission in at least three of the five weekly Alert weeks.',
    url: 'https://www.warframe.com/en/news/countdown-zur-tennocon-2023',
    source: 'Warframe.com Countdown to TennoCon 2023 announcement',
  }],
  ['/Lotus/Upgrades/Skins/Clan/Tennogen10YearBadgeItem', {
    text: 'Free Inbox reward during the TennoGen 10 Year Anniversary celebration; log in before December 31, 2025 at 11:59 p.m. ET.',
    url: 'https://www.warframe.com/en/news/tennogen10',
    source: 'Warframe.com TennoGen 10 Year Anniversary Celebration announcement',
  }],
  ['/Lotus/Upgrades/Skins/Armor/PrimeGyreArmor/PrimeGyreArmorC', {
    text: 'Vanda Prime Armor Chest piece, included in the Gyre Prime Accessories Pack and Gyre Prime Access Complete Pack.',
    url: 'https://www.warframe.com/en/news/gyre-prime-access',
    source: 'Warframe.com Gyre Prime Access announcement + local export Vanda Prime Armor component record',
  }],
  ['/Lotus/Upgrades/Skins/Armor/PrimeGyreArmor/PrimeGyreArmorL', {
    text: 'Vanda Prime Armor Leg piece, included in the Gyre Prime Accessories Pack and Gyre Prime Access Complete Pack.',
    url: 'https://www.warframe.com/en/news/gyre-prime-access',
    source: 'Warframe.com Gyre Prime Access announcement + local export Vanda Prime Armor component record',
  }],
  ['/Lotus/Upgrades/Skins/Armor/PrimeGyreArmor/PrimeGyreArmorA', {
    text: 'Vanda Prime Armor Shoulder piece, included in the Gyre Prime Accessories Pack and Gyre Prime Access Complete Pack.',
    url: 'https://www.warframe.com/en/news/gyre-prime-access',
    source: 'Warframe.com Gyre Prime Access announcement + local export Vanda Prime Armor component record',
  }],
  ...[
    '/Lotus/Upgrades/Skins/Operator/BodySuits/BodySuitAdultPrimeE',
    '/Lotus/Upgrades/Skins/Operator/BodySuits/BodySuitPrimeE',
    '/Lotus/Upgrades/Skins/Operator/Leggings/LeggingsAdultPrimeE',
    '/Lotus/Upgrades/Skins/Operator/Leggings/LeggingsPrimeE',
    '/Lotus/Upgrades/Skins/Operator/Hoods/HoodAdultPrimeE',
    '/Lotus/Upgrades/Skins/Operator/Hoods/HoodPrimeE',
    '/Lotus/Upgrades/Skins/Operator/Sleeves/SleevesAdultPrimeE',
    '/Lotus/Upgrades/Skins/Operator/Sleeves/SleevesPrimeE',
    '/Lotus/Upgrades/Skins/Operator/Hoods/HoodAdultPrimeEChina',
    '/Lotus/Upgrades/Skins/Operator/Hoods/HoodPrimeEChina',
  ].map((uniqueName) => [uniqueName, {
    text: 'Necra Prime Operator/Drifter Suit component, included in the Xaku Prime Accessories Pack and Xaku Prime Access Complete Pack.',
    url: 'https://www.warframe.com/en/news/xaku-prime-access',
    source: 'Warframe.com Xaku Prime Access announcement + local export Necra Prime component record',
  }]),
  ...[
    '/Lotus/Upgrades/Skins/Operator/Leggings/LeggingsAdultPrimeF',
    '/Lotus/Upgrades/Skins/Operator/Leggings/LeggingsPrimeF',
    '/Lotus/Upgrades/Skins/Operator/Hoods/HoodAdultPrimeF',
    '/Lotus/Upgrades/Skins/Operator/Hoods/HoodPrimeF',
    '/Lotus/Upgrades/Skins/Operator/BodySuits/BodySuitAdultPrimeF',
    '/Lotus/Upgrades/Skins/Operator/BodySuits/BodySuitPrimeF',
    '/Lotus/Upgrades/Skins/Operator/Sleeves/SleevesAdultPrimeF',
    '/Lotus/Upgrades/Skins/Operator/Sleeves/SleevesPrimeF',
  ].map((uniqueName) => [uniqueName, {
    text: 'Tauron Prime Regalia component, included in the Caliban Prime Accessories Pack and Caliban Prime Access Complete Pack.',
    url: 'https://www.warframe.com/en/news/caliban-prime-access-ko',
    source: 'Warframe.com Caliban Prime Access announcement + local export Tauron Prime component record',
  }]),
  ['/Lotus/Upgrades/Skins/Sentinels/Wings/OrokinWingsRight', {
    text: 'Included in the Summus Prime Sentinel Accessories package, offered through Loki Prime Access and later Prime Vault/Prime Resurgence accessory packs.',
    url: 'https://www.warframe.com/en/news/prime-resurgence-rotation-4',
    source: 'Warframe.com Prime Resurgence Rotation 4 and Loki Prime Access announcements',
  }],
  ['/Lotus/Upgrades/Skins/Sentinels/Wings/PrimeSentinelWingsRight', {
    text: 'Included in the Unda Prime Sentinel Accessories package, offered through Ash Prime Access and later Prime Vault/Prime Resurgence accessory packs.',
    url: 'https://www.warframe.com/en/news/prime-resurgence-rotation-5',
    source: 'Warframe.com Prime Resurgence Rotation 5 and Ash/Vauban Prime Vault announcement',
  }],
  ...[
    ['/Lotus/Upgrades/Skins/Armor/CorpusFencer/PS4CrpFncAArmor', 'Dendra Obsidian Shoulder Guard'],
    ['/Lotus/Upgrades/Skins/Armor/CorpusFencer/PS4CrpFncLArmor', 'Dendra Obsidian Leg Guard'],
    ['/Lotus/Upgrades/Skins/Archer/ObsidianIvaraHelmet', 'Ivara Obsidian Helmet'],
    ['/Lotus/Upgrades/Skins/Sony/ObsidianStandardArchwingSkin', 'Odonata Obsidian Skin'],
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited Ultimate Obsidian Collection for PlayStation.`,
    url: 'https://www.warframe.com/en/news/ultimate-obsidian-collection',
    source: 'Warframe.com Ultimate Obsidian Collection announcement + local export exact component record',
  }]),
  ...[
    ['/Lotus/Upgrades/Skins/Scarves/ObsidianAzureScarf', 'Obsidian Azura Syandana'],
    ['/Lotus/Upgrades/Skins/Sony/ObsidianGalatine', 'Galatine Obsidian Skin'],
    ['/Lotus/Upgrades/Skins/Excalibur/ObsidianExcaliburHelmetB', 'Excalibur Obsidian Azura Helmet'],
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited Obsidian Azura Collection for PlayStation.`,
    url: 'https://www.warframe.com/en/news/playstation-tenno-ready-yourselves-for-this-epic-eight-item-collection',
    source: 'Warframe.com Obsidian Azura Collection announcement + local export exact component record',
  }]),
  ...[
    ['/Lotus/Upgrades/Skins/Scarves/ObsidianCrowSyandana', 'Obsidian Corvus Syandana'],
    ['/Lotus/Upgrades/Skins/Sony/ObsidianNikana', 'Nikana Obsidian Skin'],
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited Obsidian Corvus Collection for PlayStation.`,
    url: 'https://www.warframe.com/uk/news/obsidian-corvus-collection-available-now',
    source: 'Warframe.com Obsidian Corvus Collection announcement + local export exact component record',
  }]),
  ...[
    ['/Lotus/Upgrades/Skins/Sony/ObsidianGorgon', 'Gorgon Obsidian Skin'],
    ['/Lotus/Upgrades/Skins/Sony/ObsidianViper', 'Viper Obsidian Skin'],
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited PlayStation Renown Pack IV.`,
    url: 'https://www.warframe.com/amp/renown-pack-iv-available-now',
    source: 'Warframe.com Renown Pack IV announcement + local export exact component record',
  }]),
  ...[
    ['/Lotus/Upgrades/Skins/Sony/PS5OkinaSkin', 'Okina Obsidian Skin'],
    ['/Lotus/Upgrades/Skins/Clan/PS5OkinaBadgeItem', 'Okina Emblem'],
    ['/Lotus/Types/AvatarImages/Sony/AvatarImageOkinaGlyph', 'Mesa Okina Glyph'],
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited PlayStation Plus Booster Pack VII.`,
    url: 'https://www.warframe.com/en/news/pack-booster-playstationplus-vii',
    source: 'Warframe.com PlayStation Plus Booster Pack VII announcement + local export exact component record',
  }]),
  ...[
    ['/Lotus/Upgrades/Skins/Sony/PS5TiberonSkin', 'Tiberon Obsidian Skin'],
    ['/Lotus/Upgrades/Skins/Clan/DrakeRifleBadgeItem', 'Tiberon Obsidian Emblem'],
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited PlayStation Plus Booster Pack VI.`,
    url: 'https://www.warframe.com/en/news/playstation-plus-booster-pack-vi',
    source: 'Warframe.com PlayStation Plus Booster Pack VI announcement + local export exact component record',
  }]),
  ...[
    '/Lotus/Upgrades/Skins/Operator/BodySuits/BodySuitAdultChameleon',
    '/Lotus/Upgrades/Skins/Operator/BodySuits/BodySuitChameleon',
    '/Lotus/Upgrades/Skins/Operator/Hoods/HoodAdultChameleon',
    '/Lotus/Upgrades/Skins/Operator/Hoods/HoodChameleon',
    '/Lotus/Upgrades/Skins/Operator/Leggings/LeggingsAdultChameleon',
    '/Lotus/Upgrades/Skins/Operator/Leggings/LeggingsChameleon',
    '/Lotus/Upgrades/Skins/Operator/Sleeves/SleevesAdultChameleon',
    '/Lotus/Upgrades/Skins/Operator/Sleeves/SleevesChameleon',
  ].map((uniqueName) => [uniqueName, {
    text: 'Granted as part of the Operator/Drifter Voidshell Sets when completing The Angels of the Zariman quest; the quest requires completion of The New War.',
    url: 'https://wiki.warframe.com/w/Angels_of_the_Zariman',
    source: 'Warframe Wiki Angels of the Zariman quest rewards + local export exact Voidshell component record',
  }]),
  ...[
    ['/Lotus/Upgrades/Skins/Sony/ObsidianColtekMask', 'Obsidian Coltek Sentinel Mask'],
    ['/Lotus/Upgrades/Skins/Sony/ObsidianHelios', 'Helios Obsidian Skin'],
    ['/Lotus/Upgrades/Skins/Sony/ObsidianWyrm', 'Wyrm Obsidian Skin'],
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited PlayStation Renown Pack V.`,
    url: 'https://www.warframe.com/uk/news/renown-pack-v-available-now',
    source: 'Warframe.com Renown Pack V announcement + local export exact component record',
  }]),
  ...[
    ['/Lotus/Upgrades/Skins/Sony/ObsidianSilvaAndAegis', 'Silva & Aegis Obsidian Skin'],
    ['/Lotus/Upgrades/Skins/Scarves/PS4ArmScarf', 'Yomo Obsidian Syandana'],
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited PlayStation Renown Collection.`,
    url: 'https://www.warframe.com/uk/news/renown-collection',
    source: 'Warframe.com Renown Collection announcement + local export exact component record',
  }]),
  ['/Lotus/Upgrades/Skins/Frumentarius/FrumentariusSkin', {
    text: 'Default Cyte-09 appearance; acquire Cyte-09’s blueprint from The Hex quest, with component blueprints from Höllvania Central Mall Bounties or Amir of The Hex for Standing, then build Cyte-09 in the Foundry.',
    url: 'https://warframe.fandom.com/wiki/Cyte-09',
    source: 'WARFRAME Wiki Cyte-09 acquisition + official The Hex quest reward record + local export default skin relationship',
  }],
  ...[
    ['/Lotus/Upgrades/Skins/Trapper/VaubanVoidSkin', 'Vauban Phased Skin'],
    ['/Lotus/Upgrades/Skins/Trapper/VaubanVoidSkinHelmet', 'Vauban Phased Helmet'],
    ['/Lotus/Upgrades/Skins/Promo/Void/TigrisVoidSkin', 'Tigris Phased Skin'],
    ['/Lotus/Upgrades/Skins/Promo/Void/VastoVoidSkin', 'Vasto Phased Skin'],
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was a Steam Winter Sale 2013 crafting reward; these Phased cosmetics are no longer craftable, but existing copies can be traded through Steam or bought on the Steam Community Market.`,
    url: 'https://warframe.fandom.com/wiki/Phased_Skins',
    source: 'WARFRAME Wiki Phased Skins acquisition record + local export exact component record',
  }]),
  ['/Lotus/Upgrades/Skins/Events/BlackoutOrthos', {
    text: 'Unreleased Phased Orthos Skin; the Wiki records no acquisition route.',
    url: 'https://warframe.fandom.com/wiki/Phased_Skins',
    source: 'WARFRAME Wiki Phased Skins unreleased-item record + local export exact object',
  }],
  ['/Lotus/Upgrades/Skins/Motorcycle/MotorcycleNightwaveSkin', {
    text: 'Nightwave reward from Nora’s Mix Volume 8; earn Acts to rank up and claim it from the reward track.',
    url: 'https://www.warframe.com/en/news/nightwave-noras-mix-vol-8',
    source: 'Warframe.com Nora’s Mix Volume 8 reward list + local export exact livery record',
  }],
  ['/Lotus/Upgrades/Skins/Halloween/DOTD2025OperatorMask', {
    text: 'Nightwave reward from Nora’s Mix: Dreams of the Dead; earn Acts to rank up and claim the Kayota Day of the Dead Mask.',
    url: 'https://www.warframe.com/en/news/nightwave-dreams-of-the-dead-arrives-october-27',
    source: 'Warframe.com Dreams of the Dead reward list + local export exact mask record',
  }],
  ['/Lotus/Upgrades/Skins/Halloween/DOTD2025TaxonSkin', {
    text: 'Nightwave reward from Nora’s Mix: Dreams of the Dead; earn Acts to rank up and claim the Taxon Day of the Dead Skin.',
    url: 'https://www.warframe.com/en/news/nightwave-dreams-of-the-dead-arrives-october-27',
    source: 'Warframe.com Dreams of the Dead reward list + local export exact Taxon skin record',
  }],
  ['/Lotus/Upgrades/Skins/Catbrows/Armor/VermillionKavatArmor', {
    text: 'Nightwave reward from Nora’s Mix Volume 5, and a returning reward in Nora’s Mix: Dreams of the Dead; earn Acts and claim it from the Nightwave reward track.',
    url: 'https://www.warframe.com/th/amp/nightwave-noras-mix-vol-5',
    source: 'Warframe.com Nora’s Mix Volume 5 and Dreams of the Dead reward lists + local export exact armor record',
  }],
  ['/Lotus/Types/Items/PhotoBooth/JadeShadows/PhotoboothTileStalkerCave', {
    text: 'Granted by Hunhow in the Inbox after completing The Jade Shadows quest.',
    url: 'https://warframe.fandom.com/wiki/Jade_Shadows',
    source: 'WARFRAME Wiki Jade Shadows quest rewards + local export exact Captura scene record',
  }],
  ['/Lotus/Types/Items/MiscItems/PhotoboothTilePurgatory', {
    text: 'Granted as a reward for completing The Deadlock Protocol quest; the scene depicts the Granum Void.',
    url: 'https://wiki.warframe.com/w/The_Deadlock_Protocol/Transcript',
    source: 'WARFRAME Wiki Deadlock Protocol record + local export exact Captura scene record',
  }],
  ['/Lotus/Types/Items/PhotoBooth/CinematicTiles/YareliPrimeEndPose', {
    text: 'Automatically granted when you craft or purchase Yareli Prime; this Captura scene is exclusive to Yareli Prime.',
    url: 'https://www.warframe.com/de/patch-notes/pc/40-0-0',
    source: 'Warframe.com The Vallis Undermind update notes + local export exact Captura scene record',
  }],
  ['/Lotus/Upgrades/Skins/Sigils/BossSigilNefAnyo', {
    text: 'Awarded for defeating Nef Anyo; the Boss Sigil was added to Nef Anyo’s reward inventory with the other Boss Sigils.',
    url: 'https://www.warframe.com/es/patch-notes/pc/16-0-0',
    source: 'Warframe.com Sanctuary update notes + local export exact Boss Sigil record',
  }],
  ['/Lotus/Upgrades/Skins/Sigils/DogDays2023ASigil', {
    text: 'Awarded for completing the first Dog Days mission; during the fifth Dog Days appearance it was the first-mission reward alongside Nakak Pearls and Credits.',
    url: 'https://warframe.fandom.com/wiki/Dog_Days',
    source: 'WARFRAME Wiki Dog Days reward table + local export exact sigil record',
  }],
  ...[
    ['/Lotus/Upgrades/Skins/Armor/PS5Armor/PS5ArmorC', 'Dendra Obsidian Chest Plate'],
    ['/Lotus/Upgrades/Skins/Armor/PS5Armor/PS5ArmorL', 'Dendra Obsidian Knee Plates'],
    ['/Lotus/Upgrades/Skins/Armor/PS5Armor/PS5ArmorA', 'Dendra Obsidian Shoulder Plates'],
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited Ultimate Obsidian Collection for PlayStation.`,
    url: 'https://www.warframe.com/en/news/ultimate-obsidian-collection',
    source: 'Warframe.com Ultimate Obsidian Collection announcement + local export exact component record',
  }]),
  ...[
    ['/Lotus/Upgrades/Skins/Scarves/ObsidianKyropteraScarf', 'Obsidian Kyroptera Syandana'],
    ['/Lotus/Upgrades/Skins/Weapons/GreatSword/XB1BallasSword', 'Paracesis Obsidian Skin'],
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was a PlayStation Anniversary reward, claimed from the in-game Market for 1 Credit during its limited-time availability.`,
    url: 'https://www.warframe.com/en/news/playstation-anniversary',
    source: 'Warframe.com PlayStation Anniversary reward schedule + local export exact component record',
  }]),
  ...[
    ['/Lotus/Upgrades/Skins/Sony/ObsidianSonicor', 'Sonicor Obsidian Skin'],
    ['/Lotus/Upgrades/Skins/Sony/ObsidianSerro', 'Serro Obsidian Skin'],
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited PlayStation Renown Pack XVI.`,
    url: 'https://www.warframe.com/en/news/renown-pack-xvi-available-now',
    source: 'Warframe.com Renown Pack XVI announcement + local export exact component record',
  }]),
  ['/Lotus/Upgrades/Skins/Sony/ObsidianGlaive', {
    text: 'Formerly included in the original PlayStation Plus starter pack; the Glaive Obsidian Skin is a PlayStation-exclusive cosmetic and is no longer a current general Market route.',
    url: 'https://warframe.fandom.com/wiki/Glaive',
    source: 'WARFRAME Wiki Glaive acquisition and skin record + local export exact skin record',
  }],
  ['/Lotus/Upgrades/Skins/Motorcycle/MotorcycleOllieSkin', {
    text: 'Complete Ollie’s Crash Course in 1:30 or less to receive Ollie’s Rocket Livery for the Atomicycle.',
    url: 'https://www.warframe.com/en/patch-notes/psn/38-5-0',
    source: 'Warframe.com Techrot Encore update notes + local export exact livery record',
  }],
  ['/Lotus/Types/Items/MiscItems/PhotoboothTileDeckTwelve', {
    text: 'Drops from the Exploiter Orb fight in Orb Vallis; the scene is the Deck 12 Captura scene.',
    url: 'https://forums.warframe.com/topic/1087343-has-anyone-acquired-the-deck-12-captura-scene-from-exploiter/',
    source: 'Warframe Forums report of the in-game tooltip and Exploiter Orb route + local export exact scene record',
  }],
  ['/Lotus/Types/Items/MiscItems/PhotoboothTileDeimosHub', {
    text: 'Awarded for completing the Heart of Deimos quest.',
    url: 'https://www.warframe.com/en/news/deimos-captura-yarismasi',
    source: 'Warframe.com Captura of Deimos announcement + local export exact scene record',
  }],
  ['/Lotus/Types/Items/MiscItems/PhotoboothTileWraithQuestArena', {
    text: 'Granted in the Inbox for completing The Call of the Tempestarii quest.',
    url: 'https://forums.warframe.com/topic/1260225-call-of-the-tempestari-quest-feedback/',
    source: 'Warframe Forums quest reward confirmation + local export exact scene record',
  }],
  ['/Lotus/Types/Items/MiscItems/PhotoboothTileSacrificeCourtyard', {
    text: 'Granted in the Inbox after completing The Sacrifice quest.',
    url: 'https://warframe.fandom.com/wiki/The_Sacrifice',
    source: 'WARFRAME Wiki The Sacrifice reward record + local export exact scene record',
  }],
  ['/Lotus/Types/Items/MiscItems/PhotoboothTileTWWTeshinEnding', {
    text: 'Unlocked by completing The War Within for the first time; the scene is added to Captura and is retroactively granted to players who had already completed the quest.',
    url: 'https://warframe.fandom.com/wiki/Captura',
    source: 'WARFRAME Wiki Captura patch history + local export exact scene record',
  }],
  ['/Lotus/Types/Items/MiscItems/PhotoboothTileDrifterCamp', {
    text: 'Unlocked after completing The New War quest.',
    url: 'https://warframe.fandom.com/wiki/Captura',
    source: 'WARFRAME Wiki Captura scene list + local export exact scene record',
  }],
  ['/Lotus/Types/Items/MiscItems/PhotoboothTileGasCitySpawnTwo', {
    text: 'Obtained from the special violet Captura-scene locker in a solved Corpus Gas City secret room; open the symbol door by activating its consoles in sequence.',
    url: 'https://warframe.fandom.com/wiki/Corpus_Gas_City',
    source: 'WARFRAME Wiki Corpus Gas City secret-room route + local export exact scene record',
  }],
  ['/Lotus/Types/AvatarImages/FanChannel/AvatarImageBluyayogamer', {
    text: 'Redeem the BLUYAYOGAMER promo code on the official Warframe website; this code awards the Bluyayogamer Glyph.',
    url: 'https://www.warframe.com/en/promocode?code=BLUYAYOGAMER',
    source: 'Official Warframe promo-code URL + pinned Warframe Forums creator-glyph list + WFCD exact glyph identity',
  }],
  ['/Lotus/Types/AvatarImages/FanChannel/AvatarImageBrickyOrchid', {
    text: 'Redeem the BRICKY promo code on the official Warframe website; this code awards the Bricky Glyph.',
    url: 'https://www.warframe.com/en/promocode?code=BRICKY',
    source: 'Official Warframe promo-code URL + pinned Warframe Forums creator-glyph list identifying BrickyOrchid8 + WFCD exact glyph identity',
  }],
  ['/Lotus/Types/AvatarImages/GuardianCon2018Glyph', {
    text: 'Previously awarded by redeeming the GUARDIANCON2018 promo code; the code is listed as an expired historical promotion.',
    url: 'https://www.warframe.com/en/promocode?code=GUARDIANCON2018',
    source: 'Pinned Warframe Forums historical promo-code list + official Warframe promo-code endpoint + WFCD exact glyph identity',
  }],
  ['/Lotus/Types/AvatarImages/AvatarImageGlyphLaborAward', {
    text: 'Previously awarded by redeeming the LABOROFLOVE promo code; the code expired on January 5, 2019.',
    url: 'https://www.warframe.com/en/promocode?code=LABOROFLOVE',
    source: 'Pinned Warframe Forums historical promo-code list and expiration changelog + official Warframe promo-code endpoint + WFCD exact glyph identity',
  }],
  ['/Lotus/Types/AvatarImages/Community10YearAnniversaryGlyph', {
    text: 'Awarded to the top 10 winners of Warframe’s 10 Year Anniversary Community Showcase contest; it was part of the winner reward bundle with an emblem, sigil, and Platinum.',
    url: 'https://forums.warframe.com/topic/1343026-10-year-anniversary-community-showcase-winners-announced/',
    source: 'Official Warframe Forums contest-winner announcement + WFCD exact glyph identity',
  }],
  ['/Lotus/Types/AvatarImages/MesaHighNoonGlyph', {
    text: 'Included in the time-limited PlayStation Plus Towsun Collection, which was available until October 12, 2022; this glyph was PlayStation-exclusive.',
    url: 'https://www.warframe.com/en/news/coleccion-towsun-de-playstationplus',
    source: 'Official Warframe PlayStation Plus Towsun Collection announcement + WFCD exact glyph identity',
  }],
  ['/Lotus/Types/Restoratives/Consumable/Toxins/NightCommonAntitoxin', {
    text: 'Purchase the Amethyst Antitoxin blueprint from the Market for 1,500 Credits, or buy the 7,500-Credit Cicero Crisis Antidote Pack that includes it, then build it in the Foundry.',
    url: 'https://wiki.warframe.com/w/Antitoxin_%28Gear%29',
    source: 'Warframe Wiki Antitoxin (Gear) exact item and pack record + DE export recipe identity',
  }],
  ['/Lotus/Types/Restoratives/Consumable/Toxins/DayCommonAntitoxin', {
    text: 'Purchase the Beryl Antitoxin blueprint from the Market for 1,500 Credits, or buy the 7,500-Credit Cicero Crisis Antidote Pack that includes it, then build it in the Foundry.',
    url: 'https://wiki.warframe.com/w/Antitoxin_%28Gear%29',
    source: 'Warframe Wiki Antitoxin (Gear) exact item and pack record + DE export recipe identity',
  }],
  ['/Lotus/Types/Restoratives/Consumable/Toxins/DayUnCommonAntitoxin', {
    text: 'Purchase the Citrine Antitoxin blueprint from the Market for 1,500 Credits, or buy the 7,500-Credit Cicero Crisis Antidote Pack that includes it, then build it in the Foundry.',
    url: 'https://wiki.warframe.com/w/Antitoxin_%28Gear%29',
    source: 'Warframe Wiki Antitoxin (Gear) exact item and pack record + DE export recipe identity',
  }],
  ['/Lotus/Types/Restoratives/Consumable/Toxins/NightUnCommonAntitoxin', {
    text: 'Purchase the Topaz Antitoxin blueprint from the Market for 1,500 Credits, or buy the 7,500-Credit Cicero Crisis Antidote Pack that includes it, then build it in the Foundry.',
    url: 'https://wiki.warframe.com/w/Antitoxin_%28Gear%29',
    source: 'Warframe Wiki Antitoxin (Gear) exact item and pack record + DE export recipe identity',
  }],
  ['/Lotus/Types/Restoratives/TitaniaQuest/SpecterSummonKnaveLoki', {
    text: 'The Nightfall Apothic blueprint is awarded during The Silver Grove quest; build it in the Foundry to summon the Knave Specter at a Silver Grove Shrine.',
    url: 'https://wiki.warframe.com/w/Sunrise_Apothic',
    source: 'Warframe Wiki Apothic exact quest-acquisition statement + DE export recipe identity',
  }],
  ['/Lotus/Types/Restoratives/TitaniaQuest/SpecterSummonOrphidSaryn', {
    text: 'The Twilight Apothic blueprint is awarded during The Silver Grove quest; build it in the Foundry to summon the Orphid Specter at a Silver Grove Shrine.',
    url: 'https://wiki.warframe.com/w/Sunrise_Apothic',
    source: 'Warframe Wiki Apothic exact quest-acquisition statement + DE export recipe identity',
  }],
  ['/Lotus/Types/Restoratives/TitaniaQuest/SpecterSummonFeyarchOberon', {
    text: 'The Sunrise Apothic blueprint is awarded during The Silver Grove quest; build it in the Foundry to summon the Feyarch Specter at a Silver Grove Shrine.',
    url: 'https://wiki.warframe.com/w/Sunrise_Apothic',
    source: 'Warframe Wiki Apothic exact quest-acquisition statement + DE export recipe identity',
  }],
  ['/Lotus/Types/Items/MiscItems/FormaUmbra', {
    text: 'Purchase the Umbra Forma blueprint from Teshin’s rotating Steel Path Honors shop for 150 Steel Essence, then build it in the Foundry.',
    url: 'https://wiki.warframe.com/w/Umbra_Forma',
    source: 'Warframe Wiki Umbra Forma Steel Path Honors record + DE export recipe identity',
  }],
  ['/Lotus/Types/Restoratives/Consumable/Toxins/RareAntitoxin', {
    text: 'Purchase the Lapis Antitoxin blueprint from the Market for 1,500 Credits, or buy the 7,500-Credit Cicero Crisis Antidote Pack that includes it, then build it in the Foundry.',
    url: 'https://wiki.warframe.com/w/Antitoxin_%28Gear%29',
    source: 'Warframe Wiki Antitoxin (Gear) exact item and pack record + DE export recipe identity',
  }],
  ['/Lotus/Types/Restoratives/Consumable/Toxins/SoloRareAntitoxin', {
    text: 'The Vermillion Antitoxin blueprint is not included in the Cicero Crisis Antidote Pack. The Warframe Wiki records Vermillion as tradable, so obtain the blueprint or built item by trading with another player, then build it in the Foundry if you receive the blueprint.',
    url: 'https://wiki.warframe.com/w/Antitoxin_%28Gear%29',
    source: 'Warframe Wiki Antitoxin (Gear) exact item, pack exclusion, and tradability records + DE export recipe identity',
  }],
  ['/Lotus/Types/Keys/GolemQuest/GolemQuestKeyChainItem', {
    text: 'This is the internal quest key for The Jordas Precept. Complete the Pluto–Eris Junction to unlock the quest; the key is created for the quest chain rather than purchased as a normal Market item.',
    url: 'https://support.warframe.com/hc/en-us/articles/218290327-Quest-Tips-Up-to-Second-Dream-Minimal-Spoilers-',
    source: 'Official Warframe quest guidance for the Pluto–Eris Junction unlock + DE ExportKeys/ExportRecipes exact quest-key identity',
  }],
  ['/Lotus/Upgrades/Skins/CephWepSkins/CephGaundaoSkin', {
    text: 'Purchase the Guandao Synoid Skin blueprint from Nightwave Cred Offerings for 35 Cred, then build it in the Foundry.',
    url: 'https://wiki.warframe.com/w/Nightwave/Offerings',
    source: 'Warframe Wiki Nightwave Offerings exact item record + DE export recipe identity',
  }],
]);

// Exact item-page acquisition sections that are not represented in the
// structured Wiki modules. These are deliberately keyed by DE path rather
// than by cosmetic family or suffix so a similarly named object cannot inherit
// a route accidentally.
const EXACT_WIKI_ITEM_ACQUISITIONS = {
  '/Lotus/Upgrades/Skins/Promo/Seasonal/TennobaumArcaPlasmorSkin': 'This skin was originally available during Tennobaum 2023. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.',
  '/Lotus/Upgrades/Skins/Promo/Seasonal/TennobaumAtomosSkin': 'This skin was originally available during Tennobaum 2023. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.',
  '/Lotus/Upgrades/Skins/Weapons/LongGuns/SolsticeBurston': 'This skin was given out during Tennobaum 2016. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.',
  '/Lotus/Upgrades/Skins/WinterSolstice/SolsticeCorinthSkin': 'This skin was given out during Tennobaum 2018. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.',
  '/Lotus/Upgrades/Skins/Promo/Seasonal/TennobaumCycronSkin': 'Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.',
  '/Lotus/Upgrades/Skins/Promo/Seasonal/TennobaumDualKeresSkin': 'This skin was originally available during Tennobaum 2023. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.',
  '/Lotus/Upgrades/Skins/Promo/Seasonal/TennobaumFulminSkin': 'This skin was originally available during Tennobaum 2023. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.',
  '/Lotus/Upgrades/Skins/WinterSolstice/SolsticeGalatineSkin': 'This skin was given out during Tennobaum 2017. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.',
  '/Lotus/Upgrades/Skins/Promo/Seasonal/TennobaumGramSkin': 'This skin was originally available during Tennobaum 2023. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.',
  '/Lotus/Upgrades/Skins/WinterSolstice/SolsticeGaundaoSkin': 'This skin was given out during Tennobaum 2018. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.',
  '/Lotus/Upgrades/Skins/WinterSolstice/SolsticeIgnisSkin': 'This skin was given out during Tennobaum 2017. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.',
  '/Lotus/Upgrades/Skins/WinterSolstice/SolsticeLenzSkin': 'This skin was given as a Gift from the Lotus from December 20 through December 31, 2019. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.',
  '/Lotus/Upgrades/Skins/Dazzle/ProvaDazzleSkin': 'Its blueprint can only be acquired from Nightwave Cred Offerings for 30 Cred.',
  '/Lotus/Upgrades/Skins/Dazzle/ShockExergisSkin': 'Its blueprint can only be acquired from Nightwave Cred Offerings for 30 Cred.',
  '/Lotus/Upgrades/Skins/Dazzle/ShockFalcorSkin': 'Its blueprint can only be acquired from Nightwave Cred Offerings for 30 Cred.',
  '/Lotus/Upgrades/Skins/Camo/DesertGrinlokSkin': 'Its blueprint can only be acquired from Nightwave Cred Offerings for 30 Cred.',
  '/Lotus/Upgrades/Skins/Dazzle/ShockPlinxSkin': 'Its blueprint can only be acquired from Nightwave Cred Offerings for 30 Cred.',
  '/Lotus/Upgrades/Skins/CephWepSkins/CephPyranaSkin': 'Its blueprint can only be acquired from Nightwave Cred Offerings for 35 Cred.',
  '/Lotus/Upgrades/Skins/CephWepSkins/CephRubicoSkin': 'Its blueprint can only be acquired from Nightwave Cred Offerings for 35 Cred.',
  '/Lotus/Upgrades/Skins/Axe/SolsticeScindo': 'This skin was given out during Tennobaum 2016. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.',
  '/Lotus/Upgrades/Skins/WinterSolstice/SolsticeTatsuSkin': 'This skin was given as a Gift from the Lotus from December 20 through December 31, 2019. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.',
  '/Lotus/Types/Restoratives/OpenArchwingSummon': 'Awarded upon completion of The Archwing quest. The current export recipe is retained as the legacy Foundry recipe.',
  '/Lotus/Types/Restoratives/Consumable/Cipher': 'The 1x and 10x blueprints are bought from the Market Gear tab for 500 and 250,000 Credits; the reusable 100x blueprint is researched in a Dojo Tenno Lab.',
  '/Lotus/Types/Keys/DojoKey': 'Upon starting or joining a Clan, the Clan Key blueprint is automatically added to the inventory and made available in the Foundry.',
  '/Lotus/Types/Restoratives/Consumable/FomorianNegator': 'The reusable blueprint is available in the Market under Equipment → Gear for 5,000 Credits.',
  '/Lotus/Types/Restoratives/Consumable/RazorbackCipher': 'The blueprint is sent to the player by Lotus in the event message; its Cryptographic ALU component is obtained during the Razorback event.',
  '/Lotus/Types/Restoratives/Consumable/CreditChipSmall': 'The Humble Void Offering was sold in the Market under Equipment → Gear for 1,000 Credits, but was discontinued after its event ended.',
  '/Lotus/Types/Restoratives/Consumable/CreditChipMedium': 'The Faithful Void Offering was sold in the Market under Equipment → Gear for 10,000 Credits, but was discontinued after its event ended.',
  '/Lotus/Types/Restoratives/Consumable/CreditChipLarge': 'The Passionate Void Offering was sold in the Market under Equipment → Gear for 100,000 Credits, but was discontinued after its event ended.',
  '/Lotus/Types/Vehicles/Hoverboard/HoverboardParts/PartComponents/HoverboardInfestedB/HoverboardInfestedBDeck': 'The blueprint is acquired by completing the Dead Drop K-Drive Race on the Cambion Drift; active races rotate daily.',
  '/Lotus/Types/Vehicles/Hoverboard/HoverboardParts/PartComponents/HoverboardInfestedB/HoverboardInfestedBEngine': 'The blueprint is acquired by completing the Muck and Mire K-Drive Race on the Cambion Drift; active races rotate daily.',
  '/Lotus/Types/Vehicles/Hoverboard/HoverboardParts/PartComponents/HoverboardInfestedB/HoverboardInfestedBFront': 'The blueprint is acquired by completing the Exocrine Flow K-Drive Race on the Cambion Drift; active races rotate daily.',
  '/Lotus/Types/Vehicles/Hoverboard/HoverboardParts/PartComponents/HoverboardInfestedB/HoverboardInfestedBJet': 'The blueprint is acquired by completing the Pride Before a Fall K-Drive Race on the Cambion Drift; active races rotate daily.',
  '/Lotus/Weapons/Tenno/Bayonet/TnBayonetRifleWeapon': "Vinquibus' main and component blueprints are obtained from Roathe's Oblivion on Infernium 21 of The Descendia after The Old Peace, or purchased from Roathe in La Cathédrale for Maphica.",
};

for (const [uniqueName, text] of Object.entries(EXACT_WIKI_ITEM_ACQUISITIONS)) {
  const url = text.includes('Nightwave')
    ? 'https://wiki.warframe.com/w/Nightwave/Offerings'
    : text.includes('K-Drive Race')
      ? 'https://wiki.warframe.com/w/K-Drive'
      : text.startsWith('Vinquibus')
        ? 'https://wiki.warframe.com/w/Vinquibus'
        : text.includes('Archwing Launcher')
          ? 'https://wiki.warframe.com/w/Archwing_Launcher'
          : text.includes('Clan Key')
            ? 'https://wiki.warframe.com/w/Clan_Key'
            : text.includes('Fomorian Disruptor')
              ? 'https://wiki.warframe.com/w/Fomorian_Disruptor'
              : text.includes('Razorback')
                ? 'https://wiki.warframe.com/w/Razorback_Cipher'
                : text.includes('Void Offering')
                  ? 'https://wiki.warframe.com/w/Void_Offering'
                  : 'https://wiki.warframe.com/w/Market';
  WIKI_VERIFIED_ACQUISITIONS.set(uniqueName, {
    text,
    url,
    source: 'Warframe Wiki exact item-page acquisition section + DE export exact uniqueName',
  });
}

const LEGACY_ARCANE_HELMET_PATHS = [
  '/Lotus/Upgrades/Skins/Trinity/TrinityHelmetAlt',
  '/Lotus/Upgrades/Skins/Frost/FrostHelmetAlt',
  '/Lotus/Upgrades/Skins/Excalibur/ExcaliburHelmetAlt',
  '/Lotus/Upgrades/Skins/Ember/EmberHelmetAltB',
  '/Lotus/Upgrades/Skins/Asp/AspAltHelmetB',
  '/Lotus/Upgrades/Skins/Decree/DecreeAltHelmetB',
  '/Lotus/Upgrades/Skins/Mag/MagHelmetAlt',
  '/Lotus/Upgrades/Skins/Trapper/TrapperHelmetAlt',
  '/Lotus/Upgrades/Skins/Loki/LokiHelmetAlt',
  '/Lotus/Upgrades/Skins/AntiMatter/AntiAltHelmet',
  '/Lotus/Upgrades/Skins/Trapper/TrapperHelmetAltB',
  '/Lotus/Upgrades/Skins/Asp/AspAltHelmet',
  '/Lotus/Upgrades/Skins/Ninja/NinjaHelmetAltB',
  '/Lotus/Upgrades/Skins/Mag/MagHelmetAltB',
  '/Lotus/Upgrades/Skins/Jade/JadeHelmetAlt',
  '/Lotus/Upgrades/Skins/Trinity/TrinityHelmetAltB',
  '/Lotus/Upgrades/Skins/Excalibur/ExcaliburHelmetAltB',
  '/Lotus/Upgrades/Skins/Ember/EmberHelmetAlt',
  '/Lotus/Upgrades/Skins/Volt/VoltHelmetAltB',
  '/Lotus/Upgrades/Skins/Decree/DecreeAltHelmet',
  '/Lotus/Upgrades/Skins/Ninja/NinjaHelmetAlt',
  '/Lotus/Upgrades/Skins/Frost/FrostHelmetAltB',
  '/Lotus/Upgrades/Skins/Volt/VoltHelmetAlt',
  '/Lotus/Upgrades/Skins/Loki/LokiHelmetAltB',
  '/Lotus/Upgrades/Skins/Rhino/RhinoHelmetAlt',
  '/Lotus/Upgrades/Skins/Rhino/RhinoHelmetAltB',
  '/Lotus/Upgrades/Skins/Jade/JadeHelmetAltB',
];

for (const uniqueName of LEGACY_ARCANE_HELMET_PATHS) {
  WIKI_VERIFIED_ACQUISITIONS.set(uniqueName, {
    text: 'This is a legacy Arcane Helmet. The Warframe Wiki records Arcane Helmets as removed from the Market and Alerts; existing copies can only be obtained by trading with another player who owns one.',
    url: 'https://wiki.warframe.com/w/Category:Arcane_Helmet',
    source: 'Warframe Wiki Arcane Helmet category disposition + DE export exact cosmetic identity',
  });
}

// Exact legacy, role-gated, and export-only records which are visible in a
// player's inventory but do not have a normal current Market route. These are
// intentionally per-path: the wording must not leak to similarly named items.
for (const [uniqueName, text, url, source] of [
  ['/Lotus/Types/Restoratives/Consumable/Eidolon/LandscapeTrapLightGear', 'The export identifies Beckonsnare as a legacy conservation trap with a 500-Credit base cost, but excludes it from the Market and records no current vendor, drop, or quest route. Treat it as an owned-only legacy item.', 'https://wiki.warframe.com/w/Beckonsnare', 'DE ExportGear exact Beckonsnare record + Wiki exact item identity'],
  ['/Lotus/Types/Restoratives/Consumable/MacheteWomanBall', 'The export identifies Scorpion Specter as a legacy, non-tradable specter item excluded from the Market. No current player-facing source is recorded; existing copies are owned-only.', 'https://wiki.warframe.com/w/Scorpion_Specter', 'DE ExportGear exact Scorpion Specter record + Wiki exact item identity'],
  ['/Lotus/Upgrades/Skins/Sigils/SparkSigil', 'The Flickering Sigil is a legacy non-tradable sigil. The export records a 75-Platinum historical cost but excludes the exact item from the current Market; no current acquisition route is documented.', 'https://wiki.warframe.com/w/Flickering_Sigil', 'DE ExportCustoms exact Flickering Sigil record + Wiki exact item identity'],
  ['/Lotus/Upgrades/Skins/Clan/SolarisBadgeItem', 'The Solaris Emblem is the legacy Fortuna/Solaris emblem. The export records the exact emblem as non-tradable and excluded from the current Market; no current purchase or drop route is documented.', 'https://wiki.warframe.com/w/Solaris_Emblem', 'DE ExportCustoms exact Solaris Emblem record + Solaris United historical emblem record'],
  ['/Lotus/Upgrades/Skins/Operator/Accessories/OperatorNefAnyoMask', 'The Vox Solaris Mask is an unreleased legacy cosmetic in the export: it is non-tradable, excluded from the Market, and has no released player acquisition route.', 'https://wiki.warframe.com/w/Vox_Solaris_Mask', 'DE ExportCustoms exact Vox Solaris Mask record + Wiki exact item identity'],
  ['/Lotus/Upgrades/Skins/Armor/WarframeDefaults/DagathImmortalArmArmor', 'This armor is included with the Dagath Immortal Skin, but the exact export record is non-tradable and excluded from the Market. The Dagath Immortal set is currently unobtainable and can only be chat-linked.', 'https://wiki.warframe.com/w/Dagath_Immortal_Skin', 'DE ExportCustoms exact additionalItems relationship + current cosmetic availability record'],
  ['/Lotus/Upgrades/Skins/Dagath/DagathImmortalHelmet', 'This helmet is included with the Dagath Immortal Skin, but the exact export record is non-tradable and excluded from the Market. The Dagath Immortal set is currently unobtainable and can only be chat-linked.', 'https://wiki.warframe.com/w/Dagath_Immortal_Skin', 'DE ExportCustoms exact additionalItems relationship + current cosmetic availability record'],
  ['/Lotus/Upgrades/Skins/Dagath/DagathImmortalSkin', 'The Dagath Immortal Skin includes the Dagath Immortal Armor and Helmet. The exact export record is non-tradable and excluded from the Market; the set is currently unobtainable and can only be chat-linked.', 'https://wiki.warframe.com/w/Dagath_Immortal_Skin', 'DE ExportCustoms exact additionalItems relationship + current cosmetic availability record'],
  ['/Lotus/Upgrades/Skins/Odalisk/ProteaImmortalHelmet', 'This helmet is included with the Protea Immortal Skin, but the exact export record is non-tradable and excluded from the Market. The Protea Immortal set is currently unobtainable and can only be chat-linked.', 'https://wiki.warframe.com/w/Protea_Immortal_Skin', 'DE ExportCustoms exact additionalItems relationship + current cosmetic availability record'],
  ['/Lotus/Upgrades/Skins/Odalisk/ProteaImmortalSkin', 'The Protea Immortal Skin includes the Protea Immortal Helmet. The exact export record is non-tradable and excluded from the Market; the set is currently unobtainable and can only be chat-linked.', 'https://wiki.warframe.com/w/Protea_Immortal_Skin', 'DE ExportCustoms exact additionalItems relationship + current cosmetic availability record'],
  ['/Lotus/Upgrades/Skins/Rhino/RhinoRubedoSkinHelmet', 'This helmet was part of the retired Rubedo Plated Rhino Skin collection, which was distributed through Steam Trading Cards. The exact export record is non-tradable and excluded from the current Market.', 'https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards', 'Warframe Wiki retired Rubedo Plated collection record + DE ExportCustoms exact helmet identity'],
  ['/Lotus/Upgrades/Skins/Necramech/NecramechVoidRigDefaultHelmet', 'The default Voidrig helmet is included when you acquire and build a Voidrig. Complete Heart of Deimos for the Voidrig blueprints, or obtain the blueprints from the Necraloid syndicate; this exact default helmet is not a separate Market item.', 'https://www.warframe.com/en/news/necramechs-guide', 'Official Warframe Necramechs Guide + DE ExportCustoms exact default-helmet identity'],
  ['/Lotus/Types/AvatarImages/AvatarImageChatModerator', 'Awarded to Warframe chat moderators as a role privilege; it is not a Market item or a general promo-code reward.', 'https://warframe.fandom.com/wiki/Glyph', 'Warframe Wiki exact glyph identity + role-gated Chat Moderator record'],
  ['/Lotus/Types/AvatarImages/AvatarImageLotusGuide', 'Awarded to Guides of the Lotus while that volunteer program existed. The program was removed, so this glyph is no longer obtainable through a current player program.', 'https://warframe.fandom.com/wiki/Sigils?page=2&title=Sigils', 'Warframe Wiki Guides of the Lotus program disposition + WFCD exact glyph identity'],
  ['/Lotus/Types/AvatarImages/AvatarImageTennoTranslator', 'Awarded to players who contributed translations for Warframe; it is a role/contribution reward, not a Market item or public promo-code reward.', 'https://warframe.fandom.com/wiki/Sigils?page=2&title=Sigils', 'Warframe Wiki translator contribution record + WFCD exact glyph identity'],
  ['/Lotus/Types/AvatarImages/FanChannel/AvatarImagePartnerUpdated', 'Distributed through the Warframe Creator/Partner program to eligible creators; the exact legacy record has no universal public purchase route and is not tradable.', 'https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs', 'Warframe Wiki Creator Glyphs section + WFCD exact glyph identity'],
  ['/Lotus/Types/AvatarImages/FanChannel/AvatarImagePartner', 'Distributed through the Warframe Partner program to eligible creators; the exact legacy record has no universal public purchase route and is not tradable.', 'https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs', 'Warframe Wiki Creator Glyphs section + WFCD exact glyph identity'],
  ['/Lotus/Types/AvatarImages/FanChannel/AvatarImagePartnerMug', 'Distributed through the Warframe Partner program as a creator-glyph variant; the exact legacy record has no universal public purchase route and is not tradable.', 'https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs', 'Warframe Wiki Creator Glyphs section + WFCD exact glyph identity'],
  ['/Lotus/Types/AvatarImages/FanChannel/AvatarImageWarframeFanChannel', 'Distributed through the Warframe fan-channel/creator program; the exact legacy record has no universal public purchase route and is not tradable.', 'https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs', 'Warframe Wiki Creator Glyphs section + WFCD exact glyph identity'],
  ['/Lotus/Types/AvatarImages/FanChannel/AvatarImageMGLblaze', 'This is a creator glyph distributed through MGLblaze’s Warframe Partner/Creator channel, not a normal Market item. The exact legacy record is non-tradable; creator-controlled giveaways or promo distribution are the acquisition route when available.', 'https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs', 'Warframe Wiki Creator Glyphs section + WFCD exact glyph identity'],
  ['/Lotus/Types/AvatarImages/AvatarImageCreatorSnowLit', 'This is a creator glyph distributed through Snowlit’s Warframe Partner/Creator channel, not a normal Market item. The exact legacy record is non-tradable; creator-controlled giveaways or promo distribution are the acquisition route when available.', 'https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs', 'Warframe Wiki Creator Glyphs section + WFCD exact glyph identity'],
  ['/Lotus/Types/AvatarImages/FanChannel/AvatarImageSzczebrzeszyniarz', 'This is a creator glyph distributed through the named Warframe Partner/Creator channel, not a normal Market item. The exact legacy record is non-tradable; creator-controlled giveaways or promo distribution are the acquisition route when available.', 'https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs', 'Warframe Wiki Creator Glyphs section + WFCD exact glyph identity'],
  ['/Lotus/Types/AvatarImages/AvatarImageCreatorWgrates', 'This Lotus Symbol Glyph is a creator/fan-channel distribution record, not a normal Market item. The exact legacy record is non-tradable and its creator-controlled distribution is the acquisition route when available.', 'https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs', 'Warframe Wiki Creator Glyphs section + WFCD exact glyph identity'],
  ['/Lotus/Types/AvatarImages/FanChannel/AvatarImageDesRPG', 'The DesRPG Lotus Symbol Glyph was a creator glyph; the glyphs.wf partner record marks it as no longer in the game. Existing copies are legacy-owned only.', 'https://glyphs.wf/', 'glyphs.wf exact creator disposition + WFCD exact glyph identity'],
  ['/Lotus/Types/AvatarImages/FanChannel/AvatarImageDramakins', 'This Lotus Symbol Glyph was distributed through Dramakins’ Warframe Partner/Creator channel, not the Market; creator-controlled giveaways or promo distribution were the acquisition route.', 'https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs', 'Warframe Wiki Creator Glyphs section + WFCD exact glyph identity'],
  ['/Lotus/Types/AvatarImages/FanChannel/AvatarImageKacchi', 'This Lotus Symbol Glyph was distributed through KingKacchi’s Warframe Partner/Creator channel, not the Market; creator-controlled giveaways or promo distribution were the acquisition route.', 'https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs', 'Warframe Wiki Creator Glyphs section + WFCD exact glyph identity'],
  ['/Lotus/Types/AvatarImages/FanChannel/AvatarImageLovinDaTacos', 'This Lotus Symbol Glyph was distributed through the named Warframe Partner/Creator channel, not the Market; creator-controlled giveaways or promo distribution were the acquisition route.', 'https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs', 'Warframe Wiki Creator Glyphs section + WFCD exact glyph identity'],
  ['/Lotus/Types/AvatarImages/FanChannel/AvatarImageSenastra', 'This Lotus Symbol Glyph was distributed through the named Warframe Partner/Creator channel, not the Market; creator-controlled giveaways or promo distribution were the acquisition route.', 'https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs', 'Warframe Wiki Creator Glyphs section + WFCD exact glyph identity'],
  ['/Lotus/Types/AvatarImages/Factions/GlyphFactionAmalgam', 'This is an internal faction glyph record for the Amalgam faction. It has no player-facing Market, drop, quest, or vendor route in the current export; existing copies are legacy-owned only.', 'https://wiki.warframe.com/w/Amalgam_Glyph', 'DE/WFCD exact faction-glyph identity + current export route absence'],
  ['/Lotus/Types/AvatarImages/Factions/GlyphFactionInfested', 'This is an internal faction glyph record for the Infested faction. It has no player-facing Market, drop, quest, or vendor route in the current export; existing copies are legacy-owned only.', 'https://wiki.warframe.com/w/Infestation_Glyph', 'DE/WFCD exact faction-glyph identity + current export route absence'],
  ['/Lotus/Types/AvatarImages/Factions/GlyphFactionDeimos', 'This is an internal faction glyph record for the Infested Deimos faction. It has no player-facing Market, drop, quest, or vendor route in the current export; existing copies are legacy-owned only.', 'https://wiki.warframe.com/w/Infested_Deimos_Glyph', 'DE/WFCD exact faction-glyph identity + current export route absence'],
  ['/Lotus/Types/AvatarImages/Factions/GlyphFactionOrokin', 'This is an internal faction glyph record for the Orokin faction. It has no player-facing Market, drop, quest, or vendor route in the current export; existing copies are legacy-owned only.', 'https://wiki.warframe.com/w/Orokin_Glyph', 'DE/WFCD exact faction-glyph identity + current export route absence'],
  ['/Lotus/Types/AvatarImages/AvatarImageGlyphDELogo', 'This Digital Extremes logo glyph is a staff/promotional record, not a normal Market item. The exact legacy record is non-tradable and has no public player acquisition route recorded.', 'https://wiki.warframe.com/w/Digital_Extremes_Glyph', 'DE/WFCD exact glyph identity + current export route absence'],
  ['/Lotus/Types/AvatarImages/AvatarImageChatModerator', 'Awarded to Warframe chat moderators as a role privilege; it is not a Market item or a general promo-code reward.', 'https://warframe.fandom.com/wiki/Glyph', 'Warframe Wiki exact glyph identity + role-gated Chat Moderator record'],
  ['/Lotus/Types/AvatarImages/AvatarImageGamingCommunityExpoTwentyFour', 'This GCX 2024 glyph is an event/promotional record, not a normal Market item. The current export and exact Wiki identity record do not expose a reusable public code or active route; existing copies are legacy-owned only.', 'https://wiki.warframe.com/w/Gcx_2024_Glyph', 'DE/WFCD exact GCX glyph identity + current export route absence'],
  ['/Lotus/Types/AvatarImages/AvatarImageGlyphLegendaryQuasars', 'This is a legacy creator/partner glyph distributed through creator-controlled promotions rather than the Market. The exact non-tradable record has no current universal public route.', 'https://warframe.fandom.com/wiki/Glyph#Creator_Glyphs', 'Warframe Wiki Creator Glyphs section + WFCD exact glyph identity'],
  ['/Lotus/Types/AvatarImages/AvatarImageGlyphCookieBoot', 'This is a legacy promotional/creator glyph, not a normal Market item. The exact non-tradable record has no current universal public code or active route.', 'https://wiki.warframe.com/w/Cookie_Boot_Glyph', 'WFCD exact glyph identity + current export route absence'],
  ['/Lotus/Types/AvatarImages/SavePopcornGlyph', 'This is a legacy promotional glyph, not a normal Market item. The exact non-tradable record has no current universal public code or active route.', 'https://wiki.warframe.com/w/Save_Popcorn_Glyph', 'WFCD exact glyph identity + current export route absence'],
]) {
  WIKI_VERIFIED_ACQUISITIONS.set(uniqueName, { text, url, source });
}

// These exact records describe a verified disposition rather than a route a
// player can currently follow. Keep them separate from normal acquisitions so
// callers and audits do not mistake an explicit "unavailable" explanation for
// a concrete source.
export const WIKI_VERIFIED_DISPOSITIONS = new Map([
  '/Lotus/Upgrades/Mods/Warframe/Expert/AvatarAbilityEfficiencyModExpert',
  '/Lotus/Upgrades/Mods/Warframe/AvatarDamageResistanceStun',
  '/Lotus/Types/Restoratives/Consumable/Eidolon/LandscapeTrapLightGear',
  '/Lotus/Types/Restoratives/Consumable/MacheteWomanBall',
  '/Lotus/Upgrades/Skins/Sigils/SparkSigil',
  '/Lotus/Upgrades/Skins/Clan/SolarisBadgeItem',
  '/Lotus/Upgrades/Skins/Operator/Accessories/OperatorNefAnyoMask',
  '/Lotus/Upgrades/Skins/Armor/WarframeDefaults/DagathImmortalArmArmor',
  '/Lotus/Upgrades/Skins/Dagath/DagathImmortalHelmet',
  '/Lotus/Upgrades/Skins/Dagath/DagathImmortalSkin',
  '/Lotus/Upgrades/Skins/Odalisk/ProteaImmortalHelmet',
  '/Lotus/Upgrades/Skins/Odalisk/ProteaImmortalSkin',
  '/Lotus/Upgrades/Skins/Rhino/RhinoRubedoSkinHelmet',
  '/Lotus/Types/AvatarImages/AvatarImageChatModerator',
  '/Lotus/Types/AvatarImages/AvatarImageLotusGuide',
  '/Lotus/Types/AvatarImages/AvatarImageTennoTranslator',
  '/Lotus/Types/AvatarImages/FanChannel/AvatarImagePartnerUpdated',
  '/Lotus/Types/AvatarImages/FanChannel/AvatarImagePartner',
  '/Lotus/Types/AvatarImages/FanChannel/AvatarImagePartnerMug',
  '/Lotus/Types/AvatarImages/FanChannel/AvatarImageWarframeFanChannel',
  '/Lotus/Types/AvatarImages/FanChannel/AvatarImageBennyfits',
  '/Lotus/Types/AvatarImages/FanChannel/AvatarImageBikeman',
  '/Lotus/Types/AvatarImages/FanChannel/AvatarImageSp00nerism',
  '/Lotus/Types/AvatarImages/FanChannel/AvatarImageSummit1G',
  '/Lotus/Types/AvatarImages/FanChannel/AvatarImageMGLblaze',
  '/Lotus/Types/AvatarImages/AvatarImageCreatorSnowLit',
  '/Lotus/Types/AvatarImages/FanChannel/AvatarImageSzczebrzeszyniarz',
  '/Lotus/Types/AvatarImages/AvatarImageCreatorWgrates',
  '/Lotus/Types/AvatarImages/FanChannel/AvatarImageDesRPG',
  '/Lotus/Types/AvatarImages/FanChannel/AvatarImageDramakins',
  '/Lotus/Types/AvatarImages/FanChannel/AvatarImageKacchi',
  '/Lotus/Types/AvatarImages/FanChannel/AvatarImageLovinDaTacos',
  '/Lotus/Types/AvatarImages/FanChannel/AvatarImageSenastra',
  '/Lotus/Types/AvatarImages/Factions/GlyphFactionAmalgam',
  '/Lotus/Types/AvatarImages/Factions/GlyphFactionInfested',
  '/Lotus/Types/AvatarImages/Factions/GlyphFactionDeimos',
  '/Lotus/Types/AvatarImages/Factions/GlyphFactionOrokin',
  '/Lotus/Types/AvatarImages/AvatarImageGlyphDELogo',
  '/Lotus/Types/AvatarImages/AvatarImageGamingCommunityExpoTwentyFour',
  '/Lotus/Types/AvatarImages/AvatarImageGlyphLegendaryQuasars',
  '/Lotus/Types/AvatarImages/AvatarImageGlyphCookieBoot',
  '/Lotus/Types/AvatarImages/SavePopcornGlyph',
].map((uniqueName) => [uniqueName, WIKI_VERIFIED_ACQUISITIONS.get(uniqueName)]),
);

for (const [uniqueName, text, url] of [
  ['/Lotus/Upgrades/Skins/Operator/Hoods/WolfHood', 'Purchase the Wolf Hood blueprint from Nightwave Cred Offerings for 35 Cred, then build it in the Foundry.', 'https://wiki.warframe.com/w/Operator/Customization'],
  ['/Lotus/Upgrades/Skins/Operator/Armour/Teshin/TeshinArmourBody', 'Purchase the Hawk Bishamo Cuirass blueprint from Teshin’s Steel Path Honors for 25 Steel Essence, then build it in the Foundry.', 'https://wiki.warframe.com/w/Steel_Path'],
  ['/Lotus/Upgrades/Skins/Operator/Armour/Teshin/TeshinArmourLegs', 'Purchase the Hawk Bishamo Greaves blueprint from Teshin’s Steel Path Honors for 25 Steel Essence, then build it in the Foundry.', 'https://wiki.warframe.com/w/Steel_Path'],
  ['/Lotus/Upgrades/Skins/Operator/Armour/Teshin/TeshinArmourHead', 'Purchase the Hawk Bishamo Helmet blueprint from Teshin’s Steel Path Honors for 20 Steel Essence, then build it in the Foundry.', 'https://wiki.warframe.com/w/Steel_Path'],
  ['/Lotus/Upgrades/Skins/Operator/Armour/Teshin/TeshinArmourArms', 'Purchase the Hawk Bishamo Pauldrons blueprint from Teshin’s Steel Path Honors for 15 Steel Essence, then build it in the Foundry.', 'https://wiki.warframe.com/w/Steel_Path'],
  ['/Lotus/Types/Keys/LimboQuest/LimboChassisTheorem', 'Awarded during The Limbo Theorem quest; use the theorem to run the quest mission that awards the Limbo Chassis blueprint.', 'https://support.warframe.com/hc/en-us/articles/360029276132-The-Limbo-Theorem-FAQ'],
  ['/Lotus/Types/Keys/LimboQuest/LimboHelmetTheorem', 'Awarded during The Limbo Theorem quest; use the theorem to run the quest mission that awards the Limbo Neuroptics blueprint.', 'https://support.warframe.com/hc/en-us/articles/360029276132-The-Limbo-Theorem-FAQ'],
  ['/Lotus/Types/Keys/LimboQuest/LimboSystemsTheorem', 'Awarded during The Limbo Theorem quest; use the theorem to run the quest mission that awards the Limbo Systems blueprint.', 'https://support.warframe.com/hc/en-us/articles/360029276132-The-Limbo-Theorem-FAQ'],
  ['/Lotus/Types/Restoratives/Consumable/StalkerBall', 'The Stalker Specter blueprint was awarded at Rank 6 of Nightwave: Nora’s Mix Volume 7.', 'https://www.warframe.com/en/news/vol-7'],
  ['/Lotus/Types/Recipes/Components/VorBoltRemoverFakeItem', 'Darvo gives the Ascaris Negator blueprint during Vor’s Prize; gather its quest materials and build it in the Foundry.', 'https://warframe.fandom.com/wiki/Ascaris_Negator'],
  ['/Lotus/Types/Restoratives/Cipher', 'The 1x and 10x blueprints are bought from the Market Gear tab for 500 and 250,000 Credits; the reusable 100x blueprint is researched in a Dojo Tenno Lab.', 'https://wiki.warframe.com/w/Cipher'],
  ['/Lotus/Types/Restoratives/Consumable/FomorianNegator', 'The reusable blueprint is available in the Market under Equipment → Gear for 5,000 Credits.', 'https://wiki.warframe.com/w/Fomorian_Disruptor'],
  ['/Lotus/Types/Restoratives/Consumable/RazorbackCipher', 'Lotus sends the Razorback Cipher blueprint in the event message; its Cryptographic ALU component is obtained during the Razorback event.', 'https://wiki.warframe.com/w/Razorback_Cipher'],
  ['/Lotus/Types/Restoratives/Consumable/Synthetics/FlareBlue', 'Purchase the reusable Fosfor Blau blueprint from Nakak in Cetus; the required Plains resources and the offered price rotate with Nakak’s daily inventory.', 'https://warframe.fandom.com/wiki/Fosfor'],
  ['/Lotus/Types/Restoratives/Consumable/Synthetics/FlareRed', 'Purchase the reusable Fosfor Rahd blueprint from Nakak in Cetus; the required Plains resources and the offered price rotate with Nakak’s daily inventory.', 'https://warframe.fandom.com/wiki/Fosfor'],
  ['/Lotus/Types/Restoratives/Consumable/InfestedIrradiatedBaitBall', 'The Potent Pherliac Pods blueprint is awarded during The Jordas Precept quest; build it in the Foundry using Pherliac Pods and Argon Crystals.', 'https://warframe.fandom.com/wiki/Pherliac_Pod?page=2'],
  ['/Lotus/Types/Vehicles/Hoverboard/HoverboardParts/PartComponents/HoverboardInfestedB/HoverboardInfestedBDeck', 'The blueprint is acquired by completing the Dead Drop K-Drive Race on the Cambion Drift; active races rotate daily.', 'https://wiki.warframe.com/w/K-Drive'],
  ['/Lotus/Types/Vehicles/Hoverboard/HoverboardParts/PartComponents/HoverboardInfestedB/HoverboardInfestedBEngine', 'The blueprint is acquired by completing the Muck and Mire K-Drive Race on the Cambion Drift; active races rotate daily.', 'https://wiki.warframe.com/w/K-Drive'],
  ['/Lotus/Types/Vehicles/Hoverboard/HoverboardParts/PartComponents/HoverboardInfestedB/HoverboardInfestedBFront', 'The blueprint is acquired by completing the Exocrine Flow K-Drive Race on the Cambion Drift; active races rotate daily.', 'https://wiki.warframe.com/w/K-Drive'],
  ['/Lotus/Types/Vehicles/Hoverboard/HoverboardParts/PartComponents/HoverboardInfestedB/HoverboardInfestedBJet', 'The blueprint is acquired by completing the Pride Before a Fall K-Drive Race on the Cambion Drift; active races rotate daily.', 'https://wiki.warframe.com/w/K-Drive'],
  ['/Lotus/Weapons/Tenno/Bayonet/TnBayonetRifleWeapon', "Vinquibus' main and component blueprints are obtained from Roathe's Oblivion on Infernium 21 of The Descendia after The Old Peace, or purchased from Roathe in La Cathédrale for Maphica.", 'https://wiki.warframe.com/w/Vinquibus'],
  ['/Lotus/Types/Recipes/WarframeRecipes/ChromaBeaconCComponent', 'The Chroma Mark blueprint is awarded during The New Strange quest and is required to progress the Chroma synthesis sequence.', 'https://warframe.fandom.com/wiki/The_New_Strange'],
  ['/Lotus/Types/Recipes/Weapons/WeaponParts/DaxDuviriAsymmetricalLongBowString', 'The Cinta String blueprint is one of the Cinta component blueprints obtained by solving Enigma Puzzles in Duviri.', 'https://warframe.fandom.com/wiki/Cinta'],
  ['/Lotus/Types/Recipes/Weapons/WeaponParts/TnDagathBladeWhipBlade', "The Dorrclave Blade blueprint is acquired from Dagath's Hollow in the Clan Dojo; its component blueprint requires Vainthorn from the Abyssal Zone.", 'https://warframe.fandom.com/wiki/Dorrclave'],
  ['/Lotus/Types/Recipes/Weapons/WeaponParts/TnDagathBladeWhipHilt', "The Dorrclave Hilt blueprint is acquired from Dagath's Hollow in the Clan Dojo; its component blueprint requires Vainthorn from the Abyssal Zone.", 'https://warframe.fandom.com/wiki/Dorrclave'],
  ['/Lotus/Types/Restoratives/Consumable/CorruptedBombardBall', 'The Corrupted Bombard Specter blueprint was a limited Baro Ki’Teer offering for 100 Ducats and 50,000 Credits (February 24–26, 2017 on PC).', 'https://warframe.fandom.com/wiki/Specter'],
  ['/Lotus/Types/Ship/BasicUcResourceDrone', 'Purchase the reusable Distilling Extractor blueprint from the in-game Market for 50,000 Credits, then build it in the Foundry.', 'https://support.warframe.com/hc/en-us/articles/200492204-Extractors'],
  ['/Lotus/Types/Ship/BasicResourceDrone', 'Purchase the reusable Titan Extractor blueprint from the in-game Market, then build the extractor in the Foundry.', 'https://support.warframe.com/hc/en-us/articles/200492204-Extractors'],
  ['/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPowerSuit', 'Purchase the desired MOA component blueprints from Legs in Fortuna for Standing, build the parts, then configure the MOA at Legs for 4,000 Credits.', 'https://warframe.fandom.com/wiki/MOA_%28Companion%29'],
  ['/Lotus/Types/Keys/InfestedAladVQuest/AssassinateInfestedAladVKey', 'The reusable Mutalist Alad V Assassinate blueprint is awarded for completing Patient Zero; build it with Mutalist Alad V Nav Coordinates to unlock the mission.', 'https://warframe.fandom.com/wiki/Blueprints'],
  ['/Lotus/Types/Restoratives/TeamAmmoTotem', 'The reusable 1x and 10x Squad Ammo Restore (Small) blueprints are purchased from the Market for 500 and 250,000 Credits.', 'https://warframe.fandom.com/wiki/Squad_Ammo_Restore'],
  ['/Lotus/Types/Restoratives/TeamEnergyTotem', 'The reusable 1x and 10x Squad Energy Restore (Small) blueprints are purchased from the Market for 500 and 250,000 Credits.', 'https://warframe.fandom.com/wiki/Squad_Energy_Restore'],
  ['/Lotus/Types/Restoratives/TeamHealTotem', 'The reusable 1x and 10x Squad Health Restore (Small) blueprints are purchased from the Market for 500 and 250,000 Credits.', 'https://warframe.fandom.com/wiki/Squad_Health_Restore'],
  ['/Lotus/Types/Restoratives/TeamShieldTotem', 'The reusable 1x and 10x Squad Shield Restore (Small) blueprints are purchased from the Market for 500 and 250,000 Credits.', 'https://warframe.fandom.com/wiki/Squad_Shield_Restore'],
  ['/Lotus/Types/Gameplay/EntratiLab/Quest/GargoyleMiscItem', 'During Operation: Gargoyle’s Cry, build the Vigile Jahu Gargoyle in a Clan Dojo after Whispers in the Walls; the limited operation ended January 15, 2024.', 'https://www.warframe.com/en/news/operation-gargoyles-cry'],
]) {
  WIKI_VERIFIED_ACQUISITIONS.set(uniqueName, {
    text,
    url,
    source: 'Exact Warframe Wiki or official support/announcement acquisition record + DE export exact uniqueName',
  });
}
