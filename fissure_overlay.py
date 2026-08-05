#!/usr/bin/env python3
"""
fissure_overlay.py - GTK overlay showing active Void Fissures. Ported from
Qt on 2026-07-16: the Qt version never actually displayed anything - it
crashed on every launch with "Authorization required, but no authorization
protocol specified" / "could not connect to display :0", the same class of
X11/Wayland fragility that broke the relic-reward and relic-recommend
overlays. Windowing switched 2026-07-27 to replicate Cephalon Kronos's
actual override-redirect + raw-Xlib-hints + focus-lost-AOT-keeper
mechanism - see overlay_gtk.py and x11_overlay.py's module docstrings for
the full account. This is a persistent status HUD, not an event-triggered
popup - it never auto-hides, only updates in place whenever
fissure_watcher.py writes fresh data.
"""

import json
import os
import sys
import time
import traceback
from datetime import datetime, timezone

os.environ.setdefault("GDK_BACKEND", "x11")

import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, GLib  # noqa: E402

from paths import DATA_DIR, WFINFO_DIR  # noqa: E402
from theme import get_palette  # noqa: E402
from x11_overlay import (  # noqa: E402
    setup_overlay_window, move_to_monitor, raise_and_keep_on_top,
    resolve_target_monitor,
)

STATE_FILE = DATA_DIR / "fissure-overlay.json"
from paths import CONFIG_FILE

POLL_INTERVAL_MS = 2000

# Read from whatever theme is currently selected in the main app. Unlike
# the event-triggered popup overlays, this is a persistent HUD, so it only
# picks up a theme change on its own next restart (e.g. app launch or the
# "Restart Overlay" button in Settings), not live while already running -
# same tradeoff already accepted for the Qt settings tabs that don't have
# a live-refresh hook either. Jacob 2026-07-24.
_p = get_palette()
BG = _p['bg']
TEXT = _p['fg']
DIM = _p['fg_dim']

TIER_COLORS = {
    "Lith":     "#8fd3ff",
    "Meso":     "#7fffb0",
    "Neo":      "#ffb37f",
    "Axi":      "#ff8fa3",
    "Requiem":  "#d0a3ff",
    "Omnia":    "#ffd24c",
    "Vanguard": "#c9a84c",
}
TIER_ORDER = ["Lith", "Meso", "Neo", "Axi", "Requiem", "Omnia", "Vanguard"]

CSS = f"""
window {{ background-color: {BG}; }}
label {{ color: {TEXT}; font-family: sans-serif; }}
.title {{ font-size: 12px; font-weight: bold; }}
.age {{ color: {DIM}; font-size: 10px; }}
.tier {{ font-size: 11px; font-weight: bold; }}
.info {{ font-size: 11px; }}
.eta {{ color: {DIM}; font-size: 10px; }}
.empty {{ color: {DIM}; font-size: 11px; padding: 12px; }}
"""


def log(msg):
    print(f"[fissure-overlay] {msg}", file=sys.stderr, flush=True)


def _load_config():
    try:
        return json.loads(CONFIG_FILE.read_text())
    except Exception:
        return {}


def _target_monitor():
    return resolve_target_monitor(_load_config())


def _expiry_str(expiry_iso):
    if not expiry_iso:
        return ""
    try:
        expiry = datetime.fromisoformat(expiry_iso.replace("Z", "+00:00"))
        delta = expiry - datetime.now(timezone.utc)
        if delta.total_seconds() < 0:
            return "expired"
        total = int(delta.total_seconds())
        h, rem = divmod(total, 3600)
        m = rem // 60
        return f"{h}h {m}m" if h else f"{m}m"
    except Exception:
        return ""


class FissureOverlay:
    def __init__(self):
        self._last_ts = None

        self.window = Gtk.Window(type=Gtk.WindowType.TOPLEVEL)
        self.window.set_decorated(False)
        self.window.set_resizable(False)
        self.window.set_size_request(260, -1)

        setup_overlay_window(self.window)
        monitor = _target_monitor()
        position_file = DATA_DIR / "fissure-overlay-gtk-position.json"
        default_position = {"top": 80, "left": 40}
        if monitor is not None:
            move_to_monitor(self.window, monitor, position_file, default_position)

        from gtk_overlay_drag import enable_drag
        enable_drag(self.window, None, position_file, default_position)

        css_provider = Gtk.CssProvider()
        css_provider.load_from_data(CSS.encode())
        Gtk.StyleContext.add_provider_for_screen(
            self.window.get_screen(), css_provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )

        self._setup_ui()
        self.window.set_opacity(0.95)

        GLib.timeout_add(POLL_INTERVAL_MS, self._poll)
        log(f"started, polling {STATE_FILE}")
        self._poll()

    def _setup_ui(self):
        outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self.window.add(outer)

        title_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=4)
        title_row.set_margin_top(4)
        title_row.set_margin_bottom(4)
        title_row.set_margin_start(8)
        title_row.set_margin_end(8)
        title_lbl = Gtk.Label(label="◆ Void Fissures")
        title_lbl.get_style_context().add_class("title")
        title_row.pack_start(title_lbl, False, False, 0)
        self._age_lbl = Gtk.Label(label="")
        self._age_lbl.get_style_context().add_class("age")
        title_row.pack_end(self._age_lbl, False, False, 0)
        outer.pack_start(title_row, False, False, 0)

        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        scroll.set_max_content_height(360)
        scroll.set_propagate_natural_height(True)
        self._content = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        self._content.set_margin_top(6)
        self._content.set_margin_bottom(6)
        self._content.set_margin_start(8)
        self._content.set_margin_end(8)
        scroll.add(self._content)
        outer.pack_start(scroll, True, True, 0)

        self._empty_lbl = Gtk.Label(label="Waiting for fissure data…")
        self._empty_lbl.get_style_context().add_class("empty")
        self._content.pack_start(self._empty_lbl, False, False, 0)

        self.window.show_all()
        raise_and_keep_on_top(self.window)

    def _clear_content(self):
        for child in self._content.get_children():
            self._content.remove(child)

    def _poll(self):
        try:
            if not STATE_FILE.exists():
                return True
            state = json.loads(STATE_FILE.read_text())
            ts = state.get("timestamp")
            if ts == self._last_ts:
                return True
            self._last_ts = ts
            self._show_fissures(state.get("fissures", []), ts)
        except Exception as e:
            log(f"poll error: {e}\n{traceback.format_exc()}")
        return True

    def _show_fissures(self, fissures, ts):
        self._clear_content()

        by_tier = {}
        for f in fissures:
            by_tier.setdefault(f.get("tier", "?"), []).append(f)

        any_shown = False
        for tier in TIER_ORDER:
            fs = by_tier.get(tier, [])
            if not fs:
                continue
            any_shown = True
            color = TIER_COLORS.get(tier, TEXT)

            tier_lbl = Gtk.Label()
            tier_lbl.set_markup(f"<span foreground='{color}'>● {tier}</span>")
            tier_lbl.get_style_context().add_class("tier")
            tier_lbl.set_xalign(0)
            tier_lbl.set_margin_top(4)
            self._content.pack_start(tier_lbl, False, False, 0)

            for f in fs:
                suffix = ""
                if f.get("isHard"):
                    suffix += " ●"
                if f.get("isStorm"):
                    suffix += " ⚡"
                row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
                row.set_margin_start(10)
                info = Gtk.Label(label=f"{f.get('missionType', '')} — {f.get('node', '')}{suffix}")
                info.get_style_context().add_class("info")
                info.set_xalign(0)
                eta = Gtk.Label(label=_expiry_str(f.get("expiry")) or "—")
                eta.get_style_context().add_class("eta")
                eta.set_xalign(1)
                eta.set_size_request(48, -1)
                row.pack_start(info, True, True, 0)
                row.pack_start(eta, False, False, 0)
                self._content.pack_start(row, False, False, 0)

        if not any_shown:
            lbl = Gtk.Label(label="No active fissures")
            lbl.get_style_context().add_class("empty")
            self._content.pack_start(lbl, False, False, 0)

        self._age_lbl.set_text(f"updated {int(time.time()) - ts}s ago" if ts else "")
        self._content.show_all()
        log(f"shown, {len(fissures)} fissures")


def _enforce_singleton():
    """Same pid-file singleton pattern as overlay_gtk.py - see that
    module's identical helper for the full reasoning (orphaned subprocess
    children accumulating across restarts)."""
    import os
    import signal
    pid_path = DATA_DIR / "fissure-overlay.pid"
    pid_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        old_pid = int(pid_path.read_text().strip())
        if old_pid != os.getpid():
            try:
                os.kill(old_pid, signal.SIGTERM)
                log(f"killed previous instance (pid {old_pid})")
                time.sleep(0.3)
            except ProcessLookupError:
                pass
    except Exception:
        pass
    pid_path.write_text(str(os.getpid()))


def main():
    _enforce_singleton()
    overlay = FissureOverlay()  # noqa: F841 - keep reference alive
    Gtk.main()


if __name__ == "__main__":
    main()
