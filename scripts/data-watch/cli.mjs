#!/usr/bin/env node

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { sources } from './sources.mjs'
import { runProbes } from './probe.mjs'
import { classify } from './report.mjs'
import { syncIssues } from './issues.mjs'

export const EXIT_CODES = { ok: 0, changed: 10, problem: 30, unexpected: 1 }

function argsOf(argv) {
  const args = { statePath: 'state.json', dryRun: false, noIssues: false, only: null }
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--state') args.statePath = argv[++index]
    else if (argv[index] === '--dry-run') args.dryRun = true
    else if (argv[index] === '--no-issues') args.noIssues = true
    else if (argv[index] === '--only') args.only = argv[++index].split(',').filter(Boolean)
  }
  return args
}

async function loadState(path) {
  try { return JSON.parse(await readFile(path, 'utf8')) } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return { formatVersion: 1, sources: {} }
  }
}

async function writeStateAtomic(path, state) {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.tmp-${process.pid}`
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`)
  await rename(temporary, path)
}

export async function main({ argv = process.argv.slice(2), env = process.env, dependencies = {} } = {}) {
  if (env.DATA_WATCH_DISABLED === 'true') {
    console.log('data-watch disabled by DATA_WATCH_DISABLED=true')
    return EXIT_CODES.ok
  }
  const options = argsOf(argv)
  const availableSources = dependencies.sources || sources
  const selected = options.only ? availableSources.filter((source) => options.only.includes(source.id)) : availableSources
  const state = await loadState(resolve(options.statePath))
  const { results, nextState } = await runProbes({
    sources: selected,
    state,
    fetchImpl: dependencies.fetchImpl || globalThis.fetch,
    sleep: dependencies.sleep,
    now: dependencies.now || Date.now,
    context: dependencies.context,
  })
  const sourceTitles = Object.fromEntries(selected.map((source) => [source.id, source.title]))
  const events = classify(results, sourceTitles)
  if (!options.dryRun && !options.noIssues) {
    await syncIssues({ events, gh: dependencies.gh || (async (ghArgs) => {
      const { execFile } = await import('node:child_process')
      const { promisify } = await import('node:util')
      const run = promisify(execFile)
      const result = await run('gh', ghArgs)
      return result.stdout
    }), dryRun: false })
  } else if (options.dryRun && !options.noIssues) {
    await syncIssues({ events, gh: dependencies.gh, dryRun: true })
  }
  if (!options.dryRun) await writeStateAtomic(resolve(options.statePath), nextState)
  for (const result of results) console.log(`${result.id}: ${result.status}${result.error ? ` (${result.error})` : ''}`)
  const firstSeen = results.filter((result) => result.status === 'first-seen').map((result) => result.id)
  if (firstSeen.length) console.log(`baseline recorded for ${firstSeen.join(', ')}`)
  console.log(`data-watch: ${events.length} event(s); ${options.dryRun ? 'dry run; state not written' : `state written to ${options.statePath}`}`)
  if (results.some((result) => result.status === 'error')) return EXIT_CODES.problem
  if (results.some((result) => result.status === 'changed')) return EXIT_CODES.changed
  return EXIT_CODES.ok
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { process.exitCode = await main() } catch (error) {
    console.error(`data-watch: ${error.message}`)
    process.exitCode = EXIT_CODES.unexpected
  }
}
