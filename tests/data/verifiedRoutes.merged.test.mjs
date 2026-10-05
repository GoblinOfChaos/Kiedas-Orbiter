import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

test('the bundled verified-routes.json equals the merge of the group files', () => {
  const result = spawnSync('python3', ['scripts/merge-verified-routes.py', '--check'], { cwd: root, encoding: 'utf8' })
  assert.equal(result.status, 0, String(result.stderr || result.stdout).slice(0, 500))
})
