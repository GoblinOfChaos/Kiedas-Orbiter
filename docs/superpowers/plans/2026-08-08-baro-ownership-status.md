# Baro Ki'Teer Ownership Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show an owned/unowned indicator on each item in Baro Ki'Teer's offer list, matching the pattern Equipment/Mods/Arcanes tabs already use.

**Architecture:** `worldstateParser.js`'s Baro block currently only stores a display string per offer; extend it to also retain DE's internal unique_name (`ItemType`) so offers can be matched against the same ownership data (`xpMap`/`ownedItemCounts`) that every other tab already builds from `inventoryParser.js`. `Dashboard.jsx`'s `BaroModal` then renders an owned badge per row using that match.

**Tech Stack:** React 18, existing `MonitoringContext`/`worldstateParser.js`/`inventoryParser.js` data pipeline. No Rust changes needed — this is worldstate JSON parsing + a UI rendering pass, both client-side.

## Global Constraints

- GitHub issue: #79.
- Must not change Baro's existing node/expiry/inventory data shape for any other consumer — only add fields, don't rename/remove.
- Follow the existing ownership-check pattern used elsewhere in the app (`owned: xp > 0` / presence-in-inventory-array), not a new one-off mechanism.

---

### Task 1: Confirm Baro's raw item field is (or can become) a matchable unique_name

**Files:**
- Modify: `src/lib/worldstateParser.js` (Baro Ki'Teer block, ~line 847)

**Interfaces:**
- Consumes: raw worldstate `VoidTraders[].Manifest[]` entries (each `{ItemType, PrimePrice, RegularPrice}` per DE's API).
- Produces: `voidTrader.inventory[]` entries as `{item, ducats, credits, itemType}` — `itemType` is the new field, the raw DE unique_name path string (e.g. `/Lotus/Types/...`), unchanged from what DE's API already provides in `ItemType`.

- [ ] **Step 1: Read the current Baro parsing block and confirm what `item` currently holds**

Open `src/lib/worldstateParser.js` around line 847 and read the full Baro Ki'Teer parsing block (from where `VoidTraders` is read through where `inventory` array entries get built). Confirm whether `item` is already a resolved display name (via some name-lookup call) or the raw `ItemType` path. This determines whether Step 2 needs a rename or an addition.

- [ ] **Step 2: Add `itemType` (raw unique_name) alongside the existing display `item` field**

In the object literal that builds each Baro inventory entry, add the raw `ItemType` string as a new `itemType` field, keeping the existing `item` (display name) field exactly as-is so nothing else that reads `voidTrader.inventory` breaks:

```js
inventory: manifest.map((entry) => ({
  item: resolveDisplayName(entry.ItemType), // existing display-name resolution, unchanged
  itemType: entry.ItemType,                  // NEW: raw unique_name for ownership matching
  ducats: entry.PrimePrice,
  credits: entry.RegularPrice,
}))
```

(Adjust the exact existing field names/resolution call to match what Step 1 found — this is illustrative of the addition, not a literal diff.)

- [ ] **Step 3: Manual verification**

Run the app (`pnpm tauri dev` or the built AppImage), open the Baro modal while `voidTrader` data is present (or log `worldstate.voidTrader.inventory` to the console via browser devtools), and confirm each entry now has a non-empty `itemType` string that looks like a DE unique_name path (starts with `/Lotus/...`).

- [ ] **Step 4: Commit**

```bash
git add src/lib/worldstateParser.js
git commit -m "Add raw itemType unique_name to Baro inventory entries for ownership matching"
```

---

### Task 2: Build an ownership lookup and cross-reference Baro's offers against it

**Files:**
- Modify: `src/screens/Dashboard.jsx` (`BaroModal`, lines ~1145-1179)

**Interfaces:**
- Consumes: `voidTrader.inventory[].itemType` (from Task 1), `inventoryData` (from `useMonitoring()`, already available in `Dashboard.jsx` since it's used elsewhere in the file).
- Produces: an `owned` boolean rendered per Baro offer row.

- [ ] **Step 1: Find the existing ownership-lookup pattern to reuse**

Read `src/lib/inventoryParser.js` around lines 982-984 (`xpMap`) and line 2346 (`ownedItemCounts` / `bpKey in ownedItemCounts`) to confirm the exact shape of whichever ownership map is already exposed on `inventoryData` (e.g. `inventoryData.xpMap` or an equivalent already-computed dict keyed by unique_name). If `inventoryData` doesn't already expose one of these maps directly to screens, check how Equipment/Mods/Arcanes tabs currently do their own owned-check (they must read it from somewhere) and use that exact same field.

- [ ] **Step 2: Add an `isBaroItemOwned` helper in `BaroModal`**

```jsx
const isBaroItemOwned = (itemType) => {
  if (!itemType) return false;
  // Match whichever ownership source Step 1 confirmed - e.g.:
  return (inventoryData?.xpMap?.[itemType] > 0) || !!inventoryData?.ownedItemCounts?.[itemType];
};
```

(Exact map name(s) filled in from Task 2 Step 1's findings — the check should mirror however Equipment/Mods/Arcanes determine ownership, not invent a new rule.)

- [ ] **Step 3: Render an owned indicator per row**

In the `BaroModal` item-row rendering (currently just `{item.item, item.ducats, item.credits}`), add a badge/icon before or after the item name:

```jsx
{vt.inventory.map((item) => {
  const owned = isBaroItemOwned(item.itemType);
  return (
    <div key={item.itemType || item.item} className="flex items-center justify-between ...">
      <div className="flex items-center gap-2">
        {owned && <Check size={14} className="text-kronos-accent" title="Owned" />}
        <img src={resolveAnyImage(item, EI, nameToImage)} ... />
        <span>{item.item}</span>
      </div>
      <span>{item.ducats}d / {item.credits}cr</span>
    </div>
  );
})}
```

Match the existing JSX structure/classes already in `BaroModal` rather than this illustrative skeleton — only the `owned` check + badge are new.

- [ ] **Step 4: Manual verification**

Run the app with `inventoryData` populated (real Warframe account synced) during an active or upcoming Baro visit. Confirm items you actually own show the owned badge and items you don't own don't.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Dashboard.jsx
git commit -m "Show ownership status on Baro Ki'Teer offer list"
```

---

## Self-Review

- **Spec coverage:** Issue #79 asks for "cross-reference Baro's offer list against owned inventory the same way [Equipment/Mods/Arcanes] tabs do" — Task 1 gets a matchable key, Task 2 does the cross-reference and renders it. Covered.
- **Placeholder scan:** No TBDs; the two illustrative code blocks are marked as needing confirmation against Task 1/2 Step 1 findings because the exact field names in this codebase weren't fully pinned down by research (worldstateParser's current `item` field resolution, and which exact map `inventoryData` exposes) — this is intentionally left for the implementer to confirm by reading the two cited line ranges first, not a placeholder for logic.
