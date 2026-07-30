/**
 * Copy warframe-items JSON files from node_modules into a single combined file
 * at src-tauri/data/assets/wfcd/wfcd-combined.json so the frontend needs only
 * one read_file_bytes call at startup instead of 21 individual IPC reads.
 *
 * The output is a JSON object keyed by the file names used in
 * warframeItemsTransform.js (Warframes, Primary, Secondary, …).
 *
 * Runs as a `prebuild` script — always in sync with the warframe-items
 * version in package.json.  Idempotent: overwrites existing files.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const SRC = 'node_modules/warframe-items/data/json'
const DEST = 'src-tauri/data/assets/wfcd'

const FILES = [
  'Warframes.json',
  'Primary.json',
  'Secondary.json',
  'Melee.json',
  'Arch-Gun.json',
  'Arch-Melee.json',
  'Archwing.json',
  'Railjack.json',
  'SentinelWeapons.json',
  'Sentinels.json',
  'Pets.json',
  'Mods.json',
  'Arcanes.json',
  'Resources.json',
  'Relics.json',
  'Gear.json',
  'Misc.json',
  'Skins.json',
  'Sigils.json',
  'Glyphs.json',
  'Fish.json',
]

mkdirSync(DEST, { recursive: true })

const combined = {}
let count = 0
for (const file of FILES) {
  const src = join(SRC, file)
  try {
    const raw = readFileSync(src, 'utf-8')
    // Use the filename stem as the key (e.g. "Warframes", "Primary")
    const key = file.replace(/\.json$/, '')
    combined[key] = JSON.parse(raw)
    count++
  } catch (e) {
    console.warn(`sync-wfcd: could not read ${file}: ${e.message}`)
  }
}

writeFileSync(join(DEST, 'wfcd-combined.json'), JSON.stringify(combined))
console.log(`sync-wfcd: combined ${count}/${FILES.length} files into ${DEST}/wfcd-combined.json (${Object.keys(combined).length} keys)`)
