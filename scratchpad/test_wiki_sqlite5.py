import sqlite3

con = sqlite3.connect('/var/home/jedwards/kiedas-orbiter/wiki_pdf_archive.sqlite')
cur = con.cursor()

cur.execute("SELECT title FROM pages WHERE text MATCH '\"Mesa Prime\"' LIMIT 10")
for row in cur.fetchall():
    print(row[0])

