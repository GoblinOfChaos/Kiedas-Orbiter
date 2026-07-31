#!/usr/bin/env python3
"""
drop_data.py - looks up real acquisition/drop info from dropdata_cache.json
(WFCD/warframe-drop-data - official, DE-sourced, not data-mined).

Added 2026-07-21: wfcd_all_cache.json's own "drops" field is frequently
empty for real items (arcanes, mods, weapon blueprints/parts, some
sculptures) even though the game genuinely has a drop source for them -
confirmed live for "Acceltra" (blank drop info, wiki link only) and most
arcanes ("check wiki" placeholder). This is a real, separately-sourced
dataset with much better coverage for exactly those categories - measured
live: ~96% of arcanes, most weapon blueprints, ~67% of Ayatan sculptures
findable somewhere in it (Ephemera coverage is poor - ~8% - since most
ephemera come from Nightwave/events/packs rather than drop tables, not
worth using this source for that category).

The dataset is spread across many differently-shaped buckets (bounty
rewards, mission rewards, syndicate offers, enemy drop tables, etc) - see
build_index() for how each shape is normalized into one name -> sources
lookup, built once and cached in memory for the process's lifetime.
"""
import json
from pathlib import Path

DROPDATA_FILE = Path(__file__).parent / "dropdata_cache.json"

_index = None  # lazy-built, cached for the process lifetime


def _add(index, item_name, source):
    if not item_name or not source:
        return
    sources = index.setdefault(item_name, [])
    if source not in sources:
        sources.append(source)


def _walk_reward_buckets(index, data, keys, source_prefix_fn):
    """Handles the bounty/mission/key-reward shape: a list of entries each
    with some "level"/"name" field and a `rewards: {A: [...], B: [...]}`
    dict of reward-stage lists, where each reward has `itemName`."""
    for key in keys:
        for entry in data.get(key, []) or []:
            if not isinstance(entry, dict):
                continue
            prefix = source_prefix_fn(entry)
            rewards = entry.get("rewards", {})
            if not isinstance(rewards, dict):
                continue
            for stage_rewards in rewards.values():
                for r in stage_rewards or []:
                    if isinstance(r, dict):
                        _add(index, r.get("itemName", ""), prefix)


def build_index():
    global _index
    if _index is not None:
        return _index
    _index = {}
    try:
        data = json.loads(DROPDATA_FILE.read_text())
    except Exception:
        return _index

    # modLocations: {modName, enemies: [{enemyName, ...}]} - covers arcanes
    # too, since they're mods in-game.
    for entry in data.get("modLocations", []) or []:
        if not isinstance(entry, dict):
            continue
        name = entry.get("modName", "")
        for e in entry.get("enemies", []) or []:
            if isinstance(e, dict):
                _add(_index, name, e.get("enemyName", ""))

    # blueprintLocations: {itemName/blueprintName, enemies: [...]} - same
    # shape as modLocations, covers weapon blueprints/parts.
    for entry in data.get("blueprintLocations", []) or []:
        if not isinstance(entry, dict):
            continue
        name = entry.get("itemName") or entry.get("blueprintName", "")
        for e in entry.get("enemies", []) or []:
            if isinstance(e, dict):
                _add(_index, name, e.get("enemyName", ""))

    # sortieRewards: flat list of {itemName, rarity, chance} - no wrapping
    # source beyond "Sortie" itself.
    for r in data.get("sortieRewards", []) or []:
        if isinstance(r, dict):
            _add(_index, r.get("itemName", ""), "Sortie Reward")

    # Bounty/key/mission-style buckets - see _walk_reward_buckets.
    _walk_reward_buckets(
        _index, data,
        ["cetusBountyRewards"],
        lambda e: f"Cetus Bounty ({e.get('bountyLevel', '')})",
    )
    _walk_reward_buckets(
        _index, data,
        ["solarisBountyRewards"],
        lambda e: f"Orb Vallis Bounty ({e.get('bountyLevel', '')})",
    )
    _walk_reward_buckets(
        _index, data,
        ["deimosRewards"],
        lambda e: f"Cambion Drift Bounty ({e.get('bountyLevel', '')})",
    )
    _walk_reward_buckets(
        _index, data,
        ["zarimanRewards"],
        lambda e: f"Zariman Bounty ({e.get('bountyLevel', '')})",
    )
    _walk_reward_buckets(
        _index, data,
        ["entratiLabRewards"],
        lambda e: f"Entrati Lab Bounty ({e.get('bountyLevel', '')})",
    )
    _walk_reward_buckets(
        _index, data,
        ["hexRewards"],
        lambda e: f"Hex Bounty ({e.get('bountyLevel', '')})",
    )
    _walk_reward_buckets(
        _index, data,
        ["keyRewards"],
        lambda e: f"{e.get('keyName', '')}",
    )

    # syndicates: {SyndicateName: [{item, place, standing, ...}]}
    syndicates = data.get("syndicates", {})
    if isinstance(syndicates, dict):
        for syn_name, offers in syndicates.items():
            for o in offers or []:
                if isinstance(o, dict):
                    _add(_index, o.get("item", ""), f"{syn_name} Syndicate (standing {o.get('standing', '?')})")

    # resourceByAvatar / sigilByAvatar / additionalItemByAvatar:
    # {source, items: [{item, rarity, chance}]}
    for bucket in ("resourceByAvatar", "sigilByAvatar", "additionalItemByAvatar"):
        for entry in data.get(bucket, []) or []:
            if not isinstance(entry, dict):
                continue
            source = entry.get("source", "")
            for it in entry.get("items", []) or []:
                if isinstance(it, dict):
                    _add(_index, it.get("item", ""), source)

    # missionRewards: {Planet: {Node: {gameMode, rewards: {A: [...], ...}}}}
    mission_rewards = data.get("missionRewards", {})
    if isinstance(mission_rewards, dict):
        for planet, nodes in mission_rewards.items():
            if not isinstance(nodes, dict):
                continue
            for node, info in nodes.items():
                if not isinstance(info, dict):
                    continue
                mode = info.get("gameMode", "")
                prefix = f"{planet}/{node} ({mode})" if mode else f"{planet}/{node}"
                rewards = info.get("rewards", {})
                if not isinstance(rewards, dict):
                    continue
                for stage_rewards in rewards.values():
                    for r in stage_rewards or []:
                        if isinstance(r, dict):
                            _add(_index, r.get("itemName", ""), prefix)

    return _index


def find_drop_info(name: str, limit: int = 3) -> str:
    """Returns a semicolon-joined string of up to `limit` real drop
    sources for this item name, or "" if not found in the dataset."""
    if not name:
        return ""
    index = build_index()
    sources = index.get(name)
    if not sources:
        # Weapons/warframes are keyed under "<Name> Blueprint" in
        # blueprintLocations rather than the bare item name - confirmed
        # live 2026-07-21 for "Acceltra" -> "Acceltra Blueprint".
        sources = index.get(f"{name} Blueprint")
    if not sources:
        return ""
    return "; ".join(sources[:limit])


def find_component_drop_info(parent_name: str, component_name: str, limit: int = 3) -> str:
    """Same as find_drop_info, but for a weapon/warframe component
    (Barrel, Receiver, Stock, Blueprint, ...) - these are generic labels
    on their own (equipment_status.json doesn't prefix them), but the
    dataset keys them as "<Weapon> <Part> Blueprint" - confirmed live
    2026-07-21 for Enkaus -> "Enkaus Barrel Blueprint",
    "Enkaus Receiver Blueprint", etc. Falls back to a bare component-name
    lookup (e.g. shared resources) if the prefixed form isn't found."""
    if not parent_name or not component_name:
        return ""
    index = build_index()
    for candidate in (
        f"{parent_name} {component_name} Blueprint",
        f"{parent_name} {component_name}",
    ):
        sources = index.get(candidate)
        if sources:
            return "; ".join(sources[:limit])
    return find_drop_info(component_name, limit)
