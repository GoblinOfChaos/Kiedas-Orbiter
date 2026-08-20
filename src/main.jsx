import React from 'react'
import ReactDOM from 'react-dom/client'
import { invoke } from '@tauri-apps/api/core'
import App from './App'
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)