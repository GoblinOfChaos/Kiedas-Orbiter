import { useUi } from '../contexts/UiContext'

export function PreviewSettingsDisabled({ enabled, reason, children }) {
  if (!enabled) return children;

  return (
    <fieldset
      disabled
      aria-label={reason}
      title={reason}
      data-preview-settings-disabled=""
      className="m-0 min-w-0 border-0 p-0 opacity-55"
    >
      {children}
    </fieldset>
  );
}

export default function PreviewSettingsLayout({ enabled, sections, children }) {
  const { t } = useUi()
  if (!enabled) return children;

  return (
    <div className="preview-settings-shell min-w-0" data-preview-settings-shell="">
      <div
        role="status"
        className="mb-3 rounded-xl border border-kronos-accent/25 bg-kronos-accent/10 px-4 py-3 text-xs text-kronos-dim"
      >
        {t('settings.preview_disabled_notice')}
      </div>
      <nav
        aria-label={t('settings.sections_nav_label')}
        className="preview-settings-rail custom-scrollbar sticky top-0 z-20 mb-4 flex max-w-full gap-2 overflow-x-auto rounded-xl border border-white/5 bg-kronos-bg/95 p-2 backdrop-blur"
      >
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#preview-settings-${section.id}`}
            className="shrink-0 rounded-lg border border-white/10 bg-kronos-panel/40 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-kronos-dim transition-colors hover:border-kronos-accent/40 hover:text-kronos-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-kronos-accent"
          >
            {section.label}
          </a>
        ))}
      </nav>
      {children}
      <style>{`
        .preview-settings-shell {
          container-type: inline-size;
        }

        .preview-settings-shell [data-preview-settings-section] {
          min-width: 0;
          scroll-margin-top: 4.75rem;
        }

        .preview-settings-shell [data-preview-settings-disabled] {
          width: 100%;
        }

        .preview-settings-shell [data-preview-settings-disabled] :is(button, input, select) {
          cursor: not-allowed;
        }

        @container (max-width: 44rem) {
          .preview-settings-shell [data-preview-settings-grid="themes"] {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .preview-settings-shell [data-preview-settings-grid="notification-preferences"],
          .preview-settings-shell [data-preview-settings-grid="monitoring"],
          .preview-settings-shell [data-preview-settings-grid="maintenance"] {
            grid-template-columns: minmax(0, 1fr);
          }

          .preview-settings-shell [data-preview-settings-grid="notification-tests"],
          .preview-settings-shell [data-preview-settings-grid="sidebar-width"] {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .preview-settings-shell [data-preview-settings-row="cache-path"],
          .preview-settings-shell [data-preview-settings-row="monitor-auto"],
          .preview-settings-shell [data-preview-settings-row="monitor-manual"],
          .preview-settings-shell [data-preview-settings-row="hotkey"] {
            flex-direction: column;
            align-items: stretch;
          }

          .preview-settings-shell [data-preview-settings-row="monitor-manual"] select {
            width: 100%;
          }
        }

        @container (max-width: 30rem) {
          .preview-settings-shell [data-preview-settings-grid="themes"],
          .preview-settings-shell [data-preview-settings-grid="notification-tests"] {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .preview-settings-shell [data-preview-settings-row="ui-scale"],
          .preview-settings-shell [data-preview-settings-row="sidebar-side"] {
            align-items: stretch;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
