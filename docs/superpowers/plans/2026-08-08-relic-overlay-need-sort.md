# Relic Overlay Need-Based Sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a need-aware ranking ("value still missing from parts you don't own/haven't crafted") to the relic recommend/picker overlay, alongside the existing raw ducat/plat EV sort — not replacing it.

**Architecture:** `MonitoringContext.jsx`'s `relic-picker-opened`/`relic-picker-tier` handlers already compute `evPlat`/`evDucats` per relic from raw reward values. Add a parallel `evPlatNeed`/`evDucatsNeed` computed the same way but zeroing out any reward the player already owns or has crafted (via `getRewardInventoryContext`, already used elsewhere in this file), then add a third/fourth top-5 list (`need_top` or similar) to the `relic-picker-data` payload. `RelicPickerOverlay.jsx` gets a new column for it, alongside (not replacing) the existing ducat/plat columns.

**Tech Stack:** React 18, existing `MonitoringContext`/`relicParser.js` pipeline. No Rust changes.

## Global Constraints

- GitHub issue: #83.
- This is additive: `ducat_top`/`plat_top` and their existing UI columns must remain exactly as they are today.
- Reuse `getRewardInventoryContext` for ownership/crafted status — don't reimplement it.

---

### Task 1: Compute need-adjusted EV in `MonitoringContext.jsx`

**Files:**
- Modify: `src/contexts/MonitoringContext.jsx` (the `relic-picker-opened`/`relic-picker-tier` handlers, lines ~974-1017)

**Interfaces:**
- Consumes: `getRelicEV` (existing), `getRewardInventoryContext` (existing, already imported per research), `exportData`/`inventoryData` (already in scope in this file).
- Produces: each `enriched` relic entry gains `evPlatNeed`/`evDucatsNeed` fields; the `relic-picker-data` payload gains a `need_top` array (top 5 by `evDucatsNeed`, matching the existing `ducat_top`/`plat_top` shape of `{name, era, evPlat, evDucats}` plus the new need-adjusted values).

- [ ] **Step 1: Read the full current handler before modifying it**

Read `src/contexts/MonitoringContext.jsx` lines 974-1017 in full (the exact `enriched`/`ducatTop`/`platTop` construction shown in research) to confirm the precise variable names and the `relic-picker-data` payload shape, so this task's additions slot in without disturbing the existing fields.

- [ ] **Step 2: Add need-adjusted EV computation to the `enriched` map**

```js
const enriched = relics.map((r) => {
  const sortedRewards = (r.rewards || []).map((rw) => ({ ...rw, plat: allPricesRef.current[rw.uniqueName] ?? 0 }));

  const evPlat = getRelicEV(sortedRewards, 'Intact', 1, 'plat');
  const evDucats = getRelicEV(sortedRewards, 'Intact', 1, 'ducats');

  // NEW: zero out rewards the player already owns/has crafted, then compute
  // EV again over only the "still needed" rewards - mirrors wfinfo-ng's
  // relic_recommend_watcher.py _compute_all_relic_evs() ev_need.
  const neededRewards = sortedRewards.map((rw) => {
    const ctx = getRewardInventoryContext(rw.uniqueName, inventoryData, exportDataRef.current, localeRef.current);
    const isSatisfied = ctx?.isOwned || (ctx?.craftedCount ?? 0) > 0;
    return isSatisfied ? { ...rw, plat: 0, ducats: 0 } : rw;
  });
  const evPlatNeed = getRelicEV(neededRewards, 'Intact', 1, 'plat');
  const evDucatsNeed = getRelicEV(neededRewards, 'Intact', 1, 'ducats');

  return {
    name: r.name,
    era: r.era,
    evPlat: Math.round(evPlat),
    evDucats: Math.round(evDucats),
    evPlatNeed: Math.round(evPlatNeed),
    evDucatsNeed: Math.round(evDucatsNeed),
  };
});
```

Note: zeroing a reward's `plat`/`ducats` to exclude it from EV assumes `getRelicEV` sums per-reward value weighted by drop chance (matching how `evPlat`/`evDucats` are already computed) — confirm this assumption by reading `getRelicEV` in `relicParser.js` in this step before relying on it; if it works differently (e.g. needs a reward removed from the array entirely rather than zeroed), filter `neededRewards` instead of zeroing.

- [ ] **Step 3: Add the `need_top` list and include it in the payload**

```js
const needTop = [...enriched].sort((a, b) => b.evDucatsNeed - a.evDucatsNeed).slice(0, 5);

invoke('relay_event', {
  event: 'relic-picker-data',
  payload: { ducat_top: ducatTop, plat_top: platTop, need_top: needTop, era: voidTier },
});
```

- [ ] **Step 4: Manual verification**

Run `pnpm tauri dev`, trigger a relic-picker overlay scenario (or simulate the `relic-picker-opened`/`relic-picker-tier` event manually via devtools if a live trigger isn't practical), and log the emitted `relic-picker-data` payload to confirm `need_top` is present with sensible values — specifically, confirm a relic whose only good reward you already own ranks lower in `need_top` than in `ducat_top`/`plat_top`.

- [ ] **Step 5: Commit**

```bash
git add src/contexts/MonitoringContext.jsx
git commit -m "Compute need-adjusted relic EV (evPlatNeed/evDucatsNeed) alongside raw EV"
```

---

### Task 2: Add a "need" column to the relic picker overlay UI

**Files:**
- Modify: `src/components/overlays/RelicPickerOverlay.jsx`

**Interfaces:**
- Consumes: `need_top` from the `relic-picker-data` event payload (Task 1).
- Produces: a third `Column` rendered alongside the existing ducat/plat columns.

- [ ] **Step 1: Read the full current overlay component**

Read `RelicPickerOverlay.jsx` in full — the exact `Column` component/props and how `ducat_top`/`plat_top` are currently passed to it — before adding a third column, so the new one matches existing visual/structural conventions exactly.

- [ ] **Step 2: Add the third column**

```jsx
// Wherever the existing two <Column> elements for ducat_top/plat_top are rendered, add a third:
<Column
  title="Need"
  items={relics.need_top}
  valueKey="evDucatsNeed" // or whichever value the Column component expects per its existing props, confirmed in Step 1
/>
```

Match the exact prop names/shape `Column` already expects (read in Step 1) rather than the illustrative names above if they differ.

- [ ] **Step 3: Handle the case where `need_top` is absent (older cached event data / not yet emitted)**

```jsx
{relics.need_top && <Column title="Need" items={relics.need_top} valueKey="evDucatsNeed" />}
```

- [ ] **Step 4: Build check**

Run: `pnpm exec vite build --mode production`
Expected: PASS.

- [ ] **Step 5: Manual verification**

Trigger the overlay (live or simulated per Task 1 Step 4) and visually confirm three columns render side by side without layout breakage, and the "Need" column's ranking differs sensibly from the ducat/plat columns when you already own some top-EV rewards.

- [ ] **Step 6: Commit**

```bash
git add src/components/overlays/RelicPickerOverlay.jsx
git commit -m "Add need-based column to relic picker overlay

Fixes #83"
```

---

## Self-Review

- **Spec coverage:** Issue #83 asks for need-based ranking "as an additional sort/column alongside the existing ducat/plat views, not a replacement" — Task 1 computes it additively (new fields, existing fields untouched), Task 2 adds a new column without touching the existing two. Both requirements satisfied explicitly.
- **Placeholder scan:** No TBDs. The one flagged uncertainty (Task 1 Step 2's note on `getRelicEV`'s exact zeroing-vs-filtering behavior) is an instruction to verify against real code before trusting the illustrative implementation, not a placeholder for unwritten logic.
- **Type consistency:** `need_top`'s per-item shape (`{name, era, evPlat, evDucats, evPlatNeed, evDucatsNeed}`, Task 1) is a superset of the existing `ducat_top`/`plat_top` shape, so `Column` (Task 2) can reuse its existing item-rendering logic and just point `valueKey` at the new field.
