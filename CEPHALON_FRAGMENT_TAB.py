#!/usr/bin/env python3
"""Cephalon Fragments tab: a log of Lore Fragments you've found, grouped by
region. This still can't be a completionist "missing" tracker in the
sense of showing every un-found fragment (fragments spawn in a random
spot each mission rather than a fixed location, so there's nothing
concrete to point you toward) - but the wiki's Fragment page DOES
document a fixed "Scans Required" target per region tier (3 for Earth/
Venus, 5 for most other planets, 7 for the "deep" set: Pluto/Deimos/
Eris/Sedna), verified live 2026-07-22 against Jacob's own save data
(observed per-region max Progress values line up with these targets,
occasionally slightly over from harmless duplicate re-scans past
completion). That target lets "Times Scanned" become a real completion
check instead of a bare unlabeled number.

No wfcd catalog entry exists for fragment names, so names are humanized
from the item path, the same fallback Mod Collection uses for mods wfcd
doesn't have a name for.

Somachord Fragments have no data source anywhere (not in inventory.json,
not in the wfcd catalog) and aren't covered here."""
import json
import re
from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtGui import QColor
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QTableWidget, QTableWidgetItem, QHeaderView, QComboBox, QAbstractItemView
)
from column_persistence import apply_saved_widths, remember_widths
from paths import get_inventory_path
from theme import get_palette

# Scans-required target per region tier, from the wiki's Fragment page
# (https://wiki.warframe.com/w/Fragment) - each planet has 2-3 fragment
# "topics" that all share the same target within that planet.
REGION_SCAN_TARGETS = {
    "Earth": 3, "Venus": 3,
    "Mercury": 5, "Mars": 5, "Phobos": 5, "Ceres": 5, "Jupiter": 5,
    "Europa": 5, "Void": 5, "Saturn": 5, "Uranus": 5, "Neptune": 5,
    "Lua": 5, "Moon": 5,
    "Pluto": 7, "Deimos": 7, "Eris": 7, "Sedna": 7,
}


def _humanize_name(item_type):
    leaf = item_type.split('/')[-1]
    leaf = re.sub(r'^(Lore)?Fragment', '', leaf)
    leaf = leaf.replace('Fragment', ' Fragment')
    return re.sub(r'([a-z])([A-Z])', r'\1 \2', leaf).replace('  ', ' ').strip() or leaf


def _humanize_region(region):
    if not region:
        return 'Unknown'
    leaf = region.split('/')[-1]
    leaf = re.sub(r'(Region|SolarMap)?Name$', '', leaf)
    leaf = re.sub(r'^SolarMap', '', leaf)
    leaf = re.sub(r'([a-z])([A-Z])', r'\1 \2', leaf).strip()
    return leaf or region


class CephalonFragmentTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._fragments = []
        self._setup_ui()
        self._load()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        header = QHBoxLayout()
        header.addWidget(QLabel("Region:"))
        self._region_combo = QComboBox()
        self._region_combo.currentIndexChanged.connect(self._filter)
        header.addWidget(self._region_combo)

        header.addWidget(QLabel("Search:"))
        self._search = QLineEdit()
        self._search.setPlaceholderText("Search fragments...")
        self._search.textChanged.connect(self._filter)
        header.addWidget(self._search)

        layout.addLayout(header)

        self._table = QTableWidget(0, 4)
        self._table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self._table.setHorizontalHeaderLabels(["Name", "Region", "Times Scanned", "Status"])
        for col in range(4):
            self._table.horizontalHeader().setSectionResizeMode(col, QHeaderView.Interactive)
        apply_saved_widths(self._table, "cephalon_fragment_table", [260, 140, 110, 120])
        remember_widths(self._table, "cephalon_fragment_table")
        self._table.setSortingEnabled(True)
        self._table.verticalHeader().setVisible(False)
        self._table.sortByColumn(1, Qt.AscendingOrder)
        layout.addWidget(self._table)

        self._status = QLabel("")
        layout.addWidget(self._status)

    def _load(self):
        base = Path(__file__).parent
        inventory = self._load_json(get_inventory_path()) or {}
        scans = inventory.get('LoreFragmentScans', [])

        self._fragments = []
        complete_count = 0
        for s in scans:
            if not isinstance(s, dict):
                continue
            item_type = s.get('ItemType', '')
            if not item_type:
                continue
            region = _humanize_region(s.get('Region', ''))
            progress = s.get('Progress', 0)
            target = REGION_SCAN_TARGETS.get(region)
            complete = target is not None and progress >= target
            if complete:
                complete_count += 1
            self._fragments.append({
                'name': _humanize_name(item_type),
                'region': region,
                'progress': progress,
                'target': target,
                'complete': complete,
            })

        self._fragments.sort(key=lambda f: (f['region'], f['name']))
        self._populate_region_combo()
        self._populate_table(self._fragments)
        self._status.setText(
            f"{len(self._fragments)} fragments found, {complete_count} complete "
            f"(fragments spawn randomly per mission rather than a fixed spot, "
            f"so there's nothing concrete to point you toward for what's still missing)"
        )

    def _load_json(self, path):
        try:
            with path.open() as fh:
                return json.load(fh)
        except Exception:
            return None

    def _populate_region_combo(self):
        regions = sorted({f['region'] for f in self._fragments})
        self._region_combo.blockSignals(True)
        self._region_combo.clear()
        self._region_combo.addItem("All Regions", None)
        for region in regions:
            self._region_combo.addItem(region, region)
        self._region_combo.blockSignals(False)

    def _populate_table(self, fragments):
        self._table.setSortingEnabled(False)
        self._table.setRowCount(0)
        for f in fragments:
            r = self._table.rowCount()
            self._table.insertRow(r)
            _a0 = QTableWidgetItem(f['name']); _a0.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter); self._table.setItem(r, 0, _a0)
            _a1 = QTableWidgetItem(f['region']); _a1.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter); self._table.setItem(r, 1, _a1)
            target = f['target']
            progress_text = f"{f['progress']}/{target}" if target else str(f['progress'])
            progress_item = QTableWidgetItem(progress_text)
            progress_item.setData(Qt.UserRole, f['progress'])
            progress_item.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
            self._table.setItem(r, 2, progress_item)
            if target:
                status_text = "Complete ✓" if f['complete'] else "In Progress"
            else:
                status_text = "Unknown target"
            status_item = QTableWidgetItem(status_text)
            status_item.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
            p = get_palette()
            if f['complete']:
                status_item.setForeground(QColor(p['green']))
            elif target:
                status_item.setForeground(QColor(p['red']))
            self._table.setItem(r, 3, status_item)
        self._table.setSortingEnabled(True)
        self._filter()

    def _filter(self, *_):
        q = self._search.text().strip().lower()
        selected_region = self._region_combo.currentData()
        for r in range(self._table.rowCount()):
            name_item = self._table.item(r, 0)
            region_item = self._table.item(r, 1)
            name = name_item.text().lower() if name_item else ''
            region = region_item.text() if region_item else ''
            visible = True
            if q and q not in name:
                visible = False
            if selected_region is not None and region != selected_region:
                visible = False
            self._table.setRowHidden(r, not visible)
