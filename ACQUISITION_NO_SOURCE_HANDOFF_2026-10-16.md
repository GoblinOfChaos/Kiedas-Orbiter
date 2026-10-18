# Handoff: acquisition no-source / Archive (2026-10-16 evening)

For Jacob’s Agents-window continuation. Orchestrator chat context ends here; files on disk are ground truth.

## Standing rules (do not break)
- Plan mode: no app rebuild / AppImage / deploy unless Jacob explicitly says rebuild.
- CPU: never more than **4 cores** (`taskset -c 0-3 nice -n 19`).
- Game data only from: DE Public Export, WorldState, **wiki.warframe.com** (local `wiki_store` first). **No Fandom.**
- Inventory JSON is ownership ground truth (not relevant to this sheet pass).
- Column **C** (Gemini URLs / “Your answer”) is intentional — **never overwrite**.
- Search snippets are never acquisition. Whole-name match casefold only.
- Package dumps / AlecaFrame = **research/name hints only**, never ship into the app.
- Helminth secretion categories: out of app; leave empty on the unsolved list.
- Operator brows / Somatics: fill only if wiki states a concrete price/source.
- Dual-title fishing spears / some augment mods: leave unresolved unless uniqueName↔name is unambiguous.
- CorufellPrimeBarrel uniqueName display name is **Corufell Prime Stock** (Jacob + Warframe Market scrape). Do not rename to Barrel.
- Rell's Donda: Palladino, Iron Wake, **25 Ducats**, after Chains of Harrow.
- Reject Codex-style “tightenings” that expand short places into mechanic essays (e.g. Duviri fish / Golden Maw 15-fish).

## What the workbook means now
File: `acquisition-without-source.xlsx`

| Sheet | Meaning |
|---|---|
| **No source** | **Unsolved only** — empty column M. ~475 rows last count. |
| **Archive** | Solved — has a short current-route place in column M. ~1,498 rows last count. |
| Summary / Read me | May have stale fixed-range formulas; ignore or fix later. |

Column M = “Where it comes from (from wiki pages)” = the place string.

**Done = place in M → verify → move row to Archive.** Links in C without a place do **not** leave the unsolved list.

## Accept-list
`acquisition-no-source-accept-list-2026-10-15.json` — ship-set of uniqueName→place. Keep in sync when archiving new solves. Note: ~135 places archived in the big wiki pass were **not** all added to accept-list yet; reconcile when convenient.

## Important reports (repo root)
- `acquisition-app-voice-2026-10-16.md` — remade M into short app voice
- `acquisition-empty-m-package-hints-2026-10-16.md` — packages dump join for empty M
- `acquisition-empty-m-market-always-2026-10-16.md` — MM_VISIBLE / AlwaysAvailable wiki fill
- `acquisition-archive-solved-2026-10-16.md` — Archive split + 135 more wiki fills

## Sidecars under `/tmp/wiki-acq-search/`
- `empty-m-package-wiki-hints.json` — uniqueName → package flags + suggestedWikiTitles (may be stale vs current No source)
- `unsolved-app-leads.json` — **176** of then-remaining unsolved had leads in app data (overrides, warframe-items, wiki-page JSON, etc.). Use as hints; still verify on wiki.
- `codex-leaf-wiki-prompt.txt` — ready prompt for the **next** job
- Prompt backups / older fill scripts as needed

## Packages dump (hints only)
`/var/home/jedwards/kiedas-data-work/warframe-packages-bin-data-senpai`  
Path mirror: `/Lotus/X` ↔ `Lotus/X.json` and `Lotus/StoreItems/X.json`.  
`Lotus/Language/` has **no** string table (only LockedForAdd / Unihan) — use LocalizeTag / sheet Game name / wiki.

## App data locations (leads, not auto-truth)
Under `.preview-work/stage4-command-center/src-tauri/data/assets/data/`:
- `acquisition_overrides.json`, `verified-routes.json`, `warframe-items-acquisition.json`
- `wiki-page-acquisition.json`, `wiki-description-acquisition.json`, etc.
- Flawed mods already in app code: Cressa Tal / Iron Wake voice in `acquisitionInfo.js`
- Bundled export still ~**2026-09-06** (pre-Narin). Post-Narin catalog refresh is a **later** phase; do not rebuild unless asked.

## Claude memory (app place voice)
`~/.claude/projects/-home-jedwards-kiedas-orbiter/memory/feedback_acquisition_current_only.md`  
Short CURRENT routes only; no history/update numbers; do not paste raw wiki paragraphs; expand `{{dc|N}}` → N Ducats, etc.

## Why wiki URLs can remain on No source
Many C links were checked: page names the item but gives **no acquisition** (Operator/Customization brows/Somatics), wrong entity (ability pages for gear names), or hold rules. Stale H column text (“never matched”) is often wrong — trust O / actual M emptiness.

## NEXT JOB (Jacob approved; Codex died on IDE restart — relaunch)
**Method Jacob insisted on:** search wiki API by **uniqueName leaf**, not display name.

Example: leaf `WraithQuestRewardDeco` →  
`api.php?action=query&list=allimages&aiprefix=WraithQuestRewardDeco`  
finds `File:WraithQuestRewardDeco.png` (DEcrypt-style uploads). Also `list=search` ns 0|6; prefer File: hits; ignore noisy Update “deco” hits.

Then: file usage / related pages / wiki_store → short place → M → Archive → accept-list.  
Also consume `unsolved-app-leads.json` as hints (verify on wiki).

**Provider preference:** Codex first — ChatGPT personal CLI `codex exec -m gpt-5.6-sol` (Cursor GPT allowance was exhausted).  
Do **not** combine `--sandbox` with `--approve-for-me` (that killed the first launch). Use `-s workspace-write` alone, or the documented safe equivalent. Cap 4 cores.

Prompt file already written: `/tmp/wiki-acq-search/codex-leaf-wiki-prompt.txt`

Deliverables expected:
- Updated xlsx (No source shrinks; Archive grows)
- Accept-list updates
- `acquisition-leaf-wiki-2026-10-16.md`
- Optional `/tmp/wiki-acq-search/leaf-wiki-hits.json`

## Explicitly not done / later
- Phase B: write accept-list / Archive places into app acquisition data
- Phase C: Public Export refresh + post-Narin new items
- Rebuild AppImage (only when Jacob says so)
- Global non-Flawed “Listed by / export” vendor wording audit

## OnlyOffice
If the xlsx is open, **close without saving** before agent writes, then reopen — otherwise the open buffer can wipe agent edits.

## One-liner for the new agent
Continue Kiedas acquisition no-source: `No source` = unsolved empty-M only; solved live on `Archive`. Next: for remaining No source rows, wiki API `allimages`/`search` on uniqueName **leaf** (+ app leads JSON), verify short current place, fill M, archive, update accept-list; ≤4 cores; never touch column C; no rebuild. Prompt: `/tmp/wiki-acq-search/codex-leaf-wiki-prompt.txt`. Prefer Codex `gpt-5.6-sol` personal CLI.
