import { useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { useUi } from '../contexts/UiContext';
import { IS_PREVIEW } from '../lib/buildProfile';
import { addTarget, createFarmingTarget, loadFarmingTargets, saveFarmingTargets } from '../lib/farmingTargets/store';

let storeLoad = null;

/** Small Preview-only entry point shared by item-bearing screens. */
export default function FarmingTargetAction({ item, className = '' }) {
  const { t } = useUi();
  const [store, setStore] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (IS_PREVIEW) {
      storeLoad ||= loadFarmingTargets().catch(() => ({ targets: [] }));
      storeLoad.then(setStore);
    }
  }, []);
  const uniqueName = item?.uniqueName || item?.unique_name;
  if (!IS_PREVIEW || !uniqueName) return null;
  const exists = store?.targets?.some((target) => target.uniqueName === uniqueName && target.status !== 'archived') ?? false;
  const add = async (event) => {
    event.stopPropagation();
    if (!store || exists || saving) return;
    setSaving(true);
    const next = addTarget(store, createFarmingTarget({ uniqueName, name: item.name, image: item.image, category: item.category }));
    try { await saveFarmingTargets(next); setStore(next); } finally { setSaving(false); }
  };
  return <button type="button" onClick={add} disabled={exists || saving} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-wide ${exists ? 'border-emerald-400/30 text-emerald-300' : 'border-kronos-accent/30 text-kronos-accent hover:bg-kronos-accent/10'} ${className}`} aria-label={exists ? t('farming_targets.already_target') : t('farming_targets.add_target')}>
    <Target size={11} /> {exists ? t('farming_targets.already_target') : t('farming_targets.add_target')}
  </button>;
}
