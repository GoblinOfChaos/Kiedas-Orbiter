import { useState } from 'react';
import { resolveBlueprintOrigin } from '../lib/acquisitionData';
import { buildBlueprintAcquisitionRows } from '../lib/relicSources';

function blueprintWord(t) {
  return String(t('acquisition_drawer.blueprint_label') || 'Blueprint').replace(/[：:]\s*$/, '').trim();
}

function sourceRowsWithUniqueLabels(rows, getSourceLabel, t) {
  const seen = new Set();
  const unique = [];
  for (const row of rows) {
    if (row?.type?.endsWith('-group')) {
      const children = sourceRowsWithUniqueLabels(row.sources || [], getSourceLabel, t);
      unique.push({ ...row, sources: children });
      continue;
    }
    const label = getSourceLabel(row, t);
    const identity = `${label}|${row?.chance ?? ''}`;
    if (!label || seen.has(identity)) continue;
    seen.add(identity);
    unique.push(row);
  }
  return unique;
}

function sourceRowKey(row, index) {
  return `${row?.type || 'source'}-${row?.location || row?.relicName || row?.text || index}`;
}

export default function BlueprintAcquisitionBox({
  displayName,
  recipe,
  dropIndex,
  fallbackDrops,
  rarityIndex,
  t,
  getSourceLabel,
  formatChance,
  originSources = [],
  variant = 'preview',
}) {
  const [expandedGroups, setExpandedGroups] = useState({});
  if (!recipe?.blueprintUniqueName) return null;

  const blueprintOrigin = resolveBlueprintOrigin(displayName, recipe);
  const rows = buildBlueprintAcquisitionRows(
    displayName,
    recipe,
    dropIndex,
    fallbackDrops,
    rarityIndex,
    blueprintOrigin,
    originSources,
  );
  const sourceRows = sourceRowsWithUniqueLabels(rows, getSourceLabel, t);
  if (sourceRows.length === 0) return null;

  const preview = variant === 'preview';
  const boxClassName = preview
    ? 'preview-acq-ingredient'
    : 'rounded bg-white/5 px-2 py-1 text-[12px] text-kronos-text';
  const headingClassName = preview
    ? 'preview-acq-ingredient-row'
    : 'flex items-start justify-between gap-2';
  const sourcesClassName = preview
    ? 'preview-acq-ingredient-sources'
    : 'mt-1 space-y-0.5 border-t border-white/5 pt-1';
  const rowClassName = preview
    ? 'preview-acq-ingredient-source-row'
    : 'flex items-start justify-between gap-2 text-[11px] text-kronos-dim';
  const textClassName = preview ? undefined : 'whitespace-normal break-words';
  const chanceClassName = preview ? 'preview-acq-chance-sm' : 'shrink-0 font-black text-kronos-accent';
  const renderRow = (row, index, groupKey = '') => {
    const key = `${groupKey}${sourceRowKey(row, index)}`;
    const label = getSourceLabel(row, t);
    if (row?.type?.endsWith('-group')) {
      const expanded = !!expandedGroups[key];
      return (
        <div key={key} className={rowClassName} data-blueprint-source-row="true">
          <button
            type="button"
            className={textClassName}
            aria-expanded={expanded}
            onClick={() => setExpandedGroups((current) => ({ ...current, [key]: !expanded }))}
          >
            {label}
          </button>
          {expanded && row.sources.map((child, childIndex) => renderRow(child, childIndex, `${key}-`))}
        </div>
      );
    }
    return (
      <div key={key} className={rowClassName} data-blueprint-source-row="true">
        <span className={textClassName}>{label}</span>
        {typeof row.chance === 'number' && <span className={chanceClassName}>{formatChance(row.chance)}</span>}
      </div>
    );
  };

  return (
    <div className={boxClassName} data-blueprint-box="true">
      <div className={headingClassName}>
        <span data-blueprint-heading="true">{`1x ${displayName} ${blueprintWord(t)}`}</span>
      </div>
      <div className={sourcesClassName}>
        {sourceRows.map((row, index) => renderRow(row, index))}
      </div>
    </div>
  );
}

export { sourceRowsWithUniqueLabels };
