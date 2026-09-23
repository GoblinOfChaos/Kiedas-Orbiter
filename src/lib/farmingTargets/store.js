/**
 * Persistence for the Farming Targets feature (GitHub Stage 4C, route
 * `farming-targets`). Stores a flat list of user-added targets in
 * `data/user/farming-targets.json`, using the same generic
 * read_file_bytes/write_file/get_data_root_path Tauri commands every other
 * screen's JSON persistence uses (see Inventory.jsx's acquisition_overrides
 * read and Settings.jsx's coverage-report write) - no new Rust code needed.
 *
 * This is the MVP ("Option B") data shape from the Stage 4C scope decision,
 * but every record reserves the fields Option A's full feature set
 * (reservations, reminders) will need, so upgrading later never requires a
 * migration of files already on disk - only `version` ever changes, and
 * `migrateStore` below is the single place that would grow a case for it.
 */
import { invoke } from '../logging/tauri';

const RELATIVE_PATH = 'data/user/farming-targets.json';
const CURRENT_VERSION = 1;

function emptyStore() {
  return { version: CURRENT_VERSION, targets: [] };
}

// Placeholder for forward migrations. A real Option-A upgrade (e.g. adding
// a new required field to every existing target) would add a `case 1:`
// branch here that mutates `store` in place and falls through - deliberately
// not building that machinery now since there is nothing to migrate yet.
function migrateStore(store) {
  if (!store || typeof store !== 'object' || !Array.isArray(store.targets)) return emptyStore();
  return { ...emptyStore(), ...store };
}

export async function loadFarmingTargets() {
  try {
    const bytes = await invoke('read_file_bytes', { relative: RELATIVE_PATH });
    const parsed = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)));
    return migrateStore(parsed);
  } catch {
    return emptyStore();
  }
}

export async function saveFarmingTargets(store) {
  const dataRoot = await invoke('get_data_root_path');
  const absolutePath = `${dataRoot}/${RELATIVE_PATH}`;
  const payload = JSON.stringify(migrateStore(store), null, 2);
  await invoke('write_file', { path: absolutePath, data: new TextEncoder().encode(payload) });
}

/**
 * Builds a new target record. `reservations` and `reminders` are always
 * present (even though nothing reads or writes them yet) so an Option-A
 * build can start attaching to them immediately without touching every
 * record already saved by an Option-B build.
 */
export function createFarmingTarget({ uniqueName, name, image, category, quantity = 1, note = '' }) {
  return {
    id: crypto.randomUUID(),
    uniqueName,
    name,
    image: image || null,
    category: category || null,
    quantity: Math.max(1, Math.floor(quantity) || 1),
    note,
    createdAt: Date.now(),
    reservations: [],
    reminders: [],
  };
}

export function addTarget(store, target) {
  return { ...migrateStore(store), targets: [...store.targets, target] };
}

export function removeTarget(store, id) {
  return { ...migrateStore(store), targets: store.targets.filter((t) => t.id !== id) };
}

export function setTargetQuantity(store, id, quantity) {
  const safeQuantity = Math.max(1, Math.floor(quantity) || 1);
  return {
    ...migrateStore(store),
    targets: store.targets.map((t) => (t.id === id ? { ...t, quantity: safeQuantity } : t)),
  };
}

export function setTargetNote(store, id, note) {
  return {
    ...migrateStore(store),
    targets: store.targets.map((t) => (t.id === id ? { ...t, note } : t)),
  };
}
