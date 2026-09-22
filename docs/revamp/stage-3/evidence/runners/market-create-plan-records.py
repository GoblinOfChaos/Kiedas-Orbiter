from pathlib import Path
import datetime
import hashlib
import json
import shutil
import subprocess


ROOT = Path('/var/home/jedwards/kiedas-orbiter')
CHECKOUT = ROOT / '.preview-work/stage2'
WORK = ROOT / '.preview-work/stage3-market'
STAGE = ROOT / 'docs/revamp/stage-3'
EVIDENCE = STAGE / 'evidence'
MARKET = CHECKOUT / 'src/screens/Market.jsx'
WFM_CACHE = CHECKOUT / 'src/lib/wfmCache.js'
MAIN_RS = CHECKOUT / 'src-tauri/src/main.rs'
BUILD_PROFILE = CHECKOUT / 'src-tauri/src/build_profile.rs'
LOCKFILE = CHECKOUT / 'src-tauri/Cargo.lock'
NAV_FACT = EVIDENCE / 'market-nav-source-fact.json'
REGISTER = STAGE / 'market-source-register.json'
PLAN_CHECK = EVIDENCE / 'market-plan-check.json'
for path in (
    ROOT / 'AGENTS.md', MARKET, WFM_CACHE, MAIN_RS, BUILD_PROFILE, LOCKFILE,
    NAV_FACT, WORK / 'before/Market.jsx', WORK / 'before/cumulative-implementation.patch',
    STAGE / 'MARKET-IMPLEMENTATION-PLAN.md', STAGE / 'MARKET-PRESERVATION.md',
):
    if not path.exists():
        raise FileNotFoundError(path)
if PLAN_CHECK.exists():
    raise FileExistsError(PLAN_CHECK)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


source = MARKET.read_text()
main_rs = MAIN_RS.read_text()
nav_fact = json.loads(NAV_FACT.read_text())
assert source == (WORK / 'before/Market.jsx').read_text()
assert nav_fact['value'] == 'Market'
assert not (CHECKOUT / 'src/components/PreviewMarketLayout.jsx').exists()
assert 'build_profile::require_live()?;\n    crate::market::post_market_order' in main_rs
assert 'build_profile::require_live()?;\n    crate::market::delete_market_order' in main_rs
assert 'build_profile::require_live()?;' in main_rs[main_rs.index('async fn update_market_order'):main_rs.index('async fn close_market_order')]
assert 'build_profile::require_live()?;' in main_rs[main_rs.index('async fn close_market_order'):main_rs.index('async fn start_log_scanner')]
assert 'build_profile::require_live()?' not in main_rs[main_rs.index('async fn get_my_market_orders'):main_rs.index('async fn delete_market_order')]

register = {
    'captured_on': datetime.date.today().isoformat(),
    'checkout': '.preview-work/stage2',
    'branch': subprocess.run(['git', 'branch', '--show-current'], cwd=CHECKOUT, capture_output=True, text=True, check=True).stdout.strip(),
    'head': subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=CHECKOUT, capture_output=True, text=True, check=True).stdout.strip(),
    'status': 'proposed_higher_risk_awaiting_explicit_app_source_approval',
    'accepted_stage3h_cumulative_patch_sha256': digest(WORK / 'before/cumulative-implementation.patch'),
    'cargo_lock_sha256': digest(LOCKFILE),
    'sources': {
        'src/screens/Market.jsx': {'sha256': digest(MARKET), 'lines': len(source.splitlines())},
        'src/lib/wfmCache.js': {'sha256': digest(WFM_CACHE), 'planned_change': False},
        'src-tauri/src/main.rs': {'sha256': digest(MAIN_RS), 'planned_change': False},
        'src-tauri/src/build_profile.rs': {'sha256': digest(BUILD_PROFILE), 'planned_change': False},
    },
    'navigation_fact': {
        'path': 'docs/revamp/stage-3/evidence/market-nav-source-fact.json',
        'value': nav_fact['value'],
        'derived_from_current_source': True,
    },
    'complexity': {
        'use_state_hooks': source.count('useState('),
        'use_effect_hooks': source.count('useEffect('),
        'use_memo_hooks': source.count('useMemo('),
        'use_callback_hooks': source.count('useCallback('),
        'summary_cards': 4,
        'tabs': ['active_orders', 'tradeable_stock'],
        'order_filters': ['all', 'sell', 'buy', 'hidden'],
        'reachable_stock_filters': ['all', 'sell_plat', 'ducats', 'duplicates', 'mastered'],
        'dormant_stock_filter': 'unmastered',
        'sort_modes': ['plat_ratio', 'ducat_ratio', 'plat_desc', 'owned_desc', 'ducats_desc', 'name_asc'],
        'order_table_columns': ['item', 'type', 'quantity', 'price', 'status', 'actions'],
    },
    'read_only_paths': {
        'commands': ['get_my_market_orders'],
        'frontend_fetches': ['WFM v2 items catalog', 'WFM v2 top sell orders through getPriceState'],
        'preview_contract': 'permitted within configured limits',
    },
    'mutation_paths': {
        'frontend_interactions': ['sell_stock', 'delete_order', 'mark_sold', 'toggle_visibility', 'save_price'],
        'backend_commands': ['post_market_order', 'delete_market_order', 'close_market_order', 'update_market_order'],
        'rust_require_live_guards_verified': True,
        'preview_ui_currently_exposes_controls': True,
        'proposed_preview_behavior': 'visibly disabled; zero frontend mutation invokes; backend guards retained',
    },
    'price_safety': {
        'catalog_identity': 'verified WFM item id via lookupWfmItem',
        'tradability_required': True,
        'positive_quantity_required': True,
        'statuses': ['loading', 'ready', 'no_orders', 'error'],
        'unresolved_platinum': None,
        'minimum_entered_listing_price': 1,
        'fake_zero_or_default_price': False,
    },
    'planned_app_files': ['src/screens/Market.jsx', 'src/components/PreviewMarketLayout.jsx'],
    'source_boundaries': {
        'valuation_or_ratio_change': False,
        'catalog_or_price_cache_change': False,
        'token_or_settings_change': False,
        'mutation_payload_change': False,
        'rust_guard_or_capability_change': False,
        'translation_change': False,
        'shared_ui_or_global_css_change': False,
        'dependency_or_lockfile_change': False,
        'other_screen_change': False,
    },
    'stage3i_app_source_started': False,
    'stage3j_app_source_started': False,
}
assert register['complexity']['use_state_hooks'] == 24
assert register['complexity']['use_effect_hooks'] == 3
assert register['complexity']['use_memo_hooks'] == 6
assert register['complexity']['use_callback_hooks'] == 3
REGISTER.write_text(json.dumps(register, indent=2) + '\n')
shutil.copy2(REGISTER, WORK / 'before/source-register.json')

plan_check = {
    'status': 'pass_plan_only',
    'higher_risk_flag_present': 'HIGHER RISK' in (STAGE / 'MARKET-IMPLEMENTATION-PLAN.md').read_text(),
    'explicit_approval_gate_present': 'EXPLICIT APP-SOURCE APPROVAL REQUIRED' in (STAGE / 'MARKET-IMPLEMENTATION-PLAN.md').read_text(),
    'market_source_unchanged_from_frozen_copy': digest(MARKET) == digest(WORK / 'before/Market.jsx'),
    'preview_market_layout_absent': not (CHECKOUT / 'src/components/PreviewMarketLayout.jsx').exists(),
    'accepted_stage3h_patch_frozen': digest(WORK / 'before/cumulative-implementation.patch') == register['accepted_stage3h_cumulative_patch_sha256'],
    'navigation_label_source_verified': nav_fact['value'] == 'Market',
    'mutation_guards_source_verified': register['mutation_paths']['rust_require_live_guards_verified'],
    'get_my_market_orders_classified_read_only_and_unguarded': True,
    'planned_files': register['planned_app_files'],
    'stage3i_app_source_started': False,
    'stage3j_app_source_started': False,
}
required_true = [
    'higher_risk_flag_present',
    'explicit_approval_gate_present',
    'market_source_unchanged_from_frozen_copy',
    'preview_market_layout_absent',
    'accepted_stage3h_patch_frozen',
    'navigation_label_source_verified',
    'mutation_guards_source_verified',
    'get_my_market_orders_classified_read_only_and_unguarded',
]
assert all(plan_check[key] is True for key in required_true)
assert plan_check['stage3i_app_source_started'] is False
assert plan_check['stage3j_app_source_started'] is False
PLAN_CHECK.write_text(json.dumps(plan_check, indent=2) + '\n')

readme = STAGE / 'README.md'
scope = STAGE / 'SCREEN-REDESIGN-SCOPE.md'
readme_text = readme.read_text()
readme_anchor = 'Accepted Stage 3H slice: [RELIC-PLANNER-IMPLEMENTATION-PLAN.md](RELIC-PLANNER-IMPLEMENTATION-PLAN.md). Relic Planner preservation checklist: [RELIC-PLANNER-PRESERVATION.md](RELIC-PLANNER-PRESERVATION.md).'
addition = '\n\nProposed higher-risk Stage 3I slice, awaiting explicit app-source approval: [MARKET-IMPLEMENTATION-PLAN.md](MARKET-IMPLEMENTATION-PLAN.md). Market preservation checklist: [MARKET-PRESERVATION.md](MARKET-PRESERVATION.md).'
if readme_text.count(readme_anchor) != 1 or 'MARKET-IMPLEMENTATION-PLAN.md' in readme_text:
    raise RuntimeError('README Stage 3I anchor mismatch')
readme.write_text(readme_text.replace(readme_anchor, readme_anchor + addition, 1))

scope_text = scope.read_text()
old_row = '| Stage 3I | Market | Redesign |'
new_row = '| Stage 3I | Market | Planned; higher risk; explicit approval required |'
if scope_text.count(old_row) != 1:
    raise RuntimeError('scope Stage 3I anchor mismatch')
scope.write_text(scope_text.replace(old_row, new_row, 1))

print(json.dumps({'register': str(REGISTER), 'plan_check': str(PLAN_CHECK), 'market_source_sha256': digest(MARKET), 'stage3h_patch_sha256': register['accepted_stage3h_cumulative_patch_sha256']}, indent=2))
