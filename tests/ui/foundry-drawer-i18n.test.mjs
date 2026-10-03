import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { renderToString } from 'react-dom/server'
import React from 'react'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
globalThis.window ??= { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) }
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} }
globalThis.__TAURI_INTERNALS__ ??= { transformCallback: () => 0, unregisterCallback() {}, invoke: async () => null, convertFileSrc: (value) => value, metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main', currentWindow: { label: 'main' } } } }
globalThis.window.__TAURI_INTERNALS__ = globalThis.__TAURI_INTERNALS__
const localesDir = path.join(root, 'src/lib/i18n')
const requestedUiKeys = [
  'settings.hotkey_action_grade_rivens',
  'ui.riven_prompt.title',
  'ui.riven_prompt.press',
  'ui.riven_prompt.action',
  'ui.riven_prompt.hint',
  'ui.riven_prompt.configure_hotkey',
  'farming_targets.corrupt_warning',
]

const readHeadLocale = (locale) => {
  try {
    return JSON.parse(execFileSync(
      'git', ['show', `HEAD:src/lib/i18n/${locale}.json`], { cwd: root, encoding: 'utf8' },
    ))
  } catch (error) {
    // Node 24 can report EPERM after receiving successful git output in this
    // managed runner; preserve the output rather than hiding a real git error.
    if (error.status === 0 && error.stdout) return JSON.parse(error.stdout)
    throw error
  }
}

const assertUiKeyContract = (directory = localesDir) => {
  for (const file of fs.readdirSync(directory).filter((name) => name.endsWith('.json'))) {
    const locale = path.basename(file, '.json')
    const current = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'))
    const head = readHeadLocale(locale)
    const expectedKeys = new Set([...Object.keys(head.ui), ...requestedUiKeys])
    assert.deepEqual(
      Object.keys(current.ui).sort(),
      [...expectedKeys].sort(),
      `${file} ui key set differs from HEAD plus moved keys`,
    )
    for (const key of Object.keys(head.ui)) {
      assert.deepEqual(current.ui[key], head.ui[key], `${file} changed existing ui.${key}`)
    }
    for (const key of requestedUiKeys) {
      assert.deepEqual(current.ui[key], head[key], `${file} changed moved ${key}`)
    }
  }
}

test('every locale preserves HEAD ui keys and contains all moved ui keys', () => {
  assertUiKeyContract()
})

test('the HEAD-based contract catches the prior fr nav.market loss', () => {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'foundry-i18n-'))
  try {
    for (const file of fs.readdirSync(localesDir).filter((name) => name.endsWith('.json'))) {
      fs.copyFileSync(path.join(localesDir, file), path.join(copy, file))
    }
    const frPath = path.join(copy, 'fr.json')
    const fr = JSON.parse(fs.readFileSync(frPath, 'utf8'))
    delete fr.ui['nav.market']
    fs.writeFileSync(frPath, `${JSON.stringify(fr, null, 2)}\n`)
    assert.throws(() => assertUiKeyContract(copy), /fr\.json ui key set differs from HEAD plus moved keys/)
  } finally {
    fs.rmSync(copy, { recursive: true, force: true })
  }
})

test('all referenced dotted UI keys resolve from every locale ui object', () => {
  const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'))
  const sourceKeys = new Set()
  const dottedCall = /\bt\(\s*['"]([^'"]+\.[^'"]+)['"]\s*[,)]/g
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name)
      if (entry.isDirectory()) walk(file)
      else if (/\.(jsx|js)$/.test(entry.name)) {
        const source = fs.readFileSync(file, 'utf8')
        let match
        while ((match = dottedCall.exec(source))) sourceKeys.add(match[1])
      }
    }
  }
  walk(path.join(root, 'src'))
  for (const key of sourceKeys) assert.ok(en.ui?.[key], `en.json missing ui.${key}`)
  for (const file of fs.readdirSync(localesDir).filter((name) => name.endsWith('.json'))) {
    const locale = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'))
    for (const key of requestedUiKeys) assert.ok(locale.ui?.[key], `${file} missing ui.${key}`)
    for (const key of Object.keys(locale).filter((key) => key.includes('.'))) {
      assert.notEqual(key, 'nav.market', `${file} leaves nav.market at top level`)
      assert.notEqual(key, 'settings.hotkey_action_grade_rivens', `${file} leaves ${key} at top level`)
      assert.notEqual(key, 'ui.riven_prompt.title', `${file} leaves ${key} at top level`)
      assert.notEqual(key, 'ui.riven_prompt.press', `${file} leaves ${key} at top level`)
      assert.notEqual(key, 'ui.riven_prompt.action', `${file} leaves ${key} at top level`)
      assert.notEqual(key, 'ui.riven_prompt.hint', `${file} leaves ${key} at top level`)
      assert.notEqual(key, 'ui.riven_prompt.configure_hotkey', `${file} leaves ${key} at top level`)
      assert.notEqual(key, 'farming_targets.corrupt_warning', `${file} leaves ${key} at top level`)
    }
  }
  assert.equal(en.ui['settings.hotkey_action_grade_rivens'], 'Grade Rivens')
})

test('RecipeDrawer SSR includes a wired backdrop and panel propagation guard', async () => {
  const viteRequire = createRequire(createRequire(import.meta.url).resolve('vite'))
  const { build } = viteRequire('esbuild')
  const entry = path.join(root, 'tests/ui/foundry-entry.jsx')
  const result = await build({
    entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic',
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.webp': 'empty', '.ttf': 'empty', '.woff2': 'empty' },
    define: { 'import.meta.env.MODE': '"preview"', 'import.meta.env': '{"MODE":"preview"}' },
    packages: 'external',
    plugins: [{ name: 'stub-vite-files', setup(buildApi) {
      buildApi.onResolve({ filter: /\?(worker|url|raw)$/ }, (args) => ({ path: args.path, namespace: 'vite-stub' }))
      buildApi.onLoad({ filter: /.*/, namespace: 'vite-stub' }, () => ({ contents: 'export default class {}', loader: 'js' }))
      buildApi.onLoad({ filter: /src[\\/]lib[\\/]i18n\.js$/ }, (args) => ({ contents: fs.readFileSync(args.path, 'utf8').replace(/import\.meta\.glob\([^)]*\)/g, '{}'), loader: 'js' }))
    } }],
  })
  const cacheDir = path.join(root, 'tests/.cache/foundry-ui-ssr')
  fs.mkdirSync(cacheDir, { recursive: true })
  const output = path.join(cacheDir, 'drawer.mjs')
  fs.writeFileSync(output, result.outputFiles[0].text)
  const { RecipeDrawer, UiContext } = await import(pathToFileURL(output).href)
  const drawer = React.createElement(RecipeDrawer, {
    item: { name: 'Test Item', image: '', unique_name: '/Test', category: 'primary' },
    recipe: null, onClose: () => {}, t: (key) => key, variant: 'panel',
  })
  const html = renderToString(React.createElement(UiContext.Provider, { value: { t: (key) => key, ui: {}, locale: 'en', ready: true, i18nData: null } }, drawer))
  assert.match(html, /preview-acq-backdrop/)
  const source = fs.readFileSync(path.join(root, 'src/screens/Foundry.jsx'), 'utf8')
  assert.match(source, /onClick=\{\(event\) => event\.stopPropagation\(\)\}/)
})

test('RecipeDrawer source registers Escape dismissal for both drawer variants', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/Foundry.jsx'), 'utf8')
  assert.match(source, /event\.key !== 'Escape'/)
  assert.match(source, /document\.addEventListener\('keydown', onKeyDown\)/)
  assert.match(source, /className="preview-acq-backdrop" onClick=\{onClose\}/)
})
