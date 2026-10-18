import openpyxl
import json
import urllib.parse
import os

EXCEL_PATH = '/home/jedwards/kiedas-orbiter/acquisition-without-source.xlsx'
ACCEPT_JSON_PATH = '/home/jedwards/kiedas-orbiter/acquisition-no-source-accept-list-2026-10-15.json'
WIKI_PAGES_PATH = '/home/jedwards/kiedas-orbiter/wiki_store/pages.jsonl'
WIKI_REDIRECTS_PATH = '/home/jedwards/kiedas-orbiter/wiki_store/redirects.json'

print("Loading reference data...")
with open(ACCEPT_JSON_PATH) as f:
    accept_data = json.load(f)
evidence = accept_data.get('evidence', {})

with open(WIKI_REDIRECTS_PATH) as f:
    redirects = json.load(f)

page_titles = set()
with open(WIKI_PAGES_PATH) as f:
    for line in f:
        page_titles.add(json.loads(line)['title'])

title_ci = {t.lower(): t for t in page_titles}
redirect_ci = {r.lower(): redirects[r] for r in redirects}

def build_wiki_url(title_or_target):
    t = title_or_target.strip()
    if '#' in t:
        page, anchor = t.split('#', 1)
        page_enc = urllib.parse.quote(page.replace(' ', '_'), safe='/:()\'!,-')
        anchor_enc = urllib.parse.quote(anchor.replace(' ', '_'), safe='/:()\'!,-')
        return f'https://wiki.warframe.com/w/{page_enc}#{anchor_enc}'
    else:
        page_enc = urllib.parse.quote(t.replace(' ', '_'), safe='/:()\'!,-')
        return f'https://wiki.warframe.com/w/{page_enc}'

def resolve_wiki_target(title):
    if not title:
        return None
    t = str(title).strip()
    if t in page_titles:
        return t
    if t in redirects:
        return redirects[t]
    if t.lower() in title_ci:
        return title_ci[t.lower()]
    if t.lower() in redirect_ci:
        return redirect_ci[t.lower()]
    if '#' in t:
        base, anchor = t.split('#', 1)
        base_target = resolve_wiki_target(base)
        if base_target:
            return f'{base_target}#{anchor}'
    return None

def is_noise_page(title):
    t_lower = title.lower()
    if '/patch history' in t_lower or t_lower.endswith('/patch history'):
        return True
    if '/quotes' in t_lower or t_lower.endswith('/quotes'):
        return True
    if t_lower.startswith('update '):
        return True
    return False

def resolve_item_urls(item_id, game_name, curr_c, col_g, col_n):
    # 0. Preserve existing Column C
    if curr_c and str(curr_c).strip():
        return str(curr_c).strip(), 'existing'
        
    # 1. From Accept List evidence
    if item_id in evidence:
        sources = evidence[item_id].get('sources', [])
        urls = []
        for s in sources:
            u = s.get('url', '').strip()
            if u and u not in urls:
                urls.append(u)
        if urls:
            return ' | '.join(urls), 'evidence'
            
    # 2. From Col G (Wiki page title)
    if col_g:
        target = resolve_wiki_target(col_g)
        if target:
            return build_wiki_url(target), 'col_g'
            
    # 3. From Col N (Wiki pages checked)
    if col_n:
        parts = [p.strip() for p in str(col_n).split('|') if p.strip()]
        # Filter noise pages if content pages exist
        filtered_parts = [p for p in parts if not is_noise_page(p)]
        target_parts = filtered_parts if len(filtered_parts) > 0 else parts
        
        urls = []
        for p in target_parts:
            target = resolve_wiki_target(p)
            if target:
                u = build_wiki_url(target)
                if u not in urls:
                    urls.append(u)
        if urls:
            return ' | '.join(urls), 'col_n'
            
    # 4. From Game Name
    if game_name:
        target = resolve_wiki_target(game_name)
        if target:
            return build_wiki_url(target), 'game_name'
            
    return None, 'unresolved'

print(f"Opening workbook {EXCEL_PATH}...")
wb = openpyxl.load_workbook(EXCEL_PATH)
ws = wb['No source']

stats = {
    'existing': 0,
    'evidence': 0,
    'col_g': 0,
    'col_n': 0,
    'game_name': 0,
    'unresolved': 0,
}

total_rows = ws.max_row
print(f"Processing {total_rows - 1} data rows...")

for row_idx in range(2, total_rows + 1):
    item_id = ws.cell(row=row_idx, column=1).value
    game_name = ws.cell(row=row_idx, column=2).value
    curr_c = ws.cell(row=row_idx, column=3).value
    col_g = ws.cell(row=row_idx, column=7).value
    col_n = ws.cell(row=row_idx, column=14).value
    
    url_res, src = resolve_item_urls(item_id, game_name, curr_c, col_g, col_n)
    stats[src] += 1
    
    if url_res and src != 'existing':
        ws.cell(row=row_idx, column=3).value = url_res

print(f"Saving workbook to {EXCEL_PATH}...")
wb.save(EXCEL_PATH)
wb.close()
print("Saved successfully!")
print("Execution Statistics:", stats)
print("Total rows updated/filled:", sum(stats.values()) - stats['unresolved'])
print("Total unresolved (left blank):", stats['unresolved'])
