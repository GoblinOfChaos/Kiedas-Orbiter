/**
 * Custom Markers (LocTags) — in-game player-placed markers imported from inventory.json
 *
 * Coordinate mapping: in-game world (x, z) → 2D map pixel (u, v).
 * Map bounds and reference points are approximate — tune MAP_BOUNDS per map as needed.
 *
 * World coordinate system:
 *   x = east-west  (positive = east)
 *   y = height     (ignored for 2D)
 *   z = north-south (positive = north)
 *
 * Map pixel coordinate system:
 *   u = right   (0 at left edge, WIDTH at right edge)
 *   v = down    (0 at top edge, HEIGHT at bottom edge)
 */

// ── Map pixel dimensions (from stitched images) ──
const MAP_SIZE = {
  poe:     { w: 2560, h: 2560 },
  venus:   { w: 3054, h: 3061 },
  deimos:  { w: 3670, h: 2376 },
  duviri:  { w: 2048, h: 2048 }, // fallback
}

// ── AnchorName patterns → map key ──
function detectMap(anchorName) {
  if (!anchorName) return null
  if (/PoeRemaster|Eidolon|Cetus/i.test(anchorName)) return 'poe'
  if (/VenusLandscape|OrbVallis/i.test(anchorName)) return 'venus'
  if (/InfestedMicroplanet|Cambion|Deimos|Fleshscape/i.test(anchorName)) return 'deimos'
  if (/Duviri/i.test(anchorName)) return 'duviri'
  // Fallback by checking the tag field from the group
  return null
}

// ── Map-specific world bounds (in-game meters) ──
// xMin, xMax, zMin, zMax define the visible map rectangle.
// These are approximate — adjust based on where markers actually land.
const MAP_BOUNDS = {
  poe:    { xMin: -1000, xMax: 1000, zMin: -1000, zMax: 1000 },
  venus:  { xMin: -1000, xMax: 1000, zMin: -1000, zMax: 1000 },
  deimos: { xMin: -1000, xMax: 1000, zMin: -1000, zMax: 1000 },
  duviri: { xMin: -1000, xMax: 1000, zMin: -1000, zMax: 1000 },
}

/**
 * Convert in-game world (x, z) to map fractional coordinates (0..1, 0..1).
 * Maps.jsx uses fractional coords where (0,0) = top-left, (1,1) = bottom-right.
 */
function worldToMapFraction(worldX, worldZ, mapKey) {
  const bounds = MAP_BOUNDS[mapKey]
  if (!bounds) return null

  const fx = (worldX - bounds.xMin) / (bounds.xMax - bounds.xMin)
  const fz = (worldZ - bounds.zMin) / (bounds.zMax - bounds.zMin)
  return {
    x: Math.max(0, Math.min(1, fx)),
    y: Math.max(0, Math.min(1, 1 - fz)), // invert z (north = up on map)
  }
}

// ── Icon mapping ──
const ICON_MAP = {
  'MiniMapEidolonWeaponsmith': 'Star',
  'MiniMapFishingSpot':        'MapPin',
  'MiniMapMiningSpot':         'Diamond',
  'MiniMapConservationSpot':   'Shield',
  'MiniMapRareContainer':      'Star',
  'MiniMapEnemy':              'Skull',
}

function gameIconToIconName(gameIconPath) {
  if (!gameIconPath) return 'MapPin'
  for (const [key, name] of Object.entries(ICON_MAP)) {
    if (gameIconPath.includes(key)) return name
  }
  return 'MapPin'
}

/**
 * Parse raw CustomMarkers from inventory.json into the Maps.jsx config format.
 *
 * @param {Array} customMarkers - raw `CustomMarkers` array from inventory
 * @returns {Object} map from mapKey → array of marker objects for Maps.jsx
 */
export function parseCustomMarkers(customMarkers) {
  if (!Array.isArray(customMarkers)) return {}

  const result = {}
  for (const group of customMarkers) {
    const tag = group.tag || ''
    let mapKey = detectMap(tag)

    for (const markerInfo of (group.markerInfos || [])) {
      const iconPath = markerInfo.icon || ''
      const iconName = gameIconToIconName(iconPath)

      for (const marker of (markerInfo.markers || [])) {
        // Try marker's anchorName as fallback if tag didn't match
        const ak = detectMap(marker.anchorName) || mapKey
        if (!ak) continue
        if (!mapKey) mapKey = ak // latch on first match

        const pos = worldToMapFraction(marker.x, marker.z, ak)
        if (!pos) continue

        if (!result[ak]) result[ak] = []
        result[ak].push({
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 9),
          label: marker.label || markerInfo.label || `In-Game Marker`,
          x: pos.x,
          y: pos.y,
          color: marker.color ? `#${marker.color.toString(16).padStart(6, '0')}` : '#3b82f6',
          icon: iconName,
          notes: `Imported from game${tag ? ` (${tag})` : ''}`,
        })
      }
    }
  }

  return result
}

export { detectMap, MAP_BOUNDS, MAP_SIZE }
