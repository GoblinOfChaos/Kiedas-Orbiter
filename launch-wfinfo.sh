#!/usr/bin/env bash
# Safe wfinfo launcher: ensures /tmp has valid data files before starting the binary.
# The Rust binary looks for prices.json + filtered_items.json in $TMPDIR (usually /tmp).
# If the warframestat.us API is down, update.sh would have written a 503 error page
# into those files, causing the binary to panic. This script validates and copies the
# local project files first.

set -e
cd "$(dirname "$0")"

_valid_json() {
    local file="$1"
    python3 -c "import json,sys; json.load(open('$file')); sys.exit(0)" 2>/dev/null
}

_copy_if_valid() {
    local src="$1"
    local dst="/tmp/$1"
    if [ -f "$src" ] && _valid_json "$src"; then
        # Preserve the source mtime so Rust's 24-hour cache policy can tell
        # whether this seed is genuinely fresh instead of treating every
        # launcher copy as newly downloaded data.
        cp -p "$src" "$dst"
        echo "  OK: copied $src -> $dst"
        return 0
    fi
    return 1
}

_choose_source() {
    local target="$1"
    shift
    for candidate in "$@"; do
        if [ -f "$candidate" ] && _valid_json "$candidate"; then
            echo "$candidate"
            return 0
        fi
    done
    return 1
}

echo "Pre-populating /tmp with valid local data files..."
for file in prices.json filtered_items.json; do
    if _copy_if_valid "$file"; then
        continue
    fi

    # `local` only works inside a function - this loop is at the
    # top-level script scope, so `local fallback` here failed outright
    # ("local: can only be used in a function", exit status 1) and, with
    # `set -e` active, killed the whole script right at the moment the
    # primary copy had already failed and this fallback path was needed
    # - the fallback logic below never actually ran. Jacob 2026-07-24
    # ("`local` used outside a function with `set -e` kills the
    # fallback recovery path instead of running it").
    fallback=""
    if [ "$file" = "prices.json" ]; then
        fallback=$(_choose_source "$file" "${file}.before-enrich" "${file}.previous")
    else
        fallback=$(_choose_source "$file" "${file}.previous")
    fi

    if [ -n "$fallback" ]; then
        cp -p "$fallback" "/tmp/$file"
        echo "  OK: copied fallback $fallback -> /tmp/$file"
    else
        echo "ERROR: no valid source found for $file" >&2
        exit 1
    fi

done

echo "Starting orbiter..."

# ── Resolve the binary path ────────────────────────────────────────────────
# A `cargo build` install puts it under target/release/, but
# download_helper.py's downloaded-binary install (no build from source
# needed) writes it flat at WFINFO_DIR/orbiter instead - this script only
# ever looked under target/release/, so a download-only install had no
# launcher able to find its binary at all. Windows' own launcher.py
# resolution already falls back to a flat orbiter.exe next to the app for
# exactly this reason; mirroring that here instead of moving where the
# downloader writes (target/ is cargo's own directory - `cargo clean`
# would silently delete a downloaded binary living there). Jacob
# 2026-07-24 ("Fix Linux fresh-install detector location mismatch").
if [ -x "./target/release/orbiter" ]; then
    _ORBITER_BIN="./target/release/orbiter"
elif [ -x "./orbiter" ]; then
    _ORBITER_BIN="./orbiter"
else
    echo "ERROR: orbiter binary not found at ./target/release/orbiter or ./orbiter" >&2
    echo "Build it with: cargo build --release --bin orbiter" >&2
    echo "Or download it via the app's Settings tab." >&2
    exit 1
fi

# ── Display detection ──────────────────────────────────────────────────────
# xcap needs DISPLAY set even on Wayland sessions (uses XWayland for capture).
# Find the right value if it's not already set.
if [ -z "${DISPLAY-}" ]; then
    # Try common X display sockets
    for n in 0 1 2 3; do
        if [ -S "/tmp/.X11-unix/X${n}" ]; then
            export DISPLAY=":${n}"
            echo "  Auto-detected DISPLAY=:${n}"
            break
        fi
    done
    # Fallback: scan running Xwayland/gamescope processes for --display arg
    if [ -z "${DISPLAY-}" ]; then
        _d=$(ps -eo args 2>/dev/null | grep -oE '(Xwayland|gamescope).*\+[0-9]+' \
             | grep -oE ':[0-9]+' | head -1)
        if [ -n "$_d" ]; then
            export DISPLAY="$_d"
            echo "  Found DISPLAY=${DISPLAY} from process list"
        fi
    fi
    if [ -z "${DISPLAY-}" ]; then
        echo "  WARNING: DISPLAY not set — window capture may fail"
    fi
fi

# ── Block notify-send — desktop notifications steal focus from Warframe ───
# Create a no-op notify-send in a reused dir and prepend it to PATH.
# Used to be `mktemp -d` (a brand new directory every single launch) with
# no cleanup - the script always ends by exec-ing the orbiter binary,
# which replaces this shell's process image entirely, so even an EXIT
# trap would never fire to clean it up (exec bypasses normal shell exit
# entirely). Every detector (re)start left behind one more orphaned temp
# dir under $TMPDIR forever. Reusing one fixed, deterministic path
# instead means there's nothing left to leak - same directory every
# time, just rewritten if needed. Jacob 2026-07-24 ("leaks a temp dir per
# detector launch (cleanup can't run after exec)").
_FAKE_BIN="${XDG_CACHE_HOME:-$HOME/.cache}/kiedas-orbiter/fake-bin"
mkdir -p "$_FAKE_BIN"
cat > "$_FAKE_BIN/notify-send" << 'NOTIFYEOF'
#!/bin/sh
# Disabled by Kieda's Orbiter launcher — steals focus from Warframe
exit 0
NOTIFYEOF
chmod +x "$_FAKE_BIN/notify-send"

# ── Force host session bus so spectacle/portal works outside Flatpak ─────
_UID="$(id -u)"
_HOST_BUS="unix:path=/run/user/${_UID}/bus"
_XDG_RUNTIME="/run/user/${_UID}"

# LD_LIBRARY_PATH is deliberately left untouched (and explicitly unset
# below with -u) rather than pointed at any host or venv lib dir. Confirmed
# live 2026-07-20: spectacle failed with a Qt private-API version mismatch
# every time some LD_LIBRARY_PATH override was present (whether pointing at
# the venv's bundled Qt or even at "correct" host lib dirs), but ran fine
# with it fully unset - so no override at all, not a "better" override, is
# what actually works here. Same story for QT_PLUGIN_PATH: launcher.py's
# _build_env() points it at the venv's bundled PySide6 Qt plugins so the
# *main GUI window* finds its own Qt - but that value then passes straight
# through into this script's env (this `env` call only overrides what it
# explicitly lists) and on into orbiter's spectacle/grim child, pointing
# them at the same mismatched venv plugins. Confirmed live 2026-07-20:
# running this script by hand from a plain terminal (no QT_PLUGIN_PATH set
# at all) captured a screenshot successfully; launched through the app
# (QT_PLUGIN_PATH inherited from the GUI) it failed the same way
# LD_LIBRARY_PATH did.
exec env -u LD_LIBRARY_PATH -u QT_PLUGIN_PATH -u LD_PRELOAD \
    XDG_DATA_HOME="$HOME/.local/share" \
    XDG_CACHE_HOME="$HOME/.cache" \
    DISPLAY="${DISPLAY-}" \
    WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}" \
    XDG_RUNTIME_DIR="${_XDG_RUNTIME}" \
    DBUS_SESSION_BUS_ADDRESS="${_HOST_BUS}" \
    XDG_CURRENT_DESKTOP="${XDG_CURRENT_DESKTOP:-KDE}" \
    XDG_SESSION_TYPE="wayland" \
    PATH="${_FAKE_BIN}:${PATH}" \
    "${_ORBITER_BIN}" "$@"
