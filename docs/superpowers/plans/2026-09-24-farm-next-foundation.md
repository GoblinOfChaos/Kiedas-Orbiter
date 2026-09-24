# Farm Next Foundation (Stages 0-1) Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax. Tests use Node's built-in runner (`node --test`), the repo has no other test framework and none may be added.

**Goal:** Ship the data foundation (bundled, updatable wiki module store; DE drop-table parser with validation) and the pure calculation engine (requirements, ledger, places, Farm-next ranking) with a runnable proof script. No screen changes.

**Architecture:** Pure JS modules under `src/lib/farmingTargets/` and `src/lib/deDropTables/` (no React/Tauri/network/fs imports, so `node --test` and a plain-node proof script can import them). Rust only adds three thin commands (read store, refresh store, refresh drop-tables HTML). Offline prep scripts under `scripts/` build the data files.

**Tech Stack:** Node 24 ESM (`node:test`, `node:assert/strict`, `node:zlib`, built-in `fetch`), Rust (existing `reqwest`, `flate2` only if already in `Cargo.toml`, otherwise store modules uncompressed), existing Tauri commands.

**Spec:** `docs/superpowers/specs/2026-09-24-farming-targets-farm-next-design.md` (read it first, plus `docs/revamp/stage-4/COMMAND-CENTER-IMPLEMENTATION-PLAN.md` section 9.8).

## Global Constraints

- Preview repo only (`/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center`); stable untouched; nothing pushed.
- No new npm or cargo dependencies. No builds, no `cargo`, no `tauri`, no `vite` run by implementers (the coordinator compiles). Static checks: `node --check`, `node --test`.
- Primary sources only: DE PublicExport, DE drop tables (`https://www.warframe.com/droptables`), `https://wiki.warframe.com`. Fandom banned. Network politeness: >=1.2 s between wiki requests, `User-Agent: KiedasOrbiter/1.0 (data refresh)`; conditional requests for the drop tables.
- Never guess game data: unknown => `unknown`/`null` with a visible label, never a fabricated value.
- Chance values in code are fractions (0-1); UI/percent conversion only at display. Drop chances are always shown, never hidden.
- Determinism: every ordering has explicit tiebreaks; results do not depend on input order.
- CPU rules: implementers run scripts with `nice -n 19`; no busy loops or polling.
- Conclave places are never hidden (spec section 1); minimum-chance filter default OFF.
- Every new `.js` module in `src/lib/` must be importable by plain Node (ESM, no JSX, no bare package imports).

## Review Focus

1. Drop table page changes shape (new section id, new row form): parser must throw a typed error naming the section/row, never return partial data as if valid; refresh keeps the last good copy.
2. Wiki store update interrupted (crash, network drop, corrupt gz): store must remain readable at its previous version; index and modules never disagree.
3. Item with only Conclave sources still needed: must appear in the combined ranking with a PvP badge; item with a non-Conclave source must not pull Conclave into it.
4. Cyclic or self-referencing recipe, output quantity > 1, owned intermediates, unresolved identity: engine must terminate, apply ceilings, use inventory once, and never contribute a guessed number.
5. Enemy with no wiki location, names that differ between wiki and DE (`Mercury` vs `Apollodorus (Mercury)` style): must surface as `unknown`/`unmatched`, not silently dropped or force-matched.

---

## File Structure

| File | Responsibility |
|---|---|
| `scripts/wiki-store/build.mjs` | Offline: turn `wiki_module_archive/*.lua` + `wiki_module_json/*.json` + a revisions file into the store directory and `index.json` |
| `scripts/wiki-store/fetch-revisions.mjs` | Fetch `revid`/timestamp for all module titles (50 per request) into `revisions.json` |
| `src-tauri/data/assets/wiki-store/` | Built store: `index.json`, `modules/<safe-name>.json` (converted) or `.lua` (raw), optionally `.gz` |
| `src-tauri/src/wiki_store.rs` | Commands `wiki_store_index`, `wiki_store_get`, `wiki_store_refresh` |
| `src/lib/wikiStore.js` | Thin JS client: `getWikiModule(name)`, `getWikiIndex()`; used by later stages; testable with an injected loader |
| `src/lib/deDropTables/parse.js` | Pure parser of the DE drop tables HTML into rows + validation |
| `src/lib/deDropTables/fixtures/` | Trimmed real snapshot used by golden tests |
| `scripts/de-drop-tables/fetch.mjs` | Conditional GET of the DE page to a cache dir |
| `src/lib/farmingTargets/requirements.js` | Expand targets to leaf requirements |
| `src/lib/farmingTargets/ledger.js` | Combine, apply inventory once, reservations, contributors |
| `src/lib/farmingTargets/placeIndex.js` | item -> sources, source -> place records, honesty levels |
| `src/lib/farmingTargets/farmNext.js` | Coverage ranking, Conclave rule, filters, tabs |
| `scripts/farming-targets-proof.js` | Runnable, read-only proof output |
| `tests/farming/*.test.mjs` | `node --test` suites (one per module) |

`src/lib/farmingTargets/aggregation.js` (existing MVP) is left in place until Stage 2 replaces its callers.

---

### Task 1: DE drop-table parser (pure) with validation

**Files:**
- Create: `src/lib/deDropTables/parse.js`
- Create: `src/lib/deDropTables/fixtures/mini.html` (hand-trimmed real excerpt: 1 mission place with rotations A/B/C, 1 enemy source in `resourceByAvatar`, 1 relic, 1 blank-row; copy real markup from the live page)
- Test: `tests/farming/dropTablesParse.test.mjs`

**Interfaces:**
- Produces:
  - `parseDropTablesHtml(html: string): { sections: Record<string, Row[]>, stats: { rows: number, places: number } }` where for **place-style** sections (`missionRewards`, `relicRewards`, `keyRewards`, `transientRewards`, `sortieRewards`, `cetusRewards`, `solarisRewards`, `deimosRewards`, `zarimanRewards`, `entratiLabRewards`, `hexRewards`) `Row = { place: string, rotation: string|null, item: string, rarity: string, chance: number /* fraction */ }`, and for **by-source** sections (`modByAvatar`, `blueprintByAvatar`, `resourceByAvatar`, `sigilByAvatar`, `additionalItemByAvatar`, `relicByAvatar`) `Row = { source: string, sourceChance: number|null, item: string, rarity: string, chance: number }`, and for **by-item** sections (`modByDrop`, `blueprintByDrop`, `resourceByDrop`) `Row = { item: string, source: string, rarity: string, chance: number }` (read the real markup of these three first and adapt only the field extraction, keeping this Row shape).
  - `validateDropTables(parsed, previous?): { ok: boolean, errors: string[], warnings: string[] }`
  - `class DropTablesFormatError extends Error { section, sample }`
  - `KNOWN_SECTIONS: string[]` (the 20 ids listed in spec 4.2)

- [ ] **Step 1: Write failing tests** (`tests/farming/dropTablesParse.test.mjs`)

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDropTablesHtml, validateDropTables, DropTablesFormatError, KNOWN_SECTIONS } from '../../src/lib/deDropTables/parse.js';

const html = readFileSync(new URL('../../src/lib/deDropTables/fixtures/mini.html', import.meta.url), 'utf8');

test('parses place rotations and fractions', () => {
  const { sections } = parseDropTablesHtml(html);
  const rows = sections.missionRewards;
  assert.ok(rows.some(r => r.place === 'Mercury/Apollodorus (Survival)' && r.rotation === 'Rotation A' && r.item === '2,000 Credits Cache' && r.chance === 0.5));
  assert.ok(rows.every(r => r.chance > 0 && r.chance <= 1));
});

test('parses by-source rows with source chance', () => {
  const { sections } = parseDropTablesHtml(html);
  const r = sections.resourceByAvatar.find(x => x.source === 'Vem Tabook' && x.item === 'Neurodes');
  assert.equal(r.chance, 1); assert.equal(r.sourceChance, 0.5);
});

test('unknown section id throws a typed error', () => {
  const bad = html.replace('id="missionRewards"', 'id="missionRewards2"');
  assert.throws(() => parseDropTablesHtml(bad), (e) => e instanceof DropTablesFormatError && /missionRewards2/.test(e.message));
});

test('unrecognised row shape throws, never skipped', () => {
  const bad = html.replace('<tr><td>2,000 Credits Cache</td><td>Common (50.00%)</td></tr>', '<tr><td>2,000 Credits Cache</td><td>Common</td></tr>');
  assert.throws(() => parseDropTablesHtml(bad), DropTablesFormatError);
});

test('rotation groups must sum to 100 within 0.15; exceptions are warnings not errors', () => {
  const parsed = parseDropTablesHtml(html);
  const v = validateDropTables(parsed);
  assert.equal(v.ok, true);
});

test('sharp row-count drop versus previous snapshot is an error', () => {
  const parsed = parseDropTablesHtml(html);
  const previous = { stats: { rows: parsed.stats.rows * 10, places: parsed.stats.places * 10 } };
  const v = validateDropTables(parsed, previous);
  assert.equal(v.ok, false);
  assert.match(v.errors.join(' '), /row count/i);
});

test('KNOWN_SECTIONS lists exactly the 20 documented ids', () => assert.equal(KNOWN_SECTIONS.length, 20));
```

- [ ] **Step 2: Run to verify failure:** `cd /home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center && nice -n 19 node --test tests/farming/dropTablesParse.test.mjs` -> FAIL (module not found).
- [ ] **Step 3: Implement.** Section split `html.split(/<h3 id="([A-Za-z]+)">[^<]*<\/h3>/)`; throw `DropTablesFormatError` for any id not in `KNOWN_SECTIONS` and for any `<tr>` that is not one of the recognised shapes; decode HTML entities; the percent regex is `^(.*?)\s*\((\d+(?:\.\d+)?)%\)$`; chance = percent/100; skip only `class="blank-row"` rows. Place-style: `<th>` with one cell that starts with `Rotation` sets `rotation`, other one-cell `<th>` sets `place` and resets rotation to `null`; two-cell `<td>` rows are `item` + `rarity (chance)`. By-source: `<th>Source</th><th colspan=2>... Drop Chance: p%</th>` sets `source`/`sourceChance`; three-cell rows `['', item, 'Rarity (p%)']`. `stats.rows` = total rows; `stats.places` = distinct `place` or `source`. `validateDropTables`: (a) all chances in (0,1]; (b) for `missionRewards` groups keyed `(place, rotation)` the summed chance must be within 1 +- 0.0015, otherwise **warning** naming the group (never error; documented exceptions: event multi-roll and Duviri tiers); (c) if `previous` given and `stats.rows < 0.8 * previous.stats.rows` -> error `row count dropped ...`.
- [ ] **Step 4: Run tests -> PASS.** Also run a real-data check (read-only, not part of `node --test`): `nice -n 19 node -e "..."` parsing `/tmp/droptables.html` if present, print `stats` and warnings; expected about 10.3k mission rows, 441 places, 4 warnings.
- [ ] **Step 5: Commit** `git add src/lib/deDropTables tests/farming/dropTablesParse.test.mjs && git commit -m "feat(farm-next): DE drop table parser with validation"` (coordinator commits for sandboxed agents).

### Task 2: DE drop-table refresh script and snapshot

**Files:**
- Create: `scripts/de-drop-tables/fetch.mjs`
- Create: `tests/farming/dropTablesFetch.test.mjs`

**Interfaces:**
- Consumes: `parseDropTablesHtml`, `validateDropTables` (Task 1)
- Produces: `export async function refreshDropTables({ cacheDir, fetchImpl = fetch, now = () => new Date() }): Promise<{ status: 'updated'|'not-modified'|'rejected', stats?, errors? }>`; writes `<cacheDir>/droptables.html`, `<cacheDir>/droptables.parsed.json` (`{ sourceUrl, resolvedUrl, lastModified, fetchedAt, sha256, stats, sections }`) atomically (write temp + rename); keeps previous files when rejected.

- [ ] **Step 1: failing tests** using an injected `fetchImpl` returning the Task 1 fixture: (a) first run -> `updated` and both files exist; (b) second run with the fetch returning `304` (assert the request carried `If-Modified-Since` equal to the stored `lastModified`) -> `not-modified`; (c) fetch returns HTML with an unknown section id -> `rejected`, previous files byte-identical; (d) redirect flow: `https://www.warframe.com/droptables` answers `302` with `Location`, follow it once and record `resolvedUrl`.
- [ ] **Step 2: run -> FAIL.** **Step 3: implement** (`redirect: 'manual'` on the first hop so `Location` is captured; then conditional GET on the resolved CDN URL). **Step 4: run -> PASS.**
- [ ] **Step 5:** run once for real: `nice -n 19 node scripts/de-drop-tables/fetch.mjs ~/.cache/kiedas-de-drop-tables` (one request pair), record stats in the commit message. **Commit.**

### Task 3: Wiki store builder (offline)

**Files:**
- Create: `scripts/wiki-store/fetch-revisions.mjs`, `scripts/wiki-store/build.mjs`
- Test: `tests/farming/wikiStoreBuild.test.mjs` with a tiny fixture dir built inside the test (2 lua modules, 1 json module, 1 revisions.json)

**Interfaces:**
- Produces: `export async function buildWikiStore({ luaDir, jsonDir, revisionsFile, outDir, snapshotDate }): Promise<Index>` where
  `Index = { formatVersion: 1, snapshotDate: string, generatedAt: string, modules: Array<{ title: string, file: string, kind: 'json'|'lua', bytes: number, sha256: string, revid: number|null, timestamp: string|null }> }`, sorted by `title`. Module file name = `title` with `/\\:*?"<>|` replaced by `_`, plus `.json` or `.lua` (JSON preferred when both exist). Also `export async function fetchRevisions({ titles, fetchImpl, sleep }): Promise<Record<string,{revid:number,timestamp:string}>>` batching 50 titles per request with `titles=A|B|...` and >=1.2 s between requests (sleep injectable).

- [ ] **Step 1: failing tests:** index sorted and complete; JSON preferred over Lua; sha256 matches file bytes; missing revision => `revid: null` (not an error); `fetchRevisions` makes `ceil(n/50)` requests and calls `sleep(1200)` between them (assert via injected fakes); MediaWiki title normalisation `Module:Enemies/data` preserved in `title`.
- [ ] **Step 2-4:** implement, run -> PASS.
- [ ] **Step 5:** real run (network, polite): `nice -n 19 node scripts/wiki-store/fetch-revisions.mjs` reading titles from `wiki_module_archive/_all_643_titles.json` intersected with files present, writing `wiki_module_archive/revisions.json`; then `node scripts/wiki-store/build.mjs --out src-tauri/data/assets/wiki-store`. Report the resulting size (raw and gzip -6) in the commit message; if raw > 40 MB, gzip each module file (`.gz`, index records `encoding: 'gzip'`) and update tests accordingly. **Commit** the script, tests and the built store.

### Task 4: Wiki store runtime (Rust commands + JS client)

**Files:**
- Create: `src-tauri/src/wiki_store.rs`
- Modify: `src-tauri/src/main.rs` (add `mod wiki_store;` and register the three commands next to the existing `read_file_bytes` registration near line 4588)
- Create: `src/lib/wikiStore.js`
- Test: `tests/farming/wikiStoreClient.test.mjs`

**Interfaces:**
- Rust: `#[tauri::command] async fn wiki_store_index() -> Result<serde_json::Value, String>`; `async fn wiki_store_get(name: String) -> Result<serde_json::Value, String>` returns `{ title, kind, revid, text?: String, json?: Value }` for a title present in the index (reject names not in the index and any path traversal); `async fn wiki_store_refresh(app: AppHandle) -> Result<serde_json::Value, String>` implementing spec 4.1: read the live store dir (`get_data_root()/data/wiki-store`, seeded by copying the bundled store on first run using the same pattern the app uses for other bundled data), ask the MediaWiki API for revisions in batches of 50 with >=1.2 s sleeps, download only changed modules (`?action=raw`), write to a temp directory, verify sha256 and JSON parse for `json` kind, then swap directories atomically and write the new `index.json` last; on any error leave the old store and return `{ status: 'failed', reason }`; return `{ status: 'updated'|'current', changed: n, checkedAt }`. At most one refresh per 24 h unless `force`.
- JS: `export function createWikiStore({ invoke })` returning `{ getIndex(): Promise<Index>, getModule(title): Promise<{title,kind,revid,data:any}> (memoised per title), stale(): Promise<boolean> }`.

- [ ] **Step 1: failing JS tests** with a fake `invoke`: `getModule` memoises (one invoke for two calls); unknown title rejects with a clear message; `stale()` true when `checkedAt` older than 24 h.
- [ ] **Step 2-4:** implement JS (tests pass). Implement Rust conservatively mirroring existing helpers (`write_bytes_atomic`, `write_json_atomic`, `reqwest::Client`, `resolve_path`); **do not compile** (coordinator builds). Re-read the Rust for borrow/async errors twice.
- [ ] **Step 5: Commit.**

### Task 5: Requirements engine

**Files:** Create `src/lib/farmingTargets/requirements.js`; Test `tests/farming/requirements.test.mjs`

**Interfaces:**
- Consumes: catalog shapes as in existing `src/lib/farmingTargets/aggregation.js` (`inventoryData.craftable[]` recipes: `resultType`, `bpName`, `baseName`, `ingredients[{itemType,name,need,have}]`, optional output quantity field: read `src/lib/inventoryParser.js` to find the real field for recipe output count and use it, defaulting to 1 only when the parser guarantees 1).
- Produces: `expandTargets(targets: Target[], ctx: { recipes: Map<string, Recipe>, owned: (itemType:string)=>number }): { leaves: Map<string, { itemType, name, required: number, contributions: Array<{ targetId, quantity }> }>, unresolved: Array<{ targetId, reason }>, errors: Array<{ targetId, kind: 'cycle', path: string[] }> }` implementing spec 9.8 rules 1-10 (ceil batches of `ceil(remaining / outputQty)`, owned intermediates applied once BEFORE expanding, cycle detection => error entry and no partial numbers for that target, unverifiable => `unresolved`, never a guessed quantity).

- [ ] **Step 1: failing tests** (write real assertions): (1) single craft: 2x item needing 3 A per craft -> A required 6; (2) output qty 2, want 3 -> 2 batches; (3) intermediate owned 4 of needed 5 -> only remaining 1 expanded; (4) two targets share A -> one leaf with two contributions summing to required; (5) cycle A->B->A -> `errors` has one cycle entry and that target contributes no leaves; (6) target without a recipe and without acquisition data -> `unresolved`, contributes nothing; (7) permuting target order yields identical `leaves` (JSON-equal after sorting keys); (8) property loop: 200 cases from a seeded PRNG (`mulberry32(0xC0FFEE)`) generating random acyclic recipe graphs (depth<=4, outputQty 1-3) - assert leaf sums equal an independent naive recursive computation and never negative.
- [ ] **Step 2-4:** implement; tests PASS. **Step 5: Commit.**

### Task 6: Ledger

**Files:** Create `src/lib/farmingTargets/ledger.js`; Test `tests/farming/ledger.test.mjs`

**Interfaces:**
- Consumes: `expandTargets` output (Task 5) and `owned(itemType)`, `reservations: Array<{ itemType, targetId, quantity }>`, `priorities: Record<targetId, number>` (optional).
- Produces: `buildLedger({ leaves, owned, reservations = [], priorities = {} }): Array<{ itemType, name, required, owned, reserved, overcommitted: boolean, stillNeeded, usedBy: Array<{ targetId, quantity }> }>` sorted by `stillNeeded` desc, then `name`, then `itemType`. `stillNeeded = max(0, required - owned)` (inventory applied once to the combined total; reservations are a labelled subset of `owned`, never subtracted again); `reserved = min(sum reservations, owned)`; `overcommitted = sum reservations > owned`.

- [ ] **Step 1: failing tests:** the spec 9.8 worked example (required 15, owned 8, reserved 6 -> stillNeeded 7, usedBy Rhino 10 + Lex 5); usedBy sums equal `required`; changing `priorities` never changes required/owned/reserved/stillNeeded (property loop 200 seeded cases); increasing owned never increases stillNeeded; overcommitted flag; stillNeeded never negative; target order permutation invariant.
- [ ] **Steps 2-5:** implement, PASS, commit.

### Task 7: Place index

**Files:** Create `src/lib/farmingTargets/placeIndex.js`, `src/lib/farmingTargets/placeAliases.js`; Test `tests/farming/placeIndex.test.mjs`

**Interfaces:**
- Consumes: parsed drop tables (Task 1 `sections`), wiki modules via injected `getModule(title)` (`Module:Enemies/data/<faction>` JSON `General` blocks with `Planets`/`TileSets`/`Missions`/`Faction`/`Type`; `Module:Missions/data` for node -> planet/type/faction/boss; `Module:Resources/data` for region resources), DE `ExportRegions` rows `{ uniqueName, name, systemName, missionIndex, factionIndex }`.
- Produces: `buildPlaceIndex({ dropTables, wiki: { enemies, missions, resources }, regions }): { byItem: Map<string /*lowercased item name*/, Source[]>, places: Map<string, Place>, audit: { enemiesTotal, enemiesWithLocation, planetMatched, planetTotal, missionMatched, missionTotal } }` with
  `Source = { placeId, item, chance, rarity, rotation: string|null, category: 'mission'|'enemy'|'bounty'|'relic'|'vendor'|'conclave'|'transient'|'sortie'|'container' }`,
  `Place = { id, name, type: 'mission'|'planet'|'enemy'|'bounty'|'relic'|'vendor'|'conclave', level: 'node'|'fixed-boss'|'planet'|'wiki-area'|'source-only'|'unknown', pvp: boolean, area?: { faction?, planets: string[], tilesets: string[], missions: string[] }, badge: string }`. Honesty rules from spec section 3 exactly; Conclave detection: place name contains `(Conclave)` or equals `Weekly Conclave Challenge Reward` or the section/label indicates Conclave (check real names in the data first and list the exact matchers in the module header comment). `placeAliases.js` exports an explicit verified alias table `{ planet: Record<string,string>, tileset: Record<string,string> }`; start EMPTY except entries proven by test data, unmatched names stay unmatched (`audit` reports counts).

- [ ] **Step 1: failing tests** on tiny fixtures: enemy with wiki area -> `level: 'wiki-area'` and area preserved verbatim; enemy without location -> `level: 'unknown'` badge `no listed location`; assassination node with `Boss` -> `fixed-boss`; Conclave place `pvp: true`; item chance rows keep fractions; `audit` counts correct; unmatched planet name stays unmatched (never force-matched).
- [ ] **Step 2-4:** implement; then real-data smoke (not `node --test`): load the real store JSONs from `wiki_module_json/` and the cached parsed drop tables (Task 2) and print `audit`; expected roughly 91% of wiki enemies with any location.
- [ ] **Step 5: Commit.**

### Task 8: Farm-next ranking

**Files:** Create `src/lib/farmingTargets/farmNext.js`; Test `tests/farming/farmNext.test.mjs`

**Interfaces:**
- Consumes: `buildLedger` rows (Task 6) and `buildPlaceIndex` result (Task 7).
- Produces: `rankPlaces({ ledger, placeIndex, filters = {} }): { ranked: RankedPlace[], conclaveOnlyItems: string[] }` where `RankedPlace = { place, coverage: number, coveredItems: Array<{ itemType, name, chance, rotation }>, totalStillNeeded: number, bestChance: number }`; `filters = { minChance?: number /* fraction, default undefined = off */, types?: string[], factions?: string[], tab?: 'all'|'missions'|'enemies'|'planets'|'relics'|'vendors'|'conclave' }`. Rules (spec section 5): coverage = distinct still-needed items (ledger rows with `stillNeeded > 0`) a place can produce after filters; sort by coverage desc, then `totalStillNeeded` desc, then `bestChance` desc, then `place.name`; combined (`tab: 'all'`) excludes Conclave places unless some still-needed item has only Conclave sources (then include with `pvp: true` and `reason: 'Conclave-only source for <item>'`); `tab: 'conclave'` always shows Conclave places; `minChance` removes source rows below the cutoff BEFORE coverage.

- [ ] **Step 1: failing tests:** (1) place covering 2 needed items outranks one covering 1 regardless of chance; (2) tiebreak order; (3) Conclave hidden from `all` when every needed item has a non-Conclave source; (4) Conclave-only item surfaces in `all` with badge/reason (Review Focus 3); (5) `tab: 'conclave'` lists Conclave places always; (6) `minChance: 0.05` drops sub-5% rows before coverage; default (no filter) keeps them; (7) items with `stillNeeded = 0` never create coverage; (8) input order permutation invariance (property loop 100 seeded cases); (9) every `coveredItems[].chance` present (chance shown on every row).
- [ ] **Steps 2-5:** implement, PASS, commit.

### Task 9: Runnable proof script

**Files:** Create `scripts/farming-targets-proof.js`; Test `tests/farming/proof.test.mjs` (runs the script against a fixture set and asserts key output lines)

**Interfaces:** CLI `node scripts/farming-targets-proof.js --inventory <inventory.json> --targets <targets.json> --drop-tables <droptables.parsed.json> --wiki-dir <wiki_module_json dir> --regions <ExportRegions_en.json> [--explain] [--min-chance 0.05]` -> stdout only, exit code nonzero with a clear error for malformed input, unresolved identity, cycle or missing file. Read-only. Prints: input paths with sha256, wiki snapshot date, targets with canonical identities, requirement trees (`--explain`), the ledger table, the Farm-next ranking (top 15) with chances, audit numbers.
Recipes and catalog come from the player's exported `inventory.json` via the same parser the app uses (`src/lib/inventoryParser.js`); if it cannot be imported by plain Node (JSX/Tauri/bare imports), document that in the report and read `craftable` from a `--craftable` JSON produced by a tiny documented extraction script instead. Never invent owned counts or recipes.

- [ ] **Step 1: failing test** running the script (via `child_process.spawnSync(process.execPath, [...])`) on a tiny fixture set in `tests/farming/fixtures/` and asserting: exit code 0; stdout contains `Still needed` header, the fixture's expected numbers, `Snapshot`; malformed targets file -> exit code 1 and `ERROR` on stderr; a fixture with a cycle -> exit code 2 naming the cycle.
- [ ] **Step 2-4:** implement, PASS.
- [ ] **Step 5:** real run against `~/.local/share/kiedas-orbiter-preview/data/user/inventory.json` (read-only) with two or three real targets, one Prime set and one shared ingredient; save raw stdout to `docs/superpowers/evidence/2026-09-24-farm-next-proof.txt` and write a 10-line hand-check worksheet beside it (`...-worksheet.md`) that recomputes two ledger rows by ordinary arithmetic from the printed recipe edges. **Commit.**

---

## Self-Review (spec coverage)

- Spec section 1 (intent, Conclave rule, filter off): Tasks 7-8. Section 2 (screen): out of scope (Stage 2 plan). Section 3 (honesty levels): Task 7. Sections 4.1/4.2 (updates, drop-table parsing): Tasks 1-4. Section 5 (ranking): Task 8. Section 6 (units): Tasks 5-8. Section 7 (verification): property tests in Tasks 5, 6, 8 and proof in Task 9. Section 8 stages 2-4 (screen, relics, 9.8 remainder): separate plans after the user has seen Task 9's numbers.
- Placeholder scan: field-level details that depend on real markup (by-item table shape, recipe output-quantity field, Conclave matchers) are assigned as "read the real data first" steps with the target shape fixed above.
- Type consistency: `Row`, `Index`, `leaves`, `ledger row`, `Source`, `Place`, `RankedPlace` are defined once and reused with the same field names.
