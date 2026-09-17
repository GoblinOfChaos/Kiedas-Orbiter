import sqlite3
import json

con = sqlite3.connect('/var/home/jedwards/kiedas-orbiter/wiki_pdf_archive.sqlite')
cur = con.cursor()
cur.execute("SELECT text FROM pages WHERE title = 'Warframes'")
row = cur.fetchone()
text = row[0] if row else ""

# The wiki page for Warframes likely has tables or lists. 
# We'll just dump the raw text to a file so we can inspect or parse it.
with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/wiki_warframes.txt', 'w', encoding='utf-8') as f:
    f.write(text)
print("Done")
