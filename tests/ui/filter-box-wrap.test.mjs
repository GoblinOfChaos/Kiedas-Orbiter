import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8')

// Same approach as the Rivens filters (#41): in Preview the box has a minimum height instead of a
// fixed one and its button row wraps, so filter buttons are never clipped at narrow widths.
const boxes = [
  ['src/screens/Inventory.jsx', 'data-preview-inventory-filters'],
  ['src/screens/Inventory.jsx', 'data-preview-inventory-sort'],
  ['src/screens/Mods.jsx', 'data-preview-mods-filters'],
  ['src/screens/Mods.jsx', 'data-preview-mods-sort'],
  ['src/screens/Cosmetics.jsx', 'data-preview-cosmetics-sort'],
]

for (const [file, marker] of boxes) {
  test(marker + ' wraps in Preview and keeps its fixed height only in Stable', () => {
    const source = read(file)
    const at = source.indexOf(marker)
    assert.ok(at > 0, marker + ' is present in ' + file)
    const box = source.slice(source.lastIndexOf('<div', at), at)
    assert.match(box, /IS_PREVIEW \? 'min-h-(?:\[42px\]|9) min-w-0 max-w-full' : 'h-(?:\[42px\]|9)'/)
    assert.doesNotMatch(box, /className="[^"]*\bh-(?:\[42px\]|9)\b/)
    const row = source.slice(at, at + 700)
    assert.match(row, /flex gap-1 \$\{IS_PREVIEW \? 'flex-wrap min-w-0' : ''\}/)
  })
}
