#!/usr/bin/env python3
"""ToggleSwitch — a custom-painted, animated sliding toggle switch.

Plain QCheckBox can be styled via QSS but can't convincingly draw a knob
that slides between two positions - that needs an actual paintEvent. Used
by the Auto-Start settings panel (Status tab) for its two-toggle-per-feature
layout (auto-start on launch / on-off right now).
"""

from PySide6.QtCore import Qt, QPropertyAnimation, QEasingCurve, Property, QRectF, Signal
from PySide6.QtGui import QPainter, QColor
from PySide6.QtWidgets import QAbstractButton, QSizePolicy


class ToggleSwitch(QAbstractButton):
    toggledOn = Signal(bool)

    def __init__(self, parent=None, on_color="#e8c96a", off_color="#3a4a63",
                 knob_color="#f5f5f5", track_border="#2e3f57"):
        super().__init__(parent)
        self.setCheckable(True)
        self.setCursor(Qt.PointingHandCursor)
        self.setSizePolicy(QSizePolicy.Fixed, QSizePolicy.Fixed)
        self._on_color = QColor(on_color)
        self._off_color = QColor(off_color)
        self._knob_color = QColor(knob_color)
        self._track_border = QColor(track_border)
        self._knob_pos = 0.0  # 0.0 = off (left), 1.0 = on (right)

        self._anim = QPropertyAnimation(self, b"knob_pos", self)
        self._anim.setDuration(150)
        self._anim.setEasingCurve(QEasingCurve.InOutQuad)

        self.toggled.connect(self._animate_to_state)

    def sizeHint(self):
        return self._size()

    def _size(self):
        from PySide6.QtCore import QSize
        return QSize(40, 22)

    def _animate_to_state(self, checked):
        self._anim.stop()
        self._anim.setStartValue(self._knob_pos)
        self._anim.setEndValue(1.0 if checked else 0.0)
        self._anim.start()
        self.toggledOn.emit(checked)

    def setChecked(self, checked):
        """Override so programmatic state changes (e.g. loading saved
        config) also animate, matching user clicks, and so callers don't
        need to know about the animation machinery at all."""
        was_checked = self.isChecked()
        super().setChecked(checked)
        if checked != was_checked:
            self._animate_to_state(checked)
        else:
            self._knob_pos = 1.0 if checked else 0.0
            self.update()

    def get_knob_pos(self):
        return self._knob_pos

    def set_knob_pos(self, value):
        self._knob_pos = value
        self.update()

    knob_pos = Property(float, get_knob_pos, set_knob_pos)

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)

        rect = self.rect()
        track_rect = QRectF(1, 1, rect.width() - 2, rect.height() - 2)
        radius = track_rect.height() / 2

        # Interpolate track color between off/on as the knob slides, not a
        # hard cut at 50% - reads as a smoother, more polished animation.
        r = self._off_color.red() + (self._on_color.red() - self._off_color.red()) * self._knob_pos
        g = self._off_color.green() + (self._on_color.green() - self._off_color.green()) * self._knob_pos
        b = self._off_color.blue() + (self._on_color.blue() - self._off_color.blue()) * self._knob_pos
        track_color = QColor(int(r), int(g), int(b))

        painter.setPen(self._track_border)
        painter.setBrush(track_color)
        painter.drawRoundedRect(track_rect, radius, radius)

        knob_diameter = track_rect.height() - 4
        knob_travel = track_rect.width() - knob_diameter - 4
        knob_x = track_rect.left() + 2 + knob_travel * self._knob_pos
        knob_rect = QRectF(knob_x, track_rect.top() + 2, knob_diameter, knob_diameter)
        painter.setPen(Qt.NoPen)
        painter.setBrush(self._knob_color)
        painter.drawEllipse(knob_rect)

        painter.end()
