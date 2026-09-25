export const regionsDe = [
  { uniqueName: 'SolNodeShadow', name: 'Shadow Station', systemIndex: 9, systemName: 'Tau', nodeType: 0, masteryReq: 3, missionIndex: 12, factionIndex: 2, minEnemyLevel: 20, maxEnemyLevel: 25 },
]

export const regionsMirror = {
  SolNodeShadow: { uniqueName: 'SolNodeShadow', name: '/Lotus/Language/Locations/ShadowStation', systemName: '/Lotus/Language/Locations/Tau', missionType: 'MT_EXTERMINATE', nextNodes: ['SolNodeOther'] },
  SolNodeMirrorOnly: { uniqueName: 'SolNodeMirrorOnly', name: '/Lotus/Language/Locations/MirrorOnly', rewardManifests: ['MirrorRewards'] },
}

export const keysDe = [
  { uniqueName: '/Lotus/Types/Keys/TauPrologue/TauPrologueKeyChainA', name: 'Tau Prologue A', description: 'A test key.', parentName: '', codexSecret: false },
]

export const keysMirror = {
  '/Lotus/Types/Keys/Existing/ExistingKeyChain': { uniqueName: '/Lotus/Types/Keys/Existing/ExistingKeyChain', name: '/Lotus/Language/Existing', chainStages: [{ key: 'stage' }], parentName: '/Lotus/Types/Game/KeyChainItem' },
}

export const fusionBundlesDe = [
  { uniqueName: '/Lotus/Upgrades/Mods/FusionBundles/ShadowEndo', description: 'Consumed to upgrade.', codexSecret: false, fusionPoints: 123 },
]
