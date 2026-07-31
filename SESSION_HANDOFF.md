# Kieda's Orbiter — Session Handoff (2026-07-22 → next chat)

Read this first thing in the new conversation. Your persistent memory already has the standing project facts (Jacob's a beginner, no manual edits, verify-before-claiming-fixed, etc.) — this doc is the specific state of *this* session's work so you don't redo it or lose track of what's still open.

## Immediate next steps (pick up here)

1. **Dashboard / Status & Tools layout — NOT YET CONFIRMED WORKING.** Jacob circled "dead space" problems in screenshots (Cycles card, Void Fissures, Status & Tools ACTIONS grid, AUTO-START toggles). Root cause: layout stretch factors were expanding spacers to fill very-wide cards instead of keeping related content together. Fixed in `DASHBOARD_TAB.py` (`_build_cycles`/`_build_fissures` reworked into 2-column denser layouts, bigger fonts) and `STATUS_TAB.py` (ACTIONS button sizing/stretch). **Ask Jacob for a fresh kill+relaunch (`pkill -f missing-parts.py` then relaunch) and a new screenshot before touching this further** — a previous "still broken" screenshot may have been from a stale process that hadn't picked up the code changes yet (Python doesn't hot-reload). Don't guess at more CSS/layout numbers blind; his circled-screenshot feedback loop works well, keep using it.

2. **`lmstudio-bridge-enhanced` MCP server — fix applied, NOT YET TESTED.** It was failing with `ModuleNotFoundError: No module named 'mcp'`. Root cause: `.mcp.json` launched it via `/usr/bin/python3` with `PYTHONUSERBASE=/var/data/python`, but that env-var approach wasn't reaching the actual subprocess (possibly a Flatpak/VS-Code-sandbox quirk — unconfirmed, see below). Fixed by rebuilding the project's own broken `.venv` (was missing `pip` — same class of bug as the wfinfo-ng venv incident, see below) and repointing `/var/home/jedwards/.mcp.json`'s `"command"` directly at `/var/home/jedwards/lmstudio-bridge-enhanced/.venv/bin/python3`. **Needs Jacob to reload the MCP server in VS Code and confirm it connects.**

3. **Local-model delegation setup for future usage-limit mitigation.** Jacob hit Claude's session/usage limit multiple times this session, almost entirely from spawning many parallel background research `Agent` calls (wiki-verification passes). Agreed direction: route future bulk/mechanical lookup work (batch wiki lookups, batch data extraction) through `lmstudio-bridge-enhanced` → LM Studio's local Qwen 2.5 Coder instead of Claude subagents, reserving Claude agents for work that needs real judgment. **This hasn't been built yet** — no actual wiring exists between "I need to do bulk research" and "automatically dispatch to Qwen via the bridge." If Jacob asks for a big batch task, consider proposing that route explicitly before defaulting to spawning several Claude background agents.

## Critical environment gotcha — read before touching any venv or "why isn't my fix working" issue

Claude's own Bash tool sandbox is **NOT the same environment** as either (a) Jacob's real host, or (b) the `wfinfo` distrobox container he actually runs the wfinfo-ng app in, or (c) VS Code's own environment (possibly Flatpak-sandboxed — `com.visualstudio.code` shows up as a known sandbox indicator in `paths.py`).

This has caused two real incidents:
- Rebuilt wfinfo-ng's `.venv` from Claude's sandbox Python, which is a *different* interpreter than the one in Jacob's real distrobox — broke the app launch entirely until reverted from `.venv.broken-*` backup.
- `lmstudio-bridge-enhanced`'s venv was *also* broken (no `pip`) in a way that suggests it too was built inside a mismatched sandbox previously.

**Rule going forward: don't trust "it works when I test it from my Bash tool" as proof it'll work in Jacob's actual running app.** When something seems impossibly broken (can't import a package that's clearly installed, etc.), suspect an environment mismatch before doing anything destructive like rebuilding a venv. When genuinely unsure, ask Jacob to run diagnostic commands in *his* terminal.

Also: this app's `close_behavior` defaults to `"tray"` (minimizes instead of quitting). If Jacob reports "my fix isn't showing up" or "I can't open the app," the first move is almost always `pkill -f missing-parts.py` before relaunching — Python doesn't hot-reload code changes into an already-running process.

## What's fully done this session (don't redo)

Full detail is in **`ZOO_CODE_HANDOFF.md`** (written earlier this session, still accurate) — summary:

- Wired real drop-location/acquisition data (`drop_data.py` + a family of `component_overrides_*.json` files, ~1,000+ items researched via wiki) into Arcanes, Ayatan, Mod Collection, Ephemera, Emblems, Captura Scenes, Conservation Tags, and all equipment tabs.
- Fixed wiki-link validity: Glyphs/Emblems/Captura mostly don't have individual wiki pages (confirmed via direct fetch) — now link to their real catalog pages instead of guessed-and-broken per-item URLs.
- Fixed real data-quality bugs: Emblem tab was silently dropping 93 of 119 real emblems (filter checked the wrong field), Orion & Sirius duplicate Warframe listing, fake "Coronet" cosmetics leaking into Ephemera, raw internal codenames leaking into the Descendia dashboard card, "Mastered" status using simple ownership instead of real Mastery-Rank XP thresholds (Bonewidow/Voidrig were wrongly shown mastered), Cephalon Fragments had no real completion tracking (now checks real per-region scan targets), a couple of broken sidebar icons.
- Fixed Mod Collection tab's multi-second load time (icon caching + chunked population).
- "Need" column in equipment tabs now shows remaining-needed vs. owned, not just the flat recipe total.
- Set up Qdrant (running via podman, `127.0.0.1:6333` — use the IP not `localhost`, IPv6 resolution was flaky) + configured Zoo Code's codebase indexing against LM Studio (`text-embedding-nomic-embed-text-v1.5`, OpenAI-compatible endpoint at `127.0.0.1:1234/v1`, dimension 768).
- **Nothing this session has been committed to git** — standing rule, don't commit unless explicitly asked. `git status` will show a large diff.

## Zoo Code caveat

Jacob tried using Zoo Code (a Roo-Code-family VS Code extension) with a local model for autonomous coding and it got stuck in a repetitive tool-call loop (kept re-reading the same file, never progressing) — a known failure mode when a local model doesn't cleanly handle tool-call results. Not yet resolved; he was pointed at trying the already-installed `DanLambiase.lmstudio-copilot-provider` extension (native Copilot Chat integration) as a possibly more stable alternative, but hadn't tested it as of end of session.
