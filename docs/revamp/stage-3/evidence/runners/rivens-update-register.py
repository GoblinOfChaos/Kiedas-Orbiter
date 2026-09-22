from pathlib import Path
import json

path = Path('/var/home/jedwards/kiedas-orbiter/docs/revamp/stage-3/rivens-source-register.json')
if not path.exists():
    raise FileNotFoundError(path)
data = json.loads(path.read_text())
if data.get('status') != 'implemented_awaiting_acceptance':
    raise RuntimeError('unexpected Stage 3F register status')
data['stage3f_app_source_started'] = True
data['stage3g_app_source_started'] = False
path.write_text(json.dumps(data, indent=2) + '\n')
