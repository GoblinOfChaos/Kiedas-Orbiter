import { ChevronDown, ChevronRight, Menu, Star, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PREVIEW_GROUPED_NAV } from '../navigation';

const STORAGE_KEY = 'preview.navigation.v1';
const EMPTY_STATE = { collapsed: {}, favorites: [] };

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      collapsed: parsed.collapsed && typeof parsed.collapsed === 'object' ? parsed.collapsed : {},
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
    };
  } catch {
    return EMPTY_STATE;
  }
}

function NavIcon({ item, uiIcon }) {
  if (item.lucide) {
    const Icon = item.lucide;
    return <Icon aria-hidden="true" />;
  }
  return <span className="preview-nav__mask" aria-hidden="true" style={{ '--preview-nav-icon': `url(${uiIcon(item.icon)})` }} />;
}

function GroupedNavigation({ activeRouteId, onNavigate, uiIcon, t, state, setState, setStorageError, compact = false }) {
  const persist = (next) => {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStorageError('');
    } catch (error) {
      setStorageError(error?.message || t('preview.nav.storage_error'));
    }
  };

  const toggleFavorite = (id) => {
    const favorites = state.favorites.includes(id)
      ? state.favorites.filter((value) => value !== id)
      : [...state.favorites, id];
    persist({ ...state, favorites });
  };

  if (compact) {
    return <div className="preview-nav__rail-list">{PREVIEW_GROUPED_NAV.flatMap((group) => group.items).map((item) => (
      <button
        type="button"
        key={item.id}
        className={activeRouteId === item.id ? 'is-active' : ''}
        aria-label={t(`nav.${item.id}`) || item.label}
        aria-current={activeRouteId === item.id ? 'page' : undefined}
        title={t(`nav.${item.id}`) || item.label}
        onClick={() => onNavigate(item.id)}
      >
        <NavIcon item={item} uiIcon={uiIcon} />
      </button>
    ))}</div>;
  }

  return <div className="preview-nav__groups">{PREVIEW_GROUPED_NAV.map((group, index) => {
    const collapsed = Boolean(state.collapsed[group.id]);
    return (
      <section key={group.id} aria-labelledby={`preview-nav-group-title-${group.id}`}>
        <button
          type="button"
          className="preview-nav__group-heading"
          aria-expanded={!collapsed}
          aria-controls={`preview-nav-group-${group.id}`}
          onClick={() => persist({ ...state, collapsed: { ...state.collapsed, [group.id]: !collapsed } })}
        >
          <span id={`preview-nav-group-title-${group.id}`}>{t(`preview.nav_group.${group.id.replace(/-/g, '_')}`) || group.label}</span>
          {collapsed ? <ChevronRight aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        </button>
        <div id={`preview-nav-group-${group.id}`} hidden={collapsed}>
          {group.items.map((item) => (
            <div className="preview-nav__row" key={item.id}>
              <button
                type="button"
                data-nav={item.id}
                id={item.id === 'settings' ? 'nav-settings' : undefined}
                className={activeRouteId === item.id ? 'is-active' : ''}
                aria-current={activeRouteId === item.id ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
                title={t(`nav.${item.id}`) || item.label}
              >
                <NavIcon item={item} uiIcon={uiIcon} />
                <span>{t(`nav.${item.id}`) || item.label}</span>
              </button>
              <button
                type="button"
                className={state.favorites.includes(item.id) ? 'is-favorite' : ''}
                aria-label={`${state.favorites.includes(item.id) ? t('preview.nav.unpin') : t('preview.nav.pin')} ${t(`nav.${item.id}`) || item.label}`}
                onClick={() => toggleFavorite(item.id)}
              >
                <Star aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </section>
    );
  })}</div>;
}

export default function PreviewNavigation({ activeRouteId, onNavigate, uiIcon, t, drawerOpen, onOpenDrawer, onCloseDrawer }) {
  const [state, setState] = useState(loadState);
  const [storageError, setStorageError] = useState('');
  const drawerRef = useRef(null);
  const headingId = 'preview-navigation-title';

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const drawer = drawerRef.current;
    const focusable = drawer?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled])') || [];
    focusable[0]?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseDrawer();
        return;
      }
      if (event.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    drawer?.addEventListener('keydown', onKeyDown);
    return () => drawer?.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, onCloseDrawer]);

  const common = useMemo(() => ({ activeRouteId, uiIcon, t, state, setState, setStorageError }), [activeRouteId, uiIcon, t, state]);
  const navigate = (id) => { onNavigate(id); onCloseDrawer(); };

  return (
    <>
      <nav data-shell-nav-primary aria-labelledby={headingId} className="preview-nav preview-nav--expanded">
        <div className="preview-nav__brand">
          <img src={uiIcon('IconKieda.png')} alt="" />
          <span><strong id={headingId}>Kieda's<br />Orbiter</strong><small>{t('preview.nav.brand_tagline')}</small></span>
        </div>
        <GroupedNavigation {...common} onNavigate={onNavigate} />
        {storageError && <p className="preview-nav__error" role="alert">{storageError}</p>}
        <div className="preview-nav__profile"><span>KO</span><p><strong>{t('preview.status.preview')}</strong><small>{t('preview.status.isolated_profile')}</small></p></div>
      </nav>

      <nav aria-label={t('preview.nav.compact_navigation')} className="preview-nav preview-nav--rail">
        <div className="preview-nav__rail-brand"><img src={uiIcon('IconKieda.png')} alt="Kieda's Orbiter" /></div>
        <button type="button" className="preview-nav__menu" aria-label={t('preview.shell.menu')} aria-expanded={drawerOpen} onClick={onOpenDrawer}><Menu aria-hidden="true" /></button>
        <GroupedNavigation {...common} onNavigate={onNavigate} compact />
      </nav>

      {drawerOpen && (
        <div className="preview-nav-drawer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCloseDrawer(); }}>
          <nav ref={drawerRef} className="preview-nav-drawer" aria-label={t('preview.nav.main_navigation')}>
            <header><strong>{t('preview.nav.navigation_heading')}</strong><button type="button" onClick={onCloseDrawer} aria-label={t('preview.shell.close_navigation')}><X aria-hidden="true" /></button></header>
            <GroupedNavigation {...common} onNavigate={navigate} />
            {storageError && <p className="preview-nav__error" role="alert">{storageError}</p>}
          </nav>
        </div>
      )}
    </>
  );
}
