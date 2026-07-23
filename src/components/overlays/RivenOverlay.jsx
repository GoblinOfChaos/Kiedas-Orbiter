import React, { useState, useEffect, useCallback, useRef } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'

const RIVEN_W = 360
const RIVEN_H = 320

const STAT_TO_PRICER = {
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
  'Combo Efficiency': 'channeling_efficiency',
  'Zoom': 'zoom',
  'Blast Radius': 'explosion_radius',
  'Beam Length': 'beam_length',
  'Combo Count': 'chance_to_gain_combo_count',
  'Combo Count Chance': 'chance_to_gain_combo_count',
}

function cleanStatName(raw) {
  if (!raw) return ''
  const trimmed = raw.trim()
  // 1. exact match against original
  const exact = STAT_TO_PRICER[trimmed]
  if (exact) return exact.toLowerCase().replace(/\s+/g, '_')

  // 2. case-insensitive exact match
  for (const [key, val] of Object.entries(STAT_TO_PRICER)) {
    if (trimmed.toLowerCase() === key.toLowerCase()) return val.toLowerCase().replace(/\s+/g, '_')
  }

  // 3. strip common OCR noise (leading vowels 'a', 'e', etc.) and retry
  const deNoised = trimmed.replace(/^[aAeEiIoOuU]+/, '')
  for (const [key, val] of Object.entries(STAT_TO_PRICER)) {
    if (deNoised.toLowerCase() === key.toLowerCase()) return val.toLowerCase().replace(/\s+/g, '_')
  }

  // 4. substring: known stat name contained in raw, or raw contained in known name
  for (const [key, val] of Object.entries(STAT_TO_PRICER)) {
    const kl = key.toLowerCase()
    const rl = trimmed.toLowerCase()
    if (rl.includes(kl) || kl.includes(rl)) return val.toLowerCase().replace(/\s+/g, '_')
  }

  // 5. fallback: aggressively clean
  return trimmed
    .replace(/^[aAeEiIoOuU]+/, '')
    .replace(/[^a-zA-Z ]/g, '')
    .trim().toLowerCase().replace(/\s+/g, '_')
}

/// Returns a human-readable display name for a stat matching the STAT_TO_PRICER keys.
function displayStatName(raw) {
  if (!raw) return ''
  const trimmed = raw.trim()
  // Try exact case-insensitive match and return the properly-cased key
  for (const key of Object.keys(STAT_TO_PRICER)) {
    if (trimmed.toLowerCase() === key.toLowerCase()) return key
  }
  // Try with leading vowel stripped (OCR artifact like "AHeat")
  const deNoised = trimmed.replace(/^[aAeEiIoOuU]+/, '')
  for (const key of Object.keys(STAT_TO_PRICER)) {
    if (deNoised.toLowerCase() === key.toLowerCase()) return key
  }
  // Try substring match
  for (const key of Object.keys(STAT_TO_PRICER)) {
    const kl = key.toLowerCase()
    const rl = trimmed.toLowerCase()
    if (rl.includes(kl) || kl.includes(rl)) return key
  }
  // Fallback: just clean up the raw OCR text
  return trimmed.replace(/^[aAeEiIoOuU]+/, '')
}

function parseRivenOcr(text) {
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

  const GC_GARBAGE = /^(mod|drain|capacity|polarity|roll|reroll|counter|rerolls|riven)$/i

  while (i < parts.length) {
    const p = parts[i]
    if (/^MR\s/i.test(p)) {
      mr = p.replace(/^MR\s*/i, '').trim()
      i++; continue
    }
    if (/^\d+$/.test(p)) {
      rolls = parseInt(p)
      i++; continue
    }
    if (/^[+\-xX]\s*[\d.,]+[x%]?/.test(p)) break
    if (GC_GARBAGE.test(p)) { i++; continue }
    if (weaponName) weaponName += ' ' + p
    else weaponName = p
    i++
  }

  // Clean any remaining garbage from the weapon name (e.g. "MOD DRAIN" as one part)
  weaponName = weaponName
    // Strip leading mod-drain number (e.g. "18-Aksomati" → "Aksomati")
    .replace(/^\d+\s*[-–—]\s*/, '')
    .replace(/\s+(mod(\s+drain)?|drain|capacity|polarity)\s*\d*/gi, '')
    .replace(/\s+(roll(\s+counter)?|counter|reroll|rerolls)\s*\d*/gi, '')
    .replace(/\s+riven\s*$/i, '')
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

export default function RivenOverlay() {
  const label = getCurrentWindow().label
  const isNew = label === 'overlay-riven-new'
  const [visible, setVisible] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)
  const aliveRef = useRef(true)
  const showingRef = useRef(false)
  const knownWeaponsRef = useRef([])
  const knownWeaponsLowerRef = useRef([])

  const [parsed, setParsed] = useState(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [estimatedPrice, setEstimatedPrice] = useState(null)
  const [rivenInfo, setRivenInfo] = useState(null)
  const [knownWeapons, setKnownWeapons] = useState([])

  useEffect(() => {
    invoke('get_known_weapon_names').then(names => {
      setKnownWeapons(names)
      knownWeaponsRef.current = names
      knownWeaponsLowerRef.current = names.map(w => w.toLowerCase())
    }).catch(() => { })
  }, [])

  function extractWeaponName(ocrName) {
    if (!ocrName) return ''
    const known = knownWeaponsRef.current
    const knownLower = knownWeaponsLowerRef.current
    // Strip common garbage suffixes: mod drain, capacity, polarity, reroll counter, etc.
    let cleaned = ocrName
      .replace(/\s+(mod(\s+drain)?|drain|capacity|polarity)\s*\d*$/i, '')
      .replace(/\s+(roll(\s+counter)?|counter|reroll|rerolls)\s*\d*$/i, '')
      .replace(/\s+riven$/i, '')
      .replace(/\s*\(.*?\)\s*$/, '')
      .trim()
    if (!cleaned) cleaned = ocrName
    const lower = cleaned.toLowerCase()

    // Helper: try to match `lower` against known weapons, return longest match or null
    const tryMatch = (str) => {
      // 1. exact match
      for (let i = 0; i < known.length; i++) {
        if (str === knownLower[i]) return known[i]
      }
      // 2. longest prefix match
      let best = ''
      for (let i = 0; i < known.length; i++) {
        if (str.startsWith(knownLower[i]) && known[i].length > best.length) {
          best = known[i]
        }
      }
      if (best) return best
      // 3. longest substring match
      for (let i = 0; i < known.length; i++) {
        if (str.includes(knownLower[i]) && known[i].length > best.length) {
          best = known[i]
        }
      }
      return best || null
    }

    const direct = tryMatch(lower)
    if (direct) return direct

    // Try with leading number+hyphen stripped (mod drain "18-" prefix)
    const noPrefix = lower.replace(/^\d+\s*[-–—]\s*/, '')
    if (noPrefix !== lower) {
      const unprefixed = tryMatch(noPrefix)
      if (unprefixed) return unprefixed
      // Also try each known weapon without its number prefix
      for (let i = 0; i < known.length; i++) {
        const wNoPrefix = knownLower[i].replace(/^\d+\s*[-–—]\s*/, '')
        if (wNoPrefix !== knownLower[i] && noPrefix === wNoPrefix) return known[i]
      }
    }

    // 4. iterative suffix strip: keep popping words until we find a known name
    const words = cleaned.trim().split(/\s+/)
    while (words.length > 1) {
      words.pop()
      const trial = words.join(' ').toLowerCase()
      const matched = tryMatch(trial)
      if (matched) return matched
      // Also try no-prefix variant
      const trialNoPrefix = trial.replace(/^\d+\s*[-–—]\s*/, '')
      if (trialNoPrefix !== trial) {
        const matched2 = tryMatch(trialNoPrefix)
        if (matched2) return matched2
      }
    }
    // 5. last resort: return first word only (with number prefix stripped)
    return cleaned.trim().split(/\s+/)[0].replace(/^\d+\s*[-–—]\s*/, '') || cleaned
  }

  const doPricing = useCallback((p) => {
    if (!p || !p.stats.length) { setEstimatedPrice(null); setRivenInfo(null); return }
    const weaponName = extractWeaponName(p.name || '')
    const pos = p.stats.filter(s => !s.value.startsWith('-')).map(s => cleanStatName(s.name))
    const neg = p.stats.filter(s => s.value.startsWith('-') || /^x/i.test(s.value)).map(s => cleanStatName(s.name))

    console.log('[PRICER] weaponName:', weaponName)
    console.log('[PRICER] pos:', pos)
    console.log('[PRICER] neg:', neg)
    console.log('[PRICER] parsed.name was:', p.name)

    invoke('estimate_riven_full', {
      input: {
        weapon_name: weaponName,
        re_rolls: parseInt(p.rolls ?? 0),
        positive1: pos[0] || null,
        positive2: pos[1] || null,
        positive3: pos[2] || null,
        negative: neg[0] || null,
      }
    }).then(info => {
      if (aliveRef.current) {
        setRivenInfo(info)
        setEstimatedPrice(info?.price ?? null)
      }
    }).catch(console.error)
  }, [])

  const doOcr = useCallback((pos) => {
    if (!aliveRef.current) return
    setOcrLoading(true)
    setParsed(null)
    setEstimatedPrice(null)
    invoke('ocr_riven_card', { position: pos })
      .then((res) => {
        if (aliveRef.current) {
          const p = parseRivenOcr(res.text)
          setParsed(p)
          doPricing(p)
        }
      })
      .catch(() => { if (aliveRef.current) setParsed({ name: '', mr: '', stats: [], raw: '[OCR failed]' }) })
      .finally(() => { if (aliveRef.current) setOcrLoading(false) })
  }, [doPricing])

  const show = useCallback(() => {
    if (showingRef.current) return
    showingRef.current = true
    aliveRef.current = true
    setVisible(true)
    setParsed(null)
    invoke('show_overlay_window', { label }).catch(() => { })
      .finally(() => { showingRef.current = false })
  }, [label])

  const hide = useCallback(() => {
    aliveRef.current = false
    showingRef.current = false
    setVisible(false)
    setParsed(null)
    setEstimatedPrice(null)
    invoke('hide_overlay_window', { label }).catch(() => { })
  }, [label])

  useEffect(() => {
    const unsubs = [
      listen('riven-ocr-result', (e) => {
        const payload = typeof e.payload === 'string' ? e.payload : String(e.payload)
        if (aliveRef.current) {
          setVisible(true)
          setOcrLoading(false)
          const p = parseRivenOcr(payload)
          setParsed(p)
          doPricing(p)
        }
      }),
    ]

    if (isNew) {
      let timer = null
      unsubs.push(
        listen('riven-reroll', () => {
          timer = setTimeout(() => {
            show()
            doOcr('Middle')
          }, 4000)
        }),
        listen('riven-reroll-confirmed', () => {
          if (timer) { clearTimeout(timer); timer = null }
          timer = setTimeout(() => hide(), 2000)
        }),
        listen('riven-screen-closed', () => {
          if (timer) { clearTimeout(timer); timer = null }
          hide()
        }),
      )
      return () => {
        if (timer) clearTimeout(timer)
        unsubs.forEach(p => p.then(f => f()))
      }
    } else {
      let refreshTimer = null
      unsubs.push(
        listen('riven-linked-open', () => { show(); doOcr('Linked') }),
        listen('riven-screen-open', () => {
          show()
          doOcr('Middle')
        }),
        listen('riven-linked-closed', () => hide()),
        listen('riven-screen-closed', () => {
          if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null }
          hide()
        }),
        listen('riven-reroll-confirmed', () => {
          refreshTimer = setTimeout(() => {
            setRefreshTick(t => t + 1)
            doOcr('Middle')
          }, 2000)
        }),
      )
      return () => {
        if (refreshTimer) clearTimeout(refreshTimer)
        unsubs.forEach(p => p.then(f => f()))
      }
    }
  }, [isNew, show, hide, doOcr, doPricing, label])

  if (!visible) return null

  const posClass = (v) => {
    if (!v) return 'text-kronos-text'
    // x-prefixed values (e.g. "x0.65") are negative modifiers
    if (/^x/i.test(v)) return 'text-red-400'
    const num = parseFloat(v)
    if (num > 0) return 'text-green-400'
    if (num < 0) return 'text-red-400'
    return 'text-kronos-text'
  }

  const fmtVal = (v) => {
    if (!v) return ''
    const s = String(v)
    if (s.startsWith('+') || s.startsWith('-') || /^x/i.test(s)) return s
    return '+' + s
  }

  return (
    <div className="w-full h-full overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-black to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.06),transparent_70%)]" />

      <div className="relative z-10 flex flex-col w-full h-full">
        {/* Header: weapon name + badge */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {parsed?.name && (
              <span className="text-[14px] font-black text-white truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] tracking-tight">
                {parsed.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {rivenInfo?.grade && rivenInfo.grade !== 'N/A' && (
              <span className={`text-[12px] font-black px-2 py-0.5 rounded ${
                rivenInfo.grade === 'S' ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30' :
                rivenInfo.grade === 'A' ? 'bg-green-400/20 text-green-400 border border-green-400/30' :
                rivenInfo.grade === 'B' ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30' :
                rivenInfo.grade === 'C' ? 'bg-orange-400/20 text-orange-400 border border-orange-400/30' :
                'bg-red-400/20 text-red-400 border border-red-400/30'
              }`}>{rivenInfo.grade}</span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-3 pb-3 flex flex-col overflow-hidden">
          {ocrLoading ? (
            <div className="flex items-center justify-center flex-1">
              <p className="text-[12px] text-zinc-300 uppercase tracking-widest font-bold animate-pulse">Scanning...</p>
            </div>
          ) : parsed ? (
            <div className="flex flex-col flex-1 overflow-hidden gap-1.5">
              {/* Stats */}
              {parsed.stats.length > 0 && (
                <div className="space-y-[2px]">
                  {parsed.stats.map((s, i) => (
                    <div key={i} className="flex justify-between items-center px-2.5 py-1.5 rounded bg-white/[0.03]">
                      <span className="text-[12px] text-zinc-200 font-medium truncate pr-2">
                        {displayStatName(s.name)}
                      </span>
                      <span className={`text-[13px] font-black whitespace-nowrap ${posClass(s.value)}`}>
                        {fmtVal(s.value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Rolls + MR inline */}
              <div className="flex items-center gap-2 px-1">
                {parsed.rolls > 0 && (
                  <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">{parsed.rolls} rolls</span>
                )}
                {parsed.mr && (
                  <>
                    <span className="text-zinc-500">|</span>
                    <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">MR {parsed.mr}</span>
                  </>
                )}
              </div>

              {/* Pricing info */}
              {rivenInfo ? (
                <div className="mt-auto grid grid-cols-3 gap-[1px] rounded-lg overflow-hidden">
                  <div className="bg-white/[0.04] px-2 py-2 text-center">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Average Value</span>
                    <span className="text-[14px] font-black text-yellow-400">{Math.round(rivenInfo.expected_value)}p</span>
                  </div>
                  <div className="bg-white/[0.04] px-2 py-2 text-center">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Your Value</span>
                    <span className="text-[14px] font-black text-yellow-400">{Math.round(estimatedPrice)}p</span>
                  </div>
                  <div className="bg-white/[0.04] px-2 py-2 text-center">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Reroll Potential</span>
                    <span className={`text-[14px] font-black ${(1 - (rivenInfo.probability_stagnant ?? 0.5)) * 100 > 50 ? 'text-green-400' : 'text-red-400'}`}>
                      {Math.round((1 - (rivenInfo.probability_stagnant ?? 0.5)) * 100)}%
                    </span>
                  </div>
                  <div className="bg-white/[0.04] px-2 py-2 text-center col-span-3">
                    {(() => {
                      const wr = rivenInfo.weapon_rank ?? 999;
                      const total = rivenInfo.total_weapons ?? 1;
                      const tier = wr <= total * 0.2 ? 'Meta' : wr <= total * 0.5 ? 'Popular' : wr <= total * 0.7 ? 'Average' : wr <= total * 0.9 ? 'Niche' : 'Unpopular';
                      const roll = rivenInfo.grade === 'S' ? 'Perfect' : rivenInfo.grade === 'A' ? 'Good' : rivenInfo.grade === 'B' ? 'Average' : rivenInfo.grade === 'C' ? 'Mediocre' : 'Bad';
                      return (
                        <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                          {tier} Weapon &middot; {roll} rolls
                        </span>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="mt-auto px-2 py-2 text-center bg-white/[0.02] rounded-lg">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pricing unavailable</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center flex-1">
              <p className="text-[13px] text-zinc-400 uppercase tracking-widest font-bold">Waiting for card...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
