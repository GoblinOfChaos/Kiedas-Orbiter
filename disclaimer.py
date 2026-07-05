#!/usr/bin/env python3
"""
disclaimer.py — First-run disclaimer dialog for Kieda's Orbiter.

Shows once. Acceptance is recorded in " + str(DATA_DIR) + "/accepted_disclaimer.json.
"""

import json
import time
from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtGui import QFont
from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QScrollArea, QWidget, QApplication,
)
from paths import DATA_DIR

ACCEPTED_FILE = DATA_DIR / "accepted_disclaimer.json"


def has_accepted() -> bool:
    try:
        d = json.loads(ACCEPTED_FILE.read_text())
        return bool(d.get("accepted"))
    except Exception:
        return False


def mark_accepted():
    ACCEPTED_FILE.parent.mkdir(parents=True, exist_ok=True)
    ACCEPTED_FILE.write_text(json.dumps({
        "accepted": True,
        "timestamp": int(time.time()),
        "version": 1,
    }, indent=2))


DISCLAIMER_TEXT = """<html><body style="color:#d8eaf8; font-size:13px; line-height:1.6;">

<p style="color:#e8c96a; font-size:16px; font-weight:700; margin-bottom:12px;">
Welcome to Kieda's Orbiter
</p>

<p>Before continuing, please read and acknowledge the following:</p>

<p style="color:#4a90d9; font-weight:700; margin-top:14px;">Not affiliated with Digital Extremes</p>
<p>Kieda's Orbiter is an independent, community-made companion tool. It is not
created, endorsed, or supported by Digital Extremes Ltd., the makers of Warframe.</p>

<p style="color:#4a90d9; font-weight:700; margin-top:14px;">Use at your own risk</p>
<p>This app reads game memory to retrieve your inventory data. Digital Extremes has
historically tolerated read-only companion apps like this one, but their Terms of
Service may change at any time. <b>Your account is solely your responsibility.</b>
The developer of this app accepts no liability for any account action taken by
Digital Extremes.</p>

<p style="color:#4a90d9; font-weight:700; margin-top:14px;">Your data stays on your computer</p>
<p>No personal data is collected or transmitted about you. Network requests are made
only to public community APIs — warframestat.us, warframe.market, WFCD on GitHub,
and Calamity Inc. on GitHub — to retrieve game data. <b>Never your personal
information.</b></p>

<p style="color:#4a90d9; font-weight:700; margin-top:14px;">Prices are community estimates</p>
<p>Platinum prices shown are sourced from warframe.market community listings. They are
not guaranteed to be accurate or current. Never make trading decisions based solely
on this app.</p>

<p style="color:#4a90d9; font-weight:700; margin-top:14px;">Open source, no warranty</p>
<p>This software is provided as-is with no warranty of any kind. The developer is not
liable for any damages, data loss, or account actions resulting from its use.</p>

</body></html>"""


class DisclaimerDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.accepted_disclaimer = False
        self.setWindowTitle("Kieda's Orbiter — Before You Continue")
        self.setMinimumSize(600, 520)
        self.setMaximumWidth(700)
        self.setModal(True)
        self.setStyleSheet("""
            QDialog { background-color: #0b1628; }
            QScrollArea { border: 1px solid #1e3a62; border-radius: 6px; background: #122040; }
            QPushButton {
                border-radius: 5px; padding: 10px 24px;
                font-size: 13px; font-weight: 700;
            }
        """)
        self._setup_ui()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(12)

        # Logo / title area
        title_lbl = QLabel("⬡  Kieda's Orbiter")
        title_lbl.setStyleSheet(
            "color: #c9a84c; font-size: 20px; font-weight: 700; "
            "letter-spacing: 2px; background: transparent;"
        )
        title_lbl.setAlignment(Qt.AlignCenter)
        layout.addWidget(title_lbl)

        sub_lbl = QLabel("Warframe Companion — Third-Party Tool")
        sub_lbl.setStyleSheet("color: #7a9bbf; font-size: 11px; background: transparent;")
        sub_lbl.setAlignment(Qt.AlignCenter)
        layout.addWidget(sub_lbl)

        # Scrollable disclaimer text
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        content = QLabel(DISCLAIMER_TEXT)
        content.setWordWrap(True)
        content.setTextFormat(Qt.RichText)
        content.setContentsMargins(14, 14, 14, 14)
        content.setStyleSheet("background: transparent;")
        scroll.setWidget(content)
        scroll.setMinimumHeight(300)
        layout.addWidget(scroll, stretch=1)

        # Divider
        divider = QWidget()
        divider.setFixedHeight(1)
        divider.setStyleSheet("background: #1e3a62;")
        layout.addWidget(divider)

        # Button row
        btn_row = QHBoxLayout()
        btn_row.setSpacing(12)

        exit_btn = QPushButton("Exit")
        exit_btn.setStyleSheet(
            "QPushButton { background: #0e1a35; color: #7a9bbf; "
            "border: 1px solid #1e3a62; }"
            "QPushButton:hover { color: #d8eaf8; border-color: #2e5a8e; }"
        )
        exit_btn.setMinimumWidth(100)
        exit_btn.clicked.connect(self._on_exit)

        accept_btn = QPushButton("✓  I understand — Launch Kieda's Orbiter")
        accept_btn.setStyleSheet(
            "QPushButton { background: #1a2e55; color: #c9a84c; "
            "border: 1px solid #2e6db4; }"
            "QPushButton:hover { background: #122040; color: #e8c96a; "
            "border-color: #4a90d9; }"
            "QPushButton:pressed { background: #0e1a35; }"
        )
        accept_btn.setDefault(True)
        accept_btn.clicked.connect(self._on_accept)

        btn_row.addWidget(exit_btn)
        btn_row.addStretch()
        btn_row.addWidget(accept_btn)
        layout.addLayout(btn_row)

    def _on_accept(self):
        mark_accepted()
        self.accepted_disclaimer = True
        self.accept()

    def _on_exit(self):
        self.accepted_disclaimer = False
        self.reject()


def check_and_show_disclaimer(parent=None) -> bool:
    """Show disclaimer if not yet accepted. Returns True if OK to proceed."""
    if has_accepted():
        return True
    dlg = DisclaimerDialog(parent)
    result = dlg.exec()
    return dlg.accepted_disclaimer