// src/screens/FarmingTargets.jsx
import { useState as useState10, useEffect as useEffect8, useMemo as useMemo2, useCallback as useCallback5 } from "react";
import { Search, Plus, Minus, Trash2, Target as TargetIcon, ChevronRight, Archive, CheckCircle2 } from "lucide-react";

// tests/ui/tauri-stub.mjs
var invoke = async () => null;

// src/lib/logging/eventEnvelope.js
var LOG_SCHEMA = 1;

// src/lib/logging/logger.js
var MAX_QUEUE = 500;
var BATCH_SIZE = 25;
var FLUSH_MS = 250;
var REDACTED = "[REDACTED]";
var sessionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
var startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
var nativeFetch = globalThis.fetch?.bind(globalThis);
var sequence = 0;
var queue = [];
var flushTimer = null;
var retryTimer = null;
var retryDelay = 1e3;
var retryUntil = 0;
var flushing = false;
var inFlightInvokes = /* @__PURE__ */ new Set();
var context = { window: "main", screen: void 0, route: void 0, component: void 0 };
var SENSITIVE_KEYS = /token|authorization|password|account.?id|chat|typed|credential|secret|cookie/i;
var PATH_KEYS = /path|filename|file_name|directory|filesystem/i;
var ALLOWED_KEYS = /^(count|size|status|method|host|route|screen|item|item_unique_name|type|kind|phase|outcome|duration_ms|threshold|axis|source|direction|position|extent|viewport|visible_range|hash|cache|redacted|length|command|request_id|result_type|error_type)$/;
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
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flush();
    }, FLUSH_MS);
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

// src/components/UI.jsx
import { useRef as useRef3, useEffect as useEffect3, useState as useState3 } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle, RefreshCw, ChevronDown } from "lucide-react";

// src/contexts/UiContext.jsx
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

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

// src/contexts/MonitoringContext.jsx
import { createContext as createContext2, useContext as useContext2, useState as useState2, useRef as useRef2, useCallback as useCallback2, useEffect as useEffect2, useMemo } from "react";
import * as Comlink from "comlink";

// src-tauri/data/assets/data/wiki-baro-acquisition.json
var wiki_baro_acquisition_default = {
  "10 x Ki'Teer Fireworks": true,
  "10th Anniversary Login Music": true,
  "1999 Drippy Glyph": true,
  "3 Day Affinity Booster": true,
  "3 Day Credit Booster": true,
  "3 Day Mod Drop Chance Booster": true,
  "3 Day Resource Booster": true,
  "5 x Corrupted Bombard Specter": true,
  "5 x Corrupted Heavy Gunner Specter": true,
  "Abyss of Dagath Login Music": true,
  "Aged Claret of Denas": true,
  "Akka Luxxum Ornament": true,
  "Altra Sentinel Mask": true,
  "Altra Sentinel Skin": true,
  "Altra Sentinel Tail": true,
  "Altra Sentinel Wings": true,
  "Angels of the Zariman Login Music": true,
  "Anpu Staff Skin": true,
  "Anpu Sugatra": true,
  "Archwing Articula": true,
  "Asra Luxxum Ornament": true,
  "Astral Twilight": true,
  "Atrox Gene-Masking Kit": true,
  "Ava-Clem Community Glyph": true,
  "Axi A2 Relic": true,
  "Axi A5 Relic": true,
  "Axi A8 Relic": true,
  "Axi M5 Relic": true,
  "Axi V8 Relic": true,
  "Baro Ki'Teer Floof": true,
  "Baro Ki'Teer Glyph": true,
  "Baruuk Doan Silhouette Glyph": true,
  "Baruuk Immortal Skin": true,
  "Basilisk Fighter Decoration": true,
  "Beachcomber Domestik Drone": true,
  "Bekran Zaft's Equipment": true,
  "Blue Ki'Teer Safari K-Drive Scrawl": true,
  "Boar Elixis Skin": true,
  "Bronze Kavat Bust": true,
  "Bronze Kubrow Bust": true,
  "Buzz Kill": true,
  "Chroma Immortal Skin": true,
  "Class of Ten Zero Poster": true,
  "Clatharc Planter": true,
  "Coccyst Sugatra": true,
  "Collision Force": true,
  "Combo Fury": true,
  "Combo Killer": true,
  "Community Clem Comic Glyph": true,
  "Condrix Sigil": true,
  "Cookie Kavat Glyph": true,
  "Cookie Kubrow Glyph": true,
  "Corpus Glyph": true,
  "Corrupted Bombard Specter Blueprint": true,
  "Crash Course": true,
  "Cutter Fighter Decoration": true,
  "Dante Unbound Login Music": true,
  "Dark Sword Day of the Dead Skin": true,
  "De Nas Pistol Skin": true,
  "Deimos Carnis Prex": true,
  "Deimos Fass Prex": true,
  "Deimos Flagellocanth Prex": true,
  "Deimos Jugulus Prex": true,
  "Deimos Kymaeros Prex": true,
  "Deimos Lobotriscid Prex": true,
  "Deimos Saxum Prex": true,
  "Deimos Scissus Prex": true,
  "Deimos Velocipod Prex": true,
  "Desert Skate Floof": true,
  "Despair Emblem": true,
  "Diriga Desert-Camo Skin": true,
  "Display - Argyle": true,
  "Dog Days Protea Display": true,
  "Domestik Dais Drone": true,
  "Domestik Ki'Teer Drone": true,
  "Domestik Ki'Teer Drone (Lavender Ice)": true,
  "Domestik Soag Drone": true,
  "Domus Syandana": true,
  "Don't Be Afraid Poster": true,
  "Dragon Mod Pack": true,
  "Dread Day of the Dead Skin": true,
  "Drippy Sigil": true,
  "Dual Sword Lemnas Skin": true,
  "Dvad Luxxum Ornament": true,
  "Elixis Latron Chest Plate": true,
  "Elixis Latron Leg Plate": true,
  "Elixis Latron Pistol Skin": true,
  "Elixis Latron Shoulder Plate (Left)": true,
  Eminence: true,
  "Empyrean Login Music": true,
  "Empyrean Vignette": true,
  "Entrati Eye Glyph": true,
  "Eos Prime Armor Set": true,
  "Eos Prime Chest Plate": true,
  "Eskhatos Grimoire Skin": true,
  "Eskhatos Ki'Teer Chest Guard": true,
  "Eskhatos Ki'Teer Ephemera": true,
  "Eskhatos Ki'Teer Knee Guards": true,
  "Eskhatos Ki'Teer Shoulder Guards": true,
  "Eskhatos Necraloid Sigil": true,
  "Excalibur Proto-Armor in Action Glyph": true,
  "Exo-Sac Archwing Skin": true,
  "Exploration Poster": true,
  "Fae Path Ephemera": true,
  "Falcon Mod Pack": true,
  "Fanged Fusillade": true,
  "Fass Floof": true,
  "Feasting Hamster Glyph": true,
  "Flak Fighter Decoration": true,
  "Flare Varleon & Lizzie Poster Display": true,
  "Full Contact": true,
  "Gara Immortal Skin": true,
  "Garv & Latrox Poster": true,
  "Giving Snake Glyph": true,
  "Glaring Emblem": true,
  "Glaring Sigil": true,
  "Glaxion Vandal": true,
  "Gorgon Towsun Skin": true,
  "Gotva Prime": true,
  "Grav Lifter Factory": true,
  "Green Ki'Teer Safari K-Drive Scrawl": true,
  "Grineer Glyph": true,
  "Grustrag Three Beacon": true,
  "Guimao Glyph": true,
  "Halikar Wraith": true,
  "Harkonar Wraith Arm Armor": true,
  "Harkonar Wraith Chest Armor": true,
  "Harkonar Wraith Cloak": true,
  "Harkonar Wraith Leg Armor": true,
  "Harpi Fighter Decoration": true,
  "Heart of Deimos Login Music": true,
  "Helios Elixis Skin": true,
  "Hellshell Domestik Drone": true,
  "High Voltage": true,
  "Hydroid Immortal Skin": true,
  "Ignis Towsun Skin": true,
  "Ignis Wraith": true,
  "In Mah Belly Glyph": true,
  "Inaros Floof": true,
  "Inaros Tomb Scene": true,
  "Ivara in Action Glyph": true,
  "Jade Immortal Skin": true,
  "Jade Shadows Login Music": true,
  "Javi Evolution Scrawling": true,
  "Javi Genome Scrawling": true,
  "Javi Luminosity Scrawling": true,
  "Javi Ophiuchus Scrawling": true,
  "Javi's Scrawling": true,
  "Jiachen Glyph": true,
  Jolt: true,
  "Karishh's Dinnerware": true,
  "Kavat Sentinel Mask": true,
  "Kavat Sentinel Tail": true,
  "Kavat Sentinel Wings": true,
  "Ki'Teer": true,
  "Ki'Teer Arrow Skin": true,
  "Ki'Teer Atmos Diadem": true,
  "Ki'Teer Atmos Earpiece": true,
  "Ki'Teer Atmos Mask": true,
  "Ki'Teer Atmos Oculus": true,
  "Ki'Teer Chest Plate": true,
  "Ki'Teer Cornu Diadem": true,
  "Ki'Teer Diax Syandana": true,
  "Ki'Teer Earpiece": true,
  "Ki'Teer Ephemera": true,
  "Ki'Teer Foros Chest Plate": true,
  "Ki'Teer Foros Leg Plates": true,
  "Ki'Teer Foros Shoulder Plates": true,
  "Ki'Teer Greth Chest Plate": true,
  "Ki'Teer Greth Leg Plates": true,
  "Ki'Teer Greth Shoulder Plates": true,
  "Ki'Teer Kavat Armor": true,
  "Ki'Teer Kubrow Armor": true,
  "Ki'Teer Leg Plates": true,
  "Ki'Teer Lux Pedestal": true,
  "Ki'Teer Moa Pet Skin": true,
  "Ki'Teer Presence": true,
  "Ki'Teer Razza Syandana": true,
  "Ki'Teer Reverence Ephemera": true,
  "Ki'Teer Sekhara": true,
  "Ki'Teer Sentinel Mask": true,
  "Ki'Teer Sentinel Tail": true,
  "Ki'Teer Sentinel Wings": true,
  "Ki'Teer Shoulder Plates": true,
  "Ki'Teer Solo Earpiece": true,
  "Ki'Teer Solstice Syandana": true,
  "Ki'Teer Stencil": true,
  "Ki'Teer Straed Syandana": true,
  "Ki'Teer Sugatra": true,
  "Ki'Teer Syandana": true,
  "Ki'Teer Tribute Glyph": true,
  "Koi Sentinel Tail": true,
  "Koumei Dice Glyph": true,
  "Kuva Glyph": true,
  "Left Eos Prime Shoulder Plates": true,
  "Left Eos Prime Spurs": true,
  "Left Prisma Daedalus Knee Plates": true,
  "Left Prisma Daedalus Shoulder Guard": true,
  "Left Prisma Edo Knee Plates": true,
  "Left Prisma Edo Shoulder Plates": true,
  "Lemnas Staff Skin": true,
  "Limbo Immortal Skin": true,
  "Liset Cydonia Skin": true,
  "Liset Prisma Skin": true,
  "Loid Floof": true,
  "Lotus Ephemera": true,
  "Lua's Prey Login Music": true,
  "Lunar Renewal Dragon Emblem": true,
  "Lunar Renewal Horse Emblem": true,
  "Lunar Renewal Ox Sigil": true,
  "Lunar Renewal Rabbit Emblem": true,
  "Lunar Renewal Snake Emblem": true,
  "Lunar Renewal Tiger Emblem": true,
  "Lunar Renewal Tiger Sigil": true,
  "Machete Syachid Skin": true,
  "Machete Wraith": true,
  "Mahd Luxxum Ornament": true,
  Maim: true,
  "Mantis Cydonia Skin": true,
  "Mantis Prisma Skin": true,
  "Mara Detron": true,
  "Mark of the Beast": true,
  "Masker's Theodolite Crewsuit": true,
  "Masker's Theodolite Crewsuit Hood": true,
  "Masker's Theodolite Crewsuit Leggings": true,
  "Masker's Theodolite Crewsuit Sleeves": true,
  "Mesa Immortal Skin": true,
  "Mirage Immortal Skin": true,
  "Mulciber Chest Plate": true,
  "Mulciber Knee Plate": true,
  "Mulciber Shoulder Plate": true,
  "Murmur Glyph": true,
  "Naberus Floating Candles": true,
  "Necraloid Floof": true,
  "Neo O1 Relic": true,
  "Nexus Fur Pattern": true,
  "Nexus Gene-Masking Kit": true,
  "Nidus Immortal Skin": true,
  "Nikana Elixis Skin": true,
  "Noggle Statue - Baro Ki'Teer": true,
  "Noggle Statue - Erra": true,
  "Noggle Statue - Excalibur with Odonata": true,
  "Noggle Statue - Mag with Itzal": true,
  "Noggle Statue - Octavia": true,
  "Noggle Statue - Prime Grineer": true,
  "Noggle Statue - Teshin": true,
  "Noggle Statue - The New War Teshin": true,
  "Noggle Statue - The New War Veso-R": true,
  "Noggle Statue - Zealoid Prelate": true,
  "Odonata Elixis Skin": true,
  "Opticor Elixis Skin": true,
  "Opticor Vandal": true,
  "Ordis Reified Statue": true,
  "Orokin Catalyst": true,
  "Orokin Tower Extraction Scene": true,
  "Pack Leader Emblem": true,
  "Pack Leader Sigil": true,
  "Paracesis Elixis Skin": true,
  "Paracyst Zebra Skin": true,
  "Parazon Poster": true,
  "Paris Abra Skin": true,
  "Peculiar Audience": true,
  "Peculiar End": true,
  "Pedestal Prime": true,
  "Pedestal Umbra": true,
  "Primed Ammo Chain": true,
  "Primed Ammo Stock": true,
  "Primed Animal Instinct": true,
  "Primed Bane of Corpus": true,
  "Primed Bane of Grineer": true,
  "Primed Bane of Infested": true,
  "Primed Bane of Orokin": true,
  "Primed Bane of The Murmur": true,
  "Primed Chamber": true,
  "Primed Charged Shell": true,
  "Primed Chilling Grasp": true,
  "Primed Cleanse Corpus": true,
  "Primed Cleanse Grineer": true,
  "Primed Cleanse Infested": true,
  "Primed Cleanse Orokin": true,
  "Primed Cleanse The Murmur": true,
  "Primed Combustion Rounds": true,
  "Primed Continuity": true,
  "Primed Convulsion": true,
  "Primed Counterbalance": true,
  "Primed Cryo Rounds": true,
  "Primed Deadly Efficiency": true,
  "Primed Dual Rounds": true,
  "Primed Expel Corpus": true,
  "Primed Expel Grineer": true,
  "Primed Expel Infested": true,
  "Primed Expel Orokin": true,
  "Primed Expel The Murmur": true,
  "Primed Fast Hands": true,
  "Primed Fever Strike": true,
  "Primed Firestorm": true,
  "Primed Flow": true,
  "Primed Fulmination": true,
  "Primed Heated Charge": true,
  "Primed Heavy Trauma": true,
  "Primed Magazine Warp": true,
  "Primed Morphic Transformer": true,
  "Primed Pack Leader": true,
  "Primed Pistol Ammo Mutation": true,
  "Primed Pistol Gambit": true,
  "Primed Point Blank": true,
  "Primed Pressure Point": true,
  "Primed Quickdraw": true,
  "Primed Ravage": true,
  "Primed Reach": true,
  "Primed Redirection": true,
  "Primed Regen": true,
  "Primed Rifle Ammo Mutation": true,
  "Primed Rubedo-Lined Barrel": true,
  "Primed Shotgun Ammo Mutation": true,
  "Primed Slip Magazine": true,
  "Primed Smite Corpus": true,
  "Primed Smite Grineer": true,
  "Primed Smite Infested": true,
  "Primed Smite Orokin": true,
  "Primed Smite The Murmur": true,
  "Primed Sniper Ammo Mutation": true,
  "Primed Stabilizer": true,
  "Primed Steady Hands": true,
  "Primed Tactical Pump": true,
  "Primed Target Cracker": true,
  "Primed Venomous Clip": true,
  "Prisma Angstrum": true,
  "Prisma Arrows": true,
  "Prisma Avia Ankle Plate": true,
  "Prisma Avia Chest Plate": true,
  "Prisma Avia Shoulder Plate": true,
  "Prisma Companion Poster": true,
  "Prisma Daedalus Chest Plate": true,
  "Prisma Dual Cleavers": true,
  "Prisma Dual Decurions": true,
  "Prisma Edo Chest Plate": true,
  "Prisma Gorgon": true,
  "Prisma Grakata": true,
  "Prisma Grinlok": true,
  "Prisma Hecate Syandana": true,
  "Prisma Jet Sentinel Wings": true,
  "Prisma Kavat Glyph": true,
  "Prisma Koi Sentinel Tail": true,
  "Prisma Kubrow Glyph": true,
  "Prisma Latron Chest Plate": true,
  "Prisma Latron Leg Plate": true,
  "Prisma Latron Shoulder Plate (Left)": true,
  "Prisma Lenz": true,
  "Prisma Livery": true,
  "Prisma Lotus Bloom Sigil": true,
  "Prisma Lotus Emblem": true,
  "Prisma Lotus Flame Sigil": true,
  "Prisma Lotus Glyph": true,
  "Prisma Lotus Sigil": true,
  "Prisma Machete": true,
  "Prisma Mech Head Sentinel Mask": true,
  "Prisma Naberus": true,
  "Prisma Obex": true,
  "Prisma Ohma": true,
  "Prisma Rostam Kubrow Armor": true,
  "Prisma Shade": true,
  "Prisma Sigil": true,
  "Prisma Skana": true,
  "Prisma Tetra": true,
  "Prisma Thrax Sigil": true,
  "Prisma Twin Gremlins": true,
  "Prisma Uru Syandana": true,
  "Prisma Veritux": true,
  "Prisma Yamako Syandana": true,
  "Prova Vandal": true,
  Pummel: true,
  "Puspa Luxxum Ornament": true,
  "Pyra Sugatra": true,
  "Quanta Aufeis Skin": true,
  "Quanta Vandal": true,
  "Railjack Retrofit Login Music": true,
  "Rakta Syandana": true,
  "Rapier Tributaker Skin": true,
  "Rathuum Display": true,
  "Redeemer Elixis Skin": true,
  "Renayla Sugatra": true,
  "Reshantur Child's Tablet": true,
  "Reshantur Cult Spear Skin": true,
  "Reshantur Cult Syandana": true,
  "Rhapsody in Blue": true,
  "Rhino Palatine Sigil": true,
  "Right Eos Prime Shoulder Plates": true,
  "Right Eos Prime Spurs": true,
  "Right Prisma Daedalus Knee Plates": true,
  "Right Prisma Daedalus Shoulder Guard": true,
  "Right Prisma Edo Knee Plates": true,
  "Right Prisma Edo Shoulder Plates": true,
  "Sands of Inaros Blueprint": true,
  "Scaldra Glyph": true,
  "Scattering Inferno": true,
  "Scimitar Cydonia Skin": true,
  "Scimitar Prisma Skin": true,
  Scorch: true,
  "Scoria Diadem": true,
  "Secret History Replica": true,
  "Shell Shock": true,
  "Silva & Aegis Eskhatos Skin": true,
  "Sima Luxxum Ornament": true,
  "Singing Lotus Community Glyph": true,
  "Sisters of Parvos Login Music": true,
  "Sonicor Elixis Skin": true,
  "Split Flights": true,
  "Stalker Beacon": true,
  "Supra Vandal": true,
  "Sweeping Serration": true,
  "Taktis Fighter Decoration": true,
  "Tannukai Chest Plate": true,
  "Tannukai Leg Plates": true,
  "Tannukai Longsword Skin": true,
  "Tannukai Shoulder Plates": true,
  "Taxon Desert-Camo Skin": true,
  "Techrot Glyph": true,
  "Telamon Dance of Death": true,
  "Tempo Royale": true,
  "Tenno Kindred Rug": true,
  "TennoCon Crt Emote": true,
  "TennoCon Crt Glyph": true,
  "The Lotus Eaters Login Music": true,
  "The New War Login Music": true,
  "The Old Blood Login Music": true,
  "The Sacrifice Login Music": true,
  "The Seven Crimes of Kullervo Login Music": true,
  "The Stranger's Hood": true,
  "Thermite Rounds": true,
  "Tiberon Elixis Skin": true,
  "Tigris Elixis Skin": true,
  "Transmuter Operator Hood": true,
  "Twin Grakatas Towsun Skin": true,
  Vastilok: true,
  "Veilbreaker Login Music": true,
  Vericres: true,
  "Vermillion Storm": true,
  "Verminia Cosplay Community Display": true,
  "Vez Luxxum Ornament": true,
  "Viper Wraith": true,
  "Void Angel Glyph": true,
  "Void Surplus": true,
  "Void Trader": true,
  "Volatile Ogris Skin": true,
  "Volcanic Edge": true,
  "Voltaic Strike": true,
  "Vome Floof": true,
  "Vome-Fass Glyph": true,
  "Voruna in Action Glyph": true,
  "Vulkar Wraith": true,
  "Weaver Fighter Decoration": true,
  "Whispers in the Walls Login Music": true,
  "Wintercress Syandana": true,
  "Wisp Immortal Skin": true,
  "Wysar Day of the Dead Kavat Armor": true,
  "Xaku Prex": true,
  "Xiphos Prisma Skin": true,
  "Xoris Elixis Skin": true,
  "Yisi Glyph": true,
  "Zag Luxxum Ornament": true,
  "Zanuka Hunter Beacon": true,
  "Zephyr Immortal Skin": true,
  Zylok: true,
  "Baro Void-Signal": true
};

// src-tauri/data/assets/data/wiki-resources-acquisition.json
var wiki_resources_acquisition_default = {
  "pyrotic alloy": "The reusable blueprint can be purchased from Old Man Suumbaat for 500 Standing, requiring the rank of '''Neutral''' with the Ostron.",
  "tear azurite": "The reusable blueprint can be purchased from Old Man Suumbaat for 500 Standing, requiring the rank of '''Neutral''' with the Ostron.",
  "marquise veridos": "The reusable blueprint can be purchased from Old Man Suumbaat for 5,000 Standing, requiring the rank of '''Visitor''' with the Ostron.",
  "auroxium alloy": "The reusable blueprint can be purchased from Old Man Suumbaat for 7,500 Standing, requiring the rank of '''Trusted''' with the Ostron.",
  "esher devar": "The reusable blueprint can be purchased from Old Man Suumbaat for 2,500 Standing, requiring the rank of '''Offworlder''' with the Ostron.",
  "star crimzian": "The reusable blueprint can be purchased from Old Man Suumbaat for 7,500 Standing, requiring the rank of Rank 3 '''Trusted''' with the Ostron.",
  "cetus wisp": "Plains of Eidolon (Lakeshores at Dawn/Dusk)",
  "fish oil": "Fishing on Plains of Eidolon (Fisher Hai-Luk, Cetus)",
  "fish meat": "Fishing on Plains of Eidolon (Fisher Hai-Luk, Cetus)",
  coprun: "Mining on Plains of Eidolon (Red Mineral Veins)",
  "coprite alloy": "The reusable blueprint can be purchased from Old Man Suumbaat for 2,500 Standing, requiring the rank of '''Offworlder''' with the Ostron. Coprite Alloy can drop from the Tusk Thumper.",
  "heart phaerun": "Mining on Plains of Eidolon (Old Man Suumbaat, Cetus)",
  radphos: "Mining on Plains of Eidolon (Old Man Suumbaat, Cetus)",
  "fersteel alloy": "The reusable blueprint can be purchased from Old Man Suumbaat for 5,000 Standing, requiring the rank of '''Visitor''' with the Ostron.",
  "eidolon shard": "The Eidolon Teralyst, Gantulyst, and Hydrolyst will drop one, three, and five Eidolon Shards respectively regardless of whether they are killed or captured.",
  "brilliant eidolon shard": "Eidolon Gantulyst / Hydrolyst (Plains of Eidolon)",
  "radiant eidolon shard": "Eidolon Hydrolyst Capture (Plains of Eidolon)",
  "axidrol alloy": "The reusable blueprint can be purchased from Smokefinger for 1,000 Standing, requiring the rank of '''Neutral''' with Solaris United.",
  "goblite tears": "The reusable blueprint can be purchased from Smokefinger for 2,000 Standing, requiring the rank of '''Outworlder''' with Solaris United.",
  scrap: "Fishing on Orb Vallis (Dismantle Servofish at The Business, Fortuna)",
  "recaster neural relay": "Fishing on Orb Vallis (Recaster Servofish, The Business)",
  "star amarast": "The reusable blueprint can be purchased from Smokefinger for 4,000 Standing, requiring the rank of '''Rapscallion''' with Solaris United.",
  "smooth phasmin": "The reusable blueprint can be purchased from Smokefinger for 1,000 Standing, requiring the rank of '''Neutral''' with Solaris United.",
  "travocyte alloy": "The reusable blueprint can be purchased from Smokefinger for 1,000 Standing, requiring the rank of '''Neutral''' with Solaris United.",
  travoride: "Orb Vallis (Venus) - Red Mining Veins & Exploiter / Profit-Taker",
  axidite: "Orb Vallis (Venus) - Red Mining Veins & Exploiter / Profit-Taker",
  hesperon: "Orb Vallis (Venus) - Red Mining Veins & Exploiter / Profit-Taker",
  "hespazym alloy": "The reusable blueprint can be purchased from Smokefinger for 4,000 Standing, requiring the Rank 2: '''Rapscallion''' with Solaris United.",
  venerol: "Orb Vallis (Venus) - Red Mining Veins & Exploiter / Profit-Taker",
  "venerdo alloy": "The reusable blueprint can be purchased from Smokefinger for 2,000 Standing, requiring the rank of '''Outworlder''' with Solaris United.",
  "scrubber exa brain": "Fishing on Orb Vallis (Scrubber Servofish, The Business)",
  "echowinder anoscopic sensor": "Fishing on Orb Vallis (Echowinder Servofish, The Business)",
  "sapcaddy venedo case": "Fishing on Orb Vallis (Sapcaddy Servofish, The Business)",
  "brickie muon battery": "Fishing on Orb Vallis (Brickie Servofish, The Business)",
  "tink dissipator coil": "Fishing on Orb Vallis (Tink Servofish, The Business)",
  phasmin: "Orb Vallis (Venus) - Blue Mining Veins",
  amarast: "Orb Vallis (Venus) - Blue Mining Veins",
  zodian: "Zodian can be acquired from two different sources: Mined from blue mineral veins in Orb Vallis with the Advanced Nosam Cutter or the Sunpoint Plasma Drill, each yielding 1 unit. Also available from red veins in Orb Vallis upon hitting the square bracket bonus spot. Dropped as a common loot of Exploiter Orb, each loot yielding 7-8 units. On rarer occasions, the grand boss may drop multiple instances of the loot, making it possible to get 14-16 or even 21-24 units per kill.",
  thyst: "Thyst can be acquired from two different sources: Mined from blue mineral veins in Orb Vallis with the Advanced Nosam Cutter or the Sunpoint Plasma Drill, each yielding 1 unit. Also available from red veins in Orb Vallis upon hitting the square bracket bonus spot. Dropped as a common loot of Exploiter Orb, each loot yielding 7-8 units. On rarer occasions, the grand boss may drop multiple instances of the loot, making it possible to get 14-16 or even 21-24 units per kill.",
  "radiant zodian": "The reusable blueprint can be purchased from Smokefinger for 8,000 Standing, requiring the rank of Rank 3 '''Doer''' with Solaris United.",
  "marquise thyst": "The reusable blueprint can be purchased from Smokefinger for 12,000 Standing, requiring the rank of Rank 4 '''Cove''' with Solaris United.",
  "crisma toroid": "Profit-Taker Orb (Orb Vallis)",
  "sola toroid": "Temple of Profit enemies (Orb Vallis) or Caves",
  "calda toroid": "Enrichment Labs enemies (Orb Vallis) or Caves",
  "vega toroid": "Spaceport enemies (Orb Vallis) or Caves",
  "thermal sludge": 'Thermal Sludge is resource that can be found in special containers located in Corpus encampments all over Orb Vallis. It is also rewarded by Bounties. ==Item Checklist for == ;General {| class="listtable sortable lighttable store-table" style="width: 400px;" data-tableid="Thermal Sludge General Checklist" |- ! Item ! Type ! data-sort-type="n',
  "devolved namalon": "The reusable blueprint can be purchased from Otak for 2,000 Standing, requiring '''Rank 1 - Stranger''' with the Entrati.",
  namalon: "Cambion Drift (Deimos) - Yellow Mining Veins & Isolation Vaults / Pillars",
  "parasitic tethermaw": "Fishing on Cambion Drift (Daughter, Necralisk)",
  "spinal core section": "Fishing on Cambion Drift (Vitreospina / Chondricord, Daughter)",
  "purified heciphron": "The reusable blueprint can be purchased from Otak for 2,000 Standing, requiring '''Rank 1 - Stranger''' with the Entrati.",
  heciphron: "Mining on Cambion Drift (Blue Mineral Veins)",
  "tempered bapholite": "The reusable blueprint can be purchased from Otak for 1,000 Standing, requiring '''Rank 0 - Neutral''' with the Entrati.",
  bapholite: "Cambion Drift (Deimos) - Yellow Mining Veins & Isolation Vaults / Pillars",
  "adramal alloy": "The reusable blueprint can be purchased from Otak for 1,000 Standing, requiring '''Rank 0 - Neutral''' with the Entrati.",
  adramalium: "Cambion Drift (Deimos) - Yellow Mining Veins & Isolation Vaults / Pillars",
  "biotic filter": "Fishing on Cambion Drift (Aquapulmo / Duroid, Daughter)",
  "thaumic distillate": "The reusable blueprint can be purchased from Otak for 4,000 Standing, requiring '''Rank 2 - Acquaintance''' with the Entrati.",
  thaumica: "Cambion Drift (Deimos) - Yellow Mining Veins & Isolation Vaults / Pillars",
  "faceted tiametrite": "The reusable blueprint can be purchased from Otak for 1,000 Standing, requiring '''Rank 0 - Neutral''' with the Entrati.",
  tiametrite: "Cambion Drift (Deimos) - Blue Mining Veins & Isolation Vaults",
  "purged dagonic": "The reusable blueprint can be purchased from Otak for 1,000 Standing, requiring '''Rank 0 - Neutral''' with the Entrati.",
  dagonic: "Mining on Cambion Drift (Blue Mineral Veins)",
  "tubercular gill system": "Fishing on Cambion Drift (Daughter, Necralisk)",
  embolos: "Cambion Drift (Deimos) - Blue Mining Veins & Isolation Vaults",
  "cabochon embolos": "The reusable blueprint can be purchased from Otak for 8,000 Standing, requiring '''Rank 3 - Associate''' with the Entrati.",
  "benign infested tumor": "Fishing on Cambion Drift (Daughter, Necralisk)",
  "pustulent cognitive nodule": "Fishing on Cambion Drift (Daughter, Necralisk)",
  noctrul: "Orb Vallis (Venus) - Blue Mining Veins",
  "heart noctrul": "The reusable blueprint can be purchased from Smokefinger for 1,000 Standing, requiring the rank of '''Neutral''' with Solaris United.",
  "sporulate sac": "Fishing on Cambion Drift (Daughter, Necralisk)",
  "saturated muscle mass": "Fishing on Cambion Drift (Daughter, Necralisk)",
  "ferment bladder": "Fishing on Cambion Drift (Daughter, Necralisk)",
  "dendrite blastoma": "Fishing on Cambion Drift (Daughter, Necralisk)",
  necrathene: "Cambion Drift (Deimos) - Blue Mining Veins & Isolation Vaults",
  "stellated necrathene": "The reusable blueprint can be purchased from Otak for 4,000 Standing, requiring '''Rank 2 - Acquaintance''' with the Entrati.",
  xenorhast: "Cambion Drift (Deimos) - Blue Mining Veins & Isolation Vaults",
  "trapezium xenorhast": "The reusable blueprint can be purchased from Otak for 8,000 Standing, requiring '''Rank 3 - Associate''' with the Entrati.",
  "waxen sebum deposit": "Fishing on Cambion Drift (Daughter, Necralisk)",
  "seriglass shard": "Seriglass Shards can be purchased from Grandmother in the Necralisk for 10 Grandmother Tokens each.",
  scintillant: "Scintillant can be obtained in the following ways: Rare Reward from Tier 1 Bounties from Mother, and a common reward from Tier 2 Bounties. Drops from hostile Necramechs found during Isolation Vault Bounties. Found in Isolation Vaults as floating entities that can be picked up. Scintillant entities have a chance to respawn.",
  "lucent teroglobe": "'''Lucent Teroglobe''' is a resource found in the Cambion Drift. They can be retrieved from Vitrific Outcrops, which appear around certain points of interests such as Requiem Obelisks located on the surface, and may also be rewarded from completing Bounties. ==Item Checklist for == {| class",
  "maw fang": "Duviri - Caught by Feeding the Maw in fishing spots",
  "nacreous pebble": "Duviri (Feed the Maw Fishing Activity)",
  "tasoma extract": "Duviri - Gathered from Caves throughout landscape",
  "saggen pearl": "Duviri - Mined from Saggen Wells throughout landscape",
  "silph selene": "Duviri (Sun Silph Sprouts)",
  kovnik: "Kovnik plants found across Duviri. Occasionally found in Teshin's Cave",
  dracroot: "Dracroot can often be found near cliffs on the central island of Duviri, near Lonesome Outlook, Fair Shores Hamlet, Watershed Hamlet, Hermit Landing and Moirai Crossing. It can sometimes be found in the plants in Teshin's Cave.",
  "connla sprout": "Typically found near water sources and caves in Duviri but are most commonly found near the Lunaro Court. Connla Sprout may also sometimes be obtained from Teshin's Cave.",
  "yao shrub": "The Yao Shrub is found in colder areas of Duviri, specifically in snowy areas near the following map markers: Titan's Rest Soprano Springs Netherbarrow Netherbarrow Crossing Custos Arch Throneguard Barracks It can be found during all the Duviri Cycles(''Envy'', ''Sorrow'', ''Joy'', ''Anger'', and ''Fear)''. While not confirmed and despite its description, the Yao Shrub seems to exclusively grow above ground and not within caves and other underground structures. thumb|A Yao Shrub found near Soprano Springs Each plant drops between 3 to 5 Yao Shrubs upon breaking. Enigma Puzzles may also reward Yao Shrub. Yao Shrub may also sometimes be obtained from Teshin's Cave.",
  eea: "Duviri (Islands)",
  calcifish: "Duviri (Feed the Maw)",
  "ariette scale": "Duviri (Feed the Maw)",
  lamentus: "Lamentus is dropped from Dax enemies the player will encounter during their time in Duviri. ''Note: This does not include Dax enemies encountered within the Undercroft.''",
  "pathos clamp": "Duviri - Defeating the Orowyrm (10 per normal, 15 per Steel Path)",
  "rune marrow": "Rune Marrow can be found in Runic Compact deposits that only appear in The Undercroft or The Circuit. They are also guaranteed to drop from Corrupted Vor and Corrupted Jackal in the same area.",
  agrimony: "Duviri (Open Plains)",
  "moonlight threshcone": "Found on: Earth (Night time)",
  "sunlight threshcone": "Found on: Earth (Day time)",
  "moonlight jadeleaf": "Found on: Earth (Night time water pools)",
  "sunlight jadeleaf": "Found on: Earth (Day time water pools)",
  "moonlight dragonlily": "Found on: Earth (Night time plains/rivers)",
  "sunlight dragonlily": "Found on: Earth (Day time plains/rivers)",
  "dusklight sarracenia": "Found on: Ceres (Acid pools)",
  "vestan moss": "Found on: Sedna & Mercury (Grineer Asteroid tileset)",
  frostleaf: "Found on: Venus & Pluto (Corpus Outpost cliff edges)",
  "lunar pitcher": "Found on: Lua (Orokin Moon garden tiles)",
  "ruk's claw": "Found on: Saturn & Mars (Grineer Settlement tiles)",
  "anomaly shard": "Veil Proxima (Railjack) \u2014 1 Anomaly Shard is awarded for clearing a Murex ship by killing 20 Sentients aboard on flashing red anomaly nodes.",
  "omega isotope": "Found on: Planets hosting active Fomorian Threats",
  "cryptographic alu": "Found on: Corpus Archwing (Salacia, Neptune during Razorback)",
  "orokin cipher": "Orokin Derelict Vaults (Deimos - Dragon Keys)",
  "proof fragment": "Archwing Defense / Interception during Limbo Theorem Quest",
  "incubator power core": "Players may purchase a fully-built Power Core or a reusable blueprint from the Market. A single Incubator Core is given as a reward for completing the first task of the Venus &gt; Mercury Junction. {{BuildRequire |buildcredits= 100,000 |build1= Nano Spores |build1amount=4,500 |build2= Control Module |build2amount=2 |build3= Argon Crystal |build3amount=1 |build4= |build4amount= |buildtime= 8 |buildrush=10 |blueprint=50,000 |market=35 }}",
  "antiserum injector fragment": "Infested Salvage (Oestrus, Eris)",
  "pherliac pods": "Juggernaut Enemy Drops (Infested Missions)",
  "corrupted holokey": "Void Storm Missions (Railjack) \u2014 Guaranteed end-of-mission rotation reward (1-10 depending on Proxima) & Sisters of Parvos Final Confrontation.",
  "vitus essence": "Vitus Essence is primarily obtained from Arbitrations: 1 Vitus is guaranteed from completing a rotation, separate from the reward table. Each rotation has a 10% chance to award 3 Vitus from the reward table. Arbitration Shield Drone have a 6% chance to drop 1 Vitus on kill.",
  kuva: "Kuva Siphon / Flood / Survival (Kuva Fortress)",
  "riven sliver": "Opening Requiem Relics in Void Fissures Empyrean missions 1 as a potential drop (5% chance) by a level 41 or higher Jackal (Sortie, The Steel Path) 1 as a potential drop (2% chance) by Eximus enemies above level 30.",
  "steel essence": "Steel Essence is primarily obtained from The Steel Path: Eidolon Teralyst, Eidolon Gantulyst, and Eidolon Hydrolyst guarantee 1 Steel Essence upon defeat, regardless of kill or capture. Acolytes that spawn in any Steel Path mission guarantee 2 Steel Essence upon defeat. This value is affected by Resource Boosters and Beast's Loyal Retriever and Resourceful Retriever. Every day, six Steel Path Incursion Alerts are available. Each rewards 5 Steel Essence upon completion, to a total of 30 Steel Essence per day. 25 are awarded upon fully clearing all of a planet's mission nodes. A total of 475 are guaranteed for completing the entire Star Chart. 1 is rewarded upon opening a Void Relic in a Steel Path Void Fissure mission. 25 are awarded upon completing Tier 9 of The Circuit on Steel Path. 5 are awarded upon opening the chest for defeating an Orowyrm on Steel Path. 2 are awarded for each extra Undercroft portal completed in Steel Path Duviri Experience, a max of 6 per run. 1 is awarded for clearing the Abyssal Zone on Steel Path. 1 is awarded for beating The Fragmented One on Steel Path. Each week, 25 are awarded upon reaching floor 18 of The Descendia on Steel Path.",
  "narmer isoplast": 'Narmer Isoplast is a Sentient resource that can be obtained through Narmer Bounties after completing The New War Quest. ==Usage== Narmer Isoplast are primarily used for crafting weapons and Warframes from . Narmer Isoplast can be traded to The Quills and Vox Solaris Syndicates for 2,000 Standing each. ==Item Checklist== {| class="listtable sort',
  "fate pearl": "Shrine Defense (Saya's Visions, Earth) / Saya (Cetus)",
  "voidplume pinion": "Void Angels (Chrysalith, Zariman Ten Zero)",
  "voidplume quill": "Zariman Bounties / Melica Kiosks / Archimedean Yonta",
  "voidplume crest": "One Voidplume Crest can be found scattered across any Zariman Ten Zero mission as an interactable pickup. Tier 3 Bounty from Quinn has a chance to award a Voidplume Crest. Every 8 hours, one Voidplume Crest can be purchased from Archimedean Yonta using resources found on the Zariman.",
  "voidplume vane": "Voidplume Vanes can be found scattered across any Zariman Ten Zero mission as an interactable pickup. 2 are guaranteed to be Vanes, while an additional 5 have a 25% chance to be a Vane. Tier 2 Bounty from Quinn has a chance to award a Voidplume Vane. Every 8 hours, one Voidplume Vane can be purchased from Archimedean Yonta using resources found on the Zariman.",
  "voidplume down": "Voidplume Downs can be found scattered across any Zariman Ten Zero mission as an interactable pickup. 5 of the Voidplumes have a 75% chance to be a Down. Tier 1 Bounty from Quinn has a chance to award a Voidplume Down. Every 8 hours, one Voidplume Down can be purchased from Archimedean Yonta using resources found on the Zariman.",
  "javlok capacitor": "Guardsman Enemies (Ceres Assassination / Missions)",
  "cranial foremount": "Fishing on Cambion Drift (Myxostoma, Daughter)",
  "ocular stem-root": "Fishing on Cambion Drift (Ostimyr, Daughter)",
  silphsela: "Duviri - Gathered from Sun Silph floating seeds in the sky",
  "eye-eye rotoblade": "Fishing on Orb Vallis (Eye-Eye Servofish, The Business)",
  "mirewinder parallel biode": "Fishing on Orb Vallis (Mirewinder Servofish, The Business)",
  "kriller thermal laser": "Fishing on Orb Vallis (Kriller Servofish, The Business)",
  "fieldron sample": "Found on: Venus, Neptune, Pluto, and Europa",
  "detonite ampule": "Found on: Earth, Mercury, Ceres, Saturn, Uranus, Sedna",
  "mutagen sample": 'Mutagen Sample is a resource that can be obtained from enemies and containers on Deimos and Eris. It is usually found in quantities of 1. Mutagen Samples are used for Bio Lab Research & Blueprints from the Clan Dojo. ==Item Checklist for == ;General {| class="listtable sortable lighttable store-table" style="width: 600px;" data-tableid="M',
  "trembera essence": "Empyrean / Railjack Missions (Space debris)",
  "greater focus lens": "Market (40 Platinum) or Crafting from Lens",
  "greater madurai lens": "Market (40 Platinum) or Crafting from Madurai Lens",
  "greater naramon lens": "Market (40 Platinum) or Crafting from Naramon Lens",
  "greater unairu lens": "Market (40 Platinum) or Crafting from Unairu Lens",
  "greater vazarin lens": "Market (40 Platinum) or Crafting from Vazarin Lens",
  "greater zenurik lens": "Market (40 Platinum) or Crafting from Zenurik Lens",
  "eidolon lens": "Blueprints for Eidolon Lenses can be obtained from Tier 5 or Steel Path Cetus Bounties and in Rotation C of Persto, Deimos. Crafting an Eidolon Lens requires a Greater Lens to be selected, converting it to an Eidolon Lens of the same Focus School. Built Eidolon Lenses can be bought from the Cavia's Bird 3 for 60,000 Standing. Blueprints and built Eidolon Lenses can be traded between players. {{BuildRequire |buildcredits=25,000 |build1=Greater Focus Lens |build1amount=1 |build2=Breath Of The Eidolon |build2amount=5 |build3= |build3amount= |build4= |build4amount= |buildtime=24 |buildrush=10 |blueprint= |market=80 }}",
  "purple velocipod tag": "Conservation on Cambion Drift (Son, Necralisk)",
  "vizier predasite tag": "Conservation on Cambion Drift (Son, Necralisk)",
  "mandachord body": "Quest: Octavia's Anthem (Cephalon Suda)",
  "mandachord bridge": "Quest: Octavia's Anthem (Cephalon Suda)",
  "mandachord fret": "Quest: Octavia's Anthem (Cephalon Suda)",
  "crewman\u2019s boot": "Fishing in Orb Vallis (Recycled at The Business)",
  "crewman's boot": "Fishing in Orb Vallis (Recycled at The Business)",
  auron: "Plains of Eidolon (Earth) - Red Mining Veins & Tusk / Narmer Thumpers",
  coprite: "Plains of Eidolon (Earth) - Red Mining Veins & Tusk / Narmer Thumpers",
  "coprun alloy": "Foundry Craftable (Blueprint: Old Man Suumbaat, Cetus - 1,000 Standing)",
  ferros: "Plains of Eidolon (Earth) - Red Mining Veins & Tusk / Narmer Thumpers",
  "ferrite alloy": "Foundry Craftable (Blueprint: Old Man Suumbaat, Cetus - 1,000 Standing)",
  pyrol: "Plains of Eidolon (Earth) - Red Mining Veins & Tusk / Narmer Thumpers",
  azurite: "Plains of Eidolon (Earth) - Blue Mining Veins & Tusk / Narmer Thumpers",
  crimzian: "Plains of Eidolon (Earth) - Blue Mining Veins & Tusk / Narmer Thumpers",
  devar: "Plains of Eidolon (Earth) - Blue Mining Veins & Tusk / Narmer Thumpers",
  veridos: "Plains of Eidolon (Earth) - Blue Mining Veins & Tusk / Narmer Thumpers",
  sentirum: "Plains of Eidolon (Earth) - Blue Mining Veins (Advanced Nosam / Sunpoint Plasma Drill)",
  "radirum sentirum": "Foundry Craftable (Blueprint: Old Man Suumbaat, Cetus - 4,000 Standing)",
  "heart nyth": "The reusable blueprint can be purchased from Old Man Suumbaat for 10,000 Standing, requiring the rank of Rank 4 '''Surah''' with the Ostron. Complete Heart Nyths are also available from Nakak in Cetus during Operation: Plague Star for 750 Standing Operational Supply Standing and each.",
  nyth: "Plains of Eidolon (Earth) - Blue Mining Veins (Advanced Nosam / Sunpoint Plasma Drill)",
  "venerian alloy": "Foundry Craftable (Blueprint: Smokefinger, Fortuna - 1,000 Standing)",
  goblite: "Goblite can be acquired from three different sources: Mined from either red or blue mineral veins in Orb Vallis with the Sunpoint Plasma Drill. Dropped from storage containers found in Orb Vallis, yielding varying units.",
  "heart thyst": "Foundry Craftable (Blueprint: Smokefinger, Fortuna - 4,000 Standing)",
  "dagonic bapholite": "Foundry Craftable (Blueprint: Otak, Necralisk - 1,000 Standing)",
  "purified namalon": "Foundry Craftable (Blueprint: Otak, Necralisk - 1,000 Standing)",
  "purified tiametrite": "Foundry Craftable (Blueprint: Otak, Necralisk - 1,000 Standing)",
  dagonite: "Cambion Drift (Deimos) - Blue Mining Veins & Isolation Vaults",
  "faceted dagonite": "Foundry Craftable (Blueprint: Otak, Necralisk - 1,000 Standing)",
  hentin: "Cambion Drift (Deimos) - Blue Mining Veins & Isolation Vaults",
  "purified hentin": "Foundry Craftable (Blueprint: Otak, Necralisk - 1,000 Standing)",
  "cabochon xenorhast": "Foundry Craftable (Blueprint: Otak, Necralisk - 4,000 Standing)",
  "marked embolos": "Foundry Craftable (Blueprint: Otak, Necralisk - 4,000 Standing)",
  eevani: "Eevani is found in the Amphitheater and Archarbor of Duviri. The Archarbor has a much higher quantity of Eevani than the Amphitheater; if specifically trying to get Eevani, it is best to wait for the Joy, Sorrow, or Envy spirals. Eevani may also sometimes be obtained from Teshin's Cave.",
  "vain thorn": "Duviri - Kullervo's Hold (Assassinating Warden Kullervo)",
  clamp: "Duviri - Defeating the Orowyrm (10 per normal, 15 per Steel Path)",
  "entrati lanthorn": "Guaranteed drop from Netracell runs. Will still drop after the limit of 5 weekly runs is completed. Killing Gruzzling has a chance to leave a pickup that yields three Entrati Lanthorn. Can be obtained from some Sanctum Anatomica endless missions as rotation rewards: Alchemy, Mirror Defense and Survival, with a 5% chance to award one each on the B rotation. Can be awarded from Zariman Ten Zero bounties and mission rewards. As a Region Resource for the Zariman Ten Zero: Rarely found from Storage Containers in the Zariman. Randomly awarded to its owner by with Charm in any Zariman mission. Randomly extractable by Extractor deployable in the Zariman system from Star Chart. Rare drop from any enemy killed on the Zariman.",
  "voidgel orb": "Zariman Ten Zero - Breakable Containers & Thrax Enemies",
  "thrax plasm": "Zariman Ten Zero - Thrax Centurion & Legatus Enemies",
  "lua thrax plasm": "<!-- Jan 2026: The official tables currently don't reflect the Centurion/Legatus drop chances, so showing it isn't really helpful over a table handwritten from the patch notes.",
  stela: "Sanctum Anatomica (Deimos) - Albrecht's Laboratories Missions & Breakables",
  necracoil: "Sanctum Anatomica (Deimos) - Albrecht's Laboratories Breakables",
  "entrati obols": "Sanctum Anatomica (Deimos) - Albrecht's Laboratories Enemy / Breakable Drop",
  "vocal shrub": "Sanctum Anatomica (Deimos) - Albrecht's Laboratories Missions",
  "adarza kavat": "The player must have completed the Howl of the Kubrow quest in order to have an operating Incubator on the Orbiter, and have installed the Kavat Incubator Upgrade Segment whose blueprint can be obtained from the Clan Dojo's Tenno Lab research or dropped by Hyekka Masters, or purchased fully built from the Market for . The player must also have 10 Kavat Genetic Codes from scanning Feral Kavats on the Orokin Derelict tileset on Deimos using Codex Scanners or Synthesis Scanners, and a built Incubator Power Core whose blueprint can be obtained from the Market. The Kavat can be bred using the Incubator: a Random Incubation has a chance to create an Adarza Kavat, while using two Genetic Code Templates bought from the Market can be applied to created Kavats to have a chance to pass on genetic traits.",
  "air support charges": "===10x Blueprint=== The blueprint is automatically available in the Foundry and will craft 10 Charges, but players must possess a Landing Craft Foundry Segment before they can build Air Support Charges. {{BuildRequire |buildcredits = 4,000 |build1 = Ferrite |build1amount = 1,200 |build2 = Salvage |build2amount = 2,000 |build3 = Morphics |build3amount = 1 |build4 = Plastids |build4amount = 700 |buildtime = 1 |buildtimeunit = min |buildrush = 1}}",
  "akvasto forest-camo skin": "This skin is permanently available for purchase from in-game market separately for or as part of Forest-Camo Skin Pack . __NOTOC__ Category:Update 11 Category:Market Category:Weapon Skins Category:Weapon Cosmetics Category:Aesthetics",
  "antiserum injector": "{{BuildRequire |buildcredits = 30,000 |buildrush = 35 |build1 = Fieldron |build1amount = 2 |build2 = Salvage |build2amount = 6,000 |build3 = Antiserum Injector Fragment |build3amount = 500 |build4 = Tellurium |build4amount = 2 |buildtime = 24 |researchtimeunit = m |lab = energy |researchcredits = 5,000 |research1 = Fieldron Sample |research1amount = 10 |research2 = Antiserum Injector Fragment |research2amount = 600 |research3 = Nano Spores |research3amount = 750 |research4 = Polymer Bundle |research4amount = 400 |researchtime = 5 |affinityamount = 3,000 |prereq = x20px|link=Squad Energy Restore (Medium) Blueprint |blueprint = 15,000 }}",
  apoc: "Apoc Mk III= The '''Apoc Mk III''' is researched in the Clan Dojo's Dry Dock. {{BuildRequire |buildcredits = 10,000 |build1 = Gallos Rods |build1amount = 40 |build2 = Titanium |build2amount = 2,000 |build3 = Carbides |build3amount = 600 |build4 = |build4amount = |buildtime = 0 |lab = Railjack |researchcredits = |research1 = |research1amount = |research2 = |research2amount = |research3 = |research3amount = |research4 = |research4amount = |researchtime = 1 |prereq = Mk II }} The '''Lavan Apoc Mk III''' is dropped as wreckage by Exo Gokstad Crewships (2%) and Exo Skold Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Komms |build1amount = 5 |build2 = Gallos Rods |build2amount = 40 |build3 = Titanium |build3amount = 2,000 |build4 = Copernics |build4amount = 600 |buildtime = 1 |buildrush = 20 }} The '''Vidar Apoc Mk III''' is dropped as wreckage by Exo Gokstad Crewships (2%), Exo Skold Crewships (2%) and Elite Exo Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Nullstones |build1amount = 5 |build2 = Gallos Rods |build2amount = 40 |build3 = Titanium |build3amount = 2,000 |build4 = Copernics |build4amount = 600 |buildtime = 1 |buildrush = 20 }} The '''Zetki Apoc Mk III''' is dropped as wreckage by Elite Exo Gokstad Crewships (2%) and Elite Exo Outriders (11.11%). {{BuildRequire |buildcredits = 15,000 |build1 = Aucrux Capacitors |build1amount = 5 |build2 = Gallos Rods |build2amount = 40 |build3 = Titanium |build3amount = 2,000 |build4 = Copernics |build4amount = 600 |buildtime = 1 |buildrush = 20 }} |-|Apoc Mk II= The '''Apoc Mk II''' is researched in the Clan Dojo's Dry Dock. {{BuildRequire |buildcredits = 15,000 |build1 = Gallos Rods |build1amount = 30 |build2 = Titanium |build2amount = 1,500 |build3 = Carbides |build3amount = 450 |build4 = Aucrux Capacitors |build4amount = 4 |buildtime = 0 |lab = Railjack |researchcredits = ? |research1 = Gallium |research1amount = 1 |research2 = Circuits |research2amount = 150 |research3 = Salvage |research3amount = 1,000 |research4 = Nano Spores |research4amount = 500 |researchtime = 1 |prereq = Mk I }} The '''Lavan Apoc Mk II''' is dropped as wreckage by Gyre Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Komms |build1amount = 4 |build2 = Gallos Rods |build2amount = 30 |build3 = Titanium |build3amount = 1,500 |build4 = Carbides |build4amount = 450 |buildtime = 1 |buildrush = 20 }} The '''Vidar Apoc Mk II''' is dropped as wreckage by Gyre Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Nullstones |build1amount = 4 |build2 = Gallos Rods |build2amount = 30 |build3 = Titanium |build3amount = 1,500 |build4 = Carbides |build4amount = 450 |buildtime = 1 |buildrush = 20 }} The '''Zetki Apoc Mk II''' is dropped as wreckage by Elite Gyre Outriders (11.11%). {{BuildRequire |buildcredits = 15,000 |build1 = Aucrux Capacitors |build1amount = 4 |build2 = Gallos Rods |build2amount = 30 |build3 = Titanium |build3amount = 1,500 |build4 = Carbides |build4amount = 450 |buildtime = 1 |buildrush = 20 }} |-|Apoc Mk I= The '''Apoc Mk I''' is researched in the Clan Dojo's Dry Dock. {{BuildRequire |buildcredits = 15,000 |build1 = Gallos Rods |build1amount = 20 |build2 = Titanium |build2amount = 1,000 |build3 = Carbides |build3amount = 300 |build4 = |build4amount = |buildtime = 0 |lab = Railjack |researchcredits = 10,000 |research1 = Gallium |research1amount = 1 |research2 = Circuits |research2amount = 150 |research3 = Salvage |research3amount = 1,000 |research4 = Nano Spores |research4amount = 500 |researchtime = 1 }} The '''Lavan Apoc Mk I''' is dropped as wreckage by Kosma Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Komms |build1amount = 3 |build2 = Gallos Rods |build2amount = 20 |build3 = Titanium |build3amount = 1,000 |build4 = Carbides |build4amount = 300 |buildtime = 1 |buildrush = 20 }} The '''Vidar Apoc Mk I''' is dropped as wreckage by Kosma Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Nullstones |build1amount = 3 |build2 = Gallos Rods |build2amount = 20 |build3 = Titanium |build3amount = 1,000 |build4 = Carbides |build4amount = 300 |buildtime = 1 |buildrush = 20 }} The '''Zetki Apoc Mk I''' is dropped as wreckage by Elite Kosma Outriders (11.11%). {{BuildRequire |buildcredits = 15,000 |build1 = Aucrux Capacitors |build1amount = 3 |build2 = Gallos Rods |build2amount = 20 |build3 = Titanium |build3amount = 1,000 |build4 = Carbides |build4amount = 300 |buildtime = 1 |buildrush = 20 }} |-|Apoc= The base '''Apoc''' is included in the Railjack's initial loadout after it has been repaired in the Rising Tide quest. It cannot be scrapped, and additional copies cannot be built.",
  "archon shard": `Archon Shards are awarded from Archon Hunts: Crimson Archon Shard from Archon Amar, Amber Archon Shard from Archon Nira, and Azure Archon Shard from Archon Boreal. The Shard has an '''80%''' chance of being a normal variant and '''20%''' of being Tauforged. If a normal variant is awarded, the chance of receiving a Tauforged increases by '''20%''' which resets upon earning one, tracked individually for each shard type. Taking the increasing drop rates after not getting a Tauforged into consideration, the effective chance for a Tauforged is around '''39.83%'''. One normal Crimson, Amber, and Azure Archon Shard that rotates its color weekly can be purchased from Bird 3 of Cavia for 30,000 Standing, requiring players to be at '''Rank 5 - Illuminate''' to purchase. Crimson, Amber, and Azure Archon Shards are available as common loot from the Netracells or Deep Archimedea, with their Tauforged variants able to be rolled as rare loot. Topaz Archon Shard, Violet Archon Shard, and Emerald Archon Shard Archon Shards are primarily obtainable through Coalescent Fusion of two Crimson, Amber, and Azure Shards. All normal shards, including the coalescent shards, are possible prizes from the 1999 Calendar after completing certain challenges and tasks. All normal shards, not including the coalescent shards, are possible prizes from the Steel Path version of The Descendia after completing Infernum 21. All shards, including Coalescent and Tauforged Shards, can be obtained as rewards from Temporal Archimedea. {| style="width: 100%;" class="article-table" cellspacing="1" cellpadding="1" border="0" align="center" |- ! style="text-align:center; width: 27.5%;" colspan=2 | Source ! style="text-align:center" | Reward ! style="text-align:center" | Chance ! style="text-align:center" | Expected ! style="text-align:center" | Nearly Guaranteed |- |align="center" rowspan=2 colspan=2|Archon Hunt |align="center"| Common Archon Shard |align="center"| 80%* |align="center"| |align="center"| |- |align="center"| Tauforged Archon Shard |align="center"| 20%* |align="center"| |align="center"| |- |align="center" rowspan=2 colspan=2|Netracells |align="center"| Common Archon Shard |align="center"| 52.5% |align="center"| |align="center"| |- |align="center"| Tauforged Archon Shard |align="center"| 12.5% |align="center"| |align="center"| |- |align="center" rowspan=5|Deep Archimedea |rowspan=2|class=icon Uncommon Reward Pool |align="center"| Common Archon Shard |align="center"| 52.5% |align="center"| |align="center"| |- |align="center"| Tauforged Archon Shard |align="center"| 12.5% |align="center"| |align="center"| |- |rowspan=2|class=icon Rare Reward Pool |align="center"| Common Archon Shard |align="center"| 39.4% |align="center"| |align="center"| |- |align="center"| Tauforged Archon Shard |align="center"| 25.6% |align="center"| |align="center"| |- |class=icon Legendary Reward Pool |align="center"| Tauforged Archon Shard |align="center"| 50% |align="center"| |align="center"| |- |align="center" rowspan=8|Temporal Archimedea |rowspan=2|class=icon Uncommon Reward Pool |align="center"| Common Archon Shard |align="center"| 46% |align="center"| |align="center"| |- |align="center"| Tauforged Archon Shard |align="center"| 10.95% |align="center"| |align="center"| |- |rowspan=4|class=icon Rare Reward Pool |align="center"| Common Archon Shard |align="center"| 22.35% |align="center"| |align="center"| |- |align="center"| '''Fused''' Archon Shard |align="center"| 16.77% |align="center"| |align="center"| |- |align="center"| Tauforged Archon Shard |align="center"| 14.52% |align="center"| |align="center"| |- |align="center"| '''Fused''' Tauforged Archon Shard |align="center"| 10.92% |align="center"| |align="center"| |- |rowspan=2|class=icon Legendary Reward Pool |align="center"| Tauforged Archon Shard |align="center"| 27.33% |align="center"| |align="center"| |- |align="center"| '''Fused''' Tauforged Archon Shard |align="center"| 20.5% |align="center"| |align="center"| |- |} Tauforged variants' drop chance increases if a normal variant is awarded.`,
  "riven mods": `A single Riven mod is given to players upon completion of The War Within quest. In a more general sense, '''Rifle''', '''Shotgun''', '''Pistol''', '''Melee''', '''Kitgun''', and '''Zaw''' Riven mods can ''primarily'' be acquired from: Palladino, a character in Iron Wake, who can transmute '''10''' Riven Sliver into a veiled Riven mod twice per week. Iron Wake is only accessible after completion of the Chains of Harrow quest. Sorties, with various drop chances: ::{| class="wikitable" ! Weapon Type !! Drop Chance |- |Melee || 8.14% |- |Pistol || 7.61% |- |Rifle || 6.79% |- |Kitgun || 2% |- |Zaw || 2% |- |Shotgun || 1.36% |} The Steel Path rotating offerings \u2013 does '''not''' include Pistol and Melee Riven mods Purchased from Acrithis's shop for 15 Pathos Clamp Archon Hunt Steel Path Circuit Steel Path Descendia Riven mods can also ''more sporadically'' be acquired from: Nightwave, as a possible rank reward, depending on the series The 1999 Calendar Nightwave, by purchasing Enter Nihil's Oubliette and defeating the Nihil boss, depending on weekly offerings. Tactical Alerts Gift from the Lotus Alerts Daily Tribute Evergreen milestones, awarding three Riven Mods along with three Riven Slots In addition to the above, players can also acquire the following: '''Archgun''' Riven mods \u2013 from Arbitration Honors for 35 Vitus Essence '''Companion''' Weapon Riven mods \u2013 from Cephalon Simaris for 100,000 Standing or Acrithis for 20 Pathos Clamp`,
  "armored agility": "Armored Agility can be obtained as a random reward for completing mid-level Nightmare missions.",
  "ash locust helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits= 20,000 |build1= Salvage |build1amount=500 |build2= Alloy Plate |build2amount=350 |build3= Orokin Cell |build3amount=1 |build4= Neurodes |build4amount=2 |buildtime=12 |buildrush=25 |market=75 }}",
  "ash scorpion helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits= 20,000 |build1= Salvage |build1amount=500 |build2= Alloy Plate |build2amount=350 |build3= Orokin Cell |build3amount=1 |build4= Neurodes |build4amount=2 |buildtime=12 |buildrush=25 |market=75 }}",
  "banshee chorus helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits= 20,000 |build1= Salvage |build1amount=500 |build2= Alloy Plate |build2amount=350 |build3= Orokin Cell |build3amount=1 |build4= Neurodes |build4amount=2 |buildtime=12 |buildrush=25 |market=75 }}",
  "banshee reverb helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits= 20,000 |build1= Salvage |build1amount=500 |build2= Alloy Plate |build2amount=350 |build3= Orokin Cell |build3amount=1 |build4= Neurodes |build4amount=2 |buildtime=12 |buildrush=25 |market=75 }}",
  "ayatan star": "Kuakas and other wildlife in the Plains of Eidolon may drop Stars. They have a rare chance to drop from destroying Storage Containers or opening resource lockers. Including storage containers in Archwing missions, and althougth there will be no animation you are still able to aquire the star should you position yourself close enough. Ayatan Amber Star is a potential common-tier reward from opening Requiem Relics (though not Requiem Eterna). Some bounties in the Cambion Drift can reward a single Ayatan Amber Star for completing a stage. As of , a reusable Ayatan Amber Star blueprint can be acquired for 10 Vitus Essence from the Arbiters of Hexis room in any Relay. {{BuildRequire |buildcredits = 100,000 |build1 = Ayatan Cyan Star |build1amount = 2 |build2 = Vitus Essence |build2amount = 1 |buildtime = 1 |buildrush = 2 }}",
  "baruuk meroe helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits= 20,000 |build1= Salvage |build1amount=5,000 |build2= Alloy Plate |build2amount=3,500 |build3= Orokin Cell |build3amount=1 |build4= Neurodes |build4amount=2 |buildtime=12 |buildrush=25 |market=75 }}",
  "bellow voca": "Sanctum Anatomica (Albrecht's Laboratories) \u2014 Hidden collectible pickup & Cavia Bounties (1,000 Cavia Standing).",
  "biotic rounds": "Available for from the Nightwave Cred Offerings store on a rotational basis. '''Biotic Rounds''' was originally acquired by reaching Rank 25 with Nightwave during Nora's Mix Volume 8 Beginning with Amir's Shockwave, it was added to the Nightwave Cred Offerings.",
  "blazing step ephemera": "Blueprint from Pyr Captain, Glacik Commander, Lektro Commander, Blite Captain: 0.387%. Blueprint purchasable from Arbitration Store for '''30''' Vitus Essence {{BuildRequire |buildcredits =1,000,000 |build1 =Morphics |build1amount =100 |build2 =Ember Systems |build2amount =1 |build3 =Vitus Essence |build3amount =1 |buildtime =72 |buildrush =50 }}",
  "bursting mass": "Available for from the Nightwave Cred Offerings store on a rotational basis. Bursting mass was originally acquired by reaching Rank 18 in Nightwave during Series 1: The Wolf of Saturn Six or reaching Rank 20 during Intermission III. Beginning with Nightwave Nora\u2019s Mix: Vol. 5, it was added to the Nightwave Cred Offerings.",
  burston: "The Burston's blueprint and the resources required for its construction are awarded upon completion of Vor's Prize quest. Additional blueprints can be purchased from the Market. Can be sold for .",
  carcinnox: "Carcinnox Mk III= The '''Carcinnox Mk III''' is researched in the Clan Dojo's Dry Dock. {{BuildRequire |buildcredits = 10,000 |build1 = Isos |build1amount = 40 |build2 = Carbides |build2amount = 2,000 |build3 = Cubic Diodes |build3amount = 600 |build4 = |build4amount = |buildtime = 0 |lab = Railjack |researchcredits = |research1 = |research1amount = |research2 = |research2amount = |research3 = |research3amount = |research4 = |research4amount = |researchtime = 1 |prereq = Mk II }} The '''Lavan Carcinnox Mk III''' is dropped as wreckage by Exo Gokstad Crewships (2%) and Exo Skold Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Aucrux Capacitors |build1amount = 5 |build2 = Isos |build2amount = 40 |build3 = Carbides |build3amount = 2,000 |build4 = Cubic Diodes |build4amount = 600 |buildtime = 1 |buildrush = 20 }} The '''Vidar Carcinnox Mk III''' is dropped as wreckage by Exo Gokstad Crewships (2%), Exo Skold Crewships (2%) and Elite Exo Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Komms |build1amount = 5 |build2 = Isos |build2amount = 40 |build3 = Carbides |build3amount = 2,000 |build4 = Cubic Diodes |build4amount = 600 |buildtime = 1 |buildrush = 20 }} The '''Zetki Carcinnox Mk III''' is dropped as wreckage by Elite Exo Gokstad Crewships (2%) and Elite Exo Outriders (11.11%). {{BuildRequire |buildcredits = 15,000 |build1 = Nullstones |build1amount = 5 |build2 = Isos |build2amount = 40 |build3 = Carbides |build3amount = 2,000 |build4 = Cubic Diodes |build4amount = 600 |buildtime = 1 |buildrush = 20 }} |-|Carcinnox Mk II= The '''Carcinnox Mk II''' is researched in the Clan Dojo's Dry Dock. {{BuildRequire |buildcredits = 10,000 |build1 = Isos |build1amount = 30 |build2 = Carbides |build2amount = 1,500 |build3 = Cubic Diodes |build3amount = 450 |build4 = |build4amount = |buildtime = 0 |lab = Railjack |researchcredits = ? |research1 = Control Module |research1amount = 1 |research2 = Alloy Plate |research2amount = 750 |research3 = Ferrite |research3amount = 1,000 |research4 = Plastids |research4amount = 300 |researchtime = 1 |prereq = Mk I }} The '''Lavan Carcinnox Mk II''' is dropped as wreckage by Gyre Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Aucrux Capacitors |build1amount = 4 |build2 = Isos |build2amount = 30 |build3 = Carbides |build3amount = 1,500 |build4 = Cubic Diodes |build4amount = 450 |buildtime = 1 |buildrush = 20 }} The '''Vidar Carcinnox Mk II''' is dropped as wreckage by Gyre Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Komms |build1amount = 4 |build2 = Isos |build2amount = 30 |build3 = Carbides |build3amount = 1,500 |build4 = Cubic Diodes |build4amount = 450 |buildtime = 1 |buildrush = 20 }} The '''Zetki Carcinnox Mk II''' is dropped as wreckage by Elite Gyre Outriders (11.11%). {{BuildRequire |buildcredits = 15,000 |build1 = Nullstones |build1amount = 4 |build2 = Isos |build2amount = 30 |build3 = Carbides |build3amount = 1,500 |build4 = Cubic Diodes |build4amount = 450 |buildtime = 1 |buildrush = 20 }} |-|Carcinnox Mk I= The '''Carcinnox Mk I''' is researched in the Clan Dojo's Dry Dock. {{BuildRequire |buildcredits = 10,000 |build1 = Isos |build1amount = 20 |build2 = Carbides |build2amount = 1,000 |build3 = Cubic Diodes |build3amount = 300 |build4 = |build4amount = |buildtime = 0 |lab = Railjack |researchcredits = ? |research1 = Control Module |research1amount = 1 |research2 = Alloy Plate |research2amount = 500 |research3 = Ferrite |research3amount = 1,000 |research4 = Plastids |research4amount = 150 |researchtime = 1 }} The '''Lavan Carcinnox Mk I''' is dropped as wreckage by Kosma Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Aucrux Capacitors |build1amount = 3 |build2 = Isos |build2amount = 20 |build3 = Carbides |build3amount = 1,000 |build4 = Cubic Diodes |build4amount = 300 |buildtime = 1 |buildrush = 20 }} The '''Vidar Carcinnox Mk I''' is dropped as wreckage by Kosma Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Komms |build1amount = 3 |build2 = Isos |build2amount = 20 |build3 = Carbides |build3amount = 1,000 |build4 = Cubic Diodes |build4amount = 300 |buildtime = 1 |buildrush = 20 }} The '''Zetki Carcinnox Mk I''' is dropped as wreckage by Elite Kosma Outriders (11.11%). {{BuildRequire |buildcredits = 15,000 |build1 = Nullstones |build1amount = 3 |build2 = Isos |build2amount = 20 |build3 = Carbides |build3amount = 1000 |build4 = Cubic Diodes |build4amount = 300 |buildtime = 1 |buildrush = 20 }} |-|Carcinnox= The base '''Carcinnox''' blueprint is unlocked by default in the Clan Dojo's Dry Dock. {{BuildRequire |buildcredits = 10,000 |build1 = Isos |build1amount = 10 |build2 = Carbides |build2amount = 500 |build3 = Cubic Diodes |build3amount = 150 |build4 = |build4amount = |buildtime = 0 }}",
  catchmoon: "The blueprint for the chamber can be bought from Rude Zuud for 500 Standing at Rank 0 with Solaris United. {{BuildRequire |buildcredits = 5,000 |build1 = Mytocardia Spore |build1amount = 15 |build2 = Travocyte Alloy |build2amount = 20 |build3 = Scrubber Exa Brain |build3amount = 10 |build4 = Alloy Plate |build4amount = 1,700 |buildtime = 1 |buildrush = 25 |blueprint = 500 |blueprintunit = Standing }} To craft the actual Kitgun, players must have at least one built Catchmoon chamber, a chosen grip, and a chosen loader components. See Kitgun for more details.",
  "chesa kubrow": "The player must have completed the Howl of the Kubrow quest in order to have an operating Incubator on the Orbiter, as well as have acquired a Kubrow Egg from Kubrow Dens on the Grineer Forest tilesets of Earth and a built Incubator Power Core whose blueprint can be obtained from the Market. The Kubrow can be bred using the Incubator: a Random Incubation has a chance to create a Chesa Kubrow, while using two Genetic Code Templates bought from the Market can be applied to created Kubrows to have a chance to pass on genetic traits.",
  "chroma amaru helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits=20,000 |build1=Alloy Plate |build1amount=600 |build2=Oxium |build2amount=300 |build3=Gallium |build3amount=1 |build4=Tellurium |build4amount=2 |buildtime=12 |buildrush=25 |market=75 |buildtimeunit = hours}}",
  "chroma drac helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits=20,000 |build1=Alloy Plate |build1amount=600 |build2=Oxium |build2amount=300 |build3=Neurodes |build3amount=1 |build4=Tellurium |build4amount=2 |buildtime=12 |buildrush=25 |market=75 |buildtimeunit = hrs }}",
  cipher: "Its 1x and 10x blueprints can be bought from the Market at the Gear tab for and , respectively. Neither blueprint will be consumed on use. '''+1x Cipher''' {{BuildRequire |buildcredits= 100 |build1= Ferrite |build1amount=400 |build2= Salvage |build2amount=400 |build3= |build3amount= |build4= |build4amount= |buildtime=1 |buildtimeunit=min |buildrush=1 |blueprint=500 }} '''+10x Cipher''' {{BuildRequire |buildcredits=9,000 |build1=Ferrite |build1amount=3,600 |build2=Nano Spores |build2amount=3,600 |build3= |build3amount= |build4= |build4amount= |buildtime=1 |buildtimeunit=min |buildrush=1 |blueprint=250,000 }} '''+100x Cipher''' The reusable blueprints for 100x Cipher can be acquired through research in a Dojo's Tenno Lab {{BuildRequire |blueprint= 15000 |buildcredits = 90000 |build1 = Ferrite |build1amount = 36000 |build2 = Nano Spores |build2amount = 36000 |buildtime = 1 |buildtimeunit = min |buildrush = 1 |lab = Tenno |affinityamount = 3,000 |researchcredits = 10,000 |research1 = Carbides |research1amount = 3,500 |research2 = Titanium |research2amount = 3,500 |research3 = Asterite |research3amount = 100 |research4 = Aucrux Capacitors |research4amount = 5 |researchtime = 72 |researchtimeunit = hrs }}",
  "clip delegation": "Available for from the Nightwave Cred Offerings store on a rotational basis. Clip Delegation was originally acquired by reaching Rank 15 in Nightwave during Nora's Mix Volume 6. Beginning with Nightwave Nora\u2019s Mix: Dreams of the Dead, it was added to the Nightwave Cred Offerings.",
  "combat reload": "Available for from the Nightwave Cred Offerings store on a rotational basis. Combat Reload was originally acquired by reaching Rank 23 in Nightwave during Nora's Mix Volume 1. Beginning with Nightwave Nora\u2019s Mix: Vol. 7, it was added to the Nightwave Cred Offerings.",
  "corrosive projection": "Available for creds from the Nightwave Cred Offerings store.",
  cortege: "The Cortege main blueprint can be acquired by reaching '''Rank 3 - Clearance: Odima''' with the Necraloid. The main blueprint is offered as a rank up reward, but Necraloid sells additional main blueprints for 8,000 Standing. Components are crafted from blueprints that can be acquired for 4,000 Standing each after reaching '''Rank 2 - Clearance: Modus''' with the syndicate. Once crafted, it comes with a pre-installed Gravimag. Additionally requires '''Rank 2 - Visitor''' with Ostron in order to acquire Fersteel Alloy required in its construction. The Damaged Necramech Weapon parts are acquired from Normal and Arcana Isolation Vault Bounty rewards. The Damaged Necramech Weapon parts and fully built Cortege components can be traded between players. Trading for fully built components will bypass the need for Ostron's Fersteel Alloy.",
  "specter (tenno)": `The blueprints necessary to build Specters are automatically rewarded by Rescue missions upon completion, with the type of Blueprint dropped depending on the node that was played, and how many points were acquired. In total, three points can be attained in a mission: one point for rescuing the target, another point for not triggering the execution sequence in the process, and one more point for killing all the Wardens. Additionally, '''Vapor Specter x10 Blueprint''' can be directly purchased up to 7 times per week at '''Nightcap''' in Fortuna for 50 Fergolyte each (requiring '''Rank''' '''2 - Curious''' to access them). {| class="wikitable" style="width:100%; margin:auto; text-align:center;" |- |'''Points''' |'''Easy Rewards'''Level 1-15 |'''Medium Rewards'''Level 16-25 |'''Hard Rewards'''Level 25+ |'''Nightmare Rewards'''As it Occurs |- |1 |None |\u2605Vapor Specter BP |\u2605\u2605Phase Specter BP |\u2605\u2605\u2605Force Specter BP |- |2 |\u2605Vapor Specter BP |\u2605\u2605Phase Specter BP |\u2605\u2605\u2605Force Specter BP |\u2605\u2605\u2605\u2605Cosmic Specter BP |- |3 |\u2605\u2605Phase Specter BP |\u2605\u2605\u2605Force Specter BP |\u2605\u2605\u2605\u2605Cosmic Specter BP |\u2605\u2605\u2605\u2605Cosmic Specter BP |} Vapor= 200px|right The '''Vapor Specter''' (or '''Bronze Specter''') blueprint is rewarded from Easy and Medium difficulty Rescue missions, and yields 10 Specter uses per build. Spawns at the current level of the enemies in the mission. There are no AI differences between specter ranks. {{BuildRequire |buildcredits=15,000 |build1=Salvage |build1amount=7,500 |build2=Ferrite |build2amount=5,000 |buildtime=8 |buildrush=20 }} |-|Phase= 200px|right The '''Phase Specter''' (or '''Silver Specter''') blueprint is rewarded from Easy, Medium and Hard difficulty Rescue missions, and yields 5 Specter uses per build. Spawns at the current level of the enemies in the mission, plus three levels. There are no AI differences between specter ranks. {{BuildRequire |buildcredits=30,000 |build1=Polymer Bundle |build1amount=750 |build2=Nano Spores |build2amount=5,000 |build3=Salvage |build3amount=5,000 |build4=Alloy Plate |build4amount=1,000 |buildtime=8 |buildrush=20 }} |-|Force= 200px|right The '''Force Specter''' (or '''Gold Specter''') blueprint is rewarded from Medium, Hard, and Nightmare difficulty Rescue missions, and yields 3 Specter uses per build. Spawns at the current level of the enemies in the mission, plus five levels. There are no AI differences between specter ranks. {{BuildRequire |buildcredits=50,000 |build1=Polymer Bundle |build1amount=1,000 |build2=Plastids |build2amount=1,000 |build3=Alloy Plate |build3amount=1,000 |build4=Circuits |build4amount=1000 |buildtime=8 |buildrush=20 }} |-|Cosmic= 200px|right The '''Cosmic Specter''' (or '''Platinum Specter''') blueprint is rewarded from Hard and Nightmare difficulty Rescue missions, and yields a single Specter usage per build. Spawns at the current level of the enemies in the mission, plus ten levels. There are no AI differences between specter ranks. {{BuildRequire |buildcredits=60,000 |build1=Circuits |build1amount=500 |build2=Plastids |build2amount=1,000 |build3=Nano Spores |build3amount=5,000 |build4=Gallium |build4amount=1 |buildtime=8 |buildrush=20 }}`,
  "critical mutation": "Available for from the Nightwave Cred Offerings store on a rotational basis. Critical Mutation was originally acquired by reaching Rank 13 in Nightwave during Nora's Mix Volume 5. Beginning with Nightwave Nora\u2019s Mix: Vol. 9, it was added to the Nightwave Cred Offerings.",
  "critical precision": "Available for from the Nightwave Cred Offerings store on a rotational basis. Critical Precision was originally acquired by reaching Rank 13 in Nightwave during Nora's Mix Volume 2. Beginning with Nightwave Nora\u2019s Mix: Vol. 7, it was added to the Nightwave Cred Offerings.",
  cryophon: "|-|Cryophon Mk III= The '''Cryophon Mk III''' is researched in the Clan Dojo's Dry Dock. {{BuildRequire |buildcredits = 10,000 |build1 = Gallos Rods |build1amount = 40 |build2 = Titanium |build2amount = 2,000 |build3 = Carbides |build3amount = 600 |build4 = |build4amount = |buildtime = 0 |lab = Railjack |researchcredits = |research1 = |research1amount = |research2 = |research2amount = |research3 = |research3amount = |research4 = |research4amount = |researchtime = 1 |prereq = Mk II }} The '''Lavan Cryophon Mk III''' is dropped as wreckage by Exo Gokstad Crewships (2%) and Exo Skold Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Komms |build1amount = 5 |build2 = Gallos Rods |build2amount = 40 |build3 = Titanium |build3amount = 2,000 |build4 = Carbides |build4amount = 600 |buildtime = 1 |buildrush = 20 }} The '''Vidar Cryophon Mk III''' is dropped as wreckage by Exo Gokstad Crewships (2%), Exo Skold Crewships (2%) and Elite Exo Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Nullstones |build1amount = 5 |build2 = Gallos Rods |build2amount = 40 |build3 = Titanium |build3amount = 2,000 |build4 = Carbides |build4amount = 600 |buildtime = 1 |buildrush = 20 }} The '''Zetki Cryophon Mk III''' is dropped as wreckage by Elite Exo Gokstad Crewships (2%) and Elite Exo Outriders (11.11%). {{BuildRequire |buildcredits = 15,000 |build1 = Aucrux Capacitors |build1amount = 5 |build2 = Gallos Rods |build2amount = 40 |build3 = Titanium |build3amount = 2,000 |build4 = Carbides |build4amount = 600 |buildtime = 1 |buildrush = 20 }} |-|Cryophon Mk II= The '''Cryophon Mk II''' is researched in the Clan Dojo's Dry Dock. {{BuildRequire |buildcredits = 10,000 |build1 = Gallos Rods |build1amount = 30 |build2 = Titanium |build2amount = 1,500 |build3 = Carbides |build3amount = 450 |build4 = |build4amount = |buildtime = 0 |lab = Railjack |researchcredits = ? |research1 = Morphics |research1amount = 1 |research2 = Ferrite |research2amount = 750 |research3 = Nano Spores |research3amount = 1,250 |research4 = Polymer Bundle |research4amount = 300 |researchtime = 1 |prereq = Mk I }} The '''Lavan Cryophon Mk II''' is dropped as wreckage by Gyre Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Komms |build1amount = 4 |build2 = Gallos Rods |build2amount = 30 |build3 = Titanium |build3amount = 1,500 |build4 = Carbides |build4amount = 450 |buildtime = 1 |buildrush = 20 }} The '''Vidar Cryophon Mk II''' is dropped as wreckage by Gyre Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Nullstones |build1amount = 4 |build2 = Gallos Rods |build2amount = 30 |build3 = Titanium |build3amount = 1,500 |build4 = Carbides |build4amount = 450 |buildtime = 1 |buildrush = 20 }} The '''Zetki Cryophon Mk II''' is dropped as wreckage by Elite Gyre Outriders (11.11%). {{BuildRequire |buildcredits = 15,000 |build1 = Aucrux Capacitors |build1amount = 4 |build2 = Gallos Rods |build2amount = 30 |build3 = Titanium |build3amount = 1,500 |build4 = Carbides |build4amount = 450 |buildtime = 1 |buildrush = 20 }} |-|Cryophon Mk I= The '''Cryophon Mk I''' is researched in the Clan Dojo's Dry Dock. {{BuildRequire |buildcredits = 10,000 |build1 = Gallos Rods |build1amount = 20 |build2 = Titanium |build2amount = 1,000 |build3 = Carbides |build3amount = 300 |build4 = |build4amount = |buildtime = 0 |lab = Railjack |researchcredits = ? |research1 = Morphics |research1amount = 1 |research2 = Ferrite |research2amount = 500 |research3 = Nano Spores |research3amount = 1,000 |research4 = Polymer Bundle |research4amount = 150 |researchtime = 1 }} The '''Lavan Cryophon Mk I''' is dropped as wreckage by Kosma Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Komms |build1amount = 3 |build2 = Gallos Rods |build2amount = 20 |build3 = Titanium |build3amount = 1,000 |build4 = Carbides |build4amount = 300 |buildtime = 1 |buildrush = 20 }} The '''Vidar Cryophon Mk I''' is dropped as wreckage by Kosma Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Nullstones |build1amount = 3 |build2 = Gallos Rods |build2amount = 20 |build3 = Titanium |build3amount = 1,000 |build4 = Carbides |build4amount = 300 |buildtime = 1 |buildrush = 20 }} The '''Zetki Cryophon Mk I''' is dropped as wreckage by Elite Kosma Outriders (11.11%). {{BuildRequire |buildcredits = 15,000 |build1 = Aucrux Capacitors |build1amount = 3 |build2 = Gallos Rods |build2amount = 20 |build3 = Titanium |build3amount = 1,000 |build4 = Carbides |build4amount = 300 |buildtime = 1 |buildrush = 20 }} |-|Cryophon= The base '''Cryophon''' blueprint is unlocked by default in the Clan Dojo's Dry Dock. {{BuildRequire |buildcredits = 10,000 |build1 = Gallos Rods |build1amount = 10 |build2 = Titanium |build2amount = 500 |build3 = Carbides |build3amount = 150 |build4 = |build4amount = |buildtime = 0 }}",
  "cyte-09 espricor helmet": "The '''Cyte-09 Espricor Helmet''' can be bought from the Market for , or as part of the 1999 Cyte-09 Bullseye Bundle for , which also includes the Cyte-09, Reconifex, Cyte-09 Target Sigil, Cyte-09 Deadeye Glyph, a 3-Day Affinity Booster and the Timelost Artifact Decoration. Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits = 20000 |build1 = Salvage |build1amount = 5000 |build2 = Alloy Plate |build2amount = 3500 |build3 = Orokin Cell |build3amount = 1 |build4 = Neurodes |build4amount = 2 |buildtime = 12 |buildrush = 25 |market=75 }}",
  "dagath ganceann helmet": "The '''Dagath Ganceann Helmet''' can be bought from the Market for , or as part of the Dagath Collection for , which also includes the Dagath, Dorrclave and the Aumen Kaithe Collection. Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits = 20,000 |build1 = Alloy Plate |build1amount = 1500 |build2 = Rubedo |build2amount = 1200 |build3 = Polymer Bundle |build3amount = 600 |build4 = Argon Crystal |build4amount = 2 |buildtime = 12 |buildrush = 25 |market=75 }}",
  "daedalus armor bundle": "'''''' is purchaseable from the Market for }}. Bundle price is automatically prorated (reduced) if the player have one or more items within the bundle already. Individually, the pieces can be purchased for: DaedalusChestPlate.png|}} DaedalusShoulderPlates.png|}} DaedalusSpurs.png|}} Category:Bundle __NOTOC__",
  "dante cantist helmet": "Can be purchased directly from the in-game Market for , or as part of the Dante Collection for which also includes Dante, Ruvox, Oranist Shoulder Plates, Oranist Chest Plate, Rencowl Syandana, and Noctua's Paragrimm. Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits=20,000 |build1=Salvage |build1amount=1500 |build2=Nano Spores |build2amount=1200 |build3=Circuits |build3amount=500 |build4=Nitain Extract |build4amount=2 |buildtime=12 |buildrush=25 |market=75 |buildtimeunit = hr }}",
  "dead eye": "Available for creds from the Nightwave Cred Offerings store.",
  "deadly maneuvers": "Available for from the Nightwave Cred Offerings store on a rotational basis. Deadly Maneuvers was originally acquired by reaching Rank 7 in Nightwave during Series 3. Beginning with Nightwave Nora\u2019s Mix: Vol. 6, it was added to the Nightwave Cred Offerings.",
  "dizzying rounds": "Available for from the Nightwave Cred Offerings store on a rotational basis. Dizzying Rounds was originally acquired by reaching Rank 20 in Nightwave during Series 3. Beginning with Nightwave Nora\u2019s Mix: Vol. 6, it was added to the Nightwave Cred Offerings.",
  "dreamer's bond": "Awarded from completing the Earth to Venus Junction. Players who have already completed the Junction prior to will receive the mod in their inbox messages. Available for creds from the Nightwave Cred Offerings store.",
  "dual zoren": "The Dual Zoren's blueprint can be purchased from the Market.",
  "echo voca": "Sanctum Anatomica (Albrecht's Laboratories) \u2014 Hidden collectible pickup, Cavia Bounties, Netracells & Deep Archimedea (2,000 Cavia Standing).",
  "efficient beams": "Available for from the Nightwave Cred Offerings store on a rotational basis. Efficient Beams was originally acquired by reaching Rank 7 in Nightwave during Series 2: The Emissary Beginning with Nightwave Nora\u2019s Mix: Vol. 5, it was added to the Nightwave Cred Offerings.",
  "ember backdraft helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits= 20,000 |build1= Salvage |build1amount=500 |build2= Alloy Plate |build2amount=350 |build3= Orokin Cell |build3amount=1 |build4= Neurodes |build4amount=2 |buildtime=12 |buildrush=25 |market=75 }}",
  "edo armor bundle": "'''''' is purchaseable from the Market for }}. Bundle price is automatically prorated (reduced) if the player have one or more items within the bundle already. Individually, the pieces can be purchased for: EdoChestPlate.png|}} EdoShoulderPlates.png|}} EdoShinPlates.png|}} Category:Bundle __NOTOC__",
  "ember phoenix helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits= 20,000 |build1= Salvage |build1amount=500 |build2= Alloy Plate |build2amount=350 |build3= Orokin Cell |build3amount=1 |build4= Neurodes |build4amount=2 |buildtime=12 |buildrush=25 |market=75 }}",
  "enemy radar": "Available for creds from the Nightwave Cred Offerings store.",
  "energy siphon": "Available for creds from the Nightwave Cred Offerings store.",
  "eos armor bundle": "'''''' is purchaseable from the Market for }}. Bundle price is automatically prorated (reduced) if the player have one or more items within the bundle already. Individually, the pieces can be purchased for: EosChestPlate.png|}} EosShoulderPlates.png|}} EosSpurs.png|}} Category:Bundle __NOTOC__",
  "excalibur avalon helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits= 20,000 |build1= Salvage |build1amount=500 |build2= Alloy Plate |build2amount=350 |build3= Orokin Cell |build3amount=1 |build4= Neurodes |build4amount=2 |buildtime=12 |buildrush=25 |market=75 }}",
  "excalibur mordred helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits= |build1=Ferrite |build1amount=500 |build2=Alloy Plate |build2amount=350 |build3=Orokin Cell |build3amount=1 |build4=Morphics |build4amount=2 |buildtime=12 |buildrush=25 |market=75 |buildcost = 20,000 }}",
  "excalibur pendragon helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits= 20,000 |build1= Salvage |build1amount=500 |build2= Alloy Plate |build2amount=350 |build3= Orokin Cell |build3amount=1 |build4= Neurodes |build4amount=2 |buildtime=12 |buildrush=25 |market=75 }}",
  "exilus weapon adapter": "Purchased blueprint from any of the Faction Syndicates for 75,000 Standing. Blueprint awarded from Requiem Relics. Sometimes obtained complete from the 1999 Calendar. Sometimes purchased complete from Acrithis's shop for 20 Pathos Clamp. Purchased complete from the Market for under '''Equipment''' \u2192 '''Components'''. {{BuildRequire |buildcredits = 25,000 |build1 = Forma |build1amount = 1 |build2 = Exceptional Sentient Core |build2amount = 1 |build3 = Orokin Cell |build3amount = 1 |buildtime = 23 |buildrush = 10 |market = 20 |blueprint = 75,000 |blueprintunit = Standing }}",
  "eximus advantage": "Available for from the Nightwave Cred Offerings store on a rotational basis. Eximus Advantage was originally acquired by reaching Rank 13 in Nightwave during Nora's Mix Volume 3. Beginning with Nightwave Nora\u2019s Mix: Vol. 8, it was added to the Nightwave Cred Offerings.",
  "excalibur/umbra": "The blueprint for Excalibur Umbra is given to players upon completing the first mission of The Sacrifice quest, and the ability to build the Warframe is granted on completing the second mission. Unlike other Warframes, Umbra requires no further components and is crafted entirely from the single blueprint. However, even after being crafted, he cannot be used until the penultimate mission, where he is automatically Rank 30 with a free, pre-installed Orokin Reactor and Warframe slot. A second blueprint will not be given on replays. Also unlike other quest-tied Warframes, Cephalon Simaris does not sell Excalibur Umbra blueprints. Thus the player can only own one copy of Excalibur Umbra. {{BuildRequire |buildcredits = 10,000 |build1 = Orokin Cell |build1amount = 1 |build2 = Kuva |build2amount = 60 |build3 = Nano Spores |build3amount = 1,200 |build4 = Alloy Plate |build4amount = 1,600 |buildtime = 10 |buildtimeunit = s |buildrush = 0 }}",
  "exposing harpoon": "Available for from the Nightwave Cred Offerings store on a rotational basis. Exposing Harpoon was originally acquired by reaching Rank 20 in Nightwave during Series 2: The Emissary or Rank 20 during Nora's Choice. Beginning with Nightwave Nora\u2019s Mix: Vol. 5, it was added to the Nightwave Cred Offerings.",
  "faithful void offering": "The Faithful Void Offering could be purchased for from the Market, found under '''Equipment''', subsection '''Gear'''. However, it was discontinued after the event officially ended. Void Offerings were mistakenly released prior to the event as reusable blueprints, rather than individual charges. Though these are noticeably more costly, players who purchased these blueprints can continue to craft charges despite the event's conclusion.",
  fieldron: "Its blueprint can be researched from the Energy Lab in the dojo. 3 are offered as a reward for completing Corpus Invasion type missions. Can be found in Rare and Reinforced Corpus Storage Containers. Sometimes available as Tier 4 Bounty rewards in Orb Vallis after completing a stage. {{BuildRequire |buildcredits = 15,000 |build1 = Fieldron Sample |build1amount = 10 |build2 = Control Module |build2amount = 1 |build3 = Salvage |build3amount = 500 |build4 = Plastids |build4amount = 250 |buildtime = 12 |buildrush = 5 |blueprint = 15,000 |market = |lab = Energy |researchcredits = 5,000 |research1 = Fieldron Sample |research1amount = 5 |research2 = Rubedo |research2amount = 100 |research3 = Nano Spores |research3amount = 500 |research4 = Polymer Bundle |research4amount = 200 |researchtime = 72 |affinityamount = 2,000 |prereq = }}",
  fosfor: "The reusable Fosfor blueprints can be bought from Nakak in Cetus. The actual price of buying the blueprints changes daily, though the payment will always be in Plains of Eidolon-exclusive resources. Crafting a Fosfor in the Foundry will create '''20''' charges of the item for use.",
  "frigid blast": "This mod can be acquired as a random end-of mission reward for a successful Spy mission with all 3 Data Vaults hacked. Drop Locations: Originally this mod could be acquired from Operation Cryotic Front by scoring more than 1000 points in a single mission.",
  "frost aurora helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits= 20,000 |build1= Salvage |build1amount=500 |build2= Alloy Plate |build2amount=350 |build3= Orokin Cell |build3amount=1 |build4= Neurodes |build4amount=2 |buildtime=12 |buildrush=25 |market=75 }}",
  "frost squall helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits= 20,000 |build1= Salvage |build1amount=500 |build2= Alloy Plate |build2amount=350 |build3= Orokin Cell |build3amount=1 |build4= Neurodes |build4amount=2 |buildtime=12 |buildrush=25 |market=75 }}",
  frostbite: "This mod can be acquired as a random end-of mission reward for a successful Spy mission with all 3 Data Vaults hacked. Drop Locations: Originally this mod could be acquired from Operation Cryotic Front by scoring more than 1000 points in a single mission.",
  ganglion: `'''Ganglion''' is a resource that can be found in the Cambion Drift. They are found on Haptic Fronds, and may also be rewarded from Bounties. ==Item Checklist for == {| class="listtable sortable lighttable store-table" style="width: 400px;" data-tableid="Ganglion General Checklist" ! Item ! Type ! data-sort-type="number" | Quantity<`,
  "gara virago helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits= 20,000 |build1= Salvage |build1amount=5,000 |build2= Alloy Plate |build2amount=3,500 |build3= Orokin Cell |build3amount=1 |build4= Neurodes |build4amount=2 |buildtime=12 |buildrush=25 |market=75 }}",
  "gauss mag helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits = 20,000 |build1 = Salvage |build1amount = 500 |build2 = Alloy Plate |build2amount = 350 |build3 = Orokin Cell |build3amount = 1 |build4 = Neurodes |build4amount = 2 |buildtime = 12 |buildrush = 25 |market = 75 }}",
  gaze: "The blueprint for the chamber can be bought from Rude Zuud for 500 Standing at Rank 0 with Solaris United. {{BuildRequire |buildcredits = 5,000 |build1 = Tepa Nodule |build1amount = 15 |build2 = Venerdo Alloy |build2amount = 40 |build3 = Kriller Thermal Laser |build3amount = 40 |build4 = Cryotic |build4amount = 1,200 |buildtime = 1 |buildrush = 25 |blueprint = 500 |blueprintunit = Standing }} To craft the actual Kitgun, players must have at least one built Gaze chamber, a chosen grip, and a chosen loader components. See Kitgun for more details.",
  "grendel glutt helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits = 20,000 |build1 = Salvage |build1amount = 500 |build2 = Alloy Plate |build2amount = 350 |build3 = Orokin Cell |build3amount = 1 |build4 = Neurodes |build4amount = 2 |buildtime = 12 |buildrush = 25 |market = 75 }}",
  "k-drive": "Players will receive the K-Drive Launcher which is a Gear item used to summon K-Drives in Landscapes, as well a free but basic '''Bondi K-Drive''' upon completing the Vox Solaris quest in Fortuna. However, the Bondi K-Drive does not appear in the Arsenal, thus it cannot be altered or modded, and cannot be leveled nor will it grant points towards Mastery Ranks. Custom-built K-Drives may be obtained by assembling individual parts traded from Standing; with each Ventkids Ranking causing more parts to become available. Alternatively, players can spend Platinum to purchase a randomly assembled K-Drive through the Ventkids' '''Daily Specials'''. Players can manage their K-Drives in the '''Vehicles''' section of the Arsenal, where players can select their currently active K-Drive as well as mod their custom K-Drives. Velocipods found in Cambion Drift can be ridden on like a K-Drive. Son sells K-Drive Velocipod skins for Entrati standing. These skins can be colored like normal gear, the only difference between them being the color of their eyes and the lights emitted from their wings. Equipping one of these skins on a K-Drive with Steeba or Gristlebuck will not hide the tendrils of those parts. Yareli has the ability to summon her exalted K-Drive Merulina. Unlike normal K-Drives, Merulina can be used in normal missions.",
  grokdrul: "Grokdrul is a resource that can be found in Grineer camps on Plains of Eidolon, stored in drums. Grokdrul is also rewarded by Bounties. The higher level the mission you take on the Plains, the more Grokdrul the player will obtain from drums, up to 5 per drum on the highest level missions. ==It",
  "harrow crucis helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits =20000 |build1 =Salvage |build1amount =5000 |build2 =Alloy Plate |build2amount =3500 |build3 =Orokin Cell |build3amount =1 |build4 =Neurodes |build4amount =2 |buildtime = 12 |buildrush = 25 |market = 75 }}",
  "harrow suffragan helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits = 20,000 |build1 = Salvage |build1amount = 5,000 |build2 = Alloy Plate |build2amount = 3,500 |build3 = Orokin Cell |build3amount = 1 |build4 = Neurodes |build4amount = 2 |buildtime = 12 |buildrush = 25 |market = 75 }}",
  "helminth charger": `right|299px|The Kubrow Incubator screen, with Helminth Cyst section visible. The player must have completed the Howl of the Kubrow quest in order to have an operating Incubator on the Orbiter, as well as have acquired a Kubrow Egg from Kubrow Dens on the Grineer Forest tilesets of Earth and a built Incubator Power Core whose blueprint can be obtained from the Market. Unlike other Kubrow breeds, the Helminth Charger requires a Helminth Cyst. Using the Nidus or Nidus Prime Warframe in the Orbiter's Helminth room will trigger an injection, which can spread to other player's Warframes in missions, Clan Dojos, or another player's Orbiter. 24 hours after infection, a pink cyst will appear on the infected Warframe's neck, which will reach full size after another 6 days indicated by a single tendril emerging from the follicle. While using the infected Warframe with a fully matured cyst, the player can select "Begin Incubation" under the Kubrow Breeding tab. There, a new Helminth Cyst option will appear at the bottom of the Incubator menu via a button marked "Drain". Clicking this will bring up a confirmation dialog, after which the incubation process will proceed as it would for any other Kubrow.`,
  "hildryn asuron helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits =20000 |build1 =Salvage |build1amount =500 |build2 =Alloy Plate |build2amount =350 |build3 =Orokin Cell |build3amount =1 |build4 =Neurodes |build4amount =2 |buildtime = 12 |buildrush = 25 |market = 75 }}",
  "holster amp": "Available for creds from the Nightwave Cred Offerings store.",
  "humble void offering": "The Humble Void Offering could be purchased for from the Market, found under '''Equipment''', subsection '''Gear'''. However, it was discontinued after the event officially ended. Void Offerings were mistakenly released prior to the event as reusable blueprints, rather than individual charges. Though these are noticeably more costly, players who purchased these blueprints can continue to craft charges despite the event's conclusion.",
  "huras kubrow": "The player must have completed the Howl of the Kubrow quest in order to have an operating Incubator on the Orbiter, as well as have acquired a Kubrow Egg from Kubrow Dens on the Grineer Forest tilesets of Earth and a built Incubator Power Core whose blueprint can be obtained from the Market. The Kubrow can be bred using the Incubator: a Random Incubation has a chance to create a Huras Kubrow, while using two Genetic Code Templates bought from the Market can be applied to created Kubrows to have a chance to pass on genetic traits.",
  "hydroid ketos helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire | buildcredits = 20,000 | build1 = Plastids | build1amount = 500 | build2 = Alloy Plate | build2amount = 350 | build3 = Argon Crystal | build3amount = 1 | build4 = Morphics | build4amount = 2 | buildtime = 12 | buildrush = 25 | market = 75 }}",
  "hydroid triton helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits= 20,000 |build1= Salvage |build1amount= 500 |build2= Alloy Plate |build2amount= 350 |build3= Orokin Cell |build3amount= 1 |build4= Neurodes |build4amount= 2 |buildtime=12 |buildrush=25 |market=75 }}",
  "inaros canopic helmet": "Can be purchased directly from the in-game Market for . Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis. {{BuildRequire |buildcredits=20000 |build1=Neural Sensors |build1amount=5 |build2=Alloy Plate |build2amount=6000 |build3=Plastids |build3amount=2500 |build4= Nitain Extract |build4amount=3 |buildtime=12 |buildrush=25 |market=75 }}",
  "infested catalyst": "Infested Catalysts are acquired by completing the required Research project in a Clan Dojo's Bio Lab Research room, then buying the reusable blueprint for . Crafting in the Foundry will give '''5''' charges of the Catalyst for use. {{BuildRequire |buildcredits=500 |build1= Plastids |build1amount=500 |build2= Ferrite |build2amount=2,300 |build3= Nano Spores |build3amount=1,800 |build4= |build4amount= |buildtime=1 |buildtimeunit=minute |buildrush=5 |blueprint=5,000 |market= |lab=Bio |researchcredits=500 |research1=Neurodes |research1amount=14 |research2=Ferrite |research2amount=21,500 |research3=Nano Spores |research3amount=19,500 |research4=Plastids |research4amount=11,500 |affinityamount=2,000 |researchtime=24 |prereq= }}",
  "infested impedance": "Available for creds from the Nightwave Cred Offerings store.",
  "karak wraith": "Karak Wraith was introduced during the Operation: Tubemen of Regor event, where players would need to complete a minimum of four regional battles in favor of one side more than the other, and Alad V was the victor of the conflict. Alad V had won the conflict in the PC and XB1 versions of the game, but not in the PS4. The weapon was fully built and came with a free weapon slot and a pre-installed Orokin Catalyst. The blueprint and parts were formerly a reward from the First and Third Seasons of Sorties; they can now be found as an Invasion reward. All components can be traded, although players must have a Mastery Rank of at least 7 to acquire the blueprint.",
  kaszas: `The Kaszas's blueprint can be purchased from the Market. Its parts can be purchased from various Syndicates. All parts, except for the blueprint, are tradeable. {| class="wikitable" style="text-align:center;" |- ! Item || Location |- | Blueprint || Market |- | 40px Blade || Red Veil Offering2 - '''Honored''' 20,000 Standing |- | 40px Handle || Steel Meridian Offering2 - '''Valiant''' 20,000 Standing |- |}`,
  keratinos: "Keratinos are acquired by reaching '''Rank 0 - Neutral''' with the Entrati. Father sells the main blueprint for 1,000 Standing and component blueprints for 500 Standing; a total of 3,000 Standing is needed for all parts. ;Keratinos Blades {{BuildRequire |buildcredits = 20000 |build1 = Adramal Alloy |build1amount = 40 |build2 = Pustulite |build2amount = 24 |build3 = Purged Dagonic |build3amount = 6 |build4 = Gallium |build4amount = 4 |buildtime = 12 |buildtimeunit = hrs |buildrush = 25 |blueprint = 500 |blueprintunit = Standing |market = }} ;Keratinos Gauntlet {{BuildRequire |buildcredits = 20000 |build1 = Ferment Bladder |build1amount = 20 |build2 = Ganglion |build2amount = 16 |build3 = Waxen Sebum Deposit |build3amount = 6 |build4 = Neurodes |build4amount = 4 |buildtime = 12 |buildtimeunit = hrs |buildrush = 25 |blueprint = 500 |blueprintunit = Standing |market = }}",
  komorex: "The Komorex's blueprint can be researched from the Energy Lab in the dojo.",
  "kullervo's bane": "Duviri \u2014 Defeating Kullervo at Kullervo's Hold during Sorrow, Anger, or Fear Spirals (4-6 per run, 6-8 on Steel Path); redeem with Acrithis.",
  "leaded gas": "Available for from the Nightwave Cred Offerings store on a rotational basis. '''Leaded Gas''' was originally acquired by reaching Rank 13 with Nightwave during Nora's Mix Volume 8. Beginning with Amir's Shockwave, it was added to the Nightwave Cred Offerings.",
  photor: "Photor Mk III= The '''Photor Mk III''' is researched in the Clan Dojo's Dry Dock. {{BuildRequire |buildcredits = 10,000 |build1 = Asterite |build1amount = 40 |build2 = Titanium |build2amount = 2,000 |build3 = Cubic Diodes |build3amount = 600 |build4 = |build4amount = |buildtime = 0 |lab = Railjack |researchcredits = |research1 = |research1amount = |research2 = |research2amount = |research3 = |research3amount = |research4 = |research4amount = |researchtime = 1 |prereq = Mk II }} The '''Lavan Photor Mk III''' is dropped as wreckage by Exo Gokstad Crewships (2%) and Exo Skold Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Nullstones |build1amount = 5 |build2 = Asterite |build2amount = 40 |build3 = Titanium |build3amount = 2,000 |build4 = Cubic Diodes |build4amount = 600 |buildtime = 1 |buildrush = 20 }} The '''Vidar Photor Mk III''' is dropped as wreckage by Exo Gokstad Crewships (2%), Exo Skold Crewships (2%) and Elite Exo Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Aucrux Capacitors |build1amount = 5 |build2 = Asterite |build2amount = 40 |build3 = Titanium |build3amount = 2,000 |build4 = Cubic Diodes |build4amount = 600 |buildtime = 1 |buildrush = 20 }} The '''Zetki Photor Mk III''' is dropped as wreckage by Elite Exo Gokstad Crewships (2%) and Elite Exo Outriders (11.11%). {{BuildRequire |buildcredits = 15,000 |build1 = Komms |build1amount = 5 |build2 = Asterite |build2amount = 40 |build3 = Titanium |build3amount = 2,000 |build4 = Cubic Diodes |build4amount = 600 |buildtime = 1 |buildrush = 20 }} |-|Photor Mk II= The '''Photor Mk II''' is researched in the Clan Dojo's Dry Dock. {{BuildRequire |buildcredits = 10,000 |build1 = Asterite |build1amount = 30 |build2 = Titanium |build2amount = 1,500 |build3 = Cubic Diodes |build3amount = 450 |build4 = |build4amount = |buildtime = 0 |lab = Railjack |researchcredits = 100 |research1 = Control Module |research1amount = 1 |research2 = Nano Spores |research2amount = 750 |research3 = Alloy Plate |research3amount = 1,250 |research4 = Polymer Bundle |research4amount = 300 |researchtime = 1 |prereq = Mk I }} The '''Lavan Photor Mk II''' is dropped as wreckage by Gyre Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Nullstones |build1amount = 4 |build2 = Asterite |build2amount = 30 |build3 = Titanium |build3amount = 1,500 |build4 = Cubic Diodes |build4amount = 450 |buildtime = 1 |buildrush = 20 }} The '''Vidar Photor Mk II''' is dropped as wreckage by Gyre Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Aucrux Capacitors |build1amount = 4 |build2 = Asterite |build2amount = 30 |build3 = Titanium |build3amount = 1,500 |build4 = Cubic Diodes |build4amount = 450 |buildtime = 1 |buildrush = 20 }} The '''Zetki Photor Mk II''' is dropped as wreckage by Elite Gyre Outriders (11.11%). {{BuildRequire |buildcredits = 15,000 |build1 = Komms |build1amount = 4 |build2 = Asterite |build2amount = 30 |build3 = Titanium |build3amount = 1,500 |build4 = Cubic Diodes |build4amount = 450 |buildtime = 1 |buildrush = 20 }} |-|Photor Mk I= The '''Photor Mk I''' is researched in the Clan Dojo's Dry Dock. {{BuildRequire |buildcredits = 10,000 |build1 = Asterite |build1amount = 20 |build2 = Titanium |build2amount = 1,000 |build3 = Cubic Diodes |build3amount = 300 |build4 = |build4amount = |buildtime = 0 |lab = Railjack |researchcredits = ? |research1 = Control Module |research1amount = 1 |research2 = Nano Spores |research2amount = 500 |research3 = Alloy Plate |research3amount = 1,000 |research4 = Polymer Bundle |research4amount = 150 |researchtime = 1 }} The '''Lavan Photor Mk I''' is dropped as wreckage by Kosma Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Nullstones |build1amount = 3 |build2 = Asterite |build2amount = 20 |build3 = Titanium |build3amount = 1,000 |build4 = Cubic Diodes |build4amount = 300 |buildtime = 1 |buildrush = 20 }} The '''Vidar Photor Mk I''' is dropped as wreckage by Kosma Gokstad Crewships (2%). {{BuildRequire |buildcredits = 15,000 |build1 = Aucrux Capacitors |build1amount = 3 |build2 = Asterite |build2amount = 20 |build3 = Titanium |build3amount = 1,000 |build4 = Cubic Diodes |build4amount = 300 |buildtime = 1 |buildrush = 20 }} The '''Zetki Photor Mk I''' is dropped as wreckage by Elite Kosma Outriders (11.11%). {{BuildRequire |buildcredits = 15,000 |build1 = Komms |build1amount = 3 |build2 = Asterite |build2amount = 20 |build3 = Titanium |build3amount = 1,000 |build4 = Cubic Diodes |build4amount = 300 |buildtime = 1 |buildrush = 20 }} |-|Photor= The base '''Photor''' blueprint is unlocked by default in the Clan Dojo's Dry Dock. {{BuildRequire |buildcredits = 10,000 |build1 = Asterite |build1amount = 10 |build2 = Titanium |build2amount = 500 |build3 = Cubic Diodes |build3amount = 150 |build4 = |build4amount = |buildtime = 0 }}",
  "lethal torrent": "Rewarded from Operation: Arid Fear by earning 100 points or more. This mod is available as a Nightmare Mode reward at the end of the mission.",
  "loot detector": "Available for creds from the Nightwave Cred Offerings store.",
  maprico: 'Maprico is resource that can be found all over Plains of Eidolon, growing on squatty trees. Maprico is also rewarded by Bounties. ==Item Checklist== {| class="listtable sortable ligh',
  "metamorphic magazine": "Available for from the Nightwave Cred Offerings store on a rotational basis. Metamorphic Magazine was originally acquired by reaching Rank 23 in Nightwave during Nora's Mix Volume 3. Beginning with Nightwave Nora\u2019s Mix: Vol. 8, it was added to the Nightwave Cred Offerings.",
  "meticulous aim": "Available for from the Nightwave Cred Offerings store on a rotational basis. Meticulous Aim was originally acquired by reaching Rank 23 in Nightwave during Series 2: The Emissary. Beginning with Nightwave: Amir's Shockwave, it was added to the Nightwave Cred Offerings.",
  morgha: "The Morgha main blueprint can be acquired by reaching '''Rank 3 - Clearance: Odima''' with the Necraloid. The main blueprint is offered as a rank up reward, but Loid sells additional main blueprints for 8,000 Standing. Components are crafted from blueprints that can be acquired for 4,000 Standing each after reaching '''Rank 2 - Clearance: Modus''' with the syndicate. Once crafted, it comes with a pre-installed Gravimag. Additionally requires '''Rank 2 - Visitor''' with Ostron in order to acquire Fersteel Alloy required in its construction. The Damaged Necramech Weapon parts are acquired from Normal and Arcana Isolation Vault Bounty rewards. The Damaged Necramech Weapon parts and fully built Morgha components can be traded between players. Trading for fully built components will bypass the need for Ostron's Fersteel Alloy.",
  "mutagen mass": "Its blueprint can be researched from the Bio Lab in the Dojo. Sometimes offered as a reward for completing Infested Invasion type missions. Sometimes available as Tier 4 Bounty rewards in Orb Vallis after completing a stage. {{BuildRequire |buildcredits=15,000 |build1= Mutagen Sample |build1amount=10 |build2= Control Module |build2amount=1 |build3= Salvage |build3amount=500 |build4= Plastids |build4amount=250 |buildtime=12 |buildrush=5 |blueprint=15,000 |market=10 |lab=Bio |researchcredits=5,000 |research1=Mutagen Sample |research1amount=5 |research2=Circuits |research2amount=150 |research3=Nano Spores |research3amount=500 |research4=Plastids |research4amount=100 |affinityamount=2,000 |researchtime=72 |prereq= }}",
  "mytocardia spore": "Mytocardia Spore is resource that can be found in '''Mytocardia Sacs''' strewn all over Orb Vallis, dropping 1-3 Spores per Sac. growing beneath giant mushrooms on the ground. Mytocardia Spores are also rewarded by Bounties. The mushroom forest to the West of the '''Coolant Reservoir''', and the area around the lake South of '''Transit Depot''' are particularly rich locations, a",
  "napalm grenades": "Available for from the Nightwave Cred Offerings store on a rotational basis. Napalm Grenades was originally acquired by reaching Rank 22 in Nightwave during Series 1: The Wolf of Saturn Six or reaching Rank 13 during Intermission II. Beginning with Nightwave Nora\u2019s Mix: Vol. 6, it was added to the Nightwave Cred Offerings.",
  "neural sensors": "===Market=== for 1 Neural Sensors.|In-Game Description}} Neural Sensors be purchased directly from the market for , or as a reusable blueprint for . {{BuildRequire |buildcredits=15,000 |build1=Alloy Plate |build1amount=50,000 |build2=Nano Spores |build2amount=50,000 |build3=Salvage |build3amount=25,000 |build4= |build4amount= |buildtime=1 |buildrush=2 |blueprint=100 |blueprintunit=Platinum |market=10 }}",
  neurodes: "===Market=== for 1 Neurodes.|In-Game Description}} Neurodes can be purchased directly from the market for , or as a reusable blueprint for . {{BuildRequire |buildcredits= 15,000 |build1= Alloy Plate |build1amount=50,000 |build2= Nano Spores |build2amount=50,000 |build3= Salvage |build3amount=25,000 |build4= |build4amount= |buildtime=1 |buildrush=2 |blueprint=100 |blueprintunit=Platinum |market=10 }}",
  nistlepod: `Nistlepod is resource that can be found in high-elevated areas of the Plains of Eidolon, located on the mountainous regions of '''Mount Nang''' and '''Ostwan Range'''. They grow on the fungus-like Nistlebrush, each of which drops 5 '''Nistlepods''' once smashed. '''Nistlepods''' are also rewarded from Bounties. ==Item Checklist== {| class="listtable sortable lighttable store`,
  "nitain extract": `'''Primarily''' obtained from Nightwave Offerings for per x5. This is an "evergreen" offering and is always available for purchase in unlimited quantities. Other possible sources: 0.67-2% (planet-dependent) drop chance in Resource Cache Rotation C reward (i.e. finding all three caches) in Reactor Sabotage and Exterminate. 3.57-4.72% (stage-dependent) drop chance in Cetus Bounty during a Ghoul Purge event (every few weeks). 0.129% drop chance by the Zealoid Prelate. 0.129% drop chance by the Wolf of Saturn Six. Rarely available from Gift from the Lotus alerts.`,
  "orokin animus matrix": "Orokin Animus Matrices are a rare reward in the Isolation Vault bounties offered by Mother. Guaranteed to drop from all 3 Necramechs guarding the Tier 3 Isolation Vaults. Resource Booster and loot abilities such as Nekros' Desecrate increase the amount of Orokin Matrices acquired from killed Necramechs.",
  "orokin ballistics matrix": "Orokin Ballistics Matrices are an uncommon reward in the Tier 1, Tier 2, and Tier 3 Isolation Vault bounties offered by Mother. They are rewarded in quantities of x2, x3, and x4 respectively. Guaranteed to drop from killing Necramechs guarding the '''Tier 2''' Isolation Vaults. Resource Booster and loot abilities such as Nekros' Desecrate increase the amount of Orokin Matrices acquired from killed Necramechs.",
  "odonata/prime": "{{BuildRequire/Archwing |buildcredits = 25,000 |buildresource = Orokin Cell |buildresourceamount = 1 |buildtime = 36 |buildrush = 50 |market = |blueprint = |prime = yes |harnessbuildcredits = 15,000 |harnessbuild1 = Morphics |harnessbuild1amount = 1 |harnessbuild2 = Salvage |harnessbuild2amount = 1,000 |harnessbuild3 = Rubedo |harnessbuild3amount = 300 |harnessbuild4 = |harnessbuild4amount = |harnessbuildtime = 6 |harnessbuildrush = 25 |wingsbuildcredits = 15,000 |wingsbuild1 = Alloy Plate |wingsbuild1amount = 150 |wingsbuild2 = Neurodes |wingsbuild2amount = 1 |wingsbuild3 = Polymer Bundle |wingsbuild3amount = 150 |wingsbuild4 = Rubedo |wingsbuild4amount = 500 |wingsbuildtime = 6 |wingsbuildrush = 25 |systemsbuildcredits = 15,000 |systemsbuild1 = Control Module |systemsbuild1amount = 1 |systemsbuild2 = Neural Sensors |systemsbuild2amount = 1 |systemsbuild3 = Ferrite |systemsbuild3amount = 500 |systemsbuild4 = Plastids |systemsbuild4amount = 500 |systemsbuildtime = 6 |systemsbuildrush = 25 }}",
  "orokin cell": "Saturn, Ceres, and Deimos missions \u2014 Planetary enemy drops, Cell Array deposits, and Boss drops (General Sargas Ruk, Lieutenant Lech Kril, Stalker).",
  "orokin orientation matrix": "Orokin Orientation Matrix are a common reward in the Isolation Vault bounties offered by Mother. One is also guaranteed to drop by killing the Necramech guarding the Tier 1 Isolation Vault. Resource Booster and loot abilities such as Nekros' Desecrate increase the amount of Orokin Matrices acquired from killed Necramechs.",
  palmaris: "The blueprint for the grip can be bought from Father for 500 Standing at Rank 0 with Entrati. {{BuildRequire |buildcredits = 5,000 |build1 = Benign Infested Tumor |build1amount = 20 |build2 = Dendrite Blastoma |build2amount = 10 |build3 = Adramal Alloy |build3amount = 20 |build4 = Purged Dagonic |build4amount = 5 |buildtime = 1 |buildrush = 25 |blueprint = 500 |blueprintunit = Standing }} es:Palmaris Category:Kitgun Category:Update 29 Category:Infested",
  "paralytic spores": "Paralytic Spores is automatically acquired upon obtaining a .",
  "passionate void offering": "The Passionate Void Offering could be purchased for from the Market, found under '''Equipment''', subsection '''Gear'''. However, it was discontinued after the event officially ended. Void Offerings were mistakenly released prior to the event as reusable blueprints, rather than individual charges. Though these are noticeably more costly, players who purchased these blueprints can continue to craft charges despite the event's conclusion.",
  "photon overcharge": "Available for from the Nightwave Cred Offerings store on a rotational basis. Photon Overcharge was originally acquired by reaching Rank 25 in Nightwave during Nora's Mix Volume 6. Beginning with Nightwave Nora's Mix: Dreams of the Dead, it was added to the Nightwave Cred Offerings.",
  physique: "Available for creds from the Nightwave Cred Offerings store. Rewarded after completing the Junction to Europa on Jupiter.",
  "pistol scavenger": "Available for creds from the Nightwave Cred Offerings store.",
  "precision strike": "Available for from the Nightwave Cred Offerings store on a rotational basis. Precision Strike was originally acquired by reaching Rank 23 in Nightwave during Series 3. Beginning with Nightwave Nora\u2019s Mix: Vol. 7, it was added to the Nightwave Cred Offerings.",
  "propa scaffold": "The blueprint is sold by Little Duck for 3,000 Standing standing and requires a rank of 4 - '''Instrument''' to purchase. It is also a possible rank-up reward for advancing to '''Instrument''' with Vox Solaris. {{BuildRequire |buildcredits= 5,000 |build1= Calda Toroid |build1amount=3 |build2= Hespazym Alloy |build2amount=30 |build3= Atmo Systems |build3amount=2 |build4= Tromyzon Entroplasma |build4amount=6 |buildtime=1 |buildrush=25 |blueprint=3,000 |blueprintunit=Standing }}",
  pustulite: `'''Pustulite''' is a resource found in the Cambion Drift. It is found in Gravid Blastemas and may also be rewarded from completing Bounties. ==Item Checklist for == {| class="listtable sortable lighttable store-table" style="width: 400px;" data-tableid="Pustulite General Checklist" |- ! Item ! Type ! data-sort-type="num`,
  "raksa kubrow": "The player must have completed the Howl of the Kubrow quest in order to have an operating Incubator on the Orbiter, as well as have acquired a Kubrow Egg from Kubrow Dens on the Grineer Forest tilesets of Earth and a built Incubator Power Core whose blueprint can be obtained from the Market. The Kubrow can be bred using the Incubator: a Random Incubation has a chance to create a Raksa Kubrow, while using two Genetic Code Templates bought from the Market can be applied to created Kubrows to have a chance to pass on genetic traits.",
  "range advantage": "Available for from the Nightwave Cred Offerings store on a rotational basis. Range Advantage was originally acquired by reaching Rank 20 in Nightwave during Nora's Mix Volume 1. Beginning with Nightwave Nora\u2019s Mix: Vol. 7, it was added to the Nightwave Cred Offerings.",
  rathbone: `The Rathbone's blueprint can be purchased from the Market. Its parts can be purchased from various Syndicates. All parts, except for the blueprint, are tradeable. {| class="wikitable" style="text-align:center;" |- ! Item || Location |- | Blueprint || Market |- | 40px Head || New Loka Offering2 - '''Bountiful''' 20,000 Standing |- | 40px Handle || Red Veil Offering2 - '''Honored''' 20,000 Standing |- |}`,
  rattleguts: "The blueprint for the chamber can be bought from Rude Zuud for 500 Standing at Rank 0 with Solaris United. {{BuildRequire |buildcredits = 5,000 |build1 = Gorgaricus Spore |build1amount = 15 |build2 = Venerdo Alloy |build2amount = 20 |build3 = Eye-Eye Rotoblade |build3amount = 10 |build4 = Rubedo |build4amount = 900 |buildtime = 1 |buildrush = 25 |blueprint = 500 |blueprintunit = Standing }} To craft the actual Kitgun, players must have at least one built Rattleguts chamber, a chosen grip, and a chosen loader components. See Kitgun for more details.",
  rejuvenation: "Available for creds from the Nightwave Cred Offerings store.",
  "resourceful retriever": "Resourceful Retriever can be purchased from Son in the Necralisk for: 1 Sly Vulpaphyla Tag 1 Purple Velocipod Tag 1 Burrowing Cryptilex Tag 1 Common Avichaea Tag 1 Amethyst Nexifera Tag 1 Vizier Predasite Tag 1 Umber Undazoa Tag",
  "rifle amp": "Available for creds from the Nightwave Cred Offerings store.",
  "rifle scavenger": "Available for creds from the Nightwave Cred Offerings store.",
  "rime rounds": "Originally, this mod could be acquired from Operation Cryotic Front by scoring more than 1000 points in a single mission.",
  "riv elite-guards": "'''''' is purchaseable from the Market for }}, or from Conclave for Standing at Rank 5. Market price is automatically prorated (reduced) if the player have one or more items within the bundle already. The contents of the bundle, as well as their individual prices are as follow: RivElite-GuardChest.png|}} / '''120,000 Standing Conclave''' RivElite-GuardArm.png|}} / '''100,000 Standing Conclave''' RivElite-GuardLeg.png|}} / '''100,000 Standing Conclave''' Category:Bundle __NOTOC__",
  "sahasa kubrow": "The player must have completed the Howl of the Kubrow quest in order to have an operating Incubator on the Orbiter, as well as have acquired a Kubrow Egg from Kubrow Dens on the Grineer Forest tilesets of Earth and a built Incubator Power Core whose blueprint can be obtained from the Market. The Kubrow can be bred using the Incubator: a Random Incubation has a chance to create a Sahasa Kubrow, while using two Genetic Code Templates bought from the Market can be applied to created Kubrows to have a chance to pass on genetic traits.",
  "scindo forest-camo skin": "This skin is permanently available for purchase from in-game market separately for or as part of Forest-Camo Skin Pack . __NOTOC__ Category:Update 11 Category:Market Category:Weapon Skins Category:Weapon Cosmetics Category:Aesthetics",
  "seeding step ephemera": "Blueprint purchasable from Arbitration Store for '''30''' Vitus Essence {{BuildRequire |buildcredits =1,000,000 |build1 =Lunar Pitcher |build1amount=50 |build2 =Oberon Systems |build2amount =1 |build3 =Vitus Essence |build3amount=1 |build4 = |build4amount= |buildtime=72 |buildrush=50 |blueprint= }}",
  "sentient barrage": "Available for from the Nightwave Cred Offerings store on a rotational basis. Sentient Barrage was originally acquired by reaching Rank 23 in Nightwave during Nora's Mix Volume 4. Beginning with Nightwave Nora\u2019s Mix: Vol. 8, it was added to the Nightwave Cred Offerings.",
  sepulcrum: "Sepulcrum is acquired by reaching '''Rank 2 - Acquaintance''' with the Entrati. Father sells the main blueprint for 4,000 Standing and component blueprints for 2,000 Standing; a total of 8,000 Standing is needed for all parts. The main blueprint is also offered as a rank-up reward. Additionally requires '''Rank 0 - Neutral''' with Solaris United and '''Rank 1 - Offworlder''' with the Ostrons in order to acquire Travocyte Alloy and Coprite Alloy respectively required in its construction.",
  "shield disruption": "Available for creds from the Nightwave Cred Offerings store.",
  "shotgun scavenger": "Available for creds from the Nightwave Cred Offerings store.",
  shred: "Reward from Operation: Arid Fear by earning 1 point or more. This mod is now available as a Nightmare Mode reward at the end of the mission.",
  "shrill voca": "Shrill Voca can be found scattered across any Albrecht's Laboratories mission as an interactable pickup. Tier 1 and 2 Bounties from Fibonacci have a chance to award a Shrill Voca. Every 8 hours, one Shrill Voca can be purchased from Loid using resources found in the Albrecht's Laboratories.",
  "smeeta kavat": "The player must have completed the Howl of the Kubrow quest in order to have an operating Incubator on the Orbiter, and have installed the Kavat Incubator Upgrade Segment whose blueprint can be obtained from the Clan Dojo's Tenno Lab research or dropped by Hyekka Masters, or purchased fully built from the Market for . The player must also have 10 Kavat Genetic Codes from scanning Feral Kavats on the Orokin Derelict tileset on Deimos using Codex Scanners or Synthesis Scanners, and a built Incubator Power Core whose blueprint can be obtained from the Market. The Kavat can be bred using the Incubator: a Random Incubation has a chance to create an Smeeta Kavat, while using two Genetic Code Templates bought from the Market can be applied to created Kavats to have a chance to pass on genetic traits.",
  "sniper scavenger": "Available for creds from the Nightwave Cred Offerings store.",
  "soma forest-camo skin": "This skin is permanently available for purchase from in-game market separately for or as part of Forest-Camo Skin Pack . __NOTOC__ Category:Update 11 Category:Market Category:Weapon Skins Category:Weapon Cosmetics Category:Aesthetics",
  "spectral debris": 'Spectral Debris is a resource that can be obtained by defeating Errant Specters (5% chance) in Granum Void. They are used in building components for the modular Hound companions. ==Item Checklist for == {| class="listtable sortable lighttable store-table" sty',
  splat: "Splat can be bought from Rude Zuud at Rank 4: Cove with Solaris United. {{BuildRequire |buildcredits = 5,000 |build1 = Auroxium Alloy |build1amount = 40 |build2 = Star Amarast |build2amount = 10 |build3 = Scrap |build3amount = 20 |build4 = Synathid Ecosynth Analyzer |build4amount = 5 |buildtime = 1 |buildrush = 25 |blueprint = 4000 |blueprintunit = Standing }} es:Splat Category:Kitgun",
  sporelacer: "The blueprint for the chamber can be bought from Father for 500 Standing at Rank 0 with Entrati. {{BuildRequire |buildcredits = 5,000 |build1 = Pustulite |build1amount = 15 |build2 = Adramal Alloy |build2amount = 20 |build3 = Benign Infested Tumor |build3amount = 25 |build4 = Sporulate Sac |build4amount = 10 |buildtime = 1 |buildrush = 25 |blueprint = 500 |blueprintunit = Standing }} To craft the actual Kitgun, players must have at least one built Sporelacer chamber, a chosen grip, and a chosen loader components. See Kitgun for more details.",
  "sprint boost": "Available for creds from the Nightwave Cred Offerings store.",
  "squad ammo restore": "===Small=== The reusable blueprints for 1x and 10x Squad Ammo Restore (Small) can be purchased from market for and respectively. ;1x Squad Ammo Restore (Small) {{BuildRequire |buildcredits= 1,000 |build1= Ferrite |build1amount=200 |build2= Polymer Bundle |build2amount=25 |build3= |build3amount= |build4= |build4amount= |buildtime=1 |buildtimeunit=min |buildrush=1 |blueprint=500 |market= }} ;10x Squad Ammo Restore (Small) {{BuildRequire |buildcredits= 9,000 |build1= Polymer Bundle |build1amount=225 |build2= Nano Spores |build2amount=1,800 |build3= |build3amount= |build4= |build4amount= |buildtime=1 |buildtimeunit=min |buildrush=1 |blueprint=250,000 |market= }}",
  "squad energy restore": "===Small=== The reusable blueprints for 1x and 10x Squad Energy Restore (Small) can be purchased from market for and respectively. ;1x Squad Energy Restore (Small) {{BuildRequire |buildcredits= 1,000 |build1= Ferrite |build1amount=250 |build2= Polymer Bundle |build2amount=25 |build3= |build3amount= |build4= |build4amount= |buildtime=1 |buildtimeunit=min |buildrush=1 |blueprint=500 |market= }} ;10x Squad Energy Restore (Small) {{BuildRequire |buildcredits= 9,000 |build1= Polymer Bundle |build1amount=225 |build2= Nano Spores |build2amount=2,250 |build3= |build3amount= |build4= |build4amount= |buildtime=2 |buildtimeunit=min |buildrush=1 |blueprint=250,000 |market= }}",
  "squad health restore": "===Small=== The reusable blueprints for 1x and 10x Squad Health Restore (Small) can be purchased from market for and respectively. ;1x Squad Health Restore (Small) {{BuildRequire |buildcredits= 1,000 |build1= Ferrite |build1amount= 300 |build2= Polymer Bundle |build2amount=50 |build3= |build3amount= |build4= |build4amount= |buildtime=1 |buildtimeunit=min |buildrush=1 |blueprint=500 |market= }} ;10x Squad Health Restore (Small) {{BuildRequire |buildcredits= 9,000 |build1= Nano Spores |build1amount=2,700 |build2= Polymer Bundle |build2amount=450 |build3= |build3amount= |build4= |build4amount= |buildtime=2 |buildtimeunit=min |buildrush=1 |blueprint=250,000 |market= }}",
  steeba: `The blueprint can be acquired by completing the K-Drive Race '''"Pride Before a Fall"''' on the Cambion Drift. Note: Active races rotate on a daily basis and thus it is not available every day. Blueprints can be reacquired by repeating the relevant race after the blueprint is sold or consumed. Possessing a completed component, or a K-Drive containing the component, does not prevent acquiring its blueprint again.`,
  "steel charge": "Possible reward in The Circuit (Normal) for reaching Tier 1 or Tier 3. Available for creds from the Nightwave Cred Offerings store.",
  stock: "Stock is obtained from completing Break Narmer's bonus challenges. Rewards are one-time per week, resetting on Monday 00:00 UTC; a total of 105 Stock is obtainable per week. Stock can spawn in Break Narmer missions as a pickup, appearing as a blue crate each awarding 2 Stock. 8 to 12 boxes can spawn in a mission, but only 5 can be picked up before the rest vanish, awarding 10 Stock per mission, and requires the player to complete the mission to claim them. Stock boxes will respawn on replays.",
  "squad shield restore": "===Small=== The reusable blueprints for 1x and 10x Squad Shield Restore (Small) can be purchased from market for and respectively. ;1x Squad Shield Restore (Small) {{BuildRequire |buildcredits= 1,000 |build1= Ferrite |build1amount=400 |build2= |build2amount= |build3= |build3amount= |build4= |build4amount= |buildtime=1 |buildtimeunit=min |buildrush=1 |blueprint=500 |market= }} ;10x Squad Shield Restore (Small) {{BuildRequire |buildcredits= 9,000 |build1= Nano Spores |build1amount=3,600 |build2= |build2amount= |build3= |build3amount= |build4= |build4amount= |buildtime=1 |buildtimeunit=min |buildrush=1 |blueprint=250,000 |market= }}",
  "sunika kubrow": "The player must have completed the Howl of the Kubrow quest in order to have an operating Incubator on the Orbiter, as well as have acquired a Kubrow Egg from Kubrow Dens on the Grineer Forest tilesets of Earth and a built Incubator Power Core whose blueprint can be obtained from the Market. The Kubrow can be bred using the Incubator: a Random Incubation has a chance to create a Sunika Kubrow, while using two Genetic Code Templates bought from the Market can be applied to created Kubrows to have a chance to pass on genetic traits.",
  "synthetic eidolon shard": "The Synthetic Eidolon Shard is a resource that can be converted into 5,000 Focus points for any unlocked Focus School, similar to Brilliant Eidolon Shard and Radiant Eidolon Shard. It can be obtained as a drop from Sanctuary Onslaught (rotation B). ==Drop Locations== ==Notes== Eidolon Shards can be converted to Focus in the Orbiter's [[Orbiter#Tr",
  synthula: "Synthula is a special resource that is used exclusively for researching and crafting Stims, which are consumable gear equipment used to buff allied NPCs, such as rescue targets and Sortie defense targets. Its blueprint can be purchased from the Tenno Lab in the Clan Dojo. {{BuildRequire |buildcredits = 1,000 |build1 = Morphics |build1amount = 1 |build2",
  tellurium: "Uranus (Grineer Sealab Submersible / Archwing missions), Kuva Fortress Assault, and Empyrean (Railjack) missions.",
  "tepa nodule": 'Tepa Nodule is resource that can be found all over Orb Vallis, growing in caves as clusters. Drops in rates of 3-4. It is also rewarded by Bounties. ==Item Checklist for == {| class="listtable sortable lighttable store-table" style="width: 400px;" data-tableid="Tepa Nodule General Checklist" |- ! Item ! Type ! data-sort-type="number" | Qua',
  "theorem contagion": "Theorem Contagion can be acquired from Rotation A of Isolation Vault Bounties (normal and Arcana).",
  "theorem demulcent": "Theorem Demulcent can be acquired from Rotation C of Isolation Vault Bounties (normal and Arcana).",
  "theorem infection": "Theorem Infection can be acquired from Rotation C of Isolation Vault Bounties (normal and Arcana).",
  tombfinger: "The blueprint for the chamber can be bought from Rude Zuud for 500 Standing at Rank 0 with Solaris United. {{BuildRequire |buildcredits = 5,000 |build1 = Thermal Sludge |build1amount = 15 |build2 = Axidrol Alloy |build2amount = 20 |build3 = Tink Dissipator Coil |build3amount = 10 |build4 = Circuits |build4amount = 900 |buildtime = 1 |buildrush = 25 |blueprint = 500 |blueprintunit = Standing }} To craft the actual Kitgun, players must have at least one built Tombfinger chamber, a chosen grip, and a chosen loader components. See Kitgun for more details.",
  trumna: "Trumna is acquired by reaching '''Rank 3 - Associate''' with the Entrati. Father sells the main blueprint for 5,000 Standing and component blueprints for 2,500 Standing; a total of 12,500 Standing is needed for all parts. The main blueprint is also offered as a rank-up reward. Additionally requires '''Rank 3 - Trusted''' with the Ostrons in order to acquire Marquise Veridos and Auroxium Alloy required in its construction.",
  vainthorn: "Vainthorn are an award from the Abyssal Zone on Ceres. Access to the Abyssal Zone requires , which can be purchased from any of the six main Syndicates (1=Steel Meridian, 1=Arbiters of Hexis, 1=Cephalon Suda, 1=The Perrin Sequence ,1=Red Veil, or 1=New Loka) at '''Rank 2''' for 5000 Standing. Upon mission completion, one is consumed from the player who started the mission vote. Vainthorns are awarded upon mission completion: 6, 7, or 8 are gained normally, with 8, 11, or 12 gained in The Steel Path. These amounts are '''not''' affected by Resource Booster or the retrieval of multiple Defixio.",
  "vasca kavat": "To breed a Vasca Kavat, players must first complete the Howl of the Kubrow quest to unlock the Incubator and install the Kavat Incubator Upgrade Segment. The segment\u2019s blueprint can be researched in a Clan Dojo\u2019s Tenno Lab, dropped by Hyekka Masters, or purchased fully built from the Market for . Players also need 10 Kavat Genetic Codes (scanned from Feral Kavats on Deimos) and a built Incubator Power Core (blueprint available from the Market). Instead of hatching from the Incubator, the player\u2019s existing Kavat must be infected by wild Vasca roaming the Plains of Eidolon at night. They can also be lured using Conservation tools sold by Master Teasonai - the Vasca Kavat Lure (3000 Standing) and Vasca Kavat Pheromone Oota (200 Standing). Once a Kavat is bitten, it will glow red to show infection. If it\u2019s downed in one hit, it won\u2019t become infected. Vulpaphylas cannot be infected. Back on the Orbiter, use a Genetic Code Template on the infected Kavat. The confirmation should read: Selecting YES creates a Vasca Imprint and removes the infection. Since two imprints are required to breed a Vasca Kavat, the infection process must be repeated (or done simultaneously using two Kavats). To remove the infection without creating an imprint, use a Vasca Curative (500 Standing), purchasable from Master Teasonai as a gear item. Alternatively, players can buy the Vasca Kavat Starter Kit from the Market for , which includes two Vasca Imprints, 10 Kavat Genetic Codes, an Incubator Power Core, and a Genetic Code Template.",
  velocitus: `The Velocitus's blueprint can be researched from the Tenno Lab in the dojo. Its parts can be purchased from various Syndicates. All parts, except for the blueprint, are tradeable. {| class="wikitable" style="text-align:center;" |- ! Item !! Location |- | Blueprint || Tenno Lab |- | 40px Barrel || Cephalon Suda Offering2 - '''Intriguing''' 20,000 Standing |- | 40px Receiver || Steel Meridian Offering2 - '''Valiant''' 20,000 Standing |- | 40px Stock || Red Veil Offering2 - '''Honored''' 20,000 Standing |}`,
  vermisplicer: "The blueprint for the chamber can be bought from Father for 500 Standing at Rank 0 with Entrati. {{BuildRequire |buildcredits = 5,000 |build1 = Ganglion |build1amount = 15 |build2 = Tempered Bapholite |build2amount = 20 |build3 = Benign Infested Tumor |build3amount = 25 |build4 = Dendrite Blastoma |build4amount = 10 |buildtime = 1 |buildrush = 25 |blueprint = 500 |blueprintunit = Standing }} To craft the actual Kitgun, players must have at least one built Vermisplicer chamber, a chosen grip, and a chosen loader components. See Kitgun for more details.",
  "vicious frost": "This mod can be acquired as a random end-of-mission reward for a successful Tier 1 Spy mission with all 3 Data Vaults hacked. Drop Locations: Originally this mod could be acquired from Operation Cryotic Front by scoring more than 1000 points in a single mission.",
  vigor: "Formerly a reward from Operation: Arid Fear by earning 50 points or more. This mod is now available as a Nightmare Mode reward at the end of the mission.",
  "void traces": "Void Traces are primarily obtained by collecting '''Reactant''' in Void Fissure missions, which drops from Corrupted enemies, awarding '''6-30''' Void Traces upon collection of the 10th Reactant. Players are not required to have a Void Relic equipped to obtain Traces. When selecting opened Void Relic rewards, the player owning an opened relic gains '''5''' bonus Void Traces per teammate (excluding self) who picks the reward that came from their own relic. Thus, up to a total of '''15''' bonus Traces are obtained if the rest of the team picks their reward. Granum Void Rank 1 reward contains '''5'''/'''10'''/'''15''' Void Traces for Normal/Extended/Nightmare Tiers. Isolation Vaults contain storage containers that, when broken, may drop Void Traces. Unlike most resources, there is an upper limit to how many Void Traces a player can stockpile. This cap is determined by one's Mastery Rank using the formula: '''(Mastery Rank 50) + 100'''. For example, a player at Mastery Rank 13 can hold up to 750 Void Traces, while at Mastery Rank 30 one can hold up to 1600. Increasing one's Mastery Rank will immediately increase Void Trace storage capacity. Excess Void Traces are discarded, except that excess Void Traces reclaimed upon defeating a Kuva Lich are retained.",
  "volatile variant": "Available for from the Nightwave Cred Offerings store on a rotational basis. Volatile Variant was originally acquired by reaching Rank 25 in Nightwave during Nora's Mix Volume 5. Beginning with Nightwave Nora\u2019s Mix: Vol. 9, it was added to the Nightwave Cred Offerings.",
  "wild frenzy": "Available for from the Nightwave Cred Offerings store on a rotational basis. Wild Frenzy was originally acquired by reaching Rank 14 in Nightwave during Series 1: The Wolf of Saturn Six or reaching Rank 20 during Intermission II. Beginning with Nightwave Nora\u2019s Mix: Vol. 5, it was added to the Nightwave Cred Offerings.",
  xoris: "The blueprint, core, handle, and blade are all obtained during The Deadlock Protocol. Additional blueprints and parts can be bought from Cephalon Simaris for 100,000 Standing and 15,000 Standing respectively. It can be sold for .",
  "argon crystal": "Orokin Void \u2014 Drops from Argon Pegmatite deposits, enemy drops, storage containers in Isolation Vaults (Deimos), and Corrupted Vor (Decays after 24 hours).",
  "shill voca": "Sanctum Anatomica (Albrecht's Laboratories) \u2014 Hidden collectible pickup on mission tiles & Cavia Bounties (500 Cavia Standing).",
  "stewards voca": "Sanctum Anatomica (Albrecht's Laboratories) \u2014 Hidden collectible pickup on mission tiles & Cavia Bounties.",
  "fibonacci voca": "Sanctum Anatomica (Albrecht's Laboratories) \u2014 Hidden collectible pickup & Cavia Bounties.",
  "tagfer voca": "Sanctum Anatomica (Albrecht's Laboratories) \u2014 Hidden collectible pickup & Cavia Bounties.",
  "vapor specter": "Rescue Missions (Tier 1 nodes Lv 1-15 with 2/3 achievements, or Tier 2 nodes Lv 15-25 with 1/3 achievements) \u2014 Yields 10 per craft | Nightcap (Fortuna - 50 Fergolyte).",
  "phase specter": "Rescue Missions (Tier 1 nodes with 3/3 achievements, Tier 2 nodes with 2/3 achievements, or Tier 3 nodes Lv 25+ with 1/3 achievements) \u2014 Yields 5 per craft.",
  "force specter": "Rescue Missions (Tier 2 nodes with 3/3 achievements, or Tier 3 nodes Lv 25+ with 2/3 achievements) \u2014 Yields 3 per craft.",
  "cosmic specter": "Rescue Missions (Tier 3 nodes Lv 25+ with 3/3 achievements: Rescue Hostage + Stealth + Kill All Wardens) \u2014 Yields 1 per craft.",
  "archgun riven mod": "Daily Sorties / Archon Hunts / Steel Path Incursions / Iron Wake (Palladino - 10 Riven Slivers).",
  "companion weapon riven mod": "Daily Sorties / Archon Hunts / Steel Path Incursions / Iron Wake (Palladino - 10 Riven Slivers).",
  "kitgun riven mod": "Daily Sorties / Archon Hunts / Steel Path Incursions / Iron Wake (Palladino - 10 Riven Slivers).",
  "melee riven mod": "Daily Sorties / Archon Hunts / Steel Path Incursions / Iron Wake (Palladino - 10 Riven Slivers).",
  oull: "Defeating Kuva Liches / Sisters of Parvos (25% drop upon death) & Requiem Relics (All Tiers - Uncommon).",
  "pistol riven mod": "Daily Sorties / Archon Hunts / Steel Path Incursions / Iron Wake (Palladino - 10 Riven Slivers).",
  "primed bane of corpus": "Baro Ki'Teer (Void Trader) \u2014 Appears bi-weekly at Tenno Relays (purchased with Ducats & Credits).",
  "primed bane of grineer": "Baro Ki'Teer (Void Trader) \u2014 Appears bi-weekly at Tenno Relays (purchased with Ducats & Credits).",
  "primed bane of infested": "Baro Ki'Teer (Void Trader) \u2014 Appears bi-weekly at Tenno Relays (purchased with Ducats & Credits).",
  "primed bane of orokin": "Baro Ki'Teer (Void Trader) \u2014 Appears bi-weekly at Tenno Relays (purchased with Ducats & Credits).",
  "rifle riven mod": "Daily Sorties / Archon Hunts / Steel Path Incursions / Iron Wake (Palladino - 10 Riven Slivers).",
  "shotgun riven mod": "Daily Sorties / Archon Hunts / Steel Path Incursions / Iron Wake (Palladino - 10 Riven Slivers).",
  "zaw riven mod": "Daily Sorties / Archon Hunts / Steel Path Incursions / Iron Wake (Palladino - 10 Riven Slivers).",
  arquebex: "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "artemis bow": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "artemis bow prime": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "balefire charger": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "balefire charger prime": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "desert wind": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "desert wind prime": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "dex pixia": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "dex pixia prime": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  diwata: "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "diwata prime": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "exalted blade": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "exalted prime blade": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "exalted umbra blade": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "garuda talons": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  glory: "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "iron staff": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "iron staff prime": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  ironbride: "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "landslide fists": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "landslide fists prime": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  neutralizer: "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  noctua: "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  regulators: "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "regulators prime": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "shadow claws": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "shadow claws prime": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "shadow clones": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "shadow clones prime": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "shattered lash": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "shattered lash prime": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "valkyr prime talons": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "valkyr talons": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  whipclaw: "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "whipclaw prime": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "venari prime": "Inherent Exalted Weapon \u2014 Automatically unlocked with the respective Warframe / Necramech; modded in Arsenal.",
  "mote prism": "The Quills (Onkko in Cetus) \u2014 Received for free upon initiating with the Quills, or purchased for 500 Quills Standing.",
  "prisma shade": "Baro Ki'Teer (Void Trader) \u2014 Purchased for 500 Ducats and 300,000 Credits.",
  "mark of the beast": "Nightwave Cred Offerings \u2014 Available in rotation for 20 Nightwave Creds.",
  "repair kit": "Cephalon Simaris (Sanctuary - Standing) / Included with Sentinel.",
  afterburner: "Cephalon Simaris (Sanctuary - Standing) / Railjack & Archwing Mission Rewards.",
  "cold snap": "Cephalon Simaris (Sanctuary - Standing) / Included with Companion.",
  "cull the weak": "Cephalon Simaris (Sanctuary - Standing) / Included with Companion.",
  "energy field": "Cephalon Simaris (Sanctuary - Standing) / Included with Companion.",
  neutralize: "Cephalon Simaris (Sanctuary - Standing) / Included with Companion.",
  "prey of dynar": "Cephalon Simaris (Sanctuary - Standing) / Included with Companion."
};

// src-tauri/data/assets/data/wiki-page-acquisition.json
var wiki_page_acquisition_default = {
  "Air Support Charges": {
    section: "Acquisition",
    text: "The blueprint for 10 Air Support Charges is automatically available in the Foundry after installing a Landing Craft Foundry Segment. Each batch costs 4,000 Credits, 1,200 Ferrite, 2,000 Salvage, 1 Morphics, and 700 Plastids, and takes 1 minute to build.",
    url: "https://wiki.warframe.com/w/Air_Support_Charges"
  },
  Apoc: {
    section: "Acquisition",
    text: "The base Apoc is included in the Railjack's initial loadout after the Railjack has been repaired in the Rising Tide quest. It cannot be scrapped, and additional copies cannot be built.",
    url: "https://wiki.warframe.com/w/Apoc"
  },
  "Boolean Syandana": {
    section: "Acquisition",
    text: "Obtained from Nightwave: Series 3 at Rank 28, Nora's Choice at Rank 25, or Nora's Mix Volume 5 at Rank 14.",
    url: "https://wiki.warframe.com/w/Boolean_Syandana"
  },
  "A Fishing Spear": {
    section: "Acquisition",
    text: "Fishing spears are purchased from the landscape fishing suppliers: Fisher Hai-Luk in Cetus, The Business in Fortuna, or Daughter in the Necralisk, using the associated faction's Standing.",
    url: "https://wiki.warframe.com/w/Fishing"
  },
  "Aerospri Dex Pixia Skin": {
    section: "Acquisition",
    text: "The Aerospri Dex Pixia Skin is only available in the Market as part of the Titania Donann Skin for  165 or Titania Donann Collection for  195.",
    url: "https://wiki.warframe.com/w/Aerospri_Dex_Pixia_Skin"
  },
  "Atomicycle Summon": {
    section: "Acquisition",
    text: "Atomicycle Summon is automatically acquired upon completion of The Hex quest.",
    url: "https://wiki.warframe.com/w/Atomicycle_Summon"
  },
  "Brickie Muon Battery": {
    section: "Acquisition",
    text: 'Muon Batteries are acquired by dismantling Brickies caught through Fishing. Go to The Business in Fortuna, select the desired amount of Brickies available, and select the "Dismantle" option to extract the components.',
    url: "https://wiki.warframe.com/w/Brickie_Muon_Battery"
  },
  "Dendrite Blastoma": {
    section: "Acquisition",
    text: "Dendrite Blastoma can be obtained by filleting  Barbisteo and  Vitreospina (both from the Cambion Drift) at Daughter in the Necralisk.",
    url: "https://wiki.warframe.com/w/Dendrite_Blastoma"
  },
  "Devil\u2019s Cap": {
    section: "Acquisition",
    text: "Obtained from Deepmines Bounties on Venus.",
    url: "https://wiki.warframe.com/w/Devil%E2%80%99s_Cap"
  },
  "Crimson Talent": {
    section: "Acquisition",
    text: "After completing Jade Shadows: Constellations, complete the Scoria's Angel node in Uranus Proxima to receive 12\u201316 Crimson Talent (18\u201322 on Steel Path). Additional Crimson Talent can be rewarded for taking down all targets during the Ramsled transition phase.",
    url: "https://wiki.warframe.com/w/Crimson_Talent"
  },
  "Carpet Bomb": {
    section: "Acquisition",
    text: "Carpet Bomb is the Air Support ability included with the Scimitar landing craft. The Scimitar's main blueprint is purchased from the Market; its Avionics, Engines, and Fuselage blueprints come from Zanuka Hunter, Stalker or Shadow Stalker, and the Grustrag Three respectively.",
    url: "https://wiki.warframe.com/w/Scimitar"
  },
  "Alpha Corruptor": {
    section: "Acquisition",
    text: "During Operation: Sling-Stone, Alpha Corruptors were acquired by defeating Infested enemies; Ancient Infested dropped the Alpha and Beta variants.",
    url: "https://wiki.warframe.com/w/Corruptor"
  },
  "Beta Corruptor": {
    section: "Acquisition",
    text: "During Operation: Sling-Stone, Beta Corruptors were acquired by defeating Infested enemies; Ancient Infested dropped the Alpha and Beta variants.",
    url: "https://wiki.warframe.com/w/Corruptor"
  },
  "Crisma Toroid": {
    section: "Acquisition",
    text: "Drops from the Profit-Taker Orb during Phase 4 of the Heist in Orb Vallis (Venus).",
    url: "https://wiki.warframe.com/w/Crisma_Toroid"
  },
  "Dax Lustratus Shoulder Plates": {
    section: "Acquisition",
    text: "Purchase during Operation: Blood of Perita for 40 Marks of Valiance.",
    url: "https://wiki.warframe.com/w/Dax_Lustratus_Shoulder_Plates"
  },
  "Daybreak Vanquished Banner": {
    section: "Acquisition",
    text: "Obtained from Nora's Mix Volume 6 at Rank 4.",
    url: "https://wiki.warframe.com/w/Daybreak_Vanquished_Banner"
  },
  "Deathmark Shoulder Armor": {
    section: "Acquisition",
    text: "Obtained from Nora's Mix Volume 7 at Rank 30.",
    url: "https://wiki.warframe.com/w/Deathmark_Shoulder_Armor"
  },
  "Dominus Aureus": {
    section: "Acquisition",
    text: "During Operation: Eight Claw, complete the Isleweaver game mode for 18\u201322 Dominus Aureus, or 22\u201326 on Steel Path.",
    url: "https://wiki.warframe.com/w/Dominus_Aureus"
  },
  "Hidden Messages": {
    section: "Quest acquisition",
    text: "Complete the Eris\u2013Sedna Junction to receive the Hidden Messages quest; start it from the Codex.",
    url: "https://wiki.warframe.com/w/Hidden_Messages"
  },
  "Dual Swords Stavika Skin": {
    section: "Acquisition",
    text: "This skin can be obtained by reaching Rank 18 in Nightwave: Nora's Mix Volume 1, available from March 16th, 2022. It can also be purchased from Ticker during the Star Days seasonal event for debt-bonds.",
    url: "https://wiki.warframe.com/w/Dual_Swords_Stavika_Skin"
  },
  "Embracer Ephemera": {
    section: "Acquisition",
    text: "Obtained from defeating a Technocyte Coda, provided the Coda has the Ephemera themselves, regardless if they are Vanquished or Converted. Codas have a ~57% chance to appear with an Ephemera, otherwise they will spawn with an Emote or Captura Scene.",
    url: "https://wiki.warframe.com/w/Embracer_Ephemera"
  },
  "Ferment Bladder": {
    section: "Acquisition",
    text: "Fillet Amniophysi, Aquapulmo, Barbisteo, Cryptosuctus, Glutinox, Kymaeros, Ostimyr, or Vitreospina caught in the Cambion Drift at Daughter in the Necralisk. It can also appear in Daughter's rotating Daily Special for Platinum.",
    url: "https://wiki.warframe.com/w/Ferment_Bladder"
  },
  Dreamers: {
    section: "Acquisition",
    text: "Dreamers is the Air Support ability included with the Nightwave landing craft. Nightwave is awarded at Rank 3 in Nightwave: Nora's Mix Volume 8; it was also previously available in Series 3 and Nora's Mix Volume 2.",
    url: "https://wiki.warframe.com/w/Nightwave_(Landing_Craft)"
  },
  "Kahl Beacon": {
    section: "Acquisition",
    text: "Kahl Beacon is the Air Support ability included with the Skaut landing craft. The Skaut is purchased from the Market after completing Veilbreaker or from Chipper in Kahl's Garrison for 120 Stock at Rank 5 (Home).",
    url: "https://wiki.warframe.com/w/Skaut"
  },
  "Med-Tower": {
    section: "Acquisition",
    text: "Med-Tower is the Air Support ability included with the Mantis landing craft. The Mantis blueprint is purchased from the Market; its component blueprints come from Reinforced and Rare Storage Containers, with Avionics in Orokin containers, Engines in Grineer containers, and the Fuselage in Corpus containers.",
    url: "https://wiki.warframe.com/w/Mantis"
  },
  "Orokin Eye": {
    section: "Acquisition",
    text: "Orokin Eye is the Air Support ability included with the Parallax landing craft. Parallax can be purchased complete from the Market, or built from a Market blueprint with component blueprints obtained as rare drops from Zariman Ten Zero Reinforced Carrypod Storage Containers.",
    url: "https://wiki.warframe.com/w/Parallax"
  },
  Override: {
    section: "Acquisition",
    text: "Override is the default Air Support ability included with the Liset, the landing craft unlocked during the Vor's Prize quest.",
    url: "https://wiki.warframe.com/w/Liset"
  },
  "Glacia Syandana": {
    section: "Acquisition",
    text: "Obtained from Nora's Mix Volume 1 at Rank 30.",
    url: "https://wiki.warframe.com/w/Glacia_Syandana"
  },
  "Patient Zero": {
    section: "Quest acquisition",
    text: "Complete the Pluto\u2013Eris Junction to receive the Patient Zero quest; start it from the Codex.",
    url: "https://wiki.warframe.com/w/Patient_Zero"
  },
  Pulsar: {
    section: "Acquisition",
    text: "The base Pulsar is included in the Railjack's initial loadout after the Railjack has been repaired in the Rising Tide quest. It cannot be scrapped, and additional copies cannot be built.",
    url: "https://wiki.warframe.com/w/Pulsar"
  },
  "Kyndryn Gunblade Skin": {
    section: "Acquisition",
    text: "Purchase during Operation: Atramentum for 30 Nightmare Tatters. It was originally obtainable by completing all Recall: Ten-Zero alerts in 2023.",
    url: "https://wiki.warframe.com/w/Kyndryn_Gunblade_Skin"
  },
  "Marks of Valiance": {
    section: "Acquisition",
    text: "Complete Perita Rebellion game modes for 8\u201315 Marks of Valiance, or 10\u201317 on Steel Path. Timed Operation Alerts reward 20, or 30 on Steel Path.",
    url: "https://wiki.warframe.com/w/Marks_of_Valiance"
  },
  "Monarcierro Day of the Dead Syandana": {
    section: "Acquisition",
    text: "Obtained from Nora's Mix: Dreams of the Dead at Rank 30.",
    url: "https://wiki.warframe.com/w/Monarcierro_Day_of_the_Dead_Syandana"
  },
  "Sands Of Inaros": {
    section: "Quest acquisition",
    text: "At Mastery Rank 5, acquire the Sands of Inaros quest blueprint by trading with another player or purchasing it from Baro Ki'Teer for 100 Ducats and 25,000 Credits. Craft the blueprint in the Foundry to begin the quest.",
    url: "https://wiki.warframe.com/w/Sands_of_Inaros"
  },
  "Raya Aurora Ephemera": {
    section: "Acquisition",
    text: "Awarded at Rank 28 in Nora's Mix Volume 9.",
    url: "https://wiki.warframe.com/w/Raya_Aurora_Ephemera"
  },
  "Raya Sigma Syandana": {
    section: "Acquisition",
    text: "Obtained from Nora's Mix Volume 9 at Rank 18.",
    url: "https://wiki.warframe.com/w/Raya_Sigma_Syandana"
  },
  "Saturn Six Syandana": {
    section: "Acquisition",
    text: "Obtained from Series 1 or Intermission II of Nightwave at Rank 28. It can also occasionally be purchased from the Nightwave Cred Offering store for 75 Creds.",
    url: "https://wiki.warframe.com/w/Saturn_Six_Syandana"
  },
  "Sacred Vessel": {
    section: "Acquisition",
    text: "Obtained during the Sands of Inaros quest, which begins after acquiring and crafting its quest blueprint.",
    url: "https://wiki.warframe.com/w/Sands_of_Inaros"
  },
  "Sentry Gun": {
    section: "Acquisition",
    text: "Sentry Gun is the Air Support ability included with the Xiphos landing craft. The Xiphos can be purchased complete from the Market, or built from its Market blueprint with component blueprints obtained from three-cache Sabotage or Exterminate missions.",
    url: "https://wiki.warframe.com/w/Xiphos"
  },
  "Spore Ephemera": {
    section: "Acquisition",
    text: "Awarded at Rank 19 in Series 2: The Emissary, Rank 18 in Intermission III, Rank 27 in Nora's Mix Volume 4, or Rank 7 in Nora's Mix: Dreams of the Dead.",
    url: "https://wiki.warframe.com/w/Spore_Ephemera"
  },
  "Stelflare Syandana": {
    section: "Acquisition",
    text: "Obtained from Nora's Mix Volume 5 at Rank 30.",
    url: "https://wiki.warframe.com/w/Stelflare_Syandana"
  },
  "Stable Corruptor": {
    section: "Acquisition",
    text: "During Operation: Sling-Stone, Stable Corruptors were acquired by defeating Infested enemies; light Infested units most commonly dropped this variant.",
    url: "https://wiki.warframe.com/w/Corruptor"
  },
  "The Limbo Theorem": {
    section: "Quest acquisition",
    text: "Complete the Jupiter\u2013Europa Junction to receive The Limbo Theorem quest; start it from the Codex.",
    url: "https://wiki.warframe.com/w/The_Limbo_Theorem"
  },
  "The Silver Grove": {
    section: "Quest acquisition",
    text: "After completing The Second Dream and reaching Mastery Rank 7, start The Silver Grove by speaking with New Loka's Amaryn in a relay, then activate it from the Codex Quest menu.",
    url: "https://wiki.warframe.com/w/The_Silver_Grove"
  },
  "Waveform Ephemera": {
    section: "Acquisition",
    text: "Awarded at Rank 19 in Nora's Choice, Rank 5 in Nora's Mix Volume 3, or Rank 19 in Nora's Mix Volume 7.",
    url: "https://wiki.warframe.com/w/Waveform_Ephemera"
  },
  "Eukar Claw Skin": {
    section: "Acquisition",
    text: "This skin can be obtained by reaching Rank 13 in Nightwave Nora's Mix Volume 4, Available from May 24th, 2023.",
    url: "https://wiki.warframe.com/w/Eukar_Claw_Skin"
  },
  "Fish Meat": {
    section: "Acquisition",
    text: "Fish Meat can be acquired by taking fish to Fisher Hai-Luk to have them filleted. The number of meat increases with the size of the fish captured, independently of weight.",
    url: "https://wiki.warframe.com/w/Fish_Meat"
  },
  "Gammacor Day of the Dead Skin": {
    section: "Acquisition",
    text: "This skin is available during Nights of Naberus as part of Naberus Treats from Daughter for x90  Mother Token each.",
    url: "https://wiki.warframe.com/w/Gammacor_Day_of_the_Dead_Skin"
  },
  "Gigelor Prime Syandana": {
    section: "Acquisition",
    text: "Acquired by purchasing the Titania Prime Access, or from Prime Resurgence for 2  Regal Aya when it is in rotation.",
    url: "https://wiki.warframe.com/w/Gigelor_Prime_Syandana"
  },
  "Glaxion Polar Skin": {
    section: "Acquisition",
    text: "The Glaxion Polar Skin was obtained by scoring 3000 points in a single Excavation mission in Operation Cryotic Front.",
    url: "https://wiki.warframe.com/w/Glaxion_Polar_Skin"
  },
  "Grendel Prime Theme": {
    section: "Acquisition",
    text: "The Somachord version of the theme can be bought from Varzia for 5  Aya",
    url: "https://wiki.warframe.com/w/Grendel_Prime_Theme"
  },
  "Kriller Thermal Laser": {
    section: "Acquisition",
    text: 'Thermal Lasers are acquired by dismantling Krillers caught through Fishing. Go to The Business in Fortuna, select the desired amount of Krillers available, and select the "Dismantle" option to extract the components.',
    url: "https://wiki.warframe.com/w/Kriller_Thermal_Laser"
  },
  "Liftbalon Ephemera": {
    section: "Acquisition",
    text: "Can be purchased during Operation: Atramentum from Aspirant Zorba in any Relays for 65  Nightmare Tatters once Community Progress has reached 90%.",
    url: "https://wiki.warframe.com/w/Liftbalon_Ephemera"
  },
  "Lovestruck Ephemera": {
    section: "Acquisition",
    text: "Obtained from defeating a Technocyte Coda, provided the Coda has the Ephemera themselves, regardless if they are Vanquished or Converted. Codas have a ~57% chance to appear with an Ephemera, otherwise they will spawn with an Emote or Captura Scene.",
    url: "https://wiki.warframe.com/w/Lovestruck_Ephemera"
  },
  "Mirewinder Parallel Biode": {
    section: "Acquisition",
    text: 'Parallel Biodes are acquired by dismantling Mirewinders caught through Fishing. Go to The Business in Fortuna, select the desired amount of Mirewinders available, and select the "Dismantle" option to extract the components.',
    url: "https://wiki.warframe.com/w/Mirewinder_Parallel_Biode"
  },
  Multron: {
    section: "Acquisition",
    text: "The Multron is automatically acquired upon obtaining  Oxylus. Note that this weapon also takes up one Companion inventory slot.",
    url: "https://wiki.warframe.com/w/Multron"
  },
  "Nekros Prime Theme": {
    section: "Acquisition",
    text: "The Somachord version of the theme can be bought from Varzia for 5  Aya.",
    url: "https://wiki.warframe.com/w/Nekros_Prime_Theme"
  },
  "Nukor Daybreak Skin": {
    section: "Acquisition",
    text: "This skin could be obtained by reaching Rank 19 in Nightwave: Nora's Mix Volume 6, available from May 15th, 2024 and to September 3rd, 2024.",
    url: "https://wiki.warframe.com/w/Nukor_Daybreak_Skin"
  },
  "Oberon Obsidian Skin": {
    section: "Acquisition",
    text: "The Oberon Obsidian Skin was available through the PlayStation store via the Renown Pack XV.",
    url: "https://wiki.warframe.com/w/Oberon_Obsidian_Skin"
  },
  "Okuri Tails Prime Ephemera": {
    section: "Acquisition",
    text: "Obtained via Voruna Prime Access Accessories Pack, available from April 8, 2026.",
    url: "https://wiki.warframe.com/w/Okuri_Tails_Prime_Ephemera"
  },
  "Orion's Swaddle Syandana": {
    section: "Acquisition",
    text: "Awarded to player via mailbox after completing the Jade Shadows: Constellations quest.",
    url: "https://wiki.warframe.com/w/Orion%27s_Swaddle_Syandana"
  },
  "Pharaoh Predasite": {
    section: "Acquisition",
    text: "Predasites are acquired through Revivification with Son in the Necralisk, Deimos. The player must capture a Weakened Pharaoh Predasite via Conservation after it has been attacked by Infested, as well as obtain a Mutagen and Antigen bought from Son with  Entrati Standing, and  5,000 to initiate the Revivification process.",
    url: "https://wiki.warframe.com/w/Pharaoh_Predasite"
  },
  "Primatura Ephemera": {
    section: "Acquisition",
    text: "Can be purchased during Operation: Atramentum from Aspirant Zorba in any Relays for 65  Nightmare Tatters once Community Progress has reached 30%.",
    url: "https://wiki.warframe.com/w/Primatura_Ephemera"
  },
  "Pustulent Cognitive Nodule": {
    section: "Acquisition",
    text: "Pustulent Cognitive Nodules can be obtained by filleting Cryptosuctus and Aquapulmo (both from the Cambion Drift) through Daughter in the Necralisk",
    url: "https://wiki.warframe.com/w/Pustulent_Cognitive_Nodule"
  },
  "Revenant Mephisto Syandana": {
    section: "Acquisition",
    text: "Purchase Revenant Mephisto Skin from the Market for  150.",
    url: "https://wiki.warframe.com/w/Revenant_Mephisto_Syandana"
  },
  "Samia Towsun Syandana": {
    section: "Acquisition",
    text: "Purchase from Nakak, Cetus for 350  Nakak Pearl during Dog Days.",
    url: "https://wiki.warframe.com/w/Samia_Towsun_Syandana"
  },
  Scrap: {
    section: "Acquisition",
    text: "Scrap can be acquired by dismantling Servofish at The Business in Fortuna. The yield is increased by how intricate the caught fish is.",
    url: "https://wiki.warframe.com/w/Scrap"
  },
  Sweeper: {
    section: "Acquisition",
    text: "This Sentinel weapon is automatically acquired upon obtaining   Carrier. Note that this weapon also takes up one Companion inventory slot.",
    url: "https://wiki.warframe.com/w/Sweeper"
  },
  "Temporal Dust": {
    section: "Acquisition",
    text: "Temporal Dust can be acquired from Isleweaver as a possible end mission reward in quantities of 20 (25 in The Steel Path) or as an uncommon drop from  The Murmur enemies and Entrati storage containers.",
    url: "https://wiki.warframe.com/w/Temporal_Dust"
  },
  "TennoCon Riftguard Syandana (Void-swept)": {
    section: "Acquisition",
    text: "Originally obtained by purchasing the TennoCon 2025 Digital Pack. Now no longer available.",
    url: "https://wiki.warframe.com/w/TennoCon_Riftguard_Syandana_(Void-swept)"
  },
  "Tethra Data Fragments": {
    section: "Acquisition",
    text: "Upon completing the Tethra's Doom Interception mission on Earth, players will be awarded two fragments regardless of how long they play per session.",
    url: "https://wiki.warframe.com/w/Tethra_Data_Fragments"
  },
  "Two-Handed Nikana Maligna Skin": {
    section: "Acquisition",
    text: "This skin can be obtained by reaching Rank 22 in Nightwave: Series 2 \u2014 The Emissary, available from July 6th, 2019. It can also be obtained by reaching Rank 18 in Nightwave/Nora's Choice, available from August 4th, 2021.",
    url: "https://wiki.warframe.com/w/Two-Handed_Nikana_Maligna_Skin"
  },
  "Vasto Tekelu Skin": {
    section: "Acquisition",
    text: "Automatically added to the player's inventory after acquiring Vasto Tekelu Skin, which is permanently available for purchase from in-game market separately for  20 or as part of The Tekelu Collection III bundle  80.",
    url: "https://wiki.warframe.com/w/Vasto_Tekelu_Skin"
  },
  "Volt Amethyst Skin": {
    section: "Acquisition",
    text: "The Volt Amethyst Skin was available through the Discord store via the Reverence Pack, along with Excalibur Amethyst Skin & Mag Amethyst Skin.",
    url: "https://wiki.warframe.com/w/Volt_Amethyst_Skin"
  },
  "Wirematrix Ephemera": {
    section: "Acquisition",
    text: "Awarded from reaching certain ranks in Nightwave.",
    url: "https://wiki.warframe.com/w/Wirematrix_Ephemera"
  },
  "Zarina Ephemera": {
    section: "Acquisition",
    text: "Obtained from defeating a  Heat Sister of Parvos, provided she has the Ephemera herself, regardless if she is Vanquished or Converted. Sisters have a 20% chance to appear with an Ephemera depending on the Warframe who created her.",
    url: "https://wiki.warframe.com/w/Zarina_Ephemera"
  },
  "Navic Prime Mask": {
    section: "Prime Access",
    text: "Included in the Navic Prime Sentinel Bundle from the Sevagoth Prime Access Accessories Pack. The original Prime Access purchase window has ended.",
    url: "https://www.warframe.com/en/news/accesso-sevagoth-prime",
    source: "Digital Extremes"
  },
  "Navic Prime Tail": {
    section: "Prime Access",
    text: "Included in the Navic Prime Sentinel Bundle from the Sevagoth Prime Access Accessories Pack. The original Prime Access purchase window has ended.",
    url: "https://www.warframe.com/en/news/accesso-sevagoth-prime",
    source: "Digital Extremes"
  },
  "Navic Prime Wings": {
    section: "Prime Access",
    text: "Included in the Navic Prime Sentinel Bundle from the Sevagoth Prime Access Accessories Pack. The original Prime Access purchase window has ended.",
    url: "https://www.warframe.com/en/news/accesso-sevagoth-prime",
    source: "Digital Extremes"
  },
  "Da-Ren": { section: "Acquisition", text: "Awarded from missions in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Da-Ren" },
  "Empazu-Shol": { section: "Acquisition", text: "Dropped by Commandeered Prime Warframes in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Empazu-Shol" },
  "Esti Vel-Ikha": { section: "Acquisition", text: "Dropped by Commandeered Prime Warframes in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Esti_Vel-Ikha" },
  "Evir-Ti": { section: "Acquisition", text: "Dropped by certain enemies in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Evir-Ti" },
  "Hayan-Dabor": { section: "Acquisition", text: "Dropped by certain enemies in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Hayan-Dabor" },
  "Hok-Kaal": { section: "Acquisition", text: "Dropped by certain enemies in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Hok-Kaal" },
  "Kaal-zidi": { section: "Acquisition", text: "Awarded from missions in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Kaal-zidi" },
  "Lashta-Vak": { section: "Acquisition", text: "Dropped by Commandeered Prime Warframes in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Lashta-Vak" },
  "Lorun-Tash": { section: "Acquisition", text: "Dropped by certain enemies in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Lorun-Tash" },
  "Metem-Erun": { section: "Acquisition", text: "Dropped by Commandeered Prime Warframes in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Metem-Erun" },
  "Metem-Hakh": { section: "Acquisition", text: "Dropped by Commandeered Prime Warframes in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Metem-Hakh" },
  "Omn-Evi": { section: "Acquisition", text: "Awarded from missions in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Omn-Evi" },
  "Scan Aquatic Lifeforms": { section: "Acquisition", text: "Automatically acquired upon obtaining an Oxylus Sentinel.", url: "https://wiki.warframe.com/w/Scan_Aquatic_Lifeforms" },
  "Sey-Taph": { section: "Acquisition", text: "Dropped by certain enemies in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Sey-Taph" },
  "Sil-Tabol": { section: "Acquisition", text: "Awarded from missions in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Sil-Tabol" },
  "Talsek-An": { section: "Acquisition", text: "Dropped by certain enemies in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Talsek-An" },
  "Ubri-Kaneph": { section: "Acquisition", text: "Dropped by Commandeered Prime Warframes in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Ubri-Kaneph" },
  "Ulashta-Shol": { section: "Acquisition", text: "Dropped by certain enemies in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Ulashta-Shol" },
  "Vik-Anam": { section: "Acquisition", text: "Awarded from missions in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Vik-Anam" },
  "Vikla-Safor": { section: "Acquisition", text: "Dropped by Commandeered Prime Warframes in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Vikla-Safor" },
  "Yar Dal": { section: "Acquisition", text: "Dropped by certain enemies in The Perita Rebellion. It can also be purchased from Marie's rotating shop.", url: "https://wiki.warframe.com/w/Yar_Dal" },
  Akaten: { section: "Acquisition", text: "Automatically acquired upon claiming a Hound configured with the Hec Model.", url: "https://wiki.warframe.com/w/Akaten" },
  "Atomos Day of the Dead Skin": { section: "Acquisition", text: "Available by reaching Rank 22 in Nora's Mix: Dreams of the Dead, available from October 27, 2025 to April 8, 2026.", url: "https://wiki.warframe.com/w/Atomos_Day_of_the_Dead_Skin" },
  "Brilliant Eidolon Shard": { section: "Acquisition", text: "Dropped by Eidolon Teralysts and Eidolon Gantulysts when captured at their final stage with a charged Eidolon Lure.", url: "https://wiki.warframe.com/w/Brilliant_Eidolon_Shard" },
  "Cedo Daybreak Skin": { section: "Acquisition", text: "Available by reaching Rank 13 in Nightwave: Nora's Mix Volume 6, available from May 15, 2024 to September 3, 2024.", url: "https://wiki.warframe.com/w/Cedo_Daybreak_Skin" },
  "Echowinder Anoscopic Sensor": { section: "Acquisition", text: "Acquired by dismantling Echowinders caught through Fishing at The Business in Fortuna.", url: "https://wiki.warframe.com/w/Echowinder_Anoscopic_Sensor" },
  "Excalibur Amethyst Skin": { section: "Acquisition", text: "Available through the Discord store via the Reverence Pack, along with the Mag Amethyst Skin and Volt Amethyst Skin.", url: "https://wiki.warframe.com/w/Excalibur_Amethyst_Skin" },
  "Fish Oil": { section: "Acquisition", text: "Acquired by speaking to Fisher Hai-Luk with fish in your inventory and choosing Cut Fish; the amount increases with fish size.", url: "https://wiki.warframe.com/w/Fish_Oil" },
  "Gammacor Solstice Skin": { section: "Acquisition", text: "Originally available during Tennobaum.", url: "https://wiki.warframe.com/w/Gammacor_Solstice_Skin" },
  Haalvu: { section: "Acquisition", text: "Available by watching TennoCon 2026 on WARFRAME's Twitch with a Twitch-linked account for 30 consecutive minutes on July 11, 2026, during the specified broadcast window.", url: "https://wiki.warframe.com/w/Haalvu" },
  "Hawth Diwata Skin": { section: "Acquisition", text: "Available in the Market as part of the Titania Donann Skin or Titania Donann Collection.", url: "https://wiki.warframe.com/w/Hawth_Diwata_Skin" },
  "K.O.L. Drippy-Assisted Tactical Syandana": { section: "Acquisition", text: "Purchased from Varzia for 1 Regal Aya.", url: "https://wiki.warframe.com/w/K.O.L._Drippy-Assisted_Tactical_Syandana" },
  "Kudzon Ephemera": { section: "Acquisition", text: "Available for 10 Aya on Varzia's Prime Resurgence Market.", url: "https://wiki.warframe.com/w/Kudzon_Ephemera" },
  "Laser Rifle": { section: "Acquisition", text: "Automatically acquired upon obtaining Wyrm.", url: "https://wiki.warframe.com/w/Laser_Rifle" },
  "Madurai Badge": { section: "Acquisition", text: "Purchased from the Madurai Focus Represent shop for 1,000,000 Focus.", url: "https://wiki.warframe.com/w/Madurai_Badge" },
  "Nulwarden Syandana": { section: "Acquisition", text: "Purchased from Varzia for 1 Regal Aya.", url: "https://wiki.warframe.com/w/Nulwarden_Syandana" },
  "Obsidian Ephemera": { section: "Acquisition", text: "A PS4-exclusive Ephemera included in the Renown Pack XVII Bundle, available from September 10, 2019 to March 10, 2020.", url: "https://wiki.warframe.com/w/Obsidian_Ephemera" },
  "Panzer Vulpaphyla": { section: "Acquisition", text: "Acquired through Revivification with Son in the Necralisk on Deimos after capturing a Weakened Panzer Vulpaphyla through Conservation and obtaining a Mutagen and Antigen from Son with Entrati Standing.", url: "https://wiki.warframe.com/w/Panzer_Vulpaphyla" },
  "Prisma Burst Laser": { section: "Acquisition", text: "Automatically acquired upon purchasing Prisma Shade from Baro Ki'Teer; Baro's stock changes with each appearance.", url: "https://wiki.warframe.com/w/Prisma_Burst_Laser" },
  "Protokol Longsword Skin": { section: "Acquisition", text: "Obtained by completing the WARFRAME: 1999 Demo or The Hex quest.", url: "https://wiki.warframe.com/w/Protokol_Longsword_Skin" },
  "Sapcaddy Venedo Case": { section: "Acquisition", text: "Acquired by dismantling Sapcaddies caught through Fishing at The Business in Fortuna.", url: "https://wiki.warframe.com/w/Sapcaddy_Venedo_Case" },
  "Sirius' Swaddle Syandana": { section: "Acquisition", text: "Awarded to the player by mailbox after completing the Jade Shadows: Constellations quest.", url: "https://wiki.warframe.com/w/Sirius%27_Swaddle_Syandana" },
  "Solstice Vanquished Banner": { section: "Acquisition", text: "Obtained as the Tennobaum 2016 Ultimate Goal Reward.", url: "https://wiki.warframe.com/w/Solstice_Vanquished_Banner" },
  "Sunika Kubrow": { section: "Acquisition", text: "Requires the Howl of the Kubrow quest, a Kubrow Egg from Kubrow Dens on Earth, and a built Incubator Power Core whose blueprint is obtained from the Market.", url: "https://wiki.warframe.com/w/Sunika_Kubrow" },
  "Temporal Prime Ephemera": { section: "Acquisition", text: "Obtained via the Protea Prime Access Accessories Pack, available from May 1, 2024 until August 21, 2024.", url: "https://wiki.warframe.com/w/Temporal_Prime_Ephemera" },
  "Thalassa Prime Ephemera": { section: "Acquisition", text: "Obtained via the Yareli Prime Access Accessories Pack, available from May 21, 2025.", url: "https://wiki.warframe.com/w/Thalassa_Prime_Ephemera" },
  "Triodic Prime Syandana": { section: "Acquisition", text: "Acquired through Gyre Prime Access or from Prime Resurgence for 2 Regal Aya when in rotation.", url: "https://wiki.warframe.com/w/Triodic_Prime_Syandana" },
  "Vengeful Charge Ephemera": { section: "Acquisition", text: "Obtained from defeating an Electricity Kuva Lich when the Lich has the Ephemera; Liches have a 20% chance to be generated with an Ephemera depending on the Warframe used.", url: "https://wiki.warframe.com/w/Vengeful_Charge_Ephemera" },
  "Aklato Day of the Dead Skin": { section: "Acquisition", text: "Available for a limited time from the in-game Market during Nights of Naberus, separately or as part of the Day of the Dead Weapon Skin Pack.", url: "https://wiki.warframe.com/w/Aklato_Day_of_the_Dead_Skin" },
  Batoten: { section: "Acquisition", text: "Automatically acquired upon claiming a Hound configured with the Dorma Model.", url: "https://wiki.warframe.com/w/Batoten" },
  "Broca Prominence Syandana": { section: "Acquisition", text: "Purchased from Varzia for 10 Aya.", url: "https://wiki.warframe.com/w/Broca_Prominence_Syandana" },
  "Deth Machine Rifle": { section: "Acquisition", text: "Automatically acquired upon obtaining Dethcube.", url: "https://wiki.warframe.com/w/Deth_Machine_Rifle" },
  "Emerald Talent": { section: "Acquisition", text: "After completing Jade Shadows: Constellations, the Kuva Wytch node becomes available from Pontis Tower or Railjack Navigation.", url: "https://wiki.warframe.com/w/Emerald_Talent" },
  "Excalibur Obsidian Azura Skin": { section: "Acquisition", text: "Available through the PlayStation Store via the Obsidian Azura Collection.", url: "https://wiki.warframe.com/w/Excalibur_Obsidian_Azura_Skin" },
  "Fragor Tekelu Skin": { section: "Acquisition", text: "Previously available from Gift from the Lotus in 2019.", url: "https://wiki.warframe.com/w/Fragor_Tekelu_Skin" },
  "Gara Prime Theme": { section: "Acquisition", text: "The Somachord version can be purchased from Varzia for 5 Aya.", url: "https://wiki.warframe.com/w/Gara_Prime_Theme" },
  "Helminth Charger": { section: "Acquisition", text: "Requires the Howl of the Kubrow quest, a Kubrow Egg from Kubrow Dens on Earth, and a built Incubator Power Core whose blueprint is obtained from the Market.", url: "https://wiki.warframe.com/w/Helminth_Charger" },
  "Karotic Signa": { section: "Acquisition", text: "Acquired by activating five consoles within the Kuva Wytch and entering the normally locked secret room before the Bloodfrenzied Sister miniboss.", url: "https://wiki.warframe.com/w/Karotic_Signa" },
  "Lato Prime": { section: "Acquisition", text: "In the global build, available only to owners of the Grand Master Founders package offered from December 19, 2012 to November 1, 2013; no longer obtainable through that package.", url: "https://wiki.warframe.com/w/Lato_Prime" },
  "Mag Amethyst Skin": { section: "Acquisition", text: "Available through the Discord store via the Reverence Pack, along with the Excalibur Amethyst Skin and Volt Amethyst Skin.", url: "https://wiki.warframe.com/w/Mag_Amethyst_Skin" },
  Mausolon: { section: "Acquisition", text: "Automatically acquired as a built weapon upon claiming a Voidrig or Bonewidow Necramech from the Foundry.", url: "https://wiki.warframe.com/w/Mausolon" },
  "Naberus Shoulder Armor": { section: "Acquisition", text: "Purchased from the Market.", url: "https://wiki.warframe.com/w/Naberus_Shoulder_Armor" },
  "Nidus Prime Theme": { section: "Acquisition", text: "The Somachord version can be purchased from Varzia for 5 Aya.", url: "https://wiki.warframe.com/w/Nidus_Prime_Theme" },
  "Nulwarden Syandana (Void-swept)": { section: "Acquisition", text: "Automatically added to the inventory when the Nulwarden Syandana is purchased from Varzia for 1 Regal Aya.", url: "https://wiki.warframe.com/w/Nulwarden_Syandana_%28Void-swept%29" },
  "Ocular Stem-Root": { section: "Acquisition", text: "Obtained by filleting Flagellocanths at Daughter in the Necralisk.", url: "https://wiki.warframe.com/w/Ocular_Stem-Root" },
  "Pareidola Ephemera": { section: "Acquisition", text: "Purchased during Operation: Atramentum from Aspirant Zorba in any Relay for 65 Nightmare Tatters after Community Progress reaches 60%.", url: "https://wiki.warframe.com/w/Pareidola_Ephemera" },
  "Proof Fragment": { section: "Acquisition", text: "Obtained by killing enemies from the associated quest; nine fragments are required to build all keys needed to complete the quest.", url: "https://wiki.warframe.com/w/Proof_Fragment" },
  "Pyrus Essence": { section: "Acquisition", text: "Obtained on Earth, Mercury, Ceres, or Saturn by knocking down and capturing Pyrus Essence Carrier units.", url: "https://wiki.warframe.com/w/Pyrus_Essence" },
  "Revenant Prime Theme": { section: "Acquisition", text: "The Somachord version can be purchased from Varzia for 5 Aya.", url: "https://wiki.warframe.com/w/Revenant_Prime_Theme" },
  "Saturated Muscle Mass": { section: "Acquisition", text: "Obtained by filleting Kymaeros and Ostimyr from the Cambion Drift at Daughter in the Necralisk.", url: "https://wiki.warframe.com/w/Saturated_Muscle_Mass" },
  "Scrubber Exa Brain": { section: "Acquisition", text: "Acquired by dismantling Scrubbers caught through Fishing at The Business in Fortuna.", url: "https://wiki.warframe.com/w/Scrubber_Exa_Brain" },
  "Tammpet Sugatra": { section: "Acquisition", text: "Acquired from Nightwave Nora's Mix Volume 8 at Rank 22.", url: "https://wiki.warframe.com/w/Tammpet_Sugatra" },
  "TennoCon 2016 Syandana": { section: "Acquisition", text: "Originally obtained as a bonus code from purchasing a physical TennoCon 2016 ticket; no longer available.", url: "https://wiki.warframe.com/w/TennoCon_2016_Syandana" },
  "Tink Dissipator Coil": { section: "Acquisition", text: "Acquired by dismantling Tinks caught through Fishing at The Business in Fortuna.", url: "https://wiki.warframe.com/w/Tink_Dissipator_Coil" },
  "Vauban Prime Theme": { section: "Acquisition", text: "The Somachord version can be purchased from Varzia for 5 Aya.", url: "https://wiki.warframe.com/w/Vauban_Prime_Theme" },
  "Vestigial Motes": { section: "Acquisition", text: "Awarded for completing Ascension missions on Brutus, Uranus: 11-14, or 16-18 on The Steel Path.", url: "https://wiki.warframe.com/w/Vestigial_Motes" },
  "Wisp Dex Skin": { section: "Acquisition", text: "Available for logging in from March 28, 2022 to May 2, 2022, and for defeating John Prodman in the Gift of the Lotus - Stolen! Assassination from May 19, 2023 to June 2, 2023.", url: "https://wiki.warframe.com/w/Wisp_Dex_Skin" },
  "Akvasto Day of the Dead Skin": { section: "Acquisition", text: "Automatically acquired when Vasto Day of the Dead Skin is purchased from the in-game Market during Nights of Naberus, separately or as part of Day of the Dead Weapon Skin Pack II.", url: "https://wiki.warframe.com/w/Akvasto_Day_of_the_Dead_Skin" },
  "Broca Solstice Syandana": { section: "Acquisition", text: "Available as a recurring Tennobaum reward.", url: "https://wiki.warframe.com/w/Broca_Solstice_Syandana" },
  "Envoy's Sphere Longsword Skin": { section: "Acquisition", text: "Redeemed using a code obtained from any Soulframe Founders pack.", url: "https://wiki.warframe.com/w/Envoy%27s_Sphere_Longsword_Skin" },
  "Eye-Eye Rotoblade": { section: "Acquisition", text: "Acquired by dismantling Eye-Eyes caught through Fishing at The Business in Fortuna.", url: "https://wiki.warframe.com/w/Eye-Eye_Rotoblade" },
  "Frakta Shoulder Guard": { section: "Acquisition", text: "Available in Nightwave Cred Offerings for 75 Cred beginning with Nightwave: Amir's Shockwave.", url: "https://wiki.warframe.com/w/Frakta_Shoulder_Guard" },
  "Gloriana Ephemera": { section: "Acquisition", text: "Obtained from defeating a Cold Sister of Parvos when she has the Ephemera; Sisters have a 20% chance to be generated with an Ephemera depending on the Warframe used.", url: "https://wiki.warframe.com/w/Gloriana_Ephemera" },
  "Hanteler Prime Syandana": { section: "Acquisition", text: "Acquired through Voruna Prime Access or Prime Resurgence for 2 Regal Aya when in rotation.", url: "https://wiki.warframe.com/w/Hanteler_Prime_Syandana" },
  "Ignis Day of the Dead Skin": { section: "Acquisition", text: "Available during Nights of Naberus from Daughter for 90 Mother Tokens.", url: "https://wiki.warframe.com/w/Ignis_Day_of_the_Dead_Skin" },
  "Javlok Capacitor": { section: "Acquisition", text: "Dropped by Prosecutors in the Grineer Shipyard tileset with a 100% drop chance.", url: "https://wiki.warframe.com/w/Javlok_Capacitor" },
  "Lucretia Ephemera": { section: "Acquisition", text: "Obtained from defeating a Toxin Sister of Parvos when she has the Ephemera; Sisters have a 20% chance to be generated with an Ephemera depending on the Warframe used.", url: "https://wiki.warframe.com/w/Lucretia_Ephemera" },
  "Maginav Prime Signa": { section: "Acquisition", text: "Purchased from the Market as part of Sevagoth Prime's Prime Access Accessories Pack or Complete Pack.", url: "https://wiki.warframe.com/w/Maginav_Prime_Signa" },
  "Merulina Prime Syandana": { section: "Acquisition", text: "Acquired through Yareli Prime Access or Prime Resurgence for 2 Regal Aya when in rotation.", url: "https://wiki.warframe.com/w/Merulina_Prime_Syandana" },
  "Oberon Prime Theme": { section: "Acquisition", text: "The Somachord version can be purchased from Varzia for 5 Aya.", url: "https://wiki.warframe.com/w/Oberon_Prime_Theme" },
  "On Call Crew": { section: "Acquisition", text: "Automatically acquired upon reaching Command Intrinsic Rank 9.", url: "https://wiki.warframe.com/w/On_Call_Crew" },
  "Pins-N-Needles Ephemera": { section: "Acquisition", text: "Obtained from defeating a Technocyte Coda when the Coda has the Ephemera; Codas have an approximately 57% chance to appear with an Ephemera.", url: "https://wiki.warframe.com/w/Pins-N-Needles_Ephemera" },
  "Quassus Solstice Skin": { section: "Acquisition", text: "Originally available during Tennobaum.", url: "https://wiki.warframe.com/w/Quassus_Solstice_Skin" },
  "Rhino Dex Skin": { section: "Acquisition", text: "Available for logging in to Warframe from April 19, 2021 to May 17, 2021.", url: "https://wiki.warframe.com/w/Rhino_Dex_Skin" },
  "Saturn Six Day of the Dead Syandana": { section: "Acquisition", text: "Purchased from Daughter for 125 Mother Tokens during Naberus.", url: "https://wiki.warframe.com/w/Saturn_Six_Day_of_the_Dead_Syandana" },
  "Scuttler Husk": { section: "Acquisition", text: "Awarded for defeating The Fragmented in Isleweaver: 16-20 normally or 20-24 in Steel Path.", url: "https://wiki.warframe.com/w/Scuttler_Husk" },
  "Sybillina Ephemera": { section: "Acquisition", text: "Obtained from defeating an Electricity Sister of Parvos when she has the Ephemera; Sisters have a 20% chance to be generated with an Ephemera depending on the Warframe used.", url: "https://wiki.warframe.com/w/Sybillina_Ephemera" },
  "Tenebrous Ephemera": { section: "Acquisition", text: "Purchased from Little Duck in Fortuna for 15 Anomaly Shards earned by clearing Sentient Anomalies in the Veil Proxima.", url: "https://wiki.warframe.com/w/Tenebrous_Ephemera" },
  "Trembera Essence": { section: "Acquisition", text: "Obtained on Earth, Mercury, Ceres, or Saturn by breaking containers and killing enemies.", url: "https://wiki.warframe.com/w/Trembera_Essence" },
  "Vengeful Chill Ephemera": { section: "Acquisition", text: "Obtained from defeating a Cold Kuva Lich when the Lich has the Ephemera; Kuva Liches have a 20% chance to be generated with an Ephemera depending on the Warframe used.", url: "https://wiki.warframe.com/w/Vengeful_Chill_Ephemera" },
  "Waxen Sebum Deposit": { section: "Acquisition", text: "Obtained by selecting Cut Fish at Daughter in the Necralisk; all fish sizes provide 3 Waxen Sebum Deposit.", url: "https://wiki.warframe.com/w/Waxen_Sebum_Deposit" },
  "Benign Infested Tumor": { section: "Acquisition", text: "Acquired by taking Deimos fish to Daughter in the Necralisk to have them filleted; the number of tumors increases with the size of the fish captured.", url: "https://wiki.warframe.com/w/Benign_Infested_Tumor" },
  "Broken War Solstice Skin": { section: "Acquisition", text: "Originally available during Tennobaum; no current acquisition route is listed.", url: "https://wiki.warframe.com/w/Broken_War_Solstice_Skin" },
  "Heart-Beat Ephemera": { section: "Acquisition", text: "Obtained from defeating a Technocyte Coda when the Coda has the Ephemera; Codas have an approximately 57% chance to appear with an Ephemera.", url: "https://wiki.warframe.com/w/Heart-Beat_Ephemera" },
  "Kyzen Signa": { section: "Acquisition", text: "Acquired by breaking 7 green holograms or glass panels in Scoria's Angel within the time limit, then entering the secret room before the Ryoku boss room.", url: "https://wiki.warframe.com/w/Kyzen_Signa" },
  "Luv-Byte Ephemera": { section: "Acquisition", text: "Obtained from defeating a Technocyte Coda when the Coda has the Ephemera; Codas have an approximately 57% chance to appear with an Ephemera.", url: "https://wiki.warframe.com/w/Luv-Byte_Ephemera" },
  "Obsidian Azura Sugatra": { section: "Acquisition", text: "No longer available; originally purchasable from PlayStation's Renown Pack XIV bundle.", url: "https://wiki.warframe.com/w/Obsidian_Azura_Sugatra" },
  "Opal Marteddu Sugatra": { section: "Acquisition", text: "Acquired as a Nintendo Switch exclusive reward.", url: "https://wiki.warframe.com/w/Opal_Marteddu_Sugatra" },
  "Rhoptron Prime Syandana": { section: "Acquisition", text: "Acquired through Protea Prime Access, or from Prime Resurgence for 2 Regal Aya when in rotation.", url: "https://wiki.warframe.com/w/Rhoptron_Prime_Syandana" },
  Seonn: { section: "Acquisition", text: "Acquired via the Maw Feeding activity in Duviri Experience; feeding platforms are usually located next to small ponds.", url: "https://wiki.warframe.com/w/Seonn" },
  "Soaker Ephemera": { section: "Acquisition", text: "Purchased from Nakak for 490 Nakak Pearls during the Dog Days Tactical Alert.", url: "https://wiki.warframe.com/w/Soaker_Ephemera" },
  "Syndir Ephemera": { section: "Acquisition", text: "After completing Jade Shadows: Constellations, purchased from Hunhow in Pontis Tower for 100 Emerald Talent.", url: "https://wiki.warframe.com/w/Syndir_Ephemera" },
  "Tealtrian Ephemera": { section: "Acquisition", text: "Awarded for reaching rank 28 in Nightwave Nora's Mix: Time Tempests.", url: "https://wiki.warframe.com/w/Tealtrian_Ephemera" },
  "TennoCon 2017 Syandana": { section: "Acquisition", text: "Originally obtained as a bonus code from purchasing a physical TennoCon 2017 ticket; no longer available.", url: "https://wiki.warframe.com/w/TennoCon_2017_Syandana" },
  "Unairu Badge": { section: "Acquisition", text: "Purchased from the Unairu Focus Represent shop for 1,000,000 Focus.", url: "https://wiki.warframe.com/w/Unairu_Badge" },
  "Vazarin Badge": { section: "Acquisition", text: "Purchased from the Vazarin Focus Represent shop for 1,000,000 Focus.", url: "https://wiki.warframe.com/w/Vazarin_Badge" },
  "Vessel Capillaries": { section: "Acquisition", text: "Dropped by Demolisher Bonewidow and Demolisher Voidrig after activating a Conduit in Disruption, specifically in Armatus, Deimos.", url: "https://wiki.warframe.com/w/Vessel_Capillaries" },
  "Wisp Prime Theme": { section: "Acquisition", text: "The Somachord version can be purchased from Varzia for 5 Aya.", url: "https://wiki.warframe.com/w/Wisp_Prime_Theme" },
  "Zephyr Conquera Skin": { section: "Acquisition", text: "Awarded for reaching the QTCC 2025 community $100K donation goal; it was delivered to players' inboxes for logging in before December 31, 2025, and is no longer available through that campaign.", url: "https://wiki.warframe.com/w/Zephyr_Conquera_Skin" },
  "Biotic Filter": { section: "Acquisition", text: "Obtained by filleting Duroid and Aquapulmo from the Cambion Drift at Daughter in the Necralisk.", url: "https://wiki.warframe.com/w/Biotic_Filter" },
  "Burst Laser": { section: "Acquisition", text: "Automatically acquired upon obtaining Shade.", url: "https://wiki.warframe.com/w/Burst_Laser" },
  "Heart-Throb Ephemera": { section: "Acquisition", text: "Obtained from defeating a Technocyte Coda when the Coda has the Ephemera; Codas have an approximately 57% chance to appear with an Ephemera.", url: "https://wiki.warframe.com/w/Heart-Throb_Ephemera" },
  "K-Drive Launcher": { section: "Acquisition", text: "Received by completing the Vox Solaris quest on Fortuna, Venus.", url: "https://wiki.warframe.com/w/K-Drive_Launcher" },
  Lacerten: { section: "Acquisition", text: "Automatically acquired upon claiming a Hound configured with the Bhaira Model.", url: "https://wiki.warframe.com/w/Lacerten" },
  "Naramon Badge": { section: "Acquisition", text: "Purchased from the Naramon Focus Represent shop for 1,000,000 Focus.", url: "https://wiki.warframe.com/w/Naramon_Badge" },
  "Neurovyre Prime Syandana": { section: "Acquisition", text: "Acquired through Caliban Prime Access, or from Prime Resurgence for 2 Regal Aya when in rotation.", url: "https://wiki.warframe.com/w/Neurovyre_Prime_Syandana" },
  "Obsidian Monast Sugatra": { section: "Acquisition", text: "No longer available; originally obtainable free for PlayStation players from November 8-15, 2021 as part of the game's 7th PlayStation anniversary.", url: "https://wiki.warframe.com/w/Obsidian_Monast_Sugatra" },
  "Ringers Skin": { section: "Acquisition", text: "Previously obtainable from the in-game Market on December 16, 2015 for 1 Platinum.", url: "https://wiki.warframe.com/w/Ringers_Skin" },
  "Skana Prime": { section: "Acquisition", text: "Only available to owners of the Master or Grand Master Founders package offered from December 19, 2012 to November 1, 2013; no longer obtainable through that package.", url: "https://wiki.warframe.com/w/Skana_Prime" },
  "Synkra Syandana": { section: "Acquisition", text: "Console-exclusive for having a verified email address; also obtained from the Warframe Epic Games Store launch.", url: "https://wiki.warframe.com/w/Synkra_Syandana" },
  "TennoCon 2018 Chest Plate": { section: "Acquisition", text: "No longer obtainable; previously bundled with the TennoCon 2018 ticket or digital ticket.", url: "https://wiki.warframe.com/w/TennoCon_2018_Chest_Plate" },
  "TennoCon 2020 Syandana": { section: "Acquisition", text: "Originally obtained as a bonus code from purchasing a physical or digital TennoCon 2020 ticket; no longer available.", url: "https://wiki.warframe.com/w/TennoCon_2020_Syandana" },
  "Tubercular Gill System": { section: "Acquisition", text: "Obtained by taking Orokin and Orokin-Infested hybrid fish from the Cambion Drift to Daughter in the Necralisk to have them filleted.", url: "https://wiki.warframe.com/w/Tubercular_Gill_System" },
  "Vengeful Flame Ephemera": { section: "Acquisition", text: "Obtained from defeating a Heat Kuva Lich when the Lich has the Ephemera; Kuva Liches have a 20% chance to be generated with an Ephemera depending on the Warframe used.", url: "https://wiki.warframe.com/w/Vengeful_Flame_Ephemera" },
  "Viserakta Ephemera": { section: "Acquisition", text: "After completing Jade Shadows: Constellations, purchased from Hunhow in Pontis Tower for 100 Crimson Talent.", url: "https://wiki.warframe.com/w/Viserakta_Ephemera" },
  "Bloodfrenzy Ballistica Skin": { section: "Acquisition", text: "Purchased from Hunhow in Pontis Tower for 60 Crimson Talent after completing Jade Shadows: Constellations.", url: "https://wiki.warframe.com/w/Bloodfrenzy_Ballistica_Skin" },
  "Burst Laser Prime": { section: "Acquisition", text: "Automatically acquired upon obtaining Shade Prime.", url: "https://wiki.warframe.com/w/Burst_Laser_Prime" },
  "Kaithe Summon": { section: "Acquisition", text: "Automatically acquired upon reaching Drifter Intrinsics Riding Rank 9.", url: "https://wiki.warframe.com/w/Kaithe_Summon" },
  "Lanex Prime Syandana": { section: "Acquisition", text: "Acquired through Voruna Prime Access, or from Prime Resurgence for 2 Regal Aya when in rotation.", url: "https://wiki.warframe.com/w/Lanex_Prime_Syandana" },
  "Octavia Prime Theme": { section: "Acquisition", text: "The Somachord version can be purchased from Varzia for 5 Aya.", url: "https://wiki.warframe.com/w/Octavia_Prime_Theme" },
  "Parasitic Tethermaw": { section: "Acquisition", text: "Obtained by filleting Lobotriscids at Daughter in the Necralisk.", url: "https://wiki.warframe.com/w/Parasitic_Tethermaw" },
  "Proto Necramech Skin": { section: "Acquisition", text: "Previously awarded at Rank 23 in Nightwave: Nora's Mix Volume 8, and at Rank 30 in Nora's Mix Volume 3; both seasons have ended.", url: "https://wiki.warframe.com/w/Proto_Necramech_Skin" },
  "Sonicor Festive Skin": { section: "Acquisition", text: "Previously obtainable from the in-game Market on December 16, 2015 for 20 Platinum.", url: "https://wiki.warframe.com/w/Sonicor_Festive_Skin" },
  "Tail Feather Ephemera": { section: "Acquisition", text: "Obtained from defeating a Technocyte Coda when the Coda has the Ephemera; Codas have an approximately 57% chance to appear with an Ephemera.", url: "https://wiki.warframe.com/w/Tail_Feather_Ephemera" },
  "TennoCon 2018 Leg Plates": { section: "Acquisition", text: "No longer obtainable; previously bundled with the TennoCon 2018 ticket or digital ticket.", url: "https://wiki.warframe.com/w/TennoCon_2018_Leg_Plates" },
  "Udyat Iridos Syandana": { section: "Acquisition", text: "Purchased from Varzia for 10 Aya.", url: "https://wiki.warframe.com/w/Udyat_Iridos_Syandana" },
  "Vengeful Pull Ephemera": { section: "Acquisition", text: "Obtained from defeating a Magnetic Kuva Lich when the Lich has the Ephemera; Kuva Liches have a 20% chance to be generated with an Ephemera depending on the Warframe used.", url: "https://wiki.warframe.com/w/Vengeful_Pull_Ephemera" },
  "Bloodfrenzy Nagantaka Skin": { section: "Acquisition", text: "Purchased from Hunhow in Pontis Tower for 60 Crimson Talent after completing Jade Shadows: Constellations.", url: "https://wiki.warframe.com/w/Bloodfrenzy_Nagantaka_Skin" },
  "Burston Raya Skin": { section: "Acquisition", text: "Previously awarded at Rank 22 in Nightwave: Nora's Mix Volume 9; that season has ended.", url: "https://wiki.warframe.com/w/Burston_Raya_Skin" },
  "Chesa Kubrow": { section: "Acquisition", text: "Requires the Howl of the Kubrow quest, a Kubrow Egg from Kubrow Dens on Earth, and a built Incubator Power Core whose blueprint is obtained from the Market.", url: "https://wiki.warframe.com/w/Chesa_Kubrow" },
  "Khora Prime Theme": { section: "Acquisition", text: "The Somachord version can be purchased from Varzia for 5 Aya.", url: "https://wiki.warframe.com/w/Khora_Prime_Theme" },
  "Latron Solstice Skin": { section: "Acquisition", text: "Originally available during Tennobaum; no current acquisition route is listed.", url: "https://wiki.warframe.com/w/Latron_Solstice_Skin" },
  "Little Helper Hat": { section: "Acquisition", text: "Available from the in-game Market as a seasonal cosmetic.", url: "https://wiki.warframe.com/w/Little_Helper_Hat" },
  "Nidina Armor Solstice Chest Plate": { section: "Acquisition", text: "Not obtainable; originally awarded to all players for achieving a Tennobaum 2025 goal.", url: "https://wiki.warframe.com/w/Nidina_Armor_Solstice_Chest_Plate" },
  "Ocucor Solstice Skin": { section: "Acquisition", text: "Originally available during Tennobaum; no current acquisition route is listed.", url: "https://wiki.warframe.com/w/Ocucor_Solstice_Skin" },
  "Protovyre Emergent Chest Armor": { section: "Acquisition", text: "Obtained by killing 95 Sentient enemies while the Protovyre Shoulder Armor, Chest Armor, and Leg Plate Armor are equipped.", url: "https://wiki.warframe.com/w/Protovyre_Emergent_Chest_Armor" },
  "Soul-Eye Ephemera": { section: "Acquisition", text: "Obtained from defeating a Technocyte Coda when the Coda has the Ephemera; Codas have an approximately 57% chance to appear with an Ephemera.", url: "https://wiki.warframe.com/w/Soul-Eye_Ephemera" },
  "TennoCon 2018 Shoulder Plates": { section: "Acquisition", text: "No longer obtainable; previously bundled with the TennoCon 2018 ticket or digital ticket.", url: "https://wiki.warframe.com/w/TennoCon_2018_Shoulder_Plates" },
  "Vengeful Shockwave Ephemera": { section: "Acquisition", text: "Obtained from defeating an Impact Kuva Lich when the Lich has the Ephemera; Kuva Liches have a 20% chance to be generated with an Ephemera depending on the Warframe used.", url: "https://wiki.warframe.com/w/Vengeful_Shockwave_Ephemera" },
  Verglas: { section: "Acquisition", text: "Automatically acquired upon obtaining Nautilus.", url: "https://wiki.warframe.com/w/Verglas" },
  "Boolean Sugatra": { section: "Acquisition", text: "Previously awarded at Nightwave Series 3 Rank 5 and Nora's Mix Volume 6 Rank 8.", url: "https://wiki.warframe.com/w/Boolean_Sugatra" },
  "Chromatic Atramentum": { section: "Acquisition", text: "Purchased from Aspirant Zorba for 360 Atramentum during Operation: Atramentum.", url: "https://wiki.warframe.com/w/Chromatic_Atramentum" },
  "Conquera Ephemera": { section: "Acquisition", text: "Awarded as a Conquera 2022 donation-goal reward; it returns as a free reward during Conquera events.", url: "https://wiki.warframe.com/w/Conquera_Ephemera" },
  "Medjay Predasite": { section: "Acquisition", text: "Obtained through Revivification with Son in the Necralisk after capturing a Weakened Medjay Predasite during the Vome cycle; Mutagen and Antigen components are purchased from Son with Entrati Standing.", url: "https://wiki.warframe.com/w/Medjay_Predasite" },
  "Nidina Armor Solstice Shoulder Plate": { section: "Acquisition", text: "Not obtainable; originally awarded to all players for achieving a Tennobaum 2025 goal.", url: "https://wiki.warframe.com/w/Nidina_Armor_Solstice_Shoulder_Plate" },
  "Okina Day of the Dead Skin": { section: "Acquisition", text: "Previously awarded at Rank 13 in Nora's Mix: Dreams of the Dead; that season has ended.", url: "https://wiki.warframe.com/w/Okina_Day_of_the_Dead_Skin" },
  "Radiant Eidolon Shard": { section: "Acquisition", text: "Dropped by captured Eidolon Gantulysts (one) and Eidolon Hydrolysts (two) when charged Eidolon Lures are used at the final stage of the fight.", url: "https://wiki.warframe.com/w/Radiant_Eidolon_Shard" },
  "Sly Vulpaphyla": { section: "Acquisition", text: "Obtained through Revivification with Son in the Necralisk after capturing a Weakened Sly Vulpaphyla; Mutagen and Antigen components are purchased from Son with Entrati Standing.", url: "https://wiki.warframe.com/w/Sly_Vulpaphyla" },
  "Vengeful Toxin Ephemera": { section: "Acquisition", text: "Obtained from defeating a Toxin Kuva Lich when the Lich has the Ephemera; Kuva Liches have a 20% chance to be generated with an Ephemera depending on the Warframe used.", url: "https://wiki.warframe.com/w/Vengeful_Toxin_Ephemera" },
  "Vitam Prime Syandana": { section: "Acquisition", text: "Acquired through Lavos Prime Access, or from Prime Resurgence for 2 Regal Aya when in rotation.", url: "https://wiki.warframe.com/w/Vitam_Prime_Syandana" },
  "Conquera II Ephemera": { section: "Acquisition", text: "Awarded as a Conquera 2021 donation-goal reward; it returns as a free reward during Conquera events.", url: "https://wiki.warframe.com/w/Conquera_II_Ephemera" },
  "Deth Machine Rifle Prime": { section: "Acquisition", text: "Automatically acquired upon obtaining Dethcube Prime.", url: "https://wiki.warframe.com/w/Deth_Machine_Rifle_Prime" },
  "Excalibur Dex Skin": { section: "Acquisition", text: "Previously available through login rewards and Anniversary alerts during the listed anniversary periods; those periods have ended.", url: "https://wiki.warframe.com/w/Excalibur_Dex_Skin" },
  "Lodestar Syandana": { section: "Acquisition", text: "Awarded from Daily Tribute at login day 800.", url: "https://wiki.warframe.com/w/Lodestar_Syandana" },
  "Raksa Kubrow": { section: "Acquisition", text: "Requires the Howl of the Kubrow quest, a Kubrow Egg from Kubrow Dens on Earth, and a built Incubator Power Core whose blueprint is obtained from the Market.", url: "https://wiki.warframe.com/w/Raksa_Kubrow" },
  "Vengeful Trickster Ephemera": { section: "Acquisition", text: "Obtained from defeating a Radiation Kuva Lich when the Lich has the Ephemera; Kuva Liches have a 20% chance to be generated with an Ephemera depending on the Warframe used.", url: "https://wiki.warframe.com/w/Vengeful_Trickster_Ephemera" },
  "Vizier Predasite": { section: "Acquisition", text: "Obtained through Revivification with Son in the Necralisk after capturing a Weakened Vizier Predasite; Mutagen and Antigen components are purchased from Son with Entrati Standing.", url: "https://wiki.warframe.com/w/Vizier_Predasite" },
  "Conquera Leg Ribbon": { section: "Acquisition", text: "Obtainable as an annual Conquera fundraiser reward for 1 donation each time Warframe starts a charity fund for the Princess Margaret Cancer Foundation.", url: "https://wiki.warframe.com/w/Conquera_Leg_Ribbon" },
  "Dex Dakra": { section: "Acquisition", text: "Available through yearly Warframe anniversary Alerts in March; the weapon is awarded with a free weapon slot and pre-installed Orokin Catalyst.", url: "https://wiki.warframe.com/w/Dex_Dakra" },
  "Excalibur Onyx Skin": { section: "Acquisition", text: "Previously available through the Steam store when purchasing an eligible Pinnacle Pack.", url: "https://wiki.warframe.com/w/Excalibur_Onyx_Skin" },
  "Loki Verv Helmet": { section: "Acquisition", text: "Previously obtainable through Prime Gaming.", url: "https://wiki.warframe.com/w/Loki_Verv_Helmet" },
  "Necramech Summon": { section: "Acquisition", text: "Automatically acquired after building the first Necramech; it can be equipped in the Gear wheel after completing The War Within.", url: "https://wiki.warframe.com/w/Necramech_Summon" },
  "Shedu Day of the Dead Skin": { section: "Acquisition", text: "Previously awarded at Rank 4 in Nora's Mix: Dreams of the Dead; that season has ended.", url: "https://wiki.warframe.com/w/Shedu_Day_of_the_Dead_Skin" },
  "Conquera Ribbon": { section: "Acquisition", text: "Obtainable as an annual Conquera fundraiser reward for 1 donation each time Warframe starts a charity fund for the Princess Margaret Cancer Foundation.", url: "https://wiki.warframe.com/w/Conquera_Ribbon" },
  "Cranial Foremount": { section: "Acquisition", text: "Obtained by filleting Myxostomata at Daughter in the Necralisk.", url: "https://wiki.warframe.com/w/Cranial_Foremount" },
  "Dex Furis": { section: "Acquisition", text: "Available through yearly Warframe anniversary Alerts in March; the weapon is awarded with a free weapon slot and pre-installed Orokin Catalyst.", url: "https://wiki.warframe.com/w/Dex_Furis" },
  "Emissary Emblem": { section: "Acquisition", text: "Awarded by Nora Night upon attaining Rank 9 in Nightwave Series 2.", url: "https://wiki.warframe.com/w/Emissary_Emblem" },
  Hound: { section: "Acquisition", text: "Vanquishing a Sister of Parvos rewards the player's Hound as a Companion.", url: "https://wiki.warframe.com/w/Hound" },
  "Ki'Teer Fireworks": { section: "Acquisition", text: "Purchased from Baro Ki'Teer as a set of 10 charges for 100,000 Credits and 50 Ducats.", url: "https://wiki.warframe.com/w/Ki%27Teer_Fireworks" },
  "Lazulite Toroid": { section: "Acquisition", text: "Dropped by the Exploiter Orb during the Deck 12 portion of Operation: Buried Debts; redeeming it awards 12,000 standing with Vox Solaris.", url: "https://wiki.warframe.com/w/Lazulite_Toroid" },
  "Protea Prime Chronorum Helmet": { section: "Acquisition", text: "Acquired by purchasing Protea Prime Access.", url: "https://wiki.warframe.com/w/Protea_Prime_Chronorum_Helmet" },
  "Saturn Six Emblem": { section: "Acquisition", text: "Awarded by Nora Night upon attaining Rank 9 in Nightwave Series 1.", url: "https://wiki.warframe.com/w/Saturn_Six_Emblem" },
  "Sevati Sekhara": { section: "Acquisition", text: "Awarded by the Lotus via mail after completing The Law of Retribution for the first time.", url: "https://wiki.warframe.com/w/Sevati_Sekhara" },
  "Sling Stone Emblem": { section: "Acquisition", text: "Awarded to players who participated in the Sling-Stone Event and obtained at least one point before the event ended.", url: "https://wiki.warframe.com/w/Sling_Stone_Emblem" },
  "Zealot Derelict Code": { section: "Acquisition", text: "Obtained by completing three Infestation Outbreak missions during Nightwave Series 2; only one code can be obtained per Infested Outbreak across a planet until it is resolved.", url: "https://wiki.warframe.com/w/Zealot_Derelict_Code" },
  "Conquera Shoulder Ribbon": { section: "Acquisition", text: "Obtainable as an annual Conquera fundraiser reward for 1 donation each time Warframe starts a charity fund for the Princess Margaret Cancer Foundation.", url: "https://wiki.warframe.com/w/Conquera_Shoulder_Ribbon" },
  "Crescent Vulpaphyla": { section: "Acquisition", text: "Obtained through Revivification with Son in the Necralisk after capturing a Weakened Crescent Vulpaphyla during the Vome cycle; Mutagen and Antigen components are purchased from Son with Entrati Standing.", url: "https://wiki.warframe.com/w/Crescent_Vulpaphyla" },
  "Dex Laurus Ephemera": { section: "Acquisition", text: "Available through the annual Warframe Anniversary event.", url: "https://wiki.warframe.com/w/Dex_Laurus_Ephemera" },
  "Enigma Sense": { section: "Acquisition", text: "Purchased from Acrithis for 10 Pathos Clamps and 5 Enigma Gyrum.", url: "https://wiki.warframe.com/w/Enigma_Sense" },
  "Huras Kubrow": { section: "Acquisition", text: "Requires the Howl of the Kubrow quest, a Kubrow Egg from Kubrow Dens on Earth, and a built Incubator Power Core whose blueprint is obtained from the Market.", url: "https://wiki.warframe.com/w/Huras_Kubrow" },
  "Ivara Obsidian Skin": { section: "Acquisition", text: "Previously available through the PlayStation Store via Renown Pack XI and the Ultimate Obsidian Collection.", url: "https://wiki.warframe.com/w/Ivara_Obsidian_Skin" },
  "Ki'Teer Nobilis Signa": { section: "Acquisition", text: "Obtained from Baro Ki'Teer's Void Surplus at a 5% drop rate plus 4% per opened Void Surplus, awarded alongside other items.", url: "https://wiki.warframe.com/w/Ki%27Teer_Nobilis_Signa" },
  Liset: { section: "Acquisition", text: "Acquired during the Awakening introduction quest as the first Landing Craft, along with its ship segments.", url: "https://wiki.warframe.com/w/Liset" },
  "Magnus Tekelu Skin": { section: "Acquisition", text: "Permanently available from the in-game Market for 20 Platinum, separately or as part of The Tekelu Collection III bundle for 80 Platinum.", url: "https://wiki.warframe.com/w/Magnus_Tekelu_Skin" },
  "Protovyre Apex Chest Armor": { section: "Acquisition", text: "Obtained by killing 375 Sentient enemies while the Protovyre Emergent Shoulder, Chest, and Leg Plate Armor are equipped.", url: "https://wiki.warframe.com/w/Protovyre_Apex_Chest_Armor" },
  "Redeemer Abysso Skin": { section: "Acquisition", text: "Earned by completing the first mission of the Dog Days Tactical Alert.", url: "https://wiki.warframe.com/w/Redeemer_Abysso_Skin" },
  "Smeeta Kavat": { section: "Acquisition", text: "Requires the Howl of the Kubrow quest, a Kavat Incubator Upgrade Segment, 10 Kavat Genetic Codes from scanning Feral Kavats, and a built Incubator Power Core; the segment blueprint comes from Clan Dojo research, Hyekka Masters, or the Market.", url: "https://wiki.warframe.com/w/Smeeta_Kavat" },
  "Verglas Prime": { section: "Acquisition", text: "Automatically acquired upon obtaining Nautilus Prime.", url: "https://wiki.warframe.com/w/Verglas_Prime" },
  "Conquera Syandana": { section: "Acquisition", text: "Obtained during a Conquera event.", url: "https://wiki.warframe.com/w/Conquera_Syandana" },
  "Dex Nikana": { section: "Acquisition", text: "Available through yearly Warframe anniversary Alerts in March; the weapon is awarded with a free weapon slot and pre-installed Orokin Catalyst.", url: "https://wiki.warframe.com/w/Dex_Nikana" },
  "Hildryn Prime Theme": { section: "Acquisition", text: "The Somachord version can be purchased from Varzia for 5 Aya.", url: "https://wiki.warframe.com/w/Hildryn_Prime_Theme" },
  "Hydroid Prime Theme": { section: "Acquisition", text: "The Somachord version can be purchased from Varzia for 5 Aya.", url: "https://wiki.warframe.com/w/Hydroid_Prime_Theme" },
  "Izvara Solstice Syandana": { section: "Acquisition", text: "Obtained as the Tennobaum 2017 Ultimate Goal Reward; no current acquisition route is listed.", url: "https://wiki.warframe.com/w/Izvara_Solstice_Syandana" },
  "Protovyre Apex Ephemera": { section: "Acquisition", text: "Obtained by earning 500,000 Focus from Focus Lenses while the Protovyre Emergent Ephemera is equipped; Focus conversion from Eidolon Shards does not count.", url: "https://wiki.warframe.com/w/Protovyre_Apex_Ephemera" },
  "Rell's Donda": { section: "Acquisition", text: "Purchased from Palladino in Iron Wake for 25 Platinum after completing the Chains of Harrow quest.", url: "https://wiki.warframe.com/w/Rell%27s_Donda" },
  "Spinal Core Section": { section: "Acquisition", text: "Obtained by filleting Chondricord and Vitreospina from the Cambion Drift at Daughter in the Necralisk.", url: "https://wiki.warframe.com/w/Spinal_Core_Section" },
  "Thermian RPG": { section: "Acquisition", text: "Appears in H\xF6llvania missions and can be acquired during the Convoy Chase section of The Hex quest, from parachuting Scaldra or Eximus, from the H-09 Efervon Tank Assassination, or as specified by related activities and abilities.", url: "https://wiki.warframe.com/w/Thermian_RPG" },
  "Void Relic": { section: "Acquisition", text: "Received as mission rewards, primarily from endless missions; some non-endless missions such as Spy can also reward Void Relics upon completion.", url: "https://wiki.warframe.com/w/Void_Relic" },
  Vulklok: { section: "Acquisition", text: "Automatically acquired upon obtaining Diriga.", url: "https://wiki.warframe.com/w/Vulklok" },
  "Zenurik Badge": { section: "Acquisition", text: "Purchased from the Zenurik Focus Represent shop for 1,000,000 Focus.", url: "https://wiki.warframe.com/w/Zenurik_Badge" },
  "Corpus Cipher": { section: "Acquisition", text: "Previously awarded from special alerts during Operation: Arid Fear; it was one of the components required to create a Corpus Void Key.", url: "https://wiki.warframe.com/w/Corpus_Cipher" },
  "Dex Nouchali Syandana": { section: "Acquisition", text: "Obtained during Warframe Anniversary events.", url: "https://wiki.warframe.com/w/Dex_Nouchali_Syandana" },
  "Grakata Towsun Skin": { section: "Acquisition", text: "Automatically obtained with Twin Grakatas Towsun Skin, purchased from Baro Ki'Teer for 300,000 Credits and 300 Ducats when in stock.", url: "https://wiki.warframe.com/w/Grakata_Towsun_Skin" },
  "Hypatia Ephemera": { section: "Acquisition", text: "Obtained from defeating a Radiation Sister of Parvos when she has the Ephemera; Sisters have a 20% chance to appear with an Ephemera depending on the Warframe used.", url: "https://wiki.warframe.com/w/Hypatia_Ephemera" },
  "Jade Follox Sugatra": { section: "Acquisition", text: "No longer available; originally obtainable for Xbox players from September 17 to October 9, 2020 as part of the game's 6th Xbox anniversary.", url: "https://wiki.warframe.com/w/Jade_Follox_Sugatra" },
  "Protovyre Apex Leg Plate Armor": { section: "Acquisition", text: "Obtained by killing 375 Sentient enemies while the Protovyre Emergent Shoulder, Chest, and Leg Plate Armor are equipped.", url: "https://wiki.warframe.com/w/Protovyre_Apex_Leg_Plate_Armor" },
  "Protovyre Emergent Leg Plate Armor": { section: "Acquisition", text: "Obtained by killing 95 Sentient enemies while the Protovyre Shoulder, Chest, and Leg Plate Armor are equipped.", url: "https://wiki.warframe.com/w/Protovyre_Emergent_Leg_Plate_Armor" },
  "Spring Step Ephemera": { section: "Acquisition", text: "Previously obtained from the in-game Market for 5,000 Credits during the listed Spring Step availability periods.", url: "https://wiki.warframe.com/w/Spring_Step_Ephemera" },
  "Stratos Emblem": { section: "Acquisition", text: "Awarded for completing a Stratos Challenge during a Tactical Alert; it can be acquired once per Tactical Alert.", url: "https://wiki.warframe.com/w/Stratos_Emblem" },
  "Jordas Sekhara": { section: "Acquisition", text: "Awarded by the Lotus via mail after completing The Jordas Verdict trial for the first time.", url: "https://wiki.warframe.com/w/Jordas_Sekhara" },
  "Kyruna Ephemera": { section: "Acquisition", text: "Obtained from defeating an Impact Sister of Parvos when she has the Ephemera; Sisters have a 20% chance to appear with an Ephemera depending on the Warframe used.", url: "https://wiki.warframe.com/w/Kyruna_Ephemera" },
  "Nidina Armor Solstice Leg Plate": { section: "Acquisition", text: "Not obtainable; originally awarded to all players for achieving a Tennobaum 2025 goal.", url: "https://wiki.warframe.com/w/Nidina_Armor_Solstice_Leg_Plate" },
  "Protovyre Apex Shoulder Armor": { section: "Acquisition", text: "Obtained by killing 375 Sentient enemies while the Protovyre Emergent Shoulder, Chest, and Leg Plate Armor are equipped.", url: "https://wiki.warframe.com/w/Protovyre_Apex_Shoulder_Armor" },
  "Lacera Scorn Skin": { section: "Acquisition", text: "Previously obtained from Operation: Shadow Debt after completing 15 waves against the final challenger.", url: "https://wiki.warframe.com/w/Lacera_Scorn_Skin" },
  "Protovyre Apex Syandana": { section: "Acquisition", text: "Obtained by collecting 75 Void Relics and Aya from missions while the Protovyre Emergent Syandana is equipped; purchasing Relic Packs does not count.", url: "https://wiki.warframe.com/w/Protovyre_Apex_Syandana" },
  "Adarza Kavat": { section: "Acquisition", text: "Requires the Howl of the Kubrow quest, the Kavat Incubator Upgrade Segment, 10 Kavat Genetic Codes from scanning Feral Kavats, and a built Incubator Power Core. A Random Incubation can produce an Adarza Kavat; two Genetic Code Templates can be used for a chance to pass on genetic traits.", url: "https://wiki.warframe.com/w/Adarza_Kavat" },
  "Sahasa Kubrow": { section: "Acquisition", text: "Requires the Howl of the Kubrow quest, a Kubrow Egg from Kubrow Dens on Earth, and a built Incubator Power Core. A Random Incubation can produce a Sahasa Kubrow; two Genetic Code Templates can be used for a chance to pass on genetic traits.", url: "https://wiki.warframe.com/w/Sahasa_Kubrow" },
  "Archgun Deployer": { section: "Acquisition", text: "Obtained through the player's Inbox after completing the third phase of the Profit-Taker Orb Heist.", url: "https://wiki.warframe.com/w/Archgun_Deployer" },
  "Arca Titron Raya Skin": { section: "Acquisition", text: "Obtained by reaching Rank 4 in Nightwave: Nora's Mix Volume 9, available from May 21, 2025 to October 27, 2025.", url: "https://wiki.warframe.com/w/Arca_Titron_Raya_Skin" },
  "Artifex Prime Syandana": { section: "Acquisition", text: "Acquired through Xaku Prime Access or from Prime Resurgence for 2 Regal Aya when in rotation.", url: "https://wiki.warframe.com/w/Artifex_Prime_Syandana" },
  "Aseron Sekhara": { section: "Acquisition", text: "Awarded by the Lotus via Inbox after completing Nightmare The Law of Retribution for the first time.", url: "https://wiki.warframe.com/w/Aseron_Sekhara" },
  "Aspirant Syandana": { section: "Acquisition", text: "Obtained during the limited-time Operation: Atramentum event for 60 Nightmare Tatters.", url: "https://wiki.warframe.com/w/Aspirant_Syandana" },
  "Glaive Daybreak Skin": { section: "Acquisition", text: "Obtained by reaching Rank 2 in Nightwave: Nora's Mix Volume 6, available from May 15, 2024 to September 3, 2024.", url: "https://wiki.warframe.com/w/Glaive_Daybreak_Skin" },
  "Verv Ephemera": { section: "Acquisition", text: "Available from Varzia's Prime Resurgence Market for 1 Regal Aya.", url: "https://wiki.warframe.com/w/Verv_Ephemera" },
  "Cychel Glaive Skin": { section: "Acquisition", text: "Available during Tennobaum; players who logged in during the event received it via Inbox.", url: "https://wiki.warframe.com/w/Cychel_Glaive_Skin" },
  "Dex Signa": { section: "Acquisition", text: "Awarded for the 13th Anniversary: log in between March 13, 2026 at 11:00 AM ET and December 31, 2026 at 11:59 PM ET.", url: "https://wiki.warframe.com/w/Dex_Signa" },
  "Dex Sybaris": { section: "Acquisition", text: "Obtainable through yearly Warframe anniversaries in March via Alerts; it includes a free weapon slot and a pre-installed Orokin Catalyst.", url: "https://wiki.warframe.com/w/Dex_Sybaris" },
  "Diraeus Signa": { section: "Acquisition", text: "Obtained by reaching Rank 22 in Nightwave: Nora's Mix: Time Tempests.", url: "https://wiki.warframe.com/w/Diraeus_Signa" },
  "Diwata Mot Skin": { section: "Acquisition", text: "Available in the Market as part of the Titania Empress Skin for 165 Platinum or the Titania Empress Collection for 275 Platinum.", url: "https://wiki.warframe.com/w/Diwata_Mot_Skin" },
  "Excalibur Umbra Sunder Helmet": { section: "Acquisition", text: "Received in the Inbox after completing The Sacrifice quest.", url: "https://wiki.warframe.com/w/Excalibur_Umbra_Sunder_Helmet" },
  "Excalibur Umbra Therion Helmet": { section: "Acquisition", text: "Given as compensation to players who purchased the China Founders Pack before The Sacrifice update in Warframe China; not available elsewhere.", url: "https://wiki.warframe.com/w/Excalibur_Umbra_Therion_Helmet" },
  "Gradivus: Loyalty Emblem": { section: "Acquisition", text: "Awarded during The Gradivus Dilemma to players who fought at least five missions for the Grineer and won more battles for the Grineer than the Corpus.", url: "https://wiki.warframe.com/w/Gradivus:_Loyalty_Emblem" },
  "Gradivus: Sacrifice Emblem": { section: "Acquisition", text: "Awarded during The Gradivus Dilemma to players who fought at least five missions for the Corpus and won more battles for the Corpus than the Grineer.", url: "https://wiki.warframe.com/w/Gradivus:_Sacrifice_Emblem" },
  "Harmony Ribbon": { section: "Acquisition", text: "Purchasable from the in-game Market for 1 Credit.", url: "https://wiki.warframe.com/w/Harmony_Ribbon" },
  "Invati Sekhara": { section: "Acquisition", text: "Awarded by Ordis in recognition of the Trials missions; Trials are currently unavailable.", url: "https://wiki.warframe.com/w/Invati_Sekhara" },
  "Nightwave Emblem": { section: "Acquisition", text: "Awarded by Nora Night at Rank 21 in Nightwave Series 1 or Rank 4 in Intermission III.", url: "https://wiki.warframe.com/w/Nightwave_Emblem" },
  "Pistol Ammo Box": { section: "Acquisition", text: "Previously available as a Login Reward; it is no longer obtainable through the Market.", url: "https://wiki.warframe.com/w/Pistol_Ammo_Box" },
  "Protovyre Emergent Shoulder Armor": { section: "Acquisition", text: "Kill 95 Sentient enemies with the Protovyre Shoulder Armor, Chest Armor, and Leg Plate Armor equipped.", url: "https://wiki.warframe.com/w/Protovyre_Emergent_Shoulder_Armor" },
  "Protovyre Emergent Syandana": { section: "Acquisition", text: "Collect 15 Void Relics and Aya from missions while the Protovyre Syandana is equipped; purchasing Relic Packs does not count.", url: "https://wiki.warframe.com/w/Protovyre_Emergent_Syandana" },
  "Rifle Ammo Box": { section: "Acquisition", text: "Previously available as a Login Reward; it is no longer obtainable through the Market. It can very rarely be dropped by the Fossa boss.", url: "https://wiki.warframe.com/w/Rifle_Ammo_Box" },
  "Recaster Neural Relay": { section: "Acquisition", text: "Acquired by dismantling Recasters caught through Fishing at The Business in Fortuna.", url: "https://wiki.warframe.com/w/Recaster_Neural_Relay" },
  "Redeemer Pyrus Skin": { section: "Acquisition", text: "Earned by redeeming Nakak Pearls at Nakak on Cetus during the Dog Days Tactical Alert.", url: "https://wiki.warframe.com/w/Redeemer_Pyrus_Skin" },
  "Shotgun Ammo Box": { section: "Acquisition", text: "Previously available as a Login Reward; it is no longer obtainable through the Market.", url: "https://wiki.warframe.com/w/Shotgun_Ammo_Box" },
  "Sniper Ammo Box": { section: "Acquisition", text: "Previously available as a Login Reward; it is no longer obtainable through the Market.", url: "https://wiki.warframe.com/w/Sniper_Ammo_Box" },
  "Solena Ephemera": { section: "Acquisition", text: "Obtained from defeating a Magnetic Sister of Parvos when she has the Ephemera; Sisters have a 20% chance to appear with an Ephemera depending on the Warframe used.", url: "https://wiki.warframe.com/w/Solena_Ephemera" },
  "Solstice Centuria Syandana": { section: "Acquisition", text: "Obtained from a Gift from the Lotus Alert, last seen on December 20, 2019.", url: "https://wiki.warframe.com/w/Solstice_Centuria_Syandana" },
  "Sporulate Sac": { section: "Acquisition", text: "Obtained by filleting Glutinox from the Cambion Drift at Daughter in the Necralisk; each Glutinox gives 1 Sporulate Sac.", url: "https://wiki.warframe.com/w/Sporulate_Sac" },
  "Stezia Sumbha Syandana": { section: "Acquisition", text: "Purchase from Varzia for 10 Aya.", url: "https://wiki.warframe.com/w/Stezia_Sumbha_Syandana" },
  "Dex Pixia Hawkmoth Skin": { section: "Acquisition", text: "Available in the Market as part of the Titania Empress Skin for 165 Platinum or the Titania Empress Collection for 275 Platinum.", url: "https://wiki.warframe.com/w/Dex_Pixia_Hawkmoth_Skin" },
  "Epitaph Raya Skin": { section: "Acquisition", text: "Obtained by reaching Rank 17 in Nightwave: Nora's Mix Volume 9, available from May 21, 2025 to October 27, 2025.", url: "https://wiki.warframe.com/w/Epitaph_Raya_Skin" },
  "Loiaus Chest Medallion": { section: "Acquisition", text: "Obtainable from the Operations listed on the Warframe Wiki page.", url: "https://wiki.warframe.com/w/Loiaus_Chest_Medallion" },
  "Protovyre Emergent Ephemera": { section: "Acquisition", text: "Earn 250,000 Focus from Focus Lenses with the Protovyre Ephemera equipped; Focus conversion from Eidolon Shards does not count.", url: "https://wiki.warframe.com/w/Protovyre_Emergent_Ephemera" },
  "Verv Atelia Syandana": { section: "Acquisition", text: "Purchase from Varzia for 10 Aya.", url: "https://wiki.warframe.com/w/Verv_Atelia_Syandana" },
  "War Prime": { section: "Acquisition", text: "Acquired upon crafting Hunhow's Trinket, purchased from Hunhow in Pontis Tower after Jade Shadows: Constellations with 12 Emerald Talent and 12 Crimson Talent awarded from Uranus Proxima. It includes a Weapon Slot and a pre-installed Orokin Catalyst.", url: "https://wiki.warframe.com/w/War_Prime" },
  'Gauss Prime Theme\n"Redline"': {
    section: "Acquisition",
    text: "Its Somachord can be purchased from Varzia for 5 Aya.",
    url: "https://wiki.warframe.com/w/Gauss_Prime_Theme_%22Redline%22",
    source: "Warframe Wiki"
  },
  "Alpine Monitor Sawgaw Tag": {
    section: "Acquisition",
    text: "Obtained by capturing an Alpine Monitor Sawgaw through Conservation in the Orb Vallis. Conservation captures award the species-specific tag; the Alpine Monitor Sawgaw is the uncommon Sawgaw subspecies.",
    url: "https://wiki.warframe.com/w/Sawgaw"
  },
  "AMETHYST NEXIFERA TAG": {
    section: "Acquisition",
    text: "Obtained by capturing an Amethyst Nexifera through Conservation in the Cambion Drift. Conservation captures award the species-specific tag; Amethyst Nexifera is the common Nexifera subspecies.",
    url: "https://wiki.warframe.com/w/Nexifera"
  },
  "Ashen Kuaka Tag": {
    section: "Acquisition",
    text: "Obtained by capturing an Ashen Kuaka through Conservation on the Plains of Eidolon. Conservation captures award the species-specific tag; Ashen Kuaka is the uncommon Kuaka subspecies.",
    url: "https://wiki.warframe.com/w/Kuaka"
  },
  "Flossy Sawgaw Tag": {
    section: "Acquisition",
    text: "Obtained by capturing a Flossy Sawgaw through Conservation in the Orb Vallis. Conservation captures award the species-specific tag; the Flossy Sawgaw is the common Sawgaw subspecies.",
    url: "https://wiki.warframe.com/w/Sawgaw"
  },
  "Bau Vasca Kavat Tag": { section: "Acquisition", text: "Obtained by capturing a Bau Vasca Kavat through Conservation on the Plains of Eidolon. Conservation captures award the species-specific tag; Bau Vasca Kavat is an uncommon Vasca Kavat subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Brindle Kubrodon Tag": { section: "Acquisition", text: "Obtained by capturing a Brindle Kubrodon through Conservation in the Orb Vallis. Conservation captures award the species-specific tag; Brindle Kubrodon is a common Kubrodon subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Burrowing Cryptilex Tag": { section: "Acquisition", text: "Obtained by capturing a Burrowing Cryptilex through Conservation in the Cambion Drift. Conservation captures award the species-specific tag; Burrowing Cryptilex is a common Cryptilex subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Caustic Cryptilex Tag": { section: "Acquisition", text: "Obtained by capturing a Caustic Cryptilex through Conservation in the Cambion Drift. Conservation captures award the species-specific tag; Caustic Cryptilex is a rare Cryptilex subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Coastal Mergoo Tag": { section: "Acquisition", text: "Obtained by capturing a Coastal Mergoo through Conservation on the Plains of Eidolon. Conservation captures award the species-specific tag; Coastal Mergoo is a common Mergoo subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Common Condroc Tag": { section: "Acquisition", text: "Obtained by capturing a Common Condroc through Conservation on the Plains of Eidolon. Conservation captures award the species-specific tag; Common Condroc is a common Condroc subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Crescent Vulpaphyla Tag": { section: "Acquisition", text: "Obtained by capturing a Crescent Vulpaphyla through Conservation in the Cambion Drift. Conservation captures award the species-specific tag; Crescent Vulpaphyla is an uncommon Vulpaphyla subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Dappled Horrasque Tag": { section: "Acquisition", text: "Obtained by capturing a Dappled Horrasque through Conservation in the Orb Vallis. Conservation captures award the species-specific tag; Dappled Horrasque is a common Horrasque subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Dusky-Headed Virmink Tag": { section: "Acquisition", text: "Obtained by capturing a Dusky-Headed Virmink through Conservation in the Orb Vallis. Conservation captures award the species-specific tag; Dusky-Headed Virmink is an uncommon Virmink subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Fuming Dax Stover Tag": { section: "Acquisition", text: "Obtained by capturing a Fuming Dax Stover through Conservation in the Orb Vallis. Conservation captures award the species-specific tag; Fuming Dax Stover is an uncommon Stover subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Ghost Kuaka Tag": { section: "Acquisition", text: "Obtained by capturing a Ghost Kuaka through Conservation on the Plains of Eidolon. Conservation captures award the species-specific tag; Ghost Kuaka is a rare Kuaka subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "HOWLER UNDAZOA TAG": { section: "Acquisition", text: "Obtained by capturing a Howler Undazoa through Conservation in the Cambion Drift. Conservation captures award the species-specific tag; Howler Undazoa is a rare Undazoa subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Medjay Predasite Tag": { section: "Acquisition", text: "Obtained by capturing a Medjay Predasite through Conservation in the Cambion Drift. Conservation captures award the species-specific tag; Medjay Predasite is a rare Predasite subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Nephil Vasca Kavat Tag": { section: "Acquisition", text: "Obtained by capturing a Nephil Vasca Kavat through Conservation on the Plains of Eidolon. Conservation captures award the species-specific tag; Nephil Vasca Kavat is a rare Vasca Kavat subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Ostia Vasca Kavat Tag": { section: "Acquisition", text: "Obtained by capturing an Ostia Vasca Kavat through Conservation on the Plains of Eidolon. Conservation captures award the species-specific tag; Ostia Vasca Kavat is a common Vasca Kavat subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Pharaoh Predasite Tag": { section: "Acquisition", text: "Obtained by capturing a Pharaoh Predasite through Conservation in the Cambion Drift. Conservation captures award the species-specific tag; Pharaoh Predasite is an uncommon Predasite subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Plains Kuaka Tag": { section: "Acquisition", text: "Obtained by capturing a Plains Kuaka through Conservation on the Plains of Eidolon. Conservation captures award the species-specific tag; Plains Kuaka is a common Kuaka subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Purple Velocipod Tag": { section: "Acquisition", text: "Obtained by capturing a Purple Velocipod through Conservation in the Cambion Drift. Conservation captures award the species-specific tag; Purple Velocipod is a common Velocipod subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Rogue Condroc Tag": { section: "Acquisition", text: "Obtained by capturing a Rogue Condroc through Conservation on the Plains of Eidolon. Conservation captures award the species-specific tag; Rogue Condroc is an uncommon Condroc subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Sentinel Stover Tag": { section: "Acquisition", text: "Obtained by capturing a Sentinel Stover through Conservation in the Orb Vallis. Conservation captures award the species-specific tag; Sentinel Stover is a common Stover subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Sly Vulpaphyla Tag": { section: "Acquisition", text: "Obtained by capturing a Sly Vulpaphyla through Conservation in the Cambion Drift. Conservation captures award the species-specific tag; Sly Vulpaphyla is a common Vulpaphyla subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Spotted Bolarola Tag": { section: "Acquisition", text: "Obtained by capturing a Spotted Bolarola through Conservation in the Orb Vallis. Conservation captures award the species-specific tag; Spotted Bolarola is a common Bolarola subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Subterranean Pobber Tag": { section: "Acquisition", text: "Obtained by capturing a Subterranean Pobber through Conservation in the Orb Vallis. Conservation captures award the species-specific tag; Subterranean Pobber is a rare Pobber subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Sunny Pobber Tag": { section: "Acquisition", text: "Obtained by capturing a Sunny Pobber through Conservation in the Orb Vallis. Conservation captures award the species-specific tag; Sunny Pobber is a common Pobber subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Swimmer Horrasque Tag": { section: "Acquisition", text: "Obtained by capturing a Swimmer Horrasque through Conservation in the Orb Vallis. Conservation captures award the species-specific tag; Swimmer Horrasque is an uncommon Horrasque subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "UMBER UNDAZOA TAG": { section: "Acquisition", text: "Obtained by capturing an Umber Undazoa through Conservation in the Cambion Drift. Conservation captures award the species-specific tag; Umber Undazoa is a common Undazoa subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "VAPOROUS UNDAZOA TAG": { section: "Acquisition", text: "Obtained by capturing a Vaporous Undazoa through Conservation in the Cambion Drift. Conservation captures award the species-specific tag; Vaporous Undazoa is an uncommon Undazoa subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "VIRIDIAN NEXIFERA TAG": { section: "Acquisition", text: "Obtained by capturing a Viridian Nexifera through Conservation in the Cambion Drift. Conservation captures award the species-specific tag; Viridian Nexifera is an uncommon Nexifera subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Vizier Predasite Tag": { section: "Acquisition", text: "Obtained by capturing a Vizier Predasite through Conservation in the Cambion Drift. Conservation captures award the species-specific tag; Vizier Predasite is a common Predasite subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "White Velocipod Tag": { section: "Acquisition", text: "Obtained by capturing a White Velocipod through Conservation in the Cambion Drift. Conservation captures award the species-specific tag; White Velocipod is a rare Velocipod subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "White-Breasted Virmink Tag": { section: "Acquisition", text: "Obtained by capturing a White-Breasted Virmink through Conservation in the Orb Vallis. Conservation captures award the species-specific tag; White-Breasted Virmink is a common Virmink subspecies.", url: "https://wiki.warframe.com/w/Conservation" },
  "Crewman\u2019s Boot": { section: "Acquisition", text: "A rare possible catch while fishing in the Orb Vallis. It can also be received from repeat visits to the secret rooms containing the Kyzen Signa or Karotic Signa aboard their respective capital ships.", url: "https://wiki.warframe.com/w/Crewman%27s_Boot" },
  "Nakak Pearls": { section: "Acquisition", text: "Mission reward dropped during the Dog Days event; trade Nakak Pearls with Nakak in Cetus for rewards during Dog Days.", url: "https://wiki.warframe.com/w/Nakak_Pearl" },
  "Animo Nav Beacon": { section: "Acquisition", text: "Obtained by defeating and hacking Ambulas proxies deployed by Condor Dropships in Corpus Outpost missions on Pluto.", url: "https://wiki.warframe.com/w/Ambulas" },
  "Belric Crystal Fragment": { section: "Acquisition", text: "Acquired from Mirror Defense at Tyana Pass on Mars: collecting Citrine's Remnants and completing rotations awards Belric and Rania Crystal Fragments.", url: "https://wiki.warframe.com/w/Crystal_Fragment" },
  "Rania Crystal Fragment": { section: "Acquisition", text: "Acquired from Mirror Defense at Tyana Pass on Mars: collecting Citrine's Remnants and completing rotations awards Belric and Rania Crystal Fragments.", url: "https://wiki.warframe.com/w/Crystal_Fragment" },
  "Judgement Points": { section: "Acquisition", text: "Earned by fighting in the Rathuum Arenas on Sedna: Nakki, Yam, and Vodyanoi award Judgement Points for victories.", url: "https://wiki.warframe.com/w/Kela_De_Thaym" },
  "Karak Wraith Barrel": { section: "Acquisition", text: "The Karak Wraith blueprint and parts can be obtained as Invasion rewards; its components can also be traded.", url: "https://wiki.warframe.com/w/Karak_Wraith" },
  "Strun Wraith Stock": { section: "Acquisition", text: "The Strun Wraith blueprint and parts can be obtained as Invasion rewards; its components can also be traded.", url: "https://wiki.warframe.com/w/Strun_Wraith" },
  "Twin Vipers Wraith Link": { section: "Acquisition", text: "The Twin Vipers Wraith blueprint and parts can be obtained as Invasion rewards; its components can also be traded.", url: "https://wiki.warframe.com/w/Twin_Vipers_Wraith" },
  "Nora's Mix Vol. 7 Cred": { section: "Acquisition", text: "Earned from rank rewards in Nightwave: Nora's Mix Volume 7; the mini-series also allowed additional ranks after rank 30 for more Creds.", url: "https://wiki.warframe.com/w/Nightwave/Nora%27s_Mix_Volume_7" },
  "Nora's Mix Vol. 8 Cred": { section: "Acquisition", text: "Earned from rank rewards in Nightwave: Nora's Mix Volume 8; the mini-series also allowed additional ranks after rank 30 for more Creds.", url: "https://wiki.warframe.com/w/Nightwave/Nora%27s_Mix_Volume_8" },
  "Nora's Mix:\r\nDreams of the Dead Cred": { section: "Acquisition", text: "Earned from rank rewards in Nightwave: Nora's Mix: Dreams of the Dead; the mini-series also allowed additional ranks after rank 30 for more Creds.", url: "https://wiki.warframe.com/w/Nightwave/Nora%27s_Mix:_Dreams_of_the_Dead" },
  "Nora's Mix: Time Tempests Cred": { section: "Acquisition", text: "Earned from rank rewards in Nightwave: Nora's Mix: Time Tempests; the mini-series also allowed additional ranks after rank 30 for more Creds.", url: "https://wiki.warframe.com/w/Nightwave/Nora%27s_Mix:_Time_Tempests" },
  "DAUGHTER TOKEN": { section: "Acquisition", text: "Obtainable by trading Fish Products with Daughter, finding the token in the Cambion Drift, or trading a random assortment of Cambion Drift resources with Grandmother through Mend the Family.", url: "https://wiki.warframe.com/w/Daughter_Token" },
  "FATHER TOKEN": { section: "Acquisition", text: "Obtainable by trading Cambion Drift resources with Father, finding the token in the Cambion Drift, or trading resources with Grandmother.", url: "https://wiki.warframe.com/w/Father_Token" },
  "GRANDMOTHER TOKEN": { section: "Acquisition", text: "Obtainable by trading other Entrati Family Tokens with Grandmother, finding the token in the Cambion Drift, or trading a random assortment of Cambion Drift resources with Grandmother through Mend the Family.", url: "https://wiki.warframe.com/w/Grandmother_Token" },
  "MOTHER TOKEN": { section: "Acquisition", text: "Obtainable from Mother\u2019s Cambion Drift Bounties, by finding the token in the Cambion Drift, or by trading a random assortment of Cambion Drift resources with Grandmother through Mend the Family.", url: "https://wiki.warframe.com/w/Mother_Token" },
  "SON TOKEN": { section: "Acquisition", text: "Obtainable by trading Conservation Tags with Son, finding the token in the Cambion Drift, donating a maxed or gilded Predasite or Vulpaphyla, or trading a random assortment of Cambion Drift resources with Grandmother through Mend the Family.", url: "https://wiki.warframe.com/w/Son_Token" },
  Haav: { section: "Acquisition", text: "Caught while fishing in Duviri.", url: "https://wiki.warframe.com/w/Fishing" },
  Inaak: { section: "Acquisition", text: "Caught while fishing in Duviri.", url: "https://wiki.warframe.com/w/Fishing" },
  Namaes: { section: "Acquisition", text: "Caught while fishing in Duviri.", url: "https://wiki.warframe.com/w/Fishing" },
  "Corrupted Heavy Gunner Specter": { section: "Acquisition", text: "Its blueprint was a Baro Ki'Teer exclusive, available for 100 Ducats and 40,000 Credits during the May 4\u20136, 2018 visit on PC; the bundle provided five Corrupted Heavy Gunner Specters and an Orokin Drone.", url: "https://wiki.warframe.com/w/Specter" },
  "Desert Skate Specter": { section: "Acquisition", text: "Guaranteed reward from Baro Void-Signal missions.", url: "https://wiki.warframe.com/w/Baro_Void-Signal" },
  "Aoi Accolade Glyph": { section: "Acquisition", text: "Earned by defeating the H-09 Apex Hardmode Boss alone on Steel Path while using Aoi's depicted Warframe, Mag.", url: "https://wiki.warframe.com/w/Glyph" },
  "Arthur Accolade Glyph": { section: "Acquisition", text: "Earned by defeating the H-09 Apex Hardmode Boss alone on Steel Path while using Arthur's depicted Warframe, Excalibur.", url: "https://wiki.warframe.com/w/Glyph" },
  "Albrecht's Treasures Glyph": { section: "Acquisition", text: "Previously available through the Sanctum Supporter Pack until September 9, 2024.", url: "https://wiki.warframe.com/w/Glyph" },
  "Bird 3 Sketch Glyph": { section: "Acquisition", text: "Purchase from Bird 3 during Operation: Atramentum for 15 Nightmare Tatters.", url: "https://wiki.warframe.com/w/Operation:_Atramentum" },
  "Ash Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Ash Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Ash Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Ash Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Atlas Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Atlas Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Atlas Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Atlas Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Banshee Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Banshee Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Banshee Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Banshee Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Baruuk Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Baruuk Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Baruuk Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Baruuk Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Chroma Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Chroma Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Chroma Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Chroma Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Ember Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Ember Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Ember Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Ember Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Equinox Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Equinox Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Equinox Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Equinox Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Excalibur Prime Glyph - Bright": { section: "Acquisition", text: "Obtained through the Excalibur Prime Founders package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Excalibur Prime Glyph - Dark": { section: "Acquisition", text: "Obtained through the Excalibur Prime Founders package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Frost Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Frost Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Frost Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Frost Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Gara Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Gara Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Gara Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Gara Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Garuda Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Garuda Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Garuda Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Garuda Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Gauss Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Gauss Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Gauss Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Gauss Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Grendel Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Grendel Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Grendel Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Grendel Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Harrow Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Harrow Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Harrow Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Harrow Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Hildryn Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Hildryn Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Hildryn Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Hildryn Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Hydroid Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Hydroid Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Hydroid Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Hydroid Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Inaros Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Inaros Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Inaros Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Inaros Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Ivara Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Ivara Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Ivara Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Ivara Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Khora Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Khora Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Khora Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Khora Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Lavos Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Lavos Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Lavos Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Lavos Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Limbo Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Limbo Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Limbo Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Limbo Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Mag Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Mag Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Mag Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Mag Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Mesa Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Mesa Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Mesa Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Mesa Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Mirage Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Mirage Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Mirage Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Mirage Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Nekros Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Nekros Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Nekros Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Nekros Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Nezha Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Nezha Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Nezha Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Nezha Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Nidus Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Nidus Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Nidus Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Nidus Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Nova Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Nova Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Nova Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Nova Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Nyx Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Nyx Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Nyx Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Nyx Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Oberon Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Oberon Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Oberon Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Oberon Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Octavia Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Octavia Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Octavia Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Octavia Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Protea Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Protea Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Protea Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Protea Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Revenant Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Revenant Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Revenant Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Revenant Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Rhino Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Rhino Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Rhino Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Rhino Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Saryn Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Saryn Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Saryn Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Saryn Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Sevagoth Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Sevagoth Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Sevagoth Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Sevagoth Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Titania Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Titania Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Titania Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Titania Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Trinity Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Trinity Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Trinity Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Trinity Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Valkyr Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Valkyr Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Valkyr Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Valkyr Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Vauban Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Vauban Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Vauban Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Vauban Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Volt Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Volt Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Volt Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Volt Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Wisp Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Wisp Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Wisp Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Wisp Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Wukong Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Wukong Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Wukong Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Wukong Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Xaku Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Xaku Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Xaku Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Xaku Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Zephyr Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Zephyr Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Zephyr Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Zephyr Prime Access or Prime Vault package; both light and dark versions are unlocked with the purchase.", url: "https://wiki.warframe.com/w/Glyph" },
  "Solstice Glyph I": { section: "Acquisition", text: "Previously available in the Solstice Glyph Pack from the Market for 65 Platinum during Christmas 2016.", url: "https://wiki.warframe.com/w/Glyph" },
  "Solstice Glyph Ii": { section: "Acquisition", text: "Previously available in the Solstice Glyph Pack from the Market for 65 Platinum during Christmas 2016.", url: "https://wiki.warframe.com/w/Glyph" },
  "Solstice Glyph Iii": { section: "Acquisition", text: "Previously available in the Solstice Glyph Pack from the Market for 65 Platinum during Christmas 2016.", url: "https://wiki.warframe.com/w/Glyph" },
  "Solstice Glyph Iv": { section: "Acquisition", text: "Previously available in the Solstice Glyph Pack from the Market for 65 Platinum during Christmas 2016.", url: "https://wiki.warframe.com/w/Glyph" },
  "Winter Glyph I": { section: "Acquisition", text: "Previously available in the Winter Glyph Pack from the Market for 110 Platinum during Christmas 2016.", url: "https://wiki.warframe.com/w/Glyph" },
  "Winter Glyph Ii": { section: "Acquisition", text: "Previously available in the Winter Glyph Pack from the Market for 110 Platinum during Christmas 2016.", url: "https://wiki.warframe.com/w/Glyph" },
  "Winter Glyph Iii": { section: "Acquisition", text: "Previously available in the Winter Glyph Pack from the Market for 110 Platinum during Christmas 2016.", url: "https://wiki.warframe.com/w/Glyph" },
  "Winter Glyph Iv": { section: "Acquisition", text: "Previously available in the Winter Glyph Pack from the Market for 110 Platinum during Christmas 2016.", url: "https://wiki.warframe.com/w/Glyph" },
  "Winter Glyph V": { section: "Acquisition", text: "Previously available in the Winter Glyph Pack from the Market for 110 Platinum during Christmas 2016.", url: "https://wiki.warframe.com/w/Glyph" },
  "Winter Glyph Vi": { section: "Acquisition", text: "Previously available in the Winter Glyph Pack from the Market for 110 Platinum during Christmas 2016.", url: "https://wiki.warframe.com/w/Glyph" },
  "Winter Glyph Vii": { section: "Acquisition", text: "Previously available in the Winter Glyph Pack from the Market for 110 Platinum during Christmas 2016.", url: "https://wiki.warframe.com/w/Glyph" },
  "Winter Glyph Viii": { section: "Acquisition", text: "Previously available in Winter Glyph Pack II from the Market for 100 Platinum during Christmas 2017.", url: "https://wiki.warframe.com/w/Glyph" },
  "Winter Glyph Ix": { section: "Acquisition", text: "Previously available in Winter Glyph Pack II from the Market for 100 Platinum during Christmas 2017.", url: "https://wiki.warframe.com/w/Glyph" },
  "Winter Glyph X": { section: "Acquisition", text: "Previously available in Winter Glyph Pack II from the Market for 100 Platinum during Christmas 2017.", url: "https://wiki.warframe.com/w/Glyph" },
  "Winter Glyph Xi": { section: "Acquisition", text: "Previously available in Winter Glyph Pack II from the Market for 100 Platinum during Christmas 2017.", url: "https://wiki.warframe.com/w/Glyph" },
  "Winter Glyph Xii": { section: "Acquisition", text: "Previously available in Winter Glyph Pack II from the Market for 100 Platinum during Christmas 2017.", url: "https://wiki.warframe.com/w/Glyph" },
  "Winter Glyph Xiii": { section: "Acquisition", text: "Previously available in Winter Glyph Pack II from the Market for 100 Platinum during Christmas 2017.", url: "https://wiki.warframe.com/w/Glyph" },
  "Calavera Glyph I": { section: "Acquisition", text: "Previously available in the Calavera Glyph Pack from the Market for 65 Platinum during Halloween since 2016.", url: "https://wiki.warframe.com/w/Glyph" },
  "Calavera Glyph Ii": { section: "Acquisition", text: "Previously available in the Calavera Glyph Pack from the Market for 65 Platinum during Halloween since 2016.", url: "https://wiki.warframe.com/w/Glyph" },
  "Calavera Glyph Iii": { section: "Acquisition", text: "Previously available in the Calavera Glyph Pack from the Market for 65 Platinum during Halloween since 2016.", url: "https://wiki.warframe.com/w/Glyph" },
  "Calavera Glyph Iv": { section: "Acquisition", text: "Previously available in the Calavera Glyph Pack from the Market for 65 Platinum during Halloween since 2016.", url: "https://wiki.warframe.com/w/Glyph" },
  "Dog Days Glyph": { section: "Acquisition", text: "Purchasable from the Market during Dog Days for 1 Credit.", url: "https://wiki.warframe.com/w/Glyph" },
  "Slimetime Glyph": { section: "Acquisition", text: "Previously available in the Malevolent Glyph Bundle from the Market for 65 Platinum during Halloween since 2019.", url: "https://wiki.warframe.com/w/Glyph" },
  "All Mad Here Glyph": { section: "Acquisition", text: "Previously available in the Malevolent Glyph Bundle from the Market for 65 Platinum during Halloween since 2019.", url: "https://wiki.warframe.com/w/Glyph" },
  "Boo Glyph": { section: "Acquisition", text: "Previously available in the Malevolent Glyph Bundle from the Market for 65 Platinum during Halloween since 2019.", url: "https://wiki.warframe.com/w/Glyph" },
  "Send More Dax Glyph": { section: "Acquisition", text: "Previously available in the Malevolent Glyph Bundle from the Market for 65 Platinum during Halloween since 2019.", url: "https://wiki.warframe.com/w/Glyph" },
  "Werefested Glyph": { section: "Acquisition", text: "Previously available in the Monstrous Glyph Bundle from the Market for 65 Platinum during Halloween since 2019.", url: "https://wiki.warframe.com/w/Glyph" },
  "Frankencorpus Glyph": { section: "Acquisition", text: "Previously available in the Monstrous Glyph Bundle from the Market for 65 Platinum during Halloween since 2019.", url: "https://wiki.warframe.com/w/Glyph" },
  "Creepy Clem Glyph": { section: "Acquisition", text: "Previously available in the Monstrous Glyph Bundle from the Market for 65 Platinum during Halloween since 2019.", url: "https://wiki.warframe.com/w/Glyph" },
  "Trick Or Ballas Glyph": { section: "Acquisition", text: "Previously available in the Monstrous Glyph Bundle from the Market for 65 Platinum during Halloween since 2019.", url: "https://wiki.warframe.com/w/Glyph" },
  "Lua Nights Glyph": { section: "Acquisition", text: "Purchasable from Daughter for 20 Mother Tokens during Nights of Naberus.", url: "https://wiki.warframe.com/w/Glyph" },
  "Dagath Grins Glyph": { section: "Acquisition", text: "Purchasable from Daughter for 20 Mother Tokens during Nights of Naberus.", url: "https://wiki.warframe.com/w/Glyph" },
  "Dagath Accuser Glyph": { section: "Acquisition", text: "Purchasable from Daughter for 20 Mother Tokens during Nights of Naberus.", url: "https://wiki.warframe.com/w/Glyph" },
  "Daughter Naberus Glyph": { section: "Acquisition", text: "Purchasable from Daughter for 20 Mother Tokens during Nights of Naberus.", url: "https://wiki.warframe.com/w/Glyph" },
  "Harrow Conjuring Glyph": { section: "Acquisition", text: "Purchasable from Daughter for 20 Mother Tokens during Nights of Naberus.", url: "https://wiki.warframe.com/w/Glyph" },
  "Xaku Spellcast Glyph": { section: "Acquisition", text: "Purchasable from Daughter for 20 Mother Tokens during Nights of Naberus.", url: "https://wiki.warframe.com/w/Glyph" },
  "Cookie Corpus Glyph": { section: "Acquisition", text: "Unlocked by reaching Tennobaum 2017 milestones.", url: "https://wiki.warframe.com/w/Glyph" },
  "Cookie Dethcube Glyph": { section: "Acquisition", text: "Unlocked by reaching Tennobaum 2017 milestones.", url: "https://wiki.warframe.com/w/Glyph" },
  "Cookie Grineer Glyph": { section: "Acquisition", text: "Unlocked by reaching Tennobaum 2017 milestones.", url: "https://wiki.warframe.com/w/Glyph" },
  "Cookie Lotus Glyph": { section: "Acquisition", text: "Unlocked by reaching Tennobaum 2017 milestones.", url: "https://wiki.warframe.com/w/Glyph" },
  "Cookie Void Key Glyph": { section: "Acquisition", text: "Unlocked by reaching Tennobaum 2017 milestones.", url: "https://wiki.warframe.com/w/Glyph" },
  "Cookie Excalibur Glyph": { section: "Acquisition", text: "Tennobaum 2018 milestone reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Cookie Fortuna Glyph": { section: "Acquisition", text: "Tennobaum 2018 milestone reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Cookie K-Drive Glyph": { section: "Acquisition", text: "Tennobaum 2018 milestone reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Cookie Nef Anyo Glyph": { section: "Acquisition", text: "Tennobaum 2018 milestone reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Cookie Orb Vallis Glyph": { section: "Acquisition", text: "Tennobaum 2018 milestone reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Cookie Stalker Glyph": { section: "Acquisition", text: "Tennobaum 2018 milestone reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Community Tennobaum Frost Glyph": { section: "Acquisition", text: "Tennobaum 2023 milestone reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Community Tennobaum Kubrow Glyph": { section: "Acquisition", text: "Tennobaum 2023 milestone reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Community Tennobaum Vauban Glyph": { section: "Acquisition", text: "Tennobaum 2023 milestone reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Community Tennobaum Vulpaphyla Glyph": { section: "Acquisition", text: "Tennobaum 2023 milestone reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Community Tennobaum Zephyr Glyph": { section: "Acquisition", text: "Tennobaum 2023 milestone reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Community Tennobaum 1999 Mug Glyph": { section: "Acquisition", text: "Tennobaum 2024 milestone reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Community Tennobaum Aoi Glyph": { section: "Acquisition", text: "Tennobaum 2024 milestone reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Community Tennobaum Cozy Stalker Glyph": { section: "Acquisition", text: "Tennobaum 2024 milestone reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Community Tennobaum Grimoire Glyph": { section: "Acquisition", text: "Tennobaum 2024 milestone reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Community Tennobaum Jade Glyph": { section: "Acquisition", text: "Tennobaum 2024 milestone reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Community Tennobaum Man In The Cookie Glyph": { section: "Acquisition", text: "Tennobaum 2024 milestone reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Community Tennobaum Relic Glyph": { section: "Acquisition", text: "Tennobaum 2024 milestone reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Conquera Glyph": { section: "Acquisition", text: "Redeem the CONQUER promo code; it was issued on November 2, 2020.", url: "https://wiki.warframe.com/w/Glyph" },
  "Conquera Glyph I": { section: "Acquisition", text: "Unlocked through Quest to Conquer Cancer donation goals in 2021.", url: "https://wiki.warframe.com/w/Glyph" },
  "Conquera Glyph Ii": { section: "Acquisition", text: "Unlocked through Quest to Conquer Cancer donation goals in 2021.", url: "https://wiki.warframe.com/w/Glyph" },
  "Conquera Glyph Iii": { section: "Acquisition", text: "Unlocked through Quest to Conquer Cancer donation goals in 2021.", url: "https://wiki.warframe.com/w/Glyph" },
  "Conquera Glyph Iv": { section: "Acquisition", text: "Unlocked through the Quest to Conquer Cancer / Conquera event rewards.", url: "https://wiki.warframe.com/w/Glyph" },
  "Conquera Glyph V": { section: "Acquisition", text: "Redeem the CONQUERA2022 promo code, associated with Quest to Conquer Cancer donation goals.", url: "https://wiki.warframe.com/w/Glyph" },
  "Wolf Of Saturn Six Glyph - Bright": { section: "Acquisition", text: "Reward from Nightwave: The Wolf of Saturn Six.", url: "https://wiki.warframe.com/w/Glyph" },
  "Wolf Of Saturn Six Glyph - Dark": { section: "Acquisition", text: "Reward from Nightwave: The Wolf of Saturn Six.", url: "https://wiki.warframe.com/w/Glyph" },
  "Nora Night Frequency Glyph": { section: "Acquisition", text: "Nightwave: Nora's Mix Volume 2 reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Nora Night Glyph": { section: "Acquisition", text: "Nightwave: Nora's Mix Volume 2 reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Eleanor Accolade Glyph": { section: "Acquisition", text: "Earned by defeating the H-09 Apex Hardmode Boss alone on Steel Path while using Eleanor's depicted Warframe, Nyx.", url: "https://wiki.warframe.com/w/Glyph" },
  "Lettie Accolade Glyph": { section: "Acquisition", text: "Earned by defeating the H-09 Apex Hardmode Boss alone on Steel Path while using Lettie's depicted Warframe, Trinity.", url: "https://wiki.warframe.com/w/Glyph" },
  "Quincy Accolade Glyph": { section: "Acquisition", text: "Earned by defeating the H-09 Apex Hardmode Boss alone on Steel Path while using Quincy's depicted Warframe, Cyte-09.", url: "https://wiki.warframe.com/w/Glyph" },
  "Amir Accolade Glyph": { section: "Acquisition", text: "Earned by defeating the H-09 Apex Hardmode Boss alone on Steel Path while using Amir's depicted Warframe, Volt.", url: "https://wiki.warframe.com/w/Glyph" },
  "Gauss Accolade Glyph": { section: "Acquisition", text: "Earned by defeating The Fragmented One Hardmode Boss alone on Steel Path while using Gauss.", url: "https://wiki.warframe.com/w/Glyph" },
  "Protea Accolade Glyph": { section: "Acquisition", text: "Earned by defeating The Fragmented One Hardmode Boss alone on Steel Path while using Protea.", url: "https://wiki.warframe.com/w/Glyph" },
  "Vauban Accolade Glyph": { section: "Acquisition", text: "Earned by defeating The Fragmented One Hardmode Boss alone on Steel Path while using Vauban.", url: "https://wiki.warframe.com/w/Glyph" },
  "Mirage Accolade Glyph": { section: "Acquisition", text: "Earned by defeating The Fragmented One Hardmode Boss alone on Steel Path while using Mirage.", url: "https://wiki.warframe.com/w/Glyph" },
  "Jade Accolade Glyph": { section: "Acquisition", text: "Earned by defeating The Fragmented One Hardmode Boss alone on Steel Path while using Jade.", url: "https://wiki.warframe.com/w/Glyph" },
  "Sevagoth Accolade Glyph": { section: "Acquisition", text: "Earned by defeating The Fragmented One Hardmode Boss alone on Steel Path while using Sevagoth.", url: "https://wiki.warframe.com/w/Glyph" },
  "Jillian Pixel Portrait Glyph": { section: "Acquisition", text: "Obtained by completing Stage 3 of Caliber Chicks 2.", url: "https://wiki.warframe.com/w/Glyph" },
  "Lillian Pixel Portrait Glyph": { section: "Acquisition", text: "Obtained by completing Stage 3 of Caliber Chicks 2.", url: "https://wiki.warframe.com/w/Glyph" },
  "Necraloid Tennobaum Glyph": { section: "Acquisition", text: "Sent through the Inbox after reaching the Tennobaum 2020 gift-giving goal.", url: "https://wiki.warframe.com/w/Glyph" },
  "Spectral Tide Glyph": { section: "Acquisition", text: "Awarded at the 650-day Daily Tribute milestone.", url: "https://wiki.warframe.com/w/Glyph" },
  "Guiding Rose Glyph": { section: "Acquisition", text: "Awarded at the 750-day Daily Tribute milestone.", url: "https://wiki.warframe.com/w/Glyph" },
  "Lustrous Major Glyph": { section: "Acquisition", text: "Awarded at the 950-day Daily Tribute milestone.", url: "https://wiki.warframe.com/w/Glyph" },
  "Aoi Origami Glyph": { section: "Acquisition", text: "Nightwave: Nora's Mix Volume 8 reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Contrathermal Companion Glyph": { section: "Acquisition", text: "Nightwave: Nora's Mix Volume 5 reward.", url: "https://wiki.warframe.com/w/Glyph" },
  "Caroling Octavia Glyph": { section: "Acquisition", text: "Previously available in Winter Glyph Pack IV from the Market for 90 Platinum during Christmas 2019.", url: "https://wiki.warframe.com/w/Glyph" },
  "Festive Floof Glyph": { section: "Acquisition", text: "Previously available in Winter Glyph Pack IV from the Market for 90 Platinum during Christmas 2019.", url: "https://wiki.warframe.com/w/Glyph" },
  "Father Tennobaum Glyph": { section: "Acquisition", text: "Sent through the Inbox after reaching the Tennobaum 2020 gift-giving goal.", url: "https://wiki.warframe.com/w/Glyph" },
  "Excalibur Jade Glyph": { section: "Acquisition", text: "Xbox One-exclusive glyph awarded for the Xbox One 3rd Anniversary.", url: "https://wiki.warframe.com/w/Glyph" },
  "Community Dog Days Grendel Glyph": { section: "Acquisition", text: "Purchasable from Nakak in Cetus during Dog Days for 30 Nakak Pearls.", url: "https://wiki.warframe.com/w/Glyph" },
  "Community Dog Days Lavos Glyph": { section: "Acquisition", text: "Purchasable from Nakak in Cetus during Dog Days for 30 Nakak Pearls.", url: "https://wiki.warframe.com/w/Glyph" },
  "Community Dog Days Voruna Glyph": { section: "Acquisition", text: "Purchasable from Nakak in Cetus during Dog Days for 30 Nakak Pearls.", url: "https://wiki.warframe.com/w/Glyph" },
  "Community Dog Days Yareli Glyph": { section: "Acquisition", text: "Purchasable from Nakak in Cetus during Dog Days for 30 Nakak Pearls.", url: "https://wiki.warframe.com/w/Glyph" },
  "Dog Days Kavat Glyph": { section: "Acquisition", text: "Purchasable from Nakak in Cetus during Dog Days for 30 Nakak Pearls.", url: "https://wiki.warframe.com/w/Glyph" },
  "Dog Days Kubrow Glyph": { section: "Acquisition", text: "Purchasable from Nakak in Cetus during Dog Days for 30 Nakak Pearls.", url: "https://wiki.warframe.com/w/Glyph" },
  "Ride The Wave Glyph": { section: "Acquisition", text: "Purchasable from Nakak in Cetus during Dog Days for 30 Nakak Pearls.", url: "https://wiki.warframe.com/w/Glyph" },
  "Suplex Kubrow Glyph": { section: "Acquisition", text: "Purchasable from Nakak in Cetus during Dog Days for 30 Nakak Pearls.", url: "https://wiki.warframe.com/w/Glyph" },
  "Daughter Tennobaum Glyph": { section: "Acquisition", text: "Sent through the Inbox after reaching the Tennobaum 2020 gift-giving goal.", url: "https://wiki.warframe.com/w/Glyph" },
  "Mother Tennobaum Glyph": { section: "Acquisition", text: "Sent through the Inbox after reaching the Tennobaum 2020 gift-giving goal.", url: "https://wiki.warframe.com/w/Glyph" },
  "Son Tennobaum Glyph": { section: "Acquisition", text: "Sent through the Inbox after reaching the Tennobaum 2020 gift-giving goal.", url: "https://wiki.warframe.com/w/Glyph" },
  "Grandmother Tennobaum Glyph": { section: "Acquisition", text: "Sent through the Inbox after reaching the Tennobaum 2020 gift-giving goal.", url: "https://wiki.warframe.com/w/Glyph" },
  "Kaya's Reactors": { section: "Acquisition", text: "Included with Kaya Gemini Skin. Purchase Kaya Gemini Skin individually for 275 Platinum or as part of the Encore Gemini Collection for 880 Platinum.", url: "https://wiki.warframe.com/w/Kaya_Gemini_Skin" },
  "Velimir's Coolant Tank": { section: "Acquisition", text: "Included with Velimir Gemini Skin. Purchase Velimir Gemini Skin individually for 275 Platinum or as part of the Encore Gemini Collection for 880 Platinum.", url: "https://wiki.warframe.com/w/Velimir_Gemini_Skin" },
  "Quincy's Beret": { section: "Acquisition", text: "Included with Quincy Gemini Skin. Purchase Quincy Gemini Skin individually for 275 Platinum or as part of the 1999 Gemini Pact Collection for 1,200 Platinum.", url: "https://wiki.warframe.com/w/Quincy_Gemini_Skin" },
  "Roathe's Chyrinth": { section: "Acquisition", text: "Included with Roathe Gemini Skin. Purchase Roathe Gemini Skin individually for 275 Platinum or as part of The Old Peace Gemini Collection for 660 Platinum.", url: "https://wiki.warframe.com/w/Roathe_Gemini_Skin" },
  "Coltek Sentinel Wings": { section: "Acquisition", text: "Included in the Coltek Sentinel Pack, purchasable from the Market for 45 Platinum.", url: "https://wiki.warframe.com/w/Coltek_Sentinel_Pack" },
  "Diamond Sentinel Wings": { section: "Acquisition", text: "Included in the Sentinel Accessory Pack, purchasable from the Market for 85 Platinum.", url: "https://wiki.warframe.com/w/Sentinel_Accessory_Pack" },
  "Ictus Sentinel Wings": { section: "Acquisition", text: "Included in the Ictus Sentinel Pack, purchasable from the Market for 93 Platinum.", url: "https://wiki.warframe.com/w/Ictus_Sentinel_Pack" },
  "Insign II Kalika": { section: "Acquisition", text: "Included in the Insign Bundle. Purchase the bundle from Roathe in La Cath\xE9drale for 150 Maphica, then unlock Insign II Kalika by equipping an Honoria with Insign I Sporoi equipped.", url: "https://wiki.warframe.com/w/Insign_Bundle" },
  "Grandis XX Perigone": { section: "Acquisition", text: "Included in the Insign Bundle. Purchase the bundle from Roathe in La Cath\xE9drale for 150 Maphica, then unlock Grandis XX Perigone by completing Elite Temporal Archimedea on your own with Grandis XIX Phloios equipped.", url: "https://wiki.warframe.com/w/Insign_Bundle" },
  "General Insignia": { section: "Acquisition", text: "Found as a rare Syndicate Medallion pickup in daily Syndicate Alert missions; rare medallions grant 5,000 standing. Syndicate Medallions can also be Daily Tribute rewards.", url: "https://wiki.warframe.com/w/Syndicate_Medallions" },
  "Maxim Medallion": { section: "Acquisition", text: "Found as a rare Syndicate Medallion pickup in daily Syndicate Alert missions; rare medallions grant 5,000 standing. Syndicate Medallions can also be Daily Tribute rewards.", url: "https://wiki.warframe.com/w/Syndicate_Medallions" },
  "Partner Quittance": { section: "Acquisition", text: "Found as a rare Syndicate Medallion pickup in daily Syndicate Alert missions; rare medallions grant 5,000 standing. Syndicate Medallions can also be Daily Tribute rewards.", url: "https://wiki.warframe.com/w/Syndicate_Medallions" },
  "Orokin Archive": { section: "Quest acquisition", text: "During The Archwing quest, recover the Orokin Archive from the Corpus stronghold in the Tessera, Venus Orokin Sabotage mission.", url: "https://wiki.warframe.com/w/The_Archwing" },
  "Dome Sentinel Wings": { section: "Acquisition", text: "Included in the Sentinel Accessory Pack, purchasable from the Market for 85 Platinum.", url: "https://wiki.warframe.com/w/Sentinel_Accessory_Pack" },
  "Insign III Phloios": { section: "Acquisition", text: "Included in the Insign Bundle. Purchase the bundle from Roathe in La Cath\xE9drale for 150 Maphica, then unlock Insign III Phloios by killing 150 enemies with melee weapons while Insign II Kalika is equipped.", url: "https://wiki.warframe.com/w/Insign_Bundle" },
  "Servio V Sporoi": { section: "Acquisition", text: "Included in the Insign Bundle. Purchase the bundle from Roathe in La Cath\xE9drale for 150 Maphica, then unlock Servio V Sporoi by completing The Descendia with Insign IV Perigone equipped.", url: "https://wiki.warframe.com/w/Insign_Bundle" },
  "Tenens X Kalika": { section: "Acquisition", text: "Included in the Insign Bundle. Purchase the bundle from Roathe in La Cath\xE9drale for 150 Maphica, then unlock Tenens X Kalika by defeating Janus Captain Vor with Tenens IX Sporoi equipped.", url: "https://wiki.warframe.com/w/Insign_Bundle" },
  "Flawless Seed": { section: "Acquisition", text: "Found as a rare Syndicate Medallion pickup in daily Syndicate Alert missions; rare medallions grant 5,000 standing. Syndicate Medallions can also be Daily Tribute rewards.", url: "https://wiki.warframe.com/w/Syndicate_Medallions" },
  "Insign IV Perigone": { section: "Acquisition", text: "Included in the Insign Bundle. Purchase the bundle from Roathe in La Cath\xE9drale for 150 Maphica, then unlock Insign IV Perigone by completing The Perita Rebellion with Insign III Phloios equipped.", url: "https://wiki.warframe.com/w/Insign_Bundle" },
  "Servio VIII Perigone": { section: "Acquisition", text: "Included in the Insign Bundle. Purchase the bundle from Roathe in La Cath\xE9drale for 150 Maphica, then unlock Servio VIII Perigone by sustaining a 10x melee combo for 45 seconds with Servio VII Phloios equipped.", url: "https://wiki.warframe.com/w/Insign_Bundle" },
  "Tenens IX Sporoi": { section: "Acquisition", text: "Included in the Insign Bundle. Purchase the bundle from Roathe in La Cath\xE9drale for 150 Maphica, then unlock Tenens IX Sporoi by completing 5 encounters within one Perita Rebellion battle with Servio VIII Perigone equipped.", url: "https://wiki.warframe.com/w/Insign_Bundle" },
  "Capit XIV Kalika": { section: "Acquisition", text: "Included in the Insign Bundle. Purchase the bundle from Roathe in La Cath\xE9drale for 150 Maphica, then unlock Capit XIV Kalika by completing an Arbitrations Survival mission after surviving 30 minutes with Capit XIII Sporoi equipped.", url: "https://wiki.warframe.com/w/Insign_Bundle" },
  "Chitoid Sentinel Wings": { section: "Acquisition", text: "Earned as part of the Chitoid Sentinel Bundle, a Nightwave reward. The bundle contains the Chitoid Sentinel Mask, Wings, and Tail.", url: "https://wiki.warframe.com/w/Sentinel_Cosmetics" },
  "Elfame Bow Skin": { section: "Acquisition", text: "Earned from Rank 4 of Nora's Mix: Time Tempests for 40,000 cumulative standing.", url: "https://wiki.warframe.com/w/Nightwave/Nora%27s_Mix:_Time_Tempests" },
  "Furis Verv Skin": { section: "Acquisition", text: "Available from Varzia's Evergreen Prime Items for 7 Aya.", url: "https://wiki.warframe.com/w/Varzia" },
  "Kronen Iridos Skin": { section: "Acquisition", text: "Available from Varzia's Evergreen Prime Items for 7 Aya.", url: "https://wiki.warframe.com/w/Varzia" },
  "Deimos Crypt Scene": { section: "Acquisition", text: "Dropped from Deimos Captura Containers in Isolation Vaults.", url: "https://wiki.warframe.com/w/Captura" },
  "Deimos Depths Scene": { section: "Acquisition", text: "Dropped from Deimos Captura Containers in Isolation Vaults.", url: "https://wiki.warframe.com/w/Captura" },
  "Deimos Forsaken Scene": { section: "Acquisition", text: "Dropped from Deimos Captura Containers in Isolation Vaults.", url: "https://wiki.warframe.com/w/Captura" },
  "Deimos Heart Scene": { section: "Acquisition", text: "Dropped from Deimos Captura Containers in Isolation Vaults.", url: "https://wiki.warframe.com/w/Captura" },
  "Deimos Membrane Scene": { section: "Acquisition", text: "Dropped from Deimos Captura Containers in Isolation Vaults.", url: "https://wiki.warframe.com/w/Captura" },
  "Deimos Verge Scene": { section: "Acquisition", text: "Dropped from Deimos Captura Containers in Isolation Vaults.", url: "https://wiki.warframe.com/w/Captura" },
  "Corinth Obsidian Skin": { section: "Acquisition", text: "Included in the PlayStation Divergence Pack, a platform-exclusive bundle containing the Corinth Obsidian Skin.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Grattler Obsidian Skin": { section: "Acquisition", text: "Included in PlayStation Renown Pack XVIII.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Guandao Opal Skin": { section: "Acquisition", text: "Included in Nintendo Switch Esteem Pack I, available from March 12, 2019 to May 28, 2019.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Hek Obsidian Skin": { section: "Acquisition", text: "Included in PlayStation Renown Pack XIII, available from May 22, 2018 to December 4, 2018.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Lato Obsidian Skin": { section: "Acquisition", text: "Included in PlayStation Renown Pack II, available from September 30, 2014 to November 25, 2014.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Excalibur Obsidian Helmet": { section: "Acquisition", text: "Included in PlayStation Renown Pack III, available from December 2, 2014 to February 17, 2015.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Iahgames Braton": { section: "Acquisition", text: "Earned through the expired IAHGames promotion: claim the promo code by email, verify an IAHGames Social account, and create a new Warframe account through IAHGames Warframe.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Cheeky Sprodling Emblem": { section: "Acquisition", text: "Awarded upon completing The Prince's Green Stem Path.", url: "https://wiki.warframe.com/w/Emblems" },
  "Armilla Emblem": { section: "Acquisition", text: "A Conclave emblem awarded through Conclave Alerts; it displays the rank achieved through Conclave Alerts.", url: "https://wiki.warframe.com/w/Emblems" },
  "Disciple's Emblem": { section: "Acquisition", text: "Awarded to Founders who purchased a Founders package. The Founders Pack is closed and this item is no longer available.", url: "https://wiki.warframe.com/w/Emblems" },
  "Master's Emblem": { section: "Acquisition", text: "Awarded to Founders who purchased a Founders package. The Founders Pack is closed and this item is no longer available.", url: "https://wiki.warframe.com/w/Emblems" },
  "Hunter's Emblem": { section: "Acquisition", text: "Awarded to Founders who purchased a Founders package. The Founders Pack is closed and this item is no longer available.", url: "https://wiki.warframe.com/w/Emblems" },
  "Grand Master Emblem": { section: "Acquisition", text: "Awarded to Founders who purchased a Founders package. The Founders Pack is closed and this item is no longer available.", url: "https://wiki.warframe.com/w/Emblems" },
  "Ghost Leader Emblem": { section: "Disposition", text: "Listed by the Wiki under Cut Content: Clan Leaderboard Emblems. No live acquisition route is documented.", url: "https://wiki.warframe.com/w/Emblems" },
  "Moon Leader Emblem": { section: "Disposition", text: "Listed by the Wiki under Cut Content: Clan Leaderboard Emblems. No live acquisition route is documented.", url: "https://wiki.warframe.com/w/Emblems" },
  "Mountain Leader Emblem": { section: "Disposition", text: "Listed by the Wiki under Cut Content: Clan Leaderboard Emblems. No live acquisition route is documented.", url: "https://wiki.warframe.com/w/Emblems" },
  "Shadow Leader Emblem": { section: "Disposition", text: "Listed by the Wiki under Cut Content: Clan Leaderboard Emblems. No live acquisition route is documented.", url: "https://wiki.warframe.com/w/Emblems" },
  "Storm Leader Emblem": { section: "Disposition", text: "Listed by the Wiki under Cut Content: Clan Leaderboard Emblems. No live acquisition route is documented.", url: "https://wiki.warframe.com/w/Emblems" },
  "Clan Sigil": { section: "Acquisition", text: "Originally purchasable from Little Duck in the Scarlet Spear Flotilla Relay for 2,000 Scarlet Credits; recurring versions have returned in later events.", url: "https://wiki.warframe.com/w/Sigils" },
  "Drip Squad 4 Life Emblem": { section: "Acquisition", text: "Awarded for completing the 1999 ARG and entering promo code TH3GR8D3SP41R.", url: "https://wiki.warframe.com/w/Emblems" },
  "Hostile Mergers Emblem": { section: "Acquisition", text: "Reward from Mission 1 of the limited-time Operation: Hostile Mergers event.", url: "https://wiki.warframe.com/w/Operation:_Hostile_Mergers" },
  "Kuria Emblem": { section: "Acquisition", text: "Awarded through an inbox message after scanning half of the Kurias.", url: "https://wiki.warframe.com/w/Emblems" },
  "Lunar Renewal Soar Sigil": { section: "Acquisition", text: "Available from the Market during Lunar New Year for 40 Platinum, or as part of the Fire Agate Bundle for 295 Platinum.", url: "https://wiki.warframe.com/w/Sigils" },
  "Necraseal Emblem": { section: "Acquisition", text: "Available from Varzia's Evergreen Cosmetics for 5 Aya.", url: "https://wiki.warframe.com/w/Emblems" },
  "Old Blood Emblem": { section: "Acquisition", text: "Awarded for capturing or converting a Kuva Lich or Sister of Parvos.", url: "https://wiki.warframe.com/w/Emblems" },
  "President King Corgi Emblem": { section: "Acquisition", text: "Awarded for completing 5 loops of Caliber Chicks 2.", url: "https://wiki.warframe.com/w/Emblems" },
  "Sisterhood Emblem": { section: "Acquisition", text: "Awarded for capturing or converting a Kuva Lich or Sister of Parvos.", url: "https://wiki.warframe.com/w/Emblems" },
  "Tenno Chronicler Emblem": { section: "Acquisition", text: "Awarded to administrators or moderators of the Warframe Wiki.", url: "https://wiki.warframe.com/w/Emblems" },
  "TennoGen Emblem": { section: "Acquisition", text: "Awarded to players whose TennoGen submissions have been accepted into the game.", url: "https://wiki.warframe.com/w/Emblems" },
  "Vasero Emergent Sekhara": { section: "Acquisition", text: "Sent to the inbox after completing the 250-kill Operator challenge with Vasero Sekhara equipped. The base Vasero Sekhara is purchased from the Market for 60 Platinum.", url: "https://wiki.warframe.com/w/Vasero_Sekhara" },
  "Vasero Apex Sekhara": { section: "Acquisition", text: "Sent to the inbox after completing the 1,000-kill Operator challenge with Vasero Emergent Sekhara equipped. The base Vasero Sekhara is purchased from the Market for 60 Platinum.", url: "https://wiki.warframe.com/w/Vasero_Sekhara" },
  "TennoVIP 2025 Sigil": { section: "Acquisition", text: "Exclusive sigil given to attendees of TennoLive, TennoVIP, and TennoCon events; this variant is the TennoVIP 2025 Sigil.", url: "https://wiki.warframe.com/w/Sigils" },
  "Chrysalis Sentinel Wings": { section: "Acquisition", text: "Available as part of the Infested Sentinel cosmetics for 15 Platinum.", url: "https://wiki.warframe.com/w/Sentinel_Cosmetics" },
  "Deca Heirloom Glyph": { section: "Acquisition", text: "Included in the Zenith Heirloom Collection, a Market collection priced at 89.99 USD/GBP.", url: "https://wiki.warframe.com/w/Zenith_Heirloom_Collection" },
  "Necraloid Glyph": { section: "Acquisition", text: "Purchased from Loid for 7,500 standing.", url: "https://wiki.warframe.com/w/Glyph" },
  "Operator Atmosphor": { section: "Acquisition", text: "Rewarded for completing The Old Peace quest.", url: "https://wiki.warframe.com/w/Operator/Customization" },
  "Orcus Prime Wings": { section: "Acquisition", text: "Included in Orcus Prime Sentinel Accessories from Atlas Prime Access.", url: "https://wiki.warframe.com/w/Sentinel_Cosmetics" },
  "Para Sentinel Wings": { section: "Acquisition", text: "Included in the Para Sentinel bundle, available as part of the Update 13 Mega Pack; the wings could also be purchased individually for 20 Platinum.", url: "https://wiki.warframe.com/w/Sentinel_Cosmetics" },
  "Pennant Obsidian Skin": { section: "Acquisition", text: "Included in the PlayStation Divergence Pack.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Obsidian Samia Syandana": { section: "Acquisition", text: "Included in PlayStation Renown Pack XVII, available from September 10, 2019 to March 10, 2020.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Obsidian Sedai Syandana": { section: "Acquisition", text: "Included in PlayStation Plus Booster Pack V, available from November 5, 2020 to July 1, 2021.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Quanta Obsidian Skin": { section: "Acquisition", text: "Included in PlayStation Plus Booster Pack III, available from November 20, 2018 to December 3, 2019.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Scoliac Obsidian Skin": { section: "Acquisition", text: "Included in PlayStation Renown Pack XIV, available from November 27, 2018 to February 26, 2019.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Spira Obsidian Skin": { section: "Acquisition", text: "Included in PlayStation Renown Pack X, available from March 21, 2017 to June 20, 2017.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Lepus Headgear": { section: "Acquisition", text: "A time-limited Easter Market accessory; the 2015 listing cost 5,000 Credits.", url: "https://wiki.warframe.com/w/Leap_of_the_Lotus" },
  "Mausolon Supulchrax Skin": { section: "Acquisition", text: "Earned from the Endurance mission of Operation: Orphix Venom by reaching 2,000 points.", url: "https://wiki.warframe.com/w/Operation:_Orphix_Venom" },
  "Twin Grakatas Opal Skin": { section: "Acquisition", text: "Included in Nintendo Switch Esteem Pack II, available from May 28, 2019 to September 10, 2019.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Sirocco Amp Skin": { section: "Acquisition", text: "Rewarded for completing The New War quest.", url: "https://wiki.warframe.com/w/The_New_War" },
  "Tempestarii Railjack Skin": { section: "Acquisition", text: "Rewarded for completing the Call of the Tempestarii side quest.", url: "https://wiki.warframe.com/w/Call_of_the_Tempestarii" },
  "Traciens Glaive Skin": { section: "Acquisition", text: "Available from Nightwave Cred Offerings on a rotational basis for 30 Nora's Mix: Time Tempests Cred.", url: "https://wiki.warframe.com/w/Weapon_Cosmetics" },
  "Hildryn Prime Chest Plate": { section: "Acquisition", text: "Included as an accessory in recurring Hildryn Prime Access.", url: "https://wiki.warframe.com/w/Warframe_Cosmetics" },
  "Teng Dual Dagger Skin": { section: "Acquisition", text: "Included in the Nezha Empyrean Collection, priced at 225 Platinum.", url: "https://wiki.warframe.com/w/Teng_Dagger_Skin" },
  "Mantle of the Lotus": { section: "Acquisition", text: "No longer available. It was originally available only to Guides of the Lotus, a program retired on April 5, 2019.", url: "https://wiki.warframe.com/w/Mantle_Of_The_Lotus_(Shoulders)" },
  "Loki Prime Glyph - Bright": { section: "Acquisition", text: "Obtained by purchasing the corresponding Loki Prime Access or Prime Vault package; purchasing it unlocks both the light and dark versions.", url: "https://wiki.warframe.com/w/Glyph" },
  "Loki Prime Glyph - Dark": { section: "Acquisition", text: "Obtained by purchasing the corresponding Loki Prime Access or Prime Vault package; purchasing it unlocks both the light and dark versions.", url: "https://wiki.warframe.com/w/Glyph" },
  "Make-A-Wish Eli Glyph": { section: "Acquisition", text: "A Legendary Glyph created by a player who purchased a Legendary Ticket to TennoCon; each Legendary Glyph is exclusive to its designer unless they share it.", url: "https://wiki.warframe.com/w/Glyph" },
  "Cycle One Sigil": { section: "Disposition", text: "Console-exclusive PS4 anniversary sigil; it cannot be obtained on PC.", url: "https://wiki.warframe.com/w/Sigils" },
  "Cycle Three Sigil": { section: "Disposition", text: "Console-exclusive PS4 anniversary sigil; it cannot be obtained on PC.", url: "https://wiki.warframe.com/w/Sigils" },
  "Seal Of Honoring": { section: "Disposition", text: "Console-exclusive Xbox One anniversary sigil; it cannot be obtained on PC.", url: "https://wiki.warframe.com/w/Sigils" },
  "Seal Of Honoring III": { section: "Disposition", text: "Console-exclusive Xbox One anniversary sigil; it cannot be obtained on PC.", url: "https://wiki.warframe.com/w/Sigils" },
  "Capit XIII Sporoi": { section: "Acquisition", text: "Included in the Insign Bundle. Purchase the bundle from Roathe in La Cath\xE9drale for 150 Maphica, then unlock Capit XIII Sporoi by completing Steel Path The Descendia without dying with Tenens XII Perigone equipped.", url: "https://wiki.warframe.com/w/Insign_Bundle" },
  "Grandis XIX Phloios": { section: "Acquisition", text: "Included in the Insign Bundle. Purchase the bundle from Roathe in La Cath\xE9drale for 150 Maphica, then unlock Grandis XIX Phloios by defeating a Technocyte Coda without getting hit by stage attacks with Grandis XVIII Kalika equipped.", url: "https://wiki.warframe.com/w/Insign_Bundle" },
  "Servio VII Phloios": { section: "Acquisition", text: "Included in the Insign Bundle. Purchase the bundle from Roathe in La Cath\xE9drale for 150 Maphica, then unlock Servio VII Phloios by completing 5 Steel Path missions with Servio VI Kalika equipped.", url: "https://wiki.warframe.com/w/Insign_Bundle" },
  "Tenens XI Phloios": { section: "Acquisition", text: "Included in the Insign Bundle. Purchase the bundle from Roathe in La Cath\xE9drale for 150 Maphica, then unlock Tenens XI Phloios by defeating The Fragmented One with Tenens X Kalika equipped.", url: "https://wiki.warframe.com/w/Insign_Bundle" },
  "Capit XV Phloios": { section: "Acquisition", text: "Included in the Insign Bundle. Purchase the bundle from Roathe in La Cath\xE9drale for 150 Maphica, then unlock Capit XV Phloios by completing a full Archon Hunt without bleeding out with Capit XIV Kalika equipped.", url: "https://wiki.warframe.com/w/Insign_Bundle" },
  "Grandis XVIII Kalika": { section: "Acquisition", text: "Included in the Insign Bundle. Purchase the bundle from Roathe in La Cath\xE9drale for 150 Maphica, then unlock Grandis XVIII Kalika by defeating 15 enemies with a single Tauron Strike with Grandis XVII Sporoi equipped.", url: "https://wiki.warframe.com/w/Insign_Bundle" },
  "Servio VI Kalika": { section: "Acquisition", text: "Included in the Insign Bundle. Purchase the bundle from Roathe in La Cath\xE9drale for 150 Maphica, then unlock Servio VI Kalika by defeating the Exploiter Orb with Servio V Sporoi equipped.", url: "https://wiki.warframe.com/w/Insign_Bundle" },
  "Capit XVI Perigone": { section: "Acquisition", text: "Included in the Insign Bundle. Purchase the bundle from Roathe in La Cath\xE9drale for 150 Maphica, then unlock Capit XVI Perigone by carrying 4 Keyglyphs during a Netracell mission with Capit XV Phloios equipped.", url: "https://wiki.warframe.com/w/Insign_Bundle" },
  "Grandis XVII Sporoi": { section: "Acquisition", text: "Included in the Insign Bundle. Purchase the bundle from Roathe in La Cath\xE9drale for 150 Maphica, then unlock Grandis XVII Sporoi by acquiring an Incarnon Genesis from The Steel Path Circuit with Capit XVI Perigone equipped.", url: "https://wiki.warframe.com/w/Insign_Bundle" },
  "Tenens XII Perigone": { section: "Acquisition", text: "Included in the Insign Bundle. Purchase the bundle from Roathe in La Cath\xE9drale for 150 Maphica, then unlock Tenens XII Perigone by defeating H-09 Apex with Tenens XI Phloios equipped.", url: "https://wiki.warframe.com/w/Insign_Bundle" },
  "Mod Segment": { section: "Quest acquisition", text: "Obtained during The Teacher quest; it unlocks the ability to use and fuse Mods.", url: "https://wiki.warframe.com/w/Orbiter_Segments" },
  "Raya Orbitus Sigil": { section: "Acquisition", text: "Earned at Rank 2 of Nightwave: Nora's Mix Volume 9.", url: "https://wiki.warframe.com/w/Nightwave/Nora%27s_Mix_Volume_9" },
  "Monquis Sigil": { section: "Event acquisition", text: "A Lunar New Year event sigil; the Wiki identifies the original Monquis Sigil as a China-exclusive Lunar New Year reward.", url: "https://wiki.warframe.com/w/Lunar_Renewal" },
  "Lunar Renewal Ox Emblem": { section: "Event acquisition", text: "A Lunar Renewal 2021 exclusive emblem; it was available during that Lunar New Year event and is not listed as a current offering.", url: "https://wiki.warframe.com/w/Lunar_Renewal" },
  "RixtyMOL Aklato": { section: "Acquisition", text: "Expired Rixty promotion: purchase Platinum through the Rixty option on the Warframe website; the exclusive Aklato with its RixtyMOL skin was granted with the purchase.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Lex Onyx Skin": { section: "Acquisition", text: "Previously included in the retired Steam Esteem Pack; it is no longer available through that promotion.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Magnus Obsidian Skin": { section: "Acquisition", text: "Included in the PlayStation Renown Pack series; the Wiki lists Magnus Obsidian Skin among the platform-exclusive Obsidian skins.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Skana Obsidian Skin": { section: "Acquisition", text: "Included in PlayStation Renown Pack II, a retired platform-exclusive bundle.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Drakgoon Rubedo Plated Skin": { section: "Acquisition", text: "Included in the retired Rubedo Plated Steam Trading Card collection; the Rubedo Plated Drakgoon Skin was the extraordinary-rarity item.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Galatine Rubedo Plated Skin": { section: "Acquisition", text: "Included in the retired Rubedo Plated Steam Trading Card collection; the Rubedo Plated Galatine Skin was the rare-rarity item.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Provvok Obsidian Shoulder Guard": { section: "Acquisition", text: "Included in PlayStation Renown Pack XIII alongside the Hek Obsidian Skin.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Prime Iron Skin Override": { section: "Acquisition", text: "Prime cosmetic accessory for Rhino Prime; it was included with Rhino Prime Access and is not a separately craftable item.", url: "https://wiki.warframe.com/w/Warframe_Cosmetics" },
  "Nvidia Braton": { section: "Disposition", text: "The Wiki identifies this as part of an unreleased NVIDIA GPU promotion; no obtainable route was released.", url: "https://wiki.warframe.com/w/Weapon_Cosmetics" },
  "Viper Rubedo Plated Skin": { section: "Acquisition", text: "Included in the Rubedo Plated Steam Trading Card collection as one of the Viper Rubedo Skins; the collection route is retired.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Twin Vipers Rubedo Plated Skin": { section: "Acquisition", text: "Included in the Rubedo Plated Steam Trading Card collection as one of the Viper Rubedo Skins; the collection route is retired.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Hildryn Prime Helmet": { section: "Acquisition", text: "The Prime helmet is part of Hildryn Prime, whose recurring acquisition route is Prime Access or a later Prime Resurgence rotation.", url: "https://wiki.warframe.com/w/Warframe_Cosmetics" },
  "Saryn Prime Helmet": { section: "Acquisition", text: "The Prime helmet is part of Saryn Prime, whose recurring acquisition route is Prime Access or a later Prime Resurgence rotation.", url: "https://wiki.warframe.com/w/Warframe_Cosmetics" },
  "Sevagoth Prime Helmet": { section: "Acquisition", text: "The Prime helmet is part of Sevagoth Prime, whose recurring acquisition route is Prime Access or a later Prime Resurgence rotation.", url: "https://wiki.warframe.com/w/Warframe_Cosmetics" },
  "Zephyr Prime Helmet": { section: "Acquisition", text: "The Prime helmet is part of Zephyr Prime, whose recurring acquisition route is Prime Access or a later Prime Resurgence rotation.", url: "https://wiki.warframe.com/w/Warframe_Cosmetics" },
  "The Baron": { section: "Event acquisition", text: "Unlocked for all players when the 2014 Moframe/Movember fundraiser reached its donation goals; the event is over.", url: "https://wiki.warframe.com/w/Moframe" },
  "The Dastard": { section: "Event acquisition", text: "Unlocked for all players through the 2015 Moframe/Movember fundraiser after its donation goals were reached; the event is over.", url: "https://wiki.warframe.com/w/Moframe" },
  "The Gentleman": { section: "Event acquisition", text: "Unlocked for all players when the 2014 Moframe/Movember fundraiser reached its donation goals; the event is over.", url: "https://wiki.warframe.com/w/Moframe" },
  "The Illusionist": { section: "Event acquisition", text: "Unlocked for all players through the 2015 Moframe/Movember fundraiser after its donation goals were reached; the event is over.", url: "https://wiki.warframe.com/w/Moframe" },
  "The Inventor": { section: "Event acquisition", text: "Unlocked for all players through the 2015 Moframe/Movember fundraiser after its donation goals were reached; the event is over.", url: "https://wiki.warframe.com/w/Moframe" },
  "The Magnum": { section: "Event acquisition", text: "Unlocked for all players when the 2014 Moframe/Movember fundraiser reached its donation goals; the event is over.", url: "https://wiki.warframe.com/w/Moframe" },
  "The Master": { section: "Event acquisition", text: "Unlocked for all players through the 2015 Moframe/Movember fundraiser after its donation goals were reached; the event is over.", url: "https://wiki.warframe.com/w/Moframe" },
  "The Shopkeep": { section: "Event acquisition", text: "Unlocked for all players through the 2015 Moframe/Movember fundraiser after its donation goals were reached; the event is over.", url: "https://wiki.warframe.com/w/Moframe" },
  "The Tusker": { section: "Event acquisition", text: "Unlocked for all players when the 2014 Moframe/Movember fundraiser reached its donation goals; the event is over.", url: "https://wiki.warframe.com/w/Moframe" },
  "The Villain": { section: "Event acquisition", text: "Unlocked for all players when the 2014 Moframe/Movember fundraiser reached its donation goals; the event is over.", url: "https://wiki.warframe.com/w/Moframe" },
  "Solstice Conclave Emblem": { section: "Event acquisition", text: "Awarded for taking part in the Snowday Showdown Conclave alert.", url: "https://wiki.warframe.com/w/Emblems" },
  "The Index Emblem": { section: "Event acquisition", text: "Awarded for achieving a score of 100 or more in a High Risk match during The Index Preview.", url: "https://wiki.warframe.com/w/Emblems" },
  "RHINO BRONZE SKIN": { section: "Disposition", text: "A Warframe China promotional exclusive; the Wiki lists Rhino Bronze Skin among the China-only items. It is not an obtainable global-build item.", url: "https://wiki.warframe.com/w/WARFRAME_(China)" },
  "BRONZE RHINO HELMET": { section: "Disposition", text: "A Warframe China promotional exclusive associated with Rhino Bronze Skin; it is not an obtainable global-build item.", url: "https://wiki.warframe.com/w/WARFRAME_(China)" },
  "GALATINE BRONZE SKIN": { section: "Disposition", text: "A Warframe China promotional exclusive; the Wiki lists Galatine Bronze Skin among the China-only items. It is not an obtainable global-build item.", url: "https://wiki.warframe.com/w/WARFRAME_(China)" },
  "Drakgoon Bronze Skin": { section: "Disposition", text: "A Warframe China promotional exclusive; the Wiki lists Drakgoon Bronze Skin among the China-only items. It is not an obtainable global-build item.", url: "https://wiki.warframe.com/w/WARFRAME_(China)" },
  "Rhino Rubedo Plated Skin": { section: "Acquisition", text: "Included in the retired Rubedo Plated Steam Trading Card collection as the common-rarity Rubedo Plated Rhino Skin.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Yamako Rubedo Plated Syandana": { section: "Acquisition", text: "Included in the retired Rubedo Plated Steam Trading Card collection as the uncommon-rarity Rubedo Plated Yamako Syandana.", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Twin Vipers Obsidian Skin": { section: "Acquisition", text: "Included in the retired PlayStation Renown Pack IV; the Wiki labels the item \u201CTwin Viper Obsidian Skin.\u201D", url: "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards" },
  "Alliance Sigil": { section: "Acquisition", text: "The Wiki identifies this as the Alliance Emblem variant: it is purchased from the Market for 30 Platinum and displays the alliance emblem on the Warframe shoulder.", url: "https://wiki.warframe.com/w/Emblems" },
  "Primate Sigil": { section: "Disposition", text: "The export path identifies this as the China-exclusive Monquis Sigil variant; the Wiki documents the Monquis Sigil as a Lunar New Year China-exclusive item, with no global-build route.", url: "https://wiki.warframe.com/w/Lunar_Renewal" },
  "Year of The Rooster Sigil": { section: "Event acquisition", text: "A Lunar New Year Year of the Rooster event sigil; the Wiki documents the Rooster Sigil as the themed reward for that event, which has ended.", url: "https://wiki.warframe.com/w/Lunar_Renewal" },
  "Vauban Heirloom Schema Sigil": { section: "Acquisition", text: "Available from the Vauban Heirloom Collection for 400 Platinum, or individually from the Market for 25 Platinum.", url: "https://wiki.warframe.com/w/Sigils" },
  "Ki'Teer Razza Elixis Syandana": { section: "Acquisition", text: "The export's Elixis name corresponds to the Wiki's Ki'Teer Razza Syandana entry: purchase it from Baro Ki'Teer for 400 Ducats and 350,000 Credits when offered.", url: "https://wiki.warframe.com/w/Baro_Ki%27Teer" },
  "Unlock Arbitrations": { section: "Star Chart unlock", text: "Unlocks when the player completes the Eris Junction task required for Arbitrations after gaining access to Pluto; the item is the unlock marker, not a separately purchasable resource.", url: "https://wiki.warframe.com/w/Arbitrations" },
  "Crestbear Glyph": { section: "Creator Glyphs", text: "Listed by the Warframe Wiki as a Creator Glyph. Creator Glyphs may be distributed personally by the creator or through a universal promo code; availability can change.", url: "https://wiki.warframe.com/w/Glyph" },
  "Darkfreack Glyph": { section: "Creator Glyphs", text: "Listed by the Warframe Wiki as a Creator Glyph. Creator Glyphs may be distributed personally by the creator or through a universal promo code; availability can change.", url: "https://wiki.warframe.com/w/Glyph" },
  "Depths Glyph": { section: "Creator Glyphs", text: "Listed by the Warframe Wiki as a Creator Glyph. Creator Glyphs may be distributed personally by the creator or through a universal promo code; availability can change.", url: "https://wiki.warframe.com/w/Glyph" },
  "Ferreusdemon Glyph": { section: "Creator Glyphs", text: "Listed by the Warframe Wiki among the Creator Glyph promo entries. Creator Glyph promo codes and personal distribution can change or be deactivated.", url: "https://wiki.warframe.com/w/Glyph" },
  "N00blshowtek Glyph": { section: "Creator Glyphs", text: "Listed by the Warframe Wiki among the Creator Glyph promo entries. Creator Glyph promo codes and personal distribution can change or be deactivated.", url: "https://wiki.warframe.com/w/Glyph" },
  "Tcn Glyph": { section: "Creator Glyphs", text: "Listed by the Warframe Wiki as the TCN Creator Glyph. Creator Glyphs may be distributed personally by the creator or through a universal promo code; availability can change.", url: "https://wiki.warframe.com/w/Glyph" },
  "Warframe Runway Glyph": { section: "Community Glyphs", text: "Listed by the Warframe Wiki among Community Glyph promo entries; the associated community distribution or promo-code availability can change.", url: "https://wiki.warframe.com/w/Glyph" },
  "Warframe Wiki Glyph": { section: "Community Glyphs", text: "Listed by the Warframe Wiki among Community Glyph promo entries; the associated community distribution or promo-code availability can change.", url: "https://wiki.warframe.com/w/Glyph" },
  "Korean Community Discord Glyph": { section: "Community Glyphs", text: "Listed by the Warframe Wiki as a Community Glyph for the Korean Warframe community; the page does not give a current universal code or permanent purchase route.", url: "https://wiki.warframe.com/w/Glyph" },
  "Year Ten Anniversary Glyph": { section: "Anniversary", text: "Available to all players during the Year Ten Anniversary event; that event has ended.", url: "https://wiki.warframe.com/w/Glyph" },
  "Zylok Elixis Skin": { section: "Disposition", text: "The Warframe Wiki lists this exact skin as never having been offered; its price and an obtainable route are unknown.", url: "https://wiki.warframe.com/w/Weapon_Cosmetics" },
  "Air Martial": { section: "Verification status", text: "The exact export object is a legacy Conclave PvP melee mod. The current Wiki Conclave Mods page does not list this legacy name individually, so its exact standing cost or current availability is unverified.", url: "https://wiki.warframe.com/w/Conclave_Mods" },
  "Harrowed Hook": { section: "Verification status", text: "The exact export object is a legacy Conclave PvP melee mod. The current Wiki Conclave Mods page does not list this legacy name individually, so its exact standing cost or current availability is unverified.", url: "https://wiki.warframe.com/w/Conclave_Mods" },
  "Fizzbang Flourish": { section: "Verification status", text: "The exact export object is a legacy K-Drive mod. The current Wiki K-Drive Mods page does not list this legacy name individually, so its exact standing cost or current availability is unverified.", url: "https://wiki.warframe.com/w/K-Drive_Mods" },
  "PLAY EMBLEM": { section: "Acquisition", text: "Acquired by participating in the closed/open alpha or beta tests for Warframe China; the Wiki lists the exact PLAY EMBLEM under that China-only group.", url: "https://wiki.warframe.com/w/Emblems" }
};

// src-tauri/data/assets/data/wiki-description-acquisition.json
var wiki_description_acquisition_default = {
  "/Lotus/Upgrades/Skins/Clan/CY17173MediaBadge": "Awarded to Tenno recruited by an ally of The Lotus.",
  "/Lotus/Upgrades/Skins/Clan/CorpusVoidBadgeItem": "An insignia awarded to the Tenno who proved themselves during Arid Fear event.",
  "/Lotus/Upgrades/Skins/Clan/InfTacAlertPussAncientBadgeItem": "Awarded to Tenno who participated in the Mutalist Incursions event.",
  "/Lotus/Upgrades/Skins/Clan/HiveSabotageEventBadgeItem": "Awarded to Tenno for the contributions they made during the Breeding Grounds event.",
  "/Lotus/Upgrades/Skins/Clan/SkullBadgeBronzeItem": "Awarded to Tenno who achieved a Bronze Rank on the retired Global Leaderboards.",
  "/Lotus/Upgrades/Skins/Clan/InfTacAlertDiseasedAncientBadgeItem": "Awarded to Tenno who participated in the Mutalist Incursions event.",
  "/Lotus/Upgrades/Skins/Clan/JungleEventBadgeItem": "An emblem awarded to all those who helped destroy the Grineer toxin during the Cicero Crisis.",
  "/Lotus/Upgrades/Skins/Clan/ExcavationEvenetBadgeItem": "Awarded to Tenno for their contribution to the Cryotic Front event.",
  "/Lotus/Upgrades/Skins/Clan/CYDuowanMediaBadge": "Awarded to Tenno recruited by an ally of The Lotus.",
  "/Lotus/Upgrades/Skins/Clan/InfestationEventEmblemItem": "An emblem awarded to the Tenno who hunted down Alad V.",
  "/Lotus/Upgrades/Skins/Clan/ZawVariantBadgeItemC": "An insignia awarded to the Tenno Elite who proved themselves during the Tohtchi Variant.",
  "/Lotus/Upgrades/Skins/Clan/OrokinSabotageBadgeItem": "Awarded to Tenno for their contribution during Operation Gate Crash.",
  "/Lotus/Upgrades/Skins/Clan/SkullBadgeGoldItem": "Awarded to Tenno who achieved a Gold Rank on the retired Global Leaderboards.",
  "/Lotus/Upgrades/Skins/Sigils/LotusGuideSigil": "Awarded to Tenno who assist the Lotus by helping other Tenno.",
  "/Lotus/Upgrades/Skins/Clan/CYOBBadgeItem": "This emblem is awarded to the most dedicated of Tenno during the Warframe Open Beta.",
  "/Lotus/Upgrades/Skins/Sigils/InktoberSigil": "A sigil awarded for Inktober.",
  "/Lotus/Upgrades/Skins/Clan/MutalistIncursionsBadgeItem": "Awarded to Tenno who participated in the Mutalist Incursions event.",
  "/Lotus/Upgrades/Skins/Clan/ZawVariantBadgeItemA": "An insignia awarded to the Tenno Elite who proved themselves during the Tohtchi Variant.",
  "/Lotus/Upgrades/Skins/Clan/KelaEventBadgeItem": "Awarded to those who stood against Kela De Thaym and her Executioners.",
  "/Lotus/Upgrades/Skins/Clan/ScarletSpear/ScarletSpearGroundIEmblem": "Earned through ground assaults against the Sentient Condrix during Operation Scarlet Spear.",
  "/Lotus/Upgrades/Skins/Clan/ScarletSpear/ScarletSpearGroundIIEmblem": "Earned through ground assaults against the Sentient Condrix during Operation Scarlet Spear.",
  "/Lotus/Upgrades/Skins/Clan/ScarletSpear/ScarletSpearGroundIIIEmblem": "Earned through ground assaults against the Sentient Condrix during Operation Scarlet Spear.",
  "/Lotus/Upgrades/Skins/Clan/ScarletSpear/ScarletSpearSpaceIEmblem": "Earned through Railjack raids against the Sentient Murex during Operation Scarlet Spear.",
  "/Lotus/Upgrades/Skins/Clan/ScarletSpear/ScarletSpearSpaceIIEmblem": "Earned through Railjack raids against the Sentient Murex during Operation Scarlet Spear.",
  "/Lotus/Upgrades/Skins/Clan/ScarletSpear/ScarletSpearSpaceIIIEmblem": "Earned through Railjack raids against the Sentient Murex during Operation Scarlet Spear.",
  "/Lotus/Upgrades/Skins/Clan/ScarletSpear/ScarletSpearOperationIEmblem": "Awarded for exemplary performance in Operation Scarlet Spear.",
  "/Lotus/Upgrades/Skins/Clan/ScarletSpear/ScarletSpearOperationIIEmblem": "Awarded for exemplary performance in Operation Scarlet Spear.",
  "/Lotus/Upgrades/Skins/Clan/ScarletSpear/ScarletSpearOperationIIIEmblem": "Awarded for exemplary performance in Operation Scarlet Spear.",
  "/Lotus/Upgrades/Skins/Clan/SkullBadgeSilverItem": "Awarded to Tenno who achieved a Silver Rank on the retired Global Leaderboards.",
  "/Lotus/Upgrades/Skins/Clan/RescueEventBadgeItem": "Awarded for the safe return of Red Veil Operatives during the Specters of Liberty operation.",
  "/Lotus/Upgrades/Skins/Clan/SurvivalEventBadgeItem": "An insignia awarded to the Tenno who proved themselves during Survival event.",
  "/Lotus/Upgrades/Skins/Clan/InfTacAlertNaniteMoaAncientBadgeItem": "Awarded to Tenno who participated in the Mutalist Incursions event.",
  "/Lotus/Upgrades/Skins/Clan/InfTacAlertSlowBombMoaAncientBadgeItem": "Awarded to Tenno who participated in the Mutalist Incursions event.",
  "/Lotus/Upgrades/Skins/Sigils/TennoLive2015Sigil": "Awarded to players who attended the Tenno Live 2015.",
  "/Lotus/Upgrades/Skins/Clan/LotusGuideBadgeItem": "Awarded to Tenno who assist the Lotus by helping other Tenno.",
  "/Lotus/Upgrades/Skins/Clan/ShipyardsEventBadgeItem": "An insignia awarded to the Tenno who distinguished themselves during Tethra's Doom event.",
  "/Lotus/Upgrades/Skins/Clan/ShipyardsEventQuantumBadgeItem": "An insignia awarded to the Tenno who distinguished themselves during Tethra's Doom event.",
  "/Lotus/Upgrades/Skins/Clan/DefectorRescueEventBadgeItem": "An insignia awarded to the Tenno who proved themselves during the Pacifism Defect operation.",
  "/Lotus/Upgrades/Skins/Clan/ZawVariantBadgeItemB": "An insignia awarded to the Tenno Elite who proved themselves during the Tohtchi Variant.",
  "/Lotus/Types/AvatarImages/ScarletSpear/ImageScarletSpearGroundI": "Earned through ground assaults against the Sentient Condrix during Operation Scarlet Spear.",
  "/Lotus/Types/AvatarImages/ScarletSpear/ImageScarletSpearGroundII": "Earned through ground assaults against the Sentient Condrix during Operation Scarlet Spear.",
  "/Lotus/Types/AvatarImages/ScarletSpear/ImageScarletSpearGroundIII": "Earned through ground assaults against the Sentient Condrix during Operation Scarlet Spear.",
  "/Lotus/Types/AvatarImages/ScarletSpear/ImageScarletSpearSpaceI": "Earned through Railjack raids against the Sentient Murex during Operation Scarlet Spear.",
  "/Lotus/Types/AvatarImages/ScarletSpear/ImageScarletSpearSpaceII": "Earned through Railjack raids against the Sentient Murex during Operation Scarlet Spear.",
  "/Lotus/Types/AvatarImages/ScarletSpear/ImageScarletSpearSpaceIII": "Earned through Railjack raids against the Sentient Murex during Operation Scarlet Spear.",
  "/Lotus/Types/AvatarImages/ScarletSpear/ImageScarletSpearOperationI": "Awarded for exemplary performance in Operation Scarlet Spear.",
  "/Lotus/Types/AvatarImages/ScarletSpear/ImageScarletSpearOperationII": "Awarded for exemplary performance in Operation Scarlet Spear.",
  "/Lotus/Types/AvatarImages/ScarletSpear/ImageScarletSpearOperationIII": "Awarded for exemplary performance in Operation Scarlet Spear.",
  "/Lotus/Types/AvatarImages/TennoCon2019SimarisGlyph": "Given to those attending the Sanctuary Showcase gameshow at TennoCon 2019.",
  "/Lotus/Upgrades/Skins/Excalibur/ExcaliburDexHelmet": "A gift from the Lotus to commemorate the fifth anniversary of the first Tenno waking from Cryo stasis.",
  "/Lotus/Upgrades/Skins/Rhino/RhinoDexHelmet": "A gift from the Lotus to commemorate the eighth anniversary of the first Tenno waking from Cryo stasis.",
  "/Lotus/Upgrades/Skins/Clan/MechEventEmblemItem": "An emblem for veterans of the Operation: Orphix Venom.",
  "/Lotus/Upgrades/Skins/Sigils/MechEventSigil": "A sigil for veterans of Operation Orphix Venom.",
  "/Lotus/Upgrades/Skins/Sigils/VorDuviriSigil": "From Baro Ki\u2019Teer comes this stylish reimagining of the infamous Captain Vor.",
  "/Lotus/Upgrades/Skins/Sigils/TennoCon2016Sigil": "Bestowed upon those who joined together in celebration at TennoCon 2016.",
  "/Lotus/Upgrades/Skins/Sigils/TennoCon2017Sigil": "Bestowed upon those who joined together in celebration at TennoCon 2017.",
  "/Lotus/Upgrades/Skins/Sigils/TennoCon2018Sigil": "Bestowed upon those who joined together in celebration at TennoCon 2018.",
  "/Lotus/Upgrades/Skins/Sigils/TennoCon2019Sigil": "Bestowed upon those who joined together in celebration at TennoCon 2019.",
  "/Lotus/Upgrades/Skins/Sigils/TennoCon2020Sigil": "Bestowed upon those who joined together in celebration at TennoCon 2020.",
  "/Lotus/Upgrades/Skins/Clan/TennoCon2016BadgeItem": "Bestowed upon those who joined together in celebration at TennoCon 2016.",
  "/Lotus/Upgrades/Skins/Sigils/SigilVideoContest": "Participatory prize for the Tenno's Greatest Trailer contest.",
  "/Lotus/Upgrades/Skins/Loki/LokiTwitchSkin": {
    text: "Available from Varzia in Maroo's Bazaar on Mars through Prime Resurgence; acquired for Aya.",
    source: "Warframe.com Verv Collection Re-release"
  },
  "/Lotus/Upgrades/Skins/Weapons/Redeemer/RedeemerTwitchSkin": {
    text: "Available from Varzia in Maroo's Bazaar on Mars through Prime Resurgence; acquired for Aya.",
    source: "Warframe.com Verv Collection Re-release"
  },
  "/Lotus/Upgrades/Skins/Promo/Twitch/TwitchRubicoSkin": {
    text: "Available from Varzia in Maroo's Bazaar on Mars through Prime Resurgence; acquired for Aya.",
    source: "Warframe.com Verv Collection Re-release"
  },
  "/Lotus/Upgrades/Skins/Promo/Twitch/TigrisTwitchSkin": {
    text: "Available from Varzia in Maroo's Bazaar on Mars through Prime Resurgence; acquired for Aya.",
    source: "Warframe.com Verv Collection Re-release"
  },
  "/Lotus/Upgrades/Skins/Promo/Twitch/Twitch2021AfurisSkin": {
    text: "Available via Varzia's wares in Maroo's Bazaar through Prime Resurgence; acquired for Aya.",
    source: "Warframe.com Verv Collection Re-release 2"
  },
  "/Lotus/Upgrades/Skins/Promo/Twitch/TwitchPentaSkin": {
    text: "Available via Varzia's wares in Maroo's Bazaar through Prime Resurgence; acquired for Aya.",
    source: "Warframe.com Verv Collection Re-release 2"
  },
  "/Lotus/Upgrades/Skins/Volt/VoltTwitchSkin": {
    text: "Available via Varzia's wares in Maroo's Bazaar through Prime Resurgence; acquired for Aya.",
    source: "Warframe.com Verv Collection Re-release 2"
  },
  "/Lotus/Types/AvatarImages/AvatarImageDJRoMGlyph": {
    text: "Twitch Drop: earned by watching Warframe streams for 90 minutes during Twitch Drops Fest 2025 Wave 1.",
    source: "Warframe.com Twitch Drops Fest 2025"
  },
  "/Lotus/Types/AvatarImages/AvatarImageDrillbitGlyph": {
    text: "Twitch Drop: earned by watching Warframe streams for 60 minutes during Twitch Drops Fest 2025 Wave 1.",
    source: "Warframe.com Twitch Drops Fest 2025"
  },
  "/Lotus/Types/AvatarImages/AvatarImageHarddriveGlyph": {
    text: "Twitch Drop: earned by watching Warframe streams for 30 minutes during Twitch Drops Fest 2025 Wave 1.",
    source: "Warframe.com Twitch Drops Fest 2025"
  },
  "/Lotus/Types/AvatarImages/AvatarImageZekeGlyph": {
    text: "Twitch Drop: earned by watching Warframe streams for 120 minutes during Twitch Drops Fest 2025 Wave 1.",
    source: "Warframe.com Twitch Drops Fest 2025"
  },
  "/Lotus/Types/AvatarImages/AvatarImagePacketGlyph": {
    text: "Twitch Drop: earned by watching Warframe streams for 150 minutes during Twitch Drops Fest 2025 Wave 1.",
    source: "Warframe.com Twitch Drops Fest 2025"
  },
  "/Lotus/Types/AvatarImages/AvatarImageLogoGlyph": {
    text: "Twitch Drop: earned by watching Warframe streams for 180 minutes during Twitch Drops Fest 2025 Wave 1.",
    source: "Warframe.com Twitch Drops Fest 2025"
  },
  "/Lotus/Types/AvatarImages/AvatarImageInfestedDJRoMGlyph": {
    text: "Twitch Drop: earned by watching Warframe streams for 90 minutes during Twitch Drops Fest 2025 Wave 2.",
    source: "Warframe.com Twitch Drops Fest 2025"
  },
  "/Lotus/Types/AvatarImages/AvatarImageInfestedDrillbitGlyph": {
    text: "Twitch Drop: earned by watching Warframe streams for 60 minutes during Twitch Drops Fest 2025 Wave 2.",
    source: "Warframe.com Twitch Drops Fest 2025"
  },
  "/Lotus/Types/AvatarImages/AvatarImageInfestedHarddriveGlyph": {
    text: "Twitch Drop: earned by watching Warframe streams for 30 minutes during Twitch Drops Fest 2025 Wave 2.",
    source: "Warframe.com Twitch Drops Fest 2025"
  },
  "/Lotus/Types/AvatarImages/AvatarImageInfestedZekeGlyph": {
    text: "Twitch Drop: earned by watching Warframe streams for 120 minutes during Twitch Drops Fest 2025 Wave 2.",
    source: "Warframe.com Twitch Drops Fest 2025"
  },
  "/Lotus/Types/AvatarImages/AvatarImageInfestedPacketGlyph": {
    text: "Twitch Drop: earned by watching Warframe streams for 150 minutes during Twitch Drops Fest 2025 Wave 2.",
    source: "Warframe.com Twitch Drops Fest 2025"
  },
  "/Lotus/Types/AvatarImages/AvatarImageInfestedLogoGlyph": {
    text: "Twitch Drop: earned by watching Warframe streams for 180 minutes during Twitch Drops Fest 2025 Wave 2.",
    source: "Warframe.com Twitch Drops Fest 2025"
  },
  "/Lotus/Types/AvatarImages/Events/EventGlyphCaviaFibonacci": {
    text: "Operation: Gargoyle's Cry reward; trade Grotesque Splinters with the Gargoyle in a Dojo.",
    source: "Warframe.com Operation: Gargoyle's Cry"
  },
  "/Lotus/Types/AvatarImages/Events/EventGlyphCaviaTagfer": {
    text: "Operation: Gargoyle's Cry reward; trade Grotesque Splinters with the Gargoyle in a Dojo.",
    source: "Warframe.com Operation: Gargoyle's Cry"
  },
  "/Lotus/Types/AvatarImages/ImageElevenYearAnniversary": {
    text: "Anniversary login reward: log in during the 11 Year Anniversary celebration to earn it.",
    source: "Warframe.com Update 35.5: Dante Unbound"
  },
  "/Lotus/Types/AvatarImages/ImageTwelveYearAnniversary": {
    text: "Anniversary login reward: log in during the 12 Year Anniversary celebration to earn it.",
    source: "Warframe.com 12 Year Anniversary"
  },
  "/Lotus/Upgrades/Skins/Operator/Accessories/YontaCrownFacialAcc": {
    text: "Operation: Atramentum reward.",
    source: "Warframe.com Operation: Atramentum"
  },
  "/Lotus/Upgrades/Skins/Clan/ShadowgrapherEventBadgeItem": {
    text: "Operation: Atramentum reward.",
    source: "Warframe.com Operation: Atramentum"
  },
  "/Lotus/Upgrades/Skins/Sigils/EventSigilCaviaFibonacci": {
    text: "Operation: Gargoyle's Cry reward; trade Grotesque Splinters with the Gargoyle in a Dojo.",
    source: "Warframe.com Operation: Gargoyle's Cry"
  },
  "/Lotus/Upgrades/Skins/Sigils/EventSigilCaviaTagfer": {
    text: "Operation: Gargoyle's Cry reward; trade Grotesque Splinters with the Gargoyle in a Dojo.",
    source: "Warframe.com Operation: Gargoyle's Cry"
  },
  "/Lotus/Upgrades/Skins/Clan/EntratiEventEmblemItem": {
    text: "Operation: Gargoyle's Cry reward; trade Grotesque Splinters with the Gargoyle in a Dojo.",
    source: "Warframe.com Operation: Gargoyle's Cry"
  },
  "/Lotus/Types/AvatarImages/Events/EventGlyphCaviaBirdThree": {
    text: "Operation: Gargoyle's Cry reward; trade Grotesque Splinters with the Gargoyle in a Dojo.",
    source: "Warframe.com Operation: Gargoyle's Cry"
  },
  "/Lotus/Types/AvatarImages/Warframes/Cyte09SupporterGlyph": {
    text: "Included in the 1999 Cyte-09 Bullseye Bundle, purchasable for real-world currency.",
    source: "Warframe.com Update 38: Warframe: 1999"
  },
  "/Lotus/Upgrades/Skins/CaliberChicks/AshGeminiCaliberChicksRifleSkin": {
    text: "Purchase with Emerald Talents from the secret vendor in Pontis Tower.",
    source: "Warframe.com Update 43: Jade Shadows: Constellations"
  },
  "/Lotus/Upgrades/Skins/Weapons/Daggers/AshGeminiDaggerSkin": {
    text: "Purchase with Emerald Talents from the secret vendor in Pontis Tower.",
    source: "Warframe.com Update 43: Jade Shadows: Constellations"
  },
  "/Lotus/Upgrades/Skins/Weapons/Throwable/AshGeminiKunaiSkin": {
    text: "Purchase with Emerald Talents from the secret vendor in Pontis Tower.",
    source: "Warframe.com Update 43: Jade Shadows: Constellations"
  },
  "/Lotus/Upgrades/Skins/Weapons/LongGuns/AshGeminiVectisSkin": {
    text: "Purchase with Emerald Talents from the secret vendor in Pontis Tower.",
    source: "Warframe.com Update 43: Jade Shadows: Constellations"
  },
  "/Lotus/Upgrades/Skins/Weapons/Claws/GarudaGeminiClawsSkin": {
    text: "Purchase with Crimson Talents from the secret vendor in Pontis Tower.",
    source: "Warframe.com Update 43: Jade Shadows: Constellations"
  },
  "/Lotus/Upgrades/Skins/Koumei/KoumeiWarfanSkin": {
    text: "Included in the free Ambimanus Pack awarded for logging into the Nintendo Switch 2 version of Warframe during its launch promotion.",
    source: "Warframe.com Warframe on Switch 2 Available Now"
  },
  "/Lotus/Upgrades/Skins/Sigils/TwitchPromo2021Sigil": {
    text: "Available from Varzia in Maroo's Bazaar on Mars through Prime Resurgence; acquired for Aya.",
    source: "Warframe.com Verv Collection Re-release"
  },
  "/Lotus/Upgrades/Skins/Clan/TwitchPromo2021BadgeItem": {
    text: "Available from Varzia in Maroo's Bazaar on Mars through Prime Resurgence; acquired for Aya.",
    source: "Warframe.com Verv Collection Re-release"
  },
  "/Lotus/Upgrades/Skins/Kubrows/Armor/Twitch2021IfritKubrowArmor": {
    text: "Available from Varzia in Maroo's Bazaar on Mars through Prime Resurgence; acquired for Aya.",
    source: "Warframe.com Verv Collection Re-release"
  },
  "/Lotus/Upgrades/Skins/Sigils/TwitchProminenceSigil": {
    text: "Available from Varzia in Maroo's Bazaar on Mars through Prime Resurgence; acquired for Aya.",
    source: "Warframe.com Verv Collection Re-release"
  },
  "/Lotus/Upgrades/Skins/Catbrows/Armor/Twitch2021MyrdinCatbrowArmor": {
    text: "Available via Varzia's wares in Maroo's Bazaar through Prime Resurgence; acquired for Aya.",
    source: "Warframe.com Verv Collection Re-release 2"
  },
  "/Lotus/Types/AvatarImages/AvatarImageLokiActionTwitch": {
    text: "Available via Varzia's wares in Maroo's Bazaar through Prime Resurgence; acquired for Aya.",
    source: "Warframe.com Verv Collection Re-release 2"
  },
  "/Lotus/Upgrades/Skins/Promo/Twitch/AkjagaraIridosSkin": {
    text: "Available from Varzia's store in Maroo's Bazaar on Mars through Prime Resurgence; acquired for Aya.",
    source: "Warframe.com Iridos Collection Re-release"
  },
  "/Lotus/Upgrades/Skins/Promo/Twitch/OgrisTwitchSkin": {
    text: "Available from Varzia's store in Maroo's Bazaar on Mars through Prime Resurgence; acquired for Aya.",
    source: "Warframe.com Iridos Collection Re-release"
  },
  "/Lotus/Upgrades/Skins/Promo/Twitch/PyranaTwitchSkin": {
    text: "Available from Varzia's store in Maroo's Bazaar on Mars through Prime Resurgence; acquired for Aya.",
    source: "Warframe.com Iridos Collection Re-release"
  },
  "/Lotus/Upgrades/Skins/Promo/Twitch/ExcaliburTwitchSkin": {
    text: "Available from Varzia's store in Maroo's Bazaar on Mars through Prime Resurgence; acquired for Aya.",
    source: "Warframe.com Iridos Collection Re-release"
  },
  "/Lotus/Upgrades/Skins/Promo/Twitch/TwitchAnkyros": {
    text: "Available from Varzia's store in Maroo's Bazaar on Mars through Prime Resurgence; acquired for Aya.",
    source: "Warframe.com Iridos Collection Re-release"
  },
  "/Lotus/Upgrades/Skins/Promo/Void/AkvastosVoidSkin": {
    text: "Originally awarded as a crafting reward during the Steam Winter Sale 2013; currently unavailable, but tradeable through Steam.",
    source: "WARFRAME Wiki Phased Skins"
  },
  "/Lotus/Upgrades/Skins/Promo/Void/AnkyrosVoidSkin": {
    text: "Originally awarded as a crafting reward during the Steam Winter Sale 2013; currently unavailable, but tradeable through Steam.",
    source: "WARFRAME Wiki Phased Skins"
  },
  "/Lotus/Upgrades/Skins/Horse/ErsatzHorseTailDefaultA": {
    text: "Purchase the Aetigo Kaithe Pedigree, which includes this tail, or buy the tail individually with Platinum in Teshin's Cave or the in-game Market.",
    source: "Warframe.com The Duviri Paradox"
  },
  "/Lotus/Upgrades/Skins/Excalibur/ExcaliburPrimeAlabasterSkin": {
    text: "No longer obtainable; this was a short-lived test skin released by mistake for Excalibur Prime.",
    source: "WARFRAME Wiki Excalibur Prime"
  },
  "/Lotus/Upgrades/Skins/Sigils/Community10YearAnniversarySigil": {
    text: "Awarded to the top 10 winners of the 10 Year Anniversary Community Showcase contest.",
    source: "Warframe Forums 10 Year Anniversary Community Showcase"
  },
  "/Lotus/Upgrades/Skins/Sony/ObsidianAkmagnus": {
    text: "Included in the PlayStation Plus Booster Pack II.",
    source: "Warframe.com PlayStation Plus Booster Pack II"
  },
  "/Lotus/Upgrades/Skins/Scarves/EnergyScarfVoidSkin": {
    text: "Originally awarded as a crafting reward during the Steam Winter Sale 2013; currently unavailable, but tradeable through Steam.",
    source: "WARFRAME Wiki Phased Skins"
  },
  "/Lotus/Upgrades/Skins/Sigils/NightwaveCalibanDeluxeSigil": {
    text: "Reward from Nightwave: Nora's Mix: Time Tempests.",
    source: "Warframe.com Nightwave: Time Tempests"
  },
  "/Lotus/Upgrades/Skins/Ninja/NinjaDeluxeHelmet": {
    text: "Included with the Ash Koga Skin; purchase the Ash Koga Skin from the in-game Market.",
    source: "ExportCustoms additionalItems + Warframe.com The Glast Gambit"
  },
  "/Lotus/Upgrades/Skins/Ninja/AshDeluxeHelmet": {
    text: "Included with the Ash Shroud Skin; purchase the Ash Shroud Skin from the in-game Market or the Ash Shroud Collection.",
    source: "ExportCustoms additionalItems + WARFRAME Wiki Ash Shroud Collection"
  },
  "/Lotus/Upgrades/Skins/Brawler/AtlasDeluxeHelmet": {
    text: "Included with the Atlas Karst Skin; purchase the Atlas Karst Skin from the in-game Market or the Atlas Karst Collection.",
    source: "ExportCustoms additionalItems + Warframe.com Atlas Karst Collection"
  },
  "/Lotus/Upgrades/Skins/Decree/BansheeDeluxeHelmet": {
    text: "Included with the Banshee Soprana Skin; purchase the Banshee Soprana Skin from the in-game Market.",
    source: "ExportCustoms additionalItems + Warframe.com Update 18.9"
  },
  "/Lotus/Upgrades/Skins/Decree/BansheeDeluxeArmLeftArmor": {
    text: "Included with the Banshee Soprana Skin; purchase the Banshee Soprana Skin from the in-game Market.",
    source: "ExportCustoms additionalItems + Warframe.com Update 18.9"
  },
  "/Lotus/Upgrades/Skins/Pacifist/BaruukDeluxeHelmet": {
    text: "Included with the Baruuk Doan Skin; purchase the Baruuk Doan Skin from the in-game Market or the Baruuk Doan Collection.",
    source: "ExportCustoms additionalItems + Warframe.com The Duviri Paradox"
  },
  "/Lotus/Upgrades/Skins/Operator/Tattoos/TattooNightwaveCommando": {
    text: "Reward from Nightwave: Nora's Mix Vol. 8.",
    source: "Warframe.com Nightwave: Nora's Mix Vol. 8"
  },
  "/Lotus/Upgrades/Skins/Volt/WF1999VoltAuxHat": {
    text: "Included with the Amir Gemini Skin, available for Platinum in the 1999 Gemini Pact Collection and related 1999 collections.",
    source: "Warframe.com Update 38: Warframe: 1999"
  },
  "/Lotus/Upgrades/Skins/Operator/Skirts/SkirtAthletic": {
    text: "Included with the Athletic Drifter/Operator Collection; the collection and individual pieces are available for Platinum in the in-game Market.",
    source: "Warframe.com Update 38: Warframe: 1999"
  },
  "/Lotus/Upgrades/Skins/Operator/Leggings/LeggingsAthletic": {
    text: "Included with the Athletic Drifter/Operator Collection; the collection and individual pieces are available for Platinum in the in-game Market.",
    source: "Warframe.com Update 38: Warframe: 1999"
  },
  "/Lotus/Upgrades/Skins/Operator/BodySuits/BodySuitAthletic": {
    text: "Included with the Athletic Drifter/Operator Collection; the collection and individual pieces are available for Platinum in the in-game Market.",
    source: "Warframe.com Update 38: Warframe: 1999"
  },
  "/Lotus/Upgrades/Skins/Operator/Sleeves/SleevesAthletic": {
    text: "Included with the Athletic Drifter/Operator Collection; the collection and individual pieces are available for Platinum in the in-game Market.",
    source: "Warframe.com Update 38: Warframe: 1999"
  },
  "/Lotus/Upgrades/Skins/PaxDuviricus/PaxDuviricusBodyBlades": {
    text: "Included in the Kullervo Apostate Collection, available from the in-game Market.",
    source: "Warframe.com Update 38.6: Yareli Prime"
  },
  "/Lotus/Upgrades/Skins/Decree/BansheeVoidShellHelmet": {
    text: "Included with the Banshee Voidshell Skin in the Banshee Voidshell Collection; available from the in-game Market.",
    source: "ExportCustoms additionalItems + WARFRAME Wiki Void Adornment Bundle VI"
  },
  "/Lotus/Upgrades/Skins/Decree/BansheeVoidShellArmLeftArmor": {
    text: "Included with the Banshee Voidshell Skin in the Banshee Voidshell Collection; available from the in-game Market.",
    source: "ExportCustoms additionalItems + WARFRAME Wiki Void Adornment Bundle VI"
  },
  "/Lotus/Upgrades/Skins/Kubrows/Armor/TnBoltorKubrowArmor": {
    text: "Reward from Nightwave: Nora's Mix Vol. 8.",
    source: "Warframe.com Nightwave: Nora's Mix Vol. 8"
  },
  "/Lotus/Upgrades/Skins/Sony/ObsidianBoltor": {
    text: "Included in the PlayStation Plus Booster Pack IV.",
    source: "Warframe.com PlayStation Plus Booster Pack IV"
  },
  "/Lotus/Types/AvatarImages/AvatarImageOctaviaActionTwitch": {
    text: "Available from Varzia's store in Maroo's Bazaar on Mars through Prime Resurgence; acquired for Aya.",
    source: "Warframe.com Iridos Collection Re-release"
  },
  "/Lotus/Upgrades/Skins/Promo/Microsoft/JadeDexFuris": {
    text: "Xbox 6th Anniversary Alert #3 reward.",
    source: "Warframe.com 6th Anniversary on Xbox"
  },
  "/Lotus/Upgrades/Skins/Promo/Microsoft/JadeDexDakra": {
    text: "Xbox 6th Anniversary Alert #4 reward.",
    source: "Warframe.com 6th Anniversary on Xbox"
  },
  "/Lotus/Upgrades/Skins/Promo/Nintendo/NintendoAklatoSkin": {
    text: "Included in the Nintendo Switch-exclusive Esteem Pack V.",
    source: "Warframe.com Esteem Pack V Available Now"
  },
  "/Lotus/Upgrades/Skins/Promo/Seasonal/CandyCaneScytheSkin": {
    text: "Available for 1 Credit in the in-game Market during the Winter holiday sale.",
    source: "Warframe.com Winter in Warframe"
  },
  "/Lotus/Upgrades/Skins/Promo/PCGamer/PCGamerDarkSwordDaggerHybridSkin": {
    text: "Redeem the PCGamingShow2016 promo code.",
    source: "Warframe Forums Free Promocodes and Content Creator Glyphs"
  },
  "/Lotus/Types/Restoratives/Conservation/Deimos/InfestedNexiferaLureGearItem": {
    text: "Purchase from Son in the Necralisk on Deimos for Entrati Standing.",
    source: "WARFRAME Wiki Echo-Lure acquisition"
  },
  "/Lotus/Types/Restoratives/Conservation/Deimos/InfestedNexiferaRarityBoost": {
    text: "Purchase from Son in the Necralisk on Deimos for Entrati Standing.",
    source: "WARFRAME Wiki Echo-Lure acquisition"
  },
  "/Lotus/Types/AvatarImages/AvatarImageWinter2018A": {
    text: "Available in the Winter Glyph Pack in the in-game Market during the Winter Solstice seasonal sale.",
    source: "Warframe.com Winter Solstice 2018"
  },
  "/Lotus/Types/AvatarImages/AvatarImageWinter2018B": {
    text: "Available in the Winter Glyph Pack in the in-game Market during the Winter Solstice seasonal sale.",
    source: "Warframe.com Winter Solstice 2018"
  },
  "/Lotus/Types/AvatarImages/AvatarImageWinter2018C": {
    text: "Available in the Winter Glyph Pack in the in-game Market during the Winter Solstice seasonal sale.",
    source: "Warframe.com Winter Solstice 2018"
  },
  "/Lotus/Types/AvatarImages/AvatarImageWinter2018D": {
    text: "Available in the Winter Glyph Pack in the in-game Market during the Winter Solstice seasonal sale.",
    source: "Warframe.com Winter Solstice 2018"
  },
  "/Lotus/Types/AvatarImages/AvatarImageWinter2018E": {
    text: "Available in the Winter Glyph Pack in the in-game Market during the Winter Solstice seasonal sale.",
    source: "Warframe.com Winter Solstice 2018"
  },
  "/Lotus/Types/AvatarImages/ImageEightYearAnniversary": {
    text: "Redeem the Year 8 Anniversary Glyph promo code.",
    source: "Warframe Forums Free Promocodes and Content Creator Glyphs"
  },
  "/Lotus/Types/AvatarImages/ImageNineYearAnniversary": {
    text: "Redeem the NineYear22 promo code.",
    source: "Warframe Forums Free Promocodes and Content Creator Glyphs"
  },
  "/Lotus/Types/AvatarImages/AvatarImageJadeInActionGlyph": {
    text: "Included in the Jade Chorus Pack, a one-time real-money purchase.",
    source: "Warframe.com Jade Chorus Pack"
  },
  "/Lotus/Types/AvatarImages/AvatarImageConqueraOrdis": {
    text: "Bonus in-game glyph included with the Conquera IV Collection from the Official Warframe Store.",
    source: "Warframe.com All-New Conquera 2024 Merch for QTCC"
  },
  "/Lotus/Types/AvatarImages/ImageCalibanInAction": {
    text: "Rewarded by a Gift of the Lotus Alert during the February 2022 community-stream alerts.",
    source: "Warframe Forums Community Stream Schedule: February 21 - February 25"
  },
  "/Lotus/Types/AvatarImages/AvatarImageHarrowAction": {
    text: "Rewarded by a special Alert during Darvo Deals Returns (August 3\u201310, 2022).",
    source: "Warframe.com Darvo Deals Returns"
  },
  "/Lotus/Types/AvatarImages/AvatarImageOctaviaAction": {
    text: "Rewarded by a special Alert during Darvo Deals Returns (August 3\u201310, 2022).",
    source: "Warframe.com Darvo Deals Returns"
  },
  "/Lotus/Types/AvatarImages/AvatarImageSevagothAction": {
    text: "Rewarded by Alert 4 of the Whispers in the Walls Alerts (December 13\u201320, 2023).",
    source: "Warframe.com Whispers in the Walls Alerts"
  },
  "/Lotus/Types/AvatarImages/KahlSupporterPackGlyph": {
    text: "Included in the Veilbreaker Warrior Supporter Pack.",
    source: "Warframe.com Veilbreaker"
  },
  "/Lotus/Types/AvatarImages/KahlStatueGlyph": {
    text: "Included with the Kahl-175 Statue from The New War Merch 2.0 pre-order.",
    source: "Warframe.com Pre-order The New War Merch 2.0"
  },
  "/Lotus/Types/AvatarImages/AvatarImageTennoVIP2Glyph": {
    text: "Included in the TennoVIP 2025 attendee bundle for the in-person PAX East 2025 event.",
    source: "Warframe.com Devstream 188 and TennoVIP at PAX East 2025"
  },
  "/Lotus/Types/AvatarImages/AvatarImageExcaliburActionSony": {
    text: "Available for 1 Credit in the PlayStation in-game Market during the PlayStation anniversary celebration.",
    source: "Warframe.com 5 Year Anniversary"
  },
  "/Lotus/Types/AvatarImages/AvatarImageExcaliburActionNintendo": {
    text: "Available for 1 Credit in the Nintendo Switch in-game Market during the Switch anniversary celebration.",
    source: "Warframe.com 3 Years on Nintendo Switch"
  },
  "/Lotus/Types/AvatarImages/AvatarImageDrakeRifle": {
    text: "Included in the PlayStation Plus Booster Pack VI.",
    source: "Warframe.com PlayStation Plus Booster Pack VI"
  },
  "/Lotus/Types/AvatarImages/AvatarImageStalkerAction": {
    text: "Nightwave: Nora's Mix Vol. 7 rank 17 reward.",
    source: "Warframe.com Nightwave: Nora's Mix Vol. 7"
  },
  "/Lotus/Upgrades/Skins/Operator/Accessories/StalkerAccessoriesMask": {
    text: "Nightwave: Nora's Mix Vol. 7 rank 4 reward.",
    source: "Warframe.com Nightwave: Nora's Mix Vol. 7"
  },
  "/Lotus/Upgrades/Skins/Operator/Accessories/StalkerAccessoriesNose": {
    text: "Nightwave: Nora's Mix Vol. 7 rank 22 reward.",
    source: "Warframe.com Nightwave: Nora's Mix Vol. 7"
  },
  "/Lotus/Upgrades/Skins/Operator/Accessories/StalkerAccessoriesEarpiece": {
    text: "Nightwave: Nora's Mix Vol. 7 rank 28 reward.",
    source: "Warframe.com Nightwave: Nora's Mix Vol. 7"
  },
  "/Lotus/Upgrades/Skins/Sony/PS4Braton": {
    text: "Originally included in the PlayStation 4 Ultimate Fan Pack pre-order bonus; no longer obtainable through that promotion.",
    source: "PlayStation Blog Warframe PS4 Pre-order Bonuses Detailed"
  },
  "/Lotus/Upgrades/Skins/Sony/PS4Mk1Braton": {
    text: "Originally included in the PlayStation 4 Ultimate Fan Pack pre-order bonus; no longer obtainable through that promotion.",
    source: "PlayStation Blog Warframe PS4 Pre-order Bonuses Detailed"
  },
  "/Lotus/Upgrades/Skins/Armor/WarframeDefaults/SWSonorityArmLeftArmor": {
    text: "Included with the TennoGen Banshee Sonority Skin; obtain the skin through the Steam/TennoGen Market (or the console Market equivalent).",
    source: "Warframe.com Shrine of the Eidolon Hotfix 22.17.4"
  },
  "/Lotus/Upgrades/Skins/Clan/OrbBadgeItem": {
    text: "Operation: Buried Debts reward at 5 Thermia Fracture points; the operation is currently unavailable.",
    source: "Warframe.com Operation: Buried Debts + Warframe Wiki Operation: Buried Debts"
  },
  "/Lotus/Upgrades/Skins/Sigils/OrbSigil": {
    text: "Earn by sealing 75 Thermia Fractures during the periodically recurring Thermia Fractures event.",
    source: "Warframe Wiki Sigils + Warframe Wiki Operation: Buried Debts"
  },
  "/Lotus/Upgrades/Skins/Sigils/EventSigilShadowgrapher": {
    text: "Reward from Operation: Atramentum, exchanged for Nightmare Tatters at Aspirant Zorba; the operation is currently unavailable.",
    source: "Warframe.com Operation: Atramentum is Live"
  },
  "/Lotus/Upgrades/Skins/Clan/Community10YearEmblemItem": {
    text: "Awarded for completing the missions in at least three of the five Recall: Ten-Zero weekly Alert sets; the event is currently unavailable.",
    source: "Warframe Steam Community Announcements Recall: Ten-Zero"
  },
  "/Lotus/Upgrades/Skins/Sigils/LotusHeartSigil": {
    text: "Purchase from the in-game Market for 1 Credit.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/OpticorConclaveVariantSigil": {
    text: "Purchase from Teshin using Conclave Standing.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/SyndicateSigilConclaveA": {
    text: "Purchase from Teshin using Conclave Standing.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/ConqueraSigil": {
    text: "Redeem the promo code Conquer; the code was retired after November 2, 2020.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/WolfSigil": {
    text: "Nightwave: Series 1 \u2014 The Wolf of Saturn Six rank 1 reward; it may also appear in Nightwave Cred Offerings.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/NoraSeasonTwoSigil": {
    text: "Nightwave: Series 2 \u2014 The Emissary rank 2 reward; it may also appear in Nightwave Cred Offerings.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/GlassmakerSigil": {
    text: "Nightwave: Series 3 \u2014 Glassmaker rank 2 reward; it may also appear in Nightwave Cred Offerings.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/DuvDragonSigil": {
    text: "Nightwave: Nora's Mix Volume 4 rank 2 reward; it may also appear in Nightwave Cred Offerings.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/NWStalkerSigil": {
    text: "Nightwave: Nora's Mix Volume 7 rank 2 reward; it may also appear in Nightwave Cred Offerings.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/KelaEventSigil": {
    text: "Operation: Rathuum reward for collecting at least 10 Judgment Points; the operation is currently unavailable.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/EventSigilIndex": {
    text: "The Index Preview reward for achieving a score of at least 100 in a High Risk match; the event is currently unavailable.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/ConclaveTacAlertSigilA": {
    text: "Reward from the first phase of the Quick Steel Conclave Alert in February 2017; the alert is currently unavailable.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/EventSigilAmalgam": {
    text: "Awarded for completing the second mission of Operation: Hostile Mergers; the operation is currently unavailable.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/FortunaSigil": {
    text: "Redeem the promo code SOLARISUNITED; the code was retired in early 2019.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/OstronCommunitySigil": {
    text: "Gifted to PC players who logged in from October 25 through November 1, 2017; the promotion is over.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/DawnsEarlyLightSigil": {
    text: "Earned during The Great Eidolon Hunt by watching a Warframe stream while the streamer completed the By the Dawn's Early Light achievement; the event is over.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/FounderSigilDisciple": {
    text: "Granted to players who purchased the Founder Disciple package; the Founders program is closed.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/FounderSigilHunter": {
    text: "Granted to players who purchased the Founder Hunter package; the Founders program is closed.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/FounderSigilMaster": {
    text: "Granted to players who purchased the Founder Master package; the Founders program is closed.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/FounderSigilGrandMaster": {
    text: "Granted to players who purchased the Founder Grand Master package; the Founders program is closed.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/MasteryStoneSigil": {
    text: "Purchase from the in-game Market for 1 Credit.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/HolidaySigilXmas2014D": {
    text: "Reward from one of the Christmas-themed Tactical Alerts that ran in December 2014; the alerts are currently unavailable.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/HolidaySigilXmas2014B": {
    text: "Reward from one of the Christmas-themed Tactical Alerts that ran in December 2014; the alerts are currently unavailable.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/HolidaySigilXmas2014C": {
    text: "Reward from one of the Christmas-themed Tactical Alerts that ran in December 2014; the alerts are currently unavailable.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/HolidaySigilXmas2014A": {
    text: "Reward from one of the Christmas-themed Tactical Alerts that ran in December 2014; the alerts are currently unavailable.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/EnergySigilA": {
    text: "Reward from the Escalation phase of eligible Tactical Alerts, including Phoenix Intercept, Emergency Exit, Project Undermine, and Proxy Rebellion; it was also a Nightwave Intermission I rank-up reward.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/TennoLivePromoSigil": {
    text: "Given to attendees of TennoLive, TennoVIP, or TennoCon events; the specific event promotion is no longer active.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/TennoGenSigil": {
    text: "Awarded to players whose TennoGen skin was implemented in the game.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/RadioLegionSigil": {
    text: "Nightwave: Intermission III rank 8 reward; it may also appear in Nightwave Cred Offerings.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/StarterPackASigil": {
    text: "Included in an earlier Warframe Starter Pack; that pack was discontinued on June 25, 2019.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/StarterPackLotusSigil": {
    text: "Included in the previous Starter Pack from June 25, 2019 through August 25, 2020; that pack is no longer available.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/KuvaLichSigil": {
    text: "Awarded after successfully defeating a Kuva Lich by converting it.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/CorpusLichSigil": {
    text: "Awarded after successfully defeating a Sister of Parvos by converting her.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/ScarSigil": {
    text: "Reward for completing The Second Dream quest.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/Winter2016Sigil": {
    text: "Gifted to all Tenno during December 2016 after the first Tennobaum donation milestone was reached.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/WikiaSigil": {
    text: "Awarded to administrators and moderators of the Warframe Wiki.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/TranslatorSigil": {
    text: "Awarded to players who contributed to Warframe translations.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Dragon/ChromaDeluxeHelmet": {
    text: "Part of the Chroma Dynasty Skin; purchase the skin from the in-game Market for 165 Platinum, or as part of the Chroma Dynasty Collection for 225 Platinum.",
    source: "Warframe Wiki Chroma Dynasty Skin"
  },
  "/Lotus/Upgrades/Skins/Dragon/ChromaDeluxeWings": {
    text: "Optional wings included with the Chroma Dynasty Skin; purchase the skin from the in-game Market for 165 Platinum, or as part of the Chroma Dynasty Collection for 225 Platinum.",
    source: "Warframe Wiki Chroma Dynasty Skin"
  },
  "/Lotus/Upgrades/Skins/Armor/WarframeDefaults/SWBansheeBotLArmLeftArmor": {
    text: "Included with the Banshee Blade of the Lotus Skin; on PC the skin is purchased through Steam/TennoGen, while on consoles it is purchased from the in-game Marketplace for 165 Platinum.",
    source: "Warframe Wiki Banshee Blade of the Lotus Skin"
  },
  "/Lotus/Upgrades/Skins/Sentient/CalibanDeluxeHelmet": {
    text: "Part of the Caliban Orfeo Skin; purchase the skin from the in-game Market for 165 Platinum, or as part of the Caliban Orfeo Collection for 315 Platinum.",
    source: "Warframe Wiki Caliban Orfeo Skin"
  },
  "/Lotus/Upgrades/Skins/Sentient/CalibanDeluxeAuxFloater": {
    text: "Optional auxiliary included with the Caliban Orfeo Skin; purchase the skin from the in-game Market for 165 Platinum, or as part of the Caliban Orfeo Collection for 315 Platinum.",
    source: "Warframe Wiki Caliban Orfeo Skin"
  },
  "/Lotus/Upgrades/Skins/Pacifist/BaruukPrimeHelmet": {
    text: "Standard issue helmet included with Baruuk Prime; acquire Baruuk Prime through its Void Relics or Prime Access/Prime Resurgence offerings.",
    source: "Warframe Wiki Baruuk/Prime + local export description"
  },
  "/Lotus/Upgrades/Skins/Sentient/CalibanPrimeHelmet": {
    text: "Standard issue helmet included with Caliban Prime; acquire Caliban Prime through its Void Relics or Prime Access/Prime Resurgence offerings.",
    source: "Warframe Wiki Caliban Prime + local export description"
  },
  "/Lotus/Upgrades/Skins/Necramech/ThanomechVoidRigDefaultHelmet": {
    text: "Standard issue helmet included with Bonewidow; acquire Bonewidow through Necraloid Standing or the in-game Market.",
    source: "Warframe Wiki Bonewidow + local export description"
  },
  "/Lotus/Upgrades/Skins/Dragon/ChromaLNYHelmet": {
    text: "Part of Chroma's Zunlong Skin; the Lunar New Year 2024 announcement listed the skin for individual purchase in the in-game Market and in the Dragon Stone Bundle.",
    source: "Warframe Steam Community Announcements Lunar New Year 2024"
  },
  "/Lotus/Upgrades/Skins/Dragon/ChromaLNYWings": {
    text: "Optional wings included with Chroma's Zunlong Skin; the Lunar New Year 2024 announcement listed the skin for individual purchase in the in-game Market and in the Dragon Stone Bundle.",
    source: "Warframe Steam Community Announcements Lunar New Year 2024 + Warframe Wiki Chroma/Equip"
  },
  "/Lotus/Upgrades/Skins/Sigils/EventSigilZorba": {
    text: "Purchase from Aspirant Zorba with Nightmare Tatters during Operation: Atramentum; the operation ended on April 30, 2026.",
    source: "Warframe.com Operation: Atramentum is Live"
  },
  "/Lotus/Upgrades/Skins/Sigils/NightwavePizzaSigil": {
    text: "Nightwave: Nora's Mix Volume 8 rank 2 reward; it may also appear in Nightwave Cred Offerings.",
    source: "Warframe Wiki Sigils"
  },
  "/Lotus/Upgrades/Skins/Sigils/EventSigilCaviaBirdThree": {
    text: "Returning reward available from Aspirant Zorba during Operation: Atramentum, purchased with Nightmare Tatters; the operation ended on April 30, 2026.",
    source: "Warframe.com Operation: Atramentum is Live"
  },
  "/Lotus/Upgrades/Skins/Sigils/BladeAndGunSigil": {
    text: "Awarded to the winners of the Blade and Gun Challenges hosted on the Warframe Forums; the challenges are over.",
    source: "Warframe Wiki Sigils"
  }
};

// src-tauri/data/assets/data/wiki-prime-relic-drops.json
var wiki_prime_relic_drops_default = {
  "Ash Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 15,
        Drops: {
          "Lith V8": "Common",
          "Axi B1": "Common",
          "Vanguard M1": "Common",
          "Neo N4": "Common",
          "Meso V2": "Common",
          "Axi K12": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Lith V7": "Uncommon",
          "Meso S3": "Uncommon",
          "Vanguard E1": "Uncommon",
          "Meso C1": "Uncommon",
          "Axi I3": "Uncommon",
          "Lith S3": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 65,
        Drops: {
          "Neo N5": "Uncommon",
          "Axi N1": "Rare",
          "Axi A7": "Rare",
          "Neo A10": "Rare",
          "Vanguard C1": "Uncommon"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 25,
        Drops: {
          "Meso N2": "Uncommon",
          "Meso V4": "Uncommon",
          "Neo V4": "Uncommon",
          "Neo A4": "Uncommon",
          "Neo N3": "Uncommon",
          "Axi N2": "Uncommon",
          "Meso P12": "Uncommon",
          "Vanguard P1": "Common"
        }
      }
    }
  },
  "Vauban Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 25,
        Drops: {
          "Lith V4": "Rare",
          "Meso V4": "Rare",
          "Neo A4": "Common",
          "Axi V1": "Rare",
          "Meso T6": "Uncommon",
          "Neo V6": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 65,
        Drops: {
          "Axi F1": "Uncommon",
          "Neo V2": "Rare",
          "Meso V6": "Uncommon",
          "Lith F2": "Rare"
        }
      },
      "Systems Blueprint": {
        DucatValue: 100,
        Drops: {
          "Lith V8": "Rare",
          "Neo N2": "Rare",
          "Lith V2": "Rare",
          "Lith V9": "Rare"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 100,
        Drops: {
          "Meso N2": "Rare",
          "Lith V7": "Rare",
          "Meso V8": "Rare",
          "Neo V3": "Rare",
          "Neo V5": "Rare"
        }
      }
    }
  },
  "Trumna Prime": {
    IsVaulted: false,
    Parts: {
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Meso Y1": "Common",
          "Neo Y1": "Common",
          "Lith Q2": "Common",
          "Axi P9": "Common",
          "Lith K12": "Common",
          "Neo W2": "Common",
          "Meso V15": "Common",
          "Meso P16": "Common"
        }
      },
      Barrel: {
        DucatValue: 100,
        Drops: {
          "Meso T8": "Rare",
          "Axi T13": "Rare",
          "Lith T14": "Rare",
          "Meso T7": "Rare"
        }
      },
      Receiver: {
        DucatValue: 100,
        Drops: {
          "Neo T11": "Rare",
          "Neo T10": "Rare",
          "Neo T9": "Rare",
          "Axi T12": "Rare"
        }
      },
      Stock: {
        DucatValue: 45,
        Drops: {
          "Neo P10": "Uncommon",
          "Lith Y1": "Uncommon",
          "Meso V14": "Uncommon",
          "Lith N16": "Uncommon",
          "Meso G9": "Uncommon",
          "Meso L5": "Uncommon"
        }
      }
    }
  },
  "Masseter Prime": {
    IsVaulted: true,
    Parts: {
      Handle: {
        DucatValue: 15,
        Drops: {
          "Neo G10": "Common",
          "Meso N17": "Common",
          "Lith A6": "Common",
          "Lith S16": "Common",
          "Lith C10": "Common",
          "Axi F2": "Common",
          "Meso K7": "Common",
          "Lith G13": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Axi P6": "Uncommon",
          "Neo G9": "Uncommon",
          "Meso E6": "Uncommon",
          "Lith W4": "Uncommon",
          "Lith A8": "Uncommon",
          "Meso A11": "Uncommon",
          "Neo P6": "Uncommon",
          "Axi G12": "Uncommon"
        }
      },
      Blade: {
        DucatValue: 100,
        Drops: {
          "Lith M9": "Rare",
          "Meso M4": "Rare",
          "Neo M6": "Rare",
          "Neo M5": "Rare",
          "Lith M10": "Rare",
          "Axi M6": "Rare"
        }
      }
    }
  },
  "Yareli Prime": {
    IsVaulted: false,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 15,
        Drops: {
          "Neo V12": "Common",
          "Neo V11": "Common",
          "Lith A10": "Common",
          "Meso X1": "Common",
          "Neo A16": "Common",
          "Lith Z4": "Common"
        }
      },
      "Systems Blueprint": {
        DucatValue: 100,
        Drops: {
          "Axi Y1": "Rare",
          "Neo Y1": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Neo T11": "Uncommon",
          "Meso D8": "Uncommon",
          "Neo A14": "Uncommon",
          "Meso P17": "Uncommon"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 100,
        Drops: {
          "Axi Y3": "Rare",
          "Lith Y1": "Rare",
          "Meso Y2": "Rare",
          "Meso Y1": "Rare",
          "Axi Y2": "Rare"
        }
      }
    }
  },
  "Caliban Prime": {
    IsVaulted: false,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 15,
        Drops: {
          "Meso Y1": "Common",
          "Axi P10": "Common",
          "Lith K12": "Common",
          "Meso V15": "Common",
          "Vanguard P1": "Common"
        }
      },
      Blueprint: {
        DucatValue: 25,
        Drops: {
          "Meso V11": "Uncommon",
          "Lith V11": "Uncommon",
          "Meso V13": "Uncommon",
          "Meso V15": "Uncommon",
          "Vanguard M1": "Common"
        }
      },
      "Systems Blueprint": {
        DucatValue: 100,
        Drops: {
          "Axi C10": "Rare",
          "Vanguard C1": "Rare",
          "Neo C8": "Rare",
          "Axi C11": "Rare"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 65,
        Drops: {
          "Vanguard E1": "Uncommon",
          "Neo C7": "Rare",
          "Lith C13": "Rare"
        }
      }
    }
  },
  "Destreza Prime": {
    IsVaulted: true,
    Parts: {
      Blade: {
        DucatValue: 100,
        Drops: {
          "Meso D3": "Rare",
          "Meso D2": "Rare",
          "Axi D2": "Rare",
          "Neo D4": "Rare",
          "Lith D5": "Rare",
          "Axi D1": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Meso R2": "Uncommon",
          "Neo S9": "Uncommon",
          "Axi D3": "Uncommon",
          "Lith P7": "Uncommon",
          "Neo B5": "Uncommon",
          "Lith M4": "Uncommon",
          "Axi P2": "Uncommon",
          "Axi K4": "Uncommon"
        }
      },
      Handle: {
        DucatValue: 15,
        Drops: {
          "Axi O4": "Common",
          "Axi D2": "Common",
          "Meso P6": "Common",
          "Axi M4": "Common",
          "Axi O3": "Common",
          "Meso E2": "Common",
          "Lith L1": "Common",
          "Meso E3": "Common",
          "Axi R2": "Common"
        }
      }
    }
  },
  "Nami Skyla Prime": {
    IsVaulted: true,
    Parts: {
      Handle: {
        DucatValue: 45,
        Drops: {
          "Meso S7": "Uncommon",
          "Meso D3": "Uncommon",
          "Lith C2": "Uncommon",
          "Lith H1": "Uncommon",
          "Neo H3": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Axi L2": "Common",
          "Axi L3": "Common",
          "Meso C3": "Common",
          "Axi V7": "Common",
          "Lith Z2": "Common",
          "Neo A6": "Common"
        }
      },
      Blade: {
        DucatValue: 100,
        Drops: {
          "Neo N10": "Rare",
          "Lith N9": "Rare",
          "Neo N8": "Rare",
          "Axi N5": "Rare"
        }
      }
    }
  },
  "Magnus Prime": {
    IsVaulted: false,
    Parts: {
      Barrel: {
        DucatValue: 100,
        Drops: {
          "Meso M5": "Rare",
          "Axi M5": "Rare",
          "Neo M4": "Rare",
          "Axi M2": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Meso B6": "Common",
          "Axi C7": "Common",
          "Lith H8": "Common",
          "Lith Z3": "Common",
          "Axi K10": "Common",
          "Axi T10": "Common",
          "Neo N18": "Common",
          "Axi S14": "Common",
          "Meso S15": "Common",
          "Axi M5": "Common"
        }
      },
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Neo N22": "Uncommon",
          "Neo T5": "Uncommon",
          "Axi M5": "Uncommon",
          "Neo C2": "Uncommon",
          "Neo C3": "Uncommon",
          "Neo G4": "Uncommon",
          "Neo N19": "Uncommon",
          "Axi T8": "Uncommon"
        }
      }
    }
  },
  "Fulmin Prime": {
    IsVaulted: true,
    Parts: {
      Receiver: {
        DucatValue: 100,
        Drops: {
          "Neo F3": "Rare",
          "Lith F3": "Rare",
          "Neo F2": "Rare",
          "Meso F5": "Rare",
          "Axi F2": "Rare",
          "Axi F3": "Rare"
        }
      },
      Barrel: {
        DucatValue: 15,
        Drops: {
          "Lith G10": "Common",
          "Axi Z2": "Common",
          "Meso P13": "Common",
          "Meso V9": "Common",
          "Axi W4": "Common",
          "Neo K7": "Common",
          "Neo G8": "Common",
          "Neo G7": "Common"
        }
      },
      Stock: {
        DucatValue: 45,
        Drops: {
          "Lith C11": "Uncommon",
          "Axi S19": "Uncommon",
          "Lith C12": "Uncommon",
          "Axi H7": "Uncommon",
          "Lith G8": "Uncommon",
          "Meso V10": "Uncommon",
          "Lith Q1": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Meso H7": "Uncommon",
          "Lith A7": "Uncommon",
          "Neo H4": "Uncommon",
          "Meso A5": "Uncommon",
          "Lith H9": "Uncommon",
          "Axi H8": "Uncommon",
          "Neo O2": "Uncommon"
        }
      }
    }
  },
  "Sybaris Prime": {
    IsVaulted: true,
    Parts: {
      Stock: {
        DucatValue: 15,
        Drops: {
          "Meso A1": "Common",
          "Lith S9": "Common",
          "Lith P1": "Common",
          "Lith N3": "Common",
          "Axi K4": "Common",
          "Axi A15": "Common"
        }
      },
      Barrel: {
        DucatValue: 100,
        Drops: {
          "Axi S6": "Rare",
          "Meso S5": "Rare",
          "Axi S13": "Rare",
          "Lith S7": "Rare",
          "Meso S7": "Rare",
          "Meso S8": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Axi K2": "Common",
          "Meso O6": "Common",
          "Neo N11": "Common",
          "Lith C3": "Common",
          "Meso Z2": "Common",
          "Axi B2": "Common",
          "Neo N8": "Common"
        }
      },
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Neo G3": "Uncommon",
          "Neo N6": "Uncommon",
          "Neo S7": "Uncommon",
          "Neo I3": "Uncommon",
          "Axi C4": "Uncommon"
        }
      }
    }
  },
  Vome: {
    IsVaulted: false,
    Parts: {
      "": {
        DucatValue: 0,
        Drops: {
          "Requiem Eterna": "Common",
          "Requiem II": "Uncommon"
        }
      }
    }
  },
  Forma: {
    IsVaulted: false,
    Parts: {
      Blueprint: {
        DucatValue: 0,
        Drops: {
          "Neo G6": "Common",
          "Meso Z1": "Common",
          "Meso S10": "Common",
          "Meso R4": "Uncommon",
          "Meso V1": "Uncommon",
          "Axi T11": "Common",
          "Lith P9": "Common",
          "Meso G4": "Uncommon",
          "Neo T11": "Common",
          "Meso G2": "Common",
          "Axi P10": "Common",
          "Meso G8": "Uncommon",
          "Axi A21": "Common",
          "Meso O4": "Common",
          "Lith B9": "Common",
          "Meso D1": "Uncommon",
          "Meso B8": "Common",
          "Axi V5": "Common",
          "Meso M5": "Common",
          "Lith K3": "Common",
          "Lith O1": "Uncommon",
          "Axi K1": "Uncommon",
          "Lith C8": "Uncommon",
          "Meso K3": "Uncommon",
          "Lith R1": "Common",
          "Lith G13": "Common",
          "Neo W2": "Uncommon",
          "Axi A5": "Common",
          "Neo G2": "Common",
          "Lith G8": "Common",
          "Meso N4": "Uncommon",
          "Meso O1": "Common",
          "Neo A15": "Common",
          "Lith H8": "Uncommon",
          "Lith V2": "Uncommon",
          "Neo H4": "Common",
          "Neo P10": "Common",
          "Meso P4": "Common",
          "Neo V3": "Uncommon",
          "Axi G11": "Common",
          "Meso A10": "Common",
          "Meso S7": "Common",
          "Meso C7": "Common",
          "Meso B7": "Common",
          "Axi T8": "Common",
          "Neo G3": "Common",
          "Axi V6": "Common",
          "Lith C1": "Uncommon",
          "Axi N13": "Uncommon",
          "Meso T4": "Common",
          "Lith G6": "Common",
          "Axi A17": "Common",
          "Neo G5": "Common",
          "Neo S9": "Uncommon",
          "Lith B7": "Common",
          "Axi I3": "Common",
          "Neo B9": "Common",
          "Meso V14": "Uncommon",
          "Meso P2": "Common",
          "Neo C6": "Uncommon",
          "Neo P6": "Common",
          "Lith T6": "Common",
          "Meso Z3": "Common",
          "Neo G1": "Common",
          "Neo E4": "Common",
          "Meso S5": "Uncommon",
          "Meso V12": "Common",
          "Lith Z4": "Common",
          "Neo N10": "Common",
          "Meso K8": "Uncommon",
          "Axi T12": "Common",
          "Neo E1": "Uncommon",
          "Neo V5": "Uncommon",
          "Meso R6": "Common",
          "Axi G9": "Common",
          "Meso V15": "Uncommon",
          "Meso S8": "Common",
          "Lith A4": "Common",
          "Meso B10": "Common",
          "Axi H4": "Uncommon",
          "Lith G14": "Common",
          "Meso R2": "Common",
          "Axi V14": "Uncommon",
          "Axi M4": "Common",
          "Lith Z1": "Uncommon",
          "Lith A6": "Uncommon",
          "Neo Z1": "Uncommon",
          "Axi T13": "Uncommon",
          "Neo D3": "Uncommon",
          "Meso O3": "Common",
          "Meso V13": "Common",
          "Neo K7": "Common",
          "Meso A9": "Common",
          "Neo N18": "Uncommon",
          "Lith S6": "Common",
          "Meso N8": "Common",
          "Lith E2": "Uncommon",
          "Axi K6": "Common",
          "Lith C13": "Common",
          "Neo Z3": "Common",
          "Meso T1": "Uncommon",
          "Lith K9": "Common",
          "Lith A11": "Common",
          "Axi V11": "Common",
          "Meso D2": "Common",
          "Lith F1": "Common",
          "Axi I1": "Uncommon",
          "Neo A10": "Common",
          "Lith T13": "Common",
          "Meso G1": "Common",
          "Neo S16": "Common",
          "Meso B6": "Uncommon",
          "Lith C10": "Common",
          "Lith G9": "Common",
          "Lith W2": "Common",
          "Neo C9": "Common",
          "Neo Z7": "Common",
          "Axi A22": "Uncommon",
          "Lith D5": "Common",
          "Meso F4": "Common",
          "Lith P1": "Uncommon",
          "Lith B2": "Common",
          "Lith H4": "Common",
          "Axi L2": "Uncommon",
          "Meso K7": "Uncommon",
          "Neo V1": "Common",
          "Neo G8": "Common",
          "Axi G10": "Common",
          "Axi H7": "Uncommon",
          "Meso A8": "Common",
          "Axi C1": "Uncommon",
          "Lith G5": "Uncommon",
          "Neo O1": "Common",
          "Lith W1": "Common",
          "Axi A2": "Common",
          "Neo C7": "Common",
          "Meso C4": "Uncommon",
          "Meso V7": "Common",
          "Neo E3": "Common",
          "Lith T3": "Uncommon",
          "Axi S6": "Common",
          "Axi S15": "Common",
          "Neo T9": "Common",
          "Lith D6": "Common",
          "Axi G12": "Uncommon",
          "Neo P7": "Common",
          "Neo L3": "Common",
          "Lith P4": "Uncommon",
          "Meso P6": "Common",
          "Lith S1": "Uncommon",
          "Meso S12": "Uncommon",
          "Axi T10": "Uncommon",
          "Meso C5": "Uncommon",
          "Axi P5": "Common",
          "Neo Z5": "Uncommon",
          "Axi S20": "Common",
          "Axi H5": "Uncommon",
          "Lith S4": "Common",
          "Neo D4": "Common",
          "Lith K4": "Common",
          "Lith G11": "Common",
          "Neo D2": "Common",
          "Neo T7": "Uncommon",
          "Neo F2": "Common",
          "Lith M3": "Common",
          "Meso L3": "Common",
          "Meso P7": "Common",
          "Meso L2": "Common",
          "Neo C3": "Common",
          "Neo S3": "Uncommon",
          "Lith T5": "Common",
          "Axi S19": "Common",
          "Axi F3": "Common",
          "Lith G4": "Common",
          "Lith T7": "Common",
          "Meso N6": "Common",
          "Neo N15": "Common",
          "Meso N5": "Common",
          "Neo S14": "Common",
          "Meso V3": "Common",
          "Lith W3": "Common",
          "Meso V10": "Common",
          "Axi I2": "Common",
          "Axi V10": "Uncommon",
          "Meso W4": "Uncommon",
          "Neo N2": "Uncommon",
          "Lith N1": "Uncommon",
          "Axi B7": "Common",
          "Axi N11": "Common",
          "Neo S11": "Uncommon",
          "Lith A10": "Common",
          "Lith X1": "Common",
          "Axi B9": "Common",
          "Axi S2": "Uncommon",
          "Neo N19": "Common",
          "Axi A15": "Common",
          "Axi A8": "Uncommon",
          "Axi F1": "Common",
          "Axi V9": "Common",
          "Axi K12": "Common",
          "Axi G14": "Uncommon",
          "Neo N21": "Common",
          "Lith L4": "Common",
          "Lith G3": "Uncommon",
          "Neo S8": "Common",
          "Lith L1": "Common",
          "Lith B3": "Common",
          "Axi L1": "Uncommon",
          "Neo W1": "Uncommon",
          "Axi S1": "Common",
          "Lith M7": "Uncommon",
          "Lith T12": "Uncommon",
          "Neo K8": "Common",
          "Axi D1": "Uncommon",
          "Lith V9": "Common",
          "Neo S6": "Common",
          "Axi V1": "Uncommon",
          "Axi E2": "Uncommon",
          "Axi G3": "Common",
          "Lith B1": "Common",
          "Lith B4": "Common",
          "Neo A1": "Common",
          "Axi G6": "Common",
          "Lith M2": "Uncommon",
          "Meso B3": "Common",
          "Neo N5": "Common",
          "Lith M8": "Common",
          "Lith P2": "Common",
          "Axi S4": "Common",
          "Axi K7": "Common",
          "Neo V7": "Common",
          "Axi O6": "Common",
          "Meso H7": "Uncommon",
          "Meso A2": "Common",
          "Neo N11": "Uncommon",
          "Neo N14": "Common",
          "Axi A18": "Common",
          "Meso W3": "Common",
          "Lith A9": "Common",
          "Axi N3": "Common",
          "Neo C5": "Common",
          "Neo A9": "Common",
          "Meso V2": "Uncommon",
          "Neo S15": "Common",
          "Lith E1": "Common",
          "Axi B8": "Common",
          "Lith P7": "Common",
          "Meso H8": "Common",
          "Axi T2": "Uncommon",
          "Axi W3": "Common",
          "Neo Z8": "Uncommon",
          "Lith Z2": "Common",
          "Meso H5": "Common",
          "Neo P8": "Common",
          "Lith H10": "Common",
          "Neo Z4": "Uncommon",
          "Neo K4": "Common",
          "Lith S18": "Uncommon",
          "Axi A10": "Common",
          "Neo B6": "Common",
          "Neo K9": "Uncommon",
          "Lith K7": "Uncommon",
          "Neo L2": "Common",
          "Neo S20": "Uncommon",
          "Neo T6": "Common",
          "Axi P8": "Uncommon",
          "Meso Z4": "Common",
          "Neo S17": "Common",
          "Neo R2": "Common",
          "Meso V4": "Common",
          "Meso P12": "Common",
          "Axi G5": "Uncommon",
          "Neo A13": "Common",
          "Meso Z5": "Common",
          "Meso S9": "Uncommon",
          "Neo T4": "Common",
          "Lith N19": "Uncommon",
          "Meso N11": "Uncommon",
          "Lith P8": "Uncommon",
          "Lith C4": "Common",
          "Lith A5": "Common",
          "Lith O3": "Common",
          "Neo N1": "Common",
          "Axi P9": "Uncommon",
          "Neo T8": "Common",
          "Axi B5": "Common",
          "Neo M4": "Uncommon",
          "Lith K8": "Common",
          "Meso I2": "Common",
          "Lith H9": "Uncommon",
          "Meso A3": "Uncommon",
          "Neo V2": "Uncommon",
          "Meso O5": "Common",
          "Neo D8": "Uncommon",
          "Neo V6": "Common",
          "Neo S18": "Common",
          "Axi N7": "Uncommon",
          "Meso V6": "Common",
          "Lith S9": "Common",
          "Neo F1": "Uncommon",
          "Neo B3": "Common",
          "Axi Y1": "Common",
          "Neo K3": "Common",
          "Meso W5": "Common",
          "Meso V9": "Common",
          "Axi T6": "Common",
          "Axi S9": "Common",
          "Lith K5": "Common",
          "Lith S17": "Common",
          "Neo T3": "Common",
          "Meso Y1": "Common",
          "Neo S13": "Uncommon",
          "Meso E7": "Common",
          "Neo D7": "Common",
          "Neo P2": "Uncommon",
          "Lith T9": "Common",
          "Neo P5": "Common",
          "Meso B1": "Common",
          "Axi C2": "Common",
          "Lith N10": "Common",
          "Lith B10": "Common",
          "Lith M6": "Common",
          "Meso N1": "Uncommon",
          "Lith F3": "Common",
          "Meso S14": "Common",
          "Axi S14": "Uncommon",
          "Neo Z9": "Common",
          "Meso E6": "Common",
          "Neo A7": "Common",
          "Neo R5": "Common",
          "Neo N8": "Uncommon",
          "Lith A2": "Common",
          "Lith L6": "Common",
          "Meso N7": "Uncommon",
          "Neo N16": "Common",
          "Meso S2": "Uncommon",
          "Lith H5": "Common",
          "Neo V9": "Common",
          "Axi G13": "Common",
          "Axi D4": "Common",
          "Lith V6": "Uncommon",
          "Axi S8": "Common",
          "Meso T3": "Common",
          "Lith P3": "Common",
          "Lith T11": "Common",
          "Neo R1": "Common",
          "Lith L5": "Common",
          "Neo T10": "Common",
          "Axi N1": "Common",
          "Axi V13": "Common",
          "Neo V10": "Common",
          "Axi A4": "Common",
          "Axi M3": "Common",
          "Neo D1": "Uncommon",
          "Meso D4": "Common",
          "Neo S19": "Common",
          "Axi S13": "Common",
          "Neo M5": "Uncommon",
          "Axi S18": "Common",
          "Neo A4": "Common",
          "Axi W2": "Common",
          "Neo C2": "Common",
          "Axi S5": "Uncommon",
          "Axi P6": "Uncommon",
          "Lith N9": "Common",
          "Lith H7": "Uncommon",
          "Lith C14": "Common",
          "Axi W1": "Uncommon",
          "Axi N9": "Common",
          "Axi O3": "Common",
          "Axi K5": "Common",
          "Meso T5": "Common",
          "Meso S13": "Common",
          "Axi T3": "Uncommon",
          "Axi T5": "Uncommon",
          "Meso P15": "Uncommon",
          "Lith C6": "Common",
          "Meso P3": "Uncommon",
          "Lith V8": "Common",
          "Lith D2": "Common",
          "Meso A12": "Common",
          "Lith G1": "Uncommon",
          "Lith G10": "Common",
          "Meso N2": "Uncommon",
          "Meso N9": "Common",
          "Neo D6": "Common",
          "Lith H2": "Common",
          "Axi C6": "Common",
          "Axi G15": "Common",
          "Neo D10": "Common",
          "Meso E3": "Common",
          "Lith K12": "Uncommon",
          "Neo B2": "Uncommon",
          "Neo L4": "Common",
          "Axi V12": "Common",
          "Meso S15": "Common",
          "Neo N4": "Uncommon",
          "Neo A14": "Uncommon",
          "Axi H8": "Common",
          "Axi R4": "Common",
          "Neo A11": "Common",
          "Meso M4": "Uncommon",
          "Axi R2": "Common",
          "Neo N9": "Uncommon",
          "Axi K2": "Common",
          "Lith N4": "Common",
          "Axi C8": "Common",
          "Lith N14": "Uncommon",
          "Lith S15": "Common",
          "Neo X1": "Common",
          "Lith R3": "Common",
          "Axi C10": "Uncommon",
          "Meso H6": "Uncommon",
          "Meso G3": "Common",
          "Meso F2": "Uncommon",
          "Lith G12": "Uncommon",
          "Lith R5": "Common",
          "Neo I2": "Common",
          "Lith S11": "Common",
          "Lith I1": "Common",
          "Lith T2": "Common",
          "Lith C5": "Common",
          "Neo I3": "Common",
          "Axi S10": "Common",
          "Lith T10": "Common",
          "Lith V1": "Uncommon",
          "Axi V8": "Common",
          "Lith W4": "Common",
          "Axi Z1": "Common",
          "Axi H6": "Uncommon",
          "Lith V10": "Common",
          "Meso H2": "Common",
          "Lith S8": "Common",
          "Meso D7": "Common",
          "Meso A6": "Common",
          "Axi S17": "Uncommon",
          "Meso A11": "Common",
          "Axi C3": "Common",
          "Axi B2": "Uncommon",
          "Meso T6": "Common",
          "Axi S7": "Common",
          "Lith K2": "Uncommon",
          "Axi O1": "Common",
          "Meso R5": "Common",
          "Neo O3": "Common",
          "Meso Z6": "Common",
          "Axi K11": "Common",
          "Meso P16": "Common",
          "Axi A12": "Common",
          "Axi K8": "Common",
          "Neo N17": "Uncommon",
          "Lith K11": "Common",
          "Meso C10": "Common",
          "Axi B3": "Common",
          "Axi N8": "Common",
          "Meso L5": "Common",
          "Meso D5": "Common",
          "Neo M6": "Common",
          "Meso T2": "Common",
          "Lith M1": "Common",
          "Lith G7": "Common",
          "Axi A7": "Uncommon",
          "Meso N16": "Common",
          "Axi M5": "Common",
          "Neo A6": "Common",
          "Lith D4": "Common",
          "Meso G9": "Uncommon",
          "Axi G1": "Uncommon",
          "Meso E4": "Common",
          "Neo B5": "Common",
          "Axi N2": "Uncommon",
          "Meso G6": "Common",
          "Lith S12": "Common",
          "Meso H3": "Uncommon",
          "Lith O2": "Uncommon",
          "Axi V4": "Uncommon",
          "Lith N3": "Uncommon",
          "Neo G10": "Common",
          "Lith C7": "Common",
          "Meso F3": "Uncommon",
          "Neo A5": "Common",
          "Lith S16": "Common",
          "Meso K4": "Uncommon",
          "Neo T1": "Common",
          "Meso K5": "Common",
          "Axi H1": "Common",
          "Neo S1": "Uncommon",
          "Axi T7": "Common",
          "Neo M2": "Common",
          "Axi K10": "Common",
          "Meso C6": "Uncommon",
          "Lith S2": "Uncommon",
          "Axi C9": "Common",
          "Neo D9": "Common",
          "Lith T1": "Common",
          "Axi W4": "Common",
          "Neo N13": "Uncommon",
          "Meso E5": "Common",
          "Neo H3": "Common",
          "Axi P7": "Uncommon",
          "Lith A1": "Common",
          "Axi N12": "Common",
          "Lith H3": "Uncommon",
          "Meso N17": "Common",
          "Lith N5": "Common",
          "Neo B4": "Common",
          "Meso P5": "Uncommon",
          "Neo Z11": "Common",
          "Axi P1": "Common",
          "Neo M3": "Uncommon",
          "Lith S14": "Common",
          "Lith N15": "Common",
          "Meso P11": "Common",
          "Axi P3": "Common",
          "Axi B6": "Common",
          "Axi D2": "Uncommon",
          "Axi A13": "Common",
          "Axi H3": "Uncommon",
          "Neo P4": "Uncommon",
          "Meso N15": "Common",
          "Meso E1": "Uncommon",
          "Neo K5": "Common",
          "Neo T2": "Uncommon",
          "Meso P10": "Common",
          "Meso C9": "Common",
          "Axi G8": "Uncommon",
          "Lith N18": "Common",
          "Meso V8": "Common",
          "Meso A1": "Uncommon",
          "Neo Y1": "Uncommon",
          "Neo Z10": "Common",
          "Meso G10": "Common",
          "Neo A2": "Uncommon",
          "Axi L4": "Common",
          "Meso S3": "Uncommon",
          "Axi K4": "Common",
          "Lith M9": "Uncommon",
          "Neo B8": "Common",
          "Neo V8": "Uncommon",
          "Meso K6": "Common",
          "Lith S13": "Common",
          "Axi E1": "Uncommon",
          "Meso C1": "Common",
          "Lith A12": "Common"
        }
      }
    }
  },
  "Vasto Prime": {
    IsVaulted: false,
    Parts: {
      Barrel: {
        DucatValue: 15,
        Drops: {
          "Axi V3": "Common",
          "Neo N2": "Common",
          "Axi P5": "Common",
          "Axi M4": "Common",
          "Neo D1": "Common",
          "Axi S7": "Common",
          "Axi A5": "Common",
          "Lith A5": "Common",
          "Lith M8": "Common",
          "Lith K11": "Common",
          "Lith T11": "Common"
        }
      },
      Receiver: {
        DucatValue: 15,
        Drops: {
          "Meso N16": "Common",
          "Lith V9": "Common",
          "Meso V2": "Common",
          "Neo T8": "Common",
          "Neo R5": "Common",
          "Axi A5": "Common",
          "Lith G11": "Common",
          "Neo N12": "Common",
          "Lith A1": "Common",
          "Neo B8": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Meso V8": "Uncommon",
          "Lith L4": "Uncommon",
          "Axi A5": "Uncommon",
          "Meso L2": "Uncommon",
          "Axi S15": "Uncommon",
          "Meso D5": "Uncommon",
          "Axi P5": "Uncommon",
          "Neo S3": "Uncommon",
          "Meso A6": "Uncommon"
        }
      }
    }
  },
  "Tekko Prime": {
    IsVaulted: true,
    Parts: {
      Gauntlet: {
        DucatValue: 15,
        Drops: {
          "Lith T4": "Common",
          "Meso N9": "Common",
          "Lith A5": "Common",
          "Axi W2": "Common",
          "Axi C5": "Common",
          "Meso T5": "Common",
          "Meso W1": "Common",
          "Axi G4": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Lith L2": "Uncommon",
          "Neo B7": "Uncommon",
          "Meso V8": "Uncommon",
          "Meso E4": "Uncommon",
          "Lith P5": "Uncommon"
        }
      },
      Blade: {
        DucatValue: 100,
        Drops: {
          "Axi T7": "Rare",
          "Axi T6": "Rare",
          "Neo T2": "Rare",
          "Meso T6": "Rare"
        }
      }
    }
  },
  "Pyrana Prime": {
    IsVaulted: true,
    Parts: {
      Barrel: {
        DucatValue: 15,
        Drops: {
          "Axi C4": "Common",
          "Neo A9": "Common",
          "Neo V7": "Common",
          "Neo A2": "Common",
          "Axi A8": "Common",
          "Meso E2": "Common",
          "Lith L3": "Common",
          "Meso N7": "Common",
          "Lith L2": "Common"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Axi P3": "Rare",
          "Meso P1": "Rare",
          "Lith P1": "Rare",
          "Lith P7": "Rare",
          "Axi P1": "Rare",
          "Meso P6": "Rare",
          "Lith P2": "Rare",
          "Axi P2": "Rare"
        }
      },
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Neo Z2": "Uncommon",
          "Neo C1": "Uncommon",
          "Axi K3": "Uncommon",
          "Neo G2": "Uncommon",
          "Axi C3": "Uncommon",
          "Lith D5": "Uncommon",
          "Axi D3": "Uncommon"
        }
      }
    }
  },
  "Akarius Prime": {
    IsVaulted: true,
    Parts: {
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Meso A11": "Rare",
          "Meso A7": "Rare",
          "Neo A11": "Rare"
        }
      },
      Barrel: {
        DucatValue: 15,
        Drops: {
          "Axi D5": "Common",
          "Neo D10": "Common",
          "Axi H8": "Common",
          "Neo X1": "Common",
          "Neo M6": "Common",
          "Neo A12": "Common",
          "Lith O4": "Common",
          "Neo A13": "Common"
        }
      },
      Receiver: {
        DucatValue: 65,
        Drops: {
          "Lith A6": "Rare",
          "Lith A8": "Rare",
          "Neo G10": "Uncommon",
          "Lith A10": "Rare",
          "Lith A7": "Rare"
        }
      },
      Link: {
        DucatValue: 45,
        Drops: {
          "Meso T8": "Uncommon",
          "Meso N17": "Uncommon",
          "Lith R5": "Uncommon",
          "Meso T7": "Uncommon",
          "Meso P16": "Uncommon",
          "Lith A11": "Uncommon",
          "Axi Y2": "Uncommon"
        }
      }
    }
  },
  "Afentis Prime": {
    IsVaulted: false,
    Parts: {
      Handle: {
        DucatValue: 15,
        Drops: {
          "Lith Q3": "Common"
        }
      },
      Barrel: {
        DucatValue: 45,
        Drops: {
          "Neo C8": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Axi A22": "Rare"
        }
      },
      Blade: {
        DucatValue: 100,
        Drops: {
          "Meso A12": "Rare"
        }
      }
    }
  },
  "Carrier Prime": {
    IsVaulted: true,
    Parts: {
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Meso V3": "Common",
          "Lith V7": "Common",
          "Meso V1": "Common",
          "Meso P12": "Common",
          "Neo S3": "Common",
          "Meso V4": "Common"
        }
      },
      Carapace: {
        DucatValue: 25,
        Drops: {
          "Lith S5": "Common",
          "Lith V10": "Uncommon",
          "Neo A4": "Common",
          "Axi N2": "Common",
          "Neo S1": "Common"
        }
      },
      Systems: {
        DucatValue: 15,
        Drops: {
          "Lith N2": "Common",
          "Lith S3": "Common",
          "Neo A1": "Common",
          "Axi V1": "Common",
          "Neo V3": "Common",
          "Lith S2": "Common",
          "Axi A7": "Common",
          "Axi K12": "Common"
        }
      },
      Cerebrum: {
        DucatValue: 65,
        Drops: {
          "Meso V6": "Uncommon",
          "Meso N3": "Uncommon",
          "Meso C7": "Rare",
          "Lith C1": "Rare",
          "Meso C1": "Rare",
          "Meso C2": "Rare"
        }
      }
    }
  },
  "Tenora Prime": {
    IsVaulted: true,
    Parts: {
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Meso A3": "Common",
          "Neo B7": "Common",
          "Axi I2": "Common",
          "Meso P5": "Common",
          "Neo N20": "Common",
          "Axi K10": "Common",
          "Lith O3": "Common"
        }
      },
      Barrel: {
        DucatValue: 65,
        Drops: {
          "Neo T5": "Rare",
          "Neo T6": "Rare",
          "Meso Z5": "Uncommon",
          "Lith T9": "Rare",
          "Meso T5": "Rare",
          "Lith T5": "Rare"
        }
      },
      Receiver: {
        DucatValue: 100,
        Drops: {
          "Neo T8": "Rare",
          "Neo T4": "Rare",
          "Meso T4": "Rare",
          "Axi T8": "Rare"
        }
      },
      Stock: {
        DucatValue: 45,
        Drops: {
          "Axi T6": "Uncommon",
          "Axi P5": "Uncommon",
          "Axi S12": "Uncommon",
          "Axi C7": "Uncommon",
          "Meso Z4": "Uncommon",
          "Axi G7": "Uncommon",
          "Lith R2": "Uncommon"
        }
      }
    }
  },
  Xata: {
    IsVaulted: false,
    Parts: {
      "": {
        DucatValue: 0,
        Drops: {
          "Requiem Eterna": "Common",
          "Requiem I": "Uncommon"
        }
      }
    }
  },
  "Zylok Prime": {
    IsVaulted: true,
    Parts: {
      Barrel: {
        DucatValue: 15,
        Drops: {
          "Axi V12": "Common",
          "Lith Q1": "Common",
          "Lith G12": "Common",
          "Axi H8": "Common",
          "Lith R5": "Common",
          "Meso P15": "Common",
          "Axi L6": "Common",
          "Lith A11": "Common",
          "Neo O2": "Common"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Axi Z2": "Rare",
          "Neo Z11": "Rare",
          "Meso Z6": "Rare",
          "Neo Z10": "Rare",
          "Lith Z4": "Rare"
        }
      },
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Axi G14": "Uncommon",
          "Lith Y1": "Uncommon",
          "Lith R4": "Uncommon",
          "Axi G15": "Uncommon",
          "Lith L5": "Uncommon",
          "Axi O6": "Uncommon",
          "Meso G6": "Uncommon"
        }
      }
    }
  },
  "Larkspur Prime": {
    IsVaulted: true,
    Parts: {
      Stock: {
        DucatValue: 45,
        Drops: {
          "Lith K10": "Uncommon",
          "Lith F3": "Uncommon",
          "Neo P7": "Uncommon",
          "Axi D5": "Uncommon",
          "Neo A12": "Uncommon",
          "Lith W3": "Uncommon",
          "Meso W3": "Uncommon"
        }
      },
      Barrel: {
        DucatValue: 100,
        Drops: {
          "Neo L4": "Rare",
          "Neo L2": "Rare",
          "Neo L3": "Rare",
          "Lith L6": "Rare",
          "Axi L6": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Meso H4": "Common",
          "Meso M4": "Common",
          "Meso B9": "Common",
          "Lith T12": "Common",
          "Meso K6": "Common",
          "Lith X1": "Common",
          "Axi S16": "Common",
          "Neo H4": "Common"
        }
      },
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Neo F3": "Uncommon",
          "Axi A19": "Uncommon",
          "Meso G10": "Uncommon",
          "Lith P9": "Uncommon",
          "Lith G12": "Uncommon",
          "Neo D8": "Uncommon",
          "Axi G10": "Uncommon"
        }
      }
    }
  },
  "Voruna Prime": {
    IsVaulted: false,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 45,
        Drops: {
          "Axi A21": "Uncommon",
          "Lith N19": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 100,
        Drops: {
          "Neo V12": "Rare",
          "Neo V11": "Rare",
          "Lith V11": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Axi V14": "Rare"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 45,
        Drops: {
          "Meso A12": "Uncommon",
          "Meso D8": "Uncommon"
        }
      }
    }
  },
  "Afuris Prime": {
    IsVaulted: true,
    Parts: {
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Axi D5": "Common",
          "Axi B6": "Common",
          "Neo T7": "Common",
          "Lith G6": "Common",
          "Neo Z10": "Common",
          "Neo M5": "Common",
          "Axi B9": "Common",
          "Neo G7": "Common"
        }
      },
      Barrel: {
        DucatValue: 15,
        Drops: {
          "Meso W4": "Common",
          "Meso R6": "Common",
          "Lith P8": "Common",
          "Lith H9": "Common",
          "Axi N10": "Common",
          "Lith N14": "Common",
          "Meso B9": "Common",
          "Meso D7": "Common",
          "Neo E4": "Common"
        }
      },
      Receiver: {
        DucatValue: 100,
        Drops: {
          "Axi A17": "Rare",
          "Meso A4": "Rare",
          "Axi A16": "Rare",
          "Lith A9": "Rare"
        }
      },
      Link: {
        DucatValue: 45,
        Drops: {
          "Neo K5": "Uncommon",
          "Neo P8": "Uncommon",
          "Meso A5": "Uncommon",
          "Axi G11": "Uncommon",
          "Meso V9": "Uncommon"
        }
      }
    }
  },
  "Khora Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 45,
        Drops: {
          "Neo D7": "Uncommon",
          "Neo N21": "Uncommon",
          "Lith C10": "Uncommon",
          "Lith G9": "Uncommon",
          "Lith S15": "Uncommon",
          "Axi G13": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 15,
        Drops: {
          "Neo F3": "Common",
          "Neo L2": "Common",
          "Axi N11": "Common",
          "Lith H7": "Common",
          "Lith R4": "Common",
          "Meso P9": "Common",
          "Meso P8": "Common",
          "Meso G5": "Common",
          "Meso A5": "Common"
        }
      },
      Blueprint: {
        DucatValue: 65,
        Drops: {
          "Meso K4": "Rare",
          "Lith K9": "Rare",
          "Neo K6": "Rare",
          "Neo C5": "Uncommon"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 100,
        Drops: {
          "Neo K8": "Rare",
          "Neo K5": "Rare",
          "Axi K8": "Rare",
          "Neo K7": "Rare"
        }
      }
    }
  },
  "Stradavar Prime": {
    IsVaulted: true,
    Parts: {
      Receiver: {
        DucatValue: 15,
        Drops: {
          "Meso W2": "Common",
          "Axi W1": "Common",
          "Axi A10": "Common",
          "Meso Z3": "Common",
          "Lith W2": "Common",
          "Lith D3": "Common"
        }
      },
      Barrel: {
        DucatValue: 45,
        Drops: {
          "Neo I2": "Uncommon",
          "Meso E3": "Uncommon",
          "Neo E3": "Uncommon",
          "Lith M4": "Uncommon",
          "Lith M5": "Uncommon",
          "Lith N6": "Uncommon"
        }
      },
      Stock: {
        DucatValue: 15,
        Drops: {
          "Axi R3": "Common",
          "Lith N5": "Common",
          "Axi T2": "Common",
          "Meso C5": "Common",
          "Axi B3": "Common",
          "Lith P3": "Common",
          "Lith N13": "Common"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Lith S8": "Rare",
          "Neo S11": "Rare",
          "Neo S12": "Rare",
          "Lith S13": "Rare",
          "Neo S14": "Rare",
          "Lith S10": "Rare"
        }
      }
    }
  },
  "Nova Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 100,
        Drops: {
          "Neo V1": "Rare",
          "Neo N12": "Rare",
          "Lith N1": "Rare",
          "Neo N9": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Neo N2": "Uncommon",
          "Meso D5": "Uncommon",
          "Axi S4": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 15,
        Drops: {
          "Axi S7": "Common",
          "Meso S1": "Common",
          "Neo S2": "Common",
          "Lith C1": "Common",
          "Meso B3": "Common"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 15,
        Drops: {
          "Lith M2": "Common",
          "Lith C1": "Common",
          "Meso C1": "Common",
          "Lith K4": "Common"
        }
      }
    }
  },
  "Ivara Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 100,
        Drops: {
          "Lith I1": "Rare",
          "Neo I3": "Rare",
          "Neo I1": "Rare",
          "Neo I2": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Lith N5": "Uncommon",
          "Meso N9": "Uncommon",
          "Axi B4": "Uncommon",
          "Axi S13": "Uncommon",
          "Lith B8": "Uncommon",
          "Lith N4": "Uncommon",
          "Lith N7": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 45,
        Drops: {
          "Lith T7": "Uncommon",
          "Lith A4": "Uncommon",
          "Axi C6": "Uncommon",
          "Axi A9": "Uncommon",
          "Meso P2": "Uncommon",
          "Axi A15": "Uncommon"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 15,
        Drops: {
          "Meso B5": "Common",
          "Meso O6": "Common",
          "Lith D3": "Common",
          "Meso N10": "Common",
          "Meso D6": "Common",
          "Neo M3": "Common",
          "Meso C4": "Common",
          "Neo T4": "Common"
        }
      }
    }
  },
  "Nezha Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 100,
        Drops: {
          "Neo N13": "Rare",
          "Neo N17": "Rare",
          "Lith N11": "Rare",
          "Axi N7": "Rare",
          "Meso N15": "Rare"
        }
      },
      "Systems Blueprint": {
        DucatValue: 15,
        Drops: {
          "Neo N16": "Common",
          "Lith N12": "Common",
          "Axi O5": "Common",
          "Meso P7": "Common",
          "Axi S12": "Common",
          "Lith G7": "Common",
          "Neo D2": "Common",
          "Lith H3": "Common",
          "Neo D3": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Meso C6": "Uncommon",
          "Axi S9": "Uncommon",
          "Axi G6": "Uncommon",
          "Axi M2": "Uncommon",
          "Lith H4": "Uncommon",
          "Lith O3": "Uncommon",
          "Meso D6": "Uncommon",
          "Meso H2": "Uncommon"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 65,
        Drops: {
          "Lith N8": "Rare",
          "Neo N20": "Rare",
          "Neo N15": "Rare",
          "Neo T8": "Uncommon",
          "Lith N10": "Rare",
          "Axi N8": "Rare",
          "Lith N6": "Rare"
        }
      }
    }
  },
  "Octavia Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 45,
        Drops: {
          "Neo A5": "Uncommon",
          "Axi K8": "Uncommon",
          "Meso S11": "Uncommon",
          "Axi S11": "Uncommon",
          "Meso N15": "Uncommon",
          "Neo Z7": "Uncommon",
          "Lith K7": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Meso O5": "Rare",
          "Axi O5": "Rare",
          "Lith O3": "Rare"
        }
      },
      "Systems Blueprint": {
        DucatValue: 15,
        Drops: {
          "Lith N7": "Common",
          "Meso H3": "Common",
          "Lith R2": "Common",
          "Meso D6": "Common",
          "Neo T8": "Common",
          "Lith C9": "Common",
          "Axi N7": "Common",
          "Meso G4": "Common"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 15,
        Drops: {
          "Neo S15": "Common",
          "Axi P5": "Common",
          "Meso B6": "Common",
          "Axi K6": "Common",
          "Lith G3": "Common",
          "Lith G5": "Common",
          "Lith G4": "Common"
        }
      }
    }
  },
  "Limbo Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 100,
        Drops: {
          "Axi L3": "Rare",
          "Axi L5": "Rare",
          "Lith L3": "Rare",
          "Neo L1": "Rare",
          "Meso L2": "Rare",
          "Meso L1": "Rare"
        }
      },
      "Systems Blueprint": {
        DucatValue: 15,
        Drops: {
          "Neo R3": "Common",
          "Neo R5": "Common",
          "Neo A2": "Common",
          "Axi D3": "Common",
          "Meso N7": "Common",
          "Lith B6": "Common",
          "Neo C1": "Common",
          "Lith B3": "Common",
          "Axi T3": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Meso T3": "Uncommon",
          "Neo A9": "Uncommon",
          "Meso Z1": "Uncommon",
          "Neo D4": "Uncommon",
          "Neo I1": "Uncommon",
          "Neo M2": "Uncommon"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 100,
        Drops: {
          "Axi L2": "Rare",
          "Lith L1": "Rare",
          "Lith K8": "Uncommon",
          "Axi M4": "Uncommon",
          "Lith L2": "Rare"
        }
      }
    }
  },
  "Oberon Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 15,
        Drops: {
          "Meso B2": "Common",
          "Meso P1": "Common",
          "Lith B5": "Common",
          "Axi N5": "Common",
          "Axi H2": "Common",
          "Lith T3": "Common",
          "Lith B9": "Common"
        }
      },
      "Systems Blueprint": {
        DucatValue: 65,
        Drops: {
          "Axi O4": "Rare",
          "Neo N11": "Uncommon",
          "Axi O3": "Rare",
          "Axi O1": "Rare",
          "Axi O2": "Rare",
          "Axi A15": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Meso H1": "Uncommon",
          "Neo S16": "Uncommon",
          "Lith H2": "Uncommon",
          "Lith M3": "Uncommon",
          "Neo B5": "Uncommon",
          "Lith S9": "Uncommon",
          "Meso N4": "Uncommon"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 100,
        Drops: {
          "Lith O1": "Rare",
          "Meso O1": "Rare",
          "Meso O6": "Rare",
          "Meso O4": "Rare",
          "Meso O2": "Rare"
        }
      }
    }
  },
  "Revenant Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 15,
        Drops: {
          "Meso N13": "Common",
          "Neo A11": "Common",
          "Axi C9": "Common",
          "Meso H6": "Common",
          "Neo K5": "Common",
          "Axi G12": "Common",
          "Axi F2": "Common",
          "Neo S17": "Common",
          "Neo N23": "Common"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Lith R4": "Rare",
          "Meso R6": "Rare",
          "Lith R3": "Rare",
          "Lith R5": "Rare",
          "Meso R5": "Rare",
          "Lith R2": "Rare"
        }
      },
      "Systems Blueprint": {
        DucatValue: 45,
        Drops: {
          "Meso H5": "Uncommon",
          "Axi A16": "Uncommon",
          "Neo P8": "Uncommon",
          "Meso C9": "Uncommon",
          "Meso P9": "Uncommon",
          "Axi B8": "Uncommon",
          "Meso K5": "Uncommon"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 45,
        Drops: {
          "Axi D5": "Uncommon",
          "Neo Z10": "Uncommon",
          "Neo A12": "Uncommon",
          "Lith S14": "Uncommon",
          "Lith T13": "Uncommon"
        }
      }
    }
  },
  "Kestrel Prime": {
    IsVaulted: false,
    Parts: {
      Blade: {
        DucatValue: 15,
        Drops: {
          "Lith D7": "Common",
          "Lith C14": "Common",
          "Lith S18": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Neo T11": "Uncommon",
          "Neo N24": "Uncommon",
          "Meso P17": "Uncommon"
        }
      },
      Grip: {
        DucatValue: 100,
        Drops: {
          "Meso K8": "Rare",
          "Neo K9": "Rare"
        }
      }
    }
  },
  "Odonata Prime": {
    IsVaulted: false,
    Parts: {
      "Harness Blueprint": {
        DucatValue: 15,
        Drops: {
          "Neo O1": "Common",
          "Neo V8": "Common",
          "Lith K1": "Common",
          "Axi K1": "Common",
          "Axi V4": "Common",
          "Axi T1": "Common"
        }
      },
      "Systems Blueprint": {
        DucatValue: 15,
        Drops: {
          "Axi V8": "Common",
          "Neo N3": "Common",
          "Axi V1": "Common",
          "Meso O3": "Common",
          "Lith F2": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Meso S1": "Uncommon",
          "Lith F1": "Uncommon",
          "Axi L4": "Uncommon",
          "Axi V8": "Uncommon",
          "Meso C2": "Uncommon"
        }
      },
      "Wings Blueprint": {
        DucatValue: 65,
        Drops: {
          "Meso O3": "Rare",
          "Neo O1": "Rare",
          "Lith O2": "Rare",
          "Axi N1": "Uncommon"
        }
      }
    }
  },
  "Wukong Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 45,
        Drops: {
          "Lith N13": "Uncommon",
          "Meso K3": "Uncommon",
          "Neo S12": "Uncommon",
          "Axi T6": "Uncommon",
          "Axi A10": "Uncommon",
          "Neo N13": "Uncommon",
          "Lith K3": "Uncommon",
          "Meso B4": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Meso W2": "Rare",
          "Axi W1": "Rare",
          "Lith W1": "Rare",
          "Axi W2": "Rare",
          "Lith W2": "Rare",
          "Meso W1": "Rare"
        }
      },
      "Systems Blueprint": {
        DucatValue: 45,
        Drops: {
          "Axi R3": "Uncommon",
          "Neo I2": "Uncommon",
          "Meso K2": "Uncommon",
          "Axi P3": "Uncommon",
          "Neo Z9": "Uncommon",
          "Meso T4": "Uncommon",
          "Axi A11": "Uncommon"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 15,
        Drops: {
          "Axi G2": "Common",
          "Axi T4": "Common",
          "Neo Z7": "Common",
          "Lith S13": "Common",
          "Axi Z1": "Common",
          "Lith D2": "Common",
          "Neo T2": "Common",
          "Neo I1": "Common"
        }
      }
    }
  },
  "Guandao Prime": {
    IsVaulted: true,
    Parts: {
      Handle: {
        DucatValue: 100,
        Drops: {
          "Meso G2": "Rare",
          "Lith G7": "Rare",
          "Lith G3": "Rare",
          "Meso G4": "Rare",
          "Lith G4": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Meso B5": "Uncommon",
          "Meso P7": "Uncommon",
          "Lith P5": "Uncommon",
          "Meso Z5": "Uncommon",
          "Lith K9": "Uncommon",
          "Meso I2": "Uncommon",
          "Neo T4": "Uncommon"
        }
      },
      Blade: {
        DucatValue: 15,
        Drops: {
          "Axi S10": "Common",
          "Neo P2": "Common",
          "Meso H2": "Common",
          "Lith O3": "Common",
          "Axi S9": "Common",
          "Neo Z6": "Common",
          "Neo V10": "Common",
          "Lith K7": "Common"
        }
      }
    }
  },
  "Phantasma Prime": {
    IsVaulted: true,
    Parts: {
      Receiver: {
        DucatValue: 15,
        Drops: {
          "Neo F3": "Common",
          "Meso C8": "Common",
          "Lith T10": "Common",
          "Meso W3": "Common",
          "Neo O2": "Common",
          "Lith B10": "Common",
          "Meso N14": "Common",
          "Meso K4": "Common",
          "Lith T13": "Common"
        }
      },
      Barrel: {
        DucatValue: 100,
        Drops: {
          "Lith P8": "Rare",
          "Meso P10": "Rare",
          "Meso P13": "Rare",
          "Neo P8": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Lith C11": "Uncommon",
          "Meso G5": "Uncommon",
          "Axi N9": "Uncommon",
          "Lith A9": "Uncommon",
          "Meso W5": "Uncommon",
          "Neo Z10": "Uncommon",
          "Axi N10": "Uncommon"
        }
      },
      Stock: {
        DucatValue: 65,
        Drops: {
          "Meso P14": "Rare",
          "Axi C9": "Uncommon",
          "Neo P6": "Rare",
          "Meso P11": "Rare",
          "Axi P6": "Rare",
          "Lith P6": "Rare"
        }
      }
    }
  },
  "Ankyros Prime": {
    IsVaulted: true,
    Parts: {
      Blade: {
        DucatValue: 45,
        Drops: {
          "Axi R1": "Uncommon",
          "Neo G6": "Uncommon",
          "Axi S3": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Lith B4": "Common",
          "Lith E1": "Common",
          "Lith B1": "Common"
        }
      },
      Gauntlet: {
        DucatValue: 15,
        Drops: {
          "Neo R1": "Common",
          "Meso S14": "Common",
          "Meso M1": "Common"
        }
      }
    }
  },
  "Burston Prime": {
    IsVaulted: false,
    Parts: {
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Axi S19": "Common",
          "Neo T1": "Common",
          "Neo P10": "Common",
          "Meso V1": "Common",
          "Meso P4": "Common",
          "Meso C5": "Common",
          "Lith B3": "Common",
          "Meso C7": "Common",
          "Axi T3": "Common",
          "Meso K8": "Common",
          "Neo K3": "Common",
          "Neo K9": "Common",
          "Axi K8": "Common",
          "Neo S6": "Common",
          "Axi G9": "Common",
          "Axi B7": "Common",
          "Axi K11": "Common",
          "Axi T11": "Common",
          "Lith O1": "Common",
          "Lith T1": "Common",
          "Axi R4": "Common",
          "Lith A10": "Common",
          "Lith S10": "Common",
          "Axi B8": "Common",
          "Neo N23": "Common",
          "Meso C6": "Common",
          "Axi C8": "Common",
          "Axi L5": "Common",
          "Neo A6": "Common",
          "Neo R3": "Common",
          "Axi M6": "Common",
          "Neo L4": "Common",
          "Axi G7": "Common",
          "Axi S6": "Common",
          "Neo Z9": "Common",
          "Meso I2": "Common",
          "Axi A22": "Common",
          "Lith D6": "Common",
          "Axi M2": "Common",
          "Lith P2": "Common",
          "Axi G12": "Common"
        }
      },
      Barrel: {
        DucatValue: 45,
        Drops: {
          "Neo V5": "Uncommon",
          "Axi P3": "Uncommon",
          "Neo W2": "Uncommon",
          "Meso P12": "Uncommon",
          "Axi H3": "Uncommon",
          "Lith E1": "Uncommon",
          "Neo A11": "Uncommon",
          "Meso S8": "Uncommon",
          "Lith T8": "Uncommon",
          "Axi G3": "Uncommon",
          "Lith R1": "Uncommon",
          "Axi T2": "Uncommon",
          "Lith T6": "Uncommon",
          "Lith I1": "Uncommon",
          "Lith M10": "Uncommon",
          "Axi G4": "Uncommon",
          "Lith P3": "Uncommon",
          "Meso G2": "Uncommon",
          "Axi T1": "Uncommon",
          "Lith S13": "Uncommon",
          "Meso V13": "Uncommon",
          "Neo B1": "Uncommon",
          "Lith S14": "Uncommon",
          "Lith F3": "Uncommon",
          "Lith N12": "Uncommon",
          "Neo P5": "Uncommon",
          "Axi V13": "Uncommon",
          "Meso S13": "Uncommon",
          "Neo B9": "Uncommon",
          "Lith G8": "Uncommon",
          "Neo K8": "Uncommon",
          "Lith F2": "Uncommon"
        }
      },
      Receiver: {
        DucatValue: 15,
        Drops: {
          "Axi Y3": "Common",
          "Neo I2": "Common",
          "Lith H6": "Common",
          "Meso Z1": "Common",
          "Neo M5": "Common",
          "Neo K7": "Common",
          "Meso A9": "Common",
          "Lith H10": "Common",
          "Meso B7": "Common",
          "Meso L1": "Common",
          "Neo G3": "Common",
          "Meso T1": "Common",
          "Lith L6": "Common",
          "Meso A8": "Common",
          "Axi V11": "Common",
          "Lith N3": "Common",
          "Axi N11": "Common",
          "Neo E2": "Common",
          "Axi A13": "Common",
          "Lith A12": "Common",
          "Lith G10": "Common",
          "Meso B10": "Common",
          "Axi G2": "Common",
          "Lith V10": "Common",
          "Meso H3": "Common",
          "Neo E3": "Common",
          "Lith C8": "Common",
          "Lith P6": "Common",
          "Lith D1": "Common",
          "Lith S15": "Common",
          "Neo H1": "Common",
          "Lith T9": "Common",
          "Lith C4": "Common",
          "Neo Q1": "Common",
          "Axi A11": "Common",
          "Meso P7": "Common",
          "Lith G12": "Common",
          "Lith S5": "Common",
          "Neo B9": "Common",
          "Neo N17": "Common",
          "Neo S3": "Common",
          "Lith A4": "Common"
        }
      },
      Stock: {
        DucatValue: 15,
        Drops: {
          "Meso G10": "Common",
          "Axi G5": "Common",
          "Meso L4": "Common",
          "Lith V1": "Common",
          "Neo M2": "Common",
          "Lith S9": "Common",
          "Lith K1": "Common",
          "Lith N9": "Common",
          "Lith M5": "Common",
          "Neo Z4": "Common",
          "Meso S5": "Common",
          "Neo Z5": "Common",
          "Meso T7": "Common",
          "Meso T8": "Common",
          "Neo C5": "Common",
          "Meso W2": "Common",
          "Neo H2": "Common",
          "Neo S2": "Common",
          "Neo B4": "Common",
          "Axi O3": "Common",
          "Neo T6": "Common",
          "Lith G6": "Common",
          "Lith W4": "Common",
          "Neo G5": "Common",
          "Neo A10": "Common",
          "Meso N3": "Common",
          "Meso G6": "Common",
          "Lith R3": "Common",
          "Lith S18": "Common",
          "Neo N16": "Common",
          "Meso S14": "Common",
          "Lith T10": "Common",
          "Neo P5": "Common",
          "Lith Q2": "Common",
          "Meso A3": "Common",
          "Lith D3": "Common",
          "Meso C3": "Common",
          "Meso G7": "Common",
          "Meso O5": "Common",
          "Lith B8": "Common",
          "Axi T13": "Common",
          "Neo V6": "Common"
        }
      }
    }
  },
  "Harrow Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 15,
        Drops: {
          "Meso N13": "Common",
          "Neo T7": "Common",
          "Axi S15": "Common",
          "Meso O5": "Common",
          "Meso P11": "Common",
          "Meso G3": "Common",
          "Axi N10": "Common"
        }
      },
      "Systems Blueprint": {
        DucatValue: 100,
        Drops: {
          "Meso H2": "Rare",
          "Lith H10": "Rare",
          "Axi H7": "Rare",
          "Lith H5": "Rare",
          "Lith H4": "Rare",
          "Lith H7": "Rare",
          "Lith H3": "Rare",
          "Meso H4": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Neo N21": "Uncommon",
          "Lith P6": "Uncommon",
          "Neo L3": "Uncommon",
          "Axi K6": "Uncommon",
          "Neo G5": "Uncommon",
          "Lith S15": "Uncommon",
          "Lith B11": "Uncommon"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 45,
        Drops: {
          "Axi T11": "Uncommon",
          "Meso P10": "Uncommon",
          "Axi A16": "Uncommon",
          "Axi S12": "Uncommon",
          "Meso C8": "Uncommon",
          "Lith R3": "Uncommon",
          "Lith B10": "Uncommon",
          "Axi T8": "Uncommon"
        }
      }
    }
  },
  "Dual Zoren Prime": {
    IsVaulted: false,
    Parts: {
      Handle: {
        DucatValue: 15,
        Drops: {
          "Axi S20": "Common",
          "Meso D8": "Common",
          "Lith E2": "Common",
          "Axi A22": "Common",
          "Neo A16": "Common",
          "Neo T10": "Common",
          "Axi P8": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Lith V11": "Uncommon",
          "Lith S16": "Uncommon",
          "Meso X1": "Uncommon",
          "Meso A10": "Uncommon",
          "Lith C13": "Uncommon"
        }
      },
      Blade: {
        DucatValue: 100,
        Drops: {
          "Axi D6": "Rare",
          "Neo D9": "Rare"
        }
      }
    }
  },
  "Sarofang Prime": {
    IsVaulted: false,
    Parts: {
      Blade: {
        DucatValue: 100,
        Drops: {
          "Axi S20": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Meso E7": "Uncommon",
          "Neo A16": "Uncommon"
        }
      },
      Handle: {
        DucatValue: 15,
        Drops: {
          "Meso A12": "Common",
          "Neo S20": "Common"
        }
      }
    }
  },
  "Rubico Prime": {
    IsVaulted: true,
    Parts: {
      Stock: {
        DucatValue: 45,
        Drops: {
          "Axi A9": "Common",
          "Lith B5": "Uncommon",
          "Neo P1": "Uncommon",
          "Axi D2": "Uncommon",
          "Meso E2": "Uncommon",
          "Axi P2": "Uncommon",
          "Lith C8": "Uncommon",
          "Axi L5": "Common",
          "Lith M3": "Uncommon"
        }
      },
      Barrel: {
        DucatValue: 25,
        Drops: {
          "Lith S8": "Uncommon",
          "Neo H2": "Uncommon",
          "Lith T6": "Common",
          "Meso Z3": "Uncommon",
          "Meso Z2": "Uncommon",
          "Axi M1": "Uncommon"
        }
      },
      Receiver: {
        DucatValue: 15,
        Drops: {
          "Lith O1": "Common",
          "Lith A3": "Common",
          "Axi T5": "Common",
          "Lith K2": "Common",
          "Lith W2": "Common",
          "Lith K3": "Common",
          "Neo K3": "Common"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Neo R2": "Rare",
          "Meso R4": "Rare",
          "Meso R3": "Rare",
          "Meso R1": "Rare",
          "Meso R2": "Rare"
        }
      }
    }
  },
  "Akbolto Prime": {
    IsVaulted: true,
    Parts: {
      Receiver: {
        DucatValue: 100,
        Drops: {
          "Axi A12": "Rare",
          "Axi A4": "Rare",
          "Axi A3": "Rare",
          "Neo A2": "Rare",
          "Meso A2": "Rare"
        }
      },
      Barrel: {
        DucatValue: 45,
        Drops: {
          "Lith O1": "Uncommon",
          "Lith A3": "Uncommon",
          "Lith K5": "Uncommon",
          "Lith C2": "Uncommon",
          "Lith V5": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Axi G2": "Common",
          "Meso D3": "Common",
          "Neo M1": "Common",
          "Neo Z2": "Common",
          "Neo V7": "Common",
          "Axi H5": "Common",
          "Lith M7": "Common"
        }
      },
      Link: {
        DucatValue: 45,
        Drops: {
          "Meso E2": "Uncommon",
          "Lith W1": "Uncommon",
          "Axi H4": "Uncommon",
          "Neo B6": "Uncommon",
          "Lith S7": "Uncommon",
          "Neo N8": "Uncommon",
          "Neo K2": "Uncommon"
        }
      }
    }
  },
  "Akstiletto Prime": {
    IsVaulted: true,
    Parts: {
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Lith A2": "Rare",
          "Neo A4": "Rare",
          "Neo A7": "Rare",
          "Lith A1": "Rare",
          "Neo A1": "Rare"
        }
      },
      Barrel: {
        DucatValue: 25,
        Drops: {
          "Meso V6": "Common",
          "Lith A5": "Uncommon",
          "Axi H2": "Uncommon",
          "Axi A1": "Uncommon",
          "Lith H1": "Uncommon",
          "Meso K1": "Uncommon"
        }
      },
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Axi T1": "Uncommon",
          "Axi H1": "Uncommon",
          "Axi A7": "Common",
          "Axi K1": "Uncommon",
          "Axi O1": "Uncommon",
          "Meso T6": "Uncommon"
        }
      },
      Link: {
        DucatValue: 45,
        Drops: {
          "Lith V7": "Uncommon",
          "Neo N5": "Uncommon",
          "Neo D6": "Uncommon",
          "Axi N1": "Uncommon",
          "Meso O1": "Uncommon"
        }
      }
    }
  },
  "Vadarya Prime": {
    IsVaulted: false,
    Parts: {
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Axi S18": "Uncommon",
          "Neo S20": "Uncommon",
          "Neo C7": "Uncommon",
          "Lith G14": "Uncommon",
          "Meso L5": "Uncommon"
        }
      },
      Barrel: {
        DucatValue: 45,
        Drops: {
          "Axi Y3": "Uncommon",
          "Neo A15": "Uncommon",
          "Lith L7": "Uncommon",
          "Lith S18": "Uncommon"
        }
      },
      Stock: {
        DucatValue: 15,
        Drops: {
          "Lith N19": "Common",
          "Meso X1": "Common",
          "Lith O4": "Common",
          "Axi A21": "Common"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Meso V15": "Rare",
          "Meso V12": "Rare"
        }
      }
    }
  },
  "Corvas Prime": {
    IsVaulted: true,
    Parts: {
      Stock: {
        DucatValue: 15,
        Drops: {
          "Lith K10": "Common",
          "Lith S12": "Common",
          "Neo C3": "Common",
          "Meso G5": "Common",
          "Neo K8": "Common",
          "Axi G8": "Common"
        }
      },
      Barrel: {
        DucatValue: 100,
        Drops: {
          "Neo C4": "Rare",
          "Neo C5": "Rare",
          "Meso C9": "Rare",
          "Neo C2": "Rare"
        }
      },
      Receiver: {
        DucatValue: 15,
        Drops: {
          "Neo D7": "Common",
          "Meso A4": "Common",
          "Axi T10": "Common",
          "Axi K8": "Common",
          "Lith D6": "Common",
          "Lith G8": "Common",
          "Meso G4": "Common",
          "Axi G10": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Neo L2": "Uncommon",
          "Neo D5": "Uncommon",
          "Axi K7": "Uncommon",
          "Meso H8": "Uncommon",
          "Lith W3": "Uncommon",
          "Meso B8": "Uncommon"
        }
      }
    }
  },
  "Galatine Prime": {
    IsVaulted: true,
    Parts: {
      Blade: {
        DucatValue: 15,
        Drops: {
          "Neo N6": "Common",
          "Axi N4": "Common",
          "Lith T3": "Common",
          "Meso S4": "Common",
          "Meso S2": "Common",
          "Neo V2": "Common",
          "Meso S6": "Common",
          "Axi T11": "Common",
          "Neo V3": "Common",
          "Lith S7": "Common",
          "Axi O2": "Common",
          "Meso C2": "Common"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Meso G1": "Rare",
          "Neo G5": "Rare",
          "Neo G3": "Rare",
          "Axi G1": "Rare"
        }
      },
      Handle: {
        DucatValue: 45,
        Drops: {
          "Axi K2": "Uncommon",
          "Meso O4": "Uncommon",
          "Lith S5": "Uncommon",
          "Axi V6": "Uncommon",
          "Neo V2": "Uncommon",
          "Lith H10": "Uncommon",
          "Axi O1": "Uncommon",
          "Neo Z1": "Uncommon"
        }
      }
    }
  },
  "Spira Prime": {
    IsVaulted: true,
    Parts: {
      Blade: {
        DucatValue: 65,
        Drops: {
          "Neo S10": "Uncommon",
          "Lith S5": "Rare",
          "Meso S6": "Rare",
          "Neo S3": "Rare",
          "Axi V9": "Uncommon",
          "Meso M5": "Uncommon"
        }
      },
      Pouch: {
        DucatValue: 100,
        Drops: {
          "Axi S5": "Rare",
          "Meso S15": "Rare",
          "Meso S3": "Rare",
          "Lith S3": "Rare",
          "Lith S6": "Rare",
          "Meso S9": "Rare",
          "Neo S8": "Rare",
          "Lith S1": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Meso V3": "Common",
          "Lith S17": "Common",
          "Lith N2": "Common",
          "Neo S13": "Common",
          "Meso V1": "Common",
          "Meso V5": "Common",
          "Meso S9": "Common",
          "Lith V4": "Common",
          "Lith C5": "Common"
        }
      }
    }
  },
  "Nautilus Prime": {
    IsVaulted: true,
    Parts: {
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Lith N17": "Rare",
          "Neo N24": "Rare",
          "Lith N18": "Rare",
          "Meso N17": "Rare"
        }
      },
      Systems: {
        DucatValue: 45,
        Drops: {
          "Meso V11": "Uncommon",
          "Lith Q2": "Uncommon",
          "Neo T10": "Uncommon",
          "Meso A10": "Uncommon",
          "Axi S16": "Uncommon",
          "Lith Q1": "Uncommon"
        }
      },
      Carapace: {
        DucatValue: 15,
        Drops: {
          "Neo P10": "Common",
          "Lith Y1": "Common",
          "Lith A7": "Common",
          "Axi V13": "Common",
          "Neo W2": "Common",
          "Lith L7": "Common",
          "Neo G7": "Common"
        }
      },
      Cerebrum: {
        DucatValue: 100,
        Drops: {
          "Lith N19": "Rare",
          "Lith N16": "Rare",
          "Lith N15": "Rare",
          "Axi N13": "Rare"
        }
      }
    }
  },
  "Baruuk Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 45,
        Drops: {
          "Neo A8": "Uncommon",
          "Meso V9": "Uncommon",
          "Lith N15": "Uncommon",
          "Lith P8": "Uncommon",
          "Neo K7": "Uncommon",
          "Lith T13": "Uncommon",
          "Neo S17": "Uncommon",
          "Neo N23": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 15,
        Drops: {
          "Meso H7": "Common",
          "Axi P7": "Common",
          "Meso P14": "Common",
          "Neo P8": "Common",
          "Meso R5": "Common",
          "Meso H4": "Common",
          "Meso H6": "Common",
          "Axi W3": "Common"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Meso B8": "Rare",
          "Lith B10": "Rare",
          "Meso B9": "Rare",
          "Axi B9": "Rare",
          "Lith B11": "Rare"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 65,
        Drops: {
          "Axi B5": "Rare",
          "Axi B7": "Rare",
          "Neo B9": "Rare",
          "Axi B6": "Rare",
          "Axi B9": "Uncommon",
          "Axi B8": "Rare"
        }
      }
    }
  },
  "Astilla Prime": {
    IsVaulted: true,
    Parts: {
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Axi N9": "Uncommon",
          "Meso H3": "Uncommon",
          "Lith T11": "Uncommon",
          "Axi G7": "Uncommon",
          "Meso R5": "Uncommon",
          "Meso I2": "Uncommon",
          "Neo T4": "Uncommon"
        }
      },
      Barrel: {
        DucatValue: 100,
        Drops: {
          "Meso A3": "Rare",
          "Lith A4": "Rare",
          "Meso A6": "Rare",
          "Neo A8": "Rare"
        }
      },
      Stock: {
        DucatValue: 45,
        Drops: {
          "Axi V11": "Uncommon",
          "Meso N13": "Uncommon",
          "Meso T5": "Uncommon",
          "Lith N11": "Uncommon",
          "Lith K9": "Uncommon",
          "Lith T8": "Uncommon",
          "Neo P3": "Uncommon"
        }
      },
      Receiver: {
        DucatValue: 15,
        Drops: {
          "Meso C10": "Common",
          "Lith N8": "Common",
          "Neo T6": "Common",
          "Lith B10": "Common",
          "Neo S15": "Common",
          "Lith N12": "Common",
          "Axi N7": "Common",
          "Lith H3": "Common"
        }
      }
    }
  },
  "Akbronco Prime": {
    IsVaulted: false,
    Parts: {
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Meso S3": "Common",
          "Meso O1": "Common",
          "Axi S11": "Common",
          "Lith S2": "Common",
          "Axi S16": "Common",
          "Lith B11": "Common",
          "Lith T8": "Common",
          "Lith A12": "Common",
          "Axi A10": "Common",
          "Neo N15": "Common",
          "Lith R4": "Common",
          "Meso A5": "Common",
          "Lith T1": "Common",
          "Lith V5": "Common",
          "Neo P6": "Common",
          "Lith P6": "Common",
          "Neo M2": "Common",
          "Meso B6": "Common",
          "Lith A8": "Common",
          "Neo W2": "Common",
          "Meso G9": "Common",
          "Meso P17": "Common",
          "Neo V12": "Common",
          "Lith Z1": "Common",
          "Lith Z2": "Common",
          "Neo V11": "Common",
          "Lith S3": "Common",
          "Lith K9": "Common",
          "Neo T2": "Common",
          "Neo D3": "Common"
        }
      },
      Link: {
        DucatValue: 45,
        Drops: {
          "Axi K8": "Uncommon",
          "Neo L2": "Uncommon",
          "Axi C5": "Uncommon",
          "Meso P13": "Uncommon",
          "Axi C11": "Uncommon",
          "Axi A9": "Uncommon",
          "Meso R1": "Uncommon",
          "Axi L5": "Uncommon",
          "Axi S1": "Uncommon",
          "Lith A2": "Uncommon",
          "Axi A18": "Uncommon",
          "Lith H7": "Uncommon",
          "Lith C13": "Uncommon",
          "Neo C9": "Uncommon",
          "Lith S5": "Uncommon",
          "Neo Z7": "Uncommon",
          "Meso E6": "Uncommon",
          "Neo O3": "Uncommon",
          "Lith N1": "Uncommon",
          "Neo V10": "Uncommon",
          "Meso O2": "Uncommon"
        }
      }
    }
  },
  "Lex Prime": {
    IsVaulted: false,
    Parts: {
      Barrel: {
        DucatValue: 15,
        Drops: {
          "Neo Q1": "Common",
          "Meso V4": "Common",
          "Neo D6": "Common",
          "Lith V2": "Common",
          "Neo A13": "Common",
          "Meso P14": "Common",
          "Meso Z5": "Common",
          "Lith N7": "Common",
          "Lith Y1": "Common",
          "Axi N5": "Common",
          "Neo N3": "Common",
          "Neo A3": "Common",
          "Meso K8": "Common",
          "Axi V7": "Common",
          "Neo O3": "Common",
          "Meso C10": "Common",
          "Lith B9": "Common",
          "Axi B6": "Common",
          "Axi G13": "Common",
          "Lith N17": "Common",
          "Lith B6": "Common",
          "Lith N13": "Common",
          "Lith H2": "Common",
          "Meso T2": "Common",
          "Lith L3": "Common",
          "Axi A2": "Common",
          "Axi K1": "Common",
          "Neo S1": "Common",
          "Lith T2": "Common",
          "Meso T3": "Common",
          "Meso C6": "Common",
          "Axi M1": "Common",
          "Axi V14": "Common",
          "Meso P13": "Common",
          "Lith N12": "Common",
          "Lith S14": "Common",
          "Meso S9": "Common",
          "Lith A2": "Common",
          "Meso S5": "Common",
          "Meso L2": "Common",
          "Meso S13": "Common",
          "Meso N11": "Common",
          "Lith P8": "Common",
          "Neo Z5": "Common",
          "Meso S11": "Common"
        }
      },
      Blueprint: {
        DucatValue: 25,
        Drops: {
          "Neo S10": "Common",
          "Meso D4": "Uncommon",
          "Lith N11": "Common",
          "Meso H7": "Common",
          "Axi S14": "Common",
          "Lith C3": "Common",
          "Neo P3": "Common",
          "Lith P5": "Common",
          "Axi T12": "Common",
          "Lith K11": "Uncommon",
          "Lith B11": "Common",
          "Meso D1": "Common",
          "Neo A9": "Uncommon",
          "Axi Z2": "Common",
          "Neo V9": "Uncommon",
          "Neo D10": "Common",
          "Axi O4": "Common",
          "Meso N15": "Uncommon",
          "Meso P3": "Common",
          "Axi G3": "Common",
          "Axi D3": "Common",
          "Neo A11": "Common",
          "Axi A2": "Uncommon",
          "Lith S4": "Common",
          "Meso M4": "Common",
          "Neo N2": "Common",
          "Axi A9": "Common",
          "Neo E3": "Uncommon",
          "Lith T11": "Uncommon",
          "Meso Y2": "Common",
          "Neo T10": "Common",
          "Lith V5": "Common",
          "Meso C3": "Common",
          "Neo C4": "Common",
          "Lith P9": "Common",
          "Meso O6": "Uncommon",
          "Lith A3": "Common",
          "Neo Z2": "Common",
          "Axi F1": "Common",
          "Lith S7": "Common",
          "Lith R2": "Common",
          "Lith D6": "Uncommon"
        }
      },
      Receiver: {
        DucatValue: 15,
        Drops: {
          "Axi T9": "Common",
          "Neo L3": "Common",
          "Axi D6": "Common",
          "Axi S16": "Common",
          "Axi N6": "Common",
          "Axi V8": "Common",
          "Axi S12": "Common",
          "Axi N2": "Common",
          "Axi R2": "Common",
          "Neo W1": "Common",
          "Neo A7": "Common",
          "Meso T8": "Common",
          "Neo K9": "Common",
          "Axi V10": "Common",
          "Meso W4": "Common",
          "Lith H5": "Common",
          "Axi C1": "Common",
          "Lith G5": "Common",
          "Axi E2": "Common",
          "Lith B5": "Common",
          "Meso A6": "Common",
          "Lith M1": "Common",
          "Axi A2": "Common",
          "Lith K8": "Common",
          "Axi H2": "Common",
          "Neo A8": "Common",
          "Meso D2": "Common",
          "Neo Y1": "Common",
          "Neo S16": "Common",
          "Lith P7": "Common",
          "Lith G7": "Common",
          "Lith B7": "Common",
          "Neo D9": "Common",
          "Lith D1": "Common",
          "Axi C7": "Common",
          "Axi S15": "Common",
          "Lith X1": "Common",
          "Meso H8": "Common",
          "Meso N14": "Common",
          "Meso N5": "Common",
          "Neo D8": "Common",
          "Axi O5": "Common"
        }
      }
    }
  },
  "Orthos Prime": {
    IsVaulted: false,
    Parts: {
      Blade: {
        DucatValue: 45,
        Drops: {
          "Meso D1": "Uncommon",
          "Lith B5": "Uncommon",
          "Lith B2": "Uncommon",
          "Axi D6": "Uncommon",
          "Meso I1": "Uncommon",
          "Meso W3": "Uncommon",
          "Lith A9": "Uncommon",
          "Neo P9": "Uncommon",
          "Neo N16": "Uncommon",
          "Axi T10": "Uncommon",
          "Lith T12": "Uncommon",
          "Lith C4": "Uncommon",
          "Meso K6": "Uncommon",
          "Lith B3": "Uncommon",
          "Meso A7": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Neo Q1": "Uncommon",
          "Meso R6": "Uncommon",
          "Neo L3": "Uncommon",
          "Axi A13": "Uncommon",
          "Axi C1": "Uncommon",
          "Neo C2": "Uncommon",
          "Lith H2": "Uncommon",
          "Lith S10": "Uncommon",
          "Axi A17": "Uncommon",
          "Neo D9": "Uncommon",
          "Axi B2": "Uncommon",
          "Lith S8": "Uncommon",
          "Axi M1": "Uncommon",
          "Lith B7": "Uncommon",
          "Meso B1": "Uncommon",
          "Axi S20": "Uncommon",
          "Lith B6": "Uncommon",
          "Lith S11": "Uncommon",
          "Axi V3": "Uncommon"
        }
      },
      Handle: {
        DucatValue: 15,
        Drops: {
          "Axi K9": "Common",
          "Meso D4": "Common",
          "Lith D4": "Common",
          "Axi L2": "Common",
          "Neo P8": "Common",
          "Axi G11": "Common",
          "Meso A10": "Common",
          "Axi G10": "Common",
          "Axi K2": "Common",
          "Meso G2": "Common",
          "Meso F5": "Common",
          "Neo P3": "Common",
          "Meso D1": "Common",
          "Meso K1": "Common",
          "Axi P9": "Common",
          "Axi A6": "Common",
          "Neo M4": "Common",
          "Axi P6": "Common",
          "Lith M10": "Common",
          "Meso A1": "Common",
          "Meso K3": "Common",
          "Neo T7": "Common",
          "Meso P5": "Common",
          "Neo H1": "Common",
          "Neo A12": "Common",
          "Meso K2": "Common",
          "Meso B1": "Common",
          "Lith M9": "Common",
          "Lith N10": "Common",
          "Lith A3": "Common",
          "Neo Z1": "Common",
          "Lith V11": "Common",
          "Meso V14": "Common",
          "Axi Y2": "Common",
          "Meso N4": "Common"
        }
      }
    }
  },
  "Hikou Prime": {
    IsVaulted: false,
    Parts: {
      Stars: {
        DucatValue: 15,
        Drops: {
          "Axi S3": "Common",
          "Axi V10": "Common",
          "Neo N1": "Common",
          "Lith F2": "Common"
        }
      },
      Pouch: {
        DucatValue: 15,
        Drops: {
          "Axi V2": "Common",
          "Axi K1": "Common",
          "Lith C7": "Common",
          "Meso N6": "Common"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Meso N2": "Common",
          "Neo R1": "Common",
          "Lith S1": "Common",
          "Axi S8": "Common"
        }
      }
    }
  },
  "Volt Prime": {
    IsVaulted: false,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 25,
        Drops: {
          "Meso V3": "Uncommon",
          "Axi V8": "Uncommon",
          "Meso V2": "Uncommon",
          "Vanguard E1": "Common",
          "Meso O3": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 25,
        Drops: {
          "Axi N3": "Uncommon",
          "Neo O1": "Common",
          "Lith O2": "Common",
          "Vanguard C1": "Common",
          "Neo V1": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 45,
        Drops: {
          "Axi L4": "Uncommon",
          "Neo O1": "Uncommon",
          "Lith V1": "Uncommon",
          "Vanguard M1": "Uncommon"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 65,
        Drops: {
          "Axi V8": "Rare",
          "Axi V1": "Uncommon",
          "Neo V8": "Rare",
          "Vanguard P1": "Uncommon"
        }
      }
    }
  },
  "Quassus Prime": {
    IsVaulted: false,
    Parts: {
      Handle: {
        DucatValue: 15,
        Drops: {
          "Axi Y3": "Common",
          "Meso V12": "Common",
          "Axi N13": "Common",
          "Axi G14": "Common",
          "Axi T13": "Common",
          "Neo C8": "Common",
          "Meso A8": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Neo V12": "Uncommon",
          "Meso G8": "Uncommon",
          "Lith N18": "Uncommon",
          "Neo A15": "Uncommon",
          "Meso L4": "Uncommon",
          "Lith T14": "Uncommon",
          "Neo X1": "Uncommon"
        }
      },
      Blade: {
        DucatValue: 100,
        Drops: {
          "Neo Q1": "Rare",
          "Lith Q3": "Rare",
          "Lith Q2": "Rare",
          "Lith Q1": "Rare"
        }
      }
    }
  },
  "Lavos Prime": {
    IsVaulted: false,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 15,
        Drops: {
          "Axi C10": "Common",
          "Axi D6": "Common",
          "Lith T14": "Common",
          "Neo X1": "Common",
          "Lith G14": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Lith C14": "Uncommon",
          "Neo A16": "Uncommon",
          "Axi Y1": "Uncommon",
          "Axi F3": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 100,
        Drops: {
          "Lith L5": "Rare",
          "Meso L5": "Rare",
          "Meso L4": "Rare",
          "Lith L7": "Rare",
          "Meso L3": "Rare"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 45,
        Drops: {
          "Neo N24": "Uncommon",
          "Axi A20": "Uncommon",
          "Axi P10": "Uncommon",
          "Meso A8": "Uncommon"
        }
      }
    }
  },
  "Hystrix Prime": {
    IsVaulted: true,
    Parts: {
      Barrel: {
        DucatValue: 15,
        Drops: {
          "Axi P6": "Common",
          "Lith S15": "Common",
          "Lith N14": "Common",
          "Meso K6": "Common",
          "Neo G4": "Common",
          "Axi G13": "Common",
          "Meso W3": "Common",
          "Meso R5": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Neo C5": "Uncommon",
          "Axi B7": "Uncommon",
          "Neo K6": "Uncommon",
          "Axi K9": "Uncommon",
          "Axi G10": "Uncommon"
        }
      },
      Receiver: {
        DucatValue: 100,
        Drops: {
          "Meso H3": "Rare",
          "Lith H6": "Rare",
          "Meso H8": "Rare",
          "Lith H8": "Rare",
          "Meso H6": "Rare",
          "Lith H9": "Rare"
        }
      }
    }
  },
  "Boar Prime": {
    IsVaulted: true,
    Parts: {
      Stock: {
        DucatValue: 100,
        Drops: {
          "Meso B1": "Rare",
          "Neo B8": "Rare",
          "Meso B3": "Rare",
          "Lith B1": "Rare"
        }
      },
      Barrel: {
        DucatValue: 45,
        Drops: {
          "Lith M2": "Uncommon",
          "Axi V2": "Uncommon",
          "Meso M1": "Uncommon",
          "Axi D4": "Uncommon"
        }
      },
      Receiver: {
        DucatValue: 15,
        Drops: {
          "Axi R1": "Common",
          "Lith M1": "Common",
          "Axi S4": "Common",
          "Lith L4": "Common"
        }
      },
      Blueprint: {
        DucatValue: 25,
        Drops: {
          "Neo B3": "Common",
          "Meso F4": "Uncommon",
          "Neo D1": "Common",
          "Neo N9": "Common"
        }
      }
    }
  },
  "Strun Prime": {
    IsVaulted: true,
    Parts: {
      Receiver: {
        DucatValue: 15,
        Drops: {
          "Meso P10": "Common",
          "Neo L2": "Common",
          "Neo S19": "Common",
          "Axi T8": "Common",
          "Neo M4": "Common",
          "Neo C3": "Common",
          "Meso G3": "Common",
          "Axi I2": "Common",
          "Neo D5": "Common"
        }
      },
      Barrel: {
        DucatValue: 45,
        Drops: {
          "Lith T7": "Uncommon",
          "Axi N12": "Uncommon",
          "Lith H5": "Uncommon",
          "Lith B10": "Uncommon",
          "Lith N12": "Uncommon",
          "Axi P4": "Uncommon",
          "Axi N8": "Uncommon",
          "Meso H4": "Uncommon"
        }
      },
      Stock: {
        DucatValue: 45,
        Drops: {
          "Axi K10": "Uncommon",
          "Neo N17": "Uncommon",
          "Lith H6": "Uncommon",
          "Meso D7": "Uncommon",
          "Meso M5": "Uncommon",
          "Neo A8": "Uncommon",
          "Lith G5": "Uncommon",
          "Meso S11": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Lith S12": "Rare",
          "Neo S19": "Rare",
          "Lith S11": "Rare",
          "Neo S17": "Rare",
          "Meso S10": "Rare"
        }
      }
    }
  },
  "Cedo Prime": {
    IsVaulted: false,
    Parts: {
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Neo C9": "Rare",
          "Lith C14": "Rare",
          "Neo C6": "Rare"
        }
      },
      Barrel: {
        DucatValue: 45,
        Drops: {
          "Axi D6": "Uncommon",
          "Meso Y1": "Uncommon",
          "Axi A21": "Uncommon",
          "Neo T9": "Uncommon"
        }
      },
      Stock: {
        DucatValue: 15,
        Drops: {
          "Lith A7": "Common",
          "Axi S18": "Common",
          "Neo A14": "Common",
          "Axi A20": "Common",
          "Neo C8": "Common",
          "Meso E7": "Common"
        }
      },
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Neo P10": "Uncommon",
          "Axi M6": "Uncommon",
          "Lith K12": "Uncommon",
          "Lith Q3": "Uncommon"
        }
      }
    }
  },
  "Tiberon Prime": {
    IsVaulted: true,
    Parts: {
      Stock: {
        DucatValue: 100,
        Drops: {
          "Meso T3": "Rare",
          "Lith T2": "Rare",
          "Meso T2": "Rare",
          "Lith T6": "Rare"
        }
      },
      Barrel: {
        DucatValue: 65,
        Drops: {
          "Meso T1": "Rare",
          "Neo K3": "Uncommon"
        }
      },
      Receiver: {
        DucatValue: 15,
        Drops: {
          "Meso R1": "Common",
          "Axi P2": "Common",
          "Axi K3": "Common",
          "Axi G5": "Common",
          "Axi D1": "Common",
          "Meso O2": "Common"
        }
      },
      Blueprint: {
        DucatValue: 25,
        Drops: {
          "Axi L2": "Uncommon",
          "Axi O4": "Uncommon",
          "Lith A3": "Uncommon",
          "Lith C8": "Common",
          "Neo R2": "Uncommon",
          "Axi O2": "Uncommon",
          "Lith K3": "Uncommon"
        }
      }
    }
  },
  "Fang Prime": {
    IsVaulted: false,
    Parts: {
      Blade: {
        DucatValue: 15,
        Drops: {
          "Axi G14": "Common",
          "Axi T9": "Common",
          "Lith P1": "Common",
          "Neo I1": "Common",
          "Meso A7": "Common",
          "Meso Z5": "Common",
          "Lith H10": "Common",
          "Axi B2": "Common",
          "Lith K10": "Common",
          "Axi P10": "Common",
          "Axi P7": "Common",
          "Neo G4": "Common",
          "Neo G3": "Common",
          "Lith C1": "Common",
          "Lith C6": "Common",
          "Lith N1": "Common",
          "Neo S20": "Common",
          "Neo K5": "Common",
          "Lith N6": "Common",
          "Axi W4": "Common",
          "Axi R3": "Common",
          "Neo S11": "Common",
          "Lith S11": "Common",
          "Lith F1": "Common",
          "Axi N1": "Common",
          "Lith I1": "Common",
          "Axi O2": "Common",
          "Neo N23": "Common",
          "Neo F3": "Common",
          "Meso M2": "Common",
          "Lith T11": "Common",
          "Meso V8": "Common",
          "Meso V11": "Common",
          "Axi B1": "Common",
          "Axi M3": "Common",
          "Meso P17": "Common",
          "Axi L6": "Common",
          "Lith S5": "Common",
          "Lith V10": "Common",
          "Neo N20": "Common",
          "Neo S7": "Common",
          "Lith S6": "Common",
          "Lith D5": "Common",
          "Neo S12": "Common"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Meso Z1": "Common",
          "Lith V2": "Common",
          "Neo H4": "Common",
          "Meso N1": "Common",
          "Lith K1": "Common",
          "Neo B2": "Common",
          "Meso P8": "Common",
          "Meso S4": "Common",
          "Axi G4": "Common",
          "Lith N16": "Common",
          "Meso B7": "Common",
          "Meso O4": "Common",
          "Axi Y1": "Common",
          "Lith O3": "Uncommon",
          "Meso T1": "Common",
          "Meso C10": "Uncommon",
          "Neo T2": "Common",
          "Neo A9": "Common",
          "Neo H2": "Common",
          "Lith H5": "Common",
          "Axi K11": "Common",
          "Lith N13": "Common",
          "Neo Y1": "Common",
          "Lith B6": "Common",
          "Lith N11": "Common",
          "Neo G5": "Uncommon",
          "Neo A10": "Common",
          "Lith T9": "Common",
          "Meso R2": "Common",
          "Axi P8": "Common",
          "Axi L5": "Common",
          "Axi V14": "Common",
          "Meso K5": "Common",
          "Lith G9": "Common",
          "Meso V9": "Common",
          "Meso T6": "Common",
          "Axi A11": "Common",
          "Neo N2": "Common",
          "Lith N15": "Common",
          "Lith R5": "Common",
          "Lith G4": "Common",
          "Lith G8": "Common",
          "Neo P9": "Common",
          "Axi Y2": "Common"
        }
      },
      Handle: {
        DucatValue: 25,
        Drops: {
          "Lith L5": "Uncommon",
          "Meso N16": "Uncommon",
          "Meso D3": "Common",
          "Axi S11": "Common",
          "Neo K6": "Common",
          "Meso N1": "Common",
          "Meso H5": "Common",
          "Neo S14": "Uncommon",
          "Neo E4": "Uncommon",
          "Meso W1": "Uncommon",
          "Neo N3": "Uncommon",
          "Neo R5": "Uncommon",
          "Meso N2": "Common",
          "Axi A16": "Common",
          "Axi V6": "Uncommon",
          "Lith T14": "Common",
          "Lith F2": "Uncommon",
          "Meso W2": "Uncommon",
          "Axi N11": "Uncommon",
          "Axi O5": "Uncommon",
          "Lith N17": "Uncommon",
          "Neo L4": "Uncommon",
          "Lith W1": "Uncommon",
          "Axi A4": "Uncommon",
          "Axi H2": "Common",
          "Axi B8": "Uncommon",
          "Lith D2": "Uncommon",
          "Meso V7": "Uncommon",
          "Meso M4": "Uncommon",
          "Neo H3": "Common",
          "Lith G7": "Uncommon",
          "Lith F3": "Common",
          "Meso S4": "Uncommon",
          "Axi I3": "Uncommon",
          "Lith W2": "Uncommon",
          "Axi P4": "Common",
          "Axi L3": "Common",
          "Lith R3": "Uncommon",
          "Lith G11": "Uncommon",
          "Lith G14": "Uncommon",
          "Neo V2": "Common",
          "Lith A5": "Uncommon",
          "Lith Z1": "Common"
        }
      }
    }
  },
  "Hildryn Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 45,
        Drops: {
          "Neo Q1": "Uncommon",
          "Meso G10": "Uncommon",
          "Meso P11": "Uncommon",
          "Axi A18": "Uncommon",
          "Axi L6": "Uncommon",
          "Neo G7": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Meso H7": "Rare",
          "Meso H5": "Rare",
          "Axi H8": "Rare",
          "Axi H6": "Rare",
          "Neo H4": "Rare"
        }
      },
      "Systems Blueprint": {
        DucatValue: 15,
        Drops: {
          "Axi S19": "Common",
          "Neo S18": "Common",
          "Lith H8": "Common",
          "Lith W3": "Common",
          "Axi S17": "Common",
          "Lith A6": "Common",
          "Axi T12": "Common",
          "Lith P9": "Common",
          "Axi P6": "Common",
          "Meso C9": "Common"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 45,
        Drops: {
          "Neo C4": "Uncommon",
          "Neo P7": "Uncommon",
          "Lith M9": "Uncommon",
          "Lith G10": "Uncommon",
          "Meso P14": "Uncommon",
          "Neo S17": "Uncommon",
          "Axi W4": "Uncommon"
        }
      }
    }
  },
  "Sicarus Prime": {
    IsVaulted: true,
    Parts: {
      Barrel: {
        DucatValue: 15,
        Drops: {
          "Neo F1": "Common",
          "Neo G6": "Common",
          "Meso F2": "Common"
        }
      },
      Receiver: {
        DucatValue: 100,
        Drops: {
          "Axi S2": "Rare",
          "Meso S14": "Rare",
          "Neo S5": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 25,
        Drops: {
          "Neo F1": "Common",
          "Axi E1": "Common",
          "Meso B10": "Uncommon"
        }
      }
    }
  },
  "Styanax Prime": {
    IsVaulted: false,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 45,
        Drops: {
          "Meso Y2": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 45,
        Drops: {
          "Neo Y1": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Axi A21": "Common"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 100,
        Drops: {
          "Lith S18": "Rare"
        }
      }
    }
  },
  "Riven Sliver": {
    IsVaulted: true,
    Parts: {
      "": {
        DucatValue: 0,
        Drops: {
          "Requiem III": "Common",
          "Requiem IV": "Common",
          "Requiem II": "Common",
          "Requiem I": "Common"
        }
      }
    }
  },
  "Ballistica Prime": {
    IsVaulted: true,
    Parts: {
      String: {
        DucatValue: 45,
        Drops: {
          "Meso R1": "Uncommon",
          "Axi A4": "Uncommon",
          "Neo A6": "Uncommon",
          "Meso G1": "Uncommon"
        }
      },
      "Lower Limb": {
        DucatValue: 15,
        Drops: {
          "Meso A1": "Common",
          "Lith O1": "Common",
          "Meso M3": "Common",
          "Axi V6": "Common",
          "Neo B5": "Common",
          "Axi K5": "Common",
          "Neo H3": "Common"
        }
      },
      "Upper Limb": {
        DucatValue: 45,
        Drops: {
          "Neo N10": "Uncommon",
          "Lith T1": "Uncommon",
          "Lith V5": "Uncommon",
          "Axi M3": "Uncommon",
          "Meso S8": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Lith B5": "Rare",
          "Lith B2": "Rare",
          "Lith B6": "Rare",
          "Meso B7": "Rare",
          "Lith B3": "Rare"
        }
      },
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Meso P1": "Uncommon",
          "Neo H2": "Uncommon",
          "Lith R1": "Uncommon",
          "Neo S7": "Uncommon",
          "Neo L1": "Uncommon",
          "Lith P2": "Uncommon"
        }
      }
    }
  },
  "Alternox Prime": {
    IsVaulted: false,
    Parts: {
      Receiver: {
        DucatValue: 15,
        Drops: {
          "Neo C9": "Common",
          "Neo P9": "Common",
          "Axi V14": "Common"
        }
      },
      Barrel: {
        DucatValue: 45,
        Drops: {
          "Meso K8": "Uncommon",
          "Lith N18": "Uncommon"
        }
      },
      Stock: {
        DucatValue: 100,
        Drops: {
          "Axi A21": "Rare",
          "Meso A9": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Axi A20": "Rare",
          "Meso A10": "Rare",
          "Lith A12": "Rare"
        }
      }
    }
  },
  "Chroma Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 25,
        Drops: {
          "Meso T3": "Uncommon",
          "Neo Z8": "Common",
          "Meso K2": "Uncommon",
          "Meso C5": "Uncommon",
          "Meso D4": "Uncommon",
          "Meso L1": "Uncommon",
          "Axi R2": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Meso B4": "Common",
          "Meso P1": "Common",
          "Axi A6": "Common",
          "Meso Z3": "Common",
          "Axi G5": "Common",
          "Axi D1": "Common",
          "Axi T5": "Common",
          "Neo K2": "Common"
        }
      },
      "Systems Blueprint": {
        DucatValue: 65,
        Drops: {
          "Axi C4": "Rare",
          "Meso R4": "Uncommon",
          "Neo C1": "Rare",
          "Axi C3": "Rare",
          "Meso C4": "Rare"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 100,
        Drops: {
          "Lith C8": "Rare",
          "Lith C3": "Rare",
          "Lith C4": "Rare"
        }
      }
    }
  },
  "Bo Prime": {
    IsVaulted: true,
    Parts: {
      Handle: {
        DucatValue: 45,
        Drops: {
          "Neo V8": "Uncommon",
          "Neo F1": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Lith O2": "Common",
          "Lith G2": "Common"
        }
      },
      Ornament: {
        DucatValue: 15,
        Drops: {
          "Axi L4": "Common",
          "Meso E1": "Common"
        }
      }
    }
  },
  "Nagantaka Prime": {
    IsVaulted: true,
    Parts: {
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Meso P9": "Uncommon",
          "Meso D7": "Uncommon",
          "Axi B5": "Uncommon",
          "Neo F2": "Uncommon",
          "Lith C10": "Uncommon",
          "Axi G13": "Uncommon",
          "Meso O5": "Uncommon",
          "Neo M4": "Uncommon"
        }
      },
      Barrel: {
        DucatValue: 15,
        Drops: {
          "Meso C8": "Common",
          "Axi K9": "Common",
          "Axi S10": "Common",
          "Meso H8": "Common",
          "Axi S14": "Common",
          "Meso K4": "Common",
          "Neo D8": "Common",
          "Meso H4": "Common"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Neo N22": "Rare",
          "Neo N21": "Rare",
          "Axi N11": "Rare",
          "Lith N14": "Rare",
          "Meso N12": "Rare",
          "Neo N23": "Rare"
        }
      },
      Stock: {
        DucatValue: 45,
        Drops: {
          "Meso G5": "Uncommon",
          "Lith H6": "Uncommon",
          "Lith D6": "Uncommon",
          "Lith H8": "Uncommon",
          "Lith Z3": "Uncommon"
        }
      }
    }
  },
  "Fragor Prime": {
    IsVaulted: true,
    Parts: {
      Handle: {
        DucatValue: 65,
        Drops: {
          "Axi C2": "Uncommon",
          "Lith V1": "Rare",
          "Neo T1": "Uncommon",
          "Neo D6": "Uncommon",
          "Axi N4": "Uncommon",
          "Lith V8": "Uncommon",
          "Neo V6": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 65,
        Drops: {
          "Meso H1": "Uncommon",
          "Meso F1": "Rare",
          "Lith F1": "Rare",
          "Axi F1": "Rare",
          "Axi A7": "Uncommon",
          "Neo S8": "Uncommon"
        }
      },
      Head: {
        DucatValue: 15,
        Drops: {
          "Axi A1": "Common",
          "Lith V7": "Common",
          "Meso V8": "Common",
          "Axi H1": "Common",
          "Neo H1": "Common",
          "Axi B2": "Common"
        }
      }
    }
  },
  "Titania Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 15,
        Drops: {
          "Neo M3": "Common",
          "Axi S9": "Common",
          "Lith G11": "Common",
          "Axi M2": "Common",
          "Neo N14": "Common",
          "Meso Z4": "Common",
          "Meso I1": "Common",
          "Lith P4": "Common"
        }
      },
      "Systems Blueprint": {
        DucatValue: 100,
        Drops: {
          "Lith T7": "Rare",
          "Lith T11": "Rare",
          "Lith T4": "Rare",
          "Lith T8": "Rare",
          "Axi T5": "Rare",
          "Neo T3": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Neo D2": "Uncommon",
          "Neo P2": "Uncommon",
          "Lith H3": "Uncommon",
          "Axi V11": "Uncommon",
          "Meso S10": "Uncommon",
          "Lith M5": "Uncommon"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 45,
        Drops: {
          "Lith N10": "Uncommon",
          "Lith T5": "Uncommon",
          "Meso A6": "Uncommon",
          "Meso P4": "Uncommon",
          "Meso E4": "Uncommon",
          "Neo Z6": "Uncommon",
          "Lith N8": "Uncommon",
          "Lith G4": "Uncommon"
        }
      }
    }
  },
  "Reaper Prime": {
    IsVaulted: true,
    Parts: {
      Handle: {
        DucatValue: 15,
        Drops: {
          "Meso F4": "Common",
          "Lith G1": "Common",
          "Meso F3": "Common"
        }
      },
      Blueprint: {
        DucatValue: 25,
        Drops: {
          "Axi L1": "Common",
          "Neo S5": "Common",
          "Lith L4": "Uncommon"
        }
      },
      Blade: {
        DucatValue: 45,
        Drops: {
          "Lith M8": "Uncommon",
          "Neo E1": "Uncommon",
          "Meso F2": "Uncommon"
        }
      }
    }
  },
  "Akvasto Prime": {
    IsVaulted: false,
    Parts: {
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Axi A5": "Rare"
        }
      },
      Link: {
        DucatValue: 45,
        Drops: {
          "Axi A5": "Uncommon"
        }
      }
    }
  },
  "Glaive Prime": {
    IsVaulted: true,
    Parts: {
      Blade: {
        DucatValue: 45,
        Drops: {
          "Axi L1": "Uncommon",
          "Axi E1": "Uncommon",
          "Meso B10": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Lith G2": "Rare",
          "Neo G6": "Rare",
          "Lith G1": "Rare"
        }
      },
      Disc: {
        DucatValue: 45,
        Drops: {
          "Meso F3": "Uncommon",
          "Axi R4": "Uncommon",
          "Neo S5": "Uncommon"
        }
      }
    }
  },
  "Velox Prime": {
    IsVaulted: true,
    Parts: {
      Barrel: {
        DucatValue: 100,
        Drops: {
          "Meso V11": "Rare",
          "Axi V12": "Rare",
          "Meso V14": "Rare",
          "Meso V9": "Rare",
          "Meso V10": "Rare"
        }
      },
      Receiver: {
        DucatValue: 15,
        Drops: {
          "Axi P8": "Common",
          "Neo L4": "Common",
          "Meso V12": "Common",
          "Neo B9": "Common",
          "Axi A20": "Common",
          "Lith T12": "Common",
          "Lith Z4": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Meso N17": "Uncommon",
          "Axi S18": "Uncommon",
          "Lith D7": "Uncommon",
          "Axi F2": "Uncommon",
          "Neo D10": "Uncommon",
          "Neo C6": "Uncommon"
        }
      }
    }
  },
  "Saryn Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 100,
        Drops: {
          "Neo S10": "Rare",
          "Meso S2": "Rare",
          "Neo S2": "Rare",
          "Lith S17": "Rare",
          "Neo S13": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 65,
        Drops: {
          "Axi N6": "Uncommon",
          "Meso C3": "Uncommon",
          "Lith V6": "Uncommon",
          "Lith S4": "Rare",
          "Neo S1": "Rare",
          "Meso S4": "Rare",
          "Axi N12": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 15,
        Drops: {
          "Neo S10": "Common",
          "Axi T1": "Common",
          "Meso M5": "Common",
          "Axi G1": "Common",
          "Neo S13": "Common",
          "Meso F1": "Common",
          "Neo N5": "Common",
          "Meso C1": "Common",
          "Axi S5": "Common",
          "Lith H1": "Common",
          "Meso N4": "Common"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 45,
        Drops: {
          "Meso S5": "Uncommon",
          "Neo V4": "Uncommon",
          "Neo S19": "Uncommon",
          "Lith A1": "Uncommon",
          "Meso S9": "Uncommon",
          "Axi V9": "Common",
          "Lith C5": "Common"
        }
      }
    }
  },
  "Helios Prime": {
    IsVaulted: true,
    Parts: {
      Carapace: {
        DucatValue: 15,
        Drops: {
          "Neo V5": "Common",
          "Lith P1": "Common",
          "Meso E5": "Common",
          "Lith K5": "Common",
          "Axi C3": "Common",
          "Neo N5": "Common",
          "Neo S7": "Common",
          "Axi H3": "Common",
          "Axi A3": "Common",
          "Meso S6": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Lith V4": "Uncommon",
          "Lith C3": "Uncommon",
          "Meso C3": "Uncommon",
          "Neo M1": "Uncommon",
          "Meso Z1": "Uncommon",
          "Neo K1": "Uncommon",
          "Lith N2": "Uncommon",
          "Meso E5": "Uncommon"
        }
      },
      Systems: {
        DucatValue: 45,
        Drops: {
          "Axi A12": "Uncommon",
          "Lith V3": "Uncommon",
          "Axi N5": "Uncommon",
          "Lith Z2": "Uncommon",
          "Axi O2": "Uncommon",
          "Meso D2": "Uncommon"
        }
      },
      Cerebrum: {
        DucatValue: 100,
        Drops: {
          "Axi H2": "Rare",
          "Meso H1": "Rare",
          "Lith H2": "Rare",
          "Axi H1": "Rare",
          "Axi H5": "Rare",
          "Lith H1": "Rare"
        }
      }
    }
  },
  "Tipedo Prime": {
    IsVaulted: true,
    Parts: {
      Ornament: {
        DucatValue: 45,
        Drops: {
          "Lith N13": "Uncommon",
          "Axi A6": "Uncommon",
          "Axi C5": "Uncommon",
          "Neo Z6": "Uncommon",
          "Axi G2": "Uncommon",
          "Neo N10": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Meso W2": "Common",
          "Meso A2": "Common",
          "Meso W1": "Common",
          "Meso N10": "Common",
          "Meso C5": "Common",
          "Lith B7": "Common",
          "Lith P2": "Common",
          "Meso L1": "Common"
        }
      },
      Handle: {
        DucatValue: 100,
        Drops: {
          "Axi T2": "Rare",
          "Axi T9": "Rare",
          "Axi T3": "Rare",
          "Axi T4": "Rare"
        }
      }
    }
  },
  "Akjagara Prime": {
    IsVaulted: true,
    Parts: {
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Axi L3": "Uncommon",
          "Meso L2": "Uncommon",
          "Neo P1": "Uncommon",
          "Lith M6": "Uncommon",
          "Lith N9": "Uncommon",
          "Neo I1": "Uncommon",
          "Neo Z3": "Uncommon"
        }
      },
      Barrel: {
        DucatValue: 100,
        Drops: {
          "Meso A1": "Rare",
          "Neo A3": "Rare",
          "Lith A3": "Rare",
          "Neo A6": "Rare",
          "Neo A9": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Neo S9": "Common",
          "Meso R3": "Common",
          "Axi P1": "Common",
          "Axi M3": "Common",
          "Axi B4": "Common",
          "Meso D4": "Common",
          "Lith M4": "Common",
          "Neo Z5": "Common",
          "Lith P7": "Common"
        }
      },
      Link: {
        DucatValue: 45,
        Drops: {
          "Axi R3": "Uncommon",
          "Lith P3": "Uncommon",
          "Meso N9": "Uncommon",
          "Meso M2": "Uncommon",
          "Meso Z3": "Uncommon",
          "Meso B7": "Uncommon",
          "Neo R5": "Uncommon"
        }
      }
    }
  },
  "Braton Prime": {
    IsVaulted: false,
    Parts: {
      Stock: {
        DucatValue: 25,
        Drops: {
          "Neo R2": "Common",
          "Neo S10": "Common",
          "Neo Z8": "Common",
          "Axi F3": "Common",
          "Meso S12": "Uncommon",
          "Meso N1": "Common",
          "Neo C2": "Common",
          "Meso A7": "Uncommon",
          "Lith V11": "Common",
          "Meso N5": "Common",
          "Neo T4": "Common",
          "Neo K4": "Uncommon",
          "Axi P7": "Uncommon",
          "Meso G8": "Common",
          "Lith C4": "Uncommon",
          "Neo D5": "Uncommon",
          "Meso T1": "Common",
          "Meso P16": "Common",
          "Meso R6": "Common",
          "Meso M5": "Common",
          "Axi A4": "Common",
          "Axi E2": "Common",
          "Lith K12": "Common",
          "Lith N18": "Common",
          "Axi A6": "Common",
          "Lith T3": "Common",
          "Neo N4": "Common",
          "Neo R4": "Common",
          "Meso C4": "Common",
          "Meso C9": "Uncommon",
          "Neo D2": "Common",
          "Neo P2": "Common",
          "Neo S16": "Common",
          "Meso K3": "Common",
          "Axi G6": "Uncommon",
          "Lith G9": "Uncommon",
          "Meso P13": "Common",
          "Lith N10": "Common",
          "Axi A8": "Common",
          "Neo V2": "Common",
          "Axi A1": "Common",
          "Neo Z2": "Common",
          "Axi F1": "Common",
          "Meso D3": "Common",
          "Neo B2": "Common",
          "Axi D3": "Common"
        }
      },
      Barrel: {
        DucatValue: 15,
        Drops: {
          "Neo T5": "Common",
          "Lith P4": "Common",
          "Meso H7": "Common",
          "Axi N6": "Common",
          "Meso P4": "Common",
          "Meso S15": "Common",
          "Neo T11": "Common",
          "Meso S5": "Common",
          "Neo N11": "Common",
          "Lith K2": "Common",
          "Lith N16": "Common",
          "Lith C11": "Common",
          "Meso O6": "Common",
          "Lith K9": "Common",
          "Lith C9": "Common",
          "Neo K2": "Common",
          "Lith A1": "Common",
          "Lith N14": "Common",
          "Axi A3": "Common",
          "Axi A17": "Common",
          "Neo C7": "Common",
          "Lith S8": "Common",
          "Neo A1": "Common",
          "Meso G1": "Common",
          "Meso P10": "Common",
          "Meso N3": "Common",
          "Neo F2": "Common",
          "Lith A8": "Common",
          "Neo B5": "Common",
          "Axi C11": "Common",
          "Neo A7": "Common",
          "Lith H4": "Common",
          "Neo D4": "Common",
          "Meso V6": "Common",
          "Neo T9": "Common",
          "Meso N14": "Common",
          "Meso R4": "Common",
          "Lith T13": "Common",
          "Axi C5": "Common"
        }
      },
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Lith C6": "Uncommon",
          "Lith N5": "Uncommon",
          "Lith V9": "Uncommon",
          "Axi V5": "Uncommon",
          "Lith L2": "Uncommon",
          "Lith H8": "Common",
          "Neo X1": "Uncommon",
          "Axi S17": "Uncommon",
          "Neo A11": "Uncommon",
          "Meso A4": "Uncommon",
          "Axi K10": "Uncommon",
          "Axi N8": "Common",
          "Neo K3": "Uncommon",
          "Lith K8": "Common",
          "Axi C9": "Common",
          "Axi V2": "Uncommon",
          "Axi V3": "Uncommon",
          "Meso N13": "Common",
          "Meso X1": "Common",
          "Neo P4": "Uncommon",
          "Axi H7": "Common",
          "Neo V10": "Common",
          "Neo N19": "Common",
          "Lith B2": "Uncommon",
          "Neo N14": "Uncommon",
          "Lith P1": "Uncommon",
          "Lith K2": "Uncommon",
          "Lith Z3": "Common",
          "Axi H6": "Uncommon",
          "Axi N6": "Uncommon",
          "Meso P2": "Common",
          "Lith B9": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 25,
        Drops: {
          "Axi C4": "Common",
          "Lith S12": "Uncommon",
          "Axi S13": "Common",
          "Neo D6": "Common",
          "Meso P6": "Common",
          "Axi O6": "Common",
          "Axi L2": "Common",
          "Meso V1": "Uncommon",
          "Lith T6": "Common",
          "Neo Z6": "Common",
          "Meso Z2": "Common",
          "Lith Y1": "Common",
          "Axi K6": "Common",
          "Meso V11": "Common",
          "Neo B7": "Common",
          "Axi A16": "Common",
          "Axi V6": "Common",
          "Axi D1": "Common",
          "Lith B11": "Uncommon",
          "Meso D8": "Common",
          "Lith N3": "Uncommon",
          "Axi D2": "Common",
          "Lith S17": "Uncommon",
          "Axi K5": "Common",
          "Neo T3": "Common",
          "Meso B2": "Common",
          "Axi N1": "Common",
          "Lith X1": "Uncommon",
          "Axi B9": "Common",
          "Meso R1": "Common",
          "Lith N17": "Common",
          "Lith T2": "Uncommon",
          "Lith C3": "Uncommon",
          "Lith G13": "Common",
          "Meso S9": "Common",
          "Axi T4": "Common",
          "Meso V13": "Common",
          "Axi C2": "Common",
          "Lith R4": "Common",
          "Lith V3": "Common",
          "Lith N7": "Common",
          "Meso B9": "Common",
          "Axi A7": "Common",
          "Axi G11": "Uncommon",
          "Axi G8": "Common"
        }
      }
    }
  },
  "Akmagnus Prime": {
    IsVaulted: false,
    Parts: {
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Axi M5": "Common"
        }
      },
      Link: {
        DucatValue: 45,
        Drops: {
          "Axi M5": "Uncommon"
        }
      }
    }
  },
  "Exilus Weapon Adapter": {
    IsVaulted: true,
    Parts: {
      Blueprint: {
        DucatValue: 0,
        Drops: {
          "Requiem III": "Rare",
          "Requiem IV": "Rare",
          "Requiem II": "Rare",
          "Requiem I": "Rare"
        }
      }
    }
  },
  "Pangolin Prime": {
    IsVaulted: true,
    Parts: {
      Blade: {
        DucatValue: 45,
        Drops: {
          "Axi A11": "Uncommon",
          "Axi C8": "Uncommon",
          "Axi A13": "Uncommon",
          "Lith S11": "Uncommon",
          "Axi T7": "Uncommon",
          "Lith N7": "Uncommon",
          "Neo S14": "Uncommon",
          "Axi G4": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Lith P5": "Rare",
          "Neo P1": "Rare",
          "Meso P3": "Rare",
          "Neo P3": "Rare",
          "Neo P5": "Rare",
          "Axi P4": "Rare"
        }
      },
      Handle: {
        DucatValue: 15,
        Drops: {
          "Axi V11": "Common",
          "Neo N17": "Common",
          "Meso S11": "Common",
          "Meso N10": "Common",
          "Axi I1": "Common",
          "Axi C6": "Common",
          "Neo N13": "Common",
          "Meso R3": "Common"
        }
      }
    }
  },
  "Dethcube Prime": {
    IsVaulted: true,
    Parts: {
      Carapace: {
        DucatValue: 45,
        Drops: {
          "Lith T4": "Uncommon",
          "Neo B7": "Uncommon",
          "Lith V9": "Uncommon",
          "Meso R3": "Uncommon",
          "Lith M6": "Uncommon",
          "Axi N7": "Uncommon",
          "Neo T2": "Uncommon",
          "Meso L1": "Uncommon"
        }
      },
      Systems: {
        DucatValue: 15,
        Drops: {
          "Axi I1": "Common",
          "Neo I2": "Common",
          "Axi P2": "Common",
          "Lith S10": "Common",
          "Neo G2": "Common",
          "Lith B8": "Common",
          "Neo E2": "Common",
          "Meso T6": "Common"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Lith D1": "Rare",
          "Lith D4": "Rare",
          "Neo D6": "Rare",
          "Lith D3": "Rare",
          "Neo D3": "Rare"
        }
      },
      Cerebrum: {
        DucatValue: 65,
        Drops: {
          "Neo D2": "Rare",
          "Meso D4": "Rare",
          "Meso D6": "Rare",
          "Lith D2": "Rare",
          "Neo A7": "Uncommon"
        }
      }
    }
  },
  "Gram Prime": {
    IsVaulted: true,
    Parts: {
      Blade: {
        DucatValue: 15,
        Drops: {
          "Axi A9": "Common",
          "Meso R4": "Common",
          "Lith W1": "Common",
          "Lith N4": "Common",
          "Lith S8": "Common",
          "Meso M3": "Common",
          "Meso S8": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Axi A8": "Uncommon",
          "Axi O4": "Uncommon",
          "Neo Z8": "Uncommon",
          "Axi T5": "Uncommon",
          "Lith P2": "Uncommon",
          "Meso N7": "Uncommon"
        }
      },
      Handle: {
        DucatValue: 100,
        Drops: {
          "Axi G2": "Rare",
          "Axi G3": "Rare",
          "Axi G5": "Rare",
          "Neo G2": "Rare",
          "Neo G1": "Rare",
          "Axi G4": "Rare"
        }
      }
    }
  },
  "Ayatan Amber Star": {
    IsVaulted: true,
    Parts: {
      "": {
        DucatValue: 0,
        Drops: {
          "Requiem III": "Common",
          "Requiem IV": "Common",
          "Requiem II": "Common",
          "Requiem I": "Common"
        }
      }
    }
  },
  "Vectis Prime": {
    IsVaulted: true,
    Parts: {
      Receiver: {
        DucatValue: 100,
        Drops: {
          "Meso V6": "Rare",
          "Meso V1": "Rare",
          "Lith V10": "Rare"
        }
      },
      Barrel: {
        DucatValue: 15,
        Drops: {
          "Lith V7": "Common",
          "Axi T1": "Common",
          "Axi H1": "Common",
          "Axi C1": "Common",
          "Neo N1": "Common",
          "Meso P12": "Common"
        }
      },
      Stock: {
        DucatValue: 65,
        Drops: {
          "Lith V8": "Uncommon",
          "Axi V3": "Rare",
          "Axi V2": "Rare",
          "Neo B1": "Uncommon",
          "Axi V4": "Rare",
          "Axi K12": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Meso C7": "Uncommon",
          "Lith A1": "Uncommon",
          "Neo A1": "Uncommon",
          "Neo A4": "Uncommon"
        }
      }
    }
  },
  Kuva: {
    IsVaulted: true,
    Parts: {
      "": {
        DucatValue: 0,
        Drops: {
          "Requiem III": "Common",
          "Requiem IV": "Common",
          "Requiem II": "Common",
          "Requiem I": "Common"
        }
      }
    }
  },
  "Hydroid Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 15,
        Drops: {
          "Axi C4": "Common",
          "Meso H1": "Common",
          "Neo S11": "Common",
          "Lith R1": "Common",
          "Neo N8": "Common",
          "Axi C3": "Common",
          "Neo S8": "Common",
          "Neo B4": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Neo A6": "Uncommon",
          "Axi K5": "Uncommon",
          "Meso N5": "Uncommon",
          "Meso Z2": "Uncommon",
          "Meso B2": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 100,
        Drops: {
          "Neo H3": "Rare",
          "Neo H1": "Rare",
          "Axi H4": "Rare",
          "Axi H3": "Rare",
          "Neo H2": "Rare"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 45,
        Drops: {
          "Axi A3": "Uncommon",
          "Axi N4": "Uncommon",
          "Neo G1": "Uncommon",
          "Axi M3": "Uncommon"
        }
      }
    }
  },
  "Banshee Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 100,
        Drops: {
          "Meso B2": "Rare",
          "Neo B1": "Rare",
          "Neo B6": "Rare",
          "Neo B2": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Axi A12": "Uncommon",
          "Neo N7": "Uncommon",
          "Neo H1": "Uncommon",
          "Neo V7": "Uncommon",
          "Meso T2": "Uncommon",
          "Neo T1": "Uncommon",
          "Axi C3": "Uncommon",
          "Axi K3": "Uncommon",
          "Meso E5": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 65,
        Drops: {
          "Axi B1": "Rare",
          "Lith K5": "Uncommon",
          "Neo B5": "Rare",
          "Axi B2": "Rare",
          "Neo B4": "Rare"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 15,
        Drops: {
          "Neo K2": "Common",
          "Lith B5": "Common",
          "Meso S4": "Common",
          "Neo S7": "Common",
          "Lith V5": "Common",
          "Axi H5": "Common",
          "Lith M7": "Common"
        }
      }
    }
  },
  "Zhuge Prime": {
    IsVaulted: true,
    Parts: {
      String: {
        DucatValue: 15,
        Drops: {
          "Axi A11": "Common",
          "Lith N5": "Common",
          "Axi M1": "Common",
          "Neo E3": "Common",
          "Meso W1": "Common",
          "Lith G3": "Common",
          "Axi T5": "Common",
          "Neo I1": "Common"
        }
      },
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Neo N14": "Uncommon",
          "Axi D1": "Uncommon",
          "Axi B3": "Uncommon",
          "Meso W2": "Uncommon"
        }
      },
      Barrel: {
        DucatValue: 100,
        Drops: {
          "Neo Z3": "Rare",
          "Neo Z7": "Rare",
          "Neo Z5": "Rare",
          "Neo Z6": "Rare",
          "Neo Z9": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Axi Z1": "Uncommon",
          "Axi T9": "Uncommon",
          "Axi A6": "Uncommon",
          "Lith L1": "Uncommon",
          "Neo G2": "Uncommon",
          "Lith T5": "Uncommon",
          "Meso P2": "Uncommon",
          "Axi T4": "Uncommon"
        }
      },
      Grip: {
        DucatValue: 15,
        Drops: {
          "Meso A2": "Common",
          "Neo A3": "Common",
          "Axi P3": "Common",
          "Meso R3": "Common",
          "Lith S13": "Common",
          "Meso P3": "Common",
          "Meso T4": "Common",
          "Lith N6": "Common"
        }
      }
    }
  },
  "Aksomati Prime": {
    IsVaulted: true,
    Parts: {
      Receiver: {
        DucatValue: 15,
        Drops: {
          "Neo P2": "Common",
          "Axi S13": "Common",
          "Axi D2": "Common",
          "Lith N6": "Common",
          "Neo B7": "Common",
          "Axi W1": "Common",
          "Neo T5": "Common",
          "Lith K6": "Common",
          "Axi G4": "Common"
        }
      },
      Barrel: {
        DucatValue: 45,
        Drops: {
          "Neo S16": "Uncommon",
          "Neo Z5": "Uncommon",
          "Meso D6": "Uncommon",
          "Lith B7": "Uncommon",
          "Meso S10": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Meso R2": "Common",
          "Lith N8": "Common",
          "Neo R4": "Common",
          "Axi B4": "Common",
          "Axi G6": "Common",
          "Neo I3": "Common",
          "Neo N13": "Common",
          "Lith B8": "Common"
        }
      },
      Link: {
        DucatValue: 100,
        Drops: {
          "Axi A8": "Rare",
          "Axi A10": "Rare",
          "Axi A14": "Rare",
          "Axi A13": "Rare",
          "Axi A15": "Rare"
        }
      }
    }
  },
  "Latron Prime": {
    IsVaulted: true,
    Parts: {
      Blueprint: {
        DucatValue: 25,
        Drops: {
          "Axi L1": "Common",
          "Lith G1": "Common",
          "Lith L4": "Rare"
        }
      },
      Barrel: {
        DucatValue: 15,
        Drops: {
          "Meso E1": "Common",
          "Axi D4": "Common",
          "Axi E1": "Common"
        }
      },
      Stock: {
        DucatValue: 15,
        Drops: {
          "Meso F4": "Common",
          "Lith G2": "Common",
          "Meso F2": "Common"
        }
      },
      Receiver: {
        DucatValue: 25,
        Drops: {
          "Axi S2": "Common",
          "Neo B8": "Uncommon",
          "Neo S5": "Common"
        }
      }
    }
  },
  "Trinity Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 45,
        Drops: {
          "Axi S7": "Uncommon",
          "Axi H1": "Uncommon",
          "Lith S4": "Uncommon",
          "Axi H2": "Uncommon",
          "Neo S1": "Uncommon",
          "Lith L3": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Lith K1": "Uncommon",
          "Axi S1": "Uncommon",
          "Neo N6": "Uncommon",
          "Meso P6": "Uncommon",
          "Meso S4": "Uncommon",
          "Lith K4": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 15,
        Drops: {
          "Axi A1": "Common",
          "Axi V3": "Common",
          "Axi C2": "Common",
          "Axi V2": "Common",
          "Neo N12": "Common",
          "Neo D4": "Common",
          "Axi V4": "Common",
          "Neo B1": "Common"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 25,
        Drops: {
          "Axi V3": "Common",
          "Meso D5": "Common",
          "Neo S6": "Common",
          "Axi C1": "Common",
          "Lith K8": "Uncommon",
          "Neo N7": "Common",
          "Neo D1": "Uncommon"
        }
      }
    }
  },
  "Shade Prime": {
    IsVaulted: true,
    Parts: {
      Carapace: {
        DucatValue: 100,
        Drops: {
          "Neo S18": "Rare",
          "Lith S15": "Rare",
          "Axi S19": "Rare",
          "Axi S16": "Rare"
        }
      },
      Systems: {
        DucatValue: 45,
        Drops: {
          "Meso P14": "Uncommon",
          "Lith A6": "Uncommon",
          "Meso F5": "Uncommon",
          "Lith L6": "Uncommon",
          "Axi B6": "Uncommon",
          "Lith X1": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Axi W4": "Uncommon",
          "Axi H8": "Uncommon",
          "Neo Z11": "Uncommon",
          "Meso N14": "Uncommon",
          "Meso B9": "Uncommon",
          "Axi A17": "Uncommon",
          "Axi W3": "Uncommon"
        }
      },
      Cerebrum: {
        DucatValue: 15,
        Drops: {
          "Neo N22": "Common",
          "Lith F3": "Common",
          "Neo W1": "Common",
          "Neo F2": "Common",
          "Lith M9": "Common",
          "Axi G11": "Common",
          "Lith C12": "Common",
          "Meso W5": "Common"
        }
      }
    }
  },
  Ris: {
    IsVaulted: false,
    Parts: {
      "": {
        DucatValue: 0,
        Drops: {
          "Requiem Eterna": "Common",
          "Requiem III": "Uncommon"
        }
      }
    }
  },
  Fass: {
    IsVaulted: false,
    Parts: {
      "": {
        DucatValue: 0,
        Drops: {
          "Requiem Eterna": "Common",
          "Requiem III": "Uncommon"
        }
      }
    }
  },
  Netra: {
    IsVaulted: false,
    Parts: {
      "": {
        DucatValue: 0,
        Drops: {
          "Requiem Eterna": "Common",
          "Requiem IV": "Uncommon"
        }
      }
    }
  },
  Khra: {
    IsVaulted: false,
    Parts: {
      "": {
        DucatValue: 0,
        Drops: {
          "Requiem Eterna": "Common",
          "Requiem IV": "Uncommon"
        }
      }
    }
  },
  "Venka Prime": {
    IsVaulted: false,
    Parts: {
      Gauntlet: {
        DucatValue: 100,
        Drops: {
          "Neo V4": "Rare",
          "Meso V5": "Rare",
          "Axi V7": "Rare",
          "Axi V9": "Rare",
          "Axi V10": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Neo B2": "Uncommon",
          "Neo N4": "Uncommon",
          "Lith C5": "Uncommon",
          "Axi O3": "Uncommon",
          "Axi S8": "Uncommon"
        }
      },
      Blades: {
        DucatValue: 15,
        Drops: {
          "Meso G1": "Common",
          "Meso S7": "Common",
          "Neo N7": "Common",
          "Neo V9": "Common",
          "Lith V6": "Common",
          "Lith V4": "Common",
          "Lith C2": "Common",
          "Axi S5": "Common",
          "Axi V5": "Common"
        }
      }
    }
  },
  "Loki Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 45,
        Drops: {
          "Lith O2": "Uncommon",
          "Lith G2": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Axi S2": "Common",
          "Neo V8": "Common",
          "Meso F3": "Common"
        }
      },
      "Systems Blueprint": {
        DucatValue: 100,
        Drops: {
          "Axi L4": "Rare",
          "Axi L1": "Rare"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 15,
        Drops: {
          "Meso O3": "Common",
          "Neo E1": "Common"
        }
      }
    }
  },
  "Kompressa Prime": {
    IsVaulted: false,
    Parts: {
      Barrel: {
        DucatValue: 100,
        Drops: {
          "Lith K12": "Rare",
          "Meso K7": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Neo G9": "Common",
          "Lith V11": "Common",
          "Neo C7": "Common",
          "Neo S20": "Common",
          "Axi Y2": "Common"
        }
      },
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Axi A22": "Uncommon",
          "Axi A20": "Uncommon",
          "Axi V14": "Uncommon",
          "Axi N13": "Uncommon"
        }
      }
    }
  },
  "Redeemer Prime": {
    IsVaulted: true,
    Parts: {
      Handle: {
        DucatValue: 100,
        Drops: {
          "Axi R3": "Rare",
          "Neo R3": "Rare",
          "Lith R1": "Rare",
          "Neo R5": "Rare",
          "Neo R4": "Rare",
          "Axi R2": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Meso B4": "Uncommon",
          "Axi G2": "Uncommon",
          "Neo C1": "Uncommon",
          "Lith D2": "Uncommon",
          "Lith B6": "Uncommon",
          "Neo Z4": "Uncommon",
          "Axi M4": "Uncommon",
          "Meso B7": "Uncommon"
        }
      },
      Blade: {
        DucatValue: 15,
        Drops: {
          "Lith L2": "Common",
          "Neo S12": "Common",
          "Neo P1": "Common",
          "Neo T3": "Common",
          "Neo N10": "Common",
          "Lith N9": "Common",
          "Neo G2": "Common",
          "Meso Z2": "Common",
          "Lith D5": "Common",
          "Lith M5": "Common"
        }
      }
    }
  },
  "Dakra Prime": {
    IsVaulted: true,
    Parts: {
      Handle: {
        DucatValue: 15,
        Drops: {
          "Lith M2": "Common",
          "Neo N9": "Common",
          "Lith M8": "Common",
          "Meso M1": "Common",
          "Meso B1": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Axi R1": "Uncommon",
          "Neo B8": "Uncommon",
          "Meso B3": "Uncommon",
          "Lith M1": "Uncommon"
        }
      },
      Blade: {
        DucatValue: 65,
        Drops: {
          "Neo B3": "Uncommon",
          "Axi D4": "Rare",
          "Neo D1": "Rare",
          "Axi S4": "Uncommon"
        }
      }
    }
  },
  "Rhino Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 45,
        Drops: {
          "Lith E1": "Uncommon",
          "Meso N6": "Uncommon",
          "Meso M1": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 15,
        Drops: {
          "Neo B3": "Common",
          "Neo G6": "Common",
          "Axi S3": "Common"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Neo R1": "Rare",
          "Axi R4": "Rare",
          "Axi R1": "Rare"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 45,
        Drops: {
          "Lith B4": "Uncommon",
          "Meso S14": "Uncommon",
          "Lith B1": "Uncommon"
        }
      }
    }
  },
  "Pandero Prime": {
    IsVaulted: true,
    Parts: {
      Barrel: {
        DucatValue: 45,
        Drops: {
          "Neo N16": "Uncommon",
          "Neo N20": "Uncommon",
          "Lith H5": "Uncommon",
          "Neo T8": "Uncommon",
          "Lith C9": "Uncommon",
          "Axi N8": "Uncommon",
          "Axi C6": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Axi N9": "Common",
          "Lith N8": "Common",
          "Lith I1": "Common",
          "Lith N11": "Common",
          "Axi P4": "Common",
          "Neo G4": "Common",
          "Meso N15": "Common"
        }
      },
      Receiver: {
        DucatValue: 100,
        Drops: {
          "Neo P2": "Rare",
          "Axi P5": "Rare",
          "Meso P8": "Rare",
          "Neo P4": "Rare",
          "Meso P9": "Rare"
        }
      }
    }
  },
  "Aklex Prime": {
    IsVaulted: false,
    Parts: {
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Axi A2": "Uncommon",
          "Neo O1": "Uncommon"
        }
      },
      Link: {
        DucatValue: 100,
        Drops: {
          "Axi A2": "Rare"
        }
      }
    }
  },
  "Knell Prime": {
    IsVaulted: true,
    Parts: {
      Barrel: {
        DucatValue: 100,
        Drops: {
          "Axi K9": "Rare",
          "Neo K4": "Rare",
          "Axi K10": "Rare",
          "Axi K7": "Rare",
          "Lith K11": "Rare",
          "Meso K5": "Rare",
          "Axi K11": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Meso V7": "Common",
          "Lith B11": "Common",
          "Axi B5": "Common",
          "Meso S13": "Common",
          "Axi W3": "Common",
          "Axi P4": "Common",
          "Lith S14": "Common",
          "Meso N12": "Common"
        }
      },
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Meso A3": "Uncommon",
          "Axi S15": "Uncommon",
          "Neo D7": "Uncommon",
          "Lith G6": "Uncommon",
          "Meso K6": "Rare",
          "Meso K4": "Uncommon",
          "Lith K10": "Rare",
          "Meso H4": "Uncommon"
        }
      }
    }
  },
  Jahu: {
    IsVaulted: false,
    Parts: {
      "": {
        DucatValue: 0,
        Drops: {
          "Requiem Eterna": "Common",
          "Requiem II": "Uncommon"
        }
      }
    }
  },
  "Nikana Prime": {
    IsVaulted: true,
    Parts: {
      Blade: {
        DucatValue: 65,
        Drops: {
          "Neo S10": "Uncommon",
          "Meso V2": "Rare",
          "Neo N4": "Rare",
          "Meso S15": "Uncommon",
          "Axi S5": "Uncommon",
          "Meso N4": "Rare"
        }
      },
      Hilt: {
        DucatValue: 100,
        Drops: {
          "Axi N6": "Rare",
          "Neo N6": "Rare",
          "Axi N2": "Rare",
          "Meso N8": "Rare",
          "Neo N19": "Rare",
          "Axi N4": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 25,
        Drops: {
          "Axi A1": "Rare",
          "Axi N12": "Common",
          "Neo N5": "Rare",
          "Lith V6": "Common",
          "Neo S13": "Common",
          "Neo S8": "Uncommon",
          "Axi N6": "Common"
        }
      }
    }
  },
  "Perigale Prime": {
    IsVaulted: false,
    Parts: {
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Meso A12": "Common",
          "Meso L4": "Common"
        }
      },
      Barrel: {
        DucatValue: 100,
        Drops: {
          "Axi P10": "Rare",
          "Neo P10": "Rare"
        }
      },
      Stock: {
        DucatValue: 15,
        Drops: {
          "Neo T11": "Common",
          "Neo A16": "Common",
          "Axi C11": "Common"
        }
      },
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Lith T14": "Uncommon",
          "Lith C14": "Uncommon"
        }
      }
    }
  },
  "Gara Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 45,
        Drops: {
          "Meso A4": "Uncommon",
          "Axi K7": "Uncommon",
          "Axi I2": "Uncommon",
          "Lith K6": "Uncommon",
          "Axi S9": "Uncommon",
          "Neo P5": "Uncommon",
          "Axi G8": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 15,
        Drops: {
          "Lith T7": "Common",
          "Neo N21": "Common",
          "Neo A5": "Common",
          "Lith T8": "Common",
          "Axi G7": "Common",
          "Axi C8": "Common",
          "Meso K5": "Common",
          "Lith P6": "Common"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Lith G11": "Rare",
          "Neo G4": "Rare",
          "Axi G9": "Rare",
          "Meso G3": "Rare",
          "Axi G6": "Rare"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 45,
        Drops: {
          "Lith S12": "Uncommon",
          "Neo N18": "Uncommon",
          "Axi S14": "Uncommon",
          "Meso C10": "Uncommon",
          "Meso O5": "Uncommon",
          "Meso P5": "Uncommon"
        }
      }
    }
  },
  "Wisp Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 65,
        Drops: {
          "Neo W1": "Rare",
          "Lith W4": "Rare",
          "Meso W5": "Rare",
          "Lith W3": "Rare",
          "Neo H4": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Meso W4": "Rare",
          "Axi W4": "Rare",
          "Neo W2": "Rare",
          "Meso W3": "Rare",
          "Axi W3": "Rare"
        }
      },
      "Systems Blueprint": {
        DucatValue: 15,
        Drops: {
          "Neo D7": "Common",
          "Meso T7": "Common",
          "Lith N15": "Common",
          "Meso G7": "Common",
          "Axi A17": "Common",
          "Axi B7": "Common",
          "Meso G10": "Common",
          "Lith Q1": "Common"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 45,
        Drops: {
          "Lith L6": "Uncommon",
          "Lith A7": "Uncommon",
          "Meso K6": "Uncommon",
          "Lith G13": "Uncommon",
          "Neo K6": "Uncommon",
          "Axi F2": "Uncommon",
          "Neo A13": "Uncommon"
        }
      }
    }
  },
  "Bronco Prime": {
    IsVaulted: false,
    Parts: {
      Barrel: {
        DucatValue: 45,
        Drops: {
          "Meso D8": "Common",
          "Neo S15": "Uncommon",
          "Axi F3": "Uncommon",
          "Axi E2": "Uncommon",
          "Neo M2": "Uncommon",
          "Meso N10": "Uncommon",
          "Neo V1": "Uncommon",
          "Neo G9": "Uncommon",
          "Meso L4": "Uncommon",
          "Meso R3": "Uncommon",
          "Axi S10": "Uncommon",
          "Lith T10": "Uncommon",
          "Axi W3": "Uncommon",
          "Axi N10": "Uncommon",
          "Axi N3": "Uncommon",
          "Axi W2": "Uncommon",
          "Meso Z6": "Uncommon",
          "Meso V12": "Uncommon",
          "Meso A12": "Uncommon",
          "Meso Z4": "Uncommon",
          "Lith P9": "Uncommon",
          "Neo C6": "Common"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Lith S12": "Common",
          "Lith D4": "Common",
          "Lith P4": "Common",
          "Lith S1": "Common",
          "Lith T7": "Common",
          "Meso N3": "Common",
          "Lith N4": "Common",
          "Axi N2": "Common",
          "Neo G8": "Common",
          "Axi N9": "Common",
          "Axi S1": "Common",
          "Meso F5": "Common",
          "Meso N2": "Common",
          "Meso C2": "Common",
          "Axi P3": "Common",
          "Meso S2": "Common",
          "Axi G15": "Common",
          "Axi N8": "Common",
          "Lith V8": "Common",
          "Meso E2": "Common",
          "Axi P2": "Common",
          "Neo A14": "Common",
          "Lith H1": "Common",
          "Neo S9": "Common",
          "Lith Q3": "Common",
          "Lith K6": "Common",
          "Lith N18": "Common",
          "Lith N1": "Common",
          "Neo M1": "Common",
          "Axi C7": "Common",
          "Lith A6": "Common",
          "Meso V5": "Common",
          "Meso A4": "Common",
          "Meso P11": "Common",
          "Lith M6": "Common",
          "Axi G12": "Common"
        }
      },
      Receiver: {
        DucatValue: 15,
        Drops: {
          "Meso Y2": "Common",
          "Axi T7": "Common",
          "Neo K6": "Common",
          "Neo S8": "Common",
          "Meso S12": "Common",
          "Axi T10": "Common",
          "Axi F2": "Common",
          "Lith O4": "Common",
          "Meso G4": "Common",
          "Meso B4": "Common",
          "Axi S1": "Common",
          "Neo N14": "Common",
          "Neo B1": "Common",
          "Lith C13": "Common",
          "Lith P5": "Common",
          "Neo Z11": "Common",
          "Neo M3": "Common",
          "Meso P1": "Common",
          "Meso P15": "Common",
          "Neo N24": "Common",
          "Meso E3": "Common",
          "Meso S8": "Common",
          "Neo S11": "Common",
          "Meso F1": "Common",
          "Lith L7": "Common",
          "Neo G9": "Common",
          "Neo N6": "Common",
          "Lith A8": "Common",
          "Axi W1": "Common",
          "Meso C8": "Common",
          "Neo V4": "Common",
          "Meso V13": "Common",
          "Axi A19": "Common",
          "Lith Q1": "Common",
          "Axi M2": "Common",
          "Neo M6": "Common",
          "Lith C2": "Common",
          "Lith P8": "Common",
          "Neo Z3": "Common"
        }
      }
    }
  },
  "Ember Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 15,
        Drops: {
          "Neo F1": "Common",
          "Vanguard C1": "Common",
          "Meso F2": "Common",
          "Meso B10": "Common"
        }
      },
      "Systems Blueprint": {
        DucatValue: 45,
        Drops: {
          "Axi S2": "Uncommon",
          "Lith G1": "Uncommon",
          "Axi R4": "Uncommon",
          "Vanguard P1": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Meso E1": "Rare",
          "Vanguard E1": "Rare",
          "Lith E1": "Rare",
          "Axi E1": "Rare",
          "Neo E1": "Rare"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 25,
        Drops: {
          "Meso F3": "Common",
          "Neo S5": "Common",
          "Meso S14": "Uncommon",
          "Vanguard M1": "Common"
        }
      }
    }
  },
  "Zephyr Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 25,
        Drops: {
          "Meso A2": "Uncommon",
          "Axi L3": "Uncommon",
          "Meso W1": "Uncommon",
          "Neo K1": "Uncommon",
          "Meso R4": "Common",
          "Neo A2": "Uncommon",
          "Axi O3": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 100,
        Drops: {
          "Lith Z1": "Rare",
          "Neo Z8": "Rare",
          "Lith Z2": "Rare",
          "Meso Z2": "Rare",
          "Meso Z3": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 65,
        Drops: {
          "Neo Z4": "Rare",
          "Neo Z2": "Rare",
          "Meso Z1": "Rare",
          "Axi G5": "Uncommon",
          "Neo Z1": "Rare"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 15,
        Drops: {
          "Neo N10": "Common",
          "Neo Z3": "Common",
          "Lith H2": "Common",
          "Axi A4": "Common",
          "Lith K2": "Common",
          "Axi O4": "Common",
          "Lith C8": "Common",
          "Axi R3": "Common"
        }
      }
    }
  },
  "Boltor Prime": {
    IsVaulted: true,
    Parts: {
      Stock: {
        DucatValue: 15,
        Drops: {
          "Axi R1": "Common",
          "Axi R4": "Common",
          "Axi S3": "Common"
        }
      },
      Barrel: {
        DucatValue: 15,
        Drops: {
          "Lith E1": "Common",
          "Meso N6": "Common",
          "Meso M1": "Common"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Neo B3": "Rare",
          "Lith B4": "Rare",
          "Meso B10": "Rare"
        }
      },
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Neo R1": "Uncommon",
          "Neo G6": "Uncommon",
          "Lith B1": "Uncommon"
        }
      }
    }
  },
  "Xaku Prime": {
    IsVaulted: false,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 45,
        Drops: {
          "Neo C9": "Uncommon",
          "Axi V12": "Uncommon",
          "Neo V11": "Uncommon",
          "Neo V12": "Uncommon",
          "Neo G8": "Uncommon",
          "Lith O4": "Uncommon",
          "Neo K9": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Lith X1": "Rare",
          "Neo X1": "Rare",
          "Meso X1": "Rare"
        }
      },
      "Systems Blueprint": {
        DucatValue: 45,
        Drops: {
          "Axi S20": "Uncommon",
          "Lith A12": "Uncommon",
          "Lith A10": "Uncommon",
          "Axi M6": "Uncommon",
          "Neo O3": "Uncommon",
          "Axi A19": "Uncommon"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 15,
        Drops: {
          "Meso T8": "Common",
          "Lith N17": "Common",
          "Meso E6": "Common",
          "Lith S16": "Common",
          "Meso V11": "Common",
          "Axi T13": "Common",
          "Meso A10": "Common",
          "Meso K8": "Common"
        }
      }
    }
  },
  "Scindo Prime": {
    IsVaulted: false,
    Parts: {
      Handle: {
        DucatValue: 25,
        Drops: {
          "Meso N11": "Common",
          "Meso N6": "Uncommon",
          "Meso C1": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Lith B4": "Uncommon",
          "Lith C7": "Uncommon",
          "Lith F1": "Uncommon"
        }
      },
      Blade: {
        DucatValue: 100,
        Drops: {
          "Axi S3": "Rare",
          "Axi S8": "Rare",
          "Axi S1": "Rare"
        }
      }
    }
  },
  "Nyx Prime": {
    IsVaulted: false,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 65,
        Drops: {
          "Neo R1": "Uncommon",
          "Neo N1": "Rare",
          "Axi S8": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 45,
        Drops: {
          "Axi S3": "Uncommon",
          "Lith C7": "Uncommon",
          "Neo S2": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Neo V1": "Common",
          "Lith S2": "Common",
          "Neo V9": "Common",
          "Lith B4": "Common"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 100,
        Drops: {
          "Meso N1": "Rare",
          "Meso N11": "Rare",
          "Meso N6": "Rare"
        }
      }
    }
  },
  "Dual Keres Prime": {
    IsVaulted: true,
    Parts: {
      Handle: {
        DucatValue: 45,
        Drops: {
          "Meso V7": "Uncommon",
          "Neo W1": "Uncommon",
          "Meso H8": "Uncommon",
          "Meso P11": "Uncommon",
          "Lith T10": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Neo D7": "Rare",
          "Neo D5": "Rare",
          "Lith D6": "Rare",
          "Axi D5": "Rare",
          "Neo D8": "Rare",
          "Meso D7": "Rare"
        }
      },
      Blade: {
        DucatValue: 15,
        Drops: {
          "Neo N22": "Common",
          "Meso M4": "Common",
          "Axi G9": "Common",
          "Neo K8": "Common",
          "Lith G9": "Common",
          "Lith W3": "Common",
          "Axi G8": "Common"
        }
      }
    }
  },
  "Gyre Prime": {
    IsVaulted: false,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 45,
        Drops: {
          "Axi T13": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 15,
        Drops: {
          "Meso V14": "Common",
          "Meso E7": "Common",
          "Meso Y2": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Neo T10": "Uncommon",
          "Lith Q3": "Uncommon"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 100,
        Drops: {
          "Lith G14": "Rare"
        }
      }
    }
  },
  "Gauss Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 15,
        Drops: {
          "Lith M9": "Common",
          "Meso P15": "Common",
          "Neo W1": "Common",
          "Neo P7": "Common",
          "Meso A11": "Common",
          "Neo A14": "Common",
          "Neo O2": "Common",
          "Lith C13": "Common"
        }
      },
      Blueprint: {
        DucatValue: 25,
        Drops: {
          "Neo G9": "Common",
          "Axi B7": "Uncommon",
          "Neo A15": "Common",
          "Neo M5": "Uncommon",
          "Neo T9": "Uncommon",
          "Axi Z2": "Common",
          "Neo G10": "Uncommon",
          "Neo D10": "Uncommon",
          "Lith N16": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 100,
        Drops: {
          "Meso G9": "Rare",
          "Lith G12": "Rare",
          "Meso G7": "Rare",
          "Axi G15": "Rare",
          "Lith G9": "Rare",
          "Neo G8": "Rare",
          "Neo G9": "Rare"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 45,
        Drops: {
          "Meso H5": "Uncommon",
          "Axi V12": "Uncommon",
          "Axi P9": "Uncommon",
          "Meso T7": "Uncommon",
          "Meso Z6": "Uncommon",
          "Axi V13": "Uncommon",
          "Neo E4": "Uncommon"
        }
      }
    }
  },
  "Daikyu Prime": {
    IsVaulted: false,
    Parts: {
      String: {
        DucatValue: 15,
        Drops: {
          "Lith N19": "Common",
          "Axi V12": "Common",
          "Lith S18": "Common",
          "Neo A15": "Common",
          "Axi A20": "Common"
        }
      },
      "Lower Limb": {
        DucatValue: 45,
        Drops: {
          "Lith A12": "Uncommon",
          "Axi C11": "Uncommon",
          "Lith A8": "Uncommon",
          "Axi C10": "Uncommon",
          "Meso A9": "Uncommon"
        }
      },
      "Upper Limb": {
        DucatValue: 45,
        Drops: {
          "Meso E7": "Uncommon",
          "Neo C7": "Uncommon",
          "Meso Y2": "Uncommon",
          "Meso P16": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Lith Q2": "Common",
          "Lith T14": "Common",
          "Neo N24": "Common",
          "Neo C8": "Common",
          "Lith E2": "Common"
        }
      },
      Grip: {
        DucatValue: 100,
        Drops: {
          "Lith D7": "Rare",
          "Meso D8": "Rare",
          "Neo D10": "Rare"
        }
      }
    }
  },
  "Nidus Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 100,
        Drops: {
          "Axi N12": "Rare",
          "Neo N18": "Rare",
          "Meso N14": "Rare",
          "Lith N7": "Rare",
          "Meso N13": "Rare",
          "Lith N12": "Rare"
        }
      },
      "Systems Blueprint": {
        DucatValue: 15,
        Drops: {
          "Meso A3": "Common",
          "Neo C2": "Common",
          "Meso P9": "Common",
          "Meso D7": "Common",
          "Neo A8": "Common",
          "Meso B5": "Common",
          "Neo N19": "Common",
          "Meso H2": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Lith K10": "Uncommon",
          "Lith T9": "Uncommon",
          "Meso P8": "Uncommon",
          "Lith R2": "Uncommon",
          "Meso R5": "Uncommon",
          "Axi A14": "Uncommon",
          "Lith S17": "Uncommon",
          "Meso N12": "Uncommon"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 65,
        Drops: {
          "Neo N16": "Rare",
          "Axi N9": "Rare",
          "Neo S19": "Uncommon",
          "Axi N10": "Rare"
        }
      }
    }
  },
  "Epitaph Prime": {
    IsVaulted: true,
    Parts: {
      Barrel: {
        DucatValue: 45,
        Drops: {
          "Neo P9": "Uncommon",
          "Axi P8": "Uncommon",
          "Lith Q2": "Uncommon",
          "Lith W4": "Uncommon",
          "Neo V11": "Uncommon",
          "Axi Y2": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Axi Y3": "Common",
          "Axi A19": "Common",
          "Axi C10": "Common",
          "Axi C11": "Common",
          "Lith D7": "Common",
          "Axi F3": "Common",
          "Axi O6": "Common",
          "Meso K7": "Common"
        }
      },
      Receiver: {
        DucatValue: 100,
        Drops: {
          "Meso E6": "Rare",
          "Meso E7": "Rare",
          "Lith E2": "Rare",
          "Neo E4": "Rare"
        }
      }
    }
  },
  "Valkyr Prime": {
    IsVaulted: false,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 100,
        Drops: {
          "Axi V5": "Rare",
          "Neo V9": "Rare",
          "Neo V7": "Rare",
          "Lith V6": "Rare",
          "Axi V6": "Rare"
        }
      },
      "Systems Blueprint": {
        DucatValue: 65,
        Drops: {
          "Meso V3": "Rare",
          "Lith V3": "Rare",
          "Lith V5": "Rare",
          "Axi V9": "Uncommon",
          "Axi V10": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Meso S3": "Common",
          "Lith N3": "Common",
          "Lith T2": "Common",
          "Lith C7": "Common",
          "Lith A2": "Common",
          "Axi V7": "Common",
          "Meso S6": "Common",
          "Meso N8": "Common",
          "Axi V9": "Common",
          "Neo K1": "Common"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 45,
        Drops: {
          "Meso N11": "Uncommon",
          "Neo N7": "Uncommon",
          "Lith C5": "Uncommon",
          "Meso D2": "Uncommon",
          "Meso V4": "Uncommon",
          "Lith S6": "Uncommon",
          "Meso N8": "Uncommon",
          "Lith T1": "Uncommon",
          "Meso C2": "Uncommon"
        }
      }
    }
  },
  "Wyrm Prime": {
    IsVaulted: true,
    Parts: {
      Carapace: {
        DucatValue: 15,
        Drops: {
          "Axi L4": "Common",
          "Axi L1": "Common"
        }
      },
      Systems: {
        DucatValue: 45,
        Drops: {
          "Meso O3": "Uncommon",
          "Meso E1": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Axi S2": "Common",
          "Neo E1": "Common",
          "Neo V8": "Common"
        }
      },
      Cerebrum: {
        DucatValue: 15,
        Drops: {
          "Lith O2": "Common",
          "Lith G2": "Common"
        }
      }
    }
  },
  "Mirage Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 15,
        Drops: {
          "Axi A12": "Common",
          "Meso K2": "Common",
          "Lith K5": "Common",
          "Lith S7": "Common",
          "Axi H4": "Common",
          "Neo L1": "Common"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Axi M1": "Rare",
          "Neo M1": "Rare",
          "Meso M2": "Rare",
          "Meso M3": "Rare",
          "Lith M7": "Rare"
        }
      },
      "Systems Blueprint": {
        DucatValue: 45,
        Drops: {
          "Neo S12": "Uncommon",
          "Neo K2": "Uncommon",
          "Neo V6": "Uncommon",
          "Meso O2": "Uncommon",
          "Axi H5": "Uncommon",
          "Axi R2": "Uncommon"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 15,
        Drops: {
          "Neo B6": "Common",
          "Lith Z1": "Common",
          "Neo S9": "Common",
          "Meso E5": "Common",
          "Axi T2": "Common",
          "Lith W1": "Common",
          "Neo G1": "Common",
          "Meso H1": "Common"
        }
      }
    }
  },
  "Cobra & Crane Prime": {
    IsVaulted: true,
    Parts: {
      Blade: {
        DucatValue: 45,
        Drops: {
          "Meso H6": "Uncommon",
          "Meso R6": "Uncommon",
          "Meso W5": "Uncommon",
          "Neo F2": "Uncommon",
          "Meso N14": "Uncommon",
          "Axi G9": "Uncommon",
          "Axi L6": "Uncommon",
          "Neo G7": "Uncommon"
        }
      },
      Hilt: {
        DucatValue: 15,
        Drops: {
          "Neo K6": "Common",
          "Lith H7": "Common",
          "Lith G12": "Common",
          "Meso G7": "Common",
          "Axi H7": "Common",
          "Axi A18": "Common",
          "Axi H6": "Common",
          "Lith A9": "Common"
        }
      },
      Guard: {
        DucatValue: 100,
        Drops: {
          "Lith C11": "Rare",
          "Axi C9": "Rare",
          "Lith C12": "Rare",
          "Neo C3": "Rare",
          "Meso C8": "Rare",
          "Lith C10": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Lith N15": "Uncommon",
          "Lith G10": "Uncommon",
          "Neo S18": "Uncommon",
          "Meso K5": "Uncommon",
          "Axi B9": "Uncommon",
          "Axi K11": "Uncommon"
        }
      }
    }
  },
  "Baza Prime": {
    IsVaulted: true,
    Parts: {
      Receiver: {
        DucatValue: 15,
        Drops: {
          "Axi W2": "Common",
          "Axi N7": "Common",
          "Neo R3": "Common",
          "Meso C6": "Common",
          "Meso E4": "Common",
          "Lith K7": "Common",
          "Meso P2": "Common",
          "Axi A15": "Common"
        }
      },
      Barrel: {
        DucatValue: 45,
        Drops: {
          "Lith A4": "Uncommon",
          "Lith S10": "Uncommon",
          "Axi I2": "Uncommon",
          "Axi Z1": "Uncommon",
          "Neo I3": "Uncommon",
          "Lith W2": "Uncommon",
          "Neo N15": "Uncommon"
        }
      },
      Stock: {
        DucatValue: 100,
        Drops: {
          "Axi B3": "Rare",
          "Neo B7": "Rare",
          "Meso B6": "Rare",
          "Lith B9": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 65,
        Drops: {
          "Meso B4": "Rare",
          "Axi B4": "Rare",
          "Axi S13": "Uncommon",
          "Lith B8": "Rare",
          "Meso B5": "Rare",
          "Lith B7": "Rare"
        }
      }
    }
  },
  "Inaros Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 45,
        Drops: {
          "Lith N6": "Uncommon",
          "Axi O5": "Uncommon",
          "Neo V10": "Uncommon",
          "Lith H4": "Uncommon",
          "Axi K6": "Uncommon",
          "Neo P3": "Uncommon",
          "Neo A10": "Uncommon",
          "Neo T3": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 15,
        Drops: {
          "Neo N13": "Common",
          "Neo T5": "Common",
          "Neo K4": "Common",
          "Axi A13": "Common",
          "Axi T7": "Common",
          "Meso C7": "Common",
          "Axi G7": "Common",
          "Lith M6": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Axi W2": "Uncommon",
          "Lith N10": "Uncommon",
          "Axi W1": "Uncommon",
          "Axi K12": "Uncommon",
          "Lith G4": "Uncommon",
          "Meso N12": "Uncommon"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 100,
        Drops: {
          "Axi I2": "Rare",
          "Axi I1": "Rare",
          "Meso I1": "Rare",
          "Axi I3": "Rare",
          "Meso I2": "Rare"
        }
      }
    }
  },
  "Karyst Prime": {
    IsVaulted: true,
    Parts: {
      Handle: {
        DucatValue: 45,
        Drops: {
          "Lith T4": "Uncommon",
          "Neo N20": "Uncommon",
          "Neo A5": "Uncommon",
          "Axi B4": "Uncommon",
          "Meso C7": "Uncommon",
          "Meso G3": "Uncommon",
          "Lith I1": "Uncommon",
          "Axi A14": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Meso B5": "Common",
          "Axi C6": "Common",
          "Axi G6": "Common",
          "Axi I3": "Common",
          "Axi K7": "Common",
          "Neo P4": "Common",
          "Meso P3": "Common",
          "Neo S14": "Common",
          "Meso I2": "Common"
        }
      },
      Blade: {
        DucatValue: 100,
        Drops: {
          "Meso K3": "Rare",
          "Lith K6": "Rare",
          "Axi K6": "Rare",
          "Lith K7": "Rare",
          "Axi K12": "Rare"
        }
      }
    }
  },
  "Grendel Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 45,
        Drops: {
          "Lith C12": "Uncommon",
          "Neo S18": "Uncommon",
          "Lith G13": "Uncommon",
          "Lith A11": "Uncommon",
          "Lith M10": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 65,
        Drops: {
          "Axi G14": "Rare",
          "Axi G11": "Rare",
          "Neo M6": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Neo G10": "Rare",
          "Meso G8": "Rare",
          "Lith G8": "Rare",
          "Meso G6": "Rare",
          "Neo G7": "Rare"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 15,
        Drops: {
          "Neo Q1": "Common",
          "Meso B8": "Common",
          "Axi M6": "Common",
          "Axi G15": "Common",
          "Neo M5": "Common",
          "Meso A5": "Common",
          "Axi S17": "Common"
        }
      }
    }
  },
  "Sevagoth Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 100,
        Drops: {
          "Neo S20": "Rare",
          "Lith S16": "Rare",
          "Axi S18": "Rare",
          "Axi S17": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Axi Y3": "Uncommon",
          "Axi Z2": "Uncommon",
          "Meso V12": "Uncommon",
          "Neo A13": "Uncommon",
          "Lith L7": "Uncommon",
          "Lith Z4": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 15,
        Drops: {
          "Lith C12": "Common",
          "Lith E2": "Common",
          "Lith C14": "Common",
          "Meso G8": "Common",
          "Lith D7": "Common",
          "Lith M10": "Common",
          "Lith A7": "Common"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 15,
        Drops: {
          "Axi G14": "Common",
          "Meso A9": "Common",
          "Meso A7": "Common",
          "Neo T9": "Common",
          "Axi Y1": "Common",
          "Meso L4": "Common",
          "Neo K9": "Common",
          "Meso L3": "Common"
        }
      }
    }
  },
  "Garuda Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 45,
        Drops: {
          "Neo N22": "Uncommon",
          "Meso N13": "Uncommon",
          "Axi B6": "Uncommon",
          "Neo S15": "Uncommon",
          "Axi G9": "Uncommon",
          "Lith R4": "Uncommon",
          "Meso P7": "Uncommon",
          "Meso P13": "Uncommon",
          "Axi N11": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 65,
        Drops: {
          "Neo K8": "Uncommon",
          "Axi G7": "Rare",
          "Axi G8": "Rare",
          "Axi G10": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Neo A8": "Common",
          "Lith C10": "Common",
          "Lith H9": "Common",
          "Meso S12": "Common",
          "Meso P14": "Common",
          "Neo C5": "Common",
          "Neo N20": "Common",
          "Axi H6": "Common",
          "Meso P8": "Common",
          "Meso K4": "Common"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 100,
        Drops: {
          "Axi G12": "Rare",
          "Axi G13": "Rare",
          "Lith G5": "Rare",
          "Lith G6": "Rare"
        }
      }
    }
  },
  "Mag Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 45,
        Drops: {
          "Neo B3": "Uncommon",
          "Meso F4": "Uncommon",
          "Meso B3": "Uncommon",
          "Meso B1": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Lith M8": "Rare",
          "Lith M2": "Rare",
          "Meso M1": "Rare",
          "Lith M1": "Rare"
        }
      },
      "Systems Blueprint": {
        DucatValue: 15,
        Drops: {
          "Axi R1": "Common",
          "Neo D1": "Common",
          "Axi S4": "Common",
          "Lith L4": "Common"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 25,
        Drops: {
          "Axi D4": "Uncommon",
          "Axi V2": "Common",
          "Neo N9": "Common",
          "Lith B1": "Common"
        }
      }
    }
  },
  "Ninkondi Prime": {
    IsVaulted: true,
    Parts: {
      Handle: {
        DucatValue: 100,
        Drops: {
          "Lith N13": "Rare",
          "Lith N5": "Rare",
          "Meso N9": "Rare",
          "Meso N10": "Rare",
          "Neo N14": "Rare",
          "Meso N7": "Rare",
          "Lith N4": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Neo R2": "Common",
          "Axi T9": "Common",
          "Meso K3": "Common",
          "Neo P1": "Common",
          "Axi G3": "Common",
          "Neo S14": "Common",
          "Meso T4": "Common",
          "Meso L1": "Common"
        }
      },
      Chain: {
        DucatValue: 45,
        Drops: {
          "Axi P1": "Uncommon",
          "Neo R3": "Uncommon",
          "Lith D4": "Uncommon",
          "Lith D1": "Uncommon",
          "Neo R4": "Uncommon",
          "Lith D3": "Uncommon",
          "Neo Z9": "Uncommon"
        }
      }
    }
  },
  "Athodai Prime": {
    IsVaulted: false,
    Parts: {
      Barrel: {
        DucatValue: 100,
        Drops: {
          "Neo A16": "Rare"
        }
      },
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Axi P10": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Meso L5": "Common"
        }
      }
    }
  },
  "Okina Prime": {
    IsVaulted: true,
    Parts: {
      Handle: {
        DucatValue: 45,
        Drops: {
          "Meso Y1": "Uncommon",
          "Neo Z11": "Uncommon",
          "Meso G7": "Uncommon",
          "Meso A8": "Uncommon",
          "Lith Z4": "Uncommon",
          "Neo G8": "Uncommon",
          "Meso L3": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Neo O3": "Rare",
          "Lith O4": "Rare",
          "Axi O6": "Rare",
          "Neo O2": "Rare"
        }
      },
      Blade: {
        DucatValue: 15,
        Drops: {
          "Lith L5": "Common",
          "Lith C12": "Common",
          "Axi N13": "Common",
          "Meso T7": "Common",
          "Axi C10": "Common",
          "Lith L7": "Common",
          "Axi B8": "Common"
        }
      }
    }
  },
  "Euphona Prime": {
    IsVaulted: true,
    Parts: {
      Barrel: {
        DucatValue: 45,
        Drops: {
          "Meso V5": "Uncommon",
          "Meso N3": "Uncommon",
          "Neo M1": "Uncommon",
          "Lith M7": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Neo H2": "Common",
          "Neo N7": "Common",
          "Axi O1": "Common",
          "Neo B6": "Common",
          "Axi B1": "Common",
          "Neo K1": "Common",
          "Axi N5": "Common",
          "Axi H5": "Common",
          "Neo L1": "Common"
        }
      },
      Receiver: {
        DucatValue: 100,
        Drops: {
          "Meso E5": "Rare",
          "Axi E2": "Rare"
        }
      }
    }
  },
  "Tatsu Prime": {
    IsVaulted: true,
    Parts: {
      Blade: {
        DucatValue: 45,
        Drops: {
          "Axi C9": "Uncommon",
          "Meso B8": "Uncommon",
          "Lith G6": "Uncommon",
          "Lith R5": "Uncommon",
          "Neo T6": "Uncommon",
          "Meso G7": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Lith H6": "Common",
          "Neo L3": "Common",
          "Neo S18": "Common",
          "Axi N10": "Common",
          "Axi P7": "Common",
          "Meso G6": "Common",
          "Meso S12": "Common",
          "Neo D8": "Common",
          "Lith A9": "Common"
        }
      },
      Handle: {
        DucatValue: 100,
        Drops: {
          "Axi T10": "Rare",
          "Lith T12": "Rare",
          "Lith T10": "Rare",
          "Neo T7": "Rare",
          "Lith T13": "Rare"
        }
      }
    }
  },
  "Kogake Prime": {
    IsVaulted: true,
    Parts: {
      Boot: {
        DucatValue: 15,
        Drops: {
          "Axi A12": "Common",
          "Lith L1": "Common",
          "Axi A3": "Common",
          "Meso M2": "Common",
          "Axi T2": "Common",
          "Neo G1": "Common",
          "Lith M7": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Axi C4": "Uncommon",
          "Neo B6": "Uncommon",
          "Meso M3": "Uncommon",
          "Axi V7": "Uncommon",
          "Axi P1": "Uncommon",
          "Axi K4": "Uncommon"
        }
      },
      Gauntlet: {
        DucatValue: 100,
        Drops: {
          "Meso K1": "Rare",
          "Lith K5": "Rare",
          "Neo K1": "Rare",
          "Lith K2": "Rare",
          "Neo K2": "Rare"
        }
      }
    }
  },
  "Panthera Prime": {
    IsVaulted: true,
    Parts: {
      Stock: {
        DucatValue: 45,
        Drops: {
          "Lith V10": "Uncommon",
          "Meso T5": "Uncommon",
          "Meso N10": "Uncommon",
          "Axi M2": "Uncommon",
          "Lith G3": "Uncommon",
          "Meso G3": "Uncommon",
          "Axi S10": "Uncommon"
        }
      },
      Barrel: {
        DucatValue: 100,
        Drops: {
          "Lith P3": "Rare",
          "Meso P4": "Rare",
          "Lith P4": "Rare",
          "Meso P12": "Rare",
          "Meso P7": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Axi Z1": "Common",
          "Axi S11": "Common",
          "Neo K4": "Common",
          "Axi C5": "Common",
          "Axi I1": "Common",
          "Neo P3": "Common",
          "Axi O5": "Common",
          "Axi I3": "Common"
        }
      },
      Receiver: {
        DucatValue: 100,
        Drops: {
          "Meso P5": "Rare",
          "Neo A10": "Uncommon",
          "Meso P2": "Rare"
        }
      }
    }
  },
  "Protea Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 65,
        Drops: {
          "Axi P8": "Rare",
          "Neo P7": "Rare",
          "Vanguard M1": "Uncommon",
          "Axi P7": "Rare",
          "Meso P17": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Meso W4": "Common",
          "Axi N13": "Common",
          "Meso V10": "Common",
          "Meso K7": "Common",
          "Axi V13": "Common",
          "Vanguard C1": "Common",
          "Meso V14": "Common",
          "Lith W4": "Common",
          "Neo C6": "Common"
        }
      },
      "Systems Blueprint": {
        DucatValue: 100,
        Drops: {
          "Neo P9": "Rare",
          "Meso P15": "Rare",
          "Axi P9": "Rare",
          "Lith P9": "Rare",
          "Meso P16": "Rare",
          "Vanguard P1": "Rare"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 25,
        Drops: {
          "Meso T8": "Uncommon",
          "Lith D7": "Uncommon",
          "Vanguard E1": "Common",
          "Axi T12": "Uncommon",
          "Neo P6": "Uncommon",
          "Neo D9": "Uncommon",
          "Lith O4": "Uncommon",
          "Axi S16": "Uncommon"
        }
      }
    }
  },
  "Dual Kamas Prime": {
    IsVaulted: true,
    Parts: {
      Blade: {
        DucatValue: 100,
        Drops: {
          "Meso D1": "Rare",
          "Axi D3": "Rare",
          "Meso D5": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Axi N3": "Common",
          "Neo T1": "Common",
          "Lith L3": "Common",
          "Axi V5": "Common",
          "Neo V1": "Common",
          "Axi V1": "Common",
          "Lith S6": "Common",
          "Lith K4": "Common"
        }
      },
      Handle: {
        DucatValue: 45,
        Drops: {
          "Axi A1": "Uncommon",
          "Meso F1": "Uncommon",
          "Neo N12": "Uncommon",
          "Neo D4": "Uncommon",
          "Meso N1": "Uncommon"
        }
      }
    }
  },
  "Cernos Prime": {
    IsVaulted: false,
    Parts: {
      String: {
        DucatValue: 25,
        Drops: {
          "Axi K2": "Uncommon",
          "Axi A3": "Uncommon",
          "Neo A1": "Uncommon",
          "Meso O1": "Uncommon",
          "Meso S6": "Uncommon",
          "Meso N8": "Uncommon",
          "Lith B3": "Uncommon",
          "Axi V10": "Common"
        }
      },
      "Lower Limb": {
        DucatValue: 100,
        Drops: {
          "Axi C2": "Rare",
          "Meso C3": "Rare",
          "Lith C5": "Rare",
          "Lith C2": "Rare",
          "Lith C7": "Rare",
          "Axi C1": "Rare"
        }
      },
      "Upper Limb": {
        DucatValue: 15,
        Drops: {
          "Meso N11": "Common",
          "Meso K1": "Common",
          "Meso O2": "Common",
          "Lith V3": "Common",
          "Neo N6": "Common",
          "Meso S7": "Common",
          "Meso N8": "Common",
          "Axi N4": "Common",
          "Meso C2": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Lith Z1": "Uncommon",
          "Lith A2": "Uncommon",
          "Axi B1": "Uncommon",
          "Neo V9": "Uncommon",
          "Neo V7": "Uncommon",
          "Axi V4": "Uncommon",
          "Neo S13": "Uncommon"
        }
      },
      Grip: {
        DucatValue: 15,
        Drops: {
          "Lith V6": "Common",
          "Axi S8": "Common",
          "Neo V4": "Common",
          "Axi K3": "Common",
          "Meso V5": "Common",
          "Axi H3": "Common",
          "Axi S5": "Common",
          "Neo V6": "Common"
        }
      }
    }
  },
  "Venato Prime": {
    IsVaulted: false,
    Parts: {
      Handle: {
        DucatValue: 15,
        Drops: {
          "Meso G9": "Common",
          "Axi A22": "Common",
          "Neo N24": "Common",
          "Meso V15": "Common",
          "Meso P17": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Meso A9": "Uncommon",
          "Lith E2": "Uncommon",
          "Neo C8": "Uncommon"
        }
      },
      Blade: {
        DucatValue: 100,
        Drops: {
          "Axi V13": "Rare",
          "Meso V13": "Rare"
        }
      }
    }
  },
  "Gunsen Prime": {
    IsVaulted: true,
    Parts: {
      Handle: {
        DucatValue: 45,
        Drops: {
          "Meso W4": "Uncommon",
          "Neo T7": "Uncommon",
          "Axi T12": "Uncommon",
          "Neo B9": "Uncommon",
          "Meso P15": "Uncommon",
          "Axi S19": "Uncommon",
          "Neo K7": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Lith C11": "Common",
          "Meso F5": "Common",
          "Lith L6": "Common",
          "Axi P9": "Common",
          "Neo P6": "Common",
          "Lith N16": "Common",
          "Neo Z10": "Common",
          "Neo C4": "Common"
        }
      },
      Blade: {
        DucatValue: 100,
        Drops: {
          "Lith G13": "Rare",
          "Meso G5": "Rare",
          "Meso G10": "Rare",
          "Lith G10": "Rare"
        }
      }
    }
  },
  "Paris Prime": {
    IsVaulted: false,
    Parts: {
      String: {
        DucatValue: 15,
        Drops: {
          "Neo A5": "Common",
          "Neo N21": "Common",
          "Neo M1": "Common",
          "Lith H4": "Common",
          "Meso S10": "Common",
          "Meso A7": "Common",
          "Neo V3": "Common",
          "Neo D9": "Common",
          "Meso H6": "Common",
          "Meso N12": "Common",
          "Lith K10": "Common",
          "Meso E6": "Common",
          "Neo N3": "Common",
          "Neo B1": "Common",
          "Neo N8": "Common",
          "Axi S20": "Common",
          "Axi N12": "Common",
          "Meso M3": "Common",
          "Lith S3": "Common",
          "Meso Z6": "Common",
          "Axi T6": "Common",
          "Meso S2": "Common",
          "Meso K2": "Common",
          "Neo N4": "Common",
          "Axi O2": "Common",
          "Lith Q3": "Common",
          "Axi S18": "Common",
          "Lith H9": "Common",
          "Neo Z4": "Common",
          "Neo V5": "Common",
          "Neo P9": "Common",
          "Meso B8": "Common",
          "Lith S1": "Common",
          "Meso N9": "Common",
          "Meso M2": "Common",
          "Neo Z6": "Common",
          "Lith H3": "Common",
          "Neo A12": "Common"
        }
      },
      "Lower Limb": {
        DucatValue: 15,
        Drops: {
          "Lith T5": "Common",
          "Meso O1": "Common",
          "Axi D6": "Common",
          "Lith V2": "Common",
          "Lith Z3": "Common",
          "Axi S12": "Common",
          "Neo E4": "Common",
          "Neo P1": "Common",
          "Axi H7": "Common",
          "Axi A18": "Common",
          "Axi T8": "Common",
          "Lith C4": "Common",
          "Meso P9": "Common",
          "Axi B4": "Common",
          "Lith A11": "Common",
          "Lith K7": "Common",
          "Lith V3": "Common",
          "Neo S2": "Common",
          "Lith S17": "Common",
          "Meso D2": "Common",
          "Meso L5": "Common",
          "Axi B5": "Common",
          "Meso C9": "Common",
          "Lith G14": "Common",
          "Meso T3": "Common",
          "Lith V1": "Common",
          "Axi B3": "Common",
          "Meso O2": "Common",
          "Lith T4": "Common",
          "Lith B2": "Common",
          "Meso T2": "Common",
          "Meso F1": "Common",
          "Axi T3": "Common",
          "Meso G8": "Common",
          "Neo S17": "Common",
          "Neo D3": "Common"
        }
      },
      "Upper Limb": {
        DucatValue: 25,
        Drops: {
          "Lith L5": "Common",
          "Meso S1": "Uncommon",
          "Axi S11": "Uncommon",
          "Lith G3": "Common",
          "Lith V2": "Uncommon",
          "Lith V1": "Common",
          "Neo C4": "Uncommon",
          "Meso B9": "Uncommon",
          "Meso H2": "Uncommon",
          "Lith N19": "Common",
          "Lith N14": "Uncommon",
          "Meso A11": "Common",
          "Meso I1": "Common",
          "Axi N3": "Common",
          "Axi Y1": "Uncommon",
          "Lith T12": "Common",
          "Meso T1": "Uncommon",
          "Lith F2": "Common",
          "Axi D5": "Common",
          "Neo S12": "Common",
          "Neo S2": "Uncommon",
          "Lith C9": "Common",
          "Neo P4": "Common",
          "Axi H4": "Common",
          "Lith N2": "Common",
          "Meso R1": "Common",
          "Meso P10": "Uncommon",
          "Meso T5": "Common",
          "Lith K3": "Common",
          "Neo D5": "Common",
          "Neo N17": "Common",
          "Neo N19": "Uncommon",
          "Meso L3": "Common",
          "Neo C9": "Common",
          "Neo O3": "Common",
          "Neo P7": "Common",
          "Meso B4": "Common",
          "Axi H6": "Common",
          "Lith C2": "Common",
          "Meso V10": "Uncommon",
          "Meso N4": "Common"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Axi K9": "Common",
          "Meso S1": "Common",
          "Neo S19": "Common",
          "Axi K7": "Common",
          "Axi S17": "Common",
          "Meso H5": "Common",
          "Neo N15": "Common",
          "Lith M4": "Common",
          "Neo V12": "Common",
          "Neo V11": "Common",
          "Axi V4": "Common",
          "Neo N22": "Common",
          "Meso V2": "Common",
          "Lith S4": "Common",
          "Axi O1": "Common",
          "Axi E2": "Common",
          "Lith F1": "Common",
          "Axi A14": "Common",
          "Lith H1": "Common",
          "Meso G5": "Common",
          "Meso H1": "Common",
          "Lith M3": "Common",
          "Axi K3": "Common",
          "Axi G1": "Common",
          "Axi K4": "Common",
          "Meso D6": "Common",
          "Axi A19": "Common",
          "Meso S11": "Common",
          "Neo Z1": "Common",
          "Meso E4": "Common",
          "Neo G10": "Common",
          "Axi L6": "Common",
          "Neo C6": "Common"
        }
      },
      Grip: {
        DucatValue: 45,
        Drops: {
          "Neo R2": "Uncommon",
          "Neo R3": "Uncommon",
          "Axi G15": "Uncommon",
          "Meso X1": "Uncommon",
          "Lith S1": "Uncommon",
          "Meso G6": "Uncommon",
          "Lith A10": "Uncommon",
          "Meso S15": "Uncommon",
          "Neo G1": "Uncommon",
          "Neo N23": "Uncommon",
          "Meso S7": "Uncommon",
          "Neo K4": "Uncommon",
          "Meso B6": "Uncommon",
          "Neo G4": "Uncommon",
          "Meso F5": "Uncommon",
          "Lith S16": "Uncommon",
          "Lith K6": "Uncommon",
          "Axi A10": "Uncommon",
          "Neo C3": "Uncommon",
          "Lith S7": "Uncommon",
          "Meso T4": "Uncommon",
          "Meso S2": "Uncommon"
        }
      }
    }
  },
  "Soma Prime": {
    IsVaulted: true,
    Parts: {
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Neo N12": "Common",
          "Neo S1": "Common",
          "Meso B3": "Common",
          "Lith M1": "Uncommon"
        }
      },
      Barrel: {
        DucatValue: 15,
        Drops: {
          "Lith M2": "Common",
          "Neo S3": "Common",
          "Meso D5": "Common"
        }
      },
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Lith S3": "Uncommon",
          "Neo N9": "Uncommon",
          "Neo N1": "Uncommon",
          "Lith K4": "Uncommon"
        }
      },
      Stock: {
        DucatValue: 100,
        Drops: {
          "Axi S7": "Rare",
          "Lith S2": "Rare",
          "Meso S1": "Rare",
          "Axi S4": "Rare"
        }
      }
    }
  },
  "Kronen Prime": {
    IsVaulted: true,
    Parts: {
      Handle: {
        DucatValue: 45,
        Drops: {
          "Meso A1": "Uncommon",
          "Axi G3": "Uncommon",
          "Axi L5": "Uncommon",
          "Meso B2": "Uncommon",
          "Lith T6": "Uncommon",
          "Meso D3": "Uncommon",
          "Neo S11": "Uncommon",
          "Neo B4": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Neo Z4": "Common",
          "Axi L3": "Common",
          "Neo Z8": "Common",
          "Axi H3": "Common",
          "Meso N7": "Common",
          "Neo L1": "Common",
          "Neo A2": "Common",
          "Neo C1": "Common"
        }
      },
      Blade: {
        DucatValue: 100,
        Drops: {
          "Axi K2": "Rare",
          "Axi K5": "Rare",
          "Axi K3": "Rare",
          "Neo K3": "Rare",
          "Meso K2": "Rare",
          "Lith K3": "Rare",
          "Axi K4": "Rare"
        }
      }
    }
  },
  "Kavasa Prime": {
    IsVaulted: true,
    Parts: {
      Band: {
        DucatValue: 45,
        Drops: {
          "Meso V3": "Uncommon",
          "Lith N2": "Uncommon",
          "Lith L3": "Uncommon",
          "Lith S6": "Uncommon",
          "Lith S2": "Uncommon",
          "Neo N12": "Uncommon",
          "Lith C1": "Uncommon"
        }
      },
      Buckle: {
        DucatValue: 65,
        Drops: {
          "Axi B1": "Uncommon",
          "Lith K1": "Rare",
          "Neo S6": "Uncommon",
          "Axi K1": "Rare",
          "Lith K8": "Rare",
          "Lith K4": "Rare"
        }
      },
      "Kubrow Collar Blueprint": {
        DucatValue: 45,
        Drops: {
          "Axi S7": "Uncommon",
          "Lith S4": "Uncommon",
          "Meso P6": "Uncommon",
          "Neo N1": "Uncommon",
          "Axi G1": "Uncommon"
        }
      }
    }
  },
  "Corinth Prime": {
    IsVaulted: true,
    Parts: {
      Stock: {
        DucatValue: 100,
        Drops: {
          "Meso C6": "Rare",
          "Lith C9": "Rare",
          "Axi C8": "Rare",
          "Lith C6": "Rare"
        }
      },
      Barrel: {
        DucatValue: 100,
        Drops: {
          "Axi C6": "Rare",
          "Axi C5": "Rare",
          "Meso C10": "Rare",
          "Meso C5": "Rare",
          "Axi C7": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Meso I1": "Common",
          "Axi T4": "Common",
          "Meso A6": "Common",
          "Neo N18": "Common",
          "Neo E2": "Common",
          "Lith T5": "Common",
          "Meso S10": "Common",
          "Lith A4": "Common"
        }
      },
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Neo T5": "Uncommon",
          "Lith G11": "Uncommon",
          "Meso P4": "Uncommon",
          "Axi T7": "Uncommon",
          "Axi P4": "Uncommon",
          "Lith D3": "Uncommon",
          "Neo R4": "Uncommon"
        }
      }
    }
  },
  "Frost Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 15,
        Drops: {
          "Meso E1": "Common",
          "Neo B8": "Common",
          "Lith G1": "Common"
        }
      },
      "Systems Blueprint": {
        DucatValue: 45,
        Drops: {
          "Lith M8": "Uncommon",
          "Lith G2": "Uncommon",
          "Neo S5": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Neo F1": "Rare",
          "Meso F4": "Rare",
          "Meso F3": "Rare",
          "Meso F2": "Rare"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 15,
        Drops: {
          "Neo E1": "Common",
          "Axi E1": "Common",
          "Axi D4": "Common"
        }
      }
    }
  },
  Lohk: {
    IsVaulted: false,
    Parts: {
      "": {
        DucatValue: 0,
        Drops: {
          "Requiem Eterna": "Common",
          "Requiem I": "Uncommon"
        }
      }
    }
  },
  "Volnus Prime": {
    IsVaulted: true,
    Parts: {
      Handle: {
        DucatValue: 100,
        Drops: {
          "Meso V7": "Rare",
          "Neo V10": "Rare",
          "Axi V11": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Lith S11": "Common",
          "Lith H7": "Common",
          "Lith H6": "Common",
          "Neo D5": "Common",
          "Neo P5": "Common",
          "Axi A14": "Common",
          "Lith G5": "Common",
          "Meso Z4": "Common"
        }
      },
      Head: {
        DucatValue: 45,
        Drops: {
          "Meso B5": "Uncommon",
          "Lith P6": "Uncommon",
          "Axi B5": "Uncommon",
          "Axi K9": "Uncommon",
          "Axi I1": "Uncommon",
          "Axi C8": "Uncommon",
          "Axi C7": "Uncommon",
          "Lith Z3": "Uncommon"
        }
      }
    }
  },
  "Equinox Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 15,
        Drops: {
          "Axi A8": "Common",
          "Meso G2": "Common",
          "Axi P1": "Common",
          "Lith D2": "Common",
          "Lith L2": "Common",
          "Lith M4": "Common",
          "Neo Z9": "Common",
          "Lith C6": "Common"
        }
      },
      "Systems Blueprint": {
        DucatValue: 100,
        Drops: {
          "Neo E3": "Rare",
          "Meso E4": "Rare",
          "Meso E3": "Rare",
          "Neo E2": "Rare",
          "Meso E2": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Meso A2": "Uncommon",
          "Axi T4": "Uncommon",
          "Lith S13": "Uncommon",
          "Lith P4": "Uncommon",
          "Axi T3": "Uncommon",
          "Axi K5": "Uncommon"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 45,
        Drops: {
          "Neo D2": "Uncommon",
          "Neo A3": "Uncommon",
          "Lith L1": "Uncommon",
          "Meso M3": "Uncommon",
          "Axi T9": "Uncommon"
        }
      }
    }
  },
  "Nekros Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 15,
        Drops: {
          "Lith V4": "Common",
          "Lith N1": "Common",
          "Axi G1": "Common",
          "Axi S6": "Common",
          "Neo Z1": "Common",
          "Meso S3": "Common",
          "Axi N4": "Common",
          "Neo G5": "Common",
          "Meso K1": "Common"
        }
      },
      Blueprint: {
        DucatValue: 65,
        Drops: {
          "Axi N3": "Rare",
          "Meso N3": "Rare",
          "Lith T3": "Uncommon",
          "Lith N3": "Rare",
          "Lith H10": "Uncommon"
        }
      },
      "Systems Blueprint": {
        DucatValue: 100,
        Drops: {
          "Lith N2": "Rare",
          "Meso N16": "Rare",
          "Neo N11": "Rare",
          "Neo N7": "Rare",
          "Neo N3": "Rare",
          "Meso N5": "Rare"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 45,
        Drops: {
          "Lith K11": "Uncommon",
          "Meso O4": "Uncommon",
          "Meso F1": "Uncommon",
          "Axi N5": "Uncommon"
        }
      }
    }
  },
  "Silva & Aegis Prime": {
    IsVaulted: true,
    Parts: {
      Blade: {
        DucatValue: 45,
        Drops: {
          "Meso G1": "Uncommon",
          "Meso O6": "Uncommon",
          "Meso M2": "Uncommon",
          "Neo L1": "Uncommon",
          "Axi S6": "Uncommon",
          "Axi C2": "Uncommon"
        }
      },
      Hilt: {
        DucatValue: 15,
        Drops: {
          "Neo V5": "Common",
          "Meso O4": "Common",
          "Neo K1": "Common",
          "Lith M3": "Common",
          "Neo I3": "Common",
          "Meso B2": "Common",
          "Lith C3": "Common"
        }
      },
      Blueprint: {
        DucatValue: 45,
        Drops: {
          "Neo G3": "Uncommon",
          "Meso P1": "Uncommon",
          "Meso V5": "Uncommon",
          "Lith T2": "Uncommon",
          "Lith Z2": "Uncommon",
          "Axi V7": "Uncommon",
          "Lith B9": "Uncommon"
        }
      },
      Guard: {
        DucatValue: 100,
        Drops: {
          "Lith S9": "Rare",
          "Neo S16": "Rare",
          "Neo S6": "Rare",
          "Neo S7": "Rare",
          "Neo S9": "Rare"
        }
      }
    }
  },
  "Atlas Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 45,
        Drops: {
          "Axi B3": "Uncommon",
          "Meso E3": "Uncommon",
          "Neo M3": "Uncommon",
          "Neo A7": "Uncommon",
          "Lith B8": "Uncommon",
          "Neo E2": "Uncommon",
          "Neo T3": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 15,
        Drops: {
          "Lith P5": "Common",
          "Lith V9": "Common",
          "Lith D1": "Common",
          "Lith K6": "Common",
          "Lith P3": "Common",
          "Lith M5": "Common",
          "Neo Z7": "Common"
        }
      },
      "Systems Blueprint": {
        DucatValue: 45,
        Drops: {
          "Meso G2": "Uncommon",
          "Lith N4": "Uncommon",
          "Neo N15": "Uncommon",
          "Axi F1": "Uncommon",
          "Meso I1": "Uncommon",
          "Meso C4": "Uncommon",
          "Neo A3": "Uncommon"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 100,
        Drops: {
          "Axi A11": "Rare",
          "Axi A6": "Rare",
          "Neo A5": "Rare",
          "Axi A9": "Rare",
          "Lith A5": "Rare"
        }
      }
    }
  },
  "Acceltra Prime": {
    IsVaulted: true,
    Parts: {
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Neo F3": "Uncommon",
          "Neo L4": "Uncommon",
          "Axi Z2": "Uncommon",
          "Meso K7": "Uncommon",
          "Neo M6": "Uncommon",
          "Neo O2": "Uncommon",
          "Axi O6": "Uncommon",
          "Meso L3": "Uncommon"
        }
      },
      Barrel: {
        DucatValue: 100,
        Drops: {
          "Meso A5": "Rare",
          "Neo A14": "Rare",
          "Neo A15": "Rare",
          "Neo A12": "Rare",
          "Lith A11": "Rare",
          "Neo A13": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 25,
        Drops: {
          "Axi M6": "Common",
          "Lith N17": "Uncommon",
          "Lith C11": "Common",
          "Meso N17": "Common",
          "Meso V10": "Common",
          "Neo Z11": "Common",
          "Meso G9": "Common",
          "Meso Z6": "Common",
          "Lith M10": "Common",
          "Meso W5": "Common"
        }
      },
      Stock: {
        DucatValue: 65,
        Drops: {
          "Meso A11": "Uncommon",
          "Axi A19": "Rare",
          "Axi A18": "Rare",
          "Meso A8": "Rare"
        }
      }
    }
  },
  "Mesa Prime": {
    IsVaulted: true,
    Parts: {
      "Chassis Blueprint": {
        DucatValue: 15,
        Drops: {
          "Axi M1": "Common",
          "Lith R1": "Common",
          "Neo R4": "Common",
          "Neo A3": "Common",
          "Neo C1": "Common",
          "Lith S10": "Common",
          "Vanguard E1": "Common",
          "Axi H4": "Common",
          "Meso C4": "Common",
          "Meso L2": "Common"
        }
      },
      "Systems Blueprint": {
        DucatValue: 100,
        Drops: {
          "Neo M2": "Rare",
          "Neo H3": "Uncommon",
          "Vanguard C1": "Uncommon",
          "Lith M6": "Rare",
          "Neo M3": "Rare",
          "Lith D5": "Uncommon"
        }
      },
      Blueprint: {
        DucatValue: 25,
        Drops: {
          "Meso R2": "Uncommon",
          "Lith D1": "Uncommon",
          "Lith P7": "Uncommon",
          "Neo Z3": "Uncommon",
          "Neo Z2": "Uncommon",
          "Lith N9": "Uncommon",
          "Meso P3": "Uncommon",
          "Lith C6": "Uncommon",
          "Vanguard P1": "Common"
        }
      },
      "Neuroptics Blueprint": {
        DucatValue: 100,
        Drops: {
          "Axi M3": "Rare",
          "Vanguard M1": "Rare",
          "Lith M3": "Rare",
          "Lith M4": "Rare",
          "Lith M5": "Rare",
          "Axi M4": "Rare"
        }
      }
    }
  },
  "Tigris Prime": {
    IsVaulted: true,
    Parts: {
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Lith T3": "Rare",
          "Neo T1": "Rare",
          "Axi T11": "Rare",
          "Lith T1": "Rare",
          "Axi T1": "Rare"
        }
      },
      Barrel: {
        DucatValue: 45,
        Drops: {
          "Lith V4": "Uncommon",
          "Meso N16": "Uncommon",
          "Lith K1": "Uncommon",
          "Neo H1": "Uncommon",
          "Lith V3": "Uncommon",
          "Axi S6": "Uncommon",
          "Neo B4": "Uncommon"
        }
      },
      Receiver: {
        DucatValue: 45,
        Drops: {
          "Meso K1": "Uncommon",
          "Neo S6": "Uncommon",
          "Lith S9": "Uncommon",
          "Meso T2": "Uncommon",
          "Meso S13": "Uncommon",
          "Meso S6": "Uncommon",
          "Meso N5": "Uncommon",
          "Axi V5": "Uncommon",
          "Neo V3": "Uncommon"
        }
      },
      Stock: {
        DucatValue: 15,
        Drops: {
          "Neo N11": "Common",
          "Neo B2": "Common",
          "Neo V4": "Common",
          "Lith K11": "Common",
          "Meso S1": "Common",
          "Lith B2": "Common"
        }
      }
    }
  },
  "Scourge Prime": {
    IsVaulted: true,
    Parts: {
      Blade: {
        DucatValue: 15,
        Drops: {
          "Meso V7": "Common",
          "Meso N16": "Common",
          "Lith R2": "Common",
          "Neo C4": "Common",
          "Meso A4": "Common",
          "Axi A16": "Common",
          "Neo M4": "Common",
          "Lith R3": "Common",
          "Neo N18": "Common"
        }
      },
      Barrel: {
        DucatValue: 100,
        Drops: {
          "Meso S11": "Rare",
          "Meso S13": "Rare",
          "Axi S14": "Rare",
          "Axi S10": "Rare",
          "Neo S15": "Rare",
          "Meso S12": "Rare"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Axi S9": "Rare",
          "Axi S12": "Rare",
          "Axi S11": "Rare",
          "Lith S14": "Rare",
          "Axi S15": "Rare"
        }
      },
      Handle: {
        DucatValue: 45,
        Drops: {
          "Neo K5": "Uncommon",
          "Neo T6": "Uncommon",
          "Axi T11": "Uncommon",
          "Meso C8": "Uncommon",
          "Lith C9": "Uncommon",
          "Axi K11": "Uncommon",
          "Meso G4": "Uncommon"
        }
      }
    }
  },
  "Zakti Prime": {
    IsVaulted: true,
    Parts: {
      Barrel: {
        DucatValue: 45,
        Drops: {
          "Lith T9": "Uncommon",
          "Lith N8": "Uncommon",
          "Lith G7": "Uncommon",
          "Lith D4": "Uncommon",
          "Lith N11": "Uncommon",
          "Meso P8": "Uncommon",
          "Neo E2": "Uncommon",
          "Neo D3": "Uncommon"
        }
      },
      Receiver: {
        DucatValue: 15,
        Drops: {
          "Axi T6": "Common",
          "Meso H3": "Common",
          "Meso P5": "Common",
          "Neo P4": "Common",
          "Meso N15": "Common",
          "Lith T4": "Common",
          "Axi A14": "Common",
          "Lith T8": "Common",
          "Meso N12": "Common"
        }
      },
      Blueprint: {
        DucatValue: 100,
        Drops: {
          "Meso Z5": "Rare",
          "Meso Z4": "Rare",
          "Axi Z1": "Rare",
          "Lith Z3": "Rare"
        }
      }
    }
  }
};

// src/lib/wikiVerifiedAcquisitions.js
var WIKI_VERIFIED_ACQUISITIONS = new Map([
  ["/Lotus/Types/Items/Ships/DefaultShip", {
    text: "The Liset is the first Landing Craft new players acquire automatically during the Awakening introduction Quest.",
    url: "https://wiki.warframe.com/w/Liset",
    source: "Warframe Wiki exact Liset acquisition section"
  }],
  ["/Lotus/Types/Items/Ships/MantisShip", {
    text: "Purchase the blueprint from the Market for 35,000 Credits (component blueprints also drop from Storage Containers), or buy the complete Mantis from the Market for 150 Platinum. Building requires the Landing Craft Foundry Segment.",
    url: "https://wiki.warframe.com/w/Mantis",
    source: "Warframe Wiki exact Mantis acquisition section"
  }],
  ["/Lotus/Types/Items/Ships/ScimitarShip", {
    text: "Purchase the blueprint from the Market for 35,000 Credits (component blueprints also drop from Zanuka Hunter, Stalker, and Vem Tabook), or buy the complete Scimitar from the Market for 150 Platinum. Building requires the Landing Craft Foundry Segment.",
    url: "https://wiki.warframe.com/w/Scimitar",
    source: "Warframe Wiki exact Scimitar acquisition section"
  }],
  ["/Lotus/Types/Items/Ships/XiphosShip", {
    text: "Purchase the blueprint from the Market for 35,000 Credits (component blueprints also drop from Resource Caches in Sabotage/Exterminate missions), or buy the complete Xiphos from the Market for 150 Platinum. Building requires the Landing Craft Foundry Segment.",
    url: "https://wiki.warframe.com/w/Xiphos",
    source: "Warframe Wiki exact Xiphos acquisition section"
  }],
  ["/Lotus/Types/Items/Ships/NoraShip", {
    text: "The main blueprint and all component blueprints can be purchased from Nightwave Cred Offerings for 35x Cred each (also previously offered as a Nightwave rank reward). Building requires the Landing Craft Foundry Segment.",
    url: "https://wiki.warframe.com/w/Nightwave_(Landing_Craft)",
    source: "Warframe Wiki exact Nightwave (Landing Craft) acquisition section"
  }],
  ["/Lotus/Types/Items/Ships/ZarimanShip", {
    text: "Purchase the blueprint from the Market for 70,000 Credits (component blueprints also drop from Reinforced Carrypods in Zariman Ten Zero missions), or buy the complete Parallax from the Market for 150 Platinum. Building requires the Landing Craft Foundry Segment.",
    url: "https://wiki.warframe.com/w/Parallax",
    source: "Warframe Wiki exact Parallax acquisition section"
  }],
  ["/Lotus/Weapons/Tenno/Akimbo/AkimboShotGun", {
    text: "Purchase the Akbronco blueprint from the Market; build it using two Bronco pistols and one Orokin Cell.",
    url: "https://wiki.warframe.com/w/Akbronco",
    source: "Warframe Wiki exact Akbronco acquisition section + DE ExportRecipes exact ingredient record"
  }],
  ["/Lotus/Upgrades/Mods/Warframe/Expert/AvatarAbilityEfficiencyModExpert", {
    text: "No current acquisition route: the Wiki record has no vendor or drop source, marks the mod untradeable/untransmutable, and identifies it as hidden from the Codex.",
    url: "https://wiki.warframe.com/w/Primed_Streamline",
    source: "Warframe Wiki exact Primed Streamline infobox: empty vendor/drop data, untradeable, untransmutable, and Codex-secret fields"
  }],
  ["/Lotus/Upgrades/Mods/Warframe/AvatarDamageResistanceStun", {
    text: "Unavailable: it was briefly obtainable through a transmutation bug after Update 10.6, but that bug was fixed and there is currently no legitimate acquisition route.",
    url: "https://wiki.warframe.com/w/Resilient_Focus",
    source: "Warframe Wiki exact Resilient Focus acquisition section states the transmutation bug was fixed and no current route exists"
  }],
  ["/Lotus/Upgrades/Skins/Sony/ExcaliburPSPlusSkin", {
    text: "Available through the PlayStation Store via the Obsidian Azura Collection; the exact export record is platform-exclusive and excluded from the current Market.",
    url: "https://wiki.warframe.com/w/Excalibur_Obsidian_Skin",
    source: "Warframe Wiki exact Excalibur Obsidian Skin acquisition section + DE export exact platform/exclusion fields"
  }],
  ["/Lotus/Types/Items/PhotoBooth/TauOldPeace/PhotoboothTileTauOldPeaceObjLiminalBossArena", {
    text: "Purchase from Roathe's Surplus for 150 Maphica; the exact export vendor manifest lists this Captura scene store item at that price.",
    url: "https://wiki.warframe.com/w/Captura",
    source: "Warframe Wiki exact Captura SceneBox + DE ExportVendors exact Roathe manifest storeItem and 150 Maphica price"
  }],
  ["/Lotus/Types/Items/DangerRoom/DangerRoomTileDevilTowerUrielArena", {
    text: "Purchase from Roathe's rotating vendor manifest for 150 Maphica; the exact DE export vendor record lists this store item and price.",
    url: "https://wiki.warframe.com/w/Roathe",
    source: "DE ExportVendors exact Roathe manifest storeItem and 150 Maphica price; no separate public Wiki page exists for this internal scene name"
  }],
  ["/Lotus/Upgrades/Skins/Hoverboard/HoverboardStickerNokkoC", {
    text: "Purchase Shooms from Nightcap's Wares for 25 Fergolyte at Rank 2 - Curious.",
    url: "https://wiki.warframe.com/w/Nightcap",
    source: "Warframe Wiki exact Nightcap Wares record + DE ExportVendors exact storeItem, 25 Fergolyte price, and rank"
  }],
  ["/Lotus/Types/Sentinels/SentinelPowersuits/TnSentinelCrossPowerSuit", {
    text: "Reward from the Venus Junction; the export challenge record awards the Taxon blueprint, and the current ExportSentinels record confirms Taxon is excluded from the Market.",
    url: "https://wiki.warframe.com/w/Taxon",
    source: "DE ExportChallenges exact Venus Junction Taxon blueprint reward + ExportSentinels exact exclusion/identity fields"
  }],
  ...[
    ["/Lotus/Weapons/Sentients/OperatorAmplifiers/SentTrainingAmplifier/SentAmpTrainingGrip", "Mote Brace"],
    ["/Lotus/Weapons/Sentients/OperatorAmplifiers/SentTrainingAmplifier/SentAmpTrainingBarrel", "Mote Prism"],
    ["/Lotus/Weapons/Sentients/OperatorAmplifiers/SentTrainingAmplifier/SentAmpTrainingChassis", "Mote Scaffold"]
  ].map(([path, name]) => [path, {
    text: `This is the ${name} component displayed as part of the Mote Amp; the Mote Amp is automatically given by the Quills on first access to their Cetus chamber, or its blueprint can be bought from them for 500 standing.`,
    url: "https://wiki.warframe.com/w/Mote_Amp",
    source: `Warframe Wiki exact Mote Amp acquisition/component record + DE export exact ${name} identity`
  }]),
  ["/Lotus/Upgrades/Skins/Scarves/ZephyrQTCCSyandana", {
    text: "Obtained during a Conquera event; the exact Conquera Syandana event record is the source for this promotional syandana.",
    url: "https://wiki.warframe.com/w/Conquera_Syandana",
    source: "Warframe Wiki exact Conquera Syandana event record + DE export exact cosmetic identity"
  }],
  ["/Lotus/Upgrades/Skins/Sentinels/Wings/JetWingsRight", {
    text: "Included in the Coltek Sentinel Pack (Sentinel Accessory Pack 2), purchasable from the Market for 44 Platinum; Jet Sentinel Wings is listed as a 15 Platinum pack component.",
    url: "https://wiki.warframe.com/w/Sentinel_Accessory_Pack_2",
    source: "Warframe Wiki exact Sentinel Accessory Pack 2 bundle table + DE ExportBundles exact Jet Wings component identity"
  }],
  ["/Lotus/Powersuits/SiriusOrion/OrionSuit", {
    text: "The player chooses Orion or Sirius while completing the Jade Shadows: Constellations quest; the resulting choice is not separately farmable.",
    url: "https://wiki.warframe.com/w/Jade_Shadows",
    source: "Warframe Wiki exact Jade Shadows quest record names the Orion/Sirius choice + DE export exact identity"
  }],
  ["/Lotus/Powersuits/Frumentarius/Frumentarius", {
    text: "Quest reward from The Hex, or purchase the blueprint and component blueprints from Amir of The Hex for 50,000 standing at Rank 4.",
    url: "https://wiki.warframe.com/w/Cyte-09",
    source: "WFCD/wiki vendor record exact Cyte-09 blueprint components=Amir + DE export exact Warframe identity"
  }],
  ["/Lotus/Powersuits/Choir/Choir", {
    text: "Quest reward from Jade Shadows; the blueprint and component blueprints are also available from the Release Vestigial Motes vendor.",
    url: "https://wiki.warframe.com/w/Jade",
    source: "Structured Wiki vendor record exact Jade blueprint components=Release Vestigial Motes + DE export exact Warframe identity"
  }],
  ["/Lotus/Powersuits/ConcreteFrame/ConcreteFrame", {
    text: "Quest reward from Whispers in the Walls; blueprint and component blueprints are also available from Bird 3 of Cavia.",
    url: "https://wiki.warframe.com/w/Qorvex",
    source: "Structured Wiki vendor record exact Qorvex blueprint components=Bird 3 + DE export exact Warframe identity"
  }],
  ["/Lotus/Powersuits/EntratiMech/NechroTech", {
    text: "Heart of Deimos grants the Necramech component blueprints; damaged components come from Isolation Vault Necramechs or Father, and the Voidrig blueprint/components are also available from Necraloid.",
    url: "https://wiki.warframe.com/w/Necramech",
    source: "Warframe Wiki exact Necramech acquisition section + structured vendor record exact Voidrig components=Necraloid + DE export exact identity"
  }],
  ["/Lotus/Powersuits/PaxDuviricus/PaxDuviricus", {
    text: "Purchase Kullervo's blueprint and components from Acrithis in Kullervo's Archive using Kullervo's Bane; the blueprint requires 15 Banes and each component 9 Banes.",
    url: "https://wiki.warframe.com/w/Kullervo",
    source: "Structured Wiki vendor record exact Kullervo blueprint/components=Kullervo's Archive + DE export exact Warframe identity"
  }],
  ["/Lotus/Weapons/Lasria/LasGooPistol/LasGooPistolPlayerWeapon", {
    text: "Purchase the Efv-8 Mars blueprint and components from Minerva of The Hex for 15,000 standing at Rank 5.",
    url: "https://wiki.warframe.com/w/Efv-8_Mars",
    source: "Structured Wiki vendor record exact EFV-8 Mars blueprint/components=Minerva + DE export exact weapon identity"
  }],
  ["/Lotus/Powersuits/DemonFrame/DemonFrame", {
    text: "Quest reward from The Old Peace, or purchase Uriel's blueprint and components from Roathe in La Cath\xE9drale for 75 Maphica.",
    url: "https://wiki.warframe.com/w/Uriel",
    source: "Structured Wiki vendor record exact Uriel blueprint/components=Roathe + DE export exact Warframe identity"
  }],
  ["/Lotus/Upgrades/Mods/Aura/PlayerEnergyHealthRegenAuraMod", {
    text: "Awarded for completing the Earth to Venus Junction; also available from the rotating Nightwave Cred Offerings store for 20 Cred.",
    url: "https://wiki.warframe.com/w/Dreamer%27s_Bond",
    source: "Warframe Wiki exact Dreamer's Bond acquisition section + DE export exact mod identity"
  }],
  ["/Lotus/Upgrades/Mods/Pistol/DualStat/MagneticCritDamagePistolMod", {
    text: "Reward for completing The Hex quest.",
    url: "https://wiki.warframe.com/w/Magnetic_Might",
    source: "Warframe Wiki exact Magnetic Might drop-locations section + DE export exact mod identity"
  }],
  ["/Lotus/Upgrades/EmpoweredHeavyMelee/TennokaiBaseMod", {
    text: "Reward for completing the Whispers in the Walls quest.",
    url: "https://wiki.warframe.com/w/Mentor%27s_Legacy",
    source: "Warframe Wiki exact Mentor's Legacy drop-locations section + DE export exact mod identity"
  }],
  ["/Lotus/Upgrades/Mods/Immortal/ImmortalWildcardMod", {
    text: "Drops from downed Kuva Liches or Sisters of Parvos; it can also be obtained by transmuting four used Requiem Mods.",
    url: "https://wiki.warframe.com/w/Requiem_Mods",
    source: "Warframe Wiki exact Requiem Mods drop/transmutation record + DE export exact Oull identity"
  }],
  ["/Lotus/Upgrades/Mods/Bows/Event/Nightwave/NightwaveStalkerBowAugmentMod", {
    text: "Originally awarded at Nightwave Nora's Mix Volume 7 Rank 25; it is now trade-only.",
    url: "https://wiki.warframe.com/w/Unseen_Dread",
    source: "Warframe Wiki exact Unseen Dread acquisition section + DE export exact mod identity"
  }],
  ["/Lotus/Upgrades/Mods/Rifle/Event/Nightwave/NightwaveEmbolistAugmentMod", {
    text: "Originally awarded at Nightwave Nora's Mix Volume 2 Rank 23; also purchasable from Daughter during Nights of Naberus for 50 Mother Tokens.",
    url: "https://wiki.warframe.com/w/Vile_Discharge",
    source: "Warframe Wiki exact Vile Discharge acquisition section + DE export exact mod identity"
  }],
  ["/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBEFerrox/CrpBEFerrox", {
    text: "Purchase from Ergo Glast in a Relay for Corrupted Holokeys earned from Void Storm missions.",
    url: "https://wiki.warframe.com/w/Tenet_Ferrox",
    source: "Warframe Wiki exact Tenet Ferrox acquisition section + DE export exact weapon identity"
  }],
  ["/Lotus/Weapons/Tenno/Bows/DaxDuviriAsymetricalBow/DaxDuviriAsymmetricalLongBowPlayerWeapon", {
    text: "Main and component blueprints are acquired by solving Duviri Enigma puzzles, with a 30% chance for one part per puzzle completion; all blueprints are tradable.",
    url: "https://wiki.warframe.com/w/Cinta",
    source: "Warframe Wiki exact Cinta acquisition template + DE export exact weapon identity"
  }],
  ["/Lotus/Powersuits/Excalibur/ExcaliburPrime", {
    text: "Founders program exclusive: obtained only by upgrading a Warframe account to Hunter status or greater; the program closed on November 1, 2013 and is no longer available.",
    url: "https://wiki.warframe.com/w/Excalibur/Prime",
    source: "Warframe Wiki exact Excalibur Prime acquisition section + DE export exact Warframe identity"
  }],
  ["/Lotus/Powersuits/Excalibur/ExcaliburUmbra", {
    text: "Blueprint given during the first mission of The Sacrifice quest; building is enabled after the second mission and the completed Warframe is granted during the penultimate mission.",
    url: "https://wiki.warframe.com/w/Excalibur/Umbra",
    source: "Warframe Wiki exact Excalibur Umbra acquisition section + DE export exact Warframe identity"
  }],
  ["/Lotus/Weapons/Thanotech/EntSphereHammer/EntSphereHammer", {
    text: "Purchase the Ekhein blueprint from Bird 3 of Cavia for 15,000 standing at Rank 3 - Colleague.",
    url: "https://wiki.warframe.com/w/Ekhein",
    source: "Warframe Wiki exact Ekhein acquisition section + DE export exact weapon identity"
  }],
  ["/Lotus/Weapons/Lasria/LasGrenadeLauncher/LasrianNoxPlayerWeapon", {
    text: "Purchase Purgator 1 blueprints from Minerva of The Hex at Rank 5 - Pizza Party: 15,000 standing for the main blueprint and 5,000 per component, or buy the Scaldra Dominance Pack.",
    url: "https://wiki.warframe.com/w/Purgator_1",
    source: "Warframe Wiki exact Purgator 1 acquisition section + DE export exact weapon identity"
  }],
  ["/Lotus/Weapons/Tenno/LongGuns/TnModQuestRifle/TnModQuestRifleWeapon", {
    text: "Reward during The Teacher quest with a free weapon slot and pre-installed Orokin Catalyst; additional copies are available from Cephalon Simaris for 100,000 standing.",
    url: "https://wiki.warframe.com/w/Thornbak",
    source: "Warframe Wiki exact Thornbak acquisition section + DE export exact weapon identity"
  }],
  ["/Lotus/Powersuits/Archwing/DemolitionJetPack/ExhaustTrailAugmentCard", {
    text: "Elytron Archwing augment; obtained by defeating Eximus units in Archwing missions.",
    url: "https://wiki.warframe.com/w/Afterburner",
    source: "Warframe Wiki exact Afterburner drop-locations section + DE export exact mod identity"
  }],
  ["/Lotus/Powersuits/Archwing/StealthJetPack/GravInstabilityAugmentCard", {
    text: "Itzal Archwing augment; obtained by defeating Eximus units in Archwing missions.",
    url: "https://wiki.warframe.com/w/Cold_Snap",
    source: "Warframe Wiki exact Cold Snap drop-locations section + DE export exact mod identity"
  }],
  ["/Lotus/Powersuits/Archwing/StandardJetPack/FireShieldAugmentCard", {
    text: "Odonata Archwing augment; obtained by defeating Eximus units in Archwing missions.",
    url: "https://wiki.warframe.com/w/Energy_Field",
    source: "Warframe Wiki exact Energy Field drop-locations section + DE export exact mod identity"
  }],
  ["/Lotus/Types/Sentinels/SentinelPrecepts/ThrowGlaivePrecept", {
    text: "Automatically acquired upon obtaining Helios or Helios Prime.",
    url: "https://wiki.warframe.com/w/Targeting_Receptor",
    source: "Warframe Wiki exact Targeting Receptor acquisition section + DE ExportUpgrades exact compatName=Helios"
  }],
  ["/Lotus/Types/Sentinels/SentinelPrecepts/UniversalVacuum", {
    text: "One copy is granted whenever a Sentinel is claimed from the Foundry; it is not a mission drop.",
    url: "https://wiki.warframe.com/w/Vacuum",
    source: "Warframe Wiki exact Vacuum acquisition section + DE export exact mod identity"
  }],
  ["/Lotus/Upgrades/Mods/Warframe/Expert/AvatarKnockdownResistanceModExpert", {
    text: "Daily Tribute login reward, awarded at the day 400, 600, or 900 milestone until selected.",
    url: "https://wiki.warframe.com/w/Primed_Sure_Footed",
    source: "Warframe Wiki exact Primed Sure Footed acquisition section + DE export exact mod identity"
  }],
  ["/Lotus/Weapons/Corpus/LongGuns/CrpBFG/Vandal/VandalCrpBFG", {
    text: "Earn 100 cumulative points in the recurring Thermia Fractures event, or purchase from Baro Ki'Teer for 550,000 Credits and 650 Ducats.",
    url: "https://wiki.warframe.com/w/Opticor_Vandal",
    source: "Warframe Wiki exact Opticor Vandal acquisition section + DE export exact weapon identity"
  }],
  ["/Lotus/Upgrades/Mods/Sentinel/SentinelRepairKitMod", {
    text: "Drops from Domestik Drone enemies.",
    url: "https://wiki.warframe.com/w/Repair_Kit",
    source: "Warframe Wiki exact Repair Kit drop/farming record + DE export exact mod identity"
  }],
  ["/Lotus/Weapons/Grineer/KuvaLich/Secondaries/Stubba/KuvaStubba", {
    text: "Generate a Kuva Twin Stubbas on a Kuva Lich, then vanquish that Kuva Lich; the weapon is placed in the Foundry ready to claim.",
    url: "https://wiki.warframe.com/w/Adversary_Weapons",
    source: "Warframe Wiki Adversary Weapons exact Kuva route + DE export exact Kuva Twin Stubbas identity"
  }],
  ...[
    ["/Lotus/Weapons/Tenno/Melee/Hammer/DaxDuviriHammer/DaxDuviriHammerPlayerWeapon", "Sampotes"],
    ["/Lotus/Weapons/Tenno/Melee/Hammer/DaxDuviriHammer/DaxDuviriHammerWeapon", "Sampotes"]
  ].map(([path, name]) => [path, {
    text: "Purchase the Sampotes blueprint from Teshin's Cave for 60 Pathos Clamps or 275 Platinum; the Clamp purchase unlocks the Drifter and Warframe versions, and additional Warframe copies are available from Cephalon Simaris for 100,000 standing.",
    url: "https://wiki.warframe.com/w/Sampotes",
    source: "Warframe Wiki exact Sampotes acquisition section + DE export exact weapon identity"
  }]),
  ...[
    ["/Lotus/Weapons/Tenno/Melee/Swords/DaxDuviriKatana/DaxDuviriKatanaPlayerWeapon", "Syam"],
    ["/Lotus/Weapons/Tenno/Melee/Swords/DaxDuviriKatana/DaxDuviriKatanaWeapon", "Syam"]
  ].map(([path, name]) => [path, {
    text: "Purchase the Syam blueprint from Teshin's Cave for 50 Pathos Clamps or 250 Platinum; the Clamp purchase unlocks the Drifter and Warframe versions, and additional Warframe copies are available from Cephalon Simaris for 100,000 standing.",
    url: "https://wiki.warframe.com/w/Syam",
    source: "Warframe Wiki exact Syam acquisition section + DE export exact weapon identity"
  }]),
  ...[
    ["/Lotus/Types/Friendly/PlayerControllable/Weapons/DuviriDualSwords", "Sun & Moon"],
    ["/Lotus/Types/Friendly/PlayerControllable/Weapons/DuviriDualSwordsWeapon", "Sun & Moon"]
  ].map(([path, name]) => [path, {
    text: "Blueprint rewarded on completion of The Duviri Paradox quest; additional copies are available from Cephalon Simaris for 100,000 standing.",
    url: "https://wiki.warframe.com/w/Sun_%26_Moon",
    source: "Warframe Wiki exact Sun & Moon acquisition section + DE export exact weapon identity"
  }]),
  ["/Lotus/Weapons/Tenno/Melee/MeleeTrees/DualKatanaCmbOneMeleeTree", {
    text: "Reward for completing The Duviri Paradox quest; this is the Mountain's Edge stance's exact Wiki acquisition route.",
    url: "https://wiki.warframe.com/w/Mountain%27s_Edge",
    source: "Warframe Wiki exact Mountain's Edge acquisition section + DE export exact mod identity"
  }],
  ["/Lotus/Weapons/Tenno/LongGuns/PaxDuviricusShotgun/PaxDuviricusShotgun", {
    text: "Defeat Kullervo in Kullervo's Hold, then purchase the Rauta blueprint and components from Acrithis with Kullervo's Bane; the main blueprint costs 12 Banes and each component costs 6.",
    url: "https://wiki.warframe.com/w/Rauta",
    source: "Warframe Wiki exact Rauta acquisition section + DE export exact weapon identity"
  }],
  ["/Lotus/Weapons/Tenno/Zariman/Melee/HeavyScythe/ZarimanHeavyScythe/ZarimanHeavyScytheWeapon", {
    text: "Purchase the Thalys blueprint from Acrithis or Dominus Thrax in the Dormizone for 96 Scuttler Husk from Isleweaver; access requires completion of The Hex quest.",
    url: "https://wiki.warframe.com/w/Thalys",
    source: "Warframe Wiki exact Thalys acquisition section + DE export exact weapon identity"
  }],
  ["/Lotus/Upgrades/EmpoweredHeavyMelee/CursedSyndicateEmpoweredHeavyMeleeMod", {
    text: "Purchase from Aspirant Zorba at any Relay for 360 Atramentum.",
    url: "https://wiki.warframe.com/w/Truth%27s_Flame",
    source: "Warframe Wiki exact Truth's Flame acquisition section + DE export exact mod identity"
  }],
  ...[
    ["/Lotus/Weapons/Tenno/Melee/Staff/SingleStaff", "Cadus", "Market blueprint for 50,000 Credits"],
    ["/Lotus/Weapons/Tenno/Melee/Swords/HeatSword/HeatLongSword", "Heat Sword", "Once Awake quest reward; blueprint also via Nightwave Offerings"],
    ["/Lotus/Weapons/Tenno/Pistol/Pistol", "Lato", "Awakening quest weapon choice; Market purchase for 10,000 Credits"],
    ["/Lotus/Weapons/Orokin/BallasSword/BallasSwordWeapon", "Paracesis", "Chimera Prologue quest blueprint reward"],
    ["/Lotus/Weapons/Tenno/Melee/Swords/UmbraKatana/UmbraKatana", "Skiajati", "The Sacrifice penultimate mission reward"]
  ].map(([path, name, route]) => [path, {
    text: `${route}; this is the ${name} weapon's exact Wiki acquisition route.`,
    url: `https://wiki.warframe.com/w/${name.replaceAll(" ", "_")}`,
    source: `Warframe Wiki exact ${name} acquisition section + DE export exact weapon identity`
  }]),
  ...[
    ["/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModAgility", "Agility Drift", "Agility"],
    ["/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModCollaboration", "Coaction Drift", "Collaboration"],
    ["/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModCunning", "Cunning Drift", "Cunning"],
    ["/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModEndurance", "Endurance Drift", "Endurance"],
    ["/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModPower", "Power Drift", "Power"],
    ["/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModSpeed", "Speed Drift", "Speed"],
    ["/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModStealth", "Stealth Drift", "Stealth"]
  ].map(([path, name, test]) => [path, {
    text: `Reward for completing the ${test} Test in the Orokin Moon (Halls of Ascension); this is the ${name} mod's exact Wiki acquisition route.`,
    url: `https://wiki.warframe.com/w/${name.replaceAll(" ", "_")}`,
    source: `Warframe Wiki exact ${name} acquisition section + DE export exact mod identity`
  }]),
  ...[
    ["/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedPredatorSpitAcidPrecept", "Acidic Spittle", "Vizier Predasite"],
    ["/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedPredatorHealingSporesPrecept", "Iatric Mycelium", "Vizier Predasite"],
    ["/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/KubrowDisarmPrecept", "Neutralize", "Chesa Kubrow"],
    ["/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/KubrowLootPrecept", "Retrieve", "Chesa Kubrow"],
    ["/Lotus/Types/Friendly/Pets/CatbrowPetPrecepts/CatbrowVampireBitePrecept", "Draining Bite", "Vasca Kavat"],
    ["/Lotus/Types/Friendly/Pets/CatbrowPetPrecepts/CatbrowTransfusionPrecept", "Transfusion", "Vasca Kavat"],
    ["/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/VulpineInfestedCatbrowRespawn", "Sly Devolution", "Sly Vulpaphyla"],
    ["/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedCatbrowEvasionBuffPrecept", "Survival Instinct", "Sly Vulpaphyla and undergoing revivification"]
  ].map(([path, name, companion]) => [path, {
    text: `Automatically acquired upon obtaining a ${companion}; this is the ${name} precept's exact Wiki acquisition route.`,
    url: `https://wiki.warframe.com/w/${name.replaceAll(" ", "_")}${name === "Neutralize" ? "_(Mod)" : ""}`,
    source: `Warframe Wiki exact ${name} acquisition section + DE export exact precept identity`
  }]),
  ...[
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetPhotonStrikePrecept", "Aerial Prospectus", "Wanz Stabilizer"],
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetClonePrecept", "Diversified Denial", "Urga Bracket"],
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetAntiMeleePrecept", "Equilibrium Audit", "Hec Model"],
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetEvasionPrecept", "Evasive Denial", "Zubb Bracket"],
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetMegaLaserPrecept", "Focused Prospectus", "Frak Stabilizer"],
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetStealEximusPrecept", "Null Audit", "Bhaira Model"],
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetMagneticRepulsePrecept", "Reflex Denial", "Cela Bracket"],
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetDisarmPulsePrecept", "Repo Audit", "Dorma Model"],
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/ZanukaPetTeslaShotPrecept", "Synergized Prospectus", "Hinta Stabilizer"]
  ].map(([path, name, component]) => [path, {
    text: `Automatically acquired upon obtaining a Hound built with the ${component}; this is the ${name} precept's exact Wiki acquisition route.`,
    url: `https://wiki.warframe.com/w/${name.replaceAll(" ", "_")}`,
    source: `Warframe Wiki exact ${name} acquisition section states the ${component} route + DE export exact precept identity`
  }]),
  ...[
    ["/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaLiftBombPrecept", "Anti-Grav Grenade", "Para"],
    ["/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaChargePrecept", "Blast Shield", "Nychus"],
    ["/Lotus/Upgrades/Mods/Sentinel/Moa/MoaMeleeMod", "Hard Engage", "Nychus"],
    ["/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaHackerPrecept", "Security Override", "Oloro"],
    ["/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaTractorBeamPrecept", "Tractor Beam", "Oloro"],
    ["/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaShockwavePrecept", "Shockwave Actuators", "Lambeo"],
    ["/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaStasisFieldPrecept", "Stasis Field", "Lambeo"],
    ["/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecept/MoaTetherVaccumMinePrecept", "Whiplash Mine", "Para"]
  ].map(([path, name, model]) => [path, {
    text: `Automatically acquired upon obtaining a MOA built with the ${model} Model; this is the ${name} precept's exact Wiki acquisition route.`,
    url: `https://wiki.warframe.com/w/${name.replaceAll(" ", "_")}`,
    source: `Warframe Wiki exact ${name} acquisition section states the ${model} Model route + DE ExportUpgrades exact precept identity`
  }]),
  ...[
    ["/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedPredatorInfectiousBitePrecept", "Infectious Bite"],
    ["/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedPredatorFinisherSporesPrecept", "Paralytic Spores"]
  ].map(([path, name]) => [path, {
    text: `Automatically acquired upon obtaining a Medjay Predasite; ${name} is one of the companion's two exclusive precepts.`,
    url: "https://wiki.warframe.com/w/Medjay_Predasite",
    source: `Warframe Wiki exact Medjay Predasite exclusive-precept/acquisition record + DE ExportUpgrades exact ${name} compatName=Medjay Predasite`
  }]),
  ...[
    ["/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedPredatorBuffSporesPrecept", "Anabolic Pollination"],
    ["/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedPredatorSpitParasitePrecept", "Endoparasitic Vector"]
  ].map(([path, name]) => [path, {
    text: `Automatically acquired upon obtaining a Pharaoh Predasite; ${name} is one of the companion's two exclusive precepts.`,
    url: "https://wiki.warframe.com/w/Pharaoh_Predasite",
    source: `Warframe Wiki exact Pharaoh Predasite exclusive-precept record + DE ExportUpgrades exact ${name} compatName=Pharaoh Predasite`
  }]),
  ...[
    ["/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedCatbrowGoreTossPrecept", "Crescent Charge"],
    ["/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/HornedInfestedCatbrowRespawn", "Crescent Devolution"]
  ].map(([path, name]) => [path, {
    text: `Automatically acquired upon obtaining a Crescent Vulpaphyla; ${name} is one of the companion's two exclusive precepts.`,
    url: "https://wiki.warframe.com/w/Crescent_Vulpaphyla",
    source: `Warframe Wiki exact Crescent Vulpaphyla exclusive-precept record + DE ExportUpgrades exact ${name} compatName=Crescent Vulpaphyla`
  }]),
  ...[
    ["/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/KubrowGrabPrecept", "Proboscis"],
    ["/Lotus/Types/Friendly/Pets/KubrowPetPrecepts/ChargerChargePrecept", "Trample"]
  ].map(([path, name]) => [path, {
    text: `Automatically acquired upon obtaining a Helminth Charger; ${name} is an exclusive Helminth Charger precept.`,
    url: `https://wiki.warframe.com/w/${name}`,
    source: `Warframe Wiki exact ${name} acquisition section + DE ExportUpgrades exact ${name} compatName=Helminth Charger`
  }]),
  ...[
    ["/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/ArmoredInfestedCatbrowRespawn", "Panzer Devolution"],
    ["/Lotus/Types/Friendly/Pets/CreaturePets/CreaturePrecepts/InfestedKavatViralQuillsPrecept", "Viral Quills"]
  ].map(([path, name]) => [path, {
    text: `Automatically acquired upon obtaining a Panzer Vulpaphyla; ${name} is one of the companion's exclusive precepts.`,
    url: "https://wiki.warframe.com/w/Panzer_Vulpaphyla",
    source: `Warframe Wiki exact Panzer Vulpaphyla exclusive-precept record + DE ExportUpgrades exact ${name} compatName=Panzer Vulpaphyla`
  }]),
  ...[
    ["/Lotus/Weapons/Tenno/Melee/Swords/DaxDuviriTwoHandedKatana/DaxDuviriTwoHandedKatanaPlayerWeapon", "Azothane", 50, 250],
    ["/Lotus/Weapons/Tenno/Melee/Swords/DaxDuviriTwoHandedKatana/DaxDuviriTwoHandedKatanaWeapon", "Azothane", 50, 250],
    ["/Lotus/Weapons/Tenno/Melee/Polearms/DaxDuviriPolearm/DaxDuviriPolearmSpearPlayerWeapon", "Edun", 50, 250],
    ["/Lotus/Weapons/Tenno/Melee/Polearms/DaxDuviriPolearm/DaxDuviriPolearmWeapon", "Edun", 50, 250],
    ["/Lotus/Weapons/Tenno/Melee/SwordsAndBoards/DaxDuviriMaceShieldPlayerWeapon", "Argo & Vel", 60, 225],
    ["/Lotus/Weapons/Tenno/Melee/SwordsAndBoards/DaxDuviriMaceShieldWeapon", "Argo & Vel", 60, 225]
  ].map(([path, name, clamps, platinum]) => [path, {
    text: `Purchase ${name} from Teshin's Cave in Duviri for ${clamps} Pathos Clamps or ${platinum} Platinum; the Pathos Clamp purchase unlocks the Drifter weapon and delivers the Warframe blueprint. Additional Warframe blueprint copies are available from Cephalon Simaris for 100,000 standing.`,
    url: "https://wiki.warframe.com/w/Pathos_Clamp",
    source: `Warframe Wiki Pathos Clamp/Teshin's Cave acquisition table exact ${name} costs + DE ExportWeapons exact identity`
  }]),
  ...[
    ["/Lotus/Weapons/Grineer/HeavyWeapons/GrnHeavyGrenadeLauncher", "Kuva Ayanga"],
    ["/Lotus/Weapons/Grineer/KuvaLich/HeavyWeapons/Grattler/KuvaGrattler", "Kuva Grattler"]
  ].map(([path, name]) => [path, {
    text: `Vanquish a Kuva Lich that generated with ${name} equipped; the weapon is placed in the Foundry ready to claim and has no blueprint.`,
    url: "https://wiki.warframe.com/w/Adversary_Weapons",
    source: `Warframe Wiki Adversary Weapons exact Kuva route + DE ExportWeapons exact ${name} identity`
  }]),
  ...[
    "/Lotus/Weapons/Tenno/Grimoire/TnDoppelgangerGrimoire",
    "/Lotus/Weapons/Tenno/Grimoire/TnGrimoire"
  ].map((path) => [path, {
    text: "Receive a fully ranked Grimoire with a weapon slot and pre-installed Orokin Catalyst as a reward from the Whispers in the Walls quest; a Grimoire blueprint is also sold by Bird 3 of Cavia for 50,000 standing at the required rank.",
    url: "https://wiki.warframe.com/w/Whispers_in_the_Walls",
    source: "Warframe Wiki Whispers in the Walls exact quest rewards + structured Bird 3 vendor record + DE ExportWeapons exact identity"
  }]),
  ...[
    ["/Lotus/Upgrades/Skins/Sigils/DogDays2023BSigil", "Chillwave Sigil", 175],
    ["/Lotus/Upgrades/Skins/Sigils/DogDaysKubrowSigil", "Dropkick Drahk Sigil", 175],
    ["/Lotus/Upgrades/Skins/Sigils/DogDays2023CSigil", "Scorcher Sigil", 175],
    ["/Lotus/Upgrades/Skins/Sigils/DogDays2025Sigil", "Splashdown Sigil", 175],
    ["/Lotus/Upgrades/Skins/Promo/Seasonal/DogDays2025BadgeItem", "Aqua Heart Emblem", 75],
    ["/Lotus/Upgrades/Skins/Clan/DogDaysKubrowBadgeItem", "Dropkick Drahk Emblem", 75],
    ["/Lotus/Upgrades/Skins/Hammer/NoodleHammerSkin", "Noodletron Hammer Skin", 280]
  ].map(([path, name, pearls]) => [path, {
    text: `Purchase from Nakak in Cetus during the Dog Days event for ${pearls} Nakak Pearls.`,
    url: "https://wiki.warframe.com/w/Dog_Days",
    source: `Warframe Wiki Dog Days offerings exact ${name} price + DE ExportCustoms exact identity`
  }]),
  ...[
    ["/Lotus/Upgrades/Mods/DualSource/Pistol/MultishotDodgeMod", "Amalgam Barrel Diffusion", 50],
    ["/Lotus/Upgrades/Mods/DualSource/Melee/CritDamageChargeSpeedMod", "Amalgam Organ Shatter", 50],
    ["/Lotus/Upgrades/Mods/DualSource/Rifle/SerratedRushMod", "Amalgam Serration", 25],
    ["/Lotus/Upgrades/Mods/DualSource/Shotgun/ShotgunMedicMod", "Amalgam Shotgun Barrage", 25]
  ].map(([path, name, points]) => [path, {
    text: `Earn ${points} cumulative points in the Thermia Fractures event to receive ${name}; the reward is one-time and non-transmutable.`,
    url: "https://wiki.warframe.com/w/Thermia_Fractures",
    source: `Warframe Wiki Thermia Fractures reward table exact ${name} milestone + DE ExportUpgrades exact identity`
  }]),
  ...[
    ["/Lotus/Upgrades/Mods/Melee/Expert/WeaponFireRateModExpert", "Primed Fury"],
    ["/Lotus/Upgrades/Mods/Rifle/DualStat/PrimedShredMod", "Primed Shred"],
    ["/Lotus/Upgrades/Mods/Warframe/Expert/VigorModExpert", "Primed Vigor"]
  ].map(([path, name]) => [path, {
    text: `${name} is a Daily Tribute login reward, awarded at the Daily Tribute milestone rotation; it is not a Baro Ki'Teer offering.`,
    url: "https://wiki.warframe.com/w/Category:Daily_Tribute_Rewards",
    source: `Warframe Wiki Daily Tribute Rewards category exact ${name} entry + DE ExportUpgrades exact identity`
  }]),
  ...[
    ["/Lotus/Weapons/Grineer/KuvaLich/Secondaries/Brakk/KuvaBrakk", "Kuva Brakk"],
    ["/Lotus/Weapons/Grineer/Bows/GrnBow/GrnBowWeapon", "Kuva Bramma"],
    ["/Lotus/Weapons/Grineer/LongGuns/GrnKuvaLichRifle/GrnKuvaLichRifleWeapon", "Kuva Chakkhurr"],
    ["/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Drakgoon/KuvaDrakgoon", "Kuva Drakgoon"],
    ["/Lotus/Weapons/Grineer/KuvaLich/Melee/Ghoulsaw/KuvaGhoulSaw", "Kuva Ghoulsaw"],
    ["/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Hek/KuvaHekWeapon", "Kuva Hek"],
    ["/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Hind/KuvaHind", "Kuva Hind"],
    ["/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Karak/KuvaKarak", "Kuva Karak"],
    ["/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Kohm/KuvaKohm", "Kuva Kohm"],
    ["/Lotus/Weapons/Grineer/KuvaLich/Secondaries/Kraken/KuvaKraken", "Kuva Kraken"],
    ["/Lotus/Weapons/Grineer/KuvaLich/Secondaries/Nukor/KuvaNukor", "Kuva Nukor"],
    ["/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Ogris/KuvaOgris", "Kuva Ogris"],
    ["/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Quartakk/KuvaQuartakk", "Kuva Quartakk"],
    ["/Lotus/Weapons/Grineer/KuvaLich/Secondaries/Seer/KuvaSeer", "Kuva Seer"],
    ["/Lotus/Weapons/Grineer/Melee/GrnKuvaLichScythe/GrnKuvaLichScytheWeapon", "Kuva Shildeg"],
    ["/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Sobek/KuvaSobek", "Kuva Sobek"],
    ["/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Tonkor/KuvaTonkor", "Kuva Tonkor"],
    ["/Lotus/Weapons/Grineer/KuvaLich/Secondaries/Stubba/KuvaTwinStubbas", "Kuva Twin Stubbas"],
    ["/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Zarr/KuvaZarr", "Kuva Zarr"]
  ].map(([path, name]) => [path, {
    text: `Generate a ${name} on a Kuva Lich, then vanquish that Kuva Lich; the weapon is placed in the Foundry ready to claim.`,
    url: "https://wiki.warframe.com/w/Adversary_Weapons",
    source: `Warframe Wiki Adversary Weapons exact Kuva route + DE export exact ${name} identity`
  }]),
  ...[
    ["/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBEArcaPlasmor/CrpBEArcaPlasmor", "Tenet Arca Plasmor"],
    ["/Lotus/Weapons/Corpus/BoardExec/Secondary/CrpBECycron/CrpBECycron", "Tenet Cycron"],
    ["/Lotus/Weapons/Corpus/BoardExec/Secondary/CrpBEDetron/CrpBEDetron", "Tenet Detron"],
    ["/Lotus/Weapons/Corpus/Pistols/CrpBriefcaseAkimbo/CrpBriefcaseAkimboPistol", "Tenet Diplos"],
    ["/Lotus/Weapons/Corpus/LongGuns/CrpBriefcaseLauncher/CrpBriefcaseLauncher", "Tenet Envoy"],
    ["/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBEFluxRifle/CrpBEFluxRifle", "Tenet Flux Rifle"],
    ["/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBEGlaxion/CrpBEGlaxion", "Tenet Glaxion"],
    ["/Lotus/Weapons/Corpus/BoardExec/Secondary/CrpBEPlinx/CrpBEPlinxWeapon", "Tenet Plinx"],
    ["/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBEQuanta/CrpBEQuanta", "Tenet Quanta"],
    ["/Lotus/Weapons/Corpus/Pistols/CrpIgniterPistol/CrpIgniterPistol", "Tenet Spirex"],
    ["/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBETetra/CrpBETetra", "Tenet Tetra"]
  ].map(([path, name]) => [path, {
    text: `Generate a ${name} on a Sister of Parvos, then vanquish that Sister; the weapon is placed in the Foundry ready to claim.`,
    url: "https://wiki.warframe.com/w/Adversary_Weapons",
    source: `Warframe Wiki Adversary Weapons exact Sister-of-Parvos route + DE export exact ${name} identity`
  }]),
  ...[
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartBodyA", "Adlet Core"],
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartHeadB", "Bhaira Hound"],
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartLegsA", "Cela Bracket"],
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartHeadA", "Dorma Hound"],
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartTailC", "Frak Stabilizer"],
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartBodyB", "Garmr Core"],
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartHeadC", "Hec Hound"],
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartTailB", "Hinta Stabilizer"],
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartBodyC", "Raiju Core"],
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartLegsB", "Urga Bracket"],
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartTailA", "Wanz Stabilizer"],
    ["/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetParts/ZanukaPetPartLegsC", "Zubb Bracket"]
  ].map(([path, name]) => [path, {
    text: "Random Hound component blueprint dropped by a defeated Sister of Parvos; the component is tradeable.",
    url: "https://wiki.warframe.com/w/Adversary_Weapons",
    source: `Warframe Wiki Adversary System exact Sister-of-Parvos Hound-component route + DE export exact ${name} identity`
  }]),
  [
    "/Lotus/Types/Sentinels/SentinelPrecepts/ArcTrap",
    {
      text: "Included with the Diriga Sentinel; the WFCD sentinel record lists Arc Coil as one of Diriga's default precepts.",
      url: "https://github.com/WFCD/warframe-items",
      source: "WFCD combined sentinel description + DE ExportUpgrades exact Arc Coil compatName=Diriga"
    }
  ],
  [
    "/Lotus/Types/Sentinels/SentinelPrecepts/HeadShot",
    {
      text: "Included with the Diriga Sentinel; the WFCD sentinel record lists Calculated Shot as one of Diriga's default precepts.",
      url: "https://github.com/WFCD/warframe-items",
      source: "WFCD combined sentinel description + DE ExportUpgrades exact Calculated Shot compatName=Diriga"
    }
  ],
  [
    "/Lotus/Types/Sentinels/SentinelPrecepts/TaserStun",
    {
      text: "Included with the Diriga Sentinel; the WFCD sentinel record lists Electro Pulse as one of Diriga's default precepts.",
      url: "https://github.com/WFCD/warframe-items",
      source: "WFCD combined sentinel description + DE ExportUpgrades exact Electro Pulse compatName=Diriga"
    }
  ],
  [
    "/Lotus/Types/Sentinels/SentinelPrecepts/RepairShip",
    {
      text: "Included with the Nautilus Sentinel; the WFCD sentinel record lists Auto Omni as a default precept.",
      url: "https://github.com/WFCD/warframe-items",
      source: "WFCD combined sentinel description + DE ExportUpgrades exact Auto Omni compatName=Nautilus"
    }
  ],
  [
    "/Lotus/Types/Sentinels/SentinelPrecepts/GatherEnemies",
    {
      text: "Included with the Nautilus Sentinel; the WFCD sentinel record lists Cordon as a default precept.",
      url: "https://github.com/WFCD/warframe-items",
      source: "WFCD combined sentinel description + DE ExportUpgrades exact Cordon compatName=Nautilus"
    }
  ],
  [
    "/Lotus/Types/Sentinels/SentinelPrecepts/CodexScannerPrecept",
    {
      text: "Included with the Helios Sentinel; the WFCD sentinel record lists Investigator as its unique precept.",
      url: "https://github.com/WFCD/warframe-items",
      source: "WFCD combined sentinel description + DE ExportUpgrades exact Investigator compatName=Helios"
    }
  ],
  [
    "/Lotus/Types/Sentinels/SentinelPrecepts/LocateResources",
    {
      text: "Included with the Oxylus Sentinel; the WFCD sentinel record lists Scan Matter as a default precept.",
      url: "https://github.com/WFCD/warframe-items",
      source: "WFCD combined sentinel description + DE ExportUpgrades exact Scan Matter compatName=Oxylus"
    }
  ],
  [
    "/Lotus/Types/Sentinels/SentinelPrecepts/ShieldVampire",
    {
      text: "Included with the Taxon Sentinel; the WFCD sentinel record lists Molecular Conversion as a default precept.",
      url: "https://github.com/WFCD/warframe-items",
      source: "WFCD combined sentinel description + DE ExportUpgrades exact Molecular Conversion compatName=Taxon"
    }
  ],
  [
    "/Lotus/Weapons/Grineer/LongGuns/GrineerM16Homage/KarakWraith",
    {
      text: "Obtain the Karak Wraith blueprint and parts as Invasion rewards; its components can also be traded.",
      url: "https://wiki.warframe.com/w/Karak_Wraith",
      source: "Warframe Wiki Invasion Reward category and Karak Wraith acquisition record + DE ExportWeapons exact identity"
    }
  ],
  [
    "/Lotus/Weapons/Tenno/LongGuns/WraithLatron/WraithLatron",
    {
      text: "Obtain the Latron Wraith blueprint and parts as Invasion rewards; its components can also be traded. Mastery Rank 7 is required to acquire the blueprint.",
      url: "https://wiki.warframe.com/w/Latron_Wraith",
      source: "Warframe Wiki exact Latron Wraith acquisition record + DE ExportWeapons exact identity"
    }
  ],
  [
    "/Lotus/Weapons/ClanTech/Energy/DeraVandal",
    {
      text: "Obtain the Dera Vandal blueprint and parts as Invasion rewards; its components can also be traded.",
      url: "https://wiki.warframe.com/w/Dera_Vandal",
      source: "Warframe Wiki Invasion Reward category + DE ExportWeapons exact identity"
    }
  ],
  [
    "/Lotus/Weapons/Grineer/Melee/GrineerCombatKnife/GrineerCombatKnife",
    {
      text: "Obtain the Sheev blueprint and parts as Invasion rewards; its components can also be traded.",
      url: "https://wiki.warframe.com/w/Sheev",
      source: "Warframe Wiki Invasion Reward category + DE ExportWeapons exact identity"
    }
  ],
  [
    "/Lotus/Weapons/Tenno/Shotgun/ShotgunVandal",
    {
      text: "Obtain the Strun Wraith blueprint and parts as Invasion rewards; its components can also be traded.",
      url: "https://wiki.warframe.com/w/Strun_Wraith",
      source: "Warframe Wiki exact Strun Wraith component acquisition record + DE ExportWeapons exact identity"
    }
  ],
  [
    "/Lotus/Weapons/Grineer/Pistols/WraithTwinVipers/WraithTwinVipers",
    {
      text: "Obtain the Twin Vipers Wraith blueprint and parts as Invasion rewards; its components can also be traded.",
      url: "https://wiki.warframe.com/w/Twin_Vipers_Wraith",
      source: "Warframe Wiki exact Twin Vipers Wraith component acquisition record + DE ExportWeapons exact identity"
    }
  ],
  [
    "/Lotus/Weapons/Tenno/Rifle/VandalSniperRifle",
    {
      text: "Obtain the Snipetron Vandal blueprint and parts as Invasion rewards; its components can also be traded. Mastery Rank 5 is required to acquire the blueprint.",
      url: "https://wiki.warframe.com/w/Snipetron_Vandal",
      source: "Warframe Wiki exact Snipetron Vandal acquisition record + DE ExportWeapons exact identity"
    }
  ],
  [
    "/Lotus/Weapons/Lasria/AK47/TC2024AK47Weapon",
    {
      text: "Purchase the AX-52 blueprint from Amir of The Hex in the H\xF6llvania Central Mall for 30,000 Standing at Rank 4 (Hot & Fresh) after completing The Hex; a built AX-52 was previously awarded as the TennoCon 2024 Twitch Drop.",
      url: "https://wiki.warframe.com/w/AX-52",
      source: "Warframe Wiki exact AX-52 acquisition/history + official Warframe Update 38.0 Amir offering + DE ExportWeapons exact identity"
    }
  ],
  [
    "/Lotus/Weapons/Lasria/LasGooAK/LasGooAKPlayerWeapon",
    {
      text: "Purchase the EFV-5 Jupiter main and component blueprints from Minerva's Covert Arms in The Hex's H\xF6llvania Central Mall for Hex Standing at Rank 5 (Pizza Party), or purchase the complete weapon from the in-game Market.",
      url: "https://www.warframe.com/en/patch-notes/psn/38-5-0",
      source: "Official Warframe Update 38.5 exact EFV-5 Jupiter acquisition + DE ExportWeapons exact identity"
    }
  ],
  [
    "/Lotus/Powersuits/Dagath/Dagath",
    {
      text: "Purchase Dagath's main blueprint from the Shrine of Dagath in the Dagath's Hallow Dojo room; craft the component blueprints using Vainthorns from Abyssal Zone missions opened with Abyssal Beacons.",
      url: "https://wiki.warframe.com/w/Warframes_Comparison/Acquisition",
      source: "Warframe Wiki Dagath acquisition table + Devstream 173 Dagath's Hallow route + DE ExportWarframes exact Dagath identity"
    }
  ],
  [
    "/Lotus/Weapons/Tenno/Melee/Swords/TnDagathBladeWhip/TnDagathBladeWhip",
    {
      text: "Acquire Dorrclave's main and component blueprints from the Shrine of Dagath in the Dagath's Hallow Dojo room; the component materials include Vainthorns from Abyssal Zone missions opened with Abyssal Beacons.",
      url: "https://www.warframe.com/news/devstream-173-overview",
      source: "Warframe.com Devstream 173 Dagath's Hallow route + DE ExportWeapons exact Dorrclave identity"
    }
  ],
  [
    "/Lotus/Weapons/Tenno/Melee/Swords/DarkSword/DarkSwordDaggerHybridWeapon",
    {
      text: "Research and replicate the Dark Split-Sword blueprint in a Clan Dojo Tenno Lab; the complete weapon is also sold in the Market for 225 Platinum.",
      url: "https://wiki.warframe.com/w/Dark_Split-Sword",
      source: "Warframe Wiki exact Dark Split-Sword acquisition record + DE ExportWeapons exact identity and 225-Platinum Market price"
    }
  ],
  [
    "/Lotus/Types/AvatarImages/FanChannel/AvatarImageBennyfits",
    {
      text: "Legacy creator glyph. The current browse.wf record contains only a glyphwave identifier and no active promo code, giveaway, or source link; existing copies are legacy-owned.",
      url: "asset-cache://browse.wf/",
      source: "browse.wf exact Bennyfits glyph record disposition"
    }
  ],
  [
    "/Lotus/Types/AvatarImages/FanChannel/AvatarImageBikeman",
    {
      text: "Legacy creator glyph. The current browse.wf record contains only a glyphwave identifier and no active promo code, giveaway, or source link; existing copies are legacy-owned.",
      url: "asset-cache://browse.wf/",
      source: "browse.wf exact Bikeman glyph record disposition"
    }
  ],
  [
    "/Lotus/Types/AvatarImages/FanChannel/AvatarImageSp00nerism",
    {
      text: "Legacy creator glyph. The current browse.wf record contains only a glyphwave identifier and no active promo code, giveaway, or source link; existing copies are legacy-owned.",
      url: "asset-cache://browse.wf/",
      source: "browse.wf exact Sp00nerism glyph record disposition"
    }
  ],
  [
    "/Lotus/Types/AvatarImages/FanChannel/AvatarImageSummit1G",
    {
      text: "Legacy creator glyph. The current browse.wf record contains only a glyphwave identifier and no active promo code, giveaway, or source link; existing copies are legacy-owned.",
      url: "asset-cache://browse.wf/",
      source: "browse.wf exact Summit1g glyph record disposition"
    }
  ],
  [
    "/Lotus/Weapons/Tenno/Akimbo/AkimboBolto",
    {
      text: "Purchase the Akbolto blueprint from the Market for 15,000 Credits, then build it in the Foundry for 20,000 Credits using 2 Bolto and 1 Orokin Cell.",
      url: "https://wiki.warframe.com/w/Akbolto",
      source: "DE ExportRecipes exact AkboltoBlueprint result and ingredients + DE export Market credit cost"
    }
  ],
  [
    "/Lotus/Types/AvatarImages/AvatarImageDanteGlyph",
    {
      text: "Included in the one-time Dante Chronicles Pack, which contains Dante, Ruvox, Rencowl Syandana, Oranist Armor, Dante Cantist Helmet, this glyph, Dante's Noctua Sigil, Observant Vitreum, and 125 Platinum.",
      url: "https://www.warframe.com/en/news/dante-chronicles-pack",
      source: "Warframe.com Dante Chronicles Pack contents + WFCD exact glyph identity"
    }
  ],
  [
    "/Lotus/Types/AvatarImages/AvatarImageGlyphErisTennocon2020Gate",
    {
      text: "Previously awarded through the 4GamerLive Warframe promotion by redeeming the event item code; the code expired on November 1, 2020, so this promotion is no longer active.",
      url: "https://www.4gamer.net/games/172/G017216/20200925084/",
      source: "4GamerLive event announcement naming the exact Void Mirror Glyph and redemption window + WFCD exact glyph identity"
    }
  ],
  [
    "/Lotus/Types/AvatarImages/AvatarImageGlyphMashedNefAnyo",
    {
      text: "Purchased individually for 20 Platinum or as part of the 110-Platinum MASHED Glyph Pack; the pack contains seven glyphs depicting moments from MASHED\u2019s 100 Days of Warframe video.",
      url: "https://wiki.warframe.com/w/Glyph",
      source: "Warframe Wiki MASHED Glyphs section + Module:Glyphes exact uniqueName"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Ember/EmberDeluxeDualPistolSkin",
    {
      text: "Exclusive to the Ember Vermillion Collection, which is purchased from the in-game Market for 225 Platinum; the local DE export identifies this exact record as the Nusku Dual Pistol Skin.",
      url: "https://wiki.warframe.com/w/Ember_Vermillion_Collection",
      source: "Warframe Wiki Ember Vermillion Collection acquisition + local DE ExportCustoms exact Nusku Dual Pistol Skin record"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Weapons/Pistols/TnSubmachinegunDualPistolSkin",
    {
      text: "Included in the Empyrean Grand Bundle, sold from the in-game Market for 820 Platinum; the local DE export identifies this exact record as the Zundi Dual Pistol Skin.",
      url: "https://wiki.warframe.com/w/Empyrean_Grand_Bundle",
      source: "Warframe Wiki Empyrean Grand Bundle contents + local DE ExportCustoms exact Zundi Dual Pistol Skin record"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Sigils/MasterySigil",
    {
      text: "Purchased from the in-game Market for 1 Credit; the sigil changes its design as your Mastery Rank increases.",
      url: "https://wiki.warframe.com/w/Sigils?page=2&title=Sigils",
      source: "Warframe Wiki Purchasable Sigils section + local DE ExportCustoms exact Mastery Sigil record"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Halloween/HalloweenLatoVandal",
    {
      text: "Previously sold as a limited-time Day of the Dead Market skin for 20 Platinum; the local DE export still identifies the exact Lato Vandal variant but currently excludes it from the Market.",
      url: "https://www.warframe.com/news/attention-all-tenno",
      source: "Warframe.com Day of the Dead announcement + local DE ExportCustoms exact Lato Vandal skin record"
    }
  ],
  [
    "/Lotus/Types/Restoratives/Consumable/GlyphConsumable",
    {
      text: "Purchased from the Glyph menu as the charged Glyph Prism gear item; the local DE export records a purchase quantity of 100 for 1,000 Credits.",
      url: "https://wiki.warframe.com/w/Glyph",
      source: "DE ExportGear exact Glyph Prism record + Warframe Wiki Glyph usage record"
    }
  ],
  [
    "/Lotus/Types/Restoratives/Consumable/GlyphConsumableNoCharges",
    {
      text: "Purchased from the Glyph menu as the unlimited-use Glyph Prism gear item; the local DE export records a price of 50 Platinum.",
      url: "https://wiki.warframe.com/w/Glyph",
      source: "DE ExportGear exact unlimited Glyph Prism record + Warframe Wiki Glyph usage record"
    }
  ],
  [
    "/Lotus/Types/Restoratives/Consumable/RecallToRailjack",
    {
      text: "Unlocked by Tactical Intrinsics Rank 4 (Recall Warp); equip the Omni gear item to teleport back to the Railjack from outside it.",
      url: "https://wiki.warframe.com/w/Railjack/Intrinsics",
      source: "Warframe Wiki Railjack Intrinsics structured rank table + local DE ExportGear exact RecallToRailjack record"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Scarves/TnLargeCapeXbox",
    {
      text: "Previously awarded from Xbox One 6th Anniversary Alert #5, which granted the Jade Broca Syandana and 10,000 Credits; that limited-time alert has ended.",
      url: "https://www.warframe.com/de/news/6th-anniversary-on-xbox",
      source: "Warframe.com 6th Anniversary on Xbox + local export exact Jade Broca Syandana record"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Scarves/TnSparrowCape",
    {
      text: "Previously included in The Origin Pack with 200 Platinum for PS4/Xbox One and later Nintendo Switch; this limited-time console pack is no longer an active acquisition route.",
      url: "https://www.warframe.com/en/news/the-origin-pack",
      source: "Warframe.com The Origin Pack + local export exact Parotia Syandana record"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Scarves/MixerKyropteraScarf",
    {
      text: "Previously awarded for linking a Warframe account to Mixer during the 2019 promotional period; the Mixer promotion has ended.",
      url: "https://www.warframe.com/en/news/watch-warframe-on-mixer-to-earn-free-rewards",
      source: "Warframe.com Mixer promotion + local export exact Kyroptera Panoply Syandana record"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/SteamEsteem/EsteemOrthos",
    {
      text: "Previously included with the Orthos weapon in any of the 2019 Wintermaker Pinnacle Packs; those packs are no longer an active acquisition route.",
      url: "https://store.steampowered.com/news/posts/?appids=230410&enddate=1552002479",
      source: "Warframe Steam Community announcement (Wintermaker Pinnacle Packs) + local export exact Orthos Onyx Skin record"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/SteamEsteem/EsteemTigris",
    {
      text: "Previously included with the Tigris weapon in the 2019 Wintermaker Pinnacle Packs; those packs are no longer an active acquisition route.",
      url: "https://store.steampowered.com/news/posts/?appids=230410&enddate=1552682647&feed=steam_community_announcements",
      source: "Warframe Steam Community announcement (Wintermaker Pinnacle Packs) + local export exact Tigris Onyx Skin record"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Operator/Skirts/SkirtAdultPrimeB",
    {
      text: "Component of the Commodore Prime Suit, included in the Zephyr Prime Accessories package during Zephyr Prime Access; the local export links this Drifter/Operator piece to its Prime armor counterpart.",
      url: "https://www.warframe.com/news/zephyr-prime-access-begins-march-20",
      source: "Warframe.com Zephyr Prime Access announcement + local export Commodore Prime component records"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Operator/BodySuits/BodySuitAdultPrimeB",
    {
      text: "Component of the Commodore Prime Suit, included in the Zephyr Prime Accessories package during Zephyr Prime Access; the local export links this Drifter/Operator piece to its Prime armor counterpart.",
      url: "https://www.warframe.com/news/zephyr-prime-access-begins-march-20",
      source: "Warframe.com Zephyr Prime Access announcement + local export Commodore Prime component records"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Operator/Leggings/LeggingsAdultPrimeB",
    {
      text: "Component of the Commodore Prime Suit, included in the Zephyr Prime Accessories package during Zephyr Prime Access; the local export links this Drifter/Operator piece to its Prime armor counterpart.",
      url: "https://www.warframe.com/news/zephyr-prime-access-begins-march-20",
      source: "Warframe.com Zephyr Prime Access announcement + local export Commodore Prime component records"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Operator/Hoods/HoodAdultPrimeB",
    {
      text: "Component of the Commodore Prime Suit, included in the Zephyr Prime Accessories package during Zephyr Prime Access; the local export links this Drifter/Operator piece to its Prime armor counterpart.",
      url: "https://www.warframe.com/news/zephyr-prime-access-begins-march-20",
      source: "Warframe.com Zephyr Prime Access announcement + local export Commodore Prime component records"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Operator/Sleeves/SleevesAdultPrimeB",
    {
      text: "Component of the Commodore Prime Suit, included in the Zephyr Prime Accessories package during Zephyr Prime Access; the local export links this Drifter/Operator piece to its Prime armor counterpart.",
      url: "https://www.warframe.com/news/zephyr-prime-access-begins-march-20",
      source: "Warframe.com Zephyr Prime Access announcement + local export Commodore Prime component records"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Dagath/DagathDeluxeLNYHelmet",
    {
      text: "Included with the Dagath Yfari Skin; the skin is sold individually in the in-game Market for 165 Platinum, and the local export links this helmet as its component.",
      url: "https://www.warframe.com/en/patch-notes/pc/41-1-0",
      source: "Warframe.com Update 41.1: Vauban Heirloom + local export Dagath Yfari skin/component records"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Armor/WarframeDefaults/SWYhavanDagathAArmor",
    {
      text: "Included with the Dagath Yhavan Skin; PC players acquire the TennoGen skin through Steam Workshop, while console and iOS players can purchase it for Platinum in the in-game Market.",
      url: "https://forums.warframe.com/topic/1469559-new-tennogen-arriving-in-october-first-look/",
      source: "Warframe Forums TennoGen announcement + local export Dagath Yhavan skin/component records"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/BrokenFrame/XakuCosmosSkin",
    {
      text: "Nora\u2019s Mix Volume 9 reward at Rank 30; the reward included the Xaku Raya Skin and Xaku Raya Helmet.",
      url: "https://wiki.warframe.com/w/Nightwave/Nora%27s_Mix_Volume_9",
      source: "Warframe Wiki (Nora\u2019s Mix Volume 9) + local export skin/helmet relationship"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/BrokenFrame/XakuCosmosHelmet",
    {
      text: "Nora\u2019s Mix Volume 9 reward at Rank 30, included with the Xaku Raya Skin.",
      url: "https://wiki.warframe.com/w/Nightwave/Nora%27s_Mix_Volume_9",
      source: "Warframe Wiki (Nora\u2019s Mix Volume 9) + local export skin/helmet relationship"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Trapper/VaubanHeirloomHelmet",
    {
      text: "Included with the Vauban Heirloom Skin in the Vauban Heirloom Collection; the local export lists the skin at 225 Platinum and the collection at 400 Platinum.",
      url: "https://www.warframe.com/en/patch-notes/pc/41-1-0",
      source: "Warframe.com Update 41.1: Vauban Heirloom + local export skin/component records"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Trapper/VaubanHeirloomAux",
    {
      text: "Included with the Vauban Heirloom Skin in the Vauban Heirloom Collection; the Overcoat can be switched to its sleeveless variant in the Auxiliary options.",
      url: "https://www.warframe.com/en/patch-notes/pc/41-1-0",
      source: "Warframe.com Update 41.1: Vauban Heirloom + local export skin/component records"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Trapper/VaubanHeirloomAuxSleeveless",
    {
      text: "The sleeveless Overcoat option is included with the Vauban Heirloom Skin in the Vauban Heirloom Collection.",
      url: "https://www.warframe.com/en/patch-notes/pc/41-1-0",
      source: "Warframe.com Update 41.1: Vauban Heirloom + local export skin/component records"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Necramech/VoidrigDOTDSkin",
    {
      text: "Purchased from Daughter during Nights of Naberus for 100 Mother Tokens; the linked Day of the Dead Necramech Helmet is granted with the skin.",
      url: "https://wiki.warframe.com/w/Necramech",
      source: "Warframe Wiki (Necramech) + local export skin/helmet relationship"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Necramech/VoidrigDOTDHelmet",
    {
      text: "Granted with the Day of the Dead Necramech Skin, which is purchased from Daughter during Nights of Naberus for 100 Mother Tokens.",
      url: "https://wiki.warframe.com/w/Necramech",
      source: "Warframe Wiki (Necramech) + local export skin/helmet relationship"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Necramech/TefilahIridosSkin",
    {
      text: "Prime Gaming Drop 12: claim the Iridos Collection through a linked Prime Gaming and Warframe account; the drop included the Iridos Voidrig Necramech Skin and its helmet.",
      url: "https://www.warframe.com/en/news/prime-gaming-iridos-collection",
      source: "Warframe.com Prime Gaming Iridos Collection + local export skin/helmet relationship"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Necramech/TefilahIridosHelmet",
    {
      text: "Prime Gaming Drop 12: claim the Iridos Collection through a linked Prime Gaming and Warframe account; the drop included the Iridos Voidrig Necramech Skin and this helmet.",
      url: "https://www.warframe.com/en/news/prime-gaming-iridos-collection",
      source: "Warframe.com Prime Gaming Iridos Collection + local export skin/helmet relationship"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Bard/BardTwitchSkin",
    {
      text: "Prime Gaming Drop 1: the Octavia Iridos Bundle, available through November 14, 2023, included Octavia Iridos Skin and the Octavia Iridos Mix Helmet.",
      url: "https://www.warframe.com/en/news/prime-gaming-iridos-collection",
      source: "Warframe.com Prime Gaming Iridos Collection"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Bard/BardTwitchAltHelmet",
    {
      text: "Included in the Octavia Iridos Bundle from Prime Gaming, available through November 14, 2023, as the Octavia Iridos Mix Helmet.",
      url: "https://www.warframe.com/en/news/prime-gaming-iridos-collection",
      source: "Warframe.com Prime Gaming Iridos Collection"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Necramech/NecramechSnakeSkin",
    {
      text: "Purchased from the Necraloid Syndicate\u2019s Necramech Embellishments offerings for 60 Platinum.",
      url: "https://wiki.warframe.com/w/Necramech",
      source: "Warframe Wiki (Necramech) + local export skin/helmet relationship"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Necramech/NecramechSnakeHelmet",
    {
      text: "Granted with the Snake Necramech Skin, purchased from the Necraloid Syndicate\u2019s Necramech Embellishments offerings for 60 Platinum.",
      url: "https://wiki.warframe.com/w/Necramech",
      source: "Warframe Wiki (Necramech) + local export skin/helmet relationship"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Sigils/NecramechSigilSnake",
    {
      text: "Purchased from the Necraloid Syndicate\u2019s Necramech Embellishments offerings for 40 Platinum.",
      url: "https://wiki.warframe.com/w/Necramech",
      source: "Warframe Wiki (Necramech)"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Operator/Skirts/SkirtLasrianB",
    {
      text: "Included in the Chymerist Collection (130 Platinum), or obtained with the corresponding Chymerist Apparel purchase for 25 Platinum; the Operator and Drifter versions are linked in the export.",
      url: "https://www.warframe.com/ru/patch-notes/pc/38-5-0",
      source: "Warframe.com Techrot Encore Update 38.5 + local export Chymerist bundle/component records"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Operator/Sleeves/SleevesOperatorLasrianB",
    {
      text: "Included in the Chymerist Collection (130 Platinum), or obtained with the corresponding Chymerist Gloves purchase for 30 Platinum; the Operator and Drifter versions are linked in the export.",
      url: "https://www.warframe.com/ru/patch-notes/pc/38-5-0",
      source: "Warframe.com Techrot Encore Update 38.5 + local export Chymerist bundle/component records"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Operator/Hoods/HoodOperatorLasrianB",
    {
      text: "Included in the Chymerist Collection (130 Platinum), or obtained with the corresponding Chymerist Mask purchase for 40 Platinum; the Operator and Drifter versions are linked in the export.",
      url: "https://www.warframe.com/ru/patch-notes/pc/38-5-0",
      source: "Warframe.com Techrot Encore Update 38.5 + local export Chymerist bundle/component records"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Operator/BodySuits/BodySuitOperatorLasrianB",
    {
      text: "Included in the Chymerist Collection (130 Platinum), or obtained with the corresponding Chymerist Uniform purchase for 40 Platinum; the Operator and Drifter versions are linked in the export.",
      url: "https://www.warframe.com/ru/patch-notes/pc/38-5-0",
      source: "Warframe.com Techrot Encore Update 38.5 + local export Chymerist bundle/component records"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Armor/PrimeStyanaxArmor/PrimeStyanaxCArmor",
    {
      text: "Component of Daurus Prime Armor, included in the Styanax Prime Accessories Pack and Styanax Prime Access Complete Pack; this was a limited-time Prime Access offering.",
      url: "https://www.warframe.com/prime-access",
      source: "Warframe Prime Access (Styanax Prime Accessories)"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Armor/PrimeStyanaxArmor/PrimeStyanaxLArmor",
    {
      text: "Component of Daurus Prime Armor, included in the Styanax Prime Accessories Pack and Styanax Prime Access Complete Pack; this was a limited-time Prime Access offering.",
      url: "https://www.warframe.com/prime-access",
      source: "Warframe Prime Access (Styanax Prime Accessories)"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Armor/PrimeStyanaxArmor/PrimeStyanaxAArmor",
    {
      text: "Component of Daurus Prime Armor, included in the Styanax Prime Accessories Pack and Styanax Prime Access Complete Pack; this was a limited-time Prime Access offering.",
      url: "https://www.warframe.com/prime-access",
      source: "Warframe Prime Access (Styanax Prime Accessories)"
    }
  ],
  [
    "/Lotus/Upgrades/Skins/Geode/CitrineDeluxeHelmet",
    {
      text: "Included with the Citrine Aphrodita Skin; the skin is sold individually in the Market for 165 Platinum or in the Citrine Aphrodita Collection for 365 Platinum.",
      url: "https://www.warframe.com/pt-br/patch-notes/ios/39-0-0",
      source: "Warframe.com Isleweaver Update 39; Warframe Wiki (Citrine Aphrodita Skin)"
    }
  ],
  [
    "/Lotus/Types/AvatarImages/Community10YearOrdisGlyph",
    {
      text: "Part of the 10 Year Anniversary Community Art Pack, purchased in the Market for 70 Platinum.",
      url: "https://wiki.warframe.com/w/Glyph",
      source: "Warframe Wiki (Glyph)"
    }
  ],
  ["/Lotus/Types/AvatarImages/AvatarImageBuriedDebts", { text: "Redeem the promo code THEDEADHAVEDEBTS from Operation: Buried Debts.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/ImageCephalonCy", { text: "Twitch, Mixer, or Steam Drop for watching an official Warframe stream for 30 minutes during the launch of Update 27.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/ImageCephalonSimaris", { text: "Exclusively awarded to winners of Simaris' Sanctuary Showdown during TennoCon 2018, distributed via a code card after the event.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/CherryTreeGlyph", { text: "Twitch Drop for watching Partner streams for 1 hour during the launch of Update 23.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/Warframes/CitrineActionGlyph", { text: "Awarded from the Gift from the Lotus alert on April 5, 2023.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/Seasonal/AvatarImageHalloween2021Dethcube", { text: "Included in the Gruesome Glyph Bundle, sold in the Market for 65 Platinum during Halloween since 2021.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageValentine2017A", { text: "Included in the Donwyn Glyph Pack, sold in the Market for 80 Platinum during Valentines 2017.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageValentine2017B", { text: "Included in the Donwyn Glyph Pack, sold in the Market for 80 Platinum during Valentines 2017.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageValentine2017C", { text: "Included in the Donwyn Glyph Pack, sold in the Market for 80 Platinum during Valentines 2017.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageValentine2017D", { text: "Included in the Donwyn Glyph Pack, sold in the Market for 80 Platinum during Valentines 2017.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageValentine2017E", { text: "Included in the Donwyn Glyph Pack, sold in the Market for 80 Platinum during Valentines 2017.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageValentine2020Alad", { text: "Included in Donwyn Glyph Pack II, sold in the Market for 60 Platinum.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageValentine2020Clem", { text: "Included in Donwyn Glyph Pack II, sold in the Market for 60 Platinum.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageValentine2020Key", { text: "Included in Donwyn Glyph Pack II, sold in the Market for 60 Platinum.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageValentine2020Kuva", { text: "Included in Donwyn Glyph Pack II, sold in the Market for 60 Platinum.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/TenYearAnniversaryWeek2Glyph", { text: "Given to all players who completed the Recall Ten-Zero quests during the July 19\u2013August 25 anniversary period.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/ImageDeadlockProtocolB", { text: "Redeem the promo code aungelecette-dlp, issued June 11, 2020.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/ImageGengzi", { text: "Available from the Market for 1 Credit from January 23\u201331, 2020; Lunar New Year exclusive.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/Seasonal/AvatarImageHalloween2021Grineer", { text: "Included in the Gruesome Glyph Bundle, sold in the Market for 65 Platinum during Halloween since 2021.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageInktober", { text: "Given to all eligible participants of Halloween's Tennotober contest.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/TenYearAnniversaryWeek4Glyph", { text: "Given to all players who completed the Recall Ten-Zero quests during the July 19\u2013August 25 anniversary period.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageGlyphJingleKavat", { text: "Included in Winter Glyph Pack IV, sold for 90 Platinum during Christmas 2019.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageGlyphJollyGrendel", { text: "Included in Winter Glyph Pack IV, sold for 90 Platinum during Christmas 2019.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/Xmas2021GrinoalieGlyph", { text: "Tennobaum 2022 milestone reward.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/ImageKhoraInAction", { text: "Nightwave reward from Nora's Mix Volume 6.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageOroKitty", { text: "Rewarded upon scanning 75% of Kuria.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageAmirValentine", { text: "Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageAoiValentine", { text: "Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageArthurValentine", { text: "Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageStarDaysCervulitePat", { text: "Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageEleanorValentine", { text: "Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageValentine2023Gyre", { text: "Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageValentine2023Kavat", { text: "Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageLettieValentine", { text: "Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageStarDaysQorvexHeart", { text: "Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageQuincyValentine", { text: "Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageValentine2023Ticker", { text: "Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageBadgeEmber", { text: "Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageBadgeKulervo", { text: "Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageBadgeMesa", { text: "Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageBadgeOctavia", { text: "Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageBadgeRhino", { text: "Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageBadgeStynax", { text: "Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageBadgeXaku", { text: "Purchased from Ticker in Fortuna during Star Days for 5 specified Debt-Bonds.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/TenYearAnniversaryWeek3Glyph", { text: "Given to all players who completed the Recall Ten-Zero quests during the July 19\u2013August 25 anniversary period.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/TenYearAnniversaryWeek5Glyph", { text: "Given to all players who completed the Recall Ten-Zero quests during the July 19\u2013August 25 anniversary period.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/TenYearAnniversaryWeek1Glyph", { text: "Given to all players who completed the Recall Ten-Zero quests during the July 19\u2013August 25 anniversary period.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageStarterPackLotus", { text: "Available through the WARFRAME Starter Pack from June 25, 2019 until August 25, 2020.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageGlyphStarterPackA", { text: "Available through the WARFRAME Starter Pack until June 25, 2019.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/ImageRailjackInAction", { text: "Available through the Empyrean Supporter Pack from December 12, 2019 until August 25, 2020.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageGrineerQueensVed", { text: "Rewarded upon completing The War Within.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/Image2019Twitter", { text: "Redeem the promo code TWEET4TENNO during TennoCon 2019.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/Gamification2019Glyph", { text: "Reward for completing the TennoCon 2019 scavenger-hunt-style game.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/TennoCon2020SimarisGlyph", { text: "Exclusive reward for the top 1,000 highest-scoring players of the TennoTrivia quiz during TennoCon 2020.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/FanChannel/AvatarImageTennoGen", { text: "Included in the TennoGen Glyph Pack, sold in the Market for 75 Platinum; also purchasable individually for 15 Platinum.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/TennoCon2017Glyph", { text: "Exclusive to players who purchased the physical or digital TennoCon 2017 ticket.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/TennoCon2018Glyph", { text: "Exclusive to players who purchased the physical or digital TennoCon 2018 ticket.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/TennoCon2019Glyph", { text: "Exclusive to players who purchased the physical or digital TennoCon 2019 ticket.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/TennoCon2020Glyph", { text: "Exclusive to players who purchased the physical or digital TennoCon 2020 ticket.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/TennoCon2021Glyph", { text: "Exclusive to players who purchased the physical or digital TennoCon 2021 ticket.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/TennoCon2022Glyph", { text: "Exclusive to players who purchased the physical or digital TennoCon 2022 ticket.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/TennoCon2023Glyph", { text: "Exclusive to players who purchased the physical or digital TennoCon 2023 ticket.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/TennoCon2024Glyph", { text: "Exclusive to players who purchased the physical or digital TennoCon 2024 ticket.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/TennoCon2025Glyph", { text: "Exclusive to players who purchased the physical or digital TennoCon 2025 ticket.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/TennoCon2021MerchGlyph", { text: "Part of the purchasable TennoCon 2021 merch pack, obtained with its redeemable code.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/TennoCon2022MerchGlyph", { text: "Part of the purchasable TennoCon 2022 merch pack, obtained with its redeemable code.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/ImageDeadlockProtocolA", { text: "Redeem the promo code GOLDEN, issued before the launch of The Deadlock Protocol.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageZarimanLogo", { text: "Redeem the promo code REMEMBERUS, issued April 28, 2022.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/Xmas2021MaggotGlyph", { text: "Tennobaum 2022 milestone reward.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/Xmas2021MoaGlyph", { text: "Tennobaum 2022 milestone reward.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/Xmas2021NutcorpusGlyph", { text: "Tennobaum 2022 milestone reward.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/Xmas2023ThraxGlyph", { text: "Tennobaum 2023 milestone reward.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/Xmas2023BombastineGlyph", { text: "Part of the Duviri Community Art Pack, sold in the Market for 40 Platinum; the glyph is also available individually for 20 Platinum.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/ImageDexAnniversary", { text: "Reward from the 7th Year Anniversary alert.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageConqueraGlyphUpdated", { text: "Available from the Market for 1 Credit during the Conquera campaign.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/FanChannel/AvatarImageLegendaryElof", { text: "Exclusive to the player who designed it after purchasing a Legendary Ticket to TennoCon.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageGlyphKiradien", { text: "Exclusive to the player who designed it after purchasing a Legendary Ticket to TennoCon.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageGlyphLegendaryCelestics", { text: "Exclusive to the player who designed it after purchasing a Legendary Ticket to TennoCon.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageGlyphMattaus", { text: "Exclusive to the player who designed it after purchasing a Legendary Ticket to TennoCon.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/ImageLotusDeluxe", { text: "Included in the Golden Mend Collection, sold in the Market for 430 Platinum.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/Seasonal/AvatarImageHalloween2021Loid", { text: "Included in the Gruesome Glyph Bundle, sold in the Market for 65 Platinum during Halloween since 2021.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/Seasonal/AvatarImageHalloween2021Pumpkin", { text: "Included in the Gruesome Glyph Bundle, sold in the Market for 65 Platinum during Halloween since 2021.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImagePrideCommunity", { text: "Available from the Market for 1 Credit during Pride in June.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageHildrynPrideCommunity", { text: "Available from the Market for 1 Credit during Pride in June.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageGlyphSkiGauss", { text: "Included in Winter Glyph Pack IV, sold for 90 Platinum during Christmas 2019.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageGlyphSurpriseIvara", { text: "Included in Winter Glyph Pack IV, sold for 90 Platinum during Christmas 2019.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/TennoCon2023MerchGlyph", { text: "Awarded to the top 10 of the 10 Year Anniversary Art Showcase; winners were announced April 20, 2023.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageTennoVIP", { text: "Available through the 11 Year Anniversary Twitch Drop campaign.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/AvatarImageTeshinVed", { text: "Redeem the promo code WARWITHIN during the launch of Update 19.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/FanChannel/AvatarImageLegendaryBlackdeath", { text: "Exclusive to the player who designed it after purchasing a Legendary Ticket to TennoCon.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/ImageXakuDeluxeKintsugi", { text: "Included in the Golden Mend Collection, sold in the Market for 430 Platinum.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/Seasonal/AvatarImageHalloween2024SisterNoBloodGlyph", { text: "Purchased from Daughter for 20 Mother Tokens during Nights of Naberus.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Types/AvatarImages/Seasonal/AvatarImageHalloween2021Lotus", { text: "Included in the Gruesome Glyph Bundle, sold in the Market for 65 Platinum during Halloween since 2021.", url: "https://wiki.warframe.com/w/Glyph", source: "Warframe Wiki (Glyph)" }],
  ["/Lotus/Upgrades/Skins/Sigils/InfLichConvertedSigil", {
    text: "Rewarded for converting your first Technocyte Coda.",
    url: "https://www.warframe.com/en/patch-notes/psn/38-5-0",
    source: "Warframe.com Update 38.5: Techrot Encore"
  }],
  ["/Lotus/Upgrades/Skins/Sigils/InfLichVanquishedSigil", {
    text: "Rewarded for vanquishing your first Technocyte Coda.",
    url: "https://www.warframe.com/en/patch-notes/psn/38-5-0",
    source: "Warframe.com Update 38.5: Techrot Encore"
  }],
  ["/Lotus/Upgrades/Skins/Sigils/HoundingKubrowSigil", {
    text: "Purchased from Daughter in the Necralisk during Nights of Naberus for Mother Tokens.",
    url: "https://www.warframe.com/th/news/nights-of-naberus-returns-en",
    source: "Warframe.com Nights of Naberus Returns"
  }],
  ["/Lotus/Upgrades/Skins/Sigils/SomberStalkerSigil", {
    text: "Purchased from Daughter in the Necralisk during Nights of Naberus for Mother Tokens.",
    url: "https://www.warframe.com/th/news/nights-of-naberus-returns-en",
    source: "Warframe.com Nights of Naberus Returns"
  }],
  ["/Lotus/Upgrades/Skins/Sigils/Tennogen10YearSigil", {
    text: "Free Inbox reward during the TennoGen 10 Year Anniversary campaign; claimable by logging in before December 31, 2025.",
    url: "https://www.warframe.com/en/news/tennogen10",
    source: "Warframe.com TennoGen 10 Year Anniversary Celebration"
  }],
  ["/Lotus/Upgrades/Skins/Sigils/PS4TwoYearSigil", {
    text: "PS4 second-anniversary Inbox reward during the 2015 anniversary event.",
    url: "https://www.warframe.com/uk/news/warframe-celebrates-two-years-playstation-4",
    source: "Warframe.com PlayStation 4 second anniversary announcement"
  }],
  ["/Lotus/Upgrades/Skins/Sigils/PS4FourYearSigil", {
    text: "PS4 fourth-anniversary Inbox reward during the 2017 anniversary event.",
    url: "https://www.warframe.com/en/news/playstation-4",
    source: "Warframe.com PlayStation 4 fourth anniversary announcement"
  }],
  ["/Lotus/Upgrades/Skins/Sigils/PS4FiveYearSigil", {
    text: "PS4 fifth-anniversary Inbox reward during the 2018 anniversary event.",
    url: "https://www.warframe.com/en/news/5-year-anniversary",
    source: "Warframe.com PlayStation 4 fifth anniversary announcement"
  }],
  ["/Lotus/Upgrades/Skins/Sigils/XBoneTwoYearSigil", {
    text: "Xbox second-anniversary Inbox reward during the 2016 anniversary event.",
    url: "https://www.warframe.com/uk/news/dziekujemy-za-dwa-wysmienite-lata-tenno",
    source: "Warframe.com Xbox One second anniversary announcement"
  }],
  ["/Lotus/Upgrades/Skins/Sigils/XBoneFourYearSigil", {
    text: "Xbox fourth-anniversary Inbox reward during the 2018 anniversary event.",
    url: "https://www.warframe.com/en/news/warframe-s-fourth-anniversary-on-xbox-one",
    source: "Warframe.com Xbox One fourth anniversary announcement"
  }],
  ["/Lotus/Upgrades/Skins/Sigils/PS4CrowSigil", {
    text: "Included in the PlayStation-exclusive Obsidian Corvus Collection.",
    url: "https://www.warframe.com/uk/news/obsidian-corvus-collection-available-now",
    source: "Warframe.com Obsidian Corvus Collection announcement"
  }],
  ["/Lotus/Upgrades/Skins/Sigils/ObsidianIndraSigil", {
    text: "Included in the PlayStation-exclusive Ultimate Obsidian Collection.",
    url: "https://www.warframe.com/en/news/ultimate-obsidian-collection",
    source: "Warframe.com Ultimate Obsidian Collection announcement"
  }],
  ["/Lotus/Upgrades/Skins/Sigils/PS4RenownXSigil", {
    text: "Included in the PlayStation-exclusive Renown Pack X.",
    url: "https://www.warframe.com/en/news/x",
    source: "Warframe.com Renown Pack X announcement"
  }],
  ["/Lotus/Upgrades/Skins/Sigils/QTCC2023ConqueraSigil", {
    text: "Redeem promo code CONQUERA2023 in the in-game Market during the 2023 Quest to Conquer Cancer campaign.",
    url: "https://www.warframe.com/news/quest-to-conquer-cancer-2023",
    source: "Warframe.com Quest to Conquer Cancer 2023 announcement"
  }],
  ["/Lotus/Upgrades/Skins/Clan/QTCC2024EmblemItem", {
    text: "Sent by Inbox during the 2024 Quest to Conquer Cancer campaign after logging in during the campaign window.",
    url: "https://www.warframe.com/en/news/conquista-na-batalha-contra-o-cancer-2024",
    source: "Warframe.com Quest to Conquer Cancer 2024 announcement"
  }],
  ["/Lotus/Upgrades/Skins/Operator/Tattoos/TattooTennoH", {
    text: "Sent by Inbox during the 2024 Quest to Conquer Cancer campaign.",
    url: "https://www.warframe.com/en/news/conquista-na-batalha-contra-o-cancer-2024",
    source: "Warframe.com Quest to Conquer Cancer 2024 announcement"
  }],
  ["/Lotus/Upgrades/Skins/Operator/Tattoos/TattooTennoI", {
    text: "Sent by Inbox during the 2024 Quest to Conquer Cancer campaign after logging in during the campaign window.",
    url: "https://www.warframe.com/en/news/conquista-na-batalha-contra-o-cancer-2024",
    source: "Warframe.com Quest to Conquer Cancer 2024 announcement"
  }],
  ["/Lotus/Upgrades/Skins/Festivities/PumpkinHead", {
    text: "Returned as a limited-time Nights of Naberus Day of the Dead item; available from Daughter in the Necralisk for Mother Tokens.",
    url: "https://forums.warframe.com/topic/1414770-update-37-koumei-the-five-fates/",
    source: "Warframe.com Update 37: Koumei & the Five Fates"
  }],
  ["/Lotus/Upgrades/Skins/Sigils/Switch2Sigil", {
    text: "Included in the Ambimanus Pack Inbox reward for logging into Warframe on Nintendo Switch 2 during its launch campaign; available from Varzia for Aya on other platforms.",
    url: "https://www.warframe.com/en/news/warframe-on-switch-2-available-now",
    source: "Warframe.com Warframe on Switch 2 Available Now announcement"
  }],
  ["/Lotus/Upgrades/Skins/Armor/Dex2020Armor/Dex2020ArmorCArmor", {
    text: "Part of the free Dex Raksaka Armor Set awarded for logging in during the Warframe anniversary campaign; the local export identifies this object as the set's Chest Guard.",
    url: "https://www.warframe.com/news/7-year-anniversary",
    source: "Warframe.com 7 Year Anniversary announcement + local export Dex Raksaka component record"
  }],
  ["/Lotus/Upgrades/Skins/Armor/Dex2020Armor/Dex2020ArmorLArmor", {
    text: "Part of the free Dex Raksaka Armor Set awarded for logging in during the Warframe anniversary campaign; the local export identifies this object as the set's Knee Guards.",
    url: "https://www.warframe.com/news/7-year-anniversary",
    source: "Warframe.com 7 Year Anniversary announcement + local export Dex Raksaka component record"
  }],
  ["/Lotus/Upgrades/Skins/Armor/Dex2020Armor/Dex2020ArmorAArmor", {
    text: "Part of the free Dex Raksaka Armor Set awarded for logging in during the Warframe anniversary campaign; the local export identifies this object as the set's Shoulder Guards.",
    url: "https://www.warframe.com/news/7-year-anniversary",
    source: "Warframe.com 7 Year Anniversary announcement + local export Dex Raksaka component record"
  }],
  ["/Lotus/Upgrades/Skins/Kubrows/Armor/NightwaveSeason5HarkaKubrowArmor", {
    text: "Nightwave: Nora's Mix Volume 5 reward; it has also returned in later Nightwave Cred rotations.",
    url: "https://www.warframe.com/th/amp/nightwave-noras-mix-vol-5",
    source: "Warframe.com Nightwave: Nora's Mix Volume 5 announcement"
  }],
  ["/Lotus/Upgrades/Skins/DexTheSecond/ObsidianDexDakra", {
    text: "PlayStation anniversary reward: available from the in-game Market for 1 Credit during the scheduled anniversary week.",
    url: "https://www.warframe.com/th/news/playstation-anniversary",
    source: "Warframe.com PlayStation Anniversary announcement"
  }],
  ["/Lotus/Upgrades/Skins/Sony/ObsidianDexFuris", {
    text: "PlayStation anniversary reward: available from the in-game Market for 1 Credit during the scheduled anniversary week.",
    url: "https://www.warframe.com/th/news/playstation-anniversary",
    source: "Warframe.com PlayStation Anniversary announcement"
  }],
  ["/Lotus/Upgrades/Skins/Weapons/GreatSword/PS4BallasSword", {
    text: "PlayStation anniversary reward: available from the in-game Market for 1 Credit during the scheduled anniversary week.",
    url: "https://www.warframe.com/th/news/playstation-anniversary",
    source: "Warframe.com PlayStation Anniversary announcement"
  }],
  ["/Lotus/Upgrades/Skins/DexTheSecond/NintendoDexDakra", {
    text: "Nintendo Switch anniversary Alert reward; the official schedule listed it as Alert #2 with 10,000 Credits.",
    url: "https://www.warframe.com/en/news/2-ko",
    source: "Warframe.com 2 Year Anniversary on Nintendo Switch announcement"
  }],
  ["/Lotus/Upgrades/Skins/Weapons/GreatSword/SWIBallasSword", {
    text: "Included in the Nintendo Switch anniversary Inbox rewards; the announcement lists the Paracesis Opal Skin as a free login reward.",
    url: "https://www.warframe.com/en/news/2-ko",
    source: "Warframe.com 2 Year Anniversary on Nintendo Switch announcement"
  }],
  ["/Lotus/Upgrades/Skins/Scarves/NintendoTurtleNeckScarf", {
    text: "Nintendo Switch anniversary Alert reward; the official schedule listed it as Alert #3 with 10,000 Credits.",
    url: "https://www.warframe.com/en/news/2-ko",
    source: "Warframe.com 2 Year Anniversary on Nintendo Switch announcement"
  }],
  ["/Lotus/Upgrades/Skins/Armor/Sony/OAArmorC", {
    text: "Included in the PlayStation-exclusive Renown Pack XII, which granted the Obsidian Azura Armor set and 170 Platinum.",
    url: "https://www.warframe.com/en/news/renown-pack-xii-available-now",
    source: "Warframe.com Renown Pack XII announcement + local export Obsidian Azura armor component record"
  }],
  ["/Lotus/Upgrades/Skins/Armor/Sony/OAArmorL", {
    text: "Included in the PlayStation-exclusive Renown Pack XII, which granted the Obsidian Azura Armor set and 170 Platinum.",
    url: "https://www.warframe.com/en/news/renown-pack-xii-available-now",
    source: "Warframe.com Renown Pack XII announcement + local export Obsidian Azura armor component record"
  }],
  ["/Lotus/Upgrades/Skins/Armor/Sony/OAArmorA", {
    text: "Included in the PlayStation-exclusive Renown Pack XII, which granted the Obsidian Azura Armor set and 170 Platinum.",
    url: "https://www.warframe.com/en/news/renown-pack-xii-available-now",
    source: "Warframe.com Renown Pack XII announcement + local export Obsidian Azura armor component record"
  }],
  ["/Lotus/Upgrades/Skins/Armor/PrimeLavosArmor/PrimeLavosArmorC", {
    text: "Nimandi Prime armor piece included through Lavos Prime Access; the local export identifies this object as the Chest Plate.",
    url: "https://wiki.warframe.com/w/Armor_%28Cosmetic%29",
    source: "Warframe Wiki Armor (Cosmetic) Prime Access table + local export Nimandi Prime component record"
  }],
  ["/Lotus/Upgrades/Skins/Armor/PrimeLavosArmor/PrimeLavosArmorL", {
    text: "Nimandi Prime armor piece included through Lavos Prime Access; the local export identifies this object as the Leg Plates.",
    url: "https://wiki.warframe.com/w/Armor_%28Cosmetic%29",
    source: "Warframe Wiki Armor (Cosmetic) Prime Access table + local export Nimandi Prime component record"
  }],
  ["/Lotus/Upgrades/Skins/Armor/PrimeLavosArmor/PrimeLavosArmorA", {
    text: "Nimandi Prime armor piece included through Lavos Prime Access; the local export identifies this object as the Shoulder Plates.",
    url: "https://wiki.warframe.com/w/Armor_%28Cosmetic%29",
    source: "Warframe Wiki Armor (Cosmetic) Prime Access table + local export Nimandi Prime component record"
  }],
  ["/Lotus/Upgrades/Skins/Runner/GaussPrimeHelmet", {
    text: "Gauss Prime Access accessory: the Gauss Prime Blazargaze Helmet was included in the Prime Accessories package and is a Prime Access bonus item.",
    url: "https://www.warframe.com/en/news/gauss-prime-access",
    source: "Warframe.com Gauss Prime Access announcement"
  }],
  ["/Lotus/Upgrades/Skins/Alchemist/LavosPrimeSkin", {
    text: "Default Prime appearance associated with Lavos Prime; acquire Lavos Prime through Prime Access or by earning and opening its Void Relics.",
    url: "https://www.warframe.com/en/news/prime-access-de-lavos",
    source: "Warframe.com Lavos Prime Access announcement + local export Lavos Prime skin record"
  }],
  ["/Lotus/Upgrades/Skins/Wisp/WispPrimeDefaultCape", {
    text: "Default Prime Shroud associated with Wisp Prime; acquire Wisp Prime through Prime Access or by earning and opening its Void Relics.",
    url: "https://www.warframe.com/en/news/accesso-wisp-prime",
    source: "Warframe.com Wisp Prime Access announcement + local export Wisp Prime default cape record"
  }],
  ["/Lotus/Upgrades/Skins/Yareli/YareliPrimeSkin", {
    text: "Default Prime appearance associated with Yareli Prime; acquire Yareli Prime through Prime Access or by earning and opening its Void Relics.",
    url: "https://www.warframe.com/en/news/accesso-yareli-prime",
    source: "Warframe.com Yareli Prime Access announcement + local export Yareli Prime skin record"
  }],
  ["/Lotus/Upgrades/Skins/Sentinels/Wings/IctusPrimeWingsRight", {
    text: "Included in the Ictus Prime Sentinel Accessories package, available through the Banshee & Mirage Prime Vault accessories packs.",
    url: "https://www.warframe.com/news/banshee-and-mirage-prime-vault-ru",
    source: "Warframe.com Banshee and Mirage Prime Vault announcement"
  }],
  ["/Lotus/Upgrades/Skins/Wraith/SevagothPrimeShadowClawsSkin", {
    text: "Prime Shadow Claws appearance associated with Sevagoth Prime; acquire Sevagoth Prime through Prime Access or by earning and opening its Void Relics.",
    url: "https://www.warframe.com/fr/patch-notes/psn/36-1-0",
    source: "Warframe.com Update 36.1: The Lotus Eaters + local export Shadow Claws Prime skin record"
  }],
  ["/Lotus/Upgrades/Skins/Clan/TenYearAnniversaryBadgeItem", {
    text: "Recall Ten-Zero reward: complete every mission in at least three of the five weekly Alert weeks.",
    url: "https://www.warframe.com/en/news/countdown-zur-tennocon-2023",
    source: "Warframe.com Countdown to TennoCon 2023 announcement"
  }],
  ["/Lotus/Upgrades/Skins/Clan/Tennogen10YearBadgeItem", {
    text: "Free Inbox reward during the TennoGen 10 Year Anniversary celebration; log in before December 31, 2025 at 11:59 p.m. ET.",
    url: "https://www.warframe.com/en/news/tennogen10",
    source: "Warframe.com TennoGen 10 Year Anniversary Celebration announcement"
  }],
  ["/Lotus/Upgrades/Skins/Armor/PrimeGyreArmor/PrimeGyreArmorC", {
    text: "Vanda Prime Armor Chest piece, included in the Gyre Prime Accessories Pack and Gyre Prime Access Complete Pack.",
    url: "https://www.warframe.com/en/news/gyre-prime-access",
    source: "Warframe.com Gyre Prime Access announcement + local export Vanda Prime Armor component record"
  }],
  ["/Lotus/Upgrades/Skins/Armor/PrimeGyreArmor/PrimeGyreArmorL", {
    text: "Vanda Prime Armor Leg piece, included in the Gyre Prime Accessories Pack and Gyre Prime Access Complete Pack.",
    url: "https://www.warframe.com/en/news/gyre-prime-access",
    source: "Warframe.com Gyre Prime Access announcement + local export Vanda Prime Armor component record"
  }],
  ["/Lotus/Upgrades/Skins/Armor/PrimeGyreArmor/PrimeGyreArmorA", {
    text: "Vanda Prime Armor Shoulder piece, included in the Gyre Prime Accessories Pack and Gyre Prime Access Complete Pack.",
    url: "https://www.warframe.com/en/news/gyre-prime-access",
    source: "Warframe.com Gyre Prime Access announcement + local export Vanda Prime Armor component record"
  }],
  ...[
    "/Lotus/Upgrades/Skins/Operator/BodySuits/BodySuitAdultPrimeE",
    "/Lotus/Upgrades/Skins/Operator/BodySuits/BodySuitPrimeE",
    "/Lotus/Upgrades/Skins/Operator/Leggings/LeggingsAdultPrimeE",
    "/Lotus/Upgrades/Skins/Operator/Leggings/LeggingsPrimeE",
    "/Lotus/Upgrades/Skins/Operator/Hoods/HoodAdultPrimeE",
    "/Lotus/Upgrades/Skins/Operator/Hoods/HoodPrimeE",
    "/Lotus/Upgrades/Skins/Operator/Sleeves/SleevesAdultPrimeE",
    "/Lotus/Upgrades/Skins/Operator/Sleeves/SleevesPrimeE",
    "/Lotus/Upgrades/Skins/Operator/Hoods/HoodAdultPrimeEChina",
    "/Lotus/Upgrades/Skins/Operator/Hoods/HoodPrimeEChina"
  ].map((uniqueName) => [uniqueName, {
    text: "Necra Prime Operator/Drifter Suit component, included in the Xaku Prime Accessories Pack and Xaku Prime Access Complete Pack.",
    url: "https://www.warframe.com/en/news/xaku-prime-access",
    source: "Warframe.com Xaku Prime Access announcement + local export Necra Prime component record"
  }]),
  ...[
    "/Lotus/Upgrades/Skins/Operator/Leggings/LeggingsAdultPrimeF",
    "/Lotus/Upgrades/Skins/Operator/Leggings/LeggingsPrimeF",
    "/Lotus/Upgrades/Skins/Operator/Hoods/HoodAdultPrimeF",
    "/Lotus/Upgrades/Skins/Operator/Hoods/HoodPrimeF",
    "/Lotus/Upgrades/Skins/Operator/BodySuits/BodySuitAdultPrimeF",
    "/Lotus/Upgrades/Skins/Operator/BodySuits/BodySuitPrimeF",
    "/Lotus/Upgrades/Skins/Operator/Sleeves/SleevesAdultPrimeF",
    "/Lotus/Upgrades/Skins/Operator/Sleeves/SleevesPrimeF"
  ].map((uniqueName) => [uniqueName, {
    text: "Tauron Prime Regalia component, included in the Caliban Prime Accessories Pack and Caliban Prime Access Complete Pack.",
    url: "https://www.warframe.com/en/news/caliban-prime-access-ko",
    source: "Warframe.com Caliban Prime Access announcement + local export Tauron Prime component record"
  }]),
  ["/Lotus/Upgrades/Skins/Sentinels/Wings/OrokinWingsRight", {
    text: "Included in the Summus Prime Sentinel Accessories package, offered through Loki Prime Access and later Prime Vault/Prime Resurgence accessory packs.",
    url: "https://www.warframe.com/en/news/prime-resurgence-rotation-4",
    source: "Warframe.com Prime Resurgence Rotation 4 and Loki Prime Access announcements"
  }],
  ["/Lotus/Upgrades/Skins/Sentinels/Wings/PrimeSentinelWingsRight", {
    text: "Included in the Unda Prime Sentinel Accessories package, offered through Ash Prime Access and later Prime Vault/Prime Resurgence accessory packs.",
    url: "https://www.warframe.com/en/news/prime-resurgence-rotation-5",
    source: "Warframe.com Prime Resurgence Rotation 5 and Ash/Vauban Prime Vault announcement"
  }],
  ...[
    ["/Lotus/Upgrades/Skins/Armor/CorpusFencer/PS4CrpFncAArmor", "Dendra Obsidian Shoulder Guard"],
    ["/Lotus/Upgrades/Skins/Armor/CorpusFencer/PS4CrpFncLArmor", "Dendra Obsidian Leg Guard"],
    ["/Lotus/Upgrades/Skins/Archer/ObsidianIvaraHelmet", "Ivara Obsidian Helmet"],
    ["/Lotus/Upgrades/Skins/Sony/ObsidianStandardArchwingSkin", "Odonata Obsidian Skin"]
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited Ultimate Obsidian Collection for PlayStation.`,
    url: "https://www.warframe.com/en/news/ultimate-obsidian-collection",
    source: "Warframe.com Ultimate Obsidian Collection announcement + local export exact component record"
  }]),
  ...[
    ["/Lotus/Upgrades/Skins/Scarves/ObsidianAzureScarf", "Obsidian Azura Syandana"],
    ["/Lotus/Upgrades/Skins/Sony/ObsidianGalatine", "Galatine Obsidian Skin"],
    ["/Lotus/Upgrades/Skins/Excalibur/ObsidianExcaliburHelmetB", "Excalibur Obsidian Azura Helmet"]
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited Obsidian Azura Collection for PlayStation.`,
    url: "https://www.warframe.com/en/news/playstation-tenno-ready-yourselves-for-this-epic-eight-item-collection",
    source: "Warframe.com Obsidian Azura Collection announcement + local export exact component record"
  }]),
  ...[
    ["/Lotus/Upgrades/Skins/Scarves/ObsidianCrowSyandana", "Obsidian Corvus Syandana"],
    ["/Lotus/Upgrades/Skins/Sony/ObsidianNikana", "Nikana Obsidian Skin"]
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited Obsidian Corvus Collection for PlayStation.`,
    url: "https://www.warframe.com/uk/news/obsidian-corvus-collection-available-now",
    source: "Warframe.com Obsidian Corvus Collection announcement + local export exact component record"
  }]),
  ...[
    ["/Lotus/Upgrades/Skins/Sony/ObsidianGorgon", "Gorgon Obsidian Skin"],
    ["/Lotus/Upgrades/Skins/Sony/ObsidianViper", "Viper Obsidian Skin"]
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited PlayStation Renown Pack IV.`,
    url: "https://www.warframe.com/amp/renown-pack-iv-available-now",
    source: "Warframe.com Renown Pack IV announcement + local export exact component record"
  }]),
  ...[
    ["/Lotus/Upgrades/Skins/Sony/PS5OkinaSkin", "Okina Obsidian Skin"],
    ["/Lotus/Upgrades/Skins/Clan/PS5OkinaBadgeItem", "Okina Emblem"],
    ["/Lotus/Types/AvatarImages/Sony/AvatarImageOkinaGlyph", "Mesa Okina Glyph"]
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited PlayStation Plus Booster Pack VII.`,
    url: "https://www.warframe.com/en/news/pack-booster-playstationplus-vii",
    source: "Warframe.com PlayStation Plus Booster Pack VII announcement + local export exact component record"
  }]),
  ...[
    ["/Lotus/Upgrades/Skins/Sony/PS5TiberonSkin", "Tiberon Obsidian Skin"],
    ["/Lotus/Upgrades/Skins/Clan/DrakeRifleBadgeItem", "Tiberon Obsidian Emblem"]
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited PlayStation Plus Booster Pack VI.`,
    url: "https://www.warframe.com/en/news/playstation-plus-booster-pack-vi",
    source: "Warframe.com PlayStation Plus Booster Pack VI announcement + local export exact component record"
  }]),
  ...[
    "/Lotus/Upgrades/Skins/Operator/BodySuits/BodySuitAdultChameleon",
    "/Lotus/Upgrades/Skins/Operator/BodySuits/BodySuitChameleon",
    "/Lotus/Upgrades/Skins/Operator/Hoods/HoodAdultChameleon",
    "/Lotus/Upgrades/Skins/Operator/Hoods/HoodChameleon",
    "/Lotus/Upgrades/Skins/Operator/Leggings/LeggingsAdultChameleon",
    "/Lotus/Upgrades/Skins/Operator/Leggings/LeggingsChameleon",
    "/Lotus/Upgrades/Skins/Operator/Sleeves/SleevesAdultChameleon",
    "/Lotus/Upgrades/Skins/Operator/Sleeves/SleevesChameleon"
  ].map((uniqueName) => [uniqueName, {
    text: "Granted as part of the Operator/Drifter Voidshell Sets when completing The Angels of the Zariman quest; the quest requires completion of The New War.",
    url: "https://wiki.warframe.com/w/Angels_of_the_Zariman",
    source: "Warframe Wiki Angels of the Zariman quest rewards + local export exact Voidshell component record"
  }]),
  ...[
    ["/Lotus/Upgrades/Skins/Sony/ObsidianColtekMask", "Obsidian Coltek Sentinel Mask"],
    ["/Lotus/Upgrades/Skins/Sony/ObsidianHelios", "Helios Obsidian Skin"],
    ["/Lotus/Upgrades/Skins/Sony/ObsidianWyrm", "Wyrm Obsidian Skin"]
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited PlayStation Renown Pack V.`,
    url: "https://www.warframe.com/uk/news/renown-pack-v-available-now",
    source: "Warframe.com Renown Pack V announcement + local export exact component record"
  }]),
  ...[
    ["/Lotus/Upgrades/Skins/Sony/ObsidianSilvaAndAegis", "Silva & Aegis Obsidian Skin"],
    ["/Lotus/Upgrades/Skins/Scarves/PS4ArmScarf", "Yomo Obsidian Syandana"]
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited PlayStation Renown Collection.`,
    url: "https://www.warframe.com/uk/news/renown-collection",
    source: "Warframe.com Renown Collection announcement + local export exact component record"
  }]),
  ["/Lotus/Upgrades/Skins/Frumentarius/FrumentariusSkin", {
    text: "Default Cyte-09 appearance; acquire Cyte-09\u2019s blueprint from The Hex quest, with component blueprints from H\xF6llvania Central Mall Bounties or Amir of The Hex for Standing, then build Cyte-09 in the Foundry.",
    url: "https://wiki.warframe.com/w/Cyte-09",
    source: "WARFRAME Wiki Cyte-09 acquisition + official The Hex quest reward record + local export default skin relationship"
  }],
  ...[
    ["/Lotus/Upgrades/Skins/Trapper/VaubanVoidSkin", "Vauban Phased Skin"],
    ["/Lotus/Upgrades/Skins/Trapper/VaubanVoidSkinHelmet", "Vauban Phased Helmet"],
    ["/Lotus/Upgrades/Skins/Promo/Void/TigrisVoidSkin", "Tigris Phased Skin"],
    ["/Lotus/Upgrades/Skins/Promo/Void/VastoVoidSkin", "Vasto Phased Skin"]
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was a Steam Winter Sale 2013 crafting reward; these Phased cosmetics are no longer craftable, but existing copies can be traded through Steam or bought on the Steam Community Market.`,
    url: "https://wiki.warframe.com/w/Phased_Skins",
    source: "WARFRAME Wiki Phased Skins acquisition record + local export exact component record"
  }]),
  ["/Lotus/Upgrades/Skins/Events/BlackoutOrthos", {
    text: "Unreleased Phased Orthos Skin; the Wiki records no acquisition route.",
    url: "https://wiki.warframe.com/w/Phased_Skins",
    source: "WARFRAME Wiki Phased Skins unreleased-item record + local export exact object"
  }],
  ["/Lotus/Upgrades/Skins/Motorcycle/MotorcycleNightwaveSkin", {
    text: "Nightwave reward from Nora\u2019s Mix Volume 8; earn Acts to rank up and claim it from the reward track.",
    url: "https://www.warframe.com/en/news/nightwave-noras-mix-vol-8",
    source: "Warframe.com Nora\u2019s Mix Volume 8 reward list + local export exact livery record"
  }],
  ["/Lotus/Upgrades/Skins/Halloween/DOTD2025OperatorMask", {
    text: "Nightwave reward from Nora\u2019s Mix: Dreams of the Dead; earn Acts to rank up and claim the Kayota Day of the Dead Mask.",
    url: "https://www.warframe.com/en/news/nightwave-dreams-of-the-dead-arrives-october-27",
    source: "Warframe.com Dreams of the Dead reward list + local export exact mask record"
  }],
  ["/Lotus/Upgrades/Skins/Halloween/DOTD2025TaxonSkin", {
    text: "Nightwave reward from Nora\u2019s Mix: Dreams of the Dead; earn Acts to rank up and claim the Taxon Day of the Dead Skin.",
    url: "https://www.warframe.com/en/news/nightwave-dreams-of-the-dead-arrives-october-27",
    source: "Warframe.com Dreams of the Dead reward list + local export exact Taxon skin record"
  }],
  ["/Lotus/Upgrades/Skins/Catbrows/Armor/VermillionKavatArmor", {
    text: "Nightwave reward from Nora\u2019s Mix Volume 5, and a returning reward in Nora\u2019s Mix: Dreams of the Dead; earn Acts and claim it from the Nightwave reward track.",
    url: "https://www.warframe.com/th/amp/nightwave-noras-mix-vol-5",
    source: "Warframe.com Nora\u2019s Mix Volume 5 and Dreams of the Dead reward lists + local export exact armor record"
  }],
  ["/Lotus/Types/Items/PhotoBooth/JadeShadows/PhotoboothTileStalkerCave", {
    text: "Granted by Hunhow in the Inbox after completing The Jade Shadows quest.",
    url: "https://wiki.warframe.com/w/Jade_Shadows",
    source: "WARFRAME Wiki Jade Shadows quest rewards + local export exact Captura scene record"
  }],
  ["/Lotus/Types/Items/MiscItems/PhotoboothTilePurgatory", {
    text: "Granted as a reward for completing The Deadlock Protocol quest; the scene depicts the Granum Void.",
    url: "https://wiki.warframe.com/w/The_Deadlock_Protocol/Transcript",
    source: "WARFRAME Wiki Deadlock Protocol record + local export exact Captura scene record"
  }],
  ["/Lotus/Types/Items/PhotoBooth/CinematicTiles/YareliPrimeEndPose", {
    text: "Automatically granted when you craft or purchase Yareli Prime; this Captura scene is exclusive to Yareli Prime.",
    url: "https://www.warframe.com/de/patch-notes/pc/40-0-0",
    source: "Warframe.com The Vallis Undermind update notes + local export exact Captura scene record"
  }],
  ["/Lotus/Upgrades/Skins/Sigils/BossSigilNefAnyo", {
    text: "Awarded for defeating Nef Anyo; the Boss Sigil was added to Nef Anyo\u2019s reward inventory with the other Boss Sigils.",
    url: "https://www.warframe.com/es/patch-notes/pc/16-0-0",
    source: "Warframe.com Sanctuary update notes + local export exact Boss Sigil record"
  }],
  ["/Lotus/Upgrades/Skins/Sigils/DogDays2023ASigil", {
    text: "Awarded for completing the first Dog Days mission; during the fifth Dog Days appearance it was the first-mission reward alongside Nakak Pearls and Credits.",
    url: "https://wiki.warframe.com/w/Dog_Days",
    source: "WARFRAME Wiki Dog Days reward table + local export exact sigil record"
  }],
  ...[
    ["/Lotus/Upgrades/Skins/Armor/PS5Armor/PS5ArmorC", "Dendra Obsidian Chest Plate"],
    ["/Lotus/Upgrades/Skins/Armor/PS5Armor/PS5ArmorL", "Dendra Obsidian Knee Plates"],
    ["/Lotus/Upgrades/Skins/Armor/PS5Armor/PS5ArmorA", "Dendra Obsidian Shoulder Plates"]
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited Ultimate Obsidian Collection for PlayStation.`,
    url: "https://www.warframe.com/en/news/ultimate-obsidian-collection",
    source: "Warframe.com Ultimate Obsidian Collection announcement + local export exact component record"
  }]),
  ...[
    ["/Lotus/Upgrades/Skins/Scarves/ObsidianKyropteraScarf", "Obsidian Kyroptera Syandana"],
    ["/Lotus/Upgrades/Skins/Weapons/GreatSword/XB1BallasSword", "Paracesis Obsidian Skin"]
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was a PlayStation Anniversary reward, claimed from the in-game Market for 1 Credit during its limited-time availability.`,
    url: "https://www.warframe.com/en/news/playstation-anniversary",
    source: "Warframe.com PlayStation Anniversary reward schedule + local export exact component record"
  }]),
  ...[
    ["/Lotus/Upgrades/Skins/Sony/ObsidianSonicor", "Sonicor Obsidian Skin"],
    ["/Lotus/Upgrades/Skins/Sony/ObsidianSerro", "Serro Obsidian Skin"]
  ].map(([uniqueName, component]) => [uniqueName, {
    text: `${component} was included in the time-limited PlayStation Renown Pack XVI.`,
    url: "https://www.warframe.com/en/news/renown-pack-xvi-available-now",
    source: "Warframe.com Renown Pack XVI announcement + local export exact component record"
  }]),
  ["/Lotus/Upgrades/Skins/Sony/ObsidianGlaive", {
    text: "Formerly included in the original PlayStation Plus starter pack; the Glaive Obsidian Skin is a PlayStation-exclusive cosmetic and is no longer a current general Market route.",
    url: "https://wiki.warframe.com/w/Glaive",
    source: "WARFRAME Wiki Glaive acquisition and skin record + local export exact skin record"
  }],
  ["/Lotus/Upgrades/Skins/Motorcycle/MotorcycleOllieSkin", {
    text: "Complete Ollie\u2019s Crash Course in 1:30 or less to receive Ollie\u2019s Rocket Livery for the Atomicycle.",
    url: "https://www.warframe.com/en/patch-notes/psn/38-5-0",
    source: "Warframe.com Techrot Encore update notes + local export exact livery record"
  }],
  ["/Lotus/Types/Items/MiscItems/PhotoboothTileDeckTwelve", {
    text: "Drops from the Exploiter Orb fight in Orb Vallis; the scene is the Deck 12 Captura scene.",
    url: "https://forums.warframe.com/topic/1087343-has-anyone-acquired-the-deck-12-captura-scene-from-exploiter/",
    source: "Warframe Forums report of the in-game tooltip and Exploiter Orb route + local export exact scene record"
  }],
  ["/Lotus/Types/Items/MiscItems/PhotoboothTileDeimosHub", {
    text: "Awarded for completing the Heart of Deimos quest.",
    url: "https://www.warframe.com/en/news/deimos-captura-yarismasi",
    source: "Warframe.com Captura of Deimos announcement + local export exact scene record"
  }],
  ["/Lotus/Types/Items/MiscItems/PhotoboothTileWraithQuestArena", {
    text: "Granted in the Inbox for completing The Call of the Tempestarii quest.",
    url: "https://forums.warframe.com/topic/1260225-call-of-the-tempestari-quest-feedback/",
    source: "Warframe Forums quest reward confirmation + local export exact scene record"
  }],
  ["/Lotus/Types/Items/MiscItems/PhotoboothTileSacrificeCourtyard", {
    text: "Granted in the Inbox after completing The Sacrifice quest.",
    url: "https://wiki.warframe.com/w/The_Sacrifice",
    source: "WARFRAME Wiki The Sacrifice reward record + local export exact scene record"
  }],
  ["/Lotus/Types/Items/MiscItems/PhotoboothTileTWWTeshinEnding", {
    text: "Unlocked by completing The War Within for the first time; the scene is added to Captura and is retroactively granted to players who had already completed the quest.",
    url: "https://wiki.warframe.com/w/Captura",
    source: "WARFRAME Wiki Captura patch history + local export exact scene record"
  }],
  ["/Lotus/Types/Items/MiscItems/PhotoboothTileDrifterCamp", {
    text: "Unlocked after completing The New War quest.",
    url: "https://wiki.warframe.com/w/Captura",
    source: "WARFRAME Wiki Captura scene list + local export exact scene record"
  }],
  ["/Lotus/Types/Items/MiscItems/PhotoboothTileGasCitySpawnTwo", {
    text: "Obtained from the special violet Captura-scene locker in a solved Corpus Gas City secret room; open the symbol door by activating its consoles in sequence.",
    url: "https://wiki.warframe.com/w/Corpus_Gas_City",
    source: "WARFRAME Wiki Corpus Gas City secret-room route + local export exact scene record"
  }],
  ["/Lotus/Types/AvatarImages/FanChannel/AvatarImageBluyayogamer", {
    text: "Redeem the BLUYAYOGAMER promo code on the official Warframe website; this code awards the Bluyayogamer Glyph.",
    url: "https://www.warframe.com/en/promocode?code=BLUYAYOGAMER",
    source: "Official Warframe promo-code URL + pinned Warframe Forums creator-glyph list + WFCD exact glyph identity"
  }],
  ["/Lotus/Types/AvatarImages/FanChannel/AvatarImageBrickyOrchid", {
    text: "Redeem the BRICKY promo code on the official Warframe website; this code awards the Bricky Glyph.",
    url: "https://www.warframe.com/en/promocode?code=BRICKY",
    source: "Official Warframe promo-code URL + pinned Warframe Forums creator-glyph list identifying BrickyOrchid8 + WFCD exact glyph identity"
  }],
  ["/Lotus/Types/AvatarImages/GuardianCon2018Glyph", {
    text: "Previously awarded by redeeming the GUARDIANCON2018 promo code; the code is listed as an expired historical promotion.",
    url: "https://www.warframe.com/en/promocode?code=GUARDIANCON2018",
    source: "Pinned Warframe Forums historical promo-code list + official Warframe promo-code endpoint + WFCD exact glyph identity"
  }],
  ["/Lotus/Types/AvatarImages/AvatarImageGlyphLaborAward", {
    text: "Previously awarded by redeeming the LABOROFLOVE promo code; the code expired on January 5, 2019.",
    url: "https://www.warframe.com/en/promocode?code=LABOROFLOVE",
    source: "Pinned Warframe Forums historical promo-code list and expiration changelog + official Warframe promo-code endpoint + WFCD exact glyph identity"
  }],
  ["/Lotus/Types/AvatarImages/Community10YearAnniversaryGlyph", {
    text: "Awarded to the top 10 winners of Warframe\u2019s 10 Year Anniversary Community Showcase contest; it was part of the winner reward bundle with an emblem, sigil, and Platinum.",
    url: "https://forums.warframe.com/topic/1343026-10-year-anniversary-community-showcase-winners-announced/",
    source: "Official Warframe Forums contest-winner announcement + WFCD exact glyph identity"
  }],
  ["/Lotus/Types/AvatarImages/MesaHighNoonGlyph", {
    text: "Included in the time-limited PlayStation Plus Towsun Collection, which was available until October 12, 2022; this glyph was PlayStation-exclusive.",
    url: "https://www.warframe.com/en/news/coleccion-towsun-de-playstationplus",
    source: "Official Warframe PlayStation Plus Towsun Collection announcement + WFCD exact glyph identity"
  }],
  ["/Lotus/Types/Restoratives/Consumable/Toxins/NightCommonAntitoxin", {
    text: "Purchase the Amethyst Antitoxin blueprint from the Market for 1,500 Credits, or buy the 7,500-Credit Cicero Crisis Antidote Pack that includes it, then build it in the Foundry.",
    url: "https://wiki.warframe.com/w/Antitoxin_%28Gear%29",
    source: "Warframe Wiki Antitoxin (Gear) exact item and pack record + DE export recipe identity"
  }],
  ["/Lotus/Types/Restoratives/Consumable/Toxins/DayCommonAntitoxin", {
    text: "Purchase the Beryl Antitoxin blueprint from the Market for 1,500 Credits, or buy the 7,500-Credit Cicero Crisis Antidote Pack that includes it, then build it in the Foundry.",
    url: "https://wiki.warframe.com/w/Antitoxin_%28Gear%29",
    source: "Warframe Wiki Antitoxin (Gear) exact item and pack record + DE export recipe identity"
  }],
  ["/Lotus/Types/Restoratives/Consumable/Toxins/DayUnCommonAntitoxin", {
    text: "Purchase the Citrine Antitoxin blueprint from the Market for 1,500 Credits, or buy the 7,500-Credit Cicero Crisis Antidote Pack that includes it, then build it in the Foundry.",
    url: "https://wiki.warframe.com/w/Antitoxin_%28Gear%29",
    source: "Warframe Wiki Antitoxin (Gear) exact item and pack record + DE export recipe identity"
  }],
  ["/Lotus/Types/Restoratives/Consumable/Toxins/NightUnCommonAntitoxin", {
    text: "Purchase the Topaz Antitoxin blueprint from the Market for 1,500 Credits, or buy the 7,500-Credit Cicero Crisis Antidote Pack that includes it, then build it in the Foundry.",
    url: "https://wiki.warframe.com/w/Antitoxin_%28Gear%29",
    source: "Warframe Wiki Antitoxin (Gear) exact item and pack record + DE export recipe identity"
  }],
  ["/Lotus/Types/Restoratives/TitaniaQuest/SpecterSummonKnaveLoki", {
    text: "The Nightfall Apothic blueprint is awarded during The Silver Grove quest; build it in the Foundry to summon the Knave Specter at a Silver Grove Shrine.",
    url: "https://wiki.warframe.com/w/Sunrise_Apothic",
    source: "Warframe Wiki Apothic exact quest-acquisition statement + DE export recipe identity"
  }],
  ["/Lotus/Types/Restoratives/TitaniaQuest/SpecterSummonOrphidSaryn", {
    text: "The Twilight Apothic blueprint is awarded during The Silver Grove quest; build it in the Foundry to summon the Orphid Specter at a Silver Grove Shrine.",
    url: "https://wiki.warframe.com/w/Sunrise_Apothic",
    source: "Warframe Wiki Apothic exact quest-acquisition statement + DE export recipe identity"
  }],
  ["/Lotus/Types/Restoratives/TitaniaQuest/SpecterSummonFeyarchOberon", {
    text: "The Sunrise Apothic blueprint is awarded during The Silver Grove quest; build it in the Foundry to summon the Feyarch Specter at a Silver Grove Shrine.",
    url: "https://wiki.warframe.com/w/Sunrise_Apothic",
    source: "Warframe Wiki Apothic exact quest-acquisition statement + DE export recipe identity"
  }],
  ["/Lotus/Types/Items/MiscItems/FormaUmbra", {
    text: "Purchase the Umbra Forma blueprint from Teshin\u2019s rotating Steel Path Honors shop for 150 Steel Essence, then build it in the Foundry.",
    url: "https://wiki.warframe.com/w/Umbra_Forma",
    source: "Warframe Wiki Umbra Forma Steel Path Honors record + DE export recipe identity"
  }],
  ["/Lotus/Types/Restoratives/Consumable/Toxins/RareAntitoxin", {
    text: "Purchase the Lapis Antitoxin blueprint from the Market for 1,500 Credits, or buy the 7,500-Credit Cicero Crisis Antidote Pack that includes it, then build it in the Foundry.",
    url: "https://wiki.warframe.com/w/Antitoxin_%28Gear%29",
    source: "Warframe Wiki Antitoxin (Gear) exact item and pack record + DE export recipe identity"
  }],
  ["/Lotus/Types/Restoratives/Consumable/Toxins/SoloRareAntitoxin", {
    text: "The Vermillion Antitoxin blueprint is not included in the Cicero Crisis Antidote Pack. The Warframe Wiki records Vermillion as tradable, so obtain the blueprint or built item by trading with another player, then build it in the Foundry if you receive the blueprint.",
    url: "https://wiki.warframe.com/w/Antitoxin_%28Gear%29",
    source: "Warframe Wiki Antitoxin (Gear) exact item, pack exclusion, and tradability records + DE export recipe identity"
  }],
  ["/Lotus/Types/Keys/GolemQuest/GolemQuestKeyChainItem", {
    text: "This is the internal quest key for The Jordas Precept. Complete the Pluto\u2013Eris Junction to unlock the quest; the key is created for the quest chain rather than purchased as a normal Market item.",
    url: "https://support.warframe.com/hc/en-us/articles/218290327-Quest-Tips-Up-to-Second-Dream-Minimal-Spoilers-",
    source: "Official Warframe quest guidance for the Pluto\u2013Eris Junction unlock + DE ExportKeys/ExportRecipes exact quest-key identity"
  }],
  ["/Lotus/Upgrades/Skins/CephWepSkins/CephGaundaoSkin", {
    text: "Purchase the Guandao Synoid Skin blueprint from Nightwave Cred Offerings for 35 Cred, then build it in the Foundry.",
    url: "https://wiki.warframe.com/w/Nightwave/Offerings",
    source: "Warframe Wiki Nightwave Offerings exact item record + DE export recipe identity"
  }]
]);
var EXACT_WIKI_ITEM_ACQUISITIONS = {
  "/Lotus/Upgrades/Skins/Promo/Seasonal/TennobaumArcaPlasmorSkin": "This skin was originally available during Tennobaum 2023. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.",
  "/Lotus/Upgrades/Skins/Promo/Seasonal/TennobaumAtomosSkin": "This skin was originally available during Tennobaum 2023. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.",
  "/Lotus/Upgrades/Skins/Weapons/LongGuns/SolsticeBurston": "This skin was given out during Tennobaum 2016. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.",
  "/Lotus/Upgrades/Skins/WinterSolstice/SolsticeCorinthSkin": "This skin was given out during Tennobaum 2018. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.",
  "/Lotus/Upgrades/Skins/Promo/Seasonal/TennobaumCycronSkin": "Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.",
  "/Lotus/Upgrades/Skins/Promo/Seasonal/TennobaumDualKeresSkin": "This skin was originally available during Tennobaum 2023. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.",
  "/Lotus/Upgrades/Skins/Promo/Seasonal/TennobaumFulminSkin": "This skin was originally available during Tennobaum 2023. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.",
  "/Lotus/Upgrades/Skins/WinterSolstice/SolsticeGalatineSkin": "This skin was given out during Tennobaum 2017. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.",
  "/Lotus/Upgrades/Skins/Promo/Seasonal/TennobaumGramSkin": "This skin was originally available during Tennobaum 2023. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.",
  "/Lotus/Upgrades/Skins/WinterSolstice/SolsticeGaundaoSkin": "This skin was given out during Tennobaum 2018. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.",
  "/Lotus/Upgrades/Skins/WinterSolstice/SolsticeIgnisSkin": "This skin was given out during Tennobaum 2017. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.",
  "/Lotus/Upgrades/Skins/WinterSolstice/SolsticeLenzSkin": "This skin was given as a Gift from the Lotus from December 20 through December 31, 2019. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.",
  "/Lotus/Upgrades/Skins/Dazzle/ProvaDazzleSkin": "Its blueprint can only be acquired from Nightwave Cred Offerings for 30 Cred.",
  "/Lotus/Upgrades/Skins/Dazzle/ShockExergisSkin": "Its blueprint can only be acquired from Nightwave Cred Offerings for 30 Cred.",
  "/Lotus/Upgrades/Skins/Dazzle/ShockFalcorSkin": "Its blueprint can only be acquired from Nightwave Cred Offerings for 30 Cred.",
  "/Lotus/Upgrades/Skins/Camo/DesertGrinlokSkin": "Its blueprint can only be acquired from Nightwave Cred Offerings for 30 Cred.",
  "/Lotus/Upgrades/Skins/Dazzle/ShockPlinxSkin": "Its blueprint can only be acquired from Nightwave Cred Offerings for 30 Cred.",
  "/Lotus/Upgrades/Skins/CephWepSkins/CephPyranaSkin": "Its blueprint can only be acquired from Nightwave Cred Offerings for 35 Cred.",
  "/Lotus/Upgrades/Skins/CephWepSkins/CephRubicoSkin": "Its blueprint can only be acquired from Nightwave Cred Offerings for 35 Cred.",
  "/Lotus/Upgrades/Skins/Axe/SolsticeScindo": "This skin was given out during Tennobaum 2016. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.",
  "/Lotus/Upgrades/Skins/WinterSolstice/SolsticeTatsuSkin": "This skin was given as a Gift from the Lotus from December 20 through December 31, 2019. Its blueprint is sometimes offered in Nightwave Cred Offerings for 35 Cred.",
  "/Lotus/Types/Restoratives/OpenArchwingSummon": "Awarded upon completion of The Archwing quest. The current export recipe is retained as the legacy Foundry recipe.",
  "/Lotus/Types/Restoratives/Consumable/Cipher": "The 1x and 10x blueprints are bought from the Market Gear tab for 500 and 250,000 Credits; the reusable 100x blueprint is researched in a Dojo Tenno Lab.",
  "/Lotus/Types/Keys/DojoKey": "Upon starting or joining a Clan, the Clan Key blueprint is automatically added to the inventory and made available in the Foundry.",
  "/Lotus/Types/Restoratives/Consumable/FomorianNegator": "The reusable blueprint is available in the Market under Equipment \u2192 Gear for 5,000 Credits.",
  "/Lotus/Types/Restoratives/Consumable/RazorbackCipher": "The blueprint is sent to the player by Lotus in the event message; its Cryptographic ALU component is obtained during the Razorback event.",
  "/Lotus/Types/Restoratives/Consumable/CreditChipSmall": "The Humble Void Offering was sold in the Market under Equipment \u2192 Gear for 1,000 Credits, but was discontinued after its event ended.",
  "/Lotus/Types/Restoratives/Consumable/CreditChipMedium": "The Faithful Void Offering was sold in the Market under Equipment \u2192 Gear for 10,000 Credits, but was discontinued after its event ended.",
  "/Lotus/Types/Restoratives/Consumable/CreditChipLarge": "The Passionate Void Offering was sold in the Market under Equipment \u2192 Gear for 100,000 Credits, but was discontinued after its event ended.",
  "/Lotus/Types/Vehicles/Hoverboard/HoverboardParts/PartComponents/HoverboardInfestedB/HoverboardInfestedBDeck": "The blueprint is acquired by completing the Dead Drop K-Drive Race on the Cambion Drift; active races rotate daily.",
  "/Lotus/Types/Vehicles/Hoverboard/HoverboardParts/PartComponents/HoverboardInfestedB/HoverboardInfestedBEngine": "The blueprint is acquired by completing the Muck and Mire K-Drive Race on the Cambion Drift; active races rotate daily.",
  "/Lotus/Types/Vehicles/Hoverboard/HoverboardParts/PartComponents/HoverboardInfestedB/HoverboardInfestedBFront": "The blueprint is acquired by completing the Exocrine Flow K-Drive Race on the Cambion Drift; active races rotate daily.",
  "/Lotus/Types/Vehicles/Hoverboard/HoverboardParts/PartComponents/HoverboardInfestedB/HoverboardInfestedBJet": "The blueprint is acquired by completing the Pride Before a Fall K-Drive Race on the Cambion Drift; active races rotate daily.",
  "/Lotus/Weapons/Tenno/Bayonet/TnBayonetRifleWeapon": "Vinquibus' main and component blueprints are obtained from Roathe's Oblivion on Infernium 21 of The Descendia after The Old Peace, or purchased from Roathe in La Cath\xE9drale for Maphica."
};
for (const [uniqueName, text] of Object.entries(EXACT_WIKI_ITEM_ACQUISITIONS)) {
  const url = text.includes("Nightwave") ? "https://wiki.warframe.com/w/Nightwave/Offerings" : text.includes("K-Drive Race") ? "https://wiki.warframe.com/w/K-Drive" : text.startsWith("Vinquibus") ? "https://wiki.warframe.com/w/Vinquibus" : text.includes("Archwing Launcher") ? "https://wiki.warframe.com/w/Archwing_Launcher" : text.includes("Clan Key") ? "https://wiki.warframe.com/w/Clan_Key" : text.includes("Fomorian Disruptor") ? "https://wiki.warframe.com/w/Fomorian_Disruptor" : text.includes("Razorback") ? "https://wiki.warframe.com/w/Razorback_Cipher" : text.includes("Void Offering") ? "https://wiki.warframe.com/w/Void_Offering" : "https://wiki.warframe.com/w/Market";
  WIKI_VERIFIED_ACQUISITIONS.set(uniqueName, {
    text,
    url,
    source: "Warframe Wiki exact item-page acquisition section + DE export exact uniqueName"
  });
}
var LEGACY_ARCANE_HELMET_PATHS = [
  "/Lotus/Upgrades/Skins/Trinity/TrinityHelmetAlt",
  "/Lotus/Upgrades/Skins/Frost/FrostHelmetAlt",
  "/Lotus/Upgrades/Skins/Excalibur/ExcaliburHelmetAlt",
  "/Lotus/Upgrades/Skins/Ember/EmberHelmetAltB",
  "/Lotus/Upgrades/Skins/Asp/AspAltHelmetB",
  "/Lotus/Upgrades/Skins/Decree/DecreeAltHelmetB",
  "/Lotus/Upgrades/Skins/Mag/MagHelmetAlt",
  "/Lotus/Upgrades/Skins/Trapper/TrapperHelmetAlt",
  "/Lotus/Upgrades/Skins/Loki/LokiHelmetAlt",
  "/Lotus/Upgrades/Skins/AntiMatter/AntiAltHelmet",
  "/Lotus/Upgrades/Skins/Trapper/TrapperHelmetAltB",
  "/Lotus/Upgrades/Skins/Asp/AspAltHelmet",
  "/Lotus/Upgrades/Skins/Ninja/NinjaHelmetAltB",
  "/Lotus/Upgrades/Skins/Mag/MagHelmetAltB",
  "/Lotus/Upgrades/Skins/Jade/JadeHelmetAlt",
  "/Lotus/Upgrades/Skins/Trinity/TrinityHelmetAltB",
  "/Lotus/Upgrades/Skins/Excalibur/ExcaliburHelmetAltB",
  "/Lotus/Upgrades/Skins/Ember/EmberHelmetAlt",
  "/Lotus/Upgrades/Skins/Volt/VoltHelmetAltB",
  "/Lotus/Upgrades/Skins/Decree/DecreeAltHelmet",
  "/Lotus/Upgrades/Skins/Ninja/NinjaHelmetAlt",
  "/Lotus/Upgrades/Skins/Frost/FrostHelmetAltB",
  "/Lotus/Upgrades/Skins/Volt/VoltHelmetAlt",
  "/Lotus/Upgrades/Skins/Loki/LokiHelmetAltB",
  "/Lotus/Upgrades/Skins/Rhino/RhinoHelmetAlt",
  "/Lotus/Upgrades/Skins/Rhino/RhinoHelmetAltB",
  "/Lotus/Upgrades/Skins/Jade/JadeHelmetAltB"
];
for (const uniqueName of LEGACY_ARCANE_HELMET_PATHS) {
  WIKI_VERIFIED_ACQUISITIONS.set(uniqueName, {
    text: "This is a legacy Arcane Helmet. The Warframe Wiki records Arcane Helmets as removed from the Market and Alerts; existing copies can only be obtained by trading with another player who owns one.",
    url: "https://wiki.warframe.com/w/Category:Arcane_Helmet",
    source: "Warframe Wiki Arcane Helmet category disposition + DE export exact cosmetic identity"
  });
}
for (const [uniqueName, text, url, source] of [
  ["/Lotus/Types/Restoratives/Consumable/Eidolon/LandscapeTrapLightGear", "The export identifies Beckonsnare as a legacy conservation trap with a 500-Credit base cost, but excludes it from the Market and records no current vendor, drop, or quest route. Treat it as an owned-only legacy item.", "https://wiki.warframe.com/w/Beckonsnare", "DE ExportGear exact Beckonsnare record + Wiki exact item identity"],
  ["/Lotus/Types/Restoratives/Consumable/MacheteWomanBall", "The export identifies Scorpion Specter as a legacy, non-tradable specter item excluded from the Market. No current player-facing source is recorded; existing copies are owned-only.", "https://wiki.warframe.com/w/Scorpion_Specter", "DE ExportGear exact Scorpion Specter record + Wiki exact item identity"],
  ["/Lotus/Upgrades/Skins/Sigils/SparkSigil", "The Flickering Sigil is a legacy non-tradable sigil. The export records a 75-Platinum historical cost but excludes the exact item from the current Market; no current acquisition route is documented.", "https://wiki.warframe.com/w/Flickering_Sigil", "DE ExportCustoms exact Flickering Sigil record + Wiki exact item identity"],
  ["/Lotus/Upgrades/Skins/Clan/SolarisBadgeItem", "The Solaris Emblem is the legacy Fortuna/Solaris emblem. The export records the exact emblem as non-tradable and excluded from the current Market; no current purchase or drop route is documented.", "https://wiki.warframe.com/w/Solaris_Emblem", "DE ExportCustoms exact Solaris Emblem record + Solaris United historical emblem record"],
  ["/Lotus/Upgrades/Skins/Operator/Accessories/OperatorNefAnyoMask", "The Vox Solaris Mask is an unreleased legacy cosmetic in the export: it is non-tradable, excluded from the Market, and has no released player acquisition route.", "https://wiki.warframe.com/w/Vox_Solaris_Mask", "DE ExportCustoms exact Vox Solaris Mask record + Wiki exact item identity"],
  ["/Lotus/Upgrades/Skins/Armor/WarframeDefaults/DagathImmortalArmArmor", "This armor is included with the Dagath Immortal Skin, but the exact export record is non-tradable and excluded from the Market. The Dagath Immortal set is currently unobtainable and can only be chat-linked.", "https://wiki.warframe.com/w/Dagath_Immortal_Skin", "DE ExportCustoms exact additionalItems relationship + current cosmetic availability record"],
  ["/Lotus/Upgrades/Skins/Dagath/DagathImmortalHelmet", "This helmet is included with the Dagath Immortal Skin, but the exact export record is non-tradable and excluded from the Market. The Dagath Immortal set is currently unobtainable and can only be chat-linked.", "https://wiki.warframe.com/w/Dagath_Immortal_Skin", "DE ExportCustoms exact additionalItems relationship + current cosmetic availability record"],
  ["/Lotus/Upgrades/Skins/Dagath/DagathImmortalSkin", "The Dagath Immortal Skin includes the Dagath Immortal Armor and Helmet. The exact export record is non-tradable and excluded from the Market; the set is currently unobtainable and can only be chat-linked.", "https://wiki.warframe.com/w/Dagath_Immortal_Skin", "DE ExportCustoms exact additionalItems relationship + current cosmetic availability record"],
  ["/Lotus/Upgrades/Skins/Odalisk/ProteaImmortalHelmet", "This helmet is included with the Protea Immortal Skin, but the exact export record is non-tradable and excluded from the Market. The Protea Immortal set is currently unobtainable and can only be chat-linked.", "https://wiki.warframe.com/w/Protea_Immortal_Skin", "DE ExportCustoms exact additionalItems relationship + current cosmetic availability record"],
  ["/Lotus/Upgrades/Skins/Odalisk/ProteaImmortalSkin", "The Protea Immortal Skin includes the Protea Immortal Helmet. The exact export record is non-tradable and excluded from the Market; the set is currently unobtainable and can only be chat-linked.", "https://wiki.warframe.com/w/Protea_Immortal_Skin", "DE ExportCustoms exact additionalItems relationship + current cosmetic availability record"],
  ["/Lotus/Upgrades/Skins/Rhino/RhinoRubedoSkinHelmet", "This helmet was part of the retired Rubedo Plated Rhino Skin collection, which was distributed through Steam Trading Cards. The exact export record is non-tradable and excluded from the current Market.", "https://wiki.warframe.com/w/Third_Party_Deals_and_Rewards", "Warframe Wiki retired Rubedo Plated collection record + DE ExportCustoms exact helmet identity"],
  ["/Lotus/Upgrades/Skins/Necramech/NecramechVoidRigDefaultHelmet", "The default Voidrig helmet is included when you acquire and build a Voidrig. Complete Heart of Deimos for the Voidrig blueprints, or obtain the blueprints from the Necraloid syndicate; this exact default helmet is not a separate Market item.", "https://www.warframe.com/en/news/necramechs-guide", "Official Warframe Necramechs Guide + DE ExportCustoms exact default-helmet identity"],
  ["/Lotus/Types/AvatarImages/AvatarImageChatModerator", "Awarded to Warframe chat moderators as a role privilege; it is not a Market item or a general promo-code reward.", "https://wiki.warframe.com/w/Glyph", "Warframe Wiki exact glyph identity + role-gated Chat Moderator record"],
  ["/Lotus/Types/AvatarImages/AvatarImageLotusGuide", "Awarded to Guides of the Lotus while that volunteer program existed. The program was removed, so this glyph is no longer obtainable through a current player program.", "https://wiki.warframe.com/w/Sigils?page=2&title=Sigils", "Warframe Wiki Guides of the Lotus program disposition + WFCD exact glyph identity"],
  ["/Lotus/Types/AvatarImages/AvatarImageTennoTranslator", "Awarded to players who contributed translations for Warframe; it is a role/contribution reward, not a Market item or public promo-code reward.", "https://wiki.warframe.com/w/Sigils?page=2&title=Sigils", "Warframe Wiki translator contribution record + WFCD exact glyph identity"],
  ["/Lotus/Types/AvatarImages/FanChannel/AvatarImagePartnerUpdated", "Distributed through the Warframe Creator/Partner program to eligible creators; the exact legacy record has no universal public purchase route and is not tradable.", "https://wiki.warframe.com/w/Glyph#Creator_Glyphs", "Warframe Wiki Creator Glyphs section + WFCD exact glyph identity"],
  ["/Lotus/Types/AvatarImages/FanChannel/AvatarImagePartner", "Distributed through the Warframe Partner program to eligible creators; the exact legacy record has no universal public purchase route and is not tradable.", "https://wiki.warframe.com/w/Glyph#Creator_Glyphs", "Warframe Wiki Creator Glyphs section + WFCD exact glyph identity"],
  ["/Lotus/Types/AvatarImages/FanChannel/AvatarImagePartnerMug", "Distributed through the Warframe Partner program as a creator-glyph variant; the exact legacy record has no universal public purchase route and is not tradable.", "https://wiki.warframe.com/w/Glyph#Creator_Glyphs", "Warframe Wiki Creator Glyphs section + WFCD exact glyph identity"],
  ["/Lotus/Types/AvatarImages/FanChannel/AvatarImageWarframeFanChannel", "Distributed through the Warframe fan-channel/creator program; the exact legacy record has no universal public purchase route and is not tradable.", "https://wiki.warframe.com/w/Glyph#Creator_Glyphs", "Warframe Wiki Creator Glyphs section + WFCD exact glyph identity"],
  ["/Lotus/Types/AvatarImages/FanChannel/AvatarImageMGLblaze", "This is a creator glyph distributed through MGLblaze\u2019s Warframe Partner/Creator channel, not a normal Market item. The exact legacy record is non-tradable; creator-controlled giveaways or promo distribution are the acquisition route when available.", "https://wiki.warframe.com/w/Glyph#Creator_Glyphs", "Warframe Wiki Creator Glyphs section + WFCD exact glyph identity"],
  ["/Lotus/Types/AvatarImages/AvatarImageCreatorSnowLit", "This is a creator glyph distributed through Snowlit\u2019s Warframe Partner/Creator channel, not a normal Market item. The exact legacy record is non-tradable; creator-controlled giveaways or promo distribution are the acquisition route when available.", "https://wiki.warframe.com/w/Glyph#Creator_Glyphs", "Warframe Wiki Creator Glyphs section + WFCD exact glyph identity"],
  ["/Lotus/Types/AvatarImages/FanChannel/AvatarImageSzczebrzeszyniarz", "This is a creator glyph distributed through the named Warframe Partner/Creator channel, not a normal Market item. The exact legacy record is non-tradable; creator-controlled giveaways or promo distribution are the acquisition route when available.", "https://wiki.warframe.com/w/Glyph#Creator_Glyphs", "Warframe Wiki Creator Glyphs section + WFCD exact glyph identity"],
  ["/Lotus/Types/AvatarImages/AvatarImageCreatorWgrates", "This Lotus Symbol Glyph is a creator/fan-channel distribution record, not a normal Market item. The exact legacy record is non-tradable and its creator-controlled distribution is the acquisition route when available.", "https://wiki.warframe.com/w/Glyph#Creator_Glyphs", "Warframe Wiki Creator Glyphs section + WFCD exact glyph identity"],
  ["/Lotus/Types/AvatarImages/FanChannel/AvatarImageDesRPG", "The DesRPG Lotus Symbol Glyph was a creator glyph; the glyphs.wf partner record marks it as no longer in the game. Existing copies are legacy-owned only.", "https://glyphs.wf/", "glyphs.wf exact creator disposition + WFCD exact glyph identity"],
  ["/Lotus/Types/AvatarImages/FanChannel/AvatarImageDramakins", "This Lotus Symbol Glyph was distributed through Dramakins\u2019 Warframe Partner/Creator channel, not the Market; creator-controlled giveaways or promo distribution were the acquisition route.", "https://wiki.warframe.com/w/Glyph#Creator_Glyphs", "Warframe Wiki Creator Glyphs section + WFCD exact glyph identity"],
  ["/Lotus/Types/AvatarImages/FanChannel/AvatarImageKacchi", "This Lotus Symbol Glyph was distributed through KingKacchi\u2019s Warframe Partner/Creator channel, not the Market; creator-controlled giveaways or promo distribution were the acquisition route.", "https://wiki.warframe.com/w/Glyph#Creator_Glyphs", "Warframe Wiki Creator Glyphs section + WFCD exact glyph identity"],
  ["/Lotus/Types/AvatarImages/FanChannel/AvatarImageLovinDaTacos", "This Lotus Symbol Glyph was distributed through the named Warframe Partner/Creator channel, not the Market; creator-controlled giveaways or promo distribution were the acquisition route.", "https://wiki.warframe.com/w/Glyph#Creator_Glyphs", "Warframe Wiki Creator Glyphs section + WFCD exact glyph identity"],
  ["/Lotus/Types/AvatarImages/FanChannel/AvatarImageSenastra", "This Lotus Symbol Glyph was distributed through the named Warframe Partner/Creator channel, not the Market; creator-controlled giveaways or promo distribution were the acquisition route.", "https://wiki.warframe.com/w/Glyph#Creator_Glyphs", "Warframe Wiki Creator Glyphs section + WFCD exact glyph identity"],
  ["/Lotus/Types/AvatarImages/Factions/GlyphFactionAmalgam", "This is an internal faction glyph record for the Amalgam faction. It has no player-facing Market, drop, quest, or vendor route in the current export; existing copies are legacy-owned only.", "https://wiki.warframe.com/w/Amalgam_Glyph", "DE/WFCD exact faction-glyph identity + current export route absence"],
  ["/Lotus/Types/AvatarImages/Factions/GlyphFactionInfested", "This is an internal faction glyph record for the Infested faction. It has no player-facing Market, drop, quest, or vendor route in the current export; existing copies are legacy-owned only.", "https://wiki.warframe.com/w/Infestation_Glyph", "DE/WFCD exact faction-glyph identity + current export route absence"],
  ["/Lotus/Types/AvatarImages/Factions/GlyphFactionDeimos", "This is an internal faction glyph record for the Infested Deimos faction. It has no player-facing Market, drop, quest, or vendor route in the current export; existing copies are legacy-owned only.", "https://wiki.warframe.com/w/Infested_Deimos_Glyph", "DE/WFCD exact faction-glyph identity + current export route absence"],
  ["/Lotus/Types/AvatarImages/Factions/GlyphFactionOrokin", "This is an internal faction glyph record for the Orokin faction. It has no player-facing Market, drop, quest, or vendor route in the current export; existing copies are legacy-owned only.", "https://wiki.warframe.com/w/Orokin_Glyph", "DE/WFCD exact faction-glyph identity + current export route absence"],
  ["/Lotus/Types/AvatarImages/AvatarImageGlyphDELogo", "This Digital Extremes logo glyph is a staff/promotional record, not a normal Market item. The exact legacy record is non-tradable and has no public player acquisition route recorded.", "https://wiki.warframe.com/w/Digital_Extremes_Glyph", "DE/WFCD exact glyph identity + current export route absence"],
  ["/Lotus/Types/AvatarImages/AvatarImageChatModerator", "Awarded to Warframe chat moderators as a role privilege; it is not a Market item or a general promo-code reward.", "https://wiki.warframe.com/w/Glyph", "Warframe Wiki exact glyph identity + role-gated Chat Moderator record"],
  ["/Lotus/Types/AvatarImages/AvatarImageGamingCommunityExpoTwentyFour", "This GCX 2024 glyph is an event/promotional record, not a normal Market item. The current export and exact Wiki identity record do not expose a reusable public code or active route; existing copies are legacy-owned only.", "https://wiki.warframe.com/w/Gcx_2024_Glyph", "DE/WFCD exact GCX glyph identity + current export route absence"],
  ["/Lotus/Types/AvatarImages/AvatarImageGlyphLegendaryQuasars", "This is a legacy creator/partner glyph distributed through creator-controlled promotions rather than the Market. The exact non-tradable record has no current universal public route.", "https://wiki.warframe.com/w/Glyph#Creator_Glyphs", "Warframe Wiki Creator Glyphs section + WFCD exact glyph identity"],
  ["/Lotus/Types/AvatarImages/AvatarImageGlyphCookieBoot", "This is a legacy promotional/creator glyph, not a normal Market item. The exact non-tradable record has no current universal public code or active route.", "https://wiki.warframe.com/w/Cookie_Boot_Glyph", "WFCD exact glyph identity + current export route absence"],
  ["/Lotus/Types/AvatarImages/SavePopcornGlyph", "This is a legacy promotional glyph, not a normal Market item. The exact non-tradable record has no current universal public code or active route.", "https://wiki.warframe.com/w/Save_Popcorn_Glyph", "WFCD exact glyph identity + current export route absence"]
]) {
  WIKI_VERIFIED_ACQUISITIONS.set(uniqueName, { text, url, source });
}
var WIKI_VERIFIED_DISPOSITIONS = new Map(
  [
    "/Lotus/Upgrades/Mods/Warframe/Expert/AvatarAbilityEfficiencyModExpert",
    "/Lotus/Upgrades/Mods/Warframe/AvatarDamageResistanceStun",
    "/Lotus/Types/Restoratives/Consumable/Eidolon/LandscapeTrapLightGear",
    "/Lotus/Types/Restoratives/Consumable/MacheteWomanBall",
    "/Lotus/Upgrades/Skins/Sigils/SparkSigil",
    "/Lotus/Upgrades/Skins/Clan/SolarisBadgeItem",
    "/Lotus/Upgrades/Skins/Operator/Accessories/OperatorNefAnyoMask",
    "/Lotus/Upgrades/Skins/Armor/WarframeDefaults/DagathImmortalArmArmor",
    "/Lotus/Upgrades/Skins/Dagath/DagathImmortalHelmet",
    "/Lotus/Upgrades/Skins/Dagath/DagathImmortalSkin",
    "/Lotus/Upgrades/Skins/Odalisk/ProteaImmortalHelmet",
    "/Lotus/Upgrades/Skins/Odalisk/ProteaImmortalSkin",
    "/Lotus/Upgrades/Skins/Rhino/RhinoRubedoSkinHelmet",
    "/Lotus/Types/AvatarImages/AvatarImageChatModerator",
    "/Lotus/Types/AvatarImages/AvatarImageLotusGuide",
    "/Lotus/Types/AvatarImages/AvatarImageTennoTranslator",
    "/Lotus/Types/AvatarImages/FanChannel/AvatarImagePartnerUpdated",
    "/Lotus/Types/AvatarImages/FanChannel/AvatarImagePartner",
    "/Lotus/Types/AvatarImages/FanChannel/AvatarImagePartnerMug",
    "/Lotus/Types/AvatarImages/FanChannel/AvatarImageWarframeFanChannel",
    "/Lotus/Types/AvatarImages/FanChannel/AvatarImageBennyfits",
    "/Lotus/Types/AvatarImages/FanChannel/AvatarImageBikeman",
    "/Lotus/Types/AvatarImages/FanChannel/AvatarImageSp00nerism",
    "/Lotus/Types/AvatarImages/FanChannel/AvatarImageSummit1G",
    "/Lotus/Types/AvatarImages/FanChannel/AvatarImageMGLblaze",
    "/Lotus/Types/AvatarImages/AvatarImageCreatorSnowLit",
    "/Lotus/Types/AvatarImages/FanChannel/AvatarImageSzczebrzeszyniarz",
    "/Lotus/Types/AvatarImages/AvatarImageCreatorWgrates",
    "/Lotus/Types/AvatarImages/FanChannel/AvatarImageDesRPG",
    "/Lotus/Types/AvatarImages/FanChannel/AvatarImageDramakins",
    "/Lotus/Types/AvatarImages/FanChannel/AvatarImageKacchi",
    "/Lotus/Types/AvatarImages/FanChannel/AvatarImageLovinDaTacos",
    "/Lotus/Types/AvatarImages/FanChannel/AvatarImageSenastra",
    "/Lotus/Types/AvatarImages/Factions/GlyphFactionAmalgam",
    "/Lotus/Types/AvatarImages/Factions/GlyphFactionInfested",
    "/Lotus/Types/AvatarImages/Factions/GlyphFactionDeimos",
    "/Lotus/Types/AvatarImages/Factions/GlyphFactionOrokin",
    "/Lotus/Types/AvatarImages/AvatarImageGlyphDELogo",
    "/Lotus/Types/AvatarImages/AvatarImageGamingCommunityExpoTwentyFour",
    "/Lotus/Types/AvatarImages/AvatarImageGlyphLegendaryQuasars",
    "/Lotus/Types/AvatarImages/AvatarImageGlyphCookieBoot",
    "/Lotus/Types/AvatarImages/SavePopcornGlyph"
  ].map((uniqueName) => [uniqueName, WIKI_VERIFIED_ACQUISITIONS.get(uniqueName)])
);
for (const [uniqueName, text, url] of [
  ["/Lotus/Upgrades/Skins/Operator/Hoods/WolfHood", "Purchase the Wolf Hood blueprint from Nightwave Cred Offerings for 35 Cred, then build it in the Foundry.", "https://wiki.warframe.com/w/Operator/Customization"],
  ["/Lotus/Upgrades/Skins/Operator/Armour/Teshin/TeshinArmourBody", "Purchase the Hawk Bishamo Cuirass blueprint from Teshin\u2019s Steel Path Honors for 25 Steel Essence, then build it in the Foundry.", "https://wiki.warframe.com/w/Steel_Path"],
  ["/Lotus/Upgrades/Skins/Operator/Armour/Teshin/TeshinArmourLegs", "Purchase the Hawk Bishamo Greaves blueprint from Teshin\u2019s Steel Path Honors for 25 Steel Essence, then build it in the Foundry.", "https://wiki.warframe.com/w/Steel_Path"],
  ["/Lotus/Upgrades/Skins/Operator/Armour/Teshin/TeshinArmourHead", "Purchase the Hawk Bishamo Helmet blueprint from Teshin\u2019s Steel Path Honors for 20 Steel Essence, then build it in the Foundry.", "https://wiki.warframe.com/w/Steel_Path"],
  ["/Lotus/Upgrades/Skins/Operator/Armour/Teshin/TeshinArmourArms", "Purchase the Hawk Bishamo Pauldrons blueprint from Teshin\u2019s Steel Path Honors for 15 Steel Essence, then build it in the Foundry.", "https://wiki.warframe.com/w/Steel_Path"],
  ["/Lotus/Types/Keys/LimboQuest/LimboChassisTheorem", "Awarded during The Limbo Theorem quest; use the theorem to run the quest mission that awards the Limbo Chassis blueprint.", "https://support.warframe.com/hc/en-us/articles/360029276132-The-Limbo-Theorem-FAQ"],
  ["/Lotus/Types/Keys/LimboQuest/LimboHelmetTheorem", "Awarded during The Limbo Theorem quest; use the theorem to run the quest mission that awards the Limbo Neuroptics blueprint.", "https://support.warframe.com/hc/en-us/articles/360029276132-The-Limbo-Theorem-FAQ"],
  ["/Lotus/Types/Keys/LimboQuest/LimboSystemsTheorem", "Awarded during The Limbo Theorem quest; use the theorem to run the quest mission that awards the Limbo Systems blueprint.", "https://support.warframe.com/hc/en-us/articles/360029276132-The-Limbo-Theorem-FAQ"],
  ["/Lotus/Types/Restoratives/Consumable/StalkerBall", "The Stalker Specter blueprint was awarded at Rank 6 of Nightwave: Nora\u2019s Mix Volume 7.", "https://www.warframe.com/en/news/vol-7"],
  ["/Lotus/Types/Recipes/Components/VorBoltRemoverFakeItem", "Darvo gives the Ascaris Negator blueprint during Vor\u2019s Prize; gather its quest materials and build it in the Foundry.", "https://wiki.warframe.com/w/Ascaris_Negator"],
  ["/Lotus/Types/Restoratives/Cipher", "The 1x and 10x blueprints are bought from the Market Gear tab for 500 and 250,000 Credits; the reusable 100x blueprint is researched in a Dojo Tenno Lab.", "https://wiki.warframe.com/w/Cipher"],
  ["/Lotus/Types/Restoratives/Consumable/FomorianNegator", "The reusable blueprint is available in the Market under Equipment \u2192 Gear for 5,000 Credits.", "https://wiki.warframe.com/w/Fomorian_Disruptor"],
  ["/Lotus/Types/Restoratives/Consumable/RazorbackCipher", "Lotus sends the Razorback Cipher blueprint in the event message; its Cryptographic ALU component is obtained during the Razorback event.", "https://wiki.warframe.com/w/Razorback_Cipher"],
  ["/Lotus/Types/Restoratives/Consumable/Synthetics/FlareBlue", "Purchase the reusable Fosfor Blau blueprint from Nakak in Cetus; the required Plains resources and the offered price rotate with Nakak\u2019s daily inventory.", "https://wiki.warframe.com/w/Fosfor"],
  ["/Lotus/Types/Restoratives/Consumable/Synthetics/FlareRed", "Purchase the reusable Fosfor Rahd blueprint from Nakak in Cetus; the required Plains resources and the offered price rotate with Nakak\u2019s daily inventory.", "https://wiki.warframe.com/w/Fosfor"],
  ["/Lotus/Types/Restoratives/Consumable/InfestedIrradiatedBaitBall", "The Potent Pherliac Pods blueprint is awarded during The Jordas Precept quest; build it in the Foundry using Pherliac Pods and Argon Crystals.", "https://wiki.warframe.com/w/Pherliac_Pod?page=2"],
  ["/Lotus/Types/Vehicles/Hoverboard/HoverboardParts/PartComponents/HoverboardInfestedB/HoverboardInfestedBDeck", "The blueprint is acquired by completing the Dead Drop K-Drive Race on the Cambion Drift; active races rotate daily.", "https://wiki.warframe.com/w/K-Drive"],
  ["/Lotus/Types/Vehicles/Hoverboard/HoverboardParts/PartComponents/HoverboardInfestedB/HoverboardInfestedBEngine", "The blueprint is acquired by completing the Muck and Mire K-Drive Race on the Cambion Drift; active races rotate daily.", "https://wiki.warframe.com/w/K-Drive"],
  ["/Lotus/Types/Vehicles/Hoverboard/HoverboardParts/PartComponents/HoverboardInfestedB/HoverboardInfestedBFront", "The blueprint is acquired by completing the Exocrine Flow K-Drive Race on the Cambion Drift; active races rotate daily.", "https://wiki.warframe.com/w/K-Drive"],
  ["/Lotus/Types/Vehicles/Hoverboard/HoverboardParts/PartComponents/HoverboardInfestedB/HoverboardInfestedBJet", "The blueprint is acquired by completing the Pride Before a Fall K-Drive Race on the Cambion Drift; active races rotate daily.", "https://wiki.warframe.com/w/K-Drive"],
  ["/Lotus/Weapons/Tenno/Bayonet/TnBayonetRifleWeapon", "Vinquibus' main and component blueprints are obtained from Roathe's Oblivion on Infernium 21 of The Descendia after The Old Peace, or purchased from Roathe in La Cath\xE9drale for Maphica.", "https://wiki.warframe.com/w/Vinquibus"],
  ["/Lotus/Types/Recipes/WarframeRecipes/ChromaBeaconCComponent", "The Chroma Mark blueprint is awarded during The New Strange quest and is required to progress the Chroma synthesis sequence.", "https://wiki.warframe.com/w/The_New_Strange"],
  ["/Lotus/Types/Recipes/Weapons/WeaponParts/DaxDuviriAsymmetricalLongBowString", "The Cinta String blueprint is one of the Cinta component blueprints obtained by solving Enigma Puzzles in Duviri.", "https://wiki.warframe.com/w/Cinta"],
  ["/Lotus/Types/Recipes/Weapons/WeaponParts/TnDagathBladeWhipBlade", "The Dorrclave Blade blueprint is acquired from Dagath's Hollow in the Clan Dojo; its component blueprint requires Vainthorn from the Abyssal Zone.", "https://wiki.warframe.com/w/Dorrclave"],
  ["/Lotus/Types/Recipes/Weapons/WeaponParts/TnDagathBladeWhipHilt", "The Dorrclave Hilt blueprint is acquired from Dagath's Hollow in the Clan Dojo; its component blueprint requires Vainthorn from the Abyssal Zone.", "https://wiki.warframe.com/w/Dorrclave"],
  ["/Lotus/Types/Restoratives/Consumable/CorruptedBombardBall", "The Corrupted Bombard Specter blueprint was a limited Baro Ki\u2019Teer offering for 100 Ducats and 50,000 Credits (February 24\u201326, 2017 on PC).", "https://wiki.warframe.com/w/Specter"],
  ["/Lotus/Types/Ship/BasicUcResourceDrone", "Purchase the reusable Distilling Extractor blueprint from the in-game Market for 50,000 Credits, then build it in the Foundry.", "https://support.warframe.com/hc/en-us/articles/200492204-Extractors"],
  ["/Lotus/Types/Ship/BasicResourceDrone", "Purchase the reusable Titan Extractor blueprint from the in-game Market, then build the extractor in the Foundry.", "https://support.warframe.com/hc/en-us/articles/200492204-Extractors"],
  ["/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPowerSuit", "Purchase the desired MOA component blueprints from Legs in Fortuna for Standing, build the parts, then configure the MOA at Legs for 4,000 Credits.", "https://wiki.warframe.com/w/MOA_%28Companion%29"],
  ["/Lotus/Types/Keys/InfestedAladVQuest/AssassinateInfestedAladVKey", "The reusable Mutalist Alad V Assassinate blueprint is awarded for completing Patient Zero; build it with Mutalist Alad V Nav Coordinates to unlock the mission.", "https://wiki.warframe.com/w/Blueprints"],
  ["/Lotus/Types/Restoratives/TeamAmmoTotem", "The reusable 1x and 10x Squad Ammo Restore (Small) blueprints are purchased from the Market for 500 and 250,000 Credits.", "https://wiki.warframe.com/w/Squad_Ammo_Restore"],
  ["/Lotus/Types/Restoratives/TeamEnergyTotem", "The reusable 1x and 10x Squad Energy Restore (Small) blueprints are purchased from the Market for 500 and 250,000 Credits.", "https://wiki.warframe.com/w/Squad_Energy_Restore"],
  ["/Lotus/Types/Restoratives/TeamHealTotem", "The reusable 1x and 10x Squad Health Restore (Small) blueprints are purchased from the Market for 500 and 250,000 Credits.", "https://wiki.warframe.com/w/Squad_Health_Restore"],
  ["/Lotus/Types/Restoratives/TeamShieldTotem", "The reusable 1x and 10x Squad Shield Restore (Small) blueprints are purchased from the Market for 500 and 250,000 Credits.", "https://wiki.warframe.com/w/Squad_Shield_Restore"],
  ["/Lotus/Types/Gameplay/EntratiLab/Quest/GargoyleMiscItem", "During Operation: Gargoyle\u2019s Cry, build the Vigile Jahu Gargoyle in a Clan Dojo after Whispers in the Walls; the limited operation ended January 15, 2024.", "https://www.warframe.com/en/news/operation-gargoyles-cry"]
]) {
  WIKI_VERIFIED_ACQUISITIONS.set(uniqueName, {
    text,
    url,
    source: "Exact Warframe Wiki or official support/announcement acquisition record + DE export exact uniqueName"
  });
}

// src/lib/acquisitionInfo.js
var bundledWikiBaroIndex = new Map(Object.keys(wiki_baro_acquisition_default).map((name) => [name.toLowerCase().trim(), true]));
var bundledWikiResourceIndex = new Map(Object.entries(wiki_resources_acquisition_default).map(([name, entry]) => [name.toLowerCase().trim(), typeof entry === "string" ? { location: entry } : entry]));
var bundledWikiPageIndex = new Map(Object.entries(wiki_page_acquisition_default).map(([name, entry]) => [name.toLowerCase().trim(), entry]));
var bundledWikiDescriptionIndex = new Map(Object.entries(wiki_description_acquisition_default).map(([uniqueName, text]) => [uniqueName.replaceAll("/StoreItems/", "/"), text]));
function buildPrimeRelicDropIndex() {
  const index = /* @__PURE__ */ new Map();
  for (const [primeName, entry] of Object.entries(wiki_prime_relic_drops_default)) {
    const leaf = primeName.replace(/\s+Prime$/i, "").replace(/\s+/g, "").toLowerCase();
    for (const [partKey, partData] of Object.entries(entry.Parts || {})) {
      if (!partKey) continue;
      const normalizedPart = partKey.replace(/\s+/g, "").toLowerCase();
      const drops = Object.entries(partData.Drops || {}).map(([relicName, rarity]) => ({ relicName, rarity }));
      if (drops.length === 0) continue;
      index.set(`${leaf}|${normalizedPart}`, { drops, ducatValue: partData.DucatValue, vaulted: entry.IsVaulted, primeName });
    }
  }
  return index;
}
var primeRelicDropIndex = buildPrimeRelicDropIndex();

// src/lib/warframeUtils.js
var MAPPING_TYPES = {
  "MT_MOBILE_DEFENSE": "Mobile Defense",
  "MT_INTEL": "Spy",
  "MT_ASSASSINATION": "Assassination",
  "MT_SABOTAGE": "Sabotage",
  "MT_SURVIVAL": "Survival",
  "MT_DEFENSE": "Defense",
  "MT_EXTERMINATION": "Extermination",
  "MT_RESCUE": "Rescue",
  "MT_CAPTURE": "Capture",
  "MT_EXCAVATION": "Excavation",
  // Live worldstate sends MT_EXCAVATE for excavation fissures (the older
  // MT_EXCAVATION code still appears in node data).
  "MT_EXCAVATE": "Excavation",
  "MT_HIJACK": "Hijack",
  "MT_INTERCEPTION": "Interception",
  "MT_ARTIFACT": "Disruption",
  "Destroy": "Sabotage",
  "Survivor": "Survival",
  "Territory": "Interception",
  "Retrieval": "Recovery",
  "Mobile": "Mobile Defense",
  "Vania": "",
  "Hex": "",
  "1999": "",
  "MT_ALCHEMY": "Alchemy",
  "ALCHEMY": "Alchemy",
  "MT_CORRUPTION": "Corruption",
  "CORRUPTION": "Corruption",
  "EXCAVATE": "Excavation",
  "SURVIVAL": "Survival",
  "MT_VOID_FLOOD": "Void Flood",
  "VOID_FLOOD": "Void Flood",
  "MT_VOID_CASCADE": "Void Cascade",
  "VOID_CASCADE": "Void Cascade",
  "MT_VOID_ARMAGEDDON": "Void Armageddon",
  "VOID_ARMAGEDDON": "Void Armageddon",
  "MT_ASSAULT": "Assault",
  "ASSAULT": "Assault",
  "MT_PURSUIT": "Pursuit",
  "PURSUIT": "Pursuit",
  "MT_RUSH": "Rush",
  "RUSH": "Rush",
  // Confirmed via DropsAll.json's gameMode field for a real MT_TAU_WAR node
  // (Deimos "Recall: Hunhullus"), not guessed from the code alone.
  "MT_TAU_WAR": "The Perita Rebellion"
};

// src/contexts/MonitoringContext.jsx
import { listen as listen2 } from "@tauri-apps/api/event";

// src/lib/marketEngine.js
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
var PRICE_TTL = 24 * 60 * 60 * 1e3;
var ITEMS_TTL = 7 * 24 * 60 * 60 * 1e3;

// src/lib/notificationManager.js
var EN_NAME_TO_CODES = {};
for (const [code, enName] of Object.entries(MAPPING_TYPES)) {
  if (!enName) continue;
  if (code.startsWith("MT_") || /^[A-Z_]+$/.test(code)) {
    (EN_NAME_TO_CODES[enName.toLowerCase()] ??= []).push(code);
  }
}
var TRIGGER_DEFINITIONS = [
  {
    id: "fissure",
    label: "Void Fissure",
    labelKey: "ui.dashboard.void_fissures",
    columns: [
      {
        key: "difficulties",
        label: "Difficulty",
        labelKey: "ui.notif_mgr.col_difficulty",
        type: "multi-select",
        options: [
          { value: "normal", label: "Normal", labelKey: "ui.notif_mgr.opt_normal" },
          { value: "steel_path", label: "Steel Path", labelKey: "ui.dashboard.steel_path" }
        ]
      },
      {
        key: "tiers",
        label: "Tiers",
        labelKey: "ui.notif_mgr.col_tiers",
        type: "multi-select",
        options: [
          "Lith",
          "Meso",
          "Neo",
          "Axi",
          "Requiem",
          "Omnia"
        ].map((v) => ({ value: v, label: v }))
      },
      {
        key: "missionTypes",
        label: "Mission Types",
        labelKey: "ui.notif_mgr.col_mission_types",
        type: "multi-select",
        options: [
          "Extermination",
          "Capture",
          "Survival",
          "Defense",
          "Interception",
          "Sabotage",
          "Rescue",
          "Spy",
          "Mobile Defense",
          "Disruption",
          "Void Flood",
          "Void Cascade",
          "Void Armageddon"
        ].map((v) => ({ value: v, label: v }))
      }
    ],
    defaultConfig: { difficulties: ["normal", "steel_path"], tiers: [], missionTypes: [] }
  },
  {
    id: "arbitration",
    label: "Arbitration",
    labelKey: "ui.dashboard.arbitration",
    columns: [
      {
        key: "grades",
        label: "Grade",
        labelKey: "ui.notif_mgr.col_grade",
        type: "multi-select",
        options: [
          { value: "S", label: "S-Tier", labelKey: "ui.notif_mgr.opt_s_tier" },
          { value: "A", label: "A-Tier", labelKey: "ui.notif_mgr.opt_a_tier" },
          { value: "B", label: "B-Tier", labelKey: "ui.notif_mgr.opt_b_tier" },
          { value: "C", label: "C-Tier", labelKey: "ui.notif_mgr.opt_c_tier" },
          { value: "D", label: "D-Tier", labelKey: "ui.notif_mgr.opt_d_tier" },
          { value: "F", label: "F-Tier", labelKey: "ui.notif_mgr.opt_f_tier" }
        ]
      },
      { key: "advance", label: "Alert before (min)", labelKey: "ui.notif_mgr.col_alert_before", type: "number", default: 30 }
    ],
    defaultConfig: { grades: ["S"], advance: 30 }
  },
  {
    id: "void_traces",
    label: "Void Traces Capped",
    labelKey: "ui.notif_mgr.trig_void_traces",
    columns: [
      { key: "cooldown", label: "Cooldown (min)", labelKey: "ui.notif_mgr.col_cooldown", type: "number", default: 180 }
    ],
    defaultConfig: { cooldown: 180 }
  },
  {
    id: "chat",
    label: "Incoming Messages",
    labelKey: "ui.notif_mgr.trig_chat",
    columns: [
      { key: "", label: "Will only show notifications when Warframe is not focused.", labelKey: "ui.notif_mgr.chat_hint" }
    ],
    defaultConfig: {}
  },
  {
    id: "syndicate",
    label: "Syndicate Standing Capped",
    labelKey: "ui.notif_mgr.trig_syndicate",
    columns: [
      { key: "cooldown", label: "Cooldown (min)", labelKey: "ui.notif_mgr.col_cooldown", type: "number", default: 180 }
    ],
    defaultConfig: { cooldown: 180 }
  },
  {
    id: "syndicate_waste",
    label: "Syndicate Standing Waste",
    labelKey: "ui.notif_mgr.trig_syndicate_waste",
    columns: [
      { key: "cooldown", label: "Cooldown (min)", labelKey: "ui.notif_mgr.col_cooldown", type: "number", default: 180 }
    ],
    defaultConfig: { cooldown: 180 }
  },
  {
    id: "foundry",
    label: "Foundry Complete",
    labelKey: "ui.notif_mgr.trig_foundry",
    columns: [
      { key: "advance", label: "Notify when remaining time is (minutes)", labelKey: "ui.notif_mgr.col_advance", type: "number", default: 5 }
    ],
    defaultConfig: { advance: 5 }
  },
  {
    id: "mastery",
    label: "Mastery Progress",
    labelKey: "ui.notif_mgr.trig_mastery",
    columns: [
      { key: "threshold", label: "Threshold %", labelKey: "ui.notif_mgr.col_threshold", type: "number", default: 75 }
    ],
    defaultConfig: { threshold: 75 }
  },
  {
    id: "checklist",
    label: "Checklist Reminder",
    labelKey: "ui.notif_mgr.trig_checklist",
    columns: [
      { key: "taskFilter", label: "Tasks", labelKey: "ui.notif_mgr.col_tasks", type: "checklist-tasks", placeholder: "Filter tasks\u2026" },
      { key: "interval", label: "Interval (min)", labelKey: "ui.notif_mgr.col_interval", type: "number", default: 60 }
    ],
    defaultConfig: { taskFilter: [], interval: 60 }
  },
  {
    id: "sale",
    label: "Wishlisted Item on Sale",
    labelKey: "ui.notif_mgr.trig_sale",
    columns: [
      { key: "cooldown", label: "Cooldown (min)", labelKey: "ui.notif_mgr.col_cooldown", type: "number", default: 180 }
    ],
    defaultConfig: { cooldown: 180 }
  },
  {
    id: "bounty",
    label: "Bounty Available",
    labelKey: "ui.dashboard.bounty",
    columns: [
      {
        key: "syndicates",
        label: "Syndicate",
        labelKey: "ui.notif_mgr.col_syndicate",
        type: "multi-select",
        options: [
          { value: "ZarimanSyndicate", label: "Zariman", labelKey: "ui.dashboard.zariman" },
          { value: "EntratiLabSyndicate", label: "Cavia", labelKey: "ui.dashboard.cavia" },
          { value: "HexSyndicate", label: "Hex", labelKey: "ui.dashboard.hex" },
          { value: "CetusSyndicate", label: "Cetus", labelKey: "ui.dashboard.cetus" },
          { value: "EntratiSyndicate", label: "Deimos", labelKey: "ui.dashboard.deimos" },
          { value: "SolarisSyndicate", label: "Vallis", labelKey: "ui.dashboard.orb_vallis" }
        ]
      },
      {
        key: "missionTypes",
        label: "Mission Types",
        labelKey: "ui.notif_mgr.col_mission_types",
        type: "multi-select",
        options: [
          "Extermination",
          "Capture",
          "Survival",
          "Defense",
          "Interception",
          "Sabotage",
          "Rescue",
          "Spy",
          "Mobile Defense",
          "Disruption",
          "Void Flood",
          "Void Cascade",
          "Void Armageddon",
          "Assassination",
          "Excavation"
        ].map((v) => ({ value: v, label: v }))
      }
    ],
    defaultConfig: { syndicates: [], missionTypes: [] }
  }
];
var TRIGGER_MAP = Object.fromEntries(TRIGGER_DEFINITIONS.map((t) => [t.id, t]));

// src/lib/deLocale.js
var DE_LOCALE_KEYING = Object.freeze({
  ExportWarframes: ["ExportWarframes"],
  ExportWeapons: ["ExportWeapons"],
  ExportUpgrades: ["ExportUpgrades"],
  ExportCustoms: ["ExportCustoms"],
  ExportFlavour: ["ExportFlavour"],
  ExportResources: ["ExportResources"],
  ExportRelicArcane: ["ExportRelics", "ExportArcanes"],
  ExportGear: ["ExportGear"],
  ExportRegions: ["ExportRegions"],
  ExportSentinels: ["ExportSentinels"],
  ExportKeys: ["ExportKeys"],
  ExportDrones: ["ExportDrones"],
  ExportFusionBundles: ["ExportBundles"],
  ExportSortieRewards: ["ExportRewards"]
});

// src/contexts/MonitoringContext.jsx
import { jsx as jsx2 } from "react/jsx-runtime";
var MonitoringContext = createContext2(null);

// src/components/UI.jsx
import { ChevronUp } from "lucide-react";
import { Fragment, jsx as jsx3, jsxs } from "react/jsx-runtime";
function Card({ children, className = "", glow = false, ...props }) {
  return /* @__PURE__ */ jsx3(
    "div",
    {
      className: `
        glass-panel rounded-lg p-6
        ${glow ? "glow-hover" : ""}
        ${className}
      `,
      ...props,
      children
    }
  );
}
function Tabs({ tabs, activeTab, onChange, className = "", fullWidth = false }) {
  return /* @__PURE__ */ jsx3(
    "div",
    {
      className: `flex flex-wrap gap-1 p-1 bg-black/20 rounded-xl border border-white/5 ${className}`,
      children: tabs.map(
        (tab) => /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => onChange(tab.id),
            className: `
                px-4 py-1.5 rounded-lg text-[11px] uppercase tracking-wider transition-all duration-300 whitespace-nowrap font-sans flex items-center justify-center gap-1.5
                ${fullWidth ? "flex-1" : ""}
                ${(Array.isArray(activeTab) ? activeTab.includes(tab.id) : activeTab === tab.id) ? "bg-kronos-accent text-kronos-bg font-black shadow-[0_0_15px_rgba(var(--kronos-accent-rgb),0.4)] scale-[1.02]" : "text-kronos-dim hover:text-white hover:bg-white/5"}
              `,
            children: [
              tab.icon && /* @__PURE__ */ jsx3("img", { src: tab.icon, className: "w-5 h-5 object-contain", alt: "" }),
              tab.label
            ]
          },
          tab.id
        )
      )
    }
  );
}
function Select({ options, value, onChange, label, className = "" }) {
  const [open, setOpen] = useState3(false);
  const selected = options.find((option) => String(option.id) === String(value)) ?? options[0];
  return /* @__PURE__ */ jsxs("div", { className: `flex flex-col gap-1 ${className}`, children: [
    label && /* @__PURE__ */ jsx3("span", { className: "text-[10px] font-black text-kronos-accent uppercase tracking-widest px-1", children: label }),
    /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsxs("button", { type: "button", "aria-haspopup": "listbox", "aria-expanded": open, onClick: () => setOpen((current) => !current), className: "w-full flex items-center justify-between bg-kronos-panel/30 border border-white/5 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:glow-border transition-all cursor-pointer text-kronos-text text-left", children: [
        /* @__PURE__ */ jsx3("span", { className: "truncate", children: selected?.label ?? "" }),
        /* @__PURE__ */ jsx3("svg", { width: "10", height: "6", viewBox: "0 0 10 6", fill: "none", "aria-hidden": "true", className: "shrink-0 text-kronos-dim", children: /* @__PURE__ */ jsx3("path", { d: "M1 1L5 5L9 1", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
      ] }),
      /* @__PURE__ */ jsx3("div", { role: "listbox", "aria-label": label, className: `${open ? "absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-kronos-bg text-kronos-text shadow-2xl" : "hidden"}`, children: options.map((opt) => /* @__PURE__ */ jsx3("button", { type: "button", role: "option", "aria-selected": String(opt.id) === String(value), onClick: () => {
        onChange(opt.id);
        setOpen(false);
      }, className: "block w-full px-4 py-2 text-left text-sm font-bold text-kronos-text hover:bg-white/10 focus:bg-white/10 focus:outline-none", children: opt.label }, opt.id)) })
    ] })
  ] });
}
function Toggle({ checked, onChange, label, description }) {
  return /* @__PURE__ */ jsxs(
    "button",
    {
      role: "switch",
      "aria-checked": checked,
      onClick: () => onChange(!checked),
      className: "flex items-center justify-between w-full text-left group",
      children: [
        /* @__PURE__ */ jsxs("div", { children: [
          label && /* @__PURE__ */ jsx3("span", { className: "text-sm font-medium", children: label }),
          description && /* @__PURE__ */ jsx3("p", { className: "text-xs text-kronos-dim mt-0.5", children: description })
        ] }),
        /* @__PURE__ */ jsx3(
          "div",
          {
            className: `
          relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0
          ${checked ? "bg-kronos-accent" : "bg-white/10"}
        `,
            children: /* @__PURE__ */ jsx3(
              "span",
              {
                className: `
            absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
            ${checked ? "translate-x-5" : "translate-x-0"}
          `
              }
            )
          }
        )
      ]
    }
  );
}

// src/components/ItemImage.jsx
import { useState as useState4 } from "react";
import { jsx as jsx4 } from "react/jsx-runtime";
function ImageUnavailable({ className = "", label }) {
  return /* @__PURE__ */ jsx4(
    "div",
    {
      title: label,
      "aria-label": label,
      className: `flex items-center justify-center overflow-hidden rounded border border-dashed border-white/15 text-center text-[7px] font-bold uppercase leading-[1.05] tracking-tight text-kronos-dim/70 ${className}`,
      children: /* @__PURE__ */ jsx4("span", { className: "px-px", children: label })
    }
  );
}
function ItemImage({ src, alt = "", className = "", placeholderClassName = "", loading = "lazy", resolveFallbackSrc = null }) {
  const { t } = useUi();
  const [state, setState] = useState4({ key: src, src, phase: "loading", triedFallback: false });
  if (state.key !== src) {
    setState({ key: src, src, phase: "loading", triedFallback: false });
  }
  const currentSrc = state.key === src ? state.src : src;
  const phase = state.key === src ? state.phase : "loading";
  const handleLoad = () => {
    setState((prev) => prev.key === src ? { ...prev, phase: "loaded" } : prev);
  };
  const handleError = () => {
    setState((prev) => {
      if (prev.key !== src) return prev;
      if (!prev.triedFallback && resolveFallbackSrc) {
        const next = resolveFallbackSrc(prev.src);
        if (next && next !== prev.src) {
          return { ...prev, src: next, phase: "loading", triedFallback: true };
        }
      }
      return { ...prev, phase: "error", triedFallback: true };
    });
  };
  if (!currentSrc) {
    return /* @__PURE__ */ jsx4(ImageUnavailable, { className: placeholderClassName, label: t("ui.image_unavailable") });
  }
  if (phase === "error") {
    return /* @__PURE__ */ jsx4(ImageUnavailable, { className: placeholderClassName, label: t("ui.image_error") });
  }
  return /* @__PURE__ */ jsx4(
    "img",
    {
      src: currentSrc,
      alt,
      className: `${className} ${phase === "loading" ? "animate-pulse bg-white/5" : ""}`,
      loading,
      decoding: "async",
      onLoad: handleLoad,
      onError: handleError
    }
  );
}

// src/components/AcquisitionDrawer.jsx
import { useState as useState7, useCallback as useCallback4, useEffect as useEffect5 } from "react";
import { Info, ExternalLink, Flag } from "lucide-react";

// src/components/BugReporterModal.jsx
import React, { useState as useState5, useEffect as useEffect4 } from "react";
import { X as X2, Bug, Loader2 } from "lucide-react";
import { jsx as jsx5, jsxs as jsxs2 } from "react/jsx-runtime";

// src/contexts/WikiNavigationContext.jsx
import { createContext as createContext3, useCallback as useCallback3, useContext as useContext3, useState as useState6 } from "react";
import { jsx as jsx6 } from "react/jsx-runtime";
function isWikiUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "wiki.warframe.com";
  } catch {
    return false;
  }
}
var WikiNavigationContext = createContext3({
  openWiki: (url) => {
    if (isWikiUrl(url)) invoke2("open_url", { url }).catch(() => {
    });
  },
  pendingTarget: null,
  clearPendingTarget: () => {
  }
});

// src/components/AcquisitionDrawer.jsx
import { jsx as jsx7, jsxs as jsxs3 } from "react/jsx-runtime";

// src/preview/acquisition/PreviewAcquisitionDrawer.jsx
import { useEffect as useEffect7, useRef as useRef4, useState as useState9 } from "react";
import { Map as Map2, X as X3, ChevronDown as ChevronDown2, ExternalLink as ExternalLink2, Flag as Flag2 } from "lucide-react";

// src/components/FarmingTargetAction.jsx
import { useEffect as useEffect6, useState as useState8 } from "react";
import { Target } from "lucide-react";

// src/lib/farmingTargets/store.js
var RELATIVE_PATH = "data/user/farming-targets.json";
var CURRENT_VERSION = 2;
function emptyStore() {
  return { version: CURRENT_VERSION, targets: [], reservations: [], priorities: {} };
}
function migrateStore(store) {
  if (!store || typeof store !== "object" || !Array.isArray(store.targets)) return emptyStore();
  if (Number(store.version ?? 1) > CURRENT_VERSION) return { ...store };
  return {
    ...emptyStore(),
    ...store,
    version: CURRENT_VERSION,
    targets: store.targets.map((target) => ({
      ...target,
      status: target.status || "active",
      priority: Number.isFinite(Number(target.priority)) ? Number(target.priority) : 0,
      dueAt: target.dueAt ?? null,
      reservations: Array.isArray(target.reservations) ? target.reservations : [],
      reminders: Array.isArray(target.reminders) ? target.reminders : []
    })),
    reservations: Array.isArray(store.reservations) ? store.reservations : [],
    priorities: store.priorities && typeof store.priorities === "object" ? store.priorities : {}
  };
}
function defaultIo() {
  const injected = globalThis.__farmingTargetTestIO;
  if (injected) return { dataRoot: async () => "", ...injected };
  return {
    read: async () => invoke2("read_file_bytes", { relative: RELATIVE_PATH }),
    write: async (path, data) => invoke2("write_file", { path, data }),
    dataRoot: async () => invoke2("get_data_root_path")
  };
}
function createFarmingTargetsStore(io = {}) {
  const adapter = {
    read: (...args) => (io.read ?? defaultIo().read)(...args),
    write: (...args) => (io.write ?? defaultIo().write)(...args),
    dataRoot: (...args) => io.dataRoot ? io.dataRoot(...args) : io.read || io.write ? "" : defaultIo().dataRoot(...args)
  };
  const backedUpVersions = /* @__PURE__ */ new Set();
  let mutationQueue = Promise.resolve();
  const load = async () => {
    let raw;
    try {
      raw = new TextDecoder().decode(new Uint8Array(await adapter.read()));
    } catch (error) {
      const message = String(error?.message || error || "").toLowerCase();
      return message.includes("not found") ? emptyStore() : { ...emptyStore(), readOnlyLoadError: true, loadError: String(error?.message || error) };
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      return { ...emptyStore(), readOnlyCorrupt: true, rawText: raw, loadError: String(error.message || error) };
    }
    const version = Number(parsed?.version ?? 1);
    if (version < CURRENT_VERSION && !backedUpVersions.has(version)) {
      backedUpVersions.add(version);
      try {
        const root = adapter.dataRoot ? await adapter.dataRoot() : "";
        const timestamp = typeof io.now === "function" ? io.now() : Date.now();
        await adapter.write(`${root ? `${root}/` : ""}${RELATIVE_PATH}.bak-${timestamp}-v${version}`, new TextEncoder().encode(raw));
      } catch {
        return { ...migrateStore(parsed), readOnlyBackup: true, backupError: "Unable to create migration backup" };
      }
    }
    return migrateStore(parsed);
  };
  const save = async (store) => {
    if (store?.readOnlyCorrupt) throw new Error("Refusing to overwrite corrupt farming targets file");
    if (store?.readOnlyBackup) throw new Error("Refusing to migrate without a farming targets backup");
    if (store?.readOnlyLoadError) throw new Error("Refusing to overwrite after a failed farming targets load");
    const next = migrateStore(store);
    const root = adapter.dataRoot ? await adapter.dataRoot() : "";
    await adapter.write(`${root ? `${root}/` : ""}${RELATIVE_PATH}`, new TextEncoder().encode(JSON.stringify(next, null, 2)));
    return next;
  };
  const mutate = (mutator) => {
    const operation = mutationQueue.then(async () => {
      const current = await load();
      if (current.readOnlyCorrupt) throw new Error("Farming targets file is corrupt and read-only");
      return save(await mutator(current));
    });
    mutationQueue = operation.catch(() => {
    });
    return operation;
  };
  return { load, save, mutate, migrate: migrateStore };
}
var sharedStore = createFarmingTargetsStore();
function updateTarget(store, id2, changes) {
  const next = migrateStore(store);
  return { ...next, targets: next.targets.map((target) => target.id === id2 ? { ...target, ...changes } : target) };
}
function setTargetStatus(store, id2, status) {
  return updateTarget(store, id2, { status: status === "archived" || status === "complete" ? status : "active" });
}
function setTargetPriority(store, id2, priority) {
  return updateTarget(store, id2, { priority: Math.max(0, Math.min(5, Math.floor(Number(priority) || 0))) });
}
function setTargetDueDate(store, id2, dueAt) {
  return updateTarget(store, id2, { dueAt: dueAt || null });
}

// src/components/FarmingTargetAction.jsx
import { jsx as jsx8, jsxs as jsxs4 } from "react/jsx-runtime";

// src/preview/acquisition/PreviewAcquisitionDrawer.jsx
import { Fragment as Fragment2, jsx as jsx9, jsxs as jsxs5 } from "react/jsx-runtime";

// src/lib/farmingTargets/relicPlaces.js
var RELIC_REFINEMENTS = ["Intact", "Exceptional", "Flawless", "Radiant"];

// src/lib/farmingTargets/state.js
function validLocalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
function dueState(target, now = Date.now()) {
  if (!target?.dueAt || target.status !== "active") return "none";
  const dueDate = String(target.dueAt).slice(0, 10);
  if (!validLocalDate(dueDate)) return "none";
  const current = new Date(now);
  if (Number.isNaN(current.getTime())) return "none";
  const today = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
  return dueDate <= today ? "due" : "scheduled";
}
function targetReservationQuantity(reservations = [], itemType, targetId) {
  return Math.max(0, Number((reservations ?? []).find((entry) => entry?.itemType === itemType && entry?.targetId === targetId)?.quantity) || 0);
}

// src/screens/FarmingTargets.jsx
import { Fragment as Fragment3, jsx as jsx10, jsxs as jsxs6 } from "react/jsx-runtime";
function validLocalDate2(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
function formatCount(n) {
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}
var FARM_TABS = [
  ["all", "farming_targets.tab_all"],
  ["missions", "farming_targets.tab_missions"],
  ["enemies", "farming_targets.tab_enemies"],
  ["relics", "farming_targets.tab_relics"],
  ["vendors", "farming_targets.tab_vendors"],
  ["conclave", "farming_targets.tab_conclave"]
];
function chanceLabel(chance) {
  return chance == null ? "\u2014" : `${(Number(chance) * 100).toFixed(2)}%`;
}
function HonestyBadge({ place, t }) {
  const labels = { node: t("farming_targets.honesty_node"), "fixed-boss": t("farming_targets.honesty_boss"), "wiki-area": t("farming_targets.honesty_wiki_area"), planet: t("farming_targets.honesty_planet"), "source-only": t("farming_targets.honesty_source"), vaulted: t("farming_targets.relic_vaulted"), unknown: t("farming_targets.honesty_unknown") };
  return /* @__PURE__ */ jsx10("span", { className: "rounded-full border border-kronos-accent/30 bg-kronos-accent/10 px-2 py-0.5 text-[9px] text-kronos-accent", children: labels[place?.level] ?? labels.unknown });
}
function RelicPlaceRow({ row, total, t, onHowToGet }) {
  return /* @__PURE__ */ jsxs6("div", { className: "p-4 space-y-2", children: [
    /* @__PURE__ */ jsxs6("div", { className: "flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsx10(ChevronRight, { size: 14, className: "text-kronos-accent" }),
      /* @__PURE__ */ jsx10("strong", { className: "text-sm", children: row.place.name }),
      /* @__PURE__ */ jsx10(HonestyBadge, { place: row.place.vaulted ? { ...row.place, level: "vaulted" } : row.place, t }),
      /* @__PURE__ */ jsx10("span", { className: "ml-auto text-xs font-bold text-kronos-accent", children: t("farming_targets.covers", { count: row.coverage, total }) })
    ] }),
    /* @__PURE__ */ jsxs6("div", { className: "flex flex-wrap gap-2 text-[10px] text-kronos-dim", children: [
      /* @__PURE__ */ jsx10("span", { children: t("farming_targets.relic_owned", { count: row.place.ownedCount }) }),
      RELIC_REFINEMENTS.map((refinement) => /* @__PURE__ */ jsxs6("span", { children: [
        refinement,
        ": ",
        row.place.refinements[refinement] ?? 0
      ] }, refinement)),
      !row.place.vaulted && row.place.sources.length > 0 && /* @__PURE__ */ jsx10("button", { type: "button", onClick: () => onHowToGet(row.place.uniqueName), className: "text-kronos-accent hover:underline", children: t("farming_targets.relic_how_to_get") })
    ] }),
    /* @__PURE__ */ jsx10("div", { className: "flex flex-wrap gap-2", children: row.coveredItems.map((item) => /* @__PURE__ */ jsxs6("span", { className: "rounded-md bg-black/20 px-2 py-1 text-[10px]", children: [
      /* @__PURE__ */ jsx10("span", { className: "text-kronos-text", children: item.name }),
      RELIC_REFINEMENTS.map((refinement) => /* @__PURE__ */ jsxs6("span", { className: "ml-2 text-kronos-accent", children: [
        refinement[0],
        " ",
        item.chances[refinement] == null ? "\u2014" : `${(item.chances[refinement] * 100).toFixed(2)}%`
      ] }, refinement))
    ] }, item.itemType)) })
  ] });
}
function PreviewFarmingView({ targets, reservations, model, t, selectedTarget, setSelectedTarget, tab, setTab, minChanceOn, setMinChanceOn, minChancePct, setMinChancePct, hideDone, setHideDone, hideConclave, setHideConclave, groupPlanet, setGroupPlanet, toggle, onRemoveTarget, onQuantityChange, onTargetChange, onReserve }) {
  const target = targets.find((item) => item.id === selectedTarget) ?? targets[0];
  const effectiveTargetId = target?.id ?? null;
  const targetRows = model.ledger.filter((row) => target?.id != null && row.usedBy.some((entry) => String(entry.targetId) === String(target.id)) && (!hideDone || row.stillNeeded > 0));
  const stillNeededCount = model.ledger.filter((row) => row.stillNeeded > 0).length;
  return /* @__PURE__ */ jsxs6("div", { className: "space-y-5", "data-preview-farming-targets": true, children: [
    /* @__PURE__ */ jsx10("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-2", children: [
      [t("farming_targets.summary_targets"), targets.length],
      [t("farming_targets.summary_needed"), stillNeededCount],
      [t("farming_targets.summary_places"), model.ranked.length],
      [t("farming_targets.summary_conclave"), model.conclaveOnlyItems.length]
    ].map(([label, value]) => /* @__PURE__ */ jsxs6(Card, { className: "p-3", children: [
      /* @__PURE__ */ jsx10("p", { className: "text-[10px] uppercase text-kronos-dim", children: label }),
      /* @__PURE__ */ jsx10("p", { className: "mt-1 text-xl font-black text-kronos-accent", children: value })
    ] }, label)) }),
    /* @__PURE__ */ jsxs6(Card, { className: "p-4 space-y-3", children: [
      /* @__PURE__ */ jsx10(Tabs, { tabs: FARM_TABS.map(([id2, key]) => ({ id: id2, label: t(key) })), activeTab: tab, onChange: setTab, className: "w-fit max-w-full flex-nowrap overflow-x-auto" }),
      /* @__PURE__ */ jsxs6("div", { className: "flex flex-wrap items-center gap-x-5 gap-y-3 [&_button[role=switch]]:gap-3", children: [
        /* @__PURE__ */ jsxs6("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx10("div", { className: "shrink-0", children: /* @__PURE__ */ jsx10(Toggle, { checked: minChanceOn, onChange: setMinChanceOn, label: t("farming_targets.min_chance") }) }),
          /* @__PURE__ */ jsxs6("div", { className: "flex items-center gap-2 text-xs text-kronos-dim", children: [
            /* @__PURE__ */ jsx10("input", { type: "number", min: "0", max: "100", step: "0.5", value: minChancePct, disabled: !minChanceOn, onChange: (e) => setMinChancePct(e.target.value), "aria-label": t("farming_targets.min_chance_value"), className: "w-16 rounded bg-black/30 px-2 py-1 text-xs text-kronos-text disabled:opacity-40" }),
            /* @__PURE__ */ jsx10("span", { children: "%" }),
            minChanceOn && /* @__PURE__ */ jsx10("span", { children: t("farming_targets.min_chance_hidden", { count: model.excludedByMinChance ?? 0, percent: minChancePct }) })
          ] })
        ] }),
        /* @__PURE__ */ jsx10("div", { className: "shrink-0", children: /* @__PURE__ */ jsx10(Toggle, { checked: hideConclave, onChange: setHideConclave, label: t("farming_targets.hide_conclave") }) }),
        /* @__PURE__ */ jsx10("div", { className: "shrink-0", children: /* @__PURE__ */ jsx10(Toggle, { checked: groupPlanet, onChange: setGroupPlanet, label: t("farming_targets.group_planet") }) }),
        /* @__PURE__ */ jsx10("div", { className: "shrink-0", children: /* @__PURE__ */ jsx10(Toggle, { checked: hideDone, onChange: setHideDone, label: t("farming_targets.hide_done") }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs6("div", { className: "grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)] gap-5", children: [
      /* @__PURE__ */ jsxs6(Card, { className: "p-0 overflow-hidden", children: [
        /* @__PURE__ */ jsxs6("div", { className: "p-4 border-b border-white/5", children: [
          /* @__PURE__ */ jsx10("h2", { className: "text-sm font-black uppercase", children: t("farming_targets.farm_next") }),
          /* @__PURE__ */ jsx10("p", { className: "text-xs text-kronos-dim mt-1", children: t("farming_targets.coverage_explanation") })
        ] }),
        /* @__PURE__ */ jsxs6("div", { className: "divide-y divide-white/5", children: [
          model.ranked.length === 0 && /* @__PURE__ */ jsx10("p", { className: "p-5 text-sm text-kronos-dim", children: t("farming_targets.no_sources") }),
          model.ranked.map((row) => tab === "relics" ? /* @__PURE__ */ jsx10(RelicPlaceRow, { row, total: stillNeededCount, t, onHowToGet: toggle }, row.place.id) : /* @__PURE__ */ jsxs6("div", { className: "p-4 space-y-2", children: [
            /* @__PURE__ */ jsxs6("div", { className: "flex flex-wrap items-center gap-2", children: [
              /* @__PURE__ */ jsx10(ChevronRight, { size: 14, className: "text-kronos-accent" }),
              /* @__PURE__ */ jsx10("strong", { className: "text-sm", children: groupPlanet && row.place.planet ? row.place.planet : row.place.name }),
              /* @__PURE__ */ jsx10(HonestyBadge, { place: row.place, t }),
              row.place.pvp && /* @__PURE__ */ jsx10("span", { className: "rounded-full bg-fuchsia-400/15 px-2 py-0.5 text-[9px] text-fuchsia-300", children: t("farming_targets.pvp") }),
              /* @__PURE__ */ jsx10("span", { className: "ml-auto text-xs font-bold text-kronos-accent", children: t("farming_targets.covers", { count: row.coverage, total: stillNeededCount }) })
            ] }),
            row.reason && /* @__PURE__ */ jsx10("p", { className: "text-[10px] text-fuchsia-300", children: row.reason }),
            /* @__PURE__ */ jsx10("div", { className: "flex flex-wrap gap-2", children: row.coveredItems.flatMap((item) => (item.sources?.length ? item.sources : [item]).map((source, index) => /* @__PURE__ */ jsxs6("span", { className: "rounded-md bg-black/20 px-2 py-1 text-[10px]", children: [
              /* @__PURE__ */ jsx10("span", { className: "text-kronos-text", children: item.name }),
              " ",
              /* @__PURE__ */ jsx10("span", { className: "text-kronos-accent", children: chanceLabel(source.chance) }),
              source.rotation ? /* @__PURE__ */ jsxs6("span", { className: "text-kronos-dim", children: [
                " \xB7 Rot ",
                String(source.rotation).replace(/^Rot\s*/i, "")
              ] }) : null
            ] }, `${item.itemType}-${source.rotation ?? "base"}-${index}`))) })
          ] }, row.place.id))
        ] })
      ] }),
      /* @__PURE__ */ jsxs6(Card, { className: "p-0 overflow-hidden", children: [
        /* @__PURE__ */ jsxs6("div", { className: "p-4 border-b border-white/5", children: [
          /* @__PURE__ */ jsx10("h2", { className: "text-sm font-black uppercase", children: t("farming_targets.target_inspector") }),
          /* @__PURE__ */ jsx10(Select, { options: targets.map((item) => ({ id: item.id, label: item.name })), value: target?.id ?? "", onChange: setSelectedTarget, className: "mt-3" })
        ] }),
        /* @__PURE__ */ jsx10("div", { className: "p-4 space-y-3", children: targetRows.length ? targetRows.map((row) => {
          const contribution = row.usedBy.find((entry) => entry.targetId === effectiveTargetId);
          const places = model.ranked.filter((place) => place.coveredItems.some((item) => item.itemType === row.itemType)).slice(0, 3);
          return /* @__PURE__ */ jsxs6("div", { className: "rounded-md bg-black/20 p-2 text-xs", children: [
            /* @__PURE__ */ jsxs6("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx10(ItemImage, { src: row.image, className: "h-7 w-7 object-contain", placeholderClassName: "h-7 w-7" }),
              /* @__PURE__ */ jsx10("span", { className: "min-w-0 flex-1 truncate", children: row.name }),
              /* @__PURE__ */ jsx10("span", { className: "font-bold", children: formatCount(row.stillNeeded) })
            ] }),
            /* @__PURE__ */ jsx10("div", { className: "mt-1 text-[10px] text-kronos-dim", children: t("farming_targets.inspector_required_owned", { required: formatCount(contribution?.quantity ?? 0), owned: formatCount(row.owned), needed: formatCount(row.stillNeeded) }) }),
            places.length > 0 && /* @__PURE__ */ jsx10("div", { className: "mt-1 text-[10px] text-kronos-accent", children: places.map((place) => place.place.name).join(" \xB7 ") })
          ] }, row.itemType);
        }) : /* @__PURE__ */ jsx10("p", { className: "text-xs text-kronos-dim", children: model.targetUnresolved?.some((entry) => entry.targetId === effectiveTargetId) ? t("farming_targets.inspector_unresolved") : t("farming_targets.inspector_resolved") }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs6(Card, { className: "p-0 overflow-x-auto", children: [
      /* @__PURE__ */ jsx10("div", { className: "p-4 border-b border-white/5", children: /* @__PURE__ */ jsx10("h2", { className: "text-sm font-black uppercase", children: t("farming_targets.ledger") }) }),
      /* @__PURE__ */ jsxs6("table", { className: "w-full min-w-[860px] text-left text-xs", children: [
        /* @__PURE__ */ jsx10("thead", { className: "text-[10px] uppercase text-kronos-dim", children: /* @__PURE__ */ jsxs6("tr", { children: [
          ["item", "required", "owned", "reserved", "still_needed", "used_by", "source"].map((key) => /* @__PURE__ */ jsx10("th", { className: "px-4 py-3", children: t(`farming_targets.column_${key}`) }, key)),
          /* @__PURE__ */ jsx10("th", { className: "px-4 py-3", children: t("farming_targets.reserve") })
        ] }) }),
        /* @__PURE__ */ jsx10("tbody", { className: "divide-y divide-white/5", children: model.ledger.filter((row) => !hideDone || row.stillNeeded > 0).map((row) => /* @__PURE__ */ jsxs6("tr", { className: row.overcommitted ? "bg-red-500/10" : "", children: [
          /* @__PURE__ */ jsxs6("td", { className: "px-4 py-3 font-bold", children: [
            /* @__PURE__ */ jsxs6("span", { className: "inline-flex items-center gap-2", children: [
              /* @__PURE__ */ jsx10(ItemImage, { src: row.image, className: "h-6 w-6 object-contain", placeholderClassName: "h-6 w-6" }),
              /* @__PURE__ */ jsx10("span", { children: row.name })
            ] }),
            row.overcommitted && /* @__PURE__ */ jsx10("span", { className: "ml-2 text-[9px] text-red-300", children: t("farming_targets.overcommitted") })
          ] }),
          /* @__PURE__ */ jsx10("td", { className: "px-4 py-3", children: formatCount(row.required) }),
          /* @__PURE__ */ jsx10("td", { className: "px-4 py-3", children: formatCount(row.owned) }),
          /* @__PURE__ */ jsx10("td", { className: "px-4 py-3", children: formatCount(row.reserved) }),
          /* @__PURE__ */ jsx10("td", { className: `px-4 py-3 font-black ${row.stillNeeded ? "text-red-300" : "text-emerald-300"}`, children: formatCount(row.stillNeeded) }),
          /* @__PURE__ */ jsx10("td", { className: "px-4 py-3 text-kronos-dim", children: row.usedBy.length }),
          /* @__PURE__ */ jsx10("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx10("button", { type: "button", onClick: () => toggle(row.itemType), className: "text-kronos-accent hover:underline", children: t("farming_targets.view_sources") }) }),
          /* @__PURE__ */ jsx10("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx10("input", { "aria-label": t("farming_targets.reserve_for", { item: row.name }), type: "number", min: "0", max: row.owned, value: targetReservationQuantity(reservations, row.itemType, effectiveTargetId), onChange: (event2) => onReserve(row.itemType, Number(event2.target.value), effectiveTargetId), className: "w-16 rounded bg-black/30 px-1 py-1 text-xs" }) })
        ] }, row.itemType)) })
      ] })
    ] }),
    targets.length > 0 && /* @__PURE__ */ jsx10("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: targets.map((item) => /* @__PURE__ */ jsxs6(Card, { className: "p-3 flex flex-col gap-2", children: [
      /* @__PURE__ */ jsxs6("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx10(ItemImage, { src: item.image, className: "w-9 h-9 object-contain", placeholderClassName: "w-9 h-9" }),
        /* @__PURE__ */ jsxs6("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsx10("p", { className: "truncate text-xs font-bold", children: item.name }),
          /* @__PURE__ */ jsx10("p", { className: "text-[9px] text-kronos-dim", children: t("farming_targets.target_quantity", { count: item.quantity }) })
        ] }),
        dueState(item) === "due" && /* @__PURE__ */ jsx10("span", { className: "rounded-full bg-amber-400/15 px-2 py-1 text-[9px] text-amber-300", children: t("farming_targets.due") }),
        /* @__PURE__ */ jsx10("button", { type: "button", onClick: () => onRemoveTarget(item.id), "aria-label": t("farming_targets.remove_target"), children: /* @__PURE__ */ jsx10(Trash2, { size: 13 }) })
      ] }),
      /* @__PURE__ */ jsxs6("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx10("button", { type: "button", onClick: () => onQuantityChange(item.id, -1), "aria-label": t("farming_targets.decrease_quantity"), children: /* @__PURE__ */ jsx10(Minus, { size: 13 }) }),
        /* @__PURE__ */ jsx10("span", { className: "text-xs font-bold w-6 text-center", children: item.quantity }),
        /* @__PURE__ */ jsx10("button", { type: "button", onClick: () => onQuantityChange(item.id, 1), "aria-label": t("farming_targets.increase_quantity"), children: /* @__PURE__ */ jsx10(Plus, { size: 13 }) }),
        /* @__PURE__ */ jsxs6("label", { className: "ml-auto text-[9px] text-kronos-dim", children: [
          t("farming_targets.priority"),
          " ",
          /* @__PURE__ */ jsxs6("select", { value: item.priority ?? 0, onChange: (event2) => onTargetChange(item.id, setTargetPriority, event2.target.value), className: "rounded bg-black/30 px-1 py-1", children: [
            /* @__PURE__ */ jsx10("option", { value: "0", children: "0" }),
            /* @__PURE__ */ jsx10("option", { value: "1", children: "1" }),
            /* @__PURE__ */ jsx10("option", { value: "2", children: "2" }),
            /* @__PURE__ */ jsx10("option", { value: "3", children: "3" }),
            /* @__PURE__ */ jsx10("option", { value: "4", children: "4" }),
            /* @__PURE__ */ jsx10("option", { value: "5", children: "5" })
          ] })
        ] }),
        /* @__PURE__ */ jsx10("input", { type: "date", value: item.dueAt ? String(item.dueAt).slice(0, 10) : "", onChange: (event2) => onTargetChange(item.id, setTargetDueDate, event2.target.value === "" ? null : validLocalDate2(event2.target.value) ? event2.target.value : item.dueAt), "aria-label": t("farming_targets.due_date"), className: "rounded bg-black/30 px-1 py-1 text-[9px]" })
      ] }),
      /* @__PURE__ */ jsxs6("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxs6("button", { type: "button", onClick: () => onTargetChange(item.id, setTargetStatus, "complete"), className: "text-[9px] text-emerald-300", children: [
          /* @__PURE__ */ jsx10(CheckCircle2, { size: 12, className: "inline mr-1" }),
          t("farming_targets.complete")
        ] }),
        /* @__PURE__ */ jsxs6("button", { type: "button", onClick: () => onTargetChange(item.id, setTargetStatus, "archived"), className: "text-[9px] text-kronos-dim", children: [
          /* @__PURE__ */ jsx10(Archive, { size: 12, className: "inline mr-1" }),
          t("farming_targets.archive")
        ] })
      ] })
    ] }, item.id)) })
  ] });
}
export {
  PreviewFarmingView,
  UiContext
};
