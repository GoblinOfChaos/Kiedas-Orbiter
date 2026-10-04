import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const sourceRoot = process.env.RIVENS_SOURCE_ROOT || root
const sourceFiles = [
  'src/components/PreviewRivensLayout.jsx',
  'src/screens/Rivens.jsx',
]

function readSource(relativePath) {
  return fs.readFileSync(path.join(sourceRoot, relativePath), 'utf8')
}

test('Rivens layout and screen do not create horizontal scroll containers', () => {
  for (const relativePath of sourceFiles) {
    const source = readSource(relativePath)
    assert.doesNotMatch(source, /overflow-x\s*:\s*(?:auto|scroll)/, relativePath + ' has CSS horizontal scrolling')
    assert.doesNotMatch(source, /overflow-x-(?:auto|scroll)/, relativePath + ' has utility horizontal scrolling')
  }
})

test('Rivens filter rows wrap without max-content sizing', () => {
  const source = readSource('src/components/PreviewRivensLayout.jsx')
  for (const marker of ['[data-preview-rivens-state]', '[data-preview-rivens-sort]', '.preview-rivens-types']) {
    assert.doesNotMatch(
      source,
      new RegExp(marker.replace(/[.[\]]/g, '\\$&') + '[\\s\\S]*?width\\s*:\\s*max-content'),
      marker + ' still uses max-content sizing',
    )
  }
})

test('Rivens state and sort filters keep their icons beside wrapping buttons', () => {
  const source = readSource('src/components/PreviewRivensLayout.jsx')

  const filterRule = source.match(/\[data-preview-rivens-state\],\s*\[data-preview-rivens-sort\]\s*{([\s\S]*?)\n        }/)?.[1]
  assert.ok(filterRule, 'state and sort filter CSS rule is present')
  assert.match(filterRule, /flex-wrap:\s*nowrap/)

  const innerRule = source.match(/\[data-preview-rivens-state\]\s*> div,\s*\[data-preview-rivens-sort\]\s*> div\s*{([\s\S]*?)\n        }/)?.[1]
  assert.ok(innerRule, 'state and sort inner button-group CSS rule is present')
  assert.match(innerRule, /flex:\s*1 1 0/)
  assert.match(innerRule, /min-width:\s*0/)

  const iconRule = source.match(/\[data-preview-rivens-state\]\s*> svg,\s*\[data-preview-rivens-sort\]\s*> svg\s*{([\s\S]*?)\n        }/)?.[1]
  assert.ok(iconRule, 'state and sort icon CSS rule is present')
  assert.match(iconRule, /flex:\s*0 0 auto/)
  assert.match(iconRule, /align-self:\s*flex-start/)
})

test('Rivens filter icons remain the first child of their filter rows', () => {
  const source = readSource('src/screens/Rivens.jsx')
  assert.match(source, /data-preview-rivens-state=\{IS_PREVIEW \? '' : undefined\}>\s*<Filter\b/)
  assert.match(source, /data-preview-rivens-sort=\{IS_PREVIEW \? '' : undefined\}>\s*<ArrowUpDown\b/)
})
