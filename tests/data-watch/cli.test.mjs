import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { main } from '../../scripts/data-watch/cli.mjs'

test('CLI kill switch exits successfully without touching state', async () => {
  const code = await main({ env: { DATA_WATCH_DISABLED: 'true' }, argv: ['--state', '/tmp/should-not-exist-data-watch.json'] })
  assert.equal(code, 0)
})

test('CLI records a silent first-run baseline, then returns unchanged', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'data-watch-cli-'))
  const statePath = join(directory, 'state.json')
  const fixtureSource = { id: 'fixture', title: 'Fixture', host: 'fixture', probe: async () => ({ ok: true, fingerprint: 'same', detail: {} }) }
  const dependencies = { sources: [fixtureSource] }
  const first = await main({ argv: ['--state', statePath, '--dry-run'], env: {}, dependencies })
  assert.equal(first, 0)
  await assert.rejects(access(statePath))
  const recorded = await main({ argv: ['--state', statePath, '--no-issues'], env: {}, dependencies })
  assert.equal(recorded, 0)
  assert.ok(JSON.parse(await readFile(statePath, 'utf8')).sources.fixture)
  const second = await main({ argv: ['--state', statePath, '--no-issues'], env: {}, dependencies })
  assert.equal(second, 0)
})

test('CLI dry-run does not write state even when there is a change', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'data-watch-cli-'))
  const statePath = join(directory, 'state.json')
  const dependencies = { sources: [{ id: 'fixture', title: 'Fixture', host: 'fixture', probe: async () => ({ ok: true, fingerprint: 'new', detail: {} }) }] }
  await main({ argv: ['--state', statePath, '--dry-run'], env: {}, dependencies })
  await assert.rejects(access(statePath))
})

test('CLI maps changed data to 10 and expected probe reachability to 30', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'data-watch-cli-'))
  const changedPath = join(directory, 'changed.json')
  const changed = { sources: { fixture: { fingerprint: 'old', consecutiveFailures: 0 } } }
  await import('node:fs/promises').then(({ writeFile }) => writeFile(changedPath, JSON.stringify(changed)))
  const changedCode = await main({ argv: ['--state', changedPath, '--no-issues'], env: {}, dependencies: { sources: [{ id: 'fixture', title: 'Fixture', host: 'fixture', probe: async () => ({ ok: true, fingerprint: 'new', detail: {} }) }] } })
  assert.equal(changedCode, 10)

  const errorPath = join(directory, 'error.json')
  await import('node:fs/promises').then(({ writeFile }) => writeFile(errorPath, JSON.stringify({ sources: { fixture: { fingerprint: 'old', consecutiveFailures: 2 } } })))
  const errorCode = await main({ argv: ['--state', errorPath, '--no-issues'], env: {}, dependencies: { sources: [{ id: 'fixture', title: 'Fixture', host: 'fixture', probe: async () => ({ ok: false, error: 'offline' }) }] } })
  assert.equal(errorCode, 30)
})

test('CLI propagates corrupt state as an unexpected error', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'data-watch-cli-'))
  const statePath = join(directory, 'state.json')
  await import('node:fs/promises').then(({ writeFile }) => writeFile(statePath, '{broken'))
  await assert.rejects(main({ argv: ['--state', statePath], env: {}, dependencies: { sources: [] } }), /Expected property name/)
  const processResult = spawnSync(process.execPath, ['scripts/data-watch/cli.mjs', '--state', statePath], { encoding: 'utf8' })
  assert.equal(processResult.status, 1)
  assert.match(processResult.stderr, /Expected property name/)
})
