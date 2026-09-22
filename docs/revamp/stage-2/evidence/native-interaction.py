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
 xvfb=start([str(bins/'Xvfb'),':'+str(display),'-screen','0','1200x800x24','-nolisten','unix','-listen','tcp','-ac'], 'interaction-xvfb.log')
 time.sleep(2)
 if xvfb.poll() is not None:raise RuntimeError('Headless display failed; see native-xvfb.log')
 conf=scratch/'dbus.conf';conf.write_text('<busconfig><type>session</type><listen>unix:tmpdir='+str(scratch/'runtime')+'</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/></policy></busconfig>')
 bus=subprocess.Popen([str(bins/'dbus-daemon'),'--nofork','--print-address=1','--config-file='+str(conf)],env=env,stdout=subprocess.PIPE,stderr=open(evidence/'interaction-dbus.log','w'),text=True);processes.append(bus)
 import select
 if not select.select([bus.stdout],[],[],5)[0]:raise RuntimeError('Private D-Bus did not start')
 env['DBUS_SESSION_BUS_ADDRESS']=bus.stdout.readline().strip()
 driver=start([str(bins/'WebKitWebDriver'),'--port=17777'],'interaction-webdriver.log')
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
 def js(script,args=[]):
  return api('POST',prefix+'/execute/sync',{'script':script,'args':args})['value']
 results['guard_checks']=[]
 for command,args in [('start_log_scanner',{}),('set_hotkeys',{'hotkeys':[]}),('show_overlay_window',{'label':'notification'}),('show_notification',{'title':'Synthetic test','message':'Private test'}),('download_appimage_update',{'url':'http://127.0.0.1:1/synthetic'})]:
  value=api('POST',prefix+'/execute/async',{'script':"const done=arguments[arguments.length-1]; window.__TAURI_INTERNALS__.invoke(arguments[0],arguments[1]).then(v=>done({resolved:true,value:v})).catch(e=>done({resolved:false,error:String(e)}));",'args':[command,args]})['value']
  results['guard_checks'].append({'command':command,'result':value,'pass':value.get('resolved') is False and 'disabled' in value.get('error','')})
 js("const label=[...document.querySelectorAll('label')].find(x=>x.innerText.includes('I understand')); if(label) label.querySelector('div').click();")
 time.sleep(.3)
 js("const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='CONTINUE'); if(b) b.click();")
 time.sleep(2)
 results['onboarding_dismissed']=js("return !document.body.innerText.includes('WELCOME TO KIEDA')")
 labels=js("return [...document.querySelectorAll('nav [id^=preview-group-] button:not([aria-label])')].map(x=>x.innerText.trim())")
 results['routes']=[]
 for label in labels:
  js("const b=[...document.querySelectorAll('nav [id^=preview-group-] button:not([aria-label])')].find(x=>x.innerText.trim()===arguments[0]); b.click();",[label])
  time.sleep(.3)
  active=js("return [...document.querySelectorAll('nav button[aria-current=page]')].map(x=>x.innerText.trim())")
  results['routes'].append({'label':label,'active':active,'pass':label in active})
 results['route_count']=len(labels)
 js("document.querySelector('button[aria-label=\"Pin Inventory\"]').click()")
 js("document.querySelector('button[aria-controls=preview-group-2]').click()")
 saved=js("return localStorage.getItem('preview.navigation.v1')")
 api('DELETE',prefix)
 response=api('POST','/session',{'capabilities':{'alwaysMatch':{'webkitgtk:browserOptions':{'binary':str(app)}}}})
 prefix='/session/'+response['value']['sessionId']
 time.sleep(7)
 results['restart_checks']={
  'new_session':response['value']['sessionId']!=session,
  'title':api('GET',prefix+'/title')['value']=="Kieda's Orbiter Preview",
  'onboarding_stays_dismissed':js("return !document.body.innerText.includes('WELCOME TO KIEDA')"),
  'navigation_storage_preserved':js("return localStorage.getItem('preview.navigation.v1')")==saved,
  'favorite_rendered':js("return !!document.querySelector('section[aria-label=Favorites]')"),
  'planning_collapsed':js("return document.querySelector('button[aria-controls=preview-group-2]').getAttribute('aria-expanded')==='false'")}
 api('DELETE',prefix)
except Exception as e:results['error']=str(e)
finally:
 for p in reversed(processes):
  if p.poll() is None:
   os.killpg(p.pid, signal.SIGTERM) if p.pid in process_groups else p.terminate()
   try:p.wait(timeout=8)
   except subprocess.TimeoutExpired:p.kill();p.wait()
 for f in logs:f.close()
 (evidence/'native-interaction.json').write_text(json.dumps(results,indent=2)+'\n')
 print(json.dumps(results,indent=2))
