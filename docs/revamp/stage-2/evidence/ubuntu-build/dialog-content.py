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
package=next((base/'ubuntu-build/target/debug/bundle/deb').glob('*.deb'))
with open(evidence/'dialog-content-equipped-install.log','w') as log:
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
 xvfb=start([str(bins/'Xvfb'),':'+str(display),'-screen','0','1200x800x24','-nolisten','unix','-listen','tcp','-ac'], 'dialog-content-packaged-xvfb.log')
 time.sleep(2)
 if xvfb.poll() is not None:raise RuntimeError('Headless display failed; see dialog-content-packaged-xvfb.log')
 conf=scratch/'dbus.conf';conf.write_text('<busconfig><type>session</type><listen>unix:tmpdir='+str(scratch/'runtime')+'</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/></policy></busconfig>')
 bus=subprocess.Popen([str(bins/'dbus-daemon'),'--nofork','--print-address=1','--config-file='+str(conf)],env=env,stdout=subprocess.PIPE,stderr=open(evidence/'dialog-content-packaged-dbus.log','w'),text=True);processes.append(bus)
 import select
 if not select.select([bus.stdout],[],[],5)[0]:raise RuntimeError('Private D-Bus did not start')
 env['DBUS_SESSION_BUS_ADDRESS']=bus.stdout.readline().strip()
 driver=start([str(bins/'WebKitWebDriver'),'--port=17777'],'dialog-content-packaged-webdriver.log')
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
 def js(script,args=[]):return api('POST',prefix+'/execute/sync',{'script':script,'args':args})['value']
 js("const label=[...document.querySelectorAll('label')].find(x=>x.innerText.includes('I understand'));if(label)label.querySelector('div').click();")
 time.sleep(.3)
 js("const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='CONTINUE');if(b)b.click();")
 time.sleep(1)
 def click_text(text):
  xpath="//button[normalize-space(.)='"+text+"']"
  element=api('POST',prefix+'/element',{'using':'xpath','value':xpath})['value']['element-6066-11e4-a52e-4f735466cecf'];api('POST',prefix+'/element/'+element+'/click',{})
 source=scratch/'explicit-user-profile-copy/data/user';(source/'notes').mkdir(parents=True)
 (source/'notes/synthetic.md').write_text('Synthetic import dialog note')
 results['folder_picker_stub']=True
 js("const original=window.__TAURI_INTERNALS__.invoke;const source=arguments[0];window.__TAURI_INTERNALS__.invoke=function(command,args,...rest){if(command==='plugin:dialog|open'){window.__TAURI_INTERNALS__.invoke=original;return Promise.resolve(source);}return original.call(this,command,args,...rest);};",[str(source)])
 api('POST',prefix+'/window/rect',{'width':1200,'height':800});time.sleep(.3)
 click_text('Import a profile copy');time.sleep(.3);click_text('Choose source folder');time.sleep(.3)
 # Preserve real checkbox handlers: import only the synthetic note category.
 for category in ['inventory','maps']:
  element=api('POST',prefix+'/element',{'using':'xpath','value':"//section[@role='dialog']//label[normalize-space(.)='"+category+"']/input"})['value']['element-6066-11e4-a52e-4f735466cecf'];api('POST',prefix+'/element/'+element+'/click',{})
 results['dialog_states']=[]
 def measure(stage):
  state=js("const d=document.querySelector('[role=dialog]'),r=d.getBoundingClientRect();return {viewport:[innerWidth,innerHeight],top:r.top,bottom:r.bottom,height:r.height,text:d.innerText,controls:[...d.querySelectorAll('button')].map(e=>{const r=e.getBoundingClientRect();return {label:e.innerText,top:r.top,bottom:r.bottom,disabled:e.matches(':disabled')}}),overflow:getComputedStyle(d.parentElement).overflowY}")
  results['dialog_states'].append({'stage':stage,'state':state,'fully_within_viewport':state['top']>=0 and state['bottom']<=state['viewport'][1]})
 measure('source_selected_normal')
 click_text('Import selected');time.sleep(1)
 results['real_note_imported']=(preview/'notes/synthetic.md').read_text()=='Synthetic import dialog note'
 results['source_unchanged']=(source/'notes/synthetic.md').read_text()=='Synthetic import dialog note'
 measure('import_result_normal')
 api('POST',prefix+'/window/rect',{'width':900,'height':500});time.sleep(.3)
 measure('import_result_minimum')
 api('DELETE',prefix)
except Exception as e:results['error']=str(e)
finally:
 for p in reversed(processes):
  if p.poll() is None:
   os.killpg(p.pid, signal.SIGTERM) if p.pid in process_groups else p.terminate()
   try:p.wait(timeout=8)
   except subprocess.TimeoutExpired:p.kill();p.wait()
 for f in logs:f.close()
 with open(evidence/'dialog-content-equipped-remove.log','w') as log:
  removed=subprocess.run(['dpkg','--remove','kieda-s-orbiter-preview'],stdout=log,stderr=subprocess.STDOUT)
 results['removal']={'exit':removed.returncode,'executable_absent':not binary.exists(),'synthetic_profile_retained':(scratch/'xdgdata/kiedas-orbiter-preview').exists()}
 (evidence/'dialog-content-packaged-smoke.json').write_text(json.dumps(results,indent=2)+'\n')
 print(json.dumps(results,indent=2))
