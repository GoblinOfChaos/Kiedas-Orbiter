# Riven Slide-Crit OCR Fix — Status Note (not a plan)

**GitHub issue:** #77

This one doesn't need an implementation plan — the fix already landed in commit `bb64c43` (2026-08-08). Documenting here only so it appears alongside the other open-issue plans, per the request to have a local file for every open issue.

## What was done

`cleanStatName()`/`displayStatName()` in `src/lib/rivenOcrI18n.js` resolved OCR'd riven stat text via first-match substring search instead of longest-match, so "Critical Chance when Sliding" always matched the shorter "Critical Chance" first. Fixed by:
- Preferring the longest/most-specific substring match in both the alias-fallback and `STAT_TO_PRICER`-fallback loops.
- Adding the literal in-game phrases "Critical Chance when Sliding" / "Critical Chance while Sliding" as direct `STAT_TO_PRICER` entries (their word order doesn't match the existing "Slide Crit Chance" alias, so substring matching alone couldn't bridge them).
- Reordering `cleanStatName()` so exact matches run before fuzzy substring fallback.

Verified at the logic level (English + German locale aliases, regression-checked against other conditional/base stat pairs like Combo Count vs Combo Count Chance) and the frontend build is clean.

## What's still open

Not yet verified against a live riven card OCR scan in-game. Issue #77 stays open until someone can confirm the fix against a real slide-crit riven — the parsing logic works, but the OCR pipeline's actual text extraction (segmentation, model confidence, etc.) hasn't been exercised end-to-end for this specific stat since the fix landed.

## To close this out

1. Get a riven with "Critical Chance when Sliding" (or a friend's) in front of the app's OCR scanner.
2. Confirm the parsed/graded result shows the slide-crit stat correctly, not plain Critical Chance.
3. `gh issue close 77 --repo GoblinOfChaos/Kiedas-Orbiter --comment "..."` with the live verification result.

No further code changes anticipated unless live testing reveals the OCR pipeline itself (not the stat-name matching this fix addressed) has a separate issue reading this specific stat's text off the card.
