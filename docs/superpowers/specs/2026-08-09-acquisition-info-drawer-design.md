# Design: Universal item-acquisition drawer

## Decision

Replace the per-card info-icon tooltip shipped for #80 (Mods/Rivens only, sparse/hardcoded-JSON-backed) with a universal click-to-open bottom drawer showing "how do I get this," available on every item card across every tab: Mods, Rivens, Equipment/weapons, Warframes, Inventory, Arcanes — anywhere an item card is rendered, owned or not, since the user may want acquisition info for plat-farming or collection purposes regardless of ownership status.

This explicitly supersedes (not extends) the #80 tooltip work — commit `ce6ed8c`'s per-card info icon and header-level Rivens tooltip should be removed as part of implementing this, not left running alongside the new drawer.

## Interaction model

- **Trigger:** click anywhere on an item card. No card currently has an `onClick` handler (confirmed for `ModCard`/`RivenCard`; verify for Equipment/Warframe/Inventory card components during implementation), so the whole card is available as the click target — no dedicated icon needed.
- **Toggle:** clicking the currently-open card's card again closes the drawer.
- **Swap:** clicking a *different* card while the drawer is already open swaps its content to the newly-clicked item, staying open — does not require closing first.
- **Position:** a bottom drawer, full width of the content area, sliding up below the grid. Not a modal — the grid stays visible and interactive above it (user rejected fixed-edge-dock and floating-near-card positioning during visual brainstorming, in favor of this).

## Content

For each item, the drawer shows a **full ranked list** of every known acquisition source (not just the single best one) — e.g. for a drop-table item: each relic/enemy/node/bounty source with its drop chance, sorted by likelihood. This is a deliberate change from the #80 tooltip, which often showed a bare "Drop Sources" header with nothing under it — the complaint that drove this redesign.

**Fallback (nothing known):** the drawer still opens — never a dead end — and shows a Warframe Wiki *search* link (not a direct deep link, since search doesn't break when an item's name doesn't map cleanly to a wiki URL slug; direct links were considered and rejected for exactly this maintenance reason).

## Data sourcing strategy

The current #80 implementation is backed entirely by a one-time port of wfinfo-ng's hand-curated `component_acquisition_overrides.json`/`mod_acquisition_overrides.json` (997 combined entries) — this is why many items show up with no real data. Per user direction ("realistically there are guides online... there shouldn't be any lack of acquisitions"), this redesign prioritizes structured data over hand-curation:

1. **Primary:** structured data already available or obtainable — `dropIndex` (existing, WFCD-drop-data-backed) extended to cover more item categories than it currently does (confirm current coverage gaps during implementation — Rivens were confirmed to have zero coverage during #80's work and will need their own investigation, likely still ending up as a general-sources explanation rather than per-weapon data, since rivens genuinely aren't weapon-specific drops).
2. **Secondary/fallback:** the existing curated override JSON, kept for genuine non-drop-table items (vendor purchases, clan research, quest rewards) where no drop-table entry could ever exist.
3. **Last resort:** the wiki search link fallback described above, for anything neither source covers.

This spec does not fully resolve exactly how much broader the structured-data layer becomes (e.g. whether the Warframe Wiki Cargo API lead from the #84 Collectibles research pans out for acquisition text specifically, or whether DE's own export data has richer source manifests than currently parsed) — that investigation is implementation-plan work, not a design decision to pre-solve here. The design commitment is the *priority order* (structured first, curated second, wiki-search last), not the exact extent of new structured-data coverage, which may need its own follow-up plan if it turns out to be substantial.

## Scope boundaries

- This spec covers the drawer UI, interaction model, and data-source priority order. It does not cover redesigning `dropIndex`/`dropsParser.js`'s internals in detail — that's implementation-plan-level work, scoped once the actual coverage gaps are inventoried per-tab.
- Not in scope: adding a "missing items" filter/view to tabs that don't have one today (Mods, Rivens still only show owned items) — this spec is about acquisition info for items already visible, not about surfacing unowned items in the first place.
