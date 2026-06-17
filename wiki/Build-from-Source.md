# Building from Source

## Prerequisites

- [Rust](https://rustup.rs/) (stable toolchain)
- [Node.js](https://nodejs.org/) (LTS recommended)
- [pnpm](https://pnpm.io/installation)

### Linux (Debian/Ubuntu)

```bash
sudo apt install -y pkg-config build-essential libgtk-3-dev libwebkit2gtk-4.1-dev \
  librsvg2-dev patchelf clang lld libasound2-dev libssl-dev \
  libdbus-1-dev libpango1.0-dev libcairo2-dev libarchive-dev libicu-dev libcap-dev
```

For other distros, install equivalent packages via your package manager.

### Windows

- Install [Microsoft Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) or [Rust for Windows](https://rust-lang.github.io/rustup/installation/windows.html)
- The C++ helper can be cross-compiled via MinGW using `helpers/build_win.sh`

### macOS

- Xcode Command Line Tools: `xcode-select --install`
- No additional system packages required

## Build Steps

```bash
# Clone the repository
git clone https://github.com/glowseeker/cephalon-kronos.git
cd cephalon-kronos

# Initialize submodules (C++ helper library)
git submodule update --init --recursive

# Install frontend dependencies
pnpm install

# Build the Tauri app (Rust backend + React frontend)
pnpm tauri build
```

The output binary will be in `src-tauri/target/release/bundle/`.

## Rebuilding the C++ Helper

Pre-compiled binaries for `warframe-api-helper` are included for each platform. To rebuild from source:

```bash
# Windows (MinGW cross-compile)
bash helpers/build_win.sh

# Linux
bash helpers/build_linux.sh

# macOS
bash helpers/build_macos.sh
```

These scripts compile `helpers/main.cpp` along with the `Soup` library (at `lib/soup/`) into a standalone binary placed in `src-tauri/data/bin/`.

## Development Mode

For development with hot-reload:

```bash
pnpm tauri dev
```

Starts Vite dev server for React frontend and launches Tauri in dev mode with debug Rust build.

## Project Structure

```
cephalon-kronos/
├── src/                    # React frontend
│   ├── main.jsx            # Entry point
│   ├── App.jsx             # Routing (main + overlay windows)
│   ├── contexts/           # React context providers
│   ├── lib/                # Parser + utility modules
│   ├── screens/            # UI screens (12 files)
│   └── components/         # Shared components + overlays
├── src-tauri/              # Tauri app (Rust backend)
│   ├── src/                # Rust source code
│   ├── data/               # Bundled assets
│   ├── build.rs            # Compile-time asset walker
│   └── tauri.conf.json     # Tauri v2 configuration
├── helpers/                # C++ memory scanner source
│   ├── main.cpp            # warframe-api-helper
│   └── build_*.sh          # Cross-compile scripts
├── lib/soup/               # C++ utility library (submodule)
├── tools/riven-pricer/     # Python ML training pipeline
└── docs/                   # Website (GitHub Pages)
```

For a complete architecture breakdown, see [ARCHITECTURE.md](https://github.com/glowseeker/cephalon-kronos/blob/master/ARCHITECTURE.md).
