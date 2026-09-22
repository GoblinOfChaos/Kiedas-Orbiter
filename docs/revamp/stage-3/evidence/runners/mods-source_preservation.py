from pathlib import Path
import hashlib
import json
import difflib
root=Path('/var/home/jedwards/kiedas-orbiter')
before=root/'.preview-work/stage3-mods/before/Mods.jsx'
after=root/'.preview-work/stage2/src/screens/Mods.jsx'
layout=root/'.preview-work/stage2/src/components/PreviewModsLayout.jsx'
old=before.read_text()
restored=after.read_text()
replacements=[
("import { IS_PREVIEW } from '../lib/buildProfile';\nimport PreviewModsLayout from '../components/PreviewModsLayout';\n",''),
(" className=\"flex flex-col gap-4\" data-preview-mods-header={IS_PREVIEW ? '' : undefined}"," className=\"flex flex-col gap-4\""),
(" className=\"flex items-center gap-3 flex-wrap\" data-preview-mods-toolbar={IS_PREVIEW ? '' : undefined}"," className=\"flex items-center gap-3 flex-wrap\""),
(" className=\"relative flex-1 min-w-[200px] group\" data-preview-mods-search={IS_PREVIEW ? '' : undefined}"," className=\"relative flex-1 min-w-[200px] group\""),
(" className=\"flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2\" data-preview-mods-sort={IS_PREVIEW ? '' : undefined}"," className=\"flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2\""),
(" className=\"flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2\" data-preview-mods-filters={IS_PREVIEW ? '' : undefined}"," className=\"flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2\""),
(" className=\"flex items-center gap-3\" data-preview-mods-categories-row={IS_PREVIEW ? '' : undefined}"," className=\"flex items-center gap-3\""),
(" className=\"flex flex-wrap gap-1 p-1 bg-black/20 rounded-xl border border-white/5\" data-preview-mods-categories={IS_PREVIEW ? '' : undefined}"," className=\"flex flex-wrap gap-1 p-1 bg-black/20 rounded-xl border border-white/5\""),
("    <PreviewModsLayout enabled={IS_PREVIEW}>\n",''),
("    </PageLayout>\n    </PreviewModsLayout>","    </PageLayout>"),
("          data-preview-mods-grid={IS_PREVIEW ? '' : undefined}\n",''),
("            onClick={() => toggle(mod.unique_name)}\n            onKeyDown={IS_PREVIEW ? (event) => {\n              if (event.key === 'Enter' || event.key === ' ') {\n                event.preventDefault();\n                toggle(mod.unique_name);\n              }\n            } : undefined}\n            role={IS_PREVIEW ? 'button' : undefined}\n            tabIndex={IS_PREVIEW ? 0 : undefined}\n            aria-label={IS_PREVIEW ? mod.name : undefined}\n            data-preview-mod-card={IS_PREVIEW ? '' : undefined}>","            onClick={() => toggle(mod.unique_name)}>")
]
for find,replacement in replacements:
    if find not in restored:
        raise SystemExit('approved region not found: '+find[:100])
    restored=restored.replace(find,replacement,1)
if restored!=old:
    diff=''.join(difflib.unified_diff(old.splitlines(True),restored.splitlines(True),fromfile='before',tofile='restored'))
    raise SystemExit('restoration mismatch\n'+diff[:10000])
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
proof={'before_sha256':sha(before),'after_sha256':sha(after),'preview_layout_sha256':sha(layout),'stable_source_restores_exactly_after_removing_approved_preview_regions':True,'mods_logic_unchanged':True,'approved_regions':['Preview imports','Preview-only layout data attributes','Preview pass-through wrapper','Preview-only card keyboard semantics'],'source_files_changed':['src/screens/Mods.jsx','src/components/PreviewModsLayout.jsx']}
(root/'docs/revamp/stage-3/evidence/mods-source-preservation.json').write_text(json.dumps(proof,indent=2)+'\n')
print(json.dumps(proof,indent=2))
