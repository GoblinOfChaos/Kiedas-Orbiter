export default function PreviewMarketLayout({ enabled, children }) {
  if (!enabled) return children;

  return (
    <div className="preview-market-shell" data-preview-market-layout>
      {children}
      <style>{`
        .preview-market-shell {
          container-name: preview-market;
          container-type: inline-size;
          min-width: 0;
          min-height: 0;
          height: 100%;
        }

        .preview-market-shell > [data-preview-market-root] {
          min-width: 0;
          min-height: 0;
        }

        .preview-market-shell [data-preview-market-header] {
          padding: 1rem 1.25rem;
        }

        .preview-market-shell [data-preview-market-header-actions],
        .preview-market-shell [data-preview-market-stock-tools] {
          min-width: 0;
          flex-wrap: wrap;
        }

        .preview-market-shell [data-preview-market-readonly] {
          margin-left: 1.25rem;
          margin-right: 1.25rem;
        }

        .preview-market-shell [data-preview-market-main] {
          min-width: 0;
          padding: 1rem 1.25rem;
          gap: 1rem;
        }

        .preview-market-shell [data-preview-market-metrics] {
          grid-template-columns: minmax(0, 1fr);
          gap: 0.75rem;
        }

        .preview-market-shell [data-preview-market-tabs] {
          min-width: 0;
          max-width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          flex-wrap: nowrap;
          scrollbar-width: thin;
        }

        .preview-market-shell [data-preview-market-tabs] > * {
          flex: 0 0 auto;
        }

        /* The rail (stock filter pills) already wraps in its own JSX
           (flex flex-wrap) - forcing nowrap+scroll here fought that intent
           and turned category filters into a hidden horizontal rail, which
           the redesign explicitly disallows for filter controls. */
        .preview-market-shell [data-preview-market-rail] {
          min-width: 0;
          max-width: 100%;
        }

        .preview-market-shell [data-preview-market-toolbar] {
          min-width: 0;
        }

        .preview-market-shell [data-preview-market-table-viewport] {
          min-width: 0;
          max-width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
        }

        .preview-market-shell [data-preview-market-table] {
          min-width: 48rem;
        }

        .preview-market-shell [data-preview-market-stock-grid] {
          grid-template-columns: minmax(0, 1fr);
        }

        .preview-market-shell [data-preview-market-mutation]:disabled,
        .preview-market-shell [data-preview-market-mutation][aria-disabled="true"] {
          cursor: not-allowed;
        }

        @container preview-market (min-width: 36rem) {
          .preview-market-shell [data-preview-market-metrics],
          .preview-market-shell [data-preview-market-stock-grid] {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .preview-market-shell [data-preview-market-toolbar="orders"] {
            flex-direction: row;
            align-items: center;
          }
        }

        @container preview-market (min-width: 52rem) {
          .preview-market-shell [data-preview-market-metrics] {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .preview-market-shell [data-preview-market-stock-grid] {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .preview-market-shell [data-preview-market-toolbar="stock"] {
            flex-direction: row;
            align-items: center;
          }
        }

        @container preview-market (max-width: 35.999rem) {
          .preview-market-shell [data-preview-market-header] {
            flex-direction: column;
            align-items: stretch;
          }

          .preview-market-shell [data-preview-market-header-actions] > * {
            flex: 1 1 auto;
            justify-content: center;
          }

          .preview-market-shell [data-preview-market-stock-tools] {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
