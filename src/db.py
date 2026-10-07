import os
from dotenv import load_dotenv
from psycopg2 import pool

load_dotenv()

connection_pool = pool.SimpleConnectionPool(
    minconn=1,
    maxconn=5,
    dsn=os.getenv("DATABASE_URL"),
)

def get_connection():
    return connection_pool.getconn()

def release_connection(conn):
    connection_pool.putconn(conn)