// Previously forced the toolbar into a single-column grid and the sort/
// filter/category rows into `flex-wrap: nowrap` + horizontal scroll via
// attribute-selector CSS overrides - actively fighting the JSX's own
// `flex-wrap` class rather than complementing it, so Preview scrolled
// horizontally where Stable simply wrapped. The JSX in Mods.jsx already
// wraps correctly on its own and the category navigator sidebar now
// replaces the horizontal categories row at wide widths, so no override is
// needed here any more.
import { useUi } from '../contexts/UiContext'

export default function PreviewModsLayout({ enabled, children }) {
  const { t } = useUi()
  if (!enabled) return children;
  return (
    <section aria-label={t('preview.landmark.mods')} className="min-w-0 min-h-0 h-full flex flex-col flex-1">
      {children}
    </section>
  );
}
