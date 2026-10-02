// Previously reached into Inventory.jsx's control-row markup via positional
// child-index CSS selectors (div:nth-child(2), etc.) to retrofit wrapping and
// scroll behavior it didn't have. Inventory.jsx now wraps its own controls
// (flex-wrap on the search/filter/sort row) and gives the category strip its
// own visible scrollbar directly, so this wrapper only needs to keep the
// resource-stats row's horizontal scroll legible - a real, intentional
// horizontal-scroll case (a row of currency/resource badges), not a stand-in
// for missing wrap behavior elsewhere.
//
// The "second, immovable bar" this file used to log diagnostics for was the
// `scrollbar-width: thin` style below: WebKitGTK draws elements styled with
// the standard scrollbar-color/scrollbar-width properties as a native
// overlay "above everything else" once GTK_OVERLAY_SCROLLING=0 (see
// src-tauri/src/main.rs), ignoring the app's own ::-webkit-scrollbar CSS.
// Fixed by dropping the inline style and using the app's existing themed
// `custom-scrollbar` class (src/index.css) instead, which only uses
// ::-webkit-scrollbar and is unaffected by that setting.
import { useUi } from '../contexts/UiContext'

export default function PreviewInventoryLayout({ stats, controls }) {
  const { t } = useUi()

  return (
    <section aria-label={t('preview.landmark.inventory_controls')} className="min-w-0">
      {stats && (
        <div className="mb-3 overflow-x-auto custom-scrollbar" aria-label={t('preview.landmark.account_resources')}>
          {stats}
        </div>
      )}
      <div className="min-w-0">{controls}</div>
    </section>
  );
}
