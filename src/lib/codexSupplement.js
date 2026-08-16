// On-demand fallback for items whose local acquisition data is incomplete.
// The DE export and bundled warframe-items data remain authoritative; this
// client only asks the WFCD Codex API after a user opens a generic drawer.

const API_BASE = 'https://api.warframestat.us'
const detailCache = new Map()
const inflight = new Map()

function canonicalPath(value) {
  return typeof value === 'string' ? value.replace('/StoreItems/', '/') : value
}

function isExactMatch(requested, detail) {
  return canonicalPath(requested) === canonicalPath(detail?.uniqueName)
}

export function fetchCodexDetail(uniqueName, locale = 'en') {
  const key = canonicalPath(uniqueName)
  if (!key) return Promise.resolve(null)
  if (detailCache.has(key)) return Promise.resolve(detailCache.get(key))
  if (inflight.has(key)) return inflight.get(key)

  const request = fetch(`${API_BASE}/items/${encodeURIComponent(key)}?by=uniqueName&language=${encodeURIComponent(locale)}`)
    .then((response) => response.ok ? response.json() : null)
    .then((detail) => {
      const result = isExactMatch(key, detail) ? detail : null
      detailCache.set(key, result)
      return result
    })
    .catch(() => {
      detailCache.set(key, null)
      return null
    })
    .finally(() => inflight.delete(key))

  inflight.set(key, request)
  return request
}

function isBlueprint(component) {
  return /\/Types\/Recipes\//i.test(component?.uniqueName || '') || /^blueprint$/i.test(component?.name || '')
}

function formatCredits(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toLocaleString()} Credits` : null
}

function formatDuration(seconds) {
  const totalMinutes = Math.round(Number(seconds) / 60)
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return null
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours && minutes) return `${hours}h ${minutes}m`
  if (hours) return `${hours}h`
  return `${minutes}m`
}

// WFCD responses have used both fractional chances (0.0103) and percentage
// chances (1.03) over time. The drawer renders fractions, so normalize here
// at the data boundary instead of making every UI consumer guess.
function normalizeChance(value) {
  const chance = Number(value)
  if (!Number.isFinite(chance)) return value
  return chance > 1 ? chance / 100 : chance
}

export function codexDetailToAcquisition(detail) {
  if (!detail) return null

  const components = (Array.isArray(detail.components) ? detail.components : [])
    .filter((component) => component && !isBlueprint(component) && component.uniqueName)
    .map((component) => ({
      itemType: component.uniqueName,
      count: Number(component.itemCount) || 1,
      name: component.name || component.uniqueName,
    }))

  // Blueprint drops are nested on the blueprint component in the Codex
  // response (for example Akbronco -> DualBroncosBlueprint -> drops). Keep
  // those sources instead of reducing a craftable item to a generic Foundry
  // sentence. The recipe remains useful alongside the acquisition source.
  const blueprintDrops = (Array.isArray(detail.components) ? detail.components : [])
    .filter(isBlueprint)
    .flatMap((component) => Array.isArray(component.drops) ? component.drops : [])
    .filter((drop) => drop && (drop.location || drop.type))
    .map((drop) => ({
      type: 'drop',
      source: 'WFCD Codex API',
      location: drop.location,
      dropType: drop.type,
      rarity: drop.rarity,
      chance: normalizeChance(drop.chance),
    }))

  // A detail record with real material components is a useful Foundry
  // fallback. Blueprint-only/internal conversion records are intentionally
  // rejected, matching the local recipe resolver's safety rule.
  if (components.length > 0) {
    const details = ['Built in the Foundry from a blueprint.']
    const buildCost = formatCredits(detail.buildPrice)
    const buildTime = formatDuration(detail.buildTime)
    if (buildCost) details.push(`Build cost: ${buildCost}.`)
    if (buildTime) details.push(`Build time: ${buildTime}.`)
    details.push(`Components: ${components.map(({ name, count }) => `${count}x ${name}`).join(', ')}.`)
    return {
      // Once a concrete blueprint drop exists, the generic Foundry sentence
      // is noise. The recipe panel already shows the build requirements.
      sources: blueprintDrops.length
        ? blueprintDrops
        : [{ type: 'non-drop', source: 'WFCD Codex API', text: details.join(' ') }],
      recipe: {
        blueprintCost: null,
        buildCost: detail.buildPrice,
        buildTime: detail.buildTime,
        rushCost: detail.skipBuildTimePrice,
        ingredients: components,
      },
    }
  }

  const drops = (Array.isArray(detail.drops) ? detail.drops : [])
    .filter((drop) => drop && (drop.location || drop.type))
    .map((drop) => ({
      type: 'drop',
      source: 'WFCD Codex API',
      location: drop.location,
      dropType: drop.type,
      rarity: drop.rarity,
      chance: normalizeChance(drop.chance),
    }))
  return drops.length ? { sources: drops, recipe: null } : null
}

export function isGenericAcquisition(info) {
  if (!info) return true
  if (!Array.isArray(info.sources) || info.sources.length === 0) return true
  return info.sources.length === 1 && /^(Built in the Foundry from a blueprint and its components|Built in the Foundry from a blueprint\.)/.test(info.sources[0]?.text || '')
}
