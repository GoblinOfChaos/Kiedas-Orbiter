# Common rules — research-only job
Work inside the repo folder the job starts in. This job changes NO code, NO grades, and NO existing report.
- Do NOT edit docs/agent-context/reports/no-acq-research-ALL.md or any other existing file. Do NOT run git commit, git stash, git push, or any build or test command.
- The only output is the one new file named in the brief.
- Sources (only these): wiki_store/pages.jsonl (Warframe Wiki dump, one JSON page per line, fields "title" and "wikitext"), wiki_store/redirects.json, and the rows of docs/agent-context/reports/no-acq-research-ALL.md. No Fandom and no live web.
- Every quote is copied verbatim and confirmed with `grep -F -c "<quote>" /home/jedwards/kiedas-orbiter/wiki_store/pages.jsonl`, which must return at least 1. No paraphrase inside quotes. If a fact is not in the dump, record "not found".
- Throttle: every shell command uses `timeout 180` and `< /dev/null`. Process one chunk of rows at a time. Use `nice -n 19` for any script.
- Temp files go in $TMPDIR, not /tmp. Delete anything created there before finishing.
