import json
import os
from pathlib import Path
import select
import signal
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT=Path('/var/home/jedwards/kiedas-orbiter')
BASE=ROOT/'.preview-work'
FIXTURE=BASE/'stage3-rivens/fixture/dist'
EVIDENCE=ROOT/'docs/revamp/stage-3/evidence'
OUTPUT=EVIDENCE/'rivens-component.json'
for required in (ROOT/'AGENTS.md',FIXTURE,EVIDENCE):
    if not required.exists():raise FileNotFoundError(f'precondition path missing: {required}')
if OUTPUT.exists():raise FileExistsError(f'evidence already exists: {OUTPUT}')
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4])
os.nice(19)
scratch=Path(tempfile.mkdtemp(prefix='rivens-component-',dir=BASE))
for name in ('runtime','xdgdata','config','cache'):(scratch/name).mkdir(parents=True,exist_ok=True)
(scratch/'runtime').chmod(0o700)
env=os.environ.copy()
env.update(XDG_DATA_HOME=str(scratch/'xdgdata'),XDG_CONFIG_HOME=str(scratch/'config'),XDG_CACHE_HOME=str(scratch/'cache'),XDG_RUNTIME_DIR=str(scratch/'runtime'),TAURI_WEBVIEW_AUTOMATION='true',WEBKIT_DISABLE_DMABUF_RENDERER='1',LIBGL_ALWAYS_SOFTWARE='1',LP_NUM_THREADS='2',OMP_NUM_THREADS='2')
env.pop('DBUS_SESSION_BUS_ADDRESS',None)
env.pop('WAYLAND_DISPLAY',None)
APP=Path('/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/MiniBrowser')
BINS=Path('/usr/bin')
for required in (APP,BINS/'Xvfb',BINS/'dbus-daemon',BINS/'WebKitWebDriver',BINS/'python3'):
    if not required.exists():raise FileNotFoundError(f'runtime path missing: {required}')
processes=[];groups=set();logs=[]
result={'tier':'styled component browser with module-boundary mocks','fixture':'synthetic parsed-shape Riven records and synthetic model results; no live inventory, account, network, market, or model-accuracy claims','checks':[],'geometry':[],'stable_comparisons':[]}

def start(args,name,**kwargs):
    path=EVIDENCE/name
    if path.exists():raise FileExistsError(f'log already exists: {path}')
    log=path.open('w');logs.append(log)
    process=subprocess.Popen(args,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True,**kwargs)
    processes.append(process);groups.add(process.pid)
    return process
def api(method,path,data=None):
    req=urllib.request.Request('http://127.0.0.1:17811'+path,data=None if data is None else json.dumps(data).encode(),method=method,headers={'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req,timeout=45) as response:return json.load(response)
    except urllib.error.HTTPError as error:raise RuntimeError(error.read().decode())
def check(name,value,detail=None):
    row={'name':name,'pass':bool(value)}
    if detail is not None:row['detail']=detail
    result['checks'].append(row)

try:
    display=1933;env['DISPLAY']='127.0.0.1:'+str(display)
    xvfb=start([str(BINS/'Xvfb'),':'+str(display),'-screen','0','1200x800x24','-nolisten','unix','-listen','tcp','-ac'],'rivens-component-xvfb.log')
    time.sleep(2)
    if xvfb.poll() is not None:raise RuntimeError('Xvfb failed')
    config=scratch/'dbus.conf'
    config.write_text('<busconfig><type>session</type><listen>unix:tmpdir='+str(scratch/'runtime')+'</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/></policy></busconfig>')
    bus_log=(EVIDENCE/'rivens-component-dbus.log').open('w');logs.append(bus_log)
    bus=subprocess.Popen([str(BINS/'dbus-daemon'),'--nofork','--print-address=1','--config-file='+str(config)],env=env,stdout=subprocess.PIPE,stderr=bus_log,text=True)
    processes.append(bus)
    if not select.select([bus.stdout],[],[],5)[0]:raise RuntimeError('D-Bus failed')
    env['DBUS_SESSION_BUS_ADDRESS']=bus.stdout.readline().strip()
    start([str(BINS/'WebKitWebDriver'),'--port=17811'],'rivens-component-webdriver.log')
    start([str(BINS/'python3'),'-m','http.server','18811','--bind','127.0.0.1','--directory',str(FIXTURE)],'rivens-component-http.log')
    time.sleep(1)
    response=api('POST','/session',{'capabilities':{'alwaysMatch':{'webkitgtk:browserOptions':{'binary':str(APP),'args':['--automation']}}}})
    session=response['value']['Links']['sessionId'] if 'Links' in response.get('value',{}) else response['value']['sessionId']
    prefix='/session/'+session
    api('POST',prefix+'/url',{'url':'http://127.0.0.1:18811/'})
    time.sleep(1)
    def js(script,args=None):return api('POST',prefix+'/execute/sync',{'script':script,'args':args or []})['value']
    def render(variant='preview',mode='populated',locale='en',prices=None,wait=.55):
        payload={'variant':variant,'mode':mode,'locale':locale}
        if prices is not None:payload['prices']=prices
        js('window.fixture.render(arguments[0])',[payload]);time.sleep(wait)
    def resize(width,height):
        api('POST',prefix+'/window/rect',{'width':width,'height':height});time.sleep(.2)
        actual=js('return [innerWidth,innerHeight]');rect=api('GET',prefix+'/window/rect')['value']
        api('POST',prefix+'/window/rect',{'width':rect['width']+width-actual[0],'height':rect['height']+height-actual[1]});time.sleep(.2)
    def click(script,args=None):
        value=js("const e=("+script+");if(!e)return false;e.scrollIntoView({block:'center'});e.click();return true",args or []);time.sleep(.2);return value
    def press(value):
        api('POST',prefix+'/actions',{'actions':[{'type':'key','id':'rivens-keyboard','actions':[{'type':'keyDown','value':value},{'type':'keyUp','value':value}]}]});time.sleep(.2)
        try:api('DELETE',prefix+'/actions')
        except Exception:pass
    def labels():return js("return [...document.querySelectorAll('[data-preview-riven-card]')].map(e=>e.getAttribute('aria-label'))")
    def click_state(label):return click("[...document.querySelectorAll('[data-preview-rivens-state] button')].find(e=>e.textContent.trim()===arguments[0])",[label])
    def click_type(label):return click("[...document.querySelectorAll('.preview-rivens-types button')].find(e=>e.textContent.trim()===arguments[0])",[label])
    def click_sort(label):return click("[...document.querySelectorAll('[data-preview-rivens-sort] button')].find(e=>e.textContent.trim().startsWith(arguments[0]))",[label])
    def search(value):
        ok=js("const e=document.querySelector('[data-preview-rivens-search] input');if(!e)return false;const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(e,arguments[0]);e.dispatchEvent(new Event('input',{bubbles:true}));return true",[value]);time.sleep(.2);return ok

    for mode in ('loading','no-inventory','frames-loading','populated'):
        render('before',mode);before=js('return document.getElementById("root").innerHTML')
        render('stable',mode);after=js('return document.getElementById("root").innerHTML')
        same=bool(before) and before==after
        result['stable_comparisons'].append({'state':mode,'equal':same,'before_length':len(before),'after_length':len(after)})
        check('stable-'+mode+'-exact-markup',same)
    render('before');search_before=js("const e=document.querySelector('input');const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(e,'absent');e.dispatchEvent(new Event('input',{bubbles:true}));return true");time.sleep(.2);before=js('return document.getElementById("root").innerHTML')
    render('stable');search_after=js("const e=document.querySelector('input');const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(e,'absent');e.dispatchEvent(new Event('input',{bubbles:true}));return true");time.sleep(.2);after=js('return document.getElementById("root").innerHTML')
    same=search_before and search_after and before==after
    result['stable_comparisons'].append({'state':'no-match','equal':same,'before_length':len(before),'after_length':len(after)});check('stable-no-match-exact-markup',same)
    for name in ('Alpha Critatis','Unprofiled Riven'):
        render('before');click("[...document.querySelectorAll('.cursor-pointer')].find(e=>e.textContent.includes(arguments[0]))",[name]);before=js('return document.getElementById("root").innerHTML')
        render('stable');click("[...document.querySelectorAll('.cursor-pointer')].find(e=>e.textContent.includes(arguments[0]))",[name]);after=js('return document.getElementById("root").innerHTML')
        same=before==after
        result['stable_comparisons'].append({'state':'drawer-'+name,'equal':same,'before_length':len(before),'after_length':len(after)});check('stable-drawer-'+name+'-exact-markup',same)
    check('stable-has-no-preview-layout',not js("return !!document.querySelector('[data-preview-rivens-layout]')"))

    expected_types=['All','Rifle','Pistol','Melee','Shotgun','Sniper','Kitgun','Zaw','Archgun']
    expected_states=['All States','Unveiled','Challenge','Veiled']
    for width,height in ((1200,800),(900,500)):
        resize(width,height);render()
        geometry=js("""const root=document.querySelector('[data-preview-rivens-layout]'),primary=document.querySelector('[data-preview-rivens-primary-controls]'),types=document.querySelector('.preview-rivens-types'),state=document.querySelector('[data-preview-rivens-state]'),sort=document.querySelector('[data-preview-rivens-sort]'),grid=document.querySelector('[data-preview-rivens-grid]'),rr=root.getBoundingClientRect(),gr=grid.getBoundingClientRect(),cards=[...document.querySelectorAll('[data-preview-riven-card]')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,role:e.getAttribute('role'),tabIndex:e.tabIndex}});return {body:{client:document.body.clientWidth,scroll:document.body.scrollWidth},root:{left:rr.left,right:rr.right,width:rr.width},primary:{columns:getComputedStyle(primary).gridTemplateColumns},types:{labels:[...types.querySelectorAll('button')].map(e=>e.textContent.trim()),client:types.clientWidth,scroll:types.scrollWidth,overflow:getComputedStyle(types).overflowX,wrap:getComputedStyle(types).flexWrap},state:{labels:[...state.querySelectorAll('button')].map(e=>e.textContent.trim()),client:state.clientWidth,scroll:state.scrollWidth,overflow:getComputedStyle(state).overflowX},sort:{labels:[...sort.querySelectorAll('button')].map(e=>e.textContent.trim()),client:sort.clientWidth,scroll:sort.scrollWidth,overflow:getComputedStyle(sort).overflowX},grid:{left:gr.left,right:gr.right,columns:getComputedStyle(grid).gridTemplateColumns,gap:getComputedStyle(grid).gap},cards};""")
        result['geometry'].append({'size':[width,height],**geometry})
        check(f'{width}-layout-present',geometry['root']['width']>0)
        check(f'{width}-body-no-horizontal-overflow',geometry['body']['scroll']<=geometry['body']['client']+1,geometry['body'])
        check(f'{width}-layout-in-bounds',geometry['root']['left']>=0 and geometry['root']['right']<=width+1,geometry['root'])
        check(f'{width}-primary-columns',len(geometry['primary']['columns'].split())==(3 if width==1200 else 1),geometry['primary'])
        check(f'{width}-type-labels',geometry['types']['labels']==expected_types,geometry['types']['labels'])
        check(f'{width}-state-labels',geometry['state']['labels']==expected_states,geometry['state']['labels'])
        check(f'{width}-sort-labels',geometry['sort']['labels']==['Name','Plat','Grade'],geometry['sort']['labels'])
        check(f'{width}-types-contained',geometry['types']['overflow']=='auto' and geometry['types']['wrap']=='nowrap',geometry['types'])
        check(f'{width}-dense-controls-contained',geometry['state']['overflow']=='auto' and geometry['sort']['overflow']=='auto')
        check(f'{width}-cards-200-and-bounded',all(abs(c['width']-200)<1 and c['left']>=geometry['grid']['left']-1 and c['right']<=geometry['grid']['right']+1 and c['role']=='button' and c['tabIndex']==0 for c in geometry['cards']),geometry['cards'][:4])
        render();focused=js("const e=document.querySelector('[data-preview-riven-card]');e.focus();return document.activeElement===e");press('\ue007');check(f'{width}-enter-opens-one-drawer',focused and js("return document.querySelectorAll('.fixed.bottom-0').length===1"));click("document.querySelector('.fixed.bottom-0 button')")
        render();focused=js("const e=document.querySelector('[data-preview-riven-card]');e.focus();return document.activeElement===e");press(' ');check(f'{width}-space-opens-one-drawer',focused and js("return document.querySelectorAll('.fixed.bottom-0').length===1"));click("document.querySelector('.fixed.bottom-0 button')")

    resize(1200,800);render()
    for label in expected_types:
        click_type(label);active=js("return [...document.querySelectorAll('.preview-rivens-types button')].find(e=>e.textContent.trim()===arguments[0])?.classList.contains('bg-kronos-accent')||false",[label]);check('type-'+label,active)
    expected_state_counts={'All States':12,'Unveiled':10,'Challenge':1,'Veiled':1}
    for label,count in expected_state_counts.items():
        render();click_state(label);check('state-'+label,len(labels())==count,labels())
    render();check('search-set',search('alpha'));check('search-two-distinct-owned-instances',labels()==['Alpha Critatis','Alpha Critatis'],labels())
    search('absent');check('search-no-match-state',len(labels())==0 and 'No rivens match your filters' in js('return document.body.innerText'))

    for label in ('Name','Plat','Grade'):
        render();click_sort(label);first=labels();click_sort(label);second=labels();check('sort-'+label+'-both-directions',first!=second and len(first)==12 and len(second)==12,{'first':first[:3],'second':second[:3]})
    render();click_sort('Plat');check('plat-desc-high-price-first',labels()[0]=='Alpha Critatis',labels()[:3])
    render(prices={'Beta':{'price':45,'expected_value':40,'weapon_rank':8,'total_weapons':20,'probability_stagnant':.6}});time.sleep(.3)
    alpha=js("return [...document.querySelectorAll('[data-preview-riven-card]')].find(e=>e.getAttribute('aria-label')==='Alpha Critatis')?.innerText||''")
    beta=js("return [...document.querySelectorAll('[data-preview-riven-card]')].find(e=>e.getAttribute('aria-label')==='Beta Visiata')?.innerText||''")
    check('missing-estimate-has-no-price',not any(part.endswith('p') for part in alpha.split()))
    check('explicit-estimate-price-visible','45p' in beta,beta)
    render(prices={'Alpha':{'price':0,'expected_value':0,'weapon_rank':20,'total_weapons':20,'probability_stagnant':1}})
    alpha=js("return [...document.querySelectorAll('[data-preview-riven-card]')].find(e=>e.getAttribute('aria-label')==='Alpha Critatis')?.innerText||''")
    check('explicit-zero-model-estimate-preserved','0p' in alpha,alpha)

    render();calls=js('return window.fixture.calls');batch=[c for c in calls if c['command']=='estimate_riven_full_batch'];inputs=batch[0]['args']['inputs'] if batch else []
    check('three-command-surface',sorted(set(c['command'] for c in calls))==['estimate_riven_full_batch','get_icons_path','get_mod_frames_path'],calls)
    check('batch-has-ten-unveiled-inputs',len(inputs)==10,inputs)
    beta_input=next((i for i in inputs if i['weapon_name']=='Beta'),None)
    check('english-weapon-and-stat-mapping',beta_input is not None and beta_input['positive1']=='critical_chance' and beta_input['negative']=='zoom',beta_input)
    check('no-market-mutation-commands',not any(c['command'] in ('post_market_order','update_market_order','close_market_order','delete_market_order') for c in calls),calls)
    check('no-sell-controls',not js("return [...document.querySelectorAll('button')].some(e=>/sell/i.test(e.textContent))"))

    render(locale='de');body=js('return document.body.innerText')
    check('german-screen-title','RIVEN-MODS' in body.upper(),body[:300])
    upper_body=body.upper()
    check('german-preserves-hardcoded-filters',all(label.upper() in upper_body for label in expected_types+expected_states+['Name','Plat','Grade']))
    check('german-no-horizontal-overflow',js('return document.body.scrollWidth<=document.body.clientWidth+1'))

    render(mode='prices-missing',wait=.3);time.sleep(10)
    calls=js("return window.fixture.calls.filter(c=>c['command']=='estimate_riven_full_batch').length")
    check('all-null-pricer-retry-capped-at-three',calls==4,calls)
    check('no-fixture-errors',js('return window.fixture.errors.length')==0,js('return window.fixture.errors'))
    api('DELETE',prefix)
except Exception as error:
    result['error']=str(error)
finally:
    for process in reversed(processes):
        if process.poll() is None:
            try:
                if process.pid in groups:os.killpg(process.pid,signal.SIGTERM)
                else:process.terminate()
            except ProcessLookupError:pass
            try:process.wait(timeout=8)
            except subprocess.TimeoutExpired:process.kill();process.wait()
    for log in logs:log.close()
    OUTPUT.write_text(json.dumps(result,indent=2)+'\n')
    summary={'error':result.get('error'),'checks':len(result['checks']),'passed':sum(row['pass'] for row in result['checks']),'failures':[row for row in result['checks'] if not row['pass']],'stable_comparisons':len(result['stable_comparisons'])}
    print(json.dumps(summary,indent=2))
if result.get('error') or any(not row['pass'] for row in result['checks']):
    raise SystemExit(1)
