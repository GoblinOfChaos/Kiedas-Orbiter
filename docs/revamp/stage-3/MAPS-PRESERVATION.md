# Maps preservation checklist

Status: **PLAN READY — HIGHER RISK — AWAITING EXPLICIT APP-SOURCE APPROVAL**.

## Map and canvas behavior

| Existing behavior | Required result |
|---|---|
| Four tabs | Plains of Eidolon, Orb Vallis, Cambion Drift and Duviri retained with IDs `0`–`3` |
| Images | Seven distinct current raw/labeled files retained; Duviri keeps its shared file |
| Fit | Existing container/image minimum formula and 1x cap retained |
| Zoom | Cursor-centered wheel zoom and 8x maximum retained |
| Pan | Mouse/pointer pan, trackpad pan, clamp and inertia retained |
| Reset | Restores current fit scale and centered transform |
| Rendering | Marker inverse scale and path inverse stroke width retained |
| Duviri | Cycle state and countdown retained |

## Configuration persistence

| Existing behavior | Required result |
|---|---|
| Root | `data/user/map-configs` under the active build-profile root |
| Schema | `{ tabId, configs }`, one file per map |
| Filenames | Existing lower-case map-name filenames and `safe_relative_join` retained |
| Load/list | Current missing-directory and malformed-file handling retained |
| Editing | Immediate local state and 400ms write debounce retained |
| Empty-folder action | Approved correction creates the directory before opening it |
| Write integrity | Approved correction uses existing atomic-byte helper instead of truncating write |
| Isolation | Stable and Preview roots remain distinct |

## Configurations, markers and paths

| Surface | Required result |
|---|---|
| Configurations | Create, name, description, visibility and delete retained |
| Marker placement | Add mode and context-menu fractional coordinate placement retained |
| Marker movement | Pointer capture, drag threshold and 0–100 percent clamp retained |
| Marker details | Label, notes, eight colors and five icons retained |
| Connections | Pairwise path toggle and cleanup on marker deletion retained |
| Auto-path | New marker links to the prior marker exactly as before |
| Editor | Zoom, delete, Done and connection list retained |
| Modals | New-config and delete-confirm workflows retained |

## Custom-marker import

| Boundary | Required result |
|---|---|
| Source | Ground-truth player inventory only |
| Parser | `customMarkers.js` unchanged |
| Maps | Current Plains/Orb Vallis/Cambion support retained |
| Deduplication | Existing label plus rounded-coordinate key retained |
| Current runtime validation | BLOCKED: ground-truth inventory has zero custom-marker groups |
| Test data | No invented game marker, coordinate, anchor or calibration |

## Layout and accessibility

| Item | Stable | Preview |
|---|---|---|
| DOM | Byte-identical Maps markup | Pass-through wrapper plus scoped structural hooks |
| Wide layout | Current behavior | Map with contained side configuration panel |
| Narrow layout | Current behavior | Full-width map plus bounded overlay configuration drawer |
| Toolbars | Current absolute groups | Separate contained utility and scrollable tab rows |
| Marker editor | Current fixed panel | Internally scrollable and viewport-contained |
| Markers | Current pointer behavior | Pointer behavior plus Enter/Space selection |
| Spatial editing | Current | Remains pointer-based |
| Overflow | Existing | No page-level overflow at 1200x800 or 900x500 |
| Artwork | Existing seven images/icons | Existing assets only; no AI artwork |

## Evidence gates

| Evidence | Required status |
|---|---|
| Source-derived navigation label | PASS before assertions |
| Stable exact-markup matrix | PASS across all named states |
| Stable interaction parity | PASS for all reachable editor controls |
| Transform/coordinate formulas | Source-identical |
| Config schema and payloads | Source-identical |
| Fresh-profile folder creation | PASS in stable and Preview isolated roots |
| Atomic interrupted write | Existing config remains complete; later write succeeds |
| Path traversal | Rejected |
| Stable/Preview config isolation | PASS |
| Seven bundled map assets | Load successfully in both packages |
| 1200x800 and 900x500 geometry | PASS |
| Keyboard marker selection | PASS in Preview |
| Custom-marker runtime import | BLOCKED until ground-truth input exists |
| Stable and Preview frontend builds | PASS |
| Fresh Ubuntu native build | PASS |
| Fresh Debian package smoke | 96/96 target |
| Fresh AppImage smoke | 96/96 target |
| Original tracked baseline | 850/850 unchanged |
| Cargo.lock | Unchanged |
| Cumulative patch | Native Git diff; applies cleanly |

## Explicit source boundary

Authorized only after approval: `src/screens/Maps.jsx`, new `src/components/PreviewMapsLayout.jsx`, and the two named `src-tauri/src/main.rs` corrections. Everything else remains outside Stage 3K.
