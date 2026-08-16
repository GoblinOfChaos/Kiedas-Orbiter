# Universal Acquisition-Info Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sparse per-card tooltip shipped for #80 with a click-to-open bottom drawer showing a full ranked list of "how do I get this," backed by `warframe-items`' built-in drop data, available on every item card across Mods, Rivens, and the main Inventory equipment grid.

**Architecture:** A new `src/lib/acquisitionData.js` module builds a `uniqueName`-keyed lookup from the already-installed (but currently unused) `warframe-items` npm package, which embeds a `drops[]` field per item (location/type/rarity/chance) plus a vetted `wikiaUrl`/`wikiAvailable` pair. `getAcquisitionInfo` (from #80, `src/lib/acquisitionInfo.js`) is extended to check this new source before the existing curated override JSON and `dropIndex`. A new shared `AcquisitionDrawer` component (bottom-docked, toggle/swap behavior) replaces the per-card tooltip icon in Mods.jsx and the header tooltip in Rivens.jsx, and gets newly wired into Inventory.jsx's main equipment grid.

**Tech Stack:** React 18, the `warframe-items` npm package (already in `package.json`, currently unimported anywhere). No Rust changes — this is client-side data + a new shared component.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-09-acquisition-info-drawer-design.md`. GitHub issue: supersedes #80 (comment on/reference #80 when closing this work, per Task 6).
- This design **supersedes**, not extends, the #80 tooltip work (commit `ce6ed8c`) — the per-card info icon in Mods.jsx and the header tooltip in Rivens.jsx must be removed as part of this plan, not left running alongside the drawer.
- Data source priority, in order: (1) `warframe-items`' `drops[]`, (2) existing curated `acquisition_overrides.json` (narrowed conceptually to quest/clan-research, though pruning unused entries is not required by this plan), (3) wiki link fallback — direct `wikiaUrl` when `wikiAvailable` is true, else a wiki search link.
- Click target is the whole card (no dedicated icon) — confirmed no existing `onClick` on `ModCard`/`RivenCard`; verify for the Inventory equipment `Card` in Task 6 before assuming the same.
- Drawer behavior: click a card to open with its info; click the *same* card again to close; click a *different* card while open to swap content without closing first.
- Rivens keep the general-sources explanation (not per-weapon data) — confirmed in #80's implementation that `warframe-items`/`dropIndex` has no weapon-specific riven data, and this plan doesn't change that.

---

### Task 1: Extract `warframe-items` data into a bundled static JSON, build the lookup module

**IMPORTANT - architecture correction made before implementation started:** the
original version of this task assumed `warframe-items`' category JSON files
could be `import`ed directly into the Vite-bundled frontend. This is wrong -
verified before writing any code that `warframe-items`' `package.json`
`exports` field only allows `warframe-items` (root) and `warframe-items/utilities`
as import specifiers (subpath imports like `warframe-items/data/json/Mods.json`
are blocked), AND the root `index.mjs` entry point itself uses Node's `fs`/`path`
directly (`readFileSync`, `readdirSync`) - it's built for a Node.js runtime, not
a browser/webview bundle, and cannot be imported into this app's frontend code
at all. This is corrected below: a one-time Node script extracts the needed
fields into a lean static JSON file, bundled the same way `acquisition_overrides.json`
already is (via `read_file_bytes`), rather than trying to live-import the package.

**Files:**
- Create: `scripts/extract-warframe-items-acquisition.mjs` (one-time/re-runnable extraction script, run manually with plain `node`, not part of the Vite build)
- Create: `src-tauri/data/assets/data/warframe-items-acquisition.json` (generated output, committed to the repo like the other files in this directory)
- Create: `src/lib/acquisitionData.js`

**Interfaces:**
- Produces: `loadAcquisitionData() -> Promise<void>` (call once, e.g. in a screen's mount effect, before using the functions below - matches this app's existing pattern of loading bundled JSON via `read_file_bytes` in a `useEffect`, e.g. `acquisitionOverrides` in Mods.jsx). `getItemDrops(uniqueName) -> AcquisitionSource[] | null` where `AcquisitionSource = {type: 'drop', location: string, dropType: string, rarity: string, chance: number}` (returns `null`/empty until `loadAcquisitionData()` has resolved). `getWikiLink(uniqueName, displayName) -> {url: string, isDirect: boolean}`.

- [ ] **Step 1: Write the extraction script**

```js
// scripts/extract-warframe-items-acquisition.mjs
//
// One-time (re-runnable) extraction of the fields this app needs from the
// warframe-items npm package into a lean static JSON file, since
// warframe-items itself uses Node's fs/path directly and can't be imported
// into the Vite-bundled frontend. Re-run this script (`node
// scripts/extract-warframe-items-acquisition.mjs`) whenever warframe-items
// is updated to a newer version, to refresh the bundled data.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDataDir = resolve(__dirname, '../node_modules/warframe-items/data/json');
const outPath = resolve(__dirname, '../src-tauri/data/assets/data/warframe-items-acquisition.json');

// Categories covering the three screens this feature wires up (Mods, Rivens,
// Inventory equipment) - Rivens has no per-weapon data in warframe-items
// (confirmed during #80), so no Relics/Riven-specific category is needed here.
const CATEGORIES = [
  'Mods', 'Arcanes', 'Warframes', 'Primary', 'Secondary', 'Melee',
  'Archwing', 'Arch-Gun', 'Arch-Melee', 'Sentinels', 'SentinelWeapons',
];

const extracted = [];
for (const category of CATEGORIES) {
  const items = JSON.parse(readFileSync(resolve(pkgDataDir, `${category}.json`), 'utf-8'));
  for (const item of items) {
    if (!item.uniqueName) continue;
    if (!Array.isArray(item.drops) || item.drops.length === 0) {
      if (!item.wikiAvailable) continue; // nothing useful to extract for this item
    }
    extracted.push({
      uniqueName: item.uniqueName,
      name: item.name,
      drops: item.drops || [],
      wikiaUrl: item.wikiaUrl || null,
      wikiAvailable: !!item.wikiAvailable,
    });
  }
}

writeFileSync(outPath, JSON.stringify(extracted), 'utf-8');
console.log(`Extracted ${extracted.length} items with acquisition data to ${outPath}`);
```

- [ ] **Step 2: Run the extraction script and verify the output**

```bash
cd /var/home/jedwards/kiedas-orbiter
node scripts/extract-warframe-items-acquisition.mjs
python3 -c "
import json
d = json.load(open('src-tauri/data/assets/data/warframe-items-acquisition.json'))
print('total items:', len(d))
sample = [i for i in d if i['drops']][0]
print(sample)
"
```
Expected: prints a total item count in the low thousands, and one sample item with a non-empty `drops` array.

- [ ] **Step 3: Write the frontend lookup module**

```js
// src/lib/acquisitionData.js
//
// Loads the pre-extracted warframe-items data (scripts/extract-warframe-items-acquisition.mjs)
// via the same bundled-JSON pattern this app already uses elsewhere
// (invoke('read_file_bytes', ...)). This is the primary acquisition data
// source per docs/superpowers/specs/2026-08-09-acquisition-info-drawer-design.md.
import { invoke } from '@tauri-apps/api/core';

let itemIndex = null;
let loadPromise = null;

export function loadAcquisitionData() {
  if (itemIndex) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = invoke('read_file_bytes', { relative: 'data/assets/data/warframe-items-acquisition.json' })
    .then((bytes) => {
      const arr = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)));
      itemIndex = new Map(arr.map((item) => [item.uniqueName, item]));
    })
    .catch(() => { itemIndex = new Map(); });
  return loadPromise;
}

/**
 * Returns this item's drop sources (enemy/mission/relic), ranked by chance
 * descending, or null if nothing is loaded yet or warframe-items has no
 * drops for it. Synchronous - call loadAcquisitionData() first and await it.
 */
export function getItemDrops(uniqueName) {
  const item = itemIndex?.get(uniqueName);
  if (!item || !Array.isArray(item.drops) || item.drops.length === 0) return null;

  return [...item.drops]
    .sort((a, b) => (b.chance ?? 0) - (a.chance ?? 0))
    .map((d) => ({
      type: 'drop',
      location: d.location,
      dropType: d.type,
      rarity: d.rarity,
      chance: d.chance,
    }));
}

/**
 * Returns a wiki link for this item - direct if warframe-items marks it as
 * available, otherwise a search link (never a dead end, per design decision
 * to prefer search's lower maintenance burden over occasional broken direct
 * links - though here we get a direct link for free when it's vetted).
 */
export function getWikiLink(uniqueName, displayName) {
  const item = itemIndex?.get(uniqueName);
  if (item?.wikiAvailable && item.wikiaUrl) {
    return { url: item.wikiaUrl, isDirect: true };
  }
  const query = encodeURIComponent(displayName || item?.name || '');
  return { url: `https://wiki.warframe.com/index.php?search=${query}`, isDirect: false };
}
```

- [ ] **Step 4: Verify the module against the real extracted data**

```bash
cd /var/home/jedwards/kiedas-orbiter
node --input-type=module -e "
import fs from 'fs';
globalThis.__TAURI_TEST_BYTES__ = fs.readFileSync('./src-tauri/data/assets/data/warframe-items-acquisition.json');
" 2>&1
```

This module calls `invoke()` from `@tauri-apps/api/core`, which only works inside a real Tauri webview - it cannot be exercised standalone with plain `node` the way Tasks elsewhere in this plan verify pure-logic modules. Instead, verify by reading the file directly and checking the same logic inline:

```bash
node --input-type=module -e "
import fs from 'fs';
const arr = JSON.parse(fs.readFileSync('./src-tauri/data/assets/data/warframe-items-acquisition.json', 'utf-8'));
const index = new Map(arr.map((item) => [item.uniqueName, item]));
const item = index.get('/Lotus/Powersuits/Trinity/LinkAugmentCard');
console.log('found item:', !!item);
console.log('drops:', item?.drops?.length);
console.log('wikiaUrl:', item?.wikiaUrl);
"
```
Expected: `found item: true`, a positive drop count, and a valid wiki URL. This confirms the data shape `acquisitionData.js`'s real `invoke()`-based loading will consume once run inside the actual app (verified end-to-end in Task 4's manual verification, which does run inside the real webview).

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-warframe-items-acquisition.mjs src-tauri/data/assets/data/warframe-items-acquisition.json src/lib/acquisitionData.js
git commit -m "Add warframe-items acquisition data: extraction script + bundled JSON + lookup module"
```

---

### Task 2: Extend `getAcquisitionInfo` to layer in the new source and wiki fallback

**Files:**
- Modify: `src/lib/acquisitionInfo.js`

**Interfaces:**
- Consumes: `getItemDrops`, `getWikiLink` (Task 1) — both are synchronous and read from `acquisitionData.js`'s in-memory cache, so callers of `getAcquisitionInfo` must have already called and awaited `loadAcquisitionData()` (Task 1) at least once, typically in their screen's mount effect (see Tasks 4-6) - otherwise `getItemDrops` returns `null` even for items that do have data, since the cache hasn't loaded yet.
- Produces: `getAcquisitionInfo(dropIndexKey, displayName, dropIndex, overridesData) -> {sources: AcquisitionSource[], wikiLink: {url, isDirect}}` — return shape changes from #80 (previously `{sources} | null`) to always include a `wikiLink`, and to never return `null` (the "drawer still opens, shows wiki link" design decision means callers no longer need to handle a null case for "nothing known" - there's always at least the wiki link).

- [ ] **Step 1: Update the priority order and always include a wiki link**

```js
// src/lib/acquisitionInfo.js
import { getItemDrops, getWikiLink } from './acquisitionData';

/**
 * Shared "how do I get this" lookup, reused across Mods/Rivens/Inventory.
 *
 * Priority order (see docs/superpowers/specs/2026-08-09-acquisition-info-drawer-design.md):
 *   1. warframe-items' drop data (richest, auto-maintained)
 *   2. hand-curated override JSON (quest/clan-research items with no drop-table entry)
 *   3. existing dropIndex (drop-table entries not yet covered by warframe-items,
 *      e.g. this app's own relic-reward parsing)
 * Always returns a wikiLink as a final fallback - the drawer never shows
 * nothing, per the "should still have a drawer, just have the wiki link"
 * design decision.
 */
export function getAcquisitionInfo(dropIndexKey, displayName, dropIndex, overridesData) {
  const itemDrops = getItemDrops(dropIndexKey);
  if (itemDrops) {
    return { sources: itemDrops, wikiLink: getWikiLink(dropIndexKey, displayName) };
  }

  const overrideText = overridesData?.mods?.[displayName] ?? overridesData?.components?.[dropIndexKey];
  if (overrideText) {
    return { sources: [{ type: 'override', text: overrideText }], wikiLink: getWikiLink(dropIndexKey, displayName) };
  }

  const norm = dropIndexKey?.replace('/StoreItems/', '/');
  const dropSources = dropIndex?.[norm] || dropIndex?.[dropIndexKey] ||
    (displayName ? dropIndex?.['display:' + displayName.toLowerCase().trim()] : null);
  if (dropSources && dropSources.length > 0) {
    return { sources: dropSources, wikiLink: getWikiLink(dropIndexKey, displayName) };
  }

  return { sources: [], wikiLink: getWikiLink(dropIndexKey, displayName) };
}
```

- [ ] **Step 2: Re-run the manual verification from #80's original implementation, updated for the new return shape**

```bash
cd /var/home/jedwards/kiedas-orbiter
node --input-type=module -e "
import { getAcquisitionInfo } from './src/lib/acquisitionInfo.js';
import fs from 'fs';
const overridesData = JSON.parse(fs.readFileSync('./src-tauri/data/assets/data/acquisition_overrides.json', 'utf8'));

console.log('warframe-items hit:', getAcquisitionInfo('/Lotus/Powersuits/Trinity/LinkAugmentCard', 'Abating Link', {}, overridesData));
console.log('Override fallback (no warframe-items entry expected):', getAcquisitionInfo('Acceltra|Nano Spores', null, {}, overridesData));
console.log('Nothing known - wiki-only:', getAcquisitionInfo('/Lotus/TrulyNotFound', 'Truly Not Found', {}, overridesData));
"
```
Expected: first call returns `sources` from `warframe-items` plus a `wikiLink`; second returns the override text plus a `wikiLink`; third returns `sources: []` plus a search-form `wikiLink`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/acquisitionInfo.js
git commit -m "Layer warframe-items drop data and always-present wiki link into getAcquisitionInfo"
```

---

### Task 3: Build the shared `AcquisitionDrawer` component

**Files:**
- Create: `src/components/AcquisitionDrawer.jsx`

**Interfaces:**
- Consumes: `getAcquisitionInfo`'s return shape (Task 2): `{sources: AcquisitionSource[], wikiLink: {url, isDirect}}`.
- Produces: `<AcquisitionDrawer item={{key, displayName, info}} onClose={fn} />` plus a `useAcquisitionDrawer()` hook managing the toggle/swap open-item state, for screens to share.

- [ ] **Step 1: Write the toggle/swap state hook**

```js
// Top of AcquisitionDrawer.jsx
import { useState, useCallback } from 'react';

/**
 * Manages which item's acquisition info is currently shown in the drawer.
 * Clicking the open item's own card again closes it; clicking a different
 * item's card swaps content without closing first - per the design spec's
 * interaction model.
 */
export function useAcquisitionDrawer() {
  const [openKey, setOpenKey] = useState(null);

  const toggle = useCallback((key) => {
    setOpenKey((prev) => (prev === key ? null : key));
  }, []);

  const close = useCallback(() => setOpenKey(null), []);

  return { openKey, toggle, close };
}
```

- [ ] **Step 2: Write a quick manual check of the hook's toggle/swap logic**

```js
// One-off verification, no test framework installed in this repo (per #80).
// This can't easily be run headless since it's a React hook - verify by
// reading the logic: toggle('a') -> openKey='a'; toggle('a') again ->
// openKey=null (close); toggle('a') then toggle('b') -> openKey='b' (swap,
// not close-then-reopen, since 'b' !== prev 'a' so it sets 'b' directly).
// Confirm this matches the spec's swap requirement by inspection before
// proceeding - no separate test needed for logic this small.
```

- [ ] **Step 3: Build the drawer UI**

```jsx
import { Info, ExternalLink } from 'lucide-react';
import { useUi } from '../contexts/UiContext';

export default function AcquisitionDrawer({ item, onClose }) {
  const { t } = useUi();
  if (!item) return null;
  const { displayName, info } = item;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-kronos-bg/98 backdrop-blur-md border-t border-white/10 shadow-[0_-8px_24px_rgba(0,0,0,0.4)] animate-in slide-in-from-bottom duration-200">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-kronos-accent" />
            <h3 className="text-sm font-black uppercase tracking-widest text-kronos-text">{displayName}</h3>
          </div>
          <button onClick={onClose} className="text-kronos-dim hover:text-kronos-text text-xs font-bold uppercase">
            {t('ui.common.close') || 'Close'}
          </button>
        </div>

        {info.sources.length > 0 ?
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
            {info.sources.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded bg-black/30 border border-white/5">
                <span className="text-xs text-kronos-text truncate">
                  {s.type === 'override' ? s.text :
                   s.type === 'drop' ? `${s.location}${s.dropType ? ` (${s.dropType})` : ''}` :
                   s.type === 'relic' ? `${s.relicName || s.relicManifest} (${s.rarity || ''})` :
                   s.type === 'mission' ? `${s.nodeName}${s.rotation ? ` Rot ${s.rotation}` : ''}` :
                   s.type === 'enemy' ? s.enemyName :
                   s.type === 'bounty' ? `${s.bountyLevel}${s.rotation ? ` Rot ${s.rotation}` : ''}` : ''}
                </span>
                {typeof s.chance === 'number' &&
                  <span className="text-[10px] font-bold text-kronos-accent flex-shrink-0 ml-2">{(s.chance * 100).toFixed(1)}%</span>
                }
              </div>
            ))}
          </div>
        :
          <p className="text-xs text-kronos-dim italic">No specific source known - try the wiki link below.</p>
        }

        <a
          href={info.wikiLink.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-kronos-dim hover:text-kronos-accent transition-colors"
        >
          <ExternalLink size={12} />
          {info.wikiLink.isDirect ? 'View on Warframe Wiki' : 'Search Warframe Wiki'}
        </a>
      </div>
    </div>
  );
}
```

Note: `target="_blank"` opens the system browser from within the Tauri webview - confirm this actually works in this app (check whether other external links in the codebase use plain `<a target="_blank">` or route through a Tauri shell-open command) during Step 4's manual verification; if plain links don't open external URLs correctly in this Tauri build, swap to `invoke('open_url', ...)` or the `@tauri-apps/plugin-shell` `open()` call, whichever this codebase already uses elsewhere for external links.

- [ ] **Step 4: Manual verification in dev mode**

Run `pnpm tauri dev`, temporarily render `<AcquisitionDrawer item={{displayName: 'Test Item', info: {sources: [{type: 'drop', location: 'Test Node', dropType: 'Test', chance: 0.25}], wikiLink: {url: 'https://wiki.warframe.com', isDirect: false}}}} onClose={() => {}} />` anywhere temporarily (e.g. at the bottom of `App.jsx`) to confirm it renders and the wiki link actually opens a browser. Remove the temporary render before moving on.

- [ ] **Step 5: Commit**

```bash
git add src/components/AcquisitionDrawer.jsx
git commit -m "Add shared AcquisitionDrawer component with toggle/swap state hook"
```

---

### Task 4: Wire into Mods.jsx, removing the superseded #80 tooltip

**Files:**
- Modify: `src/screens/Mods.jsx`

**Interfaces:**
- Consumes: `useAcquisitionDrawer`, `AcquisitionDrawer` (Task 3), `getAcquisitionInfo` (Task 2, already imported from #80).

- [ ] **Step 1: Remove the #80 tooltip wiring**

Remove the `Tooltip`/`Info` icon block added in commit `ce6ed8c` (the `<Tooltip position="bottom" ...>` wrapping `<Info size={11} />` inside the mod card's wrapping `<div className="relative">`), and remove the now-unused `Tooltip`/`Info` imports if nothing else in this file uses them.

- [ ] **Step 2: Add the drawer hook and click handler**

```jsx
import { useAcquisitionDrawer } from '../components/AcquisitionDrawer';
import AcquisitionDrawer from '../components/AcquisitionDrawer';
import { loadAcquisitionData } from '../lib/acquisitionData';

// Inside the Mods component:
const { openKey, toggle, close } = useAcquisitionDrawer();
const [acquisitionDataReady, setAcquisitionDataReady] = useState(false);
useEffect(() => {
  loadAcquisitionData().then(() => setAcquisitionDataReady(true));
}, []);
const openItem = useMemo(() => {
  if (!openKey || !acquisitionDataReady) return null;
  const mod = visible.find((m) => m.unique_name === openKey);
  if (!mod) return null;
  return { displayName: mod.name, info: getAcquisitionInfo(mod.unique_name, mod.name, dropIndex, acquisitionOverrides) };
}, [openKey, acquisitionDataReady, visible, dropIndex, acquisitionOverrides]);
```

(`acquisitionDataReady` guards against `openItem` computing before `loadAcquisitionData()` resolves - without it, a very fast click right after mount could read `getItemDrops`'s not-yet-populated cache and silently fall through to the override/dropIndex sources instead of warframe-items' richer data.)

- [ ] **Step 3: Make each card clickable, replacing the old wrapper**

```jsx
{visible.map((mod, i) => (
  <div
    key={`${mod.unique_name}_${mod.rank}_${i}`}
    className="relative cursor-pointer"
    onClick={() => toggle(mod.unique_name)}
  >
    <ModCard
      mod={mod}
      framesPath={framesPath}
      iconsPath={iconsPath}
      cardImagesPath={cardImagesPath}
      width={CARD_WIDTH}
      exportTextIcons={ExportTextIcons}
      platValue={modPrices?.[mod.unique_name] ?? 0}
      pricesLoading={loadingPrices} />
  </div>
))}
```

- [ ] **Step 4: Render the drawer at the bottom of the component's return**

```jsx
{openItem && <AcquisitionDrawer item={openItem} onClose={close} />}
```

(Place this as a sibling of the top-level `PageLayout`/wrapper return, not nested inside the grid, so its `fixed` positioning works correctly.)

- [ ] **Step 5: Build check**

```bash
cd /var/home/jedwards/kiedas-orbiter
pnpm exec vite build --mode production
```
Expected: PASS, no unused-import warnings for the removed `Tooltip`/`Info` (or confirm they're still used elsewhere in the file before removing the import).

- [ ] **Step 6: Manual verification**

Run `pnpm tauri dev`, open the Mods tab, click a mod card - the drawer should open at the bottom showing its sources (or the wiki-search fallback). Click the same card again - drawer closes. Click a different card while open - drawer content swaps without closing.

- [ ] **Step 7: Commit**

```bash
git add src/screens/Mods.jsx
git commit -m "Replace Mods tab tooltip with click-to-open acquisition drawer"
```

---

### Task 5: Wire into Rivens.jsx, removing the superseded #80 header tooltip

**Files:**
- Modify: `src/screens/Rivens.jsx`

**Interfaces:**
- Consumes: `useAcquisitionDrawer`, `AcquisitionDrawer` (Task 3).

- [ ] **Step 1: Remove the #80 header tooltip**

Remove the `rivenAcquisitionNote` state/effect and the `Tooltip`-wrapped `Info` icon added to the `subtitle` prop in commit `ce6ed8c`. Revert `subtitle` back to a plain template string.

- [ ] **Step 2: Add the drawer hook and click handler on each `RivenCard`**

```jsx
import { useAcquisitionDrawer } from '../components/AcquisitionDrawer';
import AcquisitionDrawer from '../components/AcquisitionDrawer';

// Inside the Rivens component:
const { openKey, toggle, close } = useAcquisitionDrawer();
const [rivensGeneralNote, setRivensGeneralNote] = useState('');
useEffect(() => {
  invoke('read_file_bytes', { relative: 'data/assets/data/acquisition_overrides.json' })
    .then((bytes) => {
      const parsed = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)));
      setRivensGeneralNote(parsed.rivens_general || '');
    })
    .catch(() => {});
}, []);

const openItem = useMemo(() => {
  if (!openKey) return null;
  const riven = filtered.find((r, idx) => String(idx) === openKey);
  if (!riven) return null;
  return {
    displayName: riven.name,
    info: { sources: rivensGeneralNote ? [{ type: 'override', text: rivensGeneralNote }] : [], wikiLink: { url: 'https://wiki.warframe.com/w/Riven_Mods', isDirect: true } },
  };
}, [openKey, filtered, rivensGeneralNote]);
```

(Uses `String(idx)` as the key since riven instances don't have a single stable unique identifier the way mods do - confirm during implementation whether `riven` objects have a more stable id field, e.g. an instance ID, and prefer that if present.)

- [ ] **Step 3: Make each `RivenCard` clickable**

```jsx
{filtered.map((riven, idx) =>
  <div key={idx} className="cursor-pointer" onClick={() => toggle(String(idx))}>
    <RivenCard riven={riven} framesPath={framesPath} iconsPath={iconsPath} width={200} estimate={pricingCache[rivenKeys.get(riven)]} />
  </div>
)}
```

- [ ] **Step 4: Render the drawer**

```jsx
{openItem && <AcquisitionDrawer item={openItem} onClose={close} />}
```

- [ ] **Step 5: Build check**

```bash
cd /var/home/jedwards/kiedas-orbiter
pnpm exec vite build --mode production
```
Expected: PASS.

- [ ] **Step 6: Manual verification**

Run `pnpm tauri dev`, open Rivens, click a riven card - drawer opens showing the general riven-sources note. Confirm toggle/swap behavior same as Task 4.

- [ ] **Step 7: Commit**

```bash
git add src/screens/Rivens.jsx
git commit -m "Replace Rivens tab header tooltip with click-to-open acquisition drawer"
```

---

### Task 6: Wire into Inventory.jsx's main equipment grid

**Files:**
- Modify: `src/screens/Inventory.jsx`

**Interfaces:**
- Consumes: `useAcquisitionDrawer`, `AcquisitionDrawer` (Task 3), `getAcquisitionInfo` (Task 2).

- [ ] **Step 1: Confirm no existing `onClick` on the equipment `Card`**

Read the full `<Card key={item.unique_name + idx} ...>` block (around line 1137-1230+ in `Inventory.jsx`, confirmed during plan research) to check for any existing `onClick`/interactive behavior before adding one - this app's `ModCard`/`RivenCard` had none, but this file wasn't checked for the same during brainstorming.

- [ ] **Step 2: Add the drawer hook**

```jsx
import { useAcquisitionDrawer } from '../components/AcquisitionDrawer';
import AcquisitionDrawer from '../components/AcquisitionDrawer';

// Inside the main Inventory equipment-view component (confirm exact
// component name/location during implementation - Inventory.jsx has
// multiple exported pieces per earlier research (FoundryPanel etc.), find
// the one rendering the `visibleItems.map` grid at line ~1132):
import { loadAcquisitionData } from '../lib/acquisitionData';

const { openKey, toggle, close } = useAcquisitionDrawer();
const [acquisitionOverrides, setAcquisitionOverrides] = useState(null);
const [acquisitionDataReady, setAcquisitionDataReady] = useState(false);
useEffect(() => {
  invoke('read_file_bytes', { relative: 'data/assets/data/acquisition_overrides.json' })
    .then((bytes) => setAcquisitionOverrides(JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)))))
    .catch(() => setAcquisitionOverrides({ components: {}, mods: {} }));
  loadAcquisitionData().then(() => setAcquisitionDataReady(true));
}, []);

const openItem = useMemo(() => {
  if (!openKey || !acquisitionDataReady) return null;
  const item = visibleItems.find((it) => it.unique_name === openKey);
  if (!item) return null;
  return { displayName: item.name, info: getAcquisitionInfo(item.unique_name, item.name, dropIndex, acquisitionOverrides) };
}, [openKey, acquisitionDataReady, visibleItems, dropIndex, acquisitionOverrides]);
```

- [ ] **Step 3: Add the click handler to the card**

```jsx
<Card
  key={item.unique_name + idx}
  glow={!isUnowned}
  onClick={() => toggle(item.unique_name)}
  className={`relative p-0 overflow-hidden flex min-h-40 group transition-all duration-300 cursor-pointer ${isUnowned ? 'bg-kronos-panel/10 border-2 border-dashed border-kronos-accent' : 'border-kronos-panel/40'}`}>
```

(Only add `cursor-pointer` and the `onClick` - keep every other prop/className exactly as it already is.)

- [ ] **Step 4: Render the drawer**

```jsx
{openItem && <AcquisitionDrawer item={openItem} onClose={close} />}
```

Place at the same top-level location used in Tasks 4-5.

- [ ] **Step 5: Build check**

```bash
cd /var/home/jedwards/kiedas-orbiter
pnpm exec vite build --mode production
```
Expected: PASS.

- [ ] **Step 6: Manual verification**

Run `pnpm tauri dev`, open Inventory, click an equipment card (a weapon, a warframe, an arcane, a prime part) - drawer opens with real drop sources for items `warframe-items` covers. Confirm toggle/swap. Confirm clicking a card doesn't break any other existing Inventory interaction (verify Step 1's finding didn't reveal a conflict).

- [ ] **Step 7: Commit**

```bash
git add src/screens/Inventory.jsx
git commit -m "Add click-to-open acquisition drawer to Inventory equipment grid

Fixes #80 (supersedes the ce6ed8c tooltip implementation)"
```

---

### Task 7: End-to-end verification and issue closeout

**Files:** none (verification only)

- [ ] **Step 1: Build and run the full app**

```bash
cd /var/home/jedwards/kiedas-orbiter
NO_STRIP=1 pnpm tauri build --bundles appimage
```

- [ ] **Step 2: Live-check across all three tabs**

With real inventory data: check Mods, Rivens, and Inventory tabs. For each, click 2-3 different cards and confirm: drawer opens with real source data where `warframe-items` has it, toggle-closes on re-click, swaps on clicking a different card, and the wiki link (direct or search) actually opens in a browser.

- [ ] **Step 3: Spot-check data accuracy**

Pick 2-3 items you have real-world knowledge of (e.g. a mod you know drops from a specific enemy) and confirm the drawer's shown location/source matches what you know to be true - this validates `warframe-items`' data quality for this app's purposes, not just that the code runs.

- [ ] **Step 4: Close the issue**

```bash
gh issue close 80 --repo GoblinOfChaos/Kiedas-Orbiter --comment "Superseded the original tooltip implementation (ce6ed8c) with a universal click-to-open acquisition drawer per docs/superpowers/specs/2026-08-09-acquisition-info-drawer-design.md - full ranked source list backed by warframe-items' drop data (richer than the previous curated-JSON-only approach), available on Mods/Rivens/Inventory equipment cards, with a wiki-link fallback so the drawer never shows nothing. Verified live against [N] real items."
```

---

## Self-Review

- **Spec coverage:** Every element of the design spec is covered - Task 1-2 implement the data-source priority order (warframe-items primary, curated JSON secondary, wiki fallback tertiary), Task 3 implements the interaction model (bottom drawer, toggle/swap, always-present wiki link), Tasks 4-6 wire it universally across the three actual item-card-rendering screens (confirmed during planning that Equipment/Warframes/Arcanes all share Inventory.jsx's single grid, not separate files), Task 7 verifies end-to-end and closes #80.
- **Placeholder scan:** No TBDs. Two spots are flagged as "confirm during implementation" rather than guessed: Task 1 Step 1's exact `warframe-items` category filenames (verifiable by listing a directory, not unknown information, just not enumerated here to avoid guessing wrong names), and Task 6 Step 1's check for existing `onClick` on the Inventory equipment card (this file wasn't checked during brainstorming the way `ModCard`/`RivenCard` were) - both are cheap, concrete verification steps, not unresolved design questions.
- **Type consistency:** `getAcquisitionInfo`'s return shape changed from #80's `{sources} | null` to this plan's always-present `{sources, wikiLink}` - Task 2 explicitly documents this as an intentional breaking change from #80, and Task 3's `AcquisitionDrawer` is written against the new shape throughout, not the old one. `AcquisitionSource` variants (`drop`/`override`/`relic`/`mission`/`enemy`/`bounty`) are handled identically in the one rendering location (Task 3's drawer component), so no drift risk from having multiple render sites (unlike #80, which duplicated rendering logic between Inventory.jsx and Mods.jsx).
