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
exec ./target/release/orbiter "$@"
