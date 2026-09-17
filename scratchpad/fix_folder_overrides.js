const fs = require('fs');

const path = '/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/src/lib/inventoryParser.js';
let content = fs.readFileSync(path, 'utf8');

const correctOverrides = `{
  Harlequin: 'Mirage', Pirate: 'Hydroid', Tengu: 'Zephyr',
  Paladin: 'Oberon', Berserker: 'Valkyr', Priest: 'Harrow',
  Sandman: 'Inaros', Ranger: 'Ivara', AntiMatter: 'Nova',
  Pacifist: 'Baruuk', Magician: 'Limbo', YinYang: 'Equinox',
  Trapper: 'Vauban', Necro: 'Nekros', Dragon: 'Chroma',
  Brawler: 'Atlas', Cowgirl: 'Mesa',
  BrokenFrame: 'Xaku',
  ConcreteFrame: 'Qorvex',
  Alchemist: 'Lavos', PaxDuviricus: 'Kullervo',
  Infestation: 'Nidus', Geode: 'Citrine',
  IronFrame: 'Hildryn', Frumentarius: 'Styanax',
  Devourer: 'Grendel', Choir: 'Jade',
  Bard: 'Octavia', Odalisk: 'Protea',
  Pagemaster: 'Dante', Werewolf: 'Voruna',
  Glass: 'Gara', Temple: 'Temple',
  Fairy: 'Titania', Wraith: 'Sevagoth',
  Assassin: 'Ash', Banshee: 'Banshee',
  Volt: 'Volt', Saryn: 'Saryn',
  Ember: 'Ember', Rhino: 'Rhino',
  Excalibur: 'Excalibur', Mag: 'Mag',
  Trinity: 'Trinity', Frost: 'Frost',
  Nyx: 'Nyx', Loki: 'Loki',
  Runner: 'Gauss', Sentient: 'Caliban',
  Gyre: 'Gyre', Hoplite: 'Styanax',
  Koumei: 'Koumei', Dagath: 'Dagath',
  Yareli: 'Yareli', Revenant: 'Revenant',
  Wisp: 'Wisp', MonkeyKing: 'Wukong',
  Garuda: 'Garuda', Khora: 'Khora',
  Jade: 'Jade', Cyte: 'Cyte-09',
  SiriusOrion: 'Sirius & Orion', Oraxia: 'Oraxia',
  Inkblot: 'Follie', Nokko: 'Nokko', DemonFrame: 'Uriel'
}`;

// I'm not writing the file yet, just checking logic
