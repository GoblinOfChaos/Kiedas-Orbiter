# Live QA checklist

The things that can't be settled by reading code — they need the app running, a
real account, or live game data. Everything else in `docs/qa-checklist.md` is
already verified (513/557).

Each entry says **what to do**, then **what wrong looks like**. If nothing looks
wrong, tick it. The `qa-checklist.md` line number is in brackets so the result
can be recorded back there.

Anything that *does* look wrong is worth reporting — most of these are the only
way that particular bug class can ever be caught.

---

## Part 1 — One pass through the app (~10 minutes)

Pure looking. No special account state needed.

### Maps
- [ x] Open each of the four map tabs in turn. Each shows its own correct map image. **Wrong:** a tab shows another tab's map, or a blank/placeholder box. [L334]
- [ x] Zoom in and out on a map. The zoom percentage badge updates as you zoom. **Wrong:** it sticks at one number or lags a step behind. [L351]
- [ x] Zoom all the way in, then drag the map as far as it will go in each direction. **Wrong:** the map slides completely out of view, or you can pan into empty space with no way back. [L350]
- [ x] Toggle raw/labeled terrain, then switch to a different map tab. The toggle stays where you set it. **Wrong:** it silently resets to labeled when you change tabs. [L335 — verified in code, just confirming]
- [x] ~~Duviri's raw/labeled toggle appears to do nothing.~~ **Resolved 9/1** — confirmed, not a toggle bug: Duviri's `raw` and `labeled` entries both point at the same file (`Duviri_map_with_caves.png`, `Maps.jsx:22`), and no second Duviri map exists anywhere in the repo, the build output, or the wiki archive (its `Duviri_Map` page is the only Duviri map source). This is a missing asset, not a code defect — nothing to fix without a distinct "raw" Duviri map to source. The toggle itself works correctly on the other three maps.

### Mastery
- [ x] Look at the MR rank icon. It renders as a real icon. **Wrong:** blank space or a broken-image box. [L356]
- [ x] Look at the mastery progress bar. The percentage label, the bar's fill width, and the numbers agree. **Wrong:** bar reads 90% while the label says 40%, or a nearly-full bar labelled 2%. [L367]

### Relics
- [ x] Look at the relic list. Every era icon (Lith/Meso/Neo/Axi) and the Ducat/Platinum icons render. **Wrong:** any missing icon or broken-image box. [L398]

### Mod cards
- [x ] Open several mods of different types — a normal mod, an Arcane, a Requiem, an Archon, a Galvanized. On each, the category text sits where it should. **Wrong:** category text overlapping the mod name, running off the card, or clipped by the frame. [L734]

### Dashboard
- [ x] Look at The Circuit card's reward icons. Each icon matches its reward's name. **Wrong:** a reward showing a visually different item's icon — this one is a real risk, since the image lookup falls back to a partial name match. [L116]

### Anywhere with stat tiles
- [ x] Glance at the stat cards (Dashboard, Inventory headers). Numbers and labels read as written. **Wrong:** a truncated number, a missing unit, or a mangled label. [L805]

### Language (only if you use a non-English UI)
- [ ] Switch the UI language to a non-Latin one (Japanese, Korean, Chinese, Russian, Thai). Small labels stay readable. **Wrong:** characters clipped top or bottom at the smallest text sizes. [L709]
- [ ] While you're there: switching language should never hang. **Wrong:** the loading overlay stays up forever and needs a force-quit. *(Fixed today — this is confirming the fix.)* [L708]

---

## Part 2 — While you play (opportunistic)

These need your real account and collection, so they're best noticed in normal
use rather than hunted down.

### Inventory
- [x ] The owned/mastered filter toggles actually narrow the list correctly against your real collection. **Wrong:** an item you own showing under "missing", or vice versa. [L288]
- [ x] A fully-crafted set you own shows as owned even when its part quantities read 0. **Wrong:** a completed set showing as incomplete because the parts were consumed. [L296]
- [x ] Prime sets correctly find their parent equipment. **Wrong:** a prime set that doesn't link to its weapon/frame, or links to the wrong one. [L297]
- [x] Sort by rank with a mixed-rank collection. Unranked items sort predictably rather than scattering. [L308]
- [x ] Credits / Platinum / Endo match what the game shows. **Wrong:** off by a factor of 1000, or the wrong currency. [L328]

### Mastery
- [x] ~~Mastery mismatch across several categories.~~ **Fixed 9/1**, verified against your real inventory.json — 3 of 4 confirmed:
  - Kitguns/Zaws folded into Secondary/Melee's real total (DE tracks them there, not separately) — Melee now reproduces your exact reported 185/234; dedicated Kitgun/Zaw tabs stay as display-only breakdowns.
  - Sentinels/MOAs/Hounds/Sentinel-Weapons combined into one "Robotics" total matching DE's own grouping; root cause of the gap was Prisma Shade + its weapon (a Baro-vault item DE hides from the Codex) inflating the denominator — excluding it reproduces your exact 34/46. "Companions" now correctly means Kavats/Kubrows/Predasites/Vulpaphylas only.
  - Plexus was miscounted inside Companions — now its own row combined into a "Vehicles" total with Archwings/Necramechs/K-Drives, matching your "+1" exactly.
  - The generic "AMP" item **could not be confirmed** — checked every amp path in the real export data and your real inventory, found nothing matching. Left unfixed rather than guessed; if you can find its internal name in-game that would help. [L363]

### Relics
- [ x] Void Traces count and max match in-game. [L396]
- [x] ~~In game shows collected 76/772.~~ **Investigated 9/1, no code defect found.** The app doesn't actually show a comparable "X/772" number anywhere — the Relics subtitle is a filtered live count, not a fixed collected/catalog ratio. Traced both sides against your real data: the app's relic-catalog total (Lith–Axi only, by design) is 763, and all distinct relic tables including Requiem/Vanguard is exactly 772 — matching your reported denominator, which suggests DE's in-game stat counts more than this screen's Prime-relic-planner scope does. Your currently-held distinct relic types come out to 77, not ≤76, which doesn't fit a "lifetime collected" reading either — more consistent with the two numbers having drifted since you checked (relics used/picked up since) than a parsing bug. No grouping or dedup defect found. [L383]

### Dashboard / Checklist
- [x ] Sortie, Steel Path Incursions, Archon Hunt and Nightwave countdowns match the real in-game timers. **Wrong:** a countdown frozen, wildly off, or showing a default instead of the real expiry. [L253]
- [x ] Duviri cycle countdown matches the real cycle. [L352]
- [x ] Prime Resurgence rotation end date matches the real rotation. [L168]

### Cosmetics
- [x] ~~Items under the Warframe tab that aren't for Warframes (Aebolg Tail, Aegrae Eye-Guard, Aqua Heart Emblem).~~ **Fixed 9/1** — this was a tab-categorization bug, not an acquisition-text bug: the "Warframe" filter matched any non-weapon cosmetic subfolder, wrongly catching a Duviri horse-tail cosmetic, Kahl's eyepatch, a seasonal badge, and more broadly Kubrows/Catbrows/MOA companions/Necramechs/K-Drives. Replaced with an allowlist built from DE's real Warframe list so it can't happen again as new Warframes are added. **Still open:** whether the acquisition-drawer *text* itself is correct per cosmetic type (the original intent of this checklist line) hasn't been separately verified — worth a look once rebuilt, now that the tab miscategorization won't confuse the sample. [L499]

### Wiki
- [x] ~~Aetigo Kaithe is linked to a non-existant wiki.~~ **Fixed 9/1** — real bug, not just this one item: `getWikiLink()`'s fallback always guessed an article-page URL from the item name, even when it had already marked the link "unverified" — so any item with no confirmed wiki page (like this one; no "Aetigo Kaithe" page exists) 404'd regardless of the button saying "View" or "Search". Now builds an actual wiki search query when unverified. Worth spot-checking a few more obscure items once rebuilt, but the underlying cause is fixed, not papered over for this one item. [L545, L546]

### Maps (marker editing)
- [x ] Add markers on one map, restart the app, and confirm they're still there and on the right map. **Wrong:** markers lost, or bleeding onto a different map. [L337]
- [x] ~~You cannot edit a marker at all, only name and place.~~ **Resolved 9/1** — not a bug: markers are click-disabled while "adding pins" mode is still active (`pointerEvents: 'none'`, deliberately, so placing your next pin can't misfire onto an existing one). Exit that mode first (X on the "Adding markers…" banner), then click a placed marker — the full editor opens correctly: label, color, icon, connections, and notes all work as built. Confirmed working via screenshot. Worth a product decision (not done): should placing a marker auto-open its editor, or auto-exit add-mode, so this doesn't read as "broken" again? [L339]
- [x] ~~This has never been a feature and doesn't work.~~ **Confirmed working 9/1** after rebuild — right-click to add a pin now works. [L345]

---

## Part 3 — Confirm once, then done

### Relic overlay (during a real fissure run)
- [x ] Your own reward appears in the slot the overlay treats as yours. **Wrong:** the overlay highlights a squadmate's reward as yours. This is the assumption that slot 1 is always the local player — worth watching across solo, 2-player, and full-squad runs. [L592]
- [ unable to reliably test this] Rewards from one round never appear in the next round's slots. *(A race causing exactly this was fixed today — this is confirming it.)* [L584]
- [x ] With relics from several eras, the picker shows per-era rows; with a known single era, it shows a flat top-5. **Wrong:** the wrong layout for the situation. [L572]

### Overlays
- [unable to reliably test ] Every overlay screen renders rather than sitting on a spinner. **Wrong:** a permanent loading spinner — there's no error boundary there, so a failed import would hang silently. [L639]
- [x] ~~Hide on alt-tabbing does not hide sidebar.~~ **Confirmed working 9/1.** No root cause found or fix applied for this - diagnostic logging was added (overlay_utils.rs FOCUS_WATCHER) to catch evidence if it recurred, but the current session's log shows zero FOCUS_WATCHER entries, meaning that diagnostic build isn't the one that was actually tested. So this is confirmed working now, but *why* it was reported broken earlier is still unexplained - if it happens again, check the log for FOCUS_WATCHER lines first. [L640]
- [x] ~~Test Notification button: no sound at all, toast shows.~~ **Fixed 9/1** — real bug, not a live-testing limitation: `handleTestNotification` in Settings.jsx only ever called `show_notification` (the visual toast), never `play_notification_sound` — every real notification path calls both together, the test button was just never wired to the sound call. Should work once rebuilt.
  Separately, "0 minutes = no notification at all" is also real but different — traced it: `remaining > 0 && remaining <= advance` can never be true when `advance` is 0 or negative, so that specific notification's advance-warning trigger goes silently permanently inert with no error. Not fixed (a UX polish/clamping decision, not a bug fix) — just documented so it's not mysterious. [L657]

### Settings
- [x] ~~Refresh Prices has no progress counter ever.~~ **Fixed 9/1** — real bug: the progress updates were firing correctly internally, but the price-lookup loop had no async yield point, so hundreds of updates ran back-to-back in one JS tick and the browser never got a chance to paint between them — it jumped from 0 straight to done invisibly. Now yields periodically so it can actually render. [L217]
- [ x] With more than one monitor: the monitor refresh button updates the dropdown list. [L205]
- [x] ~~Unclear what this meant.~~ **Clarified 9/1**, and it's the same thing you found independently above — the small number boxes on Settings' Notification Triggers panel (e.g. "Alert before (min)" on Foundry/Arbitration, "Cooldown (min)"). Traced it: typing 0 or a negative number there doesn't error, but silently makes that notification's trigger condition impossible to satisfy — it goes permanently inert with zero feedback. Documented, not fixed (a clamping/UX decision, not a bug fix). [L743]

### About
- [no it constantly says theres an update ] The version string matches the release you're actually running. [L153]

### Collectibles
- [can not confirm as there is no menu in warframe to see ] In a series subpanel, the found/not-found state per slot matches what you've actually collected in game. **Wrong:** slots marked found that you haven't got — this would mean DE's bit order doesn't match the app's slot order, which can't be checked any other way. [L509]

### Circuit (needs an unusual worldstate)
- [ x] If the Circuit card ever shows a duplicated reward, that confirms a real parser issue (more than one schedule entry producing duplicate category groups). Only observable if DE actually sends that shape. [L117]

---

## Probably not testable

- [ ] Legendary rank icon (MR31+) — needs a legendary-rank account. Leave open unless you get there. [L357]
