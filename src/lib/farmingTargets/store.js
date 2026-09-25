/**
 * Persistence for the Farming Targets feature (GitHub Stage 4C, route
 * `farming-targets`). Stores a flat list of user-added targets in
 * `data/user/farming-targets.json`, using the same generic
 * read_file_bytes/write_file/get_data_root_path Tauri commands every other
 * screen's JSON persistence uses (see Inventory.jsx's acquisition_overrides
 * read and Settings.jsx's coverage-report write) - no new Rust code needed.
 *
 * The additive versioned shape keeps existing target records intact while
 * Preview adds reservations, priorities, lifecycle state, and due dates.
 */
import { invoke } from '../logging/tauri';

const RELATIVE_PATH = 'data/user/farming-targets.json';
const CURRENT_VERSION = 2;

function emptyStore() {
  return { version: CURRENT_VERSION, targets: [], reservations: [], priorities: {} };
}

// Migrations only add defaults and preserve unknown fields.
function migrateStore(store) {
  if (!store || typeof store !== 'object' || !Array.isArray(store.targets)) return emptyStore();
  return {
    ...emptyStore(),
    ...store,
    version: CURRENT_VERSION,
    targets: store.targets.map((target) => ({
      ...target,
      status: target.status || 'active',
      priority: Number.isFinite(Number(target.priority)) ? Number(target.priority) : 0,
      dueAt: target.dueAt ?? null,
      reservations: Array.isArray(target.reservations) ? target.reservations : [],
      reminders: Array.isArray(target.reminders) ? target.reminders : [],
    })),
    reservations: Array.isArray(store.reservations) ? store.reservations : [],
    priorities: store.priorities && typeof store.priorities === 'object' ? store.priorities : {},
  };
}

export async function loadFarmingTargets() {
  try {
    const bytes = await invoke('read_file_bytes', { relative: RELATIVE_PATH });
    const raw = new TextDecoder().decode(new Uint8Array(bytes));
    const parsed = JSON.parse(raw);
    if (Number(parsed?.version ?? 1) < CURRENT_VERSION) {
      // Preserve the exact pre-migration payload before adding fields. The
      // backup is best-effort; a failed backup must not prevent read access.
      try {
        const dataRoot = await invoke('get_data_root_path');
        await invoke('write_file', { path: `${dataRoot}/${RELATIVE_PATH}.bak`, data: new TextEncoder().encode(raw) });
      } catch { /* keep the last known in-memory data available */ }
    }
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
 * Builds a new target record with additive lifecycle and reminder fields.
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
    status: 'active',
    priority: 0,
    dueAt: null,
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

export function updateTarget(store, id, changes) {
  return {
    ...migrateStore(store),
    targets: migrateStore(store).targets.map((target) => target.id === id ? { ...target, ...changes } : target),
  };
}

export function setTargetStatus(store, id, status) {
  return updateTarget(store, id, { status: status === 'archived' || status === 'complete' ? status : 'active' });
}

export function setTargetPriority(store, id, priority) {
  return updateTarget(store, id, { priority: Math.max(0, Math.min(5, Math.floor(Number(priority) || 0))) });
}

export function setTargetDueDate(store, id, dueAt) {
  return updateTarget(store, id, { dueAt: dueAt || null });
}

export function setTargetReservation(store, reservation) {
  const next = migrateStore(store);
  const reservations = next.reservations.filter((entry) => !(entry.itemType === reservation.itemType && entry.targetId === reservation.targetId));
  const quantity = Math.max(0, Math.floor(Number(reservation.quantity) || 0));
  if (quantity > 0) reservations.push({ itemType: reservation.itemType, targetId: reservation.targetId, quantity });
  return { ...next, reservations };
}
