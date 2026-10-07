import io
import os
import pandas as pd
from dotenv import load_dotenv
import psycopg2

load_dotenv()

CUTOFF_DATE = "2015-08-15"  # keep roughly the most recent 2 years

df = pd.read_csv("data/raw/train.csv")
df = df[df["date"] >= CUTOFF_DATE]
print(f"Rows after filtering to {CUTOFF_DATE} onward: {len(df)}")

buffer = io.StringIO()
df.to_csv(buffer, index=False, header=True)
buffer.seek(0)

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

cur.execute("TRUNCATE sales;")

cur.copy_expert(
    "COPY sales (id, date, store_nbr, family, sales, onpromotion) FROM STDIN WITH (FORMAT csv, HEADER true)",
    buffer,
)

conn.commit()

cur.execute("SELECT COUNT(*) FROM sales;")
print("Row count in sales table:", cur.fetchone()[0])

cur.close()
conn.close()
print("Sales data loaded (2-year subset).")