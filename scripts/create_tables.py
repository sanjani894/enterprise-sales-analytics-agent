import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

SCHEMA_SQL = """
CREATE TABLE stores (
    store_nbr SMALLINT PRIMARY KEY,
    city VARCHAR(50) NOT NULL,
    state VARCHAR(50) NOT NULL,
    type VARCHAR(1) NOT NULL,
    cluster SMALLINT NOT NULL
);

CREATE TABLE oil_prices (
    date DATE PRIMARY KEY,
    dcoilwtico NUMERIC(6,2)
);

CREATE TABLE holidays (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL,
    locale VARCHAR(20) NOT NULL,
    locale_name VARCHAR(50) NOT NULL,
    description VARCHAR(100),
    transferred BOOLEAN NOT NULL
);

CREATE TABLE transactions (
    date DATE NOT NULL,
    store_nbr SMALLINT NOT NULL REFERENCES stores(store_nbr),
    transactions INTEGER NOT NULL,
    PRIMARY KEY (date, store_nbr)
);

CREATE TABLE sales (
    id BIGINT PRIMARY KEY,
    date DATE NOT NULL,
    store_nbr SMALLINT NOT NULL REFERENCES stores(store_nbr),
    family VARCHAR(50) NOT NULL,
    sales NUMERIC(10,3) NOT NULL,
    onpromotion INTEGER NOT NULL
);

CREATE INDEX idx_sales_store_date ON sales(store_nbr, date);
"""

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

cur.execute(SCHEMA_SQL)
conn.commit()

print("All 5 tables created successfully.")

cur.close()
conn.close()