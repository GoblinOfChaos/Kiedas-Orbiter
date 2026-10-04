export const SCREEN_SLOW_THRESHOLD_MS = 750;

export function completeScreenMount(ref) {
  ref?.current?.tracker?.complete();
}

export function beginScreenMount({
  screen,
  route = screen,
  startSpanFn,
  warnFn,
  setContextFn = () => {},
  now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
} = {}) {
  setContextFn({ screen, route });
  const startedAt = now();
  const span = startSpanFn('screen.mount', { screen, route, payload: { screen, route } });
  let completed = false;

  return {
    complete(payload = {}) {
      if (completed) return 0;
      completed = true;
      const durationMs = Math.max(0, now() - startedAt);
      span.complete({ ...payload, screen, route, duration_ms: durationMs }, { durationMs });
      if (durationMs > SCREEN_SLOW_THRESHOLD_MS) {
        warnFn('screen.render.slow', { screen, route, duration_ms: durationMs, threshold_ms: SCREEN_SLOW_THRESHOLD_MS }, { screen, route, durationMs });
      }
      return durationMs;
    },
  };
}
