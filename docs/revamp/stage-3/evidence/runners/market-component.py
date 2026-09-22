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
FIXTURE = BASE / 'stage3-market/fixture/dist'
EVIDENCE = ROOT / 'docs/revamp/stage-3/evidence'
OUTPUT = EVIDENCE / 'market-component.json'
for path in (ROOT / 'AGENTS.md', FIXTURE, EVIDENCE):
    if not path.exists():
        raise FileNotFoundError(f'precondition path missing: {path}')
if OUTPUT.exists():
    raise FileExistsError(OUTPUT)
os.sched_setaffinity(0, sorted(os.sched_getaffinity(0))[:4])
os.nice(19)

scratch = Path(tempfile.mkdtemp(prefix='market-component-', dir=BASE))
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
    'tier': 'styled component browser with module-boundary network/context/Tauri mocks',
    'fixture': 'synthetic WFM catalog, orders, explicit price states and parsed inventory; no real token, account, network or mutation',
    'checks': [],
    'stable_comparisons': [],
    'stable_mutation_parity': [],
    'preview_mutation_invocations': [],
    'frozen_default_price_evidence': {
        'file': 'before-alert-sequencing-fix-market-component.json',
        'alert': 'Enter a listing price before selling.',
    },
    'geometry': [],
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
        'http://127.0.0.1:17841' + path,
        data=None if data is None else json.dumps(data).encode(),
        method=method,
        headers={'Content-Type': 'application/json'},
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(error.read().decode())

def dismiss_alert():
    try:
        api('POST', prefix + '/alert/dismiss', {})
        return True
    except Exception:
        return False


def check(name, value, detail=None):
    row = {'name': name, 'pass': bool(value)}
    if detail is not None:
        row['detail'] = detail
    result['checks'].append(row)


try:
    display = 1963
    env['DISPLAY'] = '127.0.0.1:' + str(display)
    xvfb = start([str(BINS / 'Xvfb'), ':' + str(display), '-screen', '0', '1200x800x24', '-nolisten', 'unix', '-listen', 'tcp', '-ac'], 'market-component-xvfb.log')
    time.sleep(2)
    if xvfb.poll() is not None:
        raise RuntimeError('Xvfb failed')
    config = scratch / 'dbus.conf'
    config.write_text('<busconfig><type>session</type><listen>unix:tmpdir=' + str(scratch / 'runtime') + '</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/></policy></busconfig>')
    bus_log = (EVIDENCE / 'market-component-dbus.log').open('w')
    logs.append(bus_log)
    bus = subprocess.Popen([str(BINS / 'dbus-daemon'), '--nofork', '--print-address=1', '--config-file=' + str(config)], env=env, stdout=subprocess.PIPE, stderr=bus_log, text=True)
    processes.append(bus)
    if not select.select([bus.stdout], [], [], 5)[0]:
        raise RuntimeError('D-Bus failed')
    env['DBUS_SESSION_BUS_ADDRESS'] = bus.stdout.readline().strip()
    start([str(BINS / 'WebKitWebDriver'), '--port=17841'], 'market-component-webdriver.log')
    start([str(BINS / 'python3'), '-m', 'http.server', '18841', '--bind', '127.0.0.1', '--directory', str(FIXTURE)], 'market-component-http.log')
    time.sleep(1)
    response = api('POST', '/session', {'capabilities': {'alwaysMatch': {'webkitgtk:browserOptions': {'binary': str(APP), 'args': ['--automation']}}}})
    session = response['value']['Links']['sessionId'] if 'Links' in response.get('value', {}) else response['value']['sessionId']
    prefix = '/session/' + session
    api('POST', prefix + '/url', {'url': 'http://127.0.0.1:18841/'})
    time.sleep(1)

    def js(script, args=None):
        return api('POST', prefix + '/execute/sync', {'script': script, 'args': args or []})['value']

    def render(variant='preview', mode='populated', locale='en', wait=.4):
        js('window.fixture.render(arguments[0])', [{'variant': variant, 'mode': mode, 'locale': locale}])
        time.sleep(wait)

    def resize(width, height):
        api('POST', prefix + '/window/rect', {'width': width, 'height': height})
        time.sleep(.2)
        actual = js('return [innerWidth,innerHeight]')
        rect = api('GET', prefix + '/window/rect')['value']
        api('POST', prefix + '/window/rect', {'width': rect['width'] + width - actual[0], 'height': rect['height'] + height - actual[1]})
        time.sleep(.2)

    def click_text(text, selector='button'):
        clicked = js("const e=[...document.querySelectorAll(arguments[1])].find(x=>x.textContent.trim()===arguments[0]||x.textContent.trim().startsWith(arguments[0]));if(!e)return false;e.scrollIntoView({block:'center'});e.click();return true", [text, selector])
        time.sleep(.25)
        return clicked

    def set_input(selector, value):
        changed = js("const e=document.querySelector(arguments[0]);if(!e)return false;const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(e,arguments[1]);e.dispatchEvent(new Event('input',{bubbles:true}));return true", [selector, value])
        time.sleep(.25)
        return changed

    def markup():
        return js('return document.getElementById("root").innerHTML')

    def wait_for_stock_cards(expected=6, timeout=5):
        deadline = time.monotonic() + timeout
        count = 0
        while time.monotonic() < deadline:
            count = js("return [...document.querySelectorAll('button')].filter(e=>e.textContent.trim()==='Sell on WFM').length")
            if count == expected:
                return count
            time.sleep(.1)
        diagnostic = js("return {body:document.body.innerText,buttons:[...document.querySelectorAll('button')].map(e=>({text:e.textContent.trim(),disabled:e.disabled})),errors:window.fixture.errors,calls:window.fixture.calls}")
        raise RuntimeError(f'expected {expected} rendered stock cards, found {count}; diagnostic={json.dumps(diagnostic, sort_keys=True)}')

    def stable_compare(name, mode='populated', action=None, wait=.4):
        render('before', mode, wait=wait)
        if action:
            action()
        before = markup()
        render('stable', mode, wait=wait)
        if action:
            action()
        after = markup()
        same = bool(before) and before == after
        result['stable_comparisons'].append({'state': name, 'equal': same, 'before_length': len(before), 'after_length': len(after)})
        check('stable-' + name + '-exact-markup', same)

    stable_compare('no-token', 'no-token')
    stable_compare('order-loading', 'order-loading')
    stable_compare('empty', 'empty')
    stable_compare('populated-orders')
    stable_compare('sell-filter', action=lambda: click_text('Sell ('))
    stable_compare('buy-filter', action=lambda: click_text('Buy ('))
    stable_compare('hidden-filter', action=lambda: click_text('Hidden ('))
    stable_compare('order-search', action=lambda: set_input('input[placeholder="Search active listings..."]', 'Beta'))
    stable_compare('price-edit', action=lambda: click_text('12p', '[title="Click to edit price"]'))
    stable_compare('order-error', 'order-error')
    stable_compare('catalog-error', 'catalog-error')
    stable_compare('empty-stock', 'empty', action=lambda: click_text('Tradeable Stock'))
    stable_compare('populated-stock', action=lambda: click_text('Tradeable Stock'))
    stable_compare('stock-filter', action=lambda: (click_text('Tradeable Stock'), click_text('Best for Ducats')))
    stable_compare('sort-menu', action=lambda: (click_text('Tradeable Stock'), click_text('Sort: Best Plat')))
    check('stable-has-no-preview-layout', not js("return !!document.querySelector('[data-preview-market-layout]')"))

    mutation_commands = ('post_market_order', 'delete_market_order', 'close_market_order', 'update_market_order')

    def mutation_calls():
        return [row for row in js('return window.fixture.calls') if row['command'] in mutation_commands]

    def exercise_mutation(variant, kind):
        render(variant)
        if kind == 'delete':
            js("document.querySelector('[title=\"Delete listing\"]')?.click()")
        elif kind == 'sold':
            js("document.querySelector('[title=\"Mark 1 sold\"]')?.click()")
        elif kind == 'visibility':
            js("document.querySelector('[title^=\"Visible to buyers\"]')?.click()")
        elif kind == 'save-price':
            js("document.querySelector('[title=\"Click to edit price\"]')?.click()")
            time.sleep(.1)
            set_input('tbody input[type=number]', '17')
            js("document.querySelector('[title=\"Save price\"]')?.click()")
        elif kind == 'sell-stock':
            click_text('Tradeable Stock')
            wait_for_stock_cards()
            js("const card=[...document.querySelectorAll('button')].filter(e=>e.textContent.trim()==='Sell on WFM').map(e=>e.parentElement.parentElement).find(e=>e.textContent.includes('Beta Prime Chassis'));card?.querySelector('button')?.click()")
        time.sleep(.3)
        return mutation_calls()

    expected_payloads = {
        'delete': {'command': 'delete_market_order', 'args': {'token': 'SYNTHETIC-TOKEN', 'orderId': 'order-sell-visible'}},
        'sold': {'command': 'close_market_order', 'args': {'token': 'SYNTHETIC-TOKEN', 'orderId': 'order-sell-visible', 'quantity': 1}},
        'visibility': {'command': 'update_market_order', 'args': {'token': 'SYNTHETIC-TOKEN', 'orderId': 'order-sell-visible', 'platinum': None, 'quantity': None, 'visible': False}},
        'save-price': {'command': 'update_market_order', 'args': {'token': 'SYNTHETIC-TOKEN', 'orderId': 'order-sell-visible', 'platinum': 17, 'quantity': None, 'visible': None}},
        'sell-stock': {'command': 'post_market_order', 'args': {'token': 'SYNTHETIC-TOKEN', 'itemId': 'item-beta', 'platPrice': 20, 'quantity': 1, 'rank': None}},
    }
    for kind, expected in expected_payloads.items():
        before_calls = [] if kind == 'sell-stock' else exercise_mutation('before', kind)
        frozen_rejection = kind == 'sell-stock'
        stable_calls = exercise_mutation('stable', kind)
        passed = (frozen_rejection and stable_calls == [expected]) if kind == 'sell-stock' else before_calls == stable_calls == [expected]
        result['stable_mutation_parity'].append({'interaction': kind, 'before': before_calls, 'after': stable_calls, 'expected': expected, 'approved_behavior_correction': kind == 'sell-stock', 'frozen_default_price_rejected': frozen_rejection if kind == 'sell-stock' else None, 'pass': passed})
        check('stable-' + kind + '-mutation-payload-parity', passed, {'before': before_calls, 'after': stable_calls})

    render('preview')
    preview_notice = js("return document.querySelector('[data-preview-market-readonly]')?.textContent.trim()")
    check('preview-read-only-notice', preview_notice == 'Preview mode: market data is read-only. Listing, editing, visibility, sold, and delete actions are disabled.', preview_notice)
    active_controls = js("return [...document.querySelectorAll('[data-preview-market-mutation]')].map(e=>({kind:e.dataset.previewMarketMutation,disabled:e.disabled===true,aria:e.getAttribute('aria-disabled'),title:e.title,onClick:typeof e.onclick==='function'}))")
    js("document.querySelectorAll('[data-preview-market-mutation]').forEach(e=>e.click())")
    click_text('Tradeable Stock')
    stock_controls = js("return [...document.querySelectorAll('[data-preview-market-mutation]')].map(e=>({kind:e.dataset.previewMarketMutation,disabled:e.disabled===true,aria:e.getAttribute('aria-disabled'),title:e.title}))")
    js("document.querySelectorAll('[data-preview-market-mutation]').forEach(e=>e.click())")
    time.sleep(.3)
    preview_calls = mutation_calls()
    result['preview_mutation_invocations'] = preview_calls
    kinds = {row['kind'] for row in active_controls + stock_controls}
    check('preview-all-five-mutation-interactions-covered', {'edit-price', 'visibility', 'sold', 'delete', 'listing-price', 'sell'} <= kinds, {'active': active_controls, 'stock': stock_controls})
    check('preview-mutation-controls-disabled', all(row['disabled'] or row['aria'] == 'true' for row in active_controls + stock_controls), {'active': active_controls, 'stock': stock_controls})
    check('preview-disabled-reason-consistent', all(row['title'] == 'Market changes are disabled in Preview' for row in active_controls + stock_controls), {'active': active_controls, 'stock': stock_controls})
    check('preview-zero-frontend-mutation-invocations', preview_calls == [], preview_calls)

    render('stable')
    order_headers = js("return [...document.querySelectorAll('thead th')].map(e=>e.textContent.trim())")
    check('six-order-columns-preserved', order_headers == ['Item', 'Type', 'Quantity', 'Price', 'Status', 'Actions'], order_headers)
    for label, expected_names in (
        ('All (', ['Alpha Prime Blueprint', 'Beta Prime Chassis', 'Gamma Prime Systems']),
        ('Sell (', ['Alpha Prime Blueprint', 'Gamma Prime Systems']),
        ('Buy (', ['Beta Prime Chassis']),
        ('Hidden (', ['Gamma Prime Systems']),
    ):
        click_text(label)
        names = js("return [...document.querySelectorAll('tbody tr td:first-child .font-semibold')].map(e=>e.textContent.trim())")
        check('order-filter-' + label.split()[0].lower(), names == expected_names, names)
    click_text('All (')
    set_input('input[placeholder="Search active listings..."]', 'Beta')
    names = js("return [...document.querySelectorAll('tbody tr td:first-child .font-semibold')].map(e=>e.textContent.trim())")
    check('order-search-substring', names == ['Beta Prime Chassis'], names)

    render('stable')
    click_text('Tradeable Stock')
    wait_for_stock_cards()
    cards = js("return [...document.querySelectorAll('button')].filter(e=>e.textContent.trim()==='Sell on WFM').map(e=>e.parentElement.parentElement.innerText)")
    joined = '\n'.join(cards)
    check('verified-tradable-positive-stock-only', len(cards) == 6 and 'Blocked Prime Part' not in joined and 'Zero Prime Part' not in joined, cards)
    expected_states = {
        'Alpha Prime Blueprint': ('KEEP FOR DUCATS', '3'),
        'Beta Prime Chassis': ('SELL FOR PLAT', '20'),
        'Gamma Prime Systems': ('SELL FOR PLAT', '5'),
        'Delta Prime Barrel': ('CANNOT COMPARE YET', ''),
        'Epsilon Prime Receiver': ('CANNOT COMPARE YET', ''),
        'Zeta Prime Stock': ('CANNOT COMPARE YET', ''),
    }
    card_states = js("return Object.fromEntries([...document.querySelectorAll('button')].filter(e=>e.textContent.trim()==='Sell on WFM').map(e=>e.parentElement.parentElement).map(e=>[e.querySelector('.font-semibold')?.textContent.trim(),{text:e.innerText,input:e.querySelector('input')?.value,placeholder:e.querySelector('input')?.placeholder,sellDisabled:e.querySelector('button')?.disabled}]))")
    for name, (decision, price) in expected_states.items():
        state = card_states[name]
        check('price-state-' + name.split()[0].lower(), decision in state['text'] and state['input'] == price and (price != '' or state['placeholder'] == '?'), state)
    check('ready-prices-enable-stable-sell', all(card_states[name]['sellDisabled'] is False for name in ('Alpha Prime Blueprint', 'Beta Prime Chassis', 'Gamma Prime Systems')))
    check('unresolved-prices-disable-stable-sell', all(card_states[name]['sellDisabled'] is True for name in ('Delta Prime Barrel', 'Epsilon Prime Receiver', 'Zeta Prime Stock')))
    render('stable', mode='progressive', wait=.2)
    click_text('Tradeable Stock')
    wait_for_stock_cards()
    initial_order = js("return [...document.querySelectorAll('button')].filter(e=>e.textContent.trim()==='Sell on WFM').map(e=>e.parentElement.parentElement.querySelector('.font-semibold')?.textContent.trim())")
    time.sleep(1.5)
    settled_order = js("return [...document.querySelectorAll('button')].filter(e=>e.textContent.trim()==='Sell on WFM').map(e=>e.parentElement.parentElement.querySelector('.font-semibold')?.textContent.trim())")
    check('price-resolution-does-not-auto-reorder', initial_order == settled_order, {'before': initial_order, 'after': settled_order})

    filter_expectations = (
        ('Sell for Plat', ['Beta Prime Chassis', 'Gamma Prime Systems']),
        ('Best for Ducats', ['Alpha Prime Blueprint']),
        ('Duplicates 2+', ['Alpha Prime Blueprint']),
        ('Mastered', ['Alpha Prime Blueprint']),
    )
    for label, expected in filter_expectations:
        click_text(label)
        names = js("return [...document.querySelectorAll('button')].filter(e=>e.textContent.trim()==='Sell on WFM').map(e=>e.parentElement.parentElement.querySelector('.font-semibold')?.textContent.trim())")
        check('stock-filter-' + label.split()[0].lower(), names == expected, names)
    check('dormant-unmastered-control-absent', not js("return [...document.querySelectorAll('button')].some(e=>/unmastered/i.test(e.textContent))"))

    render('stable')
    click_text('Tradeable Stock')
    set_input('input[placeholder="Search stock..."]', 'Gamma')
    names = js("return [...document.querySelectorAll('button')].filter(e=>e.textContent.trim()==='Sell on WFM').map(e=>e.parentElement.parentElement.querySelector('.font-semibold')?.textContent.trim())")
    check('stock-search-substring', names == ['Gamma Prime Systems'], names)
    render('stable')
    click_text('Tradeable Stock')
    sort_expectations = (
        ('Sort: Best Plat', 'Beta Prime Chassis'),
        ('Sort: Best Ducats', 'Alpha Prime Blueprint'),
        ('Highest Plat Price', 'Beta Prime Chassis'),
        ('Most Owned', 'Alpha Prime Blueprint'),
        ('Highest Ducats', 'Beta Prime Chassis'),
        ('Name (A-Z)', 'Alpha Prime Blueprint'),
    )
    click_text('Refresh Sort')
    for index, (label, first) in enumerate(sort_expectations):
        if index:
            js("[...document.querySelectorAll('button')].find(e=>e.textContent.includes('▼'))?.click()")
            time.sleep(.1)
            click_text(label)
        name = js("return [...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Sell on WFM')?.parentElement.parentElement.querySelector('.font-semibold')?.textContent.trim()")
        check('stock-sort-' + label.lower().replace(' ', '-').replace(':', '').replace('(', '').replace(')', ''), name == first, name)

    for width, height in ((1200, 800), (900, 500)):
        resize(width, height)
        render('preview')
        order_state = js("""const root=document.querySelector('[data-preview-market-layout]'),metrics=document.querySelector('[data-preview-market-metrics]'),tabs=document.querySelector('[data-preview-market-tabs]'),rail=document.querySelector('[data-preview-market-rail=orders]'),viewport=document.querySelector('[data-preview-market-table-viewport]'),table=document.querySelector('[data-preview-market-table]');return {present:!!root,body:{client:document.body.clientWidth,scroll:document.body.scrollWidth},metricsColumns:new Set([...metrics.children].map(e=>Math.round(e.getBoundingClientRect().left))).size,tabs:{overflow:getComputedStyle(tabs).overflowX,wrap:getComputedStyle(tabs).flexWrap},rail:{overflow:getComputedStyle(rail).overflowX,wrap:getComputedStyle(rail).flexWrap},table:{overflow:getComputedStyle(viewport).overflowX,client:viewport.clientWidth,scroll:viewport.scrollWidth,width:table.getBoundingClientRect().width},mutations:[...document.querySelectorAll('[data-preview-market-mutation]')].every(e=>e.disabled||e.getAttribute('aria-disabled')==='true')};""")
        result['geometry'].append({'size': [width, height], 'tab': 'active-orders', **order_state})
        check(str(width) + '-active-orders-contained', order_state['present'] and order_state['body']['scroll'] <= order_state['body']['client'] + 1 and order_state['metricsColumns'] == (4 if width == 1200 else 2) and order_state['tabs']['overflow'] == 'auto' and order_state['tabs']['wrap'] == 'nowrap' and order_state['rail']['overflow'] == 'auto' and order_state['rail']['wrap'] == 'nowrap' and order_state['table']['overflow'] == 'auto' and order_state['mutations'], order_state)
        click_text('Tradeable Stock')
        stock_state = js("""const root=document.querySelector('[data-preview-market-layout]'),rail=document.querySelector('[data-preview-market-rail=stock]'),tools=document.querySelector('[data-preview-market-stock-tools]'),grid=document.querySelector('[data-preview-market-stock-grid]');return {present:!!root,body:{client:document.body.clientWidth,scroll:document.body.scrollWidth},rail:{overflow:getComputedStyle(rail).overflowX,wrap:getComputedStyle(rail).flexWrap},toolsWidth:tools.getBoundingClientRect().width,gridColumns:new Set([...grid.children].map(e=>Math.round(e.getBoundingClientRect().left))).size,cards:[...grid.children].length,mutations:[...document.querySelectorAll('[data-preview-market-mutation]')].every(e=>e.disabled||e.getAttribute('aria-disabled')==='true')};""")
        result['geometry'].append({'size': [width, height], 'tab': 'tradeable-stock', **stock_state})
        check(str(width) + '-tradeable-stock-contained', stock_state['present'] and stock_state['body']['scroll'] <= stock_state['body']['client'] + 1 and stock_state['rail']['overflow'] == 'auto' and stock_state['rail']['wrap'] == 'nowrap' and stock_state['gridColumns'] == (3 if width == 1200 else 2) and stock_state['cards'] == 6 and stock_state['mutations'], stock_state)

    render('preview', locale='de')
    click_text('Tradeable Stock')
    german = js("return {title:document.body.innerText.includes('Markt & Handelszentrum'),sync:document.body.innerText.includes('Angebote synchronisieren'),metrics:document.body.innerText.includes('Mögliche Einnahmen'),filters:document.body.innerText.includes('Für Platin verkaufen'),sort:document.body.innerText.includes('Sortieren: Bester Platin-Verkauf')}")
    check('german-labels-from-real-locale', all(german.values()), german)
    check('literal-preview-notice-boundary-recorded', 'Preview mode: market data is read-only.' in js('return document.body.innerText'))
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
    print(json.dumps({'checks': len(result['checks']), 'passed': sum(row['pass'] for row in result['checks']), 'stable': len(result['stable_comparisons']), 'mutation_parity': len(result['stable_mutation_parity']), 'preview_mutations': len(result['preview_mutation_invocations']), 'error': result.get('error')}, indent=2))
raise SystemExit(0 if not result.get('error') and all(row['pass'] for row in result['checks']) else 1)
