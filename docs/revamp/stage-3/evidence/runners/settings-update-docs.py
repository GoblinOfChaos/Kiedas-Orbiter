#!/usr/bin/python3
"""Record Stage 3J as implemented and validated, awaiting user acceptance."""

from pathlib import Path


ROOT = Path("/var/home/jedwards/kiedas-orbiter")


def replace(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    if text.count(old) != 1:
        raise RuntimeError(f"expected exactly one match in {path}: {old!r}")
    path.write_text(text.replace(old, new))


ledger = ROOT / "docs/revamp/ACCEPTANCE-LEDGER.md"
replace(
    ledger,
    "| Stage 3I Market | **ACCEPTED — Linux** | Preview Market responsive workspace and mutation-safe presentation; zero frontend mutation invocations and direct rejection of all four mutation IPC commands; stable displayed-price fallback corrected; evidence recorded in stage-3/MARKET-IMPLEMENTATION-PLAN.md |",
    "| Stage 3I Market | **ACCEPTED — Linux** | Preview Market responsive workspace and mutation-safe presentation; zero frontend mutation invocations and direct rejection of all four mutation IPC commands; stable displayed-price fallback corrected; evidence recorded in stage-3/MARKET-IMPLEMENTATION-PLAN.md |\n| Stage 3J Settings | **IMPLEMENTED AND VALIDATED — Linux — awaiting acceptance** | Preview Settings section navigation and responsive composition; live controls visibly disabled; zero Preview `relay_event` and `stop_log_scanner` invocations; five guarded commands directly rejected; stable markup and interactions preserved; evidence recorded in stage-3/SETTINGS-IMPLEMENTATION-PLAN.md |",
)
replace(
    ledger,
    "Stage 3I Market is **ACCEPTED — LINUX**. Stage 3J Settings is **PLAN PREPARED — AWAITING EXPLICIT IMPLEMENTATION APPROVAL**. No Stage 3J app-source work or build has started.",
    "Stage 3I Market is **ACCEPTED — LINUX**. Stage 3J Settings is **IMPLEMENTED AND VALIDATED — LINUX — AWAITING USER ACCEPTANCE**. Stage 3K Maps app-source work has not started.",
)

readme = ROOT / "docs/revamp/stage-3/README.md"
replace(
    readme,
    "Stage 3C Mastery, Stage 3D Mods, Stage 3E Cosmetics, Stage 3F Rivens, Stage 3G Relics, Stage 3H Relic Planner and Stage 3I Market are accepted as Linux milestones. Stage 3J Settings is planned and awaits explicit implementation approval. The proposed end state for the remaining screen work is fixed in SCREEN-REDESIGN-SCOPE.md.",
    "Stage 3C Mastery, Stage 3D Mods, Stage 3E Cosmetics, Stage 3F Rivens, Stage 3G Relics, Stage 3H Relic Planner and Stage 3I Market are accepted as Linux milestones. Stage 3J Settings is implemented and validated on Linux and awaits user acceptance. Stage 3K Maps app-source work has not started. The proposed end state for the remaining screen work is fixed in SCREEN-REDESIGN-SCOPE.md.",
)
replace(
    readme,
    "Proposed higher-risk Stage 3J slice, awaiting explicit implementation approval: [SETTINGS-IMPLEMENTATION-PLAN.md](SETTINGS-IMPLEMENTATION-PLAN.md). Settings preservation checklist: [SETTINGS-PRESERVATION.md](SETTINGS-PRESERVATION.md).",
    "Implemented higher-risk Stage 3J slice, awaiting user acceptance: [SETTINGS-IMPLEMENTATION-PLAN.md](SETTINGS-IMPLEMENTATION-PLAN.md). Settings preservation checklist: [SETTINGS-PRESERVATION.md](SETTINGS-PRESERVATION.md).",
)

scope = ROOT / "docs/revamp/stage-3/SCREEN-REDESIGN-SCOPE.md"
replace(
    scope,
    "| Stage 3J | Settings | Plan prepared; awaiting explicit implementation approval | This is the largest screen at 1,398 lines, with ten major cards, 19 Tauri command surfaces and 15 persisted keys. The proposed slice improves information architecture and section navigation while making Preview-disabled live controls visibly non-interactive. |",
    "| Stage 3J | Settings | Implemented and validated on Linux; awaiting acceptance | The validated slice adds section navigation and container-responsive composition, visibly disables Preview live controls, records zero `relay_event`/`stop_log_scanner` calls, and preserves stable markup and interactions. |",
)
replace(
    scope,
    "After Stage 3I acceptance, the two remaining recommended screens imply **two normal approval-and-validation rounds**. Settings and Maps have wide interaction surfaces, so a realistic allowance is **two to four rounds** if a source defect or materially larger source boundary requires a separate approval. Test-harness fixes remain batched within the active round under the existing blast-radius rule.",
    "After Stage 3J acceptance, only Stage 3K Maps remains in the recommended screen-redesign scope. It should require **one normal approval-and-validation round**, with allowance for a second round if its specialized canvas layout exposes an app-source defect. Test-harness fixes remain batched within the active round under the existing blast-radius rule.",
)
replace(
    scope,
    "After Market acceptance, the two remaining workspaces will be Settings and Maps. Every slice remains independently reviewable; acceptance of this scope is not blanket authorization for the three remaining implementations.",
    "After Settings acceptance, Maps will be the final recommended workspace. Stage 3K remains independently reviewable and requires its own plan and explicit app-source approval.",
)

plan = ROOT / "docs/revamp/stage-3/SETTINGS-IMPLEMENTATION-PLAN.md"
replace(
    plan,
    "**Status: PLAN READY — HIGHER RISK — EXPLICIT APP-SOURCE APPROVAL REQUIRED.** Stage 3A through Stage 3I are accepted Linux milestones. No Stage 3J app-source edit or build has started.",
    "**Status: IMPLEMENTED AND VALIDATED — LINUX — AWAITING USER ACCEPTANCE.** Stage 3A through Stage 3I are accepted Linux milestones. The approved two-file Stage 3J implementation and evidence are recorded in `settings-implementation.json` and `evidence/settings-validation-summary.json`. Stage 3K app-source work has not started.",
)
plan.write_text(
    plan.read_text()
    + "\n## Implementation result\n\n"
    + "The component matrix passed 62/62 checks, including 20/20 byte-identical stable markup comparisons and 19/19 stable interaction-parity cases. Both fresh Linux packages passed 82/82 cumulative checks. The Settings component capture and both packaged records explicitly contain empty Preview invocation lists for `relay_event` and `stop_log_scanner`; these are named separately because neither command has a Rust `require_live()` guard. All five guarded Settings command surfaces were directly invoked at the packaged native IPC boundary and rejected in both artifacts. The original 850 tracked files and Cargo.lock remain unchanged, the cumulative native Git patch applies cleanly, and Stage 3K remains unstarted.\n"
)

preservation = ROOT / "docs/revamp/stage-3/SETTINGS-PRESERVATION.md"
replace(
    preservation,
    "Status: **PLAN READY — HIGHER RISK — AWAITING EXPLICIT APP-SOURCE APPROVAL**.",
    "Status: **IMPLEMENTED AND VALIDATED — LINUX — AWAITING USER ACCEPTANCE**.",
)
preservation.write_text(
    preservation.read_text()
    + "\n## Validation result\n\n"
    + "The final evidence records 62/62 component checks, 20/20 stable exact-markup comparisons, 19/19 stable interaction-parity cases, and 82/82 cumulative checks for each fresh Debian and AppImage artifact. Preview produced zero unavailable-live frontend invocations. In particular, `relay_event` and `stop_log_scanner` each recorded zero Preview invocations despite having no Rust `require_live()` guard. The five guarded Settings command surfaces were directly rejected by both packaged backends.\n"
)

print("Stage 3J documents updated to implemented and validated, awaiting acceptance")
