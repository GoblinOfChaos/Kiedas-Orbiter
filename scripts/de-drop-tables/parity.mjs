import fs from 'node:fs'
import path from 'node:path'
import { normalizedDropRows } from '../../src/lib/deDropTables/convert.js'

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')) }

function rowsFromOld(value) {
  const rows = []
  const visit = (node, context = {}) => {
    if (Array.isArray(node)) return node.forEach((entry) => visit(entry, context))
    if (!node || typeof node !== 'object') return
    if (typeof node.itemName === 'string' && typeof node.chance === 'number') {
      rows.push({ item: node.itemName, source: context.source || node.enemyName || '', rotation: context.rotation || node.rotation || null, chance: node.chance / 100 })
    }
    for (const [key, child] of Object.entries(node)) {
      if (key === 'rewards' && child && typeof child === 'object' && !Array.isArray(child)) {
        for (const [rotation, entries] of Object.entries(child)) visit(entries, { ...context, rotation: rotation === 'A' ? null : rotation })
      } else if (key !== 'itemName' && key !== 'chance') visit(child, { ...context, source: context.source || key })
    }
  }
  visit(value)
  return rows
}

function key(row) { return `${row.item.toLowerCase()}\u0000${row.source.toLowerCase()}\u0000${row.rotation || ''}` }
function index(rows) {
  const result = new Map()
  for (const row of rows) result.set(key(row), row)
  return result
}

const [oldPath, newPath] = process.argv.slice(2)
if (!oldPath || !newPath) {
  console.error('Usage: nice -n 19 node scripts/de-drop-tables/parity.mjs <old-DropsAll.json> <new-DropTables.json>')
  process.exitCode = 2
} else {
  const oldRows = rowsFromOld(readJson(oldPath))
  const newRows = normalizedDropRows(readJson(newPath))
  const oldIndex = index(oldRows)
  const newIndex = index(newRows)
  const onlyOld = [...oldIndex.keys()].filter((key) => !newIndex.has(key)).map((key) => oldIndex.get(key))
  const onlyNew = [...newIndex.keys()].filter((key) => !oldIndex.has(key)).map((key) => newIndex.get(key))
  const chanceDifferences = []
  for (const [key, oldRow] of oldIndex) {
    const newRow = newIndex.get(key)
    if (newRow && Math.abs(oldRow.chance - newRow.chance) > 1e-9) chanceDifferences.push({ ...oldRow, newChance: newRow.chance })
  }
  const report = {
    old: { path: path.resolve(oldPath), rows: oldRows.length },
    new: { path: path.resolve(newPath), rows: newRows.length },
    onlyInOld: onlyOld,
    onlyInNew: onlyNew,
    chanceDifferences,
    summary: { onlyInOld: onlyOld.length, onlyInNew: onlyNew.length, chanceDifferences: chanceDifferences.length },
  }
  console.log(JSON.stringify(report, null, 2))
}
