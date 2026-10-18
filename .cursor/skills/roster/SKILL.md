---
name: roster
description: >-
  Assigns work for Kieda's Orbiter when the user starts a message with /roster.
  This chat plans and checks. Composer does small lookups. Claude Sonnet 5.5
  reads carefully. Codex GPT-5.6 Sol does long offline passes.
disable-model-invocation: true
---

# Roster

The user named this skill. Follow it for the rest of the message.

This chat plans the step, names who does it, and checks the result. It does not scan the item catalog or write link files.

Before any handoff, say the provider, the exact model, and which bill it spends. After it returns, say the same three facts.

## Who does the work

- Small lookup inside Cursor: Composer 2.5, weekly Cursor allowance, through the `composer-check` agent. Find a file, read a short function, report back.
- Careful reading, wiki fetches, and a later app change that must keep the acquisition shape: Claude Pro, `claude --model claude-sonnet-5-5`.
- Long offline pass over local files, including the name join and copying Acquisition text: ChatGPT, `codex exec --model gpt-5.6-sol`. The command has no network, so the brief points at local files.

## Leave unused

- Cursor handoffs named Fable, Opus, Sonnet, or Sol. They stop and ask for credits.
- Opus, Fable, Haiku, and any other GPT on the personal plans.
- `claude models`. That text is sent as a prompt.
- `gpt-6.1-sol`.
- The removed `orchestrate`, `cursor-sdk`, and `continual-learning` skills, and any Cursor API key.

## Standing limits

App code, builds, and deploys wait for a separate go-ahead. Game data comes only from Digital Extremes Public Export, WorldState, and wiki.warframe.com.
