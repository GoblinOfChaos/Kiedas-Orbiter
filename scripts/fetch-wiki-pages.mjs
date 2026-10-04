#!/usr/bin/env node
// Politely fetch wikitext snapshots from wiki.warframe.com (the official Warframe wiki; Fandom is banned)
// for a list of item names, via the MediaWiki API, 20 titles per request, one request per 1.5 s.
// usage: node scripts/fetch-wiki-pages.mjs NAMES.json OUT.json
//   NAMES.json: JSON array of item display names
//   OUT.json:   { "<requested name>": { requested, title, redirectedFrom, revid, url, wikitext } | { requested, missing: true } }
// Resumable: names already present in OUT.json are skipped. Throttled and read-only.
import fs from 'node:fs'

const [namesFile, outFile] = process.argv.slice(2)
if (!namesFile || !outFile) { console.error('usage: node scripts/fetch-wiki-pages.mjs NAMES.json OUT.json'); process.exit(2) }
const names = [...new Set(JSON.parse(fs.readFileSync(namesFile, 'utf8')).map((n) => String(n).trim()).filter(Boolean))]
const out = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {}
const todo = names.filter((n) => !(n in out))
const BATCH = 20
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const UA = 'KiedasOrbiter/1.3 (jacob.lewis.edwards@gmail.com; wiki snapshot for acquisition data)'

for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH)
  const url = 'https://wiki.warframe.com/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', redirects: '1',
    prop: 'revisions', rvprop: 'content|ids', rvslots: 'main', titles: batch.join('|'),
  })
  let data = null
  for (let attempt = 1; attempt <= 4 && !data; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      data = await res.json()
    } catch (err) {
      console.error(`batch ${i / BATCH + 1} attempt ${attempt} failed: ${err.message}`)
      await sleep(3000 * attempt)
    }
  }
  if (!data) { console.error('giving up on batch', i / BATCH + 1); continue }
  const normalized = new Map((data.query?.normalized ?? []).map((n) => [n.from, n.to]))
  const redirects = new Map((data.query?.redirects ?? []).map((r) => [r.from, r.to]))
  const pages = new Map((data.query?.pages ?? []).map((p) => [p.title, p]))
  for (const requested of batch) {
    let title = normalized.get(requested) ?? requested
    const from = title
    let hops = 0
    while (redirects.has(title) && hops < 5) { title = redirects.get(title); hops += 1 }
    const page = pages.get(title)
    const rev = page?.revisions?.[0]
    if (!page || page.missing || !rev) { out[requested] = { requested, missing: true }; continue }
    out[requested] = {
      requested,
      title: page.title,
      redirectedFrom: title !== from ? from : null,
      revid: rev.revid,
      url: `https://wiki.warframe.com/w/${encodeURIComponent(page.title.replaceAll(' ', '_'))}`,
      wikitext: rev.slots?.main?.content ?? '',
    }
  }
  fs.writeFileSync(outFile, JSON.stringify(out))
  console.log(`fetched ${Math.min(i + BATCH, todo.length)}/${todo.length}`)
  await sleep(1500)
}
console.log('done', Object.keys(out).length, 'entries,', Object.values(out).filter((v) => v.missing).length, 'missing pages')
