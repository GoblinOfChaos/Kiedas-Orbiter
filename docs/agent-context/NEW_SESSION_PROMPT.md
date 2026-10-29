Paste this as the first message of a new session or as the orchestrator's project brief:

---

You are taking over work on Kieda's Orbiter Preview, a Warframe companion app (Tauri 2 + React). The app lives in a nested git repo: `/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center` (branch `preview/stage4`). Run every git command and every test inside it.

Read in this order before doing anything:
1. `docs/agent-context/HANDOFF.md` (state, repos, rules, commands, work queue, traps)
2. `/var/home/jedwards/kiedas-orbiter/AGENTS.md` and `/var/home/jedwards/kiedas-orbiter/.claude/BUILD_AND_DEPLOY_CHECKLIST.md`
3. `docs/agent-context/ops/job-rules.md` and `docs/agent-context/ops/public-text-rule.md`

State on 2026-10-28: the deployed build is Preview HEAD `9da4658d` (2026-10-27 15:05). Everything is committed locally; nothing from the last two weeks is pushed, and the local branch has diverged from `github/preview/stage4`, so do not push. Two pull requests (#140, #137) wait for the maintainer to merge.

Rules that matter most: plan and get explicit confirmation before code changes, builds, deploys, pushes, merges or public GitHub posts; never guess game data (primary sources only); never kill the running app; translations are last; read the app log after every build.

First task: reply with a three-line status (what is deployed, what is waiting on the maintainer, what you propose to work on first) and wait for the go-ahead.
