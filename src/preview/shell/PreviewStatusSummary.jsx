import { Database, ShieldCheck } from 'lucide-react';

const TONES = {
  success: 'positive',
  cached: 'warning',
  error: 'danger',
  idle: 'neutral',
};

export default function PreviewStatusSummary({ status }) {
  const syncTone = TONES[status.inventorySync.state] || 'neutral';
  return (
    <div className="preview-global-status" aria-label="Application status">
      <div className={`preview-global-status__item preview-global-status__item--${syncTone}`} title={status.inventorySync.detail}>
        <Database aria-hidden="true" />
        <span>{status.inventorySync.label}</span>
      </div>
      <div className="preview-global-status__item preview-global-status__item--preview" title={status.liveIntegrations.detail}>
        <ShieldCheck aria-hidden="true" />
        <span>{status.liveIntegrations.label}</span>
      </div>
    </div>
  );
}
