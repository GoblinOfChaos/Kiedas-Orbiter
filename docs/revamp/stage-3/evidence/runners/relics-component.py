import json, os, select, signal, subprocess, tempfile, time, urllib.error, urllib.request
from pathlib import Path

ROOT=Path('/var/home/jedwards/kiedas-orbiter'); BASE=ROOT/'.preview-work'; FIXTURE=BASE/'stage3-relics/fixture/dist'; EVIDENCE=ROOT/'docs/revamp/stage-3/evidence'; OUTPUT=EVIDENCE/'relics-component.json'
for path in (ROOT/'AGENTS.md',FIXTURE,EVIDENCE):
    if not path.exists(): raise FileNotFoundError(path)
if OUTPUT.exists(): raise FileExistsError(OUTPUT)
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
scratch=Path(tempfile.mkdtemp(prefix='relics-component-',dir=BASE))
for name in ('runtime','xdgdata','config','cache'):(scratch/name).mkdir(parents=True,exist_ok=True)
(scratch/'runtime').chmod(0o700)
env=os.environ.copy();env.update(XDG_DATA_HOME=str(scratch/'xdgdata'),XDG_CONFIG_HOME=str(scratch/'config'),XDG_CACHE_HOME=str(scratch/'cache'),XDG_RUNTIME_DIR=str(scratch/'runtime'),TAURI_WEBVIEW_AUTOMATION='true',WEBKIT_DISABLE_DMABUF_RENDERER='1',LIBGL_ALWAYS_SOFTWARE='1',LP_NUM_THREADS='2',OMP_NUM_THREADS='2');env.pop('DBUS_SESSION_BUS_ADDRESS',None);env.pop('WAYLAND_DISPLAY',None)
APP=Path('/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/MiniBrowser'); BINS=Path('/usr/bin')
for path in (APP,BINS/'Xvfb',BINS/'dbus-daemon',BINS/'WebKitWebDriver',BINS/'python3'):
    if not path.exists(): raise FileNotFoundError(path)
processes=[];groups=set();logs=[];result={'tier':'styled component browser with module-boundary context/Tauri mocks and real relicParser helper','fixture':'synthetic parsed-shape relics and DE-export-shaped catalog; no live account, network, or market claims','checks':[],'stable_comparisons':[],'geometry':[],'formula_results':[]}
def start(args,name,**kwargs):
    path=EVIDENCE/name
    if path.exists(): raise FileExistsError(path)
    log=path.open('w');logs.append(log);p=subprocess.Popen(args,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True,**kwargs);processes.append(p);groups.add(p.pid);return p
def api(method,path,data=None):
    req=urllib.request.Request('http://127.0.0.1:17821'+path,data=None if data is None else json.dumps(data).encode(),method=method,headers={'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req,timeout=45) as response:return json.load(response)
    except urllib.error.HTTPError as error: raise RuntimeError(error.read().decode())
def check(name,value,detail=None):
    row={'name':name,'pass':bool(value)}
    if detail is not None:row['detail']=detail
    result['checks'].append(row)
try:
    display=1943;env['DISPLAY']='127.0.0.1:'+str(display)
    xvfb=start([str(BINS/'Xvfb'),':'+str(display),'-screen','0','1200x800x24','-nolisten','unix','-listen','tcp','-ac'],'relics-component-final2-xvfb.log');time.sleep(2)
    if xvfb.poll() is not None:raise RuntimeError('Xvfb failed')
    config=scratch/'dbus.conf';config.write_text('<busconfig><type>session</type><listen>unix:tmpdir='+str(scratch/'runtime')+'</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/></policy></busconfig>')
    bus_log=(EVIDENCE/'relics-component-final2-dbus.log').open('w');logs.append(bus_log);bus=subprocess.Popen([str(BINS/'dbus-daemon'),'--nofork','--print-address=1','--config-file='+str(config)],env=env,stdout=subprocess.PIPE,stderr=bus_log,text=True);processes.append(bus)
    if not select.select([bus.stdout],[],[],5)[0]:raise RuntimeError('D-Bus failed')
    env['DBUS_SESSION_BUS_ADDRESS']=bus.stdout.readline().strip();start([str(BINS/'WebKitWebDriver'),'--port=17821'],'relics-component-final2-webdriver.log');start([str(BINS/'python3'),'-m','http.server','18821','--bind','127.0.0.1','--directory',str(FIXTURE)],'relics-component-final2-http.log');time.sleep(1)
    response=api('POST','/session',{'capabilities':{'alwaysMatch':{'webkitgtk:browserOptions':{'binary':str(APP),'args':['--automation']}}}});session=response['value']['Links']['sessionId'] if 'Links' in response.get('value',{}) else response['value']['sessionId'];prefix='/session/'+session;api('POST',prefix+'/url',{'url':'http://127.0.0.1:18821/'});time.sleep(1)
    def js(script,args=None):return api('POST',prefix+'/execute/sync',{'script':script,'args':args or []})['value']
    def render(variant='preview',mode='populated',locale='en',price_values=None):
        payload={'variant':variant,'mode':mode,'locale':locale}
        if price_values is not None:payload['priceValues']=price_values
        js('window.fixture.render(arguments[0])',[payload]);time.sleep(.35)
    def resize(width,height):
        api('POST',prefix+'/window/rect',{'width':width,'height':height});time.sleep(.2);actual=js('return [innerWidth,innerHeight]');rect=api('GET',prefix+'/window/rect')['value'];api('POST',prefix+'/window/rect',{'width':rect['width']+width-actual[0],'height':rect['height']+height-actual[1]});time.sleep(.2)
    def click(selector,label=None):
        script="const nodes=[...document.querySelectorAll(arguments[0])],e=arguments[1]===null?nodes[0]:nodes.find(x=>x.textContent.trim()===arguments[1]||x.textContent.trim().startsWith(arguments[1]));if(!e)return false;e.scrollIntoView({block:'center'});e.click();return true"
        ok=js(script,[selector,label]);time.sleep(.2);return ok
    def search(value):
        ok=js("const e=document.querySelector('[data-preview-relics-search] input, input');if(!e)return false;const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(e,arguments[0]);e.dispatchEvent(new Event('input',{bubbles:true}));return true",[value]);time.sleep(.2);return ok
    def labels():return js("return [...document.querySelectorAll('[data-preview-relic-card]')].map(e=>e.getAttribute('aria-label'))")
    def press(value):
        api('POST',prefix+'/actions',{'actions':[{'type':'key','id':'relic-keyboard','actions':[{'type':'keyDown','value':value},{'type':'keyUp','value':value}]}]});time.sleep(.2)
        try:api('DELETE',prefix+'/actions')
        except Exception:pass
    for mode in ('loading','no-inventory','populated','price-progress','price-indeterminate','no-export'):
        render('before',mode);before=js('return document.getElementById("root").innerHTML');render('stable',mode);after=js('return document.getElementById("root").innerHTML');same=bool(before) and before==after;result['stable_comparisons'].append({'state':mode,'equal':same,'before_length':len(before),'after_length':len(after)});check('stable-'+mode+'-exact-markup',same)
    render('before');search('absent');before=js('return document.getElementById("root").innerHTML');render('stable');search('absent');after=js('return document.getElementById("root").innerHTML');same=before==after;result['stable_comparisons'].append({'state':'no-match','equal':same,'before_length':len(before),'after_length':len(after)});check('stable-no-match-exact-markup',same)
    render('before');click('button','Plat');before=js('return document.getElementById("root").innerHTML');render('stable');click('button','Plat');after=js('return document.getElementById("root").innerHTML');same=before==after;result['stable_comparisons'].append({'state':'non-name-sort','equal':same,'before_length':len(before),'after_length':len(after)});check('stable-sort-exact-markup',same)
    render('before');click('.cursor-pointer');before=js('return document.getElementById("root").innerHTML');render('stable');click('.cursor-pointer');after=js('return document.getElementById("root").innerHTML');same=before==after;result['stable_comparisons'].append({'state':'drawer','equal':same,'before_length':len(before),'after_length':len(after)});check('stable-drawer-exact-markup',same)
    check('stable-has-no-preview-layout',not js("return !!document.querySelector('[data-preview-relics-layout]')"))
    expected_eras=['All','Lith','Meso','Neo','Axi','Requiem'];expected_quality=['All','Intact','Refined','Exceptional','Flawless','Radiant']
    for width,height in ((1200,800),(900,500)):
        resize(width,height);render();state=js("""const root=document.querySelector('[data-preview-relics-layout]'),primary=document.querySelector('[data-preview-relics-primary-controls]'),secondary=document.querySelector('[data-preview-relics-secondary-controls]'),rails=[...document.querySelectorAll('[data-preview-relics-rail]')],cards=[...document.querySelectorAll('[data-preview-relic-card]')],traces=document.querySelector('[data-preview-relics-traces]'),rr=root.getBoundingClientRect(),tr=traces.getBoundingClientRect();return {present:!!root,body:{client:document.body.clientWidth,scroll:document.body.scrollWidth},root:{left:rr.left,right:rr.right},primaryColumns:getComputedStyle(primary).gridTemplateColumns.split(' ').length,secondaryColumns:getComputedStyle(secondary).gridTemplateColumns.split(' ').length,rails:rails.map(e=>({kind:e.dataset.previewRelicsRail,overflow:getComputedStyle(e).overflowX,wrap:getComputedStyle(e).flexWrap,client:e.clientWidth,scroll:e.scrollWidth,labels:[...e.querySelectorAll('button')].map(b=>b.textContent.trim())})),traces:{left:tr.left,right:tr.right,text:traces.innerText},cards:cards.map(e=>({role:e.getAttribute('role'),tabIndex:e.tabIndex,label:e.getAttribute('aria-label')})),noSell:![...root.querySelectorAll('button')].some(e=>/sell/i.test(e.textContent))};""")
        result['geometry'].append({'size':[width,height],**state});check(f'{width}-layout-and-containment',state['present'] and state['body']['scroll']<=state['body']['client']+1 and state['root']['left']>=0 and state['root']['right']<=width+1 and state['primaryColumns']==(4 if width==1200 else 1) and all(r['overflow']=='auto' and r['wrap']=='nowrap' for r in state['rails']),state);check(f'{width}-controls-and-traces',state['rails'][0]['labels']==expected_eras and state['rails'][1]['labels']==expected_quality and state['rails'][2]['labels']==['All','Vaulted','Unvaulted'] and state['rails'][3]['labels']==['Name','Ducats','Plat','Refine (D)','Refine (P)'] and state['traces']['left']>=state['root']['left']-1 and state['traces']['right']<=state['root']['right']+1 and '275' in state['traces']['text']);check(f'{width}-cards-accessible-and-market-absent',len(state['cards'])==5 and all(c['role']=='button' and c['tabIndex']==0 and c['label'] for c in state['cards']) and state['noSell']);render();focused=js("const e=document.querySelector('[data-preview-relic-card]');e.focus();return document.activeElement===e");press(chr(0xE007));opened=js("return document.querySelectorAll('.fixed.bottom-0').length===1");check(f'{width}-enter-opens-one-drawer',focused and opened);click('.fixed.bottom-0 button');render();focused=js("const e=document.querySelector('[data-preview-relic-card]');e.focus();return document.activeElement===e");press(' ');opened=js("return document.querySelectorAll('.fixed.bottom-0').length===1");check(f'{width}-space-opens-one-drawer',focused and opened);click('.fixed.bottom-0 button')
    render();
    for label,expected in [('Owned',3),('Unowned',2),('All',5)]: click('[data-preview-relics-ownership] button',label);check('ownership-'+label,len(labels())==expected,labels())
    for label,expected in [('Vaulted',2),('Unvaulted',3),('All',5)]: click('[data-preview-relics-rail="vault"] button',label);check('vault-'+label,len(labels())==expected,labels())
    for label,expected in [('Intact',3),('Refined',2),('Exceptional',1),('Flawless',1),('Radiant',1),('All',5)]: click('[data-preview-relics-rail="quality"] button',label);check('quality-'+label,len(labels())==expected,labels())
    for era in expected_eras: click('[data-preview-relics-rail="era"] button',era);check('era-'+era,all(x.startswith(era+' ') for x in labels()) if era!='All' else len(labels())==5,labels())
    for size in ('1','2','3','4'): click('[data-preview-relics-squad] button',size);check('squad-'+size,click('[data-preview-relics-squad] button',size))
    for target in ('I','E','F','R'): click('[data-preview-relics-target] button',target);check('target-'+target,click('[data-preview-relics-target] button',target))
    for sort_label in ('Name','Ducats','Plat','Refine (D)','Refine (P)'):
        click('[data-preview-relics-rail="sort"] button',sort_label);first=js("return document.querySelector('[data-preview-relics-rail=sort] button.bg-kronos-accent')?.textContent.trim()");click('[data-preview-relics-rail="sort"] button',sort_label);second=js("return document.querySelector('[data-preview-relics-rail=sort] button.bg-kronos-accent')?.textContent.trim()");check('sort-toggle-'+sort_label,first==second==sort_label)
    render();search('Lith A1');check('relic-name-search',labels()==['Lith A1 Relic'],labels());render();search('Alpha Chassis');check('reward-all-words-search',labels()==['Lith A1 Relic'],labels());render();search('Synthetic Link');highlight=js("return [...document.querySelectorAll('[data-preview-relic-card] p')].some(e=>e.textContent.includes('[Synthetic & Link]'))");check('ampersand-reward-highlight',len(labels())==4 and highlight,{'labels':labels(),'highlight':highlight});render();search('absent');check('no-match-message',js("return document.body.innerText.includes('No relics match your search')"));render(locale='de');german=js("return {placeholder:document.querySelector('input')?.placeholder,expected:window.fixture.t('relics.search'),buttons:[...document.querySelectorAll('[data-preview-relics-ownership] button')].map(e=>e.textContent.trim())}");check('german-labels',german['placeholder']==german['expected'] and german['expected'].startswith('Relikte') and german['buttons']==['Alle','Im Besitz','Nicht im Besitz'],german)
    standard=[{'rarity':'COMMON','plat':5,'ducats':15},{'rarity':'COMMON','plat':12,'ducats':15},{'rarity':'COMMON','plat':20,'ducats':25},{'rarity':'UNCOMMON','plat':0,'ducats':0},{'rarity':'UNCOMMON','plat':30,'ducats':45},{'rarity':'RARE','plat':100,'ducats':100}];requiem=[{'rarity':'COMMON','plat':i+1,'ducats':10+i} for i in range(8)]
    for dataset,name in ((standard,'standard'),(requiem,'requiem')):
        for refinement in ('Intact','Exceptional','Flawless','Radiant'):
            for squad in (1,2,3,4):
                values=js('return [window.fixture.formula(arguments[0],arguments[1],arguments[2],"plat"),window.fixture.formula(arguments[0],arguments[1],arguments[2],"ducats")]',[dataset,refinement,squad]);ok=all(isinstance(v,(int,float)) and v>=0 for v in values);result['formula_results'].append({'dataset':name,'refinement':refinement,'squad':squad,'values':values,'pass':ok});check(f'formula-{name}-{refinement}-{squad}',ok,values)
    render(price_values={});text_value=js("return document.querySelector('[data-preview-relics-layout]').innerText");check('missing-price-semantics','0P' in text_value and not any(token in text_value for token in ('5P','12P','20P','30P','100P')));check('no-market-mutation-command',not any(call['command'] in ('post_market_order','update_market_order','delete_market_order','close_market_order') for call in js('return window.fixture.calls')));check('no-browser-errors',js('return window.fixture.errors').__len__()==0,js('return window.fixture.errors'))
    api('DELETE',prefix)
except Exception as error:result['error']=str(error)
finally:
    for p in reversed(processes):
        if p.poll() is None:
            os.killpg(p.pid,signal.SIGTERM) if p.pid in groups else p.terminate()
            try:p.wait(timeout=8)
            except subprocess.TimeoutExpired:p.kill();p.wait()
    for log in logs:log.close()
    OUTPUT.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'checks':len(result['checks']),'passed':sum(r['pass'] for r in result['checks']),'stable':len(result['stable_comparisons']),'error':result.get('error')},indent=2))
raise SystemExit(0 if not result.get('error') and all(row['pass'] for row in result['checks']) else 1)
