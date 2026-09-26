import test from 'node:test';
import assert from 'node:assert/strict';
import { runRealProof } from '../../scripts/farming-targets-real-proof.js';

test('real Preview export proves Narin and a mod have ledger places and planets', () => {
  const result = runRealProof();
  assert.ok(result.ledger.length > 0);
  assert.ok(result.places.length > 0);
  assert.ok(result.planets.length > 0);
  assert.ok(result.places.every((name) => name !== 'drops.wf'));
});
