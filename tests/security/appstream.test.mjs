import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8')
const json = (file) => JSON.parse(read(file))
const base = json('src-tauri/tauri.conf.json')
const linux = json('src-tauri/tauri.linux.conf.json')
const preview = json('src-tauri/tauri.preview.conf.json')

// RFC 7396 merge patch, which is how the app config files are layered (null removes a key).
function merge(target, patch) {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) return patch
  const result = { ...(target && typeof target === 'object' && !Array.isArray(target) ? target : {}) }
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete result[key]
    else result[key] = merge(result[key], value)
  }
  return result
}

const stableId = 'com.jacob.kiedasorbiter'
const previewId = 'com.jacob.kiedasorbiter.preview'

test('metainfo files exist and carry the matching app id, license and desktop launchable', () => {
  for (const [id, config] of [[stableId, base], [previewId, preview]]) {
    assert.equal(config.identifier, id)
    const xml = read('src-tauri/linux/' + id + '.metainfo.xml')
    assert.ok(xml.includes('<id>' + id + '</id>'))
    assert.match(xml, /<project_license>MIT<\/project_license>/)
    assert.match(xml, /<metadata_license>CC0-1.0<\/metadata_license>/)
    assert.match(xml, /<launchable type="desktop-id">/)
  }
})

test('a Preview Linux build ships only the Preview metainfo; a Stable Linux build ships only the Stable one', () => {
  const stable = merge(merge({}, base), linux)
  const previewBuild = merge(merge(merge({}, base), linux), preview)
  const stableFiles = Object.keys(stable.bundle.linux.appimage.files)
  const previewFiles = Object.keys(previewBuild.bundle.linux.appimage.files)
  assert.deepEqual(stableFiles, ['usr/share/metainfo/' + stableId + '.metainfo.xml'])
  assert.deepEqual(previewFiles, ['usr/share/metainfo/' + previewId + '.metainfo.xml'])
  for (const source of Object.values(previewBuild.bundle.linux.appimage.files)) assert.ok(fs.existsSync(path.resolve('src-tauri', source)), source)
  for (const source of Object.values(stable.bundle.linux.appimage.files)) assert.ok(fs.existsSync(path.resolve('src-tauri', source)), source)
})
