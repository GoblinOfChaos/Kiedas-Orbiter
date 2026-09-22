from pathlib import Path
ROOT=Path('/var/home/jedwards/kiedas-orbiter')
TARGET=ROOT/'.preview-work/stage3-relics/fixture/Relics.before.jsx'
for path in (ROOT/'AGENTS.md',TARGET):
    if not path.exists(): raise FileNotFoundError(path)
text=TARGET.read_text()
if "from '../" not in text: raise RuntimeError('relative imports not present')
TARGET.write_text(text.replace("from '../", "from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/"))
print('fixed frozen fixture import roots')
