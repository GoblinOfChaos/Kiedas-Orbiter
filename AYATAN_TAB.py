#!/usr/bin/env python3
"""Ayatan Sculptures tab: shows every sculpture with owned counts and where
to farm them. Filter to show only missing.

Note: this tracks ownership only, not the "optimal star fill" solver idea
from the original feature request - that needs per-sculpture socket
capacity and Ayatan Star endo values cross-referenced, which wasn't
verified as cleanly available and is left as a possible follow-up."""
import json
from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QCheckBox,
    QTableWidget, QTableWidgetItem, QHeaderView
)
from column_persistence import apply_saved_widths, remember_widths


class AyatanTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._owned = {}
        self._sculptures = []
        self._setup_ui()
        self._load()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        header = QHBoxLayout()
        header.addWidget(QLabel("Search:"))
        self._search = QLineEdit()
        self._search.setPlaceholderText("Search sculptures...")
        self._search.textChanged.connect(self._filter)
        header.addWidget(self._search)

        self._hide_owned = QCheckBox("Hide owned sculptures")
        self._hide_owned.stateChanged.connect(self._filter)
        header.addWidget(self._hide_owned)

        layout.addLayout(header)

        self._table = QTableWidget(0, 3)
        self._table.setHorizontalHeaderLabels(["Name", "Drop Location", "Owned"])
        for col in range(3):
            self._table.horizontalHeader().setSectionResizeMode(col, QHeaderView.Interactive)
        apply_saved_widths(self._table, "ayatan_table", [220, 320, 70])
        remember_widths(self._table, "ayatan_table")
        self._table.setSortingEnabled(True)
        self._table.verticalHeader().setVisible(False)
        self._table.sortByColumn(0, Qt.AscendingOrder)
        layout.addWidget(self._table)

        self._status = QLabel("")
        layout.addWidget(self._status)

    def _load(self):
        base = Path(__file__).parent
        inventory = self._load_json(base / 'inventory.json') or {}
        # Sculptures can be owned in multiple socket-fill states (same
        # uniqueName, different "Sockets" value) - sum all copies together
        # for a total-owned count.
        self._owned = {}
        for u in inventory.get('FusionTreasures', []):
            if isinstance(u, dict) and u.get('ItemType'):
                self._owned[u['ItemType']] = self._owned.get(u['ItemType'], 0) + u.get('ItemCount', 0)

        wfcd = self._load_json(base / 'wfcd_all_cache.json') or []
        items = wfcd if isinstance(wfcd, list) else (wfcd.get('items') or wfcd.get('data') or [])

        self._sculptures = []
        for item in items:
            if not isinstance(item, dict) or item.get('type') != 'Ayatan Sculpture':
                continue
            uname = item.get('uniqueName', '')
            name = item.get('name', '')
            if not uname or not name:
                continue
            locations = sorted({d.get('location') for d in (item.get('drops') or []) if d.get('location')})
            drop_location = '; '.join(locations) if locations else 'No drop data (check wiki)'
            self._sculptures.append({
                'name': name, 'drop_location': drop_location,
                'owned': self._owned.get(uname, 0),
            })

        self._sculptures.sort(key=lambda s: s['name'])
        self._populate_table(self._sculptures)
        self._status.setText(f"Loaded {len(self._sculptures)} Ayatan sculptures")

    def _load_json(self, path):
        try:
            with path.open() as fh:
                return json.load(fh)
        except Exception:
            return None

    def _populate_table(self, sculptures):
        self._table.setSortingEnabled(False)
        self._table.setRowCount(0)
        for s in sculptures:
            r = self._table.rowCount()
            self._table.insertRow(r)
            _a0 = QTableWidgetItem(s['name']); _a0.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter); self._table.setItem(r, 0, _a0)
            _a1 = QTableWidgetItem(s['drop_location']); _a1.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter); self._table.setItem(r, 1, _a1)
            owned_item = QTableWidgetItem()
            owned_item.setData(Qt.DisplayRole, s['owned'])
            owned_item.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
            if s['owned'] > 0:
                owned_item.setForeground(Qt.cyan)
            self._table.setItem(r, 2, owned_item)
        self._table.setSortingEnabled(True)

    def _filter(self, *_):
        q = self._search.text().strip().lower()
        hide_owned = self._hide_owned.isChecked()
        for r in range(self._table.rowCount()):
            name_item = self._table.item(r, 0)
            drop_item = self._table.item(r, 1)
            owned_item = self._table.item(r, 2)
            name = name_item.text().lower() if name_item else ''
            drop_location = drop_item.text().lower() if drop_item else ''
            owned = owned_item.data(Qt.DisplayRole) if owned_item else 0
            visible = True
            if q and q not in name and q not in drop_location:
                visible = False
            if hide_owned and (owned or 0) > 0:
                visible = False
            self._table.setRowHidden(r, not visible)
