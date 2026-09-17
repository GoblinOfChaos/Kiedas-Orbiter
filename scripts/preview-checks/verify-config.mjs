import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const json = path => JSON.parse(readFileSync(path, 'utf8'));
// RFC 7396 merge semantics used by Tauri config overlays.
function merge(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch;
  const result = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete result[key];
    else result[key] = merge(result[key], value);
  }
  return result;
}
const base = json('src-tauri/tauri.conf.json');
const preview = json('src-tauri/tauri.preview.conf.json');
for (const os of ['linux', 'windows', 'darwin']) {
  const effective = merge(merge(base, json(`src-tauri/tauri.${os}.conf.json`)), preview);
  assert.equal(effective.identifier, 'com.jacob.kiedasorbiter.preview');
  assert.equal(effective.productName, "Kieda's Orbiter Preview");
  assert.equal(effective.mainBinaryName, 'kiedas-orbiter-preview');
  assert.equal(effective.plugins.updater, undefined);
  assert.deepEqual(effective.app.windows.map(w => w.label), base.app.windows.map(w => w.label));
  assert(effective.app.windows.every(w => w.title.includes('Preview') && !w.visible));
  const permissions = effective.app.security.capabilities.flatMap(c => c.permissions);
  assert(!permissions.includes('updater:default'));
  assert(!permissions.includes('global-shortcut:default'));
  assert(effective.build.beforeBuildCommand.includes('--mode preview'));
}
assert(base.plugins.updater.endpoints[0].includes('/releases/latest/'));
const app = readFileSync('src/App.jsx','utf8');
const ids = [...app.slice(app.indexOf('const NAV_ITEMS'), app.indexOf('const ICON_NAMES')).matchAll(/id: '([^']+)'/g)].map(m => m[1]);
const nav = readFileSync('src/components/PreviewNavigation.jsx','utf8');
const navArray = nav.slice(nav.indexOf('export const NAV_GROUPS'), nav.indexOf('const KEY'));
for (const id of ids) assert.equal([...navArray.matchAll(new RegExp(`'${id}'`, 'g'))].length, 1, id);
assert.equal(ids.length,20);
const native = readFileSync('src-tauri/src/main.rs','utf8');
const root = native.slice(native.indexOf('pub fn get_data_root()'), native.indexOf('fn resolve_path'));
assert(root.indexOf('if build_profile::IS_PREVIEW') < root.indexOf('if cfg!(debug_assertions)'));
assert(root.indexOf('return build_profile::preview_root') < root.indexOf('copy_dir_recursive'));
for (const name of ['call_api_helper','post_market_order','delete_market_order','update_market_order','close_market_order','start_log_scanner','set_hotkeys','show_notification','toggle_sidebar']) {
  assert.match(native, new RegExp(`fn ${name}\\([^]*?Result<[^\\n]*?\\{\\s*build_profile::require_live\\(\\)\\?;`));
}
console.log('PASS: three platform configuration merges, 20 navigation routes, migration ordering and native command guard presence. Static checks only.');
