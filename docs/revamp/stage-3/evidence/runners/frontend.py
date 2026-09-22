import os,pathlib,subprocess
root=pathlib.Path('/var/home/jedwards/kiedas-orbiter');app=root/'.preview-work/stage2';e=root/'docs/revamp/stage-3/evidence'
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
env=os.environ.copy();env['PATH']='/opt/node/bin:'+env.get('PATH','')
for mode,out,name in [('production',str(root/'.preview-work/stage3-inventory/stable-dist'),'inventory-frontend-stable.log'),('preview','dist','inventory-frontend-preview.log')]:
 with (e/name).open('w') as log:r=subprocess.run(['nice','-n','19','node','node_modules/vite/bin/vite.js','build','--mode',mode,'--outDir',out,'--emptyOutDir'],cwd=app,env=env,stdout=log,stderr=subprocess.STDOUT)
 print(mode,r.returncode,flush=True)
 if r.returncode:raise SystemExit(r.returncode)
