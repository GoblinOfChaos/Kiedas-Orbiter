import os,pathlib,subprocess
b=pathlib.Path(__file__).resolve().parent
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
env=os.environ.copy();env.update(CARGO_BUILD_JOBS='4',CARGO_HOME=str(b/'cargo-home'),CARGO_TARGET_DIR=str(b/'recovery-policy-target'),PATH='/opt/rust/bin:'+env.get('PATH',''))
subprocess.run(['nice','-n','19','cargo','test','--offline','--manifest-path',str(b/'recovery-policy/Cargo.toml'),'--','--test-threads=4'],env=env,check=True)
