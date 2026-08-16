# Kieda's Orbiter

> Kieda's Orbiter is a fork of [Cephalon Kronos](https://github.com/glowseeker/cephalon-kronos)
> by glowseeker, used under the MIT License (Commons Clause applies only to the
> bundled warframe-api-helper binary — see [LICENSE](./LICENSE)).

<p align="center">
  <img src="https://img.shields.io/github/v/release/GoblinOfChaos/Kiedas-Orbiter?label=Release&color=cbd5e1" alt="Release">
  <img src="https://img.shields.io/github/downloads/GoblinOfChaos/Kiedas-Orbiter/total?label=Downloads&color=94a3b8" alt="Downloads">
  <img src="https://img.shields.io/badge/Windows%20|%20Linux%20|%20macOS-0865e0" alt="Platform">
  <img src="https://img.shields.io/badge/License-MIT-94a3b8" alt="License">
  <img src="https://img.shields.io/github/stars/GoblinOfChaos/Kiedas-Orbiter?label=Stars&color=cbd5e1" alt="Stars">
</p>

An open-source, cross-platform desktop companion for Warframe built with
React, Rust, and Tauri — a free alternative to Overwolf-based tools like
AlecaFrame for players on Linux, where Overwolf isn't available at all.

Kieda's Orbiter tracks your inventory, relics, rivens and mastery progress,
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
* **Settings** - Theme picker, sync controls, global hotkeys, update triggers.

## FAQ

### Is this safe to use? Will I get banned for this?
As with all 3rd party software, use this at your own risk. It's open source and thus every single line of code is available for you or anyone else to inspect in the repo. Concerning account security, due to the nature of this being unofficial 3rd party software, Digital Extremes will never endorse or support it, which leaves us to trust their goodwill and their track record with other 3rd party apps.

**This app is not affiliated with Digital Extremes. Use at your own risk.**

### What platforms does this work on?
Currently this app works on **Windows**, **Linux**, and **macOS**.<br>It should however be noted that:
- macOS builds haven't been tested yet due to lack of opportunity.
- Linux builds may be unstable due to variety in Linux distributions and configurations.
- Game needs to be running in borderless fullscreen for overlays to work.

### How does this work?
This app is built on a cross-platform stack consisting of Tauri and React. It reads session tokens directly from Warframe's game memory and tails its EE.log ring buffer in real-time to detect relic rewards and mission events. For more details see [ARCHITECTURE.md](./ARCHITECTURE.md).

### Is it free to use? Does it have ads?
1. Yes, it's completely free and open-source.
2. No, it does not have any ads.

### Does it do ... ?
Probably; most information that the game exposes is made use of to an extent. For a full list, check the wiki under [features](https://github.com/GoblinOfChaos/Kiedas-Orbiter/wiki/Features). If there's something you'd like to see get added or you found a bug, feel free to open an issue on the [issues page](https://github.com/GoblinOfChaos/Kiedas-Orbiter/issues).

## Installation & Usage

1. Download the version for your OS from the [releases page](https://github.com/GoblinOfChaos/Kiedas-Orbiter/releases/latest).
2. **Windows:** Run the setup and install in preferred folder. **Linux / macOS:** Move the binary into its own folder. 
3. Launch Warframe.
4. Open the app, go to **Settings**, and start syncing.
5. For issues, check the [wiki](https://github.com/GoblinOfChaos/Kiedas-Orbiter/wiki).

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