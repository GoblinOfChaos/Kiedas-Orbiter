import { isValidElement, useRef } from 'react';

const SECTIONS = [
  { id: 'now', title: 'Now', cards: ['timers', 'alerts', 'arb', 'inf', 'fiss', 'inv'] },
  { id: 'activities', title: 'Activities & rotations', cards: ['bounty', 'nightwave', 'sortie', 'hunt', 'arch', 'desc', 'circuit', '1999'] },
  { id: 'news', title: 'News & offers', cards: ['baro', 'event', 'deal', 'sales', 'news'] },
];
const WIDE_CARDS = new Set(['bounty', 'nightwave', 'fiss', 'arch', '1999']);

export default function PreviewDashboardLayout({ cards, onCustomize }) {
  const root = useRef(null);
  const sections = SECTIONS.map(section => ({
    ...section,
    cards: section.cards.filter(id => isValidElement(cards[id])),
  })).filter(section => section.cards.length);

  function goToSection(event, id) {
    const heading = root.current?.querySelector(`#preview-dashboard-${id}`);
    if (!heading) return;
    event.preventDefault();
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: 'start', behavior: 'auto' });
  }

  return (
    <div ref={root} className="preview-dashboard min-w-0 pb-4" style={{ containerType: 'inline-size', containerName: 'preview-dashboard' }}>
      <style>{`
        .preview-dashboard-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; }
        .preview-dashboard-slot { min-width: 0; }
        @container preview-dashboard (min-width: 740px) {
          .preview-dashboard-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .preview-dashboard-wide { grid-column: 1 / -1; }
        }
      `}</style>
      {sections.length ? (
        <>
          <nav aria-label="Dashboard sections" className="flex flex-wrap gap-2 mb-6">
            {sections.map(section => (
              <a key={section.id} href={`#preview-dashboard-${section.id}`}
                onClick={event => goToSection(event, section.id)}
                className="rounded-lg border border-kronos-accent/20 px-3 py-2 text-xs font-bold text-kronos-text hover:bg-kronos-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-kronos-accent">
                {section.title}
              </a>
            ))}
          </nav>
          {sections.map(section => (
            <section key={section.id} aria-labelledby={`preview-dashboard-${section.id}`} className="mb-6 last:mb-0">
              <h2 id={`preview-dashboard-${section.id}`} tabIndex={-1}
                className="mb-3 text-sm font-bold text-kronos-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-kronos-accent">
                {section.title}
              </h2>
              <div className="preview-dashboard-grid">
                {section.cards.map(id => (
                  <div key={id} data-dashboard-card={id}
                    className={`preview-dashboard-slot${WIDE_CARDS.has(id) ? ' preview-dashboard-wide' : ''}`}>
                    {cards[id]}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      ) : (
        <div className="rounded-xl border border-kronos-accent/20 p-6 text-sm text-kronos-dim">
          <p role="status">No cards to display. Choose which Dashboard cards to show.</p>
          <button onClick={onCustomize} className="mt-4 rounded-lg border border-kronos-accent/30 px-3 py-2 font-bold text-kronos-text hover:bg-kronos-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-kronos-accent">
            Choose visible cards
          </button>
        </div>
      )}
    </div>
  );
}
