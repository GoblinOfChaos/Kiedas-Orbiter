# i18n + Data-Source Audit — Cephalon Kronos

Date: 2026-08-04 · Scope: full localization task (15 locales, 607 `ui.*` keys) + data-source
layering (warframe-items / warframe-public-export-plus / DE public manifest).

---

## Executive summary

Three headline findings, in order of user impact:

1. **Game-referencing UI strings were hand-translated instead of using the game's own
   localization.** Verified against the official `dict.{locale}.json` files (the same files the
   app already downloads), the app's translations diverge from what Warframe actually shows in
   ~75% of the checked game-term strings — e.g. Polish Arbitration = **"Arbuz"** (literally
   *watermelon*), German Void Fissures = **"Springbrüden"** (not a German word), Russian
   Standing = "Стоимость" (*price/cost*), Thai Arbitration = "การโหวต" (*voting*). → **Part A**
2. **Roughly half of the localization surface was never wired up.** 288 of 607 keys are
   defined + translated in all 15 locales but never referenced by any `t()` call. Users still
   see hardcoded English for: Mastery rank titles, Inventory tabs/filters/sorts, Mods
   categories, Rivens type/state/sort filters, Notes language labels, mod-image pipeline
   status, plus 30 hardcoded Checklist task names and the Settings sync status text. A second,
   parallel key namespace (`dashboard.*`, `inventory.*`, `mastery.*`, …) still coexists with
   the new `ui.*` keys, and one fragment key (`dashboard.rotates_in`) is actively broken in
   de/ru because it was translated as if it were a template. → **Part B**
3. **The three data sources overlap more than they need to.** Items/names are served by both
   wfcd (`warframe-items`) and the export mirror, mod `levelStats` come from *three* places
   (mirror English, hand-patched `_fixed.json`, DE-manifest locale file), and the DE manifest —
   the authoritative source the app already talks to — is only used for one file out of the
   ~25 it can provide. Stale files (`ExportIntrinsics.json`, `ExportKeys.json`) are never
   cleaned up. → **Part C**

---

## Part A — Linguistic: use the game's own words

### The principle

For any string that names in-game content (game modes, currencies, factions, locations,
rewards), the translation must match what the game itself shows in that locale — not a literal
translation of the English word. Warframe's official localization is already on the user's
machine: `dict.{locale}.json` (downloaded by `check_exports`), and mission types / nodes /
bounty titles / Nightwave challenges already resolve through it at runtime
(`warframeUtils.js`). The `ui.*` pass introduced a *second, hand-written* translation of the
same terms, and it is worse in almost every locale.

### Verified divergences (official dict vs current `src/lib/i18n/*.json`)

"Official" below is extracted from the game's own texts (Nightwave challenge strings,
Junction-rework strings, syndicate titles, item names). 15 locales; ✓ = app matches or is
acceptably close.

#### Sortie — official: `Einsatz` (de), `Sortie` (fr), `Taarruz` (tr), `Вылазка` (ru), `ソーティー` (ja), `출격` (ko), `Mobilizacje` (pl), `Incursão` (pt), `Incursiones` (es), `Incursioni` (it), `突擊任務` (tc), `突击` (zh), `ภารกิจฝ่าวงล้อม` (th), `Вилазка` (uk)

| loc | app now | verdict |
|-----|---------|---------|
| de | Sondermission | ✗ game: **Einsatz** |
| es | Misión de alto riesgo | ✗ game: **Incursión(es)** |
| fr | Mission spéciale | ✗ game keeps **Sortie** |
| it | Missione speciale | ✗ game: **Incursioni** (writes "Incursioni (Sortie)") |
| ja | ソルティ | ✗ game: **ソーティー** |
| ko | 특수 미션 | ✗ game: **출격** |
| pl | Misja elite (ungrammatical) | ✗ game: **Mobilizacje** |
| pt | Sortie | ✗ game: **Incursão** |
| ru | Сорта (transliteration) | ✗ game: **Вылазка** |
| tc | 突擊 | ✗ game: **突擊任務** |
| th | ภารกิจพิเศษ | ✗ game: **ภารกิจฝ่าวงล้อม** |
| tr | Sortie | ✗ game: **Taarruz** |
| uk | Сортя (transliteration) | ✗ game: **Вилазка** |
| zh | 突击 | ✓ |

#### Arbitration — official: `Schiedsgericht` (de), `Arbitramentos` (es), `Arbitrages` (fr), `Arbitrati` (it), `仲裁ミッション` (ja), `중재` (ko), `Arbitraż` (pl), `Arbitragens` (pt), `Арбитраж` (ru), `仲裁` (tc/zh), `การตัดสินชี้ชะตา` (th), `Arbitrasyon` (tr), `Арбітраж` (uk)

| loc | app now | verdict |
|-----|---------|---------|
| de | Arbitration | ✗ game: **Schiedsgericht** |
| es | Arbitraje | ✗ game: **Arbitramentos** |
| fr | Arbitrage | ✓ (game plural: Arbitrages) |
| it | Arbitrio | ✗ game: **Arbitrati** |
| ja | アビビショナリ (garbled) | ✗ game: **仲裁ミッション** |
| pl | **Arbuz** (watermelon!) | ✗ game: **Arbitraż** |
| th | การโหวต (voting) | ✗ game: **การตัดสินชี้ชะตา** |
| tr | Müzakere (negotiation) | ✗ game: **Arbitrasyon** |
| ko / ru / tc / uk / zh | 중재 / Арбитраж / 仲裁 / Арбітраж / 仲裁 | ✓ |

#### Steel Path — official: `Stählerner Pfad` (de), `Route de l'Acier` (fr), `Il Percorso d'Acciaio` (it), `鋼の道のり` (ja), `강철의 길` (ko), `Ścieżka Stali` (pl), `Percurso de Aço` (pt), `Стальной Путь` (ru), `鋼韌之道` (tc), `เส้นทางเหล็กกล้า` (th), `Шлях сталі` (uk), `钢铁之路` (zh); ES/TR keep the English term

| loc | app now | verdict |
|-----|---------|---------|
| de | Stahlpfad | ✗ game: **Stählerner Pfad** |
| fr | Chemin d'Acier | ✗ game: **Route de l'Acier** |
| it | Sentiero Acciaio | ✗ game: **Il Percorso d'Acciaio** |
| ja | スチールパス (katakana) | ✗ game: **鋼の道のり** |
| ko | 스틸 패스 | ✗ game: **강철의 길** |
| pl | Stalowa Ścieżka | ✗ game: **Ścieżka Stali** |
| pt | Caminho de Aço | ✗ game: **Percurso de Aço** |
| tc | Steel Path | ✗ game: **鋼韌之道** |
| uk | Сталевий Шлях | ✗ game: **Шлях сталі** |
| zh | 钢铁之途 | ✗ game: **钢铁之路** |
| es / tr | Camino de Acero / Steel Path | ✓ (ES≈, TR exactly as in-game) |

#### Archon Hunt — official: `Archon Jagd` (de), `Cacería de Arcontes` (es), `Chasse aux Archontes` (fr), `Caccia Archon` (it), `アルコン討伐戦` (ja), `집정관 사냥` (ko), `Polowanie na Archona` (pl), `Caça ao Arconte` (pt), `охота на архонта` (ru), `執政官狩獵` (tc), `ล่า Archon` (th), `Archon Avı` (tr), `архонтові лови` (uk), `执刑官猎杀` (zh)

| loc | app now | verdict |
|-----|---------|---------|
| de | Archon-Jagd | ≈ (game: "Archon Jagd" — drop hyphen) |
| es | Caza de Archón | ✗ game: **Cacería de Arcontes** |
| fr | Chasse à l'Archon | ✗ game: **Chasse aux Archontes** |
| ja | アーカンハント | ✗ game: **アルコン討伐戦** |
| ko | 아크논 사냥 | ✗ game: **집정관 사냥** |
| pl | Polowanie na Arona | ✗ typo: **Archona** |
| pt | Caça ao Archonte | ≈ (game: Arconte) |
| ru | Охота архона | ✗ game: **охота на архонта** |
| tc | Archon Hunt | ✗ game: **執政官狩獵** |
| th | Archon Hunt | ✗ game: **ล่า Archon** |
| tr | Arkon Avı | ✗ typo: **Archon Avı** |
| zh | 阿尔戈斯狩猎 ("Argos"!) | ✗ game: **执刑官猎杀** |
| it | Caccia Archon | ✓ |

#### Nightwave — official: `Nightwave` (de/fr/it/ja/pt/th/tr), `Onda Nocturna` (es), `Gwiezdny Szlak` (pl), `Ночная Волна` (ru), `午夜電波` (tc), `Нічна хвиля` (uk), `午夜电波` (zh), `나이트웨이브` (ko)

| loc | app now | verdict |
|-----|---------|---------|
| es | Nightwave | ✗ game: **Onda Nocturna** |
| fr | Nightwave | ✗ game: **Ondes Nocturnes** |
| it | Ondata notturna | ✗ game keeps **Nightwave** |
| ja | ナイトウェーブ | ✗ game keeps **Nightwave** |
| pl | Nightwave | ✗ game: **Gwiezdny Szlak** |
| ru | Найтвейв | ✗ game: **Ночная Волна** |
| tc | Nightwave | ✗ game: **午夜電波** |
| th | ไนท์เวฟ | ✗ game keeps **Nightwave** |
| uk | Найтвейв | ✗ game: **Нічна хвиля** |
| zh | 夜波 | ✗ game: **午夜电波** |
| de / ko / pt / tr | ✓ |

#### Ducats — official: `Dukaten` (de), `Ducados` (es), `Ducats` (fr/pt), `Ducati` (it), `デュカット` (ja), `두캇` (ko), `Dukaty` (pl), `Дукаты` (ru), `杜卡德金幣` (tc), `Ducat` (th), `Ducats` (tr), `дукати` (uk), `杜卡德金币` (zh)

| loc | app now | verdict |
|-----|---------|---------|
| es | Ducats | ✗ game: **Ducados** |
| ja | ダクタ | ✗ game: **デュカット** |
| ko | 덕카 | ✗ game: **두캇** |
| ru | Дукаеты | ✗ game: **Дукаты** |
| tc | Ducats | ✗ game: **杜卡德金幣** |
| th | ดั๊กแคต | ✗ game keeps **Ducat** |
| tr | Dukatlar | ✗ game keeps **Ducats** |
| zh | 达卡特 | ✗ game: **杜卡德金币** |

#### Other terms with official evidence

| key | loc | app now | official (game text) |
|-----|-----|---------|----------------------|
| void_fissures | de | Springbrüden (not a word) | **Void-Risse** ("Absolviere 10 Void-Riss-Missionen") |
| void_fissures | ru | Бесщелюстые трещины (garbage) | needs verification (likely Трещины Бездны) |
| standing | de | Standing | **Ansehen** ("Erreiche hohes Ansehen bei Solaris United") |
| holdfasts | de | Befestigungen | game keeps **Holdfasts** (faction name) |
| holdfasts | zh | 虔诚者 (the devout) | game keeps **Holdfasts** |
| invasions | de | Invasionen | game: **Invasion** |
| bounty | de | Sternposten | game: **Auftrag** ("Schließe … Aufträge in den Ebenen von Eidolon ab") |
| bounty | pt | Tarefa (task) | game: **Contrato** ("Conclua … Contratos") |
| bounty | fr | Récompense (reward) | game: **Mise à Prix** |
| bounty | it | Missione paga | game: **Taglia** |
| bounty | ja | ボンティ (transliteration) | game: **依頼ミッション** |
| bounty | ru | Награда (reward) | game: **Заказ** |
| bounty | ko | 포상 미션 | game: **의뢰** |
| bounty | th | งานล่า | game: **ภารกิจล่ารางวัล** |
| sorties | pt | Missões Suicidas (!) | game: **Incursões** |

### Terms with no clean standalone key in the dict (need a one-time in-game check)

The WFCD dict only ships item/flavour strings — it has **no** standalone label for
`Sortie`, `Arbitration`, `The Circuit`, `Deep Archimedea`, `SP Incursions`, `Events`,
`Void Storm`, `Cambion Drift`, `Orb Vallis`, `Creds`. For these, extract the term from the
compound strings above (Sortie/Arbitration/Bounty/Steel Path/Archon Hunt) or verify against
the in-game UI for: `the_circuit`, `deep`/`archimedea`, `sp_incursions`, `events`,
`void_storm`, `cambion_drift`, `orb_vallis`, `creds`. Current worst offenders there:
`cambion_drift` zh "坎比昂漂洋" (漂洋 = "sail across the sea"; drift ≈ 漂移), `orb_vallis`
zh "轨道湾", `the_circuit` ru "Циркут", `archimedea` ru "Архимед".

### What's already right

- **Relic eras** are kept Latin in every locale (`eras` tables) — correct, matches the game.
- `baro_kiteer`, `deimos`, `cetus`, `duviri`, `zariman`, `cavia`, `hex`, `steel_path` (es/tr),
  `nightwave` (most locales) are handled as proper nouns.
- `tc` vs `zh` are genuinely distinct translations (515/607 keys differ) — good.

---

## Part B — Structural findings

### B1. Two parallel key namespaces with overlapping content

`en.json` mixes new `ui.*` keys (added in `8dd18ca`) with legacy bare keys from earlier
phases — inside the *same* `ui` object:

- templates: `ui.dashboard.remaining` = "{time} remaining", `ui.inventory.build_time` = "Build time: {time}"
- fragments: `dashboard.remaining` = "remaining", `inventory.build_time` = "Build time:"

Both are live: the fragments are used with string concatenation (`{t('dashboard.remaining')}` +
`{timeRemaining(...)}`), the templates exist but are **never called** (see B2). Namespaces are
also inconsistent: `nav.*`, `screen.*`, `sync.*`, `mastery.*`, `mods.*`, `settings.*`, …
have no `ui.` prefix while `ui.comp.*`, `ui.dashboard.*`, `ui.inventory.*` do.

**Live bug from this split:** `dashboard.rotates_in` is a *fragment* ("ROTATES IN", appended
with a time string at the call site), but de/ru translated it as a template:
`ROTATION in {time}` / `ЧЕРЕЗ {time}` — users in those locales literally see `{time}`.
(Verified: `t()` does no interpolation; the only placeholders ever substituted are done by
hand at call sites.)

### B2. 288 of 607 keys are dead — the UI still shows hardcoded English

A scan of every `t('…')`/`t(\`…\`)` call shows the following user-visible surfaces never
reference their (fully translated!) keys:

| Surface | Hardcoded in code | Keys that exist but are unused |
|---------|-------------------|--------------------------------|
| Mastery rank titles | `MR_CLASSES` / `RANK_NAMES` arrays in `Mastery.jsx` | `mastery.title_*` (15) |
| Mastery categories | `Mastery.jsx` | `mastery.cat_*` (19) |
| Inventory tabs | `INVENTORY_TABS` in `Inventory.jsx` | `ui.inventory.tab_*` (11) |
| Inventory filters | `FILTER_CONFIG` | `ui.inventory.filter_*` (14) |
| Inventory sorts | sort dropdown | `ui.inventory.sort_*` (7) |
| Mods categories | `CATEGORIES` in `Mods.jsx` | `mods.cat_*` (17) |
| Mods sorts | `SORT_CRITERIA` | `mods.sort_*` (5) |
| Mod image pipeline | status strings | `mods.extracting/compositing/preparing/processing` |
| Rivens type/state/sort | `TYPE_TABS`/`STATE_TABS`/`SORT_CRITERIA` in `Rivens.jsx` | `rivens.type_*`, `rivens.state_*`, `rivens.sort_*` (19) |
| Notes language labels | `codeBlockLanguages` in `Notes.jsx` | `notes.lang_*` (11) |
| Dashboard card titles | `Dashboard.jsx` | `ui.dashboard.bounty`, `steel_path`, `void_storm`, `fissures`, `arriving_in`, `rotates_in`, `remaining`, `synced`, `challenge`, `select_a`, … (the bare `dashboard.*`/`ui.dashboard.*` split) |
| Notification triggers | `TRIGGER_DEFINITIONS` in `notificationManager.js` | none exist |
| Checklist task names | `window.__checklistTasks` in `MonitoringContext.jsx` (30 labels) | none exist |
| Settings status bar | `setStatusText('Syncing active' …)` etc. | none exist |
| Maps placeholder | `"Image unavailable"` in `Maps.jsx` | none exist |

Also note `console.log('notificationManager loaded')` — a debug leftover in production code.

### B3. `t()` is a raw lookup, not an interpolator

`UiContext.jsx`: `const v = stateRef.current.ui[key]; return v != null && v !== '' ? v : key`.
Consequences:

- Falls back to the **raw key string** (`ui.dashboard.sortie`) instead of English when a key
  is missing — user-hostile.
- No `{placeholder}` interpolation → every caller reinvents it (mostly by concatenating
  fragments, which is what caused B1's bug).
- Recommendation: `t(key, params)` that substitutes `{name}` tokens and falls back to
  `en.json`; migrate the fragment call sites to full templates (`ui.dashboard.remaining` =
  `{time} remaining` → `t('ui.dashboard.remaining', { time })`).

### B4. Semantic duplicate keys

Same meaning under two keys (some with drift, e.g. `mastery.ready`="READY" vs
`ui.inventory.ready_status`="READY" vs `ui.inventory.ready`="Ready"): `ui.toast.more` vs
`toast.more`; `ui.dashboard.challenge` vs `dashboard.challenge`;
`ui.inventory.set_count` vs `inventory.set`; `ui.inventory.fetching_plat` vs
`inventory.fetching_plat`+`inventory.fetching_of`; `mastery.current_rank_n` vs
`mastery.current_rank`; `mastery.next_rank_code` vs `mastery.next`; `ui.relic_reward.bp` vs
`relics.bp_close`. Consolidate to one template each.

### B5. Recommended end-state structure

1. Single namespace: drop the `ui.` prefix or apply it everywhere (prefer dropping it and
   keeping the domain prefix: `dashboard.sortie`, `inventory.tab_warframes`, …).
2. One template per string, placeholders via `t(key, params)`; delete fragment keys and their
   concatenation call sites.
3. Game-content strings resolve through the dict where a key exists (Nightwave →
   `/Lotus/Language/Syndicates/RadioLegionTitle`, mission types → `MissionName_*`, nodes,
   factions — the machinery already exists in `warframeUtils.js`); the JSON table keeps only
   what the dict cannot provide, aligned with official terms (Part A).
4. Delete unused keys (B2) or wire them; add keys for the hardcoded surfaces (checklist task
   labels, status text, notification trigger labels, Maps placeholder).
5. Keep `rivenStats` as a functional OCR table, but derive it from the game manifests
   (as `GAME_STAT_ALIASES` already does for de/fr) instead of hand-translation — it must match
   the on-card text exactly (note: de "Puncture → Durchdringung" collides with Punch Through;
   the alias override exists for a reason).

---

## Part C — Data sources: duplication & redundancy

### C1. The three sources and what each actually provides

| Source | Provides | Used for |
|--------|----------|----------|
| `warframe-items` (npm → `wfcd-combined.json`, bundled) | English item catalog: names, images, mastery, polarities | primary item maps (`WI_*`), merged per-table over exports (`mergeWithOrig`) |
| `warframe-public-export-plus` (GitHub mirror → `data/export`) | 21 `Export*.json` (English) + `dict.{locale}.json` (localization) | fallback item maps, worldstate tables, all name localization |
| DE public manifest (`content.warframe.com/PublicExport`) | `index_{locale}.txt.lzma` → currently **only** `ExportUpgrades_{locale}.json` | localized mod `levelStats` (+ literal mod names where the dict lacks them) |
| (supporting) oracle.browse.wf | `supp-dict`, worldState, bounty-cycle, arbys/sp-incursions.txt | dict supplements, worldstate fallback |
| (supporting) warframe-drop-data | `DropsAll.json` | drop index |

### C2. Redundancies found

1. **Two full item catalogs maintained in parallel.** `MonitoringContext` indexes both
   `Export*` tables *and* `WI_*` maps into the same `EI`/`nameToImage`/`uniqueNameToName`
   indexes, and `inventoryParser` merges `WI_*` with `Export*` per table
   (`mergeWithOrig`, "Entries missing from WI are supplemented from the original
   public-export-plus data"). Same items, two sources, two shapes, one merge layer on top.
   Since `warframe-items` is generated from the same DE exports, one of them is sufficient as
   the primary; the other becomes a documented fallback only (or drops out).

2. **Mod `levelStats` come from three places.** (a) mirror `ExportUpgrades.json` — verified:
   still **no** `levelStats` (1/1601 entries); (b) hand-patched bundled
   `ExportUpgrades_fixed.json` (1596 keys, 1462 with `levelStats`) — labelled "Temporary:
   use patched exports with levelStats until upstream ships them" — upstream still doesn't
   ship them, but **the DE manifest does** (`ExportUpgrades_en.json` exists in the same
   `index_en.txt.lzma` the app already parses); (c) `ExportUpgrades_{locale}.json` from the
   manifest for non-English. → The "temporary" bundled patch can be retired by downloading
   `ExportUpgrades_en.json` from the authoritative manifest, same code path as (c).

3. **The DE manifest is underused.** The app downloads the manifest index but only ever
   fetches `ExportUpgrades_{locale}.json`. The same index would give fully localized
   `ExportWeapons_{locale}`, `ExportRegions_{locale}`, `ExportChallenges_{locale}`, etc.
   Whether that's worth it is a product decision (dict.json already covers name
   localization), but the current state is: authoritative source connected, one file used.

4. **Stale files never cleaned.** `ExportIntrinsics.json` and `ExportKeys.json` sit in
   `data/export/` but are not in `EXPORT_FILES` (removed from the download list at some
   point; leftovers persist). Locale `ExportUpgrades_{locale}.json` files also accumulate
   across locale switches and are only refreshed for the *current* locale.

5. **dict.json is single-slot.** It's overwritten on every locale switch (one file per
   install), so switching locales re-downloads the whole dict, and old locale dicts are gone
   (the 6 stale `ExportUpgrades_*` files prove locale history lingers). If multi-locale
   retention is wanted (e.g. sidebar + main window on different locales), name dicts
   `dict.{locale}.json` again — the code still has `dict.en`/`supp-dict-en` fallbacks from
   the old scheme.

### C3. Quick wins

- Delete `ExportIntrinsics.json`/`ExportKeys.json` from `data/export` (dev cache) and add a
  cleanup pass in `check_exports` for files not in `EXPORT_FILES`.
- Replace `ExportUpgrades_fixed.json` with manifest `ExportUpgrades_en.json`; drop the
  "Temporary" merge path in `inventoryParser` once verified byte-identical in coverage.
- Verify `levelStats` coverage parity: manifest en vs `_fixed.json` (1462 entries) before
  removing the bundled file.

---

## Fix plan (priority order)

1. **Correct the game-term translations** (Part A table) in all 15 locale JSONs — highest
   user-visible impact, pure data change.
2. **Fix the `dashboard.rotates_in` bug** (de/ru) — move to the template key
   `ui.dashboard.rotates_in` and interpolate.
3. **Wire the dead keys** (B2): Mastery titles, Inventory tabs/filters/sorts, Mods
   categories/sorts, Rivens tabs, Notes languages — replace hardcoded arrays with
   `t('…')` lookups (they're already translated in all locales!).
4. **Key the hardcoded surfaces**: 30 checklist task labels, settings status text,
   notification trigger labels, "Select a", "Image unavailable".
5. **Consolidate namespaces** (B5): single prefix, delete fragments & duplicates, `t(key,
   params)` with English fallback.
6. **Data-source cleanup** (C3): retire `_fixed.json` via manifest, stale-file cleanup.
7. Re-run `pnpm run build` + spot-check Dashboard/Inventory/Mods/Rivens/Mastery in de, pl,
   ru, zh.
