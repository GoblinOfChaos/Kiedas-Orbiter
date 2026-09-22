from pathlib import Path
import json

ROOT = Path('/var/home/jedwards/kiedas-orbiter')
EVIDENCE = ROOT / 'docs/revamp/stage-3/evidence'
CURRENT = EVIDENCE / 'cosmetics-deb-packaged-smoke.json'
LOG = EVIDENCE / 'cosmetics-deb-packaged-smoke.log'
MISNAMED = EVIDENCE / 'misnamed-stage3f-rivens-deb-packaged-smoke.json'
OUTPUT = EVIDENCE / 'rivens-evidence-integrity.json'
for required in (ROOT / 'AGENTS.md', CURRENT, LOG, MISNAMED, EVIDENCE):
    if not required.exists():
        raise FileNotFoundError(f'precondition path missing: {required}')
if OUTPUT.exists():
    raise FileExistsError(f'evidence already exists: {OUTPUT}')
disclosure = {
    'accepted_stage3e_primary_json_restored_from_verbatim_log': json.loads(CURRENT.read_text()) == json.loads(LOG.read_text()),
    'accepted_stage3e_inner_logs_overwritten_by_first_misnamed_stage3f_debian_run': [
        'cosmetics-deb-equipped-install.log',
        'cosmetics-deb-equipped-remove.log',
        'cosmetics-deb-packaged-dbus.log',
        'cosmetics-deb-packaged-webdriver.log',
        'cosmetics-deb-packaged-xvfb.log',
    ],
    'original_stage3e_inner_log_bytes_recoverable': False,
    'misnamed_stage3f_result_preserved': str(MISNAMED),
    'failed_and_incomplete_runs_preserved_with_before_prefix': True,
    'stage3e_appimage_evidence_overwritten': False,
}
OUTPUT.write_text(json.dumps(disclosure, indent=2) + '\n')
print(json.dumps(disclosure, indent=2))
