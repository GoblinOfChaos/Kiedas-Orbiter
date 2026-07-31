#!/usr/bin/env python3
"""Editable card canvas — shared "Edit Layout" system for Dashboard and
Status_Tools.

Cards are placed at absolute (x, y, width, height) positions inside a
plain QWidget canvas instead of a Qt layout manager. In edit mode, each
card gets a drag handle (its own body) and resize grips on all four
edges.

Height is NOT auto-measured from content. Three different techniques for
"ask Qt how tall this content would be at width W" (heightForWidth(),
adjustSize()+sizeHint(), and a forced-resize-then-measure trick) each
gave inconsistent or actively wrong answers on this codebase's mix of
custom FlowLayout/nested layouts/word-wrapped rich text - overlap, giant
cards, and degenerate zero-size cards all came from trusting one of
those. Jacob 2026-07-24: "what's a better way to do all this".

Instead: each card has a starting default height (same idea as default
width), the title bar stays pinned at a fixed height, and everything
else lives inside an internal QScrollArea. Narrowing a card still wraps
its text (existing wordWrap+stretch fixes), but if the wrapped content
is taller than the card's current height, it scrolls internally instead
of requiring the card to grow to an exactly-measured height. Height only
changes when you explicitly drag the top/bottom edge, or via each card's
own default. Positions/widths/heights are saved to a JSON file per page
and reloaded on next launch; first run (no file yet) falls back to the
caller's defaults.
"""

import json

from PySide6.QtCore import Qt, QPoint, QRect, Signal
from PySide6.QtGui import QCursor
from PySide6.QtWidgets import (
    QWidget, QPushButton, QHBoxLayout, QVBoxLayout, QSizePolicy,
    QApplication, QScrollArea, QFrame,
)


GRIP_WIDTH = 10
# Was 180 - way narrower than most cards' actual button/label text needs,
# so a card could be dragged down to a width where its content simply
# clipped instead of the resize stopping. Raised the floor instead of
# solving every individual card's content width. Jacob 2026-07-24 ("all
# of these cut off text when sizing down").
MIN_CARD_WIDTH = 260



class _EdgeGrip(QWidget):
    """A thin drag strip along one edge of a card. 'right'/'left' resize
    width (dragging left also shifts x so the opposite edge stays put);
    'top'/'bottom' resize height directly (manual override — once you've
    set a height this way it's kept as-is; width-driven auto-height
    recompute only raises it if wrapped text would otherwise be clipped).
    Jacob 2026-07-23 (wanted all sides/corners, not just the right edge)."""

    dragged = Signal(int, int)  # delta x, delta y

    def __init__(self, edge: str, parent=None):
        super().__init__(parent)
        self.edge = edge
        horizontal = edge in ("left", "right")
        if horizontal:
            self.setFixedWidth(GRIP_WIDTH)
            self.setCursor(QCursor(Qt.SizeHorCursor))
        else:
            self.setFixedHeight(GRIP_WIDTH)
            self.setCursor(QCursor(Qt.SizeVerCursor))
        self.setStyleSheet("background: #4a90d9; border-radius: 3px;")
        self._drag_start = None

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self._drag_start = event.globalPosition().toPoint()
            # Body-drag already raises the card on press (EditableCard.
            # mousePressEvent) but a resize starts here on the grip
            # instead, which never reached that code - so widening a card
            # via its edge toward a neighbor left it stuck behind that
            # neighbor. Jacob 2026-07-24 ("card disappearing behind
            # others when dragged toward the right/edge").
            self.parent().raise_()

    def mouseMoveEvent(self, event):
        if self._drag_start is not None:
            pos = event.globalPosition().toPoint()
            dx = pos.x() - self._drag_start.x()
            dy = pos.y() - self._drag_start.y()
            self._drag_start = pos
            self.dragged.emit(dx, dy)

    def mouseReleaseEvent(self, event):
        self._drag_start = None


class EditableCard(QWidget):
    """Wraps a single card widget so it can be dragged (anywhere on its
    body) and resized (a thin strip on each of the four edges). Edit-mode
    chrome (grips, hover cursor) is hidden until the canvas turns edit
    mode on."""

    moved = Signal()
    resized = Signal()

    def __init__(self, key: str, inner: QWidget, parent=None, default_height: int = 250):
        super().__init__(parent)
        self.key = key
        self._default_height = default_height
        self._scroll = None
        self.inner = None
        self._install_inner(inner)

        self._manual_height = None  # set once the bottom/top grip is used

        self._grips = {}
        for edge in ("right", "left", "top", "bottom"):
            grip = _EdgeGrip(edge, self)
            grip.hide()
            grip.dragged.connect(lambda dx, dy, e=edge: self._on_edge_drag(e, dx, dy))
            self._grips[edge] = grip

        self._edit_mode = False
        self._drag_start = None

        self._wrapper.move(0, 0)
        self._reflow()

    def _install_inner(self, content: QWidget):
        """Wires up a content widget as this card's content - shared by
        __init__ and replace_inner(). Pulls the header/title bar (every
        card builder's first child) out and pins it at a fixed height
        above an internal scroll area holding everything else, instead of
        trying to measure the whole thing's height for a given width
        (three separate techniques for that all gave wrong answers on
        this codebase's widget mix). If content is taller than the
        card's current height, it scrolls - the card no longer needs to
        exactly match its content's height. Jacob 2026-07-24."""
        content.setParent(self)
        content_layout = content.layout()
        header_widget = None
        if content_layout is not None and content_layout.count() >= 1:
            header_item = content_layout.itemAt(0)
            header_widget = header_item.widget() if header_item else None
            if header_widget is not None:
                content_layout.removeWidget(header_widget)
                header_widget.setFixedHeight(header_widget.sizeHint().height())

        wrapper = QWidget(self)
        wrapper.setStyleSheet("background: transparent;")
        wrapper_layout = QVBoxLayout(wrapper)
        wrapper_layout.setContentsMargins(0, 0, 0, 0)
        wrapper_layout.setSpacing(0)
        if header_widget is not None:
            header_widget.setParent(wrapper)
            wrapper_layout.addWidget(header_widget)

        scroll = QScrollArea(wrapper)
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.NoFrame)
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        scroll.setStyleSheet("background: transparent; border: none;")
        scroll.setWidget(content)
        wrapper_layout.addWidget(scroll, stretch=1)

        # Carry forward a nested-canvas marker (e.g. individually-movable
        # Cycles pills) if the content widget has one, so set_edit_mode()/
        # save/reset can still find it via self.inner.
        wrapper._nested_canvases = getattr(content, "_nested_canvases", [])

        self.inner = wrapper
        self._content = content
        self._scroll = scroll
        self._wrapper = wrapper

    def replace_inner(self, new_inner: QWidget):
        """Swaps in fresh content (e.g. updated live data) without
        touching this card's position, width, manual height, or edit
        state - unlike destroying and re-adding the whole card, which
        was causing a visible "pop in" flash on every data refresh.
        Jacob 2026-07-23."""
        old_wrapper = self.inner
        self._install_inner(new_inner)
        old_wrapper.setParent(None)
        old_wrapper.deleteLater()
        self._wrapper.move(0, 0)
        self._wrapper.show()
        self._reflow()

    def _reflow(self):
        w = self.width()
        # A manually-set height (bottom/top grip) sticks exactly; if
        # nothing's been manually set yet, the card starts at its default
        # height and stays there - it does NOT try to grow/shrink to
        # exactly fit content (that measurement proved unreliable).
        # Content that doesn't fit the current height simply scrolls.
        h = self._manual_height if self._manual_height is not None else self._default_height
        self._wrapper.setFixedWidth(w)
        self._wrapper.setFixedHeight(h)
        self.setFixedHeight(h)

        for edge, grip in self._grips.items():
            if edge in ("left", "right"):
                grip.setFixedHeight(h)
                grip.move(w - GRIP_WIDTH if edge == "right" else 0, 0)
            else:
                grip.setFixedWidth(w)
                grip.move(0, h - GRIP_WIDTH if edge == "bottom" else 0)
            grip.raise_()

    def set_edit_mode(self, on: bool):
        self._edit_mode = on
        for grip in self._grips.values():
            grip.setVisible(on)
        self.setCursor(QCursor(Qt.SizeAllCursor) if on else QCursor(Qt.ArrowCursor))
        # If this card's own content is itself an EditableCanvas of
        # smaller "bubbles" (e.g. the individual Cycles pills), toggle
        # edit mode on that nested canvas too. Jacob 2026-07-23.
        for nested in getattr(self.inner, "_nested_canvases", []):
            nested.set_edit_mode(on)

    def set_width(self, w: int):
        w = max(MIN_CARD_WIDTH, w)
        self.setFixedWidth(w)
        self._reflow()

    def _overlaps_any(self, rect: QRect) -> bool:
        """Would this rect (a proposed new position/size for this card)
        overlap any other card on the canvas? Used to reject moves/resizes
        outright instead of letting one card land on top of another and
        just fixing z-order after the fact. Jacob 2026-07-24 ("the layout
        needs to reject a move if they overlap")."""
        canvas = self.parent()
        if not isinstance(canvas, EditableCanvas):
            return False
        for other in canvas._cards.values():
            if other is self:
                continue
            other_rect = QRect(other.x(), other.y(), other.width(), other.height())
            if rect.intersects(other_rect):
                return True
        return False

    def _on_edge_drag(self, edge: str, dx: int, dy: int):
        if edge == "right":
            new_w = max(MIN_CARD_WIDTH, self.width() + dx)
            if not self._overlaps_any(QRect(self.x(), self.y(), new_w, self.height())):
                self.set_width(new_w)
        elif edge == "left":
            new_w = max(MIN_CARD_WIDTH, self.width() - dx)
            actual_dx = self.width() - new_w
            candidate = QRect(self.x() + actual_dx, self.y(), new_w, self.height())
            if not self._overlaps_any(candidate):
                self.move(self.x() + actual_dx, self.y())
                self.set_width(new_w)
        elif edge == "bottom":
            new_h = max(60, self.height() + dy)
            if not self._overlaps_any(QRect(self.x(), self.y(), self.width(), new_h)):
                self._manual_height = new_h
                self._reflow()
        elif edge == "top":
            new_h = max(60, self.height() - dy)
            actual_dy = self.height() - new_h
            candidate = QRect(self.x(), self.y() + actual_dy, self.width(), new_h)
            if not self._overlaps_any(candidate):
                self.move(self.x(), self.y() + actual_dy)
                self._manual_height = new_h
                self._reflow()
        self.resized.emit()

    # Drag-to-move: press anywhere on the card (outside the grip) while
    # in edit mode, drag to reposition within the canvas.
    def mousePressEvent(self, event):
        if self._edit_mode and event.button() == Qt.LeftButton:
            self._drag_start = event.globalPosition().toPoint() - self.pos()
            # Whatever you're about to drag comes to the front, so even if
            # you drop it on top of something else it's never the one
            # that's hidden. Jacob 2026-07-24.
            self.raise_()

    def mouseMoveEvent(self, event):
        if self._edit_mode and self._drag_start is not None:
            new_pos = event.globalPosition().toPoint() - self._drag_start
            new_pos.setX(max(0, new_pos.x()))
            new_pos.setY(max(0, new_pos.y()))
            # Testing the full (x, y) move as one unit meant that while
            # touching a neighbor, ANY diagonal drift got rejected outright
            # - even the axis that wasn't actually the problem - which felt
            # like the drag had completely frozen until you released and
            # started over. Try x and y independently so sliding along a
            # touching edge still works; only both-blocked actually stays
            # put. Jacob 2026-07-24 ("can no longer move the card at all").
            moved = False
            full = QRect(new_pos.x(), new_pos.y(), self.width(), self.height())
            if not self._overlaps_any(full):
                self.move(new_pos)
                moved = True
            else:
                x_only = QRect(new_pos.x(), self.y(), self.width(), self.height())
                y_only = QRect(self.x(), new_pos.y(), self.width(), self.height())
                if not self._overlaps_any(x_only):
                    self.move(new_pos.x(), self.y())
                    moved = True
                elif not self._overlaps_any(y_only):
                    self.move(self.x(), new_pos.y())
                    moved = True
            if moved:
                # moved only used to fire once on release, so the canvas
                # (and the scrollbar it feeds) didn't grow until you let
                # go - dragging a card out past the canvas's current size
                # clipped it for the whole drag, only fixing itself on
                # release. Emit every move too so it tracks live. Jacob
                # 2026-07-24.
                self.moved.emit()

    def mouseReleaseEvent(self, event):
        if self._drag_start is not None:
            self._drag_start = None
            self._nudge_if_mostly_hidden()
            self.moved.emit()

    def _nudge_if_mostly_hidden(self):
        """Prevents actually losing a card behind another - if it landed
        (almost) fully overlapping a sibling, shift it by one small fixed
        step so an edge of both stays visible/grabbable. Deliberately NOT
        the old approach (push fully clear, repeat until no overlap
        anywhere) - that could cascade a card down past everything below
        it with no way to drag it back. This is a single bounded nudge,
        not a chain reaction. Jacob 2026-07-24 ("can lose a card behind
        another")."""
        canvas = self.parent()
        if not isinstance(canvas, EditableCanvas):
            return
        my_rect = QRect(self.x(), self.y(), self.width(), self.height())
        my_area = max(1, self.width() * self.height())
        for other in canvas._cards.values():
            if other is self:
                continue
            other_rect = QRect(other.x(), other.y(), other.width(), other.height())
            overlap = my_rect.intersected(other_rect)
            if overlap.isEmpty():
                continue
            overlap_area = overlap.width() * overlap.height()
            other_area = max(1, other.width() * other.height())
            if overlap_area / my_area > 0.85 or overlap_area / other_area > 0.85:
                self.move(self.x() + 30, self.y() + 30)
                return


class EditableCanvas(QWidget):
    """Absolute-position container for a page's cards. Call add_card()
    for each card with a default (x, y, width); call load_layout() to
    apply any previously-saved geometry over those defaults."""

    def __init__(self, layout_file, parent=None):
        super().__init__(parent)
        self._layout_file = layout_file
        self._cards: dict[str, EditableCard] = {}
        self._defaults: dict[str, dict] = {}
        self._edit_mode = False

    def remember_default(self, key: str, x: int, y: int, width: int, height: int = 250):
        """Records the "factory" position/width/height for a card, used
        by reset_layout() to restore it later regardless of what's been
        dragged/resized since. Call once per card right after add_card()."""
        self._defaults[key] = {"x": x, "y": y, "width": width, "height": height}

    def sizeHint(self):
        # Lets this canvas be nested as a card's own content (e.g. Cycles'
        # individually-movable pills) - a plain QWidget with no QLayout
        # otherwise reports an invalid sizeHint, so the outer card
        # wrapper can't size itself around it. Jacob 2026-07-23.
        return self.minimumSize()

    def add_card(self, key: str, inner: QWidget, x: int, y: int, width: int, height: int = 250):
        card = EditableCard(key, inner, parent=self, default_height=height)
        card.move(x, y)
        card.set_width(width)
        card.set_edit_mode(self._edit_mode)
        # Auto-pushing a card clear of overlaps right when you drop it
        # sounded good but broke worse: dropping near another card could
        # cascade it down past everything below, off past the bottom of
        # the visible page, with no way to drag it back (scrolling to
        # reach it breaks the drag math anyway). A second automatic pass
        # after Reset Layout also mis-fired and shoved Cycles to the
        # bottom on a second reset mid-session. Removed both - cards now
        # have a fixed default height (content scrolls if it doesn't fit)
        # instead of an auto-measured one, which is what actually
        # prevents overlap now. Live dragging stays free-form. Jacob
        # 2026-07-24.
        card.moved.connect(self._update_canvas_size)
        card.resized.connect(self._update_canvas_size)
        self._cards[key] = card
        card.show()
        if key in ("paths", "onclose"):
            from PySide6.QtCore import QTimer as _DbgTimer
            def _dbg_report(k=key, c=card):
                import sys as _dbgsys
                inner_w = c._content.width() if c._content is not None else None
                inner_hint = c._content.sizeHint().width() if c._content is not None else None
                print(f"[DEBUG geometry] key={k} card.width()={c.width()} "
                      f"wrapper.width()={c._wrapper.width()} "
                      f"content.width()={inner_w} content.sizeHint().width()={inner_hint}",
                      file=_dbgsys.stderr)
            _DbgTimer.singleShot(0, _dbg_report)
        self._update_canvas_size()
        return card

    def upsert_card(self, key: str, inner: QWidget, x: int, y: int, width: int, height: int = 250):
        """Like add_card, but if a card with this key already exists, its
        content is swapped in place (position/width/drag-state
        untouched) instead of destroying and recreating the whole card -
        avoids the visible "pop in" flash every time data refreshes.
        x/y/width are only used for a genuinely new card. Jacob
        2026-07-23."""
        existing = self._cards.get(key)
        if existing is not None:
            existing.replace_inner(inner)
            return existing
        return self.add_card(key, inner, x, y, width, height)

    def _update_canvas_size(self):
        max_x = 0
        max_y = 0
        for card in self._cards.values():
            max_x = max(max_x, card.x() + card.width())
            max_y = max(max_y, card.y() + card.height())
        new_w, new_h = max_x + 20, max_y + 20
        # This canvas has no QLayout of its own (cards are placed via
        # move()), so setMinimumSize() alone is just a constraint - nothing
        # ever resizes the widget's actual size to match it. The outer
        # QScrollArea uses setWidgetResizable(False), so it scrolls based
        # on this widget's real size, not its size hint - dragging a card
        # out past the canvas's last real size clipped it at the canvas's
        # edge instead of the scroll area growing to include it. Jacob
        # 2026-07-24 (cards clipped off after moving them right).
        #
        # This now runs on every mouseMoveEvent during a drag (not just
        # once on release) so the clipping above doesn't happen mid-drag
        # either - but that made every pixel of every drag call resize()
        # on the whole canvas, causing visible stutter. Skip the actual
        # resize when the target size hasn't changed - most drag frames
        # don't move the overall bounding box at all. Jacob 2026-07-24.
        if (new_w, new_h) == (self.width(), self.height()):
            return
        self.setMinimumSize(new_w, new_h)
        self.resize(new_w, new_h)

    def set_edit_mode(self, on: bool):
        self._edit_mode = on
        for card in self._cards.values():
            card.set_edit_mode(on)

    def save_layout(self):
        data = {
            key: {"x": card.x(), "y": card.y(), "width": card.width(), "height": card.height()}
            for key, card in self._cards.items()
        }
        self._layout_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self._layout_file, "w") as f:
            json.dump(data, f, indent=2)
        # A card's own content can itself be an EditableCanvas of smaller
        # "bubbles" (e.g. individual Cycles pills) - save those too so
        # the Save Layout button covers the whole page in one click.
        for card in self._cards.values():
            for nested in getattr(card.inner, "_nested_canvases", []):
                nested.save_layout()

    def reset_layout(self):
        """Restores every card to its recorded factory position/width
        and deletes the saved file - no rebuild needed, just moves the
        already-built cards back. Jacob 2026-07-23."""
        if self._layout_file.exists():
            self._layout_file.unlink()
        for key, card in self._cards.items():
            d = self._defaults.get(key)
            if d is None:
                continue
            card._manual_height = None
            card._default_height = d.get("height", 250)
            card.move(d["x"], d["y"])
            card.set_width(d["width"])
            for nested in getattr(card.inner, "_nested_canvases", []):
                nested.reset_layout()
        self._update_canvas_size()

    def load_layout(self):
        """Returns the saved {key: {x, y, width}} dict, or {} if no
        saved layout exists yet (caller keeps its own defaults)."""
        if not self._layout_file.exists():
            return {}
        try:
            with open(self._layout_file) as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {}


def edit_mode_toolbar(canvas: EditableCanvas, label_prefix: str = "") -> QWidget:
    """A small bar with an Edit Layout toggle and a Save Layout button,
    wired directly to the given canvas. Add this above the canvas in
    the page's own layout."""
    bar = QWidget()
    bar.setStyleSheet("background: transparent;")
    row = QHBoxLayout(bar)
    row.setContentsMargins(0, 0, 0, 8)
    row.setSpacing(8)

    edit_btn = QPushButton(f"{label_prefix}Edit Layout")
    edit_btn.setCheckable(True)
    save_btn = QPushButton("Save Layout")
    save_btn.setEnabled(False)
    reset_btn = QPushButton("Reset Layout")
    reset_btn.setEnabled(False)

    def _toggle(checked):
        canvas.set_edit_mode(checked)
        save_btn.setEnabled(checked)
        reset_btn.setEnabled(checked)
        edit_btn.setText(f"{label_prefix}Done Editing" if checked else f"{label_prefix}Edit Layout")

    def _save():
        canvas.save_layout()
        save_btn.setText("Saved ✓")
        from PySide6.QtCore import QTimer
        QTimer.singleShot(1200, lambda: save_btn.setText("Save Layout"))

    def _reset():
        canvas.reset_layout()
        reset_btn.setText("Reset ✓")
        from PySide6.QtCore import QTimer
        QTimer.singleShot(1200, lambda: reset_btn.setText("Reset Layout"))

    edit_btn.toggled.connect(_toggle)
    save_btn.clicked.connect(_save)
    reset_btn.clicked.connect(_reset)

    row.addWidget(edit_btn)
    row.addWidget(save_btn)
    row.addWidget(reset_btn)
    row.addStretch()
    return bar
