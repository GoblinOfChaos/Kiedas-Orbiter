# Known bugs (convert to GitHub issues once this repo is pushed)

## Checklist tab freezes the whole app (Linux)

Reported by Jacob 2026-08-07: clicking the Checklist tab in the Linux
AppImage build causes the entire window to go unresponsive - no
clicks register anywhere, resizing does nothing, repeatable every
time. No terminal output around the freeze (launched the AppImage
directly, not through a dev console, so no JS error was visible).

We did not modify `src/screens/Checklist.jsx`,
`src/components/NotificationManager.jsx`, or world-state handling
during the Kronos -> Kieda's Orbiter rebrand, so this is most likely a
pre-existing upstream bug rather than something introduced by the
fork - not yet confirmed against a stock Cephalon Kronos build though.

Read through Checklist.jsx once (2026-08-07) without finding an
obvious infinite loop - `allTasks` is recomputed fresh every render
(not memoized) and feeds a `useEffect` on `[allTasks]` that fires
every render as a result, but that alone shouldn't hang the UI.
Needs proper debugging: reproduce with Tauri devtools enabled
(`devtools` feature in Cargo.toml) to get an actual JS stack/error
instead of guessing from a source read.
