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

### macOS

- Xcode Command Line Tools: `xcode-select --install`
- No additional system packages required

## Build Steps

```bash
# Clone the repository
git clone https://github.com/glowseeker/cephalon-kronos.git
cd cephalon-kronos

# Install frontend dependencies

# Install frontend dependencies
pnpm install

# Build the Tauri app (Rust backend + React frontend)
pnpm tauri build
```

The output binary will be in `src-tauri/target/release/bundle/`.

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
├── src-tauri/src/
│   ├── mem_reader.rs       # Native EE.log ring buffer reader
│   └── memory_scan.rs      # Auth token memory scanner
├── tools/riven-pricer/     # Python ML training pipeline
└── docs/                   # Website (GitHub Pages)
```

For a complete architecture breakdown, see [ARCHITECTURE.md](https://github.com/glowseeker/cephalon-kronos/blob/master/ARCHITECTURE.md).
