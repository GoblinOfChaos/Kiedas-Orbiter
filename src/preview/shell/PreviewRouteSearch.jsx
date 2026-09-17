import { Search, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { PREVIEW_GROUPED_NAV, routeSearchText } from '../navigation';

export default function PreviewRouteSearch({ activeRouteId, onNavigate, t, uiIcon }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef(null);
  const normalized = query.trim().toLocaleLowerCase();
  const groups = useMemo(() => new Map(PREVIEW_GROUPED_NAV.map((group) => [group.id, group.label])), []);
  const results = useMemo(() => {
    if (!normalized) return [];
    return PREVIEW_GROUPED_NAV.flatMap((group) => group.items).filter((item) => {
      const label = t(`nav.${item.id}`) || item.label;
      return routeSearchText(item, label, groups.get(item.groupId)).includes(normalized);
    });
  }, [groups, normalized, t]);

  const choose = (item) => {
    onNavigate(item.id);
    setQuery('');
    setOpen(false);
    setHighlighted(0);
    inputRef.current?.focus();
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      setHighlighted(0);
      return;
    }
    if (!open || results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((value) => (value + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((value) => (value - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(results[highlighted] || results[0]);
    }
  };

  const listboxId = 'preview-route-search-results';
  return (
    <div className="preview-route-search">
      <Search aria-hidden="true" className="preview-route-search__icon" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        placeholder={t('preview.shell.search_placeholder')}
        aria-label={t('preview.shell.search_placeholder')}
        aria-expanded={open && normalized.length > 0}
        aria-controls={listboxId}
        aria-activedescendant={open && results.length ? `preview-search-result-${results[highlighted]?.id}` : undefined}
        role="combobox"
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setHighlighted(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {query && (
        <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); setHighlighted(0); inputRef.current?.focus(); }}>
          <X aria-hidden="true" />
        </button>
      )}
      {open && normalized && (
        <div id={listboxId} className="preview-route-search__results" role="listbox" aria-label={t('preview.shell.search_results')}>
          {results.length ? results.map((item, index) => {
            const Icon = item.lucide;
            return (
              <button
                type="button"
                role="option"
                aria-selected={index === highlighted}
                id={`preview-search-result-${item.id}`}
                key={item.id}
                className={index === highlighted ? 'is-highlighted' : ''}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => choose(item)}
              >
                {Icon ? <Icon aria-hidden="true" /> : <span className="preview-route-search__asset" aria-hidden="true" style={{ '--preview-search-icon': `url(${uiIcon(item.icon)})` }} />}
                <span>
                  <strong>{t(`nav.${item.id}`) || item.label}</strong>
                  <small>{groups.get(item.groupId)}</small>
                </span>
                {item.id === activeRouteId && <small>Current</small>}
              </button>
            );
          }) : <p role="status">{t('preview.shell.search_no_results')}</p>}
        </div>
      )}
    </div>
  );
}
