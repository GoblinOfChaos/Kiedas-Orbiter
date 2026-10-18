import json, urllib.request, urllib.parse, time, re, html2text
UA = "kiedas-orbiter-research/0.1 (jacob.lewis.edwards@gmail.com)"
def api(**p):
    p["format"]="json"; p["maxlag"]="5"
    r = urllib.request.Request("https://wiki.warframe.com/api.php?"+urllib.parse.urlencode(p), headers={"User-Agent":UA})
    return json.load(urllib.request.urlopen(r, timeout=60))
def clean(h):
    h = re.sub(r'<span class="mw-editsection">.*?</span>\s*</span>|<span class="mw-editsection">.*?</span>', '', h, flags=re.S)
    h = re.sub(r'<div id="toc".*?</div>|<div class="toc".*?</div>', '', h, flags=re.S)
    h = re.sub(r'<style.*?</style>|<script.*?</script>|<!--.*?-->', '', h, flags=re.S)
    return h
for t in ["Amalgam Daikyu Target Acquired","Braton Prime","Axi A1","Volt","Orokin Cell"]:
    d = api(action="parse", page=t, prop="text|wikitext|categories|revid", redirects=1, disableeditsection=1)["parse"]
    base = t.replace(" ","_")
    open(base+".wikitext","w").write(d["wikitext"]["*"])
    open(base+".html","w").write(d["text"]["*"])
    h = html2text.HTML2Text(); h.body_width=0; h.ignore_images=True; h.protect_links=False; h.unicode_snob=True
    md = h.handle(clean(d["text"]["*"]))
    md = re.sub(r'\n{3,}','\n\n',md)
    open(base+".md","w").write(f"# {t}\n\n<!-- revid {d['revid']} -->\n\n"+md)
    print(t, d["revid"], len(d["wikitext"]["*"]), len(md)); time.sleep(2)
