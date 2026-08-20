# Handoff — Kieda's Orbiter

Written 2026-08-20 by Claude, handing off to Gemini as the user switches tools. This supersedes
`CLAUDE_HANDOFF.md` (now a short pointer to this file) — that file described an in-progress
acquisition-classification effort and an unresolved Voruna bug, both stale/resolved since. Repo is
clean; the AppImage deployed to `/home/jedwards/AppImages/kiedas_orbiter.appimage` reflects every
fix described below. Nothing is mid-flight or half-finished.

## What this project is

**Kieda's Orbiter** — a Tauri v2 + React desktop companion app for Warframe, forked from
**Cephalon Kronos** (`github.com/glowseeker/cephalon-kronos`, MIT licensed). It reads the live
game's memory (EE.log tailing + a native memory scanner) and DE's own public export data to show
inventory, relic/mod/riven tracking, a Foundry planner, live in-game overlays (relic rewards,
riven grading, a full in-game sidebar), notifications, and more. Rust backend
(`src-tauri/src/main.rs` + siblings), React/Vite frontend (`src/`).

**Start with `ARCHITECTURE.md`** (783 lines, technical reference: subsystems, data flow, file-by-
file map, EE.log trigger patterns) and `README.md` before this file if you need the "how does the
whole app work" picture — this handoff is deliberately about *recent state and process*, not
general architecture. `ARCHITECTURE.md`'s Collectibles section was rewritten today (2026-08-20)
and is now accurate; the rest of that file predates today and should still be reliable.

## Build & deploy — exact process, do not deviate

```bash
# JS-only change: fast, no container needed, just verifies it compiles
pnpm exec vite build

# Any change that needs to reach the actual packaged app (JS OR Rust) — this is the ONLY
# command that produces a real, testable AppImage. A plain `pnpm tauri build` is wrong.
flatpak-spawn --host distrobox enter dev-fedora -- bash -lc \
  'NO_STRIP=1 CARGO_BUILD_JOBS=8 nice -n 19 ionice -c3 pnpm tauri build --bundles appimage'

# Deploy (after confirming the app is closed — see gotcha below):
cp "/var/home/jedwards/kiedas-orbiter/src-tauri/target/release/bundle/appimage/Kieda's Orbiter_1.3.3_amd64.AppImage" \
   /home/jedwards/AppImages/kiedas_orbiter.appimage && chmod +x /home/jedwards/AppImages/kiedas_orbiter.appimage
```

- `NO_STRIP=1` is a hard requirement (exact reason not dug into, but a plain build without it is
  wrong for this project).
- The Rust host machine (Bazzite) lacks `webkit2gtk-4.1`/`libclang`, so **all Rust
  compilation/checking must happen inside the `dev-fedora` distrobox container** — `cargo check`
  cannot run on the bare host.
- **CPU capping is a real, standing user request, not optional politeness.** The user games while
  this app is being rebuilt in the background. Default to `CARGO_BUILD_JOBS=8` (half their 16
  cores) with `nice -n 19 ionice -c3`. If they say they're actively gaming and want minimal
  impact, drop to `CARGO_BUILD_JOBS=4`. Always ask if unsure, never assume full-speed is fine.
- **Never launch the built app from inside the distrobox container** — it breaks live memory-
  scanning (container namespace boundaries block `/proc/<pid>/mem` reads to host processes).
  Always launch the deployed AppImage from the host.

## Critical environment gotcha — sandboxed process checks are blind

**A plain `ps aux` (or any tool call that isn't explicitly routed through the host) inside this
harness's shell runs in a sandboxed namespace that cannot see processes started outside it** —
including the AppImage the user launches directly. This caused a real, repeated failure this
session: `ps aux | grep -i kieda` returned empty (looked like "app is closed") for hours while the
app was actually running the whole time, only discovered when a deploy `cp` failed with
`Text file busy` — the real, unambiguous signal that a process still has that exact file mapped.

**Always check with:**
```bash
flatpak-spawn --host ps aux | grep -i "kieda\|orbiter"
```
before any rebuild or deploy. If a `cp` deploy ever fails with `Text file busy`, that itself means
the app is still running — don't retry the copy, tell the user and wait for them to close it.

## Working conventions this user expects (learned the hard way, multiple times)

- **No unilateral action.** Read the user's message twice before acting. Do exactly what's asked —
  never revert, expand scope, or substitute your own plan without being told to. If a fix
  conflicts with something the code deliberately does differently (see the `ownedCount` item in
  the open backlog below for a real example), stop and flag it rather than picking a side
  yourself.
- **Never guess or infer game data.** This is the single most-repeated lesson across this whole
  project's history, and it bit even this session multiple times before being properly internalized
  each time. Concrete failures from today alone:
  - Shipped a `wikiTotal` "correction" (Somachord/Frame Fighter/Leverian) based on a single wiki
    fetch, without cross-checking against real player save data first — turned out wrong (a real
    save had 58/55 Somachord, over 100%). Fixed properly only after finding `ExportCodex.json`
    (DE's own real catalog) and using that instead of any wiki-derived number.
  - Even the *second* wiki-based correction for Leverian Prex Cards was also wrong — real save
    data had player-found cards under internal DE codenames (`Runner` = Gauss, `Brawler` = Atlas)
    that don't appear on any wiki fetch. The lesson generalizes: **the wiki is not authoritative
    for "does X exist" — DE's own export data is, when it's available.** Always look for a real
    upstream data source before trusting a scraped/researched secondary one, and always sanity-
    check any hardcoded count against real save data before shipping it.
  - A speculative fix (mapping a `Tracking` bitstring to per-item found/unfound status for Kuria)
    looked plausible (aggregate bit-count matched) but a proper check (searching for a unique
    matching window) proved it was coincidental, not a real mapping. It was reverted before
    shipping rather than left in on "probably fine." **Always try to falsify your own fix, not
    just confirm it, especially when the data trail is this indirect.**
- **Verify against real data, not synthetic data, and not just "the build passed."** Every
  behavioral fix this session was checked against real bundled export files and/or a real
  player's save JSON (`~/wfinfo-ng/inventory.json`, a full real Warframe inventory export used
  throughout this session as ground truth — check whether it's still present in a new session,
  it's outside the repo) before being called done.
- **Don't narrate the collaboration in commit messages, PR text, or code comments** — no "user
  pushed back and...". State facts about the code/data directly. Comments in code should explain
  *why* (a non-obvious constraint or history), never *what* (the code already says that).
- **Minimal, non-cutesy code comments** — only where the reasoning genuinely isn't obvious from
  reading the code itself (a surprising real-world data quirk, a deliberate divergence from what
  the "obvious" fix would be, a past incident). Several fixes this session added exactly one such
  comment citing the specific date/incident that revealed the bug — follow that pattern.
- User has standing permission to build/rebuild without asking every single time once a fix is
  ready and the app is confirmed closed, but always confirm closed first (see gotcha above), and
  always ask before anything that risks losing user data or requires judgment (see `ownedCount`
  backlog item).

## Extended session summary (2026-08-19 → 2026-08-20)

Everything below is shipped and deployed. Full narrative detail, file:line references, and the
reasoning behind each fix (including the mistakes and reverts) is in `docs/qa-findings.md` —
treat that file as the authoritative running log, this section is a compressed index into it.

**Bug fixes (all deployed):**
- Relic-reward OCR could show the wrong item name for a slot — a stale candidate pool
  (`fissureStateRef.current.squad_relics` in `MonitoringContext.jsx`) survived across rounds and
  got fuzzy-matched against. Fixed by clearing it on both round-start and round-close.
- 4 real bugs ported from upstream Kronos after a full commit-range diff review (through commit
  `29e3529`): sticky header unpinning after ~1 viewport of scroll (`UI.jsx`), a relic-picker
  fissure-era leak from the pre-mission pool (`log_scanner.rs` + `MonitoringContext.jsx`), an O(n)
  scan in `resolveName` that should've used an existing cache (`inventoryParser.js`), and a prime-
  set completion badge numerator/denominator unit mismatch (`Inventory.jsx`). One upstream fix
  (`ownedCount` semantics) was deliberately **not** ported — see backlog below, it conflicts with
  this fork's own completion-ratio logic.
- Collectibles screen fully reworked: totals now come live from `ExportCodex.json` (DE's real
  catalog, newly added to `EXPORT_FILES`) instead of hardcoded/researched numbers that turned out
  wrong; every item in a category shows (found or not), not just found ones; real per-item
  locations wired for Leverian/Glass Shard/Encrypted Journal/Albrecht's Notes/Nakak/Frame Fighter;
  category-level guide notes + a real wiki link for everything else. See the Collectibles section
  of `ARCHITECTURE.md` (rewritten today) for the full data-flow detail.
- Notification system: 46 of the ~50 translation keys the whole Notification Manager relies on
  were simply missing from `en.json` — not just cosmetic (the dropdown showed raw keys), the
  actual fired-notification title/body text for every trigger except Fissures/Arbitration/Bounty
  was broken the same way (missing-key fallback returns the raw key string). All added with real
  text and correct `{param}` placeholders, cross-checked against each `evaluate*()` function.
- Foundry notifications never actually fired on completion — only in the pre-completion "advance"
  warning window, despite being labeled "Foundry Complete." Added a second, distinct-dedup-key
  notification for the already-finished-but-uncollected case.
- `HotkeyRecorder` (Settings.jsx) silently rejected any keypress without a held modifier (correct
  behavior — bare keys can't be globally captured over a fullscreen game) but gave zero
  explanation, just a color flash. This was the actual reason the user had never once seen the
  in-game sidebar overlay work — not a hotkey bug, a discoverability bug. Now shows real hint text.
- The in-game sidebar overlay had a second, independent, more serious bug: `wiSupplement` was
  referenced in `MirroredMonitoringProvider.jsx` before it was ever defined in that scope — a
  `ReferenceError` thrown on every single overlay open, before `setExportData()` ever ran, which
  meant the overlay's `exportData`/`dict` stayed null forever and it hung on "Loading
  worldstate..." permanently. Fixed by deleting the broken (and already-redundant) block.
- Sidebar overlay resize handle: two compounding bugs, both fixed and confirmed live. (1) no
  `pointercancel` handler, so an interrupted drag never released the "in movement" state. (2) a
  deeper race even after fixing (1): the resize handler grows the *real native OS window* on every
  drag frame via IPC, and a fast drag can move the cursor past where that window's edge currently
  is — once outside the window's actual boundary, the OS stops delivering pointer events entirely
  (no move, no up, no cancel — nothing any JS listener can catch). Fixed by growing the native
  window to its max size once, up front, before the drag starts, and doing all visual resizing via
  CSS during the drag itself, only shrinking the real window to the final size once, at the end.
- Ayatan sculpture cards not opening the acquisition drawer, Windows/macOS updater signing env
  vars, verified acquisition routes for all 6 landing craft, landing craft always showing
  "Unowned" — all fixed in earlier commits this week, see `git log`.

**Investigated and confirmed NOT bugs (don't re-investigate these):**
- `STAT_TO_PRICER` fallback in `Rivens.jsx` — cross-checked every real stat tag across 45 real
  owned rivens (103 stat rolls) against `RIVEN_STAT_MAP`; zero gaps. The "silent guess" fallback
  path is currently unreachable in practice (would only matter if DE adds a brand-new riven stat
  type not yet in the map).
- Wiki.jsx multi-window tab reload — user confirmed live, works correctly.
- Riven polarity icon — data/mapping/asset files all check out; user hasn't yet sent a close-up
  screenshot to fully confirm the rendered position, but nothing in the code looks wrong.

## Open backlog

Full detail in `docs/qa-findings.md`. Highlights:

- **`ownedCount` semantics conflict — needs a human decision, not a code fix.** Upstream Kronos
  fixed `inventoryParser.js`'s prime-set `ownedCount` to sum quantity instead of counting part
  *types*. This fork's `Inventory.jsx` uses that same field as `ownedCount/totalCount` for a
  completion-sort ratio, which requires it to stay a type-count (0..totalCount). Porting upstream's
  fix as-is would break that ratio. Not fixed — flagged, needs the user to decide whether a
  separate "quantity owned" field should be added instead, if that's even wanted.
- **Missing features vs. upstream** (not bugs, real functionality gaps): vaulted tristate filters
  (Relics + Inventory + relic picker toggle — the biggest one, several interlocking pieces),
  Eleanor/Glast vendor checklist tracking, bounty guaranteed-reward lookup (needs adaptation, this
  fork's bounty data source differs architecturally from upstream's), Nightwave challenge
  tracking, relic Omnia era/refinement filters, owned-market-sale dimming on Dashboard, three-state
  component coloring on the Inventory prime-parts grid.
- **Still needs a live check, blocked or partially blocked until now:** Wiki.jsx sidebar-toggle
  reflow (only testable now that the overlay actually loads — was blocked behind the
  `wiSupplement` crash), RelicRewardOverlay session-token race (no manual repro exists, just
  something to watch for), a sub-ingredient tally double-count edge case in `inventoryParser.js`
  (confirmed real but low-impact — a "ready to craft this component" check independently per
  component, not accounting for shared raw resources across multiple components of the same item;
  arguably reasonable as-is).
- **Bigger, deliberately not started, needs explicit go-ahead:** upstream's 34MB IPC bottleneck /
  WebKitGTK OOM crash fix in `load_all_exports` (flagged as real but riskier); an in-app "how to
  use every tab" documentation feature for Settings + GitHub (user explicitly deferred this until
  bugs are done — check whether that's still the priority).
- **Leverian total (25) is the least-confident number currently shipped** — see the
  `ARCHITECTURE.md` Collectibles section for the full reasoning. It's DE's own real export count,
  which is the best available source, but hasn't been independently cross-verified against a
  complete current wiki page. If a better source ever turns up, revisit.

## Where things live

- `docs/qa-findings.md` — the authoritative, chronological running log of every bug found and
  fixed, including the reasoning, the mistakes, and the reverts. Read this before re-investigating
  anything that sounds familiar.
- `docs/upstream-diff-tally.md` — the full upstream Kronos commit-range diff review detail (commit
  hashes, what was and wasn't ported, why).
- `docs/collectibles-guides.md` — a standalone, user-provided (Codex-assisted) research reference
  for Collectibles locations. Not loaded by the app; used as a cross-check source for today's
  Collectibles rework.
- `ARCHITECTURE.md` — technical reference, general architecture + (as of today) an accurate
  Collectibles data-flow section.
- `README.md` — project overview / setup.
- This user also keeps a Claude-specific persistent memory system outside this repo (auto-loaded
  in Claude sessions, not visible to other tools) with standing behavioral rules and project
  context — if picking this project back up in a Claude session later, that context will already
  be there; it is not otherwise duplicated in this repo.
