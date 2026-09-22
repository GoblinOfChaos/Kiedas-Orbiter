from pathlib import Path
import shutil


ROOT = Path('/var/home/jedwards/kiedas-orbiter')
WORK = ROOT / '.preview-work/stage3-maps'
FIXTURE = WORK / 'fixture'
CHECKOUT = ROOT / '.preview-work/stage2'
SOURCE = CHECKOUT / 'src/screens/Maps.jsx'
BEFORE = WORK / 'before/Maps.jsx'
CSS = sorted((CHECKOUT / 'dist/assets').glob('index-*.css'))
for path in (ROOT / 'AGENTS.md', SOURCE, BEFORE, CHECKOUT / 'src/lib/i18n/en.json'):
    if not path.exists():
        raise FileNotFoundError(f'precondition path missing: {path}')
if len(CSS) != 1:
    raise RuntimeError(f'expected one built stylesheet, found {CSS}')
FIXTURE.mkdir(parents=True, exist_ok=True)
shutil.copy2(BEFORE, FIXTURE / 'Maps.before.jsx')
shutil.copy2(CSS[0], FIXTURE / 'app.css')
text = (FIXTURE / 'Maps.before.jsx').read_text().replace(
    "from '../", "from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/"
)
(FIXTURE / 'Maps.before.jsx').write_text(text)
(FIXTURE / 'index.html').write_text('<!doctype html><html><body><div id="root"></div><script type="module" src="/entry.jsx"></script></body></html>\n')
(FIXTURE / 'vite.config.mjs').write_text("""import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
const root='/var/home/jedwards/kiedas-orbiter/.preview-work/stage3-maps/fixture';
const mock=root+'/mock.js';
export default defineConfig({root,plugins:[react()],publicDir:false,resolve:{alias:[
 {find:/.*\\/contexts\\/(MonitoringContext|UiContext)(\\.jsx)?$/,replacement:mock},
 {find:/.*\\/lib\\/(buildProfile|customMarkers)(\\.js)?$/,replacement:mock},
 {find:'@tauri-apps/api/core',replacement:mock}
]},build:{outDir:'dist',emptyOutDir:true}});
""")
(FIXTURE / 'mock.js').write_text("""import en from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/lib/i18n/en.json';
export let IS_PREVIEW=true;
export function setPreview(value){IS_PREVIEW=value;}
export function t(key,args){let value=en.ui[key]??key;for(const [name,replacement] of Object.entries(args||{}))value=String(value).replaceAll('{{'+name+'}}',String(replacement)).replaceAll('{'+name+'}',String(replacement));return value;}
export function useUi(){return {t};}
export function useMonitoring(){return {worldState:{},inventoryData:{customMarkers:[]}};}
export function parseCustomMarkers(){return [];}
export function convertFileSrc(path){return path;}
export async function invoke(command,args){window.fixture.calls.push({command,args});if(command==='get_maps_path')return '';if(command==='list_map_configs')return window.fixture.configured?['plains-of-eidolon.json']:[];if(command==='read_map_config')return JSON.stringify({tabId:'0',configs:[{id:'config-1',name:'Synthetic route',description:'Local fixture',enabled:true,markers:[{id:'marker-1',x:.4,y:.4,label:'Marker 1',color:'#f97316',icon:'MapPin',notes:'Fixture note'},{id:'marker-2',x:.6,y:.6,label:'Marker 2',color:'#22c55e',icon:'Star',notes:''}],paths:[{id:'path-1',fromMarkerId:'marker-1',toMarkerId:'marker-2',color:'#f97316'}]}]});return null;}
""")
(FIXTURE / 'entry.jsx').write_text("""import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import './app.css';
import Maps from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/screens/Maps.jsx';import Before from './Maps.before.jsx';import {setPreview,t} from './mock.js';
const root=createRoot(document.getElementById('root'));window.fixture={calls:[],errors:[],configured:true,t};window.addEventListener('error',e=>window.fixture.errors.push(e.message));
window.fixture.render=({variant='preview',configured=true}={})=>{flushSync(()=>root.render(null));window.fixture.calls=[];window.fixture.errors=[];window.fixture.configured=configured;setPreview(variant==='preview');flushSync(()=>root.render(<div style={{width:'calc(100vw - 208px)',height:'100vh',position:'relative'}}>{variant==='before'?<Before/>:<Maps/>}</div>));};window.fixture.render();
""")
print('Stage 3K Maps fixture created')
