import hashlib,json,os,select,signal,subprocess,tempfile,time,urllib.error,urllib.request
from pathlib import Path

ROOT=Path('/var/home/jedwards/kiedas-orbiter');WORK=ROOT/'.preview-work/stage3-maps';E=ROOT/'docs/revamp/stage-3/evidence';STABLE=WORK/'stable-target/release/kiedas-orbiter';PREVIEW=ROOT/'.preview-work/ubuntu-build/target/release/kiedas-orbiter';OUTPUT=E/'maps-rust-reliability.json';B=Path('/usr/bin');MINI=Path('/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/MiniBrowser')
for path in (ROOT/'AGENTS.md',STABLE,PREVIEW,WORK/'rename-fault.c',E,B/'gcc',B/'Xvfb',B/'dbus-daemon',B/'WebKitWebDriver',MINI):
    if not path.exists():raise FileNotFoundError(path)
if OUTPUT.exists():raise FileExistsError(OUTPUT)
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
scratch=Path(tempfile.mkdtemp(prefix='maps-reliability-',dir=ROOT/'.preview-work'));xdg=scratch/'xdgdata';runtime=scratch/'runtime';config=scratch/'config';cache=scratch/'cache';shim=scratch/'bin'
for path in (xdg,runtime,config,cache,shim):path.mkdir();
runtime.chmod(0o700);opened=scratch/'opened.txt';opener=shim/'xdg-open';opener.write_text('#!/bin/sh\nprintf "%s" "$1" > "'+str(opened)+'"\n');opener.chmod(0o755)
fault=scratch/'rename-fault.so';compile_result=subprocess.run([str(B/'gcc'),'-shared','-fPIC','-O2','-o',str(fault),str(WORK/'rename-fault.c'),'-ldl'],capture_output=True,text=True)
if compile_result.returncode:raise RuntimeError(compile_result.stderr)
base_env=os.environ.copy();base_env.update(XDG_DATA_HOME=str(xdg),XDG_CONFIG_HOME=str(config),XDG_CACHE_HOME=str(cache),XDG_RUNTIME_DIR=str(runtime),PATH=str(shim)+':'+str(B),TAURI_WEBVIEW_AUTOMATION='true',WEBKIT_DISABLE_DMABUF_RENDERER='1',LIBGL_ALWAYS_SOFTWARE='1',LP_NUM_THREADS='2',OMP_NUM_THREADS='2');base_env.pop('DBUS_SESSION_BUS_ADDRESS',None);base_env.pop('WAYLAND_DISPLAY',None)
processes=[];logs=[];result={'checks':[],'stable_binary_sha256':hashlib.sha256(STABLE.read_bytes()).hexdigest(),'preview_binary_sha256':hashlib.sha256(PREVIEW.read_bytes()).hexdigest(),'fault_injector_sha256':hashlib.sha256(fault.read_bytes()).hexdigest()}
def check(name,value,detail=None):
 row={'name':name,'pass':bool(value)}
 if detail is not None:row['detail']=detail
 result['checks'].append(row)
def start(args,name,env):
 log=(E/name).open('w');logs.append(log);p=subprocess.Popen(args,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True);processes.append(p);return p
def request(port,method,path,data=None):
 req=urllib.request.Request(f'http://127.0.0.1:{port}'+path,data=None if data is None else json.dumps(data).encode(),method=method,headers={'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=45) as response:return json.load(response)
 except urllib.error.HTTPError as error:raise RuntimeError(error.read().decode())
def invoke(port,prefix,command,args):return request(port,'POST',prefix+'/execute/async',{'script':"const done=arguments[arguments.length-1];window.__TAURI_INTERNALS__.invoke(arguments[0],arguments[1]).then(v=>done({resolved:true,value:v})).catch(e=>done({resolved:false,error:String(e)}));",'args':[command,args]})['value']
display=1966;base_env['DISPLAY']='127.0.0.1:'+str(display)
try:
 xvfb=start([str(B/'Xvfb'),':'+str(display),'-screen','0','1200x800x24','-nolisten','unix','-listen','tcp','-ac'],'maps-reliability-xvfb.log',base_env);time.sleep(2)
 if xvfb.poll() is not None:raise RuntimeError('Xvfb failed')
 busconf=scratch/'dbus.conf';busconf.write_text('<busconfig><type>session</type><listen>unix:tmpdir='+str(runtime)+'</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/></policy></busconfig>');buslog=(E/'maps-reliability-dbus.log').open('w');logs.append(buslog);bus=subprocess.Popen([str(B/'dbus-daemon'),'--nofork','--print-address=1','--config-file='+str(busconf)],env=base_env,stdout=subprocess.PIPE,stderr=buslog,text=True,start_new_session=True);processes.append(bus)
 if not select.select([bus.stdout],[],[],5)[0]:raise RuntimeError('D-Bus failed')
 base_env['DBUS_SESSION_BUS_ADDRESS']=bus.stdout.readline().strip()
 def run_case(name,binary,port,extra=None,action=None):
  env=base_env.copy();env.update(extra or {});driver=start([str(B/'WebKitWebDriver'),'--port='+str(port)],f'maps-reliability-{name}-webdriver.log',env);time.sleep(1);response=request(port,'POST','/session',{'capabilities':{'alwaysMatch':{'webkitgtk:browserOptions':{'binary':str(binary)}}}});session=response['value']['sessionId'];prefix='/session/'+session;time.sleep(5)
  try:return action(port,prefix)
  finally:
   try:request(port,'DELETE','/session/'+session)
   except Exception:pass
   if driver.poll() is None:os.killpg(driver.pid,signal.SIGTERM);driver.wait(timeout=5)
 stable_root=xdg/'kiedas-orbiter/data/user/map-configs';preview_root=xdg/'kiedas-orbiter-preview/data/user/map-configs'
 def open_case(expected):
  def action(port,prefix):
   if opened.exists():opened.unlink()
   before=expected.exists();value=invoke(port,prefix,'open_map_configs_folder',{});time.sleep(.5);received=opened.read_text() if opened.exists() else None;return {'before':before,'result':value,'created':expected.is_dir(),'received':received}
  return action
 stable_open=run_case('stable-open',STABLE,17851,action=open_case(stable_root));check('stable-fresh-folder-created-before-open',not stable_open['before'] and stable_open['result'].get('resolved') is True and stable_open['created'] and stable_open['received']==str(stable_root),stable_open)
 preview_open=run_case('preview-open',PREVIEW,17852,action=open_case(preview_root));check('preview-fresh-folder-created-before-open',not preview_open['before'] and preview_open['result'].get('resolved') is True and preview_open['created'] and preview_open['received']==str(preview_root),preview_open)
 check('stable-preview-roots-distinct',stable_root!=preview_root and stable_root.is_dir() and preview_root.is_dir(),{'stable':str(stable_root),'preview':str(preview_root)})
 old=b'{"safe":"old-complete"}';new=b'{"safe":"new-complete"}';atomic=preview_root/'atomic.json';atomic.write_bytes(old)
 def fault_action(port,prefix):
  traversal=invoke(port,prefix,'write_map_config',{'filename':'../escape.json','content':'{}'});failure=invoke(port,prefix,'write_map_config',{'filename':'atomic.json','content':new.decode()});return {'traversal':traversal,'failure':failure,'old_after':atomic.read_bytes().decode(),'tmp':(preview_root/'atomic.json.tmp').read_bytes().decode() if (preview_root/'atomic.json.tmp').exists() else None}
 faulted=run_case('preview-fault',PREVIEW,17853,{'LD_PRELOAD':str(fault)},fault_action);check('traversal-rejected',faulted['traversal'].get('resolved') is False and not (preview_root.parent/'escape.json').exists() and not (preview_root/'../escape.json').resolve().exists(),faulted['traversal']);check('atomic-rename-failure-keeps-old-complete',faulted['failure'].get('resolved') is False and faulted['old_after']==old.decode() and faulted['tmp']==new.decode(),faulted)
 def clean_action(port,prefix):
  success=invoke(port,prefix,'write_map_config',{'filename':'atomic.json','content':new.decode()});read=invoke(port,prefix,'read_map_config',{'filename':'atomic.json'});return {'success':success,'read':read,'bytes':atomic.read_bytes().decode(),'tmp_exists':(preview_root/'atomic.json.tmp').exists()}
 clean=run_case('preview-clean',PREVIEW,17854,action=clean_action);check('later-clean-write-succeeds-exactly',clean['success'].get('resolved') is True and clean['read'].get('value')==new.decode() and clean['bytes']==new.decode() and not clean['tmp_exists'],clean);check('commands-do-not-cross-profile-roots',not (stable_root/'atomic.json').exists() and not (stable_root/'escape.json').exists(),{'stable_files':sorted(x.name for x in stable_root.iterdir()),'preview_files':sorted(x.name for x in preview_root.iterdir())})
 result['passed']=sum(x['pass'] for x in result['checks']);result['total']=len(result['checks']);result['failures']=[x for x in result['checks'] if not x['pass']]
finally:
 OUTPUT.write_text(json.dumps(result,indent=2)+'\n')
 for p in reversed(processes):
  if p.poll() is None:
   try:os.killpg(p.pid,signal.SIGTERM);p.wait(timeout=5)
   except Exception:
    try:os.killpg(p.pid,signal.SIGKILL)
    except ProcessLookupError:pass
 for log in logs:log.close()
print(json.dumps({'passed':result.get('passed'),'total':result.get('total'),'failures':result.get('failures')},indent=2));raise SystemExit(0 if not result.get('failures') else 1)
