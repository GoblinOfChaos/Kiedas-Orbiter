from pathlib import Path
import json
import subprocess
root = Path('/var/home/jedwards/kiedas-orbiter')
command = ['sh', str(root / '.preview-work/stage3-mods/run-package.sh'), 'mods-bundle.py']
result = subprocess.run(command, cwd=root)
out = root / 'docs/revamp/stage-3/evidence/mods-native-bundle-exit.json'
out.write_text(json.dumps({'runner_exit': result.returncode}, indent=2) + '\n')
print(json.dumps({'runner_exit': result.returncode}))
raise SystemExit(result.returncode)
