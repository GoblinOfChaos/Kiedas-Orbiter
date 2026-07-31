#!/usr/bin/env python3
"""Glyphs tab: shows every profile/chat glyph with owned status. Filter to
show only missing.

Like Emblems/Ephemera, glyphs aren't stackable - inventory.json tracks
them as individual unique-instance entries under FlavourItems with no
ItemCount field, so ownership here is Yes/No.

Unlike Emblems (26 items), there are ~1,668 glyphs - individually
wiki-verifying each one isn't practical. Most follow a small number of
well-known naming patterns (Prime Access bundles, TennoCon/Tennobaum
event exclusives, Community Accolade awards, Founders packs), so
acquisition text is derived from those patterns instead - added
2026-07-22 per Jacob's request for an obtain-location column here."""
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

# Individual glyph wiki pages mostly don't exist (confirmed live
# 2026-07-22 - e.g. "13angtv Glyph" 404s) since most are Twitch/creator/
# event badges never given their own article. The real, always-valid
# resource is the general Glyphs catalog page, which documents all of
# them by category (Jacob: "most of those wiki links arent real").
GLYPHS_WIKI_URL = "https://wiki.warframe.com/w/Glyphs"


def _guess_glyph_source(name: str) -> str:
    """Best-effort acquisition guess from well-known glyph naming
    patterns - not individually wiki-verified (see module docstring)."""
    n = name.lower()
    if 'tennocon' in n:
        return "TennoCon Digital Pack (past event, may be permanently unavailable)"
    if 'tennobaum' in n:
        return "Tennobaum community holiday gift event (past, permanently unavailable)"
    if 'founders' in n:
        return "Founders Pack exclusive (program closed 2013, permanently unobtainable)"
    if 'accolade' in n:
        return "Community Accolade award (Design Council/contest reward)"
    if 'community in action' in n:
        return "Community in Action event reward"
    if 'prime' in n:
        return "Included with the matching item's Prime Access/Prime Vault pack"
    if 'deluxe' in n:
        return "Included with the matching Deluxe Skin bundle"
    return ""


class GlyphTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._owned = set()
        self._glyphs = []
        self._setup_ui()
        self._load()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        header = QHBoxLayout()
        header.addWidget(QLabel("Search:"))
        self._search = QLineEdit()
        self._search.setPlaceholderText("Search glyphs...")
        self._search.textChanged.connect(self._filter)
        header.addWidget(self._search)

        self._hide_owned = QCheckBox("Hide owned glyphs")
        self._hide_owned.stateChanged.connect(self._filter)
        header.addWidget(self._hide_owned)

        layout.addLayout(header)

        self._table = QTableWidget(0, 4)
        self._table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self._table.setHorizontalHeaderLabels(["Name", "Drop Location", "Owned", "Wiki"])
        for col in range(4):
            self._table.horizontalHeader().setSectionResizeMode(col, QHeaderView.Interactive)
        apply_saved_widths(self._table, "glyph_table", [260, 320, 70, 70])
        remember_widths(self._table, "glyph_table")
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
            u['ItemType'] for u in inventory.get('FlavourItems', [])
            if isinstance(u, dict) and u.get('ItemType')
        }

        wfcd = self._load_json(base / 'wfcd_all_cache.json') or []
        items = wfcd if isinstance(wfcd, list) else (wfcd.get('items') or wfcd.get('data') or [])

        self._glyphs = []
        for item in items:
            if not isinstance(item, dict) or item.get('type') != 'Glyph':
                continue
            uname = item.get('uniqueName', '')
            name = item.get('name', '')
            if not uname or not name:
                continue
            locations = sorted({d.get('location') for d in (item.get('drops') or []) if d.get('location')})
            drop_location = (
                '; '.join(locations) if locations
                else find_drop_info(name)
                or _guess_glyph_source(name)
                or 'Check wiki for acquisition method'
            )
            self._glyphs.append({
                'name': name, 'drop_location': drop_location,
                'owned': uname in self._owned,
            })

        self._glyphs.sort(key=lambda g: g['name'])
        self._populate_table(self._glyphs)
        self._status.setText(f"Loaded {len(self._glyphs)} glyphs")

    def _load_json(self, path):
        try:
            with path.open() as fh:
                return json.load(fh)
        except Exception:
            return None

    def _populate_table(self, glyphs):
        self._table.setSortingEnabled(False)
        self._table.setRowCount(0)
        for g in glyphs:
            r = self._table.rowCount()
            self._table.insertRow(r)
            _a0 = QTableWidgetItem(g['name']); _a0.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter); self._table.setItem(r, 0, _a0)
            _a1 = QTableWidgetItem(g['drop_location']); _a1.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter); self._table.setItem(r, 1, _a1)
            owned_item = QTableWidgetItem("Yes" if g['owned'] else "No")
            owned_item.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
            if g['owned']:
                owned_item.setForeground(Qt.cyan)
            self._table.setItem(r, 2, owned_item)
            wiki_item = QTableWidgetItem("▷ Wiki")
            wiki_item.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
            wiki_item.setData(Qt.UserRole, GLYPHS_WIKI_URL)
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
            owned = owned_item.text() == "Yes" if owned_item else False
            visible = True
            if q and q not in name and q not in drop_location:
                visible = False
            if hide_owned and owned:
                visible = False
            self._table.setRowHidden(r, not visible)
