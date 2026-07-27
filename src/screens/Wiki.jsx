import { useRef, useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { PageLayout } from '../components/UI'

export default function Wiki() {
  const containerRef = useRef(null)
  const tabsRef = useRef([])
  const [tabs, setTabs] = useState([{ label: 'wiki-0', title: 'Warframe Wiki' }])
  const [activeTab, setActiveTab] = useState('wiki-0')
  const activeTabRef = useRef(activeTab)
  const lastRectRef = useRef(null)
  const debounceRef = useRef(null)

  tabsRef.current = tabs
  activeTabRef.current = activeTab

  const reportBounds = useCallback((label) => {
    const el = containerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const last = lastRectRef.current
    if (last && Math.abs(last.width - r.width) < 2 && Math.abs(last.height - r.height) < 2
      && Math.abs(last.left - r.left) < 2 && Math.abs(last.top - r.top) < 2) return

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      console.log('📐 Wiki container rect (logical):', r.left, r.top, r.width, r.height)
      lastRectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height }
      invoke('reflow_wiki_tab', {
        label, x: r.left, y: r.top, width: r.width, height: r.height,
      }).catch(err => console.error('reflow error:', err))
    }, 150)
  }, [])

  const showTab = useCallback((label, url) => {
    invoke('show_wiki_tab', { label, url })
      .then(actualLabel => {
        // Replace the placeholder label with the actual namespaced label
        setTabs(t => t.map(tab => tab.label === label ? { ...tab, label: actualLabel } : tab))
        setActiveTab(actualLabel)
        // Force a reflow after a short delay to let GTK attach the webview
        setTimeout(() => {
          const el = containerRef.current
          if (el) {
            const r = el.getBoundingClientRect()
            invoke('reflow_wiki_tab', { label: actualLabel, x: r.left, y: r.top, width: r.width, height: r.height })
              .catch(() => { })
          }
        }, 50)
      })
      .catch(err => console.error('show wiki tab error:', err))
  }, [])

  useEffect(() => {
    // Close stale tabs
    tabsRef.current.forEach(t => invoke('close_wiki_tab', { label: t.label }).catch(() => { }))
    showTab('wiki-0')

    const measure = () => reportBounds(activeTabRef.current)
    requestAnimationFrame(measure)
    const timeout = setTimeout(measure, 200)

    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)

    window.addEventListener('resize', measure)
    const currentLabel = getCurrentWindow().label

    const unlistenOpen = listen('wiki-tab-opened', (e) => {
      const { label, url, source_window } = e.payload
      if (source_window && source_window !== currentLabel) return
      // Add the new tab to the list and immediately activate it
      setTabs(t => [...t, { label, title: 'New tab' }])
      showTab(label, url)  // This will also reflow and show the tab
    })

    const unlistenTitle = listen('wiki-tab-title', (e) => {
      const { title, source_window, label } = e.payload
      console.log('📝 Title event:', { title, source_window, label, currentLabel })
      if (source_window && source_window !== currentLabel) return
      setTabs(t => t.map(tab => tab.label === label ? { ...tab, title } : tab))
    })

    return () => {
      clearTimeout(timeout)
      clearTimeout(debounceRef.current)
      ro.disconnect()
      window.removeEventListener('resize', measure)
      unlistenOpen.then(f => f())
      unlistenTitle.then(f => f())
      tabsRef.current.forEach(t => invoke('close_wiki_tab', { label: t.label }).catch(() => { }))
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    reportBounds(activeTab)
  }, [activeTab, reportBounds])

  const closeTab = (label, e) => {
    e.stopPropagation()
    invoke('close_wiki_tab', { label }).catch(() => { })
    setTabs(t => t.filter(x => x.label !== label))
    if (activeTab === label) {
      const remaining = tabs.filter(x => x.label !== label)
      if (remaining.length) showTab(remaining[remaining.length - 1].label)
    }
  }

  return (
    <PageLayout
      title="Wiki"
      extra={
        <div className="flex items-center gap-1">
          {tabs.map(t => (
            <div key={t.label}
              onClick={() => showTab(t.label)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${activeTab === t.label
                  ? 'bg-kronos-accent/20 text-kronos-accent'
                  : 'bg-white/5 text-kronos-dim hover:bg-white/10'
                }`}>
              <span className="max-w-[120px] truncate">{t.title}</span>
              {tabs.length > 1 && (
                <X size={12} onClick={(e) => closeTab(t.label, e)} className="hover:text-red-400" />
              )}
            </div>
          ))}
        </div>
      }
    >
      <div ref={containerRef} className="absolute inset-0" />
    </PageLayout>
  )
}