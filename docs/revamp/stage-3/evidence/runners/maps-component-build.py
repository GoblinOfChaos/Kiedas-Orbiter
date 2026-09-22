from pathlib import Path
import os
import subprocess

ROOT=Path('/var/home/jedwards/kiedas-orbiter')
FIXTURE=ROOT/'.preview-work/stage3-maps/fixture'
VITE=ROOT/'node_modules/.bin/vite'
LOG=ROOT/'docs/revamp/stage-3/evidence/maps-component-build.log'
for path in (ROOT/'AGENTS.md',FIXTURE/'entry.jsx',FIXTURE/'vite.config.mjs',VITE):
    if not path.exists(): raise FileNotFoundError(path)
if LOG.exists(): raise FileExistsError(LOG)
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
with LOG.open('w') as log:
    result=subprocess.run([str(VITE),'build','--config',str(FIXTURE/'vite.config.mjs')],cwd=FIXTURE,stdout=log,stderr=subprocess.STDOUT)
raise SystemExit(result.returncode)
