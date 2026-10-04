# Common rules (read first)
You work ONLY inside your git worktree (your current directory). Edit only files under it. Do NOT run git commit/push, do NOT build (no Rust build, no app bundling), do NOT touch ~/AppImages or ~/.local/share/kiedas-orbiter*/ (you may READ the data dir and run tests; the real-data harness reads it).
This is Kieda's Orbiter Preview (React 18 + Vite, Tauri 2 Rust in src-tauri/). Read docs/agent-context/HANDOFF.md sections 8, 9, 11 first.
Rules:
1. No guessing game data; only DE exports, DE drop tables (data already in repo), wiki.warframe.com. Fandom banned. If a fact cannot be verified from repo data, DO NOT add it; list it in your report.
2. Every fix needs a test that FAILS before and PASSES after: prove it with `git stash push -- <changed src paths>`, run the test, `git stash pop`. Prefer real-data tests (copy tests/farming/ledgerImages.test.mjs + scripts/lib/real-data-harness.mjs).
3. Run tests throttled: `nice -n 19 node --test <files>`; full suite: `nice -n 19 node --test 'tests/farming/*.test.mjs' 'tests/completeness/*.test.mjs' 'tests/relics/*.test.mjs' 'tests/ui/*.test.mjs' tests/dropAttribution.test.mjs` (Node 24 needs globs). The full suite must stay green (120+ passing).
4. Never silently hide items. No generic fallback text. Keep changes minimal; do not refactor unrelated code. If you hit something unexpected (failing unrelated test, data contradicting the brief), STOP that sub-task and describe it in the report instead of improvising.
When done write AGENT_REPORT.md at the worktree root: per item: root cause (file:line), what you changed, test names, before/after proof, anything unverified or skipped, and the exact files changed. Finish with a short final message.
