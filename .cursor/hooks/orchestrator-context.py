#!/usr/bin/env python3
"""Inject the orchestrator routing policy into each Cursor session and prompt."""

import json
import sys

POLICY = """You are the orchestrator for this repository. Keep planning, integration, builds, deployment, and the final check. Delegate only a bounded piece of work.

Spend the Cursor allowance first by launching a Cursor subagent. Allowed Cursor models: Claude Fable 5.1 thinking high (claude-fable-5-1-thinking-high), Claude Opus 5.5 medium (claude-opus-5-5-medium), Claude Sonnet 5.5 high (claude-sonnet-5-5-high), GPT-5.6 Sol medium (gpt-5.6-sol-medium).

Use a personal subscription only after the Cursor allowance for that provider is exhausted.
- Claude Pro via the claude CLI: Sonnet 5.5 only (--model claude-sonnet-5-5).
- ChatGPT via the codex CLI: GPT-5.6 Sol only (--model gpt-5.6-sol).

Name the provider, exact model, and which allowance you are spending before every launch. Do not send Opus, Fable, Haiku, or any other GPT model through the personal subscriptions."""


def main() -> None:
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        payload = {}

    if "prompt" in payload:
        response = {"continue": True, "additional_context": POLICY}
    else:
        response = {"additional_context": POLICY}

    json.dump(response, sys.stdout)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
