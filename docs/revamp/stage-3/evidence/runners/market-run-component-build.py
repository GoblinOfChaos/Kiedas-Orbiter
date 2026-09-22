from pathlib import Path
import subprocess

ROOT = Path('/var/home/jedwards/kiedas-orbiter')
RUNNER = ROOT / '.preview-work/stage3-market/component-build.py'
LOG = ROOT / 'docs/revamp/stage-3/evidence/market-component-build.log'
if not RUNNER.is_file():
    raise FileNotFoundError(RUNNER)
if LOG.exists():
    raise FileExistsError(LOG)
with LOG.open('w') as output:
    completed = subprocess.run(['/usr/bin/python3', str(RUNNER)], stdout=output, stderr=subprocess.STDOUT)
raise SystemExit(completed.returncode)
