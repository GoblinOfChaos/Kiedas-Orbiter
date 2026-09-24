#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises'
import { promisify } from 'node:util'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const execFileAsync = promisify(execFile)
const INDEX_URL = 'https://origin.warframe.com/PublicExport/index_en.txt.lzma'
const CONTENT_BASE = 'https://content.warframe.com/PublicExport/Manifest'
let cacheDir = process.env.KIEDAS_DE_EXPORT_CACHE || join(homedir(), '.cache/kiedas-de-export')
const CATEGORIES = [
  'ExportWarframes', 'ExportWeapons', 'ExportCustoms', 'ExportUpgrades',
  'ExportRecipes', 'ExportRelicArcane', 'ExportResources', 'ExportFlavour',
  'ExportRegions', 'ExportSentinels', 'ExportGear', 'ExportKeys',
  'ExportDrones', 'ExportFusionBundles', 'ExportSortieRewards',
  'ExportManifest',
]

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms))
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

function argValue(args, name, fallback) {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}

function parseIndex(text) {
  const entries = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('!')
    if (separator <= 0) continue
    const logicalName = line.slice(0, separator)
    const suffix = line.slice(separator + 1)
    const match = logicalName.match(/^(Export[^_]+)_en\.json$/)
    if (match) entries[match[1]] = { logicalName, suffix, line }
    if (logicalName === 'ExportManifest.json') entries.ExportManifest = { logicalName, suffix, line }
  }
  return entries
}

function countRecords(value, category) {
  if (Array.isArray(value)) return value.length
  if (!value || typeof value !== 'object') return 0
  if (Array.isArray(value[category])) return value[category].length
  const arrays = Object.values(value).filter(Array.isArray)
  if (arrays.length) return arrays.reduce((total, records) => total + records.length, 0)
  return Object.keys(value).length
}

function hasExpectedShape(value, category) {
  if (category === 'ExportManifest') return value && typeof value === 'object' && !Array.isArray(value)
  return Array.isArray(value) || (value && typeof value === 'object' && !Array.isArray(value)
    && (Array.isArray(value[category]) || Object.values(value).some(Array.isArray)))
}

async function fetchBytes(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return Buffer.from(await response.arrayBuffer())
}

async function readPreviousManifest() {
  try { return JSON.parse(await readFile(join(cacheDir, 'provenance.json'), 'utf8')) } catch { return null }
}

async function atomicWrite(path, bytes) {
  const temporary = `${path}.tmp-${process.pid}`
  await writeFile(temporary, bytes)
  await rename(temporary, path)
}

async function fetchIndex() {
  const compressed = await fetchBytes(INDEX_URL)
  const temporary = join(cacheDir, `index-${process.pid}.txt.lzma`)
  await writeFile(temporary, compressed)
  try {
    const { stdout } = await execFileAsync('/usr/bin/xz', ['--format=lzma', '-dc', temporary], { maxBuffer: 2 * 1024 * 1024 })
    return { text: stdout, bytes: compressed, sha256: sha256(compressed) }
  } finally {
    await unlink(temporary).catch(() => {})
  }
}

async function fetchExports() {
  const cache = cacheDir
  await mkdir(join(cache, 'assets'), { recursive: true })
  const previous = await readPreviousManifest()
  const index = await fetchIndex()
  const entries = parseIndex(index.text)
  const missing = CATEGORIES.filter((category) => !entries[category])
  if (missing.length) throw new Error(`Index is missing required categories: ${missing.join(', ')}`)

  const categories = {}
  let downloaded = 0
  let reused = 0
  for (const category of CATEGORIES) {
    const entry = entries[category]
    const url = `${CONTENT_BASE}/${entry.line}`
    const assetPath = join(cache, 'assets', entry.suffix.replace(/[^A-Za-z0-9._+-]/g, '_') + '.json')
    let bytes
    try {
      bytes = await readFile(assetPath)
      reused += 1
    } catch {
      if (downloaded + reused > 0) await sleep(1000)
      bytes = await fetchBytes(url)
      downloaded += 1
      await atomicWrite(assetPath, bytes)
    }
    let value
    try { value = JSON.parse(bytes) } catch (error) { throw new Error(`${category}: invalid JSON: ${error.message}`) }
    if (!hasExpectedShape(value, category)) throw new Error(`${category}: unexpected top-level JSON shape`)
    const count = countRecords(value, category)
    const previousCount = previous?.categories?.[category]?.count
    if (previousCount && count < previousCount * 0.5) {
      throw new Error(`${category}: count collapsed from ${previousCount} to ${count}`)
    }
    categories[category] = {
      logicalName: entry.logicalName,
      resolvedPath: entry.line,
      url,
      suffix: entry.suffix,
      sha256: sha256(bytes),
      bytes: bytes.length,
      count,
    }
  }

  const warframesPath = join(cache, 'assets', entries.ExportWarframes.suffix.replace(/[^A-Za-z0-9._+-]/g, '_') + '.json')
  const warframes = JSON.parse(await readFile(warframesPath, 'utf8'))
  const warframeRecords = Array.isArray(warframes) ? warframes : (warframes.ExportWarframes || [])
  const narin = warframeRecords.find((item) => item.uniqueName === '/Lotus/Powersuits/Duelist/Duelist')
  const provenance = {
    schemaVersion: 1,
    source: 'Digital Extremes Public Export',
    indexUrl: INDEX_URL,
    indexRetrievedAt: new Date().toISOString(),
    indexSha256: index.sha256,
    cacheDir: cache,
    categories,
    validation: { requiredCategories: CATEGORIES, narin: Boolean(narin) },
    downloadStats: { downloaded, reused },
  }
  await atomicWrite(join(cache, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n')
  return provenance
}

function usage() {
  console.log('Usage: node scripts/de-export/de-export.mjs fetch [--cache-dir DIR]')
  console.log('       KIEDAS_DE_EXPORT_CACHE may also select the cache directory.')
}

const args = process.argv.slice(2)
if (args.includes('--help') || args.length === 0) { usage(); process.exit(0) }
if (args[0] !== 'fetch') { usage(); process.exit(2) }
const requestedCache = argValue(args, '--cache-dir', null)
if (requestedCache) cacheDir = resolve(requestedCache)

try {
  const result = await fetchExports()
  console.log(JSON.stringify({
    cacheDir: result.cacheDir,
    indexSha256: result.indexSha256,
    downloadStats: result.downloadStats,
    narin: result.validation.narin,
    counts: Object.fromEntries(Object.entries(result.categories).map(([key, value]) => [key, value.count])),
    hashes: Object.fromEntries(Object.entries(result.categories).map(([key, value]) => [key, value.sha256])),
  }, null, 2))
} catch (error) {
  console.error(`de-export: ${error.message}`)
  process.exit(1)
}
