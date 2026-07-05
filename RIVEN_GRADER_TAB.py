#!/usr/bin/env python3
"""Riven Grader Tab - your owned rivens with grades + weapon lookup."""

import json
from pathlib import Path

from PySide6.QtCore import Qt, QStringListModel, QTimer
from PySide6.QtGui import QColor, QBrush
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QComboBox,
    QTableWidget, QTableWidgetItem, QHeaderView, QFrame,
    QSplitter, QLineEdit, QCompleter,
)

WFINFO_DIR = Path(__file__).parent
from paths import DATA_DIR
GRADED_FILE = DATA_DIR / "riven-graded.json"

GRADE_COLORS = {
    "great":   "#3eff3e",
    "good":    "#ffd24c",
    "ok":      "#ff9933",
    "weak":    "#ff6060",
    "reroll":  "#ff4444",
    "unknown": "#6a88aa",
}
GRADE_LABELS = {
    "great":  "\u2605 GREAT",
    "good":   "\u25b2 GOOD",
    "ok":     "\u25a0 OK",
    "weak":   "\u25bc WEAK",
    "reroll": "\u21bb REROLL",
}

from theme import BG_PANEL, BG_CARD, FG, DIM, GOLD, SAP_MID as SAP
from paths import DATA_DIR


class RivenGraderTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._riven_data = {}
        self._weapon_lookup = []
        self._graded_rivens = []
        self._last_mtime = 0
        self._setup_ui()
        self._load_riven_data()
        self._load_graded()
        self._poll_timer = QTimer(self)
        self._poll_timer.timeout.connect(self._poll)
        self._poll_timer.start(2000)

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(8)

        # Top bar: weapon lookup + grade badge
        top_frame = QFrame()
        top_frame.setStyleSheet(
            f"background:{BG_CARD}; border:1px solid {SAP}; border-radius:6px;"
        )
        top = QHBoxLayout(top_frame)
        top.setContentsMargins(10, 8, 10, 8)
        lbl = QLabel("Look up weapon:")
        lbl.setStyleSheet(f"color:{DIM}; font-size:12px; font-weight:600;")
        top.addWidget(lbl)
        self._weapon_combo = QComboBox()
        self._weapon_combo.setEditable(True)
        self._weapon_combo.setInsertPolicy(QComboBox.NoInsert)
        self._weapon_combo.setMinimumWidth(200)
        self._weapon_model = QStringListModel([])
        self._completer = QCompleter(self._weapon_model)
        self._completer.setCaseSensitivity(Qt.CaseInsensitive)
        self._completer.setCompletionMode(QCompleter.PopupCompletion)
        self._weapon_combo.setCompleter(self._completer)
        self._completer.activated.connect(self._on_completer)
        self._weapon_combo.lineEdit().textChanged.connect(self._filter_weapons)
        self._weapon_combo.currentTextChanged.connect(self._on_weapon_changed)
        top.addWidget(self._weapon_combo, 1)
        self._grade_badge = QLabel("")
        self._grade_badge.setStyleSheet("font-size:13px; font-weight:700; padding:3px 12px; border-radius:4px;")
        top.addWidget(self._grade_badge)
        top.addStretch()
        layout.addWidget(top_frame)

        # Splitter: owned list | detail
        splitter = QSplitter(Qt.Horizontal)

        # Left: owned rivens
        left = QWidget()
        ll = QVBoxLayout(left)
        ll.setContentsMargins(0, 0, 0, 0)
        ll.setSpacing(4)

        hdr = QHBoxLayout()
        hdr.addWidget(self._lbl("Your Rivens", GOLD, 12, bold=True))
        hdr.addStretch()
        self._filter_edit = QLineEdit()
        self._filter_edit.setPlaceholderText("Filter...")
        self._filter_edit.setMaximumWidth(120)
        self._filter_edit.textChanged.connect(self._apply_filter)
        hdr.addWidget(self._filter_edit)
        ll.addLayout(hdr)

        self._owned = QTableWidget(0, 5)
        self._owned.setHorizontalHeaderLabels(["Weapon", "Grade", "Stats", "Rolls", "Perf%"])
        self._owned.horizontalHeader().setSectionResizeMode(0, QHeaderView.Interactive)
        self._owned.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeToContents)
        self._owned.horizontalHeader().setSectionResizeMode(2, QHeaderView.Stretch)
        self._owned.horizontalHeader().setSectionResizeMode(3, QHeaderView.ResizeToContents)
        self._owned.horizontalHeader().setSectionResizeMode(4, QHeaderView.ResizeToContents)
        self._owned.setColumnWidth(0, 140)
        self._owned.verticalHeader().setVisible(False)
        self._owned.setAlternatingRowColors(True)
        self._owned.setEditTriggers(QTableWidget.NoEditTriggers)
        self._owned.setSelectionBehavior(QTableWidget.SelectRows)
        self._owned.setSortingEnabled(True)
        self._owned.sortByColumn(0, Qt.AscendingOrder)
        self._owned.setStyleSheet(
            f"background:{BG_PANEL}; alternate-background-color:{BG_CARD}; "
            f"color:{FG}; gridline-color:#1e3a62; selection-background-color:#1e4a7a;"
            "QHeaderView::section{background:#0f1e3d;color:#c9a84c;font-weight:700;border-bottom:2px solid #2e6db4;}"
        )
        self._owned.itemSelectionChanged.connect(self._on_riven_selected)
        ll.addWidget(self._owned)

        self._empty_lbl = QLabel(
            "No riven data yet.\n\nRivens are graded automatically\n"
            "every 5 minutes while Warframe runs."
        )
        self._empty_lbl.setAlignment(Qt.AlignCenter)
        self._empty_lbl.setStyleSheet(f"color:{DIM}; font-size:12px; padding:20px;")
        self._empty_lbl.setVisible(False)
        ll.addWidget(self._empty_lbl)

        splitter.addWidget(left)

        # Right: detail panel
        right = QWidget()
        rl = QVBoxLayout(right)
        rl.setContentsMargins(6, 0, 0, 0)
        rl.setSpacing(6)
        self._detail_title = QLabel("Select a riven or search a weapon above")
        self._detail_title.setStyleSheet(f"color:{GOLD}; font-size:13px; font-weight:700;")
        rl.addWidget(self._detail_title)
        self._detail = QTableWidget(0, 2)
        self._detail.setHorizontalHeaderLabels(["Role", "Stats"])
        self._detail.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeToContents)
        self._detail.horizontalHeader().setSectionResizeMode(1, QHeaderView.Stretch)
        self._detail.verticalHeader().setVisible(False)
        self._detail.setEditTriggers(QTableWidget.NoEditTriggers)
        self._detail.setAlternatingRowColors(True)
        self._detail.setStyleSheet(
            f"background:{BG_PANEL}; alternate-background-color:{BG_CARD}; "
            f"color:{FG}; gridline-color:#1e3a62;"
            "QHeaderView::section{background:#0f1e3d;color:#c9a84c;font-weight:700;border-bottom:2px solid #2e6db4;}"
        )
        rl.addWidget(self._detail)
        self._notes = QLabel("")
        self._notes.setWordWrap(True)
        self._notes.setStyleSheet(f"color:{DIM}; font-size:11px; padding:2px 0;")
        rl.addWidget(self._notes)
        splitter.addWidget(right)
        splitter.setSizes([420, 360])
        layout.addWidget(splitter, stretch=1)

    def _lbl(self, text, color=None, size=12, bold=False):
        l = QLabel(text)
        l.setStyleSheet(f"color:{color or FG}; font-size:{size}px; font-weight:{'700' if bold else '400'};")
        return l

    # ── Data ──────────────────────────────────────────────────────────────

    def _load_riven_data(self):
        try:
            self._riven_data = json.loads((WFINFO_DIR / "riven_good_rolls.json").read_text())
        except Exception:
            self._riven_data = {}
        self._weapon_lookup = sorted(
            n for cat in self._riven_data.get("categories", {}).values() for n in cat
        )
        self._weapon_model.setStringList(self._weapon_lookup)
        self._weapon_combo.addItems(self._weapon_lookup)

    def _load_graded(self):
        try:
            if GRADED_FILE.exists():
                state = json.loads(GRADED_FILE.read_text())
                self._graded_rivens = state.get("rivens", [])
                self._last_mtime = GRADED_FILE.stat().st_mtime
        except Exception:
            self._graded_rivens = []
        self._populate_owned()

    def _poll(self):
        try:
            if GRADED_FILE.exists():
                mt = GRADED_FILE.stat().st_mtime
                if mt != self._last_mtime:
                    self._load_graded()
        except Exception:
            pass

    # ── Owned table ───────────────────────────────────────────────────────

    def _populate_owned(self):
        self._owned.setSortingEnabled(False)
        self._owned.setRowCount(0)
        legend = self._riven_data.get("legend", {})

        if not self._graded_rivens:
            self._owned.setVisible(False)
            self._empty_lbl.setVisible(True)
            return
        self._owned.setVisible(True)
        self._empty_lbl.setVisible(False)

        for r in self._graded_rivens:
            row = self._owned.rowCount()
            self._owned.insertRow(row)
            grade = r.get("grade", "unknown")
            color = GRADE_COLORS.get(grade, DIM)

            w = QTableWidgetItem(r.get("weapon", "?").title())
            w.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter)
            w.setData(Qt.UserRole, r)
            self._owned.setItem(row, 0, w)

            g = QTableWidgetItem(GRADE_LABELS.get(grade, grade.upper()))
            g.setForeground(QBrush(QColor(color)))
            g.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
            # Sort order: great=0, good=1, ok=2, weak=3, reroll=4
            g.setData(Qt.UserRole, {"great":0,"good":1,"ok":2,"weak":3,"reroll":4}.get(grade,5))
            self._owned.setItem(row, 1, g)

            pos = [f"+{legend.get(c,c)}" for c in r.get("positives",[])]
            neg = [f"-{legend.get(c,c)}" for c in r.get("negatives",[])]
            s = QTableWidgetItem("  ".join(pos+neg))
            s.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter)
            self._owned.setItem(row, 2, s)

            rr = QTableWidgetItem()
            rr.setData(Qt.DisplayRole, r.get("rerolls", 0))
            rr.setForeground(QBrush(QColor(DIM)))
            rr.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
            self._owned.setItem(row, 3, rr)

            # Perfectness column
            perf = r.get("perfectness", 0.0)
            perf_item = QTableWidgetItem()
            perf_item.setData(Qt.DisplayRole, perf)
            perf_item.setData(Qt.DisplayRole, f"{perf:.0f}%")
            if perf >= 90:
                perf_color = GOLD         # god tier
            elif perf >= 60:
                perf_color = "#3eff3e"    # good
            elif perf >= 30:
                perf_color = "#ffd24c"    # average
            else:
                perf_color = DIM          # poor
            perf_item.setForeground(QBrush(QColor(perf_color)))
            perf_item.setTextAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
            self._owned.setItem(row, 4, perf_item)

            # Subtle grade tint on whole row
            bg = QColor(color); bg.setAlpha(18)
            for col in range(5):
                item = self._owned.item(row, col)
                if item:
                    item.setBackground(QBrush(bg))

        self._owned.setSortingEnabled(True)
        self._apply_filter(self._filter_edit.text())

    def _apply_filter(self, text):
        q = text.strip().lower()
        for row in range(self._owned.rowCount()):
            w = self._owned.item(row, 0)
            s = self._owned.item(row, 2)
            hide = bool(q and q not in (w.text().lower() if w else "") and q not in (s.text().lower() if s else ""))
            self._owned.setRowHidden(row, hide)

    def _on_riven_selected(self):
        row = self._owned.currentRow()
        if row < 0:
            return
        item = self._owned.item(row, 0)
        if not item:
            return
        riven = item.data(Qt.UserRole)
        if riven:
            self._weapon_combo.blockSignals(True)
            self._weapon_combo.lineEdit().setText(riven.get("weapon", ""))
            self._weapon_combo.blockSignals(False)
            self._show_detail(riven.get("weapon", ""), riven)

    # ── Weapon detail ─────────────────────────────────────────────────────

    def _filter_weapons(self, text):
        t = text.strip()
        self._weapon_model.setStringList(
            [n for n in self._weapon_lookup if t.lower() in n.lower()] if t else self._weapon_lookup
        )
        exact = next((n for n in self._weapon_lookup if n.lower() == t.lower()), None)
        if exact:
            self._show_detail(exact)

    def _on_completer(self, text):
        if text:
            self._weapon_combo.lineEdit().setText(text)
            self._show_detail(text)

    def _on_weapon_changed(self, text):
        match = next((n for n in self._weapon_lookup if n.lower() == text.lower()), None)
        if match:
            self._show_detail(match)

    def _show_detail(self, weapon, riven=None):
        self._detail.setRowCount(0)
        self._notes.setText("")
        legend = self._riven_data.get("legend", {})

        data = next(
            (cat[weapon] for cat in self._riven_data.get("categories", {}).values() if weapon in cat),
            None
        )

        if not data:
            self._detail_title.setText(f"{weapon.title()} \u2014 not in database")
            self._grade_badge.setText("")
            return

        if riven:
            grade = riven.get("grade", "unknown")
            gc = GRADE_COLORS.get(grade, DIM)
            self._detail_title.setText(f"{weapon.title()}  \u2014  {riven.get('rerolls',0)} rerolls  \u00b7  {riven.get('polarity','')}")
            self._grade_badge.setText(GRADE_LABELS.get(grade, grade.upper()))
            self._grade_badge.setStyleSheet(
                f"font-size:13px; font-weight:700; padding:3px 12px; border-radius:4px; "
                f"color:{gc}; background:#0b1628; border:1px solid {gc};"
            )
        else:
            self._detail_title.setText(f"{weapon.title()} \u2014 Good Roll Guide")
            self._grade_badge.setText("")

        hp = set(riven.get("positives", [])) if riven else set()
        hn = set(riven.get("negatives", [])) if riven else set()
        # Per-stat perfectness lookup: code -> percentage
        buff_pcts = riven.get("buff_pcts", []) if riven else []
        curse_pcts = riven.get("curse_pcts", []) if riven else []
        pos_list = riven.get("positives", []) if riven else []
        neg_list = riven.get("negatives", []) if riven else []
        stat_pct = {}
        for i, code in enumerate(pos_list):
            if i < len(buff_pcts):
                stat_pct[code] = buff_pcts[i]
        for i, code in enumerate(neg_list):
            if i < len(curse_pcts):
                stat_pct[code] = curse_pcts[i]
        safe_negs = set(data.get("safe_negatives", []))
        seen = set()

        for idx, combo in enumerate(data.get("good_combos", []), 1):
            if idx > 1:
                self._add_row("\u2500", "\u2500" * 30, "#0d1628", DIM, DIM)

            for stat in combo.get("mandatory", []):
                stext = legend.get(stat, stat)
                k = ("M", stext)
                if k in seen: continue
                seen.add(k)
                matched = stat in hp
                bg = "#1a4a1a" if matched else "#162030"
                fc = "#3eff3e" if matched else "#4a90d9"
                pct = stat_pct.get(stat)
                pct_str = f"  {pct:.0f}%" if pct is not None else ""
                self._add_row("MUST HAVE", f"{stext}{pct_str}", bg, fc, "#3eff3e" if matched else FG)

            pick = combo.get("pick_from", [])
            if pick:
                n = combo.get("pick_n", 0)
                pick_parts = []
                for s in pick:
                    sname = legend.get(s, s)
                    pct = stat_pct.get(s)
                    if pct is not None:
                        pick_parts.append(f"{sname} ({pct:.0f}%)")
                    else:
                        pick_parts.append(sname)
                ptext = ",  ".join(pick_parts)
                k = (f"P{n}", ptext[:40])
                if k not in seen:
                    seen.add(k)
                    any_match = any(s in hp for s in pick)
                    bg = "#2a3a0a" if any_match else "#1a1a30"
                    fc = GOLD if any_match else DIM
                    self._add_row(f"Pick {n} of:", ptext, bg, fc, "#ffd24c" if any_match else FG)

        if safe_negs:
            stext = ",  ".join(legend.get(s, s) for s in safe_negs)
            has_safe = bool(hn & safe_negs)
            self._add_row("Safe \u2212", stext, "#0d2b4a" if has_safe else "#101828",
                          "#4a90d9" if has_safe else DIM,
                          "#8fd3ff" if has_safe else DIM)

        risky = hn - safe_negs
        if risky:
            rtext = ",  ".join(legend.get(s, s) for s in risky)
            self._add_row("Risky \u2212", rtext, "#3a1010", "#ff6060", "#ff8888")

        if data.get("notes"):
            self._notes.setText(data["notes"])

    def _add_row(self, role, stat, bg_hex, role_color, stat_color):
        r = self._detail.rowCount()
        self._detail.insertRow(r)
        bg = QBrush(QColor(bg_hex))
        ri = QTableWidgetItem(role)
        ri.setBackground(bg); ri.setForeground(QBrush(QColor(role_color)))
        ri.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter)
        self._detail.setItem(r, 0, ri)
        si = QTableWidgetItem(stat)
        si.setBackground(bg); si.setForeground(QBrush(QColor(stat_color)))
        si.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter)
        self._detail.setItem(r, 1, si)

    def get_current_weapon(self):
        return self._weapon_combo.currentText()