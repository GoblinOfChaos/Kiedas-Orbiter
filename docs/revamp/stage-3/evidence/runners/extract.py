import os,subprocess
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
raise SystemExit(subprocess.call(['/opt/node/bin/node','/var/home/jedwards/kiedas-orbiter/.preview-work/stage3-work/extract-dashboard.mjs']))
