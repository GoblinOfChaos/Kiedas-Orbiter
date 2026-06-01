import { convertFileSrc, invoke } from '@tauri-apps/api/tauri'
import { Box } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'

const CUSTOM = new Set(['Requiem', 'Tome', 'Antivirus', 'Potency', 'Tektolyst'])
const NO_SIDE = new Set(['Amalgam', 'Peculiar'])
const CARD_RATIO = 287 / 409
const CANVAS_W = 287
const CANVAS_H = 409

const TIER_COLORS = {
  'Normal Common': '#CA9A87',
  'Normal Uncommon': '#FFFFFF',
  'Normal Rare': '#FAE7BE',
  'Normal Legendary': '#FFFFFF',
  'Galvanized': '#A8D8EA',
  'Riven': '#AC83D5',
  'Amalgam': '#C0C0C0',
  'Peculiar': '#BDC3C7',
  'Plexus Common': '#CA9A87',
  'Plexus Uncommon': '#FFFFFF',
  'Plexus Rare': '#FAE7BE',
  'Requiem': '#ecdeb4',
  'Tome': '#F5D76E',
  'Archon': '#E67E22',
  'Antivirus': '#2ECC71',
  'Potency': '#C2185B',
  'Tektolyst': '#A0522D',
}

const TEKTOLYST_TEXT_COLORS = {
  'Ubri-Kaneph': '#4FC3F7',
  'Metem-Erun': '#4FC3F7',
  'Empazu-Shol': '#4FC3F7',
  'Metem-Hakh': '#4FC3F7',
  'Lashta-Vak': '#4FC3F7',
  'Esti Vel-Ikha': '#4FC3F7',
  'Sil-Tabol': '#EF5350',
  'Omn-Evi': '#EF5350',
  'Vik-Anam': '#EF5350',
  'Da-Ren': '#EF5350',
  'Kaal-zidi': '#EF5350',
  'Hayan-Dabor': '#E0E0E0',
  'Evir-Ti': '#E0E0E0',
  'Hok-Kaal': '#E0E0E0',
  'Vikla-Safor': '#E0E0E0',
  'Lorun-Tash': '#E0E0E0',
  'Talsek-An': '#E0E0E0',
  'Sey-Taph': '#E0E0E0',
  'Yar Dal': '#E0E0E0',
  'Ulashta-Shol': '#E0E0E0',
}

const TEKTOLYST_COLOR_GROUPS = {
  'Ubri-Kaneph': 'Blue',
  'Metem-Erun': 'Blue',
  'Empazu-Shol': 'Blue',
  'Metem-Hakh': 'Blue',
  'Lashta-Vak': 'Blue',
  'Esti Vel-Ikha': 'Blue',
  'Sil-Tabol': 'Red',
  'Omn-Evi': 'Red',
  'Vik-Anam': 'Red',
  'Da-Ren': 'Red',
  'Kaal-zidi': 'Red',
  'Hayan-Dabor': 'Silver',
  'Evir-Ti': 'Silver',
  'Hok-Kaal': 'Silver',
  'Vikla-Safor': 'Silver',
  'Lorun-Tash': 'Silver',
  'Talsek-An': 'Silver',
  'Sey-Taph': 'Silver',
  'Yar Dal': 'Silver',
  'Ulashta-Shol': 'Silver',
}

const DT_COLORS = {
  DT_ALERT: '#FF4444',
  DT_BLAST: '#FF8800',
  DT_CINEMATIC: '#FFFFFF',
  DT_CLONE: '#88FF88',
  DT_COLD: '#88CCFF',
  DT_CORROSIVE: '#88FF44',
  DT_ELECTRICITY: '#4488FF',
  DT_EXPLOSION: '#FF8800',
  DT_FIRE: '#FF4444',
  DT_FREEZE: '#88CCFF',
  DT_GAS: '#88FF44',
  DT_GHOST: '#FF88FF',
  DT_HEAT: '#FF4444',
  DT_IMPACT: '#CCCCCC',
  DT_LASER: '#FF4444',
  DT_MAGNETIC: '#8844FF',
  DT_POISON: '#44FF44',
  DT_PUNCTURE: '#AA8855',
  DT_RADIATION: '#FFDD44',
  DT_RADIANT: '#FFDD44',
  DT_SENTINEL: '#88CCFF',
  DT_SLASH: '#CC4444',
  DT_TOXIN: '#44FF44',
  DT_VIRAL: '#88FF88',
}

function getSetFileName(modSetPath, modName) {
  if (!modSetPath) return null
  if (SET_FILE_OVERRIDES[modSetPath]) return SET_FILE_OVERRIDES[modSetPath]
  if (modName) {
    const firstWord = modName.split(/\s+/)[0]
    return `${firstWord}Set.png`
  }
  const dirName = modSetPath.split('/').slice(-2, -1)[0]
  return `${dirName}Set.png`
}

const SET_FILE_OVERRIDES = {
  '/Lotus/Upgrades/Mods/Sets/Umbra/UmbraSetMod': 'UmbralSet.png',
  '/Lotus/Upgrades/Mods/Sets/Sacrifice/SacrificeSetMod': 'SacrificialSet.png',
  '/Lotus/Upgrades/Mods/Sets/Nira/NiraSetMod': 'NirasSet.png',
  '/Lotus/Upgrades/Mods/Sets/Boreal/BorealSetMod': 'BorealsSet.png',
  '/Lotus/Upgrades/Mods/Sets/Amar/AmarSetMod': 'AmarsSet.png',
  '/Lotus/Upgrades/Mods/Sets/Amar/AmarsSetMod': 'AmarsSet.png',
}

// Module-level cache for opaque card art — one IPC call per unique path, ever.
const opaqueCache = new Map()

// Fetch a fully-opaque version of the card art image from Rust.
// Sets all pixels to alpha=255 so the full scene (fg + bg) is visible in one layer.
// Results are cached so subsequent renders of the same image are instant.
function useOpaqueCard(iconAbsPath) {
  const [url, setUrl] = useState(iconAbsPath ? opaqueCache.get(iconAbsPath) : null)
  useEffect(() => {
    if (!iconAbsPath) return
    if (opaqueCache.has(iconAbsPath)) { setUrl(opaqueCache.get(iconAbsPath)); return }
    let alive = true
    invoke('invert_alpha_png', { path: iconAbsPath })
      .then(bytes => {
        if (!alive) return
        const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' })
        const blobUrl = URL.createObjectURL(blob)
        opaqueCache.set(iconAbsPath, blobUrl)
        setUrl(blobUrl)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [iconAbsPath])
  return url
}

const SET_RARITY_FILTERS = {
  COMMON: 'sepia(0.6) hue-rotate(-25deg) saturate(1.4) brightness(0.65) contrast(1.2)',
  RARE: 'sepia(0.8) hue-rotate(10deg) saturate(2.5) brightness(1.1)',
}

const POLARITY_FILES = {
  'AP_ATTACK': 'PolarityTriangle.png',
  'AP_DEFENSE': 'PolarityPoint.png',
  'AP_TACTIC': 'PolarityCircle.png',
  'AP_POWER': 'PolarityMark.png',
  'AP_PRECEPT': 'PolarityPrecept.png',
  'AP_FUSION': 'PolarityAura.png',
  'AP_WARD': 'PolarityWard.png',
  'AP_UMBRA': 'PolarityUmbra.png',
  'AP_ANY': 'PolarityUniversal.png',
}

function renderDesc(text, textColor, iconsPath, tagIconMap) {
  if (!text) return null;
  const parts = text.split(/(<[A-Z_]+>)/);
  const elements = [];
  let currentColor = null;
  let currentTag = null;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.startsWith('<') && p.endsWith('>')) {
      const tagName = p.slice(1, -1);
      if (tagName.startsWith('DT_')) {
        currentTag = tagName;
        currentColor = DT_COLORS[tagName] || (tagName.endsWith('_COLOR') ? DT_COLORS[tagName.replace('_COLOR', '')] : null) || textColor;
      } else {
        const iconFile = tagIconMap?.[tagName];
        if (iconFile && iconsPath) {
          elements.push(<img key={elements.length} src={u(iconsPath, '', iconFile)} style={{ width: '11px', height: '11px', display: 'inline', verticalAlign: 'middle' }} alt="" onError={e => e.target.style.display = 'none'} />);
        }
        currentColor = null;
        currentTag = null;
      }
    } else if (p) {
      if (currentColor) {
        const iconFile = currentTag ? (tagIconMap?.[currentTag] || (() => {
          const clean = currentTag.replace(/^DT_/, '').replace(/_COLOR$/, '');
          return clean.charAt(0) + clean.slice(1).toLowerCase() + 'Symbol.png';
        })()) : null;
        const spaceIdx = p.indexOf(' ');
        const word = spaceIdx >= 0 ? p.slice(0, spaceIdx) : p;
        const rest = spaceIdx >= 0 ? p.slice(spaceIdx) : '';
        elements.push(
          <span key={elements.length} style={{ color: currentColor, display: 'inline-flex', alignItems: 'center', gap: '1px' }}>
            {iconFile && iconsPath ? <img src={u(iconsPath, '', iconFile)} style={{ width: '11px', height: '11px', flexShrink: 0 }} alt="" onError={e => e.target.style.display = 'none'} /> : null}
            <span>{word}</span>
          </span>
        );
        if (rest) elements.push(<span key={elements.length + 1000} style={{ color: textColor }}>{rest}</span>);
        currentColor = null;
        currentTag = null;
      } else {
        elements.push(<span key={elements.length} style={{ color: textColor }}>{p}</span>);
      }
    }
  }
  return elements.length ? elements : text;
}

function u(base, folder, file) {
  return base ? convertFileSrc(`${base}/${folder}/${file}`) : null
}

function Img({ src, className, style }) {
  return src ? <img src={src} className={className} style={style} alt="" onError={e => e.target.style.display = 'none'} /> : null
}

function SafeImg({ src, className, style, alt }) {
  const [error, setError] = useState(false)
  if (!src || error) return null
  return <img src={src} className={className} style={style} alt={alt || ''} onError={() => setError(true)} />
}

function RankPips({ modFrame, rank, maxRank, framesPath, pipColorGroup, cardWidth }) {
  const capped = Math.min(maxRank || 0, 10)
  const scale = cardWidth ? cardWidth / 180 : 1
  const s = Math.max(4, Math.round(7 * scale))
  if (!framesPath) return null
  const baseGap = capped <= 3 ? 2 : capped <= 5 ? 1.5 : 1
  const gap = Math.round(baseGap * scale)
  const h = Math.round(14 * scale)
  return (
    <div className="flex items-center justify-center" style={{ gap, height: h }}>
      {Array.from({ length: capped }, (_, i) => {
        const name = i < rank ? (pipColorGroup ? `RankSlotActive${pipColorGroup}` : 'RankSlotActive') : 'RankSlotEmpty'
        const src = u(framesPath, modFrame, `${name}.png`)
        return src ? <img key={i} src={src} style={{ width: s, height: s }} className="object-contain flex-shrink-0" alt="" onError={e => e.target.style.display = 'none'} /> : null
      })}
    </div>
  )
}

function Charges({ modFrame, rank, maxRank, framesPath, cardWidth }) {
  const capped = Math.min(maxRank || 3, 3)
  const available = Math.max(0, capped - rank)
  if (available <= 0) return null
  const scale = cardWidth ? cardWidth / 180 : 1
  const s = Math.round(13 * scale)
  if (!framesPath) return null
  const gap = Math.round(3 * scale)
  const h = Math.round(16 * scale)
  return (
    <div className="flex items-center justify-center" style={{ gap, height: h }}>
      {Array.from({ length: capped }, (_, i) => {
        const active = i < available
        const src = u(framesPath, modFrame, 'Charge.png')
        return src ? <img key={i} src={src} onError={e => e.target.style.display = 'none'} style={{ width: s, height: s, opacity: active ? 1 : 0.25 }} className="object-contain flex-shrink-0" alt="" /> : null
      })}
    </div>
  )
}

export default function ModCard({ mod, framesPath, iconsPath, cardImagesPath, width = 180, exportTextIcons }) {
  const mf = mod.modFrame || 'Normal Common'
  const custom = CUSTOM.has(mf)
  const color = mf === 'Tektolyst' ? (TEKTOLYST_TEXT_COLORS[mod.name] || TIER_COLORS[mf] || '#FFFFFF') : (TIER_COLORS[mf] || '#FFFFFF')
  const tektolystGroup = mf === 'Tektolyst' ? (TEKTOLYST_COLOR_GROUPS[mod.name] || 'Silver') : null
  const cardScale = width / 180

  const tagIconMap = useMemo(() => {
    if (!exportTextIcons) return {};
    const map = {};
    for (const [tag, data] of Object.entries(exportTextIcons)) {
      const path = data?.DIT_AUTO;
      if (path) map[tag] = path.split('/').pop();
    }
    return map;
  }, [exportTextIcons])

  // Card art image from DE game cache — CLI preserves full internal path
  // Prefer mod.icon (internal path from ExportUpgrades), fall back to deriving from mod.image (browse.wf CDN URL)
  const deriveIcon = (src) => {
    if (!src || typeof src !== 'string') return null;
    const prefix = 'https://browse.wf';
    return src.startsWith(prefix) ? src.slice(prefix.length) : null;
  };
  const iconPath = mod.icon || deriveIcon(mod.image);
  const cardImageSrc = iconPath && cardImagesPath
    ? convertFileSrc(`${cardImagesPath}${iconPath}`)
    : null
  const iconAbsPath = iconPath && cardImagesPath && mf !== 'Tektolyst'
    ? `${cardImagesPath}${iconPath}`
    : null
  const opaqueSrc = useOpaqueCard(iconAbsPath) || cardImageSrc

  if (!framesPath) {
    return (
      <div className="rounded-xl border border-white/5 bg-kronos-panel/20 p-3 flex items-center gap-3" style={{ width, minHeight: width * 1.4 }}>
        <div className="w-10 h-10 flex-shrink-0"><Box className="text-kronos-panel w-full h-full" /></div>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate" style={{ fontSize: `${10 * cardScale}px` }}>{mod.name}</p>
        </div>
      </div>
    )
  }

  const f = (file) => u(framesPath, mf, `${file}.png`)
  // Tektolyst uses per-mod full-card images named after the resolved mod name (spaces removed)
  const tektolystBg = mf === 'Tektolyst' && mod.name ? f(mod.name.replace(/\s+/g, '')) : null
  const bg = tektolystBg || f('Background')
  const ft = custom ? null : f('FrameTop')
  const fb = custom ? null : f('FrameBottom')
  const sl = custom || NO_SIDE.has(mf) ? null : f('SideLight')
  const bk = custom && mf !== 'Requiem' && mf !== 'Antivirus' && mf !== 'Potency' ? null : f('RightBacker')
  const lt = custom ? null : f('LowerTab')
  const cl = custom ? null : f('CornerLights')

  const rank = mod.rank ?? 0
  const desc = (() => {
    if (mod.description && mod.description.length > 0) return mod.description;
    if (mod.levelStats && Array.isArray(mod.levelStats)) {
      const max = mod.levelStats[mod.levelStats.length - 1];
      if (max && Array.isArray(max.stats)) return max.stats.join(', ');
    }
    return '';
  })()
  const cat = mod.category || ''
  const displayCompleteLine = mod.max_rank > 0 && rank >= mod.max_rank && (mf === 'Tektolyst' || !custom)
  const completeLine = displayCompleteLine ? u(framesPath, mf, mf === 'Tektolyst' ? `RankCompleteLine${tektolystGroup}.png` : 'RankCompleteLine.png') : null
  const hasDesc = desc && desc.length > 0
  // Anchor text block just above the lower tab (35px from bottom)
  const contentBottom = mf === 'Requiem' ? 80 : mf === 'Antivirus' ? 110 : mf === 'Potency' ? 45 : mf === 'Tektolyst' ? 55 + (hasDesc ? 25 : 0) : 45 + (hasDesc ? 25 : 0)

  return (
    <div className="relative flex-shrink-0 select-none" style={{ width, aspectRatio: String(CARD_RATIO) }}>
      {/* Background */}
      <Img src={bg} className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: 1 }} />

      {/* Content area — icon + title in flex column, anchored to bottom */}
      {mf === 'Antivirus' ? (
        <div className="absolute" style={{
          top: `${55 / CANVAS_H * 100}%`,
          left: `${26 / CANVAS_W * 100}%`,
          right: `${26 / CANVAS_W * 100}%`,
          bottom: 0,
          zIndex: 2
        }}>
          <div className="absolute inset-0 flex items-start justify-center" style={{ bottom: '70px' }}>
            {rank >= mod.max_rank ? (
              <img src={f('Depleted')} className="w-2/5 h-auto object-contain" style={{ marginTop: '20%' }} alt="" onError={e => e.target.style.display = 'none'} />
            ) : cardImageSrc ? (
              <SafeImg src={opaqueSrc} className="w-2/5 h-auto object-contain" style={{ marginTop: '20%' }} />
            ) : null}
          </div>
          <div className="absolute text-center" style={{ top: `${170 / CANVAS_H * 100}%`, left: 0, right: 0, padding: `${4 * cardScale}px ${4 * cardScale}px ${2 * cardScale}px` }}>
            <p className="font-bold leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color, fontSize: `${15 * cardScale}px` }}>
              {mod.name}
            </p>
            {hasDesc && (
              <p className="leading-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'Outfit, sans-serif', color: color + 'CC', fontSize: `${11 * cardScale}px` }}>
                {renderDesc(desc, color + 'CC', iconsPath, tagIconMap)}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="absolute flex flex-col" style={{
          top: `${55 / CANVAS_H * 100}%`,
          left: `${26 / CANVAS_W * 100}%`,
          right: `${26 / CANVAS_W * 100}%`,
          bottom: `${contentBottom / CANVAS_H * 100}%`,
          zIndex: 2
        }}>
          <div className="flex-1 overflow-hidden flex items-start justify-center">
            {rank >= mod.max_rank && (mf === 'Requiem' || mf === 'Potency') ? (
              <img src={f('Depleted')} className="w-full h-full object-contain" alt="" onError={e => e.target.style.display = 'none'} style={mf === 'Potency' ? { transform: 'scale(1.12)' } : undefined} />
            ) : cardImageSrc && mf !== 'Tektolyst' ? (
              mf === 'Requiem' ? (
                <div className="flex items-start justify-center w-full pt-1" style={{ marginTop: '7%' }}>
                  <div style={{ width: '60%', aspectRatio: '1', backgroundColor: '#CC0000', maskImage: `url(${cardImageSrc})`, maskSize: 'contain', maskRepeat: 'no-repeat', WebkitMaskImage: `url(${cardImageSrc})`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat' }} />
                </div>
              ) : mf === 'Potency' ? (
                <div className="w-full h-full overflow-hidden flex items-start justify-center">
                  <SafeImg src={opaqueSrc} className="object-cover flex-shrink-0" style={{ width: '96%' }} />
                </div>
              ) : (
                <SafeImg src={opaqueSrc} className="w-full h-full object-cover" />
              )
            ) : null}
          </div>
          <div className="flex-shrink-0 text-center" style={{ padding: `${4 * cardScale}px ${4 * cardScale}px ${2 * cardScale}px` }}>
            <p className="font-bold leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color, fontSize: `${15 * cardScale}px` }}>
              {mod.name}
            </p>
            {hasDesc && (
              <p className="leading-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'Outfit, sans-serif', color: color + 'CC', fontSize: `${11 * cardScale}px` }}>
                {renderDesc(desc, color + 'CC', iconsPath, tagIconMap)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Decorative frame pieces */}
      {!custom && <>
        <Img src={sl} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />
        <Img src={sl} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3, transform: 'scaleX(-1)' }} />
        <Img src={ft} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />
        <Img src={fb} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />
        <Img src={bk} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />
        <Img src={lt} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />
        <Img src={cl} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />
        <Img src={cl} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3, transform: 'scaleX(-1)' }} />
      </>}
      {/* Set mod frame overlay */}
      {(() => {
        const setFile = mod.modSet ? getSetFileName(mod.modSet, mod.name) : null
        if (!setFile) return null
        const setBgSrc = u(framesPath, 'Sets', setFile)
        const rarityFilter = SET_RARITY_FILTERS[mod.rarity] || null
        return <SafeImg src={setBgSrc} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3, filter: rarityFilter }} />
      })()}
      {/* Polarity icon + drain on right backer */}
      {!custom && mod.polarity && POLARITY_FILES[mod.polarity] && (
        <SafeImg src={u(iconsPath, '', POLARITY_FILES[mod.polarity])} style={{
          position: 'absolute', top: `${69 / CANVAS_H * 100}%`, right: `${30 / CANVAS_W * 100}%`,
          width: `${17 / CANVAS_W * 100}%`, zIndex: 4, pointerEvents: 'none',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))'
        }} />
      )}
      {!custom && mod.baseDrain > 0 && (
        <span className="absolute font-bold pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" style={{
          top: `${72 / CANVAS_H * 100}%`, right: `${50 / CANVAS_W * 100}%`,
          zIndex: 4, color: color, fontFamily: 'Outfit, sans-serif',
          fontSize: `${9 * cardScale}px`, lineHeight: 1, textAlign: 'right'
        }}>
          {mod.baseDrain + rank}
        </span>
      )}
      {/* Duplicates (skip for 0-drain mods like consumed requiems) */}
      {mod.quantity > 1 && (mod.baseDrain ?? 1) !== 0 && bk && (
        <>
          <Img src={bk} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ transform: 'scaleX(-1)', zIndex: 6 }} />
          <span className="absolute font-black pointer-events-none" style={{
            top: `${66.5 / CANVAS_H * 100}%`,
            left: `${34 / CANVAS_W * 100}%`,
            zIndex: 7,
            color: '#FFD700',
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            fontSize: `${9 * cardScale}px`
          }}>
            {mod.quantity}
          </span>
        </>
      )}

      {/* Category on lower tab */}
      {cat && (
        <div className="absolute text-center pointer-events-none" style={{ left: 0, right: 0, bottom: mf === 'Antivirus' ? `${55 / CANVAS_H * 100}%` : mf === 'Potency' ? `${26 / CANVAS_H * 100}%` : mf === 'Tektolyst' ? `${48 / CANVAS_H * 100}%` : `${38 / CANVAS_H * 100}%`, zIndex: 4 }}>
          <p className="font-semibold uppercase tracking-wider drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color: mf === 'Potency' ? '#FFD700' : color + '99', fontSize: `${11 * cardScale}px` }}>
            {cat}
          </p>
        </div>
      )}

      {/* Rank complete line when maxed */}
      <Img src={completeLine} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 4 }} />

      {/* Rank pips */}
      {mod.max_rank > 0 && !custom && (
        <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none" style={{ bottom: '0%', zIndex: 5 }}>
          <RankPips modFrame={mf} rank={rank} maxRank={mod.max_rank} framesPath={framesPath} cardWidth={width} />
        </div>
      )}
      {/* Charges for Requiem, Antivirus, Potency */}
      {mod.max_rank > 0 && custom && (mf === 'Requiem' || mf === 'Antivirus' || mf === 'Potency') && (
        <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none" style={{ bottom: mf === 'Antivirus' ? '20%' : mf === 'Potency' ? '0%' : '13.5%', zIndex: 5 }}>
          <Charges modFrame={mf} rank={rank} maxRank={mod.max_rank} framesPath={framesPath} cardWidth={width} />
        </div>
      )}
      {/* Tektolyst: color overlay covers baked-in dots, then rank pips on top */}
      {mf === 'Tektolyst' && (
        <>
          {tektolystGroup && (
            <Img src={u(framesPath, mf, `${tektolystGroup}.png`)} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 4, objectFit: 'contain' }} />
          )}
          {mod.max_rank > 0 && (
            <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none" style={{ bottom: '2%', zIndex: 5 }}>
              <RankPips modFrame={mf} rank={rank} maxRank={mod.max_rank} framesPath={framesPath} pipColorGroup={tektolystGroup} cardWidth={width} />
            </div>
          )}
        </>
      )}
    </div>
  )
}