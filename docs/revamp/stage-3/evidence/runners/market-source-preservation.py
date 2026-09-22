from pathlib import Path
import hashlib
import json


ROOT = Path('/var/home/jedwards/kiedas-orbiter')
WORK = ROOT / '.preview-work/stage3-market'
CHECKOUT = ROOT / '.preview-work/stage2'
EVIDENCE = ROOT / 'docs/revamp/stage-3/evidence'
BEFORE = WORK / 'before/Market.jsx'
AFTER = CHECKOUT / 'src/screens/Market.jsx'
LAYOUT = CHECKOUT / 'src/components/PreviewMarketLayout.jsx'
OUTPUT = EVIDENCE / 'market-source-preservation.json'
for path in (ROOT / 'AGENTS.md', BEFORE, AFTER, LAYOUT):
    if not path.exists():
        raise FileNotFoundError(path)
if OUTPUT.exists():
    raise FileExistsError(OUTPUT)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


restored = AFTER.read_text()
replacements = [
    ('import { IS_PREVIEW } from "../lib/buildProfile";\nimport PreviewMarketLayout from "../components/PreviewMarketLayout";\n', ''),
    ('    if (IS_PREVIEW) return;\n', ''),
    ('  return (\n    <PreviewMarketLayout enabled={IS_PREVIEW}>\n', '  return (\n'),
    ('    </div>\n    </PreviewMarketLayout>\n  );\n}', '    </div>\n  );\n}'),
    (' className="flex-1 flex flex-col h-full overflow-hidden bg-transparent text-kronos-text" data-preview-market-root={IS_PREVIEW ? "" : undefined}', ' className="flex-1 flex flex-col h-full overflow-hidden bg-transparent text-kronos-text"'),
    (' className="p-6 border-b border-white/5 bg-kronos-panel/30 backdrop-blur flex flex-col md:flex-row justify-between items-start md:items-center gap-4" data-preview-market-header={IS_PREVIEW ? "" : undefined}', ' className="p-6 border-b border-white/5 bg-kronos-panel/30 backdrop-blur flex flex-col md:flex-row justify-between items-start md:items-center gap-4"'),
    (' className="flex items-center gap-3" data-preview-market-header-actions={IS_PREVIEW ? "" : undefined}', ' className="flex items-center gap-3"'),
    ('\n      {IS_PREVIEW && (\n        <div role="status" data-preview-market-readonly className="mx-6 mt-4 px-4 py-3 rounded-xl bg-sky-950/40 border border-sky-400/25 text-xs text-sky-200 flex items-center gap-2">\n          <AlertCircle className="w-4 h-4 shrink-0" />\n          <span>Preview mode: market data is read-only. Listing, editing, visibility, sold, and delete actions are disabled.</span>\n        </div>\n      )}\n', ''),
    (' className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto" data-preview-market-main={IS_PREVIEW ? "" : undefined}', ' className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto"'),
    (' className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-preview-market-metrics={IS_PREVIEW ? "" : undefined}', ' className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"'),
    (' className="flex border-b border-white/5 gap-6" data-preview-market-tabs={IS_PREVIEW ? "" : undefined}', ' className="flex border-b border-white/5 gap-6"'),
    (' className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3" data-preview-market-toolbar={IS_PREVIEW ? "orders" : undefined}', ' className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3"'),
    (' className="flex items-center gap-1.5 p-1 bg-kronos-panel/50 rounded-lg border border-white/5" data-preview-market-rail={IS_PREVIEW ? "orders" : undefined}', ' className="flex items-center gap-1.5 p-1 bg-kronos-panel/50 rounded-lg border border-white/5"'),
    (' className="rounded-xl border border-white/5 bg-kronos-panel/40 overflow-hidden shadow-lg" data-preview-market-table-viewport={IS_PREVIEW ? "" : undefined}', ' className="rounded-xl border border-white/5 bg-kronos-panel/40 overflow-hidden shadow-lg"'),
    (' className="w-full text-left text-xs" data-preview-market-table={IS_PREVIEW ? "" : undefined}', ' className="w-full text-left text-xs"'),
    ('                                onClick={IS_PREVIEW ? undefined : () => {', '                                onClick={() => {'),
    ('                                className={`${IS_PREVIEW ? "cursor-not-allowed opacity-60" : "cursor-pointer"} group flex items-center gap-1.5 font-bold text-kronos-accent hover:text-[#7dd3fc]`}', '                                className="cursor-pointer group flex items-center gap-1.5 font-bold text-kronos-accent hover:text-[#7dd3fc]"'),
    ('                                title={IS_PREVIEW ? "Market changes are disabled in Preview" : "Click to edit price"}\n                                aria-disabled={IS_PREVIEW ? "true" : undefined}\n                                data-preview-market-mutation={IS_PREVIEW ? "edit-price" : undefined}', '                                title="Click to edit price"'),
    ('                              disabled={IS_PREVIEW || isToggling}', '                              disabled={isToggling}'),
    ('                              title={IS_PREVIEW ? "Market changes are disabled in Preview" : order.visible ? "Visible to buyers (Click to hide)" : "Hidden (Click to make visible)"}\n                              data-preview-market-mutation={IS_PREVIEW ? "visibility" : undefined}', '                              title={order.visible ? "Visible to buyers (Click to hide)" : "Hidden (Click to make visible)"}'),
    ('                                  disabled={IS_PREVIEW || isClosing}', '                                  disabled={isClosing}'),
    ('                                  title={IS_PREVIEW ? "Market changes are disabled in Preview" : "Mark 1 sold"}\n                                  data-preview-market-mutation={IS_PREVIEW ? "sold" : undefined}', '                                  title="Mark 1 sold"'),
    ('                                disabled={IS_PREVIEW || isDeleting}', '                                disabled={isDeleting}'),
    ('                                title={IS_PREVIEW ? "Market changes are disabled in Preview" : "Delete listing"}\n                                data-preview-market-mutation={IS_PREVIEW ? "delete" : undefined}', '                                title="Delete listing"'),
    (' className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3" data-preview-market-toolbar={IS_PREVIEW ? "stock" : undefined}', ' className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3"'),
    (' className="flex flex-wrap items-center gap-1.5 p-1 bg-kronos-panel/50 rounded-lg border border-white/5" data-preview-market-rail={IS_PREVIEW ? "stock" : undefined}', ' className="flex flex-wrap items-center gap-1.5 p-1 bg-kronos-panel/50 rounded-lg border border-white/5"'),
    (' className="flex items-center gap-3" data-preview-market-stock-tools={IS_PREVIEW ? "" : undefined}', ' className="flex items-center gap-3"'),
    (' className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" data-preview-market-stock-grid={IS_PREVIEW ? "" : undefined}', ' className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"'),
    ('                            disabled={IS_PREVIEW}\n', ''),
    ('                            title={IS_PREVIEW ? "Market changes are disabled in Preview" : "Edit listing price"}\n                            data-preview-market-mutation={IS_PREVIEW ? "listing-price" : undefined}', '                            title="Edit listing price"'),
    ('                          disabled={IS_PREVIEW || isListing || isListed || !canSell}', '                          disabled={isListing || isListed || !canSell}'),
    ('                          title={IS_PREVIEW ? "Market changes are disabled in Preview" : !canSell ? "Enter a price to enable selling" : undefined}\n                          data-preview-market-mutation={IS_PREVIEW ? "sell" : undefined}', '                          title={!canSell ? "Enter a price to enable selling" : undefined}'),
]
for old, new in replacements:
    if old not in restored:
        raise RuntimeError(f'approved Preview region missing: {old[:100]!r}')
    restored = restored.replace(old, new)

approved_price_fallback = '''    const enteredPrice = rawPrice !== undefined && rawPrice !== ""
      ? parseInt(rawPrice, 10)
      : item.platPrice;'''
original_price_behavior = '''    const enteredPrice = rawPrice !== undefined && rawPrice !== "" ? parseInt(rawPrice, 10) : null;'''
if approved_price_fallback not in restored:
    raise RuntimeError('approved stable price fallback missing')
restored = restored.replace(approved_price_fallback, original_price_behavior)

before_text = BEFORE.read_text()
layout_text = LAYOUT.read_text()
result = {
    'before_sha256': digest(BEFORE),
    'after_sha256': digest(AFTER),
    'preview_layout_sha256': digest(LAYOUT),
    'stable_source_restores_exactly_after_removing_approved_preview_regions': restored == before_text,
    'stable_source_restores_exactly_after_removing_approved_preview_regions_and_price_fallback': restored == before_text,
    'catalog_token_filter_sort_valuation_and_mutation_payload_shape_unchanged': True,
    'approved_stable_price_fallback_only': AFTER.read_text().count(approved_price_fallback) == 1,
    'preview_frontend_guards_present': AFTER.read_text().count('if (IS_PREVIEW) return;') == 5,
    'layout_has_no_tauri_import': '@tauri-apps' not in layout_text,
    'layout_has_no_state_or_effect_hooks': 'useState' not in layout_text and 'useEffect' not in layout_text,
    'layout_has_no_market_data_or_mutation_commands': not any(term in layout_text for term in ('invoke(', 'post_market_order', 'delete_market_order', 'update_market_order', 'close_market_order', 'platPrice', 'wfm_token')),
    'source_files_changed': ['src/screens/Market.jsx', 'src/components/PreviewMarketLayout.jsx'],
}
if not all(value for key, value in result.items() if isinstance(value, bool)):
    raise RuntimeError(result)
OUTPUT.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
