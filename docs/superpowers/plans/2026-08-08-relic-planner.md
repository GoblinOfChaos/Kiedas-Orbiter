# Relic Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new "Relic Planner" screen answering "which relics give me part X, that I own" — port wfinfo-ng's `RELIC_PLANNER_TAB.py` matching logic into a new React screen using this app's existing drop-index/relic-parsing infrastructure.

**Architecture:** Build a searchable "need list" (parts the user wants) entirely client-side, reusing `getAllRelicRewards`/`getRewardInventoryContext` (`relicParser.js`) and `buildDropIndex`/`getDropSources` (`dropsParser.js`) which already give per-part ownership status and per-relic reward tables — no new Rust command needed, this is a pure data-reshaping + new-screen task. Register the screen in `App.jsx`'s nav/routing following the exact pattern `Relics.jsx` already uses.

**Tech Stack:** React 18, existing `MonitoringContext`, `relicParser.js`, `dropsParser.js`. No Rust changes.

## Global Constraints

- GitHub issue: #82.
- Reuse `getRewardInventoryContext` for ownership/need status per part — do not reimplement ownership logic.
- Follow `Relics.jsx`'s established screen pattern (`PageLayout`, `useMonitoring`, `MonitorState` while loading) rather than inventing a new screen structure.

---

### Task 1: Build the core matching function (relic → needed parts) as a pure, testable module

**Files:**
- Create: `src/lib/relicPlanner.js`
- Test: `src/lib/relicPlanner.test.js`

**Interfaces:**
- Consumes: `exportData` (for `getAllRelicRewards`/relic reward tables), `inventoryData` (for ownership via `getRewardInventoryContext`), a `needList: string[]` of reward `uniqueName`s the user wants.
- Produces: `planRelics(needList, exportData, inventoryData, locale) -> PlannedRelic[]`, where `PlannedRelic = {relicUniqueName, name, era, ownedCount, matchedNeeds: string[], vaulted: boolean}`, sorted by `(-ownedCount, -matchedNeeds.length)` matching wfinfo-ng's `_compute()` sort.

- [ ] **Step 1: Read wfinfo-ng's `_compute()` in full**

Read `/var/home/jedwards/wfinfo-ng/RELIC_PLANNER_TAB.py`'s `_compute()` method in full (not just the research summary) to confirm the exact rarity-field iteration (`RARITY_FIELDS`: rare1/uncommon1/uncommon2/common1-3) and vaulted-detection logic, since this port needs to reproduce "which of a relic's 6 reward slots match the need list" using this app's existing relic reward shape (`getRelicRewards` returns 6 `{uniqueName, name, rarity, ...}` entries per relic — confirm this already covers all 6 rarity slots equivalently).

- [ ] **Step 2: Write the failing test for the core matching function**

```js
// src/lib/relicPlanner.test.js
import { planRelics } from './relicPlanner';

test('finds relics containing a needed part, sorted by owned count then match count', () => {
  const exportData = {
    // minimal fixture: two relics, one owned with 2 copies, one unowned,
    // both containing the needed part uniqueName at different rarity slots
  };
  const inventoryData = {
    relics: [
      { unique_name: '/Lotus/.../LithG1RelicIntact', name: 'Lith G1', era: 'Lith', refinements: { Intact: 2 } },
    ],
  };
  const needList = ['/Lotus/.../SomePrimePartBlueprint'];

  const result = planRelics(needList, exportData, inventoryData, 'en');

  expect(result[0].relicUniqueName).toBe('/Lotus/.../LithG1RelicIntact');
  expect(result[0].ownedCount).toBe(2);
  expect(result[0].matchedNeeds).toContain('/Lotus/.../SomePrimePartBlueprint');
});

test('returns empty array when need list matches no relics', () => {
  const result = planRelics(['/Lotus/.../NotARealPart'], {}, { relics: [] }, 'en');
  expect(result).toEqual([]);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test relicPlanner` (confirm the actual test command via `package.json` `scripts.test` first — this repo may use vitest)
Expected: FAIL with "planRelics is not defined" or similar (module doesn't exist yet).

- [ ] **Step 4: Implement `planRelics`**

```js
// src/lib/relicPlanner.js
import { getAllRelicRewards, getRelicRewards } from './relicParser';

/**
 * Find every relic that drops at least one part in needList, ranked by how
 * many owned copies + how many needed parts it covers. Mirrors wfinfo-ng's
 * RELIC_PLANNER_TAB.py _compute().
 */
export function planRelics(needList, exportData, inventoryData, locale) {
  const needSet = new Set(needList);
  if (needSet.size === 0) return [];

  const relics = inventoryData?.relics || [];
  const results = [];

  for (const relic of relics) {
    const rewards = getRelicRewards(relic.unique_name, exportData, locale) || [];
    const matchedNeeds = rewards
      .filter((r) => needSet.has(r.uniqueName))
      .map((r) => r.uniqueName);
    if (matchedNeeds.length === 0) continue;

    const ownedCount = Object.values(relic.refinements || {}).reduce((sum, n) => sum + (n || 0), 0);

    results.push({
      relicUniqueName: relic.unique_name,
      name: relic.name,
      era: relic.era,
      ownedCount,
      matchedNeeds,
      vaulted: relic.vaulted ?? false, // confirm exact vaulted-status field name against inventoryData shape during Task 1 Step 1's re-read, adjust if named differently
    });
  }

  return results.sort((a, b) => (b.ownedCount - a.ownedCount) || (b.matchedNeeds.length - a.matchedNeeds.length));
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test relicPlanner`
Expected: PASS. If the `vaulted` field name is wrong (Task 1 Step 1's re-read should have confirmed the real field), fix it here based on what's actually in `inventoryData.relics[]`.

- [ ] **Step 6: Add a "relics not yet owned" mode, matching wfinfo-ng's "search all relics, not just owned" option**

wfinfo-ng's planner searches ALL relics (owned or not) by default, with owned-count as a ranking signal, not a filter — re-check `_compute()`'s actual behavior here (research wasn't fully clear on whether it filters to owned-only or ranks-with-zero-included). If it includes unowned relics with `ownedCount: 0` (ranked lower, not excluded), extend `planRelics` to iterate over ALL relics in `exportData` (via `getAllRelicRewards`'s underlying relic list, not just `inventoryData.relics`), not just owned ones, and add a test:

```js
test('includes unowned relics in results, ranked below owned ones', () => {
  // fixture with one unowned relic (not in inventoryData.relics) that still
  // contains a needed part, plus one owned relic that also matches
  const result = planRelics(needList, exportData, inventoryData, 'en');
  expect(result.some((r) => r.ownedCount === 0)).toBe(true);
});
```

- [ ] **Step 7: Run all `relicPlanner` tests, verify all pass**

Run: `pnpm test relicPlanner`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/relicPlanner.js src/lib/relicPlanner.test.js
git commit -m "Add planRelics: core relic-need matching logic ported from wfinfo-ng"
```

---

### Task 2: Build the Relic Planner screen (search list + need list + results table)

**Files:**
- Create: `src/screens/RelicPlanner.jsx`

**Interfaces:**
- Consumes: `planRelics` (Task 1), `useMonitoring()` for `inventoryData`/`exportData`, `getAllRelicRewards` for the searchable part list, `getRewardInventoryContext` for per-part owned/needed status shown in the search list.
- Produces: a screen registered in `App.jsx`'s nav (Task 3).

- [ ] **Step 1: Read `Relics.jsx` in full as the structural template**

Read `src/screens/Relics.jsx` completely — the exact `PageLayout` props used, how `MonitorState isLoading` gates rendering while inventory loads, and the `useMemo` patterns for filtering — before writing `RelicPlanner.jsx`, so the new screen matches this app's established conventions rather than introducing a new one.

- [ ] **Step 2: Build the searchable part list (left panel)**

```jsx
// src/screens/RelicPlanner.jsx
import { useState, useMemo } from 'react';
import { useUi } from '../contexts/UiContext';
import { useMonitoring } from '../contexts/MonitoringContext';
import { PageLayout, Input, MonitorState } from '../components/UI';
import { getAllRelicRewards, getRewardInventoryContext } from '../lib/relicParser';
import { planRelics } from '../lib/relicPlanner';

export default function RelicPlanner() {
  const { t } = useUi();
  const { inventoryData, exportData, isInventoryLoading } = useMonitoring();
  const [search, setSearch] = useState('');
  const [needList, setNeedList] = useState([]); // array of uniqueNames

  const allParts = useMemo(() => {
    if (!exportData) return [];
    return getAllRelicRewards(exportData, 'en')
      .map((part) => ({ ...part, context: getRewardInventoryContext(part.uniqueName, inventoryData, exportData, 'en') }));
  }, [exportData, inventoryData]);

  const filteredParts = useMemo(() => {
    if (!search) return allParts;
    const q = search.toLowerCase();
    return allParts.filter((p) => p.name.toLowerCase().includes(q));
  }, [allParts, search]);

  // ... rest built in subsequent steps
}
```

- [ ] **Step 3: Add need-list management (add/remove/clear, "Add All Missing")**

```jsx
  const addToNeedList = (uniqueName) => setNeedList((prev) => prev.includes(uniqueName) ? prev : [...prev, uniqueName]);
  const removeFromNeedList = (uniqueName) => setNeedList((prev) => prev.filter((n) => n !== uniqueName));
  const clearNeedList = () => setNeedList([]);
  const addAllMissing = () => {
    const missing = allParts.filter((p) => !p.context?.isOwned).map((p) => p.uniqueName);
    setNeedList((prev) => Array.from(new Set([...prev, ...missing])));
  };
```

- [ ] **Step 4: Compute planner results from the need list**

```jsx
  const plannedRelics = useMemo(
    () => planRelics(needList, exportData, inventoryData, 'en'),
    [needList, exportData, inventoryData]
  );
```

- [ ] **Step 5: Render the three-panel layout (search+add / need list / results table)**

Build the JSX using `PageLayout`, `Input` for search, and a results table listing `plannedRelics` (columns: relic name, era, owned count, matched parts, vaulted indicator) — follow `Relics.jsx`'s existing table/card rendering conventions (read in Step 1) for visual consistency rather than inventing new table markup.

```jsx
  return (
    <PageLayout titleKey="screen.relic_planner" subtitle="Find relics for the parts you need">
      <MonitorState isLoading={isInventoryLoading}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('relic_planner.search_parts')} />
            {/* filteredParts list with an "add to need list" button per row */}
          </div>
          <div>
            {/* needList display with remove buttons, clearNeedList, addAllMissing */}
          </div>
          <div className="lg:col-span-1">
            {/* plannedRelics results table */}
          </div>
        </div>
      </MonitorState>
    </PageLayout>
  );
}
```

- [ ] **Step 6: Manual verification in dev mode**

Run: `pnpm tauri dev`, navigate to the new screen (once Task 3 wires nav), search for a real prime part you don't own, add it to the need list, confirm relics that drop it appear in results ranked correctly.

- [ ] **Step 7: Commit**

```bash
git add src/screens/RelicPlanner.jsx
git commit -m "Add Relic Planner screen UI"
```

---

### Task 3: Register the screen in navigation

**Files:**
- Modify: `src/App.jsx` (`NAV_ITEMS` array, lazy import block, `screens` map — all near lines 17-30 and ~306 per research)

**Interfaces:**
- Consumes: `RelicPlanner` (Task 2).
- Produces: a working nav entry and route for the new screen.

- [ ] **Step 1: Add the lazy import**

```jsx
const RelicPlanner = lazy(() => import('./screens/RelicPlanner'));
```

- [ ] **Step 2: Add the nav entry**

Find the `NAV_ITEMS` array and add an entry following the exact shape of existing entries (icon import from `lucide-react`, matching the sidebar icon style already used — check `Relics.jsx`'s nav entry for which icon it uses as a stylistic neighbor, pick something distinct like `Map` or `ListChecks`):

```jsx
{ id: 'relic-planner', icon: ListChecks, label: 'nav.relic_planner' },
```

- [ ] **Step 3: Add the screens map entry**

```jsx
'relic-planner': <RelicPlanner />,
```

- [ ] **Step 4: Add the nav label translation key**

In `src/lib/i18n/en.json`'s `ui` section, add `"nav.relic_planner": "Relic Planner"` and `"screen.relic_planner": "Relic Planner"` (matching the `titleKey` used in Task 2 Step 5) alongside the other `nav.*`/`screen.*` entries.

- [ ] **Step 5: Build check**

Run: `pnpm exec vite build --mode production`
Expected: PASS, no missing-import or undefined-component errors.

- [ ] **Step 6: Manual verification**

Run the dev server or rebuild the AppImage, confirm the Relic Planner icon appears in the sidebar and clicking it renders the screen without errors.

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx src/lib/i18n/en.json
git commit -m "Register Relic Planner in navigation

Fixes #82"
```

---

## Self-Review

- **Spec coverage:** Issue #82's ask ("which relics give me part X, that I own") is covered: Task 1 is the matching algorithm (ported from `RELIC_PLANNER_TAB.py`), Task 2 is the UI (search + need list + results, mirroring the Python version's 3-panel layout), Task 3 makes it reachable. All three produce independently testable/verifiable deliverables.
- **Placeholder scan:** No TBDs. Two spots (Task 1 Step 1's rarity-field/vaulted-field confirmation, Task 1 Step 6's owned-vs-all-relics scope) are explicitly flagged as "re-read the source to confirm before implementing," which is deliberate given research didn't fully pin down these exact details — not a placeholder for logic, but an instruction to verify before writing.
- **Type consistency:** `planRelics`'s return shape (`PlannedRelic[]`, Task 1) matches what Task 2's results-table rendering expects (`relicUniqueName`, `name`, `era`, `ownedCount`, `matchedNeeds`, `vaulted`) — no naming drift between the two tasks.
