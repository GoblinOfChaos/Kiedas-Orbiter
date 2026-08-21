import React, { useState } from 'react';
import { X, Keyboard, HelpCircle, Compass, Shield, Sparkles, BookOpen, Layers, CheckSquare, Zap, Eye } from 'lucide-react';

export default function FeatureGuideModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('hotkeys');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-[var(--color-panel)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-kronos-accent/20 border border-kronos-accent/30 flex items-center justify-center text-kronos-accent">
              <Compass size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Feature Guide & Shortcuts</h2>
              <p className="text-xs text-kronos-dim">Quick overview of key features, global hotkeys, and orbiter tools</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-kronos-dim hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 px-6 bg-white/[0.01]">
          <button
            onClick={() => setActiveTab('hotkeys')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'hotkeys'
                ? 'border-kronos-accent text-kronos-accent'
                : 'border-transparent text-kronos-dim hover:text-white'
            }`}
          >
            <Keyboard size={15} />
            Global Hotkeys & Overlay
          </button>
          <button
            onClick={() => setActiveTab('screens')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'screens'
                ? 'border-kronos-accent text-kronos-accent'
                : 'border-transparent text-kronos-dim hover:text-white'
            }`}
          >
            <BookOpen size={15} />
            Screen Features
          </button>
          <button
            onClick={() => setActiveTab('tips')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'tips'
                ? 'border-kronos-accent text-kronos-accent'
                : 'border-transparent text-kronos-dim hover:text-white'
            }`}
          >
            <Sparkles size={15} />
            Pro Tips & Inventory
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1">
          {activeTab === 'hotkeys' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap size={16} className="text-kronos-accent" />
                  In-Game Overlay & Shortcuts
                </h3>
                <p className="text-xs text-kronos-dim leading-relaxed">
                  Kieda's Orbiter can run in the background while you play Warframe in <strong className="text-white">Borderless Windowed</strong> mode. You can customize all keybindings in <span className="text-kronos-accent">Settings &gt; Global Hotkeys</span>.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-black/30 rounded-lg border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Toggle In-Game Sidebar</p>
                      <p className="text-[11px] text-kronos-dim">Slides the sidebar over the game</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 border border-white/20 rounded font-mono text-xs font-bold text-kronos-accent">Alt + X</kbd>
                  </div>

                  <div className="p-3 bg-black/30 rounded-lg border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Manual Relic OCR Scan</p>
                      <p className="text-[11px] text-kronos-dim">Capture fissure reward screen</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 border border-white/20 rounded font-mono text-xs font-bold text-kronos-accent">Alt + R</kbd>
                  </div>

                  <div className="p-3 bg-black/30 rounded-lg border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Riven Valuation Overlay</p>
                      <p className="text-[11px] text-kronos-dim">Inspect rolled Riven stats & price</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 border border-white/20 rounded font-mono text-xs font-bold text-kronos-accent">Alt + O</kbd>
                  </div>

                  <div className="p-3 bg-black/30 rounded-lg border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Sidebar Width Presets</p>
                      <p className="text-[11px] text-kronos-dim">Compact (380px) to Full (800px)</p>
                    </div>
                    <span className="text-xs text-kronos-accent font-bold">Settings</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Eye size={16} className="text-emerald-400" />
                  Auto Log-Scanner & Fissure Helper
                </h3>
                <p className="text-xs text-kronos-dim leading-relaxed">
                  When enabled in Settings, the log-scanner automatically detects squad relic selections and displays plat prices, ducat values, and vaulted indicators without taking screenshot lag.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'screens' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                <p className="text-xs font-bold text-kronos-accent flex items-center gap-1.5">
                  <Layers size={14} /> Relics & Relic Planner
                </p>
                <p className="text-xs text-kronos-dim leading-relaxed">
                  Use dedicated filters for <strong>Omnia</strong> relics, <strong>Vaulted / Unvaulted</strong> parts, and <strong>Has Refinements</strong> to find your upgraded relics instantly.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                <p className="text-xs font-bold text-kronos-accent flex items-center gap-1.5">
                  <CheckSquare size={14} /> Checklist & Resets
                </p>
                <p className="text-xs text-kronos-dim leading-relaxed">
                  Tracks daily focus caps, syndicate standing, <strong>Ergo Glast: Tenet Melee</strong> (11:00 UTC stock), and <strong>Eleanor's 1999 Shop</strong> (8-day rotation).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                <p className="text-xs font-bold text-kronos-accent flex items-center gap-1.5">
                  <Compass size={14} /> Collectibles & Caves
                </p>
                <p className="text-xs text-kronos-dim leading-relaxed">
                  Shows exact per-item bitfields for all 56 Kuria, 90 Duviri fragments, 15 Isleweaver fragments, and all 42 open-world caves with landmark guides.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                <p className="text-xs font-bold text-kronos-accent flex items-center gap-1.5">
                  <Shield size={14} /> Foundry & Blueprints
                </p>
                <p className="text-xs text-kronos-dim leading-relaxed">
                  Item cards display circular ingredient bubbles with the primary <strong>Blueprint bubble (BP)</strong> to immediately see whether you own the blueprint.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'tips' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-kronos-accent">Inventory Sync & Cache</h3>
                <p className="text-xs text-kronos-dim leading-relaxed">
                  Kieda's Orbiter reads your locally cached Warframe inventory file to ensure zero network delays and 100% privacy. To force a sync, click the refresh button in Settings or wait for automatic background polling.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-kronos-accent">Market Sales & Darvo Deals</h3>
                <p className="text-xs text-kronos-dim leading-relaxed">
                  Items you already own in your inventory or foundry are automatically dimmed and marked with a green <strong>Owned</strong> badge on your Dashboard.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-white/[0.02]">
          <span className="text-[11px] text-kronos-dim">Kieda's Orbiter — Fast, Private, Offline-First Companion</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-kronos-accent text-black font-bold text-xs rounded-lg hover:brightness-110 transition-all"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
