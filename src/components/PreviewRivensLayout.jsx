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
          flex-wrap: nowrap;
          min-width: 0;
        }
        [data-preview-rivens-state] > svg,
        [data-preview-rivens-sort] > svg {
          flex: 0 0 auto;
          align-self: flex-start;
          margin-top: .25rem;
        }
        [data-preview-rivens-state] > div,
        [data-preview-rivens-sort] > div {
          flex: 1 1 0;
          min-width: 0;
          flex-wrap: wrap;
        }
        [data-preview-rivens-types-row] {
          width: 100%;
        }
        .preview-rivens-types {
          width: 100%;
          min-width: 0;
          flex-wrap: wrap;
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
            width: 100%;
          }
        }
      `}</style>
      {children}
    </section>
  );
}
