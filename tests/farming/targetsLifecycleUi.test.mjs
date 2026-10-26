import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createDashboardViewModel } from '../../src/preview/view-models/dashboardViewModel.js';
import { dueState, activeTargets } from '../../src/lib/farmingTargets/state.js';
import { setTargetStatus, addTarget, createFarmingTarget } from '../../src/lib/farmingTargets/store.js';

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8');
const screen = read('src/screens/FarmingTargets.jsx');
const dashboard = read('src/screens/Dashboard.jsx');
const dashboardView = read('src/preview/dashboard/PreviewDashboardView.jsx');
const en = JSON.parse(read('src/lib/i18n/en.json')).ui;

test('dashboard view model carries the number of due targets', () => {
  const model = createDashboardViewModel({ inventoryData: null, notificationHistory: [], t: (_k, fallback) => fallback, farmingTargetCount: 3, farmingDueCount: 2 });
  assert.equal(model.targets.count, 3);
  assert.equal(model.targets.dueCount, 2);
  assert.equal(createDashboardViewModel({ inventoryData: null, notificationHistory: [], t: () => '' }).targets.dueCount, 0);
});

test('dashboard counts targets that are due today or overdue among active targets only', () => {
  assert.match(dashboard, /active\.filter\(\(target\) => dueState\(target\) === 'due'\)\.length/);
  const now = new Date(2026, 9, 26, 12).getTime();
  assert.equal(dueState({ status: 'active', dueAt: '2026-10-26' }, now), 'due');
  assert.equal(dueState({ status: 'active', dueAt: '2026-10-20' }, now), 'due');
  assert.equal(dueState({ status: 'active', dueAt: '2026-10-27' }, now), 'scheduled');
  assert.equal(dueState({ status: 'archived', dueAt: '2026-10-20' }, now), 'none');
});

test('dashboard plans panel shows the due reminder with its string', () => {
  assert.match(dashboardView, /model\.targets\.dueCount > 0/);
  assert.match(dashboardView, /t\('preview\.dashboard\.targets_due', \{ count: model\.targets\.dueCount \}\)/);
  assert.ok(en['preview.dashboard.targets_due'].includes('{count}'));
});

test('ledger shows an over-commit badge when reservations across targets exceed what is owned', () => {
  assert.match(screen, /row\.overcommitted && <span data-farming-overcommitted/);
  assert.ok(en['farming_targets.overcommitted']);
});

test('completed and archived targets are listed with a restore action', () => {
  assert.match(screen, /status === 'archived' \|\| target\?\.status === 'complete'/);
  assert.match(screen, /data-farming-closed-targets/);
  assert.match(screen, /onTargetChange\(item\.id, setTargetStatus, 'active'\)/);
  for (const key of ['farming_targets.closed_targets', 'farming_targets.status_complete', 'farming_targets.status_archived', 'farming_targets.restore']) assert.ok(en[key], key);
});

test('restoring a closed target makes it active again and it returns to the active list', () => {
  let store = addTarget({}, createFarmingTarget({ uniqueName: '/Lotus/Test/Item', name: 'Test Item' }));
  const id = store.targets[0].id;
  store = setTargetStatus(store, id, 'archived');
  assert.equal(activeTargets(store.targets).length, 0);
  store = setTargetStatus(store, id, 'active');
  assert.equal(activeTargets(store.targets).length, 1);
});
