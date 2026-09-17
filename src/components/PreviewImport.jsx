import { useState, useRef, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
export default function PreviewImport() {
  const dialog = useRef(null);
  const opener = useRef(null);
  const [visible, setVisible] = useState(false);
  const [source, setSource] = useState('');
  const [categories, setCategories] = useState(['inventory', 'notes', 'maps']);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  busyRef.current = busy;
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!visible) return;
    function handleKey(event) {
      if (event.key === 'Escape' && !busyRef.current) { event.preventDefault(); setVisible(false); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialog.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]') || []);
      if (!controls.length) { event.preventDefault(); return; }
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); opener.current?.focus(); };
  }, [visible]);
  async function browse() {
    try { const path = await open({ directory: true, multiple: false, title: 'Choose the source data/user folder' }); if (path) setSource(path); }
    catch (error) { setMessage(String(error)); }
  }
  async function importCopy() {
    setBusy(true); setMessage('');
    try {
      const result = await invoke('import_preview_profile', { source, categories, replace });
      setMessage(result); setDone(true);
    } catch (error) { setMessage(String(error)); }
    finally { setBusy(false); }
  }
  return <div className="p-2 border-t border-white/10">
    <button ref={opener} onClick={() => setVisible(true)} className="w-full rounded border border-kronos-accent/40 text-kronos-accent text-sm py-2">Import a profile copy</button>
    {visible && <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4">
      <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="preview-import-title" className="bg-kronos-panel border border-white/20 rounded-xl p-5 max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto text-kronos-text">
        <h2 id="preview-import-title" className="font-semibold text-lg">Import into Preview</h2>
        <p className="text-sm text-kronos-dim my-3">Copies selected content from a data/user folder. Credentials and live integration settings are excluded. The source is never changed.</p>
        <button autoFocus disabled={busy || done} onClick={browse} className="border rounded p-2 text-sm">Choose source folder</button>
        <p className="text-xs my-2 break-all">{source || 'No folder selected'}</p>
        <fieldset disabled={busy || done} className="space-y-2 my-3">
          {['inventory', 'notes', 'maps', 'preferences', 'history', 'checklist'].map(name => <label key={name} className="flex gap-2 text-sm">
            <input type="checkbox" checked={categories.includes(name)} onChange={e => setCategories(e.target.checked ? [...categories, name] : categories.filter(x => x !== name))} />{name}
          </label>)}
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} />Replace selected existing Preview files, retaining a backup</label>
        </fieldset>
        <p className="text-xs text-kronos-dim">Checklist requires an explicit checklist-export.json file; browser storage is never read from the stable app.</p>
        <p role="status" className="text-sm my-3 break-words">{message}</p>
        <div className="flex justify-end gap-3">
          <button disabled={busy} onClick={() => setVisible(false)} className="border rounded px-3 py-2">Close</button>
          {done ? <button onClick={() => window.location.reload()} className="bg-kronos-accent text-black rounded px-3 py-2">Reload Preview</button> : <button disabled={busy || !source || !categories.length} onClick={importCopy} className="bg-kronos-accent text-black rounded px-3 py-2 disabled:opacity-40">{busy ? 'Copying…' : 'Import selected'}</button>}
        </div>
      </section>
    </div>}
  </div>;
}
