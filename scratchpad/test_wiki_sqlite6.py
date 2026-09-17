import sqlite3

con = sqlite3.connect('/var/home/jedwards/kiedas-orbiter/wiki_pdf_archive.sqlite')
cur = con.cursor()

cur.execute("SELECT text FROM pages WHERE title = 'Mesa'")
res = cur.fetchone()
if res:
    text = res[0]
    print(f"Mesa text length: {len(text)}")
    print(f"'Prime' in text: {'Prime' in text}")
    if 'Prime' in text:
        idx = text.find('Prime')
        print(text[max(0, idx-100):min(len(text), idx+100)])
