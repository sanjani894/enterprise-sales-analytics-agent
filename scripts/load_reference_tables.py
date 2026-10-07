import os
import pandas as pd
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values

load_dotenv()
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

# 1. stores
stores_df = pd.read_csv("data/raw/stores.csv")
stores_rows = list(stores_df.itertuples(index=False, name=None))
execute_values(cur, "INSERT INTO stores (store_nbr, city, state, type, cluster) VALUES %s", stores_rows)
print(f"Loaded {len(stores_rows)} rows into stores")

# 2. oil_prices
oil_df = pd.read_csv("data/raw/oil.csv")
oil_df = oil_df.astype(object).where(pd.notnull(oil_df), None) # NaN -> None so Postgres stores NULL
oil_rows = list(oil_df.itertuples(index=False, name=None))
execute_values(cur, "INSERT INTO oil_prices (date, dcoilwtico) VALUES %s", oil_rows)
print(f"Loaded {len(oil_rows)} rows into oil_prices")

# 3. holidays
holidays_df = pd.read_csv("data/raw/holidays_events.csv")
holidays_cols = ["date", "type", "locale", "locale_name", "description", "transferred"]
holidays_rows = list(holidays_df[holidays_cols].itertuples(index=False, name=None))
execute_values(
    cur,
    "INSERT INTO holidays (date, type, locale, locale_name, description, transferred) VALUES %s",
    holidays_rows,
)
print(f"Loaded {len(holidays_rows)} rows into holidays")

# 4. transactions
trans_df = pd.read_csv("data/raw/transactions.csv")
trans_rows = list(trans_df.itertuples(index=False, name=None))
execute_values(cur, "INSERT INTO transactions (date, store_nbr, transactions) VALUES %s", trans_rows)
print(f"Loaded {len(trans_rows)} rows into transactions")

conn.commit()
cur.close()
conn.close()
print("All reference tables loaded.")