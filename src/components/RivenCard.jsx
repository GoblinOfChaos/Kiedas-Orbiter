import { convertFileSrc } from '@tauri-apps/api/core'

const CARD_RATIO = 290 / 409
const CANVAS_W = 290
const CANVAS_H = 409

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

function u(base, folder, file) {
  return base ? convertFileSrc(`${base}/${folder}/${file}`) : null
}

function SafeImg({ src, className, style, onError }) {
  if (!src) return null
  return <img src={src} className={className} style={{ ...style, opacity: 0, transition: 'opacity 0.15s' }} alt="" loading="lazy" onLoad={e => e.target.style.opacity = 1} onError={e => { e.target.style.display = 'none'; onError?.() }} />
}

export default function RivenCard({ riven, framesPath, iconsPath, width = 180 }) {
  const cardScale = width / 180
  const mf = 'Riven'

  const f = (file) => u(framesPath, mf, file)
  const bg = f('Background.png') || f('SilverBackground.png')
  const ft = f('FrameTop.png') || f('RivenFrameTop.png')
  const fb = f('FrameBottom.png')
  const sl = f('SideLight.png')
  const bk = f('RightBacker.png')
  const lt = f('LowerTab.png')
  const cl = f('CornerLights.png')

  const rank = riven.rank ?? 0
  const maxRank = 8
  const baseDrain = 18
  const currentDrain = 10 + rank

  const statsText = riven.stats?.map(s => {
    const sign = s.positive ? '+' : '-'
    const pct = s.isPercent ? '%' : ''
    const val = s.positive ? s.value : s.value.replace(/^-/, '')
    return `${sign}${val}${pct} ${s.tag}`
  }).join('\n') || ''

  const polarity = riven.polarity || null
  const weaponImg = riven.image || 'https://browse.wf/Lotus/Interface/Cards/Images/OmegaModIndistinctUnveiled.png'

  return (
    <div className="relative flex-shrink-0 select-none" style={{ width, aspectRatio: String(CARD_RATIO) }}>
      {bg && <SafeImg src={bg} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 1 }} />}

      {sl && <><SafeImg src={sl} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />
        <SafeImg src={sl} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3, transform: 'scaleX(-1)' }} /></>}
      {ft && <SafeImg src={ft} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />}
      {fb && <SafeImg src={fb} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />}
      {!riven.veiled && !riven.challenge && bk && <SafeImg src={bk} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />}
      {lt && <SafeImg src={lt} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />}
      {cl && <><SafeImg src={cl} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />
        <SafeImg src={cl} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3, transform: 'scaleX(-1)' }} /></>}

      {polarity && POLARITY_FILES[polarity] && (
        <SafeImg src={u(iconsPath, '', POLARITY_FILES[polarity])} style={{
          position: 'absolute', top: `${69 / CANVAS_H * 100}%`, right: `${30 / CANVAS_W * 100}%`,
          width: `${19 / CANVAS_W * 100}%`, zIndex: 4, pointerEvents: 'none',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))'
        }} />
      )}

      {!riven.veiled && (
        <span className="absolute font-bold pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" style={{
          top: `${70 / CANVAS_H * 100}%`, right: `${47 / CANVAS_W * 100}%`,
          zIndex: 4, color: '#AC83D5', fontFamily: 'Outfit, sans-serif',
          fontSize: `${11 * cardScale}px`, lineHeight: 1, textAlign: 'right'
        }}>
          {currentDrain}
        </span>
      )}

      <div className="absolute flex flex-col" style={{
        top: `${55 / CANVAS_H * 100}%`,
        left: `${26 / CANVAS_W * 100}%`,
        right: `${26 / CANVAS_W * 100}%`,
        bottom: `${65 / CANVAS_H * 100}%`,
        zIndex: 2
      }}>
        <div className="flex-1 overflow-hidden flex items-start justify-center">
          <SafeImg src={weaponImg} className="w-full h-full object-contain" />
        </div>
        <div className="flex-shrink-0 text-center" style={{ padding: `${4 * cardScale}px ${4 * cardScale}px ${8 * cardScale}px` }}>
          <p className="font-bold leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#AC83D5', fontSize: `${14 * cardScale}px` }}>
            {riven.name}
          </p>
          {!riven.veiled && !riven.challenge && statsText && (
            <p className="leading-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#AC83D5', fontSize: `${13 * cardScale}px`, whiteSpace: 'pre-line' }}>
              {statsText}
            </p>
          )}
          {riven.challenge && !riven.veiled && (
            <p className="leading-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#AC83D5', fontSize: `${13 * cardScale}px`, lineHeight: '1.25' }}>
              {riven.challenge}
            </p>
          )}
        </div>
      </div>

      {!riven.veiled && !riven.challenge && (
        <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none" style={{ bottom: '0%', zIndex: 5 }}>
          {rank >= maxRank && f('RankCompleteLine.png') && (
            <img src={f('RankCompleteLine.png')} className="absolute inset-x-0" style={{ bottom: '0%', width: '100%' }} alt="" />
          )}
          <div className="flex items-center justify-center" style={{ gap: Math.round(1.5 * cardScale), height: Math.round(14 * cardScale) }}>
            {Array.from({ length: Math.min(maxRank, 10) }, (_, i) => {
              const p = i < rank ? 'RankSlotActive' : 'RankSlotEmpty'
              const src = u(framesPath, mf, `${p}.png`)
              const s = Math.max(4, Math.round(7 * cardScale))
              return src ? <img key={i} src={src} style={{ width: s, height: s }} className="object-contain flex-shrink-0" alt="" onError={e => e.target.style.display = 'none'} /> : null
            })}
          </div>
        </div>
      )}

      {riven.veiled && (
        <div className="absolute text-center pointer-events-none flex items-center justify-center" style={{ left: 0, right: 0, bottom: `${44 / CANVAS_H * 100}%`, zIndex: 4 }}>
          <span className="font-black uppercase tracking-wider drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#AC83D5', fontSize: `${10 * cardScale}px` }}>
            Veiled
          </span>
          {riven.quantity > 1 && (
            <span className="ml-2 font-black drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#AC83D5', fontSize: `${9 * cardScale}px` }}>
              x{riven.quantity}
            </span>
          )}
        </div>
      )}

      {riven.challenge && !riven.veiled && (
        <div className="absolute flex items-center justify-center pointer-events-none" style={{ left: 0, right: 0, bottom: `${43 / CANVAS_H * 100}%`, zIndex: 4 }}>
          <span className="font-black uppercase tracking-wider drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#AC83D5', fontSize: `${10 * cardScale}px` }}>
            Challenge
          </span>
          {riven.rerolls > 0 && (
            <div className="absolute flex items-center pointer-events-none gap-0.5" style={{ right: '20%', bottom: 0, zIndex: 4 }}>
              {f('Reset.png') && <img src={f('Reset.png')} style={{ width: `${9 * cardScale}px`, height: `${9 * cardScale}px` }} className="object-contain" alt="" />}
              <span className="font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#AC83D5', fontSize: `${10 * cardScale}px` }}>
                {riven.rerolls}
              </span>
            </div>
          )}
        </div>
      )}

      {!riven.veiled && !riven.challenge && (
        <>
          <div className="absolute flex items-center pointer-events-none gap-1" style={{ left: '20%', bottom: `${43 / CANVAS_H * 100}%`, zIndex: 4 }}>
            <span className="font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#AC83D5', fontSize: `${10 * cardScale}px` }}>
              MR {riven.mr ?? '?'}
            </span>
          </div>
          {riven.rerolls > 0 && (
            <div className="absolute flex items-center pointer-events-none gap-0.5" style={{ right: '20%', bottom: `${43 / CANVAS_H * 100}%`, zIndex: 4 }}>
              {f('Reset.png') && <img src={f('Reset.png')} style={{ width: `${10 * cardScale}px`, height: `${10 * cardScale}px` }} className="object-contain" alt="" />}
              <span className="font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#AC83D5', fontSize: `${10 * cardScale}px` }}>
                {riven.rerolls}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
