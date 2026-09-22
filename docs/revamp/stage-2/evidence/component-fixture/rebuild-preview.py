import os, pathlib, subprocess
r=pathlib.Path('/var/home/jedwards/kiedas-orbiter')
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
env=os.environ.copy();env['UV_THREADPOOL_SIZE']='2'
node='/home/jedwards/.nvm/versions/node/v24.19.0/bin/node'
subprocess.run([node,'node_modules/vite/bin/vite.js','build','--mode','preview'],cwd=r/'.preview-work/stage2',env=env,check=True)
subprocess.run(['/usr/bin/python3',str(r/'.preview-work/component-fixture/build.py')],env=env,check=True)
