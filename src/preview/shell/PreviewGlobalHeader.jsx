import { MoreVertical, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import PreviewRouteSearch from './PreviewRouteSearch';
import PreviewStatusSummary from './PreviewStatusSummary';

export default function PreviewGlobalHeader({ activeRouteId, onNavigate, status, t, uiIcon, importControl }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        menuRef.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <header className="preview-global-header">
      <PreviewRouteSearch activeRouteId={activeRouteId} onNavigate={onNavigate} t={t} uiIcon={uiIcon} />
      <PreviewStatusSummary status={status} />
      <span className="preview-global-header__profile">{status.profile.label}<small>{status.profile.detail}</small></span>
      <div ref={menuRef} className="preview-global-header__more">
        <button type="button" aria-label={t('preview.shell.more_actions')} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? <X aria-hidden="true" /> : <MoreVertical aria-hidden="true" />}
        </button>
        {open && <div className="preview-global-header__menu">{importControl}</div>}
      </div>
    </header>
  );
}
