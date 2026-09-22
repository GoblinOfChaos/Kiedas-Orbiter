import os, pathlib, subprocess, time, socket, fcntl, struct, json, urllib.request, urllib.error, hashlib, shutil, signal
base=pathlib.Path('/var/home/jedwards/kiedas-orbiter/.preview-work'); evidence=base.parent/'docs/revamp/stage-3/evidence'
os.sched_setaffinity(0, sorted(os.sched_getaffinity(0))[:4]); os.nice(19)
# The caller creates a PRIVATE network namespace. Enable its loopback only.
# Podman --network=none supplies an isolated loopback interface.
import tempfile
scratch=pathlib.Path(tempfile.mkdtemp(prefix='native-smoke-',dir=base))
for name in ['runtime','xdgdata','config','cache','legacy/data/user']:(scratch/name).mkdir(parents=True,exist_ok=True)
(scratch/'runtime').chmod(0o700)
legacy=scratch/'legacy/data/user';sentinel=b'{"wfm_token":"SYNTHETIC-DO-NOT-IMPORT","autoStartMonitoring":true}'
(legacy/'settings.json').write_bytes(sentinel);(legacy/'sentinel.txt').write_text('synthetic legacy marker')
package=base/"ubuntu-build/target/release/bundle/deb/Kieda's Orbiter Preview_1.3.3_amd64.deb"
with open(evidence/'settings-deb-equipped-install.log','w') as log:
 subprocess.run(['dpkg','-i',str(package)],stdout=log,stderr=subprocess.STDOUT,check=True)
binary=pathlib.Path('/usr/bin/kiedas-orbiter-preview')
# Copy executable beside synthetic legacy data so legacy discovery tests a real executable parent.
app=binary
lib=pathlib.Path('/usr/lib/x86_64-linux-gnu'); bins=pathlib.Path('/usr/bin')
env=os.environ.copy();env.update(XDG_DATA_HOME=str(scratch/'xdgdata'),XDG_CONFIG_HOME=str(scratch/'config'),XDG_CACHE_HOME=str(scratch/'cache'),XDG_RUNTIME_DIR=str(scratch/'runtime'),LD_LIBRARY_PATH=str(lib),PATH=str(bins)+':'+env.get('PATH',''),XKB_BINDIR=str(bins),TAURI_WEBVIEW_AUTOMATION='true',WEBKIT_DISABLE_DMABUF_RENDERER='1',LIBGL_ALWAYS_SOFTWARE='1',LP_NUM_THREADS='2',OMP_NUM_THREADS='2',DBUS_SYSTEM_BUS_ADDRESS='unix:path='+str(scratch/'no-system-bus'))
env.pop('DBUS_SESSION_BUS_ADDRESS',None);env.pop('WAYLAND_DISPLAY',None)
processes=[]; process_groups=set(); logs=[];results={'binary_sha256':hashlib.sha256(binary.read_bytes()).hexdigest(),'private_container_network':True,'installed_package':str(package),'legacy_adjacency_test':False,'synthetic_profile':str(scratch),'checks':[]}
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
 xvfb=start([str(bins/'Xvfb'),':'+str(display),'-screen','0','1200x800x24','-nolisten','unix','-listen','tcp','-ac'], 'settings-deb-packaged-xvfb.log')
 time.sleep(2)
 if xvfb.poll() is not None:raise RuntimeError('Headless display failed; see settings-deb-packaged-xvfb.log')
 conf=scratch/'dbus.conf';conf.write_text('<busconfig><type>session</type><listen>unix:tmpdir='+str(scratch/'runtime')+'</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/></policy></busconfig>')
 bus=subprocess.Popen([str(bins/'dbus-daemon'),'--nofork','--print-address=1','--config-file='+str(conf)],env=env,stdout=subprocess.PIPE,stderr=open(evidence/'settings-deb-packaged-dbus.log','w'),text=True);processes.append(bus)
 import select
 if not select.select([bus.stdout],[],[],5)[0]:raise RuntimeError('Private D-Bus did not start')
 env['DBUS_SESSION_BUS_ADDRESS']=bus.stdout.readline().strip()
 driver=start([str(bins/'WebKitWebDriver'),'--port=17777'],'settings-deb-packaged-webdriver.log')
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
 relative='data/assets/data/acquisition_overrides.json'
 response=api('POST',prefix+'/execute/async',{'script':"const done=arguments[arguments.length-1];window.__TAURI_INTERNALS__.invoke('read_file_bytes',{relative:arguments[0]}).then(v=>done({resolved:true,value:v})).catch(e=>done({resolved:false,error:String(e)}));",'args':[relative]})['value']
 resource=pathlib.Path("/usr/lib/Kieda's Orbiter Preview")/relative
 results['packaged_resource_check']={'resolved':response.get('resolved'),'matches_installed_bytes':response.get('resolved') is True and bytes(response['value'])==resource.read_bytes(),'profile_copy_absent':not (preview.parent.parent/relative).exists()}
 cached=preview.parent.parent/relative
 saved=cached.with_suffix(cached.suffix+'.test-backup')
 if cached.exists():cached.rename(saved)
 try:
  fallback=api('POST',prefix+'/execute/async',{'script':"const done=arguments[arguments.length-1];window.__TAURI_INTERNALS__.invoke('read_file_bytes',{relative:arguments[0]}).then(v=>done({resolved:true,value:v})).catch(e=>done({resolved:false,error:String(e)}));",'args':[relative]})['value']
  results['bundle_fallback_check']={'profile_copy_absent':not cached.exists(),'resolved':fallback.get('resolved'),'matches_installed_bytes':fallback.get('resolved') is True and bytes(fallback['value'])==resource.read_bytes()}
 finally:
  if saved.exists():saved.rename(cached)

 def js(script,args=[]):return api('POST',prefix+'/execute/sync',{'script':script,'args':args})['value']
 js("const label=[...document.querySelectorAll('label')].find(x=>x.innerText.includes('I understand'));if(label)label.querySelector('div').click();")
 time.sleep(.3)
 js("const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='CONTINUE');if(b)b.click();")
 time.sleep(.5)
 def click(text):
  el=api('POST',prefix+'/element',{'using':'xpath','value':"//button[normalize-space(.)='"+text+"']"})['value']['element-6066-11e4-a52e-4f735466cecf']
  api('POST',prefix+'/element/'+el+'/click',{});time.sleep(.2)
 results['dialog_checks']=[]
 for width,height in [(1200,800),(900,500)]:
  api('POST',prefix+'/window/rect',{'width':width,'height':height});time.sleep(.2)
  click('Import a profile copy')
  for mode in ['empty','synthetic-dom-content']:
   if mode!='empty':
    js("const d=document.querySelector('[role=dialog]');[...d.querySelectorAll('p')].find(e=>e.innerText==='No folder selected').textContent='/synthetic/'+('long-folder-name/'.repeat(8))+'data/user';d.querySelector('[role=status]').textContent='Synthetic layout stress text only. This is not an import result. '.repeat(3)")
   state=js("const d=document.querySelector('[role=dialog]'),r=d.getBoundingClientRect();return {viewport:[innerWidth,innerHeight],top:r.top,bottom:r.bottom,height:r.height,maxHeight:getComputedStyle(d).maxHeight,overflowY:getComputedStyle(d).overflowY,scrollHeight:d.scrollHeight,clientHeight:d.clientHeight}")
   controls=js("const d=document.querySelector('[role=dialog]');return [...d.querySelectorAll('button:not(:disabled),input:not(:disabled)')].map(e=>{e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect(),b=d.getBoundingClientRect();return {label:e.innerText||e.parentElement.innerText,visible:r.top>=Math.max(b.top,0)&&r.bottom<=Math.min(b.bottom,innerHeight)}})")
   results['dialog_checks'].append({'size':[width,height],'mode':mode,'state':state,'controls':controls,'pass':state['viewport']==[width,height] and state['top']>=0 and state['bottom']<=height and state['overflowY']=='auto' and all(x['visible'] for x in controls)})
  api('POST',prefix+'/actions',{'actions':[{'type':'key','id':'keyboard','actions':[{'type':'keyDown','value':'\ue00c'},{'type':'keyUp','value':'\ue00c'}]}]});time.sleep(.2)
  results['checks'].append({'name':str(width)+'-dialog-escape-focus','pass':js("return !document.querySelector('[role=dialog]')&&document.activeElement.innerText==='Import a profile copy'")})
 results['guard_checks']=[]
 for command,args in [('start_log_scanner',{}),('set_hotkeys',{'hotkeys':[]}),('show_overlay_window',{'label':'notification'}),('show_notification',{'title':'Synthetic test','message':'Private test'}),('download_appimage_update',{'url':'http://127.0.0.1:1/synthetic'})]:
  value=api('POST',prefix+'/execute/async',{'script':"const done=arguments[arguments.length-1]; window.__TAURI_INTERNALS__.invoke(arguments[0],arguments[1]).then(v=>done({resolved:true,value:v})).catch(e=>done({resolved:false,error:String(e)}));",'args':[command,args]})['value']
  results['guard_checks'].append({'command':command,'result':value,'pass':value.get('resolved') is False and 'disabled' in value.get('error','')})
 def ipc(command,args):
  return api('POST',prefix+'/execute/async',{'script':"const done=arguments[arguments.length-1]; window.__TAURI_INTERNALS__.invoke(arguments[0],arguments[1]).then(v=>done({resolved:true,value:v})).catch(e=>done({resolved:false,error:String(e)}));",'args':[command,args]})['value']
 results['market_guards']=[]
 for command,args in [('post_market_order',{'token':'SYNTHETIC','itemId':'SYNTHETIC','platPrice':1,'quantity':1}),('delete_market_order',{'token':'SYNTHETIC','orderId':'SYNTHETIC'}),('update_market_order',{'token':'SYNTHETIC','orderId':'SYNTHETIC','platinum':1}),('close_market_order',{'token':'SYNTHETIC','orderId':'SYNTHETIC','quantity':1})]:
  value=ipc(command,args)
  results['market_guards'].append({'command':command,'result':value,'pass':value.get('resolved') is False and 'disabled' in value.get('error','')})

 results['updater_ui_checks']=[]
 translations=json.loads((base/'stage2/src/lib/i18n/en.json').read_text())['ui']
 check_label=translations['settings.btn_check_updates'];startup_label=translations['settings.check_on_startup'];install_label=translations['settings.install_update']
 click('Settings')
 for width,height in [(1200,800),(900,500)]:
  api('POST',prefix+'/window/rect',{'width':width,'height':height});time.sleep(.3)
  state=js("const p=[...document.querySelectorAll('[role=status]')].find(e=>e.textContent==='Application updates are disabled in Preview.');if(!p)return {missing:true};p.scrollIntoView({block:'center'});const panel=p.parentElement,b=[...panel.querySelectorAll('button')].find(e=>e.textContent.trim()===arguments[0]);return {message:p.textContent,buttonDisabled:b?.disabled,startupAbsent:!panel.textContent.includes(arguments[1]),installAbsent:![...panel.querySelectorAll('button')].some(e=>e.textContent.trim()===arguments[2]),messageRect:JSON.parse(JSON.stringify(p.getBoundingClientRect())),viewport:[innerWidth,innerHeight]}",[check_label,startup_label,install_label])
  results['updater_ui_checks'].append({'size':[width,height],'state':state,'pass':state.get('buttonDisabled') is True and state.get('startupAbsent') is True and state.get('installAbsent') is True and state['messageRect']['top']>=0 and state['messageRect']['bottom']<=height})
 api('POST',prefix+'/refresh',{});time.sleep(3)
 click('Settings')
 results['updater_ui_checks'].append({'name':'disabled_state_after_reload','pass':js("return [...document.querySelectorAll('[role=status]')].some(e=>e.textContent==='Application updates are disabled in Preview.')&&[...document.querySelectorAll('button')].some(e=>e.textContent.trim()===arguments[0]&&e.disabled)",[check_label])})

 click('Dashboard')
 injected=js("const el=document.getElementById('root').firstElementChild,key=Object.keys(el).find(k=>k.startsWith('__reactFiber$'));let f=el[key];while(f){const value=f.memoizedProps?.value;if(typeof value?.setWorldState==='function'){value.setWorldState({});return true;}f=f.return;}return false;")
 results['dashboard_state_injection']={'tier':'synthetic empty parsed WorldState injected into real React MonitoringContext; no backend mocking','succeeded':injected}
 assert injected,'MonitoringContext test state injection unavailable'
 time.sleep(.5)
 results['dashboard_checks']=[]
 for width,height in [(1200,800),(900,500)]:
  api('POST',prefix+'/window/rect',{'width':width,'height':height});time.sleep(.3)
  state=js("const root=document.querySelector('.preview-dashboard');return {present:!!root,sections:root?[...root.querySelectorAll('section h2')].map(e=>e.textContent):[],cards:root?[...root.querySelectorAll('[data-dashboard-card]')].map(e=>e.dataset.dashboardCard):[],columns:root?getComputedStyle(root.querySelector('.preview-dashboard-grid')).gridTemplateColumns.split(' ').length:0}")
  results['dashboard_checks'].append({'size':[width,height],'state':state,'pass':state['present'] and state['sections']==['Now','Activities & rotations'] and state['columns']==(1 if width==900 else 2) and len(state['cards'])==11})

 click('Inventory')
 results['inventory_checks']=[]
 expected_tabs=['All','Warframes','Weapons','Companions','Companion Weapons','Archweapons','Vehicles','Amps','Arcanes','Peely Pix','Consumables','Landing Craft','Resources','Prime Sets','Ayatan']
 for width,height in [(1200,800),(900,500)]:
  api('POST',prefix+'/window/rect',{'width':width,'height':height});time.sleep(.3)
  state=js("""const root=document.querySelector('[data-preview-inventory-layout]');if(!root)return {present:false};const tabs=[...root.querySelectorAll('.preview-inventory-controls > div > div > div:nth-child(2) > button')],cats=tabs[0]?.parentElement,toolbar=root.querySelector('.preview-inventory-controls > div > div > div:first-child'),rr=root.getBoundingClientRect();return {present:true,tabs:tabs.map(e=>e.textContent.trim()),root:{left:rr.left,right:rr.right},body:{scroll:document.body.scrollWidth,client:document.body.clientWidth},categories:{scroll:cats.scrollWidth,client:cats.clientWidth,overflow:getComputedStyle(cats).overflowX,wrap:getComputedStyle(cats).flexWrap},toolbarColumns:getComputedStyle(toolbar).gridTemplateColumns.split(' ').length,sellVisible:[...document.querySelectorAll('button')].some(e=>/sell/i.test(e.textContent))}""")
  passed=state.get('present') and state.get('tabs')==expected_tabs and state['root']['left']>=0 and state['root']['right']<=width and state['body']['scroll']<=state['body']['client']+1 and state['categories']['scroll']>state['categories']['client'] and state['categories']['overflow']=='auto' and state['categories']['wrap']=='nowrap' and state['toolbarColumns']==(1 if width==900 else 2) and not state['sellVisible']
  results['inventory_checks'].append({'size':[width,height],'state':state,'pass':passed})

 click('Mastery')
 results['mastery_checks']=[]
 synthetic_mastery={
  'account':{'mastery_rank':15},
  'intrinsics':[],
  'starchart':{'total':0,'origin':0,'origin_xp':0,'steel_path':0,'steel_path_xp':0,'nodes':[]}
 }
 inject_script="""const el=document.getElementById('root').firstElementChild,key=Object.keys(el).find(k=>k.startsWith('__reactFiber$'));let f=el[key];while(f){const value=f.memoizedProps?.value;if(value&&Object.prototype.hasOwnProperty.call(value,'inventoryData')&&typeof value.setWorldState==='function')break;f=f.return;}if(!f||!f.return)return {ok:false,reason:'provider-not-found'};let h=f.return.memoizedState,states=[];while(h){if(h.queue&&typeof h.queue.dispatch==='function')states.push(h);h=h.next;}if(states.length<8)return {ok:false,reason:'state-hooks',count:states.length};if(states[6].memoizedState!==f.memoizedProps.value.inventoryData)return {ok:false,reason:'inventory-hook-mismatch',count:states.length};states[6].queue.dispatch(arguments[0]);states[7].queue.dispatch(false);return {ok:true,stateHooks:states.length,previousInventory:f.memoizedProps.value.inventoryData};"""
 injection=js(inject_script,[synthetic_mastery])
 results['mastery_state_injection']={'tier':'synthetic parsed-shape data dispatched into the real MonitoringProvider state hook; no app source or backend mock','result':injection}
 assert injection.get('ok'),'MonitoringContext inventory test-state injection unavailable: '+str(injection)
 time.sleep(.6)
 expected_mastery=['Warframe','Primary','Secondary','Melee','Kitgun','Zaw','Amp','Sentinel','Sentinel Weapon','MOA','Hound','Robotics','Companions','Archwing','Archgun','Archmelee','Necramech','K-Drive','Plexus','Vehicles','Railjack Intrinsic','Drifter Intrinsic','Starchart','The Steel Path']
 def press_mastery_key(value):
  api('POST',prefix+'/actions',{'actions':[{'type':'key','id':'mastery-keyboard','actions':[{'type':'keyDown','value':value},{'type':'keyUp','value':value}]}]})
  time.sleep(.15)
  try:api('DELETE',prefix+'/actions')
  except Exception:pass
 for width,height in [(1200,800),(900,500)]:
  api('POST',prefix+'/window/rect',{'width':width,'height':height});time.sleep(.3)
  state=js("""const root=document.querySelector('[data-preview-mastery-layout]');if(!root)return {present:false};const cards=[...root.querySelectorAll('[data-preview-mastery-card]')],rr=root.getBoundingClientRect(),rank=root.querySelector('[data-preview-mastery-rank-state]').getBoundingClientRect(),items=root.querySelector('[data-preview-mastery-grid="items"]'),secondary=root.querySelector('[data-preview-mastery-secondary]');return {present:true,labels:cards.map(e=>e.querySelector('span')?.textContent.trim()),body:{client:document.body.clientWidth,scroll:document.body.scrollWidth},root:{left:rr.left,right:rr.right},rank:{left:rank.left,right:rank.right},itemColumns:getComputedStyle(items).gridTemplateColumns.split(' ').length,secondaryColumns:getComputedStyle(secondary).gridTemplateColumns.split(' ').length,firstRole:cards[0]?.getAttribute('role'),firstTabIndex:cards[0]?.tabIndex};""")
  layout_pass=state.get('present') and state.get('labels')==expected_mastery and state['body']['scroll']<=state['body']['client']+1 and state['root']['left']>=0 and state['root']['right']<=width and state['rank']['left']>=state['root']['left']-1 and state['rank']['right']<=state['root']['right']+1 and state['itemColumns']==(4 if width==1200 else 3) and state['secondaryColumns']==(2 if width==1200 else 1) and state['firstRole']=='button' and state['firstTabIndex']==0
  first_focus=js("const e=document.querySelector('[data-preview-mastery-card]');e.focus();return document.activeElement===e")
  press_mastery_key('\ue007')
  enter_dialog=js("const d=document.querySelector('[data-preview-mastery-modal]');return {present:!!d,role:d?.getAttribute('role'),modal:d?.getAttribute('aria-modal'),heading:d?.querySelector('h3')?.textContent}")
  js("document.querySelector('[data-preview-mastery-modal] button')?.click()");time.sleep(.1)
  last_focus=js("const a=document.querySelectorAll('[data-preview-mastery-card]'),e=a[a.length-1];e.focus();return document.activeElement===e")
  press_mastery_key(' ')
  space_dialog=js("const d=document.querySelector('[data-preview-mastery-modal]');return {present:!!d,role:d?.getAttribute('role'),heading:d?.querySelector('h3')?.textContent}")
  js("document.querySelector('[data-preview-mastery-modal] button')?.click()");time.sleep(.1)
  interaction_pass=first_focus and enter_dialog['present'] and enter_dialog['role']=='dialog' and enter_dialog['modal']=='true' and 'Warframe' in enter_dialog['heading'] and last_focus and space_dialog['present'] and space_dialog['role']=='dialog' and 'Steel Path' in space_dialog['heading']
  results['mastery_checks'].append({'size':[width,height],'kind':'layout','state':state,'pass':layout_pass})
  results['mastery_checks'].append({'size':[width,height],'kind':'keyboard-dialog','enter':enter_dialog,'space':space_dialog,'pass':interaction_pass})
 ready_mastery={
  'account':{'mastery_rank':0},
  'warframes':[{'name':'Synthetic Mastered','unique_name':'/Synthetic/Mastered','mastered':True,'rank':30,'mastery_xp':3000}],
  'intrinsics':[],
  'starchart':{'total':0,'origin':0,'origin_xp':0,'steel_path':0,'steel_path_xp':0,'nodes':[]}
 }
 ready_injection=js(inject_script,[ready_mastery]);time.sleep(.5)
 ready=js("""const panel=document.querySelector('[data-preview-mastery-rank-state="ready"]'),img=document.querySelector('[data-preview-mastery-art] img');if(!panel)return {present:false};const pr=panel.getBoundingClientRect();return {present:true,text:panel.innerText,image:img?.getAttribute('src'),body:{client:document.body.clientWidth,scroll:document.body.scrollWidth},bounds:{left:pr.left,right:pr.right}};""")
 results['mastery_checks'].append({'size':[900,500],'kind':'rank-ready','injection':ready_injection,'state':ready,'pass':ready_injection.get('ok') and ready.get('present') and 'RANK UP AVAILABLE' in ready.get('text','').upper() and ready.get('image') and ready['body']['scroll']<=ready['body']['client']+1})

 click('Mods')
 results['mods_checks']=[]
 synthetic_mods={'mods_catalog':[
  {'unique_name':'/Synthetic/Warframe','name':'Synthetic Warframe Mod','description':'Synthetic','category':'Warframe','owned':True,'quantity':1,'rank':5,'max_rank':5,'rarity':'rare','modFrame':'Normal Rare','baseDrain':4},
  {'unique_name':'/Synthetic/Primary','name':'Synthetic Primary Mod','description':'Synthetic','category':'Primary','owned':True,'quantity':2,'rank':2,'max_rank':5,'rarity':'common','modFrame':'Normal Common','baseDrain':4},
  {'unique_name':'/Synthetic/Secondary','name':'Synthetic Secondary Mod','description':'Synthetic','category':'Secondary','owned':False,'quantity':1,'rank':0,'max_rank':5,'rarity':'uncommon','modFrame':'Normal Uncommon','baseDrain':4},
  {'unique_name':'/Synthetic/Melee','name':'Synthetic Melee Mod','description':'Synthetic','category':'Melee','owned':True,'quantity':1,'rank':3,'max_rank':5,'rarity':'legendary','modFrame':'Normal Legendary','baseDrain':4},
  {'unique_name':'/Synthetic/Sentinels','name':'Synthetic Sentinel Mod','description':'Synthetic','category':'Sentinels','owned':True,'quantity':1,'rank':1,'max_rank':5,'rarity':'common','modFrame':'Normal Common','baseDrain':4},
  {'unique_name':'/Synthetic/Robotic','name':'Synthetic Robotic Mod','description':'Synthetic','category':'Robotic','owned':True,'quantity':1,'rank':1,'max_rank':5,'rarity':'common','modFrame':'Normal Common','baseDrain':4},
  {'unique_name':'/Synthetic/Beasts','name':'Synthetic Beast Mod','description':'Synthetic','category':'Beasts','owned':True,'quantity':1,'rank':1,'max_rank':5,'rarity':'common','modFrame':'Normal Common','baseDrain':4},
  {'unique_name':'/Synthetic/Stance','name':'Synthetic Stance Mod','description':'Synthetic','category':'Stance','owned':True,'quantity':1,'rank':1,'max_rank':5,'rarity':'common','modFrame':'Normal Common','baseDrain':4},
  {'unique_name':'/Synthetic/Aura','name':'Synthetic Aura Mod','description':'Synthetic','category':'Aura','owned':True,'quantity':1,'rank':1,'max_rank':5,'rarity':'common','modFrame':'Normal Common','baseDrain':4},
  {'unique_name':'/Synthetic/Railjack','name':'Synthetic Railjack Mod','description':'Synthetic','category':'Railjack','owned':True,'quantity':1,'rank':1,'max_rank':5,'rarity':'common','modFrame':'Normal Common','baseDrain':4},
  {'unique_name':'/Synthetic/Archgun','name':'Synthetic Archgun Mod','description':'Synthetic','category':'Archgun','owned':True,'quantity':1,'rank':1,'max_rank':5,'rarity':'common','modFrame':'Normal Common','baseDrain':4},
  {'unique_name':'/Synthetic/Archmelee','name':'Synthetic Archmelee Mod','description':'Synthetic','category':'Archmelee','owned':True,'quantity':1,'rank':1,'max_rank':5,'rarity':'common','modFrame':'Normal Common','baseDrain':4},
  {'unique_name':'/Synthetic/Parazon','name':'Synthetic Parazon Mod','description':'Synthetic','category':'Parazon','owned':True,'quantity':1,'rank':1,'max_rank':5,'rarity':'common','modFrame':'Normal Common','baseDrain':4},
  {'unique_name':'/Synthetic/Augment','name':'Synthetic Augment Mod','description':'Synthetic','category':'Augment','owned':True,'quantity':1,'rank':1,'max_rank':5,'rarity':'common','modFrame':'Normal Common','baseDrain':4},
  {'unique_name':'/Synthetic/Antique','name':'Synthetic Antique Mod','description':'Synthetic','category':'Antique','owned':True,'quantity':1,'rank':1,'max_rank':5,'rarity':'common','modFrame':'Normal Common','baseDrain':4},
  {'unique_name':'/Synthetic/Tome','name':'Synthetic Tome Exilus','description':'Synthetic','category':'Tome','isExilus':True,'owned':True,'quantity':1,'rank':1,'max_rank':5,'rarity':'common','modFrame':'Tome','baseDrain':4},
  {'unique_name':'/Synthetic/Vehicles','name':'Synthetic Vehicle Mod','description':'Synthetic','category':'Vehicles','owned':True,'quantity':1,'rank':1,'max_rank':5,'rarity':'common','modFrame':'Normal Common','baseDrain':4}
 ]}
 mods_injection=js(inject_script,[synthetic_mods])
 results['mods_state_injection']={'tier':'synthetic parsed-shape data dispatched into the real MonitoringProvider state hook; no app source or backend mock','result':mods_injection}
 assert mods_injection.get('ok'),'MonitoringContext Mods test-state injection unavailable: '+str(mods_injection)
 time.sleep(.6)
 expected_mod_categories=['All','Warframe','Primary','Secondary','Melee','Sentinels','Robotic','Beasts','Stance','Aura','Exilus','Railjack','Archgun','Archmelee','Parazon','Augment','Antique','Tome','Vehicles']
 def press_mod_key(value):
  api('POST',prefix+'/actions',{'actions':[{'type':'key','id':'mods-keyboard','actions':[{'type':'keyDown','value':value},{'type':'keyUp','value':value}]}]})
  time.sleep(.15)
  try:api('DELETE',prefix+'/actions')
  except Exception:pass
 for width,height in [(1200,800),(900,500)]:
  api('POST',prefix+'/window/rect',{'width':width,'height':height});time.sleep(.3)
  state=js("""const root=document.querySelector('[data-preview-mods-layout]');if(!root)return {present:false};const toolbar=root.querySelector('[data-preview-mods-toolbar]'),cats=root.querySelector('[data-preview-mods-categories]'),cards=[...root.querySelectorAll('[data-preview-mod-card]')],rr=root.getBoundingClientRect();return {present:true,categories:[...cats.querySelectorAll('button')].map(e=>e.textContent.trim()),body:{client:document.body.clientWidth,scroll:document.body.scrollWidth},root:{left:rr.left,right:rr.right},toolbarColumns:getComputedStyle(toolbar).gridTemplateColumns.split(' ').length,categoriesState:{client:cats.clientWidth,scroll:cats.scrollWidth,overflow:getComputedStyle(cats).overflowX,wrap:getComputedStyle(cats).flexWrap},cardCount:cards.length,cardWidths:cards.slice(0,3).map(e=>e.getBoundingClientRect().width),firstRole:cards[0]?.getAttribute('role'),firstTabIndex:cards[0]?.tabIndex,noZeroPrice:!root.innerText.includes('0p'),noSell:![...root.querySelectorAll('button')].some(e=>/sell/i.test(e.textContent))};""")
  layout_pass=state.get('present') and state.get('categories')==expected_mod_categories and state['body']['scroll']<=state['body']['client']+1 and state['root']['left']>=0 and state['root']['right']<=width+1 and state['toolbarColumns']==(2 if width==1200 else 1) and state['categoriesState']['scroll']>state['categoriesState']['client'] and state['categoriesState']['overflow']=='auto' and state['categoriesState']['wrap']=='nowrap' and state['cardCount']==17 and all(abs(value-200)<1 for value in state['cardWidths']) and state['firstRole']=='button' and state['firstTabIndex']==0
  results['mods_checks'].append({'size':[width,height],'kind':'layout-and-categories','state':state,'pass':layout_pass})
  first_focus=js("const e=document.querySelector('[data-preview-mod-card]');e.focus();return document.activeElement===e")
  press_mod_key('\ue007')
  enter_open=js("return !!document.querySelector('.fixed.bottom-0')")
  js("document.querySelector('.fixed.bottom-0 button')?.click()");time.sleep(.1)
  last_focus=js("const a=document.querySelectorAll('[data-preview-mod-card]'),e=a[a.length-1];e.focus();return document.activeElement===e")
  press_mod_key(' ')
  space_open=js("return !!document.querySelector('.fixed.bottom-0')")
  js("document.querySelector('.fixed.bottom-0 button')?.click()");time.sleep(.1)
  results['mods_checks'].append({'size':[width,height],'kind':'keyboard-drawer','enter':enter_open,'space':space_open,'pass':first_focus and enter_open and last_focus and space_open})
 results['mods_checks'].append({'kind':'price-and-market-surface','pass':state['noZeroPrice'] and state['noSell'],'no_zero_price':state['noZeroPrice'],'no_sell':state['noSell']})
 opened_cosmetics=js("const b=[...document.querySelectorAll('nav button')].find(e=>e.textContent.trim()==='Cosmetics, Decorations, Emotes');if(!b)return false;b.click();return true")
 if not opened_cosmetics: raise RuntimeError('Cosmetics navigation button unavailable')
 time.sleep(2)
 results['cosmetics_checks']=[]
 expected_cosmetics=['All','Warframe','Primary','Secondary','Melee','Archwing','Sentinel','Syandana','Armor','Animation','Glyph','Sigil','Decoration','Emote','Other']
 def press_cosmetics_key(value):
  api('POST',prefix+'/actions',{'actions':[{'type':'key','id':'cosmetics-keyboard','actions':[{'type':'keyDown','value':value},{'type':'keyUp','value':value}]}]})
  time.sleep(.2)
  try:api('DELETE',prefix+'/actions')
  except Exception:pass
 for width,height in [(1200,800),(900,500)]:
  api('POST',prefix+'/window/rect',{'width':width,'height':height});time.sleep(.5)
  state=js("""const root=document.querySelector('[data-preview-cosmetics-layout]');if(!root)return {present:false};const kinds=root.querySelector('.preview-cosmetics-kind-tabs'),own=root.querySelector('.preview-cosmetics-ownership-tabs'),toolbar=root.querySelector('[data-preview-cosmetics-toolbar]'),grid=root.querySelector('[data-preview-cosmetics-grid]'),cards=[...root.querySelectorAll('[data-preview-cosmetic-card]')],rr=root.getBoundingClientRect();return {present:true,categories:[...kinds.querySelectorAll('button')].map(e=>e.textContent.trim()),ownership:[...own.querySelectorAll('button')].map(e=>e.textContent.trim()),body:{client:document.body.clientWidth,scroll:document.body.scrollWidth},root:{left:rr.left,right:rr.right},toolbarColumns:getComputedStyle(toolbar).gridTemplateColumns.split(' ').length,kinds:{client:kinds.clientWidth,scroll:kinds.scrollWidth,overflow:getComputedStyle(kinds).overflowX,wrap:getComputedStyle(kinds).flexWrap},cardCount:cards.length,cardWidths:cards.slice(0,3).map(e=>e.getBoundingClientRect().width),buttonCount:root.querySelectorAll('[data-preview-cosmetic-card] button').length,noZeroPrice:!root.innerText.includes('0p'),noSell:![...root.querySelectorAll('button')].some(e=>/sell/i.test(e.textContent))};""")
  layout_pass=state.get('present') and state.get('categories')==expected_cosmetics and state.get('ownership')==['All','Owned','Unowned'] and state['body']['scroll']<=state['body']['client']+1 and state['root']['left']>=0 and state['root']['right']<=width+1 and state['toolbarColumns']==2 and state['kinds']['scroll']>state['kinds']['client'] and state['kinds']['overflow']=='auto' and state['kinds']['wrap']=='nowrap' and state['cardCount']>0 and all(value>=219 for value in state['cardWidths']) and state['buttonCount']==state['cardCount']
  results['cosmetics_checks'].append({'size':[width,height],'kind':'layout-categories-and-buttons','state':state,'pass':layout_pass})
  focused=js("const e=document.querySelector('[data-preview-cosmetic-card] button');if(!e)return false;e.focus();return document.activeElement===e&&e.tagName==='BUTTON'")
  press_cosmetics_key('\ue007')
  drawer=js("return {count:document.querySelectorAll('.fixed.bottom-0').length,title:document.querySelector('.fixed.bottom-0 h3')?.textContent||''}")
  js("[...document.querySelectorAll('.fixed.bottom-0 button')].find(e=>e.textContent.trim().toLowerCase()==='close')?.click()");time.sleep(.15)
  results['cosmetics_checks'].append({'size':[width,height],'kind':'native-acquisition-button','focused':focused,'drawer':drawer,'pass':focused and drawer['count']==1 and bool(drawer['title'])})
 results['cosmetics_checks'].append({'kind':'price-and-market-surface','pass':state['noZeroPrice'] and state['noSell'],'no_zero_price':state['noZeroPrice'],'no_sell':state['noSell']})
 opened_rivens=js("const b=[...document.querySelectorAll('nav button')].find(e=>e.textContent.trim()==='Rivens');if(!b)return false;b.click();return true")
 if not opened_rivens: raise RuntimeError('Rivens navigation button unavailable')
 time.sleep(1)
 synthetic_rivens={
  'account':{'riven_capacity':18},
  'rivens':[
   {'item_id':'native-alpha-1','name':'Alpha Critatis','weapon_name':'Alpha','weapon_name_en':'Alpha','weapon_type':'Rifle','stats':[{'tag':'Critical Chance','statKey':'Critical Chance','value':'55','positive':True,'isPercent':True},{'tag':'Zoom','statKey':'Zoom','value':'20','positive':False,'isPercent':True}],'rank':8,'mr':12,'rerolls':3,'polarity':'AP_ATTACK','_grade':'S'},
   {'item_id':'native-alpha-2','name':'Alpha Critatis','weapon_name':'Alpha','weapon_name_en':'Alpha','weapon_type':'Rifle','stats':[{'tag':'Critical Chance','statKey':'Critical Chance','value':'35','positive':True,'isPercent':True},{'tag':'Zoom','statKey':'Zoom','value':'20','positive':False,'isPercent':True}],'rank':4,'mr':10,'rerolls':1,'polarity':'AP_DEFENSE','_grade':'A'},
   {'item_id':'native-challenge-1','name':'Shotgun Riven Challenge','weapon_name':'Shotgun','weapon_type':'Shotgun','challenge':'Complete a synthetic challenge','rerolls':2,'quantity':1,'_grade':'B'},
   {'name':'Melee Riven Mod','weapon_name':'Melee','weapon_type':'Melee','veiled':True,'quantity':3,'rerolls':0,'_grade':'B'}
  ]
 }
 rivens_injection=js(inject_script,[synthetic_rivens])
 results['rivens_state_injection']={'tier':'synthetic parsed-shape data dispatched into the real MonitoringProvider state hook; real packaged estimator IPC remains active and may return no estimate for synthetic weapons','result':rivens_injection}
 if not rivens_injection.get('ok'): raise RuntimeError('MonitoringContext Rivens test-state injection unavailable: '+str(rivens_injection))
 time.sleep(1)
 results['rivens_checks']=[]
 expected_riven_types=['All','Rifle','Pistol','Melee','Shotgun','Sniper','Kitgun','Zaw','Archgun']
 expected_riven_states=['All States','Unveiled','Challenge','Veiled']
 def press_riven_key(value):
  api('POST',prefix+'/actions',{'actions':[{'type':'key','id':'rivens-keyboard','actions':[{'type':'keyDown','value':value},{'type':'keyUp','value':value}]}]})
  time.sleep(.2)
  try:api('DELETE',prefix+'/actions')
  except Exception:pass
 for width,height in [(1200,800),(900,500)]:
  api('POST',prefix+'/window/rect',{'width':width,'height':height});time.sleep(.4)
  state=js("""const root=document.querySelector('[data-preview-rivens-layout]');if(!root)return {present:false};const primary=root.querySelector('[data-preview-rivens-primary-controls]'),types=root.querySelector('.preview-rivens-types'),states=root.querySelector('[data-preview-rivens-state]'),sort=root.querySelector('[data-preview-rivens-sort]'),grid=root.querySelector('[data-preview-rivens-grid]'),cards=[...root.querySelectorAll('[data-preview-riven-card]')],rr=root.getBoundingClientRect(),gr=grid.getBoundingClientRect();return {present:true,types:[...types.querySelectorAll('button')].map(e=>e.textContent.trim()),states:[...states.querySelectorAll('button')].map(e=>e.textContent.trim()),sort:[...sort.querySelectorAll('button')].map(e=>e.textContent.trim()),body:{client:document.body.clientWidth,scroll:document.body.scrollWidth},root:{left:rr.left,right:rr.right},primaryColumns:getComputedStyle(primary).gridTemplateColumns.split(' ').length,typeRail:{client:types.clientWidth,scroll:types.scrollWidth,overflow:getComputedStyle(types).overflowX,wrap:getComputedStyle(types).flexWrap},grid:{left:gr.left,right:gr.right},cards:cards.map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,role:e.getAttribute('role'),tabIndex:e.tabIndex,label:e.getAttribute('aria-label')}}),noSell:![...root.querySelectorAll('button')].some(e=>/sell/i.test(e.textContent))};""")
  layout_pass=state.get('present') and state.get('types')==expected_riven_types and state.get('states')==expected_riven_states and state.get('sort')==['Name','Plat','Grade'] and state['body']['scroll']<=state['body']['client']+1 and state['root']['left']>=0 and state['root']['right']<=width+1 and state['primaryColumns']==(3 if width==1200 else 1) and state['typeRail']['overflow']=='auto' and state['typeRail']['wrap']=='nowrap' and len(state['cards'])==4 and all(abs(card['width']-200)<1 and card['left']>=state['grid']['left']-1 and card['right']<=state['grid']['right']+1 and card['role']=='button' and card['tabIndex']==0 for card in state['cards'])
  results['rivens_checks'].append({'size':[width,height],'kind':'layout-filters-and-cards','state':state,'pass':layout_pass})
  focused=js("const e=document.querySelector('[data-preview-riven-card]');if(!e)return false;e.focus();return document.activeElement===e")
  press_riven_key(chr(0xE007))
  enter_open=js("return document.querySelectorAll('.fixed.bottom-0').length===1")
  js("document.querySelector('.fixed.bottom-0 button')?.click()");time.sleep(.15)
  results['rivens_checks'].append({'size':[width,height],'kind':'keyboard-drawer','focused':focused,'opened':enter_open,'pass':focused and enter_open})
 results['rivens_checks'].append({'kind':'price-and-market-surface','pass':state['noSell'] and not js("return document.querySelector('[data-preview-rivens-layout]').innerText.includes('0p')"),'no_sell':state['noSell']})
 opened_relics=js("const b=[...document.querySelectorAll('nav button')].find(e=>e.textContent.trim()==='Relics');if(!b)return false;b.click();return true")
 if not opened_relics: raise RuntimeError('Relics navigation button unavailable')
 time.sleep(1)
 synthetic_rewards=[
  {'name':'Synthetic Prime Blueprint','uniqueName':'/Synthetic/Rewards/Blueprint','rarity':'COMMON','tier':0,'ducats':15},
  {'name':'Synthetic Prime Chassis','uniqueName':'/Synthetic/Rewards/Chassis','rarity':'COMMON','tier':0,'ducats':15},
  {'name':'Synthetic Prime Systems','uniqueName':'/Synthetic/Rewards/Systems','rarity':'COMMON','tier':0,'ducats':25},
  {'name':'Synthetic Forma Blueprint','uniqueName':'/Synthetic/Rewards/Forma','rarity':'UNCOMMON','tier':1,'ducats':0},
  {'name':'Synthetic Prime Link','uniqueName':'/Synthetic/Rewards/Link','rarity':'UNCOMMON','tier':1,'ducats':45},
  {'name':'Synthetic Prime Rare','uniqueName':'/Synthetic/Rewards/Rare','rarity':'RARE','tier':2,'ducats':100}
 ]
 synthetic_relics={'account':{'void_traces':275,'void_traces_max':1500},'relics':[
  {'unique_name':'Synthetic Lith A1','real_unique_name':'/Synthetic/Relics/LithA1','name':'Lith A1 Relic','era':'Lith','owned':True,'vaulted':False,'refinements':{'Intact':2,'Exceptional':1,'Flawless':0,'Radiant':1},'rewards':synthetic_rewards},
  {'unique_name':'Synthetic Meso B2','real_unique_name':'/Synthetic/Relics/MesoB2','name':'Meso B2 Relic','era':'Meso','owned':True,'vaulted':True,'refinements':{'Intact':1,'Exceptional':0,'Flawless':2,'Radiant':0},'rewards':synthetic_rewards},
  {'unique_name':'Synthetic Requiem I','real_unique_name':'/Synthetic/Relics/RequiemI','name':'Requiem I Relic','era':'Requiem','owned':True,'vaulted':False,'refinements':{'Intact':3,'Exceptional':0,'Flawless':0,'Radiant':0},'rewards':[{'name':'Synthetic Requiem '+str(i+1),'uniqueName':'/Synthetic/Requiem/'+str(i),'rarity':'COMMON','tier':0,'ducats':10+i} for i in range(8)]}
 ]}
 relics_injection=js(inject_script,[synthetic_relics])
 results['relics_state_injection']={'tier':'synthetic parsed-shape inventory dispatched into real MonitoringProvider state; bundled export catalog and real relic parser remain active','result':relics_injection}
 if not relics_injection.get('ok'): raise RuntimeError('MonitoringContext Relics test-state injection unavailable: '+str(relics_injection))
 time.sleep(1)
 if not js("const b=[...document.querySelectorAll('[data-preview-relics-ownership] button')].find(e=>e.textContent.trim()==='Owned');if(!b)return false;b.click();return true"): raise RuntimeError('Owned relic filter unavailable')
 time.sleep(.5)
 results['relics_checks']=[]
 def press_relic_key(value):
  api('POST',prefix+'/actions',{'actions':[{'type':'key','id':'relics-keyboard','actions':[{'type':'keyDown','value':value},{'type':'keyUp','value':value}]}]})
  time.sleep(.2)
  try:api('DELETE',prefix+'/actions')
  except Exception:pass
 for width,height in [(1200,800),(900,500)]:
  api('POST',prefix+'/window/rect',{'width':width,'height':height});time.sleep(.4)
  state=js("""const root=document.querySelector('[data-preview-relics-layout]');if(!root)return {present:false};const primary=root.querySelector('[data-preview-relics-primary-controls]'),rails=[...root.querySelectorAll('[data-preview-relics-rail]')],cards=[...root.querySelectorAll('[data-preview-relic-card]')],traces=root.querySelector('[data-preview-relics-traces]'),rr=root.getBoundingClientRect(),tr=traces.getBoundingClientRect();return {present:true,body:{client:document.body.clientWidth,scroll:document.body.scrollWidth},root:{left:rr.left,right:rr.right},primaryColumns:getComputedStyle(primary).gridTemplateColumns.split(' ').length,rails:rails.map(e=>({kind:e.dataset.previewRelicsRail,overflow:getComputedStyle(e).overflowX,wrap:getComputedStyle(e).flexWrap,labels:[...e.querySelectorAll('button')].map(b=>b.textContent.trim())})),traces:{left:tr.left,right:tr.right,text:traces.innerText},cards:cards.map(e=>({role:e.getAttribute('role'),tabIndex:e.tabIndex,label:e.getAttribute('aria-label')})),noSell:![...root.querySelectorAll('button')].some(e=>/sell/i.test(e.textContent))};""")
  layout_pass=state.get('present') and state['body']['scroll']<=state['body']['client']+1 and state['root']['left']>=0 and state['root']['right']<=width+1 and state['primaryColumns']==(4 if width==1200 else 1) and len(state['rails'])==4 and all(r['overflow']=='auto' and r['wrap']=='nowrap' for r in state['rails']) and state['traces']['left']>=state['root']['left']-1 and state['traces']['right']<=state['root']['right']+1 and '275' in state['traces']['text'] and len(state['cards'])==3 and all(c['role']=='button' and c['tabIndex']==0 and c['label'] for c in state['cards'])
  results['relics_checks'].append({'size':[width,height],'kind':'layout-controls-and-cards','state':state,'pass':layout_pass})
  focused=js("const e=document.querySelector('[data-preview-relic-card]');if(!e)return false;e.focus();return document.activeElement===e")
  press_relic_key(chr(0xE007))
  opened=js("return document.querySelectorAll('.fixed.bottom-0').length===1")
  js("document.querySelector('.fixed.bottom-0 button')?.click()");time.sleep(.15)
  results['relics_checks'].append({'size':[width,height],'kind':'keyboard-drawer','focused':focused,'opened':opened,'pass':focused and opened})
 results['relics_checks'].append({'kind':'price-and-market-surface','no_sell':state['noSell'],'zero_expected_value_visible':js("return document.querySelector('[data-preview-relics-layout]').innerText.includes('0P')"),'pass':state['noSell'] and js("return document.querySelector('[data-preview-relics-layout]').innerText.includes('0P')")})

 opened_relic_planner=js("const b=[...document.querySelectorAll('nav button')].find(e=>e.textContent.trim()==='Relic Planner');if(!b)return false;b.click();return true")
 if not opened_relic_planner: raise RuntimeError('Relic Planner navigation button unavailable')
 time.sleep(.5)
 planner_rewards=[
  {'type':'/Synthetic/Prime/PlannerAlphaPrimeBlueprint','rarity':'COMMON'},
  {'type':'/Synthetic/Prime/PlannerBetaPrimeChassis','rarity':'COMMON'},
  {'type':'/Synthetic/Prime/PlannerGammaPrimeSystems','rarity':'COMMON'},
  {'type':'/Synthetic/Prime/PlannerDeltaPrimeBarrel','rarity':'UNCOMMON'},
  {'type':'/Synthetic/Prime/PlannerEpsilonPrimeReceiver','rarity':'UNCOMMON'},
  {'type':'/Synthetic/Prime/PlannerZetaPrimeStock','rarity':'RARE'}
 ]
 planner_items={row['type']:{'name':row['type'].split('/')[-1].replace('Planner','Planner ').replace('Prime',' Prime ')} for row in planner_rewards}
 planner_export={'ExportRelics':{
  '/Synthetic/Relics/T1VoidProjectionP1Bronze':{'uniqueName':'/Synthetic/Relics/T1VoidProjectionP1Bronze','era':'Lith','category':'P1','rewardManifest':'/Synthetic/Pools/PlannerOne','vaulted':False},
  '/Synthetic/Relics/T2VoidProjectionP2Bronze':{'uniqueName':'/Synthetic/Relics/T2VoidProjectionP2Bronze','era':'Meso','category':'P2','rewardManifest':'/Synthetic/Pools/PlannerTwo','vaulted':True}
 },'ExportRewards':{'/Synthetic/Pools/PlannerOne':planner_rewards,'/Synthetic/Pools/PlannerTwo':[planner_rewards[0]]+planner_rewards[2:]},'ExportItems':planner_items,'ExportRecipes':{},'ExportWeapons':{},'ExportWarframes':{},'ExportResources':{},'dict':{},'uniqueNameToName':{},'EI':{}}
 planner_inventory={'relics':[{'name':'Lith P1 Relic','era':'Lith','refinements':{'Intact':1,'Exceptional':1,'Flawless':0,'Radiant':1}},{'name':'Meso P2 Relic','era':'Meso','refinements':{'Intact':1,'Exceptional':0,'Flawless':0,'Radiant':0}}],'prime_parts':[],'primeSets':{},'all':[],'resources':[],'consumables_catalog':[],'consumables':[],'mods':[],'warframes':[],'primary':[],'secondary':[],'melee':[],'sentinels':[],'archwing':[],'foundry':[],'craftable':[],'account':{'forma':0}}
 planner_inject_script="""const el=document.getElementById('root').firstElementChild,key=Object.keys(el).find(k=>k.startsWith('__reactFiber$'));let f=el[key];while(f){const value=f.memoizedProps?.value;if(value&&Object.prototype.hasOwnProperty.call(value,'inventoryData')&&typeof value.setWorldState==='function')break;f=f.return;}if(!f||!f.return)return {ok:false,reason:'provider-not-found'};let h=f.return.memoizedState,states=[];while(h){if(h.queue&&typeof h.queue.dispatch==='function')states.push(h);h=h.next;}if(states.length<8)return {ok:false,reason:'state-hooks',count:states.length};states[0].queue.dispatch(arguments[0]);states[6].queue.dispatch(arguments[1]);states[7].queue.dispatch(false);return {ok:true,stateHooks:states.length};"""
 planner_injection=js(planner_inject_script,[planner_export,planner_inventory])
 results['relic_planner_state_injection']={'tier':'synthetic DE-export-shaped catalog and parsed-inventory-shaped ownership dispatched into the real packaged MonitoringProvider; no app source or backend mock','result':planner_injection}
 if not planner_injection.get('ok'): raise RuntimeError('MonitoringContext Relic Planner test-state injection unavailable: '+str(planner_injection))
 time.sleep(1)
 for _ in range(30):
  if js("return !!document.querySelector('[data-preview-relic-planner-layout]')"): break
  time.sleep(.25)
 if not js("return !!document.querySelector('[data-preview-relic-planner-layout]')"): raise RuntimeError('Relic Planner layout did not load')
 results['relic_planner_checks']=[]
 for width,height in [(1200,800),(900,500)]:
  api('POST',prefix+'/window/rect',{'width':width,'height':height});time.sleep(.4)
  state=js("""const root=document.querySelector('[data-preview-relic-planner-layout]'),workspace=root?.querySelector('[data-preview-relic-planner-workspace]'),panels=root?[...root.querySelectorAll('[data-preview-relic-planner-panel]')]:[],rails=root?[...root.querySelectorAll('[data-preview-relic-planner-rail]')]:[],rr=root?.getBoundingClientRect(),rects=panels.map(e=>e.getBoundingClientRect());return {present:!!root,body:{client:document.body.clientWidth,scroll:document.body.scrollWidth},root:rr?{left:rr.left,right:rr.right}:null,columns:workspace?getComputedStyle(workspace).gridTemplateColumns.split(' ').length:0,panels:rects.map(r=>({top:r.top,height:r.height,left:r.left,right:r.right})),rails:rails.map(e=>({kind:e.dataset.previewRelicPlannerRail,overflow:getComputedStyle(e).overflowX,wrap:getComputedStyle(e).flexWrap})),noSell:root?![...root.querySelectorAll('button')].some(e=>/sell/i.test(e.textContent)):false};""")
  aligned=len(state['panels'])==3 and max(p['top'] for p in state['panels'])-min(p['top'] for p in state['panels'])<=1 and max(p['height'] for p in state['panels'])-min(p['height'] for p in state['panels'])<=1
  contained=state.get('root') and state['root']['left']>=-1 and state['root']['right']<=width+1 and state['body']['scroll']<=state['body']['client']+1 and all(p['top']+p['height']<=height+1 for p in state['panels'])
  results['relic_planner_checks'].append({'size':[width,height],'kind':'three-panel-layout','state':state,'pass':state['present'] and state['columns']==3 and aligned and contained and len(state['rails'])==2 and all(r['overflow']=='auto' and r['wrap']=='nowrap' for r in state['rails'])})
 picker=js("const root=document.querySelector('[data-preview-relic-planner-panel=picker]'),b=[...(root?.querySelectorAll('button:not(:disabled)')||[])].find(e=>e.textContent.includes('Planner'));if(!b)return {ok:false};const name=b.textContent.trim();b.click();return {ok:true,name};")
 time.sleep(.5)
 selected=js("const root=document.querySelector('[data-preview-relic-planner-layout]'),remove=root?.querySelector('[data-preview-relic-planner-panel=need] button[aria-label]');return {removeLabel:remove?.getAttribute('aria-label')||'',resultCount:root?.querySelectorAll('[data-preview-relic-planner-result]').length||0,selected:root?.querySelector('[data-preview-relic-planner-panel=need]')?.innerText||''};")
 results['relic_planner_checks'].append({'kind':'real-catalog-selection-and-matching','picker':picker,'selected':selected,'pass':picker.get('ok') and picker['name'] in selected['selected'] and selected['removeLabel']=='Remove '+picker['name'] and selected['resultCount']>0})
 focused=js("const e=document.querySelector('[data-preview-relic-planner-panel=need] button[aria-label]');if(!e)return false;e.focus();return document.activeElement===e")
 api('POST',prefix+'/actions',{'actions':[{'type':'key','id':'relic-planner-keyboard','actions':[{'type':'keyDown','value':'\ue007'},{'type':'keyUp','value':'\ue007'}]}]});time.sleep(.25)
 try: api('DELETE',prefix+'/actions')
 except Exception: pass
 removed=js("return !document.querySelector('[data-preview-relic-planner-panel=need] button[aria-label]')&&!document.querySelector('[data-preview-relic-planner-result]')")
 results['relic_planner_checks'].append({'kind':'keyboard-removal','focused':focused,'removed':removed,'pass':focused and removed})
 surface=js("const root=document.querySelector('[data-preview-relic-planner-layout]');return {noSell:![...root.querySelectorAll('button')].some(e=>/sell/i.test(e.textContent)),panelKinds:[...root.querySelectorAll('[data-preview-relic-planner-panel]')].map(e=>e.dataset.previewRelicPlannerPanel),partFilters:[...root.querySelectorAll('[data-preview-relic-planner-rail=parts] button')].map(e=>e.textContent.trim()),ownershipFilters:[...root.querySelectorAll('[data-preview-relic-planner-rail=ownership] button')].map(e=>e.textContent.trim())};")
 results['relic_planner_checks'].append({'kind':'controls-and-market-surface','state':surface,'pass':surface['noSell'] and surface['panelKinds']==['picker','need','results'] and surface['partFilters']==['All','Never Obtained','Missing'] and surface['ownershipFilters']==['All','Owned','Unowned']})

 opened_market=js("const b=[...document.querySelectorAll('nav button')].find(e=>e.textContent.trim()==='Market');if(!b)return false;b.click();return true")
 if not opened_market: raise RuntimeError('Market navigation button unavailable')
 time.sleep(.8)
 market_inventory={'prime_parts':[
  {'unique_name':'/Synthetic/MarketAlpha','name':'Market Alpha Prime Blueprint','quantity':2,'ducats':45,'mastered':True},
  {'unique_name':'/Synthetic/MarketBeta','name':'Market Beta Prime Chassis','quantity':1,'ducats':50,'mastered':False},
  {'unique_name':'/Synthetic/MarketGamma','name':'Market Gamma Prime Systems','quantity':1,'ducats':20,'mastered':False},
  {'unique_name':'/Synthetic/MarketDelta','name':'Market Delta Prime Barrel','quantity':1,'ducats':25,'mastered':False},
  {'unique_name':'/Synthetic/MarketBlocked','name':'Market Blocked Prime Part','quantity':3,'ducats':100,'mastered':True},
  {'unique_name':'/Synthetic/MarketZero','name':'Market Zero Prime Part','quantity':0,'ducats':100,'mastered':True},
 ],'primeSets':{},'all':[],'resources':[],'consumables_catalog':[],'consumables':[],'mods':[],'warframes':[],'primary':[],'secondary':[],'melee':[],'sentinels':[],'archwing':[],'foundry':[],'craftable':[],'account':{'forma':0}}
 market_catalog=[
  ['/Synthetic/MarketAlpha',{'id':'market-alpha','slug':'market-alpha-prime-blueprint','tradable':True}],
  ['/Synthetic/MarketBeta',{'id':'market-beta','slug':'market-beta-prime-chassis','tradable':True}],
  ['/Synthetic/MarketGamma',{'id':'market-gamma','slug':'market-gamma-prime-systems','tradable':True}],
  ['/Synthetic/MarketDelta',{'id':'market-delta','slug':'market-delta-prime-barrel','tradable':True}],
  ['/Synthetic/MarketBlocked',{'id':'market-blocked','slug':'market-blocked-prime-part','tradable':False}],
  ['/Synthetic/MarketZero',{'id':'market-zero','slug':'market-zero-prime-part','tradable':True}],
 ]
 market_ids={
  'market-alpha':{'id':'market-alpha','slug':'market-alpha-prime-blueprint','name':'Market Alpha Prime Blueprint','icon':None},
  'market-beta':{'id':'market-beta','slug':'market-beta-prime-chassis','name':'Market Beta Prime Chassis','icon':None},
  'market-gamma':{'id':'market-gamma','slug':'market-gamma-prime-systems','name':'Market Gamma Prime Systems','icon':None},
 }
 market_orders=[
  {'id':'market-order-sell','itemId':'market-alpha','type':'sell','platinum':12,'quantity':2,'visible':True,'rank':None},
  {'id':'market-order-buy','itemId':'market-beta','type':'buy','platinum':7,'quantity':1,'visible':True,'rank':3,'subtype':'radiant'},
  {'id':'market-order-hidden','itemId':'market-gamma','type':'sell','platinum':4,'quantity':1,'visible':False,'rank':None},
 ]
 market_prices={
  'market-alpha':{'status':'ready','price':3,'timestamp':1700000000000},
  'market-beta':{'status':'ready','price':20,'timestamp':1700000000000},
  'market-gamma':{'status':'no_orders','timestamp':1700000000000},
  'market-delta':{'status':'error','timestamp':1700000000000},
 }
 market_provider_script="""const el=document.getElementById('root').firstElementChild,key=Object.keys(el).find(k=>k.startsWith('__reactFiber$'));let f=el[key];while(f){const value=f.memoizedProps?.value;if(value&&Object.prototype.hasOwnProperty.call(value,'inventoryData')&&typeof value.setWorldState==='function')break;f=f.return;}if(!f||!f.return)return {ok:false,reason:'provider-not-found'};let h=f.return.memoizedState,states=[];while(h){if(h.queue&&typeof h.queue.dispatch==='function')states.push(h);h=h.next;}if(states.length<8)return {ok:false,reason:'provider-state-hooks',count:states.length};states[6].queue.dispatch(arguments[0]);states[7].queue.dispatch(false);return {ok:true,stateHooks:states.length};"""
 market_provider=js(market_provider_script,[market_inventory])
 if not market_provider.get('ok'): raise RuntimeError('MonitoringContext Market test-state injection unavailable: '+str(market_provider))
 time.sleep(.4)
 market_inject_script="""const root=document.querySelector('[data-preview-market-layout]');if(!root)return {ok:false,reason:'layout-not-found'};const key=Object.keys(root).find(k=>k.startsWith('__reactFiber$'));let f=root[key],states=[];while(f){let h=f.memoizedState,candidate=[];while(h){if(h.queue&&typeof h.queue.dispatch==='function')candidate.push(h);h=h.next;}if(candidate.length>=24){states=candidate;break}f=f.return;}if(states.length<24)return {ok:false,reason:'market-state-hooks',count:states.length};const values=[arguments[0],arguments[1],new Map(arguments[2]),'ready','all','',false,arguments[3],arguments[4],null,null,null,1,{},'','all','plat_ratio',false,null,{}, {},arguments[5],0,arguments[6]];values.forEach((value,index)=>states[index].queue.dispatch(value));return {ok:true,stateHooks:states.length};"""
 market_keys=['/Synthetic/MarketAlpha','/Synthetic/MarketBeta','/Synthetic/MarketGamma','/Synthetic/MarketDelta']
 market_injection=js(market_inject_script,['SYNTHETIC-NATIVE-NO-ACCOUNT','active_orders',market_catalog,market_orders,market_ids,market_prices,market_keys])
 results['market_state_injection']={'tier':'synthetic parsed inventory, catalog, orders and explicit price states dispatched into the real packaged React components; no backend or network mock','provider':market_provider,'market':market_injection}
 if not market_injection.get('ok'): raise RuntimeError('Market component test-state injection unavailable: '+str(market_injection))
 time.sleep(.6)
 # Reassert deterministic local state after the no-network order refresh triggered by the synthetic token settles.
 market_injection=js(market_inject_script,['SYNTHETIC-NATIVE-NO-ACCOUNT','active_orders',market_catalog,market_orders,market_ids,market_prices,market_keys])
 time.sleep(.3)
 results['market_checks']=[]
 identity=js("""const root=document.querySelector('[data-preview-market-layout]');return {present:!!root,notice:root?.querySelector('[data-preview-market-readonly]')?.textContent.trim(),tabs:[...root.querySelectorAll('[data-preview-market-tabs] button')].map(e=>e.textContent.trim()),metrics:root?.querySelector('[data-preview-market-metrics]')?.children.length||0,sync:[...root.querySelectorAll('button')].some(e=>e.textContent.trim()==='Sync Listings'),website:[...root.querySelectorAll('a')].some(e=>e.textContent.trim()==='Open Website')};""")
 results['market_checks'].append({'kind':'identity-readonly-and-read-actions','state':identity,'pass':identity['present'] and identity['notice']=='Preview mode: market data is read-only. Listing, editing, visibility, sold, and delete actions are disabled.' and len(identity['tabs'])==2 and identity['metrics']==4 and identity['sync'] and identity['website']})
 for width,height in [(1200,800),(900,500)]:
  api('POST',prefix+'/window/rect',{'width':width,'height':height});time.sleep(.4)
  active=js("""const root=document.querySelector('[data-preview-market-layout]'),metrics=root?.querySelector('[data-preview-market-metrics]'),viewport=root?.querySelector('[data-preview-market-table-viewport]'),table=root?.querySelector('[data-preview-market-table]'),rr=root?.getBoundingClientRect();return {present:!!root,root:rr?{left:rr.left,right:rr.right}:null,body:{client:document.body.clientWidth,scroll:document.body.scrollWidth},metricColumns:metrics?new Set([...metrics.children].map(e=>Math.round(e.getBoundingClientRect().left))).size:0,table:{client:viewport?.clientWidth||0,scroll:viewport?.scrollWidth||0,overflow:viewport?getComputedStyle(viewport).overflowX:null,width:table?.getBoundingClientRect().width||0},rows:root?.querySelectorAll('tbody tr').length||0};""")
  active_pass=active['present'] and active['root']['left']>=0 and active['root']['right']<=width+1 and active['body']['scroll']<=active['body']['client']+1 and active['metricColumns']==(4 if width==1200 else 2) and active['table']['overflow']=='auto' and active['rows']==3
  results['market_checks'].append({'size':[width,height],'kind':'active-orders-geometry','state':active,'pass':active_pass})
 active_mutation_controls=js("return [...document.querySelectorAll('[data-preview-market-mutation]')].map(e=>({kind:e.dataset.previewMarketMutation,disabled:e.disabled===true,aria:e.getAttribute('aria-disabled'),title:e.title}))")
 js("document.querySelectorAll('[data-preview-market-mutation]').forEach(e=>e.click())")
 stock_tab_focused=js("const b=[...document.querySelectorAll('[data-preview-market-tabs] button')].find(e=>e.textContent.includes('Tradeable Stock'));if(!b)return false;b.focus();return document.activeElement===b")
 api('POST',prefix+'/actions',{'actions':[{'type':'key','id':'market-tab-keyboard','actions':[{'type':'keyDown','value':'\ue007'},{'type':'keyUp','value':'\ue007'}]}]});time.sleep(.3)
 try: api('DELETE',prefix+'/actions')
 except Exception: pass
 keyboard_state=js("return {focused:document.activeElement?.textContent.includes('Tradeable Stock')===true,stockVisible:!!document.querySelector('[data-preview-market-stock-grid]'),filterButtons:document.querySelectorAll('[data-preview-market-rail=stock] button').length,search:!!document.querySelector('input[placeholder=\"Search stock...\"]')}")
 results['market_checks'].append({'kind':'keyboard-tab-and-toolbar-access','initialFocus':stock_tab_focused,'state':keyboard_state,'pass':stock_tab_focused and keyboard_state['stockVisible'] and keyboard_state['filterButtons']==5 and keyboard_state['search']})
 for width,height in [(1200,800),(900,500)]:
  api('POST',prefix+'/window/rect',{'width':width,'height':height});time.sleep(.4)
  stock=js("""const root=document.querySelector('[data-preview-market-layout]'),grid=root?.querySelector('[data-preview-market-stock-grid]'),rail=root?.querySelector('[data-preview-market-rail=stock]'),rr=root?.getBoundingClientRect();return {present:!!grid,root:rr?{left:rr.left,right:rr.right}:null,body:{client:document.body.clientWidth,scroll:document.body.scrollWidth},columns:grid?new Set([...grid.children].map(e=>Math.round(e.getBoundingClientRect().left))).size:0,cards:grid?.children.length||0,rail:{overflow:rail?getComputedStyle(rail).overflowX:null,wrap:rail?getComputedStyle(rail).flexWrap:null}};""")
  stock_pass=stock['present'] and stock['root']['left']>=0 and stock['root']['right']<=width+1 and stock['body']['scroll']<=stock['body']['client']+1 and stock['columns']==(3 if width==1200 else 2) and stock['cards']==4 and stock['rail']['overflow']=='auto' and stock['rail']['wrap']=='nowrap'
  results['market_checks'].append({'size':[width,height],'kind':'tradeable-stock-geometry','state':stock,'pass':stock_pass})
 price_state=js("""const grid=document.querySelector('[data-preview-market-stock-grid]'),cards=[...grid.children].map(e=>({name:e.querySelector('.font-semibold')?.textContent.trim(),text:e.innerText,input:e.querySelector('input')?.value,placeholder:e.querySelector('input')?.placeholder,sellDisabled:[...e.querySelectorAll('button')].find(b=>b.textContent.includes('Sell on WFM'))?.disabled}));return {cards,names:cards.map(e=>e.name),blocked:!document.body.innerText.includes('Market Blocked Prime Part'),zero:!document.body.innerText.includes('Market Zero Prime Part')};""")
 price_pass=len(price_state['cards'])==4 and price_state['blocked'] and price_state['zero'] and any(c['name']=='Market Alpha Prime Blueprint' and c['input']=='3' for c in price_state['cards']) and any(c['name']=='Market Beta Prime Chassis' and c['input']=='20' for c in price_state['cards']) and all(c['placeholder']=='?' for c in price_state['cards'] if c['name'] in ['Market Gamma Prime Systems','Market Delta Prime Barrel'])
 results['market_checks'].append({'kind':'price-states-tradability-and-quantity','state':price_state,'pass':price_pass})
 stock_mutation_controls=js("return [...document.querySelectorAll('[data-preview-market-mutation]')].map(e=>({kind:e.dataset.previewMarketMutation,disabled:e.disabled===true,aria:e.getAttribute('aria-disabled'),title:e.title}))")
 controls=active_mutation_controls+stock_mutation_controls
 control_kinds=set(c['kind'] for c in controls)
 results['market_checks'].append({'kind':'mutation-controls-disabled-with-reason','controls':controls,'pass':{'listing-price','sell'}.issubset(control_kinds) and all((c['disabled'] or c['aria']=='true') and c['title']=='Market changes are disabled in Preview' for c in controls)})
 js("document.querySelectorAll('[data-preview-market-mutation]').forEach(e=>e.click())")
 time.sleep(.3)
 component_evidence_path=evidence/'market-component.json'
 component_evidence=json.loads(component_evidence_path.read_text())
 frontend_mutations=component_evidence['preview_mutation_invocations']
 component_zero=next(row for row in component_evidence['checks'] if row['name']=='preview-zero-frontend-mutation-invocations')
 results['market_frontend_mutation_invocations']=frontend_mutations
 results['market_checks'].append({'kind':'zero-frontend-mutation-invocations','tier':'module-boundary component capture plus native packaged disabled-control verification','component_evidence':str(component_evidence_path),'component_sha256':hashlib.sha256(component_evidence_path.read_bytes()).hexdigest(),'invocations':frontend_mutations,'native_controls':controls,'pass':component_zero['pass'] is True and frontend_mutations==[] and all(c['disabled'] or c['aria']=='true' for c in controls)})
 guard_by_command={row['command']:row for row in results['market_guards']}
 required_guards=['post_market_order','delete_market_order','update_market_order','close_market_order']
 results['market_checks'].append({'kind':'direct-four-mutation-ipc-rejections','commands':required_guards,'results':[guard_by_command[name] for name in required_guards],'pass':all(guard_by_command.get(name,{}).get('pass') is True for name in required_guards)})


 # Stage 3J Settings: twelve incremental checks on the real packaged UI.
 click('Settings')
 time.sleep(.5)
 results['settings_checks']=[]
 component_evidence_path=evidence/'settings-component.json'
 component_evidence=json.loads(component_evidence_path.read_text())
 notice_text='Live monitoring, scanner and hotkey registration, notification and overlay tests, and app updates are disabled in Preview. Profile preferences and read-only data tools remain available.'
 identity=js("""const root=document.querySelector('[data-preview-settings-shell]'),rail=root?.querySelector('nav[aria-label=\"Settings sections\"]');return {present:!!root,notice:[...root.querySelectorAll('[role=status]')].some(e=>e.textContent.trim()===arguments[0]),links:[...rail.querySelectorAll('a')].map(e=>({text:e.textContent.trim(),href:e.getAttribute('href')})),sections:[...root.querySelectorAll('[data-preview-settings-section]')].map(e=>e.dataset.previewSettingsSection),disabled:[...root.querySelectorAll('[data-preview-settings-disabled]')].map(e=>({disabled:e.disabled,label:e.getAttribute('aria-label'),controls:[...e.querySelectorAll('button,input,select')].length}))};""",[notice_text])
 results['settings_checks'].append({'kind':'identity-sections-and-disabled-groups','state':identity,'pass':identity['present'] and identity['notice'] and len(identity['links'])==9 and len(identity['sections'])==10 and len(identity['disabled'])==5 and all(e['disabled'] is True and e['label'] and e['controls']>0 for e in identity['disabled'])})
 for width,height in [(1200,800),(900,500)]:
  api('POST',prefix+'/window/rect',{'width':width,'height':height});time.sleep(.4)
  geometry=js("""const root=document.querySelector('[data-preview-settings-shell]'),rail=root?.querySelector('nav[aria-label=\"Settings sections\"]'),cards=[...root.querySelectorAll('[data-preview-settings-section]')],rr=root?.getBoundingClientRect();return {root:rr?{left:rr.left,right:rr.right}:null,body:{client:document.body.clientWidth,scroll:document.body.scrollWidth},rail:{client:rail?.clientWidth||0,scroll:rail?.scrollWidth||0,overflow:rail?getComputedStyle(rail).overflowX:null},cardsContained:cards.every(e=>{const r=e.getBoundingClientRect();return r.left>=rr.left-1&&r.right<=rr.right+1}),disabledCount:root?.querySelectorAll('fieldset[data-preview-settings-disabled]:disabled').length||0};""")
  results['settings_checks'].append({'kind':'layout-geometry','size':[width,height],'state':geometry,'pass':geometry['root']['left']>=0 and geometry['root']['right']<=width+1 and geometry['body']['scroll']<=geometry['body']['client']+1 and geometry['rail']['overflow']=='auto' and geometry['cardsContained'] and geometry['disabledCount']==5})
 anchor=js("""const links=[...document.querySelectorAll('nav[aria-label=\"Settings sections\"] a')],last=links.at(-1);last.focus();const focusedBeforeActivation=document.activeElement===last;last.click();return {focusedBeforeActivation,hash:location.hash,target:!!document.querySelector(last.getAttribute('href')),allTargets:links.every(e=>!!document.querySelector(e.getAttribute('href')))};""")
 results['settings_checks'].append({'kind':'keyboard-focus-and-section-anchor','state':anchor,'pass':anchor['focusedBeforeActivation'] and anchor['hash']=='#preview-settings-updates' and anchor['target'] and anchor['allTargets']})
 unavailable=component_evidence['preview_unavailable_invocations']
 component_unavailable=next(row for row in component_evidence['checks'] if row['name']=='preview-zero-unavailable-live-invocations')
 results['settings_frontend_unavailable_invocations']=unavailable
 results['settings_checks'].append({'kind':'zero-preview-unavailable-frontend-invocations','tier':'module-boundary component capture plus native packaged disabled-fieldset verification','component_evidence':str(component_evidence_path),'component_sha256':hashlib.sha256(component_evidence_path.read_bytes()).hexdigest(),'invocations':unavailable,'native_disabled_groups':identity['disabled'],'pass':component_unavailable['pass'] is True and unavailable==[] and len(identity['disabled'])==5 and all(e['disabled'] is True for e in identity['disabled'])})
 relay_invocations=component_evidence['preview_relay_event_invocations']
 relay_zero=next(row for row in component_evidence['checks'] if row['name']=='preview-zero-relay-event-invocations')
 results['settings_relay_event_invocations']=relay_invocations
 results['settings_checks'].append({'kind':'zero-preview-relay_event-invocations','tier':'module-boundary component capture; relay_event has no Rust require_live guard','invocations':relay_invocations,'pass':relay_zero['pass'] is True and relay_invocations==[]})
 stop_invocations=component_evidence['preview_stop_log_scanner_invocations']
 stop_zero=next(row for row in component_evidence['checks'] if row['name']=='preview-zero-stop-log-scanner-invocations')
 results['settings_stop_log_scanner_invocations']=stop_invocations
 results['settings_checks'].append({'kind':'zero-preview-stop_log_scanner-invocations','tier':'module-boundary component capture; stop_log_scanner has no Rust require_live guard','invocations':stop_invocations,'pass':stop_zero['pass'] is True and stop_invocations==[]})
 direct=[]
 for command,args in [('start_log_scanner',{}),('set_hotkeys',{'hotkeys':[]}),('play_notification_sound',{'sound':'notification1.wav'}),('show_notification',{'title':'Synthetic Settings test','message':'Private test'}),('set_monitoring_active',{'active':True,'result':'idle','statusText':'Synthetic Settings test'})]:
  value=ipc(command,args)
  direct.append({'command':command,'result':value,'pass':value.get('resolved') is False and 'disabled' in value.get('error','')})
 results['settings_direct_guards']=direct
 results['settings_checks'].append({'kind':'direct-five-live-ipc-rejections','commands':[e['command'] for e in direct],'results':direct,'pass':all(e['pass'] for e in direct)})
 retained=js("""const root=document.querySelector('[data-preview-settings-shell]');return {wfmPassword:!!root.querySelector('input[type=password]'),soundChoices:root.querySelectorAll('button').length>5,cacheBrowse:[...root.querySelectorAll('button')].some(e=>e.textContent.trim()===arguments[0]),priceRefresh:[...root.querySelectorAll('button')].some(e=>e.textContent.trim()===arguments[1]),updaterMessage:[...root.querySelectorAll('[role=status]')].some(e=>e.textContent.trim()==='Application updates are disabled in Preview.')};""",[translations['ui.setup.browse'],translations['settings.refresh_prices_button']])
 results['settings_checks'].append({'kind':'profile-and-read-only-tools-retained','state':retained,'pass':all(retained.values())})
 updater=js("""const root=document.querySelector('[data-preview-settings-shell]'),p=[...root.querySelectorAll('[role=status]')].find(e=>e.textContent.trim()==='Application updates are disabled in Preview.'),panel=p?.parentElement,b=[...panel?.querySelectorAll('button')||[]].find(e=>e.textContent.trim()===arguments[0]);return {message:!!p,buttonDisabled:b?.disabled===true,startupAbsent:!panel?.textContent.includes(arguments[1])};""",[check_label,startup_label])
 results['settings_checks'].append({'kind':'updater-disabled-state-retained','state':updater,'pass':updater['message'] and updater['buttonDisabled'] and updater['startupAbsent']})
 api('POST',prefix+'/refresh',{});time.sleep(3)
 click('Settings')
 reload_state=js("""const root=document.querySelector('[data-preview-settings-shell]'),rail=root?.querySelector('nav[aria-label=\"Settings sections\"]'),rr=root?.getBoundingClientRect();return {present:!!root,links:rail?.querySelectorAll('a').length||0,sections:root?.querySelectorAll('[data-preview-settings-section]').length||0,disabled:root?.querySelectorAll('fieldset[data-preview-settings-disabled]:disabled').length||0,notice:[...root?.querySelectorAll('[role=status]')||[]].some(e=>e.textContent.trim()===arguments[0]),contained:rr?.left>=0&&rr?.right<=innerWidth+1,bodyClient:document.body.clientWidth,bodyScroll:document.body.scrollWidth};""",[notice_text])
 results['settings_checks'].append({'kind':'reload-persistence','state':reload_state,'pass':reload_state['present'] and reload_state['links']==9 and reload_state['sections']==10 and reload_state['disabled']==5 and reload_state['notice'] and reload_state['contained'] and reload_state['bodyScroll']<=reload_state['bodyClient']+1})
 component_summary=component_evidence['summary']
 results['settings_checks'].append({'kind':'component-evidence-completeness','summary':component_summary,'pass':component_summary['total']==62 and component_summary['passed']==62 and component_summary['preview_unavailable_invocation_count']==0 and component_summary['preview_relay_event_invocation_count']==0 and component_summary['preview_stop_log_scanner_invocation_count']==0})

 api('DELETE',prefix)
except Exception as e:results['error']=str(e)
finally:
 for p in reversed(processes):
  if p.poll() is None:
   os.killpg(p.pid, signal.SIGTERM) if p.pid in process_groups else p.terminate()
   try:p.wait(timeout=8)
   except subprocess.TimeoutExpired:p.kill();p.wait()
 for f in logs:f.close()
 with open(evidence/'settings-deb-equipped-remove.log','w') as log:
  removed=subprocess.run(['dpkg','--remove','kieda-s-orbiter-preview'],stdout=log,stderr=subprocess.STDOUT)
 results['removal']={'exit':removed.returncode,'executable_absent':not binary.exists(),'synthetic_profile_retained':(scratch/'xdgdata/kiedas-orbiter-preview').exists()}
 (evidence/'settings-deb-packaged-smoke.json').write_text(json.dumps(results,indent=2)+'\n')
 print(json.dumps(results,indent=2))
