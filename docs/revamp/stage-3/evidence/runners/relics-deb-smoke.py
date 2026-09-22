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
with open(evidence/'relics-deb-equipped-install.log','w') as log:
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
 xvfb=start([str(bins/'Xvfb'),':'+str(display),'-screen','0','1200x800x24','-nolisten','unix','-listen','tcp','-ac'], 'relics-deb-packaged-xvfb.log')
 time.sleep(2)
 if xvfb.poll() is not None:raise RuntimeError('Headless display failed; see relics-deb-packaged-xvfb.log')
 conf=scratch/'dbus.conf';conf.write_text('<busconfig><type>session</type><listen>unix:tmpdir='+str(scratch/'runtime')+'</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/></policy></busconfig>')
 bus=subprocess.Popen([str(bins/'dbus-daemon'),'--nofork','--print-address=1','--config-file='+str(conf)],env=env,stdout=subprocess.PIPE,stderr=open(evidence/'relics-deb-packaged-dbus.log','w'),text=True);processes.append(bus)
 import select
 if not select.select([bus.stdout],[],[],5)[0]:raise RuntimeError('Private D-Bus did not start')
 env['DBUS_SESSION_BUS_ADDRESS']=bus.stdout.readline().strip()
 driver=start([str(bins/'WebKitWebDriver'),'--port=17777'],'relics-deb-packaged-webdriver.log')
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
 api('DELETE',prefix)
except Exception as e:results['error']=str(e)
finally:
 for p in reversed(processes):
  if p.poll() is None:
   os.killpg(p.pid, signal.SIGTERM) if p.pid in process_groups else p.terminate()
   try:p.wait(timeout=8)
   except subprocess.TimeoutExpired:p.kill();p.wait()
 for f in logs:f.close()
 with open(evidence/'relics-deb-equipped-remove.log','w') as log:
  removed=subprocess.run(['dpkg','--remove','kieda-s-orbiter-preview'],stdout=log,stderr=subprocess.STDOUT)
 results['removal']={'exit':removed.returncode,'executable_absent':not binary.exists(),'synthetic_profile_retained':(scratch/'xdgdata/kiedas-orbiter-preview').exists()}
 (evidence/'relics-deb-packaged-smoke.json').write_text(json.dumps(results,indent=2)+'\n')
 print(json.dumps(results,indent=2))
