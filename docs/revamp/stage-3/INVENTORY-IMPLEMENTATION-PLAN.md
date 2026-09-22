# Stage 3B — Linux Preview Inventory plan

**Status: ACCEPTED — LINUX.** Stage 3A Dashboard is accepted. This is one Inventory-only slice for the isolated Preview checkout. It does not authorize implementation in another screen, publication, installation over stable, or live marketplace mutations.

## Result

Make Inventory easier to scan at 900x500 and 1200x800 while retaining every visible category, filter, sort, item state, specialized card and acquisition action. Stable keeps its current layout and all behavior outside the explicitly scoped price/sale correction below. Preview receives a compact category navigator and responsive toolbar using the existing theme, icons and legitimate bundled assets. No AI artwork is permitted.

The 15 currently visible categories remain present exactly once and in their current order: All, Warframes, Weapons, Companions, Companion Weapons, Archweapons, Vehicles, Amps, Arcanes, Peely Pix, Consumables, Landing Craft, Resources, Prime Sets and Ayatan. The source also contains unreachable `mods` and `prime_junk` branches. This slice will preserve those branches without exposing or deleting them; changing navigation ownership between Inventory, Mods and Market requires a separate product decision.

At 1200x800, use a compact category rail or wrapping category bar plus a toolbar for search, filters and sorting. At 900x500, the controls must wrap or scroll within the page without clipping the item list. Account resource totals remain visible without forcing horizontal overflow. Category changes keep their existing reset behavior for filters and sorting. The item list retains 48-item progressive loading and its manual Load More action.

## Reachability correction for dormant sale code

Source review found the numeric `0` fallback, implicit `1p` substitution and missing `tradable` check exactly where recorded. A full control-flow audit also found that neither sale caller is reachable from the current Inventory UI:

- `activeTab` starts as `all` and its only setter receives IDs from the 15-entry `INVENTORY_TABS` array.
- `prime_junk` is absent from that array, so its generic-card price and Sell branch cannot be selected.
- `prime_parts` is present, but the outer render chooses the dedicated Prime Sets layout before the generic-card branch containing its Sell button.
- No other `setActiveTab` or `handleSellOnWfm` caller exists in Inventory.jsx.

The dormant code is unsafe if it is ever made reachable, but current source does not support the earlier claim that a user can trigger an accidental live 1-platinum listing from Inventory today. This slice will preserve the unreachable branches and handler without exposing them. Removing or reviving them requires a separate product and safety review.

The reachable Prime Sets layout already renders only positive prices while loading is false, so it does not display literal `0p`. Stage 3B will preserve that behavior. It may label an absent value as Price unavailable in Preview only if this can be done from the existing `allPrices`/loading contract without inventing a distinction between no orders and a fetch failure. It will not add another price fetch, change Market.jsx or alter stable marketplace behavior.

## Source scope

Planned app files:

1. `src/screens/Inventory.jsx`: retain the current data transforms and card bodies and gate the Preview composition with `IS_PREVIEW`. Preserve the dormant market branches without making them reachable.
2. `src/components/PreviewInventoryLayout.jsx` (new): Preview-only category and toolbar composition plus responsive content framing. It receives existing controls/content as props or slots and contains no inventory, price, ownership or acquisition business logic.

No dependency, lockfile, Rust/backend, global CSS, shared UI component, Market screen, parser or data-source change is planned. If a broader file is required, stop at that discovery and request approval with the exact reason.

## Implementation sequence

1. Freeze source hashes, the accepted Stage 3A cumulative patch and the original 850-file baseline. Capture the current stable Inventory rendering as the before-state.
2. Lift the existing header controls and item-list branches into stable reusable slots without changing their expressions, handlers, ordering or state lifetime.
3. Add the Preview-only layout and `IS_PREVIEW` branch. Keep the stable composition byte-equivalent where practical and behavior-equivalent under tests.
4. Verify structurally and at runtime that the dormant `prime_junk` and generic `prime_parts` sale branches remain unreachable. Do not invoke or mock a successful market mutation as part of Inventory layout testing.
5. Run source, component and packaged-native checks.

## Acceptance and evidence

- Every row in INVENTORY-PRESERVATION.md receives PASS, FAIL, BLOCKED or NOT APPLICABLE with the evidence tier stated.
- All 15 visible categories occur exactly once. Category switching, reset semantics, search-all-words behavior, every configured filter state, every configured sort and direction, 48-item progressive loading, manual Load More and empty/loading/unavailable states are exercised.
- Prime Sets, Ayatan, Arcanes and generic item cards retain their current content and acquisition-drawer action. Prime-set completion, crafted-versus-blueprint counts, vault state and drop-source tooltips are preserved as display behavior; synthetic fixtures do not certify game-data correctness.
- Reachable Prime Sets price fixtures cover positive, loading and absent numeric values. No reachable case displays unavailable data as `0p`, and no enabled Inventory market-mutation control exists. Static and runtime checks establish that the dormant sale branches remain unreachable.
- Stable before/after markup and actions are compared for representative states. Preview is tested at 900x500 and 1200x800 for bounds, scrolling, keyboard reachability, focus, control wrapping and drawer close behavior.
- Build stable and Preview frontends, rebuild Linux Preview Debian and AppImage artifacts, then rerun existing isolation/guard smoke groups plus Inventory checks. Cargo work remains `CARGO_BUILD_JOBS=4 nice -n 19` and all processes are bounded.
- Preserve unique before/after failure logs, exact source/artifact hashes, reusable harnesses, cumulative and incremental patches, original 850-file baseline and unchanged lockfile. Test-only corrections may be fixed and rerun immediately with disclosure. A new app defect or required app-source expansion stops for approval.

Deliver one consolidated review. Do not begin another screen or Stage 3C until Stage 3B is reviewed and accepted.


## Implementation and validation record

The approved Preview-only composition is implemented in the isolated `revamp/preview-shell` checkout. `Inventory.jsx` adds only the Preview imports, cached header slots and `IS_PREVIEW` PageLayout boundary. `PreviewInventoryLayout.jsx` owns the responsive composition and no inventory, ownership, pricing, acquisition or marketplace logic. Removing those approved regions restores the captured Inventory source byte-for-byte. Stable before/after markup is exact in populated, loading and empty fixtures.

The final styled component-browser run passes **177/177** checks. This includes **96/96** exhaustive control-matrix checks for every configured filter state and every sort direction across all 15 visible categories. At 1200x800 the toolbar uses two columns; at 900x500 it uses one. The category strip is a contained horizontal scroller at both sizes, all 15 categories remain reachable in the original order, the body does not overflow horizontally, search, resets, progressive/manual loading and acquisition-drawer actions pass, and reachable Prime Sets cover positive, loading and absent-price states without `0p` or a Sell action. Synthetic fixtures validate UI behavior only; they do not certify live game or market data.

Fresh Ubuntu 24.04 release builds produced Debian and AppImage packages. Each package passes **30/30** native checks: 10 base isolation/navigation checks, 4 import-dialog layout checks, 5 live-integration guards, 4 market-mutation guards, 3 updater-disabled UI checks, 2 accepted Dashboard checks and 2 Inventory responsive-layout checks. The original 850 tracked files and Cargo.lock remain unchanged, and the cumulative patch applies cleanly to the original checkout.

Test-tooling corrections are preserved as `before-*` evidence: a container-only Node path was replaced for host frontend checks; the browser fixture gained its missing initial navigation; real labels/casing and Map fixtures were corrected; a wrong working directory and duplicate fixture export were fixed; an initial unstyled geometry run was rejected and rerun with the real app CSS/fonts; matrix DOM selectors and omitted WebDriver returns were corrected; and bundling was rerun in the existing package image after the base build image lacked `xdg-open`. One approved layout adjustment added `flex-shrink: 0` to category buttons after styled evidence showed they compressed instead of scrolling. No other app-source fix was made.

Stage 3B was explicitly accepted by the user on 2026-09-05. Stage 3C and other screens have not started.
