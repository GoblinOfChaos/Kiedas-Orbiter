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
- [ ] Open each of the four map tabs in turn. Each shows its own correct map image. **Wrong:** a tab shows another tab's map, or a blank/placeholder box. [L334]
- [ ] Zoom in and out on a map. The zoom percentage badge updates as you zoom. **Wrong:** it sticks at one number or lags a step behind. [L351]
- [ ] Zoom all the way in, then drag the map as far as it will go in each direction. **Wrong:** the map slides completely out of view, or you can pan into empty space with no way back. [L350]
- [ ] Toggle raw/labeled terrain, then switch to a different map tab. The toggle stays where you set it. **Wrong:** it silently resets to labeled when you change tabs. [L335 — verified in code, just confirming]

### Mastery
- [ ] Look at the MR rank icon. It renders as a real icon. **Wrong:** blank space or a broken-image box. [L356]
- [ ] Look at the mastery progress bar. The percentage label, the bar's fill width, and the numbers agree. **Wrong:** bar reads 90% while the label says 40%, or a nearly-full bar labelled 2%. [L367]

### Relics
- [ ] Look at the relic list. Every era icon (Lith/Meso/Neo/Axi) and the Ducat/Platinum icons render. **Wrong:** any missing icon or broken-image box. [L398]

### Mod cards
- [ ] Open several mods of different types — a normal mod, an Arcane, a Requiem, an Archon, a Galvanized. On each, the category text sits where it should. **Wrong:** category text overlapping the mod name, running off the card, or clipped by the frame. [L734]

### Dashboard
- [ ] Look at The Circuit card's reward icons. Each icon matches its reward's name. **Wrong:** a reward showing a visually different item's icon — this one is a real risk, since the image lookup falls back to a partial name match. [L116]

### Anywhere with stat tiles
- [ ] Glance at the stat cards (Dashboard, Inventory headers). Numbers and labels read as written. **Wrong:** a truncated number, a missing unit, or a mangled label. [L805]

### Language (only if you use a non-English UI)
- [ ] Switch the UI language to a non-Latin one (Japanese, Korean, Chinese, Russian, Thai). Small labels stay readable. **Wrong:** characters clipped top or bottom at the smallest text sizes. [L709]
- [ ] While you're there: switching language should never hang. **Wrong:** the loading overlay stays up forever and needs a force-quit. *(Fixed today — this is confirming the fix.)* [L708]

---

## Part 2 — While you play (opportunistic)

These need your real account and collection, so they're best noticed in normal
use rather than hunted down.

### Inventory
- [ ] The owned/mastered filter toggles actually narrow the list correctly against your real collection. **Wrong:** an item you own showing under "missing", or vice versa. [L288]
- [ ] A fully-crafted set you own shows as owned even when its part quantities read 0. **Wrong:** a completed set showing as incomplete because the parts were consumed. [L296]
- [ ] Prime sets correctly find their parent equipment. **Wrong:** a prime set that doesn't link to its weapon/frame, or links to the wrong one. [L297]
- [ ] Sort by rank with a mixed-rank collection. Unranked items sort predictably rather than scattering. [L308]
- [ ] Credits / Platinum / Endo match what the game shows. **Wrong:** off by a factor of 1000, or the wrong currency. [L328]

### Mastery
- [ ] Mastered/total counts match your real in-game mastery numbers. **Wrong:** any mismatch against the in-game profile. [L363]

### Relics
- [ ] Void Traces count and max match in-game. [L396]
- [ ] Your owned relics match up to the right catalog entries. **Wrong:** an owned relic not showing as owned, or matching the wrong relic. [L383]

### Dashboard / Checklist
- [ ] Sortie, Steel Path Incursions, Archon Hunt and Nightwave countdowns match the real in-game timers. **Wrong:** a countdown frozen, wildly off, or showing a default instead of the real expiry. [L253]
- [ ] Duviri cycle countdown matches the real cycle. [L352]
- [ ] Prime Resurgence rotation end date matches the real rotation. [L168]

### Cosmetics
- [ ] Open the acquisition drawer on a few different cosmetic types (a skin, a sigil, a glyph, a decoration, an emote). Each shows acquisition info that's actually right for that item. **Wrong:** text describing a different item, or a generic fallback where a real route exists. [L499]

### Wiki
- [ ] Open wiki links for a few items, especially ones with common or ambiguous names. Each lands on the right page. **Wrong:** a disambiguation page, or a different item's page entirely. [L545, L546]

### Maps (marker editing)
- [ ] Add markers on one map, restart the app, and confirm they're still there and on the right map. **Wrong:** markers lost, or bleeding onto a different map. [L337]
- [ ] Edit a marker's label/colour/icon/notes. The change lands on the marker you edited. **Wrong:** it edits a different marker. [L339]
- [ ] Right-click a map to "Add marker here" with several marker configs enabled. It picks a sensible config. [L345]

---

## Part 3 — Confirm once, then done

### Relic overlay (during a real fissure run)
- [ ] Your own reward appears in the slot the overlay treats as yours. **Wrong:** the overlay highlights a squadmate's reward as yours. This is the assumption that slot 1 is always the local player — worth watching across solo, 2-player, and full-squad runs. [L592]
- [ ] Rewards from one round never appear in the next round's slots. *(A race causing exactly this was fixed today — this is confirming it.)* [L584]
- [ ] With relics from several eras, the picker shows per-era rows; with a known single era, it shows a flat top-5. **Wrong:** the wrong layout for the situation. [L572]

### Overlays
- [ ] Every overlay screen renders rather than sitting on a spinner. **Wrong:** a permanent loading spinner — there's no error boundary there, so a failed import would hang silently. [L639]
- [ ] The hide-on-focus-loss toggle and hotkey actually hide/show the sidebar in game. [L640]
- [ ] Notification sound fires in sync with the toast appearing. **Wrong:** sound noticeably early, late, or missing. [L657]

### Settings
- [ ] Hit "Refresh Prices" and watch the progress counter climb and then clear. **Wrong:** counter stuck, or lingering after completion. [L217]
- [ ] With more than one monitor: the monitor refresh button updates the dropdown list. [L205]
- [ ] Notification threshold inputs behave sensibly at 0 and at negative values. [L743]

### About
- [ ] The version string matches the release you're actually running. [L153]

### Collectibles
- [ ] In a series subpanel, the found/not-found state per slot matches what you've actually collected in game. **Wrong:** slots marked found that you haven't got — this would mean DE's bit order doesn't match the app's slot order, which can't be checked any other way. [L509]

### Circuit (needs an unusual worldstate)
- [ ] If the Circuit card ever shows a duplicated reward, that confirms a real parser issue (more than one schedule entry producing duplicate category groups). Only observable if DE actually sends that shape. [L117]

---

## Probably not testable

- [ ] Legendary rank icon (MR31+) — needs a legendary-rank account. Leave open unless you get there. [L357]
