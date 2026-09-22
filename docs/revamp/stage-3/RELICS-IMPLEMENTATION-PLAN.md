# Stage 3G — Linux Preview Relics plan

**Status: ACCEPTED — LINUX MILESTONE.** Stage 3G was explicitly accepted by the user on 2026-09-06. The implementation remains in the isolated Preview checkout and has not been published or installed over stable. Expected-value logic, price sources, inventory/catalog parsing, acquisition, translations and every other screen remain unchanged.

## Goal

Make the dense Relics control surface easier to scan and operate at 1200x800 and 900x500 while preserving the current owned/catalog merge, search, filters, squad and refinement controls, expected-value calculations, sorting, card content, price-loading state, Void Traces display and acquisition drawer. Stable must retain byte-identical rendered markup and behavior. Preview receives a bounded control hierarchy, contained horizontal rails where needed, and keyboard access to the existing card action.

## Verified current behavior

The current `Relics.jsx` is 582 lines. Its first wrapping row contains search, three ownership choices, four squad sizes and four target-refinement choices. Its second wrapping row contains a dynamic era rail of up to eight choices, six owned-refinement choices, three vault choices, five sort choices and the Void Traces summary. This is one search field plus as many as 33 value/filter controls before the result grid.

The result grid already uses responsive one-, two-, three- and four-column classes. The Stage 3G layout should preserve that grid rather than replace its cards. The main layout issue is the density and hierarchy of the two control rows at the 900x500 acceptance size.

The exact navigation label was derived with the accepted toolkit from current `App.jsx`, `en.json` and `PreviewNavigation.jsx`: `Relics`. The source-fact record is `evidence/relics-nav-source-fact.json`.

## Preserved data and behavior boundaries

- Keep the source of owned records as `inventoryData.relics` and the existing `exportData` catalog merge.
- Keep the catalog behavior exactly: `getRelicCatalog(exportData, 'en')` supplies catalog-only Lith, Meso, Neo and Axi records; matching owned records replace catalog placeholders; unmatched owned records such as Requiem remain present.
- Keep the current synthetic display key versus genuine Digital Extremes path distinction. Acquisition lookup continues preferring `real_unique_name` and falling back to `unique_name`.
- Keep catalog image resolution through `ExportImages`, `asset-cache://content.warframe.com/PublicExport` and the existing browse.wf fallback.
- Keep search as a case-insensitive all-words match against either relic name or any reward name. Preserve the separate ampersand-stripped comparison used to highlight matching reward words inside visible cards.
- Keep all ownership states: All, Owned and Unowned. Preserve the current behavior when export data is absent.
- Keep the dynamic era order and visibility: All, Lith, Meso, Neo, Axi, Requiem, Omnia and Other appear only under the existing rules.
- Keep all owned-refinement filters: All, Intact, Refined, Exceptional, Flawless and Radiant. `Refined` continues meaning any positive Exceptional, Flawless or Radiant count.
- Keep all vault filters: All, Vaulted and Unvaulted. Unknown vault state remains unknown and matches neither explicit vault filter.
- Keep squad sizes 1–4 and target refinements Intact, Exceptional, Flawless and Radiant.
- Keep all five sorts and repeat-click direction toggling: Name, Ducats, Plat, Refine (D) and Refine (P). Preserve the current `desc` default, translated non-name group heading, era grouping for Name, price/value comparisons and existing group ordering.
- Keep `getRelicEV` unchanged, including its current refinement probabilities, best-of-squad calculation, Requiem flat-table branch, reward-value fallback and Intact-to-Radiant gain calculation. Stage 3G does not introduce or revise game formulas.
- Keep current price semantics. Missing reward or relic prices enter this screen as zero; individual reward/relic price badges render only above zero, while expected-value fields can display zero. This is not a marketplace mutation or verified sale price, and this layout slice does not change it.
- Keep loading progress, filtered relic/refinement counts, Void Traces current/maximum display and every current card field unchanged.
- Keep `AcquisitionDrawer`, vaulted-with-no-source handling and every acquisition index unchanged.
- Keep current translation behavior. Translated labels remain translated; literal era and refinement names remain as currently rendered.
- Relics contains no Warframe.Market order mutation or Sell path. None may be introduced.

## Proposed app-source boundary

If approved, exactly two app files may change:

1. `src/screens/Relics.jsx`: import `IS_PREVIEW` and the Preview wrapper; compose the existing header and results through it; add only Preview-gated layout hooks and keyboard attributes to the existing card wrapper. All catalog, search, filter, expected-value, sort, price, acquisition and display logic remains unchanged.
2. `src/components/PreviewRelicsLayout.jsx` (new): enabled pass-through wrapper and scoped responsive styles only. It contains no state, catalog transforms, formulas, pricing, commands or drawer logic.

Explicitly excluded: `relicParser.js`, `MonitoringContext.jsx`, `AcquisitionDrawer.jsx`, inventory parsing, Tauri/Rust, shared UI, global CSS, translations, dependencies, lockfiles, Market, Relic Planner, overlays and every other screen.

## Proposed Preview composition

- The wrapper returns `children` directly when disabled so stable receives no wrapper node.
- The first control row becomes a named primary-control grid. At wide widths, search retains the flexible column while ownership, squad and target remain compact groups. At narrow widths, the groups stack and each dense choice group remains reachable without page-level horizontal overflow.
- Era, owned-refinement, vault and sort controls become labeled, single-line contained rails. Their buttons and existing `Tabs` components remain unchanged.
- Void Traces remains visible in the header and receives a bounded summary position rather than being pushed unpredictably by wrapped filters.
- The existing result grid, cards, group headings, card widths and content remain intact. Scoped Preview rules may add `min-width: 0` and containment but may not replace the grid breakpoint logic.
- The existing card click keeps opening the acquisition drawer. Preview alone adds `role="button"`, `tabIndex={0}`, an item-name accessible label, visible focus styling, and Enter/Space activation. The current card has no nested interactive control.
- No artwork changes. No AI artwork is permitted.

## Validation plan

### Source and component evidence

- Freeze the accepted Stage 3F cumulative patch, current Relics source, original 850-file baseline and Cargo.lock hash before editing.
- Generate the Stage 3G implementation patch with native Git diff output and verify the cumulative patch with `git apply --check`.
- Prove that removing the approved Preview import, wrapper, layout hooks and keyboard attributes restores the original `Relics.jsx` byte-for-byte.
- Compare stable rendered markup byte-for-byte before and after for loading, no inventory, no matches, owned populated records, merged owned/unowned catalog records, price-loading progress, non-name grouped sort and acquisition drawer states.
- Exercise all three ownership filters, all three vault filters, every available era, all six refinement filters, squad sizes 1–4, target refinements and all five sorts in both directions.
- Verify relic-name search, reward-name search, ampersand-normalized reward highlighting, no-match text, owned/unowned catalog identity, unmatched owned Requiem retention and filtered count calculations.
- Exercise the real unchanged `getRelicEV` helper with parsed-shape rewards across all four refinements, squad sizes 1–4, standard six-reward tables and the Requiem flat-table branch. Compare before/after results rather than creating a second formula.
- Verify missing-price zero behavior, positive reward/relic badge gating, Intact-to-Radiant gain display and absence of any Sell or market-mutation surface.
- At 1200x800 and 900x500, verify all control groups remain reachable, rails are contained, Void Traces remains visible, the body has no horizontal overflow, cards remain inside their grid, pointer opening still works, and Enter/Space each open exactly one acquisition drawer.
- Verify existing English and German labels using the actual translation files.

### Linux build and packaged evidence

- Use `.preview-work/ubuntu-build/toolkit/` for every Stage 3G native operation.
- Run `source_facts.py verify-harness` against both native runners before execution.
- Run stable and Preview frontend builds with four-CPU affinity and low priority.
- Preserve Stage 3F artifacts, then use the bounded container helper with preflight cleanup for build and package phases.
- Build fresh Ubuntu release binaries and fresh Debian/AppImage packages with `CARGO_BUILD_JOBS=4` under `nice -n 19`.
- Rerun all 50 accepted packaged checks per artifact, then add a Relics group covering exact-label navigation, both window sizes, control containment, representative parsed-shape filters, keyboard drawer activation, price semantics and absence of Sell/market mutation.
- Recheck artifact hashes, the native Git-generated cumulative patch, Cargo.lock, the original 850 tracked files and absence of Stage 3H source.

## Validation result

- Styled component/browser suite: **91/91**, including **9/9** byte-identical stable-markup comparisons and **32/32** calls to the unchanged `getRelicEV` helper across standard and Requiem reward tables.
- Fresh Ubuntu release build and Debian/AppImage packaging: PASS under the hardened offline runner with four CPUs, four Cargo jobs and low priority.
- Debian packaged matrix: **55/55**. AppImage packaged matrix: **55/55**. Each includes the 50 accepted Stage 3F checks and five Relics checks.
- Source reversal: PASS. Removing only the approved Preview regions restores the frozen original `Relics.jsx` byte-for-byte.
- Cumulative native-Git patch: `git apply --check` PASS. Original tracked baseline: **850/850**, zero mismatches. Cargo lockfile unchanged.
- Stage 3F artifacts were preserved before preflight cleanup and matched their accepted hashes. Stage 3G artifact hashes and sizes are recorded in `evidence/relics-release-artifacts.json`; the consolidated result is `evidence/relics-validation-summary.json`.

Test-tooling corrections are retained rather than hidden. The first fixture build used relative imports from the relocated frozen source; the corrected fixture uses verified absolute source paths. The initial container launch was blocked by the sandbox host-bus boundary and was rerun through the approved escalation path. One retry was rejected before browser startup because it attempted to reuse reserved inner-log paths. Two component assertion rounds corrected fixture-only expectations for catalog reward shape, ampersand-highlight text and German label extraction; the final matrix passes 91/91. The plan wording was also corrected to distinguish all-words search from ampersand-stripped in-card highlighting. No correction changed shipped app behavior.

## Acceptance boundary

Success accepts Stage 3G only as a Linux Preview milestone. Windows remains OPEN/BLOCKED and macOS remains OPEN/UNAVAILABLE under the permanent acceptance ledger. A real published-version upgrade and exhaustive tracing remain separate tracks. Stage 3H Relic Planner requires its own source plan and approval.
