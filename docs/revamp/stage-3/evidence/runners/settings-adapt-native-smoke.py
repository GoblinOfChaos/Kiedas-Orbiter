#!/usr/bin/python3
"""Derive Stage 3J native harnesses from the accepted Stage 3I matrix."""

from pathlib import Path


ROOT = Path("/var/home/jedwards/kiedas-orbiter")
SOURCE = ROOT / ".preview-work/stage3-market"
DESTINATION = ROOT / ".preview-work/stage3-settings"

SETTINGS_BLOCK = r'''

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
'''


def adapt(kind: str) -> None:
    source = SOURCE / f"{kind}-smoke.py"
    destination = DESTINATION / f"{kind}-smoke.py"
    if not source.is_file():
        raise FileNotFoundError(source)
    if not (ROOT / "docs/revamp/stage-3/evidence/settings-component.json").is_file():
        raise FileNotFoundError("Settings component evidence is required")
    text = source.read_text()
    text = text.replace(f"market-{kind}-", f"settings-{kind}-")
    text = text.replace(
        f"evidence/'market-{kind}-packaged-smoke.json'",
        f"evidence/'settings-{kind}-packaged-smoke.json'",
    )
    # This accepted cumulative check must continue reading Stage 3I evidence.
    text = text.replace("evidence/'settings-component.json'\n component_evidence=json.loads(component_evidence_path.read_text())\n frontend_mutations", "evidence/'market-component.json'\n component_evidence=json.loads(component_evidence_path.read_text())\n frontend_mutations", 1)
    marker = " api('DELETE',prefix)\nexcept Exception as e:results['error']=str(e)"
    if text.count(marker) != 1:
        raise RuntimeError(f"unexpected completion marker count in {source}")
    text = text.replace(marker, SETTINGS_BLOCK + "\n" + marker)
    destination.write_text(text)
    destination.chmod(0o755)


if __name__ == "__main__":
    if not DESTINATION.is_dir():
        raise FileNotFoundError(DESTINATION)
    adapt("deb")
    adapt("appimage")
