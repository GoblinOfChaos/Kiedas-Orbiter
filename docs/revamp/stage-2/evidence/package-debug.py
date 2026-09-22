import os,pathlib,subprocess,shutil
root=pathlib.Path('/var/home/jedwards/kiedas-orbiter/.preview-work/stage2')
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
env=os.environ.copy();env['CARGO_BUILD_JOBS']='4';env['PATH']='/home/jedwards/.cargo/bin:/home/jedwards/.nvm/versions/node/v24.19.0/bin:'+env.get('PATH','')
shutil.copy2(root/'src-tauri/target/debug/kiedas-orbiter',root/'src-tauri/target/debug/kiedas-orbiter-preview')
with open(root.parent.parent/'docs/revamp/stage-2/evidence/debug-deb-bundle.log','w') as log:
 r=subprocess.run(['node','node_modules/@tauri-apps/cli/tauri.js','bundle','--debug','--bundles','deb','--config','src-tauri/tauri.preview.conf.json','--features','preview,tauri/custom-protocol','--no-sign','--ci'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
print('Debug Debian bundle exit:',r.returncode)
raise SystemExit(r.returncode)
