import React from 'react';
import '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/index.css';
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import '@fontsource/jetbrains-mono/400.css';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import Rivens from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/screens/Rivens.jsx';
import Before from './Rivens.before.jsx';
import {setPreview,t} from './mock.js';

window.fixture={calls:[],errors:[],t,locale:'en',batchResults:{}};
window.addEventListener('error',event=>window.fixture.errors.push(event.message));

const stats=(positive=40)=>[
  {tag:'Critical Chance',statKey:'Critical Chance',value:String(positive),positive:true,isPercent:true},
  {tag:'Zoom',statKey:'Zoom',value:'20',positive:false,isPercent:true}
];
const rivens=[
  {item_id:'alpha-1',name:'Alpha Critatis',weapon_name:'Alpha',weapon_name_en:'Alpha',weapon_type:'Rifle',stats:stats(55),rank:8,mr:12,rerolls:3,polarity:'AP_ATTACK',_grade:'S'},
  {item_id:'alpha-2',name:'Alpha Critatis',weapon_name:'Alpha',weapon_name_en:'Alpha',weapon_type:'Rifle',stats:stats(35),rank:4,mr:10,rerolls:1,polarity:'AP_DEFENSE',_grade:'A'},
  {item_id:'beta-1',name:'Beta Visiata',weapon_name:'Beta Localized',weapon_name_en:'Beta',weapon_type:'Pistol',stats:stats(30),rank:5,mr:9,rerolls:0,_grade:'B'},
  {item_id:'gamma-1',name:'Gamma Acriata',weapon_name:'Gamma',weapon_type:'Melee',stats:stats(25),rank:2,mr:8,rerolls:2,_grade:'C'},
  {item_id:'delta-1',name:'Delta Hexa',weapon_name:'Delta',weapon_type:'Shotgun',stats:stats(20),rank:1,mr:7,rerolls:0,_grade:'D'},
  {item_id:'epsilon-1',name:'Epsilon Riven',weapon_name:'Epsilon',weapon_type:'Sniper',stats:stats(15),rank:0,mr:6,rerolls:0,_grade:'F'},
  {item_id:'kitgun-1',name:'Kitgun Riven',weapon_name:'Kitgun',weapon_type:'Kitgun',stats:stats(),rank:3,mr:11,rerolls:1,_grade:'A'},
  {item_id:'zaw-1',name:'Zaw Riven',weapon_name:'Zaw',weapon_type:'Zaw',stats:stats(),rank:3,mr:11,rerolls:1,_grade:'B'},
  {item_id:'archgun-1',name:'Archgun Riven',weapon_name:'Archgun',weapon_type:'Archgun',stats:stats(),rank:3,mr:11,rerolls:1,_grade:'C'},
  {item_id:'challenge-1',name:'Shotgun Riven Challenge',weapon_name:'Shotgun',weapon_type:'Shotgun',challenge:'Complete a synthetic challenge',rerolls:2,quantity:1,_grade:'B'},
  {name:'Melee Riven Mod',weapon_name:'Melee',weapon_type:'Melee',veiled:true,quantity:3,rerolls:0,_grade:'B'},
  {item_id:'no-profile-1',name:'Unprofiled Riven',weapon_name:'Unprofiled',weapon_type:'Rifle',stats:stats(),rank:1,mr:5,rerolls:0,_noProfile:true}
];
const defaultPrices={
  Alpha:{price:80,expected_value:60,weapon_rank:2,total_weapons:20,probability_stagnant:.2},
  Beta:{price:45,expected_value:40,weapon_rank:8,total_weapons:20,probability_stagnant:.6},
  Gamma:{price:25,expected_value:20,weapon_rank:12,total_weapons:20,probability_stagnant:.7},
  Delta:{price:10,expected_value:12,weapon_rank:18,total_weapons:20,probability_stagnant:.8},
  Epsilon:{price:5,expected_value:7,weapon_rank:19,total_weapons:20,probability_stagnant:.9},
  Kitgun:{price:30,expected_value:25,weapon_rank:10,total_weapons:20,probability_stagnant:.5},
  Zaw:{price:20,expected_value:18,weapon_rank:14,total_weapons:20,probability_stagnant:.7},
  Archgun:{price:15,expected_value:14,weapon_rank:16,total_weapons:20,probability_stagnant:.8},
  Unprofiled:{price:12,expected_value:11,weapon_rank:17,total_weapons:20,probability_stagnant:.8}
};
function monitor(mode){
  return {
    inventoryData:mode==='loading'?undefined:mode==='no-inventory'?null:{rivens,account:{riven_capacity:18}},
    isInventoryLoading:mode==='loading'
  };
}
const root=createRoot(document.getElementById('root'));
window.fixture.render=({variant='preview',mode='populated',locale='en',prices=defaultPrices}={})=>{
  flushSync(()=>root.render(null));
  window.fixture.calls=[];
  window.fixture.errors=[];
  window.fixture.locale=locale;
  window.fixture.mode=mode;
  window.fixture.batchResults=mode==='prices-missing'?{}:prices;
  setPreview(variant==='preview');
  window.fixture.monitor=monitor(mode);
  flushSync(()=>root.render(<div style={{width:'calc(100vw - 208px)',height:'100vh'}}>{variant==='before'?<Before/>:<Rivens/>}</div>));
};
window.fixture.render();
