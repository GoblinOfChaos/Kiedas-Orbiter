#!/usr/bin/env bash
set -euo pipefail

clean=false
[[ "${1:-}" == "--clean" ]] && clean=true

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SOUP_DIR="${SOUP_DIR:-$(cd "$SCRIPT_DIR/../lib/soup" && pwd)}"
SOUP_SRC="$SOUP_DIR/soup"
MAIN_FILE="$SCRIPT_DIR/main.cpp"
OUT_DIR="$REPO_DIR/build_int_macos"
EXE_DIR="$REPO_DIR/src-tauri/data/bin"

if $clean; then
  rm -rf "$OUT_DIR"
  echo "Cleaned $OUT_DIR"
  exit 0
fi

mkdir -p "$OUT_DIR" "$EXE_DIR"

CXXFLAGS=(
    -std=c++20 -fno-rtti -O3 -fPIE -ffunction-sections -fdata-sections
    -DSOUP_STANDALONE
)

SKIP_FILES=("main.cpp" "pch.cpp")

echo "=== Compiling soup sources ==="
for src in "$SOUP_SRC"/*.cpp; do
    name=$(basename "$src")
    skip=false
    for s in "${SKIP_FILES[@]}"; do
        if [[ "$name" == "$s" ]]; then skip=true; break; fi
    done
    $skip && continue

    obj="$OUT_DIR/${name%.cpp}.o"
    if [[ -f "$obj" && "$src" -ot "$obj" ]]; then
        continue
    fi
    echo "  $name"
    clang++ "${CXXFLAGS[@]}" -c "$src" -o "$obj" -I"$SOUP_DIR"
done

echo "  main.cpp"
clang++ "${CXXFLAGS[@]}" -c "$MAIN_FILE" -o "$OUT_DIR/main.o" -I"$SOUP_DIR" -I"$SOUP_SRC"

echo "Linking..."
LIBS=(-lc++ -pthread)
clang++ -O3 -fPIE -Wl,-dead_strip "${LIBS[@]}" "$OUT_DIR"/*.o -o "$OUT_DIR/warframe-api-helper"

cp "$OUT_DIR/warframe-api-helper" "$EXE_DIR/warframe-api-helper"
echo "SUCCESS: $EXE_DIR/warframe-api-helper ($(stat -f%z "$EXE_DIR/warframe-api-helper" 2>/dev/null || stat -c%s "$EXE_DIR/warframe-api-helper" 2>/dev/null) bytes)"
