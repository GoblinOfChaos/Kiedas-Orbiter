# Sidebar Overlay — Code Snapshots

Two working configurations identified in this session.  The third
configuration (Snapshot C, which adds a focus keeper) is broken —
it creates an X11 focus-ping-pong loop and is included here only
as a warning.

---

## Snapshot A — Triggers / Positions / Focus Perfect

**What works:** global hotkeys toggle reliably, window restores to
exactly its saved position/size (no drift), game keeps keyboard
focus naturally via KWin.

**What doesn't:** mouse cursor cannot interact with the sidebar —
Warframe's X11 pointer grab (from a different client) blocks it;
`XUngrabPointer` from our client returns `AlreadyGrabbed`.

### Key principle
Zero focus management.  No `XSetInputFocus` calls anywhere.  The
game keeps keyboard focus; we never fight KWin for it.

### Files & sections

#### `src-tauri/src/overlay_utils.rs` — `enter_sidebar_mode` (lines ~555–606)

```rust
pub fn enter_sidebar_mode(
    app_handle: &AppHandle,
    window: &WebviewWindow,
    side: &str,
    width_phys: u32,
) -> Result<(), String> {
    let monitor = get_overlay_monitor(app_handle, "main")?;
    let phys_w = width_phys.max(200).min((monitor.size().width as f64 * 0.9) as u32);
    let phys_h = monitor.size().height as u32;
    let target_x = match side {
        "right" => monitor.position().x + monitor.size().width as i32 - phys_w as i32,
        _       => monitor.position().x,
    };

    let win = window.clone();
    window.run_on_main_thread(move || {
        let _ = win.set_decorations(false);
        let _ = win.set_always_on_top(true);
        let _ = win.set_resizable(true);
        let _ = win.set_min_size(None::<tauri::PhysicalSize<u32>>);

        use gtk::prelude::*;
        if let Ok(gtk_win) = win.gtk_window() {
            gtk_win.realize();
            if let Some(gdk_win) = gtk_win.window() {
                gdk_win.set_override_redirect(true);
            }
        }

        if let Some((xdisplay_sid, xid_sid)) = get_x11_ids(&win) {
            apply_x11_overlay_hints(xdisplay_sid, xid_sid, true);
        }

        if let Some(display) = gtk::gdk::Display::default() {
            display.sync();
        }

        force_move_resize_x11(&win, target_x, mon_pos_y, phys_w, phys_h);
        raise_x11(&win);

        // NO focus manipulation — game keeps keyboard focus naturally.
        // NO ungrab attempt — cross-client ungrab is impossible.
    }).map_err(|e| e.to_string())?;

    Ok(())
}
```

#### `src-tauri/src/overlay_utils.rs` — `sidebar_restore_focus_to_game` (lower only)

```rust
pub fn sidebar_restore_focus_to_game(window: &WebviewWindow) {
    let ids = get_x11_ids(window);
    let (xdisplay, xid) = match ids {
        Some(ids) => ids,
        None => return,
    };
    unsafe {
        XLowerWindow(xdisplay, xid);
        XFlush(xdisplay);
    }
}
```

No `game_xid` parameter.  No `XSetInputFocus`.  Just
`XLowerWindow` so the main window drops behind the game.

#### `src-tauri/src/main.rs` — `toggle_sidebar` EXIT closure

```rust
window.run_on_main_thread(move || {
    overlay_utils::sidebar_clear_x11_hints(&win);
    let _ = win.set_decorations(true);
    let _ = win.set_always_on_top(false);
    let _ = win.set_resizable(true);

    // set_size BEFORE set_min_size — the position drift fix.
    // w,h are the original size saved on ENTER (≥ 900).
    let _ = win.set_size(tauri::Size::Physical(
        tauri::PhysicalSize { width: w, height: h }
    ));
    let _ = win.set_min_size(Some(
        tauri::PhysicalSize { width: w.max(900), height: h.max(500) }
    ));

    let _ = win.set_position(tauri::Position::Physical(
        tauri::PhysicalPosition { x, y }
    ));

    // Lower only — no focus restore needed.
    overlay_utils::sidebar_restore_focus_to_game(&win);
});
```

#### `src-tauri/src/main.rs` — `SidebarSavedState`

```rust
pub struct SidebarSavedState {
    pub active: bool,
    pub side: Option<String>,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    // No game_xid — no XID tracking needed.
}
```

---

## Snapshot B — Mouseover Fix Attempt

**What works:** everything from Snapshot A **plus** the sidebar
receives mouse clicks — `XSetInputFocus` moves keyboard focus to
the sidebar on ENTER, triggering `FocusOut` on Warframe → game
releases its X11 pointer grab.

**What doesn't:** KWin may restore focus to the game after our
single-shot `XSetInputFocus`, causing the game to re-grab.  In
practice it usually sticks because the sidebar is
`override_redirect` (WM doesn't manage it).

### Key principle
Single-shot focus steal on ENTER, single-shot focus restore on
EXIT.  No persistent focus keeper — no loop.

### Changes relative to Snapshot A

#### `src-tauri/src/overlay_utils.rs` — extern block (add)

```rust
extern "C" {
    // … existing functions …
    fn XGetInputFocus(
        display: *mut std::ffi::c_void,
        focus_return: *mut u64,
        revert_to_return: *mut i32,
    ) -> i32;
    fn XSetInputFocus(
        display: *mut std::ffi::c_void,
        focus: u64,
        revert_to: i32,
        time: u64,
    ) -> i32;
}
```

#### `src-tauri/src/overlay_utils.rs` — `enter_sidebar_mode` (add after `raise_x11`)

```rust
// Save the previously-focused window's XID, then set focus to our
// window → game gets FocusOut → releases its pointer grab.
if let Some((xdisplay_sid, xid_sid)) = get_x11_ids(&win) {
    unsafe {
        let mut prev_focus: u64 = 0;
        let mut prev_revert: i32 = 0;
        XGetInputFocus(xdisplay_sid, &mut prev_focus, &mut prev_revert);

        let state = app.state::<crate::AppState>();
        let mut saved = state.sidebar_saved.lock().unwrap();
        if prev_focus > 1 {
            saved.game_xid = prev_focus;
        } else {
            saved.game_xid = 0;
        }
        drop(saved);

        // RevertToPointerRoot so focus falls back sanely if the
        // sidebar is withdrawn unexpectedly.
        XSetInputFocus(xdisplay_sid, xid_sid, 1, 0);
        XFlush(xdisplay_sid);
    }
}

// NO focus keeper — no WindowEvent::Focused listener.
```

#### `src-tauri/src/overlay_utils.rs` — `sidebar_restore_focus_to_game` (updated)

```rust
pub fn sidebar_restore_focus_to_game(window: &WebviewWindow, game_xid: u64) {
    let ids = get_x11_ids(window);
    let (xdisplay, xid) = match ids {
        Some(ids) => ids,
        None => return,
    };
    unsafe {
        XLowerWindow(xdisplay, xid);
        XFlush(xdisplay);

        if game_xid > 1 {
            // Restore focus to the game window we saved on ENTER.
            XSetInputFocus(xdisplay, game_xid, 1, 0);
        } else {
            // Fallback: focus follows pointer.
            XSetInputFocus(xdisplay, 1, 1, 0);
        }
        XFlush(xdisplay);
    }
}
```

#### `src-tauri/src/main.rs` — `toggle_sidebar` ENTER path

```rust
// Capture game_xid from saved state before dropping:
let (x, y, w, h, game_xid) = (
    saved.x, saved.y, saved.width, saved.height, saved.game_xid
);
saved.active = false;
saved.side = None;
saved.game_xid = 0;
drop(saved);

// Pass game_xid to the restore closure:
window.run_on_main_thread(move || {
    // … clear hints, set decorations, set_size, set_min_size, set_position …
    overlay_utils::sidebar_restore_focus_to_game(&win, game_xid);
});
```

#### `src-tauri/src/main.rs` — `SidebarSavedState` (updated)

```rust
pub struct SidebarSavedState {
    pub active: bool,
    pub side: Option<String>,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub game_xid: u64,  // X11 window ID of the game, 0 if unknown.
}
```

---

## Snapshot C (broken) — Focus Keeper Spam Loop

**DO NOT USE.**  Adding a `WindowEvent::Focused(false)` listener
that re-asserts `XSetInputFocus` every time the sidebar loses
focus creates a ping-pong loop:

```
KWin restores focus to game
  → sidebar gets Focused(false)
  → focus keeper calls XSetInputFocus back to sidebar
  → game gets FocusOut
  → KWin restores focus to game again
  → repeat at high frequency
```

The spam was observed in the terminal as ~15
`"focus keeper: re-asserted focus to sidebar"` lines per toggle
cycle.

The problematic code (at the end of `enter_sidebar_mode`'s
`run_on_main_thread` closure, after `XSetInputFocus`):

```rust
// ❌ BROKEN — creates focus-ping-pong with KWin
{
    let keep_win = win.clone();
    win.on_window_event(move |event| {
        if let tauri::WindowEvent::Focused(focused) = event {
            if !focused {
                if let Some((xdisplay, xid)) = get_x11_ids(&keep_win) {
                    unsafe {
                        XSetInputFocus(xdisplay, xid, 1, 0);
                        XFlush(xdisplay);
                    }
                }
            }
        }
    });
}
```

---

## Decision Matrix

| Aspect | Snapshot A | Snapshot B | Snapshot C |
|---|---|---|---|
| Hotkeys work | ✅ | ✅ | ❌ (focus loop) |
| Position restored correctly | ✅ | ✅ | ❌ |
| Game keeps keyboard focus | ✅ | ✅ (single-shot steal) | ❌ (loop) |
| Sidebar receives mouse clicks | ❌ (game's grab) | ✅ (grab released) | ❌ (loop) |
| Code complexity | Low | Medium | High |
| X11 race conditions | None | Possible brief re-grab | Guaranteed loop |

### Recommendation

Start with **Snapshot A** (no focus management) if mouse
interaction is not required.  If mouse interaction is required,
use **Snapshot B** (single-shot `XSetInputFocus` on ENTER,
single-shot restore on EXIT).  Never add a focus keeper /
re-assertion listener.
