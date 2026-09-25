# Inventory scroll stutter and snap-back

## Cause

Inventory uses fixed-row windowing. `firstRow` is derived from the measured
scroll position, then the rendered grid is moved with an absolute `top` and
cards outside the window are removed (`src/screens/Inventory.jsx`). The page
scroll owner is the `PageLayout` content element in `src/components/UI.jsx`.

That owner had no `overflow-anchor` policy. During a window update, browser
scroll anchoring could choose a card that was about to be removed or moved and
adjust the owner's `scrollTop` to keep that card visible. Inventory then read
the adjusted value in its scroll handler and stored it in `windowMetrics`, so
the adjustment appeared as a stutter followed by an upward snap-back.

## Fix

`src/screens/Inventory.jsx` temporarily sets `overflow-anchor: none` on its
existing page scroll owner for the lifetime of the virtualization effect, and
restores any previous inline value during cleanup. Windowing, row estimates,
overscan, and throttling are unchanged. No new dependency or UI string was
added.

## Manual verification

1. Launch the Preview AppImage and open Inventory with a populated inventory.
2. Scroll the general grid from the top, then repeat from a deep position.
   Confirm movement is continuous and the viewport does not jump upward after
   a window update.
3. Repeat in list view, Prime Parts, Ayatan, and Arcanes; switch between narrow
   and wide window sizes and confirm the selected window remains stable.
4. At a narrow width, check the visible scrollbar count. If the account
   resource row overflows, the horizontal bar there is intentional; capture
   `[INV-SCROLL]` output from `PreviewInventoryLayout` if another bar appears.
5. Confirm changing search, filters, sort, and category still intentionally
   returns the page to the top.

This worktree cannot run the app, build, or bundle, so runtime verification is
not claimed here.
