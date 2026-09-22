# Inventory preservation checklist

Status: **Stage 3B ACCEPTED — LINUX**, by explicit user decision on 2026-09-05. Evidence tiers are named per row. Synthetic fixtures validate rendering and interaction contracts, not current game, inventory or market truth.

## Visible categories

| ID | Existing specialized behavior | Result |
|---|---|---|
| all | Combined catalog excluding Rivens and Arcanes; generic cards | **PASS-UI / PASS-SOURCE** |
| warframes | Ownership, mastery, subsume and Prime filters; generic equipment cards | **PASS-UI / PASS-SOURCE** |
| weapons | Ownership, mastery, Prime, weapon-type and Incarnon filters | **PASS-UI / PASS-SOURCE** |
| companions | Ownership and mastery filters | **PASS-UI / PASS-SOURCE** |
| companion_weapons | Ownership and mastery filters | **PASS-UI / PASS-SOURCE** |
| archweapons | Ownership and mastery filters | **PASS-UI / PASS-SOURCE** |
| vehicles | Vehicles plus Necramechs; typed type filters | **PASS-UI / PASS-SOURCE** |
| amps | Ownership and mastery filters | **PASS-UI / PASS-SOURCE** |
| arcanes | Dedicated ModCard rendering; ownership, quantity and rank | **PASS-UI / PASS-SOURCE** |
| peely_pix | Export-image fallback; ownership and quantity | **PASS-UI / PASS-SOURCE** |
| consumables | Ownership and quantity | **PASS-UI / PASS-SOURCE** |
| landing_craft | Ownership and name sort | **PASS-UI / PASS-SOURCE** |
| resources | Ownership and quantity | **PASS-UI / PASS-SOURCE** |
| prime_parts | Prime-set layout, parent state, completion, parts, prices, vault status and sources | **PASS-UI / PASS-SOURCE** |
| ayatan | Stars summary, sculptures, sockets, fill estimate and quantity | **PASS-UI / PASS-SOURCE** |

All 15 category labels occur exactly once in the original order and activate at both 1200x800 and 900x500. Every configured filter state and sort direction passes the 96-check control matrix. Specialized card expressions are unchanged by exact source restoration after removing the approved Preview composition boundary. `mods` and `prime_junk` remain absent from `INVENTORY_TABS`; their source branches remain unchanged and unreachable.

## Shared controls and states

| Surface | Result | Evidence |
|---|---|---|
| Account summary | **PASS-UI** | Visible without body overflow at both sizes |
| Search | **PASS-UI** | Multi-word matching exercised |
| Owned filter | **PASS-UI** | All, Owned and Unowned tested in every configured category |
| Other triple filters | **PASS-UI** | yes, no and unset tested for mastered, subsumed, socketed, Prime and vaulted |
| Binary filters | **PASS-UI** | yes and unset tested for every configured weapon/vehicle type state and Incarnon |
| Sort | **PASS-UI** | Every category-specific criterion and both directions tested |
| Category change | **PASS-UI** | Filter clear and name/ascending reset exercised |
| Pagination | **PASS-UI** | Initial 48, automatic 60 and manual Load More 60 pass |
| Loading and absence | **PASS-UI / PASS-SOURCE** | Stable exact markup for loading/empty; Preview price loading and absent price pass |
| Acquisition | **PASS-UI / PASS-SOURCE** | Existing drawer opens and closes; handler/source expressions unchanged |
| Images | **PASS-SOURCE** | Existing fallback and bundled-path expressions unchanged |

## Specialized details and stable preservation

Prime Sets, Ayatan, Arcanes and generic card bodies are unchanged. The exact source-restoration proof covers parent Owned/Mastered badges, completion and crafted-versus-blueprint calculations, per-part quantities, blueprint overlays, vault/source tooltips, Ayatan stars and fill estimates, ModCard inputs, generic rank/mastery/subsume/quantity/Forma/Incarnon/crafting/source indicators, and image fallback logic. This is **PASS-SOURCE** preservation; synthetic component evidence does not claim those values are correct for live Warframe data.

Stable output is **PASS-UI**: populated, loading and empty root markup are byte-identical before and after the Stage 3B change. No stable action, backend, Market screen, parser, dependency, lockfile, shared UI component or global CSS changed.

## Price and dormant-sale reachability

| Source state | Result |
|---|---|
| Reachable Prime Sets + positive value | **PASS-UI** — 42p fixture renders |
| Reachable Prime Sets + loading | **PASS-UI** — loading state renders |
| Reachable Prime Sets + absent/zero value | **PASS-UI** — no `0p`, no Sell control |
| `prime_junk` generic branch | **PASS-SOURCE / PASS-UI** — absent from tabs and unreachable |
| Generic `prime_parts` sale branch | **PASS-SOURCE / PASS-UI** — bypassed by dedicated Prime Sets render |
| `handleSellOnWfm` | **PASS-SOURCE** — two dormant callers, zero reachable callers; never invoked |
| Market screen | **NOT APPLICABLE** — unchanged and outside this slice |

The dormant handler still contains the recorded implicit `1p` fallback and lacks a `tradable` check. `INVENTORY-DORMANT-SALE` remains open in the acceptance ledger and must be reviewed before any tab, active-state, render-order or sale-control change makes the path reachable.

## Packaged and provenance gates

| Gate | Result |
|---|---|
| Stable frontend | **PASS-BUILD** |
| Preview frontend | **PASS-BUILD** |
| Ubuntu release native build | **PASS-BUILD** |
| Debian native smoke | **PASS-NATIVE — 30/30** |
| AppImage native smoke | **PASS-NATIVE — 30/30** |
| Styled component browser | **PASS-UI — 177/177** |
| Complete control matrix | **PASS-UI — 96/96** |
| Original tracked baseline | **PASS-SOURCE — 850/850 unchanged** |
| Cargo.lock | **PASS-SOURCE — unchanged** |
| Cumulative patch | **PASS-SOURCE — applies cleanly** |

Windows and macOS retain their permanent BLOCKED/UNAVAILABLE entries in `../ACCEPTANCE-LEDGER.md`; they are not passed by this Linux milestone.
