"""Reconstructed from the executed Ubuntu test commands after review.

Not rerun when this file was saved. Default reproduces the readable-mount retry;
--original-mount reproduces the initial SELinux-blocked attempt. Run from repo root.
The container is disposable, offline, and mounts only the package directory read-only.
Inspect INSTALL_EXIT/REMOVE_EXIT/EXECUTABLE_ABSENT_EXIT in the log: the shell's final
printf can exit zero despite an installation failure.
"""
import argparse
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--original-mount', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[4]
packages = list((root / '.preview-work/stage2/src-tauri/target/debug/bundle/deb').glob('*.deb'))
if len(packages) != 1:
    raise SystemExit('Expected exactly one debug Debian package; inspect the directory first.')
package = packages[0]
command = ['flatpak-spawn', '--host', 'podman', 'run', '--rm']
if not args.original_mount:
    command += ['--security-opt', 'label=disable']
command += [
    '--network=none', '--cpus=4', '--memory=2g',
    '--volume', str(package.parent) + ':/preview-package:ro',
    'docker.io/library/ubuntu:24.04', 'sh', '-c',
    '''dpkg -i "$1"; install_status=$?
dpkg-query -W -f='${Status}\\n' kieda-s-orbiter-preview
ldd /usr/bin/kiedas-orbiter-preview
dpkg --remove kieda-s-orbiter-preview; remove_status=$?
test ! -e /usr/bin/kiedas-orbiter-preview; absent_status=$?
printf "INSTALL_EXIT=%s REMOVE_EXIT=%s EXECUTABLE_ABSENT_EXIT=%s\\n" "$install_status" "$remove_status" "$absent_status"
''',
    'preview-test', '/preview-package/' + package.name,
]
# Preserve reviewed logs; any replay writes to a separate file.
log_path = Path(__file__).with_name(
    'ubuntu-package-mount-replay.log' if args.original_mount else 'ubuntu-package-install-replay.log'
)
with log_path.open('w') as log:
    result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
print('Harness exit:', result.returncode, 'Log:', log_path)
raise SystemExit(result.returncode)
