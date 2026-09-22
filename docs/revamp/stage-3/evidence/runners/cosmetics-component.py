import json
import os
import pathlib
import select
import signal
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

root = pathlib.Path('/var/home/jedwards/kiedas-orbiter')
base = root / '.preview-work'
fixture = base / 'stage3-cosmetics/fixture/dist'
evidence = root / 'docs/revamp/stage-3/evidence'
os.sched_setaffinity(0, sorted(os.sched_getaffinity(0))[:4])
os.nice(19)
scratch = pathlib.Path(tempfile.mkdtemp(prefix='cosmetics-component-', dir=base))
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
app = pathlib.Path('/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/MiniBrowser')
bins = pathlib.Path('/usr/bin')
processes = []
groups = set()
logs = []
result = {
    'tier': 'styled component browser with module mocks',
    'fixture': 'synthetic display data; no live game, inventory, acquisition, or market claims',
    'checks': [],
    'geometry': [],
    'stable_comparisons': [],
}

def start(args, name, **kwargs):
    log = open(evidence / name, 'w')
    logs.append(log)
    process = subprocess.Popen(
        args,
        env=env,
        stdout=log,
        stderr=subprocess.STDOUT,
        start_new_session=True,
        **kwargs,
    )
    processes.append(process)
    groups.add(process.pid)
    return process

def api(method, path, data=None):
    request = urllib.request.Request(
        'http://127.0.0.1:17810' + path,
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
    display = 1932
    env['DISPLAY'] = '127.0.0.1:' + str(display)
    xvfb = start([
        str(bins / 'Xvfb'), ':' + str(display), '-screen', '0', '1200x800x24',
        '-nolisten', 'unix', '-listen', 'tcp', '-ac',
    ], 'cosmetics-component-xvfb.log')
    time.sleep(2)
    if xvfb.poll() is not None:
        raise RuntimeError('Xvfb failed')
    config = scratch / 'dbus.conf'
    config.write_text(
        '<busconfig><type>session</type><listen>unix:tmpdir=' + str(scratch / 'runtime') +
        '</listen><auth>EXTERNAL</auth><policy context="default">'
        '<allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/>'
        '</policy></busconfig>'
    )
    bus_log = open(evidence / 'cosmetics-component-dbus.log', 'w')
    logs.append(bus_log)
    bus = subprocess.Popen([
        str(bins / 'dbus-daemon'), '--nofork', '--print-address=1',
        '--config-file=' + str(config),
    ], env=env, stdout=subprocess.PIPE, stderr=bus_log, text=True)
    processes.append(bus)
    if not select.select([bus.stdout], [], [], 5)[0]:
        raise RuntimeError('D-Bus failed')
    env['DBUS_SESSION_BUS_ADDRESS'] = bus.stdout.readline().strip()
    driver = start([str(bins / 'WebKitWebDriver'), '--port=17810'], 'cosmetics-component-webdriver.log')
    server = start([
        str(bins / 'python3'), '-m', 'http.server', '18810', '--bind', '127.0.0.1',
        '--directory', str(fixture),
    ], 'cosmetics-component-http.log')
    time.sleep(1)
    response = api('POST', '/session', {
        'capabilities': {'alwaysMatch': {'webkitgtk:browserOptions': {
            'binary': str(app), 'args': ['--automation'],
        }}},
    })
    session = response['value']['Links']['sessionId'] if 'Links' in response.get('value', {}) else response['value']['sessionId']
    prefix = '/session/' + session
    api('POST', prefix + '/url', {'url': 'http://127.0.0.1:18810/'})
    time.sleep(1)

    def js(script, args=None):
        return api('POST', prefix + '/execute/sync', {'script': script, 'args': args or []})['value']

    def render(variant='preview', mode='populated', locale='en'):
        js('window.fixture.render(arguments[0])', [{'variant': variant, 'mode': mode, 'locale': locale}])
        time.sleep(.35)

    def resize(width, height):
        api('POST', prefix + '/window/rect', {'width': width, 'height': height})
        time.sleep(.2)
        actual = js('return [innerWidth,innerHeight]')
        rect = api('GET', prefix + '/window/rect')['value']
        api('POST', prefix + '/window/rect', {
            'width': rect['width'] + width - actual[0],
            'height': rect['height'] + height - actual[1],
        })
        time.sleep(.2)

    def click(script, args=None):
        value = js(
            "const e=(" + script + ");if(!e)return false;"
            "e.scrollIntoView({block:'center'});e.click();return true",
            args or [],
        )
        time.sleep(.2)
        return value

    def set_search(value, preview=True):
        selector = '[data-preview-cosmetics-search] input' if preview else 'input'
        ok = js(
            "const e=document.querySelector(arguments[0]);if(!e)return false;"
            "const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;"
            "s.call(e,arguments[1]);e.dispatchEvent(new Event('input',{bubbles:true}));return true",
            [selector, value],
        )
        time.sleep(.25)
        return ok

    def press(value):
        api('POST', prefix + '/actions', {'actions': [{
            'type': 'key', 'id': 'cosmetics-keyboard',
            'actions': [{'type': 'keyDown', 'value': value}, {'type': 'keyUp', 'value': value}],
        }]})
        time.sleep(.2)
        try:
            api('DELETE', prefix + '/actions')
        except Exception:
            pass

    def card_names():
        return js("return [...document.querySelectorAll('[data-preview-cosmetic-card] p[title]')].map(e=>e.textContent.trim())")

    def click_tab(class_name, label):
        return click("[...document.querySelectorAll('.'+arguments[0]+' button')].find(e=>e.textContent.trim()===arguments[1])", [class_name, label])

    stable_modes = ['loading', 'populated', 'empty']
    for mode in stable_modes:
        render('before', mode)
        before = js('return document.getElementById("root").innerHTML')
        render('stable', mode)
        after = js('return document.getElementById("root").innerHTML')
        same = bool(before) and before == after
        result['stable_comparisons'].append({'state': mode, 'equal': same, 'before_length': len(before), 'after_length': len(after)})
        check('stable-' + mode + '-exact-markup', same)

    render('before')
    set_search('no such cosmetic', preview=False)
    before = js('return document.getElementById("root").innerHTML')
    render('stable')
    set_search('no such cosmetic', preview=False)
    after = js('return document.getElementById("root").innerHTML')
    same = before == after and 'No cosmetics match.' in js('return document.body.innerText')
    result['stable_comparisons'].append({'state': 'no-match', 'equal': same, 'before_length': len(before), 'after_length': len(after)})
    check('stable-no-match-exact-markup', same)

    render('before')
    click("[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Load more'))")
    before = js('return document.getElementById("root").innerHTML')
    render('stable')
    click("[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Load more'))")
    after = js('return document.getElementById("root").innerHTML')
    same = before == after
    result['stable_comparisons'].append({'state': 'paginated', 'equal': same, 'before_length': len(before), 'after_length': len(after)})
    check('stable-paginated-exact-markup', same)

    render('before')
    click("[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Acquisition')")
    before = js('return document.getElementById("root").innerHTML')
    render('stable')
    click("[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Acquisition')")
    after = js('return document.getElementById("root").innerHTML')
    same = before == after and 'CLOSE' in js('return document.body.innerText').upper()
    result['stable_comparisons'].append({'state': 'drawer-open', 'equal': same, 'before_length': len(before), 'after_length': len(after)})
    check('stable-drawer-exact-markup', same)
    check('stable-has-no-preview-layout', not js("return !!document.querySelector('[data-preview-cosmetics-layout]')"))

    english = ['All','Warframe','Primary','Secondary','Melee','Archwing','Sentinel','Syandana','Armor','Animation','Glyph','Sigil','Decoration','Emote','Other']
    category_expected = {
        'Warframe': ['Alpha Noble Skin'],
        'Primary': ['Braton Test Skin'],
        'Secondary': ['Lato Test Skin'],
        'Melee': ['Skana Test Skin'],
        'Archwing': ['Odonata Test Skin'],
        'Sentinel': ['Carrier Test Skin'],
        'Syandana': ['Test Syandana'],
        'Armor': ['Test Armor'],
        'Animation': ['Test Animation'],
        'Sigil': ['Test Sigil'],
        'Emote': ['Test Emote'],
        'Other': ['Operator Test Skin', 'Owned Iconless Skin'],
    }
    for width, height in ((1200, 800), (900, 500)):
        resize(width, height)
        render()
        check(f'{width}-preview-layout-present', js("return !!document.querySelector('[data-preview-cosmetics-layout]')"))
        labels = js("return [...document.querySelectorAll('.preview-cosmetics-kind-tabs button')].map(e=>e.textContent.trim())")
        check(f'{width}-15-category-order', labels == english, labels)
        ownership = js("return [...document.querySelectorAll('.preview-cosmetics-ownership-tabs button')].map(e=>e.textContent.trim())")
        check(f'{width}-3-ownership-order', ownership == ['All','Owned','Unowned'], ownership)
        geometry = js("""
          const layout=document.querySelector('[data-preview-cosmetics-layout]');
          const toolbar=document.querySelector('[data-preview-cosmetics-toolbar]');
          const kinds=document.querySelector('.preview-cosmetics-kind-tabs');
          const own=document.querySelector('.preview-cosmetics-ownership-tabs');
          const grid=document.querySelector('[data-preview-cosmetics-grid]');
          const lr=layout.getBoundingClientRect(),gr=grid.getBoundingClientRect();
          const cards=[...document.querySelectorAll('[data-preview-cosmetic-card]')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}});
          return {viewport:[innerWidth,innerHeight],body:{client:document.body.clientWidth,scroll:document.body.scrollWidth},layout:{left:lr.left,right:lr.right,width:lr.width},toolbar:{columns:getComputedStyle(toolbar).gridTemplateColumns},kinds:{client:kinds.clientWidth,scroll:kinds.scrollWidth,overflow:getComputedStyle(kinds).overflowX,wrap:getComputedStyle(kinds).flexWrap},ownership:{client:own.clientWidth,scroll:own.scrollWidth,overflow:getComputedStyle(own).overflowX,wrap:getComputedStyle(own).flexWrap},grid:{left:gr.left,right:gr.right,columns:getComputedStyle(grid).gridTemplateColumns},cards};
        """)
        result['geometry'].append({'size': [width, height], **geometry})
        check(f'{width}-body-no-horizontal-overflow', geometry['body']['scroll'] <= geometry['body']['client'] + 1, geometry['body'])
        check(f'{width}-layout-in-bounds', geometry['layout']['left'] >= 0 and geometry['layout']['right'] <= width + 1, geometry['layout'])
        check(f'{width}-toolbar-two-columns', len(geometry['toolbar']['columns'].split()) == 2, geometry['toolbar'])
        check(f'{width}-kind-scroll-contained', geometry['kinds']['scroll'] > geometry['kinds']['client'] and geometry['kinds']['overflow'] == 'auto' and geometry['kinds']['wrap'] == 'nowrap', geometry['kinds'])
        check(f'{width}-ownership-contained', geometry['ownership']['scroll'] <= geometry['ownership']['client'] + 1 and geometry['ownership']['wrap'] == 'nowrap', geometry['ownership'])
        check(f'{width}-cards-at-least-220-and-bounded', all(c['width'] >= 219 and c['left'] >= geometry['grid']['left'] - 1 and c['right'] <= geometry['grid']['right'] + 1 for c in geometry['cards']), geometry['cards'][:4])
        check(f'{width}-grid-column-count', len(geometry['grid']['columns'].split()) == (3 if width == 1200 else 2), geometry['grid']['columns'])
        for label in english:
            activated = click_tab('preview-cosmetics-kind-tabs', label)
            active = js("const e=[...document.querySelectorAll('.preview-cosmetics-kind-tabs button')].find(e=>e.textContent.trim()===arguments[0]);return !!e&&e.classList.contains('bg-kronos-accent')", [label])
            check(f'{width}-category-{label}', activated and active)

    resize(1200, 800)
    render()
    check('initial-page-size-120', len(card_names()) == 120, len(card_names()))
    check('subtitle-complete-catalog-count', '5 / 148' in js('return document.body.innerText'), js('return document.body.innerText')[:220])
    loaded = click("[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Load more'))")
    names = card_names()
    check('load-more-to-148-without-duplicates', loaded and len(names) == 148 and len(set(names)) == 148, len(names))
    check('unowned-iconless-excluded', 'Iconless' not in names)
    check('owned-iconless-retained', 'Owned Iconless Skin' in names)
    check('unowned-hidden-glyph-excluded', 'Hidden Glyph' not in names)
    check('owned-hidden-glyph-retained', 'Owned Hidden Glyph' in names)
    check('non-emote-flavour-excluded', 'Excluded Flavour' not in names)

    for label, expected in category_expected.items():
        render()
        click_tab('preview-cosmetics-kind-tabs', label)
        actual = card_names()
        check('classification-' + label.lower(), set(actual) == set(expected), actual)
    render()
    click_tab('preview-cosmetics-kind-tabs', 'Decoration')
    check('all-eight-decoration-parents', len(card_names()) == 8, card_names())
    render()
    click_tab('preview-cosmetics-kind-tabs', 'Glyph')
    check('glyph-source-count', len(card_names()) == 120 and 'load more (7 remaining)' in js('return document.body.innerText').lower(), {'visible': len(card_names())})

    render()
    click_tab('preview-cosmetics-kind-tabs', 'Decoration')
    ascending = card_names()
    click("[...document.querySelectorAll('[data-preview-cosmetics-sort] button')].find(e=>e.textContent.trim().startsWith('Name'))")
    descending = card_names()
    check('name-sort-both-directions', len(ascending) == 8 and descending == list(reversed(ascending)), {'ascending': ascending, 'descending': descending})

    render()
    check('search-input', set_search('Page Glyph 124'))
    check('search-name-substring', card_names() == ['Page Glyph 124'], card_names())
    render()
    set_search('no such cosmetic')
    check('search-no-match', len(card_names()) == 0 and 'No cosmetics match.' in js('return document.body.innerText'))
    render()
    click_tab('preview-cosmetics-ownership-tabs', 'Owned')
    owned_names = card_names()
    check('ownership-owned-five', len(owned_names) == 5, owned_names)
    click_tab('preview-cosmetics-ownership-tabs', 'Unowned')
    unowned_names = card_names()
    check('ownership-unowned', len(unowned_names) == 120 and not set(owned_names).intersection(unowned_names), {'visible': len(unowned_names)})
    click_tab('preview-cosmetics-ownership-tabs', 'All')
    check('ownership-all-reset-page', len(card_names()) == 120, len(card_names()))

    render()
    click_tab('preview-cosmetics-kind-tabs', 'Glyph')
    click_tab('preview-cosmetics-ownership-tabs', 'Owned')
    set_search('Owned Hidden')
    check('combined-search-kind-ownership', card_names() == ['Owned Hidden Glyph'], card_names())
    click_tab('preview-cosmetics-ownership-tabs', 'Unowned')
    check('filter-change-resets-and-no-match', len(card_names()) == 0 and 'No cosmetics match.' in js('return document.body.innerText'))

    render()
    first_card = js("return !!document.querySelector('[data-preview-cosmetic-card]')")
    pointer_open = click("document.querySelector('[data-preview-cosmetic-card]')")
    check('pointer-card-opens-drawer', first_card and pointer_open and js("return !!document.querySelector('.fixed.bottom-0')"))
    click("[...document.querySelectorAll('.fixed.bottom-0 button')].find(e=>e.textContent.trim().toLowerCase()==='close')")
    render()
    focused = js("const e=[...document.querySelectorAll('[data-preview-cosmetic-card] button')].find(e=>e.textContent.trim()==='Acquisition');e.focus();return document.activeElement===e&&e.tagName==='BUTTON'")
    press('\ue007')
    check('acquisition-button-enter-opens-once', focused and js("return document.querySelectorAll('.fixed.bottom-0').length===1"))
    click("[...document.querySelectorAll('.fixed.bottom-0 button')].find(e=>e.textContent.trim().toLowerCase()==='close')")
    render()
    focused = js("const e=[...document.querySelectorAll('[data-preview-cosmetic-card] button')].find(e=>e.textContent.trim()==='Acquisition');e.focus();return document.activeElement===e")
    press(' ')
    check('acquisition-button-space-opens-once', focused and js("return document.querySelectorAll('.fixed.bottom-0').length===1"))
    check('outer-card-has-no-button-semantics', js("const e=document.querySelector('[data-preview-cosmetic-card]');return !e.hasAttribute('role')&&e.tabIndex===-1"))

    render(locale='de')
    german = ['Alle','Warframe','Primär','Sekundär','Nahkampf','Archwing','Sentinel','Syandana','Rüstung','Animation','Glyphe','Siegel','Dekoration','Emote','Andere']
    labels = js("return [...document.querySelectorAll('.preview-cosmetics-kind-tabs button')].map(e=>e.textContent.trim())")
    ownership = js("return [...document.querySelectorAll('.preview-cosmetics-ownership-tabs button')].map(e=>e.textContent.trim())")
    check('german-category-labels', labels == german, labels)
    check('german-ownership-labels', ownership == ['Alle','Eigentum','Nicht erworben'], ownership)
    check('german-raw-kind-badge-preserved', 'Skin' in js('return document.body.innerText'))
    check('german-body-no-horizontal-overflow', js('return document.body.scrollWidth<=document.body.clientWidth+1'))

    render()
    body = js('return document.body.innerText')
    commands = js('return window.fixture.calls')
    command_names = sorted(set(call['command'] for call in commands))
    check('only-acquisition-override-command', command_names == ['read_file_bytes'], command_names)
    check('no-market-mutation-commands', not any(name in command_names for name in ('post_market_order','update_market_order','close_market_order','delete_market_order')), command_names)
    check('no-price-or-sell-ui', '0p' not in body and not js("return [...document.querySelectorAll('button')].some(e=>/sell/i.test(e.textContent))"))
    check('catalog-image-url-branches', js("const a=document.querySelector('img[alt=\"Alpha Noble Skin\"]')?.getAttribute('src')||'';const b=document.querySelector('img[alt=\"Braton Test Skin\"]')?.getAttribute('src')||'';return a.includes('PublicExport')&&a.includes('hash-alpha')&&b.includes('browse.wf')"), js("return [...document.querySelectorAll('[data-preview-cosmetic-card] img')].slice(0,4).map(e=>e.getAttribute('src'))"))
    check('no-fixture-errors', js('return window.fixture.errors.length') == 0, js('return window.fixture.errors'))
    api('DELETE', prefix)
except Exception as error:
    result['error'] = str(error)
finally:
    for process in reversed(processes):
        if process.poll() is None:
            try:
                if process.pid in groups:
                    os.killpg(process.pid, signal.SIGTERM)
                else:
                    process.terminate()
            except ProcessLookupError:
                pass
            try:
                process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
    for log in logs:
        log.close()
    (evidence / 'cosmetics-component.json').write_text(json.dumps(result, indent=2) + '\n')
    summary = {
        'error': result.get('error'),
        'checks': len(result['checks']),
        'passed': sum(row['pass'] for row in result['checks']),
        'failures': [row for row in result['checks'] if not row['pass']],
    }
    print(json.dumps(summary, indent=2))
