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
    ("additionalcombocountchance", "CCC"),
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
                dist[i - 1][j] + 1.0,
                dist[i][j - 1] + 1.0,
                dist[i - 1][j - 1] + sub_cost,
            )
    return dist[rows - 1][cols - 1]


# A candidate phrase must be found somewhere within `key` with a bounded
# window - stat lines are short (a few words), so this searches every
# substring of `key` roughly the phrase's length rather than comparing the
# whole (potentially much longer, noise-prefixed) line against the phrase.
def _best_window_distance(key: str, phrase: str) -> float:
    if not key:
        return float(len(phrase))
    tolerance = 2
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


def fuzzy_contains(haystack: str, needle: str, max_relative_distance: float = 0.25) -> bool:
    """Return whether ``needle`` occurs in ``haystack`` with OCR-tolerant noise.

    Exact substring matching remains the fast and authoritative path.  The
    fuzzy fallback compares windows near the needle length and only accepts a
    bounded edit distance, preventing short unrelated words from matching a
    weapon name by accident.
    """
    key = "".join(ch.lower() for ch in str(haystack) if ch.isalnum())
    target = "".join(ch.lower() for ch in str(needle) if ch.isalnum())
    if not key or not target:
        return False
    if target in key:
        return True
    distance = _best_window_distance(key, target)
    return distance <= min(2.0, len(target) * max_relative_distance)


CONFIDENT_ABSOLUTE_THRESHOLD = 2.0
CONFIDENT_LENGTH_RATIO = 0.3
AMBIGUITY_MARGIN = 0.75


def match_stat_phrase(key: str) -> str | None:
    """Match a compacted OCR line against the known stat vocabulary.

    Score every phrase uniformly, then prefer the longest (most specific)
    phrase among confident candidates. This lets a noisy specific phrase
    such as ``criticali1damage`` outrank its exact generic ``damage`` suffix.
    Returns None when no candidate is confident or equally specific
    candidates are too close to distinguish safely.
    """
    if not key:
        return None

    scored = [
        (_best_window_distance(key, phrase), phrase, code)
        for phrase, code in VISIBLE_STAT_PHRASES
    ]
    # A flat distance ceiling is too forgiving for short phrases: distance
    # 2 is modest for "criticaldamage" but lets words such as "range" match
    # unrelated noise. Scale each phrase's ceiling while retaining the hard
    # absolute cap for longer phrases.
    confident = [
        candidate
        for candidate in scored
        if candidate[0]
        <= min(CONFIDENT_ABSOLUTE_THRESHOLD, len(candidate[1]) * CONFIDENT_LENGTH_RATIO)
    ]
    if not confident:
        return None

    confident.sort(key=lambda candidate: (-len(candidate[1]), candidate[0]))
    best_distance, best_phrase, best_code = confident[0]
    runner_up = next(
        (candidate for candidate in confident[1:] if candidate[2] != best_code),
        None,
    )

    if runner_up is not None and len(runner_up[1]) == len(best_phrase):
        if runner_up[0] - best_distance < AMBIGUITY_MARGIN:
            return None

    return best_code
