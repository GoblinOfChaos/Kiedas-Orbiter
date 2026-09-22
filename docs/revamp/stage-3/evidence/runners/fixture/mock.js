import strings from '../../stage2/src/lib/i18n/en.json';
export function t(key,args){let value=strings.ui[key]??key;for(const [k,v]of Object.entries(args||{})){value=value.replaceAll('{{'+k+'}}',String(v)).replaceAll('{'+k+'}',String(v));}return value;}
export let IS_PREVIEW = true;
export function setPreview(value) { IS_PREVIEW = value; }
export function useUi(){return {t};}
export function useMonitoring(){return window.fixture.monitor;}
export async function invoke(command,args){window.fixture.calls.push({command,args});if(command==='fetch_url')return null;return '';}
export function convertFileSrc(){return '';}
export async function getPrice(){return null;}
