#!/usr/bin/env bash
set -euo pipefail

FORCE=false
VERSION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -f|--force) FORCE=true; shift ;;
    -*)
      echo "Usage: $0 [-f] <version>"
      echo "  e.g. $0 0.6.4"
      echo "  e.g. $0 -f 0.6.4    # overwrite existing tag + force push"
      exit 1
      ;;
    *) VERSION="$1"; shift ;;
  esac
done

if [ -z "$VERSION" ]; then
  echo "Usage: $0 [-f] <version>"
  echo "  e.g. $0 0.6.4"
  echo "  e.g. $0 -f 0.6.4    # overwrite existing tag + force push"
  exit 1
fi

if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "Error: '$VERSION' is not a valid semver (e.g. 0.6.4)"
  exit 1
fi

cd "$(dirname "$0")"

echo "=== Bumping version to $VERSION ==="

# Update version files (only if different)
DIRTY=false
CURRENT_V=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
if [ "$CURRENT_V" != "$VERSION" ]; then
  sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json
  echo "  package.json  $CURRENT_V -> $VERSION"
  DIRTY=true
fi

CURRENT_C=$(grep '^version = ' src-tauri/Cargo.toml | sed 's/^version = "\(.*\)"/\1/')
if [ "$CURRENT_C" != "$VERSION" ]; then
  sed -i "s/^version = \".*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml
  echo "  Cargo.toml    $CURRENT_C -> $VERSION"
  DIRTY=true
fi

if [ "$DIRTY" = true ]; then
  git add package.json src-tauri/Cargo.toml
  git commit -m "chore: bump version to $VERSION"
  echo "  committed"
else
  echo "  (already at $VERSION, no commit needed)"
fi

# Tag
TAG="v$VERSION"
if git rev-parse "$TAG" >/dev/null 2>&1; then
  if [ "$FORCE" = true ]; then
    echo "  tag '$TAG' exists locally, replacing..."
    git tag -d "$TAG"
    git tag -a "$TAG" -m "$TAG"
  else
    echo "Error: tag '$TAG' already exists locally. Use -f to overwrite."
    exit 1
  fi
else
  git tag -a "$TAG" -m "$TAG"
fi

# Push
if [ "$FORCE" = true ]; then
  # Wipe remote tag, then push branch + new tag
  git push origin ":refs/tags/$TAG" 2>/dev/null || true
  git push origin master --follow-tags --force
else
  git push origin master --follow-tags
fi

echo ""
echo "=== Done! Tagged and pushed $TAG ==="
