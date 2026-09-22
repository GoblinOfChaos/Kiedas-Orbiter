import pathlib,subprocess,json
r=pathlib.Path('/var/home/jedwards/kiedas-orbiter');e=r/'docs/revamp/stage-2/evidence'
cmd=['flatpak-spawn','--host','podman','run','--rm','--security-opt','label=disable','--network=none','--cpus=4','--memory=4g','--volume',str(r)+':'+str(r)+':rw','localhost/kiedas-preview-ubuntu24-test','python3',str(r/'.preview-work/ubuntu-build/recovery-kill-committed.py')]
with (e/'recovery-kill-committed-runner.log').open('w') as log:subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT,check=True)
d=json.loads((e/'recovery-kill-committed-packaged-smoke.json').read_text());print({k:d.get(k) for k in ['error','after_relaunch','recovery_acceptance']})
with (e/'recovery-stable-policy-tests.log').open('w') as log:subprocess.run(['sh',str(r/'.preview-work/ubuntu-build/run.sh'),'recovery-policy-stable.py'],stdout=log,stderr=subprocess.STDOUT,check=True)
