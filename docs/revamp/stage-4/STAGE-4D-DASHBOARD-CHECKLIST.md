# Stage 4D — Dashboard: checklist before fixing anything

Per explicit instruction ("wait, lets not fix anything yet — we need to give me a list of things to check, then we can tackle it"): this is that list. Nothing on Dashboard has been changed yet except a state-declaration add/revert that left the file exactly as it started (net zero change). Do not implement any of the below without reviewing this list first.

Source: user's QA report on the native Preview build, cross-referenced against `src/screens/Dashboard.jsx`.

## 1. Nightwave card — layout breaks in the narrow "Live activities" column

**Root cause (confirmed by reading `renderNightwave()`, line 601):** the function was written assuming full page width — a hardcoded `w-1/4` status panel (line 649), a horizontal reward carousel with `w-36` (144px) tiles, and a `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` challenges grid. A comment at line 2116 even says "Nightwave - Spans Full Width." Stage 4A's redesign puts this card into a much narrower ~330px "Live activities" column (`.preview-dashboard__live-card { max-height: 270px; overflow: auto; }`), so all of that width-dependent layout collides/overflows.

**Proposed fix** (not yet implemented, needs sign-off): match the existing pattern already used for Baro/Descendia elsewhere in this file — a compact summary row in the narrow card (rank, standing, time remaining) plus a "View details" action that opens a full `Modal` with the existing full-width layout untouched inside it. This reuses `showBaroModal`/`showDescendiaModal`/`Modal` conventions already in the file rather than inventing a new pattern.

**Question for you**: does a modal feel right for this, or would you rather the Nightwave card just render a simplified compact-only view permanently (no modal, less info visible) inside the Live Activities column? The modal preserves all existing info; the compact-only version is simpler but loses the reward-tier browsing at a glance.

## 2. "All activities" card scaling issues

Not yet root-caused — need your screenshot/description again (or point me to it) to know exactly which card this refers to and what "scaling" means here (text size? card height? something clipping?).

## 3. Live Activities column width inconsistency

Not yet root-caused — need to see it running to know whether this is the column itself changing width between renders, or individual cards inside it disagreeing on width. Will check `.preview-dashboard__live-card` and its siblings once I can compare against a screenshot.

## Explicitly NOT a Dashboard item

**"Foundry showing wrong/unbuildable item"** — this is the standalone Foundry screen (`src/screens/Foundry.jsx`), not a Dashboard card. Per the one-page-at-a-time rule, this belongs to its own future pass, not bundled into Dashboard.

## Already checked, confirmed fine (no fix needed)

- `renderBaro()` (line 1282) — simple, narrow-friendly layout, confirmed visually by you already.
- The inline `"fiss"` (Void Fissures) card (line 1898) — simple, narrow-friendly layout, confirmed visually by you already.

## Next step

Waiting on your read of this list before touching any Dashboard code — specifically the modal-vs-compact-only question in item 1, and more detail/a fresh look at items 2 and 3.
