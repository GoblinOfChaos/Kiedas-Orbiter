import React, { useState, useEffect, useCallback, useRef } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'

const RIVEN_W = 360
const RIVEN_H = 290

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
  const cleaned = raw.replace(/[^a-zA-Z0-9 ]/g, '').trim().toLowerCase().replace(/\s+/g, '_')
  const mapped = STAT_TO_PRICER[raw.trim()]
  return mapped ? mapped.toLowerCase().replace(/\s+/g, '_') : cleaned
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
    if (/^[+-]\s*[\d.,]+%?/.test(p)) break
    if (weaponName) weaponName += ' ' + p
    else weaponName = p
    i++
  }

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

    if (/^[+-]\s*[\d.,]+%?/.test(p)) {
      flushStat()
      const m = p.match(/^([+-]\s*[\d.,]+%?)\s*(.*)/)
      pendingValue = m ? m[1].replace(/\s+/g, '').replace(',', '.') : p.replace(/\s+/g, '')
      pendingName = m ? m[2].trim() : ''
      i++
      continue
    }

    if (/^\(?x\d/i.test(p) || /[x×]\d/i.test(p) || /^for\s/i.test(p) || /^heavy/i.test(p)) {
      if (pendingName) pendingName += ' ' + p
      i++
      continue
    }

    if (/^\d+$/.test(p)) {
      rolls = parseInt(p)
      i++; continue
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

  const [parsed, setParsed] = useState(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [estimatedPrice, setEstimatedPrice] = useState(null)
  const [rivenInfo, setRivenInfo] = useState(null)
  const [knownWeapons, setKnownWeapons] = useState([])

  useEffect(() => {
    invoke('get_known_weapon_names').then(names => {
      setKnownWeapons(names)
      knownWeaponsRef.current = names
    }).catch(() => { })
  }, [])

  function extractWeaponName(ocrName, known) {
    if (!ocrName) return ''
    const lower = ocrName.toLowerCase()
    for (const w of known) {
      if (lower === w.toLowerCase()) return w
    }
    let best = ''
    for (const w of known) {
      if (lower.startsWith(w.toLowerCase()) && w.length > best.length) {
        best = w
      }
    }
    if (best) return best
    const words = ocrName.trim().split(/\s+/)
    if (words.length > 1) {
      words.pop()
      return words.join(' ')
    }
    return ocrName
  }

  const doPricing = useCallback((p) => {
    if (!p || !p.stats.length) { setEstimatedPrice(null); setRivenInfo(null); return }
    const weaponName = extractWeaponName(p.name || '', knownWeaponsRef.current)
    const pos = p.stats.filter(s => !s.value.startsWith('-')).map(s => cleanStatName(s.name))
    const neg = p.stats.filter(s => s.value.startsWith('-')).map(s => cleanStatName(s.name))

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
    invoke('show_overlay_window', { label })
      .then(() => invoke('resize_overlay_window', { label, width: RIVEN_W, height: RIVEN_H }))
      .catch(() => { })
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
          // show() already called show_overlay_window — just ensure correct size
          invoke('resize_overlay_window', { label, width: RIVEN_W, height: RIVEN_H }).catch(() => { })
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
    const num = parseFloat(v)
    if (num > 0) return 'text-green-400'
    if (num < 0) return 'text-red-400'
    return 'text-kronos-text'
  }

  const fmtVal = (v) => {
    if (!v) return ''
    return v.startsWith('+') || v.startsWith('-') ? v : '+' + v
  }

  return (
    <div className="w-full h-full overflow-hidden flex items-center justify-center relative">
      <div className="absolute inset-0 bg-black" />

      <div className="relative z-10 flex flex-col w-full h-full">
        <div key={refreshTick} className="px-3 py-2 flex items-center gap-2">
          {rivenInfo?.grade && rivenInfo.grade !== 'N/A' && (
            <span className={`text-[11px] font-black ${rivenInfo.grade === 'S' ? 'text-yellow-300' :
              rivenInfo.grade === 'A' ? 'text-green-400' :
                rivenInfo.grade === 'B' ? 'text-blue-400' :
                  rivenInfo.grade === 'C' ? 'text-orange-400' :
                    'text-red-400'
              }`}>{rivenInfo.grade}</span>
          )}
          <span className="text-xs font-bold text-kronos-text uppercase tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {isNew ? 'Riven (New)' : 'Riven (Current)'}
          </span>
        </div>
        <div className="px-3 pb-3 flex flex-col flex-1 overflow-hidden">
          {ocrLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[12px] text-kronos-dim uppercase tracking-wider animate-pulse drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">OCR in progress...</p>
            </div>
          ) : parsed ? (
            <div className="flex flex-col overflow-hidden flex-1">
              {parsed.name && (
                <p className="text-[13px] font-bold text-kronos-accent truncate mb-1.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">{parsed.name}</p>
              )}
              <div className="overflow-y-auto flex-1 space-y-0.5 pr-1">
                {parsed.stats.map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-[10px] leading-tight group">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
                      <span className="text-kronos-text truncate drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">{s.name}</span>
                      <span className="text-[11px] font-black px-1 rounded bg-white/5 text-kronos-dim opacity-0 group-hover:opacity-100 transition-opacity">?</span>
                    </div>
                    <span className={`font-bold whitespace-nowrap drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] ${posClass(s.value)}`}>{fmtVal(s.value)}</span>
                  </div>
                ))}
              </div>

              {rivenInfo && (<>
                <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-4 gap-1 bg-black/30 p-1.5 rounded text-[10px]">
                  <div className="text-center">
                    <span className="text-kronos-dim uppercase tracking-wider font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">Weapon Rank</span>
                    <p className="font-bold text-kronos-accent drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {rivenInfo.weapon_rank != null ? `#${rivenInfo.weapon_rank}/${rivenInfo.total_weapons ?? '?'}` : 'N/A'}
                    </p>
                  </div>
                  <div className="text-center">
                    <span className="text-kronos-dim uppercase tracking-wider font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">Avg Value</span>
                    <p className="font-bold text-yellow-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{Math.round(rivenInfo.expected_value)}p</p>
                  </div>
                  <div className="text-center">
                    <span className="text-kronos-dim uppercase tracking-wider font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">Your Value</span>
                    <p className="font-bold text-yellow-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{Math.round(estimatedPrice)}p</p>
                  </div>
                  <div className="text-center">
                    <span className="text-kronos-dim uppercase tracking-wider font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">Potential</span>
                    <p className={`font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${(1 - (rivenInfo.probability_stagnant ?? 0.5)) * 100 > 50 ? 'text-green-400' : 'text-red-400'}`}>
                      {Math.round((1 - (rivenInfo.probability_stagnant ?? 0.5)) * 100)}%
                    </p>
                  </div>
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-white/10 text-center">
                  {(() => {
                    const wr = rivenInfo.weapon_rank ?? 999;
                    const total = rivenInfo.total_weapons ?? 1;
                    const tier = wr <= total * 0.2 ? 'Meta' : wr <= total * 0.5 ? 'Popular' : wr <= total * 0.7 ? 'Average' : wr <= total * 0.9 ? 'Niche' : 'Unpopular';
                    const roll = rivenInfo.grade === 'S' ? 'Perfect' : rivenInfo.grade === 'A' ? 'Good' : rivenInfo.grade === 'B' ? 'Average' : rivenInfo.grade === 'C' ? 'Mediocre' : 'Bad';
                    const belowAvg = estimatedPrice < rivenInfo.expected_value;
                    const isGoodWeapon = tier === 'Meta' || tier === 'Popular';
                    const isGoodRoll = rivenInfo.grade === 'S' || rivenInfo.grade === 'A' || rivenInfo.grade === 'B';
                    const isBadRoll = rivenInfo.grade === 'D' || rivenInfo.grade === 'F';
                    let action;
                    if (isGoodWeapon && isGoodRoll) action = 'Sell';
                    else if (isGoodWeapon && belowAvg) action = 'Reroll worthy';
                    else if (isGoodWeapon && isBadRoll) action = 'Reroll';
                    else if (tier === 'Average' && isGoodRoll) action = 'Sell';
                    else if (tier === 'Average' && belowAvg) action = 'Reroll worthy';
                    else if (tier === 'Average') action = 'Reroll';
                    else if (tier === 'Niche' && (rivenInfo.grade === 'S' || rivenInfo.grade === 'A')) action = 'Sell';
                    else if (tier === 'Unpopular' && (rivenInfo.grade === 'S' || rivenInfo.grade === 'A')) action = 'Sell';
                    else if (belowAvg) action = 'Dissolve';
                    else action = 'Dissolve';
                    return <span className="text-[11px] font-bold text-kronos-accent drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{tier} Weapon, {roll} rolls<span className="text-kronos-dim">; Suggestion:</span> <span className="text-yellow-400">{action}</span></span>;
                  })()}
                </div>
              </>)}
              {parsed.mr && (
                <div className="mt-1.5 pt-1.5 border-t border-white/10 flex justify-between items-center">
                  <span className="text-xs text-kronos-dim drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">MR Requirement</span>
                  <span className="text-[13px] font-bold text-kronos-accent drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{parsed.mr}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-[14px] text-kronos-dim uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Waiting for card...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
