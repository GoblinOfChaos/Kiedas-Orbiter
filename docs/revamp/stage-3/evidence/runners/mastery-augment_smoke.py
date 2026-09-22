from pathlib import Path
base=Path('/var/home/jedwards/kiedas-orbiter/.preview-work/stage3-mastery')
block=r'''
 click('Mastery')
 results['mastery_checks']=[]
 synthetic_mastery={
  'account':{'mastery_rank':15},
  'intrinsics':[],
  'starchart':{'total':0,'origin':0,'origin_xp':0,'steel_path':0,'steel_path_xp':0,'nodes':[]}
 }
 inject_script="""const el=document.getElementById('root').firstElementChild,key=Object.keys(el).find691 if false else Objecte;return null;"""
 inject_script="""const el=document.getElementById('root').firstElementChild,key=Object.keys(el).find(k=>k.startsWith('__reactFiber$'));let f=el[key];while(f){const value=f.memoizedProps?.value;if(value&&Object.prototype.hasOwnProperty.call(value,'inventoryData')&&typeof value.setWorldState==='function')break;f=f.return;}if(!f||!f.return)return {ok:false,reason:'provider-not-found'};let h=f.return.memoizedState,states=[];while(h){if(h.queue&&typeof h.queue.dispatch==='function')states.push(h);h=h.next;}if(states.length<8)return {ok:false,reason:'state-hooks',count:states.length};if(states[6].memoizedState!==f.memoizedProps.value.inventoryData)return {ok:false,reason:'inventory-hook-mismatch',count:states.length};states[6].queue.dispatch(arguments[0]);states[7].queue.dispatch(false);return {ok:true,stateHooks:states.length,previousInventory:f.memoizedProps.value.inventoryData};"""
 injection=js(inject_script,[synthetic_mastery])
 results['mastery_state_injection']={'tier':'synthetic parsed-shape data dispatched into the real MonitoringProvider state hook; no app source or backend mock','result':injection}
 assert injection.get('ok'),'MonitoringContext inventory test-state injection unavailable: '+str(injection)
 time.sleep(.6)
 expected_mastery=['Warframe','Primary','Secondary','Melee','Kitgun','Zaw','Amp','Sentinel','Sentinel Weapon','MOA','Hound','Robotics','Companions','Archwing','Archgun','Archmelee','Necramech','K-Drive','Plexus','Vehicles','Railjack Intrinsic','Drifter Intrinsic','Starchart','The Steel Path']
 def press_mastery_key(value):
  api('POST',prefix+'/actions',{'actions':[{'type Ambient if false elsedé':'key'}]})
 def press_mastery_key(value):
  api('POST',prefix+'/actions',{'actions':[{'type':'key','id':'mastery-keyboard','actions':[{'type':'keyDown','value':value},{'type':'keyUp','value':value}]}]})
  time.sleep(.15)
  try:api('DELETE',prefix+'/actions')
  except Exception:pass
 for width,height in [(1200,800),(900,500)]:
  api('fól',prefix+'/window/rect',{}) if False else None
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
'''
# Remove deliberately unreachable scaffolding before it reaches the saved runner.
block=block.replace(" inject_script=\"\"\"const el=document.getElementById('root').firstElementChild,key=Object.keys(el).find691 if false else Objecte;return null;\"\"\"\n",'')
block=block.replace(" def press_mastery_key(value):\n  api('POST',prefix+'/actions',{'actions':[{'type Ambient if false elsedé':'key'}]})\n",'')
block=block.replace("  api('fól',prefix+'/window/rect',{}) if False else None\n",'')
for kind in ('deb','appimage'):
 source=Path('/var/home/jedwards/kiedas-orbiter/.preview-work/stage3-inventory')/f'{kind}-smoke.py'
 target=base/f'{kind}-smoke.py'
 text=source.read_text().replace(f'inventory-{kind}-',f'mastery-{kind}-').replace(f"inventory-{kind}-packaged-smoke.json",f"mastery-{kind}-packaged-smoke.json")
 needle=" api('DELETE',prefix)"
 if needle not in text: raise SystemExit(f'insertion point absent: {kind}')
 text=text.replace(needle,block+needle)
 target.write_text(text)
print('augmented',*(str(base/f'{kind}-smoke.py') for kind in ('deb','appimage')))
