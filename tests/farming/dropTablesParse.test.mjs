import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseDropTablesHtml,
  validateDropTables,
  realDropRows,
  DropTablesFormatError,
  KNOWN_SECTIONS,
} from '../../src/lib/deDropTables/parse.js';

const html = readFileSync(new URL('../../src/lib/deDropTables/fixtures/mini.html', import.meta.url), 'utf8');

test('parses place rotations and fractions', () => {
  const { sections } = parseDropTablesHtml(html);
  const rows = sections.missionRewards;
  assert.ok(rows.some((r) => r.place === 'Mercury/Apollodorus (Survival)' && r.rotation === 'Rotation A' && r.item === '2,000 Credits Cache' && r.chance === 0.5));
  assert.ok(rows.every((r) => r.chance > 0 && r.chance <= 1));
});

test('parses by-source rows with source chance', () => {
  const { sections } = parseDropTablesHtml(html);
  const row = sections.resourceByAvatar.find((x) => x.source === 'Vem Tabook' && x.item === 'Neurodes');
  assert.equal(row.chance, 1);
  assert.equal(row.sourceChance, 0.5);
});

test('unknown section id throws a typed error', () => {
  const bad = html.replace('id="missionRewards"', 'id="missionRewards2"');
  assert.throws(() => parseDropTablesHtml(bad), (error) => error instanceof DropTablesFormatError && /missionRewards2/.test(error.message));
});

test('unrecognised row shape throws, never skipped', () => {
  const bad = html.replace('<tr><td>2,000 Credits Cache</td><td>Common (50.00%)</td></tr>', '<tr><td>2,000 Credits Cache</td><td>Common</td></tr>');
  assert.throws(() => parseDropTablesHtml(bad), DropTablesFormatError);
});

test('rotation groups must sum to 100 within 0.15; exceptions are warnings not errors', () => {
  const parsed = parseDropTablesHtml(html);
  const validation = validateDropTables(parsed);
  assert.equal(validation.ok, true);
});

test('under-review zero-percent placeholder parses and validates as a warning', () => {
  const placeholder = html.replace('Common (50.00%)', 'Beyond Legendary (Under Review) (0.00%)');
  const parsed = parseDropTablesHtml(placeholder);
  const row = parsed.sections.missionRewards.find((entry) => entry.item === '2,000 Credits Cache');
  assert.equal(row.underReview, true);
  const validation = validateDropTables(parsed);
  assert.equal(validation.ok, true);
  assert.match(validation.warnings.join(' '), /1 under-review placeholder rows ignored/);
});

test('zero-percent non-placeholder is a validation error', () => {
  const zeroChance = html.replace('Common (50.00%)', 'Common (0.00%)');
  const validation = validateDropTables(parseDropTablesHtml(zeroChance));
  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /chance out of range/);
});

test('realDropRows removes only under-review placeholders', () => {
  const rows = [{ item: 'placeholder', underReview: true }, { item: 'real', chance: 0.25 }, { item: 'unflagged', chance: 0 }];
  assert.deepEqual(realDropRows(rows), [rows[1], rows[2]]);
});

test('sharp row-count drop versus previous snapshot is an error', () => {
  const parsed = parseDropTablesHtml(html);
  const previous = { stats: { rows: parsed.stats.rows * 10, places: parsed.stats.places * 10 } };
  const validation = validateDropTables(parsed, previous);
  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /row count/i);
});

test('KNOWN_SECTIONS lists exactly the 20 documented ids', () => assert.equal(KNOWN_SECTIONS.length, 20));
