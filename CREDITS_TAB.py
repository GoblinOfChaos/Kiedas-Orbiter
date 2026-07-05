#!/usr/bin/env python3
"""Credits tab — thank you to every project and person that made Kieda's Orbiter possible."""

from PySide6.QtCore import Qt, QUrl
from PySide6.QtGui import QDesktopServices
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QScrollArea,
    QFrame, QPushButton,
)
from theme import BG, BG_CARD, BG_HDR, GOLD, GOLD_BRIGHT as GOLD_B, SAP_MID as SAP, FG, DIM, GREEN

CREDITS = [
    {
        "section": "Core Data Sources",
        "color": "#4a90d9",
        "entries": [
            {
                "name": "WFCD / Warframe Community Developers",
                "url": "https://github.com/WFCD",
                "role": "warframe-items — the definitive Warframe item database used for all item, drop, and component data. Also warframe-drop-data for mod drop locations.",
                "contact": "devs@warframestat.us | discord.gg/jGZxH9f",
            },
            {
                "name": "warframestat.us API",
                "url": "https://api.warframestat.us",
                "role": "Live world state data (fissures, sorties, arbitration, Baro, cycles, nightwave). Hosted by Tobiah (patreon.com/cephalongenesis).",
                "contact": "discord.gg/jGZxH9f",
            },
            {
                "name": "Calamity Inc. / Sainan",
                "url": "https://github.com/calamity-inc",
                "role": "warframe-public-export-plus — the most complete cleaned DE Public Export data, including ExportUpgrades.json and ExportModSet.json. Also browse.wf (RivenParser for perfectness calculation).",
                "contact": "github.com/calamity-inc",
            },
            {
                "name": "warframe.market",
                "url": "https://warframe.market",
                "role": "Live platinum price data for prime parts used in the Market tab and price enrichment.",
                "contact": "warframe.market",
            },
            {
                "name": "WFCD / warframe-drop-data",
                "url": "https://github.com/WFCD/warframe-drop-data",
                "role": "Official DE drop table data in machine-readable format. Updated automatically from DE's public drop data site.",
                "contact": "drops.warframestat.us",
            },
        ],
    },
    {
        "section": "Riven Grading",
        "color": "#e8a020",
        "entries": [
            {
                "name": "44bananas & Xennethkeisere",
                "url": "https://docs.google.com/spreadsheets/d/1zbaeJBuBn44cbVKzJins_E3hTDpnmvOk8heYN-G8yy8",
                "role": "Community riven good-rolls spreadsheet — the definitive guide to which stat combinations are worth keeping for each weapon. The foundation of the Riven Grader.",
                "contact": "Discord: 44bananas#9024, Xennethkeisere#0717",
            },
            {
                "name": "AlecaFrame — alecamar",
                "url": "https://alecaframe.com",
                "role": "Reference implementation for riven grading, Stat Perfectness, and riven reroll overlay design. AlecaFrame's approach and feature set inspired much of the overlay system.",
                "contact": "alecamar#2084 | contact@alecaframe.com",
            },
        ],
    },
    {
        "section": "Inventory & Memory Reading",
        "color": "#ff8c3a",
        "entries": [
            {
                "name": "WFInfo (original) — WFCD",
                "url": "https://github.com/WFCD/WFinfo",
                "role": "The original WFInfo C# companion app for Windows. The Rust OCR detector in this project is a Linux reimplementation of WFInfo's relic reward detection approach.",
                "contact": "github.com/WFCD/WFinfo",
            },
            {
                "name": "warframe-api-helper",
                "url": "https://github.com/glowseeker/warframe-api-helper",
                "role": "C++ helper binary that reads Warframe's game memory to extract inventory data without modifying game files.",
                "contact": "github.com/glowseeker",
            },
        ],
    },
    {
        "section": "Frameworks & Libraries",
        "color": "#38b6e8",
        "entries": [
            {
                "name": "PySide6 / Qt",
                "url": "https://doc.qt.io/qtforpython-6/",
                "role": "The entire UI framework. PySide6 is the official Python binding for Qt6.",
                "contact": "qt.io",
            },
            {
                "name": "Rust + Cargo",
                "url": "https://www.rust-lang.org",
                "role": "The OCR detector binary is written in Rust for performance and safety.",
                "contact": "rust-lang.org",
            },
            {
                "name": "Tesseract OCR",
                "url": "https://github.com/tesseract-ocr/tesseract",
                "role": "Open-source OCR engine used to read relic reward text from screen captures.",
                "contact": "github.com/tesseract-ocr",
            },
            {
                "name": "xcap",
                "url": "https://github.com/nashaofu/xcap",
                "role": "Cross-platform screen capture library used by the OCR detector to capture the Warframe window.",
                "contact": "github.com/nashaofu/xcap",
            },
        ],
    },
    {
        "section": "Special Thanks",
        "color": "#3eff3e",
        "entries": [
            {
                "name": "Digital Extremes",
                "url": "https://www.warframe.com",
                "role": "For creating Warframe and making the Public Export data available to the community. Kieda's Orbiter is not affiliated with or endorsed by Digital Extremes.",
                "contact": "warframe.com",
            },
            {
                "name": "The Warframe Community",
                "url": "https://www.reddit.com/r/Warframe/",
                "role": "For 10+ years of data, guides, spreadsheets, and tools that make projects like this possible.",
                "contact": "reddit.com/r/Warframe",
            },
            {
                "name": "GitHub Copilot",
                "url": "https://github.com/features/copilot",
                "role": "AI pair programmer that helped build this entire application in a single extended session.",
                "contact": "github.com/features/copilot",
            },
        ],
    },
]


def _link_btn(text, url):
    btn = QPushButton(text)
    btn.setStyleSheet(
        f"QPushButton {{ color: {SAP}; background: transparent; border: none; "
        f"font-size: 11px; text-decoration: underline; padding: 0; text-align: left; }}"
        f"QPushButton:hover {{ color: {GOLD_B}; }}"
    )
    btn.setCursor(Qt.PointingHandCursor)
    btn.clicked.connect(lambda: QDesktopServices.openUrl(QUrl(url)))
    return btn


class CreditsTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet(f"QScrollArea {{ border: none; background: {BG}; }}")
        content = QWidget()
        content.setStyleSheet(f"background: {BG};")
        scroll.setWidget(content)
        outer.addWidget(scroll)

        main = QVBoxLayout(content)
        main.setContentsMargins(16, 16, 16, 16)
        main.setSpacing(14)

        # Title
        title = QLabel("Credits & Acknowledgements")
        title.setStyleSheet(
            f"color: {GOLD}; font-size: 18px; font-weight: 700; "
            f"letter-spacing: 1px; background: transparent;"
        )
        main.addWidget(title)

        sub = QLabel(
            "Kieda's Orbiter was built on the shoulders of the Warframe community "
            "and open-source projects. Thank you to everyone listed below."
        )
        sub.setStyleSheet(f"color: {DIM}; font-size: 12px; background: transparent;")
        sub.setWordWrap(True)
        main.addWidget(sub)

        divider = QFrame()
        divider.setFrameShape(QFrame.HLine)
        divider.setStyleSheet(f"color: #1e3a62; background: #1e3a62;")
        divider.setFixedHeight(1)
        main.addWidget(divider)

        for section in CREDITS:
            sc = section["color"]

            # Section header
            sec_frame = QFrame()
            sec_frame.setStyleSheet(
                f"background: {BG_HDR}; border-left: 3px solid {sc}; "
                f"border-radius: 4px; padding: 2px 0;"
            )
            sec_layout = QHBoxLayout(sec_frame)
            sec_layout.setContentsMargins(12, 6, 12, 6)
            sec_lbl = QLabel(section["section"].upper())
            sec_lbl.setStyleSheet(
                f"color: {sc}; font-size: 11px; font-weight: 700; "
                f"letter-spacing: 1px; background: transparent;"
            )
            sec_layout.addWidget(sec_lbl)
            main.addWidget(sec_frame)

            for entry in section["entries"]:
                card = QFrame()
                card.setStyleSheet(
                    f"background: {BG_CARD}; border: 1px solid #1e3a62; "
                    f"border-radius: 6px;"
                )
                card_layout = QVBoxLayout(card)
                card_layout.setContentsMargins(14, 10, 14, 10)
                card_layout.setSpacing(4)

                # Name + link
                name_row = QHBoxLayout()
                name_lbl = QLabel(entry["name"])
                name_lbl.setStyleSheet(
                    f"color: {GOLD}; font-size: 13px; font-weight: 700; background: transparent;"
                )
                name_row.addWidget(name_lbl)
                name_row.addWidget(_link_btn(entry["url"], entry["url"]))
                name_row.addStretch()
                card_layout.addLayout(name_row)

                # Role description
                role = QLabel(entry["role"])
                role.setStyleSheet(f"color: {FG}; font-size: 12px; background: transparent;")
                role.setWordWrap(True)
                card_layout.addWidget(role)

                # Contact
                contact = QLabel(entry["contact"])
                contact.setStyleSheet(f"color: {DIM}; font-size: 11px; background: transparent;")
                card_layout.addWidget(contact)

                main.addWidget(card)

        main.addStretch()
