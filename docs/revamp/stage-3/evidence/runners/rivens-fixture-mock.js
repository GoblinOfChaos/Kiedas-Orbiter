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
  if(command==='get_icons_path')return '/fixture/icons';
  if(command==='get_mod_frames_path')return window.fixture.mode==='frames-loading'?'':'/fixture/frames';
  if(command==='estimate_riven_full_batch'){
    const values=window.fixture.batchResults || {};
    return (args?.inputs || []).map(input=>values[input.weapon_name] ?? null);
  }
  return '';
}
export async function loadRivenGoodRolls(){return true;}
export function getRivenStatGrade(riven){
  if(riven._noProfile)return {grade:null,label:'Not graded',assessment:[],mandatory:[],optional:[],pickN:0,safeNegatives:[]};
  const grade=riven._grade || 'B';
  return {
    grade,label:grade+' grade',
    assessment:[
      {text:'+Critical Chance',status:'good'},
      {text:'-Zoom',status:'safe-negative'}
    ],
    mandatory:['Critical Chance'],
    optional:['Critical Damage','Multishot'],
    pickN:1,
    safeNegatives:['Zoom']
  };
}
