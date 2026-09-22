from pathlib import Path
import hashlib
import json


ROOT = Path('/var/home/jedwards/kiedas-orbiter')
WORK = ROOT / '.preview-work/stage3-relic-planner'
CHECKOUT = ROOT / '.preview-work/stage2'
BEFORE = WORK / 'before/RelicPlanner.jsx'
AFTER = CHECKOUT / 'src/screens/RelicPlanner.jsx'
LAYOUT = CHECKOUT / 'src/components/PreviewRelicPlannerLayout.jsx'
OUTPUT = ROOT / 'docs/revamp/stage-3/evidence/relic-planner-source-preservation.json'
for path in (ROOT / 'AGENTS.md', BEFORE, AFTER, LAYOUT, OUTPUT.parent):
    if not path.exists():
        raise FileNotFoundError(f'precondition path missing: {path}')
if OUTPUT.exists():
    raise FileExistsError(OUTPUT)


def digest_bytes(value):
    return hashlib.sha256(value).hexdigest()


before = BEFORE.read_text()
after = AFTER.read_text()
restored = after
restored = restored.replace("import { IS_PREVIEW } from '../lib/buildProfile';\n", '')
restored = restored.replace("import PreviewRelicPlannerLayout from '../components/PreviewRelicPlannerLayout';\n", '')
restored = restored.replace('      <PreviewRelicPlannerLayout enabled={IS_PREVIEW}>\n', '')
restored = restored.replace('      </PreviewRelicPlannerLayout>\n', '')
for attribute in (
    ' data-preview-relic-planner-stats={IS_PREVIEW ? \'\' : undefined}',
    ' data-preview-relic-planner-workspace={IS_PREVIEW ? \'\' : undefined}',
    ' data-preview-relic-planner-panel={IS_PREVIEW ? \'picker\' : undefined}',
    ' data-preview-relic-planner-panel={IS_PREVIEW ? \'need\' : undefined}',
    ' data-preview-relic-planner-panel={IS_PREVIEW ? \'results\' : undefined}',
    ' data-preview-relic-planner-heading={IS_PREVIEW ? \'\' : undefined}',
    ' data-preview-relic-planner-rail={IS_PREVIEW ? \'parts\' : undefined}',
    ' data-preview-relic-planner-rail={IS_PREVIEW ? \'ownership\' : undefined}',
    ' data-preview-relic-planner-actions={IS_PREVIEW ? \'\' : undefined}',
    ' data-preview-relic-planner-result={IS_PREVIEW ? \'\' : undefined}',
    ' data-preview-relic-planner-summary={IS_PREVIEW ? \'\' : undefined}',
    ' aria-label={IS_PREVIEW ? `Remove ${n.name}` : undefined}',
):
    restored = restored.replace(attribute, '')

logic_before = before[before.index('export default function RelicPlanner()'):before.index('  return (')]
logic_after = after[after.index('export default function RelicPlanner()'):after.index('  return (')]
layout_text = LAYOUT.read_text()
result = {
    'before_sha256': digest_bytes(BEFORE.read_bytes()),
    'after_sha256': digest_bytes(AFTER.read_bytes()),
    'preview_layout_sha256': digest_bytes(LAYOUT.read_bytes()),
    'stable_source_restores_exactly_after_removing_approved_preview_regions': restored == before,
    'catalog_inventory_status_search_selection_matching_sorting_and_persistence_logic_unchanged': logic_before == logic_after,
    'layout_has_no_tauri_import': '@tauri-apps' not in layout_text,
    'layout_has_no_state_or_effect_hooks': all(token not in layout_text for token in ('useState', 'useEffect', 'useMemo', 'useCallback')),
    'layout_has_no_market_terms': all(token not in layout_text for token in ('post_market_order', 'update_market_order', 'delete_market_order', 'close_market_order', 'Sell on WFM')),
    'source_files_changed': ['src/screens/RelicPlanner.jsx', 'src/components/PreviewRelicPlannerLayout.jsx'],
}
if not all(value for key, value in result.items() if isinstance(value, bool)):
    raise RuntimeError(result)
OUTPUT.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
