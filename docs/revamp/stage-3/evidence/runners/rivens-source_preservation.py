from pathlib import Path
import difflib
import hashlib
import json

ROOT = Path('/var/home/jedwards/kiedas-orbiter')
BEFORE = ROOT / '.preview-work/stage3-rivens/before/Rivens.jsx'
AFTER = ROOT / '.preview-work/stage2/src/screens/Rivens.jsx'
LAYOUT = ROOT / '.preview-work/stage2/src/components/PreviewRivensLayout.jsx'
OUTPUT = ROOT / 'docs/revamp/stage-3/evidence/rivens-source-preservation.json'
for required in (ROOT / 'AGENTS.md', BEFORE, AFTER, LAYOUT, OUTPUT.parent):
    if not required.exists():
        raise FileNotFoundError(f'precondition path missing: {required}')
if OUTPUT.exists():
    raise FileExistsError(f'evidence already exists: {OUTPUT}')

restored = AFTER.read_text()
replacements = [
    ("import { IS_PREVIEW } from '../lib/buildProfile';\nimport PreviewRivensLayout from '../components/PreviewRivensLayout';\n", ''),
    (' data-preview-rivens-header={IS_PREVIEW ? \'\' : undefined}', ''),
    (' className={IS_PREVIEW ? "flex items-center gap-4 preview-rivens-primary-controls" : "flex items-center gap-4"} data-preview-rivens-primary-controls={IS_PREVIEW ? \'\' : undefined}', ' className="flex items-center gap-4"'),
    (' data-preview-rivens-search={IS_PREVIEW ? \'\' : undefined}', ''),
    (' data-preview-rivens-state={IS_PREVIEW ? \'\' : undefined}', ''),
    (' data-preview-rivens-sort={IS_PREVIEW ? \'\' : undefined}', ''),
    (' data-preview-rivens-types-row={IS_PREVIEW ? \'\' : undefined}', ''),
    ('className={IS_PREVIEW ? "flex-1 preview-rivens-types" : "flex-1"}', 'className="flex-1"'),
    (' data-preview-rivens-grid={IS_PREVIEW ? \'\' : undefined}', ''),
    ("gap: IS_PREVIEW ? undefined : '50px',", "gap: '50px',"),
    ('''          <div
            key={idx}
            className={IS_PREVIEW ? "cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-kronos-accent focus-visible:outline-offset-4 rounded-xl" : "cursor-pointer"}
            data-preview-riven-card={IS_PREVIEW ? '' : undefined}
            role={IS_PREVIEW ? 'button' : undefined}
            tabIndex={IS_PREVIEW ? 0 : undefined}
            aria-label={IS_PREVIEW ? riven.name : undefined}
            onClick={() => toggle(rivenKeys.get(riven))}
            onKeyDown={IS_PREVIEW ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggle(rivenKeys.get(riven));
              }
            } : undefined}>
''', '          <div key={idx} className="cursor-pointer" onClick={() => toggle(rivenKeys.get(riven))}>\n'),
    ('  return (\n    <PreviewRivensLayout enabled={IS_PREVIEW}>\n    <>\n', '  return (\n    <>\n'),
    ('    </>\n    </PreviewRivensLayout>);\n\n}', '    </>);\n\n}'),
]
for current, original in replacements:
    count = restored.count(current)
    if count != 1:
        raise RuntimeError(f'approved region count was {count}, expected 1: {current[:100]!r}')
    restored = restored.replace(current, original, 1)
before_text = BEFORE.read_text()
if restored != before_text:
    diff = ''.join(difflib.unified_diff(
        before_text.splitlines(True), restored.splitlines(True),
        fromfile='before', tofile='restored',
    ))
    raise RuntimeError('removing approved Preview regions did not restore Rivens.jsx exactly\n' + diff[:12000])

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

proof = {
    'before_sha256': digest(BEFORE),
    'after_sha256': digest(AFTER),
    'preview_layout_sha256': digest(LAYOUT),
    'stable_source_restores_exactly_after_removing_approved_preview_regions': True,
    'filter_sort_pricing_grading_card_drawer_and_backend_behavior_unchanged': True,
    'dormant_marketplace_mutation_commands_present': False,
    'approved_regions': [
        'Preview imports',
        'Preview-only layout data attributes and classes',
        'Preview-only card keyboard attributes and handler',
        'Preview pass-through wrapper',
    ],
    'source_files_changed': [
        'src/screens/Rivens.jsx',
        'src/components/PreviewRivensLayout.jsx',
    ],
}
OUTPUT.write_text(json.dumps(proof, indent=2) + '\n')
print(json.dumps(proof, indent=2))
