import { memo } from 'react'
import ItemImage from './ItemImage'
import { Tooltip } from './UI'
import { convertFileSrc } from '../lib/logging/tauri'
import { formatChance } from './AcquisitionDrawer'
import { getCachedPrimeSetPartSources } from '../lib/primeSetParts'
import { buildTooltipRelicRows } from '../lib/acquisitionModel/tooltipRelicRows'

export function getPrimeSetPartLabel(setName, partName) {
  const name = partName ?? ''
  const prefix = setName?.trim()
  if (prefix && name.startsWith(`${prefix} `)) return name.slice(prefix.length).trim()
  return name
}

function PrimeSetCard({ set, primePrices, isPriceLoading, dropIndex, exportData, uiPath, resolveImgFallback, toggle, t }) {
  const isParentOwned = set.owned
  const isParentMastered = set.mastered
  const partsMet = set.parts.filter((p) => (p.crafted !== undefined ? p.crafted >= (p.need ?? 1) : p.quantity >= (p.need ?? 1))).length
  const totalNeeded = set.parts.length
  const completion = Math.min(100, partsMet / totalNeeded * 100)
  const isComplete = partsMet >= set.parts.length
  const bpPart = set.parts.find((p) => p.isBlueprint)
  const bpCount = bpPart?.quantity ?? 0
  const setsPossible = bpCount > 0 && isComplete ? bpCount : 0
  const setValue = primePrices?.[set.setPath] ?? set.parts.reduce((sum, p) => sum + (primePrices?.[p.unique_name] ?? 0) * (p.need ?? 1), 0)
  const partCellPadding = set.parts.length >= 5 ? 'p-1.5' : 'p-3'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => set.setPath && toggle(set.setPath)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          if (set.setPath) toggle(set.setPath)
        }
      }}
      className={`relative rounded-xl border border-white/5 overflow-hidden flex flex-col bg-kronos-panel/20 ${isComplete ? 'border-green-500/30' : ''}`}
    >
      {isPriceLoading ? <span className="absolute top-4 right-4 z-10 inline-block w-6 h-3 bg-white/10 rounded animate-pulse" /> : setValue > 0 && <span className="absolute top-4 right-4 z-10 text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-300">{setValue}p</span>}
      <div className={`flex items-center gap-4 px-4 py-5 border-b border-white/5 relative ${isComplete ? 'bg-green-500/5' : ''}`}>
        <div className="w-28 h-28 flex items-center justify-center flex-shrink-0"><ItemImage src={set.image} alt="" className="max-w-full max-h-full object-contain" placeholderClassName="w-14 h-14 rounded bg-white/5" resolveFallbackSrc={resolveImgFallback} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start"><div className="min-w-0 flex-1"><p className="text-xl font-black text-kronos-text uppercase whitespace-normal leading-tight">{set.name}{t('inventory.set')}</p><div className="flex items-center gap-2 mt-2"><span className={`text-[10px] font-black px-2 py-0.5 rounded inline-block ${isComplete ? 'bg-green-500/20 text-green-400' : 'bg-kronos-accent/20 text-kronos-accent'}`}>{setsPossible > 0 ? t(setsPossible > 1 ? 'ui.inventory.set_plural' : 'ui.inventory.set_singular', { count: setsPossible }) : t('ui.inventory.parts_progress', { met: partsMet, total: totalNeeded, pct: Math.round(completion) })}</span></div></div></div>
          <div className="flex flex-wrap gap-2 mt-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${isParentOwned ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 text-kronos-dim'}`}><span className="text-[10px] font-black uppercase tracking-wider">{isParentOwned ? t('ui.inventory.filter_owned') : t('ui.inventory.unowned')}</span></div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${isParentMastered ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-white/5 border-white/5 text-kronos-dim'}`}><span className="text-[10px] font-black uppercase tracking-wider">{isParentMastered ? t('ui.inventory.filter_mastered') : t('ui.inventory.unmastered')}</span></div>
          </div>
        </div>
      </div>
      <div className="grid gap-px border-t border-white/5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(64px, 100%), 1fr))' }}>
        {set.parts.map((part, pi) => {
          const need = part.need ?? 1
          const met = part.crafted !== undefined ? part.crafted >= need : part.quantity >= need
          const partSources = getCachedPrimeSetPartSources(part, dropIndex)
          const relicRows = buildTooltipRelicRows(part.unique_name, part.name, { exportData }, { t })
          const partPrice = primePrices?.[part.unique_name] ?? 0
          return <div key={pi} className={`flex min-w-0 flex-col items-center justify-center gap-1.5 ${partCellPadding} h-full ${met ? 'bg-green-500/5' : 'bg-black/20'} relative break-words`}>
            <div className="w-full h-5 flex items-center justify-center">
              {part.need > 1 && <span className="text-[14px] font-black text-kronos-accent px-1.5 py-0.5 rounded leading-none z-10">×{part.need}</span>}
            </div>
            {isPriceLoading ? <span className="absolute top-2 right-2 z-10 animate-pulse bg-white/10 rounded w-4 h-2" /> : partPrice > 0 && <span className="absolute top-2 right-2 z-10 text-[9px] font-bold px-1 py-0.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-300">{partPrice}p</span>}
            <div className="w-14 max-w-full h-14 flex items-center justify-center flex-shrink-0 relative"><ItemImage src={part.image} alt="" className="max-w-full max-h-full object-contain" placeholderClassName="w-7 h-7 rounded bg-white/5" resolveFallbackSrc={resolveImgFallback} />{part.isBlueprint && <img src={uiPath ? convertFileSrc(`${uiPath}/BlueprintOverlay.png`) : ''} alt="" className="absolute inset-0 w-full h-full object-contain" />}</div>
            <p className="text-[12px] font-medium text-kronos-dim text-center leading-tight w-full min-w-0 px-1 whitespace-normal break-words">{getPrimeSetPartLabel(set.name, part.name)}</p>
            {part.crafted !== undefined ? (part.crafted > 0 || part.quantity > 0) && <span className={`text-[10px] font-black ${met ? 'text-green-400' : 'text-red-400'}`}>{part.crafted} crafted ({part.quantity}{t('ui.relic_reward.bp')}{part.quantity > 1 ? 's' : ''})</span> : part.quantity > 0 && <span className={`text-[10px] font-black ${met ? 'text-green-400' : 'text-red-400'}`}>{part.quantity}</span>}
            {(relicRows.length > 0 || partSources.some((source) => source.type === 'enemy')) && <Tooltip position="bottom" content={<div className="max-w-[260px] max-h-[200px] overflow-y-auto space-y-1"><p className="text-[9px] font-black uppercase text-kronos-accent">{t('ui.inventory.drop_sources')}</p>{relicRows.slice(0, 6).map((row, si) => <p key={`r-${si}`} className="text-[9px] text-kronos-text leading-tight">{row.label}</p>)}{partSources.filter((s) => s.type === 'enemy').slice(0, 3).map((s, si) => <p key={`e-${si}`} className="text-[9px] text-kronos-text leading-tight">{s.enemyName}{s.chance ? <span className="text-kronos-dim ml-1">{typeof s.chance === 'number' ? formatChance(s.chance) : `${s.chance}%`}</span> : ''}</p>)}</div>}><span className="min-w-0 max-w-full break-words text-[8px] font-black uppercase text-kronos-dim/50 cursor-help hover:text-kronos-accent transition-colors leading-none">{t('ui.inventory.sources')}</span></Tooltip>}
          </div>
        })}
      </div>
    </div>
  )
}

export default memo(PrimeSetCard)
