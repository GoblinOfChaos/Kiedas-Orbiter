# Full-catalog wiki cross-check — brief for Gemini

## Scope

**Preview app only**: `/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center`
(the Stage 4 Command Center redesign — NOT the Stable app at the repo root).
Do not touch `/var/home/jedwards/kiedas-orbiter/src` or anything outside
`.preview-work/stage4-command-center`.

Goal: for every category of item the app displays as ownable/acquirable,
verify the app's catalog matches the wiki's catalog — find items the app is
missing, items the app wrongly hides as unobtainable, and items the app
shows that shouldn't be there. This is a **detection pass, not a fix pass**:
report findings, do not edit `inventoryParser.js`/`Cosmetics.jsx`/etc. or any
data file directly. Every finding needs a human (or a follow-up session) to
individually verify and apply before it becomes a code change — see
"No pattern-guessing, no bulk fixes" below.

## Categories to check

- Warframes, Primary/Secondary/Melee weapons, Archwings, Sentinels/Companions, Necramechs
- Mods (already done — see `KNOWN-ISSUES-BACKLOG.md` item #5 as the reference methodology and result)
- Cosmetics: skins, sigils, glyphs, syandanas, armor, animation sets, ship decorations, emotes
- Arcanes
- Resources
- Relics
- Rivens
- Blueprints / Gear
- Syndicates, Nightwave rewards
- K-Drive parts
- Focus / Amps / Operator & Drifter items
- Collectibles / Lore Fragments (Cephalon Fragments, Somachord Tunes, Leverian Prex Cards, etc.) — **a different kind of check than the others above**: this category isn't about missing/wrongly-hidden items, it's about the accuracy of the acquisition *location* text for items that do exist. See `KNOWN-ISSUES-BACKLOG.md` item #10 for a confirmed example (Cephalon Fragment "Archaic Weapons" shows generic "Star Chart missions" text instead of the wiki-verified specific planet, Mercury) and the scope (54 Cephalon Fragment items, 29 distinct location strings — several are shared generic fallbacks, not per-item wiki-verified locations).

## Use the local wiki archive, not live fetches

A full mirror of wiki.warframe.com already exists locally:
`/var/home/jedwards/kiedas-orbiter/wiki_pdf_archive.sqlite` — a SQLite FTS5
database, table `pages(title, text)`, 10,792 articles, one row per wiki
page, plain-text content (built by `scripts/build_wiki_pdf_archive.py` /
`wiki_page_to_pdf.py`, collapsible sections forced open, image galleries
flattened to real text — nothing fabricated).

Query it directly, e.g.:

```python
import sqlite3
con = sqlite3.connect('/var/home/jedwards/kiedas-orbiter/wiki_pdf_archive.sqlite')
cur = con.cursor()
cur.execute("select text from pages where title = 'Mod_List of Mods'")
```

For a phrase search use FTS5 match syntax with quoted phrases
(`match '"exact phrase"'`) — bare space-separated terms behave as OR across
all of them and return near-everything, which produced junk results earlier
this session. Titles are the real wiki article titles (category pages are
typically named like `List of Mods`, `List of Warframes`, etc. — grep the
`pages` table for the right title per category before assuming one).

**Caveat: the archive was built 2026-08-26, ~13 days old as of this brief.**
It already missed 2 real mods from an Aug 12 update in the Mods audit (those
were caught by a different path — a live WFCD data fetch — not the archive).
For any category where very recent game updates matter, treat the archive as
a strong baseline but not proof of the current state; a live wiki fetch or a
rebuild of the archive may be needed to close the gap for that category.

## Methodology (same as the Mods audit — see `KNOWN-ISSUES-BACKLOG.md` item #5)

1. Pull the wiki's master list page for the category and transcribe every
   section, not a sample.
2. Compare against the app's real merged runtime data, not a raw export
   file read in isolation — a Node harness (`vite-node`) calling the app's
   actual production parsing function against real bundled/live data is
   what caught the Mods false-negative; checking `ExportUpgrades.json`
   directly on disk gave a wrong answer for over half that session.
3. **No pattern-guessing, no bulk fixes.** Every discrepancy must be
   verified individually against the wiki before being called a bug —
   inferring a fix from an item-name pattern or applying one fix to a whole
   class of items has been wrong repeatedly on this project. Report each
   finding with its own evidence (wiki quote/citation + what the app data
   shows), not a batch conclusion.
4. DE's own export data sometimes carries reliable internal signals worth
   checking before concluding something's missing vs. correctly absent —
   e.g. `alwaysAvailable`, `excludeFromCodex`, `codexSecret`, `isFrivolous`,
   `introducedAt` (a sentinel value of `9999999999` means never actually
   shipped). These are real DE fields, not guesses, and were how the Mods
   `.../Expert/`-path items were confirmed correctly hidden this session —
   but a field alone isn't sufficient proof; cross-check the wiki too.

## Output

A findings report per category (missing / wrongly-hidden / wrongly-shown,
each with wiki + app-data evidence), formatted so it can be appended to
`docs/revamp/stage-4/KNOWN-ISSUES-BACKLOG.md` in the same style as item #5.
Not a diff, not a code change — a list to review and act on individually.
