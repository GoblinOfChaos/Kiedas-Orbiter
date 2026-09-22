#!/usr/bin/env python3
"""
Extract and clean the ==Acquisition== section from a raw wikitext article,
for items that have their own dedicated page (Link == item Name), so there
is no matching ambiguity - we already know this page is exclusively about
this one item. What's classified here is whether the page's own content is
usable, not which page belongs to which item.

Classification:
  - "clean": exactly one Acquisition section found, with real content ->
    auto-resolvable, quoting the cleaned text.
  - "no_data": no Acquisition heading at all, or its content is empty /
    an explicit placeholder ("Unknown", "TBD", "Currently unavailable").
  - "ambiguous": more than one Acquisition-style heading on the page
    (e.g. per-tab acquisition inside a tabber for different platforms/
    variants) - can't tell which one applies without more context.
"""
import re

HEADING_RE = re.compile(r'^(={2,6})\s*(.+?)\s*\1\s*$', re.MULTILINE)
PLACEHOLDER_RE = re.compile(r'^\s*(unknown|tba|tbd|currently unavailable|n/?a)\.?\s*$', re.IGNORECASE)


def clean_wikitext(text, page_title=None):
    # {{PAGENAME}} and variants are a literal self-reference to this
    # article's own title - must be substituted with the real title, not
    # stripped blank (stripping it blank silently produced "The  is
    # available..." with the subject missing entirely).
    if page_title:
        text = re.sub(r'\{\{\s*(?:PAGENAME|PAGENAMEE|SUBJECTPAGENAME|BASEPAGENAME)\s*\}\}',
                       page_title, text, flags=re.IGNORECASE)
    # [[Link|Display]] -> Display ; [[Link]] -> Link
    text = re.sub(r'\[\[([^\]|]+)\|([^\]]+)\]\]', r'\2', text)
    text = re.sub(r'\[\[([^\]]+)\]\]', r'\1', text)
    # {{Resource|Name}} / {{Item|Name}} / similar single-arg templates -> Name
    text = re.sub(r'\{\{(?:Resource|Item|Mod|Warframe|Weapon)\|([^}|]+)(?:\|[^}]*)?\}\}', r'\1', text)
    # {{sc|10000}} (standing/currency formatter) -> 10,000
    def _sc(m):
        try:
            return f"{int(m.group(1).replace(',', '')):,}"
        except ValueError:
            return m.group(1)
    text = re.sub(r'\{\{sc\|([\d,]+)\}\}', _sc, text)
    # {{Anchor|...}} -> drop entirely
    text = re.sub(r'\{\{Anchor\|[^}]*\}\}', '', text)
    # Remaining simple templates with one arg: {{Foo|Bar}} -> Bar (best-effort, not a guess at meaning - just unwrapping)
    text = re.sub(r'\{\{[A-Za-z]+\|([^{}|]+)\}\}', r'\1', text)
    # Drop templates with no args or that didn't match above: {{Foo}}
    text = re.sub(r'\{\{[^{}]*\}\}', '', text)
    # Bold/italic markup
    text = text.replace("'''", '').replace("''", '')
    # Bullet markers
    text = re.sub(r'^\*+\s*', '- ', text, flags=re.MULTILINE)
    # Collapse extra blank lines/whitespace
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def find_sections(wikitext, heading_pattern=re.compile(r'acquisition', re.IGNORECASE)):
    """Return list of (level, raw_body) for every heading whose title matches
    heading_pattern, body being everything up to the next heading of equal
    or shallower level."""
    matches = list(HEADING_RE.finditer(wikitext))
    results = []
    for i, m in enumerate(matches):
        level = len(m.group(1))
        title = m.group(2)
        if not heading_pattern.search(title):
            continue
        start = m.end()
        end = len(wikitext)
        for later in matches[i + 1:]:
            later_level = len(later.group(1))
            if later_level <= level:
                end = later.start()
                break
        results.append((level, wikitext[start:end]))
    return results


def find_template_calls(wikitext, template_names=("Acquisition", "Acquisition2")):
    """Find {{TemplateName|arg1|arg2|...}} calls (brace-balanced, so nested
    [[links]] and other {{templates}} inside an argument don't truncate it
    early), returning the raw text of the first positional argument for
    each match. This is a DIFFERENT source than a ==Acquisition== heading -
    Module:Acquisition (confirmed by reading its source earlier) is invoked
    this way on many Weapon/Warframe/Arcane pages instead of a prose
    heading, and was being silently missed entirely before this fix."""
    results = []
    for tname in template_names:
        start_pat = re.compile(r'\{\{\s*' + re.escape(tname) + r'\s*(\||\}\})')
        pos = 0
        while True:
            m = start_pat.search(wikitext, pos)
            if not m:
                break
            # Walk forward from the opening {{ tracking brace depth to find the matching }}.
            open_start = m.start()
            depth = 0
            i = open_start
            end = None
            while i < len(wikitext) - 1:
                two = wikitext[i:i + 2]
                if two == '{{':
                    depth += 1
                    i += 2
                    continue
                if two == '}}':
                    depth -= 1
                    i += 2
                    if depth == 0:
                        end = i
                        break
                    continue
                i += 1
            if end is None:
                pos = m.end()
                continue
            inner = wikitext[open_start + 2:end - 2]
            pos = end
            # Split on the first top-level '|' (not inside a nested {{}} or [[]]).
            depth2 = 0
            first_arg = None
            for j, ch in enumerate(inner):
                if inner[j:j + 2] in ('{{', '[['):
                    depth2 += 1
                elif inner[j:j + 2] in ('}}', ']]'):
                    depth2 -= 1
                elif ch == '|' and depth2 == 0:
                    first_arg = inner[len(tname):].split('|', 1)
                    break
            if first_arg is None:
                continue  # no args at all, e.g. bare {{Acquisition}} - nothing to extract
            arg_text = inner.split('|', 1)[1] if '|' in inner else ''
            # Only the value up to the next top-level '|' (arg1 itself may contain nested |).
            depth3 = 0
            cut = len(arg_text)
            for j, ch in enumerate(arg_text):
                if arg_text[j:j + 2] in ('{{', '[['):
                    depth3 += 1
                elif arg_text[j:j + 2] in ('}}', ']]'):
                    depth3 -= 1
                elif ch == '|' and depth3 == 0:
                    cut = j
                    break
            results.append(arg_text[:cut])
    return results


def classify(wikitext, page_title=None):
    sections = find_sections(wikitext)
    template_args = find_template_calls(wikitext)
    # Only treat a template argument as real quotable prose if it reads like
    # a sentence (has spaces and reasonable length) - a bare item name being
    # passed just tells the template to auto-generate its own table from
    # Module:DropTables/data, which isn't present in the raw wikitext at all
    # and must come from the join-based resolver instead, not this extractor.
    prose_template_args = [a.strip() for a in template_args if len(a.strip()) > 25 and ' ' in a.strip()]

    if not sections and not prose_template_args:
        return {"status": "no_data", "reason": "no Acquisition heading and no {{Acquisition|...}} template with prose found"}
    if len(sections) > 1:
        return {"status": "ambiguous", "reason": f"{len(sections)} separate Acquisition-style headings found",
                "raw_sections": [clean_wikitext(s, page_title) for _, s in sections]}
    if sections:
        cleaned = clean_wikitext(sections[0][1], page_title)
        if cleaned and not PLACEHOLDER_RE.match(cleaned):
            return {"status": "clean", "text": cleaned}
    if len(prose_template_args) > 1:
        return {"status": "ambiguous", "reason": f"{len(prose_template_args)} separate {{{{Acquisition}}}} template calls with prose found",
                "raw_sections": [clean_wikitext(a, page_title) for a in prose_template_args]}
    if prose_template_args:
        cleaned = clean_wikitext(prose_template_args[0], page_title)
        if cleaned and not PLACEHOLDER_RE.match(cleaned):
            return {"status": "clean", "text": cleaned}
    return {"status": "no_data", "reason": "Acquisition section/template found but content is empty or a placeholder"}


if __name__ == '__main__':
    import sys
    wt = open(sys.argv[1]).read()
    title = sys.argv[2] if len(sys.argv) > 2 else None
    import json
    print(json.dumps(classify(wt, title), indent=2, ensure_ascii=False))
