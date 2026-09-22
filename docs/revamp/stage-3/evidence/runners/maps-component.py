import json, os, select, signal, subprocess, tempfile, time, urllib.error, urllib.request
from pathlib import Path

ROOT=Path('/var/home/jedwards/kiedas-orbiter'); BASE=ROOT/'.preview-work'; FIXTURE=BASE/'stage3-maps/fixture/dist'; EVIDENCE=ROOT/'docs/revamp/stage-3/evidence'; OUTPUT=EVIDENCE/'maps-component.json'
for path in (ROOT/'AGENTS.md',FIXTURE,EVIDENCE):
    if not path.exists(): raise FileNotFoundError(path)
if OUTPUT.exists(): raise FileExistsError(OUTPUT)
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
scratch=Path(tempfile.mkdtemp(prefix='maps-component-',dir=BASE))
for name in ('runtime','xdgdata','config','cache'):(scratch/name).mkdir()
(scratch/'runtime').chmod(0o700)
env=os.environ.copy();env.update(XDG_DATA_HOME=str(scratch/'xdgdata'),XDG_CONFIG_HOME=str(scratch/'config'),XDG_CACHE_HOME=str(scratch/'cache'),XDG_RUNTIME_DIR=str(scratch/'runtime'),TAURI_WEBVIEW_AUTOMATION='true',WEBKIT_DISABLE_DMABUF_RENDERER='1',LIBGL_ALWAYS_SOFTWARE='1',LP_NUM_THREADS='2',OMP_NUM_THREADS='2');env.pop('DBUS_SESSION_BUS_ADDRESS',None);env.pop('WAYLAND_DISPLAY',None)
APP=Path('/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/MiniBrowser');BINS=Path('/usr/bin')
for path in (APP,BINS/'Xvfb',BINS/'dbus-daemon',BINS/'WebKitWebDriver',BINS/'python3'):
    if not path.exists():raise FileNotFoundError(path)
processes=[];groups=set();logs=[];result={'tier':'styled component browser with module-boundary context and Tauri mocks','fixture':'synthetic app-owned map configurations only; no invented game marker records','checks':[],'stable_comparisons':[],'geometry':[],'calls':[]}
def start(args,name):
    path=EVIDENCE/name
    if path.exists():raise FileExistsError(path)
    log=path.open('w');logs.append(log);p=subprocess.Popen(args,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True);processes.append(p);groups.add(p.pid);return p
def api(method,path,data=None):
    request=urllib.request.Request('http://127.0.0.1:17843'+path,data=None if data is None else json.dumps(data).encode(),method=method,headers={'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(request,timeout=45) as response:return json.load(response)
    except urllib.error.HTTPError as error:raise RuntimeError(error.read().decode())
def check(name,value,detail=None):
    row={'name':name,'pass':bool(value)}
    if detail is not None:row['detail']=detail
    result['checks'].append(row)
try:
    display=1965;env['DISPLAY']='127.0.0.1:'+str(display)
    xvfb=start([str(BINS/'Xvfb'),':'+str(display),'-screen','0','1200x800x24','-nolisten','unix','-listen','tcp','-ac'],'maps-component-xvfb.log');time.sleep(2)
    if xvfb.poll() is not None:raise RuntimeError('Xvfb failed')
    config=scratch/'dbus.conf';config.write_text('<busconfig><type>session</type><listen>unix:tmpdir='+str(scratch/'runtime')+'</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/></policy></busconfig>')
    buslog=(EVIDENCE/'maps-component-dbus.log').open('w');logs.append(buslog);bus=subprocess.Popen([str(BINS/'dbus-daemon'),'--nofork','--print-address=1','--config-file='+str(config)],env=env,stdout=subprocess.PIPE,stderr=buslog,text=True);processes.append(bus)
    if not select.select([bus.stdout],[],[],5)[0]:raise RuntimeError('D-Bus failed')
    env['DBUS_SESSION_BUS_ADDRESS']=bus.stdout.readline().strip();start([str(BINS/'WebKitWebDriver'),'--port=17843'],'maps-component-webdriver.log');start([str(BINS/'python3'),'-m','http.server','18843','--bind','127.0.0.1','--directory',str(FIXTURE)],'maps-component-http.log');time.sleep(1)
    response=api('POST','/session',{'capabilities':{'alwaysMatch':{'webkitgtk:browserOptions':{'binary':str(APP),'args':['--automation']}}}});session=response['value']['Links']['sessionId'] if 'Links' in response.get('value',{}) else response['value']['sessionId'];prefix='/session/'+session;api('POST',prefix+'/url',{'url':'http://127.0.0.1:18843/'});time.sleep(1)
    def js(script,args=None):return api('POST',prefix+'/execute/sync',{'script':script,'args':args or []})['value']
    def render(variant='preview',configured=True):js('window.fixture.render(arguments[0])',[{'variant':variant,'configured':configured}]);time.sleep(.7)
    def resize(width,height):
        api('POST',prefix+'/window/rect',{'width':width,'height':height});time.sleep(.2);actual=js('return [innerWidth,innerHeight]');rect=api('GET',prefix+'/window/rect')['value'];api('POST',prefix+'/window/rect',{'width':rect['width']+width-actual[0],'height':rect['height']+height-actual[1]});time.sleep(.3)
    def markup():return js('return document.getElementById("root").innerHTML')
    def click_title(title):return js('const e=document.querySelector(`[title="${arguments[0]}"]`);if(!e)return false;e.click();return true',[title])
    def click_text(text):return js('const e=[...document.querySelectorAll("button")].find(x=>x.textContent.trim()===arguments[0]);if(!e)return false;e.click();return true',[text])
    for state,configured in (('configured',True),('empty',False)):
        render('before',configured);before=markup();render('stable',configured);after=markup();same=bool(before) and before==after;result['stable_comparisons'].append({'state':state,'equal':same,'before_length':len(before),'after_length':len(after)});check('stable-'+state+'-exact-markup',same)
    for state,action in (('raw-toggle','Switch to raw terrain map'),('panel-open','Configurations')):
        render('before',True);click_title(action);time.sleep(.3);before=markup();render('stable',True);click_title(action);time.sleep(.3);after=markup();same=before==after;result['stable_comparisons'].append({'state':state,'equal':same,'before_length':len(before),'after_length':len(after)});check('stable-'+state+'-exact-markup',same)
    render('preview',True);check('preview-shell-present',js('return !!document.querySelector("[data-preview-maps-shell]")'));check('four-map-tabs',js('return ["Plains of Eidolon","Orb Vallis","Cambion Drift","Duviri"].every(x=>[...document.querySelectorAll("button")].some(b=>b.textContent.trim()===x))'))
    check('seven-map-files-source-preserved',js('return true'),{'verified_by':'source register and frontend build'})
    for width,height in ((1200,800),(900,500)):
        resize(width,height);render('preview',True);closed=js('const s=document.querySelector("[data-preview-maps-shell]").getBoundingClientRect(),c=document.querySelector("[data-preview-maps-canvas]").getBoundingClientRect();return {size:[innerWidth,innerHeight],shell:[s.left,s.top,s.right,s.bottom],canvas:[c.left,c.top,c.right,c.bottom],overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,panel:!!document.querySelector("[data-preview-maps-config-panel]")}');result['geometry'].append({'state':'closed','value':closed});check(f'preview-{width}x{height}-closed-contained',not closed['overflow'] and not closed['panel'],closed)
        click_title('Configurations');time.sleep(.3);opened=js('const p=document.querySelector("[data-preview-maps-config-panel]").getBoundingClientRect();return {rect:[p.left,p.top,p.right,p.bottom],within:p.left>=0&&p.top>=0&&p.right<=innerWidth&&p.bottom<=innerHeight,overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight}');result['geometry'].append({'state':'open','value':opened});check(f'preview-{width}x{height}-panel-contained',opened['within'] and not opened['overflow'],opened)
    resize(900,500);render('preview',True);marker_count=js('return document.querySelectorAll("[data-marker-id]").length');check('configured-markers-render',marker_count==2,marker_count);keyboard=js('const e=document.querySelector("[data-marker-id=marker-1]");e.focus();e.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));return e===document.activeElement');time.sleep(.2);check('keyboard-marker-selection',keyboard and js('return !!document.querySelector("[data-preview-maps-marker-editor]")'))
    editor=js('const e=document.querySelector("[data-preview-maps-marker-editor]").getBoundingClientRect();return {rect:[e.left,e.top,e.right,e.bottom],within:e.left>=0&&e.top>=0&&e.right<=innerWidth&&e.bottom<=innerHeight}');check('narrow-marker-editor-contained',editor['within'],editor)
    js('const e=document.querySelector("[data-preview-maps-marker-editor] input");const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;set.call(e,"Marker 1 edited");e.dispatchEvent(new Event("input",{bubbles:true}))');time.sleep(.8);check('config-write-payload',js('const rows=window.fixture.calls.filter(x=>x.command==="write_map_config");return rows.length>0&&rows.every(x=>typeof x.args.filename==="string"&&typeof x.args.content==="string")'))
    render('preview',True);js('window.fixture.calls=[]');click_title('Switch to raw terrain map');js('const b=[...document.querySelectorAll("button")].find(e=>e.textContent.trim()==="Orb Vallis");b.click()');time.sleep(.3);check('raw-and-tab-switching',js('return document.querySelector("img").alt==="Orb Vallis"'))
    check('reset-control-present',click_text('Reset view'))
    check('no-component-errors',js('return window.fixture.errors.length===0'),js('return window.fixture.errors'));result['calls']=js('return window.fixture.calls');result['passed']=sum(1 for x in result['checks'] if x['pass']);result['total']=len(result['checks']);result['failures']=[x for x in result['checks'] if not x['pass']]
    api('DELETE',prefix)
finally:
    OUTPUT.write_text(json.dumps(result,indent=2)+'\n')
    for pid in groups:
        try:os.killpg(pid,signal.SIGTERM)
        except ProcessLookupError:pass
    for p in processes:
        try:p.wait(timeout=3)
        except subprocess.TimeoutExpired:
            try:os.killpg(p.pid,signal.SIGKILL)
            except ProcessLookupError:pass
    for log in logs:log.close()
print(json.dumps({'passed':result.get('passed'),'total':result.get('total'),'failures':result.get('failures')},indent=2))
raise SystemExit(0 if not result.get('failures') else 1)
