from pathlib import Path
import hashlib,json,shutil,datetime,os
os.nice(19)
r=Path('/var/home/jedwards/kiedas-orbiter');d=r/'docs/revamp/stage-2';e=d/'evidence';b=r/'.preview-work/ubuntu-build';s=r/'.preview-work/stage2';stable=r/'.preview-work/stable-baseline'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def stable_branch(p):return p.read_text().split('pub fn get_data_root() -> PathBuf {',1)[1].split('\n}',1)[0].split('    if cfg!(debug_assertions)',1)[1]
m=json.loads((r/'docs/revamp/stage-1/baseline-files.json').read_text())
record={'timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'tracked_files_checked':len(m),'mismatches':[x['path'] for x in m if digest(r/x['path'])!=x['sha256']],'stable_baseline_mismatches':[x['path'] for x in m if digest(stable/x['path'])!=x['sha256']],'stable_root_branch_unchanged':stable_branch(s/'src-tauri/src/main.rs')==stable_branch(stable/'src-tauri/src/main.rs'),'app_lockfile_unchanged':digest(s/'src-tauri/Cargo.lock')=='e8508bffd0423001766a5e3fe2fe81a814d79795b7cfb13189fc3dfc2a2e31c1','stable_lockfile_unchanged':digest(stable/'src-tauri/Cargo.lock')==digest(s/'src-tauri/Cargo.lock'),'preview_artifacts_unchanged':all(digest(Path(x['path']))==x['sha256'] for x in json.loads((e/'release-artifacts.json').read_text())),'stable_probe_binary_sha256':digest(b/'stable-target/debug/kiedas-orbiter'),'preserved_stable_debug_binary_sha256':digest(b/'before-stable-migration-probe/kiedas-orbiter')}
assert not record['mismatches'] and not record['stable_baseline_mismatches']
assert all(record[k] for k in ['stable_root_branch_unchanged','app_lockfile_unchanged','stable_lockfile_unchanged','preview_artifacts_unchanged'])
(e/'path-isolation-baseline-check.json').write_text(json.dumps(record,indent=2)+'\n')
for name in ['missing-data-root.c','missing-data-root.py','stable-migration-probe-build.py','stable-migration-native.py','path-isolation-summary.py']:shutil.copy2(b/name,e/'ubuntu-build'/name)
print(json.dumps(record,indent=2))
