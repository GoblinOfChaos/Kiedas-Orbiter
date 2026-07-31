#!/usr/bin/env python3
"""Arcane tab: shows all arcanes (Warframe/Melee/Primary/Secondary/Operator/
Amp/Zaw/Kitgun/Bow/Shotgun) with owned counts. Filter to show only missing.

Unlike mods, arcanes live directly in wfcd_all_cache.json (both catalog
and drop data), not a separate ExportUpgrades/ExportModSet source - and
their inventory ownership is tracked the same way as mods, under
inventory.json's RawUpgrades (arcanes and mods share the same
/Lotus/Upgrades/... path namespace in the game's own data)."""
import json
from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QCheckBox,
    QComboBox, QTableWidget, QTableWidgetItem, QHeaderView, QAbstractItemView
)
from paths import get_inventory_path
from column_persistence import apply_saved_widths, remember_widths
from wiki_links import build_wiki_url, open_wiki_url
from drop_data import find_drop_info

# wfcd_all_cache.json contains leftover unimplemented/test entries under
# real arcane types - confirmed live 2026-07-21 against the actual wiki
# (https://wiki.warframe.com/w/Arcane): none of these are real arcanes.
FAKE_ARCANE_NAMES = {
    "Arcane Defense", "Arcane Detoxifier", "Arcane Liquid",
    "Arcane Protection", "Arcane Shield", "Arcane Survival",
    "Arcane Temperance",
}

ARCANE_TYPES = {
    'Arcane', 'Amp Arcane', 'Bow Arcane', 'Kitgun Arcane', 'Melee Arcane',
    'Operator Arcane', 'Primary Arcane', 'Secondary Arcane',
    'Shotgun Arcane', 'Warframe Arcane', 'Zaw Arcane',
}


class ArcaneTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._owned = {}
        self._arcanes = []
        self._setup_ui()
        self._load()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        header = QHBoxLayout()
        header.addWidget(QLabel("Search:"))
        self._search = QLineEdit()
        self._search.setPlaceholderText("Search arcanes...")
        self._search.textChanged.connect(self._filter)
        header.addWidget(self._search)

        header.addWidget(QLabel("Type:"))
        self._type_filter = QComboBox()
        self._type_filter.addItem("All")
        self._type_filter.currentIndexChanged.connect(self._filter)
        header.addWidget(self._type_filter)

        self._hide_owned = QCheckBox("Hide owned arcanes")
        self._hide_owned.stateChanged.connect(self._filter)
        header.addWidget(self._hide_owned)

        layout.addLayout(header)

        self._table = QTableWidget(0, 6)
        self._table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self._table.setHorizontalHeaderLabels([
            "Name", "Type", "Rarity", "Drop Location", "Owned", "Wiki"
        ])
        for col in range(6):
            self._table.horizontalHeader().setSectionResizeMode(col, QHeaderView.Interactive)
        apply_saved_widths(self._table, "arcane_table", [220, 130, 70, 320, 60, 70])
        remember_widths(self._table, "arcane_table")
        self._table.setSortingEnabled(True)
        self._table.verticalHeader().setVisible(False)
        self._table.sortByColumn(0, Qt.AscendingOrder)
        self._table.cellClicked.connect(self._on_cell_clicked)
        layout.addWidget(self._table)

        self._status = QLabel("")
        layout.addWidget(self._status)

    def _load(self):
        base = Path(__file__).parent
        inventory = self._load_json(get_inventory_path()) or {}
        self._owned = {
            u['ItemType']: u.get('ItemCount', 0)
            for u in inventory.get('RawUpgrades', [])
            if isinstance(u, dict) and u.get('ItemType')
        }

        wfcd = self._load_json(base / 'wfcd_all_cache.json') or []
        items = wfcd if isinstance(wfcd, list) else (wfcd.get('items') or wfcd.get('data') or [])

        # Keyed by name (not uniqueName) - confirmed live 2026-07-21 that
        # "Arcane Steadfast" appeared 5 times identically in the table.
        # wfcd_all_cache.json genuinely has 5 different internal
        # uniqueNames for it (separate per-rank listeners), same display
        # name/rarity/drop location - a real display duplication bug, not
        # 5 distinct arcanes. Summing owned counts across the duplicates
        # rather than just keeping the first, in case ownership happens to
        # be tracked under a different one of the variant uniqueNames.
        by_name = {}
        types_seen = set()
        for item in items:
            if not isinstance(item, dict):
                continue
            if item.get('type') not in ARCANE_TYPES:
                continue
            uname = item.get('uniqueName', '')
            name = item.get('name', '')
            if not uname or not name or name in FAKE_ARCANE_NAMES:
                continue
            atype = item.get('type', '')
            types_seen.add(atype)
            rarity = item.get('rarity', '')
            locations = sorted({d.get('location') for d in (item.get('drops') or []) if d.get('location')})
            drop_location = '; '.join(locations) if locations else (find_drop_info(name) or 'No drop data (check wiki)')
            owned_count = self._owned.get(uname, 0)
            if name in by_name:
                by_name[name]['owned'] += owned_count
            else:
                by_name[name] = {
                    'name': name, 'type': atype, 'rarity': rarity,
                    'drop_location': drop_location, 'owned': owned_count,
                }

        self._arcanes = list(by_name.values())
        self._arcanes.sort(key=lambda a: a['name'])
        self._type_filter.blockSignals(True)
        for t in sorted(types_seen):
            self._type_filter.addItem(t)
        self._type_filter.blockSignals(False)

        self._populate_table(self._arcanes)
        self._status.setText(f"Loaded {len(self._arcanes)} arcanes")

    def _load_json(self, path):
        try:
            with path.open() as fh:
                return json.load(fh)
        except Exception:
            return None

    def _populate_table(self, arcanes):
        self._table.setSortingEnabled(False)
        self._table.setRowCount(0)
        for a in arcanes:
            r = self._table.rowCount()
            self._table.insertRow(r)
            _a0 = QTableWidgetItem(a['name']); _a0.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter); self._table.setItem(r, 0, _a0)
            _a1 = QTableWidgetItem(a['type']); _a1.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter); self._table.setItem(r, 1, _a1)
            _a2 = QTableWidgetItem(a['rarity']); _a2.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter); self._table.setItem(r, 2, _a2)
            _a3 = QTableWidgetItem(a['drop_location']); _a3.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter); self._table.setItem(r, 3, _a3)
            owned_item = QTableWidgetItem()
            owned_item.setData(Qt.DisplayRole, a['owned'])
            owned_item.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
            if a['owned'] > 0:
                owned_item.setForeground(Qt.cyan)
            self._table.setItem(r, 4, owned_item)
            wiki_item = QTableWidgetItem("▷ Wiki")
            wiki_item.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
            wiki_item.setData(Qt.UserRole, build_wiki_url(a['name']))
            self._table.setItem(r, 5, wiki_item)
        self._table.setSortingEnabled(True)

    def _on_cell_clicked(self, row, column):
        if column != 5:
            return
        item = self._table.item(row, 5)
        url = item.data(Qt.UserRole) if item else None
        if url:
            open_wiki_url(url)

    def _filter(self, *_):
        q = self._search.text().strip().lower()
        hide_owned = self._hide_owned.isChecked()
        type_sel = self._type_filter.currentText()

        for r in range(self._table.rowCount()):
            name_item = self._table.item(r, 0)
            type_item = self._table.item(r, 1)
            drop_item = self._table.item(r, 3)
            owned_item = self._table.item(r, 4)
            name = name_item.text().lower() if name_item else ''
            typ = type_item.text() if type_item else ''
            drop_location = drop_item.text().lower() if drop_item else ''
            owned = owned_item.data(Qt.DisplayRole) if owned_item else 0

            visible = True
            if q and q not in name and q not in typ.lower() and q not in drop_location:
                visible = False
            if type_sel != "All" and typ != type_sel:
                visible = False
            if hide_owned and (owned or 0) > 0:
                visible = False
            self._table.setRowHidden(r, not visible)
