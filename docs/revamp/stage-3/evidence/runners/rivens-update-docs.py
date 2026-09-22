from pathlib import Path

ROOT = Path('/var/home/jedwards/kiedas-orbiter')
STAGE = ROOT / 'docs/revamp/stage-3'
PLAN = STAGE / 'RIVENS-IMPLEMENTATION-PLAN.md'
README = STAGE / 'README.md'
SCOPE = STAGE / 'SCREEN-REDESIGN-SCOPE.md'
LEDGER = ROOT / 'docs/revamp/ACCEPTANCE-LEDGER.md'
for required in (ROOT / 'AGENTS.md', PLAN, README, SCOPE, LEDGER):
    if not required.exists():
        raise FileNotFoundError(f'precondition path missing: {required}')

plan = PLAN.read_text()
old = "**Status: PROPOSED — APP-SOURCE APPROVAL REQUIRED.** Stage 3A through Stage 3E are accepted Linux milestones. This document proposes one Rivens-only slice in the isolated Preview checkout. It does not authorize implementation, compilation, packaging, publication, installation over stable, pricing-model changes, inventory parsing changes, marketplace behavior, translations, or another screen."
new = "**Status: IMPLEMENTED AND VALIDATED — USER ACCEPTANCE REQUIRED.** Stage 3A through Stage 3E are accepted Linux milestones. Stage 3F is implemented only in the isolated Preview checkout and has not been published or installed over stable. Pricing-model logic, inventory parsing, marketplace behavior, translations and every other screen remain unchanged."
if plan.count(old) != 1:
    raise RuntimeError('Rivens plan status text not found exactly once')
plan = plan.replace(old, new, 1)
heading = "## Acceptance boundary\n"
evidence = """## Validation result

- Styled component/browser suite: **65/65**, including **7/7** byte-identical stable-markup comparisons.
- Fresh Ubuntu release build and Debian/AppImage packaging: PASS under the hardened offline runner with four CPUs, four Cargo jobs and low priority.
- Debian packaged matrix: **50/50**. AppImage packaged matrix: **50/50**. Each includes the 45 accepted Stage 3E checks and five Rivens checks.
- Source reversal: PASS. Removing only the approved Preview regions restores the frozen original Rivens.jsx byte-for-byte.
- Cumulative patch: git apply --check PASS. Original tracked baseline: **850/850**, zero mismatches. Cargo lockfile unchanged.
- Stage 3F artifact hashes and sizes are recorded in evidence/rivens-release-artifacts.json; the consolidated result is evidence/rivens-validation-summary.json.

Test-tooling corrections are retained rather than hidden. The first component run passed 59/65 and exposed a fixture-width model plus case-sensitive assertion issue; the corrected run passes 65/65. The first native build runner omitted the accepted toolchain mounts and exited 127 before compilation; the corrected bounded build passes. The first Debian generator used a Stage 3D base and a Stage 3E filename, so its 45 passing checks were incomplete and misnamed; the corrected Debian and AppImage runs each pass the full 50-check cumulative matrix. During that misnamed run, five accepted Stage 3E Debian inner logs were overwritten. The accepted primary Stage 3E JSON was restored semantically from its verbatim retained log, the misnamed Stage 3F JSON is preserved, and the unrecoverable original inner-log bytes are disclosed in evidence/rivens-evidence-integrity.json. Three failed patch-finalization attempts are preserved; Git-native diff generation now handles the source file's missing final newline and the cumulative apply check passes.

"""
if plan.count(heading) != 1:
    raise RuntimeError('Rivens acceptance heading not found exactly once')
PLAN.write_text(plan.replace(heading, evidence + heading, 1))

readme = README.read_text()
old = "Stage 3E Cosmetics is accepted as a Linux milestone; no Stage 3F app-source work has started."
new = "Stage 3E Cosmetics is accepted as a Linux milestone. Stage 3F Rivens is implemented and validated in the isolated checkout and awaits user acceptance; no Stage 3G app-source work has started."
if readme.count(old) != 1:
    raise RuntimeError('README Stage 3F status text not found exactly once')
readme = readme.replace(old, new, 1)
old = "Proposed Stage 3F slice, awaiting app-source approval: [RIVENS-IMPLEMENTATION-PLAN.md](RIVENS-IMPLEMENTATION-PLAN.md)."
new = "Implemented Stage 3F slice, awaiting user acceptance: [RIVENS-IMPLEMENTATION-PLAN.md](RIVENS-IMPLEMENTATION-PLAN.md)."
if readme.count(old) != 1:
    raise RuntimeError('README Rivens link text not found exactly once')
README.write_text(readme.replace(old, new, 1))

scope = SCOPE.read_text()
old = "| Stage 3F | Rivens | Redesign |"
new = "| Stage 3F | Rivens | Implemented; awaiting acceptance |"
if scope.count(old) != 1:
    raise RuntimeError('scope Rivens row not found exactly once')
scope = scope.replace(old, new, 1)
scope = scope.replace("the six remaining recommended screens imply **six normal approval-and-validation rounds**", "the current Rivens gate plus five later recommended screens imply **six normal approval-and-validation rounds**", 1)
scope = scope.replace("a realistic allowance is **six to nine rounds**", "a realistic allowance remains **six to nine rounds** from the scope decision, with five later screen rounds after Rivens acceptance", 1)
SCOPE.write_text(scope)

ledger = LEDGER.read_text()
section = """## Current Stage 3 gate

Stage 3F Rivens is **IMPLEMENTED AND VALIDATED — AWAITING USER ACCEPTANCE** in the isolated Preview checkout. Its acceptance evidence is recorded in stage-3/RIVENS-IMPLEMENTATION-PLAN.md. Stage 3G app-source work has not started.

"""
anchor = "## Dormant safety items\n"
if section not in ledger:
    if ledger.count(anchor) != 1:
        raise RuntimeError('ledger insertion anchor not found exactly once')
    ledger = ledger.replace(anchor, section + anchor, 1)
LEDGER.write_text(ledger)
print('updated Stage 3F review documents')
