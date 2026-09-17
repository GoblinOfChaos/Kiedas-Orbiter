import sqlite3

con = sqlite3.connect('/var/home/jedwards/kiedas-orbiter/wiki_pdf_archive.sqlite')
cur = con.cursor()

cur.execute("SELECT text FROM pages WHERE title = 'Mesa'")
res = cur.fetchone()
if res:
    text = res[0]
    if "Mesa Prime" in text:
        print("Mesa Prime found in Mesa page!")
    else:
        print("Mesa Prime NOT found in Mesa page.")
