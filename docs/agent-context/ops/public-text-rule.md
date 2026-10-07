# Public text rule (commit messages and GitHub posts)

Commit messages and GitHub posts state facts only: no AI or model names
about how the work was done.

Enforcement:
- Every commit: `.githooks/commit-msg`, active through the repo-level setting
  `core.hooksPath` (shared by all worktrees). A rejected message is not created.
  before `git commit`, `gh pr`, `gh issue` and `gh api` writes and blocks them on a hit.
- Check by hand: `python3 scripts/check-public-text.py FILE`.

`core.hooksPath` is local git config, not part of a clone; set it again in a fresh clone.
