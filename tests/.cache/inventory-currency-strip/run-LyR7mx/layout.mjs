// src/contexts/UiContext.jsx
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

// src/lib/logging/logger.js
import { invoke as rawInvoke } from "@tauri-apps/api/core";

// src/lib/logging/eventEnvelope.js
var LOG_SCHEMA = 1;

// src/lib/logging/logger.js
var MAX_QUEUE = 500;
var BATCH_SIZE = 25;
var REDACTED = "[REDACTED]";
var sessionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
var startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
var nativeFetch = globalThis.fetch?.bind(globalThis);
var sequence = 0;
var queue = [];
var retryTimer = null;
var retryDelay = 1e3;
var retryUntil = 0;
var flushing = false;
var inFlightInvokes = /* @__PURE__ */ new Set();
var context = { window: "main", screen: void 0, route: void 0, component: void 0 };
var recentEventNames = [];
var farmingModelBuilds = 0;
var SENSITIVE_KEYS = /token|authorization|password|account.?id|chat|typed|credential|secret|cookie/i;
var PATH_KEYS = /path|filename|file_name|directory|filesystem/i;
var ALLOWED_KEYS = /^(count|size|status|method|host|route|screen|item|item_unique_name|type|kind|phase|outcome|duration_ms|threshold|threshold_ms|axis|source|direction|position|extent|viewport|visible_range|hash|cache|redacted|length|command|request_id|result_type|error_type|last_event_names|current_screen|heap_used_bytes|heap_total_bytes|dom_elements|dom_images|window_width|window_height|farming_model_builds|bytes)$/;
function id() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function redact(value, key = "", depth = 0) {
  if (value == null) return value;
  if (depth > 3) return "[TRUNCATED]";
  if (SENSITIVE_KEYS.test(key)) return { redacted: true, type: typeof value, length: String(value).length };
  if (PATH_KEYS.test(key)) return REDACTED;
  if (typeof value === "string") {
    if (/^(\/|[A-Za-z]:[\\/])/.test(value) || /(url|uri|request)/i.test(key) && value.includes("?")) return REDACTED;
    return value.length > 512 ? `${value.slice(0, 512)}\u2026[TRUNCATED]` : value;
  }
  if (typeof value !== "object") return value;
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
  if (!error) return void 0;
  if (error instanceof Error) return { name: error.name, message: redact(error.message), stack: redact(error.stack || "") };
  return { name: "ThrownValue", message: redact(String(error)) };
}
function enqueue(record) {
  if (queue.length >= MAX_QUEUE) queue.shift();
  queue.push(record);
  if (record.level === "error" || record.level === "fatal" || queue.length >= BATCH_SIZE) {
    void flush();
  }
}
function trackInvoke(operation) {
  const pending = operation();
  let tracked;
  tracked = pending.finally(() => inFlightInvokes.delete(tracked));
  inFlightInvokes.add(tracked);
  return tracked;
}
function scheduleRetry() {
  if (retryTimer || !queue.length) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flush();
  }, Math.max(0, retryUntil - Date.now()));
}
async function flush() {
  if (flushing || queue.length === 0) return;
  if (Date.now() < retryUntil) {
    scheduleRetry();
    return;
  }
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  flushing = true;
  const batch = queue.splice(0, BATCH_SIZE);
  try {
    await trackInvoke(() => rawInvoke("structured_log_batch", { events: batch }));
    retryDelay = 1e3;
    retryUntil = 0;
  } catch {
    queue = batch.concat(queue).slice(-MAX_QUEUE);
    retryUntil = Date.now() + retryDelay;
    retryDelay = Math.min(retryDelay * 2, 3e4);
    scheduleRetry();
  } finally {
    flushing = false;
    if (queue.length && Date.now() >= retryUntil && !retryTimer) void flush();
  }
}
function event(name, payload = {}, metadata = {}) {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const record = {
    schema: LOG_SCHEMA,
    event_id: id(),
    session_id: sessionId,
    sequence: ++sequence,
    timestamp_utc: (/* @__PURE__ */ new Date()).toISOString(),
    monotonic_ms: now - startedAt,
    process: "kiedas-orbiter",
    window: context.window || "main",
    source: metadata.source || "frontend",
    level: metadata.level || "info",
    event: name,
    screen: metadata.screen ?? context.screen,
    route: metadata.route ?? context.route,
    component: metadata.component ?? context.component,
    control_id: metadata.controlId,
    interaction: metadata.interaction,
    correlation_id: metadata.correlationId,
    parent_event_id: metadata.parentEventId,
    phase: metadata.phase,
    duration_ms: metadata.durationMs,
    outcome: metadata.outcome,
    payload: redact(payload),
    error: normalizeError(metadata.error),
    build: { app_version: "1.3.3", platform: typeof navigator !== "undefined" ? navigator.platform : "unknown", locale: typeof navigator !== "undefined" ? navigator.language : "unknown" }
  };
  recentEventNames.push(name);
  if (recentEventNames.length > 20) recentEventNames.shift();
  if (name === "farming.model.build.completed") farmingModelBuilds += 1;
  enqueue(Object.fromEntries(Object.entries(record).filter(([, value]) => value !== void 0)));
  return record;
}
function startSpan(name, metadata = {}) {
  const correlationId = id();
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  const startEvent = event(`${name}.started`, metadata.payload || {}, { ...metadata, correlationId, phase: "started" });
  return {
    correlationId,
    eventId: startEvent.event_id,
    complete(payload = {}, extra = {}) {
      return event(`${name}.completed`, payload, { ...metadata, ...extra, correlationId, parentEventId: startEvent.event_id, phase: "complete", outcome: "success", durationMs: elapsed(started) });
    },
    fail(err, payload = {}, extra = {}) {
      return event(`${name}.failed`, payload, { ...metadata, ...extra, correlationId, parentEventId: startEvent.event_id, phase: "failed", outcome: "failure", durationMs: elapsed(started), error: err });
    }
  };
}
var elapsed = (started) => (typeof performance !== "undefined" ? performance.now() : Date.now()) - started;
async function action(control, operation) {
  const span = startSpan("ui.control.activate", { controlId: control?.id || control, interaction: control?.interaction || "activate", payload: { control_id: control?.id || control } });
  try {
    const result = await operation(span);
    span.complete({ result_type: typeof result });
    return result;
  } catch (err) {
    span.fail(err);
    throw err;
  }
}
var ipc = (command, args, operation) => action({ id: `ipc:${command}`, interaction: "invoke" }, async (span) => {
  event("ipc.invoke.started", { command, args }, { correlationId: span.correlationId, phase: "started", source: "ipc" });
  try {
    const result = await operation();
    event("ipc.invoke.completed", { command, result_type: typeof result }, { correlationId: span.correlationId, phase: "complete", outcome: "success", source: "ipc" });
    return result;
  } catch (err) {
    event("ipc.invoke.failed", { command }, { correlationId: span.correlationId, phase: "failed", outcome: "failure", source: "ipc", error: err });
    throw err;
  }
});
async function invoke(command, args) {
  return trackInvoke(() => ipc(command, args, () => rawInvoke(command, args)));
}

// src/lib/logging/tauri.js
import { convertFileSrc } from "@tauri-apps/api/core";

// src/lib/settings.js
import { listen } from "@tauri-apps/api/event";
var cachedSettings = null;
var listeners = /* @__PURE__ */ new Set();
listen("settings-changed", async () => {
  try {
    cachedSettings = await invoke("load_settings");
    listeners.forEach((fn) => fn(cachedSettings));
  } catch {
  }
});

// src/contexts/UiContext.jsx
import { jsx } from "react/jsx-runtime";
var UiContext = createContext(null);
function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi must be used within a UiProvider");
  return ctx;
}

// src/components/PreviewInventoryLayout.jsx
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
function PreviewInventoryLayout({ stats, controls }) {
  const { t } = useUi();
  return /* @__PURE__ */ jsxs("section", { "aria-label": t("preview.landmark.inventory_controls"), className: "min-w-0", children: [
    stats && /* @__PURE__ */ jsx2("div", { className: "mb-3 overflow-x-auto overflow-y-hidden custom-scrollbar", "aria-label": t("preview.landmark.account_resources"), children: stats }),
    /* @__PURE__ */ jsx2("div", { className: "min-w-0", children: controls })
  ] });
}
export {
  PreviewInventoryLayout,
  UiContext
};
