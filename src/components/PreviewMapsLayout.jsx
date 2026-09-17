export default function PreviewMapsLayout({ enabled, children }) {
  if (!enabled) return children;

  return (
    <div className="preview-maps-shell absolute inset-0 min-h-0 min-w-0" data-preview-maps-shell="">
      {children}
      <style>{`
        .preview-maps-shell {
          container-type: size;
        }

        .preview-maps-shell [data-preview-maps-body],
        .preview-maps-shell [data-preview-maps-canvas-column],
        .preview-maps-shell [data-preview-maps-canvas],
        .preview-maps-shell [data-preview-maps-viewport] {
          min-height: 0;
          min-width: 0;
        }

        .preview-maps-shell [data-preview-maps-config-panel] {
          max-height: 100% !important;
        }

        .preview-maps-shell [data-preview-maps-tabs] > :first-child {
          flex-wrap: nowrap;
        }

        @container (max-width: 46rem) {
          .preview-maps-shell [data-preview-maps-body] {
            gap: 0;
            padding-left: 0.75rem;
            padding-right: 0.75rem;
            padding-bottom: 0.75rem;
            position: relative;
          }

          .preview-maps-shell [data-preview-maps-tabs] {
            left: 0.75rem;
            right: 0.75rem;
            top: 3.5rem;
            max-width: none;
            overflow-x: auto;
            padding-bottom: 0.25rem;
          }

          .preview-maps-shell [data-preview-maps-tabs] > :first-child {
            flex-shrink: 0;
          }

          .preview-maps-shell [data-preview-maps-utilities] {
            right: 0.75rem;
            top: 0.75rem;
          }

          .preview-maps-shell [data-preview-maps-add-notice] {
            left: 0.75rem;
            right: 0.75rem;
            top: 7rem;
            max-width: calc(100% - 1.5rem);
            transform: none;
            flex-wrap: wrap;
          }

          .preview-maps-shell [data-preview-maps-reset] {
            bottom: 0.75rem;
            right: 0.75rem;
          }

          .preview-maps-shell [data-preview-maps-config-panel] {
            bottom: 0.75rem;
            max-height: none !important;
            position: absolute;
            right: 0.75rem;
            top: 0.75rem;
            width: min(20rem, calc(100% - 1.5rem));
            z-index: 30;
          }

          .preview-maps-shell [data-preview-maps-marker-editor] {
            bottom: 0.75rem;
            left: 0.75rem;
            max-height: calc(100% - 8rem);
            overflow-y: auto;
            right: 0.75rem;
            top: 7rem;
            width: auto;
          }
        }

        @container (max-height: 28rem) {
          .preview-maps-shell [data-preview-maps-config-panel] {
            bottom: 0.5rem;
            top: 0.5rem;
          }

          .preview-maps-shell [data-preview-maps-marker-editor] {
            bottom: 0.5rem;
            max-height: calc(100% - 7.5rem);
          }
        }
      `}</style>
    </div>
  );
}
