# Wiki article downloader

`download.mjs` retrieves namespace-0 article wikitext from the official Warframe Wiki API with one request at a time and resumable continuation state:

```bash
node scripts/wiki-download/download.mjs ./wiki-article-wikitext
node scripts/wiki-download/download.mjs ./wiki-article-wikitext --limit 100
node scripts/wiki-download/download.mjs ./wiki-article-wikitext --limit 100 --redirect-limit 500
node scripts/wiki-download/download.mjs ./wiki-article-wikitext --titles titles.json
```

The output directory contains `pages.jsonl`, `redirects.json`, `redirects.unresolved.json`, `empty.json`, `manifest.json`, and `state.json`. A titles file is either a JSON array of page titles or an object with a `titles` array. `--limit` limits article pages processed in that invocation; it does not suppress the redirect stage. `--redirect-limit` optionally limits redirect titles resolved in that invocation; omit it for the full redirect catalog. Both stages resume from `state.json`, including the redirect-title list and resolution batch offset.

Redirect page titles are listed with the namespace-0 `allpages` redirect filter, then resolved in batches of 50 with `redirects=1`. `redirects.json` maps each resolved redirect title to its target, including a `#fragment` when supplied by the API. Titles that are not returned as redirects or have no target are retained in the sorted `redirects.unresolved.json` list.

The retrieved wiki text is licensed under CC BY-NC-SA 3.0. The downloader keeps the attribution and license in `manifest.json`; downstream copies must retain that attribution and follow the license terms.
