import { useState } from 'react'
import { useUi } from '../contexts/UiContext'

/**
 * Renders an item's icon, falling back to a visible "Image Unavailable"
 * placeholder both when no image URL is known and when a known URL fails to
 * load (e.g. a stale third-party snapshot - a wiki thumbnail cached at
 * package-build time - 404ing for newer content indefinitely). Every item is
 * supposed to have a downloaded image, so a placeholder here means a real
 * data gap: it is deliberately visible rather than a blank box, which reads
 * as intentional empty space and hides the problem.
 *
 * The label renders at every size and is allowed to clip in small icon slots
 * - the `title` carries the full text for those. Callers must give
 * `placeholderClassName` the same dimensions as `className`, or the
 * placeholder sizes itself to its text instead of to the image it replaces.
 *
 * `resolveFallbackSrc(failedSrc)` is an optional second-source retry, tried
 * once before giving up on a URL that loads but 404s. It is a prop rather
 * than a context read on purpose: the map it needs (ExportImages) lives in
 * MonitoringContext, which the overlay windows are NOT mounted inside, so
 * reading it here would crash every overlay that renders an item icon.
 */
/**
 * The "Image Unavailable" box itself, shared with card components that keep
 * their own <img> (their fade-in and multi-source retry chains are not
 * expressible through ItemImage's props) but still must not hide a failed
 * content image silently.
 */
export function ImageUnavailable({ className = '', label }) {
  return (
    <div
      title={label}
      aria-label={label}
      className={`flex items-center justify-center overflow-hidden rounded border border-dashed border-white/15 text-center text-[7px] font-bold uppercase leading-[1.05] tracking-tight text-kronos-dim/70 ${className}`}>
      <span className="px-px">{label}</span>
    </div>
  )
}

export default function ItemImage({ src, alt = '', className = '', placeholderClassName = '', loading = 'lazy', resolveFallbackSrc = null }) {
  const { t } = useUi()
  // If this component instance is reused for a different item (new src prop
  // without a remount), a prior failure must not stick around and hide a
  // perfectly valid new image behind the placeholder forever. This resets
  // during render rather than in an effect: an effect runs after paint, so a
  // cached image's load/error event can fire first and then be clobbered by
  // the reset - the race that pinned mod art at opacity 0.
  const [state, setState] = useState({ key: src, src, failed: false, triedFallback: false })
  if (state.key !== src) {
    setState({ key: src, src, failed: false, triedFallback: false })
  }
  const currentSrc = state.key === src ? state.src : src
  const failed = state.key === src && state.failed

  const handleError = () => {
    setState(prev => {
      if (prev.key !== src) return prev
      if (!prev.triedFallback && resolveFallbackSrc) {
        const next = resolveFallbackSrc(prev.src)
        if (next && next !== prev.src) {
          return { ...prev, src: next, triedFallback: true }
        }
      }
      return { ...prev, failed: true, triedFallback: true }
    })
  }

  if (!currentSrc || failed) {
    return <ImageUnavailable className={placeholderClassName} label={t('ui.image_unavailable')} />
  }

  return <img src={currentSrc} alt={alt} className={className} loading={loading} decoding="async" onError={handleError} />
}
