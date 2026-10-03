import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

globalThis.window ??= Object.assign(globalThis, { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) })
globalThis.__TAURI_INTERNALS__ ??= { transformCallback: () => 0, unregisterCallback() {}, invoke: async () => null, convertFileSrc: (value) => value, metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main', windowLabel: 'main' } } }

const viteRequire = createRequire(createRequire(import.meta.url).resolve('vite'))
const { build } = viteRequire('esbuild')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const tauriStub = path.join(root, 'tests/ui/tauri-stub.mjs')
const layoutSource = process.env.B9_LAYOUT_SOURCE ?? path.join(root, 'src/components/PreviewInventoryLayout.jsx')

const bundle = await build({
  entryPoints: [path.join(root, 'src/screens/Inventory.jsx')],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  jsx: 'automatic',
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.webp': 'empty', '.ttf': 'empty', '.woff2': 'empty' },
  define: { 'import.meta.env.MODE': '"preview"', 'import.meta.env': '{"MODE":"preview"}' },
  packages: 'external',
  alias: { '@tauri-apps/api/core': tauriStub },
  plugins: [{
    name: 'vite-only-stubs',
    setup(buildApi) {
      buildApi.onResolve({ filter: /^\.\.\/contexts\/UiContext$/ }, (args) => ({ path: path.join(root, 'src/contexts/UiContext.jsx') }))
      buildApi.onResolve({ filter: /\?(worker|url|raw)$/ }, (args) => ({ path: args.path, namespace: 'vite-stub' }))
      buildApi.onLoad({ filter: /.*/, namespace: 'vite-stub' }, () => ({ contents: 'export default class {}', loader: 'js' }))
      buildApi.onLoad({ filter: /src[\\/]lib[\\/]i18n\.js$/ }, (args) => ({ contents: fs.readFileSync(args.path, 'utf8').replace(/import\.meta\.glob\([^)]*\)/g, '{}'), loader: 'js' }))
    },
  }],
})

const cacheDir = path.join(root, 'tests/.cache/inventory-currency-strip')
fs.mkdirSync(cacheDir, { recursive: true })
const file = path.join(fs.mkdtempSync(path.join(cacheDir, 'run-')), 'inventory.mjs')
const output = bundle.outputFiles[0].text.replace('export default Inventory;', 'export { Inventory as default, renderHeaderStats, renderFormaTooltipContent };')
fs.writeFileSync(file, output)
const inventory = await import(pathToFileURL(file).href)

const layoutBundle = await build({
  stdin: {
    contents: `import PreviewInventoryLayout from ${JSON.stringify(layoutSource)}; import { UiContext } from ${JSON.stringify(path.join(root, 'src/contexts/UiContext.jsx'))}; export { PreviewInventoryLayout, UiContext };`,
    resolveDir: root,
    loader: 'jsx',
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  jsx: 'automatic',
  define: { 'import.meta.env.MODE': '"preview"', 'import.meta.env': '{"MODE":"preview"}' },
  plugins: [{
    name: 'vite-only-stubs',
    setup(buildApi) {
      buildApi.onResolve({ filter: /^\.\.\/contexts\/UiContext$/ }, () => ({ path: path.join(root, 'src/contexts/UiContext.jsx') }))
      buildApi.onResolve({ filter: /\?(worker|url|raw)$/ }, (args) => ({ path: args.path, namespace: 'vite-stub' }))
      buildApi.onLoad({ filter: /.*/, namespace: 'vite-stub' }, () => ({ contents: 'export default class {}', loader: 'js' }))
      buildApi.onLoad({ filter: /src[\\/]lib[\\/]i18n\.js$/ }, (args) => ({ contents: fs.readFileSync(args.path, 'utf8').replace(/import\.meta\.glob\([^)]*\)/g, '{}'), loader: 'js' }))
    },
  }],
  packages: 'external',
})
const layoutFile = path.join(fs.mkdtempSync(path.join(cacheDir, 'run-')), 'layout.mjs')
fs.writeFileSync(layoutFile, layoutBundle.outputFiles[0].text)
const layout = await import(pathToFileURL(layoutFile).href)

globalThis.window ??= Object.assign(globalThis, { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) })
globalThis.__TAURI_INTERNALS__ ??= { transformCallback: () => 0, unregisterCallback() {}, invoke: async () => null, convertFileSrc: (value) => value, metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main', currentWindow: { label: 'main' }, windowLabel: 'main' } } }

export const PreviewInventoryLayout = { Component: layout.PreviewInventoryLayout, UiContext: layout.UiContext }
export const renderInventoryModules = { ...inventory, UiContext: layout.UiContext }
