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
    assert.doesNotMatch(source, /overflow-x\s*:\s*(?:auto|scroll)/, `${relativePath} has CSS horizontal scrolling`)
    assert.doesNotMatch(source, /overflow-x-(?:auto|scroll)/, `${relativePath} has utility horizontal scrolling`)
  }
})

test('Rivens filter rows wrap without max-content sizing', () => {
  const source = readSource('src/components/PreviewRivensLayout.jsx')
  for (const marker of ['[data-preview-rivens-state]', '[data-preview-rivens-sort]', '.preview-rivens-types']) {
    assert.doesNotMatch(
      source,
      new RegExp(`${marker.replace(/[.[\]]/g, '\\$&')}[\\s\\S]*?width\\s*:\\s*max-content`),
      `${marker} still uses max-content sizing`,
    )
  }
})
