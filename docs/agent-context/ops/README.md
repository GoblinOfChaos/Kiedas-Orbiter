# Memory caps and Codex launcher (copies; the live files are git-ignored under ~/kiedas-orbiter/.claude and ~/.config/systemd/user)

Set up 2026-10-06 after repeated out-of-memory freezes. Evidence: the kernel log showed a 50 GB runaway process inside VS Code (Oct 4) and bursts of ~1 GB `node` test processes hitting the 10 GB Codex limit (Oct 5). No cargo/rustc process was ever killed.

| Piece | Live location | What it does |
|---|---|---|
| `claude-agent.slice` | `~/.config/systemd/user/` | ONE shared 10 GB hard cap (MemoryMax, no swap, no soft limit - a soft limit made runaways crawl instead of dying) for everything started through the Bash tool and Codex jobs |
| `cap-memory.sh` | `.claude/hooks/` (registered in `.claude/settings.json`, PreToolUse Bash) | rewrites heavy commands (node, pnpm, cargo, python, distrobox, codex, ...) to run inside the slice via `flatpak-spawn --host systemd-run --user --scope --slice=claude-agent.slice`; sets no permissionDecision so normal permission checks still apply |
| `delegate` | `.claude/bin/` | Codex jobs now join the same slice instead of their own 10 GB scope |
| container limit | `podman update --memory 10g --memory-swap 10g dev-fedora` | builds run INSIDE the dev-fedora container, which is NOT covered by the slice (its processes live in the container's cgroup); undo: `podman update --memory 0 --memory-swap -1 dev-fedora` |
| `vscode-scope-50-memory.conf` | `~/.config/systemd/user/app-com.microsoft.VSCode-.scope.d/50-memory.conf` | 32 GB cap on VS Code (normal use peaks ~19 GB); catches a 50 GB runaway. Set live with `systemctl --user set-property --runtime`; the drop-in is unverified until the next VS Code launch |
| `measure-rust-build` | `.claude/bin/` | builds without deploying and prints the peak container memory (run by the user: the build guard stops agents) |

Test rule (also in briefs COMMON.md and HANDOFF.md): always `node --test --test-concurrency=2` (real-data tests load ~1 GB per process; Node's default is one per CPU core).
Not covered: subagents, MCP servers, the editor's Codex app-server, Claude Code itself.

## Addendum 2026-10-06 14:30: /tmp is RAM and was the thing filling the cap
At 14:22 two kernel out-of-memory warnings fired inside the shared slice although the running programs used only ~260 MB. `memory.stat` showed 9.7 GB of `shmem`: `/tmp` is tmpfs on this machine and held 21 GB, mostly ~2.1 GB "before" proof copies of the repo that Codex jobs made (`git archive HEAD`) and never deleted, plus test temp folders. Fixes: the stale folders were deleted by exact name (21 GB -> 0.4 GB); `delegate` now runs Codex with `TMPDIR=~/.cache/codex-tmp` and `cap-memory.sh` runs wrapped commands with `TMPDIR=~/.cache/claude-tmp` (both on disk); COMMON.md rule 5 forbids temp copies in /tmp and requires deleting them. Check any time: `df -h /tmp` and the slice's `memory.stat` (shmem).
