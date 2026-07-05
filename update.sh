#!/usr/bin/env sh
set -e

_safe_fetch() {
    url="$1"
    dest="$2"
    tmp=$(mktemp)
    http_code=$(curl -s -w "%{http_code}" -o "$tmp" "$url")
    if [ "$http_code" = "200" ]; then
        jq . "$tmp" > "$dest"
        echo "Updated $dest from $url"
    else
        echo "WARNING: $url returned HTTP $http_code — keeping existing $dest" >&2
    fi
    rm -f "$tmp"
}

_safe_fetch "https://api.warframestat.us/wfinfo/prices/" prices.json
_safe_fetch "https://api.warframestat.us/wfinfo/filtered_items/" filtered_items.json
