import os, pathlib, subprocess, time, socket, fcntl, struct, json, urllib.request, urllib.error, hashlib, shutil, signal
base=pathlib.Path('/var/home/jedwards/kiedas-orbiter/.preview-work'); evidence=base.parent/'docs/revamp/stage-2/evidence'
os.sched_setaffinity(0, sorted(os.sched_getaffinity(0))[:4]); os.nice(19)
# The caller creates a PRIVATE network namespace. Enable its loopback only.
# Podman --network=none supplies an isolated loopback interface.
import tempfile
scratch=pathlib.Path(tempfile.mkdtemp(prefix='native-smoke-',dir=base))
for name in ['runtime','xdgdata','config','cache','legacy/data/user']:(scratch/name).mkdir(parents=True,exist_ok=True)
(scratch/'runtime').chmod(0o700)
legacy=scratch/'legacy/data/user';sentinel=b'{"wfm_token":"SYNTHETIC-DO-NOT-IMPORT","autoStartMonitoring":true}'
(legacy/'settings.json').write_bytes(sentinel);(legacy/'sentinel.txt').write_text('synthetic legacy marker')
package=next((base/'ubuntu-build/target/release/bundle/deb').glob('*.deb'))
with open(evidence/'exit-recovery-dialog-equipped-install.log','w') as log:
 subprocess.run(['dpkg','-i',str(package)],stdout=log,stderr=subprocess.STDOUT,check=True)
binary=pathlib.Path('/usr/bin/kiedas-orbiter-preview')
# Copy executable beside synthetic legacy data so legacy discovery tests a real executable parent.
app=binary
lib=pathlib.Path('/usr/lib/x86_64-linux-gnu'); bins=pathlib.Path('/usr/bin')
env=os.environ.copy();env.update(XDG_DATA_HOME=str(scratch/'xdgdata'),XDG_CONFIG_HOME=str(scratch/'config'),XDG_CACHE_HOME=str(scratch/'cache'),XDG_RUNTIME_DIR=str(scratch/'runtime'),LD_LIBRARY_PATH=str(lib),PATH=str(bins)+':'+env.get('PATH',''),XKB_BINDIR=str(bins),TAURI_WEBVIEW_AUTOMATION='true',WEBKIT_DISABLE_DMABUF_RENDERER='1',LIBGL_ALWAYS_SOFTWARE='1',LP_NUM_THREADS='2',OMP_NUM_THREADS='2',DBUS_SYSTEM_BUS_ADDRESS='unix:path='+str(scratch/'no-system-bus'))
env.pop('DBUS_SESSION_BUS_ADDRESS',None);env.pop('WAYLAND_DISPLAY',None)
processes=[]; process_groups=set(); logs=[];results={'binary_sha256':hashlib.sha256(binary.read_bytes()).hexdigest(),'private_container_network':True,'installed_package':str(package),'legacy_adjacency_test':False,'synthetic_profile':str(scratch),'checks':[]}
def start(args,name,**kwargs):
 log=open(evidence/name,'w');logs.append(log);p=subprocess.Popen(args,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True,**kwargs);processes.append(p);process_groups.add(p.pid);return p
def api(method,path,data=None):
 req=urllib.request.Request('http://127.0.0.1:17777'+path,data=None if data is None else json.dumps(data).encode(),method=method,headers={'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=45) as response:return json.load(response)
 except urllib.error.HTTPError as e:raise RuntimeError(e.read().decode())
blocked_profile=scratch/'xdgdata/kiedas-orbiter-preview/data/user'
blocked_backup=blocked_profile/'preview-import-backup-invalid'
blocked_backup.mkdir(parents=True);(blocked_backup/'journal.json').write_text('{invalid')
try:
 display=1907
 if pathlib.Path('/tmp/.X1907-lock').exists():raise RuntimeError('Test display lock already exists; refusing to reuse it')
 env['DISPLAY']='127.0.0.1:'+str(display)
 xvfb=start([str(bins/'Xvfb'),':'+str(display),'-screen','0','1200x800x24','-nolisten','unix','-listen','tcp','-ac'], 'exit-recovery-dialog-packaged-xvfb.log')
 time.sleep(2)
 if xvfb.poll() is not None:raise RuntimeError('Headless display failed; see exit-recovery-dialog-packaged-xvfb.log')
 conf=scratch/'dbus.conf';conf.write_text('<busconfig><type>session</type><listen>unix:tmpdir='+str(scratch/'runtime')+'</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*"/><allow receive_sender="*"/><allow own="*"/></policy></busconfig>')
 bus=subprocess.Popen([str(bins/'dbus-daemon'),'--nofork','--print-address=1','--config-file='+str(conf)],env=env,stdout=subprocess.PIPE,stderr=open(evidence/'exit-recovery-dialog-packaged-dbus.log','w'),text=True);processes.append(bus)
 import select
 if not select.select([bus.stdout],[],[],5)[0]:raise RuntimeError('Private D-Bus did not start')
 env['DBUS_SESSION_BUS_ADDRESS']=bus.stdout.readline().strip()
 from native_x11 import X11
 app_process=start([str(app)],'exit-recovery-dialog-packaged-webdriver.log')
 x=X11(env['DISPLAY']);title="Kieda's Orbiter Preview recovery blocked";window=x.wait(title)
 results['native_dialog_windows']=x.windows();x.focus(window);x.key(0xff0d)
 code=app_process.wait(timeout=10);x.close()
 results['dialog_checks']={'native_error_title_found':True,'dismissal_exits_nonzero':code==1,'normal_main_window_absent':not any(w['title']=="Kieda's Orbiter Preview" for w in results['native_dialog_windows'])}
 results['native_process_exit']=code
except Exception as e:results['error']=str(e)
finally:
 for p in reversed(processes):
  if p.poll() is None:
   os.killpg(p.pid, signal.SIGTERM) if p.pid in process_groups else p.terminate()
   try:p.wait(timeout=8)
   except subprocess.TimeoutExpired:p.kill();p.wait()
 for f in logs:f.close()
 with open(evidence/'exit-recovery-dialog-equipped-remove.log','w') as log:
  removed=subprocess.run(['dpkg','--remove','kieda-s-orbiter-preview'],stdout=log,stderr=subprocess.STDOUT)
 results['failure_evidence']={'settings_not_loaded_or_created':not (blocked_profile/'settings.json').exists(),'invalid_journal_retained':(blocked_backup/'journal.json').read_text()=='{invalid','error_log_names_backup':str(blocked_backup) in (evidence/'exit-recovery-dialog-packaged-webdriver.log').read_text(),'error_log_reports_recovery_failure':'Preview import recovery failed' in (evidence/'exit-recovery-dialog-packaged-webdriver.log').read_text()}
 results['removal']={'exit':removed.returncode,'executable_absent':not binary.exists(),'synthetic_profile_retained':(scratch/'xdgdata/kiedas-orbiter-preview').exists()}
 (evidence/'exit-recovery-dialog-packaged-smoke.json').write_text(json.dumps(results,indent=2)+'\n')
 print(json.dumps(results,indent=2))
