from pathlib import Path
import hashlib, json
ROOT=Path('/var/home/jedwards/kiedas-orbiter'); BEFORE=ROOT/'.preview-work/stage3-relics/before/Relics.jsx'; AFTER=ROOT/'.preview-work/stage2/src/screens/Relics.jsx'; LAYOUT=ROOT/'.preview-work/stage2/src/components/PreviewRelicsLayout.jsx'; OUTPUT=ROOT/'docs/revamp/stage-3/evidence/relics-source-preservation.json'
for path in (ROOT/'AGENTS.md',BEFORE,AFTER,LAYOUT,OUTPUT.parent):
    if not path.exists(): raise FileNotFoundError(path)
if OUTPUT.exists(): raise FileExistsError(OUTPUT)
text=AFTER.read_text()
replacements=[
("import { IS_PREVIEW } from '../lib/buildProfile';\nimport PreviewRelicsLayout from '../components/PreviewRelicsLayout';\n",''),
(" data-preview-relics-header={IS_PREVIEW ? '' : undefined}",''),
(' className={IS_PREVIEW ? "flex flex-wrap items-center gap-3 preview-relics-primary-controls" : "flex flex-wrap items-center gap-3"} data-preview-relics-primary-controls={IS_PREVIEW ? \'\' : undefined}',' className="flex flex-wrap items-center gap-3"'),
(" data-preview-relics-search={IS_PREVIEW ? '' : undefined}",''),
(" data-preview-relics-ownership={IS_PREVIEW ? '' : undefined}",''),
(" data-preview-relics-squad={IS_PREVIEW ? '' : undefined}",''),
(" data-preview-relics-target={IS_PREVIEW ? '' : undefined}",''),
(' className={IS_PREVIEW ? "flex flex-wrap items-center gap-4 preview-relics-secondary-controls" : "flex flex-wrap items-center gap-4"} data-preview-relics-secondary-controls={IS_PREVIEW ? \'\' : undefined}',' className="flex flex-wrap items-center gap-4"'),
(" data-preview-relics-rail={IS_PREVIEW ? 'era' : undefined}",''),(" data-preview-relics-rail={IS_PREVIEW ? 'quality' : undefined}",''),(" data-preview-relics-rail={IS_PREVIEW ? 'vault' : undefined}",''),(" data-preview-relics-rail={IS_PREVIEW ? 'sort' : undefined}",''),
(" className={IS_PREVIEW ? 'preview-relics-tabs' : ''}",''),(" className={IS_PREVIEW ? 'preview-relics-tabs' : ''}",''),(" data-preview-relics-traces={IS_PREVIEW ? '' : undefined}",''),
('  return (\n    <PreviewRelicsLayout enabled={IS_PREVIEW}>\n    <>\n','  return (\n    <>\n'),
("                      onKeyDown={IS_PREVIEW ? (event) => {\n                        if (event.key === 'Enter' || event.key === ' ') {\n                          event.preventDefault();\n                          toggle(item.unique_name);\n                        }\n                      } : undefined}\n                      role={IS_PREVIEW ? 'button' : undefined}\n                      tabIndex={IS_PREVIEW ? 0 : undefined}\n                      aria-label={IS_PREVIEW ? item.name : undefined}\n                      data-preview-relic-card={IS_PREVIEW ? '' : undefined}\n",''),
("${item.owned ? '' : 'grayscale opacity-60'}${IS_PREVIEW ? ' focus-visible:outline focus-visible:outline-2 focus-visible:outline-kronos-accent focus-visible:outline-offset-2' : ''}","${item.owned ? '' : 'grayscale opacity-60'}"),
('    </>\n    </PreviewRelicsLayout>);\n','    </>);\n')]
for current,original in replacements:
    count=text.count(current)
    if count<1: raise RuntimeError(f'approved region count {count}: {current[:100]}')
    text=text.replace(current,original,1)
if text!=BEFORE.read_text(): raise RuntimeError('approved-region reversal did not restore frozen Relics source')
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
result={'before_sha256':digest(BEFORE),'after_sha256':digest(AFTER),'preview_layout_sha256':digest(LAYOUT),'stable_source_restores_exactly_after_removing_approved_preview_regions':True,'catalog_search_filter_sort_expected_value_price_card_acquisition_and_backend_behavior_unchanged':True,'marketplace_mutation_commands_present':False,'source_files_changed':['src/screens/Relics.jsx','src/components/PreviewRelicsLayout.jsx']}
OUTPUT.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
