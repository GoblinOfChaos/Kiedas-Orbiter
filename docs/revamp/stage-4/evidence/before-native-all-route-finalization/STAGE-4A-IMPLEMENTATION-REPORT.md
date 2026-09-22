# Stage 4A — Foundation, Shell, and Dashboard Implementation Report

## Gate status

**IMPLEMENTED AND VALIDATED — Linux — awaiting user acceptance.**

Stage 4A replaces the transitional Preview wrappers with the approved command-center foundation while preserving the Stable application path. It does not publish, install on the host, alter either user profile, enable Preview live integrations, or add generated artwork.

## Result

- A single 20-route registry now drives the Preview grouped navigation and the unchanged Stable route order.
- Preview uses the command-center shell: 248px expanded navigation, 72px compact rail, accessible drawer, global route search, truthful sync/capability/profile status, and one bounded route viewport.
- Dashboard now matches the accepted visual direction with the `Your next adventure` header, three summary metrics, a truthful zero-target state pending Stage 4C, session activity, ready-to-craft rows, and all 19 existing activity cards.
- Preview skips the two-second `get_scanner_status` poll and does not register the `scanner-hooked` notification listener. Stable retains both paths.
- The old `PreviewNavigation.jsx` and `PreviewDashboardLayout.jsx` transitional components are removed.
- `PreviewDataState.jsx` uses the installed Lucide `Loader2` export, as separately approved after the original `LoaderCircle` import failed the first Preview build.

## Source scope

The incremental patch changes exactly 23 authorized paths. It modifies `src/App.jsx`, `src/screens/Dashboard.jsx`, and `src/lib/i18n/en.json`; adds the approved `src/preview/**` foundation; and removes the two transitional Preview components. No backend source, dependency manifest, lockfile content, or raster asset changed in Stage 4A.

The accepted Cargo lockfile was restored byte-for-byte before native compilation: `e8508bffd0423001766a5e3fe2fe81a814d79795b7cfb13189fc3dfc2a2e31c1`. The original preflight wrongly treated this ignored file as generated; the corrected preflight and source-facts check now require it and compare it with the accepted Stage 2 copy.

## Validation

| Layer | Result | Evidence |
|---|---:|---|
| Source facts and authorized scope | 18/18 | `evidence/stage4a-source-facts.json` |
| Preview shell and Dashboard component behavior | 31/31 | `evidence/stage4a-component.json` |
| Stable Dashboard exact markup/callback parity | 19/19 | `evidence/stage4a-stable-markup.json` |
| Theme-token matrix | 14/14 | `evidence/stage4a-theme-matrix.json` |
| Responsive visual landmarks | 4/4 | `evidence/stage4a-visual-landmarks.json` |
| Full-App shell invocation boundary | 21/21 | `evidence/stage4a-app-boundary.json` |
| Rebuilt Debian native/package matrix | 101/101 | `evidence/stage4a-deb-packaged-smoke.json` |
| Rebuilt AppImage native/package matrix | 101/101 | `evidence/stage4a-appimage-packaged-smoke.json` |
| Original tracked baseline | 850/850, zero mismatches | `evidence/stage4a-baseline-check.json` |

Both Stable and Preview frontend builds passed. The Preview Rust binary then built `--release --offline --locked` inside the Ubuntu 24.04 bounded container with `CARGO_BUILD_JOBS=4` and `nice -n 19`. Fresh Debian and AppImage bundles were created and each passed 101 native checks in a network-disabled disposable container.

The full-App module-boundary fixture loads the real `App.jsx`, route state and Preview shell while replacing screen bodies and external contexts with inert test boundaries. After the real two-second interval, across all 20 route selections, compact drawer use and reload, it recorded only icon `read_file_bytes` invocations. It recorded zero invocations of `get_scanner_status`, `show_notification`, `relay_event`, `stop_log_scanner`, `post_market_order`, `delete_market_order`, `update_market_order`, and `close_market_order`. Both packages separately passed direct negative probes for all four market mutation IPC commands and the five existing guarded live/update commands.

## Visual evidence

- `evidence/stage4a-dashboard-desktop.png` — 1440×900 expanded command center.
- `evidence/stage4a-dashboard-compact.png` — 900×500 compact rail and single route scroller.

The screenshots use synthetic UI fixture values and existing repository icons only. No AI-generated or externally sourced raster artwork was created or added.

## Test-tooling corrections preserved

All failed runs remain under descriptive `evidence/before-*` directories. The corrections were confined to fixtures, selectors, evidence routing, or assertions: source parser key handling; exact translated labels; package evidence paths; visible compact navigation selection; old width expectations after the 72px rail increased content width; discovery of the real screen-level vertical scroller; full-App fixture import isolation; serializable WebDriver capture; focused-element Escape dispatch; and the WebKit refresh request body. The first native build also exposed the missing ignored lockfile before compilation and led to the explicitly approved restoration above.

## Artifacts and patches

- Release binary: `80d30cf8b4abce11c05074636b7b9395b6d3b8bc412dee374c248115f756f344`
- Debian package: `00edfa36c7fced5f9e187d372ecc3950cc68a999c531d119fc4f214378824d6b`
- AppImage: `15cfc5e9584a69bab43048fb361026524d849fb49116a4dd957448491e3e7a52`
- Stage 4A incremental patch: `d4236719bf7b12944bb68e6bc5ff1156029d010e520471d20057bb80e2b9c692`; applies cleanly to the accepted Stage 3K checkout.
- Cumulative Stage 2–4A patch: `f711dd2d565458a3423ebd38dc4c1cde7cc186396023b91247234322af7a9498`; applies cleanly to the original baseline.

These are local, unsigned validation artifacts. Nothing was published or installed on the host.

## Carried scope

Windows runtime validation remains **BLOCKED** and macOS runtime validation remains **UNAVAILABLE** until suitable hardware or CI access exists. Those permanent ledger items are unchanged and do not invalidate this Linux milestone. Stage 4B and later source work remains separately gated; this report grants no implementation authority beyond Stage 4A.
