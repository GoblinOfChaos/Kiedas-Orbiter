

| Piece | Live location | What it does |
|---|---|---|
| container limit | `podman update --memory 10g --memory-swap 10g dev-fedora` | builds run INSIDE the dev-fedora container, which is NOT covered by the slice (its processes live in the container's cgroup); undo: `podman update --memory 0 --memory-swap -1 dev-fedora` |
| `vscode-scope-50-memory.conf` | `~/.config/systemd/user/app-com.microsoft.VSCode-.scope.d/50-memory.conf` | 32 GB cap on VS Code (normal use peaks ~19 GB); catches a 50 GB runaway. Set live with `systemctl --user set-property --runtime`; the drop-in is unverified until the next VS Code launch |

Test rule (also in briefs COMMON.md and HANDOFF.md): always `node --test --test-concurrency=2` (real-data tests load ~1 GB per process; Node's default is one per CPU core).

## Addendum 2026-10-06 14:30: /tmp is RAM and was the thing filling the cap
