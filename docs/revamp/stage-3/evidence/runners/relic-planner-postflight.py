from pathlib import Path
import hashlib
import json
import subprocess


ROOT = Path('/var/home/jedwards/kiedas-orbiter')
CHECKOUT = ROOT / '.preview-work/stage2'
STAGE = ROOT / 'docs/revamp/stage-3'
EVIDENCE = STAGE / 'evidence'
OUTPUT = EVIDENCE / 'relic-planner-postflight.json'
required = [
    ROOT / 'AGENTS.md',
    STAGE / 'relic-planner-implementation.patch',
    STAGE / 'cumulative-implementation.patch',
    STAGE / 'relic-planner-implementation.json',
    EVIDENCE / 'relic-planner-validation-summary.json',
    EVIDENCE / 'relic-planner-release-artifacts.json',
    EVIDENCE / 'relic-planner-baseline-check.json',
    EVIDENCE / 'relic-planner-source-preservation.json',
    EVIDENCE / 'relic-planner-evidence-integrity.json',
]
for path in required:
    if not path.exists():
        raise FileNotFoundError(path)
if OUTPUT.exists():
    raise FileExistsError(OUTPUT)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


summary = json.loads((EVIDENCE / 'relic-planner-validation-summary.json').read_text())
metadata = json.loads((STAGE / 'relic-planner-implementation.json').read_text())
artifacts = json.loads((EVIDENCE / 'relic-planner-release-artifacts.json').read_text())
register = json.loads((STAGE / 'relic-planner-source-register.json').read_text())
apply_check = subprocess.run(
    ['git', 'apply', '--check', str(STAGE / 'cumulative-implementation.patch')],
    cwd=ROOT, capture_output=True, text=True,
)
main_diff_check = subprocess.run(
    ['git', 'diff', '--check'], cwd=ROOT, capture_output=True, text=True,
)
checkout_diff_check = subprocess.run(
    ['git', 'diff', '--check'], cwd=CHECKOUT, capture_output=True, text=True,
)
main_status = subprocess.run(
    ['git', 'status', '--short'], cwd=ROOT, capture_output=True, text=True, check=True,
).stdout.splitlines()
checkout_status = subprocess.run(
    ['git', 'status', '--short'], cwd=CHECKOUT, capture_output=True, text=True, check=True,
).stdout.splitlines()

checks = {
    'component_62_of_62': summary['component_checks'] == summary['component_passed'] == 62,
    'stable_markup_8_of_8': summary['stable_exact_markup_comparison_count'] == 8 and all(row['equal'] for row in summary['stable_exact_markup_states']),
    'debian_and_appimage_60_of_60': all(row['checks'] == row['passed'] == 60 for row in summary['packages']),
    'five_relic_planner_checks_each': all(len(row['relic_planner_checks']) == 5 and all(item['pass'] for item in row['relic_planner_checks']) for row in summary['packages']),
    'four_artifacts_match_current_files': len(artifacts) == 4 and all(Path(row['path']).exists() and digest(Path(row['path'])) == row['sha256'] and Path(row['path']).stat().st_size == row['bytes'] for row in artifacts),
    'cumulative_patch_applies': apply_check.returncode == 0,
    'tracked_baseline_850_of_850': metadata['tracked_files_checked'] == 850 and metadata['mismatches'] == [],
    'cargo_lock_unchanged': metadata['app_lockfile_unchanged'] is True,
    'stage3g_artifacts_preserved': metadata['stage3g_artifacts_preserved_and_matched'] is True,
    'approved_css_values_present': '@container preview-relic-planner (min-width: 600px)' in (CHECKOUT / 'src/components/PreviewRelicPlannerLayout.jsx').read_text() and 'clamp(17.5rem, calc(100dvh - 13.5rem), 40rem)' in (CHECKOUT / 'src/components/PreviewRelicPlannerLayout.jsx').read_text(),
    'stage3i_source_untouched': not (CHECKOUT / 'src/components/PreviewMarketLayout.jsx').exists() and not any('src/screens/Market.jsx' in row for row in checkout_status),
    'main_diff_check_passes': main_diff_check.returncode == 0,
    'checkout_diff_check_passes': checkout_diff_check.returncode == 0,
    'register_is_awaiting_acceptance': register['status'] == 'implemented_awaiting_acceptance' and register['stage3i_app_source_started'] is False,
}
if not all(checks.values()):
    raise RuntimeError(checks)

result = {
    'checks': checks,
    'artifact_sha256': {Path(row['path']).name: row['sha256'] for row in artifacts},
    'incremental_patch_sha256': metadata['relic_planner_incremental_patch_sha256'],
    'cumulative_patch_sha256': metadata['cumulative_patch_sha256'],
    'main_repo_status': main_status,
    'isolated_checkout_status': checkout_status,
    'stage3i_app_source_started': False,
}
OUTPUT.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
