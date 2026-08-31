import { useState, useEffect } from 'react'
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
 */
export default function ItemImage({ src, alt = '', className = '', placeholderClassName = '', loading = 'lazy' }) {
  const { t } = useUi()
  const [failed, setFailed] = useState(false)
  // If this component instance is reused for a different item (new src prop
  // without a remount), a prior failure must not stick around and hide a
  // perfectly valid new image behind the placeholder forever.
  useEffect(() => { setFailed(false) }, [src])

  if (!src || failed) {
    const label = t('ui.image_unavailable')
    return (
      <div
        title={label}
        aria-label={alt ? `${alt} — ${label}` : label}
        className={`flex items-center justify-center overflow-hidden rounded border border-dashed border-white/15 text-center text-[7px] font-bold uppercase leading-[1.05] tracking-tight text-kronos-dim/70 ${placeholderClassName}`}>
        <span className="px-px">{label}</span>
      </div>
    )
  }

  return <img src={src} alt={alt} className={className} loading={loading} decoding="async" onError={() => setFailed(true)} />
}
