#!/usr/bin/env python3
"""gtk_overlay_drag.py — shared click-and-drag repositioning for the GTK
overlay windows.

2026-07-27: back to real absolute (x, y) window coordinates - these
windows are X11/XWayland override-redirect windows again (see
x11_overlay.py's module docstring for the full mechanism/history), not
gtk-layer-shell, so they have real (x, y) positions rather than
anchored-edge margins. Uses plain GDK window.move() for per-pixel drag
updates (fast, no need to re-run the full X11 hint/raise sequence on
every mouse-move event) - x11_overlay.show_at() with its heavier Xlib
dance is reserved for actual show/monitor-change transitions elsewhere.
Shared here rather than reimplemented per overlay (Overlay,
RelicRecommendOverlay, FissureOverlay, RivenGraderOverlay all need this
identically) so a fix in one place fixes all four.
"""

import json

from gi.repository import Gdk

_MIN_VISIBLE_PX = 48


def _bounded_position(x, y, monitor_x, monitor_y, monitor_width, monitor_height):
    """Keep at least part of the window on its monitor."""
    max_x = monitor_x + max(0, monitor_width - _MIN_VISIBLE_PX)
    max_y = monitor_y + max(0, monitor_height - _MIN_VISIBLE_PX)
    return (
        min(max(monitor_x - 10_000, int(x)), max_x),
        min(max(monitor_y - 10_000, int(y)), max_y),
    )


def enable_drag(window, _anchor_edges_unused, position_file, default_position):
    """Make `window` draggable with the left mouse button, persisting its
    position to `position_file` on release and restoring it (if present)
    right now, before the caller's first show().

    _anchor_edges_unused: kept for call-site compatibility across the
        gtk-layer-shell/plain-X11 history in this project; positioning is
        absolute (x, y) now, so anchor edges are meaningless here.
    default_position: {"top": int, "left": int} starting position, treated
        as literal (x, y) offsets relative to the window's target monitor.
    """
    window.add_events(
        Gdk.EventMask.BUTTON_PRESS_MASK
        | Gdk.EventMask.BUTTON_RELEASE_MASK
        | Gdk.EventMask.POINTER_MOTION_MASK
    )

    def _load_saved():
        try:
            return json.loads(position_file.read_text())
        except Exception:
            return None

    def _save(pos):
        try:
            position_file.parent.mkdir(parents=True, exist_ok=True)
            position_file.write_text(json.dumps(pos))
        except OSError:
            pass

    def _monitor_geometry():
        try:
            display = Gdk.Display.get_default()
            monitor = display.get_monitor_at_window(window.get_window())
            if monitor is None:
                monitor = display.get_primary_monitor() or display.get_monitor(0)
            geo = monitor.get_geometry()
            return geo.x, geo.y, geo.width, geo.height
        except Exception:
            return 0, 0, 7680, 4320  # generous fallback ceiling, not a real display

    def _apply(pos):
        mx, my, mw, mh = _monitor_geometry()
        x, y = _bounded_position(
            mx + pos.get("left", 0), my + pos.get("top", 0), mx, my, mw, mh
        )
        window.move(x, y)
        pos["left"] = x - mx
        pos["top"] = y - my

    current = dict(default_position)
    saved = _load_saved()
    rejected_saved = False
    if saved and isinstance(saved.get("left"), (int, float)) and isinstance(saved.get("top"), (int, float)):
        current["left"] = saved["left"]
        current["top"] = saved["top"]
    elif saved:
        rejected_saved = True

    # window.move() before the first show() only takes effect once the
    # window is realized - GTK ignores move() on an unrealized window on
    # some backends. Realize (without mapping/showing) so the initial
    # position actually sticks before the caller's first show_all().
    window.realize()
    _apply(current)
    if rejected_saved:
        _save(current)

    # Real X11/XWayland windows expose event.x_root/event.y_root (absolute
    # screen coordinates) reliably. Since these overlays are override-
    # redirect X11 windows specifically so the Kronos-style always-on-top
    # mechanism works (see x11_overlay.py), root coordinates are safe to
    # use here, making this a simple absolute drag.
    drag_state = {"dragging": False, "start_x_root": 0.0, "start_y_root": 0.0, "start_left": 0, "start_top": 0}

    def _on_press(_widget, event):
        if event.button == 1:
            drag_state["dragging"] = True
            drag_state["start_x_root"] = event.x_root
            drag_state["start_y_root"] = event.y_root
            drag_state["start_left"] = current.get("left", 0)
            drag_state["start_top"] = current.get("top", 0)
        return False

    def _on_motion(_widget, event):
        if not drag_state["dragging"]:
            return False
        dx = int(event.x_root - drag_state["start_x_root"])
        dy = int(event.y_root - drag_state["start_y_root"])
        current["left"] = drag_state["start_left"] + dx
        current["top"] = drag_state["start_top"] + dy
        _apply(current)
        return False

    def _on_release(_widget, event):
        if event.button == 1 and drag_state["dragging"]:
            drag_state["dragging"] = False
            _save(current)
        return False

    window.connect("button-press-event", _on_press)
    window.connect("motion-notify-event", _on_motion)
    window.connect("button-release-event", _on_release)
