# Delegatable Agent Model Registry

This file records model IDs currently exposed to the task-delegation runtime.
The coordinator must name the provider, exact model ID/version, and cost
category before launching a task. A `free` suffix is a provider label, not a
guarantee of unlimited quota or zero account-level cost.

## Cost disclosure rule

The runtime does not currently expose billing attribution to the coordinator.
Therefore, no model may be delegated as paid, free, or uncosted solely from
this file. Before launch, the VS Code model picker or account usage view must
confirm:

1. provider;
2. exact model/version;
3. free, included, or paid status;
4. quota/rate-limit implications;
5. expected wallet impact.

If those values are not visible, delegation is blocked.

## VS Code picker snapshot

Captured from the user's VS Code model picker on 2026-10-01. This is the
current visible inventory, not an inference from installed extensions.

### Clearly available without an upgrade label

The picker visibly listed these entries without an `Upgrade` label:

- `HydraFusion` — research preview
- `Claude Sonnet 5.5` — Copilot
- `GPT-6 Luna` — Copilot
- `Claude Haiku 4.5`
- `Claude Sonnet 5`
- `Gemini 3.8 Flash`
- `GPT-5 mini`
- `GPT-5.3-Codex`
- `GPT-5.6 Luna`
- `GPT-5.6 Terra`
- `Grok 4.6`
- `Grok 4.7`
- `Kimi K3`
- `MAI-Code-1.1-Flash`

Some other entries in the picker carried warning icons. Because the screenshot
does not show what those icons mean, they are visible but not yet classified
as wallet-safe.

### Visible with warning or special status

- `GPT-6.1 Sol` — explicitly marked `Upgrade`
- `Gemini 3.5 Flash` — warning icon
- `Gemini 3.6 Flash` — warning icon
- `Gemini 3.7 Flash` — warning icon
- `GPT-5.4` — warning icon
- `GPT-5.4 mini` — warning icon
- `Grok 4.5` — warning icon
- `Kimi K2.7 Code` — warning icon
- `Auto` — `10% discount` label

### OpenCode Free entries visible

- `big-pickle`
- `deepseek-v4-flash-free`
- `fledge-alpha-free`
- `jev-1.13-free`
- `ling-3.0-flash-fin-free`
- `longcat-2.5-preview-free`
- `mimo-v2.5-free`
- `mimo-v2.6-flash-free`
- `muse-spark-1.2-contributor-free`
- `muse-spark-1.3-contributor-free`
- `nemotron-3-ultra-free`
- `nemotron-3.5-lightning-free`
- `space-bunny-free`

The user stated that OpenCode Go is not available and is not paying for it.
OpenCode Go models must therefore not be selected. The screenshot confirms the
OpenCode Go section exists, but does not establish entitlement to any model
under it.

### Still requiring confirmation

The picker proves that an entry is visible, but not necessarily that it is
free, included in a subscription, or safe from additional usage charges.
Before delegation, the coordinator must still confirm the tooltip or account
usage indicator for the selected entry, especially for warning-marked models.

## Subscription boundary for this project

The user's available subscriptions are:

- GitHub Pro;
- ChatGPT Plus;
- Claude Pro;
- Gemini Pro.

These subscriptions do **not** automatically grant access to every model
listed below when the model is invoked through another provider or service.
In particular:

- **OpenCode Go:** not available to this user and must not be selected.
- **OpenCode Zen:** not confirmed as available or included and must not be
  selected without separate explicit confirmation.
- **OpenRouter:** requires OpenRouter access and billing; its `:free` suffix
  does not make it available through GitHub Pro, ChatGPT Plus, Claude Pro, or
  Gemini Pro.
- **Direct Claude, GPT, or Gemini IDs:** the model name alone does not prove
  that the user's Claude Pro, ChatGPT Plus, or Gemini Pro subscription covers
  usage through this runtime. The live VS Code model picker must explicitly
  show the included/free entitlement.

Until the runtime exposes a verified included/free entitlement, these entries
are **not eligible for delegation**. A model may remain in this registry as a
runtime-visible option without being an approved wallet-safe option.

## Built-in task-capable models

These are direct model IDs exposed by the runtime, independent of a specific
external provider label:

- `claude-sonnet-5`
- `claude-haiku-4.5`
- `gpt-6-luna`
- `gpt-5.6-terra`
- `gpt-5.6-luna`
- `gpt-5.4`
- `gpt-5.4-mini`
- `gpt-5.3-codex`
- `gpt-5-mini`
- `mai-code-1.1-flash`
- `gemini-3.8-flash`
- `gemini-3.7-flash`
- `gemini-3.6-flash`
- `gemini-3.5-flash`
- `grok-4.5`
- `kimi-k3`
- `kimi-k2.7-code`
- `claude-sonnet-5.5`
- `grok-4.6`
- `grok-4.7`
- `hydrafusion`

## OpenCode Go models

- `opencode-go/minimax-m3`
- `opencode-go/minimax-m2.7`
- `opencode-go/minimax-m2.5`
- `opencode-go/kimi-k3`
- `opencode-go/kimi-k2.7-code`
- `opencode-go/kimi-k2.6`
- `opencode-go/longcat-2.0`
- `opencode-go/kimi-k2.5`
- `opencode-go/glm-5.2`
- `opencode-go/glm-5.3-flash`
- `opencode-go/glm-5.3`
- `opencode-go/glm-5.1`
- `opencode-go/glm-5`
- `opencode-go/deepseek-v4-pro`
- `opencode-go/deepseek-v4-flash`
- `opencode-go/deepseek-flash`
- `opencode-go/deepseek-v4.1-flash`
- `opencode-go/deepseek-v4-flash-vision-exp`
- `opencode-go/qwen3.7-max`
- `opencode-go/qwen3.8-max`
- `opencode-go/qwen3.8-flash`
- `opencode-go/qwen3.7-plus`
- `opencode-go/qwen3.6-plus`
- `opencode-go/qwen3.5-plus`
- `opencode-go/mimo-v2-pro`
- `opencode-go/mimo-v2-omni`
- `opencode-go/mimo-v2.6-pro`
- `opencode-go/mimo-v2.6-flash`
- `opencode-go/space-bunny-free`
- `opencode-go/longcat-2.5-preview-free`
- `opencode-go/mimo-v2.5-pro`
- `opencode-go/mimo-v2.5`
- `opencode-go/hy4-preview`
- `opencode-go/hy3`
- `opencode-go/hy3-preview`
- `opencode-go/gpt-5.6-luna`
- `opencode-go/grok-4.5`
- `opencode-go/grok-4.7`
- `opencode-go/grok-4.6`
- `opencode-go/muse-spark-1.3-contributor`
- `opencode-go/muse-spark-1.2-contributor`
- `opencode-go/omen-alpha`
- `opencode-go/gpt-6-luna`

## OpenCode free models

These are explicitly free-labeled in the current runtime catalog:

- `opencode-free/big-pickle`
- `opencode-free/jev-1.13-free`
- `opencode-free/deepseek-v4-flash-free`
- `opencode-free/muse-spark-1.3-contributor-free`
- `opencode-free/muse-spark-1.2-contributor-free`
- `opencode-free/mimo-v2.6-flash-free`
- `opencode-free/space-bunny-free`
- `opencode-free/longcat-2.5-preview-free`
- `opencode-free/mimo-v2.5-free`
- `opencode-free/ling-3.0-flash-fin-free`
- `opencode-free/nemotron-3-ultra-free`
- `opencode-free/nemotron-3.5-lightning-free`
- `opencode-free/fledge-alpha-free`

## OpenCode Zen models

- `opencode-zen/claude-fable-5`
- `opencode-zen/claude-fable-5-1`
- `opencode-zen/claude-opus-5-5`
- `opencode-zen/claude-opus-5`
- `opencode-zen/claude-opus-4-8`
- `opencode-zen/claude-opus-4-7`
- `opencode-zen/claude-opus-4-6`
- `opencode-zen/claude-opus-4-5`
- `opencode-zen/claude-sonnet-5-5`
- `opencode-zen/claude-sonnet-5`
- `opencode-zen/claude-sonnet-4-6`
- `opencode-zen/claude-sonnet-4-5`
- `opencode-zen/claude-sonnet-4`
- `opencode-zen/claude-haiku-4-5`
- `opencode-zen/gemini-3.8-flash`
- `opencode-zen/gemini-3.7-flash`
- `opencode-zen/gemini-3.6-flash`
- `opencode-zen/gemini-3.5-flash-lite`
- `opencode-zen/gemini-3.5-flash`
- `opencode-zen/gemini-3.1-pro`
- `opencode-zen/gemini-3-flash`
- `opencode-zen/gpt-6-astra`
- `opencode-zen/gpt-6.1-sol`
- `opencode-zen/gpt-6-sol`
- `opencode-zen/gpt-6-luna`
- `opencode-zen/gpt-5.6-sol`
- `opencode-zen/gpt-5.6-terra`
- `opencode-zen/gpt-5.6-luna`
- `opencode-zen/gpt-5.5`
- `opencode-zen/gpt-5.5-pro`
- `opencode-zen/gpt-5.4`
- `opencode-zen/gpt-5.4-pro`
- `opencode-zen/gpt-5.4-mini`
- `opencode-zen/gpt-5.4-nano`
- `opencode-zen/gpt-5.3-codex-spark`
- `opencode-zen/gpt-5.3-codex`
- `opencode-zen/gpt-5.2`
- `opencode-zen/gpt-5.2-codex`
- `opencode-zen/gpt-5.1`
- `opencode-zen/gpt-5.1-codex-max`
- `opencode-zen/gpt-5.1-codex`
- `opencode-zen/gpt-5.1-codex-mini`
- `opencode-zen/gpt-5`
- `opencode-zen/gpt-5-codex`
- `opencode-zen/gpt-5-nano`
- `opencode-zen/grok-build-0.1`
- `opencode-zen/grok-4.7`
- `opencode-zen/grok-4.6`
- `opencode-zen/grok-4.5`
- `opencode-zen/muse-spark-1.3`
- `opencode-zen/muse-spark-1.2`
- `opencode-zen/deepseek-v4.1-flash`
- `opencode-zen/deepseek-v4-pro`
- `opencode-zen/deepseek-v4-flash`
- `opencode-zen/deepseek-v4-flash-vision-exp`
- `opencode-zen/glm-5.3-flash`
- `opencode-zen/glm-5.3`
- `opencode-zen/glm-5.2`
- `opencode-zen/glm-5.1`
- `opencode-zen/glm-5`
- `opencode-zen/minimax-m3`
- `opencode-zen/minimax-m2.7`
- `opencode-zen/minimax-m2.5`
- `opencode-zen/kimi-k3`
- `opencode-zen/kimi-k2.7-code`
- `opencode-zen/kimi-k2.6`
- `opencode-zen/kimi-k2.5`
- `opencode-zen/qwen3.8-flash`
- `opencode-zen/qwen3.6-plus`
- `opencode-zen/qwen3.5-plus`
- `opencode-zen/jev-1.13`
- `opencode-zen/qwen3.8-max`

## OpenRouter models

The runtime exposes a larger OpenRouter catalog under the provider prefix
`openrouter/OpenRouter 3/`. The exact IDs include provider/model pairs and,
for some entries, a `:batch` or `:free` suffix. The coordinator must select
and record the complete ID, not just the underlying model name.

Free-labeled OpenRouter entries currently visible include:

- `openrouter/OpenRouter 3/apodex/apodex-1.1-mini:free`
- `openrouter/OpenRouter 3/qwen/qwen3.8-27b:free`
- `openrouter/OpenRouter 3/thinkingmachines/inkling-small:free`
- `openrouter/OpenRouter 3/poolside/laguna-s-2.1:free`
- `openrouter/OpenRouter 3/nvidia/nemotron-3.5-lightning:free`
- `openrouter/OpenRouter 3/nvidia/nemotron-3-ultra-550b-a55b:free`
- `openrouter/OpenRouter 3/google/gemma-4-26b-a4b-it:free`
- `openrouter/OpenRouter 3/google/gemma-4-31b-it:free`
- `openrouter/OpenRouter 3/cohere/north-mini-code:free`
- `openrouter/OpenRouter 3/liquid/lfm-2.5-2.6b:free`

The OpenRouter catalog is runtime-managed and may change. Do not treat this
section as proof that a model is currently available or free at task launch;
the live model picker remains authoritative.

## Routing guidance

- Use a free-labeled lightweight model for bounded exploration, simple
  documentation checks, and low-risk test discovery only after confirming
  zero wallet impact.
- Use a stronger implementation model for cross-file behavior, data
  normalization, and regression fixes.
- Use a visual-capable model for UI layout and live acceptance work.
- Use the coordinator for integration, diff review, build/deployment, and
  final reporting.
- Never describe a task as handled by “a relic specialist” without also
  recording the exact provider/model/version and cost category.
