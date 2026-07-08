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
        cp "$src" "$dst"
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

    local fallback
    if [ "$file" = "prices.json" ]; then
        fallback=$(_choose_source "$file" "${file}.before-enrich" "${file}.previous")
    else
        fallback=$(_choose_source "$file" "${file}.previous")
    fi

    if [ -n "$fallback" ]; then
        cp "$fallback" "/tmp/$file"
        echo "  OK: copied fallback $fallback -> /tmp/$file"
    else
        echo "ERROR: no valid source found for $file" >&2
        exit 1
    fi

done

echo "Starting orbiter..."

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

# ── On Bazzite/immutable distros host libs are at /run/host/usr ───────────
HOST_LIBS="/run/host/usr/lib64:/run/host/usr/lib"

# ── Block notify-send — desktop notifications steal focus from Warframe ───
# Create a no-op notify-send in a temp dir and prepend it to PATH.
_FAKE_BIN="$(mktemp -d)"
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

exec env \
    XDG_DATA_HOME="$HOME/.local/share" \
    XDG_CACHE_HOME="$HOME/.cache" \
    DISPLAY="${DISPLAY-}" \
    WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}" \
    XDG_RUNTIME_DIR="${_XDG_RUNTIME}" \
    DBUS_SESSION_BUS_ADDRESS="${_HOST_BUS}" \
    XDG_CURRENT_DESKTOP="${XDG_CURRENT_DESKTOP:-KDE}" \
    XDG_SESSION_TYPE="wayland" \
    PATH="${_FAKE_BIN}:${PATH}" \
    LD_LIBRARY_PATH="${HOST_LIBS}${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" \
    ./target/release/orbiter "$@"
