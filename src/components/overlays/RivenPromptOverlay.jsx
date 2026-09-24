import React, { useEffect, useRef, useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '../../lib/logging/tauri'
import { loadSettings, getSetting, onSettingsChanged } from '../../lib/settings'
import { useUi } from '../../contexts/UiContext'

export default function RivenPromptOverlay() {
  const { t } = useUi()
  const label = getCurrentWindow().label
  const [visible, setVisible] = useState(false)
  const [hotkey, setHotkey] = useState('Ctrl+Alt+R')
  const desiredVisibleRef = useRef(false)

  useEffect(() => {
    const refreshHotkey = async () => {
      await loadSettings()
      const configured = getSetting('hotkeys', []).find((hk) => hk.action === 'grade_rivens')?.shortcut
      setHotkey(configured || t('ui.riven_prompt.configure_hotkey'))
    }
    refreshHotkey()
    const offSettings = onSettingsChanged(refreshHotkey)
    const events = [
      listen('riven-screen-open', () => setVisible(true)),
      listen('riven-grade-activate', () => {
        setVisible(false)
      }),
      listen('riven-screen-closed', () => setVisible(false)),
    ]
    return () => {
      offSettings()
      events.forEach((promise) => promise.then((off) => off()))
      invoke('hide_overlay_window', { label }).catch(() => {})
    }
  }, [label, t])

  useEffect(() => {
    desiredVisibleRef.current = visible
    if (visible) {
      invoke('show_overlay_window', { label }).then(() => {
        if (!desiredVisibleRef.current) invoke('hide_overlay_window', { label }).catch(() => {})
      }).catch(() => {})
    } else invoke('hide_overlay_window', { label }).catch(() => {})
  }, [label, visible])

  if (!visible) return null

  return (
    <div className="w-full h-full flex items-center justify-center p-8 pointer-events-none">
      <div className="w-full max-w-[920px] rounded-2xl border-2 border-fuchsia-300/80 bg-zinc-950/95 px-10 py-8 text-center shadow-[0_0_45px_rgba(217,70,239,0.45)]">
        <p className="text-[18px] font-black uppercase tracking-[0.35em] text-fuchsia-200">{t('ui.riven_prompt.title')}</p>
        <p className="mt-4 text-[32px] font-black leading-tight text-white">{t('ui.riven_prompt.press')} <span className="inline-block rounded-lg border border-fuchsia-200 bg-fuchsia-300 px-4 py-1 font-mono text-zinc-950 shadow-[0_2px_0_rgba(255,255,255,0.35)]">[{hotkey}]</span> {t('ui.riven_prompt.action')}</p>
        <p className="mt-4 text-[14px] font-semibold uppercase tracking-[0.18em] text-zinc-300">{t('ui.riven_prompt.hint')}</p>
      </div>
    </div>
  )
}
