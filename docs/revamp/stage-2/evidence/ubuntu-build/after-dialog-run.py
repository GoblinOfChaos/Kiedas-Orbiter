import pathlib,subprocess,json,os
r=pathlib.Path('/var/home/jedwards/kiedas-orbiter');e=r/'docs/revamp/stage-2/evidence'
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
summary=[]
for name in ['after-dialog-deb','after-dialog-appimage']:
 cmd=['flatpak-spawn','--host','podman','run','--rm','--security-opt','label=disable','--network=none','--cpus=4','--memory=4g','--volume',str(r)+':'+str(r)+':rw','localhost/kiedas-preview-ubuntu24-test','python3',str(r/'.preview-work/ubuntu-build'/(name+'-smoke.py'))]
 with (e/(name+'-runner.log')).open('w') as log:proc=subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT)
 d=json.loads((e/(name+'-packaged-smoke.json')).read_text())
 checks=d.get('checks',[])+d.get('dialog_checks',[])+d.get('guard_checks',[])+d.get('market_guards',[])
 summary.append({'artifact':name,'runner_exit':proc.returncode,'error':d.get('error'),'check_count':len(checks),'failed_checks':[x for x in checks if not x.get('pass')],'resource':d.get('bundle_fallback_check'),'removal':d.get('removal')})
 print(json.dumps(summary[-1]),flush=True)
(e/'after-dialog-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
raise SystemExit(int(any(x['runner_exit'] or x['error'] or x['failed_checks'] for x in summary)))
