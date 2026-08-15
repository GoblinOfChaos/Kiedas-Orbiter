// Fetch curated acquisition modules from the Warframe wiki and reduce their
// Lua tables to small, runtime-ready JSON assets. These are manually rerun
// refresh scripts; the app never contacts the wiki at runtime.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve('src-tauri/data/assets/data');
const API = (title) => `https://wiki.warframe.com/api.php?action=query&prop=revisions&titles=${encodeURIComponent(`Module:${title}/data`)}&rvslots=main&rvprop=content&format=json`;

class LuaParser {
  constructor(source) { this.source = source; this.pos = 0; this.tokens = []; this.tokenize(); this.index = 0; }
  tokenize() {
    const s = this.source;
    while (this.pos < s.length) {
      const c = s[this.pos];
      if (/\s/.test(c)) { this.pos++; continue; }
      if (c === '-' && s[this.pos + 1] === '-') { this.pos += 2; while (this.pos < s.length && s[this.pos] !== '\n') this.pos++; continue; }
      if ('{}[]=,;'.includes(c)) { this.tokens.push({ type: c, value: c }); this.pos++; continue; }
      if (c === '"' || c === "'") {
        const quote = c; let value = ''; this.pos++;
        while (this.pos < s.length) {
          const ch = s[this.pos++]; if (ch === quote) break;
          if (ch === '\\') { const e = s[this.pos++]; value += ({ n: '\n', r: '\r', t: '\t', '\\': '\\', '"': '"', "'": "'" }[e] ?? e); }
          else value += ch;
        }
        this.tokens.push({ type: 'string', value }); continue;
      }
      const n = s.slice(this.pos).match(/^-?(?:\d+\.?\d*|\.\d+)/);
      if (n) { this.tokens.push({ type: 'number', value: Number(n[0]) }); this.pos += n[0].length; continue; }
      const id = s.slice(this.pos).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (id) { this.tokens.push({ type: 'identifier', value: id[0] }); this.pos += id[0].length; continue; }
      throw new Error(`Unsupported Lua character ${JSON.stringify(c)} at ${this.pos}`);
    }
  }
  peek(type, value) { const t = this.tokens[this.index]; return !!t && t.type === type && (value === undefined || t.value === value); }
  take(type, value) {
    if (!this.peek(type, value)) throw new Error(`Expected ${value ?? type}, got ${this.tokens[this.index]?.type ?? 'EOF'}`);
    return this.tokens[this.index++];
  }
  parse() { if (this.peek('identifier', 'return')) this.index++; return this.table(); }
  table() {
    this.take('{'); const out = {}; let arrayIndex = 1;
    while (!this.peek('}')) {
      let key;
      if (this.peek('[')) {
        this.take('[');
        const keyToken = this.peek('string') ? this.take('string') : this.take('number');
        key = String(keyToken.value);
        this.take(']'); this.take('=');
      }
      else if (this.peek('identifier') && this.tokens[this.index + 1]?.type === '=') { key = this.take('identifier').value; this.take('='); }
      else key = String(arrayIndex++);
      out[key] = this.value(); if (this.peek(',') || this.peek(';')) this.index++;
    }
    this.take('}');
    const keys = Object.keys(out);
    if (keys.length > 0 && keys.every((key, index) => key === String(index + 1))) {
      return keys.map((key) => out[key]);
    }
    return out;
  }
  value() {
    if (this.peek('{')) return this.table();
    if (this.peek('string')) return this.take('string').value;
    if (this.peek('number')) return this.take('number').value;
    if (this.peek('identifier', 'true')) { this.index++; return true; }
    if (this.peek('identifier', 'false')) { this.index++; return false; }
    if (this.peek('identifier', 'nil')) { this.index++; return null; }
    throw new Error(`Unsupported Lua value near token ${this.tokens[this.index]?.value ?? 'EOF'}`);
  }
}

async function fetchModule(title) {
  const response = await fetch(API(title));
  if (!response.ok) throw new Error(`${title}: ${response.status} ${response.statusText}`);
  const payload = await response.json();
  const page = Object.values(payload.query?.pages ?? {})[0];
  const source = page?.revisions?.[0]?.slots?.main?.['*'];
  if (!source) throw new Error(`${title}: missing Lua source`);
  // Some maintained modules assign their result to a local before returning
  // it (for example `local Data = { ... } ... return Data`).  The reducer only
  // needs the first literal table; parsing from its opening brace also keeps
  // executable Lua after that table out of the small data asset.
  const tableStart = source.indexOf('{');
  if (tableStart < 0) throw new Error(`${title}: missing Lua table`);
  let depth = 0;
  let quote = null;
  let comment = false;
  let end = -1;
  for (let i = tableStart; i < source.length; i++) {
    const c = source[i];
    if (comment) {
      if (c === '\n') comment = false;
      continue;
    }
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '-' && source[i + 1] === '-') { comment = true; i++; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) { end = i + 1; break; }
  }
  if (end < 0) throw new Error(`${title}: unterminated Lua table`);
  return new LuaParser(source.slice(tableStart, end)).parse();
}

const vendors = (await fetchModule('Vendors')).Vendors ?? {};
const vendorIndex = {};
for (const [vendorKey, vendor] of Object.entries(vendors)) {
  const vendorName = vendor?.Name || vendorKey;
  for (const offering of Object.values(vendor?.Offerings ?? {})) {
    const itemName = Array.isArray(offering) ? offering[0] : offering?.['1'];
    if (!itemName || typeof itemName !== 'string') continue;
    const names = vendorIndex[itemName] ?? [];
    if (!names.includes(vendorName)) names.push(vendorName);
    vendorIndex[itemName] = names;
  }
}

const tennoGen = await fetchModule('TennoGen');
const tennoGenIndex = {};
for (const [name, entry] of Object.entries(tennoGen)) {
  if (entry?.PcPrice || entry?.ConsolePrice) {
    tennoGenIndex[name] = { pcPrice: entry.PcPrice ?? null, consolePrice: entry.ConsolePrice ?? null };
  }
}

const baro = await fetchModule('Baro');
const baroIndex = {};
for (const group of ['Items', 'ExtraItems']) {
  for (const [name, entry] of Object.entries(baro[group] ?? {})) {
    baroIndex[entry?.Name || name] = true;
  }
}

const blueprints = (await fetchModule('Blueprints')).Blueprints ?? {};
const blueprintIndex = {};
for (const [key, entry] of Object.entries(blueprints)) {
  const result = entry?.Result || key;
  if (!result || !entry || !Array.isArray(entry.Parts)) continue;
  blueprintIndex[result] = {
    name: entry.Name || `${result} Blueprint`,
    blueprintCost: entry.BPCost ?? null,
    buildCost: entry.Credits ?? null,
    marketCost: entry.MarketCost ?? null,
    buildTime: entry.Time ?? null,
    rushCost: entry.Rush ?? null,
    parts: entry.Parts.map((part) => ({
      name: part?.Name || '',
      count: part?.Count ?? 1,
      type: part?.Type || null,
    })).filter((part) => part.name),
  };
}

const researchData = await fetchModule('Research');
const labs = researchData.Labs ?? {};
const researchIndex = {};
for (const [name, entry] of Object.entries(researchData.Research ?? {})) {
  if (!entry || typeof entry !== 'object') continue;
  const lab = labs[entry.Lab];
  researchIndex[name] = {
    lab: lab?.Name || entry.Lab || null,
    credits: entry.Credits ?? null,
    time: entry.Time ?? null,
    affinity: entry.Affinity ?? null,
    prereq: entry.Prereq || null,
    resources: Array.isArray(entry.Resources)
      ? entry.Resources.map((resource) => ({ name: resource?.Name || '', count: resource?.Count ?? 1 })).filter((resource) => resource.name)
      : [],
  };
}

const outputs = [
  ['wiki-vendors-acquisition.json', vendorIndex],
  ['wiki-tennogen-acquisition.json', tennoGenIndex],
  ['wiki-baro-acquisition.json', baroIndex],
  ['wiki-blueprints-acquisition.json', blueprintIndex],
  ['wiki-research-acquisition.json', researchIndex],
];
for (const [name, data] of outputs) writeFileSync(resolve(ROOT, name), `${JSON.stringify(data, null, 2)}\n`);
console.log(`Extracted ${Object.keys(vendorIndex).length} vendor offerings, ${Object.keys(tennoGenIndex).length} TennoGen items, ${Object.keys(baroIndex).length} Baro items, ${Object.keys(blueprintIndex).length} blueprints, and ${Object.keys(researchIndex).length} research entries`);
