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

Confirmed via research (2026-08-09) before committing to this layering:

1. **Primary: WFCD's `warframe-items`.** Each item object already embeds a `drops: Drop[]` field (`{location, type, rarity, chance, rotation, uniqueName}`) — enemy drops, mission/node drops, and relic drops are already joined onto the item, no manual cross-referencing by name needed. MIT licensed, actively maintained, official-DE-sourced (parsed from `warframe.com/droptables`). This is a materially richer source than the current `dropIndex`/`dropsParser.js`, which only surfaces relic-table drops today.
2. **Secondary: `warframe-drop-data` directly**, for the tables not fully surfaced on the item object itself — specifically `syndicateVendors` (reputation-purchase costs) and any enemy/mission table `warframe-items` doesn't already join in. Same license/maintenance as above.
3. **Tertiary: the existing curated override JSON** (`acquisition_overrides.json`, ported from wfinfo-ng), narrowed to only what no upstream dataset covers: **quest rewards and clan/dojo research requirements**. Research confirmed no dataset anywhere (WFCD or otherwise) models these in queryable form — but this list is small and static (a few dozen entries, not hundreds), so hand-curating it is reasonable rather than a gap to solve differently.
4. **Last resort:** the wiki search link fallback, for the rare item that somehow isn't covered by any of the above.

Rivens remain a special case even under this richer sourcing — they aren't weapon-specific drops in any dataset (confirmed during #80's implementation), so they'll continue to use a general-sources explanation rather than per-weapon data.

Independent alternatives were checked and rejected: a third-party drop-rate dataset (Brayzure/warframe-drop-rates) is dormant with no stated license and offers nothing WFCD doesn't already have; querying the Warframe Wiki's Cargo API directly was considered but rejected since it's the same upstream data WFCD already parses (`Module:DropTables/data`) — going direct only adds CC-BY-SA licensing and Lua-parsing complexity for no additional coverage.

## Scope boundaries

- This spec covers the drawer UI, interaction model, and data-source priority order. It does not cover redesigning `dropIndex`/`dropsParser.js`'s internals in detail — that's implementation-plan-level work, scoped once the actual coverage gaps are inventoried per-tab.
- Not in scope: adding a "missing items" filter/view to tabs that don't have one today (Mods, Rivens still only show owned items) — this spec is about acquisition info for items already visible, not about surfacing unowned items in the first place.
