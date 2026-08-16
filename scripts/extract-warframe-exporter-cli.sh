#!/usr/bin/env bash
set -euo pipefail

version="${1:-v2.15}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output="$repo_root/src-tauri/data/bin/Warframe-Exporter-CLI"
temp_dir="$(mktemp -d)"
trap 'rm -rf "$temp_dir"' EXIT

asset_url="https://github.com/Puxtril/Warframe-Exporter/releases/download/${version}/Warframe-Exporter-CLI_Linux.AppImage"
asset="$temp_dir/Warframe-Exporter-CLI_Linux.AppImage"

curl --fail --location --retry 2 "$asset_url" --output "$asset"
chmod +x "$asset"

(
    cd "$temp_dir"
    "$asset" --appimage-extract >/dev/null
)

install -D -m 0755 \
    "$temp_dir/squashfs-root/usr/bin/Warframe-Exporter-CLI" \
    "$output"

echo "Extracted Warframe-Exporter-CLI ${version} to ${output}"
