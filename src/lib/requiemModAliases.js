// DE's old Requiem I-IV relic drop tables still reference these 8 mods by a
// legacy "Immortal" uniqueName, which exists as its own separate, always-
// unowned catalog entry in ExportUpgrades. The mods the player actually owns
// live under a different, modern "Grimoire" uniqueName - the two never match,
// so ownership checks silently look up the wrong (phantom) entry. Map legacy
// -> real so ownership resolves against what the player actually has.
export const REQUIEM_MOD_ALIASES = {
  '/lotus/upgrades/mods/immortal/immortalonemod': '/Lotus/Upgrades/Grimoire/LohkAuraMod',
  '/lotus/upgrades/mods/immortal/immortaltwomod': '/Lotus/Upgrades/Grimoire/XataStrikeMod',
  '/lotus/upgrades/mods/immortal/immortalthreemod': '/Lotus/Upgrades/Grimoire/JahuAuraMod',
  '/lotus/upgrades/mods/immortal/immortalfourmod': '/Lotus/Upgrades/Grimoire/VomeStrikeMod',
  '/lotus/upgrades/mods/immortal/immortalfivemod': '/Lotus/Upgrades/Grimoire/RisStrikeMod',
  '/lotus/upgrades/mods/immortal/immortalsixmod': '/Lotus/Upgrades/Grimoire/FassAuraMod',
  '/lotus/upgrades/mods/immortal/immortalsevenmod': '/Lotus/Upgrades/Grimoire/NetraStrikeMod',
  '/lotus/upgrades/mods/immortal/immortaleightmod': '/Lotus/Upgrades/Grimoire/KhraAuraMod',
};
