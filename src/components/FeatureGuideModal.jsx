import React, { useState } from 'react';
import { X, Keyboard, HelpCircle, Compass, Shield, Sparkles, BookOpen, Layers, CheckSquare, Zap, Eye } from 'lucide-react';
import { useUi } from '../contexts/UiContext';

export default function FeatureGuideModal({ isOpen, onClose }) {
  const { t } = useUi();
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
              <h2 className="text-lg font-bold text-white leading-tight">{t('feature_guide.title')}</h2>
              <p className="text-xs text-kronos-dim">{t('feature_guide.subtitle')}</p>
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
            {t('feature_guide.tab_hotkeys')}
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
            {t('feature_guide.tab_screens')}
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
            {t('feature_guide.tab_tips')}
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1">
          {activeTab === 'hotkeys' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap size={16} className="text-kronos-accent" />
                  {t('feature_guide.overlay_heading')}
                </h3>
                <p className="text-xs text-kronos-dim leading-relaxed">
                  {t('feature_guide.overlay_desc_pre')} <strong className="text-white">{t('feature_guide.overlay_desc_mode')}</strong> {t('feature_guide.overlay_desc_mid')} <span className="text-kronos-accent">{t('feature_guide.overlay_desc_path')}</span>.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-black/30 rounded-lg border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{t('feature_guide.card_toggle_sidebar_title')}</p>
                      <p className="text-[11px] text-kronos-dim">{t('feature_guide.card_toggle_sidebar_desc')}</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 border border-white/20 rounded font-mono text-xs font-bold text-kronos-accent">Alt + X</kbd>
                  </div>

                  <div className="p-3 bg-black/30 rounded-lg border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{t('feature_guide.card_manual_ocr_title')}</p>
                      <p className="text-[11px] text-kronos-dim">{t('feature_guide.card_manual_ocr_desc')}</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 border border-white/20 rounded font-mono text-xs font-bold text-kronos-accent">Alt + R</kbd>
                  </div>

                  <div className="p-3 bg-black/30 rounded-lg border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{t('feature_guide.card_riven_overlay_title')}</p>
                      <p className="text-[11px] text-kronos-dim">{t('feature_guide.card_riven_overlay_desc')}</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 border border-white/20 rounded font-mono text-xs font-bold text-kronos-accent">Alt + O</kbd>
                  </div>

                  <div className="p-3 bg-black/30 rounded-lg border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{t('feature_guide.card_sidebar_presets_title')}</p>
                      <p className="text-[11px] text-kronos-dim">{t('feature_guide.card_sidebar_presets_desc')}</p>
                    </div>
                    <span className="text-xs text-kronos-accent font-bold">{t('feature_guide.settings_label')}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Eye size={16} className="text-emerald-400" />
                  {t('feature_guide.log_scanner_heading')}
                </h3>
                <p className="text-xs text-kronos-dim leading-relaxed">
                  {t('feature_guide.log_scanner_desc')}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'screens' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                <p className="text-xs font-bold text-kronos-accent flex items-center gap-1.5">
                  <Layers size={14} /> {t('feature_guide.screen_relics_title')}
                </p>
                <p className="text-xs text-kronos-dim leading-relaxed">
                  {t('feature_guide.screen_relics_desc_pre')} <strong>{t('feature_guide.screen_relics_desc_omnia')}</strong> {t('feature_guide.screen_relics_desc_mid1')} <strong>{t('feature_guide.screen_relics_desc_vaulted')}</strong> {t('feature_guide.screen_relics_desc_mid2')} <strong>{t('feature_guide.screen_relics_desc_refinements')}</strong> {t('feature_guide.screen_relics_desc_end')}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                <p className="text-xs font-bold text-kronos-accent flex items-center gap-1.5">
                  <CheckSquare size={14} /> {t('feature_guide.screen_checklist_title')}
                </p>
                <p className="text-xs text-kronos-dim leading-relaxed">
                  {t('feature_guide.screen_checklist_desc_pre')} <strong>{t('feature_guide.screen_checklist_desc_glast')}</strong> {t('feature_guide.screen_checklist_desc_mid')} <strong>{t('feature_guide.screen_checklist_desc_eleanor')}</strong> {t('feature_guide.screen_checklist_desc_end')}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                <p className="text-xs font-bold text-kronos-accent flex items-center gap-1.5">
                  <Compass size={14} /> {t('feature_guide.screen_collectibles_title')}
                </p>
                <p className="text-xs text-kronos-dim leading-relaxed">
                  {t('feature_guide.screen_collectibles_desc')}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                <p className="text-xs font-bold text-kronos-accent flex items-center gap-1.5">
                  <Shield size={14} /> {t('feature_guide.screen_foundry_title')}
                </p>
                <p className="text-xs text-kronos-dim leading-relaxed">
                  {t('feature_guide.screen_foundry_desc_pre')} <strong>{t('feature_guide.screen_foundry_desc_strong')}</strong> {t('feature_guide.screen_foundry_desc_end')}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'tips' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-kronos-accent">{t('feature_guide.tips_inventory_title')}</h3>
                <p className="text-xs text-kronos-dim leading-relaxed">
                  {t('feature_guide.tips_inventory_desc')}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-kronos-accent">{t('feature_guide.tips_market_title')}</h3>
                <p className="text-xs text-kronos-dim leading-relaxed">
                  {t('feature_guide.tips_market_desc_pre')} <strong>{t('feature_guide.tips_market_desc_owned')}</strong> {t('feature_guide.tips_market_desc_end')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-white/[0.02]">
          <span className="text-[11px] text-kronos-dim">Kieda's Orbiter — {t('feature_guide.footer_tagline')}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-kronos-accent text-black font-bold text-xs rounded-lg hover:brightness-110 transition-all"
          >
            {t('feature_guide.close_button')}
          </button>
        </div>
      </div>
    </div>
  );
}
