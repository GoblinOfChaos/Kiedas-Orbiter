// Per-mod compatibility tags (specific companion/weapon/warframe names, e.g.
// "Shade", "Bronco", "Excalibur") sourced directly from each mod's own
// Warframe Wiki page (wiki.warframe.com), queried individually per mod (no
// batching, no inference) on 2026-08-19. Not DE's raw compatName - that
// field only covers a fraction of what the wiki tracks (e.g. it has nothing
// for most weapon-exclusive augments). Used to widen mod search (typing
// "shade" matches every Shade-compatible mod) without adding new category UI.
// Keyed by unique_name. Refresh by re-running the wiki query if mods are added.
export const MOD_WIKI_TAGS = {
"/Lotus/Weapons/Tenno/Melee/Polearms/Naginata/ShrineMaidenNaginataAugment": [
"Amanata"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/WhipCmbTwoMeleeTree": [
"Melee",
"Stance",
"Whip",
"Whips"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/WhipCmbOneMeleeTree": [
"Melee",
"Stance",
"Whip",
"Whips"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/WarfanCmbTwoMeleeTree": [
"Melee",
"Stance",
"Warfan",
"Warfans"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/WarfanCmbOneMeleeTree": [
"Melee",
"Stance",
"Warfan",
"Warfans"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/TonfaCmbTwoMeleeTree": [
"Melee",
"Stance",
"Tonfas"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/TonfaCmbOneMeleeTree": [
"Melee",
"Stance",
"Tonfa",
"Tonfas"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/SwordWhipCmbOneMeleeTree": [
"Blade And Whip",
"Blade and Whip",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/SwordShieldCmbOneMeleeTree": [
"Melee",
"Stance",
"Sword And Shield",
"Sword and Shield"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/SwordCmbTwoMeleeTree": [
"Melee",
"Stance",
"Swords"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/StalkerSwordMeleeTree": [
"Melee",
"Stance",
"Sword",
"Swords"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/StaffCmbTwoMeleeTree": [
"Melee",
"Staff",
"Stance",
"Staves"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/ScytheCmbTwoMeleeTree": [
"Melee",
"Scythe",
"Scythes",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/ScytheCmbOneMeleeTree": [
"Melee",
"Scythe",
"Scythes",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/SawBladeCmbOneMeleeTree": [
"Assault Saw",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/RegorSwordShieldMeleeTree": [
"Melee",
"Stance",
"Sword And Shield",
"Sword and Shield"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/RapierCmbOneMeleeTree": [
"Melee",
"Rapier",
"Rapiers",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/PunchKickCmbTwoMeleeTree": [
"Melee",
"Sparring",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/PunchKickCmbOneMeleeTree": [
"Melee",
"Sparring",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/PolearmCmbTwoMeleeTree": [
"Melee",
"Polearm",
"Polearms",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/PolearmCmbThreeMeleeTree": [
"Melee",
"Polearms",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/PolearmCmbOneMeleeTree": [
"Melee",
"Polearm",
"Polearms",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/NunchakuCmbOneMeleeTree": [
"Melee",
"Nunchaku",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/MacheteCmbTwoMeleeTree": [
"Machete",
"Machetes",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/MacheteCmbOneMeleeTree": [
"Machete",
"Machetes",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/LongKatanaCmbOneMeleeTree": [
"Melee",
"Stance",
"Two-Handed Nikana"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/KatanaCmbTwoMeleeTree": [
"Melee",
"Nikana",
"Nikanas",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/KatanaCmbThreeMeleeTree": [
"Melee",
"Nikana",
"Nikanas",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/KatanaCmbOneMeleeTree": [
"Melee",
"Nikana",
"Nikanas",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/IronPhoenixMeleeTree": [
"Melee",
"Stance",
"Sword",
"Swords"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/HeavyScytheCmbOneMeleeTree": [
"Heavy Scythe",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/HammerCmbTwoMeleeTree": [
"Hammer",
"Hammers",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/HammerCmbOneMeleeTree": [
"Hammer",
"Hammers",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/GunbladeCmbTwoMeleeTree": [
"Gunblade",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/GunbladeCmbOneMeleeTree": [
"Gunblade",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/GlaiveCmbTwoMeleeTree": [
"Glaive",
"Glaives",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/GlaiveCmbOneMeleeTree": [
"Glaive",
"Glaives",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/FistCmbTwoMeleeTree": [
"Fist",
"Fists",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/FistCmbThreeMeleeTree": [
"Fist",
"Fists",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/FistCmbOneMeleeTree": [
"Fist",
"Fists",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/DualSwordCmbTwoMeleeTree": [
"Dual Swords",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/DualSwordCmbThreeMeleeTree": [
"Dual Swords",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/DualSwordCmbOneMeleeTree": [
"Dual Swords",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/DualKatanaCmbOneMeleeTree": [
"Dual Nikanas",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/DualDaggerCmbTwoMeleeTree": [
"Dual Daggers",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/DualDaggerCmbThreeMeleeTree": [
"Dual Daggers",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/DualDaggerCmbOneMeleeTree": [
"Dual Daggers",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/DaggerCmbTwoMeleeTree": [
"Dagger",
"Daggers",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/DaggerCmbThreeMeleeTree": [
"Daggers",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/DaggerCmbOneMeleeTree": [
"Dagger",
"Daggers",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/CrimsonDervishMeleeTree": [
"Melee",
"Stance",
"Sword",
"Swords"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/ClawCmbTwoMeleeTree": [
"Claws",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/ClawCmbThreeMeleeTree": [
"Claws",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/ClawCmbOneMeleeTree": [
"Claws",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/BayonetCmbOneMeleeTree": [
"Bayonet",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/AxeCmbTwoMeleeTree": [
"Heavy Blade",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/AxeCmbThreeMeleeTree": [
"Heavy Blade",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/AxeCmbOneMeleeTree": [
"Heavy Blade",
"Melee",
"Stance"
],
"/Lotus/Weapons/Tenno/LongGuns/Gunbrella/ShrineMaidenGunbrellaAugment": [
"Higasa"
],
"/Lotus/Upgrades/Mods/Warframe/WarframeMightyKickMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/WarframeCatMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/ToxinParkourTwoMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/SuperGlideParkourTwoMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/SlashParkourTwoMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/PunctureParkourTwoMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/ParkourTwoMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/ImpactParkourTwoMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/IceParkourTwoMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/HealthPickupGivesArmourMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/FireParkourTwoMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/EnergyPickupGivesStrengthMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/ElectricalParkourTwoMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarTimeLimitIncreaseMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarSprintSpeedMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarSpawnEnergyMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarShieldRechargeRateMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarShieldMaxMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarRevengeDamageMelee": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarResistanceOnDamageMod": [
"Resistance",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarProcTimeMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarPowerMaxMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarPickupBonusMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarParryReflectMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarParryMeleeMod": [
"Exilus",
"Melee"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarMissionSpecificResistanceIce": [
"Exilus",
"Resistance",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarLootRadarMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarKnockdownResistanceMod": [
"Exilus",
"Resistance",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarKnockdownRecoveryMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarInvulnOnRollMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarHolsterDamageMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarHealthMaxMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarGroundFireDmgMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarFallingImpactMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarEnergyRegenMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarEnemyRadarMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarDamageToEnergyMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarDamageResistancePoison": [
"Resistance",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarDamageResistanceLaser": [
"Resistance",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarDamageResistanceKnockdown": [
"Resistance",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarDamageResistanceIce": [
"Resistance",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarDamageResistanceFire": [
"Resistance",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarDamageResistanceElectricity": [
"Resistance",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarDamageReductionInAir": [
"Exilus",
"Resistance",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarChanceToLoot": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarCastingSpeedMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarBleedoutDelayMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarAutoParryMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarArmourMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarAbilityStrengthMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarAbilityRangeMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarAbilityFourStrengthMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarAbilityEfficiencyMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarAbilityDurationMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/Kahl/KahlAvatarPowerMaxMod": [
"Archon",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/Kahl/KahlAvatarHealthMaxMod": [
"Archon",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/Kahl/KahlAvatarAbilityStrengthMod": [
"Archon",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/Kahl/KahlAvatarAbilityRangeMod": [
"Archon",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/Kahl/KahlAvatarAbilityDurationMod": [
"Archon",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/Expert/VigorModExpert": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/Expert/AvatarShieldMaxModExpert": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/Expert/AvatarPowerMaxModExpert": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/Expert/AvatarKnockdownResistanceModExpert": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/Expert/AvatarAbilityDurationModExpert": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/Events/AvatarStaggerRecoveryMod": [
"Exilus",
"Index",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/DualStat/VigorMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/DualStat/RunSpeedArmorMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/DualStat/HolsterSpeedSlideBoostMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/DualStat/FortitudeMod": [
"Resistance",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/DualStat/FixedShieldAndShieldGatingDuration": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/DualStat/CorruptedRangePowerWarframe": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/DualStat/CorruptedPowerStrengthPowerDurationWarframe": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/DualStat/CorruptedPowerEfficiencyWarframe": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/DualStat/CorruptedEfficiencyDurationWarframe": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/DualStat/CorruptedDurationRangeWarframe": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/DualStat/ConstitutionMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/TransmuteCores/TacticTransmuteCore": [
"Transmute"
],
"/Lotus/Upgrades/Mods/TransmuteCores/DefenseTransmuteCore": [
"Transmute"
],
"/Lotus/Upgrades/Mods/TransmuteCores/AttackTransmuteCore": [
"Transmute"
],
"/Lotus/Upgrades/Mods/Syndicate/VulkarMod": [
"Augment",
"Rifle",
"Vulkar"
],
"/Lotus/Upgrades/Mods/Syndicate/ViperMod": [
"Augment",
"Pistol",
"Viper"
],
"/Lotus/Upgrades/Mods/Syndicate/SupraMod": [
"Augment",
"Rifle",
"Supra"
],
"/Lotus/Upgrades/Mods/Syndicate/SpectraMod": [
"Augment",
"Pistol",
"Spectra"
],
"/Lotus/Upgrades/Mods/Syndicate/SobekMod": [
"Augment",
"Shotgun",
"Sobek"
],
"/Lotus/Upgrades/Mods/Syndicate/SkanaMod": [
"Augment",
"Melee",
"Skana"
],
"/Lotus/Upgrades/Mods/Syndicate/SilvaAegisMod": [
"Augment",
"Melee",
"Silva & Aegis"
],
"/Lotus/Upgrades/Mods/Syndicate/PantheraMod": [
"Augment",
"Panthera",
"Rifle"
],
"/Lotus/Upgrades/Mods/Syndicate/ObexMod": [
"Augment",
"Melee",
"Obex"
],
"/Lotus/Upgrades/Mods/Syndicate/MiterMod": [
"Augment",
"Miter",
"Rifle"
],
"/Lotus/Upgrades/Mods/Syndicate/MireMod": [
"Augment",
"Melee",
"Mire"
],
"/Lotus/Upgrades/Mods/Syndicate/MeleeRangeOnProcMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Syndicate/LankaMod": [
"Augment",
"Lanka",
"Rifle"
],
"/Lotus/Upgrades/Mods/Syndicate/KunaiMod": [
"Augment",
"Kunai",
"Pistol"
],
"/Lotus/Upgrades/Mods/Syndicate/KestrelMod": [
"Augment",
"Glaive Exclusive",
"Kestrel",
"Melee"
],
"/Lotus/Upgrades/Mods/Syndicate/JawSwordMod": [
"Augment",
"Jaw Sword",
"Melee"
],
"/Lotus/Upgrades/Mods/Syndicate/HekMod": [
"Augment",
"Hek",
"Shotgun"
],
"/Lotus/Upgrades/Mods/Syndicate/GrinlokMod": [
"Augment",
"Grinlok",
"Rifle"
],
"/Lotus/Upgrades/Mods/Syndicate/FurisMod": [
"Augment",
"Furis",
"Pistol"
],
"/Lotus/Upgrades/Mods/Syndicate/EmbolistMod": [
"Augment",
"Embolist",
"Pistol"
],
"/Lotus/Upgrades/Mods/Syndicate/DualCleaversMod": [
"Augment",
"Dual Cleavers",
"Melee"
],
"/Lotus/Upgrades/Mods/Syndicate/DarkDaggerMod": [
"Augment",
"Dark Dagger",
"Melee"
],
"/Lotus/Upgrades/Mods/Syndicate/BurstonPrimeMod": [
"Augment",
"Burston Prime",
"Rifle"
],
"/Lotus/Upgrades/Mods/Syndicate/BoltoMod": [
"Augment",
"Bolto",
"Pistol"
],
"/Lotus/Upgrades/Mods/Syndicate/AcridMod": [
"Acrid",
"Augment",
"Pistol"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponToxinDamageMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponStunChanceMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponStatusChanceSPMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponSlashDamageMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponShotgunFactionDamageMurmurs": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponShotgunFactionDamageInfested": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponShotgunFactionDamageGrineer": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponShotgunFactionDamageCorrupted": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponShotgunFactionDamageCorpus": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponShotgunConvertAmmoMod": [
"Exilus",
"Exilus Weapon",
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponReloadSpeedMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponRecoilReductionMod": [
"Exilus",
"Exilus Weapon",
"Rifle",
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponPunctureDepthMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponProjectileSpeedSPMod": [
"Exilus",
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponProjectileSpeedMod": [
"Exilus",
"Exilus Weapon",
"Flight Speed",
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponProcTimeMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponMagneticOnImpactShotgunMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponImpactDamageMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponFreezeDamageMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponFireRateMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponFireIterationsSPMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponFireIterationsMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponFireDamageMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponEventSlashDamageMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponEventShotgunImpactDamageMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponEventPunctureDamageMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponElectricityDamageMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponDamageAmountMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponCritDamageMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponCritChanceMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponClipMaxMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponArmorPiercingDamageMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/WeaponAmmoMaxMod": [
"Exilus",
"Exilus Weapon",
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/ShotgunStatusDamageDuoMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/ShotgunSemiAutoFantasyMod": [
"Cannonade",
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Expert/WeaponShotgunFactionDamageMurmursExpert": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Expert/WeaponShotgunFactionDamageInfestedExpert": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Expert/WeaponShotgunFactionDamageGrineerExpert": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Expert/WeaponShotgunFactionDamageCorruptedExpert": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Expert/WeaponShotgunFactionDamageCorpusExpert": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Expert/WeaponShotgunConvertAmmoModExpert": [
"Exilus Weapon",
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Expert/WeaponReloadSpeedModExpert": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Expert/WeaponRecoilReductionModExpert": [
"Exilus",
"Exilus Weapon",
"Rifle",
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Expert/WeaponFreezeDamageModExpert": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Expert/WeaponElectricityDamageModExpert": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Expert/WeaponDamageAmountModExpert": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Expert/WeaponCritDamageModExpert": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Expert/WeaponClipMaxModExpert": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Event/StatusProcWhileAimingShotgunMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Event/FireRateWhileAimingShotgunMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Event/CritDamageWhileAimingShotgunMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Event/CritChanceWhileAimingShotgunMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Event/AccuracyWhileAimingShotgunMod": [
"Exilus",
"Exilus Weapon",
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Event/ProjectNightwatch/WeaponNoiseReductionMod": [
"Exilus",
"Exilus Weapon",
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Event/ProjectNightwatch/SobekNightwatchMod": [
"Augment",
"Shotgun",
"Sobek"
],
"/Lotus/Upgrades/Mods/Shotgun/Event/ProjectNightwatch/DrakgoonNightwatchMod": [
"Augment",
"Drakgoon",
"Exilus",
"Exilus Weapon",
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/Event/Arbitration/CrpSplitLaserArbitrationMod": [
"Augment",
"Convectrix",
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/DualStat/ReloadSpeedPunchThroughMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/DualStat/RadiationClipShotgunMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/DualStat/PoisonEventShotgunMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/DualStat/MagneticFireRateShotgunMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/DualStat/IceEventShotgunMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/DualStat/FireEventShotgunMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/DualStat/ElectEventShotgunMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/DualStat/CorruptedMaxClipReloadSpeedShotgun": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/DualStat/CorruptedFireRateDamageShotgun": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/DualStat/CorruptedDamageAccuracyShotgun": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/DualStat/CorruptedCritChanceFireRateShotgun": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/DualStat/CorruptedAccuracyFireRateShotgun": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/DualStat/ColdDmgReloadSpeedMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/DualStat/BlazeMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Shotgun/DualStat/AcceleratedBlastMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/Sets/Vigilante/WarframeVigilanteVigorMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Vigilante/WarframeVigilantePursuitMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Vigilante/PrimaryVigilanteSuppliesMod": [
"Exilus",
"Exilus Weapon",
"Primary"
],
"/Lotus/Upgrades/Mods/Sets/Vigilante/PrimaryVigilanteOffenseMod": [
"Primary"
],
"/Lotus/Upgrades/Mods/Sets/Vigilante/PrimaryVigilanteFervorMod": [
"Primary"
],
"/Lotus/Upgrades/Mods/Sets/Vigilante/PrimaryVigilanteArmamentsMod": [
"Primary"
],
"/Lotus/Upgrades/Mods/Sets/Umbra/WarframeUmbraModC": [
"Resistance",
"Umbra",
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Umbra/WarframeUmbraModB": [
"Resistance",
"Umbra",
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Umbra/WarframeUmbraModA": [
"Resistance",
"Umbra",
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Tek/WarframeTekCollateralMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Tek/MeleeTekGravityMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Sets/Tek/KavatTekEnhanceMod": [
"Kavat"
],
"/Lotus/Upgrades/Mods/Sets/Tek/KavatTekAssaultMod": [
"Kavat"
],
"/Lotus/Upgrades/Mods/Sets/Synth/WarframeSynthReflexMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Synth/SentinelSynthFibersMod": [
"Companion"
],
"/Lotus/Upgrades/Mods/Sets/Synth/SentinelSynthDeconstructMod": [
"Companion"
],
"/Lotus/Upgrades/Mods/Sets/Synth/PistolSynthChargeMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Sets/Strain/WarframeStrainConsumeMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Strain/MeleeStrainInfectionMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Sets/Strain/HelminthStrainFeverMod": [
"Beast Claws",
"Helminth Charger",
"Helminth Claws"
],
"/Lotus/Upgrades/Mods/Sets/Strain/HelminthStrainEruptionMod": [
"Helminth Charger"
],
"/Lotus/Upgrades/Mods/Sets/Spider/SpiderModC": [
"Melee",
"Proton"
],
"/Lotus/Upgrades/Mods/Sets/Spider/SpiderModB": [
"Proton",
"Rifle"
],
"/Lotus/Upgrades/Mods/Sets/Spider/SpiderModA": [
"Exilus",
"Proton",
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Sacrifice/MeleeSacrificeModB": [
"Melee",
"Umbra"
],
"/Lotus/Upgrades/Mods/Sets/Sacrifice/MeleeSacrificeModA": [
"Melee"
],
"/Lotus/Upgrades/Mods/Sets/Raptor/RaptorModC": [
"Melee",
"Motus"
],
"/Lotus/Upgrades/Mods/Sets/Raptor/RaptorModB": [
"Motus",
"Shotgun"
],
"/Lotus/Upgrades/Mods/Sets/Raptor/RaptorModA": [
"Exilus",
"Motus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Nira/NiraWarframeMod": [
"Hatred",
"Nira",
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Nira/NiraMeleeMod": [
"Contempt",
"Melee",
"Nira",
"Whips"
],
"/Lotus/Upgrades/Mods/Sets/Nira/NiraExilusMod": [
"Anguish",
"Exilus",
"Nira",
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Mecha/WarframeMechaPulseMod": [
"Mecha",
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Mecha/WarframeAuraMechaEmpowerMod": [
"Aura",
"Auras",
"Mecha",
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Mecha/KubrowMechaRechargeMod": [
"Kubrow",
"Mecha"
],
"/Lotus/Upgrades/Mods/Sets/Mecha/KubrowMechaOverdriveMod": [
"Beast Claws",
"Kubrow",
"Kubrow Claws",
"Mecha"
],
"/Lotus/Upgrades/Mods/Sets/Hunter/WarframeHunterAdrenalineMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Hunter/PrimaryHunterTrackMod": [
"Primary"
],
"/Lotus/Upgrades/Mods/Sets/Hunter/PrimaryHunterMunitionsMod": [
"Primary"
],
"/Lotus/Upgrades/Mods/Sets/Hunter/CompanionHunterSynergyMod": [
"Beast",
"Beast Claws",
"Claws"
],
"/Lotus/Upgrades/Mods/Sets/Hunter/CompanionHunterRecoveryMod": [
"Beast",
"Kavat",
"Kubrow"
],
"/Lotus/Upgrades/Mods/Sets/Hunter/CompanionHunterCommandMod": [
"Beast",
"Kavat",
"Kubrow"
],
"/Lotus/Upgrades/Mods/Sets/Hawk/HawkModC": [
"Aero",
"Exilus",
"Exilus Weapon",
"Primary"
],
"/Lotus/Upgrades/Mods/Sets/Hawk/HawkModB": [
"Aero",
"Sniper"
],
"/Lotus/Upgrades/Mods/Sets/Hawk/HawkModA": [
"Aero",
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Gladiator/WarframeGladiatorResolveMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Gladiator/WarframeGladiatorFinesseMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Gladiator/WarframeGladiatorAegisMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Gladiator/MeleeGladiatorViceMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Sets/Gladiator/MeleeGladiatorRushMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Sets/Gladiator/MeleeGladiatorMightMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Sets/Femur/FemurThoraxMod": [
"Melee",
"Saxum"
],
"/Lotus/Upgrades/Mods/Sets/Femur/FemurSpittleMod": [
"Pistol",
"Saxum"
],
"/Lotus/Upgrades/Mods/Sets/Femur/FemurCarapaceMod": [
"Saxum",
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Boreal/BorealWarframeMod": [
"Boreal",
"Hatred",
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Boreal/BorealMeleeMod": [
"Boreal",
"Contempt",
"Melee",
"Polearms"
],
"/Lotus/Upgrades/Mods/Sets/Boreal/BorealExilusMod": [
"Anguish",
"Boreal",
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Boneblade/BonebladeSpinesMod": [
"Jugulus",
"Pistol"
],
"/Lotus/Upgrades/Mods/Sets/Boneblade/BonebladeCarapaceMod": [
"Jugulus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Boneblade/BonebladeBarbsMod": [
"Jugulus",
"Melee"
],
"/Lotus/Upgrades/Mods/Sets/Augur/WarframeAugurSecretsMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Augur/WarframeAugurReachMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Augur/WarframeAugurMessageMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Augur/WarframeAugurAccordMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Augur/SecondaryAugurSeekerMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Sets/Augur/SecondaryAugurPactMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Sets/Ashen/AshenStingerMod": [
"Carnis",
"Pistol"
],
"/Lotus/Upgrades/Mods/Sets/Ashen/AshenMandibleMod": [
"Carnis",
"Melee"
],
"/Lotus/Upgrades/Mods/Sets/Ashen/AshenCarapaceMod": [
"Carnis",
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Amar/AmarWarframeMod": [
"Amar",
"Hatred",
"Warframe"
],
"/Lotus/Upgrades/Mods/Sets/Amar/AmarMeleeMod": [
"Amar",
"Contempt",
"Dual Daggers",
"Melee"
],
"/Lotus/Upgrades/Mods/Sets/Amar/AmarExilusMod": [
"Amar",
"Anguish",
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Sentinel/SentinelShieldRechargeRateMod": [
"Companion",
"Sentinel"
],
"/Lotus/Upgrades/Mods/Sentinel/SentinelShieldMaxMod": [
"Companion"
],
"/Lotus/Upgrades/Mods/Sentinel/SentinelRepairKitMod": [
"Sentinel"
],
"/Lotus/Upgrades/Mods/Sentinel/SentinelOverheatDamageMod": [
"Sentinel"
],
"/Lotus/Upgrades/Mods/Sentinel/SentinelLootRadarEnemyRadarMod": [
"Companion"
],
"/Lotus/Upgrades/Mods/Sentinel/SentinelLootRadarEnemyRadarExpertMod": [
"Companion",
"Kavat",
"Kubrow",
"MOA",
"Sentinel"
],
"/Lotus/Upgrades/Mods/Sentinel/SentinelHealthMaxMod": [
"Companion"
],
"/Lotus/Upgrades/Mods/Sentinel/SentinelExplosionMod": [
"Sentinel"
],
"/Lotus/Upgrades/Mods/Sentinel/SentinelDropChanceMod": [
"Robotic",
"Sentinel"
],
"/Lotus/Upgrades/Mods/Sentinel/SentinelArmourMod": [
"Companion"
],
"/Lotus/Upgrades/Mods/Sentinel/Moa/MoaMeleeMod": [
"MOA",
"Penjaga"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/KubrowShieldRechargeRateMod": [
"Beast",
"Kavat",
"Kubrow"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/KubrowPackLeaderMod": [
"Companion",
"Kavat",
"Kubrow",
"MOA"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/KubrowMeleeDamageMod": [
"Beast",
"Beast Claws",
"Claws"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/KubrowMasterBleedoutMod": [
"Companion",
"Kavat",
"Kubrow",
"MOA"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/KubrowLinkShieldMaxMod": [
"Companion",
"Kavat",
"Kubrow",
"MOA"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/KubrowLinkHealthMaxMod": [
"Companion",
"Kavat",
"Kubrow",
"MOA"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/KubrowLinkArmourMaxMod": [
"Companion",
"Kavat",
"Kubrow",
"MOA"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/KubrowFinisherMod": [
"Kubrow",
"Penjaga",
"Sahasa Kubrow"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/KubrowCritMod": [
"Beast",
"Beast Claws",
"Claws"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/KubrowClonedFinisherMod": [
"Kubrow",
"Penjaga",
"Sunika Kubrow"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/Expert/KubrowPackLeaderExpertMod": [
"Companion",
"Kavat",
"Kubrow",
"MOA"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/DualStat/KubrowRadiationEventMeleeMod": [
"Beast",
"Beast Claws",
"Claws"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/DualStat/KubrowPoisonEventMeleeMod": [
"Beast",
"Beast Claws",
"Claws"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/DualStat/KubrowMagneticEventMeleeMod": [
"Beast",
"Beast Claws",
"Claws"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/DualStat/KubrowIceEventMeleeMod": [
"Beast",
"Beast Claws",
"Claws"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/DualStat/KubrowFireEventMeleeMod": [
"Beast",
"Beast Claws",
"Claws"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/DualStat/KubrowElectEventMeleeMod": [
"Beast",
"Beast Claws",
"Claws"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/BeastWeapon/KubrowToxicConversionMod": [
"Beast",
"Beast Claws",
"Claws"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/BeastWeapon/KubrowHeatConversionMod": [
"Beast",
"Beast Claws",
"Claws"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/BeastWeapon/KubrowElectricConversionMod": [
"Beast",
"Beast Claws",
"Claws"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/BeastWeapon/KubrowColdConversionMod": [
"Beast",
"Beast Claws",
"Claws"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/BeastWeapon/BeastWeakenedImmunityMod": [
"Beast",
"Beast Claws",
"Claws"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/BeastWeapon/BeastPrecisionConditioningMod": [
"Beast",
"Beast Claws",
"Claws",
"Conditioning"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/BeastWeapon/BeastMagneticImpactMod": [
"Beast",
"Beast Claws",
"Claws"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/BeastWeapon/BeastKnockdownWeaponMod": [
"Beast",
"Beast Claws",
"Claws"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/BeastWeapon/BeastDrainingBiteMod": [
"Beast",
"Beast Claws",
"Claws"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/BeastWeapon/BeastDisablingConditioningMod": [
"Beast",
"Beast Claws",
"Claws",
"Conditioning"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/BeastWeapon/BeastCullTheWeakMod": [
"Beast",
"Beast Claws",
"Claws"
],
"/Lotus/Upgrades/Mods/Sentinel/Kubrow/BeastWeapon/BeastBruteConditioningMod": [
"Beast",
"Beast Claws",
"Claws",
"Conditioning"
],
"/Lotus/Upgrades/Mods/Sentinel/Events/Index/CompanionMedipetKitMod": [
"Companion",
"Index",
"Kavat",
"Kubrow",
"MOA"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponZoomFovMod": [
"Exilus",
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponWeakpointCriticalChanceMod": [
"Acuity",
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponToxinDamageMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponStunChanceMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponStatusChanceSPMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponSpreadFreezeProcsMod": [
"Primary"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponSnipersConvertAmmoMod": [
"Exilus",
"Exilus Weapon",
"Sniper"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponSlashDamageMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponRifleConvertAmmoMod": [
"Assault Rifle",
"Exilus",
"Exilus Weapon"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponResistSelfDamageMod": [
"Exilus",
"Exilus Weapon",
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponReloadSpeedMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponRecoilReductionMod": [
"Exilus",
"Exilus Weapon",
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponPunctureDepthMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponProjectileSpeedMod": [
"Exilus",
"Exilus Weapon",
"Flight Speed",
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponProcTimeMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponNoiseReductionMod": [
"Exilus",
"Exilus Weapon",
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponIncreaseRadialExplosionMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponImpactDamageMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponGrenadeStickyMod": [
"Exilus",
"Exilus Weapon",
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponFreezeDamageMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponFireRateMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponFireIterationsSPMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponFireIterationsMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponFireDamageMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponFactionDamageMurmurs": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponFactionDamageInfested": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponFactionDamageGrineer": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponFactionDamageCorrupted": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponFactionDamageCorpus": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponEventSlashDamageMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponEventRifleImpactDamageMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponEventPunctureDamageMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponElectricityDamageMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponDamageAmountMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponDamageAmountInvisibleMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponCritDamageMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponCritChanceMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponClipMaxMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponBowConvertAmmoMod": [
"Bow",
"Exilus",
"Exilus Weapon"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponBleedOnImpactProcRifleMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponBeamExplodeOnDeath": [
"Primary"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponBeamDistanceMod": [
"Exilus",
"Primary"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponArmorPiercingDamageMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/WeaponAmmoMaxMod": [
"Exilus",
"Exilus Weapon",
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/SniperReloadDamageMod": [
"Sniper"
],
"/Lotus/Upgrades/Mods/Rifle/SniperHeadshotMultiplierMod": [
"Sniper"
],
"/Lotus/Upgrades/Mods/Rifle/RifleStatusDamageDuoMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/RifleSemiAutoFantasyMod": [
"Cannonade",
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/GrenadeLauncherProjectileMod": [
"Augment",
"Penta",
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/EventSniperReloadDamageMod": [
"Sniper"
],
"/Lotus/Upgrades/Mods/Rifle/EnergyOnHeadshotRifle": [
"Sniper"
],
"/Lotus/Upgrades/Mods/Rifle/BowMultiShotOnHitMod": [
"Bow"
],
"/Lotus/Upgrades/Mods/Rifle/BowExplosionChanceMod": [
"Bow"
],
"/Lotus/Upgrades/Mods/Rifle/Expert/WeaponSnipersConvertAmmoModExpert": [
"Exilus",
"Sniper"
],
"/Lotus/Upgrades/Mods/Rifle/Expert/WeaponRifleConvertAmmoModExpert": [
"Assault Rifle",
"Exilus Weapon"
],
"/Lotus/Upgrades/Mods/Rifle/Expert/WeaponReloadSpeedModExpert": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Expert/WeaponRecoilReductionModExpert": [
"Exilus",
"Exilus Weapon",
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Expert/WeaponIncreaseRadialExplosionModExpert": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Expert/WeaponFreezeDamageModExpert": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Expert/WeaponClipMaxModExpert": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Expert/PrimedWeaponFactionDamageMurmurs": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Expert/PrimedWeaponFactionDamageInfested": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Expert/PrimedWeaponFactionDamageGrineer": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Expert/PrimedWeaponFactionDamageCorrupted": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Expert/PrimedWeaponFactionDamageCorpus": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Event/StatusProcWhileAimingRifleMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Event/SomaCritChanceOnHitMod": [
"Soma Prime"
],
"/Lotus/Upgrades/Mods/Rifle/Event/ParisHealOnStatusMod": [
"Exilus",
"Exilus Weapon",
"Paris Prime"
],
"/Lotus/Upgrades/Mods/Rifle/Event/FireRateWhileAimingRifleMod": [
"Assault Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Event/CritDamageWhileAimingRifleMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Event/CritChanceWhileAimingRifleSPMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Event/CritChanceWhileAimingRifleMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Event/AccuracyWhileAimingRifleMod": [
"Assault Rifle",
"Exilus",
"Exilus Weapon"
],
"/Lotus/Upgrades/Mods/Rifle/Event/ProjectNightwatch/VulkarNightwatchMod": [
"Sniper"
],
"/Lotus/Upgrades/Mods/Rifle/Event/ProjectNightwatch/OgrisNightwatchMod": [
"Augment",
"Ogris",
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Event/Nightwave/NightwaveZylokAugmentMod": [
"Zylok"
],
"/Lotus/Upgrades/Mods/Rifle/Event/Nightwave/NightwaveTigrisAugmentMod": [
"Tigris"
],
"/Lotus/Upgrades/Mods/Rifle/Event/Nightwave/NightwaveTiberonAugmentMod": [
"Tiberon"
],
"/Lotus/Upgrades/Mods/Rifle/Event/Nightwave/NightwaveSporothrixAugmentMod": [
"Sporothrix"
],
"/Lotus/Upgrades/Mods/Rifle/Event/Nightwave/NightwaveHemaAugmentMod": [
"Hema"
],
"/Lotus/Upgrades/Mods/Rifle/Event/Nightwave/NightwaveGorgonAugmentMod": [
"Gorgon"
],
"/Lotus/Upgrades/Mods/Rifle/Event/Nightwave/NightwaveEmbolistAugmentMod": [
"Embolist"
],
"/Lotus/Upgrades/Mods/Rifle/Event/Nightwave/NightwaveBattacorAugmentMod": [
"Battacor"
],
"/Lotus/Upgrades/Mods/Rifle/Event/Nightwave/NightwaveBasmuAugmentMod": [
"Basmu"
],
"/Lotus/Upgrades/Mods/Rifle/Event/Nightwave/NightwaveAkjagaraAugmentMod": [
"Akjagara"
],
"/Lotus/Upgrades/Mods/Rifle/Event/CorpusArena/TetraCorpusArenaMod": [
"Augment",
"Exilus",
"Exilus Weapon",
"Index",
"Rifle",
"Tetra"
],
"/Lotus/Upgrades/Mods/Rifle/Event/CorpusArena/SupraCorpusArenaMod": [
"Augment",
"Detron",
"Index",
"Pistol"
],
"/Lotus/Upgrades/Mods/Rifle/Event/CorpusArena/PentaCorpusArenaMod": [
"Augment",
"Exilus",
"Exilus Weapon",
"Index",
"Penta",
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Event/CorpusArena/FluxRifleCorpusArenaMod": [
"Augment",
"Flux Rifle",
"Index",
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Event/Arbitration/ShootPickUpRifleMod": [
"Exilus",
"Exilus Weapon"
],
"/Lotus/Upgrades/Mods/Rifle/Event/Arbitration/JumpRefreshOnKillRifleMod": [
"Exilus",
"Exilus Weapon",
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Event/Arbitration/InfCrpShockSwarmRifleArbitrationMod": [
"Augment",
"Mutalist Quanta",
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Event/Arbitration/GrnSniperRifleArbitrationMod": [
"Augment",
"Sniper",
"Vulkar"
],
"/Lotus/Upgrades/Mods/Rifle/Event/Arbitration/GrnHarpoonGunArbitrationMod": [
"Augment",
"Harpak",
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/Event/Arbitration/GrnGrenadeLauncherArbitrationMod": [
"Tonkor"
],
"/Lotus/Upgrades/Mods/Rifle/Event/Arbitration/GrnAssaultRifleArbitrationMod": [
"Augment",
"Grakata",
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/DualStat/WildfireMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/DualStat/ShredMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/DualStat/RadiationReloadRifleMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/DualStat/PrimedShredMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/DualStat/PoisonEventRifleMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/DualStat/MagneticClipRifleMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/DualStat/IceEventRifleMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/DualStat/HammerShotMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/DualStat/FireEventRifleMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/DualStat/ElectEventRifleMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/DualStat/CorruptedReloadSpeedMaxClipRifle": [
"Sniper"
],
"/Lotus/Upgrades/Mods/Rifle/DualStat/CorruptedRecoilFireRateRifle": [
"Exilus",
"Exilus Weapon",
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/DualStat/CorruptedMaxClipReloadSpeedRifle": [
"Assault Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/DualStat/CorruptedFireRateDamageRifle": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/DualStat/CorruptedDamageRecoilRifle": [
"Rifle"
],
"/Lotus/Upgrades/Mods/Rifle/DualStat/CorruptedCritRateFireRateRifle": [
"Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/StaggerImmunityMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/ReduceShieldRechargeDelayWarframe": [
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/RagdollImmunityMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/PoisonParkourPvPMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/MoreShieldLessBulletJumpMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/MoreHealthLessBulletJumpMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/MoreEnergyLessHealthMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/MoreBulletJumpLessShieldMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/MoreBulletJumpLessHealthMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/MoreBulletJumpLessEnergy": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/IncreasedMobilityOnLowHealth": [
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/IncreasedEfficiencyOnLowHealth": [
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/HealthRegenLongerShieldRecharge": [
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/FreezeParkourPvPMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/FireParkourPvPMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/FasterSprintLessShield": [
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/FasterCastingHigherEnergyCostMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/EnergyToOvershieldsOnSpawnMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/EnergyOnKill": [
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/EnergyOnFullShieldRegenMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/ElectricityParkourPvPMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/EffectOnFullEnergyMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/DamageResistanceLessSlide": [
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/DamageResistanceLessMobility": [
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/BlastResist": [
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Warframe/AirSlideBoost": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPWhipStanceOne": [
"Melee",
"Stance",
"Whip",
"Whips"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPTonfaStanceOne": [
"Melee",
"Stance",
"Tonfa",
"Tonfas"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPSwordWhipStanceOne": [
"Blade And Whip",
"Blade and Whip",
"Melee",
"Stance"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPSwordStanceOne": [
"Melee",
"Stance",
"Sword",
"Swords"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPSwordShieldStanceOne": [
"Melee",
"Stance",
"Sword And Shield",
"Sword and Shield"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPStavesStanceOne": [
"Melee",
"Staff",
"Stance",
"Staves"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPScytheStanceOne": [
"Melee",
"Scythe",
"Scythes",
"Stance"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPRapierStanceOne": [
"Melee",
"Rapier",
"Rapiers",
"Stance"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPPunchKickStanceOne": [
"Melee",
"Sparring",
"Stance"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPPolearmStanceOne": [
"Melee",
"Polearm",
"Polearms",
"Stance"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPNunchakuStanceOne": [
"Melee",
"Nunchaku",
"Stance"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPMacheteStanceOne": [
"Machete",
"Machetes",
"Melee",
"Stance"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPKatanaStanceOne": [
"Melee",
"Nikana",
"Nikanas",
"Stance"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPHeavyBladeStanceOne": [
"Heavy Blade",
"Melee",
"Stance"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPHammerStanceOne": [
"Hammer",
"Hammers",
"Melee",
"Stance"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPGlaiveStanceOne": [
"Glaive",
"Glaives",
"Melee",
"Stance"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPFistStanceOne": [
"Fist",
"Fists",
"Melee",
"Stance"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPDualSwordStanceOne": [
"Dual Swords",
"Melee",
"Stance"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPDualDaggersStanceOne": [
"Dual Daggers",
"Melee",
"Stance"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPDaggerStanceOne": [
"Dagger",
"Daggers",
"Melee",
"Stance"
],
"/Lotus/Upgrades/Mods/PvPMods/Stances/PvPClawStanceOne": [
"Claws",
"Melee",
"Stance"
],
"/Lotus/Upgrades/Mods/PvPMods/Shotgun/RestoreShieldsOnKillMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/PvPMods/Shotgun/RestoreHealthOnKillMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/PvPMods/Shotgun/PassiveReloadMod": [
"Exilus",
"Exilus Weapon",
"Shotgun"
],
"/Lotus/Upgrades/Mods/PvPMods/Shotgun/MoreAccuracyLessRecoilSlidingShotgunMod": [
"Exilus",
"Exilus Weapon",
"Shotgun"
],
"/Lotus/Upgrades/Mods/PvPMods/Shotgun/MarkTargetShotgunMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/PvPMods/Shotgun/LessRecoilSmallerMagShotgunMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/PvPMods/Shotgun/LargerMagLongerReloadShotgunMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/PvPMods/Shotgun/HolsterSpeedBonusMod": [
"Exilus",
"Exilus Weapon",
"Shotgun"
],
"/Lotus/Upgrades/Mods/PvPMods/Shotgun/HigherAirAimFoVShotgunMod": [
"Exilus",
"Exilus Weapon",
"Shotgun"
],
"/Lotus/Upgrades/Mods/PvPMods/Shotgun/FasterReloadOnKillShotgunMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/PvPMods/Shotgun/FasterReloadMoreRecoilShotgunMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/PvPMods/Shotgun/FasterMovementWhileAimingShotgunlMod": [
"Exilus",
"Exilus Weapon",
"Shotgun"
],
"/Lotus/Upgrades/Mods/PvPMods/Shotgun/DamageBiasSlashShotgunMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/PvPMods/Shotgun/DamageBiasPunctureShotgunMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/PvPMods/Shotgun/DamageBiasImpactShotgunMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/TonkorAccuracySmallerMag": [
"Rifle",
"Tonkor"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/TiberonLowRoFAiming": [
"Rifle",
"Tiberon"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/TetraFasterProjAiming": [
"Exilus",
"Exilus Weapon",
"Flight Speed",
"Rifle",
"Tetra"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/SybarisIncreaseRoFonHit": [
"Rifle",
"Sybaris"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/SupraHigherAccuracyAiming": [
"Exilus",
"Exilus Weapon",
"Rifle",
"Supra"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/RubicoLowZoom": [
"Exilus",
"Exilus Weapon",
"Rubico",
"Sniper"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/RestoreShieldsOnKillMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/RestoreHealthOnKillMod": [
"Assault Rifle",
"Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/PassiveReloadMod": [
"Assault Rifle",
"Exilus",
"Exilus Weapon"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/MoreDamageonTripleTapRifleMod": [
"Latron",
"Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/MoreDamageonMultiHitRifleMod": [
"Burston",
"Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/MoreAccuracyOnHitGrinlokMod": [
"Grinlok",
"Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/MoreAccuracyLessRecoilSlidingMod": [
"Assault Rifle",
"Exilus",
"Exilus Weapon"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/MarkTargetRifleMod": [
"Exilus",
"Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/LessRecoilSmallerMagRifleMod": [
"Assault Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/LargerMagLongerReloadRifleMod": [
"Assault Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/HolsterSpeedBonusMod": [
"Exilus",
"Exilus Weapon",
"Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/HindDamageonFifthHit": [
"Hind",
"Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/HigherVelocityLessDamageBowMod": [
"Bow"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/HigherVelocityLessAccurateRifleMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/HigherAirAimFoVRifleMod": [
"Assault Rifle",
"Exilus",
"Exilus Weapon"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/HigherAimedDamageMoreRecoilSniperMod": [
"Sniper"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/GrakataUnlimitedAmmo": [
"Grakata",
"Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/FasterRoFonKillGorgonMod": [
"Gorgon",
"Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/FasterReloadOnKillSniperMod": [
"Sniper"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/FasterReloadMoreRecoilRifleMod": [
"Assault Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/FasterPistolRoFOnHitBowMod": [
"Bow"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/FasterMovementWhileAimingRifleMod": [
"Exilus",
"Exilus Weapon",
"Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/FasterChargeInAirBowMod": [
"Bow"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/FasterBulletJumponHeadshotRifleMod": [
"Assault Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/ExplodingMiterBlades": [
"Miter",
"Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/DamageBiasSlashRifleMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/DamageBiasPunctureRifleMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/DamageBiasImpactRifleMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/PvPMods/Rifle/DaikyuMoreDamageOverDistanceMod": [
"Augment",
"Bow",
"Daikyu"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/ViperUnlimitedAmmo": [
"Pistol",
"Viper"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/StaticorFasterProjLessAoE": [
"Pistol",
"Staticor"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/RestoreShieldsOnKillMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/RestoreHealthOnKillMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/PassiveReloadMod": [
"Exilus",
"Exilus Weapon",
"Pistol"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/MoreAccuracyLessRecoilSlidingPistolMod": [
"Exilus",
"Exilus Weapon",
"Pistol"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/MarkTargetPistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/MarelokMultishot": [
"Marelok",
"Pistol"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/LessRecoilSmallerMagPistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/LargerMagLongerReloadPistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/HolsterSpeedBonusMod": [
"Exilus",
"Exilus Weapon",
"Pistol"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/HigherVelocityLessAccuratePistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/HigherAirAimFoVPistolMod": [
"Exilus",
"Exilus Weapon",
"Pistol"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/HealthRegenonKillPistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/FasterReloadMoreRecoilPistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/FasterMovementWhileAimingPistolMod": [
"Exilus",
"Exilus Weapon",
"Pistol"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/DespairEnergyDrainAoE": [
"Despair",
"Pistol"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/DamageBiasSlashPistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/DamageBiasPuncturePistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/DamageBiasImpactPistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/PvPMods/Pistol/BiggerRadiusSlowerVelocityPistolMod": [
"Flight Speed",
"Pistol"
],
"/Lotus/Upgrades/Mods/PvPMods/Melee/MeleeVictimStaminaDrain": [
"Melee"
],
"/Lotus/Upgrades/Mods/PvPMods/Melee/MeleeAutoTargetBonus": [
"Melee"
],
"/Lotus/Upgrades/Mods/PvPMods/Melee/IncreasedMobilityEquipped": [
"Melee"
],
"/Lotus/Upgrades/Mods/PvPMods/Melee/ExplodeOnMeleeDeath": [
"Melee"
],
"/Lotus/Upgrades/Mods/PvPMods/Melee/DamageBiasSlashMeleeMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/PvPMods/Melee/DamageBiasPunctureMeleeMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/PvPMods/Melee/DamageBiasImpactMeleeMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/PvPMods/Melee/DaggerMeleeAutoTargetBonus": [
"Daggers",
"Melee"
],
"/Lotus/Upgrades/Mods/PvPMods/Melee/ChannelingEfficiencyOnLowHealth": [
"Melee"
],
"/Lotus/Upgrades/Mods/PvPMods/Melee/BlockMoreAttackSlowerMeleeMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/PvPMods/Melee/AbilityDamageBlockMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponWeakpointCriticalChanceMod": [
"Acuity",
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponToxinDamageMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponStunChanceMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponStatusChanceSPMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponSlashDamageMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponReloadSpeedMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponRecoilReductionMod": [
"Exilus",
"Exilus Weapon",
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponPunctureDepthMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponProjectileSpeedMod": [
"Exilus",
"Exilus Weapon",
"Flight Speed",
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponProcTimeMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponPistolZoomFovMod": [
"Exilus",
"Exilus Weapon",
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponPistolFactionDamageMurmurs": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponPistolFactionDamageInfested": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponPistolFactionDamageGrineer": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponPistolFactionDamageCorrupted": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponPistolFactionDamageCorpus": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponPistolConvertAmmoMod": [
"Exilus",
"Exilus Weapon",
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponNoiseReductionMod": [
"Exilus",
"Exilus Weapon",
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponImpactDamageMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponFreezeDamageMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponFireRateMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponFireIterationsSPMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponFireIterationsMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponFireDamageMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponEventSlashDamageMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponEventPunctureDamageMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponEventPistolImpactDamageMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponElectricityDamageMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponDamageAmountMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponCritDamageMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponCritChanceMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponClipMaxMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponBleedOnImpactPistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponBeamDistanceMod": [
"Exilus",
"Exilus Weapon",
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponArmorPiercingDamageMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/WeaponAmmoMaxMod": [
"Exilus",
"Exilus Weapon",
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/ThrowingExplosionChanceMod": [
"Pistol",
"Thrown"
],
"/Lotus/Upgrades/Mods/Pistol/PistolStatusDamageDuoMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/PistolSemiAutoFantasyMod": [
"Cannonade",
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Expert/WeaponReloadSpeedModExpert": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Expert/WeaponRecoilReductionModExpert": [
"Exilus",
"Exilus Weapon",
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Expert/WeaponPistolFactionDamageMurmursExpert": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Expert/WeaponPistolFactionDamageInfestedExpert": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Expert/WeaponPistolFactionDamageGrineerExpert": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Expert/WeaponPistolFactionDamageCorruptedExpert": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Expert/WeaponPistolFactionDamageCorpusExpert": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Expert/WeaponPistolConvertAmmoModExpert": [
"Exilus",
"Exilus Weapon",
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Expert/WeaponFireDamageModExpert": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Expert/WeaponCritChanceModBeginnerExpert": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Expert/WeaponClipMaxModExpert": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Expert/PrimedWeaponElectricityDamageMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Expert/PrimedWeaponCritDamageMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Event/StatusProcWhileAimingPistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Event/ShootPickUpPistolMod": [
"Exilus",
"Exilus Weapon",
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Event/FireRateWhileAimingPistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Event/CritDamageWhileAimingPistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Event/CritChanceWhileAimingPistolSPMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Event/CritChanceWhileAimingPistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Event/AkstilettoEfficiencyWhileAirborneMod": [
"Akstiletto Prime"
],
"/Lotus/Upgrades/Mods/Pistol/Event/AkbroncoViralDamageMod": [
"Akbronco Prime"
],
"/Lotus/Upgrades/Mods/Pistol/Event/AccuracyWhileAimingPistolMod": [
"Exilus",
"Exilus Weapon",
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Event/Nightwave/NightwaveVeloxAugmentMod": [
"Velox"
],
"/Lotus/Upgrades/Mods/Pistol/Event/Nightwave/NightwaveOcucorAugmentMod": [
"Ocucor"
],
"/Lotus/Upgrades/Mods/Pistol/Event/Nightwave/NightwaveCatabolystAugmentMod": [
"Catabolyst"
],
"/Lotus/Upgrades/Mods/Pistol/Event/AmbulasEvent/SecondaryExplosionRadiusMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/Event/AmbulasEvent/Expert/SecondaryExplosionRadiusModExpert": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/DualStat/StunningSpeedMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/DualStat/RadiationFireratePistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/DualStat/PoisonEventPistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/DualStat/MagneticCritDamagePistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/DualStat/IceStormMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/DualStat/IceEventPistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/DualStat/GrinderMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/DualStat/FireEventPistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/DualStat/ElectEventPistolMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/DualStat/CriticalDamagePunchThroughMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/DualStat/CorruptedMaxClipReloadSpeedPistol": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/DualStat/CorruptedFireRateDamagePistol": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/DualStat/CorruptedDamageRecoilPistol": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/DualStat/CorruptedCritDamagePistol": [
"Pistol"
],
"/Lotus/Upgrades/Mods/Pistol/DualStat/CorruptedCritChanceFireRatePistol": [
"Pistol"
],
"/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModStealth": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModSpeed": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModPower": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModEndurance": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModCunning": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModCollaboration": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModAgility": [
"Exilus",
"Resistance",
"Warframe"
],
"/Lotus/Upgrades/Mods/Nightwave/SobekNightwaveMod": [
"Augment",
"Shotgun",
"Sobek"
],
"/Lotus/Upgrades/Mods/Nightwave/NightwaveTnJetTurbinePistolAugmentMod": [
"Athodai"
],
"/Lotus/Upgrades/Mods/Nightwave/NightwaveTC2024AK47AugmentMod": [
"AX-52"
],
"/Lotus/Upgrades/Mods/Nightwave/NightwaveLasSilencedPistolAugmentMod": [
"Vesper 77"
],
"/Lotus/Upgrades/Mods/Nightwave/NightwaveCephPrimaryAugmentMod": [
"Simulor"
],
"/Lotus/Upgrades/Mods/Nightwave/MagnusNightwaveMod": [
"Magnus"
],
"/Lotus/Upgrades/Mods/Nightwave/GlaxionNightwaveMod": [
"Augment",
"Glaxion",
"Rifle"
],
"/Lotus/Upgrades/Mods/Nightwave/BroncoNightwaveMod": [
"Bronco"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechSlideSpeedMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechSlideEfficiencyMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechSlideDamageMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechSlamDamageMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechShieldMaxMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechRegenOnLowHealthMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechReflectOnShieldBreakMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechPowerMaxMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechMeleeSpeedMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechMeleeRangeMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechMeleeDamageMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechJumpHeightMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechHoverEfficiencyMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechHealthMaxMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechEnergyToOvershieldsMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechBoostRechargeMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechBoostMaxMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechBoostEfficiencyMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechAvatarShieldRechargeRateMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechAvatarEnemyRadarMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechAvatarDamageToEnergyMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechAvatarDamageReductionInAir": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechArmourMaxMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechAbilityStrengthMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechAbilityRangeMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechAbilityEfficiencyMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Necromech/NecromechAbilityDurationMod": [
"Necramech"
],
"/Lotus/Upgrades/Mods/Melee/WeaponToxinDamageMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponStunChanceMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponSlashDamageMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponProcTimeMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponPowerDamageMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponMeleeStealthLethalMod": [
"Dagger",
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponMeleeSlamDamageMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponMeleeRangeIncMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponMeleeHeavyDamageMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponMeleeFinisherDamageMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponMeleeFactionDamageMurmurs": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponMeleeFactionDamageInfested": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponMeleeFactionDamageGrineer": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponMeleeFactionDamageCorrupted": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponMeleeFactionDamageCorpus": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponMeleeDamageMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponMeleeComboChanceFromDot": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponMeleeChargeRateMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponMeleeArmorShatterMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponImpactDamageMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponHealOnHitEnemyWithProc": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponGlaiveSpeedMod": [
"Exilus",
"Glaive Exclusive",
"Melee",
"Thrown Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponGlaiveSecondaryHeadshotKillMod": [
"Glaive Exclusive",
"Melee",
"Thrown Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponGlaiveReflectionIncreaseMod": [
"Glaive Exclusive",
"Melee",
"Thrown Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponGlaiveReflectionDecreaseMod": [
"Glaive Exclusive",
"Melee",
"Thrown Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponGlaivePowerthrowMod": [
"Glaive Exclusive",
"Melee",
"Thrown Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponGlaiveOnSixKillsBuffSecondary": [
"Glaive Exclusive",
"Melee",
"Thrown Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponGlaiveOnKillBuffSecondary": [
"Glaive Exclusive",
"Melee",
"Thrown Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponGlaiveExplodingReflectionIncreaseMod": [
"Glaive Exclusive",
"Melee",
"Thrown Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponGlaiveExplodingReflectionDecreaseMod": [
"Glaive Exclusive",
"Melee",
"Thrown Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponFreezeDamageMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponFireRateMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponFireDamageMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponEventSlashDamageMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponEventPunctureDamageMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponEventMeleeImpactDamageMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponElectricityDamageMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponDamageIfVictimProcActive": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponCritFireRateBonusMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponCritDamageMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponCritChanceMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponBlockingTauntMod": [
"Exilus",
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/WeaponArmorPiercingDamageMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/MoveSpeedOnChannelKillMod": [
"Exilus",
"Exilus Weapon",
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/MeleeStatusDamageDuoMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Expert/WeaponToxinDamageModExpert": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Expert/WeaponMeleeStatusChanceSPMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Expert/WeaponMeleeRangeIncModExpert": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Expert/WeaponMeleeFactionDamageMurmursExpert": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Expert/WeaponMeleeFactionDamageInfestedExpert": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Expert/WeaponMeleeFactionDamageGrineerExpert": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Expert/WeaponMeleeFactionDamageCorruptedExpert": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Expert/WeaponMeleeFactionDamageCorpusExpert": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Expert/WeaponMeleeDamageModExpert": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Expert/WeaponImpactDamageModExpert": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Expert/WeaponHeavyAttackEfficiencySPMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Expert/WeaponFireRateModExpert": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Expert/WeaponCritChanceSPMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Event/SlideAttackCritChanceMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Event/ComboStatusChanceMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Event/ComboDurationMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Event/ComboCritChanceMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Event/ProjectNightwatch/TwinBasolkNightwatchMod": [
"Augment",
"Melee",
"Twin Basolk"
],
"/Lotus/Upgrades/Mods/Melee/Event/ProjectNightwatch/RipkasNightwatchMod": [
"Augment",
"Melee",
"Ripkas"
],
"/Lotus/Upgrades/Mods/Melee/Event/ProjectNightwatch/JatKittagNightwatchMod": [
"Augment",
"Jat Kittag",
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Event/ProjectNightwatch/AckBruntNightwatchMod": [
"Ack & Brunt",
"Augment",
"Exilus",
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Event/Nightwave/NightwaveVenatoAugmentMod": [
"Venato"
],
"/Lotus/Upgrades/Mods/Melee/Event/Nightwave/NightwaveStalkerScytheAugmentMod": [
"Hate"
],
"/Lotus/Upgrades/Mods/Melee/Event/CorpusArena/ProvaCorpusArenaMod": [
"Augment",
"Index",
"Melee",
"Prova"
],
"/Lotus/Upgrades/Mods/Melee/DualStat/RendingStrikeMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/DualStat/RadiationEfficiencyMeleeMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/DualStat/PoisonEventMeleeMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/DualStat/MagneticAttackSpeedMeleeMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/DualStat/IceEventMeleeMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/DualStat/FocusEnergyMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/DualStat/FireEventMeleeMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/DualStat/ElectEventMeleeMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/DualStat/CorruptedHeavyDamageChargeSpeedMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/DualStat/CorruptedDamageSpeedMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/DualStat/ComboTimeStatusChanceMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Channel/ChannelVampireMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Channel/ChannelStatusMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Channel/ChannelProcTimeExtendOnHitMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Channel/ChannelFireRateMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Channel/ChannelCritsMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/Melee/Channel/ChannelArmourMod": [
"Exilus",
"Melee"
],
"/Lotus/Upgrades/Mods/Immortal/ImmortalWildcardMod": [
"Parazon",
"Requiem"
],
"/Lotus/Upgrades/Mods/Immortal/ImmortalTwoMod": [
"Parazon",
"Requiem"
],
"/Lotus/Upgrades/Mods/Immortal/ImmortalThreeMod": [
"Parazon",
"Requiem"
],
"/Lotus/Upgrades/Mods/Immortal/ImmortalSixMod": [
"Parazon",
"Requiem"
],
"/Lotus/Upgrades/Mods/Immortal/ImmortalSevenMod": [
"Parazon",
"Requiem"
],
"/Lotus/Upgrades/Mods/Immortal/ImmortalOneMod": [
"Parazon",
"Requiem"
],
"/Lotus/Upgrades/Mods/Immortal/ImmortalFourMod": [
"Parazon",
"Requiem"
],
"/Lotus/Upgrades/Mods/Immortal/ImmortalFiveMod": [
"Parazon",
"Requiem"
],
"/Lotus/Upgrades/Mods/Immortal/ImmortalEightMod": [
"Parazon",
"Requiem"
],
"/Lotus/Upgrades/Mods/Immortal/AntivirusTwoMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/Immortal/AntivirusThreeMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/Immortal/AntivirusSixMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/Immortal/AntivirusSevenMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/Immortal/AntivirusOneMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/Immortal/AntivirusFourMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/Immortal/AntivirusFiveMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/Immortal/AntivirusEightMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBTrickExplosionMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBSprintSpeedMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBSpeedMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBSonicBoomMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBSlayBoardMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBPointsMultiplierMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBJumpHeightMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBJumpChargeTimeMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBGrindStaticMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBGrindSpeedMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBGrindSlamMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBGrindMagnetismMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBFallVelocityMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBFallChanceReductionMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBEscapePlanMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBEnergyTricksMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBEnergyInjectionMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBEliteTricksterMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBElementTrailMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBDoubleJumpHeightMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBColdLeakMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/Hoverboard/HBAirGravMod": [
"K-Drive"
],
"/Lotus/Upgrades/Mods/DualSource/Shotgun/ShotgunMedicMod": [
"Shotgun"
],
"/Lotus/Upgrades/Mods/DualSource/Rifle/SerratedRushMod": [
"Rifle"
],
"/Lotus/Upgrades/Mods/DualSource/Rifle/JavlokSwordShieldMod": [
"Augment",
"Javlok",
"Rifle"
],
"/Lotus/Upgrades/Mods/DualSource/Rifle/DaikyuKatanaMod": [
"Augment",
"Bow",
"Daikyu"
],
"/Lotus/Upgrades/Mods/DualSource/Rifle/ArgonakDaggerMod": [
"Argonak",
"Augment",
"Rifle"
],
"/Lotus/Upgrades/Mods/DualSource/Pistol/MultishotDodgeMod": [
"Pistol"
],
"/Lotus/Upgrades/Mods/DualSource/Melee/RipkasShotgunMod": [
"Augment",
"Melee",
"Ripkas"
],
"/Lotus/Upgrades/Mods/DualSource/Melee/FuraxLauncherMod": [
"Augment",
"Furax"
],
"/Lotus/Upgrades/Mods/DualSource/Melee/CritDamageChargeSpeedMod": [
"Melee"
],
"/Lotus/Upgrades/Mods/DataSpike/Potency/GainAntivirusSmallOnSingleUseMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Potency/GainAntivirusOnUseMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Potency/GainAntivirusLargeOnSingleUseMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Potency/GainAntivirusAndWeaponDamageOnUseMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Potency/GainAntivirusAndSpeedOnUseMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Cipher/OnHackSprintSpeedMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Cipher/OnHackLockersMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Cipher/OnHackInvisMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Cipher/OnFailHackResetMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Cipher/ElectrifyOnHackMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Cipher/DamageReductionOnHackMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Cipher/AutoHackMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Assassin/SwiftExecuteMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Assassin/OnExecutionTerrifyMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Assassin/OnExecutionReviveCompanionMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Assassin/OnExecutionParkourSpeedMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Assassin/OnExecutionHealthDropMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Assassin/OnExecutionEnergyDropMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Assassin/OnExecutionDrainPowerMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Assassin/OnExecutionBlindMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/DataSpike/Assassin/OnExecutionAmmoMod": [
"Parazon"
],
"/Lotus/Upgrades/Mods/Bows/Event/Nightwave/NightwaveStalkerBowAugmentMod": [
"Dread"
],
"/Lotus/Upgrades/Mods/Aura/WarframeAuraWickedStrikesMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/WarframeAuraVerticalityMod": [
"Aura",
"Auras",
"Resistance",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/WarframeAuraLoyalHerdMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/WarframeAuraBloodLetterMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/WarframeAuraBladedRestraintMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/RobotPoorAimAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/PlayerWeakpointCriticalChanceAuraMod": [
"Aura"
],
"/Lotus/Upgrades/Mods/Aura/PlayerSprintAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/PlayerSniperDamageAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/PlayerSniperAmmoAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/PlayerShellDamageAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/PlayerShellAmmoAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/PlayerRifleDamageAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/PlayerRifleAmmoAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/PlayerPoisonImmunityAuraMod": [
"Aura",
"Auras",
"Resistance",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/PlayerPistolDamageAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/PlayerPistolAmmoAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/PlayerMeleeStartingComboAuraMod": [
"Aura"
],
"/Lotus/Upgrades/Mods/Aura/PlayerMeleeAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/PlayerLootRadarAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/PlayerHolsterSpeedAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/PlayerHealthRegenAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/PlayerHealthAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/PlayerEnergyRegenAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/PlayerEnergyHealthRegenAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/PlayerEnemyRadarAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/PlayerCompanionSummonDamageAuraMod": [
"Aura"
],
"/Lotus/Upgrades/Mods/Aura/InfestationSpeedReductionAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/EnemyShieldReductionAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/EnemyArmorReductionAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/AvatarAuraPowerMaxMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/FairyQuest/FairyQuestThornsAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/FairyQuest/FairyQuestShieldsToCritAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/FairyQuest/FairyQuestCritToAbilityAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Aura/FairyQuest/FairyQuestAbilityToShieldsAuraMod": [
"Aura",
"Auras",
"Warframe"
],
"/Lotus/Upgrades/Mods/Archwing/Suit/ArchwingSuitSprintSpeedMod": [
"Archwing"
],
"/Lotus/Upgrades/Mods/Archwing/Suit/ArchwingSuitShieldRechargeRateMod": [
"Archwing"
],
"/Lotus/Upgrades/Mods/Archwing/Suit/ArchwingSuitShieldMaxMod": [
"Archwing"
],
"/Lotus/Upgrades/Mods/Archwing/Suit/ArchwingSuitPowerMaxMod": [
"Archwing"
],
"/Lotus/Upgrades/Mods/Archwing/Suit/ArchwingSuitHealthMaxMod": [
"Archwing"
],
"/Lotus/Upgrades/Mods/Archwing/Suit/ArchwingSuitArmourMod": [
"Archwing"
],
"/Lotus/Upgrades/Mods/Archwing/Suit/ArchwingSuitAbilityStrengthMod": [
"Archwing"
],
"/Lotus/Upgrades/Mods/Archwing/Suit/ArchwingSuitAbilityRangeMod": [
"Archwing"
],
"/Lotus/Upgrades/Mods/Archwing/Suit/ArchwingSuitAbilityEfficiencyMod": [
"Archwing"
],
"/Lotus/Upgrades/Mods/Archwing/Suit/ArchwingSuitAbilityDurationMod": [
"Archwing"
],
"/Lotus/Upgrades/Mods/Archwing/Suit/ArchwingDamageToEnergyMod": [
"Archwing"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/PrimedArchwingRifleFireIterationsMod": [
"Archgun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/PrimedArchwingDamageOnReloadMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingWeaponToxinDamageMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingWeaponFreezeDamageMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingWeaponFireDamageMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingWeaponElectricityDamageMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingRifleStatusChanceMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingRifleStatusChanceAimingMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingRifleReloadSpeedMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingRifleRangeMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingRiflePunchthroughMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingRifleFireRateMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingRifleFireIterationsMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingRifleDamageAmountMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingRifleCritDamageMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingRifleCritChanceMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingRifleCritChanceDamageAimingMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingRifleClipMaxMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingRifleChargeSpeedMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingRifleAmmoMaxMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingHeadshotKillAmmoEfficiencyMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingEventToxinStatusRifleMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingEventRadiationFireIterationRifleMod": [
"Archgun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingEventMagneticFireRateRifleMod": [
"Archgun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingEventFireStatusRifleMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingEventElectricStatusRifleMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingEventColdStatusRifleMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingDualStatSlashStatusMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingDualStatPunctureStatusMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingDualStatImpactStatusMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingDamageAfterReloadMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/ArchwingCCImmunityIfAimingMod": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/Expert/ArchwingWeaponToxinDamageModExpert": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/Expert/ArchwingRifleDamageAmountModExpert": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingWeaponToxinDamageMod": [
"Archmelee",
"Archwing Melee"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingWeaponFreezeDamageMod": [
"Archmelee",
"Archwing Melee"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingWeaponFireDamageMod": [
"Archmelee",
"Archwing Melee"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingWeaponElectricityDamageMod": [
"Archmelee",
"Archwing Melee"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingMeleeStatusChanceMod": [
"Archmelee",
"Archwing Melee"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingMeleeScanOnKillMod": [
"Archmelee",
"Archwing Melee"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingMeleeRangeIncMod": [
"Archmelee",
"Archwing Melee"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingMeleeFireRateMod": [
"Archmelee",
"Archwing Melee"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingMeleeDamageMod": [
"Archmelee",
"Archwing Melee"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingMeleeCritDamageMod": [
"Archmelee",
"Archwing Melee"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingMeleeCritChanceMod": [
"Archmelee",
"Archwing Melee"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingEventToxinStatusMeleeMod": [
"Archmelee",
"Archwing Melee"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingEventRadiationCritChanceMeleeMod": [
"Archmelee"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingEventMagneticCritDamageMeleeMod": [
"Archmelee"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingEventFireStatusMeleeMod": [
"Archmelee",
"Archwing Melee"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingEventElectricStatusMeleeMod": [
"Archmelee",
"Archwing Melee"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingEventColdStatusMeleeMod": [
"Archmelee",
"Archwing Melee"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingDualStatSlashStatusMeleeMod": [
"Archmelee",
"Archwing Melee"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingDualStatPunctureStatusMeleeMod": [
"Archmelee",
"Archwing Melee"
],
"/Lotus/Upgrades/Mods/Archwing/Melee/ArchwingDualStatImpactStatusMeleeMod": [
"Archmelee",
"Archwing Melee"
],
"/Lotus/Upgrades/Mods/Archwing/Expert/ArchwingSuitAbilityStrengthModExpert": [
"Archwing"
],
"/Lotus/Upgrades/Mods/Antiques/WeaponDamageSchools": [
"Antique"
],
"/Lotus/Upgrades/Mods/Antiques/VoidSlingEfficiency": [
"Antique"
],
"/Lotus/Upgrades/Mods/Antiques/VoidSlingCrateBreaker": [
"Antique"
],
"/Lotus/Upgrades/Mods/Antiques/UltimateInitialChargeSchools": [
"Antique"
],
"/Lotus/Upgrades/Mods/Antiques/SuperSpeedSchools": [
"Antique"
],
"/Lotus/Upgrades/Mods/Antiques/ShieldSchool": [
"Antique"
],
"/Lotus/Upgrades/Mods/Antiques/ReduceDeathEffect": [
"Antique"
],
"/Lotus/Upgrades/Mods/Antiques/ProcChanceSchool": [
"Antique"
],
"/Lotus/Upgrades/Mods/Antiques/Multishot": [
"Antique"
],
"/Lotus/Upgrades/Mods/Antiques/JumpHeight": [
"Antique"
],
"/Lotus/Upgrades/Mods/Antiques/HealthMax": [
"Antique"
],
"/Lotus/Upgrades/Mods/Antiques/HealthAndShieldSchools": [
"Antique"
],
"/Lotus/Upgrades/Mods/Antiques/Ghostwalk": [
"Antique"
],
"/Lotus/Upgrades/Mods/Antiques/FireRateAndEfficiency": [
"Antique"
],
"/Lotus/Upgrades/Mods/Antiques/EnterVoidModeOnKnockdown": [
"Antique"
],
"/Lotus/Upgrades/Mods/Antiques/DashDistanceSchools": [
"Antique"
],
"/Lotus/Upgrades/Mods/Antiques/DamageWhileInvisible": [
"Antique"
],
"/Lotus/Upgrades/Mods/Antiques/CritChanceSchool": [
"Antique"
],
"/Lotus/Upgrades/Mods/Antiques/AntiqueArmour": [
"Antique"
],
"/Lotus/Upgrades/Mods/Antiques/AmmoSchool": [
"Antique"
],
"/Lotus/Upgrades/Grimoire/XataStrikeMod": [
"Exilus Weapon",
"Invocation",
"Tome"
],
"/Lotus/Upgrades/Grimoire/VomeStrikeMod": [
"Exilus Weapon",
"Invocation",
"Tome"
],
"/Lotus/Upgrades/Grimoire/RisStrikeMod": [
"Exilus Weapon",
"Invocation",
"Tome"
],
"/Lotus/Upgrades/Grimoire/NetraStrikeMod": [
"Exilus Weapon",
"Invocation",
"Tome"
],
"/Lotus/Upgrades/Grimoire/LohkAuraMod": [
"Canticle",
"Exilus",
"Exilus Weapon",
"Tome"
],
"/Lotus/Upgrades/Grimoire/KhraAuraMod": [
"Canticle",
"Exilus",
"Exilus Weapon",
"Tome"
],
"/Lotus/Upgrades/Grimoire/JahuAuraMod": [
"Canticle",
"Exilus",
"Exilus Weapon",
"Tome"
],
"/Lotus/Upgrades/Grimoire/FassAuraMod": [
"Canticle",
"Exilus",
"Exilus Weapon",
"Tome"
],
"/Lotus/Upgrades/EmpoweredHeavyMelee/PerfectReach": [
"Exilus",
"Exilus Weapon",
"Melee"
],
"/Lotus/Upgrades/EmpoweredHeavyMelee/PerfectCondition": [
"Exilus",
"Exilus Weapon",
"Melee"
],
"/Lotus/Upgrades/EmpoweredHeavyMelee/HeavyAgression": [
"Exilus",
"Exilus Weapon",
"Melee"
],
"/Lotus/Upgrades/EmpoweredHeavyMelee/FocusedAttack": [
"Exilus",
"Exilus Weapon",
"Melee"
],
"/Lotus/Upgrades/EmpoweredHeavyMelee/CursedSyndicateEmpoweredHeavyMeleeMod": [
"Exilus",
"Exilus Weapon",
"Melee"
],
"/Lotus/Upgrades/EmpoweredHeavyMelee/CertainStrike": [
"Exilus",
"Exilus Weapon",
"Melee"
],
"/Lotus/Upgrades/CosmeticEnhancers/Peculiars/InflationMod": [
"Exilus",
"Peculiar",
"Warframe"
],
"/Lotus/Upgrades/CosmeticEnhancers/Peculiars/FlowerPowerMod": [
"Exilus",
"Peculiar",
"Warframe"
],
"/Lotus/Upgrades/CosmeticEnhancers/Peculiars/EvilSpiritMod": [
"Exilus",
"Peculiar",
"Warframe"
],
"/Lotus/Upgrades/CosmeticEnhancers/Peculiars/DissolveEnemyMod": [
"Exilus",
"Peculiar",
"Warframe"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/WeaknessScanPrecept": [
"Helios",
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/Vaporize": [
"Dethcube",
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/UniversalVacuum": [
"MOA",
"Penjaga",
"Robotic",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/Thumper": [
"Djinn",
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/ThrowGlaivePrecept": [
"Helios",
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/TaserStun": [
"Diriga",
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/ShieldVampire": [
"Penjaga",
"Sentinel",
"Taxon"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/SentinelAttack": [
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/Sanctuary": [
"MOA",
"Robotic",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/RevivePlayer": [
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/Revenge": [
"Penjaga",
"Sentinel",
"Shade"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/RespawnSelf": [
"Djinn",
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/RepairShip": [
"Nautilus",
"Penjaga"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/Regen": [
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/ProcAbsorb": [
"Penjaga",
"Sentinel",
"Wyrm"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/PrimedRegen": [
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/PlantScannerPrecept": [
"Oxylus",
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/Looter": [
"Carrier",
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/LocateResources": [
"Oxylus",
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/ItemVacum": [
"Carrier",
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/ItemDropOnAssist": [
"Dethcube",
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/HealBot": [
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/HeadShot": [
"Diriga",
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/Guardian": [
"MOA",
"Penjaga",
"Robotic",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/GhostAugmentCard": [
"Penjaga",
"Sentinel",
"Shade"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/Ghost": [
"Penjaga",
"Sentinel",
"Shade"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/GatherEnemies": [
"Nautilus",
"Penjaga"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/CrowdDispersion": [
"Penjaga",
"Sentinel",
"Wyrm"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/CoolantLeak": [
"Penjaga",
"Robotic",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/CodexScannerPrecept": [
"Helios",
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/BeastUniversalVacuum": [
"Beast",
"Kavat",
"Kubrow",
"Penjaga"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/BeastResourceDoublingMod": [
"Beast",
"Retriever"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/BeastLoyalRetriever": [
"Beast",
"Retriever"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/BeastCreditDoublingMod": [
"Beast",
"Retriever"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/Bait": [
"Djinn",
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/ArcTrap": [
"Diriga",
"Penjaga",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/AntigravDilator": [
"Penjaga",
"Robotic"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/VoidBond/VoidVinculum": [
"Companion",
"Hound",
"Kavat",
"Kubrow",
"MOA",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/VoidBond/VoidClone": [
"Companion",
"Hound",
"Kavat",
"Kubrow",
"MOA",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/VoidBond/TenaciousPartner": [
"Companion",
"Hound",
"Kavat",
"Kubrow",
"MOA",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/VoidBond/TandemTactics": [
"Beast",
"Companion",
"Kavat",
"Kubrow"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/VoidBond/Proliferation": [
"Companion",
"Hound",
"Kavat",
"Kubrow",
"MOA",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/VoidBond/PreyDrive": [
"Companion",
"Hound",
"Kavat",
"Kubrow",
"MOA",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/VoidBond/PredatoryResponse": [
"Companion",
"Hound",
"Kavat",
"Kubrow",
"MOA",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/VoidBond/MutualNourishment": [
"Companion",
"Hound",
"Kavat",
"Kubrow",
"MOA",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/VoidBond/EximusHunter": [
"Companion",
"Hound",
"Kavat",
"Kubrow",
"MOA",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/VoidBond/Copilot": [
"Companion",
"Hound",
"Kavat",
"Kubrow",
"MOA",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/VoidBond/CompoundingLaceration": [
"Companion",
"Hound",
"MOA",
"Robotic",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/VoidBond/BoneSplitter": [
"Companion",
"Hound",
"Kavat",
"Kubrow",
"MOA",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/VoidBond/BondedExaltation": [
"Companion",
"Hound",
"Kavat",
"Kubrow",
"MOA",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/VoidBond/AlacrityField": [
"Companion",
"Hound",
"Kavat",
"Kubrow",
"MOA",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/Events/ProjectNightwatch/SentinelHealthRegenPreceptNightwatchMod": [
"MOA",
"Penjaga",
"Robotic",
"Sentinel"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/Events/CorpusArena/ShieldAuraPrecept": [
"Index",
"MOA",
"Penjaga",
"Robotic",
"Sentinel"
],
"/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetTeslaShotPrecept": [
"Companion",
"Hound",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetStealEximusPrecept": [
"Companion",
"Hound",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetPhotonStrikePrecept": [
"Companion",
"Hound",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetMegaLaserPrecept": [
"Companion",
"Hound",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetMagneticRepulsePrecept": [
"Companion",
"Denial",
"Hound",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetEvasionPrecept": [
"Companion",
"Denial",
"Hound",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetDisarmPulsePrecept": [
"Companion",
"Hound",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetClonePrecept": [
"Companion",
"Denial",
"Hound",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetAntiMeleePrecept": [
"Companion",
"Hound",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaTractorBeamPrecept": [
"MOA",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaTetherVaccumMinePrecept": [
"MOA",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaStasisFieldPrecept": [
"MOA",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaShockwavePrecept": [
"MOA",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaLiftBombPrecept": [
"MOA",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaHackerPrecept": [
"MOA",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaChargePrecept": [
"MOA",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/KubrowVipChasePrecept": [
"Kubrow",
"Penjaga",
"Sunika Kubrow"
],
"/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/KubrowThiefPrecept": [
"Beast",
"Kavat",
"Kubrow",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/KubrowShieldPrecept": [
"Kubrow",
"Penjaga",
"Raksa Kubrow"
],
"/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/KubrowSanctuary": [
"Beast",
"Kavat",
"Kubrow"
],
"/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/KubrowLootPrecept": [
"Chesa Kubrow",
"Kubrow",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/KubrowGrabPrecept": [
"Helminth Charger",
"Kubrow",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/KubrowFearPrecept": [
"Kubrow",
"Penjaga",
"Raksa Kubrow"
],
"/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/KubrowDisarmPrecept": [
"Cyte-09"
],
"/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/KubrowDigPrecept": [
"Kubrow",
"Penjaga",
"Sahasa Kubrow"
],
"/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/KubrowCloakPrecept": [
"Huras Kubrow",
"Kubrow",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/KubrowChargePrecept": [
"Huras Kubrow",
"Kubrow",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/ChargerChargePrecept": [
"Helminth Charger",
"Kubrow",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/VulpineInfestedCatbrowRespawn": [
"Penjaga",
"Sly Vulpaphyla",
"Vulpaphyla"
],
"/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedPredatorSpitParasitePrecept": [
"Penjaga",
"Pharaoh Predasite",
"Predasite"
],
"/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedPredatorSpitAcidPrecept": [
"Penjaga",
"Predasite",
"Vizier Predasite"
],
"/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedPredatorMaggotSummonerPrecept": [
"Penjaga",
"Predasite"
],
"/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedPredatorInfectiousBitePrecept": [
"Medjay Predasite",
"Penjaga",
"Predasite"
],
"/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedPredatorHealingSporesPrecept": [
"Penjaga",
"Predasite",
"Vizier Predasite"
],
"/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedPredatorFinisherSporesPrecept": [
"Medjay Predasite",
"Penjaga",
"Predasite"
],
"/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedPredatorBuffSporesPrecept": [
"Penjaga",
"Pharaoh Predasite",
"Predasite"
],
"/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedKavatViralQuillsPrecept": [
"Panzer Vulpaphyla",
"Penjaga",
"Vulpaphyla"
],
"/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedCatbrowVampireShieldPrecept": [
"Penjaga",
"Vulpaphyla"
],
"/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedCatbrowGoreTossPrecept": [
"Crescent Vulpaphyla",
"Penjaga",
"Vulpaphyla"
],
"/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedCatbrowEvasionBuffPrecept": [
"Penjaga",
"Sly Vulpaphyla",
"Vulpaphyla"
],
"/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/HornedInfestedCatbrowRespawn": [
"Crescent Vulpaphyla",
"Penjaga",
"Vulpaphyla"
],
"/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/ArmoredInfestedCatbrowRespawn": [
"Panzer Vulpaphyla",
"Penjaga",
"Vulpaphyla"
],
"/Lotus/Types/Friendly/Pets/CatbrowPetPrecepts/CatbrowVampireBitePrecept": [
"Kavat",
"Penjaga",
"Vasca Kavat"
],
"/Lotus/Types/Friendly/Pets/CatbrowPetPrecepts/CatbrowTremorSensePrecept": [
"Kavat",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/CatbrowPetPrecepts/CatbrowTransfusionPrecept": [
"Kavat",
"Penjaga",
"Vasca Kavat"
],
"/Lotus/Types/Friendly/Pets/CatbrowPetPrecepts/CatbrowSwipePrecept": [
"Beast Claws",
"Kavat",
"Kavat Claws"
],
"/Lotus/Types/Friendly/Pets/CatbrowPetPrecepts/CatbrowShredPrecept": [
"Kavat"
],
"/Lotus/Types/Friendly/Pets/CatbrowPetPrecepts/CatbrowReflectPrecept": [
"Adarza Kavat",
"Kavat",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/CatbrowPetPrecepts/CatbrowPouncePrecept": [
"Kavat"
],
"/Lotus/Types/Friendly/Pets/CatbrowPetPrecepts/CatbrowMarkTerritoryPrecept": [
"Kavat",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/CatbrowPetPrecepts/CatbrowLuckPrecept": [
"Kavat",
"Penjaga",
"Smeeta Kavat"
],
"/Lotus/Types/Friendly/Pets/CatbrowPetPrecepts/CatbrowDistractPrecept": [
"Kavat",
"Penjaga",
"Smeeta Kavat"
],
"/Lotus/Types/Friendly/Pets/CatbrowPetPrecepts/CatbrowCatsEyePrecept": [
"Adarza Kavat",
"Kavat",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/BeastWeapons/Stances/BeastVIPStance": [
"Beast",
"Beast Claws",
"Claws",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/BeastWeapons/Stances/BeastSpreadAttacksStance": [
"Beast",
"Beast Claws",
"Claws",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/BeastWeapons/Stances/BeastProtectorStance": [
"Beast",
"Beast Claws",
"Claws",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/BeastWeapons/Stances/BeastPersistentStance": [
"Beast",
"Beast Claws",
"Claws",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/BeastWeapons/Stances/BeastPacifistStance": [
"Beast",
"Beast Claws",
"Claws",
"Penjaga"
],
"/Lotus/Types/Friendly/Pets/BeastWeapons/Stances/BeastNeutralStance": [
"Beast",
"Beast Claws",
"Claws",
"Penjaga"
],
"/Lotus/Powersuits/YinYang/YinYangTargetAugmentCard": [
"Augment",
"Equinox",
"Warframe"
],
"/Lotus/Powersuits/YinYang/YinYangSwitchPvPAugmentCard": [
"Augment",
"Equinox",
"Warframe"
],
"/Lotus/Powersuits/YinYang/YinYangSwitchAugmentCard": [
"Augment",
"Equinox",
"Warframe"
],
"/Lotus/Powersuits/YinYang/YinYangBurstAugmentCard": [
"Augment",
"Equinox",
"Warframe"
],
"/Lotus/Powersuits/YinYang/YinYangAuraAugmentCard": [
"Augment",
"Equinox",
"Warframe"
],
"/Lotus/Powersuits/Yareli/YareliDisksAugmentCard": [
"Yareli"
],
"/Lotus/Powersuits/Yareli/YareliBoardAugmentTwoCard": [
"Yareli"
],
"/Lotus/Powersuits/Yareli/YareliBoardAugmentCard": [
"Augment",
"Warframe",
"Yareli"
],
"/Lotus/Powersuits/Wraith/WraithSowAugmentCard": [
"Augment",
"Sevagoth"
],
"/Lotus/Powersuits/Wraith/WraithReapAugmentCard": [
"Augment",
"Sevagoth",
"Warframe"
],
"/Lotus/Powersuits/Wisp/WispSunAugmentCard": [
"Wisp"
],
"/Lotus/Powersuits/Wisp/WispReservoirAugmentCard": [
"Augment",
"Exilus",
"Warframe",
"Wisp"
],
"/Lotus/Powersuits/Wisp/WispHarnessAugmentCard": [
"Wisp"
],
"/Lotus/Powersuits/Werewolf/WerewolfShroudAugmentCard": [
"Augment",
"Voruna",
"Warframe"
],
"/Lotus/Powersuits/Werewolf/WerewolfHowlAugmentCard": [
"Augment",
"Voruna",
"Warframe"
],
"/Lotus/Powersuits/Volt/SpeedPvPAugmentCard": [
"Augment",
"Volt",
"Warframe"
],
"/Lotus/Powersuits/Volt/SpeedAugmentCard": [
"Augment",
"Volt",
"Warframe"
],
"/Lotus/Powersuits/Volt/ShockAugmentCard": [
"Augment",
"Volt",
"Warframe"
],
"/Lotus/Powersuits/Volt/ShieldPvPAugmentCard": [
"Augment",
"Volt",
"Warframe"
],
"/Lotus/Powersuits/Volt/ShieldAugmentCard": [
"Augment",
"Volt",
"Warframe"
],
"/Lotus/Powersuits/Volt/OverloadAugmentCard": [
"Augment",
"Volt",
"Warframe"
],
"/Lotus/Powersuits/Trinity/WellOfLifeAugmentCard": [
"Augment",
"Trinity",
"Warframe"
],
"/Lotus/Powersuits/Trinity/LinkAugmentCard": [
"Augment",
"Trinity",
"Warframe"
],
"/Lotus/Powersuits/Trinity/EnergyVampireAugmentCard": [
"Augment",
"Trinity",
"Warframe"
],
"/Lotus/Powersuits/Trinity/BlessingAugmentCard": [
"Trinity"
],
"/Lotus/Powersuits/Trapper/ZapTrapAugmentCard": [
"Augment",
"Vauban",
"Warframe"
],
"/Lotus/Powersuits/Trapper/MagHoleAugmentCard": [
"Augment",
"Vauban",
"Warframe"
],
"/Lotus/Powersuits/Trapper/LevTrapAugmentCard": [
"Augment",
"Vauban",
"Warframe"
],
"/Lotus/Powersuits/Tengu/TurbulenceAugmentCard": [
"Augment",
"Flight Speed",
"Warframe",
"Zephyr"
],
"/Lotus/Powersuits/Tengu/TornadoAugmentCard": [
"Augment",
"Warframe",
"Zephyr"
],
"/Lotus/Powersuits/Tengu/TenguDisablePassiveMod": [
"Augment",
"Exilus",
"Warframe",
"Zephyr"
],
"/Lotus/Powersuits/Tengu/TenguBurstAugmentCard": [
"Augment",
"Warframe",
"Zephyr"
],
"/Lotus/Powersuits/Tengu/DiveBombAugmentCard": [
"Augment",
"Warframe",
"Zephyr"
],
"/Lotus/Powersuits/Temple/TemplePassiveAugment1Card": [
"Temple"
],
"/Lotus/Powersuits/Sentient/SentientWhirlwindAugmentCard": [
"Caliban"
],
"/Lotus/Powersuits/Saryn/WeaponPoisonAugmentCard": [
"Augment",
"Saryn",
"Warframe"
],
"/Lotus/Powersuits/Saryn/ShedAugmentCard": [
"Augment",
"Saryn",
"Warframe"
],
"/Lotus/Powersuits/Saryn/PoisonAugmentTwoCard": [
"Augment",
"Exilus",
"Saryn",
"Warframe"
],
"/Lotus/Powersuits/Saryn/PoisonAugmentCard": [
"Augment",
"Saryn",
"Warframe"
],
"/Lotus/Powersuits/Sandman/SandmanSwarmAugmentCard": [
"Augment",
"Inaros",
"Warframe"
],
"/Lotus/Powersuits/Sandman/SandmanStormAugmentCard": [
"Augment",
"Inaros",
"Warframe"
],
"/Lotus/Powersuits/Sandman/SandmanBlastAugmentCard": [
"Augment",
"Inaros",
"Warframe"
],
"/Lotus/Powersuits/Runner/RunnerTransferAugmentCard": [
"Gauss"
],
"/Lotus/Powersuits/Runner/RunnerRushAugmentCard": [
"Gauss"
],
"/Lotus/Powersuits/Rhino/RhinoStompAugmentCard": [
"Augment",
"Rhino",
"Warframe"
],
"/Lotus/Powersuits/Rhino/RhinoChargeAugmentCard": [
"Augment",
"Rhino",
"Warframe"
],
"/Lotus/Powersuits/Rhino/RadialBlastAugmentCard": [
"Augment",
"Rhino",
"Warframe"
],
"/Lotus/Powersuits/Rhino/IronSkinAugmentCard": [
"Augment",
"Rhino",
"Warframe"
],
"/Lotus/Powersuits/Revenant/RevenantSentientAugmentCard": [
"Augment",
"Revenant",
"Warframe"
],
"/Lotus/Powersuits/Revenant/RevenantMarkAugmentCard": [
"Revenant"
],
"/Lotus/Powersuits/Revenant/RevenantAfflictionAugmentCard": [
"Augment",
"Revenant",
"Warframe"
],
"/Lotus/Powersuits/Ranger/RangerStealAugmentCard": [
"Augment",
"Ivara",
"Warframe"
],
"/Lotus/Powersuits/Ranger/RangerQuiverPvPAugmentCard": [
"Augment",
"Ivara",
"Warframe"
],
"/Lotus/Powersuits/Ranger/RangerQuiverAugmentCard": [
"Augment",
"Ivara",
"Warframe"
],
"/Lotus/Powersuits/Ranger/RangerControlAugmentCard": [
"Augment",
"Ivara",
"Warframe"
],
"/Lotus/Powersuits/Ranger/RangerBowAugmentCard": [
"Augment",
"Ivara",
"Warframe"
],
"/Lotus/Powersuits/Priest/PriestRavageAugmentCard": [
"Augment",
"Harrow",
"Warframe"
],
"/Lotus/Powersuits/Priest/PriestPactAugmentCard": [
"Augment",
"Harrow",
"Warframe"
],
"/Lotus/Powersuits/Priest/PriestCondemnAugmentCard": [
"Harrow"
],
"/Lotus/Powersuits/Pirate/TidalWaveAugmentCard": [
"Augment",
"Hydroid",
"Warframe"
],
"/Lotus/Powersuits/Pirate/LiquifyAugmentCard": [
"Augment",
"Hydroid",
"Warframe"
],
"/Lotus/Powersuits/Pirate/KrakenAugmentCard": [
"Augment",
"Hydroid",
"Warframe"
],
"/Lotus/Powersuits/Pirate/CannonBarrageAugmentCard": [
"Augment",
"Hydroid",
"Warframe"
],
"/Lotus/Powersuits/PaxDuviricus/PaxFieldAugmentCard": [
"Kullervo"
],
"/Lotus/Powersuits/PaxDuviricus/PaxBladesAugmentCard": [
"Kullervo"
],
"/Lotus/Powersuits/Paladin/StairwayToHeavenAugmentCard": [
"Augment",
"Oberon",
"Warframe"
],
"/Lotus/Powersuits/Paladin/SmiteAugmentCard": [
"Augment",
"Oberon",
"Warframe"
],
"/Lotus/Powersuits/Paladin/RegenerationAugmentCard": [
"Augment",
"Oberon",
"Warframe"
],
"/Lotus/Powersuits/Paladin/ReckoningPvPAugmentCard": [
"Augment",
"Oberon",
"Warframe"
],
"/Lotus/Powersuits/Paladin/ReckoningAugmentCard": [
"Augment",
"Oberon",
"Warframe"
],
"/Lotus/Powersuits/Pagemaster/PagemasterBookAugment1Card": [
"Dante"
],
"/Lotus/Powersuits/Pacifist/PacifistWaveAugmentCard": [
"Baruuk"
],
"/Lotus/Powersuits/Pacifist/PacifistFistAugmentCard": [
"Augment",
"Baruuk",
"Warframe"
],
"/Lotus/Powersuits/Pacifist/PacifistDodgeAugmentCard": [
"Augment",
"Baruuk",
"Warframe"
],
"/Lotus/Powersuits/Odalisk/OdaliskDispensaryAugmentCard": [
"Augment",
"Exilus",
"Protea",
"Warframe"
],
"/Lotus/Powersuits/Odalisk/OdaliskBFGAugmentCard": [
"Augment",
"Protea"
],
"/Lotus/Powersuits/Odalisk/OdaliskAnchorAugmentCard": [
"Augment",
"Protea",
"Warframe"
],
"/Lotus/Powersuits/Nokko/NokkoRerootAugmentCard": [
"Nokko"
],
"/Lotus/Powersuits/Ninja/TeleportToAugmentCard": [
"Ash",
"Augment",
"Warframe"
],
"/Lotus/Powersuits/Ninja/SmokeScreenPvPAugmentCard": [
"Ash",
"Augment",
"Warframe"
],
"/Lotus/Powersuits/Ninja/SmokeScreenAugmentCard": [
"Ash",
"Augment",
"Warframe"
],
"/Lotus/Powersuits/Ninja/NinjaStormAugmentCard": [
"Ash",
"Augment",
"Warframe"
],
"/Lotus/Powersuits/Ninja/GlaiveAugmentCard": [
"Ash",
"Augment",
"Warframe"
],
"/Lotus/Powersuits/Nezha/NezhaTrailAugmentCard": [
"Augment",
"Nezha",
"Warframe"
],
"/Lotus/Powersuits/Nezha/NezhaSpearAugmentTwoCard": [
"Augment",
"Nezha",
"Warframe"
],
"/Lotus/Powersuits/Nezha/NezhaSashPvPAugmentCard": [
"Augment",
"Nezha"
],
"/Lotus/Powersuits/Nezha/NezhaSashAugmentCard": [
"Augment",
"Nezha",
"Warframe"
],
"/Lotus/Powersuits/Nezha/NezhaRingAugmentCard": [
"Augment",
"Nezha",
"Warframe"
],
"/Lotus/Powersuits/Nezha/NezhaDisablePassiveMod": [
"Exilus",
"Nezha"
],
"/Lotus/Powersuits/Necro/TerrorTotemAugmentCard": [
"Augment",
"Nekros",
"Warframe"
],
"/Lotus/Powersuits/Necro/SoulPunchPvPAugmentCard": [
"Augment",
"Nekros"
],
"/Lotus/Powersuits/Necro/SoulPunchAugmentCard": [
"Augment",
"Nekros",
"Warframe"
],
"/Lotus/Powersuits/Necro/SearchTheDeadAugmentCard": [
"Augment",
"Nekros",
"Warframe"
],
"/Lotus/Powersuits/Necro/CloneTheDeadAugmentCard": [
"Augment",
"Nekros",
"Warframe"
],
"/Lotus/Powersuits/MonkeyKing/MonkeyStaffAugmentCard": [
"Augment",
"Warframe",
"Wukong"
],
"/Lotus/Powersuits/MonkeyKing/MonkeyPokeAugmentCard": [
"Augment",
"Warframe",
"Wukong"
],
"/Lotus/Powersuits/MonkeyKing/MonkeyCloudAugmentCard": [
"Augment",
"Warframe",
"Wukong"
],
"/Lotus/Powersuits/Magician/VolatileAugmentCard": [
"Augment",
"Limbo",
"Warframe"
],
"/Lotus/Powersuits/Magician/TearInSpaceAugmentCard": [
"Augment",
"Limbo",
"Warframe"
],
"/Lotus/Powersuits/Magician/BanishAugmentCard": [
"Augment",
"Limbo",
"Warframe"
],
"/Lotus/Powersuits/Mag/ShieldRegenPvPAugmentCard": [
"Augment",
"Mag",
"Warframe"
],
"/Lotus/Powersuits/Mag/ShieldRegenAugmentCard": [
"Augment",
"Mag",
"Warframe"
],
"/Lotus/Powersuits/Mag/PullPvPAugmentCard": [
"Augment",
"Mag",
"Warframe"
],
"/Lotus/Powersuits/Mag/PullAugmentCard": [
"Augment",
"Mag",
"Warframe"
],
"/Lotus/Powersuits/Mag/CrushAugmentCard": [
"Augment",
"Mag",
"Warframe"
],
"/Lotus/Powersuits/Mag/BulletAttractorAugmentCard": [
"Augment",
"Mag",
"Warframe"
],
"/Lotus/Powersuits/Loki/SwitchAugmentCard": [
"Augment",
"Loki",
"Warframe"
],
"/Lotus/Powersuits/Loki/InvisibilityAugmentCard": [
"Augment",
"Loki",
"Warframe"
],
"/Lotus/Powersuits/Loki/DisarmAugmentCard": [
"Augment",
"Loki",
"Warframe"
],
"/Lotus/Powersuits/Loki/DecoyPvPAugmentCard": [
"Augment",
"Loki"
],
"/Lotus/Powersuits/Loki/DecoyAugmentTwoCard": [
"Loki"
],
"/Lotus/Powersuits/Loki/DecoyAugmentCard": [
"Augment",
"Loki",
"Warframe"
],
"/Lotus/Powersuits/Koumei/KoumeiStringsAugmentCard": [
"Koumei"
],
"/Lotus/Powersuits/Koumei/KoumeiFortuneAugmentCard": [
"Augment",
"Koumei"
],
"/Lotus/Powersuits/Khora/KhoraKavatAugmentCard": [
"Augment",
"Khora",
"Warframe"
],
"/Lotus/Powersuits/Khora/KhoraCrackAugmentCard": [
"Augment",
"Khora",
"Warframe"
],
"/Lotus/Powersuits/Khora/KhoraCageAugmentCard": [
"Augment",
"Khora",
"Warframe"
],
"/Lotus/Powersuits/Jade/SelfBulletAttractorPvPAugmentCard": [
"Augment",
"Nyx",
"Warframe"
],
"/Lotus/Powersuits/Jade/SelfBulletAttractorAugmentCard": [
"Augment",
"Nyx",
"Warframe"
],
"/Lotus/Powersuits/Jade/MindControlAugmentCard": [
"Augment",
"Nyx",
"Warframe"
],
"/Lotus/Powersuits/Jade/DaggerAugmentCard": [
"Augment",
"Nyx",
"Warframe"
],
"/Lotus/Powersuits/Jade/ChaosAugmentCard": [
"Augment",
"Nyx",
"Warframe"
],
"/Lotus/Powersuits/IronFrame/IronFrameStripAugmentCard": [
"Hildryn"
],
"/Lotus/Powersuits/IronFrame/IronFrameEruptionAugmentCard": [
"Augment",
"Hildryn",
"Warframe"
],
"/Lotus/Powersuits/IronFrame/IronFrameBlastAugmentCard": [
"Hildryn"
],
"/Lotus/Powersuits/Infestation/InfestTendrilsAugmentCard": [
"Augment",
"Nidus",
"Warframe"
],
"/Lotus/Powersuits/Infestation/InfestRuptureAugmentCard": [
"Augment",
"Nidus",
"Warframe"
],
"/Lotus/Powersuits/Infestation/InfestPodsAugmentCard": [
"Augment",
"Nidus",
"Warframe"
],
"/Lotus/Powersuits/Infestation/InfestPassiveAugmentCard": [
"Augment",
"Nidus",
"Warframe"
],
"/Lotus/Powersuits/Infestation/InfestLinkAugmentCard": [
"Nidus"
],
"/Lotus/Powersuits/Hoplite/HopliteImpaleAugmentCard": [
"Styanax"
],
"/Lotus/Powersuits/Hoplite/HopliteBashAugmentCard": [
"Styanax"
],
"/Lotus/Powersuits/Hoplite/HopliteArmyAugmentCard": [
"Augment",
"Styanax",
"Warframe"
],
"/Lotus/Powersuits/Harlequin/PrismPvPAugmentCard": [
"Augment",
"Mirage",
"Warframe"
],
"/Lotus/Powersuits/Harlequin/ObjectChangeAugmentCard": [
"Augment",
"Mirage",
"Warframe"
],
"/Lotus/Powersuits/Harlequin/LightAugmentCard": [
"Augment",
"Mirage",
"Warframe"
],
"/Lotus/Powersuits/Harlequin/IllusionAugmentCard": [
"Augment",
"Mirage",
"Warframe"
],
"/Lotus/Powersuits/Gyre/GyreSphereAugmentCard": [
"Augment",
"Gyre",
"Warframe"
],
"/Lotus/Powersuits/Gyre/GyrePulseAugmentCard": [
"Augment",
"Gyre",
"Warframe"
],
"/Lotus/Powersuits/Gyre/GyreOverchargedAugmentCard": [
"Gyre"
],
"/Lotus/Powersuits/Gyre/GyreEnergizedAugmentCard": [
"Augment",
"Gyre",
"Warframe"
],
"/Lotus/Powersuits/Glass/GlassShatterAugmentCard": [
"Augment",
"Gara",
"Warframe"
],
"/Lotus/Powersuits/Glass/GlassShankAugmentCard": [
"Augment",
"Gara",
"Warframe"
],
"/Lotus/Powersuits/Glass/GlassFragmentAugmentCard": [
"Augment",
"Gara",
"Warframe"
],
"/Lotus/Powersuits/Geode/GeodeGrowthsAugmentCard": [
"Citrine"
],
"/Lotus/Powersuits/Geode/GeodeCrystalAugmentCard": [
"Citrine"
],
"/Lotus/Powersuits/Garuda/GarudaUnstoppableAugmentCard": [
"Garuda"
],
"/Lotus/Powersuits/Garuda/GarudaShieldAugmentCard": [
"Augment",
"Garuda",
"Warframe"
],
"/Lotus/Powersuits/Garuda/GarudaBloodAugmentCard": [
"Garuda"
],
"/Lotus/Powersuits/Frost/IcicleAugmentCard": [
"Augment",
"Frost",
"Warframe"
],
"/Lotus/Powersuits/Frost/IceSpikeAugmentCard": [
"Augment",
"Frost",
"Warframe"
],
"/Lotus/Powersuits/Frost/IceShieldAugmentCard": [
"Augment",
"Frost",
"Warframe"
],
"/Lotus/Powersuits/Frost/FrostPassiveAugmentCard": [
"Frost"
],
"/Lotus/Powersuits/Frost/AvalancheAugmentCard": [
"Augment",
"Frost",
"Warframe"
],
"/Lotus/Powersuits/Fairy/FairyLightAugmentCard": [
"Augment",
"Titania",
"Warframe"
],
"/Lotus/Powersuits/Fairy/FairyFlightAugmentCard": [
"Augment",
"Titania",
"Warframe"
],
"/Lotus/Powersuits/Fairy/FairyDustAugmentCard": [
"Titania"
],
"/Lotus/Powersuits/Fairy/FairyDisablePassiveMod": [
"Augment",
"Exilus",
"Titania",
"Warframe"
],
"/Lotus/Powersuits/Excalibur/SwordOfDoomAugmentCard": [
"Augment",
"Excalibur",
"Warframe"
],
"/Lotus/Powersuits/Excalibur/SlashDashPvPAugmentCard": [
"Augment",
"Excalibur",
"Warframe"
],
"/Lotus/Powersuits/Excalibur/SlashDashAugmentCard": [
"Augment",
"Excalibur",
"Warframe"
],
"/Lotus/Powersuits/Excalibur/RadialJavelinAugmentCard": [
"Augment",
"Excalibur",
"Warframe"
],
"/Lotus/Powersuits/Excalibur/RadialBlindPvPAugmentCard": [
"Augment",
"Excalibur",
"Warframe"
],
"/Lotus/Powersuits/Excalibur/RadialBlindAugmentCard": [
"Augment",
"Excalibur",
"Warframe"
],
"/Lotus/Powersuits/Excalibur/ExcaliburUmbraPassiveAugmentCard": [
"Excalibur Umbra",
"Exilus"
],
"/Lotus/Powersuits/Ember/WorldOnFireAugmentCard": [
"Augment",
"Ember",
"Warframe"
],
"/Lotus/Powersuits/Ember/FireSkinAugmentCard": [
"Augment",
"Ember",
"Warframe"
],
"/Lotus/Powersuits/Ember/FireBlastPvPAugmentCard": [
"Augment",
"Ember",
"Warframe"
],
"/Lotus/Powersuits/Ember/FireBlastAugmentCard": [
"Augment",
"Ember"
],
"/Lotus/Powersuits/Ember/FireBallAugmentCard": [
"Augment",
"Ember",
"Warframe"
],
"/Lotus/Powersuits/Dragon/DragonScalesAugmentTwoCard": [
"Augment",
"Chroma",
"Warframe"
],
"/Lotus/Powersuits/Dragon/DragonScalesAugmentCard": [
"Augment",
"Chroma",
"Warframe"
],
"/Lotus/Powersuits/Dragon/DragonPeltAugmentCard": [
"Augment",
"Chroma",
"Warframe"
],
"/Lotus/Powersuits/Dragon/DragonLuckAugmentCard": [
"Augment",
"Chroma",
"Warframe"
],
"/Lotus/Powersuits/Dragon/DragonBreathAugmentCard": [
"Augment",
"Chroma",
"Warframe"
],
"/Lotus/Powersuits/Devourer/DevourerRegurgitateAugmentCard": [
"Augment",
"Grendel",
"Warframe"
],
"/Lotus/Powersuits/Devourer/DevourerDevourAugmentCard": [
"Grendel"
],
"/Lotus/Powersuits/Devourer/DevourerConsumeAugmentCard": [
"Augment",
"Grendel",
"Warframe"
],
"/Lotus/Powersuits/Devourer/DevourerBowlAugmentCard": [
"Exilus",
"Grendel"
],
"/Lotus/Powersuits/Dagath/DagathApparitionAugmentCard": [
"Augment",
"Dagath"
],
"/Lotus/Powersuits/Cowgirl/RussianRouletteAugmentCard": [
"Augment",
"Mesa",
"Warframe"
],
"/Lotus/Powersuits/Cowgirl/RicochetArmourAugmentCard": [
"Augment",
"Mesa",
"Warframe"
],
"/Lotus/Powersuits/Cowgirl/GunFuPvPAugmentCard": [
"Augment",
"Exilus",
"Mesa",
"Warframe"
],
"/Lotus/Powersuits/Cowgirl/BallisticBatteryAugmentCard": [
"Augment",
"Mesa",
"Warframe"
],
"/Lotus/Powersuits/ConcreteFrame/ConcreteWallAugmentCard": [
"Augment",
"Qorvex"
],
"/Lotus/Powersuits/ConcreteFrame/ConcreteLaserAugmentCard": [
"Augment",
"Qorvex"
],
"/Lotus/Powersuits/Choir/ChoirPoolAugmentCard": [
"Jade"
],
"/Lotus/Powersuits/BrokenFrame/GraspAugmentCard": [
"Xaku"
],
"/Lotus/Powersuits/BrokenFrame/EmbraceAugmentCard": [
"Xaku"
],
"/Lotus/Powersuits/BrokenFrame/BrokenDestructAugmentCard": [
"Xaku"
],
"/Lotus/Powersuits/Brawler/BrawlerSummonPvPAugmentCard": [
"Atlas",
"Augment",
"Warframe"
],
"/Lotus/Powersuits/Brawler/BrawlerSummonAugmentCard": [
"Atlas",
"Augment",
"Warframe"
],
"/Lotus/Powersuits/Brawler/BrawlerPunchAugmentCard": [
"Atlas",
"Augment",
"Warframe"
],
"/Lotus/Powersuits/Brawler/BrawlerPassiveAugmentCard": [
"Atlas",
"Augment",
"Warframe"
],
"/Lotus/Powersuits/Brawler/BrawlerGazeAugmentCard": [
"Atlas",
"Augment",
"Warframe"
],
"/Lotus/Powersuits/Brawler/BrawlerBarrierAugmentCard": [
"Atlas",
"Augment",
"Warframe"
],
"/Lotus/Powersuits/Berserker/ShieldBashAugmentCard": [
"Augment",
"Valkyr",
"Warframe"
],
"/Lotus/Powersuits/Berserker/LastStandPvPAugmentCard": [
"Augment",
"Valkyr",
"Warframe"
],
"/Lotus/Powersuits/Berserker/LastStandAugmentTwoCard": [
"Augment",
"Valkyr",
"Warframe"
],
"/Lotus/Powersuits/Berserker/LastStandAugmentCard": [
"Augment",
"Exilus",
"Valkyr",
"Warframe"
],
"/Lotus/Powersuits/Berserker/IntimidateAugmentCard": [
"Augment",
"Valkyr",
"Warframe"
],
"/Lotus/Powersuits/Berserker/GrappleAugmentCard": [
"Augment",
"Exilus",
"Valkyr",
"Warframe"
],
"/Lotus/Powersuits/Bard/BardMusicAugmentCard": [
"Augment",
"Octavia",
"Warframe"
],
"/Lotus/Powersuits/Bard/BardCharmAugmentCard": [
"Augment",
"Exilus",
"Octavia",
"Warframe"
],
"/Lotus/Powersuits/Banshee/SonarAugmentCard": [
"Augment",
"Banshee",
"Warframe"
],
"/Lotus/Powersuits/Banshee/SilenceAugmentCard": [
"Augment",
"Banshee",
"Warframe"
],
"/Lotus/Powersuits/Banshee/PushAugmentCard": [
"Augment",
"Banshee",
"Warframe"
],
"/Lotus/Powersuits/Banshee/EarthQuakeAugmentCard": [
"Augment",
"Banshee",
"Warframe"
],
"/Lotus/Powersuits/Archwing/StealthJetPack/GravInstabilityAugmentCard": [
"Archwing",
"Augment",
"Itzal"
],
"/Lotus/Powersuits/Archwing/StandardJetPack/FireShieldAugmentCard": [
"Archwing",
"Augment",
"Odonata"
],
"/Lotus/Powersuits/Archwing/DemolitionJetPack/ExhaustTrailAugmentCard": [
"Archwing",
"Augment",
"Elytron"
],
"/Lotus/Powersuits/AntiMatter/WormHoleAugmentCard": [
"Augment",
"Exilus",
"Nova",
"Warframe"
],
"/Lotus/Powersuits/AntiMatter/NullStarAugmentCard": [
"Augment",
"Nova",
"Warframe"
],
"/Lotus/Powersuits/AntiMatter/MolecularPrimeAugmentCard": [
"Augment",
"Nova",
"Warframe"
],
"/Lotus/Powersuits/AntiMatter/AntiMatterDropPvPAugmentCard": [
"Augment",
"Nova"
],
"/Lotus/Powersuits/AntiMatter/AntiMatterDropAugmentCard": [
"Nova"
],
"/Lotus/Powersuits/Alchemist/SerpentAugmentCard": [
"Lavos"
],
"/Lotus/Powersuits/Alchemist/AlchemistTransmuteAugmentCard": [
"Lavos"
],
"/Lotus/Powersuits/Alchemist/AlchemistPassiveAugmentCard": [
"Lavos"
],
"/Lotus/Upgrades/EmpoweredHeavyMelee/TennokaiBaseMod": [
"Exilus",
"Exilus Weapon",
"Melee"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/Expert/ArchwingRifleAmmoMaxModExpert": [
"Archgun",
"Archwing Gun"
],
"/Lotus/Upgrades/Mods/Archwing/Rifle/Expert/ArchwingWeaponFireDamageModExpert": [
"Archgun",
"Archwing Gun",
"Marelok"
],
"/Lotus/Upgrades/Mods/TransmuteCores/BaseTransmuteCore": [
"Transmute"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarPowerToHealthOnDeathMod": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarSlideBoostMod": [
"Exilus",
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/Expert/AvatarAbilityEfficiencyModExpert": [
"Warframe"
],
"/Lotus/Upgrades/Mods/Warframe/AvatarDamageResistanceStun": [
"Warframe"
],
"/Lotus/Weapons/Tenno/Melee/MeleeTrees/StaffCmbOneMeleeTree": [
"Melee",
"Staff",
"Stance",
"Staves"
],
"/Lotus/Types/Sentinels/SentinelPrecepts/LocateCreatures": [
"Oxylus",
"Penjaga",
"Sentinel"
],
"/Lotus/Upgrades/Mods/Railjack/Abilities/CrewShipAttackAbilityCard": [
"Plexus",
"Railjack (Battle, Slot 3)"
],
"/Lotus/Upgrades/Mods/Railjack/Abilities/CrewShipAttractorAbilityCard": [
"Plexus",
"Railjack (Battle, Slot 1)"
],
"/Lotus/Upgrades/Mods/Railjack/Abilities/CrewShipBlackHoleAbilityCard": [
"Plexus",
"Railjack (Battle, Slot 3)"
],
"/Lotus/Upgrades/Mods/Railjack/Abilities/CrewShipEMPAbilityCard": [
"Plexus",
"Railjack (Battle, Slot 1)"
],
"/Lotus/Upgrades/Mods/Railjack/Abilities/CrewShipFlaresAbilityCard": [
"Plexus",
"Railjack (Battle, Slot 1)"
],
"/Lotus/Upgrades/Mods/Railjack/Abilities/CrewShipPhoenixAbilityCard": [
"Plexus",
"Railjack",
"Railjack (Battle, Slot 3)"
],
"/Lotus/Upgrades/Mods/Railjack/Abilities/CrewShipRamAbilityCard": [
"Plexus",
"Railjack (Battle, Slot 2)"
],
"/Lotus/Upgrades/Mods/Railjack/Abilities/CrewShipTetherAbilityCard": [
"Plexus",
"Railjack (Battle, Slot 2)"
],
"/Lotus/Upgrades/Mods/Railjack/Abilities/CrewShipThumperAbilityCard": [
"Plexus",
"Railjack (Battle, Slot 2)"
],
"/Lotus/Upgrades/Mods/Railjack/Engineering/LavanEngineerMatrix": [
"Plexus",
"Railjack Aura"
],
"/Lotus/Upgrades/Mods/Railjack/Engineering/LavanMaxShieldOnKill": [
"Plexus"
],
"/Lotus/Upgrades/Mods/Railjack/Engineering/LavanShieldOnCrit": [
"Plexus"
],
"/Lotus/Upgrades/Mods/Railjack/Engineering/VidarDefensiveMatrix": [
"Plexus",
"Railjack",
"Railjack Aura"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/LavanBypassShieldOrdnance": [
"Plexus",
"Railjack"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/LavanCritBypassShieldTurret": [
"Plexus"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/LavanDamageOnKill": [
"Plexus"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/LavanFastOrdnanceLock": [
"Plexus",
"Railjack"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/LavanFreeOrdnanceAmmo": [
"Plexus"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/LavanMaxOrdnanceMunitions": [
"Plexus"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/LavanOrdnanceDamage": [
"Plexus",
"Railjack"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/LavanOrdnanceSpeed": [
"Plexus"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/LavanProtectiveShots": [
"Plexus",
"Railjack"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/LavanReducedOrdnanceReload": [
"Plexus",
"Railjack"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/VidarCorpusKiller": [
"Plexus"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/VidarGrineerKiller": [
"Plexus"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/VidarGunnerWeaponCritChance": [
"Plexus"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/VidarGunnerWeaponCritDamage": [
"Plexus"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/VidarGunnerWeaponDamage": [
"Plexus"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/VidarOffensiveMatrix": [
"Plexus",
"Railjack Aura"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/VidarSentientKiller": [
"Plexus"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/VidarTurretRangeAndSpeed": [
"Plexus"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/ZektiFreeSuperWeaponAmmo": [
"Plexus"
],
"/Lotus/Upgrades/Mods/Railjack/Gunnery/ZektiSuperWeaponDamage": [
"Plexus"
],
"/Lotus/Upgrades/Mods/Railjack/Piloting/LavanHijackMatrixAura": [
"Plexus",
"Railjack Aura"
],
"/Lotus/Upgrades/Mods/Railjack/Piloting/LavanMultiToolPower": [
"Plexus"
],
"/Lotus/Upgrades/Mods/Railjack/Piloting/ZektiBoostSpeed": [
"Plexus",
"Railjack"
],
"/Lotus/Upgrades/Mods/Railjack/Piloting/ZektiNonCombatSpeed": [
"Plexus"
],
"/Lotus/Upgrades/Mods/Railjack/Piloting/ZektiSiegeMatrixAura": [
"Plexus",
"Railjack Aura"
],
"/Lotus/Upgrades/Mods/Railjack/Piloting/ZektiSpeed": [
"Plexus",
"Railjack"
],
"/Lotus/Upgrades/Mods/Railjack/Tactical/BreachRepair": [
"Plexus",
"Railjack (Tactical, Slot 1)"
],
"/Lotus/Upgrades/Mods/Railjack/Tactical/CrewShipAfterBurnersAbilityCard": [
"Plexus",
"Railjack (Tactical, Slot 3)"
],
"/Lotus/Upgrades/Mods/Railjack/Tactical/CrewShipBattleCraftingAbilityCard": [
"Plexus",
"Railjack (Tactical, Slot 3)"
],
"/Lotus/Upgrades/Mods/Railjack/Tactical/CrewShipDeathBlossomAbilityCard": [
"Plexus",
"Railjack",
"Railjack (Tactical, Slot 2)"
],
"/Lotus/Upgrades/Mods/Railjack/Tactical/CrewShipMassRecallAbilityCard": [
"Plexus",
"Railjack (Tactical, Slot 1)"
],
"/Lotus/Upgrades/Mods/Railjack/Tactical/CrewShipQuadDamageAbilityCard": [
"Plexus",
"Railjack (Tactical, Slot 2)"
],
"/Lotus/Upgrades/Mods/Railjack/Tactical/CrewShipRenewAbilityCard": [
"Plexus",
"Railjack (Tactical, Slot 3)"
],
"/Lotus/Upgrades/Mods/Railjack/Tactical/CrewShipStasisAbilityCard": [
"Plexus",
"Railjack (Tactical, Slot 1)"
],
"/Lotus/Upgrades/Mods/Railjack/Tactical/FireExtinguish": [
"Plexus",
"Railjack (Tactical, Slot 1)"
],
"/Lotus/Upgrades/Mods/Railjack/Tactical/VoidCloak": [
"Plexus",
"Railjack (Tactical, Slot 3)"
]
};
