# Agent report: wiki-links

## Plan

1. Inspect the existing Wiki screen, shared navigation, acquisition drawers, URL-opening call sites, and Tauri webview policy.
2. Add a validated shared `openWiki(target)` navigation API and connect all in-app Wiki links to it.
3. Make the Wiki screen consume initial targets and retarget an already-open tab; block Fandom at both frontend and webview boundaries.
4. Perform static-only verification, preserve the worktree, and record limitations.

## Summary

- Added `WikiNavigationContext` with `openWiki(target)` and exact HTTPS `wiki.warframe.com` host validation.
- Wrapped the main app content in the provider, so drawers rendered above screens can switch the active route to Wiki.
- AcquisitionDrawer and PreviewAcquisitionDrawer now route through the shared API via their shared data hook.
- About Wiki credit, Collectibles guide URLs, and Dashboard news URLs route internally only when their URL is the official Wiki; other URLs retain external opening.
- Wiki consumes an initial target and retargets the active Tauri Wiki tab when a new target arrives while Wiki is already open.
- Added a Rust-side Fandom block for existing tabs, new tabs, and child-webview navigation. No Fandom URL was found in the scanned source.
- Stable is affected additively because the provider and shared drawer hook are used by both builds; no Stable-only route or layout was changed.

## Wiki loading/policy analysis

- `src/screens/Wiki.jsx` does not use an iframe or fetch. It invokes `show_wiki_tab`, `list_wiki_tabs`, and related commands.
- `src-tauri/src/main.rs` creates a Tauri child webview with `WebviewUrl::External`, positions it as a GTK overlay on Linux, and tracks tab URL/title/navigation state in Rust.
- Existing child-webview navigation was permissive. The new Rust guard rejects hosts equal to `fandom.com` or ending in `.fandom.com` at initial navigation, retarget, new-window, and navigation callbacks.
- Stable `tauri.conf.json` has a broad frontend CSP including `http:`/`https:` and no Wiki-specific allowlist. Preview has no explicit CSP in its overlay security block.
- `src-tauri/capabilities/default.json` and Preview capabilities allow the HTTP plugin only for Warframe Market, GitHub, browse.wf, relics.run, and the DE API; Wiki is not an HTTP-plugin endpoint because the Wiki uses a direct child webview external URL. No Wiki-specific capability was added.

## Files changed

- `src/contexts/WikiNavigationContext.jsx`: URL validation, shared target state, `openWiki` API.
- `src/App.jsx`: provider around main screen/shell content.
- `src/components/AcquisitionDrawer.jsx`: shared drawer Wiki action.
- `src/preview/acquisition/PreviewAcquisitionDrawer.jsx`: no direct edit; inherits the shared hook change.
- `src/screens/Wiki.jsx`: initial target and live retarget handling.
- `src/screens/About.jsx`: official Wiki credit routing.
- `src/screens/Collectibles.jsx`: Wiki guide routing; video/non-Wiki links remain external.
- `src/screens/Dashboard.jsx`: Wiki news routing; other news links remain external.
- `src-tauri/src/main.rs`: Fandom URL rejection at child-webview boundaries.
- `AGENT_REPORT.md`: this report.

## Static verification

- `git diff --check` — PASS.
- `node -e "...JSON.parse(...)..."` for the three Tauri JSON files — PASS.
- `rg` audit of JSX/JS URL openers — PASS: remaining external paths are Settings updates, non-Wiki Dashboard fallback, Collectibles non-Wiki fallback, Warframe Market, and Riven Market.
- `rg -ni ... fandom ... src src-tauri` — no pre-existing Fandom URL; only the new Rust rejection is present.
- `node --check src/contexts/WikiNavigationContext.jsx` — NOT RUN successfully: Node 24 reports `ERR_UNKNOWN_FILE_EXTENSION` for `.jsx`.
- Approved stage4 esbuild check — BLOCKED: `/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/node_modules/.bin/esbuild` is absent.
- No Cargo, Tauri, Vite, npm/pnpm build, or test command was run.
- GitHub issue lookup `gh issue view 109` — BLOCKED by environment: no configured repository remote is recognized by `gh` (`none of the git remotes configured for this repository point to a known GitHub host`).

## Open questions and risks

- Runtime behavior was not exercised because builds/tests and the running app are out of scope. The child-webview Rust change therefore still needs coordinator runtime validation.
- The existing Wiki webview continues to allow non-Fandom navigation inside its browser surface, preserving prior behavior; app-originated non-Wiki links remain external.
- The new context intentionally accepts only HTTPS `wiki.warframe.com`; alternate hosts, HTTP, Fandom, and malformed targets are ignored.

## Suggested follow-ups

- In a permitted validation environment, open a drawer Wiki link, open a second drawer link while Wiki is active, verify the target changes in the existing tab, and test a Fandom URL is rejected.
- Have the coordinator review the Rust callback behavior on each supported platform before merging.
