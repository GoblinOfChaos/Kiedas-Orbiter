// Previously reached into Inventory.jsx's control-row markup via positional
// child-index CSS selectors (div:nth-child(2), etc.) to retrofit wrapping and
// scroll behavior it didn't have. Inventory.jsx now wraps its own controls
// (flex-wrap on the search/filter/sort row) and gives the category strip its
// own visible scrollbar directly, so this wrapper only needs to keep the
// resource-stats row's horizontal scroll legible - a real, intentional
// horizontal-scroll case (a row of currency/resource badges), not a stand-in
// for missing wrap behavior elsewhere.
import { useEffect, useRef } from 'react'
import { useUi } from '../contexts/UiContext'

// TEMPORARY DIAGNOSTIC (LIVE-PREVIEW-FINDINGS Error 1): logs the real geometry
// of every horizontal scroll region in/around the Inventory header so the
// "second, immovable bar" can be identified by element instead of guessed.
// Remove once the extra bar is found and fixed.
function describe(el) {
  const label = el.getAttribute('aria-label') || String(el.className || '').toString().slice(0, 48) || el.tagName
  return `${el.tagName.toLowerCase()}[${label}] cw=${el.clientWidth} sw=${el.scrollWidth} range=${Math.max(0, el.scrollWidth - el.clientWidth)}`
}

function reportScrollRegions(root) {
  if (!root) return
  const found = []
  const seen = new Set()
  const consider = (el) => {
    if (!el || seen.has(el)) return
    seen.add(el)
    const cs = getComputedStyle(el)
    if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') found.push(describe(el))
  }
  root.querySelectorAll('*').forEach(consider)
  for (let el = root; el && el !== document.body; el = el.parentElement) consider(el)
  console.log(`[INV-SCROLL] window=${window.innerWidth}x${window.innerHeight} regions=${found.length} :: ${found.join(' || ')}`)
}

export default function PreviewInventoryLayout({ stats, controls }) {
  const { t } = useUi()
  const rootRef = useRef(null)

  useEffect(() => {
    let timer = null
    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(() => reportScrollRegions(rootRef.current), 600)
    }
    schedule()
    window.addEventListener('resize', schedule)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return (
    <section ref={rootRef} aria-label={t('preview.landmark.inventory_controls')} className="min-w-0">
      {stats && (
        // Confirmed live 2026-09-27 via zoomed real screenshots: this is
        // ONE continuous native scrollbar, not two - it visually fragments
        // into disconnected-looking pieces (one movable, one that looks
        // "stuck" and does nothing) wherever the row's vertical divider
        // bars (bg-white/10, in renderHeaderStats) sit on top of it, and
        // which fragment renders solidly flickers between screenshots
        // taken seconds apart. scrollbarWidth: 'thin' has no real spec
        // support in WebKit - WebKitGTK is polyfilling/theming it
        // non-standard, which is exactly the kind of thing prone to this
        // paint/compositing instability (same class of issue as #116's
        // silent paint failures). Removed as a targeted experiment. It
        // was originally added because the *default* scrollbar was
        // invisible on some platforms (see history) - if that reappears,
        // this needs a different visibility mechanism, not just reverting.
        <div className="mb-3 overflow-x-auto pb-2" aria-label={t('preview.landmark.account_resources')}>
          {stats}
        </div>
      )}
      <div className="min-w-0">{controls}</div>
    </section>
  );
}
