import os, pathlib, subprocess
root=pathlib.Path('/var/home/jedwards/kiedas-orbiter/.preview-work/stage2')
os.chdir(root)
os.sched_setaffinity(0, sorted(os.sched_getaffinity(0))[:4])
env=os.environ.copy()
env.update(CARGO_BUILD_JOBS='4', CMAKE_BUILD_PARALLEL_LEVEL='4', CARGO_PROFILE_DEV_DEBUG='0', CARGO_PROFILE_DEV_CODEGEN_UNITS='2', TAURI_CONFIG=(root/'src-tauri/tauri.preview.conf.json').read_text())
with open('/var/home/jedwards/kiedas-orbiter/docs/revamp/stage-2/evidence/native-container-build.log','w') as log:
    result=subprocess.run(['nice','-n','19','/home/jedwards/.cargo/bin/cargo','build','--manifest-path','src-tauri/Cargo.toml','--features','preview','--offline'],env=env,stdout=log,stderr=subprocess.STDOUT)
print('Native container build exit:', result.returncode)
raise SystemExit(result.returncode)
