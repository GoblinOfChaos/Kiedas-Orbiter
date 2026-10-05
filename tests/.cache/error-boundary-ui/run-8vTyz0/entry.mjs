// src/components/ErrorBoundary.jsx
import { Component } from "react";

// src/contexts/UiContext.jsx
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

// tests/ui/tauri-stub.mjs
var invoke = async () => null;

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
    await trackInvoke(() => invoke("structured_log_batch", { events: batch }));
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
async function invoke2(command, args) {
  return trackInvoke(() => ipc(command, args, () => invoke(command, args)));
}

// src/lib/settings.js
import { listen } from "@tauri-apps/api/event";
var cachedSettings = null;
var listeners = /* @__PURE__ */ new Set();
listen("settings-changed", async () => {
  try {
    cachedSettings = await invoke2("load_settings");
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

// src/components/ErrorBoundary.jsx
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
var ENGLISH_ERROR_TEXT = {
  "error_boundary.title": "Something went wrong",
  "error_boundary.message": "An unexpected error occurred and the app couldn't continue. Reloading usually fixes this.",
  "error_boundary.reload": "Reload",
  "error_boundary.load_failed_title": "Failed to load game data",
  "error_boundary.load_failed_message": "The app could not load its core game-data files and cannot continue. This usually means a disk read error or a corrupted data folder.",
  "error_boundary.retry": "Retry"
};
function translateOrEnglish(t, key) {
  const translated = t?.(key);
  return translated && translated !== key ? translated : ENGLISH_ERROR_TEXT[key];
}
var ErrorBoundary = class extends Component {
  static contextType = UiContext;
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Unhandled render error:", error, info);
  }
  render() {
    const t = (key) => translateOrEnglish(this.context?.t, key);
    if (this.state.error) {
      return /* @__PURE__ */ jsx2("div", { className: "fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm", children: /* @__PURE__ */ jsxs("div", { className: "bg-kronos-bg border border-red-500/30 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl", children: [
        /* @__PURE__ */ jsx2("h2", { className: "text-lg font-black uppercase tracking-tight text-red-400 mb-2", children: t("error_boundary.title") }),
        /* @__PURE__ */ jsx2("p", { className: "text-xs text-kronos-dim mb-4", children: t("error_boundary.message") }),
        /* @__PURE__ */ jsx2("pre", { className: "text-[10px] text-kronos-dim/70 bg-black/30 rounded-lg p-3 mb-4 overflow-auto max-h-40 whitespace-pre-wrap", children: String(this.state.error?.message || this.state.error) }),
        /* @__PURE__ */ jsx2(
          "button",
          {
            onClick: () => window.location.reload(),
            className: "w-full py-3 rounded-xl font-black uppercase tracking-wider text-sm bg-kronos-accent text-kronos-bg hover:brightness-110 transition-all",
            children: t("error_boundary.reload")
          }
        )
      ] }) });
    }
    return this.props.children;
  }
};
function CriticalLoadErrorScreen({ message }) {
  const { t } = useUi();
  return /* @__PURE__ */ jsx2("div", { className: "fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm", children: /* @__PURE__ */ jsxs("div", { className: "bg-kronos-bg border border-red-500/30 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl", children: [
    /* @__PURE__ */ jsx2("h2", { className: "text-lg font-black uppercase tracking-tight text-red-400 mb-2", children: translateOrEnglish(t, "error_boundary.load_failed_title") }),
    /* @__PURE__ */ jsx2("p", { className: "text-xs text-kronos-dim mb-4", children: message || translateOrEnglish(t, "error_boundary.load_failed_message") }),
    /* @__PURE__ */ jsx2(
      "button",
      {
        onClick: () => window.location.reload(),
        className: "w-full py-3 rounded-xl font-black uppercase tracking-wider text-sm bg-kronos-accent text-kronos-bg hover:brightness-110 transition-all",
        children: translateOrEnglish(t, "error_boundary.retry")
      }
    )
  ] }) });
}
export {
  CriticalLoadErrorScreen,
  ErrorBoundary,
  UiContext
};
