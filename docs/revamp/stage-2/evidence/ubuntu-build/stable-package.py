import os,pathlib,subprocess,shutil
root=pathlib.Path('/var/home/jedwards/kiedas-orbiter/.preview-work/stable-baseline');target=root.parent/'ubuntu-build/stable-target'
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
env=os.environ.copy();env.update(CARGO_BUILD_JOBS='4',CARGO_TARGET_DIR=str(target),CARGO_HOME=str(root.parent/'ubuntu-build/cargo-home'),PATH='/opt/rust/bin:/opt/node/bin:'+env.get('PATH',''))

with open(root.parent.parent/'docs/revamp/stage-2/evidence/ubuntu-stable-baseline-package.log','w') as log:
 r=subprocess.run(['node','node_modules/@tauri-apps/cli/tauri.js','bundle','--debug','--bundles','deb','--features','tauri/custom-protocol','--no-sign','--ci'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
print('Ubuntu package exit:',r.returncode);raise SystemExit(r.returncode)
