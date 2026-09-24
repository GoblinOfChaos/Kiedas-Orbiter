import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fetchRevisions } from './build.mjs';

const archiveDir = resolve(process.argv[2] ?? 'wiki_module_archive');
const titlesPath = join(archiveDir, '_all_643_titles.json');
const outputPath = resolve(process.argv[3] ?? join(archiveDir, 'revisions.json'));
const titles = JSON.parse(await readFile(titlesPath, 'utf8'));
const files = await readdir(archiveDir);
const available = new Set(files.map((file) => basename(file).replace(/\.(?:lua|json)$/, '')));
const encoded = (title) => title.replace(/[\\/:*?"<>|]/g, '_');
const selected = titles.filter((title) => available.has(encoded(title)));
const revisions = await fetchRevisions({ titles: selected });
await writeFile(outputPath, `${JSON.stringify(revisions, null, 2)}\n`);
console.log(`Fetched revisions for ${Object.keys(revisions).length}/${selected.length} modules to ${outputPath}`);
