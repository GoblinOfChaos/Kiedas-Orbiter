
/**
 * worldstateParser.js
 *
 * Parses the live worldstate JSON from Warframe's servers into structured data
 * for the Dashboard screen.
 *
 * DATA PIPELINE
 * ─────────────────────────────────────────
 * MonitoringContext.jsx fetches the live worldstate JSON from
 * asset-cache://content.warframe.com/dynamic/worldState.php on each monitoring cycle.
 * That raw JSON object is passed to parseWorldstate() here, which returns a
 * clean, UI-friendly structure consumed by Dashboard.jsx.
 *
 * Environmental cycle timestamps (Cetus, Vallis, etc.) are calculated purely
 * from Date.now() using wiki-confirmed epoch values -- no network calls needed.
 *
 * EXPORTS FROM THIS FILE
 * ─────────────────────────────────────────
 * parseWorldstate(raw, options) → dashboard data object
 *   All cycle parsers and helpers are internal.
 */

import {
  resolveNode,
  resolveMissionType,
  resolveBountyTitle,
  resolveRewardText,
  resolveChallenge,
  resolveChallengeDesc,
  resolveItemName,
  splitPascal
} from './warframeUtils.js'

// ─── Descendia mapping tables (fallback when dict lookup fails) ───────────────
const DESCENDIA_MISSION_TYPES = {
  DT_BREAK_TARGETS: 'Destroy Hologlobes',
  DT_LOOT_CREATURES: 'Gruzzling Plunder',
  DT_ALCHEMY: 'Alchemy',
  DT_INTERCEPTION: 'Mobile Interception',
  DT_INFESTED_SALVAGE: 'Infested Salvage',
  DT_SABOTAGE_HIVE: 'Hive',
  DT_PROTOFRAME: 'Protoframe Room',
  DT_CAPTURE: 'Capture',
  DT_MIMICS: 'Plunder Roulette',
  DT_COLLECTION: 'Void Flood',
  DT_BOSS: 'Assassination',
  DT_EXTERMINATE: 'Exterminate',
  DT_NETRACELLS: 'Targeted Elimination',
  DT_SABOTAGE_DEFENSE: 'Defense',
  DT_DEFENSE: 'Defense of a Protoframe',
  DT_EXCAVATION: 'Excavation',
  DT_PRESURE_GAUGE: 'Volatile',
  DT_UNIQUE: 'Unique',
  DT_LOOT: 'Loot',
  DT_RACE: 'Race',
  DT_SHRINE_DEFENSE: 'Shrine Defense',
}

const DESCENDIA_PENANCES = {
  BasicLootCreatures: 'Gruzzling Plunder',
  SlipAndSlide: 'Frictionless',
  Escapist: 'Sneaky Retreats',
  VoidAberration: 'Vampyric Liminus',
  Wisp: 'Marie',
  FireAndIce: 'Eximus Cabal: Fire & Ice',
  BasicMimics: 'Plunder Roulette',
  NC_MineField: 'Minefield without Enemies',
  MineField: 'Minefield',
  Octopede: 'The Fragmented Boss',
  PoisonGas: 'Chemical Warfare',
  GlassMaker: 'Glassmaker Cephalites',
  Harrow: 'Lyon',
  SpicyKnife: 'Bomb Defusal',
  JumpSmash: 'Head Stompers',
  Manics: 'Manic Mania',
  CollectionBasic: 'Void Flood',
  GiantRealm: 'Gigantism',
  Devil: 'Roathe',
  HardShell: 'Hardshell',
  UnseenFoes: 'Unseen Foes',
  VeryToxic: 'Very Toxic',
  NC_SecuritySpin: 'Security Spin',
  SecuritySpin: 'Security Spin',
  BlitzLeech: 'Blitz Leech',
  BasicLoot: 'Basic Loot',
  BasicRace: 'Basic Race',
  NC_Darkness: 'Sol Banished',
  Darkness: 'Sol Banished',
  FieryTrailRollers: 'Fiery Trail Rollers',
  InfestedBoyband: 'Infested Boyband',
  Horse: 'Horse Combat Only',
  NC_NarmerPhobia: 'Narmer Phobia',
  NarmerPhobia: 'Narmer Phobia',
  FreezeInShoot: 'Freeze and Shoot',
  '99TankP1': 'Tank Assassination',
  HeadShotsOnly: 'Headshots Only',
  PowerHouse: 'Powerhouse',
  FireChain: 'Fire Chain',
  JohnProdman: 'John Prodman',
  JadeGuardian: 'Jade Guardian',
  ToxicFire: 'Toxic Fire',
  ArbitrationDrones: 'Arbitration Drones',
  Sentients: 'Sentient Incursion',
  HordeWeakpoints: 'Horde Weakpoints',
  Sunlight: 'Sunlight Penance',
  RangedArcadiaOnly: 'Ranged Only',
  FieryTrail: 'Fiery Trail',
  RaceHorse: 'Racing Horse',
  NC_SpikeCeiling: 'Spike Ceiling without Enemies',
  SpikeCeiling: 'Spike Ceiling',
  BallonParty: 'Balloon Party',
  MechCombatOnly: 'Mech Combat',
  ShockingLeech: 'Shocking Leech',
  Oraxia: 'Oraxia',
  HeavyWeaponsOnly: 'Heavy Weapons Only',
  ArbitersNightmareLich: "Arbiter's Nightmare Lich",
}

// ─── Environment Cycle Parsers ────────────────────────────────────────────────
//
// Each open-world area cycles between two states on a fixed timer.
// All timers are deterministic -- given an epoch timestamp and each phase
// length, we compute the current state purely from the system clock.
// Epoch values are sourced from the Warframe wiki.

/**
 * Generic A/B cycle calculator.
 * @param {number} epochSec  Known transition timestamp (Unix seconds, start of phase A).
 * @param {number} aLenSec   Duration of phase A in seconds.
 * @param {number} bLenSec   Duration of phase B in seconds.
 * @param {string} aLabel    Display label for phase A (e.g. 'Day').
 * @param {string} bLabel    Display label for phase B (e.g. 'Night').
 * @returns {{ state: string, expiry: Date }}
 */
function computeCycle(epochSec, aLenSec, bLenSec, aLabel, bLabel) {
  const totalSec = aLenSec + bLenSec
  const nowSec = Date.now() / 1000
  const elapsed = ((nowSec - epochSec) % totalSec + totalSec) % totalSec
  const inA = elapsed < aLenSec
  const remainingSec = inA ? (aLenSec - elapsed) : (totalSec - elapsed)
  return {
    state: inA ? aLabel : bLabel,
    expiry: new Date(Date.now() + remainingSec * 1000)
  }
}

/** Plains of Eidolon / Cetus day-night cycle.
 *  Day = 5998.874 s, Night = 3000 s.  Epoch: 2021-02-05 12:27:54 UTC (wiki). */
function parseCetusCycle(_raw) {
  return computeCycle(1612528074, 5998.874, 3000, 'Day', 'Night')
}

/** Orb Vallis warm-cold cycle.
 *  Warm = 400 s, Cold = 1200 s.  Epoch: 2021-01-09 08:13:48 UTC (wiki). */
function parseVallisCycle(_raw) {
  return computeCycle(1610170428, 400, 1200, 'Warm', 'Cold')
}

/** Cambion Drift Fass/Vome cycle; shares the same epoch and lengths as Cetus. */
function parseCambionCycle(_raw) {
  const { state, expiry } = computeCycle(1612528074, 5998.874, 3000, 'Fass', 'Vome')
  return { state, expiry, active: state === 'Fass' }
}

/** Earth forest day-night cycle.  4 h day, 4 h night.  Epoch: 2020-06-16 00:00:00 UTC (wiki). */
function parseEarthCycle(_raw) {
  return computeCycle(1592265600, 14400, 14400, 'Day', 'Night')
}

/** Zariman Ten Zero faction cycle.
 *  The faction (Corpus/Grineer) is sourced from the oracle bounty-cycle API;
 *  its expiry is synced with the HexSyndicate (1999) bounty timer. */
function parseZarimanCycle(raw, bountyCycle) {
  const hex = (raw.SyndicateMissions || []).find(s => s.Tag === 'HexSyndicate')
  const expiry = hex ? (hex.Expiry?.$date?.$numberLong ? new Date(parseInt(hex.Expiry.$date.$numberLong, 10)) : new Date(hex.Expiry)) : null
  const factionRaw = bountyCycle?.zarimanFaction || 'FC_CORPUS'
  const state = factionRaw === 'FC_GRINEER' ? 'Grineer' : 'Corpus'
  return { state, expiry }
}

/** Duviri emotional state cycle.
 *  5 states (Sorrow, Fear, Joy, Anger, Envy), each 2 hours.  Rotates from Unix epoch 0. */
function parseDuviriCycle(_raw) {
  const states = ['Sorrow', 'Fear', 'Joy', 'Anger', 'Envy']
  const stateLenMs = 7200000 // 2 hours
  const idx = Math.floor(Date.now() / stateLenMs)
  return {
    state: states[idx % 5],
    expiry: new Date((idx + 1) * stateLenMs)
  }
}

// ─── Deep Archimedea Helper ──────────────────────────────────────────────────

/**
 * Build a lowercase short-key → display string lookup for Deep Archimedea
 * modifiers from the main dict and supplementary dict.
 *
 * Worldstate reports modifier names as short identifiers like 'OverSensitive'
 * or 'UnpoweredCapsules'.  The dictionaries store them as full localisation
 * paths (e.g. /Lotus/Language/Conquest/PersonalMod_OverSensitive).
 * To avoid hardcoding prefix tokens (which break on new content), we index
 * every underscore-joined suffix of each /Conquest/ path segment, so that
 * any raw key will match one of them.
 */
export function buildArchimedeaMap(dict, suppDict) {
  const map = {}
  const clean = s => s.replace(/<[^>]*>/g, '').trim()

  const processDict = (d) => {
    for (const [key, val] of Object.entries(d)) {
      if (!key.toLowerCase().includes('/conquest/')) continue
      const segment = key.split('/').at(-1) // e.g. "PersonalMod_OverSensitive_Desc"
      const parts = segment.split('_')
      // Index every suffix: "OverSensitive_Desc", "Sensitive_Desc", "Desc", etc.
      // Also index _Description suffixes (used by newer modifiers)
      for (let i = 0; i < parts.length; i++) {
        const base = parts.slice(i).join('_').toLowerCase()
        if (base && !map[base]) map[base] = clean(val)
        
        // Canonical description suffixes
        if (base.endsWith('_desc') && !map[base.replace('_desc', '_description')]) {
          map[base.replace('_desc', '_description')] = clean(val)
        }
        if (base.endsWith('_description') && !map[base.replace('_description', '_desc')]) {
          map[base.replace('_description', '_desc')] = clean(val)
        }
      }
    }
  }

  processDict(dict)
  if (suppDict) processDict(suppDict)

  return map
}

const CONQUEST_OVERRIDES = {
  'undersupplied': 'maxammo',
  'dullblades': 'combocountchance',
  'magnetichounds': 'condition_magnetichounds',
  'empblackhole': 'condition_magnetichounds'
}

// ─── Main Parser ───────────────────────────────────────────────────────────

/**
 * Parse the live Warframe worldstate JSON into a clean UI-friendly object.
 * Called by MonitoringContext.jsx on each monitoring cycle.
 *
 * @param {object} raw         The raw worldstate JSON object from Warframe's servers.
 * @param {object} options     Resolution helpers:
 *   - dict            Main localisation dictionary (from dict.json)
 *   - suppDict        Supplementary dictionary (from DE PublicExport)
 *   - ERg             ExportRegions: node name resolution
 *   - EC              ExportChallenges: Nightwave challenge text
 *   - EI              Item unique name → image URL map
 *   - nameToImage     Display name → image URL map
 *   - uniqueNameToName  Unique name → display name map
 *   - bountyCycle     Oracle bounty cycle data (for Zariman faction)
 *   - ES              ExportSentinels (for companion images)
 *   - ENWRawRewards   Nightwave raw rewards list
 *   - ExportImages    ExportImages table
 *   - ExportUpgrades  ExportUpgrades table
 *   - archimedeaMap   Archimedea localized name map
 *   - descendiaDesc   Descendia description map (key → description text)
 */
function mulberry32(a) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseBounties(raw, { dict, suppDict, ERg, EC }) {
  const mergedDict = suppDict ? { ...dict, ...suppDict } : dict;
  const syndicates = raw.SyndicateMissions || [];

  const BOUNTY_NAME_OVERRIDES = {
    "RescueBountyResc": "Rescue Prisoner",
    "AttritionBountyLib": "Camp Liberation",
    "ReclamationBountyTheft": "Resource Recovery",
    "AttritionBountyCap": "Capture Commander",
    "AttritionBountySab": "Sabotage Supply Lines",
    "ReclamationBountyCap": "Steel Path: Capture Commander",
    "VenusChaosJobExcavation": "Excavation Defense",
    "VenusHelpingJobSpy": "Spy Reconnaissance",
    "VenusTheftJobResource": "Resource Extraction",
    "VenusCullJobExterminate": "Cull Extermination",
    "VenusIntelJobRecovery": "Intel Recovery",
    "VenusSpyJobSpy": "Steel Path: Spy Reconnaissance",
    "NarmerVenusCullJobAssassinate": "Narmer Assassination",
    "DeimosCrpSurvivorBounty": "Corpus Survivor Extraction",
    "DeimosExcavateBounty": "Infested Excavation",
    "DeimosEndlessExcavateBounty": "Endless Infested Excavation",
    "DeimosGrnSurvivorBounty": "Grineer Survivor Extraction",
    "DeimosAssassinateBounty": "Infested Assassination",
    "DeimosPurifyBounty": "Steel Path: Purify the Land"
  };

  const mapJob = (j, syndicateTag, idx) => {
    const jobType = j.jobType || "";
    const leaf = jobType.split("/").pop() || "";
    const isNarmer = jobType.includes("Narmer") || syndicateTag.includes("Narmer");
    const isSteelPath = (j.minEnemyLevel || 0) >= 100 || jobType.includes("Hard");
    const isEndless = !!j.endless;

    let title = BOUNTY_NAME_OVERRIDES[leaf] || resolveBountyTitle(jobType, mergedDict);
    if (!title) {
      if (!leaf) {
        title = `Isolation Vault Tier ${idx - 5 || 1}`;
      } else {
        const cleanLeaf = leaf.replace(/Bounty/i, " Bounty").replace(/([A-Z])/g, " $1").trim();
        title = cleanLeaf || "Bounty";
      }
    }

    const standingTotal = Array.isArray(j.xpAmounts) ? j.xpAmounts.reduce((a, b) => a + b, 0) : 0;

    let img = "BountyKonzu";
    if (syndicateTag === "SolarisSyndicate") {
      img = (title.toLowerCase().includes("business") || title.toLowerCase().includes("animal")) ? "BountyTheBusiness" : "BountyEudico";
    } else if (syndicateTag === "EntratiSyndicate") {
      img = title.toLowerCase().includes("otak") ? "BountyOtak" : "BountyMother";
    } else if (syndicateTag === "ZarimanSyndicate") {
      img = "BountyQuinn";
    } else if (syndicateTag === "EntratiLabSyndicate") {
      img = "BountyFibonacci";
    } else if (syndicateTag === "HexSyndicate") {
      img = "BountyTechrot";
    }

    let tier = `Lv ${j.minEnemyLevel || 0} - ${j.maxEnemyLevel || 0}`;
    if (isSteelPath) tier = `Steel Path (Lv ${j.minEnemyLevel || 100})`;
    else if (isNarmer) tier = `Narmer (Lv ${j.minEnemyLevel || 50}-${j.maxEnemyLevel || 70})`;
    else if (isEndless) tier = `Endless (Lv ${j.minEnemyLevel || 25}+)`;

    return {
      name: title,
      desc: isNarmer ? "Narmer Subjugation Bounty" : isSteelPath ? "Steel Path Bounty" : (standingTotal > 0 ? `Standing: +${standingTotal.toLocaleString()}` : "Syndicate Bounty"),
      minLevel: j.minEnemyLevel || 0,
      maxLevel: j.maxEnemyLevel || 0,
      standing: standingTotal,
      standingStages: j.xpAmounts || [],
      isNarmer,
      isSteelPath,
      isEndless,
      tier,
      rewardsDeck: j.rewards,
      img
    };
  };

  const getSyndicateJobs = (tag) => {
    const sm = syndicates.find(s => s.Tag === tag);
    const liveJobs = (sm?.Jobs || []).map((j, idx) => mapJob(j, tag, idx));
    if (liveJobs.length > 0) return liveJobs;

    // Offline deterministic PRNG seed rotation calculation for Zariman, Cavia, and Hex
    const seed = sm?.Seed || 61322;
    const rng = mulberry32(Number(seed) || 12345);

    const zarimanNodes = ["SolNode230", "SolNode231", "SolNode232", "SolNode233", "SolNode234"];
    const caviaNodes = ["SolNode715", "SolNode716", "SolNode717", "SolNode718", "SolNode719", "SolNode720"];
    const hexNodes = ["SolNode850", "SolNode851", "SolNode852", "SolNode853", "SolNode854", "SolNode855", "SolNode858"];

    const zarimanChallenges = Object.keys(EC || {}).filter(k => k.includes("/Zariman/"));
    const caviaChallenges = Object.keys(EC || {}).filter(k => k.includes("/EntratiLab/"));
    const hexChallenges = Object.keys(EC || {}).filter(k => k.includes("/Vania/"));

    let nodes = zarimanNodes;
    let challenges = zarimanChallenges;
    let hubImg = "BountyQuinn";
    let hubName = "Zariman";

    if (tag === "EntratiLabSyndicate") {
      nodes = caviaNodes;
      challenges = caviaChallenges;
      hubImg = "BountyFibonacci";
      hubName = "Sanctum Anatomica";
    } else if (tag === "HexSyndicate") {
      nodes = hexNodes;
      challenges = hexChallenges;
      hubImg = "BountyTechrot";
      hubName = "Höllvania";
    }

    const count = tag === "HexSyndicate" ? 7 : 5;
    const bounties = [];

    for (let idx = 0; idx < count; idx++) {
      const nodeKey = nodes[(idx + Math.floor(rng() * nodes.length)) % nodes.length];
      const chalKey = challenges.length > 0 ? challenges[Math.floor(rng() * challenges.length)] : "";
      
      const nodeName = ERg?.[nodeKey]?.name ? (mergedDict[ERg[nodeKey].name] || ERg[nodeKey].name) : `${hubName} Mission`;
      const chalName = EC?.[chalKey]?.name ? (mergedDict[EC[chalKey].name] || EC[chalKey].name) : (chalKey ? chalKey.split("/").pop() : "Complete Primary Objective");

      bounties.push({
        name: `${nodeName} - Tier ${idx + 1}`,
        desc: chalName,
        minLevel: 50 + idx * 10,
        maxLevel: 55 + idx * 10,
        standing: 1000 + idx * 500,
        standingStages: [1000 + idx * 500],
        isNarmer: false,
        isSteelPath: false,
        isEndless: idx === count - 1,
        tier: `Tier ${idx + 1} (Lv ${50 + idx * 10}-${55 + idx * 10})`,
        rewardsDeck: null,
        img: hubImg
      });
    }

    return bounties;
  };

  const safeSyndicateJobs = (tag) => {
    try {
      return getSyndicateJobs(tag);
    } catch (err) {
      console.error(`parseBounties: failed to resolve jobs for ${tag}`, err);
      return [];
    }
  };

  return {
    cetus: safeSyndicateJobs("CetusSyndicate"),
    vallis: safeSyndicateJobs("SolarisSyndicate"),
    deimos: safeSyndicateJobs("EntratiSyndicate"),
    holdfasts: safeSyndicateJobs("ZarimanSyndicate"),
    cavia: safeSyndicateJobs("EntratiLabSyndicate"),
    hex: safeSyndicateJobs("HexSyndicate"),
    expiry: syndicates.find(s => s.Tag === "CetusSyndicate")?.Expiry
  };
}

export function parseWorldstate(raw, { dict, suppDict, ERg, EC, EI, nameToImage, uniqueNameToName, bountyCycle, ES, ENWRawRewards, ExportImages, ExportUpgrades, ExportRecipes, ExportKeys, archimedeaMap, descendiaDesc, challengeProgress, locale = 'en' }) {

  const nightwaveRewards = ENWRawRewards || []
  const imagesMap = ExportImages || {}
  const archMap = archimedeaMap ?? buildArchimedeaMap(dict || {}, suppDict || {})
  const mergedDict = suppDict ? { ...dict, ...suppDict } : dict

  const clean = (s) => {
    if (!s || typeof s !== 'string') return ''
    return s.replace(/<[^>]*>/g, '').replace(/\|[^|]*\|/g, '').replace(/\\n/g, ' ').trim()
  }

  const resolvePriority = (key) => {
    if (!key) return ''
    // Strip leading slash for lookup
    const lookupKey = key.startsWith('/') ? key.slice(1) : key
    if (suppDict) {
      if (suppDict[key]) return clean(suppDict[key])
      if (suppDict['/' + key]) return clean(suppDict['/' + key])
      // Also try without leading slash
      if (suppDict[lookupKey]) return clean(suppDict[lookupKey])

      // Also try resolving via ERg if the key is a solnode but we want to check suppDict for the name
      const entry = ERg[key]
      if (entry && entry.name) {
        const res = suppDict[entry.name] || suppDict['/' + entry.name]
        if (res) return clean(res)
      }
    }
    return resolveNode(key, dict, ERg)
  }

// Relic era names — proper nouns not always in the dict.
// Try dict lookup first (e.g. /Lotus/Language/Locations/Lith), then fall back to a
// manual translation table keyed by the English era name.
const ERA_TRANSLATIONS = {
  Lith: { uk: 'Літ', fr: 'Lith', de: 'Lith', es: 'Lith', ru: 'Лит', zh: '利特', ja: 'リス', ko: '리스', pt: 'Lith', tr: 'Lith', th: 'ลิท', pl: 'Lith', it: 'Lith', en: 'Lith' },
  Meso: { uk: 'Мезо', fr: 'Méso', de: 'Meso', es: 'Meso', ru: 'Мезо', zh: '梅索', ja: 'メソ', ko: '메소', pt: 'Méso', tr: 'Meso', th: 'เมโซ', pl: 'Meso', it: 'Meso', en: 'Meso' },
  Neo:  { uk: 'Нео', fr: 'Néo', de: 'Neo', es: 'Neo', ru: 'Нео', zh: '神', ja: 'ネオ', ko: '네오', pt: 'Néo', tr: 'Neo', th: 'เนโอ', pl: 'Neo', it: 'Neo', en: 'Neo' },
  Axi:  { uk: 'Аксі', fr: 'Axi', de: 'Axi', es: 'Axi', ru: 'Акси', zh: '阿克西', ja: 'アクシ', ko: '악시', pt: 'Axi', tr: 'Axi', th: 'แอกซี', pl: 'Axi', it: 'Axi', en: 'Axi' },
  Requiem: { uk: 'Реквієм', fr: 'Requiem', de: 'Requiem', es: 'Requiem', ru: 'Реквием', zh: 'Requiem', ja: 'レクイエム', ko: 'Requiem', pt: 'Requiem', tr: 'Requiem', th: 'Requiem', pl: 'Requiem', it: 'Requiem', en: 'Requiem' },
  Omnia: { uk: 'Омнія', fr: 'Omnia', de: 'Omnia', es: 'Omnia', ru: 'Омниа', zh: 'Omnia', ja: 'オムニア', ko: 'Omnia', pt: 'Omnia', tr: 'Omnia', th: 'Omnia', pl: 'Omnia', it: 'Omnia', en: 'Omnia' },
}

// VoidTier modifier values come through as "1".."6" ("VoidT1" etc.) - map to
// the English era name so ERA_TRANSLATIONS / dict lookups can localize them.
// 6 = Omnia fissures (added with the Omnia void cascade update).
const TIER_TO_ERA = { '1': 'Lith', '2': 'Meso', '3': 'Neo', '4': 'Axi', '5': 'Requiem', '6': 'Omnia' }

function resolveRelicEra(eraName, dict, locale = 'en') {
  if (!eraName) return 'Unknown'
  // Numeric VoidTier -> era name ("4Hard" -> "Axi" for Steel Path fissures)
  eraName = eraName.replace(/^\d+/, d => TIER_TO_ERA[d] || d).replace(/Hard$/i, '')
  const translations = ERA_TRANSLATIONS[eraName]
  const tableValue = translations ? (translations[locale] || translations.en || eraName) : null
  // Try dict first (e.g. /Lotus/Language/Locations/Lith)
  const dictKey = `/Lotus/Language/Locations/${eraName}`
  const dictVal = dict?.[dictKey] || dict?.['/' + dictKey]
  if (dictVal && !dictVal.startsWith('/Lotus/')) {
    const cleaned = dictVal.replace(/<[^>]*>/g, '').trim()
    // Mirrors ship the English proper noun for some eras (Lith -> "Lith" in
    // the ja dict) even though the game localizes them. When the dict value
    // just echoes the English name, prefer the translation table.
    if (cleaned.toLowerCase() !== eraName.toLowerCase()) return cleaned
  }
  // Fall back to translation table
  if (translations) {
    return tableValue
  }
  return eraName
}

  // The EndlessXpSchedule sends DE's short names (e.g. "DualToxocyst") which
  // are neither uniqueName paths nor dict keys. Curate the weapon names and
  // fall back to the warframe Suits/{Name}Name pattern; unresolved entries
  // stay English via resolveItemName.
  const CIRCUIT_NAME_KEYS = {
    Torid: '/Lotus/Language/ClanTech/Torid',
    DualToxocyst: '/Lotus/Language/Items/InfestedLexName',
    DualIchor: '/Lotus/Language/Weapons/InfestedDualAxeName',
    Miter: '/Lotus/Language/Items/TnoMiterName',
    Panthera: '/Lotus/Language/Items/PantheraName',
    Atomos: '/Lotus/Language/Items/GrnHeatGunName',
    Nekros: '/Lotus/Language/Suits/NecroName',
    Valkyr: '/Lotus/Language/Suits/BerserkerName',
    Oberon: '/Lotus/Language/Suits/PaladinName',
    Nyx: '/Lotus/Language/Suits/MagicianName',
    Equinox: '/Lotus/Language/Suits/YinYangName',
    Mirage: '/Lotus/Language/Suits/HarlequinName',
    Hydroid: '/Lotus/Language/Suits/PirateName',
    Zephyr: '/Lotus/Language/Suits/TenguName',
    Trinity: '/Lotus/Language/Suits/PriestName',
    Limbo: '/Lotus/Language/Suits/AntiMatterName',
    Baruuk: '/Lotus/Language/Suits/PacifistName',
    Ivara: '/Lotus/Language/Suits/RangerName',
    Khora: '/Lotus/Language/Suits/TrapperName',
    Chroma: '/Lotus/Language/Suits/DragonName',
    Atlas: '/Lotus/Language/Suits/BrawlerName',
    Titania: '/Lotus/Language/Suits/FairyName',
    Gara: '/Lotus/Language/Suits/GlassName',
    Nidus: '/Lotus/Language/Suits/InfestationName',
    Octavia: '/Lotus/Language/Suits/BardName',
    Harrow: '/Lotus/Language/Suits/PriestName',
  }
  const resolveCircuitName = (short) => {
    if (!short) return short
    const dictKey = CIRCUIT_NAME_KEYS[short] || `/Lotus/Language/Suits/${short}Name`
    const loc = mergedDict[dictKey] || mergedDict['/' + dictKey]
    if (loc && !loc.startsWith('/Lotus/')) return clean(loc)
    return resolveItemName(short, mergedDict, uniqueNameToName, locale)
  }


  return {
    // News (from Events)
    news: (raw.Events || [])
      .filter(e => e.Date != null)
      .map(e => {
        const raw_msg = e.Messages?.find(m => (m.LanguageCode || '').toLowerCase() === locale.toLowerCase())?.Message || ''
        if (!raw_msg) return null

        const message = raw_msg.startsWith('/Lotus/Language/')
          ? (dict?.[raw_msg] || dict?.['/' + raw_msg] || null)
          : raw_msg || null
        if (!message) return null
        const ts = e.Date?.$date?.$numberLong
          ? parseInt(e.Date.$date.$numberLong, 10)
          : (e.Date ? new Date(e.Date).getTime() : 0)

        // Try 'Links' array first (modern worldstate), fallback to 'Prop'
        const linkRaw = e.Links?.find(l => (l.LanguageCode || '').toLowerCase() === locale.toLowerCase())?.Link || e.Links?.[0]?.Link || e.Prop || ''
        const link = (linkRaw.startsWith('http') || !linkRaw)
          ? linkRaw
          : `https://www.warframe.com${linkRaw.startsWith('/') ? '' : '/'}${linkRaw}`

        return { message, link, date: new Date(ts), image: e.ImageUrl, priority: e.Priority, community: !!e.Community }
      })
      .filter(Boolean)
      .sort((a, b) => b.date - a.date),

    // Incursions (Steel Path)
    incursions: raw.Incursions?.[0] ? {
      id: raw.Incursions[0]._id?.$oid || raw.Incursions[0]._id,
      activation: raw.Incursions[0].Activation,
      expiry: (() => {
        const e = raw.Incursions[0].Expiry
        if (!e) return null
        if (typeof e === 'object' && e?.$date?.$numberLong) return new Date(parseInt(e.$date.$numberLong, 10))
        return new Date(e)
      })(),
    } : null,
    steelPath: raw.SteelPath || null,

    // Invasions
    invasions: (raw.Invasions || []).map(i => {
      const completion = i.Count / i.Goal
      const pct = ((completion + 1) / 2) * 100

      const attFaction = resolveNode(i.AttackerMissionInfo?.faction, dict, ERg)
      const defFaction = resolveNode(i.DefenderMissionInfo?.faction, dict, ERg)
      const isInfested = attFaction === 'Infested' || defFaction === 'Infested'

      let attReward = i.AttackerReward
      let defReward = i.DefenderReward

      // Infested logic: Infested side should not have rewards. 
      // Sometimes worldstate puts the reward meant for the player on the infested side's field.
      if (isInfested) {
        if (attFaction === 'Infested' && attReward && (!defReward || (!defReward.CountedItems?.length && !defReward.Items?.length))) {
          defReward = attReward
          attReward = null
        } else if (defFaction === 'Infested' && defReward && (!attReward || (!attReward.CountedItems?.length && !attReward.Items?.length))) {
          attReward = defReward
          defReward = null
        }
      }
      return {
        id: i._id?.$oid || i._id,
        node: resolveNode(i.Node, dict, ERg),
        completed: i.Completed,
        completion: pct,
        attacker: {
          reward: attReward,
          rewardText: resolveRewardText(attReward, dict, ERg, uniqueNameToName),
          faction: attFaction
        },
        defender: {
          reward: defReward,
          rewardText: resolveRewardText(defReward, dict, ERg, uniqueNameToName),
          faction: defFaction
        }
      }
    }),

    // Fissures (from ActiveMissions)
    fissures: (raw.ActiveMissions || []).map(f => {
      const era = resolveRelicEra(f.Modifier?.replace('VoidT', ''), dict, locale)
      return {
        id: f._id?.$oid || f._id,
        node: resolveNode(f.Node, dict, ERg),
        missionType: resolveMissionType(f.MissionType, dict, ERg),
        missionTypeCode: f.MissionType, // raw MT_ code for locale-independent filtering
        tier: era,
        tierNum: parseInt(f.Modifier?.replace('VoidT', ''), 10) || 0,
        expiry: f.Expiry,
        activation: f.Activation,
        isHard: !!f.Hard,
        isStorm: false
      }
    }),

    // Void Storms
    voidStorms: (raw.VoidStorms || []).map(s => {
      const era = resolveRelicEra(s.ActiveMissionTier?.replace('VoidT', ''), dict, locale)

      let mType = resolveMissionType(s.MissionType, dict, ERg)
      if (!mType || mType === 'Unknown Mission') {
        const nodeEntry = ERg[s.Node]
        if (nodeEntry && (nodeEntry.missionName || nodeEntry.missionType)) {
          mType = resolveMissionType(nodeEntry.missionName || nodeEntry.missionType, dict, ERg)
        }
      }

      return {
        id: s._id?.$oid || s._id,
        node: resolveNode(s.Node, dict, ERg),
        missionType: mType || 'Skirmish',
        tier: era,
        tierNum: parseInt(s.ActiveMissionTier?.replace('VoidT', ''), 10) || 0,
        expiry: s.Expiry,
        activation: s.Activation,
        isStorm: true
      }
    }),

    // 1999 Calendar (from KnownCalendarSeasons)
    calendar1999: (raw.KnownCalendarSeasons || raw.KnownCalendarSeason || []).map(s => ({
      season: s.Season,
      year: s.YearIteration,
      expiry: s.Expiry?.$date?.$numberLong ? new Date(parseInt(s.Expiry.$date.$numberLong, 10)) : new Date(s.Expiry),
      activation: s.Activation?.$date?.$numberLong ? new Date(parseInt(s.Activation.$date.$numberLong, 10)) : new Date(s.Activation),
      days: (s.Days || []).map(d => {
        const events = d.events || d.Events || [];
        let parsedEvents = events.map(ev => {
          let name = '';
          let description = '';
          let type = ev.type || ev.Type || '';

          if (type === 'CET_CHALLENGE') {
            name = resolveChallenge(ev.challenge || ev.Challenge, dict, EC);
            description = resolveChallengeDesc(ev.challenge || ev.Challenge, dict, EC, ERg);
            name = resolveItemName(ev.reward || ev.Reward, mergedDict, uniqueNameToName, locale);
          } else if (type === 'CET_UPGRADE') {
            name = resolveItemName(ev.upgrade || ev.Upgrade, mergedDict, uniqueNameToName, locale);
            description = resolveChallengeDesc(ev.upgrade || ev.Upgrade, dict, EC, ERg);
          } else if (type === 'CET_BIRTHDAY') {
            name = ev.name || ev.Name || 'Unknown';
          }

          return { type, name, description, raw: ev };
        });

        // If no events, check if this is a birthday day based on day number
        if (parsedEvents.length === 0) {
          const birthdayMap = {
            306: 'Eleanor', // Nov 2
            307: 'Arthur',   // Nov 3
            338: 'Quincy',   // Dec 4
            355: 'Velimir'   // Dec 21
          };
          if (birthdayMap[d.day]) {
            parsedEvents = [{ type: 'CET_BIRTHDAY', name: birthdayMap[d.day], raw: {} }];
          }
        }

        // Fallback for legacy structure if any
        let legacyChallenge = d.Challenge ? resolveChallenge(d.Challenge, dict, EC) : (d.challenge ? resolveChallenge(d.challenge, dict, EC) : null);
        let legacyReward = d.Reward ? resolveRewardText(d.Reward, dict, ERg, uniqueNameToName) : (d.reward ? resolveRewardText(d.reward, dict, ERg, uniqueNameToName) : null);

        return {
          day: d.day,
          type: d.type || d.Type,
          events: parsedEvents,
          challenge: legacyChallenge,
          reward: legacyReward
        };
      })
    })),

    // Descendia (from Descents)
    descendia: (raw.Descents || []).map(d => ({
      id: d._id?.$oid || d._id,
      activation: d.Activation,
      expiry: d.Expiry,
      randSeed: d.RandSeed,
      stages: (d.Challenges || []).map(c => {
        const levelName = (c.Level || '').split('/').at(-1)?.replace(/\.level$/i, '') || ''
        const rawType = c.Type
        const rawPenance = c.Challenge
        const resolvedType = resolveMissionType(rawType, dict, ERg)
        const resolvedPenance = resolveNode(rawPenance, dict, ERg)
        return {
          index: c.Index,
          missionType: (resolvedType !== rawType) ? resolvedType : (DESCENDIA_MISSION_TYPES[rawType] || rawType),
          missionTypeRaw: rawType,
          missionTypeDesc: (descendiaDesc || {})[rawType] || '',
          penance: (resolvedPenance !== rawPenance) ? resolvedPenance : (DESCENDIA_PENANCES[rawPenance] || rawPenance),
          penanceRaw: rawPenance,
          penanceDesc: (descendiaDesc || {})[rawPenance] || '',
          arena: levelName,
          level: resolveNode(c.Level, dict, ERg),
          specs: c.Specs || [],
          auras: c.Auras || [],
          isCheckpoint: c.Index === 7 || c.Index === 14 || c.Index === 21,
          isBoss: c.Index === 21,
          isMarie: c.Index === 7,
          isLyon: c.Index === 14,
        }
      })
    })),

    sortie: raw.Sorties?.[0] ? {
      id: raw.Sorties[0]._id?.$oid || raw.Sorties[0]._id,
      activation: raw.Sorties[0].Activation,
      expiry: (() => {
        const e = raw.Sorties[0].Expiry
        if (!e) return null
        if (typeof e === 'object' && e?.$date?.$numberLong) return new Date(parseInt(e.$date.$numberLong, 10))
        return new Date(e)
      })(),
      boss: resolveNode(raw.Sorties[0].Boss, dict, ERg),
      variants: (raw.Sorties[0].Variants || []).map(v => ({
        missionType: resolveMissionType(v.missionType, dict, ERg),
        modifier: resolveNode(v.modifierType, dict, ERg),
        node: resolveNode(v.node, dict, ERg)
      }))
    } : null,

    archonHunt: raw.LiteSorties?.[0] ? {
      id: raw.LiteSorties[0]._id?.$oid || raw.LiteSorties[0]._id,
      activation: raw.LiteSorties[0].Activation,
      expiry: (() => {
        const e = raw.LiteSorties[0].Expiry
        if (!e) return null
        if (typeof e === 'object' && e?.$date?.$numberLong) return new Date(parseInt(e.$date.$numberLong, 10))
        return new Date(e)
      })(),
      boss: resolveNode(raw.LiteSorties[0].Boss, dict, ERg),
      missions: (raw.LiteSorties[0].Missions || []).map(m => ({
        type: resolveMissionType(m.missionType, dict, ERg),
        node: resolveNode(m.node, dict, ERg)
      }))
    } : null,

    nightwave: raw.SeasonInfo ? {
      id: raw.SeasonInfo._id?.$oid || raw.SeasonInfo._id,
      activation: raw.SeasonInfo.Activation,
      expiry: (() => {
        const e = raw.SeasonInfo.Expiry
        if (!e) return null
        if (typeof e === 'object' && e?.$date?.$numberLong) return new Date(parseInt(e.$date.$numberLong, 10))
        return new Date(e)
      })(),
      season: raw.SeasonInfo.Season,
      phase: raw.SeasonInfo.Phase,
      params: raw.SeasonInfo.Params,
      affiliationTag: raw.SeasonInfo.AffiliationTag,
      credType: (() => {
        if (raw.SeasonInfo?.AffiliationTag?.includes('Intermission16')) return '/Lotus/Types/Items/MiscItems/NoraIntermissionSixteenCreds';
        const credReward = nightwaveRewards.find(r => (r.name?.includes('Cred') || r.uniqueName?.includes('Cred')))
        return credReward?.uniqueName || '/Lotus/Types/Items/MiscItems/NoraIntermissionSixteenCreds'
      })(),
      name: (() => {
        if (raw.SeasonInfo?.AffiliationTag?.includes('Intermission16')) return "Amir's Shockwave";
        const credReward = nightwaveRewards.find(r => (r.name?.includes('Cred') || r.uniqueName?.includes('Cred')))
        if (credReward) {
          const credName = dict[credReward.name] || credReward.name || ''
          const match = credName.match(/:\s*(.+?)\s*Cred$/m)
          if (match) return match[1].trim()
        }
        return ES?.[raw.SeasonInfo.AffiliationTag]?.name ? (dict[ES[raw.SeasonInfo.AffiliationTag].name] || "Amir's Shockwave") : "Amir's Shockwave"
      })(),
      host: "Amir Beckett",
      rewards: (raw.SeasonInfo?.AffiliationTag?.includes('Intermission16') || nightwaveRewards.length === 0 ? AMIRS_SHOCKWAVE_REWARDS : nightwaveRewards.slice(0, 30)).map((r, idx) => {
        const iconPath = r.icon || null
        const eiImage = EI[r.uniqueName] || null
        const exportImageEntry = imagesMap[iconPath] || {}
        const contentHash = exportImageEntry.contentHash
        const highQualityUrl = contentHash ? `asset-cache://content.warframe.com/PublicExport${iconPath}!${contentHash}` : null
        const browseWfUrl = iconPath ? `asset-cache://browse.wf${iconPath}` : null
        const modEntry = ExportUpgrades?.[r.uniqueName]
        const isMod = modEntry != null || (iconPath?.includes('/Upgrades/Mods/') || EI[r.uniqueName]?.includes('/Upgrades/Mods/') || false)
        const modFrame = isMod ? (() => {
          const u = (r.uniqueName || '').toLowerCase()
          const rarity = (modEntry?.rarity || '').toLowerCase()
          if (u.includes('/fusers/')) return 'Fuser'
          if (u.includes('galvanized')) return 'Galvanized'
          if (u.includes('amalgam')) return 'Amalgam'
          if (u.includes('peculiar')) return 'Peculiar'
          if (u.includes('/immortal/antivirus')) return 'Antivirus'
          if (u.includes('/immortal/')) return 'Requiem'
          if (u.includes('archon')) return 'Archon'
          if (u.includes('grimoire') || u.includes('tome')) return 'Tome'
          if (u.includes('/dataspike/potency/') || u.includes('potency')) return 'Potency'
          if (u.includes('/antiques/') || u.includes('/antique/') || u.includes('tektolyst')) return 'Tektolyst'
          if (rarity === 'uncommon') return 'Normal Uncommon'
          if (rarity === 'rare') return 'Normal Rare'
          if (rarity === 'legendary') return 'Normal Legendary'
          return 'Normal Common'
        })() : null
        return {
          name: r.name ? (dict[r.name] || dict['/' + r.name] || r.name) : 'Reward',
          uniqueName: r.uniqueName,
          itemCount: r.itemCount,
          image: highQualityUrl || eiImage || browseWfUrl || null,
          iconPath: iconPath,
          modFrame
        }
      }),
      challenges: (raw.SeasonInfo.ActiveChallenges || []).map(c => {
        const challengeEntry = EC?.[c.Challenge] || {}
        const isDaily = !!c.Daily
        const isElite = c.Challenge?.includes('WeeklyHard') || (challengeEntry.standing || 0) >= 7000
        const standing = challengeEntry.standing || (isDaily ? 1000 : (isElite ? 7000 : 4500))
        const requiredCount = challengeEntry.requiredCount || 1
        const rawKey = (c.Challenge || '').split('/').pop()
        // ChallengeProgress (Name -> Progress from the player profile export) is
        // the trustworthy completion signal - the raw ActiveChallenges entry has
        // no reliable completed flag of its own.
        const progress = challengeProgress?.get(rawKey) ?? 0
        const isCompleted = requiredCount > 0 && progress >= requiredCount
        const expiryMs = c.Expiry?.$date?.$numberLong
          ? parseInt(c.Expiry.$date.$numberLong, 10)
          : (c.Expiry ? new Date(c.Expiry).getTime() : 0)
        const weekMs = 7 * 24 * 60 * 60 * 1000
        const isRecovered = !isCompleted && expiryMs > 0 && (Date.now() - expiryMs > weekMs)
        return {
          id: c._id?.$oid || c._id,
          challengeKey: rawKey,
          rawChallenge: c.Challenge,
          name: resolveChallenge(c.Challenge, dict, EC),
          desc: resolveChallengeDesc(c.Challenge, dict, EC, ERg),
          expiry: c.Expiry,
          isDaily,
          xp: standing,
          isElite,
          requiredCount,
          progress,
          isCompleted,
          isRecovered,
          icon: challengeEntry.icon || null
        }
      })
    } : null,

    archimedeas: (raw.Conquests || []).map(c => ({
          id: c._id?.$oid || c._id,
      activation: c.Activation,
      expiry: c.Expiry,
      type: c.Type,
      personalModifiers: (c.Variables || []).map(v => {
        const lookup = (CONQUEST_OVERRIDES[v.toLowerCase()] || v).toLowerCase()
        let rawDesc = archMap[lookup + '_desc'] || archMap[lookup + '_description'] || archMap[lookup] || null
        if (rawDesc) {
          if (lookup === 'shielddelay') rawDesc = rawDesc.split('|val|').join('500')
          else if (lookup === 'timedilation') rawDesc = rawDesc.split('|val|').join('50')
          else if (rawDesc.includes('|val|')) rawDesc = null
        }
        return {
          name: archMap[lookup] ?? resolvePriority(v),
          description: rawDesc
        }
      }),
      missions: (c.Missions || []).map(m => {
        const diff = m.difficulties?.find(d => d.type === 'CD_HARD') || m.difficulties?.find(d => d.type === 'CD_NORMAL') || m.difficulties?.[0];
        const devLookup = diff?.deviation ? (CONQUEST_OVERRIDES[diff.deviation.toLowerCase()] || diff.deviation).toLowerCase() : null;
        const devRawDesc = devLookup ? (archMap[devLookup + '_desc'] || archMap[devLookup + '_description'] || archMap[devLookup] || null) : null
        const devDescription = devRawDesc && !devRawDesc.includes('|val|') ? devRawDesc : null
        return {
          missionType: resolveMissionType(m.missionType, dict, ERg),
          faction: resolveNode(m.faction, dict, ERg),
          deviation: diff?.deviation ? {
            name: archMap[devLookup] ?? resolvePriority(diff.deviation),
            description: devDescription
          } : null,
          risks: (diff?.risks || []).map(r => {
            const rLookup = (CONQUEST_OVERRIDES[r.toLowerCase()] || r).toLowerCase()
            const rRawDesc = archMap[rLookup + '_desc'] || archMap[rLookup + '_description'] || archMap[rLookup] || null
            const rDescription = rRawDesc && !rRawDesc.includes('|val|') ? rRawDesc : null
            return {
              name: archMap[rLookup] ?? resolvePriority(r),
              description: rDescription
            }
          })
        };
      })
    })),

    circuit: (raw.EndlessXpSchedule || []).flatMap(schedule =>
      (schedule.CategoryChoices || []).map(c => {
        const cat = (c.Category || '').toUpperCase()
        const isHard = cat.includes('HARD')
        return {
          category: isHard ? 'Steel Path' : 'Normal',
          choices: (c.Choices || []).map(choice => ({
            name: resolveCircuitName(choice),
            uniqueName: choice
          }))
        }
      })
    ),

    dailyDeals: (raw.DailyDeals || []).map(d => ({
      item: resolveItemName(d.StoreItem, mergedDict, uniqueNameToName),
      uniqueName: d.StoreItem,
      expiry: d.Expiry,
      discount: d.Discount,
      originalPrice: d.OriginalPrice,
      salePrice: d.SalePrice,
      total: d.AmountTotal,
      sold: d.AmountSold
    })),

    flashSales: (raw.FlashSales || []).filter(f => {
      if (!f.Discount) return false
      const now = Date.now()
      const start = f.StartDate?.$date?.$numberLong ? parseInt(f.StartDate.$date.$numberLong) : 0
      const end = f.EndDate?.$date?.$numberLong ? parseInt(f.EndDate.$date.$numberLong) : 0
      return now >= start && now < end
    }).map(f => {
      const itemName = resolveItemName(f.TypeName, mergedDict, uniqueNameToName);
      return {
      item: itemName,
      uniqueName: f.TypeName,
      discount: f.Discount,
      salePrice: f.PremiumOverride,
      originalPrice: f.PremiumOverride ? Math.round(f.PremiumOverride / (1 - f.Discount / 100)) : 0,
      expiry: f.EndDate,
    };
    }),

    // Alerts
    alerts: (raw.Alerts || []).map(a => ({
      id: a._id?.$oid || a._id,
      node: resolveNode(a.MissionInfo?.location, dict, ERg),
      missionType: resolveMissionType(a.MissionInfo?.missionType, dict, ERg),
      faction: resolveNode(a.MissionInfo?.faction, dict, ERg),
      minLevel: a.MissionInfo?.minEnemyLevel,
      maxLevel: a.MissionInfo?.maxEnemyLevel,
      rewardText: resolveRewardText(a.MissionInfo?.missionReward, dict, ERg, uniqueNameToName),
      expiry: a.Expiry,
      activation: a.Activation
    })),

    // Events / Operations (from Goals)
    events: (raw.Goals || []).map(g => {
      // Special case for known operations
      let name = ''
      if (g.Tag === 'ShadowgrapherEvent') {
        name = 'Operation Atramentum'
      } else if (g.Desc) {
        name = resolvePriority(g.Desc)
      } else if (g.Tag) {
        name = resolvePriority(g.Tag)
      }
      if (!name) name = 'Operation'
      
      return {
        id: g._id?.$oid || g._id,
        name,
        description: g.ToolTip ? resolvePriority(g.ToolTip) : '',
        factions: (g.Factions || []).map(f => resolveNode(f, dict, ERg)),
        node: g.Node ? resolveNode(g.Node, dict, ERg) : '',
        scoreVar: g.ScoreVarName,
        targetScore: g.VictoryThreshold,
        currentScore: g.Count,
        percent: Math.min(100, Math.max(0, (g.Count / g.VictoryThreshold) * 100)),
        rewards: (g.RewardTierItems || []).map(rt => resolveRewardText(rt, dict, ERg, uniqueNameToName)),
        mainReward: resolveRewardText(g.Reward, dict, ERg, uniqueNameToName),
        expiry: g.Expiry,
        activation: g.Activation
      }
    }),

    // Global Boosters (from GlobalUpgrades)
    globalBoosters: (raw.GlobalUpgrades || []).map(u => {
      const typeMap = {
        'GAMEPLAY_KILL_XP_AMOUNT': 'Affinity Booster',
        'GAMEPLAY_MONEY_REWARD_AMOUNT': 'Credit Booster',
        'GAMEPLAY_PICKUP_AMOUNT': 'Resource Booster'
      }
      const locTag = u.LocalizeTag || ''
      if (locTag.includes('DoubleCredits')) return { name: 'Double Credits', expiry: u.ExpiryDate, activation: u.Activation }
      if (locTag.includes('DoubleAffinity')) return { name: 'Double Affinity', expiry: u.ExpiryDate, activation: u.Activation }
      return {
        name: typeMap[u.UpgradeType] || splitPascal(u.UpgradeType.replace('GAMEPLAY_', '')),
        expiry: u.ExpiryDate || u.Expiry,
        activation: u.Activation
      }
    }),

    // Baro Ki'Teer (VoidTraders)
    voidTrader: (() => {
      const t = raw.VoidTraders?.[0]
      if (!t) return null
      const actMs = t.Activation?.$date?.$numberLong
        ? parseInt(t.Activation.$date.$numberLong, 10)
        : (t.Activation ? new Date(t.Activation).getTime() : 0)
      const expMs = t.Expiry?.$date?.$numberLong
        ? parseInt(t.Expiry.$date.$numberLong, 10)
        : (t.Expiry ? new Date(t.Expiry).getTime() : 0)
      return {
        node: resolveNode(t.Node, dict, ERg),
        activation: t.Activation,
        activationMs: actMs,
        expiry: t.Expiry,
        expiryMs: expMs,
        active: actMs > 0 && Date.now() >= actMs && (expMs === 0 || Date.now() < expMs),
        inventory: (t.Manifest || []).map(item => {
          // Quest-key items (e.g. Sands of Inaros) resolve to the wrong name via
          // leaf-matching (item.ItemType leaf != the quest's display name); follow
          // the chain worldstate path -> ExportRecipes -> resultType -> ExportKeys
          // to get the correct name/icon when available.
          let name = resolveItemName(item.ItemType, mergedDict, uniqueNameToName)
          let icon = null
          const recipeKey = item.ItemType?.startsWith('/Lotus/StoreItems/')
            ? item.ItemType.replace('/StoreItems/', '/')
            : item.ItemType
          const recipe = ExportRecipes?.[recipeKey]
          if (recipe?.resultType) {
            const keyEntry = ExportKeys?.[recipe.resultType]
            if (keyEntry?.name) {
              const localizedName = mergedDict[keyEntry.name] || mergedDict['/' + keyEntry.name]
              if (localizedName && typeof localizedName === 'string' && !localizedName.startsWith('/Lotus/')) {
                name = localizedName.replace(/<[^>]*>/g, '').trim()
              }
            }
            if (keyEntry?.icon) icon = keyEntry.icon
          }
          return {
            item: name,
            uniqueName: item.ItemType,
            icon,
            ducats: item.PrimePrice ?? 0,
            credits: item.RegularPrice ?? 0,
          }
        })
      }
    })(),

    cetusCycle: parseCetusCycle(raw),
    vallisCycle: parseVallisCycle(raw),
    cambionCycle: parseCambionCycle(raw),
    earthCycle: parseEarthCycle(raw),
    zarimanCycle: parseZarimanCycle(raw, bountyCycle),
    duviriCycle: parseDuviriCycle(raw),
    bounties: parseBounties(raw, { dict, suppDict, ERg, EC })
  }
}export const AMIRS_SHOCKWAVE_REWARDS = [
  {
    rank: 1,
    name: "Amir's Shockwave Cred",
    uniqueName: "/Lotus/Types/Items/MiscItems/NoraIntermissionSixteenCreds",
    itemCount: 150,
    icon: "/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png!00_+fae3sQWPNIsGWg9kC1hmw"
  },
  {
    rank: 2,
    name: "Drippy Floof",
    uniqueName: "/Lotus/Types/Items/Flavour/Floofs/1999DrippyFloof",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/Player/ContentCreators/FloofyDwagon.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/Player/ContentCreators/FloofyDwagon.png!00_+A3isA9C2S8wtxafTZPs9w"
  },
  {
    rank: 3,
    name: "Forma Bundle",
    uniqueName: "/Lotus/StoreItems/Types/Items/MiscItems/FormaBundle",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/Episodes/Weekly/FormaWeapons.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/Episodes/Weekly/FormaWeapons.png!00_8HD-HsFu3c5IC9PoEvsoSw"
  },
  {
    rank: 4,
    name: "Techrot Armor Bundle",
    uniqueName: "/Lotus/Upgrades/Cosmetics/Armor/TechrotArmorBundle",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/Player/FactionTechrot.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/Player/FactionTechrot.png!00_v-RUlMb4gQ-k9Lyl9lnDPA"
  },
  {
    rank: 5,
    name: "Globakk Syandana",
    uniqueName: "/Lotus/Upgrades/Skins/Scarves/GlobakkSyandana",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/StoreIcons/Cosmetics/Armour/WarframeSpecific/RevenantMephistoSyandana.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/Cosmetics/Armour/WarframeSpecific/RevenantMephistoSyandana.png!00_Rc-D2DaxNKDQjfZs7CkSSg"
  },
  {
    rank: 6,
    name: "Amir's Shockwave Cred",
    uniqueName: "/Lotus/Types/Items/MiscItems/NoraIntermissionSixteenCreds",
    itemCount: 50,
    icon: "/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png!00_+fae3sQWPNIsGWg9kC1hmw"
  },
  {
    rank: 7,
    name: "Submeower Decoration",
    uniqueName: "/Lotus/Types/Items/ShipDecos/SubmeowerDecoration",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png!00_+fae3sQWPNIsGWg9kC1hmw"
  },
  {
    rank: 8,
    name: "Primary Arcane Adapter",
    uniqueName: "/Lotus/Types/Items/MiscItems/WeaponPrimaryArcaneUnlocker",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/StoreIcons/MiscItems/WeaponsArcanePrimary.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/MiscItems/WeaponsArcanePrimary.png!00_RSv+8CIHwAPfmJ0GRmY2pQ"
  },
  {
    rank: 9,
    name: "Weapon Slots",
    uniqueName: "/Lotus/StoreItems/Types/StoreItems/SlotItems/TwoWeaponSlotItem",
    itemCount: 2,
    icon: "/Lotus/Interface/Icons/StoreIcons/MarketBundles/Slots/SlotRenderWeapons.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/MarketBundles/Slots/SlotRenderWeapons.png!00_GEw5aPjM++pn-alA7VGKkQ"
  },
  {
    rank: 10,
    name: "Prototype Shock Coils",
    uniqueName: "/Lotus/Upgrades/Mods/Nightwave/PrototypeShockCoils",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png!00_+fae3sQWPNIsGWg9kC1hmw"
  },
  {
    rank: 11,
    name: "Amir's Shockwave Cred",
    uniqueName: "/Lotus/Types/Items/MiscItems/NoraIntermissionSixteenCreds",
    itemCount: 50,
    icon: "/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png!00_+fae3sQWPNIsGWg9kC1hmw"
  },
  {
    rank: 12,
    name: "Stance Forma",
    uniqueName: "/Lotus/Types/Items/MiscItems/StanceForma",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/StoreIcons/Resources/CraftingComponents/StanceForma.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/Resources/CraftingComponents/StanceForma.png!00_XsBk8CFIzUSTmLQJjTnoPQ"
  },
  {
    rank: 13,
    name: "Drippy Dog Days Glyph",
    uniqueName: "/Lotus/Types/StoreItems/AvatarImages/DrippyGlyph",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/Player/DrippyGlyph.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/Player/DrippyGlyph.png!00_ru4Qg9vHlkUcs1aViIdm1w"
  },
  {
    rank: 14,
    name: "Arcane Guardian",
    uniqueName: "/Lotus/Upgrades/CosmeticEnhancers/Defensive/ArmourOnDamage",
    itemCount: 3,
    icon: "/Lotus/Interface/Icons/CosmeticEnhancers/Arcanes/Projections/ArcaneEnergise.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/CosmeticEnhancers/Arcanes/Projections/ArcaneEnergise.png!00_Rq180X+K7xeLzlHptKlpgA"
  },
  {
    rank: 15,
    name: "Teisatz Oculus",
    uniqueName: "/Lotus/Upgrades/Skins/Operator/Oculus/TeisatzOculus",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/StoreIcons/Operator/Cosmetics/Eyepieces/SWBlazeOculusEyepiece.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/Operator/Cosmetics/Eyepieces/SWBlazeOculusEyepiece.png!00_wjhm8JMLzzfi4LzCvXvtQQ"
  },
  {
    rank: 16,
    name: "Amir's Shockwave Cred",
    uniqueName: "/Lotus/Types/Items/MiscItems/NoraIntermissionSixteenCreds",
    itemCount: 50,
    icon: "/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png!00_+fae3sQWPNIsGWg9kC1hmw"
  },
  {
    rank: 17,
    name: "Xaku Raya Skin",
    uniqueName: "/Lotus/Upgrades/Skins/OtherWarframes/XakuRayaSkin",
    itemCount: 1,
    icon: "/Lotus/Interface/Cards/Images/AbilityAugments/XakuEmbraceAugment.jpg",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Cards/Images/AbilityAugments/XakuEmbraceAugment.jpg!00_FmYkoYnBYbnB9cWEQRtk1w"
  },
  {
    rank: 18,
    name: "Drippy Keychain Sugatra",
    uniqueName: "/Lotus/Upgrades/Skins/WeaponAccessories/DrippySugatra",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/StoreIcons/Cosmetics/Sugatras/AnpuSugatra.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/Cosmetics/Sugatras/AnpuSugatra.png!00_IflcW4MtsFyYq130U+qVbg"
  },
  {
    rank: 19,
    name: "Veiled Riven Cipher",
    uniqueName: "/Lotus/Types/Items/MiscItems/VeiledRivenCipher",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/StoreIcons/Gear/RivenCipher.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/Gear/RivenCipher.png!00_EZkOI6rJOd1Xia3tcX2QlA"
  },
  {
    rank: 20,
    name: "Warframe Slot",
    uniqueName: "/Lotus/StoreItems/Types/StoreItems/SlotItems/WarframeSlotItem",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/StoreIcons/MarketBundles/Slots/SlotRenderWarframe.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/MarketBundles/Slots/SlotRenderWarframe.png!00_Yvd1JP+QArMiPaX47dWbpg"
  },
  {
    rank: 21,
    name: "Amir's Shockwave Cred",
    uniqueName: "/Lotus/Types/Items/MiscItems/NoraIntermissionSixteenCreds",
    itemCount: 50,
    icon: "/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png!00_+fae3sQWPNIsGWg9kC1hmw"
  },
  {
    rank: 22,
    name: "Come Here Emote",
    uniqueName: "/Lotus/Types/Items/Emotes/ComeHereEmote",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/Categories/IconEmotes_256.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/Categories/IconEmotes_256.png!00_i5fSYm3w66pla3da6qIGww"
  },
  {
    rank: 23,
    name: "Wirematrix Ephemera",
    uniqueName: "/Lotus/Upgrades/Cosmetics/Ephemera/WirematrixEphemera",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/StoreIcons/Cosmetics/Ephemera/ArchonShardEphemera.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/Cosmetics/Ephemera/ArchonShardEphemera.png!00_ydWLnj5F5vNWyymwrsD1+w"
  },
  {
    rank: 24,
    name: "Amir's Shockwave Cred",
    uniqueName: "/Lotus/Types/Items/MiscItems/NoraIntermissionSixteenCreds",
    itemCount: 50,
    icon: "/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png!00_+fae3sQWPNIsGWg9kC1hmw"
  },
  {
    rank: 25,
    name: "Overpressured Rounds",
    uniqueName: "/Lotus/Upgrades/Mods/Nightwave/OverpressuredRounds",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png!00_+fae3sQWPNIsGWg9kC1hmw"
  },
  {
    rank: 26,
    name: "Omni Forma",
    uniqueName: "/Lotus/Types/Items/MiscItems/OmniForma",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png!00_+fae3sQWPNIsGWg9kC1hmw"
  },
  {
    rank: 27,
    name: "Entropic Color Palette",
    uniqueName: "/Lotus/Types/Items/Flavour/ColourPickers/EntropicPalette",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/StoreIcons/Palettes/ColorPickerAccessibility.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/Palettes/ColorPickerAccessibility.png!00_UwTs6EuKPq7n-Qzzcjk-QQ"
  },
  {
    rank: 28,
    name: "Umbra Forma",
    uniqueName: "/Lotus/Types/Items/MiscItems/UmbraForma",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png!00_+fae3sQWPNIsGWg9kC1hmw"
  },
  {
    rank: 29,
    name: "90's Kid Honoria",
    uniqueName: "/Lotus/Types/Items/Flavour/Honoria/90sKidHonoria",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/Player/ContentCreators/FloofyDwagon.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/Player/ContentCreators/FloofyDwagon.png!00_+A3isA9C2S8wtxafTZPs9w"
  },
  {
    rank: 30,
    name: "Kaneshell Atomicycle Regalia",
    uniqueName: "/Lotus/Upgrades/Cosmetics/Vehicles/KaneshellRegalia",
    itemCount: 1,
    icon: "/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png",
    image: "https://content.warframe.com/PublicExport/Lotus/Interface/Icons/StoreIcons/Currency/GenericCreditIcon.png!00_+fae3sQWPNIsGWg9kC1hmw"
  }
];
