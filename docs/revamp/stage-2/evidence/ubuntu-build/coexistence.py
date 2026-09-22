import pathlib,subprocess,tempfile,json,hashlib,os
base=pathlib.Path('/var/home/jedwards/kiedas-orbiter/.preview-work');out=base.parent/'docs/revamp/stage-2/evidence'
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
def select_package(directory, expected):
 matches=[p for p in directory.glob('*.deb') if subprocess.check_output(['dpkg-deb','-f',str(p),'Package'],text=True).strip()==expected]
 if len(matches)!=1:raise RuntimeError(f'Expected exactly one {expected} archive, found {len(matches)}')
 return matches[0]
preview=select_package(base/'ubuntu-build/target/debug/bundle/deb','kieda-s-orbiter-preview')
stable=select_package(base/'ubuntu-build/stable-target/debug/bundle/deb','kieda-s-orbiter')
log=open(out/'ubuntu-coexistence.log','w');results={'stable_sha256':hashlib.sha256(stable.read_bytes()).hexdigest(),'preview_sha256':hashlib.sha256(preview.read_bytes()).hexdigest(),'checks':{},'runtime_launch':False}
def run(args):subprocess.run(args,stdout=log,stderr=subprocess.STDOUT,check=True)
def names(package):return subprocess.check_output(['dpkg-deb','-f',str(package),'Package'],text=True).strip()
def hashes(name):
 paths=subprocess.check_output(['dpkg-query','-L',name],text=True).splitlines()
 return {p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest() for p in paths if pathlib.Path(p).is_file()}
def intact(old):return all(pathlib.Path(p).is_file() and hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==h for p,h in old.items())
try:
 sn,pn=names(stable),names(preview);results['package_names']=[sn,pn];results['checks']['distinct_names']=sn!=pn
 run(['dpkg','-i',str(stable),str(preview)])
 sh,ph=hashes(sn),hashes(pn);results['overlapping_files']=sorted(set(sh)&set(ph));results['checks']['no_file_collisions']=not results['overlapping_files']
 run(['dpkg','--purge',pn]);results['checks']['stable_files_unchanged_after_preview_purge']=intact(sh)
 run(['dpkg','-i',str(preview)]);run(['dpkg','--purge',sn]);results['checks']['preview_files_unchanged_after_stable_purge']=intact(ph)
 run(['dpkg','--purge',pn]);results['checks']['both_executables_removed']=not pathlib.Path('/usr/bin/kiedas-orbiter').exists() and not pathlib.Path('/usr/bin/kiedas-orbiter-preview').exists()
except Exception as e:results['error']=str(e)
finally:
 log.close();(out/'ubuntu-coexistence.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2));raise SystemExit(0 if 'error' not in results and all(results['checks'].values()) else 1)
