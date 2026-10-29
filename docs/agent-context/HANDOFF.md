# HANDOFF - Kieda's Orbiter Preview (state as of 2026-10-28)

Audience: an AI orchestrator (and the agents it starts) taking over this project. "The maintainer" is the human who owns it.
Previous handoffs (stale, kept for history): `SESSION_HANDOFF_2026-10-03.md`, this file as of 2026-09-30 (see git history).

## 0. Read this first

1. There is ONE app, **Preview**, in the nested repo described in section 1. The public GitHub releases (latest v1.3.4) still come from the old code on branch `main`. Never make Preview the public download until the maintainer makes an explicit 2.0 release decision.
2. Read `/var/home/jedwards/kiedas-orbiter/AGENTS.md` (standing rules, strictly enforced) and `/var/home/jedwards/kiedas-orbiter/.claude/BUILD_AND_DEPLOY_CHECKLIST.md` before touching anything. Summary of the rules in section 2.
3. Run every `git` command and every test from inside the Preview folder (section 1). A commit in the root repo does not change the app.
4. Everything is committed locally in the Preview repo except the files listed in section 5. Nothing from the last two weeks is pushed (section 1).
5. Do not build, deploy, push, merge, close or comment on public GitHub items without the maintainer's explicit go-ahead for that action. Approval for one action does not extend to the next.

## 1. Repos and paths

| What | Path / remote | Notes |
|---|---|---|
| Root repo | `/var/home/jedwards/kiedas-orbiter` (remote `origin` = `https://github.com/GoblinOfChaos/Kiedas-Orbiter.git`) | Holds `AGENTS.md`, `.claude/` (hooks, skills, checklist), `.remember/`, docs, scratchpad. Its `.gitignore` excludes `.preview-work/`. Its branch `preview/stage4` is an OLD line: 53 commits that are not in the Preview repo, and it lacks 434 that are. Do not merge it blindly. |
| **Preview repo (canonical, all app work)** | `/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center`, branch `preview/stage4` | Own `.git`, own `node_modules`. Remotes: `github` = the GitHub repo above, `origin` = the root repo folder. React 18 + Vite + Tailwind front end, Tauri 2 Rust back end in `src-tauri/`. |
| App data (live) | `~/.local/share/kiedas-orbiter-preview/data/{export,user}` | `user/inventory.json` is the single ground truth for what the player owns. |
| App log | `~/.local/share/kiedas-orbiter-preview/data/user/logs/app-YYYY-MM-DD.log` | Read it after EVERY build (section 8, rule 1). Blocked content-security-policy loads appear as `[CSP] blocked ...`. |
| Deployed app | `~/AppImages/kiedas_orbiter_preview.appimage` (+ three rotating `.bak-HHMM` backups) | |
| DE export dev cache | `~/.cache/kiedas-de-export` (`provenance.json`) | Refresh with `node scripts/de-export/de-export.mjs fetch`. |
| Ubuntu 22.04 build container | distrobox `build-u2204` (see the checklist) | For release-compatible Linux builds; not used for normal Preview builds. |

**Push status (decision needed):** `preview/stage4` is 434 commits ahead of `github/preview/stage4` and 21 behind it (the 21 are the old root-repo line). A plain push is rejected and a force push would destroy those 21. Do NOT push until the maintainer chooses: merge the old line, rename the old branch, or push under a new branch name.

GitHub branches other than `main`: `data-updates` holds Data Watch state (do not delete); `ci/linux-release-ubuntu-22-04` and `housekeeping/release-script-branch-and-footer` back open PRs; `agent/*`, `archive/*`, `codex/*`, `cursor/*`, `master`, `fix/data-watch-worldstate-403` are old and can be tidied with the maintainer's approval.

## 2. Standing rules (from AGENTS.md, hooks and job rules)

- **CPU**: every Rust/Cargo build uses `CARGO_BUILD_JOBS=4` and `nice -n 19`. No unthrottled loops or aggressive polling.
- **Plan mode**: present a plan and get explicit confirmation before code changes, builds or deploys. If an unexpected error or discrepancy appears, STOP and report the exact findings before fixing.
- **Delegation**: before delegating, state the provider, the exact model/version and whether it is paid/free; report the same afterwards.
- **No guessing**: game data only from DE WorldState (`https://api.warframe.com/cdn/worldState.php`), DE PublicExport (`https://content.warframe.com/PublicExport/`) and `https://wiki.warframe.com/` (the Fandom wiki is banned). Never invent IDs, formulas or mechanic patterns. Acquisition text for each item is verified one item at a time against that item's own wiki page; no scrape-and-match scripts and no bulk edits of `acquisition_overrides.json`.
- **Public text** (commit messages, PRs, issues, comments): facts only. No AI/tool/provider names, no references to people, no narration of the conversation. A hook rejects such text in shell commands, so write long text to a file with the file-writing tool and pass `--body-file`.
- **Jobs**: every background job launch redirects stdin from `/dev/null`; every test run is wrapped in `timeout 180` and names its test files (never a folder or the whole suite); read a job's log within 2 minutes of launch.
- **Hooks that block commands** (they match command TEXT): build/deploy commands outside the sanctioned wrapper, anything with `tauri`, `cargo build|run`, copies or removal of AppImages or paths containing "artifacts". Put such text in a script file and run the file, or use the sanctioned command.
- **Never kill the running app** or touch windows/screen without being asked. Check whether it runs with `flatpak-spawn --host ps aux | grep -i kiedas` (plain `ps` is blind to the host).
- The running app must stay on the second monitor; flag it if it lands on the main one.

## 3. Working with the maintainer

- Plain language, short answers. No jargon dumps. When a decision is needed, give the question plus 2-3 plain options and a recommendation.
- Never assume. If something cannot be verified from the code, the logs or a primary source, say so. Report faithfully: failures with their output, skipped steps as skipped.
- Do literally what is asked. Do not revert, expand or substitute a plan without permission. Record open asks ("we need to X") the moment they are said.
- Translations are LAST on the list (issue #111 and all other i18n work). Do not start them early.
- The maintainer tests in the running app. After a build, say exactly what to look at and wait; then read the app log yourself.
- Evidence first: reproduce with real data (`scripts/lib/real-data-harness.mjs`) before theorising; check what actually renders (list vs grid, which code path) before reading a component.

## 4. Commands (run from the Preview folder)

| Need | Command |
|---|---|
| One test file | `timeout 180 nice -n 19 node --test --test-concurrency=2 tests/farming/enemyAreas.test.mjs < /dev/null` |
| Parse-check JSX files | `node scripts/check-jsx-parse.cjs src/screens/Market.jsx src/screens/Mods.jsx` (a JSX syntax slip breaks the whole app; run it before every build) |
| Build + deploy | `flatpak-spawn --host distrobox enter dev-fedora -- bash -lc "cd ~/kiedas-orbiter/.preview-work/stage4-command-center && CARGO_BUILD_JOBS=4 pnpm_config_verify_deps_before_run=false nice -n 19 pnpm run preview:build" < /dev/null > $LOG 2>&1` (about 3 minutes incremental; deploys, backs up the old AppImage as `.bak-HHMM`, keeps three) |
| Is the app running | `flatpak-spawn --host ps aux \| grep -i kiedas` |
| Completeness matrix | `pnpm run check:completeness` (real functions, real data; 0 FAIL, 89 CANNOT as of 2026-10-26) |
| Drop chance order check | `nice -n 19 node scripts/check-chance-order.mjs` |
| DE vs mirror drop parity | `node scripts/de-drop-tables/parity.mjs <old DropsAll.json> <de/DropTables.json>` |

Dropping `pnpm_config_verify_deps_before_run=false` makes pnpm try to delete and reinstall `node_modules` and abort on the missing terminal. Reuse the build command exactly.
The harness `loadRealHarness({ locale: 'en' })` is not identical to the packaged app: it reads source files, so it cannot see assets that are missing from the bundle (section 8, rule 5).

Known test state: `tests/i18n/localeCoverage.test.mjs` fails (German and others miss keys such as `wiki.back`; this is the translation backlog). `job-rules.md` also lists a missing wiki fixture in `acquisitionText`; `vendorPlaces` passed 4/4 on 2026-10-27. All farming, security, ui and inventory test files touched this fortnight pass.

## 5. Current state

- App code at Preview commit `9da4658d` is the deployed build of 2026-10-27 15:05 (later commits are documentation only). Rollbacks: `.bak-1448`, `.bak-1455`, `.bak-1505` in `~/AppImages`.
- Uncommitted tracked changes (left on purpose): `docs/agent-context/reports/research-required-2026-10-20.xlsx` and `...-2026-10-21-review.xlsx` (the maintainer's review workbooks: never regenerate over them; read links/comments and copy aside first), `docs/agent-reports/matrix.md` (generated), `tests/.cache/drawer-rows-labels.mjs` (generated cache that is tracked by mistake).
- Untracked, not committed: `tests/.cache/*` (169 generated files), `scratch/`, `scratchwiki/` (22 MB scratch), `scripts/job-limits-guard.py` (hook helper, not wired in this repo's settings), `src/lib/cosmeticName.js` (unreferenced, not from the recent work), `src-tauri/data/assets/data/acquisition_overrides.json.pre-20261018-phaseB` (backup).
- Open pull requests (both on `main`, both need the maintainer to merge): **#140** Linux release on Ubuntu 22.04 without the bundled third-party exporter (AppImage then needs glibc 2.35; verified by a Linux-only test run, see #109), **#137** release script pushes `main` and the Discord footer says "Kiedas Orbiter Update".
- Open GitHub issues: #141 and #138 (automatic Data Watch notices: DE PublicExport fingerprint changed 2026-10-28; official wiki modules changed 2026-10-26), #139 Parts tab filters, #128 item-completeness, #127 Preview-to-Stable promotion, #125 KO badge (blocked on a commissioned icon), #123 and #122 Farm next, #121 data-watch stages 2-4, #120 DE drop tables + wiki store, #118 live verification, #116 WebKit slowness, #111 acquisition text translation (last), #109 backlog.
- Data Watch runs on GitHub (`.github/workflows/data-watch.yml` and `scripts/data-watch/` on `main`, state on branch `data-updates`). DE's firewall returns 403 to GitHub's runners for the WorldState URL; that check now reports "skipped" (PR #136, merged).

## 6. What changed 2026-10-26 to 2026-10-28 (all committed in the Preview repo)

- Relic reward overlay and picker: exact-name matching first, Blueprint circle and BP chip on part cards, picker closes at the reward screen and at end of match, OCR keeps words with a trailing apostrophe, DE `primeSellingPrice` replaces the mirror's ducat value (Bronco Prime Barrel now correct in Market).
- Exalted weapons: searchable on All, no "Unmastered" label (`neverAwardsMastery`).
- Invasion weapon families (Karak/Latron/Strun/Twin Vipers Wraith, Dera/Snipetron Vandal, Sheev, ...) have corrected acquisition drawers; Sheev raw-materials Blueprint hidden.
- Settings: EE.log path field sits next to the Warframe Cache path (Browse, Auto-detect, status line) - verified.
- DE export fetch guard no longer aborts on a record count that only changed by counting rule.
- Farm next: enemy drops from DE's "by avatar" tables (resources, sigils) now appear on the Enemies tab (they were filed as missions); ledger Overcommitted badge; Completed/Archived targets list with Restore; Dashboard shows how many targets are due. The wiki-listed area line on enemy rows was built and then REMOVED at the maintainer's request (do not re-add wiki-derived area text without asking); `enemyAreas.js`, its tests and the bundled wiki store (now in the bundle resources) remain unused by the screen.
- Inventory: filter and sort boxes (Inventory, Mods, Cosmetics) wrap at narrow widths instead of clipping (approach from #41); Prime frames and Excalibur Umbra are excluded from the Subsumed filters (wiki: only non-Prime, non-Umbra frames can be subsumed). Relics and Relic Planner filter rails still scroll sideways on purpose (see section 7).
- Market: riven rows show the "listing unavailable" note as readable text; Warframe.Market errors now say timeout / could not connect plus the cause chain.
- #109 section A complete: content-security-policy tightened to an allowlist (`src-tauri/tauri.conf.json`), AppStream metainfo shipped (`src-tauri/linux/`), Linux release glibc work (PR #140), chunk size accepted.
- Dashboard "Roathe's Oblivion" uses DE's own region names in all languages.

## 7. Work queue, in the maintainer's priority order

1. **Maintainer actions**: merge PR #140 and #137; decide the push strategy (section 1). Then watch the first real release (the Windows and macOS jobs were not test-run; the Windows config no longer lists the exporter).
2. **#109 remaining** (sections B-D): window-resize stutter (needs live profiling with the maintainer; hypothesis: container queries on four screens); WFCD cross-check for Rivens, Syndicates, Nightwave, K-Drive, Necramech, Focus/Amps (no template data in `@wfcd/items`); Sentinel mod count (needs a screenshot of the screen that showed 13/31); four "needs live verification" overlay items.
3. **#118 live checks** (need a game session): BP chip numbers, Blueprint circle, picker close and end-of-match, apostrophe fix ("Styanax Prime Systems Blueprint"); still unexplained: "Cedo Prime Barrel" shown as Blueprint; riven two-card desktop-side mapping; currency-row scrollbar; Reload UI / language change callback error; drop-chance ordering in the overlay; Market tab with owned rivens; mission-source percentage gap (#131).
4. **Farm next (#122, #123)**: the maintainer says it looks fine. Remaining: the compact three-view layout (design), more entry points ("add as target" is on Foundry, Relic Planner, Prime Resurgence and the drawer). Verify visually after changes.
5. **#120 / #121**: DE drop tables are live (`de/DropTables.json`, 53k rows, chance order check passes). Remaining: make the parity report compare matching keys, give the bundled wiki store a real consumer, data-watch stages 2-4, handle #138 and #141 (re-fetch DE export, run `check:completeness`, review diffs).
6. **#128 item completeness**: 89 CANNOT rows (mostly relics, Fass Residue; rule U5 needs a string `.source` plus text/location/relicName/rewardName and descending chances).
7. **Open data work**: Burston / Dual Zoren Circuit rows (resolver `addRoute` defect, maintainer undecided); 120 more weapon/mod/cosmetic-named entries in `wiki-resources-acquisition.json` that make `isResourceItem()` skip their overrides (mods 74, cosmetics 31, companions 11, arcanes 3) - check one by one; ID audit (84 IDs not in DE data, many only in backup files); thin drawers (Velocitus, Komorex).
8. **#139** decide which filters the Parts tab needs; **#116** WebKit degradation (restart is the workaround); **#127** Preview-to-Stable promotion plan; **#125** blocked on the commissioned icon.
9. **Last: translations** (#111): 2,724 templates cover all 12,295 English override entries but only 3% of displayed lines match a template key (keys are whole entries, the drawer shows sentence-split text; fix = key by displayed sentence). New English-only strings from this fortnight (Farming Targets restore/closed list, Dashboard due line) need all 13 other locales; `localeCoverage` already fails.

## 8. Lessons and traps (each cost real time)

1. **Read the app log after every build, not just the build log.** The log (path in section 1) showed what the tightened security policy blocked: inline styles and `browse.wf` images. Both broke screens silently.
2. Rust can hand the front end a remote base URL (`get_cdn_base_url` returns `https://browse.wf`); a scan of the front-end source alone misses it.
3. Tauri adds a nonce to `style-src` at build time, which disables `'unsafe-inline'` there; an explicit `style-src-elem` keeps inline `<style>` blocks working.
4. The tool shell expands `${...}` even inside quoted heredocs, so JS template literals and shell snippets get emptied. Write files with the file-writing tool, or put the code in a script file.
5. The real-data harness cannot see missing bundle resources (the wiki store was never in the bundle resource list for weeks). Check `src-tauri/tauri*.conf.json` resources and the built AppDir when something works in tests but not in the app.
6. `pkill -f <name>` matches your own command text and kills your shell. Use a tracked background command that exits by itself.
7. After `git rm` or any partial staging, run `git status` and check the remote branch content before testing from it (a half-applied commit cost a test run).
8. A scripted merge (`scripts/merge-verified-routes.py`) once deleted about 7,900 lines of `verified-routes.json`. Never run it; apply named keys with round-trip-checked edits. `acquisition_overrides.json` has a known duplicate key (`/Lotus/Weapons/Tenno/Pistol/LatoPrime`); duplicate JSON keys and shell-expanded text have both caused silent data loss.
9. Duplicated readers of the same data drift apart (relic schemas, Prime parts). Before fixing "X missing on screen A", grep every consumer of that export.
10. Confirm a fix is in the Preview repo AND in the built AppImage (the footer shows the build commit and time). `git stash push -- <path>`, rerun the test, `git stash pop` proves a test fails without its fix.
11. Prefer data-driven rules from DE exports over name patterns; name patterns silently dropped items (Vinquibus, Grimoire, Citrine Prime) before.
12. WebKitGTK: never use `scrollbar-width`/`scrollbar-color` (they force a native overlay bar). Use `::-webkit-scrollbar` rules.
13. Resolution order of the acquisition drawer matters: static table, `acquisition_overrides.json`, `verified-routes*.json` (`kind:"drop"` renders only `place`; `kind:"reward"` renders text), `wiki-resources-acquisition.json` (a name match makes `isResourceItem()` skip overrides), then structured routes. Deleting an override as "redundant" can remove the only place two valid routes were combined.
14. Delegated agents edit files even when told read-only: after ANY delegated run, `git status` and `git diff` before committing; state provider, exact model and cost first.
15. DE's firewall blocks GitHub's runners for WorldState; the Data Watch check skips instead of failing.
16. For CI tests of the release workflow: use a temporary branch named like a version (`v0.0.0-ci-testN`) so the version-sync step works, limit the matrix to the Linux job, trigger it with `workflow_dispatch`, then delete the branch, the draft release and any downloaded files (no tag is created for a draft).

## 9. Architecture cheat sheet

- Startup (`src/contexts/MonitoringContext.jsx`): `check_exports` (mirror + DE overlays, 24 h TTL), then `load_all_exports` (Rust merges `data/export/*.json` and DE overlays into `combined_export_cache.json`), then `load_cached_inventory`, then `parseInventory` in a worker (`src/lib/inventoryParser.js`, ~4000 lines). "Using Cached Data" badge = game not running.
- Screens `src/screens/*.jsx`; Preview layouts `src/components/Preview*Layout.jsx`; styles `src/preview/styles/`; i18n `src/lib/i18n/*.json` (14 locales; English keys live under `ui`).
- Inventory tab list = `inventoryData.all` (union of category lists, built in `inventoryParser.js`); `masteryState.js` decides mastery wording (`awardsMastery`, `neverAwardsMastery`, `canBeSubsumed`).
- Acquisition: `src/lib/acquisitionInfo.js` `getAcquisitionInfo()` and the indexes it takes; data in `src-tauri/data/assets/data/*.json`.
- Relics and rewards: `src/lib/relicParser.js` (`exactMatchReward`, `matchRewardText`, `getRewardInventoryContext`), overlays `src/components/overlays/Relic*Overlay.jsx`, Rust `log_scanner.rs` (EE.log scanner) and `ocr.rs`.
- Farming Targets: `src/lib/farmingTargets/` (`requirements.js`, `ledger.js`, `screenModel.js` - the screen's place index is `buildPreviewPlaceIndex`; `placeIndex.js`/`placeAliases.js` are only used by the proof script and tests), drop tables `src/lib/deDropTables/` and Rust `de_droptables.rs`.
- Market: Rust `market.rs`; frontend `src/screens/Market.jsx`, `src/lib/wfmCache.js`.
- DE data refresh in Rust: `de_warframes.rs`, `de_weapons.rs`, `de_recipes.rs`, `de_upgrades.rs`, `de_customs.rs`, `de_relics.rs`, `de_keys_regions.rs`, `de_sentgear.rs`, `de_i18n.rs`, `de_droptables.rs`; wiki store `wiki_store.rs` + `src/lib/wikiStore.js`.
- Security policy: `src-tauri/tauri.conf.json` `app.security.csp` (allowlist; `devCsp` keeps the old permissive policy for dev runs); the inline overlay-preload script in `index.html` is allowed by its SHA-256, so re-hash it (test: `tests/security/csp.test.mjs`) if it changes.

## 10. Definition of done for any item

1. Root cause identified in code and explained in one paragraph.
2. A test on REAL data that fails before the fix and passes after (synthetic fixtures hid most of the bugs here).
3. Related test files (named, with `timeout`) still pass; known failures are reported, not hidden.
4. Committed in small commits in the Preview repo with a factual message.
5. Built, deployed and the app log read, with the maintainer told exactly what to check. Only then is it "fixed".
