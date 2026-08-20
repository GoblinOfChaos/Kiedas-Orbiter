# Upstream Kronos Diff Tally (reviewed through 29e3529, 2026-08-19)

## Confirmed bugs we have that upstream already fixed

1. **PageLayout headerPanel unpins after ~1 viewport of scroll.** `PageLayout` in
   `src/components/UI.jsx` (~line 213-220) wraps `headerPanel` + `children` in a
   `relative flex-1 min-h-0 flex flex-col` div nested inside the scroll container.
   That inner div's `flex-1 min-h-0` gets floored to viewport height by the browser,
   so the sticky containing block ends after one viewport and the filter/tab row
   scrolls away. Affects every screen that passes `headerPanel` (Inventory.jsx,
   Relics.jsx, Rivens.jsx, Mods.jsx). Upstream fix: `4c56591` — hoist headerPanel to
   be a direct flex-shrink-0 child of the scroll container, put children in a
   separate `min-h-full` wrapper. Small, isolated, easy port.

2. **Relic picker overlay leaks stale fissure era from the pre-mission pool.**
   `src-tauri/src/log_scanner.rs` lines ~159 and ~162: `if is_first &&
   self.void_tier.is_none()` and `if is_first && self.relic_picker_open` are missing
   an `&& self.in_mission` guard. The orbiter (pre-mission) relic pool has no real
   fissure era, so the first relic in that pool gets used as a fake era, and it
   carries into the next run's in-mission reward picker overlay. Also, the
   `relic-picker-opened` emit (pre-mission, ~line 227) doesn't carry an `in_mission`
   flag, so `MonitoringContext.jsx` can't distinguish pre- vs in-mission picker opens.
   Upstream fix: `35d7881` — gate both void-tier detection paths on `self.in_mission`,
   add explicit `in_mission: bool` to the emitted payload, and have
   `MonitoringContext` skip populating the picker overlay until `in_mission` is true.
   Needs both the Rust and JS side ported together.

3. **`resolveName`'s `/Recipes/` name-fallback branch is still an O(n) scan.**
   `src/lib/inventoryParser.js` line 324: `Object.keys(tbl).find(k =>
   k.endsWith('/' + leaf))` runs per lookup inside `_resolveNameInternal`, called for
   every item during `parseInventory` (~6k calls). We already have the
   `getSuffixIndex()` WeakMap-cached index (used by `resolveImage`, lines 353-364),
   just not applied here. Upstream fix: `6c28f76` — replace the scan with
   `getSuffixIndex(tbl).get(leaf)`. Trivial, safe, one-line port (our `resolveName`
   doesn't have the separate case-insensitive `ciLeaf` branch upstream also fixed, so
   only this one spot applies).

4. **`ownedCount` for prime-set warframe components increments by 1 instead of by
   quantity owned.** `src/lib/inventoryParser.js` lines 2160 and 2164:
   `if (bpQty > 0 || craftedQty > 0) ownedCount += 1;` and `if (bpQty > 0) ownedCount
   += 1;`. Upstream fix (`74bb050`) changes these to `ownedCount += bpQty +
   craftedQty` and `ownedCount += bpQty` respectively, so a stack of 3 spare
   blueprints/crafted components counts as 3 owned, not 1. This directly affects
   whatever consumes `ownedCount` (set completion / owned totals elsewhere in
   Inventory.jsx or Mastery.jsx — verify call sites before porting since our
   `Inventory.jsx` set-completion math has already diverged, see note below).

## Confirmed bugs — needs human judgment before porting (architecture has diverged)

5. **Prime-set completion badge mixes a part-count numerator with a need-sum
   denominator.** `src/screens/Inventory.jsx` line 568-571:
   `partsMet` = number of part *types* that are met, but `totalNeeded` (line 569) =
   *sum* of `need` across all parts. For any part with `need > 1` these two units
   don't match, so the displayed `partsMet/totalNeeded (%)` is wrong (percentage
   will read as artificially low, and can never reach the type-based `isComplete`
   threshold at the same time it shows 100%). This mirrors the exact class of bug
   upstream fixed in `6e8def2` and `74bb050`. However: our fork's `met` calculation
   at line 624 (`part.crafted !== undefined ? part.crafted >= need : part.quantity
   >= need`) was *deliberately* changed from upstream's `(crafted??0)+quantity>=need`
   per the code comment at lines 560-567 — a spare unbuilt blueprint no longer
   counts toward "met" for warframe components. Upstream's `74bb050` rewrite
   (`totalOwned = sum of min(crafted+quantity, need)`) would reintroduce exactly the
   behavior our comment says was fixed. Do not blind-port; the fix needs to keep
   using `part.crafted`-only semantics for warframe components while fixing the
   numerator/denominator unit mismatch (e.g. sum `need` only for met parts, or
   switch numerator to a "amount owned, capped at need" sum consistent with our own
   `met` definition).

## Known, pending (not new findings)

- `37adc08` "eliminate 34MB IPC bottleneck in load_all_exports causing WebKitGTK OOM
  crash" — already identified in a prior pass, explicitly not backported yet
  (flagged as bigger/riskier, awaiting explicit go-ahead).

## Missing features upstream added that we don't have

1. **Relic picker overlay vaulted toggle.** `f53f652` — Settings has a
   `relic_picker_include_vaulted` toggle already in upstream's Settings.jsx, but our
   fork has no `relic_picker_include_vaulted` string anywhere and no vaulted field
   plumbed through `MonitoringContext.jsx` or `RelicPickerOverlay.jsx`. This depends
   on the broader vaulted-detection feature set below (`949e1e2`, `b4f1935`,
   `4279af6`) which we also don't have. Scope: medium — needs vault detection
   (relic absent from live DropsAll = vaulted) plumbed into MonitoringContext, a
   per-session checkbox in the overlay, and filtering logic in the ducat/plat
   ranking.

2. **Vaulted tristate filters (relics + prime sets) and vaulted badges.**
   `949e1e2`, `b4f1935`, `4279af6` — Vaulted/Unvaulted/All filter tabs on Relics.jsx
   and the prime-parts tab of Inventory.jsx, powered by wfcd's vaulted flag /
   DropsAll absence. Our fork has none of this (`grep vaulted` on Relics.jsx,
   Inventory.jsx returns nothing). Scope: medium-large, several interlocking pieces
   across 3 commits; would need to be evaluated as one combined feature.

3. **Eleanor/Glast vendor tracking.** `8ff816e`, `894f604`, `33b5ff2` — Our
   `Checklist.jsx` task list has no `glast` or `eleanor` entries at all (verified:
   `grep -i eleanor|glast` on our Checklist.jsx returns nothing). Upstream added
   these as checklist tasks with a correct 8-day A/B batch cycle for Eleanor
   (epoch 2025-03-18 00:00 UTC, `looptime=8D delaytime=4D` per wiki) and a daily
   11:00 UTC reset for Glast. (Upstream briefly also added Dashboard vendor timer
   cards in `8ff816e`, then removed them again in `894f604` in favor of checklist-only
   — so only the checklist-task + Eleanor-cycle-logic pieces are worth porting, not
   Dashboard cards.) Scope: small, self-contained addition to `Checklist.jsx`.

4. **Bounty main guaranteed reward + enemy level ranges.** `4d34a16`, `dbbfc75`,
   `fc61e0d` — Our Dashboard.jsx already has its own bounty-tab implementation
   (`bountyTabs`, `BOUNTY_CYCLE_LEVELS`... actually not present — we use
   `oracle.browse.wf/location-bounties` + `/bounty-cycle` APIs directly rather than
   parsing worldstate `SyndicateMissions`), but has no "Rotation C Final Stage"
   guaranteed-reward lookup (`buildFinalStageIndex`/`lookupMainReward` helpers, drop
   index scan by `bountyLevel`+rotation) and no enemy level range display for bounty
   tabs. Because our bounty data source is architecturally different (oracle API vs.
   worldstate SyndicateMissions), this can't be copy-pasted — the reward-lookup
   logic (keyed off `dropIndex` by bounty level string) is source-agnostic and could
   likely be adapted, but the SyndicateMissions parsing itself (`4d34a16`) is N/A
   for us. Scope: medium, adaptation work not a straight port.

5. **Nightwave recovered-challenge tracking.** `8ff816e` — `ChallengeProgress`
   extraction into `completedChallengeIds` in inventoryParser.js, plus a Dashboard
   Nightwave section (`NightwaveChallengeRow`, `completedChallengeCount` in
   HeaderOverlay). Confirmed absent from our `inventoryParser.js` and
   `Dashboard.jsx` (no `ChallengeProgress`/`completedChallenge`/`NightwaveChallenge`
   matches). Scope: small-medium, self-contained parser + UI addition.

6. **Relic Omnia era + refinement filters.** `8ff816e` — Our `Relics.jsx` has
   `ERA_ORDER = ['Lith','Meso','Neo','Axi','Requiem']` with no `'Omnia'`, and no
   `refinementFilter` state / HasRefinements / IntactOnly tabs. Scope: small, adds
   one era + a filter dimension.

7. **Dim/badge market sales already owned.** `f41309f` — Our Dashboard.jsx market
   sales card has no `isMarketSaleOwned` helper or owned-name/leaf index at all
   (confirmed via grep). Upstream builds two O(1) `Set`s (normalized owned names +
   normalized path leaves from raw inventory) and dims/badges sales already owned.
   Scope: small, self-contained ~50 line addition, no dependency on anything else
   missing.

8. **Warframe-component three-state coloring + striped half-met overlay.**
   `1465508`, `fe50927`, `c994553`, `aad14d1`, `98ef288`, `5267f91` (treat as one
   combined feature). Our part-grid cell (`Inventory.jsx` line ~638) only has the
   original two-state `met ? 'bg-green-500/5' : 'bg-black/20'` — no yellow
   "has blueprint, not crafted" state, no red-removed/yellow-for-non-craftable logic,
   no equalized saturation, no striped overlay for half-met components. Purely
   additive CSS/state-class work layered on top of whatever "met" semantics we keep
   (see item 5 in the bugs section above — port after resolving that logic, not
   before, since the color states key off the same crafted/quantity fields).

## Checked, not applicable / already handled differently

- `29e3529` "market item name dont truncate" — our Dashboard.jsx market-sales
  `<p>` already has no `truncate` class on `sale.item` (line ~1595); the rest of
  that commit's diff is a whitespace/indentation reformat of the whole file plus
  the wishlist-button JSX we already have in a different form. ALREADY OK.
- `cea9918` "clean up force-show-after-5s fallback with ready flag check" — our
  `main.rs` fallback thread checks `!main_win.is_visible()` before force-showing
  (line ~3447), which achieves the same suppression as upstream's `AtomicBool
  ready_fired` flag through a different, already-adequate mechanism. ALREADY OK.
- Interactive in-game sidebar overlay system (`SidebarOverlay.jsx`,
  `OverlayRouter.jsx`, and the many `feat`/`fix` overlay-focus/positioning/X11
  commits threaded through the "rest of range" spot-check, e.g. `46ba930`,
  `65969cb`, `ac8f5f2`, `5ad1756`, `c519224`, etc.) — verified `SidebarOverlay.jsx`
  did not exist in upstream at our fork point (`4afe110`) but exists in our fork
  today, meaning it was built independently on our side after forking, not ported
  from upstream. Too architecturally divergent to usefully diff commit-by-commit,
  same call as Relics.jsx/relicParser.js. Skipped deep diffing.
- Wishlist feature (`1bcb3fb` and related fixes like `4b09319`, `a6a3186`) — already
  present in our Dashboard.jsx (`setShowWishlistModal` etc.), not re-audited in
  detail.
- i18n-only key-addition diffs across the range — not audited for translation
  completeness per instructions; flagged only where the underlying feature is
  otherwise missing (already noted above where relevant, e.g. `checklist.eleanor_cycle`,
  `relic_picker_include_vaulted` strings would need adding alongside their features).
