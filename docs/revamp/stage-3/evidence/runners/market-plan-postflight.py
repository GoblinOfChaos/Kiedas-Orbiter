from pathlib import Path
import hashlib
import json
import subprocess


ROOT = Path('/var/home/jedwards/kiedas-orbiter')
CHECKOUT = ROOT / '.preview-work/stage2'
WORK = ROOT / '.preview-work/stage3-market'
STAGE = ROOT / 'docs/revamp/stage-3'
EVIDENCE = STAGE / 'evidence'
OUTPUT = EVIDENCE / 'market-plan-postflight.json'
required = [
    ROOT / 'AGENTS.md',
    WORK / 'before/Market.jsx',
    WORK / 'before/cumulative-implementation.patch',
    STAGE / 'MARKET-IMPLEMENTATION-PLAN.md',
    STAGE / 'MARKET-PRESERVATION.md',
    STAGE / 'market-source-register.json',
    EVIDENCE / 'market-nav-source-fact.json',
    EVIDENCE / 'market-plan-check.json',
]
for path in required:
    if not path.exists():
        raise FileNotFoundError(path)
if OUTPUT.exists():
    raise FileExistsError(OUTPUT)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


market = CHECKOUT / 'src/screens/Market.jsx'
layout = CHECKOUT / 'src/components/PreviewMarketLayout.jsx'
lockfile = CHECKOUT / 'src-tauri/Cargo.lock'
register = json.loads((STAGE / 'market-source-register.json').read_text())
plan_check = json.loads((EVIDENCE / 'market-plan-check.json').read_text())
manifest = json.loads((ROOT / 'docs/revamp/stage-1/baseline-files.json').read_text())
mismatches = [row['path'] for row in manifest if digest(ROOT / row['path']) != row['sha256']]
main_diff = subprocess.run(['git', 'diff', '--check'], cwd=ROOT, capture_output=True, text=True)
checkout_diff = subprocess.run(['git', 'diff', '--check'], cwd=CHECKOUT, capture_output=True, text=True)
checkout_status = subprocess.run(['git', 'status', '--short'], cwd=CHECKOUT, capture_output=True, text=True, check=True).stdout.splitlines()

checks = {
    'stage3h_accepted_in_ledger': 'Stage 3H Relic Planner | **ACCEPTED — Linux**' in (ROOT / 'docs/revamp/ACCEPTANCE-LEDGER.md').read_text(),
    'stage3i_marked_higher_risk': 'HIGHER RISK' in (STAGE / 'MARKET-IMPLEMENTATION-PLAN.md').read_text(),
    'explicit_approval_required': 'EXPLICIT APP-SOURCE APPROVAL REQUIRED' in (STAGE / 'MARKET-IMPLEMENTATION-PLAN.md').read_text(),
    'market_source_unchanged': digest(market) == digest(WORK / 'before/Market.jsx') == register['sources']['src/screens/Market.jsx']['sha256'],
    'preview_market_layout_absent': not layout.exists(),
    'stage3h_cumulative_patch_unchanged_and_frozen': digest(STAGE / 'cumulative-implementation.patch') == digest(WORK / 'before/cumulative-implementation.patch') == register['accepted_stage3h_cumulative_patch_sha256'],
    'cargo_lock_unchanged': digest(lockfile) == register['cargo_lock_sha256'],
    'tracked_baseline_850_of_850': len(manifest) == 850 and not mismatches,
    'source_fact_passed': plan_check['navigation_label_source_verified'] is True,
    'rust_mutation_guards_source_verified': plan_check['mutation_guards_source_verified'] is True,
    'stage3i_source_absent_from_status': not any('src/screens/Market.jsx' in row or 'PreviewMarketLayout.jsx' in row for row in checkout_status),
    'stage3j_source_not_started': register['stage3j_app_source_started'] is False,
    'main_diff_check_passes': main_diff.returncode == 0,
    'checkout_diff_check_passes': checkout_diff.returncode == 0,
}
if not all(checks.values()):
    raise RuntimeError(checks)

result = {
    'status': 'plan_ready_explicit_app_source_approval_required',
    'risk': 'higher',
    'checks': checks,
    'tracked_files_checked': len(manifest),
    'mismatches': mismatches,
    'market_source_sha256': digest(market),
    'accepted_stage3h_cumulative_patch_sha256': digest(WORK / 'before/cumulative-implementation.patch'),
    'cargo_lock_sha256': digest(lockfile),
    'planned_app_files': register['planned_app_files'],
    'market_app_source_changed': False,
    'stage3j_app_source_started': False,
}
OUTPUT.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
