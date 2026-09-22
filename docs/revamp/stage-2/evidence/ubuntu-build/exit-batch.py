import pathlib,subprocess,json,os
r=pathlib.Path('/var/home/jedwards/kiedas-orbiter');e=r/'docs/revamp/stage-2/evidence'
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
summary=[]
for script,stem in [('exit-recovery-dialog','exit-recovery-dialog'),('exit-native-picker','exit-native-picker'),('exit-deb-smoke','exit-deb'),('exit-appimage-smoke','exit-appimage')]:
 cmd=['flatpak-spawn','--host','podman','run','--rm','--security-opt','label=disable','--network=none','--cpus=4','--memory=4g','--volume',str(r)+':'+str(r)+':rw','localhost/kiedas-preview-ubuntu24-test','python3',str(r/'.preview-work/ubuntu-build'/(script+'.py'))]
 with (e/(script+'-runner.log')).open('w') as log:p=subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT)
 path=e/(stem+'-packaged-smoke.json');d=json.loads(path.read_text()) if path.exists() else {'error':'missing evidence'}
 row={'script':script,'runner_exit':p.returncode,'error':d.get('error')}
 for k in ['checks','guard_checks','market_guards','picker_checks','dialog_checks','failure_evidence','native_process_exit','bundle_fallback_check']:
  if k in d:row[k]=d[k]
 summary.append(row);(e/'exit-batch-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps({'script':script,'error':d.get('error'),'exit':d.get('native_process_exit'),'picker':d.get('picker_checks'),'dialog':d.get('dialog_checks')}),flush=True)
