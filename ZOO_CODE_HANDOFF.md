# Kieda's Orbiter — Handoff to Zoo Code (2026-07-22)

## Project

**Kieda's Orbiter** — a Linux + Windows Warframe companion app (inventory tracking, relics, rivens, market prices, a relic-reward OCR overlay that watches EE.log and screenshots the reward screen).

- **GitHub:** https://github.com/GoblinOfChaos/Kiedas-Orbiter
- **Language:** Python (PySide6 GUI, most of the app) + Rust (`orbiter`, the OCR detector binary — `src/bin/main.rs`)
- **Owner:** Jacob — no coding background, needs hands-on fixes and plain-English explanations, not code dumps to self-implement.
- **Nothing in this session has been committed to git.** `git status` will show ~35 modified files and ~30 new untracked files. Standing rule: never commit unless Jacob explicitly asks.

There's an older `ZOO_CODE_HANDOFF.md` from 2026-07-13 that Jacob deleted — this one replaces it. If you find it in git history, the "architecture facts" section from it is still accurate and reproduced below; the "how I disappointed him" section from that one is historical and not worth re-reading.

---

## IMPORTANT environment gotcha (read this first)

Claude's Bash tool in the session that did this work runs in a **separate sandbox** from wherever Jacob actually launches the app (a `wfinfo` distrobox container). Early in this session, Claude misdiagnosed a broken `.venv` as needing a rebuild, rebuilt it from *its own sandbox's* Python — which is a different interpreter than the one in Jacob's real distrobox — and broke the app launch entirely. Had to be caught and reverted from a backup (`.venv.broken-*`).

**Lesson: never assume your shell environment is the same one the user's app actually runs in.** If something claims to be "broken" in a way that seems too fundamental (can't import a package that's clearly installed), suspect an environment mismatch before touching anything destructive. Ask Jacob to run diagnostic commands in *his* terminal instead of trusting your own shell's results, when in doubt.

Related: `close_behavior` defaults to `"tray"` in `paths.py` — closing the main window doesn't fully quit the app, it minimizes to a system tray icon. If the tray icon itself isn't registering (StatusNotifierWatcher issues are common on some desktops), the app can end up invisibly running in the background with no way to bring it back via UI. When Jacob reports "I can't open the app" or "my fix isn't showing up," the first thing to check is whether a stale process is still running:
```
pkill -f missing-parts.py
```
Python doesn't hot-reload — every code change needs the app fully killed and relaunched, not just the window closed.

---

## What happened this session (2026-07-22, one long session)

### Drop-location / acquisition-source data integration (the bulk of the work)
Nearly every "Collectibles" and "Equipment" tab was showing "check wiki" or blank drop-location info even when real data existed somewhere. Fixed via:

- **`drop_data.py`** (new file) — wraps `dropdata_cache.json` (WFCD/warframe-drop-data, an official DE-sourced random-drop-table dataset, refreshed via `refresh_dropdata_cache.py`). Exposes `find_drop_info(name)` and `find_component_drop_info(parent_name, component_name)` — the latter handles the fact that weapon/warframe components are keyed as `"<Item> <Part> Blueprint"` in the dataset, not just the bare part name (e.g. `"Enkaus Barrel Blueprint"`, not `"Barrel"`).
- Wired into `ARCANE_TAB.py`, `AYATAN_TAB.py`, `MOD_COLLECTION_TAB.py`, `EPHEMERA_TAB.py`, `EMBLEM_TAB.py`, `CAPTURA_TAB.py`, `CONSERVATION_TAG_TAB.py`, and `equipment_tabs.py` (all 9 weapon/warframe/pet tabs).
- For items that aren't random drops at all (Baro Ki'Teer rotations, Nightwave, Syndicate vendors, Dojo research, Kuva Lich/Sister mechanics, Conservation bait+cycle info, Founders-exclusive/permanently-unobtainable items, etc.) — real wiki research was done via many parallel background agents and written to a family of `component_overrides_*.json` files, then merged into **`component_acquisition_overrides.json`** (the one `equipment_tabs.py` actually loads) and per-tab override files (`component_overrides_emblem.json`, `component_overrides_ephemera.json`, `component_overrides_captura.json`, `component_overrides_conservation.json`, `mod_acquisition_overrides.json`).
- **Coverage as of last count:** ~1,057 of 1,065 equipment blanks resolved, 235+ mods/arcanes, 118/119 emblems, 82/83 ephemera, 142/142 Captura scenes, 54/54 conservation tags. The handful of remaining blanks are genuinely unverifiable (a couple of items with no wiki page at all — possibly newer/unreleased content, e.g. "Ax-52", "Efv-5 Jupiter").
- **These override files are hand-built data, not auto-refreshing.** If WFCD's dataset structure changes or new items get added to the game, `drop_data.py`'s lookups will silently return nothing for new items until someone re-runs the research pass. Not wired into any refresh/update pipeline — a good candidate for a future "check coverage" script.

### Wiki link validity (real bug, not just missing data)
`build_wiki_url(name)` in `wiki_links.py` *guesses* a URL from the item's display name — this works for well-documented content (mods, arcanes, weapons, ephemera, conservation animals — all verified to have real individual pages) but **fails for Glyphs, Emblems, and Captura Scenes**, which mostly don't have individual wiki pages at all (confirmed live via direct fetch — e.g. `wiki.warframe.com/w/13angtv_Glyph` 404s). Fixed by pointing those three tabs' Wiki column at the real catalog pages instead:
- Glyphs → `https://wiki.warframe.com/w/Glyphs`
- Emblems → `https://wiki.warframe.com/w/Emblem`
- Captura → `https://wiki.warframe.com/w/Captura`

**Not yet checked:** whether this same problem exists in other tabs beyond the handful spot-checked (Mods, Arcanes, Ephemera, Conservation, weapons/warframes all confirmed fine). If Jacob reports more dead wiki links, check whether the item type is "well-documented" or "mostly cosmetic/event-only" before assuming the per-item URL guess is safe.

### Data-quality bugs fixed
- **Emblem tab was missing 93 of 119 real emblems** — the filter checked `'Emblem' in uniqueName`, but most real emblems use `"Badge"` in their internal path (e.g. `/Lotus/Upgrades/Skins/Clan/OrbBadgeItem` for "Buried Debts Emblem") while the *display name* says "Emblem". Filter now checks the display name instead.
- **Orion & Sirius Warframe listed twice** — it's one quest-reward item with two uniqueNames (`OrionSuit`/`SiriusSuit`), one per in-quest naming choice; only one is ever actually obtainable per account. `populate_equipment.py` now skips the `SiriusSuit` variant.
- **Ephemera tab showing 5 fake "Coronet" cosmetics** — Kaithe-mount cosmetics that use `/Horse/` in their path instead of `kaithe`, so the existing Kaithe-exclusion filter missed them. Fixed.
- **Ayatan tab had a duplicate "Orofusexf" entry** — a Market-listing wrapper (`/Lotus/StoreItems/...`) around the same item as Ayatan Anasa Sculpture, missing its display name in the cache. Excluded `/StoreItems/` paths.
- **Descendia dashboard card showing raw internal codenames** (`RangedArcadiaOnly`, `DT_SHRINE_DEFENSE`, `NC_Darkness`) instead of readable text — the static lookup dict couldn't keep up with new codenames from the live worldstate mirror. Added `_humanize_descendia_code()` as a fallback (strips `DT_`/`NC_` prefixes, splits CamelCase) so unknown codenames degrade gracefully instead of leaking raw text.
- **"Mastered" status was just "owned/used at all"**, not actual Mastery-Rank completion — Bonewidow/Voidrig (and anything else you've started but not fully ranked) showed as mastered incorrectly. Fixed in `populate_equipment.py` to check real XP thresholds (405,000 for weapons, 810,000 for Warframe-class items — the real Mastery Rank affinity-to-rank-30 constants), not simple ownership.
- **Cephalon Fragments tab** had no way to tell "found" from "fully scanned/complete" — added `REGION_SCAN_TARGETS` (3 for Earth/Venus, 5 for most planets, 7 for Pluto/Deimos/Eris/Sedna, sourced from the wiki's Fragment page and cross-verified against Jacob's real save data) and a Status column showing Complete/In Progress.
- **User Guide sidebar icon (📖) wasn't rendering** — it's a full-color emoji while every other sidebar icon is a simple BMP-safe symbol; likely a font-coverage issue. Swapped to `▤`. Also fixed a genuinely corrupted icon on Relic Planner (was showing a literal `�` replacement character) → `▥`.
- **"Need" column in equipment tabs** now shows remaining-needed (recipe total minus what you already hold) for stackable resources, not just the flat recipe total — cross-references `inventory.json`'s `MiscItems`.
- **Set Progress tab** header typo "Parts NEED" → "Parts Needed".

### Performance
**Mod Collection tab took several seconds to load** (~1,600 rows, each decoding+scaling a QPixmap synchronously). Fixed with an icon cache (many mods share identical card art across rank variants — was decoding duplicates) and chunked population via `QTimer.singleShot` so the UI paints and stays responsive instead of freezing for the whole load.

### Dashboard / Status & Tools layout — IN PROGRESS, NOT CONFIRMED WORKING
Jacob reported "a ton of wasted space" via screenshots with circled problem areas. Root cause: several `QGridLayout`/`QHBoxLayout` stretch factors were expanding a spacer to fill the *entire* card width (cards are wide — the dashboard is a 2-column grid with a 3:2 stretch ratio) instead of just pushing content to the edge of a naturally-sized row, leaving big dead gaps between related pieces of text (e.g. a mission name and its own timer).

- First fix attempt (wrap-and-addStretch) just **relocated** the same dead space to a different spot in the same card — Jacob correctly called this out as not actually fixing anything, since he explicitly wants the space *used*, not hidden at a margin.
- Second attempt: reworked `_build_cycles` and `_build_fissures` in `DASHBOARD_TAB.py` into 2-column grids (two locations/fissure-tiers per row instead of one narrow column) with bigger fonts (14-16px), so the cards genuinely use their width. Also bumped `STATUS_TAB.py`'s ACTIONS button size/font and confirmed the grid already had correct equal-column-stretch code from the first pass.
- **This has not been visually confirmed by Jacob yet** — the last screenshot showing "still broken" for the Status & Tools ACTIONS grid may have been from a stale process that hadn't picked up the code changes (see the environment-gotcha section above). **Next step: get Jacob to do a genuinely fresh kill+relaunch and a new screenshot before doing anything else here.** Don't keep guessing at CSS/layout numbers blind — ask for a screenshot with specific areas circled/annotated like he's been doing, it's working well as a feedback loop.

---

## Rules Jacob has set (standing)

- **No manual file edits from Jacob** — zero coding background, all changes go through the AI.
- **No running external/third-party programs without asking first, every single time.**
- **Ask before assuming values** — don't guess at scope; check with him. Don't silently do a "good enough" version of a large task (e.g. don't skip real research and fall back to pattern-guessing) without saying so explicitly and explaining the tradeoff — he will call it out if the effort doesn't match what he asked for ("check wiki isnt acceptable if theres information available").
- **One task at a time**, don't bundle unrelated changes into a single explanation without flagging it.
- **Standing permission to push patch-version release tags** (third digit only) without asking each time — but only if the change touches Rust source (`src/bin/main.rs`). Pure Python/doc changes don't need a release.
- **Verify before claiming something is fixed.** Actually check the real file, real data, real timestamp, real running process — don't infer. This session had a couple of cases (the venv rebuild, possibly the Status & Tools layout screenshot) where not verifying against the *actual* running environment cost real time.
- **When giving Jacob a command to run, always fence it as a standalone copy-paste block**, never inline in prose — established preference from earlier sessions.
- **Bash-tool commands and screenshots may come from a different environment than Jacob's real one** (see environment gotcha above) — when in doubt about whether something is really fixed, ask Jacob to check in his own terminal/his own running app rather than trusting a Bash-tool-side test alone.

---

## Architecture facts (still accurate from the 2026-07-13 handoff)

- **Two-part app:** Python (PySide6 GUI) + a compiled Rust binary (`orbiter`/`orbiter.exe`, the OCR screenshot-and-match detector). Versioned together, built completely separately.
- **Only Rust changes need a new GitHub Release / rebuild.** Python changes take effect the moment the file is saved — no rebuild needed, but the app process itself must be restarted (no hot-reload).
- **The Rust binary must be manually rebuilt** (`cargo build --release --bin orbiter`) after any `src/` change, in whatever environment is actually running the app. Always check the binary's own mtime before assuming a Rust-side fix is live.
- **Windows testing happens on a VM** at `C:\Users\jacob\Documents\Kiedas-Orbiter` (moved off OneDrive due to background-sync issues during zip extraction). No live Warframe process there — `warframe-api-helper.exe` will always report "Process not found" unless a valid `token_cache.txt` was also copied over. That's expected, not a bug.
- **Linux testing happens on Jacob's actual home machine**, `/var/home/jedwards/wfinfo-ng`, inside a `wfinfo` distrobox container (see environment gotcha section — this is NOT the same environment Claude's own Bash tool runs in).
- **Data files that get regenerated periodically** (via a "Refresh Inventory"/"Update Game Data" button in the app, backed by `populate_equipment.py` and similar scripts): `equipment_status.json`, `dropdata_cache.json`, `wfcd_all_cache.json`. Code changes to how these are *built* (e.g. the Mastery XP threshold fix, the Orion&Sirius dedup, the resource "owned" count) only take effect after the next refresh, not instantly — worth mentioning to Jacob when a fix depends on it.
