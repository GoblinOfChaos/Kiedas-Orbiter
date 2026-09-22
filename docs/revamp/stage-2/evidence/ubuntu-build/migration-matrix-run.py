import subprocess,json,pathlib
root=pathlib.Path('/var/home/jedwards/kiedas-orbiter');out=root/'docs/revamp/stage-2/evidence';summary=[]
for mode in ['empty','directory','settings']:
 cmd=['flatpak-spawn','--host','podman','run','--rm','--security-opt','label=disable','--network=none','--cpus=4','--memory=4g','--env','PREVIEW_TEST_MODE='+mode,'--volume',str(root)+':'+str(root)+':rw','localhost/kiedas-preview-ubuntu24-test','python3',str(root/'.preview-work/ubuntu-build/release-migration.py')]
 with open(out/('release-'+mode+'-runner.log'),'w') as log:result=subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT)
 evidence=json.loads((out/('release-'+mode+'-native-smoke.json')).read_text())
 summary.append({'mode':mode,'runner_exit':result.returncode,'error':evidence.get('error'),'checks':evidence['checks'],'binary_sha256':evidence['binary_sha256']})
 print(mode, 'PASS' if 'error' not in evidence and all(x['pass'] for x in evidence['checks']) else 'FAIL',flush=True)
(out/'release-migration-matrix.json').write_text(json.dumps(summary,indent=2)+'\n')
