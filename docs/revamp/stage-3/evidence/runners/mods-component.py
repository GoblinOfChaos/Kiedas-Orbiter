import json
import os
import pathlib
import select
import signal
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

root=pathlib.Path('/var/home/jedwards/kiedas-orbiter')
base=root/'.preview-work'
fixture=base/'stage3-mods/fixture/dist'
evidence=root/'docs/revamp/stage-3/evidence'
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4])
os.nice(19)
scratch=pathlib.Path(tempfile.mkdtemp(prefix='mods-component-',dir=base))
for name in ('runtime','xdgdata','config','cache'):
    (scratch/name).mkdir(parents=True,exist_ok=True)
(scratch/'runtime').chmod(0o700)
env=os.environ.copy()
env.update(XDG_DATA_HOME=str(scratch/'xdgdata'),XDG_CONFIG_HOME=str(scratch/'config'),XDG_CACHE_HOME=str(scratch/'cache'),XDG_RUNTIME_DIR=str(scratch/'runtime'),TAURI_WEBVIEW_AUTOMATION='true',WEBKIT_DISABLE_DMABUF_RENDERER='1',LIBGL_ALWAYS_SOFTWARE='1',LP_NUM_THREADS='2',OMP_NUM_THREADS='2')
env.pop('DBUS_SESSION_BUS_ADDRESS',None)
env.pop('WAYLAND_DISPLAY',None)
app=pathlib.Path('/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/MiniBrowser')
bins=pathlib.Path('/usr/bin')
processes=[]
groups=set()
logs=[]
result={'tier':'styled component browser with module mocks','fixture':'synthetic display data; no live game, inventory, price or market claims','checks':[],'geometry':[],'stable_comparisons':[]}

def start(args,name,**kwargs):
    log=open(evidence/name,'w')
    logs.append(log)
    process=subprocess.Popen(args,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True,**kwargs)
    processes.append(process)
    groups.add(process.pid)
    return process

def api(method,path,data=None):
    request=urllib.request.Request('http://127.0.0.1:17809'+path,data=None if data is None else json.dumps(data).encode(),method=method,headers={'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(request,timeout=45) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(error.read().decode())

def check(name,value,detail=None):
    row={'name':name,'pass':bool(value)}
    if detail is not None:
        row['detail']=detail
    result['checks'].append(row)

try:
    display=1931
    env['DISPLAY']='127.0.0.1:'+str(display)
    xvfb=start([str(bins/'Xvfb'),':'+str(display),'-screen','0','1200x800x24','-nolisten','unix','-listen','tcp','-ac'],'mods-component-xvfb.log')
    time.sleep(2)
    if xvfb.poll() is not None:
        raise RuntimeError('Xvfb failed')
    config=scratch/'dbus.conf'
    config.write_text('<busconfig><type>session</type><listen>unix:tmpdir='+str(scratch/'runtime')+'</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/></policy></busconfig>')
    bus=subprocess.Popen([str(bins/'dbus-daemon'),'--nofork','--print-address=1','--config-file='+str(config)],env=env,stdout=subprocess.PIPE,stderr=open(evidence/'mods-component-dbus.log','w'),text=True)
    processes.append(bus)
    if not select.select([bus.stdout],[],[],5)[0]:
        raise RuntimeError('D-Bus failed')
    env['DBUS_SESSION_BUS_ADDRESS']=bus.stdout.readline().strip()
    driver=start([str(bins/'WebKitWebDriver'),'--port=17809'],'mods-component-webdriver.log')
    server=start([str(bins/'python3'),'-m','http.server','18809','--bind','127.0.0.1','--directory',str(fixture)],'mods-component-http.log')
    time.sleep(1)
    response=api('POST','/session',{'capabilities':{'alwaysMatch':{'webkitgtk:browserOptions':{'binary':str(app),'args':['--automation']}}}})
    session=response['value']['Links']['sessionId'] if 'Links' in response.get('value',{}) else response['value']['sessionId']
    prefix='/session/'+session
    api('POST',prefix+'/url',{'url':'http://127.0.0.1:18809/'})
    time.sleep(1)

    def js(script,args=None):
        return api('POST',prefix+'/execute/sync',{'script':script,'args':args or []})['value']
    def render(variant='preview',mode='populated',prices=None,locale='en'):
        js('window.fixture.render(arguments[0])',[{'variant':variant,'mode':mode,'prices':prices or {},'locale':locale}])
        time.sleep(.25)
    def resize(width,height):
        api('POST',prefix+'/window/rect',{'width':width,'height':height})
        time.sleep(.2)
        actual=js('return [innerWidth,innerHeight]')
        rect=api('GET',prefix+'/window/rect')['value']
        api('POST',prefix+'/window/rect',{'width':rect['width']+width-actual[0],'height':rect['height']+height-actual[1]})
        time.sleep(.2)
    def click(script,args=None):
        value=js("const e=("+script+");if(!e)return false;e.scrollIntoView({block:'center'});e.click();return true",args or [])
        time.sleep(.15)
        return value
    def set_search(value):
        ok=js("const e=document.querySelector('[data-preview-mods-search] input');if(!e)return false;const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(e,arguments[0]);e.dispatchEvent(new Event('input',{bubbles:true}));return true",[value])
        time.sleep(.2)
        return ok
    def press(value):
        api('POST',prefix+'/actions',{'actions':[{'type':'key','id':'mods-keyboard','actions':[{'type':'keyDown','value':value},{'type':'keyUp','value':value}]}]})
        time.sleep(.15)
        try:
            api('DELETE',prefix+'/actions')
        except Exception:
            pass
    def card_names():
        return js("return [...document.querySelectorAll('[data-preview-mod-card]')].map(e=>e.getAttribute('aria-label'))")
    def click_category(label):
        return click("[...document.querySelectorAll('[data-preview-mods-categories] button')].find(e=>e.textContent.trim()===arguments[0])",[label])
    def click_sort(label):
        return click("[...document.querySelectorAll('[data-preview-mods-sort] button')].find(e=>e.textContent.trim().startsWith(arguments[0]))",[label])
    def click_filter(label):
        return click("[...document.querySelectorAll('[data-preview-mods-filters] button')].find(e=>e.textContent.trim()===arguments[0])",[label])

    stable_states=['populated','loading','empty','frames-pending','fix-checking','fix-fixing','price-loading','price-progress']
    for mode in stable_states:
        render('before',mode)
        before=js('return document.getElementById("root").innerHTML')
        render('stable',mode)
        after=js('return document.getElementById("root").innerHTML')
        same=bool(before) and before==after
        result['stable_comparisons'].append({'state':mode,'equal':same,'before_length':len(before),'after_length':len(after)})
        check('stable-'+mode+'-exact-markup',same)
    check('stable-has-no-preview-layout',not js("return !!document.querySelector('[data-preview-mods-layout]')"))
    render('before')
    click("document.querySelector('.grid.pb-4 > div')")
    before_drawer=js('return document.getElementById("root").innerHTML')
    render('stable')
    click("document.querySelector('.grid.pb-4 > div')")
    after_drawer=js('return document.getElementById("root").innerHTML')
    check('stable-pointer-drawer-exact-markup',before_drawer==after_drawer,{'before_length':len(before_drawer),'after_length':len(after_drawer)})

    english=['All','Warframe','Primary','Secondary','Melee','Sentinels','Robotic','Beasts','Stance','Aura','Exilus','Railjack','Archgun','Archmelee','Parazon','Augment','Antique','Tome','Vehicles']
    german=['Alle','Warframe','Primär','Sekundär','Nahkampf','Sentinels','Robotic','Bestien','Haltung','Aura','Exilus','Railjack','Archgun','Archmelee','Parazon','Augment','Antik','Tome','Fahrzeuge']
    for width,height in ((1200,800),(900,500)):
        resize(width,height)
        render()
        check(f'{width}-preview-layout-present',js("return !!document.querySelector('[data-preview-mods-layout]')"))
        labels=js("return [...document.querySelectorAll('[data-preview-mods-categories] button')].map(e=>e.textContent.trim())")
        check(f'{width}-19-category-order',labels==english,labels)
        geometry=js("""const layout=document.querySelector('[data-preview-mods-layout]'),toolbar=document.querySelector('[data-preview-mods-toolbar]'),categories=document.querySelector('[data-preview-mods-categories]'),sort=document.querySelector('[data-preview-mods-sort]'),filters=document.querySelector('[data-preview-mods-filters]'),grid=document.querySelector('[data-preview-mods-grid]'),lr=layout.getBoundingClientRect(),gr=grid.getBoundingClientRect(),cards=[...document.querySelectorAll('[data-preview-mod-card]')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}});return {viewport:[innerWidth,innerHeight],body:{client:document.body.clientWidth,scroll:document.body.scrollWidth},layout:{left:lr.left,right:lr.right,width:lr.width},toolbar:{columns:getComputedStyle(toolbar).gridTemplateColumns,client:toolbar.clientWidth,scroll:toolbar.scrollWidth},categories:{client:categories.clientWidth,scroll:categories.scrollWidth,overflow:getComputedStyle(categories).overflowX,wrap:getComputedStyle(categories).flexWrap},sort:{client:sort.clientWidth,scroll:sort.scrollWidth,overflow:getComputedStyle(sort).overflowX},filters:{client:filters.clientWidth,scroll:filters.scrollWidth,overflow:getComputedStyle(filters).overflowX},grid:{left:gr.left,right:gr.right,columns:getComputedStyle(grid).gridTemplateColumns},cards};""")
        result['geometry'].append({'size':[width,height],**geometry})
        check(f'{width}-body-no-horizontal-overflow',geometry['body']['scroll']<=geometry['body']['client']+1,geometry['body'])
        check(f'{width}-layout-in-bounds',geometry['layout']['left']>=0 and geometry['layout']['right']<=width+1,geometry['layout'])
        check(f'{width}-toolbar-columns',len(geometry['toolbar']['columns'].split())==(2 if width==1200 else 1),geometry['toolbar'])
        check(f'{width}-category-scroll-contained',geometry['categories']['scroll']>geometry['categories']['client'] and geometry['categories']['overflow']=='auto' and geometry['categories']['wrap']=='nowrap',geometry['categories'])
        check(f'{width}-dense-controls-contained',geometry['sort']['overflow']=='auto' and geometry['filters']['overflow']=='auto',{'sort':geometry['sort'],'filters':geometry['filters']})
        check(f'{width}-card-widths-and-bounds',all(abs(card['width']-200)<1 and card['left']>=geometry['grid']['left']-1 and card['right']<=geometry['grid']['right']+1 for card in geometry['cards']),geometry['cards'][:4])
        check(f'{width}-grid-columns',len(geometry['grid']['columns'].split())==(3 if width==1200 else 2),geometry['grid']['columns'])
        for label in english:
            activated=click_category(label)
            active=js("const e=[...document.querySelectorAll('[data-preview-mods-categories] button')].find(e=>e.textContent.trim()===arguments[0]);return !!e&&e.classList.contains('bg-kronos-accent')",[label])
            check(f'{width}-category-{label}',activated and active)
        render()
        first=js("return document.querySelector('[data-preview-mod-card]')")
        focused=js("const e=document.querySelector('[data-preview-mod-card]');e.focus();return document.activeElement===e&&e.getAttribute('role')==='button'&&e.tabIndex===0")
        press('\ue007')
        check(f'{width}-card-enter-opens-drawer',bool(first) and focused and js("return !!document.querySelector('.fixed.bottom-0')"))
        click("document.querySelector('.fixed.bottom-0 button')")
        render()
        focused=js("const e=document.querySelector('[data-preview-mod-card]');e.focus();return document.activeElement===e")
        press(' ')
        check(f'{width}-card-space-opens-drawer',focused and js("return !!document.querySelector('.fixed.bottom-0')"))
        click("document.querySelector('.fixed.bottom-0 button')")

    resize(1200,800)
    render()
    check('initial-page-size-60',len(card_names())==60,len(card_names()))
    check('sticker-excluded','Excluded Sticker' not in card_names())
    subtitle=js("return document.body.innerText")
    check('header-statistics','75 TOTAL · 75 UNIQUE · 56 DUPLICATE' in subtitle,subtitle[:500])
    load=click("[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Load More'))")
    names=card_names()
    check('load-more-to-75',load and len(names)==75 and len(set(names))==75,len(names))
    click_filter('Max Rank')
    check('max-rank-filter',all(int(name[-3:])%6==5 for name in card_names() if name.startswith('Synthetic Mod')),card_names()[:12])
    click_filter('Max Rank')
    check('filter-change-resets-page-to-60',len(card_names())==60,len(card_names()))

    search_cases=[
        ('Synthetic Mod 010',['Synthetic Mod 010']),
        ('solar trigger',['Synthetic Mod 002']),
        ('lunar statistic',['Synthetic Mod 003']),
        ('emerald family',['Synthetic Mod 004']),
        ('amanata',['Shrine Maiden'])
    ]
    for query,expected in search_cases:
        render()
        check('search-input-'+query,set_search(query))
        check('search-result-'+query,card_names()==expected,card_names())
    render()
    set_search('solar missing')
    check('search-multi-term-and-no-match',len(card_names())==0 and 'No mods match your filters.' in js('return document.body.innerText'))

    render()
    click_category('Exilus')
    check('exilus-cross-category-trait',card_names()==['Cross Family Exilus'],card_names())
    render()
    click_category('Tome')
    check('tome-exclusive-category','Cross Family Exilus' in card_names() and all((int(name[-3:])%17==15) if name.startswith('Synthetic Mod') else True for name in card_names()),card_names())
    render()
    click_filter('Owned')
    check('ownership-owned',all((int(name[-3:])%3)!=0 for name in card_names() if name.startswith('Synthetic Mod')),card_names()[:15])
    click_filter('Unowned')
    check('ownership-unowned',all((int(name[-3:])%3)==0 for name in card_names() if name.startswith('Synthetic Mod')),card_names()[:15])
    click_filter('All')
    check('ownership-all-active',js("return [...document.querySelectorAll('[data-preview-mods-filters] button')].find(e=>e.textContent.trim()==='All').classList.contains('bg-kronos-accent')"))
    render()
    before_count=len(card_names())
    click_filter('Hide Conclave')
    check('hide-conclave-filter','Synthetic Mod 006' not in card_names() and '74 TOTAL' in js('return document.body.innerText'),{'before_visible':before_count,'after_visible':len(card_names()),'item_absent':'Synthetic Mod 006' not in card_names()})
    render()
    click_category('Tome')
    click_filter('Owned')
    click_filter('Max Rank')
    check('combined-category-owned-max-rank',card_names()==['Cross Family Exilus'],card_names())

    sort_labels=['Name','Rank','Count','Rarity','Value (Maxed)']
    prices={'/Synthetic/Mod_010':99,'/Synthetic/Mod_020':40}
    for label in sort_labels:
        render(prices=prices)
        if label!='Name':
            click_sort(label)
        asc=card_names()
        click_sort(label)
        desc=card_names()
        direction=js("const e=[...document.querySelectorAll('[data-preview-mods-sort] button')].find(e=>e.textContent.trim().startsWith(arguments[0]));return e.querySelector('svg')?.classList.contains('rotate-180')",[label])
        check('sort-'+label+'-both-directions',len(asc)==60 and len(desc)==60 and asc!=desc and direction,{'asc':asc[:3],'desc':desc[:3]})
    render(prices=prices)
    click_sort('Value (Maxed)')
    click_sort('Value (Maxed)')
    check('value-desc-highest-first',card_names()[0]=='Synthetic Mod 010',card_names()[:3])

    render(prices={'/Synthetic/Mod_001':42})
    body=js('return document.body.innerText')
    check('positive-price-visible','42p' in body)
    check('no-zero-price-badge','0p' not in body)
    check('no-sell-control',not js("return [...document.querySelectorAll('button')].some(e=>/sell/i.test(e.textContent))"))
    render(mode='price-loading')
    check('price-loading-visible','fetching prices...' in js('return document.body.innerText').lower())
    check('price-loading-card-skeletons',js("return document.querySelectorAll('[data-preview-mod-card] .animate-pulse').length")>0)
    render(mode='price-progress')
    check('price-fetch-progress-visible','fetchingplatvalues3of9...' in js('return document.body.innerText').lower().replace(' ',''))

    state_text={
        'fix-extracting':'Extracting mod images…',
        'fix-fixing':'Processing mod images…',
        'fix-compositing':'Compositing mod images…',
        'fix-preparing':'Preparing mod images…'
    }
    for mode,text_value in state_text.items():
        render(mode=mode)
        body=js('return document.body.innerText')
        check(mode+'-state',text_value in body and '2 / 5' in body and 'SyntheticMod.png' in body,body)
    for mode in ('fix-checking','loading','frames-pending'):
        render(mode=mode)
        check(mode+'-spinner-no-cards',len(card_names())==0 and js("return !!document.querySelector('.animate-spin')"))
    render(mode='empty')
    check('no-inventory-monitor-state','no inventory data' in js('return document.body.innerText').lower() and len(card_names())==0,js('return document.body.innerText'))

    render(locale='de')
    labels=js("return [...document.querySelectorAll('[data-preview-mods-categories] button')].map(e=>e.textContent.trim())")
    check('german-labels-with-english-fallback',labels==german,labels)
    check('german-body-no-overflow',js('return document.body.scrollWidth<=document.body.clientWidth+1'))

    render()
    commands=js('return window.fixture.calls')
    command_names=sorted(set(call['command'] for call in commands))
    check('asset-and-override-commands',command_names==['get_icons_path','get_mod_frames_path','read_file_bytes'],command_names)
    check('no-market-mutation-commands',not any(name in command_names for name in ('post_market_order','update_market_order','close_market_order','delete_market_order')),command_names)
    check('no-fixture-errors',js('return window.fixture.errors.length')==0,js('return window.fixture.errors'))
    api('DELETE',prefix)
except Exception as error:
    result['error']=str(error)
finally:
    for process in reversed(processes):
        if process.poll() is None:
            try:
                if process.pid in groups:
                    os.killpg(process.pid,signal.SIGTERM)
                else:
                    process.terminate()
            except ProcessLookupError:
                pass
            try:
                process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
    for log in logs:
        log.close()
    (evidence/'mods-component.json').write_text(json.dumps(result,indent=2)+'\n')
    summary={'error':result.get('error'),'checks':len(result['checks']),'passed':sum(row['pass'] for row in result['checks']),'failures':[row for row in result['checks'] if not row['pass']]}
    print(json.dumps(summary,indent=2))
