// Audit exact cosmetic identities against the Wiki's maintained structured
// cosmetics modules. This is verification evidence only: these modules mostly
// describe identity/type/link fields and must not be treated as acquisition
// data unless an explicit acquisition field is present.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const evidence = JSON.parse(readFileSync(resolve(ROOT, 'scripts/data-sources/acquisition-item-evidence.json'), 'utf8'));
const items = evidence.items.filter((item) =>
  (item.auditStatus === 'wiki-status-no-acquisition-evidence' || item.auditStatus === 'verified-unavailable')
  && (item.uniqueName.includes('/Upgrades/Skins/') || item.uniqueName.includes('/AvatarImages/')),
);
const modules = [
  ['Cosmetics/data/armor', 'Armor'],
  ['Cosmetics/data/auxiliary', 'Auxiliary'],
  ['Cosmetics/data/facialaccessory', 'Facial accessory'],
  ['Cosmetics/data/sentinelarmor', 'Sentinel armor'],
  ['Cosmetics/data/syandana', 'Syandana'],
  ['Cosmetics/data/visageink', 'Visage ink'],
  ['Cosmetics/data/warframehelmet', 'Warframe helmet'],
  ['Cosmetics/data/warframeskin', 'Warframe skin'],
  ['Cosmetics/data/weaponskin', 'Weapon skin'],
];
const API = (name) => `https://wiki.warframe.com/api.php?action=query&prop=revisions&titles=${encodeURIComponent(`Module:${name}`)}&rvslots=main&rvprop=content&format=json`;

const sourceFields = (body) => {
  const fields = {};
  for (const match of body.matchAll(/^\s*(InternalName|Link|Name|Type|CodexSecret|ExcludeFromCodex|Introduced|Acquisition|Price)\s*=\s*(?:"([^"]*)"|(true|false|-?\d+(?:\.\d+)?))\s*,?\s*$/gim)) {
    fields[match[1]] = match[2] ?? (match[3] === 'true' ? true : match[3] === 'false' ? false : Number(match[3]));
  }
  return fields;
};

const results = [];
for (const [moduleName, moduleType] of modules) {
  const payload = await (await fetch(API(moduleName))).json();
  const page = Object.values(payload.query?.pages ?? {})[0];
  const source = page?.revisions?.[0]?.slots?.main?.['*'] || '';
  for (const item of items) {
    const escaped = item.displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = source.match(new RegExp(`\\["${escaped}"\\]\\s*=\\s*\\{([\\s\\S]*?)\\n\\s*\\},`, 'i'));
    if (!match) continue;
    const fields = sourceFields(match[1]);
    results.push({
      uniqueName: item.uniqueName,
      displayName: item.displayName,
      module: `Module:${moduleName}`,
      moduleType,
      pageUrl: `https://wiki.warframe.com/w/Module:${moduleName}`,
      fields,
      exactInternalName: fields.InternalName === item.uniqueName
        || fields.InternalName === item.uniqueName.replace('/Lotus/Types/AvatarImages/', '/Lotus/Types/StoreItems/AvatarImages/'),
      acquisitionFieldPresent: Object.hasOwn(fields, 'Acquisition'),
    });
  }
}

const byItem = new Map();
for (const result of results) byItem.set(result.uniqueName, result);
const output = resolve(ROOT, 'scripts/data-sources/wiki-cosmetic-module-audit.json');
writeFileSync(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), total: items.length, matched: byItem.size, acquisitionFields: results.filter((item) => item.acquisitionFieldPresent).length, items: [...byItem.values()].sort((a, b) => a.displayName.localeCompare(b.displayName) || a.uniqueName.localeCompare(b.uniqueName)) }, null, 2)}\n`);
const lines = [
  '# Wiki cosmetic-module audit', '',
  `Status-only cosmetics checked: **${items.length}**`,
  `Exact display-name module matches: **${byItem.size}**`,
  `Matches with an explicit acquisition field: **${results.filter((item) => item.acquisitionFieldPresent).length}**`, '',
  '| Name | Unique name | Module | Exact internal name | Acquisition field |',
  '|---|---|---|---|---|',
  ...[...byItem.values()].sort((a, b) => a.displayName.localeCompare(b.displayName) || a.uniqueName.localeCompare(b.uniqueName)).map((item) => `| ${item.displayName.replaceAll('|', '\\|')} | \`${item.uniqueName}\` | ${item.module} | ${item.exactInternalName ? 'yes' : 'no'} | ${item.acquisitionFieldPresent ? 'yes' : 'no'} |`),
  '',
];
writeFileSync(resolve(ROOT, 'scripts/data-sources/wiki-cosmetic-module-audit.md'), `${lines.join('\n')}\n`);
console.log(JSON.stringify({ checked: items.length, matched: byItem.size, acquisitionFields: results.filter((item) => item.acquisitionFieldPresent).length }));
