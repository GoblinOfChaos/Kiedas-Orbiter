const MARKER = (kind, sourceId) => `<!-- data-watch:${kind}:${sourceId} -->`
const SOURCE_LINKS = {
  'de-public-export': 'https://origin.warframe.com/PublicExport/',
  'de-drop-tables': 'https://www.warframe.com/droptables',
  'wiki-modules': 'https://wiki.warframe.com/',
  'worldstate-schema': 'https://api.warframe.com/cdn/worldState.php',
}
const ISSUE_TITLES = {
  'data-update': (title) => `[Data update] ${title}`,
  'upstream-format': (title) => `[Upstream format changed] ${title}`,
  'source-unreachable': (title) => `[Source unreachable] ${title}`,
}

function short(value) { return value ? String(value).slice(0, 12) : 'none' }

function neutralize(value) { return String(value).replaceAll('@', '@\u200b') }
function inline(value) { return `\`${neutralize(value).replaceAll('`', '\\\`')}\`` }

function sourceSummary(result) {
  const detail = result.detail || {}
  const counts = detail.categories ? `${Object.keys(detail.categories).length} categories` : detail.moduleCount != null ? `${detail.moduleCount} modules` : detail.keys ? `${detail.keys.length} top-level keys` : ''
  return [result.status, counts].filter(Boolean).join('; ')
}

export function classify(results, sourceTitles = {}) {
  return results.flatMap((result) => {
    const title = sourceTitles[result.id] || result.id
    if (result.status === 'changed') return [{ kind: 'data-update', sourceId: result.id, title: ISSUE_TITLES['data-update'](title), body: buildIssueBody([result], { title }) }]
    if (result.status !== 'error' && result.previousConsecutiveFailures >= 3) return [{ kind: 'resolved', sourceId: result.id, title, body: 'Source recovered' }]
    if (result.status === 'error' && result.consecutiveFailures >= 3) return [{ kind: 'source-unreachable', sourceId: result.id, title: ISSUE_TITLES['source-unreachable'](title), body: buildIssueBody([result], { title, failure: true }) }]
    return []
  })
}

export function buildIssueBody(results, meta = {}) {
  const lines = [
    meta.title ? `## ${neutralize(meta.title)}` : '## Data watch report',
    '',
    meta.failure ? 'The source has failed three or more consecutive probes.' : 'The upstream source fingerprint changed or was first observed.',
    '',
  ]
  for (const result of results) {
    lines.push(`- **${neutralize(result.id)}**: ${neutralize(sourceSummary(result))}`)
    lines.push(`  - Previous fingerprint: ${inline(short(result.previous))}`)
    lines.push(`  - New fingerprint: ${inline(short(result.fingerprint))}`)
    if (result.error) lines.push(`  - Error: ${inline(String(result.error).slice(0, 300))}`)
    if (result.detail?.resolvedUrl) lines.push(`  - Resolved URL: ${inline(result.detail.resolvedUrl)}`)
    if (result.detail?.lastModified) lines.push(`  - Last modified: ${inline(result.detail.lastModified)}`)
    if (SOURCE_LINKS[result.id]) lines.push(`  - Source: ${inline(SOURCE_LINKS[result.id])}`)
  }
  lines.push('', `Generated at: ${meta.generatedAt || 'not specified'}`)
  if (meta.links) lines.push('', ...meta.links.map((link) => `- ${inline(link)}`))
  return lines.join('\n').slice(0, 60_000)
}

export { MARKER }
