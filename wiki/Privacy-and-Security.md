# Privacy & Security

## Design Philosophy

Cephalon Kronos is fully open-source and does not require closed-source third-party software.

## Data Collection

**What the app does NOT do:**
- No account sign-up required
- No telemetry
- Does not modify game files
- Does not inject code
- Does not send personal data over the internet

**What the app reads from memory:**
- Session credentials (`accountId` + `nonce`) - used to fetch inventory data from Digital Extremes mobile API at `mobile.warframe.com`
- EE.log ring buffer - Warframe's in-process debug log, read to detect relic reward screens, ingame menu navigation and mission events

**External network requests:**
| Purpose | Endpoint | Data |
|---------|----------|------|
| Game data exports | `raw.githubusercontent.com/calamity-inc/warframe-public-export-plus` | Public game data (items, mods, relics, etc.) |
| Worldstate | `oracle.browse.wf/worldState.json` | Live game worldstate |
| Arbitrations / Incursions | `browse.wf/arbys.txt`, `browse.wf/sp-incursions.txt` | Public rotation data |
| Localisation | `oracle.browse.wf/dicts/en.json` | Supplementary dictionary |
| Item images | `browse.wf` | Icon images (on demand) |
| Pricing | `relics.run/history` | Ducat/platinum price data |
| App updates | Tauri updater endpoint | Release metadata |

## How Memory Reading Works

The bundled `warframe-api-helper` utility scans Warframe's process memory allocations to find:

1. **Auth tokens**: Searches for patterns like `?accountId=...&nonce=...` to retrieve session credentials for API access.
2. **EE.log ring buffer**: Enumerates memory allocations, scores them for valid log line density, and polls the best candidate every 150ms to extract log lines.

No memory is modified. The helper uses `ReadProcessMemory` (Windows) or `ptrace`-based reads (Linux).

## Source Code Transparency

The full source code is available in this repository:
- Rust backend: `src-tauri/src/`
- React frontend: `src/`
- C++ memory helper: `helpers/main.cpp`
- Neural network model training pipeline: `tools/riven-pricer/`
