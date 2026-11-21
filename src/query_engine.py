import os
import re
from typing import Optional, List, Tuple, Any
from dotenv import load_dotenv
from openai import OpenAI
from src.db import get_connection, release_connection
from src.dataset_manager import execute_dataset_sql

load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

PRIMARY_MODEL = "qwen/qwen3.6-35b-a3b"
FALLBACK_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"

def call_llm(messages, max_tokens: int = 250, temperature: float = 0.1):
    """Executes chat completion with automatic fallback to free model if credits are low or rate-limited."""
    try:
        return client.chat.completions.create(
            model=PRIMARY_MODEL,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
    except Exception as e:
        err_msg = str(e)
        if "402" in err_msg or "credits" in err_msg or "rate" in err_msg.lower() or "limit" in err_msg.lower():
            return client.chat.completions.create(
                model=FALLBACK_MODEL,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
        raise e

SCHEMA_DESCRIPTION = """
You have access to a PostgreSQL database with these tables:

stores(store_nbr SMALLINT, city VARCHAR, state VARCHAR, type VARCHAR, cluster SMALLINT)
oil_prices(date DATE, dcoilwtico NUMERIC)  -- daily oil price, some dates NULL (market closed)
holidays(id SERIAL, date DATE, type VARCHAR, locale VARCHAR, locale_name VARCHAR, description VARCHAR, transferred BOOLEAN)
transactions(date DATE, store_nbr SMALLINT, transactions INTEGER)  -- transaction count per store per day
sales(id BIGINT, date DATE, store_nbr SMALLINT, family VARCHAR, sales NUMERIC, onpromotion INTEGER)  -- sales units per store, per product family, per day

Data only covers 2015-08-15 onward.
"""

FORBIDDEN_KEYWORDS = [
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", 
    "GRANT", "REVOKE", "CREATE", "EXEC", "EXECUTE", "ATTACH", "DETACH"
]

def extract_text_content(message) -> str:
    """Safely extracts text content or fallback reasoning from OpenRouter message."""
    content = message.content if hasattr(message, "content") and message.content is not None else ""
    if not content:
        content = getattr(message, "reasoning", "") or ""
    text = str(content).strip()

    # If the model emitted a thinking trace before the answer, extract the final concise answer
    final_match = re.search(r"(?:(?:\*\*|\#\#)?\s*Final(?:\s+Answer)?\s*(?:\*\*)?\s*:\s*)(.*)", text, re.IGNORECASE | re.DOTALL)
    if final_match:
        text = final_match.group(1).strip()
    elif "let's craft:" in text.lower():
        tail = re.split(r"let's craft:\s*", text, flags=re.IGNORECASE)[-1].strip()
        quoted = re.search(r'"([^"]+)"', tail)
        text = quoted.group(1) if quoted else tail
    elif "so something like:" in text.lower():
        tail = re.split(r"so something like:\s*", text, flags=re.IGNORECASE)[-1].strip()
        quoted = re.search(r'"([^"]+)"', tail)
        text = quoted.group(1) if quoted else tail
    elif re.search(r"(?:thinking process|here's a thinking process)", text, re.IGNORECASE):
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        for p in reversed(paragraphs):
            if not p.startswith("*") and not p.startswith("#") and not re.search(r"\b(?:thinking|process|constraint)\b", p, re.IGNORECASE):
                text = p
                break

    # Clean any trailing model self-eval notes like "(1 sentence) -> Meets all criteria.✅"
    text = re.sub(r"\s*\([0-9]+\s+sentence[s]?\)\s*->\s*Meets.*$", "", text, flags=re.IGNORECASE).strip()
    return text.strip()

def is_safe_select(sql: str) -> bool:
    """Strictly ensures query is a single read-only SELECT statement."""
    cleaned = sql.strip().rstrip(";")
    if ";" in cleaned:  # blocks stacked/multiple statements
        return False
    if not re.match(r"(?i)^\s*SELECT\b", cleaned):
        return False
    upper = cleaned.upper()
    for kw in FORBIDDEN_KEYWORDS:
        if re.search(rf"\b{kw}\b", upper):
            return False
    return True

def generate_sql(
    question: str,
    previous_error: Optional[str] = None,
    previous_sql: Optional[str] = None,
    schema_description: Optional[str] = None,
    dialect: str = "PostgreSQL"
) -> str:
    """Generates read-only SQL query for PostgreSQL or SQLite based on schema."""
    user_content = question
    if previous_error:
        user_content = (
            f"{question}\n\n"
            f"Your previous attempt failed. Previous SQL:\n{previous_sql}\n"
            f"Error:\n{previous_error}\n"
            f"Fix the query and try again."
        )

    active_schema = schema_description or SCHEMA_DESCRIPTION

    response = call_llm(
        messages=[
            {
                "role": "system",
                "content": f"You are an expert {dialect} SQL data analyst. Given a question, write ONE read-only SQL SELECT "
                            f"query that answers it, using only this schema:\n{active_schema}\n"
                            f"Only ever generate SELECT statements — never INSERT, UPDATE, DELETE, DROP, or "
                            f"any other statement that modifies data. "
                            f"Reply with ONLY the raw SQL query, no explanation, no markdown formatting.",
            },
            {"role": "user", "content": user_content},
        ],
        max_tokens=250,
    )
    raw_sql = extract_text_content(response.choices[0].message).strip()
    
    # Extract code from markdown block if present
    code_block_match = re.search(r"```(?:sql)?\s*([\s\S]*?)```", raw_sql, re.IGNORECASE)
    if code_block_match:
        raw_sql = code_block_match.group(1).strip()
    
    # If not starting directly with SELECT, locate the SELECT statement
    if not re.match(r"(?i)^\s*SELECT\b", raw_sql):
        select_match = re.search(r"(SELECT\b[\s\S]*?)(?:;|\Z)", raw_sql, re.IGNORECASE)
        if select_match:
            raw_sql = select_match.group(1).strip()
            
    return raw_sql.strip()

def execute_sql(sql: str, dataset_id: str = "retail") -> Tuple[List[str], List[Any]]:
    """Executes safe SELECT query on Neon PostgreSQL (Retail) or isolated SQLite (Custom Dataset)."""
    if not is_safe_select(sql):
        raise ValueError(f"Rejected unsafe SQL: {sql}")

    if dataset_id and dataset_id != "retail":
        # Mode B: Custom user dataset stored in isolated SQLite database
        return execute_dataset_sql(dataset_id, sql)

    # Mode A: Built-in Neon PostgreSQL retail database
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql)
        columns = [desc[0] for desc in cur.description] if cur.description else []
        rows = cur.fetchall()
        cur.close()
        return columns, rows
    finally:
        release_connection(conn)

def generate_answer(
    question: str,
    sql: str,
    columns: list,
    rows: list,
    dataset_name: str = "retail data"
) -> str:
    """Generates natural language explanation from raw query results."""
    # Format rows cleanly (limit to first 15 for prompt size efficiency)
    sample_rows = rows[:15] if rows else []
    result_text = f"Columns: {columns}\nRows (sample of {len(rows)}): {sample_rows}"
    
    response = call_llm(
        messages=[
            {
                "role": "system",
                "content": f"You are a helpful {dataset_name} assistant. Given a user's question, "
                            "the SQL query that was run, and the raw query result, answer the "
                            "question in one clear, natural sentence. Reply with ONLY the final answer sentence, "
                            "no thinking process, no brainstorming. Do not mention SQL or the "
                            "database explicitly — answer naturally, like a knowledgeable analyst.",
            },
            {
                "role": "user",
                "content": f"Question: {question}\nSQL used: {sql}\nQuery result:\n{result_text}",
            },
        ],
        max_tokens=250,
    )
    return extract_text_content(response.choices[0].message)

def ask_question(question: str, dataset_id: str = "retail") -> str:
    sql = generate_sql(question)
    columns, rows = execute_sql(sql, dataset_id=dataset_id)
    answer = generate_answer(question, sql, columns, rows)
    return answer


if __name__ == "__main__":
    test_question = "What was the average oil price in 2016?"
    answer = ask_question(test_question)
    print("Question:", test_question)
    print("Answer:", answer)
