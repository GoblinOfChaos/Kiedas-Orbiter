from pathlib import Path


ROOT = Path('/var/home/jedwards/kiedas-orbiter')
STAGE = ROOT / 'docs/revamp/stage-3'
PLAN = STAGE / 'RELIC-PLANNER-IMPLEMENTATION-PLAN.md'
PRESERVATION = STAGE / 'RELIC-PLANNER-PRESERVATION.md'
README = STAGE / 'README.md'
SCOPE = STAGE / 'SCREEN-REDESIGN-SCOPE.md'
LEDGER = ROOT / 'docs/revamp/ACCEPTANCE-LEDGER.md'
for path in (ROOT / 'AGENTS.md', PLAN, PRESERVATION, README, SCOPE, LEDGER):
    if not path.exists():
        raise FileNotFoundError(path)


def replace_once(path, old, new):
    text = path.read_text()
    if text.count(old) != 1:
        raise RuntimeError(f'anchor mismatch in {path}: {old!r}')
    path.write_text(text.replace(old, new, 1))


replace_once(
    PLAN,
    '**Status: IMPLEMENTED AND VALIDATED — USER ACCEPTANCE REQUIRED.** Stage 3A through Stage 3G are accepted Linux milestones. Stage 3H is implemented only in the isolated Preview checkout and has not been published or installed over stable. Inventory interpretation, relic/reward catalogs, ownership formulas, matching, sorting, persistence, translations and every other screen remain unchanged.',
    '**Status: STAGE 3H ACCEPTED — LINUX.** The validated Relic Planner implementation is accepted as a Linux Preview milestone. It remains isolated from stable and has not been published or installed over stable.',
)
replace_once(
    PRESERVATION,
    'Status: **IMPLEMENTED AND VALIDATED — USER ACCEPTANCE REQUIRED**.',
    'Status: **STAGE 3H ACCEPTED — LINUX**.',
)
replace_once(
    README,
    'Status: Stage 3A through Stage 3G are accepted as Linux milestones.',
    'Status: Stage 3A through Stage 3H are accepted as Linux milestones.',
)
replace_once(
    README,
    'Stage 3C Mastery, Stage 3D Mods, Stage 3E Cosmetics, Stage 3F Rivens and Stage 3G Relics are accepted as Linux milestones. Stage 3H Relic Planner is implemented and validated in the isolated checkout and awaits user acceptance; no Stage 3I app-source work has started.',
    'Stage 3C Mastery, Stage 3D Mods, Stage 3E Cosmetics, Stage 3F Rivens, Stage 3G Relics and Stage 3H Relic Planner are accepted as Linux milestones. Stage 3I Market is plan-only and awaits explicit app-source approval; no Stage 3I app-source work has started.',
)
replace_once(
    README,
    'Implemented Stage 3H slice, awaiting user acceptance:',
    'Accepted Stage 3H slice:',
)
replace_once(
    SCOPE,
    '| Stage 3H | Relic Planner | Implemented; awaiting acceptance |',
    '| Stage 3H | Relic Planner | Accepted |',
)
replace_once(
    SCOPE,
    'At the pace of Stage 3A–3H, the current Relic Planner gate plus three later recommended screens imply **four normal approval-and-validation rounds** from the prior scope decision. Market, Settings and Maps have wider interaction surfaces than the accepted slices, so a realistic allowance remains **four to seven rounds** if a source defect or materially larger source boundary requires a separate approval.',
    'At the pace of Stage 3A–3H, the three remaining recommended screens imply **three normal approval-and-validation rounds**. Market, Settings and Maps have wider interaction surfaces than the accepted slices, so a realistic allowance is **three to six rounds** if a source defect or materially larger source boundary requires a separate approval.',
)

ledger = LEDGER.read_text()
accepted_anchor = '| Stage 3G Relics | **ACCEPTED — Linux** | Preview Relics responsive control hierarchy, contained filter rails and keyboard-accessible cards; catalog merge, filters, expected-value formulas, prices and acquisition behavior retained; stable markup preserved; evidence recorded in stage-3/RELICS-IMPLEMENTATION-PLAN.md |'
accepted_row = '| Stage 3H Relic Planner | **ACCEPTED — Linux** | Preview Relic Planner coordinated three-panel workspace, bounded heights, contained filters and keyboard-accessible removal; catalog, status, ownership and matching behavior retained; stable markup preserved; evidence recorded in stage-3/RELIC-PLANNER-IMPLEMENTATION-PLAN.md |'
if ledger.count(accepted_anchor) != 1 or accepted_row in ledger:
    raise RuntimeError('accepted-slice ledger anchor mismatch')
ledger = ledger.replace(accepted_anchor, accepted_anchor + '\n' + accepted_row, 1)
old_gate = 'Stage 3H Relic Planner is **IMPLEMENTED AND VALIDATED — AWAITING USER ACCEPTANCE** in the isolated Preview checkout. Stage 3I app-source work has not started.'
new_gate = 'Stage 3I Market is **PLANNED — HIGHER RISK — EXPLICIT APP-SOURCE APPROVAL REQUIRED**. Stage 3I app-source work has not started.'
if ledger.count(old_gate) != 1:
    raise RuntimeError('current-gate ledger anchor mismatch')
ledger = ledger.replace(old_gate, new_gate, 1)
old_dates = 'Stage 3F and Stage 3G were explicitly accepted by the user on 2026-09-06.'
new_dates = 'Stage 3F, Stage 3G and Stage 3H were explicitly accepted by the user on 2026-09-06.'
if ledger.count(old_dates) != 1:
    raise RuntimeError('acceptance-date ledger anchor mismatch')
LEDGER.write_text(ledger.replace(old_dates, new_dates, 1))

print('recorded Stage 3H acceptance and opened the Stage 3I plan gate')
