import fs from 'fs';
import { parseInventory } from '../src/lib/inventoryParser.js';

const loadJSON = (p) => {
    try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) { return {}; }
};

const raw = loadJSON('/home/jedwards/.local/share/kiedas-orbiter/data/user/inventory.json');

const ewf = loadJSON('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportWarframes.json');
const ewp = loadJSON('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportWeapons.json');
const eup = loadJSON('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportUpgrades.json');
const eman = loadJSON('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportManifest.json');

const ed = {
    ExportWarframes: ewf.ExportWarframes ? ewf.ExportWarframes : (Array.isArray(ewf) ? ewf : Object.entries(ewf).map(([k,v])=>({uniqueName:k,...v}))),
    ExportWeapons: ewp.ExportWeapons ? ewp.ExportWeapons : (Array.isArray(ewp) ? ewp : Object.entries(ewp).map(([k,v])=>({uniqueName:k,...v}))),
    ExportUpgrades: eup.ExportUpgrades ? eup.ExportUpgrades : (Array.isArray(eup) ? eup : Object.entries(eup).map(([k,v])=>({uniqueName:k,...v})))
};

try {
    const parsed = parseInventory(raw, ed, eman, 'en', null);
    const warframes = parsed.warframes.catalog || parsed.warframes || [];
    
    // Output full data needed for the python matcher
    const outputData = warframes.map(w => {
        // find the original export item
        const orig = ed.ExportWarframes.find(x => x.uniqueName === w.uniqueName) || {};
        return {
            name: w.name,
            uniqueName: w.uniqueName,
            isFrivolous: orig.isFrivolous,
            excludeFromCodex: orig.excludeFromCodex,
            introducedAt: orig.introducedAt,
            codeName: orig.codeName,
            productCategory: orig.productCategory
        };
    });
    
    fs.writeFileSync('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/app_warframes_full.json', JSON.stringify(outputData, null, 2));
    console.log(`Saved ${outputData.length} items with full data.`);
} catch (e) {
    console.error("Error:", e);
}
