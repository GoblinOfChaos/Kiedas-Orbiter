use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, WebviewWindow};

use active_win_pos_rs;

static AOT_KEEPER_INSTALLED: Mutex<Vec<String>> = Mutex::new(Vec::new());

pub(crate) static SIDEBAR_TOGGLING: AtomicBool = AtomicBool::new(false);

pub fn get_overlay_monitor(app_handle: &AppHandle, label: &str) -> Result<tauri::Monitor, String> {
    let state = app_handle.state::<crate::AppState>();
    let target_idx = *state.target_monitor.lock().unwrap();

    let main_window = app_handle
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    let monitors = main_window
        .available_monitors()
        .map_err(|e| e.to_string())?;

    eprintln!("[OVERLAY] get_overlay_monitor: target_idx={:?} label={} monitors={}", target_idx, label, monitors.len());

    if let Some(idx) = target_idx {
        if idx < monitors.len() {
            return Ok(monitors[idx].clone());
        }
    }

    let is_notification = matches!(label, "overlay-tl" | "overlay-tr" | "overlay-tc");

    if is_notification {
        if let Ok(mon) = get_focused_monitor(app_handle) {
            return Ok(mon);
        }
        main_window
            .primary_monitor()
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "no monitor found".to_string())
    } else {
        main_window
            .current_monitor()
            .map_err(|e| e.to_string())?
            .or_else(|| main_window.primary_monitor().ok().flatten())
            .ok_or_else(|| "no monitor found".to_string())
    }
}

fn get_focused_monitor(app_handle: &AppHandle) -> Result<tauri::Monitor, String> {
    let main_window = app_handle
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    if let Ok(active) = active_win_pos_rs::get_active_window() {
        let cx = active.position.x as i32 + active.position.width as i32 / 2;
        let cy = active.position.y as i32 + active.position.height as i32 / 2;

        let monitors = main_window
            .available_monitors()
            .map_err(|e| e.to_string())?;

        for mon in &monitors {
            let pos = mon.position();
            let size = mon.size();
            if cx >= pos.x && cx < pos.x + size.width as i32 &&
               cy >= pos.y && cy < pos.y + size.height as i32
            {
                return Ok(mon.clone());
            }
        }
    }

    Err("could not determine focused monitor".to_string())
}

fn calculate_position(
    label: &str,
    monitor: &tauri::Monitor,
    width: f64,
    height: f64,
) -> PhysicalPosition<i32> {
    let mon_pos = monitor.position();
    let mon_size = monitor.size();
    let scale = monitor.scale_factor();
    let margin = (16.0 * scale) as i32;
    let phys_w = (width * scale) as i32;

    let (lx, ly) = match label {
        "overlay-tl" => (margin, margin),
        "overlay-tc" => ((mon_size.width as i32 - phys_w) / 2, margin),
        "overlay-relic" => {
            let rx = (mon_size.width as i32 - phys_w) / 2;
            let ry = (mon_size.height as i32 - (height * scale) as i32 - (40.0 * scale) as i32).max(0);
            (rx, ry)
        }
        "overlay-relic-picker" => {
            let rx = mon_size.width as i32 - phys_w - margin;
            let ry = (mon_size.height as i32 - (height * scale) as i32) / 2;
            (rx, ry)
        }
        "overlay-riven-current" => (margin, (mon_size.height as i32 - (height * scale) as i32) / 2),
        "overlay-riven-new" => (
            mon_size.width as i32 - phys_w - margin,
            (mon_size.height as i32 - (height * scale) as i32) / 2,
        ),
        _ => (mon_size.width as i32 - phys_w - margin, margin),
    };

    PhysicalPosition {
        x: mon_pos.x + lx,
        y: mon_pos.y + ly,
    }
}

#[allow(unused_variables)]
fn apply_platform_patches(window: &WebviewWindow) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if let Ok(ns_window) = window.ns_window() {
            let id = ns_window as cocoa::base::id;
            unsafe {
                cocoa::appkit::NSWindow::setLevel_(id, 1000);
                cocoa::appkit::NSWindow::setCollectionBehavior_(
                    id,
                    cocoa::appkit::NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
                        | cocoa::appkit::NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary,
                );
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        use std::mem::transmute;
        if let Ok(hwnd) = window.hwnd() {
            let hwnd_ptr: *mut std::ffi::c_void = unsafe { transmute(hwnd) };
            unsafe {
                #[link(name = "user32")]
                extern "system" {
                    fn GetWindowLongW(hWnd: *mut std::ffi::c_void, nIndex: i32) -> i32;
                    fn SetWindowLongW(hWnd: *mut std::ffi::c_void, nIndex: i32, dwNewLong: i32) -> i32;
                }
                const GWL_EXSTYLE: i32 = -20;
                const WS_EX_NOACTIVATE: i32 = 0x08000000;
                let ex_style = GetWindowLongW(hwnd_ptr, GWL_EXSTYLE);
                SetWindowLongW(hwnd_ptr, GWL_EXSTYLE, ex_style | WS_EX_NOACTIVATE);
            }
        }
    }

    Ok(())
}

// ── Linux X11 low-level helpers ───────────────────────────────────────────────

#[cfg(target_os = "linux")]
#[link(name = "X11")]
extern "C" {
    fn XMoveWindow(display: *mut std::ffi::c_void, w: u64, x: i32, y: i32) -> i32;
    fn XMoveResizeWindow(display: *mut std::ffi::c_void, w: u64, x: i32, y: i32, width: u32, height: u32) -> i32;
    fn XRaiseWindow(display: *mut std::ffi::c_void, w: u64) -> i32;
    fn XLowerWindow(display: *mut std::ffi::c_void, w: u64) -> i32;
    fn XFlush(display: *mut std::ffi::c_void) -> i32;
    fn XSync(display: *mut std::ffi::c_void, discard: i32) -> i32;
    fn XUnmapWindow(display: *mut std::ffi::c_void, w: u64) -> i32;
    fn XMapWindow(display: *mut std::ffi::c_void, w: u64) -> i32;
    fn XDeleteProperty(display: *mut std::ffi::c_void, w: u64, property: u64) -> i32;
    fn XInternAtom(display: *mut std::ffi::c_void, name: *const i8, only_if_exists: i32) -> u64;
    fn XChangeProperty(
        display: *mut std::ffi::c_void,
        w: u64,
        property: u64,
        typ: u64,
        format: i32,
        mode: i32,
        data: *const u8,
        nelements: i32,
    ) -> i32;
    fn XGetInputFocus(display: *mut std::ffi::c_void, focus_return: *mut u64, revert_to_return: *mut i32) -> i32;
    fn XSetInputFocus(display: *mut std::ffi::c_void, focus: u64, revert_to: i32, time: u64) -> i32;
    fn XChangeWindowAttributes(
        display: *mut std::ffi::c_void,
        w: u64,
        valuemask: u64,
        attributes: *const u32,
    ) -> i32;
    fn XQueryTree(
        display: *mut std::ffi::c_void,
        w: u64,
        root_return: *mut u64,
        parent_return: *mut u64,
        children_return: *mut *mut u64,
        nchildren_return: *mut u32,
    ) -> i32;
    fn XFree(data: *mut std::ffi::c_void) -> i32;
}

#[cfg(target_os = "linux")]
#[repr(C)]
struct XSetWindowAttributes {
    background_pixmap: u64,
    background_pixel: u64,
    border_pixmap: u64,
    border_pixel: u64,
    bit_gravity: i32,
    win_gravity: i32,
    backing_store: i32,
    backing_planes: u64,
    backing_pixel: u64,
    save_under: i32,
    event_mask: i64,
    do_not_propagate_mask: i64,
    override_redirect: i32,
    colormap: u64,
    cursor: u64,
}

/// Walk up the window tree to find the top-level child of root.
/// XGetInputFocus can return an input-only child window (Wine does this);
/// XSetInputFocus on a non-viewable child = BadMatch.
///
/// Safety: caller must ensure xid > 1 (not None/PointerRoot) and that the
/// window was recently alive.  We cap iterations to 32 to guard against
/// degenerate trees and bail immediately if XQueryTree returns 0 (BadWindow).
#[cfg(target_os = "linux")]
unsafe fn get_toplevel_xid(xdisplay: *mut std::ffi::c_void, xid: u64) -> u64 {
    // PointerRoot (1) and None (0) are not real windows.
    if xid <= 1 { return xid; }

    let mut root: u64 = 0;
    let mut parent: u64 = xid;
    let mut current: u64 = xid;
    let mut children: *mut u64 = std::ptr::null_mut();
    let mut nchildren: u32 = 0;

    for _ in 0..32 {
        let ok = XQueryTree(xdisplay, current,
            &mut root, &mut parent, &mut children, &mut nchildren);
        if !children.is_null() { XFree(children as *mut _); children = std::ptr::null_mut(); }
        // ok == 0 means BadWindow (or other X error) — bail safely.
        if ok == 0 || parent == root || parent == 0 { break; }
        current = parent;
    }
    eprintln!("[X11] get_toplevel_xid: {} -> {}", xid, current);
    current
}

#[cfg(target_os = "linux")]
fn get_x11_ids(window: &WebviewWindow) -> Option<(*mut std::ffi::c_void, u64)> {
    use gtk::prelude::*;
    let gtk_window = window.gtk_window().ok()?;
    gtk_window.realize();
    let gdk_window = gtk_window.window()?;
    let x11_window = gdk_window.downcast::<gdkx11::X11Window>().ok()?;
    let xid = x11_window.xid();
    let xdisplay = unsafe { gdkx11::ffi::gdk_x11_get_default_xdisplay() };
    if xdisplay.is_null() { return None; }
    Some((xdisplay as *mut std::ffi::c_void, xid))
}

/// Set window type and layer hints for above-fullscreen rendering on KWin.
///
/// KWin's layer stack (bottom → top):
///   Desktop → Below → Normal → Above → Fullscreen → Dock → Notification → OnScreenDisplay → Critical
///
/// We use _KDE_NET_WM_WINDOW_TYPE_ON_SCREEN_DISPLAY (KDE extension) as the
/// primary type - this is the highest non-critical layer, above fullscreen apps.
/// OSD is what KDE itself uses for volume sliders, brightness popups, etc.
///
/// CRITICAL: KWin re-evaluates a window's layer only when the window is
/// unmapped and remapped. Setting the atom on an already-mapped window does
/// nothing. The sequence must be:
///   unmap → XSync → set atom → XSync → remap
///
/// This is called BEFORE the first show() from Tauri, so Tauri's show() acts
/// as the remap. On subsequent calls (resize), we do the unmap/remap ourselves.
#[cfg(target_os = "linux")]
fn apply_x11_overlay_hints(xdisplay: *mut std::ffi::c_void, xid: u64, already_mapped: bool,
    pos: Option<(i32, i32, u32, u32)>) {
    unsafe {
        let xa_atom: u64 = 4;
        let xa_cardinal: u64 = 6;
        let prop_replace: i32 = 0;

        // If already mapped, unmap so KWin re-evaluates the layer on remap
        if already_mapped {
            XUnmapWindow(xdisplay, xid);
            XSync(xdisplay, 0);
        }

        // _NET_WM_WINDOW_TYPE intentionally omitted — despite override_redirect
        // KWin may still apply placement policies for NOTIFICATION/DOCK types
        // at remap time, fighting our position.  override_redirect alone is
        // sufficient for the WM to leave us alone.

        // _NET_WM_STATE: ABOVE + STICKY
        let wm_state = XInternAtom(xdisplay, b"_NET_WM_STATE\0".as_ptr() as *const i8, 0);
        let state_above = XInternAtom(xdisplay, b"_NET_WM_STATE_ABOVE\0".as_ptr() as *const i8, 0);
        let state_sticky = XInternAtom(xdisplay, b"_NET_WM_STATE_STICKY\0".as_ptr() as *const i8, 0);
        let states: [u64; 2] = [state_above, state_sticky];
        XChangeProperty(xdisplay, xid, wm_state, xa_atom, 32, prop_replace,
            states.as_ptr() as *const u8, 2);

        // _NET_WM_DESKTOP = 0xFFFFFFFF: sticky, visible on all virtual desktops.
        // Survives Super+D (Show Desktop) in KWin.
        let wm_desktop = XInternAtom(xdisplay, b"_NET_WM_DESKTOP\0".as_ptr() as *const i8, 0);
        let all_desktops: u64 = 0xFFFFFFFF;
        XChangeProperty(xdisplay, xid, wm_desktop, xa_cardinal, 32, prop_replace,
            &all_desktops as *const u64 as *const u8, 1);

        // _NET_WM_BYPASS_COMPOSITOR = 1: don't let compositor sandwich this
        // window behind a fullscreen app's compositing layer.
        let bypass = XInternAtom(xdisplay, b"_NET_WM_BYPASS_COMPOSITOR\0".as_ptr() as *const i8, 0);
        let bypass_val: u64 = 1;
        XChangeProperty(xdisplay, xid, bypass, xa_cardinal, 32, prop_replace,
            &bypass_val as *const u64 as *const u8, 1);

        // _MOTIF_WM_HINTS: tell KWin to skip its "Center New Windows" placement
        // policy by removing decorations (flags=2, decorations=0).
        let motif_hints = XInternAtom(xdisplay, b"_MOTIF_WM_HINTS\0".as_ptr() as *const i8, 0);
        let mwm_hints: [u64; 5] = [2, 0, 0, 0, 0];
        XChangeProperty(xdisplay, xid, motif_hints, motif_hints, 32, prop_replace,
            mwm_hints.as_ptr() as *const u8, 5);

        XSync(xdisplay, 0);

        // Set geometry while still unmapped so the X server maps at our
        // position and the WM never applies its own default placement.
        if let Some((px, py, pw, ph)) = pos {
            XMoveResizeWindow(xdisplay, xid, px, py, pw, ph);
        }
        XSync(xdisplay, 0);

        if already_mapped {
            XMapWindow(xdisplay, xid);
            XSync(xdisplay, 0);
            // No post-map X11 force-position here — the caller (enter_sidebar_mode)
            // issues Tauri set_min_size + set_size + set_position immediately after,
            // which updates GDK's internal state so GTK doesn't get confused by
            // raw X11 moves performed behind its back.
        }

        eprintln!("[OVERLAY] apply_x11_overlay_hints: XID={} already_mapped={} -> NOTIFICATION|DOCK|UTILITY + ABOVE|STICKY + DESKTOP=0xFFFFFFFF + BYPASS_COMPOSITOR", xid, already_mapped);
    }
}

#[cfg(target_os = "linux")]
fn raise_x11(window: &WebviewWindow) {
    let (xdisplay, xid) = match get_x11_ids(window) {
        Some(ids) => ids,
        None => return,
    };
    unsafe {
        XRaiseWindow(xdisplay, xid);
        XFlush(xdisplay);
    }
}

#[cfg(target_os = "linux")]
fn force_position_x11(window: &WebviewWindow, x: i32, y: i32) {
    let (xdisplay, xid) = match get_x11_ids(window) {
        Some(ids) => ids,
        None => return,
    };
    unsafe {
        XMoveWindow(xdisplay, xid, x, y);
        XFlush(xdisplay);
        eprintln!("[OVERLAY] force_position_x11: XID={} -> ({},{})", xid, x, y);
    }
}

#[cfg(target_os = "linux")]
fn install_deiconify_handler(window: &WebviewWindow) {
    use gtk::prelude::*;
    let gtk_window = match window.gtk_window() {
        Ok(w) => w,
        Err(_) => return,
    };
    gtk_window.realize();
    gtk_window.connect_window_state_event(|win, event| {
        if event.new_window_state().contains(gtk::gdk::WindowState::ICONIFIED) {
            eprintln!("[OVERLAY] deiconify: was iconified, restoring");
            win.deiconify();
            win.show();
        }
        gtk::glib::Propagation::Proceed
    });
}

#[cfg(target_os = "linux")]
fn set_transient_for(window: &WebviewWindow, parent: &WebviewWindow) {
    use gtk::prelude::*;
    if let (Ok(gtk_window), Ok(gtk_parent)) = (window.gtk_window(), parent.gtk_window()) {
        gtk_window.set_transient_for(Some(&gtk_parent));
    }
}

fn force_position_tauri(window: &WebviewWindow, x: i32, y: i32) -> Result<(), String> {
    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }))
        .map_err(|e| format!("set_position({x},{y}) failed: {e}"))
}

// ── Public API ────────────────────────────────────────────────────────────────

pub fn show_window_internal(app_handle: &AppHandle, label: &str) -> Result<(), String> {
    eprintln!("[OVERLAY] show_window_internal: '{}'", label);

    let window = app_handle
        .get_webview_window(label)
        .ok_or_else(|| format!("window '{}' not found", label))?;


    #[cfg_attr(target_os = "linux", allow(unused_variables))]
    let already_visible = window.is_visible().unwrap_or(false);

    // Install AOT keeper once per window
    {
        let mut installed = AOT_KEEPER_INSTALLED.lock().unwrap();
        if !installed.contains(&label.to_string()) {
            let w = window.clone();
            let label_owned = label.to_string();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Focused(focused) = event {
                    if !focused {
                        eprintln!("[OVERLAY] AOT keeper: '{}' lost focus", label_owned);
                        let _ = w.set_always_on_top(true);
                        #[cfg(target_os = "linux")]
                        raise_x11(&w);
                    }
                }
            });
            installed.push(label.to_string());
        }
    }

    let monitor = get_overlay_monitor(app_handle, label)?;
    let (w, h) = overlay_size(label);
    let pos = calculate_position(label, &monitor, w, h);

    eprintln!("[OVERLAY] target pos=({},{})", pos.x, pos.y);

    #[cfg(target_os = "linux")]
    #[allow(unused_assignments)]
    let mut main_had_focus = false;

    #[cfg(not(target_os = "linux"))]
    let main_had_focus = false;

    #[cfg(target_os = "linux")]
    {
        let was_visible = window.is_visible().unwrap_or(false);

        // Keep track of which window had focus before we show the overlay
        main_had_focus = app_handle.get_webview_window("main")
            .and_then(|w| w.is_focused().ok())
            .unwrap_or(false);

        // Transient for main window so WM always stacks overlay above it.
        // Only for notification overlays - relic/riven overlays should not
        // bring the main window to the foreground when shown.
        let is_notification = matches!(label, "overlay-tl" | "overlay-tr" | "overlay-tc");
        if is_notification {
            if let Some(main_win) = app_handle.get_webview_window("main") {
                set_transient_for(&window, &main_win);
            }
        }

        // --- Override Redirect ---
        // Detach from KWin's placement policy so it cannot center the window.
        use gtk::prelude::*;
        if let Ok(gtk_win) = window.gtk_window() {
            gtk_win.realize();
            if let Some(gdk_win) = gtk_win.window() {
                gdk_win.set_override_redirect(true);
            }
        }

        if let Some((xdisplay, xid)) = get_x11_ids(&window) {
            apply_x11_overlay_hints(xdisplay, xid, was_visible, None);
        }

        // Set position before show for Wayland/first-map hint
        let _ = force_position_tauri(&window, pos.x, pos.y);

        if !was_visible {
            // First show: Tauri's show() acts as the XMapWindow
            window.show().map_err(|e| format!("show() failed: {e}"))?;
            // Let KWin finish any MapNotify processing before we force the
            // position - the XSync + sleep window ensures our move wins.
            unsafe {
                if let Some((xdisplay, _)) = get_x11_ids(&window) {
                    XSync(xdisplay, 0);
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
        // If was_visible, apply_x11_overlay_hints already did unmap+remap

        // Override position via XMoveWindow (more reliable than GTK for ARGB windows)
        force_position_x11(&window, pos.x, pos.y);
        raise_x11(&window);
        install_deiconify_handler(&window);
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = force_position_tauri(&window, pos.x, pos.y);
        if !already_visible {
            window.show().map_err(|e| format!("show() failed: {e}"))?;
        }
    }

    window.set_always_on_top(true)
        .map_err(|e| format!("set_always_on_top failed: {e}"))?;
    window.set_ignore_cursor_events(true)
        .map_err(|e| format!("set_ignore_cursor_events failed: {e}"))?;
    window.set_skip_taskbar(true)
        .map_err(|e| format!("set_skip_taskbar failed: {e}"))?;

    apply_platform_patches(&window)?;

    // Restore main window focus if it was focused before showing overlay
    if main_had_focus {
        if let Some(main_win) = app_handle.get_webview_window("main") {
            let _ = main_win.set_focus();
        }
    }

    let pos_after = window.outer_position()
        .map(|p| format!("({},{})", p.x, p.y))
        .unwrap_or("ERR".into());
    let visible = window.is_visible().unwrap_or(false);
    eprintln!("[OVERLAY] FINAL '{}': pos={} visible={}", label, pos_after, visible);

    Ok(())
}

// ── Sidebar (one-window overlay transform) ────────────────────────────────────

/// Force an atomic X11 move+resize, bypassing GTK's deferred configure.
#[cfg(target_os = "linux")]
#[allow(dead_code)]
fn force_move_resize_x11(window: &WebviewWindow, x: i32, y: i32, width: u32, height: u32) {
    let (xdisplay, xid) = match get_x11_ids(window) {
        Some(ids) => ids,
        None => return,
    };
    unsafe {
        XMoveResizeWindow(xdisplay, xid, x, y, width, height);
        XSync(xdisplay, 0);
        eprintln!("[SIDEBAR] force_move_resize_x11: XID={} -> ({},{}) {}x{}", xid, x, y, width, height);
    }
}

/// Clear the window-type/state atoms set by apply_x11_overlay_hints so the
/// window behaves as a normal managed window again on restore.
///
/// IMPORTANT: This function leaves the window *unmapped* after clearing the
/// atoms.  The caller is responsible for remapping via Tauri's window.show()
/// so that GDK's internal window state stays consistent with the X11 state.
/// Previously we called XMapWindow here, but that caused GDK to hold stale
/// references to the child X11 window — on the next sidebar enter, GDK's
/// gtk_window.window() would reference an invalidated X11 window → BadWindow.
#[cfg(target_os = "linux")]
pub fn sidebar_clear_x11_hints(window: &WebviewWindow) {
    eprintln!("[SIDEBAR-EXIT] clear_x11_hints start");
    let ids = get_x11_ids(window);
    let (xdisplay, xid) = match ids {
        Some(ids) => ids,
        None => { eprintln!("[SIDEBAR-EXIT] clear_x11_hints EARLY RETURN"); return; }
    };
    unsafe {
        let prop_replace: i32 = 0;
        XUnmapWindow(xdisplay, xid);
        XSync(xdisplay, 0);

        // Clear override_redirect at X11 level before remap so KWin
        // manages the window normally again.
        const CW_OVERRIDE_REDIRECT: u64 = 1 << 9;
        let mut attrs: XSetWindowAttributes = std::mem::zeroed();
        attrs.override_redirect = 0;
        XChangeWindowAttributes(xdisplay, xid,
            CW_OVERRIDE_REDIRECT,
            &attrs as *const XSetWindowAttributes as *const u32);
        XSync(xdisplay, 0);

        let wm_type = XInternAtom(xdisplay, b"_NET_WM_WINDOW_TYPE\0".as_ptr() as *const i8, 0);
        let normal = XInternAtom(xdisplay, b"_NET_WM_WINDOW_TYPE_NORMAL\0".as_ptr() as *const i8, 0);
        XChangeProperty(xdisplay, xid, wm_type, 4 /* XA_ATOM */, 32, prop_replace,
            &normal as *const u64 as *const u8, 1);
        let wm_state = XInternAtom(xdisplay, b"_NET_WM_STATE\0".as_ptr() as *const i8, 0);
        XDeleteProperty(xdisplay, xid, wm_state);
        XSync(xdisplay, 0);
        let wm_user_time = XInternAtom(xdisplay, b"_NET_WM_USER_TIME\0".as_ptr() as *const i8, 0);
        let cardinal = XInternAtom(xdisplay, b"CARDINAL\0".as_ptr() as *const i8, 0);
        let user_time: u32 = 0;
        XChangeProperty(xdisplay, xid, wm_user_time, cardinal, 32, prop_replace, &user_time as *const u32 as *const u8, 1);

        // NOTE: We intentionally do NOT call XMapWindow here.
        // The window is left unmapped so GDK's state matches reality.
        // The EXIT closure in toggle_sidebar calls window.show() through
        // Tauri so that GDK re-maps the window with a clean internal state.
        XSync(xdisplay, 0);
        eprintln!("[SIDEBAR-EXIT] clear_x11_hints DONE (window left unmapped for GDK)");
    }
}

/// Force an XMoveResizeWindow + XMapWindow on the sidebar window, restoring
/// geometry in the same raw X11 batch as the map.  This is a fallback for when
/// GDK's gtk_widget_show() early-returns because it doesn't know about a raw
/// XUnmapWindow performed by sidebar_clear_x11_hints — GDK queues geometry
/// changes that never flush, so the only way to guarantee the window physically
/// leaves sidebar geometry is to issue MoveResize + Map directly.
#[cfg(target_os = "linux")]
pub fn sidebar_force_map_window(window: &WebviewWindow, x: i32, y: i32, w: u32, h: u32) {
    let (xdisplay, xid) = match get_x11_ids(window) {
        Some(ids) => ids,
        None => return,
    };
    unsafe {
        XMoveResizeWindow(xdisplay, xid, x, y, w, h);
        XMapWindow(xdisplay, xid);
        XSync(xdisplay, 0);
        eprintln!("[SIDEBAR-EXIT] XMoveResizeWindow+XMapWindow fallback done xid={} -> ({},{}) {}x{}", xid, x, y, w, h);
    }
}

/// Lower the sidebar below the game on exit and restore keyboard focus to
/// the game window whose XID was saved on enter.  Falls back to PointerRoot
/// if no game XID was saved.
#[cfg(target_os = "linux")]
pub fn sidebar_restore_focus_to_game(window: &WebviewWindow, game_xid: u64) {
    eprintln!("[SIDEBAR-EXIT] restore_focus start game_xid={}", game_xid);
    let (xdisplay, xid) = match get_x11_ids(window) {
        Some(ids) => ids,
        None => { eprintln!("[SIDEBAR-EXIT] no x11 ids"); return; }
    };
    unsafe {
        // Drain events from sidebar_clear_x11_hints's XUnmapWindow/XMapWindow
        // before touching focus. Without this, XSetInputFocus gets BadMatch
        // because the server hasn't finished processing the remap yet.
        XSync(xdisplay, 0);

        XLowerWindow(xdisplay, xid);
        XSync(xdisplay, 0);

        if game_xid > 1 && game_xid != xid {
            // RevertToParent (2) matches the revert mode Wine uses (raw focus=..., revert=2)
            XSetInputFocus(xdisplay, game_xid, 2, 0);
            XFlush(xdisplay);
            eprintln!("[SIDEBAR-EXIT] focus restored to toplevel XID={}", game_xid);
        } else {
            XSetInputFocus(xdisplay, 1, 1, 0);
            XFlush(xdisplay);
            eprintln!("[SIDEBAR-EXIT] no game_xid saved, fallback focus to PointerRoot");
        }
    }
}

/// Transform the main window into sidebar overlay mode: frameless, AOT,
/// override_redirect + X11 hints for above-fullscreen rendering.
/// Captures game XID via XGetInputFocus before the unmap/remap cycle,
/// and restores focus to the game on exit via sidebar_restore_focus_to_game.
#[cfg(target_os = "linux")]
pub fn enter_sidebar_mode(
    app_handle: &AppHandle,
    window: &WebviewWindow,
    side: &str,
    width_phys: u32,
) -> Result<(), String> {
    let monitor = get_overlay_monitor(app_handle, "main").map_err(|e| { SIDEBAR_TOGGLING.store(false, Ordering::SeqCst); e })?;
    let mon_pos_x = monitor.position().x;
    let mon_pos_y = monitor.position().y;
    let mon_size_w = monitor.size().width;
    let mon_size_h = monitor.size().height;

    let phys_w = width_phys.max(200).min((mon_size_w as f64 * 0.9) as u32);
    let phys_h = mon_size_h;
    let target_x = match side {
        "right" => mon_pos_x + mon_size_w as i32 - phys_w as i32,
        _       => mon_pos_x,
    };

    let side_owned = side.to_string();
    let win = window.clone();
    let app = app_handle.clone();
    window.run_on_main_thread(move || {
        let _ = win.set_decorations(false);
        let _ = win.set_always_on_top(true);
        let _ = win.set_resizable(true);
        let _ = win.set_min_size(None::<tauri::PhysicalSize<u32>>);

        // 1. Read game XID NOW — before apply_x11_overlay_hints triggers
        //    XUnmapWindow which causes KWin to shift X11 focus away.
        let mut captured_game_xid: u64 = 0;
        if let Some((xdisplay_sid, xid_sid)) = get_x11_ids(&win) {
            unsafe {
                let mut prev_focus: u64 = 0;
                let mut prev_revert: i32 = 0;
                XGetInputFocus(xdisplay_sid, &mut prev_focus, &mut prev_revert);
                // Guard against stale/zero XIDs (None=0, PointerRoot=1) —
                // XQueryTree on those can produce BadWindow.
                let toplevel = if prev_focus > 1 {
                    get_toplevel_xid(xdisplay_sid, prev_focus)
                } else {
                    prev_focus
                };
                captured_game_xid = if toplevel > 1 && toplevel != xid_sid { toplevel } else { 0 };
                eprintln!("[SIDEBAR-ENTER] captured game_xid={} (raw focus={})", captured_game_xid, prev_focus);
            }
        }
        {
            let state = app.state::<crate::AppState>();
            let mut saved = state.sidebar_saved.lock().unwrap();
            saved.game_xid = captured_game_xid;
        }

        // 2. Set override_redirect at X11 level directly — GDK's wrapper
        //    doesn't guarantee XChangeWindowAttributes is flushed before
        //    the XUnmapWindow inside apply_x11_overlay_hints.
        if let Some((xdisplay_sid, xid_sid)) = get_x11_ids(&win) {
            unsafe {
                const CW_OVERRIDE_REDIRECT: u64 = 1 << 9;
                let mut attrs: XSetWindowAttributes = std::mem::zeroed();
                attrs.override_redirect = 1;
                XChangeWindowAttributes(xdisplay_sid, xid_sid,
                    CW_OVERRIDE_REDIRECT,
                    &attrs as *const XSetWindowAttributes as *const u32);
                XSync(xdisplay_sid, 0);
                eprintln!("[SIDEBAR-ENTER] override_redirect SET via X11");
            }
        }

        // 3. Atoms: unmap → set → remap, with position applied in the same X11
        //    protocol batch as XMapWindow so the compositor renders at the
        //    correct position on the very first frame — no visible jump.
        if let Some((xdisplay_sid, xid_sid)) = get_x11_ids(&win) {
            apply_x11_overlay_hints(xdisplay_sid, xid_sid, true,
                Some((target_x, mon_pos_y, phys_w, phys_h)));
            eprintln!("[SIDEBAR-ENTER] apply_x11_overlay_hints + position DONE xid={}", xid_sid);
        }

        if let Some(display) = gtk::gdk::Display::default() {
            display.sync();
        }

        // Small delay to let X server settle before Tauri calls
        std::thread::sleep(std::time::Duration::from_millis(50));

        // Sync Tauri/GDK's position+size cache so future API calls
        // (e.g. set_sidebar_width) use the correct geometry.
        let _ = win.set_min_size(Some(tauri::PhysicalSize { width: 200, height: 200 }));
        let _ = win.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: phys_w, height: phys_h }));
        let _ = win.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: target_x, y: mon_pos_y }));

        raise_x11(&win);

        if let Some((xdisplay_sid, xid_sid)) = get_x11_ids(&win) {
            unsafe {
                XSetInputFocus(xdisplay_sid, xid_sid, 1, 0);
                XFlush(xdisplay_sid);
                eprintln!("[SIDEBAR-ENTER] focus stolen to release Wine pointer grab");
            }
        }

        SIDEBAR_TOGGLING.store(false, Ordering::SeqCst);
        eprintln!("[SIDEBAR-ENTER] done: side={} {}x{} @({},{})",
            side_owned, phys_w, phys_h, target_x, mon_pos_y);
    }).map_err(|e| { SIDEBAR_TOGGLING.store(false, Ordering::SeqCst); e.to_string() })?;

    Ok(())
}

#[cfg(not(target_os = "linux"))]
pub fn enter_sidebar_mode(
    app_handle: &AppHandle,
    window: &WebviewWindow,
    side: &str,
    width_phys: u32,
) -> Result<(), String> {
    let _ = window.set_decorations(false);
    let _ = window.set_always_on_top(true);
    let _ = window.set_resizable(true);
    // Lower min size before shrinking, otherwise the OS clamps width back
    // to tauri.conf.json's minWidth (900) and the position calc overshoots.
    let _ = window.set_min_size(Some(tauri::PhysicalSize { width: 200, height: 200 }));
    update_sidebar_position(app_handle, window, side, width_phys)?;

    SIDEBAR_TOGGLING.store(false, Ordering::SeqCst);
    Ok(())
}

#[cfg(not(target_os = "linux"))]
pub fn update_sidebar_position(
    app_handle: &AppHandle,
    window: &WebviewWindow,
    side: &str,
    width_phys: u32,
) -> Result<(), String> {
    // Lower min size before every resize so the OS clamp doesn't fight the
    // sidebar width on every drag frame (called per-rAF from resize handle).
    let _ = window.set_min_size(Some(tauri::PhysicalSize { width: 200, height: 200 }));
    let monitor = get_overlay_monitor(app_handle, "main")?;
    let mon_pos_x = monitor.position().x;
    let mon_pos_y = monitor.position().y;
    let mon_size_w = monitor.size().width;
    let mon_size_h = monitor.size().height;
    let phys_w = width_phys.max(200).min((mon_size_w as f64 * 0.9) as u32);
    let target_x = match side {
        "right" => mon_pos_x + mon_size_w as i32 - phys_w as i32,
        _       => mon_pos_x,
    };
    let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: phys_w, height: mon_size_h }));
    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: target_x, y: mon_pos_y }));
    Ok(())
}

fn overlay_size(label: &str) -> (f64, f64) {
    match label {
        "overlay-relic" => (640.0, 140.0),
        "overlay-relic-picker" => (480.0, 400.0),
        "overlay-riven-current" | "overlay-riven-new" => (360.0, 260.0),
        _ => (440.0, 1.0),
    }
}

/// Calculate sidebar position: padded from monitor edges.
fn sidebar_position(
    monitor: &tauri::Monitor,
    side: &str,
    width_px: f64,
) -> (PhysicalPosition<i32>, f64, f64) {
    let mon_pos = monitor.position();
    let mon_size = monitor.size();
    let scale = monitor.scale_factor();
    let margin = (12.0 * scale) as i32;
    let phys_w = (width_px * scale) as i32;

    let (lx, _ly) = match side {
        "right" => (mon_size.width as i32 - phys_w - margin, margin),
        _ => (margin, margin),
    };

    let pos = PhysicalPosition {
        x: mon_pos.x + lx,
        y: mon_pos.y,
    };

    let height = mon_size.height as f64 - (2.0 * 12.0);

    (pos, width_px, height)
}

/// Show the interactive sidebar overlay (old separate-window approach, unused).
#[allow(dead_code)]
pub fn show_sidebar_window(
    app_handle: &AppHandle,
    side: &str,
    width_px: f64,
) -> Result<(), String> {
    let label = "overlay-sidebar";
    eprintln!("[SIDEBAR] show: side={} width={}", side, width_px);

    let window = app_handle
        .get_webview_window(label)
        .ok_or_else(|| format!("window '{}' not found", label))?;

    let monitor = get_overlay_monitor(app_handle, label)?;
    let (pos, w, h) = sidebar_position(&monitor, side, width_px);
    let scale = monitor.scale_factor();

    #[cfg(target_os = "linux")]
    {
        let was_visible = window.is_visible().unwrap_or(false);
        if let Some(main_win) = app_handle.get_webview_window("main") {
            set_transient_for(&window, &main_win);
        }
        use gtk::prelude::*;
        if let Ok(gtk_win) = window.gtk_window() {
            gtk_win.realize();
            if let Some(gdk_win) = gtk_win.window() {
                gdk_win.set_override_redirect(true);
            }
        }
        if let Some((xdisplay, xid)) = get_x11_ids(&window) {
            apply_x11_overlay_hints(xdisplay, xid, was_visible, None);
        }
        let _ = force_position_tauri(&window, pos.x, pos.y);
        if !was_visible {
            window.show().map_err(|e| format!("show() failed: {e}"))?;
            unsafe {
                if let Some((xdisplay, _)) = get_x11_ids(&window) {
                    XSync(xdisplay, 0);
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
        force_position_x11(&window, pos.x, pos.y);
        raise_x11(&window);
        install_deiconify_handler(&window);
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = force_position_tauri(&window, pos.x, pos.y);
        let was_visible = window.is_visible().unwrap_or(false);
        if !was_visible {
            window.show().map_err(|e| format!("show() failed: {e}"))?;
        }
    }

    window
        .set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: (w * scale) as u32,
            height: (h * scale) as u32,
        }))
        .map_err(|e| format!("set_size failed: {e}"))?;

    window
        .set_always_on_top(true)
        .map_err(|e| format!("set_always_on_top failed: {e}"))?;

    window
        .set_skip_taskbar(true)
        .map_err(|e| format!("set_skip_taskbar failed: {e}"))?;

    apply_platform_patches(&window)?;

    {
        let mut installed = AOT_KEEPER_INSTALLED.lock().unwrap();
        if !installed.contains(&"sidebar-focus-hide".to_string()) {
            let w = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Focused(focused) = event {
                    if !focused {
                        eprintln!("[SIDEBAR] focus lost -> scheduling hide check");
                        let w2 = w.clone();
                        std::thread::spawn(move || {
                            std::thread::sleep(std::time::Duration::from_millis(100));
                            if !w2.is_focused().unwrap_or(false) {
                                eprintln!("[SIDEBAR] confirm unfocused -> hiding");
                                let _ = w2.emit("sidebar-animate-out", ());
                                std::thread::sleep(std::time::Duration::from_millis(250));
                                let _ = w2.hide();
                            }
                        });
                    }
                }
            });
            installed.push("sidebar-focus-hide".to_string());
        }
    }

    let _ = window.emit("sidebar-animate-in", side);

    eprintln!("[SIDEBAR] FINAL: pos=({},{}) size=({}x{})", pos.x, pos.y, w, h);
    Ok(())
}

pub fn resize_overlay_window(
    app_handle: &AppHandle,
    label: &str,
    width: f64,
    height: f64,
) -> Result<(), String> {
    eprintln!("[OVERLAY] resize_overlay_window '{}': {}x{}", label, width, height);

    let window = app_handle
        .get_webview_window(label)
        .ok_or_else(|| format!("window '{}' not found", label))?;

    if height > 40.0 {
        let monitor = get_overlay_monitor(app_handle, label)?;
        let pos = calculate_position(label, &monitor, width, height);
        let scale = monitor.scale_factor();
        let phys_w = (width * scale) as u32;
        let phys_h = (height * scale) as u32;


        
        #[cfg(target_os = "linux")]
        {
            let was_visible = window.is_visible().unwrap_or(false);
            if let Some((xdisplay, xid)) = get_x11_ids(&window) {
                apply_x11_overlay_hints(xdisplay, xid, was_visible, None);
            }
            let _ = force_position_tauri(&window, pos.x, pos.y);
            if !was_visible {
                window.show().map_err(|e| format!("show failed: {e}"))?;
            }
            force_position_x11(&window, pos.x, pos.y);
            raise_x11(&window);
        }

        #[cfg(not(target_os = "linux"))]
        {
            let _ = force_position_tauri(&window, pos.x, pos.y);
            window.show().map_err(|e| format!("show failed: {e}"))?;
        }

        window
            .set_size(tauri::Size::Physical(tauri::PhysicalSize { width: phys_w, height: phys_h }))
            .map_err(|e| format!("set_size failed: {e}"))?;
        window.set_always_on_top(true)
            .map_err(|e| format!("set_always_on_top failed: {e}"))?;
        window.set_ignore_cursor_events(true)
            .map_err(|e| format!("set_ignore_cursor_events failed: {e}"))?;
        window.set_skip_taskbar(true)
            .map_err(|e| format!("set_skip_taskbar failed: {e}"))?;
    } else {
        window.hide().map_err(|e| format!("hide failed: {e}"))?;
    }

    Ok(())
}