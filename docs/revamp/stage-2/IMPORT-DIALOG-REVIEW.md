> Latest follow-up: the approved exit-status correction and real Linux GTK picker/import/replacement checks pass. See [EXIT-STATUS-AND-NATIVE-UI.md](EXIT-STATUS-AND-NATIVE-UI.md). Earlier failures and limits below are preserved as historical evidence.

# Import-dialog validation follow-up

## Empty dialog: PASS within tested bounds

`evidence/dialog-layout-packaged-smoke.json` records actual native WebDriver opening the dialog at 1200x800 and 900x500. At minimum size the empty dialog is 494px high, from y=3 to y=497; all measured controls fit. This does not cover a selected path or status text. The debug installed executable remains the previously verified 4eb5f936... artifact.

## Content workflow: harness failure, not an app failure

`evidence/dialog-content-packaged-smoke.json` records the unsuccessful test. The proposed picker stub tried assigning window.__TAURI_INTERNALS__.invoke. The installed Tauri 2.11.5 source, scripts/core.js:81-114, defines invoke using Object.defineProperty with only a value descriptor, making it non-writable. The dialog still displayed No folder selected and Import selected remained disabled. The expected output file was therefore absent. No successful UI import or content-layout claim can be made from that run.

Both harnesses and native logs are preserved. No application source or compiled artifact was altered. No fix to the failed harness has been applied.

## Proposed next validation approach

Create an isolated component/browser fixture for the actual PreviewImport component, with deliberately mocked Tauri picker/import responses and the existing CSS. Check selected-path, success/error message layout, focus and replace-control states. Label these as component/UI tests, not native end-to-end tests. Existing native importer evidence remains separate. A full OS-folder-chooser integration test still requires a suitable desktop/portal environment.

Recovery/crash testing has not advanced in this follow-up. Stage 2 remains held.

## Approved component fixture attempt

The isolated fixture now imports the unchanged PreviewImport component and aliases the two Tauri module imports to explicit synthetic mocks. Vite compilation passed. Existing compiled app CSS and adjacent assets were copied into the fixture to retain production styles and relative font URLs. Source/CSS hashes, fixture source, build script, browser harness, and logs are preserved under evidence.

The MiniBrowser WebDriver session request timed out before navigation or any assertion. `component-dialog.json` records `error: timed out`, with empty checks and states. This is a test-startup blocker: no selected-path, status-layout, focus, or replacement-control result is claimed. The harness catches errors and writes evidence, so its zero process exit does not mean tests passed. No correction or rerun has been applied.

The native OS picker remains untested. Stage 2 remains held. `component-dialog-baseline-check.json` freshly verifies all 850 original tracked files unchanged.

## Corrected fixture run: behavior PASS, minimum-height layout FAIL

User approved diagnosis/correction of the fixture startup. The harness now supplies `args: ["--automation"]` when launching MiniBrowser through WebDriver. MiniBrowser's upstream source exposes that automation option: https://github.com/WebKit/WebKit/blob/main/Tools/MiniBrowser/gtk/main.c . The corrected session completed. Previous timeout evidence and harness are retained with `before-startup-fix-` prefixes.

The first completed run exposed a fixture asset-serving defect: production CSS contains absolute `/assets/` font URLs, whereas the fixture initially copied fonts only under `/styles/`. HTTP logs record font 404s, so that run's 514px empty-dialog measurement used fallback fonts. The approved server-plumbing correction additionally serves existing font files under `/assets/`; the build script reproduces this. No app source, CSS, or binary was changed or rebuilt. The fallback-font run is retained under `before-font-path-fix-` prefixes. The prior statement about relative font URLs was incorrect.

`component-dialog.json` now records 32/32 passing behavior checks across success/error at 1200x800 and 900x500: initial focus, selected path, import enabling, exact mocked arguments including replacement opt-in, status text, fieldset disabled state, forward Tab wrap, and Escape focus restoration. Replacement was enabled through a DOM checkbox click; button clicks and keyboard input used WebDriver. Mock responses are immediate: busy-state timing and native imports are not covered.

All 12 layout states were measured. Eight fit; four selected/result states at minimum size do not. With real fonts, the empty dialog is 494px tall and matches prior native measurements exactly. At 900x500, the synthetic long-path state is 526px tall (top -13, bottom 513); the synthetic success/error result state is 578px tall (top -39, bottom 539). At 1200x800 all tested states fit. These are real-component browser measurements with mocked transport, not a native OS-picker test.

Proposed, UNAPPLIED app correction: `IMPORT-DIALOG-HEIGHT-FIX.patch` adds `max-h-[calc(100dvh-2rem)] overflow-y-auto` to the dialog section. This limits height to the viewport minus existing outer padding and permits internal scrolling. Apply only after approval, then rebuild the isolated Preview frontend/fixture and retest content visibility, scrolling, and keyboard behavior. No correction has been made to PreviewImport.jsx. Stage 2 remains held. All 850 original tracked files remain unchanged in a fresh baseline check.

## Approved height correction applied: 60 checks PASS

The user approved IMPORT-DIALOG-HEIGHT-FIX.patch; it is now applied in the isolated Preview checkout. The only new app edit adds the maximum-height and vertical-scroll classes to PreviewImport.jsx. The previously staged title line remains unchanged.

`dialog-height-build.log` records successful Preview-mode Vite frontend and component-fixture builds. Both ran at reduced priority with four-core CPU affinity. The fixture build now discovers current hashed production CSS filenames, preventing stale CSS links after rebuild. Vite reports the external /styles stylesheet links as resolved at runtime; the build script subsequently copies those files as before. Native binaries/packages were not rebuilt or deployed and their prior results do not validate this new CSS.

`component-dialog.json` records 60 passing checks: the prior 32 behavior checks, 12 viewport-bounds checks, 12 checks scrolling all enabled dialog controls into view, and four visible-focus checks after forward Tab wrap. All 12 measured states fit. At 900x500 the dialog is consistently 468px tall, top 16/bottom 484; scrollHeight exceeds clientHeight as expected. At 1200x800 the tested heights remain 494/526/578px, fitting without overflow.

Scroll reachability uses DOM scrollIntoView and geometry inspection; it does not claim physical mouse-wheel/touch scrolling coverage. Focus wrapping uses WebDriver Tab. The importer and folder picker remain module mocks, so no additional native OS-picker or backend acceptance is claimed. No crash/platform coverage is added. Stage 2 remains held for remaining acceptance.

The immediately preceding harness/results are retained under before-height-fix prefixes. The cumulative implementation patch/hash includes the correction; its prior patch and JSON are preserved with before-dialog-height-fix prefixes. `dialog-height-baseline-check.json` freshly verifies 850 original tracked files with zero mismatches.

## Rebuilt release packages: native smoke PASS

The optimized Ubuntu release rebuilt successfully (1m12s), then both Debian and AppImage bundles completed offline using the existing locked dependencies and cached AppImage runtime. Logs: `after-dialog-native-build.log`, `after-dialog-native-bundle.log`. Reusable scripts are under evidence/ubuntu-build. No further application or dependency edits were needed.

Each package passed 23 checks: ten startup/isolation/title/navigation/focus assertions, four native dialog geometry/control-reachability cases, and nine real IPC rejections (five live/update commands and four marketplace mutations). Both also passed bundled-resource byte comparisons, including fallback after moving the synthetic cached copy aside. The Debian package installed and removed in its disposable container, leaving its executable absent and synthetic profile retained. AppImage used extraction mode; FUSE integration remains untested.

At 900x500, both native dialogs are 468px tall and stay inside the viewport with vertical scrolling. At 1200x800 the empty state is 494px, and the injected-content state is 582px. Content stress deliberately modifies DOM paragraph text; it does not operate the OS chooser, set React source state, or perform an import. Existing 60-check component evidence covers mocked React success/error behavior separately. Scroll tests use scrollIntoView and geometry, not physical wheel/touch gestures.

`after-dialog-release-artifacts.json` records actual new binary/package hashes and sizes; `release-artifacts.json` now mirrors this current manifest. The installed Debian executable hash is independently recorded in after-dialog-deb-packaged-smoke.json; it differs from the pre-bundle executable because bundling marks the binary. The AppImage smoke hashes the actual AppImage artifact. Old release binaries/packages remain under .preview-work/ubuntu-build/before-dialog-native-fix, and their original manifest is preserved as before-dialog-native-fix-release-artifacts.json. No old native evidence has been overwritten or reclassified as validating the new artifact.

`after-dialog-summary.json` consolidates both successful runs. `after-dialog-native-baseline-check.json` verifies all 850 original tracked files unchanged. No host installation, publishing, signing, dependency change, or new app-source change occurred in this batch. Stage 2 remains held: native chooser/import UI, crash recovery, full release/schema upgrade, and outstanding platform coverage are not closed by these checks.
