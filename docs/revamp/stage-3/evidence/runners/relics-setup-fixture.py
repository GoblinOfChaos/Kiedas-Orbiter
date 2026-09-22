from pathlib import Path
import shutil

ROOT = Path('/var/home/jedwards/kiedas-orbiter')
WORK = ROOT / '.preview-work/stage3-relics'
FIXTURE = WORK / 'fixture'
SOURCE = ROOT / '.preview-work/stage2/src/screens/Relics.jsx'
BEFORE = WORK / 'before/Relics.jsx'
for path in (ROOT / 'AGENTS.md', SOURCE, BEFORE):
    if not path.exists():
        raise FileNotFoundError(path)
FIXTURE.mkdir(parents=True, exist_ok=True)
shutil.copy2(BEFORE, FIXTURE / 'Relics.before.jsx')
before_text=(FIXTURE / 'Relics.before.jsx').read_text()
before_text=before_text.replace("from '../", "from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/")
(FIXTURE / 'Relics.before.jsx').write_text(before_text)
(FIXTURE / 'index.html').write_text('<!doctype html><html><body><div id="root"></div><script type="module" src="/entry.jsx"></script></body></html>\n')
(FIXTURE / 'vite.config.mjs').write_text("""import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
const mock='/var/home/jedwards/kiedas-orbiter/.preview-work/stage3-relics/fixture/mock.js';
export default defineConfig({
  root:'/var/home/jedwards/kiedas-orbiter/.preview-work/stage3-relics/fixture',
  plugins:[react()], publicDir:false,
  resolve:{alias:[
    {find:/.*\\/contexts\\/(MonitoringContext|UiContext)(\\.jsx)?$/,replacement:mock},
    {find:/.*\\/lib\\/buildProfile(\\.js)?$/,replacement:mock},
    {find:'@tauri-apps/api/core',replacement:mock}
  ]},
  build:{outDir:'dist',emptyOutDir:true}
});
""")
(FIXTURE / 'mock.js').write_text("""import en from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/lib/i18n/en.json';
import de from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/lib/i18n/de.json';
const locales={en,de};
export function t(key,args){const selected=locales[window.fixture?.locale||'en']||en;let value=selected.ui[key]??en.ui[key]??key;for(const [name,replacement] of Object.entries(args||{}))value=String(value).replaceAll('{{'+name+'}}',String(replacement)).replaceAll('{'+name+'}',String(replacement));return value;}
export let IS_PREVIEW=true;
export function setPreview(value){IS_PREVIEW=value;}
export function useUi(){return {t};}
export function useMonitoring(){return window.fixture.monitor;}
export function convertFileSrc(path){return 'fixture://'+path;}
export async function invoke(command,args){window.fixture.calls.push({command,args});if(command==='get_ui_path')return '/fixture/ui';if(command==='get_icons_path')return '/fixture/icons';return '';}
""")
(FIXTURE / 'entry.jsx').write_text("""import React from 'react';
import '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/index.css';
import '@fontsource/outfit/400.css';import '@fontsource/outfit/600.css';import '@fontsource/outfit/700.css';import '@fontsource/jetbrains-mono/400.css';
import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import Relics from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/screens/Relics.jsx';
import Before from './Relics.before.jsx';import {setPreview,t} from './mock.js';
import {getRelicEV} from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/lib/relicParser.js';
window.fixture={calls:[],errors:[],t,locale:'en'};window.addEventListener('error',e=>window.fixture.errors.push(e.message));
const rewards=(prefix='Alpha')=>[
 {name:prefix+' Prime Blueprint',uniqueName:'/Rewards/'+prefix+'Blueprint',rarity:'COMMON',tier:0,ducats:15},
 {name:prefix+' Prime Chassis',uniqueName:'/Rewards/'+prefix+'Chassis',rarity:'COMMON',tier:0,ducats:15},
 {name:prefix+' Prime Systems',uniqueName:'/Rewards/'+prefix+'Systems',rarity:'COMMON',tier:0,ducats:25},
 {name:'Forma Blueprint',uniqueName:'/Rewards/FormaBlueprint',rarity:'UNCOMMON',tier:1,ducats:0},
 {name:'Synthetic & Link',uniqueName:'/Rewards/SyntheticLink',rarity:'UNCOMMON',tier:1,ducats:45},
 {name:prefix+' Prime Rare',uniqueName:'/Rewards/'+prefix+'Rare',rarity:'RARE',tier:2,ducats:100}
];
const owned=[
 {unique_name:'Lith A1',real_unique_name:'/Lotus/Types/Game/Projections/T1VoidProjectionA1Bronze',name:'Lith A1 Relic',era:'Lith',owned:true,vaulted:false,image:'fixture://lith.png',refinements:{Intact:2,Exceptional:1,Flawless:0,Radiant:1},rewards:rewards('Alpha')},
 {unique_name:'Meso B2',real_unique_name:'/Lotus/Types/Game/Projections/T2VoidProjectionB2Bronze',name:'Meso B2 Relic',era:'Meso',owned:true,vaulted:true,image:'fixture://meso.png',refinements:{Intact:1,Exceptional:0,Flawless:2,Radiant:0},rewards:rewards('Beta')},
 {unique_name:'Requiem I',real_unique_name:'/Lotus/Types/Game/Projections/T5VoidProjectionA1Bronze',name:'Requiem I Relic',era:'Requiem',owned:true,vaulted:false,image:'fixture://requiem.png',refinements:{Intact:3,Exceptional:0,Flawless:0,Radiant:0},rewards:Array.from({length:8},(_,i)=>({name:'Requiem '+(i+1),uniqueName:'/Rewards/Requiem'+i,rarity:'COMMON',tier:0,ducats:10+i}))}
];
const exportData={ExportRelics:[{uniqueName:'/Lotus/Types/Game/Projections/T1VoidProjectionA1Bronze',era:'Lith',category:'A1',icon:'/Export/Lith.png',vaulted:false},{uniqueName:'/Lotus/Types/Game/Projections/T3VoidProjectionC3Bronze',era:'Neo',category:'C3',icon:'/Export/Neo.png',vaulted:false},{uniqueName:'/Lotus/Types/Game/Projections/T4VoidProjectionD4Bronze',era:'Axi',category:'D4',icon:'/Export/Axi.png',vaulted:true}],ExportRewards:{},ExportItems:{},ExportRecipes:{},dict:{},uniqueNameToName:{},EI:{}};
for(const [idx,relic] of exportData.ExportRelics.entries()){const rs=rewards(['Alpha','Gamma','Delta'][idx]);exportData.ExportRewards[relic.uniqueName]={rewards:rs.map(r=>({rewardName:r.uniqueName,rarity:r.rarity}))};for(const r of rs){exportData.ExportItems[r.uniqueName]={name:r.name,primeSellingPrice:r.ducats};exportData.dict[r.uniqueName]=r.name;}}
const prices={'Lith A1':25,'/Rewards/AlphaBlueprint':5,'/Rewards/AlphaChassis':12,'/Rewards/AlphaSystems':20,'/Rewards/FormaBlueprint':0,'/Rewards/SyntheticLink':30,'/Rewards/AlphaRare':100};
function monitor(mode,priceValues=prices){return {inventoryData:mode==='loading'?undefined:mode==='no-inventory'?null:{relics:owned,account:{void_traces:275,void_traces_max:1500}},exportData:mode==='no-export'?null:exportData,isInventoryLoading:mode==='loading',allPrices:priceValues,isPriceLoading:mode==='price-progress'||mode==='price-indeterminate',priceFetchProgress:mode==='price-progress'?{current:2,total:6}:null,dropIndex:new Map(),recipeResultIndex:new Map(),exaltedWeaponIndex:new Map(),marketIndex:new Map(),alwaysAvailableIndex:new Map(),bundleIndex:new Map(),syndicateIndex:new Map(),wikiSigilIndex:new Map(),wikiVendorIndex:new Map(),wikiTennoGenIndex:new Map(),wikiBaroIndex:new Map(),glyphSupplementIndex:new Map(),wikiBlueprintIndex:new Map(),wikiResearchIndex:new Map(),wikiResourceIndex:new Map(),wikiPageAcquisitionIndex:new Map(),wikiAcquisitionStatusIndex:new Map(),relicStateIndex:new Map(),exportVendorIndex:new Map(),exportComponentIndex:new Map(),ExportImages:{}};}
const root=createRoot(document.getElementById('root'));
window.fixture.render=({variant='preview',mode='populated',locale='en',priceValues=prices}={})=>{flushSync(()=>root.render(null));window.fixture.calls=[];window.fixture.errors=[];window.fixture.locale=locale;setPreview(variant==='preview');window.fixture.monitor=monitor(mode,priceValues);flushSync(()=>root.render(<div style={{width:'calc(100vw - 208px)',height:'100vh'}}>{variant==='before'?<Before/>:<Relics/>}</div>));};
window.fixture.formula=(rewards,refinement,squad,key)=>getRelicEV(rewards,refinement,squad,key);
window.fixture.datasets={owned,exportData,prices};window.fixture.render();
""")
print('Stage 3G fixture created')
