export default function PreviewPage({ eyebrow, title, summary, actions, children, className = '' }) {
  return (
    <div className={`preview-page ${className}`.trim()}>
      <div className="preview-page__scroll custom-scrollbar" data-preview-scroll-owner>
        <header className="preview-page__header">
          <div>
            {eyebrow && <span className="preview-page__eyebrow">{eyebrow}</span>}
            <h1>{title}</h1>
            {summary && <p>{summary}</p>}
          </div>
          {actions && <div className="preview-page__actions">{actions}</div>}
        </header>
        <div className="preview-page__content">{children}</div>
      </div>
    </div>
  );
}
