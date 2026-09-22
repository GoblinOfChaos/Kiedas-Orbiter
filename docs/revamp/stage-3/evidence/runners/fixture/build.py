import pathlib,os,subprocess,re,shutil
r=pathlib.Path('/var/home/jedwards/kiedas-orbiter');f=r/'.preview-work/stage3-work/fixture';app=r/'.preview-work/stage2';e=r/'docs/revamp/stage-3/evidence'
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
if not (f/'node_modules').exists():(f/'node_modules').symlink_to(app/'node_modules')
s=(f.parent/'Dashboard.before.jsx').read_text();s=re.sub(r"(from\s+['\"])\.\./",lambda m:m[1]+str(app/'src')+'/',s);(f/'Dashboard.before.jsx').write_text(s)
css=sorted((app/'dist/assets').glob('*.css'));(f/'index.html').write_text('<html><head><meta charset="UTF-8">'+''.join('<link rel="stylesheet" href="/styles/'+p.name+'">' for p in css)+'<style>html,body,#root{height:100%;margin:0}#root{margin-left:220px}</style></head><body><div id="root"></div><script type="module" src="/entry.jsx"></script></body></html>')
config="import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';export default defineConfig({root:"+repr(str(f))+",plugins:[react()],publicDir:false,resolve:{alias:[{find:/.*\\/contexts\\/(MonitoringContext|UiContext)(\\.jsx)?$/,replacement:"+repr(str(f/'mock.js'))+"},{find:/.*\\/lib\\/(buildProfile|marketEngine)(\\.js)?$/,replacement:"+repr(str(f/'mock.js'))+"},{find:'@tauri-apps/api/core',replacement:"+repr(str(f/'mock.js'))+"}]},build:{outDir:'dist',emptyOutDir:true}});"
(f/'vite.config.mjs').write_text(config)
with (e/'fixture-build.log').open('w') as log:subprocess.run(['/opt/node/bin/node',str(app/'node_modules/vite/bin/vite.js'),'build','--config',str(f/'vite.config.mjs')],cwd=f,stdout=log,stderr=subprocess.STDOUT,check=True)
shutil.copytree(app/'dist/assets',f/'dist/styles',dirs_exist_ok=True)
for p in (app/'dist/assets').glob('*.woff*'):shutil.copy2(p,f/'dist/assets'/p.name)
