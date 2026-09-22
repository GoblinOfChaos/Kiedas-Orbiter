import os,pathlib,subprocess,shutil
root=pathlib.Path('/var/home/jedwards/kiedas-orbiter/.preview-work/stage2');target=root.parent/'ubuntu-build/target'
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
env=os.environ.copy();env.update(CARGO_BUILD_JOBS='4',CARGO_TARGET_DIR=str(target),CARGO_HOME=str(root.parent/'ubuntu-build/cargo-home'),PATH='/opt/rust/bin:/opt/node/bin:'+env.get('PATH',''))
shutil.copy2(target/'debug/kiedas-orbiter',target/'debug/kiedas-orbiter-preview')
with open(root.parent.parent/'docs/revamp/stage-2/evidence/ubuntu-debug-bundle.log','w') as log:
 r=subprocess.run(['node','node_modules/@tauri-apps/cli/tauri.js','bundle','--debug','--bundles','deb','--config','src-tauri/tauri.preview.conf.json','--features','preview,tauri/custom-protocol','--no-sign','--ci'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
print('Ubuntu package exit:',r.returncode);raise SystemExit(r.returncode)
