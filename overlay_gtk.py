#!/usr/bin/env python3
"""
overlay_gtk.py - GTK reimplementation of the relic reward overlay, for
Linux/Wayland only.

Why this exists: the PySide6/Qt version (overlay.py) cannot reliably stay
above a fullscreen game on KWin/Wayland - four different techniques (Qt's
own WindowStaysOnTopHint, manual X11 _NET_WM_STATE_ABOVE, manual X11
_NET_WM_WINDOW_TYPE_NOTIFICATION, and applying those hints before the first
map) were all tested live and all failed. GTK's gtk-layer-shell (the
Wayland layer-shell protocol) then became the proven-working approach.

2026-07-27, second attempt: replaced gtk-layer-shell again, this time
replicating Cephalon Kronos's *actual* overlay_utils.rs mechanism in full
(read end-to-end, not just its Cargo.toml) - override-redirect, raw Xlib
`_NET_WM_STATE`/`_NET_WM_DESKTOP`/`_MOTIF_WM_HINTS` writes, an unmap-set-
remap dance, and a persistent focus-lost "AOT keeper" that re-raises the
window every time it loses focus. See x11_overlay.py's module docstring
for the full mechanism and why a shallower first attempt (GDK's
set_keep_above() alone) failed live earlier the same day. Jacob's explicit
direction: try the focus-accepting AOT keeper as Kronos actually built it,
despite a real, unresolved theoretical risk that it could steal input
focus from Warframe during play (needs live verification specifically for
that).

This intentionally reimplements only the core relic-reward popup, not the
relic-recommendation overlay - see overlay.py for that one, still Qt-based
for now.
"""

import json
import os

import psutil
from datetime import datetime
import sys
import time
import traceback
from pathlib import Path

# Must be set before Gtk/Gdk import - this mechanism is X11/XWayland
# throughout (raw Xlib calls, override-redirect), not native Wayland.
os.environ.setdefault("GDK_BACKEND", "x11")

import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, GLib, Gdk  # noqa: E402

from paths import DATA_DIR, WFINFO_DIR  # noqa: E402
from platform_utils import _matches_pattern  # noqa: E402
from theme import get_palette  # noqa: E402
from x11_overlay import (  # noqa: E402
    setup_overlay_window, monitor_origin, move_to_monitor, target_monitor,
    show_at, apply_position, raise_and_keep_on_top,
    resolve_target_monitor,
)

STATE_FILE = DATA_DIR / "latest-detection.json"
CRAFTED_PARTS_FILE = DATA_DIR / "crafted_parts.json"
from paths import CONFIG_FILE
LOG_FILE = DATA_DIR / "overlay-gtk.log"


def log(msg):
    # Durable millisecond timestamps let us compare detector state writes
    # with GTK polling/display after a live mission.
    ts = datetime.now().astimezone().isoformat(timespec="milliseconds")
    line = f"[{ts}] [overlay-gtk] {msg}"
    print(line, file=sys.stderr, flush=True)
    try:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with LOG_FILE.open("a", encoding="utf-8") as log_file:
            log_file.write(line + "\n")
    except Exception:
        # Logging must never take down the overlay.
        pass


def _load_config():
    try:
        return json.loads(CONFIG_FILE.read_text())
    except Exception:
        return {}


_cfg = _load_config()
DISPLAY_DURATION_MS = int(_cfg.get("display_duration_ms") or 30000)
POLL_INTERVAL_MS = int(_cfg.get("poll_interval_ms") or 250)

# Read from whatever theme is currently selected in the main app - this
# overlay is launched fresh as its own process each time it pops up, so
# there's no live-refresh needed, just read the saved theme at startup.
# Jacob 2026-07-24 ("overlay colors need to match the themes").
_p = get_palette()
BG = _p['bg']
TEXT = _p['fg']
OWNED = _p['fg_dim']
CRAFTED = _p['gold']
NEED = _p['green']
UNKNOWN_COLOR = _p['red']

def _reward_css(scale=1.0):
    """CSS for the reward overlay, with font sizes scaled to the game's
    actual resolution instead of fixed pixel values.

    Jacob's complaint 2026-07-20: the overlay was noticeably smaller than
    Warframe's own reward boxes. The fixed 12px/18px values looked fine on
    a 1080p reference but shrink relative to everything else on a higher
    resolution - Warframe's own reward-box UI scales with resolution,
    ours didn't. 1080p is the scaling baseline (scale=1.0 there); clamped
    to a sane range so a wildly unusual resolution report can't produce an
    illegibly tiny or absurdly huge overlay."""
    return f"""
window {{ background-color: {BG}; }}
label {{ color: {TEXT}; font-family: sans-serif; }}
.name {{ font-size: {12 * scale:.1f}px; }}
.status {{ font-size: {18 * scale:.1f}px; font-weight: bold; }}
.owned {{ color: {OWNED}; }}
.crafted {{ color: {CRAFTED}; }}
.need {{ color: {NEED}; }}
.unknown {{ color: {UNKNOWN_COLOR}; }}
"""


def _scale_for_geom(geom):
    """warframe_geom's height (the game's actual render resolution, not the
    monitor's) is the right scaling reference - it's what Warframe's own
    UI is actually scaling against, and is already threaded through to
    every overlay via the reward detector's state file. Used as a fallback
    when a reward has no "rect" (older orbiter binary before the 2026-07-20
    rebuild that started reporting real box positions)."""
    if not geom or not geom.get("height"):
        return 1.0
    return max(0.75, min(2.5, geom["height"] / 1080.0))


# Reference box width the Rust detector's OCR crop region works out to at
# 1x scaling (PIXEL_REWARD_WIDTH / 4 in src/ocr.rs) - used to turn a real
# reward box's reported pixel width into the same kind of scale factor
# _scale_for_geom produces, so real box measurements (added 2026-07-20 so
# the overlay could match Warframe's own box sizes instead of guessing)
# and the geometry-based fallback can share the same CSS/margin scaling
# code.
REFERENCE_BOX_WIDTH = 968.0 / 4


def _scale_for_rect(rect):
    if not rect or not rect.get("width"):
        return None
    return max(0.75, min(2.5, rect["width"] / REFERENCE_BOX_WIDTH))


def _existing_state_id(path):
    """Same fix as RelicRecommendOverlay's own "seq" field below, applied
    to the reward detector's state file too - "timestamp" only has
    whole-second resolution, so a bad/empty capture followed shortly by
    a real one within the same second looked like the same detection and
    the real one got silently skipped. Falls back to "timestamp" only for
    an older, not-yet-rebuilt detector binary that doesn't write "seq"
    yet. Jacob 2026-07-24."""
    try:
        data = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return None
    return data.get("seq", data.get("timestamp"))


def _target_monitor(warframe_geom=None):
    return resolve_target_monitor(_load_config(), warframe_geom)


class Overlay:
    def __init__(self):
        self.last_state_id = _existing_state_id(STATE_FILE)
        self.crafted_parts = self._load_crafted_parts()
        self._hide_source = None
        # Keyed by reward count, not a single shared file - a drag saved
        # while showing a 4-item round was silently being replayed as the
        # position for 2- and 3-item rounds too (same monitor-relative
        # offset applied regardless of where that round's boxes actually
        # are), which is what made the overlay look like it had jumped to
        # the top-left corner on smaller reward counts. Confirmed live
        # 2026-08-02. 4 keeps the original filename so an existing
        # correctly-calibrated 4-item drag isn't lost by this change.
        self._current_reward_count = 4
        self._position_file = self._position_file_for(4)

        self.window = Gtk.Window(type=Gtk.WindowType.TOPLEVEL)
        self.window.set_decorated(False)
        self.window.set_resizable(False)

        # override-redirect + focus-lost AOT keeper - see
        # x11_overlay.py's setup_overlay_window(). _show_rewards below
        # positions/shows the panel via x11_overlay.show_at().
        setup_overlay_window(self.window)

        from gtk_overlay_drag import enable_drag
        enable_drag(
            self.window,
            None,
            lambda: self._position_file_for(self._current_reward_count),
            {"top": 780, "left": 700},
        )

        # Kept as an instance attribute (rather than a local) so
        # _show_rewards can reload it in place with resolution-scaled CSS
        # each time a detection comes in - reusing the same provider updates
        # already-applied styles rather than stacking duplicate providers.
        self._css_provider = Gtk.CssProvider()
        self._css_provider.load_from_data(_reward_css(1.0).encode())
        screen = self.window.get_screen()
        Gtk.StyleContext.add_provider_for_screen(
            screen, self._css_provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )

        self.hbox = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        self._set_hbox_margins(1.0)
        self.window.add(self.hbox)

        self.window.set_opacity(0.94)

        GLib.timeout_add(POLL_INTERVAL_MS, self._poll)
        log(f"started, polling {STATE_FILE}")

    def _position_file_for(self, count):
        suffix = "" if count == 4 else f"-{count}"
        return DATA_DIR / f"overlay-gtk-position{suffix}.json"

    def _set_hbox_margins(self, scale):
        self.hbox.set_margin_top(round(14 * scale))
        self.hbox.set_margin_bottom(round(14 * scale))
        # No left/right margin here (unlike top/bottom) - the window's
        # LEFT layer-shell margin is already set to the real box's exact
        # x position in _show_rewards. Any horizontal padding here would
        # push the visible columns inward from that position, throwing off
        # the alignment even though the window itself sits in the right
        # place. Confirmed live 2026-07-20: this was exactly the "doesn't
        # quite align on the left" symptom.

    def _load_crafted_parts(self):
        try:
            return set(json.loads(CRAFTED_PARTS_FILE.read_text()))
        except (OSError, json.JSONDecodeError):
            return set()

    def _is_crafted(self, name):
        if name in self.crafted_parts:
            return True
        if name.endswith(" Blueprint"):
            if name[: -len(" Blueprint")] in self.crafted_parts:
                return True
        else:
            if (name + " Blueprint") in self.crafted_parts:
                return True
        return False

    def _poll(self):
        try:
            if STATE_FILE.exists():
                with open(STATE_FILE, "r") as f:
                    state = json.load(f)
                state_id = state.get("seq", state.get("timestamp"))
                if state_id != self.last_state_id:
                    # Always mark this state_id consumed immediately, but
                    # only act on it when rewards is non-empty - same fix
                    # as overlay.py's reward Overlay class (see
                    # _existing_state_id's docstring above). The Rust side
                    # now refuses to publish empty results in the first
                    # place, but staying defensive here in case an older,
                    # not-yet-rebuilt detector binary is still running.
                    # Jacob 2026-07-24.
                    self.last_state_id = state_id
                    rewards = state.get("rewards", [])
                    if not rewards:
                        log(f"ignoring empty/garbage detection, state_id={state_id}")
                        return True
                    written_at_ms = state.get("written_at_ms")
                    age_ms = (time.time_ns() // 1_000_000 - written_at_ms) if written_at_ms else None
                    log(f"new detection, state_id={state_id}, state_age_ms={age_ms}")
                    self.crafted_parts = self._load_crafted_parts()
                    self._show_rewards(rewards, state.get("warframe"), written_at_ms)
        except Exception as e:
            log(f"poll error: {e}\n{traceback.format_exc()}")
        return True  # keep the GLib timeout running

    def _clear(self):
        for child in self.hbox.get_children():
            self.hbox.remove(child)

    def _show_rewards(self, rewards, warframe_geom=None, written_at_ms=None):
        self._clear()
        if not rewards:
            return

        monitor = _target_monitor(warframe_geom)
        mx, my = monitor_origin(monitor)

        shown = rewards[:4]
        # Must happen before self._position_file is read anywhere below -
        # a saved drag position is only valid for the reward count it was
        # dragged at (see _position_file_for's docstring context in
        # __init__).
        self._current_reward_count = len(shown)
        self._position_file = self._position_file_for(len(shown))
        # Real per-box width from the Rust detector (added 2026-07-20) is a
        # much more direct scaling reference than warframe_geom's overall
        # resolution - it's the actual measured box, not an approximation.
        # Falls back to the resolution-based guess for any reward missing
        # a "rect" (e.g. an orbiter binary from before this rebuild).
        rect_scales = [_scale_for_rect(r.get("rect")) for r in shown]
        geom_scale = _scale_for_geom(warframe_geom)
        scale = next((s for s in rect_scales if s is not None), geom_scale)
        self._css_provider.load_from_data(_reward_css(scale).encode())
        self._set_hbox_margins(scale)

        # Position the panel directly under the real boxes, not just match
        # their width - matching size alone (2026-07-20's first attempt at
        # this) still left the panel sitting wherever it was last dragged,
        # nowhere near the actual boxes. Only the reward overlay does this;
        # relic-recommend/riven/fissure don't have real box positions to
        # target and keep using drag-remembered placement as before.
        #
        # Computed here but NOT applied yet - see the show_all()/position
        # ordering note below (Kronos's confirmed KWin fix, 647ffd7:
        # "raise_x11 + set_always_on_top after backing-store invalidation
        # so KWin stacking sticks" - the same class of bug, extended here
        # to position, not just stacking).
        rects = [r.get("rect") for r in shown if r.get("rect")]
        if rects:
            left = min(r["x"] for r in rects)
            bottom = max(r["y"] + r["height"] for r in rects)
            # rect is the tight OCR text-crop region, not the full box -
            # Warframe draws a player-name/platform-icon row below the
            # item name text before the box visually ends. Confirmed live
            # 2026-07-20: an 8px gap left the panel overlapping both the
            # tail of the item name text and that player-name row. 60px
            # is a rough estimate to clear it - may still need tuning.
            GAP = round(60 * scale)

            # hbox's spacing between columns needs to match the real gaps
            # between Warframe's own boxes, not a fixed guess - a wrong
            # fixed spacing compounds column by column, so the panel drifts
            # further off with each box (confirmed live 2026-07-20: left
            # edge was only "a smidge" off but the right edge was visibly
            # past the last box - exactly what a too-large fixed spacing
            # produces across 3-4 columns).
            ordered = sorted(rects, key=lambda r: r["x"])
            gaps = [
                ordered[i + 1]["x"] - (ordered[i]["x"] + ordered[i]["width"])
                for i in range(len(ordered) - 1)
            ]
            spacing = round(sum(gaps) / len(gaps)) if gaps else round(12 * scale)
            self.hbox.set_spacing(max(0, spacing))

        for r in shown:
            col = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
            rect = r.get("rect")
            if rect and rect.get("width"):
                # Match the column's actual width to the real reward box's
                # width instead of letting it auto-size to whatever the
                # text happens to need - this was the core of the "smaller
                # than the actual relic boxes" complaint, since a narrow
                # text label doesn't come close to a real box's width.
                col.set_size_request(int(rect["width"]), -1)
            else:
                # No rect (older orbiter binary, or a synthetic test
                # detection without one) - name_lbl's set_max_width_chars(1)
                # below makes GTK wrap to whatever width this column
                # actually gets allocated, so with no size_request at all
                # it would wrap to the narrowest possible width (one word
                # per line, comically tall/narrow). Give it the same
                # reference width used elsewhere as the "typical" box
                # size instead of leaving it unconstrained. Jacob
                # 2026-07-25.
                col.set_size_request(int(REFERENCE_BOX_WIDTH * scale), -1)

            name_lbl = Gtk.Label(label=r.get("name", ""))
            name_lbl.get_style_context().add_class("name")
            name_lbl.set_line_wrap(True)
            # Previously skipped set_max_width_chars() on the theory that
            # it "requests its own preferred wrap width independent of
            # the column's actual width" - confirmed live 2026-07-25 that
            # this was backwards: without it, GTK's size negotiation
            # still computes the label's *natural* size as the full
            # unwrapped single-line width, so set_line_wrap(True) alone
            # never actually triggers on long names (e.g. "Harrow Prime
            # Systems Blueprint") - it just overflows past the column
            # instead of wrapping. set_max_width_chars(1) is the standard
            # GTK fix for exactly this: it caps the label's *natural* size
            # request down to (effectively) nothing, so wrapping is
            # governed entirely by whatever width the column actually
            # ends up allocated (the real reward box's width, from
            # set_size_request() above) - not a fixed character count.
            # Jacob 2026-07-25 ("the text in the overlay looks weird...
            # not wrapping the text").
            name_lbl.set_max_width_chars(1)
            # Centering still didn't take with
            # just pack_start(expand=True, fill=True) + halign(CENTER) -
            # confirmed live 2026-07-20. Root cause: for a *vertical*
            # Gtk.Box, pack_start's expand/fill govern space distribution
            # along the box's main axis (vertical), not horizontal sizing -
            # they don't make a child claim the box's full width. Need
            # set_hexpand(True) explicitly for that; halign(CENTER) then
            # centers the label within the width it's actually claiming.
            name_lbl.set_justify(Gtk.Justification.CENTER)
            name_lbl.set_halign(Gtk.Align.CENTER)
            name_lbl.set_hexpand(True)
            col.pack_start(name_lbl, True, True, 0)

            status = r.get("status", "UNKNOWN")
            count = r.get("count", 0)
            name = r.get("name", "")
            if status == "NEED" and self._is_crafted(name):
                status = "CRAFTED"

            status_lbl = Gtk.Label()
            status_lbl.get_style_context().add_class("status")
            if status == "OWNED":
                status_lbl.set_text(f"OWNED x{count}")
                status_lbl.get_style_context().add_class("owned")
            elif status == "CRAFTED":
                status_lbl.set_text("CRAFTED")
                status_lbl.get_style_context().add_class("crafted")
            elif status == "NEED":
                status_lbl.set_text("NEED")
                status_lbl.get_style_context().add_class("need")
            else:
                status_lbl.set_text("UNKNOWN")
                status_lbl.get_style_context().add_class("unknown")
            status_lbl.set_halign(Gtk.Align.CENTER)
            status_lbl.set_hexpand(True)
            col.pack_start(status_lbl, True, True, 0)

            self.hbox.pack_start(col, True, True, 0)

        self.window.show_all()

        # Position AFTER show_all() finalizes the window's real size from
        # this call's content, not before - Kronos's own confirmed fix
        # (647ffd7) found KWin re-evaluates window state on the
        # ConfigureNotify from any size change, undoing whatever was set
        # beforehand. Applying position here, once the size this frame
        # actually needs is already settled, avoids a subsequent
        # content-driven resize knocking it back off.
        # A position file exists only after the player has dragged the
        # overlay.  Once they do that, their explicit placement must win on
        # every subsequent reward choice; the old code recomputed the OCR-box
        # position here every time and visibly snapped it back to the default.
        if self._position_file.exists():
            move_to_monitor(
                self.window, monitor,
                self._position_file,
                {"top": 780, "left": 700},
            )
        elif rects:
            apply_position(self.window, mx + int(left), my + int(bottom) + GAP)
        else:
            # Synthetic Test Overlay states have no OCR rectangles. The old
            # code resolved the target monitor above but never moved the
            # window in this branch, leaving it on the app/primary monitor.
            move_to_monitor(
                self.window, monitor,
                self._position_file,
                {"top": 780, "left": 700},
            )

        raise_and_keep_on_top(self.window)
        # This path shows via show_all()/apply_position()/raise_and_keep_on_top(),
        # not x11_overlay.show_at() - so show_at()'s own "final state" log line
        # never fires here. Mirroring it so a future miss (issue #12) has the
        # same GTK-ground-truth record show_at() callers already get.
        log(f"reward show: final state mapped={self.window.get_mapped()} "
            f"visible={self.window.get_visible()} position={self.window.get_position()}")
        selected_geo = monitor.get_geometry() if monitor is not None else None
        log(f"reward placement backend={Gdk.Display.get_default().__class__.__name__} "
            f"warframe={warframe_geom} monitor={selected_geo} "
            f"window_pos={self.window.get_position()} rect_count={len(rects)}")
        display_age_ms = (time.time_ns() // 1_000_000 - written_at_ms) if written_at_ms else None
        log(f"shown, {len(rewards)} rewards, state_to_shown_ms={display_age_ms}")

        if self._hide_source is not None:
            GLib.source_remove(self._hide_source)
        self._hide_source = GLib.timeout_add(DISPLAY_DURATION_MS, self._hide)

    def _hide(self):
        self.window.hide()
        self._hide_source = None
        return False  # one-shot


RELIC_RECOMMEND_STATE_FILE = DATA_DIR / "relic-recommend.json"
RELIC_RECOMMEND_TIMEOUT_MS = 60000

ERA_COLORS = {
    "Lith": "#8fd3ff",
    "Meso": "#7fffb0",
    "Neo": "#ffb37f",
    "Axi": "#ff8fa3",
    "Vanguard": "#d0a3ff",
}

# Matches relic_recommend_watcher.py's STANDARD_ERAS / compute_recommendations_by_era.
STANDARD_ERAS = ["Lith", "Meso", "Neo", "Axi"]
RELIC_ROWS_PER_ERA = 5

RELIC_CSS = """
.title { font-size: 13px; font-weight: bold; }
.era-header { font-size: 13px; font-weight: bold; }
.relic-row { font-size: 12px; }
"""


class RelicRecommendOverlay:
    """Shows your OWNED relics ranked by expected plat value for your NEED
    list, one column per era (Lith/Meso/Neo/Axi), when the relic-selection
    screen opens at Navigation before a Void Fissure mission. Hides again
    once you confirm a pick.

    Columns rather than a single filtered list - added 2026-07-21.
    Multiple approaches were tried to auto-filter to just the era your
    mission actually needs (a "Cached mission name=...Fissure" line, then
    a Resloader/Projections line borrowed from cephalon-kronos), but
    confirmed live via real testing that Warframe's client doesn't reveal
    which tier a mission needs anywhere - in EE.log or its in-memory
    ring buffer - until *after* you've already picked a relic. Jacob's own
    suggestion was to show all four eras side by side instead of chasing
    a detection signal that doesn't exist yet at pick time - you look at
    whichever column matches your mission.

    Same "why GTK" reasoning as Overlay above - this was still Qt-based
    until Jacob reported it logged as shown but never actually appeared
    over fullscreen Warframe, the identical symptom the reward overlay had
    before this rewrite."""

    def __init__(self):
        # Tracks "seq" (a monotonic counter from relic_recommend_watcher.py),
        # not "timestamp" - the watcher's timestamp only has whole-second
        # resolution, and a fast open-then-cancel/confirm sequence could
        # write twice within the same second. Comparing timestamps meant
        # the second write was silently skipped - the overlay never even
        # saw the "show" state before it was already overwritten by "hide",
        # so it never appeared at all. Confirmed live 2026-07-21.
        try:
            self.last_seq = json.loads(RELIC_RECOMMEND_STATE_FILE.read_text()).get("seq")
        except (OSError, json.JSONDecodeError):
            self.last_seq = None
        self._hide_source = None
        self._visible_since = None

        self.window = Gtk.Window(type=Gtk.WindowType.TOPLEVEL)
        self.window.set_decorated(False)
        self.window.set_resizable(False)

        setup_overlay_window(self.window)

        from gtk_overlay_drag import enable_drag
        enable_drag(
            self.window,
            None,
            DATA_DIR / "relic-recommend-gtk-position.json",
            {"top": 80, "left": 40},
        )

        css_provider = Gtk.CssProvider()
        css_provider.load_from_data(RELIC_CSS.encode())
        Gtk.StyleContext.add_provider_for_screen(
            self.window.get_screen(), css_provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )

        self.hbox = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=18)
        self.hbox.set_margin_top(12)
        self.hbox.set_margin_bottom(12)
        self.hbox.set_margin_start(16)
        self.hbox.set_margin_end(16)
        self.window.add(self.hbox)
        self.window.set_opacity(0.94)

        # One column per era, each with its own header + row labels -
        # replaces the old single vertical list of up to 8 rows across all
        # eras mixed together.
        self.era_columns = {}
        for era in STANDARD_ERAS:
            col = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
            header = Gtk.Label(label=era)
            header.get_style_context().add_class("era-header")
            era_color = ERA_COLORS.get(era, TEXT)
            header.set_markup(f"<span foreground='{era_color}'>{GLib.markup_escape_text(era)}</span>")
            col.pack_start(header, False, False, 0)

            rows = []
            for _ in range(RELIC_ROWS_PER_ERA):
                row_lbl = Gtk.Label()
                row_lbl.set_use_markup(True)
                row_lbl.set_xalign(0)
                row_lbl.set_line_wrap(True)
                row_lbl.set_max_width_chars(28)
                row_lbl.get_style_context().add_class("relic-row")
                col.pack_start(row_lbl, False, False, 0)
                rows.append(row_lbl)
            self.era_columns[era] = rows

            self.hbox.pack_start(col, False, False, 0)

        GLib.timeout_add(POLL_INTERVAL_MS, self._poll)
        log(f"relic-recommend overlay started, polling {RELIC_RECOMMEND_STATE_FILE}")

    def _poll(self):
        try:
            if RELIC_RECOMMEND_STATE_FILE.exists():
                with open(RELIC_RECOMMEND_STATE_FILE, "r") as f:
                    state = json.load(f)
                seq = state.get("seq")
                if seq != self.last_seq:
                    self.last_seq = seq
                    if state.get("visible"):
                        self._show_relics(state.get("relics_by_era", {}))
                    else:
                        self.window.hide()
                        self._visible_since = None
                        if self._hide_source is not None:
                            GLib.source_remove(self._hide_source)
                            self._hide_source = None
        except Exception as e:
            log(f"relic-recommend poll error: {e}\n{traceback.format_exc()}")
        return True

    def _show_relics(self, relics_by_era):
        if not relics_by_era or not any(relics_by_era.values()):
            self.window.hide()
            return

        total_shown = 0
        for era in STANDARD_ERAS:
            relics = relics_by_era.get(era) or []
            rows = self.era_columns[era]
            for i, row_lbl in enumerate(rows):
                if i < len(relics):
                    r = relics[i]
                    era_color = ERA_COLORS.get(r["era"], TEXT)
                    # Pango markup, not GTK CSS classes - <span class=...>
                    # isn't a thing Pango understands, unlike HTML/Qt's
                    # rich text.
                    markup = (
                        f"<span foreground='{era_color}' weight='bold'>"
                        f"{GLib.markup_escape_text(r['name'])}</span>"
                        f"\nNEED: {r['ev_need']:.1f}p"
                        f" (total {r['ev_total']:.1f}p, owned x{r['owned']})"
                    )
                    # Just the plat value doesn't tell you *why* a relic
                    # needs radiant refinement - showing which specific
                    # parts you're still missing tells you whether it's
                    # worth farming for a rarer part, not just how much
                    # the relic is theoretically worth. need_parts was
                    # already being computed and just never displayed.
                    need_parts = r.get("need_parts") or []
                    if need_parts:
                        parts_text = ", ".join(GLib.markup_escape_text(p) for p in need_parts)
                        markup += f"\n<span size='small' foreground='{OWNED}'>needs: {parts_text}</span>"
                    row_lbl.set_markup(markup)
                    row_lbl.show()
                    total_shown += 1
                else:
                    row_lbl.hide()

        monitor = _target_monitor()

        self.window.show_all()

        # Position AFTER show_all() finalizes real size for this frame's
        # content - see the matching comment in Overlay._show_rewards for
        # why (Kronos's confirmed KWin ConfigureNotify-reorder fix, 647ffd7).
        if monitor is not None:
            move_to_monitor(
                self.window, monitor,
                DATA_DIR / "relic-recommend-gtk-position.json",
                {"top": 80, "left": 40},
            )

        raise_and_keep_on_top(self.window)
        selected_geo = monitor.get_geometry() if monitor is not None else None
        log(f"relic-recommend shown with {total_shown} relics across {len(STANDARD_ERAS)} era columns; "
            f"backend={Gdk.Display.get_default().__class__.__name__} monitor={selected_geo} "
            f"window_pos={self.window.get_position()} size={self.window.get_size()}")

        # The watcher can repeat the same "picker opened" signal while its
        # memory hook reconnects.  Do not let those duplicate states restart
        # the timeout forever: a missed confirm/cancel previously kept this
        # panel mapped across multiple Defense reward rotations.
        if self._visible_since is None:
            self._visible_since = time.monotonic()
            self._hide_source = GLib.timeout_add(RELIC_RECOMMEND_TIMEOUT_MS, self._hide)

    def _hide(self):
        self.window.hide()
        self._hide_source = None
        self._visible_since = None
        return False


def is_available() -> bool:
    """True if gtk-layer-shell is actually usable on this system - callers
    should check this before importing/using the rest of this module for
    real, since the import itself can succeed while still being unusable
    in edge cases (e.g. no Wayland compositor)."""
    return True  # if we got this far, the imports above already succeeded


def _enforce_singleton():
    """Kill any previous overlay_gtk.py instance before starting.

    Needed independently of overlay.py's own singleton lock: overlay.py
    kills the *previous overlay.py process* on restart, but that doesn't
    kill the overlay_gtk.py child it had spawned - subprocess children
    aren't automatically terminated just because their parent died (e.g.
    via SIGTERM without a clean shutdown path). Without this, every
    restart left the old overlay_gtk.py running as an orphan, so they
    accumulated - confirmed live: a `ps aux` after several restarts showed
    an overlay_gtk.py with no overlay.py parent anywhere in the process
    list. This mirrors overlay.py's own pid-file pattern exactly."""
    pid_path = DATA_DIR / "overlay-gtk.pid"
    pid_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        old_pid = int(pid_path.read_text().strip())
        if old_pid != os.getpid():
            try:
                proc = psutil.Process(old_pid)
                # Verify this PID still actually IS an overlay_gtk.py
                # process before signaling it - PIDs get reused by the OS
                # once a process exits, so blindly os.kill()-ing whatever
                # PID happens to be recorded here (this used to do exactly
                # that) can kill a completely unrelated process that
                # happened to reuse this same PID number since the file
                # was written. Jacob 2026-07-24 ("GTK overlay singleton
                # PID files don't check process identity/start time
                # before signaling").
                cmdline = " ".join(proc.cmdline())
                if any(_matches_pattern(part, "overlay_gtk.py") for part in proc.cmdline()):
                    proc.terminate()
                    log(f"killed previous overlay_gtk.py instance (pid {old_pid})")
                    time.sleep(0.3)
                else:
                    log(f"pid {old_pid} in overlay-gtk.pid is no longer overlay_gtk.py "
                        f"(now: {cmdline!r}) - not signaling it")
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except Exception:
        pass
    pid_path.write_text(str(os.getpid()))


def main():
    _enforce_singleton()
    overlay = Overlay()  # noqa: F841 - keep reference alive
    relic_overlay = RelicRecommendOverlay()  # noqa: F841 - keep reference alive
    Gtk.main()


if __name__ == "__main__":
    main()
