# Standing Operational Rules

## 1. Hardware & CPU Protection (Strictly Enforced)
- NEVER allow compilation, bundlers, or test scripts to saturate system CPU or freeze the user interface.
- All Rust/Cargo build jobs MUST explicitly set `CARGO_BUILD_JOBS=4` and run under `nice -n 19`.
- NEVER spawn unthrottled background loops, busy-waits, or aggressive polling.

## 2. Strict Plan Mode & Confirmation (Strictly Enforced)
- Assume Plan Mode for all interactions.
- NEVER apply code changes, compile builds, or deploy binaries without presenting a clear plan and receiving explicit user confirmation first.
- If an unexpected error, discrepancy, or bug is discovered, STOP and report the exact findings before attempting any fixes.

## 3. Zero Guesswork & Verified Primary Sources Only (Rule #1)
- NEVER guess, invent, or assume game logic, API structures, or formulas.
- All game data, manifests, and localization MUST come directly from verified primary sources:
  - Official Digital Extremes WorldState: `https://api.warframe.com/cdn/worldState.php`
  - Official Digital Extremes PublicExport Manifests: `https://content.warframe.com/PublicExport/`
  - Official Warframe Wiki: `https://wiki.warframe.com/` (Fandom wiki is strictly banned).
- The player inventory (`~/.local/share/kiedas-orbiter/data/user/inventory.json`) is the single ground truth for user-owned items and progress.
