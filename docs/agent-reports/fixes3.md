Plan

1. Verify each fixes3 finding against the assigned source files.
2. Apply only the confirmed minimal changes: restore the out-of-provider wiki fallback, make Wiki initialization consume the latest pending target without syncing over it, and reject Fandom URLs in `sync_wiki_tab`.
3. Leave `AcquisitionDrawer.jsx` unchanged because its existing delegation is covered by the context fallback.
4. Run non-compiling static checks and record exact results, risks, and open questions.

Summary

- Findings 1, 2, 3, and 4 were confirmed and fixed.
- Finding 5 requires no code change: `openWikiLink` already delegates to the context `openWiki`; the restored default context behavior covers drawers rendered outside the provider.

Files changed

- `src/contexts/WikiNavigationContext.jsx`: imports `invoke` and gives the default `openWiki` an `isWikiUrl`-guarded `open_url` fallback.
- `src/screens/Wiki.jsx`: tracks the latest pending target in a ref; initialization reads that ref, skips synchronization for the destination tab when applying a target, and clears the applied target.
- `src-tauri/src/main.rs`: rejects Fandom URLs in `sync_wiki_tab` before navigation.
- `AcquisitionDrawer.jsx`: unchanged after verification.
- An unrelated `src/screens/Market.jsx` modification appeared in the worktree; it was not touched.
- `AGENT_REPORT.md` is currently the concurrent fixes4 report, and `docs/agent-reports/fixes4.md` is present; neither was touched to avoid overwriting another task's report.

Verification

- `git diff --check`: passed.
- `git diff --stat`: confirmed only the three assigned source files changed, plus the required reports.
- Source inspection with `rg`/`sed`: confirmed the fallback, latest-target read, destination sync skip, and Rust guard; confirmed `openWikiLink` remains unchanged.
- No cargo, Tauri, Vite, npm/pnpm build, or test commands were run.
- Final `git status --short` showed the unrelated `src/screens/Market.jsx` modification; it was preserved.
- Final status also showed `docs/agent-reports/fixes4.md`; it was preserved. `AGENT_REPORT.md` was concurrently changed to the fixes4 report and was preserved.

Open questions and risks

- Runtime navigation and cross-window behavior were not exercised because builds/tests and the running app are out of scope.
- The existing `Wiki.jsx` listener sync path remains unchanged; this fix targets the mount-time race identified in fixes3.
- No new UI strings were added.

Suggested follow-up

- Exercise a wiki link from a secondary window while Wiki initialization is pending, including two rapid targets, and verify only the latest target is shown and Fandom navigation is rejected.
