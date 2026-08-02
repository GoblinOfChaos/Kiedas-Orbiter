#!/usr/bin/env python3
"""x11_overlay.py - overlay windowing, replicating Cephalon Kronos's actual
mechanism (glowseeker/cephalon-kronos, src-tauri/src/overlay_utils.rs).

BACKGROUND: this project's overlays used gtk-layer-shell (the Wayland
layer-shell protocol) because plain always-on-top window hints failed to
stay above Warframe early in this project's history. A 2026-07-27 attempt
to replace layer-shell with a *shallow* always-on-top approach (GDK's
set_keep_above() alone, no override-redirect, no re-raising) was reverted
the same day after live-testing showed it didn't actually work - the
window landed on the right monitor but never became visible.

Reading Kronos's actual overlay_utils.rs in full (not just skimming its
Cargo.toml, which is all that had been checked before) showed their real
mechanism is considerably heavier than a one-time hint:

1. `override_redirect` on the GDK/X11 window - this detaches it from
   KWin's window management entirely (the same X11 mechanism used for
   tooltips/menus), so KWin's placement/stacking policy never gets a say.
2. Raw Xlib property writes via XChangeProperty (not GDK's higher-level
   wrappers): `_NET_WM_STATE`=ABOVE+STICKY, `_NET_WM_DESKTOP`=all-desktops,
   `_MOTIF_WM_HINTS`=undecorated. `_NET_WM_WINDOW_TYPE` is deliberately
   never set - their comment: KWin "may still apply placement policies...
   fighting our position" for NOTIFICATION/DOCK types.
3. If the window is already mapped when re-shown: unmap -> write all
   properties -> remap, forcing KWin to fully re-evaluate the window's
   layer from scratch rather than adjusting an already-placed window.
4. Geometry set via raw XMoveResizeWindow *while still unmapped*, so the
   X server maps it directly at the right spot instead of letting KWin's
   own default-placement policy run at all; final position re-forced via
   raw XMoveWindow after mapping (their comment: more reliable than GTK's
   own position calls for transparent/ARGB windows).
5. Re-raise (XRaiseWindow) + re-assert always-on-top AFTER any resize
   specifically - their comment: KWin can silently undo a raise in
   response to a resize's ConfigureNotify event if done in the other
   order.
6. A persistent per-window "AOT keeper": a handler on the window's own
   focus-lost event that immediately re-raises + re-asserts always-on-top
   every time it fires. This proves a one-time request doesn't stick -
   something (most likely the game regaining focus) keeps contesting
   stacking order.

Jacob's explicit direction (2026-07-27, after discussing the focus-lost
mechanism's theoretical risk to controller input): try it exactly as
Kronos actually built it, including the focus-accepting AOT keeper,
rather than defensively avoiding that piece. See
project_overlay_windowing_direction.md (assistant memory) for the full
decision record. If this turns out to steal input focus from Warframe
during real play (requiring a re-click into the game), that is the
concrete signal to revisit this - report it plainly, don't route around
it silently.

Requires GDK_BACKEND=x11 to be set via os.environ BEFORE `import gi` in
every process that uses this module - this is an X11/XWayland mechanism
throughout (raw Xlib calls, override-redirect), not a native-Wayland one.

NOT live-verified: this repo's dev sandbox has no working PyGObject/GTK
stack (`gi` resolves to an empty namespace package here), so this is
syntax/logic-checked only, not run against a real window. Needs a real
run on Jacob's machine, specifically checking whether Warframe ever visibly
loses input focus (controller stops responding) while an overlay is shown.
"""
import ctypes
import ctypes.util
import time

import gi
gi.require_version("Gtk", "3.0")
gi.require_version("GdkX11", "3.0")
from gi.repository import Gdk, GdkX11

_libx11 = None


_libgdk = None


def _lib():
    global _libx11
    if _libx11 is None:
        path = ctypes.util.find_library("X11")
        if not path:
            return None
        lib = ctypes.CDLL(path)
        lib.XInternAtom.restype = ctypes.c_ulong
        lib.XInternAtom.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int]
        lib.XChangeProperty.argtypes = [
            ctypes.c_void_p, ctypes.c_ulong, ctypes.c_ulong, ctypes.c_ulong,
            ctypes.c_int, ctypes.c_int, ctypes.c_void_p, ctypes.c_int,
        ]
        lib.XMoveWindow.argtypes = [ctypes.c_void_p, ctypes.c_ulong, ctypes.c_int, ctypes.c_int]
        lib.XMoveResizeWindow.argtypes = [
            ctypes.c_void_p, ctypes.c_ulong, ctypes.c_int, ctypes.c_int,
            ctypes.c_uint, ctypes.c_uint,
        ]
        lib.XRaiseWindow.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
        lib.XUnmapWindow.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
        lib.XMapWindow.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
        lib.XSync.argtypes = [ctypes.c_void_p, ctypes.c_int]
        lib.XFlush.argtypes = [ctypes.c_void_p]
        _libx11 = lib
    return _libx11


def _gdk_lib():
    """libgdk-3, used to call gdk_x11_get_default_xdisplay() as a raw C
    function instead of through PyGObject's GdkX11.X11Display.get_xdisplay()
    binding. LIVE BUG FOUND 2026-07-27: that binding does not return a
    plain Python int/pointer-castable value in this environment -
    `ctypes.c_void_p(xdisplay)` raised "TypeError: cannot be converted to
    pointer" on the very first live test. Calling the C function directly
    (restype explicitly set to c_void_p) sidesteps whatever PyGObject's
    introspection marshalling was doing to that return value - this is
    also what Kronos's own Rust code does (gdkx11::ffi::
    gdk_x11_get_default_xdisplay(), a raw FFI call, not a higher-level
    binding method)."""
    global _libgdk
    if _libgdk is None:
        path = (
            ctypes.util.find_library("gdk-3")
            or "libgdk-3.so.0"
        )
        try:
            lib = ctypes.CDLL(path)
        except OSError:
            return None
        lib.gdk_x11_get_default_xdisplay.restype = ctypes.c_void_p
        lib.gdk_x11_get_default_xdisplay.argtypes = []
        _libgdk = lib
    return _libgdk


def _get_x11_ids(window):
    """Returns (xdisplay_ptr, xid) for a realized GTK window, or None if
    this isn't actually an X11/XWayland window (e.g. GDK_BACKEND wasn't
    honored, or no display)."""
    window.realize()
    gdk_win = window.get_window()
    if gdk_win is None:
        return None
    display = Gdk.Display.get_default()
    if not isinstance(display, GdkX11.X11Display):
        return None
    try:
        xid = gdk_win.get_xid()
    except AttributeError:
        return None
    gdklib = _gdk_lib()
    if gdklib is None:
        return None
    xdisplay = gdklib.gdk_x11_get_default_xdisplay()
    if not xdisplay:
        return None
    return (xdisplay, xid)


def _apply_overlay_hints(window, xdisplay, xid, already_mapped, pos=None):
    """Direct Xlib port of Kronos's apply_x11_overlay_hints(), with one
    deliberate deviation: the unmap/remap step uses GTK's own
    window.hide()/window.show() instead of raw XUnmapWindow/XMapWindow.
    GTK's own documentation is explicit that gdk_window_show() "also
    updates internal GDK state, which means that you can't really use
    XMapWindow() directly on a GDK window" - using the raw Xlib calls here
    (as Kronos's Rust/Tauri code does) would desync GTK3/PyGObject's own
    mapped-state tracking (window.get_mapped()) from the real X server
    state. The property writes below (not something GDK tracks state for)
    still go straight through Xlib, matching Kronos exactly.

    pos, if given, is (x, y, width, height) applied via XMoveResizeWindow
    while the window is still unmapped, so the X server maps it at the
    right spot instead of KWin's own default placement running at all."""
    lib = _lib()
    if lib is None:
        return
    xa_atom = 4
    xa_cardinal = 6
    prop_replace = 0
    xd = ctypes.c_void_p(xdisplay)

    if already_mapped:
        window.hide()

    # _NET_WM_WINDOW_TYPE intentionally omitted - see module docstring.

    wm_state = lib.XInternAtom(xd, b"_NET_WM_STATE", 0)
    state_above = lib.XInternAtom(xd, b"_NET_WM_STATE_ABOVE", 0)
    state_sticky = lib.XInternAtom(xd, b"_NET_WM_STATE_STICKY", 0)
    states = (ctypes.c_ulong * 2)(state_above, state_sticky)
    lib.XChangeProperty(xd, xid, wm_state, xa_atom, 32, prop_replace, states, 2)

    wm_desktop = lib.XInternAtom(xd, b"_NET_WM_DESKTOP", 0)
    all_desktops = ctypes.c_ulong(0xFFFFFFFF)
    lib.XChangeProperty(xd, xid, wm_desktop, xa_cardinal, 32, prop_replace,
                         ctypes.byref(all_desktops), 1)

    motif_hints = lib.XInternAtom(xd, b"_MOTIF_WM_HINTS", 0)
    mwm_hints = (ctypes.c_ulong * 5)(2, 0, 0, 0, 0)
    lib.XChangeProperty(xd, xid, motif_hints, motif_hints, 32, prop_replace, mwm_hints, 5)

    if pos is not None:
        px, py, pw, ph = pos
        lib.XMoveResizeWindow(xd, xid, int(px), int(py), max(1, int(pw)), max(1, int(ph)))

    lib.XSync(xd, 0)

    if already_mapped:
        window.show()
        lib.XSync(xd, 0)


def _raise_x11(window):
    ids = _get_x11_ids(window)
    if ids is None:
        return
    xdisplay, xid = ids
    lib = _lib()
    if lib is None:
        return
    xd = ctypes.c_void_p(xdisplay)
    lib.XRaiseWindow(xd, xid)
    lib.XFlush(xd)


def _force_position_x11(window, x, y):
    ids = _get_x11_ids(window)
    if ids is None:
        return
    xdisplay, xid = ids
    lib = _lib()
    if lib is None:
        return
    xd = ctypes.c_void_p(xdisplay)
    lib.XMoveWindow(xd, xid, int(x), int(y))
    lib.XFlush(xd)


def _reassert_on_top(window):
    """The actual re-raise + re-assert-always-on-top step Kronos's AOT
    keeper performs on every focus-lost event, and that show()/resize call
    sites also perform after any resize."""
    _raise_x11(window)
    try:
        window.set_keep_above(True)
    except Exception:
        pass


def setup_overlay_window(window):
    """One-time setup for a newly-constructed overlay window: caller
    should already have called set_decorated(False)/set_resizable(False).
    Applies override-redirect (detaches from KWin's window management
    entirely) and installs the persistent focus-lost "AOT keeper" that
    re-raises the window every time it loses focus - Kronos's own code
    proves a one-time always-on-top request doesn't reliably stick under
    KWin, something keeps contesting stacking order."""
    window.realize()
    gdk_win = window.get_window()
    if gdk_win is not None:
        try:
            gdk_win.set_override_redirect(True)
        except Exception:
            pass
    window.connect("focus-out-event", lambda w, e: (_reassert_on_top(w), False)[1])


def show_at(window, x, y, width=None, height=None):
    """Show (or re-show) `window` at absolute screen coordinates (x, y),
    running Kronos's full per-show hint sequence: apply X11 hints (unmap/
    set-props/remap if already mapped), map if not yet mapped, force final
    position, then raise + re-assert always-on-top - in that order, since
    Kronos's own comment says doing the raise before a resize lets KWin's
    stacking policy undo it on the resulting ConfigureNotify."""
    was_mapped = window.get_mapped()
    ids = _get_x11_ids(window)
    if ids is not None:
        xdisplay, xid = ids
        pos = (x, y, width, height) if (width and height) else None
        _apply_overlay_hints(window, xdisplay, xid, was_mapped, pos)

    if not was_mapped:
        window.show_all()
        if ids is not None:
            lib = _lib()
            if lib is not None:
                lib.XSync(ctypes.c_void_p(ids[0]), 0)
        time.sleep(0.05)  # let KWin finish MapNotify processing before forcing position
    else:
        window.show_all()

    _force_position_x11(window, x, y)
    _reassert_on_top(window)


def apply_position(window, x, y):
    """Apply X11 hints (unmap/set-props/remap if already mapped) and force
    the window to absolute screen coordinates (x, y), WITHOUT calling
    show_all() or the post-show raise. For callers that build widget
    content across several steps before their own final show_all() -
    call raise_and_keep_on_top() after that show_all() to complete the
    sequence, matching Kronos's "raise AFTER resize" ordering."""
    was_mapped = window.get_mapped()
    ids = _get_x11_ids(window)
    if ids is not None:
        xdisplay, xid = ids
        _apply_overlay_hints(window, xdisplay, xid, was_mapped, None)
    _force_position_x11(window, x, y)


def raise_and_keep_on_top(window):
    """Re-raise + re-assert always-on-top - call this AFTER your own
    show_all()/resize, per Kronos's finding that KWin can silently undo a
    raise done before a resize's ConfigureNotify event."""
    _reassert_on_top(window)


def monitor_origin(monitor):
    """Returns (x, y) of the monitor's top-left corner in absolute screen
    coordinates, or (0, 0) if monitor is None."""
    if monitor is None:
        _log_monitor_debug("monitor_origin() called with monitor=None -> (0, 0)")
        return (0, 0)
    geo = monitor.get_geometry()
    _log_monitor_debug(f"monitor_origin() -> ({geo.x}, {geo.y}) from geometry {geo.x},{geo.y},{geo.width},{geo.height}")
    return (geo.x, geo.y)


def _log_monitor_debug(msg):
    # Plain stderr print, not a proper logger - each overlay's launcher
    # already redirects stderr into that overlay's own log file (confirmed
    # by DeprecationWarning lines already showing up there), so this needs
    # no wiring to the callers' own log() functions. Diagnostic-only, added
    # 2026-07-27 to pin down exactly where monitor-origin resolution goes
    # wrong before attempting a fix - see project_overlay_windowing_direction
    # memory / TODO.md for context.
    import sys
    print(f"[x11_overlay debug] {msg}", file=sys.stderr, flush=True)


def target_monitor(display, configured_monitor, warframe_geom=None):
    """Match physical detector geometry to native or scaled GDK monitors."""
    if display is None or display.get_n_monitors() == 0:
        _log_monitor_debug(f"no display or zero monitors (display={display})")
        return None
    count = display.get_n_monitors()
    all_geoms = []
    for i in range(count):
        m = display.get_monitor(i)
        g = m.get_geometry()
        all_geoms.append((i, g.x, g.y, g.width, g.height, m.get_scale_factor()))
    _log_monitor_debug(
        f"configured_monitor={configured_monitor!r} warframe_geom={warframe_geom!r} "
        f"n_monitors={count} monitors(idx,x,y,w,h,scale)={all_geoms}"
    )
    if configured_monitor != "auto":
        try:
            index = int(configured_monitor)
            if 0 <= index < count:
                chosen = display.get_monitor(index)
                _log_monitor_debug(f"using configured index {index} -> {chosen.get_geometry()}")
                return chosen
        except (TypeError, ValueError):
            pass
    if warframe_geom:
        x = int(warframe_geom.get("x", 0))
        y = int(warframe_geom.get("y", 0))
        width = int(warframe_geom.get("width", 0))
        height = int(warframe_geom.get("height", 0))
        center_x, center_y = x + width // 2, y + height // 2
        _log_monitor_debug(f"warframe center=({center_x},{center_y})")
        monitors = [display.get_monitor(i) for i in range(count)]
        for i, monitor in enumerate(monitors):
            geo = monitor.get_geometry()
            if geo.x <= center_x < geo.x + geo.width and geo.y <= center_y < geo.y + geo.height:
                _log_monitor_debug(f"matched monitor {i} by plain containment -> {geo.x},{geo.y},{geo.width},{geo.height}")
                return monitor
        for i, monitor in enumerate(monitors):
            geo = monitor.get_geometry()
            scale = max(1, int(monitor.get_scale_factor()))
            if (geo.x * scale <= center_x < (geo.x + geo.width) * scale
                    and geo.y * scale <= center_y < (geo.y + geo.height) * scale):
                _log_monitor_debug(f"matched monitor {i} by scaled containment (scale={scale}) -> {geo.x},{geo.y},{geo.width},{geo.height}")
                return monitor
        size_matches = []
        for i, monitor in enumerate(monitors):
            geo = monitor.get_geometry()
            scale = max(1, int(monitor.get_scale_factor()))
            if geo.width * scale == width and geo.height * scale == height:
                size_matches.append((i, monitor))
        if len(size_matches) == 1:
            i, monitor = size_matches[0]
            _log_monitor_debug(f"matched monitor {i} by unique size match -> {monitor.get_geometry()}")
            return monitor
        _log_monitor_debug("no containment/size match found, falling back to primary/monitor(0)")
    fallback = display.get_primary_monitor() or display.get_monitor(0)
    if fallback is not None:
        fg = fallback.get_geometry()
        _log_monitor_debug(f"fallback monitor -> {fg.x},{fg.y},{fg.width},{fg.height}")
    return fallback


def move_to_monitor(window, monitor, position_file, default_position):
    """Select `monitor` for `window` and show/move it to whatever (left,
    top) offset gtk_overlay_drag.py last persisted to `position_file` (or
    `default_position` if there's no saved position yet)."""
    import json
    try:
        pos = json.loads(position_file.read_text())
        left = pos.get("left", default_position.get("left", 0))
        top = pos.get("top", default_position.get("top", 0))
    except Exception:
        left = default_position.get("left", 0)
        top = default_position.get("top", 0)
    mx, my = monitor_origin(monitor)
    show_at(window, mx + int(left), my + int(top))
