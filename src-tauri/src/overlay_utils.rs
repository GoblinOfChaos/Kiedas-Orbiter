use std::sync::Mutex;
use tauri::{AppHandle, Manager, PhysicalPosition, WebviewWindow};

static AOT_KEEPER_INSTALLED: Mutex<Vec<String>> = Mutex::new(Vec::new());

pub fn get_overlay_monitor(app_handle: &AppHandle) -> Result<tauri::Monitor, String> {
    let state = app_handle.state::<crate::AppState>();
    let target_idx = *state.target_monitor.lock().unwrap();

    let main_window = app_handle
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    let monitors = main_window
        .available_monitors()
        .map_err(|e| e.to_string())?;

    eprintln!("[OVERLAY] get_overlay_monitor: target_idx={:?} monitors={}", target_idx, monitors.len());

    if let Some(idx) = target_idx {
        if idx < monitors.len() {
            return Ok(monitors[idx].clone());
        }
    }

    main_window
        .current_monitor()
        .map_err(|e| e.to_string())?
        .or_else(|| main_window.primary_monitor().ok().flatten())
        .ok_or_else(|| "no monitor found".to_string())
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
    fn XRaiseWindow(display: *mut std::ffi::c_void, w: u64) -> i32;
    fn XFlush(display: *mut std::ffi::c_void) -> i32;
    fn XSync(display: *mut std::ffi::c_void, discard: i32) -> i32;
    fn XUnmapWindow(display: *mut std::ffi::c_void, w: u64) -> i32;
    fn XMapWindow(display: *mut std::ffi::c_void, w: u64) -> i32;
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
/// primary type — this is the highest non-critical layer, above fullscreen apps.
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
fn apply_x11_overlay_hints(xdisplay: *mut std::ffi::c_void, xid: u64, already_mapped: bool) {
    unsafe {
        let xa_atom: u64 = 4;
        let xa_cardinal: u64 = 6;
        let prop_replace: i32 = 0;

        // If already mapped, unmap so KWin re-evaluates the layer on remap
        if already_mapped {
            XUnmapWindow(xdisplay, xid);
            XSync(xdisplay, 0);
        }

        // _NET_WM_WINDOW_TYPE: Notification as primary, with Dock and Utility
        // as fallbacks.  _KDE_NET_WM_WINDOW_TYPE_ON_SCREEN_DISPLAY is intentionally
        // omitted — KWin hard-centers OSD windows, fighting our position.
        let wm_type = XInternAtom(xdisplay, b"_NET_WM_WINDOW_TYPE\0".as_ptr() as *const i8, 0);
        let notification = XInternAtom(xdisplay, b"_NET_WM_WINDOW_TYPE_NOTIFICATION\0".as_ptr() as *const i8, 0);
        let dock = XInternAtom(xdisplay, b"_NET_WM_WINDOW_TYPE_DOCK\0".as_ptr() as *const i8, 0);
        let utility = XInternAtom(xdisplay, b"_NET_WM_WINDOW_TYPE_UTILITY\0".as_ptr() as *const i8, 0);
        let types: [u64; 3] = [notification, dock, utility];
        XChangeProperty(xdisplay, xid, wm_type, xa_atom, 32, prop_replace,
            types.as_ptr() as *const u8, 3);

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

        // Remap if we unmapped above (first-time show is handled by Tauri's show())
        if already_mapped {
            XMapWindow(xdisplay, xid);
            XSync(xdisplay, 0);
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

    let monitor = get_overlay_monitor(app_handle)?;
    let (w, h) = overlay_size(label);
    let pos = calculate_position(label, &monitor, w, h);

    eprintln!("[OVERLAY] target pos=({},{})", pos.x, pos.y);

    #[allow(unused_assignments)]
    let mut main_had_focus = false;

    #[cfg(target_os = "linux")]
    {
        let was_visible = window.is_visible().unwrap_or(false);

        // Keep track of which window had focus before we show the overlay
        main_had_focus = app_handle.get_webview_window("main")
            .and_then(|w| w.is_focused().ok())
            .unwrap_or(false);

        // Transient for main window so WM always stacks overlay above it
        if let Some(main_win) = app_handle.get_webview_window("main") {
            set_transient_for(&window, &main_win);
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
            apply_x11_overlay_hints(xdisplay, xid, was_visible);
        }

        // Set position before show for Wayland/first-map hint
        let _ = force_position_tauri(&window, pos.x, pos.y);

        if !was_visible {
            // First show: Tauri's show() acts as the XMapWindow
            window.show().map_err(|e| format!("show() failed: {e}"))?;
            // Let KWin finish any MapNotify processing before we force the
            // position — the XSync + sleep window ensures our move wins.
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
        window.show().map_err(|e| format!("show() failed: {e}"))?;
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

fn overlay_size(label: &str) -> (f64, f64) {
    match label {
        "overlay-relic" => (640.0, 140.0),
        "overlay-riven-current" | "overlay-riven-new" => (360.0, 260.0),
        _ => (440.0, 1.0),
    }
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
        let monitor = get_overlay_monitor(app_handle)?;
        let pos = calculate_position(label, &monitor, width, height);
        let scale = monitor.scale_factor();
        let phys_w = (width * scale) as u32;
        let phys_h = (height * scale) as u32;

        #[cfg(target_os = "linux")]
        {
            let was_visible = window.is_visible().unwrap_or(false);
            if let Some((xdisplay, xid)) = get_x11_ids(&window) {
                apply_x11_overlay_hints(xdisplay, xid, was_visible);
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