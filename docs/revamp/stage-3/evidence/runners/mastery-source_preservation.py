from pathlib import Path
import hashlib,json
root=Path('/var/home/jedwards/kiedas-orbiter')
before=root/'.preview-work/stage3-mastery/before/Mastery.jsx'
after=root/'.preview-work/stage2/src/screens/Mastery.jsx'
layout=root/'.preview-work/stage2/src/components/PreviewMasteryLayout.jsx'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
old=before.read_text(); restored=after.read_text()
replacements=[
("import { IS_PREVIEW } from '../lib/buildProfile';\nimport PreviewMasteryLayout from '../components/PreviewMasteryLayout';\n",''),
('const Section = ({ title, items, kind, gridCols =','const Section = ({ title, items, gridCols ='),
('className="space-y-3" data-preview-mastery-section={IS_PREVIEW ? kind : undefined}','className="space-y-3"'),
('className={`grid ${gridCols} gap-2`} data-preview-mastery-grid={IS_PREVIEW ? kind : undefined}','className={`grid ${gridCols} gap-2`}'),
("""        onKeyDown={IS_PREVIEW ? (event) => {\n          if (event.key === 'Enter' || event.key === ' ') {\n            event.preventDefault();\n            setSelectedCategory(item);\n          }\n        } : undefined}\n        role={IS_PREVIEW ? 'button' : undefined}\n        tabIndex={IS_PREVIEW ? 0 : undefined}\n        aria-label={IS_PREVIEW ? `${item.label}: ${item.mastered} / ${item.total}` : undefined}\n        data-preview-mastery-card={IS_PREVIEW ? '' : undefined}\n""",''),
('      <PreviewMasteryLayout enabled={IS_PREVIEW}>\n',''),
('      </PreviewMasteryLayout>\n\n      {/* Detail Modal */}','\n      {/* Detail Modal */}'),
("""          <div\n            data-preview-mastery-rank-state={IS_PREVIEW ? 'ready' : undefined}\n            className="flex flex-col md:flex-row relative overflow-hidden bg-gradient-to-br from-kronos-accent/20 via-kronos-accent/5 to-transparent min-h-[400px]">""",'''          <div className="flex flex-col md:flex-row relative overflow-hidden bg-gradient-to-br from-kronos-accent/20 via-kronos-accent/5 to-transparent min-h-[400px]">'''),
("""              <div\n                data-preview-mastery-art={IS_PREVIEW ? '' : undefined}\n                className="relative w-full md:w-[45%] h-80 md:h-[450px] overflow-visible">""",'''              <div className="relative w-full md:w-[45%] h-80 md:h-[450px] overflow-visible">'''),
("""          <div\n            data-preview-mastery-rank-state={IS_PREVIEW ? 'progress' : undefined}\n            className="bg-gradient-to-br from-kronos-accent/10 via-transparent to-transparent p-6">""",'''          <div className="bg-gradient-to-br from-kronos-accent/10 via-transparent to-transparent p-6">'''),
('items={itemCompletion} kind="items"','items={itemCompletion}'),
('className="grid grid-cols-1 md:grid-cols-2 gap-8" data-preview-mastery-secondary={IS_PREVIEW ? \'\' : undefined}','className="grid grid-cols-1 md:grid-cols-2 gap-8"'),
('items={intrinsicCompletion} kind="intrinsics"','items={intrinsicCompletion}'),
('items={starchartCompletion} kind="starchart"','items={starchartCompletion}'),
("""        role={IS_PREVIEW ? 'dialog' : undefined}\n        aria-modal={IS_PREVIEW ? true : undefined}\n        aria-labelledby={IS_PREVIEW ? 'preview-mastery-dialog-title' : undefined}\n        data-preview-mastery-modal={IS_PREVIEW ? '' : undefined}\n""",''),
("<h3 id={IS_PREVIEW ? 'preview-mastery-dialog-title' : undefined} className=",'<h3 className=')]
for find,repl in replacements:
 if find not in restored:raise SystemExit('approved region not found: '+find[:90])
 restored=restored.replace(find,repl,1)
if restored!=old:
 import difflib
 diff=''.join(difflib.unified_diff(old.splitlines(True),restored.splitlines(True),fromfile='before',tofile='restored'))
 raise SystemExit('restoration mismatch\n'+diff[:8000])
proof={'before_sha256':sha(before),'after_sha256':sha(after),'preview_layout_sha256':sha(layout),'stable_source_restores_exactly_after_removing_approved_preview_regions':True,'mastery_logic_unchanged':True,'approved_regions':['Preview imports','Preview-only Section attributes and keyboard handler','Preview wrapper and responsive data attributes','Preview-only dialog semantics'],'source_files_changed':['src/screens/Mastery.jsx','src/components/PreviewMasteryLayout.jsx']}
(root/'docs/revamp/stage-3/evidence/mastery-source-preservation.json').write_text(json.dumps(proof,indent=2)+'\n')
print(json.dumps(proof,indent=2))
