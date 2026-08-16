import { useState } from 'react'

/**
 * Renders an item's icon, falling back to a placeholder both when no image
 * URL is known and when a known URL fails to load (e.g. a stale third-party
 * snapshot - a wiki thumbnail cached at package-build time - 404ing for
 * newer content indefinitely). Without this, onError just hides a broken
 * <img> and leaves a blank gap instead of the placeholder every other
 * unresolved item already shows.
 */
export default function ItemImage({ src, alt = '', className = '', placeholderClassName = '', loading = 'lazy' }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <div className={placeholderClassName} />
  return <img src={src} alt={alt} className={className} loading={loading} decoding="async" onError={() => setFailed(true)} />
}
