import pathlib,subprocess,json,os
r=pathlib.Path('/var/home/jedwards/kiedas-orbiter');e=r/'docs/revamp/stage-2/evidence'
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
cases=[('recovery-regression','recovery-regression-packaged-smoke'),*[(x,x+'-packaged-smoke') for x in ['recovery-kill-first','recovery-kill-new','recovery-kill-last','recovery-kill-recovery','recovery-blocked']],('recovery-deb-smoke','recovery-deb-packaged-smoke'),('recovery-appimage-smoke','recovery-appimage-packaged-smoke')]
summary=[]
for script,record in cases:
 cmd=['flatpak-spawn','--host','podman','run','--rm','--security-opt','label=disable','--network=none','--cpus=4','--memory=4g','--volume',str(r)+':'+str(r)+':rw','localhost/kiedas-preview-ubuntu24-test','python3',str(r/'.preview-work/ubuntu-build'/(script+'.py'))]
 with (e/(script+'-runner.log')).open('w') as log:p=subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT)
 path=e/(record+'.json');d=json.loads(path.read_text()) if path.exists() else {'error':'missing evidence'}
 row={'script':script,'runner_exit':p.returncode,'error':d.get('error')}
 for k in ['checks','guard_checks','market_guards','import_checks','dialog_checks']:
  if k in d:row[k]={'count':len(d[k]),'failures':[x for x in d[k] if not x.get('pass')]}
 for k in ['rollback_checks','recovery_acceptance','failure_evidence','recovery_kill_marker','source_unchanged','after_relaunch','bundle_fallback_check']: 
  if k in d:row[k]=d[k]
 summary.append(row);(e/'recovery-batch-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(row),flush=True)
