# Windows Full Support — AI Handoff Document

## Project

**Kieda's Orbiter** — A Linux + Windows Warframe companion app (inventory, relics, rivens, market, relic reward OCR overlay).

- **GitHub:** https://github.com/GoblinOfChaos/Kiedas-Orbiter
- **Current version:** v1.2.1
- **Language:** Python (PySide6 GUI) + Rust (OCR detector binary)
- **Owner:** GoblinOfChaos — complete beginner, never edit files manually, always make changes directly

---

## Current Windows State

The Python GUI app is **fully cross-platform** and should work on Windows as-is. The installer infrastructure is in place. What's **not yet done** is building and distributing the Rust OCR binary for Windows so users don't need Rust installed.

### What works on Windows right now
- All Python tabs (Dashboard, Inventory, Relic Planner, Riven Grader, Market, etc.)
- EE.log auto-detection (`%LOCALAPPDATA%\Warframe\EE.log` + Steam registry + Epic)
- `warframe-api-helper.exe` auto-downloaded by `download_helper.py`
- Double-click `Install Windows.bat` → runs `install.py` → creates Start Menu entry
- Cross-platform process management via `platform_utils.py` (psutil)
- `launcher.py` replaces all shell scripts

### What's broken / missing on Windows
1. **Rust OCR binary not pre-built for Windows** — users currently have to install Rust and build it themselves, which is impractical. The binary (`target/release/orbiter.exe`) needs to be built in CI and attached to GitHub Releases.
2. **`install.py` doesn't download the Rust binary** — it only downloads `warframe-api-helper`. After the CI builds the binary, `download_helper.py` should also download `orbiter.exe`.
3. **`warframe-watcher.py` uses hardcoded Linux paths** for the binary — it uses `target/release/orbiter` (no `.exe`). The `IS_WINDOWS` check in `platform_utils.py` handles this but `WFINFO_BIN` in `warframe-watcher.py` may need updating.

---

## Key Files to Know

```
launcher.py          — Cross-platform launcher (app/overlay/detector/watcher)
platform_utils.py    — psutil-based process management (is_running, kill_processes, etc.)
install.py           — Cross-platform Python installer
download_helper.py   — Downloads warframe-api-helper from Sainan's GitHub releases
update.py            — Downloads Warframe item/price data (replaces update.sh)
warframe-watcher.py  — Watches for Warframe process, restarts the detector
overlay.py           — Relic reward overlay (Qt window)
paths.py             — All file path resolution, DATA_DIR/CACHE_DIR cross-platform
src/bin/main.rs      — Rust OCR detector binary source
```

---

## Future direction: swapchain-hook overlay (both platforms) — research note, 2026-07-20

**Not started, not scheduled. This is a "when we're ready" architecture note, written up after finding a
sibling project that solves the two hardest problems we fought on Linux this session:**
1. The reward/relic overlays not receiving mouse clicks while a fullscreen game has input focus (a
   real Wayland/KWin limitation — clicks pass through to the game underneath even though the overlay
   renders on top).
2. Screenshot capture reliability (`spectacle`/`grim` shelling out, fighting environment/library
   pollution from the Python venv's bundled Qt libs).

### What we found

[wuuthradd/WFInfo-Linux](https://github.com/wuuthradd/WFInfo-Linux) (Apache-2.0, actively maintained,
a proper Linux port of the original [WFCD/WFInfo](https://github.com/WFCD/WFInfo)) solves both problems
the same way: instead of taking a screenshot and drawing a separate overlay window, it installs an
**implicit Vulkan layer** (`WFInfo.Linux/NativeOverlay/` — plain C++, built with a Makefile, no
Vulkan SDK needed beyond headers) that hooks `vkCreateSwapchainKHR`/`vkQueuePresentKHR` in the game's
own process. It reads frames directly out of the swapchain (no `spectacle` needed) and composites
overlay panels (rendered with pangocairo) directly onto the frame *before* it's presented to the
screen — so the "overlay" is never a second window at all. There's no compositor "which surface gets
the click" question because nothing but the game's own window ever exists.

It talks to the main app over a plain Unix domain socket
(`$XDG_RUNTIME_DIR/wfinfo.sock`, see `WFInfo.Linux/Services/SocketCommandServer.cs`) with simple text
commands (`activate`, `snapit`, `searchit`, `masterit`). The layer is gated behind a
`WFINFO=1`/`DISABLE_WFINFO=1` env var pair in its manifest (`wfinfo_vk.json`), activated by adding
`WFINFO=1 %command%` to Warframe's Steam launch options — a one-time, user-facing setup step, same
spirit as things we already ask Jacob to do.

Their own README explicitly confirms our exact click-passthrough finding wasn't a mistake on our
part — it's a real, acknowledged Linux limitation for regular windows: *"You can't interact with the
reward window while the game stays focused"* (their fallback plain-window display mode, which is a
different code path from the Vulkan-composited one and still has our exact problem).

### Why this would work on Linux

Warframe under Proton is translated DirectX→Vulkan via DXVK/VKD3D — so even though the game is a
DirectX title, Proton gives it a real Vulkan swapchain, which is exactly what an implicit Vulkan layer
hooks. This is the same general technique MangoHud/gamescope use, just repurposed for overlay
compositing instead of a stats HUD.

### Why the same code would NOT work on Windows

Confirmed via research (see chat log, 2026-07-20): Warframe on native Windows uses DirectX 11/12
directly — there is **no Vulkan involved at all** on that platform (no native Vulkan renderer option
exists in Warframe). Proton's DXVK/VKD3D translation layer is what creates a Vulkan swapchain to hook
on Linux; that translation simply doesn't exist on native Windows, so a Vulkan layer would have
nothing to attach to there.

To get the same benefit on Windows (overlay composited into the game's own frame, immune to the
window-stacking/input-focus problem entirely) would need a **separate implementation**: hooking the
DirectX 11/12 swapchain's `Present()` call instead of Vulkan's. This is a well-established technique
(the same general approach Discord's overlay, Steam's overlay, and RivaTuner Statistics Server all
use), typically via a detour/trampoline library (e.g. MinHook, Microsoft Detours) injected into the
game process. Same underlying philosophy as the Linux approach (composite into the frame, don't fight
window stacking), but genuinely different code — not a port, a parallel implementation.

### Rough cost/risk if we ever pursue this

- **New toolchain**: neither platform's version currently needs a C/C++ compiler + graphics-API SDK
  headers in this project. Both the Vulkan-layer route (Linux) and the DirectX-hook route (Windows)
  would introduce one.
- **Scope**: this would replace meaningful chunks of both the Rust detector's screenshot logic and the
  entire Python/GTK overlay system on Linux, and would be new work entirely on Windows (nothing to
  replace there yet, per Task 1-4 above).
- **Protocol work**: WFInfo-Linux's socket protocol for triggering captures is documented in their
  source (simple text commands) but the *overlay content* side (how panel data gets INTO the layer for
  compositing) wasn't fully explored yet — would need to read `vklayer-composite.cpp`/`overlay.hpp`/
  `overlay-render.cpp` in more depth before estimating that part's cost.
- **License**: Apache-2.0 permits reuse/adaptation with attribution, so directly adapting their native
  layer (rather than writing one from scratch) is a legitimate option, not just inspiration.
- **Recommendation**: worth pursuing once Linux is otherwise stable and this exact class of bug
  (overlay input routing, screenshot reliability) keeps recurring — build the Linux side first (it's
  the platform actually in active daily use), then decide whether the Windows DirectX-hook mirror is
  worth the same investment based on how much the Linux version actually helps.

---

## Task 1: GitHub Actions — Build Rust Binary for Windows + Linux

Create `.github/workflows/release.yml` that triggers on tag push (`v*`), builds the `orbiter` binary for both platforms, and attaches to the GitHub Release.

### Linux build notes
- Needs: `libtesseract-dev libleptonica-dev xorg-dev libxcb-* libxi-dev libxtst-dev libdbus-1-dev pkg-config fontconfig-devel openssl-devel`
- Ubuntu `ubuntu-latest` runner has these available via apt
- The binary dynamically links against `libtesseract.so.5.5` — either link statically or bundle the lib
- Rust toolchain pinned to `1.96.0` via `rust-toolchain.toml`

### Windows build notes
- `windows-latest` runner
- Needs Tesseract on Windows — install via `choco install tesseract` or use vcpkg
- `xcap` on Windows uses GDI/DXGI (already coded with `#[cfg(target_os = "windows")]`)
- The screenshot path on Windows uses `xcap::Monitor` directly, no spectacle needed
- `notify-send` is called but blocked via `config.json show_notifications=0` — on Windows this call will fail gracefully (notify-send doesn't exist)

### Suggested workflow structure

```yaml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@master
        with:
          toolchain: "1.96.0"
      - name: Install deps
        run: sudo apt-get install -y libtesseract-dev libleptonica-dev xorg-dev ...
      - name: Build
        run: cargo build --release --bin orbiter
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: orbiter-linux
          path: target/release/orbiter

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@master
        with:
          toolchain: "1.96.0"
      - name: Install Tesseract
        run: choco install tesseract  # or use vcpkg
      - name: Build
        run: cargo build --release --bin orbiter
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: orbiter-windows
          path: target/release/orbiter.exe

  release:
    needs: [build-linux, build-windows]
    runs-on: ubuntu-latest
    steps:
      - download both artifacts
      - attach to GitHub Release via gh CLI or actions/create-release
```

---

## Task 2: Update `download_helper.py` to Also Download the Orbiter Binary

After CI is set up and a release with binaries exists, extend `download_helper.py` to also download `orbiter` / `orbiter.exe` from the GitHub Release assets.

The release assets would be named something like:
- `orbiter-linux-x86_64` 
- `orbiter-windows-x86_64.exe`

`download_helper.py` already has the pattern for this (it downloads `warframe-api-helper.exe`). Add a parallel function `download_orbiter()` and call it from `install.py` and `install.sh`.

**`install.py`** already has a step for building Rust — replace the build step with a download step when a pre-built binary is available.

---

## Task 3: Test on Real Windows Machine

Before declaring Windows fully supported:
1. Clone repo on a fresh Windows 11 machine with Python 3.11+ installed
2. Double-click `Install Windows.bat`
3. Verify Start Menu shortcut appears
4. Launch app, check all tabs load
5. Run Warframe, verify EE.log is auto-detected
6. Crack a relic, verify OCR overlay appears without stealing focus
7. Click Refresh Data, verify inventory syncs

Known potential issues to watch for:
- `QT_QPA_PLATFORM` — on Windows this should be unset (Qt auto-detects)
- `LD_LIBRARY_PATH` — Windows uses PATH, not LD_LIBRARY_PATH (handled in `launcher.py`)
- `warframe-watcher.py` uses `os.getuid()` which doesn't exist on Windows — the `clean_env_for_launch()` function in `platform_utils.py` guards this with `IS_LINUX or IS_MAC` but verify
- The overlay window flags (`X11BypassWindowManagerHint`) are X11-specific — on Windows they're ignored, which is fine, but verify the overlay actually appears

---

## Task 4: Fix notify-send on Windows

The Rust binary calls `notify-send` which doesn't exist on Windows. The code already has a `show_notifications` config check, but on Windows the `Command::new("notify-send")` call will fail with "program not found". This should already be handled gracefully (the `spawn()` result is ignored with `let _ =`) but verify in the Rust binary at `src/ownership.rs`:

```rust
pub fn notify(title: &str, body: &str, urgency: &str) {
    let _ = Command::new("notify-send")  // ← this silently fails on Windows, which is fine
        ...
```

If it causes any issues on Windows, add `#[cfg(not(target_os = "windows"))]` to the function.

---

## Repo Structure Quick Reference

```
Install Windows.bat    — User double-clicks this to install on Windows
Start Kieda's Orbiter.bat — User double-clicks to launch
install.py             — Python installer (called by the .bat)
launcher.py            — python launcher.py [app|overlay|detector|watcher]
platform_utils.py      — Cross-platform process utilities
download_helper.py     — Downloads warframe-api-helper + (future) orbiter binary
update.py              — Downloads prices.json + filtered_items.json
warframe-watcher.py    — Daemon: watches for Warframe, restarts detector
overlay.py             — Relic reward overlay (floating Qt window)
riven_grader_overlay.py — Riven grader overlay
missing-parts.py       — Main GUI entry point
paths.py               — All file paths (DATA_DIR, CACHE_DIR, EE.log detection)
src/bin/main.rs        — Rust OCR detector (reads EE.log, screenshots, writes state file)
src/ownership.rs       — Ownership lookup + notify-send call
rust-toolchain.toml    — Pins Rust to 1.96.0
```

---

## Important Notes

- **Owner is a complete beginner** — never tell them to edit files manually, always make all changes directly
- **Linux is working** — don't break the Linux flow when adding Windows support
- **The overlay's focus-steal fix** is Linux/Bazzite-specific (spectacle via KDE portal). On Windows, xcap::Monitor is used instead and focus stealing shouldn't be an issue since Windows handles overlay windows differently
- **The venv must be Python 3.13 only** — having multiple Python versions in the venv causes Qt lib conflicts. `install.py` creates the venv with `sys.executable`, which should be fine as long as the user has one Python installed
- **DBus / host env setup** in `launcher.py` and `platform_utils.py` only runs on Linux — Windows branch is clean

---

## How to Test the Overlay on Windows (without Warframe)

```python
# In a terminal, run:
python launcher.py overlay

# Then trigger a fake detection:
python -c "
import json, time, sys
sys.path.insert(0, '.')
from paths import DATA_DIR
state = {
    'timestamp': int(time.time()),
    'warframe': {'x': 0, 'y': 0, 'width': 1920, 'height': 1080},
    'rewards': [
        {'name': 'Rhino Prime Chassis', 'status': 'NEED', 'count': 0},
        {'name': 'Forma Blueprint', 'status': 'OWNED', 'count': 5},
    ]
}
(DATA_DIR / 'latest-detection.json').write_text(json.dumps(state))
print('Overlay should pop up')
"
```
