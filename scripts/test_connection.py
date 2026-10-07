import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()  # reads the .env file and loads it into os.environ

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

cur.execute("SELECT version();")
print("Connected! Postgres version:")
print(cur.fetchone()[0])

cur.close()
conn.close()