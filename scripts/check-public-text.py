#!/usr/bin/env python3
"""Reject public-facing text that names an AI tool or model, the user, or the owner.

Rule (memory: feedback_no_meta_narration_public): commit messages and GitHub
posts must be factual. No AI/model attribution (Claude, Codex, Sonnet, Haiku,
GPT model names, Co-Authored-By trailers), no reference to the user, no
second-person address, no owner name.

Usage:
  check-public-text.py FILE          check a commit message file (commit-msg hook)
  check-public-text.py --stdin       check text on stdin (Claude Code hook)
Exit 0 when clean, 1 with the offending fragments listed on stderr.
"""
import re
import sys

BANNED = re.compile(
    r"(\bclaude\b|\bcodex\b|\bsonnet\b|\bhaiku\b|\bopus\b|\bgpt-[\w.\-]*|\banthropic\b|"
    r"\bopenai\b|\bchatgpt\b|\bgemini\b|\bantigravity\b|co-authored-by|generated with|"
    r"ai-assisted|\byou\b|\byour\b|\bthe user\b|\bjedwards\b|\bjacob\b)",
    re.IGNORECASE,
)


def hits(text):
    found = []
    for line_no, line in enumerate(text.splitlines(), 1):
        for m in BANNED.finditer(line):
            found.append((line_no, m.group(0), line.strip()[:120]))
    return found


def main(argv):
    if len(argv) >= 2 and argv[1] == "--stdin":
        text = sys.stdin.read()
    elif len(argv) == 2:
        with open(argv[1], encoding="utf-8", errors="replace") as fh:
            text = fh.read()
    else:
        print(__doc__, file=sys.stderr)
        return 2
    found = hits(text)
    if not found:
        return 0
    print("public text rejected (no AI/model names, no user or owner references):", file=sys.stderr)
    for line_no, word, line in found:
        print(f"  line {line_no}: '{word}' in: {line}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
