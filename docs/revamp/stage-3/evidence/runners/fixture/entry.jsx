import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import Dashboard from '../../stage2/src/screens/Dashboard.jsx';
import Before from './Dashboard.before.jsx';import {setPreview,t} from './mock';
const NativeDate=Date;const fixed=NativeDate.parse('2026-09-05T12:00:00Z');window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}};
window.fixture={calls:[],errors:[],t};window.addEventListener('error',e=>window.fixture.errors.push(e.message));
const expires='2026-09-06T12:00:00Z';
const populated={events:[],voidTrader:{active:true,node:'Synthetic relay',expiry:expires,inventory:[{item:'Synthetic stock',uniqueName:'/synthetic/stock',ducats:10,credits:20}]},dailyDeals:[{item:'Synthetic deal',salePrice:1,originalPrice:2,total:10,sold:1,expiry:expires}],flashSales:[{item:'Synthetic offer',discount:10,expiry:expires}],globalBoosters:[{name:'Synthetic event',expiry:expires}],sortie:{boss:'Synthetic sortie',variants:[],expiry:expires},archonHunt:{boss:'Synthetic hunt',missions:[],expiry:expires},invasions:[{completed:true}],news:[{message:'Synthetic linked news',link:'https://example.invalid/news',date:expires},{message:'Synthetic plain news',date:expires}],descendia:[0,1,2].map(i=>({expiry:expires,stages:[{index:i+1,missionType:'Synthetic stage '+i,penance:'Synthetic modifier '+i}]})),calendar1999:[{season:'CST_WINTER',activation:'2026-01-01',expiry:expires,days:[{day:1,events:[{type:'SYNTHETIC',name:'January fixture event'}]},{day:32,events:[{type:'SYNTHETIC',name:'February first event'}]},{day:33,events:[{type:'SYNTHETIC',name:'February second event'}]}]}]};
let root=createRoot(document.getElementById('root'));
window.fixture.render=({variant='preview',mode='populated',hidden=[]}={})=>{
 flushSync(()=>root.render(null));setPreview(variant==='preview');localStorage.setItem('dashboard_hidden_cards',JSON.stringify(hidden));window.fixture.calls=[];
 window.fixture.monitor={exportData:{},worldState:mode==='loading'?null:mode==='empty'?{}:populated,spIncursions:'',arbys:'',dict:{},suppDict:{},EC:{},ERg:{},EI:{},nameToImage:{},uniqueNameToName:{},arbyTiers:{},rawInventory:{},inventoryData:{wishlist:[]},ES:{},ENWRawRewards:[],ExportImages:{},ExportTextIcons:{},cardImagesPath:'',allPrices:{},manualRefresh:()=>window.fixture.calls.push({command:'manualRefresh'}),lastUpdate:fixed};
 flushSync(()=>root.render(variant==='before'?<Before/>:<Dashboard/>));
};
window.fixture.render({hidden:JSON.parse(localStorage.getItem('dashboard_hidden_cards')||'[]')});
