# fixes4

## Plan

Inspect all seven review findings, make only the scoped `Market.jsx` fixes, then run static diff checks without compiling or testing.

## Result

All seven findings held and were fixed:

1. Pricing excludes veiled, challenge, and stat-less Rivens; unavailable rows are `unknown` and cannot be `sell_plat`.
2. Ordering depends on `saleableStock`/`marketRivens` source changes plus filter/sort/search/refresh, not price-enriched stock updates.
3. Rivens are excluded from both mastered and unmastered predicates.
4. Riven quantity uses `riven.quantity ?? 1`.
5. Pricer name fallback is null-safe.
6. Unavailable estimate reason is empty, avoiding duplicate text.
7. Fallback Riven keys include `unique_name`, stats, and source index; item IDs remain preferred.

## Verification

`git diff --check` passed. Changed code and related Riven parser/Rivens pricing gates were read statically. No builds, tests, compilers, bundlers, or network calls were run.

## Risk / follow-up

Runtime UI and invoke behavior remain unverified by constraint. The fallback index is stable while inventory ordering is stable; a future per-veiled-item ID should supersede it.
