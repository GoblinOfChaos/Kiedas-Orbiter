# HANDOFF - Kieda's Orbiter Preview (state as of 2026-09-30)

Written for: GitHub Copilot HydraFusion and the models it orchestrates (Claude, Codex, Antigravity) continuing this work. You cannot see the previous chats or the Claude Code memory; everything you need is in this file and the files it points to. Where something is unverified it says so. Do not guess - check.

## 0. Read this first

1. There is ONE app: **Preview**. The old "Stable" app was deleted on 2026-09-29. Never recreate a root `src/`, `src-tauri/` or `package.json`.
2. **Two separate git repositories** exist here. This caused weeks of "fixed but not fixed":
   - Root repo `/home/jedwards/kiedas-orbiter` (branch `preview/stage4`). It now holds only docs, `.claude/`, `AGENTS.md`, `.remember/`. It gitignores `.preview-work/`. Its old Stable history is preserved under git tag `stable-final` (`3e479918`).
   - **Preview repo `/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center`** (own `.git`, branch `preview/stage4`, remotes `github` = GoblinOfChaos/Kiedas-Orbiter and `origin` = the local root path). **This is the app you build and ship.**
   - Fourteen recent fix commits were made in the ROOT repo, so the Preview app never received them. Run every `git` command from inside the Preview folder. A commit in the root repo does not change the app.
3. The user runs the deployed AppImage `~/AppImages/kiedas_orbiter_preview.appimage`. You cannot see their screen. "Done" means verified on real data in tests AND confirmed by the user in the running app.
4. Nothing from this session is committed. Do not commit, push, build or deploy without asking (rule 2 below).

## 1. Standing rules (from AGENTS.md - the user enforces these strictly)

- **CPU**: every Rust/Cargo build uses `CARGO_BUILD_JOBS=4` and `nice -n 19`. No unthrottled loops or polling.
- **Plan first**: no code changes, builds or deploys without presenting a plan and getting explicit confirmation. If you hit an unexpected bug or discrepancy, STOP and report the exact findings before fixing.
- **Primary sources only, no guessing**: game data only from DE WorldState (`https://api.warframe.com/cdn/worldState.php`), DE PublicExport (`https://content.warframe.com/PublicExport/`), or `https://wiki.warframe.com/`. **Fandom is banned.** The player's `~/.local/share/kiedas-orbiter-preview/data/user/inventory.json` is the only truth for what they own; what a screen displays is never evidence of ownership.
- The Claude Code hooks (`.claude/hooks/guard-*.sh`) that used to block risky commands do **not** run under Copilot. You are the safety net: never run `cargo build` / `pnpm tauri build` directly, never `rm`/`mv`/`cp` anything under `~/AppImages/` or `~/.local/share/kiedas-orbiter*`, never close the running app.

## 2. Decisions the user has made (do not relitigate)

- **Inventory tab = the full catalog**: every item that can exist in a Warframe inventory (equipment, Prime parts/blueprints/components, resources, fish, gems, plants...), owned AND unowned, with ownership marked. Existence and ownership are separate facts. It excludes cosmetics/glyphs; Mods, Relics and Rivens have their own screens. Never write "absent by design because the player doesn't own it". An earlier agent did, it was wrong, the user was furious. If an item isn't listed, that is a bug.
- **Prime Sets is a card view, not an inventory list.** Prime parts must also be findable as individual items in Inventory (All and Parts tabs). Both now work in code (section 4).
- Items must never be silently hidden. If something doesn't fit a category, give it a findable home.
- Foundry = every craftable (recipe) item.
- Do not look at, edit or mention Stable. Do not take over the user's mouse/keyboard while they are at the computer.
- The user writes tersely and gets angry when messages are misread or pushed back on. Read each message twice, answer what was asked, quote their words when confirming understanding, and say plainly when you don't know.

## 3. Repo map and commands

Preview repo root: `/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center` (React 18 + Vite + Tailwind front end, Tauri 2 Rust back end in `src-tauri/`). It owns its own `node_modules`, `package.json`, `pnpm-lock.yaml`.

| Need | Command (run from the Preview folder) |
|---|---|
| Tests (120 pass as of now) | `nice -n 19 node --test 'tests/farming/*.test.mjs' 'tests/completeness/*.test.mjs' 'tests/relics/*.test.mjs' 'tests/ui/*.test.mjs' tests/dropAttribution.test.mjs` (Node 24; this Node version does not accept directories, use globs) |
| Build | `flatpak-spawn --host distrobox enter dev-fedora -- bash -lc "cd ~/kiedas-orbiter/.preview-work/stage4-command-center && CARGO_BUILD_JOBS=4 pnpm_config_verify_deps_before_run=false nice -n 19 pnpm run preview:build"` (~1 min; on success, deploys to `~/AppImages/kiedas_orbiter_preview.appimage`) |
| Deploy | same wrapper with `node scripts/run-preview.mjs deploy` (manually re-deploys the latest build; hardlink-backs-up the old AppImage to `.bak-HHMM`, then hardlinks the new one in) |
| Is the app running? | `flatpak-spawn --host ps aux \| grep -i kiedas` (plain `ps` is blind to the host from the sandbox) |
| Completeness matrix | `pnpm run check:completeness` (runs real functions on real data) |

Environment facts: the sandbox has no C/C++ toolchain, so builds must run in the `dev-fedora` distrobox; host commands go through `flatpak-spawn --host`. `CI=true` avoids a pnpm TTY prompt. Keep npm and Cargo Tauri plugin versions in lock-step (`@tauri-apps/plugin-X` vs `tauri-plugin-X` major.minor) or `tauri build` refuses. Current: core tauri 2.12.0, plugin-http 2.8.0, plugin-updater 2.13.1, plugin-dialog 2.8.0.

Data locations: `~/.local/share/kiedas-orbiter-preview/data/{export,user}` (logs in `user/logs/app-YYYY-MM-DD.log`), DE cache `~/.cache/kiedas-de-export`. Local wiki research archive: `wiki_pdf_archive.sqlite` at the root repo folder.

## 4. What changed this session (all UNCOMMITTED in the Preview repo)

Verified on the user's real data with tests; **not yet confirmed by the user in the app**. A build containing all of it was deployed 2026-09-30 12:27.

| Change | Files |
|---|---|
| Shared relic reader for both `ExportRelics` schemas (108 DE relics, all Citrine Prime, use `{name, uniqueName, relicRewards[{rewardName}]}` with no era/category/quality/icon/rewardManifest) | new `src/lib/relicEntry.js`; used by `relicParser.js`, `inventoryParser.js`, `dropsParser.js`, `primeResurgence.js`. Also fixed `mapReward` reading `r.type` instead of `r.rewardName` |
| Unowned Prime parts now exist as Inventory items (ownership gate on `prime_parts.push` removed); Parts tab includes `prime_parts`; Prime Sets tab lists every set | `inventoryParser.js`, `Inventory.jsx` (ports of root commits `310fa84d`, `f6d1326d`, `4e275b83`) |
| Farming ledger: raw resources get images; drawer passes the ledger row's image; farmable resources (e.g. Orokin Cell) are leaves, not expanded through a Foundry recipe (wiki confirms the 100 Platinum blueprint is real; `...Component` recipes still expand) | `src/lib/farmingTargets/screenModel.js`, `src/screens/FarmingTargets.jsx` |
| Scrollbars: removed every `scrollbar-width`/`scrollbar-color` (WebKitGTK draws those as a native overlay bar over content), replaced with `::-webkit-scrollbar` rules, 8px; class `custom-scrollbar` | `index.css`, `Preview*Layout.jsx`, `preview/styles/*.css`, `Inventory/Mods/Cosmetics/Notes.jsx`. Some of my code comments wrongly say `GTK_OVERLAY_SCROLLING=0` is in Preview's `main.rs`; it is not (only the old root had it). Fix those comments |
| Tauri stack updated to 2.12 and plugins; `@wfcd/items` ^1.1276.7 | `Cargo.lock`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` |
| `preview:deploy` script | `scripts/run-preview.mjs`, `package.json` |
| Deleted `docs/PLAN-item-completeness.md`; rewrote the "Prime Parts only when owned" rule in `scripts/item-completeness.mjs` and `tests/completeness/matrix.test.mjs` | |
| New tests | `tests/relics/relicEntry.test.mjs`, `tests/farming/ledgerImages.test.mjs` (each confirmed to fail without its fix) |

## 5. Next steps, in order

1. Ask the user to launch the deployed build and check: Inventory search "citrine prime" shows the Warframe plus 4 parts (Blueprint, Neuroptics, Chassis, Systems, unowned); Farming Targets has no "Orokin Cell Blueprint" row and Argon Crystal etc. have images and drawer sources; Prime Sets lists every set; Relics/Relic Planner still show Citrine (user confirmed these work). Update `docs/APP_CHECKLIST.md` only with what the user confirms.
2. Add a per-screen load summary to the app log (item counts, Citrine hits, relic catalog size, ledger rows without image). The harness in `scripts/lib/real-data-harness.mjs` is NOT identical to the app (the app shows 3508 Inventory items, the harness parse 3360 before today's +317), so a log from inside the running app is the only ground truth you have.
3. Port the remaining root-repo fixes (table below).
4. Investigate the performance problems (section 7).
5. Only then commit, in the Preview repo, in small commits, after asking.

### Root-repo fixes still to bring into Preview

Source of truth for each diff: the root repo (`cd /home/jedwards/kiedas-orbiter`). Its working tree is deleted but history is intact. Technique, run from the root repo: `git show --format= <hash> -- src src-tauri/src | git apply --check --directory=.preview-work/stage4-command-center -` (drop `--check` to apply). Preview's `tests/` and i18n files diverged, so hand-merge conflicts.

| Hash | What | Dry-run against Preview |
|---|---|---|
| `db9ea507` | farming-target images in drawer and ledger | clean, but overlaps my `screenModel.js` change - compare, do not double-apply |
| `94fcc649` | drawer image fix that never took effect | conflict (`FarmingTargets.jsx`) |
| `48848e07` | Target Inspector dropdown clipped; ranked places show planet | conflict (`FarmingTargets.jsx`) |
| `681391d5` | calendar weekday hardcoded to en-US | clean |
| `4208b1cd` | "The Circuit" widget key bug + missing translation | conflict (`de.json`) |
| `c0585e3a` | Farming Targets screen never localized (78 keys) | conflict (`de.json`) |
| `d0bb09fd`, `45d1a88f` | Citrine relics (2nd reward schema); relic reward overlay "Unrecognized" | Preview already has an equivalent via `relicEntry.js` for the screens; the OVERLAY path (`dropsParser.js`/OCR candidate pool `getAllRelicRewards`, `RelicRewardOverlay`) still needs checking in the running game |
| `5d0be213` | DE-mirror merge kept stale name/description | clean |
| `08a9a8a6` | Prime component ownership used a path-suffix guess | conflict (`inventoryParser.js`) |
| `3e479918` | riven two-card desktop-side mapping | conflict (`RivenOverlay.jsx`) |
| `095344b7` | GTK overlay scrolling env var | NOT needed; CSS fix replaced it |

## 6. Backlog

From the user's own list in an earlier chat (statuses NOT verified by this session):

- Recheck, previously "fixed" but failed: farming target images; Citrine relics everywhere; Farming Targets fully German (78 strings).
- Retest: riven single-card grading; Target Inspector dropdown clipping; Farm Next planet+node display; calendar weekday locale; "The Circuit" translation.
- Known root-caused, not fixed: which desktop side shows which riven card; currency scrollbar (needs a fresh look); "ROATS OBLIVION" (find which widget it is).
- Untouched: drop-chance ordering; language-change bug; Market tab riven filters; GitHub issue #109 leftovers; mission-percentage gap (#131); Circuit/Farming Targets translations for the other 13 locales.

Found this session: relic type count changed 796 -> 769 between two builds (unexplained; note it after the new build); dead CSS `html:not(.is-overlay)` at `src/index.css` (the class is never set); Cosmetics "MISSING" pill probably means "not owned" (unconfirmed); `STAT_TO_PRICER` has no mapping for "Combo Count" (app log warning); Rust `de_relics.rs` merge field list only knows the old relic schema (it only lists fields to copy, not a reader - low risk).

## 7. Performance problems reported by the user (not investigated)

- Every screen switch takes 4-6 seconds to render (Mastery, Relics, Farming Targets, Adversaries, Wiki, Settings worst). Sidebar highlight changes instantly but content lags, so it looks like routing failed; it is not.
- The app "refreshes" every time the window regains focus, and runs very slowly even with 40 GB RAM free. Suspect startup re-running (`check_exports`, `load_all_exports`, inventory parse in a worker) on focus; unverified. Profile before changing anything.

## 8. Architecture cheat sheet

- Startup (`src/contexts/MonitoringContext.jsx`): `check_exports` (downloads mirror + DE overlays, 24 h TTL) then `load_all_exports` (Rust merges `data/export/*.json` and DE overlays into `combined_export_cache.json`, the front end loads that) then `load_cached_inventory` then `parseInventory` in a worker (`src/lib/inventoryParser.js`, ~4000 lines). "Using Cached Data" badge = game not running.
- Screens: `src/screens/*.jsx`; Preview layouts `src/components/Preview*Layout.jsx`; styles `src/preview/styles/`; i18n `src/lib/i18n/*.json` (14 locales).
- Inventory tab list = `inventoryData.all` (built in `inventoryParser.js` from warframes, weapons, ..., resources, components, rivens, prime_parts, parts). Prime Sets cards = `inventoryData.primeSets`.
- Relics: catalog `getRelicCatalog`, planner list `getAllRelicRewards`, owned relics in `parseInventory`, all reading through `relicEntry.js`. Each screen used to carry its own copy of the reader - that is the recurring bug class (see section 9).
- Farming Targets: `src/lib/farmingTargets/` (`requirements.js` expands recipes, `ledger.js`, `screenModel.js`, `placeIndex.js`, `relicPlaces.js`), drop tables `src/lib/deDropTables/`.
- Real-data harness: `scripts/lib/real-data-harness.mjs` (`loadRealHarness()` returns `exportsBundle`, `dict`, `EI`, `nameToImage`, `uniqueNameToName`). Copy the pattern in `tests/farming/ledgerImages.test.mjs` for new real-data tests. Test fixtures are not enough: bugs here were invisible on synthetic data.

## 9. Hard-won gotchas

- Duplicated readers of the same data drift apart. Before fixing "X missing on screen A", grep every consumer of that export (`grep -rn ExportRelics src`) and check each one handles every schema variant.
- Always confirm a fix exists in the Preview repo and is in the built AppImage. The AppImage footer shows the build commit and time.
- `git stash push -- <path>` then rerun a test then `git stash pop` is a quick way to prove a test fails without your fix. Do it.
- Changing the order of dict/loc handling or names can silently drop items (Vinquibus, Grimoire, Nunchasa, Citrine Prime all vanished to regex heuristics before). Prefer data-driven rules from DE exports over name patterns.
- WebKitGTK: never use `scrollbar-width`/`scrollbar-color` (see section 4).
- Preview window screenshots by the old tooling: `import -window <id>` gives exact pixel coordinates for `xdotool`; only use GUI automation when the user explicitly allows it and is away.

## 10. Using Claude, Codex and Antigravity together

What earlier orchestration runs taught (this repo, 2026-09-23 to 09-25):

- **Antigravity**: best for read-only research and root-cause tracing; found real bugs fast (two critical ones in Farm-next). But it edited repo files once despite "read-only". After ANY Antigravity run, `git status` and `git diff` the target tree and review before committing.
- **Codex**: good implementer in an isolated worktree (`nice -n 19 codex exec -s workspace-write -c sandbox_workspace_write.network_access=true -C <worktree> -o <final.md> "<brief>"`). It cannot `git commit` inside worktrees; the coordinator commits. Its Rust had 5 compile errors across slices - always compile Rust yourself (in the distrobox, throttled). It once wrote a rule that dropped Vinquibus; review against real data.
- **Claude**: good as coordinator/reviewer: reads whole files, runs the real-data harness, catches cross-consumer drift.
- Rules that held up: give each agent one task and explicit read/write scope; the coordinator re-runs any "real-data evidence" an agent claims (an agent once left stale evidence); merge conflicts in shared wiring files go to one implementer to hand-merge; cross-review each other's diffs; never claim done from data files alone - the user only trusts what they see in the app.
- Suggested split for the next steps: Antigravity profiles the slow navigation and focus refresh (read-only, report only); Codex ports the clean root fixes and the i18n translations in a worktree; Claude reviews each diff, runs the suites and adds the in-app load log; the user does the live check.

## 11. Definition of done for any item

1. Root cause identified in code and explained in one paragraph.
2. A test on REAL data (`loadRealHarness`) that fails before the fix and passes after.
3. The wider suites still pass (command in section 3).
4. Built and deployed with the scripts, after the user said yes to that specific build.
5. The user confirms it in the running app. Record it in `docs/APP_CHECKLIST.md`.
