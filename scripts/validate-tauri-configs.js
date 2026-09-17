/**
 * Fails loudly if any tauri.*.conf.json in src-tauri/ is missing
 * app.security.assetProtocol.enable === true.
 *
 * Why this exists: a config file loaded via an explicit `--config` flag
 * (as tauri.preview.conf.json is, by scripts/run-preview.mjs) does NOT
 * reliably inherit nested security keys from the base tauri.conf.json -
 * confirmed twice now, on two different config files, the hard way: once
 * via a Cargo `protocol-asset` feature silently getting stripped on a
 * release-build override config, and once via every mod-card image in
 * Preview silently failing to load (falling back to a flaky remote CDN
 * mirror and 404ing) because tauri.preview.conf.json's own security block
 * never defined assetProtocol at all. Both were only found through live
 * runtime symptoms and manual devtools debugging - this check exists so
 * the NEXT config file that's missing this doesn't repeat that.
 *
 * Runs as part of `prebuild` (see package.json) so it fires on every
 * build automatically, not just when someone remembers to run it.
 */
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const SRC_TAURI = join(dirname(fileURLToPath(import.meta.url)), '..', 'src-tauri')

const configFiles = readdirSync(SRC_TAURI).filter(f => /^tauri(\..+)?\.conf\.json$/.test(f))

let failed = false
for (const file of configFiles) {
  const path = join(SRC_TAURI, file)
  let data
  try {
    data = JSON.parse(readFileSync(path, 'utf-8'))
  } catch (e) {
    console.error(`validate-tauri-configs: FAILED to parse ${file}: ${e.message}`)
    failed = true
    continue
  }
  const enabled = data?.app?.security?.assetProtocol?.enable
  if (enabled !== true) {
    console.error(`validate-tauri-configs: ${file} is missing app.security.assetProtocol.enable === true - any local asset (mod card art, cosmetic previews, etc.) will silently fail to load and fall back to a flaky remote mirror when this config is active.`)
    failed = true
  }
}

if (failed) {
  console.error('\nvalidate-tauri-configs: one or more Tauri config files are missing required security settings. Fix them before building - see the comment at the top of this script for why this matters.')
  process.exit(1)
} else {
  console.log(`validate-tauri-configs: OK (${configFiles.length} config file(s) checked)`)
}
