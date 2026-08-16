# Collectibles Per-Item List with Locations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Collectibles' existing per-category `Subpanel` drill-down (currently placeholder text like "Found X of Y" / "Area 1, Bit 3") to show real item names and acquisition locations, sourced from a new wiki-derived dataset — for series collectibles and discovered-marker collectibles specifically (fragments already show real names).

**Architecture — confirmed by external research (2026-08-08):** Checked whether a reusable structured dataset already exists before committing to manual entry. Finding: no WFCD repo (`warframe-items`, `warframe-worldstate-data`) or existing open-source companion tool has per-item collectible *locations* (WFCD/DE export data has names/IDs/drop-chance data, but not physical tile-spawn locations). One unverified lead: the Warframe Wiki runs a Cargo query extension (`wiki.warframe.com/api.php`, `action=cargoquery`) that *might* expose a structured Sculptures/collectibles table with a location field — this wasn't confirmed (API fetches were blocked from the research environment) and needs a one-time manual browser check (Task 1 Step 1a below) before falling back to manual wiki-prose data entry. If the Cargo table exists, a one-time scripted pull replaces most of the manual entry in Step 2; if not, manual entry (using WFCD/DE export names as the canonical item key, per research) is the only viable path.

No existing per-item location data exists anywhere in this codebase or wfinfo-ng — either way, this is new data sourcing, not a port. Build a static JSON dataset (name, category, location/coordinates per item) bundled with the app, and extend `Subpanel`'s existing per-item list rendering (already built, just fed placeholder data today) to read real names + locations from it.

**Tech Stack:** React 18 (existing `Collectibles.jsx`/`Subpanel` structure), a new static JSON data file. No Rust changes needed unless the dataset needs to live in `src-tauri/data` for bundling consistency with other data files (decided in Task 1).

## Global Constraints

- GitHub issue: #84.
- Data accuracy: spot-check the sourced dataset against community wiki sources before shipping, per the original fork spec's testing note.
- Don't replace the existing category `ProgressCard` grid — this adds detail *inside* the already-existing `Subpanel` drawer, which is the correct extension point per research.
- Keep this scoped to series + discovered-marker categories (the two that currently show placeholder subpanel data); fragments already have real names and don't need dataset work, though they may want locations added too if the dataset covers them cheaply.

---

### Task 1: Source and structure the per-item collectible dataset

**Files:**
- Create: `src-tauri/data/collectible_locations.json` (confirm this is the right home by checking where similar static app data lives, e.g. `mod-icon-map.json` referenced in `MonitoringContext.jsx`)

**Interfaces:**
- Produces: a JSON file shaped `{ [categoryKey]: { [itemKey]: { name: string, location: string, coordinates?: string } } }`, where `categoryKey` matches the existing `CATEGORIES` array's keys in `Collectibles.jsx` (e.g. `series`, `markers`), and `itemKey` matches whatever identifier the current placeholder logic already uses per item (e.g. the bit-index for markers) so it can be looked up without changing the existing counting/progress logic.

- [ ] **Step 1: Read `Collectibles.jsx` in full to confirm exact category/item key conventions**

Read `src/screens/Collectibles.jsx` completely (`CATEGORIES` array lines 7-32, `Subpanel` lines 40-87, the `seriesCards`/`markerCards`/`fragmentCards` builders lines 155-234) to nail down: what identifies a "series" item and a "marker" item today (even as placeholders) — e.g. is a marker identified by a bit-index number, a raw internal name, something else? The dataset's keys must match these exactly or the lookup in Task 2 won't connect.

- [ ] **Step 1a: Check whether the Warframe Wiki's Cargo query API has a structured locations table (do this before manual entry)**

In a browser, visit `https://wiki.warframe.com/wiki/Special:CargoTables` and look for a table covering Sculptures/collectibles (name varies — check for anything like `Sculptures`, `Collectibles`, or similar). If one exists with a location field, query it via `https://wiki.warframe.com/api.php?action=cargoquery&tables=<TableName>&fields=<fields>&format=json` to pull structured data directly instead of hand-copying from prose pages — this replaces most of Step 2's manual work if it pans out. If no such table exists (or it lacks location data), proceed to Step 2's manual sourcing as planned.

- [ ] **Step 2: Source the data**

For each of the `series` and `markers` categories (and optionally `fragments` if cheap to include), compile a list of real item names + real-world/in-game locations from community wiki sources (e.g. the Warframe Wiki's pages for Sculptures/Simulacrum series items, or whichever specific collectible types this app's `CATEGORIES` actually cover — confirmed in Step 1). This is manual research/data entry, not something to script — there is no existing structured source for this in either codebase.

Structure it as:

```json
{
  "series": {
    "<itemKey matching Step 1's convention>": {
      "name": "Ancient Fresco: Passage",
      "location": "Void Angel bounty rewards, Zariman"
    }
  },
  "markers": {
    "<bitIndexOrKeyMatchingStep1>": {
      "name": "Orokin Ruins, Sector 4",
      "location": "Deimos, Cambion Drift"
    }
  }
}
```

- [ ] **Step 3: Validate the JSON is well-formed and every key matches the category's real item count**

```bash
python3 -c "
import json
data = json.load(open('src-tauri/data/collectible_locations.json'))
for category, items in data.items():
    print(category, 'has', len(items), 'entries')
"
```

Cross-check each category's entry count against the `wikiTotal` value already hardcoded in `Collectibles.jsx`'s `CATEGORIES` array (Task 1 Step 1) — if the dataset has fewer entries than `wikiTotal`, that's expected for a first pass (partial coverage is fine, `Subpanel` should gracefully show "no location data" for missing entries per Task 2), but log a note of what's missing for follow-up.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/data/collectible_locations.json
git commit -m "Add sourced per-item collectible location dataset (series, markers)"
```

---

### Task 2: Wire the dataset into `Subpanel`'s existing per-item rendering

**Files:**
- Modify: `src/screens/Collectibles.jsx` (`Subpanel`, lines ~40-87; `seriesCards`/`markerCards` builders, lines ~155-234)

**Interfaces:**
- Consumes: `collectible_locations.json` (Task 1), loaded via whatever this app's existing pattern is for bundled static JSON (check `MonitoringContext.jsx`'s handling of `mod-icon-map.json`/similar for the load pattern — likely `invoke('read_file_bytes', ...)` or a direct import if it's small enough to bundle via Vite).
- Produces: `Subpanel`'s `items` array gains real `location` (and `name`, replacing today's placeholder strings) for series and marker items.

- [ ] **Step 1: Confirm how this app loads bundled static JSON and follow that exact pattern**

Read how `mod-icon-map.json`/`peely-pix-map.json` (referenced in `MonitoringContext.jsx` per earlier research in this session) get loaded — likely via `invoke('read_file_bytes', { relative: 'data/assets/data/...' })` and `JSON.parse`. Use the identical mechanism for `collectible_locations.json` rather than introducing a new loading pattern (e.g. a raw Vite static import), for consistency with how this app already handles this exact kind of data.

- [ ] **Step 2: Load the dataset in `Collectibles.jsx`**

```jsx
const [collectibleLocations, setCollectibleLocations] = useState(null);

useEffect(() => {
  invoke('read_file_bytes', { relative: 'data/collectible_locations.json' })
    .then((bytes) => setCollectibleLocations(JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)))))
    .catch(() => setCollectibleLocations({})); // graceful fallback: subpanel still works, just shows no location data
}, []);
```

(Adjust the exact `invoke` call/path to match whatever Step 1 confirmed is the real pattern in this codebase.)

- [ ] **Step 3: Update `seriesCards`/`markerCards` builders to pull real name + location per item**

Currently (per research) `seriesCards` shows a placeholder string "Found X of Y" and `markerCards` shows placeholder bit-indexed names like "Area 1, Bit 3" instead of real per-item data in the `Subpanel`'s `items` array. Update these builders so each item object gains real `name`/`location` when available in `collectibleLocations`:

```jsx
const seriesCards = useMemo(() => {
  // ... existing found/total aggregation logic, unchanged ...
  const items = /* existing per-item construction */.map((item) => {
    const dataset = collectibleLocations?.series?.[item.key];
    return {
      ...item,
      name: dataset?.name ?? item.name, // fall back to whatever placeholder existed before if not in dataset yet
      location: dataset?.location ?? null,
    };
  });
  return { /* existing shape */, items };
}, [/* existing deps */, collectibleLocations]);
```

Apply the equivalent change to `markerCards`'s builder.

- [ ] **Step 4: Render `location` in `Subpanel`'s per-item row**

In `Subpanel`'s row rendering (lines ~70-81 per research: filled/unfilled dot + name + found checkmark), add the location as a secondary line when present:

```jsx
<div className="flex flex-col">
  <span>{item.name}</span>
  {item.location && <span className="text-xs text-kronos-dim">{item.location}</span>}
</div>
```

- [ ] **Step 5: Manual verification**

Run `pnpm tauri dev`, open Collectibles, click into a series card and a markers card, confirm real item names + locations now show instead of the old placeholder strings, and confirm items not yet covered by the dataset degrade gracefully (fall back to the old placeholder rather than showing `undefined`/blank).

- [ ] **Step 6: Commit**

```bash
git add src/screens/Collectibles.jsx
git commit -m "Show real item names and locations in Collectibles subpanel

Fixes #84"
```

---

## Self-Review

- **Spec coverage:** Issue #84's ask ("a wiki-sourced per-item dataset... and build a Collectibles detail view... alongside Kronos's existing category progress cards") is covered: Task 1 sources the dataset, Task 2 wires it into the *already-existing* `Subpanel` detail view (research found this extension point already built, just fed placeholders) rather than building a redundant new view, and explicitly keeps the existing `ProgressCard` grid untouched.
- **Placeholder scan:** Task 1's data-sourcing step is manual research work, correctly identified as such rather than faked with invented placeholder location strings — the plan is explicit that partial dataset coverage on first pass is acceptable and gracefully degraded in Task 2, rather than pretending full coverage exists.
- **Type consistency:** The dataset's `{name, location}` shape (Task 1) matches exactly what Task 2's rendering consumes (`item.name`, `item.location`) — no drift.
