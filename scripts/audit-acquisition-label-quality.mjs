import fs from 'node:fs'

const evidencePath = new URL('./data-sources/acquisition-item-evidence.json', import.meta.url)
const reportPath = new URL('./data-sources/acquisition-label-quality.md', import.meta.url)
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'))
const issues = []
const genericText = /^(?:known source|known drop source|enemy drop|mission|bounty|syndicate|wiki acquisition information)$/i

for (const item of evidence.items || []) {
  for (const source of item.resolved?.sourceRecords || []) {
    const location = String(source.location || source.nodeName || source.node || '')
    if (/^Endless:\s*Tier/i.test(location) && !source.region) {
      issues.push({ name: item.displayName, uniqueName: item.uniqueName, issue: 'endless source has no region', source })
    }
    if (source.type === 'mission' && !source.region && !source.nodeName && !source.node && !source.missionType) {
      issues.push({ name: item.displayName, uniqueName: item.uniqueName, issue: 'mission source has no location or mode', source })
    }
    if (source.type === 'drop' && /^Endless:\s*Tier/i.test(String(source.location || '')) && !/\//.test(String(source.location))) {
      issues.push({ name: item.displayName, uniqueName: item.uniqueName, issue: 'drop source has an unqualified endless location', source })
    }
    if (source.text && genericText.test(source.text.trim())) {
      issues.push({ name: item.displayName, uniqueName: item.uniqueName, issue: 'generic source text', source })
    }
  }
}

const uniqueIssues = new Map(issues.map((issue) => [`${issue.uniqueName}|${issue.issue}`, issue]))
const lines = [
  '# Acquisition label quality audit',
  '',
  `Audited **${evidence.items?.length || 0}** catalog objects and **${(evidence.items || []).reduce((n, item) => n + (item.resolved?.sourceRecords?.length || 0), 0)}** resolved source records.`,
  `Actionability issues: **${uniqueIssues.size}**`,
  '',
  '| Item | Unique name | Issue |',
  '|---|---|---|',
  ...[...uniqueIssues.values()].sort((a, b) => a.name.localeCompare(b.name)).map((issue) => `| ${issue.name.replaceAll('|', '\\|')} | \`${issue.uniqueName}\` | ${issue.issue} |`),
  '',
]
fs.writeFileSync(reportPath, lines.join('\n'))
console.log(JSON.stringify({ auditedItems: evidence.items?.length || 0, issues: uniqueIssues.size, report: new URL(reportPath).pathname }))
if (uniqueIssues.size) process.exitCode = 1
