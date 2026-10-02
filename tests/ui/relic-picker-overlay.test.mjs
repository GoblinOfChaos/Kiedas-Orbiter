import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const overlayPath = path.join(root, 'src/components/overlays/RelicPickerOverlay.jsx')
const localeDir = path.join(root, 'src/lib/i18n')

test('relic picker localizes missing-part counts without translating canonical relic identifiers', () => {
  const source = fs.readFileSync(overlayPath, 'utf8')
  assert.match(source, /relic_picker\.parts_\$\{row\.missing\.count === 1 \? 'one' : 'other'\}/)
  assert.match(source, /<span className="text-sm font-black self-center"[^>]*>\s*\{row\.era\}/)
  assert.match(source, /\{item \? item\.name : '—'\}/)

  for (const file of fs.readdirSync(localeDir).filter((name) => name.endsWith('.json'))) {
    const locale = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf8'))
    assert.equal(typeof locale.ui?.['relic_picker.parts_one'], 'string', `${file} is missing singular part translation`)
    assert.equal(typeof locale.ui?.['relic_picker.parts_other'], 'string', `${file} is missing plural part translation`)
  }
})

test('known-era relic picker resizes to rendered content instead of the fixed tall window', () => {
  const source = fs.readFileSync(overlayPath, 'utf8')
  const knownEraSource = source.split('// Era unknown pre-mission')[0]
  assert.match(source, /resize_overlay_window/)
  assert.match(source, /knownEraContainerRef\.current\.scrollHeight/)
  assert.match(knownEraSource, /className="w-full min-h-0 bg-zinc-900 flex flex-col"/)
  assert.doesNotMatch(knownEraSource, /className="w-full h-full bg-zinc-900 flex flex-col">\s*<div className="flex-1 flex items-center justify-center p-4">/)
})
