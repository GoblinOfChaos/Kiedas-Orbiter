#!/usr/bin/env bash
# Packages the local-only data a cloud/remote agent session cannot reach on
# its own, so it can be uploaded once and used to run scripts/check-
# completeness.mjs, scripts/supplement-freshness.mjs, and the real-data
# tests that otherwise ENOENT against a hardcoded local path.
#
# Run this on your own machine (dev-fedora or wherever the app actually
# runs), then upload the resulting .zip to the agent session.
#
#   bash scripts/collect-agent-bootstrap-data.sh
#
# What this collects, and why each is safe to hand over:
#   - $KIEDAS_DE_EXPORT_CACHE (default ~/.cache/kiedas-de-export): the
#     official Digital Extremes PublicExport cache + provenance.json.
#     Public game data, not account-specific.
#   - $PREVIEW_DATA_DIR/export (default
#     ~/.local/share/kiedas-orbiter-preview/data/export): the community
#     mirror export cache. Also public game data.
#   - $PREVIEW_DATA_DIR/user/inventory.json (+ inventory_history.json if
#     present): your real Warframe account's parsed save data. Not secret,
#     but it IS your account's own state - included only because you asked
#     for it, to unblock the real-data completeness tests.
#
# Deliberately EXCLUDED: data/user/settings.json. That file can hold a
# warframe.market auth JWT (see docs' PRIV-001 finding) - never bundle it.
set -euo pipefail

DE_CACHE_DIR="${KIEDAS_DE_EXPORT_CACHE:-$HOME/.cache/kiedas-de-export}"
DATA_DIR="${PREVIEW_DATA_DIR:-$HOME/.local/share/kiedas-orbiter-preview/data}"
OUT_DIR="${OUT_DIR:-$HOME}"
mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
STAGING="$(mktemp -d)"
OUT_ZIP="$OUT_DIR/kiedas-agent-bootstrap-$STAMP.zip"

cleanup() { rm -rf "$STAGING"; }
trap cleanup EXIT

echo "Staging in $STAGING"
# Layout matches what PREVIEW_DATA_DIR/KIEDAS_DE_EXPORT_CACHE are expected to
# point at directly: real-data-harness.mjs reads <PREVIEW_DATA_DIR>/export
# and <PREVIEW_DATA_DIR>/user, so the staged tree must use those exact names,
# not a renamed/relabelled folder.
mkdir -p "$STAGING/de-export-cache" "$STAGING/export" "$STAGING/user"

copied_any=0

if [ -d "$DE_CACHE_DIR" ]; then
  cp -r "$DE_CACHE_DIR"/. "$STAGING/de-export-cache/"
  echo "Collected DE PublicExport cache from $DE_CACHE_DIR"
  copied_any=1
else
  echo "No DE PublicExport cache found at $DE_CACHE_DIR (skipping)"
fi

if [ -d "$DATA_DIR/export" ]; then
  cp -r "$DATA_DIR/export"/. "$STAGING/export/"
  echo "Collected community mirror export cache from $DATA_DIR/export"
  copied_any=1
else
  echo "No mirror export cache found at $DATA_DIR/export (skipping)"
fi

for f in inventory.json inventory_history.json; do
  if [ -f "$DATA_DIR/user/$f" ]; then
    cp "$DATA_DIR/user/$f" "$STAGING/user/$f"
    echo "Collected $f"
    copied_any=1
  fi
done

if [ "$copied_any" -eq 0 ]; then
  echo "Nothing found to collect - check KIEDAS_DE_EXPORT_CACHE / PREVIEW_DATA_DIR." >&2
  exit 1
fi

cat > "$STAGING/MANIFEST.md" <<EOF
# Agent bootstrap data
Collected: $STAMP
Source machine paths:
  DE cache:      $DE_CACHE_DIR
  Mirror export: $DATA_DIR/export
  User data:     $DATA_DIR/user (inventory.json / inventory_history.json only - settings.json deliberately excluded)

To use in an agent session, unzip and point env vars at the extracted paths:
  export KIEDAS_DE_EXPORT_CACHE=<extracted>/de-export-cache
  export PREVIEW_DATA_DIR=<extracted>   # expects export/ and user/ under it
EOF

rm -f "$OUT_ZIP"
(cd "$STAGING" && zip -rq "$OUT_ZIP" .)

echo
echo "Wrote $OUT_ZIP ($(du -h "$OUT_ZIP" | cut -f1))"
echo "Upload this file to the agent session."
