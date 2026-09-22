from pathlib import Path


ROOT = Path('/var/home/jedwards/kiedas-orbiter')
WORK = ROOT / '.preview-work/stage3-relic-planner'
EVIDENCE = ROOT / 'docs/revamp/stage-3/evidence'
for path in (ROOT / 'AGENTS.md', WORK, EVIDENCE):
    if not path.exists():
        raise FileNotFoundError(f'precondition path missing: {path}')

names = [
    'relic-planner-component-build.log',
    'relic-planner-component.json',
    'relic-planner-component-container.json',
    'relic-planner-component-container.log',
    'relic-planner-component-xvfb.log',
    'relic-planner-component-dbus.log',
    'relic-planner-component-webdriver.log',
    'relic-planner-component-http.log',
    'relic-planner-source-preservation.json',
    'relic-planner-frontend-stable.log',
    'relic-planner-frontend-preview.log',
    'relic-planner-native-build-container.json',
    'relic-planner-native-build-container.log',
    'relic-planner-native-build-inner.log',
    'relic-planner-native-bundle-container.json',
    'relic-planner-native-bundle-container.log',
    'relic-planner-native-bundle-inner.log',
    'relic-planner-deb-equipped-install.log',
    'relic-planner-deb-equipped-remove.log',
    'relic-planner-deb-packaged-smoke.json',
    'relic-planner-deb-packaged-xvfb.log',
    'relic-planner-deb-packaged-dbus.log',
    'relic-planner-deb-packaged-webdriver.log',
    'relic-planner-deb-smoke-container.json',
    'relic-planner-deb-smoke-container.log',
]
for name in names:
    source = EVIDENCE / name
    if source.exists():
        destination = EVIDENCE / ('before-css-correction-' + name)
        if destination.exists():
            raise FileExistsError(destination)
        source.rename(destination)

for name in ('deb-smoke.py', 'appimage-smoke.py'):
    source = WORK / name
    if source.exists():
        destination = WORK / ('before-css-correction-' + name)
        if destination.exists():
            raise FileExistsError(destination)
        source.rename(destination)
print('pre-correction Stage 3H evidence and generated native runners archived')
