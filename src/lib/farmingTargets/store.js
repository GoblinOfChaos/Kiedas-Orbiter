/** Persistence and pure mutations for Preview Farming Targets. */
import { invoke } from '../logging/tauri.js';

const RELATIVE_PATH = 'data/user/farming-targets.json';
const CURRENT_VERSION = 2;

function emptyStore() { return { version: CURRENT_VERSION, targets: [], reservations: [], priorities: {} }; }

function migrateStore(store) {
  if (!store || typeof store !== 'object' || !Array.isArray(store.targets)) return emptyStore();
  if (Number(store.version ?? 1) > CURRENT_VERSION) return { ...store };
  return { ...emptyStore(), ...store, version: CURRENT_VERSION,
    targets: store.targets.map((target) => ({ ...target, status: target.status || 'active',
      priority: Number.isFinite(Number(target.priority)) ? Number(target.priority) : 0,
      dueAt: target.dueAt ?? null, reservations: Array.isArray(target.reservations) ? target.reservations : [],
      reminders: Array.isArray(target.reminders) ? target.reminders : [] })),
    reservations: Array.isArray(store.reservations) ? store.reservations : [],
    priorities: store.priorities && typeof store.priorities === 'object' ? store.priorities : {} };
}

function defaultIo() {
  const injected = globalThis.__farmingTargetTestIO;
  if (injected) return { dataRoot: async () => '', ...injected };
  return { read: async () => invoke('read_file_bytes', { relative: RELATIVE_PATH }),
    write: async (path, data) => invoke('write_file', { path, data }),
    dataRoot: async () => invoke('get_data_root_path') };
}

export function createFarmingTargetsStore(io = {}) {
  const adapter = {
    read: (...args) => (io.read ?? defaultIo().read)(...args),
    write: (...args) => (io.write ?? defaultIo().write)(...args),
    dataRoot: (...args) => io.dataRoot ? io.dataRoot(...args) : (io.read || io.write ? '' : defaultIo().dataRoot(...args)),
  };
  const backedUpVersions = new Set();
  let mutationQueue = Promise.resolve();
  const load = async () => {
    let raw;
    try { raw = new TextDecoder().decode(new Uint8Array(await adapter.read())); } catch (error) {
      const message = String(error?.message || error || '').toLowerCase();
      return message.includes('not found') ? emptyStore() : { ...emptyStore(), readOnlyLoadError: true, loadError: String(error?.message || error) };
    }
    let parsed;
    try { parsed = JSON.parse(raw); } catch (error) {
      return { ...emptyStore(), readOnlyCorrupt: true, rawText: raw, loadError: String(error.message || error) };
    }
    const version = Number(parsed?.version ?? 1);
    if (version < CURRENT_VERSION && !backedUpVersions.has(version)) {
      backedUpVersions.add(version);
      try {
        const root = adapter.dataRoot ? await adapter.dataRoot() : '';
        const timestamp = typeof io.now === 'function' ? io.now() : Date.now();
        await adapter.write(`${root ? `${root}/` : ''}${RELATIVE_PATH}.bak-${timestamp}-v${version}`, new TextEncoder().encode(raw));
      } catch {
        return { ...migrateStore(parsed), readOnlyBackup: true, backupError: 'Unable to create migration backup' };
      }
    }
    return migrateStore(parsed);
  };
  const save = async (store) => {
    if (store?.readOnlyCorrupt) throw new Error('Refusing to overwrite corrupt farming targets file');
    if (store?.readOnlyBackup) throw new Error('Refusing to migrate without a farming targets backup');
    if (store?.readOnlyLoadError) throw new Error('Refusing to overwrite after a failed farming targets load');
    const next = migrateStore(store);
    const root = adapter.dataRoot ? await adapter.dataRoot() : '';
    await adapter.write(`${root ? `${root}/` : ''}${RELATIVE_PATH}`, new TextEncoder().encode(JSON.stringify(next, null, 2)));
    return next;
  };
  const mutate = (mutator) => {
    const operation = mutationQueue.then(async () => {
      const current = await load();
      if (current.readOnlyCorrupt) throw new Error('Farming targets file is corrupt and read-only');
      return save(await mutator(current));
    });
    mutationQueue = operation.catch(() => {});
    return operation;
  };
  return { load, save, mutate, migrate: migrateStore };
}

const sharedStore = createFarmingTargetsStore();
let sharedValue = null;
const subscribers = new Set();
function publish(value) { sharedValue = value; subscribers.forEach((listener) => listener(value)); return value; }
export async function loadFarmingTargets() { return publish(await sharedStore.load()); }
export async function saveFarmingTargets(store) { return publish(await sharedStore.save(store)); }
export function mutateFarmingTargets(mutator) {
  return sharedStore.mutate(mutator).then(publish);
}
export function subscribeFarmingTargets(listener) { subscribers.add(listener); if (sharedValue) listener(sharedValue); return () => subscribers.delete(listener); }
export function getFarmingTargetsStore() { return sharedValue; }
export const CURRENT_FARMING_TARGETS_VERSION = CURRENT_VERSION;

export function createFarmingTarget({ uniqueName, name, image, category, quantity = 1, note = '' }) {
  return { id: crypto.randomUUID(), uniqueName, name, image: image || null, category: category || null,
    quantity: Math.max(1, Math.floor(quantity) || 1), note, status: 'active', priority: 0, dueAt: null,
    createdAt: Date.now(), reservations: [], reminders: [] };
}
export function addTarget(store, target) { const next = migrateStore(store); return { ...next, targets: [...next.targets, target] }; }
export function removeTarget(store, id) { const next = migrateStore(store); return { ...next, targets: next.targets.filter((target) => target.id !== id) }; }
export function setTargetQuantity(store, id, quantity) { const next = migrateStore(store); const safeQuantity = Math.max(1, Math.floor(quantity) || 1); return { ...next, targets: next.targets.map((target) => target.id === id ? { ...target, quantity: safeQuantity } : target) }; }
export function setTargetNote(store, id, note) { const next = migrateStore(store); return { ...next, targets: next.targets.map((target) => target.id === id ? { ...target, note } : target) }; }
export function updateTarget(store, id, changes) { const next = migrateStore(store); return { ...next, targets: next.targets.map((target) => target.id === id ? { ...target, ...changes } : target) }; }
export function setTargetStatus(store, id, status) { return updateTarget(store, id, { status: status === 'archived' || status === 'complete' ? status : 'active' }); }
export function setTargetPriority(store, id, priority) { return updateTarget(store, id, { priority: Math.max(0, Math.min(5, Math.floor(Number(priority) || 0))) }); }
export function setTargetDueDate(store, id, dueAt) { return updateTarget(store, id, { dueAt: dueAt || null }); }
export function setTargetReservation(store, reservation) {
  const next = migrateStore(store);
  if (!reservation || !reservation.itemType || !reservation.targetId) return next;
  const reservations = next.reservations.filter((entry) => !(entry.itemType === reservation.itemType && entry.targetId === reservation.targetId));
  const quantity = Math.max(0, Math.floor(Number(reservation.quantity) || 0));
  if (quantity > 0) reservations.push({ itemType: reservation.itemType, targetId: reservation.targetId, quantity });
  return { ...next, reservations };
}
