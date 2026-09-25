/** Pure state rules for target badges and reservation presentation. */
export function dueState(target, now = Date.now()) {
  if (!target?.dueAt || target.status !== 'active') return 'none';
  const due = new Date(target.dueAt).getTime();
  if (!Number.isFinite(due)) return 'none';
  return due <= now ? 'due' : 'scheduled';
}

export function activeTargets(targets = []) {
  return targets.filter((target) => target?.status !== 'archived' && target?.status !== 'complete');
}

export function reservationTotals(reservations = []) {
  return reservations.reduce((totals, reservation) => {
    if (!reservation?.itemType) return totals;
    totals[reservation.itemType] = (totals[reservation.itemType] || 0) + Math.max(0, Number(reservation.quantity) || 0);
    return totals;
  }, {});
}
