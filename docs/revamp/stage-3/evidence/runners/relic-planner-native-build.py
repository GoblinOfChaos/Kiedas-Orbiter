import os
import pathlib
import subprocess


root = pathlib.Path('/var/home/jedwards/kiedas-orbiter/.preview-work/stage2')
evidence = root.parent.parent / 'docs/revamp/stage-3/evidence'
for required in (pathlib.Path('/var/home/jedwards/kiedas-orbiter/AGENTS.md'), root / 'dist/index.html', root / 'src-tauri/Cargo.toml', root / 'src-tauri/tauri.preview.conf.json', evidence):
    if not required.exists():
        raise FileNotFoundError(f'precondition path missing: {required}')
os.sched_setaffinity(0, sorted(os.sched_getaffinity(0))[:4])
os.nice(19)
env = os.environ.copy()
env.update(
    CARGO_BUILD_JOBS='4',
    CMAKE_BUILD_PARALLEL_LEVEL='4',
    CARGO_HOME=str(root.parent / 'ubuntu-build/cargo-home'),
    CARGO_TARGET_DIR=str(root.parent / 'ubuntu-build/target'),
    TAURI_CONFIG=(root / 'src-tauri/tauri.preview.conf.json').read_text(),
    PATH='/opt/rust/bin:' + env.get('PATH', ''),
)
with (evidence / 'relic-planner-native-build-inner.log').open('w') as log:
    result = subprocess.run(
        ['nice', '-n', '19', 'cargo', 'build', '--manifest-path', str(root / 'src-tauri/Cargo.toml'), '--release', '--features', 'preview,tauri/custom-protocol', '--offline', '--locked'],
        cwd=root,
        env=env,
        stdout=log,
        stderr=subprocess.STDOUT,
        check=False,
    )
print('native', result.returncode)
raise SystemExit(result.returncode)
