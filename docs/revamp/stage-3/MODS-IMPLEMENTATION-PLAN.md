# Stage 3D — Linux Preview Mods plan

**Status: ACCEPTED — LINUX.** Stage 3A Dashboard, Stage 3B Inventory and Stage 3C Mastery are accepted Linux milestones. This is one Mods-only proposal in the isolated Preview checkout. It does not authorize another screen, publication, installation over stable, game-data changes, pricing changes or marketplace actions.

## Result

Make Mods easier to scan and operate at 1200x800 and 900x500 while retaining all current categories, filters, sorting, price states, card rendering and acquisition details. Stable keeps byte-identical rendered markup and behavior. Preview receives a responsive controls frame, a horizontally contained category rail and keyboard-accessible mod cards. Existing exported mod art, category icons and card frames remain in use; no artwork is generated or replaced, and no AI artwork is permitted.

The screen has 19 category choices, five sort choices, three ownership choices and two independent filters. All remain present exactly once. Internal English category values remain separate from translated labels. In particular, Robotic continues using the Companion category icon, Tome continues using the Mods icon, and Exilus continues matching the cross-category `isExilus` trait rather than the exclusive `category` field.

## Verified safety findings

Mods does not post, update, close or delete Warframe.Market orders. A card opens only the existing Acquisition Drawer. The screen passes `modPrices?.[unique_name] ?? 0` to the shared `ModCard`, but every shared price badge is gated by `platValue > 0`; unresolved or zero values render no price badge, while loading renders the existing skeleton. The value sorter keeps its existing zero fallback for ordering only. No pricing or market code change is proposed.

German currently lacks explicit `mods.cat_robotic` and `mods.cat_tome` entries. `UiContext` loads English as the base and overlays the selected locale, so these two labels correctly fall back to English. No translation edit is required or proposed.

## Proposed Preview composition

At 1200x800, keep search prominent and place the existing sort and filter groups in a balanced controls row. Keep every control label and state. Present the 19 categories in their current order inside a contained rail that can scroll horizontally if the available width is insufficient, without creating page-level horizontal overflow.

At 900x500, stack search, sorting and filtering within the content width. Each dense control group may scroll within its own bounded row instead of wrapping into an excessively tall header. The selected state and active sort direction remain visible. The card grid retains the existing 200px cards, source order and centered auto-fill behavior.

Preview mod-card wrappers gain focusability, an accessible item label, and Enter/Space activation of the same Acquisition Drawer used by pointer clicks. Stable keeps its current pointer-only wrapper and exact rendered markup. The shared `ModCard` and `AcquisitionDrawer` are not edited.

## Preserved data and logic boundaries

No parser, catalog, ownership, price or acquisition logic changes are authorized. Preserve without rewriting:

- `mods_catalog ?? mods` selection and `_isSticker` exclusion.
- Search requiring every term, with each term allowed to match name, description, level stats, Arcane type or `MOD_WIKI_TAGS`.
- All 19 internal category values and their icon mappings.
- Exilus trait matching and every other category's exact category matching.
- All/Owned/Unowned, Max Rank and Hide Conclave filtering.
- Name, Rank, Count, Rarity and Maxed-value sorts, including same-sort direction toggling and new-sort ascending reset.
- Initial/reset page size of 60 and Load More increments of 60.
- Total, unique-name and duplicate-count header statistics.
- Mod frame, icon and card-image inputs to the shared `ModCard`.
- Price loading, fetch-progress, positive-price and absent-price states.
- Acquisition lookup inputs and drawer open/close behavior.
- Image-fix checking, extracting, fixing, compositing and preparing states.
- Inventory loading, no-inventory, missing-frame-path and no-match states.
- `read_file_bytes`, `get_mod_frames_path` and `get_icons_path` command use.

Synthetic fixtures will exercise presentation and state transitions only. They will not certify official mod metadata, current prices or the user's owned inventory. The player inventory remains the ownership/progress ground truth.

## Source scope

Planned app files:

1. `src/screens/Mods.jsx`: import `IS_PREVIEW` and the Preview wrapper, gate layout hooks/attributes, and add Preview-only focus/Enter/Space behavior and accessible labels to the existing card wrappers. Filtering, sorting, paging, data selection, pricing, acquisition construction and `ModCard` props remain unchanged.
2. `src/components/PreviewModsLayout.jsx` (new): enabled pass-through wrapper and scoped responsive styles only. It contains no catalog transforms, filtering, sorting, prices, commands or drawer state.

No Rust/backend, dependency, lockfile, MonitoringContext, parser, shared `ModCard`, shared `AcquisitionDrawer`, shared UI component, global CSS, translation, asset or other screen change is planned. If implementation requires any broader file or data-contract change, stop and request approval with the exact reason.

## Implementation sequence

1. Preserve the accepted Stage 3C cumulative patch, frozen Mods source, original 850-file baseline and Cargo.lock hash.
2. Build a styled component fixture from the exact current screen and capture stable populated, loading, no-inventory, missing-assets, no-match and price-state rendering before edits.
3. Add the enabled Preview wrapper around the existing header/content composition. When disabled, it returns children without adding stable DOM.
4. Add only the approved Preview card keyboard semantics in `Mods.jsx`.
5. Exercise every registered state and interaction, then build stable/Preview frontends and fresh Ubuntu Preview Debian/AppImage packages.
6. Rerun the accepted native guard/isolation smoke groups plus Mods checks, preserve failures and test-tooling corrections, and deliver one consolidated review.

## Acceptance and evidence

- Every row in `MODS-PRESERVATION.md` receives PASS, FAIL, BLOCKED or NOT APPLICABLE with its evidence tier.
- All 19 categories appear once in the registered order with the correct internal value and icon filename. Robotic/Tome fallback labels and Exilus cross-category behavior are exercised.
- All five sorts run ascending and descending; changing sort starts ascending. All three ownership choices and both independent filters are exercised alone and in combination.
- Search fixtures cover name, description, level stats, Arcane type, wiki tag, multi-term AND matching and no match.
- Pagination starts and resets at 60, then advances by 60 without duplicates. Peely Pix/sticker rows remain excluded.
- Positive price, zero/absent price, global price loading and fetch-progress states retain current behavior. No `0p` badge, Sell control or market mutation command may appear.
- Pointer, Enter and Space open the same Acquisition Drawer in Preview. Drawer content and close behavior remain unchanged. Stable retains pointer behavior and exact markup.
- At 1200x800 and 900x500, the page stays within horizontal bounds; controls and category rail remain reachable; 200px cards are not clipped; German fallback/translated labels fit or scroll within their groups.
- Stable before/after DOM is exact for representative populated, loading, no-inventory, missing-frame, no-match and price states. Source comparison proves filtering, sorting, pagination, acquisition and `ModCard` props are unchanged.
- Stable and Preview frontends build. Fresh Ubuntu Preview Debian and AppImage artifacts rerun the existing 35 accepted native checks plus Mods layout/interaction checks. Cargo work remains `CARGO_BUILD_JOBS=4 nice -n 19` with bounded processes.
- Preserve exact hashes, incremental/cumulative patches, reusable runners, unique before/after failures, the original 850-file baseline and unchanged lockfile.

Deliver one consolidated review. Do not begin Stage 3E or another screen until Stage 3D is reviewed and accepted.

## Implementation and validation record

The approved two-file change is implemented in the isolated `revamp/preview-shell` checkout. `Mods.jsx` adds only the Preview imports, layout attributes, pass-through wrapper and card Enter/Space semantics. `PreviewModsLayout.jsx` contains only the enabled wrapper and scoped responsive CSS. Removing those approved regions restores the frozen 357-line Mods source byte-for-byte; category, search, filter, sort, pagination, price, acquisition and `ModCard` expressions are unchanged.

The styled component-browser suite passes **119/119**. It includes nine byte-identical stable comparisons: eight registered top-level states plus the opened pointer Acquisition Drawer. Preview coverage exercises all 19 categories at 1200x800 and 900x500; all five sorts in both directions; ownership and independent/combined filters; every search field and multi-term matching; 60-item paging/reset; sticker exclusion; positive, absent, loading and progress price states; all loading/empty/fix branches; English/German fallback labels; horizontal bounds; 200px cards; and pointer, Enter and Space drawer activation.

Fresh Ubuntu release builds produced Debian and AppImage packages. Each passes **40/40** native checks: the previously accepted 35 isolation, guard, dialog, updater, Dashboard, Inventory and Mastery checks plus five Mods checks. The Mods native tier dispatches synthetic parsed-shape inventory data into the real MonitoringProvider state hook, then verifies both target layouts, all 19 categories, 200px cards, keyboard drawer activation and the absence of `0p` or Sell UI. No backend or app-source test hook was added.

The original 850 tracked files remain unchanged, Cargo.lock is unchanged, both frontend builds passed, and the cumulative patch applies to the untouched checkout. The accepted Stage 3C artifacts were copied to `before-stage3d-packages/` and their evidence index now points to those verified preserved copies before shared target paths were overwritten. Stage 3D was explicitly accepted by the user on 2026-09-05; no Stage 3E app-source work has started.

### Test and evidence corrections

All failed or superseded outputs are preserved where a runner produced a file. Two transcription artifacts in the new planning records were corrected before implementation and verified directly against source. The generated component fixture contained two malformed tokens that were removed before a successful launch. The first full component run passed 114/119; assertions were corrected for CSS-uppercase text and a missing synthetic Conclave path. The second passed 118/119; its final assertion was corrected to account for the 60-card pagination cap while verifying the Conclave item and filtered total directly.

The local sandbox lacked Xvfb, so the runner moved to the established Ubuntu test image. Native and bundle wrapper commands sometimes returned before their rootless Podman containers completed; this initially made live work look interrupted. The first bundle image also lacked `xdg-open`, and reusing an incomplete AppDir produced a linuxdeploy `libpango` error. Those logs are retained. Moving the generated partial AppDir aside and tracking the package container through completion produced both final artifacts. No app-source fix arose from these tooling issues.
