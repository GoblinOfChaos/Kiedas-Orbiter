/** Pure state rules for target badges and reservation presentation. */
function validLocalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function dueState(target, now = Date.now()) {
  if (!target?.dueAt || target.status !== 'active') return 'none';
  const dueDate = String(target.dueAt).slice(0, 10);
  if (!validLocalDate(dueDate)) return 'none';
  const current = new Date(now);
  if (Number.isNaN(current.getTime())) return 'none';
  const today = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
  return dueDate <= today ? 'due' : 'scheduled';
}

export function activeTargets(targets) {
  return (targets ?? []).filter((target) => target?.status !== 'archived' && target?.status !== 'complete');
}

export function targetReservationQuantity(reservations = [], itemType, targetId) {
  return Math.max(0, Number((reservations ?? []).find((entry) => entry?.itemType === itemType && entry?.targetId === targetId)?.quantity) || 0);
}

export function reservationTotals(reservations = []) {
  return reservations.reduce((totals, reservation) => {
    if (!reservation?.itemType) return totals;
    totals[reservation.itemType] = (totals[reservation.itemType] || 0) + Math.max(0, Number(reservation.quantity) || 0);
    return totals;
  }, {});
}
