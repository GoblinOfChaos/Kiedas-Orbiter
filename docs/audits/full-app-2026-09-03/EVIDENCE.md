# Evidence Index

## Frozen evidence root

Raw evidence is retained read-only for this audit at:

`/var/home/jedwards/.cache/codex-audits/kiedas-orbiter-full-audit-20260903.VcuWdn/evidence`

The frozen source is adjacent at `source/`; temporary audit-only harnesses are in `audit-tools/`. Those harnesses are not application source and are not proposed for inclusion in the product.

## Principal machine artifacts

| Evidence | SHA-256 | Purpose |
| --- | --- | --- |
| `surface-inventory.json` | `961c8badd3c3f2982108c486d074b4ed487e6bf8a406d302bc7ae610ae96aba6` | Controls, commands, events, settings, storage, URLs |
| `localization-audit.json` | `7a0621770743a88e4769528635de6123d4ac5474c8911f096954bcdb538333b5` | 15-locale key and placeholder parity |
| `bulk-inventory-audit.json` | `1e0eccec297e3f300a89a27da3bdefb476a421ab5eb49681a3bd01d48e61d5c3` | Inventory/data-family structural validation |
| `official-publicexport-comparison.json` | `a0b3c2b4c0af1f90d23dabcaf6e4fb7efc01464fcf12c6955206857fc859c572` | Cached data versus current official DE manifests |
| `cosmetics-current.json` | `179cc253c049fca274e7b90e99f85787b4b3b03479f574aaeb948b5a132719f3` | Effective catalog counts/classification |
| `cosmetics-catalog.json` | `114a106aea8bef432953aff003e4bb067f7cec1fcd2f950d5b3cab2f746ae763` | All 7,382 effective displayed cosmetic records |
| `acquisition-audit.json` | `4349f794690a417f673074d79a652fa009fd4c507c529cb9c2c02bfe5af1ec03` | Missing/generic/malformed acquisition results |
| `acquisition-resolved-all.json` | `9419dbaa21a3eb7fdcb48c14fb3ee598a1738bccc0d6b5c1f994194c4c7646bd` | Exact resolver output for every cosmetic record |
| `cosmetics-image-cache-audit.json` | `4d9a28825ff1867162809302c79ae3a9e6ecdaac6bbe28d109cb9055795696e6` | Resolved image URLs and cached-image signature checks |

## Build evidence

- Frontend build: 2,837 transformed modules; completed in 10.06 seconds; chunk-size warnings recorded.
- Rust release build: completed in 7 minutes 1 second under `nice -n 19` and `CARGO_BUILD_JOBS=4`.
- Clippy: host attempt blocked by missing JavaScriptCoreGTK development metadata; the Fedora packaging environment completed with one warning.
- Tauri `linuxdeploy`: built-in attempt failed; existing `dev-fedora` packaging path produced the frozen AppImage.
- Source-to-package resource comparison: 499 files, no differences.

## Current authoritative endpoints

- Digital Extremes WorldState: `https://api.warframe.com/cdn/worldState.php`
- Digital Extremes PublicExport: `https://content.warframe.com/PublicExport/`
- Official Warframe Wiki: `https://wiki.warframe.com/`
- Tauri updater documentation: `https://v2.tauri.app/plugin/updater/`
- Tauri asset protocol: `https://v2.tauri.app/security/asset-protocol/`
- Tauri CSP guidance: `https://v2.tauri.app/security/csp/`
- Tauri capabilities: `https://v2.tauri.app/reference/acl/capability/`
- Tauri IPC/security model: `https://v2.tauri.app/security/`

## Evidence not yet collected

Runtime screenshots, accessibility observations, window geometry, process samples, persistence diffs, and live EE.log/OCR evidence will be indexed here after the operator-coordinated sessions. Missing evidence is never treated as a Pass.

## Operator-supplied live observation

### LIVE-OBS-001 — Endless-fissure reward mismatch

- Date received: 2026-09-03
- Evidence: Screenshot attached by the operator in the audit conversation.
- Visible Warframe rewards: `Vadarya Prime Stock`, `Yareli Prime Chassis Blueprint`, and `Bronco Prime Barrel`.
- Visible overlay rewards: `Vadarya Prime Stock`, `Yareli Prime Blueprint`, and `Bronco Prime Barrel`.
- Result: Fail. Slot 2 resolved a chassis component as the parent Warframe blueprint and displayed the wrong item/ownership context.
- Operator selection: `Yareli Prime Chassis Blueprint`.
- Inventory confirmation: At 2026-09-03 14:15:48 PDT, the final entry in `data/user/inventory_history.json` recorded `/Lotus/Types/Recipes/WarframeRecipes/YareliPrimeChassisBlueprint` with `delta: 1`, `from: 1`, and `to: 2`. The refreshed `data/user/inventory.json` reported the same item with `ItemCount: 2` at 14:15:53 PDT.
- Artifact provenance: A read-only host process inspection found the currently running app at `/var/home/jedwards/AppImages/kiedas_orbiter.appimage`, SHA-256 `76c40481aee49a64964832b8e374a2ff4e018266294b01d01f98f32868354995`. The frozen audit artifact is different, so this observation is evidence about the installed build and a required frozen-build regression case.
- Privacy: Player names visible in the original screenshot must be cropped or redacted before any exported evidence bundle is published.

## Frozen AppImage clean-profile runtime

### RUNTIME-FRESH-001 — Startup and packaged resources

- Artifact SHA-256: `e4e2fa5f3e01a111b32cf3cbe116cf513e4e5799719f423de689bfc326be4ea4`
- Profile: isolated `profiles/fresh`; the primary profile was not used.
- First-launch screenshot: frozen evidence `runtime-fresh-onboarding.png`.
- First-run output: missing `riven_good_rolls.json`; packaged exporter reported not found; screenshot probe executed and was granted before disclaimer acceptance; OCR and pricer models downloaded; background sync found zero images.
- Package inspection: the requested runtime fallback prefix was `usr/lib/Kieda's Orbiter/data/`, but the files exist under `usr/lib/kiedas-orbiter/data/`.
- Restart/configured output: `wfcd-combined.json not found`; the same Riven/exporter failures; three custom-protocol IPC failures with postMessage fallback; one missing callback ID after reload; background sync again found zero images.
- Result: Fail.
