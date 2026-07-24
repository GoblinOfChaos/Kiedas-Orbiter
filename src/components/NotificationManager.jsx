import { useState, useEffect, useCallback, useMemo } from 'react'
import { Trash2, History } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { getSetting, setSetting } from '../lib/settings'
import { getAllTriggerDefs, getDefaultNotification } from '../lib/notificationManager'
import { Toggle, Select, Modal } from './UI'
import { useMonitoring } from '../contexts/MonitoringContext'

function useUIIcons(iconNames) {
  const [iconCache, setIconCache] = useState({})
  useEffect(() => {
    if (!iconNames || iconNames.length === 0) return
    let cancelled = false
    Promise.all(iconNames.map(async (name) => {
      try {
        const bytes = await invoke('read_file_bytes', { relative: `data/assets/ui/${name}` })
        const blob = new Blob([new Uint8Array(bytes)])
        return [name, await new Promise(r => {
          const f = new FileReader()
          f.onload = () => r(f.result)
          f.onerror = () => r(null)
          f.readAsDataURL(blob)
        })]
      } catch { return [name, null] }
    })).then(entries => {
      if (cancelled) return
      const map = {}
      for (const [name, url] of entries) if (url) map[name] = url
      setIconCache(map)
    })
    return () => { cancelled = true }
  }, [iconNames])
  const uiIcon = useCallback((name) => iconCache[name] || '', [iconCache])
  return uiIcon
}

export default function NotificationManager() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const triggerDefs = getAllTriggerDefs()
  
  const { notificationHistory } = useMonitoring()
  const [showLog, setShowLog] = useState(false)

  const iconNames = useMemo(() => {
    if (!notificationHistory) return []
    const names = new Set()
    for (const log of notificationHistory) {
      if (log.image) names.add(log.image)
    }
    return Array.from(names)
  }, [notificationHistory])

  const uiIcon = useUIIcons(iconNames)

  useEffect(() => {
    const saved = getSetting('notifications', [])
    setNotifications(Array.isArray(saved) ? saved : [])
    setLoading(false)
  }, [])

  async function persist(updated) {
    setNotifications(updated)
    await setSetting('notifications', updated)
  }

  function handleAdd(triggerId) {
    const newNotif = getDefaultNotification(triggerId)
    if (!newNotif) return
    persist([...notifications, newNotif])
  }

  function handleDelete(id) {
    persist(notifications.filter(n => n.id !== id))
  }

  function handleToggle(id) {
    persist(notifications.map(n =>
      n.id === id ? { ...n, enabled: !n.enabled } : n
    ))
  }

  function handleConfigChange(id, key, value) {
    persist(notifications.map(n =>
      n.id === id ? { ...n, config: { ...n.config, [key]: value } } : n
    ))
  }

  function handleMultiSelect(id, key, optionValue) {
    const notif = notifications.find(n => n.id === id)
    if (!notif) return
    const current = notif.config[key] || []
    const updated = current.includes(optionValue)
      ? current.filter(v => v !== optionValue)
      : [...current, optionValue]
    handleConfigChange(id, key, updated)
  }

  if (loading) return null

  return (
    <div>
      <div className="space-y-2">
        {notifications.length === 0 && (
          <p className="text-sm text-kronos-dim text-center py-6">No notifications configured. Add one below.</p>
        )}
        {notifications.map(notif => {
          const def = triggerDefs.find(t => t.id === notif.trigger)
          if (!def) return null
          return (
            <NotificationRow
              key={notif.id}
              notif={notif}
              def={def}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onConfigChange={handleConfigChange}
              onMultiSelect={handleMultiSelect}
            />
          )
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-white/5">
        <select
          value=""
          onChange={(e) => { if (e.target.value) { handleAdd(e.target.value); e.target.value = '' } }}
          className="w-full kronos-select text-sm"
        >
          <option value="">+ Add Notification</option>
          {triggerDefs.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-8 pt-4 border-t border-white/5">
        <button
          onClick={() => setShowLog(true)}
          className="flex items-center gap-2 text-sm font-bold text-kronos-text uppercase hover:text-white transition-colors"
        >
          <History size={16} />
          Session Log {notificationHistory?.length > 0 && <span className="text-kronos-dim">({notificationHistory.length})</span>}
        </button>
        
        <Modal isOpen={showLog} onClose={() => setShowLog(false)} title="Session Log" maxWidth="max-w-md">
          <div className="space-y-2">
            {!notificationHistory || notificationHistory.length === 0 ? (
              <p className="text-sm text-kronos-dim italic text-center py-4">No notifications fired in this session.</p>
            ) : (
              notificationHistory.map((log, idx) => (
                <div key={idx} className="flex gap-3 items-start p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
                  {log.image ? (
                    <img src={uiIcon(log.image)} alt="" className="w-8 h-8 object-contain mt-0.5 opacity-80" />
                  ) : (
                    <div className="w-8 h-8 bg-black/20 rounded border border-white/5 flex items-center justify-center shrink-0">
                      <span className="text-[10px] text-white/30 font-bold uppercase">MSG</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-kronos-text uppercase truncate">{log.title}</span>
                      <span className="text-[10px] text-kronos-dim whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-kronos-dim/80 mt-1 leading-snug">{log.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      </div>
    </div>
  )
}

function NotificationRow({ notif, def, onDelete, onToggle, onConfigChange, onMultiSelect }) {
  return (
    <div className="p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-kronos-text uppercase shrink-0 min-w-[140px]">{def.label}</span>

        <div className="flex-1 flex items-center gap-3 flex-wrap">
          {def.columns.map(col => (
            <div key={col.key} className="flex items-center gap-1.5">
              {col.type === 'multi-select' && (
                <div className="flex items-center gap-1 flex-wrap">
                  {col.options.map(opt => {
                    const val = typeof opt === 'string' ? opt : opt.value
                    const label = typeof opt === 'string' ? opt : opt.label
                    const selected = (notif.config[col.key] || []).includes(val)
                    return (
                      <button
                        key={val}
                        onClick={() => onMultiSelect(notif.id, col.key, val)}
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border transition-all ${
                          selected
                            ? 'bg-kronos-accent/20 border-kronos-accent text-kronos-accent'
                            : 'border-white/10 text-kronos-dim hover:border-white/20'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}
              {col.type === 'number' && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-kronos-dim uppercase">{col.label}</span>
                  <input
                    type="number"
                    value={notif.config[col.key] ?? col.default ?? 0}
                    onChange={(e) => onConfigChange(notif.id, col.key, parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-1 rounded bg-black/20 border border-white/10 text-xs text-white text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              )}
              {col.type === 'checklist-tasks' && <ChecklistTaskSelect notif={notif} col={col} onMultiSelect={onMultiSelect} />}
              {(!col.type || col.type === 'info') && (
                <span className="text-[10px] text-kronos-dim italic">{col.label}</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onDelete(notif.id)}
            className="p-1.5 rounded border border-white/10 text-kronos-dim hover:text-red-400 hover:border-red-400/40 transition-all"
          >
            <Trash2 size={14} />
          </button>
          <Toggle checked={notif.enabled} onChange={() => onToggle(notif.id)} />
        </div>
      </div>
    </div>
  )
}

function ChecklistTaskSelect({ notif, col, onMultiSelect }) {
  const tasks = window.__checklistTasks || []

  return (
    <div className="flex flex-wrap gap-1">
      {tasks.map(t => {
        const isOn = (notif.config?.taskFilter || []).includes(t.id)
        return (
          <button
            key={t.id}
            onClick={() => onMultiSelect(notif.id, col.key, t.id)}
            className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border transition-all ${
              isOn
                ? 'bg-kronos-accent/20 border-kronos-accent text-kronos-accent'
                : 'border-white/10 text-kronos-dim hover:border-white/20'
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
