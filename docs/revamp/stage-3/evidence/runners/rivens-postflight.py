from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path('/var/home/jedwards/kiedas-orbiter')
STAGE = ROOT / 'docs/revamp/stage-3'
EVIDENCE = STAGE / 'evidence'
CHECKOUT = ROOT / '.preview-work/stage2'
OUTPUT = EVIDENCE / 'rivens-postflight.json'
required = [
    ROOT / 'AGENTS.md',
    STAGE / 'rivens-implementation.patch',
    STAGE / 'cumulative-implementation.patch',
    STAGE / 'rivens-implementation.json',
    EVIDENCE / 'rivens-validation-summary.json',
    EVIDENCE / 'rivens-release-artifacts.json',
    EVIDENCE / 'rivens-baseline-check.json',
    EVIDENCE / 'rivens-evidence-integrity.json',
]
for path in required:
    if not path.exists():
        raise FileNotFoundError(f'precondition path missing: {path}')
if OUTPUT.exists():
    raise FileExistsError(f'evidence already exists: {OUTPUT}')

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

summary = json.loads((EVIDENCE / 'rivens-validation-summary.json').read_text())
metadata = json.loads((STAGE / 'rivens-implementation.json').read_text())
artifacts = json.loads((EVIDENCE / 'rivens-release-artifacts.json').read_text())
component_ok = summary['component_checks'] == summary['component_passed'] == 65
package_ok = all(row['checks'] == row['passed'] == 50 for row in summary['packages'])
hash_ok = all(Path(row['path']).exists() and digest(Path(row['path'])) == row['sha256'] and Path(row['path']).stat().st_size == row['bytes'] for row in artifacts)
apply_check = subprocess.run(['git','apply','--check',str(STAGE / 'cumulative-implementation.patch')], cwd=ROOT, capture_output=True, text=True)
main_status = subprocess.run(['git','status','--short'], cwd=ROOT, capture_output=True, text=True, check=True).stdout.splitlines()
checkout_status = subprocess.run(['git','status','--short'], cwd=CHECKOUT, capture_output=True, text=True, check=True).stdout.splitlines()
toolkit = (ROOT / '.preview-work/ubuntu-build/toolkit/README.md').read_text()
checks = {
    'component_65_of_65': component_ok,
    'stable_markup_7_of_7': summary['stable_exact_markup_comparison_count'] == 7 and all(row['equal'] for row in summary['stable_exact_markup_states']),
    'debian_and_appimage_50_of_50': package_ok,
    'four_artifacts_match_current_files': len(artifacts) == 4 and hash_ok,
    'cumulative_patch_applies': apply_check.returncode == 0,
    'tracked_baseline_850_of_850': metadata['tracked_files_checked'] == 850 and metadata['mismatches'] == [],
    'cargo_lock_unchanged': metadata['app_lockfile_unchanged'] is True,
    'stage3g_source_absent': not (CHECKOUT / 'src/components/PreviewRelicsLayout.jsx').exists(),
    'git_native_patch_rule_recorded': 'native Git diff output' in toolkit,
    'evidence_integrity_disclosed': (EVIDENCE / 'rivens-evidence-integrity.json').exists(),
}
if not all(checks.values()):
    raise RuntimeError(f'postflight check failed: {checks}')
result = {
    'checks': checks,
    'artifact_sha256': {Path(row['path']).name: row['sha256'] for row in artifacts},
    'incremental_patch_sha256': metadata['rivens_incremental_patch_sha256'],
    'cumulative_patch_sha256': metadata['cumulative_patch_sha256'],
    'main_repo_status': main_status,
    'isolated_checkout_status': checkout_status,
    'stage3g_app_source_started': False,
}
OUTPUT.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
