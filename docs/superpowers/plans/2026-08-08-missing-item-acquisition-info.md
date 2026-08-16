# Missing-Item + Acquisition Info Across Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing "how do I get this" tooltip pattern (currently only wired into Inventory's Foundry ingredient panel) to Rivens and Mods tabs, and port wfinfo-ng's acquisition-override JSON for non-drop items (vendor/clan-research/quest items) so items with no drop-table source still show correct acquisition text.

**Architecture:** `dropsParser.js`'s `buildDropIndex`/`getDropSources` already produces per-item drop-table sources and is already wired into a `Tooltip` component in `Inventory.jsx`'s Foundry panel — that `Tooltip` + lookup pattern is the one consistent mechanism to extend, not invent a new one per tab. For items with no drop-table entry (vendor purchases, clan research, quest rewards — wfinfo-ng handled these via a hand-curated override JSON), port `component_acquisition_overrides.json`/`mod_acquisition_overrides.json` as a fallback data source layered on top of `dropIndex`.

**Tech Stack:** React 18, existing `dropsParser.js`/`Tooltip` component. No Rust changes — this is client-side data + rendering.

## Global Constraints

- GitHub issue: #80.
- Per the issue's explicit ask: this needs "a proper brainstorming session... to decide the best UI pattern for surfacing acquisition info consistently across tabs, rather than solving it differently per tab" — this plan's Task 1 is that decision (documented, not a separate meeting), and it must be genuinely reused verbatim in Tasks 2 and 3, not re-derived per tab.
- Do not modify Inventory's existing Foundry tooltip behavior — only extend the same mechanism to Rivens/Mods.

---

### Task 0: Decide the consistent UI pattern (the "proper brainstorming" the issue asks for)

**Files:** none (decision-only task, documented here so it's not re-litigated per tab)

**Decision:** Reuse the exact `Tooltip` + `dropIndex` lookup pattern already built and shipped in `Inventory.jsx`'s `FoundryPanel` (research confirmed this is the only acquisition-info UI pattern that currently exists in kiedas-orbiter — no reason to invent a second one). Concretely:

- **Lookup layer:** a shared helper `getAcquisitionInfo(itemKeyOrUniqueName, dropIndex, overridesData)` that checks the ported override JSON first (Task 1), falls back to `getDropSources`/`dropIndex` (existing), and returns a normalized `{sources: AcquisitionSource[]}` shape either way, or `null` if nothing is known (mirroring wfinfo-ng's "No relic source found for this part" fallback text, per `missing-parts.py` line 742/806 research).
- **Rendering layer:** the same `Tooltip` component already used in `Inventory.jsx` (read its exact props/usage in Task 1 Step 1), attached to item rows in Rivens (Task 2) and Mods (Task 3) the same way it's attached to Foundry ingredients today — hover/click behavior unchanged from the existing Foundry usage.
- **Explicit non-goal:** wfinfo-ng additionally used a filterable table *column* for Mods' acquisition source (`MOD_COLLECTION_TAB.py`'s `_source_combo`). This plan does NOT add a filterable column in this pass — tooltip-only, matching what's already built, to keep this plan additive/low-risk. A filterable-column follow-up can be scoped separately if wanted after this ships.

- [ ] **Step 1: Confirm this decision is still right by reading the exact `Tooltip` component and its Foundry usage in full**

Read `src/screens/Inventory.jsx` lines ~412-445 (the `Tooltip` usage shown in research) in full, plus the `Tooltip` component's own definition (find it via its import in `Inventory.jsx`), to confirm its exact prop interface before committing to reusing it identically in Tasks 2-3.

---

### Task 1: Port acquisition-override data and build the shared lookup helper

**Files:**
- Create: `src-tauri/data/acquisition_overrides.json`
- Create: `src/lib/acquisitionInfo.js`
- Test: `src/lib/acquisitionInfo.test.js`

**Interfaces:**
- Produces: `getAcquisitionInfo(itemKey, dropIndex, overridesData) -> {sources: AcquisitionSource[]} | null`, where `AcquisitionSource` matches whatever shape `getDropSources` already returns (relic/mission/bounty entries) PLUS a new `{type: 'override', text: string}` variant for non-drop items.

- [ ] **Step 1: Merge and port the two wfinfo-ng override JSONs**

Read `/var/home/jedwards/wfinfo-ng/component_acquisition_overrides.json` (763 lines) and `/var/home/jedwards/wfinfo-ng/mod_acquisition_overrides.json` (246 lines) in full. Merge them into one file, keeping their existing key convention (`"Weapon|ComponentOrBlueprint"` for components, mod unique_name/display name for mods) under two top-level sections so lookups can target the right one:

```json
{
  "components": {
    "Akbronco Prime|Barrel": "Requires 2x fully-built Akbronco Prime (not tracked above - own the complete weapon, not a relic drop)"
  },
  "mods": {
    "Blood Rush": "Steel Path Junction reward / drops from Steel Path enemies"
  }
}
```

Drop wfinfo-ng's `"NOT_A_REAL_MOD"` sentinel entries during the port (they filtered internal/placeholder mods specific to the old app's data model — confirm none of kiedas-orbiter's mod list has an equivalent internal-placeholder problem before deciding whether any sentinel-filtering is still needed here).

- [ ] **Step 2: Write the failing test for the lookup helper**

```js
// src/lib/acquisitionInfo.test.js
import { getAcquisitionInfo } from './acquisitionInfo';

test('returns override text when no drop-table source exists', () => {
  const overridesData = { components: { 'Akbronco Prime|Barrel': 'Requires 2x fully-built Akbronco Prime' }, mods: {} };
  const result = getAcquisitionInfo('Akbronco Prime|Barrel', {}, overridesData);
  expect(result.sources).toEqual([{ type: 'override', text: 'Requires 2x fully-built Akbronco Prime' }]);
});

test('falls back to dropIndex sources when no override exists', () => {
  const dropIndex = { '/Lotus/.../SomePart': [{ type: 'relic', relicName: 'Lith G1', chance: 0.25 }] };
  const result = getAcquisitionInfo('/Lotus/.../SomePart', dropIndex, { components: {}, mods: {} });
  expect(result.sources).toEqual([{ type: 'relic', relicName: 'Lith G1', chance: 0.25 }]);
});

test('returns null when neither override nor drop-table source exists', () => {
  const result = getAcquisitionInfo('/Lotus/.../NotFound', {}, { components: {}, mods: {} });
  expect(result).toBeNull();
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test acquisitionInfo`
Expected: FAIL (module doesn't exist yet).

- [ ] **Step 4: Implement `getAcquisitionInfo`**

```js
// src/lib/acquisitionInfo.js
import { getDropSources } from './dropsParser';

/**
 * Resolve "how do I get this item" info, checking the hand-curated override
 * data first (vendor/clan-research/quest items with no drop-table entry),
 * then falling back to drop-table sources. Returns null if nothing is known
 * (mirrors wfinfo-ng's "No relic source found for this part" case).
 */
export function getAcquisitionInfo(itemKey, dropIndex, overridesData) {
  const overrideText = overridesData?.components?.[itemKey] ?? overridesData?.mods?.[itemKey];
  if (overrideText) {
    return { sources: [{ type: 'override', text: overrideText }] };
  }

  const dropSources = getDropSources(itemKey, dropIndex);
  if (dropSources && dropSources.length > 0) {
    return { sources: dropSources };
  }

  return null;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test acquisitionInfo`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/data/acquisition_overrides.json src/lib/acquisitionInfo.js src/lib/acquisitionInfo.test.js
git commit -m "Port wfinfo-ng's acquisition-override data and add shared getAcquisitionInfo lookup"
```

---

### Task 2: Wire acquisition info into the Rivens tab

**Files:**
- Modify: `src/screens/Rivens.jsx`

**Interfaces:**
- Consumes: `getAcquisitionInfo` (Task 1), `dropIndex` (already built app-wide via `MonitoringContext`, per `Inventory.jsx`'s existing usage — confirm exact context field name), `Tooltip` component (same one used in `Inventory.jsx`).

- [ ] **Step 1: Confirm how `dropIndex` is exposed to screens**

Read how `Inventory.jsx` obtains `dropIndex` today (via `useMonitoring()` or a prop) and use the identical source in `Rivens.jsx` — don't rebuild it locally.

- [ ] **Step 2: Load the override data**

Following the same bundled-JSON loading pattern confirmed in the Collectibles plan (Task "confirm how this app loads bundled static JSON" — reuse that exact mechanism here too, don't diverge):

```jsx
const [acquisitionOverrides, setAcquisitionOverrides] = useState(null);
useEffect(() => {
  invoke('read_file_bytes', { relative: 'data/acquisition_overrides.json' })
    .then((bytes) => setAcquisitionOverrides(JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)))))
    .catch(() => setAcquisitionOverrides({ components: {}, mods: {} }));
}, []);
```

- [ ] **Step 3: Add acquisition info to each riven-type card, per weapon**

Rivens don't drop from a single fixed source the way prime parts do — each riven *type* (e.g. "Acceltra Riven Mod") drops from that weapon's associated bounty/mission pool. Confirm what source data actually exists for this in `dropIndex` (riven mods may or may not be indexed the same way prime parts are — check during Step 1's read whether `buildDropIndex` covers riven unique_names at all). If riven drop sources aren't in `dropIndex` today, this task's scope for Rivens reduces to: show acquisition info only where an override exists (e.g. "Riven Mods for this weapon type drop from Sanctuary Onslaught / Kuva Fortress / Kela De Thaym" style curated text), rather than claiming a drop-table lookup that doesn't actually exist for rivens. Adjust the override JSON (Task 1) to include a `rivens` section with this kind of general-purpose text if per-weapon drop-table data isn't available.

```jsx
{acquisitionOverrides?.rivens?.[weaponName] && (
  <Tooltip content={acquisitionOverrides.rivens[weaponName]}>
    <InfoIcon size={12} />
  </Tooltip>
)}
```

- [ ] **Step 4: Manual verification**

Run `pnpm tauri dev`, open Rivens, confirm the new tooltip/icon appears and shows sensible text.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Rivens.jsx src-tauri/data/acquisition_overrides.json
git commit -m "Add acquisition info to Rivens tab"
```

---

### Task 3: Wire acquisition info into the Mods tab

**Files:**
- Modify: `src/screens/Mods.jsx`

**Interfaces:**
- Consumes: `getAcquisitionInfo` (Task 1), `dropIndex`, `Tooltip` (same as Task 2).

- [ ] **Step 1: Confirm Mods tab's current row/card structure**

Read `src/screens/Mods.jsx` in full (research confirmed zero existing acquisition-related code here) to find the right insertion point for a `Tooltip` per mod row/card, matching whatever row structure already exists for displaying mod name/rarity/owned-count.

- [ ] **Step 2: Add the acquisition lookup and tooltip per mod**

```jsx
{mods.map((mod) => {
  const acquisition = getAcquisitionInfo(mod.uniqueName, dropIndex, acquisitionOverrides);
  return (
    <div key={mod.uniqueName} className="...">
      <span>{mod.name}</span>
      {acquisition && (
        <Tooltip content={acquisition.sources.map((s) => s.type === 'override' ? s.text : formatDropSource(s)).join('; ')}>
          <InfoIcon size={12} />
        </Tooltip>
      )}
    </div>
  );
})}
```

`formatDropSource` should reuse whatever formatting `Inventory.jsx`'s Foundry tooltip already applies to `dropIndex` entries (relic/mission/bounty display strings) — read that formatting logic in Task 1 Step 1's `Tooltip` read and extract it into a shared function in `acquisitionInfo.js` if it isn't already reusable, rather than duplicating the formatting inline in both `Inventory.jsx` and `Mods.jsx`.

- [ ] **Step 3: Load the override data the same way as Task 2**

(Same pattern as Task 2 Step 2 — load `acquisition_overrides.json` in `Mods.jsx`.)

- [ ] **Step 4: Manual verification**

Run `pnpm tauri dev`, open Mods, confirm acquisition tooltips appear on mods that have either a drop-table source or an override entry, and that mods with neither show no tooltip (not an error/blank tooltip).

- [ ] **Step 5: Commit**

```bash
git add src/screens/Mods.jsx
git commit -m "Add acquisition info to Mods tab

Fixes #80"
```

---

## Self-Review

- **Spec coverage:** Issue #80 explicitly asks for (1) a deliberate consistent pattern decision rather than per-tab one-offs, and (2) applying it across Mods/Inventory/Rivens. Task 0 is the pattern decision (reusing the existing Foundry `Tooltip` mechanism, explicitly documented as the reused pattern rather than re-derived per tab). Inventory already has this outside Foundry only partially (per research, only Foundry ingredients have it) — this plan's scope is the two genuinely-missing tabs (Rivens, Mods); if the issue's intent also covers extending Inventory's *own* non-Foundry item rows, that's a natural Task 4 add-on this plan doesn't currently include, flagged here rather than silently assumed done.
- **Placeholder scan:** No TBDs. Task 2's riven-specific uncertainty (whether `dropIndex` even covers riven unique_names) is explicitly handled as a real decision point with a concrete fallback (override-only text), not glossed over.
- **Type consistency:** `getAcquisitionInfo`'s return shape (`{sources: [...]}`, Task 1) is consumed identically in Task 2 and Task 3 — no per-tab reinterpretation of the shape.

**Gap flagged for a possible Task 4 (not included in this plan's scope):** extending acquisition info to Inventory's *non-Foundry* item rows (owned/unowned toggle view), since research found Inventory's acquisition info today is Foundry-ingredient-only, not present in the main inventory list itself. Worth confirming with Jacob whether #80's intent covers that too before considering this plan complete.
