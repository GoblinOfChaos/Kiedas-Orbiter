import { forwardRef, useCallback, useRef, useState } from 'react';
import PreviewImport from '../../components/PreviewImport';
import PreviewGlobalHeader from './PreviewGlobalHeader';
import PreviewNavigation from './PreviewNavigation';
import '../styles/preview-tokens.css';
import '../styles/preview-shell.css';
import '../styles/preview-components.css';
import '../styles/preview-dashboard.css';
import '../styles/preview-responsive.css';

const PreviewAppShell = forwardRef(function PreviewAppShell({
  activeRouteId,
  onNavigate,
  status,
  uiIcon,
  t,
  sidebarActive,
  sidebarSide,
  children,
}, ref) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerOpenerRef = useRef(null);

  const openDrawer = useCallback((event) => {
    drawerOpenerRef.current = event?.currentTarget || document.activeElement;
    setDrawerOpen(true);
  }, []);
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    requestAnimationFrame(() => drawerOpenerRef.current?.focus());
  }, []);
  const navigate = useCallback((id) => {
    onNavigate(id);
    setDrawerOpen(false);
  }, [onNavigate]);

  return (
    <div
      ref={ref}
      className={`preview-command-center${sidebarActive && sidebarSide === 'right' ? ' flex-row-reverse' : ''}`}
      data-sidebar-mode={sidebarActive ? 'active' : 'inactive'}
      data-sidebar-side={sidebarSide}
    >
      <PreviewNavigation
        activeRouteId={activeRouteId}
        onNavigate={navigate}
        uiIcon={uiIcon}
        t={t}
        drawerOpen={drawerOpen}
        onOpenDrawer={openDrawer}
        onCloseDrawer={closeDrawer}
      />
      <div className="preview-shell-main">
        <PreviewGlobalHeader
          activeRouteId={activeRouteId}
          onNavigate={navigate}
          status={status}
          t={t}
          uiIcon={uiIcon}
          importControl={<PreviewImport />}
        />
        <main className="preview-route-viewport">{children}</main>
      </div>
    </div>
  );
});

export default PreviewAppShell;
