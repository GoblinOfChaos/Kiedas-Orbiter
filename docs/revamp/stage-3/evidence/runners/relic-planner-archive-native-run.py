from pathlib import Path
import re
import sys


ROOT = Path('/var/home/jedwards/kiedas-orbiter')
WORK = ROOT / '.preview-work/stage3-relic-planner'
EVIDENCE = ROOT / 'docs/revamp/stage-3/evidence'
if len(sys.argv) != 2 or not re.fullmatch(r'[a-z0-9-]+', sys.argv[1]):
    raise SystemExit('usage: archive-native-run.py lowercase-hyphen-tag')
tag = sys.argv[1]
for path in (ROOT / 'AGENTS.md', WORK, EVIDENCE):
    if not path.exists():
        raise FileNotFoundError(f'precondition path missing: {path}')

names = [
    'relic-planner-deb-harness-source-fact.json',
    'relic-planner-appimage-harness-source-fact.json',
    'relic-planner-deb-equipped-install.log',
    'relic-planner-deb-equipped-remove.log',
    'relic-planner-deb-packaged-smoke.json',
    'relic-planner-deb-packaged-xvfb.log',
    'relic-planner-deb-packaged-dbus.log',
    'relic-planner-deb-packaged-webdriver.log',
    'relic-planner-deb-smoke-container.json',
    'relic-planner-deb-smoke-container.log',
    'relic-planner-appimage-packaged-smoke.json',
    'relic-planner-appimage-packaged-xvfb.log',
    'relic-planner-appimage-packaged-dbus.log',
    'relic-planner-appimage-packaged-webdriver.log',
    'relic-planner-appimage-smoke-container.json',
    'relic-planner-appimage-smoke-container.log',
]
for name in names:
    source = EVIDENCE / name
    if source.exists():
        destination = EVIDENCE / (tag + '-' + name)
        if destination.exists():
            raise FileExistsError(destination)
        source.rename(destination)

for name in ('deb-smoke.py', 'appimage-smoke.py'):
    source = WORK / name
    if source.exists():
        destination = WORK / (tag + '-' + name)
        if destination.exists():
            raise FileExistsError(destination)
        source.rename(destination)
print('packaged evidence and generated runners archived as ' + tag)
