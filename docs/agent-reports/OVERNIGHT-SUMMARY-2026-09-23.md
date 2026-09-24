# Overnight run summary (2026-09-23)

Rollback point: git tag `pre-overnight` (commit 633b32d7). Everything below is committed locally on `revamp/stage4-command-center`; nothing was pushed; stable was not touched.
Built binary: `src-tauri/target/release/kiedas-orbiter-preview` (22:43). AppImage packaging still fails at the linuxdeploy step (known), the binary itself is fine. Your running Preview (PID 4121816) is still the older build; restart it to pick this one up.

## What landed
- **Game detection fix** (earlier): process picker matched agent processes instead of Warframe; fixed in Preview and stable trees.
- **Relic 2x Forma**: OCR cleaner no longer drops "2XForma"; it now reads "Forma Blueprint".
- **Riven flow**: restored the two-stage cycle/accept state machine (only real yes/no prompts count, duplicate log line ignored). New big "press [Ctrl+Alt+R] to grade" prompt overlay when the riven screen opens; the hotkey (configurable in Settings) arms the grading overlays; leaving the screen resets everything. Non-Preview builds keep the old automatic behaviour.
- **Riven text**: raw i18n keys ("UI.RIVEN_CARD.TIER_WEAPON") fixed in the overlay and on the Rivens screen.
- **Wiki links** now open the internal Wiki tab (Fandom blocked in Rust too); outside the main window they still open in the browser.
- **Market tab**: owned Rivens included in stock analysis with a clearly labelled local estimate. Unrevealed (veiled/challenge) rivens show "unavailable", never a guessed value. No listing/write code was added (see below).
- **Perf/IPC**: resize handlers throttled (50 ms) in Inventory/Cosmetics/Mods/RelicPlanner; safe reload that waits for in-flight IPC (fixes "Couldn't find callback id"); logger retry now really backs off; internal IPC fetches (incl. https://ipc.localhost) bypass logging; Preview 60 s heartbeat log (`preview.heartbeat`) for the #116 WebKit degradation; temporary `[INV-SCROLL]` diagnostic for the double scrollbar.
- **Data pipeline** (Phase 0-1, shadow only): `scripts/de-export/` fetches DE's live PublicExport into `~/.cache/kiedas-de-export/`; `docs/pipeline/COMPAT-LEDGER.md` compares it with the app's data: DE has **127 Warframes vs 125 in the app (missing: Narin, Citrine Prime)**, 113 more Customs, ~280 more relics/arcanes; `PHASE2-CACHE-DESIGN.md` describes the cache. The app does NOT read any of this yet.
- **Glyph supplement refresh**: browse.wf glyph list now refreshes daily with validation + provenance. browse.wf is a community source outside the strict DE/wiki list: decide whether to keep it.
- Already fixed before tonight (found stale): #112 assets (7 of 8 present; Hawk set is aliased to AeroSet), #114 drawer fallback (Preview drawer now matches the shared drawer).

## Needs your decision
1. **#111 translations**: 5 locales (de/es/pt/ru/zh) have 2,424 translated templates (84%); the other 9 have none. Filling them means machine-translating ~2.4k strings x 9 locales. I did not do this. DE's official localization can supply node/planet/item names for template parameters, but not NPC/vendor names or prose.
2. **Riven listing on warframe.market**: not built. The official docs only describe the normal order API; the riven auction payload and stat url_names could not be verified (see docs/market/RIVEN-LISTING-DESIGN.md).
3. **Keep the browse.wf glyph refresh?** (above)
4. **Adopting the DE pipeline** (Phase 2+): the ledger shows real gaps; the design is ready.

## Needs live verification (I cannot test these without you at the machine)
- Riven screen: prompt appears, hotkey arms grading, cycle -> new roll overlay, accept -> left overlay refreshes, leaving hides all. Press the hotkey twice; try with the game unfocused.
- Wiki link from an acquisition drawer switches to the Wiki tab; a Fandom URL is refused.
- Resize the window narrow, then read `[INV-SCROLL]` lines in `~/.local/share/kiedas-orbiter-preview/data/user/logs/app-*.log` to identify the second scrollbar (wrapping was ruled out).
- Language change / "Reload UI" no longer logs "Couldn't find callback id".
- Market tab with owned rivens; Mastered/Unmastered filters exclude rivens.
- The 14 non-English locales received English placeholder text for the new riven-prompt/market strings.

## Not done
- EE.log Browse/auto-detect UI and profile-badge icon (logged as to-dos).
- Window-resize stutter and #116 need live confirmation (fixes/instrumentation only).
- Full cross-check scripts for Gear/Rivens/Syndicates/etc. and the 15 event-only decorations (need primary-source wiki research).
- Stable app: the process-picker fix is committed there but stable was not rebuilt.

Per-agent reports: `docs/agent-reports/*.md` (fixes1-4 are review-driven follow-ups; reviews by Antigravity, implementation by Codex).
