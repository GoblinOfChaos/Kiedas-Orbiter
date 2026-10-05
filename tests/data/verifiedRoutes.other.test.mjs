import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const scope = JSON.parse(readFileSync(path.join(root, 'docs/agent-context/briefs-2026-10-03/data/zero-other.json'), 'utf8'))
const resolved = JSON.parse(readFileSync(path.join(root, 'src-tauri/data/assets/data/verified-routes.other.json'), 'utf8'))
const unresolved = JSON.parse(readFileSync(path.join(root, 'src-tauri/data/assets/data/verified-routes.other.unresolved.json'), 'utf8'))
const allKeys = new Set(scope.map((entry) => entry.uniqueName))
const kinds = new Set(['drop', 'vendor', 'market', 'quest', 'event', 'crafting', 'reward', 'not_obtainable'])
const history = /(?:19|20)\d{2}|Update\s+\d|originally|formerly|first available|previously/i
const notObtainableProof = /\b(?:not obtainable|no longer|no way to obtain|unavailable|discontinued|retired|previously obtainable|remain exclusive)\b/i

test('other verified routes are complete and mutually exclusive', () => {
  assert.equal(Object.keys(resolved).length + Object.keys(unresolved).length, scope.length)
  const actual = new Set([...Object.keys(resolved), ...Object.keys(unresolved)])
  const missing = [...allKeys].filter((key) => !actual.has(key))
  const extra = [...actual].filter((key) => !allKeys.has(key))
  assert.equal(missing.length + extra.length, 0, `scope mismatch: missing=${missing.slice(0, 25).join(', ')} extra=${extra.slice(0, 25).join(', ')}`)
  for (const key of Object.keys(resolved)) assert.equal(Object.hasOwn(unresolved, key), false, key)
})

test('other resolved routes have structured, current-only text', () => {
  for (const [key, entry] of Object.entries(resolved)) {
    assert.ok(entry.name, key)
    assert.ok(Array.isArray(entry.routes) && entry.routes.length > 0, key)
    for (const route of entry.routes) {
      assert.ok(kinds.has(route.kind), `${key}: ${route.kind}`)
      assert.ok(route.text && route.text.length <= 200, key)
      assert.equal(history.test(route.text), false, `${key}: ${route.text}`)
      assert.equal(/[={{|}}]/.test(route.text), false, `${key}: ${route.text}`)
      assert.ok(route.place, key)
      assert.ok(route.source?.archive === 'wiki_pdf_archive', key)
      assert.ok(route.source?.page && route.source?.url && route.source?.quote, key)
      assert.equal(route.source.url, `https://wiki.warframe.com/w/${route.source.page.replaceAll(' ', '_')}`, key)
      if (route.kind === 'not_obtainable') assert.ok(notObtainableProof.test(route.source.quote) || /^Nightwave\//i.test(route.source.page), `${key}: unproven not_obtainable route`)
      if (route.price) {
        assert.equal(typeof route.price.amount, 'number', key)
        assert.ok(route.price.amount >= 0 && route.price.currency, key)
      }
    }
  }
})

test('other unresolved entries explain the evidence gap', () => {
  for (const [key, entry] of Object.entries(unresolved)) {
    assert.ok(entry.name && entry.reason, key)
    assert.ok(Array.isArray(entry.pagesChecked) && entry.pagesChecked.length > 0, key)
  }
})

test('small squad restores preserve both documented Market blueprint routes', () => {
  const restoreKeys = [
    '/Lotus/Types/Restoratives/TeamAmmoTotem',
    '/Lotus/Types/Restoratives/TeamEnergyTotem',
    '/Lotus/Types/Restoratives/TeamHeal',
    '/Lotus/Types/Restoratives/TeamHealTotem',
    '/Lotus/Types/Restoratives/TeamShieldTotem',
  ]
  for (const key of restoreKeys) {
    const routes = resolved[key].routes
    assert.equal(routes.length, 2, key)
    assert.deepEqual(routes.map((route) => route.kind), ['market', 'market'], key)
    assert.deepEqual(routes.map((route) => route.price), [
      { amount: 500, currency: 'Credits' },
      { amount: 250000, currency: 'Credits' },
    ], key)
    assert.match(routes[0].text, /1x blueprint/)
    assert.match(routes[1].text, /10x blueprint/)
  }
})

test('python archive verifier passes when the local archive exists', (t) => {
  const archive = '/home/jedwards/kiedas-orbiter/wiki_pdf_archive'
  if (!existsSync(archive)) {
    t.skip('wiki archive is not present')
    return
  }
  const result = spawnSync('python3', [path.join(root, 'scripts/verify-verified-routes.py'), '--group', 'other'], { encoding: 'utf8' })
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
})
