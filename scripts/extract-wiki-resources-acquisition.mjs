// Refresh curated resource locations. The app consumes the checked-in asset
// and never contacts the wiki at runtime.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fetchScribuntoModule } from './wiki-scribunto-json.mjs';

const output = resolve('src-tauri/data/assets/data/wiki-resources-acquisition.json');
const moduleData = await fetchScribuntoModule('Resources/data');
const extracted = {};

for (const [name, entry] of Object.entries(moduleData.Resources || {})) {
  if (!entry || typeof entry !== 'object') continue;
  const description = typeof entry.Description === 'string' ? entry.Description : '';
  const location = description.match(/(?:^|\n)\s*Location:\s*([^\r\n]+)/i)?.[1]?.trim();
  if (!location) continue;
  extracted[name] = {
    location,
    type: entry.Type || null,
    rarity: entry.Rarity || null,
    internalName: entry.InternalName || null,
    link: entry.Link || name,
  };
}

writeFileSync(output, `${JSON.stringify(extracted, null, 2)}\n`);
console.log(`Extracted ${Object.keys(extracted).length} resource locations to ${output}`);
