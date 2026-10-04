const TEMPLATE_PATTERN = /{{([^{}]*)}}/g

const HISTORICAL_PATTERNS = [
  /\b(?:19|20)\d{2}\b/i,
  /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:,?\s+(?:19|20)\d{2})?/i,
  /\b(?:originally|first\s+available|formerly|previously|returned|came\s+back|was\s+first|were\s+first)\b/i,
  /\b(?:was|were)\s+(?:available|awarded|offered|rewarded|introduced|given|received|obtained|sold|included|a\s+reward)\b/i,
  /\b(?:until|since)\s+(?:the\s+)?(?:date|\d|january|february|march|april|may|june|july|august|september|october|november|december)/i,
  /\bbeginning\s+(?:in|with)\b/i,
  /\bupdate\s*\d+/i,
  /\bversion\s*\d+/i,
  /\boperation\s*:/i,
  /\branks?\s+\d+/i,
  /\b(?:series\s+\d|intermission\s+[ivx]+)\b/i,
]

const CURRENCY_TEMPLATES = new Map([
  ['pc', 'Platinum'],
  ['cc', 'Credits'],
  ['sc', 'Standing'],
])

const TEXT_TEMPLATES = new Set([
  'a', 'ability', 'arcane', 'archwing', 'companion', 'd', 'dc', 'e', 'ec', 'fc',
  'faction', 'gear', 'item', 'm', 'mod', 'nc', 'resource', 'spoilertext', 'stat', 'weapon', 'wf',
])

const IGNORED_TEMPLATES = new Set([
  'buildrequire', 'buildrequire/archwing', 'codexbox', 'customcollapsible',
  'customcollapsible/end', 'droplocations', 'in-game description', 'navigation',
  'offeringbox', 'offeringsbox', 'pagename', 'prettycollapsible',
  'prettycollapsible/end', 'quote', 'reflist', 'resourceinfobox', 'resourcenav',
  'scrollbox/article', 'table', 'updateme',
])

function decodeEntities(value) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z][a-z\d]+);/gi, (full, entity) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16))
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10))
    return named[entity.toLowerCase()] ?? full
  })
}

function templateArguments(body) {
  return body.split('|').map((part) => part.trim())
}

function expandTemplate(body) {
  const args = templateArguments(body)
  const name = args.shift().toLowerCase().replace(/\s+/g, ' ')
  const first = args.find((value) => value && !/^\s*[^=]+\s*=/.test(value)) || ''
  const second = args.filter((value) => value && !/^\s*[^=]+\s*=/.test(value))[1] || ''

  if (CURRENCY_TEMPLATES.has(name)) {
    const amount = first.replace(/\s+/g, ' ').trim()
    return amount ? `${amount} ${CURRENCY_TEMPLATES.get(name)}` : null
  }
  if (name === 'ver' || name === 'ver/lu') return first ? `Update ${first}` : null
  if (TEXT_TEMPLATES.has(name)) return second || first || null
  if (name === 'storetablecell') return first || null
  if (name === 'nowrap' || name === 'clr' || name === 'ctier' || name === 'kc') return first || null
  if (IGNORED_TEMPLATES.has(name)) return ''
  return null
}

function expandInnermostTemplates(value) {
  let text = String(value ?? '')
  for (let pass = 0; pass < 12 && /{{[^{}]*}}/.test(text); pass += 1) {
    let failed = false
    text = text.replace(TEMPLATE_PATTERN, (full, body) => {
      const expanded = expandTemplate(body)
      if (expanded == null) failed = true
      return expanded == null ? full : expanded
    })
    if (failed) return null
  }
  return /{{|}}/.test(text) ? null : text
}

export function expandWikiTemplates(wikitext) {
  return expandInnermostTemplates(wikitext)
}

function stripWikiMarkup(value) {
  return decodeEntities(String(value ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<ref\b[^>]*\/>/gi, '')
    .replace(/<br\s*\/?\s*>/gi, '. ')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<span[^>]*class="[^"]*\bplatValue\b[^"]*"[^>]*>([\d,]+)<\/span>/gi, '$1 Platinum')
    .replace(/<span[^>]*class="[^"]*\bcreditValue\b[^"]*"[^>]*>([\d,]+)<\/span>/gi, '$1 Credits')
    .replace(/<span[^>]*style="[^"]*display\s*:\s*none[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[\[([^\]|#]+)#([^\]|]+)\|([^\]]+)\]\]/g, '$3')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, '$1')
    .replace(/\[https?:\/\/[^\]]+\]/g, '')
    .replace(/'''?/g, '')
    .replace(/''/g, '')
    .replace(/__[A-Z]+__/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\s+(['’]s)\b/g, '$1')
    .trim())
    .replace(/\s+/g, ' ')
    .replace(/\s+(['’]s)\b/g, '$1')
    .trim()
}

export function isHistoricalClause(sentence) {
  const text = String(sentence ?? '')
  return HISTORICAL_PATTERNS.some((pattern) => pattern.test(text))
}

function splitSentences(rawText) {
  return String(rawText ?? '')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<\/li\s*>/gi, '\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/\n\s*[*#:]+\s*/g, '\n')
    .split(/\n+|(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function isUnclean(sentence) {
  return /{{|}}|\[\[|\]\]|\bfor\s*[.,]|\b(?:and|or)\s+(?:and|or)\s*[.,]/i.test(sentence)
}

export function toCurrentSourceSentences(rawText) {
  const sentences = []
  for (const candidate of splitSentences(rawText)) {
    const expanded = expandWikiTemplates(candidate)
    if (expanded == null) continue
    const sentence = stripWikiMarkup(expanded)
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (!sentence || isHistoricalClause(sentence) || isUnclean(sentence)) continue
    sentences.push(sentence)
  }
  return sentences
}
