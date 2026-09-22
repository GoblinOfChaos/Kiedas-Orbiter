#!/usr/bin/env python3
"""
Classify each merge-plan conflict as a safe "detail upgrade" (new text
retains every named entity from the existing text, just adds more
specifics) vs "needs review" (the new text drops or seems to disagree
with something the existing text named). Conservative by design: any
proper-noun phrase from the existing text that isn't found in the new
text sends the whole item to manual review, even if it's probably just a
paraphrase - never auto-assume a rewording is safe.
"""
import json
import re

PROPER_NOUN_RE = re.compile(r"\b[A-Z][a-zA-Z'&\-]*(?:\s+[A-Z][a-zA-Z'&\-]*)*\b")
STOPWORDS = {"The", "A", "An", "For", "This", "Or", "Rank", "Void", "Trader"}


def extract_entities(text):
    candidates = PROPER_NOUN_RE.findall(text)
    # Keep multi-word phrases and single meaningful words, drop pure stopwords/short junk.
    entities = set()
    for c in candidates:
        c = c.strip()
        if len(c) < 3:
            continue
        if c in STOPWORDS:
            continue
        entities.add(c)
    return entities


def classify(existing, new):
    old_entities = extract_entities(existing)
    new_lower = new.lower()
    missing = [e for e in old_entities if e.lower() not in new_lower]
    return ("safe_upgrade" if not missing else "needs_review"), missing


def main():
    conflicts = json.load(open("docs/revamp/wiki-audit/merge_plan_conflicts.json"))
    safe = {"components": {}, "mods": {}}
    review = {"components": {}, "mods": {}}

    for bucket in ["components", "mods"]:
        for key, v in conflicts[bucket].items():
            status, missing = classify(v["existingText"], v["newText"])
            v["classification"] = status
            if status == "safe_upgrade":
                safe[bucket][key] = v
            else:
                v["missingFromNew"] = missing
                review[bucket][key] = v

    print("=== Safe upgrades (every named entity from existing text is retained in new text) ===")
    print("  components:", len(safe["components"]))
    print("  mods:", len(safe["mods"]))
    print("=== Needs manual review (new text drops/disagrees with something named in existing text) ===")
    print("  components:", len(review["components"]))
    print("  mods:", len(review["mods"]))

    json.dump(safe, open("docs/revamp/wiki-audit/merge_plan_safe_upgrades.json", "w"), indent=2, ensure_ascii=False)
    json.dump(review, open("docs/revamp/wiki-audit/merge_plan_needs_review.json", "w"), indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
