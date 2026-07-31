#!/usr/bin/env python3
"""Conservation Tags tab: shows every wildlife conservation tag (Deimos,
Solaris, etc.) with owned counts. Filter to show only missing."""
import json
from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QCheckBox,
    QTableWidget, QTableWidgetItem, QHeaderView, QAbstractItemView
)
from paths import get_inventory_path
from column_persistence import apply_saved_widths, remember_widths
from wiki_links import build_wiki_url, open_wiki_url

# Wiki-verified location + bait + day/night/Fass-Vome cycle info per
# animal (e.g. "Plains of Eidolon, Cetus side; needs Floof Boy Bait;
# night only") - added 2026-07-22 per Jacob's request ("if they need
# bait, and when during the planet cycle you can obtain them").
def _load_conservation_info():
    path = Path(__file__).parent / "component_overrides_conservation.json"
    try:
        return json.loads(path.read_text())
    except Exception:
        return {}

_CONSERVATION_INFO = _load_conservation_info()


class ConservationTagTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._owned = {}
        self._tags = []
        self._setup_ui()
        self._load()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        header = QHBoxLayout()
        header.addWidget(QLabel("Search:"))
        self._search = QLineEdit()
        self._search.setPlaceholderText("Search conservation tags...")
        self._search.textChanged.connect(self._filter)
        header.addWidget(self._search)

        self._hide_owned = QCheckBox("Hide owned tags")
        self._hide_owned.stateChanged.connect(self._filter)
        header.addWidget(self._hide_owned)

        layout.addLayout(header)

        self._table = QTableWidget(0, 4)
        self._table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self._table.setHorizontalHeaderLabels(["Name", "Location / Bait / Cycle", "Owned", "Wiki"])
        for col in range(4):
            self._table.horizontalHeader().setSectionResizeMode(col, QHeaderView.Interactive)
        apply_saved_widths(self._table, "conservation_tag_table", [260, 360, 70, 70])
        remember_widths(self._table, "conservation_tag_table")
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
            for u in inventory.get('MiscItems', [])
            if isinstance(u, dict) and u.get('ItemType')
        }

        wfcd = self._load_json(base / 'wfcd_all_cache.json') or []
        items = wfcd if isinstance(wfcd, list) else (wfcd.get('items') or wfcd.get('data') or [])

        self._tags = []
        for item in items:
            if not isinstance(item, dict) or item.get('type') != 'Conservation Tag':
                continue
            uname = item.get('uniqueName', '')
            name = item.get('name', '')
            if not uname or not name:
                continue
            info = _CONSERVATION_INFO.get(name)
            if not info or info == "UNKNOWN":
                info = "Check wiki for location/bait/cycle"
            self._tags.append({'name': name, 'info': info, 'owned': self._owned.get(uname, 0)})

        self._tags.sort(key=lambda t: t['name'])
        self._populate_table(self._tags)
        self._status.setText(f"Loaded {len(self._tags)} conservation tags")

    def _load_json(self, path):
        try:
            with path.open() as fh:
                return json.load(fh)
        except Exception:
            return None

    def _populate_table(self, tags):
        self._table.setSortingEnabled(False)
        self._table.setRowCount(0)
        for t in tags:
            r = self._table.rowCount()
            self._table.insertRow(r)
            _a0 = QTableWidgetItem(t['name']); _a0.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter); self._table.setItem(r, 0, _a0)
            _a1 = QTableWidgetItem(t['info']); _a1.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter); self._table.setItem(r, 1, _a1)
            owned_item = QTableWidgetItem()
            owned_item.setData(Qt.DisplayRole, t['owned'])
            owned_item.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
            if t['owned'] > 0:
                owned_item.setForeground(Qt.cyan)
            self._table.setItem(r, 2, owned_item)
            wiki_item = QTableWidgetItem("▷ Wiki")
            wiki_item.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
            wiki_item.setData(Qt.UserRole, build_wiki_url(t['name']))
            self._table.setItem(r, 3, wiki_item)
        self._table.setSortingEnabled(True)

    def _on_cell_clicked(self, row, column):
        if column != 3:
            return
        item = self._table.item(row, 3)
        url = item.data(Qt.UserRole) if item else None
        if url:
            open_wiki_url(url)

    def _filter(self, *_):
        q = self._search.text().strip().lower()
        hide_owned = self._hide_owned.isChecked()
        for r in range(self._table.rowCount()):
            name_item = self._table.item(r, 0)
            info_item = self._table.item(r, 1)
            owned_item = self._table.item(r, 2)
            name = name_item.text().lower() if name_item else ''
            info = info_item.text().lower() if info_item else ''
            owned = owned_item.data(Qt.DisplayRole) if owned_item else 0
            visible = True
            if q and q not in name and q not in info:
                visible = False
            if hide_owned and (owned or 0) > 0:
                visible = False
            self._table.setRowHidden(r, not visible)
