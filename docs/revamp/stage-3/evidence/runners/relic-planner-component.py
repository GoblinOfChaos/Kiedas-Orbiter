import json
import os
import select
import signal
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path('/var/home/jedwards/kiedas-orbiter')
BASE = ROOT / '.preview-work'
FIXTURE = BASE / 'stage3-relic-planner/fixture/dist'
EVIDENCE = ROOT / 'docs/revamp/stage-3/evidence'
OUTPUT = EVIDENCE / 'relic-planner-component.json'
for path in (ROOT / 'AGENTS.md', FIXTURE, EVIDENCE):
    if not path.exists():
        raise FileNotFoundError(f'precondition path missing: {path}')
if OUTPUT.exists():
    raise FileExistsError(OUTPUT)
os.sched_setaffinity(0, sorted(os.sched_getaffinity(0))[:4])
os.nice(19)

scratch = Path(tempfile.mkdtemp(prefix='relic-planner-component-', dir=BASE))
for name in ('runtime', 'xdgdata', 'config', 'cache'):
    (scratch / name).mkdir(parents=True, exist_ok=True)
(scratch / 'runtime').chmod(0o700)
env = os.environ.copy()
env.update(
    XDG_DATA_HOME=str(scratch / 'xdgdata'),
    XDG_CONFIG_HOME=str(scratch / 'config'),
    XDG_CACHE_HOME=str(scratch / 'cache'),
    XDG_RUNTIME_DIR=str(scratch / 'runtime'),
    TAURI_WEBVIEW_AUTOMATION='true',
    WEBKIT_DISABLE_DMABUF_RENDERER='1',
    LIBGL_ALWAYS_SOFTWARE='1',
    LP_NUM_THREADS='2',
    OMP_NUM_THREADS='2',
)
env.pop('DBUS_SESSION_BUS_ADDRESS', None)
env.pop('WAYLAND_DISPLAY', None)
APP = Path('/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/MiniBrowser')
BINS = Path('/usr/bin')
for path in (APP, BINS / 'Xvfb', BINS / 'dbus-daemon', BINS / 'WebKitWebDriver', BINS / 'python3'):
    if not path.exists():
        raise FileNotFoundError(path)

processes = []
groups = set()
logs = []
result = {
    'tier': 'styled component browser with module-boundary context/Tauri mocks and real relicParser helpers',
    'fixture': 'synthetic parsed-inventory shape and DE-export shape; no live account, network, or market claims',
    'checks': [],
    'stable_comparisons': [],
    'geometry': [],
    'helper_snapshot': None,
}


def start(args, name):
    path = EVIDENCE / name
    if path.exists():
        raise FileExistsError(path)
    log = path.open('w')
    logs.append(log)
    process = subprocess.Popen(args, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    processes.append(process)
    groups.add(process.pid)
    return process


def api(method, path, data=None):
    request = urllib.request.Request(
        'http://127.0.0.1:17831' + path,
        data=None if data is None else json.dumps(data).encode(),
        method=method,
        headers={'Content-Type': 'application/json'},
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(error.read().decode())


def check(name, value, detail=None):
    row = {'name': name, 'pass': bool(value)}
    if detail is not None:
        row['detail'] = detail
    result['checks'].append(row)


try:
    display = 1953
    env['DISPLAY'] = '127.0.0.1:' + str(display)
    xvfb = start([str(BINS / 'Xvfb'), ':' + str(display), '-screen', '0', '1200x800x24', '-nolisten', 'unix', '-listen', 'tcp', '-ac'], 'relic-planner-component-xvfb.log')
    time.sleep(2)
    if xvfb.poll() is not None:
        raise RuntimeError('Xvfb failed')
    config = scratch / 'dbus.conf'
    config.write_text('<busconfig><type>session</type><listen>unix:tmpdir=' + str(scratch / 'runtime') + '</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/></policy></busconfig>')
    bus_log = (EVIDENCE / 'relic-planner-component-dbus.log').open('w')
    logs.append(bus_log)
    bus = subprocess.Popen([str(BINS / 'dbus-daemon'), '--nofork', '--print-address=1', '--config-file=' + str(config)], env=env, stdout=subprocess.PIPE, stderr=bus_log, text=True)
    processes.append(bus)
    if not select.select([bus.stdout], [], [], 5)[0]:
        raise RuntimeError('D-Bus failed')
    env['DBUS_SESSION_BUS_ADDRESS'] = bus.stdout.readline().strip()
    start([str(BINS / 'WebKitWebDriver'), '--port=17831'], 'relic-planner-component-webdriver.log')
    start([str(BINS / 'python3'), '-m', 'http.server', '18831', '--bind', '127.0.0.1', '--directory', str(FIXTURE)], 'relic-planner-component-http.log')
    time.sleep(1)
    response = api('POST', '/session', {'capabilities': {'alwaysMatch': {'webkitgtk:browserOptions': {'binary': str(APP), 'args': ['--automation']}}}})
    session = response['value']['Links']['sessionId'] if 'Links' in response.get('value', {}) else response['value']['sessionId']
    prefix = '/session/' + session
    api('POST', prefix + '/url', {'url': 'http://127.0.0.1:18831/'})
    time.sleep(1)

    def js(script, args=None):
        return api('POST', prefix + '/execute/sync', {'script': script, 'args': args or []})['value']

    def render(variant='preview', mode='populated', locale='en'):
        js('window.fixture.render(arguments[0])', [{'variant': variant, 'mode': mode, 'locale': locale}])
        time.sleep(.25)

    def resize(width, height):
        api('POST', prefix + '/window/rect', {'width': width, 'height': height})
        time.sleep(.2)
        actual = js('return [innerWidth,innerHeight]')
        rect = api('GET', prefix + '/window/rect')['value']
        api('POST', prefix + '/window/rect', {'width': rect['width'] + width - actual[0], 'height': rect['height'] + height - actual[1]})
        time.sleep(.2)

    def click_text(text, selector='button'):
        clicked = js("const e=[...document.querySelectorAll(arguments[1])].find(x=>x.textContent.trim()===arguments[0]||x.textContent.trim().startsWith(arguments[0]));if(!e)return false;e.scrollIntoView({block:'center'});e.click();return true", [text, selector])
        time.sleep(.2)
        return clicked

    def input_search(value, wait=.16):
        changed = js("const e=document.querySelector('input');if(!e)return false;const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(e,arguments[0]);e.dispatchEvent(new Event('input',{bubbles:true}));return true", [value])
        time.sleep(wait)
        return changed

    def body_markup():
        return js('return document.getElementById("root").innerHTML')

    def stable_compare(name, mode='populated', action=None):
        render('before', mode)
        if action:
            action()
        before = body_markup()
        render('stable', mode)
        if action:
            action()
        after = body_markup()
        same = bool(before) and before == after
        result['stable_comparisons'].append({'state': name, 'equal': same, 'before_length': len(before), 'after_length': len(after)})
        check('stable-' + name + '-exact-markup', same)

    stable_compare('loading', 'loading')
    stable_compare('missing-export', 'no-export')
    stable_compare('missing-inventory', 'no-inventory')
    stable_compare('empty-selection')
    stable_compare('populated-selection', action=lambda: click_text('Test Prime Part 001'))
    stable_compare('no-matches', action=lambda: (click_text('Test Prime Part 001'), click_text('Unowned')))
    stable_compare('ownership-filtered', action=lambda: (click_text('Test Prime Part 007'), click_text('Owned')))
    stable_compare('post-load-more', action=lambda: click_text('Load More'))
    check('stable-has-no-preview-layout', not js("return !!document.querySelector('[data-preview-relic-planner-layout]')"))

    helper = js('return window.fixture.helperSnapshot()')
    result['helper_snapshot'] = helper
    check('helper-prime-plus-forma-count', helper['partCount'] == 133, helper)
    check('helper-non-prime-excluded', helper['containsNonPrime'] is False)
    check('helper-forma-included-once', helper['formaCount'] == 1)
    check('helper-catalog-count', helper['catalogCount'] == 22)
    check('helper-catalog-order', helper['catalogKeys'] == ['Lith T01', 'Meso T02', 'Neo T03'])
    statuses = [helper['status']['/Lotus/Types/Recipes/Weapons/TestPrimePart' + str(index).zfill(3)] for index in range(1, 6)]
    expected_statuses = [
        {'currentStock': 1, 'directOwned': True, 'everObtained': True, 'need': 1, 'hasEnough': True},
        {'currentStock': 1, 'directOwned': True, 'everObtained': True, 'need': 2, 'hasEnough': False},
        {'currentStock': 0, 'directOwned': False, 'everObtained': True, 'need': 1, 'hasEnough': False},
        {'currentStock': 0, 'directOwned': False, 'everObtained': True, 'need': 1, 'hasEnough': True},
        {'currentStock': 0, 'directOwned': False, 'everObtained': False, 'need': 1, 'hasEnough': False},
    ]
    for index, expected in enumerate(expected_statuses, 1):
        check('helper-status-case-' + str(index), statuses[index - 1] == expected, statuses[index - 1])

    render()
    initial_buttons = js("return document.querySelectorAll('[data-preview-relic-planner-panel=picker] .overflow-y-auto button').length")
    check('initial-display-limit-60', initial_buttons == 61, initial_buttons)
    check('load-more-present', click_text('Load More'))
    after_more = js("return document.querySelectorAll('[data-preview-relic-planner-panel=picker] .overflow-y-auto button').length")
    check('load-more-adds-60', after_more == 121, after_more)
    check('second-load-more-present', click_text('Load More'))
    after_second = js("return document.querySelectorAll('[data-preview-relic-planner-panel=picker] .overflow-y-auto button').length")
    check('second-load-more-reaches-full-catalog', after_second == 133, after_second)

    render()
    check('search-input-present', input_search('Part 129', wait=.02))
    immediate_count = js("return document.querySelectorAll('[data-preview-relic-planner-panel=picker] .overflow-y-auto button').length")
    time.sleep(.16)
    delayed_labels = js("return [...document.querySelectorAll('[data-preview-relic-planner-panel=picker] .overflow-y-auto button')].map(e=>e.textContent.trim())")
    check('search-is-debounced', immediate_count == 61 and delayed_labels == ['Test Prime Part 129'], {'immediate': immediate_count, 'delayed': delayed_labels})
    input_search('')
    reset_count = js("return document.querySelectorAll('[data-preview-relic-planner-panel=picker] .overflow-y-auto button').length")
    check('search-reset-restores-60-limit', reset_count == 61, reset_count)

    render()
    click_text('Never Obtained')
    click_text('Load More')
    click_text('Load More')
    never_count = js("return document.querySelectorAll('[data-preview-relic-planner-panel=picker] .overflow-y-auto button').length")
    check('never-obtained-filter-count', never_count == 129, never_count)
    click_text('Missing')
    click_text('Load More')
    click_text('Load More')
    missing_count = js("return document.querySelectorAll('[data-preview-relic-planner-panel=picker] .overflow-y-auto button').length")
    check('missing-filter-count', missing_count == 131, missing_count)
    click_text('All', '[data-preview-relic-planner-rail=parts] button')

    render()
    check('add-first-part', click_text('Test Prime Part 001'))
    first_disabled = js("return [...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Test Prime Part 001')?.disabled")
    selected_text = js("return document.querySelector('[data-preview-relic-planner-panel=need]')?.innerText")
    check('duplicate-prevention-disables-selected-part', first_disabled is True)
    check('selected-part-appears-once', selected_text.count('Test Prime Part 001') == 1, selected_text)
    remove_label = js("return document.querySelector('[data-preview-relic-planner-panel=need] button[aria-label]')?.getAttribute('aria-label')")
    check('preview-remove-label-includes-item', remove_label == 'Remove Test Prime Part 001', remove_label)
    check('pointer-remove-part', js("const e=document.querySelector('[data-preview-relic-planner-panel=need] button[aria-label]');if(!e)return false;e.click();return true"))
    time.sleep(.2)
    check('pointer-remove-clears-selection', 'Test Prime Part 001' not in js("return document.querySelector('[data-preview-relic-planner-panel=need]').innerText"))

    render()
    click_text('Test Prime Part 001')
    focused = js("const e=document.querySelector('[data-preview-relic-planner-panel=need] button[aria-label]');e.focus();return document.activeElement===e")
    api('POST', prefix + '/actions', {'actions': [{'type': 'key', 'id': 'planner-keyboard', 'actions': [{'type': 'keyDown', 'value': chr(0xE007)}, {'type': 'keyUp', 'value': chr(0xE007)}]}]})
    time.sleep(.2)
    try:
        api('DELETE', prefix + '/actions')
    except Exception:
        pass
    check('keyboard-remove-part', focused and 'Test Prime Part 001' not in js("return document.querySelector('[data-preview-relic-planner-panel=need]').innerText"))

    render()
    click_text('Test Prime Part 001')
    click_text('Test Prime Part 007')
    click_text('Test Prime Part 013')
    result_names = js("return [...document.querySelectorAll('[data-preview-relic-planner-result]')].map(e=>e.querySelector(':scope > div:nth-child(2) span')?.textContent.trim())")
    check('exact-reward-matching-count', len(result_names) == 3, result_names)
    check('owned-count-then-match-count-order', result_names == ['Lith T01', 'Meso T02', 'Neo T03'], result_names)
    click_text('Owned', '[data-preview-relic-planner-rail=ownership] button')
    check('owned-result-filter', len(js("return [...document.querySelectorAll('[data-preview-relic-planner-result]')]")) == 2)
    click_text('Unowned', '[data-preview-relic-planner-rail=ownership] button')
    check('unowned-result-filter', len(js("return [...document.querySelectorAll('[data-preview-relic-planner-result]')]")) == 1)
    click_text('All', '[data-preview-relic-planner-rail=ownership] button')
    click_text('Clear')
    check('clear-removes-entire-selection', '0 selected' in js("return document.querySelector('[data-preview-relic-planner-panel=need]').innerText"))

    render()
    input_search('Part 129')
    click_text('Add All Missing Parts')
    need_text = js("return document.querySelector('[data-preview-relic-planner-panel=need]').innerText")
    check('add-all-missing-uses-full-catalog', '131 selected' in need_text, need_text[:100])
    check('add-all-missing-distinguishes-partial-stock', 'Test Prime Part 002' in need_text)
    check('add-all-missing-excludes-enough-parent-evidence', 'Test Prime Part 004' not in need_text)
    click_text('Clear')
    click_text('Add Never Obtained')
    need_text = js("return document.querySelector('[data-preview-relic-planner-panel=need]').innerText")
    check('add-never-obtained-uses-full-catalog', '129 selected' in need_text, need_text[:100])
    check('add-never-excludes-partial-stock-history', 'Test Prime Part 002' not in need_text)
    check('add-never-excludes-foundry-history', 'Test Prime Part 003' not in need_text)

    for width, height in ((1200, 800), (900, 500)):
        resize(width, height)
        render()
        click_text('Add All Missing Parts')
        state = js("""const root=document.querySelector('[data-preview-relic-planner-layout]');const workspace=document.querySelector('[data-preview-relic-planner-workspace]');const panels=[...document.querySelectorAll('[data-preview-relic-planner-panel]')];const rects=panels.map(e=>e.getBoundingClientRect());const lists=panels.map(e=>e.querySelector('.overflow-y-auto')).filter(Boolean);const rails=[...document.querySelectorAll('[data-preview-relic-planner-rail]')];return {present:!!root,body:{client:document.body.clientWidth,scroll:document.body.scrollWidth},columns:getComputedStyle(workspace).gridTemplateColumns.split(' ').length,rects:rects.map(r=>({top:r.top,bottom:r.bottom,height:r.height,left:r.left,right:r.right})),lists:lists.map(e=>({client:e.clientHeight,scroll:e.scrollHeight,overflow:getComputedStyle(e).overflowY})),rails:rails.map(e=>({kind:e.dataset.previewRelicPlannerRail,wrap:getComputedStyle(e).flexWrap,overflow:getComputedStyle(e).overflowX,client:e.clientWidth,scroll:e.scrollWidth})),noSell:![...root.querySelectorAll('button')].some(e=>/sell/i.test(e.textContent))};""")
        result['geometry'].append({'size': [width, height], **state})
        aligned = len(state['rects']) == 3 and max(r['top'] for r in state['rects']) - min(r['top'] for r in state['rects']) <= 1 and max(r['height'] for r in state['rects']) - min(r['height'] for r in state['rects']) <= 1
        contained = state['body']['scroll'] <= state['body']['client'] + 1 and all(r['left'] >= -1 and r['right'] <= width + 1 and r['bottom'] <= height + 1 for r in state['rects'])
        check(str(width) + '-three-panel-workspace', state['present'] and state['columns'] == 3 and aligned, state)
        check(str(width) + '-horizontal-containment', contained, state)
        check(str(width) + '-internal-list-scrolling', len(state['lists']) == 3 and all(row['overflow'] == 'auto' and row['scroll'] > row['client'] for row in state['lists']), state['lists'])
        check(str(width) + '-contained-nowrap-filter-rails', len(state['rails']) == 2 and all(row['wrap'] == 'nowrap' and row['overflow'] == 'auto' for row in state['rails']), state['rails'])
        check(str(width) + '-market-controls-absent', state['noSell'])

    render(locale='de')
    german = js("return {title:document.body.innerText.toLowerCase().includes('relikt-planer'),search:document.querySelector('input')?.placeholder,filters:[...document.querySelectorAll('[data-preview-relic-planner-rail=parts] button')].map(e=>e.textContent.trim()),ownership:[...document.querySelectorAll('[data-preview-relic-planner-rail=ownership] button')].map(e=>e.textContent.trim())}")
    check('german-labels-from-real-locale', german == {'title': True, 'search': 'Teile durchsuchen...', 'filters': ['Alle', 'Nie erhalten', 'Fehlt'], 'ownership': ['Alle', 'Im Besitz', 'Nicht im Besitz']}, german)
    check('literal-english-boundaries-preserved', 'owned' in js('return document.body.innerText') and 'selected' in js('return document.body.innerText'))
    calls = js('return window.fixture.calls')
    check('only-icons-path-command', [row['command'] for row in calls] == ['get_icons_path'], calls)
    check('no-market-mutation-command', not any(row['command'] in ('post_market_order', 'update_market_order', 'delete_market_order', 'close_market_order') for row in calls))
    check('no-browser-errors', len(js('return window.fixture.errors')) == 0, js('return window.fixture.errors'))
    api('DELETE', prefix)
except Exception as error:
    result['error'] = str(error)
finally:
    for process in reversed(processes):
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGTERM) if process.pid in groups else process.terminate()
            try:
                process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
    for log in logs:
        log.close()
    OUTPUT.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'checks': len(result['checks']), 'passed': sum(row['pass'] for row in result['checks']), 'stable': len(result['stable_comparisons']), 'error': result.get('error')}, indent=2))
raise SystemExit(0 if not result.get('error') and all(row['pass'] for row in result['checks']) else 1)
