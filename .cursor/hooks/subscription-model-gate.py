#!/usr/bin/env python3
"""Allow personal Claude and Codex CLI work only on Sonnet 5.5 and GPT-5.6 Sol."""

import json
import re
import sys

CLAUDE_WORK = re.compile(r"(?:^|[;&|`]\s*)(?:\S*/)?claude\b")
CODEX_WORK = re.compile(r"(?:^|[;&|`]\s*)(?:\S*/)?codex\b")
CLAUDE_INFO = re.compile(
    r"(?:^|[;&|`]\s*)(?:\S*/)?claude\s+(?:--version|--help|-h|auth(?:\s+status)?)\b"
)
CODEX_INFO = re.compile(
    r"(?:^|[;&|`]\s*)(?:\S*/)?codex\s+(?:--version|--help|-h|login(?:\s+status)?|doctor)\b"
)
SONNET_55 = re.compile(r"(?:--model(?:=|\s+))(?:claude-sonnet-5-5|sonnet-5\.5)\b")
SOL_56 = re.compile(r"(?:--model(?:=|\s+)|-m\s+)gpt-5\.6-sol\b")


def emit(permission: str, message: str | None = None) -> None:
    payload: dict[str, str] = {"permission": permission}
    if message:
        payload["user_message"] = message
        payload["agent_message"] = message
    json.dump(payload, sys.stdout)
    sys.stdout.write("\n")


def main() -> None:
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        emit(
            "deny",
            "The subscription model gate could not read the command, so it was blocked.",
        )
        return

    command = str(payload.get("command") or "")
    uses_claude = CLAUDE_WORK.search(command) is not None
    uses_codex = CODEX_WORK.search(command) is not None

    if not uses_claude and not uses_codex:
        emit("allow")
        return

    problems: list[str] = []
    if uses_claude and CLAUDE_INFO.search(command) is None and SONNET_55.search(command) is None:
        problems.append(
            "Claude Pro work must use Sonnet 5.5 only: --model claude-sonnet-5-5. "
            "Spend the Cursor allowance first."
        )
    if uses_codex and CODEX_INFO.search(command) is None and SOL_56.search(command) is None:
        problems.append(
            "ChatGPT/Codex work must use GPT-5.6 Sol only: --model gpt-5.6-sol. "
            "Spend the Cursor allowance first."
        )

    if problems:
        emit("deny", " ".join(problems))
        return

    emit("allow")


if __name__ == "__main__":
    main()
