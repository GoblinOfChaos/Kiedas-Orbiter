from pathlib import Path
ROOT=Path('/var/home/jedwards/kiedas-orbiter'); BASE=ROOT/'.preview-work/stage3-relics'; SOURCE=ROOT/'.preview-work/stage3-rivens'; block=(BASE/'relics-native-block.txt').read_text()
for path in (ROOT/'AGENTS.md',block and BASE/'relics-native-block.txt',SOURCE/'deb-smoke.py',SOURCE/'appimage-smoke.py'):
    if not path.exists(): raise FileNotFoundError(path)
for kind in ('deb','appimage'):
    text=(SOURCE/(kind+'-smoke.py')).read_text().replace('rivens-'+kind+'-','relics-'+kind+'-').replace('rivens-'+kind+'-packaged-smoke.json','relics-'+kind+'-packaged-smoke.json')
    needle=" api('DELETE',prefix)";position=text.rfind(needle)
    if position<0:raise RuntimeError('session close insertion point missing')
    (BASE/(kind+'-smoke.py')).write_text(text[:position]+block+text[position:])
print('created cumulative Stage 3G packaged runners')
