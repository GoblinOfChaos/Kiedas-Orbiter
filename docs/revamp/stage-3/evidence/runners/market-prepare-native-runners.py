from pathlib import Path

ROOT = Path('/var/home/jedwards/kiedas-orbiter')
SOURCE = ROOT / '.preview-work/stage3-relic-planner'
TARGET = ROOT / '.preview-work/stage3-market'
BLOCK = TARGET / 'market-native-block.txt'
for path in (ROOT / 'AGENTS.md', SOURCE / 'deb-smoke.py', SOURCE / 'appimage-smoke.py', BLOCK):
    if not path.is_file():
        raise FileNotFoundError(path)
block = BLOCK.read_text()
for kind in ('deb', 'appimage'):
    text = (SOURCE / (kind + '-smoke.py')).read_text()
    text = text.replace('relic-planner-' + kind + '-', 'market-' + kind + '-')
    text = text.replace('relic-planner-' + kind + '-packaged-smoke.json', 'market-' + kind + '-packaged-smoke.json')
    needle = " api('DELETE',prefix)"
    position = text.rfind(needle)
    if position < 0:
        raise RuntimeError('session close insertion point missing')
    output = TARGET / (kind + '-smoke.py')
    output.write_text(text[:position] + block + text[position:])
print('Stage 3I cumulative packaged runners created')
