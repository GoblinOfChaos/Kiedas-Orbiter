import os,pathlib,subprocess
r=pathlib.Path('/var/home/jedwards/kiedas-orbiter');s=r/'.preview-work/stage2';e=r/'docs/revamp/stage-2/evidence'
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
env=os.environ.copy();env['PATH']='/opt/node/bin:'+env.get('PATH','')
for mode,out in [('production',str(r/'.preview-work/ubuntu-build/updater-stable-dist')),('preview','dist')]:
 with (e/('updater-frontend-'+mode+'.log')).open('w') as log:
  p=subprocess.run(['nice','-n','19','node','node_modules/vite/bin/vite.js','build','--mode',mode,'--outDir',out],cwd=s,env=env,stdout=log,stderr=subprocess.STDOUT)
 print(mode,p.returncode,flush=True)
 if p.returncode:raise SystemExit(p.returncode)
