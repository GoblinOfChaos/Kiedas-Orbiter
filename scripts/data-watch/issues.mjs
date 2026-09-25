import { MARKER } from './report.mjs'

const LABELS = {
  'data-update': ['data-update', '0366d6'],
  'upstream-format': ['upstream-change', 'd93f0b'],
  'source-unreachable': ['automated', '6f42c1'],
}
const AUTOMATED_LABEL = ['automated', '6f42c1']
const TITLE_PREFIXES = {
  'data-update': '[Data update]',
  'upstream-format': '[Upstream format changed]',
  'source-unreachable': '[Source unreachable]',
}

function neutralize(value) { return String(value).replaceAll('@', '@\u200b') }

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`
}

function commandText(args) { return `gh ${args.map((arg) => /^[A-Za-z0-9_./:=,-]+$/.test(String(arg)) ? String(arg) : shellQuote(arg)).join(' ')}` }

export async function syncIssues({ events, gh, dryRun = false, ownerRepo = process.env.GITHUB_REPOSITORY || 'GoblinOfChaos/Kiedas-Orbiter', print = console.log }) {
  const commands = []
  const run = async (args) => {
    commands.push(commandText(args))
    if (dryRun) { print(commands.at(-1)); return '' }
    return gh(args)
  }
  const neededLabels = new Map([['automated', AUTOMATED_LABEL], ...events.filter((event) => event.kind !== 'resolved').map((event) => [LABELS[event.kind]?.[0] || event.kind, LABELS[event.kind] || AUTOMATED_LABEL])])
  for (const [kind, [label, color]] of neededLabels) await run(['label', 'create', label, '--color', color, '--description', `Automated data-watch ${kind} events`, '--force', '--repo', ownerRepo])
  const openJson = await run(['issue', 'list', '--state', 'open', '--label', 'automated', '--json', 'number,title,body', '--repo', ownerRepo])
  const openIssues = dryRun ? [] : JSON.parse(openJson || '[]')
  for (const event of events) {
    if (event.kind === 'resolved') {
      const marker = MARKER('source-unreachable', event.sourceId)
      const existing = openIssues.find((issue) => issue.body?.includes(marker))
      if (existing) {
        await run(['issue', 'comment', String(existing.number), '--body', 'Source recovered', '--repo', ownerRepo])
        await run(['issue', 'close', String(existing.number), '--repo', ownerRepo])
      }
      continue
    }
    const marker = MARKER(event.kind, event.sourceId)
    const body = neutralize(`${marker}\n\n${event.body}`).slice(0, 60_000)
    const existing = openIssues.find((issue) => issue.body?.includes(marker))
    if (existing) {
      const oldSummary = issueSummary(existing.body)
      const newSummary = issueSummary(body)
      if (existing.body !== body) await run(['issue', 'edit', String(existing.number), '--body', body, '--repo', ownerRepo])
      if (oldSummary !== newSummary) await run(['issue', 'comment', String(existing.number), '--body', newSummary, '--repo', ownerRepo])
    } else {
      const prefix = TITLE_PREFIXES[event.kind]
      const title = String(event.title).startsWith(prefix || '\0') ? event.title : `${prefix} ${event.title}`
      await run(['issue', 'create', '--title', neutralize(title), '--body', body, '--label', LABELS[event.kind]?.[0] || 'automated', '--label', 'automated', '--repo', ownerRepo])
    }
  }
  return { commands }
}

function issueSummary(body) {
  return body.split('\n').find((line) => line.startsWith('- **')) || ''
}

export { issueSummary }
