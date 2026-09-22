import React from 'react';
import en from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/lib/i18n/en.json';
import de from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/lib/i18n/de.json';
const locales={en,de};
export function t(key,args){
  const selected=locales[window.fixture?.locale || 'en'] || en;
  let value=selected.ui[key] ?? en.ui[key] ?? key;
  for(const [name,replacement] of Object.entries(args||{})){
    value=String(value).replaceAll('{{'+name+'}}',String(replacement)).replaceAll('{'+name+'}',String(replacement));
  }
  return value;
}
export let IS_PREVIEW=true;
export function setPreview(value){IS_PREVIEW=value;}
export function useUi(){return {t};}
export function useMonitoring(){return window.fixture.monitor;}
export function convertFileSrc(path){return 'fixture://'+path;}
export async function invoke(command,args){
  window.fixture.calls.push({command,args});
  if(command==='read_file_bytes')return [...new TextEncoder().encode('{"components":{},"mods":{}}')];
  return '';
}

export default function MockItemImage({src,alt='',className=''}){return React.createElement('img',{src,alt,className});}
