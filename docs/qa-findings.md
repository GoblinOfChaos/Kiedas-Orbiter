# QA Pass Findings (2026-08-17)

Full sweep of docs/qa-checklist.md via 8 parallel verification agents. 39 confirmed bugs found.
14 fixed and shipped in the v1.3.3 rebuild done this session (marked ✅ below). The rest are
still open.

## Fixed this session ✅

1. Prime Parts tab dropped ~30 owned Prime Warframes — `PRIME_PART_PATH_RE` in
   `src/lib/inventoryParser.js:245` didn't match real `...Component`-suffixed paths.
2. No Riven/mod ever showed its polarity icon — `POLARITY_FILES` map missing `AP_UNIVERSAL`
   in `src/components/ModCard.jsx` and `src/components/RivenCard.jsx`.
3. Mods.jsx category tabs broken for any non-English locale — compared translated label
   against hardcoded-English `mod.category` field. Fixed in `src/screens/Mods.jsx`.
4. Vehicles tab "Archwing" filter always returned zero — `vehicle_type` was never set on
   archwings. Fixed in `src/lib/inventoryParser.js` (~line 1391).
5. Maps.jsx crashed on "zoom to marker" click — undefined `imgX` at `Maps.jsx:487`.
6. Checklist.jsx wiped hidden-task choices on every restart — dead mount effect at
   `Checklist.jsx:724-726` removed.
7. Checklist.jsx dead `toggleNotif`/`setNotifMap` (undefined var, crash risk) — removed.
8. Checklist.jsx negative-standing (enemy syndicate) progress always wrong — fixed
   `getEarnedStanding` for `rank < 0`.
9. Checklist.jsx `mastery_rank: 0` (new account) incorrectly overridden to 16 — `||` → `??`.
10. Arcane mod card background art never loaded — filename casing bug in `ModCard.jsx:390`.
11. Amalgam/Peculiar mod frames wrongly excluded from SideLight glow (`NO_SIDE` set) despite
    the art existing on disk.
12. SidebarOverlay "Relic Planner" nav item had no matching screen — blank pane on click.
    Added lazy import + screens map entry in `SidebarOverlay.jsx`.
13. Prime Resurgence bundles always showed "Not owned" — hardcoded `owned: false` in
    `src/lib/primeResurgence.js:142`, now does a real ownership lookup like equipment/cosmetics.
14. Relics.jsx showed a fabricated Ducats value on Requiem relic cards whenever sort mode
    wasn't "Name" — compared group label instead of `item.era`. `Relics.jsx:494`.

## Fixed in live-testing follow-up pass (same day)

15. **Prime Parts tab dropped every fully-crafted set, not just some** — the real root
    cause (my earlier regex fix in #1 only helped partially): `Inventory.jsx:220-221`
    filtered `primeSets` on leftover part `quantity > 0` *before* attaching real parent
    ownership. A fully-built set has every blueprint/component consumed (quantity 0
    everywhere) even though the finished item is 100% owned, so it never survived the
    filter. Frost, Saryn, Equinox, Harrow, Mirage, Nekros, Zephyr Prime (and likely more)
    were missing for this reason specifically. Fixed by attaching parent ownership first,
    then filtering on `set.owned || parts.some(quantity > 0)`.
16. **Archwing/vehicle cards could show "Mastered" for an item you don't currently own**
    — `mastered` is a correct lifetime flag in Warframe (mastery persists after losing an
    item), but the badge in `Inventory.jsx:846-849` showed "Mastered" whenever
    `item.mastered` was true, with no ownership check at all, so a previously-mastered-but-
    now-unowned item (e.g. base Odonata after building Odonata Prime) displayed as if
    owned. Fixed: `isUnowned` now takes priority and always shows "Unowned".
17. **Checklist.jsx enemy-syndicate standing could show progress past 100%** — real
    standing can go more negative than the rank's displayed cap (DE doesn't hard-clamp the
    raw value), e.g. Cephalon Suda at rank -2 (cap -44000) with real standing -71000. Fixed
    `getEarnedStanding` to clamp to the cap.
18. **Relics.jsx: Requiem relics vanish from the list (and search) entirely whenever the
    ownership filter isn't "Owned")** — `getRelicCatalog` deliberately excludes Requiem
    (that export table's Requiem-named entries are T5 mod tables, not Prime relics), and
    the "All"/"unowned" view fully replaced the owned-relic list with catalog output, so
    real owned Requiem relics had no catalog entry to merge into and disappeared. Fixed by
    keeping any owned relic left unmatched after the catalog merge.

## Fixed in the "high-value" pass (2026-08-19)

19. Settings.jsx `Notification Triggers` dead panel (11 state vars, 11 handlers, zero UI
    presence) removed - confirmed `NotificationManager` already covers all the same trigger
    types (Arbitration/Foundry/Syndicate/Void Traces/Mastery) via a newer, more flexible
    system, so nothing was lost.
20. Cosmetics.jsx `cosmeticType()` rewritten using real `/Upgrades/Skins/Weapons/<Class>/`
    paths (verified against all 58 real weapon skins) instead of dead substring checks;
    Operator/Clan/Railjack/Hoverboard no longer wrongly bucket as "Warframe" (739 Operator
    items alone were mislabeled before).
21. Adversaries.jsx `PROGENITOR` table fully rebuilt from the real wiki table
    (wiki.warframe.com/wiki/Adversary_System/Progenitor) - the old table wasn't just missing
    4 frames, most element assignments were wrong (e.g. Excalibur listed as Impact; real
    element is Electricity), and it invented two element categories (Puncture, Slash) that
    don't exist in the real system at all.
22. Adversaries.jsx `SISTER_TENET_WEAPON_NAMES` completed to all 16 real Tenet weapons
    (verified via dict.json loc-tags) - was missing Agendus, Exec, Ferrox, Grigori, Livia,
    Quanta.
23. Dashboard.jsx Steel Path tab selector removed - confirmed via the real wiki page that
    the underlying content (The Descendia) only varies by enemy level between difficulties,
    not by the challenge/objective rotation this widget displays, so there was never real
    data to wire the toggle to.
24. Rivens.jsx `rivenKey()` collisions fixed using the real per-instance save-file ID
    (`ItemId.$oid`) for owned/challenge rivens instead of name+stats, which collided for
    duplicate challenge rivens on the same weapon. Verified zero collisions across all 46
    real rivens. Veiled rivens turned out to already be safely deduplicated (DE stores them
    as one stacked entry per weapon type, not individual instances) - no fix needed there.

## Investigated, not a bug (or couldn't confirm)

- **Riven card polarity icon** — confirmed fixed and visible on the card itself; clicking
  a riven opens the acquisition drawer, which correctly doesn't show polarity (not its
  purpose).
- **Sentinel mods category count** — real data check found 62 Sentinel-category mods in
  the catalog (~52 owned) for this save, not 13 owned / 31 total. Couldn't reproduce the
  reported number from source alone — needs a screenshot of exactly which screen/count is
  showing 13/31 to pin down (could be a different, narrower list e.g. a per-companion
  equip-mod picker rather than the Mods tab's Sentinels category).
- **Maps "no zoom to marker option"** — it exists (small Navigation icon button in the
  marker-edit panel, which only appears after you click an already-placed custom marker),
  it's just not discoverable. No double-click-to-zoom feature exists at all currently.
- **In-game sidebar overlay "never seen it"** — there is no default hotkey; it must be
  bound manually in Settings → Hotkeys → "Toggle Ingame Menu". Nothing in the app currently
  explains this. A "How To" / feature guide (user's suggestion) would help here and for
  hotkeys/shortcuts generally — not built yet, flagged as a good follow-up feature.
- **Prime Resurgence bundles "not owned"** — the `owned: false` hardcode fix (#13) is real
  and correct, but this player currently has zero bundles in inventory to verify visually
  against.

## Fixed in the full sweep (2026-08-19, continued)

All remaining High-value and Moderate items from the previous "Still open" list are now
fixed and verified:

- Settings.jsx dead Notification Triggers code removed (see #19 above).
- Cosmetics.jsx skin classification rebuilt (see #20 above).
- Adversaries.jsx Progenitor table and Tenet weapon list rebuilt from real data (see #21-22).
- Dashboard.jsx Steel Path selector removed - confirmed no real data to wire it to (see #23).
- Rivens.jsx key collisions fixed with real per-instance IDs (see #24).
- RivenOverlay.jsx: `rivenInfo` now resets synchronously on every new capture; added a
  generation counter (`captureGenRef`) so the always-on `riven-ocr-result` hotkey listener
  can't race a `doOcr` call already in flight and have a stale result win.
- AcquisitionDrawer.jsx: mission-type suffix now also accepts already-readable Title-Case
  strings (drops.wf's `gameMode`), not just `MT_*` codes - verified against all 32 real
  gameMode values in DropsAll.json.
- Foundry.jsx: `RecipeDrawer` now keyed by `item.unique_name`, forcing a real remount (and
  fresh `ItemImage` `failed` state) on selection change instead of reusing the same fiber.
- Settings.jsx: manual-monitor toggle now fetches the monitor list directly if it hasn't
  loaded yet instead of silently doing nothing; "Installing..." label added; relic-overlay
  test now awaits each staggered per-slot update before firing the summary event.
- Notes.jsx: added the 5 missing code-block language keys (`lang_js/ts/py/rs/plain`).
- MonitoringContext.jsx/MirroredMonitoringProvider.jsx: `masteryProgress` now dedupes items
  the same way Mastery.jsx's own total does.
- RivenCard.jsx: `x 0.95`-style curse multipliers no longer get a spurious `-` prepended.
- ModCard.jsx: removed the stray `useUi()` call from `getSetFileName` (unused destructure,
  real Rules-of-Hooks violation).
- UI.jsx `TooltipPortal`: fade-out now actually plays - stays mounted for the transition
  duration before unmounting instead of unmounting on the same render opacity hits 0.
- ToastOverlay.jsx: falls back to the Bell icon when the resolved icon URL is empty, not
  just when `toast.image` itself is falsy.
- Inventory.jsx: aggregate "N Set(s) complete" badge now uses the same "met" logic as the
  per-cell grid (an unbuilt spare blueprint doesn't satisfy the crafted-component
  requirement); sort-by-value now applies the same `* (p.need ?? 1)` multiplier the
  displayed badge uses.
- Cosmetics.jsx: added the missing "Animation" filter button.
- Adversaries.jsx: Progenitor table element icon now has the same `onError` fallback as the
  nemesis row's icon.
- About.jsx: app icon no longer renders `src=""` before `uiPath` resolves.

### Needs live verification (can't be settled from source alone)
- Riven polarity fix (#2 above) — worth an in-app screenshot check on a Riven card.
- Wiki.jsx sidebar-toggle reflow (`Wiki.jsx:109-115` vs `src-tauri/src/main.rs:3223-3257`).
- Wiki.jsx tab strip across multiple windows — possible blank pane if a tab is shown in a
  window that never opened its own webview.
- RelicRewardOverlay.jsx: no session/generation token on the `overlay-update-ocr` handler — a
  late OCR event could theoretically write into a freshly-reset session.
- SidebarOverlay.jsx resize handle: no `pointercancel` handling, no cleanup if the sidebar
  auto-hides mid-drag.
- ToastOverlay.jsx Linux dual-timer (5s JS vs 6s backend) — should hold up but wants a live check.
- Rivens.jsx `STAT_TO_PRICER` fallback silently guesses a pricer key for uncovered stat tags.
- `inventoryParser.js:2894-2911` sub-ingredient tally for component blueprints has no
  `ingredientUsage`-style allocation like the top-level ingredient loop — same bug class as the
  already-fixed double-count issue, low probability in practice.

## Upstream Kronos diff review — open items (2026-08-19, reviewed through 29e3529)

Full detail with line numbers and upstream commit hashes in `docs/upstream-diff-tally.md`.

### Confirmed bugs upstream already fixed — fixed 2026-08-19 ✅
25. `PageLayout` (`UI.jsx`) unpinned its sticky header/filter row after ~1 viewport of scroll —
    affected Inventory/Relics/Rivens/Mods. Fixed: hoisted `headerPanel` out to a direct
    `flex-shrink-0` child of the scroll container instead of nesting it in a `flex-1 min-h-0` wrapper
    (matches upstream `4c56591`).
26. Relic picker overlay could leak a stale fissure era from the pre-mission orbiter pool into the
    next mission's in-mission reward picker. Fixed in `log_scanner.rs`: void-tier detection and the
    `relic-picker-tier` emit now gated on `self.in_mission`; the pre-mission `relic-picker-opened`
    emit sends an explicit `null` tier instead of a possibly-stale one (matches upstream `35d7881`).
    Did NOT port upstream's extra MonitoringContext.jsx gate that hides the picker overlay entirely
    until in-mission — our `buildRelicPickerPayload` already treats an absent tier as "show all eras,
    unfiltered" by design, and the leak was purely a Rust-side issue.
27. `resolveName`'s `/Recipes/` fallback (`inventoryParser.js`) did an O(n) key scan per lookup
    (~6k calls during parseInventory). Fixed: now uses the same cached `getSuffixIndex()` map
    `resolveImage` already uses — verified identical match semantics before switching (matches
    upstream `6c28f76`).
29. Prime-set completion badge (`Inventory.jsx`) numerator (`partsMet`, a part-*type* count) was
    divided by a `need`-sum denominator — mismatched units whenever any part has `need > 1`, e.g. a
    fully-owned set with an Afuris-Barrel-style dual-need part would read as 80% instead of 100%.
    Fixed by making the denominator a part-type count (`set.parts.length`) to match the numerator's
    units, instead of blind-porting upstream's `74bb050` rewrite (which uses sum-based "amount owned"
    semantics that would reintroduce the "spare blueprint counts as met" bug our fork deliberately
    fixed differently — see comment at `Inventory.jsx:560-567`).

### Confirmed bug — reclassified as needs-judgment (conflicts with our own logic)
28. Prime-set component `ownedCount` (`inventoryParser.js:2160,2164`) increments by 1 per stack
    instead of by actual quantity owned. Investigated: our fork's `Inventory.jsx:377-378` uses
    `ownedCount / totalCount` as a **part-type completion ratio** for sorting (both sides must stay
    in the 0..totalCount range). Upstream's fix (`74bb050`, summing quantity instead of counting
    types) would break that ratio — a set missing 3 of 4 part types but holding 5 spares of the one
    it has would show 125% and sort above finished sets. NOT ported as-is. If a literal "quantity
    owned" figure is wanted somewhere (e.g. for a future sets/parts-toggle display like upstream's,
    see missing-feature #8 below), it needs its own field, not a rewrite of this one.

### Missing features upstream has that we don't
30. Vaulted tristate filters (Relics.jsx + Inventory.jsx prime parts) + vaulted toggle in the relic
    picker overlay — medium/large, several interlocking commits (`949e1e2`, `b4f1935`, `4279af6`,
    `f53f652`).
31. Eleanor (8-day A/B cycle) + Glast (daily 11:00 UTC) vendor tracking as Checklist tasks —
    small, self-contained (`8ff816e`, `894f604`, `33b5ff2`). Note: skip the Dashboard vendor-timer
    cards upstream added then removed again in favor of checklist-only.
32. Bounty "Rotation C Final Stage" guaranteed-reward lookup + enemy level ranges — our bounty tab
    uses a different data source (oracle.browse.wf) than upstream's worldstate SyndicateMissions
    parsing, so this needs adaptation, not a straight port (`4d34a16`, `dbbfc75`, `fc61e0d`).
33. Nightwave recovered-challenge tracking (`ChallengeProgress` parsing + Dashboard section) —
    small/medium, self-contained (`8ff816e`).
34. Relic Omnia era + refinement (HasRefinements/IntactOnly) filters on Relics.jsx — small (`8ff816e`).
35. Dim/badge Dashboard market sales already owned, via O(1) owned-name/leaf index — small,
    self-contained, no dependency on anything else missing (`f41309f`).
36. Warframe-component three-state coloring (yellow/green/half-met striped overlay) on the
    Inventory prime-parts grid — purely additive CSS/state-class work; port after #29 above is
    resolved since it keys off the same crafted/quantity fields (`1465508`+5 related commits).

### Checked against upstream, no action needed
- Market item name truncation — already not truncated on our side.
- `main.rs` force-show-after-5s fallback — already suppressed correctly via a different mechanism
  (`!main_win.is_visible()` check) than upstream's flag.
- In-game sidebar overlay system — built independently in our fork after the fork point, doesn't
  exist upstream at all; too divergent to diff further, same treatment as Relics.jsx/relicParser.js.
- Wishlist feature — already present on our side.

## Collectibles "where to find" data (2026-08-19)

**First pass (wiki-only) was wrong and got corrected mid-session — recorded here for the full
picture.** Started by researching wiki.warframe.com and hand-entering per-category totals
(`wikiTotal`) and location snippets. Live testing immediately falsified two of them: the user's
real save showed 58/55 Somachord tunes (over 100%) and had Leverian cards (`Oraxia`, `Runner`,
`Brawler`) that didn't exist in ANY wiki fetch. Investigating `Runner`/`Brawler` found they're
DE's internal codenames for Gauss and Atlas respectively (confirmed via `ExportCodex.json`'s
`name` field mapping `RunnerLoreCardFragment` → `TarotCardGaussName`) - the wiki was simply behind
current game content, and no amount of re-fetching it would have fixed that.

**Root cause of the whole approach being wrong:** used the wiki as the source of truth for "what
exists" when a better source was available - DE's own `ExportCodex.json` (from the same
calamity-inc/warframe-public-export-plus export the app already pulls `ExportRegions.json` etc.
from), which we'd never fetched before. It has `loreFragments`/`songs`/`fighterFrames` sections
listing every single item that exists in the game, independent of any player's save. Added
`"ExportCodex.json"` to `EXPORT_FILES` in `main.rs` (auto-downloads and refreshes exactly like the
other export tables) and rebuilt Collectibles.jsx around it:
- Fragment category totals are now computed live from the real catalog size (`codexCatalog` in
  `Collectibles.jsx`), not hardcoded - self-correcting as DE adds content in future updates.
  Real totals turned out to be: Somachord Tunes 86 (was 55), Cephalon Fragments 54 (was 43), Frame
  Fighter Fragments 44 (was 42, and my own wiki-based "48" correction was ALSO wrong), Leverian
  Prex Cards 25 (was 50, my wiki-based "10" was ALSO wrong), Fortuna Fragments 35 (unchanged - my
  wiki-based "40" was wrong), Thousand-Year Fish/Encrypted Journal/Glass Shard/Nakak/The
  Tenets/Partnership all matched the original numbers exactly.
- The subpanel now lists every real item in a category (found and not-found), with real
  dict-resolved names (matches the "show every single one" ask) - not just what's been scanned.
- Per-item exact locations are wired for Leverian (10 of 25 spots known), Glass Shard Fragments
  (5/5), Encrypted Journal Fragments (13/13), Albrecht's Notes (5/5, corrected to their real
  names - "The Aftermath"/"The Cavia"/"Duviri"/"The Vessels"/"We End as we Began", not the
  "Entry I-V" guess from the first pass), and Nakak Memory Fragments (3/3, corrected to real
  names). All matched via real `ItemType` leaf, not guessed ordering. Everything else falls back
  to a category-level guide note plus a real "Open full wiki guide" link button in the subpanel.
- Real per-island location data for Lost Islands of Duviri (90 fragments / 10 islands) kept from
  the first pass - unaffected by the wiki-total problem since series totals come from the save
  data's own `ReqScans`, not a hand-entered number.
- Isleweaver Fragments and Thousand-Year Fish: still no reliable per-item location text (Isleweaver
  has no documented spots at all; Fish locations are only on an interactive wiki map) - left
  without location data rather than fabricating it.
- Cross-checked against `docs/collectibles-guides.md` (user-provided, Codex-assisted standalone
  research doc) - it independently confirmed the Leverian codename findings and the
  ExportCodex-over-wiki approach. Pulled in real value: Frame Fighter Fragments now has all 44
  items wired to a real per-item planet location (resolved via each fragment's real Warframe name
  against the guide's planet table), plus Loot Radar mod tips and a video-guide link for
  Thousand-Year Fish.
- **Investigated and reverted a per-item found/unfound attempt for series (Kuria/Duviri/Isleweaver).**
  The raw save's `CollectibleSeries[].Tracking` field is a bitstring whose total 1-count exactly
  equals the reported `Count` (verified: 31 ones for Kuria's Count:31). Initially wired `tracking[i]`
  as the found-state for item `i`, but checking whether the first/last `ReqScans` bits of that
  string line up with per-item order found they DON'T (11 or 30 ones in those windows, not 31) -
  and a brute-force scan for any contiguous window whose count matches 31 found matches at
  multiple different offsets, meaning any one "match" is coincidental, not a real mapping. Reverted
  before shipping; series subpanels now carry an explicit note that individual item status isn't
  determinable from the save, only the aggregate count is accurate, and the location list is a
  reference, not a personal checklist. Also fixed the Duviri subpanel showing 9 visually-identical
  rows per island by appending the item's group index to its displayed name.

## Notification Manager: 46 missing translation keys + Foundry never fires on completion (2026-08-20)

User noticed the "Add Notification" dropdown showing raw keys (`ui.notif_mgr.trig_void_traces`
etc) instead of labels for 8 of the 11 triggers. Investigating found the real scope was much
bigger: searched every `ui.notif_mgr.*` key referenced anywhere in `notificationManager.js`
against `en.json` and found **46 of them didn't exist at all** - not just trigger/column/option
labels, but the actual fired-notification title/body text for every trigger except Void
Fissures/Arbitration/Bounty (which only "worked" by coincidence, reusing pre-existing
`ui.dashboard.*` keys instead of their own `ui.notif_mgr.msg_*` keys). `t()`'s missing-key
fallback returns the raw key string with no placeholder substitution, so every fired Void
Traces/Chat/Syndicate/Foundry/Mastery/Checklist/Sale notification would have shown a literal
key string like `ui.notif_mgr.msg_foundry` as its message instead of real text - the entire
Notification Manager's message content had never actually been translated. Added all 46 keys
(plus one new one, see below) with real English text and matching `{param}` placeholders,
cross-checked against each `evaluate*` function's actual `tr()` call to get the params right.

Separately, user reported enabling Foundry notifications and getting nothing when an item
finished. Root cause: `evaluateFoundry` only ever fired a notification in the pre-completion
"advance" window (config: "notify when remaining time is N minutes") and explicitly `continue`d
past any item where `finishTime <= now` - i.e. once actually complete, it never notified at all,
despite the trigger being labeled "Foundry Complete". If the advance window passed unwatched (app
closed, or just not looking at the time), the item would sit finished in the foundry queue
forever with zero notification. Fixed: added a second branch that fires once when an item is
found already complete-but-uncollected (`msg_foundry_ready`, distinct dedup key from the
pre-completion `msg_foundry` warning so both can legitimately fire in sequence for the same item).

**Known remaining caveat, not fixed:** `MonitoringContext.jsx`'s notification poller has a
"mark everything as seen on first real data, don't flood on startup" step that runs once per app
launch. This is the right call for state-based triggers (an already-active fissure/arbitration/
syndicate cap shouldn't re-notify every time the app opens), but it also silently swallows a
Foundry item that's *already sitting finished* at the moment the app starts - the exact scenario
of "I wasn't watching, came back to a finished item" that the fix above is meant to solve. Not
addressed here since it needs a real design decision (e.g. persisting per-item "already notified"
state across restarts rather than the current in-memory Set) rather than a quick tweak.

## In-game sidebar overlay: two compounding bugs, both fixed (2026-08-20)

User had never once seen the sidebar overlay work, matching the earlier QA note. Root-caused two
separate, compounding bugs:

1. **HotkeyRecorder gave zero feedback about what it needed.** `Settings.jsx`'s `HotkeyRecorder`
   silently rejects any keypress with no modifier held (bare keys can't be globally captured over
   a fullscreen game) - correct behavior, but it only flashed the button red with no explanation,
   indistinguishable from "broken." Fixed: shows "Hold Ctrl/Alt/Shift + a key" during the rejection
   flash, plus a permanent hint text while recording.
2. **The overlay itself crashed on every load, real bug independent of #1.**
   `MirroredMonitoringProvider.jsx` (the lightweight monitoring context the sidebar overlay uses
   instead of the main window's) referenced `wiSupplement` while handling `sidebar_load_data`'s
   result (lines 168-172) - but `wiSupplement` was never defined in that scope, only inside a
   separate, later `loadWarframeItemsMaps().then(...)` callback. Every time the overlay
   initialized, this threw a `ReferenceError` synchronously inside the promise chain, BEFORE
   `setExportData(exports)` on the next line ever ran. Result: `exportData`/`dict` stayed null
   forever in the overlay, the worldstate fetch never even attempted (gated on `dict` being
   populated), and Dashboard's "Loading worldstate..." spinner never cleared - permanently, on
   every single overlay open. Confirmed via the user's live run log
   (`[SIDEBAR-TOGGLE] ENTER done side=left` fired correctly, proving the hotkey/window-show path
   was fine and the break was purely in the data pipeline). Fixed by deleting the broken block -
   it was fully redundant with the correct, working wfcd-supplement merge later in the same file
   (lines 200-208 pre-fix), which still runs and enhances the data a moment after the initial
   (now successful) `setExportData(exports)`.

Once #2 is confirmed fixed live, the remaining "needs live verification" items that were blocked
behind never having a working overlay (Wiki.jsx sidebar-toggle reflow, SidebarOverlay resize-handle
drag/auto-hide) become testable for the first time.

**SidebarOverlay resize-handle - confirmed live 2026-08-20, fixed.** With the overlay finally
loading, user immediately hit the resize-handle bug flagged earlier as unverified: dragging to
resize would glitch, and releasing the mouse didn't end the drag - it stayed "in movement"
permanently. Root cause matched the flagged concern exactly: `onResizeStart` in
`SidebarOverlay.jsx` only cleaned up on `pointerup`, with no `pointercancel` handler. Every
pointermove during the drag calls `set_sidebar_width` over IPC to resize the actual native
overlay window - a window whose own geometry is changing *while* it holds the pointer capture,
which can itself invalidate that capture and fire `pointercancel` instead of a normal
`pointerup`. With no handler for that, the drag state (event listeners, capture) never tore down.
Fixed: added a shared `end()` cleanup wired to both `pointerup` and `pointercancel`. Also
coalesced the per-move resize IPC calls to at most one per animation frame (previously fired on
every raw pointermove, which is almost certainly what caused the visible "glitch" during drag -
resizing a real native window is much heavier than a CSS-only resize).

**Follow-up, confirmed live same day: a deeper variant of the same bug survived the fix above.**
Dragging fast enough (specifically widening quickly) would still freeze the drag permanently. Real
cause: even coalesced to one-per-frame, every native resize is still IPC-round-trip-lagged behind
the actual cursor position. A fast drag lets the OS cursor move past where the window's real edge
currently is. Once the cursor is physically outside the window's actual boundary, WebKitGTK stops
delivering pointer events to it at all - not move, not up, not cancel, this is an OS-level routing
fact, not something any JS listener (including the pointercancel handler just added) can catch.
Fixed properly this time by removing the incremental native resize from the drag loop entirely:
`onResizeStart` now grows the real window to its max possible width in a single call *before* the
drag starts (so the cursor can never outrun it), tracks the visible width purely via a CSS
`width`/`overflow:hidden` override on the root container during the drag (instant, zero IPC), and
shrinks the real window down to the actual chosen width in one final call on `pointerup`/
`pointercancel`. The resize-handle's own position was switched from `fixed` (viewport-relative,
would've stayed pinned to the now-max-grown window's edge instead of the visible content edge) to
`absolute` within the same width-clipped container so it tracks the cursor correctly during drag.
Also had to account for `side: "right"` placement growing the native window leftward (its right
edge stays pinned to the monitor edge per `set_sidebar_width`'s `target_x` calc in `main.rs`) by
conditionally margin-anchoring the visible content to the correct edge - the user's own setup uses
`side: left`, so this specific branch is unverified live and worth a look if anyone runs the
sidebar on the right.
