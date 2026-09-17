import fs from 'fs';
import { parseInventory } from '../src/lib/inventoryParser.js';

const loadJSON = (p) => {
    try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) { return {}; }
};

const raw = loadJSON('/home/jedwards/.local/share/kiedas-orbiter/data/user/inventory.json');

// Replicating how `wfcdLoader` or Tauri handles the json. The real app parses the json directly.
const ewf = loadJSON('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportWarframes.json');
const ewp = loadJSON('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportWeapons.json');
const eup = loadJSON('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportUpgrades.json');
const eman = loadJSON('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportManifest.json');

// Sometimes the root has "ExportWarframes" array, sometimes it's already an object.
// Let's pass what we got.
const ed = {
    ExportWarframes: ewf.ExportWarframes ? ewf.ExportWarframes : (Array.isArray(ewf) ? ewf : Object.entries(ewf).map(([k,v])=>({uniqueName:k,...v}))),
    ExportWeapons: ewp.ExportWeapons ? ewp.ExportWeapons : (Array.isArray(ewp) ? ewp : Object.entries(ewp).map(([k,v])=>({uniqueName:k,...v}))),
    ExportUpgrades: eup.ExportUpgrades ? eup.ExportUpgrades : (Array.isArray(eup) ? eup : Object.entries(eup).map(([k,v])=>({uniqueName:k,...v})))
};

try {
    const parsed = parseInventory(raw, ed, eman, 'en', null);
    const warframes = parsed.warframes.catalog || parsed.warframes || [];
    
    // We want the localized name, not uniqueName if possible. 
    // Usually name is a loctag. We can try to use it if it was resolved, otherwise fallback.
    // The app resolves it. Let's dump whatever name it has.
    const names = warframes.map(w => w.name);
    fs.writeFileSync('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/app_warframes.json', JSON.stringify(names, null, 2));
    console.log(`Saved ${names.length} items to app_warframes.json`);
} catch (e) {
    console.error("Error:", e);
}
