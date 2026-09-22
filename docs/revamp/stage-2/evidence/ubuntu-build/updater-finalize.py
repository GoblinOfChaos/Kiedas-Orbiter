from pathlib import Path
import json,hashlib,shutil,subprocess,datetime,os
os.nice(19)
r=Path('/var/home/jedwards/kiedas-orbiter');d=r/'docs/revamp/stage-2';e=d/'evidence';s=r/'.preview-work/stage2';b=r/'.preview-work/ubuntu-build'
summary={'timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'packages':[]}
for variant in ['deb','appimage']:
 x=json.loads((e/('updater-'+variant+'-packaged-smoke.json')).read_text());assert not x.get('error'),x.get('error')
 groups=['checks','guard_checks','market_guards','dialog_checks','updater_ui_checks'];checks=[v for k in groups for v in x[k]];assert all(v['pass'] is True for v in checks)
 assert x['bundle_fallback_check']['resolved'] and x['bundle_fallback_check']['matches_installed_bytes']
 summary['packages'].append({'package':variant,'binary_sha256':x['binary_sha256'],'checks':len(checks),'passed':sum(v['pass'] for v in checks),'group_counts':{k:len(x[k]) for k in groups},'bundle_fallback':x['bundle_fallback_check']})
render=json.loads((e/'updater-render.json').read_text());assert all(v['pass'] for v in render['checks']);summary['render_checks']=len(render['checks'])
(e/'updater-validation-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
for name in ['implementation.patch','implementation.json','CURRENT-ACCEPTANCE.md','ISOLATION-LEDGER.md','STAGE-2-REMAINING.md']:
 shutil.copy2(d/name,d/('before-updater-completion-'+name))
patch=subprocess.check_output(['git','diff','--binary','f30ea7e9f7fe1f12406257018a2a8cff8c21158d'],cwd=s);(d/'implementation.patch').write_bytes(patch)
j=json.loads((d/'implementation.json').read_text());j['patch_sha256']=hashlib.sha256(patch).hexdigest();j['gate']='HELD: approved updater UI fix rebuilt and tested; see CURRENT-ACCEPTANCE.md';j['uncommitted_changes']=sorted(set(j['uncommitted_changes']+['src/screens/Settings.jsx']));(d/'implementation.json').write_text(json.dumps(j,indent=2)+'\n')
shutil.copy2(e/'updater-release-artifacts.json',e/'release-artifacts.json')
p=d/'CURRENT-ACCEPTANCE.md';t=p.read_text();start=t.index('## Pending app-source approval');end=t.index('## Completed follow-up work',start);t=t[:start]+t[end:];t=t.replace('## Completed follow-up work\n','## Completed follow-up work\n\n- [UPDATER-UI-IMPLEMENTATION.md](UPDATER-UI-IMPLEMENTATION.md): approved disabled-state Settings correction; 16 rendering checks; rebuilt Debian/AppImage each pass 26 native checks plus resource fallback.\n');t=t.replace('Exhaustive request tracing and cached-manifest UI case not completed.','Exhaustive request tracing remains open; supplied stale-manifest rendering is tested separately, not a persisted-cache or native provider injection test.');t=t.replace('same artifacts as exit-release-artifacts.json','same artifacts as updater-release-artifacts.json').replace('evidence/upgrade-keyboard-baseline-check.json','evidence/updater-baseline-check.json');p.write_text(t)
p=d/'ISOLATION-LEDGER.md';t=p.read_text().replace('| Updater | Plugin/config omission; custom updater command rejects | Request tracing/cached manifest UI incomplete |','| Updater | Plugin/config omission; custom updater command rejects; disabled Settings controls native-tested; stale supplied manifest cannot expose install in JSX rendering test | Exhaustive request tracing and native provider stale-state injection not performed; no persisted manifest read found in reviewed provider |');p.write_text(t)
p=d/'STAGE-2-REMAINING.md';t=p.read_text();t+='\nUpdater UI follow-up: UPDATER-UI-IMPLEMENTATION.md records the approved fix, rebuilt packages and supplied stale-manifest JSX rendering coverage. This does not establish exhaustive request tracing or a persisted-cache/native provider injection test.\n';p.write_text(t)
p=d/'UPDATER-DISABLED-UI-REVIEW.md';t=p.read_text();p.write_text('> Historical proposal: approved and implemented. See [UPDATER-UI-IMPLEMENTATION.md](UPDATER-UI-IMPLEMENTATION.md) for current results. The original review below is retained.\n\n'+t)
(d/'UPDATER-UI-IMPLEMENTATION.md').write_text('''# Approved Preview updater UI correction

The approved patch is applied only in the isolated checkout's `src/screens/Settings.jsx`. Settings now displays “Application updates are disabled in Preview.”, disables/restyles Check, and omits the startup-check toggle when the provider reports disabled. The provider, native guards, dependencies and lockfile were not changed.

## Validation

- Stable and Preview Vite builds passed; Ubuntu offline release rebuild and Debian/AppImage bundling passed. CPU affinity/container limits are four; all Cargo work sets CARGO_BUILD_JOBS=4 and runs with nice 19.
- **16 rendering checks passed**: the actual updater JSX subtree is extracted from prepatch/current Settings and rendered with React's server renderer. Six existing stable states × two startup-toggle values give 12 identical-markup comparisons. Four disabled-state assertions cover message, disabled Check, absent startup toggle and no install action/release notes even when a synthetic manifest is supplied. Icon/Toggle dependencies are mocked; this is subtree rendering, not full-screen stable runtime or native cache injection. The prepatch fixture hash matches the proposal's recorded Settings hash.
- **26 native checks passed for each rebuilt package**: 10 baseline/title/navigation/dialog-focus checks + five integration/updater guards + four market guards + four dialog layouts + three updater UI checks. The latter cover visible message/disabled Check/absent startup toggle and install action at 1200×800 and 900×500, then disabled state after reload. Bundled-resource fallback passes separately. These reuse the private networkless Xvfb/D-Bus and synthetic-profile harness; AppImage uses extraction mode.
- `evidence/updater-validation-summary.json` records counts and executed-binary hashes. `evidence/updater-release-artifacts.json` records the unbundled binary and both package hashes; the installed binary can legitimately differ after bundling.
- `evidence/updater-baseline-check.json` verifies 850 original tracked files unchanged, unchanged application Cargo.lock, Settings before/after hashes and clean isolated diff whitespace check.

## Reproducibility and preserved evidence

The old packages remain in `.preview-work/ubuntu-build/before-updater-ui-packages/`; their original manifest is `evidence/before-updater-ui-release-artifacts.json`. Previous implementation/acceptance documents are preserved with `before-updater-completion-` prefixes. Updated cumulative implementation.patch and implementation.json include this approved Settings change.

Reusable runners are copied to `evidence/ubuntu-build/updater-*`. Frontend logs are updater-frontend-production.log and updater-frontend-preview.log; native logs are updater-native-build.log and updater-native-bundle.log; package runners/logs use updater-deb/updater-appimage prefixes. Both earlier exit-status package results remain untouched.

Two test-only setup errors were fixed without dependency changes: direct esbuild resolution failed because it belongs to Vite's dependency tree, so resolution now starts from Vite's real location; the container lacks git, so the prepatch Settings fixture is exported from the isolated checkout before execution. Failures are preserved in before-transformer-fix-updater-render.log and before-git-fixture-fix-updater-render.log. The first is a recorded reproduction of the initial failure. These were fixture errors, not app failures.

## Remaining scope

Stage 2 remains HELD; Stage 3 has not started. This change does not rerun prior crash-recovery/import/upgrade matrices, whose implementation is untouched. Windows/macOS, published-release version upgrades, native OS-directory failure/stable migration regressions, exhaustive startup/request tracing, FUSE/other desktop environments and the other named coverage limits remain as recorded in CURRENT-ACCEPTANCE.md. No live account/game data, host app installation, publishing or signing was involved. No artwork was added.
''')
print(json.dumps(summary,indent=2))
