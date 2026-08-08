# Known bugs (convert to GitHub issues once this repo is pushed)

## NSIS installer packaging fails on Windows (fresh toolchain)

Found 2026-08-07 building on a clean Windows VM (nothing cached): the
Rust app itself compiles and runs fine
(`target\release\kiedas-orbiter.exe` works, branding confirmed), but
`pnpm tauri build`'s NSIS installer-packaging step fails:

```
!insertmacro macro "NSISCOMCALL" requires 4 parameter(s), passed 7!
Error in macro IsShortcutTarget on macroline 11
Error in script "...\nsis\x64\installer.nsi" on line 1758 -- aborting
failed to bundle project: The system cannot find the file specified. (os error 2)
```

Happened right after the bundler freshly auto-downloaded NSIS 3.11
and `nsis_tauri_utils` v0.5.3 (both first-time downloads, nothing
pre-cached) - looks like a version-compatibility break between a very
new NSIS core and that plugin build's expected NSISCOMCALL calling
convention. Couldn't find a documented fix via web search in the time
spent. Workaround for now: none needed for build *verification*, but
this blocks actually producing a distributable Windows installer.

Fix ideas to try later: pin an older NSIS version instead of letting
the bundler auto-download latest (e.g. via a `NSIS_DIR` env var
pointing at a manually-installed older NSIS), or check for a newer
`nsis_tauri_utils` release built against NSIS 3.11's plugin ABI, or
try the `msi` bundle target (WiX) as an alternative to NSIS entirely.

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

## Riven overlay misreads "Critical Chance when Sliding" as plain Critical Chance

Reported by Jacob 2026-08-07 (via a friend's report): the riven
overlay's stat OCR/matching reads the conditional stat "Critical
Chance when Sliding" as the base "Critical Chance" stat instead - a
mismatch between a conditional/qualified stat and its base version.

This is in Kronos's own riven stat parsing (not yet touched - the
planned swap to wfinfo-ng's stat-based grading, per
docs/superpowers/specs/2026-08-07-kronos-fork-design.md in wfinfo-ng,
hasn't happened yet). Worth checking whether wfinfo-ng's own
`riven_stat_matching.py`/TAG_MAP has this same conditional-stat
confusion before porting the grading logic over, so it isn't
inherited into Kieda's Orbiter.
