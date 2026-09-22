import os
import pathlib
import subprocess
root=pathlib.Path('/var/home/jedwards/kiedas-orbiter')
app=root/'.preview-work/stage2'
evidence=root/'docs/revamp/stage-3/evidence'
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4])
os.nice(19)
env=os.environ.copy()
env['PATH']='/opt/node/bin:'+env.get('PATH','')
for mode,out,name in [('production',str(root/'.preview-work/stage3-mods/stable-dist'),'mods-frontend-stable.log'),('preview','dist','mods-frontend-preview.log')]:
    with (evidence/name).open('w') as log:
        result=subprocess.run(['nice','-n','19','node','node_modules/vite/bin/vite.js','build','--mode',mode,'--outDir',out,'--emptyOutDir'],cwd=app,env=env,stdout=log,stderr=subprocess.STDOUT)
    print(mode,result.returncode,flush=True)
    if result.returncode:
        raise SystemExit(result.returncode)
