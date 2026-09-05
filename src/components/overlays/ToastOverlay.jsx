import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUi } from '../../contexts/UiContext'
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Bell } from 'lucide-react';

const TOAST_MS = 5000;
const IS_LINUX = typeof navigator !== 'undefined' &&
navigator.userAgent.toLowerCase().includes('linux') &&
!navigator.userAgent.toLowerCase().includes('android');

const LIMITS = IS_LINUX ? 1 : 3;

function useUIIcons(iconNames) {
  const [iconCache, setIconCache] = useState({});
  useEffect(() => {
    if (!iconNames || iconNames.length === 0) return;
    let cancelled = false;
    Promise.all(iconNames.map(async (name) => {
      try {
        const bytes = await invoke('read_file_bytes', { relative: `data/assets/ui/${name}` });
        const blob = new Blob([new Uint8Array(bytes)]);
        return [name, await new Promise((r) => {
          const f = new FileReader();
          f.onload = () => r(f.result);
          f.onerror = () => r(null);
          f.readAsDataURL(blob);
        })];
      } catch {return [name, null];}
    })).then((entries) => {
      if (cancelled) return;
      const map = {};
      for (const [name, url] of entries) if (url) map[name] = url;
      setIconCache(map);
    });
    return () => {cancelled = true;};
  }, [iconNames]);
  const uiIcon = useCallback((name) => iconCache[name] || '', [iconCache]);
  return uiIcon;
}

export default function ToastOverlay({ position }) {
  const { t } = useUi()
  const [visibleToasts, setVisibleToasts] = useState([]);
  const [queue, setQueue] = useState([]);
  const containerRef = useRef(null);
  const myLabel = getCurrentWindow().label;

  const iconNames = useMemo(() => {
    const names = new Set();
    for (const toast of queue) if (toast.image) names.add(toast.image);
    for (const toast of visibleToasts) if (toast.image) names.add(toast.image);
    return Array.from(names);
  }, [queue, visibleToasts]);

  const uiIcon = useUIIcons(iconNames);

  const removeToast = useCallback((id) => {
    setVisibleToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (visibleToasts.length < LIMITS && queue.length > 0) {
      const next = queue[0];
      setQueue((prev) => prev.slice(1));
      setVisibleToasts((prev) => [...prev, next]);

      if (IS_LINUX) {
        invoke('start_notif_autoclose_timer', { id: next.id, seconds: 6 }).catch(console.error);
      }
    }
  }, [visibleToasts.length, queue]);

  const hadContent = useRef(false);
  useEffect(() => {
    if (visibleToasts.length === 0 && queue.length === 0) {
      if (hadContent.current) {
        invoke('resize_overlay_window', { label: myLabel, width: 1, height: 1 }).catch(() => {});
      }
    } else {
      hadContent.current = true;
    }
  }, [visibleToasts.length, queue.length, myLabel]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.target.scrollHeight;
        if (visibleToasts.length > 0 && height > 40) {
          invoke('resize_overlay_window', {
            label: myLabel,
            width: 440,
            height: height
          }).catch(console.error);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [myLabel, visibleToasts.length]);

  useEffect(() => {
    const subs = [];

    subs.push(listen('new-notification', (e) => {
      const { position: notifPos = 'top-right', title = '', message = '', image = '' } = e.payload;
      if (notifPos !== position) return;

      const newNotif = {
        id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title,
        message,
        image,
        createdAt: Date.now()
      };
      setQueue((prev) => [...prev, newNotif]);
    }));

    subs.push(listen('expire-notification', (e) => {
      removeToast(String(e.payload));
    }));

    subs.push(listen('wipe-state', (e) => {
      if (e.payload === position || e.payload === undefined) {
        setVisibleToasts([]);
        setQueue([]);
      }
    }));

    return () => {subs.forEach((p) => p.then((f) => f()));};
  }, [position, removeToast]);

  const isEmpty = visibleToasts.length === 0 && queue.length === 0;

  return (
    <div ref={containerRef} className={`flex flex-col gap-2 items-center p-10 w-[440px] select-none pointer-events-none ${isEmpty ? 'opacity-0' : ''}`}>
      {visibleToasts.map((toast, index) =>
      <div key={toast.id} className="relative">
          <ToastCard toast={toast} onExpire={() => removeToast(toast.id)} uiIcon={uiIcon} />
          {IS_LINUX && index === 0 && queue.length > 0 &&
        <div className="absolute -top-2 -right-2 z-50 animate-bounce">
              <div className="text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-white/20 bg-kronos-accent">
                +{queue.length}{t('toast.more')}
          </div>
            </div>
        }
        </div>
      )}
      {!IS_LINUX && queue.length > 0 &&
      <div className="notif-enter flex items-center justify-center px-4 py-1 rounded-lg bg-kronos-panel/40 border border-white/5 self-center mt-1 scale-90 opacity-60">
          <span className="text-[9px] font-black text-white uppercase tracking-[0.25em]">
            + {queue.length} {t('toast.more')}
          </span>
        </div>
      }
    </div>);

}

function ToastCard({ toast, onExpire, uiIcon }) {
  const [remaining, setRemaining] = useState(TOAST_MS);
  const [exiting, setExiting] = useState(false);
  const lastTick = useRef(Date.now());

  useEffect(() => {
    if (exiting) return;
    const timer = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTick.current;
      lastTick.current = now;
      setRemaining((prev) => {
        const next = prev - delta;
        if (next <= 0) {
          setExiting(true);
          setTimeout(onExpire, 300);
          return 0;
        }
        return next;
      });
    }, 50);
    lastTick.current = Date.now();
    return () => clearInterval(timer);
  }, [exiting, onExpire]);

  const progress = remaining / TOAST_MS * 100;

  return (
    <div
      className={`flex flex-col gap-1.5 px-3 py-3 rounded-xl transition-all ${IS_LINUX ? 'duration-0' : 'duration-300'} transform ${exiting ? 'notif-exit' : 'notif-enter'}`}
      style={{
        width: '320px',
        background: 'var(--color-panel)',
        border: '1px solid rgba(var(--color-accent-rgb), 0.25)',
        borderLeft: '3px solid var(--color-accent)'
      }}>
      
      <div className="flex gap-3 items-center">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden bg-kronos-accent/15">
          {toast.image && uiIcon(toast.image) ?
          <img src={uiIcon(toast.image)} alt="" className="w-6 h-6 object-contain" /> :
          <Bell size={15} className="text-kronos-accent" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-kronos-accent mb-0.5 truncate">{toast.title}</p>
          <p className="text-[12px] font-semibold leading-tight line-clamp-2 text-kronos-text">{toast.message}</p>
        </div>
      </div>
      <div className="h-1 rounded-full bg-white/10 overflow-hidden mt-1">
        <div
          className="h-full rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(var(--color-accent-rgb),0.5)]"
          style={{
            width: `${progress}%`,
            backgroundColor: 'var(--color-accent)'
          }} />
        
      </div>
    </div>);

}