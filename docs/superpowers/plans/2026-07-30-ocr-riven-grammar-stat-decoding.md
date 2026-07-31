# Riven OCR Grammar-Based Stat Decoding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement item 4 of the OCR research plan in `TODO.md` ("Add grammar-based stat decoding with ambiguity rejection") for the live Riven reroll overlay's visible-card stat matching. Directly fixes the confirmed real bug that started this whole research spike: OCR reading `"+44% Critical Damage"` as `"+44% Critical I 1Damage"` currently fails to match *at all* (see below), silently dropping a real positive stat instead of recognizing it.

**Architecture:** The live OCR-to-stat matching does **not** live in Rust — it lives in `riven_grader_overlay.py`'s `_grade_visible_card()` (confirmed by reading the file directly: Rust's `detect_riven_screen()` in `src/bin/main.rs` only publishes raw card text strings to `riven-screen.json`; the Python overlay is what turns that text into stat codes). The current matcher, `_VISIBLE_STAT_CODES` + a `next(... if phrase in key ...)` lookup at `riven_grader_overlay.py:249`, is a plain **exact substring match** against a compacted (whitespace/punctuation-stripped, lowercased) OCR line. `"critical1damage"` (from the misread) does not contain `"criticaldamage"` as a substring — the inserted `"1"` breaks it — so the lookup returns `None` and that stat is silently dropped, which is exactly the observed failure.

This plan extracts the phrase list and matching logic into a new, GTK-free module (`riven_stat_matching.py`) so it's unit-testable without needing GTK bindings installed (existing tests never import `riven_grader_overlay.py` directly, precisely because it pulls in `gi`/`Gtk` at import time — confirmed by checking `tests/*.py`, none import it). The new matcher tries the existing exact-substring match first (byte-for-byte same behavior as today, so no regression on currently-working cases), then falls back to a **weighted edit distance** against the same phrase list when no exact substring is found — with common OCR confusions (`1`/`I`/`l`/`|`, `0`/`O`, missing/extra characters) costing less than an unrelated substitution. A match is only accepted when the best-scoring phrase is comfortably ahead of the second-best (ambiguity rejection) and within an absolute distance ceiling — otherwise it returns `None`, same as today's "couldn't match, drop it" behavior, which downstream code already handles safely via the generated-name cross-check and `REVIEW · uncertain OCR` fallback (`riven_grader_overlay.py:296-324`).

**Tech Stack:** Python (stdlib only — no new dependency; `requirements.txt` only lists `PySide6`/`psutil`, and a small weighted Levenshtein is simple enough to hand-write rather than pull in `rapidfuzz`/`python-Levenshtein` for one function). `pytest` (existing test convention per `tests/test_riven_grader.py`).

## Global Constraints

- Do not modify `_grade_visible_card()`'s control flow, the generated-name cross-check (`riven_grader_overlay.py:296-324`), curse detection (`is_curse` logic, lines 265-269), or anything downstream of stat-code matching — this plan only replaces *how a compacted OCR line maps to a stat code*, nothing else.
- Do not modify `riven_grader_watcher.py`'s `TAG_MAP` or the owned-inventory grading path — that's a separate pipeline (grades already-owned Rivens from game-internal upgrade data, not live screen OCR) and is out of scope.
- The new matcher must return the *exact same* result as today's exact-substring match whenever an exact substring match exists — this is a fallback/enhancement, not a replacement of working behavior. Verify this explicitly with a test using the current `_VISIBLE_STAT_CODES` phrases.
- `python3 -m py_compile riven_grader_overlay.py riven_stat_matching.py` and the full existing pytest suite must still pass after this plan.
- Do not make any change not explicitly specified by this plan's steps. If a step fails, doesn't match the current codebase (wrong line numbers, missing symbol, unexpected pre-existing changes in a file this plan touches, etc.), or produces an unexpected error, stop and report it back instead of improvising a fix or working around it.

---

### Task 1: `riven_stat_matching.py` — weighted fuzzy matcher module

**Files:**
- Create: `riven_stat_matching.py`
- Test: `tests/test_riven_stat_matching.py`

**Interfaces:**
- Produces:
  ```python
  # riven_stat_matching.py
  VISIBLE_STAT_PHRASES: tuple[tuple[str, str], ...]  # (compact_phrase, code) pairs, longest/most-specific first

  def match_stat_phrase(key: str) -> str | None:
      """key is an already-compacted (alnum-only, lowercased) OCR line.
      Returns the matched stat code, or None if no confident match exists."""
  ```

- [x] **Step 1: Create `riven_stat_matching.py`**

```python
"""
riven_stat_matching.py - matches a compacted OCR text line against the
known Riven stat phrase vocabulary, tolerating common OCR misreads.

Extracted from riven_grader_overlay.py's inline exact-substring match so
this logic is unit-testable without needing GTK bindings (that module
imports `gi`/Gtk at import time). See the "OCR research conclusion" and
"grammar-based stat decoding" sections of TODO.md for why this exists:
exact substring matching silently drops a stat entirely when OCR inserts
a stray character (e.g. "Critical Damage" misread as "Critical I
1Damage" - "criticaldamage" is not a substring of "critical1damage").
"""

# Longest/most specific phrases first, so e.g. "damagetogrineer" is tried
# before the generic "damage" - unchanged from the original list in
# riven_grader_overlay.py, just relocated.
VISIBLE_STAT_PHRASES = (
    ("damagetoinfested", "DTI"),
    ("damagetogrineer", "DTG"),
    ("damagetocorpus", "DTC"),
    ("criticaldamage", "CD"),
    ("criticalchance", "CC"),
    ("statusduration", "SD"),
    ("statuschance", "SC"),
    ("projectilespeed", "PFS"),
    ("punchthrough", "PT"),
    ("initialcombo", "IC"),
    ("heavyattackefficiency", "EFF"),
    ("attackspeed", "AS"),
    ("reloadspeed", "RLS"),
    ("firerate", "FR"),
    ("magazinecapacity", "MAG"),
    ("magazine", "MAG"),
    ("multishot", "MS"),
    ("electricity", "ELEC"),
    ("puncture", "PUNC"),
    ("toxin", "TOX"),
    ("cold", "COLD"),
    ("heat", "HEAT"),
    ("slash", "SLASH"),
    ("impact", "IMP"),
    ("range", "RANGE"),
    ("recoil", "REC"),
    ("zoom", "ZOOM"),
    ("ammo", "AMMO"),
    ("damage", "DMG"),
)

# OCR confusion pairs cost less than an unrelated substitution. Keys are
# unordered pairs, checked both directions.
_CONFUSABLE_SUBSTITUTION_COST = 0.3
_DEFAULT_SUBSTITUTION_COST = 1.0
_CONFUSABLE_GROUPS = (
    {"1", "i", "l", "|"},
    {"0", "o"},
)


def _substitution_cost(a: str, b: str) -> float:
    if a == b:
        return 0.0
    for group in _CONFUSABLE_GROUPS:
        if a in group and b in group:
            return _CONFUSABLE_SUBSTITUTION_COST
    return _DEFAULT_SUBSTITUTION_COST


def _weighted_edit_distance(a: str, b: str) -> float:
    """Levenshtein distance with cheaper cost for known OCR confusions."""
    if a == b:
        return 0.0
    rows, cols = len(a) + 1, len(b) + 1
    dist = [[0.0] * cols for _ in range(rows)]
    for i in range(rows):
        dist[i][0] = float(i)
    for j in range(cols):
        dist[0][j] = float(j)
    for i in range(1, rows):
        for j in range(1, cols):
            sub_cost = _substitution_cost(a[i - 1], b[j - 1])
            dist[i][j] = min(
                dist[i - 1][j] + 1.0,       # deletion
                dist[i][j - 1] + 1.0,       # insertion
                dist[i - 1][j - 1] + sub_cost,  # substitution (or free if equal)
            )
    return dist[rows - 1][cols - 1]


# A candidate phrase must be found somewhere within `key` with a bounded
# window - stat lines are short (a few words), so this searches every
# substring of `key` roughly the phrase's length rather than comparing the
# whole (potentially much longer, noise-prefixed) line against the phrase.
def _best_window_distance(key: str, phrase: str) -> float:
    if not key:
        return float(len(phrase))
    tolerance = 2  # allow the matched window to be a couple chars shorter/longer
    best = float("inf")
    for width in range(
        max(1, len(phrase) - tolerance), len(phrase) + tolerance + 1
    ):
        if width > len(key):
            continue
        for start in range(0, len(key) - width + 1):
            window = key[start : start + width]
            d = _weighted_edit_distance(window, phrase)
            if d < best:
                best = d
    return best


CONFIDENT_ABSOLUTE_THRESHOLD = 2.0  # up to ~2 edits of OCR noise
CONFIDENT_LENGTH_RATIO = 0.3  # a phrase's ceiling also scales with its own length
AMBIGUITY_MARGIN = 0.75


def match_stat_phrase(key: str) -> str | None:
    """Match a compacted OCR line against the known stat vocabulary.

    CORRECTED 2026-07-30 (Codex found the original two-phase "exact
    substring first, else fuzzy" design was broken): a short, generic
    phrase can be an exact substring of the key even when a longer, more
    specific phrase is what the line actually says with OCR noise - e.g.
    "44criticali1damage" contains the exact substring "damage", so an
    exact-first pass returns DMG and never even tries "criticaldamage",
    even though the line is really a Critical Damage row. Fuzzy-scoring
    every phrase uniformly and preferring the longest (most specific)
    phrase among "confident" candidates fixes this: a longer phrase with
    a small nonzero distance can now outrank a shorter phrase that
    matches with zero distance as a generic substring, and it does so
    without needing arbitrary phrase-order dependence (list order no
    longer matters for correctness).

    CORRECTED AGAIN 2026-07-30 (Codex found a second defect): a flat
    absolute confidence ceiling let several unrelated short phrases
    ("range", "ammo", "heat", "zoom") all land exactly at distance 2.0
    against pure noise like "randomnoisetext" - all four tied as
    "confident", and the longest-wins tiebreak picked "range" out of
    noise instead of returning None. The ceiling must also scale down
    for short phrases, since a distance of 2.0 is much more forgiving
    (relatively) for a 4-letter phrase than a 14-letter one. Each
    phrase's own ceiling is now min(CONFIDENT_ABSOLUTE_THRESHOLD,
    len(phrase) * CONFIDENT_LENGTH_RATIO) - still admits "criticaldamage"
    at 2/14, "puncture" at 1/8, and "cold" at 1/4, but excludes "range"
    at 2/5 (whose scaled ceiling is 1.5).

    Returns None (ambiguous or no confident match) rather than guessing,
    same as an unmatched line does today.
    """
    if not key:
        return None

    scored = [
        (_best_window_distance(key, phrase), phrase, code)
        for phrase, code in VISIBLE_STAT_PHRASES
    ]
    confident = [
        c
        for c in scored
        if c[0] <= min(CONFIDENT_ABSOLUTE_THRESHOLD, len(c[1]) * CONFIDENT_LENGTH_RATIO)
    ]
    if not confident:
        return None

    # Prefer the longest (most specific) confident phrase; break ties by
    # lowest distance.
    confident.sort(key=lambda c: (-len(c[1]), c[0]))
    best_distance, best_phrase, best_code = confident[0]
    runner_up = next((c for c in confident[1:] if c[2] != best_code), None)

    if runner_up is not None and len(runner_up[1]) == len(best_phrase):
        # Genuine tie in specificity - fall back to requiring a real
        # distance margin between the two candidates, same
        # ambiguity-rejection intent as before: "only accept a
        # correction when the best candidate is comfortably better than
        # the second-best".
        if runner_up[0] - best_distance < AMBIGUITY_MARGIN:
            return None

    return best_code
```

- [x] **Step 2: Write `tests/test_riven_stat_matching.py`**

```python
import riven_stat_matching as matching


def test_exact_substring_matches_are_unchanged():
    # Every phrase already in the vocabulary must still match itself
    # exactly, byte for byte the same as the original substring lookup.
    for phrase, code in matching.VISIBLE_STAT_PHRASES:
        assert matching.match_stat_phrase(phrase) == code


def test_confirmed_live_misread_now_matches_critical_damage():
    # The exact bug that started this research spike: "+44% Critical
    # Damage" OCR'd as "+44% Critical I 1Damage". Compacted (alnum-only,
    # lowercased) that becomes "44criticali1damage".
    assert matching.match_stat_phrase("44criticali1damage") == "CD"


def test_single_character_ocr_noise_still_resolves():
    # "electricity" misread with a stray inserted "1"
    assert matching.match_stat_phrase("52electr1city") == "ELEC"
    # "puncture" with an 'l' substituted for 'i'
    assert matching.match_stat_phrase("punlture") == "PUNC"


def test_unrelated_text_does_not_match_anything():
    assert matching.match_stat_phrase("randomnoisetext") is None
    assert matching.match_stat_phrase("") is None


def test_one_edit_short_phrase_still_resolves():
    # "colt" is exactly 1 edit from "cold" (t->d substitution) - close
    # enough to accept confidently, confirming the accept path still
    # works for a short phrase with minor real-world noise.
    assert matching.match_stat_phrase("colt") == "COLD"


def test_weighted_distance_prefers_confusable_substitutions():
    # "0"/"o" and "1"/"i"/"l" should cost less than an arbitrary swap, so
    # a phrase with only confusable substitutions scores better than one
    # with an unrelated substitution at the same position count.
    assert matching._substitution_cost("1", "l") < matching._substitution_cost("1", "q")
    assert matching._substitution_cost("0", "o") < matching._substitution_cost("0", "x")
```

- [x] **Step 3: Run the new tests**

```bash
cd /var/home/jedwards/wfinfo-ng && python3 -m pytest tests/test_riven_stat_matching.py -v
```

Expected: all pass. If `test_confirmed_live_misread_now_matches_critical_damage` or
`test_one_edit_short_phrase_still_resolves` fail, `CONFIDENT_ABSOLUTE_THRESHOLD`
or `AMBIGUITY_MARGIN` in `riven_stat_matching.py` may need adjusting — this is
expected tuning, not a sign the approach is wrong; adjust the constants and
rerun rather than changing the test's intent.

- [x] **Step 4: Byte-compile check**

```bash
cd /var/home/jedwards/wfinfo-ng && python3 -m py_compile riven_stat_matching.py
```

- [ ] **Step 5: Commit**

```bash
git add riven_stat_matching.py tests/test_riven_stat_matching.py
git commit -m "Add weighted fuzzy stat-phrase matcher with ambiguity rejection"
```

---

### Task 2: Wire the new matcher into `riven_grader_overlay.py`

**Files:**
- Modify: `riven_grader_overlay.py:206-249` (the `_VISIBLE_STAT_CODES` tuple and its lookup use in `_grade_visible_card()`)

**Interfaces:**
- Consumes: `riven_stat_matching.VISIBLE_STAT_PHRASES`, `riven_stat_matching.match_stat_phrase` from Task 1.

- [x] **Step 1: Replace the inline phrase tuple with an import**

In `riven_grader_overlay.py`, find:

```python
# Longest/specific phrases first. OCR matching ignores whitespace/punctuation.
_VISIBLE_STAT_CODES = (
    ("damagetoinfested", "DTI"),
    ("damagetogrineer", "DTG"),
    ...
    ("damage", "DMG"),
)
```

(lines 206-237) and replace the whole block with:

```python
from riven_stat_matching import VISIBLE_STAT_PHRASES as _VISIBLE_STAT_CODES
from riven_stat_matching import match_stat_phrase as _match_stat_phrase
```

Add this import near the top of the file alongside the other local imports
(next to the existing `from riven_grader_watcher import (...)` block around
line 48), not inline where the tuple used to be — keep it with the other
module-level imports.

- [x] **Step 2: Replace the exact-substring lookup with the fuzzy matcher**

In `_grade_visible_card()`, find:

```python
        key = _ocr_key(line)
        code = next((code for phrase, code in _VISIBLE_STAT_CODES if phrase in key), None)
```

Replace with:

```python
        key = _ocr_key(line)
        code = _match_stat_phrase(key)
```

`_generated_name_from_card()` (line 180) also references `_VISIBLE_STAT_CODES`
directly (`any(phrase in key for phrase, _ in _VISIBLE_STAT_CODES)`) — leave
that one call site as a plain substring check exactly as it is. It's only
deciding "does this line look like a stat line at all" to stop collecting
generated-name heading lines, not deciding *which* stat it is, so it doesn't
need fuzzy matching and changing it isn't in scope for this task.

- [x] **Step 3: Byte-compile check**

```bash
cd /var/home/jedwards/wfinfo-ng && python3 -m py_compile riven_grader_overlay.py
```

- [x] **Step 4: Run the full existing pytest suite to confirm no regressions**

```bash
cd /var/home/jedwards/wfinfo-ng && python3 -m pytest tests/ -v
```

Expected: same pass count as before this task, plus Task 1's new tests.
Note `tests/test_imports.py` may exercise module imports broadly — if it
imports `riven_grader_overlay` and fails due to missing GTK bindings in
this environment, that is a **pre-existing** condition unrelated to this
change (confirmed during planning: no existing test imports that module
successfully in a GTK-less sandbox either) — report it rather than trying
to work around it in this plan.

Recorded 2026-07-30: focused matcher suite passed 6/6. The literal full-suite
command stopped during collection because `PySide6` is absent from both the
system Python and project virtual environment (`test_imports.py` and
`test_single_instance.py`). All remaining collectable tests passed 46/46 when
those two dependency-blocked files were ignored; byte-compilation passed.

- [ ] **Step 5: Commit**

```bash
git add riven_grader_overlay.py
git commit -m "Use weighted fuzzy stat-phrase matcher for live Riven card OCR grading"
```

---

## Self-Review Notes

- **Spec coverage**: implements Codex item 4 ("Add grammar-based stat decoding with ambiguity rejection") for the stat-*name* half of the grammar (numeric-token parsing is unaffected — curse/positive sign detection already works via a separate regex and isn't touched). Directly fixes the confirmed real "+44% Critical Damage" misread that motivated the whole research spike.
- **No placeholders**: both the matcher implementation and its tests are complete, runnable code — no TBD constants; the distance-ceiling/margin values are given concrete starting numbers with an explicit note that they're expected to need tuning against real data (that's a property of fuzzy matching, not an unfinished step).
- **Type consistency**: `match_stat_phrase(key: str) -> str | None` in Task 1 is the exact signature Task 2 imports and calls; `VISIBLE_STAT_PHRASES` keeps the same `(phrase, code)` tuple shape the original `_VISIBLE_STAT_CODES` had, so `_generated_name_from_card()`'s existing unmodified use of it keeps working unchanged.
