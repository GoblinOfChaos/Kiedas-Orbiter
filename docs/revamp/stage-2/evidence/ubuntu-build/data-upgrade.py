import os, pathlib, subprocess, time, socket, fcntl, struct, json, urllib.request, urllib.error, hashlib, shutil, signal
base=pathlib.Path('/var/home/jedwards/kiedas-orbiter/.preview-work'); evidence=base.parent/'docs/revamp/stage-2/evidence'
os.sched_setaffinity(0, sorted(os.sched_getaffinity(0))[:4]); os.nice(19)
# The caller creates a PRIVATE network namespace. Enable its loopback only.
# Podman --network=none supplies an isolated loopback interface.
import tempfile
scratch=pathlib.Path(tempfile.mkdtemp(prefix='native-smoke-',dir=base))
for name in ['runtime','xdgdata','config','cache','legacy/data/user']:(scratch/name).mkdir(parents=True,exist_ok=True)
(scratch/'runtime').chmod(0o700)
legacy=scratch/'legacy/data/user';sentinel=b'{"wfm_token":"SYNTHETIC-DO-NOT-IMPORT","autoStartMonitoring":true}'
(legacy/'settings.json').write_bytes(sentinel);(legacy/'sentinel.txt').write_text('synthetic legacy marker')
package=base/"ubuntu-build/before-recovery-packages/Kieda's Orbiter Preview_1.3.3_amd64.deb"
new_package=base/"ubuntu-build/target/release/bundle/deb/Kieda's Orbiter Preview_1.3.3_amd64.deb"
for candidate in [package,new_package]:
 assert subprocess.check_output(['dpkg-deb','-f',str(candidate),'Package'],text=True).strip()=='kieda-s-orbiter-preview'

with open(evidence/'data-upgrade-equipped-install.log','w') as log:
 subprocess.run(['dpkg','-i',str(package)],stdout=log,stderr=subprocess.STDOUT,check=True)
binary=pathlib.Path('/usr/bin/kiedas-orbiter-preview')
# Copy executable beside synthetic legacy data so legacy discovery tests a real executable parent.
app=binary
lib=pathlib.Path('/usr/lib/x86_64-linux-gnu'); bins=pathlib.Path('/usr/bin')
env=os.environ.copy();env.update(XDG_DATA_HOME=str(scratch/'xdgdata'),XDG_CONFIG_HOME=str(scratch/'config'),XDG_CACHE_HOME=str(scratch/'cache'),XDG_RUNTIME_DIR=str(scratch/'runtime'),LD_LIBRARY_PATH=str(lib),PATH=str(bins)+':'+env.get('PATH',''),XKB_BINDIR=str(bins),TAURI_WEBVIEW_AUTOMATION='true',WEBKIT_DISABLE_DMABUF_RENDERER='1',LIBGL_ALWAYS_SOFTWARE='1',LP_NUM_THREADS='2',OMP_NUM_THREADS='2',DBUS_SYSTEM_BUS_ADDRESS='unix:path='+str(scratch/'no-system-bus'))
env.pop('DBUS_SESSION_BUS_ADDRESS',None);env.pop('WAYLAND_DISPLAY',None)
processes=[]; process_groups=set(); logs=[];results={'binary_sha256':hashlib.sha256(binary.read_bytes()).hexdigest(),'private_container_network':True,'installed_package':str(package),'legacy_adjacency_test':False,'synthetic_profile':str(scratch),'checks':[]}
def start(args,name,**kwargs):
 log=open(evidence/name,'w');logs.append(log);p=subprocess.Popen(args,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True,**kwargs);processes.append(p);process_groups.add(p.pid);return p
def api(method,path,data=None):
 req=urllib.request.Request('http://127.0.0.1:17777'+path,data=None if data is None else json.dumps(data).encode(),method=method,headers={'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=45) as response:return json.load(response)
 except urllib.error.HTTPError as e:raise RuntimeError(e.read().decode())
try:
 display=1907
 if pathlib.Path('/tmp/.X1907-lock').exists():raise RuntimeError('Test display lock already exists; refusing to reuse it')
 env['DISPLAY']='127.0.0.1:'+str(display)
 xvfb=start([str(bins/'Xvfb'),':'+str(display),'-screen','0','1200x800x24','-nolisten','unix','-listen','tcp','-ac'], 'data-upgrade-packaged-xvfb.log')
 time.sleep(2)
 if xvfb.poll() is not None:raise RuntimeError('Headless display failed; see data-upgrade-packaged-xvfb.log')
 conf=scratch/'dbus.conf';conf.write_text('<busconfig><type>session</type><listen>unix:tmpdir='+str(scratch/'runtime')+'</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/></policy></busconfig>')
 bus=subprocess.Popen([str(bins/'dbus-daemon'),'--nofork','--print-address=1','--config-file='+str(conf)],env=env,stdout=subprocess.PIPE,stderr=open(evidence/'data-upgrade-packaged-dbus.log','w'),text=True);processes.append(bus)
 import select
 if not select.select([bus.stdout],[],[],5)[0]:raise RuntimeError('Private D-Bus did not start')
 env['DBUS_SESSION_BUS_ADDRESS']=bus.stdout.readline().strip()
 driver=start([str(bins/'WebKitWebDriver'),'--port=17777'],'data-upgrade-packaged-webdriver.log')
 time.sleep(1)
 response=api('POST','/session',{'capabilities':{'alwaysMatch':{'webkitgtk:browserOptions':{'binary':str(app)}}}})
 results['session_response']=response
 session=response['value']['sessionId']; prefix='/session/'+session
 time.sleep(7)
 results['url']=api('GET',prefix+'/url')
 results['title']=api('GET',prefix+'/title')
 results['body']=api('POST',prefix+'/execute/sync',{'script':'return document.body.innerText','args':[]})
 results['checks'].append({'name':'legacy_source_unchanged','pass':(legacy/'settings.json').read_bytes()==sentinel})
 preview=scratch/'xdgdata/kiedas-orbiter-preview/data/user'
 results['preview_files']=[str(p.relative_to(scratch)) for p in (scratch/'xdgdata').rglob('*') if p.is_file()][:100]
 results['checks'].append({'name':'legacy_sentinel_not_imported','pass':not (preview/'sentinel.txt').exists()})
 results['checks'].append({'name':'stable_os_profile_not_created','pass':not (scratch/'xdgdata/kiedas-orbiter').exists()})
 settings=json.loads((preview/'settings.json').read_text())
 results['checks'].append({'name':'legacy_credentials_not_imported','pass':'SYNTHETIC-DO-NOT-IMPORT' not in json.dumps(settings)})
 results['checks'].append({'name':'legacy_auto_monitoring_not_imported','pass':settings.get('autoStartMonitoring') is not True})
 results['checks'].append({'name':'preview_document_title','pass':results['title']['value']=="Kieda's Orbiter Preview"})
 api('POST',prefix+'/refresh',{})
 time.sleep(3)
 results['checks'].append({'name':'preview_title_after_reload','pass':api('GET',prefix+'/title')['value']=="Kieda's Orbiter Preview"})
 results['checks'].append({'name':'preview_navigation_after_reload','pass':api('POST',prefix+'/execute/sync',{'script':"return !!document.querySelector('nav[aria-label=\"Main navigation\"]')",'args':[]})['value'] is True})
 relative='data/assets/data/acquisition_overrides.json'
 response=api('POST',prefix+'/execute/async',{'script':"const done=arguments[arguments.length-1];window.__TAURI_INTERNALS__.invoke('read_file_bytes',{relative:arguments[0]}).then(v=>done({resolved:true,value:v})).catch(e=>done({resolved:false,error:String(e)}));",'args':[relative]})['value']
 resource=pathlib.Path("/usr/lib/Kieda's Orbiter Preview")/relative
 results['packaged_resource_check']={'resolved':response.get('resolved'),'matches_installed_bytes':response.get('resolved') is True and bytes(response['value'])==resource.read_bytes(),'profile_copy_absent':not (preview.parent.parent/relative).exists()}
 cached=preview.parent.parent/relative
 saved=cached.with_suffix(cached.suffix+'.test-backup')
 if cached.exists():cached.rename(saved)
 try:
  fallback=api('POST',prefix+'/execute/async',{'script':"const done=arguments[arguments.length-1];window.__TAURI_INTERNALS__.invoke('read_file_bytes',{relative:arguments[0]}).then(v=>done({resolved:true,value:v})).catch(e=>done({resolved:false,error:String(e)}));",'args':[relative]})['value']
  results['bundle_fallback_check']={'profile_copy_absent':not cached.exists(),'resolved':fallback.get('resolved'),'matches_installed_bytes':fallback.get('resolved') is True and bytes(fallback['value'])==resource.read_bytes()}
 finally:
  if saved.exists():saved.rename(cached)

 def ipc(command,args):
  return api('POST',prefix+'/execute/async',{'script':"const done=arguments[arguments.length-1];window.__TAURI_INTERNALS__.invoke(arguments[0],arguments[1]).then(value=>done({ok:true,value})).catch(error=>done({ok:false,error:String(error)}))",'args':[command,args]})['value']
 def app_pids():
  matches=[]
  for proc in pathlib.Path('/proc').iterdir():
   if not proc.name.isdigit():continue
   try:
    if os.readlink(proc/'exe')==str(binary) and ('XDG_DATA_HOME='+str(scratch/'xdgdata')).encode() in (proc/'environ').read_bytes().split(b'\0'):matches.append(int(proc.name))
   except (OSError,PermissionError):pass
  return matches
 def stop_session():
  before=app_pids();assert len(before)==1, before
  api('DELETE',prefix)
  if before[0] in app_pids():os.kill(before[0],signal.SIGTERM)
  for _ in range(50):
   if before[0] not in app_pids():break
   time.sleep(.1)
  if before[0] in app_pids():os.kill(before[0],signal.SIGKILL);time.sleep(.2)
  assert before[0] not in app_pids()
  return before[0]
 (preview/'notes').mkdir(exist_ok=True);(preview/'notes/upgrade.md').write_text('Original before old import')
 source=scratch/'old-source';(source/'notes').mkdir(parents=True);(source/'notes/upgrade.md').write_text('Imported by old package')
 old_result=ipc('import_preview_profile',{'source':str(source),'categories':['notes'],'replace':True});assert old_result.get('ok'),old_result
 old_backups=list(preview.glob('preview-import-backup-*'));assert len(old_backups)==1
 old_backup=old_backups[0]
 results['old_import_result']=old_result
 results['old_package']={'path':str(package),'sha256':hashlib.sha256(package.read_bytes()).hexdigest(),'version':subprocess.check_output(['dpkg-deb','-f',str(package),'Version'],text=True).strip(),'installed_binary_sha256':hashlib.sha256(binary.read_bytes()).hexdigest()}
 results['upgrade_checks']=[{'name':'old_import_has_no_journal','pass':not (old_backup/'journal.json').exists()}]
 old_pid=stop_session();results['old_process_pid']=old_pid
 preserved={str(p.relative_to(preview)):hashlib.sha256(p.read_bytes()).hexdigest() for p in old_backup.rglob('*') if p.is_file()}
 with open(evidence/'data-upgrade-install-new.log','w') as log:subprocess.run(['dpkg','-i',str(new_package)],stdout=log,stderr=subprocess.STDOUT,check=True)
 results['new_package']={'path':str(new_package),'sha256':hashlib.sha256(new_package.read_bytes()).hexdigest(),'version':subprocess.check_output(['dpkg-deb','-f',str(new_package),'Version'],text=True).strip(),'installed_binary_sha256':hashlib.sha256(binary.read_bytes()).hexdigest()}
 response=api('POST','/session',{'capabilities':{'alwaysMatch':{'webkitgtk:browserOptions':{'binary':str(app)}}}});prefix='/session/'+response['value']['sessionId'];time.sleep(7)
 results['new_process_pids']=app_pids()
 def check(name,value):results['upgrade_checks'].append({'name':name,'pass':bool(value)})
 check('different_app_payload',results['new_package']['installed_binary_sha256']!=results['old_package']['installed_binary_sha256'])
 check('new_native_process',len(results['new_process_pids'])==1 and old_pid not in results['new_process_pids'])
 check('upgraded_preview_launches',api('GET',prefix+'/title')['value']=="Kieda's Orbiter Preview")
 check('old_import_content_retained',(preview/'notes/upgrade.md').read_text()=='Imported by old package')
 check('old_backup_bytes_unchanged',all((preview/rel).exists() and hashlib.sha256((preview/rel).read_bytes()).hexdigest()==sha for rel,sha in preserved.items()))
 check('old_backup_not_rewritten_as_journal',not (old_backup/'journal.json').exists())
 second=scratch/'new-source';(second/'notes').mkdir(parents=True);(second/'notes/upgrade.md').write_text('Imported by upgraded package')
 result=ipc('import_preview_profile',{'source':str(second),'categories':['notes'],'replace':True});results['new_import_result']=result;check('new_import_succeeds',result.get('ok'))
 journals=list(preview.glob('preview-import-backup-*/journal.json'));check('new_import_writes_version_one_journal',len(journals)==1 and json.loads(journals[0].read_text())['version']==1)
 check('new_import_committed',len(journals)==1 and (journals[0].parent/'committed').read_text()=='1\n')
 check('pre_upgrade_content_backed_up',len(journals)==1 and (journals[0].parent/'notes/upgrade.md').read_text()=='Imported by old package')
 results['new_process_before_restart']=stop_session()
 response=api('POST','/session',{'capabilities':{'alwaysMatch':{'webkitgtk:browserOptions':{'binary':str(app)}}}});prefix='/session/'+response['value']['sessionId'];time.sleep(7)
 check('committed_import_survives_restart',(preview/'notes/upgrade.md').read_text()=='Imported by upgraded package')
 check('old_source_unchanged',(source/'notes/upgrade.md').read_text()=='Imported by old package')
 check('new_source_unchanged',(second/'notes/upgrade.md').read_text()=='Imported by upgraded package')
 api('DELETE',prefix)
except Exception as e:results['error']=str(e)
finally:
 for p in reversed(processes):
  if p.poll() is None:
   os.killpg(p.pid, signal.SIGTERM) if p.pid in process_groups else p.terminate()
   try:p.wait(timeout=8)
   except subprocess.TimeoutExpired:p.kill();p.wait()
 for f in logs:f.close()
 with open(evidence/'data-upgrade-equipped-remove.log','w') as log:
  removed=subprocess.run(['dpkg','--remove','kieda-s-orbiter-preview'],stdout=log,stderr=subprocess.STDOUT)
 results['removal']={'exit':removed.returncode,'executable_absent':not binary.exists(),'synthetic_profile_retained':(scratch/'xdgdata/kiedas-orbiter-preview').exists()}
 (evidence/'data-upgrade-packaged-smoke.json').write_text(json.dumps(results,indent=2)+'\n')
 print(json.dumps(results,indent=2))
