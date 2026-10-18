import re, json, sys
from html.parser import HTMLParser
class P(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True)
        s.tables=[]; s.stack=[]; s.cell=None; s.row=None; s.skip=0; s.heading=None; s.last_heading=""; s.hbuf=None
    def handle_starttag(s,t,a):
        a=dict(a)
        if t in("style","script","sup") and "reference" in a.get("class","") or t in("style","script"): s.skip+=1; s.skipt=t; return
        if t=="sup" and "reference" in a.get("class",""): s.skip+=1; return
        if t=="table": s.stack.append({"heading":s.last_heading,"rows":[]})
        elif t=="tr" and s.stack: s.row=[]
        elif t in("td","th") and s.row is not None:
            s.cell={"t":[], "rs":int(a.get("rowspan",1) or 1),"cs":int(a.get("colspan",1) or 1),"h":t=="th"}
        elif t in("h2","h3","h4"): s.hbuf=[]
        elif t in("br","li") and s.cell is not None: s.cell["t"].append("\n")
    def handle_endtag(s,t):
        if s.skip and t in("style","script","sup"): s.skip-=1; return
        if t in("td","th") and s.cell is not None and s.row is not None:
            c=s.cell; c["t"]=re.sub(r"\s*\n\s*","; ",re.sub(r"[ \t\xa0]+"," ","".join(c["t"]))).strip("; ").strip(); s.row.append(c); s.cell=None
        elif t=="tr" and s.row is not None and s.stack: s.stack[-1]["rows"].append(s.row); s.row=None
        elif t=="table" and s.stack:
            tb=s.stack.pop(); (s.stack[-1]["rows"] if False else s.tables).append(tb)
        elif t in("h2","h3","h4") and s.hbuf is not None: s.last_heading=re.sub(r"\s+"," ","".join(s.hbuf)).strip(); s.hbuf=None
    def handle_data(s,d):
        if s.skip: return
        if s.cell is not None: s.cell["t"].append(d)
        if s.hbuf is not None: s.hbuf.append(d)
def expand(rows):
    out=[]; carry={}
    for r in rows:
        line=[]; col=0; it=iter(r); pend=list(r)
        while pend or any(c>=col for c in carry):
            if col in carry:
                v,n=carry[col]; line.append(v); 
                if n>1: carry[col]=(v,n-1)
                else: del carry[col]
                col+=1; continue
            if not pend: break
            c=pend.pop(0)
            for _ in range(c["cs"]):
                line.append(c["t"])
                if c["rs"]>1: carry[col]=(c["t"],c["rs"]-1)
                col+=1
        out.append(line)
    return out
for name in sys.argv[1:]:
    p=P(); p.feed(open(name+".html").read())
    res=[]
    for tb in p.tables:
        rows=expand(tb["rows"])
        if len(rows)>1 and any(any(x for x in r) for r in rows): res.append({"section":tb["heading"],"rows":rows})
    json.dump(res,open(name+".tables.json","w"),indent=1,ensure_ascii=False)
    with open(name+".tables.txt","w") as f:
        for tb in res:
            f.write(f"## {tb['section']}\n")
            for r in tb["rows"]: f.write(" | ".join(r)+"\n")
            f.write("\n")
    print(name,len(res),"tables")
