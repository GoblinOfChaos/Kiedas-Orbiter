import React from 'react';
import '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/index.css';
import '@fontsource/outfit/400.css';import '@fontsource/outfit/600.css';import '@fontsource/outfit/700.css';import '@fontsource/jetbrains-mono/400.css';
import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import RelicPlanner from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/screens/RelicPlanner.jsx';
import Before from './RelicPlanner.before.jsx';import {setPreview,t} from './mock.js';
import {getAllRelicRewards,getRelicCatalog,getPartObtainedStatus} from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/lib/relicParser.js';

function makeData(){
  const ExportRelics=[];const ExportRewards={};const ExportItems={};const ExportRecipes={};const dict={};
  const eras=['Lith','Meso','Neo','Axi'];const rewardIds=[];
  for(let i=0;i<132;i++){
    const id='/Lotus/Types/Recipes/Weapons/TestPrimePart'+String(i+1).padStart(3,'0');
    rewardIds.push(id);ExportItems[id]={name:'Test Prime Part '+String(i+1).padStart(3,'0')};
  }
  for(let i=0;i<22;i++){
    const era=eras[i%4];const category='T'+String(i+1).padStart(2,'0');
    const uniqueName='/Lotus/Types/Game/Projections/T'+(i%4+1)+'VoidProjection'+category+'Bronze';
    const rewardManifest='/Lotus/Types/Game/MissionDecks/TestRelicRewards'+String(i+1).padStart(2,'0');
    ExportRelics.push({uniqueName,era,category,rewardManifest,icon:'/Export/'+era+'.png',vaulted:i%3===0});
    ExportRewards[rewardManifest]=rewardIds.slice(i*6,i*6+6).map((type,index)=>({type,rarity:index<3?'COMMON':index<5?'UNCOMMON':'RARE'}));
  }
  const nonPrime='/Lotus/Types/Items/MiscItems/SyntheticAdapter';
  ExportItems[nonPrime]={name:'Synthetic Adapter'};
  ExportRewards[ExportRelics[0].rewardManifest].push({type:nonPrime,rarity:'COMMON'});
  const partialParentBlueprint='/Lotus/Types/Recipes/Weapons/TestPrimePartialParentBlueprint';
  const partialParentResult='/Lotus/Weapons/TestPrimePartialParent';
  const builtParentBlueprint='/Lotus/Types/Recipes/Weapons/TestPrimeBuiltParentBlueprint';
  const builtParentResult='/Lotus/Weapons/TestPrimeBuiltParent';
  ExportItems[partialParentResult]={name:'Test Prime Partial Parent'};
  ExportItems[builtParentResult]={name:'Test Prime Built Parent'};
  ExportRecipes[partialParentBlueprint]={name:'Test Prime Partial Parent Blueprint',resultType:partialParentResult,ingredients:[{ItemType:rewardIds[1],ItemCount:2}]};
  ExportRecipes[builtParentBlueprint]={name:'Test Prime Built Parent Blueprint',resultType:builtParentResult,ingredients:[{ItemType:rewardIds[3],ItemCount:1}]};
  const exportData={ExportRelics,ExportRewards,ExportItems,ExportRecipes,ExportWeapons:{},ExportWarframes:{},ExportResources:{},dict,uniqueNameToName:{},EI:{}};
  const inventoryData={
    relics:[
      {name:'Lith T01 Relic',era:'Lith',refinements:{Intact:1,Exceptional:1,Flawless:0,Radiant:1}},
      {name:'Meso T02 Relic',era:'Meso',refinements:{Intact:1,Exceptional:0,Flawless:0,Radiant:0}},
    ],
    prime_parts:[
      {unique_name:rewardIds[0],name:'Test Prime Part 001',quantity:1,owned:true},
      {unique_name:rewardIds[1],name:'Test Prime Part 002',quantity:1},
    ],
    all:[{unique_name:builtParentResult,name:'Test Prime Built Parent',quantity:1,owned:true,mastered:true}],
    foundry:[{unique_name:rewardIds[2],name:'Test Prime Part 003'}],
    primeSets:{},resources:[],consumables_catalog:[],consumables:[],mods:[],warframes:[],primary:[],secondary:[],melee:[],sentinels:[],archwing:[],craftable:[],account:{forma:0},
  };
  return {exportData,inventoryData,rewardIds,nonPrime};
}

const datasets=makeData();
function monitor(mode){return {inventoryData:mode==='loading'?undefined:mode==='no-inventory'?null:datasets.inventoryData,exportData:mode==='no-export'?null:datasets.exportData,isInventoryLoading:mode==='loading'};}
window.fixture={calls:[],errors:[],t,locale:'en',datasets};window.addEventListener('error',event=>window.fixture.errors.push(event.message));
const root=createRoot(document.getElementById('root'));
window.fixture.render=({variant='preview',mode='populated',locale='en'}={})=>{flushSync(()=>root.render(null));window.fixture.calls=[];window.fixture.errors=[];window.fixture.locale=locale;setPreview(variant==='preview');window.fixture.monitor=monitor(mode);flushSync(()=>root.render(<div style={{width:'calc(100vw - 208px)',height:'100vh'}}>{variant==='before'?<Before/>:<RelicPlanner/>}</div>));};
window.fixture.helperSnapshot=()=>{
  const parts=getAllRelicRewards(datasets.exportData,'en').filter(part=>part.isPrimePart||/Forma(?:Blueprint)?$/i.test(part.uniqueName||'')).sort((a,b)=>a.name.localeCompare(b.name));
  const catalog=getRelicCatalog(datasets.exportData,'en');
  const status=Object.fromEntries(datasets.rewardIds.slice(0,5).map(id=>[id,getPartObtainedStatus(id,ExportName(id),datasets.inventoryData,datasets.exportData,'en')]));
  return {partCount:parts.length,first:parts[0]?.name,last:parts.at(-1)?.name,containsNonPrime:parts.some(p=>p.uniqueName===datasets.nonPrime),formaCount:parts.filter(p=>/Forma(?:Blueprint)?$/i.test(p.uniqueName||'')).length,catalogCount:catalog.length,catalogKeys:catalog.slice(0,3).map(r=>r.key),status};
};
function ExportName(id){return datasets.exportData.ExportItems[id]?.name||id;}
window.fixture.render();
