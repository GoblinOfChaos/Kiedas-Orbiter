import os, pathlib, subprocess, shutil, hashlib, json
f=pathlib.Path(__file__).resolve().parent
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4]);os.nice(19)
env=os.environ.copy();env['UV_THREADPOOL_SIZE']='2'
css=sorted((f.parent/'stage2/dist/assets').glob('*.css'))
(f/'index.html').write_text('<html><head><meta charset="UTF-8"><title>Import component test</title>'+''.join('<link rel="stylesheet" href="/styles/'+p.name+'">' for p in css)+'</head><body><div id="root"></div><script type="module" src="/entry.jsx"></script></body></html>')
subprocess.run(['/home/jedwards/.nvm/versions/node/v24.19.0/bin/node',str(f/'node_modules/vite/bin/vite.js'),'build','--config',str(f/'vite.config.mjs')],env=env,check=True)
# Retain CSS copies, and serve font files at the absolute /assets URLs in that CSS.
shutil.copytree(f.parent/'stage2/dist/assets',f/'dist/styles',dirs_exist_ok=True)
for asset in (f.parent/'stage2/dist/assets').glob('*.woff*'):shutil.copy2(asset,f/'dist/assets'/asset.name)
paths=[f.parent/'stage2/src/components/PreviewImport.jsx',*sorted((f/'dist/styles').glob('*.css'))]
(f/'source-hashes.json').write_text(json.dumps({str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},indent=2)+'\n')
