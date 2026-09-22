import React from 'react';
import './app.css';
import '@fontsource/outfit/400.css';import '@fontsource/outfit/600.css';import '@fontsource/outfit/700.css';import '@fontsource/jetbrains-mono/400.css';
import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import Market from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/screens/Market.jsx';
import Before from './Market.before.jsx';import {setPreview,t} from './mock.js';

const orders=[
 {id:'order-sell-visible',itemId:'item-alpha',type:'sell',platinum:12,quantity:2,visible:true,rank:null},
 {id:'order-buy',itemId:'item-beta',type:'buy',platinum:7,quantity:1,visible:true,rank:3,subtype:'radiant'},
 {id:'order-sell-hidden',itemId:'item-gamma',type:'sell',platinum:4,quantity:1,visible:false,rank:null},
];
const catalog=[
 {id:'item-alpha',slug:'alpha-prime-blueprint',gameRef:'/Synthetic/Alpha',tradable:true,i18n:{en:{name:'Alpha Prime Blueprint'}}},
 {id:'item-beta',slug:'beta-prime-chassis',gameRef:'/Synthetic/Beta',tradable:true,i18n:{en:{name:'Beta Prime Chassis'}}},
 {id:'item-gamma',slug:'gamma-prime-systems',gameRef:'/Synthetic/Gamma',tradable:true,i18n:{en:{name:'Gamma Prime Systems'}}},
 {id:'item-delta',slug:'delta-prime-barrel',gameRef:'/Synthetic/Delta',tradable:true,i18n:{en:{name:'Delta Prime Barrel'}}},
 {id:'item-epsilon',slug:'epsilon-prime-receiver',gameRef:'/Synthetic/Epsilon',tradable:true,i18n:{en:{name:'Epsilon Prime Receiver'}}},
 {id:'item-zeta',slug:'zeta-prime-stock',gameRef:'/Synthetic/Zeta',tradable:true,i18n:{en:{name:'Zeta Prime Stock'}}},
 {id:'item-blocked',slug:'blocked-prime-part',gameRef:'/Synthetic/Blocked',tradable:false,i18n:{en:{name:'Blocked Prime Part'}}},
 {id:'item-zero',slug:'zero-prime-part',gameRef:'/Synthetic/Zero',tradable:true,i18n:{en:{name:'Zero Prime Part'}}},
];
const inventory={prime_parts:[
 {unique_name:'/Synthetic/Alpha',name:'Alpha Prime Blueprint',quantity:2,ducats:45,mastered:true},
 {unique_name:'/Synthetic/Beta',name:'Beta Prime Chassis',quantity:1,ducats:50,mastered:false},
 {unique_name:'/Synthetic/Gamma',name:'Gamma Prime Systems',quantity:1,ducats:20,mastered:false},
 {unique_name:'/Synthetic/Delta',name:'Delta Prime Barrel',quantity:1,ducats:25,mastered:false},
 {unique_name:'/Synthetic/Epsilon',name:'Epsilon Prime Receiver',quantity:1,ducats:25,mastered:false},
 {unique_name:'/Synthetic/Zeta',name:'Zeta Prime Stock',quantity:1,ducats:25,mastered:false},
 {unique_name:'/Synthetic/Blocked',name:'Blocked Prime Part',quantity:3,ducats:100,mastered:true},
 {unique_name:'/Synthetic/Zero',name:'Zero Prime Part',quantity:0,ducats:100,mastered:true},
]};
const wfmEntries=catalog.map(item=>[item.gameRef,{id:item.id,slug:item.slug,tradable:item.tradable}]);
const priceStates={
 'item-alpha':{status:'ready',price:3,timestamp:1700000000000},
 'item-beta':{status:'ready',price:20,timestamp:1700000000000},
 'item-gamma':{status:'ready',price:5,timestamp:1700000000000},
 'item-delta':{status:'no_orders',timestamp:1700000000000},
 'item-epsilon':{status:'error',timestamp:1700000000000},
 'item-zeta':{status:'loading',timestamp:1700000000000},
};
const root=createRoot(document.getElementById('root'));
window.fixture={calls:[],errors:[],locale:'en',config:{},orders,catalog,inventory,wfmEntries,priceStates,t};
window.addEventListener('error',event=>window.fixture.errors.push(event.message));
window.fixture.render=({variant='preview',mode='populated',locale='en'}={})=>{
  flushSync(()=>root.render(null));
  localStorage.clear();
  window.fixture.calls=[];window.fixture.errors=[];window.fixture.locale=locale;
  window.fixture.config={token:mode==='no-token'?'':'SYNTHETIC-TOKEN',orderError:mode==='order-error',orderPending:mode==='order-loading',catalogError:mode==='catalog-error',priceDelay:mode==='progressive'?1200:0};
  window.fixture.orders=mode==='empty'?[]:orders;
  window.fixture.inventory=mode==='empty'?{prime_parts:[]}:inventory;
  localStorage.setItem('wfm_id_catalog_v2',JSON.stringify(Object.fromEntries(catalog.map(item=>[item.id,{id:item.id,slug:item.slug,name:item.i18n.en.name,icon:null}]))));
  setPreview(variant==='preview');
  flushSync(()=>root.render(<div style={{width:'calc(100vw - 208px)',height:'100vh'}}>{variant==='before'?<Before onNavigate={value=>window.fixture.navigated=value}/>:<Market onNavigate={value=>window.fixture.navigated=value}/>}</div>));
};
window.fixture.render();
