# Stage 3A — Linux Preview Dashboard layout

**Status: IMPLEMENTED and validated; Stage 3A is held for user review.** Linux Stage 3 is authorized; this is its first bounded implementation slice. Stage 2 remains accepted. Persistent platform items stay in ../ACCEPTANCE-LEDGER.md without routine re-review.

## Result

Make the existing Dashboard easier to scan while retaining all cards and actions. Keep the navigation label/route Dashboard; Today remains its navigation group. No new data services, item rules, market pricing, Farming Targets, overlays or notification behavior.

Keep the current title, synchronization timestamp, refresh and customization controls together at the top. Below, show existing cards in three sections with in-page navigation links:

| Section | Existing card IDs in reading order |
|---|---|
| Now | timers, alerts, arb, inf, fiss, inv |
| Activities & rotations | bounty, nightwave, sortie, hunt, arch, desc, circuit, 1999 |
| News & offers | baro, event, deal, sales, news |

These 19 IDs occur exactly once. Existing hide preferences and conditional data visibility still govern each card. No new default collapse, hidden overflow carousel or per-section preference. Skip empty section headings; when all cards are hidden, keep customization reachable and show a small explanatory empty state. Existing cards keep their own empty/data states.

At the minimum 900×500 window, use one content column with normal page scrolling. At the normal 1200×800 window, use two columns when the actual content width permits; wide tabbed/calendar content spans both. DOM and visual reading order must agree. Keep refresh/customization reachable without a sticky layer covering card controls. In-page section links are keyboard accessible. Use existing themes, icon library and legitimate assets only; no AI artwork or image mockup assets.

## Source scope and implementation

1. Freeze accepted Stage 2 implementation/manifest and Dashboard source hash as the before-state; work only in the existing isolated Preview checkout.
2. In src/screens/Dashboard.jsx, lift the existing card JSX into consistently keyed slots without rewriting handlers, hooks, data transforms or nested dialogs. Retain the stable column composition and loading behavior using those same slots; gate the new composition with IS_PREVIEW. Keep dialogs at their existing screen scope so layout changes do not reset them unexpectedly.
3. Add src/components/PreviewDashboardLayout.jsx for the Preview-only section layout, anchors and all-hidden message. Prefer local scoped classes/utilities; avoid modifying shared UI.jsx, global styles or other screens. If existing styles require broader changes, report the concrete need before expanding scope.
4. The new Preview-only section chrome uses English, consistent with current Preview navigation. Existing translated card labels/content remain untouched; no guessed translations or altered locale datasets.
5. Test fixtures/runners and evidence belong under .preview-work and docs/revamp/stage-3. No dependencies, lockfile or backend changes are planned.

Refactoring shared JSX can affect stable even when the new layout is gated. Stable equivalence is an acceptance requirement, not assumed from the IS_PREVIEW branch. If extracting a slot changes conditional rendering, order, state lifetime or child behavior, correct it within the approved layout scope and verify against the before-state; unrelated app defects require their own review.

## Acceptance and review

- Every row in DASHBOARD-PRESERVATION.md receives a specific PASS/FAIL/BLOCKED result with evidence; no dropped conditional cards or nested controls.
- Before/after stable rendering and behavior checks for populated, loading, empty and hidden-card states; no stable layout redesign.
- Preview controls and dialogs tested at 900×500 and 1200×800: keyboard reachability, content bounds/scrolling, tab selections, calendar actions, dialog open/close/Descendia reset, refresh and visibility persistence after reload. Confirm all-hidden recovery.
- Fixtures use real component/module boundaries and explicit synthetic content for UI assertions; no invented game data or runtime passes inferred from static occurrences. Open-url actions are intercepted in component tests; no external messages, orders or account operations.
- Build stable and Preview frontends; rebuild Linux Preview artifacts and native-smoke the changed screen plus existing isolation guards. All Cargo work uses CARGO_BUILD_JOBS=4 and nice 19, and all test/build processes remain bounded.
- Preserve before/after patch, exact source/artifact hashes, reusable runners and failure logs with unique filenames. Verify original 850-file baseline and unchanged lockfile.
- Deliver one consolidated review of this slice. Do not begin another screen group until reviewed.

The approved Dashboard-only source scope is implemented and validated. It does not reopen platform validation or authorize another screen group. See the validation record below.


## Validation record

- 19 extracted card expressions match their saved pre-change hashes byte for byte. The stable branch renders those shared slots in its original grid.
- 174 component-browser checks pass, including four nonempty stable before/after render comparisons and 21 stable before/after action comparisons. Preview checks cover all 19 visibility toggles, exact section/card order, one- and two-column layouts, section keyboard focus, all tabs, calendar month/day selection, three dialogs, Descendia reset, refresh, news dispatch, all-hidden recovery and reload persistence.
- Final Debian and extraction-mode AppImage each pass 28 native checks: the prior 26 groups plus two Dashboard layout checks at 1200x800 and 900x500. Synthetic empty parsed WorldState is injected into the real MonitoringContext; backend commands are not mocked, and integration/market guards are still exercised through native IPC.
- Stable and Preview frontend builds, bounded Ubuntu native build and both bundles pass. No dependencies, lockfile, backend, shared UI component, game-data rules or artwork changed.
- evidence/baseline-check.json verifies the original 850 files, unchanged Cargo lockfile, source hashes and cumulative patch applicability. evidence/release-artifacts.json contains final hashes.

Test-tool corrections are preserved: a missing synthetic Events array caused both before/after screens to fail; a later raw-key translation fixture made the Wishlist label overflow stable columns and intercepted the click; and a broad whitespace formatter was reverted from the saved patch before only five added whitespace lines were cleaned. None required application behavior changes. Earlier failing evidence remains under before-* prefixes.

Evidence limits: populated states are synthetic UI fixtures and do not certify live Warframe data semantics, pricing, ownership or Nightwave progression. Native Dashboard coverage injects an empty parsed state and is not a live WorldState fetch. Stage 3A is complete for review; no next screen group has started.
