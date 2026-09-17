import sqlite3

con = sqlite3.connect('/var/home/jedwards/kiedas-orbiter/wiki_pdf_archive.sqlite')
cur = con.cursor()

# Let's search for "Mesa" and "Mesa Prime"
cur.execute("SELECT title FROM pages WHERE title LIKE '%Mesa%' OR title LIKE '%Prime%' LIMIT 20")
for row in cur.fetchall():
    print(row[0])

