/**
 * Copy warframe-items JSON files from node_modules into src-tauri/data/assets/wfcd/
 * so they get bundled as Tauri resources (no Vite/Rollup involvement).
 *
 * Runs as a `prebuild` script — always in sync with the warframe-items
 * version in package.json.  Idempotent: overwrites existing files.
 */
import { copyFileSync, mkdirSync, readdirSync } from 'fs'
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

let count = 0
for (const file of FILES) {
  const src = join(SRC, file)
  const dest = join(DEST, file)
  try {
    copyFileSync(src, dest)
    count++
  } catch (e) {
    console.warn(`sync-wfcd: could not copy ${file}: ${e.message}`)
  }
}

console.log(`sync-wfcd: copied ${count}/${FILES.length} files to ${DEST}/`)
