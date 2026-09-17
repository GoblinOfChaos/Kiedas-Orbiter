export default function PreviewRelicPlannerLayout({ enabled, children }) {
  if (!enabled) return children;

  return (
    <section
      data-preview-relic-planner-layout
      aria-label="Relic planning workspace"
      className="preview-relic-planner-layout h-full min-w-0"
      style={{ containerType: 'inline-size', containerName: 'preview-relic-planner' }}
    >
      <style>{`
        .preview-relic-planner-layout,
        .preview-relic-planner-layout > div,
        [data-preview-relic-planner-stats],
        [data-preview-relic-planner-workspace],
        [data-preview-relic-planner-panel],
        [data-preview-relic-planner-heading],
        [data-preview-relic-planner-result] {
          min-width: 0;
        }
        [data-preview-relic-planner-stats] > * {
          min-width: 0;
        }
        [data-preview-relic-planner-stats] > * > div:last-child {
          min-width: 0;
        }
        [data-preview-relic-planner-stats] p {
          overflow-wrap: anywhere;
        }
        [data-preview-relic-planner-workspace] {
          align-items: stretch;
        }
        [data-preview-relic-planner-panel] {
          height: auto;
        }
        [data-preview-relic-planner-heading] {
          gap: .5rem;
          flex-wrap: wrap;
        }
        [data-preview-relic-planner-rail] {
          width: 100%;
          min-width: 0;
          flex-wrap: nowrap;
          overflow-x: auto;
          scrollbar-width: thin;
        }
        [data-preview-relic-planner-rail] > button {
          min-width: max-content;
          flex-shrink: 0;
        }
        [data-preview-relic-planner-actions] {
          min-width: 0;
        }
        [data-preview-relic-planner-actions] button {
          white-space: normal;
        }
        [data-preview-relic-planner-result] {
          align-items: flex-start;
          flex-wrap: wrap;
        }
        [data-preview-relic-planner-result] > div:nth-child(2) {
          flex-basis: 10rem;
        }
        [data-preview-relic-planner-result] > div:nth-child(2) > div:first-child {
          flex-wrap: wrap;
        }
        [data-preview-relic-planner-summary] {
          overflow-wrap: anywhere;
        }
        @container preview-relic-planner (min-width: 600px) {
          [data-preview-relic-planner-stats] {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          [data-preview-relic-planner-workspace] {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.5fr);
          }
          [data-preview-relic-planner-panel] {
            height: clamp(17.5rem, calc(100dvh - 13.5rem), 40rem);
          }
        }
      `}</style>
      {children}
    </section>
  );
}
