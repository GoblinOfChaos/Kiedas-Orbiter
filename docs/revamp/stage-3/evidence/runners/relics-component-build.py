from pathlib import Path
import os, subprocess, sys
ROOT=Path('/var/home/jedwards/kiedas-orbiter'); CONFIG=ROOT/'.preview-work/stage3-relics/fixture/vite.config.mjs'; NODE=Path('/var/home/jedwards/.nvm/versions/node/v24.19.0/bin/node'); VITE=ROOT/'.preview-work/stage2/node_modules/vite/bin/vite.js'
if len(sys.argv)!=2: raise SystemExit('usage: component-build.py /absolute/log/path')
LOG=Path(sys.argv[1])
for path in (ROOT/'AGENTS.md',CONFIG,NODE,VITE,LOG.parent):
    if not path.exists(): raise FileNotFoundError(path)
if not LOG.is_absolute() or LOG.exists(): raise ValueError('log must be a new absolute path')
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
with LOG.open('w') as out: result=subprocess.run([str(NODE),str(VITE),'build','--config',str(CONFIG)],cwd=ROOT,stdout=out,stderr=subprocess.STDOUT)
raise SystemExit(result.returncode)
