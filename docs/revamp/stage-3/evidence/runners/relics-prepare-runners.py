from pathlib import Path
import shutil
ROOT=Path('/var/home/jedwards/kiedas-orbiter'); SOURCE=ROOT/'.preview-work/stage3-rivens'; TARGET=ROOT/'.preview-work/stage3-relics'
for path in (ROOT/'AGENTS.md',SOURCE/'frontend.py',SOURCE/'native-build.py',SOURCE/'bundle.py'):
    if not path.exists(): raise FileNotFoundError(path)
for name in ('frontend.py','native-build.py','bundle.py'):
    text=(SOURCE/name).read_text().replace('stage3-rivens','stage3-relics').replace('rivens-','relics-')
    (TARGET/name).write_text(text)
print('prepared absolute-path Stage 3G runners')
