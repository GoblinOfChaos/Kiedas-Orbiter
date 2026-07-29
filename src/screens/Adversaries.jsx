import { useMemo, useState, useEffect } from 'react'
import { PageLayout, Card } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'
import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { resolveItemName } from '../lib/warframeUtils'

// ── Progenitor element → warframes (base only, no primes) ──
const PROGENITOR = {
  Impact:     ['Ash','Atlas','Banshee','Baruuk','Excalibur','Hydroid','Inaros','Khora','Nekros','Rhino','Styanax','Wukong','Zephyr'],
  Puncture:   ['Ivara','Mag','Trinity'],
  Slash:      ['Dagath','Garuda','Kullervo','Mesa','Valkyr','Voruna'],
  Heat:       ['Ember','Jade','Nezha','Protea'],
  Cold:       ['Chroma','Frost','Qorvex','Sevagoth','Yareli'],
  Toxin:      ['Dante','Grendel','Lavos','Nidus','Saryn'],
  Electricity:['Caliban','Gauss','Gyre','Volt'],
  Magnetic:   ['Harrow','Limbo'],
  Radiation:  ['Equinox','Gara','Hildryn','Loki','Mirage','Nova','Nyx','Oberon','Octavia','Revenant','Vauban','Wisp','Xaku'],
}

const ELEMENT_ORDER = Object.keys(PROGENITOR)
const WF_PROGENITOR = {}
for (const [el, frames] of Object.entries(PROGENITOR)) {
  for (const f of frames) WF_PROGENITOR[f] = el
}


// ── Element colors (from ModCard DT_COLORS) ──
const ELEMENT_COLORS = {
  Impact:      '#CCCCCC',
  Puncture:    '#AA8855',
  Slash:       '#CC4444',
  Heat:        '#FF4444',
  Cold:        '#88CCFF',
  Toxin:       '#44FF44',
  Electricity: '#4488FF',
  Magnetic:    '#8844FF',
  Radiation:   '#FFDD44',
}

function iconSrc(iconsPath, name) {
  return iconsPath ? convertFileSrc(`${iconsPath}/${name}Symbol.png`) : null
}

function stripPrime(name) {
  return name.replace(/Prime$/, '')
}

export default function Adversaries() {
  const { inventoryData, dict, uniqueNameToName } = useMonitoring()
  const [iconsPath, setIconsPath] = useState('')
  useEffect(() => { invoke('get_icons_path').then(setIconsPath).catch(() => {}) }, [])
  const [showKilled, setShowKilled] = useState(false)
  const nemeses = useMemo(() => {
    if (!inventoryData?.NemesisHistory) return []
    return inventoryData.NemesisHistory.map(n => {
      const wfName = n.KillingSuit ? resolveItemName(n.KillingSuit, dict, uniqueNameToName) || n.KillingSuit.split('/').pop() : '?'
      const baseName = stripPrime(wfName.replace(/ Prime$/, ''))
      return { ...n, wfName, element: WF_PROGENITOR[baseName] || null }
    })
  }, [inventoryData, dict, uniqueNameToName])

  const displayed = useMemo(() => {
    return showKilled ? nemeses : nemeses.filter(n => !n.k)
  }, [nemeses, showKilled])

  return (
    <PageLayout title="Adversaries">
      <div className="space-y-6">
        {/* ── Progenitor Reference Table ── */}
        <Card glow className="p-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 mb-3">Progenitor Elements</h2>
          <div className="-mx-4 px-4">
            <div className="flex gap-6 flex-wrap">
              {ELEMENT_ORDER.map(el => (
                <div key={el} className="flex flex-col gap-1 min-w-[90px]">
                  <div className="flex flex-col items-center gap-1 pb-1.5 border-b border-white/10 mb-1">
                    <img src={iconSrc(iconsPath, el)} className="w-5 h-5 object-contain" alt={el} />
                    <span style={{ color: ELEMENT_COLORS[el] }} className="text-[10px] font-bold uppercase tracking-wider leading-tight">{el}</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    {PROGENITOR[el].map(f => (
                      <span key={f} className="text-[11px] text-white/70 leading-tight">{f}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card glow className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/70">Nemesis History</h2>
            <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showKilled}
                onChange={e => setShowKilled(e.target.checked)}
                className="accent-kronos-accent"
              />
              Show vanquished
            </label>
          </div>

          {displayed.length === 0 ? (
            <p className="text-xs text-white/40 italic">No nemeses recorded.</p>
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto custom-scrollbar">
              {displayed.map((n, i) => {
                const d = n.d?.$date?.$numberLong ? new Date(Number(n.d.$date.$numberLong)) : null
                return (
                  <div key={n.fp || i} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-white/5 text-xs">
                    {iconsPath && n.element && (
                      <img
                        src={iconSrc(iconsPath, n.element)}
                        className="w-4 h-4 object-contain flex-shrink-0"
                        alt=""
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    )}
                    <span className="text-white/80 min-w-[100px]">{n.wfName}</span>
                    <span className="text-white/40 min-w-[60px]">
                      {n.element ? <span style={{ color: ELEMENT_COLORS[n.element] }}>{n.element}</span> : '—'}
                    </span>
                    <span className="text-white/40 min-w-[30px]">R{n.Rank ?? '?'}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      n.k ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'
                    }`}>
                      {n.k ? 'Vanquished' : n.Traded ? 'Traded' : 'Converted'}
                    </span>
                    {d && <span className="text-white/30 ml-auto">{d.toLocaleDateString()}</span>}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </PageLayout>
  )
}
