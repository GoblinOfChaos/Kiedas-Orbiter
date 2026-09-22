# Task for Gemini: investigate the 192 "no Link field" Cosmetics entries

## Context

We're rebuilding the app's cosmetic item acquisition/description data from
scratch, sourced from the Warframe wiki's own structured Lua data
(`Module:Cosmetics/data` and its ~36 submodules, merged into one table of
4,728 items). The rule: **never guess** — an item's acquisition/description
only gets written if it traces to an exact, unambiguous source. Anything
that can't be resolved this way is left blank and reviewed by a human, not
filled in with a best guess.

Most items resolve via one of: (a) the item's own dedicated wiki article
page (`Link` field points to it), (b) Baro Ki'Teer or Vendor/Syndicate
structured data, or (c) built-in TennoGen pricing fields. This task covers
the 192 items that have **none of those** - no `Link` field at all, so
there's no obvious page to check.

Full list with their raw data:
`docs/revamp/wiki-audit/cosmetics_no_link_field.json`

## What we already know

This 192 splits into two different shapes - **do not treat them the same**:

### Group A: has `Description`/`Image`/`Name` but no `Link`/`Type`/`InternalName`
Example:
```json
{
  "name": "10 Year Anniversary Community Sigil",
  "Description": "A sigil celebrating 10 years of Warframe, created by kedemel.",
  "Image": "10YearAnniversaryCommunitySigil(SxWhite).png",
  "Name": "10 Year Anniversary Community Sigil"
}
```
These look like real Sigils with a genuinely incomplete wiki data entry
(missing the fields other Sigils have). The main `Sigils` wiki page
groups sigils into sections (Community Sigils, Event Sigils, etc.) - the
acquisition text for this one is probably sitting in that page's prose,
just not linked from the data module.

### Group B: has *only* a `Users` field, nothing else
Example:
```json
{ "name": "Arid Brown (Kavat)", "Users": [["Kavat", "Beast"]] }
```
```json
{ "name": "ANCIENT", "Users": [["K-Drive", "Vehicle"]] }
```
**These may not be real standalone cosmetic items at all.** The `Users`
field looks like it comes from a cross-reference/usage-index table (which
categories use this name), not the actual item data table. Before
spending any time finding acquisition info for these, figure out:
- Is "Arid Brown (Kavat)" actually a distinct in-game item, or is it
  really just "Arid Brown" (a Kubrow/Kavat shared color, per the
  Gene-Masking Kit color-sharing pattern already documented in
  `acquisition_staging/README.md`) getting a phantom duplicate entry
  here because of how the wiki's usage-index table works?
- Is "ANCIENT" a real item name at all, or a placeholder/category label
  that leaked into the data as if it were an item?

## What to actually do

1. **Group B first**: for a sample of ~15-20 of these `Users`-only
   entries, check the wiki's real `Module:Cosmetics/userdata` page
   (https://wiki.warframe.com/w/Module:Cosmetics/userdata) and/or the
   actual rendered wiki pages for the category named in `Users` (e.g. the
   Kavat Cosmetics page) to determine: is this a real, separate item, or
   an artifact? Report which of the 192 are real vs. artifacts - don't
   guess, check the actual page.
2. **Group A**: for each real Sigil in this group, find its actual
   acquisition source by reading the main `Sigils` wiki page's raw
   wikitext directly (`https://wiki.warframe.com/index.php?title=Sigils&action=raw`),
   matching by the sigil's exact name - not by pattern-guessing based on
   the sigil's name/theme.
3. For anything you can't resolve to an exact, cited source: leave it
   blank/unresolved and list it separately. Do not fill in a plausible-
   sounding guess - that's the exact mistake ("Floof" items getting
   another item's acquisition data because the names looked similar) this
   whole rebuild exists to avoid.

## Output format requested

A JSON or markdown report with, for each of the 192 items:
- `name`
- `classification`: `"real item - resolved"` / `"real item - unresolved"` / `"artifact, not a real item"` / `"needs human judgment"`
- `acquisition` (only if resolved, with the exact source quoted/cited)
- `reasoning` (why you classified it that way)

Please don't write directly into any file under `docs/revamp/wiki-audit/`
that already exists (to avoid clobbering work in progress) - save your
output as a new file, e.g. `docs/revamp/wiki-audit/gemini_no_link_findings.json`.
