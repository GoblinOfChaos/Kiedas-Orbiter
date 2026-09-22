from pathlib import Path
base=Path('/var/home/jedwards/kiedas-orbiter/.preview-work/stage3-mods')
block=(base/'mods-native-block.txt').read_text()
for kind in ('deb','appimage'):
    source=Path('/var/home/jedwards/kiedas-orbiter/.preview-work/stage3-mastery')/(kind+'-smoke.py')
    target=base/(kind+'-smoke.py')
    text=source.read_text().replace('mastery-'+kind+'-','mods-'+kind+'-').replace('mastery-'+kind+'-packaged-smoke.json','mods-'+kind+'-packaged-smoke.json')
    if kind=='deb':
        old="package=next((base/'ubuntu-build/target/release/bundle/deb').glob('*.deb'))"
        new="package=base/\"ubuntu-build/target/release/bundle/deb/Kieda's Orbiter Preview_1.3.3_amd64.deb\""
    else:
        old="package=next((base/'ubuntu-build/target/release/bundle/appimage').glob('*.AppImage'))"
        new="package=base/\"ubuntu-build/target/release/bundle/appimage/Kieda's Orbiter Preview_1.3.3_amd64.AppImage\""
    if old not in text:
        raise SystemExit('package selector absent: '+kind)
    text=text.replace(old,new,1)
    needle=" api('DELETE',prefix)"
    position=text.rfind(needle)
    if position<0:
        raise SystemExit('insertion point absent: '+kind)
    text=text[:position]+block+text[position:]
    target.write_text(text)
print('created packaged Mods runners')
