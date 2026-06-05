import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { emit, listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import { loadSettings, getSetting, setSetting } from '../lib/settings'

const ThemeContext = createContext()

export const THEMES = [
  { id: 'vitruvian', name: 'Vitruvian' },
  { id: 'baruuk', name: 'Baruuk' },
  { id: 'conquera', name: 'Conquera' },
  { id: 'corpus', name: 'Corpus' },
  { id: 'darklotus', name: 'Dark Lotus' },
  { id: 'deadlock', name: 'Deadlock' },
  { id: 'equinox', name: 'Equinox' },
  { id: 'fortuna', name: 'Fortuna' },
  { id: 'grineer', name: 'Grineer' },
  { id: 'legacy', name: 'Legacy' },
  { id: 'lunar', name: 'Lunar Renewal' },
  { id: 'pom2', name: 'POM-2' },
  { id: 'stalker', name: 'Stalker' },
  { id: 'harrier', name: 'Harrier' },
]

export function ThemeProvider({ children }) {
  const [loaded, setLoaded] = useState(false)
  const [theme, setThemeState] = useState('vitruvian')
  const [cursorStyle, setCursorStyleState] = useState('system')
  const [cursorTint, setCursorTintState] = useState(false)
  const [uiPath, setUiPath] = useState('')
  
  const themeRef = useRef('vitruvian')
  const cursorStyleRef = useRef('system')
  const cursorTintRef = useRef(false)
  
  // Load settings and fetch ui path on mount
  useEffect(() => {
    Promise.all([
      loadSettings(),
      invoke('get_ui_path').then(setUiPath).catch(() => {}),
    ]).then(() => {
      const saved = getSetting('kronos-theme', 'vitruvian')
      setThemeState(saved)
      themeRef.current = saved
      document.documentElement.setAttribute('data-theme', saved)

      const cs = getSetting('cursor-style', 'system')
      setCursorStyleState(cs)
      cursorStyleRef.current = cs

      const ct = getSetting('cursor-tint', false) === true
      setCursorTintState(ct)
      cursorTintRef.current = ct

      setLoaded(true)
    }).catch(err => {
      console.error('Failed to load settings:', err)
      setLoaded(true)
    })
  }, [])

  // Apply cursor to ALL elements (no fallbacks) via injected <style>, with optional tint
  const cursorApplyId = useRef(0)

  useEffect(() => {
    if (!loaded) return

    const oldStyle = document.getElementById('kronos-cursor-style')
    if (oldStyle) oldStyle.remove()
    document.documentElement.classList.remove('kronos-custom-cursor')
    document.body.style.cursor = ''

    if (cursorStyle === 'system') return

    const cursorFile = cursorStyle === 'default' ? 'CursorDefault' : 'CursorRetro'
    const src = convertFileSrc(`${uiPath}/${cursorFile}.png`)

    const id = ++cursorApplyId.current
    const applyCursor = async () => {
      try {
        const bytes = await invoke('read_file_bytes', { relative: `data/assets/ui/${cursorFile}.png` })
        const blob = new Blob([new Uint8Array(bytes)])
        const img = await createImageBitmap(blob)
        const scale = 24 / Math.max(img.width, img.height)
        const w = Math.round(img.width * scale) || 1
        const h = Math.round(img.height * scale) || 1
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)

        if (cursorTint) {
          const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#00aaff'
          ctx.globalCompositeOperation = 'multiply'
          ctx.fillStyle = accent
          ctx.fillRect(0, 0, w, h)
          ctx.globalCompositeOperation = 'destination-in'
          ctx.drawImage(img, 0, 0, w, h)
        }

        if (id !== cursorApplyId.current) return

        const finalUrl = canvas.toDataURL()
        const style = document.createElement('style')
        style.id = 'kronos-cursor-style'
        style.textContent = `html.kronos-custom-cursor, html.kronos-custom-cursor * { cursor: url('${finalUrl}'), auto !important; }`
        document.head.appendChild(style)
        document.documentElement.classList.add('kronos-custom-cursor')
      } catch {
        if (id !== cursorApplyId.current) return
        const style = document.createElement('style')
        style.id = 'kronos-cursor-style'
        style.textContent = `html.kronos-custom-cursor, html.kronos-custom-cursor * { cursor: url('${src}'), auto !important; }`
        document.head.appendChild(style)
        document.documentElement.classList.add('kronos-custom-cursor')
      }
    }

    applyCursor()
  }, [cursorStyle, cursorTint, uiPath, loaded, theme])

  // (theme, cursor, and cursorTint persistence effects below)

  useEffect(() => {
    if (!loaded) return
    themeRef.current = theme
    document.documentElement.setAttribute('data-theme', theme)
    setSetting('kronos-theme', theme)
  }, [theme, loaded])

  useEffect(() => {
    if (!loaded) return
    cursorStyleRef.current = cursorStyle
    setSetting('cursor-style', cursorStyle)
  }, [cursorStyle, loaded])

  useEffect(() => {
    if (!loaded) return
    cursorTintRef.current = cursorTint
    setSetting('cursor-tint', cursorTint)
  }, [cursorTint, loaded])

  const setTheme = (newTheme, remote = false) => {
    if (newTheme === themeRef.current) return
    setThemeState(newTheme)
    if (!remote) {
      emit('theme-changed', newTheme)
    }
  }

  const setCursorStyle = (val) => {
    if (val === cursorStyleRef.current) return
    setCursorStyleState(val)
  }

  const setCursorTint = (val) => {
    if (val === cursorTintRef.current) return
    setCursorTintState(val)
  }

  // Set up listeners
  useEffect(() => {
    const unlistens = []

    listen('theme-changed', (event) => {
      if (event.payload !== themeRef.current) {
        setTheme(event.payload, true)
      }
    }).then(un => unlistens.push(un))

    const isMain = getCurrentWindow().label === 'main'
    
    if (isMain) {
      listen('request-theme', () => {
        emit('theme-changed', themeRef.current)
      }).then(un => unlistens.push(un))
    } else {
      emit('request-theme', {})
    }

    return () => {
      unlistens.forEach(un => un())
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES, cursorStyle, setCursorStyle, cursorTint, setCursorTint }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
