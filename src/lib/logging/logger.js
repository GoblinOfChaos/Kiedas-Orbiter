import { invoke as rawInvoke } from '@tauri-apps/api/core';
import { LOG_SCHEMA } from './eventEnvelope';

const MAX_QUEUE = 500;
const BATCH_SIZE = 25;
const FLUSH_MS = 250;
const REDACTED = '[REDACTED]';
const sessionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
const nativeFetch = globalThis.fetch?.bind(globalThis);
let sequence = 0;
let queue = [];
let flushTimer = null;
let flushing = false;
let context = { window: 'main', screen: undefined, route: undefined, component: undefined };

const SENSITIVE_KEYS = /token|authorization|password|account.?id|chat|typed|credential|secret|cookie/i;
const PATH_KEYS = /path|filename|file_name|directory|filesystem/i;
const ALLOWED_KEYS = /^(count|size|status|method|host|route|screen|item|item_unique_name|type|kind|phase|outcome|duration_ms|threshold|axis|source|direction|position|extent|viewport|visible_range|hash|cache|redacted|length|command|request_id|result_type|error_type)$/;

function id() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export function redact(value, key = '', depth = 0) {
  if (value == null) return value;
  if (depth > 3) return '[TRUNCATED]';
  if (SENSITIVE_KEYS.test(key)) return { redacted: true, type: typeof value, length: String(value).length };
  if (PATH_KEYS.test(key)) return REDACTED;
  if (typeof value === 'string') {
    if (/^(\/|[A-Za-z]:[\\/])/.test(value) || (/(url|uri|request)/i.test(key) && value.includes('?'))) return REDACTED;
    return value.length > 512 ? `${value.slice(0, 512)}…[TRUNCATED]` : value;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, key, depth + 1));
  const result = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    if (!ALLOWED_KEYS.test(childKey) && depth > 0) {
      if (SENSITIVE_KEYS.test(childKey) || PATH_KEYS.test(childKey)) result[childKey] = redact(childValue, childKey, depth + 1);
      continue;
    }
    result[childKey] = redact(childValue, childKey, depth + 1);
  }
  return result;
}

function normalizeError(error) {
  if (!error) return undefined;
  if (error instanceof Error) return { name: error.name, message: redact(error.message), stack: redact(error.stack || '') };
  return { name: 'ThrownValue', message: redact(String(error)) };
}

function enqueue(record) {
  if (queue.length >= MAX_QUEUE) queue.shift();
  queue.push(record);
  if (record.level === 'error' || record.level === 'fatal' || queue.length >= BATCH_SIZE) {
    void flush();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => { flushTimer = null; void flush(); }, FLUSH_MS);
  }
}

export async function flush() {
  if (flushing || queue.length === 0) return;
  flushing = true;
  const batch = queue.splice(0, BATCH_SIZE);
  try { await rawInvoke('structured_log_batch', { events: batch }); }
  catch { queue = batch.concat(queue).slice(-MAX_QUEUE); }
  finally { flushing = false; if (queue.length) void flush(); }
}

export function setLogContext(next = {}) { context = { ...context, ...next }; }
export function getSessionId() { return sessionId; }

export function event(name, payload = {}, metadata = {}) {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const record = {
    schema: LOG_SCHEMA, event_id: id(), session_id: sessionId, sequence: ++sequence,
    timestamp_utc: new Date().toISOString(), monotonic_ms: now - startedAt,
    process: 'kiedas-orbiter', window: context.window || 'main', source: metadata.source || 'frontend',
    level: metadata.level || 'info', event: name, screen: metadata.screen ?? context.screen,
    route: metadata.route ?? context.route, component: metadata.component ?? context.component,
    control_id: metadata.controlId, interaction: metadata.interaction, correlation_id: metadata.correlationId,
    parent_event_id: metadata.parentEventId, phase: metadata.phase, duration_ms: metadata.durationMs,
    outcome: metadata.outcome, payload: redact(payload), error: normalizeError(metadata.error),
    build: { app_version: '1.3.3', platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown', locale: typeof navigator !== 'undefined' ? navigator.language : 'unknown' }
  };
  enqueue(Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)));
  return record;
}

export const trace = (name, payload, metadata) => event(name, payload, { ...metadata, level: 'trace' });
export const debug = (name, payload, metadata) => event(name, payload, { ...metadata, level: 'debug' });
export const info = (name, payload, metadata) => event(name, payload, { ...metadata, level: 'info' });
export const warn = (name, payload, metadata) => event(name, payload, { ...metadata, level: 'warn' });
export const error = (name, payload, metadata) => event(name, payload, { ...metadata, level: 'error' });
export const fatal = (name, payload, metadata) => event(name, payload, { ...metadata, level: 'fatal' });

export function startSpan(name, metadata = {}) {
  const correlationId = id();
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const startEvent = event(`${name}.started`, metadata.payload || {}, { ...metadata, correlationId, phase: 'started' });
  return {
    correlationId,
    eventId: startEvent.event_id,
    complete(payload = {}, extra = {}) { return event(`${name}.completed`, payload, { ...metadata, ...extra, correlationId, parentEventId: startEvent.event_id, phase: 'complete', outcome: 'success', durationMs: elapsed(started) }); },
    fail(err, payload = {}, extra = {}) { return event(`${name}.failed`, payload, { ...metadata, ...extra, correlationId, parentEventId: startEvent.event_id, phase: 'failed', outcome: 'failure', durationMs: elapsed(started), error: err }); }
  };
}

const elapsed = (started) => (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started;

export async function action(control, operation) {
  const span = startSpan('ui.control.activate', { controlId: control?.id || control, interaction: control?.interaction || 'activate', payload: { control_id: control?.id || control } });
  try { const result = await operation(span); span.complete({ result_type: typeof result }); return result; }
  catch (err) { span.fail(err); throw err; }
}
export const screen = (name, route = name) => { setLogContext({ screen: name, route }); event('screen.mount.started', { screen: name }, { phase: 'started' }); return event('screen.mount.completed', { screen: name }, { phase: 'complete' }); };
export const scroll = (container, details) => event(`scroll.${details.phase || 'sample'}`, { container_id: container?.id || container, ...details }, { screen: details.screen, source: 'frontend' });
export const ipc = (command, args, operation) => action({ id: `ipc:${command}`, interaction: 'invoke' }, async (span) => { event('ipc.invoke.started', { command, args }, { correlationId: span.correlationId, phase: 'started', source: 'ipc' }); try { const result = await operation(); event('ipc.invoke.completed', { command, result_type: typeof result }, { correlationId: span.correlationId, phase: 'complete', outcome: 'success', source: 'ipc' }); return result; } catch (err) { event('ipc.invoke.failed', { command }, { correlationId: span.correlationId, phase: 'failed', outcome: 'failure', source: 'ipc', error: err }); throw err; } });
export const network = (request, operation) => action({ id: `network:${request?.url || request}`, interaction: 'request' }, async (span) => { event('network.request.started', { method: request?.method || 'GET', host: safeHost(request?.url || request), path: safePath(request?.url || request) }, { correlationId: span.correlationId, source: 'network', phase: 'started' }); try { const result = await operation(); event('network.request.completed', { status: result?.status, type: result?.constructor?.name }, { correlationId: span.correlationId, source: 'network', phase: 'complete', outcome: 'success' }); return result; } catch (err) { event('network.request.failed', {}, { correlationId: span.correlationId, source: 'network', phase: 'failed', outcome: 'failure', error: err }); throw err; } });
function safeHost(value) { try { return new URL(value, window.location.href).host; } catch { return 'unknown'; } }
function safePath(value) { try { return new URL(value, window.location.href).pathname.slice(0, 160); } catch { return '[REDACTED]'; } }

export async function invoke(command, args) { return ipc(command, args, () => rawInvoke(command, args)); }

// Tauri's own invoke() transport issues an internal fetch('ipc://localhost/...')
// call on this platform. Wrapping THAT in network()/event() logging fed back
// into itself: every invoke (including the logger's own batch-flush invoke)
// produced a logged "network request", which queued more events, which
// triggered more flushes, which called invoke() again - a runaway loop that
// wrote hundreds of thousands of lines and ~1GB/minute to disk. ipc:// is
// Tauri's internal transport, not an application-level network request, so
// it must always bypass logging entirely (not even a cheap early return -
// no event, no queue touch) to keep this loop from ever restarting.
const isInternalIpcUrl = (value) => {
  try { return new URL(value, window.location.href).protocol === 'ipc:'; } catch { return false; }
};

export async function loggedFetch(input, init) {
  const url = typeof input === 'string' ? input : input?.url;
  if (isInternalIpcUrl(url)) return nativeFetch(input, init);
  return network({ url, method: init?.method || input?.method || 'GET' }, () => nativeFetch(input, init));
}

export function installFetchLogging() {
  if (!nativeFetch || globalThis.__kiedasLoggedFetch) return;
  globalThis.__kiedasLoggedFetch = true;
  globalThis.fetch = (input, init) => loggedFetch(input, init);
}

export function installUiDelegation(root = document) {
  const handler = (domEvent) => {
    const target = domEvent.target?.closest?.('[data-log-id],button,a,input,select,textarea,[role="button"],[role="tab"],[role="menuitem"]');
    if (!target || target.dataset.logSensitive === 'true') return;
    const id = target.dataset.logId || `auto.${target.tagName.toLowerCase()}.${target.id || target.getAttribute('aria-label') || target.getAttribute('name') || 'anonymous'}`;
    const type = domEvent.type;
    if (type === 'click' || type === 'pointerdown' || type === 'pointerup' || type === 'focusin' || type === 'focusout' || type === 'change' || type === 'input' || type === 'keydown') {
      if (type === 'keydown' && !['Enter', ' ', 'Escape', 'Tab'].includes(domEvent.key)) return;
      const eventName = type === 'click' ? 'ui.control.activate' : `ui.${type}`;
      event(eventName, { role: target.dataset.logRole || target.getAttribute('role') || target.tagName.toLowerCase(), scope: target.dataset.logScope }, { controlId: id, interaction: type, phase: 'complete' });
    }
  };
  for (const type of ['click', 'pointerdown', 'pointerup', 'focusin', 'focusout', 'change', 'input', 'keydown']) root.addEventListener(type, handler, true);
  return () => { for (const type of ['click', 'pointerdown', 'pointerup', 'focusin', 'focusout', 'change', 'input', 'keydown']) root.removeEventListener(type, handler, true); };
}

export function instrumentScroll(element, containerId, options = {}) {
  if (!element) return () => {};
  element.dataset.logScrollId = containerId;
  let active = false; let lastTop = element.scrollTop; let lastSample = 0; let stopTimer;
  const thresholds = options.thresholds || [0.25, 0.5, 0.75, 1]; const crossed = new Set();
  const onScroll = () => {
    const now = Date.now(); const top = element.scrollTop; const max = Math.max(0, element.scrollHeight - element.clientHeight); const progress = max ? top / max : 0;
    if (!active) { active = true; scroll(containerId, { phase: 'started', axis: 'y', source: 'user', position: top, extent: max, viewport: element.clientHeight }); }
    if (now - lastSample >= (options.interval || 250)) { lastSample = now; scroll(containerId, { phase: 'sample', axis: 'y', source: 'user', position: top, extent: max, viewport: element.clientHeight, direction: top >= lastTop ? 'forward' : 'backward' }); }
    thresholds.forEach((threshold) => { if (progress >= threshold && !crossed.has(threshold)) { crossed.add(threshold); scroll(containerId, { phase: 'threshold_crossed', threshold, position: top, extent: max, viewport: element.clientHeight }); } });
    if (progress >= 0.99 && !crossed.has('end')) { crossed.add('end'); scroll(containerId, { phase: 'reached_end', position: top, extent: max, viewport: element.clientHeight }); }
    lastTop = top; clearTimeout(stopTimer); stopTimer = setTimeout(() => { active = false; scroll(containerId, { phase: 'stopped', position: element.scrollTop, extent: Math.max(0, element.scrollHeight - element.clientHeight), viewport: element.clientHeight }); }, options.stopDelay || 180);
  };
  element.addEventListener('scroll', onScroll, { passive: true });
  event('scroll.container.mounted', { container_id: containerId, axis: 'y' }, { phase: 'complete' });
  return () => { clearTimeout(stopTimer); element.removeEventListener('scroll', onScroll); };
}
