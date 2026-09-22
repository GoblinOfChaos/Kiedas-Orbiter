from pathlib import Path
import shutil


ROOT = Path('/var/home/jedwards/kiedas-orbiter')
WORK = ROOT / '.preview-work/stage3-settings'
FIXTURE = WORK / 'fixture'
CHECKOUT = ROOT / '.preview-work/stage2'
SOURCE = CHECKOUT / 'src/screens/Settings.jsx'
BEFORE = WORK / 'before/Settings.jsx'
APP_CSS_MATCHES = sorted((CHECKOUT / 'dist/assets').glob('index-*.css'))
for path in (ROOT / 'AGENTS.md', SOURCE, BEFORE, CHECKOUT / 'src/index.css'):
    if not path.exists():
        raise FileNotFoundError(f'precondition path missing: {path}')
if len(APP_CSS_MATCHES) != 1:
    raise RuntimeError(f'expected exactly one built app stylesheet, found {APP_CSS_MATCHES}')

FIXTURE.mkdir(parents=True, exist_ok=True)
shutil.copy2(BEFORE, FIXTURE / 'Settings.before.jsx')
shutil.copy2(APP_CSS_MATCHES[0], FIXTURE / 'app.css')
before_text = (FIXTURE / 'Settings.before.jsx').read_text().replace(
    "from '../", "from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/"
).replace(
    "import('../", "import('/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/"
)
(FIXTURE / 'Settings.before.jsx').write_text(before_text)
(FIXTURE / 'index.html').write_text(
    '<!doctype html><html><body><div id="root"></div><script type="module" src="/entry.jsx"></script></body></html>\n'
)
(FIXTURE / 'vite.config.mjs').write_text("""import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
const root='/var/home/jedwards/kiedas-orbiter/.preview-work/stage3-settings/fixture';
const mock=root+'/mock.js';
export default defineConfig({
  root,plugins:[react()],publicDir:false,
  resolve:{alias:[
    {find:/.*\\/contexts\\/(MonitoringContext|UiContext|ThemeContext|UpdateContext)(\\.jsx)?$/,replacement:mock},
    {find:/.*\\/lib\\/(buildProfile|settings|acquisitionAudit)(\\.js)?$/,replacement:mock},
    {find:/.*\\/components\\/NotificationManager(\\.jsx)?$/,replacement:root+'/notification.jsx'},
    {find:/.*\\/components\\/LanguagePicker(\\.jsx)?$/,replacement:root+'/language.jsx'},
    {find:/.*\\/components\\/FeatureGuideModal(\\.jsx)?$/,replacement:root+'/guide.jsx'},
    {find:/.*\\/components\\/BugReporterModal(\\.jsx)?$/,replacement:root+'/bug.jsx'},
    {find:'@tauri-apps/api/core',replacement:mock},
    {find:'@tauri-apps/api/app',replacement:mock},
    {find:'@tauri-apps/plugin-dialog',replacement:mock}
  ]},
  build:{outDir:'dist',emptyOutDir:true}
});
""")
(FIXTURE / 'mock.js').write_text("""import en from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/lib/i18n/en.json';
import de from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/lib/i18n/de.json';
const locales={en,de};
export let IS_PREVIEW=true;
export function setPreview(value){IS_PREVIEW=value;}
export function t(key,args){const selected=locales[window.fixture?.locale||'en']||en;let value=selected.ui[key]??en.ui[key]??key;for(const [name,replacement] of Object.entries(args||{}))value=String(value).replaceAll('{{'+name+'}}',String(replacement)).replaceAll('{'+name+'}',String(replacement));return value;}
export function useUi(){return {t};}
export function getSetting(key,fallback){return Object.prototype.hasOwnProperty.call(window.fixture.settings,key)?window.fixture.settings[key]:fallback;}
export async function setSetting(key,value){window.fixture.settings[key]=value;window.fixture.calls.push({command:'setSetting',args:{key,value}});}
export function onSettingsChanged(){return ()=>{};}
export async function open(){window.fixture.calls.push({command:'openDialog',args:{directory:true,multiple:false}});return '/synthetic/Cache.Windows';}
export function convertFileSrc(path){return path;}
export async function getVersion(){return '1.3.3-fixture';}
export async function invoke(command,args){
  window.fixture.calls.push({command,args});
  if(command==='check_exports'&&window.fixture.blockLocale)return new Promise(()=>{});
  if(command==='get_ui_path')return '';
  if(command==='get_available_monitors')return [{index:0,name:'Primary Synthetic Monitor With A Long Name',width:1920,height:1080,is_primary:true},{index:1,name:'Secondary',width:1280,height:720,is_primary:false}];
  if(command==='get_scanner_status')return window.fixture.scannerStatus;
  if(command==='get_data_root_path')return '/synthetic/preview-root';
  if(command==='read_file_bytes')return Array.from(new TextEncoder().encode('{"components":{},"mods":{}}'));
  return null;
}
export function useTheme(){return {theme:window.fixture.theme,setTheme:value=>{window.fixture.theme=value;window.fixture.calls.push({command:'setTheme',args:{value}});},themes:window.fixture.themes,cursorStyle:window.fixture.cursorStyle,setCursorStyle:value=>{window.fixture.cursorStyle=value;window.fixture.calls.push({command:'setCursorStyle',args:{value}});},cursorTint:window.fixture.cursorTint,setCursorTint:value=>{window.fixture.cursorTint=value;window.fixture.calls.push({command:'setCursorTint',args:{value}});}};}
export function useUpdate(){return {updateState:window.fixture.updateState,checkForUpdates:()=>window.fixture.calls.push({command:'checkForUpdates'}),installLatestUpdate:()=>window.fixture.calls.push({command:'installLatestUpdate'})};}
export function useMonitoring(){return {
  isMonitoring:window.fixture.monitoring.isMonitoring,startMonitoring:async()=>window.fixture.calls.push({command:'startMonitoring'}),stopMonitoring:()=>window.fixture.calls.push({command:'stopMonitoring'}),manualRefresh:()=>window.fixture.calls.push({command:'manualRefresh'}),lastUpdate:1700000000000,statusText:'Synthetic status',autoStart:false,setAutoStart:value=>window.fixture.calls.push({command:'setAutoStart',args:{value}}),monitorResult:window.fixture.monitoring.result,nextRetryAt:Date.now()+120000,refreshPrices:()=>window.fixture.calls.push({command:'refreshPrices'}),isPriceLoading:window.fixture.price.loading,priceFetchProgress:window.fixture.price.progress,priceLastUpdated:window.fixture.price.updated,retryCardImages:()=>window.fixture.calls.push({command:'retryCardImages'}),
  exportData:{},inventoryData:{mods:[],prime_parts:[]},dropIndex:{},recipeResultIndex:{},exaltedWeaponIndex:{},marketIndex:{},bundleIndex:{},syndicateIndex:{},wikiSigilIndex:{},wikiVendorIndex:{},wikiTennoGenIndex:{},wikiBaroIndex:{},exportVendorIndex:{},alwaysAvailableIndex:{},glyphSupplementIndex:{},wikiBlueprintIndex:{},wikiResearchIndex:{},relicStateIndex:{},wikiResourceIndex:{},wikiPageAcquisitionIndex:{},wikiAcquisitionStatusIndex:{},exportComponentIndex:{}
};}
export function runAcquisitionCoverageAudit(){return {totalMissing:2};}
export function formatAuditReport(){return 'synthetic coverage report';}
export function buildCosmeticsCatalog(){return [];}
export function buildModsCatalog(){return [];}
export function buildRelicsCatalog(){return [];}
export function buildInventoryCatalog(){return [];}
""")
(FIXTURE / 'notification.jsx').write_text("""export default function NotificationManager(){return <div data-fixture-notifications>Notification triggers fixture</div>;}\n""")
(FIXTURE / 'language.jsx').write_text("""export default function LanguagePicker({value,onChange}){return <select aria-label="Game language" value={value} onChange={e=>onChange(e.target.value)}><option value="en">English</option><option value="de">Deutsch</option></select>;}\n""")
(FIXTURE / 'guide.jsx').write_text("""export default function FeatureGuideModal({isOpen,onClose}){return isOpen?<div role="dialog" aria-label="Feature guide"><button onClick={onClose}>Close guide</button></div>:null;}\n""")
(FIXTURE / 'bug.jsx').write_text("""export default function BugReporterModal({isOpen,onClose}){return isOpen?<div role="dialog" aria-label="Bug reporter"><button onClick={onClose}>Close report</button></div>:null;}\n""")
(FIXTURE / 'entry.jsx').write_text("""import React from 'react';
import './app.css';
import '@fontsource/outfit/400.css';import '@fontsource/outfit/600.css';import '@fontsource/outfit/700.css';import '@fontsource/jetbrains-mono/400.css';
import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import Settings from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/screens/Settings.jsx';
import Before from './Settings.before.jsx';import {setPreview,t} from './mock.js';
const root=createRoot(document.getElementById('root'));
const defaults={notif_position:'top-right',notif_sound:'notification1.wav',fissure_overlay_enabled:false,use_ee_log:false,ee_log_path:'',wfm_token:'',warframe_cache_path:'',fissure_ui_scale:100,fissure_target_monitor:'auto',sidebar_side:'left',sidebar_width:480,sidebar_hide_on_focus_loss:true,hotkeys:[{action:'manual_ocr',shortcut:'Ctrl+R'},{action:'toggle_sidebar',shortcut:'Ctrl+M'}],update_on_startup:true,gameLocale:'en'};
const themes=[{id:'default',name:'Default',desc:'Default synthetic theme',badge:'Balanced'},{id:'high-contrast',name:'High Contrast',desc:'High contrast synthetic theme',badge:'Contrast'},{id:'calm',name:'Calm',desc:'Calm synthetic theme'}];
window.fixture={calls:[],errors:[],locale:'en',settings:{...defaults},theme:'default',themes,cursorStyle:'system',cursorTint:false,scannerStatus:'idle',monitoring:{isMonitoring:false,result:'idle'},price:{loading:false,progress:null,updated:null},updateState:{status:'idle',manifest:null,error:null},blockLocale:false,t};
window.addEventListener('error',event=>window.fixture.errors.push(event.message));
window.fixture.render=({variant='preview',mode='default',locale='en'}={})=>{
  flushSync(()=>root.render(null));localStorage.clear();window.fixture.calls=[];window.fixture.errors=[];window.fixture.locale=locale;window.fixture.settings={...defaults};window.fixture.theme='default';window.fixture.cursorStyle='system';window.fixture.cursorTint=false;window.fixture.scannerStatus='idle';window.fixture.monitoring={isMonitoring:false,result:'idle'};window.fixture.price={loading:false,progress:null,updated:null};window.fixture.updateState={status:'idle',manifest:null,error:null};window.fixture.blockLocale=false;
  if(mode==='appearance'){window.fixture.theme='high-contrast';window.fixture.cursorStyle='retro';window.fixture.cursorTint=true;}
  if(mode==='monitoring-active')window.fixture.monitoring={isMonitoring:true,result:'success'};
  if(mode==='monitoring-cached')window.fixture.monitoring={isMonitoring:false,result:'cached'};
  if(mode==='monitoring-error')window.fixture.monitoring={isMonitoring:false,result:'error'};
  if(mode.startsWith('scanner-')){window.fixture.settings.fissure_overlay_enabled=true;window.fixture.scannerStatus=mode.slice(8);}
  if(mode==='paths'){window.fixture.settings.warframe_cache_path='/synthetic/a/very/long/path/to/Warframe/Cache.Windows';window.fixture.settings.ee_log_path='/synthetic/a/very/long/path/to/Warframe/EE.log';window.fixture.settings.use_ee_log=true;}
  if(mode==='manual-monitor')window.fixture.settings.fissure_target_monitor=1;
  if(mode==='wfm-token')window.fixture.settings.wfm_token='SYNTHETIC-DO-NOT-USE';
  if(mode==='price-loading')window.fixture.price={loading:true,progress:{current:42,total:100},updated:1700000000000};
  if(mode.startsWith('update-')){const status=mode.slice(7);window.fixture.updateState={status,manifest:status==='available'?{version:'9.9.9',body:'Synthetic notes',date:'2026-09-06',downloadUrl:'https://example.invalid'}:null,error:status==='error'?'Synthetic update error':null};}
  if(variant==='preview')window.fixture.updateState={status:'disabled',manifest:null,error:null};
  setPreview(variant==='preview');
  flushSync(()=>root.render(<div style={{width:'calc(100vw - 208px)',height:'100vh'}}>{variant==='before'?<Before/>:<Settings/>}</div>));
};
window.fixture.render();
""")
print('Stage 3J Settings fixture created')
