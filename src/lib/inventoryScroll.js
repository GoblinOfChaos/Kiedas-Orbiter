function finiteNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function getScrollKeyTarget({ key, scrollTop, clientHeight, scrollHeight, shiftKey = false, modelMaximumTop = null }) {
  const currentTop = Math.max(0, finiteNumber(scrollTop));
  const viewportHeight = Math.max(0, finiteNumber(clientHeight));
  const domMaximumTop = Math.max(0, finiteNumber(scrollHeight) - viewportHeight);
  const maximumTop = key === 'End' && modelMaximumTop !== null && Number.isFinite(Number(modelMaximumTop))
    ? Math.max(0, finiteNumber(modelMaximumTop))
    : domMaximumTop;

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

export function getVirtualScrollMaximum({ rowCount, rowStride, bottomPadding = 0, rootHeight = null, rootOffset = 0, clientHeight }) {
  const measuredRootHeight = rootHeight === null
    ? getVirtualRootHeight({ rowCount, rowStride, bottomPadding })
    : Math.max(0, finiteNumber(rootHeight));
  return Math.max(0, finiteNumber(rootOffset) + measuredRootHeight - Math.max(0, finiteNumber(clientHeight)));
}

export function getGridColumnCount({ containerWidth, minCardWidth, gap = 0 }) {
  const width = Math.max(0, finiteNumber(containerWidth));
  const minimum = Math.max(1, finiteNumber(minCardWidth, 1));
  const columnGap = Math.max(0, finiteNumber(gap));
  return Math.max(1, Math.floor((width + columnGap) / (minimum + columnGap)));
}

export function getVirtualScrollModel({ itemCount, columns, rowStride, bottomPadding = 0 }) {
  const items = Math.max(0, Math.floor(finiteNumber(itemCount)));
  const columnCount = Math.max(1, Math.floor(finiteNumber(columns, 1)));
  const rowCount = Math.ceil(items / columnCount);
  const rootHeight = getVirtualRootHeight({ rowCount, rowStride, bottomPadding });
  return {
    itemCount: items,
    columns: columnCount,
    rowCount,
    rowStride: Math.max(0, finiteNumber(rowStride)),
    bottomPadding: Math.max(0, finiteNumber(bottomPadding)),
    rootHeight,
  };
}

export function settleScrollJump({ container, getTarget, requestAnimationFrame, maxPasses = 6 }) {
  const schedule = requestAnimationFrame ?? globalThis.requestAnimationFrame;
  const passLimit = Math.max(1, Math.floor(finiteNumber(maxPasses, 6)));

  return new Promise((resolve) => {
    if (!container || typeof container.scrollTo !== 'function' || typeof schedule !== 'function') {
      resolve({ passes: 0, target: 0, scrollTop: 0, scrollHeight: 0 });
      return;
    }

    let passes = 0;
    let previous = null;
    let lastTarget = 0;

    const runPass = () => {
      const dimensions = {
        scrollTop: finiteNumber(container.scrollTop),
        clientHeight: Math.max(0, finiteNumber(container.clientHeight)),
        scrollHeight: Math.max(0, finiteNumber(container.scrollHeight)),
        pass: passes,
      };
      lastTarget = Math.max(0, finiteNumber(getTarget(dimensions)));
      container.scrollTo({ top: lastTarget, behavior: 'auto' });
      passes += 1;

      schedule(() => {
        const snapshot = {
          scrollTop: finiteNumber(container.scrollTop),
          scrollHeight: Math.max(0, finiteNumber(container.scrollHeight)),
        };
        const stableFramePair = previous !== null &&
          previous.scrollTop === snapshot.scrollTop &&
          previous.scrollHeight === snapshot.scrollHeight;
        previous = snapshot;

        if (stableFramePair || passes >= passLimit) {
          resolve({ ...snapshot, passes, target: lastTarget });
          return;
        }
        runPass();
      });
    };

    runPass();
  });
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
