from pathlib import Path
import json

ROOT = Path('/var/home/jedwards/kiedas-orbiter')
EVIDENCE = ROOT / 'docs/revamp/stage-3/evidence'
CURRENT = EVIDENCE / 'cosmetics-deb-packaged-smoke.json'
PRESERVED = EVIDENCE / 'misnamed-stage3f-rivens-deb-packaged-smoke.json'
LOG = EVIDENCE / 'cosmetics-deb-packaged-smoke.log'
for required in (ROOT / 'AGENTS.md', CURRENT, LOG):
    if not required.exists():
        raise FileNotFoundError(f'precondition path missing: {required}')
if PRESERVED.exists():
    raise FileExistsError(f'preserved output already exists: {PRESERVED}')
current_data = json.loads(CURRENT.read_text())
if 'rivens_checks' not in current_data:
    raise RuntimeError('current Cosmetics filename does not contain the misnamed Rivens run')
text = LOG.read_text().strip()
original_text = text
original_data = json.loads(original_text)
if 'cosmetics_checks' not in original_data or 'rivens_checks' in original_data:
    raise RuntimeError('preserved Stage 3E container log does not contain the expected Cosmetics result')
CURRENT.rename(PRESERVED)
CURRENT.write_text(json.dumps(original_data, indent=2) + '\n')
print(json.dumps({
    'misnamed_stage3f_preserved': str(PRESERVED),
    'stage3e_restored': str(CURRENT),
    'stage3e_checks': len(original_data['cosmetics_checks']),
}, indent=2))
