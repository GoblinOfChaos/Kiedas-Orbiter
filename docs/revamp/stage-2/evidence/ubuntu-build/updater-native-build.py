import os,pathlib,subprocess
root=pathlib.Path('/var/home/jedwards/kiedas-orbiter/.preview-work/stage2')
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
env=os.environ.copy();env.update(CARGO_BUILD_JOBS='4',CMAKE_BUILD_PARALLEL_LEVEL='4',CARGO_PROFILE_DEV_DEBUG='0',CARGO_PROFILE_DEV_CODEGEN_UNITS='2',CARGO_HOME=str(root.parent/'ubuntu-build/cargo-home'),CARGO_TARGET_DIR=str(root.parent/'ubuntu-build/target'),TAURI_CONFIG=(root/'src-tauri/tauri.preview.conf.json').read_text(),PATH='/opt/rust/bin:'+env.get('PATH',''))
with open(root.parent.parent/'docs/revamp/stage-2/evidence/updater-native-build.log','w') as log:
 r=subprocess.run(['nice','-n','19','cargo','build','--manifest-path','src-tauri/Cargo.toml','--release','--features','preview,tauri/custom-protocol','--offline','--locked'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
print('Ubuntu native build exit:',r.returncode)
raise SystemExit(r.returncode)
