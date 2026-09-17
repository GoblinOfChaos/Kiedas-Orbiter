export default function PreviewRelicsLayout({ enabled, children }) {
  if (!enabled) return children;

  return (
    <section
      data-preview-relics-layout
      aria-label="Relic collection"
      className="preview-relics-layout h-full min-w-0"
      style={{ containerType: 'inline-size', containerName: 'preview-relics' }}
    >
      <style>{`
        .preview-relics-layout,
        .preview-relics-layout > div,
        [data-preview-relics-header],
        [data-preview-relics-primary-controls],
        [data-preview-relics-secondary-controls],
        [data-preview-relics-rail] {
          min-width: 0;
        }
        [data-preview-relics-primary-controls] {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          align-items: stretch;
          gap: .75rem;
        }
        [data-preview-relics-search] {
          min-width: 0;
        }
        [data-preview-relics-ownership],
        [data-preview-relics-squad],
        [data-preview-relics-target] {
          width: 100%;
          height: auto;
          min-height: 42px;
          overflow-x: auto;
          scrollbar-width: thin;
        }
        [data-preview-relics-secondary-controls] {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          align-items: start;
          gap: .75rem;
        }
        [data-preview-relics-rail] {
          width: 100%;
          flex-wrap: nowrap;
          overflow-x: auto;
          scrollbar-width: thin;
        }
        [data-preview-relics-rail] > span {
          position: sticky;
          left: 0;
          z-index: 1;
          flex-shrink: 0;
          align-self: stretch;
          display: flex;
          align-items: center;
          background: var(--kronos-bg);
        }
        .preview-relics-tabs,
        [data-preview-relics-rail] > div {
          width: max-content;
          flex-shrink: 0;
          flex-wrap: nowrap;
        }
        .preview-relics-tabs > button,
        [data-preview-relics-rail] button {
          flex-shrink: 0;
        }
        [data-preview-relics-traces] {
          width: max-content;
          max-width: 100%;
          justify-self: end;
          margin-left: 0;
        }
        @container preview-relics (min-width: 760px) {
          [data-preview-relics-primary-controls] {
            grid-template-columns: minmax(14rem, 1fr) auto auto auto;
            align-items: center;
          }
          [data-preview-relics-ownership],
          [data-preview-relics-squad],
          [data-preview-relics-target] {
            width: max-content;
          }
          [data-preview-relics-secondary-controls] {
            grid-template-columns: minmax(0, 1fr) auto;
          }
          [data-preview-relics-rail] {
            grid-column: 1 / -1;
          }
          [data-preview-relics-traces] {
            grid-column: 2;
          }
        }
      `}</style>
      {children}
    </section>
  );
}
