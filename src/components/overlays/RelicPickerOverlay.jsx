import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useUi } from '../../contexts/UiContext'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'

const ERA_COLORS = {
  Lith: '#7fbf7f',
  Meso: '#5590ab',
  Neo: '#c09e62',
  Axi: '#ff85e0',
  Requiem: '#b95c9e',
}

export default function RelicPickerOverlay() {
  const { t } = useUi()
  const [relics, setRelics] = useState(null)
  const [windowVisible, setWindowVisible] = useState(false)
  const windowVisibleRef = useRef(false)

  const showWindow = useCallback(async (fromRust = false) => {
    if (windowVisibleRef.current) return
    windowVisibleRef.current = true
    setWindowVisible(true)
    if (!fromRust) {
      await invoke('show_overlay_window', { label: 'overlay-relic-picker' }).catch(console.error)
    }
  }, [])

  // `force` exists because the main window calls show_overlay_window before it
  // relays the payload, so an empty payload has to close a window this
  // component never saw opened.
  const hideWindow = useCallback(async (force = false) => {
    if (!force && !windowVisibleRef.current) return
    windowVisibleRef.current = false
    setWindowVisible(false)
    setRelics(null)
    await invoke('hide_overlay_window', { label: 'overlay-relic-picker' }).catch(console.error)
  }, [])

  useEffect(() => {
    const subs = []

    subs.push(listen('relic-picker-data', (e) => {
      const data = e.payload
      // Empty arrays are truthy: a player with no relics of the fissure's era
      // yields ducat_top/plat_top/need_top (or by_era) present but empty, which
      // would render an opaque overlay with nothing but column headings.
      if (data?.ducat_top?.length || data?.plat_top?.length || data?.need_top?.length || data?.by_era?.length) {
        setRelics(data)
        showWindow(true)
      } else {
        hideWindow(true)
      }
    }))

    subs.push(listen('relic-picker-closed', () => {
      hideWindow()
    }))

    subs.push(listen('fissure-reward-closed', () => {
      hideWindow()
    }))

    return () => { subs.forEach(p => p.then(f => f())) }
  }, [])

  if (!relics) return null

  // Known single era (in-mission or a confirmed non-endless fissure): the
  // existing flat top-5-per-metric view, already filtered to one era.
  if (!relics.by_era) {
    const eraSuffix = relics.era ? ` (${relics.era})` : ''
    return (
      <div className="w-full h-full bg-zinc-900 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full">
            <div className="flex gap-3">
              <Column items={relics.ducat_top} title={`Top Ducat EV${eraSuffix}`} accent="text-amber-400" valueKey="evDucats" suffix="" />
              <Column items={relics.plat_top} title={`Top Plat EV${eraSuffix}`} accent="text-blue-400" valueKey="evPlat" suffix="p" />
              {relics.need_top &&
                <Column items={relics.need_top} title={`Top Need EV${eraSuffix}`} accent="text-green-400" valueKey="evDucatsNeed" suffix="" />
              }
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Era unknown pre-mission (or Omnia): one compact row per era, no
  // scrolling, instead of a flat list mixing every era together - the era
  // genuinely can't be detected before the mission starts.
  return (
    <div className="w-full h-full bg-zinc-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-xl mx-auto rounded-2xl border border-white/10 bg-black/40 p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-kronos-accent-secondary shadow-[0_0_8px_rgba(185,147,84,0.7)]" />
            <span className="text-[13px] font-black uppercase tracking-widest text-kronos-dim">Relic Recommendations</span>
          </div>
          <p className="text-xs text-kronos-dim/70 mb-4">
            Era unknown pre-mission — showing <span className="text-kronos-accent-secondary font-bold">all eras</span>
          </p>

          <div className="grid gap-2" style={{ gridTemplateColumns: '74px 1fr 1fr 1fr' }}>
            <span />
            <span className="text-[11px] font-black uppercase tracking-wide text-center text-kronos-accent-secondary">Ducat</span>
            <span className="text-[11px] font-black uppercase tracking-wide text-center text-kronos-accent">Plat</span>
            <span className="text-[11px] font-black uppercase tracking-wide text-center leading-tight text-green-400">Missing<br />Prime Parts</span>

            {relics.by_era.map((row) => (
              <React.Fragment key={row.era}>
                <span className="text-sm font-black self-center" style={{ color: ERA_COLORS[row.era] || 'var(--color-accent)' }}>
                  {row.era}
                </span>
                <EraCell item={row.ducat} valueClass="text-kronos-accent-secondary" value={row.ducat ? row.ducat.value : null} />
                <EraCell item={row.plat} valueClass="text-kronos-accent" value={row.plat ? `${row.plat.value}p` : null} />
                <EraCell item={row.missing} valueClass="text-green-400 uppercase tracking-wide" value={row.missing ? `${row.missing.count} part${row.missing.count === 1 ? '' : 's'}` : null} />
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function EraCell({ item, valueClass, value }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/5 px-2 py-2 text-center">
      <div className="text-sm font-bold text-white truncate">{item ? item.name : '—'}</div>
      {value != null &&
        <div className={`text-xs font-bold ${valueClass} mt-0.5`}>{value}</div>
      }
    </div>
  )
}

function Column({ items, title, accent, valueKey, suffix }) {
  return (
    <div className="flex-1 min-w-0">
      <div className={`text-[11px] font-black uppercase tracking-widest text-center mb-1.5 ${accent}`}>
        {title}
      </div>
      <div className="flex flex-col gap-1">
        {items?.map((item, i) => (
          <div
            key={item.name}
            className="flex items-start justify-between gap-1.5 px-2.5 py-1.5 rounded bg-black/40 border border-white/5"
          >
            <div className="flex items-start gap-1.5 min-w-0 flex-1">
              <span className="text-[10px] font-black text-kronos-dim w-3 flex-shrink-0 leading-tight pt-px">{i + 1}.</span>
              <span className="text-[13px] font-bold text-white leading-tight break-words">{item.name}</span>
            </div>
            <span className={`text-[11px] font-black flex-shrink-0 leading-tight pt-px ${accent}`}>
              {item[valueKey]}{suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
