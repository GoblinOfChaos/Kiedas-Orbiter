# Stage 3C — Linux Preview Mastery plan

**Status: ACCEPTED — LINUX.** Stage 3A Dashboard and Stage 3B Inventory are accepted Linux milestones. This is one Mastery-only slice in the isolated Preview checkout. It does not authorize another screen, publication, installation over stable, game-data changes or mastery-formula changes.

## Result

Make Mastery easier to scan at 1200x800 and 900x500 while retaining all current rank, completion and detail information. Stable keeps its current markup and behavior. Preview receives a responsive content frame, a compact rank/progress presentation, clearer completion sections and keyboard-accessible completion cards. Existing rank icons and the bundled Teshin image remain in use; no artwork is generated or replaced, and no AI artwork is permitted.

The screen has 24 selectable completion rows: 20 item/category rows, two Intrinsic rows and two Starchart rows. All remain present exactly once. Kitgun, Zaw, Robotics and Vehicles remain display-only summary rows and remain excluded from the total-XP aggregation to prevent double counting. This slice preserves that behavior rather than reinterpreting any Warframe rule.

## Proposed Preview composition

At 1200x800, retain the current rank card first, followed by Item Completion and a balanced Intrinsic/Starchart row. Tighten excess vertical space without removing the current/next rank icons, titles, progress amount, XP remaining, progress track or rank-up guidance.

At 900x500, stack rank details inside the content width, keep the progress label and track in bounds, and reduce the rank-up panel's minimum-height pressure. The existing Teshin image remains visible in the rank-up state but must not obscure text or force page-level horizontal overflow. Completion grids remain readable and scroll with the page.

The detail modal keeps its existing body and close paths. Preview adds dialog semantics and verifies the header, Starchart filter and scrolling body remain usable at both target sizes. Completion cards gain Preview-only focusability plus Enter and Space activation. Stable retains its present pointer behavior and exact rendered markup.

## Preserved data and logic boundaries

No mastery math or game-data logic changes are authorized. Preserve without rewriting:

- MR0, MR1–30 and Legendary rank title/icon selection.
- Current/next rank XP thresholds, total-XP aggregation, progress percentage and XP-until-next display.
- Deduplication rules and modular-item keys.
- Secondary plus Kitgun, Melee plus Zaw, Robotics and Vehicles aggregation behavior.
- The four display-only summary exclusions from total XP.
- Railjack and Drifter Intrinsic totals.
- Origin and Steel Path node counts, completion state, system/name ordering, junction labels and mastery-XP labels.
- Item-detail ordering: incomplete first, then mastered, alphabetic within each state.
- `get_mastery_icons_path` and `get_ui_path` asset resolution.
- Loading (`undefined`/active load) and no-inventory (`null`) states.

Synthetic fixtures will exercise presentation and state transitions only. They will not certify official mastery formulas, current game catalogs or the user's actual progress. The player inventory remains the ownership/progress ground truth.

## Source scope

Planned app files:

1. `src/screens/Mastery.jsx`: import `IS_PREVIEW` and the Preview wrapper, gate the new composition, and add Preview-only focus/Enter/Space behavior plus dialog attributes. Existing calculations, arrays and detail bodies remain unchanged.
2. `src/components/PreviewMasteryLayout.jsx` (new): responsive wrapper and scoped styles only. It contains no inventory transforms, mastery formulas, rank thresholds, asset commands or detail-state ownership.

No Rust/backend, dependency, lockfile, MonitoringContext, parser, shared UI component, global CSS, translation, asset or other screen change is planned. If implementation requires any broader file or data-contract change, stop and request approval with the exact reason.

## Implementation sequence

1. Preserve the accepted Stage 3B cumulative patch, current Mastery source, original 850-file baseline and Cargo.lock hash.
2. Build a styled component fixture from the exact current screen and capture stable populated, loading, no-inventory, rank-progress and rank-up rendering before edits.
3. Add the enabled Preview wrapper around the existing content. When disabled, it returns children without adding stable DOM.
4. Add only the approved Preview keyboard and dialog semantics in `Mastery.jsx`.
5. Exercise every registered state and interaction, then build stable/Preview frontends and fresh Ubuntu Preview Debian/AppImage packages.
6. Rerun the accepted native guard/isolation smoke groups plus Mastery checks, preserve failures and test-tooling corrections, and deliver one consolidated review.

## Acceptance and evidence

- Every row in MASTERY-PRESERVATION.md receives PASS, FAIL, BLOCKED or NOT APPLICABLE with its evidence tier.
- All 24 completion rows render once with their original labels, counts and XP fields. All open by pointer in both stable and Preview; Preview additionally opens them by Enter and Space with visible focus.
- Fixtures cover MR0, an MR1–29 rank, MR30, a Legendary rank, progress below 100 and rank-up-ready at 100. Current/next titles, rank labels, progress width, percentage, total XP and XP remaining remain internally consistent with the unchanged source functions.
- Item, Intrinsic, empty-detail, Origin Starchart and Steel Path detail bodies are exercised. Starchart's Hide Non-Mastery control is checked in both states. Backdrop and close-button dismissal remain functional.
- At 1200x800 and 900x500, the page and rank cards stay within horizontal bounds; rank-up text and existing Teshin image do not overlap; modal header/body/footer controls remain reachable; long German labels receive a layout pass without changing translations.
- Stable before/after DOM is exact for representative populated, loading, no-inventory, progress and rank-up states. Source comparison proves calculations and category/detail expressions are unchanged.
- Stable and Preview frontends build. Fresh Ubuntu Preview Debian and AppImage artifacts rerun the existing 30 accepted native checks plus Mastery layout/interaction checks. Cargo work remains `CARGO_BUILD_JOBS=4 nice -n 19` with bounded processes.
- Preserve exact hashes, incremental/cumulative patches, reusable runners, unique before/after failures, the original 850-file baseline and unchanged lockfile.

Deliver one consolidated review. Do not begin Stage 3D or another screen until Stage 3C is reviewed and accepted.


## Implementation and validation record

The approved two-file change is implemented in the isolated `revamp/preview-shell` checkout. `Mastery.jsx` adds only the Preview import/gate, scoped layout attributes, completion-card Enter/Space handling and dialog semantics. `PreviewMasteryLayout.jsx` contains only the enabled wrapper and scoped responsive CSS. Removing those approved regions restores the frozen 607-line Mastery source byte-for-byte; rank formulas, aggregation, all 24 rows, detail bodies and asset commands are unchanged.

The styled component-browser suite passes **195/195**. Stable root markup is exact in loading, no-inventory, MR0, MR15 progress, MR30, Legendary and rank-ready states, and the opened pointer-detail modal is also exact. Preview tests cover all 24 rows by pointer, Enter and Space at both 1200x800 and 900x500; responsive columns and horizontal bounds; MR0/MR15/MR30/Legendary labels; progress fields; rank-ready art/text separation; item/Intrinsic/Origin/Steel Path details; Hide Non-Mastery state and persistence; both close paths; empty details; dialog semantics; German layout; and both asset-path commands. Fixtures validate the current UI contract and arithmetic consistency with unchanged local functions, not official game data.

Fresh Ubuntu release builds produced Debian and AppImage packages. Each passes **35/35** native checks: the previously accepted 30 isolation/guard/dialog/updater/Dashboard/Inventory checks plus five Mastery checks. The Mastery native tier injects synthetic parsed-shape data through the real MonitoringProvider state hook, then verifies both responsive layouts, 24 labels, Preview roles/tab order, Enter/Space dialog activation and the rank-ready state. No backend or app-source test hook was added.

The original 850 tracked files remain unchanged, Cargo.lock is unchanged, both frontend builds passed, and the cumulative patch applies to the untouched checkout. Stage 3C was explicitly accepted by the user on 2026-09-05. No Stage 3D app-source work has started.

### Test and evidence corrections

All failed or superseded evidence is preserved where an output file existed. Planning corrected an initial manual 25-row count to the source-verified 24 and corrected two register-script typos. The first fixture build rejected malformed synthetic-data syntax and a misnamed locale map; the next rejected copied source-relative imports, which were rewritten only in the fixture copy. The first component runner was rejected by `py_compile` before launch because generated placeholder remnants remained. Runtime assertions then corrected JavaScript/Python method usage and text casing/spacing assumptions before the final 195/195 run. A malformed container fallback command was rejected before the native build started; the verified Ubuntu command then passed. The first packaged-runner augmentation payload was incomplete and made no edit; a saved, syntax-checked augmentation script replaced it.

Stage 3B package files were not copied aside before the shared target paths were reused for this authorized rebuild. Their accepted hashes and sizes remain in `inventory-release-artifacts.json`, while those entries now explicitly say the original binaries are unavailable and retain the paths only as `path_at_validation`. The pre-correction index is preserved as `before-stage3c-inventory-release-artifacts.json`; no current Stage 3C file is mislabeled as a Stage 3B artifact.
