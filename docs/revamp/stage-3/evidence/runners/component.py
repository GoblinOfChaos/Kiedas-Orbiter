import os,pathlib,subprocess,time,json,urllib.request,urllib.error,tempfile,signal
root=pathlib.Path('/var/home/jedwards/kiedas-orbiter')
base=root/'.preview-work'
fixture=base/'stage3-inventory/fixture/dist'
evidence=root/'docs/revamp/stage-3/evidence'
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
scratch=pathlib.Path(tempfile.mkdtemp(prefix='inventory-component-',dir=base))
for name in ['runtime','xdgdata','config','cache']:(scratch/name).mkdir(parents=True,exist_ok=True)
(scratch/'runtime').chmod(0o700)
env=os.environ.copy();env.update(XDG_DATA_HOME=str(scratch/'xdgdata'),XDG_CONFIG_HOME=str(scratch/'config'),XDG_CACHE_HOME=str(scratch/'cache'),XDG_RUNTIME_DIR=str(scratch/'runtime'),TAURI_WEBVIEW_AUTOMATION='true',WEBKIT_DISABLE_DMABUF_RENDERER='1',LIBGL_ALWAYS_SOFTWARE='1',LP_NUM_THREADS='2',OMP_NUM_THREADS='2')
env.pop('DBUS_SESSION_BUS_ADDRESS',None);env.pop('WAYLAND_DISPLAY',None)
app=pathlib.Path('/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/MiniBrowser')
bins=pathlib.Path('/usr/bin')
processes=[];groups=set();logs=[]
result={'tier':'component browser with module mocks','fixture':'synthetic display data; no live game or market claims','checks':[],'geometry':[],'stable_comparisons':[]}
def start(args,name,**kwargs):
 log=open(evidence/name,'w');logs.append(log);p=subprocess.Popen(args,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True,**kwargs);processes.append(p);groups.add(p.pid);return p
def api(method,path,data=None):
 req=urllib.request.Request('http://127.0.0.1:17779'+path,data=None if data is None else json.dumps(data).encode(),method=method,headers={'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=45) as response:return json.load(response)
 except urllib.error.HTTPError as ex:raise RuntimeError(ex.read().decode())
# repair intentionally impossible token before execution guard
def check(name,value,detail=None):
 row={'name':name,'pass':bool(value)}
 if detail is not None:row['detail']=detail
 result['checks'].append(row)
try:
 display=1911
 env['DISPLAY']='127.0.0.1:'+str(display)
 xvfb=start([str(bins/'Xvfb'),':'+str(display),'-screen','0','1200x800x24','-nolisten','unix','-listen','tcp','-ac'],'inventory-component-xvfb.log')
 time.sleep(2)
 if xvfb.poll() is not None:raise RuntimeError('Xvfb failed')
 conf=scratch/'dbus.conf';conf.write_text('<busconfig><type>session</type><listen>unix:tmpdir='+str(scratch/'runtime')+'</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/></policy></busconfig>')
 bus=subprocess.Popen([str(bins/'dbus-daemon'),'--nofork','--print-address=1','--config-file='+str(conf)],env=env,stdout=subprocess.PIPE,stderr=open(evidence/'inventory-component-dbus.log','w'),text=True)
 processes.append(bus)
 import select
 if not select.select([bus.stdout],[],[],5)[0]:raise RuntimeError('D-Bus failed')
 env['DBUS_SESSION_BUS_ADDRESS']=bus.stdout.readline().strip()
 driver=start([str(bins/'WebKitWebDriver'),'--port=17779'],'inventory-component-webdriver.log')
 server=start([str(bins/'python3'),'-m','http.server','18779','--bind','127.0.0.1','--directory',str(fixture)],'inventory-component-http.log')
 time.sleep(1)
 response=api('POST','/session',{'capabilities':{'alwaysMatch':{'webkitgtk:browserOptions':{'binary':str(app),'args':['--automation']}}}})
 session=response['value']['Links']['sessionId'] if 'Links' in response.get('value',{}) else response['value']['sessionId']
 prefix='/session/'+session
 api('POST',prefix+'/url',{'url':'http://127.0.0.1:18779/'})
 time.sleep(1)
 def js(script,args=[]):return api('POST',prefix+'/execute/sync',{'script':script,'args':args})['value']
 def render(variant='preview',mode='populated',prices=None):
  js('window.fixture.render(arguments[0])',[{'variant':variant,'mode':mode,'prices':prices or {}}]);time.sleep(.12)
 def resize(width,height):
  api('POST',prefix+'/window/rect',{'width':width,'height':height});time.sleep(.2)
  actual=js('return [innerWidth,innerHeight]');rect=api('GET',prefix+'/window/rect')['value']
  api('POST',prefix+'/window/rect',{'width':rect['width']+width-actual[0],'height':rect['height']+height-actual[1]});time.sleep(.2)
 def click_node(script,args=[]):
  ok=js("const e=("+script+");if(!e)return false;e.scrollIntoView({block:'center'});e.click();return true",args);time.sleep(.12);return ok
 # stable before/after exact rendering
 for mode in ['populated','loading','empty']:
  render('before',mode);before=js('return document.getElementById("root").innerHTML')
  render('stable',mode);after=js('return document.getElementById("root").innerHTML')
  same=bool(before) and before==after
  result['stable_comparisons'].append({'mode':mode,'equal':same,'before_length':len(before),'after_length':len(after)})
  check('stable-'+mode+'-exact-markup',same)
 check('stable-has-no-preview-layout',not js("return !!document.querySelector('[data-preview-inventory-layout]')"))
 labels=['All','Warframes','Weapons','Companions','Companion Weapons','Archweapons','Vehicles','Amps','Arcanes','Peely Pix','Consumables','Landing Craft','Resources','Prime Sets','Ayatan']
 for width,height in [(1200,800),(900,500)]:
  resize(width,height);render()
  check(str(width)+'-preview-layout-present',js("return !!document.querySelector('[data-preview-inventory-layout]')"))
  tabs=js("return [...document.querySelectorAll('.preview-inventory-controls > div > div > div:nth-child(2) > button')].map(e=>e.textContent.trim())")
  check(str(width)+'-15-tabs-order',tabs==labels,tabs)
  geometry=js("""const root=document.querySelector('[data-preview-inventory-layout]'),rr=root.getBoundingClientRect(),stats=document.querySelector('.preview-inventory-stats'),cats=document.querySelector('.preview-inventory-controls > div > div > div:nth-child(2)'),toolbar=document.querySelector('.preview-inventory-controls > div > div > div:first-child');return {viewport:[innerWidth,innerHeight],root:{left:rr.left,right:rr.right,width:rr.width},body:{scroll:document.body.scrollWidth,client:document.body.clientWidth},stats:{scroll:stats?.scrollWidth,client:stats?.clientWidth},categories:{scroll:cats?.scrollWidth,client:cats?.clientWidth,overflow:getComputedStyle(cats).overflowX,wrap:getComputedStyle(cats).flexWrap,html:cats?.outerHTML.slice(0,500)},toolbar:{scroll:toolbar?.scrollWidth,client:toolbar?.clientWidth,columns:getComputedStyle(toolbar).gridTemplateColumns}}""")
  result['geometry'].append({'size':[width,height],**geometry})
  check(str(width)+'-root-horizontal-bounds',geometry['root']['left']>=0 and geometry['root']['right']<=width)
  check(str(width)+'-body-no-horizontal-overflow',geometry['body']['scroll']<=geometry['body']['client']+1,geometry['body'])
  check(str(width)+'-categories-scroll-contained',geometry['categories']['scroll']>=geometry['categories']['client'] and geometry['categories']['overflow']=='auto' and geometry['categories']['wrap']=='nowrap',geometry['categories'])
  expected_columns=2 if width==1200 else 1
  check(str(width)+'-toolbar-columns',len(geometry['toolbar']['columns'].split())==expected_columns,geometry['toolbar'])
  account=js("return document.querySelector('[aria-label=\"Account resources\"]')?.textContent||''");check(str(width)+'-account-resources-visible','Credits' in account and ('123,456' in account or '123456' in account),account)
  for label in labels:
   clicked=click_node("[...document.querySelectorAll('.preview-inventory-controls > div > div > div:nth-child(2) > button')].find(e=>e.textContent.trim()===arguments[0])",[label])
   active=js("const e=[...document.querySelectorAll('.preview-inventory-controls > div > div > div:nth-child(2) > button')].find(e=>e.textContent.trim()===arguments[0]);return !!e&&e.classList.contains('bg-kronos-accent')",[label])
   check(str(width)+'-tab-'+label,clicked and active)
  check(str(width)+'-no-reachable-sell',not js("return [...document.querySelectorAll('button')].some(e=>/sell/i.test(e.textContent))"))
  # Native keyboard activation and focus retention for both ends of the scrolling category strip.
  category_selector='.preview-inventory-controls > div > div > div:nth-child(2) > button'
  first_focus=js("const e=document.querySelector(arguments[0]);e.focus();return document.activeElement===e",[category_selector])
  check(str(width)+'-keyboard-first-focus',first_focus)
  api('POST',prefix+'/actions',{'actions':[{'type':'key','id':'inventory-keyboard','actions':[{'type':'keyDown','value':'\ue007'},{'type':'keyUp','value':'\ue007'}]}]});time.sleep(.12)
  check(str(width)+'-keyboard-first-activate',js("const e=document.querySelector(arguments[0]);return document.activeElement===e&&e.classList.contains('bg-kronos-accent')",[category_selector]))
  last_focus=js("const a=document.querySelectorAll(arguments[0]),e=a[a.length-1];e.focus();return document.activeElement===e",[category_selector])
  check(str(width)+'-keyboard-last-focus',last_focus)
  api('POST',prefix+'/actions',{'actions':[{'type':'key','id':'inventory-keyboard','actions':[{'type':'keyDown','value':'\ue007'},{'type':'keyUp','value':'\ue007'}]}]});time.sleep(.12)
  check(str(width)+'-keyboard-last-activate',js("const a=document.querySelectorAll(arguments[0]),e=a[a.length-1];return document.activeElement===e&&e.classList.contains('bg-kronos-accent')",[category_selector]))
  # Prime set prices: absent does not render 0p; positive renders; loading indicator persists.
  render('preview','populated',{});click_node("[...document.querySelectorAll('.preview-inventory-controls > div > div > div:nth-child(2) > button')].find(e=>e.textContent.trim()==='Prime Sets')")
  body=js('return document.body.innerText')
  check(str(width)+'-prime-absent-no-0p','0p' not in body)
  check(str(width)+'-prime-absent-no-sell','Sell' not in body)
  render('preview','populated',{'/Lotus/Prime/SyntheticSet':42});click_node("[...document.querySelectorAll('.preview-inventory-controls > div > div > div:nth-child(2) > button')].find(e=>e.textContent.trim()==='Prime Sets')")
  check(str(width)+'-prime-positive-42p',js("return document.body.innerText.includes('42p')"))
  render('preview','price-loading',{});click_node("[...document.querySelectorAll('.preview-inventory-controls > div > div > div:nth-child(2) > button')].find(e=>e.textContent.trim()==='Prime Sets')")
  check(str(width)+'-prime-loading-visible',js("return document.body.innerText.toLowerCase().includes('fetching')"))
 # Search, filters, sort, resets.
 resize(1200,800);render()
 inp=api('POST',prefix+'/element',{'using':'css selector','value':'.preview-inventory-controls input'})['value']['element-6066-11e4-a52e-4f735466cecf']
 api('POST',prefix+'/element/'+inp+'/value',{'text':'Resource 01','value':['Resource 01']});time.sleep(.15)
 names=js("return [...document.querySelectorAll('h4')].map(e=>e.textContent.trim())")
 check('search-all-words',names==['Synthetic Resource 01'],names)
 render();click_node("[...document.querySelectorAll('.preview-inventory-controls > div > div > div:nth-child(2) > button')].find(e=>e.textContent.trim()==='Weapons')")
 # Exercise representative owned triple, triple cycle, binary filter and sort toggle.
 check('owned-filter-click',click_node("[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Owned')"))
 check('owned-filter-active',js("return [...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Owned').classList.contains('bg-kronos-accent')"))
 check('prime-filter-yes',click_node("[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='prime')") and js("return [...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='prime').classList.contains('bg-kronos-accent')"))
 click_node("[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='prime')")
 check('prime-filter-no',js("return [...document.querySelectorAll('button')].some(e=>e.textContent.trim().toLowerCase().includes('prime')&&e.classList.contains('text-red-400'))"))
 check('binary-primary-filter',click_node("[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='primary')"))
 click_node("[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='XP')")
 click_node("[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='XP')")
 check('sort-direction-toggle',js("return [...document.querySelectorAll('button')].find(e=>e.textContent.trim().startsWith('XP')).querySelector('svg')?.classList.contains('rotate-180')"))
 click_node("[...document.querySelectorAll('.preview-inventory-controls > div > div > div:nth-child(2) > button')].find(e=>e.textContent.trim()==='Resources')")
 check('category-reset-owned',not js("return [...document.querySelectorAll('button')].some(e=>e.textContent.trim()==='Owned'&&e.classList.contains('bg-kronos-accent'))"))
 check('category-reset-name-sort',js("return [...document.querySelectorAll('button')].find(e=>e.textContent.trim().startsWith('Name'))?.classList.contains('bg-kronos-accent')"))
 # Exhaustive configured filter and sort matrix for every reachable tab.
 matrix = {
  'All': (['owned','mastered'], ['Name','XP']),
  'Warframes': (['owned','mastered','subsumed','prime'], ['Name','XP']),
  'Weapons': (['owned','mastered','prime','primary','secondary','melee','incarnon'], ['Name','XP']),
  'Companions': (['owned','mastered'], ['Name','XP']),
  'Companion Weapons': (['owned','mastered'], ['Name','XP']),
  'Archweapons': (['owned','mastered'], ['Name','XP']),
  'Vehicles': (['owned','mastered','archwing','kdrive','necramech'], ['Name','XP']),
  'Amps': (['owned','mastered'], ['Name','XP']),
  'Arcanes': (['owned'], ['Name','Count','Rank']),
  'Peely Pix': (['owned'], ['Name','Count']),
  'Consumables': (['owned'], ['Name','Count']),
  'Landing Craft': (['owned'], ['Name']),
  'Resources': (['owned'], ['Name','Count']),
  'Prime Sets': (['owned','mastered','vaulted'], ['Name','Completion','Value']),
  'Ayatan': (['socketed'], ['Name','Count']),
 }
 triple={'mastered','subsumed','socketed','prime','vaulted'}
 def activate_tab(label):
  return click_node("[...document.querySelectorAll('.preview-inventory-controls > div > div > div:nth-child(2) > button')].find(e=>e.textContent.trim()===arguments[0])",[label])
 def control_buttons(which):
  index=1 if which=='filter' else 2
  return js("const t=document.querySelector('.preview-inventory-controls > div > div > div:first-child');return [...t.children[arguments[0]].querySelectorAll('button')].map(e=>e.textContent.trim())",[index])
 for tab,(filters,sorts) in matrix.items():
  render();activate_tab(tab)
  expected_filter_labels=[]
  for f in filters:
   expected_filter_labels += ['All','Owned','Unowned'] if f=='owned' else [f]
  actual_filters=control_buttons('filter')
  check('matrix-'+tab+'-filter-controls', [x.lower() for x in actual_filters]==[x.lower() for x in expected_filter_labels],actual_filters)
  actual_sorts=control_buttons('sort')
  check('matrix-'+tab+'-sort-controls',actual_sorts==sorts,actual_sorts)
  for f in filters:
   render();activate_tab(tab)
   if f=='owned':
    yes=click_node("(()=>{const t=document.querySelector('.preview-inventory-controls > div > div > div:first-child');return [...t.children[1].querySelectorAll('button')].find(e=>e.textContent.trim()==='Owned')})()")
    yes_active=js("return (()=>{const t=document.querySelector('.preview-inventory-controls > div > div > div:first-child');return [...t.children[1].querySelectorAll('button')].find(e=>e.textContent.trim()==='Owned')})()?.classList.contains('bg-kronos-accent')")
    no=click_node("(()=>{const t=document.querySelector('.preview-inventory-controls > div > div > div:first-child');return [...t.children[1].querySelectorAll('button')].find(e=>e.textContent.trim()==='Unowned')})()")
    no_active=js("return (()=>{const t=document.querySelector('.preview-inventory-controls > div > div > div:first-child');return [...t.children[1].querySelectorAll('button')].find(e=>e.textContent.trim()==='Unowned')})()?.classList.contains('bg-kronos-accent')")
    reset=click_node("(()=>{const t=document.querySelector('.preview-inventory-controls > div > div > div:first-child');return [...t.children[1].querySelectorAll('button')].find(e=>e.textContent.trim()==='All')})()")
    all_active=js("return (()=>{const t=document.querySelector('.preview-inventory-controls > div > div > div:first-child');return [...t.children[1].querySelectorAll('button')].find(e=>e.textContent.trim()==='All')})()?.classList.contains('bg-kronos-accent')")
    check('matrix-'+tab+'-filter-owned-states',yes and yes_active and no and no_active and reset and all_active,{'yes':yes,'yes_active':yes_active,'no':no,'no_active':no_active,'reset':reset,'all_active':all_active})
   else:
    selector="(()=>{const t=document.querySelector('.preview-inventory-controls > div > div > div:first-child');return [...t.children[1].querySelectorAll('button')].find(e=>e.textContent.trim().toLowerCase()===arguments[0])})()"
    yes=click_node(selector,[f])
    yes_active=js("const e=("+selector+");return !!e&&e.classList.contains('bg-kronos-accent')",[f])
    if f in triple:
     no=click_node(selector,[f])
     no_active=js("const e=("+selector+");return !!e&&e.classList.contains('text-red-400')",[f])
     reset=click_node(selector,[f])
     reset_clear=js("const e=("+selector+");return !!e&&!e.classList.contains('bg-kronos-accent')&&!e.classList.contains('text-red-400')",[f])
     check('matrix-'+tab+'-filter-'+f+'-states',yes and yes_active and no and no_active and reset and reset_clear)
    else:
     reset=click_node(selector,[f])
     reset_clear=js("const e=("+selector+");return !!e&&!e.classList.contains('bg-kronos-accent')",[f])
     check('matrix-'+tab+'-filter-'+f+'-states',yes and yes_active and reset and reset_clear)
  for sort in sorts:
   render();activate_tab(tab)
   selector="(()=>{const t=document.querySelector('.preview-inventory-controls > div > div > div:first-child');return [...t.children[2].querySelectorAll('button')].find(e=>e.textContent.trim().startsWith(arguments[0]))})()"
   first=click_node(selector,[sort])
   active=js("const e=("+selector+");return !!e&&e.classList.contains('bg-kronos-accent')",[sort])
   first_desc=js("const e=("+selector+");return !!e.querySelector('svg')?.classList.contains('rotate-180')",[sort])
   second=click_node(selector,[sort])
   second_desc=js("const e=("+selector+");return !!e.querySelector('svg')?.classList.contains('rotate-180')",[sort])
   check('matrix-'+tab+'-sort-'+sort+'-directions',first and active and second and first_desc!=second_desc)
 # Pagination automatic and manual.
 render();initial=js("return document.querySelectorAll('h4').length")
 check('pagination-initial-48',initial==48,initial)
 time.sleep(.7);automatic=js("return document.querySelectorAll('h4').length")
 check('pagination-auto-60',automatic==60,automatic)
 render();manual=click_node("[...document.querySelectorAll('button')].find(e=>e.textContent.trim().includes('Load More'))")
 manual_count=js("return document.querySelectorAll('h4').length")
 check('pagination-manual-load',manual and manual_count==60,manual_count)
 # Drawer activation and close.
 render();time.sleep(.1)
 opened=click_node("document.querySelector('h4')?.closest('.glass-panel')")
 check('acquisition-drawer-open',opened and js("return !!document.querySelector('.fixed.bottom-0')"))
 closed=click_node("document.querySelector('.fixed.bottom-0 button')")
 check('acquisition-drawer-close',closed and not js("return !!document.querySelector('.fixed.bottom-0')"))
 check('no-fixture-errors',js('return window.fixture.errors.length')==0,js('return window.fixture.errors'))
 api('DELETE',prefix)
except Exception as ex:
 result['error']=str(ex)
finally:
 for p in reversed(processes):
  if p.poll() is None:
   try:os.killpg(p.pid,signal.SIGTERM) if p.pid in groups else p.terminate()
   except ProcessLookupError:pass
   try:p.wait(timeout=8)
   except subprocess.TimeoutExpired:p.kill();p.wait()
 for f in logs:f.close()
 (evidence/'inventory-component.json').write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(result,indent=2))
