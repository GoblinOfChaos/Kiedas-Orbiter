import test from 'node:test'
import assert from 'node:assert/strict'
import { probePublicExport, probeDropTables, probeWikiModules, probeWorldstate } from '../../scripts/data-watch/sources.mjs'

const response = (body, options = {}) => new Response(body, { status: options.status || 200, headers: options.headers })

test('PublicExport probe decompresses the origin index and falls back to content', async () => {
  const calls = []
  const result = await probePublicExport({
    fetchImpl: async (url) => { calls.push(url); return url.includes('origin') ? response('no', { status: 503 }) : response(new Uint8Array([1, 2])) },
    execFile: async () => ({ stdout: 'ExportWarframes_en.json!00_hash\nExportWeapons_en.json!11_hash\n' }),
    writeFile: async () => {},
    unlink: async () => {},
  })
  assert.equal(result.ok, true)
  assert.deepEqual(result.detail.categories, { ExportWarframes: '00_hash', ExportWeapons: '11_hash' })
  assert.equal(calls.length, 2)
})

test('PublicExport probe reports malformed decompressed data', async () => {
  const result = await probePublicExport({
    fetchImpl: async () => response(new Uint8Array([1])),
    execFile: async () => ({ stdout: 'not an index' }),
    writeFile: async () => {},
    unlink: async () => {},
  })
  assert.equal(result.ok, false)
  assert.match(result.error, /no categories/)
})

test('drop tables probe follows one redirect and fingerprints validators', async () => {
  const calls = []
  const result = await probeDropTables({
    fetchImpl: async (url, options) => {
      calls.push([url, options.method || 'GET'])
      if (calls.length === 1) return response('', { status: 302, headers: { Location: 'https://warframe-web-assets.nyc3.cdn.digitaloceanspaces.com/drop.html' } })
      return response('', { headers: { 'Last-Modified': 'Wed, 24 Sep 2026 00:00:00 GMT', ETag: '"abc"' } })
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.fingerprint, 'Wed, 24 Sep 2026 00:00:00 GMT|"abc"')
  assert.deepEqual(calls.map((call) => call[1]), ['GET', 'HEAD'])
})

test('drop tables rejects an untrusted redirect host', async () => {
  const result = await probeDropTables({ fetchImpl: async () => response('', { status: 302, headers: { Location: 'https://cdn.example/drop.html' } }) })
  assert.equal(result.ok, false)
  assert.match(result.error, /untrusted redirect host/)
})

test('drop tables probe uses content length when validators are absent', async () => {
  const result = await probeDropTables({
    fetchImpl: async (url, options) => options.method === 'HEAD' ? response('', { headers: { 'content-length': '42' } }) : response('', { status: 302, headers: { Location: url } }),
  })
  assert.equal(result.fingerprint, '42')
})

test('wiki probe filters modules, batches revisions, and records newest timestamp', async () => {
  const requests = []
  const result = await probeWikiModules({
    fetchImpl: async (url, options = {}) => {
      const query = Object.fromEntries(new URL(url).searchParams)
      const postQuery = options.body ? Object.fromEntries(new URLSearchParams(options.body)) : query
      requests.push({ ...postQuery, method: options.method || 'GET' })
      if (postQuery.list === 'allpages') return response(JSON.stringify({ query: { allpages: [{ title: 'Module:Resources/Foo' }, { title: 'Module:Resources/Foo/doc' }, { title: 'Other' }] } }))
      return response(JSON.stringify({ query: { pages: { '1': { title: 'Module:Resources/Foo', revisions: [{ revid: 7, timestamp: '2026-09-24T00:00:00Z' }] } } } }))
    },
    sleep: async () => {},
  })
  assert.equal(result.ok, true)
  assert.equal(result.detail.moduleCount, 1)
  assert.equal(result.detail.newestTimestamp, '2026-09-24T00:00:00Z')
  assert.equal(requests.length, 2)
  assert.equal(requests[1].method, 'POST')
})

test('wiki probe rejects repeated continuation tokens and too many pages', async () => {
  const repeated = await probeWikiModules({ fetchImpl: async () => response(JSON.stringify({ query: { allpages: [] }, continue: { apcontinue: 'same' } })), sleep: async () => {} })
  assert.match(repeated.error, /repeated continuation/)
  let calls = 0
  const tooMany = await probeWikiModules({ fetchImpl: async () => { calls += 1; return response(JSON.stringify({ query: { allpages: [] }, continue: { apcontinue: String(calls) } })) }, sleep: async () => {} })
  assert.match(tooMany.error, /exceeded maximum of 30 pages/)
})

test('WorldState probe hashes sorted top-level keys and rejects malformed JSON shapes', async () => {
  const good = await probeWorldstate({ fetchImpl: async () => response(JSON.stringify({ z: 1, a: 2 })) })
  assert.equal(good.ok, true)
  const bad = await probeWorldstate({ fetchImpl: async () => response(JSON.stringify([])) })
  assert.equal(bad.ok, false)
})

test('probes convert aborts and HTTP failures to errors', async () => {
  const result = await probeWorldstate({ fetchImpl: async () => { const error = new Error('aborted'); error.name = 'AbortError'; throw error } })
  assert.deepEqual(result, { ok: false, error: 'request timed out after 30s' })
})

test('fetch body timeout is enforced through the fetch signal', async () => {
  const result = await probeWorldstate({ timeoutMs: 20, fetchImpl: async (url, options) => ({
    ok: true,
    json: () => new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))))
  }) })
  assert.equal(result.ok, false)
  assert.match(result.error, /timed out/)
})
