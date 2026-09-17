import React from 'react'
import ReactDOM from 'react-dom/client'
import { invoke } from '@tauri-apps/api/core'
import App from './App'
import { IS_PREVIEW } from './lib/buildProfile'
import './index.css'

import "@fontsource/outfit/400.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/jetbrains-mono/400.css";

// Forward frontend errors and warnings to Rust stderr (captured by run logs)
if (typeof window !== 'undefined') {
  const forwardLog = (level, ...args) => {
    try {
      const msg = args.map(a => {
        if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack || ''}`;
        if (typeof a === 'object') {
          try { return JSON.stringify(a); } catch { return String(a); }
        }
        return String(a);
      }).join(' ');
      invoke('log_terminal', { message: `[${level}] ${msg}` }).catch(() => {});
    } catch {}
  };

  const origError = console.error;
  console.error = (...args) => {
    origError.apply(console, args);
    forwardLog('ERROR', ...args);
  };

  const origWarn = console.warn;
  console.warn = (...args) => {
    origWarn.apply(console, args);
    forwardLog('WARN', ...args);
  };

  window.addEventListener('error', (event) => {
    forwardLog('UNCAUGHT', event.message, `at ${event.filename}:${event.lineno}:${event.colno}`, event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    forwardLog('UNHANDLED-PROMISE', event.reason);
  });
}

async function boot() {
  const nativePreview = await invoke('get_build_profile');
  if (nativePreview !== IS_PREVIEW) throw new Error('Frontend and native Preview build profiles do not match');
  if (IS_PREVIEW) {
    document.title = "Kieda's Orbiter Preview";
    const checklist = await invoke('load_preview_checklist');
    if (checklist && localStorage.getItem('preview.checklistRevision') !== checklist.revision) {
      const allowed = ['checklist_completed', 'checklist_hidden', 'checklist_auto_track', 'checklist_last_conquest_completion', 'checklist_completed_reset_at'];
      const prior = Object.fromEntries(allowed.map(key => [key, localStorage.getItem(key)]));
      localStorage.setItem('preview.checklistBackup', JSON.stringify(prior));
      try {
        for (const key of allowed) if (typeof checklist.keys?.[key] === 'string') localStorage.setItem(key, checklist.keys[key]);
        localStorage.setItem('preview.checklistRevision', checklist.revision);
      } catch (error) {
        for (const key of allowed) { if (prior[key] === null) localStorage.removeItem(key); else localStorage.setItem(key, prior[key]); }
        throw error;
      }
    }
  }
  ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
}
boot().catch(error => {
  document.getElementById('root').textContent = `Application initialization failed: ${error.message || error}`;
});
