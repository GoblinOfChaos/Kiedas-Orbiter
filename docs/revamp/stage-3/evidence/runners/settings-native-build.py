import os
from pathlib import Path
import subprocess


ROOT = Path('/var/home/jedwards/kiedas-orbiter')
APP = ROOT / '.preview-work/stage2'
EVIDENCE = ROOT / 'docs/revamp/stage-3/evidence'
for path in (ROOT / 'AGENTS.md', APP / 'dist/index.html', APP / 'src-tauri/Cargo.toml', APP / 'src-tauri/tauri.preview.conf.json', EVIDENCE):
    if not path.exists():
        raise FileNotFoundError(f'precondition path missing: {path}')
os.sched_setaffinity(0, sorted(os.sched_getaffinity(0))[:4])
os.nice(19)
env = os.environ.copy()
env.update(
    CARGO_BUILD_JOBS='4', CMAKE_BUILD_PARALLEL_LEVEL='4',
    CARGO_HOME=str(ROOT / '.preview-work/ubuntu-build/cargo-home'),
    CARGO_TARGET_DIR=str(ROOT / '.preview-work/ubuntu-build/target'),
    TAURI_CONFIG=(APP / 'src-tauri/tauri.preview.conf.json').read_text(),
    PATH='/opt/rust/bin:' + env.get('PATH', ''),
)
with (EVIDENCE / 'settings-native-build-inner.log').open('w') as log:
    result = subprocess.run(
        ['nice', '-n', '19', 'cargo', 'build', '--manifest-path', str(APP / 'src-tauri/Cargo.toml'), '--release', '--features', 'preview,tauri/custom-protocol', '--offline', '--locked'],
        cwd=APP, env=env, stdout=log, stderr=subprocess.STDOUT, check=False,
    )
print('native', result.returncode)
raise SystemExit(result.returncode)
