import json,os,pathlib,select,signal,subprocess,tempfile,time,urllib.error,urllib.request
root=pathlib.Path('/var/home/jedwards/kiedas-orbiter')
base=root/'.preview-work'; fixture=base/'stage3-mastery/fixture/dist'; evidence=root/'docs/revamp/stage-3/evidence'
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]); os.nice(19)
scratch=pathlib.Path(tempfile.mkdtemp(prefix='mastery-component-',dir=base))
for name in ('runtime','xdgdata','config','cache'):(scratch/name).mkdir(parents=True,exist_ok=True)
(scratch/'runtime').chmod(0o700)
env=os.environ.copy(); env.update(XDG_DATA_HOME=str(scratch/'xdgdata'),XDG_CONFIG_HOME=str(scratch/'config'),XDG_CACHE_HOME=str(scratch/'cache'),XDG_RUNTIME_DIR=str(scratch/'runtime'),TAURI_WEBVIEW_AUTOMATION='true',WEBKIT_DISABLE_DMABUF_RENDERER='1',LIBGL_ALWAYS_SOFTWARE='1',LP_NUM_THREADS='2',OMP_NUM_THREADS='2')
env.pop('DBUS_SESSION_BUS_ADDRESS',None); env.pop('WAYLAND_DISPLAY',None)
app=pathlib.Path('/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/MSanBrowser'.replace('MSanBrowser','MiniBrowser')); bins=pathlib.Path('/usr/bin')
processes=[]; groups=set(); logs=[]
result={'tier':'styled component browser with module mocks','fixture':'synthetic display data; no live game or mastery-formula claims','checks':[],'geometry':[],'stable_comparisons':[]}
def start(args,name,**kwargs):
 log=open(evidence/name,'w'); logs.append(log); p=subprocess.Popen(args,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True,**kwargs); processes.append(p); groups.add(p.pid); return p
def api(method,path,data=None):
 req=urllib.request.Request('http://127.0.0.1:17789'+path,data=None if data is None else json.dumps(data).encode(),method=method,headers={'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=45) as response: return json.load(response)
 except urllib.error.HTTPError as ex: raise RuntimeError(ex.read().decode())
def check(name,value,detail=None):
 row={'name':name,'pass':bool(value)}
 if detail is not None: row['detail']=detail
 result['checks'].append(row)
try:
 display=1921; env['DISPLAY']='127.0.0.1:'+str(display)
 xvfb=start([str(bins/'Xvfb'),':'+str(display),'-screen','0','1200x800x24','-nolisten','unix','-listen','tcp','-ac'],'mastery-component-xvfb.log'); time.sleep(2)
 if xvfb.poll() is not None: raise RuntimeError('Xvfb failed')
 conf=scratch/'dbus.conf'; conf.write_text('<busconfig><type>session</type><listen>unix:tmpdir='+str(scratch/'runtime')+'</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/></policy></busconfig>')
 bus=subprocess.Popen([str(bins/'dbus-daemon'),'--nofork','--print-address=1','--config-file='+str(conf)],env=env,stdout=subprocess.PIPE,stderr=open(evidence/'mastery-component-dbus.log','w'),text=True); processes.append(bus)
 if not select.select([bus.stdout],[],[],5)[0]: raise RuntimeError('D-Bus failed')
 env['DBUS_SESSION_BUS_ADDRESS']=bus.stdout.readline().strip()
 driver=start([str(bins/'WebKitWebDriver'),'--port=17789'],'mastery-component-webdriver.log')
 server=start([str(bins/'python3'),'-m','http.server','18789','--bind','127.0.0.1','--directory',str(fixture)],'mastery-component-http.log')
 time.sleep(1)
 response=api('POST','/session',{'capabilities':{'alwaysMatch':{'webkitgtk:browserOptions':{'binary':str(app),'args':['--automation']}}}})
 session=response['value']['Links']['sessionId'] if 'Links' in response.get('value',{}) else response['value']['sessionId']; prefix='/session/'+session
 api('POST',prefix+'/url',{'url':'http://127.0.0.1:18789/'}); time.sleep(1)
 def js(script,args=[]): return api('POST',prefix+'/execute/sync',{'script':script,'args':args})['value']
 def render(**kwargs): js('window.fixture.render(arguments[0])',[kwargs]); time.sleep(.22)
 def resize(width,height):
  api('POST',prefix+'/window/rect',{'width':width,'height':height}); time.sleep(.2)
  actual=js('return [innerWidth,innerHeight]'); rect=api('GET',prefix+'/window/rect')['value']
  api('POST',prefix+'/window/rect',{'width':rect['width']+width-actual[0],'height':rect['height']+height-actual[1]}); time.sleep(.2)
 def click(script,args=[]):
  value=js("const e=("+script+");if(!e)return false;e.scrollIntoView({block:'center'});e.click();return true",args); time.sleep(.12); return value
 def press(value):
  api('POST',prefix+'/actions',{'actions':[{'type':'key','id':'mastery-keyboard','actions':[{'type':'keyDown','value':value},{'type':'keyUp','value':value}]}]}); time.sleep(.12)
  try: api('DELETE',prefix+'/actions')
  except Exception: pass
 def close_modal(): return click("document.querySelector('[data-preview-mastery-modal] button')")
 # Exact stable DOM in all registered top-level/rank states.
 stable_states=[
  ('loading',{'mode':'loading'}),('no-inventory',{'mode':'empty'}),('mr0',{'mode':'populated','rank':0,'progress':0}),
  ('mr15-progress',{'mode':'populated','rank':15,'progress':42.5}),('mr30',{'mode':'populated','rank':30,'progress':55}),
  ('legendary',{'mode':'populated','rank':31,'progress':65}),('rank-ready',{'mode':'populated','rank':15,'progress':100})]
 for name,args in stable_states:
  render(variant='before',**args); before=js('return document.getElementById("root").innerHTML')
  render(variant='stable',**args); after=js('return document.getElementById("root").innerHTML')
  same=bool(before) and before==after; result['stable_comparisons'].append({'state':name,'equal':same,'before_length':len(before),'after_length':len(after)}); check('stable-'+name+'-exact-markup',same)
 # Stable pointer action and modal output remain exact.
 render(variant='before'); click("document.querySelector('.cursor-pointer')"); before_modal=js('return document.getElementById("root").innerHTML')
 render(variant='stable'); click("document.querySelector('.cursor-pointer')"); after_modal=js('return document.getElementById("root").innerHTML'); check('stable-pointer-modal-exact-markup',before_modal==after_modal,{'before_length':len(before_modal),'after_length':len(after_modal)})
 labels=['Warframe','Primary','Secondary','Melee','Kitgun','Zaw','Amp','Sentinel','Sentinel Weapon','MOA','Hound','Robotics','Companions','Archwing','Archgun','Archmelee','Necramech','K-Drive','Plexus','Vehicles','Railjack Intrinsic','Drifter Intrinsic','Starchart','The Steel Path']
 for width,height in ((1200,800),(900,500)):
  resize(width,height); render(variant='preview',rank=15,progress=42.5)
  check(f'{width}-preview-layout',js("return !!document.querySelector('[data-preview-mastery-layout]')"))
  actual=js("return [...document.querySelectorAll('[data-preview-mastery-card]')].map(e=>e.querySelector('span')?.textContent.trim())")
  check(f'{width}-24-row-order',actual==labels,actual)
  geom=js("""const layout=document.querySelector('[data-preview-mastery-layout]'),lr=layout.getBoundingClientRect(),rank=document.querySelector('[data-preview-mastery-rank-state]'),rr=rank.getBoundingClientRect(),items=document.querySelector('[data-preview-mastery-grid="items"]'),secondary=document.querySelector('[data-preview-mastery-secondary]');return {viewport:[innerWidth,innerHeight],body:{client:document.body.clientWidth,scroll:document.body.scrollWidth},layout:{left:lr.left,right:lr.right,width:lr.width},rank:{left:rr.left,right:rr.right,width:rr.width},itemColumns:getComputedStyle(items).gridTemplateColumns.split(' ').length,secondaryColumns:getComputedStyle(secondary).gridTemplateColumns.split(' ').length};""")
  result['geometry'].append({'state':'progress','size':[width,height],**geom})
  check(f'{width}-body-no-horizontal-overflow',geom['body']['scroll']<=geom['body']['client']+1,geom)
  check(f'{width}-rank-in-bounds',geom['rank']['left']>=geom['layout']['left']-1 and geom['rank']['right']<=geom['layout']['right']+1,geom)
  check(f'{width}-item-grid-columns',geom['itemColumns']==(4 if width==1200 else 3),geom['itemColumns'])
  check(f'{width}-secondary-columns',geom['secondaryColumns']==(2 if width==1200 else 1),geom['secondaryColumns'])
  # Every row opens by pointer, Enter, and Space.
  for index,label in enumerate(labels):
   render(variant='preview')
   pointer=click("document.querySelectorAll('[data-preview-mastery-card]')[arguments[0]]",[index])
   heading=jsയിലാണ് if False else js("return document.querySelector('[data-preview-mastery-modal] h3')?.textContent||''")
   check(f'{width}-pointer-{label}',pointer and label in heading); close_modal()
   for key_name,key_value in [('enter','\ue007'),('space',' ')]:
    render(variant='preview')
    focused=js("const e=document.querySelectorAll('[data-preview-mastery-card]')[arguments[0]];e.focus();return document.activeElement===e",[index])
    press(key_value); heading=js("return document.querySelector('[data-preview-mastery-modal] h3')?.textContent||''")
    check(f'{width}-{key_name}-{label}',focused and label in heading)
    close_modal()
  # Rank-up state geometry and existing art.
  render(variant='preview',rank=15,progress=100)
  ready=js("""const panel=document.querySelector('[data-preview-mastery-rank-state="ready"]'),content=panel.children[0].getBoundingClientRect(),art=document.querySelector('[data-preview-mastery-art]').getBoundingClientRect(),pr=panel.getBoundingClientRect(),img=document.querySelector('[data-preview-mastery-art] img');return {body:{client:document.body.clientWidth,scroll:document.body.scrollWidth},panel:{left:pr.left,right:pr.right,height:pr.height},content:{left:content.left,right:content.right,top:content.top,bottom:content.bottom},art:{left:art.left,right:art.right,top:art.top,bottom:art.bottom},artSrc:img.getAttribute('src'),text:panel.innerText};""")
  result['geometry'].append({'state':'ready','size':[width,height],**ready})
  overlap=not (ready['content']['right']<=ready['art']['left'] or ready['art']['right']<=ready['content']['left'] or ready['content']['bottom']<=ready['art']['top'] or ready['art']['bottom']<=ready['content']['top'])
  check(f'{width}-ready-body-no-overflow',ready['body']['scroll']<=ready['body']['client']+1,ready)
  check(f'{width}-ready-text-art-no-overlap',not overlap,{'content':ready['content'],'art':ready['art']})
  check(f'{width}-ready-content-and-art','mastery rank up available' in ready['text'].lower() and '/fixture/ui/teshin.png' in ready['artSrc'],ready)
 # Rank range presentation.
 for name,rank,progress,fragments in [
  ('mr0',0,0,['Mastery Rank 0','Unranked']),('mr15',15,42.5,['Mastery Rank 15','Hunter']),
  ('mr30',30,55,['Mastery Rank 30','True Master','LR1']),('lr1',31,65,['Legendary Rank 1','Legendary 1','LR2'])]:
  render(variant='preview',rank=rank,progress=progress); body=js('return document.body.innerText'); check('rank-state-'+name,all(x in body for x in fragments),body[:1000])
 render(variant='preview',rank=15,progress=42.5); body=js('return document.body.innerText'); check('progress-fields','42.5%' in body and 'mastery' in body.lower() and 'left' in body.lower(),body[:1000])
 # Standard item detail ordering and close paths.
 render(variant='preview'); click("[...document.querySelectorAll('[data-preview-mastery-card]')].find(e=>e.querySelector('span')?.textContent.trim()==='Warframe')")
 modal=js("return document.querySelector('[data-preview-mastery-modal]')?.innerText||''"); check('item-detail-order',modal.index('Incomplete Item')<modal.index('Completed Item'),modal)
 check('item-detail-rank-mp','Rank12' in modal and '1200 MP' in modal,modal)
 check('dialog-semantics',js("const e=document.querySelector('[data-preview-mastery-modal]');return e?.getAttribute('role')==='dialog'&&e?.getAttribute('aria-modal')==='true'&&e?.getAttribute('aria-labelledby')==='preview-mastery-dialog-title'"))
 check('close-button-dismissal',close_modal() and not js("return !!document.querySelector('[data-preview-mastery-modal]')"))
 render(variant='preview'); click("document.querySelector('[data-preview-mastery-card]')")
 close_focused=js("const e=document.querySelector('[data-preview-mastery-modal] button');e.focus();return document.activeElement===e")
 press('\ue007'); check('close-button-keyboard-dismissal',close_focused and not js("return !!document.querySelector('[data-preview-mastery-modal]')"))
 render(variant='preview'); click("document.querySelector('[data-preview-mastery-card]')"); check('backdrop-dismissal',click("document.querySelector('[data-preview-mastery-modal]')") and not js("return !!document.querySelector('[data-preview-mastery-modal]')"))
 # Intrinsic detail.
 render(variant='preview'); click("[...document.querySelectorAll('[data-preview-mastery-card]')].find(e=>e.querySelector('span')?.textContent.trim()==='Railjack Intrinsic')"); modal=js("return document.querySelector('[data-preview-mastery-modal]')?.innerText||''"); check('intrinsic-detail','Railjack Tactical' in modal and 'Railjack Gunnery' in modal,modal); close_modal()
 # Origin Starchart details and filter persistence into Steel Path.
 render(variant='preview'); click("[...document.querySelectorAll('[data-preview-mastery-card]')].find(e=>e.querySelector('span')?.textContent.trim()==='Starchart')")
 modal=js("return document.querySelector('[data-preview-mastery-modal]')?.innerText||''"); check('origin-starchart-detail',all(x in modal.lower() for x in ['earth','mars','alpha','beta junction','gamma','junction','non-mastery']),modal)
 toggle=click("document.querySelector('[data-preview-mastery-modal] label > div')"); filtered=js("return document.querySelector('[data-preview-mastery-modal]')?.innerText||''"); check('hide-non-mastery-filter',toggle and 'Gamma' not in filtered and 'Alpha' in filtered,filtered); close_modal()
 click("[...document.querySelectorAll('[data-preview-mastery-card]')].find(e=>e.querySelector('span')?.textContent.trim()==='The Steel Path')")
 steel=js("return document.querySelector('[data-preview-mastery-modal]')?.innerText||''"); checked=js("return document.querySelector('[data-preview-mastery-modal] label > div')?.classList.contains('bg-kronos-accent')"); check('steel-path-detail-and-filter-persistence','Gamma' not in steel and 'Alpha' in steel and checked,steel); close_modal()
 # Empty category and empty Starchart bodies.
 render(variant='preview',emptyCategory='primary'); click("[...document.querySelectorAll('[data-preview-mastery-card]')].find(e=>e.querySelector('span')?.textContent.trim()==='Primary')"); check('empty-item-detail',js("return document.querySelector('[data-preview-mastery-modal]')?.innerText.includes('No items found')")); close_modal()
 render(variant='preview',emptyStarchart=True); click("[...document.querySelectorAll('[data-preview-mastery-card]')].find(e=>e.querySelector('span')?.textContent.trim()==='Starchart')"); check('empty-starchart-detail',js("return document.querySelector('[data-preview-mastery-modal]')?.innerText.includes('No mastery-eligible nodes')")); close_modal()
 # German layout and narrow modal bounds.
 for width,height in ((1200,800),(900,500)):
  resize(width,height); render(variant='preview',locale='de'); german=js("return [...document.querySelectorAll('[data-preview-mastery-card]')].map(e=>e.querySelector('span')?.textContent.trim())")
  check(f'{width}-german-24-rows',len(german)==24 and 'Nicht-Meisterschaft' not in german,german)
  check(f'{width}-german-body-no-overflow',js('return document.body.scrollWidth<=document.body.clientWidth+1'))
  click("document.querySelectorAll('[data-preview-mastery-card]')[22]")
  bounds=js("const m=document.querySelector('[data-preview-mastery-modal] > div').getBoundingClientRect();return {top:m.top,bottom:m.bottom,left:m.left,right:m.right,viewport:[innerWidth,innerHeight],heading:document.querySelector('[data-preview-mastery-modal] h3').textContent}")
  check(f'{width}-german-modal-bounds',bounds['top']>=0 and bounds['bottom']<=height and bounds['left']>=0 and bounds['right']<=width,bounds); close_modal()
 check('asset-commands',sorted({x['command'] for x in js('return window.fixture.calls')})==['get_mastery_icons_path','get_ui_path'],js('return window.fixture.calls'))
 check('no-fixture-errors',js('return window.fixture.errors.length')==0,js('return window.fixture.errors'))
 api('DELETE',prefix)
except Exception as ex:
 result['error']=str(ex)
finally:
 for p in reversed(processes):
  if p.poll() is None:
   try: os.killpg(p.pid,signal.SIGTERM) if p.pid in groups else p.terminate()
   except ProcessLookupError: pass
   try: p.wait(timeout=8)
   except subprocess.TimeoutExpired: p.kill(); p.wait()
 for f in logs: f.close()
 (evidence/'mastery-component.json').write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps({'error':result.get('error'),'checks':len(result['checks']),'passed':sum(x['pass'] for x in result['checks']),'failures':[x for x in result['checks'] if not x['pass']][:20]},indent=2))
