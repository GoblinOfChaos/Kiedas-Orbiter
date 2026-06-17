# Cephalon Kronos

An open-source desktop companion for Warframe built with React, Rust, and Tauri.

Cephalon Kronos tracks your inventory, relics, rivens and mastery progress,
provides live world-state data, and real-time OCR-powered overlays and notifications.

## Features

* **Dashboard** - Live world-state data: fissures, sorties, arbitrations, Nightwave, Archon Hunt,
  Circuit, bounties, 1999 calendar, cycles, Steel Path incursions.
* **Inventory & Foundry** - Search inventory with filters including prime sets, track foundry
  blueprints.
* **Mods** - Browse non-riven mod inventory with search and filtering.
* **Rivens** - View owned rivens with neural network price prediction with grading and reroll potential analysis.
* **Relic Management** - Track owned relics grouped by era/name with refinement counts.
* **Notifications & Overlays** - Overlays for Rivens and fissure rewards, notifications for Arbitrations, Void Fissures, Foundry and more.
* **Mastery Tracker** - MR progress, starchart completion, mastery XP totals by category.
* **Notes** - Built in markdown notepad for notes on builds, strategies, etc.
* **World Maps** - Pannable/zoomable maps for Cambion Drift, Orb Vallis, Duviri,
  and Plains of Eidolon with support for custom routes.
* **Checklist & Syndicates** - Daily/weekly task tracking,
  focus school progress and syndicate standings.
* **Collectibles** - Track Kuria, somachord, frame fighter fragments, cephalon fragments,
  Leverian prex cards, open world exploration from inventory data.
* **Settings** - Theme picker, monitoring controls, global hotkeys, update triggers.

## Privacy and Security

Cephalon Kronos does not require closed-source third-party software. It bundles:

- **[warframe-api-helper](https://github.com/Sainan/warframe-api-helper)** - Scans
  Warframe process memory for session credentials (`accountId` + `nonce`), then fetches
  inventory data from `mobile.warframe.com`. No memory is modified.
- **EE.log memory watcher** - Built-in C++ addon to the API helper that reads the in-process EE.log ring buffer
  from Warframe memory allocations, extracts log lines, and streams them to the app for
  overlay triggers.

Network requests are limited to game data exports, worldstate APIs, and optional
warframe.market pricing.

> **Disclaimer:** This application is **not** affiliated with Digital Extremes. It utilizes a
> memory-scanning helper. Use this software at your own risk. **I am not responsible for any
> bans or other consequences that may result from using this application.**

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full codebase breakdown: EE.log memory watcher,
OCR pipeline, riven price prediction model, collectibles data flow, overlay management,
and project layout.

## Installation & Usage

1. Download the version for your OS from the [releases page](https://github.com/glowseeker/cephalon-kronos/releases/latest).
2. **Windows:** Run the setup and install in preferred folder. **Linux / macOS:** Extract the binary into its own folder. 
3. Launch Warframe (if not already running).
4. Open the app, go to **Settings**, and start monitoring.
5. For issues, check the [wiki](https://github.com/glowseeker/cephalon-kronos/wiki).

## Build from Source

### Prerequisites

* [Rust](https://rustup.rs/) (stable)
* [Node.js](https://nodejs.org/) (LTS)
* [pnpm](https://pnpm.io/installation)

**Linux** (Debian/Ubuntu) requires these system packages:

```bash
sudo apt install -y pkg-config build-essential libgtk-3-dev libwebkit2gtk-4.1-dev \
  librsvg2-dev patchelf clang lld libasound2-dev libssl-dev \
  libdbus-1-dev libpango1.0-dev libcairo2-dev libarchive-dev libicu-dev libcap-dev
```

For other distros, install the equivalent packages for your package manager.

### Build

```bash
# Install frontend dependencies
pnpm install

# Build the Tauri app (bundles Rust backend + React frontend)
pnpm tauri build
```

The bundled C++ helper (`warframe-api-helper`) is pre-compiled for each platform.
To rebuild it from source, see `helpers/build_{win,linux,macos}.sh`.

## Known Issues

- macOS and GNOME (Linux) currently untested - feedback appreciated.
- App is in active development; cross-platform day-to-day testing ongoing.

Please report bugs or suggest features on the [issues page](https://github.com/glowseeker/cephalon-kronos/issues).

