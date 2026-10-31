

| Piece | Live location | What it does |
|---|---|---|
| container limit | `podman update kiedas-orbiter --memory 10g --memory-swap 10g --cpus 4` | builds run INSIDE the `kiedas-orbiter` Ubuntu 22.04 box (NOT covered by the agent slice). 10 GB RAM + 4 CPU quota. `CARGO_BUILD_JOBS=4` is also set in the box profile / `run-preview.mjs`. Undo: `podman update kiedas-orbiter --memory 0 --memory-swap -1 --cpus 0` |
| `vscode-scope-50-memory.conf` | `~/.config/systemd/user/app-com.microsoft.VSCode-.scope.d/50-memory.conf` | 32 GB cap on VS Code (normal use peaks ~19 GB); catches a 50 GB runaway. Set live with `systemctl --user set-property --runtime`; the drop-in is unverified until the next VS Code launch |

Test rule (also in briefs COMMON.md and HANDOFF.md): always `node --test --test-concurrency=2` (real-data tests load ~1 GB per process; Node's default is one per CPU core).

## Addendum 2026-10-06 14:30: /tmp is RAM and was the thing filling the cap
