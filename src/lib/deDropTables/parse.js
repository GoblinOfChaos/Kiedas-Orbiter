const PLACE_SECTIONS = new Set([
  'missionRewards', 'relicRewards', 'keyRewards', 'transientRewards', 'sortieRewards',
  'cetusRewards', 'solarisRewards', 'deimosRewards', 'zarimanRewards', 'entratiLabRewards', 'hexRewards',
]);
const SOURCE_SECTIONS = new Set([
  'modByAvatar', 'blueprintByAvatar', 'resourceByAvatar', 'sigilByAvatar', 'additionalItemByAvatar', 'relicByAvatar',
]);
const ITEM_SECTIONS = new Set(['modByDrop', 'blueprintByDrop', 'resourceByDrop']);

export const KNOWN_SECTIONS = [
  ...PLACE_SECTIONS, ...SOURCE_SECTIONS, ...ITEM_SECTIONS,
];

export class DropTablesFormatError extends Error {
  constructor(message, section, sample) {
    super(message);
    this.name = 'DropTablesFormatError';
    this.section = section;
    this.sample = sample;
  }
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function textOf(markup) {
  return decodeHtml(markup.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

function cellsOf(row) {
  return [...row.matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) => ({
    kind: match[1].toLowerCase(),
    text: textOf(match[2]),
  }));
}

function probability(value, section, sample) {
  const match = value.match(/^(.*?)\s*\((\d+(?:\.\d+)?)%\)$/);
  if (!match) {
    throw new DropTablesFormatError(`Unrecognised rarity row in ${section}: ${sample}`, section, sample);
  }
  const rarity = match[1].trim();
  const chance = Number(match[2]) / 100;
  return { rarity, chance, ...(chance === 0 && /under review/i.test(rarity) ? { underReview: true } : {}) };
}

function formatError(section, row, message = 'Unrecognised row shape') {
  throw new DropTablesFormatError(`${message} in ${section}: ${row.slice(0, 240)}`, section, row);
}

function sectionBody(html, start, end) {
  return html.slice(start, end);
}

export function parseDropTablesHtml(html) {
  if (typeof html !== 'string') throw new TypeError('Drop tables HTML must be a string');
  const sections = Object.fromEntries(KNOWN_SECTIONS.map((name) => [name, []]));
  const stats = { rows: 0, places: 0 };
  const places = new Set();
  const headings = [...html.matchAll(/<h3\s+id="([^"\s]+)"[^>]*>/gi)];

  for (let index = 0; index < headings.length; index += 1) {
    const section = headings[index][1];
    const start = headings[index].index + headings[index][0].length;
    const end = index + 1 < headings.length ? headings[index + 1].index : html.length;
    if (!KNOWN_SECTIONS.includes(section)) {
      throw new DropTablesFormatError(`Unknown drop-table section ${section}`, section, headings[index][0]);
    }
    let currentPlace = null;
    let rotation = null;
    let currentItem = null;
    for (const rowMatch of sectionBody(html, start, end).matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi)) {
      const row = rowMatch[0];
      if (/class\s*=\s*"[^"]*\bblank-row\b/i.test(row)) continue;
      const cells = cellsOf(row);
      if (!cells.length || cells.every((cell) => !cell.text)) continue;

      if (PLACE_SECTIONS.has(section)) {
        if (cells.length === 1 && cells[0].kind === 'th') {
          if (/^Rotation\s+/i.test(cells[0].text)) rotation = cells[0].text;
          else { currentPlace = cells[0].text; rotation = null; places.add(currentPlace); }
          continue;
        }
        if (cells.length === 2 && cells[0].kind === 'th' && cells[1].kind === 'td' && !cells[1].text && cells[0].text) {
          rotation = cells[0].text;
          continue;
        }
        if (cells.length === 2 && cells[0].kind === 'td' && !cells[0].text && cells[1].kind === 'th' && cells[1].text) {
          rotation = cells[1].text;
          continue;
        }
        if (cells.length === 2 && cells.every((cell) => cell.kind === 'td') && currentPlace) {
          const parsed = probability(cells[1].text, section, row);
          sections[section].push({ place: currentPlace, rotation, item: cells[0].text, ...parsed });
          stats.rows += 1;
          continue;
        }
        if (cells.length === 3 && cells[0].kind === 'td' && !cells[0].text && cells[1].kind === 'td' && cells[2].kind === 'td' && currentPlace) {
          const parsed = probability(cells[2].text, section, row);
          sections[section].push({ place: currentPlace, rotation, item: cells[1].text, ...parsed });
          stats.rows += 1;
          continue;
        }
        formatError(section, row);
      } else if (SOURCE_SECTIONS.has(section)) {
        if (cells.length === 2 && cells.every((cell) => cell.kind === 'th') && /Drop Chance:\s*\d+(?:\.\d+)?%$/i.test(cells[1].text)) {
          const match = cells[1].text.match(/Drop Chance:\s*(\d+(?:\.\d+)?)%$/i);
          currentPlace = cells[0].text;
          places.add(currentPlace);
          currentItem = { source: currentPlace, sourceChance: Number(match[1]) / 100 };
          continue;
        }
        if (cells.length === 3 && cells[0].kind === 'td' && !cells[0].text && cells[1].kind === 'td' && cells[2].kind === 'td' && currentItem) {
          const parsed = probability(cells[2].text, section, row);
          sections[section].push({ ...currentItem, item: cells[1].text, ...parsed });
          stats.rows += 1;
          continue;
        }
        formatError(section, row);
      } else {
        if (cells.length === 1 && cells[0].kind === 'th') {
          currentItem = cells[0].text;
          continue;
        }
        if (cells.length === 3 && cells.every((cell) => cell.kind === 'th') && cells[0].text === 'Source') continue;
        if (cells.length === 3 && cells.every((cell) => cell.kind === 'td') && currentItem) {
          const parsed = probability(cells[2].text, section, row);
          sections[section].push({ item: currentItem, source: cells[0].text, ...parsed });
          stats.rows += 1;
          places.add(cells[0].text);
          continue;
        }
        formatError(section, row);
      }
    }
  }
  stats.places = places.size;
  return { sections, stats };
}

export function realDropRows(rows) {
  return rows.filter((row) => !row.underReview);
}

export function validateDropTables(parsed, previous) {
  const errors = [];
  const warnings = [];
  const underReviewRows = Object.values(parsed.sections).flat().filter((row) => row.underReview);
  if (underReviewRows.length) warnings.push(`${underReviewRows.length} under-review placeholder rows ignored`);
  for (const [section, rows] of Object.entries(parsed.sections)) {
    for (const row of realDropRows(rows)) {
      if (!(row.chance > 0 && row.chance <= 1)) errors.push(`chance out of range in ${section}: ${row.item}`);
    }
  }
  const groups = new Map();
  for (const row of realDropRows(parsed.sections.missionRewards)) {
    const key = `${row.place}\u0000${row.rotation ?? ''}`;
    groups.set(key, (groups.get(key) ?? 0) + row.chance);
  }
  for (const [key, total] of groups) {
    if (Math.abs(total - 1) > 0.0015) warnings.push(`mission rotation ${key.replace('\u0000', ' / ')} sums to ${(total * 100).toFixed(2)}%`);
  }
  if (previous?.stats && parsed.stats.rows < previous.stats.rows * 0.8) {
    errors.push(`row count dropped from ${previous.stats.rows} to ${parsed.stats.rows}`);
  }
  return { ok: errors.length === 0, errors, warnings };
}
