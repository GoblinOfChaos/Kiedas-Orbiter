import en from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/lib/i18n/en.json';
import de from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/lib/i18n/de.json';
const locales={en,de};
export let IS_PREVIEW=true;
export function setPreview(value){IS_PREVIEW=value;}
export function t(key,args){const selected=locales[window.fixture?.locale||'en']||en;let value=selected.ui[key]??en.ui[key]??key;for(const [name,replacement] of Object.entries(args||{}))value=String(value).replaceAll('{{'+name+'}}',String(replacement)).replaceAll('{'+name+'}',String(replacement));return value;}
export function useUi(){return {t};}
export function useMonitoring(){return {inventoryData:window.fixture.inventory};}
export async function loadSettings(){return {wfm_token:window.fixture.config.token};}
export function getSetting(){return window.fixture.config.token;}
export async function invoke(command,args){
  window.fixture.calls.push({command,args});
  if(command==='log_terminal')return null;
  if(command==='get_my_market_orders'){
    if(window.fixture.config.orderError)throw new Error('Synthetic order failure');
    if(window.fixture.config.orderPending)return new Promise(()=>{});
    return JSON.stringify({data:window.fixture.orders});
  }
  return null;
}
export async function fetch(){return {ok:true,json:async()=>({data:window.fixture.catalog})};}
export async function ensureWfmItems(){
  if(window.fixture.config.catalogError)return null;
  return new Map(window.fixture.wfmEntries);
}
export function lookupWfmItem(map,path){return map?.get(path)||null;}
export async function getPriceState(id){if(window.fixture.config.priceDelay)await new Promise(resolve=>setTimeout(resolve,window.fixture.config.priceDelay));return window.fixture.priceStates[id]||{status:'error',timestamp:1700000000000};}
