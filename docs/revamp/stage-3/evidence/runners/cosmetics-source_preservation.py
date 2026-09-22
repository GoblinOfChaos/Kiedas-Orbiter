from pathlib import Path
import difflib, hashlib, json
root=Path('/var/home/jedwards/kiedas-orbiter')
before=root/'.preview-work/stage3-cosmetics/before/Cosmetics.jsx'
after=root/'.preview-work/stage2/src/screens/Cosmetics.jsx'
layout=root/'.preview-work/stage2/src/components/PreviewCosmeticsLayout.jsx'
old=before.read_text(); restored=after.read_text()
replacements=[
("import { IS_PREVIEW } from '../lib/buildProfile'\nimport PreviewCosmeticsLayout from '../components/PreviewCosmeticsLayout'\n",''),
("      data-preview-cosmetic-card={IS_PREVIEW ? '' : undefined}\n",''),
("    <PreviewCosmeticsLayout enabled={IS_PREVIEW}>\n",''),
(" className=\"mb-4 flex flex-col gap-3\" data-preview-cosmetics-controls={IS_PREVIEW ? '' : undefined}"," className=\"mb-4 flex flex-col gap-3\""),
(" className=\"flex items-center gap-3 flex-wrap\" data-preview-cosmetics-toolbar={IS_PREVIEW ? '' : undefined}"," className=\"flex items-center gap-3 flex-wrap\""),
(" className=\"relative max-w-sm flex-1 min-w-[200px]\" data-preview-cosmetics-search={IS_PREVIEW ? '' : undefined}"," className=\"relative max-w-sm flex-1 min-w-[200px]\""),
(" className=\"flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-9 px-2\" data-preview-cosmetics-sort={IS_PREVIEW ? '' : undefined}"," className=\"flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-9 px-2\""),
("          className={IS_PREVIEW ? 'preview-cosmetics-kind-tabs' : undefined}\n",''),
("          className={IS_PREVIEW ? 'preview-cosmetics-ownership-tabs' : undefined}\n",''),
(" className=\"grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 pb-4\" data-preview-cosmetics-grid={IS_PREVIEW ? '' : undefined}"," className=\"grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 pb-4\""),
("    </PageLayout>\n    </PreviewCosmeticsLayout>","    </PageLayout>"),
]
for find,replacement in replacements:
    if find not in restored: raise SystemExit('approved region not found: '+find[:120])
    restored=restored.replace(find,replacement,1)
if restored!=old:
    diff=''.join(difflib.unified_diff(old.splitlines(True),restored.splitlines(True),fromfile='before',tofile='restored'))
    raise SystemExit('restoration mismatch\n'+diff[:10000])
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
proof={
 'before_sha256':sha(before),'after_sha256':sha(after),'preview_layout_sha256':sha(layout),
 'stable_source_restores_exactly_after_removing_approved_preview_regions':True,
 'catalog_ownership_classifier_image_filter_sort_pagination_acquisition_unchanged':True,
 'approved_regions':['Preview imports','Preview-only layout attributes/classes','Preview pass-through wrapper'],
 'source_files_changed':['src/screens/Cosmetics.jsx','src/components/PreviewCosmeticsLayout.jsx']
}
(root/'docs/revamp/stage-3/evidence/cosmetics-source-preservation.json').write_text(json.dumps(proof,indent=2)+'\n')
print(json.dumps(proof,indent=2))
