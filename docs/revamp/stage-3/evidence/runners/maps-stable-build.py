import os, subprocess
from pathlib import Path

ROOT=Path('/var/home/jedwards/kiedas-orbiter');APP=ROOT/'.preview-work/stage2';TARGET=ROOT/'.preview-work/stage3-maps/stable-target';E=ROOT/'docs/revamp/stage-3/evidence'
for path in (ROOT/'AGENTS.md',APP/'src-tauri/Cargo.toml',APP/'src-tauri/tauri.conf.json',E):
    if not path.exists():raise FileNotFoundError(path)
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
env=os.environ.copy();env.update(CARGO_BUILD_JOBS='4',CMAKE_BUILD_PARALLEL_LEVEL='4',CARGO_HOME=str(ROOT/'.preview-work/ubuntu-build/cargo-home'),CARGO_TARGET_DIR=str(TARGET),PATH='/opt/rust/bin:'+env.get('PATH',''))
with (E/'maps-stable-native-build-inner.log').open('w') as log:
    result=subprocess.run(['nice','-n','19','cargo','build','--manifest-path',str(APP/'src-tauri/Cargo.toml'),'--release','--features','tauri/custom-protocol','--offline','--locked'],cwd=APP,env=env,stdout=log,stderr=subprocess.STDOUT)
raise SystemExit(result.returncode)
