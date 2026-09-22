# Stage 3H — Linux Preview Relic Planner plan

**Status: STAGE 3H ACCEPTED — LINUX.** The validated Relic Planner implementation is accepted as a Linux Preview milestone. It remains isolated from stable and has not been published or installed over stable.

## Goal

Keep the part picker, need list and matching-relic results visually coordinated at 1200x800 and 900x500 while preserving the current catalog, player-inventory evidence, selection rules and result ordering. Stable must retain byte-identical rendered markup and behavior. Preview receives a container-responsive three-panel workspace, bounded panel heights, contained dense controls and an accessible name for the existing icon-only remove action.

## Verified current behavior

The current `RelicPlanner.jsx` is 311 lines. It renders three statistic cards followed by three workflow panels. The workflow uses `grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)]`. Because `lg` follows the full viewport breakpoint rather than the screen's remaining width, the 900x500 acceptance window stacks the part picker, need list and results vertically. Each panel separately caps itself at 640px, so the three related views become a long page instead of a coordinated workspace.

The exact Preview navigation label was derived from current `App.jsx`, `en.json` and `PreviewNavigation.jsx` with the accepted toolkit: `Relic Planner`. The source-fact record is `evidence/relic-planner-nav-source-fact.json`.

## Preserved data and behavior boundaries

- Keep `getAllRelicRewards(exportData, 'en')` as the part source. Keep only Prime-part results plus the existing Forma unique-name exception, and keep alphabetical part-name ordering.
- Keep `getRelicCatalog(exportData, 'en')` as the matching-relic source. No second catalog, manual relic table or copied parser logic may be introduced.
- Keep `getPartObtainedStatus` as the sole part-status resolver. Preserve its direct-owned, ever-obtained, has-enough and required-quantity semantics, including parent mastery/build evidence and Foundry evidence.
- Keep player ownership sourced from `inventoryData`. Owned relic counts continue summing every refinement count and matching the catalog through the current normalized era/name keys.
- Keep the 120ms search debounce and its reset of the visible-part limit to 60.
- Keep part search as the current case-insensitive substring match against part display names.
- Keep all three part filters: All, Never Obtained and Missing. Never Obtained continues using `everObtained`; Missing continues using `hasEnough`.
- Keep the initial 60-row part limit and the current +60 Load More behavior.
- Keep the need list session-only. Stage 3H does not add profile, browser-storage or backend persistence.
- Keep duplicate prevention by exact reward `uniqueName`, individual removal, Clear, Add All Missing Parts and Add Never Obtained.
- Keep the bulk actions independent of the current search and visible filter. Add All Missing continues considering every catalog part whose status is not `hasEnough`; Add Never Obtained continues considering every part whose status is not `everObtained`.
- Keep matching by exact reward `uniqueName`. A relic appears only when at least one selected part is in its reward list.
- Keep all three result ownership filters: All, Owned and Unowned.
- Keep result ordering exactly: owned relic count descending, then matched-needed-part count descending. Do not add a new sort.
- Keep the three summary statistics and their current meanings: total eligible Prime parts, selected parts and owned matching relics over total matching relics.
- Keep loading, absent export data, absent inventory data, empty need list, no matching relics and populated states.
- Keep current icon resolution through the single `get_icons_path` command and `convertFileSrc`.
- Keep current translation behavior. Existing translated labels remain translated, and existing literal English count/action suffixes remain unchanged in this layout slice.
- Relic Planner contains no Warframe.Market mutation or Sell path. None may be introduced.

## Verified control and state inventory

| Area | Current controls or state | Required result |
|---|---|---|
| Part picker | Search field | 120ms debounce and substring matching preserved |
| Part picker | All, Never Obtained, Missing | All three filters and their distinct status predicates preserved |
| Part picker | Part buttons | Exact-identity add, duplicate disable and owned indicator preserved |
| Part picker | Load More | Starts at 60 and adds 60 preserved |
| Need list | Per-part remove | Existing removal preserved; Preview receives an accessible item-name label |
| Need list | Clear | Clears the full selection |
| Need list | Add All Missing Parts | Uses every part with `hasEnough === false` |
| Need list | Add Never Obtained | Uses every part with `everObtained === false` |
| Results | All, Owned, Unowned | All three ownership filters preserved |
| Results | Relic rows | Era/name, owned count, vault state, matching parts and needed count preserved |
| Summary | Three statistic cards | Existing values preserved |

## Proposed app-source boundary

If approved, exactly two app files may change:

1. `src/screens/RelicPlanner.jsx`: import `IS_PREVIEW` and the Preview wrapper; pass the existing statistics and three-panel workflow through it; add Preview-gated layout hooks to the existing elements; add a Preview-only accessible item-name label to the existing remove button. Catalog, status, search, debounce, selection, bulk-action, matching, ownership and ordering logic remains unchanged.
2. `src/components/PreviewRelicPlannerLayout.jsx` (new): enabled pass-through wrapper and scoped responsive styles only. It contains no state, catalog transforms, inventory interpretation, matching, sorting, persistence or commands.

Explicitly excluded: `relicParser.js`, `MonitoringContext.jsx`, inventory parsing, Tauri/Rust, shared UI, global CSS, translations, dependencies, lockfiles, Relics, Market, overlays and every other screen.

## Proposed Preview composition

- The wrapper returns `children` directly when disabled, so stable receives no wrapper node.
- Preserve the existing three-statistic row. Add only containment hooks needed to keep each statistic card inside the available width.
- Replace the viewport-dependent `lg` workflow breakpoint in Preview with a container query. At the 1200x800 and 900x500 acceptance sizes, the workspace keeps three columns using the existing 1 / 1 / 1.5 proportion. Below the verified usable-width threshold it returns to one column.
- Give all three panels one shared bounded height derived from the available viewport. Their existing internal lists remain the scrolling regions, keeping picker, selection and results headings/actions visible together.
- Keep the part-filter and result-ownership controls on contained single-line rails when their panel is narrow. Existing buttons and handlers remain unchanged.
- Let panel headings and action areas wrap or stack within their own card without creating page-level horizontal overflow.
- Keep every result row and match badge. Scoped Preview rules may allow the result row's metadata to wrap at the narrow accepted size, but may not change its content or ordering.
- The need-list remove button remains the same semantic button and handler. Preview alone adds an accessible label containing the selected part name.
- No artwork changes. No AI artwork is permitted.

## Validation plan

### Source and component evidence

- Freeze the accepted Stage 3G cumulative patch, current Relic Planner source, original 850-file baseline and Cargo.lock hash before editing.
- Generate the Stage 3H implementation patch with native Git diff output and verify the cumulative patch with `git apply --check`.
- Prove that removing the approved Preview import, wrapper, hooks and accessible label restores the original `RelicPlanner.jsx` byte-for-byte.
- Compare stable rendered markup byte-for-byte before and after for inventory loading, missing export data, missing inventory data, empty selection, populated selection, no result matches, ownership-filtered results and a post-Load-More state.
- Exercise the real unchanged `getAllRelicRewards`, `getRelicCatalog` and `getPartObtainedStatus` helpers with DE-export-shaped and parsed-inventory-shaped fixtures. Compare before/after outputs rather than reimplementing their logic in the test.
- Verify Prime-part inclusion, non-Prime exclusion, Forma inclusion, unique-name deduplication and alphabetical ordering.
- Verify the 120ms debounce, search reset to 60, all three part filters, the 60/+60 display boundary, duplicate prevention, individual removal and Clear.
- Verify Add All Missing versus Add Never Obtained against statuses where direct ownership, historical ownership and required quantity differ. Confirm both bulk actions use the full catalog rather than the currently filtered subset.
- Verify exact reward-identity matching, owned-count summation across refinements, normalized catalog identity, all three ownership filters and the owned-count-then-match-count ordering.
- At 1200x800 and 900x500, verify all three workflow panels remain simultaneously present, their heights align, list regions scroll internally, dense controls remain reachable, result metadata remains inside its panel and the page has no horizontal overflow.
- Exercise every interactive control by pointer and keyboard. Verify the Preview remove button exposes the selected item name to assistive technology.
- Verify existing English and German labels from the real translation files and record the existing literal-English boundaries without changing them.

### Linux build and packaged evidence

- Use `.preview-work/ubuntu-build/toolkit/` for every Stage 3H native operation.
- Run `source_facts.py verify-harness` against both native runners before execution.
- Run stable and Preview frontend builds with four-CPU affinity and low priority.
- Preserve Stage 3G artifacts, then use the bounded container helper with preflight cleanup for build and package phases.
- Build fresh Ubuntu release binaries and fresh Debian/AppImage packages with `CARGO_BUILD_JOBS=4` under `nice -n 19`.
- Rerun all 55 accepted packaged checks per artifact, then add a Relic Planner group covering exact-label navigation, both window sizes, simultaneous panel layout, representative helper-backed selection/matching, keyboard removal and absence of Sell/market mutation.
- Target **60 packaged checks per artifact**: the accepted 55 plus five Relic Planner checks.
- Recheck artifact hashes, the native Git-generated cumulative patch, Cargo.lock, the original 850 tracked files and absence of Stage 3I source.

## Validation result

- Styled component/browser suite: **62/62**, including **8/8** byte-identical stable-markup comparisons and direct checks of the unchanged `getAllRelicRewards`, `getRelicCatalog` and `getPartObtainedStatus` helpers.
- Approved CSS correction: the Preview container breakpoint is **600px**, and the shared panel height is `clamp(17.5rem, calc(100dvh - 13.5rem), 40rem)`.
- Fresh Ubuntu release build and Debian/AppImage packaging: PASS under the hardened offline runner with four CPUs, four Cargo jobs and low priority.
- Debian packaged matrix: **60/60**. AppImage packaged matrix: **60/60**. Each contains the 55 accepted Stage 3G checks plus five Relic Planner checks.
- Native Relic Planner geometry: all three panels are simultaneously visible and aligned at both 1200x800 and 900x500; page-level horizontal overflow is absent and both dense control rails retain internal horizontal scrolling.
- Native interaction: selecting a helper-backed synthetic Prime part produces two matching relics, the remove control exposes the exact part name and works by keyboard, and no Sell surface is present.
- Source reversal: PASS. Removing only the approved Preview regions restores the frozen original `RelicPlanner.jsx` byte-for-byte.
- Cumulative native-Git patch: `git apply --check` PASS. Original tracked baseline: **850/850**, zero mismatches. Cargo lockfile unchanged.
- Stage 3G artifacts were preserved before preflight cleanup and match their accepted hashes. Stage 3H artifact hashes and sizes are recorded in `evidence/relic-planner-release-artifacts.json`; the consolidated result is `evidence/relic-planner-validation-summary.json`.

The evidence record retains the tooling and test-data corrections encountered during validation: missing host MiniBrowser, the sandbox host-bus retry, fixture path/assertion corrections, the initial missing Cargo mount, pre-correction narrow geometry, provider injection ordering and shape, and the picker selector initially choosing Forma. These were confined to test infrastructure except for the two-value CSS correction explicitly approved by the user. The final component and both packaged matrices pass in full.

## Acceptance boundary

Success accepts Stage 3H only as a Linux Preview milestone. Windows remains OPEN/BLOCKED and macOS remains OPEN/UNAVAILABLE under the permanent acceptance ledger. A real published-version upgrade and exhaustive tracing remain separate tracks. Stage 3I Market requires its own higher-risk source plan and approval.
