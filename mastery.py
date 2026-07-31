"""Shared Warframe equipment rank and affinity calculations."""

HEAVY_TYPES = {
    "Warframe", "Archwing", "Sentinel", "Necramech", "Moa", "Hound",
    "K-Drive", "Pet",
}


def rank_limit(unique_name: str, item_type: str, max_level=None) -> int:
    """Return WFCD's maximum rank, with a legacy-cache fallback."""
    try:
        explicit = int(max_level)
        if explicit > 0:
            return explicit
    except (TypeError, ValueError):
        pass
    if item_type == "Necramech":
        return 40
    if any(tag in unique_name for tag in ("Kuva", "Tenet", "Coda", "Paracesis")):
        return 40
    return 30


def affinity_base(item_type: str) -> int:
    """Return the cumulative-affinity multiplier for this equipment type."""
    return 1000 if item_type in HEAVY_TYPES else 500


def max_affinity(unique_name: str, item_type: str, max_level=None) -> int:
    limit = rank_limit(unique_name, item_type, max_level)
    return limit * limit * affinity_base(item_type)


def affinity_to_rank(xp: int, unique_name: str, item_type: str, max_level=None) -> int:
    if xp <= 0:
        return 0
    base = affinity_base(item_type)
    limit = rank_limit(unique_name, item_type, max_level)
    return min(limit, int((xp / base) ** 0.5))


def is_mastered(xp: int, unique_name: str, item_type: str, max_level=None) -> bool:
    return xp >= max_affinity(unique_name, item_type, max_level)
