from pathlib import Path
root=Path('/var/home/jedwards/kiedas-orbiter')
base=root/'.preview-work/stage3-rivens'
block=(base/'rivens-native-block.txt').read_text()
for kind in ('deb','appimage'):
 source=root/'.preview-work/stage3-cosmetics'/(kind+'-smoke.py')
 target=base/(kind+'-smoke.py')
 text=source.read_text().replace('cosmetics-'+kind+'-','rivens-'+kind+'-').replace('cosmetics-'+kind+'-packaged-smoke.json','rivens-'+kind+'-packaged-smoke.json')
 needle=" api('DELETE',prefix)"
 position=text.rfind(needle)
 if position<0:raise SystemExit('insertion point absent: '+kind)
 text=text[:position]+block+text[position:]
 target.write_text(text)
print('created Rivens packaged runners')
