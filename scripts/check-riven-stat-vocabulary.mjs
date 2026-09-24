#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const attrsPath = process.argv[2]
if (!attrsPath) {
  console.error('Usage: node scripts/check-riven-stat-vocabulary.mjs <wfm-attributes.json>')
  process.exit(2)
}

const attrs = JSON.parse(fs.readFileSync(attrsPath, 'utf8'))
const slugs = new Set((attrs.data || []).map((attribute) => attribute.slug))
const sourceFiles = [
  'src/screens/Market.jsx',
  'src/screens/Rivens.jsx',
  'src/lib/rivenOcrI18n.js',
]

// Keep this explicit: an exception is allowed only when its reason is verified
// by the source vocabulary and documented here. There are currently none.
const knownExceptions = new Map()
const mapped = new Map()
const pair = /'([^']+)':\s*'([^']+)'/g

for (const relative of sourceFiles) {
  const source = fs.readFileSync(path.resolve(relative), 'utf8')
  for (const match of source.matchAll(pair)) {
    const [, name, slug] = match
    if (slug.includes('_') && !mapped.has(`${name}\0${slug}`)) mapped.set(`${name}\0${slug}`, { name, slug, relative })
  }
}

const missing = [...mapped.values()].filter(({ slug }) => !slugs.has(slug) && !knownExceptions.has(slug))
if (missing.length) {
  for (const { name, slug, relative } of missing) console.error(`${relative}: ${name} -> ${slug} is absent from ${attrsPath}`)
  process.exit(1)
}

for (const [slug, reason] of knownExceptions) {
  if (slugs.has(slug)) throw new Error(`Known exception ${slug} is now present; remove its exception: ${reason}`)
}

console.log(`Checked ${mapped.size} mapped stat pairs against ${slugs.size} WFM attributes; all passed.`)
