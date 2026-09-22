from pathlib import Path
import json,hashlib,shutil,difflib,subprocess,datetime,os
os.nice(19)
r=Path('/var/home/jedwards/kiedas-orbiter');w=r/'.preview-work/stage3-work';s=r/'.preview-work/stage2';d=r/'docs/revamp/stage-3';e=d/'evidence';b=r/'.preview-work/ubuntu-build'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
component=json.loads((e/'dashboard-component.json').read_text());assert not component.get('error'),component.get('error');assert component['checks'] and all(x['pass'] for x in component['checks'])
summary={'timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'component_checks':len(component['checks']),'stable_action_comparisons':component['stable_action_count'],'component_failures':[],'packages':[]}
for kind in ['deb','appimage']:
 j=json.loads((e/('dashboard-'+kind+'-packaged-smoke.json')).read_text());assert not j.get('error');groups=['checks','guard_checks','market_guards','dialog_checks','updater_ui_checks','dashboard_checks'];allchecks=[x for k in groups for x in j[k]];assert all(x['pass'] for x in allchecks);assert j['bundle_fallback_check']['matches_installed_bytes']
 summary['packages'].append({'kind':kind,'checks':len(allchecks),'groups':{k:len(j[k]) for k in groups},'recorded_sha256':j['binary_sha256'],'hash_subject':'installed Debian executable' if kind=='deb' else 'AppImage archive','dashboard_state_injection':j['dashboard_state_injection']})
(e/'validation-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
paths=[b/'target/release/kiedas-orbiter',b/"target/release/bundle/deb/Kieda's Orbiter Preview_1.3.3_amd64.deb",b/"target/release/bundle/appimage/Kieda's Orbiter Preview_1.3.3_amd64.AppImage"]
artifacts=[{'path':str(p),'bytes':p.stat().st_size,'sha256':digest(p)} for p in paths];(e/'release-artifacts.json').write_text(json.dumps(artifacts,indent=2)+'\n')
old=(w/'Dashboard.before.jsx').read_text();new=(s/'src/screens/Dashboard.jsx').read_text();layout=s/'src/components/PreviewDashboardLayout.jsx'
patch=''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='a/src/screens/Dashboard.jsx',tofile='b/src/screens/Dashboard.jsx'))+''.join(difflib.unified_diff([],layout.read_text().splitlines(True),fromfile='/dev/null',tofile='b/src/components/PreviewDashboardLayout.jsx'))
(d/'implementation.patch').write_text(patch);(d/'cumulative-implementation.patch').write_bytes((w/'stage2-implementation.patch').read_bytes()+patch.encode())
check=subprocess.run(['git','apply','--check',str(d/'cumulative-implementation.patch')],cwd=r,capture_output=True,text=True);assert check.returncode==0,check.stderr
m=json.loads((r/'docs/revamp/stage-1/baseline-files.json').read_text());bad=[x['path'] for x in m if digest(r/x['path'])!=x['sha256']];assert not bad
lock=digest(s/'src-tauri/Cargo.lock');assert lock=='e8508bffd0423001766a5e3fe2fe81a814d79795b7cfb13189fc3dfc2a2e31c1'
metadata={'timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'stage2_patch_sha256':digest(w/'stage2-implementation.patch'),'incremental_patch_sha256':digest(d/'implementation.patch'),'cumulative_patch_sha256':digest(d/'cumulative-implementation.patch'),'cumulative_apply_check_exit':check.returncode,'tracked_files_checked':len(m),'mismatches':bad,'app_lockfile_unchanged':True,'source_hashes':{str(p):digest(p) for p in [w/'Dashboard.before.jsx',s/'src/screens/Dashboard.jsx',layout]},'gate':'Stage 3A delivered for user review; no next screen group started'}
(d/'implementation.json').write_text(json.dumps(metadata,indent=2)+'\n');(e/'baseline-check.json').write_text(json.dumps(metadata,indent=2)+'\n')
# The active build target now contains Stage 3. Point accepted Stage 2's current index at its preserved artifacts.
oldindex=r/'docs/revamp/stage-2/evidence/release-artifacts.json';backup=oldindex.with_name('before-stage3-artifact-relocation.json')
if not backup.exists():shutil.copy2(oldindex,backup)
accepted=json.loads((w/'stage2-release-artifacts.json').read_text())
for item in accepted:
 p=w/'stage2-packages'/Path(item['path']).name;assert digest(p)==item['sha256'];item['path']=str(p)
oldindex.write_text(json.dumps(accepted,indent=2)+'\n')
for p in w.rglob('*'):
 if any(x in p.parts for x in ['node_modules','dist','stage2-packages']):continue
 if p.is_file() and p.suffix in ['.py','.mjs','.jsx','.js','.html']:
  dest=e/'runners'/p.relative_to(w);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
print(json.dumps(summary,indent=2));print('850 baseline files unchanged; cumulative patch check passed')
