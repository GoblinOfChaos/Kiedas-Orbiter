import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
globalThis.window ??= { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) }
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} }
globalThis.__TAURI_INTERNALS__ ??= { transformCallback: () => 0, unregisterCallback() {}, invoke: async () => null, convertFileSrc: (value) => value, metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main', currentWindow: { label: 'main' } } } }
globalThis.window.__TAURI_INTERNALS__ = globalThis.__TAURI_INTERNALS__
const viteRequire = createRequire(createRequire(import.meta.url).resolve('vite'))
const { build } = viteRequire('esbuild')

async function loadGetSourceLabel() {
  const result = await build({
    entryPoints: [path.join(root, 'src/components/AcquisitionDrawer.jsx')],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    jsx: 'automatic',
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.webp': 'empty' },
    define: { 'import.meta.env.MODE': '"preview"', 'import.meta.env': '{"MODE":"preview"}' },
    packages: 'external',
    plugins: [{ name: 'stub-vite-files', setup(buildApi) {
      buildApi.onResolve({ filter: /\?(worker|url|raw)$/ }, (args) => ({ path: args.path, namespace: 'vite-stub' }))
      buildApi.onLoad({ filter: /.*/, namespace: 'vite-stub' }, () => ({ contents: 'export default class {}', loader: 'js' }))
      buildApi.onLoad({ filter: /src[\\/]lib[\\/]i18n\.js$/ }, (args) => ({ contents: fs.readFileSync(args.path, 'utf8').replace(/import\.meta\.glob\([^)]*\)/g, '{}'), loader: 'js' }))
    } }],
  })
  const output = path.join(root, 'tests/.cache/acquisition-drawer-labels.mjs')
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, result.outputFiles[0].text)
  return (await import(`${pathToFileURL(output).href}?${Date.now()}`)).getSourceLabel
}

test('relic source labels use readable Common, Uncommon, and Rare translations', async () => {
  const getSourceLabel = await loadGetSourceLabel()
  const en = JSON.parse(fs.readFileSync(path.join(root, 'src/lib/i18n/en.json'), 'utf8'))
  const ui = { ...en.ui }
  const t = (key) => ui[key] ?? key
  for (const [rarity, expected] of [['RARE', 'Rare'], ['UNCOMMON', 'Uncommon'], ['COMMON', 'Common']]) {
    const label = getSourceLabel({ type: 'relic', relicName: 'Axi A1', rarity }, t)
    assert.match(label, new RegExp(`\\(${expected}\\)$`))
    assert.doesNotMatch(label, /relic_rarity/)
  }
})
