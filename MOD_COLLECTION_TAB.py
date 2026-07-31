#!/usr/bin/env python3
"""Mod Collection tab: shows all mods from ExportUpgrades and ExportModSet with owned counts. Filter to show only missing ones."""
import json
import re
from pathlib import Path

from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QIcon, QPixmap
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QCheckBox,
    QTableWidget, QTableWidgetItem, QHeaderView, QComboBox, QAbstractItemView
)
from column_persistence import apply_saved_widths, remember_widths
from paths import CACHE_DIR, get_inventory_path
from wiki_links import build_wiki_url, open_wiki_url
from drop_data import find_drop_info

# Real, wiki-verified acquisition text for mods that aren't random drops
# at all (Baro Ki'Teer, Arbitration vendor, Nightwave, companion precepts,
# etc.) - neither wfcd_all_cache.json's "drops" field nor
# dropdata_cache.json (a random-drop-table dataset) was ever going to
# have these. Verified live 2026-07-21 against individual wiki pages.
# A few entries here are confirmed-junk leftovers in ExportUpgrades.json
# (raw internal paths, duplicate placeholders) marked "NOT_A_REAL_MOD" -
# those are excluded from the tab entirely rather than shown.
def _load_acquisition_overrides():
    path = Path(__file__).parent / "mod_acquisition_overrides.json"
    try:
        return json.loads(path.read_text())
    except Exception:
        return {}

MOD_ACQUISITION_OVERRIDES = _load_acquisition_overrides()

IMAGE_CACHE_DIR = CACHE_DIR / "item_images"
# Pre-rendered in-game-style mod cards (art + polarity + drain + warframe tag),
# built once offline via @wfcd/mod-generator and cached to disk - never
# generated at runtime, so this costs nothing on a normal app launch beyond
# a local file read, same as the plain icons above.
MOD_CARD_CACHE_DIR = CACHE_DIR / "mod_cards"

POLARITY_NAMES = {
    'AP_ATTACK': 'Madurai',
    'AP_DEFENSE': 'Vazarin',
    'AP_TACTIC': 'Naramon',
    'AP_POWER': 'Zenurik',
    'AP_PRECEPT': 'Penjaga',
    'AP_UMBRA': 'Umbra',
    'AP_UNIVERSAL': 'Universal',
    'AP_WARD': 'Unairu',
    'AP_ANY': 'Aura',
}

# Maps the raw 'type' field (the weapon slot a mod fits into) to a readable
# label for the Type dropdown. Mods with no type or '---' get bucketed
# together as "Other" since that's not a real category.
TYPE_DISPLAY_NAMES = {
    'WARFRAME': 'Warframe',
    'PRIMARY': 'Primary',
    'SECONDARY': 'Secondary',
    'MELEE': 'Melee',
    'SENTINEL': 'Sentinel',
    'STANCE': 'Stance',
    'ARCH-GUN': 'Arch-Gun',
    'ARCH-MELEE': 'Arch-Melee',
    'AURA': 'Aura',
    'PARAZON': 'Parazon',
    'KAVAT': 'Kavat',
    'KUBROW': 'Kubrow',
    'ARCHWING': 'Archwing',
    'HELMINTH CHARGER': 'Helminth Charger',
    'OTHER': 'Other',
}


def _type_bucket(raw_type):
    return raw_type if raw_type in TYPE_DISPLAY_NAMES else 'OTHER'


class ModCollectionTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._owned = {}
        self._mods = []
        self._icon_cache = {}
        self._population_generation = 0
        self._setup_ui()
        self._load()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        header = QHBoxLayout()
        header.addWidget(QLabel("Search:"))
        self._search = QLineEdit()
        self._search.setPlaceholderText("Search mods...")
        self._search.textChanged.connect(self._filter)
        header.addWidget(self._search)

        self._hide_owned = QCheckBox("Hide owned mods")
        self._hide_owned.stateChanged.connect(self._filter)
        header.addWidget(self._hide_owned)

        header.addWidget(QLabel("Slot:"))
        self._type_combo = QComboBox()
        self._type_combo.currentIndexChanged.connect(self._on_type_changed)
        header.addWidget(self._type_combo)

        header.addWidget(QLabel("Weapon/Type:"))
        self._source_combo = QComboBox()
        self._source_combo.currentIndexChanged.connect(self._filter)
        header.addWidget(self._source_combo)

        layout.addLayout(header)

        self._table = QTableWidget(0, 8)
        self._table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self._table.setHorizontalHeaderLabels([
            "Name", "Type", "Rarity", "Polarity", "Source", "Drop Location", "Owned", "Wiki"
        ])
        for col in range(8):
            self._table.horizontalHeader().setSectionResizeMode(col, QHeaderView.Interactive)
        apply_saved_widths(self._table, "mod_collection_table", [210, 110, 70, 80, 140, 320, 60, 70])
        remember_widths(self._table, "mod_collection_table")
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
        wfcd_names, wfcd_drops, wfcd_images = self._load_wfcd_data(base / 'wfcd_all_cache.json')
        upgrades = self._load_json(base / 'ExportUpgrades.json') or {}
        mod_sets = self._load_json(base / 'ExportModSet.json') or {}

        sets_by_name = self._build_set_names(mod_sets.keys())

        self._mods = []
        for unique, data in sorted(upgrades.items(), key=lambda kv: kv[0]):
            mod_name = wfcd_names.get(unique)
            if not mod_name:
                mod_name = self._humanize_name(unique)

            # Confirmed-junk ExportUpgrades.json entries (raw internal
            # paths, duplicate placeholders like "Unfused Artifact") -
            # verified live 2026-07-21 to have no real wiki page / not be
            # an obtainable mod at all. Skip entirely rather than show a
            # broken/fake row.
            if (MOD_ACQUISITION_OVERRIDES.get(unique) == "NOT_A_REAL_MOD"
                    or MOD_ACQUISITION_OVERRIDES.get(mod_name) == "NOT_A_REAL_MOD"):
                continue

            mod_type = data.get('type', '')
            rarity = data.get('rarity', '')
            raw_polarity = data.get('polarity', '')
            polarity = POLARITY_NAMES.get(raw_polarity, raw_polarity)
            source = data.get('compatName') or data.get('compat') or ''
            set_name = self._set_for_unique(unique, sets_by_name)
            if set_name:
                source = f"Set: {set_name}"

            owned_count = self._owned.get(unique, 0)
            override = MOD_ACQUISITION_OVERRIDES.get(mod_name)
            if override and override != "UNKNOWN":
                drop_location = override
            else:
                drop_location = wfcd_drops.get(unique, '') or find_drop_info(mod_name) or 'No drop data (check wiki)'
            self._mods.append({
                'name': mod_name,
                'type': mod_type,
                'type_bucket': _type_bucket(mod_type),
                'rarity': rarity,
                'polarity': polarity,
                'source': source,
                'drop_location': drop_location,
                'owned': owned_count,
                'is_set': bool(set_name),
                'image_name': wfcd_images.get(unique, ''),
            })

        self._populate_type_combo()
        self._populate_table(self._mods)
        self._status.setText(f"Loaded {len(self._mods)} mods from ExportUpgrades")

    def _populate_type_combo(self):
        buckets = sorted(
            {m['type_bucket'] for m in self._mods},
            key=lambda b: TYPE_DISPLAY_NAMES.get(b, b)
        )
        self._type_combo.blockSignals(True)
        self._type_combo.clear()
        self._type_combo.addItem("All Slots", None)
        for bucket in buckets:
            self._type_combo.addItem(TYPE_DISPLAY_NAMES.get(bucket, bucket), bucket)
        self._type_combo.blockSignals(False)
        self._populate_source_combo(None)

    def _populate_source_combo(self, bucket):
        if bucket is None:
            sources = {m['source'] for m in self._mods if m['source']}
        else:
            sources = {m['source'] for m in self._mods if m['type_bucket'] == bucket and m['source']}
        self._source_combo.blockSignals(True)
        self._source_combo.clear()
        self._source_combo.addItem("All", None)
        for source in sorted(sources):
            self._source_combo.addItem(source, source)
        self._source_combo.blockSignals(False)

    def _on_type_changed(self, *_):
        bucket = self._type_combo.currentData()
        self._populate_source_combo(bucket)
        self._filter()

    def _load_json(self, path):
        try:
            with path.open() as fh:
                return json.load(fh)
        except Exception:
            return None

    def _load_wfcd_data(self, path):
        try:
            with path.open() as fh:
                data = json.load(fh)
        except Exception:
            return {}, {}, {}

        items = []
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict):
            items = data.get('items') or data.get('data') or []
        names = {}
        drops = {}
        images = {}
        for item in items:
            if not isinstance(item, dict):
                continue
            u = item.get('uniqueName')
            n = item.get('name')
            if u and n:
                names[u] = n
            if u and item.get('drops'):
                locations = sorted({d.get('location') for d in item['drops'] if d.get('location')})
                if locations:
                    drops[u] = '; '.join(locations)
            if u and item.get('imageName'):
                images[u] = item['imageName']
        return names, drops, images

    def _build_set_names(self, keys):
        results = {}
        for key in keys:
            if not isinstance(key, str):
                continue
            match = re.search(r'/Sets/([^/]+)/', key)
            if match:
                results[key] = match.group(1)
        return results

    def _set_for_unique(self, unique, sets_by_name):
        for key, set_name in sets_by_name.items():
            if key in unique:
                return set_name
        return None

    def _humanize_name(self, unique):
        name = unique.split('/')[-1]
        name = name.replace('Mod', '').replace('Set', '').replace('Augment', 'Augment').strip()
        return re.sub(r'([A-Z])', r' \1', name).replace('  ', ' ').strip()

    def _icon_for(self, img_name):
        """Resolve + decode + scale a mod card icon once per unique image
        file, cached for reuse - ~330 of the ~1,600 mods share the exact
        same art (rank/set variants), so this avoids re-decoding those
        from disk every load. Jacob 2026-07-22: "Mod Collection takes a
        few seconds to load"."""
        if not img_name:
            return None
        if img_name in self._icon_cache:
            return self._icon_cache[img_name]
        card_path = MOD_CARD_CACHE_DIR / re.sub(r'\.(jpg|jpeg|png)$', '.webp', img_name, flags=re.IGNORECASE)
        img_path = card_path if card_path.exists() else IMAGE_CACHE_DIR / img_name
        icon = None
        if img_path.exists():
            pix = QPixmap(str(img_path))
            if not pix.isNull():
                icon = QIcon(pix.scaled(32, 32, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        self._icon_cache[img_name] = icon
        return icon

    def _populate_table(self, mods):
        self._population_generation += 1
        generation = self._population_generation
        self._table.setSortingEnabled(False)
        self._table.setRowCount(len(mods))
        # Populated in chunks via the event loop instead of one long
        # blocking loop, so the window stays responsive/paints
        # immediately instead of freezing for the full ~1,600-row build.
        self._populate_chunk(mods, 0, 150, generation)

    def _populate_chunk(self, mods, start, chunk_size, generation):
        # A filter/reload can replace the table while callbacks from the
        # previous population are still queued. Ignore those stale callbacks.
        if generation != self._population_generation:
            return
        end = min(start + chunk_size, len(mods))
        for r in range(start, end):
            mod = mods[r]
            _a0 = QTableWidgetItem(mod['name']); _a0.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter)
            icon = self._icon_for(mod.get('image_name', ''))
            if icon is not None:
                _a0.setIcon(icon)
            self._table.setItem(r, 0, _a0)
            _a1 = QTableWidgetItem(mod['type']); _a1.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter); self._table.setItem(r, 1, _a1)
            _a2 = QTableWidgetItem(mod['rarity']); _a2.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter); self._table.setItem(r, 2, _a2)
            _a3 = QTableWidgetItem(mod['polarity']); _a3.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter); self._table.setItem(r, 3, _a3)
            _a4 = QTableWidgetItem(mod['source']); _a4.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter); self._table.setItem(r, 4, _a4)
            _a5 = QTableWidgetItem(mod['drop_location']); _a5.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter); self._table.setItem(r, 5, _a5)
            owned_item = QTableWidgetItem()
            owned_item.setData(Qt.DisplayRole, mod['owned'])
            owned_item.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
            self._table.setItem(r, 6, owned_item)
            wiki_item = QTableWidgetItem("▷ Wiki")
            wiki_item.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
            wiki_item.setData(Qt.UserRole, build_wiki_url(mod['name']))
            self._table.setItem(r, 7, wiki_item)
        if end < len(mods):
            QTimer.singleShot(
                0,
                lambda: self._populate_chunk(mods, end, chunk_size, generation),
            )
        else:
            self._table.setSortingEnabled(True)

    def _on_cell_clicked(self, row, column):
        if column != 7:
            return
        item = self._table.item(row, 7)
        url = item.data(Qt.UserRole) if item else None
        if url:
            open_wiki_url(url)

    def _filter(self, *_):
        q = self._search.text().strip().lower()
        hide_owned = self._hide_owned.isChecked()
        selected_bucket = self._type_combo.currentData()
        selected_source = self._source_combo.currentData()

        for r in range(self._table.rowCount()):
            name_item = self._table.item(r, 0)
            type_item = self._table.item(r, 1)
            source_item = self._table.item(r, 4)
            drop_item = self._table.item(r, 5)
            owned_item = self._table.item(r, 6)
            name = name_item.text().lower() if name_item else ''
            typ_raw = type_item.text() if type_item else ''
            typ = typ_raw.lower()
            source_raw = source_item.text() if source_item else ''
            source = source_raw.lower()
            drop_location = drop_item.text().lower() if drop_item else ''
            owned = 0
            try:
                owned = int(owned_item.text())
            except Exception:
                owned = 0
            visible = True
            if q and q not in name and q not in typ and q not in source and q not in drop_location:
                visible = False
            if hide_owned and owned > 0:
                visible = False
            if selected_bucket is not None and _type_bucket(typ_raw) != selected_bucket:
                visible = False
            if selected_source is not None and source_raw != selected_source:
                visible = False
            self._table.setRowHidden(r, not visible)

    def get_selected_mod(self):
        r = self._table.currentRow()
        if r < 0:
            return None
        return self._table.item(r, 0).text()
