#!/usr/bin/env python3
"""Foundry planner tab: shows craftable equipment and missing parts based on `owned_items.json` and `filtered_items.json`."""
import json
from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QCheckBox,
    QTableWidget, QTableWidgetItem, QHeaderView
)
from column_persistence import apply_saved_widths, remember_widths, align_columns


class FoundryTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._owned = {}
        self._eqmt = {}
        self._setup_ui()
        self._load()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        top = QHBoxLayout()
        top.addWidget(QLabel("Search:"))
        self._search = QLineEdit()
        self._search.textChanged.connect(self._filter)
        top.addWidget(self._search)
        self._only_missing = QCheckBox("Only show missing / not craftable")
        self._only_missing.stateChanged.connect(self._filter)
        top.addWidget(self._only_missing)
        layout.addLayout(top)

        self._table = QTableWidget(0, 4)
        self._table.setHorizontalHeaderLabels(["Name", "Required", "Missing", "Can Craft"])
        for col in range(4):
            self._table.horizontalHeader().setSectionResizeMode(col, QHeaderView.Interactive)
        apply_saved_widths(self._table, "foundry_table", [260, 90, 90, 90])
        remember_widths(self._table, "foundry_table")
        self._table.setSortingEnabled(True)
        self._table.verticalHeader().setVisible(False)
        self._table.sortByColumn(0, Qt.AscendingOrder)
        layout.addWidget(self._table)

        self._status = QLabel("")
        layout.addWidget(self._status)

    def _load(self):
        base = Path(__file__).parent
        try:
            self._owned = json.loads((base / 'owned_items.json').read_text())
        except Exception:
            self._owned = {}
        try:
            filt = json.loads((base / 'filtered_items.json').read_text())
            self._eqmt = filt.get('eqmt') or {}
        except Exception:
            self._eqmt = {}

        was_sorting = self._table.isSortingEnabled()
        self._table.setSortingEnabled(False)
        self._table.setRowCount(0)
        names = sorted(self._eqmt.keys())
        for n in names:
            self._add_row(n, self._eqmt.get(n) or {})
        self._table.setSortingEnabled(was_sorting)

        self._status.setText(f"Loaded {len(names)} equipment entries")

    def _add_row(self, name, eq):
        parts = eq.get('parts') or {}
        req_list = []
        missing_total = 0
        for p, pdata in parts.items():
            try:
                req = int(pdata.get('count')) if isinstance(pdata, dict) and 'count' in pdata else 1
            except Exception:
                req = 1
            owned = 0
            try:
                owned = int(self._owned.get(p, 0))
            except Exception:
                owned = 0
            miss = max(0, req - owned)
            missing_total += miss
            req_list.append(f"{p} x{req}")

        r = self._table.rowCount()
        self._table.insertRow(r)
        _i0 = QTableWidgetItem(name)
        _i0.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter)
        self._table.setItem(r, 0, _i0)
        _i1 = QTableWidgetItem(', '.join(req_list))
        _i1.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
        self._table.setItem(r, 1, _i1)
        _i2 = QTableWidgetItem(str(missing_total))
        _i2.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
        self._table.setItem(r, 2, _i2)
        can = 'Yes' if missing_total == 0 else 'No'
        _i3 = QTableWidgetItem(can)
        _i3.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
        self._table.setItem(r, 3, _i3)

    def _filter(self, *_):
        q = self._search.text().strip().lower()
        only_missing = self._only_missing.isChecked()
        for r in range(self._table.rowCount()):
            name_item = self._table.item(r, 0)
            missing_item = self._table.item(r, 2)
            name = name_item.text().lower() if name_item else ''
            miss = 0
            try:
                miss = int(missing_item.text())
            except Exception:
                miss = 0
            visible = True
            if q and q not in name:
                visible = False
            if only_missing and miss == 0:
                visible = False
            self._table.setRowHidden(r, not visible)

    def get_selected(self):
        r = self._table.currentRow()
        if r < 0:
            return None
        return self._table.item(r, 0).text()
