import json,os,select,signal,subprocess,tempfile,time,urllib.error,urllib.request
from pathlib import Path
ROOT=Path('/var/home/jedwards/kiedas-orbiter');BASE=ROOT/'.preview-work';FIXTURE=BASE/'stage3-maps/fixture/dist';E=ROOT/'docs/revamp/stage-3/evidence';OUT=E/'maps-stable-matrix.json'
for p in (ROOT/'AGENTS.md',FIXTURE,E):
 if not p.exists():raise FileNotFoundError(p)
if OUT.exists():raise FileExistsError(OUT)
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19);scratch=Path(tempfile.mkdtemp(prefix='maps-stable-matrix-',dir=BASE))
for n in ('runtime','xdgdata','config','cache'):(scratch/n).mkdir()
(scratch/'runtime').chmod(0o700);env=os.environ.copy();env.update(XDG_DATA_HOME=str(scratch/'xdgdata'),XDG_CONFIG_HOME=str(scratch/'config'),XDG_CACHE_HOME=str(scratch/'cache'),XDG_RUNTIME_DIR=str(scratch/'runtime'),TAURI_WEBVIEW_AUTOMATION='true',WEBKIT_DISABLE_DMABUF_RENDERER='1',LIBGL_ALWAYS_SOFTWARE='1',LP_NUM_THREADS='2',OMP_NUM_THREADS='2');env.pop('DBUS_SESSION_BUS_ADDRESS',None);env.pop('WAYLAND_DISPLAY',None)
B=Path('/usr/bin');APP=Path('/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/MiniBrowser');processes=[];groups=set();logs=[];result={'tier':'stable before/after styled component state and interaction parity','comparisons':[],'interaction_parity':[]}
def start(args,name):
 log=(E/name).open('w');logs.append(log);p=subprocess.Popen(args,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True);processes.append(p);groups.add(p.pid);return p
def api(method,path,data=None):
 req=urllib.request.Request('http://127.0.0.1:17844'+path,data=None if data is None else json.dumps(data).encode(),method=method,headers={'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=45) as r:return json.load(r)
 except urllib.error.HTTPError as e:raise RuntimeError(e.read().decode())
try:
 env['DISPLAY']='127.0.0.1:1967';x=start([str(B/'Xvfb'),':1967','-screen','0','1200x800x24','-nolisten','unix','-listen','tcp','-ac'],'maps-stable-matrix-xvfb.log');time.sleep(2)
 if x.poll() is not None:raise RuntimeError('Xvfb failed')
 cfg=scratch/'dbus.conf';cfg.write_text('<busconfig><type>session</type><listen>unix:tmpdir='+str(scratch/'runtime')+'</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/></policy></busconfig>');bl=(E/'maps-stable-matrix-dbus.log').open('w');logs.append(bl);bus=subprocess.Popen([str(B/'dbus-daemon'),'--nofork','--print-address=1','--config-file='+str(cfg)],env=env,stdout=subprocess.PIPE,stderr=bl,text=True);processes.append(bus)
 if not select.select([bus.stdout],[],[],5)[0]:raise RuntimeError('D-Bus failed')
 env['DBUS_SESSION_BUS_ADDRESS']=bus.stdout.readline().strip();start([str(B/'WebKitWebDriver'),'--port=17844'],'maps-stable-matrix-webdriver.log');start([str(B/'python3'),'-m','http.server','18844','--bind','127.0.0.1','--directory',str(FIXTURE)],'maps-stable-matrix-http.log');time.sleep(1);r=api('POST','/session',{'capabilities':{'alwaysMatch':{'webkitgtk:browserOptions':{'binary':str(APP),'args':['--automation']}}}});session=r['value']['Links']['sessionId'] if 'Links' in r.get('value',{}) else r['value']['sessionId'];prefix='/session/'+session;api('POST',prefix+'/url',{'url':'http://127.0.0.1:18844/'});time.sleep(1)
 def js(s,a=None):return api('POST',prefix+'/execute/sync',{'script':s,'args':a or []})['value']
 def render(v,configured=True):js('window.fixture.render(arguments[0])',[{'variant':v,'configured':configured}]);time.sleep(.65)
 def markup():return js('return document.getElementById("root").innerHTML')
 def click_text(text):return js('const e=[...document.querySelectorAll("button")].find(x=>x.textContent.trim()===arguments[0]);e?.click();return !!e',[text])
 def click_title(title):return js('const e=document.querySelector(`[title="${arguments[0]}"]`);e?.click();return !!e',[title])
 def select_marker(marker_id='marker-1'):
  return js("const e=document.querySelector('[data-marker-id='+arguments[0]+']'),r=e.getBoundingClientRect();e.setPointerCapture=()=>{};e.releasePointerCapture=()=>{};e.dispatchEvent(new PointerEvent('pointerdown',{pointerId:19,button:0,clientX:r.left+r.width/2,clientY:r.top+r.height/2,bubbles:true}));e.dispatchEvent(new PointerEvent('pointerup',{pointerId:19,button:0,clientX:r.left+r.width/2,clientY:r.top+r.height/2,bubbles:true}));return true",[marker_id])
 def action(name):
  if name.startswith('tab-'):click_text(name[4:])
  elif name=='raw':click_title('Switch to raw terrain map')
  elif name=='panel':click_title('Configurations')
  elif name=='marker':select_marker()
  elif name=='new-modal':click_title('Configurations');time.sleep(.15);click_title('Add configuration')
  elif name=='delete-modal':click_title('Configurations');time.sleep(.15);js("document.querySelector('.lucide-trash')?.closest('button')?.click()")
  elif name=='context':js("const img=document.querySelector('img'),v=img.parentElement.parentElement,r=img.getBoundingClientRect();v.dispatchEvent(new MouseEvent('contextmenu',{clientX:r.left+r.width/2,clientY:r.top+r.height/2,bubbles:true,cancelable:true}))")
  elif name=='add-mode':click_title('Configurations');time.sleep(.15);click_text('Marker')
  elif name=='path-toggle':select_marker();time.sleep(.15);js("[...document.querySelectorAll('[data-float-panel] button')].find(b=>b.textContent.includes('Marker 2'))?.click()")
  elif name=='color':select_marker();time.sleep(.15);js("document.querySelectorAll('[data-float-panel] button[style*=background-color]')[1]?.click()")
  elif name=='notes':select_marker();time.sleep(.15);js("const e=document.querySelector('[data-float-panel] textarea'),s=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;s.call(e,'Edited note');e.dispatchEvent(new Event('input',{bubbles:true}))")
  time.sleep(.65)
 states=[('initial-populated',True,None),('initial-empty',False,None),('tab-plains',True,'tab-Plains of Eidolon'),('tab-orb',True,'tab-Orb Vallis'),('tab-cambion',True,'tab-Cambion Drift'),('tab-duviri',True,'tab-Duviri'),('raw-map',True,'raw'),('panel-open',True,'panel'),('marker-editor',True,'marker'),('new-config-modal',True,'new-modal'),('delete-config-modal',True,'delete-modal'),('context-menu',True,'context'),('add-marker-mode',True,'add-mode'),('path-toggle',True,'path-toggle'),('color-change',True,'color'),('notes-edit',True,'notes')]
 for name,configured,act in states:
  render('before',configured)
  if act:action(act)
  before=markup();before_calls=js('return window.fixture.calls')
  render('stable',configured)
  if act:action(act)
  after=markup();after_calls=js('return window.fixture.calls');equal=bool(before) and before==after;calls_equal=before_calls==after_calls;result['comparisons'].append({'state':name,'equal':equal,'before_length':len(before),'after_length':len(after)});result['interaction_parity'].append({'state':name,'equal':calls_equal,'before_calls':before_calls,'after_calls':after_calls})
 result['comparison_passed']=sum(x['equal'] for x in result['comparisons']);result['comparison_total']=len(result['comparisons']);result['interaction_passed']=sum(x['equal'] for x in result['interaction_parity']);result['interaction_total']=len(result['interaction_parity']);result['failures']=[x for x in result['comparisons']+result['interaction_parity'] if not x['equal']];api('DELETE',prefix)
finally:
 OUT.write_text(json.dumps(result,indent=2)+'\n')
 for pid in groups:
  try:os.killpg(pid,signal.SIGTERM)
  except ProcessLookupError:pass
 for p in processes:
  try:p.wait(timeout=3)
  except Exception:pass
 for l in logs:l.close()
print(json.dumps({'stable_markup':f"{result.get('comparison_passed')}/{result.get('comparison_total')}",'interaction_parity':f"{result.get('interaction_passed')}/{result.get('interaction_total')}",'failures':result.get('failures')},indent=2));raise SystemExit(0 if not result.get('failures') else 1)
