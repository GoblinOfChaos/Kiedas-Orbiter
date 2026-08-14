// Fetch the curated Sigils acquisition table from the Warframe wiki and
// reduce its Lua table to the acquisition data used by the app. The wiki
// module is a data table, not prose: each item is keyed by display name and
// has a Link such as "Sigils#Nightwave Sigils".
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MODULE_URL = 'https://wiki.warframe.com/api.php?action=query&prop=revisions&titles=Module:Sigils/data&rvslots=main&rvprop=content&format=json';
const OUT_PATH = resolve('src-tauri/data/assets/data/wiki-sigils-acquisition.json');

class LuaParser {
  constructor(source) {
    this.source = source;
    this.pos = 0;
    this.tokens = [];
    this.tokenize();
    this.index = 0;
  }

  tokenize() {
    const s = this.source;
    while (this.pos < s.length) {
      const c = s[this.pos];
      if (/\s/.test(c)) { this.pos++; continue; }
      if (c === '-' && s[this.pos + 1] === '-') {
        this.pos += 2;
        while (this.pos < s.length && s[this.pos] !== '\n') this.pos++;
        continue;
      }
      if ('{}[]=,;'.includes(c)) { this.tokens.push({ type: c, value: c }); this.pos++; continue; }
      if (c === '"' || c === "'") {
        const quote = c;
        let value = '';
        this.pos++;
        while (this.pos < s.length) {
          const ch = s[this.pos++];
          if (ch === quote) break;
          if (ch === '\\') {
            const escaped = s[this.pos++];
            const escapes = { n: '\n', r: '\r', t: '\t', '\\': '\\', '"': '"', "'": "'" };
            value += escapes[escaped] ?? escaped;
          } else value += ch;
        }
        this.tokens.push({ type: 'string', value });
        continue;
      }
      const number = s.slice(this.pos).match(/^-?(?:\d+\.?\d*|\.\d+)/);
      if (number) {
        this.tokens.push({ type: 'number', value: Number(number[0]) });
        this.pos += number[0].length;
        continue;
      }
      const identifier = s.slice(this.pos).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (identifier) {
        this.tokens.push({ type: 'identifier', value: identifier[0] });
        this.pos += identifier[0].length;
        continue;
      }
      throw new Error(`Unsupported Lua character ${JSON.stringify(c)} at offset ${this.pos}`);
    }
  }

  peek(type, value) {
    const token = this.tokens[this.index];
    return !!token && token.type === type && (value === undefined || token.value === value);
  }

  take(type, value) {
    if (!this.peek(type, value)) {
      const token = this.tokens[this.index];
      throw new Error(`Expected ${value ?? type}, got ${token ? `${token.type}:${token.value}` : 'EOF'}`);
    }
    return this.tokens[this.index++];
  }

  parse() {
    if (this.peek('identifier', 'return')) this.index++;
    return this.parseTable();
  }

  parseTable() {
    this.take('{');
    const result = {};
    let arrayIndex = 1;
    while (!this.peek('}')) {
      let key;
      if (this.peek('[')) {
        this.take('[');
        key = this.take('string').value;
        this.take(']');
        this.take('=');
      } else if (this.peek('identifier') && this.tokens[this.index + 1]?.type === '=') {
        key = this.take('identifier').value;
        this.take('=');
      } else {
        key = String(arrayIndex++);
      }
      result[key] = this.parseValue();
      if (this.peek(',') || this.peek(';')) this.index++;
    }
    this.take('}');
    return result;
  }

  parseValue() {
    if (this.peek('{')) return this.parseTable();
    if (this.peek('string')) return this.take('string').value;
    if (this.peek('number')) return this.take('number').value;
    if (this.peek('identifier', 'true')) { this.index++; return true; }
    if (this.peek('identifier', 'false')) { this.index++; return false; }
    if (this.peek('identifier', 'nil')) { this.index++; return null; }
    const token = this.tokens[this.index];
    throw new Error(`Unsupported Lua value ${token ? `${token.type}:${token.value}` : 'EOF'}`);
  }
}

const response = await fetch(MODULE_URL);
if (!response.ok) throw new Error(`Wiki request failed: ${response.status} ${response.statusText}`);
const payload = await response.json();
const page = Object.values(payload.query?.pages ?? {})[0];
const source = page?.revisions?.[0]?.slots?.main?.['*'];
if (!source) throw new Error('Wiki response did not contain Module:Sigils/data source');

const table = new LuaParser(source).parse();
const extracted = {};
for (const [name, entry] of Object.entries(table)) {
  const link = entry?.Link;
  if (typeof link !== 'string') continue;
  const separator = link.indexOf('#');
  const category = separator >= 0 ? link.slice(separator + 1).replace(/^#+/, '').trim() : link.trim();
  if (category) extracted[name] = category;
}

writeFileSync(OUT_PATH, `${JSON.stringify(extracted, null, 2)}\n`);
console.log(`Extracted ${Object.keys(extracted).length} Sigil acquisition categories to ${OUT_PATH}`);
