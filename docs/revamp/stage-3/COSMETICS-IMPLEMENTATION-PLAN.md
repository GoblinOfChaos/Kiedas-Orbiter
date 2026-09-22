# Stage 3E — Linux Preview Cosmetics plan

**Status: ACCEPTED — LINUX MILESTONE.** Stage 3A through Stage 3E are accepted Linux milestones. The Stage 3 end state is defined in `SCREEN-REDESIGN-SCOPE.md`. This is one Cosmetics-only proposal in the isolated Preview checkout. It does not authorize another screen, publication, installation over stable, game-data changes, acquisition changes, pricing changes or marketplace actions.

## Result

Make Cosmetics easier to scan and operate at 1200x800 and 900x500 while retaining its current catalog, 15 kind categories, three ownership states, name sort, 120-item pagination, images and Acquisition Drawer. Stable keeps byte-identical rendered markup and behavior. Preview receives a responsive controls frame with bounded horizontal category rails. Existing Digital Extremes/export-derived artwork remains in use; no artwork is generated or replaced, and no AI artwork is permitted.

The existing 220px auto-fill catalog grid is already appropriate and will remain. The layout change is concentrated on the control area, where the shared wrapping Tabs component currently turns 15 kind choices into a tall block at narrow widths.

## Verified safety and interaction findings

Cosmetics has no Warframe.Market order mutation path and no price display. It invokes only `read_file_bytes` to load acquisition overrides. No price, Sell control or market behavior will be introduced.

Each cosmetic card currently has two paths to the same Acquisition Drawer: a pointer shortcut on the outer Card and a real `button` labeled Acquisition. Because placing `role="button"` and keyboard handling on the outer Card would create nested interactive semantics, this slice will not use the keyboard-card pattern from Mastery or Mods. The existing Acquisition button remains the accessible keyboard path; pointer clicking the card remains a convenience path. Its `stopPropagation` behavior must continue preventing double activation.

The small card kind badge currently renders the raw `item.kind` values `Skin`, `Sigil`, `Glyph`, `Decoration` or `Emote`, including under German locale. That is existing behavior and is outside this layout-only slice. Filter labels and all other Cosmetics strings continue using the current translation keys.

## Proposed Preview composition

At 1200x800, keep search prominent, keep the single Name sort beside it, place all 15 kind choices in their current order inside a contained rail, and keep the three ownership choices as a compact second group. The catalog grid retains its current 220px minimum cards and source order.

At 900x500, search takes the available row width. Sort, kind and ownership controls remain within the content boundary; the kind rail scrolls horizontally rather than wrapping into several rows or causing page-level overflow. The selected category and ownership state stay visible and reachable. Card images, badges, names, Acquisition buttons, Load More and drawer rendering remain unchanged.

The Preview wrapper may add conditional data attributes to existing layout nodes for scoped styling. When disabled it returns children without adding stable DOM.

## Preserved catalog and logic boundaries

No catalog, ownership, type-classification or acquisition logic changes are authorized. Preserve without rewriting:

- `/StoreItems/` canonicalization and lowercase ownership matching.
- Ownership from exactly `WeaponSkins`, `FlavourItems`, `MiscItems` and `ShipDecorations`.
- Dynamic Warframe-family construction from `ExportWarframes` Suit entries, internal family segments and non-Prime localized-name words.
- Weapon skin classification from icon paths, then legacy unique-name fallbacks.
- Archwing, Sentinel, Syandana, Armor, Animation, Warframe-family and Other classification order.
- Sigil detection under `/Upgrades/Skins/Sigils/`.
- ExportCustoms skin inclusion and the existing unowned icon/texture requirement.
- WI_Glyphs name requirement, hidden-unowned exclusion and owned-hidden retention.
- All eight registered ExportResources decoration parent paths.
- ExportFlavour emotes limited to `/Lotus/Types/Items/Emotes/`.
- Image resolution order: PublicExport content hash, browse.wf path, verified direct URL, then `resolveAnyImage`.
- Case-insensitive name search, exact internal type filtering and All/Owned/Unowned filtering.
- Name sort and active-sort direction toggling.
- Initial/reset page size of 120 and Load More increments of 120.
- Acquisition override loading, full `getAcquisitionInfo` argument order and the intentional `undefined` placeholder for `relicStateIndex`.
- Loading, no-match, populated and open-drawer states.

Synthetic fixtures will exercise presentation and state transitions only. They will not certify the official cosmetic catalog or the user's owned inventory. The player inventory remains the ownership/progress ground truth.

## Source scope

Planned app files:

1. `src/screens/Cosmetics.jsx`: import `IS_PREVIEW` and the Preview wrapper, compose the existing control/content nodes through that wrapper, and add only Preview-gated layout attributes needed by scoped styles. Catalog construction, ownership, classification, image resolution, filtering, sorting, pagination, acquisition arguments and card actions remain unchanged.
2. `src/components/PreviewCosmeticsLayout.jsx` (new): enabled pass-through wrapper and scoped responsive styles only. It contains no catalog transforms, filter/sort state, pagination, commands or drawer state.

No Rust/backend, dependency, lockfile, MonitoringContext, parser, shared `Tabs`, shared `Card`, shared `AcquisitionDrawer`, global CSS, translation, asset or other screen change is planned. If implementation requires any broader file or data-contract change, stop and request approval with the exact reason.

## Implementation sequence

1. Preserve the accepted Stage 3D cumulative patch, frozen Cosmetics source, original 850-file baseline and Cargo.lock hash.
2. Build a styled component fixture from the exact current screen and capture stable loading, no-match, populated, paginated and open-drawer rendering before edits.
3. Add the enabled Preview wrapper around the existing controls and catalog composition. When disabled, it returns children without adding stable DOM.
4. Exercise every registered state and interaction, then build stable/Preview frontends and fresh Ubuntu Preview Debian/AppImage packages.
5. Rerun the accepted native guard/isolation smoke groups plus Cosmetics checks, preserve failures and test-tooling corrections, and deliver one consolidated review.

## Acceptance and evidence

- Every row in `COSMETICS-PRESERVATION.md` receives PASS, FAIL, BLOCKED or NOT APPLICABLE with its evidence tier.
- All 15 kind categories and three ownership choices appear once in their registered order and filter through their existing internal values.
- Fixtures cover all five catalog sources/kinds and every Skin subtype classifier, including the dynamic Warframe-family boundary and Other fallthrough.
- Owned-name normalization covers all four raw inventory buckets. Unowned iconless skins and hidden glyphs remain excluded while owned equivalents remain visible.
- Name sort runs ascending and descending. Search, kind and ownership filters compose and reset pagination to 120; Load More adds 120 without duplicates.
- Pointer card activation and the semantic Acquisition button open the same drawer. Enter/Space operate the native button; its click does not double-toggle the drawer. No outer-card role or nested button semantics are introduced.
- At 1200x800 and 900x500, the page stays within horizontal bounds; all control groups remain reachable; the kind rail is contained; 220px cards, Load More and the drawer are not clipped.
- English and German labels fit or scroll within their groups. The existing raw kind badge behavior is preserved and disclosed rather than silently changed.
- Stable before/after DOM is exact for representative loading, no-match, populated, paginated and open-drawer states. Source comparison proves catalog, filter, sort, pagination, image and acquisition expressions are unchanged.
- No `0p`, price, Sell control or market mutation invocation appears.
- Stable and Preview frontends build. Fresh Ubuntu Preview Debian and AppImage artifacts rerun the existing 40 accepted native checks plus Cosmetics layout/interaction checks. Cargo work remains `CARGO_BUILD_JOBS=4 nice -n 19` with bounded processes.
- Preserve exact hashes, incremental/cumulative patches, reusable runners, unique before/after failures, the original 850-file baseline and unchanged lockfile.

Deliver one consolidated review. Do not begin Stage 3F or another screen until Stage 3E is reviewed and accepted.


## Implementation and validation record

The approved two-file change is implemented in the isolated `revamp/preview-shell` checkout. `Cosmetics.jsx` adds only the Preview imports, conditional layout hooks and pass-through wrapper. `PreviewCosmeticsLayout.jsx` contains only the enabled wrapper and scoped responsive CSS. Removing those approved regions restores the frozen 326-line Cosmetics source byte-for-byte; catalog assembly, ownership, classification, image resolution, filtering, sorting, pagination, acquisition arguments and card actions are unchanged.

The styled component-browser suite passes **101/101**. It includes six byte-identical stable comparisons: loading, populated, ownership-empty, no-match, paginated and open-drawer states. Preview coverage exercises all 15 categories at 1200x800 and 900x500; all five catalog kinds and Skin subtype classifiers; all four ownership buckets; iconless/hidden exclusions and owned retention; name sort in both directions; composed filters; 120-item pagination; English/German controls; contained horizontal rails; 220px-minimum cards; source URL branches; and pointer, Enter and Space access to the Acquisition Drawer without nested button semantics.

Fresh Ubuntu release builds produced Debian and AppImage packages. Each passes **45/45** native checks: the previously accepted 40 isolation, guard, dialog, updater, Dashboard, Inventory, Mastery and Mods checks plus five Cosmetics checks. The native Cosmetics tier uses the real packaged catalog and verifies both target layouts, all 15 category labels, all three ownership labels, 120 rendered cards, one semantic Acquisition button per card, Enter activation, no page overflow, contained category scrolling and the absence of `0p` or Sell UI. No backend or app-source test hook was added.

The original 850 tracked files remain unchanged, Cargo.lock is unchanged, both frontend builds passed, and the cumulative patch applies to the untouched checkout. The accepted Stage 3D artifacts were copied to `before-stage3e-packages/` and their evidence index now points to those verified preserved copies before shared target paths were overwritten.

### Test and evidence corrections

All executed partial or failed runs were retained when files existed. The generated component fixture had one malformed locale assignment, corrected before its first build. Two stale container assumptions were then corrected: an obsolete image tag and a Node path absent from the test image. The host Vite build was rerun with explicit four-core affinity after automatic review rejected `nice` alone as insufficient CPU protection.

The first component run passed 98/101. Its three fixture assertions were corrected for the real three-column 1200px content width, CSS-transformed Load More casing and synthetic image nodes removed by `ItemImage` after load failure; a module-boundary `ItemImage` fixture preserves computed source URLs for that last assertion. The final component run passes 101/101.

The first native-build wrapper invocation was rejected before execution because its safeguards were hidden inside Python. The explicit bounded command then encountered the known rootless Podman early-return behavior; the complete attached rerun is documented in `cosmetics-native-build-log-disclosure.md`. Two Debian partial smoke runs each preserved all prior 40 passing checks before the new block stopped on test-only navigation selectors: first the inherited XPath route state, then the shortened planning label `Cosmetics` instead of the actual UI label `Cosmetics, Decorations, Emotes`. Both partial results are preserved. The corrected Debian and AppImage runs each pass 45/45. No app-source fix arose from these tooling issues.
