from pathlib import Path
import datetime, difflib, hashlib, json, shutil, subprocess
root=Path('/var/home/jedwards/kiedas-orbiter')
work=root/'.preview-work/stage3-rivens'; checkout=root/'.preview-work/stage2'; stage=root/'docs/revamp/stage-3'; evidence=stage/'evidence'; target=root/'.preview-work/ubuntu-build/target/release'
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def all_pass(rows):return bool(rows) and all(row.get('pass') is True for row in rows)
for required in (root/'AGENTS.md',work/'before/Rivens.jsx',work/'before/cumulative-implementation.patch',checkout/'src/screens/Rivens.jsx',checkout/'src/components/PreviewRivensLayout.jsx',evidence/'rivens-component.json',evidence/'rivens-deb-packaged-smoke.json',evidence/'rivens-appimage-packaged-smoke.json',target/'kiedas-orbiter',target/'kiedas-orbiter-preview'):
 if not required.exists(): raise FileNotFoundError(f'precondition path missing: {required}')
component=json.loads((evidence/'rivens-component.json').read_text())
assert component.get('error') is None
assert len(component['checks'])==65 and all_pass(component['checks'])
assert len(component['stable_comparisons'])==7 and all(row['equal'] for row in component['stable_comparisons'])
groups=['checks','dialog_checks','guard_checks','market_guards','updater_ui_checks','dashboard_checks','inventory_checks','mastery_checks','mods_checks','cosmetics_checks','rivens_checks']
packages=[]
for kind in ('deb','appimage'):
 data=json.loads((evidence/f'rivens-{kind}-packaged-smoke.json').read_text())
 assert data.get('error') is None
 rows=[row for group in groups for row in data[group]]
 assert len(rows)==50 and all_pass(rows)
 assert data['bundle_fallback_check']['matches_installed_bytes']
 packages.append({'kind':kind,'checks':50,'passed':50,'groups':{group:len(data[group]) for group in groups},'binary_sha256':data['binary_sha256'],'rivens_checks':data['rivens_checks']})
timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
summary={
 'timestamp':timestamp,
 'component_checks':65,
 'component_passed':65,
 'stable_exact_markup_comparison_count':7,
 'stable_exact_markup_states':component['stable_comparisons'],
 'packages':packages,
 'failures':[],
 'gate':'Stage 3F implemented and validated; awaiting user acceptance',
}
(evidence/'rivens-validation-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
artifact_paths=[target/'kiedas-orbiter',target/'kiedas-orbiter-preview',target/"bundle/deb/Kieda's Orbiter Preview_1.3.3_amd64.deb",target/"bundle/appimage/Kieda's Orbiter Preview_1.3.3_amd64.AppImage"]
artifacts=[{'path':str(path),'bytes':path.stat().st_size,'sha256':digest(path)} for path in artifact_paths]
(evidence/'rivens-release-artifacts.json').write_text(json.dumps(artifacts,indent=2)+'\n')
new_path=checkout/'src/screens/Rivens.jsx';layout=checkout/'src/components/PreviewRivensLayout.jsx'
screen_diff=subprocess.run(['git','diff','--','src/screens/Rivens.jsx'],cwd=checkout,capture_output=True,text=True,check=True).stdout
layout_diff=subprocess.run(['git','diff','--no-index','--','/dev/null','src/components/PreviewRivensLayout.jsx'],cwd=checkout,capture_output=True,text=True)
assert layout_diff.returncode==1,layout_diff.stderr
patch=screen_diff+layout_diff.stdout
(stage/'rivens-implementation.patch').write_text(patch)
prior=work/'before/cumulative-implementation.patch'
prior_bytes=prior.read_bytes(); separator=b'' if prior_bytes.endswith(bytes([10])) else bytes([10])
(stage/'cumulative-implementation.patch').write_bytes(prior_bytes+separator+patch.encode())
apply_check=subprocess.run(['git','apply','--check',str(stage/'cumulative-implementation.patch')],cwd=root,capture_output=True,text=True)
assert apply_check.returncode==0,apply_check.stderr
manifest=json.loads((root/'docs/revamp/stage-1/baseline-files.json').read_text())
mismatches=[row['path'] for row in manifest if digest(root/row['path'])!=row['sha256']]
assert len(manifest)==850 and not mismatches
lock_hash=digest(checkout/'src-tauri/Cargo.lock');lock_before=json.loads((stage/'rivens-source-register.json').read_text())['cargo_lock_sha256'];assert lock_hash==lock_before
source_proof=json.loads((evidence/'rivens-source-preservation.json').read_text());assert source_proof['filter_sort_pricing_grading_card_drawer_and_backend_behavior_unchanged']
metadata={
 'timestamp':timestamp,'stage3e_cumulative_patch_sha256':digest(prior),
 'rivens_incremental_patch_sha256':digest(stage/'rivens-implementation.patch'),
 'cumulative_patch_sha256':digest(stage/'cumulative-implementation.patch'),
 'cumulative_apply_check_exit':apply_check.returncode,'tracked_files_checked':len(manifest),'mismatches':mismatches,
 'app_lockfile_sha256':lock_hash,'app_lockfile_unchanged':True,'source_preservation':source_proof,
 'artifact_count':len(artifacts),'component_checks':65,'stable_exact_markup_comparisons':7,
 'packaged_checks_per_artifact':50,'gate':'Stage 3F implemented and validated; awaiting user acceptance'
}
(stage/'rivens-implementation.json').write_text(json.dumps(metadata,indent=2)+'\n')
(evidence/'rivens-baseline-check.json').write_text(json.dumps(metadata,indent=2)+'\n')
register_path=stage/'rivens-source-register.json';register=json.loads(register_path.read_text())
register['status']='implemented_awaiting_acceptance'
register['after_sources']={'src/screens/Rivens.jsx':{'sha256':digest(new_path)},'src/components/PreviewRivensLayout.jsx':{'sha256':digest(layout)}}
register['validation']={'component_checks':'65/65','stable_exact_markup_comparisons':'7/7','debian_native_checks':'50/50','appimage_native_checks':'50/50','tracked_baseline':'850/850','lockfile_unchanged':True,'stage3f_started':True,'stage3g_started':False}
register_path.write_text(json.dumps(register,indent=2)+'\n')
cosmetics_index=evidence/'cosmetics-release-artifacts.json';cosmetics=json.loads(cosmetics_index.read_text());preserved=work/'preserved-stage3e-native'
for row in cosmetics:
 original=Path(row.get('path',row.get('path_at_validation')))
 copy=preserved/original.relative_to(target)
 assert copy.exists() and digest(copy)==row['sha256'] and copy.stat().st_size==row['bytes']
 if 'path' in row:row['path_at_validation']=row.pop('path')
 row['preserved_copy']=str(copy);row['current_file_available_at_original_path']=False
cosmetics_index.write_text(json.dumps(cosmetics,indent=2)+'\n')
runner_dir=evidence/'runners';runner_dir.mkdir(parents=True,exist_ok=True)
runner_files=['component-build.py','component.py','frontend.py','native-build.py','bundle.py','repair-evidence.py','evidence_integrity.py','deb-smoke.py','appimage-smoke.py','augment-smoke.py','source_preservation.py','rivens-native-block.txt']
for name in runner_files:shutil.copy2(work/name,runner_dir/('rivens-'+name))
shutil.copy2(work/'fixture/entry.jsx',runner_dir/'rivens-fixture-entry.jsx')
shutil.copy2(work/'fixture/mock.js',runner_dir/'rivens-fixture-mock.js')
shutil.copy2(work/'fixture/vite.config.mjs',runner_dir/'rivens-fixture-vite.config.mjs')
print(json.dumps({'component':'65/65','stable_markup':'7/7','packages':[(row['kind'],'50/50') for row in packages],'artifacts':artifacts,'baseline':{'checked':len(manifest),'mismatches':mismatches},'lockfile_unchanged':True,'apply_check':apply_check.returncode},indent=2))
