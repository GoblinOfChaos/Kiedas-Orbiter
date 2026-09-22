from pathlib import Path
root=Path('/var/home/jedwards/kiedas-orbiter')
base=root/'.preview-work/stage3-cosmetics'
block=(base/'cosmetics-native-block.txt').read_text()
for kind in ('deb','appimage'):
 source=root/'.preview-work/stage3-mods'/(kind+'-smoke.py')
 target=base/(kind+'-smoke.py')
 text=source.read_text().replace('mods-'+kind+'-','cosmetics-'+kind+'-').replace('mods-'+kind+'-packaged-smoke.json','cosmetics-'+kind+'-packaged-smoke.json')
 needle=" api('DELETE',prefix)"
 position=text.rfind(needle)
 if position<0:raise SystemExit('insertion point absent: '+kind)
 text=text[:position]+block+text[position:]
 target.write_text(text)
print('created Cosmetics packaged runners')
