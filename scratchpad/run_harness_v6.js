import fs from 'fs';
import { parseInventory } from '../src/lib/inventoryParser.js';

const loadJSON = (p) => {
    try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) { return {}; }
};

const raw = loadJSON('/home/jedwards/.local/share/kiedas-orbiter/data/user/inventory.json');
const dict = loadJSON('/home/jedwards/.local/share/kiedas-orbiter/data/export/dict.json');

const ewf = loadJSON('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportWarframes.json');
const ewp = loadJSON('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportWeapons.json');
const eup = loadJSON('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportUpgrades.json');

const ed = {
    ExportWarframes: ewf.ExportWarframes ? ewf.ExportWarframes : (Array.isArray(ewf) ? ewf : Object.entries(ewf).map(([k,v])=>({uniqueName:k,...v}))),
    ExportWeapons: ewp.ExportWeapons ? ewp.ExportWeapons : (Array.isArray(ewp) ? ewp : Object.entries(ewp).map(([k,v])=>({uniqueName:k,...v}))),
    ExportUpgrades: eup.ExportUpgrades ? eup.ExportUpgrades : (Array.isArray(eup) ? eup : Object.entries(eup).map(([k,v])=>({uniqueName:k,...v})))
};

try {
    const parsed = parseInventory(raw, ed, dict, 'en', null);
    const warframes = parsed.warframes.catalog || parsed.warframes || [];
    
    fs.writeFileSync('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/raw_parsed_warframes_v6.json', JSON.stringify(warframes, null, 2));
    console.log(`Saved ${warframes.length} items to raw_parsed_warframes_v6.json.`);
} catch (e) {
    console.error("Error:", e);
}
