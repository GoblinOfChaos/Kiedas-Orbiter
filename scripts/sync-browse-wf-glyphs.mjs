// Refresh the committed browse.wf supplemental Glyph acquisition data.
// This is a build-time/manual data sync; the app never contacts browse.wf at runtime.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const URL = 'https://raw.githubusercontent.com/calamity-inc/browse.wf/senpai/supplemental-data/glyphs.json';
const OUT = resolve('src-tauri/data/assets/data/browse-wf-glyphs.json');

const response = await fetch(URL);
if (!response.ok) throw new Error(`browse.wf Glyph request failed: ${response.status} ${response.statusText}`);
const data = await response.json();
if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('browse.wf Glyph data was not an object');

const valid = Object.entries(data).filter(([uniqueName, entry]) =>
  uniqueName.startsWith('/Lotus/Types/StoreItems/AvatarImages/') && entry && typeof entry === 'object',
);
if (valid.length < 100) throw new Error(`Refusing to write suspiciously small Glyph dataset: ${valid.length}`);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(Object.fromEntries(valid), null, 2)}\n`);
console.log(`Synced ${valid.length} browse.wf Glyph sources to ${OUT}`);
