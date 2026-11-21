import os
import psycopg2
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
df = pd.read_sql("SELECT * FROM sales LIMIT 1000;", conn)
conn.close()

print("\n--- Sales Sample Data ---")
print(df.head())

print("\n--- Highest Selling Entry ---")
print(df.sort_values("sales", ascending=False).head(1))

