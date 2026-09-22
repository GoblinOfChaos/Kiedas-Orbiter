from pathlib import Path
path = Path('/var/home/jedwards/kiedas-orbiter/.preview-work/stage3-rivens/finalize.py')
if not path.exists():
    raise FileNotFoundError(path)
text = path.read_text()
old = "patch+=''.join(difflib.unified_diff([],layout.read_text().splitlines(True),fromfile='/dev/null',tofile='b/src/components/PreviewRivensLayout.jsx'))"
new = "layout_patch=''.join(difflib.unified_diff([],layout.read_text().splitlines(True),fromfile='/dev/null',tofile='b/src/components/PreviewRivensLayout.jsx'))\npatch+=('' if patch.endswith(chr(10)) else chr(10))+layout_patch"
if text.count(old) != 1:
    raise RuntimeError('finalizer patch line not found exactly once')
path.write_text(text.replace(old, new, 1))
