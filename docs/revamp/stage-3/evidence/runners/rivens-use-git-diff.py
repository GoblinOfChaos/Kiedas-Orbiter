from pathlib import Path

path = Path('/var/home/jedwards/kiedas-orbiter/.preview-work/stage3-rivens/finalize.py')
if not path.exists():
    raise FileNotFoundError(path)
text = path.read_text()
start = text.index("old_path=work/'before/Rivens.jsx'")
end = text.index("prior=work/'before/cumulative-implementation.patch'")
new = """new_path=checkout/'src/screens/Rivens.jsx';layout=checkout/'src/components/PreviewRivensLayout.jsx'
screen_diff=subprocess.run(['git','diff','--','src/screens/Rivens.jsx'],cwd=checkout,capture_output=True,text=True,check=True).stdout
layout_diff=subprocess.run(['git','diff','--no-index','--','/dev/null','src/components/PreviewRivensLayout.jsx'],cwd=checkout,capture_output=True,text=True)
assert layout_diff.returncode==1,layout_diff.stderr
patch=screen_diff+layout_diff.stdout
(stage/'rivens-implementation.patch').write_text(patch)
"""
path.write_text(text[:start] + new + text[end:])
