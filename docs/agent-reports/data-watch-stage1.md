# data-watch Stage 1

Implemented the approved dependency-free Node 24 watcher in `scripts/data-watch/`, with four primary-source probes, injected tests, state transitions, deterministic reports, issue synchronization, CLI, and `.github/workflows/data-watch.yml`.

Verification:

- `nice -n 19 node --test tests/data-watch/*.test.mjs`: 16/16 passed.
- `node --check` over all new modules/tests: passed.
- `git diff --check`: passed.
- YAML parser unavailable; workflow reviewed manually.
- First live dry run: `nice -n 19 node scripts/data-watch/cli.mjs --state /tmp/data-watch-state.json --dry-run`; exit 10; `de-public-export`, `de-drop-tables`, `wiki-modules`, and `worldstate-schema` were `first-seen`; 4 events.
- Second identical live dry run; exit 0; all four were `unchanged`; 0 events.

No builds, commits, pushes, real GitHub issue calls, or files outside the worktree were used. The requested cache-design path was missing at `/home/jedwards/kiedas-orbiter/docs/pipeline/PHASE2-CACHE-DESIGN.md`; an equivalent preview-work copy exists, but this did not block the explicit Stage 1 implementation.

Follow-up: manually dispatch the workflow in a throwaway repository/branch and review Stage 2 validation/refresh integration.

## Review fixes

- Removed token-bearing clone/remotes, using clean HTTPS URLs and masked local `http.https://github.com/.extraheader` authentication; `ls-remote` uses a one-shot extraheader.
- First-seen is now a silent baseline with exit 0; only changed data emits an update and exit 10. Dry-run does not write state, and `--no-issues` skips GitHub calls.
- Unexpected state, issue-sync, and programming errors remain exit 1; only expected probe errors use exit 30. Workflow accepts 0/10/30 and fails other statuses.
- Issue summaries now use only the first `- **` line, with tests for changed and unchanged summaries. Issue titles carry their event kind.
- Added workflow job timeout/disabled guard and pull-rebase retry before state push.
- Fetch abort signals cover response bodies; wiki pagination is bounded and repetition-safe, revision batches use form POST, and JSON errors are rejected.
- Drop-table redirects are restricted to HTTPS Warframe hosts or the exact DE asset host.
- Upstream-derived issue content neutralizes mentions, quotes values, truncates errors to 300 characters, and caps bodies at 60,000 characters.
- xz execution is bounded and uses a unique cleaned temporary directory. Recovered source-unreachable issues receive a comment and close; data-update issues are not auto-closed.
- Added regression coverage for these behaviors; the full suite passes 26/26.
