# Cephalon Kronos — Full Fix/Error History Reference

Complete commit history of glowseeker/cephalon-kronos (https://github.com/glowseeker/cephalon-kronos), pulled 2026-07-27, 522 commits total, oldest to newest within each category. Kronos is a separate Tauri/React (not Python/GTK) Warframe companion app, but shares this project's Linux/KWin/Wayland/X11 environment and many of the same problem categories (overlay always-on-top, screen capture, EE.log/memory scanning, OCR, riven/relic detection, WFM pricing).

**Mandatory use**: before diagnosing any new error in wfinfo-ng, check this file first for a matching category/keyword. Many bugs here are structural (KWin/X11/Wayland-specific gotchas) that will recur in any Linux GTK/X11 app, not just Kronos's Tauri stack — the underlying mechanism/lesson usually still applies even though the code is different.

Commit bodies (when present) are included in full since they contain the actual root-cause explanation, not just a one-line title.

## 1. Overlay / Window / Focus / X11

*100 commits*

- **2026-03-31** `5dc8939` — autostart monitoring toggle
- **2026-04-08** `7ddff7b` — Overlay draft
- **2026-04-08** `0278cba` — revised calibration window
- **2026-04-09** `ee1d935` — Overlay draft #2
- **2026-04-10** `a5672b1` — Overlay draft #3
- **2026-04-12** `c6c5a4d` — Windows notifications working but not rendering on top
- **2026-04-12** `96053ea` — Overlay draft #4
- **2026-04-12** `4337003` — overlay fully works on windows
- **2026-04-16** `a862c96` — #10 Relic overlay doesnt move anymore
- **2026-04-28** `2f7aa97` — fix: switch to polling-based log scanner for Windows compatibility
- **2026-04-28** `560033c` — fix: consolidate monitoring UI and add polling scanner
- **2026-05-01** `ef1215a` — #10 #13 Fixed: Relic overlay positioning, dynamic sizing, and persistence in endless missions
- **2026-05-01** `c925fbc` — #13 Fixed: Relic overlay lifecycle for endless missions and improved squad size tracking
- **2026-05-01** `d46e50c` — #10 Fixed: Relic overlay window resizing, multi-monitor positioning, and visibility reliability
- **2026-05-02** `31aea7d` — #10 Fixed: Relic overlay mangled/mispositioned on re-trigger
- **2026-05-02** `8eba948` — #22 fix(notifications): ensure all notifications and test buttons respect preferred position
- **2026-05-02** `db6c0b8` — #21 fix(overlays): ensure notifications respect primary monitor bounds in multi-monitor setups
- **2026-05-03** `bfd8c73` — #10 general overlay fix
- **2026-05-03** `28fce2d` — Fix Windows focus theft during overlay resize
- **2026-05-03** `ddf7c4e` — Relic overlay plat more prominent
- **2026-05-08** `75289fd` — Relic Overlay: smoother progress bar
- **2026-05-08** `a64030d` — Overlay shows set name even without inventory cached
- **2026-05-08** `ea3e830` — Relic Overlay: parallel slot filling
- **2026-05-08** `ec1c2bd` — Offload plat value fetching to MonitoringContext.js
- **2026-05-15** `5f0f0f7` — #10 Relic Overlay Improved
- **2026-05-20** `3e8f6d1` — #21 Multi Monitor Support
- **2026-05-25** `8b10c9a` — Upgrade to memory scanner and various new overlays
- **2026-06-01** `f1b2d4d` — #39 riven overlay and pricing - first draft
- **2026-06-05** `72348ef` — settings refresh prices button and manual cache.windows path
- **2026-06-05** `23b7b98` — hide overlay windows at startup to avoid black flash on Linux
- **2026-06-05** `dcf26c7` — fix pnpm-workspace.yaml missing packages field; fix Rust compilation on macOS/Windows
- **2026-06-05** `41eaaac` — fix windows build: convert backslash paths to forward slashes in bundled_assets.rs
- **2026-06-08** `c1f70b1` — fix: overlay window positioning, AOT, relic overlay, opacity
  > - Strip @layer wrappers from index.css (WebKitGTK 4.1 incompatibility)
  > - Fix scrollbar colors to use rgba(var(--color-accent-rgb), x) instead
  > of var(--color-accent) which doesn't work in ::-webkit-scrollbar-thumb
  > - Remove box-shadow from scrollbar thumbs, fix width 12px → 4px
  > - Remove pre-showing overlay windows at startup (race condition on Linux
  > with webkit2gtk-nvidia-quirk / disabled compositing)
  > - Add 150ms delay before emitting new-notification, so webview has time
  > to render transparent content before receiving the event
  > - Add Linux-specific always-on-top re-raise in show_window_internal
  > - Fix overlay_utils.rs missing WebviewWindowExt import for ns_window()
  > - Update tauri.conf.json asset/resources/CSP for v2
  > - Small fixes in App.jsx and Mods.jsx import paths
  > fix: overlay AOT keeper, window bounds ordering, notification timing
  > - Rewrite show_with_bounds: hide → set geometry → show (reference pattern)
  > - Add install_aot_keeper per overlay window (focus-loss re-apply AOT)
  > - Add Linux-specific AOT re-raise after show() (80ms sleep)
  > - Remove pre-showing overlays at startup (races webview load)
  > - Change notification emit to async with 150ms delay
  > - Add ToastOverlay hadContent ref to prevent collapse on first mount
  > - Update cargo config for Linux linker
  > - Update tauri.conf.json resources/CSP for v2
  > - Add gtk/gtk4.0.5 native deps for Linux transparency
  > Fix overlay window positioning and AOT on Linux/X11
  > - Force GDK_BACKEND=x11 unconditionally so raw XMoveWindow works
  > - Add force_position_x11 using XMoveWindow to bypass GTK's broken
  > gtk_window_move for ARGB visual (transparent: true) windows
  > - Set position before show() for first-map hints (Wayland compat)
  > - Add AOT keeper to re-apply set_always_on_top on focus loss
  > - Make position errors non-fatal so AOT/click-through still apply
  > - Builds on the existing env-var logic but removes the is_err()
  > guard that silently let Wayland through
  > Overlay Revamp
  > Opacity fix on text for legibility
  > Platform Update for Helper
  > Relic Overlay update
- **2026-06-08** `3d80a62` — fix: CI builds for all platforms, GBM crash, Windows linking
  > - Install libwebkit2gtk-4.1-dev + libjavascriptcoregtk-4.1-dev (Tauri v2)
  > - Guard X11 includes and getWindowRectMode with __linux__ (fix macOS)
  > - Fix proc->pid -> proc->id (fix Windows)
  > - Add macOS no-op fallback for getWindowRectMode
  > Fix Windows build: add missing linker libs and _WIN32_WINNT
  > Fix Windows linking: add --gc-sections, reorder libs, append -lws2_32
  > Fix Windows build: add gdi32/hid/setupapi libs and inet_ntop compat
  > Fix Windows: skip unneeded soup networking files, provide __imp_inet_ntop
  > Windows: compile all soup files, inet_ntop compat resolves the only missing symbol
  > Fix GBM crash fallback and pricer model URL to use release tag
- **2026-06-08** `73f46da` — fix: statically link winpthread in Windows helper build
- **2026-06-08** `b5c0e43` — fix: guard relic overlay on is_fissure, kill orphaned helper on pipe errors
- **2026-06-08** `15c0470` — fix: remove mount-effect that showed relic overlay on every startup
- **2026-06-10** `a242285` — fix: make force_position_tauri available on all platforms
- **2026-06-10** `994bd0d` — Windows revert erroneous patches
- **2026-06-10** `6e62f87` — Updated windows api helper
- **2026-06-11** `0cbc778` — remove calibration window (no longer needed, overlays work without KWin rules)
- **2026-06-11** `f2aa682` — fix: notification overlay focused-monitor auto-detect, remove compositing-mode disable, skip transient-for on relic/riven overlays
- **2026-06-12** `27da720` — fix: remove redundant overlay show() from OCR, avoid duplicate show_window_internal call from RelicRewardOverlay
- **2026-06-14** `95be7f1` — update RivenOverlay to match inventory tooltip
- **2026-06-15** `f1cd254` — fix: revert broken backend changes, guard rivenInfo null crash in RivenOverlay
- **2026-06-16** `65d45f6` — RivenOverlays scaling support
- **2026-06-24** `3709809` — feat: add relic picker overlay that auto-opens during endless missions
- **2026-06-24** `46ba930` — feat: add interactive in-game sidebar overlay with settings
- **2026-07-01** `7d0abe7` — overlay fix, inconsistent spawn position
- **2026-07-03** `1531d39` — windows overlay implementation
- **2026-07-04** `e4953e2` — performance improvements with overlay work
- **2026-07-09** `5ad1756` — fix: reorder sidebar exit sequence, delete _NET_WM_USER_TIME instead of setting to 0, add overlay shield with idle deferral
- **2026-07-12** `562b885` — overlay fully done
- **2026-07-12** `bef1718` — windows fixes
- **2026-07-12** `53b4ea6` — sidebar donezo
- **2026-07-13** `1cd7703` — fix: sidebar resize handle pointer capture + wider default (400px)
  > - Switch overlay resize handle from mouse events to pointer events with
  > setPointerCapture so drags work reliably even when cursor leaves window.
  > - Remove requestAnimationFrame throttle for responsive resizing.
  > - Add setSetting call on mouseup to keep JS settings cache in sync.
  > - Increase default sidebar width from 300 to 400 for a better first-use
  > experience.
- **2026-07-13** `12bec7c` — fix: overlay dashboard not loading - load_all_exports_inner no longer aborts on single file failure
  > load_all_exports_inner used ? which returned None if any single export
  > file failed to open or parse, causing sidebar_load_data to return null
  > exports. The MirroredMonitoringProvider would then set exportData to
  > null, leaving the Dashboard with no data (empty dict, ERg, etc.) and
  > rendering a blank page.
  > Now uses if-let to skip individual failures, matching the main window's
  > load_all_exports behaviour.
- **2026-07-13** `0bc7cbf` — fix: overlay Dashboard now uses context worldState + mirrored spIncursions/arbys
  > - MirroredMonitoringProvider: load sp-incursions.txt and arbys.txt from
  > files so the overlay Dashboard can show SP Incursions and Arbitrations
  > - Dashboard.jsx: use pre-parsed worldState from monitoring context instead
  > of fetching raw worldstate API and reprocessing locally. This ensures the
  > overlay shows the same processed/cleaned data as the main window
  > (localized names, resolved descriptions, patched exports, etc.)
  > - Dashboard now only fetches location-bounties and bounty-cycle from
  > Oracle API (these are not mirrored from context)
- **2026-07-13** `75bd8c6` — fix: MirroredMonitoringProvider only fetches worldstate when dict has data
- **2026-07-13** `a98a9f0` — fix: overlay toMap now handles top-level arrays (same as main window toMap)
  > The overlay's MirroredMonitoringProvider had a simplified toMap that always
  > indexed into data[key], failing when ExportChallenges.json is a top-level
  > array (array['ExportChallenges'] = undefined). Replaced with the main
  > window's version that detects and unwraps both array and object shapes.
- **2026-07-14** `7e3e071` — Overlays/Notifications seperate titles
- **2026-07-14** `ac8f5f2` — fix: overlays follow Warframe monitor, single authoritative X11 positioning
  > - Warframe monitor tracking module with background focus watcher (500ms poll)
  > - Overlays always follow Warframe's monitor, not the main window
  > - Single authoritative X11 XMoveWindow path on Linux (dropped Tauri set_position)
  > - Resize-to-1x1-then-back repaint trigger to clear stale WebKit rendering
  > - Hide overlays when Warframe is not focused (focus-aware show/hide)
- **2026-07-14** `bec2a64` — rename game monitoring to inventory syncing across UI and docs
- **2026-07-14** `45ced1b` — rename game monitoring to inventory syncing in Settings UI
- **2026-07-15** `656fd83` — fix: re-add scanner-hooked notification in main window only (dedup, not remove)
- **2026-07-15** `d89ce28` — fix: notification windows no longer clobbered to 440x1 on show_window_internal
  > overlay_size() returns (440, 1) for notification labels (the fallback default).
  > show_window_internal would clobber the window to this size on every call,
  > collapsing dynamically-sized notification windows.  Now skips the resize
  > entirely for notification overlays (overlay-tl/tr/tc) since their height
  > is managed by the frontend ResizeObserver.
- **2026-07-15** `287a68e` — fix: overlay data sync and navigation fixes
  > - sidebar-data-updated now uses relay_event instead of per-window emit,
  > so the overlay actually receives inventory update notifications
  > - MonitorState "Go to Settings" button now works in overlay (data-nav attribute)
  > - Added data-nav to sidebar overlay nav buttons for consistent selectors
  > - Added trigger_release.sh for version bumping and tagging
- **2026-07-15** `1432e59` — fix: focus watcher now detects minimize via helper window rect
  > active_win_pos_rs::get_active_window() often fails on KDE Wayland,
  > causing is_warframe_focused() to always return false.  The focus
  > watcher would never toggle overlays.
  > Primary detection now uses the helper's --get-window-rect: minimized
  > windows return no visible geometry, so this reliably catches minimize.
  > active_win_pos_rs is retained as a refinement for the alt+tab case.
- **2026-07-15** `1772ff1` — redesign riven overlay: compact layout, gradient bg, dynamic height, bigger text
- **2026-07-15** `1fd4dd6` — tweak relic picker overlay: bigger fonts, more padding, absolute positioning
- **2026-07-15** `0111ef7` — feat: relic picker void tier, scanner improvements, overlay fixes, dev overlays
  > - Rust: add void tier detection to log scanner (Lith/Meso/Neo/Axi)
  > - Rust: emit relic-picker-tier and relic-picker-closed events
  > - Rust: fix relic picker positioning in overlay_utils
  > - Rust: improve focus detection with xprop fallback on Linux
  > - Frontend: filter relics by void tier in relic picker overlay
  > - Frontend: handle tier updates mid-mission via relay_event
  > - Frontend: add test relic reward button in Settings
  > - Frontend: add Dev Overlays nav item in dev mode
  > - Fix: remove toast window collapse logic
- **2026-07-15** `0121d74` — fix: remove dev overlays nav item
- **2026-07-15** `49eb22d` — fix: overlay focus hide, riven fixed height, trigger speed
  > - GTK shield now checks is_warframe_focused before re-showing overlays,
  > preventing it from fighting the focus watcher when game is minimized/alt-tabbed
  > - Riven overlay uses fixed 320px height for 4 stats (scrapped dynamic calcH)
  > - Removed redundant resize_overlay_window call from riven show() for faster trigger
  > - Updated tauri.conf.json default riven overlay heights to 320
- **2026-07-15** `26bc88b` — fix: use xdotool _NET_ACTIVE_WINDOW for overlay focus on KDE Wayland
  > active_win_pos_rs uses XGetInputFocus which never leaves XWayland clients
  > when focus moves to native Wayland apps. Use xdotool getactivewindow
  > (backed by _NET_ACTIVE_WINDOW, correctly maintained by KWin) as primary
  > Linux focus check, with active_win_pos_rs and _NET_WM_STATE as fallbacks.
- **2026-07-15** `f9ecb52` — refactor: remove dead is_x11_window_hidden fallback
  > is_x11_active_window covers the same xdotool-availability condition
  > and is checked first, making is_x11_window_hidden unreachable.
  > Removed the dead tier-3 fallback block from is_warframe_focused()
  > and deleted the unused function entirely.
- **2026-07-16** `dbe5f80` — fix: suppress console window on warframe-api-helper --get-window-rect
  > The focus watcher spawned warframe-api-helper.exe --get-window-rect
  > twice every 500ms (4x/sec) without CREATE_NO_WINDOW, flashing a
  > console window each time and stealing focus from Warframe.
- **2026-07-16** `e30a4b5` — chore: reduce focus watcher poll from 500ms to 2000ms
  > With CREATE_NO_WINDOW the spawns are silent, but spawning a subprocess
  > twice per iteration at 500ms is needlessly heavy. 2s is plenty for
  > alt+tab detection.
- **2026-07-18** `74d7478` — refactor: split overlay monitor from notification monitor
  > Notifications use the configurable target_monitor setting and auto/fixed
  > radio UI. Overlays always follow Warframe's monitor unconditionally.
  > - get_overlay_monitor: notifications read target_monitor from AppState,
  > overlays always use get_warframe_monitor_idx
  > - Settings UI: replaced Toggle+select combo with radio buttons
  > ('Spawn on active monitor' / 'Spawn on monitor: [selector]')
  > - Added explanatory note: 'In-game overlays always follow Warframe's
  > monitor. This setting only controls notification pop-ups.'
- **2026-07-18** `13e90df` — fix: preserve overlay geometry across hide/show cycles
  > - LAST_OVERLAY_SIZES: track each overlay's last known resize so backing-store
  > invalidation restores to the real size instead of the static default
  > - show_window_internal: use get_last_overlay_size() with overlay_size() fallback
  > - Backing-store invalidation: resize to 1x1 then restore to last known size,
  > preventing stale content ghosts from prior hide/show cycles
  > - resize_overlay_window: always invalidate backing store via 1x1 before real
  > resize (removed was_visible condition that skipped it for already-visible
  > windows)
  > - Riven overlay default height corrected: 320 -> 260
  > - Relic picker position centered: 50%% horizontal / 5%% vertical instead of 85%% right
  > - Remove _NET_WM_BYPASS_COMPOSITOR atom (no longer needed)
- **2026-07-18** `60b28a2` — feat: integrate sidebar with focus watcher + hide-on-alt-tab toggle
  > - SHOWN_OVERLAYS registration for sidebar in show_sidebar_internal so
  > the focus watcher can track/show/hide the sidebar window
  > - clear_shown_overlay in hide_sidebar_internal so manually-hidden sidebar
  > doesn't get re-shown by the focus watcher on focus regain
  > - show_window_internal routes 'overlay-sidebar' to show_sidebar_internal
  > for proper X11 override-redirect/ungrab/focus handling
  > - SIDEBAR_HIDE_ON_FOCUS_LOSS AtomicBool: when true (default), the focus
  > watcher hides the sidebar on Warframe focus loss and re-shows on regain
  > - Focus watcher: checks SIDEBAR_HIDE_ON_FOCUS_LOSS before hiding sidebar;
  > checks SHOWN_OVERLAYS before re-showing (prevents stale overlay re-show
  > after voluntary close)
  > - Focus watcher poll interval reduced from 2000ms to 500ms
  > - set_sidebar_hide_on_focus_loss Tauri command + startup sync from settings
  > - Settings.jsx: sidebar hide toggle with mount-sync and onChange handler
  > - Settings.jsx: removed sidebar subtext paragraph
  > - load_settings_sync made pub(crate) for reuse in overlay_utils
- **2026-07-19** `4fa59c5` — fix: auth token scan misses file-backed regions; overlays on wrong monitor
  > Bug 1 — auth token not found on Wine/Proton (Linux):
  > The native Rust scanner replaced the C++ helper but only searched
  > anonymous memory regions and capped region size at 64 MB. On Wine/Proton
  > the auth token URL can reside in file-backed writable PE data sections,
  > not just anonymous heap. Fix: include writable file-backed regions and
  > remove the 64 MB size cap (both Linux and Windows variants).
  > Bug 2 — overlays on wrong monitor (cross-platform):
  > rect_to_monitor() resolved the monitor via xcap's enumeration and stored
  > a raw index; get_overlay_monitor() later used that index against Tauri's
  > (GDK's) monitor list, but xcap and GDK enumerate in different orders.
  > Fix: replace the xcap-index round-trip with warframe_monitor(), which
  > does containment matching directly against Tauri's own monitor list.
  > Also added fetch_warframe_rect_from_active_window() fallback for Wayland
  > where xdotool is unavailable.
- **2026-07-19** `78d0753` — fix: relic picker overlay not closing from orbiter relic menu
  > Add TennoShipInputFilter trigger to close the relic picker overlay when
  > the orbiter relic refinement menu (ThemedProjectionManager.swf) is
  > closed. The existing MapRedux trigger only works in-mission; the orbiter
  > relic menu returns to the ship input filter instead of the map.
- **2026-07-19** `d286c92` — fix: overlay sizing, positioning, and opacity
  > - RelicPickerOverlay: content-aware window resize + opaque bg + 60% from left/5px top position
  > - RelicRewardOverlay: dynamic height from scrollHeight instead of fixed 380, top-anchored at bottom
  > - MonitoringContext: reduce relic picker columns from 10 to 5
  > - tauri.conf.json: set relic-picker, riven, and sidebar to transparent: false
  > - index.html: restore transparent CSS for remaining transparent overlays
- **2026-07-19** `86ffac2` — position and styling fix
- **2026-07-19** `f9d9f21` — bringing Windows up to date
- **2026-07-19** `b17fa91` — Windows update
- **2026-07-21** `261790e` — OCR wasnt using the monitor mismatch index bug
- **2026-07-22** `647ffd7` — fix: raise_x11 + set_always_on_top after backing-store invalidation so KWin stacking sticks
  > In both show_window_internal and resize_overlay_window, XRaiseWindow and
  > _NET_WM_STATE_ABOVE were applied before the 1x1-then-restore resize cycle
  > (backing-store invalidation). KWin processes ConfigureNotify events from
  > set_size and re-evaluates stacking, undoing XRaiseWindow and dropping the
  > window behind the game.
  > Fix: move raise_x11 and set_always_on_top to after the final set_size call
  > in both functions. The order is now: position, show, invalidate backing
  > store via resize, then raise + set AOT + set skip-taskbar + click-through.
- **2026-07-22** `184126e` — fix: restore monitor fallback for game overlays when Warframe isn't running
  > Commit f9d9f21 removed the current_monitor()/primary_monitor() fallback
  > from get_overlay_monitor for game overlays, causing show_window_internal
  > and resize_overlay_window to both fail with 'Warframe window not found'
  > when Warframe isn't running. This broke the relic reward test button
  > and any use of overlays outside of active gameplay.
  > The Windows fix (fetch_warframe_rect_sync with area-based window
  > selection) is independent and preserved.
- **2026-07-22** `04eae8e` — fix: re-measure overlay height when OCR results arrive
  > The resize effect only depended on [squadSize, triggerKey]. In the real
  > game flow, overlay-update-relics fires first (triggering a resize while
  > all slots still show LoadingSlot height), then overlay-update-ocr
  > arrives later with the actual reward data that makes RewardSlots much
  > taller (subcomponents, badges, etc.). The resize never re-fired, so the
  > window stayed at the loading-slot height and content was clipped.
  > Add ocrResults and localReward to the dependency array so the window
  > re-measures whenever content changes.
- **2026-07-22** `23c1275` — fix: skip backing-store invalidation on visible window resize to avoid flash
  > The 1x1 resize trick (set_size(1,1) then restore) forces WebKit to
  > discard its rendering surface, which is needed on first show to clear
  > stale content ghosts from hide/show cycles. But on incremental resizes
  > while visible (e.g. every overlay-update-ocr arriving with new content)
  > it causes a visible flash as the window shrinks to 1x1.
  > Fix: only do the backing-store invalidation when the window is hidden.
  > Visible windows handle set_size cleanly without WebKit surface issues.
  > Also add lastSizeRef in the frontend to skip the resize call entirely
  > when dimensions haven't changed.
- **2026-07-22** `059dc93` — fix: sync toggle state across windows, add manual refresh to inventory card
  > - Moved monitoring-active-changed IPC listener to its own useEffect
  > with empty deps so it's registered immediately on mount (not waiting
  > for data deps). Uses intervalRef.current instead of stale isMonitoring
  > closure to prevent double-start.
  > - Same fix applied to MirroredMonitoringProvider.
  > - Added small refresh icon to the compact inventory sync card for
  > one-off manual refresh regardless of monitoring state.
- **2026-07-23** `1d56779` — capture: fix grim geometry signedness (u32 wrap on negative monitor coords), re-add xcap::Window fallback
  > monitor.x()/y() return i32 and can be negative on multi-monitor setups;
  > as u32 cast wraps to ~4B producing 'invalid geometry' in grim.
  > Keep as i32 so format! produces e.g. '1920x1080+-1920+0'.
  > xcap::Window captures the Warframe XWayland window directly via XCB,
  > bypassing compositor issues on Wayland where Monitor capture returns blank.
- **2026-07-23** `f20da04` — pricer: eager init after model download, retry on OnceLock miss; overlay shows 'Pricing unavailable' fallback
  > get_pricer() now retries initialization if previous call found files not yet
  > downloaded.  ensure_loaded() called after background download completes so
  > the ONNX model is ready before user navigates to Rivens tab or opens overlay.
  > RivenOverlay shows a visible 'Pricing unavailable' message instead of hiding
  > the footer silently when rivenInfo is null.
- **2026-07-23** `7c5130d` — riven overlay: increase height to 300px, add more bottom padding to prevent meta section cutoff
- **2026-07-24** `7fd00e8` — Notes: replace sidebar with horizontal tab strip
  > Kill the two-pane grid/flex split (sidebar + editor). Single full-width
  > editor pane with a horizontally scrollable tab strip above the title row.
  > - Single-click a tab to select, double-click to rename inline
  > - X button fades in on tab hover for delete (reuses existing confirm dialog)
  > - (+) button at end of strip for new notes
  > - EditableTitle single-click rename on active file title still works
  > - No isOverlay branching needed -- same layout in both windows
- **2026-07-24** `78a5074` — Add price fetching to MirroredMonitoringProvider
  > - Import getPricesBatch from marketEngine
  > - Replace stub price states with real localStorage-backed state
  > - Add useEffect to auto-fetch prices after inventory loads
  > - Add refreshPrices callback with full price-fetching logic
  > - Wire allPrices, isPriceLoading, priceFetchProgress, priceLastUpdated
  > and refreshPrices into the context value so sidebar overlay consumers
  > can use price data
- **2026-07-25** `9f56674` — Add descendiaDesc to MirroredMonitoringProvider
  > Load descendia.txt, parse desc map, and pass to parseWorldstate()
  > same as MonitoringContext, so sidebar overlay shows tooltips too.
- **2026-07-27** `b764934` — In app wiki (bug in sidebar)
- **2026-07-27** `1795975` — wiki in sidebar (bug: cant close sidebar anymore)

## 10. Other / Misc

*225 commits*

- **2026-03-16** `7001c00` — Initial commit
- **2026-03-16** `860a637` — Update gitignore
  > Include maps and mastery slates
- **2026-03-27** `9765e70` — fetch big images from repo
- **2026-03-27** `70994c5` — information update
- **2026-03-27** `0f9ba6d` — information update
- **2026-03-28** `0e00fcb` — inventoryparser fix
  > made amps show components again and weapons actually show in category filters
- **2026-03-28** `9abee9a` — relics
  > layout redone, rewards fixed
- **2026-03-28** `693d749` — Fixed rank up screen
- **2026-03-30** `3f02cff` — github pages first draft
- **2026-03-30** `d0dba60` — technical overview added
- **2026-03-30** `cadfdef` — github actions
- **2026-03-30** `35c08a8` — general revamp + documentation
- **2026-03-30** `2560ed3` — further doc
- **2026-03-31** `5961074` — checklsit reformat and timed
- **2026-04-01** `24be143` — ventkids increase contrast
- **2026-04-01** `d4ddf2c` — bold
- **2026-04-01** `89c6ace` — readme update
- **2026-04-01** `c120278` — no need for token
- **2026-04-01** `a574b6b` — attempt #3
- **2026-04-02** `4ef5a48` — attempt #4
- **2026-04-02** `78adf5a` — attempt #5
- **2026-04-02** `9a79444` — attempt #6
- **2026-04-02** `5f785ae` — attempt #7
- **2026-04-02** `d9b04bf` — license added. readme updated
- **2026-04-02** `c305d85` — attempt #8
- **2026-04-02** `a93d3a7` — attempt #9
- **2026-04-03** `a780edb` — attempt #10
- **2026-04-03** `4f7f9cc` — attempt #11
- **2026-04-04** `ca484c6` — attempt #12
- **2026-04-04** `82e32dc` — attempt #13
- **2026-04-05** `5e7bc82` — Events fix: boosters and shadowgrapher
- **2026-04-06** `d3f42d4` — foundry update
- **2026-04-06** `a6ec821` — Foundry done
- **2026-04-06** `2a69b4a` — loading screen added
- **2026-04-09** `41d94a6` — noti sounds
- **2026-04-11** `1249b21` — bug: notis not going away
- **2026-04-14** `e6a5946` — notification settings and themes
- **2026-04-14** `6ba4b8e` — lil cleanup
- **2026-04-14** `fa23e10` — add subcompoennts back to inventory
- **2026-04-14** `ad3237a` — page revamped
- **2026-04-15** `964e113` — Expand credits section and fix links
- **2026-04-15** `096f3b1` — noti settings dev env cleared
- **2026-04-15** `3687f31` — Add welcome note template and fix external overwrite (#6)
- **2026-04-15** `0996707` — Issue templates
- **2026-04-15** `efec85c` — Bump version to v0.2.0
- **2026-04-15** `be9ca58` — #3 Second attempt
- **2026-04-15** `bcb606b` — #2 Notification sounds path updated
- **2026-04-15** `95b7611` — #3 Third attempt
- **2026-04-16** `4019fa1` — local prod app image building shortcut
- **2026-04-16** `0263351` — #7 Disclaimed added
- **2026-04-16** `1766eb9` — #3 Fourth attempt
- **2026-04-16** `7e26ee9` — no idea
- **2026-04-16** `ed824cd` — #9 fixed, dynamic reload
- **2026-04-16** `b5dd50f` — #2 Noti sounds work in prod
- **2026-04-16** `ffabd42` — #9 visual spinner for dynamic reload
- **2026-04-16** `f759395` — #8 Foundry and Filter buttons labelled
- **2026-04-16** `9226083` — #10 Working on Linux now
- **2026-04-16** `e0aab95` — chore: bump version to v0.3.0 and link tauri config
- **2026-04-16** `730f1cc` — #7 Disclaimed now saved
- **2026-04-16** `c54d9fe` — #12 Settings now persistent
- **2026-04-16** `a7669a5` — #3 Links should now work
- **2026-04-16** `1e0a6fa` — #2 Notification sounds fixed
- **2026-04-16** `519a843` — #2 Sound files should be bundled now
- **2026-04-17** `0d49367` — #2 what about now
- **2026-04-17** `d0ba21c` — #2 oh my god
- **2026-04-17** `d7a4546` — #3 Syntax fixed
- **2026-04-17** `c2b39a6` — #2 #10 #13 Mix
- **2026-04-17** `229ed6c` — #2 #10 #13 Only relic refresh remaining
- **2026-04-17** `0dfa99a` — #2 #10 #13 fully fixed
- **2026-04-17** `8c55814` — bump version to 0.3.1
- **2026-04-17** `8b9a6d1` — #3 attempting custom rust command
- **2026-04-17** `0028f2c` — #3 add more fallbacks
- **2026-04-17** `142a9e6` — #3 rust crate opener
- **2026-04-17** `a0a82bd` — #3 xdg-open + fallback
- **2026-04-17** `2b92c72` — #3 xdg-open env -i
- **2026-04-17** `20349cb` — #3 path scrubbing
- **2026-04-17** `ba1e2f0` — #3 never give up
- **2026-04-17** `c52e61b` — chore: bump version to 0.3.1 for release
- **2026-04-17** `33eeb53` — style: remove rocket emoji from release notification
- **2026-04-28** `8dcad6c` — docs: add Discord button to hero section
- **2026-04-28** `0c0322d` — Fix
- **2026-04-29** `106d438` — General revisioning
- **2026-04-29** `2176351` — chore: bump version to 0.4.1
- **2026-04-29** `f2785fe` — fix: remove duplicate import and bump to 0.4.2
- **2026-04-29** `98ee5eb` — discord lf
- **2026-04-29** `5965455` — discrod
- **2026-04-30** `ffc51c6` — #2 Fixed: Notification sound latency and migration to WAV
- **2026-04-30** `fc0d4ac` — Purged WFCD references
- **2026-04-30** `02f24d6` — #15 Fixed: General notifications infrastructure and logic
- **2026-04-30** `d87e353` — #20 Fixed: Backend support for HTTP API and global hotkey commands
- **2026-05-01** `e94939f` — #2 Fixed: Moved audio assets to data/audio and updated path resolution
- **2026-05-01** `b2d3e84` — Bump version to 0.4.3
- **2026-05-01** `3e3793b` — Bump version to 0.4.4
- **2026-05-02** `1890666` — Fix: Discord webhook only fires on release published, not edited
- **2026-05-02** `4f161b9` — #10 fix(notifications): shorten syndicate waste message and improve fit
- **2026-05-02** `9ab63a2` — Linux notis sound compatibility
- **2026-05-02** `3855102` — Bringing Linux up to date
- **2026-05-03** `61cdfbc` — #20 Hotkeys now peristent
- **2026-05-03** `18b2a3d` — Fix endless mission relic detection and round reset
- **2026-05-03** `2ab902c` — Fix compilation errors and warnings
- **2026-05-08** `ead319c` — #19 remove grouping when sorting or searching
- **2026-05-08** `9a8dd02` — Back To Top FAB
- **2026-05-08** `5ffecac` — Dynamic floating headers
- **2026-05-08** `6e8a3d7` — Improved Page Headers
- **2026-05-08** `c3acee6` — Remove excessive dev logging
- **2026-05-09** `f84bfc1` — bump version to 0.4.8
- **2026-05-12** `4c24f7e` — About: Version fetched from package.json
- **2026-05-19** `045f7e7` — #10 More Training
- **2026-05-19** `690404c` — #31 Fixed weekly reset calculation
- **2026-05-19** `affee14` — #29 Implemented
- **2026-05-19** `9f3e0ee` — #27 Prime Parts changed into Prime Sets
- **2026-05-19** `d347d21` — Better search results
- **2026-05-19** `f035924` — chore: bump version to v0.5.0
- **2026-05-20** `1d06996` — #26 Scaling properly implemented
- **2026-05-21** `691bfeb` — bump version to v0.5.1
- **2026-05-22** `bd20ae6` — #30 Notification Manager first draft
- **2026-05-22** `4f43f27` — Revise features and installation steps in README
  > Updated features and installation instructions in README.
- **2026-05-22** `e5c8aa8` — #33 Map markers
- **2026-05-22** `abdef82` — #24 Auto updater added
- **2026-05-22** `38e4fda` — Added Discord button to about page
- **2026-05-22** `5b5942f` — #24 Update indicator and startup check moved to App level
- **2026-05-24** `1ba0a35` — bump version to v0.5.2
- **2026-05-25** `7ecd5ad` — Archon Hunt modifiers and Descendia parsing
- **2026-06-01** `ca07505` — #40 chat notification - first draft
- **2026-06-01** `b56bd8a` — #37 mod card images from game cache - first draft
- **2026-06-01** `85170d5` — #38 archon hunt modifiers - first draft
- **2026-06-01** `31fff75` — chore: consolidate assets into data/assets/
- **2026-06-01** `0530cdb` — chore: misc docs and pnpm config
- **2026-06-02** `d0a7190` — bug: kill orphaned subprocesses
- **2026-06-02** `2ea4924` — Custom cursors added - two for now
- **2026-06-02** `bde3340` — Prime sets: show plat value
- **2026-06-02** `08887d7` — #37 Peely Pix & Railjack support, plat value and UI candy
- **2026-06-05** `d70e932` — linux dependency exclusion
- **2026-06-05** `8676ca3` — cleaned up bundling logic
- **2026-06-05** `0418fc6` — #37 Arcane support + move to mods tab
- **2026-06-05** `aa90f48` — optimized scheduling logic
- **2026-06-05** `9c57fdf` — setup screen added to first run disclaimer
- **2026-06-05** `18a85d3` — cursor linux fix
- **2026-06-05** `23119ba` — about screen updated
- **2026-06-05** `59ed3b2` — bump version to 0.6.0
- **2026-06-08** `37e2764` — feat: migrate to Tauri v2
  > - Bump dependencies: @tauri-apps/api/cli 1.5→2, tauri 1→2
  > - Replace v1 APIs: emit_all→emit, get_window→get_webview_window,
  > path_resolver→path().resolve(), global_shortcut_manager→plugin
  > - Migrate Rust code: main.rs, log_scanner.rs, ocr.rs,
  > overlay_utils.rs, pricer.rs
  > - Migrate frontend: @tauri-apps/api/tauri→core/event/window/app
  > imports, UpdateContext updater API (check→checkUpdate)
  > - Add capabilities/default.json for v2 permissions
  > - Update tauri.conf.json to v2 format, remove custom-protocol
  > - Strip hardcoded Linux env vars, add webkit2gtk-nvidia-quirk
  > - Update CI to tauri-action@v0
  > - Add Firefox scrollbar fallback, card hover effect,
  > filter arcanes out of All inventory tab
- **2026-06-08** `dccf0de` — perf: add native lazy loading to all mod card images
- **2026-06-09** `287f9ce` — Mods: Legendary Core fixed
- **2026-06-09** `7ac9607` — Minor fixes
- **2026-06-10** `91b980d` — mod "Scan Aquatic Lifeforms" fixed
- **2026-06-10** `beb0368` — Tauri confs per platform
- **2026-06-10** `d164570` — About updated
- **2026-06-10** `3903182` — gitignore: add build_int_win and build_int_linux dirs
- **2026-06-12** `3df8eeb` — UI eye candy
- **2026-06-12** `752a7aa` — Remove WhiteLine.png, handle LINE_SEPARATOR in code instead
- **2026-06-13** `0f2dc08` — slight fixes
- **2026-06-13** `14ee88f` — fix modular parts parsing
- **2026-06-13** `64af831` — Ayatan category added
- **2026-06-14** `0da2ce5` — tauri conf fix
- **2026-06-14** `ca80ddf` — losing sanity
- **2026-06-14** `073acfd` — ort swapped for tract
- **2026-06-15** `98c14e3` — broken bullshit
- **2026-06-15** `a0263fd` — attempt fix
- **2026-06-15** `d9623af` — fix: split merged text lines in find_text_lines via valley detection
- **2026-06-15** `536e919` — fucking hell finally
- **2026-06-16** `b36d35f` — Documentation Update
- **2026-06-16** `23b3315` — Config fixes
- **2026-06-16** `50230a3` — Config fixes
- **2026-06-16** `4740783` — Descendia.txt references cleaned up
- **2026-06-16** `d75758e` — Fix scanning consistency
- **2026-06-16** `0c596c1` — fix stats parsing to model data feeding
- **2026-06-16** `0107c9a` — dont hot reload on linux
- **2026-06-17** `1f580b8` — Documentation revamp (+manual refresh fixed)
- **2026-06-17** `034effc` — further doc fix
- **2026-06-17** `ba55081` — Shields fix
- **2026-06-17** `a355b91` — fix worjflow
- **2026-06-17** `93317b5` — fix: use npx instead of pnpm for tauri signer sign
- **2026-06-18** `d4239a6` — fix: use zstd compression instead of gzip
- **2026-06-18** `53d8da1` — fix: write key to file directly from secret, use private-key-path
- **2026-06-20** `94e9811` — fix: non-frame subcomponent were considered craftable
- **2026-06-22** `768f272` — perf: comprehensive performance audit across all tiers
  > Tier 1 (Startup jank): parseInventory deferred with setTimeout to yield frame; buildArchimedeaMap memoized to avoid repeated dict scans; craftable O(N²) lookups replaced with O(1) Map.
  > Tier 2 (Overlays/OCR): Fixed stale closure in RelicRewardOverlay showWindow/hideWindow; parallelized price fetching; pre-built lowercase weapon name index in RivenOverlay; OCR image processing optimizations (upscale 3x->2x, template rescaling cache, removed dead code).
  > Tier 3 (UI/Pricing): Memoized rivenKey in Rivens.jsx; deduplicated concurrent ensurePriceMap callers; fixed saveToCache in-memory cache update; fixed pricer crash on malformed ranking entries.
  > Tier 4: Replaced read_to_string+from_str with from_reader in load_all_exports; hoisted regex patterns in warframeUtils.
- **2026-06-22** `c6358dc` — slight edits to model
- **2026-06-22** `8f7ef20` — chore: bump to v0.6.2
- **2026-06-23** `d16cbad` — FAQ revamp
- **2026-06-23** `c098a74` — readme lil fix
- **2026-06-23** `4afe110` — readme lil fix
- **2026-06-24** `2a1f4bd` — feat: show incarnon evolution level with tooltip
- **2026-06-24** `19ab19a` — Merge branch 'master' of https://github.com/glowseeker/cephalon-kronos
- **2026-06-25** `57780cb` — Phrasing
- **2026-07-01** `abdbe14` — feat: add warframe-drop-data pipeline with in-game drop source tooltips
  > Downloads DropsAll.json from drops.warframestat.us alongside existing
  > exports, parses it into a per-item drop index via dropsParser.js, and
  > surfaces mission/relic/enemy/bounty sources as hover tooltips in the
  > inventory screen. Also adds 'description' field to all parsed inventory
  > items and browse.wf->content.warframe.com image fallback for broken
  > icon URLs.
- **2026-07-01** `157619a` — make scrollbar thicker
- **2026-07-01** `a06f56d` — only black flash remaining
- **2026-07-06** `c9c8cc6` — unified sound playing logic
- **2026-07-06** `be2607e` — dupe line
- **2026-07-09** `5ae776a` — chore: bump version to 0.6.3
- **2026-07-10** `efcb7c5` — shortcuts werent wired up
- **2026-07-10** `5d48e39` — more logging
- **2026-07-12** `007e6a5` — working rough
- **2026-07-12** `84e8c2a` — cleanup diff
- **2026-07-12** `42b33cb` — fixed multi notification bug and tauri v1 remnant
- **2026-07-14** `606693d` — cosmetics
- **2026-07-14** `b49009d` — merge start/stop into single toggle button with manual refresh
- **2026-07-15** `1d0e5f5` — chore: bump version to 0.6.4
- **2026-07-16** `91872bb` — fix: register frontend-ready listener before blocking asset extraction
  > The frontend-ready event listener was registered after extract_bundled_assets(),
  > a synchronous blocking I/O call. If the webview loaded quickly (e.g. on a fast
  > SSD or when assets were already cached), JS could emit frontend-ready before
  > the listener existed, losing the event permanently and keeping the window
  > hidden.
  > Reorder so the listener is registered first. Also add a 5s force-show
  > fallback as a safety net, and upgrade tauri-action from v0 to v2.
- **2026-07-18** `7099b62` — fix: rewrite relic reward timer with Date.now() and simplify state
  > - Timer rewritten to use Date.now() elapsed time instead of setInterval.
  > JS timers are throttled when the WebView is hidden (Win+D / alt-tab);
  > Date.now() always returns accurate wall-clock time, so the overlay
  > closes at the correct moment regardless of visibility.
  > - Removed isClosing state, windowVisible state, and windowVisibleRef.
  > Uses showingRef for hideWindow/showWindow guard.
  > - Removed CSS animation classes (animate-in fade-in zoom-in) and the
  > isClosing CSS transition — simplifies to a plain inline-block div.
  > - Close timer delay reduced from 500ms to 10ms.
  > - Safety guard: if the window is re-shown without data (focus watcher
  > race past timer expiry), hide it immediately.
  > - index.css: overflow hidden on overlay body to prevent scrollbar flash.
- **2026-07-18** `e38cb9d` — chore: bump version to 0.6.5
- **2026-07-18** `81194fe` — fix: cast MAX_READ_SIZE to u64 before .min() call
  > best_end and best_va are u64, so .min() expects u64. The
  > sibling code at line 422 already had the correct cast.
- **2026-07-19** `9d12a23` — chore: bump version to 0.6.6
- **2026-07-20** `cbca409` — chore: bump version to 0.6.7
- **2026-07-20** `fc14364` — linting
- **2026-07-20** `c80604c` — fix: distinguish Archon Hunt from Arbitration elite alert modifiers via timestamp
  > The EliteAlert: generated boosts for line in EE.log fires for both
  > Archon Hunt (weekly, at boot) and Arbitration (per-mission). Use
  > the log timestamp to differentiate: first occurrence within 180s of
  > the earliest line is the Archon Hunt one; subsequent ones are Arbitration.
  > - Rename: expecting_arbitration_boosts -> expecting_elite_alert_boosts
  > - Add min_ts tracking for timestamp-based classification
  > - Emit separate events: archon-hunt-modifiers / arbitration-modifiers
  > - Show modifiers with icons in a 2x2 grid under both cards
  > - Label as 'Personal Bonuses'
- **2026-07-20** `e8da3b0` — Relic picker now opaque
- **2026-07-20** `82177c8` — chore: bump version to 0.6.8
- **2026-07-21** `99bbe7c` — chore: bump version to 0.6.9
- **2026-07-22** `2ce6753` — fix: show yellow cached indicator when Warframe offline with cached data
  > The autostart flow has a race: the sidebar overlay starts monitoring
  > before its init finishes loading cached inventory, so hasCachedDataRef
  > is still false when callApiHelper fails. Instead of relying on the ref,
  > the failure path now calls sidebar_load_inventory at failure time to
  > check if cached data exists. Also caches the result in hasCachedDataRef
  > for subsequent checks.
  > New state:
  > - monitorResult='cached' → yellow dot, text 'Game not running, using cached data'
  > - monitorResult='error'   → red dot,   text 'Could not connect to Warframe'
  > - (success path unchanged)
  > Also removes the raw error message from the catch to avoid scary
  > 'Error: Warframe not running' text — the cached/error distinction
  > is semantically clearer.
- **2026-07-22** `59146cd` — fix: show countdown in cached status text, add nextRetryAt tracking
  > - Changed 'Waiting for Warframe (showing cached data)' to
  > 'Waiting for Warframe (next attempt in Xs)' with live countdown
  > - Added nextRetryAt state to both MonitoringContext and
  > MirroredMonitoringProvider, updated on each monitoring interval tick
  > - Added 1s tick interval in Settings to refresh countdown display
- **2026-07-22** `ecd987d` — chore: bump version to 0.7.0
- **2026-07-23** `eaf7545` — wfcd checkpoint
- **2026-07-24** `eff8585` — ModCard: move useState before early return guard
  > Hoist hovered state declaration above the isSticker early return
  > so the hook call order is consistent on all render paths
- **2026-07-24** `378f30e` — Notifications fix
- **2026-07-24** `ea8d136` — Merge branch 'warframe-items-migration'
- **2026-07-25** `f9db736` — Implement Descendia floor descriptions with hover tooltips
  > - Load descendia.txt via load_txt_file in MonitoringContext
  > - Parse description map in MonitoringContext, pass to parseWorldstate
  > - Add missionTypeDesc/penanceDesc fields to each stage in parser
  > - Wrap missionType/penance text with Tooltip in Dashboard renderDescendia and DescendiaModal
  > - Add tooltips for both regular floors and special floors (Marie/Lyon/Roathe)
- **2026-07-25** `076f874` — Fill descendia.txt with all known penance and mission type keys
  > Added 18 missing penance entries (NC_SlipAndSlide, MineField,
  > etc.) and 5 missing mission type entries (DT_LOOT, DT_UNIQUE,
  > DT_NETRACELLS, DT_SABOTAGE_HIVE, DT_EXCAVATION).
  > All keys from DESCENDIA_PENANCES and DESCENDIA_MISSION_TYPES maps
  > now have entries. Descriptions are wiki-informed placeholders —
  > swap with worldstate-localized strings as they become available.
- **2026-07-25** `e98042f` — desc: fill all worldstate descendia keys with descriptions
  > - Add all 49 challenge keys from 5-week rotation to descendia.txt
  > - Add all 21 mission type keys including DT_SHRINE_DEFENSE
  > - Distinguish NC_ (no-combat) variants from normal penances
  > - Add all missing keys to DESCENDIA_PENANCES / DESCENDIA_MISSION_TYPES maps
  > - Fix 99TankP1 numeric-key syntax error (quote it)
  > - Remove bogus buff/debuff specifics for protoframe encounters
- **2026-07-25** `84d0dea` — Add in-game custom markers import (issue #6)
- **2026-07-25** `e6d66ba` — Integrate import/export into issue #11 pattern
  > - Add write_file/read_file Tauri commands for absolute-path I/O
  > - Create lib/shareBundle.js with exportBundle/importBundle helpers
  > - Maps.jsx: Export/Import buttons in config panel (file dialogs)
  > - Refactor game marker import to populate ALL maps at once
  > - Import regenerates IDs to avoid collisions
- **2026-07-25** `65e13d5` — Fix: restore missing mapTabs const that was dropped during refactor
- **2026-07-27** `78bdc82` — tabs working
- **2026-07-27** `8363a4e` — tabs in both modes (bug: name not refreshing + black screen until reclicking)
- **2026-07-27** `20d8d9b` — New tabs work (bug: tab name not updated)

## 2. Screen Capture (Wayland/X11/xcap)

*6 commits*

- **2026-06-05** `ddb905d` — disable WebKit compositing on Linux to fix EGL/GBM AppImage crash
- **2026-06-18** `9788357` — fix: replace lib stripping with LD_PRELOAD workaround for EGL_BAD_PARAMETER
- **2026-06-21** `c30593c` — redesign landing page with GLB model, updated screenshots, and wiki FAQ
- **2026-07-09** `a80a2e9` — chore: remove dead code, add OCR fallback capture path
  > - Remove unused XGetGeometry FFI declaration
  > - Remove unused #[cfg(target_os = "linux")] update_sidebar_position
  > (Linux enter_sidebar_mode has its own inline positioning)
  > - Extract capture_monitor_image() helper with Linux fallback chain:
  > xcap Monitor -> xcap Window (XWayland) -> spectacle -> import
  > - Use capture_monitor_image in ocr_riven_card for consistent capture
- **2026-07-13** `c519224` — fix: disable WebKit compositing mode on Linux to prevent EGL_BAD_PARAMETER white/grey screen crash (tauri-apps/tauri#9394)
- **2026-07-23** `c61e510` — capture: restructure fallback order, add buffer validation, fix grim geometry (fixes blank/corrupt screenshots on Wayland)
  > settings: remove duplicate Inventory Syncing card, keep compact version under Notifications & Overlays
  > sync: fix MirroredMonitoringProvider toggle state not updating (guards ran before setState)
  > relic-picker: remove era header line, embed tier in column titles (fixes overlay overflow when game prepends banner)
  > omnia: parse VoidT6 from mission JSON, fallback multi-tier squad detection, skip tier filter on frontend

## 3. OCR / Riven Parsing / Relic Reward Detection

*26 commits*

- **2026-03-27** `48eb951` — fix bow and archgun rivens
- **2026-03-28** `a05b33c` — riven slight layout increase
- **2026-04-28** `3361d91` — Checkpoint: Custom Trained OCR
- **2026-04-30** `42e38aa` — #20 Fixed: Global hotkeys registration and OCR trigger integration
- **2026-05-01** `b3cf099` — #15 Fixed: OCR accuracy and fuzzy matching for non-prime rewards (Slivers, Ayatans, Requiem)
- **2026-05-07** `51566a6` — Fissure OCR 2.0
- **2026-05-09** `2ccdf1b` — OCR Model updated with another theme
- **2026-05-21** `f4254db` — #23 Requiem mods OCR support
- **2026-05-25** `33e53e0` — Switch from Tesseract to ocr-rs
- **2026-06-01** `11f5567` — add riven pricing trained model files
- **2026-06-01** `7debbd3` — chore: add warframe-api-helper.exe binary, block ocr-models and Warframe-Exporter-CLI from git
- **2026-06-08** `db6c9eb` — cleanup: remove Tesseract CI, dead code, debug PNGs, fix README/webkit for tauri v2
- **2026-06-12** `55e8317` — Riven Mods now use assets too
- **2026-06-13** `e03de47` — feat: load effect_to_url_name.json in pricer for OCR stat name normalization
- **2026-06-14** `eb8ba67` — feat: riven pricer integration with self-contained training pipeline
- **2026-06-15** `5b1eafa` — Rivens fix
- **2026-06-15** `08cf7bf` — fix: debug crop path, parser stat name extraction, mid-mission relic start
- **2026-06-15** `6416ecb` — fix: use camelCase for save_crop param, verbose debug log
- **2026-06-15** `d0c4454` — fix: remove double invert in OCR engine, lower line threshold to 5%
- **2026-06-15** `9fd8c02` — OCR on Riven done, now pass to model
- **2026-06-16** `89d33bf` — Add 500ms initial delay to relic reward OCR scan
- **2026-06-17** `320a19d` — Riven debug removed
- **2026-06-20** `abc9af7` — only Rivens worth <15p will be suggested for dissolving
- **2026-06-20** `010ba45` — Removed illogical riven suggestion altgoether, more sensible to judge by reroll potential
- **2026-07-20** `683a1ff` — OCR more fallback
- **2026-07-22** `301c672` — Added logging to OCR pipeline

## 4. Memory Scanning / Log Scanner / Process Detection

*22 commits*

- **2026-04-15** `c8ac1bd` — Run api helper silently
- **2026-04-28** `b2d91b1` — feat: add scanner status indicator to Settings UI
- **2026-05-25** `b590495` — API Helper Fork
- **2026-06-08** `da882f4` — CI: build helper from repo source via Soup submodule
  > - Add Soup as submodule at lib/soup/
  > - Create build_macos.sh for macOS helper builds
  > - Default SOUP_DIR to submodule path in all build scripts
  > - Rewrite release.yml to build helper from helpers/main.cpp
  > instead of external warframe-api-helper repo
  > Hide lib/soup/ from editor indexing via .gitignore
- **2026-06-10** `46129d0` — fix cmd flash on disabling scanner
- **2026-06-11** `007ea52` — Log Scanner fixed
- **2026-06-15** `58dcc2d` — notification for scanner
- **2026-06-16** `c2bca74` — Scanner fix
- **2026-07-09** `f00632c` — fix: log scanner PID cache, launcher latching, and --pid passthrough
  > - Cache discovered Warframe PID and verify via /proc/<pid>/status
  > stat instead of re-scanning all 300+ /proc entries every poll
  > - Distinguish game binary (Warframe.x64.exe) from launcher via
  > is_game_process() on Linux — prefer the process with .x64 in name
  > - Move EVER_HOOKED from static to local so notification refires on
  > scanner toggle off/on without spamming on helper restarts
  > - Clear PID cache on every helper failure so a fresh scan discovers
  > the game when it launches alongside the launcher
- **2026-07-09** `811b823` — fix: add --pid argument to warframe-api-helper
  > When --pid=N is passed, readLogBuffer calls Process::get(N) directly
  > instead of scanning by name (Process::get("Warframe.x64.exe")). This
  > lets the Rust scanner tell the helper exactly which process to attach
  > to, bypassing the helper's independent discovery which could pick the
  > launcher over the game binary.
- **2026-07-12** `2bbe223` — Deduplicating scanner notification
- **2026-07-14** `8da60fd` — perf: cursor-based helper read, adaptive poll, PID cache stale-instant fix
  > - Cursor-based incremental buffer diff (byte-by-byte) instead of full memory dump
  > - --poll-ms=N flag (clamped 50-2000), dynamic poll via /tmp/kronos/helper_poll_ms
  > - --profile flag for per-cycle timing (KRONOS_PROFILE_HELPER=1)
  > - PID cache: stale_instant() seeds OnceLock in the past so first /proc scan
  > always runs (was delaying Warframe detection up to 5s on scanner start)
  > - Adaptive poll: 150ms during fissure/reward, 400ms idle, signaled via shared file
  > - FxHashSet dedup (rustc-hash) for log line deduplication
  > - Focus watcher wired on scanner-hooked event, stopped on scanner stop
- **2026-07-14** `a6b68ab` — remove duplicate scanner-hooked notification toast
- **2026-07-17** `f6c5831` — API helper replaced by native implementation
- **2026-07-17** `bcb44b1` — replace byte-level delta-diff with full-buffer re-parse + hash dedup (circular ring buffer breaks extract_new)
- **2026-07-20** `153deb7` — fix: scanner fails to detect Warframe launched after scanner is on
  > Drops the 5-second PID-cache miss-TTL entirely — /proc scanning is
  > microseconds of work and happens at most every 2s in the wait loop,
  > so the TTL was solving a non-existent cost problem.  The alive-PID
  > fast path is kept (avoids re-scanning on every 50ms poll tick while
  > hooked), but every miss now unconditionally re-scans.
  > Adds three clear_pid_cache() call sites: in stop_scanner (already
  > existed but now uses the helper), in the initial-validation error
  > path (launcher PID vs game PID mismatch), and in the steady-state
  > error path (mid-session PID death, e.g. game restart).  The steady-
  > state path also resets ever_hooked + stops the focus watcher so the
  > status returns to 'active' (green) after re-validation succeeds.  A
  > last_pid_for_discovery tracker resets discovery_attempts when the
  > PID changes, ensuring the new process gets a full discovery window.
- **2026-07-20** `f5fa837` — remove repo-pushed memory_offsets.json VA default, keep local cache
  > The memory offset for the EE.log ring buffer was previously pushed to the
  > repo as data/export/memory_offsets.json and fetched on startup. The
  > dynamic discovery (discover_ring_buffer) works reliably, so the repo-
  > pushed default and its download infrastructure are unnecessary.
  > - Remove load_offsets(), offsets_path(), and the data file
  > - Remove the 24-hour download loop for memory_offsets.json in main.rs
  > - Keep load_offset_cache() / save_offset_cache() for local disk caching
  > of the last discovered VA (fast path on subsequent launches)
- **2026-07-22** `10c048a` — remove: EE.log file path — scanner reads ring buffer from memory, not disk
  > The scanner pipeline has been purely memory-based for a while:
  > get_warframe_pid() scans /proc (Linux) / Windows API independently,
  > and reads the EE.log ring buffer from the process's virtual address
  > space. The ee_log_path on disk was never passed to spawn_memory_watcher
  > and served only as a vestigial existence check.
  > Removed:
  > - ee_log_path state/UI from Settings (picker, path hints, unused text)
  > - EE.log onboarding section from App.jsx
  > - validate_log_path Tauri command (unreferenced)
  > - log_scanner_path from AppState
  > - path parameter from start_log_scanner
  > - Autostart scanner-on-mount path check
  > Kept: In-Game Scanner toggle + status dot in Settings (simplified, no
  > path), and auto-start-on-mount with just start_log_scanner().
- **2026-07-22** `aaac41d` — remove: scanner subtitle text in Settings
- **2026-07-22** `678ce79` — rename: In-Game Scanner -> Log Scanner with subtext
- **2026-07-22** `baa7536` — fix: remove extra bottom margin on scanner status row
- **2026-07-22** `f75147c` — refactor: grid inventory sync + log scanner, remove auto-start toggle
  > - Put Inventory Sync and Log Scanner in a 1x2 grid under Notifications
  > (left: inventory sync toggle, right: log scanner toggle)
  > - Removed auto-start toggle from Monitoring section Options card
  > - Added auto-start on mount in MonitoringContext initState effect
  > - Inventory sync toggle calls setAutoStart + start/stopMonitoring
  > so it persists and auto-starts on next launch

## 5. Pricing / Warframe.Market Integration

*14 commits*

- **2026-04-30** `6a3b8bb` — #19 Fixed: Warframe Market implementation and Expected Value calculations
- **2026-04-30** `2a45116` — #19 Fixed: Warframe Market pricing cache and Relic UI refinements
- **2026-06-05** `2cbe6f4` — centralized market fetching
- **2026-06-08** `b3e35e0` — fix: append _blueprint slug variant for WFM prime component prices
- **2026-06-08** `5685e07` — fix: register http plugin for WFM API requests
- **2026-06-08** `2ade2dd` — fix: raise FD limit to 65536 via setrlimit, safe WFM response parsing
- **2026-06-09** `54445ee` — Price fetching improved
- **2026-06-10** `2577a93` — Pricing improvement (now uses market-engine)
- **2026-06-14** `6d2d29d` — Pricer Model path fix
- **2026-06-22** `386e7d0` — fix: autoupdater sig filename handling and unbundle pricer models
  > Autoupdater: Fixed sig file lookup in generate-updater-json to use dynamic find instead of hardcoded hyphens, handling space/hyphen variants of the product name. Added workflow_dispatch trigger for manual regeneration.
  > Pricer Model: Removed from bundle resources on all platforms so model updates don't require an app release. Added check_pricer_models call to frontend startup for user-visible status.
- **2026-06-22** `fb8b927` — fix: correct pricer model and media asset URLs from main to master
  > Repo default branch is master, not main. Both download URLs referenced main, causing 404 on pricer model download (blocking startup) and silent failures on media asset downloads.
- **2026-07-18** `5f619b5` — fix: correct sync state on manual refresh + rename API Active + price fallback
  > - manualRefresh now resets monitorResult to 'idle' when monitoring was not
  > active (prevents false 'success' indicator after a one-off manual sync)
  > - Removed stale scanner-hooked listener in MirroredMonitoringProvider that
  > unconditionally set monitorResult to 'success' on every scan hook
  > - Renamed 'API Active'/'API Error'/'API Offline' to 'Inventory Sync'/'Inventory
  > Sync Error'/'Inventory Sync Offline' in App.jsx and SidebarOverlay.jsx
  > - MonitoringContext: moved allPrices to a useRef (allPricesRef) so relic
  > enrichment callbacks always read the latest prices instead of a stale closure
  > - MonitoringContext: added market_engine_prices fallback in allPrices
  > initial state when WFM price cache is empty
- **2026-07-20** `ad0cd8f` — add FlashSales market sales section and wishlist modal
  > - Parse FlashSales from worldstate (active time-limited discounts)
  > - Display Market Sales card below Darvo's Deal with icons and prices
  > - Add visibility toggle for Market Sales in dashboard settings
  > - Add Wishlist button in Market Sales card header
  > - Add WishlistModal showing player's wishlist items with icons
  > (mirrors Baro's Inventory modal pattern)
- **2026-07-23** `c42ca85` — pricer: fix OnceLock caching permanent failure on early call before model download completes
  > get_pricer() now uses OnceLock<RivenPricer> with a retry path: if init fails
  > (files not yet downloaded), the OnceLock stays uninitialized and subsequent
  > calls will retry. Also added a fallback 'Pricing unavailable' message in the
  > RivenOverlay when rivenInfo is null, so users can see pricing is missing
  > rather than the footer being silently hidden.

## 6. Linux Build / Packaging

*16 commits*

- **2026-04-02** `2cabe04` — appimage fixes
- **2026-04-03** `14b8c59` — uncached UI fix + noted + prod debug
- **2026-04-14** `f28d69a` — syntax/debug cleanup
- **2026-05-02** `ad23b7b` — fix(linux): exclude core system libs from bundle to prevent GLIBC version conflict
- **2026-06-08** `9bce711` — fix: restore exporter command args, extract inner AppImage in CI, register updater plugin
  > fix: use updater Builder::new().build() and move was_visible into linux cfg
- **2026-06-17** `4c1add8` — .deb and AppImage patching for libraries
- **2026-06-17** `d184c98` — fix: merge duplicate env blocks in AppImage patch step
- **2026-06-17** `6287988` — fix: nest deb deps under bundle.linux in tauri.linux.conf.json
- **2026-06-18** `22142c1` — fix: add debug tracing to AppImage patch step
- **2026-06-18** `3301543` — fix: bump version to 0.6.1, find AppImage dynamically
- **2026-06-18** `21f4b82` — fix: add deb to bundle targets
- **2026-07-12** `73badcc` — appimage fix attempt
- **2026-07-14** `aeda6e7` — fix: Nvidia-only compositing gating, GStreamer warning suppression
  > - Default CPU compositing only on Nvidia (detected via /proc/driver/nvidia or nvidia-smi)
  > - AMD/Intel keep EGL/GPU hardware acceleration
  > - Override env vars: KRONOS_CPU_COMPOSITING=1, KRONOS_GPU_COMPOSITING=1
  > - Suppress GStreamer diagnostic output via GST_DEBUG=*:0
  > (user override respected if set before process start)
- **2026-07-20** `d3b5003` — fix: add missing use std::fs import for Linux build
- **2026-07-21** `bb8749c` — fix: AppImage update hangs — download new AppImage alongside, launch it, then close
- **2026-07-22** `be0ebda` — fix: debounce TennoShipInputFilter close to prevent false-trigger on picker init
  > TennoShipInputFilter fires both on picker open (6ms after
  > Created ThemedProjectionManager.swf, during init) and on close
  > (~17s later for a starchart close). The open-time firing was
  > clearing relic_picker_open prematurely, causing the subsequent
  > MapRedux and TennoShipInputFilter close triggers to be no-ops.
  > Add relic_picker_opened_at timestamp and a 500ms debounce guard
  > so only the close-time firing is acted upon.

## 8. CI / Release / Signing

*27 commits*

- **2026-03-30** `8165224` — circuit images
- **2026-03-30** `e499d7d` — circuit layout slightly better?
- **2026-04-01** `1716178` — checklist syndicate redesign + app icon fix
- **2026-04-01** `0a17388` — fixed github action workflow
- **2026-04-14** `2ac6ee4` — actions workflow revised
- **2026-04-17** `56d26a8` — feat: add discord release notification workflow
- **2026-04-29** `e5b128f` — Fix Discord Release Workflow
- **2026-04-29** `3c1a8a1` — Discord Workflow LF fix
- **2026-05-01** `44c6a1c` — #19 Fixed: Relics screen pricing UX and Requiem rewards display
- **2026-05-08** `41dea07` — Dashboard: Circuit shows owned rewards
- **2026-05-19** `1820e29` — #28 Exceptions for known errors and special characters added
- **2026-06-02** `b437ae2` — CI: Bundle exporter + workspace config
- **2026-06-05** `b06927e` — inventory foundry design fixes, owned filter, plat fetching
- **2026-06-14** `4a99b74` — fix: pin allocator dependencies to resolve brotli E0277 version conflict
- **2026-06-18** `9a4cefe` — fix: use local node_modules/.bin/tauri for signing
- **2026-06-18** `11275ac` — fix: use pnpm exec tauri for signing
- **2026-06-18** `44c4157` — fix: use private-key-path for signing instead of inline key
- **2026-06-18** `7972b29` — fix: use TAURI_SIGNING_PRIVATE_KEY env var for Tauri v2
- **2026-06-18** `ad54402` — fix: clean key whitespace and fix base64 padding before signing
- **2026-06-20** `087396c` — Circuit data adapted
- **2026-06-22** `65d65a3` — feat: add crafting ingredient badge for weapons needed in recipes
  > Builds a reverse ingredient index in inventoryParser.js mapping each item to recipes that consume it. Adds a yellow badge with tooltip in Inventory.jsx showing which recipes need the item. Only shown on full equipment, not resources/parts.
- **2026-07-01** `80cbf31` — calendar slight spacing fix
- **2026-07-09** `0de4336` — fix: add packages field to pnpm-workspace.yaml for pnpm 9+
- **2026-07-12** `187df16` — disable uploadPlainBinary in release workflow
- **2026-07-16** `cb13943` — revert: keep tauri-action@v0 (unrelated to the fix)
- **2026-07-24** `2326ac9` — Fix circuit reward names: resolve through resolveItemName instead of raw API strings
  > CeramicDagger and similar raw API choice names now go through
  > resolveItemName (with mergedDict), producing proper display names
  > like 'Ceramic Dagger' instead of the concatenated code name.
- **2026-07-25** `076bc78` — Fix: restore missing lucide-react imports in Maps.jsx

## 9. UI / React Frontend / Data Display

*86 commits*

- **2026-03-28** `ea62e9a` — notes reading mode fix
- **2026-03-28** `e3beca5` — archimedea edge case update
- **2026-03-28** `702e5ba` — Inventory update
  > fixed foundry with time remaining and parsing, 3 more Exports that get downloaded, inventory now shows item's forma count with a badge
- **2026-03-30** `92f6ca3` — archimedea: modifier and layout fixes
- **2026-03-30** `963e2e2` — nightwave update
  > added rewards, images, rank, all kinds of info
- **2026-03-31** `aec54ca` — 1999 calendar added
- **2026-03-31** `deaa4f5` — checklist: standings added
- **2026-03-31** `26b71b8` — archimedea edge case update
- **2026-04-01** `aacac4b` — icon rebrand, asset relocation, cleanup
- **2026-04-01** `e54c0aa` — increase icon size in navbar
- **2026-04-02** `0cf68a2` — icon build
- **2026-04-02** `278ffe5` — update icon conf
- **2026-04-02** `a0141ce` — feat: update navbar icons
- **2026-04-02** `f3d4834` — navbar accent color fix
- **2026-04-04** `38a3eed` — dashboard fix??????
- **2026-04-04** `8d55365` — inventory: fix subheader, nightwave rank up fix
- **2026-04-05** `7b4c088` — inv cache modal, invasion redesign, noti placeholder, nightwave level fix
- **2026-04-05** `e91f71e` — dev build notes fix
- **2026-04-05** `d7221e6` — navbar fixes
- **2026-04-05** `f82776f` — nightwave cache fix
- **2026-04-07** `657d14f` — feat: implement component blueprint ingredient tracking and add interactive tooltips to inventory items
- **2026-04-13** `d0df839` — styling improvement
- **2026-04-14** `1c58d0c` — theming fixes
- **2026-04-14** `f48ab82` — invasion, 1999 and inventory fixes
- **2026-04-15** `98a604b` — quick webpage fix
- **2026-04-15** `270ccd2` — fixed webpage images
- **2026-04-15** `d76f77e` — Mastery Parsing Improvements (#1)
- **2026-04-15** `08b511b` — Mastery Parsing Improvements v2 (#1)
- **2026-04-17** `239b38e` — fix: resolve SettingsScreen crash due to missing Wifi icon and bump version to 0.3.2
- **2026-05-06** `15b854f` — #16 Inventory filters improved
- **2026-05-06** `31a0d5b` — Bump version to v0.4.6 and fix mastery progress calculation
- **2026-05-07** `e0d7a05` — Mastery bugs: ignore dupes and check for formad items
- **2026-05-08** `a41feec` — Inventory: slight misalignment of header widget fixed
- **2026-05-08** `8e29467` — Notes: alignment and styling fix
- **2026-05-08** `58d5f48` — Checklist: slight redesign, more compact
- **2026-05-08** `674aaa8` — Relics: styling fix
- **2026-05-08** `c2d29a0` — Dashboard: Invasions cleanup
- **2026-05-09** `7295200` — Mastery: KDrive fix
- **2026-05-12** `c674051` — Checklist: Fixed time calculation on tasks
- **2026-05-12** `aadb701` — Mastery: switched to game categorization, added gilding logic
- **2026-05-19** `005ae7c` — #32 Fixed mastery lookup of foundry alongside smaller corrections
- **2026-06-01** `300804e` — maps update
- **2026-06-05** `b5386fd` — dashboard ampersand parsing fix
- **2026-06-05** `3cb6fcf` — maps bugfixes
- **2026-06-05** `2561fb4` — notes scrollbars unified
- **2026-06-10** `b8825cd` — more icon coverage
- **2026-06-10** `0a6b7c9` — More Icon Coverage
- **2026-06-10** `ab66a60` — Relic Era icons
- **2026-06-10** `c9c927b` — Credits, Plat and Ducat icons added
- **2026-06-12** `d6c2f02` — Icon for tasks
- **2026-06-13** `dfd9006` — feat: add ExportFlavour fetch, fragment dict name resolution, and collectibles subpanel UI
  > - Add ExportFlavour.json to EXPORT_FILES in Rust backend
  > - Add fragment name lookup in resolveName (dict /Lotus/Language/Fragments/)
  > - Build slide-over subpanel drawer showing individual tracked items per category
  > - Fragment subpanels show each scanned item with dict-resolved display name
  > - Series/marker subpanels show placeholder until bit-position maps provided
  > - Add collectibles nav entry and lazy-loaded screen route
- **2026-06-14** `e9b618f` — Collectibles icon fix
- **2026-06-15** `50098b5` — ui fixes
- **2026-06-15** `a6a45bf` — styling fix
- **2026-06-16** `eaf824e` — dashboard somehow got reset
- **2026-06-17** `20d1ac4` — siphon and nightmare icons
- **2026-06-17** `41f5020` — Inventory parsing fix
- **2026-06-17** `28d26ff` — #11 Inventory card size adapts to amp subcomponents
- **2026-06-17** `7d81a96` — Forma icon for formad items
- **2026-06-24** `1bcb3fb` — feat: add wishlist parsing and sale notification trigger
- **2026-06-24** `67c0a6d` — Webpage mobile fix
- **2026-07-13** `476c4bf` — fix Nightwave rank contrast: move labels outside progress bar, reduce bar height
- **2026-07-14** `a03587d` — feat: inventory filters revamp
- **2026-07-22** `f66213a` — fix: add cached state to navbar inventory sync dot
  > The navbar (App.jsx) was missing the 'cached' state for monitorResult.
  > Same pattern as Settings and SidebarOverlay: yellow dot + 'Using Cached Data' tooltip.
- **2026-07-22** `42ce63d` — fix: inventory sync status text mirrors dot color with descriptive messages
  > - Gray/idle: 'Idle'
  > - Yellow/cached: 'Waiting for Warframe (showing cached data)'
  > - Green/success: 'Syncing (next update in Xm)'
  > - Red/error: 'Sync Error'
  > - Text color matches dot color for each state
- **2026-07-22** `29aeed3` — move manual refresh icon to before the toggle
- **2026-07-23** `f621897` — feat: Nightwave reward mods render with mod frames on Dashboard
  > - Detect mod rewards in Nightwave via ExportUpgrades and icon path
  > - Populate modFrame using same logic as inventoryParser
  > - Dashboard.jsx: import ModCard, fetch framesPath, render mod rewards
  > with ModCard (hideCategory=true strips LowerTab), non-mod rewards
  > stay as bare images
- **2026-07-24** `3bce96b` — Fix remaining wfcd integration bugs: boosters, icons, and absolute URL handling
  > - Export BOOSTER_NAME_MAP from warframeUtils, add booster fallback to
  > inventoryParser._resolveNameInternal so wishlist boosters show proper names
  > (e.g. '3 Day Resource Booster' instead of 'Resource Amount 3 Day Store Item')
  > - Add wikiaThumbnail as icon field in warframeItemsTransform entries, keyed
  > into nameToImage by both display name and uniqueName for resolveAnyImage lookup
  > - Fix resolveImage (inventoryParser) and toBrowseWf (MonitoringContext) to
  > handle absolute URLs (return them as-is instead of prepending browse.wf)
  > - Remove debug console.warn spam from resolveItemName now that logic is stable
  > - Restore export { splitPascal } that was inadvertently dropped
- **2026-07-24** `edcdf79` — Fix image resolution for ExportFlavour and ExportBundles items, improve wishlist/sales UI
  > - Add ExportFlavour and ExportBundles to buildEI tableNames so colour
  > picker palettes (Tenno II, etc.) and bundle items get images resolved
  > - Add ExportBundles.json to Rust EXPORT_FILES so it gets downloaded
  > - Fix Pagemaster/Dante Deluxe Skin Bundle localization via supp-dict-en
  > - Merge suppDict into dict in worldstateParser for item name resolution
  > - Modal component: use custom-scrollbar instead of scrollbar-thin
  > - Wishlist modal: bigger icons (w-16), bigger text (text-sm), no truncation
  > - Market Sales: bigger icons/prices, remove discount % and Platinum text
- **2026-07-24** `a6a3186` — Fix wishlist sale notifications: check flashSales too, remove broken icon
  > evaluateSale now scans both dailyDeals and flashSales for wishlist
  > items. Removed hardcoded IconFoundry.png that doesn't resolve.
- **2026-07-25** `78742f1` — Swap maps to stitched versions (poe/venus/deimos) and update Maps.jsx filenames
- **2026-07-25** `2a011cd` — Add Duviri spiral cycle indicator to Maps tab (issue #7)
- **2026-07-25** `136ca5f` — Add raw/labeled map toggle to switch between stitched and 4K maps
- **2026-07-25** `d5d3a78` — Fix: restore issue sections, MapPin icon, robust anchorName fallback
- **2026-07-25** `d1a99dc` — Notes: add Import from file and Export to file
  > Import reads an external .md/.txt file via dialog, copies it into the
  > notes directory (auto-renames on collision), and opens it. Export
  > saves the current note content to a user-chosen location via save
  > dialog. Buttons sit next to New Note in the tab strip (Download/Upload icons).
- **2026-07-25** `8974314` — Maps: store configs as separate files in map-configs dir with folder button
  > - Configs saved as data/user/map-configs/{tabId}.json instead of inside settings.json
  > - New Rust commands: open_map_configs_folder, read_map_config, write_map_config, list_map_configs
  > - Maps.jsx loadMapConfigs reads individual files; saveMapConfigs writes them
  > - 'Open Folder' button added to config panel alongside Export/Import
  > - Notes: replaced import/export with single 'Open Folder' button (FolderOpen icon) that opens data/user/notes
- **2026-07-25** `7310a54` — Maps: config files stored in data/user/map-configs/ with coherent filenames
  > - Configs saved as separate files: data/user/map-configs/plains-of-eidolon.json, etc.
  > - Coherent auto-naming via configFilename() using MAPS[tab].name
  > - Map configs folder opened via open_map_configs_folder command
  > - Import button moved next to + button in config panel header
  > - Removed export/import dialog handlers (replaced by folder workflow)
  > - Removed duplicate PageLayout import and unused handlers
- **2026-07-25** `71a954c` — Maps: remove MapPin from header, replace with folder icon for map configs folder; keep MapPin by + icon in panel
- **2026-07-25** `6f45e52` — Maps: move folder icon next to configurations button, remove MapPin from header
- **2026-07-25** `bdfc8be` — Maps: move folder icon next to + in config panel, remove from header bar
- **2026-07-25** `ea634ec` — Maps: move folder icon next to plus in config panel header
- **2026-07-25** `2813dc9` — Maps: remove folder icon from header bar
- **2026-07-25** `aa1ced0` — Maps: paint folder icon button blue to match MapPin import button
- **2026-07-26** `8632ecb` — Add Adversaries and Wiki placeholder screens with icons
- **2026-07-26** `299cb7a` — App: fix nav order for Adversaries/Wiki, use correct icon filenames
- **2026-07-27** `35c0a13` — inapp wiki done
