// Localized riven-card OCR support: stat-name aliases + card-header garbage words.
//
// Stat names are matched three ways (see foldVariants):
//   1. folded  — Unicode NFD-stripped, ß→s   ("Größe" → "grose")
//   2. expanded — umlauts→ae/oe/ue, ß→ss     ("Größe" → "groesse")
//   3. tight   — folded with all non-alnum removed ("Krit. Chance" → "kritchance")
// Aliases come from two sources: the i18n `rivenStats` table (all 15 locales,
// inverted English-key → localized-name) and GAME_STAT_ALIASES (in-game terms
// extracted from the DE/FR export manifests, where the table drifts).

export const STAT_TO_PRICER = {
  'Critical Chance': 'critical_chance',
  'Critical Damage': 'critical_damage',
  'Damage': 'base_damage_/_melee_damage',
  'Melee Damage': 'base_damage_/_melee_damage',
  'Multishot': 'multishot',
  'Attack Speed': 'fire_rate_/_attack_speed',
  'Fire Rate': 'fire_rate_/_attack_speed',
  'Status Chance': 'status_chance',
  'Status Duration': 'status_duration',
  'Range': 'range',
  'Puncture': 'puncture_damage',
  'Slash': 'slash_damage',
  'Impact': 'impact_damage',
  'Heat': 'heat_damage',
  'Cold': 'cold_damage',
  'Electricity': 'electric_damage',
  'Toxin': 'toxin_damage',
  'Reload Speed': 'reload_speed',
  'Magazine Capacity': 'magazine_capacity',
  'Ammo Maximum': 'ammo_maximum',
  'Punch Through': 'punch_through',
  'Projectile Speed': 'projectile_speed',
  'Initial Combo': 'channeling_damage',
  'Combo Duration': 'combo_duration',
  'Finisher Damage': 'finisher_damage',
  'Damage to Corpus': 'damage_vs_corpus',
  'Damage to Grineer': 'damage_vs_grineer',
  'Damage to Infested': 'damage_vs_infested',
  'Recoil': 'recoil',
  'Slide Crit Chance': 'critical_chance_on_slide_attack',
  'Critical Chance when Sliding': 'critical_chance_on_slide_attack',
  'Critical Chance while Sliding': 'critical_chance_on_slide_attack',
  'Combo Efficiency': 'channeling_efficiency',
  'Zoom': 'zoom',
  'Blast Radius': 'explosion_radius',
  'Beam Length': 'beam_length',
  'Combo Count': 'chance_to_gain_combo_count',
  'Combo Count Chance': 'chance_to_gain_combo_count',
}

/**
 * Return [folded, expanded, tight] variants of a stat/weapon string.
 * All three are lowercase.
 */
export function foldVariants(str) {
  const lower = str.toLowerCase()
  const expanded = lower
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const folded = lower
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 's')
  const tight = folded.replace(/[^\p{L}\p{N}]/gu, '')
  return [folded, expanded, tight]
}

// In-game stat terms extracted from ExportUpgrades_{de,fr}.json levelStats.
// The i18n `rivenStats` table drifts from the game in places ("Schlitz" vs
// game "Schnitt"; "Durchdringung" used for both Puncture and Punch Through),
// so these supplement — never replace — the table. Key: locale → term → English.
const GAME_STAT_ALIASES = {
  de: {
    'Krit. Chance': 'Critical Chance',
    'Krit. Schaden': 'Critical Damage',
    'Schaden': 'Damage',
    'Nahkampfschaden': 'Melee Damage',
    'Mehrfachschuss': 'Multishot',
    'Angriffsgeschwindigkeit': 'Attack Speed',
    'Feuerrate': 'Fire Rate',
    'Statuschance': 'Status Chance',
    'Statusdauer': 'Status Duration',
    'Reichweite': 'Range',
    'Durchschlag': 'Puncture',
    'Schnitt': 'Slash',
    'Einschlag': 'Impact',
    'Hitze': 'Heat',
    'Kälte': 'Cold',
    'Elektrizität': 'Electricity',
    'Gift': 'Toxin',
    'Nachladegeschwindigkeit': 'Reload Speed',
    'Magazingröße': 'Magazine Capacity',
    'Maximale Munition': 'Ammo Maximum',
    'Durchdringung': 'Punch Through',
    'Projektilgeschwindigkeit': 'Projectile Speed',
    'Start-Kombo': 'Initial Combo',
    'Kombo-Dauer': 'Combo Duration',
    'Todesstoß-Schaden': 'Finisher Damage',
    'Schaden an Corpus': 'Damage to Corpus',
    'Schaden an Grineer': 'Damage to Grineer',
    'Schaden an Befallenen': 'Damage to Infested',
    'Waffenrückstoss': 'Recoil',
    'Kritische Chance für Rutschangriff': 'Slide Crit Chance',
    'Explosionsradius': 'Blast Radius',
    'Zoom': 'Zoom',
    'Kombo-Zähler Chance': 'Combo Count Chance',
  },
  fr: {
    'Chance de critique': 'Critical Chance',
    'Dégâts critiques': 'Critical Damage',
    'Dégâts': 'Damage',
    'Dégâts en Mêlée': 'Melee Damage',
    'Tir Multiple': 'Multishot',
    "Vitesse d'Attaque": 'Attack Speed',
    'Cadence de Tir': 'Fire Rate',
    'Chances de Statut': 'Status Chance',
    'Durée de Statut': 'Status Duration',
    'Portée': 'Range',
    'Perforation': 'Puncture',
    'Tranchant': 'Slash',
    'Impact': 'Impact',
    'Feu': 'Heat',
    'Glace': 'Cold',
    'Électrique': 'Electricity',
    'Poison': 'Toxin',
    'Vitesse de Recharge': 'Reload Speed',
    'Taille Du Chargeur': 'Magazine Capacity',
    'Munitions Max': 'Ammo Maximum',
    'Pénétration': 'Punch Through',
    'Vitesse des Projectiles': 'Projectile Speed',
    'Combo initial': 'Initial Combo',
    'Durée de Combo': 'Combo Duration',
    'Dégâts de Coup de Grâce': 'Finisher Damage',
    'Dégâts aux Corpus': 'Damage to Corpus',
    'Dégâts aux Grineers': 'Damage to Grineer',
    'Dégâts aux Infestés': 'Damage to Infested',
    "Recul de l'Arme": 'Recoil',
    "Chances de Critique pour l'Attaque Glissée": 'Slide Crit Chance',
    "Rayon d'Explosion": 'Blast Radius',
    'Zoom': 'Zoom',
    'Chances de Points de Combo': 'Combo Count Chance',
  },
}

// Card-header words to strip from OCR output (mod drain, polarity, reroll
// counter). Locale-specific words supplement the English set.
const GARBAGE_BY_LOCALE = {
  de: ['kapazität', 'polarität', 'neuausrichtung', 'neuausrichtungen', 'riven'],
  fr: ['capacité', 'polarité', 'relance', 'relances', 'riven'],
}

export const DEFAULT_GARBAGE_RE = /^(mod|drain|capacity|polarity|roll|reroll|counter|rerolls|riven)$/i

export function garbageReForLocale(locale) {
  const extra = GARBAGE_BY_LOCALE[locale] || []
  if (extra.length === 0) return DEFAULT_GARBAGE_RE
  const words = ['mod', 'drain', 'capacity', 'polarity', 'roll', 'reroll', 'counter', 'rerolls', 'riven', ...extra]
  return new RegExp(`^(${words.join('|')})$`, 'i')
}

/**
 * Build a Map of localized stat-name variants → pricer stat value for a locale.
 * `locale` is the game locale id; `rivenStats` is the `rivenStats` section of
 * the locale's i18n JSON (English key → localized name).
 *
 * Game-manifest aliases are added last so they override table drift on
 * collision (e.g. German "Durchdringung" is Punch Through in-game, while the
 * table lists it for both Puncture and Punch Through).
 */
export function buildStatAliases(locale, rivenStats) {
  const map = new Map()
  const add = (term, englishKey) => {
    const pricerVal = STAT_TO_PRICER[englishKey]
    if (!pricerVal) return
    for (const variant of foldVariants(term)) {
      map.set(variant, pricerVal)
    }
  }

  if (rivenStats) {
    for (const [englishKey, localized] of Object.entries(rivenStats)) {
      if (typeof localized === 'string') add(localized, englishKey)
    }
  }
  const gameAliases = GAME_STAT_ALIASES[locale] || {}
  for (const [term, englishKey] of Object.entries(gameAliases)) {
    add(term, englishKey)
  }
  return map
}

/**
 * Resolve a stat name found in OCR output to the pricer's stat value.
 * `aliases` is the Map from buildStatAliases (localized → pricer value).
 */
export function cleanStatName(raw, aliases) {
  if (!raw) return ''
  const trimmed = raw.trim()

  // 0. localized alias match (OCR text in the game's language)
  if (aliases && aliases.size) {
    const [folded, expanded, tight] = foldVariants(trimmed)
    for (const variant of [folded, expanded, tight]) {
      const hit = aliases.get(variant)
      if (hit) return hit
    }
  }

  // 1. exact match against original, known English stat text (checked
  // before any fuzzy substring matching so exact known phrases like
  // "Critical Chance when Sliding" aren't shadowed by a shorter substring
  // match like "Critical Chance")
  const exact = STAT_TO_PRICER[trimmed]
  if (exact) return exact.toLowerCase().replace(/\s+/g, '_')

  // 0b. substring: localized alias contained in the OCR text (longest/most
  // specific alias wins, so e.g. "slide crit chance" beats "critical chance"
  // when both are substrings of the OCR'd text)
  if (aliases && aliases.size) {
    const [folded] = foldVariants(trimmed)
    let bestKey = ''
    let bestVal = ''
    for (const [key, val] of aliases) {
      if (val && key.length > bestKey.length && folded.includes(key)) {
        bestKey = key
        bestVal = val
      }
    }
    if (bestVal) return bestVal
  }

  // 2. case-insensitive exact match
  for (const [key, val] of Object.entries(STAT_TO_PRICER)) {
    if (trimmed.toLowerCase() === key.toLowerCase()) return val.toLowerCase().replace(/\s+/g, '_')
  }

  // 3. strip common OCR noise (leading vowels 'a', 'e', etc.) and retry
  const deNoised = trimmed.replace(/^[aAeEiIoOuU]+/, '')
  for (const [key, val] of Object.entries(STAT_TO_PRICER)) {
    if (deNoised.toLowerCase() === key.toLowerCase()) return val.toLowerCase().replace(/\s+/g, '_')
  }

  // 4. substring: known stat name contained in raw, or raw contained in known
  // name. Prefer the longest/most specific matching key so e.g. "Slide Crit
  // Chance" beats "Critical Chance" when both are substrings of the raw text.
  {
    let bestKey = ''
    let bestVal = ''
    const rl = trimmed.toLowerCase()
    for (const [key, val] of Object.entries(STAT_TO_PRICER)) {
      const kl = key.toLowerCase()
      if ((rl.includes(kl) || kl.includes(rl)) && kl.length > bestKey.length) {
        bestKey = kl
        bestVal = val
      }
    }
    if (bestVal) return bestVal.toLowerCase().replace(/\s+/g, '_')
  }

  // 5. fallback: aggressively clean
  return trimmed
    .replace(/^[aAeEiIoOuU]+/, '')
    .replace(/[^a-zA-Z ]/g, '')
    .trim().toLowerCase().replace(/\s+/g, '_')
}

/// Returns a human-readable display name for a stat: localized OCR text is
/// resolved back to the English stat name when possible.
export function displayStatName(raw, aliases) {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (aliases && aliases.size) {
    const [folded, expanded, tight] = foldVariants(trimmed)
    for (const variant of [folded, expanded, tight]) {
      const hit = aliases.get(variant)
      if (hit) {
        // pricer value → English display name
        for (const [enKey, pricerVal] of Object.entries(STAT_TO_PRICER)) {
          if (pricerVal === hit) return enKey
        }
        return hit
      }
    }
  }
  // Try exact case-insensitive match and return the properly-cased key
  for (const key of Object.keys(STAT_TO_PRICER)) {
    if (trimmed.toLowerCase() === key.toLowerCase()) return key
  }
  // Try with leading vowel stripped (OCR artifact like "AHeat")
  const deNoised = trimmed.replace(/^[aAeEiIoOuU]+/, '')
  for (const key of Object.keys(STAT_TO_PRICER)) {
    if (deNoised.toLowerCase() === key.toLowerCase()) return key
  }
  // Try substring match, preferring the longest/most specific key
  {
    let bestKey = ''
    const rl = trimmed.toLowerCase()
    for (const key of Object.keys(STAT_TO_PRICER)) {
      const kl = key.toLowerCase()
      if ((rl.includes(kl) || kl.includes(rl)) && kl.length > bestKey.length) {
        bestKey = kl
      }
    }
    if (bestKey) {
      for (const key of Object.keys(STAT_TO_PRICER)) {
        if (key.toLowerCase() === bestKey) return key
      }
    }
  }
  // Fallback: just clean up the raw OCR text
  return trimmed.replace(/^[aAeEiIoOuU]+/, '')
}

/**
 * Parse the raw OCR text of a riven card into { name, mr, rolls, stats }.
 * `garbageRe` matches card-header words to drop (locale-aware).
 */
export function parseRivenOcr(text, garbageRe = DEFAULT_GARBAGE_RE) {
  const clean = text
    .replace(/^\[[^\]]*\]\s*/, '')
    .replace(/^[\dA-Z]{1,3}\s*\|\s*/, '')
  const parts = clean.split('|').map(s => s.trim()).filter(Boolean)
  if (parts.length === 0) return null

  let weaponName = ''
  let mr = ''
  let rolls = 0
  const stats = []
  let i = 0

  const GC_GARBAGE = garbageRe

  // Header tokens: mod-drain/capacity/polarity/reroll-counter/riven-title lines,
  // each possibly carrying a number suffix ("Kapazität 18", "Neuausrichtungen 3").
  // Reroll-counter tokens set `rolls`; drain/capacity numbers do not.
  const GARBAGE_TOKEN_RE = /^(?:(mod|drain|capacity|polarity|kapazität|polarität|capacité|polarité)|(roll|reroll|rerolls|counter|neuausrichtung|neuausrichtungen|relance|relances)|(riven|riven mod|mod riven|mod rivens))(?:\s*(\d+))?$/i

  while (i < parts.length) {
    const p = parts[i]
    if (/^MR\s/i.test(p)) {
      mr = p.replace(/^MR\s*/i, '').trim()
      i++; continue
    }
    if (/^[+\-xX]\s*[\d.,]+[x%]?/.test(p)) break
    const gm = p.match(GARBAGE_TOKEN_RE)
    if (gm) {
      if (gm[2] && gm[4] && !rolls) rolls = parseInt(gm[4])
      i++; continue
    }
    if (/^\d+$/.test(p)) {
      rolls = parseInt(p)
      i++; continue
    }
    if (GC_GARBAGE.test(p)) { i++; continue }
    if (weaponName) weaponName += ' ' + p
    else weaponName = p
    i++
  }

  // Clean any remaining garbage from the weapon name (e.g. "MOD DRAIN" as one part)
  weaponName = weaponName
    // Strip leading mod-drain number (e.g. "18-Aksomati" → "Aksomati")
    .replace(/^\d+\s*[-–—]\s*/, '')
    .replace(/\s+(mod(\s+drain)?|drain|capacity|polarity|kapazität|polarität|capacité|polarité)\s*\d*/gi, '')
    .replace(/\s+(roll(\s+counter)?|counter|reroll|rerolls|neuausrichtung|neuausrichtungen|relance|relances)\s*\d*/gi, '')
    .replace(/\s*\(.*?\)\s*/g, '')
    .trim()

  // Build a quick lookup of known stat names (lowercase)
  const KNOWN_STAT_NAMES = new Set(Object.keys(STAT_TO_PRICER).map(k => k.toLowerCase()))

  // Phase 2: parse stat pairs (value followed by name parts)
  let pendingValue = null

  const flushStat = () => {
    if (pendingValue !== null) {
      stats.push({ value: pendingValue, name: pendingName.replace(/\s+/g, ' ').trim() || '?' })
      pendingValue = null
    }
  }

  let pendingName = ''

  while (i < parts.length) {
    const p = parts[i]

    if (/^MR\s/i.test(p)) {
      mr = p.replace(/^MR\s*/i, '').trim()
      i++
      continue
    }

    if (/^[+\-xX]\s*[\d.,]+[x%]?/.test(p)) {
      flushStat()
      const m = p.match(/^([+\-xX]\s*[\d.,]+[x%]?)\s*(.*)/)
      pendingValue = m ? m[1].replace(/\s+/g, '').replace(',', '.') : p.replace(/\s+/g, '')
      pendingName = m ? m[2].trim() : ''
      i++
      continue
    }

    if (GC_GARBAGE.test(p)) { i++; continue }

    if (/^\(?x\d/i.test(p) || /[x×]\d/i.test(p) || /^for\s/i.test(p) || /^heavy/i.test(p)) {
      if (pendingName) pendingName += ' ' + p
      i++
      continue
    }

    if (/^\d+$/.test(p)) {
      rolls = parseInt(p)
      i++; continue
    }

    // If this part is a known stat name and we already have a stat in progress,
    // flush it so the known name starts a new stat (handles missing value separators).
    const pl = p.toLowerCase().replace(/^[^a-zA-Z]+/, '').replace(/[^a-zA-Z]+$/, '')
    if (pl && KNOWN_STAT_NAMES.has(pl) && pendingName && pendingValue !== null) {
      flushStat()
      pendingName = p
      i++
      continue
    }

    if (pendingName) pendingName += ' ' + p
    else pendingName = p
    i++
  }

  flushStat()

  return { name: weaponName, mr, rolls, stats, raw: text }
}
