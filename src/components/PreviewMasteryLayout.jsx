export default function PreviewMasteryLayout({ enabled, children }) {
  if (!enabled) return children;

  return (
    <section
      data-preview-mastery-layout
      aria-label="Mastery overview"
      className="preview-mastery-layout min-w-0"
      style={{ containerType: 'inline-size', containerName: 'preview-mastery' }}
    >
      <style>{`
        .preview-mastery-layout,
        .preview-mastery-layout > div,
        [data-preview-mastery-rank-state] {
          min-width: 0;
        }
        [data-preview-mastery-card]:focus-visible {
          outline: 2px solid rgb(var(--kronos-accent-rgb));
          outline-offset: 2px;
        }
        [data-preview-mastery-grid="items"] {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        [data-preview-mastery-secondary] {
          grid-template-columns: minmax(0, 1fr);
        }
        [data-preview-mastery-rank-state="ready"] > div:first-child > div:first-child {
          flex-wrap: wrap;
          gap: 1.5rem;
        }
        @container preview-mastery (min-width: 520px) {
          [data-preview-mastery-grid="items"] {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @container preview-mastery (min-width: 760px) {
          [data-preview-mastery-grid="items"] {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
          [data-preview-mastery-secondary] {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @container preview-mastery (max-width: 699px) {
          .preview-mastery-layout > div {
            row-gap: 1.25rem;
          }
          [data-preview-mastery-rank-state="ready"] {
            flex-direction: column;
            min-height: 0;
          }
          [data-preview-mastery-rank-state="ready"] > div:first-child {
            padding: 1.25rem;
          }
          [data-preview-mastery-art] {
            width: 100%;
            height: 13rem;
          }
          [data-preview-mastery-rank-state="progress"] {
            padding: 1.25rem;
          }
          [data-preview-mastery-rank-state="progress"] > div:first-child {
            flex-direction: column;
            align-items: flex-start;
          }
          [data-preview-mastery-rank-state="progress"] > div:first-child > div:first-child {
            gap: 1rem;
          }
          [data-preview-mastery-rank-state="progress"] h2 {
            font-size: 1.75rem;
          }
        }
        @media (max-width: 1000px) and (max-height: 540px) {
          [data-preview-mastery-modal] {
            padding: .5rem;
          }
          [data-preview-mastery-modal] > div {
            max-height: calc(100dvh - 1rem);
          }
          [data-preview-mastery-modal] > div > div:first-child {
            padding: 1rem;
            gap: .75rem;
            flex-wrap: wrap;
          }
        }
      `}</style>
      {children}
    </section>
  );
}
