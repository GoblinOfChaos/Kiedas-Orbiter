from pathlib import Path
import os
import subprocess
import sys

ROOT = Path('/var/home/jedwards/kiedas-orbiter')
CONFIG = ROOT / '.preview-work/stage3-rivens/fixture/vite.config.mjs'
NODE = Path('/var/home/jedwards/.nvm/versions/node/v24.19.0/bin/node')
VITE = ROOT / '.preview-work/stage2/node_modules/vite/bin/vite.js'
if len(sys.argv) != 2:
    raise SystemExit('usage: component-build.py /absolute/log/path')
LOG = Path(sys.argv[1])
for required in (ROOT / 'AGENTS.md', CONFIG, NODE, VITE, LOG.parent):
    if not required.exists():
        raise FileNotFoundError(f'precondition path missing: {required}')
if not LOG.is_absolute():
    raise ValueError(f'log path must be absolute: {LOG}')
if LOG.exists():
    raise FileExistsError(f'log already exists: {LOG}')
os.sched_setaffinity(0, sorted(os.sched_getaffinity(0))[:4])
os.nice(19)
with LOG.open('w') as output:
    result = subprocess.run(
        [str(NODE), str(VITE), 'build', '--config', str(CONFIG)],
        cwd=ROOT,
        stdout=output,
        stderr=subprocess.STDOUT,
        check=False,
    )
raise SystemExit(result.returncode)
