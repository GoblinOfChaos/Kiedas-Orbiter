> Current checkpoint: [CURRENT-ACCEPTANCE.md](CURRENT-ACCEPTANCE.md). It supersedes historical pending/status wording below. Stage 2 remains held.

# Stage 2 remaining acceptance work

Current count: **8 validation batches plus final user review**. These are grouped work packages, not estimated tool calls or turns. Discovered defects require fixes/retests; unavailable environments remain BLOCKED with the gate held. This checklist consolidates remaining requirements from Stage 1 PREVIEW-SPEC.md and supersedes stale pending labels in historical follow-up prose, without deleting evidence.

| Batch | Remaining work | Current status / completion condition |
|---|---|---|
| 1. Linux release and migration matrix | Release build; empty Preview root, existing directory without settings, existing settings; executable-adjacent legacy fixtures; unavailable OS-directory failure; stable migration regression | PENDING. Existing tests are debug and do not complete this matrix. |
| 2. Stable/Preview coexistence | Actual stable and Preview packages together; independent executable/desktop/profile paths; remove each without harming the other; real version migration only where an actual candidate exists | PENDING. Preview-only install/purge and metadata-only upgrade have passed; no real stable package was located in the initial repository file search. |
| 3. Runtime isolation coverage | Remaining OCR/overlay/sound/API/write commands; adversarial paths; startup attach/hotkey/notification suppression and updater-request tracing; identity mismatch; settings concurrency | PARTIAL. Nine direct guards passed. Complete per-surface runtime evidence or explicitly document blockers. |
| 4. Remaining import workflows | Inventory/history/preferences/checklist; import-dialog replace flow; checklist hydration/storage failure; crash/concurrency behavior and recovery limits | PARTIAL. Notes/maps, credential scrub, rejection and controlled rename rollback passed. |
| 5. UI acceptance | All 20 screen bodies with bundled data; actual keyboard navigation and pointer interaction at 900x500 and normal size; scrolling, focus, favorites and localization; preserve overlays and no-AI-art provenance | PARTIAL. Route-selection/session persistence passed; full screen/layout/keyboard acceptance remains. |
| 6. Linux distribution packaging | Release AppImage build/launch/resources and target dependency compatibility; package cleanup/coexistence results consolidated | PARTIAL. Equipped Ubuntu debug Debian install/launch/resource fallback/purge passed. |
| 7. Windows acceptance | Native build/install/storage/coexistence and integration suppression matrix | BLOCKED pending an appropriate Windows environment; static schema checks are not runtime evidence. |
| 8. macOS acceptance | Native build/install/storage/coexistence and integration suppression matrix | BLOCKED pending an appropriate macOS environment; static schema checks are not runtime evidence. |

After these: consolidate the evidence ledger, preserve the final patch and provenance, recheck the original baseline, and obtain the user's Stage 2 review before Stage 3. A fully passing cross-platform gate cannot be claimed while batches 7 or 8 remain blocked.

Already verified work is retained: Preview shell/source isolation, frontend/policy tests, Fedora and Ubuntu debug builds, native debug legacy fixture, nine guards, eleven notes/maps import assertions, seven controlled rollback checks, Ubuntu resource fallback, package-manager metadata upgrade and removal of 505 owned files.
