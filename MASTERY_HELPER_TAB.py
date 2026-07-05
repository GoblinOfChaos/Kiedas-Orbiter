#!/usr/bin/env python3
"""Mastery Helper Tab — three views to efficiently gain Mastery Rank.

Easy      — items you already own that aren't rank 30 yet (level these now)
From Relics — unleveled items whose parts you can build from owned relics
Never Owned — items you've never leveled, grouped by what it takes to get them
"""

import json
from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtGui import QColor
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QTabWidget,
    QTableWidget, QTableWidgetItem, QHeaderView, QFrame,
    QComboBox, QCheckBox, QPushButton, QLineEdit,
)
from column_persistence import apply_saved_widths, remember_widths
from theme import BG_PANEL, BG_CARD, FG, DIM, GOLD, FG_DIM, BORDER

WFINFO_DIR = Path(__file__).parent

MASTERY_TYPES = {
    'Primary', 'Secondary', 'Melee', 'Warframe', 'Archwing',
    'Arch-Melee', 'Arch-Gun', 'Sentinel', 'Sentinel Weapon',
    'Necramech', 'Moa', 'Hound', 'K-Drive', 'Zaw', 'Kitgun',
    'Robotic Weapon', 'Amp',
}

# Inventory slots that hold leveled items
INV_SLOTS = [
    'LongGuns', 'Pistols', 'Melee', 'Suits', 'Sentinels', 'SentinelWeapons',
    'SpaceGuns', 'SpaceSuits', 'SpaceMelee', 'MechSuits', 'OperatorAmps',
    'KubrowPets', 'Hoverboards',
]

MAX_XP = 900000   # rank-30 affinity threshold in XPInfo


def _load(path, default):
    try:
        return json.loads(Path(path).read_text())
    except Exception:
        return default


def _xp_to_rank(xp):
    """Approximate rank from affinity XP (each rank ~30000 XP)."""
    return min(30, max(0, int(xp / 30000)))


class MasteryHelperTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._setup_ui()
        self._load_data()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(4)

        # Summary bar
        self._summary = QLabel("")
        self._summary.setStyleSheet(
            f"background:{BG_CARD}; color:{FG}; padding:6px 10px; "
            "border-radius:4px; font-size:12px;"
        )
        layout.addWidget(self._summary)

        # Sub-tabs
        self._tabs = QTabWidget()
        layout.addWidget(self._tabs)

        self._easy_tab = self._build_easy_tab()
        self._relics_tab = self._build_relics_tab()
        self._never_tab = self._build_never_tab()

        self._tabs.addTab(self._easy_tab, "Easy (own now)")
        self._tabs.addTab(self._relics_tab, "From Relics")
        self._tabs.addTab(self._never_tab, "Never Owned")

    # ------------------------------------------------------------------ Easy tab

    def _build_easy_tab(self):
        w = QWidget()
        layout = QVBoxLayout(w)
        layout.setContentsMargins(4, 4, 4, 4)
        layout.setSpacing(4)

        hint = QLabel(
            "Items you currently own that are not yet rank 30.  Level these for free mastery XP."
        )
        hint.setStyleSheet(f"color:{DIM}; font-size:11px;")
        hint.setWordWrap(True)
        layout.addWidget(hint)

        filter_row = QHBoxLayout()
        filter_row.addWidget(QLabel("Filter type:"))
        self._easy_type_combo = QComboBox()
        self._easy_type_combo.addItems(["All"] + sorted(MASTERY_TYPES))
        self._easy_type_combo.currentTextChanged.connect(self._refresh_easy)
        filter_row.addWidget(self._easy_type_combo)
        filter_row.addStretch()
        layout.addLayout(filter_row)

        self._easy_table = QTableWidget(0, 4)
        self._easy_table.setHorizontalHeaderLabels(["Name", "Type", "Current Rank", "Mastery XP Left"])
        for i in range(4):
            self._easy_table.horizontalHeader().setSectionResizeMode(i, QHeaderView.Interactive)
        apply_saved_widths(self._easy_table, "mastery_easy_table", [250, 110, 110, 120])
        remember_widths(self._easy_table, "mastery_easy_table")
        self._easy_table.setAlternatingRowColors(True)
        self._easy_table.setEditTriggers(QTableWidget.NoEditTriggers)
        self._easy_table.setSortingEnabled(True)
        self._easy_table.sortByColumn(0, Qt.AscendingOrder)
        self._easy_table.verticalHeader().setVisible(False)
        self._easy_table.setStyleSheet(
            f"background:{BG_PANEL}; color:{FG}; gridline-color:{BORDER};"
            f"QHeaderView::section{{background:{BG_CARD};color:{DIM};}}"
        )
        layout.addWidget(self._easy_table)
        return w

    # --------------------------------------------------------------- Relics tab

    def _build_relics_tab(self):
        w = QWidget()
        layout = QVBoxLayout(w)
        layout.setContentsMargins(4, 4, 4, 4)
        layout.setSpacing(4)

        hint = QLabel(
            "Unleveled prime items whose parts you can build entirely from relics you currently own."
        )
        hint.setStyleSheet(f"color:{DIM}; font-size:11px;")
        hint.setWordWrap(True)
        layout.addWidget(hint)

        filter_row = QHBoxLayout()
        filter_row.addWidget(QLabel("Filter type:"))
        self._relic_type_combo = QComboBox()
        self._relic_type_combo.addItems(["All"] + sorted(MASTERY_TYPES))
        self._relic_type_combo.currentTextChanged.connect(self._refresh_relics)
        filter_row.addWidget(self._relic_type_combo)
        filter_row.addStretch()
        layout.addLayout(filter_row)

        self._relics_table = QTableWidget(0, 5)
        self._relics_table.setHorizontalHeaderLabels(
            ["Name", "Type", "MR Req", "Parts Owned", "Parts Missing"]
        )
        for i in range(5):
            self._relics_table.horizontalHeader().setSectionResizeMode(i, QHeaderView.Interactive)
        apply_saved_widths(self._relics_table, "mastery_relics_table", [220, 110, 60, 90, 180])
        remember_widths(self._relics_table, "mastery_relics_table")
        self._relics_table.setAlternatingRowColors(True)
        self._relics_table.setEditTriggers(QTableWidget.NoEditTriggers)
        self._relics_table.setSortingEnabled(True)
        self._relics_table.sortByColumn(0, Qt.AscendingOrder)
        self._relics_table.verticalHeader().setVisible(False)
        self._relics_table.setStyleSheet(
            f"background:{BG_PANEL}; color:{FG}; gridline-color:{BORDER};"
            f"QHeaderView::section{{background:{BG_CARD};color:{DIM};}}"
        )
        layout.addWidget(self._relics_table)
        return w

    # --------------------------------------------------------------- Never tab

    def _build_never_tab(self):
        w = QWidget()
        layout = QVBoxLayout(w)
        layout.setContentsMargins(4, 4, 4, 4)
        layout.setSpacing(4)

        hint = QLabel(
            "Items you've never leveled. Sorted by cheapest to obtain with platinum."
        )
        hint.setStyleSheet(f"color:{DIM}; font-size:11px;")
        hint.setWordWrap(True)
        layout.addWidget(hint)

        filter_row = QHBoxLayout()
        filter_row.addWidget(QLabel("Filter type:"))
        self._never_type_combo = QComboBox()
        self._never_type_combo.addItems(["All"] + sorted(MASTERY_TYPES))
        self._never_type_combo.currentTextChanged.connect(self._refresh_never)
        filter_row.addWidget(self._never_type_combo)
        filter_row.addStretch()
        layout.addLayout(filter_row)

        self._never_table = QTableWidget(0, 5)
        self._never_table.setHorizontalHeaderLabels(
            ["Name", "Type", "MR Req", "Parts Owned", "Buy Cost (plat)"]
        )
        for i in range(5):
            self._never_table.horizontalHeader().setSectionResizeMode(i, QHeaderView.Interactive)
        apply_saved_widths(self._never_table, "mastery_never_table", [220, 110, 60, 90, 110])
        remember_widths(self._never_table, "mastery_never_table")
        self._never_table.setAlternatingRowColors(True)
        self._never_table.setEditTriggers(QTableWidget.NoEditTriggers)
        self._never_table.setSortingEnabled(True)
        self._never_table.sortByColumn(0, Qt.AscendingOrder)
        self._never_table.verticalHeader().setVisible(False)
        self._never_table.setStyleSheet(
            f"background:{BG_PANEL}; color:{FG}; gridline-color:{BORDER};"
            f"QHeaderView::section{{background:{BG_CARD};color:{DIM};}}"
        )
        layout.addWidget(self._never_table)
        return w

    # ---------------------------------------------------------------- Data load

    def _load_data(self):
        inv = _load(WFINFO_DIR / "inventory.json", {})
        wfcd = _load(WFINFO_DIR / "wfcd_all_cache.json", [])
        owned_parts = _load(WFINFO_DIR / "owned_items.json", {})
        owned_relics = _load(WFINFO_DIR / "owned_relics.json", {})
        prices_raw = _load(WFINFO_DIR / "prices.json", [])

        self._prices = {
            p["name"].lower(): float(p.get("custom_avg") or 0)
            for p in prices_raw if isinstance(p, dict) and "name" in p
        }

        # XPInfo lookup
        xpi = {x["ItemType"]: x["XP"] for x in inv.get("XPInfo", [])}

        # Owned uniqueNames (in inventory right now)
        owned_unames = set()
        for slot in INV_SLOTS:
            for item in inv.get(slot, []):
                owned_unames.add(item.get("ItemType", ""))

        # WFCD masterable items
        self._wfcd_items = {}
        for item in wfcd:
            if not isinstance(item, dict):
                continue
            uname = item.get("uniqueName", "")
            itype = item.get("type", "")
            if not uname or itype not in MASTERY_TYPES:
                continue
            self._wfcd_items[uname] = item

        # Build relic parts index: part name -> list of (era, relic_code, rarity)
        relic_data = _load(WFINFO_DIR / "filtered_items.json", {}).get("relics", {})
        part_to_relics = {}
        RARITY_FIELDS = {
            "rare1": "Rare", "uncommon1": "Uncommon", "uncommon2": "Uncommon",
            "common1": "Common", "common2": "Common", "common3": "Common",
        }
        for era, relics in relic_data.items():
            for rcode, relic in relics.items():
                for field, rarity in RARITY_FIELDS.items():
                    part = relic.get(field, "")
                    if part:
                        part_to_relics.setdefault(part, []).append(
                            (era, rcode, rarity, owned_relics.get(f"{era} {rcode}", {}).get("owned", 0))
                        )

        # ---- EASY: owned + not rank 30 ----
        self._easy_items = []
        for uname in owned_unames:
            xp = xpi.get(uname, 0)
            if 0 < xp < MAX_XP:
                item = self._wfcd_items.get(uname)
                if not item:
                    continue  # skip items not in WFCD (internal/test items)
                name = item.get("name", "")
                itype = item.get("type", "Unknown")
                if not name or itype not in MASTERY_TYPES:
                    continue
                rank = _xp_to_rank(xp)
                xp_left = MAX_XP - xp
                self._easy_items.append({
                    "name": name, "type": itype, "rank": rank, "xp_left": xp_left
                })

        self._easy_items.sort(key=lambda x: x["xp_left"])

        # ---- FROM RELICS: prime items never leveled, buildable from owned relics ----
        self._relic_items = []
        for item in wfcd:
            if not isinstance(item, dict):
                continue
            uname = item.get("uniqueName", "")
            name = item.get("name", "")
            itype = item.get("type", "")
            if itype not in MASTERY_TYPES:
                continue
            if "Prime" not in name:
                continue
            # Skip if already leveled
            if xpi.get(uname, 0) > 0:
                continue
            components = item.get("components", [])
            if not components:
                continue

            parts_owned = 0
            parts_missing = []
            relic_buildable = True

            parts_from_owned_relic = 0
            for comp in components:
                cname_base = comp.get("name", "")
                if not cname_base or cname_base in ("Orokin Cell", "Forma"):
                    continue
                full_part = f"{name} {cname_base}"
                count = owned_parts.get(full_part, 0)
                if count and int(count) >= 1:
                    parts_owned += 1
                else:
                    # Check if any owned relic drops this part
                    relics_for_part = part_to_relics.get(full_part, [])
                    owned_relic_drops = [r for r in relics_for_part if r[3] > 0]
                    if owned_relic_drops:
                        parts_from_owned_relic += 1
                    else:
                        relic_buildable = False  # at least one part not in any owned relic
                    parts_missing.append(full_part)

            # Show if ANY missing part can come from owned relics
            # (relic_buildable=True means ALL missing parts are coverable)
            has_relic_parts = parts_from_owned_relic > 0
            if has_relic_parts and parts_missing:
                mr_req = item.get("masteryReq", 0) or 0
                self._relic_items.append({
                    "name": name, "type": itype, "mr_req": mr_req,
                    "parts_owned": parts_owned,
                    "parts_missing": parts_missing,
                    "missing_count": len(parts_missing),
                    "fully_coverable": relic_buildable,
                    "relic_parts_available": parts_from_owned_relic,
                })

        # Sort: fully coverable first, then by missing count
        self._relic_items.sort(key=lambda x: (0 if x["fully_coverable"] else 1, x["missing_count"]))

        # ---- NEVER OWNED: items never in XPInfo ----
        self._never_items = []
        for item in wfcd:
            if not isinstance(item, dict):
                continue
            uname = item.get("uniqueName", "")
            name = item.get("name", "")
            itype = item.get("type", "")
            if itype not in MASTERY_TYPES:
                continue
            if xpi.get(uname, 0) > 0:
                continue
            if uname in owned_unames:
                continue  # own it but 0 XP — skip (show in easy once leveled a bit)

            components = item.get("components", [])
            parts_owned_count = 0
            buy_cost = 0.0
            real_parts = 0

            for comp in components:
                cname_base = comp.get("name", "")
                if not cname_base or cname_base in ("Orokin Cell", "Forma"):
                    continue
                full_part = f"{name} {cname_base}"
                count = owned_parts.get(full_part, 0)
                real_parts += 1
                if count and int(count) >= 1:
                    parts_owned_count += 1
                else:
                    # Try both "Name Component" and "Name Component Blueprint"
                    price = self._prices.get(full_part.lower(), 0)
                    if not price:
                        price = self._prices.get((full_part + " Blueprint").lower(), 0)
                    buy_cost += price

            mr_req = item.get("masteryReq", 0) or 0
            self._never_items.append({
                "name": name, "type": itype, "mr_req": mr_req,
                "parts_owned": parts_owned_count,
                "real_parts": real_parts,
                "buy_cost": buy_cost,
            })

        self._never_items.sort(key=lambda x: x["buy_cost"] if x["buy_cost"] > 0 else 999999)

        # Summary
        mr = inv.get("PlayerLevel", 0)
        total_masterable = len(self._easy_items) + len([i for i in self._never_items if not i["buy_cost"]])
        self._summary.setText(
            f"MR {mr}  ·  {len(self._easy_items)} items to level now  ·  "
            f"{len(self._relic_items)} buildable from owned relics  ·  "
            f"{len(self._never_items)} never leveled"
        )

        self._refresh_easy()
        self._refresh_relics()
        self._refresh_never()

    # --------------------------------------------------------------- Refreshes

    def _refresh_easy(self):
        ftype = self._easy_type_combo.currentText()
        rows = [r for r in self._easy_items if ftype == "All" or r["type"] == ftype]
        self._easy_table.setSortingEnabled(False)
        self._easy_table.setRowCount(0)
        for r in rows:
            i = self._easy_table.rowCount()
            self._easy_table.insertRow(i)
            self._easy_table.setItem(i, 0, QTableWidgetItem(r["name"]))
            self._easy_table.setItem(i, 1, QTableWidgetItem(r["type"]))
            rank_item = QTableWidgetItem()
            rank_item.setData(Qt.DisplayRole, r["rank"])
            self._easy_table.setItem(i, 2, rank_item)
            xp_item = QTableWidgetItem()
            xp_item.setData(Qt.DisplayRole, r["xp_left"])
            self._easy_table.setItem(i, 3, xp_item)
            # Color code by rank
            if r["rank"] >= 25:
                color = QColor("#1a5c2a")  # nearly done — green
            elif r["rank"] >= 15:
                color = QColor("#5c4a00")  # halfway — yellow
            else:
                color = QColor("#1a2e55")  # low rank — neutral
            for col in range(4):
                item = self._easy_table.item(i, col)
                if item:
                    item.setBackground(color)
                    if col == 0:
                        item.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter)
                    else:
                        item.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
        self._easy_table.setSortingEnabled(True)

    def _refresh_relics(self):
        ftype = self._relic_type_combo.currentText()
        rows = [r for r in self._relic_items if ftype == "All" or r["type"] == ftype]
        self._relics_table.setSortingEnabled(False)
        self._relics_table.setRowCount(0)
        for r in rows:
            i = self._relics_table.rowCount()
            self._relics_table.insertRow(i)
            self._relics_table.setItem(i, 0, QTableWidgetItem(r["name"]))
            self._relics_table.setItem(i, 1, QTableWidgetItem(r["type"]))
            mr_item = QTableWidgetItem()
            mr_item.setData(Qt.DisplayRole, r["mr_req"])
            self._relics_table.setItem(i, 2, mr_item)
            owned_item = QTableWidgetItem()
            owned_item.setData(Qt.DisplayRole, r["parts_owned"])
            self._relics_table.setItem(i, 3, owned_item)
            self._relics_table.setItem(i, 4, QTableWidgetItem(", ".join(r["parts_missing"])))
            # Color: fully covered by owned relics = green, partial = yellow, needs other = neutral
            if r["fully_coverable"]:
                color = QColor("#1a5c2a")
            elif r["relic_parts_available"] > 0:
                color = QColor("#5c4a00")
            else:
                color = QColor("#1a2e55")
            for col in range(5):
                item = self._relics_table.item(i, col)
                if item:
                    item.setBackground(color)
                    if col == 0:
                        item.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter)
                    else:
                        item.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
        self._relics_table.setSortingEnabled(True)

    def _refresh_never(self):
        ftype = self._never_type_combo.currentText()
        rows = [r for r in self._never_items if ftype == "All" or r["type"] == ftype]
        self._never_table.setSortingEnabled(False)
        self._never_table.setRowCount(0)
        for r in rows:
            i = self._never_table.rowCount()
            self._never_table.insertRow(i)
            self._never_table.setItem(i, 0, QTableWidgetItem(r["name"]))
            self._never_table.setItem(i, 1, QTableWidgetItem(r["type"]))
            mr_item = QTableWidgetItem()
            mr_item.setData(Qt.DisplayRole, r["mr_req"])
            self._never_table.setItem(i, 2, mr_item)
            parts_str = f"{r['parts_owned']}/{r['real_parts']}" if r["real_parts"] else "—"
            self._never_table.setItem(i, 3, QTableWidgetItem(parts_str))
            cost = r["buy_cost"]
            cost_item = QTableWidgetItem()
            if cost > 0:
                cost_item.setData(Qt.DisplayRole, round(cost, 1))
                cost_item.setData(Qt.DisplayRole, f"{cost:.0f}p")
            else:
                cost_item.setText("free / relic")
            self._never_table.setItem(i, 4, cost_item)
            # Color: free = green, cheap = yellow, expensive = neutral
            if cost == 0:
                color = QColor("#1a5c2a")
            elif cost < 50:
                color = QColor("#5c4a00")
            else:
                color = QColor("#1a2e55")
            for col in range(5):
                item = self._never_table.item(i, col)
                if item:
                    item.setBackground(color)
                    if col == 0:
                        item.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter)
                    else:
                        item.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
        self._never_table.setSortingEnabled(True)
