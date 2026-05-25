import React, { useState, useEffect, useCallback, useRef } from 'react'
import { appWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/tauri'
import { Sword, RefreshCw } from 'lucide-react'

const RIVEN_W = 360
const RIVEN_H = 260

function parseRivenOcr(text) {
  const parts = text.split('|').map(s => s.trim()).filter(Boolean)
  if (parts.length === 0) return null

  let name = ''
  let mr = ''
  let mrPart = ''
  const statLines = []
  let currentName = ''
  let modifier = ''

  for (const part of parts) {
    if (/^MR\s/i.test(part)) {
      mrPart = part
      mr = part.replace(/^MR\s*/i, '').trim()
      continue
    }

    if (/^[+-]\d/.test(part)) {
      const cleaned = part.replace(',', '.')
      if (currentName) {
        statLines.push({ name: currentName + (modifier ? ' ' + modifier : ''), value: cleaned })
        currentName = ''
        modifier = ''
      } else if (statLines.length > 0) {
        statLines[statLines.length - 1].value += ' ' + cleaned
      }
      continue
    }

    if (/^\(?x\d/i.test(part) || /[x×]\d/i.test(part) || /for/i.test(part) || /heavy/i.test(part)) {
      modifier += (modifier ? ' ' : '') + part
      continue
    }

    if (currentName) {
      currentName += ' ' + part
    } else {
      currentName = part
    }
  }

  if (currentName && !name) {
    name = currentName
  } else if (currentName && statLines.length === 0) {
    name = (name ? name + ' ' : '') + currentName
  }

  if (!statLines.length && !mr) {
    return { name: text, mr: '', stats: [], raw: text }
  }

  return { name, mr, stats: statLines, mrPart, raw: text }
}

export default function RivenOverlay() {
  const label = appWindow.label
  const isNew = label === 'overlay-riven-new'
  const [visible, setVisible] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)
  const aliveRef = useRef(true)

  const [parsed, setParsed] = useState(null)
  const [ocrLoading, setOcrLoading] = useState(false)

  const doOcr = useCallback((pos) => {
    if (!aliveRef.current) return
    setOcrLoading(true)
    setParsed(null)
    invoke('ocr_riven_card', { position: pos })
      .then((res) => { if (aliveRef.current) setParsed(parseRivenOcr(res.text)) })
      .catch(() => { if (aliveRef.current) setParsed({ name: '', mr: '', stats: [], raw: '[OCR failed]' }) })
      .finally(() => { if (aliveRef.current) setOcrLoading(false) })
  }, [])

  const show = useCallback(() => {
    aliveRef.current = true
    setVisible(true)
    setParsed(null)
    invoke('show_overlay_window', { label })
      .then(() => invoke('resize_overlay_window', { label, width: RIVEN_W, height: RIVEN_H }))
      .catch(() => {})
  }, [label])

  const hide = useCallback(() => {
    aliveRef.current = false
    setVisible(false)
    setParsed(null)
    invoke('hide_overlay_window', { label }).catch(() => {})
  }, [label])

  useEffect(() => {
    const unsubs = [
      listen('riven-ocr-result', (e) => {
        const payload = typeof e.payload === 'string' ? e.payload : String(e.payload)
        if (aliveRef.current) {
          setVisible(true)
          setOcrLoading(false)
          setParsed(parseRivenOcr(payload))
          invoke('show_overlay_window', { label }).catch(() => {})
          invoke('resize_overlay_window', { label, width: RIVEN_W, height: RIVEN_H }).catch(() => {})
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
        listen('riven-linked-open', () => show()),
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
  }, [isNew, show, hide, doOcr, label])

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
    <div className="w-full h-full bg-kronos-panel rounded-lg overflow-hidden flex items-center justify-center">
      <div className="bg-kronos-panel/90 flex flex-col w-full h-full">
        <div key={refreshTick} className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 px-3 py-2 flex items-center gap-2 border-b border-kronos-border/20">
          {isNew ? <RefreshCw size={14} className="text-green-400" /> : <Sword size={14} className="text-purple-400" />}
          <span className="text-xs font-bold text-kronos-text uppercase tracking-wide">
            {isNew ? 'Riven (New)' : 'Riven (Current)'}
          </span>
        </div>
        <div className="p-3 flex flex-col h-[calc(100%-36px)] overflow-hidden">
          {ocrLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[10px] text-kronos-dim uppercase tracking-wider animate-pulse">OCR in progress...</p>
            </div>
          ) : parsed ? (
            <div className="flex flex-col overflow-hidden flex-1">
              {parsed.name && (
                <p className="text-[11px] font-bold text-kronos-accent truncate mb-1.5">{parsed.name}</p>
              )}
              <div className="overflow-y-auto flex-1 space-y-0.5 pr-1">
                {parsed.stats.map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-[10px] leading-tight">
                    <span className="text-kronos-text truncate mr-2">{s.name}</span>
                    <span className={`font-bold whitespace-nowrap ${posClass(s.value)}`}>{fmtVal(s.value)}</span>
                  </div>
                ))}
              </div>
              {parsed.mr && (
                <div className="mt-1.5 pt-1.5 border-t border-white/10 flex justify-between items-center">
                  <span className="text-[10px] text-kronos-dim">MR Requirement</span>
                  <span className="text-[11px] font-bold text-kronos-accent">{parsed.mr}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-[10px] text-kronos-dim uppercase tracking-wider">Waiting for card...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
