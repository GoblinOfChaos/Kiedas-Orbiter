import React, { useState, useEffect } from 'react';
import { X, Bug, Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useUi } from '../contexts/UiContext';

export default function BugReporterModal({ isOpen, onClose, initialDescription = '' }) {
  const { t } = useUi();
  const [description, setDescription] = useState(initialDescription);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // 'success' or 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) setDescription(initialDescription);
  }, [isOpen, initialDescription]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!description.trim()) return;
    
    setIsSubmitting(true);
    setStatus(null);
    try {
      // 1. Zips logs and saves to Desktop
      // 2. Opens browser to GitHub New Issue with prefilled template
      await invoke('prepare_bug_report', { description });
      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus(null);
        setDescription('');
      }, 4000);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-kronos-base w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-kronos-panel/30">
          <div className="flex items-center gap-3 text-kronos-accent">
            <Bug size={24} />
            <h2 className="text-xl font-black uppercase tracking-widest">{t('bug_reporter.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-kronos-dim hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-kronos-dim block">
              {t('bug_reporter.description_label')}
            </label>
            <textarea
              autoFocus
              className="w-full h-32 bg-[#12161f] text-white border border-white/20 rounded-xl p-4 text-sm focus:outline-none focus:border-kronos-accent resize-none transition-all placeholder:text-zinc-500"
              style={{ backgroundColor: "#12161f", color: "#ffffff" }}
              placeholder={t('bug_reporter.description_placeholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting || status === 'success'}
            />
          </div>

          <div className="bg-kronos-panel/30 p-4 rounded-xl border border-white/5 flex gap-3 text-sm">
            <div className="text-kronos-accent/80 mt-0.5">ℹ️</div>
            <div className="text-zinc-400 leading-relaxed text-xs">
              {t('bug_reporter.submit_info_heading')}
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>{t('bug_reporter.submit_info_logs_pre')} <strong>{t('bug_reporter.submit_info_logs_desktop')}</strong>.</li>
                <li>{t('bug_reporter.submit_info_browser')}</li>
                <li>{t('bug_reporter.submit_info_dragdrop_pre')} <strong>{t('bug_reporter.submit_info_dragdrop_strong')}</strong> {t('bug_reporter.submit_info_dragdrop_end')}</li>
              </ul>
            </div>
          </div>

          {status === 'success' && (
            <div className="p-4 bg-green-500/20 border border-green-500/40 text-green-400 rounded-xl text-sm flex items-center justify-center font-bold tracking-wide">
              {t('bug_reporter.success_message')}
            </div>
          )}

          {status === 'error' && (
            <div className="p-4 bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl text-xs font-mono break-all">
              {t('bug_reporter.error_prefix')}{errorMsg}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              {t('bug_reporter.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!description.trim() || isSubmitting || status === 'success'}
              className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-kronos-accent text-black hover:bg-kronos-accent/90 transition-all shadow-[0_0_20px_rgba(var(--kronos-accent-rgb),0.3)] disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Bug size={16} />}
              {isSubmitting ? t('bug_reporter.submitting') : t('bug_reporter.submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
