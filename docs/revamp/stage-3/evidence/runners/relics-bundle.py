import os,pathlib,subprocess,shutil
root=pathlib.Path('/var/home/jedwards/kiedas-orbiter/.preview-work/stage2');target=root.parent/'ubuntu-build/target';e=root.parent.parent/'docs/revamp/stage-3/evidence'
for required in (pathlib.Path('/var/home/jedwards/kiedas-orbiter/AGENTS.md'),root/'dist/index.html',root/'src-tauri/tauri.preview.conf.json',target/'release/kiedas-orbiter',e):
    if not required.exists(): raise FileNotFoundError(f'precondition path missing: {required}')
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
env=os.environ.copy();env.update(CARGO_BUILD_JOBS='4',LDAI_RUNTIME_FILE=str(root.parent/'ubuntu-build/cache/runtime-x86_64'),APPIMAGE_EXTRACT_AND_RUN='1',XDG_CACHE_HOME=str(root.parent/'ubuntu-build/cache'),CARGO_TARGET_DIR=str(target),CARGO_HOME=str(root.parent/'ubuntu-build/cargo-home'),PATH='/opt/rust/bin:/opt/node/bin:'+env.get('PATH',''))
shutil.copy2(target/'release/kiedas-orbiter',target/'release/kiedas-orbiter-preview')
with (e/'relics-native-bundle-inner.log').open('w') as log:r=subprocess.run(['nice','-n','19','node','node_modules/@tauri-apps/cli/tauri.js','bundle','--verbose','--bundles','deb,appimage','--config',str(root/'src-tauri/tauri.preview.conf.json'),'--features','preview,tauri/custom-protocol','--no-sign','--ci'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
print('bundle',r.returncode);raise SystemExit(r.returncode)
