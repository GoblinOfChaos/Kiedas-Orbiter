/** Pure combined shopping ledger for Farming Targets. */

function quantity(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function compareText(a, b) {
  return String(a).localeCompare(String(b));
}

export function buildLedger({ leaves = new Map(), owned, reservations = [], priorities = {} } = {}) {
  // `priorities` is intentionally accepted as part of the interface but never
  // enters the arithmetic: priority changes presentation policy, not demand.
  void priorities;
  const reservationTotals = new Map();
  for (const reservation of reservations ?? []) {
    if (!reservation?.itemType) continue;
    reservationTotals.set(reservation.itemType, (reservationTotals.get(reservation.itemType) ?? 0) + quantity(reservation.quantity));
  }
  const entries = leaves instanceof Map ? [...leaves.entries()] : Object.entries(leaves ?? {});
  return entries.map(([key, leaf]) => {
    const itemType = leaf.itemType ?? key;
    const required = Math.max(0, quantity(leaf.required));
    const ownedCount = Math.max(0, quantity(typeof owned === 'function' ? owned(itemType) : owned?.[itemType]));
    const reservedTotal = reservationTotals.get(itemType) ?? 0;
    const usedBy = [...(leaf.contributions ?? [])]
      .filter((entry) => entry?.targetId != null && quantity(entry.quantity) > 0)
      .reduce((result, entry) => {
        const existing = result.find((value) => value.targetId === entry.targetId);
        if (existing) existing.quantity += quantity(entry.quantity);
        else result.push({ targetId: entry.targetId, quantity: quantity(entry.quantity) });
        return result;
      }, [])
      .sort((a, b) => compareText(a.targetId, b.targetId));
    return {
      itemType,
      name: leaf.name ?? itemType,
      image: leaf.image ?? null,
      required,
      owned: ownedCount,
      reserved: Math.min(reservedTotal, ownedCount),
      overcommitted: reservedTotal > ownedCount,
      stillNeeded: Math.max(0, required - ownedCount),
      usedBy,
    };
  }).sort((a, b) =>
    b.stillNeeded - a.stillNeeded || compareText(a.name, b.name) || compareText(a.itemType, b.itemType)
  );
}
