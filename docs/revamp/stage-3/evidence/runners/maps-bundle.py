import os
from pathlib import Path
import shutil
import subprocess


ROOT = Path('/var/home/jedwards/kiedas-orbiter')
APP = ROOT / '.preview-work/stage2'
TARGET = ROOT / '.preview-work/ubuntu-build/target'
EVIDENCE = ROOT / 'docs/revamp/stage-3/evidence'
for path in (ROOT / 'AGENTS.md', APP / 'dist/index.html', APP / 'src-tauri/tauri.preview.conf.json', TARGET / 'release/kiedas-orbiter', EVIDENCE):
    if not path.exists():
        raise FileNotFoundError(f'precondition path missing: {path}')
os.sched_setaffinity(0, sorted(os.sched_getaffinity(0))[:4])
os.nice(19)
env = os.environ.copy()
env.update(
    CARGO_BUILD_JOBS='4',
    LDAI_RUNTIME_FILE=str(ROOT / '.preview-work/ubuntu-build/cache/runtime-x86_64'),
    APPIMAGE_EXTRACT_AND_RUN='1', XDG_CACHE_HOME=str(ROOT / '.preview-work/ubuntu-build/cache'),
    CARGO_TARGET_DIR=str(TARGET), CARGO_HOME=str(ROOT / '.preview-work/ubuntu-build/cargo-home'),
    PATH='/opt/rust/bin:/opt/node/bin:' + env.get('PATH', ''),
)
shutil.copy2(TARGET / 'release/kiedas-orbiter', TARGET / 'release/kiedas-orbiter-preview')
with (EVIDENCE / 'maps-native-bundle-inner.log').open('w') as log:
    result = subprocess.run(
        ['nice', '-n', '19', 'node', 'node_modules/@tauri-apps/cli/tauri.js', 'bundle', '--verbose', '--bundles', 'deb,appimage', '--config', str(APP / 'src-tauri/tauri.preview.conf.json'), '--features', 'preview,tauri/custom-protocol', '--no-sign', '--ci'],
        cwd=APP, env=env, stdout=log, stderr=subprocess.STDOUT, check=False,
    )
print('bundle', result.returncode)
raise SystemExit(result.returncode)
