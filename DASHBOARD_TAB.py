#!/usr/bin/env python3
"""Dashboard Tab — Live Warframe world state.

Polls api.warframestat.us every 60 seconds and shows:
- Void Fissures (grouped by tier, with Rad fissures highlighted)
- Sortie & Archon Hunt
- Arbitration
- Baro Ki'Teer / Void Trader
- Day/Night cycles (Cetus, Vallis, Cambion, Duviri)
- Nightwave challenges
- Steel Path incursions
"""

import json
import bisect
import html
import re
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from PySide6.QtCore import Qt, QTimer, Signal, QObject, QRect, QSize
from PySide6.QtGui import QColor, QFont
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QScrollArea,
    QFrame, QGridLayout, QLayout, QPushButton, QSizePolicy, QSizePolicy as QSP,
)
from paths import DATA_DIR, get_inventory_path
from editable_layout import EditableCanvas, edit_mode_toolbar
from theme import (
    get_palette,
    BG_DEEP as BG, BG_PANEL, BG_CARD, BG_HEADER,
    GOLD, GOLD_BRIGHT, SAP_BRIGHT as SAP, SAP_MID, SAP_DIM,
    FG, FG_DIM as DIM,
    BORDER, BORDER_BRIGHT,
    COLOR_GREAT as GREEN, COLOR_BAD as RED, COLOR_WARN as ORANGE,
)


def _sync_theme_colors():
    """Rebinds this module's GOLD/FG/DIM/SAP/GREEN/RED/ORANGE/BG* names to
    the CURRENTLY selected theme's palette. These were imported once from
    theme.py's hardcoded "Kieda's Default" constants and never changed
    again, so every card's text stayed sapphire-blue-theme colored no
    matter what theme was picked - invisible on a light theme's
    background. Since every _build_* method references these as plain
    module-level names (not theme.GOLD), Python resolves them fresh at
    call time - rebinding the names here before each rebuild is enough to
    fix every call site without touching them individually.
    Jacob 2026-07-23 ("white is illegible" on the new Daylight theme)."""
    global GOLD, GOLD_BRIGHT, SAP, FG, DIM, GREEN, RED, ORANGE
    global BG, BG_PANEL, BG_CARD, BG_HEADER, BORDER, BORDER_BRIGHT
    p = get_palette()
    GOLD, GOLD_BRIGHT = p['gold'], p['gold_bright']
    SAP = p['accent']
    FG, DIM = p['fg'], p['fg_dim']
    GREEN, RED, ORANGE = p['green'], p['red'], p['orange']
    BG, BG_PANEL, BG_CARD, BG_HEADER = p['bg'], p['bg_panel'], p['bg_card'], p['bg_header']
    BORDER, BORDER_BRIGHT = p['border'], p['border_bright']

API_URL = "https://api.warframestat.us/pc?language=en"
REFRESH_INTERVAL_MS = 60_000   # 1 minute
CACHE_FILE = DATA_DIR / "worldstate_cache.json"

# Arbitration isn't part of the game's own worldstate feed at all - DE never
# publishes it, so api.warframestat.us computes it internally, and that
# computation has been broken (always returns the SolNode000/"Unknown"
# placeholder). Cephalon Kronos sidesteps this entirely with a precomputed
# hour-by-hour schedule (same approach DE's own algorithm produces, just
# baked in advance) instead of depending on a live feed for it. We bundle a
# copy of that same schedule + a small node-name lookup built from public DE
# export data, and calculate the current Arbitration ourselves.
# Jacob 2026-07-27 ("alecaframe doesnt have it as not working right now").
ARBITRATION_SCHEDULE_FILE = Path(__file__).parent / "arbitration_schedule.txt"
ARBITRATION_NODES_FILE = Path(__file__).parent / "arbitration_nodes.json"
_ARBITRATION_SCHEDULE_CACHE = None  # list[(timestamp:int, node_code:str)], sorted
_ARBITRATION_NODES_CACHE = None     # dict[node_code] -> {name, planet, mission, faction}


def _load_arbitration_schedule():
    global _ARBITRATION_SCHEDULE_CACHE
    if _ARBITRATION_SCHEDULE_CACHE is None:
        rows = []
        with open(ARBITRATION_SCHEDULE_FILE, "r") as f:
            for line in f:
                ts, node = line.strip().split(",", 1)
                rows.append((int(ts), node))
        _ARBITRATION_SCHEDULE_CACHE = rows
    return _ARBITRATION_SCHEDULE_CACHE


def _load_arbitration_nodes():
    global _ARBITRATION_NODES_CACHE
    if _ARBITRATION_NODES_CACHE is None:
        _ARBITRATION_NODES_CACHE = json.loads(ARBITRATION_NODES_FILE.read_text())
    return _ARBITRATION_NODES_CACHE


def _compute_local_arbitration():
    """Look up the current Arbitration node from the bundled schedule
    (one entry per hour) instead of trusting the broken live API field."""
    try:
        schedule = _load_arbitration_schedule()
        nodes = _load_arbitration_nodes()
        now = int(time.time())
        aligned = now - (now % 3600)
        # Schedule is sorted by timestamp; find the entry for this hour.
        idx = bisect.bisect_right(schedule, (aligned, "￿")) - 1
        if idx < 0 or idx >= len(schedule):
            return None
        ts, node_code = schedule[idx]
        if ts != aligned:
            return None
        info = nodes.get(node_code)
        if not info:
            return None
        return {
            "node": f"{info['name']} ({info['planet']})",
            "type": info["mission"],
            "enemy": info["faction"],
            "expiry": datetime.fromtimestamp(ts + 3600, tz=timezone.utc).isoformat(),
            "archwing": False,
            "sharkwing": False,
        }
    except Exception:
        return None

# api.warframestat.us doesn't expose Descendia (the Tau/Zariman roguelite
# mode) yet, so it needs its own fetch from the raw worldstate mirror that
# Cephalon Kronos also relies on for this same data.
DESCENDIA_API_URL = "https://oracle.browse.wf/worldState.json"
DESCENDIA_CACHE_FILE = DATA_DIR / "descendia_cache.json"

# Fallback display names for Descendia stage types/modifiers when the raw
# worldstate only gives internal codenames. Verified against Cephalon
# Kronos's DESCENDIA_MISSION_TYPES/DESCENDIA_PENANCES tables.
DESCENDIA_MISSION_TYPES = {
    "DT_BREAK_TARGETS": "Destroy Hologlobes",
    "DT_LOOT_CREATURES": "Gruzzling Plunder",
    "DT_ALCHEMY": "Alchemy",
    "DT_INTERCEPTION": "Mobile Interception",
    "DT_INFESTED_SALVAGE": "Infested Salvage",
    "DT_SABOTAGE_HIVE": "Hive",
    "DT_PROTOFRAME": "Protoframe Room",
    "DT_CAPTURE": "Capture",
    "DT_MIMICS": "Plunder Roulette",
    "DT_COLLECTION": "Void Flood",
    "DT_BOSS": "Assassination",
    "DT_EXTERMINATE": "Exterminate",
    "DT_NETRACELLS": "Targeted Elimination",
    "DT_SABOTAGE_DEFENSE": "Defense",
    "DT_DEFENSE": "Defense of a Protoframe",
    "DT_EXCAVATION": "Excavation",
    "DT_PRESURE_GAUGE": "Volatile",
    "DT_UNIQUE": "Unique",
    "DT_LOOT": "Loot",
    "DT_RACE": "Race",
}

def _humanize_descendia_code(raw: str) -> str:
    """Fallback for Descendia mission-type/modifier codenames not in the
    static lookup tables above - the live worldstate mirror adds new
    codenames over time that a fixed dict can't keep up with (Jacob
    2026-07-22: raw names like "RangedArcadiaOnly" were leaking through).
    Strips known internal prefixes and splits CamelCase into spaced
    words, e.g. "FieryTrailRollers" -> "Fiery Trail Rollers"."""
    import re
    text = raw
    for prefix in ("DT_", "NC_"):
        if text.startswith(prefix):
            text = text[len(prefix):]
            break
    if "_" in text:
        # SHOUTY_SNAKE_CASE -> Title Case
        return text.replace("_", " ").title()
    # CamelCase -> spaced words (handles runs of capitals too, e.g. "NC")
    spaced = re.sub(r'(?<!^)(?<![A-Z])(?=[A-Z])', ' ', text)
    return spaced.strip()


DESCENDIA_PENANCES = {
    "NC_SlipAndSlide": "Frictionless without Enemies",
    "BasicLootCreatures": "Gruzzling Plunder",
    "MineField": "Minefield",
    "SlipAndSlide": "Frictionless",
    "Escapist": "Sneaky Retreats",
    "VoidAberration": "Vampyric Liminus",
    "Wisp": "Marie",
    "FireAndIce": "Eximus Cabal: Fire & Ice",
    "BasicMimics": "Plunder Roulette",
    "NC_MineField": "Minefield without Enemies",
    "Octopede": "The Fragmented Boss",
    "PoisonGas": "Chemical Warfare",
    "GlassMaker": "Glassmaker Cephalites",
    "Harrow": "Lyon",
    "Darkness": "Sol Banished",
    "SpicyKnife": "Bomb Defusal",
    "JumpSmash": "Head Stompers",
    "Manics": "Manic Mania",
    "FireChain": "Fire Chain",
}

# Tier colors
TIER_COLORS = {
    "Lith":    "#8fd3ff",
    "Meso":    "#7fffb0",
    "Neo":     "#ffb37f",
    "Axi":     "#ff8fa3",
    "Requiem": "#d0a3ff",
    "Omnia":   "#ffd24c",
    "Vanguard":"#c9a84c",
}

# Cycle state colors/icons — all BMP safe
CYCLE_ICONS = {
    "day":    ("☀",  "#ffd24c"),   # sun
    "night":  ("☽", "#8fd3ff"),   # crescent moon
    "warm":   ("▲", "#ff9933"),   # warm/up triangle
    "cold":   ("❄",  "#8fd3ff"),   # snowflake
    "fass":   ("●", "#ff9933"),   # Fass (orange wyrm)
    "vome":   ("○", "#8fd3ff"),   # Vome (blue wyrm)
    "anger":  ("▲", "#ff6060"),   # anger
    "joy":    ("★", "#ffd24c"),   # joy/star
    "envy":   ("◆", "#7fffb0"),   # envy/diamond
    "sorrow": ("▽", "#8fd3ff"),   # sorrow/down
    "fear":   ("◇", "#d0a3ff"),   # fear/open diamond
}

# Faction color badges — color-coded dots matching Warframe's faction colors
FACTION_COLORS = {
    "Grineer":    "#e85c0d",   # orange-red
    "Corpus":     "#3cb4e6",   # cyan-blue
    "Infestation":"#6dbf4a",   # green
    "Infested":   "#6dbf4a",
    "Corrupted":  "#c9a84c",   # gold
    "Murmur":     "#c084fc",   # purple
    "Narmer":     "#f0c040",   # golden yellow
    "Sentient":   "#e040fb",   # violet
    "Tenno":      "#3cb4e6",
    "Crossfire":  "#aaaaaa",
}

# Mission type icons — all BMP safe
MISSION_ICONS = {
    "Extermination": "⚔",   # crossed swords
    "Survival":      "⧖",   # hourglass
    "Defense":       "■",   # square shield
    "Mobile Defense":"▣",   # filled square
    "Interception":  "◎",   # bullseye
    "Capture":       "◆",   # diamond
    "Rescue":        "▷",   # triangle
    "Sabotage":      "✶",   # 6-point star
    "Spy":           "◇",   # open diamond
    "Assassination": "☠",   # skull
    "Excavation":    "⛏",   # pick
    "Defection":     "▸",   # small triangle
    "Junction":      "□",   # open square
    "Skirmish":      "△",   # open triangle
    "Pursuit":       "▶",   # filled triangle
    "Alchemy":       "⚗",   # retort
    "Void Cascade":  "○",   # open circle
    "Disruption":    "⚡",   # lightning
    "Onslaught":     "▲",   # up triangle
    "Elite Onslaught":"▲",  # up triangle
    "Void Armageddon":"✶",  # star
    "Void Flood":    "≈",   # approx
}




def _p():
    """Return current theme palette — always fresh, never stale."""
    return get_palette()


def _owned_ducats() -> int:
    """Ducats in inventory.json are stored as a MiscItem, not a top-level
    field - Warframe's own save format keys them as "PrimeBucks"
    (ItemCount), same pattern as other bucks-currencies (GranumBucks,
    CodaWeaponBucks, etc). Jacob 2026-07-24."""
    try:
        inv = json.loads(get_inventory_path().read_text())
        for item in inv.get("MiscItems", []):
            if item.get("ItemType", "").endswith("/PrimeBucks"):
                return item.get("ItemCount", 0)
    except Exception:
        pass
    return 0


def _card_style():
    p = _p()
    return (
        f"background: {p['bg_panel']}; border: 1px solid {p['border']}; "
        f"border-radius: 8px;"
    )


def _section_title(text, accent_color=None):
    p = _p()
    w = QWidget()
    w.setStyleSheet(
        f"background: {p['bg_card']}; border-radius: 6px 6px 0 0; "
        f"border-bottom: 1px solid {p['border']};"
    )
    row = QHBoxLayout(w)
    row.setContentsMargins(8, 5, 8, 5)
    row.setSpacing(6)
    row.addStretch()
    lbl = QLabel(text)
    lbl.setStyleSheet(
        f"color: {p['gold']}; font-size: 14px; font-weight: 700; "
        f"letter-spacing: 0.5px; background: transparent;"
    )
    row.addWidget(lbl)
    row.addStretch()
    return w


def _label(text, color=None, size=15, bold=False, wrap=False):
    p = _p()
    lbl = QLabel(text)
    weight = "700" if bold else "400"
    lbl.setStyleSheet(
        f"color: {color or p['fg']}; font-size: {size}px; "
        f"font-weight: {weight}; background: transparent;"
    )
    lbl.setWordWrap(wrap)
    return lbl


def _row_divider():
    p = _p()
    d = QFrame()
    d.setFrameShape(QFrame.HLine)
    d.setStyleSheet(f"color: {p['border']}; background: {p['border']};")
    d.setFixedHeight(1)
    return d


def _faction_badge(faction: str) -> QWidget:
    color = FACTION_COLORS.get(faction, _p()['fg_dim'])
    w = QLabel(faction)
    w.setStyleSheet(
        f"color: {color}; font-size: 13px; font-weight: 700; "
        f"background: transparent; padding: 0;"
    )
    return w


class FlowLayout(QLayout):
    """Packs items left-to-right, wrapping to a new row only when the
    current row runs out of horizontal space - unlike QGridLayout, items
    sit immediately next to each other instead of being pinned to fixed
    column boundaries (which left a wide gap between short pills stuck
    at a 50% column line). Jacob 2026-07-23 - standard Qt "flow layout"
    recipe adapted for PySide6."""

    def __init__(self, parent=None, h_spacing=10, v_spacing=10):
        super().__init__(parent)
        self._h_spacing = h_spacing
        self._v_spacing = v_spacing
        self._items = []

    def addItem(self, item):
        self._items.append(item)

    def horizontalSpacing(self):
        return self._h_spacing

    def verticalSpacing(self):
        return self._v_spacing

    def count(self):
        return len(self._items)

    def itemAt(self, index):
        if 0 <= index < len(self._items):
            return self._items[index]
        return None

    def takeAt(self, index):
        if 0 <= index < len(self._items):
            return self._items.pop(index)
        return None

    def expandingDirections(self):
        return Qt.Orientation(0)

    def hasHeightForWidth(self):
        return True

    def heightForWidth(self, width):
        return self._do_layout(QRect(0, 0, width, 0), test_only=True)

    def setGeometry(self, rect):
        super().setGeometry(rect)
        self._do_layout(rect, test_only=False)

    def sizeHint(self):
        return self.minimumSize()

    def minimumSize(self):
        size = QSize()
        for item in self._items:
            size = size.expandedTo(item.minimumSize())
        margins = self.contentsMargins()
        size += QSize(
            margins.left() + margins.right(),
            margins.top() + margins.bottom(),
        )
        return size

    def _do_layout(self, rect, test_only):
        left, top, right, bottom = self.getContentsMargins()
        effective = rect.adjusted(left, top, -right, -bottom)
        x = effective.x()
        y = effective.y()
        line_height = 0

        for item in self._items:
            hint = item.sizeHint()
            next_x = x + hint.width() + self._h_spacing
            if next_x - self._h_spacing > effective.right() and line_height > 0:
                x = effective.x()
                y += line_height + self._v_spacing
                next_x = x + hint.width() + self._h_spacing
                line_height = 0
            if not test_only:
                item.setGeometry(QRect(x, y, hint.width(), hint.height()))
            x = next_x
            line_height = max(line_height, hint.height())

        return y + line_height - rect.y()


def _mission_row(mission_type: str, node: str, modifier: str = "", faction: str = "") -> QWidget:
    """A single mission row with icon, type, node, and optional modifier."""
    w = QWidget()
    w.setStyleSheet("background: transparent;")
    vl = QVBoxLayout(w)
    vl.setContentsMargins(0, 3, 0, 3)
    vl.setSpacing(2)

    top = QHBoxLayout()
    top.setSpacing(8)
    icon = MISSION_ICONS.get(mission_type, "•")
    icon_lbl = QLabel(icon)
    icon_lbl.setStyleSheet(f"color: {GOLD}; font-size: 16px; background: transparent;")
    icon_lbl.setFixedWidth(22)
    icon_lbl.setAlignment(Qt.AlignCenter)
    top.addWidget(icon_lbl)

    # Mission type bold, then node dimmed - wraps instead of clipping when
    # the card is narrower than the text. Jacob 2026-07-24 (Archon Hunt/
    # Sortie text was getting cut off instead of wrapping down).
    safe_mission_type = html.escape(str(mission_type))
    safe_node = html.escape(str(node))
    combo_lbl = QLabel(f"<b style='color:{FG};'>{safe_mission_type}</b>"
                       f"<span style='color:{DIM};'>  ·  {safe_node}</span>")
    combo_lbl.setTextFormat(Qt.RichText)
    combo_lbl.setWordWrap(True)
    combo_lbl.setStyleSheet("background: transparent; font-size: 15px;")
    top.addWidget(combo_lbl, stretch=1)
    vl.addLayout(top)

    if modifier:
        mod_lbl = QLabel(f"<i style='color:{ORANGE};'>{html.escape(str(modifier))}</i>")
        mod_lbl.setTextFormat(Qt.RichText)
        mod_lbl.setStyleSheet(
            f"background: #162848; border-radius: 3px; "
            f"padding: 1px 8px 1px 30px; font-size: 13px;"
        )
        # wordWrap(True) + stretch=1 (not a Maximum size policy) - same
        # fix already proven for combo_lbl/info_lbl. Maximum policy
        # combined with wordWrap fights itself (collapses to the smallest
        # wrapped width instead of the available width), which is why
        # this was set to no-wrap before - that just meant it clipped
        # instead. Jacob 2026-07-24 ("sortie still doesn't wrap text").
        mod_lbl.setWordWrap(True)
        mod_row = QHBoxLayout()
        mod_row.setContentsMargins(0, 0, 0, 0)
        mod_row.addWidget(mod_lbl, stretch=1)
        vl.addLayout(mod_row)

    return w


class _Fetcher(QObject):
    data_ready = Signal(int, dict)
    error = Signal(int, str)

    def __init__(self, url=API_URL, cache_file=CACHE_FILE, parent=None):
        super().__init__(parent)
        self._url = url
        self._cache_file = cache_file
        self._generation = 0
        self._generation_lock = threading.Lock()

    def _is_current(self, generation):
        with self._generation_lock:
            return generation == self._generation

    def fetch(self):
        with self._generation_lock:
            self._generation += 1
            generation = self._generation
        # Cache-first: emit whatever's on disk immediately (near-instant),
        # then refresh with live data in the background and emit again
        # once that lands. Previously the cache was only ever read as a
        # fallback when the network call failed, so every launch waited
        # on a full network round-trip before showing anything - which
        # made Descendia (a separate, larger, slower fetch) visibly lag
        # behind the rest of the dashboard. Jacob 2026-07-23.
        cache_hit = False
        try:
            cached = json.loads(self._cache_file.read_text())
            # Defer same-thread delivery until fetch() has returned, allowing
            # DashboardTab to store the returned generation before its slot
            # validates this cache result.
            QTimer.singleShot(
                0,
                lambda g=generation, data=cached: (
                    self.data_ready.emit(g, data) if self._is_current(g) else None
                ),
            )
            cache_hit = True
        except Exception:
            pass

        def _run():
            try:
                req = urllib.request.Request(
                    self._url, headers={"User-Agent": "kiedas-orbiter/1.0"}
                )
                with urllib.request.urlopen(req, timeout=15) as r:
                    raw = r.read()
                data = json.loads(raw)
                if not self._is_current(generation):
                    return
                self._cache_file.parent.mkdir(parents=True, exist_ok=True)
                self._cache_file.write_bytes(raw)
                self.data_ready.emit(generation, data)
            except Exception as e:
                # Cached data is already showing - don't stomp a working
                # display with an error message over a background refresh
                # failure.
                if not cache_hit and self._is_current(generation):
                    self.error.emit(generation, str(e))
        threading.Thread(target=_run, daemon=True).start()
        return generation


def _mongo_date_to_iso(field) -> str | None:
    """Convert a MongoDB extended-JSON date field ({"$date": {"$numberLong":
    "..."}} or {"$date": "..."}) to an ISO string _expiry_str understands."""
    if not isinstance(field, dict):
        return None
    d = field.get("$date")
    if isinstance(d, dict) and "$numberLong" in d:
        try:
            ms = int(d["$numberLong"])
            return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).isoformat()
        except Exception:
            return None
    if isinstance(d, str):
        return d
    return None


def _expiry_str(expiry_iso: str | None) -> str:
    """Convert ISO expiry to a human-readable time remaining string."""
    if not expiry_iso:
        return ""
    try:
        expiry = datetime.fromisoformat(expiry_iso.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        delta = expiry - now
        if delta.total_seconds() < 0:
            return "expired"
        total = int(delta.total_seconds())
        days = total // 86400
        h, rem = divmod(total % 86400, 3600)
        m = rem // 60
        if days > 0:
            return f"{days}d {h}h"
        if h > 0:
            return f"{h}h {m}m"
        return f"{m}m"
    except Exception:
        return ""


class DashboardTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._data = None
        self._descendia_data = None
        self._refresh_generation = 0
        self._descendia_generation = 0
        self._fetcher = _Fetcher()
        self._fetcher.data_ready.connect(self._on_data)
        self._fetcher.error.connect(self._on_error)
        self._descendia_fetcher = _Fetcher(url=DESCENDIA_API_URL, cache_file=DESCENDIA_CACHE_FILE)
        self._descendia_fetcher.data_ready.connect(self._on_descendia_data)
        self._descendia_fetcher.error.connect(lambda *_: None)  # optional section — fail silently
        self._setup_ui()

        # Auto-refresh timer
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._refresh)
        self._timer.start(REFRESH_INTERVAL_MS)

        # Initial fetch
        self._refresh()

    def _setup_ui(self):
        p = _p()
        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.setSpacing(0)

        # Top bar: title + edit-layout toolbar + last-updated + refresh
        # button, all in one row. Jacob 2026-07-23 (toolbar used to be its
        # own row below - wanted it level with "Live World State").
        self._topbar = QFrame()
        tb = QHBoxLayout(self._topbar)
        tb.setContentsMargins(12, 6, 12, 6)
        self._title_lbl = QLabel("●  Live World State")
        tb.addWidget(self._title_lbl)

        self._canvas = EditableCanvas(DATA_DIR / "dashboard_layout.json")
        tb.addSpacing(16)
        tb.addWidget(edit_mode_toolbar(self._canvas))

        tb.addStretch()
        self._last_updated_lbl = QLabel("Fetching...")
        tb.addWidget(self._last_updated_lbl)
        self._refresh_btn = QPushButton("↻")
        self._refresh_btn.setMaximumWidth(32)
        self._refresh_btn.setToolTip("Refresh now")
        self._refresh_btn.clicked.connect(self._refresh)
        tb.addWidget(self._refresh_btn)
        outer.addWidget(self._topbar)

        # Scrollable content — canvas positions cards absolutely, so the
        # scroll area must NOT force-resize it to the viewport.
        self._scroll = QScrollArea()
        self._scroll.setWidgetResizable(False)

        self._loading_lbl = QLabel("Loading world state...")
        self._loading_lbl.setAlignment(Qt.AlignCenter)
        self._scroll.setWidget(self._loading_lbl)
        outer.addWidget(self._scroll, stretch=1)

        # Apply initial styles (no rebuild — no data yet)
        p = _p()
        self._topbar.setStyleSheet(
            f"background: {p['bg_panel']}; border-bottom: 1px solid {p['border']};"
        )
        self._title_lbl.setStyleSheet(
            f"color: {p['gold']}; font-size: 16px; font-weight: 700; background: transparent;"
        )
        self._last_updated_lbl.setStyleSheet(
            f"color: {p['fg_dim']}; font-size: 13px; background: transparent;"
        )
        self._refresh_btn.setStyleSheet(
            f"QPushButton {{ background: {p['bg_card']}; color: {p['accent']}; "
            f"border: 1px solid {p['border']}; border-radius: 4px; font-size: 16px; padding: 2px 6px; }}"
            f"QPushButton:hover {{ color: {p['gold']}; border-color: {p['accent']}; }}"
        )
        self._scroll.setStyleSheet(f"QScrollArea {{ border: none; background: {p['bg']}; }}")
        self._canvas.setStyleSheet(f"background: {p['bg']};")
        self._loading_lbl.setStyleSheet(f"color: {p['fg_dim']}; font-size: 15px; padding: 40px;")

    def _apply_styles(self):
        """Re-apply structural styles and rebuild cards with current theme palette."""
        p = _p()
        self._topbar.setStyleSheet(
            f"background: {p['bg_panel']}; border-bottom: 1px solid {p['border']};"
        )
        self._title_lbl.setStyleSheet(
            f"color: {p['gold']}; font-size: 16px; font-weight: 700; background: transparent;"
        )
        self._last_updated_lbl.setStyleSheet(
            f"color: {p['fg_dim']}; font-size: 13px; background: transparent;"
        )
        self._refresh_btn.setStyleSheet(
            f"QPushButton {{ background: {p['bg_card']}; color: {p['accent']}; "
            f"border: 1px solid {p['border']}; border-radius: 4px; font-size: 16px; padding: 2px 6px; }}"
            f"QPushButton:hover {{ color: {p['gold']}; border-color: {p['accent']}; }}"
        )
        self._scroll.setStyleSheet(
            f"QScrollArea {{ border: none; background: {p['bg']}; }}"
        )
        self._canvas.setStyleSheet(f"background: {p['bg']};")
        # Rebuild cards with new theme colors (only if data already loaded).
        # Uses the same visibility-safe deferral as the data-refresh path -
        # calling _rebuild() directly here bypassed it, so switching themes
        # while Dashboard was hidden (e.g. from the Settings page) measured
        # card heights on a hidden widget tree and produced the same
        # overlap bug the showEvent fix was supposed to prevent. Jacob
        # 2026-07-23 ("switching themes messes up my layouts").
        if self._data is not None:
            self._rebuild_if_visible()

    def _refresh(self):
        self._last_updated_lbl.setText("Refreshing...")
        self._refresh_generation = self._fetcher.fetch()
        self._descendia_generation = self._descendia_fetcher.fetch()

    def _on_error(self, generation, msg):
        if generation != self._refresh_generation:
            return
        self._last_updated_lbl.setText(f"Error: {msg[:50]}")

    def _on_data(self, generation, data):
        if generation != self._refresh_generation:
            return
        self._data = data
        now = datetime.now().strftime("%H:%M:%S")
        self._last_updated_lbl.setText(f"Updated {now}")
        self._rebuild_if_visible()

    def _on_descendia_data(self, generation, data):
        if generation != self._descendia_generation:
            return
        self._descendia_data = data
        if self._data is not None:
            self._rebuild_if_visible()

    def _rebuild_if_visible(self):
        # Qt doesn't reliably compute layout geometry (heightForWidth,
        # sizeHint) for widgets that are hidden - if the 60s auto-refresh
        # timer fires while another tab is showing, rebuilding then can
        # measure wrong card heights, and the resulting overlap only
        # becomes visible once you switch back to Dashboard. Jacob
        # 2026-07-23. Deferring the rebuild until this tab is actually
        # shown again avoids laying out an invisible widget tree.
        if self.isVisible():
            self._rebuild()
        else:
            self._pending_rebuild = True

    def showEvent(self, event):
        super().showEvent(event)
        if getattr(self, "_pending_rebuild", False):
            self._pending_rebuild = False
            self._rebuild()

    def _rebuild(self):
        d = self._data
        if not d:
            return

        _sync_theme_colors()

        if self._scroll.widget() is not self._canvas:
            self._scroll.setWidget(self._canvas)

        # Data auto-refreshes every 60s (plus Descendia arrives from its
        # own separate, slightly-offset fetch). This used to destroy and
        # recreate every card from scratch on every single refresh, which
        # both discarded in-progress drag/resize edits AND caused a
        # visible "pop in" flash as widgets were torn down and rebuilt.
        # upsert_card() below swaps each existing card's content in place
        # instead - position/width/drag-state untouched - so only a
        # genuinely NEW card (like Descendia the first time its slower
        # fetch completes) actually appears as new. Jacob 2026-07-23.
        # Fixed (x, y, width, height) defaults - these are Jacob's actual
        # tuned arrangement (edge-aligned: Cycles/Fissures/Nightwave/
        # Steel Path share a left edge and Fissures' right edge;
        # Arbitration's right edge matches Fissures' right edge;
        # Sortie/Archon/Baro/Descendia share a left/right edge), not a
        # flow-computed guess. Reset Layout must reproduce exactly this,
        # so it's hardcoded per-card instead of derived from column/group
        # math that doesn't know about the alignment. Jacob 2026-07-24.
        DEFAULTS = {
            "cycles":       (4, 0, 720, 150),
            "fissures":     (4, 155, 720, 780),
            "nightwave":    (4, 1065, 720, 422),
            "steel_path":   (4, 939, 347, 120),
            "arbitration":  (363, 938, 361, 120),
            "sortie":       (737, 0, 440, 280),
            "baro":         (737, 285, 440, 120),
            "descendia":    (737, 410, 440, 623),
            "archon":       (737, 1045, 440, 241),
        }

        cards = [
            ("cycles", self._build_cycles(d)),
            ("fissures", self._build_fissures(d)),
            ("nightwave", self._build_nightwave(d)),
            ("sortie", self._build_sortie(d)),
            ("archon", self._build_archon(d)),
            ("arbitration", self._build_arbitration(d)),
            ("steel_path", self._build_steel_path(d)),
            ("baro", self._build_baro(d)),
        ]
        descendia_card = self._build_descendia()
        if descendia_card is not None:
            cards.append(("descendia", descendia_card))

        saved = self._canvas.load_layout()

        for key, widget in cards:
            dx, dy, dw, dh = DEFAULTS[key]
            existed = key in self._canvas._cards
            if existed:
                # Position/width/height untouched - only content swaps.
                self._canvas.upsert_card(key, widget, dx, dy, dw, dh)
            else:
                pos = saved.get(key)
                kx = pos["x"] if pos else dx
                ky = pos["y"] if pos else dy
                kw = pos["width"] if pos else dw
                kh = pos.get("height", dh) if pos else dh
                self._canvas.upsert_card(key, widget, kx, ky, kw, kh)
            # Reset Layout always restores this fixed arrangement,
            # regardless of any saved override.
            self._canvas.remember_default(key, dx, dy, dw, dh)

    # ── Section builders ─────────────────────────────────────────────────

    def _build_cycles(self, d):
        frame = QFrame()
        frame.setStyleSheet(_card_style())
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        layout.addWidget(_section_title("\u2600  CYCLES", SAP))

        body = QWidget()
        body.setStyleSheet("background: transparent;")
        body_layout = QVBoxLayout(body)
        body_layout.setContentsMargins(12, 10, 12, 12)
        body_layout.setSpacing(10)

        CYCLES = [
            ("earthCycle",   "Earth"),
            ("cetusCycle",   "Cetus"),
            ("vallisCycle",  "Orb Vallis"),
            ("cambionCycle", "Cambion Drift"),
            ("duviriCycle",  "Duviri"),
        ]

        # Pills wrap left-to-right and sit immediately next to each other.
        cycle_flow = FlowLayout(h_spacing=10, v_spacing=8)

        for idx, (key, name) in enumerate(CYCLES):
            c = d.get(key, {})
            state = c.get("state", "unknown")
            raw_tl = c.get("timeLeft")
            if raw_tl:
                # The API only tracks cycles to whole-minute precision, so
                # the seconds portion is always "0s" and never actually
                # ticks - just noise that reads as "frozen". Minutes only.
                # Jacob 2026-07-24.
                time_left = re.sub(r"\s*\d+s$", "", raw_tl).strip() or raw_tl
            else:
                exp = _expiry_str(c.get("expiry"))
                time_left = exp if exp and exp != "expired" else "\u2014"
            icon, color = CYCLE_ICONS.get(state, ("\u25cb", DIM))

            cell = QFrame()
            cell.setStyleSheet(
                f"background: {_p()['bg_card']}; border-radius: 6px;"
            )
            cell_layout = QHBoxLayout(cell)
            cell_layout.setContentsMargins(8, 5, 8, 5)
            cell_layout.setSpacing(6)

            name_lbl = _label(name, DIM, 14)
            name_lbl.setWordWrap(True)

            state_lbl = _label(f"{icon} {state.capitalize()}", color, 14, bold=True)
            state_lbl.setWordWrap(True)

            time_lbl = _label(time_left or "\u2014", DIM, 14)
            time_lbl.setWordWrap(True)
            time_lbl.setAlignment(Qt.AlignLeft | Qt.AlignVCenter)

            cell_layout.addWidget(name_lbl)
            cell_layout.addWidget(state_lbl)
            cell_layout.addSpacing(8)
            cell_layout.addWidget(time_lbl)
            cell.setSizePolicy(QSizePolicy.Maximum, QSizePolicy.Preferred)

            cycle_flow.addWidget(cell)

        body_layout.addLayout(cycle_flow)
        layout.addWidget(body)
        return frame

    def _build_fissures(self, d):
        frame = QFrame()
        frame.setStyleSheet(_card_style())
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        layout.addWidget(_section_title("\u25c6  VOID FISSURES", GOLD))

        body = QWidget()
        body.setStyleSheet("background: transparent;")
        body_layout = QVBoxLayout(body)
        body_layout.setContentsMargins(12, 8, 12, 10)
        body_layout.setSpacing(10)

        fissures = d.get("fissures", [])
        tier_order = ["Lith", "Meso", "Neo", "Axi", "Requiem", "Omnia", "Vanguard"]
        by_tier = {}
        for f in fissures:
            tier = f.get("tier", "?")
            by_tier.setdefault(tier, []).append(f)

        # Two tier-blocks per row instead of one long single column - the
        # card is wide enough (3/5 of the dashboard) that a single narrow
        # column of short mission names left most of it as dead space.
        # Jacob 2026-07-22 (screenshot, circled) - asked for content that
        # actually uses the width rather than padding/margin tricks that
        # just relocate the same gap.
        fissure_grid = QGridLayout()
        fissure_grid.setHorizontalSpacing(18)
        fissure_grid.setVerticalSpacing(10)
        fissure_grid.setColumnStretch(0, 1)
        fissure_grid.setColumnStretch(1, 1)
        slot = 0

        for tier in tier_order:
            fs = by_tier.get(tier, [])
            if not fs:
                continue
            color = TIER_COLORS.get(tier, FG)

            block = QWidget()
            block.setStyleSheet("background: transparent;")
            block_layout = QVBoxLayout(block)
            block_layout.setContentsMargins(0, 0, 0, 0)
            block_layout.setSpacing(3)

            tier_row = QHBoxLayout()
            tier_row.setContentsMargins(0, 0, 0, 2)
            dot = QLabel("\u25cf")
            dot.setStyleSheet(f"color: {color}; font-size: 13px; background: transparent;")
            tier_name = QLabel(tier)
            tier_name.setStyleSheet(f"color: {color}; font-size: 16px; font-weight: 700; background: transparent;")
            tier_row.addWidget(dot)
            tier_row.addWidget(tier_name)
            tier_row.addStretch()
            block_layout.addLayout(tier_row)

            for f in fs:
                mission = f.get("missionType", "")
                node = f.get("node", "")
                eta = _expiry_str(f.get("expiry"))
                is_hard = f.get("isHard", False)
                is_storm = f.get("isStorm", False)

                suffix = ""
                if is_hard:
                    suffix += " \u25cf"
                if is_storm:
                    suffix += " \u26a1"

                row = QHBoxLayout()
                row.setContentsMargins(14, 0, 0, 0)
                row.setSpacing(8)
                info = _label(f"{mission} \u2014 {node}{suffix}", FG, 14)
                info.setWordWrap(True)
                if is_hard or is_storm:
                    tips = []
                    if is_hard:
                        tips.append("\u25cf = Steel Path (hard mode) fissure")
                    if is_storm:
                        tips.append("\u26a1 = Void Storm fissure")
                    info.setToolTip("\n".join(tips))
                eta_lbl = _label(eta or "\u2014", DIM, 13)
                eta_lbl.setWordWrap(True)
                eta_lbl.setFixedWidth(58)
                eta_lbl.setAlignment(Qt.AlignCenter)
                row.addWidget(info, stretch=1)
                row.addWidget(eta_lbl)
                block_layout.addLayout(row)

            fissure_grid.addWidget(block, slot // 2, slot % 2, Qt.AlignTop)
            slot += 1

        body_layout.addLayout(fissure_grid)

        if not fissures:
            body_layout.addWidget(_label("No active fissures", DIM, 15))

        layout.addWidget(body)
        return frame

    def _build_sortie(self, d):
        frame = QFrame()
        frame.setStyleSheet(_card_style())
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        layout.addWidget(_section_title("⚔  SORTIE", ORANGE))

        body = QWidget()
        body.setStyleSheet("background: transparent;")
        body_layout = QVBoxLayout(body)
        body_layout.setContentsMargins(12, 10, 12, 12)
        body_layout.setSpacing(8)

        s = d.get("sortie", {})
        boss = s.get("boss", "")
        faction = s.get("faction", "")
        faction_color = FACTION_COLORS.get(faction, DIM)
        eta = _expiry_str(s.get("expiry"))

        # Header: boss name + faction badge + timer
        header_row = QHBoxLayout()
        header_row.setSpacing(8)
        boss_lbl = _label(boss, FG, 15, bold=True)
        header_row.addWidget(boss_lbl)
        header_row.addWidget(_faction_badge(faction))
        header_row.addStretch()
        header_row.addWidget(_label(eta, DIM, 12))
        body_layout.addLayout(header_row)
        body_layout.addWidget(_row_divider())

        for v in s.get("variants", []):
            body_layout.addWidget(_mission_row(
                v.get("missionType", ""),
                v.get("node", ""),
                v.get("modifier", ""),
                faction,
            ))

        layout.addWidget(body)
        return frame

    def _build_archon(self, d):
        frame = QFrame()
        frame.setStyleSheet(_card_style())
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        layout.addWidget(_section_title("■  ARCHON HUNT", SAP))

        body = QWidget()
        body.setStyleSheet("background: transparent;")
        body_layout = QVBoxLayout(body)
        body_layout.setContentsMargins(12, 10, 12, 12)
        body_layout.setSpacing(8)

        ah = d.get("archonHunt", {})
        boss = ah.get("boss", "")
        faction = ah.get("faction", "")
        eta = _expiry_str(ah.get("expiry"))

        header_row = QHBoxLayout()
        header_row.setSpacing(8)
        header_row.addWidget(_label(boss, FG, 15, bold=True))
        header_row.addWidget(_faction_badge(faction))
        header_row.addStretch()
        header_row.addWidget(_label(eta, DIM, 12))
        body_layout.addLayout(header_row)
        body_layout.addWidget(_row_divider())

        for m in ah.get("missions", []):
            body_layout.addWidget(_mission_row(
                m.get("type", ""),
                m.get("node", ""),
            ))

        layout.addWidget(body)
        return frame

    def _build_arbitration(self, d):
        frame = QFrame()
        frame.setStyleSheet(_card_style())
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        layout.addWidget(_section_title("◎  ARBITRATION", GREEN))

        body = QWidget()
        body.setStyleSheet("background: transparent;")
        body_layout = QVBoxLayout(body)
        body_layout.setContentsMargins(12, 8, 12, 10)
        body_layout.setSpacing(5)

        a = _compute_local_arbitration() or d.get("arbitration", {})
        node = a.get("node", "")
        mission = a.get("type", "")
        enemy = a.get("enemy", "")
        eta = _expiry_str(a.get("expiry"))
        archwing = a.get("archwing", False)
        sharkwing = a.get("sharkwing", False)

        # Detect placeholder (API returns SolNode000/Unknown when none active)
        is_placeholder = (not node or node == "SolNode000" or mission == "Unknown")

        if is_placeholder:
            placeholder_lbl = _label("No active Arbitration right now", DIM, 13)
            placeholder_lbl.setWordWrap(True)
            body_layout.addWidget(placeholder_lbl)
        else:
            suffix = " (Archwing)" if archwing else " (Sharkwing)" if sharkwing else ""
            icon = MISSION_ICONS.get(mission, "•")

            header_row = QHBoxLayout()
            header_row.setSpacing(8)
            icon_lbl = QLabel(icon)
            icon_lbl.setStyleSheet(f"color: {GOLD}; font-size: 17px; background: transparent;")
            icon_lbl.setFixedWidth(22)
            icon_lbl.setAlignment(Qt.AlignCenter)
            header_row.addWidget(icon_lbl)
            node_lbl = _label(f"{node}{suffix}", FG, 14, bold=True)
            node_lbl.setWordWrap(True)
            header_row.addWidget(node_lbl, stretch=1)
            header_row.addWidget(_label(eta, DIM, 12))
            body_layout.addLayout(header_row)

            detail_row = QHBoxLayout()
            detail_row.setSpacing(8)
            detail_row.addWidget(_label(mission, DIM, 14))
            if enemy:
                detail_row.addWidget(_faction_badge(enemy))
            detail_row.addStretch()
            body_layout.addLayout(detail_row)

        layout.addWidget(body)
        return frame

    def _build_baro(self, d):
        frame = QFrame()
        vt = d.get("voidTrader", {})
        inventory = vt.get("inventory", [])
        active = bool(inventory)
        frame.setStyleSheet(_card_style())
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        layout.addWidget(_section_title("◆  BARO KI'TEER", GOLD if active else DIM))

        body = QWidget()
        body.setStyleSheet("background: transparent;")
        body_layout = QVBoxLayout(body)
        body_layout.setContentsMargins(12, 8, 12, 10)
        body_layout.setSpacing(5)

        location = vt.get("location", "")
        eta = _expiry_str(vt.get("expiry")) if active else _expiry_str(vt.get("activation"))

        if active:
            here_lbl = _label(f"✓ Here now  ·  {location}", GREEN, 14, bold=True)
            here_lbl.setWordWrap(True)
            header_row = QHBoxLayout()
            header_row.addWidget(here_lbl, stretch=1)
            header_row.addWidget(_label(f"Leaves {eta}", DIM, 12))
            body_layout.addLayout(header_row)
            body_layout.addWidget(_row_divider())
            # No item list/prices - the API's price fields never actually
            # matched (code looked for DucatPrice/ducatPrice, real field is
            # just "ducats", so it always showed 0) and Jacob doesn't want
            # a per-item list anyway. Ducat count read straight from your
            # own inventory.json instead. Jacob 2026-07-24.
            summary_row = QHBoxLayout()
            summary_row.addWidget(_label(f"{len(inventory)} items for sale", DIM, 13))
            summary_row.addStretch()
            summary_row.addWidget(_label(f"◆ {_owned_ducats():,} ducats", GOLD, 13, bold=True))
            body_layout.addLayout(summary_row)
        else:
            header_row = QHBoxLayout()
            header_row.addWidget(_label("Not here", DIM, 14, bold=True))
            header_row.addStretch()
            header_row.addWidget(_label(f"Arrives in {eta}", DIM, 12))
            body_layout.addLayout(header_row)
            location_lbl = _label(f"Location: {location}", DIM, 14)
            location_lbl.setWordWrap(True)
            body_layout.addWidget(location_lbl)

        layout.addWidget(body)
        return frame

    def _build_steel_path(self, d):
        frame = QFrame()
        frame.setStyleSheet(_card_style())
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        layout.addWidget(_section_title("✶  STEEL PATH", GOLD))

        body = QWidget()
        body.setStyleSheet("background: transparent;")
        body_layout = QVBoxLayout(body)
        body_layout.setContentsMargins(12, 8, 12, 10)
        body_layout.setSpacing(5)

        sp = d.get("steelPath", {})
        current = sp.get("currentReward", {})
        reward_name = current.get("name", "")
        reward_cost = current.get("cost", 0)
        eta = _expiry_str(sp.get("expiry"))

        if reward_name:
            name_lbl = _label(reward_name, FG, 14, bold=True)
            name_lbl.setWordWrap(True)
            row = QHBoxLayout()
            row.addWidget(name_lbl, stretch=1)
            row.addWidget(_label(f"{reward_cost} essence", DIM, 12))
            body_layout.addLayout(row)
            body_layout.addWidget(_label(f"Rotates in {eta}", DIM, 13))
        else:
            body_layout.addWidget(_label("No current reward data", DIM, 13))

        layout.addWidget(body)
        return frame

    def _build_nightwave(self, d):
        frame = QFrame()
        frame.setStyleSheet(_card_style())
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        layout.addWidget(_section_title("○  NIGHTWAVE", "#7fffb0"))

        body = QWidget()
        body.setStyleSheet("background: transparent;")
        body_layout = QVBoxLayout(body)
        body_layout.setContentsMargins(12, 8, 12, 10)
        body_layout.setSpacing(4)

        nw = d.get("nightwave", {})
        challenges = nw.get("activeChallenges", [])

        daily  = [c for c in challenges if c.get("isDaily")]
        weekly = [c for c in challenges if not c.get("isDaily") and not c.get("isElite")]
        elite  = [c for c in challenges if c.get("isElite")]

        for group, group_label, accent in [
            (daily,  "Daily",       "#ffd24c"),
            (weekly, "Weekly",      "#7fffb0"),
            (elite,  "Elite Weekly","#ff8fa3"),
        ]:
            if not group:
                continue
            body_layout.addWidget(_label(group_label, accent, 14, bold=True))
            for ch in group:
                title = ch.get("title", "")
                rep   = ch.get("reputation", 0)
                done  = ch.get("completed", False)
                check = "✓  " if done else "○  "
                text_color = DIM if done else FG
                rep_color  = DIM if done else "#7fffb0"
                row = QHBoxLayout()
                row.setContentsMargins(8, 0, 0, 0)
                row.setSpacing(6)
                title_lbl = _label(f"{check}{title}", text_color, 14)
                title_lbl.setWordWrap(True)  # wraps + grows the card when squeezed
                title_lbl.setSizePolicy(
                    title_lbl.sizePolicy().horizontalPolicy(),
                    title_lbl.sizePolicy().verticalPolicy()
                )
                rep_lbl = _label(f"+{rep:,}", rep_color, 14)
                rep_lbl.setFixedWidth(52)
                rep_lbl.setAlignment(Qt.AlignRight)
                row.addWidget(title_lbl, stretch=1)
                row.addWidget(rep_lbl)
                body_layout.addLayout(row)

        if not challenges:
            body_layout.addWidget(_label("No active challenges", DIM, 14))

        layout.addWidget(body)
        return frame

    def _build_descendia(self):
        """Descendia (the Tau/Zariman roguelite 'Descent' mode) isn't in
        api.warframestat.us yet, so this reads from self._descendia_data
        (fetched separately from oracle.browse.wf/worldState.json) instead
        of the main dashboard payload. Returns None if that data hasn't
        loaded yet, so the caller can skip adding this card entirely."""
        wd = self._descendia_data
        if not wd:
            return None
        descents = wd.get("Descents", [])
        if not descents:
            return None

        now = datetime.now(timezone.utc)
        current = None
        for desc in descents:
            activation = _mongo_date_to_iso(desc.get("Activation"))
            expiry = _mongo_date_to_iso(desc.get("Expiry"))
            try:
                if activation and expiry:
                    a = datetime.fromisoformat(activation)
                    e = datetime.fromisoformat(expiry)
                    if a <= now <= e:
                        current = desc
                        break
            except Exception:
                continue
        if current is None:
            current = descents[-1]

        frame = QFrame()
        frame.setStyleSheet(_card_style())
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        layout.addWidget(_section_title("◈  DESCENDIA", "#c084fc"))

        body = QWidget()
        body.setStyleSheet("background: transparent;")
        body_layout = QVBoxLayout(body)
        body_layout.setContentsMargins(12, 6, 12, 8)
        body_layout.setSpacing(0)

        eta = _expiry_str(_mongo_date_to_iso(current.get("Expiry")))
        header_row = QHBoxLayout()
        header_row.addWidget(_label("This week's Descent", FG, 14, bold=True))
        header_row.addStretch()
        header_row.addWidget(_label(f"Resets {eta}" if eta else "", DIM, 12))
        body_layout.addLayout(header_row)
        body_layout.addWidget(_row_divider())

        stages = sorted(current.get("Challenges", []), key=lambda c: c.get("Index", 0))
        for stage in stages:
            index = stage.get("Index", 0)
            raw_type = stage.get("Type", "")
            raw_penance = stage.get("Challenge", "")
            mission_type = DESCENDIA_MISSION_TYPES.get(raw_type) or _humanize_descendia_code(raw_type)
            penance = DESCENDIA_PENANCES.get(raw_penance) or _humanize_descendia_code(raw_penance)
            is_checkpoint = index in (7, 14, 21)
            is_boss = index == 21

            row = QHBoxLayout()
            row.setContentsMargins(0, 1, 0, 1)
            row.setSpacing(8)
            marker_color = "#ff8fa3" if is_boss else (GOLD if is_checkpoint else DIM)
            marker = _label(f"{index:>2}", marker_color, 11, bold=is_checkpoint)
            marker.setFixedWidth(20)
            row.addWidget(marker)
            label_color = FG if is_checkpoint else DIM
            text = f"{mission_type} — {penance}" if penance else mission_type
            info_lbl = _label(text, label_color, 14, bold=is_boss)
            info_lbl.setWordWrap(True)
            row.addWidget(info_lbl, stretch=1)
            if is_boss:
                row.addWidget(_label("BOSS", "#ff8fa3", 10, bold=True))
            elif is_checkpoint:
                row.addWidget(_label("checkpoint", GOLD, 10))
            body_layout.addLayout(row)

        layout.addWidget(body)
        return frame
