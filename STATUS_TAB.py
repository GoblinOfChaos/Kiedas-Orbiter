#!/usr/bin/env python3
"""Status & Tools tab — live status, maintenance actions, and log viewer."""

import json
import os
import subprocess
import sys
import time
from glob import glob
from pathlib import Path

try:
    from paths import (
        get_ee_log_path, get_inventory_path, set_ee_log_path, set_inventory_path,
        get_screenshot_hotkey, set_screenshot_hotkey, describe_paths, DATA_DIR, WFINFO_DIR,
        get_close_behavior, set_close_behavior, get_pre_capture_sleep_ms, build_detector_args,
        CONFIG_FILE,
    )
except Exception:
    get_ee_log_path = get_inventory_path = set_ee_log_path = set_inventory_path = describe_paths = None
    get_screenshot_hotkey = set_screenshot_hotkey = None
    get_close_behavior = set_close_behavior = None
    get_pre_capture_sleep_ms = None
    build_detector_args = None
    CONFIG_FILE = Path(__file__).parent / "config.json"

from PySide6.QtCore import Qt, QTimer, QProcess, QProcessEnvironment, QEvent, QSize
from PySide6.QtGui import QFont
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout, QScrollArea, QFrame,
    QPushButton, QLabel, QGroupBox, QFormLayout, QTextEdit, QMessageBox,
    QSplitter, QSizePolicy, QLineEdit, QFileDialog, QComboBox,
)
from editable_layout import EditableCanvas, edit_mode_toolbar


class _ScrollLockCombo(QComboBox):
    """ComboBox that ignores scroll-wheel events entirely.
    Prevents the theme from changing when the user scrolls the page.
    Use the Apply button or press Enter to confirm a selection."""
    def wheelEvent(self, event):
        # Always ignore — scroll wheel on a combo in a scrollable page is
        # almost always accidental.  User must click to open the dropdown.
        event.ignore()


class _ElidingButton(QPushButton):
    """A QPushButton that shrinks its own text with a trailing ellipsis
    as it narrows, instead of having a hard floor at its full text's
    width. Plain QPushButton has no built-in truncation - its
    minimumSizeHint is basically its full-text sizeHint, so a QHBoxLayout
    literally cannot shrink it below that no matter what stretch factor
    you give it. That's why giving two buttons equal stretch had zero
    visible effect earlier - neither could actually shrink. Jacob
    2026-07-24 ("all of these cut off text when sizing down" / "you also
    never fixed the buttons")."""
    def __init__(self, text, parent=None):
        super().__init__(text, parent)
        self._full_text = text

    def setText(self, text):
        self._full_text = text
        super().setText(text)
        self._reflow_text()

    def _reflow_text(self):
        fm = self.fontMetrics()
        avail = max(10, self.width() - 24)
        super().setText(fm.elidedText(self._full_text, Qt.ElideRight, avail))

    def resizeEvent(self, event):
        super().resizeEvent(event)
        self._reflow_text()


class _ElidingLabel(QLabel):
    """Same idea as _ElidingButton but for QLabel - the File Paths card's
    "Found: /long/path/..." status labels have no truncation at all, so
    narrowing the card just clipped them mid-character instead of eliding
    gracefully. Jacob 2026-07-24 ("shrink the card and it works like the
    others" / "its forced to cut it")."""
    def __init__(self, text="", parent=None):
        super().__init__(text, parent)
        self._full_text = text

    def setText(self, text):
        self._full_text = text
        super().setText(text)
        self._reflow_text()

    def _reflow_text(self):
        fm = self.fontMetrics()
        avail = max(10, self.width())
        super().setText(fm.elidedText(self._full_text, Qt.ElideRight, avail))

    def resizeEvent(self, event):
        super().resizeEvent(event)
        self._reflow_text()

    def minimumSizeHint(self):
        """Let layouts shrink this label instead of reserving the full path."""
        return QSize(0, super().minimumSizeHint().height())


from theme import get_palette, COLOR_GREAT, COLOR_BAD


def _p():
    """Return current theme palette — always fresh."""
    return get_palette()

HOME = Path.home()
HELPER_SRC = HOME / "helper-src"
OWNED_FILE = WFINFO_DIR / "owned_items.json"
WFCD_CACHE = WFINFO_DIR / "wfcd_all_cache.json"
OVERLAY_SCRIPT = WFINFO_DIR / "overlay.py"
import sys as _sys
VENV_PYTHON = WFINFO_DIR / (".venv/Scripts/python.exe" if _sys.platform == "win32" else ".venv/bin/python")
STATE_FILE = DATA_DIR / "latest-detection.json"
LOG_FILE = DATA_DIR / "overlay.log"


from platform_utils import is_running, kill_processes
import autostart_manager
import service_registry
from toggle_switch import ToggleSwitch


def _pgrep(pattern):
    return is_running(pattern)


def _humanize_age(mtime):
    if mtime == 0:
        return "never"
    age = time.time() - mtime
    if age < 60:
        return f"{int(age)}s ago"
    if age < 3600:
        return f"{int(age/60)}m ago"
    if age < 86400:
        return f"{int(age/3600)}h ago"
    return f"{int(age/86400)}d ago"


def _find_qt_lib_dir():
    matches = glob(str(WFINFO_DIR / ".venv/lib*/python*/site-packages/PySide6/Qt/lib"))
    return matches[0] if matches else None


def _status_html(running):
    if running:
        return '<span style="color: #3eff3e; font-weight: bold;">● Running</span>'
    return '<span style="color: #6a88aa;">○ Not running</span>'


class StatusTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.process = None
        self._step_timeout_process = None
        self._setup_ui()

        self.refresh_timer = QTimer(self)
        self.refresh_timer.timeout.connect(self._update_status)
        self.refresh_timer.start(2000)
        self._update_status()

    # ── Helpers ───────────────────────────────────────────────────────────

    def _card(self, title=None, accent=None):
        """Create a styled card frame using the current theme palette."""
        p = _p()
        if accent is None:
            accent = p['accent_mid']
        frame = QWidget()
        frame.setStyleSheet(
            f"QWidget {{ background: {p['bg_panel']}; border: 1px solid {p['border']}; border-radius: 8px; }}"
        )
        vl = QVBoxLayout(frame)
        vl.setContentsMargins(0, 0, 0, 0)
        vl.setSpacing(0)
        if title:
            hdr = QWidget()
            hdr.setStyleSheet(
                f"background: {p['bg_header']}; border-bottom: 1px solid {p['border']}; "
                f"border-radius: 8px 8px 0 0;"
            )
            hl = QHBoxLayout(hdr)
            hl.setContentsMargins(12, 7, 12, 7)
            hl.addStretch()
            lbl = QLabel(title)
            lbl.setStyleSheet(f"color: {p['gold']}; font-size: 12px; font-weight: 700; "
                              f"letter-spacing: 0.5px; background: transparent;")
            hl.addWidget(lbl)
            hl.addStretch()
            vl.addWidget(hdr)
        body = QWidget()
        body.setStyleSheet("background: transparent; border: none;")
        vl.addWidget(body)
        return frame, body

    def _action_btn(self, text, tooltip="", primary=False):
        """Styled action button using the current theme palette."""
        p = _p()
        b = _ElidingButton(text)
        b.setToolTip(tooltip)
        if primary:
            b.setStyleSheet(
                f"QPushButton {{ background: {p['bg_card']}; color: {p['gold']}; border: 1px solid {p['accent_mid']}; "
                f"border-radius: 5px; padding: 8px 16px; font-size: 13px; font-weight: 700; }}"
                f"QPushButton:hover {{ background: {p['bg_panel']}; color: {p['gold_bright']}; border-color: {p['accent']}; }}"
                f"QPushButton:disabled {{ background: {p['bg_input']}; color: {p['fg_dim']}; border-color: {p['border']}; }}"
            )
        else:
            b.setStyleSheet(
                f"QPushButton {{ background: {p['bg_header']}; color: {p['fg']}; border: 1px solid {p['border']}; "
                f"border-radius: 5px; padding: 10px 14px; font-size: 14px; }}"
                f"QPushButton:hover {{ background: {p['bg_card']}; color: {p['gold_bright']}; border-color: {p['accent_mid']}; }}"
                f"QPushButton:disabled {{ color: {p['fg_dim']}; border-color: {p['border']}; }}"
            )
            b.setMinimumHeight(40)
        return b

    def _row_lbl(self, key, val_widget, layout):
        """Add a key: value row to a form-like layout."""
        p = _p()
        row = QHBoxLayout()
        k = QLabel(key)
        k.setStyleSheet(f"color: {p['fg_dim']}; font-size: 12px; background: transparent;")
        k.setFixedWidth(160)
        row.addWidget(k)
        row.addWidget(val_widget)
        row.addStretch()
        layout.addLayout(row)

    def refresh_styles(self):
        """Rebuild the entire tab UI with the current theme. Called on theme change."""
        # Remove all existing widgets and rebuild
        old_layout = self.layout()
        if old_layout:
            while old_layout.count():
                item = old_layout.takeAt(0)
                if item.widget():
                    item.widget().deleteLater()
            QWidget().setLayout(old_layout)  # hand off old layout to temp widget
        self.process = None
        self._setup_ui()
        # Restart timers
        if hasattr(self, 'refresh_timer'):
            self.refresh_timer.start(2000)
        self._update_status()

    def _setup_ui(self):
        p = _p()
        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.setSpacing(0)

        # Rebuilt to match DASHBOARD_TAB.py's confirmed-working scroll
        # setup exactly (that tab handles the same absolutely-positioned
        # EditableCanvas correctly) instead of continuing to patch this
        # one incrementally. Two real differences from Dashboard's version
        # are fixed here: this scroll was added to `outer` with no stretch
        # factor (Dashboard uses stretch=1), and the canvas itself never
        # got an explicit background stylesheet (Dashboard sets one).
        # Jacob 2026-07-24 ("remake the box from scratch").
        self._canvas = EditableCanvas(DATA_DIR / "status_layout.json")
        toolbar_bar = QFrame()
        toolbar_bar.setStyleSheet(
            f"background: {p['bg_panel']}; border-bottom: 1px solid {p['border']};"
        )
        toolbar_bar_layout = QHBoxLayout(toolbar_bar)
        toolbar_bar_layout.setContentsMargins(12, 6, 12, 6)
        toolbar_bar_layout.addWidget(edit_mode_toolbar(self._canvas))
        toolbar_bar_layout.addStretch()
        outer.addWidget(toolbar_bar)

        scroll = QScrollArea()
        scroll.setWidgetResizable(False)
        scroll.setStyleSheet(f"QScrollArea {{ border: none; background: {p['bg']}; }}")
        self._canvas.setStyleSheet(f"background: {p['bg']};")
        outer.addWidget(scroll, stretch=1)

        # Cards below are collected here instead of being added to `main`
        # directly, then placed on an EditableCanvas (drag to move, corner
        # grip to resize - width change re-wraps text and grows/shrinks
        # the card's height to fit). Saved layout lives in
        # status_layout.json. Jacob 2026-07-23.
        self._status_cards = []

        # Status card + Refresh button - two independent cards that just
        # default to sharing a row (same fix as Arbitration/Steel Path:
        # wrapping them into one combined widget meant dragging one
        # dragged both). Jacob 2026-07-23.
        status_frame, status_body = self._card("● LIVE STATUS", "#3eff3e")
        status_layout = QVBoxLayout(status_body)
        status_layout.setContentsMargins(12, 10, 12, 12)
        status_layout.setSpacing(6)

        self.lbl_warframe = QLabel()
        self.lbl_wfinfo   = QLabel()
        self.lbl_overlay  = QLabel()
        self.lbl_refresh  = QLabel()
        self.lbl_count    = QLabel()
        self.lbl_detection= QLabel()

        for label_text, widget in [
            ("Warframe:", self.lbl_warframe),
            ("Detector:", self.lbl_wfinfo),
            ("Overlay:", self.lbl_overlay),
            ("Last refresh:", self.lbl_refresh),
            ("Items in db:", self.lbl_count),
            ("Last detection:", self.lbl_detection),
        ]:
            widget.setStyleSheet(f"color: {p['fg']}; font-size: 12px; background: transparent;")
            self._row_lbl(label_text, widget, status_layout)

        # Primary refresh button (right of status)
        self.btn_refresh = self._action_btn(
            "\u27f3  Refresh Data",
            "Re-reads inventory.json and rebuilds all data files.\n"
            "Best done in your orbiter or on a loading screen.",
            primary=True
        )
        self.btn_refresh.setMinimumHeight(60)
        self.btn_refresh.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        self.btn_refresh.clicked.connect(self.refresh_inventory)
        # Needs a real title-bar header like every other card - without
        # one, EditableCanvas._install_inner() (which always pulls the
        # content's first child out as a fixed-height header/drag handle)
        # grabbed the button itself as that "header" instead. A
        # QPushButton swallows its own mouse-press events, so clicking
        # anywhere on the card just clicked the button and the click never
        # reached the card to start a drag - it couldn't be moved OR
        # resized. Jacob 2026-07-24.
        refresh_frame, refresh_body = self._card("\u27f3  REFRESH DATA", p['gold'])
        refresh_body_layout = QVBoxLayout(refresh_body)
        refresh_body_layout.setContentsMargins(12, 10, 12, 12)
        refresh_body_layout.addWidget(self.btn_refresh)

        self._status_cards.append([
            ("status", status_frame, 620, 190),
            ("refresh", refresh_frame, 280, 190),
        ])

        # ── Actions card ──────────────────────────────────────────────────
        act_frame, act_body = self._card("\u2699  ACTIONS", "#c9a84c")
        act_layout = QGridLayout(act_body)
        act_layout.setContentsMargins(12, 10, 12, 12)
        act_layout.setSpacing(8)
        # Without explicit equal stretch, the two columns don't split the
        # card width evenly - buttons stay at their natural text width
        # and the leftover space becomes a dead gap down the middle
        # instead of the buttons filling their cell. Jacob 2026-07-22
        # (screenshot, circled): huge empty band between the two button
        # columns.
        act_layout.setColumnStretch(0, 1)
        act_layout.setColumnStretch(1, 1)

        def _abtn(text, tip, slot, r, c, span=1):
            b = self._action_btn(text, tip)
            b.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)
            b.clicked.connect(slot)
            act_layout.addWidget(b, r, c, 1, span)
            return b

        self.btn_update      = _abtn("Update Game Data",        "Refresh prices + item list from warframestat.us",           self.update_data,        0, 0)
        self.btn_refresh_wfcd= _abtn("Refresh WFCD Cache",      "Download fresh item database from WFCD GitHub (~40MB)",     self.refresh_wfcd_cache, 0, 1)
        self.btn_real_prices = _abtn("Fetch Live Prices",        "Get real plat prices from warframe.market — takes ~5 min", self.fetch_real_prices,  1, 0)
        self.btn_reset_cache = _abtn("Clear Cache",              "Delete the WFCD cache so it re-downloads on next refresh",  self.reset_wfcd_cache,   1, 1)
        self.btn_overlay     = _abtn("Restart Overlay",          "Kill and relaunch the reward/relic overlay window",        self.restart_overlay,    2, 0)
        self.btn_test        = _abtn("Test Overlay",             "Write a fake detection so the overlay pops up to test it", self.test_overlay,       2, 1)
        self.btn_reload_cfg  = _abtn("Reload Detector Config",   "Restart the OCR detector to pick up config.json changes",  self.reload_config,      3, 0)
        self.btn_rebuild     = _abtn("Rebuild API Helper",       "Pull + rebuild warframe-api-helper from source",           self.rebuild_helper,     3, 1)
        self._status_cards.append([("actions", act_frame, 900, 260)])

        # ── Overlay settings card ─────────────────────────────────────────
        from PySide6.QtWidgets import QComboBox as _CB2
        ov_frame, ov_body = self._card("📺  OVERLAY DISPLAY", p['accent'])
        ol = QVBoxLayout(ov_body)
        ol.setContentsMargins(12, 10, 12, 12)
        ol.setSpacing(10)

        # Monitor selector row
        mon_row = QHBoxLayout()
        mon_lbl = QLabel("Display on:")
        mon_lbl.setStyleSheet(f"color: {p['fg_dim']}; font-size: 12px; background: transparent;")
        mon_lbl.setFixedWidth(100)
        self._monitor_combo = _CB2()
        self._monitor_combo.setFocusPolicy(Qt.StrongFocus)
        self._monitor_combo.setMinimumHeight(30)
        self._monitor_combo.setToolTip(
            "Which monitor the overlay appears on when first shown.\n"
            "You can still drag it anywhere — this only sets the starting position.\n"
            "Use 'Reset Position' to move it back to this monitor's default position."
        )
        self._monitor_combo.wheelEvent = lambda e: e.ignore()  # no accidental scroll
        # The app's global theme doesn't give QComboBox a visible
        # border/arrow, so without this it just reads as flat label text
        # instead of an obvious dropdown - confirmed by Jacob mistaking it
        # for plain info text.
        self._monitor_combo.setStyleSheet(
            f"QComboBox {{ background: {p['bg_input']}; color: {p['fg']}; "
            f"border: 1px solid {p['border']}; border-radius: 4px; padding: 4px 8px; }}"
            f"QComboBox::drop-down {{ border: none; width: 22px; }}"
            f"QComboBox::down-arrow {{ image: none; border-left: 4px solid transparent; "
            f"border-right: 4px solid transparent; border-top: 5px solid {p['fg_dim']}; "
            f"margin-right: 6px; }}"
            f"QComboBox QAbstractItemView {{ background: {p['bg_panel']}; color: {p['fg']}; "
            f"selection-background-color: {p['accent_dim']}; border: 1px solid {p['border']}; }}"
        )

        # Populate with current screens
        from PySide6.QtWidgets import QApplication as _QApp2
        screens = _QApp2.screens()
        self._monitor_combo.addItem("Auto (follow Warframe window)", "auto")
        for i, s in enumerate(screens):
            g = s.geometry()
            name = s.name() or f"Monitor {i+1}"
            primary = " — Primary" if s == _QApp2.primaryScreen() else ""
            self._monitor_combo.addItem(
                f"Monitor {i+1}: {name}  {g.width()}×{g.height()}{primary}", i
            )

        # Load saved value
        try:
            _cfg = json.loads(CONFIG_FILE.read_text())
            saved_mon = _cfg.get("overlay_monitor", "auto")
            for idx in range(self._monitor_combo.count()):
                if self._monitor_combo.itemData(idx) == saved_mon:
                    self._monitor_combo.setCurrentIndex(idx)
                    break
        except Exception:
            pass

        mon_row.addWidget(mon_lbl)
        mon_row.addWidget(self._monitor_combo, stretch=1)
        ol.addLayout(mon_row)

        # Reset saved position + save monitor button
        btn_row2 = QHBoxLayout()
        save_mon_btn = self._action_btn("Save Monitor Choice && Reset Overlay Position",
            "Save monitor choice and clear the overlay's remembered drag position\n"
            "so it snaps to the new monitor on next detection.")
        reset_pos_btn = self._action_btn("Reset Position Only",
            "Clear the overlay's remembered drag position without changing monitor.")

        def _save_monitor():
            try:
                cfg_path = CONFIG_FILE
                cfg = json.loads(cfg_path.read_text()) if cfg_path.exists() else {}
                cfg["overlay_monitor"] = self._monitor_combo.currentData()
                cfg_path.write_text(json.dumps(cfg, indent=2))
                # Clear saved positions for both overlays
                for pos_file in [
                    DATA_DIR / "overlay-position.json",
                    DATA_DIR / "riven-overlay-position.json",
                ]:
                    if pos_file.exists():
                        pos_file.unlink()
                self.lbl_status.setText("Overlay monitor saved. Restart overlay to apply.")
            except Exception as e:
                self.lbl_status.setText(f"Failed to save: {e}")

        def _reset_position():
            for pos_file in [
                DATA_DIR / "overlay-position.json",
                DATA_DIR / "riven-overlay-position.json",
            ]:
                if pos_file.exists():
                    pos_file.unlink()
            self.lbl_status.setText("Overlay position reset. Next detection will reposition.")

        save_mon_btn.clicked.connect(_save_monitor)
        reset_pos_btn.clicked.connect(_reset_position)
        # Without equal stretch, QHBoxLayout shrank these two unevenly as
        # the card narrowed - Reset Position (shorter text, less slack)
        # got squeezed down to unreadable while Save Monitor Choice barely
        # moved. Jacob 2026-07-24 ("only shrinks reset button and not save
        # monitor").
        btn_row2.addWidget(save_mon_btn, stretch=1)
        btn_row2.addWidget(reset_pos_btn, stretch=1)
        ol.addLayout(btn_row2)

        hint2 = QLabel("Tip: drag the overlay during a detection to reposition it. That position is saved automatically.")
        hint2.setStyleSheet(f"color: {p['fg_dim']}; font-size: 11px; background: transparent;")
        hint2.setWordWrap(True)
        ol.addWidget(hint2)
        self._status_cards.append([("overlay", ov_frame, 900, 230)])

        # ── Auto-Start card ──────────────────────────────────────────────
        as_frame, as_body = self._card("▶  AUTO-START", p['green'])
        as_layout = QVBoxLayout(as_body)
        as_layout.setContentsMargins(12, 10, 12, 12)
        as_layout.setSpacing(10)

        as_hint = QLabel(
            "Auto-start: Detector and Watcher launch as soon as this app opens. "
            "The four overlays below them only start once Warframe is actually "
            "running, and stop again once it closes. "
            "Off → On: current live status — flip it to start or stop right away, "
            "independent of the auto-start setting."
        )
        as_hint.setStyleSheet(f"color: {p['fg_dim']}; font-size: 11px; background: transparent;")
        as_hint.setWordWrap(True)
        as_layout.addWidget(as_hint)

        grid = QGridLayout()
        grid.setHorizontalSpacing(18)
        grid.setVerticalSpacing(8)
        # No column stretch here (was setColumnStretch(0, 1), which made
        # the label column consume the ENTIRE card width, leaving a big
        # dead gap between the label text and the toggle switches pushed
        # to the far right edge - Jacob 2026-07-22 screenshot). The grid
        # is wrapped below in an HBox + addStretch() instead, so it stays
        # naturally compact (labels right next to their toggles) rather
        # than spanning the full card width.

        col_auto = QLabel("Auto-start")
        col_auto.setStyleSheet(f"color: {p['fg_dim']}; font-size: 10px; font-weight: 700;")
        col_auto.setAlignment(Qt.AlignCenter)
        col_on = QLabel("Off → On")
        col_on.setStyleSheet(f"color: {p['fg_dim']}; font-size: 10px; font-weight: 700;")
        col_on.setAlignment(Qt.AlignCenter)
        grid.addWidget(col_auto, 0, 1)
        grid.addWidget(col_on, 0, 2)

        self._autostart_toggles = {}
        self._enabled_toggles = {}
        for row, feature in enumerate(autostart_manager.FEATURES, start=1):
            lbl = QLabel(autostart_manager.FEATURE_LABELS[feature])
            lbl.setStyleSheet(f"color: {p['fg']}; font-size: 12px; background: transparent;")
            grid.addWidget(lbl, row, 0)

            auto_toggle = ToggleSwitch()
            auto_toggle.setChecked(autostart_manager.get_autostart(feature))
            auto_toggle.toggledOn.connect(lambda checked, f=feature: self._on_autostart_toggled(f, checked))
            grid.addWidget(auto_toggle, row, 1, Qt.AlignCenter)
            self._autostart_toggles[feature] = auto_toggle

            on_toggle = ToggleSwitch(on_color=p['green'])
            on_toggle.setChecked(autostart_manager.is_feature_running(feature))
            on_toggle.toggledOn.connect(lambda checked, f=feature: self._on_enabled_toggled(f, checked))
            grid.addWidget(on_toggle, row, 2, Qt.AlignCenter)
            self._enabled_toggles[feature] = on_toggle

        grid_row = QHBoxLayout()
        grid_row.addLayout(grid)
        grid_row.addStretch()
        as_layout.addLayout(grid_row)
        self._status_cards.append([("autostart", as_frame, 900, 280)])

        # ── On Close card ────────────────────────────────────────────────
        close_frame, close_body = self._card("✖  ON CLOSE", "#4a90d9")
        close_body_layout = QVBoxLayout(close_body)
        close_body_layout.setContentsMargins(12, 10, 12, 12)
        close_body_layout.setSpacing(8)

        close_row = QHBoxLayout()
        close_row.setSpacing(10)

        close_label = QLabel("Exit Program")
        close_label.setStyleSheet(f"color: {p['fg']}; font-size: 12px; background: transparent;")
        close_row.addWidget(close_label)

        self._close_toggle = ToggleSwitch(on_color=p['green'])
        if get_close_behavior is not None:
            self._close_toggle.setChecked(get_close_behavior() == "tray")
        self._close_toggle.toggledOn.connect(self._on_close_behavior_toggled)
        close_row.addWidget(self._close_toggle)

        close_label2 = QLabel("Minimize to Tray")
        close_label2.setStyleSheet(f"color: {p['fg']}; font-size: 12px; background: transparent;")
        close_row.addWidget(close_label2)
        close_row.addStretch()
        close_body_layout.addLayout(close_row)

        close_hint = QLabel(
            "Controls what the ✕ button does. Minimize to Tray keeps everything running "
            "in the background with a small tray icon; Exit Program fully quits and "
            "stops the detector, watcher, and all overlays."
        )
        close_hint.setStyleSheet(f"color: {p['fg_dim']}; font-size: 11px; background: transparent;")
        close_hint.setWordWrap(True)
        close_body_layout.addWidget(close_hint)

        self._status_cards.append([("onclose", close_frame, 900, 110)])

        # ── Paths card ────────────────────────────────────────────────────
        # The card's own rounded border/background used to render
        # narrower than its actual content (a long dynamically-set
        # "Found: /path" status label kept spilling past the visible box
        # edge). Root cause: the path QLineEdit had a hard
        # setFixedWidth(260) and the status label had no way to shrink
        # below its natural text width, so the row's real minimum width
        # was wider than whatever the card had actually been resized to -
        # the row just overflowed the frame instead of the frame growing/
        # shrinking with it. Fixed by letting both actually shrink: the
        # edit is now setMaximumWidth(260) + setMinimumWidth(0) +
        # Expanding policy, and the status label uses QSizePolicy.Ignored
        # so it can go narrower than its text's sizeHint, with
        # _ElidingLabel showing "\u2026" instead of raw clipping once it
        # does. Jacob 2026-07-24 ("it doesn't have the round wrapper
        # around it like the other cards").
        paths_frame, paths_body = self._card("\u25a1  FILE PATHS", "#4a90d9")
        pl = QVBoxLayout(paths_body)
        pl.setContentsMargins(12, 10, 12, 12)
        pl.setSpacing(8)

        hint = QLabel("Leave blank to auto-detect. Change only if files are in non-standard locations.")
        hint.setStyleSheet(f"color: {p['fg_dim']}; font-size: 11px; background: transparent;")
        hint.setWordWrap(True)
        pl.addWidget(hint)

        for attr, row_label, placeholder, browse_title, browse_filter in [
            ("_ee_path_edit",  "EE.log:",          "Auto-detect",
             "Find EE.log", "Log files (EE.log *.log);;All files (*)"),
            ("_inv_path_edit", "inventory.json:",  "Auto-detect",
             "Find inventory.json", "JSON files (*.json);;All files (*)"),
        ]:
            row = QHBoxLayout()
            lk = QLabel(row_label)
            lk.setStyleSheet(f"color: {p['fg_dim']}; font-size: 12px; background: transparent;")
            lk.setFixedWidth(120)
            edit = QLineEdit(); edit.setPlaceholderText(placeholder)
            # Prefer 260px at normal widths, but allow it to shrink with the card.
            edit.setMaximumWidth(260)
            edit.setMinimumWidth(0)
            edit.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)
            setattr(self, attr, edit)
            brw = self._action_btn("Browse")
            brw.setMaximumWidth(95)
            def _browse(checked=False, title=browse_title, filt=browse_filter, e=edit):
                # 'checked' absorbs the bool Qt's clicked signal passes to
                # slots — without it, that bool binds positionally to
                # 'title' instead, silently breaking the dialog call.
                #
                # DontUseNativeDialog (Linux only): native dialogs route
                # through xdg-desktop-portal, which is often missing or
                # misconfigured on minimal/fresh Linux installs (VMs
                # especially) and fails silently instead of showing an
                # error. On Windows the native dialog is what correctly
                # understands OneDrive's cloud-placeholder files — Qt's
                # own built-in dialog shows those folders as empty.
                opts = QFileDialog.Option.DontUseNativeDialog if sys.platform.startswith("linux") else QFileDialog.Option(0)
                path, _ = QFileDialog.getOpenFileName(
                    self, title, str(Path.home()), filt,
                    options=opts,
                )
                if path: e.setText(path)
            brw.clicked.connect(_browse)
            status_lbl = _ElidingLabel("")
            status_lbl.setStyleSheet(f"color: {p['fg_dim']}; font-size: 11px; background: transparent;")
            status_lbl.setMinimumWidth(0)
            status_lbl.setSizePolicy(QSizePolicy.Ignored, QSizePolicy.Fixed)
            setattr(self, attr.replace("_edit", "_status_lbl"), status_lbl)
            row.addWidget(lk); row.addWidget(edit)
            row.addWidget(brw); row.addWidget(status_lbl, stretch=1)
            pl.addLayout(row)

        hotkey_row = QHBoxLayout()
        hk_lbl = QLabel("Screenshot key:")
        hk_lbl.setStyleSheet(f"color: {p['fg_dim']}; font-size: 12px; background: transparent;")
        hk_lbl.setFixedWidth(120)
        self._hotkey_edit = QLineEdit()
        self._hotkey_edit.setPlaceholderText("F12")
        self._hotkey_edit.setMaximumWidth(80)
        hk_hint = QLabel("Change if F12 is already claimed by other software (Steam, GeForce Experience, Xbox Game Bar, VM guest tools, etc.)")
        hk_hint.setStyleSheet(f"color: {p['fg_dim']}; font-size: 11px; background: transparent;")
        hk_hint.setWordWrap(True)
        hotkey_row.addWidget(hk_lbl); hotkey_row.addWidget(self._hotkey_edit)
        hotkey_row.addWidget(hk_hint, stretch=1)
        pl.addLayout(hotkey_row)

        save_row = QHBoxLayout()
        save_btn = self._action_btn("Save Paths", "Save path overrides to config.json")
        save_btn.setMaximumWidth(110)
        save_btn.clicked.connect(self._save_paths)
        save_row.addStretch(); save_row.addWidget(save_btn); save_row.addStretch()
        pl.addLayout(save_row)
        self._status_cards.append([("paths", paths_frame, 900, 230)])
        self._refresh_path_display()

        # ── Theme picker card (always visible) ───────────────────────────
        from PySide6.QtWidgets import QTableWidget as _QTW, QTableWidgetItem as _QTWI
        from PySide6.QtCore import Qt as _Qt

        theme_frame, theme_body = self._card("🎨  UI THEME", p['gold'])
        tl = QVBoxLayout(theme_body)
        tl.setContentsMargins(12, 10, 12, 12)
        tl.setSpacing(8)

        # Combo + apply row
        theme_row = QHBoxLayout()
        theme_lbl = QLabel("Theme:")
        theme_lbl.setStyleSheet(f"color: {p['fg_dim']}; font-size: 12px; background: transparent;")
        theme_lbl.setFixedWidth(60)
        self._theme_combo = _ScrollLockCombo()
        self._theme_combo.setFocusPolicy(Qt.StrongFocus)
        self._theme_combo.setMinimumHeight(32)
        self._theme_combo.setStyleSheet(
            f"QComboBox {{ background-color: {p['bg_input']}; color: {p['fg']}; "
            f"border: 2px solid {p['accent_mid']}; border-radius: 5px; "
            f"padding: 5px 8px; padding-right: 26px; font-size: 13px; }}"
            f"QComboBox:hover {{ border: 2px solid {p['accent']}; }}"
            f"QComboBox:focus {{ border: 2px solid {p['accent']}; }}"
            f"QComboBox::drop-down {{ subcontrol-origin: padding; "
            f"subcontrol-position: top right; width: 26px; "
            f"border-left: 1px solid {p['accent_mid']}; "
            f"border-radius: 0 4px 4px 0; background-color: {p['bg_panel']}; }}"
            f"QComboBox QAbstractItemView {{ background-color: {p['bg_card']}; "
            f"color: {p['fg']}; selection-background-color: {p['accent_mid']}; "
            f"selection-color: #ffffff; border: 2px solid {p['accent_mid']}; "
            f"border-radius: 4px; outline: 0; padding: 2px; }}"
        )

        apply_btn = self._action_btn("Apply")
        apply_btn.setMaximumWidth(70)
        theme_row.addWidget(theme_lbl)
        theme_row.addWidget(self._theme_combo, stretch=1)
        theme_row.addWidget(apply_btn)
        tl.addLayout(theme_row)

        # Colorblind info label
        self._cb_info_lbl = QLabel("")
        self._cb_info_lbl.setStyleSheet(
            f"color: {p['fg']}; font-size: 11px; background: {p['bg_input']}; "
            f"border: 1px solid {p['border']}; border-radius: 4px; padding: 4px 8px;"
        )
        self._cb_info_lbl.setWordWrap(True)
        tl.addWidget(self._cb_info_lbl)

        # Colorblind reference chart
        chart_lbl = QLabel("Colorblindness Reference")
        chart_lbl.setStyleSheet(
            f"color: {p['fg_dim']}; font-size: 11px; font-weight: 600; background: transparent;"
        )
        tl.addWidget(chart_lbl)

        # Built from plain QLabel cells in a grid, not a QTableWidget -
        # QTableWidgetItem.setBackground()/setForeground() got silently
        # overridden by the table's own setStyleSheet() (a real Qt/QSS
        # quirk: once a style sheet touches an item view, it takes over
        # item painting and ignores the model's own per-item brushes), so
        # every row kept rendering in the currently-active theme's colors
        # instead of its own. Plain widgets with their own stylesheet have
        # no such conflict. Jacob 2026-07-24 ("why is the background still
        # fucking blue in the rows").
        chart = QWidget()
        chart_grid = QGridLayout(chart)
        chart_grid.setContentsMargins(0, 0, 0, 0)
        chart_grid.setSpacing(1)
        chart_grid.setColumnStretch(2, 1)

        for c, htext in enumerate(["Theme", "Warframe School", "Safe For"]):
            hlbl = QLabel(htext)
            hlbl.setStyleSheet(
                f"background: {p['bg_header']}; color: {p['gold']}; font-weight: 700; "
                f"border-bottom: 1px solid {p['accent_mid']}; padding: 3px 6px; font-size: 11px;"
            )
            chart_grid.addWidget(hlbl, 0, c)

        # Descriptions only - the actual preview color for each theme
        # comes from that theme's real palette (get_palette()['accent'])
        # below, not a separately hand-picked hex here. Several of these
        # had drifted from the theme's real colors (e.g. Naramon showed
        # #f0f0f0 while its real accent is #ffbe40) - this chart's whole
        # point is letting someone with a color vision deficiency see what
        # a theme actually looks like before picking it, so a swatch that
        # doesn't match the real theme wouldn't tell them anything true
        # about it. Jacob 2026-07-24.
        THEME_CB_INFO = {
            "Kieda's Default": ("Sapphire blue + metallic gold",
                                "Standard — no specific colorblind optimization"),
            "Madurai":         ("Deep crimson + fire orange",
                                "\u2705 Safe for Deuteranopia (red-green) \u2014 uses orange/amber, no green"),
            "Vazarin":         ("Deep navy + cyan/white",
                                "\u2705 Safe for Protanopia (red-blind) \u2014 blue/white spectrum only"),
            "Naramon":         ("Charcoal black + white/amber",
                                "\u2705 Safe for ALL colorblindness types \u2014 high contrast monochrome"),
            "Unairu":          ("Deep earth brown + desert amber",
                                "\u2705 Safe for Deuteranopia + Protanopia \u2014 warm amber/tan, no red/green"),
            "Zenurik":         ("Deep indigo + electric violet",
                                "\u2705 Safe for Tritanopia (blue-yellow) \u2014 purple base avoids blue-yellow confusion"),
            "Daylight":        ("Soft off-white + near-black text",
                                "High contrast light mode — easy on the eyes, not glaring white"),
            "Obsidian":        ("Polished black gemstone, cool blue-violet sheen",
                                "High contrast dark mode — distinct from Naramon's warm charcoal/gold"),
        }
        CHART_ROWS = [
            ("Kieda's Default", "—",        "Standard (no optimization)"),
            ("Madurai",         "Offense",  "Deuteranopia, Protanopia"),
            ("Vazarin",         "Defense",  "Protanopia"),
            ("Naramon",         "Precision","ALL types + low vision"),
            ("Unairu",          "Endurance","Deuteranopia, Protanopia"),
            ("Zenurik",         "Energy",   "Tritanopia"),
            ("Daylight",        "—",        "Light mode, high contrast"),
            ("Obsidian",        "—",        "Dark mode, high contrast"),
        ]
        # Each row is styled with THAT theme's own real background + text
        # color, not just one accent-colored word sitting on whichever
        # theme is currently active - the whole point of this chart is
        # showing what picking Vazarin/Naramon/etc. actually looks like,
        # so the row itself needs to look like that theme, not just hint
        # at its accent. Jacob 2026-07-24 ("the vazarin section should be
        # in its theme, the naramon row should be in its theme").
        for r, (theme_name, school, safe_for) in enumerate(CHART_ROWS, start=1):
            row_pal = get_palette(theme_name)
            row_style = (
                f"background: {row_pal['bg_panel']}; color: {row_pal['fg']}; "
                f"padding: 4px 8px; font-size: 11px;"
            )
            for c, text in enumerate([theme_name, school, safe_for]):
                lbl = QLabel(text)
                lbl.setStyleSheet(row_style)
                if c == 2:
                    lbl.setWordWrap(True)
                chart_grid.addWidget(lbl, r, c)
        tl.addWidget(chart)
        self._status_cards.append([("theme", theme_frame, 900, 430)])

        try:
            from theme import THEMES, save_theme, load_theme, get_theme
            for name in THEMES:
                self._theme_combo.addItem(name)
            current = load_theme()
            idx = list(THEMES.keys()).index(current) if current in THEMES else 0
            self._theme_combo.setCurrentIndex(idx)

            def _update_cb_info(name):
                info = THEME_CB_INFO.get(name)
                if info:
                    colors_str, cb_str = info
                    # Box itself now also uses the PREVIEWED theme's real
                    # colors, not whichever theme happens to be currently
                    # applied - it was only recoloring the bold heading
                    # text before, so e.g. Naramon's name showed in gold
                    # sitting on Madurai's actual brown box (whatever was
                    # applied at the time), making Naramon look brownish
                    # for a reason that had nothing to do with Naramon.
                    # Jacob 2026-07-24 ("this isnt just grey, its got
                    # brown tones - great for Naramon, not Obsidian").
                    preview_pal = get_palette(name)
                    self._cb_info_lbl.setStyleSheet(
                        f"color: {preview_pal['fg']}; font-size: 11px; "
                        f"background: {preview_pal['bg_panel']}; "
                        f"border: 1px solid {preview_pal['border']}; "
                        f"border-radius: 4px; padding: 4px 8px;"
                    )
                    self._cb_info_lbl.setText(
                        f"<b style='color:{preview_pal['accent']};'>{name}</b>  \u2014  {colors_str}<br>"
                        f"<span style='color:{preview_pal['fg']};'>{cb_str}</span>"
                    )
                    self._cb_info_lbl.setTextFormat(_Qt.RichText)

            def _apply_theme(name=None):
                name = name or self._theme_combo.currentText()
                save_theme(name)
                from PySide6.QtWidgets import QApplication
                QApplication.instance().setStyleSheet(get_theme(name))
                self._theme_combo.setCurrentText(name)
                _update_cb_info(name)
                # Refresh main window chrome (sidebar, title bar, nav)
                try:
                    from PySide6.QtWidgets import QApplication
                    for widget in QApplication.topLevelWidgets():
                        if hasattr(widget, '_apply_chrome_styles'):
                            widget._apply_chrome_styles()
                except Exception:
                    pass
                # Rebuild this tab and all loaded sibling pages
                self.refresh_styles()
                try:
                    # Walk up to find the QStackedWidget that holds all pages
                    stack = self.parent()
                    while stack and not hasattr(stack, 'count'):
                        stack = stack.parent()
                    if stack:
                        for i in range(stack.count()):
                            w = stack.widget(i)
                            if w is not self and hasattr(w, 'refresh_styles'):
                                w.refresh_styles()
                            elif w is not self and hasattr(w, '_apply_styles'):
                                w._apply_styles()
                except Exception:
                    pass

            # highlighted fires when the user mouses over a dropdown item —
            # safe for info preview, never triggers on scroll or programmatic changes.
            self._theme_combo.highlighted.connect(
                lambda idx: _update_cb_info(self._theme_combo.itemText(idx))
            )
            # Apply button is the ONLY way to actually save + apply the theme.
            apply_btn.clicked.connect(lambda: _apply_theme(self._theme_combo.currentText()))
            _update_cb_info(current)
        except Exception:
            pass

        # ── Update checker card ───────────────────────────────────────────
        import threading, urllib.request
        upd_frame, upd_body = self._card("⬆  UPDATES", p['green'])
        ul = QVBoxLayout(upd_body)
        ul.setContentsMargins(12, 10, 12, 12)
        ul.setSpacing(8)

        upd_status = QLabel("Click 'Check for Updates' to check.")
        upd_status.setWordWrap(True)
        upd_status.setStyleSheet(f"color: {p['fg']}; font-size: 12px; background: transparent;")
        ul.addWidget(upd_status)

        upd_btn = self._action_btn("Check for Updates",
            "Checks GitHub for a newer version of Kieda's Orbiter")
        ul.addWidget(upd_btn)

        def _do_check():
            upd_btn.setEnabled(False)
            upd_status.setText("Checking…")

            def _run():
                results = []
                # ── App version ──────────────────────────────────────────
                try:
                    version_file = Path(__file__).parent / "VERSION"
                    current = version_file.read_text().strip() if version_file.exists() else "unknown"
                    base_url = "https://github.com/GoblinOfChaos/Kiedas-Orbiter/releases"
                    latest = None

                    # Try releases API first
                    try:
                        req = urllib.request.Request(
                            "https://api.github.com/repos/GoblinOfChaos/Kiedas-Orbiter/releases/latest",
                            headers={"User-Agent": "kiedas-orbiter/1.0", "Accept": "application/vnd.github+json"}
                        )
                        with urllib.request.urlopen(req, timeout=8) as r:
                            data = json.loads(r.read())
                        latest = data.get("tag_name", "").lstrip("v")
                        base_url = data.get("html_url", base_url)
                    except Exception:
                        pass

                    # Fall back to tags API if no release exists yet
                    if not latest:
                        req2 = urllib.request.Request(
                            "https://api.github.com/repos/GoblinOfChaos/Kiedas-Orbiter/tags",
                            headers={"User-Agent": "kiedas-orbiter/1.0", "Accept": "application/vnd.github+json"}
                        )
                        with urllib.request.urlopen(req2, timeout=8) as r:
                            tags = json.loads(r.read())
                        if tags:
                            latest = tags[0]["name"].lstrip("v")

                    from update_check import _version_tuple
                    if not latest:
                        results.append("?  App:  could not determine latest version")
                    elif _version_tuple(latest) > _version_tuple(current):
                        results.append(f"⬆  App:  v{current}  →  v{latest} available!\n   {base_url}")
                    else:
                        # Covers both "exactly equal" and "current is ahead
                        # of the latest release" (e.g. a stale VERSION file
                        # left over from an abandoned version bump) - either
                        # way, there's nothing to update to.
                        results.append(f"✓  App:  v{current}  (up to date)")
                except Exception as e:
                    results.append(f"?  App:  could not check ({e})")

                # ── PySide6 ──────────────────────────────────────────────
                try:
                    import PySide6
                    installed = PySide6.__version__
                    req2 = urllib.request.Request(
                        "https://pypi.org/pypi/PySide6/json",
                        headers={"User-Agent": "kiedas-orbiter/1.0"}
                    )
                    with urllib.request.urlopen(req2, timeout=8) as r:
                        pdata = json.loads(r.read())
                    pypi_latest = pdata["info"]["version"]
                    if installed == pypi_latest:
                        results.append(f"✓  PySide6:  {installed}  (up to date)")
                    else:
                        results.append(f"⬆  PySide6:  {installed}  →  {pypi_latest} available\n   Run: .venv/bin/pip install --upgrade PySide6")
                except Exception as e:
                    results.append(f"?  PySide6:  could not check ({e})")

                # ── Post back to UI thread ────────────────────────────────
                # This runs after a network round-trip (up to ~16s), so the
                # tab may have been rebuilt (e.g. theme change calls
                # refresh_styles(), which deletes and recreates every
                # widget) by the time we get here — guard against updating
                # already-deleted widgets.
                import shiboken6
                from PySide6.QtCore import QMetaObject, Qt as _Qt2, Q_ARG
                text = "\n".join(results)
                if shiboken6.isValid(upd_status):
                    QMetaObject.invokeMethod(
                        upd_status, "setText",
                        _Qt2.ConnectionType.QueuedConnection,
                        Q_ARG(str, text)
                    )
                if shiboken6.isValid(upd_btn):
                    QMetaObject.invokeMethod(
                        upd_btn, "setEnabled",
                        _Qt2.ConnectionType.QueuedConnection,
                        Q_ARG(bool, True)
                    )

            threading.Thread(target=_run, daemon=True).start()

        upd_btn.clicked.connect(_do_check)
        self._status_cards.append([("updates", upd_frame, 900, 130)])

        # ── Place the collected cards on the editable canvas (created
        # earlier, alongside the static toolbar bar) ───────────────────────
        scroll.setWidget(self._canvas)

        # Fixed (x, y, width, height) defaults - Jacob's actual tuned
        # arrangement (Live Status is left-aligned only; Refresh Data's
        # right edge lines up with Actions'/every other card's right
        # edge), not flow-computed. Reset Layout must reproduce exactly
        # this, so it's hardcoded per-card instead of derived from
        # row-group/flow math that doesn't know about the alignment -
        # same fix, and same reason, as Dashboard's DEFAULTS dict in
        # DASHBOARD_TAB.py. Jacob 2026-07-24 ("this is twice now you
        # didn't [bake it into the code default]").
        STATUS_DEFAULTS = {
            "status":    (0, 0, 620, 190),
            "refresh":   (629, 0, 271, 190),
            "actions":   (0, 200, 900, 260),
            "overlay":   (0, 470, 900, 176),
            "autostart": (0, 653, 900, 290),
            "onclose":   (0, 950, 900, 118),
            "paths":     (0, 1074, 900, 258),
            "theme":     (0, 1338, 900, 371),
            "updates":   (0, 1719, 900, 130),
        }
        saved = self._canvas.load_layout()
        for group in self._status_cards:
            for key, widget, default_w, default_h in group:
                dx, dy, dw, dh = STATUS_DEFAULTS.get(key, (0, 0, default_w, default_h))
                pos = saved.get(key)
                kx = pos["x"] if pos else dx
                ky = pos["y"] if pos else dy
                kw = pos["width"] if pos else dw
                kh = pos.get("height", dh) if pos else dh
                self._canvas.add_card(key, widget, kx, ky, kw, kh)
                self._canvas.remember_default(key, dx, dy, dw, dh)

        # ── Advanced Settings (collapsible) ───────────────────────────────
        # Advanced Settings opens in its own dialog instead of expanding
        # inline. As an inline collapsible section at the bottom of a long
        # scrollable page, opening it changed the page's total height out
        # from under you (had to scroll down to see what you'd just
        # opened) and caused layout thrashing. A dialog sidesteps all of
        # that. Jacob 2026-07-23.
        # Advanced Settings is now a regular card on the editable canvas
        # like everything else - a plain button has none of the
        # dynamic-height problems that made the old collapsible version
        # undraggable. Jacob 2026-07-23 (wanted it movable/resizable too).
        adv_frame, adv_body = self._card("\u2699  ADVANCED SETTINGS", p['accent_mid'])
        adv_body_layout = QVBoxLayout(adv_body)
        adv_body_layout.setContentsMargins(12, 10, 12, 12)

        adv_open_btn = self._action_btn(
            "\u2699  Advanced Settings (OCR / Detector config)\u2026",
            "Opens OCR/detector configuration in its own window."
        )
        adv_body_layout.addWidget(adv_open_btn)

        def _open_adv_dialog():
            from PySide6.QtWidgets import QDialog
            dialog = QDialog(self)
            dialog.setWindowTitle("Advanced Settings")
            dialog.resize(720, 640)
            dl = QVBoxLayout(dialog)

            warn = QLabel("\u26a0  These settings affect the OCR detector. Only change if you know what you're doing.")
            warn.setStyleSheet(f"color: {p['gold_bright']}; font-size: 11px; background: transparent;")
            warn.setWordWrap(True)
            dl.addWidget(warn)

            settings_scroll = QScrollArea()
            settings_scroll.setWidgetResizable(True)
            try:
                from SETTINGS_TAB import SettingsTab
                self._settings_widget = SettingsTab()
                settings_scroll.setWidget(self._settings_widget)
            except Exception:
                settings_scroll.setWidget(QLabel("Settings failed to load."))
            dl.addWidget(settings_scroll)

            dialog.exec()

        adv_open_btn.clicked.connect(_open_adv_dialog)

        # ── Logs card ─────────────────────────────────────────────────────
        logs_frame, logs_body = self._card("\u25a0  OUTPUT LOG", "#2e6db4")
        ll = QVBoxLayout(logs_body)
        ll.setContentsMargins(12, 10, 12, 12)
        ll.setSpacing(6)

        log_tabs_row = QHBoxLayout()
        self._log_tab_overlay = self._action_btn("Overlay Log", "Show the live overlay log")
        self._log_tab_cmd = self._action_btn("Command Output", "Show command output from maintenance actions")
        self._log_tab_overlay.setCheckable(True); self._log_tab_overlay.setChecked(True)
        self._log_tab_cmd.setCheckable(True)
        log_tabs_row.addWidget(self._log_tab_overlay)
        log_tabs_row.addWidget(self._log_tab_cmd)
        log_tabs_row.addStretch()
        ll.addLayout(log_tabs_row)

        from PySide6.QtWidgets import QStackedWidget
        self._log_stack = QStackedWidget()

        self.log_text = QTextEdit()
        self.log_text.setReadOnly(True)
        self.log_text.setFont(QFont("monospace", 9))
        self.log_text.setStyleSheet(
            f"background: {p['bg']}; color: {p['fg']}; border: 1px solid {p['border']}; "
            f"border-radius: 4px; selection-background-color: {p['bg_input']};"
        )
        self.log_text.setMinimumHeight(140)
        self._log_stack.addWidget(self.log_text)

        self.cmd_text = QTextEdit()
        self.cmd_text.setReadOnly(True)
        self.cmd_text.setFont(QFont("monospace", 9))
        self.cmd_text.setStyleSheet(
            f"background: {p['bg']}; color: {p['fg']}; border: 1px solid {p['border']}; "
            f"border-radius: 4px; selection-background-color: {p['bg_input']};"
        )
        self.cmd_text.setMinimumHeight(140)
        self._log_stack.addWidget(self.cmd_text)

        def _show_log(idx, btn_on, btn_off):
            self._log_stack.setCurrentIndex(idx)
            btn_on.setChecked(True); btn_off.setChecked(False)
        self._log_tab_overlay.clicked.connect(lambda: _show_log(0, self._log_tab_overlay, self._log_tab_cmd))
        self._log_tab_cmd.clicked.connect(lambda: _show_log(1, self._log_tab_cmd, self._log_tab_overlay))

        ll.addWidget(self._log_stack)

        # Advanced Settings and Output Log are both placed on the same
        # editable canvas, using the same fixed-default approach as above.
        STATUS_DEFAULTS["advanced"] = (0, 1862, 900, 102)
        STATUS_DEFAULTS["logs"] = (0, 1975, 900, 320)
        for key, widget in [("advanced", adv_frame), ("logs", logs_frame)]:
            dx, dy, dw, dh = STATUS_DEFAULTS[key]
            pos = saved.get(key)
            kx = pos["x"] if pos else dx
            ky = pos["y"] if pos else dy
            kw = pos["width"] if pos else dw
            kh = pos.get("height", dh) if pos else dh
            self._canvas.add_card(key, widget, kx, ky, kw, kh)
            self._canvas.remember_default(key, dx, dy, dw, dh)

        # ── Status bar - shows progress/result of whatever Action button
        # you last clicked (Refresh Data, Rebuild API Helper, etc.).
        # Jacob 2026-07-23 (bare "Idle" didn't explain what it was for).
        self.lbl_status = QLabel("Action status will appear here")
        self.lbl_status.setStyleSheet(
            f"padding: 5px 10px; background: {p['bg']}; color: {p['fg_dim']}; "
            f"border-top: 1px solid {p['border']}; font-size: 11px;"
        )
        outer.addWidget(self.lbl_status)

    # ── Path helpers ──────────────────────────────────────────────────────

    def _refresh_path_display(self):
        if describe_paths is None:
            return
        try:
            info = describe_paths()
            ee = info["ee_log"]
            inv = info["inventory"]

            self._ee_path_edit.setText("" if not ee["is_override"] else ee["path"])
            if ee["exists"]:
                self._ee_path_status_lbl.setText(f"✓  Found: {ee['path']}")
                self._ee_path_status_lbl.setStyleSheet(f"font-size: 11px; color: {COLOR_GREAT};")
            else:
                self._ee_path_status_lbl.setText(f"✗  Not found: {ee['path']}")
                self._ee_path_status_lbl.setStyleSheet(f"font-size: 11px; color: {COLOR_BAD};")

            self._inv_path_edit.setText("" if not inv["is_override"] else inv["path"])
            if inv["exists"]:
                self._inv_path_status_lbl.setText(f"✓  Found: {inv['path']}")
                self._inv_path_status_lbl.setStyleSheet(f"font-size: 11px; color: {COLOR_GREAT};")
            else:
                self._inv_path_status_lbl.setText(f"✗  Not found: {inv['path']}")
                self._inv_path_status_lbl.setStyleSheet(f"font-size: 11px; color: {COLOR_BAD};")

            if get_screenshot_hotkey is not None:
                current_hotkey = get_screenshot_hotkey()
                self._hotkey_edit.setText("" if current_hotkey == "F12" else current_hotkey)
        except Exception:
            pass

    def _save_paths(self):
        if set_ee_log_path is None:
            return
        set_ee_log_path(self._ee_path_edit.text())
        set_inventory_path(self._inv_path_edit.text())
        if set_screenshot_hotkey is not None:
            set_screenshot_hotkey(self._hotkey_edit.text())
        self._refresh_path_display()
        self.lbl_status.setText("Paths saved to config.json")

    # ── Status updates ────────────────────────────────────────────────────

    def _update_status(self):
        self.lbl_warframe.setText(_status_html(_pgrep("Warframe.x64.exe")))
        # Also matches the flat "./orbiter" fallback binary path
        # download_helper.py writes for a fresh install (see
        # autostart_manager.py's _PROCESS_PATTERNS comment) - this status
        # check was never updated for it, so a downloaded detector always
        # showed as not running even while it was.
        self.lbl_wfinfo.setText(
            _status_html(_pgrep("target/release/orbiter") or _pgrep("./orbiter"))
        )
        self.lbl_overlay.setText(_status_html(_pgrep("overlay.py")))

        if OWNED_FILE.exists():
            self.lbl_refresh.setText(_humanize_age(OWNED_FILE.stat().st_mtime))
            try:
                owned = json.loads(OWNED_FILE.read_text())
                total = len(owned)
                need = sum(1 for v in owned.values()
                           if (isinstance(v, int) and v == 0)
                           or (isinstance(v, dict) and v.get("status") == "NEED"))
                self.lbl_count.setText(f"{total} total  ({need} NEED · {total-need} owned)")
            except Exception:
                self.lbl_count.setText("(parse error)")
        else:
            self.lbl_refresh.setText("never")
            self.lbl_count.setText("(no file)")

        if STATE_FILE.exists():
            try:
                state = json.loads(STATE_FILE.read_text())
                rewards = state.get("rewards", [])
                names = [r.get("name", "?") for r in rewards[:4]]
                age = _humanize_age(STATE_FILE.stat().st_mtime)
                short = " / ".join(n[:22] for n in names)
                self.lbl_detection.setText(f"{age}: {short}")
            except Exception:
                self.lbl_detection.setText(_humanize_age(STATE_FILE.stat().st_mtime))
        else:
            self.lbl_detection.setText("(none yet)")

        # Tail the overlay log
        running = self.process is not None and self.process.state() != QProcess.NotRunning
        if not running and LOG_FILE.exists():
            try:
                with open(LOG_FILE, "rb") as f:
                    f.seek(0, os.SEEK_END)
                    sz = f.tell()
                    f.seek(max(0, sz - 4000))
                    tail = f.read().decode("utf-8", errors="replace")
                lines = tail.splitlines()[-25:]
                new_text = "\n".join(lines)
                if new_text != self.log_text.toPlainText():
                    self.log_text.setPlainText(new_text)
                    self.log_text.verticalScrollBar().setValue(
                        self.log_text.verticalScrollBar().maximum()
                    )
            except OSError:
                pass

        self._refresh_autostart_toggles()

    # ── Command runner ────────────────────────────────────────────────────

    def _all_buttons(self):
        return [self.btn_refresh, self.btn_update, self.btn_reset_cache,
                self.btn_rebuild, self.btn_overlay, self.btn_test,
                self.btn_reload_cfg, self.btn_refresh_wfcd, self.btn_real_prices]

    def _set_buttons_enabled(self, enabled):
        for b in self._all_buttons():
            b.setEnabled(enabled)

    def _run_command(self, steps, cwd, description, reload_tabs=False, timeout_ms=60_000):
        """Run a sequence of commands, each an argv list (e.g. [py, 'script.py',
        'arg']) — no shell involved, so this works identically on Linux and
        Windows. Stops the sequence on the first non-zero exit, mirroring
        what bash '&&' chaining did in the old single-string version.

        timeout_ms is a per-step force-kill timeout (see _check_step_timeout)
        - defaults to 60s for typically-fast steps, but pass a longer value
        for anything genuinely slow (e.g. warframe.market price fetching,
        which legitimately takes ~5 minutes) so it isn't mistaken for the
        same kind of hang and killed early."""
        if self.process and self.process.state() != QProcess.NotRunning:
            QMessageBox.warning(self, "Busy", "Another command is already running.")
            return
        self._pending_reload_tabs = reload_tabs
        self._pending_steps = [list(s) for s in steps]
        self._pending_cwd = cwd
        self._pending_timeout_ms = timeout_ms
        self._set_buttons_enabled(False)
        self.lbl_status.setText(f"Running: {description}")
        self.cmd_text.clear()
        self.cmd_text.append(f"=== {description} ===\n")
        self._run_next_step()

    def _run_next_step(self):
        if not self._pending_steps:
            self._process_finished(0, None)
            return
        argv = self._pending_steps.pop(0)
        self.cmd_text.append(f"$ {' '.join(str(a) for a in argv)}")

        self.process = QProcess(self)
        self.process.setProcessChannelMode(QProcess.MergedChannels)
        self.process.readyReadStandardOutput.connect(self._process_output)
        self.process.finished.connect(self._step_finished)
        self.process.errorOccurred.connect(self._process_error)
        self.process.setWorkingDirectory(str(self._pending_cwd))
        # Python defaults to block-buffering stdout when it isn't a real
        # terminal (exactly the case here - QProcess captures it via a
        # pipe), so print() output can sit unflushed for the entire run
        # and only appear all at once right as the process exits. Seen
        # live: "Fetch Live Prices" (a ~5 minute step with progress lines)
        # showing zero output the whole time, looking exactly like a hang
        # even though it was working the whole time. PYTHONUNBUFFERED
        # forces every Python subprocess run through here to flush
        # immediately instead.
        proc_env = QProcessEnvironment.systemEnvironment()
        proc_env.insert("PYTHONUNBUFFERED", "1")
        self.process.setProcessEnvironment(proc_env)
        self.process.start(str(argv[0]), [str(a) for a in argv[1:]])

        # Some external tools (warframe-api-helper.exe in particular, seen
        # live on Windows) print their result but don't actually exit the
        # process afterward, which without this left the whole window stuck
        # on "Running:..." with every button disabled forever - QProcess
        # never emits 'finished' for a process that's still alive. Force-
        # kill anything that's still running after a generous timeout so a
        # single misbehaving step can't hang the app. Timeout is per-command
        # (see _run_command) so a legitimately slow step doesn't get killed
        # for taking as long as it's supposed to.
        self._step_timeout_process = self.process
        timeout_ms = getattr(self, "_pending_timeout_ms", 60_000)
        self._step_timeout_seconds = timeout_ms // 1000
        QTimer.singleShot(timeout_ms, self._check_step_timeout)

    def _check_step_timeout(self):
        proc = self._step_timeout_process
        if proc is None or proc is not self.process:
            return  # already finished/replaced - nothing to do
        if proc.state() != QProcess.NotRunning:
            self.cmd_text.append(
                f"\n=== Step timed out after {self._step_timeout_seconds}s, killing it and moving on ==="
            )
            proc.kill()

    def _step_finished(self, code, status):
        if code != 0:
            self._process_finished(code, status)
            return
        self._run_next_step()

    def _process_error(self, error):
        # Fires when a step's program fails to even start (bad path, not
        # executable, etc). Without this, QProcess never emits 'finished'
        # in that case and the UI hangs forever on "Running:..." with
        # every button disabled, since only 'finished' was handled before.
        if error == QProcess.FailedToStart:
            argv = self.process.program() if self.process else "?"
            self.cmd_text.append(f"\n=== Failed to start: {argv} ===")
            self.lbl_status.setText("Failed to start")
            self._set_buttons_enabled(True)
            self.process = None
            self._pending_steps = []

    def _process_output(self):
        if self.process:
            data = bytes(self.process.readAllStandardOutput()).decode("utf-8", errors="replace")
            self.cmd_text.append(data.rstrip())
            self.cmd_text.verticalScrollBar().setValue(
                self.cmd_text.verticalScrollBar().maximum()
            )

    def _process_finished(self, code, _status):
        self.cmd_text.append(f"\n=== Finished (exit code {code}) ===")
        self.lbl_status.setText(f"Done (exit {code})")
        self._set_buttons_enabled(True)
        self.process = None
        self._update_status()
        if getattr(self, '_pending_reload_tabs', False) and code == 0:
            self._reload_all_tabs()
            self._pending_reload_tabs = False

    def _reload_all_tabs(self):
        """Walk the QStackedWidget and call _load_data() or _load() on every
        already-built tab so inventory changes appear without restarting."""
        reloaded = []
        failed = []
        try:
            stack = self.parent()
            while stack and not hasattr(stack, 'count'):
                stack = stack.parent()
            if not stack:
                return
            for i in range(stack.count()):
                w = stack.widget(i)
                # Skip placeholders (lazy-unbuilt pages have _factory attr)
                if hasattr(w, '_factory'):
                    continue
                for method in ('_load_data', '_load', 'reload'):
                    if hasattr(w, method) and callable(getattr(w, method)):
                        try:
                            getattr(w, method)()
                            reloaded.append(type(w).__name__)
                        except Exception as e:
                            failed.append(type(w).__name__)
                            print(f"[STATUS_TAB] {type(w).__name__}.{method}() failed: {e}",
                                  file=sys.stderr)
                        break
        except Exception:
            pass
        if reloaded:
            self.cmd_text.append(
                f"\n✓ Reloaded tabs: {', '.join(reloaded)}"
            )
        if failed:
            self.cmd_text.append(
                f"\n✗ Failed to reload: {', '.join(failed)}"
            )

    # ── Button handlers ───────────────────────────────────────────────────

    def reload_config(self):
        if self.process and self.process.state() != QProcess.NotRunning:
            QMessageBox.warning(self, "Busy", "Another command is already running.")
            return
        self._set_buttons_enabled(False)
        self.lbl_status.setText("Running: Reload orbiter config")
        self.cmd_text.clear()
        self.cmd_text.append("=== Reload orbiter config ===\n")
        try:
            self.cmd_text.append("Current config:\n" + CONFIG_FILE.read_text())
        except OSError as e:
            self.cmd_text.append(f"(could not read config.json: {e})")
        self.cmd_text.append("\nRestarting orbiter...")

        # Bare "orbiter" as the match pattern is dangerously generic -
        # would match ANY process with "orbiter" anywhere in an argument
        # (a file path, an unrelated tool's arg, even this app's own repo
        # path). Killing by the two actual specific binary patterns
        # instead, matching autostart_manager.py's own canonical list.
        # Jacob 2026-07-24 ("overbroad process kill... can kill unrelated
        # processes"). Also matches the flat "./orbiter" fallback path a
        # downloaded (not cargo-built) detector actually runs as - this
        # list was never updated for it, so "Restart Detector" silently
        # failed to stop a downloaded detector before launching a new one.
        killed = (
            kill_processes("target/release/orbiter")
            + kill_processes("orbiter.exe")
            + kill_processes("./orbiter")
        )
        # Live bug found 2026-08-04: this launch path never told the
        # service registry (added the same day) about the process it
        # kills/starts. Real symptom: clicking this button genuinely
        # restarted a working orbiter, but the Status display kept
        # reporting "detector: offline" forever afterward - the registry
        # still held the old, now-dead PID with no way to learn a new one
        # replaced it outside autostart_manager's own launch functions.
        # Clearing it here (rather than leaving a stale entry) means
        # is_feature_running() correctly falls back to the substring scan
        # for the moment right after this kill, until _reload_config_launch
        # records the new PID below.
        service_registry.clear_registration("detector")
        self.cmd_text.append(f"Stopped {killed} running orbiter process(es).")
        # QTimer instead of time.sleep — this runs on the GUI thread, and a
        # real sleep() here would freeze the whole window for a few seconds.
        # 2s (not 1s) gives Windows more headroom to fully release the killed
        # process's global hotkey registration before the new one tries to
        # claim it - seen live: relaunching too soon after a kill can still
        # hit AlreadyRegistered even though the old process is already gone.
        QTimer.singleShot(2000, self._reload_config_launch)

    def _reload_config_launch(self):
        from platform_utils import launch_detached, clean_env_for_launch, IS_LINUX
        log_file = DATA_DIR / "orbiter.log"
        # Extra args (EE.log override, --hotkey, --pre-capture-sleep-ms)
        # come from one shared builder now (paths.build_detector_args())
        # instead of being rebuilt here - this used to be one of three
        # independent copies of the same logic, and warframe-watcher.py's
        # own copy had drifted to have none of it at all. Jacob 2026-07-24
        # ("Unify detector launch/restart construction").
        args = build_detector_args() if build_detector_args is not None else []
        try:
            if IS_LINUX:
                # launch-orbiter.sh handles Bazzite/gamescope-specific setup
                # (DISPLAY detection, host libs, portal bus) that Windows
                # simply doesn't need — there we can launch the exe directly.
                proc = launch_detached(["./launch-orbiter.sh"] + args, cwd=WFINFO_DIR,
                                        env=clean_env_for_launch(), log_file=log_file)
            else:
                proc = launch_detached([str(WFINFO_DIR / "orbiter.exe")] + args, cwd=WFINFO_DIR,
                                        log_file=log_file)
        except OSError as e:
            self.cmd_text.append(f"ERROR: failed to launch orbiter: {e}")
            self.lbl_status.setText("Failed")
            self._set_buttons_enabled(True)
            return
        # See the note on the kill step above - without this, the Status
        # display never learns about the process this button just started.
        service_registry.record_launch("detector", proc.pid)
        QTimer.singleShot(2000, self._reload_config_report)

    def _reload_config_report(self):
        log_file = DATA_DIR / "orbiter.log"
        try:
            log_tail = log_file.read_text().splitlines()[-15:]
        except OSError:
            log_tail = ["(no log yet)"]
        self.cmd_text.append("orbiter restarted:\n" + "\n".join(log_tail))
        self.lbl_status.setText("Done")
        self._set_buttons_enabled(True)
        self._update_status()

    def refresh_inventory(self):
        # warframe-api-helper reads inventory directly from Warframe's own
        # memory/API. It tries a cached auth token first and only needs
        # Warframe actually running if that token no longer works, so we
        # don't gate the button on Warframe being detected — that would
        # block the legitimate cached-token path. The helper prints its
        # own clear message ("Process not found.") in the command output
        # if a live scan turns out to be necessary and Warframe isn't open.
        from download_helper import API_HELPER_OUTPUT_PATH
        helper = API_HELPER_OUTPUT_PATH.get(sys.platform, WFINFO_DIR / "warframe-api-helper")
        if not helper.exists():
            QMessageBox.warning(
                self, "Helper not installed",
                "warframe-api-helper wasn't found. Run install.py again, or "
                "python download_helper.py, to fetch it."
            )
            return

        py = str(VENV_PYTHON)
        # populate_owned.py takes a literal path argument - it has no idea
        # about config.json's inventory_path override on its own, so this
        # has to resolve it explicitly. Without this, "Save Paths" appeared
        # to silently do nothing for inventory.json, because the saved
        # override genuinely was being written to config.json correctly,
        # it just wasn't being read by anything in this pipeline - the
        # literal string "inventory.json" (relative to WFINFO_DIR) was
        # used instead, every time, regardless of what was configured.
        inv_path = str(get_inventory_path()) if get_inventory_path is not None else "inventory.json"
        self._run_command(
            [
                # Best-effort: if the helper fails (no Warframe running, no
                # valid cached token - common on a machine where inventory.json
                # was just copied over from elsewhere rather than fetched
                # live), the existing inventory.json is still perfectly good
                # for the rest of this chain, so don't abort the whole
                # pipeline over it. Wrapped to always exit 0 regardless of
                # the helper's own result.
                [py, "-c", f"import subprocess; subprocess.run([{str(helper)!r}])"],
                [py, "populate_owned.py", inv_path, "owned_items.json"],
                [py, "populate_crafted.py"],
                [py, "populate_relics.py"],
                [py, "populate_equipment.py"],
                [py, "record_stats_snapshot.py"],
            ],
            cwd=WFINFO_DIR, description="Refresh data from inventory",
            reload_tabs=True,
        )

    def refresh_wfcd_cache(self):
        self._run_command(
            [[str(VENV_PYTHON), "refresh_wfcd_cache.py", "--force"]],
            cwd=WFINFO_DIR, description="Refresh WFCD cache from GitHub",
        )

    def fetch_real_prices(self):
        self._run_command(
            [[str(VENV_PYTHON), "enrich_prices_from_market.py"]],
            cwd=WFINFO_DIR, description="Fetch real prices from warframe.market",
            timeout_ms=600_000,  # this one legitimately takes ~5 minutes
        )

    def update_data(self):
        self._run_command(
            [[str(VENV_PYTHON), "update_data.py"]],
            cwd=WFINFO_DIR, description="Update Warframe data",
        )

    def reset_wfcd_cache(self):
        try:
            if WFCD_CACHE.exists():
                WFCD_CACHE.unlink()
                QMessageBox.information(self, "Done",
                    "WFCD cache deleted. It will re-download on the next refresh.")
            else:
                QMessageBox.information(self, "Already gone",
                    "WFCD cache file doesn't exist; nothing to delete.")
        except OSError as e:
            QMessageBox.critical(self, "Failed", f"Could not delete cache: {e}")

    def rebuild_helper(self):
        if not HELPER_SRC.exists():
            QMessageBox.information(
                self, "Not needed for normal use",
                "This rebuilds warframe-api-helper from source — only useful "
                "if you're developing it yourself.\n\n"
                f"It expects a separate git clone at {HELPER_SRC}, which "
                "isn't part of the normal install (install.py downloads a "
                "pre-built binary instead, which is all you need).\n\n"
                "If you do want to build from source, clone "
                "https://github.com/glowseeker/warframe-api-helper there first."
            )
            return
        # Source-build tooling — genuinely Linux/bash-only (git, a Rust
        # toolchain, build.sh), unlike the rest of _run_command's steps.
        self._run_command(
            [["/bin/bash", "-c", f"git pull && ./build.sh && cp warframe-api-helper {WFINFO_DIR}/"]],
            cwd=HELPER_SRC, description="Rebuild helper",
        )

    def _on_close_behavior_toggled(self, checked):
        if set_close_behavior is not None:
            set_close_behavior("tray" if checked else "exit")

    def _on_autostart_toggled(self, feature, checked):
        autostart_manager.set_autostart(feature, checked)

    def _on_enabled_toggled(self, feature, checked):
        if checked:
            autostart_manager.start_feature(feature, reason="manual Off→On toggle click")
        else:
            autostart_manager.stop_feature(feature, reason="manual Off→On toggle click")

    def _refresh_autostart_toggles(self):
        """Keep the 'On now' toggles honest if a process dies/gets started
        outside this UI (crash, killed elsewhere, etc.) - block signals
        while setting so this doesn't itself trigger _on_enabled_toggled
        and start/stop things every 2s."""
        if not hasattr(self, "_enabled_toggles"):
            return
        for feature, toggle in self._enabled_toggles.items():
            running = autostart_manager.is_feature_running(feature)
            if toggle.isChecked() != running:
                toggle.blockSignals(True)
                toggle.setChecked(running)
                toggle.blockSignals(False)

    def restart_overlay(self):
        kill_processes("overlay.py")
        time.sleep(0.5)
        from platform_utils import launch_detached, clean_env_for_launch
        launch_detached(
            [str(VENV_PYTHON), str(WFINFO_DIR / "launcher.py"), "overlay"],
            cwd=WFINFO_DIR,
            env=clean_env_for_launch(),
            log_file=DATA_DIR / "overlay.log",
        )
        self.lbl_status.setText("Overlay restarted.")
        self._update_status()

    def test_overlay(self):
        STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        warframe = {"x": 1920, "y": 0, "width": 2560, "height": 1440}
        if STATE_FILE.exists():
            try:
                old = json.loads(STATE_FILE.read_text())
                if old.get("warframe"):
                    warframe = old["warframe"]
            except Exception:
                pass
        state = {
            "timestamp": int(time.time()),
            "warframe": warframe,
            "rewards": [
                {"name": "Octavia Prime Systems Blueprint", "status": "OWNED", "count": 1},
                {"name": "Tenora Prime Blueprint",          "status": "OWNED", "count": 3},
                {"name": "Harrow Prime Systems Blueprint",  "status": "NEED",  "count": 0},
                {"name": "Forma Blueprint",                 "status": "OWNED", "count": 12},
            ],
        }
        STATE_FILE.write_text(json.dumps(state))
        self.lbl_status.setText("Wrote fake detection state. Overlay should pop up.")
