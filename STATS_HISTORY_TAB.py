#!/usr/bin/env python3
"""Stats History Tab - shows credits, plat, MR, and prime parts owned over time."""

import json
import time
from datetime import datetime
from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtGui import QColor
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QTableWidget,
    QTableWidgetItem, QHeaderView, QFrame, QComboBox, QPushButton,
    QSizePolicy,
)
from column_persistence import apply_saved_widths, remember_widths
from theme import BG_CARD, BG_PANEL, BG_INPUT, FG, DIM, GOLD, COLOR_GREAT, COLOR_BAD
from paths import DATA_DIR

HISTORY_FILE = DATA_DIR / "stats_history.json"

COLS = [
    ("Date / Time",   "ts",           lambda v: datetime.fromtimestamp(v).strftime("%Y-%m-%d %H:%M")),
    ("Credits",       "credits",      lambda v: f"{v:,}"),
    ("Plat",          "plat",         lambda v: f"{v:,}"),
    ("MR",            "mr",           str),
    ("Parts Owned",   "owned_parts",  str),
    ("Total Parts",   "total_parts",  str),
    ("Sets Complete", "owned_sets",   str),
]

DELTA_COLS = {
    "credits": ("Credits Δ",  lambda v: f"+{v:,}" if v > 0 else f"{v:,}"),
    "plat":    ("Plat Δ",     lambda v: f"+{v:,}" if v > 0 else f"{v:,}"),
    "owned_parts": ("Parts Δ", lambda v: f"+{v}" if v > 0 else str(v)),
}


class StatsHistoryTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._history = []
        self._setup_ui()
        self._load()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(6)

        # Summary row
        self._summary_frame = QFrame()
        self._summary_frame.setStyleSheet(f"background:{BG_CARD}; border-radius:6px; padding:8px;")
        summary_row = QHBoxLayout(self._summary_frame)
        summary_row.setSpacing(24)
        self._lbl_credits = self._make_summary_label("Credits", "—")
        self._lbl_plat = self._make_summary_label("Plat", "—")
        self._lbl_mr = self._make_summary_label("MR", "—")
        self._lbl_parts = self._make_summary_label("Parts Owned", "—")
        self._lbl_sets = self._make_summary_label("Sets Complete", "—")
        for lbl in (self._lbl_credits, self._lbl_plat, self._lbl_mr, self._lbl_parts, self._lbl_sets):
            summary_row.addWidget(lbl)
        summary_row.addStretch()

        btn_refresh = QPushButton("↻ Refresh")
        btn_refresh.setMaximumWidth(90)
        btn_refresh.setStyleSheet(f"background:{BG_PANEL}; color:{FG}; padding:4px 8px;")
        btn_refresh.clicked.connect(self._load)
        summary_row.addWidget(btn_refresh)
        layout.addWidget(self._summary_frame)

        # Filter row
        filter_row = QHBoxLayout()
        filter_row.addWidget(QLabel("Show last:"))
        self._range_combo = QComboBox()
        self._range_combo.addItems(["All time", "Last 7 days", "Last 30 days", "Last 24 hours"])
        self._range_combo.currentTextChanged.connect(self._apply_filter)
        filter_row.addWidget(self._range_combo)
        filter_row.addStretch()
        self._delta_lbl = QLabel("")
        self._delta_lbl.setStyleSheet(f"color:{DIM}; font-size:11px;")
        filter_row.addWidget(self._delta_lbl)
        layout.addLayout(filter_row)

        # Table
        col_count = len(COLS) + len(DELTA_COLS)
        self._table = QTableWidget(0, col_count)
        headers = [c[0] for c in COLS] + [v[0] for v in DELTA_COLS.values()]
        self._table.setHorizontalHeaderLabels(headers)
        for i in range(col_count):
            self._table.horizontalHeader().setSectionResizeMode(i, QHeaderView.Interactive)
        defaults = [140, 100, 80, 40, 90, 90, 100, 90, 80, 80]
        apply_saved_widths(self._table, "stats_history_table", defaults)
        remember_widths(self._table, "stats_history_table")
        self._table.setAlternatingRowColors(True)
        self._table.setEditTriggers(QTableWidget.NoEditTriggers)
        self._table.setStyleSheet(
            f"background:{BG_PANEL}; color:{FG}; gridline-color:{BG_CARD};"
            f"QHeaderView::section {{ background:{BG_CARD}; color:{DIM}; }}"
        )
        self._table.setSortingEnabled(True)
        self._table.verticalHeader().setVisible(False)
        layout.addWidget(self._table)

        # Empty state label
        self._empty_lbl = QLabel(
            "No stats history yet.\n\n"
            "Snapshots are recorded automatically every 5 minutes while Warframe is running.\n"
            "Play for a bit and come back!"
        )
        self._empty_lbl.setAlignment(Qt.AlignCenter)
        self._empty_lbl.setStyleSheet(f"color:{DIM}; font-size:13px;")
        self._empty_lbl.setVisible(False)
        layout.addWidget(self._empty_lbl)

    def _make_summary_label(self, title, value):
        w = QWidget()
        col = QVBoxLayout(w)
        col.setContentsMargins(0, 0, 0, 0)
        col.setSpacing(2)
        t = QLabel(title)
        t.setStyleSheet(f"color:{DIM}; font-size:10px;")
        v = QLabel(value)
        v.setStyleSheet(f"color:{FG}; font-size:14px; font-weight:bold;")
        v.setObjectName(f"val_{title}")
        col.addWidget(t)
        col.addWidget(v)
        return w

    def _get_val_label(self, widget):
        for child in widget.findChildren(QLabel):
            if child.objectName().startswith("val_"):
                return child
        return None

    def _load(self):
        try:
            raw = json.loads(HISTORY_FILE.read_text())
            self._history = raw if isinstance(raw, list) else []
        except Exception:
            self._history = []
        self._apply_filter()

    def _apply_filter(self):
        now = time.time()
        range_text = self._range_combo.currentText()
        if range_text == "Last 24 hours":
            cutoff = now - 86400
        elif range_text == "Last 7 days":
            cutoff = now - 7 * 86400
        elif range_text == "Last 30 days":
            cutoff = now - 30 * 86400
        else:
            cutoff = 0

        rows = [s for s in self._history if s.get("ts", 0) >= cutoff]
        self._populate_table(rows)

    def _populate_table(self, rows):
        self._table.setSortingEnabled(False)
        self._table.setRowCount(0)

        if not rows:
            self._empty_lbl.setVisible(True)
            self._table.setVisible(False)
            self._delta_lbl.setText("")
            # Clear summary
            for lbl_w in (self._lbl_credits, self._lbl_plat, self._lbl_mr, self._lbl_parts, self._lbl_sets):
                v = self._get_val_label(lbl_w)
                if v:
                    v.setText("—")
            return

        self._empty_lbl.setVisible(False)
        self._table.setVisible(True)

        # Show newest first
        rows_desc = list(reversed(rows))

        for i, snap in enumerate(rows_desc):
            self._table.insertRow(i)
            # Previous snap for delta (next in reversed order = older)
            prev = rows_desc[i + 1] if i + 1 < len(rows_desc) else None

            # Fixed columns
            for col_idx, (header, key, fmt) in enumerate(COLS):
                val = snap.get(key)
                if val is None:
                    item = QTableWidgetItem("—")
                else:
                    item = QTableWidgetItem(fmt(val))
                    item.setData(Qt.UserRole, val)
                # Col 0 (Date/Time) left-aligned; all others centered
                if col_idx == 0:
                    item.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter)
                else:
                    item.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
                self._table.setItem(i, col_idx, item)

            # Delta columns
            for d_idx, (key, (header, fmt)) in enumerate(DELTA_COLS.items()):
                col_idx = len(COLS) + d_idx
                cur = snap.get(key)
                prv = prev.get(key) if prev else None
                if cur is not None and prv is not None:
                    delta = cur - prv
                    item = QTableWidgetItem(fmt(delta))
                    item.setData(Qt.UserRole, delta)
                    if delta > 0:
                        item.setForeground(QColor("#3eff3e"))
                    elif delta < 0:
                        item.setForeground(QColor("#ff6060"))
                    else:
                        item.setForeground(QColor("#888888"))
                else:
                    item = QTableWidgetItem("—")
                item.setTextAlignment(Qt.AlignCenter)
                self._table.setItem(i, col_idx, item)

        self._table.setSortingEnabled(True)

        # Update summary with newest snapshot
        newest = rows[-1]
        oldest = rows[0]

        def _set_summary(widget, val):
            lbl = self._get_val_label(widget)
            if lbl:
                lbl.setText(str(val))

        _set_summary(self._lbl_credits, f"{newest.get('credits', 0):,}")
        _set_summary(self._lbl_plat, f"{newest.get('plat', 0):,}")
        _set_summary(self._lbl_mr, str(newest.get("mr", "—")))
        owned = newest.get("owned_parts", 0)
        total = newest.get("total_parts", 0)
        _set_summary(self._lbl_parts, f"{owned}/{total}")
        _set_summary(self._lbl_sets, str(newest.get("owned_sets", "—")))

        # Period delta summary
        if len(rows) >= 2:
            dc = newest.get("credits", 0) - oldest.get("credits", 0)
            dp = newest.get("plat", 0) - oldest.get("plat", 0)
            do = newest.get("owned_parts", 0) - oldest.get("owned_parts", 0)
            start_dt = datetime.fromtimestamp(oldest["ts"]).strftime("%b %d")
            end_dt = datetime.fromtimestamp(newest["ts"]).strftime("%b %d")
            self._delta_lbl.setText(
                f"Period ({start_dt}→{end_dt}):  "
                f"Credits {'+' if dc >= 0 else ''}{dc:,}  ·  "
                f"Plat {'+' if dp >= 0 else ''}{dp:,}  ·  "
                f"Parts {'+' if do >= 0 else ''}{do}"
            )
        else:
            self._delta_lbl.setText(f"{len(rows)} snapshot(s)")