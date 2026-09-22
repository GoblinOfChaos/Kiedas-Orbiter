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
app=pathlib.Path('/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/MiniBrowser')
lib=pathlib.Path('/usr/lib/x86_64-linux-gnu'); bins=pathlib.Path('/usr/bin')
env=os.environ.copy();env.update(XDG_DATA_HOME=str(scratch/'xdgdata'),XDG_CONFIG_HOME=str(scratch/'config'),XDG_CACHE_HOME=str(scratch/'cache'),XDG_RUNTIME_DIR=str(scratch/'runtime'),LD_LIBRARY_PATH=str(lib),PATH=str(bins)+':'+env.get('PATH',''),XKB_BINDIR=str(bins),TAURI_WEBVIEW_AUTOMATION='true',WEBKIT_DISABLE_DMABUF_RENDERER='1',LIBGL_ALWAYS_SOFTWARE='1',LP_NUM_THREADS='2',OMP_NUM_THREADS='2',DBUS_SYSTEM_BUS_ADDRESS='unix:path='+str(scratch/'no-system-bus'))
env.pop('DBUS_SESSION_BUS_ADDRESS',None);env.pop('WAYLAND_DISPLAY',None)
processes=[]; process_groups=set(); logs=[];results={'tier':'component browser with module mocks','native_import_test':False,'checks':[],'states':[]}

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
 xvfb=start([str(bins/'Xvfb'),':'+str(display),'-screen','0','1200x800x24','-nolisten','unix','-listen','tcp','-ac'], 'component-dialog-xvfb.log')
 time.sleep(2)
 if xvfb.poll() is not None:raise RuntimeError('Headless display failed; see component-dialog-xvfb.log')
 conf=scratch/'dbus.conf';conf.write_text('<busconfig><type>session</type><listen>unix:tmpdir='+str(scratch/'runtime')+'</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/></policy></busconfig>')
 bus=subprocess.Popen([str(bins/'dbus-daemon'),'--nofork','--print-address=1','--config-file='+str(conf)],env=env,stdout=subprocess.PIPE,stderr=open(evidence/'component-dialog-dbus.log','w'),text=True);processes.append(bus)
 import select
 if not select.select([bus.stdout],[],[],5)[0]:raise RuntimeError('Private D-Bus did not start')
 env['DBUS_SESSION_BUS_ADDRESS']=bus.stdout.readline().strip()
 driver=start([str(bins/'WebKitWebDriver'),'--port=17777'],'component-dialog-webdriver.log')
 time.sleep(1)
 server=start(['/usr/bin/python3','-m','http.server','18777','--bind','127.0.0.1','--directory',str(base/'component-fixture/dist')],'component-dialog-http.log')
 time.sleep(1)
 response=api('POST','/session',{'capabilities':{'alwaysMatch':{'webkitgtk:browserOptions':{'binary':str(app),'args':['--automation']}}}})
 results['session_response']=response
 session=response['value']['sessionId']; prefix='/session/'+session

 def js(script,args=[]):return api('POST',prefix+'/execute/sync',{'script':script,'args':args})['value']
 def click(text):
  el=api('POST',prefix+'/element',{'using':'xpath','value':"//button[normalize-space(.)='"+text+"']"})['value']['element-6066-11e4-a52e-4f735466cecf']
  api('POST',prefix+'/element/'+el+'/click',{});time.sleep(.15)
 def check(name,value):results['checks'].append({'name':name,'pass':bool(value)})
 def state(name):
  value=js("const d=document.querySelector('[role=dialog]'),r=d.getBoundingClientRect();return {viewport:[innerWidth,innerHeight],rect:{top:r.top,bottom:r.bottom,height:r.height},text:d.innerText,controls:[...d.querySelectorAll('button,input')].map(e=>({label:e.innerText||e.parentElement.innerText,disabled:e.matches(':disabled'),checked:e.checked})),active:document.activeElement.innerText}")
  value['name']=name;value['within_viewport']=value['rect']['top']>=0 and value['rect']['bottom']<=value['viewport'][1];results['states'].append(value)
 def key(value):api('POST',prefix+'/actions',{'actions':[{'type':'key','id':'keyboard','actions':[{'type':'keyDown','value':value},{'type':'keyUp','value':value}]}]})
 for width,height in [(1200,800),(900,500)]:
  for mode in ['success','error']:
   api('POST',prefix+'/url',{'url':'http://127.0.0.1:18777/'});time.sleep(1)
   api('POST',prefix+'/window/rect',{'width':width,'height':height});time.sleep(.2)
   # MiniBrowser has browser chrome: size the CONTENT viewport to the requested dimensions.
   actual=js('return [innerWidth,innerHeight]');rect=api('GET',prefix+'/window/rect')['value']
   api('POST',prefix+'/window/rect',{'width':rect['width']+width-actual[0],'height':rect['height']+height-actual[1]});time.sleep(.2)
   tag=str(width)+'x'+str(height)+'-'+mode
   js("Object.assign(window.fixture,{path:arguments[0],mode:arguments[1],message:arguments[2]})",['/synthetic/profile backups/'+'long-folder-name/'*8+'data/user',mode,'Synthetic '+mode+': selected notes and maps were processed. This message is a test response, not a native importer result.'])
   click('Import a profile copy');state(tag+'-empty')
   check(tag+'-initial-focus',js("return document.activeElement.innerText==='Choose source folder'"))
   click('Choose source folder');state(tag+'-selected')
   check(tag+'-selected-path',js("return document.querySelector('[role=dialog]').innerText.includes(window.fixture.path)"))
   check(tag+'-import-enabled',js("return [...document.querySelectorAll('button')].find(e=>e.innerText==='Import selected').disabled===false"))
   js("document.querySelector('fieldset label:last-child input').click()")
   click('Import selected');state(tag+'-result')
   calls=js('return window.fixture.calls');results.setdefault('mock_calls',{})[tag]=calls
   check(tag+'-mock-arguments',calls[-1]=={'kind':'invoke','command':'import_preview_profile','args':{'source':'/synthetic/profile backups/'+'long-folder-name/'*8+'data/user','categories':['inventory','notes','maps'],'replace':True}})
   check(tag+'-message',js("return document.querySelector('[role=status]').innerText.includes(window.fixture.message)"))
   check(tag+'-controls-state',js("return document.querySelector('fieldset').disabled") == (mode=='success'))
   js("const b=[...document.querySelectorAll('[role=dialog] button:not(:disabled)')];b[b.length-1].focus()")
   key('\ue004');time.sleep(.1)
   check(tag+'-tab-wrap',js("return document.activeElement===document.querySelector('[role=dialog] button:not(:disabled)')"))
   key('\ue00c');time.sleep(.1)
   check(tag+'-escape-restores-focus',js("return !document.querySelector('[role=dialog]') && document.activeElement.innerText==='Import a profile copy'"))
 api('DELETE',prefix)
except Exception as e:results['error']=str(e)
finally:
 for p in reversed(processes):
  if p.poll() is None:
   os.killpg(p.pid,signal.SIGTERM) if p.pid in process_groups else p.terminate()
   try:p.wait(timeout=8)
   except subprocess.TimeoutExpired:p.kill();p.wait()
 for f in logs:f.close()
 (evidence/'component-dialog.json').write_text(json.dumps(results,indent=2)+'\n')
 print(json.dumps({'error':results.get('error'),'checks':results['checks'],'layout':[{'name':x['name'],'viewport':x['viewport'],'rect':x['rect'],'within_viewport':x['within_viewport']} for x in results['states']]},indent=2))
