// Promote only manually reviewed, exact-object Wiki records from the page
// audit into the runtime acquisition map. The page audit remains discovery;
// this allowlist is intentionally explicit so a related page cannot silently
// become an acquisition claim for an object it does not name.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const path = 'src-tauri/data/assets/data/wiki-page-acquisition.json';
const baseline = execFileSync('git', ['show', `HEAD:${path}`], { encoding: 'utf8' });
const data = JSON.parse(baseline);

const records = {
  "Kaya's Reactors": {
    section: 'Acquisition',
    text: "Included with Kaya Gemini Skin. Purchase Kaya Gemini Skin individually for 275 Platinum or as part of the Encore Gemini Collection for 880 Platinum.",
    url: 'https://wiki.warframe.com/w/Kaya_Gemini_Skin',
  },
  "Velimir's Coolant Tank": {
    section: 'Acquisition',
    text: "Included with Velimir Gemini Skin. Purchase Velimir Gemini Skin individually for 275 Platinum or as part of the Encore Gemini Collection for 880 Platinum.",
    url: 'https://wiki.warframe.com/w/Velimir_Gemini_Skin',
  },
  "Quincy's Beret": {
    section: 'Acquisition',
    text: "Included with Quincy Gemini Skin. Purchase Quincy Gemini Skin individually for 275 Platinum or as part of the 1999 Gemini Pact Collection for 1,200 Platinum.",
    url: 'https://wiki.warframe.com/w/Quincy_Gemini_Skin',
  },
  "Roathe's Chyrinth": {
    section: 'Acquisition',
    text: "Included with Roathe Gemini Skin. Purchase Roathe Gemini Skin individually for 275 Platinum or as part of The Old Peace Gemini Collection for 660 Platinum.",
    url: 'https://wiki.warframe.com/w/Roathe_Gemini_Skin',
  },
  'Coltek Sentinel Wings': {
    section: 'Acquisition',
    text: 'Included in the Coltek Sentinel Pack, purchasable from the Market for 45 Platinum.',
    url: 'https://wiki.warframe.com/w/Coltek_Sentinel_Pack',
  },
  'Diamond Sentinel Wings': {
    section: 'Acquisition',
    text: 'Included in the Sentinel Accessory Pack, purchasable from the Market for 85 Platinum.',
    url: 'https://wiki.warframe.com/w/Sentinel_Accessory_Pack',
  },
  'Ictus Sentinel Wings': {
    section: 'Acquisition',
    text: 'Included in the Ictus Sentinel Pack, purchasable from the Market for 93 Platinum.',
    url: 'https://wiki.warframe.com/w/Ictus_Sentinel_Pack',
  },
  'Insign II Kalika': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Insign II Kalika by equipping an Honoria with Insign I Sporoi equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'Grandis XX Perigone': {
    section: 'Acquisition',
    text: 'Included in the Insign Bundle. Purchase the bundle from Roathe in La Cathédrale for 150 Maphica, then unlock Grandis XX Perigone by completing Elite Temporal Archimedea on your own with Grandis XIX Phloios equipped.',
    url: 'https://wiki.warframe.com/w/Insign_Bundle',
  },
  'General Insignia': {
    section: 'Acquisition',
    text: 'Found as a rare Syndicate Medallion pickup in daily Syndicate Alert missions; rare medallions grant 5,000 standing. Syndicate Medallions can also be Daily Tribute rewards.',
    url: 'https://wiki.warframe.com/w/Syndicate_Medallions',
  },
  'Maxim Medallion': {
    section: 'Acquisition',
    text: 'Found as a rare Syndicate Medallion pickup in daily Syndicate Alert missions; rare medallions grant 5,000 standing. Syndicate Medallions can also be Daily Tribute rewards.',
    url: 'https://wiki.warframe.com/w/Syndicate_Medallions',
  },
  'Partner Quittance': {
    section: 'Acquisition',
    text: 'Found as a rare Syndicate Medallion pickup in daily Syndicate Alert missions; rare medallions grant 5,000 standing. Syndicate Medallions can also be Daily Tribute rewards.',
    url: 'https://wiki.warframe.com/w/Syndicate_Medallions',
  },
  'Orokin Archive': {
    section: 'Quest acquisition',
    text: 'During The Archwing quest, recover the Orokin Archive from the Corpus stronghold in the Tessera, Venus Orokin Sabotage mission.',
    url: 'https://wiki.warframe.com/w/The_Archwing',
  },
};

const additions = Object.entries(records).filter(([name]) => !data[name]);
if (additions.length === 0) {
  console.log('No new exact Wiki acquisition records to promote.');
} else {
  const body = baseline.trimEnd().replace(/\n\s*}\s*$/, '');
  const lines = additions.map(([name, record], index) => {
    const entry = JSON.stringify({ [name]: record });
    const compact = entry.slice(1, -1);
    return `${index === 0 ? '  ,' : '  '}${compact}${index === additions.length - 1 ? '' : ','}`;
  });
  writeFileSync(path, `${body}\n${lines.join('\n')}\n  }\n`);
  console.log(`Promoted ${additions.length} exact Wiki acquisition records.`);
}
