import { useState, useEffect, useRef } from 'react'
import { Palette, Bell, RefreshCw, X, FolderOpen, Keyboard, MousePointer } from 'lucide-react'

import { open as openDialog } from '@tauri-apps/api/dialog'
import { invoke } from '@tauri-apps/api/tauri'
import { convertFileSrc } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { installUpdate } from '@tauri-apps/api/updater'
import { getVersion } from '@tauri-apps/api/app'
import { useUpdate } from '../contexts/UpdateContext'
import { getSetting, setSetting } from '../lib/settings'
import { useTheme } from '../contexts/ThemeContext'
import { useMonitoring } from '../contexts/MonitoringContext'
import { formatLastUpdate } from '../lib/warframeUtils'
import { PageLayout, Card, Button, Toggle } from '../components/UI'
import NotificationManager from '../components/NotificationManager'

function HotkeyRecorder({ value, onChange, placeholder = 'None' }) {
  const [recording, setRecording] = useState(false)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!recording) return

    const handleKeyDown = (e) => {
      e.preventDefault()
      e.stopPropagation()

      // Ignore modifier-only presses
      if (['Control', 'Shift', 'Alt', 'Meta', 'Command', 'CapsLock'].includes(e.key)) return

      const parts = []
      if (e.ctrlKey || e.metaKey) parts.push('CmdOrControl')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')

      let key = e.key.toUpperCase()
      if (key === ' ') key = 'Space'
      if (key === 'ARROWUP') key = 'Up'
      if (key === 'ARROWDOWN') key = 'Down'
      if (key === 'ARROWLEFT') key = 'Left'
      if (key === 'ARROWRIGHT') key = 'Right'
      if (key === 'ESCAPE') key = 'Esc'

      parts.push(key)
      const shortcut = parts.join('+')
      onChange(shortcut)
      setRecording(false)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [recording, onChange])

  return (
    <button
      ref={buttonRef}
      onClick={() => setRecording(!recording)}
      onBlur={() => setRecording(false)}
      className={`h-9 px-4 rounded-lg border text-xs font-mono transition-all ${recording
        ? 'border-kronos-accent bg-kronos-accent/20 text-white animate-pulse'
        : 'border-white/10 bg-black/20 text-kronos-dim hover:border-white/20'
        }`}
    >
      {recording ? 'Recording...' : (value || placeholder)}
    </button>
  )
}

export default function SettingsScreen() {
  const { theme, setTheme, themes, cursorStyle, setCursorStyle, cursorTint, setCursorTint } = useTheme()
  const { isMonitoring, startMonitoring, stopMonitoring, manualRefresh, lastUpdate, statusText, autoStart, setAutoStart, monitorResult } = useMonitoring()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false)
  const [scannerStatus, setScannerStatus] = useState('idle') // 'idle' | 'waiting' | 'active'

  const [hotkeys, setHotkeys] = useState(
    () => getSetting('hotkeys', [{ action: 'manual_ocr', shortcut: '' }])
  )

  const handleUpdateHotkeys = async (newHotkeys) => {
    setHotkeys(newHotkeys)
    await setSetting('hotkeys', newHotkeys)

    // Unregister and re-register all with Rust
    try {
      await invoke('unregister_all_hotkeys')
      for (const hk of newHotkeys) {
        if (hk.shortcut && hk.action) {
          await invoke('register_hotkey', { shortcut: hk.shortcut, action: hk.action })
        }
      }
    } catch (err) {
      console.error('Hotkey sync failed:', err)
    }
  }

  const HOTKEY_ACTIONS = [
    { id: 'manual_ocr', label: 'Manual Relic Recognition (OCR)' },

  ]

  const [version, setVersion] = useState('')
  const [updateOnStartup, setUpdateOnStartup] = useState(
    () => getSetting('update_on_startup', true)
  )

  const { updateState, checkForUpdates } = useUpdate()

  const handleInstallUpdate = async () => {
    try {
      await installUpdate()
    } catch (err) {
      console.error('Install update failed:', err)
    }
  }

  const handleSetUpdateOnStartup = async (val) => {
    setUpdateOnStartup(val)
    await setSetting('update_on_startup', val)
  }

  // Notification settings
  const [notifPosition, setNotifPosition] = useState(
    () => getSetting('notif_position', 'top-right')
  )
  const [notifSound, setNotifSound] = useState(
    () => getSetting('notif_sound', 'notification1.wav')
  )

  const [notifArbitrationEnabled, setNotifArbitrationEnabled] = useState(
    () => getSetting('notif_arbitration_enabled', false)
  )

  const [uiPath, setUiPath] = useState('')
  useEffect(() => { invoke('get_ui_path').then(setUiPath).catch(() => {}) }, [])

  const [tintedCursors, setTintedCursors] = useState({})
  useEffect(() => {
    if (!uiPath || !cursorTint) { setTintedCursors({}); return }
    const build = async () => {
      const result = {}
      for (const name of ['CursorDefault', 'CursorRetro']) {
        try {
          const src = convertFileSrc(`${uiPath}/${name}.png`)
          const resp = await fetch(src)
          const blob = await resp.blob()
          const img = await createImageBitmap(blob)
          const scale = 24 / Math.max(img.width, img.height)
          const w = Math.round(img.width * scale) || 1
          const h = Math.round(img.height * scale) || 1
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, w, h)
          const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#00aaff'
          ctx.globalCompositeOperation = 'multiply'
          ctx.fillStyle = accent
          ctx.fillRect(0, 0, w, h)
          ctx.globalCompositeOperation = 'destination-in'
          ctx.drawImage(img, 0, 0, w, h)
          result[name] = canvas.toDataURL()
        } catch {
          // fallback — leave undefined
        }
      }
      setTintedCursors(result)
    }
    build()
  }, [cursorTint, uiPath, theme])
  const [notifArbitrationHours, setNotifArbitrationHours] = useState(
    () => parseInt(getSetting('notif_arbitration_hours', 24))
  )
  const [notifArbitrationRemind, setNotifArbitrationRemind] = useState(
    () => parseInt(getSetting('notif_arbitration_remind', 30))
  )

  const [notifFoundryEnabled, setNotifFoundryEnabled] = useState(
    () => getSetting('notif_foundry_enabled', false)
  )
  const [notifFoundryMinutes, setNotifFoundryMinutes] = useState(
    () => parseInt(getSetting('notif_foundry_minutes', 5))
  )

  const [notifSyndicateEnabled, setNotifSyndicateEnabled] = useState(
    () => getSetting('notif_syndicate_enabled', false)
  )
  const [notifSyndicateWasteEnabled, setNotifSyndicateWasteEnabled] = useState(
    () => getSetting('notif_syndicate_waste_enabled', false)
  )

  const [notifVoidTracesEnabled, setNotifVoidTracesEnabled] = useState(
    () => getSetting('notif_void_traces_enabled', false)
  )

  const [notifMasteryEnabled, setNotifMasteryEnabled] = useState(
    () => getSetting('notif_mastery_enabled', false)
  )
  const [notifMasteryPercent, setNotifMasteryPercent] = useState(
    () => parseInt(getSetting('notif_mastery_percent', 75))
  )

  const [notifChecklistMinutes, setNotifChecklistMinutes] = useState(
    () => parseInt(getSetting('notif_checklist_minutes', 60))
  )

  // Fissure Overlay Settings
  const [fissureOverlayEnabled, setFissureOverlayEnabled] = useState(
    () => getSetting('fissure_overlay_enabled')
  )
  const [eeLogPath, setEeLogPath] = useState(
    () => getSetting('ee_log_path', '')
  )
  const [fissureUiScale, setFissureUiScale] = useState(
    () => parseInt(getSetting('fissure_ui_scale', 100))
  )
  const [fissureTargetMonitor, setFissureTargetMonitor] = useState(
    () => getSetting('fissure_target_monitor', 'auto')
  )
  const [availableMonitors, setAvailableMonitors] = useState([])

  // Listen for calibration window close from X button
  useEffect(() => {
    const unlisten = listen('calibration-closed', () => {
      setIsCalibrationOpen(false)
    })
    return () => { unlisten.then(f => f()) }
  }, [])

  // Poll scanner status
  useEffect(() => {
    let interval
    if (fissureOverlayEnabled) {
      const poll = () => {
        invoke('get_scanner_status').then(setScannerStatus).catch(() => setScannerStatus('idle'))
      }
      poll()
      interval = setInterval(poll, 2000)
    } else {
      setScannerStatus('idle')
    }
    return () => clearInterval(interval)
  }, [fissureOverlayEnabled])

  const handleStart = async () => {
    setLoading(true)
    setError(null)
    try {
      await startMonitoring()
    } catch (err) {
      setError(err?.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSetPosition = async (pos) => {
    setNotifPosition(pos)
    await setSetting('notif_position', pos)
  }

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion('?'))
    // Sync current sound to Rust backend on mount
    const savedSound = getSetting('notif_sound', 'notification1.wav')
    invoke('set_notification_sound', { sound: savedSound }).catch(console.error)

    // Sync current UI scale to Rust backend on mount
    const savedScale = parseInt(getSetting('fissure_ui_scale', 100))
    invoke('set_fissure_ui_scale', { scale: savedScale }).catch(console.error)

    // Fetch available monitors
    invoke('get_available_monitors')
      .then(setAvailableMonitors)
      .catch(console.error)

    // Sync current target monitor to Rust backend on mount
    const savedMonitor = getSetting('fissure_target_monitor', 'auto')
    invoke('set_target_monitor', { monitor: savedMonitor }).catch(console.error)

    // Auto-check is handled by UpdateProvider
  }, [])

  const handleSetTargetMonitor = async (val) => {
    setFissureTargetMonitor(val)
    await setSetting('fissure_target_monitor', val)
    await invoke('set_target_monitor', { monitor: val }).catch(console.error)
  }

  const handleSetSound = async (sound) => {
    setNotifSound(sound)
    await setSetting('notif_sound', sound)

    // Update Rust state for ALL future notifications
    await invoke('set_notification_sound', { sound }).catch(console.error)

    // Preview sound via Rust (one-time manual play)
    if (sound !== 'none') {
      await invoke('play_notification_sound', { sound }).catch(console.error)
    }
  }

  // Arbitration settings handlers
  const handleSetArbitrationEnabled = async (val) => {
    setNotifArbitrationEnabled(val)
    await setSetting('notif_arbitration_enabled', val)
  }
  const handleSetArbitrationHours = async (val) => {
    setNotifArbitrationHours(val)
    await setSetting('notif_arbitration_hours', val)
  }
  const handleSetArbitrationRemind = async (val) => {
    setNotifArbitrationRemind(val)
    await setSetting('notif_arbitration_remind', val)
  }

  // Foundry settings handlers
  const handleSetFoundryEnabled = async (val) => {
    setNotifFoundryEnabled(val)
    await setSetting('notif_foundry_enabled', val)
  }
  const handleSetFoundryMinutes = async (val) => {
    setNotifFoundryMinutes(val)
    await setSetting('notif_foundry_minutes', val)
  }

  // Syndicate settings handlers
  const handleSetSyndicateEnabled = async (val) => {
    setNotifSyndicateEnabled(val)
    await setSetting('notif_syndicate_enabled', val)
  }
  const handleSetSyndicateWasteEnabled = async (val) => {
    setNotifSyndicateWasteEnabled(val)
    await setSetting('notif_syndicate_waste_enabled', val)
  }

  const handleSetVoidTracesEnabled = async (val) => {
    setNotifVoidTracesEnabled(val)
    await setSetting('notif_void_traces_enabled', val)
  }

  // Mastery settings handlers
  const handleSetMasteryEnabled = async (val) => {
    setNotifMasteryEnabled(val)
    await setSetting('notif_mastery_enabled', val)
  }
  const handleSetMasteryPercent = async (val) => {
    setNotifMasteryPercent(val)
    await setSetting('notif_mastery_percent', val)
  }
  const handleSetChecklistMinutes = async (val) => {
    setNotifChecklistMinutes(val)
    await setSetting('notif_checklist_minutes', val)
  }

  // Fissure Overlay handlers
  const handleSetFissureEnabled = async (val) => {
    setFissureOverlayEnabled(val)
    await setSetting('fissure_overlay_enabled', val)
    if (val && eeLogPath) {
      invoke('start_log_scanner', { path: eeLogPath }).catch(console.error)
    } else {
      invoke('stop_log_scanner').catch(console.error)
    }
  }

  const handleSetUiScale = async (val) => {
    setFissureUiScale(val)
    await setSetting('fissure_ui_scale', val)
    invoke('set_fissure_ui_scale', { scale: val }).catch(console.error)
  }

  const handleBrowseLog = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: 'Game Log', extensions: ['log'] }]
      })
      if (selected) {
        setEeLogPath(selected)
        await setSetting('ee_log_path', selected)
        if (fissureOverlayEnabled) {
          invoke('start_log_scanner', { path: selected }).catch(console.error)
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleTestNotification = (position, delay = 0) => {
    setTimeout(() => {
      invoke('show_notification', {
        title: 'Foundry Complete',
        message: 'Harrow Chassis has finished crafting and is ready to claim.',
        position
      }).catch(console.error)
    }, delay)
  }

  const handleCaptureDebugOcr = async () => {
    try {
      await invoke('start_debug_ocr_session')
    } catch (err) {
      alert(`Debug OCR Failed: ${err}`)
    }
  }

  const handleToggleCalibrate = async () => {
    try {
      const isOpen = await invoke('toggle_calibration')
      setIsCalibrationOpen(isOpen)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <PageLayout title="Settings">
      <div className="space-y-6">

        {/* Theme Selector - Leaner version */}
        <Card glow className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Palette className="text-kronos-accent" size={20} />
              <h2 className="text-lg font-semibold uppercase tracking-tight">Theme</h2>
            </div>
            <p className="text-[10px] text-kronos-dim uppercase font-bold">
              Current: {themes.find(t => t.id === theme)?.name}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                data-theme={t.id}
                title={t.name}
                className={`
                  min-h-[56px] p-2 rounded-lg border transition-all duration-200 relative group flex items-center justify-center text-center
                  ${theme === t.id
                    ? 'border-white ring-2 ring-white/30 scale-[1.02]'
                    : 'border-white/5 hover:border-white/20 hover:scale-[1.01]'
                  }
                `}
                style={{
                  backgroundColor: 'var(--color-bg)',
                }}
              >
                <div className="absolute inset-0 rounded-lg opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundColor: `var(--color-accent)` }} />
                <span className="relative text-xs font-bold uppercase tracking-tight leading-tight" style={{ color: 'var(--color-accent)' }}>
                  {t.name}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* Cursor Selector */}
        <Card glow className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MousePointer className="text-kronos-accent" size={20} />
              <h2 className="text-lg font-semibold uppercase tracking-tight">Cursor</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {['system', 'default', 'retro'].map((cs) => (
              <button
                key={cs}
                onClick={() => setCursorStyle(cs)}
                className={`relative p-2 rounded-lg border transition-all duration-200 flex flex-col items-center gap-1.5 ${cursorStyle === cs
                  ? 'border-white ring-2 ring-white/30'
                  : 'border-white/5 hover:border-white/20'
                }`}
              >
                <div className="w-10 h-10 flex items-center justify-center bg-black/20 rounded-lg relative overflow-hidden">
                  {cs === 'system' ? (
                    <MousePointer size={18} className="text-kronos-dim" />
                  ) : uiPath ? (
                    <>
                      <img
                        src={cursorTint && tintedCursors[cs === 'default' ? 'CursorDefault' : 'CursorRetro']
                          ? tintedCursors[cs === 'default' ? 'CursorDefault' : 'CursorRetro']
                          : cs === 'default' ? convertFileSrc(`${uiPath}/CursorDefault.png`) : convertFileSrc(`${uiPath}/CursorRetro.png`)
                        }
                        alt={cs}
                        className="max-w-[70%] max-h-[70%] object-contain relative z-10"
                      />
                    </>
                  ) : null}
                </div>
                <span className="text-[10px] font-black uppercase tracking-tight text-kronos-text">{cs}</span>
              </button>
            ))}
            <div className="flex items-center gap-2 ml-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={cursorTint} onChange={e => setCursorTint(e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:bg-kronos-accent/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
              </label>
              <span className="text-xs font-black uppercase text-kronos-dim tracking-tight">Tint with theme</span>
            </div>
          </div>
        </Card>

        {/* Notifications & Overlays */}
        <Card glow className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="text-kronos-accent" size={24} />
            <h2 className="text-xl font-semibold uppercase tracking-tight">Notifications & Overlays</h2>
          </div>

          {/* Position & Sound - side by side on wide, stacked on narrow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-kronos-dim mb-3">Toast notification position</p>
              <div className="grid grid-cols-3 gap-2">
                {['top-left', 'top-center', 'top-right'].map((pos) => (
                  <button
                    key={pos}
                    onClick={() => handleSetPosition(pos)}
                    className={`py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all ${notifPosition === pos
                      ? 'bg-kronos-accent/20 border-kronos-accent text-kronos-accent'
                      : 'bg-kronos-panel/20 border-white/5 text-kronos-dim hover:border-white/20'
                      }`}
                  >
                    {pos.replace('top-', '').replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-kronos-dim mb-3">Notification Sound</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'None', value: 'none' },
                  { label: 'Sound 1', value: 'notification1.wav' },
                  { label: 'Sound 2', value: 'notification2.wav' },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleSetSound(s.value)}
                    className={`py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all ${notifSound === s.value
                      ? 'bg-kronos-accent/20 border-kronos-accent text-kronos-accent'
                      : 'bg-kronos-panel/20 border-white/5 text-kronos-dim hover:border-white/20'
                      }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Test buttons */}
          <div className="mb-5 pt-4 border-t border-white/5">
            <p className="text-sm font-black uppercase tracking-widest text-kronos-dim mb-3">Test Buttons</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleTestNotification(notifPosition)}
                className="py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all bg-kronos-panel/20 border-white/5 text-kronos-dim hover:border-white/20"
              >
                Test notification
              </button>
              <button
                onClick={() => handleTestNotification(notifPosition, 5000)}
                className="py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all bg-kronos-panel/20 border-white/5 text-kronos-dim hover:border-white/20"
              >
                Test notification in 5 seconds
              </button>
              <button
                onClick={handleCaptureDebugOcr}
                className="py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all bg-kronos-panel/20 border-white/5 text-kronos-dim hover:border-white/20"
              >
                Test relic overlay
              </button>
              <button
                onClick={handleToggleCalibrate}
                className="py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all bg-kronos-panel/20 border-white/5 text-kronos-dim hover:border-white/20"
              >
                Linux Calibration (KDE)
              </button>
            </div>
          </div>

          {/* EE.log Path + Enable Scanner */}
          <div className="mb-4 pt-4 border-t border-white/5">
            <p className="text-sm font-black uppercase tracking-widest text-kronos-dim mb-3">EE.log scanning</p>
            <div className="p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={eeLogPath}
                    readOnly
                    placeholder="Select your Warframe EE.log file..."
                    className="flex-1 glass-panel rounded-lg px-4 py-2 text-xs font-mono focus:outline-none focus:glow-border"
                  />
                  <Button variant="secondary" onClick={handleBrowseLog} className="px-3">
                    <FolderOpen size={16} className="mr-2" />
                    Browse
                  </Button>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5 shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-kronos-dim">Enable Scanner</span>
                  <Toggle checked={fissureOverlayEnabled} onChange={handleSetFissureEnabled} />
                </div>
              </div>
              <div className="mt-3 flex flex-col sm:flex-row gap-4 text-[10px] text-zinc-500 uppercase leading-relaxed font-bold">
                <div>
                  <p className="text-zinc-400 mb-1 tracking-widest">Common Windows Path:</p>
                  <p className="font-mono text-kronos-accent/70">AppData\Local\Warframe\EE.log</p>
                </div>
                <div>
                  <p className="text-zinc-400 mb-1 tracking-widest">Common Linux Path:</p>
                  <p className="font-mono text-kronos-accent/70">steamapps/compatdata/230410/pfx/drive_c/users/steamuser/AppData/Local/Warframe/EE.log</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                {scannerStatus === 'waiting' && (
                  <RefreshCw size={10} className="text-yellow-400 animate-spin" />
                )}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-500 ${
                  scannerStatus === 'active'  ? 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]' :
                  scannerStatus === 'waiting' ? 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.8)] animate-pulse' :
                  'bg-zinc-600'
                }`} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${
                  scannerStatus === 'active'  ? 'text-blue-400' :
                  scannerStatus === 'waiting' ? 'text-yellow-400' :
                  'text-zinc-500'
                }`}>
                  {scannerStatus === 'active'  ? 'Hooked into Warframe — scanner running' :
                   scannerStatus === 'waiting' ? 'Waiting for Warframe to launch…' :
                   'Scanner offline'}
                </span>
              </div>
            </div>
          </div>

          {/* UI Scale & Game Monitor */}
          <div className="mb-4 space-y-3">
            <div className="p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-kronos-text uppercase">In-Game UI Scale</p>
                  <p className="text-xs text-kronos-dim uppercase">Set this to match your Warframe 'Menu Scale' setting (e.g. 100% for default)</p>
                </div>
                <div className="relative w-28">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={fissureUiScale}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      setFissureUiScale(val)
                      const parsed = parseInt(val)
                      if (!isNaN(parsed) && parsed >= 50 && parsed <= 100) {
                        setSetting('fissure_ui_scale', parsed)
                        invoke('set_fissure_ui_scale', { scale: parsed }).catch(console.error)
                      }
                    }}
                    onBlur={() => {
                      let parsed = parseInt(fissureUiScale)
                      if (isNaN(parsed)) parsed = 100
                      const clamped = Math.max(50, Math.min(100, parsed))
                      setFissureUiScale(clamped)
                      setSetting('fissure_ui_scale', clamped)
                      invoke('set_fissure_ui_scale', { scale: clamped }).catch(console.error)
                    }}
                    className="w-full rounded-lg pl-3 pr-8 py-2 text-right text-xs font-mono font-bold focus:outline-none focus:border-white/20 bg-black/20 border border-white/10 text-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-kronos-dim font-mono pointer-events-none">%</span>
                </div>
              </div>
            </div>
            <div className="p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-kronos-text uppercase">Target Game Monitor</p>
                  <p className="text-xs text-kronos-dim uppercase">Select the monitor where your Warframe game runs</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    value={fissureTargetMonitor}
                    onChange={(e) => {
                      const val = e.target.value
                      handleSetTargetMonitor(val === 'auto' ? 'auto' : parseInt(val))
                    }}
                    className="w-40 kronos-select text-xs font-mono font-bold bg-black/20 border-white/10 text-white rounded-lg px-2 py-1.5 focus:outline-none"
                  >
                    <option value="auto">Auto (Primary)</option>
                    {availableMonitors.map((mon) => (
                      <option key={mon.index} value={mon.index}>
                        {mon.name} ({mon.width}x{mon.height}){mon.is_primary ? ' [Primary]' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => invoke('get_available_monitors').then(setAvailableMonitors).catch(console.error)}
                    className="p-1.5 rounded-lg bg-black/20 border border-white/10 text-kronos-dim hover:text-white transition-colors"
                    title="Refresh monitor list"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Triggers */}
          <div className="pt-4 border-t border-white/5">
            <p className="text-sm font-black uppercase tracking-widest text-kronos-dim mb-3">Notification Triggers</p>
            <NotificationManager />
          </div>
        </Card>

        {/* Global Hotkeys */}
        <Card glow className="p-5">
          <div className="flex items-center gap-3 mb-6">
            <Keyboard className="text-kronos-accent" size={28} />
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Global Hotkeys</h2>
              <p className="text-[10px] text-kronos-dim uppercase font-bold tracking-widest mt-0.5">System-wide shortcuts</p>
            </div>
          </div>

          <div className="space-y-3">
            {hotkeys.map((hk, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-kronos-panel/20 rounded-xl border border-white/5">
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase text-kronos-dim mb-1.5 tracking-wider">Action</p>
                  <select
                    value={hk.action}
                    onChange={(e) => {
                      const next = [...hotkeys]
                      next[idx].action = e.target.value
                      handleUpdateHotkeys(next)
                    }}
                    className="w-full kronos-select bg-black/20"
                  >
                    <option value="">Select Action...</option>
                    {HOTKEY_ACTIONS.map(a => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase text-kronos-dim mb-1.5 tracking-wider">Shortcut</p>
                  <HotkeyRecorder
                    value={hk.shortcut}
                    onChange={(val) => {
                      const next = [...hotkeys]
                      next[idx].shortcut = val
                      handleUpdateHotkeys(next)
                    }}
                  />
                </div>

                <div className="sm:self-end">
                  <button
                    onClick={() => {
                      const next = hotkeys.filter((_, i) => i !== idx)
                      handleUpdateHotkeys(next)
                    }}
                    className="p-2 text-red-400/50 hover:text-red-400 transition-colors"
                    title="Remove Hotkey"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={() => handleUpdateHotkeys([...hotkeys, { action: '', shortcut: '' }])}
              className="w-full py-3 border border-dashed border-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-kronos-dim hover:border-kronos-accent/30 hover:text-kronos-accent transition-all group"
            >
              <span className="flex items-center justify-center gap-2">
                <Keyboard size={12} className="group-hover:animate-bounce" /> Add New Shortcut
              </span>
            </button>
          </div>
          <p className="text-[9px] text-zinc-600 mt-4 italic uppercase tracking-wider px-1">
            Note: Shortcuts are global and will work even when the app is in the background. Use combinations like Ctrl+Shift+Key to avoid conflicts.
          </p>
        </Card>

        {/* Monitoring Section */}
        <Card glow className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-500 ${monitorResult === 'success' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.7)]' :
              monitorResult === 'error' ? 'bg-red-500   shadow-[0_0_8px_rgba(239,68,68,0.7)]' :
                'bg-zinc-600'
              }`} />
            <h2 className="text-xl font-black uppercase tracking-tight">Game Monitoring</h2>
          </div>

          {/* Status widget */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-kronos-panel/30 rounded-xl p-4 border border-white/5 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-kronos-dim">Status</p>
              <p className="text-xs text-kronos-accent font-mono break-words leading-relaxed min-h-[2rem]">
                {statusText || (isMonitoring ? 'Monitoring active' : 'Not monitoring')}
              </p>
              {lastUpdate && (
                <p className="text-[10px] text-zinc-600 font-mono">
                  Last update: {formatLastUpdate(lastUpdate)}
                </p>
              )}
              {error && <p className="text-[10px] text-red-400 font-mono">Error: {error}</p>}
            </div>

            <div className="bg-kronos-panel/30 rounded-xl p-4 border border-white/5 flex flex-col justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-kronos-dim mb-3">Options</p>
              <Toggle
                checked={autoStart}
                onChange={setAutoStart}
                label="Auto-start on launch"
                description="Start monitoring when the app opens"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleStart}
              disabled={loading || isMonitoring}
              className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${isMonitoring
                ? (monitorResult === 'error'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 cursor-not-allowed'
                  : 'bg-green-500/10 border-green-500/30 text-green-400 cursor-not-allowed')
                : loading
                  ? 'bg-kronos-panel/20 border-white/5 text-kronos-dim cursor-not-allowed'
                  : 'bg-kronos-accent/20 border-kronos-accent/40 text-kronos-accent hover:bg-kronos-accent/30'
                }`}
            >
              {loading
                ? <span className="flex items-center justify-center gap-2"><RefreshCw size={12} className="animate-spin" /> Starting</span>
                : isMonitoring
                  ? (monitorResult === 'error' ? '● Retrying' : '● Active')
                  : 'Start'
              }
            </button>
            <button
              onClick={stopMonitoring}
              disabled={!isMonitoring}
              className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${isMonitoring
                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                : 'bg-kronos-panel/20 border-white/5 text-kronos-dim/40 cursor-not-allowed'
                }`}
            >
              Stop
            </button>
            <button
              onClick={manualRefresh}
              disabled={!isMonitoring}
              className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${isMonitoring
                ? 'bg-kronos-panel/40 border-white/10 text-kronos-text hover:border-kronos-accent/30 hover:text-kronos-accent'
                : 'bg-kronos-panel/20 border-white/5 text-kronos-dim/40 cursor-not-allowed'
                }`}
            >
              Manual Refresh
            </button>
          </div>
        </Card>

        {/* Updates */}
        <Card glow className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <RefreshCw className="text-kronos-accent" size={24} />
            <h2 className="text-xl font-black uppercase tracking-tight">Updates</h2>
          </div>

          <div className="bg-kronos-panel/30 rounded-xl p-4 border border-white/5 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-kronos-dim">
                Version {version}
              </p>
              <Toggle
                checked={updateOnStartup}
                onChange={handleSetUpdateOnStartup}
                label="Check on startup"
              />
            </div>

            {updateState.status === 'idle' && (
              <p className="text-xs text-kronos-dim">Click below to check for a new version.</p>
            )}
            {updateState.status === 'checking' && (
              <p className="text-xs text-kronos-accent font-mono flex items-center gap-2">
                <RefreshCw size={12} className="animate-spin" /> Checking for updates...
              </p>
            )}
            {updateState.status === 'available' && updateState.manifest && (
              <div className="space-y-2">
                <p className="text-xs text-green-400 font-mono font-bold">
                  Update available: {updateState.manifest.version}
                </p>
                <p className="text-[10px] text-kronos-dim font-mono leading-relaxed max-h-20 overflow-y-auto">
                  {updateState.manifest.body || 'No release notes available.'}
                </p>
                <p className="text-[10px] text-zinc-600 font-mono">
                  Released: {new Date(updateState.manifest.date).toLocaleDateString()}
                </p>
              </div>
            )}
            {updateState.status === 'up-to-date' && (
              <p className="text-xs text-green-400 font-mono">You have the latest version.</p>
            )}
            {updateState.status === 'installing' && (
              <p className="text-xs text-kronos-accent font-mono flex items-center gap-2">
                <RefreshCw size={12} className="animate-spin" /> Installing update...
              </p>
            )}
            {updateState.status === 'error' && (
              <p className="text-xs text-red-400 font-mono">Error: {updateState.error}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={checkForUpdates}
                disabled={updateState.status === 'checking' || updateState.status === 'installing'}
                className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${updateState.status === 'checking' || updateState.status === 'installing'
                  ? 'bg-kronos-panel/20 border-white/5 text-kronos-dim cursor-not-allowed'
                  : 'bg-kronos-accent/20 border-kronos-accent/40 text-kronos-accent hover:bg-kronos-accent/30'
                  }`}
              >
                {updateState.status === 'checking' ? 'Checking...' : 'Check for Updates'}
              </button>
              {updateState.status === 'available' && (
                <button
                  onClick={handleInstallUpdate}
                  className="py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/30"
                >
                  Install Update
                </button>
              )}
            </div>
          </div>
        </Card>

      </div>
    </PageLayout>
  )
}