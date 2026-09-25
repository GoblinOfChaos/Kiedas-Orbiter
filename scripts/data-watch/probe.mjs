import { sources as defaultSources } from './sources.mjs'

function nowIso(now) {
  return new Date(now()).toISOString()
}

async function runHostGroup(group, options) {
  const results = []
  for (const source of group) {
    const previous = options.state.sources?.[source.id]
    const result = await source.probe({
      fetchImpl: options.fetchImpl || globalThis.fetch,
      sleep: options.sleep,
      now: options.now,
      previous,
      ...(options.context || {}),
    })
    const checkedAt = nowIso(options.now)
    if (!result.ok) {
      const consecutiveFailures = (previous?.consecutiveFailures || 0) + 1
      results.push({ id: source.id, status: 'error', fingerprint: null, previous: previous?.fingerprint || null, detail: null, error: result.error, consecutiveFailures, previousConsecutiveFailures: previous?.consecutiveFailures || 0, checkedAt })
    } else {
      const status = previous?.fingerprint == null ? 'first-seen' : previous.fingerprint === result.fingerprint ? 'unchanged' : 'changed'
      results.push({ id: source.id, status, fingerprint: result.fingerprint, previous: previous?.fingerprint || null, detail: result.detail, error: null, consecutiveFailures: 0, previousConsecutiveFailures: previous?.consecutiveFailures || 0, checkedAt })
    }
  }
  return results
}

export async function runProbes({ sources = defaultSources, state = { formatVersion: 1, sources: {} }, fetchImpl = globalThis.fetch, sleep, now = Date.now, context = {} }) {
  const groups = new Map()
  for (const source of sources) {
    const group = groups.get(source.host || source.id) || []
    group.push(source)
    groups.set(source.host || source.id, group)
  }
  const grouped = await Promise.all([...groups.values()].map((group) => runHostGroup(group, { state, fetchImpl, sleep, now, context })))
  const results = grouped.flat()
  const nextState = { formatVersion: 1, sources: { ...(state.sources || {}) } }
  for (const result of results) {
    const prior = nextState.sources[result.id] || {}
    nextState.sources[result.id] = {
      fingerprint: result.status === 'error' ? prior.fingerprint : result.fingerprint,
      checkedAt: result.checkedAt,
      consecutiveFailures: result.consecutiveFailures,
    }
  }
  return { results, nextState }
}
