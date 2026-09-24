import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../../scripts/farming-targets-proof.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixture = (name) => path.join(root, 'tests/farming/fixtures', name);
const baseOptions = {
  inventory: fixture('proof-inventory.json'),
  targets: fixture('proof-targets.json'),
  'drop-tables': fixture('proof-drop-tables.json'),
  'wiki-dir': fixture('proof-wiki'),
  regions: fixture('proof-regions.json'),
  craftable: fixture('proof-inventory.json'),
};

function run(options = baseOptions) {
  const output = [];
  const originalLog = console.log;
  console.log = (...values) => output.push(values.join(' '));
  try {
    main(options);
    return { status: 0, stdout: output.join('\n'), error: null };
  } catch (error) {
    return { status: error.exitCode ?? 1, stdout: output.join('\n'), error };
  } finally {
    console.log = originalLog;
  }
}

test('proof script prints the ledger and snapshot for a fixture set', () => {
  const result = run();
  assert.equal(result.status, 0, result.error?.message);
  assert.match(result.stdout, /Still needed/);
  assert.match(result.stdout, /2 \| Shared X/);
  assert.match(result.stdout, /Snapshot.*2026-09-24/);
});

test('proof keeps target id and name from the same record and prints compact inputs', () => {
  const result = run();
  assert.equal(result.status, 0, result.error?.message);
  assert.match(result.stdout, /Input inventory .*sha256=/);
  assert.match(result.stdout, /Input wiki JSON directory \d+ files combined-sha256=/);
  assert.doesNotMatch(result.stdout, /Input .*proof-wiki.*sha256=/);
  for (const line of result.stdout.split('\n').filter((value) => value.startsWith('- '))) {
    const match = line.match(/^- ([^:]+): ([^(]+) \(([^)]+)\)$/);
    assert.ok(match, `malformed target line: ${line}`);
    const target = JSON.parse(fs.readFileSync(fixture('proof-targets.json'))).find((entry) => entry.id === match[1]);
    assert.equal(`${target.name} (${target.itemType})`, `${match[2].trim()} (${match[3]})`);
  }
});

test('malformed input exits 1 with an error', () => {
  const result = run({ ...baseOptions, inventory: fixture('missing.json') });
  assert.equal(result.status, 1);
  assert.match(result.error.message, /cannot read JSON|missing file/);
});

test('recipe cycles exit 2 and name the cycle', () => {
  const result = run({ ...baseOptions, inventory: fixture('proof-cycle-inventory.json'), targets: fixture('proof-cycle-targets.json'), craftable: fixture('proof-cycle-inventory.json') });
  assert.equal(result.status, 2);
  assert.match(result.error.message, /CycleA/);
});
