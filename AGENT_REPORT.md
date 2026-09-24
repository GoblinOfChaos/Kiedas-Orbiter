# Plan

1. Inspect the existing Market/Rivens inventory, pricing, authentication, and preview paths.
2. Add Riven inventory rows to Market stock analysis using the existing local Riven pricer; add no new read or write network path.
3. Document the verified current Warframe.market API contract and record any requested auction details that official docs do not verify.
4. Stop before any unverified Riven auction writer or live write validation.

# Summary

Implemented the safe portion of Stage 1. Market stock analysis now includes owned Rivens and displays the existing local model's platinum estimate as an explicitly estimated market value. Veiled/challenge Rivens remain visible with an unavailable estimate rather than a guessed value. No Warframe.market write endpoint was called.

Stage 2 documentation records the current official v2 order API, existing app auth behavior, and the requested Riven auction fields that could not be verified in the official public docs. Stage 3 was not implemented because the requested auction contract and stat `url_name` mapping are not documented there; inventing them would violate the worktree's no-guessing rule.

# Files changed

- `src/screens/Market.jsx` — include local Riven estimates in stock analysis and render guarded Riven stock cards.
- `src/lib/i18n/en.json` and the 14 locale JSON files — add English-copy UI keys pending translation.
- `docs/market/RIVEN-LISTING-DESIGN.md` — official documentation findings and open questions.
- `AGENT_REPORT.md` — this report.

# Verification

- `git status --short --branch` — confirmed the assigned branch and clean starting status.
- `rg`/`sed` source inspection — confirmed inventory Riven fields, existing local pricing invocation, v2 order auth, and existing stock flow.
- `node --check src/lib/rivenGrader.js && node --check src/lib/rivenPerfectness.js` — passed.
- `node -e` JSON parse of all `src/lib/i18n/*.json` files — passed (`all locale JSON parsed`).
- `git diff --check` — passed.
- No live Warframe.market write endpoint was called.

# Open questions and risks

- Official public docs document `POST /v2/order` for ordinary item orders, not the requested Riven auction payload containing weapon slug, `url_names`, starting/buyout prices, or contracts.
- The current local Riven model is an estimate derived from the app's bundled pricing model, not a live per-roll auction quote. UI labels it as an estimate.
- Official docs say OAuth 2.0 is not available to public integrations; current app code uses a stored JWT with Bearer and Cookie headers, but the public docs do not fully specify this legacy flow.
- No Riven listing action was added until those contracts are verified from official documentation.

# Suggested follow-ups

- Obtain an official, current Riven/contract API specification from Warframe.market maintainers.
- Revisit Stage 3 only after the auction endpoint, payload, stat mappings, auth, and validation rules are authoritative.
