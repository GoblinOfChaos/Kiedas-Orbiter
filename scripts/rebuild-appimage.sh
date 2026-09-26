#!/usr/bin/env bash
# Full AppImage rebuild sequence for the PREVIEW build.
# Run this FROM INSIDE the dev-fedora distrobox:
#
#   distrobox enter dev-fedora
#   bash /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scripts/rebuild-appimage.sh
#
# pnpm tauri build's own internal linuxdeploy call reliably fails at the
# very end (a known upstream Tauri/linuxdeploy bug) - this script picks up
# where it leaves off and finishes packaging manually.
set -euo pipefail

REPO="/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center"
BUNDLE_DIR="$REPO/src-tauri/target/release/bundle/appimage"
LINUXDEPLOY="/var/home/jedwards/.cache/tauri/linuxdeploy-x86_64.AppImage"

cd "$REPO"
export PATH="/home/jedwards/.local/share/pnpm/bin:$PATH"
export APPIMAGE_EXTRACT_AND_RUN=1
export NO_STRIP=1
export ARCH=x86_64

BUILD_CPUS="0-3"
export CARGO_BUILD_JOBS=4
export RAYON_NUM_THREADS=4

run_low_impact() {
  nice -n 10 ionice -c 3 taskset -c "$BUILD_CPUS" "$@"
}

echo "==> Building preview (the bundler's own linuxdeploy step will likely fail at the end - that's expected)"
BUILD_MARK="$(mktemp)"
run_low_impact pnpm run preview:build || true

# The linuxdeploy failure above is tolerated, but a failed FRONTEND or Rust build must not be:
# packaging the previous dist/binary silently produced a stale AppImage (2026-09-25: a worker
# bundling error left the app on an old build for hours). Fail loudly instead.
if [ ! "$REPO/dist/index.html" -nt "$BUILD_MARK" ]; then
  echo "!! Frontend build failed: dist/index.html was not rebuilt. Not packaging a stale AppImage." >&2
  echo "!! Run: node node_modules/vite/bin/vite.js build --mode preview   and read the error." >&2
  rm -f "$BUILD_MARK"; exit 1
fi
if [ ! "$REPO/src-tauri/target/release/kiedas-orbiter-preview" -nt "$BUILD_MARK" ]; then
  echo "!! Rust binary was not rebuilt after the frontend changed (embedded UI would be stale)." >&2
  rm -f "$BUILD_MARK"; exit 1
fi
rm -f "$BUILD_MARK"

echo "==> Cleaning stale AppDir and finishing packaging manually"
rm -rf "$BUNDLE_DIR/Kieda's Orbiter Preview.AppDir"
cd "$BUNDLE_DIR"

DESKTOP_FILE="$BUNDLE_DIR/kiedas-orbiter-preview.desktop"
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=Kieda's Orbiter Preview
Comment=Warframe companion app (preview)
Exec=kiedas-orbiter-preview
Icon=kiedas-orbiter-preview
Categories=Utility;
Terminal=false
EOF

# Tauri resolves BaseDirectory::Resource in an AppImage as
# $APPDIR/usr/lib/<productName> where productName = "Kieda's Orbiter Preview"
RESOURCE_DIR="$BUNDLE_DIR/Kieda's Orbiter Preview.AppDir/usr/lib/Kieda's Orbiter Preview"
mkdir -p "$RESOURCE_DIR"
cp -a "$REPO/src-tauri/target/release/data" "$RESOURCE_DIR/"
test -f "$RESOURCE_DIR/data/assets/data/wiki-baro-acquisition.json"

run_low_impact "$LINUXDEPLOY" \
  --appdir "Kieda's Orbiter Preview.AppDir" \
  --executable "$REPO/src-tauri/target/release/kiedas-orbiter-preview" \
  --desktop-file "$DESKTOP_FILE" \
  --icon-file "$REPO/src-tauri/icons/icon.png" \
  --icon-filename "kiedas-orbiter-preview" \
  --output appimage \
  --plugin gtk

echo "==> Copying result to ~/AppImages"
cp --remove-destination "Kieda's_Orbiter_Preview-x86_64.AppImage" "$HOME/AppImages/kiedas_orbiter_preview.appimage"
chmod +x "$HOME/AppImages/kiedas_orbiter_preview.appimage"

echo "==> Done. Exit the distrobox and launch via your normal shortcut."
