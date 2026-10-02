import { useUi } from '../contexts/UiContext'

export default function PreviewRivensLayout({ enabled, children }) {
  const { t } = useUi()
  if (!enabled) return children;

  return (
    <section
      data-preview-rivens-layout
      aria-label={t('preview.landmark.rivens')}
      className="preview-rivens-layout h-full min-w-0"
      style={{ containerType: 'inline-size', containerName: 'preview-rivens' }}
    >
      <style>{`
        .preview-rivens-layout,
        .preview-rivens-layout > div,
        [data-preview-rivens-header],
        [data-preview-rivens-primary-controls],
        [data-preview-rivens-types-row],
        [data-preview-rivens-grid] {
          min-width: 0;
        }
        [data-preview-rivens-primary-controls] {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          align-items: stretch;
          gap: .75rem;
        }
        [data-preview-rivens-search] {
          min-width: 0;
        }
        [data-preview-rivens-state],
        [data-preview-rivens-sort] {
          width: 100%;
          height: auto;
          min-height: 42px;
          overflow-x: auto;
        }
        /* scrollbar-width/-color removed on purpose - WebKitGTK draws
           elements styled with those standard properties as a native
           overlay bar above everything once GTK_OVERLAY_SCROLLING=0
           (see src-tauri/src/main.rs), ignoring ::-webkit-scrollbar CSS. */
        [data-preview-rivens-state]::-webkit-scrollbar,
        [data-preview-rivens-sort]::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }
        [data-preview-rivens-state]::-webkit-scrollbar-track,
        [data-preview-rivens-sort]::-webkit-scrollbar-track {
          background: transparent;
        }
        [data-preview-rivens-state]::-webkit-scrollbar-thumb,
        [data-preview-rivens-sort]::-webkit-scrollbar-thumb {
          background: rgba(var(--color-accent-rgb), 0.35);
          border-radius: 10px;
        }
        [data-preview-rivens-state] > div,
        [data-preview-rivens-sort] > div {
          width: max-content;
          min-width: 100%;
        }
        [data-preview-rivens-types-row] {
          width: 100%;
        }
        .preview-rivens-types {
          width: 100%;
          min-width: 0;
          flex-wrap: nowrap;
          overflow-x: auto;
        }
        .preview-rivens-types::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }
        .preview-rivens-types::-webkit-scrollbar-track {
          background: transparent;
        }
        .preview-rivens-types::-webkit-scrollbar-thumb {
          background: rgba(var(--color-accent-rgb), 0.35);
          border-radius: 10px;
        }
        .preview-rivens-types > button {
          flex-shrink: 0;
        }
        [data-preview-rivens-grid] {
          gap: clamp(1.25rem, 4cqi, 3.125rem);
        }
        @container preview-rivens (min-width: 760px) {
          [data-preview-rivens-primary-controls] {
            grid-template-columns: minmax(14rem, 1fr) auto auto;
            align-items: center;
          }
          [data-preview-rivens-state],
          [data-preview-rivens-sort] {
            width: max-content;
          }
        }
      `}</style>
      {children}
    </section>
  );
}
