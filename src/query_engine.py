import os
import re
from dotenv import load_dotenv
from openai import OpenAI
from src.db import get_connection, release_connection

load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

SCHEMA_DESCRIPTION = """
You have access to a PostgreSQL database with these tables:

stores(store_nbr SMALLINT, city VARCHAR, state VARCHAR, type VARCHAR, cluster SMALLINT)
oil_prices(date DATE, dcoilwtico NUMERIC)  -- daily oil price, some dates NULL (market closed)
holidays(id SERIAL, date DATE, type VARCHAR, locale VARCHAR, locale_name VARCHAR, description VARCHAR, transferred BOOLEAN)
transactions(date DATE, store_nbr SMALLINT, transactions INTEGER)  -- transaction count per store per day
sales(id BIGINT, date DATE, store_nbr SMALLINT, family VARCHAR, sales NUMERIC, onpromotion INTEGER)  -- sales units per store, per product family, per day

Data only covers 2015-08-15 onward.
"""

FORBIDDEN_KEYWORDS = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "GRANT", "REVOKE", "CREATE", "EXEC", "EXECUTE"]

def is_safe_select(sql: str) -> bool:
    cleaned = sql.strip().rstrip(";")
    if ";" in cleaned:              # blocks stacked/multiple statements
        return False
    if not re.match(r"(?i)^\s*SELECT\b", cleaned):
        return False
    upper = cleaned.upper()
    for kw in FORBIDDEN_KEYWORDS:
        if re.search(rf"\b{kw}\b", upper):
            return False
    return True

def generate_sql(question: str, previous_error: str = None, previous_sql: str = None) -> str:
    user_content = question
    if previous_error:
        user_content = (
            f"{question}\n\n"
            f"Your previous attempt failed. Previous SQL:\n{previous_sql}\n"
            f"Error:\n{previous_error}\n"
            f"Fix the query and try again."
        )
    response = client.chat.completions.create(
        model="qwen/qwen3.6-35b-a3b",
        messages=[
            {
                "role": "system",
                "content": f"You are a PostgreSQL expert. Given a question, write ONE read-only SQL SELECT "
                            f"query that answers it, using only this schema:\n{SCHEMA_DESCRIPTION}\n"
                            f"Only ever generate SELECT statements — never INSERT, UPDATE, DELETE, DROP, or "
                            f"any other statement that modifies data. "
                            f"Reply with ONLY the raw SQL query, no explanation, no markdown formatting.",
            },
            {"role": "user", "content": user_content},
        ],
    )
    return response.choices[0].message.content.strip()

def execute_sql(sql: str):
    if not is_safe_select(sql):
        raise ValueError(f"Rejected unsafe SQL: {sql}")
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql)
        columns = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
        cur.close()
        return columns, rows
    finally:
        release_connection(conn)

def generate_answer(question: str, sql: str, columns: list, rows: list) -> str:
    result_text = f"Columns: {columns}\nRows: {rows}"
    response = client.chat.completions.create(
        model="qwen/qwen3.6-35b-a3b",
        messages=[
            {
                "role": "system",
                "content": "You are a helpful retail data assistant. Given a user's question, "
                            "the SQL query that was run, and the raw query result, answer the "
                            "question in one clear, natural sentence. Do not mention SQL or the "
                            "database explicitly — answer naturally, like a knowledgeable analyst.",
            },
            {
                "role": "user",
                "content": f"Question: {question}\nSQL used: {sql}\nQuery result:\n{result_text}",
            },
        ],
    )
    return response.choices[0].message.content.strip()

def ask_question(question: str) -> str:
    sql = generate_sql(question)
    columns, rows = execute_sql(sql)
    answer = generate_answer(question, sql, columns, rows)
    return answer


if __name__ == "__main__":
    test_question =   "What was the average oil price in 2016?"
    answer = ask_question(test_question)
    print("Question:", test_question)
    print("Answer:", answer)