import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

const ICONS = {
  loading: Loader2,
  empty: Inbox,
  unavailable: AlertCircle,
  error: AlertCircle,
};

export default function PreviewDataState({ state = 'empty', title, detail, action, compact = false }) {
  const Icon = ICONS[state] || AlertCircle;
  return (
    <div className={`preview-data-state preview-data-state--${state}${compact ? ' preview-data-state--compact' : ''}`} role={state === 'error' ? 'alert' : 'status'}>
      <Icon aria-hidden="true" className={state === 'loading' ? 'preview-spin' : ''} />
      <div>
        <strong>{title}</strong>
        {detail && <p>{detail}</p>}
      </div>
      {action}
    </div>
  );
}
