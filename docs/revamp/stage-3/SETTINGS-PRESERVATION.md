# Settings preservation checklist

Status: **ACCEPTED — LINUX MILESTONE**.

## Major sections

| Existing section | Required result |
|---|---|
| Theme | Themes, selected badge, accessibility/design note retained |
| Cursor | System/default/retro and theme tint retained |
| Notifications & Overlays | Preferences/status retained; unavailable Preview live actions disabled |
| Game Locale | Setting, forced export refresh, failure handling and reload retained |
| Feature Guide & Support | Guide, bug report, coverage export and inline result retained |
| In-Game Sidebar | Side, four widths and focus-loss preference retained |
| Global Hotkeys | Both actions and recorder behavior retained; Preview mutations disabled |
| Safe Mode Tracking | Toggle/path/debounce retained in stable; unavailable in Preview |
| Warframe.Market | Isolated-profile password input retained; no token logging/copying |
| Updates & Price Cache | Accepted Preview updater state and read-only price refresh retained |

## Persisted keys

| Group | Keys | Required result |
|---|---|---|
| Notifications | `notif_position`, `notif_sound` | Same defaults and values |
| Overlay/scanner | `fissure_overlay_enabled`, `fissure_ui_scale`, `fissure_target_monitor`, `use_ee_log`, `ee_log_path` | Same types, range and stable effects |
| Data/locale | `gameLocale`, `warframe_cache_path` | Same refresh/picker behavior |
| Sidebar/hotkeys | `sidebar_side`, `sidebar_width`, `sidebar_hide_on_focus_loss`, `hotkeys` | Same payloads and defaults |
| Integrations | `wfm_token`, `update_on_startup` | Same isolated storage; accepted Preview updater state |

## Preview live boundary

| Surface | Preview result |
|---|---|
| Periodic inventory monitoring | Visibly disabled; no active `set_monitoring_active` invoke |
| Log scanner and safe-mode scanner controls | Visibly disabled; no start/stop invoke and no setting mutation |
| Hotkey editor | Read-only display; no setting mutation or `set_hotkeys` invoke |
| Notification/overlay tests | Visibly disabled; no sound, notification or relay invoke |
| Notification sound choice | Preference remains editable; no live sound preview invoke |
| Coverage report | Export and inline status retained; no completion notification invoke |
| App updates | Existing disabled message/button and hidden startup toggle retained |
| Backend | Existing `require_live()` guards remain authoritative and unchanged |

## Preview-allowed controls

| Area | Required result |
|---|---|
| Appearance | Theme, cursor and tint work in isolated UI state |
| Notification/overlay preferences | Position, sound, scale and target monitor remain configurable |
| Data | Manual refresh, cache picker and locale refresh remain available |
| Support | Guide/bug modals and coverage export remain available |
| Sidebar | Isolated side/width/focus preferences remain editable |
| Market | Isolated WFM token remains editable for permitted read-only market access |
| Prices | Cache status/progress and refresh remain available |

## Layout and accessibility

| Item | Stable | Preview |
|---|---|---|
| DOM | Byte-identical before/after | Pass-through wrapper plus section rail/hooks/notices |
| Card order/content | Existing | Existing ten-card order retained |
| Navigation | Existing page scroll | Keyboard-reachable source-derived section rail |
| Responsive behavior | Existing viewport classes | Scoped container-responsive overrides |
| Disabled groups | Existing behavior | Inert, visibly disabled, reason communicated |
| Overflow | Existing | No page-level horizontal overflow at 1200x800 or 900x500 |
| Artwork | Existing icons/assets | Existing icons/assets; no AI artwork |

## Evidence gates

| Evidence | Required status |
|---|---|
| Source-derived navigation label | PASS before native assertion authoring |
| Stable exact-markup matrix | PASS across all named states |
| Stable settings/context/command parity | PASS for all reachable controls |
| Preview unavailable-live frontend invokes | Exactly zero |
| Direct Preview IPC guards | PASS for all five guarded Settings surfaces |
| Allowed Preview preferences/read-only tools | PASS |
| Section anchors and keyboard traversal | PASS |
| 1200x800 and 900x500 geometry | PASS |
| Stable and Preview frontend builds | PASS |
| Fresh Ubuntu native build | PASS |
| Fresh Debian package smoke | 82/82 target |
| Fresh AppImage smoke | 82/82 target |
| Original tracked baseline | 850/850 unchanged |
| Cargo.lock | Unchanged |
| Cumulative patch | Native Git diff; applies cleanly |
| Stage 3K source | Not started |


## Validation result

The final evidence records 62/62 component checks, 20/20 stable exact-markup comparisons, 19/19 stable interaction-parity cases, and 82/82 cumulative checks for each fresh Debian and AppImage artifact. Preview produced zero unavailable-live frontend invocations. In particular, `relay_event` and `stop_log_scanner` each recorded zero Preview invocations despite having no Rust `require_live()` guard. The five guarded Settings command surfaces were directly rejected by both packaged backends.
