export function runFarmingSpan(name, operation, {
  startSpanFn,
  payload = {},
  size = () => ({}),
  now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
} = {}) {
  const span = startSpanFn(name, { payload });
  const startedAt = now();
  try {
    const result = operation();
    const durationMs = Math.max(0, now() - startedAt);
    span.complete({ ...size(result), duration_ms: durationMs }, { durationMs });
    return result;
  } catch (error) {
    span.fail(error, { duration_ms: Math.max(0, now() - startedAt) });
    throw error;
  }
}
