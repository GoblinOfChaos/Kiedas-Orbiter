import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const sourcePath = process.env.P5_MARKET_SOURCE ?? path.join(root, 'src/screens/Market.jsx')

test('Market metrics and tabs cannot shrink below their content height', () => {
  const source = fs.readFileSync(sourcePath, 'utf8')
  const metrics = source.match(/<div className="([^"]+)" data-preview-market-metrics=/)?.[1]
  const tabs = source.match(/<div className="([^"]+)" data-preview-market-tabs=/)?.[1]

  assert.ok(metrics, 'Market metrics wrapper should be present')
  assert.ok(tabs, 'Market tabs wrapper should be present')
  assert.match(metrics, /(?:^| )flex-shrink-0(?: |$)/)
  assert.match(tabs, /(?:^| )flex-shrink-0(?: |$)/)
  assert.doesNotMatch(tabs, /overflow-x-(?:auto|scroll)/)
  assert.match(source, /className=\{`[^`]*shrink-0[^`]*\$\{\n?\s*activeTab/)
})
