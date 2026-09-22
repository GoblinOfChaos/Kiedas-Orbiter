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
FIXTURE = BASE / 'stage3-settings/fixture/dist'
EVIDENCE = ROOT / 'docs/revamp/stage-3/evidence'
OUTPUT = EVIDENCE / 'settings-component.json'
for path in (ROOT / 'AGENTS.md', FIXTURE, EVIDENCE):
    if not path.exists():
        raise FileNotFoundError(f'precondition path missing: {path}')
if OUTPUT.exists():
    raise FileExistsError(OUTPUT)
os.sched_setaffinity(0, sorted(os.sched_getaffinity(0))[:4])
os.nice(19)

scratch = Path(tempfile.mkdtemp(prefix='settings-component-', dir=BASE))
for name in ('runtime', 'xdgdata', 'config', 'cache'):
    (scratch / name).mkdir(parents=True, exist_ok=True)
(scratch / 'runtime').chmod(0o700)
env = os.environ.copy()
env.update(
    XDG_DATA_HOME=str(scratch / 'xdgdata'), XDG_CONFIG_HOME=str(scratch / 'config'),
    XDG_CACHE_HOME=str(scratch / 'cache'), XDG_RUNTIME_DIR=str(scratch / 'runtime'),
    TAURI_WEBVIEW_AUTOMATION='true', WEBKIT_DISABLE_DMABUF_RENDERER='1',
    LIBGL_ALWAYS_SOFTWARE='1', LP_NUM_THREADS='2', OMP_NUM_THREADS='2',
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
    'tier': 'styled component browser with module-boundary context, settings and Tauri mocks',
    'fixture': 'synthetic isolated preferences and local data only; no real account, game, network, notification, overlay or hotkey registration',
    'checks': [], 'stable_comparisons': [], 'stable_interaction_parity': [],
    'preview_unavailable_invocations': [], 'preview_relay_event_invocations': [],
    'preview_stop_log_scanner_invocations': [], 'geometry': [],
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
        'http://127.0.0.1:17842' + path,
        data=None if data is None else json.dumps(data).encode(), method=method,
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
    display = 1964
    env['DISPLAY'] = '127.0.0.1:' + str(display)
    xvfb = start([str(BINS / 'Xvfb'), ':' + str(display), '-screen', '0', '1200x800x24', '-nolisten', 'unix', '-listen', 'tcp', '-ac'], 'settings-component-xvfb.log')
    time.sleep(2)
    if xvfb.poll() is not None:
        raise RuntimeError('Xvfb failed')
    config = scratch / 'dbus.conf'
    config.write_text('<busconfig><type>session</type><listen>unix:tmpdir=' + str(scratch / 'runtime') + '</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/></policy></busconfig>')
    bus_log = (EVIDENCE / 'settings-component-dbus.log').open('w')
    logs.append(bus_log)
    bus = subprocess.Popen([str(BINS / 'dbus-daemon'), '--nofork', '--print-address=1', '--config-file=' + str(config)], env=env, stdout=subprocess.PIPE, stderr=bus_log, text=True)
    processes.append(bus)
    if not select.select([bus.stdout], [], [], 5)[0]:
        raise RuntimeError('D-Bus failed')
    env['DBUS_SESSION_BUS_ADDRESS'] = bus.stdout.readline().strip()
    start([str(BINS / 'WebKitWebDriver'), '--port=17842'], 'settings-component-webdriver.log')
    start([str(BINS / 'python3'), '-m', 'http.server', '18842', '--bind', '127.0.0.1', '--directory', str(FIXTURE)], 'settings-component-http.log')
    time.sleep(1)
    response = api('POST', '/session', {'capabilities': {'alwaysMatch': {'webkitgtk:browserOptions': {'binary': str(APP), 'args': ['--automation']}}}})
    session = response['value']['Links']['sessionId'] if 'Links' in response.get('value', {}) else response['value']['sessionId']
    prefix = '/session/' + session
    api('POST', prefix + '/url', {'url': 'http://127.0.0.1:18842/'})
    time.sleep(1)

    def js(script, args=None):
        return api('POST', prefix + '/execute/sync', {'script': script, 'args': args or []})['value']

    def render(variant='preview', mode='default', locale='en', wait=.3):
        js('window.fixture.render(arguments[0])', [{'variant': variant, 'mode': mode, 'locale': locale}])
        time.sleep(wait)

    def resize(width, height):
        api('POST', prefix + '/window/rect', {'width': width, 'height': height})
        time.sleep(.2)
        actual = js('return [innerWidth,innerHeight]')
        rect = api('GET', prefix + '/window/rect')['value']
        api('POST', prefix + '/window/rect', {'width': rect['width'] + width - actual[0], 'height': rect['height'] + height - actual[1]})
        time.sleep(.2)

    def markup():
        return js('return document.getElementById("root").innerHTML')

    def clear_calls():
        js('window.fixture.calls=[]')

    def calls():
        return js('return window.fixture.calls')

    def click_matching(selector, text):
        value = js("const e=[...document.querySelectorAll(arguments[0])].find(x=>x.textContent.trim()===arguments[1]||x.textContent.includes(arguments[1]));if(!e)return false;e.click();return true", [selector, text])
        time.sleep(.15)
        return value

    def set_input(selector, value, event='input'):
        value_set = js("const e=document.querySelector(arguments[0]);if(!e)return false;const p=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,arguments[1]);e.dispatchEvent(new Event(arguments[2],{bubbles:true}));return true", [selector, value, event])
        time.sleep(.2)
        return value_set

    def stable_compare(name, mode='default', action=None, wait=.35):
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

    comparison_modes = [
        ('default', 'default'), ('appearance', 'appearance'),
        ('monitoring-cached', 'monitoring-cached'), ('monitoring-error', 'monitoring-error'),
        ('scanner-idle', 'scanner-idle'), ('scanner-waiting', 'scanner-waiting'),
        ('scanner-active', 'scanner-active'), ('scanner-stale', 'scanner-stale_offset'),
        ('long-paths', 'paths'), ('manual-monitor', 'manual-monitor'),
        ('wfm-token', 'wfm-token'), ('price-loading', 'price-loading'),
        ('updater-idle', 'update-idle'), ('updater-checking', 'update-checking'),
        ('updater-available', 'update-available'), ('updater-current', 'update-up-to-date'),
        ('updater-installing', 'update-installing'), ('updater-error', 'update-error'),
    ]
    for name, mode in comparison_modes:
        stable_compare(name, mode)
    stable_compare('guide-modal', action=lambda: click_matching('button', 'Feature Guide'))
    stable_compare('bug-modal', action=lambda: click_matching('button', 'Report Issue'))
    check('stable-has-no-preview-shell', not js("return !!document.querySelector('[data-preview-settings-shell]')"))

    def parity(name, action, mode='default', wait=.35):
        render('before', mode); clear_calls(); action(); time.sleep(wait); before_calls = calls(); before_settings = js('return window.fixture.settings')
        render('stable', mode); clear_calls(); action(); time.sleep(wait); after_calls = calls(); after_settings = js('return window.fixture.settings')
        passed = before_calls == after_calls and before_settings == after_settings
        result['stable_interaction_parity'].append({'interaction': name, 'before_calls': before_calls, 'after_calls': after_calls, 'settings_equal': before_settings == after_settings, 'pass': passed})
        check('stable-' + name + '-side-effect-parity', passed, {'before': before_calls, 'after': after_calls})

    parity('theme', lambda: js("document.querySelector('[data-theme=\"high-contrast\"]')?.click()"))
    parity('cursor', lambda: click_matching('button', 'retro'))
    parity('cursor-tint', lambda: js("document.querySelector('input[type=checkbox]')?.click()"))
    parity('notification-position', lambda: click_matching('button', 'left'))
    parity('notification-sound', lambda: click_matching('button', js("return window.fixture.t('settings.sound_2')")))
    parity('manual-refresh', lambda: js("document.querySelector('[title=\"'+window.fixture.t('settings.manual_refresh')+'\"]')?.click()"))
    parity('monitoring-toggle', lambda: js("document.querySelector('[data-fixture-notifications]')?.closest('.glass-panel')?.querySelectorAll('button[role=switch]')[0]?.click()"))
    parity('scanner-toggle', lambda: js("document.querySelector('[data-fixture-notifications]')?.closest('.glass-panel')?.querySelectorAll('button[role=switch]')[1]?.click()"))
    parity('cache-picker', lambda: click_matching('button', js("return window.fixture.t('ui.setup.browse')")))
    parity('sidebar-side', lambda: click_matching('button', js("return window.fixture.t('settings.side_right')")))
    parity('sidebar-width', lambda: click_matching('button', js("return window.fixture.t('settings.width_wide')")))
    parity('sidebar-focus', lambda: js("document.querySelector('#preview-settings-sidebar')?.querySelector('button[role=switch]')?.click()") or js("[...document.querySelectorAll('h2')].find(e=>e.textContent===window.fixture.t('settings.sidebar'))?.closest('.glass-panel')?.querySelector('button[role=switch]')?.click()"))
    parity('hotkey-add', lambda: click_matching('button', js("return window.fixture.t('settings.add_shortcut')")))
    parity('safe-mode', lambda: js("[...document.querySelectorAll('h2')].find(e=>e.textContent===window.fixture.t('settings.safe_mode_tracking'))?.closest('.glass-panel')?.querySelector('button[role=switch]')?.click()"))
    parity('wfm-token', lambda: set_input('input[type=password]', 'SYNTHETIC-NEW-TOKEN'))
    parity('price-refresh', lambda: click_matching('button', js("return window.fixture.t('settings.refresh_prices_button')")))
    parity('update-check', lambda: click_matching('button', js("return window.fixture.t('settings.btn_check_updates')")), mode='update-idle')
    parity('coverage-export', lambda: click_matching('button', js("return window.fixture.t('settings.acquisition_coverage_button')")), wait=.8)
    parity('locale-change', lambda: (js('window.fixture.blockLocale=true'), set_input('select[aria-label="Game language"]', 'de', 'change')))

    render('preview')
    check('preview-section-notice', 'Live monitoring' in (js("return document.querySelector('[data-preview-settings-shell] [role=status]')?.textContent") or ''))
    section_labels = js("return [...document.querySelectorAll('nav[aria-label=\"Settings sections\"] a')].map(e=>e.textContent.trim())")
    section_targets = js("return [...document.querySelectorAll('nav[aria-label=\"Settings sections\"] a')].map(e=>e.getAttribute('href'))")
    expected_labels = [js("return window.fixture.t('settings.theme')"), js("return window.fixture.t('settings.notifications')"), js("return window.fixture.t('game_language')"), js("return window.fixture.t('settings.help_diagnostics')"), js("return window.fixture.t('settings.sidebar')"), js("return window.fixture.t('settings.global_hotkeys')"), js("return window.fixture.t('settings.safe_mode_tracking')"), 'Warframe.Market', js("return window.fixture.t('settings.updates')")]
    check('preview-nine-source-derived-section-links', section_labels == expected_labels, section_labels)
    check('preview-section-targets-exist', all(js('return !!document.querySelector(arguments[0])', [target]) for target in section_targets), section_targets)
    disabled = js("return [...document.querySelectorAll('[data-preview-settings-disabled]')].map(e=>({reason:e.getAttribute('aria-label'),disabled:e.disabled,controls:[...e.querySelectorAll('button,input,select')].length}))")
    check('preview-five-disabled-live-groups', len(disabled) == 5 and all(row['disabled'] and row['controls'] > 0 for row in disabled), disabled)

    clear_calls()
    js("document.querySelectorAll('[data-preview-settings-disabled]').forEach(e=>e.disabled=false)")
    js("document.querySelectorAll('[data-preview-settings-disabled] button').forEach(e=>e.click())")
    js("const s=document.querySelector('#preview-settings-hotkeys select');if(s){s.value='toggle_sidebar';s.dispatchEvent(new Event('change',{bubbles:true}))}")
    js("const p=document.querySelector('#preview-settings-safe-mode input[type=text]');if(p){p.value='/synthetic/new/EE.log';p.dispatchEvent(new Event('input',{bubbles:true}))}")
    time.sleep(.9)
    preview_attempt_calls = calls()
    unavailable_names = {'startMonitoring', 'stopMonitoring', 'setAutoStart', 'start_log_scanner', 'stop_log_scanner', 'set_hotkeys', 'play_notification_sound', 'show_notification', 'relay_event'}
    unavailable = [row for row in preview_attempt_calls if row['command'] in unavailable_names or (row['command'] == 'setSetting' and row.get('args', {}).get('key') in {'fissure_overlay_enabled', 'use_ee_log', 'ee_log_path', 'hotkeys'})]
    result['preview_unavailable_invocations'] = unavailable
    result['preview_relay_event_invocations'] = [row for row in preview_attempt_calls if row['command'] == 'relay_event']
    result['preview_stop_log_scanner_invocations'] = [row for row in preview_attempt_calls if row['command'] == 'stop_log_scanner']
    check('preview-zero-unavailable-live-invocations', unavailable == [], unavailable)
    check('preview-zero-relay-event-invocations', result['preview_relay_event_invocations'] == [], result['preview_relay_event_invocations'])
    check('preview-zero-stop-log-scanner-invocations', result['preview_stop_log_scanner_invocations'] == [], result['preview_stop_log_scanner_invocations'])

    render('preview'); clear_calls(); click_matching('button', js("return window.fixture.t('settings.sound_2')")); time.sleep(.2)
    sound_calls = calls()
    check('preview-sound-preference-without-live-preview', any(row['command'] == 'setSetting' and row['args']['key'] == 'notif_sound' for row in sound_calls) and any(row['command'] == 'set_notification_sound' for row in sound_calls) and not any(row['command'] == 'play_notification_sound' for row in sound_calls), sound_calls)
    render('preview'); clear_calls(); click_matching('button', js("return window.fixture.t('settings.acquisition_coverage_button')")); time.sleep(.8)
    coverage_calls = calls()
    check('preview-coverage-export-without-notification', any(row['command'] == 'write_file' for row in coverage_calls) and not any(row['command'] == 'show_notification' for row in coverage_calls), coverage_calls)
    check('preview-updater-disabled-message', 'Application updates are disabled in Preview.' in js('return document.body.innerText'))
    updater = js("return {button:[...document.querySelectorAll('button')].find(e=>e.textContent.includes(window.fixture.t('settings.btn_check_updates')))?.disabled,startup:[...document.querySelectorAll('button[role=switch]')].some(e=>e.textContent.includes(window.fixture.t('settings.check_on_startup')))}")
    check('preview-updater-button-disabled-and-startup-toggle-absent', updater == {'button': True, 'startup': False}, updater)

    for width, height in ((1200, 800), (900, 500)):
        resize(width, height); render('preview')
        geometry = js("const shell=document.querySelector('[data-preview-settings-shell]');const cards=[...document.querySelectorAll('[data-preview-settings-section]')];const rail=document.querySelector('nav[aria-label=\"Settings sections\"]');const grids=Object.fromEntries([...document.querySelectorAll('[data-preview-settings-grid]')].map(e=>[e.dataset.previewSettingsGrid,getComputedStyle(e).gridTemplateColumns.split(' ').length]));return {viewport:[innerWidth,innerHeight],body:{client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth},shell:{left:shell.getBoundingClientRect().left,right:shell.getBoundingClientRect().right},cardsWithin:cards.every(e=>e.getBoundingClientRect().left>=shell.getBoundingClientRect().left-1&&e.getBoundingClientRect().right<=shell.getBoundingClientRect().right+1),rail:{client:rail.clientWidth,scroll:rail.scrollWidth},grids,disabled:[...document.querySelectorAll('[data-preview-settings-disabled]')].every(e=>e.disabled)}")
        geometry['requested'] = [width, height]
        result['geometry'].append(geometry)
        check(f'preview-{width}x{height}-no-page-horizontal-overflow', geometry['body']['client'] == geometry['body']['scroll'], geometry)
        check(f'preview-{width}x{height}-cards-contained', geometry['cardsWithin'], geometry)
        check(f'preview-{width}x{height}-section-rail-contained', geometry['rail']['client'] <= geometry['rail']['scroll'], geometry['rail'])
        check(f'preview-{width}x{height}-disabled-state-persists', geometry['disabled'])
    narrow = result['geometry'][-1]
    check('preview-narrow-container-layout', narrow['grids'].get('notification-preferences') == 1 and narrow['grids'].get('monitoring') == 1 and narrow['grids'].get('maintenance') == 1, narrow['grids'])

    render('preview', locale='de')
    german_labels = js("return [...document.querySelectorAll('nav[aria-label=\"Settings sections\"] a')].map(e=>e.textContent.trim())")
    check('preview-german-section-labels-from-real-locale', german_labels[0] == js("return window.fixture.t('settings.theme')") and german_labels[1] == js("return window.fixture.t('settings.notifications')"), german_labels)
    errors = js('return window.fixture.errors')
    check('no-browser-errors', errors == [], errors)

    result['summary'] = {
        'total': len(result['checks']), 'passed': sum(row['pass'] for row in result['checks']),
        'stable_exact_markup': len(result['stable_comparisons']),
        'stable_interaction_parity': len(result['stable_interaction_parity']),
        'preview_unavailable_invocation_count': len(result['preview_unavailable_invocations']),
        'preview_relay_event_invocation_count': len(result['preview_relay_event_invocations']),
        'preview_stop_log_scanner_invocation_count': len(result['preview_stop_log_scanner_invocations']),
    }
    OUTPUT.write_text(json.dumps(result, indent=2) + '\n')
    if result['summary']['passed'] != result['summary']['total']:
        raise RuntimeError(result['summary'])
finally:
    if 'session' in locals():
        try:
            api('DELETE', prefix)
        except Exception:
            pass
    for group in groups:
        try:
            os.killpg(group, signal.SIGTERM)
        except ProcessLookupError:
            pass
    for process in processes:
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
    for log in logs:
        log.close()

print(json.dumps(result['summary'], indent=2))
