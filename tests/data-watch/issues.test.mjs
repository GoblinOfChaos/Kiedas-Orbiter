import test from 'node:test'
import assert from 'node:assert/strict'
import { syncIssues } from '../../scripts/data-watch/issues.mjs'

const event = { kind: 'data-update', sourceId: 'wiki-modules', title: 'Wiki changed', body: '- **wiki-modules**: changed' }

test('issues creates a marked issue and labels it', async () => {
  const calls = []
  await syncIssues({ events: [event], ownerRepo: 'owner/repo', gh: async (args) => { calls.push(args); return args[0] === 'issue' && args[1] === 'list' ? '[]' : '' } })
  assert.ok(calls.some((args) => args.includes('create')))
  assert.ok(calls.some((args) => args.includes('data-update')))
})

test('issues updates an existing marker and comments only when summary changes', async () => {
  const calls = []
  const old = `<!-- data-watch:data-update:wiki-modules -->\n\n-old summary`
  await syncIssues({ events: [event], ownerRepo: 'owner/repo', gh: async (args) => { calls.push(args); return args[0] === 'issue' && args[1] === 'list' ? JSON.stringify([{ number: 9, body: old }]) : '' } })
  assert.ok(calls.some((args) => args.includes('edit')))
  assert.ok(calls.some((args) => args.includes('comment')))
  assert.ok(!calls.some((args) => args[0] === 'issue' && args[1] === 'create'))
})

test('issues does not comment when the summary line is unchanged', async () => {
  const calls = []
  const old = `<!-- data-watch:data-update:wiki-modules -->\n\n${event.body}`
  await syncIssues({ events: [event], ownerRepo: 'owner/repo', gh: async (args) => { calls.push(args); return args[0] === 'issue' && args[1] === 'list' ? JSON.stringify([{ number: 9, body: old }]) : '' } })
  assert.ok(!calls.some((args) => args[0] === 'issue' && args[1] === 'comment'))
})

test('issues closes a recovered source-unreachable issue with a comment', async () => {
  const calls = []
  await syncIssues({ events: [{ kind: 'resolved', sourceId: 'wiki-modules', title: 'Wiki' }], ownerRepo: 'owner/repo', gh: async (args) => { calls.push(args); return args[0] === 'issue' && args[1] === 'list' ? JSON.stringify([{ number: 4, body: '<!-- data-watch:source-unreachable:wiki-modules -->' }]) : '' } })
  assert.ok(calls.some((args) => args.includes('Source recovered')))
  assert.ok(calls.some((args) => args[0] === 'issue' && args[1] === 'close'))
})

test('issues neutralizes mentions and truncates bodies', async () => {
  const calls = []
  await syncIssues({ events: [{ ...event, title: '@octocat', body: 'x'.repeat(100_000) }], ownerRepo: 'owner/repo', gh: async (args) => { calls.push(args); return args[0] === 'issue' && args[1] === 'list' ? '[]' : '' } })
  const create = calls.find((args) => args[0] === 'issue' && args[1] === 'create')
  assert.match(create[create.indexOf('--title') + 1], /@\u200boctocat/)
  assert.ok(create[create.indexOf('--body') + 1].length <= 60_000)
})

test('issues dry-run prints commands and never invokes gh', async () => {
  const printed = []
  await syncIssues({ events: [event], dryRun: true, print: (line) => printed.push(line), gh: async () => { throw new Error('must not call gh') } })
  assert.ok(printed.some((line) => line.startsWith('gh label create')))
  assert.ok(printed.some((line) => line.startsWith('gh issue list')))
})
