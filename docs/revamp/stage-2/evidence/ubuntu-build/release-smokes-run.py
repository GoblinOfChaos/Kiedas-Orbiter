import pathlib,subprocess,json
root=pathlib.Path('/var/home/jedwards/kiedas-orbiter');out=root/'docs/revamp/stage-2/evidence'
for script,name in [('release-installed-smoke.py','release-deb'),('appimage-smoke.py','release-appimage')]:
 cmd=['flatpak-spawn','--host','podman','run','--rm','--security-opt','label=disable','--network=none','--cpus=4','--memory=4g','--volume',str(root)+':'+str(root)+':rw','localhost/kiedas-preview-ubuntu24-test','python3',str(root/'.preview-work/ubuntu-build'/script)]
 with open(out/(name+'-runner.log'),'w') as log:result=subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT)
 path=out/(name+'-packaged-smoke.json');r=json.loads(path.read_text()) if path.exists() else {'error':'missing result file'}
 print(name, {'runner_exit':result.returncode,'error':r.get('error'),'resource':r.get('bundle_fallback_check')},flush=True)
