import sqlite3

con = sqlite3.connect('/var/home/jedwards/kiedas-orbiter/wiki_pdf_archive.sqlite')
cur = con.cursor()

cur.execute("SELECT title FROM pages WHERE title LIKE 'Mesa%' LIMIT 20")
for row in cur.fetchall():
    print(row[0])

cur.execute("SELECT title FROM pages WHERE title LIKE 'Excalibur%' LIMIT 20")
for row in cur.fetchall():
    print("Excal:", row[0])

