# Cephalon Kronos

An open source desktop companion for Warframe built with React, Rust, and Tauri.

Cephalon Kronos automatically tracks your inventory, relics, rivens and mastery progress while providing world-state data and personal tools to accompany you alongside your game.

## Features

* **Dashboard**: Real-time world state data for Arbitrations, Fissures, Sorties, Circuit, Bounties, 1999 calendar and more.
* **Inventory & Foundry**: Search through your inventory with various filters including prime sets and track blueprints in your foundry.
* **Rivens**: See currently owned rivens and their stats.
* **Relic Management**: Track owned relics, see which relics to spend your displayed void traces on with radshare selection and expected ducat/platinum prices from WFM.
* **Notifications & Overlays**: Always pick the best reward the relic reward screen with the automatic relic overlay and choose between various notifications including arbitrations and maxed syndicate progress.
* **Mastery Tracker**: Track your mastery progress across categories and identify items and nodes you haven't gained mastery from yet.
* **Notes**: Integrated notepad with markdown support to keep game-related guides and notes at hand.
* **World Maps**: Interactive maps for Cambion Drift, Orb Vallis, Duviri, and Plains of Eidolon.
* **Checklist & Syndicates**: Keep track of (daily/weekly) repeating tasks and vendors and track progress across the focus schools and all syndicates.

## Privacy and Security

Cephalon Kronos was designed to be independent of any external services. That means it doesn't require closed source third party software to be monitoring your game. It merely uses [**warframe-api-helper**](https://github.com/Obsidian-Jackal/warframe-api-helper) to retrieve session data from game memory to then fetch necessary data to process and display. It also makes use of scanning the game's own EE.log file to provide further functionality such as the relic overlay.

## Disclaimer

This application is **not** affiliated with Digital Extremes. It utilizes a memory-scanning helper. Use this software at your own risk. **I am not responsible for any bans or other consequences that may result from using this application.**

## Installation & Usage

1. Download the version for your OS from the releases page.
2. Windows: Run the setup. Linux / macOS: Put the binary in its own folder for cleanest setup. 
3. If Warframe isn't running, launch it.
4. Go to settings and start monitoring.
5. Consult the wiki in case of issues.

## Build from Source

### Prerequisites

* Rust
* Node.js
* pnpm

**Linux** (Debian/Ubuntu) requires these system packages:

```bash
sudo apt install -y pkg-config build-essential libgtk-3-dev libwebkit2gtk-4.0-dev \
  libappindicator3-dev librsvg2-dev patchelf clang lld libasound2-dev libssl-dev \
  libdbus-1-dev libpango1.0-dev libcairo2-dev libarchive-dev libicu-dev libcap-dev
```

For other distros, install the equivalent packages for your package manager.

### Optional: OCR support (Tesseract)

* **Linux**: `sudo apt install tesseract-ocr`
* **macOS**: `brew install tesseract dylibbundler`
* **Windows**: Install Tesseract (e.g. `choco install tesseract`) or place `tesseract.exe` and DLLs in `src-tauri/data/bin/`

### Build

```bash
# Install frontend dependencies
pnpm install

# Build the Tauri app
pnpm tauri build
```
## Known Issues

- macOS and GNOME (Linux) currently untested, appreciate feedback.
- App is in active development and awaiting crossplatform day-to-day testing on each release.

Please report bugs or any other suggest features in the [issues page](https://github.com/glowseeker/cephalon-kronos/issues).

