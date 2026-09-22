from pathlib import Path
import os
import subprocess


ROOT = Path('/var/home/jedwards/kiedas-orbiter')
FIXTURE = ROOT / '.preview-work/stage3-market/fixture'
VITE = ROOT / 'node_modules/.bin/vite'
for path in (ROOT / 'AGENTS.md', FIXTURE / 'entry.jsx', FIXTURE / 'mock.js', FIXTURE / 'vite.config.mjs', VITE):
    if not path.exists():
        raise FileNotFoundError(f'precondition path missing: {path}')
os.sched_setaffinity(0, sorted(os.sched_getaffinity(0))[:4])
os.nice(19)
raise SystemExit(subprocess.run([str(VITE), 'build', '--config', str(FIXTURE / 'vite.config.mjs')], cwd=FIXTURE).returncode)
