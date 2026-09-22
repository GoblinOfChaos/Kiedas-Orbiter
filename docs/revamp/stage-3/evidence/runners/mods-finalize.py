from pathlib import Path
import datetime
import difflib
import hashlib
import json
import shutil
import subprocess

root=Path('/var/home/jedwards/kiedas-orbiter')
work=root/'.preview-work/stage3-mods'
checkout=root/'.preview-work/stage2'
stage=root/'docs/revamp/stage-3'
evidence=stage/'evidence'
target=root/'.preview-work/ubuntu-build/target/release'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def all_pass(rows):
    return bool(rows) and all(row.get('pass') is True for row in rows)

component=json.loads((evidence/'mods-component.json').read_text())
assert component.get('error') is None
assert len(component['checks'])==119 and all_pass(component['checks'])
assert len(component['stable_comparisons'])==8 and all(row['equal'] for row in component['stable_comparisons'])

groups=['checks','dialog_checks','guard_checks','market_guards','updater_ui_checks','dashboard_checks','inventory_checks','mastery_checks','mods_checks']
packages=[]
for kind in ('deb','appimage'):
    data=json.loads((evidence/f'mods-{kind}-packaged-smoke.json').read_text())
    assert data.get('error') is None
    rows=[row for group in groups for row in data[group]]
    assert len(rows)==40 and all_pass(rows)
    assert data['bundle_fallback_check']['matches_installed_bytes']
    packages.append({'kind':kind,'checks':40,'passed':40,'groups':{group:len(data[group]) for group in groups},'binary_sha256':data['binary_sha256'],'mods_state_injection':data['mods_state_injection'],'mods_checks':data['mods_checks']})

timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
summary={'timestamp':timestamp,'component_checks':119,'component_passed':119,'stable_exact_markup_comparison_count':9,'stable_exact_markup_states':component['stable_comparisons'],'stable_pointer_drawer_exact_markup':next(row for row in component['checks'] if row['name']=='stable-pointer-drawer-exact-markup'),'packages':packages,'failures':[],'gate':'Stage 3D implemented and validated; awaiting user acceptance'}
(evidence/'mods-validation-summary.json').write_text(json.dumps(summary,indent=2)+'\n')

artifact_paths=[target/'kiedas-orbiter',target/'kiedas-orbiter-preview',target/"bundle/deb/Kieda's Orbiter Preview_1.3.3_amd64.deb",target/"bundle/appimage/Kieda's Orbiter Preview_1.3.3_amd64.AppImage"]
artifacts=[{'path':str(path),'bytes':path.stat().st_size,'sha256':digest(path)} for path in artifact_paths]
(evidence/'mods-release-artifacts.json').write_text(json.dumps(artifacts,indent=2)+'\n')

old_path=work/'before/Mods.jsx'
new_path=checkout/'src/screens/Mods.jsx'
layout=checkout/'src/components/PreviewModsLayout.jsx'
patch=''.join(difflib.unified_diff(old_path.read_text().splitlines(True),new_path.read_text().splitlines(True),fromfile='a/src/screens/Mods.jsx',tofile='b/src/screens/Mods.jsx'))
patch+=''.join(difflib.unified_diff([],layout.read_text().splitlines(True),fromfile='/dev/null',tofile='b/src/components/PreviewModsLayout.jsx'))
(stage/'mods-implementation.patch').write_text(patch)
prior=work/'before/cumulative-implementation.patch'
(stage/'cumulative-implementation.patch').write_bytes(prior.read_bytes()+patch.encode())
apply_check=subprocess.run(['git','apply','--check',str(stage/'cumulative-implementation.patch')],cwd=root,capture_output=True,text=True)
assert apply_check.returncode==0,apply_check.stderr

manifest=json.loads((root/'docs/revamp/stage-1/baseline-files.json').read_text())
mismatches=[row['path'] for row in manifest if digest(root/row['path'])!=row['sha256']]
assert len(manifest)==850 and not mismatches
lock_hash=digest(checkout/'src-tauri/Cargo.lock')
lock_before=(work/'before/cargo-lock.sha256').read_text().split()[0]
assert lock_hash==lock_before
source_proof=json.loads((evidence/'mods-source-preservation.json').read_text())
assert source_proof['mods_logic_unchanged']

metadata={'timestamp':timestamp,'stage3c_cumulative_patch_sha256':digest(prior),'mods_incremental_patch_sha256':digest(stage/'mods-implementation.patch'),'cumulative_patch_sha256':digest(stage/'cumulative-implementation.patch'),'cumulative_apply_check_exit':apply_check.returncode,'tracked_files_checked':len(manifest),'mismatches':mismatches,'app_lockfile_sha256':lock_hash,'app_lockfile_unchanged':True,'source_preservation':source_proof,'artifact_count':len(artifacts),'component_checks':119,'packaged_checks_per_artifact':40,'gate':'Stage 3D implemented and validated; awaiting user acceptance'}
(stage/'mods-implementation.json').write_text(json.dumps(metadata,indent=2)+'\n')
(evidence/'mods-baseline-check.json').write_text(json.dumps(metadata,indent=2)+'\n')

register_path=stage/'mods-source-register.json'
register=json.loads(register_path.read_text())
register['status']='implemented_awaiting_acceptance'
register['after_sources']={'src/screens/Mods.jsx':{'sha256':digest(new_path)},'src/components/PreviewModsLayout.jsx':{'sha256':digest(layout)}}
register['validation']={'component_checks':'119/119','stable_exact_markup_comparisons':'9/9','debian_native_checks':'40/40','appimage_native_checks':'40/40','tracked_baseline':'850/850','lockfile_unchanged':True,'stage3e_started':False}
register_path.write_text(json.dumps(register,indent=2)+'\n')

mastery_index=evidence/'mastery-release-artifacts.json'
mastery=json.loads(mastery_index.read_text())
preserved=work/'before-stage3d-packages'
for row in mastery:
    copy=preserved/Path(row['path']).name
    assert copy.exists() and digest(copy)==row['sha256'] and copy.stat().st_size==row['bytes']
    row['path_at_validation']=row.pop('path')
    row['preserved_copy']=str(copy)
    row['current_file_available_at_original_path']=False
mastery_index.write_text(json.dumps(mastery,indent=2)+'\n')

runner_files=['component.py','deb-smoke.py','appimage-smoke.py','frontend.py','native-build.py','bundle.py','augment-smoke.py','source_preservation.py','run-package.sh','mods-native-block.txt']
runner_dir=evidence/'runners'
runner_dir.mkdir(parents=True,exist_ok=True)
for name in runner_files:
    shutil.copy2(work/name,runner_dir/('mods-'+name))

print(json.dumps({'component':'119/119','stable_markup':'9/9','packages':[(row['kind'],'40/40') for row in packages],'artifacts':artifacts,'baseline':{'checked':len(manifest),'mismatches':mismatches},'lockfile_unchanged':True,'apply_check':apply_check.returncode},indent=2))
