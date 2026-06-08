#!/usr/bin/env bash
set -euo pipefail

clean=false
[[ "${1:-}" == "--clean" ]] && clean=true

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SOUP_DIR="${SOUP_DIR:-$(cd "$SCRIPT_DIR/../lib/soup" && pwd)}"
SOUP_SRC="$SOUP_DIR/soup"
MAIN_FILE="$SCRIPT_DIR/main.cpp"
OUT_DIR="$REPO_DIR/build_int_win"
EXE_DIR="$REPO_DIR/src-tauri/data/bin"

if $clean; then
  rm -rf "$OUT_DIR"
  echo "Cleaned $OUT_DIR"
  exit 0
fi

mkdir -p "$OUT_DIR" "$EXE_DIR"

# Prefer clang-cl/MSVC if available, else x86_64-w64-mingw32-clang++
CXX="${CXX:-x86_64-w64-mingw32-g++}"
AR="${AR:-x86_64-w64-mingw32-ar}"

CXXFLAGS=(
    -std=c++20 -fno-rtti -O2 -ffunction-sections -fdata-sections
    -DSOUP_STANDALONE -DWIN32_LEAN_AND_MEAN -DNOMINMAX
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
    $CXX "${CXXFLAGS[@]}" -c "$src" -o "$obj" -I"$SOUP_DIR"
done

echo "  main.cpp"
$CXX "${CXXFLAGS[@]}" -c "$MAIN_FILE" -o "$OUT_DIR/main.o" -I"$SOUP_DIR" -I"$SOUP_SRC"

echo "Linking..."
LIBS=(-static-libgcc -static-libstdc++ -lwinhttp -lcrypt32 -lws2_32)
$CXX -O2 "${LIBS[@]}" "$OUT_DIR"/*.o -o "$OUT_DIR/warframe-api-helper.exe"

cp "$OUT_DIR/warframe-api-helper.exe" "$EXE_DIR/warframe-api-helper.exe"
echo "SUCCESS: $EXE_DIR/warframe-api-helper.exe ($(stat -c%s "$EXE_DIR/warframe-api-helper.exe" 2>/dev/null || stat -f%z "$EXE_DIR/warframe-api-helper.exe" 2>/dev/null) bytes)"
