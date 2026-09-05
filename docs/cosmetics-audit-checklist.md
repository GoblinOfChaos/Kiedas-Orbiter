# Cosmetics Screen — Automated Audit Checklist

For an automated testing program to execute against the running app (Cosmetics
screen, `src/screens/Cosmetics.jsx`). Each item is one independent, concrete
thing to check live — not code review. Kind/type filters referenced: Warframe,
Primary, Secondary, Melee, Archwing, Sentinel, Syandana, Armor, Animation,
Sigil, Glyph, Decoration, Emote, Other.

## Search and filters

1. Searching "agile" with the kind filter on "All" returns every Agile Animation Set in the game (~75, one per Warframe) — not just 1-2. If it doesn't, check whether a specific kind tab was silently still active when the search ran.
2. Searching "noble" with "All" selected returns a similarly large result set (Noble is the other universal animation-set style).
3. Every kind filter tab (Warframe, Primary, Secondary, Melee, Archwing, Sentinel, Syandana, Armor, Animation, Sigil, Glyph, Decoration, Emote, Other) shows a real, non-empty label — not a raw key like `COSMETICS.KIND_SYANDANA`.
4. Every kind filter tab, when clicked, actually filters results to that category and no other.
5. The "All" kind tab and "All" ownership tab visually indicate they're active/selected when chosen, and only one tab per row is ever shown as active at a time.
6. Clearing the search box after typing restores the full unfiltered list for the currently-selected kind/ownership filter (not stuck showing the last search's results).
7. Typing a search query and then switching kind filter tabs keeps the search query applied on top of the new filter (both conditions AND together, not one replacing the other).
8. Searching for a name that doesn't exist shows an empty/no-results state, not a crash or stale results from the previous query.
9. The ownership filter (All/Owned/Unowned) correctly narrows results — an item shown under "Owned" is actually owned, and under "Unowned" is actually not.

## Images

10. Every Warframe skin card shows a real thumbnail, not "Image Unavailable".
11. Every weapon skin card (Primary/Secondary/Melee) shows a real thumbnail.
12. Every Syandana card shows a real thumbnail.
13. Every Armor card shows a real thumbnail.
14. Every Animation Set card (Agile and Noble, across all Warframes) shows a real thumbnail — this is a data-completeness risk area since many "Unlock" variants are known to be missing from the primary export.
15. Every Sigil card shows a real thumbnail.
16. Every Glyph card shows a real thumbnail.
17. Every Decoration card (ship decorations) shows a real thumbnail.
18. Every Emote card shows a real thumbnail.
19. The 7 hand-added catalog items (Mesa Heirloom Skin/Helmet/Duster/Regulators Skin/Signa, Bubonico Daybreak Skin, Atomicycle Key Sugatra) all show real images now, not the "Image Unavailable" placeholder — this was a known bug fixed this session; confirm the fix actually took.
20. No cosmetic item that has a real, verifiable image anywhere (wiki, WFCD CDN) is showing "Image Unavailable" when a real image could be sourced.

## Acquisition text — general

21. Clicking "Acquisition" on any card opens the drawer without error, for every kind of cosmetic.
22. No acquisition text anywhere on this screen is a raw, unformatted concatenation of wiki infobox fields (e.g., "Designed by X Round 22 [Batch 1] $2.99 (PC) Platinum 35 (Console)" with no punctuation) — this exact defect class was found and fixed for TennoGen items this session; check for other instances (Baro items, vendor items, resource items).
23. No acquisition text shows a duplicated phrase (e.g., "Operational Supply - Operational Supply, Champion") — found on at least one syndicate-sourced item this session; check other syndicate-drop cosmetics for the same pattern.
24. No acquisition text says "UNKNOWN" or shows raw internal DE path fragments (leftover audit markers, not real player-facing info).
25. Every acquisition drawer that has a "Search Warframe Wiki" link produces a working link to a real, relevant page.

## Acquisition text — "always available" claims

26. For every cosmetic whose acquisition text says "Available directly in the in-game customization menu": verify this is only ever shown for a cosmetic with NO `requirement` prerequisite item — an Animation Set that needs a separate Unlock item first should never show this text (this exact bug was found and fixed for Inaros this session across up to 151 affected items; spot-check other Warframes' Agile/Noble sets).
27. For every Animation Set (Agile/Noble) across all Warframes, verify the acquisition text describes how to actually obtain the "Unlock" item, or honestly says no data is available — never a confident-but-wrong "available directly" claim.
28. TennoGen-purchased items show clean "TennoGen skin - purchased via Steam Workshop/console store for $X" text, not a raw override dump — this was fixed this session for items with a structured TennoGen record; confirm the fix covers every TennoGen item, not just the two examples found.

## Owned/unowned state

29. An item you actually own in-game shows the "Owned" badge (green), not "Missing".
30. An item you don't own shows "Missing" (or equivalent), not "Owned".
31. Owning an item through the ship-decoration bucket (`ShipDecorations` inventory field) is correctly detected as owned for Decoration-kind cards.
32. Owning a Glyph shows as owned even if the glyph is otherwise flagged `excludeFromCodex`/`codexSecret` in its source data (per the code's intent: those flags only hide *unowned* instances, not owned ones — same pattern as the earlier Robotics mastery `codexSecret` fix).
33. An unowned item with `codexSecret`/`excludeFromCodex` and no icon/texture is correctly hidden from the catalog entirely (not shown as an unownable ghost entry) — verify this filter doesn't also accidentally hide a real, owned item.

## Category coverage / classification

34. Every real in-game Warframe's skins classify under the "Warframe" kind tab, not "Other" — spot-check a newer Warframe (added after `buildWarframeFamilies`'s family-detection logic was last verified) to make sure it wasn't missed.
35. Operator/Drifter cosmetics, Necramech skins, Kaithe ("Horse"/Duviri mount) skins, and Kahl cosmetics all classify as "Other" (not misclassified as "Warframe") — confirm this is still the intended bucket, not silently wrong for one of them.
36. Companion cosmetics (Kubrow, Kavat/"Catbrow", Moa/"MoaPet") classify consistently — confirm they land in a sensible kind, not scattered across "Other" and something else.
37. Weapon skins for a Zaw, Kitgun, or modular weapon component classify under the correct Primary/Secondary/Melee tab, not "Other".
38. Railjack and Clan-related skins classify sensibly and aren't silently dropped from the catalog entirely.

## Counts, pagination, sorting

39. The visible item count matches the actual filtered result count — "Load more"/pagination (120 per page) reveals the rest without duplicating or skipping items.
40. Scrolling to the bottom and loading more pages doesn't reset scroll position or cause visible items to reshuffle.
41. Changing any filter (search/kind/ownership) resets pagination back to the first page, not stuck showing only what was visible before the filter changed.
42. Sort order is consistent: grouped by kind/type, then alphabetical by name within each kind — verify this order doesn't visibly jump around between renders.
43. The total item count for the whole Cosmetics catalog (all kinds combined, no filter) is in a plausible range for the current game's real cosmetic count — not suspiciously low (indicating a silently-dropped category) or suspiciously high (indicating duplicates).

## Data-freshness / completeness

44. Compare the Animation Set count actually shown against the real number of released Warframes × 2 (Agile + Noble) — flag any gap as either a missing "Unlock" item (known issue class) or a genuinely-never-released style for that frame.
45. Ship decoration coverage: confirm no known real decoration parent category is missing from the hardcoded `decorationParents` list in the code (Plushies, trophies, drawings, Shawzin pieces, vignettes, layer items) — a new decoration type added post-code-freeze would silently not appear at all.
46. Confirm Sigils, specifically ones behind syndicate rank-up rewards, show correct syndicate/rank/standing-cost text and not a generic fallback.
47. Confirm no cosmetic that's actually a Prime-exclusive or bundle-exclusive item is shown with a plain "Available directly" or "Market purchase" claim when it actually requires owning a specific bundle/Prime access.

## Regression checks (bugs found and fixed this session — confirm they stay fixed)

48. "Inaros Agile Animation Set" specifically no longer claims blanket direct availability.
49. "Banshee Sonority Skin" and "Caerulea Oculus" (TennoGen items) show clean, non-garbled acquisition text.
50. All 7 hand-curated catalog additions (Mesa Heirloom set + Bubonico Daybreak Skin + Atomicycle Key Sugatra) show both a real image and correct owned/unowned status.
