from pathlib import Path
import hashlib
import json


ROOT = Path('/var/home/jedwards/kiedas-orbiter')
EVIDENCE = ROOT / 'docs/revamp/stage-3/evidence'
OUTPUT = EVIDENCE / 'relic-planner-evidence-integrity.json'
if not (ROOT / 'AGENTS.md').exists():
    raise FileNotFoundError(ROOT / 'AGENTS.md')
if OUTPUT.exists():
    raise FileExistsError(OUTPUT)

records = [
    ('fixture_import_path', EVIDENCE / 'before-fixture-fix-relic-planner-component-build.log', 'fixture-only source import path failed before browser execution'),
    ('sandbox_host_bus', EVIDENCE / 'before-sandbox-retry-relic-planner-component-container.json', 'sandbox blocked host Podman access; approved bounded-container retry used'),
    ('fixture_assertions', EVIDENCE / 'before-fixture-assertion-fix-relic-planner-component.json', 'fixture-only assertion expectations corrected'),
    ('native_cargo_mount', EVIDENCE / 'before-cargo-path-fix-relic-planner-native-build-container.json', 'first native runner omitted the read-only Rust toolchain mount'),
    ('narrow_geometry_before_approved_css', EVIDENCE / 'before-css-correction-relic-planner-deb-packaged-smoke.json', '58 of 60 packaged checks; two narrow geometry checks motivated the approved CSS correction'),
    ('native_catalog_absent', EVIDENCE / 'before-native-data-injection-relic-planner-deb-packaged-smoke.json', 'clean package profile had no catalog rows for representative selection'),
    ('provider_injection_order', EVIDENCE / 'before-navigation-order-fix-relic-planner-deb-packaged-smoke.json', 'fixture state was injected before navigation and destabilized the prior route'),
    ('provider_relic_shape', EVIDENCE / 'before-provider-shape-fix-relic-planner-deb-packaged-smoke.json', 'array-shaped synthetic relic table conflicted with an existing object-table consumer'),
    ('picker_selected_forma', EVIDENCE / 'before-picker-selector-fix-relic-planner-deb-packaged-smoke.json', '59 of 60; selector chose the intentionally unmatched automatic Forma row'),
]
for _, path, _ in records:
    if not path.exists():
        raise FileNotFoundError(path)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


result = {
    'status': 'failures_preserved',
    'approved_app_source_corrections_after_initial_implementation': [
        'Preview container breakpoint 620px to 600px',
        'Preview panel height clamp adjusted to fit the 900x500 acceptance viewport',
    ],
    'test_tooling_corrections_required_no_app_source_change': 8,
    'records': [
        {
            'name': name,
            'path': str(path),
            'bytes': path.stat().st_size,
            'sha256': digest(path),
            'note': note,
        }
        for name, path, note in records
    ],
    'final_component': {
        'path': str(EVIDENCE / 'relic-planner-component.json'),
        'sha256': digest(EVIDENCE / 'relic-planner-component.json'),
        'checks': '62/62',
    },
    'final_packages': {'debian': '60/60', 'appimage': '60/60'},
}
OUTPUT.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
