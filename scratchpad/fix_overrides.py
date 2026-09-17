import re

file_path = '/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/src/lib/inventoryParser.js'

with open(file_path, 'r') as f:
    content = f.read()

new_overrides = """const FOLDER_OVERRIDES = {
  Alchemist: 'Lavos', AntiMatter: 'Nova', Bard: 'Octavia', Berserker: 'Valkyr',
  Brawler: 'Atlas', BrokenFrame: 'Xaku', Choir: 'Jade', ConcreteFrame: 'Qorvex',
  Cowgirl: 'Mesa', DemonFrame: 'Uriel', Devourer: 'Grendel', Dragon: 'Chroma',
  Fairy: 'Titania', Frumentarius: 'Cyte-09', Geode: 'Citrine', Glass: 'Gara',
  Harlequin: 'Mirage', Hoplite: 'Styanax', Infestation: 'Nidus', Inkblot: 'Follie',
  IronFrame: 'Hildryn', Jade: 'Nyx', Magician: 'Limbo', MonkeyKing: 'Wukong',
  Necro: 'Nekros', Ninja: 'Ash', Odalisk: 'Protea', Oraxia: 'Oraxia',
  Pacifist: 'Baruuk', Pagemaster: 'Dante', Paladin: 'Oberon', PaxDuviricus: 'Kullervo',
  Pirate: 'Hydroid', Priest: 'Harrow', Ranger: 'Ivara', Runner: 'Gauss',
  Sandman: 'Inaros', Sentient: 'Caliban', SiriusOrion: 'Sirius & Orion', Temple: 'Temple',
  Tengu: 'Zephyr', Trapper: 'Vauban', Werewolf: 'Voruna', Wraith: 'Sevagoth',
  YinYang: 'Equinox'
};"""

# regex to replace the old block
pattern = r"const FOLDER_OVERRIDES = \{.*?\};"
content = re.sub(pattern, new_overrides, content, flags=re.DOTALL)

with open(file_path, 'w') as f:
    f.write(content)

print("Replaced successfully!")
