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
    QTableWidget, QTableWidgetItem, QHeaderView, QAbstractItemView
)
from paths import get_inventory_path
from column_persistence import apply_saved_widths, remember_widths
from wiki_links import open_wiki_url
from drop_data import find_drop_info

# Individual Ayatan Sculptures don't have their own wiki pages - confirmed
# live 2026-07-21 (Jacob: "most of the ayatan links redirect to the main,
# the others are blank") - they're all documented on one shared page.
AYATAN_WIKI_URL = "https://wiki.warframe.com/w/Ayatan_Treasures"

# Real acquisition text from the wiki's "Ayatan Treasures#Acquisition"
# section (confirmed live 2026-07-21) - these aren't random drops, so
# they're not in dropdata_cache.json / wfcd_all_cache.json's "drops"
# field at all. Keyed by display name.
_ACQUISITION_OVERRIDES = {
    "Ayatan Anasa Sculpture": "Sortie or Archon Hunt reward (28% chance, end of 3rd mission)",
    "Ayatan Hemakara Sculpture": (
        "Operation: Orphix Venom (1,000 points); Nightwave Intermission III "
        "Rank 22; Nightwave Nora's Mix Vol.3 Rank 22; Vol.5 Rank 22; Vol.6 Rank 23"
    ),
    "Ayatan Kitha Sculpture": "Bought from Loid for 50,000 Credits (requires Necraloid Rank 3 - Clearance Odima)",
    "Ayatan Zambuka Sculpture": "Bought from Arbitration Honors store for 50 Vitus Essence",
    "Ayatan Chattraka Sculpture": (
        "Bought from Nightcap for 75 Fergolyte (requires Rank 3 - Seeker "
        "with Nightcap; limit 1/week)"
    ),
}


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

        self._table = QTableWidget(0, 4)
        self._table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self._table.setHorizontalHeaderLabels(["Name", "Drop Location", "Owned", "Wiki"])
        for col in range(4):
            self._table.horizontalHeader().setSectionResizeMode(col, QHeaderView.Interactive)
        apply_saved_widths(self._table, "ayatan_table", [220, 320, 70, 70])
        remember_widths(self._table, "ayatan_table")
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
            # /Lotus/StoreItems/... entries are Market-listing wrappers
            # around the same real item (e.g. the "Orofusexf" entry is a
            # duplicate of Ayatan Anasa Sculpture missing its display
            # name in wfcd's cache, not a separate sculpture) - confirmed
            # live 2026-07-21 by comparing uniqueName suffixes.
            if '/StoreItems/' in uname:
                continue
            if name in _ACQUISITION_OVERRIDES:
                drop_location = _ACQUISITION_OVERRIDES[name]
            else:
                locations = sorted({d.get('location') for d in (item.get('drops') or []) if d.get('location')})
                drop_location = '; '.join(locations) if locations else (find_drop_info(name) or 'No drop data (check wiki)')
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
            wiki_item = QTableWidgetItem("▷ Wiki")
            wiki_item.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
            wiki_item.setData(Qt.UserRole, AYATAN_WIKI_URL)
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
