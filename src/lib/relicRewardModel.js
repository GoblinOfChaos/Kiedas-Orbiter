export function getRelicRewardCounts(item, inventory = {}) {
  const blueprintReward = /blueprint$/i.test(item?.name || item?.uniqueName || '');
  const blueprintCount = Number(inventory.blueprintCount ?? (blueprintReward ? inventory.stock : 0)) || 0;
  const craftedCount = Number(inventory.craftedCount) || 0;
  return { blueprintCount, craftedCount, isMastered: Boolean(inventory.isMastered) };
}
