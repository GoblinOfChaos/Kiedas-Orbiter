#!/usr/bin/env bash
# Full AppImage rebuild sequence. Run this FROM INSIDE the dev-fedora
# distrobox (it needs the webkit2gtk/compiler toolchain installed there).
#
#   distrobox enter dev-fedora
#   bash /var/home/jedwards/kiedas-orbiter/scripts/rebuild-appimage.sh
#
# pnpm tauri build's own internal linuxdeploy call reliably fails at the
# very end (a known upstream Tauri/linuxdeploy bug) - this script picks up
# where it leaves off and finishes packaging manually.
set -euo pipefail

REPO="/var/home/jedwards/kiedas-orbiter"
BUNDLE_DIR="$REPO/src-tauri/target/release/bundle/appimage"
LINUXDEPLOY="/var/home/jedwards/.cache/tauri/linuxdeploy-x86_64.AppImage"

cd "$REPO"
export PATH="/home/jedwards/.local/share/pnpm/bin:$PATH"
export APPIMAGE_EXTRACT_AND_RUN=1
export NO_STRIP=1

# Keep a live Warframe/Proton session responsive while building. Distrobox
# shares the host's CPU, memory, and disk with the game, so an unrestricted
# optimized Rust build plus AppImage packaging can starve the game's input
# and render threads. Four pinned cores, low CPU priority, and idle I/O
# priority keep the build moving without taking the machine away from play.
BUILD_CPUS="0-3"
export CARGO_BUILD_JOBS=4
export RAYON_NUM_THREADS=4

run_low_impact() {
  nice -n 10 ionice -c 3 taskset -c "$BUILD_CPUS" "$@"
}

echo "==> Building (the bundler's own linuxdeploy step will likely fail at the end - that's expected)"
run_low_impact pnpm tauri build --bundles appimage || true

echo "==> Cleaning stale AppDir and finishing packaging manually"
rm -rf "$BUNDLE_DIR/Kieda's Orbiter.AppDir"
cd "$BUNDLE_DIR"

# Don't depend on tauri-bundler's transient appimage_deb staging output -
# it's only present when a previous run happened to build that target too,
# and isn't reliably regenerated. Write the desktop file directly instead.
DESKTOP_FILE="$BUNDLE_DIR/kiedas-orbiter.desktop"
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=Kieda's Orbiter
Comment=Warframe companion app
Exec=kiedas-orbiter
Icon=kiedas-orbiter
Categories=Game;Utility;
Terminal=false
EOF

# linuxdeploy creates a fresh AppDir from the executable, so it does not
# retain Tauri's prepared resource tree. Tauri resolves BaseDirectory::Resource
# in an AppImage as $APPDIR/usr/lib/kiedas-orbiter; copy the staged resources
# there before linuxdeploy emits the final AppImage.
RESOURCE_DIR="$BUNDLE_DIR/Kieda's Orbiter.AppDir/usr/lib/kiedas-orbiter"
mkdir -p "$RESOURCE_DIR"
cp -a "$REPO/src-tauri/target/release/data" "$RESOURCE_DIR/"
test -f "$RESOURCE_DIR/data/assets/data/wiki-baro-acquisition.json"

run_low_impact "$LINUXDEPLOY" \
  --appdir "Kieda's Orbiter.AppDir" \
  --executable "$REPO/src-tauri/target/release/kiedas-orbiter" \
  --desktop-file "$DESKTOP_FILE" \
  --icon-file "$REPO/src-tauri/icons/icon.png" \
  --icon-filename "kiedas-orbiter" \
  --output appimage \
  --plugin gtk

test -f "Kieda's Orbiter.AppDir/usr/lib/kiedas-orbiter/data/assets/data/wiki-baro-acquisition.json"

echo "==> Copying result to both shortcut paths"
cp "Kieda's_Orbiter-x86_64.AppImage" "Kieda's Orbiter_0.7.0_amd64.AppImage"
chmod +x "Kieda's Orbiter_0.7.0_amd64.AppImage"
cp "Kieda's_Orbiter-x86_64.AppImage" "$HOME/AppImages/kiedas_orbiter.appimage"
chmod +x "$HOME/AppImages/kiedas_orbiter.appimage"

echo "==> Done. Exit the distrobox and launch via your normal shortcut (never from inside the container)."
