# Live Preview findings

This log records defects found during the user's hands-on review of the accepted Stage 3K Linux Preview AppImage. Entries are observations and investigation notes only. Recording a finding does not authorize an application-source change, rebuild or replacement package.

## Error 1 — Inventory horizontal menus use unclear and apparently duplicated scrollbars

- **Status:** OPEN — user reproduced in the native Linux Preview
- **Reported:** 2026-09-06
- **Artifact:** Stage 3K Linux Preview AppImage
- **Screen:** Inventory
- **Evidence:** Two user-provided screenshots in the live review conversation
- **Initial observation, corrected:** The category options first appeared to be cut off and unreachable when the window narrowed. The user then discovered that the row is horizontally scrollable. The earlier classification as an unreachable-control failure was therefore too strong.
- **Confirmed observed behavior:** Enlarging the application exposes more Inventory category options. Narrowing it moves the remaining options into a horizontal scroll area. The scrollbar is effectively invisible until the pointer hovers over its area, so there is no clear indication that more categories exist offscreen.
- **Additional unresolved observation:** A second small bar is visible near the horizontal menu area. The user cannot drag or otherwise move it, and its purpose is unclear. It may be a second overflow region, a scrollbar with no useful scroll range, or a visual artifact; this has not yet been established by native geometry evidence.
- **Source context:** `PreviewInventoryLayout.jsx` defines three independent horizontal overflow regions: the account-statistics row, the filter/sort control groups and the category-tab row. Each uses `overflow-x: auto` with thin scrollbar styling. The source structure makes multiple scrollbar-like bars plausible, but it does not by itself identify the immovable bar shown at runtime.
- **Expected behavior:** When options extend beyond the viewport, the interface should make horizontal navigation obvious before hover. Every visible scrollbar or bar should have an understandable purpose and should correspond to a controllable overflow region. Search, ownership, sort and category controls must remain reachable at every supported window size.
- **User impact:** Users may conclude that categories or search/filter options disappeared because the scroll affordance is hidden. The additional immovable bar looks broken and further obscures how the controls are meant to work.
- **Investigation needed:** Capture `clientWidth`, `scrollWidth`, `scrollLeft`, bounding rectangles and computed scrollbar/overflow styles for all three Inventory overflow regions at the user's native window sizes. Identify the second bar by element, determine whether it has nonzero scroll range, and verify pointer, wheel/trackpad and keyboard access to every category and filter.
- **Change authorization:** None. Do not alter application source for this finding without separate explicit approval.

## Error 2 — Search filters mix explicit choices with hidden click-to-cycle states

- **Status:** OPEN — user reproduced in the native Linux Preview
- **Reported:** 2026-09-06
- **Artifact:** Stage 3K Linux Preview AppImage
- **Scope:** Inventory is the confirmed example; the required correction is an app-wide interaction convention
- **Evidence:** User observation confirmed against current source
- **Observed behavior:** Equivalent three-state search filters use two different interaction models. Inventory ownership exposes `All`, `Owned` and `Unowned` as separate buttons. Beside it, `Mastered` is one button whose meaning changes on repeated clicks: neutral, mastered, unmastered, then neutral. Other three-state Inventory filters use the same cycling behavior, including subsumed, socketed, prime and vaulted where applicable.
- **Source confirmation:** `Inventory.jsx` renders ownership through three directly selectable buttons. It separately defines `TRIPLE_FILTERS` and advances those filters from unset to `yes`, from `yes` to `no`, and from `no` back to unset on repeated activation of one changing button. Foundry, Mods, Cosmetics, Relics and Relic Planner already expose comparable ownership or mastery states as separate choices, demonstrating the competing convention elsewhere in the app.
- **Expected behavior:** Equivalent filter states should use one predictable interaction model throughout the application. Users should not need to remember which controls expose every state and which controls hide alternate states behind repeated clicks.
- **User impact:** The current state and the available next state are not discoverable from the cycling button. A user may assume `Mastered` is a simple on/off filter and never discover `Unmastered`, while adjacent ownership controls teach a different behavior.
- **App-wide requirement:** Choose one convention for neutral/positive/negative search filters and apply it consistently across all screens. The final design must present the current state clearly, make every available state discoverable, and retain keyboard access. This finding does not yet select or authorize either implementation.
- **Investigation needed:** Inventory every neutral/positive/negative filter and every boolean toggle used for search or catalog filtering; classify each as segmented choice, cycling control or independent toggle; distinguish mutually exclusive states from filters that may legitimately combine; then propose one shared component or behavior with exact stable and Preview migration scope.
- **Change authorization:** None. Do not alter application source for this finding without separate explicit approval.

## Error 3 — Cosmetics page cannot scroll vertically

- **Status:** RESOLVED — user confirmed vertical scrolling works in the native Linux Preview (2026-09-23)
- **Originally:** OPEN — user reproduced in the native Linux Preview
- **Reported:** 2026-09-06
- **Artifact:** Stage 3K Linux Preview AppImage
- **Screen:** Cosmetics
- **Evidence:** User report during hands-on live review
- **Observed behavior:** The Cosmetics page contains content below the visible viewport, but the user cannot scroll down to reach it.
- **Expected behavior:** The Cosmetics catalog scrolls vertically through every rendered card and exposes the `Load more` control whenever additional results remain.
- **User impact:** Cosmetics below the first viewport are inaccessible, preventing review and use of most of the catalog.
- **Source context and current hypothesis:** The application content root uses `overflow-hidden`. `PageLayout` normally establishes the internal `overflow-y-auto` scrolling region through a full-height flex layout. In Preview, `PreviewCosmeticsLayout` inserts an intermediate `<section>` around `PageLayout`; that section currently has no explicit full-height or minimum-height constraint. This may break the height chain needed by `PageLayout` and leave the outer, deliberately non-scrollable application root clipping the catalog. This is a source-based hypothesis, not yet a native geometry measurement.
- **Investigation needed:** Capture the computed heights, `clientHeight`, `scrollHeight` and overflow styles of the application main element, `PreviewCosmeticsLayout`, `PageLayout` and its internal scroll container in the failing native window. Verify wheel, scrollbar, Page Down and keyboard focus scrolling. Compare the same measurements with stable Cosmetics and another working Preview catalog screen.
- **Change authorization:** None. Do not alter application source for this finding without separate explicit approval.
