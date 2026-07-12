"""
equipment_tabs.py - Builds the 9 non-prime equipment tabs for missing-parts.py.
Tree view per tab: items -> components -> drop sources.
"""
import json
from pathlib import Path
from PySide6.QtCore import Qt, QUrl
from PySide6.QtGui import QColor, QBrush, QDesktopServices, QFont, QIcon, QPixmap
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QCheckBox, QLabel,
    QTreeWidget, QTreeWidgetItem, QTabWidget, QHeaderView, QPushButton
)
from column_persistence import apply_saved_widths, remember_widths
from paths import DATA_DIR, CACHE_DIR

EQUIPMENT_FILE = DATA_DIR / "equipment_status.json"
IMAGE_CACHE_DIR = CACHE_DIR / "item_images"

COLOR_MASTERED  = QColor("#3eff3e")
COLOR_MISSING   = QColor("#ff6060")
COLOR_COMPONENT = QColor("#e8c96a")
COLOR_RESOURCE  = QColor("#888888")
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
}

def is_resource(component_name):
    """True if this 'component' is really a generic crafting material."""
    lower = component_name.lower()
    return any(h in lower for h in RESOURCE_HINTS)

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
        if EQUIPMENT_FILE.exists():
            try:
                self.data = json.loads(EQUIPMENT_FILE.read_text())
                self.ingredient_index = self._build_ingredient_index()
                return True
            except json.JSONDecodeError:
                pass
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
        col_count = 5 if is_warframe else 4
        tree = QTreeWidget()
        tree.setColumnCount(col_count)
        if is_warframe:
            tree.setHeaderLabels(["Item / Component / Source", "Need", "Status / Rarity", "Subsumed", "Wiki"])
            apply_saved_widths(tree, f"equipment_tree_{tab_name}", [280, 55, 130, 80, 140])
        else:
            tree.setHeaderLabels(["Item / Component / Source", "Need", "Status / Rarity", "Wiki"])
            apply_saved_widths(tree, f"equipment_tree_{tab_name}", [320, 70, 140, 160])
        for col in range(col_count):
            tree.header().setSectionResizeMode(col, QHeaderView.Interactive)
        remember_widths(tree, f"equipment_tree_{tab_name}")
        tree.setAlternatingRowColors(True)

        # Single click: toggle expand/collapse on top-level items
        # Wiki links in column 3 are clickable text — handled in itemClicked
        tree.itemClicked.connect(self._on_single_click)

        for it in items:
            tree.addTopLevelItem(self._build_item_node(it))

        # Auto-resize all columns to content after populating
        for col in range(4):
            tree.resizeColumnToContents(col)
        # Then restore any saved widths (overrides auto-size)
        apply_saved_widths(tree, f"equipment_tree_{tab_name}", [320, 70, 140, 160])

        expand_btn.clicked.connect(tree.expandAll)
        collapse_btn.clicked.connect(tree.collapseAll)

        self.trees[tab_name] = tree
        layout.addWidget(tree)
        return w

    def _build_item_node(self, item):
        mastered = item["mastered"]
        status = "✓ Mastered" if mastered else "✗ Missing"

        label = item["name"] + (make_item_label_extras(item) if not mastered else "")

        needed_by = self.ingredient_index.get(item.get("uniqueName"), [])
        if needed_by:
            label += "  \U0001F527"  # wrench - "Crafting Ingredient"

        wiki_url = item.get("wikiaUrl", "")
        wiki_display = "\u25b7 Wiki" if wiki_url else ""   # ▷ open triangle = link
        subsumed = item.get("subsumed", False)
        is_warframe = (item.get("tab") == "Warframe")

        if is_warframe:
            sub_display = "✅ Yes" if subsumed else ""
            node = QTreeWidgetItem([label, "", status, sub_display, wiki_display])
            node.setToolTip(4, wiki_url if wiki_url else "No wiki link available")
            node.setForeground(3, QBrush(QColor("#3eff3e") if subsumed else QColor("#6a88aa")))
        else:
            node = QTreeWidgetItem([label, "", status, wiki_display])
            node.setToolTip(3, wiki_url if wiki_url else "No wiki link available")

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

        color = COLOR_MASTERED if mastered else COLOR_MISSING
        bold = QFont()
        bold.setBold(True)
        for col in range(4):
            node.setForeground(col, QBrush(color))
        node.setFont(0, bold)

        components = item.get("components", [])
        item_drops = item.get("itemDrops", [])

        if components:
            for c in components:
                self._add_component_node(node, c)
        elif item_drops:
            for d in item_drops:
                self._add_drop_node(node, d)
        elif not mastered:
            # No component or drop data — suggest wiki
            itype = item.get("tab", "")
            if itype == "Pet":
                hint = "Obtained by capturing wild animals, trading, or Incubation — check wiki"
            elif itype in ("Sentinel", "Moa", "Hound"):
                hint = "Obtained from the Market or via components — check wiki"
            elif item.get("marketCost"):
                hint = f"Purchase from Market for {item['marketCost']:,} platinum"
            else:
                hint = "Check wiki for acquisition method"
            stub = QTreeWidgetItem([f"  \u2139  {hint}", "", "", ""])
            stub.setForeground(0, QBrush(COLOR_RESOURCE))
            node.addChild(stub)

        return node

    def _add_component_node(self, parent, c):
        cn = c.get("name", "")
        cnt = c.get("count", 1)
        res = is_resource(cn)

        cnode = QTreeWidgetItem([f"  └ {cn}", f"x{cnt}",
                                 "(resource)" if res else "", ""])
        col = COLOR_RESOURCE if res else COLOR_COMPONENT
        for i in range(4):
            cnode.setForeground(i, QBrush(col))
        parent.addChild(cnode)

        drops = c.get("drops", [])
        if drops:
            for d in drops:
                self._add_drop_node(cnode, d)
        elif not res:
            stub = QTreeWidgetItem(["      (no drop sources listed — check wiki)", "", "", ""])
            stub.setForeground(0, QBrush(COLOR_RESOURCE))
            cnode.addChild(stub)

    def _add_drop_node(self, parent, d):
        loc = d.get("location", "")
        rarity = d.get("rarity", "")
        chance = d.get("chance", 0)
        rotation = d.get("rotation", "")

        details = rarity + (f" {rotation}" if rotation else "")
        chance_str = f"{chance}%" if chance else ""

        dnode = QTreeWidgetItem([f"      • {loc}", "", details, chance_str])
        for i in range(4):
            dnode.setForeground(i, QBrush(COLOR_DROP))
        parent.addChild(dnode)

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
        """Single click: col 3 = open wiki; col 0 on top-level = expand/collapse."""
        if column == 3:
            # Open wiki link
            url = item.data(0, Qt.UserRole) or ""
            if not url:
                p = item.parent()
                while p and not url:
                    url = p.data(0, Qt.UserRole) or ""
                    p = p.parent()
            if url:
                QDesktopServices.openUrl(QUrl(url))
        elif item.parent() is None:
            # Top-level item — toggle expand/collapse
            item.setExpanded(not item.isExpanded())