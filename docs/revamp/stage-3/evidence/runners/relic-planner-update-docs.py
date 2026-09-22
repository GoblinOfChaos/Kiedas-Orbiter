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
    '**Status: PROPOSED — APP-SOURCE APPROVAL REQUIRED.** Stage 3A through Stage 3G are accepted Linux milestones. This document proposes one Relic Planner-only slice in the isolated Preview checkout. It does not authorize implementation, compilation, packaging, publication, installation over stable, inventory interpretation changes, relic/reward catalog changes, ownership formula changes, matching or sorting changes, persistence, translations, or another screen.',
    '**Status: IMPLEMENTED AND VALIDATED — USER ACCEPTANCE REQUIRED.** Stage 3A through Stage 3G are accepted Linux milestones. Stage 3H is implemented only in the isolated Preview checkout and has not been published or installed over stable. Inventory interpretation, relic/reward catalogs, ownership formulas, matching, sorting, persistence, translations and every other screen remain unchanged.',
)
validation = '''## Validation result

- Styled component/browser suite: **62/62**, including **8/8** byte-identical stable-markup comparisons and direct checks of the unchanged `getAllRelicRewards`, `getRelicCatalog` and `getPartObtainedStatus` helpers.
- Approved CSS correction: the Preview container breakpoint is **600px**, and the shared panel height is `clamp(17.5rem, calc(100dvh - 13.5rem), 40rem)`.
- Fresh Ubuntu release build and Debian/AppImage packaging: PASS under the hardened offline runner with four CPUs, four Cargo jobs and low priority.
- Debian packaged matrix: **60/60**. AppImage packaged matrix: **60/60**. Each contains the 55 accepted Stage 3G checks plus five Relic Planner checks.
- Native Relic Planner geometry: all three panels are simultaneously visible and aligned at both 1200x800 and 900x500; page-level horizontal overflow is absent and both dense control rails retain internal horizontal scrolling.
- Native interaction: selecting a helper-backed synthetic Prime part produces two matching relics, the remove control exposes the exact part name and works by keyboard, and no Sell surface is present.
- Source reversal: PASS. Removing only the approved Preview regions restores the frozen original `RelicPlanner.jsx` byte-for-byte.
- Cumulative native-Git patch: `git apply --check` PASS. Original tracked baseline: **850/850**, zero mismatches. Cargo lockfile unchanged.
- Stage 3G artifacts were preserved before preflight cleanup and match their accepted hashes. Stage 3H artifact hashes and sizes are recorded in `evidence/relic-planner-release-artifacts.json`; the consolidated result is `evidence/relic-planner-validation-summary.json`.

The evidence record retains the tooling and test-data corrections encountered during validation: missing host MiniBrowser, the sandbox host-bus retry, fixture path/assertion corrections, the initial missing Cargo mount, pre-correction narrow geometry, provider injection ordering and shape, and the picker selector initially choosing Forma. These were confined to test infrastructure except for the two-value CSS correction explicitly approved by the user. The final component and both packaged matrices pass in full.

'''
replace_once(PLAN, '## Acceptance boundary\n', validation + '## Acceptance boundary\n')

replace_once(
    PRESERVATION,
    'Status: **PROPOSED — NO RELIC PLANNER APP SOURCE CHANGED**.',
    'Status: **IMPLEMENTED AND VALIDATED — USER ACCEPTANCE REQUIRED**.',
)

replace_once(
    README,
    'Stage 3H Relic Planner is planned and awaits app-source approval; no Stage 3H app-source work has started.',
    'Stage 3H Relic Planner is implemented and validated in the isolated checkout and awaits user acceptance; no Stage 3I app-source work has started.',
)
replace_once(
    README,
    'Proposed Stage 3H slice, awaiting app-source approval:',
    'Implemented Stage 3H slice, awaiting user acceptance:',
)

replace_once(
    SCOPE,
    '| Stage 3H | Relic Planner | Planned; awaiting approval |',
    '| Stage 3H | Relic Planner | Implemented; awaiting acceptance |',
)
replace_once(
    SCOPE,
    'At the pace of Stage 3A–3G, the four remaining recommended screens imply **four normal approval-and-validation rounds**. Market, Settings and Maps have wider interaction surfaces than the accepted slices, so a realistic allowance is **four to seven rounds** if a source defect or materially larger source boundary requires a separate approval.',
    'At the pace of Stage 3A–3H, the current Relic Planner gate plus three later recommended screens imply **four normal approval-and-validation rounds** from the prior scope decision. Market, Settings and Maps have wider interaction surfaces than the accepted slices, so a realistic allowance remains **four to seven rounds** if a source defect or materially larger source boundary requires a separate approval.',
)
replace_once(
    SCOPE,
    'After Relics acceptance, the remaining order starts with Relic Planner and leaves the three highest-risk workspaces for the end.',
    'After Relic Planner acceptance, the three highest-risk workspaces remain: Market, Settings and Maps.',
)

replace_once(
    LEDGER,
    'Stage 3H Relic Planner is **PLANNED — APP-SOURCE APPROVAL REQUIRED**. Stage 3H app-source work has not started.',
    'Stage 3H Relic Planner is **IMPLEMENTED AND VALIDATED — AWAITING USER ACCEPTANCE** in the isolated Preview checkout. Stage 3I app-source work has not started.',
)

print('updated Stage 3H review documents')
