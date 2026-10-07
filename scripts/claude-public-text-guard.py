#!/usr/bin/env python3
"""Claude Code PreToolUse hook (matcher: Bash).

Blocks git commits and GitHub writes (gh pr/issue/release/gist write verbs,
gh api writes) whose command text breaks the public-text rule. Paths such as
/home/<owner> and ~/.claude are removed first so they do not trigger a match.
Exit 2 blocks the call and returns the reason to the model.
"""
import json
import os
import re
import subprocess
import sys

CHECKER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "check-public-text.py")
GUARDED = re.compile(
    r"\bgit\s+commit\b"
    r"|\bgh\s+(pr|issue|release|gist)\s+(create|edit|comment|review|close|merge|reopen)\b"
    r"|\bgh\s+api\b.*(-X|--method|-f\b|-F\b|--field|--raw-field)",
    re.IGNORECASE,
)
PATHS = re.compile(r"(/var)?/home/[\w.-]+|~/\.claude\b|\.claude\b")


def main():
    try:
        command = json.load(sys.stdin).get("tool_input", {}).get("command", "")
    except (ValueError, AttributeError):
        return 0
    if not GUARDED.search(command):
        return 0
    cleaned = PATHS.sub(" ", command)
    result = subprocess.run([sys.executable, CHECKER, "--stdin"], input=cleaned.encode(), capture_output=True)
    if result.returncode == 0:
        return 0
    sys.stderr.write(result.stderr.decode(errors="replace"))
    sys.stderr.write("Blocked by the public-text rule. Rewrite the message as factual text with no AI or model names and no references to the user or owner.\n")
    return 2


if __name__ == "__main__":
    sys.exit(main())
