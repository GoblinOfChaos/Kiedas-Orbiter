# Stage 3I — Linux Preview Market plan

**Status: ACCEPTED — LINUX.** Stage 3A through Stage 3I are accepted Linux milestones. Stage 3I combines dense responsive layout work with a Preview-only presentation guard around real marketplace mutation controls. The accepted implementation and evidence are recorded in `market-implementation.json` and `evidence/market-validation-summary.json`.

## Why this stage is higher risk

`Market.jsx` is 1,142 lines and owns both read-only marketplace browsing and authenticated order mutations. Its two tabs share 24 state hooks, progressive price loading, catalog caches, inventory-derived valuation, editable order rows and five user-facing mutation paths. A layout hook attached to the wrong element could affect live stable controls, and a mistaken Preview condition could either expose a mutation or disable stable trading. This stage therefore requires stricter stable-render, invocation-payload and direct IPC evidence than the preceding catalog screens.

The Rust boundary already rejects Preview calls to `post_market_order`, `delete_market_order`, `update_market_order` and `close_market_order`. Normal read-only data requests are permitted by the accepted Stage 2 contract. Stage 3I will retain read-only catalog, price and active-order access while making every Preview mutation affordance visibly disabled. It will not weaken, replace or move the Rust guards.

## Verified current behavior

- The exact Preview navigation label derived from current `App.jsx`, `en.json` and `PreviewNavigation.jsx` is `Market`. The source-fact record is `evidence/market-nav-source-fact.json`.
- The screen has two reachable tabs: Active Orders and Tradeable Stock.
- Four summary cards show potential Platinum earnings, active-order count, visible/hidden sell orders and tradeable-stock count.
- Active Orders has four filters: All, Sell, Buy and Hidden; one text search; a six-column table; inline price editing; visibility toggle; Mark Sold; and Delete.
- Tradeable Stock has five reachable filters: All, Sell for Plat, Best for Ducats, Duplicates and Mastered. The source also contains an `unmastered` filter predicate, but no current control or setter can select it; it is dormant and will remain unreachable.
- Tradeable Stock has six reachable sort choices: best Plat ratio, best Ducat ratio, highest Plat, most owned, highest Ducats and name A–Z. Card order intentionally remains fixed while prices resolve and changes only when the item set, filter, search, sort or explicit Refresh Sort action changes.
- The active-order table is wrapped in `overflow-hidden` with no horizontal scroll boundary. At narrow content widths, its item, type, quantity, price, status and action columns can extend beyond the screen.
- The stock toolbar wraps its filter buttons and uses a viewport-based `lg` breakpoint. The result grid uses viewport `md`/`lg` breakpoints instead of the content width left after Preview navigation.
- The catalog is resolved through `ensureWfmItems`/`lookupWfmItem`; only positive-quantity items with a verified WFM match and `tradable !== false` enter saleable stock.
- Price state remains explicit: loading, ready, no orders or error. An unresolved price becomes `platPrice: null`, displays `?`, and cannot enable Sell. No missing value is converted into `0p` or an invented listing price.
- A stock listing requires a verified WFM item ID, positive owned quantity and a numeric price of at least 1 Platinum. Following an approved defect correction found during validation, an explicit user entry is preferred and the displayed verified `item.platPrice` is used otherwise; missing and nonpositive prices remain rejected. The command always lists quantity 1 and rank `null`.
- Stable exposes five mutation interactions: stock Sell invokes `post_market_order`; row Delete invokes `delete_market_order`; Mark Sold invokes `close_market_order`; visibility and price changes each invoke `update_market_order` with distinct nullable payload fields.
- `get_my_market_orders` is a read-only authenticated request and is not behind `require_live()`. All four mutation commands are independently guarded by `build_profile::require_live()` in Rust.

## Preserved data and behavior boundaries

- Keep token lookup through the isolated profile's `loadSettings()` / `getSetting('wfm_token')` path. No token copying, new credential store or logging of token contents may be introduced.
- Keep the existing automatic initial catalog/order load and manual Sync Listings behavior.
- Keep both existing WFM item-catalog paths, cache keys and response parsing. No guessed listing ID or name-only mutation lookup may be added.
- Keep `lookupWfmItem` as the saleable-stock resolver and preserve `tradable !== false` plus positive-quantity filtering.
- Keep `getPriceState` and its explicit loading, ready, no-orders and error states. Preserve its WFM-ID cache identity, 24-hour cache behavior, serialized request gate and no-fake-zero behavior.
- Preserve all valuation thresholds exactly: Sell for Plat at `platPrice >= 15` or Plat/Ducat ratio `>= 0.22`; Keep for Ducats at Ducat/Plat ratio `>= 15` or at least 45 Ducats with price `<= 3`; otherwise Fair Value.
- Preserve duplicate and mastered derivation, all five reachable stock filters, the dormant/unreachable `unmastered` predicate and all six sorts.
- Preserve deliberate ordering stability while prices resolve and the explicit Refresh Sort action.
- Preserve both tab identities, four order filters, case-insensitive substring searches, six table columns, metrics and empty/loading/error/success states.
- Preserve exact stable mutation payload shapes, success-state updates, loading states and error handling. The one approved stable correction makes the enabled stock Sell control use its already displayed verified price when the user has not manually overridden it.
- Keep Preview's direct Rust rejection of all four mutation commands. No UI condition may be treated as the security boundary.
- Keep read-only catalog, price, order-sync and Open Website paths available in Preview.
- Keep current translations and existing literal-English boundaries. No translation file changes are proposed.
- Do not add artwork. AI artwork remains prohibited.

## Proposed app-source boundary

If explicitly approved, exactly two app files may change:

1. `src/screens/Market.jsx`: import `IS_PREVIEW` and the Preview layout wrapper; pass existing header, metrics, tabs, toolbars, table and stock grid through scoped hooks; add Preview-only disabled states and explanatory text to existing mutation affordances. Stable formulas, payload shapes, caches, filters, sorts and rendered markup remain unchanged; the approved displayed-price fallback corrects the stock Sell handler.
2. `src/components/PreviewMarketLayout.jsx` (new): enabled pass-through wrapper and scoped container-responsive styles only. It contains no state, fetching, token access, valuation, market IDs, price logic or Tauri commands.

Explicitly excluded: `wfmCache.js`, settings/token storage, `MonitoringContext.jsx`, inventory parsing, `src-tauri`, capabilities, shared UI, global CSS, translations, dependencies, lockfiles, overlays and every other screen.

## Proposed Preview composition

- Keep the current header, Sync Listings and Open Website actions, but allow the header action row to wrap within the available content width.
- Add a clear, compact Preview notice that marketplace changes are disabled while read-only prices and listings remain available.
- Keep the four metrics, using a container-responsive grid based on the Market screen's available width.
- Keep the two tabs as a contained single-line rail with horizontal scrolling when needed.
- Active Orders keeps the current filter/search toolbar and table content. The filter group becomes a contained rail, and the table receives its own horizontal scroll boundary and explicit minimum content width so the page itself never overflows.
- Tradeable Stock keeps all current filters and sorts. Filter controls become a contained rail; search, sort and Refresh Sort remain reachable; the card grid responds to the screen container rather than the full viewport.
- In Preview only, price editing, visibility toggles, Mark Sold, Delete, stock price inputs and Sell on WFM are visibly disabled and expose a consistent explanation. Existing read-only order values and recommendations remain visible.
- Stable receives the wrapper's direct `children` pass-through and no extra wrapper node, notice, attributes or changed disabled state.

## Validation plan

### Source and component evidence

- Freeze the accepted Stage 3H cumulative patch, current Market source, original 850-file baseline and Cargo.lock before editing.
- Generate the Stage 3I implementation patch with native Git diff output and verify the cumulative patch with `git apply --check`.
- Prove that removing only the approved Preview import, wrapper, hooks, notice and disabled-state expressions restores the original `Market.jsx` byte-for-byte.
- Compare stable rendered markup byte-for-byte before and after across at least: no token, loading orders, empty orders, populated mixed orders, each order filter, order search, price edit, action loading, success, error, catalog loading, catalog error, empty stock, populated stock, each price state and open sort menu.
- In stable component fixtures, exercise all five mutation interactions and compare the exact invoked command/payload and resulting local state before versus after. Use synthetic tokens, catalog entries, orders and inventory only; never contact a real account.
- In Preview component fixtures, verify every mutation control is disabled or non-interactive, explanatory text is visible, and attempted pointer/keyboard activation records zero mutation invocations.
- Exercise all four order filters, all five reachable stock filters, all six sorts, both searches, both tabs, Sync Listings, Retry and Refresh Sort.
- Verify the dormant `unmastered` predicate remains unreachable unless separately proposed and approved.
- Verify verified-catalog/tradability/positive-quantity filtering, all four price states, missing-price `?` display, Sell enablement rules, valuation thresholds, ratio calculations and deliberate sort stability while prices resolve.
- At 1200x800 and 900x500, verify header, metrics, tabs, toolbars, six-column order table and stock cards stay within the Market content region; the table and control rails scroll internally; no page-level horizontal overflow occurs.
- Exercise keyboard traversal for both tabs, filters, sort menu, searches and read-only links. Verify disabled Preview mutation controls communicate their disabled reason.
- Verify English and German labels from the real translation files and record unchanged literal-English boundaries.

### Linux build and packaged evidence

- Use `.preview-work/ubuntu-build/toolkit/` for every native operation, with absolute paths, preflight output isolation, four CPUs, `CARGO_BUILD_JOBS=4` and `nice -n 19`.
- Derive and verify the exact Market navigation label before native execution.
- Preserve Stage 3H artifacts, then run stable and Preview frontend builds, fresh Ubuntu release compilation and fresh Debian/AppImage packaging.
- Rerun all **60 accepted packaged checks per artifact**.
- Add **10 Market checks per artifact**, targeting **70/70** total for Debian and **70/70** for AppImage: Active Orders geometry at both sizes, Tradeable Stock geometry at both sizes, table containment, tab/toolbar keyboard access, explicit price-state rendering, read-only controls retained, Preview mutation UI disabled with zero frontend mutation invokes, and direct rejection of all four mutation IPC commands.
- Use only synthetic local fixture state in a network-disabled container. No real WFM token, account, listing or market mutation is permitted.
- Recheck artifact hashes, preserved Stage 3H artifacts, Cargo.lock, cumulative patch, original 850 tracked files and absence of Stage 3J source.

## Stop conditions

Stop and request a separate decision before any change to valuation formulas, price/cache logic, WFM lookup identity, token handling, mutation payloads, Rust guards, stable behavior, dependencies, translations or another screen. Batch test-harness-only corrections under the existing blast-radius rule and retain their failed evidence.

## Acceptance boundary

Approval of this plan would authorize only the two-file Stage 3I implementation and its Linux validation. It would not authorize publication, installation over stable, live marketplace testing or Stage 3J. Windows remains OPEN/BLOCKED and macOS remains OPEN/UNAVAILABLE. A real published-version upgrade and exhaustive tracing remain independent tracks.

## Implementation result

The component matrix passed 61/61 checks with 15/15 byte-identical stable markup comparisons. Both fresh Linux packages passed 70/70 cumulative checks. Preview recorded zero frontend mutation invocations in the module-boundary component capture, every packaged mutation control remained disabled/non-interactive, and all four mutation IPC commands were directly rejected in both packaged runs. The approved stable displayed-price fallback invoked the exact synthetic `post_market_order` payload at 20 Platinum; no real account, token, network, or listing was used. The user accepted Stage 3I as a Linux milestone on 2026-09-06.
