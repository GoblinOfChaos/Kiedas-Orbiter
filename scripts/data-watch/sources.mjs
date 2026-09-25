import { createHash } from 'node:crypto'
import { execFile as nodeExecFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

export const USER_AGENT = "KiedasOrbiter-data-watch/1.0 (+https://github.com/GoblinOfChaos/Kiedas-Orbiter)"
const execFileDefault = promisify(nodeExecFile)
const sleepDefault = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
const EXPORT_INDEX_URLS = [
  'https://origin.warframe.com/PublicExport/index_en.txt.lzma',
  'https://content.warframe.com/PublicExport/index_en.txt.lzma',
]
const WIKI_API = 'https://wiki.warframe.com/api.php'
const WORLDSTATE_URL = 'https://api.warframe.com/cdn/worldState.php'

export const sha256 = (value) => createHash('sha256').update(value).digest('hex')

function requestOptions(signal) {
  return { headers: { 'User-Agent': USER_AGENT }, signal }
}

async function fetchWithTimeout(fetchImpl, url, options = {}, timeoutMs = 30_000) {
  const signal = options.signal || AbortSignal.timeout(timeoutMs)
  return fetchImpl(url, { ...options, headers: { 'User-Agent': USER_AGENT, ...(options.headers || {}) }, signal })
}

function fetchSource(ctx, url, options = {}) {
  return fetchWithTimeout(ctx.fetchImpl, url, options, ctx.timeoutMs || 30_000)
}

function errorMessage(error) {
  return error?.name === 'AbortError' || error?.name === 'TimeoutError' ? 'request timed out after 30s' : (error?.message || String(error))
}

async function safeProbe(work) {
  try { return await work() } catch (error) { return { ok: false, error: errorMessage(error) } }
}

export function parseExportIndex(text) {
  const categories = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    const match = line.match(/^(Export[^_]+)_en\.json!([^\s]+)$/)
    if (match) categories[match[1]] = match[2]
  }
  return categories
}

async function probePublicExport(ctx) {
  return safeProbe(async () => {
    let response
    let lastStatus
    for (const url of EXPORT_INDEX_URLS) {
      response = await fetchSource(ctx, url)
      if (response.ok) break
      lastStatus = response.status
    }
    if (!response?.ok) throw new Error(`HTTP ${lastStatus} for PublicExport index`)
    const compressed = Buffer.from(await response.arrayBuffer())
    const temporaryDirectory = await (ctx.mkdtemp || mkdtemp)(join(tmpdir(), 'data-watch-'))
    const temporaryPath = join(temporaryDirectory, 'index.lzma')
    const writeFile = ctx.writeFile || (async (path, bytes) => (await import('node:fs/promises')).writeFile(path, bytes))
    const unlink = ctx.unlink || (async (path) => (await import('node:fs/promises')).unlink(path).catch(() => {}))
    try {
      await writeFile(temporaryPath, compressed)
      const execFile = ctx.execFile || execFileDefault
      const result = await execFile('xz', ['--format=lzma', '-dc', temporaryPath], { maxBuffer: 8 * 1024 * 1024, timeout: 15_000, killSignal: 'SIGKILL' })
      const text = String(result.stdout)
      const categories = parseExportIndex(text)
      if (!Object.keys(categories).length) throw new Error('PublicExport index contained no categories')
      return { ok: true, fingerprint: sha256(text), detail: { categories } }
    } finally {
      await unlink(temporaryPath)
      await (ctx.rm || rm)(temporaryDirectory, { recursive: true, force: true })
    }
  })
}

async function probeDropTables(ctx) {
  return safeProbe(async () => {
    const landing = await fetchSource(ctx, 'https://www.warframe.com/droptables', { redirect: 'manual' })
    let resolvedUrl = 'https://www.warframe.com/droptables'
    if (landing.status >= 300 && landing.status < 400) {
      const location = landing.headers.get('location')
      if (!location) throw new Error(`drop tables redirect ${landing.status} had no Location`)
      resolvedUrl = new URL(location, 'https://www.warframe.com/droptables').href
      const redirectUrl = new URL(resolvedUrl)
      const trustedHost = redirectUrl.protocol === 'https:' && (redirectUrl.hostname === 'warframe.com' || redirectUrl.hostname.endsWith('.warframe.com') || redirectUrl.hostname === 'warframe-web-assets.nyc3.cdn.digitaloceanspaces.com')
      if (!trustedHost) throw new Error('untrusted redirect host')
    } else if (!landing.ok) {
      throw new Error(`HTTP ${landing.status} for drop tables landing page`)
    }
    const prior = ctx.previous || {}
    const headers = {}
    if (prior.lastModified) headers['If-Modified-Since'] = prior.lastModified
    if (prior.etag) headers['If-None-Match'] = prior.etag
    let response = await fetchSource(ctx, resolvedUrl, { method: 'HEAD', headers })
    if (!response.ok && response.status !== 304) {
      response = await fetchSource(ctx, resolvedUrl, { headers })
    }
    if (!response.ok && response.status !== 304) throw new Error(`HTTP ${response.status} for drop tables CDN`)
    const lastModified = response.headers.get('last-modified') || null
    const etag = response.headers.get('etag') || null
    const contentLength = response.headers.get('content-length') || null
    const fingerprint = lastModified || etag ? `${lastModified || ''}|${etag || ''}` : contentLength
    if (!fingerprint) throw new Error('drop tables response had no Last-Modified, ETag, or content-length')
    return { ok: true, fingerprint, detail: { resolvedUrl, lastModified } }
  })
}

const DATA_TITLE = /\/data(\/|$)|^Module:(Acquisition|DropTables|Resources|Missions|Enemies|Baro|Blueprints|GuaranteedRewards|Research|Syndicates|Keys|Decorations|Codex|Focus|Factions|Companions|Mods|Stances|Synthesis|Cosmetics|NightwaveActs|Honorias|Modular|Void)/
const EXCLUDED_TITLE = /(\/doc|\/testcases|Test|Sandbox|\/dev)$/

export function isDataModuleTitle(title) {
  return DATA_TITLE.test(title) && !EXCLUDED_TITLE.test(title)
}

async function wikiRequest(ctx, params, method = 'GET') {
  const query = new URLSearchParams({ format: 'json', ...params })
  const options = method === 'POST' ? { method, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: query } : {}
  const url = method === 'POST' ? WIKI_API : `${WIKI_API}?${query}`
  const response = await fetchSource(ctx, url, options)
  if (!response.ok) throw new Error(`HTTP ${response.status} for wiki API`)
  const data = await response.json()
  if (data.error) throw new Error(`wiki API error: ${JSON.stringify(data.error)}`)
  return data
}

async function probeWikiModules(ctx) {
  return safeProbe(async () => {
    const sleep = ctx.sleep || sleepDefault
    const titles = []
    let apcontinue
    const continuationTokens = new Set()
    let pageCount = 0
    do {
      if (pageCount >= 30) throw new Error('wiki allpages exceeded maximum of 30 pages')
      pageCount += 1
      const data = await wikiRequest(ctx, { action: 'query', list: 'allpages', apnamespace: '828', aplimit: '500', ...(apcontinue ? { apcontinue } : {}) })
      titles.push(...(data.query?.allpages || []).map((page) => page.title).filter(isDataModuleTitle))
      apcontinue = data.continue?.apcontinue
      if (apcontinue) {
        if (continuationTokens.has(apcontinue)) throw new Error('wiki allpages returned a repeated continuation token')
        continuationTokens.add(apcontinue)
        await sleep(1200)
      }
    } while (apcontinue)

    const revisions = []
    const revisionTimestamps = []
    for (let index = 0; index < titles.length; index += 50) {
      if (index) await sleep(1200)
      const batch = titles.slice(index, index + 50)
      const data = await wikiRequest(ctx, { action: 'query', prop: 'revisions', rvprop: 'ids|timestamp', titles: batch.join('|') }, 'POST')
      for (const page of Object.values(data.query?.pages || {})) {
        const revision = page.revisions?.[0]
        if (revision) {
          revisions.push(`${page.title}:${revision.revid}`)
          if (revision.timestamp) revisionTimestamps.push(revision.timestamp)
        }
      }
    }
    revisions.sort()
    const newestTimestamp = revisionTimestamps.sort().at(-1) || null
    return { ok: true, fingerprint: sha256(revisions.join('\n')), detail: { moduleCount: titles.length, newestTimestamp } }
  })
}

async function probeWorldstate(ctx) {
  return safeProbe(async () => {
    const response = await fetchSource(ctx, WORLDSTATE_URL, requestOptions())
    if (!response.ok) throw new Error(`HTTP ${response.status} for WorldState`)
    const value = await response.json()
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('WorldState response was not an object')
    const keys = Object.keys(value).sort()
    return { ok: true, fingerprint: sha256(keys.join('\n')), detail: { keys } }
  })
}

export const sources = [
  { id: 'de-public-export', title: 'DE Public Export', host: 'origin.warframe.com', probe: probePublicExport },
  { id: 'de-drop-tables', title: 'DE Drop Tables', host: 'www.warframe.com', probe: probeDropTables },
  { id: 'wiki-modules', title: 'Official Wiki Modules', host: 'wiki.warframe.com', probe: probeWikiModules },
  { id: 'worldstate-schema', title: 'WorldState Schema', host: 'api.warframe.com', probe: probeWorldstate },
]

export { fetchWithTimeout, probePublicExport, probeDropTables, probeWikiModules, probeWorldstate }
