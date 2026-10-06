#!/usr/bin/env bash
# PreToolUse hook (matcher: Bash). Runs every memory-hungry command inside the shared systemd
# slice `claude-agent.slice` (~/.config/systemd/user/claude-agent.slice: MemoryHigh=9G,
# MemoryMax=10G, no swap), so everything Claude Code runs together can never use more than
# 10 GB. The user asked for this after repeated out-of-memory freezes (2026-10-06).
#
# How: it rewrites the command (hook "updatedInput") to run on the host through
# `flatpak-spawn --host systemd-run --user --scope --slice=claude-agent.slice`.
# It deliberately does NOT set permissionDecision, so the rewritten command still goes through
# the normal permission checks and the other guard hooks (which see the original command).
#
# Not covered (they are not started through the Bash tool): subagents, MCP servers, the editor
# extension's own Codex app-server, and Claude Code itself. Codex jobs started by
# .claude/bin/delegate join the same slice (see that script).
#
# Only compute-heavy tools are wrapped; light commands (git, ls, cat, grep, ...) pass through
# untouched so nothing breaks on the host side. To widen/narrow, edit HEAVY below.
set -euo pipefail

python3 -c '
import json, re, shlex, sys

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

tool_input = data.get("tool_input") or {}
command = tool_input.get("command") or ""
cwd = data.get("cwd") or ""
if not command:
    sys.exit(0)

SLICE = "systemd-run --user --scope --quiet --slice=claude-agent.slice"

# Already capped, or capped by its own launcher (delegate/delegate-run join the slice themselves).
if "claude-agent.slice" in command or "systemd-run" in command or ".claude/bin/delegate" in command:
    sys.exit(0)

HEAVY = re.compile(
    r"(?<![\w./-])(node|nodejs|npm|npx|pnpm|yarn|cargo|rustc|tauri|vite|python3?|pytest|"
    r"distrobox|codex|java|gradle|make|cmake|ffmpeg|weasyprint|sqlite3)(?=[\s;|&)]|$)"
)

if "flatpak-spawn --host" in command:
    # Already routed to the host: put the scope right after the first flatpak-spawn --host.
    new_command = command.replace("flatpak-spawn --host", "flatpak-spawn --host " + SLICE, 1)
elif HEAVY.search(command):
    directory = f"--directory={shlex.quote(cwd)} " if cwd else ""
    new_command = f"flatpak-spawn --host {directory}{SLICE} bash -c {shlex.quote(command)}"
else:
    sys.exit(0)

print(json.dumps({"hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "updatedInput": {**tool_input, "command": new_command},
}}))
' <<< "$(cat)"
