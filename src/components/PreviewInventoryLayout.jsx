// Previously reached into Inventory.jsx's control-row markup via positional
// child-index CSS selectors (div:nth-child(2), etc.) to retrofit wrapping and
// scroll behavior it didn't have. Inventory.jsx now wraps its own controls
// (flex-wrap on the search/filter/sort row) and gives the category strip its
// own visible scrollbar directly, so this wrapper only needs to keep the
// resource-stats row's horizontal scroll legible - a real, intentional
// horizontal-scroll case (a row of currency/resource badges), not a stand-in
// for missing wrap behavior elsewhere.
import { useUi } from '../contexts/UiContext'

export default function PreviewInventoryLayout({ stats, controls }) {
  const { t } = useUi()
  return (
    <section aria-label={t('preview.landmark.inventory_controls')} className="min-w-0">
      {stats && (
        <div className="mb-3 overflow-x-auto" style={{ scrollbarWidth: 'thin' }} aria-label={t('preview.landmark.account_resources')}>
          {stats}
        </div>
      )}
      <div className="min-w-0">{controls}</div>
    </section>
  );
}
