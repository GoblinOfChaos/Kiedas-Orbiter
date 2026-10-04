import test from 'node:test';
import assert from 'node:assert/strict';
import { createMainThreadStallDetector } from '../../src/lib/logging/stallDetector.js';
import { beginScreenMount } from '../../src/lib/logging/screenInstrumentation.js';
import { runFarmingSpan } from '../../src/lib/farmingTargets/logging.js';

test('main-thread stall detector reports late ticks once per five seconds', () => {
  let now = 0;
  let tick;
  let cleared = false;
  const stalls = [];
  const stop = createMainThreadStallDetector({
    now: () => now,
    onStall: (payload) => stalls.push(payload),
    setIntervalFn: (callback) => { tick = callback; return 17; },
    clearIntervalFn: () => { cleared = true; },
  });

  now = 1251;
  tick();
  assert.deepEqual(stalls, [{ late_ms: 1001 }]);
  now = 2000;
  tick();
  assert.equal(stalls.length, 1);
  now = 6251;
  tick();
  assert.equal(stalls.length, 2);
  stop();
  assert.equal(cleared, true);
});

test('screen mount tracker warns when first render plus effects exceeds 750ms', () => {
  let now = 0;
  const spans = [];
  const warnings = [];
  const tracker = beginScreenMount({
    screen: 'farming-targets',
    route: 'farming-targets',
    now: () => now,
    startSpanFn: (name, metadata) => {
      spans.push({ name, metadata });
      return { complete: (payload, extra) => spans.push({ payload, extra }) };
    },
    warnFn: (...args) => warnings.push(args),
  });
  now = 751;
  assert.equal(tracker.complete(), 751);
  assert.equal(spans[0].name, 'screen.mount');
  assert.equal(spans.some((entry) => entry.payload?.duration_ms === 751), true);
  assert.equal(warnings[0][0], 'screen.render.slow');
  assert.equal(warnings[0][1].threshold_ms, 750);
});

test('farming span instrumentation emits a start/complete pair with duration and sizes', () => {
  let now = 10;
  const calls = [];
  const startSpanFn = (name, metadata) => {
    calls.push({ phase: 'started', name, metadata });
    return {
      complete: (payload, extra) => calls.push({ phase: 'complete', name, payload, extra }),
      fail: (error) => calls.push({ phase: 'failed', name, error }),
    };
  };
  for (const name of ['farming.place_index.build', 'farming.model.build', 'farming.drawer_lookup.build']) {
    runFarmingSpan(name, () => ({ places: 3, sources: 9 }), {
      startSpanFn,
      payload: { targets: 31 },
      size: (result) => result,
      now: () => { now += 5; return now; },
    });
  }
  assert.deepEqual(calls.filter((call) => call.phase === 'started').map((call) => call.name), [
    'farming.place_index.build', 'farming.model.build', 'farming.drawer_lookup.build',
  ]);
  assert.equal(calls.filter((call) => call.phase === 'complete').every((call) => call.payload.duration_ms === 5 && call.payload.places === 3), true);
});
