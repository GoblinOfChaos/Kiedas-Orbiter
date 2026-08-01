/**
 * warframeUtils.js
 *
 * Shared lookup tables and resolution utilities imported by both
 * inventoryParser.js and worldstateParser.js.
 *
 * Nothing in this file makes network calls or reads from disk.
 * It is purely declarative data + pure functions.
 *
 * KEY EXPORTS
 * ─────────────────────────────────────────
 * GeneralOverrides   - internal key → display string (ally agents, factions, bosses, modifiers)
 * MAPPING_TYPES      - mission type code → display name
 * resolveNode        - resolve a node tag / faction / modifier key to a display string
 * resolveMissionType - resolve a raw mission type value to a display name
 * resolveChallenge   - resolve a Nightwave challenge path to a title
 * resolveChallengeDesc - resolve the body text of a Nightwave challenge
 * resolveRewardText  - turn a reward object into a human-readable string
 * resolveItemName    - resolve an item unique name to a display string
 * resolveAnyImage    - find a usable image URL for an item or reward
 * timeRemaining      - format time until an expiry date
 * timeSince          - format elapsed time since a date
 * formatLastUpdate   - format a timestamp as "today HH:MM" or "Jan 1 HH:MM"
 */

// ─── General Display Overrides ──────────────────────────────────────────
//
// Maps internal key strings (ally agents, faction codes, boss/modifier tags)
// to human-readable display names.
// Used by resolveNode() as a fallback after dictionary lookups.
//
// Groups:
//   Ally Agents (1999/Hex NPCs)
//   Factions
//   Sortie Bosses
//   Archon Hunt Bosses
//   Deep Archimedea overrides
//   Sortie / Mission Modifiers
export const GeneralOverrides = {
  // Ally agents (1999 / Hex)
  'AoiAllyAgent': 'Aoi',
  'ArthurAllyAgent': 'Arthur',
  'QuincyAllyAgent': 'Quincy',
  'EleanorAllyAgent': 'Eleanor',
  'LettieAllyAgent': 'Lettie',
  'AmirAllyAgent': 'Amir',
  // Factions
  'FC_CORPUS': 'Corpus',
  'FC_GRINEER': 'Grineer',
  'FC_INFESTATION': 'Infested',
  'FC_OROKIN': 'Orokin',
  'FC_SENTIENT': 'Sentient',
  'FC_MURMUR': 'The Murmur',
  'FC_NARMON': 'Narmer',
  'FC_NARMER': 'Narmer',
  'FC_MITW': 'The Murmur',
  'FC_TECHROT': 'Techrot',
  'FC_SCALDRA': 'Scaldra',
  'SORTIE_BOSS_HEK': 'Vay Hek',
  'SORTIE_BOSS_RUK': 'Sargas Ruk',
  'SORTIE_BOSS_KELA': 'Kela De Thaym',
  'SORTIE_BOSS_JACKAL': 'The Jackal',
  'SORTIE_BOSS_VOR': 'Captain Vor',
  'SORTIE_BOSS_LECH_KRIL': 'Lieutenant Lech Kril',
  'SORTIE_BOSS_TYL_REGOR': 'Tyl Regor',
  'SORTIE_BOSS_ALAD_V': 'Alad V',
  'SORTIE_BOSS_MUTALIST_ALAD_V': 'Mutalist Alad V',
  'SORTIE_BOSS_NEF': 'Nef Anyo',
  'SORTIE_BOSS_NEF_ANYO': 'Nef Anyo',
  'SORTIE_BOSS_AMBULLAS': 'Ambullas',
  'SORTIE_BOSS_HYYENA_PACK': 'Hyena Pack',
  'SORTIE_BOSS_PHEVOR': 'Phorid',
  'SORTIE_BOSS_LEPHANTIS': 'Lephantis',
  'SORTIE_BOSS_ROPALOLYST': 'The Ropalolyst',
  'SORTIE_BOSS_EXPLOITER': 'Exploiter Orb',
  // Archon Hunt bosses
  'SORTIE_BOSS_AMAR': 'Amar',
  'SORTIE_BOSS_NIRA': 'Nira',
  'SORTIE_BOSS_BOREAL': 'Boreal',
  'SORTIE_BOSS_NIHIL': 'Nihil',

  // Sortie modifiers
  'SORTIE_MODIFIER_POISON': 'Toxin',
  'SORTIE_MODIFIER_SLASH': 'Slash',
  'SORTIE_MODIFIER_LOW_ENERGY': 'Energy Reduction',
  'SORTIE_MODIFIER_ARMOR_REDUCTION': 'Physical Enhancement: Armor',
  'SORTIE_MODIFIER_SHIELD_REDUCTION': 'Shield Reduction',
  'SORTIE_MODIFIER_SHIELDS': 'Shield Disruption',   // seen in live worldstate
  'SORTIE_MODIFIER_ELECTRICAL': 'Electrical Hazard',
  'SORTIE_MODIFIER_FREEZE': 'Cryogenic Leak',
  'SORTIE_MODIFIER_FIRE': 'Fire Hazard',
  'SORTIE_MODIFIER_PHYSICAL_RESIST': 'Physical Resistance',
  'SORTIE_MODIFIER_ELEMENTAL_RESIST': 'Elemental Resistance',
  'SORTIE_MODIFIER_EXTRA_ARMOR': 'Augmented Enemy Armor',
  'SORTIE_MODIFIER_EXTRA_SHIELD': 'Augmented Enemy Shields',
  'SORTIE_MODIFIER_EXIMUS': 'Eximus Stronghold',
  'SORTIE_MODIFIER_HAZARD_RADIATION': 'Radiation Hazard',
  'SORTIE_MODIFIER_HAZARD_FOG': 'Dense Fog',
  'SORTIE_MODIFIER_HAZARD_COLD': 'Cryogenic Leakage',
  'SORTIE_MODIFIER_HAZARD_MAGNETIC': 'Magnetic Storm',
}

// ─── Mission Type Lookup ─────────────────────────────────────────────────
//
// Maps MT_ mission type codes to display names.
// Also includes some legacy text-key overrides (Destroy, Mobile, etc.) that
// appear in older worldstate data and the /Disruption alias for MT_ARTIFACT.
export const MAPPING_TYPES = {
  'MT_MOBILE_DEFENSE': 'Mobile Defense',
  'MT_INTEL': 'Spy',
  'MT_ASSASSINATION': 'Assassination',
  'MT_SABOTAGE': 'Sabotage',
  'MT_SURVIVAL': 'Survival',
  'MT_DEFENSE': 'Defense',
  'MT_EXTERMINATION': 'Extermination',
  'MT_RESCUE': 'Rescue',
  'MT_CAPTURE': 'Capture',
  'MT_EXCAVATION': 'Excavation',
  'MT_HIJACK': 'Hijack',
  'MT_INTERCEPTION': 'Interception',
  'MT_ARTIFACT': 'Disruption',
  'Destroy': 'Sabotage',
  'Survivor': 'Survival',
  'Territory': 'Interception',
  'Retrieval': 'Recovery',
  'Mobile': 'Mobile Defense',
  'Vania': '',
  'Hex': '',
  '1999': '',
}

// Map from MAPPING_TYPES values to /Lotus/Language/Missions/MissionName_{key} dict paths
const MISSION_NAME_KEYS = {
  'Mobile Defense': 'MobileDefense',
  'Spy': 'Spy',
  'Assassination': 'Assassination',
  'Sabotage': 'Sabotage',
  'Survival': 'Survival',
  'Defense': 'Defense',
  'Extermination': 'Exterminate',
  'Rescue': 'Rescue',
  'Capture': 'Capture',
  'Excavation': 'Excavation',
  'Hijack': 'Retrieval',
  'Interception': 'Territory',
  'Disruption': 'Artifact',
  'Recovery': 'Retrieval',
}

const clean = (s) => {
  if (!s || typeof s !== 'string') return ''
  return s.replace(/<[^>]*>/g, '').replace(/\|[^|]*\|/g, '').replace(/\\n/g, ' ').trim()
}


// ─── Warframe Skin Folder Overrides ───────────────────────────────────
//
// Maps the parent folder name of a skin path to the Warframe it belongs to.
// Tennogen / Deluxe skin paths use designer-chosen folder names (e.g. 'Harlequin'
// for the Mirage skin), so we need this to display the correct Warframe name.
// Used by nameFromPath() in both resolveItemName() and inventoryParser.resolveName().

export const DescriptionOverrides = {
  'EMPBlackHole': 'As Rogue Arcocanids charge attacks, they pull Warframes toward them.',
}


// ─── Node / Key Resolution ────────────────────────────────────────────────────

/**
 * Resolve a node tag, faction code, boss key, or modifier identifier to a
 * human-readable display string.
 * Priority: description overrides → dict → ExportRegions → GeneralOverrides →
 *   MAPPING_TYPES → dict tail → prefix formatting → PascalCase → raw string.
 */
export function resolveNode(node, dict, ERg) {
  if (!node) return 'Unknown Node'

  // Check Description Overrides if the key looks like a description request
  const cleanKey = node.replace(/_Desc$/, '').replace(/Desc$/, '');
  if (node.endsWith('_Desc') || node.endsWith('Desc')) {
    if (DescriptionOverrides[cleanKey]) return DescriptionOverrides[cleanKey];
  }

  if (dict[node]) return clean(dict[node])
  if (dict['/' + node]) return clean(dict['/' + node])

  const entry = ERg[node]
  if (entry && entry.name) {
    const res = dict[entry.name] || dict['/' + entry.name]
    if (res) return clean(res)
  }

  const last = node.split('/').at(-1)
  if (GeneralOverrides[last]) return GeneralOverrides[last]
  if (DescriptionOverrides[last]) return DescriptionOverrides[last]
  if (MAPPING_TYPES[last]) return MAPPING_TYPES[last]
  if (dict[last]) return clean(dict[last])
  if (dict['/' + last]) return clean(dict['/' + last])

  // Fallback cleanup
  if (last.startsWith('SORTIE_MODIFIER_')) {
    return last.replace('SORTIE_MODIFIER_', '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }
  if (last.startsWith('SORTIE_BOSS_')) {
    return last.replace('SORTIE_BOSS_', '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }
  if (last.startsWith('MT_')) {
    return last.replace('MT_', '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }
  if (last.startsWith('CT_') || last.startsWith('CD_') || last.startsWith('FC_')) {
    return last.split('_').slice(1).join(' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  // Handle generic CamelCase/PascalCase if no dict entry
  if (/^[A-Z][a-z]+([A-Z][a-z]+)*$/.test(last)) {
    return splitPascal(last)
  }

  return clean(node)
}


/**
 * Resolve a raw mission type value (MT_ code, text alias) to a display name.
 * Wraps resolveNode() and also consults MAPPING_TYPES directly.
 */
export function resolveMissionType(raw, dict, ERg) {
  if (!raw) return ''
  // Try direct mission name lookup in dict first (e.g. /Lotus/Language/Missions/MissionName_MobileDefense)
  const missionKey = `/Lotus/Language/Missions/MissionName_${raw.replace('MT_', '')}`
  if (dict[missionKey]) return clean(dict[missionKey])
  // Fallback to MAPPING_TYPES (hardcoded English) then try to resolve via MISSION_NAME_KEYS
  if (MAPPING_TYPES[raw] !== undefined) {
    const english = MAPPING_TYPES[raw]
    const mk = MISSION_NAME_KEYS[english]
    if (mk) {
      const localized = dict[`/Lotus/Language/Missions/MissionName_${mk}`]
      if (localized) return clean(localized)
    }
    return english
  }
  const resolved = resolveNode(raw, dict, ERg)
  const english = MAPPING_TYPES[resolved]
  if (english !== undefined) {
    const mk = MISSION_NAME_KEYS[english]
    if (mk) {
      const localized = dict[`/Lotus/Language/Missions/MissionName_${mk}`]
      if (localized) return clean(localized)
    }
    return english
  }
  return resolved
}


// ─── Nightwave / Challenge Resolution ─────────────────────────────────

/**
 * Resolve a Nightwave challenge path to its title string.
 * Tries dict, ExportChallenges, then falls back to formatting the path leaf.
 */
export function resolveChallenge(path, dict, EC) {
  if (!path) return 'Bounty'

  if (dict[path]) return clean(dict[path])
  if (dict['/' + path]) return clean(dict['/' + path])

  const entry = EC[path]
  if (entry && entry.name) {
    const res = dict[entry.name] || dict['/' + entry.name]
    if (res) return clean(res)
  }

  const last = path.split('/').at(-1)
  if (GeneralOverrides[last]) return GeneralOverrides[last]
  return last.replace(/Challenge$/, '').replace(/([A-Z])/g, ' $1').trim()
}

// ─── Bounty Challenge Display Name ─────────────────────────────────────

// Filler words stripped from bounty challenge filenames for clean display.
// Includes path-structure-only tokens, tier/rotation markers, and abbreviations
// that don't carry meaning for the user-facing bounty name.
const BOUNTY_FILLER = new Set([
  'Bounty', 'Cap', 'Ext', 'Lib', 'Sab', 'Cache', 'Two', 'Props', 'Easy',
  'Normal', 'Hard', 'Elite', 'X', 'Tent', 'Job', 'Key', 'Pieces', 'Crp',
  'Grn', 'Endless', 'Chamber',
  // Syndicate / area prefixes
  'Vania', 'Hex', '1999', 'Venus', 'Deimos', 'Narmer', 'Cetus', 'Solaris',
])
/**
 * Strips filler words and syndicate prefixes that are meaningless to the user,
 * leaving mission-type descriptors (e.g. "Capture", "Area Defense", "Cull Resource").
 * Falls back to the cleanest available representation when everything is filler.
 */
export function cleanBountyName(path) {
  if (!path) return 'Bounty'
  const fn = path.split('/').pop()
  const words = fn.replace(/([A-Z])/g, ' $1').trim().split(/\s+/)
  const sig = words.filter(w => !BOUNTY_FILLER.has(w))
  // Deduplicate consecutive identical words (e.g. "Spy Spy" → "Spy")
  const deduped = sig.filter((w, i) => i === 0 || w !== sig[i - 1])
  if (deduped.length > 0) return deduped.join(' ')
  // All words are filler — fall back to first meaningful looking chunk
  return words.filter(w => w.length > 1).join(' ') || words[0] || 'Bounty'
}

// Deimos jobType leaves (e.g. DeimosExcavateBounty) abbreviate the mission
// type inside the dict key (DeimosBountyExcavName); map the few known forms.
const DEIMOS_BOUNTY_ABBR = {
  Excavate: 'Excav',
  CrpSurvivor: 'CrpSurv',
  GrnSurvivor: 'GrnSurv',
  KeyPieces: 'Keys',
  AreaDefense: 'AreaDef',
  Assassinate: 'Assass',
  Purify: 'Purify',
}

/**
 * Resolve an open-world bounty jobType path to its official localized title
 * (e.g. /Lotus/Types/Gameplay/Eidolon/Jobs/AttritionBountyExt →
 * "CULL THE ENEMY"). The game dict stores these under three different key
 * schemes per syndicate:
 *   - Cetus:    /Lotus/Language/OstronJobs/{leaf}Title
 *   - Vallis:   /Lotus/Language/SolarisJobs/{leaf minus Venus prefix}Title
 *   - Deimos:   /Lotus/Language/InfestedMicroplanet/DeimosBounty{Type}Name
 * Returns '' when the path isn't a known bounty job (caller falls back).
 */
export function resolveBountyTitle(path, dict) {
  if (!path || !dict) return ''
  const leaf = path.split('/').pop()
  if (!leaf) return ''
  // Cetus / Ostron
  let key = `/Lotus/Language/OstronJobs/${leaf}Title`
  let res = dict[key] || dict['/' + key]
  if (res && !res.startsWith('/Lotus/')) return clean(res)

  // Vallis / Solaris (leaf may be Venus{...} or NarmerVenus{...})
  const solarisLeaf = leaf.replace(/^(Narmer)?Venus/, '')
  key = `/Lotus/Language/SolarisJobs/${solarisLeaf}Title`
  res = dict[key] || dict['/' + key]
  if (!res && solarisLeaf.endsWith('s')) {
    // e.g. VenusHelpingJobCaches → HelpingJobCacheTitle (dict uses singular)
    const singular = solarisLeaf.slice(0, -1)
    key = `/Lotus/Language/SolarisJobs/${singular}Title`
    res = dict[key] || dict['/' + key]
  }
  if (res && !res.startsWith('/Lotus/')) return clean(res)

  // Deimos / Entrati
  const m = leaf.match(/^Deimos(.+)Bounty$/)
  if (m) {
    const type = DEIMOS_BOUNTY_ABBR[m[1]] ?? m[1]
    key = `/Lotus/Language/InfestedMicroplanet/DeimosBounty${type}Name`
    res = dict[key] || dict['/' + key]
    if (res && !res.startsWith('/Lotus/')) return clean(res)
  }

  return ''
}
export function resolveChallengeDesc(path, dict, EC, ERg, allyPath = '') {
  if (!path) return ''
  const entry = EC[path]
  let res = ''

  // 1. Try specified description key in EC
  if (entry && entry.description) {
    res = dict[entry.description] || dict['/' + entry.description] || ''
  }

  // 2. Try replacing _Name with _Description (standard pattern)
  if (!res && entry && entry.name && entry.name.endsWith('_Name')) {
    const descKey = entry.name.replace('_Name', '_Description')
    res = dict[descKey] || dict['/' + descKey] || ''
  }

  // 3. Fallback to direct dictionary resolution based on path
  if (!res) {
    const last = path.split('/').at(-1)
    res = dict[path + '_Description'] || dict['/' + path + '_Description'] ||
          dict[path + '_Desc'] || dict['/' + path + '_Desc'] ||
          dict[last + '_Description'] || dict[last + '_Desc'] || ''
  }

  if (res) {
    // Strip OPEN_COLOR/CLOSE_COLOR marketing labels and the bare |ALLY| Bounty
    // token BEFORE clean() (which would otherwise leave stray " Bounty"/
    // "Antivirus Bounty" fragments), then substitute |COUNT| before it too.
    res = res.replace(/\|OPEN_COLOR\|.*?\|CLOSE_COLOR\|/gs, '')
    res = res.replace(/\|ALLY\|\s+Bounty/gi, '')
    if (allyPath) {
      const allyName = resolveNode(allyPath, dict, ERg) || ''
      res = res.replace(/\|ALLY\|/g, allyName)
    }
    res = res.replace(/\|COUNT\|/g, entry?.requiredCount || '')
    res = clean(res)
    return res.replace(/\|[^|]*\|/g, '').replace(/\/[L|l]otus\/[^ ]*/g, '').trim()
  }

  return ''
}


/**
 * Resolve a Nightwave challenge's flavour (lore) text.
 * Returns '' if no flavour entry exists in ExportChallenges.
 */
export function resolveChallengeFlavour(path, dict, EC, ERg, allyPath = '') {
  if (!path) return ''
  const entry = EC[path]
  if (entry && entry.flavour) {
    let res = dict[entry.flavour] || dict['/' + entry.flavour]
    if (res) {
      // Substitute |ALLY| BEFORE clean() strips it as markup, otherwise the
      // flavor loses its subject (e.g. "Eleanor needs sniper cover" -> bare
      // "needs sniper cover for this mission.").
      if (allyPath) {
        const allyName = resolveNode(allyPath, dict, ERg) || ''
        res = res.replace(/\|ALLY\|/g, allyName)
      }
      res = clean(res)
      return res.replace(/\|[^|]*\|/g, '').trim()
    }
  }
  return ''
}


// ─── Reward / Item Resolution ──────────────────────────────────────────

/**
 * Turn a Warframe reward object ({items, countedItems, itemString}) into a
 * human-readable comma-separated string (or the chosen separator).
 * Returns null if the reward object is empty / unresolvable.
 */
export function resolveRewardText(reward, dict, ERg, uniqueNameToName = {}, sep = ', ') {
  if (!reward) return null
  const cItems = reward.countedItems ?? reward.CountedItems ?? []
  const rawItems = reward.items ?? reward.Items ?? []

  const resolveNameStr = (name) => {
    if (!name) return ''
    if (name.startsWith('/Lotus/')) {
      const resolved = resolveItemName(name, dict, uniqueNameToName)
      if (resolved && !resolved.startsWith('/Lotus/')) return resolved
      return resolveNode(name, dict, ERg)
    }
    return name
  }

  const parts = []
  rawItems.forEach(it => {
    const resolved = resolveNameStr(it)
    if (resolved) parts.push(resolved)
  })
  cItems.forEach(ci => {
    const name = ci.type?.name ?? ci.ItemType ?? ci.type ?? ci.key ?? ''
    const resolved = resolveNameStr(name)
    if (resolved) {
      const count = ci.count ?? ci.ItemCount ?? 1
      parts.push((count > 1 ? `${count}× ` : '') + resolved)
    }
  })

  if (parts.length > 0) return parts.join(sep)

  let fb = reward.itemString || reward.asString || null
  if (fb && fb.startsWith('/Lotus/')) {
    const resolved = resolveItemName(fb, dict, uniqueNameToName)
    if (resolved && !resolved.startsWith('/Lotus/')) return resolved
    fb = resolveNode(fb, dict, ERg)
  }
  return fb
}

const FOLDER_OVERRIDES = {
  Harlequin: 'Mirage', Pirate: 'Hydroid', Tengu: 'Zephyr',
  Paladin: 'Oberon', Berserker: 'Valkyr', Priest: 'Trinity',
  Sandman: 'Equinox', Ranger: 'Ivara', AntiMatter: 'Limbo',
  Pacifist: 'Baruuk', Magician: 'Nyx', YinYang: 'Equinox',
  Trapper: 'Khora', Necro: 'Nekros', Dragon: 'Chroma',
  Brawler: 'Atlas', Cowgirl: 'Cyte-09',
  BrokenFrame: 'Broken Warframe',
  ConcreteFrame: 'Kullervo',
  Alchemist: 'Citrine', PaxDuviricus: 'Voruna',
  Infestation: 'Nidus', Geode: 'Gauss',
  IronFrame: 'Styanax', Frumentarius: 'Grendel',
  Devourer: 'Lavos', Choir: 'Octavia',
  Bard: 'Octavia', Odalisk: 'Caliban',
  Pagemaster: 'Xaku', Werewolf: 'Voruna',
  Glass: 'Gara', Temple: 'Whisper',
  Fairy: 'Wisp', Jade: 'Nyx',
};

// NAME_OVERRIDES is no longer needed — all previously-overridden items are
// either hidden (MuseumDogTag, TestPartItem) or resolved by the game dict.

// Riven stat name translations — the dict doesn't contain these, so we maintain
// a small manual table for the most common stats. Keyed by the English stat name.
const RIVEN_STAT_TRANSLATIONS = {
  'Melee Damage': { uk: 'Урон ближнього бою', fr: 'Dégâts mélée', de: 'Nahkampfschaden', es: 'Daño cuerpo a cuerpo', ru: 'Урон ближнего боя', zh: '近战伤害', ja: '近接ダメージ', ko: '근접 데미지', pt: 'Dano Corpo a Corpo', tr: 'Yakın Hasar', th: 'ดาเมจประชาน', pl: 'Obrażenia z bliskiego walki', it: 'Danni corpo a corpo', en: 'Melee Damage' },
  'Critical Chance': { uk: 'Шанс кріт. удару', fr: 'Chance de critique', de: 'Kritische Trefferchance', es: 'Prob. crítico', ru: 'Шанс крит. попадания', zh: '暴击率', ja: 'クリティカル率', ko: '치명타 확률', pt: 'Chance Crítica', tr: 'Kritik Şans', th: 'โอกาสวิกฆาต', pl: 'Szansa krytyczna', it: 'Probabilità critica', en: 'Critical Chance' },
  'Critical Damage': { uk: 'Кріт. урон', fr: 'Dégâts critiques', de: 'Kritischer Schaden', es: 'Daño crítico', ru: 'Крит. урон', zh: '暴击伤害', ja: 'クリティカルダメージ', ko: '치명타 데미지', pt: 'Dano Crítico', tr: 'Kritik Hasar', th: 'ดาเมจวิกฆาต', pl: 'Obrażenia krytyczne', it: 'Danni critici', en: 'Critical Damage' },
  'Attack Speed': { uk: 'Швидкість атаки', fr: 'Vitesse d\'attaque', de: 'Angriffsgeschwindigkeit', es: 'Velocidad de ataque', ru: 'Скорость атаки', zh: '攻击速度', ja: '攻撃速度', ko: '공격 속도', pt: 'Velocidade de Ataque', tr: 'Saldırı Hızı', th: 'ความเร็วการโจมย์', pl: 'Prędkość ataku', it: 'Velocità di attacco', en: 'Attack Speed' },
  'Status Chance': { uk: 'Шанс статусу', fr: 'Chance de statut', de: 'Status-Chance', es: 'Prob. de estado', ru: 'Шанс статуса', zh: '状态几率', ja: 'ステータス発生率', ko: '상태 확률', pt: 'Chance de Status', tr: 'Durum Şansı', th: 'โอกาสสถานะ', pl: 'Szansa na status', it: 'Probabilità stato', en: 'Status Chance' },
  'Damage': { uk: 'Урон', fr: 'Dégâts', de: 'Schaden', es: 'Daño', ru: 'Урон', zh: '伤害', ja: 'ダメージ', ko: '데미지', pt: 'Dano', tr: 'Hasar', th: 'ดาเมจ', pl: 'Obrażenia', it: 'Danni', en: 'Damage' },
  'Puncture': { uk: 'Проникання', fr: 'Perforation', de: 'Durchdringung', es: 'Perforación', ru: 'Проникание', zh: '穿透', ja: '貫通', ko: '관통', pt: 'Perfuração', tr: 'Delme', th: 'ทฤษฎีบังคับ', pl: 'Przenikanie', it: 'Perforazione', en: 'Puncture' },
  'Slash': { uk: 'Різання', fr: 'Balafrure', de: 'Schlitz', es: 'Corte', ru: 'Резание', zh: '挥砍', ja: 'スラッシュ', ko: '슬래시', pt: 'Corte', tr: 'Kesme', th: 'การผ่า', pl: 'Rozcięcie', it: 'Fendente', en: 'Slash' },
  'Impact': { uk: 'Вплив', fr: 'Impact', de: 'Aufprall', es: 'Impacto', ru: 'Воздействие', zh: '冲击', ja: 'インパクト', ko: '충격', pt: 'Impacto', tr: 'Etki', th: 'กระแทก', pl: 'Wpływ', it: 'Impatto', en: 'Impact' },
  'Electricity': { uk: 'Електрика', fr: 'Électricité', de: 'Elektrizität', es: 'Electricidad', ru: 'Электричество', zh: '电伤', ja: '電気', ko: '전기', pt: 'Eletricidade', tr: 'Elektrik', th: 'ไฟฟ้า', pl: 'Elektryczność', it: 'Elettricità', en: 'Electricity' },
  'Heat': { uk: 'Тепло', fr: 'Chaleur', de: 'Wärme', es: 'Calor', ru: 'Тепло', zh: '热伤', ja: 'ヒート', ko: '열기', pt: 'Calor', tr: 'Isı', th: 'ความร้อน', pl: 'Ciepło', it: 'Calore', en: 'Heat' },
  'Cold': { uk: 'Холод', fr: 'Froid', de: 'Kälte', es: 'Frío', ru: 'Холод', zh: '冰伤', ja: 'コールド', ko: '냉기', pt: 'Friagem', tr: 'Soğuk', th: 'เย็น', pl: 'Zimno', it: 'Freddo', en: 'Cold' },
  'Toxin': { uk: 'Токсини', fr: 'Toxique', de: 'Gift', es: 'Veneno', ru: 'Токсины', zh: '毒伤', ja: '毒', ko: '독성', pt: 'Toxina', tr: 'Zehir', th: 'สารอันตราย', pl: 'Toksyny', it: 'Veleno', en: 'Toxin' },
  'Recoil': { uk: 'Відбив', fr: 'Recul', de: 'Rückstoß', es: 'Retroceso', ru: 'Отдача', zh: '后坐', ja: '反動', ko: '반동', pt: 'Recuo', tr: 'Geri Dönüş', th: 'การดังกับ', pl: 'Odrzut', it: 'Rinculo', en: 'Recoil' },
  'Reload Speed': { uk: 'Швидкість перезарядки', fr: 'Vitesse de rechargement', de: 'Ladezeit', es: 'Velocidad de recarga', ru: 'Скорость перезарядки', zh: '装填速度', ja: 'リロード速度', ko: '재장전 속도', pt: 'Velocidade de Recarga', tr: 'Şarj Hızı', th: 'ความเร็วการโหลด', pl: 'Szybkość przeładowania', it: 'Velocità di ricarica', en: 'Reload Speed' },
  'Magazine Capacity': { uk: 'Ємність магазину', fr: 'Capacité du chargeur', de: 'Magazingröße', es: 'Capacidad del cargador', ru: 'Ёмкость магазина', zh: '弹夹容量', ja: 'マガジン容量', ko: '탄창 용량', pt: 'Capacidade do Carregador', tr: 'Şarjörlü Kapasite', th: 'ความจุรายการ', pl: 'Pojemność magazynka', it: 'Capacità del caricatore', en: 'Magazine Capacity' },
  'Ammo Maximum': { uk: 'Макс. боєприпасів', fr: 'Munitions max', de: 'Max. Munition', es: 'Munición máxima', ru: 'Макс. патронов', zh: '最大弹药', ja: '弾薬最大量', ko: '최대 탄약', pt: 'Munição Máxima', tr: 'Maks. Müzik', th: 'ราม์สูงสุด', pl: 'Maks. amunicja', it: 'Munizione massima', en: 'Ammo Maximum' },
  'Multishot': { uk: 'Мультистріл', fr: 'Multi-coups', de: 'Mehrfachschuss', es: 'Disparo múltiple', ru: 'Мультистрел', zh: '多重射击', ja: 'マルチショット', ko: '멀티샷', pt: 'Tiro Múltiplo', tr: 'Çoklu Atış', th: 'การยิงหลายครั้ง', pl: 'Wielokrotne strzały', it: 'Tiro multiplo', en: 'Multishot' },
  'Punch Through': { uk: 'Пробивання', fr: 'Perçage', de: 'Durchdringung', es: 'Perforación', ru: 'Пробивание', zh: '穿透', ja: 'パンチスルー', ko: '돌진', pt: 'Perfuração', tr: 'Delme', th: 'ทฤษฎีบังคับ', pl: 'Przenikanie', it: 'Perforazione', en: 'Punch Through' },
  'Zoom': { uk: 'Зум', fr: 'Zoom', de: 'Zoom', es: 'Zoom', ru: 'Зум', zh: '变焦', ja: 'ズーム', ko: '줌', pt: 'Zoom', tr: 'Yakınlaştırma', th: 'ซูม', pl: 'Zoom', it: 'Zoom', en: 'Zoom' },
  'Blast Radius': { uk: 'Радіус вибуху', fr: 'Rayon d\'explosion', de: 'Explosionsradius', es: 'Radio de explosión', ru: 'Радиус взрыва', zh: '爆炸半径', ja: '爆破半径', ko: '폭발 반경', pt: 'Raio de Explosão', tr: 'Patlama Yarıçapı', th: 'รัศมีการระเบิด', pl: 'Promień eksplozji', it: 'Raggio di esplosione', en: 'Blast Radius' },
  'Range': { uk: 'Дальність', fr: 'Portée', de: 'Reichweite', es: 'Alcance', ru: 'Дальность', zh: '范围', ja: '射程', ko: '사거리', pt: 'Alcance', tr: 'Menzil', th: 'ระยะ', pl: 'Zasięg', it: 'Portata', en: 'Range' },
  'Status Duration': { uk: 'Тривалість статусу', fr: 'Durée du statut', de: 'Status-Dauer', es: 'Duración de estado', ru: 'Длительность статуса', zh: '状态持续时间', ja: 'ステータス時間', ko: '상태 지속시간', pt: 'Duração de Status', tr: 'Durum Süresi', th: 'ระยะเวลาสถานะ', pl: 'Czas trwania statusu', it: 'Durata dello stato', en: 'Status Duration' },
  'Damage to Corpus': { uk: 'Урон по Корпусу', fr: 'Dégâts aux Corpus', de: 'Schaden gegen Corpus', es: 'Daño a Corpus', ru: 'Урон по Корпусу', zh: '对 Corpus 伤害', ja: 'Corpus へのダメージ', ko: 'Corpus 대항 데미지', pt: 'Dano aos Corpus', tr: 'Corpus\'a Hasar', th: 'ดาเมจต่อ Corpus', pl: 'Obrażenia wobec Corpus', it: 'Danni ai Corpus', en: 'Damage to Corpus' },
  'Damage to Grineer': { uk: 'Урон по Грінеерам', fr: 'Dégâts aux Grineer', de: 'Schaden gegen Grineer', es: 'Daño a Grineer', ru: 'Урон по Гринеерам', zh: '对 Grineer 伤害', ja: 'Grineer へのダメージ', ko: 'Grineer 대항 데미지', pt: 'Dano aos Grineer', tr: 'Grineer\'a Hasar', th: 'ดาเมจต่อ Grineer', pl: 'Obrażenia wobec Grineer', it: 'Danni ai Grineer', en: 'Damage to Grineer' },
  'Damage to Infested': { uk: 'Урон по Зараженим', fr: 'Dégâts aux Infestés', de: 'Schaden gegen Infested', es: 'Daño a Infested', ru: 'Урон по Зараженным', zh: '对 Infested 伤害', ja: 'Infested へのダメージ', ko: 'Infested 대항 데미지', pt: 'Dano aos Infestados', tr: 'Infested\'e Hasar', th: 'ดาเมจต่อ Infested', pl: 'Obrażenia wobec Infested', it: 'Danni agli Infested', en: 'Damage to Infested' },
  'Combo Duration': { uk: 'Тривалість комбо', fr: 'Durée du combo', de: 'Combo-Dauer', es: 'Duración del combo', ru: 'Длительность комбо', zh: '连击持续时间', ja: 'コンボ時間', ko: '콤보 지속시간', pt: 'Duração do Combo', tr: 'Kombo Süresi', th: 'ระยะเวลาคอมโบ', pl: 'Czas trwania combo', it: 'Durata del combo', en: 'Combo Duration' },
  'Initial Combo': { uk: 'Початкове комбо', fr: 'Combo initial', de: 'Anfangs-Kombo', es: 'Combo inicial', ru: 'Начальное комбо', zh: '初始连击', ja: '初期コンボ', ko: '초기 콤보', pt: 'Combo Inicial', tr: 'Başlangıç Kombo', th: 'คอมโบเริ่มต้น', pl: 'Początkowe combo', it: 'Combo iniziale', en: 'Initial Combo' },
  'Combo Count': { uk: 'Рахунок комбо', fr: 'Compteur de combo', de: 'Combo-Zähler', es: 'Conteo de combo', ru: 'Счётчик комбо', zh: '连击计数', ja: 'コンボカウント', ko: '콤보 카운트', pt: 'Contagem de Combo', tr: 'Kombo Sayısı', th: 'จำนวนคอมโบ', pl: 'Licznik combo', it: 'Contatore combo', en: 'Combo Count' },
  'Combo Efficiency': { uk: 'Ефективність комбо', fr: 'Efficacité du combo', de: 'Combo-Effizienz', es: 'Eficiencia del combo', ru: 'Эффективность комбо', zh: '连击效率', ja: 'コンボ効率', ko: '콤보 효율성', pt: 'Eficiência do Combo', tr: 'Kombo Verimliliği', th: 'ประสิทธิภาพคอมโบ', pl: 'Efektywność combo', it: 'Efficienza del combo', en: 'Combo Efficiency' },
  'Finisher Damage': { uk: 'Урон фінішера', fr: 'Dégâts de finisseur', de: 'Finisher-Schaden', es: 'Daño de finalizador', ru: 'Урон финишера', zh: '终结技伤害', ja: 'フィニッシャーダメージ', ko: '피니셔 데미지', pt: 'Dano de Finalizador', tr: 'Final Hasar', th: 'ดาเมจฟินิชเซอร์', pl: 'Obrażenia finalizera', it: 'Danni finalizzatori', en: 'Finisher Damage' },
  'Projectile Speed': { uk: 'Швидкість снаряду', fr: 'Vitesse de projectile', de: 'Projektilgeschwindigkeit', es: 'Velocidad del proyectil', ru: 'Скорость снаряда', zh: '投射物速度', ja: '投射物速度', ko: '탄환 속도', pt: 'Velocidade do Projétil', tr: 'Mühimmat Hızı', th: 'ความเร็วของผลักษ์', pl: 'Prędkość pocisku', it: 'Velocità del proiettile', en: 'Projectile Speed' },
  'Beam Length': { uk: 'Довжина луча', fr: 'Longueur du faisceau', de: 'Strahllänge', es: 'Longitud del haz', ru: 'Длина луча', zh: '光束长度', ja: 'ビーム長', ko: '빔 길이', pt: 'Comprimento do Feixe', tr: 'Işın Uzunluğu', th: 'ความยาวแสง', pl: 'Długość wiązki', it: 'Lunghezza del fascio', en: 'Beam Length' },
  'Slide Crit Chance': { uk: 'Шанс кріт. удару під час ковзання', fr: 'Chance de critique glissade', de: 'Slide-Krit-Chance', es: 'Prob. crítico al resbalar', ru: 'Шанс крит. удара при скольжении', zh: '滑行暴击率', ja: 'スライドクリティカル率', ko: '슬라이드 치명타 확률', pt: 'Chance Crítica ao Deslizar', tr: 'Kaydırma Kritik Şansı', th: 'โอกาสวิกฆาตขณะเลียน', pl: 'Szansa krytyczna podczas ślizgu', it: 'Probabilità critica scivolata', en: 'Slide Crit Chance' },
}
export { RIVEN_STAT_TRANSLATIONS }

const PART_SUFFIX_RE = /(Blueprint|Barrel|Receiver|Stock|Handle|Grip|String|Upper\s?Limb|Lower\s?Limb|Blade|Hilt|Gauntlet|Boot|Pouch|Stars|Band|Head|Carapace|Cerebrum|Systems|Chassis|Neuroptics)$/i;

const BOOSTER_NAME_MAP = {
  'ResourceAmount3Day': '3 Day Resource Booster',
  'ResourceDropChance3Day': '3 Day Resource Drop Chance Booster',
  'Affinity3Day': '3 Day Affinity Booster',
  'Credit3Day': '3 Day Credit Booster',
  'ModDropChance3Day': '3 Day Mod Drop Chance Booster',
  'ResourceAmount7Day': '7 Day Resource Booster',
  'ResourceDropChance7Day': '7 Day Resource Drop Chance Booster',
  'Affinity7Day': '7 Day Affinity Booster',
  'Credit7Day': '7 Day Credit Booster',
  'ModDropChance7Day': '7 Day Mod Drop Chance Booster',
  'ResourceAmount30Day': '30 Day Resource Booster',
  'ResourceDropChance30Day': '30 Day Resource Drop Chance Booster',
  'Affinity30Day': '30 Day Affinity Booster',
  'Credit30Day': '30 Day Credit Booster',
  'ModDropChance30Day': '30 Day Mod Drop Chance Booster',
  'ResourceAmount': 'Resource Booster',
  'ResourceDropChance': 'Resource Drop Chance Booster',
  'Affinity': 'Affinity Booster',
  'Credit': 'Credit Booster',
  'ModDropChance': 'Mod Drop Chance Booster',
}

export { BOOSTER_NAME_MAP };

function splitPascal(str) {
  return str
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
}
export { splitPascal };

function nameFromPath(path = '') {
  const parts = path.split('/').filter(Boolean);
  const leaf = parts.at(-1) ?? path;
  const folder = parts.at(-2) ?? '';
  // NAME_OVERRIDES was removed — all items it covered are hidden or dict-resolved

  if (FOLDER_OVERRIDES[folder]) {
    const suffix = leaf.match(/(Prime|Vandal|Wraith|Prisma|Kuva|Tenet|Umbra)$/i)?.[0] ?? '';
    const bp = leaf.endsWith('Blueprint') ? ' Blueprint' : '';
    return FOLDER_OVERRIDES[folder] + (suffix ? ' ' + suffix : '') + bp;
  }

  const stripped = leaf
    .replace(/(BaseSuit|PowerSuit|PrimeName|OperatorAmp|HoverboardSuit|MotorcyclePowerSuit|MoaPetPowerSuit|Blueprint)$/, '');
  const name = splitPascal(stripped).trim() || leaf;
  return leaf.endsWith('Blueprint') && !name.endsWith('Blueprint') ? name + ' Blueprint' : name;
}


/**
 * Resolve an item unique name (e.g. /Lotus/Weapons/Tenno/Rifle/Latron) to a
 * display name string.  Resolution order:
 *  1. uniqueNameToName map → dict localisation
 *  2. Direct dict lookup
 *  3. nameFromPath() fallback
 */
export function resolveItemName(path, dict, uniqueNameToName) {
  if (!path) return ''

  const isBlueprint = path.includes('/Recipes/') || path.endsWith('Blueprint');

  // Handle StoreItem paths by trying to resolve the actual item
  let actualPath = path;
  if (path.startsWith('/Lotus/StoreItems/')) {
    actualPath = path.replace('/StoreItems/', '/');
  }

  const lookup = (p) => {
    if (!uniqueNameToName || !uniqueNameToName[p]) return null;
    const locKey = uniqueNameToName[p];
    const res = dict[locKey] || dict['/' + locKey];
    if (res && !res.startsWith('/Lotus/')) return clean(res);
    if (locKey && !locKey.startsWith('/Lotus/')) return clean(locKey);
    return null;
  };

  let resolved = null;
  // 1. Try actualPath (mapped)
  resolved = lookup(actualPath);

  // 2. Try raw path
  if (!resolved) {
    resolved = lookup(path);
  }

  // 3. Try dict directly
  if (!resolved) {
    const d1 = dict[actualPath] || dict['/' + actualPath] || dict[path] || dict['/' + path];
    if (d1 && typeof d1 === 'string' && !d1.startsWith('/Lotus/')) resolved = clean(d1);
  }


  // 4. Try matching dict keys by leaf name (for StoreItem paths that follow
  //    the pattern /Lotus/Language/{Category}/{Leaf}Name)
  if (!resolved) {
    const leaf = path.split('/').pop();
    const leafNorm = leaf.replace(/StoreItem$/i, '').toLowerCase();
    for (const [key, val] of Object.entries(dict)) {
      if (typeof val !== 'string' || val.startsWith('/Lotus/') || !key.endsWith('Name')) continue;
      if (key.split('/').pop().replace(/Name$/, '').toLowerCase() === leafNorm) {
        resolved = clean(val);
        break;
      }
    }
  }

  // 4b. Fallback for known booster patterns (dict uses different naming
  //     conventions than StoreItem paths, e.g. "ThreeDay" vs "3Day")
  if (!resolved) {
    const leaf = path.split('/').pop().replace(/StoreItem$/i, '');
    if (BOOSTER_NAME_MAP[leaf]) {
      resolved = BOOSTER_NAME_MAP[leaf];
    }
    if (!resolved) {
      for (const [key, name] of Object.entries(BOOSTER_NAME_MAP)) {
        if (leaf.startsWith(key)) {
          resolved = name; break;
        }
      }
    }
  }

  // 5. nameFromPath (fallback)
  if (!resolved) {
    const n = nameFromPath(actualPath);
    if (n && !n.startsWith('/Lotus/')) resolved = n;
  }

  if (!resolved) resolved = clean(path);

  if (isBlueprint && !resolved.toLowerCase().includes('blueprint')) {
    return resolved + ' Blueprint';
  }

  return resolved;
}


/**
 * Find a usable image URL for an item or reward object.
 * Checks EI (uniqueName → browse.wf URL), nameToImage (lowercase name → URL),
 * and falls back through recipe path → weapon path transformations.
 * Returns null if no image is found.
 */
export function resolveAnyImage(rewardOrItem, EI, nameToImage, uniqueNameToName = {}) {
  if (!rewardOrItem) return null
  const byName = (s) => {
    if (!s || typeof s !== 'string') return null
    return EI[s] ?? nameToImage[s.toLowerCase()] ?? null
  }

  let item = rewardOrItem;
  if (typeof rewardOrItem === 'string') {
    item = rewardOrItem;
  } else {
    item = rewardOrItem.uniqueName || rewardOrItem.unique_name || rewardOrItem.ItemType || rewardOrItem.StoreItem || rewardOrItem.item || '';
  }

  if (typeof item !== 'string') return null;

  // Helper: Try to resolve image for a path, with blueprint → base-item fallback
  const resolve = (p) => {
    if (!p) return null
    // Direct lookup first
    const direct = byName(p)
    if (direct) return direct
    // Blueprint path: /Lotus/Types/Recipes/.../FooBlueprint
    // EI is keyed by weapon paths, not recipe paths - look up by resolved name instead
    if (p.includes('/Recipes/') || p.endsWith('Blueprint') || PART_SUFFIX_RE.test(p)) {
      // 1. Resolve the item's display name via dict, strip suffixes, look up by name
      const locKey = uniqueNameToName[p]
      if (locKey) {
        const cleanName = locKey.replace(PART_SUFFIX_RE, '').trim()
        const byResolvedName = nameToImage[cleanName.toLowerCase()]
        if (byResolvedName) return byResolvedName
      }

      // 2. Use nameFromPath which splits pascal case, then strip suffixes
      const nfp = nameFromPath(p)
      const cleanNfp = nfp.replace(PART_SUFFIX_RE, '').trim()
      if (cleanNfp) {
        const byNfp = nameToImage[cleanNfp.toLowerCase()]
        if (byNfp) return byNfp
      }

      // 3. Try stripping suffixes from the path leaf
      const leaf = p.split('/').at(-1)?.replace(PART_SUFFIX_RE, '') ?? ''
      if (leaf) {
        const byLeaf = nameToImage[leaf.toLowerCase()]
        if (byLeaf) return byLeaf
      }
      // 4. Try swapping recipe path to weapon path and strip suffixes
      const swapped = p.replace('/Types/Recipes/', '/Weapons/').replace(PART_SUFFIX_RE, '')
      const bySwap = byName(swapped)
      if (bySwap) return bySwap
    }
    return null
  }

  // Try direct path first
  let r = resolve(item);
  if (r) return r;

  // Try StoreItem mapping
  if (item.startsWith('/Lotus/StoreItems/')) {
    r = resolve(item.replace('/StoreItems/', '/'));
    if (r) return r;
  }

  // Try case-insensitive lookup for the path itself in nameToImage if it's not a path
  if (!item.startsWith('/Lotus/')) {
    r = byName(item);
    if (r) return r;
  }

  if (typeof rewardOrItem === 'string') return null;

  const cItems = rewardOrItem.countedItems ?? rewardOrItem.CountedItems ?? []
  for (const ci of cItems) {
    const name = typeof ci.type === 'string' ? ci.type : (ci.type?.uniqueName ?? ci.ItemType ?? ci.type?.name ?? ci.key ?? '')
    const ri = resolve(name); if (ri) return ri
  }

  const itemName = rewardOrItem.item || rewardOrItem.itemString || rewardOrItem.asString || rewardOrItem.name || ''
  if (itemName && !itemName.startsWith('/Lotus/')) { const ri = byName(itemName); if (ri) return ri }

  const thumb = rewardOrItem.thumbnail || rewardOrItem.image || ''
  if (thumb && thumb.startsWith('https://browse.wf')) return thumb
  return null
}


// ─── Time Formatting Utilities ───────────────────────────────────────────

/** Format time remaining until expiry as "Xd Xh", "Xh Xm", or "Xm". */
export function timeRemaining(expiry) {
  if (!expiry) return ''
  const expDate = typeof expiry === 'object' && expiry.$date ? new Date(parseInt(expiry.$date.$numberLong, 10)) : new Date(expiry)
  const diff = expDate - Date.now()
  if (diff < 0) return 'Expired'
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}


/** Format elapsed time since a past date as "Xd ago", "Xh ago", or "Xm ago". */
export function timeSince(date) {
  if (!date) return ''
  const d = typeof date === 'object' && date.$date ? new Date(parseInt(date.$date.$numberLong, 10)) : new Date(date)
  const diff = Date.now() - d.getTime()
  if (diff < 0) return 'Just now'
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(m / 60)
  const day = Math.floor(h / 24)
  if (day > 0) return `${day}d ago`
  if (h > 0) return `${h}h ago`
  return `${m}m ago`
}


/** Format a raw timestamp (ms) as a short date string.
 *  If the date is today, show "HH:MM"; otherwise show "Month Day HH:MM". */
export function formatLastUpdate(ts) {
  if (!ts) return 'never'
  const date = new Date(Number(ts))
  const now = new Date()
  const isToday = date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}