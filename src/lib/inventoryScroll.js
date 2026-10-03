function finiteNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function getScrollKeyTarget({ key, scrollTop, clientHeight, scrollHeight, shiftKey = false }) {
  const currentTop = Math.max(0, finiteNumber(scrollTop));
  const viewportHeight = Math.max(0, finiteNumber(clientHeight));
  const maximumTop = Math.max(0, finiteNumber(scrollHeight) - viewportHeight);

  let target;
  switch (key) {
    case 'Home':
      target = 0;
      break;
    case 'End':
      target = maximumTop;
      break;
    case 'PageUp':
      target = currentTop - viewportHeight;
      break;
    case 'PageDown':
      target = currentTop + viewportHeight;
      break;
    case ' ':
    case 'Spacebar':
      target = currentTop + (shiftKey ? -viewportHeight : viewportHeight);
      break;
    default:
      return null;
  }

  return Math.min(maximumTop, Math.max(0, target));
}

export function getMeasuredRowStride(measuredCardHeight, rowGap, fallback) {
  const fallbackStride = Math.max(0, finiteNumber(fallback));
  const cardHeight = finiteNumber(measuredCardHeight, 0);
  if (cardHeight <= 0) return fallbackStride;
  return cardHeight + Math.max(0, finiteNumber(rowGap, 0));
}

export function getScrollTopForFirstItem({ firstItemIndex, columns, rowStride }) {
  const itemIndex = Math.max(0, Math.floor(finiteNumber(firstItemIndex)));
  const columnCount = Math.max(1, Math.floor(finiteNumber(columns, 1)));
  return Math.floor(itemIndex / columnCount) * Math.max(0, finiteNumber(rowStride));
}

export function getVirtualRootHeight({ rowCount, rowStride, bottomPadding = 0 }) {
  const rows = Math.max(0, Math.floor(finiteNumber(rowCount)));
  if (rows === 0) return 0;
  return rows * Math.max(0, finiteNumber(rowStride)) + Math.max(0, finiteNumber(bottomPadding));
}
