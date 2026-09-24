import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

test('inventoryParser craftable projection carries outputQty from ExportRecipes.num', async () => {
  const parserPath = fileURLToPath(new URL('../../src/lib/inventoryParser.js', import.meta.url));
  const source = await readFile(parserPath, 'utf8');
  const craftableStart = source.indexOf('craftable: (() => {');
  const craftableEnd = source.indexOf('    })(),', craftableStart);

  assert.ok(craftableStart >= 0, 'craftable builder must exist');
  assert.ok(craftableEnd > craftableStart, 'craftable builder must have an end');
  const craftableSource = source.slice(craftableStart, craftableEnd);
  assert.match(craftableSource, /outputQty:\s+recipe\.num\s+===\s+undefined\s+\?\s+1\s+:\s+recipe\.num/);
});
