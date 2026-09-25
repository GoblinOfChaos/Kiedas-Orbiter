import React from 'react'
import ReactDOM from 'react-dom/client'
import { invoke } from './lib/logging/tauri'
import App from './App'
import { IS_PREVIEW } from './lib/buildProfile'
import './index.css'
import { debug, installFetchLogging } from './lib/logging/logger'

import "@fontsource/outfit/400.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/jetbrains-mono/400.css";

// Forward frontend errors and warnings to Rust stderr (captured by run logs)
if (typeof window !== 'undefined') {
  installFetchLogging();
  if (globalThis.__kiedasMainInstrumentationInstalled) {
    // HMR can re-evaluate this module; listeners and console wrappers must be singleton.
  } else {
    globalThis.__kiedasMainInstrumentationInstalled = true;
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

  // Preview-only: forward console.log too, so future debugging never needs a
  // rebuild just to add visibility. Gated off Stable to avoid an IPC round
  // trip per log line for users who never open a terminal.
    if (IS_PREVIEW) {
      const origLog = console.log;
      console.log = (...args) => {
        origLog.apply(console, args);
        forwardLog('LOG', ...args);
      };
    }

    window.addEventListener('error', (event) => {
      forwardLog('UNCAUGHT', event.message, `at ${event.filename}:${event.lineno}:${event.colno}`, event.error);
    });

  // Always on, all builds: PerformanceObserver('longtask') reports real
  // main-thread blocking (>50ms) directly - no devtools Performance tab
  // needed to see what's actually causing visible stutter/jank.
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            forwardLog('WARN', `[LongTask] duration=${entry.duration.toFixed(1)}ms startTime=${entry.startTime.toFixed(1)}ms name=${entry.name}`);
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch {}
    }

    window.addEventListener('unhandledrejection', (event) => {
      forwardLog('UNHANDLED-PROMISE', event.reason);
    });

    if (IS_PREVIEW) {
      // Input-to-frame latency: one requestAnimationFrame per user input (no polling loop). WebKitGTK has no
      // longtask support, so this is the only direct measure of "the app feels slow to respond".
      for (const type of ['pointerdown', 'keydown', 'input']) {
        document.addEventListener(type, (event) => {
          const started = event.timeStamp;
          requestAnimationFrame(() => {
            const ms = Math.round(performance.now() - started);
            if (ms > 150) debug('perf.input_to_frame', { ms, type, route: location.hash || location.pathname }, { source: 'frontend' });
          });
        }, true);
      }
      globalThis.__kiedasPreviewHeartbeat = setInterval(() => {
        const memory = performance.memory;
        debug('preview.heartbeat', {
          heap_used_bytes: memory?.usedJSHeapSize,
          heap_total_bytes: memory?.totalJSHeapSize,
          dom_elements: document.getElementsByTagName('*').length,
          dom_images: document.images.length,
          window_width: window.innerWidth,
          window_height: window.innerHeight
        }, { source: 'frontend' });
      }, 60000);
    }
  }
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
