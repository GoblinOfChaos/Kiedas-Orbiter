"""
equipment_tabs.py - Builds the 9 non-prime equipment tabs for missing-parts.py.
Tree view per tab: items -> components -> drop sources.
"""
import json
from pathlib import Path
from PySide6.QtCore import Qt
from PySide6.QtGui import QColor, QBrush, QFont, QIcon, QPixmap
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QCheckBox, QLabel,
    QTreeWidget, QTreeWidgetItem, QTabWidget, QHeaderView, QPushButton
)
from column_persistence import apply_saved_widths, remember_widths
from paths import DATA_DIR, CACHE_DIR
from wiki_links import build_wiki_url, open_wiki_url, _wiki_log
from drop_data import find_drop_info, find_component_drop_info
import inventory_data
import theme

IMAGE_CACHE_DIR = CACHE_DIR / "item_images"

# Wiki-verified acquisition text for items/components that aren't random
# drops at all (boss assassinations, Dojo research, Syndicate/vendor
# purchases, Kuva Lich/Sister weapons, Founders-exclusive items, etc.) -
# neither wfcd_all_cache.json's "drops" field nor dropdata_cache.json (a
# random-drop-table dataset) was ever going to have these. Verified live
# 2026-07-21/22 against individual wiki pages. Keyed "Item|Component" for
# component-level entries, or just "Item" for item-level entries (Primes,
# starter weapons with no components at all).
def _load_acquisition_overrides():
    path = Path(__file__).parent / "component_acquisition_overrides.json"
    try:
        return json.loads(path.read_text())
    except Exception:
        return {}

ACQUISITION_OVERRIDES = _load_acquisition_overrides()

def _status_colors():
    """QColor(theme.GREEN)/QColor(theme.RED) used to be computed once at
    import time from theme.py's hardcoded sapphire-theme constants, so
    mastered/missing rows stayed that color forever regardless of the
    selected theme. Called fresh each time a tree node is colored instead,
    so a data refresh (which repopulates the tree) picks up whatever
    theme is currently active. Jacob 2026-07-23."""
    p = theme.get_palette()
    return QColor(p['green']), QColor(p['red'])


COLOR_COMPONENT = QColor("#e8c96a")
COLOR_SATISFIED = QColor("#888888")
COLOR_DROP      = QColor("#cdd4ff")

TAB_ORDER = [
    "Warframe", "Primary", "Secondary", "Melee",
    "Archwing", "Necramech",
    "Sentinel", "Sentinel Weapon", "Pet",
]

RESOURCE_HINTS = {
    "cell", "forma", "salvage", "polymer", "ferrite", "alloy", "plate",
    "circuit", "rubedo", "neurode", "mutagen", "plasm", "thrax",
    "bundle", "mass", "morphics", "oxium", "control module",
    "argon", "tellurium", "kuva", "fieldron", "detonite",
    "nano spore", "plastid", "cryotic", "gallium", "nitain",
}

def is_resource(component_name):
    """True if this 'component' is really a generic crafting material."""
    lower = component_name.lower()
    return any(h in lower for h in RESOURCE_HINTS)

def _center_cols(tree_item, col_count):
    """Column 0 (name/component/source) stays left-aligned; every other
    column is centered - matches the alignment convention already used
    across the QTableWidget-based tabs."""
    for col in range(1, col_count):
        tree_item.setTextAlignment(col, Qt.AlignHCenter | Qt.AlignVCenter)

def make_item_label_extras(item):
    """Build the parenthetical extras shown after a missing item's name."""
    extras = []
    if item.get("masteryReq"):
        extras.append(f"MR{item['masteryReq']}")
    if item.get("marketCost"):
        extras.append(f"{item['marketCost']}p")
    if item.get("buildPrice"):
        extras.append(f"{item['buildPrice']:,}cr")
    if item.get("bpCost"):
        extras.append(f"BP {item['bpCost']:,}cr")
    return f" ({', '.join(extras)})" if extras else ""


class EquipmentTabBuilder:
    """Adds 9 non-prime-equipment tabs to an existing QTabWidget."""

    def __init__(self, tab_widget: QTabWidget):
        self.tab_widget = tab_widget
        self.data = {}
        self.trees = {}
        self.filter_boxes = {}
        self.ingredient_index = {}

    def reload_data(self):
        # Sourced from the shared inventory_data cache (single reload()
        # call refreshes every equipment/inventory-derived tab at once)
        # instead of independently reading equipment_status.json here -
        # see inventory_data.py's module docstring for why that mattered.
        inventory_data.reload()
        if inventory_data.DATA.equipment_status:
            self.data = inventory_data.DATA.equipment_status
            self.ingredient_index = self._build_ingredient_index()
            return True
        self.data = {}
        self.ingredient_index = {}
        return False

    def _build_ingredient_index(self):
        """Some weapons are crafting components for OTHER weapons (e.g.
        Redeemer's blueprint needs a full Dual Skana and a full Vasto, not
        just raw resources). Scan every item's component list across all
        categories once, and index: ingredient uniqueName -> names of the
        items that need it. Mirrors Cephalon Kronos's automatic "Crafting
        Ingredient" badge, derived entirely from data we already have."""
        equipment_unames = set()
        for items in self.data.values():
            if isinstance(items, list):
                for item in items:
                    if item.get("uniqueName"):
                        equipment_unames.add(item["uniqueName"])

        index = {}
        for items in self.data.values():
            if not isinstance(items, list):
                continue
            for item in items:
                needer = item.get("name", "")
                own_uname = item.get("uniqueName")
                for c in (item.get("components") or []):
                    cu = c.get("uniqueName", "")
                    # Only count it as an "ingredient" if that component IS
                    # itself a full equipment item, not a raw resource,
                    # blueprint, or generic crafting material.
                    if cu and cu != own_uname and cu in equipment_unames:
                        index.setdefault(cu, []).append(needer)
        return index

    def build_all(self):
        ok = self.reload_data()
        if not ok:
            w = QWidget()
            l = QVBoxLayout(w)
            l.addWidget(QLabel(
                "No equipment data yet.\n\n"
                "Click 'Refresh Inventory' in the control panel to populate."
            ))
            self.tab_widget.addTab(w, "Equipment")
            return

        for tab_name in TAB_ORDER:
            items = self.data.get(tab_name, [])
            self.tab_widget.addTab(self._build_tab(tab_name, items), tab_name)

    def _build_tab(self, tab_name, items):
        w = QWidget()
        layout = QVBoxLayout(w)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(4)

        # Header
        n_total = len(items)
        n_mast = sum(1 for x in items if x["mastered"])
        n_miss = n_total - n_mast

        hdr = QHBoxLayout()
        summary = QLabel(
            f"<b>{tab_name}</b>"
            f" &nbsp;&nbsp; Total: <b>{n_total}</b>"
            f" &nbsp;&nbsp; <span style='color:#3eff3e;'>Mastered: <b>{n_mast}</b></span>"
            f" &nbsp;&nbsp; <span style='color:#ff6060;'>Missing: <b>{n_miss}</b></span>"
        )
        hdr.addWidget(summary)
        hdr.addStretch()

        filter_box = QCheckBox("Show only missing")
        filter_box.stateChanged.connect(lambda _, t=tab_name: self._refilter(t))
        self.filter_boxes[tab_name] = filter_box
        hdr.addWidget(filter_box)

        expand_btn = QPushButton("Expand all")
        expand_btn.setMaximumWidth(110)
        collapse_btn = QPushButton("Collapse all")
        collapse_btn.setMaximumWidth(110)
        hdr.addWidget(expand_btn)
        hdr.addWidget(collapse_btn)
        layout.addLayout(hdr)

        is_warframe = (tab_name == "Warframe")
        # Drop Location is always the LAST column (after Wiki) - own
        # column now instead of sharing space with "Mastered", per Jacob
        # 2026-07-21 ("I just hate that its under the mastered tab").
        col_count = 6 if is_warframe else 5
        tree = QTreeWidget()
        tree.setColumnCount(col_count)
        if is_warframe:
            tree.setHeaderLabels(["Item / Component / Source", "Need", "Mastered", "Subsumed", "Wiki", "Drop Location"])
            apply_saved_widths(tree, f"equipment_tree_{tab_name}", [280, 55, 90, 80, 90, 320])
        else:
            tree.setHeaderLabels(["Item / Component / Source", "Need", "Mastered", "Wiki", "Drop Location"])
            apply_saved_widths(tree, f"equipment_tree_{tab_name}", [320, 70, 90, 90, 320])
        for col in range(col_count):
            tree.header().setSectionResizeMode(col, QHeaderView.Interactive)
        tree.header().setStretchLastSection(False)
        remember_widths(tree, f"equipment_tree_{tab_name}")
        tree.setAlternatingRowColors(True)

        # Single click: toggle expand/collapse on top-level items
        # Wiki links are clickable text — handled in itemClicked
        tree.itemClicked.connect(self._on_single_click)

        for it in items:
            tree.addTopLevelItem(self._build_item_node(it, col_count))

        # Auto-resize all columns to content after populating
        for col in range(col_count):
            tree.resizeColumnToContents(col)
        # Then restore any saved widths (overrides auto-size)
        if is_warframe:
            apply_saved_widths(tree, f"equipment_tree_{tab_name}", [280, 55, 90, 80, 90, 320])
        else:
            apply_saved_widths(tree, f"equipment_tree_{tab_name}", [320, 70, 90, 90, 320])

        expand_btn.clicked.connect(tree.expandAll)
        collapse_btn.clicked.connect(tree.collapseAll)

        self.trees[tab_name] = tree
        layout.addWidget(tree)
        return w

    def _build_item_node(self, item, col_count):
        mastered = item["mastered"]
        status = "Yes" if mastered else "No"

        label = item["name"] + (make_item_label_extras(item) if not mastered else "")

        needed_by = self.ingredient_index.get(item.get("uniqueName"), [])
        if needed_by:
            label += "  \U0001F527"  # wrench - "Crafting Ingredient"

        # Falls back to a constructed URL (same convention real wikiaUrl
        # values already follow) when the data doesn't have one - Jacob
        # reported "everything that says check wiki needs ... a wiki
        # link", and several items here lack a wikiaUrl in the source
        # data despite genuinely having a wiki page.
        wiki_url = item.get("wikiaUrl") or build_wiki_url(item["name"])
        wiki_display = "\u25b7 Wiki"   # always shown now that wiki_url always has a value (falls back to a constructed URL)
        subsumed = item.get("subsumed", False)
        is_warframe = (item.get("tab") == "Warframe")

        # Drop Location is always the LAST column (after Wiki) - its own
        # column now instead of sharing space with "Mastered" - Jacob
        # 2026-07-21 ("I just hate that its under the mastered tab").
        components = item.get("components", [])
        item_drops = item.get("itemDrops", [])
        drop_location = ""
        if item_drops:
            locations = sorted({d.get("location") for d in item_drops if d.get("location")})
            drop_location = "; ".join(locations)
        elif not components and not mastered:
            # No component or drop data in wfcd_all_cache.json - check
            # the wiki-verified overrides (Founders exclusives, quest
            # rewards, Baro rotations, etc.) before falling back to
            # dropdata_cache.json, then a generic wiki hint.
            override = ACQUISITION_OVERRIDES.get(item["name"])
            real_drops = override or find_drop_info(item["name"])
            itype = item.get("tab", "")
            if real_drops:
                drop_location = real_drops
            elif itype == "Pet":
                drop_location = "Obtained by capturing wild animals, trading, or Incubation — check wiki"
            elif itype in ("Sentinel", "Moa", "Hound"):
                drop_location = "Obtained from the Market or via components — check wiki"
            elif item.get("marketCost"):
                drop_location = f"Purchase from Market for {item['marketCost']:,} platinum"
            else:
                drop_location = "Check wiki for acquisition method"

        wiki_col = col_count - 2
        drop_col = col_count - 1
        row = [""] * col_count
        row[0] = label
        row[2] = status
        row[wiki_col] = wiki_display
        row[drop_col] = drop_location
        if is_warframe:
            row[3] = "\u2705 Yes" if subsumed else ""
        node = QTreeWidgetItem(row)
        node.setToolTip(wiki_col, wiki_url if wiki_url else "No wiki link available")
        if drop_location:
            node.setToolTip(drop_col, drop_location)
        if is_warframe:
            node.setForeground(3, QBrush(QColor("#3eff3e") if subsumed else QColor("#6a88aa")))
        _center_cols(node, col_count)

        node.setData(0, Qt.UserRole, wiki_url)
        node.setData(0, Qt.UserRole + 1, "mastered" if mastered else "missing")

        if needed_by:
            names = ", ".join(sorted(set(needed_by)))
            node.setToolTip(0, f"Crafting Ingredient — required to build: {names}")

        # Item thumbnail from cached WFCD image
        img_name = item.get("imageName", "")
        if img_name:
            img_path = IMAGE_CACHE_DIR / img_name
            if img_path.exists():
                pix = QPixmap(str(img_path))
                if not pix.isNull():
                    node.setIcon(0, QIcon(pix.scaled(40, 40, Qt.KeepAspectRatio, Qt.SmoothTransformation)))

        color_mastered, color_missing = _status_colors()
        color = color_mastered if mastered else color_missing
        bold = QFont()
        bold.setBold(True)
        for col in range(4):
            node.setForeground(col, QBrush(color))
        node.setFont(0, bold)

        if components:
            for c in components:
                self._add_component_node(node, c, item["name"], col_count)

        return node

    def _add_component_node(self, parent, c, item_name, col_count):
        cn = c.get("name", "")
        cnt = c.get("count", 1)
        owned = c.get("owned", 0)
        res = is_resource(cn)

        # The Need column shows how many MORE are needed (recipe total
        # minus what you already hold), not the flat recipe total -
        # Jacob 2026-07-22 asked whether "need 5, have 2" shows 5 or 3.
        # Originally gated to stackable resources (Nano Spores, Plastids,
        # ...) only, on the assumption that non-resource parts (Blueprint/
        # Barrel/...) "aren't stackable inventory counts the same way" -
        # but they ARE tracked the same way (see populate_equipment.py's
        # resource_counts), so gating on is_resource() just hid real
        # ownership data for those parts. Jacob 2026-08-05 ("Shedu
        # Blueprint shows as not owned despite owning it").
        satisfied = False
        if owned:
            remaining = max(0, cnt - owned)
            satisfied = remaining == 0
            need_text = f"x{remaining} (of {cnt}, have {owned:,})" if remaining else f"Have {owned:,}/{cnt:,} \u2713"
        else:
            need_text = f"x{cnt}"

        # Acquisition text shown directly in the row (last column)
        # instead of a nested child that needed an extra click/
        # double-click to reveal - Jacob reported the info "is there"
        # but hidden behind an expand step that's easy to miss across
        # ~200 items.
        drops = c.get("drops", [])
        if res:
            source_text = "(resource)"
        elif drops:
            locations = sorted({d.get("location") for d in drops if d.get("location")})
            source_text = "; ".join(locations) if locations else "(no drop sources listed \u2014 check wiki)"
        else:
            override = ACQUISITION_OVERRIDES.get(f"{item_name}|{cn}")
            real_drops = override or find_component_drop_info(item_name, cn)
            source_text = real_drops or "(no drop sources listed \u2014 check wiki)"

        row = [""] * col_count
        row[0] = f"  \u2514 {cn}"
        row[1] = need_text
        row[col_count - 1] = source_text
        cnode = QTreeWidgetItem(row)
        # Grey means "you have enough of this" regardless of whether it's
        # a stackable resource or a discrete part (Blueprint/Barrel/...) -
        # previously this colored by resource-vs-component type instead,
        # which coincidentally looked ownership-related but wasn't. Jacob
        # 2026-08-05 ("only the things I have enough of should be greyed
        # out, not by if its item or resource").
        col = COLOR_SATISFIED if satisfied else COLOR_COMPONENT
        for i in range(col_count):
            cnode.setForeground(i, QBrush(col))
        cnode.setToolTip(col_count - 1, source_text)
        _center_cols(cnode, col_count)
        parent.addChild(cnode)

    def _refilter(self, tab_name):
        tree = self.trees.get(tab_name)
        box = self.filter_boxes.get(tab_name)
        if not tree or not box:
            return
        only_missing = box.isChecked()
        for i in range(tree.topLevelItemCount()):
            it = tree.topLevelItem(i)
            status = it.data(0, Qt.UserRole + 1)
            it.setHidden(only_missing and status == "mastered")

    def _on_single_click(self, item, column):
        """Single click: Wiki column = open wiki; col 0 on top-level = expand/collapse."""
        tree = item.treeWidget()
        # The Wiki column is second-to-last (Drop Location is now the
        # true last column, after Wiki) - column 4 for the Warframe tab
        # (6 columns: extra "Subsumed" column) but 3 for every other tab
        # (5 columns). This used to hardcode column == 3, which meant
        # wiki clicks silently did nothing on the Warframe tab
        # specifically (column 3 there is "Subsumed", not "Wiki").
        wiki_column = (tree.columnCount() - 2) if tree else 3
        _wiki_log(f"clicked column={column} wiki_column={wiki_column}")
        if column == wiki_column:
            url = item.data(0, Qt.UserRole) or ""
            if not url:
                p = item.parent()
                while p and not url:
                    url = p.data(0, Qt.UserRole) or ""
                    p = p.parent()
            _wiki_log(f"resolved url={url!r}")
            if url:
                self._open_url(url)
            else:
                _wiki_log("no url found on this item or any ancestor - nothing to open")
        elif item.parent() is None:
            # Top-level item — toggle expand/collapse
            item.setExpanded(not item.isExpanded())

    def _open_url(self, url):
        # Moved to wiki_links.open_wiki_url() - shared with the other
        # tabs (Ayatan/Ephemera/Arcane/Mod Collection) that also needed
        # this same xdg-open-with-clean-env fix, rather than duplicating
        # it per file.
        open_wiki_url(url)