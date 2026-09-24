# Agent report: de-adopt slice 1

## Plan

1. Read the compatibility/cache design and current export consumers.
2. Record DE versus export-plus Warframe shapes and field provenance.
3. Implement a deterministic DE adapter and standalone shadow comparator.
4. Add small real-data fixtures plus node:test coverage.
5. Run static checks, tests, and the real read-only shadow comparison.

## Summary

Implemented the Warframes adapter and shadow comparison only. No app runtime,
bundled data, network source, market endpoint, commit, or push was changed.
The adapter emits 127 DE records with the exact approved top-level field
allow-list, normalizes nested ability names, ignores unknown fields, and
preserves missing optional fields as omitted.

## Files changed

- `scripts/de-export/adapters/warframes.mjs`
- `scripts/de-export/shadow-warframes.mjs`
- `tests/de-export/warframes-adapter.test.mjs`
- `tests/de-export/fixtures/warframes-real-excerpts.json`
- `docs/pipeline/WARFRAMES-ADAPTER.md`
- `docs/agent-reports/de-adopt-1.md`
- `AGENT_REPORT.md`

## Verification

- `nice -n 19 node --test tests/de-export/warframes-adapter.test.mjs` — PASS,
  adapter assertions, 0 failures.
- `nice -n 19 node --check scripts/de-export/adapters/warframes.mjs` — PASS.
- `nice -n 19 node --check scripts/de-export/shadow-warframes.mjs` — PASS.
- `nice -n 19 node scripts/de-export/shadow-warframes.mjs` — PASS; wrote
  `/tmp/de-shadow/warframes-report.json`.
- `git diff --check` — PASS.
- No cargo, tauri, vite, npm/pnpm build, or compile/test command that builds
  the application was run.

## Real shadow result

DE: 127; Preview app: 125; comparable: 125. DE-only records are Narin
(`/Lotus/Powersuits/Duelist/Duelist`) and Citrine Prime
(`/Lotus/Powersuits/Geode/CitrinePrime`). App-only: none. Mismatches are
systematic for localized `name`, `description`, `passiveDescription`, and
ability object shape/content; smaller differences affect two Hydroid armor/
shield records, 14 sprint speeds, and nine `exalted` lists.

## Open questions and risks

- The adapter intentionally omits app-only icons, long codex descriptions,
  variants, commerce fields, and polarities. A later app integration must
  merge those from the existing dictionary/image/commerce layers.
- The DE cache is currently English; the adapter rejects non-English locale
  requests rather than silently producing an unverified localization.
- The real shadow report is an external `/tmp` artifact by task request; it
  is not committed. Its top-ten examples are retained in that JSON file.

## Suggested follow-ups

Integrate the adapter behind the Preview export path only after reviewing the
field ledger, then rerun the shadow comparison and live Preview transition
checks. Keep app-side merge responsibilities explicit before considering a
stable-app change.
