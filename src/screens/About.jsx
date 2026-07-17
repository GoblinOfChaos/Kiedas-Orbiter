/**
 * About.jsx
 *
 * App information, credits, and legal disclaimer.
 *
 * ROLE
 * ─────────────────────────────────────────
 * Purely informational component. Displays versions, links to data sources
 * (warframe-items, browse.wf, etc.), and a critical warning about the
 * ban risk associated with memory-based extraction.
 */
import { useState, useEffect } from 'react'
import { AlertTriangle, Github, MessageCircle } from 'lucide-react'
import { PageLayout, Card } from '../components/UI'
import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import { version } from '../../package.json'

const CREDITS = [
  { name: 'calamity-inc', desc: 'browse.wf & warframe-public-export-plus', href: 'https://github.com/calamity-inc' },
  { name: 'relics.run', desc: 'Daily price history / market engine data', href: 'https://relics.run' },
  { name: 'Sainan/warframe-api-helper', desc: 'Template for session token extraction', href: 'https://github.com/Sainan/warframe-api-helper' },
  { name: 'warframetools.com', desc: 'Checklist inspiration', href: 'https://warframetools.com/Task-Checklist/' },
  { name: 'Warframe Wiki', desc: 'Game information reference', href: 'https://wiki.warframe.com' },
  { name: 'cjtho/WarframeRivenPricer', desc: 'Riven pricing with Neural Network', href: 'https://github.com/cjtho/WarframeRivenPricer' },
]

export default function About() {
  const [uiPath, setUiPath] = useState('')
  useEffect(() => { invoke('get_ui_path').then(setUiPath).catch(() => { }) }, [])

  const handleOpenLink = async (url) => {
    try {
      await invoke('open_url', { url })
    } catch (err) {
      console.error('Failed to open link with custom open_url command:', err)
    }
  }

  return (
    <PageLayout title="About">
      <div className="space-y-6">

        {/* App Info */}
        <Card glow>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img
                src={uiPath ? convertFileSrc(`${uiPath}/IconKronos.png`) : ''}
                alt="Cephalon Kronos"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Cephalon Kronos</h2>
              <p className="text-kronos-dim text-sm">v{version} - Open source Warframe companion</p>
            </div>
          </div>
          <p className="text-kronos-text/90 mb-4 leading-relaxed text-sm">
            Track your inventory, relics, rivens and mastery alongside a live worldstate with timers, fissures, arbitrations and more.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleOpenLink('https://github.com/glowseeker/cephalon-kronos')}
              className="inline-flex items-center gap-2 text-kronos-accent hover:text-kronos-accent-secondary transition-colors text-sm font-medium cursor-pointer"
            >
              <Github size={18} />
              GitHub
            </button>
            <button
              onClick={() => handleOpenLink('https://discord.gg/9GjkZ9aXwy')}
              className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-medium cursor-pointer"
            >
              <MessageCircle size={18} />
              Discord
            </button>
          </div>
        </Card>

        {/* Credits */}
        <Card glow>
          <h3 className="text-sm font-bold uppercase tracking-widest text-kronos-dim mb-3">Credits</h3>
          <ul className="space-y-2">
            {CREDITS.map(({ name, desc, href }) => (
              <li key={name} className="flex items-start gap-2 text-sm">
                <span className="text-kronos-accent font-bold flex-shrink-0">•</span>
                <span>
                  <button
                    onClick={() => handleOpenLink(href)}
                    className="font-bold text-kronos-accent hover:underline cursor-pointer"
                  >
                    {name}
                  </button>
                  <span className="text-kronos-dim ml-1.5">- {desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Disclaimer */}
        <Card glow className="bg-red-500/10 border-red-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-1" size={22} />
            <div>
              <h3 className="text-base font-semibold text-red-400 mb-2">Important Disclaimer</h3>
              <p className="text-kronos-text/90 text-sm leading-relaxed mb-2">
                This app reads Warframe's game memory directly to fetch session tokens and other in-game information.
              </p>
              <ul className="text-kronos-text/80 text-xs space-y-0.5 mb-2 list-disc list-inside">
                <li>Digital Extremes has not explicitly approved this application and has no affiliation with it.</li>
                <li>The app merely reads memory; it never modifies it or game files.</li>
              </ul>
              <p className="text-red-400 font-medium text-xs">Use at your own risk.</p>
            </div>
          </div>
        </Card>

      </div>
    </PageLayout>
  )
}

