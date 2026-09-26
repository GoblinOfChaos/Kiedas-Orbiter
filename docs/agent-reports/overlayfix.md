# Overlayfix finding ledger

| Finding | Status | Evidence / implementation |
|---|---|---|
| P0 cache mtime self-invalidation | Fixed | `should_refresh` uses force, cache age, and `freshly_downloaded`; output mtimes are no longer compared. Added unit tests. |
| P0 customs/relics stale internal cache checks | Fixed | Main owns freshness; customs and relics refresh source assets whenever called. Relic cache no longer gates on mirror mtime. |
| P1 image/resource freshness and repeated manifest/image work | Fixed | Fresh ExportImages/Resources trigger relevant steps; one shared manifest fetch and one image-merge owner are selected per run. |
| P1 request timeout/User-Agent/spacing | Fixed | check_exports client has 10s connect/30s total timeout and User-Agent; DE asset paths use User-Agent and one-second pauses. |
| P1 drop tables unconditional startup refresh | Fixed | `DE_DROP_TABLES_REFRESH_ENABLED` is documented and false by default; load behavior remains optional-safe. |
| P1 drop-table Unicode slicing | Fixed | ASCII-case-insensitive byte search preserves original UTF-8 offsets; unit test covers a preceding non-ASCII character. |
| P2 Warframe sprintSpeed rounding | Fixed | `adapted_record` rounds sprintSpeed using the existing six-decimal helper. |
| P2 relic field list | Verified, unchanged | Local cache inspection plus `relics-arcanes.mjs` confirms every listed field is active in the completeness matrix. |
| P3 export write mode/format | Fixed | DE `Export*.json` and `de/*.json` use compact `write_export_json_atomic`; settings writer unchanged. |
| P3 release-visible logging/counts | Fixed | DE summaries/warnings use `logger::log_message`; counts increment only for changed/added results. |
| P3 Sentinels/Gear coupled failure | Fixed | Requests, validation, cache writes, and merges are independently handled; either valid side is retained. |

Validation was static only: no cargo, Rust compilation, bundling, or test execution was run per authorization constraints.
