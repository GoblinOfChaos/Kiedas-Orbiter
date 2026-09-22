from pathlib import Path
import os
import subprocess


ROOT = Path('/var/home/jedwards/kiedas-orbiter')
APP = ROOT / '.preview-work/stage2'
NODE = Path('/var/home/jedwards/.nvm/versions/node/v24.19.0/bin/node')
VITE = APP / 'node_modules/vite/bin/vite.js'
STABLE_DIST = ROOT / '.preview-work/stage3-settings/stable-dist'
EVIDENCE = ROOT / 'docs/revamp/stage-3/evidence'
for path in (ROOT / 'AGENTS.md', APP / 'package.json', NODE, VITE, EVIDENCE):
    if not path.exists():
        raise FileNotFoundError(f'precondition path missing: {path}')
os.sched_setaffinity(0, sorted(os.sched_getaffinity(0))[:4])
os.nice(19)
env = os.environ.copy()
env['PATH'] = str(NODE.parent) + ':' + env.get('PATH', '')
jobs = [
    ('production', STABLE_DIST, EVIDENCE / 'settings-frontend-stable.log'),
    ('preview', APP / 'dist', EVIDENCE / 'settings-frontend-preview.log'),
]
for mode, output_dir, log_path in jobs:
    if log_path.exists():
        raise FileExistsError(f'log already exists: {log_path}')
    with log_path.open('w') as log:
        result = subprocess.run(
            [str(NODE), str(VITE), 'build', '--mode', mode, '--outDir', str(output_dir), '--emptyOutDir'],
            cwd=APP,
            env=env,
            stdout=log,
            stderr=subprocess.STDOUT,
            check=False,
        )
    print(mode, result.returncode, flush=True)
    if result.returncode:
        raise SystemExit(result.returncode)
