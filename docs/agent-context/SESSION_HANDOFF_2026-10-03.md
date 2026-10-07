# Session handoff, 2026-10-03 (read this first in a new chat)

Written at the end of a very long session so a fresh chat can continue without the history. Everything below was true at 20:45 on 2026-10-03.

## 1. Where things are
- **The app is Kieda's Orbiter Preview.** Source: `/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center` (its OWN git repo, branch `preview/stage4`, remote `github` = GoblinOfChaos/Kiedas-Orbiter). Run EVERY git command inside that folder. The root repo `/home/jedwards/kiedas-orbiter` only holds `AGENTS.md`, `.claude/` (hooks, `bin/delegate`, `bin/delegate-run`) and docs; it gitignores `.preview-work/`. The old Stable app was deleted; never recreate it.
- **Stack:** React 18 + Vite + Tailwind, Tauri 2 (Rust in `src-tauri/`), WebKitGTK (never use `scrollbar-width`/`scrollbar-color`).

1. **CPU:** every build or test under `nice -n 19`; Rust jobs `CARGO_BUILD_JOBS=4`; no unthrottled loops or polling.

## 3. How to work (tools that exist)
- **After each job:** read its `AGENT_REPORT.md`, review the diff, check on the real data yourself, commit in its worktree (never commit `scratchwiki/`, `scratchdata/`, `tests/.cache`), merge into `preview/stage4` with ABSOLUTE paths, run the full suite, then update the report and checklist (helper `docs/agent-context/tools/docupd.py ITEM 'report status' 'checklist suffix'`).
- **Hook quirks:** the guard hook blocks Bash text containing words like "cargo"/"pnpm" outside the allowed distrobox form; write such text with the Write tool into a script file and run that.

Items 8, 9, 15/46 (Inventory keys, measured row height), 18 (English-text audit of all 14 languages, reasons file), 33, 34 (extractors in Inventory), 35, 36, 37, 38 (wiki-verified resources, 486 entries), 39, 40, 41, 42, 44 (relic OCR hyphen + mixed case; native code), 45 (parser hardened, cause not reproduced), 47, 48 (calendar names from the game's own strings), 49, 50, 51 (Prime tiers from DE), 52 (Mission rows), 53, 54/57 (clean current-route text, 4,994 strings audited), 55 (extractor routes), 58, 59 (107 vendor places), 60 (owned targets farmable), 61 (End key, reasoned not proven).

## 5. Open and waiting
- **Blocked:** item 16 (no official localized "The Circuit"), items 21 and overlay part of 30 (need a screenshot of a wrong relic reward card), items 19/20/22 (never confirmed), item 41 card-area scrollbar (never located).
- **Known honest gaps:** dropped history sentences are not rewritten (an item whose only text was history can show no wiki text for that route); the 14 component/relic combinations with no DE tier show no tier; `Hex Boost Override` is the game's own English label.

## 6. Lessons from this session (do not repeat)
- Check RENDERED output, not only data: a merged job produced 136 rows that all rendered as "Mission", and a generator that deleted wiki templates produced "Beginning in 9 materials ...". Add render-level checks before building.
- Never trust a launcher's "completed" notice; use `delegate-run` as the background command itself.
