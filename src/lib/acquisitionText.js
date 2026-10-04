const TEMPLATE_PATTERN = /{{([^{}]*)}}/g

const HISTORICAL_PATTERNS = [
  /\b(?:19|20)\d{2}\b/i,
  /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:,?\s+(?:19|20)\d{2})?/i,
  /\b(?:originally|first\s+available|formerly|previously|returned|came\s+back|was\s+first|were\s+first)\b/i,
  /\b(?:was|were)\s+(?:available|awarded|offered|rewarded|introduced|given|received|obtained|sold|included|a\s+reward)\b/i,
  /\b(?:until|since)\s+(?:the\s+)?(?:date|\d|january|february|march|april|may|june|july|august|september|october|november|december)/i,
  /\b(?:offered|available)\s+on\s+\d+\s+(?:recorded\s+)?visits\b/i,
  /\b(?:was|were)\b/i,
  /\b(?:initially|retired|unreleased)\b/i,
  /\b(?:limited-time|limited time)\b/i,
  /\b(?:released|introduced)\s+in\s+commemoration\b/i,
  /\b(?:nora['’]s\s+mix|nightwave)\b[\s\S]*\brank\s+\d+/i,
  /\bbeginning\s+(?:in|with)\b/i,
  /\bupdate\s*\d+/i,
  /\bversion\s*\d+/i,
  /\boperation\s*:/i,
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

const SANITIZER_COUNTS = { cleaned: 0, dropped: 0 }

const BARE_CATEGORY_ROUTES = new Map([
  ['invasions', 'Reward from Invasions.'],
  ['syndicate', 'Syndicate reward.'],
  ['glyph', 'Glyph reward.'],
  ['sigil', 'Sigil reward.'],
  // The hand-written Ash route names Cephalon Simaris as the source. Keep
  // that verified route as a sentence instead of treating the vendor name as
  // an unhelpful one-word fragment.
  ['simaris', 'Available from Simaris.'],
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
    .replace(/\{\|[\s\S]*?(?:\|\}|$)/g, '')
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
    .replace(/(?<=[A-Za-z])_+(?=[A-Za-z])/g, ' ')
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

function stripWikiResidue(value) {
  let text = String(value ?? '')
  const before = text
  // These are infobox/template arguments that escaped the wiki extraction.
  // They are metadata, not player-facing acquisition prose.
  text = text.replace(/\b[A-Za-z][\w/-]*\s*=\s*[^\s|{}]+/g, ' ')
  // A wikitable is useful source material only when its rows have been
  // converted into structured data. The table itself must never reach the UI.
  text = text.replace(/\{\|[\s\S]*?(?:\|\}|$)/g, ' ')
  if (/\{\{|\}\}|\[\[|\]\]|\{\||\|\}|\|/.test(text)) return null
  text = text.replace(/\s{2,}/g, ' ').trim()
  return { text, changed: text !== before.trim() }
}

export function isHistoricalClause(sentence) {
  const text = String(sentence ?? '')
  return HISTORICAL_PATTERNS.some((pattern) => pattern.test(text))
}

function removeHistoricalClauses(sentence) {
  const reduced = String(sentence ?? '')
    .replace(/(?:^|\s+)\b(?:rank|ranks)\s+\d+(?:\s*,\s*\d+)*(?:\s*,?\s*and\s*\d+)?\s+from\s+(?:nora['’]s|nightwave|amir['’]s)[\s\S]*?(?=\s+\b(?:purchased|can be|occasionally awarded|awarded|found|obtained|dropped|sold)\b|$)/i, '')
    .replace(/(?:^|\s+)\branks?\s+\d+(?:\s*,\s*\d+)*(?:\s*,?\s*and\s*\d+)?\s+from\s+(?:nora['’]s|nightwave|amir['’]s)[\s\S]*$/i, '')
    .trim()
  const clauses = reduced.split(/\s*;\s*/).filter(Boolean)
  if (clauses.length < 2) return reduced
  const current = clauses.filter((clause) => !isHistoricalClause(clause)
    || /\b(?:now|currently|can be|available|obtainable|obtained|found|dropped|sold)\b/i.test(clause))
  return current.join('; ').trim()
}

function splitSentences(rawText) {
  return String(rawText ?? '')
    .replace(/\{\|[\s\S]*?(?:\|\}|$)/g, '')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<\/li\s*>/gi, '\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/\n\s*[*#:]+\s*/g, '\n')
    .split(/\n+|(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function isUnclean(sentence) {
  return /{{|}}|\[\[|\]\]|\bfor\s*[.,]|\bfor\s*$|\b(?:price|costs?)\s*[.]$|\b(?:and|or)\s+(?:and|or)\s*[.,]|^[^.!?]{1,60}:$|^Mission$|\b(?:the\s+)?contents?\s+of\s+the\s+[^.?!:]{1,80}\s+(?:are|is)\s+as\s+follows:?$|\b(?:this section is transcluded from|to change it, please edit the transcluded page)\b|^\s*(?:this|that) is for\b|^\s*note that Baro Ki['’]Teer['’]s stock changes\b|^\s*the beacon cannot be traded\b|\b(?:for|cost(?:s|ing)?|priced\s+at)\s+\d[\d,]*(?![\d,])\s*(?:[.,]|$|,?\s+(?:requiring|at\s+rank|upon|when|to\s+purchase)\b)|\b(?:for|cost(?:s|ing)?|priced\s+at)\s+\d[\d,]*(?![\d,])\s+and\s+\d[\d,]*(?=\s*(?:[.,]|$|\s+(?:platinum|credits|standing|ducats)\b))|\b(?:for|cost(?:s|ing)?|priced\s+at)\s+\d[\d,]*(?![\d,])\s+(?:platinum|credits|standing|ducats)\s+and\s+\d[\d,]*(?=\s*[.,]|$)|\b[A-Za-z][\w/-]*\s*=|\b(?:type|class)\b\s*:/i.test(sentence)
}

function normalizeRouteSentence(sentence) {
  const trimmed = String(sentence ?? '').trim()
  const category = BARE_CATEGORY_ROUTES.get(trimmed.toLowerCase())
  if (category) return category
  if (/^as a drop from:\s*/i.test(trimmed)) {
    return `Drop from: ${trimmed.replace(/^as a drop from:\s*/i, '')}`
  }
  return trimmed.replace(/^[a-z]/, (letter) => letter.toUpperCase())
}

export function getAcquisitionTextAuditCounts() {
  return { ...SANITIZER_COUNTS }
}

export function isBareAcquisitionCategory(value) {
  return !!bareAcquisitionCategoryKey(value)
}

export function bareAcquisitionCategoryKey(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  for (const [key, route] of BARE_CATEGORY_ROUTES) {
    if (normalized === key || normalized === route.toLowerCase()) return key
  }
  return null
}

export function toCurrentSourceSentences(rawText) {
  const sentences = []
  for (const candidate of splitSentences(rawText)) {
    const expanded = expandWikiTemplates(candidate)
    if (expanded == null) {
      SANITIZER_COUNTS.dropped += 1
      continue
    }
    const residueFree = stripWikiResidue(stripWikiMarkup(expanded))
    if (!residueFree) {
      SANITIZER_COUNTS.dropped += 1
      continue
    }
    const sentence = normalizeRouteSentence(removeHistoricalClauses(residueFree.text)
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .trim())
    if (!sentence || isHistoricalClause(sentence) || isUnclean(sentence)) {
      SANITIZER_COUNTS.dropped += 1
      continue
    }
    // A lone proper noun is not an acquisition instruction. Keep named
    // categories above, but do not turn an unverified vendor, node, or item
    // name into invented prose.
    if (/^[A-Z][A-Za-z']+s?$/.test(sentence) && sentence.length < 14) {
      SANITIZER_COUNTS.dropped += 1
      continue
    }
    if (residueFree.changed || sentence !== candidate.trim()) SANITIZER_COUNTS.cleaned += 1
    sentences.push(sentence)
  }
  return sentences
}
