#!/usr/bin/env bash
# Safe update: API first, validates response, falls back to local synthesis.
set -u
cd "$HOME/wfinfo-ng"
NEED=0
try_dl() {
    local url="$1" out="$2" min="$3" key="$4"
    local tmp; tmp=$(mktemp)
    curl -fsSL --max-time 30 -o "$tmp" "$url" 2>/dev/null || { echo "  HTTP failed"; rm -f "$tmp"; return 1; }
    local sz; sz=$(wc -c < "$tmp")
    [ "$sz" -lt "$min" ] && { echo "  $sz bytes (need >$min) - error payload"; head -c 120 "$tmp"; echo; rm -f "$tmp"; return 1; }
    if [ -n "$key" ]; then
        python3 -c "import json,sys; sys.exit(0 if '$key' in json.load(open('$tmp')) else 1)" 2>/dev/null \
            || { echo "  missing key '$key'"; rm -f "$tmp"; return 1; }
    else
        python3 -c "import json; json.load(open('$tmp'))" 2>/dev/null \
            || { echo "  not valid JSON"; rm -f "$tmp"; return 1; }
    fi
    [ -f "$out" ] && cp "$out" "$out.previous"
    mv "$tmp" "$out"
    echo "  $out updated ($sz bytes)"
}
echo "Trying WFInfo API..."
echo "prices.json:"
try_dl "https://api.warframestat.us/wfinfo/prices" prices.json 10000 "" || { echo "  kept existing"; NEED=1; }
echo "filtered_items.json:"
try_dl "https://api.warframestat.us/wfinfo/filtered_items" filtered_items.json 50000 eqmt || { echo "  kept existing"; NEED=1; }
if [ "$NEED" = "1" ]; then
    echo; echo "Refreshing WFCD cache from GitHub before synthesis..."
    python3 "$HOME/wfinfo-ng/refresh_wfcd_cache.py" || echo "  (cache refresh failed, will synthesize from existing)"
    echo; echo "Synthesizing from local WFCD cache..."
    python3 "$HOME/wfinfo-ng/synthesize_wfinfo_data.py" || exit 1
fi
echo
echo "Restarting orbiter..."
pkill -x orbiter 2>/dev/null || true
sleep 1
cd "$HOME/wfinfo-ng" && nohup ./launch-orbiter.sh > ~/.local/share/kiedas-orbiter/orbiter.log 2>&1 & disown
sleep 2
echo "orbiter: $(pgrep -x orbiter >/dev/null && echo running || echo NOT RUNNING)"
head -12 ~/.local/share/kiedas-orbiter/orbiter.log
