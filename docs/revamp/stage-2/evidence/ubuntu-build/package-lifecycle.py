"""Disposable Ubuntu package-manager upgrade/purge test.
Upgrade candidate changes package metadata version only; it is not a new app release.
"""
import pathlib, tempfile, subprocess, json, hashlib, os
base=pathlib.Path('/var/home/jedwards/kiedas-orbiter/.preview-work'); evidence=base.parent/'docs/revamp/stage-2/evidence'
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
package=next((base/'ubuntu-build/target/debug/bundle/deb').glob('*.deb'))
result={'package_sha256':hashlib.sha256(package.read_bytes()).hexdigest(),'upgrade_kind':'metadata-only synthetic version bump; unchanged payload','checks':{}}
work=pathlib.Path(tempfile.mkdtemp(prefix='preview-lifecycle-'))
profile=work/'xdgdata/kiedas-orbiter-preview/data/user';profile.mkdir(parents=True)
marker=profile/'synthetic.txt';marker.write_text('retain synthetic profile')
log=open(evidence/'ubuntu-package-lifecycle.log','w')
def run(args):subprocess.run(args,stdout=log,stderr=subprocess.STDOUT,check=True)
try:
 run(['dpkg','-i',str(package)])
 files=subprocess.check_output(['dpkg-query','-L','kieda-s-orbiter-preview'],text=True).splitlines()
 owned=[p for p in files if pathlib.Path(p).is_file() or pathlib.Path(p).is_symlink()]
 result['owned_files_before']=owned
 executable=pathlib.Path('/usr/bin/kiedas-orbiter-preview');before=hashlib.sha256(executable.read_bytes()).hexdigest()
 stage=work/'package';run(['dpkg-deb','-R',str(package),str(stage)])
 control=stage/'DEBIAN/control';text=control.read_text();old=next(x for x in text.splitlines() if x.startswith('Version: '));new=old+'+stage2test1';control.write_text(text.replace(old,new,1))
 upgraded=work/'synthetic-upgrade.deb';run(['dpkg-deb','--build',str(stage),str(upgraded)])
 run(['dpkg','-i',str(upgraded)])
 version=subprocess.check_output(['dpkg-query','-W','-f=${Version}','kieda-s-orbiter-preview'],text=True)
 result['upgrade_version']=version
 result['checks']['metadata_upgrade_applied']=version==new.removeprefix('Version: ')
 result['checks']['executable_payload_unchanged']=hashlib.sha256(executable.read_bytes()).hexdigest()==before
 result['checks']['synthetic_profile_retained_after_upgrade']=marker.read_text()=='retain synthetic profile'
 run(['dpkg','--purge','kieda-s-orbiter-preview'])
 left=[p for p in owned if pathlib.Path(p).exists() or pathlib.Path(p).is_symlink()]
 result['remaining_owned_files']=left
 result['checks']['all_owned_files_removed']=not left
 result['checks']['synthetic_profile_retained_after_purge']=marker.read_text()=='retain synthetic profile'
except Exception as error:result['error']=str(error)
finally:
 log.close();(evidence/'ubuntu-package-lifecycle.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='owned_files_before'},indent=2))
raise SystemExit(0 if 'error' not in result and all(result['checks'].values()) else 1)
