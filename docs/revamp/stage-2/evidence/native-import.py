import os, pathlib, subprocess, time, socket, fcntl, struct, json, urllib.request, urllib.error, hashlib, shutil, signal
base=pathlib.Path('/var/home/jedwards/kiedas-orbiter/.preview-work'); evidence=base.parent/'docs/revamp/stage-2/evidence'
os.sched_setaffinity(0, sorted(os.sched_getaffinity(0))[:4]); os.nice(19)
# The caller creates a PRIVATE network namespace. Enable its loopback only.
s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);fcntl.ioctl(s,0x8914,struct.pack('16sH14s',b'lo',0x49,b''));s.close()
import tempfile
scratch=pathlib.Path(tempfile.mkdtemp(prefix='native-smoke-',dir=base))
for name in ['runtime','xdgdata','config','cache','legacy/data/user']:(scratch/name).mkdir(parents=True,exist_ok=True)
(scratch/'runtime').chmod(0o700)
legacy=scratch/'legacy/data/user';sentinel=b'{"wfm_token":"SYNTHETIC-DO-NOT-IMPORT","autoStartMonitoring":true}'
(legacy/'settings.json').write_bytes(sentinel);(legacy/'sentinel.txt').write_text('synthetic legacy marker')
binary=base/'stage2/src-tauri/target/debug/kiedas-orbiter'
# Copy executable beside synthetic legacy data so legacy discovery tests a real executable parent.
app=scratch/'legacy/kiedas-orbiter-preview';shutil.copy2(binary,app)
lib=base/'headless-root/usr/lib64'; bins=base/'headless-root/usr/bin'
env=os.environ.copy();env.update(XDG_DATA_HOME=str(scratch/'xdgdata'),XDG_CONFIG_HOME=str(scratch/'config'),XDG_CACHE_HOME=str(scratch/'cache'),XDG_RUNTIME_DIR=str(scratch/'runtime'),LD_LIBRARY_PATH=str(lib),PATH=str(bins)+':'+env.get('PATH',''),XKB_BINDIR=str(bins),TAURI_WEBVIEW_AUTOMATION='true',WEBKIT_DISABLE_DMABUF_RENDERER='1',LIBGL_ALWAYS_SOFTWARE='1',LP_NUM_THREADS='2',OMP_NUM_THREADS='2',DBUS_SYSTEM_BUS_ADDRESS='unix:path='+str(scratch/'no-system-bus'))
env.pop('DBUS_SESSION_BUS_ADDRESS',None);env.pop('WAYLAND_DISPLAY',None)
processes=[]; process_groups=set(); logs=[];results={'binary_sha256':hashlib.sha256(binary.read_bytes()).hexdigest(),'private_network_namespace':True,'synthetic_profile':str(scratch),'checks':[]}
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
 xvfb=start([str(bins/'Xvfb'),':'+str(display),'-screen','0','1200x800x24','-nolisten','unix','-listen','tcp','-ac'], 'import-xvfb.log')
 time.sleep(2)
 if xvfb.poll() is not None:raise RuntimeError('Headless display failed; see native-xvfb.log')
 conf=scratch/'dbus.conf';conf.write_text('<busconfig><type>session</type><listen>unix:tmpdir='+str(scratch/'runtime')+'</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/></policy></busconfig>')
 bus=subprocess.Popen([str(bins/'dbus-daemon'),'--nofork','--print-address=1','--config-file='+str(conf)],env=env,stdout=subprocess.PIPE,stderr=open(evidence/'import-dbus.log','w'),text=True);processes.append(bus)
 import select
 if not select.select([bus.stdout],[],[],5)[0]:raise RuntimeError('Private D-Bus did not start')
 env['DBUS_SESSION_BUS_ADDRESS']=bus.stdout.readline().strip()
 driver=start([str(bins/'WebKitWebDriver'),'--port=17777'],'import-webdriver.log')
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
 def ipc(command,args):
  return api('POST',prefix+'/execute/async',{'script':"const done=arguments[arguments.length-1]; window.__TAURI_INTERNALS__.invoke(arguments[0],arguments[1]).then(v=>done({resolved:true,value:v})).catch(e=>done({resolved:false,error:String(e)}));",'args':[command,args]})['value']
 results['market_guards']=[]
 for command,args in [('post_market_order',{'token':'SYNTHETIC','itemId':'SYNTHETIC','platPrice':1,'quantity':1}),('delete_market_order',{'token':'SYNTHETIC','orderId':'SYNTHETIC'}),('update_market_order',{'token':'SYNTHETIC','orderId':'SYNTHETIC','platinum':1}),('close_market_order',{'token':'SYNTHETIC','orderId':'SYNTHETIC','quantity':1})]:
  value=ipc(command,args)
  results['market_guards'].append({'command':command,'result':value,'pass':value.get('resolved') is False and 'disabled' in value.get('error','')})
 source=scratch/'explicit-source';(source/'notes').mkdir(parents=True);(source/'map-configs').mkdir()
 note=source/'notes/synthetic.md'; note.write_text('Synthetic original note')
 (source/'map-configs/synthetic.json').write_text(json.dumps({'marker':'synthetic-map','nested':{'token':'SYNTHETIC-SECRET','safe':1}}))
 original={str(f.relative_to(source)):f.read_bytes() for f in source.rglob('*') if f.is_file()}
 def imp(categories,replace=False,folder=source):return ipc('import_preview_profile',{'source':str(folder),'categories':categories,'replace':replace})
 results['import_checks']=[]
 def check(name,ok,response=None):results['import_checks'].append({'name':name,'pass':bool(ok),'response':response})
 response=imp(['notes','maps'])
 check('explicit_import_succeeds',response.get('resolved'),response)
 check('note_content_copied',(preview/'notes/synthetic.md').read_text()=='Synthetic original note')
 check('nested_map_secret_scrubbed',json.loads((preview/'map-configs/synthetic.json').read_text())=={'marker':'synthetic-map','nested':{'safe':1}})
 check('import_source_unchanged',all((source/n).read_bytes()==v for n,v in original.items()))
 response=imp(['notes']);check('replacement_requires_opt_in',not response.get('resolved') and 'replacement' in response.get('error',''),response)
 note.write_text('Synthetic replacement note')
 response=imp(['notes'],True);check('explicit_replacement_succeeds',response.get('resolved'),response)
 check('replacement_content_applied',(preview/'notes/synthetic.md').read_text()=='Synthetic replacement note')
 check('original_note_backup_retained',any(f.read_text()=='Synthetic original note' for f in preview.glob('preview-import-backup-*/notes/synthetic.md')))
 note.write_text('Must not apply')
 (source/'map-configs/synthetic.json').write_text('{invalid')
 response=imp(['notes','maps'],True)
 check('malformed_batch_rejected_before_changes',not response.get('resolved') and (preview/'notes/synthetic.md').read_text()=='Synthetic replacement note',response)
 response=imp(['notes'],True,preview)
 check('overlapping_source_rejected',not response.get('resolved') and 'overlap' in response.get('error',''),response)
 (source/'notes/link.md').symlink_to(note)
 response=imp(['notes'],True)
 check('symlink_source_rejected',not response.get('resolved') and 'regular' in response.get('error',''),response)
 api('DELETE',prefix)
except Exception as e:results['error']=str(e)
finally:
 for p in reversed(processes):
  if p.poll() is None:
   os.killpg(p.pid, signal.SIGTERM) if p.pid in process_groups else p.terminate()
   try:p.wait(timeout=8)
   except subprocess.TimeoutExpired:p.kill();p.wait()
 for f in logs:f.close()
 (evidence/'native-import.json').write_text(json.dumps(results,indent=2)+'\n')
 print(json.dumps(results,indent=2))
