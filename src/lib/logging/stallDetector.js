export function createMainThreadStallDetector({
  onStall,
  now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  setIntervalFn = globalThis.setInterval,
  clearIntervalFn = globalThis.clearInterval,
  intervalMs = 250,
  thresholdMs = 1000,
  cooldownMs = 5000,
} = {}) {
  if (typeof onStall !== 'function' || typeof setIntervalFn !== 'function') return () => {};

  let expected = now() + intervalMs;
  let lastStallAt = Number.NEGATIVE_INFINITY;
  const timer = setIntervalFn(() => {
    const current = now();
    const lateMs = current - expected;
    if (lateMs > thresholdMs && current - lastStallAt >= cooldownMs) {
      lastStallAt = current;
      onStall({ late_ms: Math.round(lateMs) });
    }
    expected = current + intervalMs;
  }, intervalMs);

  return () => {
    if (typeof clearIntervalFn === 'function') clearIntervalFn(timer);
  };
}
