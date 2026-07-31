#!/usr/bin/env python3
"""
wfinfo pop-up overlay (PySide6, KDE-friendly window flags).
"""

import json
import os
import sys
import traceback
from pathlib import Path

from PySide6.QtGui import QIcon
from PySide6.QtCore import Qt, QTimer
from PySide6.QtWidgets import (
    QApplication, QWidget, QHBoxLayout, QVBoxLayout, QLabel,
)
from paths import DATA_DIR, WFINFO_DIR
from theme import get_palette

# .ico is natively supported for Windows taskbar/title-bar icons (HICON);
# .svg needs the QtSvg plugin to render and can silently fall back to no
# icon at all if that's missing, which is what was happening here.
WFINFO_ICON = str(WFINFO_DIR / ("orbiter.ico" if sys.platform == "win32" else "orbiter.svg"))

STATE_FILE = DATA_DIR / "latest-detection.json"
POSITION_FILE = DATA_DIR / "overlay-position.json"
CRAFTED_PARTS_FILE = DATA_DIR / "crafted_parts.json"
from paths import CONFIG_FILE

RELIC_RECOMMEND_STATE_FILE = DATA_DIR / "relic-recommend.json"
RELIC_RECOMMEND_POSITION_FILE = DATA_DIR / "relic-recommend-position.json"


def _load_config():
    try:
        return json.loads(CONFIG_FILE.read_text())
    except Exception:
        return {}


def _running_under_gamescope() -> bool:
    """gamescope (Steam's nested Wayland compositor for the game) sets this
    env var on everything it launches, including our overlay when it's
    started as part of the same session. On a normal desktop compositor
    (regular KDE/GNOME Wayland or X11), this won't be set."""
    return bool(os.environ.get("GAMESCOPE_WAYLAND_DISPLAY"))


def _apply_x11_stacking_hints(win_id: int):
    """Best-effort: ask the X server directly for EWMH hints that keep this
    window above a fullscreen game and visible on whatever desktop it's on.
    Qt's WindowStaysOnTopHint alone isn't reliably honored by KWin (Bazzite's
    default WM) once a fullscreen app like Warframe has focus — the
    reference Cephalon Kronos project hit the exact same issue and needed
    this same kind of direct X11 property manipulation, not just window
    flags, to fix it.

    Opens its own short-lived Xlib connection independent of Qt's own XCB
    one — window IDs are global X server resources, not tied to a specific
    client connection, so this is safe to do alongside Qt. Fails silently
    on Wayland-native sessions, missing libX11, gamescope, etc."""
    try:
        import ctypes
        xlib = ctypes.CDLL("libX11.so.6")
        xlib.XOpenDisplay.restype = ctypes.c_void_p
        display = xlib.XOpenDisplay(None)
        if not display:
            # XOpenDisplay uses $DISPLAY, not $WAYLAND_DISPLAY - if it's
            # unset or wrong, this fails silently with no exception at all,
            # which previously meant the whole "stay above fullscreen"
            # mechanism could be silently dead with zero trace in the log.
            log(f"X11 stacking hints skipped: XOpenDisplay failed (DISPLAY={os.environ.get('DISPLAY')!r})")
            return
        try:
            def atom(name):
                return xlib.XInternAtom(ctypes.c_void_p(display), name.encode(), False)

            net_wm_state = atom("_NET_WM_STATE")
            state_above = atom("_NET_WM_STATE_ABOVE")
            net_wm_desktop = atom("_NET_WM_DESKTOP")
            net_wm_user_time = atom("_NET_WM_USER_TIME")
            net_wm_window_type = atom("_NET_WM_WINDOW_TYPE")
            window_type_notification = atom("_NET_WM_WINDOW_TYPE_NOTIFICATION")
            cardinal = atom("CARDINAL")
            atom_type = atom("ATOM")

            PROP_MODE_REPLACE = 0
            ALL_DESKTOPS = 0xFFFFFFFF

            # _NET_WM_STATE_ABOVE alone (an EWMH *state* hint) was confirmed
            # via live testing to have zero effect on KWin's stacking over a
            # fullscreen Warframe - Kronos's overlay, by contrast, does stay
            # above it. Kronos is Electron-based, and Electron's Linux
            # backend lets you set the window's *type* (not just state) to
            # 'notification', which maps to this same X11 atom - desktop
            # notification popups are the one window class every compositor
            # reliably renders above fullscreen apps, so this asks KWin to
            # treat this window the same way instead of as an ordinary
            # utility window that merely requests to be "above".
            wtype = (ctypes.c_ulong * 1)(window_type_notification)
            xlib.XChangeProperty(
                ctypes.c_void_p(display), ctypes.c_ulong(win_id), net_wm_window_type,
                atom_type, 32, PROP_MODE_REPLACE,
                ctypes.cast(wtype, ctypes.POINTER(ctypes.c_ubyte)), 1,
            )

            # _NET_WM_STATE_ABOVE: the actual EWMH "always on top" state —
            # kept alongside the window-type hint above as defense in depth.
            states = (ctypes.c_ulong * 1)(state_above)
            xlib.XChangeProperty(
                ctypes.c_void_p(display), ctypes.c_ulong(win_id), net_wm_state,
                atom_type, 32, PROP_MODE_REPLACE,
                ctypes.cast(states, ctypes.POINTER(ctypes.c_ubyte)), 1,
            )

            # _NET_WM_DESKTOP = all desktops: stay visible regardless of
            # which workspace the fullscreen game window occupies.
            desktop = (ctypes.c_ulong * 1)(ALL_DESKTOPS)
            xlib.XChangeProperty(
                ctypes.c_void_p(display), ctypes.c_ulong(win_id), net_wm_desktop,
                cardinal, 32, PROP_MODE_REPLACE,
                ctypes.cast(desktop, ctypes.POINTER(ctypes.c_ubyte)), 1,
            )

            # Delete (not zero) _NET_WM_USER_TIME: some WMs treat a zero
            # value as "never focus this," which can affect stacking too.
            # Cephalon Kronos found deleting it outright was the real fix.
            xlib.XDeleteProperty(ctypes.c_void_p(display), ctypes.c_ulong(win_id), net_wm_user_time)

            xlib.XSync(ctypes.c_void_p(display), False)
        finally:
            xlib.XCloseDisplay(ctypes.c_void_p(display))
    except Exception as e:
        log(f"X11 stacking hints skipped: {e}")


_cfg = _load_config()
DISPLAY_DURATION_MS = int(_cfg.get("display_duration_ms") or 30000)
POLL_INTERVAL_MS = int(_cfg.get("poll_interval_ms") or 250)
# Safety-net auto-hide for the relic recommendation overlay, in case you back
# out of the relic-selection screen without confirming a pick (no EE.log line
# reliably marks that case, so the normal "confirmed a pick" trigger never fires).
RELIC_RECOMMEND_TIMEOUT_MS = 60000

# Read from whatever theme is currently selected in the main app - this
# overlay is launched fresh as its own process each time it pops up, so
# there's no live-refresh needed, just read the saved theme at startup.
# Jacob 2026-07-24 ("overlay colors need to match the themes").
_p = get_palette()
BG = _p['bg']
TEXT = _p['fg']
OWNED = _p['fg_dim']        # already owned, deprioritize
CRAFTED = _p['gold']        # collection-done
NEED = _p['green']          # never had it, take this one
UNKNOWN_COLOR = _p['red']   # OCR couldn't resolve the reward text

# Warframe doesn't log which fissure tier you're browsing until after you've
# already confirmed a relic (too late to filter), so instead each era gets its
# own color to make it easy to eyeball just the one matching your fissure.
ERA_COLORS = {
    "Lith": "#8fd3ff",
    "Meso": "#7fffb0",
    "Neo": "#ffb37f",
    "Axi": "#ff8fa3",
    "Vanguard": "#d0a3ff",
}



def _existing_timestamp(path):
    try:
        return json.loads(path.read_text()).get("timestamp")
    except (OSError, json.JSONDecodeError):
        return None

def _existing_state_id(path):
    """Prefer "seq" (a monotonic counter the Rust detector writes
    alongside "timestamp") over the timestamp itself - "timestamp" only
    has whole-second resolution, so a bad/empty capture followed shortly
    by a real one within the same second looked like the same detection
    and the real one got silently skipped. This is the same bug
    overlay_gtk.py's RelicRecommendOverlay already hit and fixed with its
    own "seq" field (2026-07-21) - falls back to "timestamp" only for an
    older, not-yet-rebuilt detector binary that doesn't write "seq" yet.
    Jacob 2026-07-24."""
    try:
        data = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return None
    return data.get("seq", data.get("timestamp"))

def log(msg):
    print(f"[overlay] {msg}", file=sys.stderr, flush=True)


def _target_screen(warframe_geom=None):
    """Return the QScreen the overlay should default to.

    Priority:
      1. config.json overlay_monitor = <index>  → that screen
      2. config.json overlay_monitor = "auto"   → screen containing Warframe window
      3. fallback                               → primary screen
    """
    from PySide6.QtWidgets import QApplication
    screens = QApplication.screens()
    if not screens:
        return None

    cfg = _load_config()
    monitor = cfg.get("overlay_monitor", "auto")

    if monitor != "auto":
        try:
            idx = int(monitor)
            if 0 <= idx < len(screens):
                return screens[idx]
        except (TypeError, ValueError):
            pass

    # Auto: find the screen that contains the Warframe window
    if warframe_geom:
        wx = warframe_geom.get("x", 0) + warframe_geom.get("width", 0) // 2
        wy = warframe_geom.get("y", 0) + warframe_geom.get("height", 0) // 2
        for s in screens:
            if s.geometry().contains(wx, wy):
                return s

    return QApplication.primaryScreen()


class _DraggableOverlay(QWidget):
    """Frameless, always-on-top, click-and-drag window whose position is
    remembered in `position_file` across drags and app restarts."""

    def __init__(self, position_file):
        super().__init__()
        self._position_file = position_file
        # Frameless, always-on-top, never steals focus.
        # Running on XWayland (via launch-overlay.sh) so the overlay stays inside
        # gamescope's compositor context and doesn't trigger a Wayland focus release.
        flags = (
            Qt.FramelessWindowHint
            | Qt.Tool
            | Qt.WindowStaysOnTopHint
            | Qt.WindowDoesNotAcceptFocus
        )
        if _running_under_gamescope():
            # X11BypassWindowManagerHint: tells the X11 WM not to manage this
            # window at all (no WM-mediated positioning/sizing/input), which
            # is what stops gamescope from releasing its input grab on the
            # game. On a normal desktop WM this isn't needed and actively
            # breaks drag-to-move and predictable sizing/positioning, since
            # the WM is never involved in placing or routing input to the
            # window at all.
            flags |= Qt.X11BypassWindowManagerHint
        self.setWindowFlags(flags)
        self.setFocusPolicy(Qt.NoFocus)
        self.setAttribute(Qt.WA_ShowWithoutActivating, True)
        self.setAttribute(Qt.WA_X11DoNotAcceptFocus, True)
        self.setWindowOpacity(0.94)
        self.setStyleSheet(f"background-color: {BG};")
        self.setCursor(Qt.SizeAllCursor)
        self._drag_offset = None

    def showEvent(self, event):
        super().showEvent(event)
        # winId() only returns a real X11 window ID when Qt is actually
        # running through its xcb platform plugin. On a pure-Wayland
        # session (no XWayland fallback), it's a different kind of handle
        # entirely - treating it as an X11 XID and sending raw Xlib calls
        # against it is undefined behavior, not just a no-op.
        if QApplication.platformName() == "xcb":
            _apply_x11_stacking_hints(int(self.winId()))

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self._drag_offset = event.globalPosition().toPoint() - self.frameGeometry().topLeft()
            if hasattr(self, "hide_timer"):
                self.hide_timer.stop()
            event.accept()

    def mouseMoveEvent(self, event):
        if event.buttons() & Qt.LeftButton and self._drag_offset is not None:
            self.move(event.globalPosition().toPoint() - self._drag_offset)
            event.accept()

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.LeftButton and self._drag_offset is not None:
            self._save_position()
            self._drag_offset = None
            if hasattr(self, "hide_timer"):
                self.hide_timer.start(DISPLAY_DURATION_MS)
            event.accept()

    def _save_position(self):
        try:
            self._position_file.parent.mkdir(parents=True, exist_ok=True)
            self._position_file.write_text(json.dumps({"x": self.x(), "y": self.y()}))
            log(f"saved position ({self.x()}, {self.y()})")
        except OSError as e:
            log(f"could not save position: {e}")

    def _load_position(self):
        if not self._position_file.exists():
            return None
        try:
            data = json.loads(self._position_file.read_text())
            if "x" in data and "y" in data:
                return data
        except (OSError, json.JSONDecodeError):
            pass
        return None

    def _position_on_any_screen(self, x, y):
        for screen in QApplication.screens():
            g = screen.geometry()
            if g.x() <= x <= g.x() + g.width() and g.y() <= y <= g.y() + g.height():
                return True
        return False


class Overlay(_DraggableOverlay):
    def __init__(self):
        super().__init__(POSITION_FILE)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(20, 14, 20, 14)
        layout.setSpacing(12)

        self.reward_widgets = []
        for _ in range(4):
            col_widget = QWidget()
            col = QVBoxLayout(col_widget)
            col.setContentsMargins(8, 0, 8, 0)
            col.setSpacing(4)

            name_lbl = QLabel("")
            name_lbl.setAlignment(Qt.AlignCenter)
            name_lbl.setWordWrap(True)
            name_lbl.setStyleSheet(f"color: {TEXT}; font-size: 12px;")
            name_lbl.setMaximumWidth(220)
            col.addWidget(name_lbl)

            status_lbl = QLabel("")
            status_lbl.setAlignment(Qt.AlignCenter)
            col.addWidget(status_lbl)

            layout.addWidget(col_widget)
            self.reward_widgets.append((name_lbl, status_lbl))

        self.hide()

        # Apply the X11 window-type/state hints once, immediately, using
        # winId() to force Qt to create the underlying native window right
        # now rather than lazily at first show(). Previously these hints
        # were only applied inside showEvent(), which fires *after* Qt has
        # already mapped the window with its default type - KWin may only
        # honor "always above / notification" placement for windows that
        # already have that type at the moment they're first mapped, and
        # never re-evaluate stacking just because a property changes on an
        # already-mapped window. Setting it before the first real show()
        # (which happens later, from show_rewards()) tests that theory.
        if QApplication.platformName() == "xcb":
            _apply_x11_stacking_hints(int(self.winId()))

        self.last_state_id = _existing_state_id(STATE_FILE)
        self._last_warframe_geom = None
        self.crafted_parts = self._load_crafted_parts()
        self.hide_timer = QTimer(self)
        self.hide_timer.setSingleShot(True)
        self.hide_timer.timeout.connect(self.hide)

        self.poll_timer = QTimer(self)
        self.poll_timer.timeout.connect(self.poll)
        self.poll_timer.start(POLL_INTERVAL_MS)
        log(f"started, polling {STATE_FILE}")

    def poll(self):
        self.poll_count = getattr(self, "poll_count", 0) + 1
        if self.poll_count % 8 == 0:  # ~2s
            log(f"poll #{self.poll_count} state_file_exists={STATE_FILE.exists()}")
        try:
            if STATE_FILE.exists():
                with open(STATE_FILE, "r") as f:
                    state = json.load(f)
                state_id = state.get("seq", state.get("timestamp"))
                if state_id != self.last_state_id:
                    # Always mark this state_id consumed immediately (not
                    # just when it turns out to have real rewards) - the
                    # bug here used to be a coarse whole-second timestamp
                    # making a bad capture and a shortly-following real
                    # one look like duplicates, silently skipping the
                    # real one. Marking it consumed regardless, but only
                    # acting on it when rewards is non-empty, fixes that
                    # without re-triggering on every single poll tick for
                    # the same still-empty state (which not updating
                    # last_state_id at all would cause). The Rust side
                    # now refuses to publish empty results in the first
                    # place, but staying defensive here in case an older,
                    # not-yet-rebuilt detector binary is still running.
                    # Jacob 2026-07-24.
                    self.last_state_id = state_id
                    rewards = state.get("rewards", [])
                    if not rewards:
                        log(f"ignoring empty/garbage detection, state_id={state_id}")
                        return
                    log(f"new detection, state_id={state_id}")
                    self._last_warframe_geom = state.get("warframe")
                    self.crafted_parts = self._load_crafted_parts()
                    self.show_rewards(rewards)
        except Exception as e:
            # Broad on purpose: an unhandled exception inside a QTimer slot
            # can silently kill the whole process (no crash line, no core
            # dump) instead of raising anything visible - catching and
            # logging here trades a missed poll tick for a process that
            # keeps running and leaves a real traceback if this ever fires.
            log(f"poll error: {e}\n{traceback.format_exc()}")

    def show_rewards(self, rewards):
        # Pad to 4 only if we have rewards; for solo (3) or duos (2) show exactly that many
        # Hide unused reward columns rather than showing empty/unknown slots
        count = max(len(rewards), 1)
        rewards = rewards[:4]
        for i, (name_lbl, status_lbl) in enumerate(self.reward_widgets):
            visible = i < len(rewards)
            name_lbl.parentWidget().setVisible(visible)
        if not rewards:
            return

        for (name_lbl, status_lbl), r in zip(self.reward_widgets, rewards):
            name = r.get("name", "")
            name_lbl.setText(name)
            status = r.get("status", "UNKNOWN")
            count = r.get("count", 0)
            # Promote NEED to CRAFTED when this part is in the crafted set
            if status == "NEED" and self._is_crafted(name):
                status = "CRAFTED"
            if status == "OWNED":
                status_lbl.setText(f"OWNED x{count}")
                color = OWNED
            elif status == "CRAFTED":
                status_lbl.setText("CRAFTED")
                color = CRAFTED
            elif status == "NEED":
                status_lbl.setText("NEED")
                color = NEED
            else:
                status_lbl.setText("UNKNOWN")
                color = UNKNOWN_COLOR
            status_lbl.setStyleSheet(
                f"color: {color}; font-size: 18px; font-weight: bold;"
            )

        self.adjustSize()
        saved = self._load_position()
        if saved and self._position_on_any_screen(saved["x"], saved["y"]):
            x, y = saved["x"], saved["y"]
            self.move(x, y)
        else:
            screen = _target_screen(self._last_warframe_geom)
            if screen is None:
                screen = QApplication.primaryScreen()
            g = screen.geometry()
            x = g.x() + (g.width() - self.width()) // 2
            y = g.y() + g.height() - self.height() - 80
            self.move(x, y)
        self.show()
        log(f"shown at ({x},{y}) size {self.width()}x{self.height()}, visible={self.isVisible()}")
        self.hide_timer.start(DISPLAY_DURATION_MS)


    def _load_crafted_parts(self):
        """Set of parts you've crafted-before (own the Prime, or mastered it)."""
        try:
            return set(json.loads(CRAFTED_PARTS_FILE.read_text()))
        except (OSError, json.JSONDecodeError):
            return set()

    def _is_crafted(self, name):
        """OCR returns names like 'Rhino Prime Systems Blueprint' but
        crafted_parts.json stores them without the ' Blueprint' suffix for
        warframe component parts. Match both forms."""
        if name in self.crafted_parts:
            return True
        if name.endswith(" Blueprint"):
            if name[: -len(" Blueprint")] in self.crafted_parts:
                return True
        else:
            if (name + " Blueprint") in self.crafted_parts:
                return True
        return False

class RelicRecommendOverlay(_DraggableOverlay):
    """Shows a ranked list of your OWNED relics (by expected plat value for
    your NEED list) when the relic-selection screen opens at Navigation,
    before a Void Fissure mission. Hides again once you confirm a pick."""

    def __init__(self):
        super().__init__(RELIC_RECOMMEND_POSITION_FILE)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 12, 16, 12)
        layout.setSpacing(4)

        title = QLabel("Relics ranked by your NEED list")
        title.setStyleSheet(f"color: {TEXT}; font-size: 13px; font-weight: bold;")
        layout.addWidget(title)

        self.rows = []
        for _ in range(8):
            row_lbl = QLabel("")
            row_lbl.setStyleSheet(f"color: {TEXT}; font-size: 13px;")
            layout.addWidget(row_lbl)
            self.rows.append(row_lbl)

        self.hide()
        self.last_timestamp = _existing_timestamp(RELIC_RECOMMEND_STATE_FILE)
        self.hide_timer = QTimer(self)
        self.hide_timer.setSingleShot(True)
        self.hide_timer.timeout.connect(self.hide)
        self.poll_timer = QTimer(self)
        self.poll_timer.timeout.connect(self.poll)
        self.poll_timer.start(POLL_INTERVAL_MS)
        log(f"relic-recommend overlay started, polling {RELIC_RECOMMEND_STATE_FILE}")

    def poll(self):
        try:
            if RELIC_RECOMMEND_STATE_FILE.exists():
                with open(RELIC_RECOMMEND_STATE_FILE, "r") as f:
                    state = json.load(f)
                ts = state.get("timestamp")
                if ts != self.last_timestamp:
                    self.last_timestamp = ts
                    if state.get("visible"):
                        self.show_relics(state.get("relics", []))
                    else:
                        self.hide()
        except Exception as e:
            log(f"relic-recommend poll error: {e}\n{traceback.format_exc()}")

    def show_relics(self, relics):
        if not relics:
            self.hide()
            return
        for i, row_lbl in enumerate(self.rows):
            if i < len(relics):
                r = relics[i]
                era_color = ERA_COLORS.get(r['era'], TEXT)
                row_lbl.setTextFormat(Qt.RichText)
                row_lbl.setText(
                    f"<span style='color:{era_color}; font-weight:bold;'>{r['era']} {r['name']}</span>"
                    f"  —  NEED: {r['ev_need']:.1f}p"
                    f"  (total {r['ev_total']:.1f}p, owned x{r['owned']})"
                )
                row_lbl.setVisible(True)
            else:
                row_lbl.setVisible(False)

        self.adjustSize()
        saved = self._load_position()
        if saved and self._position_on_any_screen(saved["x"], saved["y"]):
            x, y = saved["x"], saved["y"]
        else:
            screen = QApplication.primaryScreen().geometry()
            x = screen.x() + 40
            y = screen.y() + 80
        self.move(x, y)
        self.show()
        self.hide_timer.start(RELIC_RECOMMEND_TIMEOUT_MS)
        log(f"relic-recommend shown at ({x},{y}) with {len(relics)} relics")


def _log_uncaught(exc_type, exc_value, exc_tb):
    log("UNCAUGHT EXCEPTION (would otherwise die silently):\n"
        + "".join(traceback.format_exception(exc_type, exc_value, exc_tb)))


def main():
    import os, fcntl
    import psutil

    sys.excepthook = _log_uncaught

    # ── Singleton: kill any other overlay.py before starting ─────────────
    pid_path = DATA_DIR / "overlay.pid"
    pid_path.parent.mkdir(parents=True, exist_ok=True)
    # Kill previous instance if still running
    try:
        old_pid = int(pid_path.read_text().strip())
        if old_pid != os.getpid():
            try:
                proc = psutil.Process(old_pid)
                # Verify this PID still actually IS an overlay.py process
                # before signaling it - PIDs get reused by the OS once a
                # process exits, so blindly os.kill()-ing whatever PID
                # happens to be recorded here (this used to do exactly
                # that, with no identity check at all) can kill a
                # completely unrelated process that happened to reuse
                # this same PID number since the file was written. Jacob
                # 2026-07-24 ("GTK overlay singleton PID files don't check
                # process identity/start time before signaling" - same
                # bug here in the Qt overlay too).
                cmdline = " ".join(proc.cmdline())
                if "overlay.py" in cmdline:
                    proc.terminate()
                    log(f"killed previous overlay instance (pid {old_pid})")
                    import time as _t; _t.sleep(0.3)
                else:
                    log(f"pid {old_pid} in overlay.pid is no longer overlay.py "
                        f"(now: {cmdline!r}) - not signaling it")
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass  # already dead, or can't inspect it - either way don't kill blind
    except Exception:
        pass
    pid_path.write_text(str(os.getpid()))

    # Neither overlay (Overlay nor RelicRecommendOverlay, below) can
    # reliably stay above a fullscreen game via Qt on this KWin/Wayland
    # setup - see overlay_gtk.py's module docstring for the full research
    # trail. If GTK/PyGObject is actually installed, run that
    # implementation instead, as a separate process (GTK's and Qt's event
    # loops can't coexist in one process) - overlay_gtk.py's own main()
    # runs both of its GTK-based overlays together, so neither Qt overlay
    # class gets instantiated at all when this path is taken.
    gtk_overlay_proc = None
    try:
        import subprocess
        import importlib
        importlib.import_module("overlay_gtk")
        gtk_overlay_proc = subprocess.Popen([sys.executable, str(WFINFO_DIR / "overlay_gtk.py")])
        log("GTK available - launched overlay_gtk.py for both overlays")
    except Exception as e:
        # Broad on purpose: a broken/partial `gi` install (seen in one
        # environment during development - present as a namespace stub
        # with no require_version attribute) raises AttributeError here,
        # not ImportError, and either way this must fall back to the Qt
        # overlays rather than crash main() entirely.
        log(f"GTK not available ({e}) - using Qt overlays")

    if gtk_overlay_proc is not None:
        # QApplication itself was the actual crash: creating it here was
        # calling into Qt's xcb platform plugin, which fails hard (a
        # native qFatal()/abort(), not a catchable Python exception) with
        # "could not connect to display :0" on this machine - and because
        # it aborts at the C++ level, Python's own finally block below
        # never even ran, silently orphaning the GTK subprocess on every
        # single launch. Qt is completely unnecessary once the GTK
        # subprocess is handling both overlays, so skip it entirely here
        # instead of creating an app object with nothing to do and no
        # windows to show - just wait on the child directly.
        try:
            gtk_overlay_proc.wait()
        except KeyboardInterrupt:
            pass
        finally:
            gtk_overlay_proc.terminate()
        return

    app = QApplication(sys.argv)
    app.setWindowIcon(QIcon(WFINFO_ICON))
    overlay = Overlay()  # keep reference alive - Qt fallback
    relic_overlay = RelicRecommendOverlay()  # keep reference alive - Qt fallback
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
