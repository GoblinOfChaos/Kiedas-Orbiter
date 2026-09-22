from pathlib import Path
import datetime
import hashlib
import json
import shutil
import subprocess


ROOT = Path('/var/home/jedwards/kiedas-orbiter')
WORK = ROOT / '.preview-work/stage3-relic-planner'
CHECKOUT = ROOT / '.preview-work/stage2'
STAGE = ROOT / 'docs/revamp/stage-3'
EVIDENCE = STAGE / 'evidence'
TARGET = ROOT / '.preview-work/ubuntu-build/target/release'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def all_pass(rows):
    return bool(rows) and all(row.get('pass') is True for row in rows)


required = [
    ROOT / 'AGENTS.md',
    WORK / 'before/RelicPlanner.jsx',
    WORK / 'before/cumulative-implementation.patch',
    CHECKOUT / 'src/screens/RelicPlanner.jsx',
    CHECKOUT / 'src/components/PreviewRelicPlannerLayout.jsx',
    EVIDENCE / 'relic-planner-component.json',
    EVIDENCE / 'relic-planner-deb-packaged-smoke.json',
    EVIDENCE / 'relic-planner-appimage-packaged-smoke.json',
    EVIDENCE / 'relic-planner-source-preservation.json',
    TARGET / 'kiedas-orbiter',
    TARGET / 'kiedas-orbiter-preview',
]
for path in required:
    if not path.exists():
        raise FileNotFoundError(path)

outputs = [
    STAGE / 'relic-planner-implementation.patch',
    STAGE / 'relic-planner-implementation.json',
    EVIDENCE / 'relic-planner-validation-summary.json',
    EVIDENCE / 'relic-planner-release-artifacts.json',
    EVIDENCE / 'relic-planner-baseline-check.json',
]
for path in outputs:
    if path.exists():
        raise FileExistsError(path)

component = json.loads((EVIDENCE / 'relic-planner-component.json').read_text())
assert len(component['checks']) == 62 and all_pass(component['checks'])
assert len(component['stable_comparisons']) == 8
assert all(row['equal'] for row in component['stable_comparisons'])

groups = [
    'checks', 'dialog_checks', 'guard_checks', 'market_guards',
    'updater_ui_checks', 'dashboard_checks', 'inventory_checks',
    'mastery_checks', 'mods_checks', 'cosmetics_checks', 'rivens_checks',
    'relics_checks', 'relic_planner_checks',
]
packages = []
for kind in ('deb', 'appimage'):
    data = json.loads((EVIDENCE / f'relic-planner-{kind}-packaged-smoke.json').read_text())
    assert data.get('error') is None
    rows = [row for group in groups for row in data[group]]
    assert len(rows) == 60 and all_pass(rows)
    assert data['bundle_fallback_check']['matches_installed_bytes']
    packages.append({
        'kind': kind,
        'checks': 60,
        'passed': 60,
        'groups': {group: len(data[group]) for group in groups},
        'binary_sha256': data['binary_sha256'],
        'relic_planner_checks': data['relic_planner_checks'],
    })

timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
summary = {
    'timestamp': timestamp,
    'component_checks': 62,
    'component_passed': 62,
    'stable_exact_markup_comparison_count': 8,
    'stable_exact_markup_states': component['stable_comparisons'],
    'packages': packages,
    'failures': [],
    'gate': 'Stage 3H implemented and validated; awaiting user acceptance',
}
(EVIDENCE / 'relic-planner-validation-summary.json').write_text(json.dumps(summary, indent=2) + '\n')

artifact_paths = [
    TARGET / 'kiedas-orbiter',
    TARGET / 'kiedas-orbiter-preview',
    TARGET / "bundle/deb/Kieda's Orbiter Preview_1.3.3_amd64.deb",
    TARGET / "bundle/appimage/Kieda's Orbiter Preview_1.3.3_amd64.AppImage",
]
artifacts = [
    {'path': str(path), 'bytes': path.stat().st_size, 'sha256': digest(path)}
    for path in artifact_paths
]
(EVIDENCE / 'relic-planner-release-artifacts.json').write_text(json.dumps(artifacts, indent=2) + '\n')

screen_diff = subprocess.run(
    ['git', 'diff', '--', 'src/screens/RelicPlanner.jsx'],
    cwd=CHECKOUT, capture_output=True, text=True, check=True,
).stdout
layout_diff = subprocess.run(
    ['git', 'diff', '--no-index', '--', '/dev/null', 'src/components/PreviewRelicPlannerLayout.jsx'],
    cwd=CHECKOUT, capture_output=True, text=True,
)
assert layout_diff.returncode == 1, layout_diff.stderr
incremental = screen_diff + layout_diff.stdout
(STAGE / 'relic-planner-implementation.patch').write_text(incremental)

prior = WORK / 'before/cumulative-implementation.patch'
prior_bytes = prior.read_bytes()
separator = b'' if prior_bytes.endswith(b'\n') else b'\n'
(STAGE / 'cumulative-implementation.patch').write_bytes(prior_bytes + separator + incremental.encode())
apply_check = subprocess.run(
    ['git', 'apply', '--check', str(STAGE / 'cumulative-implementation.patch')],
    cwd=ROOT, capture_output=True, text=True,
)
assert apply_check.returncode == 0, apply_check.stderr

manifest = json.loads((ROOT / 'docs/revamp/stage-1/baseline-files.json').read_text())
mismatches = [row['path'] for row in manifest if digest(ROOT / row['path']) != row['sha256']]
assert len(manifest) == 850 and not mismatches

register_path = STAGE / 'relic-planner-source-register.json'
register = json.loads(register_path.read_text())
lock_hash = digest(CHECKOUT / 'src-tauri/Cargo.lock')
assert lock_hash == register['cargo_lock_sha256']

accepted = json.loads((EVIDENCE / 'relics-release-artifacts.json').read_text())
preserved_manifest = json.loads((WORK / 'preserved-stage3g-native/manifest.json').read_text())
preserved_by_source = {row['source']: row for row in preserved_manifest['files']}
preserved_ok = True
for row in accepted:
    source_path = row.get('path', row.get('path_at_validation'))
    preserved = preserved_by_source.get(source_path)
    if not preserved:
        preserved_ok = False
        continue
    copy = Path(preserved['copy'])
    preserved_ok = preserved_ok and copy.exists()
    preserved_ok = preserved_ok and digest(copy) == row['sha256']
    preserved_ok = preserved_ok and copy.stat().st_size == row['bytes']
assert preserved_ok

source_proof = json.loads((EVIDENCE / 'relic-planner-source-preservation.json').read_text())
assert source_proof['stable_source_restores_exactly_after_removing_approved_preview_regions']
assert source_proof['catalog_inventory_status_search_selection_matching_sorting_and_persistence_logic_unchanged']

metadata = {
    'timestamp': timestamp,
    'stage3g_cumulative_patch_sha256': digest(prior),
    'relic_planner_incremental_patch_sha256': digest(STAGE / 'relic-planner-implementation.patch'),
    'cumulative_patch_sha256': digest(STAGE / 'cumulative-implementation.patch'),
    'cumulative_apply_check_exit': 0,
    'tracked_files_checked': len(manifest),
    'mismatches': mismatches,
    'app_lockfile_sha256': lock_hash,
    'app_lockfile_unchanged': True,
    'source_preservation': source_proof,
    'stage3g_artifacts_preserved_and_matched': preserved_ok,
    'artifact_count': 4,
    'component_checks': 62,
    'stable_exact_markup_comparisons': 8,
    'packaged_checks_per_artifact': 60,
    'gate': 'Stage 3H implemented and validated; awaiting user acceptance',
}
(STAGE / 'relic-planner-implementation.json').write_text(json.dumps(metadata, indent=2) + '\n')
(EVIDENCE / 'relic-planner-baseline-check.json').write_text(json.dumps(metadata, indent=2) + '\n')

register['status'] = 'implemented_awaiting_acceptance'
register['stage3h_app_source_started'] = True
register['stage3i_app_source_started'] = False
register['after_sources'] = {
    'src/screens/RelicPlanner.jsx': {'sha256': digest(CHECKOUT / 'src/screens/RelicPlanner.jsx')},
    'src/components/PreviewRelicPlannerLayout.jsx': {'sha256': digest(CHECKOUT / 'src/components/PreviewRelicPlannerLayout.jsx')},
}
register['approved_css_correction'] = {
    'container_breakpoint': '620px to 600px',
    'panel_height': 'clamp(18rem, calc(100dvh - 12.5rem), 40rem) to clamp(17.5rem, calc(100dvh - 13.5rem), 40rem)',
}
register['validation'] = {
    'component_checks': '62/62',
    'stable_exact_markup_comparisons': '8/8',
    'debian_native_checks': '60/60',
    'appimage_native_checks': '60/60',
    'tracked_baseline': '850/850',
    'lockfile_unchanged': True,
}
register_path.write_text(json.dumps(register, indent=2) + '\n')

for row in accepted:
    source_path = row.get('path', row.get('path_at_validation'))
    preserved = preserved_by_source[source_path]
    if 'path' in row:
        row['path_at_validation'] = row.pop('path')
    row['preserved_copy'] = preserved['copy']
    row['current_file_available_at_original_path'] = False
(EVIDENCE / 'relics-release-artifacts.json').write_text(json.dumps(accepted, indent=2) + '\n')

runner_dir = EVIDENCE / 'runners'
runner_dir.mkdir(parents=True, exist_ok=True)
runner_files = [
    'setup-fixture.py', 'component-build.py', 'component.py', 'source-preservation.py',
    'frontend.py', 'native-build.py', 'bundle.py', 'prepare-native-runners.py',
    'archive-css-correction.py', 'archive-native-fixture.py', 'archive-native-run.py',
    'deb-smoke.py', 'appimage-smoke.py', 'relic-planner-native-block.txt',
]
for name in runner_files:
    shutil.copy2(WORK / name, runner_dir / ('relic-planner-' + name))
for source, name in (
    (WORK / 'fixture/entry.jsx', 'relic-planner-fixture-entry.jsx'),
    (WORK / 'fixture/mock.js', 'relic-planner-fixture-mock.js'),
    (WORK / 'fixture/vite.config.mjs', 'relic-planner-fixture-vite.config.mjs'),
):
    shutil.copy2(source, runner_dir / name)

print(json.dumps({
    'component': '62/62',
    'stable_markup': '8/8',
    'packages': '60/60 each',
    'artifacts': artifacts,
    'baseline': '850/850',
    'lockfile_unchanged': True,
    'cumulative_apply_check': 0,
}, indent=2))
