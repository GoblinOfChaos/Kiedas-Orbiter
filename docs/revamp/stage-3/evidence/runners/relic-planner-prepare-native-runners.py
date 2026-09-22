from pathlib import Path


ROOT = Path('/var/home/jedwards/kiedas-orbiter')
SOURCE = ROOT / '.preview-work/stage3-relics'
TARGET = ROOT / '.preview-work/stage3-relic-planner'
BLOCK = TARGET / 'relic-planner-native-block.txt'
for path in (ROOT / 'AGENTS.md', SOURCE / 'deb-smoke.py', SOURCE / 'appimage-smoke.py', BLOCK):
    if not path.exists():
        raise FileNotFoundError(f'precondition path missing: {path}')
block = BLOCK.read_text()
for kind in ('deb', 'appimage'):
    text = (SOURCE / (kind + '-smoke.py')).read_text()
    text = text.replace('relics-' + kind + '-', 'relic-planner-' + kind + '-')
    text = text.replace('relics-' + kind + '-packaged-smoke.json', 'relic-planner-' + kind + '-packaged-smoke.json')
    needle = " api('DELETE',prefix)"
    position = text.rfind(needle)
    if position < 0:
        raise RuntimeError('session close insertion point missing')
    output = TARGET / (kind + '-smoke.py')
    if output.exists():
        raise FileExistsError(output)
    output.write_text(text[:position] + block + text[position:])
print('Stage 3H cumulative packaged runners created')
