// Previously forced the toolbar into a single-column grid and the 15-kind
// category Tabs strip into `flex-wrap: nowrap` + horizontal scroll via
// attribute/class selector overrides - creating exactly the "hidden
// horizontal rail" defect the master plan calls out for Cosmetics ("category
// controls may wrap or move into a menu, but may not become a hidden
// horizontal rail"). A category navigator sidebar now replaces the kind Tabs
// at wide widths; the toolbar and remaining Tabs wrap on their own via the
// existing `flex-wrap` classes already in Cosmetics.jsx's JSX.
export default function PreviewCosmeticsLayout({ enabled, children }) {
  if (!enabled) return children;
  return (
    <section aria-label="Cosmetics collection" className="min-w-0 min-h-0 h-full flex flex-col flex-1">
      {children}
    </section>
  );
}
