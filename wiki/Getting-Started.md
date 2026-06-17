# Getting Started

## Installation

1. Go to the [releases page](https://github.com/glowseeker/cephalon-kronos/releases/latest).
2. Download the package for your OS:
   - **Windows**: `.exe` installer
   - **Linux**: `.AppImage`
   - **macOS**: `.dmg`
3. If .exe, go through setup, else put into own folder.
4. Launch Cephalon Kronos.

## First-Time Setup

On first launch, the app will show a setup dialog where you can optionally configure:

- **Cache path**: Where game assets will be exported from for the mod images.
- **Log path**: Where Warframe stores EE.log

If you don't know where these are located, skip them for now and reconfigure them from settings where you'll be shown where they are usually found.

There's also a checkbox for the risk disclosure, make sure you read it and agree to it before being able to proceed.

## Scanning Your Inventory

There are two ways to get your inventory data:

1. **Manual scan** - Go to **Settings** > **Monitoring** and click "Manual Refresh". Fetches current inventory once.
2. **Live Monitoring** - Go to **Settings** > **Monitoring** and press "Start". Periodically refreshes inventory.

Inventory data is cached locally and persists across sessions with a little widget at the bottom of the sidebar telling you when the last scan was done.

## Using Overlays

The real-time overlays require **EE.log scanner** to be enabled. Once active:

- When the relic reward screen appears, the overlay detects rewards via OCR and show you the ducat and platinum value and if its part of a set, it will show you the entirety the set with all subcomponents and how many you own and have crafted.
- Riven overlays are either triggered by opening a Riven mod linked in chat where it will show grading and estimated value etc. or when cycling rivens in which case it will show another overlay for the second riven to allow for comparison.
- The rest of the overlays are shown with toast notifications depending on how you set them up in settings.

