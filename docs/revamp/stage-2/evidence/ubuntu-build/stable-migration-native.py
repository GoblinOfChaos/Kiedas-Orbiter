import os,pathlib,subprocess,tempfile,shutil,hashlib,json,datetime
r=pathlib.Path('/var/home/jedwards/kiedas-orbiter');b=r/'.preview-work/ubuntu-build';e=r/'docs/revamp/stage-2/evidence'
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
scratch=pathlib.Path(tempfile.mkdtemp(prefix='stable-migration-',dir=r/'.preview-work'))
source=b/'stable-target/debug/kiedas-orbiter'
def hashes(folder):return {str(p.relative_to(folder)):hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.rglob('*') if p.is_file()}
results={'timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'binary_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'build_kind':'stable baseline dev profile, main crate compiled with -C debug-assertions=no to exercise release-only root branch','historical_release_reconstruction':False,'normal_gui_launch':False,'cases':[]}
for mode in ['absent','missing-settings','existing-settings']:
 work=scratch/mode;legacy=work/'legacy/data/user';legacy.mkdir(parents=True);app=work/'legacy/kiedas-orbiter';shutil.copy2(source,app)
 legacy_settings='{"synthetic_migration":"legacy","autoStartMonitoring":false}';(legacy/'settings.json').write_text(legacy_settings);(legacy/'sentinel.txt').write_text('legacy note')
 xdg=work/'xdgdata';stable=xdg/'kiedas-orbiter/data/user';preview=xdg/'kiedas-orbiter-preview/data/user';preview.mkdir(parents=True);(preview/'settings.json').write_text('{"synthetic_preview":true}')
 if mode!='absent':stable.mkdir(parents=True)
 existing='{"synthetic_existing":"keep","autoStartMonitoring":false}'
 if mode=='existing-settings':(stable/'settings.json').write_text(existing)
 before={'legacy':hashes(legacy),'preview':hashes(preview)}
 env=os.environ.copy();env.update(XDG_DATA_HOME=str(xdg),XDG_CONFIG_HOME=str(work/'config'),XDG_CACHE_HOME=str(work/'cache'),XDG_RUNTIME_DIR=str(work/'runtime'),DISPLAY='127.0.0.1:1999',DBUS_SESSION_BUS_ADDRESS='unix:path='+str(work/'no-bus'),DBUS_SYSTEM_BUS_ADDRESS='unix:path='+str(work/'no-system-bus'),RUST_BACKTRACE='0');env.pop('WAYLAND_DISPLAY',None);env.pop('APPIMAGE',None)
 log=e/('stable-migration-'+mode+'.log')
 with log.open('w') as f:p=subprocess.run([str(app)],cwd=work,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=30)
 text=log.read_text();want_migration=mode!='existing-settings'
 checks={'settings_copied_or_preserved':(stable/'settings.json').read_text()==(legacy_settings if want_migration else existing),'sentinel_copied_only_when_missing_settings':(stable/'sentinel.txt').exists()==want_migration,'copied_sentinel_content':not want_migration or (stable/'sentinel.txt').read_text()=='legacy note','migration_log_matches_condition':('[data migration] Migrated existing data' in text)==want_migration,'legacy_source_unchanged':hashes(legacy)==before['legacy'],'preview_profile_unchanged':hashes(preview)==before['preview']}
 results['cases'].append({'mode':mode,'process_exit':p.returncode,'before':before,'stable_after':hashes(stable),'checks':checks})
(e/'stable-migration-native.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results,indent=2));assert all(v for case in results['cases'] for v in case['checks'].values())
