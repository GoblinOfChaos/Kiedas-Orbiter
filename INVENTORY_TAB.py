#!/usr/bin/env python3
"""Inventory tab: shows `owned_items.json` with search and simple filters."""
import json
from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtGui import QColor
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QCheckBox,
    QTableWidget, QTableWidgetItem, QHeaderView
)
from column_persistence import apply_saved_widths, remember_widths, align_columns


class InventoryTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._owned = {}
        self._setup_ui()
        self._load()

    def _setup_ui(self):
        layout = QVBoxLayout(self)

        top = QHBoxLayout()
        top.addWidget(QLabel("Search:"))
        self._search = QLineEdit()
        self._search.setPlaceholderText("Filter item names")
        self._search.textChanged.connect(self._filter)
        top.addWidget(self._search)

        self._hide_zero = QCheckBox("Hide zero-count items")
        self._hide_zero.stateChanged.connect(self._filter)
        top.addWidget(self._hide_zero)

        layout.addLayout(top)

        self._table = QTableWidget(0, 3)
        self._table.setHorizontalHeaderLabels(["Name", "Count", "Category"])
        for col in range(3):
            self._table.horizontalHeader().setSectionResizeMode(col, QHeaderView.Interactive)
        apply_saved_widths(self._table, "inventory_table", [260, 70, 140])
        remember_widths(self._table, "inventory_table")
        self._table.setSortingEnabled(True)
        self._table.verticalHeader().setVisible(False)
        self._table.sortByColumn(0, Qt.AscendingOrder)
        layout.addWidget(self._table)

        self._status = QLabel("")
        layout.addWidget(self._status)

    def _load(self):
        base = Path(__file__).parent
        owned_file = base / 'owned_items.json'
        try:
            with owned_file.open() as fh:
                self._owned = json.load(fh)
        except Exception:
            self._owned = {}

        # Try to load filtered_items to build category mapping (equipment, relics)
        self._category_for = {}
        try:
            filtered_file = Path(__file__).parent / 'filtered_items.json'
            if filtered_file.exists():
                with filtered_file.open() as fh:
                    filt = json.load(fh)
                # equipment mapping
                for eq_name, eq in (filt.get('eqmt') or {}).items():
                    parts = eq.get('parts') or {}
                    for p in parts.keys():
                        self._category_for[p] = eq_name
                    # also map equipment name itself
                    self._category_for[eq_name] = 'Equipment: ' + eq.get('type', '')
                # relic parts mapping
                for era, relics in (filt.get('relics') or {}).items():
                    for relic_name, relic in relics.items():
                        for field in ['rare1', 'uncommon1', 'uncommon2', 'common1', 'common2', 'common3']:
                            p = relic.get(field)
                            if p:
                                self._category_for[p] = f"Relic {era}: {relic_name}"
        except Exception:
            self._category_for = {}

        was_sorting = self._table.isSortingEnabled()
        self._table.setSortingEnabled(False)
        names = sorted(self._owned.keys())
        for n in names:
            self._add_row(n)
        self._table.setSortingEnabled(was_sorting)

        self._status.setText(f"Loaded {len(names)} items")
        align_columns(self._table, left_cols=(0,))

    def _add_row(self, name):
        try:
            cnt = int(self._owned.get(name, 0))
        except Exception:
            cnt = 0

        r = self._table.rowCount()
        self._table.insertRow(r)

        it = QTableWidgetItem(name)
        it.setFlags(Qt.ItemIsEnabled | Qt.ItemIsSelectable)
        it.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter)
        self._table.setItem(r, 0, it)

        ci = QTableWidgetItem(str(cnt))
        ci.setTextAlignment(Qt.AlignCenter)
        if cnt == 0:
            ci.setForeground(QColor('#888888'))
        self._table.setItem(r, 1, ci)

        # Category cell
        cat = self._category_for.get(name)
        cat_item = QTableWidgetItem(cat or "")
        cat_item.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
        self._table.setItem(r, 2, cat_item)

    def _filter(self, *_):
        q = self._search.text().strip().lower()
        hide_zero = self._hide_zero.isChecked()
        for r in range(self._table.rowCount()):
            name_item = self._table.item(r, 0)
            count_item = self._table.item(r, 1)
            name = name_item.text().lower() if name_item else ''
            cnt = 0
            try:
                cnt = int(count_item.text())
            except Exception:
                cnt = 0
            visible = True
            if q and q not in name:
                visible = False
            if hide_zero and cnt == 0:
                visible = False
            self._table.setRowHidden(r, not visible)

    def get_selected(self):
        r = self._table.currentRow()
        if r < 0:
            return None
        return self._table.item(r, 0).text()
