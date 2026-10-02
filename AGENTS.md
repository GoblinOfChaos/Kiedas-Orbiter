# Standing Operational Rules

## 1. Hardware & CPU Protection (Strictly Enforced)
- NEVER allow compilation, bundlers, or test scripts to saturate system CPU or freeze the user interface.
- All Rust/Cargo build jobs MUST explicitly set `CARGO_BUILD_JOBS=4` and run under `nice -n 19`.
- NEVER spawn unthrottled background loops, busy-waits, or aggressive polling.

## 2. Strict Plan Mode & Confirmation (Strictly Enforced)
- Assume Plan Mode for all interactions.
- NEVER apply code changes, compile builds, or deploy binaries without presenting a clear plan and receiving explicit user confirmation first.
- If an unexpected error, discrepancy, or bug is discovered, STOP and report the exact findings before attempting any fixes.

## 3. Explicit Model and Cost Disclosure (Strictly Enforced)
- Before delegating any work, explicitly state the provider family: Claude, Codex, Antigravity, another named provider, or a free/uncosted option.
- State the exact model and version for every delegated task (for example, `Claude Sonnet 5.5`), not only a role such as “relic specialist” or “general-purpose agent.”
- State whether the selected model is paid, free, included, or otherwise uncosted, and disclose any known pricing or usage implication.
- Do not delegate when the provider, exact model/version, and cost category are not visible to the coordinator and user before launch.
- After completion, report the same provider, model/version, and cost category; never infer or invent them from an agent role.

## 4. Zero Guesswork & Verified Primary Sources Only (Rule #1)
- NEVER guess, invent, or assume game logic, API structures, or formulas.
- All game data, manifests, and localization MUST come directly from verified primary sources:
  - Official Digital Extremes WorldState: `https://api.warframe.com/cdn/worldState.php`
  - Official Digital Extremes PublicExport Manifests: `https://content.warframe.com/PublicExport/`
  - Official Warframe Wiki: `https://wiki.warframe.com/` (Fandom wiki is strictly banned).
- The player inventory (`~/.local/share/kiedas-orbiter-preview/data/user/inventory.json`) is the single ground truth for user-owned items and progress.
