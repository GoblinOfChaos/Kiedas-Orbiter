# Stage 3F — Linux Preview Rivens plan

**Status: ACCEPTED — LINUX MILESTONE.** Stage 3F was explicitly accepted on 2026-09-06. It remains isolated in the Preview checkout and has not been published or installed over stable. Pricing-model logic, inventory parsing, marketplace behavior, translations and every other screen remain unchanged.

## Goal

Make Rivens easier to scan and operate at 1200x800 and 900x500 while preserving its current inventory records, nine weapon-type filters, four state filters, three sort criteria, capacity summary, local batch valuation, stat grading, card rendering, tooltip and grade drawer. Stable must retain byte-identical rendered markup and behavior. Preview receives a bounded responsive control frame, a narrower card gap where necessary, and keyboard access to the existing card action.

## Verified current behavior

The current `Rivens.jsx` is 331 lines and has no screen-level responsive breakpoint or horizontal-overflow rule. Its first header row contains search, four state buttons and three sort buttons in one non-wrapping flex row. Its second row contains nine shared `Tabs` choices. Cards use a fixed inline grid of 200px columns and a fixed 50px gap.

The screen derives all records from `inventoryData.rivens`. It renders four distinct pre-content states: inventory loading, no inventory, mod-frame assets loading, and no matching records. Its subtitle reports unveiled, challenge and veiled counts plus used/capacity.

The exact navigation label was derived with the accepted toolkit from `App.jsx`, `en.json` and `PreviewNavigation.jsx`: `Rivens`. The source-fact record is `evidence/rivens-nav-source-fact.json`.

## Preserved data and behavior boundaries

- Keep `rivenKey()` unchanged: prefer `item_id`; use name plus veiled/challenge suffix for stacked special states; otherwise combine name with sorted stat tags.
- Keep search as case-insensitive matching against `riven.name`.
- Keep all weapon types and exact matching against `weapon_type`: All, Rifle, Pistol, Melee, Shotgun, Sniper, Kitgun, Zaw and Archgun.
- Keep all state filters: All States, Unveiled, Challenge and Veiled, including the existing challenge/veiled predicates.
- Keep sort activation and direction behavior. Name, platinum and grade sorts retain the current `desc` default, repeat-click direction toggle, grade order `S A B C D F`, price tie-breaker and missing-price sentinel of `-1`.
- Keep stat grading through `loadRivenGoodRolls()` and `getRivenStatGrade()` with the existing English weapon-name fallback.
- Keep the `STAT_TO_PRICER` mapping and `estimate_riven_full_batch` payload unchanged. Only unveiled, non-challenge records are priceable. Preserve the current cache, cancellation behavior, successful-result reset and at-most-three delayed retries at three seconds when every result is null.
- Keep asset lookup through `get_icons_path`, `get_mod_frames_path` and `convertFileSrc` unchanged.
- Keep every `RivenCard` prop and its 200px width unchanged. A missing estimate remains undisplayed. An estimate with an explicit numeric price continues to use the current rounded price badge and tooltip behavior. This slice must not convert missing data to zero or introduce a sale price.
- Keep `RivenGradeDrawer` content, grading statuses, close action and open-card identity unchanged.
- Keep current translation behavior. Screen/loading/drawer strings continue using existing keys; the filter and subtitle labels remain their existing hard-coded English values in every locale. Translation cleanup is outside this layout slice.
- Rivens, `RivenCard` and `RivenGradeDrawer` contain no Warframe.Market order mutation or Sell path. None may be introduced.

## Proposed app-source boundary

If approved, exactly two app files may change:

1. `src/screens/Rivens.jsx`: import `IS_PREVIEW` and the Preview wrapper; compose the existing header and grid through it; add only Preview-gated layout hooks and keyboard attributes to the existing card wrapper. All filtering, sorting, pricing, grading, retry, count, asset and drawer logic remains unchanged.
2. `src/components/PreviewRivensLayout.jsx` (new): enabled pass-through wrapper and scoped responsive styles only. It contains no state, inventory transforms, pricing, commands, grading or drawer logic.

Explicitly excluded: `RivenCard.jsx`, `RivenGradeDrawer.jsx`, `rivenGrader.js`, monitoring and inventory parsing, Tauri/Rust, shared UI, global CSS, translations, dependencies, lockfiles, Market, overlays and every other screen.

## Proposed Preview composition

- The wrapper returns `children` directly when disabled so stable receives no wrapper node.
- At wide widths, search, state filters and sort controls remain a compact row. At narrow widths they become a bounded one-column control stack.
- State, sort and weapon-type controls remain single-line horizontal rails with contained horizontal scrolling instead of wrapping into a tall header or overflowing the page.
- The card grid continues to use 200px cards. Preview replaces the fixed 50px gap with a bounded responsive gap while retaining centered auto-fill columns.
- The existing card wrapper keeps its pointer action. Preview alone adds `role="button"`, `tabIndex={0}`, an item-name accessible label, visible focus styling, and Enter/Space activation. `RivenCard` has no nested interactive controls, so this does not create nested-button semantics.
- No art or card artwork changes. No AI artwork is permitted.

## Validation plan

### Source and component evidence

- Freeze the accepted Stage 3E cumulative patch, the current Rivens source, original 850-file baseline and Cargo.lock hash before editing.
- Prove that removing the approved Preview import, wrapper, layout hooks and keyboard attributes restores the original `Rivens.jsx` byte-for-byte.
- Compare stable rendered markup byte-for-byte before and after for: loading, no inventory, frame-path loading, no matches, mixed populated records without estimates, populated estimates/grades, curated grade drawer open, and no-profile drawer state.
- Exercise all nine weapon filters and all four state filters with parsed-shape fixtures. Verify search, empty state, count/capacity subtitle and duplicate-instance identity.
- Exercise Name, Plat and Grade in both directions, including grade price tie-breaking and unresolved estimates retaining the `-1` sort sentinel.
- Verify the exact batch-pricer inputs, English stat/weapon fallbacks, unveiled-only eligibility, partial-result caching, cancellation and capped retry behavior without inventing model output.
- Verify veiled, challenge and unveiled card branches; quantity, stats, rerolls, grades, missing estimates and explicit numeric estimates.
- At 1200x800 and 900x500, verify every control remains reachable, rails are contained, the body has no horizontal overflow, cards remain 200px wide, pointer opening still works, and Enter/Space each open exactly one drawer.
- Verify English and German existing rendering. Hard-coded English filter/subtitle text under German is preserved and recorded, not presented as translated.
- Assert zero order-mutation commands, zero Sell controls and no missing-price-to-zero substitution.

### Linux build and packaged evidence

- Use `.preview-work/ubuntu-build/toolkit/` for all Stage 3F native operations.
- Generate source facts before writing native selectors, then run `source_facts.py verify-harness` and preserve both outputs.
- Run stable and Preview frontend builds with four-CPU affinity and low priority.
- Preserve Stage 3E artifacts, then invoke the bounded container helper with `--phase build` so stale binaries and bundle/AppDir output are removed before the native build.
- Invoke the same helper with `--phase package` for fresh Debian and AppImage packaging, and `--phase smoke` for each installed artifact. Every job must use an absolute on-disk runner and unique log/report paths.
- Rerun all 45 accepted packaged checks per artifact, then add a Rivens group covering exact-label navigation, both window sizes, control containment, representative parsed-shape state filtering, keyboard drawer activation and absence of Sell/market mutation surface.
- Recheck artifact hashes, cumulative patch application, Cargo.lock, the original 850 tracked files and absence of Stage 3G source.

## Validation result

- Styled component/browser suite: **65/65**, including **7/7** byte-identical stable-markup comparisons.
- Fresh Ubuntu release build and Debian/AppImage packaging: PASS under the hardened offline runner with four CPUs, four Cargo jobs and low priority.
- Debian packaged matrix: **50/50**. AppImage packaged matrix: **50/50**. Each includes the 45 accepted Stage 3E checks and five Rivens checks.
- Source reversal: PASS. Removing only the approved Preview regions restores the frozen original Rivens.jsx byte-for-byte.
- Cumulative patch: git apply --check PASS. Original tracked baseline: **850/850**, zero mismatches. Cargo lockfile unchanged.
- Stage 3F artifact hashes and sizes are recorded in evidence/rivens-release-artifacts.json; the consolidated result is evidence/rivens-validation-summary.json.

Test-tooling corrections are retained rather than hidden. The first component run passed 59/65 and exposed a fixture-width model plus case-sensitive assertion issue; the corrected run passes 65/65. The first native build runner omitted the accepted toolchain mounts and exited 127 before compilation; the corrected bounded build passes. The first Debian generator used a Stage 3D base and a Stage 3E filename, so its 45 passing checks were incomplete and misnamed; the corrected Debian and AppImage runs each pass the full 50-check cumulative matrix. During that misnamed run, five accepted Stage 3E Debian inner logs were overwritten. The accepted primary Stage 3E JSON was restored semantically from its verbatim retained log, the misnamed Stage 3F JSON is preserved, and the unrecoverable original inner-log bytes are disclosed in evidence/rivens-evidence-integrity.json. Three failed patch-finalization attempts are preserved; Git-native diff generation now handles the source file's missing final newline and the cumulative apply check passes.

## Acceptance boundary

Success accepts Stage 3F only as a Linux Preview milestone. Windows remains OPEN/BLOCKED and macOS remains OPEN/UNAVAILABLE under the permanent acceptance ledger. A real published-version upgrade and exhaustive tracing remain separate tracks. Stage 3G Relics requires its own source plan and approval.
