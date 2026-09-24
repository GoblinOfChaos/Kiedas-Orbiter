import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  chanceValue,
  sortByChanceDesc,
  sortSourcesByChanceInRotations,
} from '../src/lib/chanceSort.js';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const dropsPath = process.argv[2]
  || path.join(os.homedir(), '.local/share/kiedas-orbiter-preview/data/export/DropsAll.json');
const acquisitionPath = path.join(repoRoot, 'src-tauri/data/assets/data/warframe-items-acquisition.json');
const dropsAll = JSON.parse(fs.readFileSync(dropsPath, 'utf8'));
const acquisition = JSON.parse(fs.readFileSync(acquisitionPath, 'utf8'));
const byName = new Map();
const missionByName = new Map();

function add(name, source, rawPercent = false) {
  if (!name || !source || chanceValue(source.chance) == null) return;
  const key = name.toLowerCase().trim();
  if (!byName.has(key)) byName.set(key, []);
  byName.get(key).push(rawPercent && typeof source.chance === 'number'
    ? { ...source, chance: source.chance / 100 }
    : source);
}

function addMission(name, source) {
  add(name, source, true);
  if (!name || chanceValue(source.chance) == null) return;
  const key = name.toLowerCase().trim();
  if (!missionByName.has(key)) missionByName.set(key, []);
  missionByName.get(key).push({ ...source, chance: source.chance / 100 });
}

for (const nodes of Object.values(dropsAll.missionRewards || {})) {
  for (const nodeData of Object.values(nodes || {})) {
    for (const [rotation, entries] of Object.entries(nodeData?.rewards || {})) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        addMission(entry.itemName, {
          ...entry,
          type: 'mission',
          rotation: rotation === 'A' ? null : rotation,
        });
      }
    }
  }
}

function visit(value) {
  if (Array.isArray(value)) {
    value.forEach(visit);
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (typeof value.itemName === 'string') add(value.itemName, value, true);
  if (typeof value.modName === 'string') {
    for (const enemy of value.enemies || []) add(value.modName, enemy, true);
  }
  Object.values(value).forEach(visit);
}

for (const [key, value] of Object.entries(dropsAll)) {
  if (key !== 'missionRewards') visit(value);
}
for (const item of acquisition) {
  for (const drop of item.drops || []) add(item.name, drop);
}

const requestedSamples = [
  'Neurodes', 'Orokin Cell', 'Ferrite', 'Rubedo', 'Tellurium', 'Morphics',
  'Serration', 'Vitality', 'Continuity', 'Split Chamber',
  'Akstiletto Prime Barrel', 'Braton Prime Stock', 'Paris Prime Grip',
  'Fragor Prime Head', 'Nikana Prime Blueprint', 'Wukong Prime Chassis Blueprint',
  'Orthos Prime Blueprint', 'Fang Prime Blueprint', 'Banshee Prime Blueprint',
  'Zakti Prime Receiver', 'Aksomati Prime Link', 'Atlas Prime Neuroptics Blueprint',
];
const generatedSamples = [...byName.keys()]
  .filter((name) => /prime|serration|vitality|continuity|chamber/i.test(name))
  .slice(0, 35);
const sampleNames = [...new Set([...requestedSamples, ...generatedSamples])];

let failures = 0;
let rotationChecks = 0;
const rotationRank = (rotation) => {
  const normalized = rotation == null || rotation === '' ? 'A' : String(rotation).toUpperCase();
  return { A: 0, B: 1, C: 2, D: 3 }[normalized] ?? 4;
};
console.log('item | sources | chances (descending)');
console.log('--- | ---: | ---');
for (const name of sampleNames) {
  const sources = byName.get(name.toLowerCase()) || [];
  const sorted = sortByChanceDesc(sources);
  const values = sorted.map((source) => chanceValue(source.chance));
  for (let i = 1; i < values.length; i += 1) {
    if (values[i - 1] < values[i]) failures += 1;
  }
  const missionSources = missionByName.get(name.toLowerCase()) || [];
  const sortedMissionSources = sortSourcesByChanceInRotations(missionSources);
  for (let i = 1; i < sortedMissionSources.length; i += 1) {
    const previous = sortedMissionSources[i - 1];
    const current = sortedMissionSources[i];
    const previousRank = rotationRank(previous.rotation);
    const currentRank = rotationRank(current.rotation);
    const previousChance = chanceValue(previous.chance);
    const currentChance = chanceValue(current.chance);
    rotationChecks += 1;
    if (previousRank > currentRank || (previousRank === currentRank && previousChance < currentChance)) {
      failures += 1;
      console.error(`Rotation-order violation for ${name}: ${previous.rotation || 'A'} before ${current.rotation || 'A'}`);
    }
  }
  const display = values.slice(0, 8).map((value) => `${(value * 100).toPrecision(4)}%`).join(', ')
    + (values.length > 8 ? ` ... (+${values.length - 8})` : '')
    || '(no quantified sources)';
  console.log(`${name} | ${sorted.length} | ${display}`);
}

if (failures > 0) {
  console.error(`Chance-order check failed: ${failures} violation(s).`);
  process.exitCode = 1;
} else {
  console.log(`Checked ${sampleNames.length} real item lookups and ${rotationChecks} mission rotation pairs with no violations.`);
}
