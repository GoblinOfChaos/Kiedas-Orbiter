import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const settings = fs.readFileSync(path.join(root, 'src/screens/Settings.jsx'), 'utf8');

// #124: the EE.log path field was a text box under "Safe Mode Tracking", far from
// the Warframe Cache path. It now sits in the same Game assets section, with its
// Browse button, Auto-detect button and status line.
test('the EE.log path field is in the Game assets section next to the Warframe Cache path', () => {
  const gameAssets = settings.indexOf("t('settings.game_assets')");
  const nextSection = settings.indexOf('{/* UI Scale & Notification Monitor */}');
  const field = settings.indexOf("t('settings.custom_ee_log_path')");
  assert.ok(gameAssets > 0 && nextSection > gameAssets, 'section markers exist');
  assert.ok(field > gameAssets && field < nextSection, 'EE.log field lies between Game assets and the next section');
});

test('the EE.log field keeps Browse, Auto-detect and the status line', () => {
  const field = settings.indexOf("t('settings.custom_ee_log_path')");
  const block = settings.slice(field, settings.indexOf('{/* UI Scale & Notification Monitor */}'));
  assert.match(block, /onClick=\{handleBrowseEeLog\}/);
  assert.match(block, /onClick=\{handleDetectEeLogs\}/);
  assert.match(block, /<EeLogStatusLine path=\{eeLogPath\} \/>/);
});

test('the Safe Mode Tracking card keeps its toggle and no longer holds the field', () => {
  const market = settings.indexOf('{/* Warframe Market Integration */}');
  // The same label also appears in the section menu near the top, so take the card heading just before the market card.
  const safeMode = settings.lastIndexOf("t('settings.safe_mode_tracking')", market);
  assert.ok(safeMode > 0 && market > safeMode);
  const card = settings.slice(safeMode, market);
  assert.match(card, /<Toggle checked=\{useEELog\} onChange=\{handleUseEELogChange\} \/>/);
  assert.doesNotMatch(card, /custom_ee_log_path/);
});
