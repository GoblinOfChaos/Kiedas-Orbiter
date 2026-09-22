import os,pathlib,subprocess,tempfile,shutil,hashlib,json,datetime
r=pathlib.Path('/var/home/jedwards/kiedas-orbiter');b=r/'.preview-work/ubuntu-build';e=r/'docs/revamp/stage-2/evidence'
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
scratch=pathlib.Path(tempfile.mkdtemp(prefix='missing-root-',dir=r/'.preview-work'))
source=b/'target/release/kiedas-orbiter';app=scratch/'legacy/kiedas-orbiter-preview';app.parent.mkdir();shutil.copy2(source,app)
legacy=app.parent/'data/user';legacy.mkdir(parents=True)
(legacy/'settings.json').write_text('{"synthetic_legacy":true,"wfm_token":"SYNTHETIC-DO-NOT-IMPORT"}')
(legacy/'sentinel.txt').write_text('synthetic legacy sentinel')
xdg=scratch/'xdgdata';stable=xdg/'kiedas-orbiter/data/user';stable.mkdir(parents=True);(stable/'settings.json').write_text('{"synthetic_stable":true}')
def hashes(folder):return {str(p.relative_to(folder)):hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.rglob('*') if p.is_file()}
before={'legacy':hashes(legacy),'stable':hashes(stable)}
shim=scratch/'missing-data-root.so'
with (e/'missing-data-root-compile.log').open('w') as log:subprocess.run(['nice','-n','19','cc','-shared','-fPIC','-O2',str(b/'missing-data-root.c'),'-o',str(shim),'-ldl'],stdout=log,stderr=subprocess.STDOUT,check=True)
env=os.environ.copy();env.update(LD_PRELOAD=str(shim),XDG_DATA_HOME=str(xdg),XDG_CONFIG_HOME=str(scratch/'config'),XDG_CACHE_HOME=str(scratch/'cache'),XDG_RUNTIME_DIR=str(scratch/'runtime'),RUST_BACKTRACE='0')
# Only this subprocess receives the shim. HOME is not changed in the environment.
with (e/'missing-data-root-native.log').open('w') as log:
 p=subprocess.run([str(app)],env=env,cwd=scratch,stdout=log,stderr=subprocess.STDOUT,timeout=20)
text=(e/'missing-data-root-native.log').read_text();after={'legacy':hashes(legacy),'stable':hashes(stable)}
checks={'xdg_lookup_fault_exercised':'[directory-fault] XDG_DATA_HOME unavailable' in text,'home_lookup_fault_exercised':'[directory-fault] HOME unavailable' in text,'os_user_fallback_fault_exercised':'[directory-fault] getpwuid_r no entry' in text,'nonzero_exit':p.returncode!=0,'explicit_no_fallback_error':'Preview cannot resolve the OS data directory; no legacy fallback is allowed' in text,'legacy_unchanged':before['legacy']==after['legacy'],'stable_unchanged':before['stable']==after['stable'],'preview_root_absent':not (xdg/'kiedas-orbiter-preview').exists(),'no_cwd_profile_fallback':not (scratch/'data').exists()}
result={'timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'tier':'native release binary with libc directory-discovery fault injection','binary_sha256':hashlib.sha256(app.read_bytes()).hexdigest(),'shim_source_sha256':hashlib.sha256((b/'missing-data-root.c').read_bytes()).hexdigest(),'private_network_container':True,'native_process_exit':p.returncode,'scratch':str(scratch),'before':before,'after':after,'checks':checks,'normal_gui_launch_claimed':False}
(e/'missing-data-root-native.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2));assert all(checks.values())
